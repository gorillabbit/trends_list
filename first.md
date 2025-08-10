いいね、Cloudflare 一本でいきましょ。\*\*Pages（フロント）＋ Pages Functions/Workers（API）＋ D1（DB）\*\*に、必要なら **Turnstile** と **KV キャッシュ**を足す構成です。まず全体像 → 最小実装スケルトン → デプロイ手順の順で。

# 全体アーキテクチャ

-   **UI**：Cloudflare Pages（任意のフレームワーク/静的）

    -   クリックで **npmtrends の比較 URL**へ遷移（iframe は使わないのが無難）。
    -   Pages から **Pages Functions** でサーバサイド処理が可能（Workers ランタイム）。 ([Cloudflare Docs][1])

-   **API**：Pages Functions（または独立 Workers）

    -   ルート例：`/api/presets`（CRUD）, `/api/presets/:slug/like`（いいね）, `/api/me`（認証状態）。
    -   **Turnstile** でスパム防止（トークンは **Siteverify** で必ず検証）。 ([Cloudflare Docs][2])

-   **DB**：Cloudflare **D1**（SQLite）

    -   小規模〜中規模に最適。プライシング/上限は公式のとおり（無料枠は日次リセット、ストレージ/クエリ制限あり）。 ([Cloudflare Docs][3])

-   **キャッシュ**：Workers **KV**（人気プリセットの一覧など）

    -   Free でも日次リセットの上限あり。超過時は失敗になる点に注意。 ([Cloudflare Docs][4], [The Cloudflare Blog][5])

-   **認証**：**GitHub OAuth**（Workers で実装が簡単）

    -   実装例・手順が豊富。小規模サイトと相性 ◎。 ([TIL][6], [GitHub][7], [Cloudflare Workers][8])

---

# データ設計（最小）

```sql
-- schema.sql（D1）
CREATE TABLE users (
  id TEXT PRIMARY KEY,        -- "github:<user_id>" など
  name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE presets (
  id TEXT PRIMARY KEY,        -- slug（URL用） or uuid
  title TEXT NOT NULL,
  packages TEXT NOT NULL,     -- JSON文字列 ["react","vue",...]
  npmtrends_url TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  likes_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE likes (
  user_id TEXT NOT NULL REFERENCES users(id),
  preset_id TEXT NOT NULL REFERENCES presets(id),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, preset_id)
);
CREATE INDEX idx_presets_likes ON presets(likes_count DESC, created_at DESC);
```

---

# ルーティング方針

-   `GET /api/presets?sort=likes|new&page=1` — KV キャッシュ →D1 フォールバック
-   `POST /api/presets` — 認証必須。`title`,`packages[]` から `npmtrends_url` を生成
-   `POST /api/presets/:slug/like` — 認証必須。likes のトグル＋`likes_count` 更新（D1 トランザクション）
-   `GET /api/me` — セッション/JWT 検証後、ユーザー Info 返却
-   `POST /api/verify-turnstile` — Turnstile Siteverify でトークン検証（重要） ([Cloudflare Docs][9])

---

# リポジトリ構成（例）

```
/
├─ frontend/                # 任意のUI（React/Vue/HTMXでも）
│  ├─ dist/                 # ビルド成果物（Pagesにデプロイ）
│  └─ src/...
├─ functions/               # Pages Functions (APIルート)
│  ├─ api/
│  │  ├─ presets.ts
│  │  ├─ presets/[slug]/like.ts
│  │  ├─ me.ts
│  │  └─ verify-turnstile.ts
│  └─ _middleware.ts        # 認証/セッション注入など
├─ workers/                 # （独立Workerを使う場合のみ）
│  └─ auth.ts               # GitHub OAuth コールバック等
├─ schema.sql               # D1 初期スキーマ
├─ wrangler.toml
└─ package.json
```

> Pages Functions で完結させても OK。別 Worker を切る場合は `/auth/*` を Workers、他は Pages Functions にする構成が分かりやすい。([Cloudflare Docs][10])

---

# wrangler.toml（最小例）

