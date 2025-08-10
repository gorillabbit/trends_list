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
- **API**: Cloudflare Pages Functions
- **認証**: GitHub OAuth (Cloudflare Workers)
- **データベース**: Cloudflare D1 (SQLite)
- **キャッシュ**: Cloudflare Workers KV
- **スパム防止**: Cloudflare Turnstile

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
`.env.local` ファイルを作成:
```env
TURNSTILE_SITE_KEY=1x00000000000000000000AA
GITHUB_CLIENT_ID=your_github_client_id
SESSION_SECRET=your_session_secret
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
# ビルド
npm run build

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

# Pages Functions デプロイ
npm run wrangler:deploy

# または手動デプロイ
npx wrangler pages deploy dist
```

### 8. 独立Workers（認証）デプロイ（オプション）

```bash
# 認証Workerデプロイ
npx wrangler deploy workers/auth.ts --name npmtrends-auth
```

## 📁 プロジェクト構造

```
├── frontend/               # React フロントエンド
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── types.ts        # TypeScript型定義
│   │   └── ...
│   └── index.html
├── functions/              # Pages Functions (API)
│   ├── api/
│   │   ├── presets.ts      # プリセットCRUD
│   │   ├── presets/[slug]/like.ts  # いいね機能
│   │   ├── me.ts           # ユーザー情報
│   │   └── verify-turnstile.ts     # Turnstile検証
│   └── _middleware.ts      # 認証ミドルウェア
├── workers/                # 独立Workers
│   └── auth.ts             # GitHub OAuth
├── schema.sql              # D1スキーマ
├── wrangler.toml           # Cloudflare設定
├── package.json
└── README.md
```

## 🔧 設定

### wrangler.toml 設定例

```toml
name = "npmtrends-presets"
compatibility_date = "2025-08-01"

[[d1_databases]]
binding = "DB"
database_name = "npmtrends_presets"
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