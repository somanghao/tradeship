// npc/behavior.js — NPC가 무엇을 보고 어디로 갈지 정한다 (NPC 담당 영역)
//
// ★ 여기는 **판단만** 한다. 상태를 직접 고치지 않고, 게임 모듈을 import하지도 않는다.
//   필요한 것은 전부 `ctx`로 받는다 — 그래서 이 파일만 떼어 시험해 볼 수 있고,
//   통째로 갈아 끼워도 `js/world.js`는 손댈 필요가 없다.
//
//   ctx = {
//     neighbors(cityId) -> [cityId…]      그 항구에서 직항으로 갈 수 있는 곳
//     price(cityId, goodId) -> 단가
//     tariff(cityId) -> 0~1               파는 쪽에 붙는 입항세
//     goods -> [{id, …}…]
//     ships -> SHIPS 표
//     tradersNear(cityId) -> 수           그 항구에 몰린 상인 수
//     rnd() -> 0~1
//   }
//
// 지금의 한계(고칠 자리):
//   · 상인은 **이웃 항구 한 칸**만 본다. 여러 칸 건너 큰 차익을 노리는 원양 항해가 없다.
//     `chooseTrade`가 후보를 만드는 곳을 넓히면 된다(비용은 거리에 비례해 늘려야 한다).
//   · 산지에서 실어 여러 항구에 나눠 파는 순회 상인이 없다 — 한 번에 한 품목, 한 구간이다.

import { NPC } from './config.js';

/** 상인의 한 수: 무엇을 얼마나 사서 어디로 갈 것인가.
    남는 장사가 없으면 null — 그때는 빈 배로 옮겨 다닌다. */
export function chooseTrade(npc, ctx) {
  const nb = ctx.neighbors(npc.at);
  if (!nb.length) return null;

  const cands = [];
  const cap = ctx.ships[npc.shipKey].cargo;
  const [lo, hi] = NPC.loadRatio;

  for (const to of nb) {
    for (const g of ctx.goods) {
      const buyAt = ctx.price(npc.at, g.id);
      const sellAt = ctx.price(to, g.id);
      const margin = sellAt * (1 - ctx.tariff(to)) - buyAt;
      if (margin <= 0) continue;
      const room = Math.floor(cap * (lo + ctx.rnd() * (hi - lo)));
      const qty = Math.min(room, Math.floor(npc.gold / buyAt));
      if (qty < NPC.minLot) continue;
      cands.push({ to, gid: g.id, qty, buyAt, score: margin * qty });
    }
  }
  if (!cands.length) return null;

  // 상위 후보 중에서 고른다 — 전부 같은 최적해로 몰리면 한 항구만 계속 짓눌린다
  cands.sort((a, b) => b.score - a.score);
  return cands[Math.floor(ctx.rnd() * Math.min(NPC.pickTop, cands.length))];
}

/** 해적의 한 수: 어느 항구 쪽으로 기울 것인가.
    상인이 많은 쪽으로 쏠리되, **제 사냥터가 있는 해적은 그쪽으로 더 기운다.**
    ★ 사냥터(`hunt`)는 그 해적이 실제로 노리던 구간이다 — 바르바로사가 알제 앞바다를,
      마라카르가 말라바르 해안을 지켰다는 사실이 여기서 항로 위험으로 드러난다.
      키 계산은 `ctx.huntBonus`가 해 준다(여기는 게임 모듈을 모른다). */
export function choosePirateMove(npc, ctx) {
  const nb = ctx.neighbors(npc.at);
  if (!nb.length) return null;
  const weights = nb.map((to) => 1 + ctx.tradersNear(to) * 1.6 + (ctx.huntBonus?.(npc, to) ?? 0));
  let r = ctx.rnd() * weights.reduce((a, b) => a + b, 0);
  let i = 0;
  for (; i < nb.length; i++) { r -= weights[i]; if (r <= 0) break; }
  return nb[Math.min(i, nb.length - 1)];
}

/** 남는 장사가 없을 때 갈 곳 — 지금은 아무 데나 */
export function chooseWander(npc, ctx) {
  const nb = ctx.neighbors(npc.at);
  return nb.length ? nb[Math.floor(ctx.rnd() * nb.length)] : null;
}
