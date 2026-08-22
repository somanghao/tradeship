// nine-seas-report.mjs — 아홉 바다 검증의 세 산출물을 하나로 합쳐 사람이 읽을 표로 만든다
//
//   node tools/nine-seas-report.mjs        # .playtest/nine-seas/RESULTS.md 를 쓴다
//
// 합치는 것 셋:
//   ① inventory.json   — 사건이 **걸릴 자리**가 권역마다 몇인가 (코드에서 센다)
//   ② novel-check.json — 소재집 §6의 근거가 **코드와 맞는가** (문서↔코드 대조)
//   ③ result.json      — 아홉 창을 눌러 본 실클릭 결과 (사람이 그 자리에 **닿았는가**)
//
// ★ 셋은 서로 다른 질문에 답한다. 자리가 있어도(①) 근거가 어긋날 수 있고(②),
//   둘 다 맞아도 플레이 중 안 나올 수 있다(③). 그래서 합쳐야 "잘 발동되는가"가 답해진다.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { EV_ORDER } from './playtest-live/event-signs.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.playtest', 'nine-seas');
const read = (f) => (existsSync(join(OUT, f)) ? JSON.parse(readFileSync(join(OUT, f), 'utf8')) : null);

const inv = read('inventory.json');
const chk = read('novel-check.json');
/* 아홉을 한 번에 굴린 `result.json`과, 배치로 나눠 굴린 `result-<권역>.json`을 **합친다**.
   같은 권역이 여러 파일에 있으면 **나중 것**(더 최근 회차)을 쓴다. */
const res = (() => {
  const files = readdirSync(OUT).filter((f) => /^result.*\.json$/.test(f))
    .map((f) => ({ f, m: statSync(join(OUT, f)).mtimeMs })).sort((a, b) => a.m - b.m);
  const byRegion = new Map();
  let when = null, legs = null;
  for (const { f } of files) {
    const d = JSON.parse(readFileSync(join(OUT, f), 'utf8'));
    when = d.when ?? when; legs = d.legs ?? legs;
    for (const r of d.results ?? []) byRegion.set(r.region, r);
  }
  if (!byRegion.size) return null;
  const ORDER = ['eastasia', 'seasia', 'indian', 'mideast', 'africa', 'mediterranean',
                 'atlantic', 'caribbean', 'southamerica'];
  const results = [...byRegion.values()].sort((a, b) => ORDER.indexOf(a.region) - ORDER.indexOf(b.region));
  return { when, legs, results, files: files.map((x) => x.f) };
})();
const ocn = read('ocean-season.json');      // 원양·계절 보강 라운드
const pdi = read('payday-inland.json');     // 급여일·육로 보강 라운드
if (!inv || !res) { console.error('inventory.json / result.json 이 없다 — 먼저 러너와 인벤토리를 돌린다.'); process.exit(1); }

const REGION_NAME = Object.fromEntries(res.results.map((r) => [r.region, r.name]));
const byRegion = Object.fromEntries(res.results.map((r) => [r.region, r]));

/* ── 소재집 §6 이벤트의 유형 — 근거에 무엇을 참조했나로 가른다 ─── */
const TYPE = [
  ['⑦ 계절풍 통행', /monsoon|OCEAN_LANES|계절풍/],
  ['① 계절 창',     /season/],
  ['③ 나포 여파',   /raids|raidMult|raidDays/],
  ['② 시세 충격',   /shocks|SHOCK\./],
  ['④ 제도·세율',   /TARIFF/],
  ['⑥ 나포선 마당', /prizeYard/],
  ['⑤ 항로 위험',   /ROUTE_RISK|hunt/],
];
function typeOf(basis) {
  for (const [name, re] of TYPE) if (re.test(basis)) return name;
  return /각색/.test(basis) ? '⑧ 각색' : '— 서술';
}

