// functions/api/me.ts

interface Env {
  DB: D1Database;
}

interface User {
  id: string;
  name: string;
  avatar_url: string;
  created_at: string;
}

// GET /api/me - 認証状態確認
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    // middlewareで設定されたユーザー情報を取得
    const user = ctx.user as User;

    if (!user) {
      return new Response(JSON.stringify({ 
        authenticated: false,
        user: null 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ユーザーの追加情報を取得（作成したプリセット数など）
    const stats = await ctx.env.DB.prepare(`
      SELECT 
        COUNT(*) as presets_count,
        COALESCE(SUM(likes_count), 0) as total_likes
      FROM presets 
      WHERE owner_id = ?
    `).bind(user.id).first();

    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        stats: {
          presets_count: stats?.presets_count || 0,
          total_likes: stats?.total_likes || 0
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('認証状態確認エラー:', error);
    return new Response(JSON.stringify({ 
      error: 'ユーザー情報の取得に失敗しました',
      authenticated: false,
      user: null 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};