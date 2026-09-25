# Cloudflare Deployment Guide for Gorib.lol

This application is configured for deployment to **Cloudflare Workers** using `@opennextjs/cloudflare` and `wrangler`.

---

## 1. Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Log in to your Cloudflare account with the Wrangler CLI:
   ```bash
   pnpm wrangler login
   ```
   Verify authentication:
   ```bash
   pnpm wrangler whoami
   ```

---

## 2. Configuration Files

- **[`wrangler.jsonc`](file:///g:/Main2/gorib-site/wrangler.jsonc)**: Declares the Worker entrypoint (`custom-worker.mjs`, which wraps the generated `.open-next/worker.js` and exports the `PresenceCounter` Durable Object behind the live viewer count), static assets directory (`.open-next/assets`), `nodejs_compat` flag, and environment variables.
- **[`open-next.config.ts`](file:///g:/Main2/gorib-site/open-next.config.ts)**: Configures the OpenNext adapter for Cloudflare Workers.
- **[`next.config.ts`](file:///g:/Main2/gorib-site/next.config.ts)**: Configured with `images.unoptimized: true` to bypass native C++ binary dependencies (`sharp`) in the V8 worker environment.
- **[`.dev.vars.example`](file:///g:/Main2/gorib-site/.dev.vars.example)**: Template for local secrets during `wrangler dev`.

---

## 3. Configure Secrets on Cloudflare

Set your production secrets directly on Cloudflare Workers using Wrangler:

```bash
# Set your TMDB API key
pnpm wrangler secret put TMDB_API_KEY

# (Optional) If using custom streaming providers:
pnpm wrangler secret put STREAMING_API_KEY
```

For local testing with `pnpm preview` or `pnpm wrangler dev`, copy `.dev.vars.example` to `.dev.vars`:
```bash
cp .dev.vars.example .dev.vars
```

---

## 4. Build & Local Preview

To build and preview the Worker locally:

```bash
# 1. Build the Next.js app and OpenNext bundle for Cloudflare
pnpm build:worker

# 2. Preview locally using Wrangler / Miniflare
pnpm preview
```

---

## 5. Deploy to Production

Deploy with a single command:

```bash
pnpm deploy
```
*(This command automatically builds the OpenNext bundle and runs `wrangler deploy`)*.

---

## 6. Custom Domain Setup

Once deployed to your `*.workers.dev` subdomain:
1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > **gorib-site** > **Settings** > **Domains & Routes**.
3. Click **Add** > **Custom Domain** and attach your apex domain or subdomain (e.g., `gorib.lol` or `watch.gorib.lol`).

---

## 7. GitHub Actions CI/CD

Every push to `main` is deployed automatically by
[`.github/workflows/deploy.yml`](file:///g:/Main2/gorib-site/.github/workflows/deploy.yml).
The workflow installs with the committed `pnpm-lock.yaml`, runs the Vitest
suite, builds the OpenNext bundle, and uploads it with `wrangler deploy`.
It can also be triggered by hand from the **Actions** tab (`workflow_dispatch`).

### Required repository secrets

Add these under **Settings** > **Secrets and variables** > **Actions**:

| Secret | Required | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Yes | Authenticates `wrangler deploy`. Use the **Edit Cloudflare Workers** template, or a custom token with the *Workers Scripts: Edit* permission. |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Target account. Found on the Cloudflare dashboard sidebar or via `pnpm wrangler whoami`. |
| `TMDB_API_KEY` | Recommended | The home page is prerendered (`revalidate = 3600`), so it fetches TMDB during the build. Without this secret the build bakes in mock data until the first runtime revalidation. |

Build-time settings that are **not** secret (`NEXT_PUBLIC_SITE_URL`,
`STREAMING_PROVIDER`, and friends) are declared in the workflow's `env:` block.
They have to live there as well as in `wrangler.jsonc`: `NEXT_PUBLIC_*` values
are inlined into the bundle when it is built, while `wrangler.jsonc` `vars` are
only injected into the Worker at runtime. Keep the two lists in sync.

> **Do not use `pnpm deploy` in CI.** `deploy` is a built-in pnpm command for
> workspace packages, so it never runs the `deploy` script in `package.json` —
> it just fails with `ERR_PNPM_CANNOT_DEPLOY`. Use `pnpm run deploy:cf`, or the
> split `pnpm run build:worker` + `pnpm exec wrangler deploy` steps the
> workflow uses.
