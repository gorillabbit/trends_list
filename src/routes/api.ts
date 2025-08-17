// src/routes/api.ts - API routes
import { Hono, Context } from 'hono'
import { clerkMiddleware, getAuth, ClerkAuthVariables } from '@hono/clerk-auth'
import { D1Database, KVNamespace } from '@cloudflare/workers-types/experimental'
import { createDB, users, presets, likes, packages, tags, packageTags, type DrizzleDB } from '../db'
import { eq, desc, and, inArray } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
}

type Variables = {
    auth: ClerkAuthVariables
}

// HonoインスタンスにClerkの型を適用
export const apiRoutes = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Database helper
function getDB(c: Context<{ Bindings: Bindings, Variables: Variables }>): DrizzleDB {
  return createDB(c.env.DB)
}

// Add the Clerk middleware to all API routes
apiRoutes.use('*', async (c, next) => {
  return clerkMiddleware({
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
    secretKey: c.env.CLERK_SECRET_KEY,
  })(c, next)
})

// Helper functions
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Clerkの認証情報を必須とするためのヘルパー
function requireAuth(c: Context<{ Bindings: Bindings, Variables: Variables }>) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new Error('Authentication required');
  }
  return auth;
}

// Fetch package info from npm API
async function fetchPackageInfo(packageName: string) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json() as any;
    
    return {
      name: data.name || packageName,
      description: data.description || '',
      repository: data.repository?.url || data.repository || '',
      homepage: data.homepage || '',
    };
  } catch (error) {
    console.error(`Failed to fetch package info for ${packageName}:`, error);
    return null;
  }
}

// Fetch package download stats
async function fetchPackageDownloads(packageName: string) {
  try {
    const response = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      return 0;
    }
    const data = await response.json() as any;
    return data.downloads || 0;
  } catch (error) {
    console.error(`Failed to fetch download stats for ${packageName}:`, error);
    return 0;
  }
}

// Ensure package exists in database
async function ensurePackageExists(db: DrizzleDB, packageName: string) {
  const existing = await db.select().from(packages).where(eq(packages.id, packageName)).limit(1);
  
  if (existing.length === 0) {
    const packageInfo = await fetchPackageInfo(packageName);
    const downloads = await fetchPackageDownloads(packageName);
    
    await db.insert(packages).values({
      id: packageName,
      name: packageInfo?.name || packageName,
      description: packageInfo?.description || '',
      weeklyDownloads: downloads,
      repository: packageInfo?.repository || '',
      homepage: packageInfo?.homepage || '',
    });
  }
}

// GET /api/me - Get current user info from Clerk
apiRoutes.get('/me', (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json({
    authenticated: true,
    userId: auth.userId,
  });
});


// GET /api/presets - Get presets list (public, no auth required)
apiRoutes.get('/presets', async (c) => {
  try {
    const url = new URL(c.req.url)
    const sort = url.searchParams.get('sort') || 'likes'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    const cacheKey = `presets:list:${sort}:${page}`
    const cached = await c.env.KV.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, max-age=300'
      })
    }

    const db = getDB(c)
    
    let results: string | any[]
    if (sort === 'likes') {
      results = await db
        .select({
          id: presets.id,
          title: presets.title,
          packages: presets.packages,
          npmtrends_url: presets.npmtrendsUrl,
          likes_count: presets.likesCount,
          created_at: presets.createdAt,
          owner_name: users.name,
          owner_avatar: users.avatarUrl
        })
        .from(presets)
        .leftJoin(users, eq(presets.ownerId, users.id))
        .orderBy(desc(presets.likesCount), desc(presets.createdAt))
        .limit(limit)
        .offset(offset)
    } else {
      results = await db
        .select({
          id: presets.id,
          title: presets.title,
          packages: presets.packages,
          npmtrends_url: presets.npmtrendsUrl,
          likes_count: presets.likesCount,
          created_at: presets.createdAt,
          owner_name: users.name,
          owner_avatar: users.avatarUrl
        })
        .from(presets)
        .leftJoin(users, eq(presets.ownerId, users.id))
        .orderBy(desc(presets.createdAt))
        .limit(limit)
        .offset(offset)
    }

    const response = {
      presets: results,
      page,
      hasMore: results.length === limit
    }

    await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=300'
    })
  } catch (error) {
    console.error('Failed to get presets:', error)
    return c.json({ error: 'プリセットの取得に失敗しました' }, 500)
  }
})

