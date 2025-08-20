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

// 包括的なプリセット関連キャッシュクリア関数
async function clearAllPresetCaches(kv: KVNamespace, userId?: string): Promise<void> {
  const promises: Promise<void>[] = [];
  
  // プリセット一覧キャッシュ（全ページ・全ソート）
  for (let page = 1; page <= 10; page++) {
    promises.push(kv.delete(`presets:list:likes:${page}`));
    promises.push(kv.delete(`presets:list:new:${page}`));
    
    // ユーザー固有のキャッシュも削除
    if (userId) {
      promises.push(kv.delete(`presets:list:likes:${page}:user:${userId}`));
      promises.push(kv.delete(`presets:list:new:${page}:user:${userId}`));
    }
  }
  
  await Promise.all(promises);
}

// 共通エラーレスポンス関数
function errorResponse(c: Context, message: string, status: 400 | 401 | 404 | 500 | 503 = 500) {
  return c.json({ error: message }, status);
}

function successResponse(c: Context, data: object, status: 200 | 201 = 200, headers: Record<string, string> = {}) {
  return c.json(data, status, headers);
}

// 認証関連のヘルパー関数群
function requireAuth(c: Context<{ Bindings: Bindings, Variables: Variables }>) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new Error('Authentication required');
  }
  return auth;
}

async function ensureUserExists(db: DrizzleDB, userId: string) {
  const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existingUser.length === 0) {
    await db.insert(users).values({ id: userId });
  }
}

// エラーハンドリング関数
function handleError(error: unknown, c: Context, defaultMessage: string) {
  console.error('API Error:', error);
  if (error instanceof Error && error.message === 'Authentication required') {
    return errorResponse(c, 'ログインが必要です', 401);
  }
  return errorResponse(c, defaultMessage, 500);
}

// キャッシュ操作の共通化
async function getCachedResponse(kv: KVNamespace, key: string) {
  const cached = await kv.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCachedResponse(kv: KVNamespace, key: string, data: object, ttl: number = 300) {
  await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
}

function getCacheHeaders(maxAge: number = 300) {
  return { 'Cache-Control': `public, max-age=${maxAge}` };
}

// パッケージタグ取得の共通化
async function getPackageTags(db: DrizzleDB, packageId: string) {
  return await db
    .select({
      id: tags.id,
      name: tags.name,
      description: tags.description,
      color: tags.color,
      created_at: tags.createdAt,
    })
    .from(tags)
    .innerJoin(packageTags, eq(tags.id, packageTags.tagId))
    .where(eq(packageTags.packageId, packageId))
    .catch(() => []);
}

// ページネーション用のパラメータ取得
function getPaginationParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const sort = url.searchParams.get('sort') || 'likes';
  const limit = 20;
  const offset = (page - 1) * limit;
  return { page, sort, limit, offset };
}

// NPM APIからのパッケージ情報型定義
interface NpmPackageInfo {
  name?: string;
  description?: string;
  repository?: string | { url: string };
  homepage?: string;
}

interface NpmDownloadStats {
  downloads?: number;
}

// Fetch package info from npm API
async function fetchPackageInfo(packageName: string) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json() as NpmPackageInfo;
    
    return {
      name: data.name || packageName,
      description: data.description || '',
      repository: typeof data.repository === 'string' ? data.repository : data.repository?.url || '',
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
    const data = await response.json() as NpmDownloadStats;
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
    return errorResponse(c, "Unauthorized", 401);
  }
  return successResponse(c, {
    authenticated: true,
    userId: auth.userId,
  });
});


