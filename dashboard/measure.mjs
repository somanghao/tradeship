// measure.mjs — 시뮬을 돌리면서 지표를 채집한다 (DOM 없음)
//
// 화면 그리기와 떼어 놓은 이유: 이 부분은 node로도 돌려서 검증할 수 있어야 한다.
// 게임 상태는 매 항차 덮어써지므로 나중에 되돌아볼 수 없다 — 지나갈 때 찍어 두는 수밖에 없다.

import { CITIES, GOODS, GOOD_BY_ID } from '../js/data.js';
import { state, pressureOf } from '../js/state.js';
import { runSim } from '../tools/sim-core.mjs';

export function measure(maxVoyages = 90) {
  const priceSeries = {};   // city -> good -> [단가…]
  const pressMax = {};      // city -> good -> 최대 압력
  const flow = {};          // city -> good -> {inP,outP,inN,outN}  (P=주인공, N=NPC)
  const npcSeries = [];     // 항차별 NPC 상인 자산 분포
  const events = [];        // 거래·습격 기록

  for (const c of CITIES) {
    priceSeries[c.id] = {}; pressMax[c.id] = {}; flow[c.id] = {};
    for (const g of GOODS) {
      priceSeries[c.id][g.id] = [];
      pressMax[c.id][g.id] = 0;
      flow[c.id][g.id] = { inP: 0, outP: 0, inN: 0, outN: 0 };
    }
  }

  const snapPrices = () => {
    for (const c of CITIES) for (const g of GOODS) {
      priceSeries[c.id][g.id].push(state.prices[c.id]?.[g.id] ?? 0);
      const p = pressureOf(c.id, g.id);
      if (p > pressMax[c.id][g.id]) pressMax[c.id][g.id] = p;
    }
  };

  const snapNpcs = (v, day) => {
    const traders = (state.npcs || []).filter((n) => n.kind === 'trader');
    const worth = traders.map((n) => {
      let w = n.gold;
      for (const [gid, q] of Object.entries(n.cargo || {})) {
        w += (state.prices[n.at]?.[gid] || GOOD_BY_ID[gid].base) * q;
      }
      return w;
    }).sort((a, b) => a - b);
    npcSeries.push({
      v, day, n: traders.length,
      med: worth.length ? worth[Math.floor(worth.length / 2)] : 0,
      max: worth.length ? worth[worth.length - 1] : 0,
      min: worth.length ? worth[0] : 0,
      pirates: (state.npcs || []).filter((n) => n.kind === 'pirate').length,
    });
  };

  const { got, rows } = runSim({
    maxVoyages,
    hooks: {
      onStart() { snapPrices(); snapNpcs(0, 1); },
      onVoyage(rec) {
        // 주인공: 떠난 항구에서 사고(유출), 닿은 항구에 판다(유입)
        for (const [gid, q] of Object.entries(rec.bought)) flow[rec.from][gid].outP += q;
        for (const [gid, q] of Object.entries(rec.sold)) flow[rec.to][gid].inP += q;
        // NPC: world.js가 돌려준 소식 그대로
        for (const e of rec.news) {
          if (e.kind === 'bought') flow[e.city][e.goodId].outN += e.qty;
          else if (e.kind === 'sold') flow[e.city][e.goodId].inN += e.qty;
          events.push({ ...e, v: rec.v, day: rec.day });
        }
        snapPrices();
        snapNpcs(rec.v, rec.day);
      },
    },
  });

  return { got, rows, priceSeries, pressMax, flow, npcSeries, events };
}

/** 한 계열의 최소·최대·평균·변동폭 */
export function statsOf(arr) {
  if (!arr.length) return { min: 0, max: 0, avg: 0, last: 0, band: 0 };
  let min = Infinity, max = -Infinity, sum = 0;
  for (const v of arr) { if (v < min) min = v; if (v > max) max = v; sum += v; }
  const avg = sum / arr.length;
  return { min, max, avg, last: arr[arr.length - 1], band: avg ? (max - min) / avg : 0 };
}

/** 수요지로 선언됐는데 실제로는 물자가 안 들어오는 칸 */
export function starvedCells(M) {
  const out = [];
  for (const c of CITIES) {
    for (const gid of Object.keys(c.demand)) {
      const f = M.flow[c.id][gid];
      out.push({
        city: c, cityId: c.id, goodId: gid, mul: c.demand[gid],
        inQty: f.inP + f.inN, outQty: f.outP + f.outN,
      });
    }
  }
  return out.sort((a, b) => (a.inQty - b.inQty) || (b.mul - a.mul));
}

/** 도시×품목 전체를 한 줄씩 편 표 — 거래가 아예 없던 칸을 찾는 데 쓴다 */
export function allCells(M) {
  const out = [];
  for (const c of CITIES) for (const g of GOODS) {
    const st = statsOf(M.priceSeries[c.id][g.id]);
    const f = M.flow[c.id][g.id];
    out.push({
      city: c, good: g, st,
      vol: f.inP + f.inN + f.outP + f.outN,
      net: (f.inP + f.inN) - (f.outP + f.outN),
      press: M.pressMax[c.id][g.id],
      tag: c.supply[g.id] ? 'supply' : c.demand[g.id] ? 'demand' : null,
      raw: c.supply[g.id] ?? c.demand[g.id] ?? null,
    });
  }
  return out;
}
