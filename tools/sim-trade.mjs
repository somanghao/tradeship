// 무역 곡선 시뮬레이터 — "다음 배까지 몇 항차인가"
// 최적에 가까운 플레이를 가정한다(매 항차 이웃 항구 중 최대 순이익 조합 선택).
// 전투 전리품은 넣지 않는다 — 순수 무역만으로도 너무 빨리 부자가 되는지 보는 것이 목적.
import { GOODS, SHIPS, CITY_BY_ID } from '../js/data.js';
import {
  state, resetGame, advanceDays, neighborsOf, voyageDays, voyageCost,
  buy, sell, costFor, gainFor, tariffRate, purchaseShip, boardShip, sellsShip,
  cargoFree, cargoUsed, repair, hire, shorthanded, refreshPrices,
} from '../js/state.js';
import { initWorld, worldTick } from '../js/world.js';

const ORDER = ['caravel', 'fluyt', 'brig', 'carrack', 'frigate', 'galleon', 'indiaman', 'superfrigate'];

/** 목적지 하나에 대해 화물칸을 채우는 최적 조합(그리디).
    실제 플레이어처럼 여러 품목을 섞는다 — 압력이 품목별로 걸리므로 분산이 이득이다. */
function planFor(to, room, budget) {
  const take = {};
  let spend = 0, gain = 0;
  for (let k = 0; k < room; k++) {
    let best = null;
    for (const g of GOODS) {
      const n = (take[g.id] || 0) + 1;
      const dCost = costFor(g.id, n) - costFor(g.id, n - 1);
      const dGain = gainFor(g.id, n, to) - gainFor(g.id, n - 1, to);
      const margin = dGain * (1 - tariffRate(to)) - dCost;
      if (dCost > budget - spend) continue;
      if (margin <= 0) continue;
      if (!best || margin > best.margin) best = { id: g.id, margin, dCost, dGain };
    }
    if (!best) break;
    take[best.id] = (take[best.id] || 0) + 1;
    spend += best.dCost;
    gain += best.dGain * (1 - tariffRate(to));
  }
  return { take, spend, gain };
}

/** 이웃 항구 중 순이익 최대인 곳으로 간다 */
function bestRun() {
  let best = null;
  const room = cargoFree();
  if (room <= 0) return null;
  for (const to of neighborsOf(state.at)) {
    const days = voyageDays(state.at, to);
    const cost = voyageCost(days).total;
    const p = planFor(to, room, state.gold);
    const net = p.gain - p.spend - cost;
    if (!best || net > best.net) best = { to, take: p.take, net, days, spend: p.spend };
  }
  return best;
}

function runSim(label, maxVoyages = 90) {
  resetGame();
  initWorld();
  const got = {};
  const rows = [];
  for (let v = 1; v <= maxVoyages; v++) {
    // 지금 항구에서 살 수 있는 배가 있으면 산다(가장 비싼 것부터 — 곧 갈아탈 배)
    for (const key of [...ORDER].reverse()) {
      if (state.fleet[key] || !sellsShip(key)) continue;
      if (SHIPS[key].price > state.gold * 0.92) continue;   // 운영자금은 남긴다
      if (purchaseShip(key).ok) {
        boardShip(key);
        got[key] = { v, day: state.day, gold: state.gold };
        // 새 배를 몰려면 사람이 필요하다
        while (shorthanded() && hire(1).ok);
      }
    }
    if (state.hp < state.maxHp * 0.6) repair(state.maxHp - state.hp);

    const run = bestRun();
    if (!run || !Object.keys(run.take).length) break;
    for (const [gid, n] of Object.entries(run.take)) buy(gid, n);
    const from = state.at;
    const dd = voyageDays(state.at, run.to);
    advanceDays(dd);
    worldTick(dd);        // NPC도 같은 시장에서 사고판다 — 플레이어에게 불리하게 작용한다
    state.at = run.to;
    if (state.fleet[state.shipKey]) state.fleet[state.shipKey].at = run.to;
    for (const gid of Object.keys({ ...state.cargo })) sell(gid, state.cargo[gid] || 0);
    rows.push({ v, day: state.day, gold: Math.round(state.gold), ship: state.shipKey, from, to: run.to });
  }

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

runSim('현재 설정');