// POST /api/presets - Create new preset (auth required)
apiRoutes.post('/presets', async (c) => {
  try {
    const auth = requireAuth(c)
    const body = await c.req.json()
    const { title, packages } = body

    if (!title || !Array.isArray(packages) || packages.length < 2) {
      return c.json({ error: 'タイトルと2つ以上のパッケージが必要です' }, 400)
    }
    if (title.length > 100) {
      return c.json({ error: 'タイトルは100文字以内で入力してください' }, 400)
    }
    if (packages.length > 10) {
      return c.json({ error: 'パッケージは10個まで選択できます' }, 400)
    }

    let slug = slugify(title)
    const timestamp = Date.now().toString(36)
    slug = `${slug}-${timestamp}`

    const pkgs = [...new Set(packages.map((p: string) => p.trim().toLowerCase()))]
      .filter((p: string) => p.match(/^[a-zA-Z0-9\-_@./]+$/))

    if (pkgs.length < 2) {
      return c.json({ error: '有効なパッケージ名を2つ以上選択してください' }, 400)
    }

    const npmtrendsUrl = `https://npmtrends.com/${pkgs.join('-vs-')}`
    const db = getDB(c)

    // Ensure user exists in users table
    const existingUser = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1)
    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: auth.userId,
        name: null,
        avatarUrl: null
      })
    }

    // Insert preset
    await db.insert(presets).values({
      id: slug,
      title,
      packages: JSON.stringify(pkgs),
      npmtrendsUrl,
      ownerId: auth.userId
    })

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

// POST /api/presets/:slug/like - Toggle like (auth required)
apiRoutes.post('/presets/:slug/like', async (c) => {
  try {
    const auth = requireAuth(c)
    const slug = c.req.param('slug')

    if (!slug) {
      return c.json({ error: 'プリセットが見つかりません' }, 404)
    }

    const db = getDB(c)

    // Check if preset exists
    const preset = await db.select().from(presets).where(eq(presets.id, slug)).limit(1)
    if (preset.length === 0) {
      return c.json({ error: 'プリセットが見つかりません' }, 404)
    }

    // Ensure user exists in users table
    const existingUser = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1)
    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: auth.userId,
        name: null,
        avatarUrl: null
      })
    }

    // Check if already liked
    const existingLike = await db.select().from(likes)
      .where(and(eq(likes.userId, auth.userId), eq(likes.presetId, slug)))
      .limit(1)

    const isLiked = existingLike.length > 0

    if (isLiked) {
      // Unlike: remove like and decrement count
      await db.delete(likes)
        .where(and(eq(likes.userId, auth.userId), eq(likes.presetId, slug)))
      
      await db.update(presets)
        .set({ likesCount: preset[0].likesCount! - 1 })
        .where(eq(presets.id, slug))
    } else {
      // Like: add like and increment count
      await db.insert(likes).values({
        userId: auth.userId,
        presetId: slug
      })
      
      await db.update(presets)
        .set({ likesCount: (preset[0].likesCount || 0) + 1 })
        .where(eq(presets.id, slug))
    }

    await Promise.all([
      c.env.KV.delete('presets:list:likes:1'),
      c.env.KV.delete(`preset:${slug}`),
    ])

    const updatedPreset = await db.select({ likesCount: presets.likesCount })
      .from(presets)
      .where(eq(presets.id, slug))
      .limit(1)

    return c.json({
      liked: !isLiked,
      likes_count: updatedPreset[0]?.likesCount || 0
    })
  } catch (error) {
    console.error('Failed to toggle like:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({ error: 'ログインが必要です' }, 401)
    }
    return c.json({ error: 'いいねの処理に失敗しました' }, 500)
  }
})

