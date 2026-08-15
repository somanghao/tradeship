// sim-core.mjs — 무역 시뮬레이션의 몸통 (출력이 없는 순수 로직)
//
// CLI(`sim-trade.mjs`)와 대시보드(`dashboard/dash.js`)가 **같은 코드**를 돌린다.
// 여기서 갈라지면 "터미널에서는 맞는데 대시보드에서는 다른" 상태가 생긴다.
//
// 최적에 가까운 플레이를 가정한다(매 항차 이웃 항구 중 최대 순이익 조합 선택).
// 전투 전리품은 넣지 않는다 — 순수 무역만으로도 너무 빨리 부자가 되는지 보는 것이 목적.

import { GOODS, SHIPS, CITY_BY_ID } from '../js/data.js';
import {
  state, resetGame, advanceDays, neighborsOf, voyageDays, voyageCost,
  buy, sell, costFor, gainFor, tariffRate, purchaseShip, boardShip, sellsShip,
  cargoFree, repair, hire, shorthanded, shipPriceAt,
  tavernCrews, recruitBand, ship, paydayDue, settlePayroll, payrollOwed,
} from '../js/state.js';
import { initWorld, worldTick } from '../js/world.js';

/* 무역선으로서의 등급 — **화물칸 오름차순**이다. 이 시뮬은 순수 무역만 재므로
   전투력이 아니라 얼마나 싣느냐가 곧 등급이다(갤리는 비싸도 짐을 적게 실어 아래에 온다). */
export const ORDER = ['galley', 'cocca', 'caravel', 'frigate', 'brig',
  'superfrigate', 'fluyt', 'galleon', 'carrack', 'indiaman'];

/** 목적지 하나에 대해 화물칸을 채우는 최적 조합(그리디).
    실제 플레이어처럼 여러 품목을 섞는다 — 압력이 품목별로 걸리므로 분산이 이득이다.

    `minMargin`은 **한 칸을 더 실을 최소 수익률**이다(0이면 한계마진이 0이 될 때까지 채운다).
    기본값 0은 총이익 최대화라 옳지만, 그렇게 채우면 마지막 칸의 마진이 0이라
    **항차 ROI가 구조적으로 낮게 나온다** — 게다가 항해 중 시세가 밀리면 그 칸들이 먼저 적자로 뒤집힌다.
    조심스러운 플레이어를 흉내 내거나 ROI 분포를 볼 때 이 값을 올린다.
    → .claude/docs/wiki/research-voyage-returns.md §7-1 */
/* 그 두 항구 사이에서 **실제로 거래되는** 품목.
   ★ 교역품이 열둘일 때는 전부 훑어도 됐다. 아홉 권역 77종이 되자 시뮬이
     **어디서도 안 나고 아무도 안 사는 물건**을 사기 시작했다 — 중립가끼리라도
     시세 노이즈(±15%)가 있어 매 항구 수십 개의 가짜 차익이 생기기 때문이다.
     그런 거래는 이문이 거의 없으면서 시장 압력만 쌓아, 열 항차 만에 파산했다.
     실제 플레이어는 그 항구 시장 목록에 있는 것만 본다(`scenes/port.js`가 같은 기준으로 좁힌다) —
     시뮬도 같은 눈으로 봐야 시뮬이 게임을 흉내 낸 것이 된다. */
function tradableBetween(from, to) {
  const live = new Set();
  for (const id of [from, to]) {
    const c = CITY_BY_ID[id];
    if (!c) continue;
    for (const gid of Object.keys(c.supply ?? {})) live.add(gid);
    for (const gid of Object.keys(c.demand ?? {})) live.add(gid);
  }
  const list = GOODS.filter((g) => live.has(g.id));
  return list.length ? list : GOODS;
}

