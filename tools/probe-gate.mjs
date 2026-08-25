/* 원양 관문 항구의 산지/수요 현황 — P1 작업용 조사 도구.
   node tools/probe-gate.mjs */
import { CITY_BY_ID, GOODS, GOOD_BY_ID } from '../js/data.js';
import { LIVE_LANES } from '../js/regions/index.js';

const gates = [...new Set(LIVE_LANES.flatMap((l) => [l.a, l.b]))];
for (const g of gates) {
  const c = CITY_BY_ID[g];
  if (!c) { console.log(g, 'MISSING'); continue; }
  const s = Object.entries(c.supply ?? {}).map(([k, v]) => `${GOOD_BY_ID[k]?.name ?? k}:${v}`).join(' ');
  const d = Object.entries(c.demand ?? {}).map(([k, v]) => `${GOOD_BY_ID[k]?.name ?? k}:${v}`).join(' ');
  console.log(`${g.padEnd(15)} [${c.region}] size${c.size}\n   산 ${s}\n   수 ${d}`);
}

/* 권역별 산지/수요 집합 */
const REG = {};
for (const c of Object.values(CITY_BY_ID)) {
  const r = (REG[c.region] ??= { sup: new Set(), dem: new Set() });
  for (const k of Object.keys(c.supply ?? {})) r.sup.add(k);
  for (const k of Object.keys(c.demand ?? {})) r.dem.add(k);
}
console.log('\n=== 권역별 산지 ===');
for (const [r, v] of Object.entries(REG)) {
  console.log(`${r.padEnd(15)} 산: ${[...v.sup].map((k) => GOOD_BY_ID[k]?.name ?? k).join(',')}`);
  console.log(`${''.padEnd(15)} 수: ${[...v.dem].map((k) => GOOD_BY_ID[k]?.name ?? k).join(',')}`);
}
console.log(`\n전체 교역품 ${GOODS.length}종`);