// POST /api/verify-turnstile - Verify Turnstile token (public)
apiRoutes.post('/verify-turnstile', async (c) => {
  try {
    const body = await c.req.json()
    const { token } = body

    if (!token) {
      return c.json({ success: false, error: 'Turnstileトークンが必要です' }, 400)
    }

    const secret = c.env.TURNSTILE_SECRET_KEY
    if (!secret) {
      console.error('TURNSTILE_SECRET_KEY is not configured')
      return c.json({ success: false, error: 'サーバー設定エラー' }, 500)
    }

    const formData = new URLSearchParams({ secret, response: token })
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    if (!resp.ok) {
      console.error('Turnstile API response error:', resp.status)
      return c.json({ success: false, error: 'Turnstile検証サービスが利用できません' }, 503)
    }

    const data = await resp.json() as { success: boolean; 'error-codes'?: string[] }
    
    if (data.success) {
      return c.json({ success: true, message: '検証に成功しました' })
    } else {
      console.log('Turnstile verification failed:', data['error-codes'])
      return c.json({ success: false, error: '検証に失敗しました', errorCodes: data['error-codes'] }, 400)
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return c.json({ success: false, error: 'Turnstile検証処理でエラーが発生しました' }, 500)
  }
})

// GET /api/packages/by-tags - Get packages by tag IDs (must be before :packageName routes)
apiRoutes.get('/packages/by-tags', async (c) => {
  try {
    const url = new URL(c.req.url)
    const tagIdsParam = url.searchParams.get('tagIds')
    const excludeParam = url.searchParams.get('exclude')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    if (!tagIdsParam) {
      return c.json({ error: 'タグIDが必要です' }, 400)
    }

    const tagIds = tagIdsParam.split(',').filter(id => id.trim())
    if (tagIds.length === 0) {
      return c.json({ packages: [] })
    }

    const cacheKey = `packages:by-tags:${tagIdsParam}:${excludeParam || ''}:${limit}`
    const cached = await c.env.KV.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, max-age=300'
      })
    }

    const db = getDB(c)

    // Get packages that have any of the specified tags
    const results = await db
      .selectDistinct({
        id: packages.id,
        name: packages.name,
        description: packages.description,
        weekly_downloads: packages.weeklyDownloads,
        repository: packages.repository,
        homepage: packages.homepage,
        last_update: packages.lastUpdate,
        created_at: packages.createdAt,
      })
      .from(packages)
      .innerJoin(packageTags, eq(packages.id, packageTags.packageId))
      .innerJoin(tags, eq(packageTags.tagId, tags.id))
      .where(inArray(tags.id, tagIds))
      .orderBy(desc(packages.weeklyDownloads))
      .limit(limit)

    // Filter out excluded package if specified
    const filteredResults = excludeParam 
      ? results.filter(pkg => pkg.id !== excludeParam)
      : results

    // Get tags for each package
    const packagesWithTags = await Promise.all(
      filteredResults.map(async (pkg) => {
        const pkgTags = await db
          .select({
            id: tags.id,
            name: tags.name,
            description: tags.description,
            color: tags.color,
            created_at: tags.createdAt,
          })
          .from(tags)
          .innerJoin(packageTags, eq(tags.id, packageTags.tagId))
          .where(eq(packageTags.packageId, pkg.id))

        return {
          ...pkg,
          tags: pkgTags
        }
      })
    )

    const response = { packages: packagesWithTags }
    await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=300'
    })
  } catch (error) {
    console.error('Failed to get packages by tags:', error)
    return c.json({ error: 'タグによるパッケージ検索に失敗しました' }, 500)
  }
})

