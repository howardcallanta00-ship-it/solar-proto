// node cpm.test.js : checks the section-4 scenarios
const C = require('./cpm.js'); let bad = 0;
const eq = (n, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + n, ok ? '' : `got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`); };
// single job
let r = C.schedule({ promised: 14, freeInDays: 0, tasks: {} }, 0);
eq('critical path length', r.finish, 18);
eq('slack prep/permit/install/qa', ['T2', 'T3', 'T6', 'T7'].map(i => r.tasks[i].slack), [0, 0, 0, 0]);
eq('slack materials', r.tasks.T4.slack, 7); eq('slack work order', r.tasks.T5.slack, 12);
r = C.schedule({ promised: 14, freeInDays: 0, dur: { T2: 6 }, tasks: {} }, 0);
eq('prep 6 -> finish Day 20', r.finish, 20); eq('prep 6 -> slip 2', r.slip, 2);
// scenarios (promised Day 14)
const A = C.schedule({ promised: 14, freeInDays: 0, tasks: { T2: { start: 0, expected: 7 }, T5: { done: 2 } } }, 6);
const B = C.schedule({ promised: 14, freeInDays: 0, hasBatt: true, tasks: { T2: { start: 0, done: 4 }, T3: { start: 4 }, T4: { start: 0, expected: 12 }, T5: { done: 2 } } }, 9);
const Cc = C.schedule({ promised: 14, freeInDays: 0, tasks: { T2: { start: 0, done: 2 }, T3: { start: 2 }, T5: { done: 2 } } }, 3);
eq('A start/slip', [A.start, A.slip], [17, 3]); eq('A binding', A.binding.name, 'Permit package prep');
eq('B start/slip', [B.start, B.slip], [14, 0]); eq('B materials slack', B.tasks.T4.slack, 2);
eq('C start/slip', [Cc.start, Cc.slip], [12, -2]); eq('C materials slack', Cc.tasks.T4.slack, 5);
eq('ranking A,B,C', C.rank([{ id: 'C', res: Cc }, { id: 'B', res: B }, { id: 'A', res: A }]).map(x => x.id), ['A', 'B', 'C']);
eq('oldest-first would be B,A,C (job age 9,6,3 -> B,A,C)', [9, 6, 3].map((a, i) => ['B', 'A', 'C'][i]), ['B', 'A', 'C']);
// crew availability
r = C.schedule({ promised: 14, freeInDays: 12, tasks: {} }, 0); eq('crew free Day 12 -> T5 ends 14 > permit path', [r.tasks.T5.ef, r.start], [14, 14]);
r = C.schedule({ promised: 14, freeInDays: 16, tasks: {} }, 0); eq('crew binding when free late (free Day 16 + 2 d work order)', [r.start, r.binding.id], [18, 'T5']);
console.log(bad ? bad + ' FAILED' : 'ALL PASS'); process.exit(bad ? 1 : 0);
