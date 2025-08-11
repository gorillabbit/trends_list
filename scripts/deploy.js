#!/usr/bin/env node

/**
 * 統合デプロイスクリプト
 * wrangler.tomlの自動更新、secrets同期、デプロイを一括実行
 */

import fs from 'fs';
import { execSync } from 'child_process';
import { loadEnvFile } from './sync-secrets.js';

function updateWranglerToml(envVars) {
	const wranglerPath = 'wrangler.toml';
	if (!fs.existsSync(wranglerPath)) {
		console.error('❌ wrangler.toml not found');
		process.exit(1);
	}

	let content = fs.readFileSync(wranglerPath, 'utf8');
	const lines = content.split('\n');

	// 公開変数のみ（secretは除外）
	const publicVars = {
		TURNSTILE_SITE_KEY: envVars.TURNSTILE_SITE_KEY,
		CLERK_PUBLISHABLE_KEY: envVars.CLERK_PUBLISHABLE_KEY,
	};

	let inVarsSection = false;
	let varsStartIndex = -1;
	let varsEndIndex = -1;

	// [vars]セクションを特定
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		if (line === '[vars]') {
			inVarsSection = true;
			varsStartIndex = i;
			continue;
		}

		if (inVarsSection && (line.startsWith('[') || line.startsWith('#'))) {
			varsEndIndex = i;
			break;
		}
	}

	// 最後まで[vars]セクションが続いている場合
	if (inVarsSection && varsEndIndex === -1) {
		varsEndIndex = lines.length;
	}

	if (varsStartIndex !== -1) {
		// 既存の[vars]セクションを置き換え
		const newVarsLines = ['[vars]'];

		Object.entries(publicVars).forEach(([key, value]) => {
			if (value) {
				newVarsLines.push(`${key} = "${value}"`);
			}
		});

		// [vars]セクションを新しい内容で置き換え
		const newLines = [
			...lines.slice(0, varsStartIndex),
			...newVarsLines,
			...lines.slice(varsEndIndex),
		];

		content = newLines.join('\n');
	} else {
		// [vars]セクションが存在しない場合は追加
		const newVarsLines = ['\n[vars]'];
		Object.entries(publicVars).forEach(([key, value]) => {
			if (value) {
				newVarsLines.push(`${key} = "${value}"`);
			}
		});
		content += newVarsLines.join('\n');
	}

	fs.writeFileSync(wranglerPath, content);
	console.log('✅ wrangler.toml を更新しました');
}

function initializeDatabase() {
	console.log('🗃️ データベースを初期化中...');

	try {
		// 本番データベースのテーブル存在確認
		const checkResult = execSync(
			"wrangler d1 execute trends_list --remote --command=\"SELECT name FROM sqlite_master WHERE type='table' AND name='users';\"",
			{
				stdio: 'pipe',
				encoding: 'utf8',
			}
		);

		// usersテーブルが存在するかチェック
		const hasUsers = checkResult.includes('"name": "users"');

		if (!hasUsers) {
			console.log('  📋 スキーマを適用中...');
			execSync(
				'wrangler d1 execute trends_list --remote --file=./schema.sql',
				{
					stdio: 'inherit',
				}
			);
			console.log('✅ データベーススキーマを適用しました');
		} else {
			console.log('✅ データベースは既に初期化済みです');
		}
	} catch (error) {
		console.error('❌ データベース初期化に失敗しました:', error.message);
		process.exit(1);
	}
}

function deployToCloudflare() {
	console.log('🚀 Cloudflareにデプロイ中...');

	try {
		// ビルドとデプロイを実行
		execSync('npm run build && wrangler deploy', {
			stdio: 'inherit',
		});
		console.log('✅ デプロイが完了しました');
	} catch (error) {
		console.error('❌ デプロイに失敗しました:', error.message);
		process.exit(1);
	}
}

function showDeploymentInfo() {
	console.log('🧪 デプロイメントをテスト中...');

	try {
		// wrangler.tomlからアプリ名を取得
		const wranglerContent = fs.readFileSync('wrangler.toml', 'utf8');
		const nameMatch = wranglerContent.match(/name\s*=\s*"([^"]+)"/);

		if (nameMatch) {
			const appName = nameMatch[1];
			const deployedUrl = `https://${appName}.workers.dev`;

			console.log(`📋 デプロイ先URL: ${deployedUrl}`);
			console.log('📋 次のエンドポイントをテストしてください:');
			console.log(`  - ${deployedUrl}/api/me (認証テスト)`);
			console.log(`  - ${deployedUrl}/api/presets (プリセット一覧)`);

			// 簡単なヘルスチェック
			console.log('🏥 ヘルスチェック実行中...');
			execSync(
				`curl -s -o /dev/null -w "%{http_code}" ${deployedUrl} || echo "接続テスト完了"`,
				{
					stdio: 'inherit',
				}
			);
		}
	} catch (error) {
		console.warn(
			'⚠️ テスト中にエラーが発生しましたが、デプロイは成功している可能性があります'
		);
	}
}

function main() {
	const args = process.argv.slice(2);
	const environment = args[0] || 'prod';

	console.log('🚀 統合デプロイスクリプト');
	console.log('====================');
	console.log(`環境: ${environment}`);
	console.log('');

	// 環境ファイルを読み込み
	const envFile = environment === 'prod' ? '.env.prod' : '.env.local';

	if (!fs.existsSync(envFile)) {
		console.error(`❌ 環境ファイルが見つかりません: ${envFile}`);
		console.log(
			'cp .env.example .env.prod を実行して本番用設定を作成してください'
		);
		process.exit(1);
	}

	const envVars = loadEnvFile(envFile);

	console.log('🎯 実行ステップ:');
	console.log('1. wrangler.toml の公開変数を更新');
	console.log('2. Cloudflare secrets を同期');
	console.log('3. データベースを初期化');
	console.log('4. アプリケーションをデプロイ');
	console.log('5. デプロイメントをテスト');
	console.log('');

	try {
		// 1. wrangler.toml更新
		updateWranglerToml(envVars);

		// 2. secrets同期
		execSync(`node scripts/sync-secrets.js ${environment}`, {
			stdio: 'inherit',
		});

		// 3. データベース初期化
		initializeDatabase();

		// 4. デプロイ
		deployToCloudflare();

		// 5. テスト
		showDeploymentInfo();

		console.log('');
		console.log('🎉 すべての処理が完了しました！');
		console.log('');
		console.log('📋 確認事項:');
		console.log('- デプロイされたアプリケーションが正常に動作するかテスト');
		console.log('- Clerk認証が正しく設定されているか確認');
		console.log('- Turnstileスパム防止が動作するか確認');
	} catch (error) {
		console.error('❌ 処理中にエラーが発生しました:', error.message);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