// GET /api/packages/:packageName/presets - Get presets that use a specific package
apiRoutes.get('/packages/:packageName/presets', async (c) => {
  try {
    const packageName = c.req.param('packageName')
    const url = new URL(c.req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    if (!packageName) {
      return c.json({ error: 'パッケージ名が必要です' }, 400)
    }

    const cacheKey = `package:${packageName}:presets:${page}`
    const cached = await c.env.KV.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, max-age=300'
      })
    }

    const db = getDB(c)

    // Method 1: Search in JSON packages field (for existing data)
    const jsonResults = await db
      .select({
        id: presets.id,
        title: presets.title,
        packages: presets.packages,
        npmtrends_url: presets.npmtrendsUrl,
        likes_count: presets.likesCount,
        created_at: presets.createdAt,
        owner_name: users.name,
        owner_avatar: users.avatarUrl
      })
      .from(presets)
      .leftJoin(users, eq(presets.ownerId, users.id))
      .orderBy(desc(presets.likesCount), desc(presets.createdAt))
      .limit(limit)
      .offset(offset)

    // Filter results that contain the package in their JSON packages field
    const filteredResults = jsonResults.filter(preset => {
      try {
        const packageList = JSON.parse(preset.packages);
        return packageList.includes(packageName);
      } catch {
        return false;
      }
    });

    const response = {
      presets: filteredResults,
      package: packageName,
      page,
      hasMore: filteredResults.length === limit
    }

    await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=300'
    })
  } catch (error) {
    console.error('Failed to get package presets:', error)
    return c.json({ error: 'パッケージのプリセット取得に失敗しました' }, 500)
  }
})

// GET /api/packages/:packageName - Get package details
apiRoutes.get('/packages/:packageName', async (c) => {
  try {
    const packageName = c.req.param('packageName')
    
    if (!packageName) {
      return c.json({ error: 'パッケージ名が必要です' }, 400)
    }

    const cacheKey = `package:${packageName}:details`
    const cached = await c.env.KV.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, max-age=3600'
      })
    }

    const db = getDB(c)
    
    // Try to get from database first
    let packageData = await db.select().from(packages).where(eq(packages.id, packageName)).limit(1)
    
    if (packageData.length === 0) {
      // Fetch from npm API if not in database
      await ensurePackageExists(db, packageName)
      packageData = await db.select().from(packages).where(eq(packages.id, packageName)).limit(1)
    }

    if (packageData.length === 0) {
      return c.json({ error: 'パッケージが見つかりません' }, 404)
    }

    // Get tags for this package
    const pkgTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        description: tags.description,
        color: tags.color,
        created_at: tags.createdAt,
      })
      .from(tags)
      .innerJoin(packageTags, eq(tags.id, packageTags.tagId))
      .where(eq(packageTags.packageId, packageName))
      .catch((error) => {
        console.error('Failed to fetch package tags:', error);
        return []; // Return empty array if tags query fails
      })

    const response = {
      ...packageData[0],
      tags: pkgTags
    }
    await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 })

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=3600'
    })
  } catch (error) {
    console.error('Failed to get package details:', error)
    return c.json({ error: 'パッケージ詳細の取得に失敗しました' }, 500)
  }
})

// GET /api/tags - Get all tags
apiRoutes.get('/tags', async (c) => {
  try {
    const cacheKey = 'tags:all'
    const cached = await c.env.KV.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, max-age=300'
      })
    }

    const db = getDB(c)
    const results = await db.select().from(tags).orderBy(tags.name)

    const response = { tags: results }
    await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=300'
    })
  } catch (error) {
    console.error('Failed to get tags:', error)
    return c.json({ error: 'タグの取得に失敗しました' }, 500)
  }
})