// GET /api/presets - Get presets list (public, but includes user like status if authenticated)
apiRoutes.get('/presets', async (c) => {
  try {
    const url = new URL(c.req.url)
    const { page, sort, limit, offset } = getPaginationParams(url);

    // 認証情報を取得（任意）
    const auth = getAuth(c);
    const userId = auth?.userId;

    // 認証されたユーザーの場合はキャッシュキーにユーザーIDを含める
    const cacheKey = userId 
      ? `presets:list:${sort}:${page}:user:${userId}`
      : `presets:list:${sort}:${page}`;

    const cached = await getCachedResponse(c.env.KV, cacheKey);
    if (cached) {
      return successResponse(c, cached, 200, getCacheHeaders());
    }

    const db = getDB(c)
    
    let results: any[]
    if (sort === 'likes') {
      results = await db
        .select({
          id: presets.id,
          title: presets.title,
          packages: presets.packages,
          likes_count: presets.likesCount,
          created_at: presets.createdAt
        })
        .from(presets)
        .orderBy(desc(presets.likesCount), desc(presets.createdAt))
        .limit(limit)
        .offset(offset)
    } else {
      results = await db
        .select({
          id: presets.id,
          title: presets.title,
          packages: presets.packages,
          likes_count: presets.likesCount,
          created_at: presets.createdAt
        })
        .from(presets)
        .orderBy(desc(presets.createdAt))
        .limit(limit)
        .offset(offset)
    }

    // 認証されたユーザーの場合、各プリセットのいいね状態を取得
    let presetsWithLikeStatus = results;
    if (userId && results.length > 0) {
      const presetIds = results.map(preset => preset.id);
      const userLikes = await db
        .select({ presetId: likes.presetId })
        .from(likes)
        .where(and(eq(likes.userId, userId), inArray(likes.presetId, presetIds)));
      
      const likedPresetIds = new Set(userLikes.map(like => like.presetId));
      
      presetsWithLikeStatus = results.map(preset => ({
        ...preset,
        liked: likedPresetIds.has(preset.id)
      }));
    }

    const response = {
      presets: presetsWithLikeStatus,
      page,
      hasMore: results.length === limit
    }

    await setCachedResponse(c.env.KV, cacheKey, response);

    return successResponse(c, response, 200, getCacheHeaders());
  } catch (error) {
    return handleError(error, c, 'プリセットの取得に失敗しました');
  }
})

// POST /api/presets - Create new preset (auth required)
apiRoutes.post('/presets', async (c) => {
  try {
    const auth = requireAuth(c)
    const body = await c.req.json()
    const { title, packages } = body

    if (!title || !Array.isArray(packages) || packages.length < 2) {
      return errorResponse(c, 'タイトルと2つ以上のパッケージが必要です', 400);
    }
    if (title.length > 100) {
      return errorResponse(c, 'タイトルは100文字以内で入力してください', 400);
    }
    if (packages.length > 10) {
      return errorResponse(c, 'パッケージは10個まで選択できます', 400);
    }

    let slug = slugify(title)
    const timestamp = Date.now().toString(36)
    slug = `${slug}-${timestamp}`

    const pkgs = [...new Set(packages.map((p: string) => p.trim().toLowerCase()))]
      .filter((p: string) => p.match(/^[a-zA-Z0-9\-_@./]+$/))

    if (pkgs.length < 2) {
      return errorResponse(c, '有効なパッケージ名を2つ以上選択してください', 400);
    }

    const db = getDB(c)

    // Ensure user exists in users table
    await ensureUserExists(db, auth.userId);

    // Insert preset
    await db.insert(presets).values({
      id: slug,
      title,
      packages: JSON.stringify(pkgs),
      ownerId: auth.userId
    })

    // 包括的なキャッシュクリア（ユーザー固有のキャッシュも含む）
    await clearAllPresetCaches(c.env.KV, auth.userId)

    return successResponse(c, {
      id: slug,
      title,
      packages: pkgs
    });
  } catch (error) {
    return handleError(error, c, 'プリセットの作成に失敗しました');
  }
})

// POST /api/presets/:slug/like - Toggle like (auth required)
apiRoutes.post('/presets/:slug/like', async (c) => {
  try {
    const auth = requireAuth(c)
    const slug = c.req.param('slug')

    if (!slug) {
      return errorResponse(c, 'プリセットが見つかりません', 404);
    }

    const db = getDB(c)

    // Check if preset exists
    const preset = await db.select().from(presets).where(eq(presets.id, slug)).limit(1)
    if (preset.length === 0) {
      return errorResponse(c, 'プリセットが見つかりません', 404);
    }

    // Ensure user exists in users table
    await ensureUserExists(db, auth.userId);

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

    // 包括的なキャッシュクリア（ユーザー固有のキャッシュも含む）
    await Promise.all([
      clearAllPresetCaches(c.env.KV, auth.userId),
      c.env.KV.delete(`preset:${slug}`),
    ])

    const updatedPreset = await db.select({ likesCount: presets.likesCount })
      .from(presets)
      .where(eq(presets.id, slug))
      .limit(1)

    return successResponse(c, {
      liked: !isLiked,
      likes_count: updatedPreset[0]?.likesCount || 0
    });
  } catch (error) {
    return handleError(error, c, 'いいねの処理に失敗しました');
  }
})

