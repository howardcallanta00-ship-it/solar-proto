/* app.js — UI for the SolarFlow prototype. No build step; open index.html or serve the folder. */
(function () {
  const M = MODEL, D = DATA;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const peso = n => (n < 0 ? '−₱' : '₱') + Math.round(Math.abs(n)).toLocaleString('en-PH');
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + '₱' + Math.round(Math.abs(n)).toLocaleString('en-PH');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = n => Math.round(n * 100) + '%';
  const med = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

  const ROLES = { customer: 'Customer', staff: 'Intake / permit staff', engineer: 'Site engineer', manager: 'Manager', qa: 'QA', technician: 'Technician (R. Dizon)', management: 'Management / admin' };
  const STAFF = ['staff', 'engineer', 'manager', 'qa', 'management'];
  const ROUTES = {
    estimator:  { label: 'Get an estimate', roles: ['customer'] },
    myproject:  { label: 'My project', roles: ['customer'] },
    insights:   { label: 'My bill insights', roles: ['customer'] },
    pipeline:   { label: 'Project pipeline', roles: STAFF },
    permits:    { label: 'Permit tracker', roles: ['staff', 'manager', 'management'] },
    workorders: { label: 'Work orders', roles: ['technician', 'qa', 'manager'] },
    analytics:  { label: 'Analytics', roles: ['engineer', 'manager', 'management'] },
    spec:       { label: 'Documentation', roles: STAFF },
    users:      { label: 'Team and access', roles: ['management'] }
  };
  const GATES = {
    1: { need: ['engineer', 'staff'], label: 'Engineer completes site assessment, staff verify the data' },
    2: { need: ['engineer', 'manager'], label: 'Engineer and manager approve the quotation' },
    3: { need: ['staff'], label: 'Staff release the quotation; the customer then accepts' }
  };
  const KEY = 'solarflow_v5';
  let S = load(), UI = { tab: {}, est: null, insProject: null, rainy: false, menu: null, q: '', pf: 'all' };

  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.projects) return s; } catch (e) {} return fresh(); }
  function fresh() { return { authed: false, role: 'customer', projects: D.seedProjects(), myProject: 'P-1009', seq: 1012 }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  const P = id => S.projects.find(p => p.id === id);
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
  function log(p, text, who, k) { p.log.push({ t: text, who: who || userOf(S.role).n, at: Date.now(), k }); }


  // ---------- accounts, header, sidebar ----------
  const ACCOUNTS = [
    { r: 'customer', n: 'Ana Reyes', t: 'Homeowner, Marikina' },
    { r: 'staff', n: 'Liza Ramos', t: 'Intake and permits' },
    { r: 'engineer', n: 'Paolo Garcia', t: 'Site engineer' },
    { r: 'manager', n: 'Carla Navarro', t: 'Operations manager' },
    { r: 'qa', n: 'Nico Villar', t: 'Quality assurance' },
    { r: 'technician', n: 'Rico Dizon', t: 'Field technician' },
    { r: 'management', n: 'Dante Cruz', t: 'Management and admin' }
  ];
  const userOf = r => ACCOUNTS.find(a => a.r === r) || ACCOUNTS[0];
  const ini = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const avatar = (n, sz) => `<span class="av" style="--h:${hue(n)}${sz ? ';--s:' + sz + 'px' : ''}" aria-hidden="true">${ini(n)}</span>`;
  const ICON = {
    pipeline: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>',
    permits: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>',
    workorders: '<path d="M14.7 6.3a4 4 0 005 5L21 13l-8 8-4-4 8-8zM3 21l5-5"/><path d="M14 3l4 4"/>',
    analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    spec: '<path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4V4z"/><path d="M8 9h8M8 13h6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 5a3.5 3.5 0 010 7M22 20c0-2.5-1.5-4.5-4-5.5"/>',
    estimator: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    myproject: '<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z"/>',
    insights: '<path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/>'
  };
  const ico = k => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ''}</svg>`;
  function isWait(p) { if (p.stage === 1 && p.rev && (p.rev.status === 'awaiting' || p.rev.status === 'returned')) return false; const g = GATES[p.stage]; return !!g && g.need.includes(S.role) && !p.approvals[p.stage].includes(S.role) && !(p.stage === 3 && !p.released && S.role !== 'staff'); }
  function notes() {
    const out = [];
    if (S.role === 'customer') {
      const p = P(S.myProject); if (!p) return out;
      if (p.stage === 3 && p.released) out.push({ href: '#/myproject', t: 'Your quotation is ready', s: 'Review it and accept when you are comfortable.' });
      if (p.permit) { const m = permitStats(p); if (m.miss.length) out.push({ href: '#/myproject', t: m.miss.length + ' requirement' + (m.miss.length > 1 ? 's' : '') + ' still needed', s: m.miss.map(i => i.n).slice(0, 2).join(', ') }); }
      return out;
    }
    S.projects.forEach(p => { if (isWait(p)) out.push({ href: '#/project/' + p.id, t: p.name + ' needs your approval', s: GATES[p.stage].label }); });
    S.projects.forEach(p => { const f = flags(p).filter(x => x.k === 'bad')[0]; if (f && ['staff', 'engineer', 'manager', 'management'].includes(S.role)) out.push({ href: '#/project/' + p.id, t: p.name, s: f.t.length > 96 ? f.t.slice(0, 94) + '…' : f.t }); });
    return out.slice(0, 7);
  }
  function renderChrome() {
    const mode = !S.authed ? 'auth' : S.role === 'customer' ? 'customer' : 'staff';
    document.body.dataset.mode = mode;
    if (!S.authed) { $('#hright').innerHTML = ''; $('#nav').innerHTML = ''; return; }
    const u = userOf(S.role), n = notes();
    const bell = UI.menu === 'bell' ? `<div class="menu" role="menu"><div class="menu-h">Notifications</div>${n.length ? n.map(x => `<a role="menuitem" href="${x.href}" class="mi"><b>${esc(x.t)}</b><span>${esc(x.s)}</span></a>`).join('') : '<div class="mi empty"><b>You are all caught up</b><span>New approvals and issues appear here.</span></div>'}</div>` : '';
    const usr = UI.menu === 'user' ? `<div class="menu" role="menu"><div class="menu-h"><b>${esc(u.n)}</b><span>${esc(ROLES[S.role].split(' (')[0])}</span></div><button role="menuitem" class="mi" data-act="logout"><b>Switch account</b><span>Return to the sign-in screen</span></button><button role="menuitem" class="mi" data-act="reset"><b>Reset demo data</b><span>Restore the original sample projects</span></button><button role="menuitem" class="mi" data-act="logout"><b>Sign out</b></button></div>` : '';
    $('#hright').innerHTML = `<div class="menuwrap"><button class="iconbtn" data-act="menu" data-m="bell" aria-label="Notifications, ${n.length} new" aria-expanded="${UI.menu === 'bell'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 004 0"/></svg>${n.length ? `<i class="badge">${n.length}</i>` : ''}</button>${bell}</div>
      <div class="menuwrap"><button class="userbtn" data-act="menu" data-m="user" aria-label="Account menu for ${esc(u.n)}" aria-expanded="${UI.menu === 'user'}">${avatar(u.n)}<span class="un"><b>${esc(u.n)}</b><small>${esc(ROLES[S.role].split(' (')[0])}</small></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>${usr}</div>`;
    const route = (location.hash.replace(/^#\/?/, '').split('/')[0]) || allowed()[0];
    const cnt = k => { if (k === 'pipeline') return S.projects.filter(isWait).length; if (k === 'permits') return S.projects.filter(p => p.permit && !p.permit.submitted && (permitStats(p).miss.length || permitStats(p).pend.length)).length; if (k === 'workorders') return S.projects.filter(p => p.install && !p.install.qa && (S.role !== 'technician' || p.install.tech === 'R. Dizon')).length; return 0; };
    const item = k => `<a href="#/${k}" title="${ROUTES[k].label}" aria-label="${ROUTES[k].label}" class="${k === route || (route === 'project' && k === 'pipeline') ? 'on' : ''}" ${k === route ? 'aria-current="page"' : ''}>${mode === 'staff' ? ico(k) : ''}<span>${mode === 'staff' ? ({ pipeline: 'Pipeline', permits: 'Permits', workorders: 'Work', analytics: 'Analytics', spec: 'Docs', users: 'Team' }[k] || ROUTES[k].label) : ROUTES[k].label}</span>${mode === 'staff' && cnt(k) ? `<i class="cnt">${cnt(k)}</i>` : ''}</a>`;
    const ks = allowed();
    if (mode === 'staff') {
      const ref = ks.filter(k => k === 'spec' || k === 'users'), main = ks.filter(k => !ref.includes(k));
      $('#nav').innerHTML = `<div class="grp">Workspace</div>${main.map(item).join('')}${ref.length ? `<div class="grp">Reference</div>${ref.map(item).join('')}` : ''}`;
    } else $('#nav').innerHTML = ks.map(item).join('');
    $('.hsearch').style.display = mode === 'staff' && ks.includes('pipeline') ? '' : 'none';
  }
  function modal(o) {
    $('#modal').innerHTML = `<div class="scrim" data-act="mclose"></div><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="mt"><h3 id="mt">${o.title}</h3><p>${o.body}</p><div class="dlg-b"><button class="line" data-act="mclose">Cancel</button><button class="alt" data-act="mok">${o.ok}</button></div></div>`;
    UI.mok = o.fn; setTimeout(() => { const b = $('#modal .alt'); if (b) b.focus(); }, 0);
  }
  function loginView() {
    const grp = (title, list) => `<div class="acc-g">${title}</div>` + list.map(a => `<button class="acc" data-act="login" data-r="${a.r}">${avatar(a.n, 40)}<span><b>${a.n}</b><small>${a.t}</small></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`).join('');
    const svg = Scene.scene({ roof: 'gable', panels: 9, batt: 2, hour: 15, pop: null, gen: 2.8, charge: 0.9, dis: 0, grid: 0, exp: 0, intro: true }).replace(/ data-act="[a-z]+"/g, '').replace(/cursor:pointer/g, 'cursor:default');
    return `<div class="login"><section class="login-hero"><a class="brand" href="#/"><svg width="34" height="34" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="6" fill="#FFB800"/><g stroke="#FFB800" stroke-width="2.4" stroke-linecap="round"><path d="M14 2v3M14 23v3M2 14h3M23 14h3M5.5 5.5l2 2M20.5 20.5l2 2M22.5 5.5l-2 2M7.5 20.5l-2 2"/></g></svg><b>SolarFlow</b></a>
      <h1>See your solar savings before you sign.</h1><p>Size a home system, watch your bill change as you design it, then follow permits and installation to the last bolt.</p>${svg}</section>
      <section class="login-form"><div class="login-card"><h2>Sign in</h2><p class="muted">This is a demonstration workspace with sample projects. Choose an account to explore it.</p>
      ${grp('For homeowners', ACCOUNTS.slice(0, 1))}${grp('For the SolarFlow team', ACCOUNTS.slice(1))}</div></section></div>`;
  }

  // ---------- charts ----------
  function hbars(items, o) {
    o = o || {}; const mx = o.max || Math.max.apply(null, items.map(i => Math.abs(i.v))) || 1;
    return items.map(i => `<div class="hbar"><span>${esc(i.l)}</span><div class="bar"><i style="width:${Math.min(100, Math.abs(i.v) / mx * 100)}%;background:${i.c || 'var(--deep)'}"></i></div><span class="right">${i.t != null ? i.t : (o.fmt || (x => x))(i.v)}</span></div>`).join('');
  }
  function monthChart(s) {
    const W = 700, H = 230, l = 48, b = 28, t = 12, r = 8, mx = Math.max.apply(null, s.map(x => Math.max(x.actual, x.promised))) * 1.15;
    const bw = (W - l - r) / s.length, y = v => t + (H - t - b) * (1 - v / mx);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = mx * i / 4; g += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v / 100) / 10}k</text>`; }
    s.forEach((x, i) => { const bx = l + i * bw + bw * 0.2; g += `<rect x="${bx}" y="${y(x.actual)}" width="${bw * 0.6}" height="${H - b - y(x.actual)}" rx="3" fill="${x.nm ? '#14304a' : '#d9826f'}"><title>${x.m}: actual ${peso(x.actual)}</title></rect><text x="${bx + bw * 0.3}" y="${H - 10}" text-anchor="middle">${x.m}</text>`; });
    g += `<line x1="${l}" x2="${W - r}" y1="${y(s[0].promised)}" y2="${y(s[0].promised)}" stroke="#f2a900" stroke-width="2.5" stroke-dasharray="6 4"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly bill promised versus actual">${g}</svg>
      <div class="legend"><span><i style="background:#f2a900"></i>Promised bill (estimate)</span><span><i style="background:#d9826f"></i>Actual — net metering not yet approved</span><span><i style="background:#14304a"></i>Actual — net metering approved</span></div>`;
  }
  function hourChart(h) {
    const W = 700, H = 230, l = 44, b = 22, t = 10, r = 8, sh = 60;
    const mx = Math.max.apply(null, h.load.concat(h.gen)) * 1.15 || 1, bw = (W - l - r) / 24, y = v => t + (H - t - b) * (1 - v / mx);
    let g = '';
    for (let i = 0; i <= 3; i++) { const v = mx * i / 3; g += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`; }
    g += `<text x="4" y="12">kWh/h</text>`;
    h.grid.forEach((v, i) => { if (v > 0.001) g += `<rect x="${l + i * bw + 2}" y="${y(v)}" width="${bw - 4}" height="${H - b - y(v)}" fill="#d1495b" opacity=".75"><title>${i}:00 grid draw ${v.toFixed(2)} kWh</title></rect>`; });
    const pathG = h.gen.map((v, i) => (i ? 'L' : 'M') + (l + (i + 0.5) * bw) + ' ' + y(v)).join(' ');
    g += `<path d="${pathG} L${l + 23.5 * bw} ${H - b} L${l + 0.5 * bw} ${H - b} Z" fill="#f2a900" opacity=".35"/><path d="${pathG}" fill="none" stroke="#c98900" stroke-width="2"/>`;
    g += `<path d="${h.load.map((v, i) => (i ? 'L' : 'M') + (l + (i + 0.5) * bw) + ' ' + y(v)).join(' ')}" fill="none" stroke="#14304a" stroke-width="2.5"/>`;
    for (let i = 0; i < 24; i += 3) g += `<text x="${l + (i + 0.5) * bw}" y="${H - 6}" text-anchor="middle">${i}:00</text>`;
    const H2 = sh + 20, cap = h.cap || 1, y2 = v => 8 + (sh - 8) * (1 - v / cap);
    let g2 = `<text x="4" y="12">Battery</text><text x="${l - 6}" y="${y2(cap) + 4}" text-anchor="end">100%</text><text x="${l - 6}" y="${y2(0) + 4}" text-anchor="end">0%</text>`;
    if (h.cap > 0) g2 += `<path d="${h.soc.map((v, i) => (i ? 'L' : 'M') + (l + (i + 0.5) * bw) + ' ' + y2(v)).join(' ')} L${l + 23.5 * bw} ${y2(0)} L${l + 0.5 * bw} ${y2(0)} Z" fill="#3b82c4" opacity=".4"/>`; else g2 += `<text x="${l + 10}" y="40">No battery in this design</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Hourly load, solar and grid draw">${g}</svg><svg viewBox="0 0 ${W} ${H2}" width="100%">${g2}</svg>
      <div class="legend"><span><i style="background:#14304a"></i>Household load</span><span><i style="background:#f2a900"></i>Solar output</span><span><i style="background:#d1495b"></i>Drawn from grid</span><span><i style="background:#3b82c4"></i>Battery charge</span></div>`;
  }

  // ---------- shared pieces ----------
  const sim = '<span class="sim">simulated data</span>';
  const DRV = { weather: { l: 'Weather / season', c: '#3b82c4' }, load: { l: 'Higher household load', c: '#8b6bc9' }, nm: { l: 'Net metering not yet approved', c: '#f2a900' } };
  function pills(p) {
    const L = ['1 Intake & site', '2 Quotation', '3 Release & accept', '4 Permits', '5 Installation', '6 After-sales'];
    return '<div class="pills">' + L.map((l, i) => {
      const n = i + 1; let c = '', x = '';
      if (n <= 3) c = p.stage > n ? 'done' : p.stage === n ? 'now' : '';
      else if (n === 4) { if (p.permit) { c = p.permit.approved ? 'done' : p.permit.submitted ? 'wait' : 'now'; if (c === 'wait') x = ' · awaiting utility'; } }
      else if (n === 5) { if (p.install) c = p.install.qa ? 'done' : 'now'; }
      else c = p.stage === 6 ? 'now' : '';
      return `<span class="pill ${c}">${l}${x}</span>`;
    }).join('') + '</div>';
  }
  function permitStats(p) { const it = p.permit ? p.permit.items : []; return { ok: it.filter(i => i.status === 'ok').length, miss: it.filter(i => i.status === 'missing'), pend: it.filter(i => i.status === 'pending'), total: it.length }; }
  function flags(p) {
    const f = [];
    if (p.stage === 1 && Math.abs(p.appKwh - p.kwh) / p.kwh > 0.25) f.push({ k: '', t: `Conflict: appliance list implies about ${Math.round(p.appKwh)} kWh/month but the electric bill shows about ${Math.round(p.kwh)} kWh. Confirm usage during the site visit before sizing.` });
    if (p.final && Math.abs(p.quoteDelta) > 0.1) f.push({ k: 'bad', t: `Final quotation differs from the indicative estimate by ${pct(p.quoteDelta)}. Record the reason and tell the customer before release (large gaps lower acceptance).` });
    if (p.permit) {
      const s = permitStats(p);
      s.miss.forEach(i => f.push({ k: 'bad', t: `Missing requirement: ${i.n} (${i.track}, ${p.utility}).` }));
      s.pend.forEach(i => f.push({ k: '', t: `Pending: ${i.n} has been waiting ${i.days} days.` }));
      if (p.permit.submitted && !p.permit.approved) f.push({ k: 'info', t: 'Submitted. Approval comes from the utility or LGU; keep tracking the deadline.' });
    }
    if (p.install && !p.install.tech && !p.install.qa) f.push({ k: '', t: 'No technician assigned yet. See the suggestions below.' });
    if (p.stage === 6) {
      const s = D.series(p), last = s[s.length - 1], g = (last.actual - last.promised) / last.promised;
      if (g > 0.2) { const top = Object.keys(last.parts).sort((a, b) => Math.abs(last.parts[b]) - Math.abs(last.parts[a]))[0]; f.push({ k: 'bad', t: `Variance warning: latest bill is ${pct(g)} above the promised bill. Largest driver: ${DRV[top].l.toLowerCase()} (${signed(last.parts[top])}).` }); }
    }
    return f;
  }

  // ---------- views ----------
  // ---------- plan your system (guided, 4 steps) ----------
  const kw1 = n => Math.round(n * 10) / 10;
  const yrs = n => (!isFinite(n) || n > 40) ? '40+ yrs' : n.toFixed(1) + ' yrs';
  const hr12 = h => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? ' am' : ' pm');
  const Z = (E, cfg) => M.sizeCfg(E.tier, E.kwh, E.dayShare, E.rate, cfg);
  const isChanged = E => E.cfg.panels !== E.tpl.panels || E.cfg.batt !== E.tpl.batt || E.cfg.mon !== E.tpl.mon;
  function cfgNote(E) {
    const t = E.tpl, c = E.cfg, ch = [];
    if (c.panels !== t.panels) ch.push((c.panels > t.panels ? '+' : '−') + Math.abs(c.panels - t.panels) + ' panels');
    if (c.batt !== t.batt) ch.push((c.batt > t.batt ? '+' : '−') + Math.abs(c.batt - t.batt) + ' kWh battery');
    if (c.mon !== t.mon) ch.push(c.mon ? '+ monitoring' : '− monitoring');
    return ' — roof type (customer\'s choice): ' + Scene.NAMES[c.roof] + (ch.length ? ' — customized: ' + ch.join(', ') : ' — template unchanged');
  }

  // live bill statement (stays beside every step; updated in place so the bars animate)
  function statementHTML() {
    const E = UI.est, cur = Z(E, E.cfg);
    const row = (k, l, col) => `<div class="st-row"><div class="st-top"><span>${l}</span><b data-v="${k}"></b></div><div class="st-bar"><i data-w="${k}" style="background:${col}"></i></div></div>`;
    return `<h3>Your monthly electric bill</h3>${row('today', 'Today', '#8794A1')}${row('pending', 'With solar, until net metering is approved', '#F5B700')}${row('approved', 'With solar, after net metering is approved', '#3FD0C9')}
      <div class="st-tear"></div><div class="st-line"><span>System price</span><b data-v="cost"></b></div><div class="st-line"><span>Pays for itself in</span><b data-v="payback"></b></div>
      <p class="st-note">Your bill will not reach ₱0. There is a minimum charge of about ${peso(M.FIXED)}, and evening use still comes from the grid.</p>`;
  }
  function updateStatement() {
    const E = UI.est, el = $('#statement'); if (!el || !E.res) return; const cur = Z(E, E.cfg), v = { today: cur.baseBill, pending: cur.billNoNM, approved: cur.billNM };
    Object.keys(v).forEach(k => { el.querySelector(`[data-v="${k}"]`).textContent = peso(v[k]); el.querySelector(`[data-w="${k}"]`).style.width = Math.max(2, Math.min(100, v[k] / cur.baseBill * 100)).toFixed(1) + '%'; });
    el.querySelector('[data-v="cost"]').textContent = peso(cur.cost); el.querySelector('[data-v="payback"]').textContent = yrs(cur.paybackNM);
  }

  const capOf = E => Math.max(1, Math.min(M.roofFit(E.roofIn, E.roofIn.type).panels, Scene.CAPS[E.roofIn.type]));
  // the house scene: sun position follows the hour slider, panel and battery slots are clickable
  function sceneHTML(E, cur) {
    const c = E.cfg, h = M.hourly({ kwh: E.kwh, dayShare: E.dayShare, kw: cur.kw, batt: c.batt }, E.rainy ? 0.3 : 1), H = E.hour, d = h.soc[H] - h.soc[(H + 23) % 24];
    return Scene.scene({ roof: c.roof, panels: c.panels, batt: c.batt / M.BATT_STEP, hour: H, pop: E.pop, gen: h.gen[H], charge: Math.max(0, d), dis: Math.max(0, -d), grid: h.grid[H], exp: h.exp[H] });
  }
  function updateScene() { const E = UI.est, el = $('#scenewrap'); if (el) el.innerHTML = sceneHTML(E, Z(E, E.cfg)); }
  // one sunny or rainy day, hour by hour
  function dayHTML(E, cur) {
    const c = E.cfg, h = M.hourly({ kwh: E.kwh, dayShare: E.dayShare, kw: cur.kw, batt: c.batt }, E.rainy ? 0.3 : 1), H = E.hour;
    const W = 640, Ht = 190, l = 34, r = 8, t = 8, b = 22, bw = (W - l - r) / 24, mx = (Math.max.apply(null, h.load.concat(h.gen, h.grid)) || 1) * 1.2;
    const y = v => t + (Ht - t - b) * (1 - v / mx), x = i => l + (i + 0.5) * bw, base = y(0);
    let g = ''; for (let i = 0; i <= 3; i++) { const v = mx * i / 3; g += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="#E6EAEC"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`; }
        h.grid.forEach((v, i) => { if (v > 0.005) g += `<rect x="${l + i * bw + 2}" y="${y(v)}" width="${bw - 4}" height="${base - y(v)}" fill="#D9534F" opacity=".85"/>`; });
    const line = a => a.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    g += `<path d="${line(h.gen)} L${x(23)} ${base} L${x(0)} ${base} Z" fill="#F5B700" opacity=".45"/><path d="${line(h.gen)}" fill="none" stroke="#C99200" stroke-width="1.5"/><path d="${line(h.load)}" fill="none" stroke="#18222C" stroke-width="2.5"/>`;
    for (let i = 0; i < 24; i += 3) g += `<text x="${x(i)}" y="${Ht - 6}" text-anchor="middle">${hr12(i)}</text>`;
    g += `<line x1="${x(H)}" x2="${x(H)}" y1="${t}" y2="${base}" stroke="#18222C" stroke-width="1.5"/><circle cx="${x(H)}" cy="${y(h.load[H])}" r="4.5" fill="#18222C"/>`;
    const cap = h.cap || 1, sy = v => 6 + 38 * (1 - v / cap);
    const sv = c.batt ? `<svg viewBox="0 0 ${W} 56" width="100%" role="img" aria-label="Battery charge through the day"><text x="${l - 6}" y="${sy(cap) + 4}" text-anchor="end">100%</text><text x="${l - 6}" y="${sy(0) + 4}" text-anchor="end">0%</text><path d="${h.soc.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + sy(v).toFixed(1)).join(' ')} L${x(23)} ${sy(0)} L${x(0)} ${sy(0)} Z" fill="#0E8C86" opacity=".5"/><line x1="${x(H)}" x2="${x(H)}" y1="6" y2="44" stroke="#18222C" stroke-width="1.5"/></svg>` : '<p class="muted small" style="margin:2px 0 0">No battery in this design, so the grid covers every hour without sun.</p>';
    const gen = h.gen[H], load = h.load[H], d = h.soc[H] - h.soc[(H + 23) % 24], dis = Math.max(0, -d), chg = Math.max(0, d), direct = Math.min(gen, load), imp = h.grid[H], exp = h.exp[H];
    const extra = gen > load + 0.05 ? `<p class="small muted" style="margin:6px 0 0">Extra solar of ${(gen - load).toFixed(1)} kW: ${[chg > 0.05 ? chg.toFixed(1) + ' kW charges the battery' : '', exp > 0.05 ? exp.toFixed(1) + ' kW goes to the grid and earns credit only after net metering is approved' : ''].filter(Boolean).join(', ')}.</p>` : '';
    return `<svg viewBox="0 0 ${W} ${Ht}" width="100%" role="img" aria-label="Home usage and solar output by hour">${g}</svg>${c.batt ? '<div class="small muted" style="margin-top:6px">Battery charge</div>' : ''}${sv}
      <div class="read"><div>At <b>${hr12(H)}</b> your home uses <b>${load.toFixed(1)} kW</b>, supplied by</div><div class="src"><span><i style="background:#F5B700"></i>Solar ${direct.toFixed(1)} kW</span><span><i style="background:#0E8C86"></i>Battery ${dis.toFixed(1)} kW</span><span><i style="background:#D9534F"></i>Grid ${imp.toFixed(1)} kW</span></div>${extra}</div>`;
  }
  function updateDay() { const E = UI.est, el = $('#daywrap'); if (el) el.innerHTML = dayHTML(E, Z(E, E.cfg)); updateScene(); }
  function sourcesHTML(E, cur) {
    const r = M.calc({ kwh: E.kwh, dayShare: E.dayShare, kw: cur.kw, batt: E.cfg.batt, rate: E.rate, nm: true }), p = [['Solar', r.direct, '#F5B700'], ['Battery', r.battShift, '#0E8C86'], ['Grid', r.gridKwh, '#D9534F']];
    return `<div class="stack">${p.map(x => `<i style="width:${x[1] / r.load * 100}%;background:${x[2]}" title="${x[0]}"></i>`).join('')}</div><div class="src">${p.map(x => `<span><i style="background:${x[2]}"></i>${x[0]} ${pct(x[1] / r.load)} · ${Math.round(x[1])} kWh</span>`).join('')}</div>`;
  }
  function notesFor(E, cur) {
    const c = E.cfg, n = [];
    if (!isChanged(E)) n.push(['ok', `This is the ${E.opts[E.pickI].label.toLowerCase()} design, sized from your bill and appliances. You can continue with it as it is.`]);
    if (cur.offset > 1.2) n.push(['bad', `These panels would make about ${pct(cur.offset)} of your usage. Surplus earns only ₱${M.EXPORT_RATE}/kWh after net metering and nothing before it, so extra panels lengthen payback.`]);
    if (cur.offset < 0.4) n.push(['', `Solar would cover only about ${pct(cur.offset)} of your usage, so most of your bill will remain.`]);
    if (cur.exportedKwh > 0.3 * cur.gen) n.push(['', `Until net metering is approved, about ${Math.round(cur.exportedKwh)} kWh a month of daytime output earns no credit.`]);
    if (c.batt === 0) n.push(['info', 'With no battery, evenings run on the grid and there is no backup in a blackout.']);
    else { const hh = M.hourly({ kwh: E.kwh, dayShare: E.dayShare, kw: cur.kw, batt: c.batt }, 1); n.push(hh.depletedAt >= 0 ? ['info', `On a sunny day the battery runs out around ${hr12(hh.depletedAt)}. After that you draw from the grid.`] : ['ok', 'On a sunny day the battery lasts through the evening.']); }
    if (c.panels >= capOf(E)) n.push(['info', `Your roof is full at ${capOf(E)} panels (${M.PANEL_AREA} m² each, edges kept clear). Our engineer measures the real roof.`]);
    return n.map(x => `<div class="flag ${x[0]}">${x[1]}</div>`).join('');
  }
  function hint(E, cur, n, what) {
    if (!n) return `<div class="hint">That is the most ${what} this prototype allows.</div>`;
    const dc = n.cost - cur.cost, sa = cur.billNM - n.billNM, sb = cur.billNoNM - n.billNoNM;
    return `<div class="hint">One more costs ${peso(dc)} and saves ${peso(sb)} a month before net metering, ${peso(sa)} after${sa > 5 ? '. It pays for itself in ' + yrs(dc / (sa * 12)) : '. It adds almost no savings'}.</div>`;
  }

  const GROUPS = [['Cooling', ['ac', 'fan']], ['Kitchen', ['fridge', 'rice']], ['Living', ['tv', 'light', 'wfh']], ['Laundry and more', ['wash', 'pump']]];
  const PRESETS = { small: { fridge: 1, fan: 2, tv: 1, light: 1, rice: 1 }, family: { ac: 2, fridge: 1, fan: 3, tv: 2, light: 1, wash: 1, rice: 1 }, wfh: { ac: 1, fridge: 1, fan: 2, tv: 1, light: 1, wfh: 1, rice: 1 }, clear: {} };
  function homeSumHTML(E) {
    const util = D.CITIES.find(c => c[0] === E.city)[1], rate = D.UTILITIES[util].rate, bk = Math.max(100, ((+E.bill || 0) - M.FIXED) / rate), st = D.appStats(E.apps), ak = st.kwhMonth, any = E.apps.some(a => a.on);
    const diff = any ? Math.abs(ak - bk) / bk : 0, mx = Math.max(bk, ak, 1);
    const chip = !any ? '<span class="chip blue">Using your bill only</span>' : diff < 0.2 ? '<span class="chip ok">Close match. We will use your bill.</span>' : `<span class="chip warn">Appliances differ by ${Math.round(diff * 100)}%. We still use your bill.</span>`;
    return `<h3>Your estimate so far</h3><div class="big">${Math.round(bk)} <small>kWh a month</small></div>
      <div class="hs-row"><span>From your bill</span><b>${Math.round(bk)} kWh</b></div><div class="st-bar"><i style="width:${bk / mx * 100}%;background:#14263B"></i></div>
      <div class="hs-row"><span>From appliances</span><b>${any ? Math.round(ak) + ' kWh' : 'none added'}</b></div><div class="st-bar"><i style="width:${any ? ak / mx * 100 : 0}%;background:#F5B700"></i></div>
      <p style="margin:12px 0 0">${chip}</p><p class="small muted" style="margin:10px 0 0">${any ? 'About ' + pct(st.dayShare) + ' of your appliance use is in the daytime, when panels produce the most.' : 'Appliances are optional. Add some for a sharper estimate of daytime use.'}</p>`;
  }
  // ---------- roof, goal and design helpers (round 2) ----------
  const pk = n => '₱' + Math.round(n / 1000).toLocaleString('en-PH') + 'k';
  const rng2 = (a, b, f) => f(a) + ' to ' + f(b);
  const GOAL_T = { cover: 'Cover my electricity', budget: 'Stay within a budget', payback: 'Pay back fastest', night: 'Power at night' };
  const NAMES3 = { 'Lowest cost': 'Just enough', 'Best fit': 'Comfortable', 'Most coverage': 'All you can fit' };
  const roofFitE = E => M.roofFit(E.roofIn, E.roofIn.type);
  const goalOf = g => g.type === 'cover' ? { type: 'cover', pct: g.pct } : g.type === 'budget' ? { type: 'budget', amount: g.amount } : { type: g.type };
  function solve(E, g) { return M.solveGoal(g || goalOf(E.goal), 'value', E.kwh, E.dayShare, E.rate, capOf(E), roofFitE(E).yf); }
  // is a design inside the customer's goal? (used by customer, designs and engineer screens)
  function goalCheck(goal, r, bestPb) {
    if (!goal || goal.type === 'usual') return { met: true, text: '' };
    if (goal.type === 'cover') { const met = r.cover >= goal.pct / 100 - 1e-9; return { met, text: met ? `Meets your goal of covering ${goal.pct}% of your use (${pct(r.cover)}).` : `Your goal was ${goal.pct}%. This design reaches ${pct(r.cover)}, ${Math.round(goal.pct - r.cover * 100)} points short.` }; }
    if (goal.type === 'budget') { const met = r.cost <= goal.amount; return { met, text: met ? `Within your budget of ${peso(goal.amount)} (${peso(r.cost)}).` : `Your budget was ${peso(goal.amount)}. This design costs ${peso(r.cost)}, ${peso(r.cost - goal.amount)} over.` }; }
    if (goal.type === 'night') { const met = r.nightCover >= 0.5; return { met, text: met ? `Covers about ${pct(r.nightCover)} of your night use.` : `Your goal was power at night. This design covers only ${pct(r.nightCover)} of night use.` }; }
    const met = bestPb == null || r.paybackNM <= bestPb * 1.1; return { met, text: met ? `Pays for itself in ${yrs(r.paybackNM)}, close to the fastest possible.` : `Your goal was the fastest payback. This design takes ${yrs(r.paybackNM)}, longer than the ${yrs(bestPb)} you could have had.` };
  }
  function computeOpts(E) {
    const cap = capOf(E), yf = roofFitE(E).yf, g = E.goal;
    if (g.type === 'usual') {
      E.unmet = false;
      return ['low', 'value', 'high'].map((t, i) => { const tp = M.template(t, E.kwh), cfg = { panels: Math.max(1, Math.min(tp.panels, cap)), batt: tp.batt, mon: tp.mon, yf }, res = M.sizeCfg(t, E.kwh, E.dayShare, E.rate, cfg);
        return { label: ['Lowest cost', 'Best fit', 'Most coverage'][i], name: M.TIERS[t].label, tier: t, res, cfg, fit: Math.min(1, res.cover / 0.85) }; });
    }
    const r = solve(E); E.unmet = r.unmet;
    return r.designs.map(d => Object.assign({ name: NAMES3[d.label] }, d));
  }
  function applyPick(E) {
    const o = E.opts[E.pickI]; E.tier = o.tier; E.tpl = { panels: o.cfg.panels, batt: o.cfg.batt, mon: o.cfg.mon };
    E.cfg = Object.assign({}, E.tpl, { roof: E.roofIn.type, yf: o.cfg.yf });
  }
  function recompute() { const E = UI.est; E.opts = computeOpts(E); E.res = E.opts; E.pickI = 1; applyPick(E); }
  const bestPbOf = E => E.opts ? Math.min.apply(null, E.opts.map(o => o.res.paybackNM)) : null;
  function fitLabel(E, r) { const g = E.goal; return g.type === 'budget' ? `${peso(r.cost)} of your ${peso(g.amount)}` : g.type === 'payback' ? `Pays for itself in ${yrs(r.paybackNM)}` : g.type === 'night' ? `Covers ${pct(r.nightCover)} of your night use` : `Covers ${pct(r.cover)} of your use`; }

  // roof plan drawn to scale: panels 2.28 x 1.13 m, 0.4 m kept clear at the edges
  function planSVG(f, o) {
    const W = 400, H = 230, pad = 16, sc = Math.min((W - 2 * pad) / f.L, (H - 2 * pad - 8) / f.W), rw = f.L * sc, rh = f.W * sc, x0 = (W - rw) / 2, y0 = (H - rh) / 2 - 2;
    const pw = M.PANEL_L * sc, ph = M.PANEL_W * sc, gap = 0.05 * sc, sb = M.SETBACK * sc, pos = i => [x0 + sb + Math.floor(i / f.rows) * (pw + gap), y0 + sb + (i % f.rows) * (ph + gap)];
    const sh = { none: 0, some: 0.2, heavy: 0.4 }[o.shade || 'none'], n = o.panels, cap = Math.min(f.panels, f.slots), rem = o.removed || [n, n];
    let g = `<rect x="${x0}" y="${y0}" width="${rw}" height="${rh}" rx="3" fill="#E9E0CC" stroke="#8A7F66" stroke-width="2"/><rect x="${x0 + sb}" y="${y0 + sb}" width="${rw - 2 * sb}" height="${rh - 2 * sb}" fill="none" stroke="#B45309" stroke-width="1" stroke-dasharray="5 4"/>`;
    if (sh) g += `<rect x="${x0 + rw * (1 - sh)}" y="${y0}" width="${rw * sh}" height="${rh}" fill="rgba(20,30,45,.16)"/>`;
    for (let i = 0; i < f.slots; i++) { const [x, y] = pos(i), on = i < n, add = !on && i < cap, red = i >= rem[0] && i < rem[1];
      const a = o.click && (on || add) ? ` data-act="slot" data-i="${i}" style="cursor:pointer"` : '';
      if (red) g += `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="rgba(185,28,28,.12)" stroke="#B91C1C" stroke-dasharray="5 4" stroke-width="1.5"/>`;
      else if (on) g += `<rect${a} x="${x}" y="${y}" width="${pw}" height="${ph}" fill="#1E3A5F" stroke="#0B1830"/>`;
      else if (add && o.showAdd) g += `<rect${a} x="${x}" y="${y}" width="${pw}" height="${ph}" fill="rgba(255,184,0,.16)" stroke="#B45309" stroke-dasharray="5 4"/>${i === n ? `<text x="${x + pw / 2}" y="${y + ph / 2 + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#8A4B00" style="pointer-events:none">+ add</text>` : ''}`; }
    g += `<text x="${x0 + rw / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#4B5563">${f.L.toFixed(1)} m</text><text x="${x0 - 4}" y="${y0 + rh / 2}" text-anchor="end" font-size="11" fill="#4B5563" transform="rotate(-90 ${x0 - 4} ${y0 + rh / 2})">${f.W.toFixed(1)} m</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${o.label || 'Roof plan drawn to scale'}">${g}</svg>`;
  }

  // ---------- step 1: your home ----------
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function readBill(E, name, size, src) {
    const util = D.CITIES.find(c => c[0] === E.city)[1], rate = D.UTILITIES[util].rate, h = D.hash(name + ':' + size), amount = 3000 + (h % 60) * 100, d = new Date();
    return { src, name, state: 'done', f: { provider: util, amount, kwh: Math.round((amount - M.FIXED) / rate), period: MON[(d.getMonth() + 11) % 12] + ' ' + (d.getMonth() ? d.getFullYear() : d.getFullYear() - 1) }, flag: { provider: 0, amount: 0, kwh: 1, period: 1 } };
  }
  function intakeHTML(E) {
    const it = E.intake; if (!it) return '';
    if (it.state === 'reading') return `<div class="flag info" role="status"><b class="who">Reading</b>Reading “${esc(it.name)}” (simulated)…</div>`;
    const row = (k, l, type) => `<div class="irow"><label for="ib-${k}">${l}</label><input id="ib-${k}" type="${type}" data-i="${k}" value="${esc(it.f[k])}"><span class="chip ${it.flag[k] ? 'warn' : 'ok'}">${it.flag[k] ? 'Please check' : 'Clear'}</span></div>`;
    return `<div class="intake"><div class="flag info"><b class="who">Simulation</b>This demo does not really read your file. The numbers below are sample values made from the file name. In the real system, a bill reader fills these in and you check them.</div>
      ${row('provider', 'Provider', 'text')}${row('amount', 'Amount due (₱)', 'number')}${row('kwh', 'Electricity used (kWh)', 'number')}${row('period', 'Billing period', 'text')}
      <div class="rowb" style="margin-top:8px"><span class="muted small">Fix anything that looks wrong, then use the numbers.</span><button class="alt" data-act="useRead">${it.used ? 'Numbers in use ✓' : 'Use these numbers'}</button></div></div>`;
  }
  function roofCardHTML(E) {
    const r = E.roofIn, sz = (k, l) => `<button class="${r.mode === 'size' && r.size === k ? 'on' : ''}" data-act="rsz" data-k="${k}" aria-pressed="${r.mode === 'size' && r.size === k}">${l}<small>${M.SIZES[k]} m²</small></button>`;
    const sel = (k, opts, v) => `<select data-r="${k}" aria-label="${k}">${opts.map(o => `<option value="${o[0]}" ${o[0] === v ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    return `<div class="card-s"><div class="rowb"><h2 style="margin:0;font-size:1.05rem">Your roof</h2><button class="link2" data-act="help" data-k="measure">How do I measure my roof?</button></div>
      <div class="rsz" role="group" aria-label="Roof size">${sz('S', 'Small')}${sz('M', 'Medium')}${sz('L', 'Large')}<button class="${r.mode === 'dim' ? 'on' : ''}" data-act="rmode" aria-pressed="${r.mode === 'dim'}">Length × width<small>my own size</small></button></div>
      ${r.mode === 'dim' ? `<div class="dims"><label>Length (m)<input type="number" min="3" max="30" step="0.5" data-r="L" value="${r.L}"></label><span>×</span><label>Width (m)<input type="number" min="3" max="30" step="0.5" data-r="W" value="${r.W}"></label><b>= ${M.roofArea(r).toFixed(0)} m²</b></div>` : ''}
      <div class="form row3b"><label>Roof shape${sel('type', [['flat', 'Flat'], ['shed', 'Shed (one slope)'], ['hip', 'Hip'], ['gable', 'Gable']], r.type)}</label><label>Roof faces${sel('dir', Object.keys(M.DIRS).map(k => [k, M.DIRS[k][0]]), r.dir)}</label><label>Shade${sel('shade', Object.keys(M.SHADES).map(k => [k, M.SHADES[k][0]]), r.shade)}</label></div></div>`;
  }
  function roofAsideHTML(E) {
    const r = E.roofIn, f = roofFitE(E), cap = Math.min(f.panels, Scene.CAPS[r.type]);
    return `<h3>Your roof, to scale</h3>${planSVG(f, { panels: cap, shade: r.shade, label: 'Roof plan with ' + cap + ' panels' })}
      <p style="margin:6px 0 2px"><b>About ${cap} panels fit</b> on your ${f.area.toFixed(0)} m² roof, using about ${f.usable.toFixed(0)} m² after we keep the edges clear and allow for shade and roof shape.</p>
      <p class="small muted" style="margin:0">Each panel is 550 W and about 2.3 m × 1.1 m (2.6 m²). Facing ${M.DIRS[r.dir][0].toLowerCase()} with ${M.SHADES[r.shade][0].toLowerCase()} shade, expect about ${pct(f.yf)} of the best possible output.</p>`;
  }
  function stepHome(E, util, rate) {
    const sel = E.apps[E.sel] || E.apps.find(a => a.on) || E.apps[0], si = E.apps.indexOf(sel), n = E.apps.filter(a => a.on).length, open = E.appsOpen !== false;
    const tile = a => { const i = E.apps.indexOf(a); return `<div class="tile${a.on ? ' has' : ''}${i === si ? ' sel' : ''}"><button class="tl" data-act="sel" data-i="${i}"><b>${a.label.replace(' (1 hp)', '').replace(' (whole house)', '').replace('Work-from-home setup', 'Work from home').replace('Rice cooker / kitchen', 'Rice cooker')}</b><small>${a.hrs} h/day</small></button>
      <div class="st"><button data-act="aq" data-i="${i}" data-d="-1" aria-label="Fewer ${a.label}" ${a.qty ? '' : 'disabled'}>−</button><span aria-live="polite">${a.on ? a.qty : 0}</span><button data-act="aq" data-i="${i}" data-d="1" aria-label="More ${a.label}">+</button></div></div>`; };
    return `<div class="card-s"><div class="rowb" style="margin-bottom:8px"><h2 style="margin:0;font-size:1.05rem">Your electric bill</h2>
      <div class="bsrc" role="group" aria-label="How to add your bill"><label class="pill"><input type="file" accept="image/*" capture="environment" data-b="billfile" data-src="photo" hidden>Take a photo</label><label class="pill"><input type="file" accept="image/*,application/pdf" data-b="billfile" data-src="file" hidden>Upload a file</label><span class="muted small">or type it in</span></div></div>
      <div class="form row3"><label>Your name<input type="text" data-b="name" value="${esc(E.name)}" placeholder="Juan dela Cruz"></label>
      <label>City<select data-b="city">${D.CITIES.map(c => `<option ${c[0] === E.city ? 'selected' : ''}>${c[0]}</option>`).join('')}</select></label>
      <label>Monthly electric bill (₱)<input type="number" data-b="bill" value="${E.bill}" min="1000" step="100" ${E.err ? 'aria-invalid="true" aria-describedby="billerr"' : ''}>${E.err && !E.err.startsWith('Add') ? `<span class="err" id="billerr" role="alert">${E.err}</span>` : ''}</label></div>
      <label class="slider" style="margin-top:8px"><span class="muted small">${util}, about ₱${rate}/kWh</span><input type="range" min="1000" max="20000" step="100" value="${Math.min(20000, Math.max(1000, +E.bill || 1000))}" data-act="billr" aria-label="Monthly bill"></label>
      <div id="intake">${intakeHTML(E)}</div></div>
    ${roofCardHTML(E)}
    <div class="card-s grow"><div class="rowb" style="align-items:center;gap:16px"><div><h2 style="margin:0;font-size:1.05rem">What runs at home? <span class="chip">Optional</span> <span class="muted small">${n ? n + ' added' : ''}</span></h2></div>
      <div class="presets">${open ? `<button class="pill" data-act="preset" data-k="small">Small home</button><button class="pill" data-act="preset" data-k="family">Family with aircon</button><button class="pill" data-act="preset" data-k="wfh">Work from home</button><button class="pill dash" data-act="preset" data-k="clear">Clear</button>` : ''}<button class="pill" data-act="aopen" aria-expanded="${open}">${open ? 'Hide' : 'Show appliances'}</button></div></div>
      ${open ? `<div class="agrid">${GROUPS.map(g => `<div><p class="grp">${g[0]}</p>${g[1].map(id => E.apps.find(a => a.id === id)).filter(Boolean).map(tile).join('')}</div>`).join('')}</div>
      <div class="astrip"><b>${sel.label}${sel.on ? ', ' + sel.qty + (sel.qty > 1 ? ' units' : ' unit') : ''}</b><label class="slider" style="flex:1"><span class="muted small">Hours a day</span><input type="range" min="0.5" max="24" step="0.5" value="${sel.hrs}" data-act="ahrs" data-i="${si}" aria-label="Hours a day for ${sel.label}"></label><b id="ahv">${sel.hrs} h</b></div>` : '<p class="muted small" style="margin:6px 0 0">Your bill already tells us most of what we need. Add appliances only for a sharper estimate of daytime use.</p>'}
      ${E.err && E.err.startsWith('Add') ? `<div class="flag bad" role="alert">${E.err}</div>` : ''}</div>`;
  }

  // ---------- step 2: your goal ----------
  function goalMeaning(E, t) {
    const g = E.goal;
    if (t === 'cover') return `Solar would make about ${Math.round(E.kwh * g.pct / 100).toLocaleString('en-PH')} kWh of your ${Math.round(E.kwh)} kWh a month.`;
    if (t === 'budget') { const r = solve(E, { type: 'budget', amount: g.amount }), b = r.designs[2].res; return r.unmet ? `Even the smallest system costs ${peso(r.designs[0].res.cost)}, more than this.` : `Up to ${peso(g.amount)}. The most that buys on your roof is about ${Math.round(b.gen)} kWh a month, ${pct(b.cover)} of your use.`; }
    if (t === 'payback') { const r = solve(E, { type: 'payback' }); return `We look for the design that earns back its price soonest: about ${yrs(r.designs[1].res.paybackNM)} on your roof.`; }
    return `You use about ${Math.round(E.kwh * (1 - E.dayShare))} kWh a month after dark. A battery moves daytime solar to the evening.`;
  }
  function goalPreview(E) {
    const g = E.goal, r = solve(E), d = r.designs; let s;
    if (!r.unmet) return '<div class="flag ok">Your roof can meet this goal. Next, you will see three designs.</div>';
    if (g.type === 'cover') s = `Your roof can make at most ${pct(d[2].res.cover)} of your use, below ${g.pct}%. We will show the closest design.`;
    else if (g.type === 'budget') s = `The smallest system costs ${peso(d[0].res.cost)}, above ${peso(g.amount)}. We will show the closest design.`;
    else s = `The most evening power your roof allows is ${pct(d[2].res.nightCover)} of your night use. We will show the closest design.`;
    return `<div class="flag bad">${s}</div>`;
  }
  function stepGoal(E) {
    const g = E.goal, card = (t, ctl) => `<div class="gcard${g.type === t ? ' sel' : ''}"><button class="gh" data-act="gtype" data-t="${t}" role="radio" aria-checked="${g.type === t}"><span class="rd"></span><b>${GOAL_T[t]}</b></button>${ctl || ''}<p class="gm" id="gm-${t}">${goalMeaning(E, t)}</p></div>`;
    return `<h2 style="margin:0 0 2px">What matters most to you?</h2><p class="muted" style="margin:0 0 12px">Pick one. We shape three designs around it. You can change it later.</p>
      <div class="gcards" role="radiogroup" aria-label="Your goal">
      ${card('cover', `<label class="slider"><span class="muted small">Share of your electricity</span><input type="range" min="30" max="100" step="5" value="${g.pct}" data-act="gpct" aria-label="Share of electricity to cover"><b id="gp-val">${g.pct}%</b></label>`)}
      ${card('budget', `<label class="gin">Budget (₱)<input type="number" min="50000" step="10000" value="${g.amount}" data-g="amount"></label>`)}
      ${card('payback')}${card('night')}</div>
      <div id="gprev" style="margin-top:12px">${goalPreview(E)}</div>`;
  }
  function stepGoalAside(E) {
    const f = roofFitE(E);
    return `<h3>What we know so far</h3><div class="hs-row"><span>Your use</span><b>${Math.round(E.kwh)} kWh a month</b></div><div class="hs-row"><span>Daytime share</span><b>${pct(E.dayShare)}</b></div><div class="hs-row"><span>Roof room</span><b>${Math.min(f.panels, Scene.CAPS[E.roofIn.type])} panels</b></div><div class="hs-row"><span>Rate</span><b>₱${E.rate}/kWh</b></div>
      <p class="small muted" style="margin:10px 0 0">A kWh (kilowatt-hour) is the unit on your bill. Tap “Words” at the top any time for plain-language meanings.</p>`;
  }

  // ---------- step 3: designs for the goal ----------
  function whyText(E) {
    const o = E.opts, g = E.goal, nm = r => `${r.panels} panel${r.panels > 1 ? 's' : ''}${r.batt ? ' and a ' + r.batt + ' kWh battery' : ''}`;
    const intro = g.type === 'cover' ? `You asked to cover ${g.pct}% of your use.` : g.type === 'budget' ? `You asked to stay within ${peso(g.amount)}.` : g.type === 'payback' ? 'You asked for the fastest payback.' : g.type === 'night' ? 'You asked for power at night.' : 'You chose the usual recommendation.';
    return `${E.unmet ? 'Your goal cannot be fully met on this roof, so these are the closest designs. ' : ''}${intro} <b>Lowest cost</b> is the cheapest design that fits: ${nm(o[0].res)}, ${peso(o[0].res.cost)}. <b>Best fit</b> balances your goal with price: ${nm(o[1].res)}, ${peso(o[1].res.cost)}. <b>Most coverage</b> pushes furthest: ${nm(o[2].res)}, ${pct(o[2].res.cover)} of your use.`;
  }
  function stepDesigns(E) {
    const sw = Object.keys(GOAL_T).map(t => `<button class="${E.goal.type === t ? 'on' : ''}" data-act="gswitch" data-t="${t}" aria-pressed="${E.goal.type === t}">${GOAL_T[t].replace('Cover my electricity', 'Cover my use').replace('Stay within a budget', 'Budget')}</button>`).join('');
    const g = E.goal, sub = g.type === 'cover' ? `Goal: cover <b>${g.pct}%</b> of your electricity.` : g.type === 'budget' ? `Goal: stay within <b>${peso(g.amount)}</b>.` : g.type === 'usual' ? 'Showing the usual recommendation.' : `Goal: <b>${GOAL_T[g.type].toLowerCase()}</b>.`;
    const cards = E.opts.map((o, i) => { const s = o.res, sel = E.pickI === i, c = goalCheck(g.type === 'usual' ? null : (g.type === 'payback' ? g : g), s, bestPbOf(E));
      return `<div class="tcard${sel ? ' sel' : ''}">${i === 1 ? '<span class="rec">Best fit for your goal</span>' : ''}<small class="lbl">${o.label}</small><h3>${o.name}</h3>
        <div class="fitl">${fitLabel(E, s)}</div><div class="fit" role="img" aria-label="Goal fit ${Math.round(o.fit * 100)} percent"><i style="width:${Math.max(4, Math.round(o.fit * 100))}%;background:${o.fit >= 0.99 ? 'var(--green)' : 'var(--amber)'}"></i></div>
        <div class="big">${peso(s.cost)}</div><div class="est">estimate: ${rng2(s.costLo, s.costHi, pk)}</div>
        <div class="rows"><div><span>System</span><b>${s.panels} panels, ${kw1(s.kw)} kW</b></div><div><span>Battery</span><b>${s.batt ? s.batt + ' kWh' : 'None'}</b></div><div><span>Bill after net metering</span><b>${peso(s.billNM)} a month</b></div><div><span>Pays for itself in</span><b>${yrs(s.paybackNM)}</b></div></div>
        <button class="${sel ? 'alt' : 'line'}" data-act="pick" data-i="${i}" aria-pressed="${sel}">${sel ? 'Selected' : 'Choose this'}</button></div>`; }).join('');
    return `<div class="rowb" style="gap:12px;flex-wrap:wrap;margin-bottom:10px"><div><h2 style="margin:0">Three designs for your goal</h2><p class="muted" style="margin:2px 0 0">${sub} Change it any time.</p></div><div class="seg4" role="group" aria-label="Goal">${sw}</div></div>
      ${E.unmet ? `<div class="flag bad" role="alert" style="margin-bottom:10px"><b class="who">Goal not fully met</b>${goalCheck(goalOf(g), E.opts[2].res).text.replace(/^Your goal was/, 'Your goal was')} These are the closest designs your roof allows.</div>` : ''}
      <div class="tcards">${cards}</div>
      <div class="whybox"><div><b>Why these three?</b> <span class="chip blue">Automatic explanation. Numbers come from the calculator.</span></div><p>${whyText(E)}</p><p class="small muted" style="margin:0">Prices and bills are estimates (shown as ranges) until our engineer checks your roof. <span class="u" data-act="gl" data-t="kwh">kWh</span> is the unit on your bill. <span class="u" data-act="gl" data-t="nm">Net metering</span> is the utility crediting power you send back.</p></div>`;
  }

  // ---------- step 4: fine-tune ----------
  const GLOSS = [
    ['kw', 'kW (kilowatt)', 'How much power the panels can make at one moment. 1 kW runs about ten ceiling fans.'],
    ['kwh', 'kWh (kilowatt-hour)', 'Energy over time, and what your bill counts. 1 kWh runs a 1 hp aircon for about an hour.'],
    ['nm', 'Net metering', 'The utility credits power you send back. It is approved by the utility, not by us, so your bill falls by less until then.'],
    ['payback', 'Payback', 'How many years of savings it takes to equal what you paid.'],
    ['inverter', 'Inverter', 'The box that turns panel power into power your home can use.'],
    ['battery', 'Battery', 'Stores daytime solar for the evening. Measured in kWh. Bigger means more hours after dark.'],
    ['panel', 'Solar panel', 'We use 550 W panels, about 2.3 m × 1.1 m (2.6 m²) each.'],
    ['cover', 'Coverage', 'The share of your monthly electricity (kWh) that solar makes over a month.'],
    ['price', 'Price', 'The total you pay, installed. Shown as an estimate until the engineer checks your roof.']
  ];
  const TOUR = [
    { sel: '#t-plan', t: 'Your roof, to scale', b: 'This drawing shows your roof and the panels on it. The dashed line is the edge we keep clear. Tap a panel spot to add or remove one.' },
    { sel: '#t-pan', t: 'Add or remove panels', b: 'Tap + to add a panel and − to remove one. The picture and the prices update right away.' },
    { sel: '#t-bat', t: 'Choose a battery', b: 'A battery stores daytime solar for the evening. None is fine. It simply costs less.' },
    { sel: '#t-met', t: 'What it means for you', b: 'These four numbers are estimates in ranges. Tap a ? for a plain-language meaning.' },
    { sel: '#t-skip', t: 'Not sure? You can skip', b: 'Every design is already a sensible one. Continue with it as it is. Our engineer checks everything on site.' }
  ];
  function designerHTML() {
    const E = UI.est, c = E.cfg, cur = Z(E, c), changed = isChanged(E), cap = capOf(E), f = roofFitE(E), maxB = M.BATT_STEP * M.BATT_MAX, gc = goalCheck(E.goal.type === 'usual' ? null : goalOf(E.goal), cur, bestPbOf(E));
    const bset = Array.from({ length: M.BATT_MAX + 1 }, (_, i) => i * M.BATT_STEP).map(n => `<button class="${c.batt === n ? 'on' : ''}" data-act="batset" data-n="${n}" aria-pressed="${c.batt === n}">${n ? n : 'None'}</button>`).join('');
    const used = c.panels * M.PANEL_AREA, tot = Math.max(used, f.usable), view = E.fview === 'house' ? 'house' : 'plan';
    const qm = k => `<button class="q" data-act="gl" data-t="${k}" aria-label="What does this mean?">?</button>`;
    const met = (l, k, v, rg, mean) => `<div class="m"><small>${l} ${qm(k)}<em class="estt">estimate</em></small><b>${v}</b><span class="rgn">${rg}</span><p>${mean}</p></div>`;
    return `<div class="ft"><div class="ft-l">
      <div class="banner"><div><b>${changed ? 'Your custom design' : 'Starting from the ' + E.opts[E.pickI].label.toLowerCase() + ' design'}</b><span class="${gc.text ? (gc.met ? 'gok' : 'gbad') : ''}">${gc.text || (changed ? 'Changed from where you started.' : 'Change anything, or just continue.')}</span></div><button class="line sm" data-act="resetCfg" ${changed ? '' : 'disabled'}>Reset</button></div>
      <div class="sec"><p class="lab">Roof shape <b>${Scene.NAMES[c.roof]}</b></p><div class="rt-btns">${Scene.picker(c.roof)}</div></div>
      <div class="sec" id="t-pan"><p class="lab"><span>Solar panels ${qm('panel')}</span><b>${c.panels} of ${cap} fit</b></p><div class="prow"><div class="stepper"><button class="line" data-act="pan" data-d="-1" ${c.panels <= 1 ? 'disabled' : ''} aria-label="Remove a panel">−</button><b>${c.panels}</b><button class="line" data-act="pan" data-d="1" ${c.panels >= cap ? 'disabled' : ''} aria-label="Add a panel">+</button></div><span class="muted small right">${kw1(cur.kw)} kW<br>about ${Math.round(cur.gen)} kWh a month</span></div>
        <p class="hint2">Each panel is about 2.3 m × 1.1 m (2.6 m²), 550 W. Your roof has room for ${cap}.</p></div>
      <div class="sec" id="t-bat"><p class="lab"><span>Battery ${qm('battery')}</span><b>${c.batt ? c.batt + ' kWh' : 'None'}</b></p><div class="seg5" role="group" aria-label="Battery size in kWh">${bset}</div>
        <p class="hint2">${c.batt ? c.batt + ' kWh runs lights, fans and a fridge (about 0.9 kW) for roughly ' + Math.round(c.batt) + ' hours at night.' : 'No battery: evenings run on the grid, and there is no backup in a blackout.'}</p>
        <label class="chk" style="margin-top:6px"><input type="checkbox" data-act="mon" ${c.mon ? 'checked' : ''}> Monitoring and surge protection, ${peso(M.MON_PRICE)}</label></div>
      <div class="sec skipbox" id="t-skip"><b>Not sure about any of this?</b><span class="muted small">Skip it. The recommended design is already set.</span><button class="alt" data-act="go" data-s="5">Use this design and continue</button></div>
    </div><div class="ft-r">
      <div class="stage"><div class="vtabs" role="tablist"><button class="${view === 'plan' ? 'on' : ''}" data-act="fview" data-v="plan" role="tab" aria-selected="${view === 'plan'}">Roof plan</button><button class="${view === 'house' ? 'on' : ''}" data-act="fview" data-v="house" role="tab" aria-selected="${view === 'house'}">House view</button></div>
      ${view === 'plan' ? `<div class="plancard" id="t-plan"><div class="rowb"><b>Your roof, to scale</b><span class="small muted">Uses <b>${used.toFixed(0)} of ${tot.toFixed(0)} m²</b> of usable roof</span></div><div class="ubar" role="img" aria-label="${used.toFixed(0)} of ${tot.toFixed(0)} square metres used"><i style="width:${Math.min(100, used / tot * 100).toFixed(0)}%"></i></div>${planSVG(f, { panels: c.panels, shade: E.roofIn.shade, click: true, showAdd: true, label: 'Roof plan with ' + c.panels + ' of ' + cap + ' panels' })}</div>`
        : `<div id="scenewrap">${sceneHTML(E, cur)}</div><div class="stage-bar"><label class="slider scene-slider"><span>See your day</span><input type="range" min="0" max="23" value="${E.hour}" data-act="hour" aria-label="Time of day"><b>${hr12(E.hour)}</b></label></div>`}</div>
      <div class="metrics" id="t-met">${met('Price', 'price', peso(cur.cost), rng2(cur.costLo, cur.costHi, pk), 'What you pay in total, installed.')}${met('Bill after net metering', 'nm', peso(cur.billNM), rng2(cur.billNMLo, cur.billNMHi, peso) + ' a month', 'Once the utility credits your extra power.')}${met('Bill until then', 'nm', peso(cur.billNoNM), 'a month', 'Net metering approval takes weeks.')}${met('Pays for itself', 'payback', yrs(cur.paybackNM), rng2(cur.paybackLo, cur.paybackHi, n => n.toFixed(1)) + ' years', 'Savings add up to the price by then.')}</div>
      <details class="more"><summary>See a full day and where your power comes from</summary><div class="toolbar"><div class="tabs"><button class="${E.rainy ? '' : 'on'}" data-act="dayw" data-w="0">Sunny day</button><button class="${E.rainy ? 'on' : ''}" data-act="dayw" data-w="1">Rainy day</button></div>
        <div class="legend" style="margin:0"><span><i style="background:#F5B700"></i>Solar</span><span><i style="background:#18222C"></i>Home usage</span><span><i style="background:#D9534F"></i>Grid</span><span><i style="background:#0E8C86"></i>Battery</span></div></div><div id="daywrap">${dayHTML(E, cur)}</div>${sourcesHTML(E, cur)}<div style="margin-top:12px">${notesFor(E, cur)}</div></details>
    </div></div>`;
  }

  // ---------- step 5: review ----------
  function stepReview(E) {
    const c = E.cfg, t = E.tpl, cur = Z(E, c), base = Z(E, t), changed = isChanged(E), o = E.opts[E.pickI], gc = goalCheck(E.goal.type === 'usual' ? null : goalOf(E.goal), cur, bestPbOf(E)), f = roofFitE(E);
    const row = (l, a, b, fn, dir) => { const df = b - a, same = Math.abs(df) < 0.5, cls = same || !dir ? '' : ((df < 0) === (dir < 0) ? 'good' : 'bad'); return `<tr><td>${l}</td><td>${fn(a)}</td><td><b>${fn(b)}</b>${same ? '' : ` <span class="dlt ${cls}">${df > 0 ? '+' : '−'}${fn(Math.abs(df))}</span>`}</td></tr>`; };
    return `<div class="prop"><span class="chip blue">Draft proposal · estimate</span><h2>${esc(E.name || 'Your')} solar proposal</h2><p class="muted">Our site engineer will visit, check your roof and wiring, and may suggest changes. Nothing is final until you accept.</p>
      ${gc.text ? `<div class="flag ${gc.met ? 'ok' : 'bad'}" style="margin:0 0 8px">${gc.text}</div>` : ''}
      <table class="cmp"><tr><th></th><th>${o.label} design</th><th>Your design</th></tr>${row('Price (estimate ' + rng2(cur.costLo, cur.costHi, pk) + ')', base.cost, cur.cost, peso, -1)}${row('Panels', t.panels, c.panels, n => n + ', ' + kw1(n * M.PANEL_KW) + ' kW', 0)}${row('Battery', t.batt, c.batt, n => n ? n + ' kWh' : 'none', 0)}${row('Solar output', base.gen, cur.gen, n => Math.round(n) + ' kWh a month', 0)}
        ${row('Bill until net metering is approved', base.billNoNM, cur.billNoNM, n => peso(n) + ' a month', -1)}${row('Bill after net metering is approved', base.billNM, cur.billNM, n => peso(n) + ' a month', -1)}${row('Pays for itself in', Math.min(41, base.paybackNM), Math.min(41, cur.paybackNM), yrs, -1)}</table>
      <div class="prop-r"><div>${notesFor(E, cur)}</div>
      <h3 style="margin-top:14px">What to expect</h3><ul class="tight"><li>Today you pay about ${peso(cur.baseBill)} a month. After installation, about ${peso(cur.billNoNM)} until the utility approves net metering, then about ${peso(cur.billNM)} (estimate ${rng2(cur.billNMLo, cur.billNMHi, peso)}).</li><li>Your roof: ${f.area.toFixed(0)} m², facing ${M.DIRS[E.roofIn.dir][0].toLowerCase()}, ${M.SHADES[E.roofIn.shade][0].toLowerCase()} shade. The engineer measures the real roof.</li><li>Net metering is approved by the utility, not by us. We prepare and track the papers.</li><li>Output is lower in the wet season, June to October, by up to ${pct(1 - Math.min.apply(null, M.SEASON))} in the weakest months.</li></ul></div></div>`;
  }
  function wizBar(E) {
    if (E.step === 1) return `<button class="link" data-act="calc" data-skip="1">Skip appliances. Use my bill only</button><span class="sp"></span><button class="alt big-b" data-act="calc">Continue to your goal</button>`;
    if (E.step === 2) return `<button class="line" data-act="go" data-s="1">Back</button><span class="sp"></span><button class="link" data-act="usual">Skip. Use the usual recommendation</button><button class="alt big-b" data-act="goalnext">Show me three designs</button>`;
    if (E.step === 3) return `<button class="line" data-act="go" data-s="2">Back</button><span class="sp"></span><button class="line" data-act="go" data-s="4">Customize this design</button><button class="alt big-b" data-act="go" data-s="5">Looks good. Continue</button>`;
    if (E.step === 4) return `<button class="line" data-act="go" data-s="3">Back</button><span class="sp"></span><span class="muted small hide-s" style="max-width:420px;text-align:right">Nothing is final. Our engineer checks your roof before the final quote.</span><button class="alt big-b" data-act="go" data-s="5">Continue to review</button>`;
    return `<button class="line" data-act="go" data-s="4">Back</button><span class="sp"></span><button class="alt big-b" data-act="submitEst">${isChanged(E) ? 'Send my design to the engineer' : 'Send this design to the engineer'}</button>`;
  }
  function estimatorView() {
    if (!UI.est) UI.est = { name: '', city: 'Marikina', bill: 6500, apps: JSON.parse(JSON.stringify(D.APPLIANCES)).map(a => Object.assign(a, { qty: a.on ? a.qty : 0 })), sel: 0, tier: 'value', step: 1, hour: 13, rainy: false, res: null, roofIn: { mode: 'size', size: 'M', L: 8, W: 5, dir: 'south', shade: 'none', type: 'flat' }, goal: { type: 'cover', pct: 80, amount: 300000 }, fview: 'plan' };
    const E = UI.est, util = D.CITIES.find(c => c[0] === E.city)[1], rate = D.UTILITIES[util].rate;
    if (!E.res) E.step = 1;
    const names = ['Your home', 'Your goal', 'Pick a design', 'Fine-tune', 'Review'];
    const nav = names.map((l, i) => `<button class="${E.step === i + 1 ? 'on' : E.res && E.step > i + 1 ? 'done' : ''}" data-act="go" data-s="${i + 1}" ${i && !E.res ? 'disabled' : ''}><span class="n">${E.res && E.step > i + 1 ? '✓' : i + 1}</span>${l}</button>`).join('');
    const body = [() => stepHome(E, util, rate), () => stepGoal(E), () => stepDesigns(E), () => '<div id="designer">' + designerHTML() + '</div>', () => stepReview(E)][E.step - 1]();
    const side = E.step === 1 ? `<aside id="hsum" class="statement"><div id="roofaside">${roofAsideHTML(E)}</div><div id="billsum" style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">${homeSumHTML(E)}</div></aside>` : E.step === 2 ? `<aside class="statement">${stepGoalAside(E)}</aside>` : E.step === 5 ? `<aside id="statement" class="statement">${statementHTML()}</aside>` : '';
    return `<div class="wizhead"><h1>Plan your solar system</h1><div class="steps">${nav}</div><div class="whbtn"><button class="gbtn" data-act="tour">? Guide</button><button class="gbtn" data-act="gl" data-t="">Words</button></div></div>
      <div class="wiz s${E.step}"><section>${body}</section>${side}</div><div class="wizbar">${wizBar(E)}</div>`;
  }

  // ---------- guide tour and glossary (overlay layer, survives re-renders) ----------
  function renderOverlay() {
    const o = $('#overlay'); if (!o) return; const E = UI.est, onEst = E && /estimator/.test(location.hash) && S.authed; let h = '';
    document.querySelectorAll('.tour-hl').forEach(x => x.classList.remove('tour-hl'));
    if (onEst && E.tour != null && E.step === 4) {
      const i = E.tour, tp = TOUR[i]; h += `<div class="tour-dim"></div><div class="tour-card" id="tourcard" role="dialog" aria-label="Guide"><div class="muted small" style="font-weight:700;text-transform:uppercase;letter-spacing:.05em">Tip ${i + 1} of ${TOUR.length}</div><b style="font-size:1.05rem;display:block;margin:4px 0">${tp.t}</b><p style="margin:0 0 12px;line-height:1.45">${tp.b}</p>
        <div class="rowb"><button class="link2" data-act="tourend">Skip the tour</button><div style="display:flex;gap:8px"><button class="line" data-act="tourgo" data-d="-1" ${i ? '' : 'disabled'}>Back</button><button class="alt" data-act="tourgo" data-d="1">${i === TOUR.length - 1 ? 'Done' : 'Next'}</button></div></div></div>`;
    }
    if (onEst && E.gloss) {
      const q = (E.gloss.q || '').toLowerCase(), list = GLOSS.filter(g => !q || (g[1] + g[2]).toLowerCase().includes(q));
      h += `<aside class="gdrawer" aria-label="Words explained"><div class="rowb"><b style="font:700 1.25rem 'Bricolage Grotesque',sans-serif">Words explained</b><button class="line sm" data-act="glclose" aria-label="Close">×</button></div><input type="search" id="glq" placeholder="Search a word" value="${esc(E.gloss.q || '')}" aria-label="Search a word"><div id="glist">${glistHTML(list, E.gloss.hl)}</div></aside>`;
    }
    o.innerHTML = h;
    if (onEst && E.tour != null && E.step === 4) { const t = TOUR[E.tour], el = document.querySelector(t.sel), card = $('#tourcard'); if (el && card) { el.classList.add('tour-hl'); if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); const r = el.getBoundingClientRect(), w = card.offsetWidth, hh = card.offsetHeight; let x = r.right + 16, y = r.top; if (x + w > innerWidth - 12) { x = Math.max(12, r.left); y = r.bottom + 12; } if (y + hh > innerHeight - 12) y = Math.max(12, innerHeight - hh - 12); card.style.left = x + 'px'; card.style.top = y + 'px'; } }
  }
  const glistHTML = (list, hl) => list.map(g => `<div class="gl${g[0] === hl ? ' hl' : ''}"><b>${g[1]}</b><p>${g[2]}</p></div>`).join('') || '<p class="muted small">No match. Try another word.</p>';

  // ---------- engineer site review, design versions, customer revision ----------
  const CHECKS = [['roof', 'Roof condition', 'Structure, material, age'], ['area', 'Roof size and usable area', 'Measured on site'], ['shade', 'Shading', 'Trees and neighbouring walls'], ['elec', 'Electrical panel and wiring', 'Capacity, grounding, breaker space'], ['batt', 'Battery location', 'Ventilated, dry, 1 m clearance'], ['util', 'Utility connection', 'Meter, distance, net metering eligibility']];
  const RZ = (p, cfg) => M.sizeCfg(p.tier, p.kwh, p.dayShare, p.rate, cfg);
  function siteOf(p) {
    if (!p.site) { p.site = { checks: {}, usable: Math.round(M.roofFit(p.roof || {}, p.cfg.roof).usable), photos: 0, note: '' }; CHECKS.forEach(c => { p.site.checks[c[0]] = { r: 'pass', why: '' }; }); }
    const s = p.site; s.rsn = s.rsn || {}; s.draft = s.draft || Object.assign({}, p.cfg); return s;
  }
  const custUsable = p => Math.round(M.roofFit(p.roof || {}, p.cfg.roof).usable);
  function stateTag(p) {
    const r = p.rev; if (p.stage !== 1 || !r) return null;
    return { awaiting: ['Awaiting customer reply', 'warn'], returned: ['Returned to customer', 'bad'], asked: ['Customer asked a question', 'warn'], original: ['Kept original, second visit needed', 'info'], accepted: ['Customer accepted version 2', 'ok'] }[r.status] || null;
  }
  const tagChip = p => { const t = stateTag(p); return t ? `<span class="chip ${t[1]}">${t[0]}</span>` : ''; };
  function revRows(p) {
    const r = p.rev, a = r.v1.size || RZ(p, r.v1.cfg), b = r.v2.size, c1 = r.v1.cfg, c2 = r.v2.cfg, why = k => (r.reasons.find(x => x.k === k) || {}).reason || '';
    return [
      { l: 'Solar panels', a: c1.panels, b: c2.panels, why: why('panels'), ch: c1.panels !== c2.panels },
      { l: 'Battery', a: c1.batt ? c1.batt + ' kWh' : 'None', b: c2.batt ? c2.batt + ' kWh' : 'None', why: why('batt'), ch: c1.batt !== c2.batt },
      { l: 'Usable roof', a: (r.v1.area || '') + ' m²', b: (r.v2.area || '') + ' m²', why: why('area') || 'Measured on site', ch: r.v1.area !== r.v2.area },
      { l: 'Price', a: peso(a.cost), b: peso(b.cost), why: Math.abs(b.cost - a.cost) < 1 ? 'No change' : peso(Math.abs(b.cost - a.cost)) + (b.cost < a.cost ? ' less' : ' more'), ch: Math.abs(b.cost - a.cost) >= 1 },
      { l: 'Covers your use', a: pct(a.cover), b: pct(b.cover), why: '', ch: Math.abs(b.cover - a.cover) > 0.005 }];
  }
  function engineerReview(p) {
    const s = siteOf(p), r = p.rev, staff = S.role === 'engineer', st = r && r.status, locked = !staff || p.stage !== 1 || st === 'awaiting' || st === 'accepted';
    const cap = Math.max(1, Math.min(M.ROOF_MAX, Math.floor(s.usable / M.PANEL_AREA))), d = s.draft, v1 = RZ(p, p.cfg), v2 = RZ(p, d), same = d.panels === p.cfg.panels && d.batt === p.cfg.batt && d.mon === p.cfg.mon;
    const gl = goalCheck(p.goal, v2, v1.paybackNM);
    const ck = CHECKS.map(c => { const x = s.checks[c[0]], sg = ['pass', 'adjust', 'fail'].map(k => `<button class="${x.r === k ? k : ''}" data-act="sck" data-id="${p.id}" data-k="${c[0]}" data-v="${k}" aria-pressed="${x.r === k}" ${locked ? 'disabled' : ''}>${k[0].toUpperCase() + k.slice(1)}</button>`).join('');
      return `<div class="ck"><div><b>${c[1]}</b><small>${c[0] === 'area' ? `Customer said ${custUsable(p)} m² usable. You measured ${s.usable} m².` : c[2]}</small></div><div class="sg" role="group" aria-label="${c[1]}">${sg}</div>${x.r !== 'pass' ? `<input class="why" data-site="why.${c[0]}" value="${esc(x.why)}" placeholder="Reason the customer will read (required)" aria-label="Reason for ${c[1]}" ${locked ? 'disabled' : ''}>` : ''}</div>`; }).join('');
    const rows = [['panels', 'Panels', p.cfg.panels, d.panels], ['batt', 'Battery', p.cfg.batt + ' kWh', d.batt + ' kWh'], ['area', 'Usable roof', custUsable(p) + ' m²', s.usable + ' m²']].map(x => { const ch = x[0] === 'panels' ? p.cfg.panels !== d.panels : x[0] === 'batt' ? p.cfg.batt !== d.batt : custUsable(p) !== s.usable;
      return `<div class="dr${ch ? ' chg' : ''}"><b>${x[1]}</b><span>${x[2]}</span><span>→</span><b>${x[3]}</b>${ch ? `<input data-site="rsn.${x[0]}" value="${esc(s.rsn[x[0]] || '')}" placeholder="Reason (required)" aria-label="Reason for ${x[1]}" ${locked ? 'disabled' : ''}>` : '<span class="muted">No change</span>'}</div>`; }).join('');
    const dl = (a, b, f, good) => { const x = b - a; return Math.abs(x) < 0.005 ? '' : `<span class="dlt ${(x < 0) === good ? 'good' : 'bad'}">${x > 0 ? '+' : '−'}${f(Math.abs(x))}</span>`; };
    const imp = `<div class="imp"><div><small>Price</small><b>${peso(v2.cost)}</b> ${dl(v1.cost, v2.cost, peso, true)}</div><div><small>Output</small><b>${kw1(v2.kw)} kW</b> ${dl(v1.kw, v2.kw, n => kw1(n), false)}</div><div><small>Covers</small><b>${pct(v2.cover)}</b> ${dl(v1.cover, v2.cover, n => Math.round(n * 100) + ' pts', false)}</div><div><small>Payback</small><b>${yrs(v2.paybackNM)}</b> ${dl(v1.paybackNM, v2.paybackNM, n => n.toFixed(1), true)}</div></div>`;
    const err = UI.engErr && UI.engErr.id === p.id ? `<div class="flag bad" role="alert">${esc(UI.engErr.t)}</div>` : '';
    const ask = st === 'asked' ? `<div class="card"><h3>Customer question</h3><p>“${esc(r.question)}”</p>${staff ? `<textarea data-site="reply" rows="2" placeholder="Your answer" aria-label="Your answer">${esc(s.reply || '')}</textarea><button class="alt" data-act="revReply" data-id="${p.id}">Send answer</button>` : ''}</div>` : '';
    const banner = st === 'awaiting' ? '<div class="flag info">Version 2 was sent. Waiting for the customer to accept, ask a question or keep their original.</div>' : st === 'returned' ? `<div class="flag warn">Returned to the customer. Reason: ${esc(r.why)} To fix: ${esc(r.fix)}</div>` : st === 'original' ? '<div class="flag warn">The customer kept their original design. A second site visit is needed. Decide again after it.</div>' : st === 'accepted' ? '<div class="flag ok">The customer accepted version 2.</div>' : '';
    return `${banner}${ask}<div class="grid g2"><section class="card"><h3>1. Site checks</h3><p class="muted small" style="margin:0 0 4px">Any Adjust or Fail needs a reason the customer will read.</p>${ck}
        <div class="sitebtns"><button class="line" data-act="photo" data-id="${p.id}" ${locked ? 'disabled' : ''}>Add site photos (${s.photos})</button></div><label class="small" style="display:block;margin-top:8px">Note for the customer<textarea data-site="note" rows="2" ${locked ? 'disabled' : ''} placeholder="Anything else the customer should know">${esc(s.note)}</textarea></label></section>
      <section style="display:flex;flex-direction:column;gap:14px"><div class="card"><h3>2. Change the design <span class="chip">Customer's version stays on record</span></h3>
        <div class="dr h"><span>Item</span><span>Customer</span><span></span><span>Yours</span><span>Reason</span></div>${rows}
        ${locked ? '' : `<div class="engctl"><span>Panels</span><div class="stepper"><button class="line" data-act="sPan" data-id="${p.id}" data-d="-1" aria-label="Remove a panel" ${d.panels <= 1 ? 'disabled' : ''}>−</button><b>${d.panels}</b><button class="line" data-act="sPan" data-id="${p.id}" data-d="1" aria-label="Add a panel" ${d.panels >= cap ? 'disabled' : ''}>+</button></div><span>Battery</span><div class="seg5">${[0, 5, 10, 15, 20].map(n => `<button class="${d.batt === n ? 'on' : ''}" data-act="sBat" data-id="${p.id}" data-n="${n}">${n ? n : 'None'}</button>`).join('')}</div><label>Usable roof (m²)<input type="number" min="5" max="120" step="1" data-site="usable" value="${s.usable}"></label></div>`}
        ${imp}${gl.text && !gl.met ? `<div class="flag warn" style="margin-top:8px">${gl.text} The customer will be told.</div>` : gl.text ? `<div class="flag ok" style="margin-top:8px">${gl.text}</div>` : ''}</div>
      <div class="card"><h3>3. Decision</h3>${err}${locked ? '<p class="muted small">Decisions are open to the site engineer while the project is waiting on the engineer.</p>' : `<div class="decide"><button class="alt" data-act="eng" data-k="changes" data-id="${p.id}">Approve with changes</button><button class="line" data-act="eng" data-k="asis" data-id="${p.id}">Approve as the customer designed</button></div>
        <div class="retbox"><b class="small">Return to customer</b><input data-site="retWhy" value="${esc(s.retWhy || '')}" placeholder="Reason" aria-label="Reason to return"><input data-site="retFix" value="${esc(s.retFix || '')}" placeholder="What the customer needs to fix" aria-label="What to fix"><button class="line danger" data-act="eng" data-k="return" data-id="${p.id}">Return to customer</button></div>
        <p class="small muted" style="margin:6px 0 0">Approving with changes sends version 2 to the customer. The quotation waits until they accept it.</p>`}</div></section></div>`;
  }
  const rlog = (p, text, who) => log(p, text, who, 'rev');
  function engDecide(p, k) {
    const s = siteOf(p), fail = m => { UI.engErr = { id: p.id, t: m }; render(); };
    const bad = CHECKS.filter(c => s.checks[c[0]].r !== 'pass' && !s.checks[c[0]].why.trim());
    if (k !== 'return' && bad.length) return fail('Add a reason for: ' + bad.map(c => c[1]).join(', ') + '.');
    const d = s.draft, same = d.panels === p.cfg.panels && d.batt === p.cfg.batt && d.mon === p.cfg.mon, anyFail = CHECKS.some(c => s.checks[c[0]].r === 'fail');
    UI.engErr = null;
    if (k === 'asis') {
      if (anyFail) return fail('A failed check cannot be approved as designed. Approve with changes, or return to the customer.');
      if (!p.approvals[1].includes('engineer')) p.approvals[1].push('engineer'); if (p.rev) p.rev.status = 'accepted';
      rlog(p, 'Site assessment done. Approved the customer’s design as it is (version ' + (p.ver || 1) + ').'); advance(p); save(); toast('Approved as designed'); render(); return;
    }
    if (k === 'changes') {
      if (same && custUsable(p) === s.usable) return fail('No change yet. Change the design, or choose “Approve as the customer designed”.');
      const miss = ['panels', 'batt', 'area'].filter(x => (x === 'panels' ? p.cfg.panels !== d.panels : x === 'batt' ? p.cfg.batt !== d.batt : custUsable(p) !== s.usable) && !(s.rsn[x] || '').trim());
      if (miss.length) return fail('Add a reason for each changed item.');
      const reasons = ['panels', 'batt', 'area'].filter(x => s.rsn[x]).map(x => ({ k: x, reason: s.rsn[x].trim() }));
      D.propose(p, Object.assign({}, d), reasons, s.note, 'awaiting', userOf(S.role).n); p.rev.v1.area = custUsable(p); p.rev.v2.area = s.usable;
      rlog(p, `Site assessment done. Proposed design version 2: ${d.panels} panels and ${d.batt ? d.batt + ' kWh battery' : 'no battery'} instead of ${p.cfg.panels} panels and ${p.cfg.batt ? p.cfg.batt + ' kWh battery' : 'no battery'}. Waiting for the customer.`); save(); toast('Version 2 sent to the customer'); render(); return;
    }
    if (!(s.retWhy || '').trim() || !(s.retFix || '').trim()) return fail('Returning to the customer needs a reason and what to fix.');
    p.rev = { status: 'returned', by: userOf(S.role).n, why: s.retWhy.trim(), fix: s.retFix.trim(), v1: { cfg: Object.assign({}, p.cfg) } };
    rlog(p, 'Returned to the customer. Reason: ' + s.retWhy.trim() + ' To fix: ' + s.retFix.trim()); save(); toast('Returned to the customer'); render();
  }

  // customer view of the engineer's changes (customer project page)
  function revisionCard(p) {
    const r = p.rev; if (!r || p.stage !== 1) return '';
    if (r.status === 'returned') return `<div class="card revcard"><span class="chip bad">Needs your action</span><h2>Our engineer sent your design back</h2><div class="flag bad"><b class="who">Reason</b>${esc(r.why)}</div><div class="flag info"><b class="who">What to fix</b>${esc(r.fix)}</div><button class="alt" data-act="revResend" data-id="${p.id}">I fixed it. Send my design again</button></div>`;
    if (r.status === 'asked') return `<div class="card revcard"><span class="chip warn">Waiting for the engineer</span><h2>Your question was sent</h2><p>“${esc(r.question)}”</p><p class="muted small">Our engineer will answer here.</p></div>`;
    if (r.status === 'original') return `<div class="card revcard"><span class="chip info">Second visit needed</span><h2>You kept your original design</h2><p class="muted">Our engineer will visit again to confirm it. The quotation waits until then.</p></div>`;
    if (r.status === 'accepted') return `<div class="card revcard"><span class="chip ok">Accepted</span><h2>You accepted the engineer's version</h2><p class="muted">Staff are now verifying the data and preparing your quotation.</p></div>`;
    const rows = revRows(p), f = M.roofFit(p.roof || {}, p.cfg.roof), a = r.v1.size || RZ(p, r.v1.cfg), b = r.v2.size, gc = goalCheck(p.goal, b, a.paybackNM);
    const ask = UI.ask === p.id ? `<div style="margin-top:8px"><textarea data-site="q" rows="3" placeholder="Type your question for the engineer" aria-label="Your question"></textarea><button class="alt" data-act="revSend" data-id="${p.id}" style="margin-top:6px">Send question</button></div>` : '';
    return `<div class="card revcard"><span class="chip warn">Needs your reply</span><h2>Our engineer visited and suggests a change</h2><p class="muted" style="margin:0 0 10px">Nothing is final until you accept. Your original design stays on record.</p>
      <div class="grid g2" style="align-items:start"><div><div class="cmpr h"><span>Item</span><span>Your design</span><span></span><span>Suggested</span><span>Reason</span></div>${rows.map(x => `<div class="cmpr${x.ch ? ' ch' : ''}"><b>${x.l}</b><span>${x.a}</span><span>→</span><b>${x.b}</b><span class="${x.ch ? '' : 'muted'}">${x.ch ? esc(x.why) : 'No change'}</span></div>`).join('')}
        ${gc.text ? `<div class="flag ${gc.met ? 'ok' : 'warn'}" style="margin-top:8px">${gc.text}</div>` : ''}${r.note ? `<div class="enote"><b>Note from your engineer, ${esc(r.by)}</b><p>“${esc(r.note)}”</p></div>` : ''}</div>
        <div><div class="plancard">${planSVG(f, { panels: r.v2.cfg.panels, removed: [r.v2.cfg.panels, r.v1.cfg.panels], shade: (p.roof || {}).shade, label: 'Roof plan: panels kept and panels removed' })}<p class="muted small" style="margin:4px 0 0">Dashed red outlines are panels you chose that we suggest removing.</p></div>
        <div class="choices"><button class="alt" data-act="revAccept" data-id="${p.id}">Accept the engineer's version</button><button class="line" data-act="revAskOpen" data-id="${p.id}">Ask the engineer a question</button><button class="line" data-act="revKeep" data-id="${p.id}">Keep my original (needs a second visit)</button>${ask}</div></div></div></div>`;
  }
  function changeLogCard(p) {
    const l = p.log.filter(x => x.k === 'rev'); if (!l.length) return '';
    return `<div class="card"><h2 style="margin:0 0 6px">Change log</h2><p class="muted small" style="margin:0 0 6px">Every change to your design, with who made it.</p><ol class="tl">${l.slice().reverse().map(x => `<li><i></i><div><b>${esc(x.who)}</b> ${esc(x.t)}${x.at ? `<small>${ago(x.at)}</small>` : ''}</div></li>`).join('')}</ol></div>`;
  }

  // first-step preview: the house the customer is about to size, with their own bill beside it
  function previewHTML(E) {
    const svg = Scene.scene({ roof: 'gable', panels: 7, batt: 1, hour: 16, pop: null, gen: 2.1, charge: 0.6, dis: 0, grid: 0, exp: 0 }).replace(/ data-act="[a-z]+"/g, '').replace(/cursor:pointer/g, 'cursor:default');
    return `<aside class="preview" aria-label="Preview of a solar home">${svg}<div class="pv-cap"><b>${peso(+E.bill || 0)}</b><span>is what you pay each month today. Next, we show what this house could cut it to.</span></div></aside>`;
  }
  function redrawDesigner() { const el = $('#designer'); if (el) el.innerHTML = designerHTML(); updateStatement(); UI.est.pop = null; }

  function myProjectView() {
    const p = P(S.myProject); if (!p) return empty('No project yet', 'Start with a free estimate and we will build your project from it.', '<a class="btn alt" href="#/estimate">Plan my solar system</a>');
    const nxt = p.stage === 1 ? (p.rev && p.rev.status === 'awaiting' ? 'Our engineer suggests a change to your design. Please reply below. The quotation waits for your answer.' : p.rev && p.rev.status === 'returned' ? 'Our engineer needs one thing fixed before going on. See below.' : p.rev && p.rev.status === 'asked' ? 'Your question is with the engineer.' : p.rev && p.rev.status === 'original' ? 'A second site visit is being arranged.' : 'We are scheduling a site visit. An engineer will check your roof and wiring.') : p.stage === 2 ? 'Our engineer and manager are preparing your final quotation.' : p.stage === 3 ? (p.released ? 'Your quotation is ready. Review it below and accept when you are comfortable.' : 'Your quotation is approved and will be released to you shortly.') : p.stage === 6 ? 'Your system is running.' : (p.permit && !p.permit.submitted ? 'Upload the remaining documents so we can submit your permit papers.' : 'Permits and installation are moving in parallel. We will message you at each step.');
    let h = `<div class="ph"><div><h1>Hello, ${esc(p.name.split(' ')[0])}</h1><p class="sub">${p.id} · ${esc(p.city)} · ${p.utility} · ${M.TIERS[p.tier].label} design</p></div></div>
      <div class="card dh">${tracker(p)}<p class="nextup"><b>What happens next</b>${esc(nxt)}</p></div>`;
    h += revisionCard(p);
    if (p.stage === 3 && p.released) {
      const d = p.quoteDelta;
      h += `<div class="card quote"><div class="q-h"><span class="chip ok">Proposal ready</span><h2>Your final quotation</h2></div>
        <div class="q-grid"><div class="q-price"><span>Final price</span><b>${peso(p.final.total)}</b><small>${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}% vs your estimate of ${peso(p.indicative.cost)}</small></div>
        <div class="q-list"><div><span>System</span><b>${kw1(p.size.kw)} kW${p.size.batt ? ' + ' + p.size.batt + ' kWh battery' : ''}</b></div><div><span>Bill until net metering</span><b>${peso(p.size.billNoNM)}</b></div><div><span>Bill after net metering</span><b>${peso(p.size.billNM)}</b></div></div></div>
        <p class="muted small">Net metering is approved by the utility, not by us. We prepare and track the papers.</p><button class="alt" data-act="accept" data-id="${p.id}">Accept quotation</button></div>`;
    } else if (p.stage === 3) h += `<div class="card">${empty('Quotation awaiting release', 'It is approved internally. Our staff will release it to you shortly.')}</div>`;
    if (p.permit) {
      const s = permitStats(p);
      h += `<div class="card"><div class="ph" style="margin:0"><h2>Your requirements</h2><span class="chip ${s.ok === s.total ? 'ok' : 'warn'}">${s.ok} of ${s.total} received</span></div><div class="bar" style="margin:6px 0 10px"><i style="width:${s.ok / s.total * 100}%;background:var(--green)"></i></div>
      <p class="muted small">Upload scans or photos instead of handing in paper. We read them to prefill your permit forms. Uploads are simulated in this demo.</p>
      <table>${p.permit.items.map((i, k) => `<tr><td>${esc(i.n)}<div class="muted small">${i.track}</div></td><td>${statusChip(i)}</td><td class="right">${i.status !== 'ok' ? `<button class="line" data-act="upload" data-id="${p.id}" data-k="${k}">Upload</button>` : ''}</td></tr>`).join('')}</table>
      ${p.permit.submitted ? '<p class="small muted">Submitted to the utility or LGU. Their approval time is outside our control; we will keep you updated.</p>' : ''}</div>`;
    }
    h += changeLogCard(p);
    if (p.stage === 6) h += '<div class="card"><h2>Your system is running</h2><p>See how it is performing, and why your bill is what it is, under <a href="#/insights">My bill insights</a>.</p></div>';
    return h;
  }
  function statusChip(i) { return i.status === 'ok' ? `<span class="chip ok">Received${i.source ? ' · ' + (i.source === 'uploaded' ? 'uploaded' : i.source === 'physical' ? 'physical copy' : i.source) : ''}</span>` : i.status === 'pending' ? `<span class="chip warn">${i.days ? 'Pending ' + i.days + ' d' : 'Needs review'}</span>` : '<span class="chip bad">Missing</span>'; }

  function insightsView() {
    const done = S.projects.filter(p => p.stage === 6);
    if (!UI.insProject || !P(UI.insProject) || P(UI.insProject).stage !== 6) UI.insProject = (P(S.myProject) && P(S.myProject).stage === 6) ? S.myProject : (done[0] || {}).id;
    const p = P(UI.insProject);
    if (!p) return '<h1>My bill insights</h1><div class="card">Insights appear once your system is installed and sending data.</div>';
    const s = D.series(p), last = s[s.length - 1], gap = last.actual - last.promised;
    const h = M.hourly({ kwh: p.kwh * last.loadF, dayShare: p.dayShare, kw: p.size.kw, batt: p.size.batt }, UI.rainy ? 0.3 : 1);
    const nmOk = p.nmFrom != null;
    let o = `<h1>Why is my bill what it is?</h1><p class="sub">${sim} Demo accounts: <select data-b="insp">${done.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)} (${x.id})</option>`).join('')}</select></p>
    <div class="grid g4"><div class="card kpi"><span class="muted small">Promised bill</span><div class="big">${peso(last.promised)}</div></div><div class="card kpi"><span class="muted small">Actual bill (${last.m})</span><div class="big">${peso(last.actual)}</div></div>
      <div class="card kpi"><span class="muted small">Difference</span><div class="big" style="color:${gap > 0 ? 'var(--red)' : 'var(--green)'}">${signed(gap)}</div></div><div class="card kpi"><span class="muted small">Net metering</span><div class="big" style="font-size:1.2rem">${nmOk ? '<span class="chip ok">Approved</span>' : '<span class="chip warn">Pending utility approval</span>'}</div></div></div>
    <div class="grid g2"><div class="card"><h2>What explains the difference (${last.m})</h2><p class="muted small">Each step changes one thing at a time, so the amounts add up to the total difference.</p>
      ${hbars(Object.keys(DRV).map(k => ({ l: DRV[k].l, v: last.parts[k], c: DRV[k].c, t: signed(last.parts[k]) })))}
      <ul class="tight small" style="margin-top:10px">${!last.nm ? `<li>Net metering is not approved yet, so about ${Math.round(last.lostCredit / M.EXPORT_RATE)} kWh of extra daytime power earned no credit (${peso(last.lostCredit)} this month).</li>` : ''}
      ${last.parts.weather > 50 ? `<li>Cloudy or rainy weather cut solar output to ${pct(last.genF)} of the yearly average.</li>` : ''}${last.parts.load > 50 ? `<li>Your household used ${pct(last.loadF - 1)} more electricity than when we sized the system.</li>` : ''}</ul></div>
    <div class="card"><h2>Bill by month</h2>${monthChart(s)}</div></div>
    <div class="card"><h2>A day in your home</h2><div class="tabs"><button class="${UI.rainy ? '' : 'on'}" data-act="weather" data-w="0">Sunny day</button><button class="${UI.rainy ? 'on' : ''}" data-act="weather" data-w="1">Rainy day</button></div>
      ${hourChart(h)}<p class="small">On this day you draw about <b>${h.gridTotal.toFixed(1)} kWh</b> from the grid${h.depletedAt >= 0 ? `, mostly because the battery runs out around <b>${h.depletedAt}:00</b>` : ''}. ${UI.rainy ? 'Rain lowers solar charging, so the battery covers less of the evening.' : 'Evening use is high after sunset, when panels are not producing.'}</p></div>
    <div class="card"><h2>Still worried about your bill?</h2><p class="small">The numbers above are what we would tell you if you called. ${p.ticket ? '<span class="chip warn">A service ticket is already open</span>' : '<button class="line" data-act="ticket" data-id="' + p.id + '">Open a service ticket</button>'}</p></div>`;
    return o;
  }


  const STAGES = ['Site assessment', 'Quotation', 'Release and accept', 'Permits', 'Installation', 'After-sales'];
  function stageLabel(p) { if (p.stage <= 3) return STAGES[p.stage - 1]; if (p.stage === 6) return 'After-sales'; return p.permit && p.permit.submitted && !p.permit.approved && p.install && !p.install.qa ? 'Installation, permit with utility' : 'Permits and installation'; }
  function stageStates(p) {
    return STAGES.map((l, i) => { const n = i + 1; let c = '', x = '';
      if (n <= 3) c = p.stage > n ? 'done' : p.stage === n ? 'now' : '';
      else if (n === 4) { if (p.permit) { c = p.permit.approved ? 'done' : p.permit.submitted ? 'wait' : 'now'; if (c === 'wait') x = 'Awaiting utility'; } }
      else if (n === 5) { if (p.install) c = p.install.qa ? 'done' : 'now'; }
      else c = p.stage === 6 ? 'now' : '';
      return { l, c, x, n }; });
  }
  function tracker(p) {
    return `<ol class="trk" aria-label="Project progress">${stageStates(p).map(s => `<li class="${s.c}"><i>${s.c === 'done' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>' : s.n}</i><span>${s.l}${s.x ? `<small>${s.x}</small>` : ''}</span></li>`).join('')}</ol>`;
  }
  function dots(p) { return `<span class="dots" title="${esc(stageLabel(p))}">${stageStates(p).map(s => `<i class="${s.c}"></i>`).join('')}</span>`; }
  function ago(t) { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; return Math.round(h / 24) + ' d ago'; }
  const empty = (t, s, a) => `<div class="empty"><svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="12" fill="#FFB800"/><g stroke="#FFB800" stroke-width="3.5" stroke-linecap="round"><path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4 4M45 45l4 4M49 15l-4 4M19 45l-4 4"/></g></svg><h3>${t}</h3><p>${s}</p>${a || ''}</div>`;

  function panelHTML(p) {
    const g = GATES[p.stage], done = g ? p.approvals[p.stage] : [], can = g && g.need.includes(S.role) && !done.includes(S.role) && !(p.stage === 3 && p.released), f = flags(p);
    const bars = stageStates(p).map(s => `<div class="mb ${s.c}"><i></i><span>${s.l.split(' ')[0]}</span></div>`).join('');
    let a = '';
    if (g) a = `<div class="acard ${isWait(p) ? 'mine' : ''}"><b>${isWait(p) ? 'Your approval is needed' : 'Approvals needed'}</b><div class="muted small">${g.label}.</div><div class="chips2">${g.need.map(r => `<span class="chip ${done.includes(r) ? 'ok' : 'warn'}">${done.includes(r) ? '✓ ' : ''}${ROLES[r].split(' (')[0]}</span>`).join('')}</div>${p.stage === 3 && p.released ? '<div class="muted small">Released. Waiting for the customer.</div>' : `<button class="alt" data-act="approve" data-id="${p.id}" ${can ? '' : 'disabled'}>${can ? 'Approve as ' + ROLES[S.role].split(' (')[0] : 'Waiting on other roles'}</button>`}</div>`;
    return `<div class="phead">${avatar(p.name, 44)}<div><h2>${esc(p.name)}</h2><div class="muted small">${p.id} · ${esc(p.city)} · ${p.utility} · ${M.TIERS[p.tier].label}, ${kw1(p.size.kw)} kW${p.size.batt ? ' + ' + p.size.batt + ' kWh' : ''}</div><div style="margin-top:4px"><span class="chip" title="Design version: 1 is the customer's, 2 is after the engineer's changes">Design v${p.ver || 1}${(p.ver || 1) > 1 ? ' · engineer' : ' · customer'}</span> ${tagChip(p)}</div></div></div><div class="mbars">${bars}</div>${a}
      <div class="facts"><div><span>Usage</span><b>${Math.round(p.kwh)} kWh</b></div><div><span>Daytime share</span><b>${pct(p.dayShare)}</b></div><div><span>Rate</span><b>₱${p.rate}/kWh</b></div><div><span>Panels</span><b>${p.size.panels} (${kw1(p.size.kw)} kW)</b></div><div><span>Battery</span><b>${p.size.batt ? p.size.batt + ' kWh' : 'None'}</b></div><div><span>Automated checks</span><b class="${f.length ? 'bad' : 'good'}">${f.length ? f.length + ' flagged' : 'Nothing flagged'}</b></div></div>
      ${f.length ? `<div class="pflags">${f.slice(0, 2).map(x => `<div class="flag ${x.k}">${x.t}</div>`).join('')}</div>` : ''}
      <h4>Recent activity</h4><ol class="tl">${p.log.slice(-3).reverse().map(x => `<li><i></i><div><b>${esc(x.who)}</b> ${esc(x.t)}${x.at ? `<small>${ago(x.at)}</small>` : ''}</div></li>`).join('') || '<li><div class="muted">No activity yet.</div></li>'}</ol>
      <a class="plink" href="#/project/${p.id}" data-act="open" data-id="${p.id}">Open full project page</a>`;
  }
  function pipelineView() {
    const nW = S.projects.filter(isWait).length, nFlow = S.projects.filter(p => p.stage >= 4 && p.stage < 6).length, nFlag = S.projects.filter(p => flags(p).length).length;
    const q = (UI.q || '').trim().toLowerCase(), F = { all: () => true, wait: isWait, flag: p => flags(p).length > 0, flow: p => p.stage >= 4 && p.stage < 6, cust: p => p.stage === 1 && p.rev && ['awaiting', 'returned'].includes(p.rev.status) };
    const rows = S.projects.slice().sort((x, y) => (isWait(y) - isWait(x)) || x.stage - y.stage).filter(p => (F[UI.pf] || F.all)(p) && (!q || [p.name, p.id, p.city, p.utility].join(' ').toLowerCase().includes(q)));
    const chip = (k, l, n) => `<button class="fchip ${UI.pf === k ? 'on' : ''}" data-act="pf" data-f="${k}" aria-pressed="${UI.pf === k}">${l}<i>${n}</i></button>`;
    let h = `<div class="ph" style="margin-bottom:8px"><h1>Project pipeline</h1></div><div class="kstrip" role="list"><div role="listitem"><b>${nW}</b><span>waiting on you</span></div><div role="listitem"><b>${nFlow}</b><span>in permits or installation</span></div><div role="listitem"><b>${nFlag}</b><span>with open flags</span></div><div role="listitem"><b>${S.projects.length}</b><span>projects in total</span></div></div>
      <div class="fbar" role="group" aria-label="Filter projects">${chip('all', 'All', S.projects.length)}${chip('wait', 'Waiting on me', nW)}${chip('flag', 'Flagged', nFlag)}${chip('cust', 'With customer', S.projects.filter(p => p.stage === 1 && p.rev && ['awaiting', 'returned'].includes(p.rev.status)).length)}${chip('flow', 'In progress', nFlow)}${q ? `<span class="muted small" style="margin-left:auto">Results for “${esc(UI.q)}” <button class="ghost" data-act="clearq">Clear</button></span>` : '<span class="muted small" style="margin-left:auto">Waiting-on-you first</span>'}</div>`;
    if (!rows.length) return h + `<div class="card">${empty('No projects match', q ? 'Try a different name, city or project number.' : 'Nothing in this view right now.', '<button class="line" data-act="pf" data-f="all">Show all projects</button>')}</div>`;
    const sel = rows.find(p => p.id === UI.sel) || rows[0];
    h += `<div class="msplit"><div class="card tablecard"><table class="ptable dense"><thead><tr><th>Project</th><th>City</th><th>Design</th><th>Progress</th><th>Attention</th></tr></thead><tbody>`;
    rows.forEach(p => { const w = isWait(p), fl = flags(p).length;
      h += `<tr class="click ${w ? 'mine' : ''} ${p.id === sel.id ? 'sel' : ''}" tabindex="0" data-act="psel" data-id="${p.id}" aria-selected="${p.id === sel.id}"><td><div class="who2">${avatar(p.name, 28)}<span><b>${esc(p.name)}</b><small>${p.id}</small></span></div></td><td>${esc(p.city)}</td><td>${M.TIERS[p.tier].label}<small class="sm">${kw1(p.size.kw)} kW</small></td><td>${dots(p)}<small class="sm">${esc(stageLabel(p))}</small></td><td>${stateTag(p) ? tagChip(p) : w ? '<span class="chip warn">Your approval</span>' : fl ? `<span class="chip bad">${fl} flag${fl > 1 ? 's' : ''}</span>` : '<span class="chip ok">Clear</span>'}</td></tr>`; });
    return h + `</tbody></table></div><aside class="card side" aria-label="Selected project">${panelHTML(sel)}</aside></div>`;
  }
  function detailView(id) {
    const p = P(id); if (!p) return '<p>Not found.</p>';
    const H = { ov: '', sr: '', q: '', pm: '', in: '', ac: '' }, nm = esc(p.name), hdr = `<p class="crumb"><a href="#/pipeline">Project pipeline</a> / ${nm}</p><div class="dh card"><div class="dh-t">${avatar(p.name, 56)}<div><h1>${nm}</h1><p class="sub" style="margin:0">${p.id} · ${esc(p.city)} · ${p.utility} · ${M.TIERS[p.tier].label} design, ${kw1(p.size.kw)} kW${p.size.batt ? ' + ' + p.size.batt + ' kWh battery' : ''}</p></div></div>${tracker(p)}</div>`;
    const g = GATES[p.stage];
    if (g) { const done = p.approvals[p.stage], can = g.need.includes(S.role) && !done.includes(S.role) && !(p.stage === 3 && p.released);
      H.ov += `<div class="card"><h3>Approvals needed — stage ${p.stage}</h3><p>${g.label}.</p><p>${g.need.map(r => `<span class="chip ${done.includes(r) ? 'ok' : 'warn'}">${done.includes(r) ? '✓ ' : ''}${ROLES[r].split(' (')[0]}</span>`).join(' ')}</p>
        ${p.stage === 3 && p.released ? '<p class="muted">Released. Waiting for the customer to accept.</p>' : `<button class="alt" data-act="approve" data-id="${p.id}" ${can ? '' : 'disabled'}>${can ? 'Approve as ' + ROLES[S.role].split(' (')[0] : 'Waiting on other role(s)'}</button>`}</div>`; }
    H.sr = (p.stage === 1 || p.rev) ? engineerReview(p) : '';
    const f = flags(p); H.ov += `<div class="card"><h3>Automated checks</h3>${f.length ? f.map(x => `<div class="flag ${x.k}"><b class="who">System</b>${x.t}</div>`).join('') : '<span class="chip ok">Nothing flagged</span>'}</div>`;
    H.ov += `<div class="card"><h3>Assessment record</h3><div class="grid g4"><div><span class="muted small">Bill-derived usage</span><div><b>${Math.round(p.kwh)} kWh/mo</b></div></div><div><span class="muted small">Appliance-derived</span><div><b>${Math.round(p.appKwh)} kWh/mo</b></div></div><div><span class="muted small">Daytime share</span><div><b>${pct(p.dayShare)}</b></div></div><div><span class="muted small">Rate</span><div><b>₱${p.rate}/kWh</b></div></div></div><p class="small muted" style="margin:10px 0 0">Customer design: ${p.size.panels} panels (${kw1(p.size.kw)} kW), ${p.size.batt ? p.size.batt + ' kWh battery' : 'no battery'}${p.size.mon ? ', monitoring' : ''}${esc(p.note || '')}</p></div>`;
    if (p.stage >= 2 && p.final) { const t = p.final.total, bt = p.size.batt * M.BATT_PRICE, rem = Math.max(0, t - bt);
      const bom = [['Solar panels (550 W) × ' + p.size.panels, rem * 0.42], [p.size.batt ? 'Hybrid inverter' : 'Grid-tied inverter', rem * 0.2], ...(p.size.batt ? [['Battery ' + p.size.batt + ' kWh', bt]] : []), ['Mounting & racking', rem * 0.1], ['Protection, cabling & BOS', rem * 0.1], ['Installation labor & commissioning', rem * 0.18]];
      H.q += `<div class="card"><h3>Quote &amp; bill of materials</h3><div class="metric"><span>Indicative estimate (customer saw)</span><b>${peso(p.indicative.cost)}</b></div><div class="metric"><span>Final quotation</span><b>${peso(t)} (${p.quoteDelta >= 0 ? '+' : ''}${(p.quoteDelta * 100).toFixed(1)}%)</b></div><table style="margin-top:8px">${bom.map(b => `<tr><td>${b[0]}</td><td class="right">${peso(b[1])}</td></tr>`).join('')}</table></div>`; }
    if (p.permit) H.pm += permitCard(p);
    if (p.install) H.in += installCard(p);
    if (p.stage === 6) { const s = D.series(p), l = s[s.length - 1];
      H.ov += `<div class="card"><h3>After-sales &amp; KPIs</h3><div class="grid g4"><div><span class="muted small">Latest promised</span><div><b>${peso(l.promised)}</b></div></div><div><span class="muted small">Latest actual</span><div><b>${peso(l.actual)}</b></div></div><div><span class="muted small">Net metering</span><div><b>${p.nmFrom != null ? 'Approved' : 'Pending'}</b></div></div><div><span class="muted small">Ticket</span><div><b>${p.ticket ? 'Open' : 'None'}</b></div></div></div>${monthChart(s)}<button class="alt" data-act="action" data-id="${p.id}" ${S.role === 'management' && !p.actionApproved ? '' : 'disabled'}>${p.actionApproved ? 'Action plan approved' : 'Management: approve action plan'}</button></div>`; }
    H.ac += `<div class="card"><h3>Activity</h3><ol class="tl">${p.log.slice().reverse().map(x => `<li><i></i><div><b>${esc(x.who)}</b> ${esc(x.t)}${x.at ? `<small>${ago(x.at)}</small>` : ''}</div></li>`).join('') || '<li><div class="muted">No activity yet.</div></li>'}</ol></div>`;
    const tabs = [['ov', 'Overview', 1], ['sr', 'Site review', !!H.sr], ['q', 'Design and quote', !!H.q], ['pm', 'Permits', !!H.pm], ['in', 'Installation', !!H.in], ['ac', 'Activity', 1]].filter(x => x[2]);
    const cur = tabs.find(x => x[0] === UI.tab['d' + id]) ? UI.tab['d' + id] : (S.role === 'engineer' && p.stage === 1 ? 'sr' : 'ov');
    return hdr + `<div class="tabs" role="tablist">${tabs.map(x => `<button role="tab" aria-selected="${x[0] === cur}" class="${x[0] === cur ? 'on' : ''}" data-act="dtab" data-id="${id}" data-t="${x[0]}">${x[1]}</button>`).join('')}</div><div role="tabpanel">${H[cur]}</div>`;
  }
  function permitCard(p) {
    const s = permitStats(p), ready = !s.miss.length && !s.pend.length, staff = S.role === 'staff';
    return `<div class="card"><h3>Permit package <span class="muted small">— ${s.ok}/${s.total} complete · prepared in parallel with installation</span></h3><div class="bar" style="margin:8px 0"><i style="width:${s.ok / s.total * 100}%;background:var(--green)"></i></div>
      <table>${p.permit.items.map((i, k) => `<tr><td>${esc(i.n)}<div class="muted small">${i.track}</div></td><td>${statusChip(i)}</td><td class="right">${staff && i.status !== 'ok' && !p.permit.submitted ? `<button class="line" data-act="received" data-id="${p.id}" data-k="${k}">Mark received</button>` : ''}</td></tr>`).join('')}</table>
      <p>${p.permit.submitted ? (p.permit.approved ? '<span class="chip ok">Approved by utility/LGU</span>' : `<span class="chip warn">Submitted. Waiting for the utility or LGU</span> <button class="line" data-act="utilOk" data-id="${p.id}" ${staff ? '' : 'disabled'}>Record utility approval</button>`) : `<button class="alt" data-act="submitPermit" data-id="${p.id}" ${staff && ready ? '' : 'disabled'}>Staff: confirm &amp; submit package</button> <span class="muted small">${ready ? '' : 'Resolve missing/pending items first.'}</span>`}</p></div>`;
  }
  function techScores(p) {
    return D.TECHS.map(t => { const need = p.size.batt ? 'battery' : 'grid', fit = t.skills.includes(need) ? 1 : 0.3, avail = Math.max(0, 1 - t.freeInDays / 7), prox = t.base === p.city ? 1 : t.region === D.regionOf(p.city) ? 0.7 : 0.2;
      return { t, fit, avail, prox, score: 0.35 * fit + 0.35 * avail + 0.3 * prox }; }).sort((a, b) => b.score - a.score);
  }
  function installCard(p) {
    const done = p.install.milestones.every(m => m.done), canTick = ['technician', 'engineer', 'manager'].includes(S.role) && !p.install.qa;
    return `<div class="card"><h3>Installation &amp; turnover <span class="muted small">— technician: ${p.install.tech || 'unassigned'}</span></h3>
      ${p.install.milestones.map((m, k) => `<label style="display:block"><input type="checkbox" ${m.done ? 'checked' : ''} ${canTick && p.install.tech ? '' : 'disabled'} data-act="milestone" data-id="${p.id}" data-k="${k}"> ${m.n}</label>`).join('')}
      ${!p.install.tech && !p.install.qa ? `<h3 style="margin-top:12px">Suggested technicians <span class="muted small">(0.35 skill fit + 0.35 availability + 0.30 proximity)</span></h3><table><tr><th>Technician</th><th>Fit</th><th>Avail.</th><th>Near</th><th>Score</th><th></th></tr>${techScores(p).slice(0, 4).map(r => `<tr><td>${r.t.name}<div class="muted small">${r.t.base}</div></td><td>${pct(r.fit)}</td><td>${pct(r.avail)}</td><td>${pct(r.prox)}</td><td><b>${r.score.toFixed(2)}</b></td><td><button class="line" data-act="assign" data-id="${p.id}" data-n="${r.t.name}" ${['manager', 'staff'].includes(S.role) ? '' : 'disabled'}>Assign</button></td></tr>`).join('')}</table>` : ''}
      <p style="margin-top:10px">${p.install.qa ? '<span class="chip ok">QA approved · turned over</span>' : `<button class="alt" data-act="qa" data-id="${p.id}" ${S.role === 'qa' && done ? '' : 'disabled'}>QA: approve &amp; turn over</button> <span class="muted small">${done ? '' : 'All milestones and evidence photos required.'}</span>`}</p></div>`;
  }

  function bcard(p, kind) {
    const s = p.permit ? permitStats(p) : null, ms = p.install ? p.install.milestones : [], dn = ms.filter(m => m.done).length;
    if (kind === 'prep') return `<div class="c click" tabindex="0" data-act="open" data-id="${p.id}"><div class="rowb"><b>${esc(p.name)}</b><small>${p.utility}</small></div><div class="bar"><i style="width:${s.ok / s.total * 100}%;background:${!s.miss.length && !s.pend.length ? 'var(--green)' : 'var(--amber)'}"></i></div><small>${s.ok} of ${s.total} documents${s.miss.length ? ' · missing ' + esc(s.miss.map(i => i.n).slice(0, 2).join(', ')) : s.pend.length ? ' · ' + s.pend.length + ' pending' : ' · ready to submit'}</small>${s.miss.length ? `<span class="chip bad">${s.miss.length} missing</span>` : !s.pend.length ? '<span class="chip ok">Ready to submit</span>' : '<span class="chip warn">Needs review</span>'}</div>`;
    if (kind === 'wait') return `<div class="c click" tabindex="0" data-act="open" data-id="${p.id}"><div class="rowb"><b>${esc(p.name)}</b><small>${p.utility}</small></div><div class="bar"><i style="width:100%;background:var(--green)"></i></div><small>All documents submitted. Approval comes from the utility or LGU.</small><span class="chip warn">Waiting for utility</span></div>`;
    if (kind === 'inst') return `<div class="c click" tabindex="0" data-act="open" data-id="${p.id}"><div class="rowb"><b>${esc(p.name)}</b>${p.install.tech ? `<small>${esc(p.install.tech)}</small>` : '<span class="chip warn">Unassigned</span>'}</div><div class="bar"><i style="width:${dn / ms.length * 100}%;background:var(--amber)"></i></div><small>${dn} of ${ms.length} milestones${dn < ms.length ? ' · next: ' + esc(ms[dn].n) : ''}</small></div>`;
    return `<div class="c click" tabindex="0" data-act="open" data-id="${p.id}"><div class="rowb"><b>${esc(p.name)}</b><small>${esc(p.install.tech || '')}</small></div><div class="bar"><i style="width:100%;background:var(--green)"></i></div><span class="chip ok">Turned over</span></div>`;
  }
  function boardView(title, sub, only) {
    const all = S.projects, my = p => S.role !== 'technician' || (p.install && p.install.tech === 'R. Dizon');
    const cols = [['prep', 'Preparing documents', all.filter(p => p.permit && !p.permit.submitted)], ['wait', 'Waiting for utility', all.filter(p => p.permit && p.permit.submitted && !p.permit.approved)], ['inst', 'Installing', all.filter(p => p.install && !p.install.qa && my(p))], ['done', 'Turned over', all.filter(p => p.install && p.install.qa && my(p))]].filter(c => !only || only.includes(c[0]));
    return `<div class="ph"><div><h1>${title}</h1><p class="sub">${sub}</p></div></div><div class="board" style="--cols:${cols.length}">${cols.map(c => `<section class="col"><h2>${c[1]} <span>${c[2].length}</span></h2>${c[2].map(p => bcard(p, c[0])).join('') || '<div class="muted small cempty">Nothing here</div>'}</section>`).join('')}</div>`;
  }
  function permitsView() { return boardView('Permits and installation', 'Document preparation, utility wait and installation in one place. Approval itself comes from the utility or LGU.'); }
  function techView() {
    const me = 'R. Dizon', list = S.projects.filter(p => p.install && p.install.tech === me && !p.install.qa);
    if (!list.length) return `<div class="ph"><h1>Today</h1></div><div class="card">${empty('No jobs assigned', 'New work orders appear here as soon as a manager assigns them.')}</div>`;
    const cur = list.find(p => p.id === UI.job) || list[0], ms = cur.install.milestones, dn = ms.filter(m => m.done).length, nx = ms.findIndex(m => !m.done);
    return `<div class="ph"><div><h1>Today</h1><p class="sub">${list.length} job${list.length > 1 ? 's' : ''} assigned to you</p></div></div>
      <div class="jobtabs">${list.map(p => `<button class="fchip ${p.id === cur.id ? 'on' : ''}" data-act="job" data-id="${p.id}">${esc(p.name.split(' ')[0])}</button>`).join('')}</div>
      <div class="card jobcard"><div class="rowb" style="align-items:flex-start"><div><h2 style="margin:0">${esc(cur.name)}</h2><div class="muted small">${esc(cur.city)} · ${M.TIERS[cur.tier].label}, ${kw1(cur.size.kw)} kW${cur.size.batt ? ' + ' + cur.size.batt + ' kWh' : ''}</div></div><span class="chip warn">${dn} of ${ms.length} done</span></div>
      <div class="bar" style="margin:12px 0 4px"><i style="width:${dn / ms.length * 100}%;background:var(--amber)"></i></div>
      <ul class="msl">${ms.map((m, k) => `<li class="${m.done ? 'd' : k === nx ? 'nx' : ''}"><label><input type="checkbox" ${m.done ? 'checked' : ''} data-act="milestone" data-id="${cur.id}" data-k="${k}"><span class="bx"></span><span>${esc(m.n)}</span>${k === nx ? '<em>Next</em>' : ''}</label></li>`).join('')}</ul></div>
      <div class="wizbar techbar"><a class="line btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent(cur.city)}">Directions</a><span class="sp"></span>${nx >= 0 ? `<button class="alt big-b" data-act="nextms" data-id="${cur.id}">Mark “${esc(ms[nx].n)}” done</button>` : '<span class="chip ok">All milestones done. Waiting for QA.</span>'}</div>`;
  }
  function workordersView() {
    if (S.role === 'technician') return techView();
    return boardView('Work orders', S.role === 'qa' ? 'Installations ready for quality assurance and turnover.' : 'Who is responsible for which address, and how far along each job is.', ['inst', 'done']);
  }

  // ---------- analytics ----------
  const sim_ = () => sim;
  function analyticsView() {
    const A = D.analytics(), tabs = [['variance', 'Expectation gap', ['engineer', 'manager', 'management']], ['permits', 'Permit cycle time', ['manager', 'management']], ['funnel', 'Tier conversion', ['manager', 'management']], ['techs', 'Technician utilization', ['manager', 'management']], ['changes', 'Design changes', ['engineer', 'manager', 'management']]].filter(t => t[2].includes(S.role));
    const cur = tabs.find(t => t[0] === UI.tab.an) ? UI.tab.an : tabs[0][0];
    let h = `<div class="ph"><div><h1>Analytics ${sim}</h1><p class="sub">Each view answers one installer question and points to one action.</p></div></div>`;
    if (S.role === 'management') { const r = A.rows; h += `<div class="grid g4"><div class="card kpi"><span class="muted small">Avg. bill gap vs promise</span><div class="big">${pct(mean(r.map(x => x.gap / x.promised)))}</div></div><div class="card kpi"><span class="muted small">Median permit prep</span><div class="big">${med(r.map(x => x.prep))} days</div></div><div class="card kpi"><span class="muted small">Quote acceptance</span><div class="big">${pct(['low', 'value', 'high'].reduce((a, t) => a + A.funnel[t].accept, 0) / ['low', 'value', 'high'].reduce((a, t) => a + A.funnel[t].quote, 0))}</div></div><div class="card kpi"><span class="muted small">Avg. technician utilization</span><div class="big">${pct(mean(A.techs.map(t => t.util)))}</div></div></div>`; }
    if (['manager', 'management'].includes(S.role)) { const r = A.rows, nmw = r.filter(x => !x.nm).length, slow = A.utilities.map(u => [u, med(r.filter(x => x.utility === u).map(x => x.prep))]).sort((a, b) => b[1] - a[1])[0], busy = A.techs.slice().sort((a, b) => b.util - a.util)[0], idle = A.techs.slice().sort((a, b) => a.util - b.util)[0];
      h += `<div class="card nextcard"><h3>What to do next</h3><ol><li><b>Explain the net metering wait before customers accept.</b> ${nmw} of ${r.length} installed projects are still waiting, and it drives most bill gaps.</li><li><b>Start ${esc(slow[0])} permits earlier.</b> Their median preparation is ${slow[1]} days, the longest of any utility.</li><li><b>Rebalance technicians.</b> ${esc(busy.name)} is at ${pct(busy.util)} while ${esc(idle.name)} is at ${pct(idle.util)}.</li></ol></div>`; }
    h += `<div class="tabs">${tabs.map(t => `<button class="${t[0] === cur ? 'on' : ''}" data-act="antab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
    if (cur === 'variance') {
      const r = A.rows, hit = r.filter(x => Math.abs(x.gap) / x.promised <= 0.1).length / r.length, tot = mean(r.map(x => x.gap)), warn = r.slice().sort((a, b) => b.gap / b.promised - a.gap / a.promised).slice(0, 8);
      h += `<div class="grid g2"><div class="card"><h2>Why actual bills differ from the promise</h2><p class="muted small">Average gap ${signed(tot)}/month across ${r.length} installed projects. Only ${pct(hit)} land within ±10% of the promised bill.</p>${hbars(Object.keys(DRV).map(k => ({ l: DRV[k].l, v: mean(r.map(x => x.parts[k])), c: DRV[k].c, t: signed(mean(r.map(x => x.parts[k]))) })))}
        <div class="flag info"><b class="who">Insight</b>Projects still waiting on net metering: ${r.filter(x => !x.nm).length} of ${r.length}. If the inquiry estimate shows the bill both before and after approval, this driver stops being a surprise. That is a policy the data can support.</div></div>
        <div class="card"><h2>By design tier</h2><table><tr><th>Tier</th><th>Projects</th><th>Avg gap</th><th>Within ±10%</th></tr>${['low', 'value', 'high'].map(t => { const x = r.filter(y => y.tier === t); return `<tr><td>${M.TIERS[t].label}</td><td>${x.length}</td><td>${signed(mean(x.map(y => y.gap)))}</td><td>${pct(x.filter(y => Math.abs(y.gap) / y.promised <= 0.1).length / x.length)}</td></tr>`; }).join('')}</table></div></div>
        <div class="card"><h2>Variance warnings (largest gaps)</h2><table><tr><th>Project</th><th>Utility</th><th>Promised</th><th>Actual</th><th>Main driver</th></tr>${warn.map(x => { const k = Object.keys(x.parts).sort((a, b) => Math.abs(x.parts[b]) - Math.abs(x.parts[a]))[0]; return `<tr><td>${x.id}</td><td>${x.utility}</td><td>${peso(x.promised)}</td><td>${peso(x.actual)} <span class="chip bad">${pct(x.gap / x.promised)}</span></td><td><span class="chip" style="background:${DRV[k].c}22">${DRV[k].l}</span></td></tr>`; }).join('')}</table></div>`;
    }
    if (cur === 'permits') {
      h += `<div class="grid g2"><div class="card"><h2>Preparation time to complete requirements</h2><p class="muted small">Median days from acceptance to a complete package — the part we can influence.</p>${hbars(A.utilities.map(u => ({ l: u, v: med(A.rows.filter(x => x.utility === u).map(x => x.prep)), c: 'var(--deep)', t: med(A.rows.filter(x => x.utility === u).map(x => x.prep)) + ' days' })), { max: 40 })}
        <h3 style="margin-top:14px">Returned for revision</h3>${hbars(A.utilities.map(u => { const x = A.rows.filter(y => y.utility === u); return { l: u, v: x.filter(y => y.returned).length / x.length, c: 'var(--red)', t: pct(x.filter(y => y.returned).length / x.length) }; }), { max: 1 })}</div>
        <div class="card"><h2>Most common missing item, by utility</h2><table><tr><th>Utility</th><th>Item</th><th>Cases</th></tr>${A.utilities.map(u => { const c = {}; A.rows.filter(x => x.utility === u && x.missing).forEach(x => c[x.missing] = (c[x.missing] || 0) + 1); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0] || ['—', 0]; return `<tr><td>${u}</td><td>${top[0]}</td><td>${top[1]}</td></tr>`; }).join('')}</table>
        <h3 style="margin-top:14px">Outside our control</h3><p class="small muted">Utility/LGU approval wait (median): ${A.utilities.map(u => u.split(' ')[0] + ' ' + med(A.rows.filter(x => x.utility === u).map(x => x.approval)) + ' d').join(' · ')}. Shown for context only.</p></div></div>`;
    }
    if (cur === 'funnel') {
      const F = A.funnel, dl = A.deltas;
      h += `<div class="grid g2"><div class="card"><h2>Inquiry → quote → acceptance</h2><table><tr><th>Tier</th><th>Picked</th><th>Quoted</th><th>Accepted</th><th>Conversion</th></tr>${['low', 'value', 'high'].map(t => `<tr><td>${M.TIERS[t].label}</td><td>${F[t].pick}</td><td>${F[t].quote}</td><td>${F[t].accept}</td><td><b>${pct(F[t].accept / F[t].pick)}</b></td></tr>`).join('')}</table></div>
        <div class="card"><h2>Estimate vs final quotation</h2><div class="metric"><span>Average change</span><b>${(mean(dl) * 100).toFixed(1)}%</b></div><div class="metric"><span>Quotes more than 10% above the estimate</span><b>${pct(dl.filter(d => d > 0.1).length / dl.length)}</b></div><p class="small muted">Tests whether big jumps between the customer's first estimate and the final quote reduce acceptance.</p></div></div>`;
    }
    if (cur === 'changes') {
      const live = S.projects.filter(p => p.rev), lc = live.length, la = live.filter(p => p.rev.status === 'accepted').length, sim = { visits: 64, changed: 20, accepted: 16, asked: 2, kept: 2 };
      const visits = sim.visits + S.projects.filter(p => p.site || p.rev).length, changed = sim.changed + live.filter(p => p.rev.v2).length, accepted = sim.accepted + la, decided = changed - 0;
      const why = [['Shading', 9 + live.filter(p => p.rev.reasons && p.rev.reasons.some(x => /shad/i.test(x.reason))).length], ['Roof size or usable area', 6], ['Electrical panel or wiring', 3], ['Battery location', 2]];
      h += `<div class="grid g2"><div class="card"><h2>How often engineers change designs ${sim_()}</h2><p class="muted small">After each site visit, the engineer approves the customer's design or proposes version 2.</p>
        <div class="grid g3"><div class="kpi"><span class="muted small">Site visits</span><div class="big">${visits}</div></div><div class="kpi"><span class="muted small">Designs changed</span><div class="big">${pct(changed / visits)}</div></div><div class="kpi"><span class="muted small">Customers who accepted</span><div class="big">${pct(accepted / decided)}</div></div></div>
        <h3 style="margin-top:14px">Why engineers change designs</h3>${hbars(why.map(x => ({ l: x[0], v: x[1] / changed, c: 'var(--amber)', t: x[1] + ' of ' + changed })))}</div>
        <div class="card"><h2>What customers do with version 2 ${sim_()}</h2>${hbars([['Accept', accepted], ['Ask a question first', sim.asked], ['Keep their original (second visit)', sim.kept]].map(x => ({ l: x[0], v: x[1] / decided, c: x[0] === 'Accept' ? 'var(--green)' : 'var(--amber)', t: x[1] + ' of ' + decided })))}
        <div class="flag info" style="margin-top:12px"><b class="who">Insight</b>Most revisions come from shading and roof size, which the customer can estimate in the app. Better shade and roof questions at the start would cut revisions, and every revision that cuts coverage below the customer's goal should come with a reason they can read.</div>
        <p class="small muted">This demo session adds ${lc} live case${lc === 1 ? '' : 's'} to the simulated portfolio.</p></div></div>`;
    }
    if (cur === 'techs') h += `<div class="card"><h2>Technician utilization</h2><p class="muted small">Booked days ÷ ~62 working days in the period.</p>${hbars(A.techs.map(t => ({ l: t.name, v: t.util, c: t.util > 0.85 ? 'var(--red)' : 'var(--green)', t: pct(t.util) + ' · ' + t.jobs + ' jobs' })), { max: 1 })}<p class="small muted">Overloaded technicians (red) are what the assignment score on each installation uses to spread work.</p></div>`;
    return h;
  }

  function specView() {
    const A = [
      ['A1', 'Expectation gap: estimate vs actual bill, decomposed by cause', '1, 2, 6', 'Customer, engineer, manager', 'Bill, appliances, location, monthly seasonal irradiance (public: PVGIS / NASA POWER), net-metering approval date, monthly bill and inverter kWh export', 'Model real; actuals simulated', 'Scenario-based energy balance, then one-factor-at-a-time attribution (weather → load → net metering)'],
      ['A2', 'Customer load, battery and grid-draw profile', '1, 6', 'Customer', 'Appliance schedule (or smart-meter export), system size, battery size', 'Model real; profile assumed', 'Hourly energy balance simulation with battery state of charge'],
      ['A3', 'Variance warning', '6', 'Engineer, management', 'A1 output, threshold set with client', 'Prototype rule', 'Threshold on gap %, labelled with dominant driver; later a control chart'],
      ['A4', 'Permit preparation cycle time and return rate by utility/location', '4', 'Staff, manager', 'Timestamps for each requirement received/returned, utility, city, document source', 'Simulated; needs event logging from day one', 'Median / IQR cycle time, return rate; planned logistic regression for returned-submission risk'],
      ['A5', 'Tier conversion and quote-change effect', '1–3', 'Manager, management', 'Inquiries, tier picked, indicative vs final quote, accepted or not', 'Simulated', 'Funnel; logistic regression of acceptance on tier and quote change'],
      ['A6', 'Technician assignment and utilization', '5', 'Manager', 'Skills, base, availability calendar, job durations, address history', 'Simulated', 'Weighted scoring now; min-cost assignment (OR) as a later step'],
      ['A7', 'Complaint classification (deferred)', '6', 'Management', 'Tickets with cause labels', 'Needs client history', 'A1 drivers give a rule-based root-cause label; ML only after enough labelled tickets']
    ];
    const R = [['R1', 'Bill insights (monthly)', 'Customer', 'A1, A2'], ['R2', 'Quotation expectation sheet (before and after net metering)', 'Customer', 'A1'], ['R3', 'Permit readiness checklist per project', 'Staff', 'A4'], ['R4', 'Weekly permit bottleneck report', 'Manager', 'A4'], ['R5', 'Variance warning digest', 'Engineer, manager', 'A3'], ['R6', 'Tier conversion report', 'Management', 'A5'], ['R7', 'Technician utilization', 'Manager', 'A6'], ['R8', 'Executive KPI summary', 'Management', 'A1–A6']];
    return `<h1>Analytics specification</h1><p class="sub">Problem → data → method → report, tied to a stage. Draft for the proposal; validate with the client.</p><div class="card"><table><tr><th></th><th>Problem solved</th><th>Stage</th><th>Audience</th><th>Data needed</th><th>Data status</th><th>Method</th></tr>${A.map(a => `<tr><td><b>${a[0]}</b></td>${a.slice(1).map(c => `<td class="small">${c}</td>`).join('')}</tr>`).join('')}</table></div>
      <div class="card"><h2>Reports</h2><table><tr><th></th><th>Report</th><th>Audience</th><th>Built from</th></tr>${R.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table></div>`;
  }
  function usersView() {
    const rows = [['Customer', 'Own estimate, project status, documents, bill insights', 'Accepts quotation', 'TBC'], ['Intake / permit staff', 'Intake, permit packages, all open items', 'Verify data, release quote, submit permits', 'TBC'], ['Site engineer', 'Assessments, quotations, variance warnings', 'Assessment, quotation', 'TBC'], ['Manager', 'Pipeline, permit and technician reports, tier conversion', 'Quotation, assignments', 'TBC'], ['QA', 'Installation evidence', 'Turnover', 'TBC'], ['Technician', 'Only own work orders', 'Milestones', 'TBC'], ['Management / admin', 'All dashboards, KPI summary, users and roles', 'After-sales action plans', 'TBC']];
    return `<h1>Users &amp; roles</h1><p class="sub">Use the “Viewing as” selector to see what each role gets. User counts are open questions for the client.</p><div class="card"><table><tr><th>Role</th><th>Sees</th><th>Approves / acts</th><th>Users</th></tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
  }

  // ---------- router ----------
  function allowed() { return Object.keys(ROUTES).filter(k => ROUTES[k].roles.includes(S.role)); }
  function render() { UI.menu = null; renderChrome(); renderView(); renderOverlay(); }
  function renderView() {
    if (!S.authed) { document.title = 'Sign in | SolarFlow'; $('#view').innerHTML = loginView(); return; }
    const hash = location.hash.replace(/^#\/?/, '').split('/'); let route = hash[0] || allowed()[0], arg = hash[1];
    if (route === 'project') { if (S.role === 'customer') route = 'myproject'; } else if (!allowed().includes(route)) { location.hash = '#/' + allowed()[0]; return; }
    const views = { estimator: estimatorView, myproject: myProjectView, insights: insightsView, pipeline: pipelineView, permits: permitsView, workorders: workordersView, analytics: analyticsView, spec: specView, users: usersView, project: () => detailView(arg) };
    const key = route + (arg || '') + (route === 'estimator' && UI.est ? ':' + UI.est.step : '');
    $('#view').innerHTML = (views[route] || pipelineView)();
    const v = $('#view'); if (UI.lastKey !== key) { v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in'); UI.lastKey = key; }
    document.title = ((ROUTES[route] || ROUTES.pipeline).label) + ' | SolarFlow'; updateStatement();
  }

  // ---------- actions ----------
  function advance(p) {
    const g = GATES[p.stage]; if (!g || !g.need.every(r => p.approvals[p.stage].includes(r))) return;
    if (p.stage === 1) { p.stage = 2; p.final = { total: p.indicative.cost * (1 + p.quoteDelta) }; log(p, 'Assessment verified; quotation drafted and BOM generated', 'System'); }
    else if (p.stage === 2) { p.stage = 3; log(p, 'Quotation approved; ready for release', 'System'); }
    else if (p.stage === 3) { p.released = true; log(p, 'Quotation released to customer', 'System'); }
  }
  const A = {
    reset() { UI.menu = null; renderChrome(); modal({ title: 'Reset demo data?', body: 'This restores the original sample projects and clears anything you added.', ok: 'Reset', fn: () => { S = fresh(); S.authed = false; UI = { tab: {}, est: null, insProject: null, rainy: false, menu: null, q: '', pf: 'all' }; save(); location.hash = '#/'; render(); toast('Demo data restored'); } }); },
    mclose() { $('#modal').innerHTML = ''; UI.mok = null; },
    mok() { const f = UI.mok; A.mclose(); if (f) f(); },
    login(d) { S.authed = true; S.role = d.r; UI.menu = null; UI.est = null; save(); location.hash = '#/' + allowed()[0]; render(); window.scrollTo(0, 0); },
    logout() { S.authed = false; UI.menu = null; save(); location.hash = '#/'; render(); window.scrollTo(0, 0); },
    menu(d) { UI.menu = UI.menu === d.m ? null : d.m; renderChrome(); },
    pf(d) { UI.pf = d.f; renderView(); },
    psel(d) { UI.sel = d.id; renderView(); },
    job(d) { UI.job = d.id; renderView(); },
    nextms(d) { const p = P(d.id), k = p.install.milestones.findIndex(m => !m.done); if (k >= 0) { p.install.milestones[k].done = true; log(p, 'Completed milestone: ' + p.install.milestones[k].n); save(); toast('Marked done'); render(); } },
    clearq() { UI.q = ''; $('#q').value = ''; renderView(); },
    sel(d) { UI.est.sel = +d.i; render(); },
    aq(d) { const a = UI.est.apps[+d.i]; a.qty = Math.max(0, (a.on ? a.qty : 0) + (+d.d)); a.on = a.qty > 0; if (a.on) UI.est.sel = +d.i; render(); },
    preset(d) { const E = UI.est, m = PRESETS[d.k] || {}; E.apps.forEach(a => { a.qty = m[a.id] || 0; a.on = a.qty > 0; }); E.err = ''; render(); },
    batset(d) { const E = UI.est; E.cfg.batt = Math.max(0, Math.min(M.BATT_STEP * M.BATT_MAX, +d.n)); if (E.cfg.batt) E.pop = { t: 'b', i: E.cfg.batt / M.BATT_STEP - 1 }; redrawDesigner(); },
    qadj(d) { const E = UI.est, r = E.cfg.roof, t = E.tpl, yf = E.cfg.yf; if (d.k === 'bal') E.cfg = Object.assign({}, t, { roof: r, yf }); else if (d.k === 'low') E.cfg = Object.assign({}, t, { roof: r, yf, panels: Math.max(1, t.panels - 2), batt: Math.max(0, t.batt - M.BATT_STEP) }); else E.cfg = Object.assign({}, t, { roof: r, yf, panels: t.panels + 2, batt: Math.min(M.BATT_STEP * M.BATT_MAX, t.batt + M.BATT_STEP) }); E.cfg.panels = Math.min(E.cfg.panels, capOf(E)); redrawDesigner(); },
    calc(d) { const E = UI.est; E.err = ''; const skip = !!(d && d.skip);
      if (!(+E.bill >= 1000)) { E.err = 'Enter your average monthly bill, at least ₱1,000, so we can size the system.'; render(); const i = $('[data-b=bill]'); if (i) i.focus(); return; }
      if (!skip && !E.apps.some(a => a.on)) { E.err = 'Add at least one appliance, or choose “Skip appliances” to use your bill only.'; render(); return; }
      const util = D.CITIES.find(c => c[0] === E.city)[1], rate = D.UTILITIES[util].rate, st = D.appStats(E.apps);
      E.billNow = +E.bill; E.kwh = E.kwhIn > 0 ? Math.max(100, +E.kwhIn) : Math.max(100, (E.billNow - M.FIXED) / rate); E.dayShare = (skip || !E.apps.some(a => a.on)) ? 0.35 : st.dayShare; E.appKwh = (skip || !E.apps.some(a => a.on)) ? null : st.kwhMonth; E.rate = rate; E.util = util; recompute(); E.step = 2; render(); window.scrollTo(0, 0); },
    gtype(d) { UI.est.goal.type = d.t; render(); },
    goalnext() { const E = UI.est; E.opts = computeOpts(E); E.res = E.opts; E.pickI = 1; applyPick(E); E.step = 3; render(); window.scrollTo(0, 0); },
    usual() { UI.est.goal.type = 'usual'; A.goalnext(); },
    gswitch(d) { const E = UI.est; E.goal.type = d.t; E.opts = computeOpts(E); E.res = E.opts; E.pickI = 1; applyPick(E); render(); },
    pick(d) { const E = UI.est; E.pickI = +d.i; applyPick(E); render(); },
    fview(d) { UI.est.fview = d.v; redrawDesigner(); },
    rsz(d) { const E = UI.est; E.roofIn.mode = 'size'; E.roofIn.size = d.k; render(); },
    rmode() { UI.est.roofIn.mode = 'dim'; render(); },
    aopen() { const E = UI.est; E.appsOpen = E.appsOpen === false; render(); },
    help() { modal({ title: 'How do I measure my roof?', body: '1. Ask for the house plan, or measure the longest side of the roof from the ground or from a safe spot, with a tape or a phone measuring app.<br>2. Measure the shorter side the same way. Length × width is your roof size in square metres.<br>3. Not sure? Pick Small, Medium or Large. Our engineer measures the real roof on site, so a rough number is fine. Never climb a wet or steep roof.', ok: 'Got it', fn: null }); },
    useRead() { const E = UI.est, it = E.intake; if (!it || it.state !== 'done') return; E.bill = Math.max(1000, +it.f.amount || 0); E.kwhIn = +it.f.kwh > 0 ? +it.f.kwh : null; it.used = true; render(); toast('Using the numbers from your bill'); },
    tour() { const E = UI.est; if (!E.res) { toast('Finish step 1 first, then the guide can point at your design.'); return; } E.step = 4; E.tour = 0; render(); },
    tourgo(d) { const E = UI.est; E.tour += +d.d; if (E.tour >= TOUR.length) return A.tourend(); if (E.tour < 0) E.tour = 0; renderOverlay(); },
    tourend() { UI.est.tour = null; S.tourDone = true; save(); renderOverlay(); },
    gl(d) { const E = UI.est; E.gloss = { q: '', hl: d.t || '' }; renderOverlay(); const h = $('.gl.hl'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'nearest' }); },
    glclose() { UI.est.gloss = null; renderOverlay(); },
    sck(d) { const p = P(d.id), s = siteOf(p); s.checks[d.k].r = d.v; if (d.v === 'pass') s.checks[d.k].why = ''; save(); renderView(); },
    sPan(d) { const p = P(d.id), s = siteOf(p), cap = Math.max(1, Math.min(M.ROOF_MAX, Math.floor(s.usable / M.PANEL_AREA))); s.draft.panels = Math.max(1, Math.min(cap, s.draft.panels + (+d.d))); save(); renderView(); },
    sBat(d) { const s = siteOf(P(d.id)); s.draft.batt = +d.n; save(); renderView(); },
    photo(d) { const s = siteOf(P(d.id)); s.photos++; save(); renderView(); toast('Photo added (simulated: no real file is stored)'); },
    eng(d) { engDecide(P(d.id), d.k); },
    revReply(d) { const p = P(d.id), s = siteOf(p); if (!(s.reply || '').trim()) { UI.engErr = { id: d.id, t: 'Type an answer first.' }; renderView(); return; } p.rev.status = 'awaiting'; p.rev.answer = s.reply.trim(); rlog(p, 'Answered the customer’s question: ' + s.reply.trim()); s.reply = ''; save(); toast('Answer sent'); render(); },
    revAccept(d) { const p = P(d.id), r = p.rev; p.cfg = Object.assign({}, r.v2.cfg); p.size = r.v2.size; p.indicative = r.v2.size; r.status = 'accepted'; if (!p.approvals[1].includes('engineer')) p.approvals[1].push('engineer'); rlog(p, 'Accepted the engineer’s version 2. The quotation will be prepared from it.', 'Customer'); advance(p); save(); toast('Version 2 accepted'); render(); },
    revAskOpen(d) { UI.ask = UI.ask === d.id ? null : d.id; render(); },
    revSend(d) { const p = P(d.id), el = $('[data-site=q]'), q = el ? el.value.trim() : ''; if (!q) { toast('Type your question first'); return; } p.rev.status = 'asked'; p.rev.question = q; UI.ask = null; rlog(p, 'Asked the engineer: ' + q, 'Customer'); save(); toast('Question sent'); render(); },
    revKeep(d) { const p = P(d.id); p.rev.status = 'original'; p.rev.second = true; rlog(p, 'Chose to keep the original design (version 1). A second site visit is needed.', 'Customer'); save(); toast('We will arrange a second visit'); render(); },
    revResend(d) { const p = P(d.id); p.rev = null; rlog(p, 'Fixed the issue and sent the design again.', 'Customer'); save(); toast('Sent back to the engineer'); render(); },
    pan(d) { const E = UI.est; E.cfg.panels = Math.max(1, Math.min(capOf(E), E.cfg.panels + (+d.d))); if (+d.d > 0) E.pop = { t: 'p', i: E.cfg.panels - 1 }; redrawDesigner(); },
    slot(d) { const E = UI.est, i = +d.i; E.cfg.panels = (i === E.cfg.panels - 1 && i > 0) ? i : i + 1; if (E.cfg.panels > 0 && i >= E.cfg.panels - 1) E.pop = { t: 'p', i }; redrawDesigner(); },
    bat(d) { const E = UI.est; E.cfg.batt = Math.max(0, Math.min(M.BATT_STEP * M.BATT_MAX, E.cfg.batt + (+d.d) * M.BATT_STEP)); if (+d.d > 0) E.pop = { t: 'b', i: E.cfg.batt / M.BATT_STEP - 1 }; redrawDesigner(); },
    bslot(d) { const E = UI.est, j = +d.j, n = (j + 1) * M.BATT_STEP; E.cfg.batt = E.cfg.batt === n ? j * M.BATT_STEP : n; if (E.cfg.batt === n) E.pop = { t: 'b', i: j }; redrawDesigner(); },
    mon(d, el) { UI.est.cfg.mon = el.checked; redrawDesigner(); },
    resetCfg() { const E = UI.est, r = E.cfg.roof; E.cfg = Object.assign({}, E.tpl, { roof: r, yf: E.cfg.yf }); E.cfg.panels = Math.min(E.cfg.panels, capOf(E)); redrawDesigner(); },
    roof(d) { const E = UI.est; E.cfg.roof = d.r; E.roofIn.type = d.r; E.cfg.panels = Math.min(E.cfg.panels, capOf(E)); E.pop = null; redrawDesigner(); },
    go(d) { const E = UI.est; if (+d.s > 1 && !E.res) return; E.step = +d.s; if (E.step === 4 && !S.tourDone && E.tour == null) E.tour = 0; render(); window.scrollTo(0, 0); },
    dayw(d) { UI.est.rainy = d.w === '1'; redrawDesigner(); },
    submitEst() { const E = UI.est, id = 'P-' + (S.seq++); const p = D.mk({ id, name: E.name || 'New customer', city: E.city, utility: E.util, tier: E.tier, kwh: E.kwh, dayShare: E.dayShare, appKwh: E.appKwh, cfg: Object.assign({}, E.cfg), note: cfgNote(E), roof: Object.assign({}, E.roofIn), goal: Object.assign({}, E.goal), billIn: E.intake && E.intake.used ? Object.assign({ src: E.intake.src, simulated: true }, E.intake.f) : { src: 'typed', amount: E.billNow } });
      S.projects.push(p); S.myProject = id; save(); toast('Request sent to the site engineer'); location.hash = '#/myproject'; },
    open(d, el) { if (el && el.tagName === 'A') return; location.hash = '#/project/' + d.id; },
    approve(d) { const p = P(d.id); if (!p) return; if (S.role === 'engineer' && p.stage === 1) { UI.tab['d' + d.id] = 'sr'; toast('Use the Site review tab to decide'); location.hash = '#/project/' + d.id; render(); return; } const g = GATES[p.stage]; if (!g || !g.need.includes(S.role) || p.approvals[p.stage].includes(S.role)) return; p.approvals[p.stage].push(S.role); log(p, 'Approved stage ' + p.stage + ' gate'); advance(p); save(); render(); },
    accept(d) { const p = P(d.id); p.accepted = true; p.stage = 4; D.startExec(p, 'blank', 0, null);
      p.permit.items.forEach(i => { if (/application form|permit application/i.test(i.n)) { i.status = 'pending'; i.source = 'prefilled'; i.days = 0; } if (i.n === 'Latest electric bill') { i.status = 'ok'; i.source = 'uploaded'; } });
      log(p, 'Customer accepted quotation; permit preparation and installation started in parallel', 'Customer'); save(); toast('Quotation accepted'); render(); },
    upload(d) { const p = P(d.id), i = p.permit.items[+d.k]; i.status = 'ok'; i.source = 'uploaded'; log(p, 'Uploaded “' + i.n + '” — data extracted to prefill forms (simulated OCR)', 'Customer'); save(); toast('Uploaded and read'); render(); },
    received(d) { const p = P(d.id), i = p.permit.items[+d.k]; i.status = 'ok'; i.source = i.source || 'physical'; log(p, 'Marked received: ' + i.n); save(); render(); },
    submitPermit(d) { const p = P(d.id); p.permit.submitted = true; log(p, 'Permit package confirmed and submitted'); save(); render(); },
    utilOk(d) { const p = P(d.id); p.permit.approved = true; p.nmFrom = 0; log(p, 'Utility/LGU approval recorded (demo)'); save(); render(); },
    assign(d) { const p = P(d.id); p.install.tech = d.n; log(p, 'Assigned technician ' + d.n + ' to ' + p.city + ' address'); save(); render(); },
    milestone(d, el) { const p = P(d.id); p.install.milestones[+d.k].done = el.checked; save(); render(); },
    qa(d) { const p = P(d.id); p.install.qa = true; p.stage = 6; log(p, 'QA approved; project turned over to after-sales'); save(); render(); },
    action(d) { const p = P(d.id); p.actionApproved = true; log(p, 'Action plan approved'); save(); render(); },
    ticket(d) { P(d.id).ticket = true; save(); toast('Ticket opened'); render(); },
    weather(d) { UI.rainy = d.w === '1'; render(); },
    antab(d) { UI.tab.an = d.t; render(); },
    dtab(d) { UI.tab['d' + d.id] = d.t; renderView(); }
  };

  document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'INPUT' && e.type === 'click' && t.type === 'checkbox') return; if (t.tagName === 'INPUT') return; if (A[t.dataset.act]) A[t.dataset.act](t.dataset, t); });
  document.addEventListener('change', e => { const t = e.target;
    if (t.tagName === 'INPUT' && t.type === 'checkbox' && t.dataset.act && A[t.dataset.act]) { A[t.dataset.act](t.dataset, t); return; }
    const E0 = UI.est;
    if (t.dataset.b === 'billfile') { const f = t.files && t.files[0]; if (!f || !E0) return; const src = t.dataset.src; E0.intake = { src, name: f.name, state: 'reading' }; render(); setTimeout(() => { if (UI.est === E0) { E0.intake = readBill(E0, f.name, f.size, src); render(); } }, 900); return; }
    if (t.dataset.r && E0) { E0.roofIn[t.dataset.r] = t.type === 'number' ? Math.max(3, Math.min(30, +t.value || 3)) : t.value; render(); return; }
    if (t.dataset.g && E0) { E0.goal[t.dataset.g] = Math.max(50000, +t.value || 50000); render(); return; }
    if (t.dataset.i && E0 && E0.intake && t.closest('.intake')) { E0.intake.f[t.dataset.i] = t.value; E0.intake.flag[t.dataset.i] = 0; E0.intake.used = false; const el = $('#intake'); if (el) el.innerHTML = intakeHTML(E0); return; }
    if (t.dataset.site) { const pid = (location.hash.match(/project\/(.+)$/) || [])[1] || S.myProject, p = P(pid); if (!p) return; const s = siteOf(p), k = t.dataset.site;
      if (k.startsWith('why.')) s.checks[k.slice(4)].why = t.value; else if (k.startsWith('rsn.')) s.rsn[k.slice(4)] = t.value; else if (k === 'usable') { s.usable = Math.max(5, +t.value || 5); s.draft.panels = Math.min(s.draft.panels, Math.max(1, Math.floor(s.usable / M.PANEL_AREA))); save(); renderView(); return; } else if (k !== 'q') s[k] = t.value;
      save(); return; }
    const b = t.dataset && t.dataset.b; if (!b) return;
    if (b === 'insp') { UI.insProject = t.value; render(); return; }
    const E = UI.est; if (b.startsWith('app.')) { const [, k, i] = b.split('.'); E.apps[+i][k] = k === 'on' ? t.checked : +t.value; } else E[b] = t.value;
    if (b === 'bill') { E.kwhIn = null; if (E.intake) E.intake.used = false; }
    if (b === 'city' || b === 'bill') render();
  });
  document.addEventListener('input', e => { const t = e.target;
    if (t.id === 'glq' && UI.est && UI.est.gloss) { UI.est.gloss.q = t.value; const q = t.value.toLowerCase(); $('#glist').innerHTML = glistHTML(GLOSS.filter(g => !q || (g[1] + g[2]).toLowerCase().includes(q)), UI.est.gloss.hl); return; }
    if (t.dataset && t.dataset.act === 'gpct') { const E = UI.est; E.goal.pct = +t.value; $('#gp-val').textContent = E.goal.pct + '%'; $('#gm-cover').textContent = goalMeaning(E, 'cover'); $('#gprev').innerHTML = goalPreview(E); return; }
    if (t.dataset && t.dataset.act === 'billr') { UI.est.bill = +t.value; const bi = $('[data-b=bill]'); if (bi) bi.value = t.value; const hs = $('#billsum'); if (hs) hs.innerHTML = homeSumHTML(UI.est); return; }
    if (t.dataset && t.dataset.act === 'ahrs') { const E = UI.est, a = E.apps[+t.dataset.i]; a.hrs = +t.value; const v = $('#ahv'); if (v) v.textContent = a.hrs + ' h'; const hs = $('#billsum'); if (hs) hs.innerHTML = homeSumHTML(E); $$('.tile').forEach(x => { const b = x.querySelector('[data-act=sel]'); if (b && +b.dataset.i === +t.dataset.i) b.querySelector('small').textContent = a.hrs + ' h/day'; }); return; } if (t.dataset && t.dataset.act === 'hour') { UI.est.hour = +t.value; updateDay(); const lb = $('.scene-slider b'); if (lb) lb.textContent = hr12(UI.est.hour); } });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList && (e.target.classList.contains('opt') || e.target.classList.contains('click'))) e.target.click(); });
  document.addEventListener('click', e => { if (UI.menu && !e.target.closest('.menuwrap')) { UI.menu = null; renderChrome(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#modal').innerHTML) A.mclose(); else if (UI.menu) { UI.menu = null; renderChrome(); } } });
  $('#q').addEventListener('input', e => { UI.q = e.target.value; if (!/^#\/pipeline/.test(location.hash)) location.hash = '#/pipeline'; else renderView(); });
  window.addEventListener('hashchange', render);
  render();
})();
