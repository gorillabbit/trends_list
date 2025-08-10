// functions/api/presets/[slug]/like.ts

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

interface User {
  id: string;
  name: string;
  avatar_url: string;
}

// 認証状態確認（後でmiddlewareで実装）
async function requireUser(ctx: any): Promise<User> {
  const user = ctx.user;
  if (!user) {
    throw new Error('認証が必要です');
  }
  return user;
}

// POST /api/presets/:slug/like - いいねトグル
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    const { slug } = ctx.params as { slug: string };

    if (!slug) {
      return new Response(JSON.stringify({ error: 'プリセットが見つかりません' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = ctx.env.DB;
    
    // プリセットの存在確認
    const preset = await db
      .prepare('SELECT id FROM presets WHERE id = ?')
      .bind(slug)
      .first();

    if (!preset) {
      return new Response(JSON.stringify({ error: 'プリセットが見つかりません' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 既存いいね確認
    const liked = await db
      .prepare('SELECT 1 FROM likes WHERE user_id=? AND preset_id=?')
      .bind(user.id, slug)
      .first();

    let newLikeStatus = false;

    if (liked) {
      // いいね取り消し
      await db.batch([
        db
          .prepare('DELETE FROM likes WHERE user_id=? AND preset_id=?')
          .bind(user.id, slug),
        db
          .prepare('UPDATE presets SET likes_count = likes_count - 1 WHERE id=?')
          .bind(slug),
      ]);
      newLikeStatus = false;
    } else {
      // いいね追加
      await db.batch([
        db
          .prepare('INSERT INTO likes (user_id, preset_id) VALUES (?, ?)')
          .bind(user.id, slug),
        db
          .prepare('UPDATE presets SET likes_count = likes_count + 1 WHERE id=?')
          .bind(slug),
      ]);
      newLikeStatus = true;
    }

    // 関連するキャッシュを無効化
    await Promise.all([
      ctx.env.KV.delete('presets:list:likes:1'),
      ctx.env.KV.delete(`preset:${slug}`),
    ]);

    // 更新後のいいね数を取得
    const updatedPreset = await db
      .prepare('SELECT likes_count FROM presets WHERE id = ?')
      .bind(slug)
      .first();

    return new Response(JSON.stringify({ 
      liked: newLikeStatus,
      likes_count: updatedPreset?.likes_count || 0
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('いいねトグルエラー:', error);
    if (error.message === '認証が必要です') {
      return new Response(JSON.stringify({ error: 'ログインが必要です' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'いいねの処理に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};