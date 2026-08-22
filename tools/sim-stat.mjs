// 무역 곡선을 **여러 판 돌려** 분포로 본다 — 1회 실행은 표본오차가 커서 결론이 뒤집힌다.
//
//   node tools/playtest/sim-stat.mjs [판수]     (기본 20)
//
// 실제로 이 도구가 없어서 "31f13aa에서는 90항차 완주"라는 1회 실행 결과를 회귀의 증거로
// 삼을 뻔했다 — 같은 커밋을 다시 돌리니 11항차에서 멈췄다. → wiki/playtest-log.md §4-2
import { runSim } from './sim-core.mjs';
import { START_GOLD } from '../js/data.js';

const N = +(process.argv[2] || 20);
const stops = [], g10 = [], g30 = [], firstShip = [], arrears = [], ships = [];
for (let i = 0; i < N; i++) {
  const { rows, got } = runSim({ maxVoyages: 60 });
  stops.push(rows.length);
  g10.push(rows[9]?.gold ?? 0);
  g30.push(rows[29]?.gold ?? 0);
  ships.push(Object.keys(got).length);
  firstShip.push(Object.values(got).map(g => g.v).sort((a, b) => a - b)[0] ?? 999);
  arrears.push(rows.some(r => r.payroll && r.payroll.missed > 0) ? 1 : 0);
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = a => Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100);

console.log(`START_GOLD=${START_GOLD} · ${N}판 · 60항차까지`);
console.log(`  완주        ${stops.filter(s => s >= 60).length}/${N}판`);
console.log(`  정지 항차   중앙값 ${med(stops)}`);
console.log(`  체불 겪음   ${pct(arrears)}%`);
console.log(`  첫 배       ${med(firstShip) === 999 ? '못 삼' : med(firstShip) + '항차'}  (산 배 ${med(ships)}척 · 한 척도 못 산 판 ${ships.filter(s => s === 0).length})`);
console.log(`  금고 중앙값 10항차 ${med(g10).toLocaleString('en-US')}닢 · 30항차 ${med(g30).toLocaleString('en-US')}닢`);
