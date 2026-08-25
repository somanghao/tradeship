/* 한 품목이 어디서 나고 어디서 팔리나 — P1 작업용 조사 도구.
   node tools/probe-good.mjs silver silk ... */
import { CITY_BY_ID, GOOD_BY_ID, GOODS } from '../js/data.js';

const ids = process.argv.slice(2);
for (const gid of ids) {
  const g = GOOD_BY_ID[gid];
  if (!g) { console.log(`${gid} — 그런 품목 없음`); continue; }
  const sup = [], dem = [];
  for (const c of Object.values(CITY_BY_ID)) {
    if (c.supply?.[gid] != null) sup.push(`${c.name}(${c.region.slice(0, 4)}) ${c.supply[gid]}`);
    if (c.demand?.[gid] != null) dem.push(`${c.name}(${c.region.slice(0, 4)}) ${c.demand[gid]}`);
  }
  console.log(`\n■ ${g.name}(${gid}) base ${g.base}`);
  console.log(`  산지 ${sup.length}: ${sup.join(' · ')}`);
  console.log(`  수요 ${dem.length}: ${dem.join(' · ')}`);
}
if (!ids.length) console.log(GOODS.map((g) => `${g.id}(${g.name}) ${g.base}`).join(' · '));
