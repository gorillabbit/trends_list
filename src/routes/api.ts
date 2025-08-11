// src/routes/api.ts - API routes
import { Hono } from 'hono'
import type { User } from '../index'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY: string
}

type Variables = {
  user?: User
}

export const apiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Helper functions
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function requireAuth(c: any): User {
  const user = c.get('user')
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

// GET /api/me - Get current user info
apiRoutes.get('/me', async (c) => {
  try {
    const user = c.get('user')

    if (!user) {
      return c.json({
        authenticated: false,
        user: null
      })
    }

    // Get user stats
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as presets_count,
        COALESCE(SUM(likes_count), 0) as total_likes
      FROM presets 
      WHERE owner_id = ?
    `).bind(user.id).first()

    return c.json({
      authenticated: true,
      user: {
        ...user,
        stats: {
          presets_count: stats?.presets_count || 0,
          total_likes: stats?.total_likes || 0
        }
      }
    })
  } catch (error) {
    console.error('Failed to get user info:', error)
    return c.json({ 
      error: 'ユーザー情報の取得に失敗しました',
      authenticated: false,
      user: null 
    }, 500)
  }
})

// GET /api/presets - Get presets list
apiRoutes.get('/presets', async (c) => {
  try {
    const url = new URL(c.req.url)
    const sort = url.searchParams.get('sort') || 'likes'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    // Try cache first
    const cacheKey = `presets:list:${sort}:${page}`
    const cached = await c.env.KV.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, max-age=300'
      })
    }

    // Query database
    let query = ''
    if (sort === 'likes') {
      query = `
        SELECT p.id, p.title, p.packages, p.npmtrends_url, p.likes_count, p.created_at,
               u.name as owner_name, u.avatar_url as owner_avatar
        FROM presets p
        LEFT JOIN users u ON p.owner_id = u.id
        ORDER BY p.likes_count DESC, p.created_at DESC
        LIMIT ? OFFSET ?
      `
    } else {
      query = `
        SELECT p.id, p.title, p.packages, p.npmtrends_url, p.likes_count, p.created_at,
               u.name as owner_name, u.avatar_url as owner_avatar
        FROM presets p
        LEFT JOIN users u ON p.owner_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `
    }

    const result = await c.env.DB.prepare(query).bind(limit, offset).all()
    const response = {
      presets: result.results || [],
      page,
      hasMore: (result.results?.length || 0) === limit
    }

    // Cache for 5 minutes
    await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=300'
    })
  } catch (error) {
    console.error('Failed to get presets:', error)
    return c.json({ error: 'プリセットの取得に失敗しました' }, 500)
  }
})

// POST /api/presets - Create new preset
apiRoutes.post('/presets', async (c) => {
  try {
    const user = requireAuth(c)
    const body = await c.req.json()
    const { title, packages } = body

    // Validation
    if (!title || !Array.isArray(packages) || packages.length < 2) {
      return c.json({ 
        error: 'タイトルと2つ以上のパッケージが必要です' 
      }, 400)
    }

    if (title.length > 100) {
      return c.json({ 
        error: 'タイトルは100文字以内で入力してください' 
      }, 400)
    }

    if (packages.length > 10) {
      return c.json({ 
        error: 'パッケージは10個まで選択できます' 
      }, 400)
    }

    // Generate slug
    let slug = slugify(title)
    const timestamp = Date.now().toString(36)
    slug = `${slug}-${timestamp}`

    // Process packages
    const pkgs = [...new Set(packages.map((p: string) => p.trim().toLowerCase()))]
      .filter((p: string) => p.match(/^[a-zA-Z0-9\-_@./]+$/))

    if (pkgs.length < 2) {
      return c.json({ 
        error: '有効なパッケージ名を2つ以上選択してください' 
      }, 400)
    }

    const npmtrendsUrl = `https://npmtrends.com/${pkgs.join('-vs-')}`

    // Save to database
    await c.env.DB.prepare(`
      INSERT INTO presets (id, title, packages, npmtrends_url, owner_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(slug, title, JSON.stringify(pkgs), npmtrendsUrl, user.id).run()

    // Invalidate cache
    await Promise.all([
      c.env.KV.delete('presets:list:likes:1'),
      c.env.KV.delete('presets:list:new:1')
    ])

    return c.json({
      id: slug,
      npmtrends_url: npmtrendsUrl,
      title,
      packages: pkgs
    })
  } catch (error) {
    console.error('Failed to create preset:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({ error: 'ログインが必要です' }, 401)
    }
    return c.json({ error: 'プリセットの作成に失敗しました' }, 500)
  }
})

// POST /api/presets/:slug/like - Toggle like
apiRoutes.post('/presets/:slug/like', async (c) => {
  try {
    const user = requireAuth(c)
    const slug = c.req.param('slug')

    if (!slug) {
      return c.json({ error: 'プリセットが見つかりません' }, 404)
    }

    // Check if preset exists
    const preset = await c.env.DB
      .prepare('SELECT id FROM presets WHERE id = ?')
      .bind(slug)
      .first()

    if (!preset) {
      return c.json({ error: 'プリセットが見つかりません' }, 404)
    }

    // Check current like status
    const liked = await c.env.DB
      .prepare('SELECT 1 FROM likes WHERE user_id=? AND preset_id=?')
      .bind(user.id, slug)
      .first()

    let newLikeStatus = false

    if (liked) {
      // Remove like
      await c.env.DB.batch([
        c.env.DB
          .prepare('DELETE FROM likes WHERE user_id=? AND preset_id=?')
          .bind(user.id, slug),
        c.env.DB
          .prepare('UPDATE presets SET likes_count = likes_count - 1 WHERE id=?')
          .bind(slug),
      ])
      newLikeStatus = false
    } else {
      // Add like
      await c.env.DB.batch([
        c.env.DB
          .prepare('INSERT INTO likes (user_id, preset_id) VALUES (?, ?)')
          .bind(user.id, slug),
        c.env.DB
          .prepare('UPDATE presets SET likes_count = likes_count + 1 WHERE id=?')
          .bind(slug),
      ])
      newLikeStatus = true
    }

    // Invalidate cache
    await Promise.all([
      c.env.KV.delete('presets:list:likes:1'),
      c.env.KV.delete(`preset:${slug}`),
    ])

    // Get updated like count
    const updatedPreset = await c.env.DB
      .prepare('SELECT likes_count FROM presets WHERE id = ?')
      .bind(slug)
      .first()

    return c.json({
      liked: newLikeStatus,
      likes_count: updatedPreset?.likes_count || 0
    })
  } catch (error) {
    console.error('Failed to toggle like:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({ error: 'ログインが必要です' }, 401)
    }
    return c.json({ error: 'いいねの処理に失敗しました' }, 500)
  }
})

// POST /api/verify-turnstile - Verify Turnstile token
apiRoutes.post('/verify-turnstile', async (c) => {
  try {
    const body = await c.req.json()
    const { token } = body

    if (!token) {
      return c.json({ 
        success: false,
        error: 'Turnstileトークンが必要です' 
      }, 400)
    }

    const secret = c.env.TURNSTILE_SECRET_KEY
    if (!secret) {
      console.error('TURNSTILE_SECRET_KEY is not configured')
      return c.json({ 
        success: false,
        error: 'サーバー設定エラー' 
      }, 500)
    }

    // Verify with Cloudflare Turnstile
    const formData = new URLSearchParams({
      secret,
      response: token,
    })

    const resp = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    )

    if (!resp.ok) {
      console.error('Turnstile API response error:', resp.status)
      return c.json({ 
        success: false,
        error: 'Turnstile検証サービスが利用できません' 
      }, 503)
    }

    const data = await resp.json() as { success: boolean; 'error-codes'?: string[] }
    
    if (data.success) {
      return c.json({
        success: true,
        message: '検証に成功しました'
      })
    } else {
      console.log('Turnstile verification failed:', data['error-codes'])
      return c.json({
        success: false,
        error: '検証に失敗しました',
        errorCodes: data['error-codes']
      }, 400)
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return c.json({ 
      success: false,
      error: 'Turnstile検証処理でエラーが発生しました' 
    }, 500)
  }
})