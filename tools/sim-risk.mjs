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
import { encounterOdds, routeRisk, jettisonOdds, isInland } from '../js/state.js';
import { CITY_BY_ID, SEA_EVENTS, INLAND_ODDS } from '../js/data.js';

const N = +(process.argv[2] || 90);
const SEEDS = +(process.argv[3] || 20);
const FLAT = SEA_EVENTS.find((e) => e.id === 'pirate').weight / 100;   // 종전 고정값

/* ★ 여러 시드를 돌려 평균한다. 한 판만 돌리면 **어느 항로를 탔느냐가 통째로 운**이라
   실효 조우율이 10%대와 20%대를 오간다 — 실제로 그 표본오차를 "게임이 쉬워졌다"로
   잘못 읽은 적이 있다(changelog 2026-08-15). 판단에 쓰는 수치는 반드시 평균이어야 한다. */
function withSeed(seed, fn) {
  const orig = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = orig; }
}

const legs = new Map();          // 'a|b' -> 통과 횟수
let voyages = 0;
for (let i = 0; i < SEEDS; i++) {
  withSeed((1013904223 + i * 2654435761) >>> 0, () => runSim({
    maxVoyages: N,
    hooks: {
      onVoyage: (rec) => {
        voyages++;
        const k = [rec.from, rec.to].sort().join('|');
        legs.set(k, (legs.get(k) || 0) + 1);
      },
    },
  }));
}
const rows = { length: voyages };

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
  : '  최적 플레이가 위험을 감수하고 지난다 — 돌아갈지 지를지가 선택이 된다.');

/* ── 화물을 잃는 사건 ─────────────────────────────────────────
   ① 해적을 뺀 내해 구간이 무위험으로 남아 있지 않은가 (노상강도·통행세)
   ② 보험이 무는 사건(폭풍 투하)이 사료의 빈도에 들어오는가
   목표는 15~25항차에 1건 — 보험료 중앙값 5%와 전손률 4.7%가 독립적으로 같은 값을 준다.
   → content/voyage-evidence.json: lossEventPerVoyages */
const STORM = SEA_EVENTS.find((e) => e.id === 'storm').weight / 100;
const BANDIT_SHARE = 0.45;        // 뭍의 사고 중 강도의 몫 (나머지는 통행세 — 화물은 안 잃는다)

let inlandTrips = 0, jetW = 0, banditW = 0;
for (const [k, n] of legs) {
  const [a, b] = k.split('|');
  if (isInland(a, b)) {
    inlandTrips += n;
    banditW += INLAND_ODDS * BANDIT_SHARE * n;
  } else {
    // 폭풍이 나고(가중치), 그 폭풍이 투하까지 갈 확률
    jetW += STORM * jettisonOdds({ from: a, to: b }) * n;
  }
}

const jetRate = jetW / trips;
const banditRate = banditW / trips;
const lossRate = jetRate + banditRate;
const per = (r) => (r > 0 ? `${(1 / r).toFixed(0)}항차에 1건` : '없음');

console.log('\n=== 화물을 잃는 사건 ===');
console.log(`내해·육로 통과        ${inlandTrips}/${trips}회 (${((inlandTrips / trips) * 100).toFixed(0)}%)`
  + `  — 뭍의 사고 ${(INLAND_ODDS * 100).toFixed(0)}%`);
console.log(`폭풍 투하(보험 보상)   ${(jetRate * 100).toFixed(1)}%  ${per(jetRate)}`);
console.log(`노상강도(보상 없음)    ${(banditRate * 100).toFixed(1)}%  ${per(banditRate)}`);
console.log(`합계                 ${(lossRate * 100).toFixed(1)}%  ${per(lossRate)}   목표 15~25항차에 1건`);
const p = lossRate > 0 ? 1 / lossRate : Infinity;
console.log(p >= 15 && p <= 25 ? '  사료 밴드 안이다.\n'
  : p > 25 ? '  ⚠ 너무 드물다 — 손실 꼬리가 얇다.\n'
           : '  ⚠ 너무 잦다 — 사료보다 험한 바다다.\n');
