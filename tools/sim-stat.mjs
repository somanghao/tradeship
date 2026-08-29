// 무역 곡선을 **여러 판 돌려** 분포로 본다 — 1회 실행은 표본오차가 커서 결론이 뒤집힌다.
//
//   node tools/sim-stat.mjs [판수] [항차]      (기본 20판 · 60항차)
//
// 실제로 이 도구가 없어서 "31f13aa에서는 90항차 완주"라는 1회 실행 결과를 회귀의 증거로
// 삼을 뻔했다 — 같은 커밋을 다시 돌리니 11항차에서 멈췄다. → wiki/playtest-log.md §4-2
//
// ★ **기본값 60항차를 바꾸지 마라.** 이 저장소의 기준선이 전부 그 값으로 적혀 있다
//   (`sim-stat 20`의 10항차 중앙값 · 30항차 중앙값). 더 길게 보려면 **인자로** 준다:
//     node tools/sim-stat.mjs 20 150
//   그러면 60·90·150항차 칸이 함께 나온다 — 앞 두 줄은 언제나 같은 자리를 가리킨다.
// ⚠️ 항차를 늘려도 **시뮬 전략이 후반 층(거점·유통·세력)을 안 쓴다** — `sim-core.mjs`는
//   사고팔고 배를 갈아탈 뿐이라, 긴 곡선은 *"무역만으로 어디까지"*의 답이지 후반의 답이 아니다.
import { runSim } from './sim-core.mjs';
import { START_GOLD } from '../js/data.js';

const N = +(process.argv[2] || 20);
const MAX = +(process.argv[3] || 60);

/** 어느 항차에서 금고를 재나 — 기준선 둘(10·30)은 언제나 넣고, 나머지는 지평에 맞춰 붙인다 */
const MARKS = [10, 30, 60, 90, 150, 240].filter((m) => m <= MAX);
if (!MARKS.includes(10)) MARKS.unshift(10);

const stops = [], firstShip = [], arrears = [], ships = [];
const gold = new Map(MARKS.map((m) => [m, []]));
for (let i = 0; i < N; i++) {
  const { rows, got } = runSim({ maxVoyages: MAX });
  stops.push(rows.length);
  for (const m of MARKS) gold.get(m).push(rows[m - 1]?.gold ?? 0);
  ships.push(Object.keys(got).length);
  firstShip.push(Object.values(got).map((g) => g.v).sort((a, b) => a - b)[0] ?? 999);
  arrears.push(rows.some((r) => r.payroll && r.payroll.missed > 0) ? 1 : 0);
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100);
const won = (n) => n.toLocaleString('en-US');

console.log(`START_GOLD=${START_GOLD} · ${N}판 · ${MAX}항차까지`);
console.log(`  완주        ${stops.filter((s) => s >= MAX).length}/${N}판`);
console.log(`  정지 항차   중앙값 ${med(stops)}`);
console.log(`  체불 겪음   ${pct(arrears)}%`);
console.log(`  첫 배       ${med(firstShip) === 999 ? '못 삼' : med(firstShip) + '항차'}  (산 배 ${med(ships)}척 · 한 척도 못 산 판 ${ships.filter((s) => s === 0).length})`);
console.log(`  금고 중앙값 ${MARKS.map((m) => `${m}항차 ${won(med(gold.get(m)))}닢`).join(' · ')}`);

/* ★ **중앙값만 적으면 후반을 오독한다**(회차 23 실측). 같은 코드·같은 지평에서 시드만 바꿔
   60항차 금고가 **51,601 / 204,346 / 340,912닢**으로 나왔다 — 6.6배 퍼짐이다.
   초반(10항차)은 시작 조건이 조여 있어 ±10%로 안정한데, 배를 갈아타기 시작하면
   **한 번의 갈아탐이 곡선을 통째로 옮긴다.** 그래서 뒤 칸은 퍼짐을 함께 적는다 —
   **후반 수치를 중앙값 하나로 비교(전/후)하면 밸런스 변화가 아닌 것을 변화로 읽는다.**
   ⓘ 지평이 길어져도 앞 칸의 값은 안 바뀐다(같은 시드로 대조 확인 — 60·150에서 rows[59] 동일). */
const spread = (a) => { const s = [...a].sort((x, y) => x - y); return [s[0], s.at(-1)]; };
if (MARKS.some((m) => m >= 30)) {
  console.log(`  금고 퍼짐   ${MARKS.filter((m) => m >= 30).map((m) => {
    const [lo, hi] = spread(gold.get(m));
    return `${m}항차 ${won(lo)}~${won(hi)}닢(${(hi / Math.max(1, lo)).toFixed(1)}배)`;
  }).join(' · ')}`);
}

/* ★ 긴 지평으로 돌렸을 때만 — **후반이 실제로 열리나**를 한 줄로.
   패권 거점 총투자 912,630닢이 이 게임 후반 목표의 크기다(`ENCOUNTER_LOSS` 주석의 그 값).
   무역만으로 거기 닿는 판이 몇인지가 *"후반이 구조적으로 열려 있나"*의 가장 싼 답이다. */
const HEGEMONY_INVEST = 912_630;
if (MAX > 60) {
  const last = gold.get(MARKS.at(-1));
  const reach = last.filter((g) => g >= HEGEMONY_INVEST).length;
  console.log(`  후반 도달   ${MARKS.at(-1)}항차에 패권 총투자(${won(HEGEMONY_INVEST)}닢) 이상 ${reach}/${N}판`
    + ` · 최대 ${won(Math.max(...last))}닢`);
  console.log('  ⚠️ 시뮬 전략은 거점·유통·세력을 안 쓴다 — 이 곡선은 「무역만으로 어디까지」다');
}
