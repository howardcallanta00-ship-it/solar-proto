/* data.js — seed projects and SIMULATED analytics data. Nothing here is real client data. */
(function (root) {
  const M = root.MODEL || require('./model.js');

  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

  const UTILITIES = {
    'Meralco':        { rate: 12.4, extra: ['Proof of ownership / lease consent', 'Meter & account details form'] },
    'Visayan Electric': { rate: 11.8, extra: ['Notarized affidavit of consent', 'Meter & account details form'] },
    'Davao Light':    { rate: 10.9, extra: ['Meter reading certificate'] },
    'Electric cooperative': { rate: 11.2, extra: ['Membership certificate', 'Cooperative clearance'] }
  };
  const CITIES = [
    ['Quezon City','Meralco','Luzon'], ['Makati','Meralco','Luzon'], ['Marikina','Meralco','Luzon'], ['Mandaluyong','Meralco','Luzon'], ['Antipolo','Meralco','Luzon'],
    ['Cebu City','Visayan Electric','Visayas'], ['Mandaue','Visayan Electric','Visayas'],
    ['Davao City','Davao Light','Mindanao'],
    ['Tarlac City','Electric cooperative','Luzon'], ['Iloilo (coop area)','Electric cooperative','Visayas']
  ];
  const regionOf = c => (CITIES.find(x => x[0] === c) || [0, 0, 'Luzon'])[2];
  const NM_ITEMS = ['Net metering application form', 'Valid government ID', 'Latest electric bill', 'Single-line diagram (PEE-signed)', 'Equipment spec sheets', 'Site photos'];
  const BP_ITEMS = ['Electrical/building permit application', 'Barangay clearance', 'Lot title or authorization letter', 'Signed & sealed plans'];
  const MILESTONES = ['Work order issued', 'Site mobilization', 'Panels & mounting', 'Inverter & battery', 'Wiring & protection', 'Testing & commissioning', 'Evidence photos uploaded'];
  const APPLIANCES = [
    { id: 'ac', label: 'Air conditioner (1 hp)', w: 900, hrs: 8, day: 0.15, qty: 1, on: true },
    { id: 'fridge', label: 'Refrigerator', w: 150, hrs: 10, day: 0.45, qty: 1, on: true },
    { id: 'fan', label: 'Electric fan', w: 60, hrs: 10, day: 0.4, qty: 3, on: true },
    { id: 'tv', label: 'TV', w: 100, hrs: 5, day: 0.3, qty: 1, on: true },
    { id: 'light', label: 'Lights (whole house)', w: 120, hrs: 6, day: 0.1, qty: 1, on: true },
    { id: 'wash', label: 'Washing machine', w: 400, hrs: 1, day: 0.8, qty: 1, on: true },
    { id: 'pump', label: 'Water pump', w: 750, hrs: 1, day: 0.9, qty: 1, on: false },
    { id: 'wfh', label: 'Work-from-home setup', w: 150, hrs: 8, day: 0.9, qty: 1, on: false },
    { id: 'rice', label: 'Rice cooker / kitchen', w: 600, hrs: 1.5, day: 0.5, qty: 1, on: true }
  ];
  const TECHS = [
    { name: 'R. Dizon', base: 'Quezon City', region: 'Luzon', skills: ['grid', 'hybrid', 'battery'], freeInDays: 0 },
    { name: 'M. Lopez', base: 'Antipolo', region: 'Luzon', skills: ['grid', 'hybrid'], freeInDays: 3 },
    { name: 'J. Cruz', base: 'Tarlac City', region: 'Luzon', skills: ['grid'], freeInDays: 1 },
    { name: 'A. Navarro', base: 'Cebu City', region: 'Visayas', skills: ['grid', 'hybrid', 'battery'], freeInDays: 5 },
    { name: 'P. Salazar', base: 'Mandaue', region: 'Visayas', skills: ['grid', 'hybrid'], freeInDays: 0 },
    { name: 'K. Tan', base: 'Davao City', region: 'Mindanao', skills: ['grid', 'hybrid', 'battery'], freeInDays: 2 }
  ];

  function appStats(apps) {
    let kwhDay = 0, dayKwh = 0;
    apps.filter(a => a.on).forEach(a => { const k = a.w * a.hrs * a.qty / 1000; kwhDay += k; dayKwh += k * a.day; });
    return { kwhMonth: kwhDay * 30, dayShare: kwhDay ? dayKwh / kwhDay : 0.3 };
  }

  function permitItems(utility, r, mode) {
    const names = NM_ITEMS.map(n => ({ n, track: 'Net metering' })).concat(UTILITIES[utility].extra.map(n => ({ n, track: 'Net metering' })), BP_ITEMS.map(n => ({ n, track: 'Building permit' })));
    return names.map(x => {
      let status = 'ok', source = r() < 0.5 ? 'uploaded' : 'physical', days = 0;
      if (mode === 'messy') { const v = r(); if (v < 0.22) { status = 'missing'; source = null; } else if (v < 0.38) { status = 'pending'; days = 2 + Math.floor(r() * 9); } }
      if (mode === 'blank') { status = 'missing'; source = null; }
      return { n: x.n, track: x.track, status, source, days };
    });
  }

  function mk(o) {
    const u = UTILITIES[o.utility], kwh = o.kwh, rate = u.rate, dayShare = o.dayShare;
    const s = o.cfg ? M.sizeCfg(o.tier, kwh, dayShare, rate, o.cfg) : M.size(o.tier, kwh, dayShare, rate, o.extras || {});
    const r = rng(hash(o.id));
    const p = Object.assign({
      stage: 1, rate, dayShare, extras: {}, approvals: { 1: [], 2: [], 3: [] }, released: false, accepted: false,
      indicative: s, quoteDelta: (r() * 0.12 - 0.02), log: [], appKwh: kwh, nmFrom: null, growth: 0.1, ticket: false, actionApproved: false,
      permit: null, install: null,
      ver: 1, rev: null, site: null,
      roof: { mode: 'size', size: 'M', dir: 'south', shade: 'none', type: 'flat' }, goal: { type: 'usual' }
    }, o, { size: s });
    p.cfg = o.cfg || Object.assign({}, M.template(o.tier, kwh), { roof: 'flat', yf: 1 });
    p.log.push({ t: 'Inquiry received — customer picked ' + M.TIERS[o.tier].label + ' tier (preference)' + (o.note || ''), who: 'Customer' });
    return p;
  }
  // ---- Zenith (CPM) inputs. ONE editable duration table; every figure is an assumption to validate with the client. ----
  // Days. T2 permit package prep, T3 permit processing (utility/LGU, external), T4 materials (T4batt with a battery), T5 work order and crew slot, T6 installation, T7 QA and turnover.
  const DURATIONS = {
    'Meralco':          { T2: 4, T3: 10, T4: 7, T4batt: 12, T5: 2, T6: 3, T7: 1 },
    'Visayan Electric': { T2: 4, T3: 10, T4: 7, T4batt: 12, T5: 2, T6: 3, T7: 1 },
    'Davao Light':      { T2: 4, T3: 10, T4: 7, T4batt: 12, T5: 2, T6: 3, T7: 1 },
    'Electric cooperative': { T2: 4, T3: 10, T4: 7, T4batt: 12, T5: 2, T6: 3, T7: 1 }
  };
  const PROMISE_DAYS = 14;            // promised install start = Day 14 after the customer accepts the quote (frozen at acceptance)
  const DEMO_DAY = 20, DEMO_BASE = Date.UTC(2026, 10, 1); // demo clock: Day 20 = Nov 21, 2026. Day offsets only, no Date.now.
  const dayDate = n => new Date(DEMO_BASE + n * 86400000).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  // schedule for an accepted job. acceptedDay is on the demo clock; tasks hold job-relative days (0 = acceptance day).
  function mkSched(p, acceptedDay, tasks) {
    return { acceptedDay, promised: PROMISE_DAYS, dur: Object.assign({}, DURATIONS[p.utility]), tasks: tasks || {}, agent: [] };
  }
  function startExec(p, permitMode, doneMilestones, tech) {
    const r = rng(hash(p.id + 'x'));
    p.permit = { items: permitItems(p.utility, r, permitMode), submitted: false, approved: false };
    p.install = { milestones: MILESTONES.map((n, i) => ({ n, done: i < doneMilestones })), tech: tech || null, qa: false };
  }

  // engineer proposes a changed design (version 2); the customer's version 1 stays on record
  function propose(p, cfg2, reasons, note, status, by) {
    const cfg1 = Object.assign({}, p.cfg);
    p.rev = { status: status || 'awaiting', by: by || 'Engineer', v1: { cfg: cfg1, size: M.sizeCfg(p.tier, p.kwh, p.dayShare, p.rate, cfg1) }, v2: { cfg: cfg2, size: M.sizeCfg(p.tier, p.kwh, p.dayShare, p.rate, cfg2) }, reasons: reasons || [], note: note || '' };
    p.ver = 2; return p;
  }
  function seedProjects() {
    const P = [];
    let p = mk({ id: 'P-1001', name: 'Santos Residence', city: 'Quezon City', utility: 'Meralco', tier: 'value', kwh: 480, dayShare: 0.35, stage: 1, appKwh: 330 });
    P.push(p);
    p = mk({ id: 'P-1002', name: 'Dela Cruz Residence', city: 'Cebu City', utility: 'Visayan Electric', tier: 'low', kwh: 360, dayShare: 0.4, stage: 2 });
    p.approvals[1] = ['engineer', 'staff']; p.approvals[2] = ['engineer']; P.push(p);
    p = mk({ id: 'P-1003', name: 'Garcia Residence', city: 'Davao City', utility: 'Davao Light', tier: 'high', kwh: 720, dayShare: 0.3, stage: 3 });
    p.approvals[1] = ['engineer', 'staff']; p.approvals[2] = ['engineer', 'manager']; p.released = true; P.push(p);
    p = mk({ id: 'P-1004', name: 'Reyes Residence', city: 'Marikina', utility: 'Meralco', tier: 'value', kwh: 520, dayShare: 0.33, stage: 6, nmFrom: 5, growth: 0.12 });
    startExec(p, 'ok', 7, 'R. Dizon'); p.permit.submitted = true; p.permit.approved = true; p.install.qa = true; p.accepted = true;
    p.sched = mkSched(p, -60, { T2: { start: 0, done: 4 }, T3: { start: 4, done: 15 }, T4: { start: 0, done: 7 }, T5: { start: 0, done: 2 }, T6: { start: 15, done: 18 }, T7: { start: 18, done: 19 } }); P.push(p);
    p = mk({ id: 'P-1005', name: 'Villanueva Residence', city: 'Antipolo', utility: 'Meralco', tier: 'value', kwh: 600, dayShare: 0.38, stage: 4, accepted: true });
    startExec(p, 'messy', 3, 'R. Dizon'); p.sched = mkSched(p, 14, { T2: { start: 0, expected: 7 }, T5: { start: 0, done: 2 } }); p.sched.note = 'Signed application form missing, expected back Day 7'; P.push(p);
    p = mk({ id: 'P-1006', name: 'Bautista Residence', city: 'Tarlac City', utility: 'Electric cooperative', tier: 'low', kwh: 400, dayShare: 0.45, stage: 4, accepted: true });
    startExec(p, 'ok', 7, 'J. Cruz'); p.permit.submitted = true; p.sched = mkSched(p, 10, { T2: { start: 0, done: 3 }, T3: { start: 3 }, T4: { start: 0, done: 6 }, T5: { start: 0, done: 2 } }); P.push(p);
    p = mk({ id: 'P-1007', name: 'Mendoza Residence', city: 'Mandaue', utility: 'Visayan Electric', tier: 'value', kwh: 540, dayShare: 0.3, stage: 4, accepted: true });
    startExec(p, 'ok', 0, null); p.permit.submitted = true; p.sched = mkSched(p, 11, { T2: { start: 0, done: 4 }, T3: { start: 4 }, T4: { start: 0, expected: 12 }, T5: { start: 0, done: 2 } }); p.sched.note = 'Battery order arrives Day 12'; P.push(p);
    p = mk({ id: 'P-1011', name: 'Santiago Residence', city: 'Makati', utility: 'Meralco', tier: 'low', kwh: 420, dayShare: 0.4, stage: 4, accepted: true });
    startExec(p, 'ok', 0, null); p.permit.submitted = true; p.sched = mkSched(p, 17, { T2: { start: 0, done: 2 }, T3: { start: 2 }, T5: { start: 0, done: 2 } }); P.push(p);
    p = mk({ id: 'P-1008', name: 'Aquino Residence', city: 'Mandaluyong', utility: 'Meralco', tier: 'high', kwh: 800, dayShare: 0.28, stage: 6, nmFrom: null, growth: 0.15 });
    startExec(p, 'ok', 7, 'R. Dizon'); p.permit.submitted = true; p.accepted = true; p.install.qa = true; p.ticket = true;
    p.sched = mkSched(p, -45, { T2: { start: 0, done: 6 }, T3: { start: 6, done: 16 }, T4: { start: 0, done: 12 }, T5: { start: 0, done: 2 }, T6: { start: 16, done: 19 }, T7: { start: 19, done: 20 } }); P.push(p);
    // site review examples: one waiting on the customer, one returned to the customer
    const roof = { mode: 'size', size: 'M', dir: 'south', shade: 'some', type: 'flat' };
    const g = { type: 'cover', pct: 80 };
    p = mk({ id: 'P-1009', name: 'Tan Residence', city: 'Quezon City', utility: 'Meralco', tier: 'value', kwh: 520, dayShare: 0.35, stage: 1, appKwh: 480, roof, goal: g, cfg: { panels: 8, batt: 5, mon: false, roof: 'flat', yf: 0.85 } });
    propose(p, { panels: 6, batt: 5, mon: false, roof: 'flat', yf: 0.85 }, [{ k: 'panels', reason: 'Part of the roof is in shade after 2 pm, so two panels there would make little power.' }, { k: 'area', reason: 'Measured on site: 27 m² usable, not 30 m².' }], 'If you want to stay near 80%, we could trim the trees on the west side. Then all eight panels would work. I can re-check after.', 'awaiting', 'A. Ramos');
    p.rev.v1.area = 30; p.rev.v2.area = 27;
    p.contact = { done: true, method: 'Meeting at the site', when: '2026-11-07', notes: 'Walked the roof with the owner and confirmed the 80% goal.', by: 'A. Ramos' };
    p.log.push({ t: 'Contacted the customer (Meeting at the site, 2026-11-07): walked the roof with the owner and confirmed the 80% goal.', who: 'A. Ramos', at: Date.now() - 2 * 86400000, k: 'rev' });
    p.log.push({ t: 'Sent a proposal: 6 panels and 5 kWh battery instead of 8 panels and 5 kWh battery. Waiting for the customer.', who: 'A. Ramos', at: Date.now() - 86400000, k: 'rev' });
    p.site = { checks: { roof: { r: 'pass', why: '' }, area: { r: 'adjust', why: 'Measured 36 m², 27 m² usable' }, shade: { r: 'adjust', why: 'West side shaded after 2 pm by the neighbour’s wall' }, elec: { r: 'pass', why: '' }, batt: { r: 'pass', why: '' }, util: { r: 'pass', why: '' } }, usable: 27, photos: 4, note: '' };
    P.push(p);
    p = mk({ id: 'P-1010', name: 'Ocampo Residence', city: 'Marikina', utility: 'Meralco', tier: 'value', kwh: 430, dayShare: 0.33, stage: 1, appKwh: 400, roof: Object.assign({}, roof, { shade: 'none' }), goal: { type: 'budget', amount: 300000 } });
    P.push(p);
    return P;
  }

  // Monthly "actual vs promised" series with sequential driver attribution (weather → load growth → net metering).
  function series(p, n) {
    n = n || 8; const r = rng(hash(p.id + 's')), start = 2, out = [];
    const base = { kwh: p.kwh, dayShare: p.dayShare, kw: p.size.kw, batt: p.size.batt, rate: p.rate };
    for (let i = 0; i < n; i++) {
      const m = (start + i) % 12;
      const genF = M.SEASON[m] * (0.95 + r() * 0.1), loadF = 1 + p.growth * (i / (n - 1)) + (r() - 0.5) * 0.04;
      const nm = p.nmFrom != null && i >= p.nmFrom;
      const promised = M.calc(Object.assign({}, base, { nm: true }));
      const a = M.calc(Object.assign({}, base, { nm: true, genF }));
      const b = M.calc(Object.assign({}, base, { nm: true, genF, loadF }));
      const c = M.calc(Object.assign({}, base, { nm, genF, loadF }));
      out.push({ m: M.MONTHS[m], nm, genF, loadF, promised: promised.bill, actual: c.bill, gen: c.gen, expGen: promised.gen,
        parts: { weather: a.bill - promised.bill, load: b.bill - a.bill, nm: c.bill - b.bill }, lostCredit: c.exported * M.EXPORT_RATE });
    }
    return out;
  }

  // ---- Simulated portfolio for the management analytics (64 installed projects, 140 inquiries) ----
  let _an = null;
  function analytics() {
    if (_an) return _an; const r = rng(2026), rows = [], U = Object.keys(UTILITIES);
    const utilParams = { 'Meralco': [5, 2, 0.45, 12], 'Visayan Electric': [4, 1.5, 0.30, 10], 'Davao Light': [4, 1.5, 0.22, 9], 'Electric cooperative': [6, 2.5, 0.50, 16] }; // sample data scaled to the duration assumptions above
    const missPool = { 'Meralco': ['Single-line diagram (PEE-signed)', 'Proof of ownership / lease consent', 'Barangay clearance'], 'Visayan Electric': ['Notarized affidavit of consent', 'Signed & sealed plans', 'Latest electric bill'],
      'Davao Light': ['Meter reading certificate', 'Lot title or authorization letter', 'Site photos'], 'Electric cooperative': ['Membership certificate', 'Cooperative clearance', 'Lot title or authorization letter'] };
    const gauss = () => (r() + r() + r() - 1.5) / 0.5;
    for (let i = 0; i < 64; i++) {
      const utility = U[Math.floor(r() * 4)], tier = ['low', 'value', 'high'][r() < 0.3 ? 0 : r() < 0.7 ? 1 : 2];
      const kwh = 250 + Math.floor(r() * 650), dayShare = 0.25 + r() * 0.25, rate = UTILITIES[utility].rate;
      const s = M.size(tier, kwh, dayShare, rate), month = Math.floor(r() * 12);
      const genF = M.SEASON[month] * (0.94 + r() * 0.12), loadF = 1 + r() * 0.2, nm = r() < 0.6;
      const base = { kwh, dayShare, kw: s.kw, batt: s.batt, rate };
      const pr = M.calc(Object.assign({}, base, { nm: true })), a = M.calc(Object.assign({}, base, { nm: true, genF })), b = M.calc(Object.assign({}, base, { nm: true, genF, loadF })), c = M.calc(Object.assign({}, base, { nm, genF, loadF }));
      const up = utilParams[utility], returned = r() < up[2];
      rows.push({ id: 'S-' + (2000 + i), utility, tier, promised: pr.bill, actual: c.bill, gap: c.bill - pr.bill,
        parts: { weather: a.bill - pr.bill, load: b.bill - a.bill, nm: c.bill - b.bill }, nm,
        prep: Math.max(3, Math.round(up[0] + gauss() * up[1] + (returned ? 6 : 0))), returned, missing: returned ? missPool[utility][Math.floor(r() * 3)] : null,
        approval: Math.max(6, Math.round(up[3] + gauss() * 3)), tech: TECHS[Math.floor(r() * TECHS.length)].name, jobDays: Math.max(2, Math.round(4 + gauss() * 1.5)) });
    }
    const funnel = { low: { pick: 0, quote: 0, accept: 0 }, value: { pick: 0, quote: 0, accept: 0 }, high: { pick: 0, quote: 0, accept: 0 } }, deltas = [];
    for (let i = 0; i < 140; i++) {
      const t = ['low', 'value', 'high'][r() < 0.32 ? 0 : r() < 0.72 ? 1 : 2]; funnel[t].pick++;
      if (r() < 0.8) { funnel[t].quote++; const d = (r() - 0.3) * 0.2; deltas.push(d); const base = { low: 0.82, value: 0.7, high: 0.45 }[t]; if (r() < base - Math.max(0, d - 0.08) * 2) funnel[t].accept++; }
    }
    const techs = TECHS.map(t => { const mine = rows.filter(x => x.tech === t.name); return { name: t.name, jobs: mine.length, days: mine.reduce((a, x) => a + x.jobDays, 0), util: Math.min(0.98, mine.reduce((a, x) => a + x.jobDays, 0) / 62) }; });
    _an = { rows, funnel, deltas, techs, utilities: U }; return _an;
  }

  const api = { DURATIONS, PROMISE_DAYS, DEMO_DAY, dayDate, mkSched, propose, mk, startExec, rng, hash, UTILITIES, CITIES, regionOf, APPLIANCES, TECHS, MILESTONES, appStats, seedProjects, series, analytics };
  if (typeof module !== 'undefined') module.exports = api; else root.DATA = api;
})(typeof window !== 'undefined' ? window : globalThis);
