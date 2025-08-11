# NPM Trends Presets 📈

NPMパッケージのトレンド比較プリセットを作成・共有・いいねできるWebサービス

## 🌟 機能

- **プリセット作成**: お気に入りのNPMパッケージの組み合わせを保存
- **トレンド表示**: npmtrendsへの直接リンクで比較グラフを表示
- **いいね機能**: 他のユーザーのプリセットにいいねを付ける
- **認証システム**: Clerk (OAuth, Email/Passwordなど) でログイン
- **スパム防止**: Cloudflare Turnstileによる保護
- **レスポンシブUI**: モバイル・デスクトップ対応

## 🏗️ アーキテクチャ

- **フロントエンド**: React + TypeScript + Vite
- **API**: Cloudflare Workers (Honoフレームワーク, **単一Workerに集約**)
- **認証**: Clerk (認証サービス)
- **データベース**: Cloudflare D1 (SQLite)
- **キャッシュ**: Cloudflare Workers KV
- **スパム防止**: Cloudflare Turnstile

## 🚀 ローカル開発

### 必要な環境

- Node.js 18以上
- npm または yarn

### セットアップ

1.  **依存関係のインストール**
    ```bash
    npm install
    ```

2.  **環境変数の設定**

    `.env.local` ファイルを作成し、ClerkとTurnstileのキーを設定します。
    ```env
    # Cloudflare Turnstile設定
    TURNSTILE_SITE_KEY=your_turnstile_site_key
    TURNSTILE_SECRET_KEY=your_turnstile_secret_key

    # Clerk Authentication
    # VITE_CLERK_PUBLISHABLE_KEY はフロントエンド用、CLERK_PUBLISHABLE_KEYはwrangler.toml用（同じ値でOK）
    VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
    CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
    CLERK_SECRET_KEY=your_clerk_secret_key
    ```
    *   `your_clerk_publishable_key`: Clerkダッシュボードで取得した公開可能キー
    *   `your_clerk_secret_key`: Clerkダッシュボードで取得した秘密キー
    *   `your_turnstile_site_key`: Cloudflare Turnstileで取得したサイトキー
    *   `your_turnstile_secret_key`: Cloudflare Turnstileで取得した秘密キー

3.  **開発サーバー起動**
    ```bash
    # Wrangler開発サーバーとフロントエンドを同時起動
    npm run dev:full

    # または別々に起動
    npm run wrangler:dev    # ポート8787
    npm run dev             # ポート3000
    ```

4.  **アクセス**
    -   フロントエンド: http://localhost:3000
    -   API: http://localhost:8787 (プロキシ経由)

### 開発用コマンド

```bash
# ビルド（フロントエンド + Worker）
npm run build

# フロントエンドのみビルド
npm run build:frontend

# Worker TypeScript チェック
npm run build:worker

# リント
npm run lint

# プレビュー（ビルド後）
npm run preview
```

## 🌐 本番デプロイ

### 1. Cloudflareアカウント設定

1.  [Cloudflare](https://cloudflare.com)アカウント作成
2.  API トークン取得
3.  `wrangler` CLI認証

    ```bash
    npx wrangler auth login
    ```

### 2. D1データベース作成

```bash
# データベース作成
npm run db:create

# スキーマ適用
npm run db:migrate
```

作成されたデータベースIDを `wrangler.toml` に設定:

```toml
[[d1_databases]]
binding = "DB"
database_name = "trends_list"
database_id = "your-database-id-here"
```

### 3. KVストレージ作成

```bash
npx wrangler kv:namespace create KV
```

KV IDを `wrangler.toml` に設定:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your-kv-id-here"
```

### 4. シークレット設定

`.env.prod` ファイルに本番環境用のClerkとTurnstileのキーを設定した後、以下のスクリプトでCloudflare Secretsに同期します。

```bash
# 本番環境用シークレットを同期
npm run deploy prod
```

### 5. Clerkアプリケーション設定

1.  [Clerkダッシュボード](https://clerk.com/dashboard)でアプリケーションを作成
2.  公開可能キー (`CLERK_PUBLISHABLE_KEY`) と秘密キー (`CLERK_SECRET_KEY`) を取得
3.  認証方法（OAuthプロバイダー、Email/Passwordなど）を設定

### 6. Turnstile設定

1.  [Cloudflare Dashboard](https://dash.cloudflare.com)
2.  Turnstile タブからサイトを作成
3.  サイトキーを `wrangler.toml` の `TURNSTILE_SITE_KEY` に設定

### 7. デプロイ

```bash
# 統合デプロイ（ビルド、シークレット同期、DB初期化チェック、デプロイ、テスト）
npm run deploy
```

### 8. ローカル開発サーバー（オプション）

```bash
# Wrangler開発サーバーで確認
npm run wrangler:dev
```

## 📁 プロジェクト構造

```
├── frontend/               # React フロントエンド (Vite)
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── types.ts        # TypeScript型定義
│   │   └── ...
│   └── index.html
├── src/                    # Cloudflare Workers (Hono, メインWorkerに集約)
│   ├── index.ts            # Worker メインファイル
│   └── routes/
│       └── api.ts          # API ルート (プリセット, いいね, Turnstile)
├── scripts/                # デプロイ・環境設定スクリプト
│   ├── deploy.js           # 統合デプロイスクリプト
│   └── sync-secrets.js     # .envからsecretsを同期するスクリプト
├── schema.sql              # D1スキーマ
├── wrangler.toml           # Cloudflare設定
├── tsconfig.json           # TypeScript設定 (フロントエンド)
├── tsconfig.node.json      # TypeScript設定 (Node.js用)
├── tsconfig.worker.json    # TypeScript設定 (Worker用)
├── package.json
└── README.md
```

## 🔧 設定

### wrangler.toml 設定例

```toml
name = "npmtrends-presets"
compatibility_date = "2025-08-01"

# Workers main entry point
main = "src/index.ts"

# Static assets
[assets]
bucket = "./dist"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "trends_list"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[kv_namespaces]]
binding = "KV"
id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"

[vars]
TURNSTILE_SITE_KEY = "your_site_key"
CLERK_PUBLISHABLE_KEY = "your_clerk_publishable_key"
```

### 環境変数（Secrets）

-   `TURNSTILE_SECRET_KEY`: Turnstile秘密キー
-   `CLERK_SECRET_KEY`: Clerk秘密キー

## 🐛 トラブルシューティング

### ローカル開発時のエラー

1.  **ポート衝突**: 3000, 8787ポートが使用中の場合は別のポートを使用
2.  **API接続エラー**: Wrangler開発サーバーが起動しているか確認
3.  **CORS エラー**: `vite.config.ts`のプロキシ設定を確認
4.  **Clerkキー未設定**: `.env.local`に`VITE_CLERK_PUBLISHABLE_KEY`が正しく設定されているか確認

### デプロイ時のエラー

1.  **認証エラー**: `npx wrangler auth login` で再認証
2.  **D1接続エラー**: データベースIDが正しく設定されているか確認
3.  **KV接続エラー**: KV IDが正しく設定されているか確認
4.  **Clerkキー未設定**: `npm run deploy prod` でシークレットが正しく同期されているか確認

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## 📞 サポート

Issue や質問は [GitHub Issues](https://github.com/your-username/npmtrends-presets/issues) でお受けします。
