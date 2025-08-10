// functions/api/presets.ts

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

interface User {
  id: string;
  name: string;
  avatar_url: string;
}

// slug生成用のシンプルな関数
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 認証状態確認（後でmiddlewareで実装）
async function requireUser(ctx: any): Promise<User> {
  const user = ctx.user;
  if (!user) {
    throw new Error('認証が必要です');
  }
  return user;
}

// GET /api/presets - プリセット一覧取得（KVキャッシュ付き）
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const sort = url.searchParams.get('sort') || 'likes';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const cacheKey = `presets:list:${sort}:${page}`;
    const cached = await ctx.env.KV.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        },
      });
    }

    // D1から取得
    let query = '';
    if (sort === 'likes') {
      query = `
        SELECT p.id, p.title, p.npmtrends_url, p.likes_count, p.created_at,
               u.name as owner_name, u.avatar_url as owner_avatar
        FROM presets p
        LEFT JOIN users u ON p.owner_id = u.id
        ORDER BY p.likes_count DESC, p.created_at DESC
        LIMIT ? OFFSET ?
      `;
    } else {
      query = `
        SELECT p.id, p.title, p.npmtrends_url, p.likes_count, p.created_at,
               u.name as owner_name, u.avatar_url as owner_avatar
        FROM presets p
        LEFT JOIN users u ON p.owner_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
    }

    const result = await ctx.env.DB.prepare(query).bind(limit, offset).all();
    const body = JSON.stringify({
      presets: result.results || [],
      page,
      hasMore: (result.results?.length || 0) === limit
    });

    // KVにキャッシュ（5分）
    await ctx.env.KV.put(cacheKey, body, { expirationTtl: 300 });

    return new Response(body, {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
    });
  } catch (error) {
    console.error('プリセット一覧取得エラー:', error);
    return new Response(JSON.stringify({ error: 'プリセットの取得に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/presets - プリセット作成
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const req = await ctx.request.json();
    const user = await requireUser(ctx);
    const { title, packages } = req as { title: string; packages: string[] };

    // バリデーション
    if (!title || !Array.isArray(packages) || packages.length < 2) {
      return new Response(JSON.stringify({ 
        error: 'タイトルと2つ以上のパッケージが必要です' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (title.length > 100) {
      return new Response(JSON.stringify({ 
        error: 'タイトルは100文字以内で入力してください' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (packages.length > 10) {
      return new Response(JSON.stringify({ 
        error: 'パッケージは10個まで選択できます' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // slug生成（英数字とハイフン）
    let slug = slugify(title);
    const timestamp = Date.now().toString(36);
    slug = `${slug}-${timestamp}`;

    // npmtrendsの比較URL（小文字・重複除去）
    const pkgs = [...new Set(packages.map((p) => p.trim().toLowerCase()))]
      .filter(p => p.match(/^[a-zA-Z0-9-_@./]+$/)); // パッケージ名の基本的なバリデーション

    if (pkgs.length < 2) {
      return new Response(JSON.stringify({ 
        error: '有効なパッケージ名を2つ以上選択してください' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const npmtrendsUrl = `https://npmtrends.com/${pkgs.join('-vs-')}`;

    // D1に保存
    const stmt = `
      INSERT INTO presets (id, title, packages, npmtrends_url, owner_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    await ctx.env.DB.prepare(stmt)
      .bind(slug, title, JSON.stringify(pkgs), npmtrendsUrl, user.id)
      .run();

    // 一覧キャッシュを無効化
    await Promise.all([
      ctx.env.KV.delete('presets:list:likes:1'),
      ctx.env.KV.delete('presets:list:new:1')
    ]);

    return new Response(JSON.stringify({ 
      id: slug, 
      npmtrends_url: npmtrendsUrl,
      title,
      packages: pkgs
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('プリセット作成エラー:', error);
    if (error.message === '認証が必要です') {
      return new Response(JSON.stringify({ error: 'ログインが必要です' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'プリセットの作成に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};