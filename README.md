# Offer Check

© 2026 Metis Signal Ltd. All rights reserved.

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

Commute time is shown in hours per year but isn't given a cash value.

## Project structure

```
public/                The deployed site
  index.html           The whole app: markup, styles and script
  guide.html           How-to guide with the embedded walkthrough video
  terms.html           Terms of use
  privacy.html         Privacy notice
  404.html             Not-found page
  assets/              Shared styles, fonts, icons, share image, walkthrough video
wrangler.jsonc         Cloudflare Workers config
README.md    This file
BACKLOG.md   Ideas and next steps
```

## Licence

Proprietary. Copyright (c) 2026 Metis Signal Ltd. All rights reserved. See `LICENSE`.

## Deploy (Cloudflare Workers)

The site deploys as a static-assets Worker named `offer-check`, configured in `wrangler.jsonc`. Only the `public/` folder is published.

**One-off deploy from your machine:**

```
npx wrangler login     # first time only
npx wrangler deploy
```

**Automatic deploys (recommended):** in the Cloudflare dashboard, open the `offer-check` Worker → Settings → Builds → Connect to Git, and pick `Grexon85/offer-check`, branch `main`. Set the **deploy command** to `npx wrangler deploy` (not `npx wrangler versions upload`, which uploads a version without sending traffic to it). Every push to `main` then deploys itself.
