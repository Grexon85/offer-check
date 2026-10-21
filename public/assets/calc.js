/* Offer Check calculation engine. Pure functions: no DOM, so it runs in the browser and in Node tests.
   UPDATE EACH APRIL: every rate and threshold lives in RATES below. Bump ?v= on calc.js in index.html and CACHE in sw.js. */
(function (g) {
  "use strict";

  const RATES = {
    year: "2026/27",
    PA: 12570,                 // personal allowance
    TAPER_START: 100000,       // personal allowance falls £1 per £2 above this
    TAPER_END: 125140,         // ...and is gone here
    TAX: {
      ruk: { label: "England, Wales and NI", bands: [[37700, .20], [125140, .40], [Infinity, .45]] },
      sco: { label: "Scotland", bands: [[3967, .19], [16956, .20], [31092, .21], [62430, .42], [125140, .45], [Infinity, .48]] }
    },
    NI_PT: 12570, NI_UEL: 50270, NI_MAIN: .08, NI_UPPER: .02,   // employee Class 1
    ER_NI: .15, ER_NI_ST: 5000,                                   // employer Class 1 (for salary sacrifice pass-back)
    QE_LO: 6240, QE_HI: 50270,                                    // auto-enrolment qualifying earnings band
    SAC_NI_CAP_2029: 2000,                                        // NI relief cap on sacrificed pension from 6 April 2029
    LOANS: {                                                      // [annual threshold, rate]
      none: null,
      p1: [26900, .09], p2: [29385, .09], p4: [33795, .09], p5: [25000, .09]
    },
    PG: [21000, .06],                                             // postgraduate loan, can sit alongside one plan above
    CB_FIRST: 1406.60, CB_EXTRA: 930.80,                          // Child Benefit per year
    HICBC_START: 60000, HICBC_END: 80000,                         // charge: 1% of Child Benefit per £200 over the start
    TFC_PER_CHILD: 2000,                                          // Tax-Free Childcare top-up, max per child per year
    BANK_HOLS: 8,                                                 // England and Wales; used for working weeks
    COMMUTE_WEEKS: 46                                             // weeks a year you actually travel
  };

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  function incomeTax(income, reg) {
    const bands = (RATES.TAX[reg] || RATES.TAX.ruk).bands;
    const pa = Math.max(0, RATES.PA - Math.max(0, (income - RATES.TAPER_START) / 2));
    let left = Math.max(0, income - pa), t = 0, prev = 0;
    for (const [top, r] of bands) {
      const slice = Math.min(left, top - prev);
      if (slice <= 0) break;
      t += slice * r; left -= slice; prev = top;
    }
    return t;
  }

  const employeeNI = pay =>
    Math.max(0, Math.min(pay, RATES.NI_UEL) - RATES.NI_PT) * RATES.NI_MAIN + Math.max(0, pay - RATES.NI_UEL) * RATES.NI_UPPER;

  function studentLoan(pay, plan, pg) {
    let t = 0;
    const p = RATES.LOANS[plan];
    if (p) t += Math.max(0, pay - p[0]) * p[1];
    if (pg) t += Math.max(0, pay - RATES.PG[0]) * RATES.PG[1];
    return t;
  }

  function childBenefit(kids) {
    kids = Math.max(0, Math.floor(kids || 0));
    return kids ? RATES.CB_FIRST + (kids - 1) * RATES.CB_EXTRA : 0;
  }
  /* High Income Child Benefit Charge: 1% per full £200 of adjusted net income over £60,000, capped at 100%. */
  function hicbc(ani, kids) {
    const cb = childBenefit(kids);
    if (!cb || ani <= RATES.HICBC_START) return 0;
    const pct = Math.min(100, Math.floor((ani - RATES.HICBC_START) / 200));
    return cb * pct / 100;
  }

  /* Pay the pension % is worked out on. */
  function pensionable(base, basis) {
    if (basis === "qe") return Math.max(0, clamp(base, RATES.QE_LO, RATES.QE_HI) - RATES.QE_LO);
    return base;
  }

  /* One side of the comparison.
     p: base, empPct (core employer %), matchCap (employer matches your % 1:1 up to this), eePct (your %),
        basis ("full" | "qe"), sac (salary sacrifice), passNI (employer adds its NI saving),
        bonPct, rel (share of bonus you count on), allow, med, extraCash (taxable value, e.g. holiday), commute (cash saving)
     o: net (after tax?), reg ("ruk" | "sco"), loan (plan key), pg (bool), kids (Child Benefit children) */
  function side(p, o) {
    const base = +p.base || 0;
    const pay = pensionable(base, p.basis);
    const eePct = Math.max(0, +p.eePct || 0);
    const ee = pay * eePct / 100;
    const erPct = Math.max(0, +p.empPct || 0) + Math.min(eePct, Math.max(0, +p.matchCap || 0));
    const er = pay * erPct / 100;
    const sac = !!p.sac && ee > 0;
    const passback = sac && p.passNI && base > RATES.ER_NI_ST ? ee * RATES.ER_NI : 0;
    const bonus = base * (+p.bonPct || 0) / 100 * (p.rel == null ? 1 : +p.rel);
    const cash = base + bonus + (+p.allow || 0) + (+p.extraCash || 0);
    const med = +p.med || 0, commute = +p.commute || 0;

    // Earnings for NI and student loan: salary sacrifice reduces them; a net-pay or relief-at-source pension doesn't.
    const niPay = sac ? cash - ee : cash;
    // Pay for income tax: either way of paying in gets income tax relief.
    const taxPay = cash - ee;
    const ani = taxPay + med;                         // adjusted net income (no other income modelled)

    const reg = o.reg in RATES.TAX ? o.reg : "ruk";
    const tax = incomeTax(taxPay + med, reg);
    const ni = employeeNI(niPay);
    const sl = studentLoan(niPay, o.loan, o.pg);
    const cbCharge = hicbc(ani, o.kids);
    const takeHome = cash - ee - tax - ni - sl;      // what reaches your bank account in a year

    const gross = cash + med + er + passback + commute;
    const net = takeHome - cbCharge + ee + er + passback + med + commute;
    return {
      v: o.net ? net : gross, gross, net, takeHome, cash, ani, ee, er, erPct, passback,
      sacAmt: sac ? ee : 0, tax, ni, sl, cbCharge, niPay
    };
  }

  /* Monthly take-home from regular pay: salary and allowances, before any bonus or holiday value. */
  function monthly(p, o) {
    return side(Object.assign({}, p, { bonPct: 0, extraCash: 0 }), o).takeHome / 12;
  }

  /* Threshold traps for one side's adjusted net income. */
  function traps(ani) {
    return {
      taperSlice: clamp(ani, RATES.TAPER_START, RATES.TAPER_END) - RATES.TAPER_START,
      over100k: ani > RATES.TAPER_START,
      inCbZone: ani > RATES.HICBC_START
    };
  }

  /* Extra employee NI a year from April 2029 on sacrificed pension above the cap. */
  function sacCapCost(r) {
    const excess = r.sacAmt - RATES.SAC_NI_CAP_2029;
    if (excess <= 0) return 0;
    return employeeNI(r.niPay + excess) - employeeNI(r.niPay);
  }

  /* Offer base that reaches a target value. Value rises with base, so bisect. */
  function baseFor(target, valueAt) {
    let lo = 0, hi = Math.max(1e6, target * 4);
    if (valueAt(hi) < target) return NaN;
    for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (valueAt(m) < target) lo = m; else hi = m; }
    return hi;
  }

  /* ---------- Time: days, hours, holiday ---------- */
  const days = d => clamp(+d || 5, 1, 7);

  /* Full-time-equivalent salary (5-day week). */
  const fte = (base, d) => base * 5 / days(d);

  /* Value of the offer's holiday difference. Holiday is compared in weeks off (days ÷ days worked a week),
     priced at a week of the offer's pay. With 5-day weeks on both sides this equals (oHol − cHol) × base ÷ 260. */
  function holidayValue(offerBase, cHol, cDays, oHol, oDays) {
    const weeks = (+oHol || 0) / days(oDays) - (+cHol || 0) / days(cDays);
    return weeks * offerBase / 52;
  }

  /* Weeks actually worked: 52 less holiday and bank holidays, both in weeks of that side's working pattern. */
  const workingWeeks = (hol, d) => Math.max(1, 52 - ((+hol || 0) + RATES.BANK_HOLS) / days(d));

  /* Effective hourly rate: what the package is worth after tax, less your own commute cost,
     divided by every hour it takes (contracted hours + commute) across the weeks you work. */
  function hourly({ value, commuteCost, contracted, commuteHrs, hol, d }) {
    const hours = ((+contracted || 0) + (+commuteHrs || 0)) * workingWeeks(hol, d);
    return hours > 0 ? (value - (+commuteCost || 0)) / hours : NaN;
  }

  /* Cash value of commute time saved by the offer (negative if it costs you time). */
  const timeValue = (cHrs, oHrs, perHour) => ((+cHrs || 0) - (+oHrs || 0)) * RATES.COMMUTE_WEEKS * (+perHour || 0);

  const OC = { RATES, incomeTax, employeeNI, studentLoan, childBenefit, hicbc, pensionable, side, monthly, traps, sacCapCost, baseFor,
    fte, holidayValue, workingWeeks, hourly, timeValue };
  g.OC = OC;
  if (typeof module !== "undefined" && module.exports) module.exports = OC;
})(typeof window !== "undefined" ? window : globalThis);
