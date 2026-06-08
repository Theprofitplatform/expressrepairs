# expressrepairs.com.au

Landing site for **expressrepairs.com.au**, hosted on **Cloudflare** (DNS + proxy + serving).

This repo was **reconstructed from the live site** on 2026-06-09 — the original source
wasn't on this machine. It is a faithful mirror of what's currently served, wired for
versioned deploys via Wrangler.

## What it is

A **no-build static SPA**:

- `public/index.html` loads React 18 (UMD) + Babel Standalone from `unpkg.com`
- Six JSX files transformed **in the browser** (no bundler, no build step):
  `data → icons → booking → sections → sections2 → app`
- `public/styles.css` — all styling (~42 KB)
- `public/robots.txt` — real file served at the root
- `public/_redirects` — `/* /index.html 200` SPA fallback (reproduces the live
  catch-all where every unknown path returns the app)

> Note: the live site loads React/Babel **development** builds and transpiles JSX
> on every page load in the browser. That's fine for a small landing page but slow.
> A future improvement is a real build step (Vite) — see below. Left as-is for now
> to stay faithful to production.

## Deploy (first time)

You need the Cloudflare account that owns the domain.

```bash
# 1. Authenticate (opens a browser)
npx wrangler login
npx wrangler whoami

# 2. Find the EXISTING project name that serves the domain.
#    DO NOT skip this — deploying with the wrong name creates a duplicate
#    Pages project that is NOT attached to expressrepairs.com.au.
npx wrangler pages project list

# 3. Set `name` in wrangler.toml to that exact project name, then:
npm run deploy        # = wrangler pages deploy public
```

If `pages project list` is empty, the site is served by a **Worker**, not Pages —
stop and check `npx wrangler deployments list`; the deploy path is different
(`wrangler deploy` against the Worker, with these files as static assets).

## Edit → ship workflow

```bash
npm run dev           # local preview at http://localhost:8788
# edit files in public/ ...
git add -p && git commit -m "..."
npm run deploy
```

## Local preview without Wrangler

Any static server works, e.g.:

```bash
npx serve public      # or: python3 -m http.server -d public 8000
```

## Possible future improvement: real build

Move JSX to a Vite app so React/Babel aren't shipped to the browser:
smaller payload, faster first paint, type-checking. Non-trivial refactor — only
worth it if the site grows beyond a landing page.
