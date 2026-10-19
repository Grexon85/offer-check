# Offer Check

© 2026 Offer Check. All rights reserved.

A simple web app that helps job seekers:

1. Work out the questions and data points they need to clarify with a recruiter.
2. Capture the recruiter's answers.
3. Compare the full offer (base, pension, bonus, benefits, holiday, commute) against their current package, with clear decision lines: **walk away**, **break-even**, **consider** and **strong yes**.

It's a single static HTML file with no build step and no backend. Each user's figures and notes are saved only in their own browser (`localStorage`).

## Run it

Open `public/index.html` in a browser. That's it.

To host it, any static host works: GitHub Pages, Cloudflare Pages, Netlify or Vercel.

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / root.

## How the maths works

- **Total value** = base + employer pension + bonus × reliability + allowances + private medical.
- **Bonus reliability** lets users discount a target bonus they can't count on (all, half or none).
- The **offer** also gains or loses the value of any holiday difference (a day's pay per day, using 260 working days) and any change in commute cost.
- **Decision lines:** break-even = today's total; consider and strong yes = today's total plus a user-set uplift (default 10% and 20%).
- **Base needed** solves for the offer base that hits each line, given the offer's pension, bonus and other terms.

- **After tax (default view):** salary, counted bonus, allowances and holiday value lose 2026/27 income tax (England/Wales/NI or Scottish bands, with the £100k personal allowance taper) and employee NI. Medical loses income tax as a benefit in kind. Employer pension and commute savings count in full. "Base needed" is solved numerically, by bisection. A **Before tax** toggle shows the original gross comparison.
- **Not modelled:** student loans, employee pension contributions or salary sacrifice, other income, tax codes, and tax on pension withdrawals. Results are illustrative, not advice.
- **Update each April:** the bands and thresholds in `TAX`, `PA`, `NI_PT` and `NI_UEL` in `public/index.html`.

Commute time is shown in hours per year but isn't given a cash value.

## Project structure

```
public/                The deployed site
  index.html           The whole app: markup, styles and script
  guide.html           How-to guide with the embedded walkthrough video
  terms.html           Terms of use
  privacy.html         Privacy notice
  404.html             Not-found page
  assets/              Shared styles (site.css: bump ?v= in each page when it changes), fonts, icons, share image, walkthrough video
  _headers             Browser caching rules (fonts 1 year, other assets 1 day; pages always fresh)
src/index.js           Worker: serves the site, anonymous usage counter (/api/e, /api/stats)
wrangler.jsonc         Cloudflare Workers config
README.md    This file
BACKLOG.md   Ideas and next steps
```

## Licence

Proprietary. Copyright (c) 2026 Offer Check. All rights reserved. See `LICENSE`.

## Deploy (Cloudflare Workers)

The site deploys as a static-assets Worker named `offer-check`, configured in `wrangler.jsonc`. Only the `public/` folder is published.

**One-off deploy from your machine:**

```
npx wrangler login     # first time only
npx wrangler deploy
```

**Automatic deploys (recommended):** in the Cloudflare dashboard, open the `offer-check` Worker → Settings → Builds → Connect to Git, and pick `Grexon85/offer-check`, branch `main`. Set the **deploy command** to `npx wrangler deploy` (not `npx wrangler versions upload`, which uploads a version without sending traffic to it). Every push to `main` then deploys itself.

## Links

Link to clean URLs (`/`, `/guide`, `/terms`, `/privacy`), not `.html` files: Cloudflare redirects `.html` addresses, which costs every visitor an extra round trip.

## Usage counts and the installable app

- `src/index.js` is the Worker. It serves `public/` and handles `/api/*`:
  - `POST /api/e` with one of `compare`, `copy`, `installed`, `app_launch`, `video_play` adds 1 to today's count (a SQLite-backed Durable Object). It stores only the event name and date: no cookies, IDs, IP addresses or figures.
  - `GET /api/stats?key=…` shows the totals and the last 30 days (`&format=json` for raw data). It returns 404 unless the `STATS_KEY` secret is set and matches.
- The stats key is checked against `STATS_KEY_HASH` (a SHA-256 fingerprint) in `wrangler.jsonc`, so it survives every deploy and the key never sits in this public repo. To change the key, put the SHA-256 of the new key there (`printf '%s' 'new-key' | sha256sum`).
- `public/manifest.webmanifest` and `public/sw.js` make the site installable (Install app button on Chrome/Edge/Android; Add to Home Screen on iPhone) and usable offline. Bump `CACHE` in `sw.js` when core files change.
- Local test: put `STATS_KEY="something"` in `.dev.vars`, then `npx wrangler dev`.
