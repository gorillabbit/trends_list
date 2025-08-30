import { syncPopularPackages } from './sync-popular-packages';
import { drizzle } from 'drizzle-orm/d1';
import { D1Database, ScheduledEvent } from '@cloudflare/workers-types';

type Bindings = {
  DB: D1Database;
};

// Cloudflare Workers環境での実行
export default {
  async scheduled(_event: ScheduledEvent, env: Bindings): Promise<void> {
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
  },

  // 手動実行用のHTTPエンドポイント
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/sync-packages' && request.method === 'POST') {
      try {
        console.log('手動実行: 人気パッケージ同期スクリプトを開始');
        
        // データベース接続
        const db = drizzle(env.DB);
        
        // 人気パッケージを同期
        await syncPopularPackages(db);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: '人気パッケージの同期が完了しました' 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('手動実行: 人気パッケージ同期でエラーが発生しました:', error);
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : '不明なエラー'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
};