/* 그 유형이 실클릭에서 관측됐나 — 권역 결과의 events 집계와 맞춰 본다 */
const OBSERVED_BY_TYPE = {
  '① 계절 창':     (ev) => null,                                   // 60일 안쪽이라 철이 안 바뀐다
  '② 시세 충격':   (ev, r) => (r.shockRows ?? 0) > 0 || !!(ev.shock_famine || ev.shock_blockade || ev.shock_glut),
  '③ 나포 여파':   (ev, r) => (r.traders ?? 1) > 0 ? !!ev.shock_raid : false,
  '④ 제도·세율':   () => null,
  '⑤ 항로 위험':   (ev) => !!(ev.pirate || ev.battle || ev.flee),
  '⑥ 나포선 마당': () => null,
  '⑦ 계절풍 통행': () => null,
  '⑧ 각색':        () => null,
  '— 서술':        () => null,
};

/* ── 표 만들기 ────────────────────────────────────────────────── */
const L = [];
const p = (s = '') => L.push(s);
const mark = (v) => (v === null ? 'N-A' : v ? 'PASS' : 'FAIL');

p('# 아홉 바다 실클릭 검증 — 결과 (RESULTS)');
p('');
p(`> 실행 ${res.when} · 권역마다 **${res.legs}구간**을 실제로 클릭해 항해했다.`);
p(`> 계획은 [TESTPLAN.md](TESTPLAN.md) · 발견 [FINDINGS.md](FINDINGS.md) · 합친 결과 파일 ${res.files?.length ?? 1}개(${(res.files ?? []).join(' · ')}).`);
p('> 진행판(웹) `http://localhost:8891/.playtest/nine-seas/`');
p('');

/* 1. 케이스 판정 요약 */
p('## 1. 케이스 판정 — 아홉 바다 × 16케이스');
p('');
const allIds = [...new Set(res.results.flatMap((r) => r.cases.map((c) => c.id)))];
p('| 케이스 | 무엇을 확인 | ' + res.results.map((r) => r.region.slice(0, 4)).join(' | ') + ' |');
p('|---|---|' + res.results.map(() => '---').join('|') + '|');
for (const id of allIds) {
  const what = res.results.map((r) => r.cases.find((c) => c.id === id)?.what).find(Boolean) ?? '';
  const cells = res.results.map((r) => {
    const c = r.cases.find((x) => x.id === id);
    return c ? mark(c.pass) : '·';
  });
  p(`| ${id} | ${what} | ${cells.join(' | ')} |`);
}
p('');
const tally = { PASS: 0, FAIL: 0, 'N-A': 0 };
for (const r of res.results) for (const c of r.cases) tally[mark(c.pass)]++;
p(`**합계 — PASS ${tally.PASS} · FAIL ${tally.FAIL} · N-A ${tally['N-A']}**`);
p('');

/* 2. 실제로 발동한 사건 */
p('## 2. 실제로 발동한 사건 — 권역마다 무엇이 났나');
p('');
// 나열 순서는 러너와 같은 표를 쓴다
p('| 권역 | 구간 | ' + EV_ORDER.join(' | ') + ' |');
p('|---|---|' + EV_ORDER.map(() => '---').join('|') + '|');
for (const r of res.results) {
  const ev = r.seen ?? {};
  p(`| ${r.name} | ${r.legLog?.length ?? 0} | ` + EV_ORDER.map((k) => ev[k] ?? '·').join(' | ') + ' |');
}
p('');
const total = {};
for (const r of res.results) for (const [k, v] of Object.entries(r.seen ?? {})) total[k] = (total[k] || 0) + v;
p('**아홉 바다 합계 — ' + EV_ORDER.filter((k) => total[k]).map((k) => `${k} ${total[k]}`).join(' · ') + '**');

/* ★ 보강 라운드까지 합쳐야 "한 번도 안 난 사건"이 참이 된다. 권역 안 14구간만으로 판정하면
   급여일·원양 사건이 "안 났다"로 적히는데, 그것은 그 회차가 **못 보는 자리**일 뿐이다. */
