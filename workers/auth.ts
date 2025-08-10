// workers/auth.ts - GitHub OAuth Worker

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

// JWT生成（簡易実装）
async function signJwt(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (30 * 24 * 60 * 60); // 30日

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS対応
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GitHub OAuth開始
      if (pathname === '/auth/login') {
        const state = crypto.randomUUID();
        const redirectUri = `${url.origin}/auth/callback`;
        
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', 'read:user user:email');
        authUrl.searchParams.set('state', state);

        return Response.redirect(authUrl.toString(), 302);
      }

      // GitHub OAuth コールバック
      if (pathname === '/auth/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code) {
          return new Response('認証コードが見つかりません', { 
            status: 400,
            headers: corsHeaders 
          });
        }

        // GitHubトークン取得
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code,
          }),
        });

        if (!tokenResponse.ok) {
          console.error('GitHub token request failed:', tokenResponse.status);
          return new Response('認証に失敗しました', { 
            status: 500,
            headers: corsHeaders 
          });
        }

        const tokenData = await tokenResponse.json() as GitHubTokenResponse;

        if (!tokenData.access_token) {
          console.error('No access token received:', tokenData);
          return new Response('認証に失敗しました', { 
            status: 500,
            headers: corsHeaders 
          });
        }

        // GitHubユーザー情報取得
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'npmtrends-presets',
          },
        });

        if (!userResponse.ok) {
          console.error('GitHub user request failed:', userResponse.status);
          return new Response('ユーザー情報の取得に失敗しました', { 
            status: 500,
            headers: corsHeaders 
          });
        }

        const githubUser = await userResponse.json() as GitHubUser;

        // D1にユーザー情報を保存/更新
        const userId = `github:${githubUser.id}`;
        await env.DB.prepare(`
          INSERT INTO users (id, name, avatar_url) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            name = excluded.name,
            avatar_url = excluded.avatar_url
        `).bind(
          userId,
          githubUser.name || githubUser.login,
          githubUser.avatar_url || ''
        ).run();

        // JWT作成
        const jwt = await signJwt({ sub: userId }, env.SESSION_SECRET);

        // セッションCookieを設定してリダイレクト
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Set-Cookie': `session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`, // 30日
            'Location': '/', // フロントエンドのホームページにリダイレクト
          },
        });
      }

      // ログアウト
      if (pathname === '/auth/logout') {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Set-Cookie': 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
            'Location': '/',
          },
        });
      }

      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Auth worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: corsHeaders 
      });
    }
  },
};