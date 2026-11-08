/* Zenith: critical path method (CPM) for job delay prioritization.
   Pure and deterministic. No machine learning. Days are counted from quote acceptance (Day 0).
   All durations are assumptions held in one editable table (see data.js). CPM ignores crew capacity. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CPM = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const IDS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const NAMES = { T2: 'Permit package prep', T3: 'Permit processing', T4: 'Materials procurement', T5: 'Work order and crew slot', T6: 'Installation', T7: 'QA and turnover' };
  const PRED = { T2: [], T3: ['T2'], T4: [], T5: [], T6: ['T3', 'T4', 'T5'], T7: ['T6'] };
  const OWNER = { T2: 'Intake / permit staff + agent', T3: 'Utility / LGU (external)', T4: 'Procurement', T5: 'Dispatch (manager)', T6: 'Technician', T7: 'QA' };
  const EXTERNAL = { T3: true };
  const DEFAULTS = { T2: 4, T3: 10, T4: 7, T4batt: 12, T5: 2, T6: 3, T7: 1 };

  // sp = { promised, freeInDays, hasBatt, dur: {...}, tech, tasks: { T2: { start, done, expected } ... } } ; today = job day (days since acceptance)
  function schedule(sp, today) {
    const dur = Object.assign({}, DEFAULTS, sp.dur || {}), T = sp.tasks || {}, d = id => id === 'T4' ? (sp.hasBatt ? dur.T4batt : dur.T4) : dur[id];
    const free = Math.max(0, sp.freeInDays || 0);
    // baseline plan (no actuals) to know what counts as late
    const base = {}; IDS.forEach(id => { const es = Math.max(id === 'T5' ? free : 0, ...PRED[id].map(p => base[p].ef), 0); base[id] = { es, ef: es + d(id) }; });
    const r = {};
    IDS.forEach(id => {
      const t = T[id] || {}, preds = PRED[id];
      let es = Math.max(id === 'T5' ? free : 0, ...preds.map(p => r[p].ef), 0);
      if (t.start != null) es = t.start;
      let ef, done = t.done != null;
      if (done) ef = t.done;
      else {
        ef = es + d(id);
        if (ef < today) ef = (t.expected != null && t.expected > today) ? t.expected : today + 1; // past plan and unfinished
        else if (t.expected != null && t.expected > ef) ef = t.expected;
      }
      r[id] = { id, name: NAMES[id], owner: id === 'T6' && sp.tech ? sp.tech : OWNER[id], external: !!EXTERNAL[id], dur: d(id), es, ef, done, late: ef > base[id].ef, preds };
    });
    const start = r.T6.es, finish = r.T7.ef, slip = start - sp.promised;
    // backward pass against the projected finish, so the critical path has zero slack
    IDS.slice().reverse().forEach(id => {
      const succ = IDS.filter(s => PRED[s].includes(id)), lf = succ.length ? Math.min(...succ.map(s => r[s].ls)) : finish;
      r[id].lf = lf; r[id].ls = lf - (r[id].ef - r[id].es); r[id].slack = r[id].ls - r[id].es;
    });
    IDS.forEach(id => { r[id].critical = r[id].slack === 0; });
    // chain of critical tasks ending at T7, walking back through the latest-finishing predecessor
    const chain = ['T7', 'T6']; let cur = 'T6';
    while (PRED[cur].length) { cur = PRED[cur].slice().sort((a, b) => r[b].ef - r[a].ef)[0]; chain.push(cur); }
    chain.reverse();
    const lateInChain = chain.find(id => r[id].late && !r[id].done);
    const bindingId = lateInChain || chain.slice().reverse().find(id => id !== 'T6' && id !== 'T7') || 'T6';
    const nonCrit = IDS.filter(id => !r[id].critical && !r[id].done);
    const minSlack = nonCrit.length ? Math.min(...nonCrit.map(id => r[id].slack)) : null;
    const res = { tasks: r, order: IDS, chain, start, finish, slip, promised: sp.promised, today, binding: { id: bindingId, name: NAMES[bindingId], owner: r[bindingId].owner, external: r[bindingId].external }, minSlack, daysToPromise: sp.promised - today };
    res.action = recommend(res, sp);
    return res;
  }

  // rule-based recommendation. agent:true means an agent drafts it and a human must approve before anything is sent.
  function recommend(res, sp) {
    const b = res.binding.id, t = res.tasks, mat = t.T4;
    if (res.slip > 0) {
      if (b === 'T2') return { kind: 'prep', agent: true, text: `Agent drafts a reminder with the prefilled form for the missing documents. Staff approve before it is sent. ${res.slip >= 3 ? 'Manager is alerted: the job is overdue.' : ''}`.trim() };
      if (b === 'T3') return { kind: 'permit', agent: false, text: 'Follow up with the utility or LGU and update the customer’s date. We cannot speed up the processing.' };
      if (b === 'T4') return { kind: 'materials', agent: true, text: 'Agent drafts a message to confirm the supplier date and asks procurement to line up a backup supplier.' };
      if (b === 'T5') return { kind: 'crew', agent: true, text: 'Agent proposes reassigning the crew slot using the technician score. Manager approves.' };
      return { kind: 'watch', agent: false, text: 'Review the binding task with its owner.' };
    }
    if (mat && !mat.done && mat.slack != null && mat.slack <= 2) return { kind: 'materials', agent: true, text: 'Materials slack is 2 days or less. Agent drafts a message to confirm the supplier date and line up a backup.' };
    if (res.slip < 0) return { kind: 'early', agent: false, text: 'Ahead of schedule. Hold a crew slot and offer an earlier install only after the permit is approved.' };
    return { kind: 'ok', agent: false, text: 'On track. No action needed.' };
  }

  // rank: largest projected slip first, then smallest remaining slack, then fewest days until the promised date
  function rank(items) {
    const ms = x => x.res.minSlack == null ? 999 : x.res.minSlack;
    return items.slice().sort((a, b) => b.res.slip - a.res.slip || ms(a) - ms(b) || a.res.daysToPromise - b.res.daysToPromise);
  }
  return { IDS, NAMES, PRED, OWNER, DEFAULTS, schedule, rank, recommend };
});
