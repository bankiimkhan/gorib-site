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

- **[`wrangler.jsonc`](file:///g:/Main2/gorib-site/wrangler.jsonc)**: Declares the Worker entrypoint (`.open-next/worker.js`), static assets directory (`.open-next/assets`), `nodejs_compat` flag, and environment variables.
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

## 7. GitHub Actions CI/CD (Optional)

To automatically deploy upon pushing to `main`, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Deploy to Cloudflare Workers
        run: pnpm deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

