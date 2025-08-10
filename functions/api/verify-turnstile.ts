// functions/api/verify-turnstile.ts

interface Env {
  TURNSTILE_SECRET_KEY: string;
}

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

// POST /api/verify-turnstile - Turnstile検証
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const body = await ctx.request.json();
    const { token } = body as { token: string };

    if (!token) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Turnstileトークンが必要です' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const secret = ctx.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      console.error('TURNSTILE_SECRET_KEY is not configured');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'サーバー設定エラー' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cloudflare Turnstile Siteverify API
    // https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
    const formData = new URLSearchParams({
      secret,
      response: token,
      // オプション: remoteip を含める場合
      // remoteip: ctx.request.headers.get('CF-Connecting-IP') || ctx.request.headers.get('X-Forwarded-For') || 'unknown'
    });

    const resp = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    if (!resp.ok) {
      console.error('Turnstile API response error:', resp.status, resp.statusText);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Turnstile検証サービスが利用できません' 
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json() as TurnstileResponse;
    
    if (data.success) {
      return new Response(JSON.stringify({
        success: true,
        message: '検証に成功しました'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Turnstile verification failed:', data['error-codes']);
      return new Response(JSON.stringify({
        success: false,
        error: '検証に失敗しました',
        errorCodes: data['error-codes']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Turnstile検証エラー:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Turnstile検証処理でエラーが発生しました' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};