// POST /api/verify-turnstile - Verify Turnstile token (public)
apiRoutes.post('/verify-turnstile', async (c) => {
  try {
    const body = await c.req.json()
    const { token } = body

    if (!token) {
      return errorResponse(c, 'Turnstileトークンが必要です', 400);
    }

    const secret = c.env.TURNSTILE_SECRET_KEY
    if (!secret) {
      console.error('TURNSTILE_SECRET_KEY is not configured')
      return errorResponse(c, 'サーバー設定エラー', 500);
    }

    const formData = new URLSearchParams({ secret, response: token })
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    if (!resp.ok) {
      console.error('Turnstile API response error:', resp.status)
      return errorResponse(c, 'Turnstile検証サービスが利用できません', 503);
    }

    const data = await resp.json() as { success: boolean; 'error-codes'?: string[] }
    
    if (data.success) {
      return successResponse(c, { success: true, message: '検証に成功しました' });
    } else {
      console.log('Turnstile verification failed:', data['error-codes'])
      return errorResponse(c, '検証に失敗しました', 400);
    }
  } catch (error) {
    return handleError(error, c, 'Turnstile検証処理でエラーが発生しました');
  }
})

// GET /api/packages - Get all packages with pagination
apiRoutes.get('/packages', async (c) => {
  try {
    const url = new URL(c.req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = (page - 1) * limit

    const cacheKey = `packages:list:${page}:${limit}`
    const cached = await getCachedResponse(c.env.KV, cacheKey);
    if (cached) {
      return successResponse(c, cached, 200, getCacheHeaders());
    }

    const db = getDB(c)
    
    // Get packages with tags
    const results = await db
      .select({
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
      .orderBy(desc(packages.weeklyDownloads))
      .limit(limit)
      .offset(offset)

    // Get tags for each package
    const packagesWithTags = await Promise.all(
      results.map(async (pkg) => {
        const pkgTags = await getPackageTags(db, pkg.id);
        return {
          ...pkg,
          tags: pkgTags
        }
      })
    )

    const response = {
      packages: packagesWithTags,
      page,
      hasMore: results.length === limit
    }

    await setCachedResponse(c.env.KV, cacheKey, response);

    return successResponse(c, response, 200, getCacheHeaders());
  } catch (error) {
    return handleError(error, c, 'パッケージの取得に失敗しました');
  }
})

// GET /api/packages/by-tags - Get packages by tag IDs (must be before :packageName routes)
apiRoutes.get('/packages/by-tags', async (c) => {
  try {
    const url = new URL(c.req.url)
    const tagIdsParam = url.searchParams.get('tagIds')
    const excludeParam = url.searchParams.get('exclude')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (!tagIdsParam) {
      return errorResponse(c, 'タグIDが必要です', 400);
    }

    const tagIds = tagIdsParam.split(',').filter(id => id.trim())
    if (tagIds.length === 0) {
      return successResponse(c, { packages: [] });
    }

    const cacheKey = `packages:by-tags:${tagIdsParam}:${excludeParam || ''}:${limit}`
    const cached = await getCachedResponse(c.env.KV, cacheKey);
    if (cached) {
      return successResponse(c, cached, 200, getCacheHeaders());
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
        const pkgTags = await getPackageTags(db, pkg.id);
        return {
          ...pkg,
          tags: pkgTags
        }
      })
    )

    const response = { packages: packagesWithTags }
    await setCachedResponse(c.env.KV, cacheKey, response);

    return successResponse(c, response, 200, getCacheHeaders());
  } catch (error) {
    return handleError(error, c, 'タグによるパッケージ検索に失敗しました');
  }
})

// GET /api/packages/:packageName/presets - Get presets that use a specific package
apiRoutes.get('/packages/:packageName/presets', async (c) => {
  try {
    const packageName = decodeURIComponent(c.req.param('packageName'))
    const url = new URL(c.req.url)
    const { page, limit, offset } = getPaginationParams(url);

    if (!packageName) {
      return errorResponse(c, 'パッケージ名が必要です', 400);
    }

    const cacheKey = `package:${packageName}:presets:${page}`
    const cached = await getCachedResponse(c.env.KV, cacheKey);
    if (cached) {
      return successResponse(c, cached, 200, getCacheHeaders());
    }

    const db = getDB(c)

    // Method 1: Search in JSON packages field (for existing data)
    const jsonResults = await db
      .select({
        id: presets.id,
        title: presets.title,
        packages: presets.packages,
        likes_count: presets.likesCount,
        created_at: presets.createdAt
      })
      .from(presets)
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

    await setCachedResponse(c.env.KV, cacheKey, response);

    return successResponse(c, response, 200, getCacheHeaders());
  } catch (error) {
    return handleError(error, c, 'パッケージのプリセット取得に失敗しました');
  }
})

// GET /api/packages/:packageName - Get package details
apiRoutes.get('/packages/:packageName', async (c) => {
  try {
    const packageName = decodeURIComponent(c.req.param('packageName'))
    
    if (!packageName) {
      return errorResponse(c, 'パッケージ名が必要です', 400);
    }

    const cacheKey = `package:${packageName}:details`
    const cached = await getCachedResponse(c.env.KV, cacheKey);
    if (cached) {
      return successResponse(c, cached, 200, getCacheHeaders(3600));
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
      return errorResponse(c, 'パッケージが見つかりません', 404);
    }

    // Get tags for this package
    const pkgTags = await getPackageTags(db, packageName);

    const response = {
      ...packageData[0],
      tags: pkgTags
    }
    await setCachedResponse(c.env.KV, cacheKey, response, 3600);

    return successResponse(c, response, 200, getCacheHeaders(3600));
  } catch (error) {
    return handleError(error, c, 'パッケージ詳細の取得に失敗しました');
  }
})

// GET /api/tags - Get all tags
apiRoutes.get('/tags', async (c) => {
  try {
    const cacheKey = 'tags:all'
    const cached = await getCachedResponse(c.env.KV, cacheKey);
    if (cached) {
      return successResponse(c, cached, 200, getCacheHeaders());
    }

    const db = getDB(c)
    const results = await db.select().from(tags).orderBy(tags.name)

    const response = { tags: results }
    await setCachedResponse(c.env.KV, cacheKey, response);

    return successResponse(c, response, 200, getCacheHeaders());
  } catch (error) {
    return handleError(error, c, 'タグの取得に失敗しました');
  }
})

// GET /api/tags/:tagId - Get specific tag
apiRoutes.get('/tags/:tagId', async (c) => {
  try {
    const tagId = c.req.param('tagId')
    
    if (!tagId) {
      return errorResponse(c, 'タグIDが必要です', 400);
    }

    const cacheKey = `tag:${tagId}:details`
    const cached = await getCachedResponse(c.env.KV, cacheKey);
    if (cached) {
      return successResponse(c, cached, 200, getCacheHeaders());
    }

    const db = getDB(c)
    const results = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1)

    if (results.length === 0) {
      return errorResponse(c, 'タグが見つかりません', 404);
    }

    const response = results[0]
    await setCachedResponse(c.env.KV, cacheKey, response);

    return successResponse(c, response, 200, getCacheHeaders());
  } catch (error) {
    return handleError(error, c, 'タグ詳細の取得に失敗しました');
  }
})

