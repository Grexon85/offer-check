// Run with: node --test
// One test per acceptance criterion in the P0 spec (OC-01 to OC-05), plus regression and sanity checks.
const test = require("node:test");
const assert = require("node:assert/strict");
const OC = require("../public/assets/calc.js");

const NET = { net: true, reg: "ruk", loan: "none", pg: false, kids: 0 };
const base = (b, extra = {}) => Object.assign({ base: b, empPct: 0, matchCap: 0, eePct: 0, basis: "full", sac: false, passNI: false,
  bonPct: 0, rel: 1, allow: 0, med: 0, extraCash: 0, commute: 0 }, extra);
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

/* ---------- OC-01 Employee pension and employer matching ---------- */
test("OC-01: 3% you / 3% employer vs 0% you / 6% employer: different take-home, same total pension", () => {
  const a = OC.side(base(50000, { eePct: 3, empPct: 3 }), NET);
  const b = OC.side(base(50000, { eePct: 0, empPct: 6 }), NET);
  near(a.ee + a.er, b.ee + b.er);
  assert.ok(a.takeHome < b.takeHome, "paying in yourself lowers take-home");
});

test("OC-01: a match only pays out if you contribute", () => {
  const none = OC.side(base(50000, { empPct: 0, matchCap: 6, eePct: 0 }), NET);
  const full = OC.side(base(50000, { empPct: 0, matchCap: 6, eePct: 6 }), NET);
  const over = OC.side(base(50000, { empPct: 0, matchCap: 6, eePct: 8 }), NET);
  assert.equal(none.er, 0);
  near(full.er, 3000);
  near(over.er, 3000, 0.01); // capped at 6%
});

test("OC-01: qualifying-earnings basis on £60,000 applies the % to £44,030", () => {
  assert.equal(OC.pensionable(60000, "qe"), 44030);
  const r = OC.side(base(60000, { empPct: 5, basis: "qe" }), NET);
  near(r.er, 44030 * 0.05);
  assert.equal(OC.pensionable(5000, "qe"), 0);
});

/* ---------- OC-02 Pension salary sacrifice ---------- */
test("OC-02: on £50,000 with 5% in, salary sacrifice raises take-home by exactly the NI saved", () => {
  const off = OC.side(base(50000, { eePct: 5, sac: false }), NET);
  const on = OC.side(base(50000, { eePct: 5, sac: true }), NET);
  near(on.takeHome - off.takeHome, 2500 * 0.08);
});

test("OC-02: employer NI pass-back adds 15% of the sacrifice to pension value", () => {
  const r = OC.side(base(50000, { eePct: 5, sac: true, passNI: true }), NET);
  near(r.passback, 375);
});

test("OC-02: the 2029 cap cost is zero at £2,000 sacrificed and positive above it", () => {
  const at = OC.side(base(40000, { eePct: 5, sac: true }), NET);   // £2,000
  const above = OC.side(base(50000, { eePct: 5, sac: true }), NET); // £2,500
  assert.equal(OC.sacCapCost(at), 0);
  near(OC.sacCapCost(above), 500 * 0.08);
});

/* ---------- OC-03 Student loan ---------- */
test("OC-03: 2026/27 thresholds", () => {
  assert.equal(OC.studentLoan(26900, "p1"), 0);
  near(OC.studentLoan(30385, "p2"), 90);
  near(OC.studentLoan(26000, "p5"), 90);
  near(OC.studentLoan(34795, "p4"), 90);
  near(OC.studentLoan(22000, "none", true), 60); // postgraduate at 6%
});

test("OC-03: Plan 2 user moving £40,000 → £45,000 sees after-tax uplift £450 lower than with no loan", () => {
  const up = loan => {
    const o = Object.assign({}, NET, { loan });
    return OC.side(base(45000), o).net - OC.side(base(40000), o).net;
  };
  near(up("none") - up("p2"), 450);
});

test("OC-03: salary sacrifice lowers student loan repayments, a net-pay pension doesn't", () => {
  const o = Object.assign({}, NET, { loan: "p2" });
  const plain = OC.side(base(50000, { eePct: 5 }), o);
  const sac = OC.side(base(50000, { eePct: 5, sac: true }), o);
  near(plain.sl, (50000 - 29385) * 0.09);
  near(sac.sl, (47500 - 29385) * 0.09);
});

/* ---------- OC-04 Monthly take-home ---------- */
test("OC-04: monthly delta is the yearly regular take-home difference ÷ 12", () => {
  const cur = base(70000, { eePct: 5, empPct: 10, sac: true, bonPct: 10 });
  const off = base(82000, { eePct: 5, empPct: 3, matchCap: 3, bonPct: 8, rel: 0.5 });
  const d = OC.monthly(off, NET) - OC.monthly(cur, NET);
  const yearly = OC.side(Object.assign({}, off, { bonPct: 0 }), NET).takeHome - OC.side(Object.assign({}, cur, { bonPct: 0 }), NET).takeHome;
  near(d, yearly / 12);
});

test("OC-04: monthly take-home excludes bonus and holiday value", () => {
  const plain = OC.monthly(base(60000), NET);
  const extras = OC.monthly(base(60000, { bonPct: 20, extraCash: 5000 }), NET);
  near(plain, extras);
});

/* ---------- OC-05 Threshold traps ---------- */
test("OC-05: £95,000 → £110,000 puts £10,000 in the 60% band", () => {
  const c = OC.side(base(95000), NET), o = OC.side(base(110000), NET);
  assert.equal(OC.traps(o.ani).taperSlice - OC.traps(c.ani).taperSlice, 10000);
});

