// src/routes/auth.ts - Authentication routes
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  SESSION_SECRET: string
}

interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
  email: string | null
}

interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

export const authRoutes = new Hono<{ Bindings: Bindings }>()

// JWT signing helper
async function signJwt(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (30 * 24 * 60 * 60) // 30 days

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp,
  }

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${headerB64}.${payloadB64}.${signatureB64}`
}

// GET /auth/login - Start GitHub OAuth flow
authRoutes.get('/login', async (c) => {
  const state = crypto.randomUUID()
  const redirectUri = `${new URL(c.req.url).origin}/auth/callback`
  
  const authUrl = new URL('https://github.com/login/oauth/authorize')
  authUrl.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'read:user user:email')
  authUrl.searchParams.set('state', state)

  return c.redirect(authUrl.toString())
})

// GET /auth/callback - Handle GitHub OAuth callback
authRoutes.get('/callback', async (c) => {
  try {
    const url = new URL(c.req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    console.log('OAuth callback received:', { code: code?.substring(0, 8) + '...', state })

    if (!code) {
      console.error('No authorization code received')
      return c.text('認証コードが見つかりません', 400)
    }

    // Check environment variables
    if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) {
      console.error('Missing GitHub OAuth configuration', {
        hasClientId: !!c.env.GITHUB_CLIENT_ID,
        hasClientSecret: !!c.env.GITHUB_CLIENT_SECRET
      })
      return c.text('OAuth設定が不完全です', 500)
    }

    console.log('Exchanging code for token with GitHub...')

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: c.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    })

    console.log('GitHub token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('GitHub token request failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: errorText
      })
      return c.text(`認証に失敗しました (${tokenResponse.status})`, 500)
    }

    const tokenData = await tokenResponse.json() as GitHubTokenResponse
    console.log('Token response received:', { hasAccessToken: !!tokenData.access_token })

    if (!tokenData.access_token) {
      console.error('No access token received:', tokenData)
      return c.text('認証に失敗しました: アクセストークンなし', 500)
    }

    console.log('Fetching user info from GitHub...')

    // Get user information from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'npmtrends-presets',
      },
    })

    console.log('GitHub user response status:', userResponse.status)

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('GitHub user request failed:', {
        status: userResponse.status,
        response: errorText
      })
      return c.text('ユーザー情報の取得に失敗しました', 500)
    }

    const githubUser = await userResponse.json() as GitHubUser
    console.log('GitHub user info received:', { id: githubUser.id, login: githubUser.login })

    // Save/update user in database
    const userId = `github:${githubUser.id}`
    
    console.log('Saving user to database...')
    await c.env.DB.prepare(`
      INSERT INTO users (id, name, avatar_url) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name,
        avatar_url = excluded.avatar_url
    `).bind(
      userId,
      githubUser.name || githubUser.login,
      githubUser.avatar_url || ''
    ).run()

    // Create JWT session token
    console.log('Creating JWT session...')
    const jwt = await signJwt({ sub: userId }, c.env.SESSION_SECRET)

    console.log('Authentication successful, redirecting to home')
    
    // Set session cookie and redirect
    const response = c.redirect('/', 302)
    response.headers.set('Set-Cookie', `session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`)
    return response
  } catch (error) {
    console.error('Auth callback error:', error)
    return c.text('認証処理でエラーが発生しました', 500)
  }
})

// GET /auth/logout - Logout user
authRoutes.get('/logout', async (c) => {
  const response = c.redirect('/', 302)
  response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
  return response
})