export function planFor(to, room, budget, minMargin = 0) {
  const take = {};
  let spend = 0, gain = 0;
  const pool = tradableBetween(state.at, to);
  for (let k = 0; k < room; k++) {
    let best = null;
    for (const g of pool) {
      const n = (take[g.id] || 0) + 1;
      const dCost = costFor(g.id, n) - costFor(g.id, n - 1);
      const dGain = gainFor(g.id, n, to) - gainFor(g.id, n - 1, to);
      const margin = dGain * (1 - tariffRate(to)) - dCost;
      if (dCost > budget - spend) continue;
      if (margin <= 0 || margin < dCost * minMargin) continue;
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
/* 직전에 있던 항구 — 왕복 갇힘을 막는 데 쓴다 */
let lastPort = null;
export const setLastPort = (id) => { lastPort = id; };

export function bestRun(minMargin = 0) {
  let best = null;
  const room = cargoFree();
  if (room <= 0) return null;
  for (const to of neighborsOf(state.at)) {
    const days = voyageDays(state.at, to);
    const cost = voyageCost(days).total;
    const p = planFor(to, room, state.gold, minMargin);
    let net = p.gain - p.spend - cost;

    /* ★ 방금 떠나온 항구로 되돌아가는 데 벌점을 준다.
       세계가 175항구가 되면서 **가까운 두 항구를 왕복하는 것이 국소 최적**이 되는 자리가
       생겼다(지중해에 알게로~마요르카가 들어오자 시뮬이 거기 갇혀 열 항차 만에 파산했다).
       두 항구만 오가면 시장 압력이 양쪽에 쌓여 차익이 말라 죽는데, 매 항차 "지금 가장 나은 곳"만
       보는 탐욕 알고리즘은 그것을 못 본다 — 압력이 걷히는 데 며칠 걸리기 때문이다.
       실제 상인도 같은 두 항구만 왕복하지는 않는다. 15%면 진짜 좋은 왕복은 여전히 살아남고
       (알렉산드리아~베네치아 같은 간선), 말라붙은 왕복은 빠져나온다. */
    if (to === lastPort) net *= net > 0 ? 0.85 : 1.15;

    if (!best || net > best.net) best = { to, take: p.take, net, days, spend: p.spend };
  }
  return best;
}

/** 한 판을 끝까지 돌린다.
    hooks.onVoyage(rec)  — 항차가 끝날 때마다. rec에 그 항차의 수지·NPC 소식이 다 들어있다.
    hooks.onStart()      — 초기화 직후(0항차 시점 스냅샷용). */
/* 배를 몰 사람을 채운다 — 게임은 **갑판이 빈 채로** 시작하므로(술집에서 모은다)
   시뮬도 사람을 태우지 않으면 첫 항차부터 인원 부족으로 속력이 깎인다.

   실제 플레이어처럼 **술집을 먼저 본다**(계약금이 부두 고용의 1/7이다).
   싼 순으로 훑되 일당이 표준보다 비싼 무리는 뒤로 미룬다 — 계약금만 보고 태우면
   주정뱅이로 갑판을 채우게 되고, 그건 사람이 아니라 값만 보는 플레이다.
   술집이 비었거나 자리가 모자라면 부두 인부로 메운다(막다른 길을 막는 자리). */
function manCrew() {
  if (!shorthanded()) return 0;
  let spent = 0;
  const offers = tavernCrews(state.at)
    .filter((b) => !state.hired.includes(b.id))
    .sort((x, y) => (x.advance / x.n) * (x.wage / 1.2) - (y.advance / y.n) * (y.wage / 1.2));
  for (const b of offers) {
    if (!shorthanded()) break;
    const g = state.gold;
    if (recruitBand(b.id).ok) spent += g - state.gold;
  }
  while (shorthanded()) {
    const g = state.gold;
    if (!hire(1).ok) break;              // 금화가 바닥나면 인원 부족인 채로 떠난다
    spent += g - state.gold;
  }
  return spent;
}

export function runSim({ maxVoyages = 90, hooks = {}, minMargin = 0 } = {}) {
  resetGame();
  initWorld();
  manCrew();               // 첫 배를 몰 사람부터 태운다
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
      // 운영자금을 남긴다. ★ 0.92는 너무 헐거웠다 — 교역품 값을 사료 비율로 올린 뒤
      //   화물 한 칸을 채우는 데 드는 자본이 커져서, 배를 사고 나면 실을 것을 못 사
      //   절반이 파산했다(실측). 배는 화물을 나르는 수단이지 목적이 아니므로
      //   실제 플레이어처럼 매입 자금을 남겨 둔다.
      if (shipPriceAt(key) > state.gold * 0.70) continue;
      const before = state.gold;
      if (purchaseShip(key).ok) {
        shipSpend += before - state.gold;
        boardShip(key);
        got[key] = { v, day: state.day, gold: state.gold };
        hireSpend += manCrew();     // 새 배를 몰려면 사람이 더 필요하다
      }
    }
    if (state.hp < state.maxHp * 0.6) {
      const g = state.gold;
      repair(state.maxHp - state.hp);
      repairSpend += g - state.gold;
    }

    const run = bestRun(minMargin);
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
    setLastPort(state.at);
    const dd = voyageDays(state.at, run.to);
    const cost = advanceDays(dd, { from: state.at, to: run.to });
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

    /* 급여 정산 — **입항해서 팔고 난 뒤**다. 실제 플레이어도 그 순서로 움직인다
       (짐을 팔아 금고를 채우고 삯을 치른다). 여기를 빼면 급여가 영영 안 나가
       사실상 공짜가 되어 자산 곡선이 통째로 부풀어 오른다. */
    let payroll = null;
    if (paydayDue()) {
      const owedNow = payrollOwed();
      const r = settlePayroll();
      payroll = { owed: owedNow, paid: r.paid, missed: r.missed, deserted: r.deserted.length };
      // 사람이 떠났으면 다시 채운다 — 배가 묶이면 시뮬이 거기서 멈춘다
      if (r.deserted.length) hireSpend += manCrew();
    }

    const rec = {
      v, day: state.day, gold: Math.round(state.gold), goldOpen: Math.round(goldOpen),
      ship: state.shipKey, from, to: run.to, days: dd,
      spend, gain, bought, sold,
      wages: cost.wages, supplies: cost.supplies, fleetCost: cost.fleet,
      hullCost: cost.hull, armsCost: cost.arms, insCost: cost.insurance,
      officerCost: cost.officer, leak: cost.leak,
      shipSpend, repairSpend, hireSpend, payroll,
      news,
    };
    rows.push(rec);
    hooks.onVoyage?.(rec);
  }
  return { got, rows };
}