// GET /api/tags/:tagId - Get specific tag
apiRoutes.get('/tags/:tagId', async (c) => {
  try {
    const tagId = c.req.param('tagId')
    
    if (!tagId) {
      return c.json({ error: 'タグIDが必要です' }, 400)
    }

    const cacheKey = `tag:${tagId}:details`
    const cached = await c.env.KV.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached), 200, {
        'Cache-Control': 'public, max-age=300'
      })
    }

    const db = getDB(c)
    const results = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1)

    if (results.length === 0) {
      return c.json({ error: 'タグが見つかりません' }, 404)
    }

    const response = results[0]
    await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=300'
    })
  } catch (error) {
    console.error('Failed to get tag details:', error)
    return c.json({ error: 'タグ詳細の取得に失敗しました' }, 500)
  }
})

// POST /api/tags - Create new tag (auth required)
apiRoutes.post('/tags', async (c) => {
  try {
    requireAuth(c)
    const body = await c.req.json()
    const { name, description, color } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return c.json({ error: 'タグ名が必要です' }, 400)
    }

    const trimmedName = name.trim()
    if (trimmedName.length > 50) {
      return c.json({ error: 'タグ名は50文字以内で入力してください' }, 400)
    }

    const trimmedDescription = description?.trim() || undefined
    if (trimmedDescription && trimmedDescription.length > 200) {
      return c.json({ error: '説明は200文字以内で入力してください' }, 400)
    }

    const validColor = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#3B82F6'

    const db = getDB(c)

    // Check if tag already exists
    const existing = await db.select().from(tags).where(eq(tags.name, trimmedName)).limit(1)
    if (existing.length > 0) {
      return c.json({ error: 'このタグ名は既に存在します' }, 400)
    }

    const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    await db.insert(tags).values({
      id: tagId,
      name: trimmedName,
      description: trimmedDescription,
      color: validColor,
    })

    // Clear cache
    await c.env.KV.delete('tags:all')

    const newTag = {
      id: tagId,
      name: trimmedName,
      description: trimmedDescription,
      color: validColor,
      created_at: new Date().toISOString()
    }

    return c.json(newTag)
  } catch (error) {
    console.error('Failed to create tag:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({ error: 'ログインが必要です' }, 401)
    }
    return c.json({ error: 'タグの作成に失敗しました' }, 500)
  }
})

// PUT /api/packages/:packageName/tags - Update package tags (auth required)
apiRoutes.put('/packages/:packageName/tags', async (c) => {
  try {
    requireAuth(c)
    const packageName = c.req.param('packageName')
    const body = await c.req.json()
    const { tagIds } = body

    if (!packageName) {
      return c.json({ error: 'パッケージ名が必要です' }, 400)
    }

    if (!Array.isArray(tagIds)) {
      return c.json({ error: 'タグIDの配列が必要です' }, 400)
    }

    const db = getDB(c)

    // Ensure package exists
    await ensurePackageExists(db, packageName)

    // Verify all tag IDs exist
    if (tagIds.length > 0) {
      const existingTags = await db.select({ id: tags.id }).from(tags)
      const existingTagIds = existingTags.map(t => t.id)
      const invalidTagIds = tagIds.filter(id => !existingTagIds.includes(id))
      
      if (invalidTagIds.length > 0) {
        return c.json({ error: '無効なタグIDが含まれています' }, 400)
      }
    }

    // Remove existing package tags
    await db.delete(packageTags).where(eq(packageTags.packageId, packageName))

    // Add new package tags
    if (tagIds.length > 0) {
      const values = tagIds.map((tagId: string) => ({
        packageId: packageName,
        tagId
      }))
      await db.insert(packageTags).values(values)
    }

    // Clear cache
    await Promise.all([
      c.env.KV.delete(`package:${packageName}:details`),
      c.env.KV.delete(`package:${packageName}:presets:1`),
    ])

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to update package tags:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({ error: 'ログインが必要です' }, 401)
    }
    return c.json({ error: 'パッケージタグの更新に失敗しました' }, 500)
  }
})

