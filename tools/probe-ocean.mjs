/* 원양 42방향 전수 — 방향마다 「얼마를 며칠에 버는가」를 보여 준다.
   probe-growth ③은 중앙값만 내놓아 **어느 항로를 손봐야 하는지**를 못 알려 준다.
   node tools/probe-ocean.mjs [적재칸] */
import {
  state, resetGame, voyageDays, voyageCost, hire, shorthanded, boardShip, insuranceFor,
} from '../js/state.js';
import * as S from '../js/state.js';
/* ★ 이 둘이 없으면 프로브가 **비용을 빼먹는다**:
     ① 적하보험 — `voyageCost(d)`를 leg 없이 부르면 보험이 0이다. 원양 보험을 올려도 안 잡힌다.
     ② 선원 사무역 — `sell()` 안에서 이익의 일부를 뗀다. planFor는 그걸 모른다.
   전/후를 같은 눈으로 재려고 **없으면 0**으로 떨어지게 둔다(옛 코드에서도 돈다). */
const crewCut = () => (S.privateTradeCut ? S.privateTradeCut() : 0);
import { planFor } from './sim-core.mjs';
import { SHIPS, CITY_BY_ID, GOOD_BY_ID } from '../js/data.js';
import { LIVE_LANES } from '../js/regions/index.js';

const CAP = +(process.argv[2] || 200);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const won = (n) => Math.round(n).toLocaleString('en-US');

resetGame();
const s = SHIPS.galleon;
state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
state.gold = 1e9; boardShip('galleon');
while (shorthanded()) if (!hire(1).ok) break;

const rows = [];
for (const l of LIVE_LANES) {
  for (const [a, b] of [[l.a, l.b], [l.b, l.a]]) {
    if (!CITY_BY_ID[a] || !CITY_BY_ID[b]) continue;
    state.gold = 1e9; state.at = a; state.fleet.galleon.at = a;
    state.cargo = {}; state.buyPrice = {};
    const p = planFor(b, CAP, 1e9, 0);
    const d = voyageDays(a, b);
    const ins = insuranceFor({ from: a, to: b, value: p.spend });
    const net = (p.gain - p.spend) * (1 - crewCut()) - voyageCost(d).total - ins;
    const top = Object.entries(p.take).sort((x, y) => y[1] - x[1]).slice(0, 3)
      .map(([g, n]) => `${GOOD_BY_ID[g]?.name ?? g}${n}`).join(' ');
    rows.push({ a, b, d, net, perDay: net / Math.max(1, d),
      used: Object.values(p.take).reduce((x, y) => x + y, 0), kinds: Object.keys(p.take).length, top });
  }
}
rows.sort((x, y) => x.perDay - y.perDay);
for (const r of rows) {
  console.log(`${(CITY_BY_ID[r.a].name + '→' + CITY_BY_ID[r.b].name).padEnd(26)} ${String(r.d).padStart(3)}일 `
    + `${won(r.net).padStart(9)}닢 ${won(r.perDay).padStart(7)}/일  칸${String(r.used).padStart(4)} ${String(r.kinds).padStart(2)}종  ${r.top}`);
}
console.log(`\n원양 ${rows.length}방향 · 닢/일 중앙 ${won(med(rows.map((r) => r.perDay)))} · 항차 순이익 중앙 ${won(med(rows.map((r) => r.net)))}닢 · 적자 ${rows.filter((r) => r.net <= 0).length}`);
