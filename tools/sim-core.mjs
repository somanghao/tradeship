// sim-core.mjs — 무역 시뮬레이션의 몸통 (출력이 없는 순수 로직)
//
// CLI(`sim-trade.mjs`)와 대시보드(`dashboard/dash.js`)가 **같은 코드**를 돌린다.
// 여기서 갈라지면 "터미널에서는 맞는데 대시보드에서는 다른" 상태가 생긴다.
//
// 최적에 가까운 플레이를 가정한다(매 항차 이웃 항구 중 최대 순이익 조합 선택).
// 전투 전리품은 넣지 않는다 — 순수 무역만으로도 너무 빨리 부자가 되는지 보는 것이 목적.

import { GOODS, SHIPS } from '../js/data.js';
import {
  state, resetGame, advanceDays, neighborsOf, voyageDays, voyageCost,
  buy, sell, costFor, gainFor, tariffRate, purchaseShip, boardShip, sellsShip,
  cargoFree, repair, hire, shorthanded, shipPriceAt,
} from '../js/state.js';
import { initWorld, worldTick } from '../js/world.js';

/* 무역선으로서의 등급 — **화물칸 오름차순**이다. 이 시뮬은 순수 무역만 재므로
   전투력이 아니라 얼마나 싣느냐가 곧 등급이다(갤리는 비싸도 짐을 적게 실어 아래에 온다). */
export const ORDER = ['galley', 'cocca', 'caravel', 'frigate', 'brig',
  'superfrigate', 'fluyt', 'galleon', 'carrack', 'indiaman'];

/** 목적지 하나에 대해 화물칸을 채우는 최적 조합(그리디).
    실제 플레이어처럼 여러 품목을 섞는다 — 압력이 품목별로 걸리므로 분산이 이득이다. */
export function planFor(to, room, budget) {
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
export function bestRun() {
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

/** 한 판을 끝까지 돌린다.
    hooks.onVoyage(rec)  — 항차가 끝날 때마다. rec에 그 항차의 수지·NPC 소식이 다 들어있다.
    hooks.onStart()      — 초기화 직후(0항차 시점 스냅샷용). */
export function runSim({ maxVoyages = 90, hooks = {} } = {}) {
  resetGame();
  initWorld();
  hooks.onStart?.();

  const got = {};      // shipKey -> 언제 샀나
  const rows = [];
  for (let v = 1; v <= maxVoyages; v++) {
    const goldOpen = state.gold;
    let shipSpend = 0, repairSpend = 0, hireSpend = 0;

    // 지금 항구에서 살 수 있는 배가 있으면 산다(가장 큰 것부터 — 곧 갈아탈 배).
    // **지금 타는 배보다 나은 것만** — 안 그러면 싼 배를 사서 화물칸이 줄어드는 짓을 한다.
    const curRank = ORDER.indexOf(state.shipKey);
    for (const key of [...ORDER].reverse()) {
      if (ORDER.indexOf(key) <= curRank) continue;
      if (state.fleet[key] || !sellsShip(key)) continue;
      if (shipPriceAt(key) > state.gold * 0.92) continue;   // 운영자금은 남긴다 (값은 항구마다 다르다)
      const before = state.gold;
      if (purchaseShip(key).ok) {
        shipSpend += before - state.gold;
        boardShip(key);
        got[key] = { v, day: state.day, gold: state.gold };
        // 새 배를 몰려면 사람이 필요하다
        while (shorthanded()) {
          const g = state.gold;
          if (!hire(1).ok) break;
          hireSpend += g - state.gold;
        }
      }
    }
    if (state.hp < state.maxHp * 0.6) {
      const g = state.gold;
      repair(state.maxHp - state.hp);
      repairSpend += g - state.gold;
    }

    const run = bestRun();
    if (!run || !Object.keys(run.take).length) break;

    // 매입
    const from = state.at;
    let spend = 0;
    const bought = {};
    for (const [gid, n] of Object.entries(run.take)) {
      const g = state.gold;
      if (!buy(gid, n).ok) continue;
      spend += g - state.gold;
      bought[gid] = n;
    }

    // 항해 — 일당·보급·선단 유지비가 여기서 나간다
    const dd = voyageDays(state.at, run.to);
    const cost = advanceDays(dd);
    const news = worldTick(dd);        // NPC도 같은 시장에서 사고판다
    state.at = run.to;
    if (state.fleet[state.shipKey]) state.fleet[state.shipKey].at = run.to;

    // 매각
    let gain = 0;
    const sold = {};
    for (const gid of Object.keys({ ...state.cargo })) {
      const n = state.cargo[gid] || 0;
      if (!n) continue;
      const g = state.gold;
      if (!sell(gid, n).ok) continue;
      gain += state.gold - g;
      sold[gid] = n;
    }

    const rec = {
      v, day: state.day, gold: Math.round(state.gold), goldOpen: Math.round(goldOpen),
      ship: state.shipKey, from, to: run.to, days: dd,
      spend, gain, bought, sold,
      wages: cost.wages, supplies: cost.supplies, fleetCost: cost.fleet, leak: cost.leak,
      shipSpend, repairSpend, hireSpend,
      news,
    };
    rows.push(rec);
    hooks.onVoyage?.(rec);
  }
  return { got, rows };
}
