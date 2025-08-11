// src/index.ts - Main Worker entry point
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { apiRoutes } from './routes/api'
import { D1Database, Fetcher, KVNamespace } from '@cloudflare/workers-types/experimental'

// Types for Cloudflare Workers environment
type Bindings = {
  DB: D1Database
  KV: KVNamespace
  ASSETS: Fetcher
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
}

// Create Hono app
const app = new Hono<{ Bindings: Bindings }>()

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

// Routes
app.route('/api', apiRoutes)

// Serve static files (frontend)
app.get('*', async (c): Promise<Response> => {
  try {
    // Try to serve static file from assets
    const assetResponse = await c.env.ASSETS.fetch(c.req.url)
    
    if (assetResponse.status === 200) {
      const responseBody = await assetResponse.text()
      const contentType = assetResponse.headers.get('Content-Type') || 'text/plain'
      return c.text(responseBody, 200, { 'Content-Type': contentType })
    }
    
    // Fallback to index.html for SPA routing
    const indexUrl = new URL('/index.html', c.req.url).toString()
    const indexResponse = await c.env.ASSETS.fetch(indexUrl)
    
    if (indexResponse.status === 200) {
      const body = await indexResponse.text()
      return c.html(body)
    }
    
    return c.notFound()
  } catch (error) {
    console.error('Asset serving error:', error)
    return c.notFound()
  }
})

export default app