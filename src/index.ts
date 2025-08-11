// src/index.ts - Main Worker entry point
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'

// Types for Cloudflare Workers environment
type Bindings = {
  DB: D1Database
  KV: KVNamespace
  ASSETS: Fetcher
  TURNSTILE_SECRET_KEY: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  SESSION_SECRET: string
  TURNSTILE_SITE_KEY: string
}

type Variables = {
  user?: User
}

export interface User {
  id: string
  name: string
  avatar_url: string
  created_at: string
}

// Create Hono app
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS middleware
app.use('/api/*', cors({
  origin: [
    'http://localhost:3000',
    'https://*.pages.dev',
    'https://npmtrends-presets.modsyoukaizenryoku.workers.dev'
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// Auth middleware - extract user from session
app.use('/api/*', async (c, next) => {
  const sessionCookie = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
  
  if (sessionCookie) {
    try {
      const user = await verifySession(sessionCookie, c.env.SESSION_SECRET, c.env.DB)
      if (user) {
        c.set('user', user)
      }
    } catch (error) {
      console.error('Session verification failed:', error)
    }
  }
  
  return next()
})

// Routes
app.route('/auth', authRoutes)
app.route('/api', apiRoutes)

// Serve static files (frontend)
app.get('*', async (c) => {
  // Try to serve static file from assets
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw)
  
  if (assetResponse.status === 200) {
    return assetResponse
  }
  
  // Fallback to index.html for SPA routing
  const indexResponse = await c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)))
  
  if (indexResponse.status === 200) {
    return new Response(indexResponse.body, {
      headers: {
        ...indexResponse.headers,
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
  }
  
  return c.notFound()
})

// Session verification helper  
async function verifySession(token: string, secret: string, db: any): Promise<User | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return null
    }
    
    const payload = JSON.parse(atob(payloadB64))
    
    // Check expiration
    if (payload.exp < Date.now() / 1000) {
      return null
    }

    // Simple signature verification (in production, use proper JWT library)
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data)
    
    if (!isValid) {
      return null
    }

    // Get user from database
    const user = await db
      .prepare('SELECT id, name, avatar_url, created_at FROM users WHERE id = ?')
      .bind(payload.sub)
      .first() as User | null

    return user
  } catch (error) {
    console.error('Session verification error:', error)
    return null
  }
}

export default app