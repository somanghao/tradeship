// 무역 곡선 시뮬레이터 — "다음 배까지 몇 항차인가"
// 몸통은 `sim-core.mjs`에 있다(대시보드와 같은 코드를 돌리기 위해). 여기는 출력만 한다.
//
//   node tools/sim-trade.mjs
import { SHIPS } from '../js/data.js';
import { runSim, ORDER } from './sim-core.mjs';

function report(label, maxVoyages = 90) {
  const { got, rows } = runSim({ maxVoyages });

  console.log(`\n=== ${label} ===`);
  console.log('배 구입 시점:');
  for (const key of ORDER) {
    const g = got[key];
    console.log(`  ${SHIPS[key].name.padEnd(8)} ${String(SHIPS[key].price).padStart(6)}닢  `
      + (g ? `${String(g.v).padStart(3)}항차 (${g.day}일차)` : '  —'));
  }
  const marks = [1, 3, 5, 10, 15, 20, 30, 45, 60, 90].filter((i) => rows[i - 1]);
  console.log('자산 추이: ' + marks.map((i) => {
    const r = rows[i - 1];
    return `${i}항차 ${r.gold.toLocaleString('en-US')}닢(${SHIPS[r.ship].name})`;
  }).join(' · '));
  return { got, rows };
}

report('현재 설정');