```toml
name = "npmtrends-presets"
compatibility_date = "2025-08-01"

# Pages Functions用
main = "functions/[[path]].ts"

# D1 バインド
[[d1_databases]]
binding = "DB"
database_name = "npmtrends_presets"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# KV（任意：ランキングキャッシュ）
[[kv_namespaces]]
binding = "KV"
id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"

# Turnstile（Site Key / Secret）
[vars]
TURNSTILE_SITE_KEY = "your_site_key"

# シークレットに入れる（wrangler secret put TURNSTILE_SECRET_KEY）
# TURNSTILE_SECRET_KEY

# GitHub OAuth（独立Workerを使うなら workers/auth で別tomlでも可）
[vars]
GITHUB_CLIENT_ID = "xxx"
# GITHUB_CLIENT_SECRET は secret に格納
SESSION_SECRET = "random-long-secret"

# Pages: プロジェクト設定は Cloudflare ダッシュボード または wrangler pages で
```

-   Pages/Workers の実行・サイズなど各種リミットは公式の **Limits** を参照。 ([Cloudflare Docs][11])

---

# コア実装スニペット

## 1) npmtrends URL 生成（functions/api/presets.ts）

```ts
import { Hono } from 'hono';

export const onRequestPost: PagesFunction<{
	DB: D1Database;
	KV: KVNamespace;
}> = async (ctx) => {
	const req = await ctx.request.json();
	const user = await requireUser(ctx); // _middleware.ts で復元
	const { title, packages } = req as { title: string; packages: string[] };

	// バリデーション
	if (!title || !Array.isArray(packages) || packages.length < 2) {
		return new Response(JSON.stringify({ error: 'invalid input' }), {
			status: 400,
		});
	}

	// slug（英数字とハイフン）
	const slug = slugify(title);

	// npmtrendsの比較URL（小文字・重複除去）
	const pkgs = [...new Set(packages.map((p) => p.trim().toLowerCase()))];
	const npmtrendsUrl = `https://npmtrends.com/${pkgs.join('-vs-')}`;

	// D1 トランザクション
	const stmt = `
    INSERT INTO presets (id, title, packages, npmtrends_url, owner_id)
    VALUES (?, ?, ?, ?, ?)
  `;
	await ctx.env.DB.prepare(stmt)
		.bind(slug, title, JSON.stringify(pkgs), npmtrendsUrl, user.id)
		.run();

	// 一覧キャッシュを軽く無効化
	await ctx.env.KV.delete('presets:list:likes');

	return Response.json({ id: slug, npmtrends_url: npmtrendsUrl });
};
```

> Pages Functions は Workers ランタイムで動作します。 ([Cloudflare Docs][10])

## 2) いいね・トグル（functions/api/presets/\[slug]/like.ts）

```ts
export const onRequestPost: PagesFunction<{
	DB: D1Database;
	KV: KVNamespace;
}> = async (ctx) => {
	const user = await requireUser(ctx);
	const { slug } = ctx.params as { slug: string };

	const db = ctx.env.DB;
	// 既存確認
	const liked = await db
		.prepare('SELECT 1 FROM likes WHERE user_id=? AND preset_id=?')
		.bind(user.id, slug)
		.first();

	if (liked) {
		await db.batch([
			db
				.prepare('DELETE FROM likes WHERE user_id=? AND preset_id=?')
				.bind(user.id, slug),
			db
				.prepare(
					'UPDATE presets SET likes_count = likes_count - 1 WHERE id=?'
				)
				.bind(slug),
		]);
		await ctx.env.KV.delete('presets:list:likes');
		return Response.json({ liked: false });
	} else {
		await db.batch([
			db
				.prepare('INSERT INTO likes (user_id, preset_id) VALUES (?, ?)')
				.bind(user.id, slug),
			db
				.prepare(
					'UPDATE presets SET likes_count = likes_count + 1 WHERE id=?'
				)
				.bind(slug),
		]);
		await ctx.env.KV.delete('presets:list:likes');
		return Response.json({ liked: true });
	}
};
```

## 3) ランキング取得（KV → D1 フォールバック）

```ts
export const onRequestGet: PagesFunction<{
	DB: D1Database;
	KV: KVNamespace;
}> = async (ctx) => {
	const cacheKey = 'presets:list:likes';
	const cached = await ctx.env.KV.get(cacheKey);
	if (cached)
		return new Response(cached, {
			headers: { 'Content-Type': 'application/json' },
		});

	const rows = await ctx.env.DB.prepare(
		'SELECT id, title, npmtrends_url, likes_count FROM presets ORDER BY likes_count DESC, created_at DESC LIMIT 50'
	).all();

	const body = JSON.stringify(rows.results ?? []);
	await ctx.env.KV.put(cacheKey, body, { expirationTtl: 300 });
	return new Response(body, {
		headers: { 'Content-Type': 'application/json' },
	});
};
```

> KV は Free でも日次上限あり。人気一覧の短期キャッシュに最適。 ([Cloudflare Docs][4], [The Cloudflare Blog][5])

## 4) Turnstile 検証（functions/api/verify-turnstile.ts）

```ts
export const onRequestPost: PagesFunction = async (ctx) => {
	const { token } = await ctx.request.json();
	const secret = ctx.env.TURNSTILE_SECRET_KEY as string;

	// Siteverify: 必須
	// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
	const resp = await fetch(
		'https://challenges.cloudflare.com/turnstile/v0/siteverify',
		{
			method: 'POST',
			body: new URLSearchParams({ secret, response: token }),
		}
	);
	const data = await resp.json();
	return Response.json(data, { status: data.success ? 200 : 400 });
};
```

> Turnstile は **Siteverify** を必ず行う（トークンは一度しか使えません）。 ([Cloudflare Docs][9])

## 5) GitHub OAuth（独立 Worker / workers/auth.ts 例）

-   流れ：
    `/auth/login` → GitHub 同意 → `/auth/callback?code=...` → Worker で GitHub に `code` を交換 → 自前 JWT を発行して `Set-Cookie`。
-   実装例・手順： ([TIL][6], [GitHub][12])

```ts
export default {
	async fetch(req: Request, env: Env) {
		const url = new URL(req.url);
		if (url.pathname === '/auth/login') {
			const redirect = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=read:user`;
			return Response.redirect(redirect, 302);
		}
		if (url.pathname === '/auth/callback') {
			const code = url.searchParams.get('code');
			const tokenRes = await fetch(
				'https://github.com/login/oauth/access_token',
				{
					method: 'POST',
					headers: { Accept: 'application/json' },
					body: new URLSearchParams({
						client_id: env.GITHUB_CLIENT_ID,
						client_secret: env.GITHUB_CLIENT_SECRET,
						code: code ?? '',
					}),
				}
			);
			const tokenJson = await tokenRes.json();
			const userRes = await fetch('https://api.github.com/user', {
				headers: { Authorization: `Bearer ${tokenJson.access_token}` },
			});
			const gh = await userRes.json();

			// users upsert（D1）
			await env.DB.prepare(
				`
        INSERT INTO users (id, name, avatar_url) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatar_url=excluded.avatar_url
      `
			)
				.bind(
					`github:${gh.id}`,
					gh.name ?? gh.login,
					gh.avatar_url ?? ''
				)
				.run();

			const jwt = await signJwt(
				{ sub: `github:${gh.id}` },
				env.SESSION_SECRET
			);
			return new Response(null, {
				status: 302,
				headers: {
					'Set-Cookie': `session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
					Location: '/',
				},
			});
		}
		return new Response('Not found', { status: 404 });
	},
};
```

> GitHub OAuth を Workers でやる手順/サンプルは多数あります（上記は要点だけ）。 ([TIL][6], [Cloudflare Workers][8])

---

# デプロイ手順（ざっくり）

1. **D1 作成 & スキーマ流し込み**

```bash
wrangler d1 create npmtrends_presets
wrangler d1 execute npmtrends_presets --file=./schema.sql
```

（D1 の上限/価格/リリースノートは公式参照）([Cloudflare Docs][3])

2. **Pages プロジェクト作成**

-   GitHub 連携 or `wrangler pages project create` → ビルドコマンド/出力ディレクトリを設定。
-   API は `functions/` 配下で自動公開（Pages Functions）。 ([Cloudflare Docs][1])

3. **環境変数/シークレット**

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put GITHUB_CLIENT_SECRET
wrangler kv:namespace create KV
wrangler secret put SESSION_SECRET
```

