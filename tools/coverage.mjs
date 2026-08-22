// coverage.mjs — **테스트케이스 카탈로그와 커버리지**를 코드에서 만들어 낸다
//
//   node tools/coverage.mjs            # .playtest/nine-seas/COVERAGE.md 를 쓴다
//   node tools/coverage.mjs --list     # 케이스 목록만 (무엇을 아직 안 눌러 봤나)
//
// 왜 생성하나 — 케이스를 손으로 적으면 **세계가 늘 때마다 낡는다.** 항구가 264곳이고
// 상단이 68이고 선종이 아흔 몇인데, 그 목록을 문서에 박아 두면 다음 사람이 추가한 항구는
// 영원히 "테스트 대상"이 아니게 된다. 그래서 카탈로그를 **코드에서 파생**시키고,
// 실제로 밟은 것은 러너 산출물(`result*.json` · `ocean-season.json` · `payday-inland.json` ·
// `conquest/PROGRESS.md`)에서 긁어 맞춘다.
//
// 케이스 갈래는 여섯이다:
//   E  사건       — 이 세계에서 날 수 있는 사건 전부(해상·뭍·시장충격·살림)
//   P  항구       — 264곳을 실제로 밟았나 (권역별 집계)
//   R  권역       — 아홉 바다마다 기동·항구·항해가 도나
//   L  원양·계절  — 권역을 잇는 항로와 계절 전환
//   G  성장       — 배 승급·계약·전투 나포·거점·공업력  ★일부는 **게임에 아직 없다**
//   S  시나리오   — 한반도에서 시작해 아홉 바다로 (완주 플레이)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEA_EVENTS, SHOCK, START_PORTS } from '../js/data.js';
import {
  REGIONS, ALL_CITY_GEO, ALL_SHIPS, ALL_TRADERS, ALL_PIRATES, ALL_FIGURES,
  OCEAN_LANES, citiesOfRegion,
} from '../js/regions/index.js';
import { EV_ORDER } from './playtest-live/event-signs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.playtest', 'nine-seas');
const CONQ = join(HERE, '..', '.playtest', 'conquest');

/* ── 1. 러너가 남긴 것을 모은다 ───────────────────────────────── */
function loadRuns() {
  const seen = {};              // 사건 id → 관측 수
  const ports = new Set();      // 밟은 항구
  const regions = {};           // 권역 → { cases, legs }
  const files = [];

  const eat = (results) => {
    for (const r of results ?? []) {
      regions[r.region] = { cases: r.cases ?? [], legs: r.legLog?.length ?? 0 };
      ports.add(r.port);
      for (const l of r.legLog ?? []) { if (l.to) ports.add(l.to); if (l.from) ports.add(l.from); }
      for (const [k, v] of Object.entries(r.seen ?? {})) seen[k] = (seen[k] || 0) + v;
    }
  };

  if (existsSync(OUT)) {
    for (const f of readdirSync(OUT).filter((x) => /^result.*\.json$/.test(x))) {
      files.push(f);
      eat(JSON.parse(readFileSync(join(OUT, f), 'utf8')).results);
    }
    for (const f of ['ocean-season.json', 'payday-inland.json']) {
      if (!existsSync(join(OUT, f))) continue;
      files.push(f);
      const d = JSON.parse(readFileSync(join(OUT, f), 'utf8'));
      for (const r of [...(d.lanes ?? []), ...(d.runs ?? [])]) {
        for (const [k, v] of Object.entries(r.seen ?? {})) seen[k] = (seen[k] || 0) + v;
        for (const m of r.marks ?? []) { if (m.to) ports.add(m.to); if (m.from) ports.add(m.from); }
        if (r.a) ports.add(r.a);
        if (r.b) ports.add(r.b);
      }
    }
  }
  /* 완주 플레이(에이전트)는 마크다운 일지를 남긴다 — 도시 id가 적혀 있으면 밟은 것으로 센다.
     기계 형식이 아니라 놓치는 것이 있을 수 있어 **하한**으로만 쓴다. */
  let conquest = null;
  const cp = join(CONQ, 'PROGRESS.md');
  if (existsSync(cp)) {
    conquest = readFileSync(cp, 'utf8');
    files.push('conquest/PROGRESS.md');
    for (const c of ALL_CITY_GEO) {
      if (conquest.includes(c.name) || conquest.includes(`'${c.id}'`) || conquest.includes(`${c.id}`)) ports.add(c.id);
    }
  }
  return { seen, ports, regions, files, conquest };
}

