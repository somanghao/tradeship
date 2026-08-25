/* 보험이 **낸 것의 몇 %를 돌려주나** — 「보상하는 사건이 없으면 보험이 아니라 세금」의 검산.
   ★ 게임의 판정 함수를 그대로 불러 계산한다(감으로 세지 않는다).
   ★ **배 크기와 선단 척수로 갈라 잰다** — 큰 배로만 재면 안 보이는 자리가 있다(PM 지적).
   node tools/probe-fair.mjs */
import {
  state, resetGame, insuranceFor, insureCover, expectedLossRate, jettisonOdds,
  routeRisk, boardShip, hire, shorthanded,
} from '../js/state.js';
import { SHIPS, STORM_WEIGHT, JETTISON_SHARE, TOTAL_LOSS } from '../js/data.js';
import { LIVE_LANES, isOceanLane } from '../js/regions/index.js';
import { CITY_BY_ID, ROUTES } from '../js/data.js';

resetGame();
const V = 1e6;                                   // 짐값 100만닢 기준(비율만 본다)
const pct = (x) => (x * 100).toFixed(2).padStart(6) + '%';

function row(label, from, to) {
  const prem = insuranceFor({ from, to, value: V }) / V;
  const loss = expectedLossRate(from, to);
  const cover = insureCover(from, to);
  const back = loss > 0 ? (cover * loss) / Math.max(1e-12, prem) : 0;
  const jet = STORM_WEIGHT * jettisonOdds({ from, to }) * JETTISON_SHARE;
  console.log(`${label.padEnd(26)} 요율 ${String(routeRisk(from, to) ?? 0).padStart(4)}`
    + ` · 보험료 ${pct(prem)} · 기대손실 ${pct(loss)}(투하 ${pct(jet)}${isOceanLane(from, to) ? ` + 전손 ${pct(loss - jet)}` : ''})`
    + ` · 보상률 ${(cover * 100).toFixed(0).padStart(3)}%`
    + ` → **돌려받는 비율 ${(back * 100).toFixed(0).padStart(3)}%** · 순손실 ${pct(prem - cover * loss)}`);
}

console.log('■ 구간별 (동행 0척)\n');
const near = ROUTES.filter(([a, b]) => !isOceanLane(a, b) && CITY_BY_ID[a] && CITY_BY_ID[b])
  .sort((x, y) => (routeRisk(x[0], x[1]) ?? 0) - (routeRisk(y[0], y[1]) ?? 0));
for (const q of [0, 0.25, 0.5, 0.75, 1]) {
  const [a, b] = near[Math.min(near.length - 1, Math.round(q * (near.length - 1)))];
  row(`근해 ${CITY_BY_ID[a].name}→${CITY_BY_ID[b].name}`, a, b);
}
const oc = [...LIVE_LANES].sort((x, y) => (x.risk ?? 0) - (y.risk ?? 0));
for (const q of [0, 0.5, 1]) {
  const l = oc[Math.min(oc.length - 1, Math.round(q * (oc.length - 1)))];
  row(`원양 ${CITY_BY_ID[l.a].name}→${CITY_BY_ID[l.b].name}`, l.a, l.b);
}

console.log('\n■ 배 크기별 — 큰 배로만 재면 안 보인다 (같은 구간·짐값 비율 기준)\n');
const lane = oc[Math.floor(oc.length / 2)];
for (const k of ['hulk', 'cocca', 'fluyt', 'galleon', 'indiaman']) {
  const s = SHIPS[k]; if (!s) continue;
  resetGame();
  if (k !== 'hulk') {
    state.fleet[k] = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
    state.gold = 1e9; boardShip(k);
  }
  while (shorthanded()) if (!hire(1).ok) break;
  row(`${s.name}(선원 ${state.crew})`, lane.a, lane.b);
}

console.log('\n■ 선단 척수별 — 할인이 보상률과 맞물리나\n');
resetGame();
for (const n of [0, 2, 5]) {
  state.consorts = {};
  for (let i = 0; i < n; i++) state.consorts['x' + i] = { crew: 10, captain: null };
  row(`동행 ${n}척`, lane.a, lane.b);
}
console.log(`\n※ 전손 기준값: ${(TOTAL_LOSS.rate * 100).toFixed(1)}% @ 요율 ${TOTAL_LOSS.refRisk}`);
console.log('※ 목표 — 「돌려받는 비율」이 전 구간에서 90% 언저리로 평평하고, 어디서도 옛 값(26~70%)보다 나쁘지 않을 것.');