（KV や Workers の無料枠は日次リセット）([Cloudflare Docs][4])

4. **Turnstile を UI に組み込み**

-   クライアント側でウィジェットを読み込み、成功時の `token` を `/api/verify-turnstile` に送る。
-   Pages Functions でも **Turnstile plugin** が利用可能。 ([Cloudflare Docs][2])

5. **デプロイ**

```bash
wrangler pages deploy ./frontend/dist
# or: wrangler pages deploy --project=<name> .
```

---

# 運用メモ

-   **KV キャッシュ**は 5〜10 分 TTL で十分。上限超過で失敗する前にモニタリング。 ([Cloudflare Docs][4])
-   **D1**：読み/書きの比率が高い API はまとめて `batch`、適切に **インデックス**。 （D1 の「Use indexes」参照）([Cloudflare Docs][13])
-   **セッション**：`HttpOnly + Secure + SameSite=Lax`、JWT の exp を短めに。
-   **レート制限**：Turnstile と合わせて簡易レート制限（IP + セッションで KV カウンタ）。
-   **Pages or Workers?** 新規は Workers 推奨という記述もあるが、今回は Pages Functions で十分。必要になったら独立 Worker に切り出し可能。 ([Cloudflare Docs][14])

---

このスケルトンで「プリセット作成・一覧・いいね・GitHub ログイン・Turnstile」まで最小構成が動きます。
必要なら、**実プロジェクト名＆フレームワーク（React/HTMX など）を教えてくれたら、即ビルドできる雛形**（UI 込み）を作って渡します。