const run = loadRuns();
const mark = (ok) => (ok === null ? '⏸ 미실행' : ok ? '✅' : '❌');

/* ── 2. 케이스 카탈로그 ───────────────────────────────────────── */
const cases = [];
const add = (id, what, how, done, note = '') => cases.push({ id, what, how, done, note });

/* E — 사건: 이 세계에서 날 수 있는 것 전부 */
const EVENT_HOW = {
  wind: '항해 중 순풍 판정', storm: '항해 중 폭풍 — 선체·선원 손실, 공동해손',
  drift: '항해 중 표류물', merchant: '상선 조우', deal: '상선과 **실제로 거래**',
  pirate: '해적 조우', battle: '전투 결말(나포·격침·패배)', flee: '전투에서 도주·이탈',
  bandit: '육로 구간 노상강도', toll: '육로 구간 통행세',
  shock_famine: '기근 — 그 도시 그 품목 ×2.0', shock_blockade: '봉쇄 ×1.7',
  shock_glut: '풍작·독점 붕괴 ×0.62', shock_raid: '상인 나포 여파 ×1.55',
  leak: '삭은 배 누수', jettison: '폭풍에 짐 투하', insurance: '적하보험 보상',
  payday: '급여일 정산·체불·이탈', contract: '대형 주문 수주·납품·위약금',
};
for (const k of EV_ORDER) {
  const n = run.seen[k] ?? 0;
  add(`E-${k}`, EVENT_HOW[k] ?? k, '러너가 `state.log`를 분류해 센다', n > 0, n ? `${n}회 관측` : '아직 못 봤다');
}

/* P — 항구: 264곳 */
for (const r of REGIONS) {
  const cs = citiesOfRegion(r.id);
  const hit = cs.filter((c) => run.ports.has(c.id));
  add(`P-${r.id}`, `${r.name} 항구 ${cs.length}곳을 밟는다`, '항해 로그의 출발·도착 항구를 모은다',
    hit.length === cs.length, `${hit.length}/${cs.length}곳`
      + (hit.length < cs.length ? ` · 남은 곳: ${cs.filter((c) => !run.ports.has(c.id)).slice(0, 6).map((c) => c.name).join(', ')}${cs.length - hit.length > 6 ? ' …' : ''}` : ''));
}

/* R — 권역: 아홉 바다 기동·항구·항해 */
for (const sp of START_PORTS) {
  const rid = ALL_CITY_GEO.find((c) => c.id === sp.at)?.region ?? sp.region;
  const g = run.regions[rid];
  const pass = g ? g.cases.filter((c) => c.pass === true).length : 0;
  const fail = g ? g.cases.filter((c) => c.pass === false).length : 0;
  add(`R-${rid}`, `${sp.name ?? rid}에서 시작해 기동·항구·항해를 돈다`,
    '`nine-seas.mjs` TC-01~16', g ? fail === 0 : null,
    g ? `PASS ${pass} · FAIL ${fail} · ${g.legs}구간` : '아직 안 굴렸다');
}

/* L — 원양·계절 */
const oceanFile = join(OUT, 'ocean-season.json');
const ocn = existsSync(oceanFile) ? JSON.parse(readFileSync(oceanFile, 'utf8')) : null;
add('L-lane', `원양 항로 ${OCEAN_LANES.length}개 중 실제로 타 본 것`,
  '`ocean-season.mjs` — 사이드 카드로만 갈 수 있다',
  ocn ? (ocn.lanes ?? []).some((l) => (l.marks ?? []).some((m) => m.arrived)) : null,
  ocn ? `${(ocn.lanes ?? []).filter((l) => (l.marks ?? []).some((m) => m.arrived)).length}/${OCEAN_LANES.length}개 항로` : '아직 안 굴렸다');
