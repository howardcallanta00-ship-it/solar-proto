/* model.js — pure calculation logic (no DOM). Assumptions are placeholders to validate with the client. */
(function (root) {
  const PR = 0.8;            // performance ratio (losses)
  const FIXED = 150;         // assumed minimum/fixed monthly charges (PHP)
  const EXPORT_RATE = 7;     // assumed credit per exported kWh under net metering (PHP)
  const PSH = 4.5;           // assumed annual-mean peak sun hours
  const BATT_USABLE = 0.9;
  const BATT_PRICE = 36000;  // PHP per kWh of battery
  const PANEL_KW = 0.55;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // seasonal output relative to annual mean (wet season Jun–Oct is lower) — illustrative
  const SEASON = [1.05,1.12,1.16,1.12,0.95,0.78,0.72,0.70,0.72,0.80,0.88,0.98];
  const TIERS = {
    low:   { mon: false, label: 'Essential',   tag: 'Lowest cost',        offset: 0.50, batt: 0,  perKw: 58000,
             pros: ['Lowest upfront cost','Fastest payback','Grid-tied: no battery to maintain'],
             cons: ['No backup when grid is down','Night usage stays on the grid'] },
    value: { mon: false, label: 'Recommended', tag: 'Best value',         offset: 0.85, batt: 5,  perKw: 64000,
             pros: ['Covers most daytime load with headroom','5 kWh battery shifts some usage to night','Room to add appliances later'],
             cons: ['Higher upfront cost','Battery empties on rainy or heavy-use nights'] },
    high:  { mon: true, label: 'Premium',     tag: 'Maximum independence', offset: 1.10, batt: 10, perKw: 68000,
             pros: ['Largest offset and backup runtime','10 kWh battery covers most evenings','Monitoring and surge protection included'],
             cons: ['Highest cost and longest payback','Still billed minimum charges'] }
  };

  function calc(p) {
    const genF = p.genF == null ? 1 : p.genF, loadF = p.loadF == null ? 1 : p.loadF, nm = p.nm == null ? true : p.nm;
    const gen = p.kw * (p.psh || PSH) * 30 * PR * genF;
    const load = p.kwh * loadF;
    const dayLoad = load * p.dayShare, nightLoad = load - dayLoad;
    const direct = Math.min(gen, dayLoad);
    const surplus = gen - direct;
    const battShift = Math.min(surplus, (p.batt || 0) * BATT_USABLE * 30, nightLoad);
    const exported = surplus - battShift;
    const gridKwh = load - direct - battShift;
    const credit = nm ? exported * EXPORT_RATE : 0;
    const bill = FIXED + Math.max(0, gridKwh * p.rate - credit);
    return { gen, load, direct, battShift, exported, gridKwh, credit, bill };
  }

  const ROOF_MAX = 20, BATT_STEP = 5, BATT_MAX = 4, MON_PRICE = 15000;
  function evalCfg(tier, kwh, dayShare, rate, panels, batt, mon, yf) {
    yf = yf == null ? 1 : yf;
    const T = TIERS[tier], kw = panels * PANEL_KW;
    const cost = kw * T.perKw + batt * BATT_PRICE + (mon ? MON_PRICE : 0);
    const base = { kwh, dayShare, kw, batt, rate };
    const nmOn = calc(Object.assign({}, base, { nm: true, genF: yf }));
    const nmOff = calc(Object.assign({}, base, { nm: false, genF: yf }));
    const rainy = calc(Object.assign({}, base, { nm: true, genF: 0.65 * yf }));
    const lo = calc(Object.assign({}, base, { nm: true, genF: 0.85 * yf })), hi = calc(Object.assign({}, base, { nm: true, genF: 1.08 * yf }));
    const baseB = kwh * rate + FIXED, nightLoad = kwh * (1 - dayShare);
    const baseBill = kwh * rate + FIXED;
    return {
      tier, kw, panels, batt, mon: !!mon, cost, baseBill, gen: nmOn.gen, offset: nmOn.gen / kwh,
      billNM: nmOn.bill, billNoNM: nmOff.bill, billRainy: rainy.bill,
      saveNM: baseBill - nmOn.bill, saveNoNM: baseBill - nmOff.bill,
      paybackNM: cost / ((baseBill - nmOn.bill) * 12), paybackNoNM: cost / ((baseBill - nmOff.bill) * 12),
      exportedKwh: nmOn.exported, yf, battShift: nmOn.battShift,
      cover: nmOn.gen / kwh, nightCover: nightLoad > 0 ? Math.min(1, nmOn.battShift / nightLoad) : 0,
      // honest ranges until the engineer verifies the site: output -15%/+8%, price -5%/+8%
      billNMLo: hi.bill, billNMHi: lo.bill, costLo: cost * 0.95, costHi: cost * 1.08,
      paybackLo: cost * 0.95 / ((baseB - hi.bill) * 12), paybackHi: cost * 1.08 / ((baseB - lo.bill) * 12)
    };
  }
  function template(tier, kwh) {
    const T = TIERS[tier];
    const panels = Math.min(ROOF_MAX, Math.max(2, Math.round(T.offset * kwh / (PSH * 30 * PR) / PANEL_KW)));
    return { panels, batt: T.batt, mon: T.mon };
  }
  function size(tier, kwh, dayShare, rate, extras) {
    extras = extras || {}; const t = template(tier, kwh);
    return evalCfg(tier, kwh, dayShare, rate, t.panels + (extras.kw ? 2 : 0), t.batt + (extras.batt ? 5 : 0), extras.mon == null ? t.mon : extras.mon);
  }
  function sizeCfg(tier, kwh, dayShare, rate, cfg) { return evalCfg(tier, kwh, dayShare, rate, cfg.panels, cfg.batt, cfg.mon, cfg.yf); }

  // ---------- roof geometry (area based) ----------
  const PANEL_L = 2.28, PANEL_W = 1.13, PANEL_AREA = 2.6, SETBACK = 0.4;
  const SIZES = { S: 25, M: 40, L: 60 };
  const DIRS = { south: ['South', 1.0], east: ['East', 0.9], west: ['West', 0.9], north: ['North', 0.7], flat: ['Flat roof', 0.95] };
  const SHADES = { none: ['None', 1.0, 1.0], some: ['Some', 0.85, 0.85], heavy: ['A lot', 0.7, 0.6] }; // label, yield factor, usable-area factor
  const ROOF_TYPE_F = { flat: 1, shed: 1, hip: 0.75, gable: 0.6 };
  function roofArea(r) { return r.mode === 'dim' ? Math.max(5, (+r.L || 0) * (+r.W || 0)) : SIZES[r.size] || 40; }
  // roof footprint in metres (long side first); a size choice assumes a 1.6 : 1 rectangle
  function roofDims(r) {
    if (r.mode === 'dim') { const L = Math.max(+r.L || 0, +r.W || 0, 2), W = Math.max(Math.min(+r.L || 0, +r.W || 0), 2); return { L, W }; }
    const a = roofArea(r), W = Math.sqrt(a / 1.6); return { L: W * 1.6, W };
  }
  // panels that fit: grid slots inside the edge setback, reduced by shade and roof shape
  function roofFit(r, type) {
    const area = roofArea(r), d = roofDims(r), sh = SHADES[r.shade] || SHADES.none, gap = 0.05;
    const cols = Math.max(1, Math.floor((d.L - 2 * SETBACK + gap) / (PANEL_L + gap))), rows = Math.max(1, Math.floor((d.W - 2 * SETBACK + gap) / (PANEL_W + gap)));
    const usable = Math.max(0, (d.L - 2 * SETBACK) * (d.W - 2 * SETBACK)) * sh[2] * (ROOF_TYPE_F[type || r.type] || 1);
    const slots = cols * rows, panels = Math.max(1, Math.min(ROOF_MAX, slots, Math.floor(usable / PANEL_AREA)));
    return { area, L: d.L, W: d.W, cols, rows, slots, usable, panels, yf: (DIRS[r.dir] || DIRS.south)[1] * sh[1] };
  }

  // ---------- goal solver: brute force over panels x battery ----------
  function candidates(tier, kwh, dayShare, rate, cap, yf) {
    const out = [];
    for (let p = 1; p <= cap; p++) for (let b = 0; b <= BATT_STEP * BATT_MAX; b += BATT_STEP) {
      const r = evalCfg(tier, kwh, dayShare, rate, p, b, false, yf); r.paybackNM = Math.min(r.paybackNM, 99); out.push(r);
    }
    return out;
  }
  const minBy = (a, f) => a.reduce((m, x) => (m == null || f(x) < f(m) ? x : m), null);
  const maxBy = (a, f) => minBy(a, x => -f(x));
  // returns { designs:[{label,res,fit}], unmet }
  function solveGoal(goal, tier, kwh, dayShare, rate, cap, yf) {
    let all = candidates(tier, kwh, dayShare, rate, cap, yf);
    const sane = all.filter(x => x.cover <= 1.1); if (sane.length) all = sane; // oversizing past 110% of use only earns low export credit
    let pool = all;
    const cheapest = a => minBy(a, x => x.cost);
    let low, best, most, unmet = false, fit;
    if (goal.type === 'cover') {
      const T = goal.pct / 100, ok = all.filter(x => x.cover >= T); pool = ok.length ? ok : all;
      fit = x => Math.min(1, x.cover / T);
      if (!ok.length) { unmet = true; most = maxBy(all, x => x.cover); low = best = most; }
      else { low = cheapest(ok); const head = ok.filter(x => x.cover >= Math.min(T + 0.08, maxBy(all, y => y.cover).cover)); best = cheapest(head.length ? head : ok); most = maxBy(all, x => Math.min(x.cover, 1) * 1000 + x.nightCover * 100 - x.cost / 1e6); }
    } else if (goal.type === 'budget') {
      const ok = all.filter(x => x.cost <= goal.amount); pool = ok.length ? ok : all;
      fit = x => Math.min(1, goal.amount / x.cost);
      if (!ok.length) { unmet = true; low = best = most = cheapest(all); }
      else { most = maxBy(ok, x => x.cover * 1000 - x.cost / 1e6); const good = ok.filter(x => x.cover >= most.cover * 0.7); best = minBy(good.length ? good : ok, x => x.paybackNM); const half = ok.filter(x => x.cover >= most.cover * 0.5); low = cheapest(half.length ? half : ok); }
    } else if (goal.type === 'payback') {
      const p3 = all.filter(x => x.cover >= 0.3), use = p3.length ? p3 : all; pool = use; const pb = minBy(use, x => x.paybackNM).paybackNM;
      fit = x => Math.min(1, pb / x.paybackNM);
      best = minBy(use, x => x.paybackNM);
      low = cheapest(use.filter(x => x.paybackNM <= pb * 1.2));
      most = maxBy(use.filter(x => x.paybackNM <= pb * 1.5), x => x.cover * 1000 - x.cost / 1e6) || best;
    } else { // night
      fit = x => Math.min(1, x.nightCover / 0.75);
      const a = all.filter(x => x.nightCover >= 0.5); pool = a.length ? a : all; const b = all.filter(x => x.nightCover >= 0.75);
      most = maxBy(all, x => x.nightCover * 1000 - x.cost / 1e6);
      if (!a.length) { unmet = true; low = best = most; } else { low = cheapest(a); best = b.length ? cheapest(b) : most; }
    }
    const same = (x, y) => x.panels === y.panels && x.batt === y.batt;
    if (!unmet && same(best, low)) { const alt = pool.filter(x => !same(x, low) && x.cost > low.cost).sort((a, b) => a.cost - b.cost)[0]; if (alt) best = alt; }
    if (!unmet && (same(most, best) || same(most, low))) { const alt = pool.filter(x => !same(x, low) && !same(x, best) && x.cover > best.cover).sort((a, b) => a.cost - b.cost)[0]; if (alt) most = alt; }
    const lab = [['Lowest cost', low], ['Best fit', best], ['Most coverage', most]];
    return { unmet, designs: lab.map(l => ({ label: l[0], tier, res: l[1], fit: fit(l[1]), cfg: { panels: l[1].panels, batt: l[1].batt, mon: false, yf } })) };
  }


  const LOAD_SHAPE = [2,2,2,2,2,3,5,6,4,3,3,4,5,4,3,3,4,6,9,10,10,8,5,3];
  function hourly(p, genF) {
    const dailyLoad = p.kwh / 30 * (p.loadF || 1);
    const isDay = h => h >= 7 && h <= 17;
    let wDay = 0, wNight = 0;
    LOAD_SHAPE.forEach((w, h) => { if (isDay(h)) wDay += w; else wNight += w; });
    const load = LOAD_SHAPE.map((w, h) => dailyLoad * (isDay(h) ? w / wDay * p.dayShare : w / wNight * (1 - p.dayShare)));
    const sun = Array.from({ length: 24 }, (_, h) => (h >= 6 && h <= 17) ? Math.sin(Math.PI * (h - 6 + 0.5) / 12) : 0);
    const sunSum = sun.reduce((a, b) => a + b, 0);
    const dailyGen = p.kw * PSH * PR * genF;
    const gen = sun.map(s => s / sunSum * dailyGen);
    const cap = (p.batt || 0) * BATT_USABLE;
    let soc = cap * 0.5, out;
    for (let pass = 0; pass < 2; pass++) {
      out = { load, gen, soc: [], grid: [], exp: [], cap };
      for (let h = 0; h < 24; h++) {
        const net = gen[h] - load[h];
        let grid = 0, exp = 0;
        if (net >= 0) { const ch = Math.min(net, cap - soc); soc += ch; exp = net - ch; }
        else { const need = -net, dis = Math.min(need, soc); soc -= dis; grid = need - dis; }
        out.soc.push(soc); out.grid.push(grid); out.exp.push(exp);
      }
    }
    out.gridTotal = out.grid.reduce((a, b) => a + b, 0);
    out.depletedAt = cap > 0 ? out.soc.findIndex((s, h) => h >= 18 && s < 0.01) : -1;
    return out;
  }

  const api = { solveGoal, roofFit, roofArea, roofDims, SIZES, DIRS, SHADES, ROOF_TYPE_F, PANEL_AREA, PANEL_L, PANEL_W, SETBACK, template, sizeCfg, ROOF_MAX, BATT_STEP, BATT_MAX, MON_PRICE, PR, FIXED, EXPORT_RATE, PSH, PANEL_KW, BATT_PRICE, MONTHS, SEASON, TIERS, calc, size, hourly };
  if (typeof module !== 'undefined') module.exports = api; else root.MODEL = api;
})(typeof window !== 'undefined' ? window : globalThis);
