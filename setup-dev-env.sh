#!/bin/bash

# ローカル開発環境のセットアップ

ENV_FILE=".env.local"

echo "ローカル開発環境をセットアップします..."

# セッションキーを生成
session_secret=$(openssl rand -hex 32)
echo "セッションキー生成: $session_secret"

# .env.localファイルを作成

cat > $ENV_FILE << EOF
# NPM Trends Presets - ローカル開発環境
# 生成日時: $(date)

# セッション暗号化キー（自動生成）
SESSION_SECRET=$session_secret

# GitHub OAuth設定
# https://github.com/settings/developers でOAuthアプリを作成
# コールバック URL: http://localhost:8787/auth/callback
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Turnstile設定（開発・テスト用キー）
# https://dash.cloudflare.com → Turnstile で取得
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000000000
EOF

echo "$ENV_FILE を作成しました"
echo ""
echo "次のステップ:"
echo ""
echo "1. GitHub OAuth設定:"
echo "   https://github.com/settings/developers"
echo "   新規OAuthアプリを作成"
echo "   ホームページ: http://localhost:3000"
echo "   コールバック: http://localhost:8787/auth/callback"
echo "   Client IDとSecretを $ENV_FILE に設定"
echo ""
echo "2. Turnstile設定（任意）:"
echo "   https://dash.cloudflare.com → Turnstile"
echo "   localhost用のサイトを追加"
echo "   または開発用のテストキーをそのまま使用"
echo ""
echo "3. 開発サーバー起動:"
echo "   npm run dev:full"
echo ""
echo "4. アクセス先:"
echo "   フロントエンド: http://localhost:3000"
echo "   API: http://localhost:8787"