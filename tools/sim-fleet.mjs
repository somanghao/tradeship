// sim-fleet.mjs — **동행 선단이 시장 깊이를 뚫는가**
//
// 「320칸을 넘으면 칸당 이익이 30닢에 고정되고, 2,298칸 선단은 한 항차에 69,124닢(갈레온의 7.1배)」이라는
// 판정이 나왔었다(.playtest/supremacy-balance/BALANCE.md §5-L). **그 수는 측정이 만든 것이다.**
// 그 스크립트는 `칸당 순이익 × 화물칸`을 항차 이익으로 적었는데, `planFor()`는 **한계마진이 0이 되면
// 그 자리에서 멈춘다** — 곧 화물칸이 아무리 커도 실제로 채우는 칸수는 늘지 않는다.
// 그래서 이 도구는 **실제로 채운 칸수(used)**를 반드시 함께 낸다.
//
// 두 눈으로 본다:
//   ① 단면 — 화물칸만 바꿔 가며 `planFor`를 부른다. 칸당 이익 · **채운 칸** · **실제 항차 순이익**.
//   ② 한 판 — 동행 여덟 척을 **공짜로** 얹은 판과 안 얹은 판을 나란히 돌린다(짝지어 비교).
//
//   node tools/sim-fleet.mjs [시드수] [항차수]
//
// ※ 판정선: ②의 「배수」가 1.0 언저리면 시장 깊이가 선단을 막고 있는 것이고,
//   화물칸 배수(약 11배)에 가까우면 뚫린 것이다.

import {
  state, resetGame, neighborsOf, voyageDays, voyageCost, hire, shorthanded, boardShip,
} from '../js/state.js';
import { planFor, runSim } from './sim-core.mjs';
import { SHIPS, CITY_BY_ID } from '../js/data.js';
import { initWorld } from '../js/world.js';

const SEEDS = +(process.argv[2] || 20);
const VOYAGES = +(process.argv[3] || 40);
const ROOMS = [45, 140, 200, 320, 640, 1200, 2298];
/* 동행 여덟 — 화물칸이 큰 배로 골랐다(합 2,158칸). BALANCE.md §5-L의 2,298칸과 같은 자리다. */
const CONSORTS = ['indiaman', 'jong', 'shuinsen', 'nau', 'urca', 'navio', 'carrack', 'ghanjah'];

const won = (n) => Math.round(n).toLocaleString('en-US');
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/* ── ① 단면 ─────────────────────────────────────────────── */
const per = ROOMS.map(() => []), used = ROOMS.map(() => []), nets = ROOMS.map(() => []);
for (let i = 0; i < SEEDS; i++) {
  resetGame();
  const s = SHIPS.galleon;
  state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
  state.gold = 1e9; boardShip('galleon');
  while (shorthanded()) if (!hire(1).ok) break;
  initWorld();
  // 무작위 항구로 옮겨 앉는다 — 한 항구의 이웃만 보면 표본이 한쪽으로 쏠린다
  const ids = Object.keys(CITY_BY_ID);
  state.at = ids[Math.floor(Math.random() * ids.length)];
  state.fleet.galleon.at = state.at;
  const nb = neighborsOf(state.at);
  if (!nb.length) { i--; continue; }
  for (let k = 0; k < ROOMS.length; k++) {
    let best = null;
    for (const to of nb) {
      const p = planFor(to, ROOMS[k], 1e9, 0);
      const net = p.gain - p.spend - voyageCost(voyageDays(state.at, to)).total;
      const u = Object.values(p.take).reduce((a, b) => a + b, 0);
      if (!best || net > best.net) best = { net, used: u };
    }
    per[k].push(best.used ? best.net / best.used : 0);
    used[k].push(best.used);
    nets[k].push(best.net);
  }
}

console.log(`① 단면 — 시드 ${SEEDS} · 갈레온·자금 무제한 · 무작위 항구에서 이웃 중 최선 (중앙값)\n`);
console.log('  화물칸   칸당 순이익   **채운 칸**   **실제 항차 순이익**   (틀린 셈) 칸당×화물칸');
for (let k = 0; k < ROOMS.length; k++) {
  console.log(`  ${String(ROOMS[k]).padStart(6)}  ${won(med(per[k])).padStart(11)}  ${won(med(used[k])).padStart(11)}`
    + `  ${won(med(nets[k])).padStart(20)}  ${won(med(per[k]) * ROOMS[k]).padStart(20)}`);
}
console.log('\n  ※ 「채운 칸」이 화물칸과 함께 안 늘면 시장 깊이가 물량을 막고 있는 것이다.');
console.log('    맨 오른쪽 열이 BALANCE.md §5-L이 항차 이익으로 적은 값이고, 그 왼쪽이 실제다.');

/* ── ② 한 판 ────────────────────────────────────────────── */
const netOf = (r) => r.gain - r.spend
  - (r.wages + r.supplies + r.fleetCost + r.hullCost + r.armsCost + r.insCost + r.officerCost);

function arm(withFleet, seeds) {
  const nets2 = [], fills = [], assets = [];
  for (let i = 0; i < seeds; i++) {
    const rows = [];
    runSim({
      maxVoyages: VOYAGES,
      hooks: {
        onStart() {
          const s = SHIPS.galleon;
          state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
          state.gold = 400000;
          boardShip('galleon');
          while (shorthanded()) if (!hire(1).ok) break;
          if (!withFleet) return;
          for (const key of CONSORTS) {
            const sh = SHIPS[key];
            if (!sh) continue;
            state.fleet[key] ||= { at: state.at, hp: sh.hp, arms: { light: sh.guns, medium: 0, long: 0 }, refits: {} };
            state.consorts[key] = { crew: sh.crewMin, captain: null };
          }
        },
        onVoyage(r) { rows.push(r); },
      },
    });
    if (!rows.length) continue;
    nets2.push(med(rows.map(netOf)));
    assets.push(rows[rows.length - 1].assets);
    fills.push(med(rows.map((r) => Object.values(r.bought).reduce((a, b) => a + b, 0))));
  }
  return { net: med(nets2), assets: med(assets), fill: med(fills) };
}

const seeds2 = Math.max(4, Math.round(SEEDS / 2));
const a = arm(false, seeds2), b = arm(true, seeds2);
console.log(`\n② 한 판 — ${seeds2}판 × ${VOYAGES}항차 · 갈레온 기함 · 자금 40만닢 · 동행은 **공짜로** 얹었다 (중앙값)\n`);
console.log('                       항차 순이익   실은 칸수   마지막 항차 총자산');
console.log(`  동행 없음 (200칸)   ${won(a.net).padStart(12)}  ${won(a.fill).padStart(10)}  ${won(a.assets).padStart(18)}`);
console.log(`  동행 여덟 (2,358칸) ${won(b.net).padStart(12)}  ${won(b.fill).padStart(10)}  ${won(b.assets).padStart(18)}`);
console.log(`  배수                ${(b.net / (a.net || 1)).toFixed(2).padStart(12)}배${(b.fill / (a.fill || 1)).toFixed(2).padStart(9)}배${(b.assets / (a.assets || 1)).toFixed(2).padStart(17)}배`);
console.log('\n  ※ 화물칸은 11.8배인데 배수가 1 언저리(또는 그 아래)면 **막고 있는 것이다** —');
console.log('    동행선은 유지비만 무는 순손실이 된다. 그것은 이 도구가 아니라 선단 설계 쪽 숙제다.');
