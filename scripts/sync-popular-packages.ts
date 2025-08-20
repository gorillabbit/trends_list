import { packages, tags, packageTags } from '../src/db/schema';
import { sql } from 'drizzle-orm';

interface PackageInfo {
  name: string;
  description?: string;
  weekly_downloads?: number;
  repository?: string;
  homepage?: string;
}

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

// 基本的なタグを定義
const DEFAULT_TAGS: TagInfo[] = [
  { id: 'frontend', name: 'Frontend', color: '#3B82F6' },
  { id: 'backend', name: 'Backend', color: '#8B5CF6' },
  { id: 'utility', name: 'Utility', color: '#F59E0B' },
  { id: 'framework', name: 'Framework', color: '#06B6D4' },
  { id: 'react', name: 'React', color: '#61DAFB' },
  { id: 'vue', name: 'Vue', color: '#4FC08D' },
  { id: 'angular', name: 'Angular', color: '#DD0031' },
  { id: 'testing', name: 'Testing', color: '#10B981' },
  { id: 'build-tool', name: 'Build Tool', color: '#8B5CF6' },
  { id: 'linter', name: 'Linter', color: '#EF4444' },
  { id: 'typescript', name: 'TypeScript', color: '#3178C6' },
  { id: 'css', name: 'CSS', color: '#1572B6' },
  { id: 'bundler', name: 'Bundler', color: '#8DD6F9' },
  { id: 'cli', name: 'CLI', color: '#000000' },
  { id: 'http', name: 'HTTP', color: '#FF6B6B' },
  { id: 'database', name: 'Database', color: '#336791' },
  { id: 'security', name: 'Security', color: '#FF4757' },
  { id: 'date-time', name: 'Date/Time', color: '#FFA502' }
];

// パッケージ名からタグを推測する関数
function inferTags(packageName: string, description?: string): string[] {
  const text = `${packageName} ${description || ''}`.toLowerCase();
  const tagIds: string[] = [];

  // React関連
  if (text.includes('react') || text.includes('jsx')) {
    tagIds.push('react', 'frontend');
  }
  
  // Vue関連
  if (text.includes('vue') || text.includes('nuxt')) {
    tagIds.push('vue', 'frontend');
  }
  
  // Angular関連
  if (text.includes('angular') || text.includes('@angular')) {
    tagIds.push('angular', 'frontend');
  }
  
  // TypeScript
  if (text.includes('typescript') || text.includes('@types') || packageName.startsWith('@types/')) {
    tagIds.push('typescript');
  }
  
  // テスト関連
  if (text.includes('test') || text.includes('jest') || text.includes('mocha') || text.includes('chai')) {
    tagIds.push('testing');
  }
  
  // ビルドツール
  if (text.includes('webpack') || text.includes('rollup') || text.includes('vite') || text.includes('esbuild')) {
    tagIds.push('bundler', 'build-tool');
  }
  
  // バックエンド
  if (text.includes('express') || text.includes('fastify') || text.includes('koa') || text.includes('server')) {
    tagIds.push('backend');
  }
  
  // ユーティリティ
  if (text.includes('lodash') || text.includes('utility') || text.includes('helper')) {
    tagIds.push('utility');
  }
  
  // フレームワーク
  if (text.includes('framework') || text.includes('next') || text.includes('nuxt')) {
    tagIds.push('framework');
  }
  
  // CSS関連
  if (text.includes('css') || text.includes('sass') || text.includes('less') || text.includes('postcss') || text.includes('styled')) {
    tagIds.push('css');
  }
  
  // CLI関連
  if (text.includes('cli') || text.includes('command') || text.includes('bin')) {
    tagIds.push('cli');
  }
  
  // HTTP関連
  if (text.includes('http') || text.includes('axios') || text.includes('fetch') || text.includes('request')) {
    tagIds.push('http');
  }
  
  // データベース関連
  if (text.includes('db') || text.includes('database') || text.includes('sql') || text.includes('mongo')) {
    tagIds.push('database');
  }
  
  // 日付・時刻関連
  if (text.includes('date') || text.includes('time') || text.includes('moment') || text.includes('dayjs')) {
    tagIds.push('date-time');
  }
  
  // セキュリティ関連
  if (text.includes('security') || text.includes('crypto') || text.includes('hash') || text.includes('auth')) {
    tagIds.push('security');
  }
  
  // ESLint関連
  if (text.includes('eslint') || text.includes('lint')) {
    tagIds.push('linter');
  }

  // フロントエンドが他に指定されていない場合のデフォルト
  if (tagIds.length === 0 && (text.includes('ui') || text.includes('component'))) {
    tagIds.push('frontend');
  }

  return [...new Set(tagIds)]; // 重複を除去
}

