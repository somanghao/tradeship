// sim-gate.mjs — **집 바다를 언제 벗어나나**를 여러 판 돌려 분포로 본다
//
//   node tools/sim-gate.mjs [판수] [항차상한]      (기본 20판 · 120항차)
//
// ★ 왜 이 도구가 필요했나.
//   실클릭 검증이 **여섯 회차 연속 663일 동안 아홉 바다 중 한 곳도 못 벗어났다.**
//   사용자 목표가 「모든 지역 패권」인데 둘째 바다에 발을 못 들인 것이다.
//   그런데 기존 계측기 어느 것도 그것을 재지 않았다 — `sim-stat`은 금고와 항차만 보고,
//   `check-routes`는 요율만 본다. **아무도 "며칟날 바다를 바꾸나"를 묻지 않았다.**
//   설계 문서(DESIGN-growth P7-7)가 정한 합격선이 **첫 원양 80~150일**이므로,
//   그 값을 내는 자를 여기 둔다.
//
// ⚠️ 이 시뮬이 못 재는 것 — **「문이 어디 있는지 아는가」**.
//   `sim-core.bestRun`은 매 항차 이웃을 전수로 훑으므로 **문을 언제나 안다.**
//   사람은 안 그렇고, 그 차이가 663일이었다(→ `scenes/map.js: oceanGateRows`가 그 자리다).
//   그러므로 이 도구가 재는 것은 **「문이 몇 개이고 얼마나 가까운가」**뿐이다.
//   화면이 그것을 말하는가는 실클릭(`tools/playtest.mjs`)이 재야 한다.
//
// ⚠️ 그리고 `bestRun`은 `oceanReady`를 안 본다 — 규칙상 못 건널 항로도 건넌다.
//   그래서 건넌 항차마다 **호위 의무를 따로 검사해** 「규칙을 어긴 이탈」을 따로 센다.
//   그 수가 크면 이 표의 일차는 낙관이다.

import { runSim } from './sim-core.mjs';
import { REGION_OF_CITY, REGION_BY_ID, CITY_BY_ID } from '../js/data.js';
import { escortNeed } from '../js/state.js';

const N = +(process.argv[2] || 20);
const MAXV = +(process.argv[3] || 120);

const days = [], voyages = [];
const byGate = {};
let illegal = 0, left = 0;

for (let i = 0; i < N; i++) {
  const { rows } = runSim({ maxVoyages: MAXV });
  const home = REGION_OF_CITY[rows[0]?.from] ?? null;
  const cross = rows.find((r) => REGION_OF_CITY[r.from] !== REGION_OF_CITY[r.to]);
  if (!cross) continue;
  left++;
  days.push(cross.day);
  voyages.push(cross.v);
  const key = `${CITY_BY_ID[cross.from].name}→${CITY_BY_ID[cross.to].name}`;
  byGate[key] = (byGate[key] || 0) + 1;
  // 그 항차가 규칙상 건널 수 있는 것이었나 — 동행 의무는 시뮬이 안 본다
  if (escortNeed(cross.from, cross.to) > 0) illegal++;
  void home;
}

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };

console.log(`${N}판 · ${MAXV}항차까지 · 시작 ${REGION_BY_ID[REGION_OF_CITY['busanpo']]?.name}(부산포)`);
console.log(`  집 바다를 벗어난 판   ${left}/${N}`);
if (left) {
  console.log(`  첫 원양 일차          중앙값 ${med(days)}일 (하위 25% ${pctl(days, 0.25)}일 · 상위 25% ${pctl(days, 0.75)}일)`);
  console.log(`  첫 원양 항차          중앙값 ${med(voyages)}항차`);
  console.log(`  ⚠️ 호위 의무를 어긴 이탈  ${illegal}/${left}판 — 이만큼은 위 일차가 낙관이다`);
  console.log('  나간 문');
  for (const [k, v] of Object.entries(byGate).sort((a, b) => b[1] - a[1])) console.log(`    ${k.padEnd(24)} ${v}판`);
}
console.log(`  ── 합격선(DESIGN-growth P7-7): 첫 원양 80~150일`);
