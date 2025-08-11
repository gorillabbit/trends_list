# NPM Trends Presets 📈

NPMパッケージのトレンド比較プリセットを作成・共有・いいねできるWebサービス

## 🌟 機能

- **プリセット作成**: お気に入りのNPMパッケージの組み合わせを保存
- **トレンド表示**: npmtrendsへの直接リンクで比較グラフを表示
- **いいね機能**: 他のユーザーのプリセットにいいねを付ける
- **認証システム**: GitHub OAuthでログイン
- **スパム防止**: Cloudflare Turnstileによる保護
- **レスポンシブUI**: モバイル・デスクトップ対応

## 🏗️ アーキテクチャ

- **フロントエンド**: React + TypeScript + Vite
- **API**: Cloudflare Workers (Honoフレームワーク)
- **認証**: GitHub OAuth (統合済み)
- **データベース**: Cloudflare D1 (SQLite)
- **キャッシュ**: Cloudflare Workers KV
- **スパム防止**: Cloudflare Turnstile
- **静的配信**: Workers Assets

## 🚀 ローカル開発

### 必要な環境

- Node.js 18以上
- npm または yarn

### セットアップ

1. **依存関係のインストール**
```bash
npm install
```

2. **環境変数の設定**

**自動セットアップ（推奨）：**
```bash
# 開発環境用環境変数設定
npm run setup:dev

# または直接実行
./setup-dev-env.sh
```

**手動設定：**
`.env.local` ファイルを作成:
```env
SESSION_SECRET=your_generated_session_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000000000
```

3. **開発サーバー起動**
```bash
# モックAPIとフロントエンドを同時起動
npm run dev:full

# または別々に起動
npm run mock-api    # ポート8788
npm run dev         # ポート3000
```

4. **アクセス**
- フロントエンド: http://localhost:3000
- モックAPI: http://localhost:8788

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

1. [Cloudflare](https://cloudflare.com)アカウント作成
2. API トークン取得
3. `wrangler` CLI認証

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
database_name = "npmtrends_presets"
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

**自動セットアップスクリプト使用（推奨）：**
```bash
# 本番環境用シークレット設定
npm run setup:secrets

# または直接実行
./setup-secrets.sh        # Linux/Mac
setup-secrets.bat          # Windows
```

**手動設定：**
```bash
# GitHub OAuth設定
npx wrangler secret put GITHUB_CLIENT_SECRET

# Turnstile設定
npx wrangler secret put TURNSTILE_SECRET_KEY

# セッション暗号化キー
npx wrangler secret put SESSION_SECRET
```

### 5. GitHub OAuth App作成

1. [GitHub Developer Settings](https://github.com/settings/developers)
2. New OAuth App作成
3. Authorization callback URL: `https://your-domain.pages.dev/auth/callback`
4. Client IDを `wrangler.toml` の `GITHUB_CLIENT_ID` に設定

### 6. Turnstile設定

1. [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Turnstile タブからサイト作成
3. Site Keyを `wrangler.toml` の `TURNSTILE_SITE_KEY` に設定
4. Secret Keyを環境変数に設定

### 7. デプロイ

```bash
# ビルド
npm run build

# Workers デプロイ
npm run wrangler:deploy

# または手動デプロイ
npx wrangler deploy
```

### 8. ローカル開発サーバー（オプション）

```bash
# Wrangler開発サーバーで確認
npm run wrangler:dev
```

## 📁 プロジェクト構造

```
├── frontend/               # React フロントエンド
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── types.ts        # TypeScript型定義
│   │   └── ...
│   └── index.html
├── src/                    # Cloudflare Workers (Hono)
│   ├── index.ts            # Worker メインファイル
│   └── routes/
│       ├── api.ts          # API ルート (プリセット, いいね, Turnstile)
│       └── auth.ts         # 認証ルート (GitHub OAuth)
├── schema.sql              # D1スキーマ
├── wrangler.toml           # Cloudflare設定
├── tsconfig.worker.json    # Worker TypeScript設定
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
GITHUB_CLIENT_ID = "your_github_client_id"
SESSION_SECRET = "your_session_secret"
```

### 環境変数（Secrets）

- `TURNSTILE_SECRET_KEY`: Turnstile秘密キー
- `GITHUB_CLIENT_SECRET`: GitHub OAuth秘密キー
- `SESSION_SECRET`: JWT署名用秘密キー

## 🐛 トラブルシューティング

### ローカル開発時のエラー

1. **ポート衝突**: 3000, 8788ポートが使用中の場合は別のポートを使用
2. **API接続エラー**: モックAPIサーバーが起動しているか確認
3. **CORS エラー**: vite.config.tsのプロキシ設定を確認

### デプロイ時のエラー

1. **認証エラー**: `wrangler auth login` で再認証
2. **D1接続エラー**: データベースIDが正しく設定されているか確認
3. **KV接続エラー**: KV IDが正しく設定されているか確認

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 サポート

Issue や質問は [GitHub Issues](https://github.com/your-username/npmtrends-presets/issues) でお受けします。