// sim-risk.mjs — 항로 위험도가 실제 플레이에 얼마나 걸리는가
//
// `sim-core.mjs`는 해상 이벤트를 모델링하지 않는다(순수 무역만 잰다).
// 그래서 위험도를 바꿔도 자산 곡선은 움직이지 않는다 — 그것으로 "영향 없다"고 읽으면 안 된다.
//
// 대신 여기서 재는 것은 **실효 조우율**이다:
//   최적에 가까운 플레이가 실제로 다니는 항로들에, 그 항로의 조우 확률을 교통량으로 가중한 값.
// 위험한 바다가 마침 돈이 되는 바다라면 실효 난이도는 올라가고, 반대면 내려간다.
// 고정 18%였던 종전과 비교해 난이도 총량이 어디로 움직였는지 이걸로 본다.
//
//   node tools/sim-risk.mjs [항차수]

import { runSim } from './sim-core.mjs';
import { encounterOdds, routeRisk } from '../js/state.js';
import { CITY_BY_ID, SEA_EVENTS } from '../js/data.js';

const N = +(process.argv[2] || 90);
const FLAT = SEA_EVENTS.find((e) => e.id === 'pirate').weight / 100;   // 종전 고정값

const legs = new Map();          // 'a|b' -> 통과 횟수
const { rows } = runSim({
  maxVoyages: N,
  hooks: {
    onVoyage: (rec) => {
      const k = [rec.from, rec.to].sort().join('|');
      legs.set(k, (legs.get(k) || 0) + 1);
    },
  },
});

const nameOf = (id) => CITY_BY_ID[id]?.name ?? id;

let trips = 0, weighted = 0;
const table = [];
for (const [k, n] of legs) {
  const [a, b] = k.split('|');
  const p = encounterOdds({ from: a, to: b });
  trips += n;
  weighted += p * n;
  table.push({ where: `${nameOf(a)}~${nameOf(b)}`, risk: routeRisk(a, b), p, n });
}
table.sort((x, y) => y.n - x.n);

const effective = weighted / trips;

console.log(`\n=== 실효 조우율 (${rows.length}항차) ===\n`);
console.log('항로                     통과   요율    조우확률');
for (const t of table) {
  console.log(`  ${t.where.padEnd(22)} ${String(t.n).padStart(4)}  ${String(t.risk ?? '내해').padStart(5)}  ${(t.p * 100).toFixed(1).padStart(7)}%`);
}

console.log(`\n종전(전 항로 고정)   ${(FLAT * 100).toFixed(1)}%`);
console.log(`실효(교통량 가중)     ${(effective * 100).toFixed(1)}%`);
const diff = (effective - FLAT) * 100;
console.log(`차이                 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%p`
  + `  — ${Math.abs(diff) < 1.5 ? '난이도 총량은 사실상 그대로다'
      : diff > 0 ? '돈이 되는 항로가 위험한 항로와 겹친다(더 어려워졌다)'
      : '최적 항로가 안전한 바다에 몰려 있다(더 쉬워졌다)'}`);

// 위험한 바다를 피해 가면 얼마나 손해인가 — "돌아갈 이유"가 생겼는지 본다
const risky = table.filter((t) => t.p >= 0.22).reduce((s, t) => s + t.n, 0);
console.log(`\n위험(22%+) 구간 통과: ${risky}/${trips}회 (${((risky / trips) * 100).toFixed(0)}%)`);
console.log(risky === 0
  ? '  최적 플레이가 위험한 바다를 아예 안 지난다 — 위험도가 의사결정에 안 걸린다.'
  : '  최적 플레이가 위험을 감수하고 지난다 — 돌아갈지 지를지가 선택이 된다.\n');