// POST /api/tags - Create new tag (auth required)
apiRoutes.post('/tags', async (c) => {
  try {
    requireAuth(c)
    const body = await c.req.json()
    const { name, description, color } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(c, 'タグ名が必要です', 400);
    }

    const trimmedName = name.trim()
    if (trimmedName.length > 50) {
      return errorResponse(c, 'タグ名は50文字以内で入力してください', 400);
    }

    const trimmedDescription = description?.trim() || undefined
    if (trimmedDescription && trimmedDescription.length > 200) {
      return errorResponse(c, '説明は200文字以内で入力してください', 400);
    }

    const validColor = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#3B82F6'

    const db = getDB(c)

    // Check if tag already exists
    const existing = await db.select().from(tags).where(eq(tags.name, trimmedName)).limit(1)
    if (existing.length > 0) {
      return errorResponse(c, 'このタグ名は既に存在します', 400);
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

    return successResponse(c, newTag);
  } catch (error) {
    return handleError(error, c, 'タグの作成に失敗しました');
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
      return errorResponse(c, 'パッケージ名が必要です', 400);
    }

    if (!Array.isArray(tagIds)) {
      return errorResponse(c, 'タグIDの配列が必要です', 400);
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
        return errorResponse(c, '無効なタグIDが含まれています', 400);
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

    return successResponse(c, { success: true });
  } catch (error) {
    return handleError(error, c, 'パッケージタグの更新に失敗しました');
  }
})