add('L-season', '계절이 실제로 바뀐다(60·120일 경계)', '왕복을 거듭해 day를 민다',
  ocn ? (ocn.cases ?? []).some((c) => c.id === 'TC-O3' && c.pass) : null,
  ocn ? `${(ocn.cases ?? []).filter((c) => c.id === 'TC-O3' && c.pass).length}개 항로에서 관측` : '아직');
add('L-monsoon', `계절풍 항로 ${OCEAN_LANES.filter((l) => l.monsoon).length}개 표기 확인`, '`OCEAN_LANES.monsoon`',
  ocn ? (ocn.cases ?? []).some((c) => c.id === 'TC-O4' && c.pass) : null, '');

/* G — 성장: 되는 것과 **아직 게임에 없는 것** */
const GROWTH = [
  ['G-ship', `조선소에서 배를 승급한다 (선종 ${Object.keys(ALL_SHIPS).length}종)`, '조선소 → 매입', 'auto'],
  ['G-used', '중고선을 산다 (`prizeYard` 항구는 더 자주·싸게)', '조선소 중고 탭', 'auto'],
  ['G-arm', '무장·갑판 배치를 바꾼다', '조선소 무장·선원 탭', 'auto'],
  ['G-contract', '대형 주문을 수주·납품하고 위약금도 물어 본다', '항구 우측 `수주` 단추', 'auto'],
  ['G-capture', '백병전으로 적선을 **나포**한다(격침 말고)', '전투 → 접근 → 백병전 돌입', 'auto'],
  ['G-prize', '나포선을 예인·해체·매각한다', '전투 결과 화면', 'auto'],
  ['G-figure', '항구 인물과 대화하고 `service`를 받는다', '항구 사이드패널 인물 카드', 'auto'],
  ['G-base', '항구에 **거점(창고·상관)을 산다**', '—', 'missing:A-1'],
  ['G-industry', '거점에 투자해 그 항구의 **공업력을 올린다** → 상급선 해금', '—', 'missing:A-2'],
  ['G-hidden', '공업력을 끝까지 올린 항구에서만 나오는 **히든 배**(거북선)', '—', 'missing:A-2'],
  ['G-ending', '아홉 바다를 장악한 뒤의 **엔딩**', '—', 'missing:없음'],
];
for (const [id, what, how, kind] of GROWTH) {
  if (kind.startsWith('missing')) {
    add(id, what, how, null, `**게임에 아직 없다** (${kind.split(':')[1]} — UNIMPLEMENTED.md)`);
  } else {
    // 자동 판정이 어려운 것은 완주 일지에서 흔적을 찾는다
    const hit = run.conquest && new RegExp(id.slice(2), 'i').test(run.conquest);
    add(id, what, how, hit ? true : null, hit ? '완주 일지에 기록됨' : '완주 플레이가 확인 중');
  }
}

/* S — 시나리오 */
add('S-korea', '한반도(부산포)에서 **진짜 시작 조건**으로 출발한다(금화 200·선원 0·낡은 바사)',
  '`?start=busanpo` — 치트 없이', run.conquest ? /부산포/.test(run.conquest) : null,
  run.conquest ? '완주 플레이 진행 중' : '아직');
add('S-eastasia', '동아시아를 장악한다 — 그 권역 항구 대부분 방문·배 승급·계약·나포',
  '완주 플레이', null, '완주 플레이가 확인 중');
add('S-ocean', '원양으로 다른 바다에 나간다', '완주 플레이 / `ocean-season.mjs`',
  ocn ? true : null, '');
