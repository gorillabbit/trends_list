// src/index.ts - Main Worker entry point
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { apiRoutes } from './routes/api'
import { D1Database, Fetcher, KVNamespace } from '@cloudflare/workers-types/experimental'
import { syncPopularPackages } from '../scripts/sync-popular-packages'
import { drizzle } from 'drizzle-orm/d1'

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

// 手動で人気パッケージ同期を実行するエンドポイント
app.post('/api/admin/sync-packages', async (c) => {
  try {
    console.log('手動実行: 人気パッケージ同期スクリプトを開始');
    
    // データベース接続
    const db = drizzle(c.env.DB);
    
    // 人気パッケージを同期
    await syncPopularPackages(db);
    
    return c.json({ 
      success: true, 
      message: '人気パッケージの同期が完了しました' 
    });
    
  } catch (error) {
    console.error('手動実行: 人気パッケージ同期でエラーが発生しました:', error);
    
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '不明なエラー'
    }, 500);
  }
})

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

// Scheduled handler for cron jobs
export async function scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
  console.log('定期実行: 人気パッケージ同期スクリプトを開始');
  
  try {
    // データベース接続
    const db = drizzle(env.DB);
    
    // 人気パッケージを同期
    await syncPopularPackages(db);
    
    console.log('定期実行: 人気パッケージ同期が正常に完了しました');
    
  } catch (error) {
    console.error('定期実行: 人気パッケージ同期でエラーが発生しました:', error);
    throw error;
  }
}

export default app