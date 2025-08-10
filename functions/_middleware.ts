// functions/_middleware.ts

interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
}

interface User {
  id: string;
  name: string;
  avatar_url: string;
  created_at: string;
}

interface JWTPayload {
  sub: string; // user id
  exp: number;
  iat: number;
}

// JWT簡易実装（本番環境では適切なライブラリを使用推奨）
async function verifyJwt(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    // シンプルなJWT検証（実際はcryptoライブラリを使用推奨）
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    
    // 期限切れチェック
    if (payload.exp < Date.now() / 1000) {
      return null;
    }

    // 簡易署名検証（本番環境では適切な検証が必要）
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = new Uint8Array(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => c.charCodeAt(0)));
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    
    return isValid ? payload : null;
  } catch (error) {
    console.error('JWT検証エラー:', error);
    return null;
  }
}

// セッションからユーザー情報を取得
async function getUserFromSession(request: Request, env: Env): Promise<User | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const sessionToken = cookies.session;
  if (!sessionToken) return null;

  const payload = await verifyJwt(sessionToken, env.SESSION_SECRET);
  if (!payload || !payload.sub) return null;

  // D1からユーザー情報を取得
  const user = await env.DB
    .prepare('SELECT id, name, avatar_url, created_at FROM users WHERE id = ?')
    .bind(payload.sub)
    .first();

  return user as User | null;
}

// 認証が必要なパスをチェック
function requiresAuth(pathname: string): boolean {
  const authRequiredPaths = [
    '/api/presets', // POST（作成）のみ認証必要
    '/api/me',
  ];

  const authRequiredPatterns = [
    /^\/api\/presets\/[^\/]+\/like$/, // いいね機能
  ];

  // POST /api/presets は認証必要
  return authRequiredPaths.some(path => pathname === path) ||
         authRequiredPatterns.some(pattern => pattern.test(pathname));
}

export const onRequest: PagesFunction<Env> = async (ctx, next) => {
  const url = new URL(ctx.request.url);
  const pathname = url.pathname;

  // 静的ファイルやauth系は除外
  if (pathname.startsWith('/auth/') || pathname.startsWith('/_next/') || pathname.endsWith('.js') || pathname.endsWith('.css')) {
    return next();
  }

  try {
    // ユーザー情報を取得
    const user = await getUserFromSession(ctx.request, ctx.env);
    
    // contextにユーザー情報を追加
    ctx.user = user;

    // 認証が必要なパスかチェック
    if (requiresAuth(pathname)) {
      // POSTの場合のみ認証チェック（GET /api/presets は認証不要）
      if (ctx.request.method === 'POST' && pathname === '/api/presets' && !user) {
        return new Response(JSON.stringify({ error: 'ログインが必要です' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // その他の認証必要パス
      if (pathname !== '/api/presets' && !user) {
        return new Response(JSON.stringify({ error: 'ログインが必要です' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return next();
  } catch (error) {
    console.error('ミドルウェアエラー:', error);
    return next();
  }
};