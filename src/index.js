// Offer Check Worker: serves the static site, plus a tiny anonymous usage counter.
// Counts only event names per day. No cookies, no IDs, no IP addresses, no figures.
import { DurableObject } from "cloudflare:workers";

const EVENTS = new Set(["compare", "copy", "installed", "app_launch", "video_play"]);
const LABELS = {
  compare: "Comparisons started",
  copy: "Summaries copied",
  installed: "App installs (Android / desktop)",
  app_launch: "Opened as an app",
  video_play: "Walkthrough plays",
};

export class Counter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS counts (day TEXT NOT NULL, name TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, name))"
    );
  }
  hit(name, day) {
    this.ctx.storage.sql.exec(
      "INSERT INTO counts (day, name, n) VALUES (?, ?, 1) ON CONFLICT (day, name) DO UPDATE SET n = n + 1",
      day, name
    );
  }
  stats(since) {
    const totals = this.ctx.storage.sql.exec("SELECT name, SUM(n) AS n FROM counts GROUP BY name").toArray();
    const days = this.ctx.storage.sql.exec("SELECT day, name, n FROM counts WHERE day >= ? ORDER BY day DESC", since).toArray();
    return { totals, days };
  }
}

// The stats key is checked against a SHA-256 fingerprint (STATS_KEY_HASH in wrangler.jsonc),
// so the key itself never appears in this public repo. A STATS_KEY secret also works if set.
async function keyOk(key, env) {
  if (!key) return false;
  if (env.STATS_KEY && key === env.STATS_KEY) return true;
  if (!env.STATS_KEY_HASH) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === env.STATS_KEY_HASH;
}

const counter = (env) => env.COUNTER.get(env.COUNTER.idFromName("global"));
const today = () => new Date().toISOString().slice(0, 10);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/e") {
      if (request.method === "POST") {
        const name = (await request.text()).slice(0, 32).trim();
        if (EVENTS.has(name)) ctx.waitUntil(counter(env).hit(name, today()));
      }
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }

    if (url.pathname === "/api/stats") {
      if (!(await keyOk(url.searchParams.get("key"), env))) {
        return new Response("Not found", { status: 404 });
      }
      const since = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
      const data = await counter(env).stats(since);
      if (url.searchParams.get("format") === "json") {
        return Response.json(data, { headers: { "cache-control": "no-store" } });
      }
      return new Response(statsPage(data), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

function statsPage({ totals, days }) {
  const t = Object.fromEntries(totals.map((r) => [r.name, r.n]));
  const names = [...EVENTS];
  const byDay = {};
  for (const r of days) (byDay[r.day] ||= {})[r.name] = r.n;
  const dayRows = Object.keys(byDay).sort().reverse()
    .map((d) => `<tr><td>${d}</td>${names.map((n) => `<td>${byDay[d][n] || 0}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Offer Check usage</title><link rel="stylesheet" href="/assets/site.css?v=3">
<style>:root{--bg:#f5f4f0;--surface:#fff;--ink:#141c1a;--muted:#55635e;--line:#dfe5e1;--accent:#0d5c52;--accent-soft:#e3efeb;--display:"Plus Jakarta Sans",sans-serif;--body:"Plus Jakarta Sans",sans-serif}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);padding:24px 16px 48px}
.wrap{max-width:900px;margin:0 auto;display:grid;gap:20px}h1{font-size:32px;margin:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.tile{background:var(--surface);border-radius:18px;padding:16px;border:1px solid var(--line)}.tile b{display:block;font-size:34px;font-weight:800;color:var(--accent)}.tile span{font-size:14px;color:var(--muted)}
.tw{overflow-x:auto;background:var(--surface);border-radius:18px;border:1px solid var(--line)}table{border-collapse:collapse;width:100%;font-size:14px}
th,td{padding:8px 12px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}th{font-size:12px;color:var(--muted)}
p{color:var(--muted);margin:0;font-size:14px}</style></head><body><div class="wrap">
<h1>Offer Check usage</h1><p>All-time totals, then the last 30 days. Anonymous counts only. Dates are UTC.</p>
<div class="tiles">${names.map((n) => `<div class="tile"><b>${t[n] || 0}</b><span>${LABELS[n]}</span></div>`).join("")}</div>
<div class="tw"><table><thead><tr><th>Day</th>${names.map((n) => `<th>${LABELS[n]}</th>`).join("")}</tr></thead><tbody>${dayRows || `<tr><td colspan="6">No events yet</td></tr>`}</tbody></table></div>
</div></body></html>`;
}
