// probe-homeloop.mjs — **초반 조선 근해에서 장사가 성립하는가** (회차 24·25 이월 → 회차 26)
//
// 한반도 엔딩의 `homelandProgress().docks 0/9`이 오래 0이었다. 회차 24가 **문턱은 정상**임을
// 확인했고(`probe-joseon-civic.mjs`), 막은 것은 **러너에 조선 근해 장사 페이즈가 없는 것**이었다.
// 이 도구는 그 페이즈를 러너에 넣기 전에 **시뮬로 먼저** 답한다:
//
//   ① 조선 아홉 항구에서 출발해 **근해 고리(homeloop)만** 돌 때 장사가 되는가
//      — 첫 배까지 몇 항차 · 10·30항차 금고 · 완주
//   ② 같은 시작 항구를 **세계 전체로 풀었을 때**와 나란히 (근해가 벌점인가 아닌가)
//   ③ 근해만 돌아 나라 조선소 9/9에 닿기까지 며칠 (`probe-joseon-civic.mjs homeloop`의 요약)
//
// ★ **여러 시드의 중앙값**이다(1회 실행 금지 — 프로젝트 규약).
// ⚠️ 이 도구는 「살 수 있나」를 재지 않는다 — `sim-core`의 탐욕 전략이 곧 상한이다.
//
//   node tools/probe-homeloop.mjs [판수] [항차]

import { runSim } from './sim-core.mjs';
import { state } from '../js/state.js';
import { CITY_BY_ID, START_GOLD, ORIGINS, START_PORTS, startShipAt } from '../js/data.js';

/* ★ **실제로 판이 시작하는 항구만 요약에 넣는다.** 처음엔 조선 아홉을 다 요약에 넣었더니
   내이포가 「첫 배 못 삼 · 30항차 0닢」으로 나와 게임 결함처럼 보였는데, **내이포는 시작
   항구가 아니다** — 시작배가 없어 `hulk`(선원 16명)로 서고 `manCrew()`가 200닢 중 183닢을
   사람에 쓰고 나면 살 짐이 없다. 측정기가 없는 판을 재고 있었던 것이다.
   판이 서는 자리는 `START_PORTS`(부산포)와 `ORIGINS`(마포·여수)뿐이다. */
const STARTS = new Set([
  ...START_PORTS.map((p) => p.at),
  ...ORIGINS.map((o) => o.at ?? o.city).filter(Boolean),
]);

const N = +(process.argv[2] || 8);
const V = +(process.argv[3] || 40);

/* 조선 아홉 항구 — `probe-joseon-civic.mjs`와 **같은 목록**이다(갈리면 두 도구가 딴말을 한다) */
const JOSEON = ['mapo', 'busanpo', 'uiju', 'gunsan', 'gangjin', 'yeosu', 'jeju', 'naeipo', 'yeompo'];
/* 근해 고리 — 조선 아홉 + 건너다보이는 셋(쓰시마·하카타·등주).
   ★ 이 셋을 빼면 「두 항구만 왕복」이 되어 `MARKET.decay`로 시장이 마른다
     (`wiki/sim-measurement.md` — 부산포 자산 천장 46,926 → 6,650닢). 셋 이상 엮어야 한다. */
const HOMELOOP = [...JOSEON, 'tsushima', 'hakata', 'dengzhou'];

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
const won = (n) => Math.round(n).toLocaleString('en-US');

function run(start, only) {
  const g10 = [], g30 = [], first = [], stop = [], days = [];
  for (let i = 0; i < N; i++) {
    const { rows, got } = runSim({ maxVoyages: V, start, only });
    g10.push(rows[9]?.gold ?? 0);
    g30.push(rows[Math.min(29, V - 1)]?.gold ?? 0);
    first.push(Object.values(got).map((x) => x.v).sort((a, b) => a - b)[0] ?? 999);
    stop.push(rows.length);
    days.push(state.day);
  }
  return { g10: med(g10), g30: med(g30), first: med(first),
           done: stop.filter((s) => s >= V).length, days: med(days) };
}

console.log(`── probe-homeloop ── START_GOLD=${START_GOLD} · ${N}판 × ${V}항차 (중앙값) ──`);
console.log(`근해 고리 = 조선 9항구 + 쓰시마·하카타·등주 (${HOMELOOP.length}곳)\n`);
console.log('시작 항구      ┃ 근해만: 첫배   10항차     30항차   완주 ┃ 세계전체: 첫배   10항차     30항차   완주');
console.log('─'.repeat(112));

const only = new Set(HOMELOOP);
const nearAll = [], wideAll = [], nearFirst = [], wideFirst = [];
let nearNoShip = 0;
for (const id of JOSEON) {
  const near = run(id, only);
  const wide = run(id, null);
  const real = STARTS.has(id);
  if (real) {
    nearAll.push(near.g30); wideAll.push(wide.g30);
    nearFirst.push(near.first); wideFirst.push(wide.first);
    if (near.first === 999) nearNoShip++;
  }
  const f = (x) => (x === 999 ? ' 못삼' : `${x}항차`);
  console.log(
    `${((CITY_BY_ID[id]?.name ?? id) + (real ? '' : '*')).padEnd(8)}      ┃ ${f(near.first).padStart(7)}`
    + `${won(near.g10).padStart(9)}${won(near.g30).padStart(11)}${String(near.done + '/' + N).padStart(7)}`
    + ` ┃ ${f(wide.first).padStart(11)}${won(wide.g10).padStart(9)}${won(wide.g30).padStart(11)}`
    + `${String(wide.done + '/' + N).padStart(7)}`);
}

console.log('\n* 판이 시작하지 않는 항구 — 시작배가 없어 `hulk`(선원 16)로 서고 `manCrew()`가'
          + ' 200닢 중 183닢을 사람에 써 버린다. **게임 결함이 아니라 없는 판이다** — 요약에서 뺀다.');
console.log(`  판이 서는 조선 항구: ${JOSEON.filter((x) => STARTS.has(x)).map((x) => CITY_BY_ID[x]?.name).join(' · ')}`);

console.log('\n요약 (판이 실제로 시작하는 조선 항구만)');
console.log(`  근해만  — 첫 배 중앙 ${med(nearFirst) === 999 ? '못 삼' : med(nearFirst) + '항차'}`
          + ` · 30항차 금고 중앙 ${won(med(nearAll))}닢 · 첫 배를 못 산 시작 항구 ${nearNoShip}/${nearFirst.length}`);
console.log(`  세계전체 — 첫 배 중앙 ${med(wideFirst) === 999 ? '못 삼' : med(wideFirst) + '항차'}`
          + ` · 30항차 금고 중앙 ${won(med(wideAll))}닢`);
const ratio = med(nearAll) / Math.max(1, med(wideAll));
console.log(`  근해 ÷ 세계 = ${(ratio * 100).toFixed(0)}%`
  + (ratio >= 0.5 ? '  ✅ 근해만 돌아도 장사가 성립한다 — 러너에 이 페이즈를 넣을 근거가 있다'
                  : '  ⛔ 근해가 벌점이다 — 러너가 아니라 게임을 봐야 한다'));
console.log('\n※ 나라 조선소 9/9까지는 `node tools/probe-joseon-civic.mjs 8 700 homeloop`가 답한다.');
void startShipAt;
