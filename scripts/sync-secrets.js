#!/usr/bin/env node

/**
 * Secrets Synchronization Script
 * .envファイルをシングルソースとしてCloudflareなど各プラットフォームのsecretsを同期
 */

import fs from 'fs';
import { execSync } from 'child_process';

const CONFIG = {
	envFiles: {
		local: '.env.local',
		prod: '.env.prod',
	},
	platforms: {
		cloudflare: {
			secretKeys: [
				'GITHUB_CLIENT_SECRET',
				'TURNSTILE_SECRET_KEY',
				'SESSION_SECRET',
			],
			publicKeys: ['GITHUB_CLIENT_ID', 'TURNSTILE_SITE_KEY'],
		},
	},
};

function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`❌ Environment file not found: ${filePath}`);
		process.exit(1);
	}

	const envContent = fs.readFileSync(filePath, 'utf8');
	const envVars = {};

	envContent.split('\n').forEach((line) => {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#')) {
			const [key, ...valueParts] = trimmed.split('=');
			if (key && valueParts.length > 0) {
				envVars[key.trim()] = valueParts.join('=').trim();
			}
		}
	});

	return envVars;
}

function syncCloudflareSecrets(envVars) {
	console.log('🔄 Cloudflareのsecretsを同期中...');

	const { secretKeys, publicKeys } = CONFIG.platforms.cloudflare;

	// Secretsの設定
	secretKeys.forEach((key) => {
		if (envVars[key]) {
			try {
				console.log(`  🔐 Setting secret: ${key}`);
				execSync(
					`echo "${envVars[key]}" | wrangler secret put ${key}`,
					{
						stdio: ['pipe', 'inherit', 'inherit'],
					}
				);
				console.log(`  ✅ ${key} set successfully`);
			} catch (error) {
				console.error(`  ❌ Failed to set ${key}:`, error.message);
				process.exit(1);
			}
		} else {
			console.warn(`  ⚠️  Warning: ${key} not found in environment file`);
		}
	});

	// Public variablesの確認
	console.log('\n📋 Public variables (update wrangler.toml manually):');
	publicKeys.forEach((key) => {
		if (envVars[key]) {
			console.log(`  ${key} = "${envVars[key]}"`);
		} else {
			console.warn(`  ⚠️  Warning: ${key} not found in environment file`);
		}
	});
}

function validateEnvironment(envVars) {
	const required = [
		'GITHUB_CLIENT_ID',
		'GITHUB_CLIENT_SECRET',
		'TURNSTILE_SITE_KEY',
		'TURNSTILE_SECRET_KEY',
		'SESSION_SECRET',
	];

	const missing = required.filter((key) => !envVars[key]);

	if (missing.length > 0) {
		console.error('❌ Missing required environment variables:');
		missing.forEach((key) => console.error(`  - ${key}`));
		process.exit(1);
	}

	console.log('✅ All required environment variables present');
}

function main() {
	const args = process.argv.slice(2);
	const environment = args[0] || 'local';

	if (!CONFIG.envFiles[environment]) {
		console.error(
			'❌ Invalid environment. Available:',
			Object.keys(CONFIG.envFiles).join(', ')
		);
		process.exit(1);
	}

	const envFile = CONFIG.envFiles[environment];

	console.log(`🔑 Secrets Sync - Environment: ${environment}`);
	console.log(`📄 Loading: ${envFile}`);
	console.log('=====================================\n');

	// 環境変数を読み込み
	const envVars = loadEnvFile(envFile);

	// バリデーション
	validateEnvironment(envVars);

	// Cloudflareに同期
	syncCloudflareSecrets(envVars);

	console.log('\n🎉 Secrets synchronization completed!');
	console.log('\n📋 Next steps:');
	console.log('1. Update wrangler.toml with public variables shown above');
	console.log('2. Run: npm run wrangler:deploy');
	console.log('3. Test your deployed application');
}

// 実行チェック
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { loadEnvFile, syncCloudflareSecrets, validateEnvironment };
