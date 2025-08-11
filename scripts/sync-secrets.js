#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

export function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`❌ Environment file not found: ${filePath}`);
		return null;
	}

	const envContent = fs.readFileSync(filePath, 'utf8');
	const envVars = {};

	envContent.split('\n').forEach((line) => {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#')) {
			const [key, ...valueParts] = trimmed.split('=');
			const value = valueParts.join('=').trim();

			if (key && value) {
				// Remove surrounding quotes if they exist
				if (value.startsWith('"') && value.endsWith('"')) {
					envVars[key.trim()] = value.slice(1, -1);
				} else if (value.startsWith("'") && value.endsWith("'")) {
					envVars[key.trim()] = value.slice(1, -1);
				} else {
					envVars[key.trim()] = value;
				}
			}
		}
	});

	return envVars;
}

function main() {
	const env = process.argv[2] || 'local';
	const envFileName = env === 'prod' ? '.env.prod' : '.env.local';
	const envPath = path.resolve(process.cwd(), envFileName);

	console.log(`🔑 Secrets Sync - Environment: ${env}`);
	console.log(`📄 Loading all variables from: ${envPath}`);
	console.log('=====================================\n');

	const envVars = loadEnvFile(envPath);

	if (!envVars || Object.keys(envVars).length === 0) {
		console.log('No variables found in .env file to sync.');
		return;
	}

	console.log(
		'🔄 Synchronizing all found variables to Cloudflare Secrets...'
	);

	for (const key in envVars) {
		const value = envVars[key];
		console.log(`  🔐 Syncing secret: ${key}`);
		try {
			const command = `npx wrangler secret put ${key} ${
				env === 'prod' ? '' : '--env development'
			}`;
			execSync(command, {
				input: value,
				stdio: ['pipe', 'inherit', 'inherit'],
			});
			console.log(`  ✅ ${key} synced successfully`);
		} catch (error) {
			console.error(`  ❌ Failed to sync ${key}:`, error.message);
			// Don't exit on first error, try to sync others
		}
	}

	console.log('\n🎉 All variables from .env file have been processed.');
}

main();