add('S-nine', '아홉 바다를 모두 돈다', '완주 플레이', null, '완주 플레이가 확인 중');
add('S-end', '**패자 달성 → 엔딩**', '—', null, '**게임에 엔딩 조건이 없다** — 무엇이 끝을 만들어 주지 않는지가 이 케이스의 답이다');

/* ── 3. 출력 ─────────────────────────────────────────────────── */
if (process.argv.includes('--list')) {
  for (const c of cases) console.log(`${mark(c.done).padEnd(7)} ${c.id.padEnd(16)} ${c.what}${c.note ? ' — ' + c.note : ''}`);
  process.exit(0);
}

const L = [];
const p = (x = '') => L.push(x);
const done = cases.filter((c) => c.done === true).length;
const failed = cases.filter((c) => c.done === false).length;
const todo = cases.filter((c) => c.done === null).length;

p('# 테스트케이스 카탈로그와 커버리지 (COVERAGE)');
p('');
p('> **자동 생성** — `node tools/coverage.mjs`. 케이스를 손으로 적지 않는 이유는');
p('> 세계가 늘 때마다 목록이 낡기 때문이다(항구 264 · 상단 68 · 선종 ' + Object.keys(ALL_SHIPS).length + ').');
p('> 카탈로그는 **코드에서 파생**하고, 밟은 것은 러너 산출물에서 긁는다.');
p(`> 읽은 산출물: ${run.files.length ? run.files.join(' · ') : '없음'}`);
p('');
p(`**케이스 ${cases.length}개 — ✅ ${done} · ❌ ${failed} · ⏸ 미실행 ${todo}**`);
p('');
p('| 갈래 | 무엇을 재나 |');
p('|---|---|');
p('| **E** 사건 | 이 세계에서 날 수 있는 사건 전부(해상·뭍·시장충격·살림) |');
p('| **P** 항구 | 264곳을 실제로 밟았나 |');
p('| **R** 권역 | 아홉 바다마다 기동·항구·항해가 도나 |');
p('| **L** 원양·계절 | 권역을 잇는 항로와 계절 전환 |');
p('| **G** 성장 | 배·계약·나포·거점·공업력 — **일부는 게임에 아직 없다** |');
p('| **S** 시나리오 | 한반도에서 시작해 아홉 바다로 |');
p('');

for (const [pre, title] of [['E-', 'E. 사건 — 발동 여부'], ['P-', 'P. 항구 — 커버리지'],
                            ['R-', 'R. 권역 — 아홉 바다'], ['L-', 'L. 원양·계절'],
                            ['G-', 'G. 성장'], ['S-', 'S. 시나리오']]) {
  const rows = cases.filter((c) => c.id.startsWith(pre));
  if (!rows.length) continue;
  p(`## ${title}`);
  p('');
  p('| 케이스 | 무엇 | 어떻게 | 결과 |');
  p('|---|---|---|---|');
  for (const c of rows) p(`| \`${c.id}\` | ${c.what} | ${c.how} | ${mark(c.done)} ${c.note} |`);
  p('');
}

p('## 아직 못 밟은 항구 — 권역별');
p('');
for (const r of REGIONS) {
  const cs = citiesOfRegion(r.id);
  const miss = cs.filter((c) => !run.ports.has(c.id));
  p(`- **${r.name}** ${cs.length - miss.length}/${cs.length}`
    + (miss.length ? ` — 남은 ${miss.length}곳: ${miss.map((c) => c.name).join(', ')}` : ' — **전부 밟았다**'));
}
p('');
p('---');
p('');
p('생성 `node tools/coverage.mjs` · 판정 정본 [RESULTS.md](RESULTS.md) · 발견 [FINDINGS.md](FINDINGS.md)');

writeFileSync(join(OUT, 'COVERAGE.md'), L.join('\n'), 'utf8');
const portHit = ALL_CITY_GEO.filter((c) => run.ports.has(c.id)).length;
console.log(`COVERAGE.md — 케이스 ${cases.length}개 (✅ ${done} · ❌ ${failed} · ⏸ ${todo}) · 항구 ${portHit}/${ALL_CITY_GEO.length}곳`);
