# Offer Check

A simple web app that helps job seekers:

1. Work out the questions and data points they need to clarify with a recruiter.
2. Capture the recruiter's answers.
3. Compare the full offer (base, pension, bonus, benefits, holiday, commute) against their current package, with clear decision lines: **walk away**, **break-even**, **consider** and **strong yes**.

It's a single static HTML file with no build step and no backend. Each user's figures and notes are saved only in their own browser (`localStorage`).

## Run it

Open `index.html` in a browser. That's it.

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
index.html   The whole app: markup, styles and script
README.md    This file
BACKLOG.md   Ideas and next steps
```

## Licence

Private project. Add a licence before making the repo public.