const totalAll = { ...total };
for (const data of [ocn, pdi]) {
  for (const r of (data?.lanes ?? data?.runs ?? [])) {
    for (const [k, v] of Object.entries(r.seen ?? {})) totalAll[k] = (totalAll[k] || 0) + v;
  }
}
const extraKeys = EV_ORDER.filter((k) => totalAll[k] && !total[k]);
if (extraKeys.length) p(`**보강 라운드에서 더 관측 — ${extraKeys.map((k) => `${k} ${totalAll[k]}`).join(' · ')}**`);
const never = EV_ORDER.filter((k) => !totalAll[k]);
if (never.length) p(`**모든 회차를 통틀어 한 번도 안 난 사건 — ${never.join(' · ')}**`);
p('');

/* 3. 사건이 걸릴 자리 (인벤토리) */
p('## 3. 사건이 걸릴 자리 — 코드에서 센 것');
p('');
p('| 권역 | 도시 | 해상/육로 구간 | 원양(계절풍) | 기근 | 봉쇄 | 풍작 | 상인 | 해적 | 인물 | 나포선마당 |');
p('|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of res.results) {
  const s = inv.regions[r.region];
  if (!s) continue;
  p(`| ${r.name} | ${s.cities} | ${s.routes.sea}/${s.routes.inland} | ${s.oceanLanes.total}(${s.oceanLanes.monsoon}) `
    + `| ${s.shockSlots.famine} | ${s.shockSlots.blockade} | ${s.shockSlots.glut} `
    + `| ${s.traders.n} | ${s.pirates.n} | ${s.figures.n} | ${s.prizeYard.join(', ') || '—'} |`);
}
p('');

/* 4. 소재집 §6 연계 */
if (chk) {
  p('## 4. 소설 소재집 §6 이벤트 72건 — 근거 대조와 연계');
  p('');
  p('| 권역 | 이벤트 | 대조한 주장 | 어긋남 | 각색표기 |');
  p('|---|---|---|---|---|');
  for (const [rid, b] of Object.entries(chk.byRegion)) {
    p(`| ${REGION_NAME[rid] ?? rid} | ${b.events} | ${b.claims} | ${b.fails} | ${b.dramatized} |`);
  }
  const sum = Object.values(chk.byRegion).reduce((a, b) => ({
    events: a.events + b.events, claims: a.claims + b.claims, fails: a.fails + b.fails, dram: a.dram + b.dramatized,
  }), { events: 0, claims: 0, fails: 0, dram: 0 });
  p(`| **합계** | **${sum.events}** | **${sum.claims}** | **${sum.fails}** | **${sum.dram}** |`);
  p('');

  // 유형별 집계
  const typeCount = {};
  for (const row of chk.rows) {
    const t = typeOf(JSON.stringify(row));
    (typeCount[t] ??= { n: 0, regions: new Set() });
    typeCount[t].n++; typeCount[t].regions.add(row.region);
  }
  p('### 유형별 — 무엇으로 굴러가는 이벤트인가');
  p('');
  p('| 유형 | 건수 | 게임의 구현 자리 | 실클릭 관측 |');
  p('|---|---|---|---|');
  const WHERE = {
    '① 계절 창': 'NPC의 `season` · `inSeason(def, day)`',
    '② 시세 충격': '`SHOCK.events` · `state.js: rollShockEvents`',
    '③ 나포 여파': '`world.js: raids()` → `SHOCK.raidMult`',
    '④ 제도·세율': '`trade.js: TARIFF_OVERRIDE` (정적)',
    '⑤ 항로 위험': '`geo.js: ROUTE_RISK` · `npc-pirates.js: hunt`',
    '⑥ 나포선 마당': '`geo.js: prizeYard` → 조선소 중고 매물',
    '⑦ 계절풍 통행': '`index.js: OCEAN_LANES.monsoon`',
    '⑧ 각색': '— (소재집이 스스로 표기)',
    '— 서술': '— (자유서술)',
  };
  const OBS = {
    '① 계절 창': `철이 안 바뀐다 — ${res.legs}구간으로는 60일을 못 넘긴다`,
    '② 시세 충격': total.shock_famine || total.shock_blockade || total.shock_glut
      ? `관측 ${['shock_famine', 'shock_blockade', 'shock_glut'].filter((k) => total[k]).map((k) => `${k}×${total[k]}`).join(' ')}`
      : '로그로는 안 잡혔다 (TC-14의 state.shocks로는 실림)',
    '③ 나포 여파': total.shock_raid ? `관측 ${total.shock_raid}건` : '한 건도 안 났다',
    '④ 제도·세율': '정적 상수라 항해로는 안 드러난다 (입항세로만 체감)',
    '⑤ 항로 위험': total.pirate ? `해적 조우 ${total.pirate}건` : '조우 없음',
    '⑥ 나포선 마당': '조선소 매물로 확인 (TC-08)',
    '⑦ 계절풍 통행': '권역 안 항해라 원양 항로를 안 탔다',
    '⑧ 각색': '—',
    '— 서술': '—',
  };
  for (const [t, v] of Object.entries(typeCount).sort((a, b) => b[1].n - a[1].n)) {
    p(`| ${t} | ${v.n} | ${WHERE[t] ?? ''} | ${OBS[t] ?? ''} |`);
  }
  p('');
}