// NPM Registry APIから人気パッケージを取得
async function fetchPopularPackages(): Promise<PackageInfo[]> {
  try {
    console.log('人気パッケージを取得中...');
    
    // 複数の検索クエリを試して人気パッケージを取得
    const searchQueries = [
      // カテゴリ別に人気パッケージを検索
      'javascript',
      'react',
      'framework', 
      'utility',
      'typescript',
      'build',
      'test',
      'express',
      'api',
      'ui'
    ];
    
    const allPackages = new Set<string>();
    
    // 各カテゴリで検索して人気パッケージを収集
    for (const searchTerm of searchQueries) {
      try {
        console.log(`検索中: "${searchTerm}"`);
        const searchResponse = await fetch(
          `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(searchTerm)}&size=20&popularity=0.5`
        );
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const packageNames = searchData.objects?.map((obj: { package: { name: string } }) => obj.package.name) || [];
          
          // セットに追加（重複除去）
          packageNames.forEach((name: string) => allPackages.add(name));
          console.log(`✓ "${searchTerm}": ${packageNames.length}個のパッケージを取得`);
        } else {
          const errorText = await searchResponse.text();
          console.warn(`検索失敗 "${searchTerm}" (${searchResponse.status}): ${errorText}`);
        }
        
        // API制限対策で少し待機
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`検索エラー "${searchTerm}":`, error);
      }
    }
    
    if (allPackages.size === 0) {
      throw new Error('すべての検索クエリからパッケージを取得できませんでした');
    }
    
    console.log(`合計 ${allPackages.size} 個のユニークなパッケージを発見しました`);
    
    // 収集したパッケージを配列に変換（上位100個に制限）
    const popularPackageNames = Array.from(allPackages).slice(0, 100);
    
    console.log(`${popularPackageNames.length}個の人気パッケージが見つかりました`);
    
    // 各パッケージの詳細情報とダウンロード数を取得
    const packageInfos: PackageInfo[] = [];
    
    for (const packageName of popularPackageNames.slice(0, 50)) { // 上位50個に制限
      try {
        // パッケージの詳細情報を取得
        const registryResponse = await fetch(`https://registry.npmjs.com/${packageName}`);
        if (!registryResponse.ok) {
          console.warn(`パッケージ ${packageName} の情報取得に失敗: ${registryResponse.status}`);
          continue;
        }
        
        const packageData = await registryResponse.json();
        
        // 週間ダウンロード数を取得
        let weeklyDownloads = 0;
        try {
          const downloadsResponse = await fetch(
            `https://api.npmjs.org/downloads/point/last-week/${packageName}`
          );
          if (downloadsResponse.ok) {
            const downloadsData = await downloadsResponse.json();
            weeklyDownloads = downloadsData.downloads || 0;
          }
        } catch (error) {
          console.warn(`パッケージ ${packageName} のダウンロード数取得に失敗:`, error);
        }
        
        packageInfos.push({
          name: packageName,
          description: packageData.description,
          weekly_downloads: weeklyDownloads,
          repository: packageData.repository?.url,
          homepage: packageData.homepage
        });
        
        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`パッケージ ${packageName} の処理中にエラー:`, error);
      }
    }
    
    console.log(`${packageInfos.length}個のパッケージ情報を取得完了`);
    return packageInfos;
    
  } catch (error) {
    console.error('人気パッケージ取得エラー:', error);
    throw error;
  }
}

// データベースにパッケージを登録する関数
export async function syncPopularPackages(db: ReturnType<typeof import('drizzle-orm/d1').drizzle>) {
  console.log('人気パッケージの同期を開始...');
  
  try {
    // 1. デフォルトタグをデータベースに登録
    console.log('デフォルトタグを登録中...');
    for (const tag of DEFAULT_TAGS) {
      await db.insert(tags)
        .values({
          id: tag.id,
          name: tag.name,
          color: tag.color
        })
        .onConflictDoUpdate({
          target: tags.id,
          set: {
            name: tag.name,
            color: tag.color
          }
        });
    }
    
    // 2. 人気パッケージを取得
    const popularPackages = await fetchPopularPackages();
    
    // 3. データベースにパッケージを登録
    console.log('パッケージをデータベースに登録中...');
    for (const pkg of popularPackages) {
      try {
        // パッケージを登録（既存の場合は更新）
        await db.insert(packages)
          .values({
            id: pkg.name,
            name: pkg.name,
            description: pkg.description,
            weeklyDownloads: pkg.weekly_downloads,
            repository: pkg.repository,
            homepage: pkg.homepage,
            lastUpdate: sql`(datetime('now'))`
          })
          .onConflictDoUpdate({
            target: packages.id,
            set: {
              description: pkg.description,
              weeklyDownloads: pkg.weekly_downloads,
              repository: pkg.repository,
              homepage: pkg.homepage,
              lastUpdate: sql`(datetime('now'))`
            }
          });
        
        // パッケージに適切なタグを付与
        const inferredTagIds = inferTags(pkg.name, pkg.description);
        
        for (const tagId of inferredTagIds) {
          try {
            await db.insert(packageTags)
              .values({
                packageId: pkg.name,
                tagId: tagId
              })
              .onConflictDoNothing();
          } catch (error) {
            // タグの関連付けエラーは警告のみ
            console.warn(`パッケージ ${pkg.name} のタグ ${tagId} 関連付けに失敗:`, error);
          }
        }
        
        console.log(`✓ ${pkg.name} (${pkg.weekly_downloads?.toLocaleString()} weekly downloads)`);
        
      } catch (error) {
        console.error(`パッケージ ${pkg.name} の登録中にエラー:`, error);
      }
    }
    
    console.log(`人気パッケージの同期が完了しました。${popularPackages.length}個のパッケージを処理しました。`);
    
  } catch (error) {
    console.error('人気パッケージ同期エラー:', error);
    throw error;
  }
}

// このスクリプトはCloudflare Workers環境で実行される想定