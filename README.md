# Offer Check

© 2026 Offer Check. All rights reserved.

A simple web app that helps job seekers:

1. Work out the questions and data points they need to clarify with a recruiter.
2. Capture the recruiter's answers.
3. Compare the full offer (base, pension, bonus, benefits, holiday, commute) against their current package, with clear decision lines: **walk away**, **break-even**, **consider** and **strong yes**.

It's a single static HTML file with no build step and no backend. Each user's figures and notes are saved only in their own browser (`localStorage`).

**Copy link** puts the figures and settings (not the recruiter notes) in the link after `#s=`, which browsers never send to the server. Opening a link keeps the visitor's own saved figures aside under `offer-check-v1-before-link`, with a *Restore my figures* button.

## Run it

Open `public/index.html` in a browser. That's it.

To host it, any static host works: GitHub Pages, Cloudflare Pages, Netlify or Vercel.

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / root.

## How the maths works

- **Total value** = base + employer pension (core + match) + bonus × reliability + allowances + private medical. Your own pension contribution is part of base, so it isn't added twice.
- **Bonus reliability** lets users discount a target bonus they can't count on (all, half or none).
- The **offer** also gains or loses the value of any holiday difference and any change in commute cost. Holiday is compared in weeks off (days ÷ working days a week) at the offer's weekly pay, so 20 days on a four-day week equals 25 on five.
- **Commute time** gets a cash value only if the user sets what an hour is worth (hours saved × 46 weeks × £/hr).
- **Hourly rate, all in** = each side's own package after tax, less its commute cost, ÷ (contracted + commute hours) × weeks worked (52 less holiday and 8 bank holidays, in weeks of that side's pattern).
- **One-off payments** (bonus given up by leaving; sign-on or buy-out) are taxed as pay in year one and shown as a separate *Year one* line. They never move the verdict.
- **Full-time equivalent** salary shows when either side isn't a five-day week. The verdict still compares actual pay; the hourly rate shows what the time is worth.
- **Decision lines:** break-even = today's total; consider and strong yes = today's total plus a user-set uplift (default 10% and 20%).
- **Base needed** solves for the offer base that hits each line, given the offer's pension, bonus and other terms.

- **After tax (default view):** salary, counted bonus, allowances and holiday value lose 2026/27 income tax (England/Wales/NI or Scottish bands, with the £100k personal allowance taper), employee NI and any student loan (Plans 1, 2, 4, 5 and postgraduate). Medical loses income tax as a benefit in kind. Employer pension and commute savings count in full. "Base needed" is solved numerically, by bisection. A **Before tax** toggle shows the original gross comparison.
- **Your pension:** your own % gets income tax relief; with salary sacrifice it also cuts NI and student loan, and the employer can pass on its 15% NI saving. Employer match = core % + your % up to the match cap. The % applies to full salary or qualifying earnings (£6,240–£50,270). From April 2029 only £2,000 a year of sacrificed pension avoids NI; the app shows the extra NI as a note, not in the figures.
- **Monthly take-home:** regular pay (base + allowances) after tax, NI, student loan and your pension, before bonus and holiday value.
- **Threshold traps:** worked out on adjusted net income (pay + medical − your pension). Flags the £100,000–£125,140 60% band, asks about Child Benefit above £60,000 (and includes the High Income Child Benefit Charge in the figures), and about childcare above £100,000 (flagged, not priced).
- **Not modelled:** other income, tax codes, bonus sacrifice, and tax on pension withdrawals. Results are illustrative, not advice.
- **Update each April:** every rate and threshold is in `RATES` in `public/assets/calc.js`. Then bump `?v=` on `calc.js` in `index.html` and `CACHE` in `sw.js`, and run the tests.

## Tests

`node --test` runs `test/calc.test.js` (Node 18+, no install needed). It checks each acceptance criterion in the P0 spec and that figures saved before the pension and student loan fields existed still give the same answers.


## Project structure

```
public/                The deployed site
  index.html           The whole app: markup, styles and script
  assets/calc.js       The calculation engine and all tax rates (also loaded by the tests)
  guide.html           How-to guide with the embedded walkthrough video
  terms.html           Terms of use
  privacy.html         Privacy notice
  404.html             Not-found page
  assets/              Shared styles (site.css: bump ?v= in each page when it changes), fonts, icons, share image, walkthrough video
  _headers             Browser caching rules (fonts 1 year, other assets 1 day; pages always fresh)
src/index.js           Worker: serves the site, anonymous usage counter (/api/e, /api/stats)
wrangler.jsonc         Cloudflare Workers config
test/calc.test.js      Unit tests for the calculation engine
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
  - `POST /api/e` with one of `compare`, `copy`, `installed`, `app_launch`, `video_play`, `link_copy`, `link_open` adds 1 to today's count (a SQLite-backed Durable Object). It stores only the event name and date: no cookies, IDs, IP addresses or figures.
  - `GET /api/stats?key=…` shows the totals and the last 30 days (`&format=json` for raw data). It returns 404 unless the `STATS_KEY` secret is set and matches.
- The stats key is checked against `STATS_KEY_HASH` (a SHA-256 fingerprint) in `wrangler.jsonc`, so it survives every deploy and the key never sits in this public repo. To change the key, put the SHA-256 of the new key there (`printf '%s' 'new-key' | sha256sum`).
- `public/manifest.webmanifest` and `public/sw.js` make the site installable (Install app button on Chrome/Edge/Android; Add to Home Screen on iPhone) and usable offline. Bump `CACHE` in `sw.js` when core files change.
- Local test: put `STATS_KEY="something"` in `.dev.vars`, then `npx wrangler dev`.
