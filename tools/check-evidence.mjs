// check-evidence.mjs — 수치와 근거가 어긋나지 않았는지 본다
//
// 도시 데이터는 세 겹이다:
//   ① js/map/geo.js       좌표·깃발·규모        (UI 도시)
//   ② js/data.js          CITY_TRADE 수치        (도시 테이블)
//   ③ content/city-evidence.json  근거·출처      (근거 데이터)
//
// 수치만 고치고 근거를 안 고치면 셋이 조용히 어긋난다. 그 순간
// "왜 이 값인지"를 아무도 모르게 되고, 다음 사람이 고증을 되돌려 놓는다.
// 이 스크립트가 그걸 막는다.
//
//   node tools/check-evidence.mjs

import { readFileSync } from 'node:fs';
import { CITIES, GOOD_BY_ID } from '../js/data.js';
import { GEO_BY_ID } from '../js/map/geo.js';

const EV = JSON.parse(readFileSync(new URL('../content/city-evidence.json', import.meta.url), 'utf8'));

const problems = [];
const warn = (kind, where, msg) => problems.push({ kind, where, msg });

let checked = 0, sourced = 0, gameplay = 0;
const byVerdict = {};

for (const city of CITIES) {
  const ev = EV.cities[city.id];
  if (!ev) {
    warn('근거없음', city.name, '이 도시 전체가 city-evidence.json에 없다');
    continue;
  }

  // 깃발
  const geo = GEO_BY_ID[city.id];
  if (!ev.flag) warn('근거없음', `${city.name} 깃발`, '근거가 없다');
  else if (ev.flag.value !== geo.flag) {
    warn('불일치', `${city.name} 깃발`, `코드 '${geo.flag}' ≠ 근거 '${ev.flag.value}'`);
  }

  // 교역품
  const inCode = new Map();
  for (const [gid, v] of Object.entries(city.supply)) inCode.set(gid, { side: 'supply', value: v });
  for (const [gid, v] of Object.entries(city.demand)) inCode.set(gid, { side: 'demand', value: v });

  const goods = ev.goods || {};
  for (const [gid, code] of inCode) {
    checked++;
    const e = goods[gid];
    const name = GOOD_BY_ID[gid]?.name ?? gid;
    if (!e) {
      warn('근거없음', `${city.name} · ${name}`, `${code.side} ${code.value} — 근거가 없다`);
      continue;
    }
    if (e.side !== code.side) {
      warn('불일치', `${city.name} · ${name}`, `코드 ${code.side} ≠ 근거 ${e.side}`);
    }
    if (Math.abs((e.value ?? -1) - code.value) > 1e-9) {
      warn('불일치', `${city.name} · ${name}`, `코드 ${code.value} ≠ 근거 ${e.value}`);
    }
    byVerdict[e.verdict] = (byVerdict[e.verdict] || 0) + 1;
    if (e.verdict === 'gameplay') gameplay++;
    if (e.sources?.length) sourced++;
    if (!e.basis) warn('빈칸', `${city.name} · ${name}`, 'basis(근거 서술)가 비어 있다');
    if (e.verdict && !EV.verdicts[e.verdict]) {
      warn('빈칸', `${city.name} · ${name}`, `모르는 verdict '${e.verdict}'`);
    }
  }

  // 근거에만 있고 코드에 없는 항목 (수치를 지웠는데 근거가 남은 경우)
  for (const gid of Object.keys(goods)) {
    if (!inCode.has(gid)) {
      warn('유령', `${city.name} · ${GOOD_BY_ID[gid]?.name ?? gid}`, '근거에는 있는데 CITY_TRADE에 없다');
    }
  }
}

// 근거에만 있는 도시
for (const id of Object.keys(EV.cities)) {
  if (!CITIES.some((c) => c.id === id)) warn('유령', id, '근거에는 있는데 CITIES에 없다');
}

/* ── 출력 ─────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n=== 도시 근거 점검 (${EV.era.label}) ===`);
console.log(`도시 ${CITIES.length} · 교역 항목 ${checked} · 출처가 달린 항목 ${sourced} · 게임성 예외 ${gameplay}`);
console.log('판정 분포: ' + Object.entries(byVerdict)
  .map(([k, n]) => `${EV.verdicts[k] ?? k} ${n}`).join(' · '));

if (!problems.length) {
  console.log('\n문제 없음 — 수치와 근거가 맞물려 있다.\n');
  process.exit(0);
}

console.log(`\n문제 ${problems.length}건:`);
for (const p of problems) {
  console.log(`  [${pad(p.kind, 5)}] ${pad(p.where, 22)} ${p.msg}`);
}
console.log('');
// 근거 누락·불일치는 실패로 다룬다. 수치를 고쳤으면 근거도 같이 고쳐야 한다.
process.exit(1);
