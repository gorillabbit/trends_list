# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-10

### Added
- Initial release of NPM Trends Presets
- React + TypeScript フロントエンド with Vite
- Cloudflare Pages Functions API
- GitHub OAuth 認証システム
- Cloudflare D1 データベース統合
- Cloudflare Workers KV キャッシュ
- Cloudflare Turnstile スパム防止
- プリセット作成・一覧・詳細表示機能
- いいね機能（認証ユーザーのみ）
- レスポンシブ UI デザイン
- ダークテーマ対応
- モックAPIサーバー（ローカル開発用）

### Features
- **プリセット管理**: NPMパッケージの組み合わせを保存・共有
- **認証システム**: GitHub OAuthによるログイン
- **いいね機能**: プリセットに対するいいね・取り消し
- **トレンド表示**: npmtrends.com への直接リンク
- **検索・ソート**: 人気順・新着順での表示
- **スパム防止**: Turnstile統合

### Technical Stack
- **Frontend**: React 18, TypeScript, Vite
- **API**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare Workers KV
- **Auth**: GitHub OAuth via Cloudflare Workers
- **Security**: Cloudflare Turnstile
- **Deployment**: Cloudflare Pages

### Development
- ESLint + TypeScript strict mode
- Vite development server with HMR
- Mock API server for local development
- Concurrent development scripts
- Comprehensive build pipeline

### Documentation
- Complete README with setup instructions
- API documentation in code comments
- TypeScript type definitions
- Deployment guide for Cloudflare

## [Unreleased]

### Planned
- プリセット検索機能
- ユーザープロファイル
- プリセットカテゴリー
- コメント機能
- RSS/Atom フィード
- API レート制限
- パフォーマンス最適化
- PWA対応
- 多言語対応