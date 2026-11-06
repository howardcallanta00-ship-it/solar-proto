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
  function evalCfg(tier, kwh, dayShare, rate, panels, batt, mon) {
    const T = TIERS[tier], kw = panels * PANEL_KW;
    const cost = kw * T.perKw + batt * BATT_PRICE + (mon ? MON_PRICE : 0);
    const base = { kwh, dayShare, kw, batt, rate };
    const nmOn = calc(Object.assign({}, base, { nm: true }));
    const nmOff = calc(Object.assign({}, base, { nm: false }));
    const rainy = calc(Object.assign({}, base, { nm: true, genF: 0.65 }));
    const baseBill = kwh * rate + FIXED;
    return {
      tier, kw, panels, batt, mon: !!mon, cost, baseBill, gen: nmOn.gen, offset: nmOn.gen / kwh,
      billNM: nmOn.bill, billNoNM: nmOff.bill, billRainy: rainy.bill,
      saveNM: baseBill - nmOn.bill, saveNoNM: baseBill - nmOff.bill,
      paybackNM: cost / ((baseBill - nmOn.bill) * 12), paybackNoNM: cost / ((baseBill - nmOff.bill) * 12),
      exportedKwh: nmOn.exported
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
  function sizeCfg(tier, kwh, dayShare, rate, cfg) { return evalCfg(tier, kwh, dayShare, rate, cfg.panels, cfg.batt, cfg.mon); }

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

  const api = { template, sizeCfg, ROOF_MAX, BATT_STEP, BATT_MAX, MON_PRICE, PR, FIXED, EXPORT_RATE, PSH, PANEL_KW, BATT_PRICE, MONTHS, SEASON, TIERS, calc, size, hourly };
  if (typeof module !== 'undefined') module.exports = api; else root.MODEL = api;
})(typeof window !== 'undefined' ? window : globalThis);