/* 4-b. 보강 라운드 — 권역 안 항해로는 구조적으로 안 나오는 것들 */
if (ocn || pdi) {
  p('## 5. 보강 라운드 — 아홉 창 러너가 구조적으로 못 보는 것');
  p('');
  p('권역 **안**만 도는 14구간으로는 못 닿는 자리가 셋 있다 —');
  p('원양 항로(권역과 권역 사이에만 있다) · 계절 전환(60일을 넘겨야 한다) ·');
  p('육로 사건(`INLAND_ODDS` 0.12라 두 번 타서는 77%가 무사통과다). 그래서 따로 굴렸다.');
  p('');
  for (const [title, data] of [['원양·계절 (`ocean-season.mjs`)', ocn], ['급여일·육로 (`payday-inland.mjs`)', pdi]]) {
    if (!data) continue;
    p(`### ${title}`);
    p('');
    p('| 대상 | 케이스 | 무엇을 확인 | 판정 | 관측 |');
    p('|---|---|---|---|---|');
    for (const c of data.cases) {
      p(`| ${c.lane ?? c.tag} | ${c.id} | ${c.what} | ${mark(c.pass)} | ${String(c.note).replace(/\|/g, '·')} |`);
      tally[mark(c.pass)]++;
    }
    p('');
  }
}

/* 5. 실패와 그 원인 */
p('## 6. 실패한 케이스와 원인');
p('');
const fails = [];
for (const r of res.results) for (const c of r.cases) if (c.pass === false) fails.push({ region: r.name, ...c });
for (const data of [ocn, pdi]) for (const c of (data?.cases ?? [])) if (c.pass === false) fails.push({ region: c.lane ?? c.tag, ...c });
if (!fails.length) p('없다 — 아홉 바다 전 케이스 통과.');
else {
  p('| 권역 | 케이스 | 무엇을 확인 | 관측된 값 |');
  p('|---|---|---|---|');
  for (const f of fails) p(`| ${f.region} | ${f.id} | ${f.what} | ${f.note.replace(/\|/g, '·')} |`);
}
p('');

/* 6. 테스트 방법 — 케이스마다 어떻게 눌렀나 */
p('## 7. 테스트 방법 — 케이스마다 무엇을 어떻게 했나');
p('');
p('| 케이스 | 무엇을 확인 | 어떻게 |');
p('|---|---|---|');
const allCases = [...res.results.flatMap((r) => r.cases), ...(ocn?.cases ?? []), ...(pdi?.cases ?? [])];
for (const id of [...new Set(allCases.map((c) => c.id))]) {
  const c = allCases.find((x) => x.id === id && x.how);
  if (c) p(`| ${id} | ${c.what} | ${c.how} |`);
}
p('');
p('---');
p('');
p('생성 `node tools/nine-seas-report.mjs`');

writeFileSync(join(OUT, 'RESULTS.md'), L.join('\n'), 'utf8');
console.log(`RESULTS.md 기록 — 케이스 PASS ${tally.PASS} / FAIL ${tally.FAIL} / N-A ${tally['N-A']}`);
if (never.length) console.log(`모든 회차를 통틀어 한 번도 안 난 사건 — ${never.join(' · ')}`);
