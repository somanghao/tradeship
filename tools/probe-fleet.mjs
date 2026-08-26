/* 화물칸이 커지면 항차 이익이 어떻게 되나 — 선단(동행 8척·2,298칸)이 곡선을 뚫는가.
   `planFor`를 화물칸만 바꿔 가며 부른다(배를 실제로 사지 않는다 · 게임 코드는 읽기만).

   ★★ 2026-08-25 정정 — 이 파일의 첫 판은 **거짓 결론을 냈다.**
      「칸당 순이익 × **전체 화물칸**」을 항차 이익으로 적었는데, `planFor()`는
      **한계마진이 0이 되면 그 자리에서 멈춘다**. 화물칸을 늘려도 *채우는 칸*이 안 늘기 때문에
      곱해야 할 것은 room이 아니라 **used**였다. 그 한 줄 때문에 "선단이 시장 깊이를 뚫는다"는
      결론이 나왔고, 실제로는 뚫리지 않는다. → BALANCE.md §5-L
   node .playtest/supremacy-balance/probe-fleet.mjs [시드수] */
import { state, resetGame, neighborsOf, voyageDays, voyageCost, hire, shorthanded, boardShip, impactFactor }
  from '../js/state.js';
import { planFor } from './sim-core.mjs';
import { SHIPS, CITY_BY_ID, MARKET } from '../js/data.js';
import { initWorld } from '../js/world.js';

const SEEDS = +(process.argv[2] || 30);
const ROOMS = [45, 140, 200, 320, 640, 1200, 2298];
const won = n => Math.round(n).toLocaleString('en-US');
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const net = ROOMS.map(() => []), used = ROOMS.map(() => []), kinds = ROOMS.map(() => []), fmax = ROOMS.map(() => []);
for (let i = 0; i < SEEDS; i++) {
  resetGame();
  const s = SHIPS.galleon;
  state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
  state.gold = 1e9; boardShip('galleon');
  while (shorthanded()) if (!hire(1).ok) break;
  initWorld();
  const ids = Object.keys(CITY_BY_ID);
  state.at = ids[Math.floor(Math.random() * ids.length)];
  state.fleet.galleon.at = state.at;
  const nb = neighborsOf(state.at);
  if (!nb.length) { i--; continue; }
  for (let k = 0; k < ROOMS.length; k++) {
    let best = null;
    for (const to of nb) {
      const days = voyageDays(state.at, to);
      const p = planFor(to, ROOMS[k], 1e9, 0);
      const n = p.gain - p.spend - voyageCost(days).total;
      const u = Object.values(p.take).reduce((a, b) => a + b, 0);
      /* 멈춘 자리에서 실제로 문 벌점 — `MARKET.cap`(0.50)에 닿기는 하나 */
      let f = 0;
      for (const [gid, q] of Object.entries(p.take)) f = Math.max(f, impactFactor(to, gid, q));
      if (!best || n > best.n) best = { n, u, f, kinds: Object.keys(p.take).length };
    }
    net[k].push(best.n); used[k].push(best.u); kinds[k].push(best.kinds); fmax[k].push(best.f);
  }
}

console.log(`시드 ${SEEDS} · 갈레온·자금 무제한 · 무작위 항구에서 이웃 중 최선 (중앙값)`);
console.log(`MARKET.cap = ${MARKET.cap} · impact = ${MARKET.impact} · depthPerSize = ${MARKET.depthPerSize}\n`);
console.log('화물칸    실제 항차 순이익   **채운 칸**   칸당    품목수   멈춘 자리의 벌점 f');
for (let k = 0; k < ROOMS.length; k++) {
  const n = med(net[k]), u = med(used[k]);
  console.log(`${String(ROOMS[k]).padStart(6)}  ${won(n).padStart(16)}  ${String(u).padStart(11)}  ${(n / Math.max(1, u)).toFixed(1).padStart(6)}  ${String(med(kinds[k])).padStart(6)}   ${med(fmax[k]).toFixed(3)}`);
}
console.log('\n※ 「채운 칸」이 화물칸을 안 따라가면 병목은 시장 깊이가 아니라 **차익 자체**다.');
console.log('  멈춘 자리의 벌점 f가 cap(0.50)보다 한참 낮으면 상한에 애초에 안 닿는다는 뜻이다.');
