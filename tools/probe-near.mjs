/* 근해 전수 측정 — 표본오차 없이 「근해가 움직였나」를 본다.
   ★ `probe-growth.mjs ③`의 근해 표본은 (a) 도시를 무작위로 48개만 뽑고
     (b) `!isOceanGate(x) || true`라 **원양 항로가 근해 표본에 섞인다.**
     그래서 원양을 고치면 근해 수치도 따라 움직여, 「근해 ±3%」를 그 도구로는 못 잰다.
   여기서는 **원양 항로가 아닌 모든 인접 항구 쌍**을 양방향 전수로 돌린다(결정론적).

   node tools/probe-near.mjs [적재칸]
*/
import {
  state, resetGame, neighborsOf, voyageDays, voyageCost, hire, shorthanded, boardShip, insuranceFor,
} from '../js/state.js';
import * as S from '../js/state.js';
/* 적하보험과 선원 사무역을 함께 센다 — 안 그러면 프로브가 비용을 빼먹는다(probe-ocean 참조). */
const crewCut = () => (S.privateTradeCut ? S.privateTradeCut() : 0);
import { planFor } from './sim-core.mjs';
import { SHIPS, CITY_BY_ID } from '../js/data.js';
import { isOceanLane } from '../js/regions/index.js';

const CAP = +(process.argv[2] || 200);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const won = (n) => Math.round(n).toLocaleString('en-US');

resetGame();
const s = SHIPS.galleon;
state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
state.gold = 1e9; boardShip('galleon');
while (shorthanded()) if (!hire(1).ok) break;

const rows = [];
for (const a of Object.keys(CITY_BY_ID)) {
  for (const b of neighborsOf(a)) {
    if (isOceanLane(a, b)) continue;            // 원양은 여기서 세지 않는다
    state.gold = 1e9;
    state.at = a; state.fleet.galleon.at = a;
    state.cargo = {}; state.buyPrice = {};
    const p = planFor(b, CAP, 1e9, 0);
    const d = voyageDays(a, b);
    const ins = insuranceFor({ from: a, to: b, value: p.spend });
    const net = (p.gain - p.spend) * (1 - crewCut()) - voyageCost(d).total - ins;
    rows.push({ a, b, d, net, perDay: net / Math.max(1, d),
      used: Object.values(p.take).reduce((x, y) => x + y, 0) });
  }
}
rows.sort((x, y) => y.perDay - x.perDay);
const neg = rows.filter((r) => r.net <= 0).length;
console.log(`근해 전수 ${rows.length}방향 (원양 제외 · 갈레온 ${CAP}칸 · 결정론)`);
console.log(`  항차 순이익 중앙 ${won(med(rows.map((r) => r.net)))}닢 · 일수 중앙 ${med(rows.map((r) => r.d))}일`);
console.log(`  **닢/일 중앙 ${won(med(rows.map((r) => r.perDay)))}** · 상위 10% ${won(rows[Math.floor(rows.length * 0.1)].perDay)} · 채운 칸 중앙 ${med(rows.map((r) => r.used))}`);
console.log(`  적자 ${neg}방향 (${(neg / rows.length * 100).toFixed(1)}%)`);
console.log(`  상위 5: ${rows.slice(0, 5).map((r) => `${CITY_BY_ID[r.a].name}→${CITY_BY_ID[r.b].name} ${won(r.perDay)}`).join(' · ')}`);

/* ★ **사람은 가장 나은 이웃으로 간다.** 806방향 전체의 중앙값은 "아무 데나 갔을 때"라
   실제 근해 회로보다 훨씬 낮게 나온다 — 원양과 견줄 기준선은 이쪽이다.
   (probe-growth ③의 근해도 이 눈이지만 무작위 48곳 표본이고 원양이 섞인다.) */
const best = new Map();
for (const r of rows) {
  const cur = best.get(r.a);
  if (!cur || r.perDay > cur.perDay) best.set(r.a, r);
}
const bs = [...best.values()].map((r) => r.perDay).sort((x, y) => x - y);
console.log(`  ★ 도시마다 **가장 나은 이웃**으로 갈 때: 닢/일 중앙 ${won(bs[Math.floor(bs.length / 2)])} (도시 ${bs.length}곳)`);

/* --dump <파일> : 방향별 닢/일을 적어 두고 전/후를 줄 단위로 비교한다 */
const di = process.argv.indexOf('--dump');
if (di > 0 && process.argv[di + 1]) {
  const fs = await import('node:fs');
  fs.writeFileSync(process.argv[di + 1],
    rows.map((r) => `${r.a}|${r.b}\t${Math.round(r.perDay)}`).sort().join('\n'));
}