test("OC-05: raising the offer's pension to bring income under £100,000 clears the taper", () => {
  const o = OC.side(base(110000, { eePct: 10 }), NET);
  assert.equal(OC.traps(o.ani).taperSlice, 0);
  assert.equal(OC.traps(o.ani).over100k, false);
});

test("OC-05: no Child Benefit or childcare question below £60,000", () => {
  const t = OC.traps(OC.side(base(59000), NET).ani);
  assert.equal(t.inCbZone, false);
  assert.equal(t.over100k, false);
});

test("OC-05: High Income Child Benefit Charge, 2026/27", () => {
  assert.equal(OC.hicbc(60000, 1), 0);
  near(OC.hicbc(70000, 1), 1406.60 * 0.5);
  near(OC.hicbc(90000, 2), 1406.60 + 930.80);
  near(OC.hicbc(60399, 1), 1406.60 * 0.01); // whole £200 steps only
});

/* ---------- Regression: saved figures from before this change give the same answers ---------- */
function oldNet(b, p, reg) { // the pre-P0 formula, copied from index.html
  const TAX = { ruk: [[37700, .20], [125140, .40], [Infinity, .45]], sco: [[3967, .19], [16956, .20], [31092, .21], [62430, .42], [125140, .45], [Infinity, .48]] };
  const it = (inc) => { const pa = Math.max(0, 12570 - Math.max(0, (inc - 100000) / 2)); let left = Math.max(0, inc - pa), t = 0, prev = 0;
    for (const [top, r] of TAX[reg]) { const s = Math.min(left, top - prev); if (s <= 0) break; t += s * r; left -= s; prev = top } return t; };
  const ni = c => Math.max(0, Math.min(c, 50270) - 12570) * .08 + Math.max(0, c - 50270) * .02;
  const cash = b * (1 + p.bonPct / 100 * p.rel) + p.allow + p.extraCash;
  const tc = it(cash), ta = it(cash + p.med);
  return cash - tc - ni(cash) + (p.med - (ta - tc)) + b * p.empPct / 100 + p.commute;
}

test("Regression: with no new fields set, results match the previous formula exactly", () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {
    const b = Math.round(rnd() * 200000);
    const p = base(b, { empPct: Math.round(rnd() * 15), bonPct: Math.round(rnd() * 30), rel: [0, .5, 1][i % 3],
      allow: Math.round(rnd() * 5000), med: Math.round(rnd() * 2000), extraCash: Math.round(rnd() * 3000), commute: Math.round(rnd() * 2000 - 1000) });
    for (const reg of ["ruk", "sco"]) near(OC.side(p, Object.assign({}, NET, { reg })).net, oldNet(b, p, reg), 1e-6);
  }
});

/* ---------- Sanity: value rises with base, so "base needed" can bisect ---------- */
test("Value after tax rises with base salary, with every new feature switched on", () => {
  const o = { net: true, reg: "ruk", loan: "p2", pg: true, kids: 3 };
  const p = b => base(b, { eePct: 5, empPct: 3, matchCap: 3, sac: true, passNI: true, bonPct: 10, med: 1000 });
  let prev = -Infinity;
  for (let b = 0; b <= 200000; b += 250) { const v = OC.side(p(b), o).net; assert.ok(v > prev, `not rising at £${b}`); prev = v; }
});

test("baseFor finds the base that hits a target", () => {
  const at = b => OC.side(base(b, { empPct: 5 }), NET).net;
  const b = OC.baseFor(at(64321), at);
  near(b, 64321, 0.5);
});

/* ---------- OC-06 Commute time valued in £ ---------- */
test("OC-06: blank hour value keeps today's behaviour (no cash value)", () => {
  assert.equal(OC.timeValue(7.5, 5, ""), 0);
  assert.equal(OC.timeValue(7.5, 5, 0), 0);
});

test("OC-06: 2.5 hours a week saved at £20/hr is worth £2,300 a year (46 weeks)", () => {
  assert.equal(OC.timeValue(7.5, 5, 20), 2300);
  assert.equal(OC.timeValue(5, 7.5, 20), -2300);
});

/* ---------- OC-07 Effective hourly rate ---------- */
test("OC-07: hourly rate = (value − commute cost) ÷ ((contracted + commute hours) × working weeks)", () => {
  // 25 days holiday + 8 bank holidays on a 5-day week = 6.6 weeks off, so 45.4 weeks worked
  near(OC.workingWeeks(25, 5), 45.4, 1e-9);
  const h = OC.hourly({ value: 50000, commuteCost: 2000, contracted: 37.5, commuteHrs: 5, hol: 25, d: 5 });
  near(h, 48000 / (42.5 * 45.4), 1e-9);
});

test("OC-07: a long commute lowers the hourly rate even at equal pay", () => {
  const a = OC.hourly({ value: 50000, commuteCost: 0, contracted: 37.5, commuteHrs: 2, hol: 25, d: 5 });
  const b = OC.hourly({ value: 50000, commuteCost: 0, contracted: 37.5, commuteHrs: 10, hol: 25, d: 5 });
  assert.ok(b < a);
});

/* ---------- OC-08 Part-time and four-day week ---------- */
test("OC-08: a 4-day offer at £48,000 shows a full-time equivalent of £60,000", () => {
  assert.equal(OC.fte(48000, 4), 60000);
  assert.equal(OC.fte(48000, ""), 48000); // blank = 5 days
});

test("OC-08: holiday is compared in weeks off, so 20 days on 4 days a week equals 25 on 5", () => {
  near(OC.holidayValue(48000, 25, 5, 20, 4), 0, 1e-9);
});

test("OC-08: with 5-day weeks, holiday value matches the previous day's-pay rule", () => {
  near(OC.holidayValue(82000, 25, 5, 28, 5), 3 * 82000 / 260, 1e-9);
});
