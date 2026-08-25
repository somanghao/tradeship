/* 실효 보험 요율 — **선단 0척과 5척을 둘 다** 잰다.
   원양 요율(`INSURANCE_RATE_OCEAN`)을 올려도 선단 할인(`FLEET.insureOffCap` −40%)이 곱해지므로,
   한쪽만 보면 "사료 중앙값에 닿았다"가 거짓이 된다.
   node tools/probe-insure.mjs */
import { state, resetGame, insuranceFor, convoyInsureOff } from '../js/state.js';
import { isOceanLane } from '../js/regions/index.js';
import { LIVE_LANES } from '../js/regions/index.js';
import { CITY_BY_ID, ROUTES } from '../js/data.js';

resetGame();
const V = 100000;                       // 화물가치 10만닢 기준
const show = (label, pairs) => {
  const rows = pairs.map(([a, b]) => insuranceFor({ from: a, to: b, value: V }) / V * 100)
    .filter((x) => x > 0).sort((x, y) => x - y);
  if (!rows.length) return;
  console.log(`  ${label.padEnd(6)} 중앙 ${rows[Math.floor(rows.length / 2)].toFixed(2)}%`
    + ` · 최소 ${rows[0].toFixed(2)}% · 최대 ${rows[rows.length - 1].toFixed(2)}% (${rows.length}구간)`);
};
const ocean = LIVE_LANES.map((l) => [l.a, l.b]);
const near = ROUTES.filter(([a, b]) => !isOceanLane(a, b) && CITY_BY_ID[a] && CITY_BY_ID[b]);

for (const n of [0, 1, 2, 3, 5]) {
  state.consorts = {};
  for (let i = 0; i < n; i++) state.consorts['x' + i] = { crew: 10, captain: null };
  console.log(`\n■ 동행 ${n}척 (할인 ${(convoyInsureOff() * 100).toFixed(0)}%)`);
  show('원양', ocean);
  show('근해', near);
}
console.log('\n사료 대조: content/upkeep-evidence.json insurancePremium — 중앙값 5% · p10 0.75% · p90 22%');
