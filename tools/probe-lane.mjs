/* 원양 항로가 왜 평균이 낮은가 — 항로마다 「이 대양을 건너야만 얻는 물건」이 있나.
   node .playtest/supremacy-balance/probe-lane.mjs */
import { state, resetGame, voyageDays, voyageCost, boardShip, hire, shorthanded, neighborsOf } from '../js/state.js';
import { SHIPS, CITY_BY_ID, CITIES, GOODS, GOOD_BY_ID, SPREAD } from '../js/data.js';
import { LIVE_LANES } from '../js/regions/index.js';

const mul = (c, gid) => { const v = c.supply?.[gid] ?? c.demand?.[gid]; return v == null ? 1 : 1 + (v - 1) * SPREAD; };
const won = n => Math.round(n).toLocaleString('en-US');
resetGame();
const s = SHIPS.galleon;
state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
state.gold = 1e9; boardShip('galleon');
while (shorthanded()) if (!hire(1).ok) break;

/* 권역별 산지/수요 — 「이 바다에만 나는 물건」을 센다 */
const REG = {};
for (const c of CITIES) {
  const r = (REG[c.region] ??= { sup: new Set(), dem: new Set() });
  for (const g of Object.keys(c.supply ?? {})) r.sup.add(g);
  for (const g of Object.keys(c.demand ?? {})) r.dem.add(g);
}
const regionOf = id => CITY_BY_ID[id]?.region;

console.log('원양 항로별 — 최고 차익 품목과 그 배율 (구조분 · SPREAD ' + SPREAD + ')\n');
console.log('항로                                일수 위험  최고품목       배율   교차권역 전용품목  항차 순이익  닢/일');
const rows = [];
for (const l of LIVE_LANES) {
  for (const [a, b] of [[l.a, l.b], [l.b, l.a]]) {
    const A = CITY_BY_ID[a], B = CITY_BY_ID[b];
    if (!A || !B) continue;
    let best = null;
    for (const g of GOODS) {
      const pA = g.base * mul(A, g.id), pB = g.base * mul(B, g.id);
      const live = (A.supply?.[g.id] ?? A.demand?.[g.id]) != null || (B.supply?.[g.id] ?? B.demand?.[g.id]) != null;
      if (!live) continue;
      const ratio = pB / pA;
      if (!best || ratio > best.ratio) best = { id: g.id, ratio, val: pB - pA };
    }
    /* 「건너야만 얻는 물건」 = 출발 권역에 산지가 있는데 도착 권역엔 산지가 없고 수요만 있는 것 */
    const ra = regionOf(a), rb = regionOf(b);
    let only = 0;
    for (const g of GOODS) {
      if (REG[ra]?.sup.has(g.id) && !REG[rb]?.sup.has(g.id) && REG[rb]?.dem.has(g.id)) only++;
    }
    const d = voyageDays(a, b);
    state.at = a; state.fleet.galleon.at = a;
    rows.push({ a, b, d, risk: l.risk ?? 0, best, only, ra, rb });
  }
}
rows.sort((x, y) => y.best.ratio - x.best.ratio);
for (const r of rows) {
  console.log(`${(CITY_BY_ID[r.a].name + '→' + CITY_BY_ID[r.b].name).padEnd(28)} ${String(r.d).padStart(3)}일 ${String(r.risk).padStart(4)}  ${(GOOD_BY_ID[r.best.id]?.name ?? r.best.id).padEnd(10)} ${r.best.ratio.toFixed(2).padStart(6)}   ${String(r.only).padStart(6)}종`);
}
const rr = rows.map(r => r.best.ratio).sort((a, b) => a - b);
const oo = rows.map(r => r.only).sort((a, b) => a - b);
console.log(`\n최고 배율 중앙 ${rr[Math.floor(rr.length / 2)].toFixed(2)} · 최소 ${rr[0].toFixed(2)} · 최대 ${rr[rr.length - 1].toFixed(2)}`);
console.log(`「건너야만 얻는 물건」 중앙 ${oo[Math.floor(oo.length / 2)]}종 · 0종인 방향 ${oo.filter(x => x === 0).length}/${oo.length}`);

/* 근해 비교 */
const near = [];
const ids = Object.keys(CITY_BY_ID);
for (let i = 0; i < 120; i++) {
  const a = ids[Math.floor(Math.random() * ids.length)];
  const nb = neighborsOf(a); if (!nb.length) { i--; continue; }
  const A = CITY_BY_ID[a];
  let top = 1;
  for (const b of nb) {
    const B = CITY_BY_ID[b];
    for (const g of GOODS) {
      const live = (A.supply?.[g.id] ?? A.demand?.[g.id]) != null || (B.supply?.[g.id] ?? B.demand?.[g.id]) != null;
      if (!live) continue;
      top = Math.max(top, (g.base * mul(B, g.id)) / (g.base * mul(A, g.id)));
    }
  }
  near.push(top);
}
near.sort((a, b) => a - b);
console.log(`근해 최고 배율 중앙 ${near[Math.floor(near.length / 2)].toFixed(2)} (표본 ${near.length})`);
