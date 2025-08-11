# Secrets管理システム

このプロジェクトでは、ローカルの`.env`ファイルをシングルソースとしてCloudflare Workersのsecretsを管理します。

## 📁 ファイル構成

```
.env.example         # テンプレートファイル
.env.local          # ローカル開発用
.env.prod           # Cloudflare本番環境用
scripts/
  └── sync-secrets.js    # Cloudflare同期スクリプト
```

## 🚀 使用方法

### 1. 初期設定

```bash
# テンプレートから環境ファイルを作成
cp .env.example .env.local
cp .env.example .env.prod

# 各ファイルに適切な値を設定
```

### 2. Cloudflareに同期

```bash
# ローカル設定を使用（開発時）
npm run sync:secrets

# 本番環境設定を使用
npm run sync:secrets:prod
```

## 🔧 必要なツール

| ツール | 用途 |
|--------|------|
| `wrangler` | Cloudflare Workers の secrets 管理 |

## 🔐 セキュリティ

- すべての`.env.*`ファイルは`.gitignore`で除外
- Cloudflare Workers secrets は暗号化されて安全に保存
- 本番環境とローカル環境の設定を分離

## ⚙️ 環境変数

### 必須項目
- `GITHUB_CLIENT_ID` - GitHub OAuth Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth Client Secret
- `TURNSTILE_SITE_KEY` - Cloudflare Turnstile Site Key
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile Secret Key
- `SESSION_SECRET` - セッション暗号化用の32文字hex

### オプション項目
- `DATABASE_URL` - データベース接続URL
- `REDIS_URL` - Redis接続URL
- `SENTRY_DSN` - エラー追跡用

## 🔄 ワークフロー例

### 基本的なデプロイ
```bash
# 本番用の設定を.env.prodに設定後
npm run deploy:prod
```

### 手動でのステップ実行
```bash
# 1. 本番用の設定を.env.prodに追加
echo "NEW_API_KEY=secret_value" >> .env.prod

# 2. Cloudflareに同期のみ
npm run sync:secrets:prod

# 3. 手動デプロイ
npm run wrangler:deploy
```

### 統合デプロイスクリプトの機能
`npm run deploy:prod` は以下を自動実行します：
1. wrangler.toml の公開変数を自動更新
2. Cloudflare secrets の同期
3. アプリケーションのビルド＆デプロイ
4. デプロイメントのテスト

## 🆘 トラブルシューティング

### `wrangler`がない場合
```bash
npm install -g wrangler
wrangler login
```

### 権限エラー
```bash
# スクリプトファイルに実行権限を付与
chmod +x scripts/*.js
```

### 設定値の確認
```bash
# 現在の設定を表示（secretsは表示されない）
wrangler secret list

# 環境変数のバリデーション
node -e "console.log(require('./scripts/sync-secrets.js').validateEnvironment(require('./scripts/sync-secrets.js').loadEnvFile('.env.prod')))"
```