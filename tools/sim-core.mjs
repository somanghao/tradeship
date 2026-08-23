// sim-core.mjs — 무역 시뮬레이션의 몸통 (출력이 없는 순수 로직)
//
// CLI(`sim-trade.mjs`)와 대시보드(`dashboard/dash.js`)가 **같은 코드**를 돌린다.
// 여기서 갈라지면 "터미널에서는 맞는데 대시보드에서는 다른" 상태가 생긴다.
//
// 최적에 가까운 플레이를 가정한다(매 항차 이웃 항구 중 최대 순이익 조합 선택).
// 전투 전리품은 넣지 않는다 — 순수 무역만으로도 너무 빨리 부자가 되는지 보는 것이 목적.

import { GOODS, SHIPS, CITY_BY_ID, CHAIN, CHAIN_BY_ID, WORK, HOLDINGS } from '../js/data.js';
import {
  state, resetGame, advanceDays, neighborsOf, voyageDays, voyageCost,
  buy, sell, costFor, gainFor, tariffRate, purchaseShip, boardShip, sellsShip,
  cargoFree, repair, hire, shorthanded, shipPriceAt,
  tavernCrews, recruitBand, ship, paydayDue, settlePayroll, payrollOwed,
  /* 수직계열화 1단계(A-9) — `chain` 스위치를 켰을 때만 쓴다. 끄면 이 아래가 한 줄도 안 돈다. */
  priceOf, resaleOf, hasHolding, canBuyHolding, buyHolding, storeCap, storedUsed,
  storeGoods, takeGoods, settleWorks, collectMill, millOf, millRecipes, millPrice,
  canBuyMill, buyMill, millBatchCap, millFee, runMill, sellMill, chainOut, chainInUnits, workList,
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

export function bestRun(minMargin = 0, carry = false) {
  let best = null;
  const room = cargoFree();
  if (room <= 0) return null;
  for (const to of neighborsOf(state.at)) {
    const days = voyageDays(state.at, to);
    const cost = voyageCost(days).total;
    const p = planFor(to, room, state.gold, minMargin);
    let net = p.gain - p.spend - cost;

    /* ★ **이미 실려 있는 짐의 값을 목적지 선택에 넣는다** — `chain` 모드에서만.
       기본 판은 입항하자마자 화물을 전부 팔아 이 시점에 `state.cargo`가 비어 있으므로
       이 항이 언제나 0이고, 그래서 **기준선은 한 톨도 안 움직인다.**
       사슬 모드에서는 가공품을 싣고 다음 항구로 가는데, 그것을 안 세면 시뮬이
       "값나가는 짐을 들고 아무 데나 가는" 플레이가 되어 사슬이 부당하게 나쁘게 나온다.
       (반대로 유리하게 짜면 이 도구가 거짓말을 한다 — 그래서 **이미 산 짐의 매각가**만 센다.) */
    if (carry) {
      for (const [gid, n] of Object.entries(state.cargo)) {
        if (n > 0) net += gainFor(gid, n, to) * (1 - tariffRate(to));
      }
    }

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

/* ══════════════════════════════════════════════════════════════
   수직계열화 — 「짓는 규칙」 (A-9 1단계 · SPEC-vertical.md §6-2)
   ══════════════════════════════════════════════════════════════
   ★ **곡선이 나쁘게 나오면 게임보다 이 아래를 먼저 의심하라.** 이 저장소가 실제로 겪은
     함정이다 — "선체 60% 미만이면 전액 수리"가 누수 2pt/일짜리 시작배에 걸려 20판 중
     18판이 배를 한 척도 못 샀는데, **게임은 멀쩡했다.**

   그래서 여기 규칙은 **사람이 할 만한 것**으로, 그리고 **의도적으로 보수적으로** 짠다.
   유리하게 짜면 `sim-chain.mjs`가 거짓말을 한다:

     ① 금고가 (시설값 × 2.5 + 30일 고정비 × 3)을 넘을 때만 짓는다
     ② 그 항구를 최근 60일에 **두 번 이상** 들렀을 때만 짓는다   ← 항로가 굳었다는 뜻
     ③ 그 항구 시장에서 **투입 원료를 다 살 수 있을 때만** 고른다 (1단계엔 농장이 없다)
     ④ 원료 매입에 쓰는 돈은 금고의 30%까지 — 화물 회전 자본을 죽이지 않는다
     ⑤ 창고 60칸을 넘겨 착수하지 않는다(산출이 들어갈 자리를 남긴다)
     ⑥ 두 번 연속 원료를 못 채우면 **매각한다**(회수 60%) — 잘못 지은 것을 안 끌고 간다

   ★ `chain: false`가 기본이라 이 함수들은 **한 줄도 안 돈다** — 기존 도구는 안 움직인다.
   ══════════════════════════════════════════════════════════════ */

/** 그 항구 시장에 실제로 오르는 품목인가 — `tradableBetween`과 같은 눈이다 */
function inMarket(cityId, gid) {
  const c = CITY_BY_ID[cityId];
  return !!(c && (c.supply?.[gid] != null || c.demand?.[gid] != null));
}

/** 사슬이 만드는 품목들 — 실어 나갈 것과 팔 것을 가르는 데 쓴다 */
const CHAIN_OUTPUTS = new Set(CHAIN.map((r) => chainOut(r)));
const CITY_BY_ID_LIST = Object.values(CITY_BY_ID);

/** 최근 `days`일 안에 이 항구를 몇 번 들렀나 */
const recentVisits = (visits, cityId, day, days = 60) =>
  (visits[cityId] ?? []).filter((d) => day - d <= days).length;

/** 이 항구에 지을 만한 사슬 하나 — 없으면 null */
function pickRecipe(cityId) {
  for (const r of millRecipes(cityId)) {
    if (millOf(r.id, cityId)) continue;
    // ③ 원료를 여기서 못 사면 사슬이 시작조차 못 한다(1단계엔 농장이 없다)
    if (!Object.keys(r.in).every((gid) => inMarket(cityId, gid))) continue;
    /* 산출을 사 주는 곳이 세계에 하나라도 있어야 한다.
       ⚠️ **이웃 항구에 수요가 있을 것**까지 요구하면 세 갈래가 통째로 죽는다 — 면포 수요는
       인도양·동남아에 몰려 있고 사라사 수요는 유럽·레반트에 있는데, 원료가 나는 자리는
       그 어느 쪽과도 이웃하지 않는다(SPEC-vertical.md §1-6: *지도가 사슬을 정한다*).
       실제 플레이어는 몇 항차를 걸쳐 그리로 흘러가지만 이 시뮬은 **한 칸 앞만 본다** —
       그 눈으로 이웃 수요를 요구하면 게임이 아니라 시뮬의 시야가 사슬을 죽이는 것이 된다.
       대신 실은 가공품의 값은 `bestRun(…, carry)`가 목적지 선택에 넣으므로 흘러가기는 한다. */
    const out = chainOut(r);
    if (!CITY_BY_ID_LIST.some((c) => c.demand?.[out] != null)) continue;
    return r;
  }
  return null;
}

/** 원료를 시세로 사서 창고에 채우고 착수한다. 쓴 돈을 돌려준다. */
function feedMill(cityId, r, budget) {
  const w = millOf(r.id, cityId);
  if (!w || w.idle || w.job) return 0;
  const inU = chainInUnits(r);
  const room = Math.min(storeCap(cityId) - storedUsed(cityId), cargoFree());
  const fee1 = millFee(r.id, 1);
  /* ⑤ 창고와 화물칸이 상한이다(원료는 시장 → 화물칸 → 창고를 지난다).
     그 위에서 예산에 드는 만큼으로 회분을 깎는다 — 원료값 + 가공비를 함께 본다. */
  let k = Math.floor(room / inU);
  while (k > 0) {
    let cost = fee1 * k;
    for (const [gid, n] of Object.entries(r.in)) cost += costFor(gid, n * k, cityId);
    if (cost <= budget) break;
    k--;
  }
  if (k <= 0) return 0;

  const before = state.gold;
  /* 산 만큼만 창고에 넣는다 — 한 품목이 모자라 회분이 안 맞으면 `millBatchCap`이
     **실제 재고에서** 다시 세므로 남은 원료가 사라지지 않고 다음 방문까지 기다린다. */
  for (const [gid, n] of Object.entries(r.in)) {
    buy(gid, n * k);
    if (state.cargo[gid]) storeGoods(gid, state.cargo[gid], cityId);
  }
  const cap = millBatchCap(r.id, cityId);
  if (cap > 0) runMill(r.id, cityId, cap);
  return before - state.gold;
}

/** 한 항구에서 사슬이 하는 일 전부. 반환값은 그 항차의 기록용. */
function chainTurn(mode, visits, starve) {
  const at = state.at;
  (visits[at] ??= []).push(state.day);

  let seized = false, built = null;
  const before = state.gold;

  // ── 유지비 · 완성분 수령 ────────────────────────────────────
  const s = settleWorks(at);
  const upkeep = s?.paid ?? 0;          // **고정비**로 따로 센다(§6-3의 「고정비 ÷ 총지출」)
  if (s?.seized) seized = true;
  collectMill(at);
  // 가공품은 창고에 두지 않고 **싣고 나간다** — 팔아야 사슬이 끝난다
  for (const [gid, n] of Object.entries(state.stored?.[at] ?? {})) {
    if (CHAIN_OUTPUTS.has(gid)) takeGoods(gid, n, at);
  }

  // ── 내 가공장이 있으면 먹인다 ───────────────────────────────
  for (const [key, w] of workList(at)) {
    const out = key.split(':')[1];
    const r = CHAIN.find((x) => chainOut(x) === out);
    if (!r || w.idle || w.job) continue;
    const used = feedMill(at, r, Math.floor(state.gold * 0.30));      // ④
    const k = `${at}:${r.id}`;
    if (used > 0) starve[k] = 0;
    else {
      starve[k] = (starve[k] ?? 0) + 1;
      if (starve[k] >= 2) { sellMill(r.id, at); starve[k] = 0; }      // ⑥
    }
  }

  // ── 없으면 지을지 본다 ──────────────────────────────────────
  if (recentVisits(visits, at, state.day) >= 2) {                     // ②
    const r = pickRecipe(at);
    if (r) {
      const price = millPrice(r.id, at, 1);
      let need = price;
      if (!hasHolding('warehouse', at)) {
        // 창고가 먼저다 — 임차창고 → 창고 순서로 값이 붙는다
        for (const k of ['rental', 'warehouse']) {
          if (!hasHolding(k, at)) {
            const h = HOLDINGS[k];
            need += (h.priceBase ?? 0) + (CITY_BY_ID[at].size ?? 1) * (h.priceBySize ?? 0);
          }
        }
      }
      const fixed30 = need * WORK.upkeepRate / 12;
      if (state.gold > need * 2.5 + fixed30 * 3) {                    // ①
        for (const k of ['rental', 'warehouse']) {
          if (!hasHolding(k, at) && canBuyHolding(k, at).ok) buyHolding(k, at);
        }
        if (canBuyMill(r.id, at).ok && buyMill(r.id, at).ok) {
          built = { city: at, recipe: r.id, price };
          feedMill(at, r, Math.floor(state.gold * 0.30));
        }
      }
    }
  }

  void mode;
  return { spend: before - state.gold, upkeep, seized, built };
}

/** 총자산 — 금고 + 선단 매각가 + 시설 매각가(60%) + 창고 재고 시가 + 실은 짐 시가.
    ★ 금화만 보면 *"방금 시설을 샀는가"*에 지배된다(부관 측정에서 배운 함정). */
export function totalAssets() {
  let v = state.gold;
  for (const key of Object.keys(state.fleet)) v += resaleOf(key);
  for (const id of Object.keys(state.works ?? {})) v += (state.works[id].spent ?? 0) * WORK.sellBack;
  for (const [cid, row] of Object.entries(state.stored ?? {})) {
    for (const [gid, n] of Object.entries(row)) v += priceOf(cid, gid) * n;
  }
  for (const [gid, n] of Object.entries(state.cargo)) v += priceOf(state.at, gid) * n;
  return Math.round(v);
}

/* `start`는 **어느 부두에서 시작하나**다. 기본값은 지금까지와 같은 `resetGame()`의 기본
   시작지(부산포)라 기존 도구는 한 줄도 안 바뀐다. `sim-chain.mjs`가 이것을 쓰는 이유는
   §1-6 그대로다 — 직물 사슬의 원료가 나는 자리가 지중해·구자라트라, 부산포에서 60항차를
   굴리면 **시뮬이 동아시아를 못 벗어나** 사슬을 한 번도 안 짓는다(실측). 그러면 "±5%"라는
   합격 판정이 *"아무 일도 안 일어났다"*는 뜻이 되어 아무것도 검증하지 못한다. */
export function runSim({ maxVoyages = 90, hooks = {}, minMargin = 0, chain = false, start = null } = {}) {
  if (start) resetGame(start); else resetGame();
  initWorld();
  manCrew();               // 첫 배를 몰 사람부터 태운다
  hooks.onStart?.();

  const got = {};      // shipKey -> 언제 샀나
  const rows = [];
  const visits = {};   // cityId -> 들른 날들 (사슬 「짓는 규칙」 ②가 읽는다)
  const starve = {};   // '<도시>:<사슬>' -> 원료를 못 채운 횟수 (규칙 ⑥)
  const held = {};     // 산지라 안 팔고 들고 나온 가공품 -> 몇 항차째인가
  let firstWork = 0, seizedRuns = 0;
  if (chain) chainTurn(chain, visits, starve);   // 출항 전 첫 항구도 한 번 센다
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
    /* 수리 — ★ **물이 새는 배는 고치지 않는다.**
       전에는 선체가 60% 밑이면 무조건 전액 수리했는데, 시작배(낡은 바사)는 leak 2pt/일이라
       고쳐도 이틀이면 도로 샌다. 수리 단가 14닢/pt = **하루 28닢**으로, 선원 여섯의
       급여(9.8닢/일)의 세 배다. 밑 빠진 독에 붓느라 4항차째에 336닢이 날아가고
       그 뒤로 매입 자본이 회복되지 않아 **20판 중 18판이 배를 한 척도 못 샀다** —
       게임이 아니라 이 시뮬 전략이 만든 결과였다(수리 임계만 15%로 낮춰도 완주 9/10판).
       실제 플레이어는 삭은 배를 고치는 대신 갈아탈 돈을 모은다. 누수는 hp를 1 밑으로는
       깎지 않으므로(`advanceDays`) 항해가 막히지도 않는다.
       ⇒ 누수 없는 배로 갈아탄 뒤부터 60% 규칙을 쓴다. → wiki/economy-trade.md */
    const leaky = (SHIPS[state.shipKey]?.leak || 0) > 0;
    if (!leaky && state.hp < state.maxHp * 0.6) {
      const g = state.gold;
      repair(state.maxHp - state.hp);
      repairSpend += g - state.gold;
    }

    const run = bestRun(minMargin, !!chain);
    /* ★ 사슬 모드에서는 **가공품만 싣고 떠나는 항차**가 성립한다 — 원료값이 이미
       창고에 묶여 있어 새로 살 것이 없을 수 있기 때문이다. 그때 `take`가 비었다고
       판을 끝내면 시뮬이 사슬을 쓴 판만 일찍 죽어 곡선이 거짓으로 나쁘게 나온다. */
    const carrying = chain && Object.values(state.cargo).some((n) => n > 0);
    if (!run || (!Object.keys(run.take).length && !carrying)) break;

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
      /* ★ **산지에는 안 판다** — 사슬이 만든 물건만. 캄바트에서 짠 사라사를 이웃
         수라트(사라사 산지 0.54)에 부리면 만든 값에 도로 넘기는 꼴이라, 시뮬이
         *"사슬은 손해다"*라는 결론을 스스로 만들어 낸다. 사람은 그러지 않는다.
         대신 **다섯 항차까지만** 들고 있는다 — 안 그러면 영영 못 파는 짐이 화물칸을 먹는다. */
      if (chain && CHAIN_OUTPUTS.has(gid) && CITY_BY_ID[state.at]?.supply?.[gid] != null
          && (held[gid] ?? 0) < 5) { held[gid] = (held[gid] ?? 0) + 1; continue; }
      const g = state.gold;
      if (!sell(gid, n).ok) continue;
      gain += state.gold - g;
      delete held[gid];
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

    /* ── 사슬 — 유지비·수령·원료 매입·착수·매각 판단 ────────────
       **파는 것이 끝난 뒤**다. 실제 플레이어도 짐을 팔아 금고를 채우고 나서 시설을 본다. */
    let chainSpend = 0, chainUpkeep = 0;
    if (chain) {
      const t = chainTurn(chain, visits, starve);
      chainSpend = t.spend;
      chainUpkeep = t.upkeep;
      if (t.seized) seizedRuns++;
      if (t.built && !firstWork) firstWork = v;
    }

    const rec = {
      v, day: state.day, gold: Math.round(state.gold), goldOpen: Math.round(goldOpen),
      ship: state.shipKey, from, to: run.to, days: dd,
      spend, gain, bought, sold,
      wages: cost.wages, supplies: cost.supplies, fleetCost: cost.fleet,
      hullCost: cost.hull, armsCost: cost.arms, insCost: cost.insurance,
      officerCost: cost.officer, leak: cost.leak,
      shipSpend, repairSpend, hireSpend, payroll,
      /* 사슬 지표 — `chain: false`면 전부 0/기본값이라 기존 도구의 계산이 안 바뀐다 */
      chainSpend, chainUpkeep, assets: totalAssets(),
      works: Object.keys(state.works ?? {}).length,
      news,
    };
    rows.push(rec);
    hooks.onVoyage?.(rec);
  }
  return { got, rows, firstWork, seizedRuns, works: state.works ?? {} };
}