[1]: https://developers.cloudflare.com/pages/?utm_source=chatgpt.com 'Overview · Cloudflare Pages docs'
[2]: https://developers.cloudflare.com/turnstile/get-started/?utm_source=chatgpt.com 'Get started with Turnstile'
[3]: https://developers.cloudflare.com/d1/platform/pricing/?utm_source=chatgpt.com 'Pricing - D1'
[4]: https://developers.cloudflare.com/kv/platform/pricing/?utm_source=chatgpt.com 'Pricing · Cloudflare Workers KV docs'
[5]: https://blog.cloudflare.com/workers-kv-free-tier/?utm_source=chatgpt.com 'Workers KV - free to try, with increased limits!'
[6]: https://til.simonwillison.net/cloudflare/workers-github-oauth?utm_source=chatgpt.com 'GitHub OAuth for a static site using Cloudflare Workers'
[7]: https://github.com/simonw/til/blob/main/cloudflare/workers-github-oauth.md?utm_source=chatgpt.com 'til/cloudflare/workers-github-oauth.md at main · simonw/til'
[8]: https://workers.cloudflare.com/built-with/projects/github-oauth-login?utm_source=chatgpt.com 'GitHub OAuth Login'
[9]: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/?utm_source=chatgpt.com 'Server-side validation - Turnstile'
[10]: https://developers.cloudflare.com/pages/functions/?utm_source=chatgpt.com 'Functions · Cloudflare Pages docs'
[11]: https://developers.cloudflare.com/workers/platform/limits/?utm_source=chatgpt.com 'Limits · Cloudflare Workers docs'
[12]: https://github.com/gr2m/cloudflare-worker-github-oauth-login?utm_source=chatgpt.com "Use a Cloudflare worker for GitHub's OAuth login flow"
[13]: https://developers.cloudflare.com/d1/platform/limits/?utm_source=chatgpt.com 'Limits - D1 - Cloudflare Docs'
[14]: https://developers.cloudflare.com/pages/framework-guides/?utm_source=chatgpt.com 'Framework guides · Cloudflare Pages docs'
