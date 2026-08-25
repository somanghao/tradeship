// sim-firstship.mjs — **낡은 바사에서 첫 배까지, 시작 자리마다**
//
// 실플레이에서 *"여수의 다음 배가 1,150닢인데 한 쌍(여수↔강진)만 왕복하면 자본이 800닢에서 멈춘다"*는
// 잠긴 고리가 보고됐다(supremacy ISSUES #16·#11). 그런데 그 판은 **두 항구만** 오갔다.
// 이 도구가 답해야 하는 것은 셋이다:
//
//   ① 계약 없이 **무역만으로** 첫 배에 닿나 — 닿는다면 계약은 지름길이지 유일한 길이 아니다
//   ② **두 항구만 왕복하면** 정말 막히나 — 막힌다면 그것은 밸런스가 아니라 *플레이 방식*이다
//   ③ 시작 항구가 **1일 항로**를 갖고 있느냐가 얼마나 가르나
//
// ★ ①과 ②를 **같은 시드로 짝지어** 돌린다. 따로 돌려 비교하면 기준선이 튀어 부호가 뒤집힌다
//   (`sim-chain.mjs`가 같은 이유로 짝짓기를 쓴다).
//
//   node tools/sim-firstship.mjs [시드수] [항차수]

import { state, resetGame, neighborsOf, voyageDays, shipPriceAt, sellsShip, cargoCapTotal }
  from '../js/state.js';
import { runSim, setLastPort, ORDER } from './sim-core.mjs';
import { SHIPS, START_PORTS, ORIGINS, CITY_BY_ID } from '../js/data.js';

const SEEDS = +(process.argv[2] || 12);
const VOY = +(process.argv[3] || 40);
const won = (n) => Math.round(n).toLocaleString('en-US');
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/* 시작 자리 — 한반도 갈래 다섯의 부두 + 아홉 바다 시작 항구 */
const SPOTS = [...new Set([...ORIGINS.map((o) => o.at), ...START_PORTS.map((p) => p.at)])];

/** 그 항구에서 지금 살 수 있는 가장 싼 "더 나은 배"(화물칸이 더 큰 것) */
function nextShipAt(cityId) {
  resetGame(cityId);
  let best = null;
  for (const key of ORDER) {
    if (SHIPS[key].cargo <= SHIPS.hulk.cargo) continue;
    if (!sellsShip(key, cityId)) continue;
    const p = shipPriceAt(key);
    if (!best || p < best.price) best = { key, price: p, cargo: SHIPS[key].cargo };
  }
  return best;
}

/** 이 항구에서 가장 짧은 이웃 항로(일) */
function shortestLeg(cityId) {
  resetGame(cityId);
  const nb = neighborsOf(cityId);
  if (!nb.length) return null;
  return Math.min(...nb.map((to) => voyageDays(cityId, to)));
}

/** 이 항구에서 가장 가까운 이웃 하나 — 실플레이가 고른 그 상대 */
function nearest(cityId) {
  resetGame(cityId);
  const nb = neighborsOf(cityId);
  if (!nb.length) return null;
  return nb.reduce((a, b) => (voyageDays(cityId, a) <= voyageDays(cityId, b) ? a : b));
}

/** 한 판 — `pair`면 **가장 가까운 이웃 하나와만** 왕복한다(테스터가 밟은 자리).
    ★ 되돌아가기 벌점만 끄는 것으로는 재현되지 않는다 — 시뮬이 여전히 이웃 여럿을 돈다.
      그래서 `runSim`에 **갈 수 있는 항구를 좁히는 자물쇠**(`only`)를 두고 그것을 쓴다. */
function play(cityId, pair) {
  let firstV = null, firstD = null, peak = 0;
  const other = pair ? nearest(cityId) : null;
  runSim({
    maxVoyages: VOY,
    start: cityId,
    only: pair && other ? new Set([cityId, other]) : null,
    hooks: {
      onStart() { if (pair) setLastPort(null); },
      onVoyage(r) {
        peak = Math.max(peak, r.assets);
        if (!firstV && r.ship !== 'hulk') { firstV = r.v; firstD = r.day; }
        if (pair) setLastPort(null);   // 왕복 벌점까지 꺼야 두 항구에 갇힌다
      },
    },
  });
  return { firstV, firstD, peak };
}

console.log(`시드 ${SEEDS} × ${VOY}항차 · 낡은 바사 · **계약 없음**(sim-core는 계약을 모델링하지 않는다)\n`);
console.log('시작 항구        최단항로  다음 배(값)                 첫 배까지(항차/일)  40항차 총자산  왕복만 할 때');
console.log('─'.repeat(112));

for (const at of SPOTS) {
  const nx = nextShipAt(at);
  const leg = shortestLeg(at);
  const free = [], freeD = [], pk = [], pairPk = [];
  let got = 0;
  for (let i = 0; i < SEEDS; i++) {
    const a = play(at, false);
    if (a.firstV) { free.push(a.firstV); freeD.push(a.firstD); got++; }
    pk.push(a.peak);
    pairPk.push(play(at, true).peak);
  }
  const name = CITY_BY_ID[at]?.name ?? at;
  console.log(
    `${name.padEnd(14)}${String(leg ?? '-').padStart(6)}일  `
    + `${(nx ? `${SHIPS[nx.key].name} ${won(nx.price)}닢` : '없다').padEnd(24)}`
    + `${(got ? `${med(free)}항차 / ${med(freeD)}일 (${got}/${SEEDS}판)` : `못 삼 (0/${SEEDS})`).padStart(22)}`
    + `${won(med(pk)).padStart(14)}${won(med(pairPk)).padStart(14)}`,
  );
}

console.log('\n※ 「첫 배까지」가 서면 **계약 없이도 사다리의 첫 칸이 밟힌다**는 뜻이다 — 계약은 지름길이지 유일한 길이 아니다.');
console.log('  맨 오른쪽이 「가까운 둘만 왕복했을 때」의 자산 천장이다. 그 값이 다음 배값보다 낮으면');
console.log('  그것은 밸런스가 아니라 **플레이 방식**이 만든 벽이다(`MARKET.decay`로 한 쌍의 시장이 마른다).');
