// state.js — 게임 상태와 규칙 (렌더링과 무관한 순수 로직)

import {
  GOODS, GOOD_BY_ID, CITIES, CITY_BY_ID, ROUTES, SHIPS, ENEMIES, SEA_EVENTS,
  CANNONS, CANNON_KEYS, CANNON_REFUND, TROOPS, TROOP_REFUND, MELEE_SLOTS,
  REFITS, SHOTS, MARKET, CURRENTS, TARIFF, CITY_TARIFF, SPREAD, CONTRACT, OFFICER,
  ROUTE_RISK, riskKey, SHOCK, INLAND_ODDS, BOON, INFAMY, ORIGIN_BY_ID, DEFAULT_ORIGIN,
  HOLDINGS, HOLDING_KEYS, HOLDING, YARD_UPGRADE, YARD, ENDING,
  laneOf, sameRegion, REGION_OF_CITY, REGIONS, REGION_BY_ID, HOME_REGION, citiesOfRegion, OCEAN_LANES,
  FOES_BY_REGION,
  TAVERN, CREW_TRAITS, CREW_TRAIT_KEYS, CREW_NAMES, CREW_NAME_POOL, PIRATE_NAME_POOL,
  // ── 튜닝 상수 — 값은 data.js가 정본이고 여기서는 **쓰기만** 한다 ──
  START_GOLD, START_PORTS, DEFAULT_START, REPAIR_UNIT, HIRE_UNIT,
  CREW_WAGE, SUPPLY_UNIT, ARM_UPKEEP, HULL_UPKEEP,
  MONTH_DAYS, UNREST_PER_MISS, UNREST_HEAL, DESERT_AT,
  INSURANCE_RATE, INSURANCE_COVER, JETTISON_BASE, JETTISON_PER_PCT, INLAND_LOSS,
  ODDS_BASE, ODDS_PER_PCT, BASE_RISK, THREAT_PER_SHIP, ODDS_CAP,
  LURE_PER, LURE_PER_STEP, LURE_CAP,
  ZONE_FAR_FALL, ZONE_NEAR_FALL, ZONE_FLOOR,
  SHIP_RESALE, YARD_SLACK_OFF, YARD_SLACK_CAP, YARD_TRADITION_OFF,
  USED, PRIZE_HULL, PRIZE_SCRAP, PRIZE_CREW,
  SPOILS_SHARE, SPOILS_TAIL, SPOILS_FLOOR, SPOILS_GOODS_PER_CREW, SPOILS_GOODS_CAP,
} from './data.js';
import { josa } from './josa.js';   // leaf 유틸 — 화면 헬퍼(ui.js)가 아니라 모듈 방향을 안 깬다

/* 튜닝 상수를 그대로 내보낸다 — **호출부는 예전처럼 `state.js`에서 가져와도 된다.**
   값의 정본은 `data.js`로 옮겼지만(로직 파일에서 밸런스를 찾지 않게), 이미 30곳 넘는
   import를 한꺼번에 고치면 그 커밋의 diff에서 정작 중요한 변화가 묻힌다.
   새로 쓰는 코드는 `data.js`에서 직접 가져오는 쪽이 뜻이 분명하다. */
export {
  START_GOLD, START_PORTS, DEFAULT_START, REPAIR_UNIT, HIRE_UNIT,
  CREW_WAGE, SUPPLY_UNIT, ARM_UPKEEP, HULL_UPKEEP,
  MONTH_DAYS, UNREST_PER_MISS, UNREST_HEAL, DESERT_AT,
  INSURANCE_RATE, INSURANCE_COVER, JETTISON_BASE, JETTISON_PER_PCT, INLAND_LOSS,
  ZONE_FAR_FALL, ZONE_NEAR_FALL, ZONE_FLOOR,
  SHIP_RESALE, YARD_SLACK_OFF, YARD_SLACK_CAP, YARD_TRADITION_OFF,
  USED, PRIZE_HULL, PRIZE_SCRAP, PRIZE_CREW,
  SPOILS_SHARE, SPOILS_TAIL, SPOILS_FLOOR,
};

export const state = {
  day: 1,
  gold: 900,
  shipKey: 'hulk',
  hp: 55, maxHp: 55,
  crew: 10, crewMax: 16,
  guns: 2,                   // 총 포문 수 — arms의 합계와 항상 같다 (syncGuns)
  arms: { light: 2, medium: 0, long: 0 },   // 기함에 실린 대포 편성
  refits: {},                // 기함에 붙은 개장 — fleet 기록과 함께 배를 따라다닌다
  shots: { grape: 0, chain: 0, heated: 0 }, // 특수탄 재고 (일반탄은 무한)
  cargoCap: 45,
  cargo: {},                 // goodId -> qty
  buyPrice: {},              // goodId -> 평균 매입가 (손익 표시용)
  at: 'venezia',             // 현재 정박 도시
  fleet: {},                 // shipKey -> { at, hp, arms, refits }  보유 선박(기함 포함)
  towing: null,              // 항해 중 나포해 끌고 가는 배 (입항 때 그 항구에 정박)
  loadout: ['captain', 'sailor', null, null, null, null],  // 갑판 배치 6칸
  prices: {},                // cityId -> goodId -> 단가
  impact: {},                // cityId -> goodId -> 최근 거래 압력 (날짜가 지나면 감쇠)
  shocks: [],                // 시장 충격 — { city, good, mult, until, why }. 기근·전손 같은 **사건**이 만든다
  contract: null,            // 맡은 대형 주문 (한 번에 하나)
  officer: null,             // 부관 — { hiredDay, earned }. 오직 한 명(data.js: OFFICER)
  /* 태운 선원 무리 — [{ n, trait, wage, name, from, day, unrest }]. 술집에서 모은 패거리다.
     인원의 **정본은 `state.crew`**(숫자)이고 이쪽은 "누가 타고 있나"의 기록이다.
     둘이 어긋날 수 있다(전투로 죽으면 crew만 준다) — `trimBands()`가 맞춘다. */
  bands: [],
  hired: [],                 // 이미 태운 술집 자리의 id — 같은 무리를 두 번 태우지 못하게

  /* 급여는 **발생주의**다 — 날마다 쌓이고 달마다 항구에서 치른다.
     due 이번 달 쌓인 급여(선원+부관) · arrears 못 준 채 넘어간 체불 · nextDue 다음 정산일 */
  payroll: { due: 0, arrears: 0, nextDue: 30, lastDay: 1 },
  /* 이번 달 장부 — 정산 화면이 "이 달 장사가 어땠나"를 보여주기 위한 누적.
     `book()` 하나로만 적는다(적는 자리를 흩뿌리면 반드시 빠뜨린다). */
  ledger: null,
  npcs: [],                  // 저 혼자 도는 상인·해적 (world.js가 굴린다)

  /* ── 항구 인물에게 산 것 ──────────────────────────────────
     명부(`npc-figures.js`)의 71명이 `service`를 하나씩 갖고 있는데, 오래도록 **화면에
     값까지 띄워 놓고 살 수는 없었다**(모달의 단추가 '자리를 뜬다' 하나였다).
     소설이 이 바다들을 *"제도를 인물로 보여 준다"*로 설계했으므로 그 문지기가 눌리지 않으면
     제도가 통째로 안 굴러간다 — `UNIMPLEMENTED.md` B-1이 그것이다.
     ★ 여기 담기는 것은 **기한이 있는 혜택**뿐이다. 사람은 명부에 있고, 산 것만 여기 쌓인다. */
  /* ── 악명 ────────────────────────────────────────────────
     ★ 상선을 덮치는 것이 **무역보다 스무 배** 남는데 대가가 없었다 — 한 척에 금화 11,557 +
     전리품선 매각 13,200인데, 같은 판의 88일 무역 이익이 8,000이었다(완주 플레이 ISSUES #22).
     그러면 최적 전략이 *"무역선을 사서 상선만 턴다"*가 되고, 그건 이 게임이 만들려는 이야기가 아니다.
     명부에는 이미 거절 대사가 있었다 — 「스피놀라 명반선」의 *"산 조르조 은행이 이 배를 보증했소.
     털면 제노바 전체와 싸우는 것이오"* — 그런데 **털어도 아무 일도 안 났다.**
     깃발마다 쌓이고, 그 깃발의 항구에서 **세가 오르고** 그 세력이 **나를 사냥한다**. */
  infamy: {},                // 깃발 → 악명 점수

  /* ── 거점과 보관 화물 (A-1) ────────────────────────────────
     `holdings[cityId] = { rental:true, warehouse:true, … , paid: 마지막 유지비 낸 날 }`
     `stored[cityId]  = { goodId: 수량 }` — **여기 있는 짐은 시장을 누르지 않는다.** */
  holdings: {},
  stored: {},
  /* 공업력 승급(A-2) — `yards[cityId] = { boost, building: { to, until } }` */
  yards: {},
  ended: 0,                  // 끝을 본 날 (0이면 아직)
  boons: {
    permit: {},              // 권역 → 만료일. 그 바다에서 세를 덜 문다(감합·카르타스)
    smuggle: {},             // 도시 → 만료일. 그 항구에서 세관을 피한다
    repair: {},              // 도시 → 만료일. 그 항구 선장인이 수리를 깎아준다
    reroll: {},              // 도시 → 갈아 준 주문의 slot. 큰 일감을 다시 물어온다
    loan: null,              // { principal, owed, due } — 갚을 때까지 하나만
  },
  known: new Set(['venezia']),
  everOwned: new Set(['hulk']),   // 한 번이라도 몰아 본 선종 — 상위 선박 해금 조건(SHIPS[].requires)
  log: [],
  stats: { battles: 0, wins: 0, profit: 0, distance: 0 },
};

/* ── 유틸 ─────────────────────────────────────────────────── */
export function cargoUsed() {
  return Object.values(state.cargo).reduce((a, b) => a + b, 0);
}
export function cargoFree() {
  return state.cargoCap - cargoUsed();
}
export function ship() {
  return SHIPS[state.shipKey];
}
export function pushLog(text, kind = 'info') {
  state.log.unshift({ day: state.day, text, kind });
  if (state.log.length > 60) state.log.pop();
}

/* ── 장부 ─────────────────────────────────────────────────────
   한 달 살림을 적는다. 정산 화면(월말)이 이 값을 읽어 "이 달 장사가 어땠나"를 보여준다.

   ★ 적는 자리를 흩뿌리지 않고 `book()` 하나로 모은다. 매출·관세·성과급처럼
     한 거래에서 세 갈래로 갈리는 것이 있어, 호출부마다 직접 더하면 반드시 빠뜨린다.
   ★ 항목은 **수입 5 · 지출 9**로 고정한다. 늘리려면 화면(정산 모달)도 함께 본다 —
     이름만 늘고 화면에 안 나오면 "적히지 않은 돈"이 생긴 것처럼 보인다. */
export const LEDGER_INCOME = ['sales', 'contracts', 'loot', 'salvage', 'insurance'];
export const LEDGER_OUTGO = ['goods', 'wages', 'officer', 'supplies', 'upkeep',
                             'insurance', 'tariff', 'port', 'ships'];

export function newLedger(day = state.day) {
  const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));
  return { since: day, income: zero(LEDGER_INCOME), outgo: zero(LEDGER_OUTGO) };
}

/** 장부에 적는다. `side`는 'income' | 'outgo'. 0 이하는 무시(빈 줄을 만들지 않는다). */
export function book(side, key, amount) {
  if (!state.ledger || !(amount > 0)) return;
  const row = state.ledger[side];
  if (!(key in row)) return;      // 오타로 유령 항목이 생기지 않게 — 조용히 버린다
  row[key] += Math.round(amount);
}

export const ledgerTotal = (side) =>
  Object.values(state.ledger?.[side] ?? {}).reduce((a, b) => a + b, 0);

/* ── 시세 ─────────────────────────────────────────────────── */
/** 도시·날짜에 대해 결정론적으로 흔들리는 계수 (같은 날 다시 열어도 값이 안 변함) */
function wobble(cityId, goodId, day) {
  let h = 2166136261;
  const s = `${cityId}|${goodId}|${Math.floor(day / 3)}`;   // 3일마다 갱신
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/* ── 시장 충격 ────────────────────────────────────────────────
   `wobble`(±15%)은 노이즈라 아무리 겹쳐도 ×1.5를 못 넘는다. 그런데 사료가 말하는
   대박 항차는 노이즈가 아니라 **사건**이었다 — 기근·전쟁·경쟁 선단 전손.
   그래서 값이 뛰는 자리를 따로 둔다. 충격은 도시·품목 하나에 걸리고 날이 차면 걷힌다.
   → content/voyage-evidence.json: windfallIsEventDriven */

/** 지금 걸려 있는 충격의 곱 (없으면 1). 겹쳐도 SHOCK.cap을 넘지 않는다. */
export function shockFactor(cityId, goodId) {
  let f = 1;
  for (const s of state.shocks) {
    if (s.city === cityId && s.good === goodId) f *= s.mult;
  }
  return Math.max(SHOCK.floor, Math.min(SHOCK.cap, f));
}

/** 충격을 건다. 같은 도시·품목에 이미 걸려 있으면 기간만 늘린다(무한 중첩 방지). */
export function addShock(cityId, goodId, mult, days, why) {
  const cur = state.shocks.find((s) => s.city === cityId && s.good === goodId && s.why === why);
  if (cur) { cur.until = Math.max(cur.until, state.day + days); return cur; }
  const s = { city: cityId, good: goodId, mult, until: state.day + days, why, since: state.day };
  state.shocks.push(s);
  return s;
}

/** 날이 찬 충격을 걷는다 — `advanceDays`가 부른다 */
export function pruneShocks() {
  for (let i = state.shocks.length - 1; i >= 0; i--) {
    if (state.shocks[i].until <= state.day) state.shocks.splice(i, 1);
  }
}

/** 화면에 띄울 충격 목록 (도시 이름·품목 이름까지 붙여서) */
export function activeShocks() {
  return state.shocks.map((s) => ({
    ...s,
    cityName: CITY_BY_ID[s.city]?.name ?? s.city,
    goodName: GOOD_BY_ID[s.good]?.name ?? s.good,
    daysLeft: Math.max(0, s.until - state.day),
  }));
}

/* ★ 흔들림을 **시황**과 **도시 사정**으로 가른다.
   전에는 도시마다 ±15%씩 따로 흔들렸다. 그러면 산지·수요 배율이 만드는 사다리가
   통째로 뒤집힌다 — 실측으로 은은 여덟 칸 중 **네 칸이 역전**이었고(포토시 360 →
   포르토벨로 327 → 파나마 291, 광산에서 멀어질수록 싸진다), 아프리카 금은
   "세계에서 가장 싼 엘미나(0.46)"가 아심(0.52)보다 비쌌다. 두 바다의 중심 서사가
   화면에서 **관측 불가능**했던 것이다.

   시황(기근·전쟁·풍작)은 세계가 함께 겪는다 — 그건 크게 흔들려도 좋다.
   도시 사이의 값 차이는 **그 도시가 무엇을 캐고 무엇을 원하는가**라는 구조이고,
   구조는 노이즈로 뒤집히면 안 된다. 그래서 공통 성분을 크게, 도시 성분을 작게 둔다.
   (품목이 흔들리는 폭 자체는 전과 비슷하다 — 갈라 놓았을 뿐이다.) */
export function priceOf(cityId, goodId) {
  const city = CITY_BY_ID[cityId];
  const good = GOOD_BY_ID[goodId];
  const raw = city.supply[goodId] ?? city.demand[goodId] ?? 1;
  const mul = 1 + (raw - 1) * SPREAD;          // 차익 폭을 SPREAD로 조인다
  const trend = 0.88 + wobble('~world', goodId, state.day) * 0.24;   // 시황 ±12% (전 세계 공통)
  const local = 0.965 + wobble(cityId, goodId, state.day) * 0.07;    // 도시 사정 ±3.5%
  return Math.max(1, Math.round(good.base * mul * trend * local * shockFactor(cityId, goodId)));
}

export function refreshPrices() {
  for (const c of CITIES) {
    state.prices[c.id] = {};
    for (const g of GOODS) state.prices[c.id][g.id] = priceOf(c.id, g.id);
  }
}

/* 이 바다에서 그 품목의 산지(또는 수요지) 가운데 이 도시가 몇째인가.
   ★ '산지'라는 딱지 하나로는 부족하다. 은 사다리에서 포토시(0.44)와 놈브레데디오스(0.74)가
     둘 다 '산지'인데 화면 값은 277과 356으로 30% 차이난다. 여섯 항구가 같은 딱지를 달고 있으면
     이 게임에서 가장 공들인 사다리가 안 보이고, 실제로 테스터가 "사다리가 거꾸로 읽힌다"고 적어 왔다.
     순위는 플레이어가 실제로 알고 싶은 것을 그대로 답한다 — **여기가 몇 번째로 싼가.** */
export function tagRank(cityId, goodId) {
  const side = marketTag(cityId, goodId);
  if (!side) return null;
  const rid = regionOf(cityId);
  const val = (c) => (side === 'supply' ? c.supply[goodId] : c.demand[goodId]);
  const peers = CITIES.filter((c) => c.region === rid && marketTag(c.id, goodId) === side);
  // 산지는 쌀수록 앞, 수요지는 비쌀수록 앞
  peers.sort((a, b) => (side === 'supply' ? val(a) - val(b) : val(b) - val(a)));
  const i = peers.findIndex((c) => c.id === cityId);
  return i < 0 ? null : { side, rank: i + 1, of: peers.length };
}

/** 도시에서 그 품목이 산지인지 수요지인지 */
export function marketTag(cityId, goodId) {
  const c = CITY_BY_ID[cityId];
  if (c.supply[goodId]) return 'supply';
  if (c.demand[goodId]) return 'demand';
  return null;
}

/* ── 시장 깊이 ────────────────────────────────────────────────
   그 항구·품목에 최근 얼마나 밀어 넣었는지(압력)를 들고 있다가 단가를 불리하게 민다.
   방향과 무관하게 항상 불리한 쪽으로 작동한다 — 그래야 같은 항구에서 사고팔기를
   반복하는 무한 루프가 생기지 않는다. */
export function pressureOf(cityId, goodId) {
  return state.impact[cityId]?.[goodId] || 0;
}

/* 원양 항로가 닿는 항구 — 정기시가 서고 배후지 전체가 그 물량을 받는다. → data.js: MARKET.gateDepth */
const OCEAN_GATE = new Set(OCEAN_LANES.flatMap((l) => [l.a, l.b]));
export const isOceanGate = (cityId) => OCEAN_GATE.has(cityId);

/** n개를 한 번에 거래할 때의 평균 벌점 (0~cap) */
export function marketDepth(cityId) {
  let base = MARKET.depthPerSize * CITY_BY_ID[cityId].size;
  // 상관을 연 항구는 소화하는 물량이 는다 — 내 이름으로 사고파는 자리가 생겼기 때문이다
  if (hasHolding('factory', cityId)) base *= 1 + (HOLDINGS.factory.depthUp ?? 0);
  return OCEAN_GATE.has(cityId) ? Math.round(base * MARKET.gateDepth) : Math.round(base);
}

export function impactFactor(cityId, goodId, n = 0) {
  const p = pressureOf(cityId, goodId) + Math.max(0, n - 1) / 2;
  const raw = Math.min(MARKET.cap, (MARKET.impact * p) / marketDepth(cityId));
  // 부관이 물량을 나눠 넘기고, 경강상인은 나눠 넘길 자리를 안다
  return raw * (1 - Math.min(0.75, officerPerk('impactOff') + originPerk('impactOff')));
}

export function addPressure(cityId, goodId, n) {
  const c = (state.impact[cityId] ||= {});
  c[goodId] = (c[goodId] || 0) + n;
}

/** n개 매입 총액 / 매각 총액 — 수량이 늘수록 불리해진다 */
export function costFor(goodId, n, cityId = state.at) {
  if (n <= 0) return 0;
  return Math.round(state.prices[cityId][goodId] * n * (1 + impactFactor(cityId, goodId, n)));
}
export function gainFor(goodId, n, cityId = state.at) {
  if (n <= 0) return 0;
  return Math.round(state.prices[cityId][goodId] * n * (1 - impactFactor(cityId, goodId, n)));
}

/* ── 거래 ─────────────────────────────────────────────────── */
export function buy(goodId, qty) {
  const room = Math.min(qty, cargoFree());
  if (cargoFree() <= 0) return { ok: false, reason: '화물칸이 가득 찼다' };
  // 단가가 수량에 따라 움직이므로 "살 수 있는 최대"를 이분 탐색으로 찾는다.
  // 실패시키지 않고 가능한 만큼 사는 것이 기존 UX다.
  let lo = 0, hi = room;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (costFor(goodId, mid) <= state.gold) lo = mid; else hi = mid - 1;
  }
  const max = lo;
  if (max <= 0) return { ok: false, reason: '금화가 모자란다' };

  const cost = costFor(goodId, max);
  const had = state.cargo[goodId] || 0;
  const prevAvg = state.buyPrice[goodId] || 0;
  state.cargo[goodId] = had + max;
  state.buyPrice[goodId] = Math.round((prevAvg * had + cost) / (had + max));
  state.gold -= cost;
  book('outgo', 'goods', cost);
  addPressure(state.at, goodId, max);
  return { ok: true, qty: max, cost, unit: Math.round(cost / max), base: state.prices[state.at][goodId] };
}

/** 그 항구가 매기는 입항세 — 부관 특전을 **빼기 전**의 값.
    항구의 성질을 적는 자리(대시보드 표·근거 검증)는 반드시 이쪽을 쓴다.
    `tariffRate()`를 쓰면 부관이 탔는지에 따라 같은 항구가 6.0%도 되고 3.9%도 된다. */
export function baseTariff(cityId = state.at) {
  const size = CITY_BY_ID[cityId]?.size;
  return CITY_TARIFF[cityId] ?? TARIFF[size] ?? 0.045;
}

/** 지금 우리가 실제로 무는 입항세율 — 부관이 서류를 갖추면 덜 뗀다 */
export function tariffRate(cityId = state.at) {
  /* 부관이 깎고, **문서와 밀수가 또 깎는다.** 셋은 곱이 아니라 합으로 두되 바닥을 둔다 —
     감합·카르타스를 쥐고 밀수업자까지 끼면 세가 0이 되어 제도가 사라지기 때문이다.
     제도는 피해 갈 수 있어야 하지만 **없어지면 안 된다**(그것이 이 세계의 이야기다). */
  const off = officerPerk('tariffOff') + originPerk('tariffOff', cityId) + boonTariffOff(cityId);
  /* 악명은 **깎는 것들과 반대 방향**으로 붙는다 — 문서를 쥐고도 털고 다니면 그 문서가 무색해진다. */
  const rate = baseTariff(cityId) * Math.max(BOON.tariffFloor, 1 - off) * (1 + infamyTariffUp(cityId));
  /* 상관은 **비율이 아니라 자릿수**를 깎는다(−1.5%p) — 제 이름으로 통관하기 때문이다.
     그래도 바닥(1%)은 있다. 제도는 피해 갈 수 있되 없어지지 않는다. */
  /* 부두를 넓힌 항구는 세가 조금 오른다 — 늘어난 것을 관이 안 볼 리 없다(등급당 +0.5%p) */
  const yardUp = yardBoost(cityId) * YARD.tariffPerBoost;
  if (!hasHolding('factory', cityId)) return rate + yardUp;
  return Math.max(HOLDING.tariffFloorPt, rate - (HOLDINGS.factory.tariffCut ?? 0)) + yardUp;
}

/** 문서(permit)와 밀수(smuggle)가 깎아 주는 몫 — 기한이 지난 것은 안 센다. */
export function boonTariffOff(cityId = state.at) {
  const b = state.boons ?? {};
  let off = 0;
  const rid = REGION_OF_CITY[cityId];
  if (rid && (b.permit?.[rid] ?? 0) > state.day) off += BOON.permitTariffOff;
  if ((b.smuggle?.[cityId] ?? 0) > state.day) off += BOON.smuggleTariffOff;
  return off;
}

/* ── 거점 (A-1) ────────────────────────────────────────────────
   후반에 금화가 갈 곳. **자산이면서 고정비**라, 사고 나면 더 벌어야 지킬 수 있다. */

/** 이 항구에 그 거점이 있나 */
export const hasHolding = (kind, cityId = state.at) => !!state.holdings?.[cityId]?.[kind];

/** 그 거점의 값 — 도시 규모(또는 공업력)에 따라 다르다 */
export function holdingPrice(kind, cityId = state.at) {
  const h = HOLDINGS[kind];
  const c = CITY_BY_ID[cityId];
  if (!h || !c) return Infinity;
  if (h.priceByIndustry != null) return h.priceBase + industryOf(cityId) * h.priceByIndustry;
  return h.priceBase + (c.size ?? 1) * (h.priceBySize ?? 0);
}

/** 살 수 있나 — 앞 단계가 있어야 하는 것들이 있다(창고 없이 상관을 열 수 없다) */
export function canBuyHolding(kind, cityId = state.at) {
  const h = HOLDINGS[kind];
  if (!h) return { ok: false, reason: '그런 거점은 없다' };
  if (hasHolding(kind, cityId)) return { ok: false, reason: '이미 있다' };
  if (h.requires && !hasHolding(h.requires, cityId)) {
    const need = HOLDINGS[h.requires].name;
    return { ok: false, reason: `${need}${josa(need, '이/가')} 먼저다` };
  }
  if (kind === 'dock' && industryOf(cityId) >= HOLDING.industryCap) {
    return { ok: false, reason: `이 항구는 이미 공업력 ${HOLDING.industryCap}이다` };
  }
  const price = holdingPrice(kind, cityId);
  if (price > state.gold) return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  return { ok: true, price };
}

export function buyHolding(kind, cityId = state.at) {
  const r = canBuyHolding(kind, cityId);
  if (!r.ok) return r;
  state.gold -= r.price;
  book('outgo', 'ships', r.price);
  const m = (state.holdings[cityId] ??= { paid: state.day, spent: 0 });
  m[kind] = true;
  m.spent = (m.spent ?? 0) + r.price;      // 유지비는 **들인 돈 전체**에 붙는다
  pushLog(`${CITY_BY_ID[cityId].name}에 ${HOLDINGS[kind].name}${josa(HOLDINGS[kind].name, '을/를')} 두었다`
        + ` (−${r.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: r.price };
}

/** 이 항구에서 보관할 수 있는 칸 */
export function storeCap(cityId = state.at) {
  const m = state.holdings?.[cityId];
  if (!m) return 0;
  let cap = 0;
  for (const k of HOLDING_KEYS) if (m[k]) cap = Math.max(cap, HOLDINGS[k].store ?? 0);
  return cap;
}

export const storedUsed = (cityId = state.at) =>
  Object.values(state.stored?.[cityId] ?? {}).reduce((a, b) => a + b, 0);

/** 배에서 창고로 — **여기 둔 짐은 시장을 누르지 않는다**(`impact` 누적 없음) */
export function storeGoods(goodId, qty, cityId = state.at) {
  const have = state.cargo[goodId] || 0;
  const room = storeCap(cityId) - storedUsed(cityId);
  const n = Math.min(qty, have, room);
  if (n <= 0) return { ok: false, reason: room <= 0 ? '창고가 찼다' : '실은 것이 없다' };
  state.cargo[goodId] = have - n;
  if (!state.cargo[goodId]) delete state.cargo[goodId];
  const m = (state.stored[cityId] ??= {});
  m[goodId] = (m[goodId] || 0) + n;
  return { ok: true, n };
}

/** 창고에서 배로 */
export function takeGoods(goodId, qty, cityId = state.at) {
  const m = state.stored?.[cityId] ?? {};
  const have = m[goodId] || 0;
  const n = Math.min(qty, have, cargoFree());
  if (n <= 0) return { ok: false, reason: have <= 0 ? '창고에 없다' : '화물칸이 찼다' };
  m[goodId] = have - n;
  if (!m[goodId]) delete m[goodId];
  state.cargo[goodId] = (state.cargo[goodId] || 0) + n;
  return { ok: true, n };
}

/** 30일마다 무는 거점 유지비 — 못 내면 압류된다 */
export function holdingUpkeepDue(cityId) {
  const m = state.holdings?.[cityId];
  if (!m) return 0;
  const days = state.day - (m.paid ?? state.day);
  if (days < HOLDING.upkeepEvery) return 0;
  const periods = Math.floor(days / HOLDING.upkeepEvery);
  return Math.round((m.spent ?? 0) * HOLDING.upkeepRate * (HOLDING.upkeepEvery / 360) * periods);
}

/** 이 항구의 거점 유지비를 치른다(항구에 들어올 때). 못 내면 압류. */
export function settleHolding(cityId = state.at) {
  const m = state.holdings?.[cityId];
  if (!m) return null;
  const due = holdingUpkeepDue(cityId);
  if (due <= 0) return null;
  const paid = Math.min(state.gold, due);
  state.gold -= paid;
  if (paid) book('outgo', 'port', paid);
  m.paid = state.day;
  if (paid >= due) {
    pushLog(`${CITY_BY_ID[cityId].name} 거점 유지비 ${due.toLocaleString('ko-KR')}닢을 냈다.`, 'warn');
    return { due, paid, seized: false };
  }
  /* ★ 못 내면 **압류**다. 거점은 자산이면서 고정비라, 후반이 "그냥 부자"가 아니라
     "더 벌지 않으면 지킬 수 없는" 구조가 된다. 짐도 함께 넘어간다. */
  delete state.holdings[cityId];
  const lostGoods = state.stored?.[cityId];
  if (lostGoods) delete state.stored[cityId];
  pushLog(`${CITY_BY_ID[cityId].name} 거점을 유지비 ${(due - paid).toLocaleString('ko-KR')}닢 때문에 빼앗겼다.`
        + (lostGoods && Object.keys(lostGoods).length ? ' 창고에 둔 짐도 함께 넘어갔다.' : ''), 'bad');
  return { due, paid, seized: true };
}

/* ── 공업력 승급 (A-2) ─────────────────────────────────────────
   **자재를 실물로 실어 와야** 오른다. 그래서 승급은 돈 쓰는 일이 아니라 **항로를 짜는 일**이다. */

export const yardBoost = (cityId = state.at) => state.yards?.[cityId]?.boost ?? 0;
export const yardBuilding = (cityId = state.at) => state.yards?.[cityId]?.building ?? null;

/** 공사 중인가 — 그동안 그 부두는 제 일을 못 한다(신조·중고 0) */
export function yardBusy(cityId = state.at) {
  const b = yardBuilding(cityId);
  return !!b && state.day < b.until;
}

/** 다음 등급과 그 값 — 더 올릴 수 없으면 null */
export function yardNext(cityId = state.at) {
  const to = industryOf(cityId) + 1;
  if (to > YARD.cap) return null;
  const spec = YARD_UPGRADE[to];
  if (!spec) return null;
  return { to, ...spec };
}

/** 승급을 걸 수 있나 — 금화와 **실은 자재**를 함께 본다 */
export function canUpgradeYard(cityId = state.at) {
  if (yardBusy(cityId)) {
    const b = yardBuilding(cityId);
    return { ok: false, reason: `공사 중이다 — ${b.until - state.day}일 남았다` };
  }
  const n = yardNext(cityId);
  if (!n) return { ok: false, reason: `이 항구는 이미 꼭대기다 (공업력 ${industryOf(cityId)})` };
  if (n.gold > state.gold) {
    return { ok: false, reason: `금화가 ${(n.gold - state.gold).toLocaleString('ko-KR')}닢 모자란다`, need: n };
  }
  for (const [gid, qty] of Object.entries(n.mats)) {
    const have = (state.cargo[gid] || 0) + ((state.stored?.[cityId] ?? {})[gid] || 0);
    if (have < qty) {
      return { ok: false, need: n,
               reason: `${GOOD_BY_ID[gid]?.name ?? gid}${josa(GOOD_BY_ID[gid]?.name ?? gid, '이/가')} ${qty - have}칸 모자란다` };
    }
  }
  return { ok: true, need: n };
}

/** 자재를 붓고 공사를 건다 — 배에 실은 것을 먼저, 모자라면 창고에서 */
export function upgradeYard(cityId = state.at) {
  const r = canUpgradeYard(cityId);
  if (!r.ok) return r;
  const n = r.need;
  state.gold -= n.gold;
  book('outgo', 'ships', n.gold);
  for (const [gid, qty] of Object.entries(n.mats)) {
    let left = qty;
    const fromShip = Math.min(left, state.cargo[gid] || 0);
    if (fromShip) {
      state.cargo[gid] -= fromShip;
      if (!state.cargo[gid]) { delete state.cargo[gid]; delete state.buyPrice[gid]; }
      left -= fromShip;
    }
    const box = state.stored?.[cityId];
    if (left > 0 && box) {
      const fromStore = Math.min(left, box[gid] || 0);
      box[gid] -= fromStore;
      if (!box[gid]) delete box[gid];
      left -= fromStore;
    }
  }
  const y = (state.yards[cityId] ??= { boost: 0, building: null });
  y.building = { to: n.to, until: state.day + n.days, started: state.day };
  pushLog(`${CITY_BY_ID[cityId].name} 부두를 넓히기 시작했다 — 공업력 ${n.to}까지 ${n.days}일.`, 'good');
  return { ok: true, until: y.building.until, to: n.to };
}

/** 공사가 끝났으면 등급을 올린다 — 그 항구에 들어올 때 본다 */
export function settleYard(cityId = state.at) {
  const y = state.yards?.[cityId];
  const b = y?.building;
  if (!b || state.day < b.until) return null;
  y.boost = (y.boost ?? 0) + 1;
  y.building = null;
  pushLog(`${CITY_BY_ID[cityId].name} 부두가 넓어졌다 — 공업력 ${industryOf(cityId)}.`, 'good');
  return { to: b.to, industry: industryOf(cityId) };
}

/** 승급이 만든 하루 유지비 — 정박·항해 어느 쪽이든 그 항구를 가진 값이다 */
export function yardUpkeepPerDay() {
  let sum = 0;
  for (const cityId of Object.keys(state.yards ?? {})) {
    sum += (state.yards[cityId].boost ?? 0) * YARD.upkeepPerBoost;
  }
  return sum;
}

/* ── 끝 ────────────────────────────────────────────────────────
   조건은 `data.js: ENDING`. **진행률을 화면에 보여 주는 것이 절반**이다 —
   무엇을 해야 끝나는지 모르면 그것은 목표가 아니라 우연이다. */
export function endingProgress() {
  const yards = Object.entries(ENDING.yards).map(([cityId, need]) => ({
    cityId, name: CITY_BY_ID[cityId]?.name ?? cityId,
    now: industryOf(cityId), need, done: industryOf(cityId) >= need,
  }));
  const joseon = CITIES.filter((c) => c.flag === ENDING.flag);
  const held = joseon.filter((c) => !!state.holdings?.[c.id]);
  const shipDone = state.everOwned?.has?.(ENDING.ship) ?? false;

  const steps = [
    { key: 'yards', label: '두 부두를 공업력 3으로',
      now: yards.filter((y) => y.done).length, need: yards.length,
      detail: yards.map((y) => `${y.name} ${y.now}/${y.need}`).join(' · ') },
    { key: 'holdings', label: '조선 항구에 거점을',
      now: held.length, need: ENDING.holdingsNeeded,
      detail: held.length ? held.map((c) => c.name).join(' · ') : '아직 없다' },
    { key: 'ship', label: `${SHIPS[ENDING.ship]?.name ?? ENDING.ship}을 짓는다`,
      now: shipDone ? 1 : 0, need: 1,
      detail: shipDone ? '진수했다' : `${CITY_BY_ID[(SHIPS[ENDING.ship]?.yards ?? [])[0]]?.name ?? '?'}에서만 나온다` },
  ];
  const done = steps.every((st) => st.now >= st.need);
  return { steps, done };
}

/** 한 번만 축하한다 — 이미 본 끝을 다시 띄우지 않는다 */
export function markEnded() {
  if (state.ended) return false;
  state.ended = state.day;
  return true;
}

/* ── 악명 규칙 ────────────────────────────────────────────── */
/** 그 깃발에 쌓인 악명 */
export const infamyOf = (flag) => (flag ? (state.infamy?.[flag] ?? 0) : 0);

/** 날이 지나면 잊힌다 — 부른 날수만큼 삭힌다 */
export function decayInfamy(days = 1) {
  const m = state.infamy;
  if (!m) return;
  state._infamyAge = (state._infamyAge ?? 0) + days;
  while (state._infamyAge >= INFAMY.decayDays) {
    state._infamyAge -= INFAMY.decayDays;
    for (const k of Object.keys(m)) {
      m[k] -= 1;
      if (m[k] <= 0) delete m[k];
    }
  }
}

/** 상선을 덮쳤다 — 그 배가 단 깃발에 악명이 쌓인다 */
export function addInfamy(flag, n = 1) {
  if (!flag) return 0;
  const m = (state.infamy ??= {});
  m[flag] = Math.min(INFAMY.cap, (m[flag] ?? 0) + n);
  return m[flag];
}

/** 이 항구에서 내 악명이 얼마나 무겁게 읽히나 — 그 도시의 깃발 기준 */
export function infamyHere(cityId = state.at) {
  return infamyOf(CITY_BY_ID[cityId]?.flag);
}

/** 악명이 만든 세금 가산(비율) — 문서·부관이 깎는 것과 반대 방향으로 붙는다 */
export const infamyTariffUp = (cityId = state.at) =>
  Math.min(INFAMY.tariffCap, infamyHere(cityId) * INFAMY.tariffPer);

/** 악명이 만든 조우 가산 — 그 세력이 나를 찾아다닌다 */
export function infamyOdds(from = state.at, to = null) {
  const flags = new Set([CITY_BY_ID[from]?.flag, to ? CITY_BY_ID[to]?.flag : null].filter(Boolean));
  let worst = 0;
  for (const f of flags) worst = Math.max(worst, infamyOf(f));
  return Math.min(INFAMY.oddsCap, worst * INFAMY.oddsPer);
}

/** 지금 이 항구에서 누리고 있는 혜택 — 화면이 "무엇이 걸려 있나"를 보여줄 때 쓴다 */
export function activeBoons(cityId = state.at) {
  const b = state.boons ?? {};
  const out = [];
  const rid = REGION_OF_CITY[cityId];
  if (rid && (b.permit?.[rid] ?? 0) > state.day) {
    out.push({ kind: 'permit', text: `이 바다의 문서 (세 −${Math.round(BOON.permitTariffOff * 100)}%)`,
               until: b.permit[rid] });
  }
  if ((b.smuggle?.[cityId] ?? 0) > state.day) {
    out.push({ kind: 'smuggle', text: `세관을 피하는 길 (세 −${Math.round(BOON.smuggleTariffOff * 100)}%)`,
               until: b.smuggle[cityId] });
  }
  if ((b.repair?.[cityId] ?? 0) > state.day) {
    out.push({ kind: 'repair', text: `수리 −${Math.round(BOON.repairOff * 100)}%`, until: b.repair[cityId] });
  }
  if (b.loan) out.push({ kind: 'loan', text: `빚 ${b.loan.owed.toLocaleString('ko-KR')}닢`, until: b.loan.due });
  return out;
}

/* ── 인물에게 무언가를 산다 ────────────────────────────────
   명부의 `service` 여덟 갈래를 규칙에 붙인다. **값을 받고 그 자리에서 효과가 생긴다.**
   정보형(price-tip·route-tip)은 상태를 안 바꾸고 화면에 줄 재료만 돌려준다 —
   "무엇을 알려 주었나"를 화면이 그려야 하기 때문이다. */
export function figureFee(f) {
  if (!f?.fee) return 0;
  const [lo, hi] = f.fee;
  // 값이 사람마다 정해져 있되 그날그날 조금 다르다 — 같은 사람에게 같은 날은 같은 값
  const r = ((state.day * 2654435761) % 1000) / 1000;
  // 갈래에 따라 같은 문서가 더 비싸다 — 상인은 관 앞에서 값을 더 치른다(`permitUp`)
  return Math.round((lo + (hi - lo) * r) * (1 + originPerk('permitUp')));
}

export function buyService(f, cityId = state.at) {
  const fee = figureFee(f);
  if (fee > state.gold) return { ok: false, reason: `금화가 ${(fee - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  const b = (state.boons ??= { permit: {}, smuggle: {}, repair: {}, reroll: {}, loan: null });
  const rid = REGION_OF_CITY[cityId];
  const pay = () => { state.gold -= fee; if (fee) book('outgo', 'port', fee); };

  switch (f.service) {
    case 'permit': {
      if ((b.permit[rid] ?? 0) > state.day) return { ok: false, reason: '이미 이 바다의 문서를 갖고 있다' };
      pay();
      b.permit[rid] = state.day + BOON.permitDays;
      return { ok: true, fee, kind: 'permit',
               line: `${BOON.permitDays}일 동안 이 바다에서 세를 ${Math.round(BOON.permitTariffOff * 100)}% 덜 문다.` };
    }
    case 'smuggle': {
      if ((b.smuggle[cityId] ?? 0) > state.day) return { ok: false, reason: '이 항구에서는 이미 길이 나 있다' };
      pay();
      b.smuggle[cityId] = state.day + BOON.smuggleDays;
      return { ok: true, fee, kind: 'smuggle',
               line: `${BOON.smuggleDays}일 동안 이 항구에서 세를 ${Math.round(BOON.smuggleTariffOff * 100)}% 덜 문다. 들키면 그때 일이다.` };
    }
    case 'repair': {
      if ((b.repair[cityId] ?? 0) > state.day) return { ok: false, reason: '이미 말을 넣어 두었다' };
      pay();
      b.repair[cityId] = state.day + BOON.repairDays;
      return { ok: true, fee, kind: 'repair',
               line: `${BOON.repairDays}일 동안 이 부두의 수리값을 ${Math.round(BOON.repairOff * 100)}% 깎아 준다.` };
    }
    case 'loan': {
      if (b.loan) return { ok: false, reason: `아직 갚을 것이 있다 (${b.loan.owed.toLocaleString('ko-KR')}닢)` };
      const principal = Math.max(BOON.loanMin, Math.round(fee * BOON.loanMul));
      state.gold += principal;
      book('income', 'contracts', principal);
      b.loan = { principal, owed: Math.round(principal * BOON.loanRate), due: state.day + BOON.loanDays };
      return { ok: true, fee: 0, kind: 'loan',
               line: `${principal.toLocaleString('ko-KR')}닢을 빌렸다. ${BOON.loanDays}일 뒤 `
                   + `${b.loan.owed.toLocaleString('ko-KR')}닢으로 갚는다 — 급여일에 함께 걷는다.` };
    }
    case 'contract': {
      pay();
      b.reroll[cityId] = (b.reroll[cityId] ?? 0) + 1;
      return { ok: true, fee, kind: 'contract', line: '다른 일감을 물어다 주었다. 게시판을 다시 보라.' };
    }
    case 'recruit': {
      pay();
      const n = BOON.recruitCrew;
      const room = Math.max(0, state.crewMax - state.crew);
      const took = Math.min(n, room);
      state.crew += took;
      return { ok: true, fee, kind: 'recruit',
               line: took ? `${took}명을 갑판에 올렸다. 계약금은 이 값에 포함이다.` : '갑판에 자리가 없다. 값만 치렀다.' };
    }
    case 'price-tip': {
      pay();
      return { ok: true, fee, kind: 'price-tip', tips: priceTips(cityId) };
    }
    case 'route-tip': {
      pay();
      return { ok: true, fee, kind: 'route-tip', tips: routeTips(cityId) };
    }
    default:
      return { ok: false, reason: '이 사람은 파는 것이 없다' };
  }
}

/** 먼 항구 시세 — 여기서 실을 만한 것이 어디서 비싼가. 정보상이 파는 것이 이것이다. */
export function priceTips(cityId = state.at, limit = 4) {
  const here = CITY_BY_ID[cityId];
  const out = [];
  const cands = neighborsOf(cityId).flatMap((n) => [n, ...neighborsOf(n)]);
  const seen = new Set([cityId]);
  for (const to of cands) {
    if (seen.has(to) || !CITY_BY_ID[to]) continue;
    seen.add(to);
    for (const gid of Object.keys(here.supply ?? {})) {
      const buyAt = priceOf(cityId, gid);
      const sellAt = priceOf(to, gid);
      if (sellAt > buyAt * 1.15) {
        out.push({ to, toName: CITY_BY_ID[to].name, gid, goodName: GOOD_BY_ID[gid]?.name ?? gid,
                   buyAt: Math.round(buyAt), sellAt: Math.round(sellAt),
                   gain: Math.round((sellAt / buyAt - 1) * 100), days: voyageDays(cityId, to) });
      }
    }
  }
  return out.sort((a, b) => b.gain - a.gain).slice(0, limit);
}

/** 항로의 위험 — 어느 구간이 험한가. 이 값은 조우 안내가 쓰는 것과 같은 식이다. */
export function routeTips(cityId = state.at, limit = 5) {
  return neighborsOf(cityId).map((to) => ({
    to, toName: CITY_BY_ID[to].name, days: voyageDays(cityId, to),
    risk: routeRisk(cityId, to), odds: encounterOdds({ from: cityId, to }),
  })).sort((a, b) => b.odds - a.odds).slice(0, limit);
}

export function sell(goodId, qty) {
  const have = state.cargo[goodId] || 0;
  const max = Math.min(qty, have);
  if (max <= 0) return { ok: false, reason: '팔 물건이 없다' };
  const raw = gainFor(goodId, max);
  const tariff = Math.round(raw * tariffRate());
  const gain = raw - tariff;
  const cost = (state.buyPrice[goodId] || 0) * max;
  state.cargo[goodId] = have - max;
  if (state.cargo[goodId] === 0) { delete state.cargo[goodId]; delete state.buyPrice[goodId]; }
  state.gold += gain;

  // 부관의 성과급 — 이 인물의 값은 여기서, 오직 남은 이익에서만 나간다.
  // 밑진 거래에서는 떼지 않는다(손해에 수수료까지 물면 되팔기가 아예 막힌다).
  const profit = gain - cost;
  let cut = 0;
  if (profit > 0 && state.officer) {
    cut = Math.round(profit * OFFICER.cut);
    state.gold -= cut;
    state.officer.earned += cut;
  }
  state.stats.profit += profit - cut;
  /* 매출·관세·성과급은 한 거래에서 세 갈래로 갈린다 — 장부에도 셋으로 적는다.
     순이익 한 줄로 뭉치면 "관세로 얼마가 나갔나"를 정산 화면이 못 보여준다.

     ★ 매출은 **관세를 떼기 전(`raw`)**으로 적는다. `gain`은 이미 관세가 빠진 값이라
       그것을 적으면서 관세를 지출로 또 적으면 **관세가 두 번 잡힌다**
       (실제로 이 버그로 장부가 금고와 8닢 어긋났다 — tools/test-payroll.mjs ⑥이 잡았다). */
  book('income', 'sales', raw);
  book('outgo', 'tariff', tariff);
  book('outgo', 'officer', cut);
  addPressure(state.at, goodId, max);
  return {
    ok: true, qty: max, gain, tariff, cut, unit: Math.round(gain / max),
    base: state.prices[state.at][goodId], profit: profit - cut,
  };
}

/* ── 대형 주문 ────────────────────────────────────────────────
   항구마다 상관이 내건 큰 계약이 하나 걸려 있다(사흘마다 갈린다). 화물은 직접
   조달해야 하지만 성사되면 시세보다 후하게 받는다 — 한 건으로 다음 배에 다가서는 길. */
function hash(...parts) {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

/** 그 항구에 지금 걸려 있는 주문 (결정론적 — 드나들며 새로 뽑을 수 없다) */
export function contractOffer(cityId = state.at, day = state.day) {
  /* 사흘마다 갈리는 것이 기본이고, **중개인에게 값을 치르면 한 칸 앞당겨 다른 일감을 본다**
     (`boons.reroll`). 드나들며 새로 뽑을 수는 없다는 규칙은 그대로다 — 값을 낸 만큼만 바뀐다. */
  const slot = Math.floor(day / 3) + (state.boons?.reroll?.[cityId] ?? 0);
  const nb = neighborsOf(cityId);
  // 2홉까지 목적지 후보 (먼 곳일수록 보수가 크다)
  const far = new Set();
  for (const n of nb) for (const m of neighborsOf(n)) if (m !== cityId) far.add(m);
  const dests = [...new Set([...nb, ...far])];
  if (!dests.length) return null;

  const r1 = hash(cityId, slot, 'dest');
  const to = dests[Math.floor(r1 * dests.length)];
  const wants = Object.keys(CITY_BY_ID[to].demand);
  const goods = wants.length ? wants : GOODS.map((g) => g.id);
  const goodId = goods[Math.floor(hash(cityId, slot, 'good') * goods.length)];

  const [pl, ph] = CONTRACT.payMul;
  const mul = pl + hash(cityId, slot, 'pay') * (ph - pl);
  const unit = priceOf(to, goodId);

  // 보수를 먼저 정하고 수량을 역산한다 — 품목이 비싸다고 계약이 통째로 커지지 않게.
  const [vl, vh] = CONTRACT.value;
  const scale = 0.6 + CITY_BY_ID[cityId].size * 0.28;          // 큰 항구일수록 큰 일감
  const target = (vl + hash(cityId, slot, 'val') * (vh - vl)) * scale;
  const [ql, qh] = CONTRACT.qty;
  const qty = Math.max(ql, Math.min(qh, Math.round(target / Math.max(1, unit * mul))));
  // 부관이 계약서를 짚으면 보수가 오른다 (수량은 그대로 — 규모가 아니라 조건을 고치는 것이다)
  const pay = Math.round(unit * qty * mul * (1 + officerPerk('contractUp') + originPerk('contractUp', cityId)));

  const legs = Math.max(1, voyageDays(cityId, to, day));
  const [dl, dh] = CONTRACT.daysPad;
  const due = day + Math.round(legs * 1.6) + Math.round(dl + hash(cityId, slot, 'due') * (dh - dl));

  return {
    from: cityId, to, goodId, qty, pay, due,
    advance: Math.round(pay * CONTRACT.advance),
    id: `${cityId}:${slot}`,
  };
}

export function acceptContract() {
  if (state.contract) return { ok: false, reason: '이미 맡은 주문이 있다' };
  const c = contractOffer();
  if (!c) return { ok: false, reason: '지금은 들어온 주문이 없다' };
  // 실을 수 없는 주문은 받지 못한다 — 큰 계약이 큰 배를 사는 이유가 된다
  if (c.qty > state.cargoCap) {
    return { ok: false, reason: `화물칸이 ${c.qty - state.cargoCap}칸 모자란다 (${c.qty}개를 실어야 한다)` };
  }
  state.contract = { ...c, taken: state.day };
  state.gold += c.advance;
  book('income', 'contracts', c.advance);
  return { ok: true, contract: state.contract };
}

/** 목적지에서 화물을 넘긴다 */
export function deliverContract() {
  const c = state.contract;
  if (!c) return { ok: false, reason: '맡은 주문이 없다' };
  if (c.to !== state.at) return { ok: false, reason: `${CITY_BY_ID[c.to].name}까지 가야 한다` };
  const have = state.cargo[c.goodId] || 0;
  if (have < c.qty) return { ok: false, reason: `${GOOD_BY_ID[c.goodId].name} ${c.qty - have}개가 모자란다` };

  state.cargo[c.goodId] = have - c.qty;
  if (state.cargo[c.goodId] === 0) { delete state.cargo[c.goodId]; delete state.buyPrice[c.goodId]; }
  const rest = c.pay - c.advance;
  state.gold += rest;
  state.stats.profit += rest;
  book('income', 'contracts', rest);
  state.contract = null;
  return { ok: true, paid: rest, total: c.pay };
}

export function abandonContract() {
  const c = state.contract;
  if (!c) return { ok: false, reason: '맡은 주문이 없다' };
  const fine = Math.round(c.advance * CONTRACT.penalty);
  const r = payFine(fine, `${CITY_BY_ID[c.to]?.name ?? c.to} 주문을 스스로 파기했다`);
  state.contract = null;
  /* ★ 파기만 항해일지에 안 남고 있었다 — 수주·납품·기한초과는 다 남는데.
     그러면 "금고가 왜 줄었나"를 화면에서 못 되짚는다(완주 플레이 ISSUES #9). */
  pushLog(`${CITY_BY_ID[c.to]?.name ?? c.to} 주문을 파기했다. 위약금 ${fine.toLocaleString('ko-KR')}닢.`
        + (r.owed ? ` ${r.owed.toLocaleString('ko-KR')}닢은 빚으로 남았다.` : ''), 'bad');
  return { ok: true, fine, owed: r.owed };
}

/* ── 못 낸 돈은 사라지지 않는다 ────────────────────────────────
   ★ 위약금·보급비가 **금고에만 걸리고 `Math.max(0, …)`로 잘려** 있었다.
   그래서 선금을 화물로 바꿔 두고 파기하면 **실제 손실이 금고 잔액뿐**이었다 —
   선금 915닢을 비단으로 바꿔 둔 판에서 위약금 1,144닢이 청구됐는데 466닢만 물고 끝났고,
   그 비단을 팔아 곧바로 1,943닢이 됐다(완주 플레이 ISSUES #8).
   *"선금만 받고 파기하는 것이 순이득"*이 되면 계약이 함정이 아니라 공짜 돈이 된다.

   그래서 **못 낸 몫을 빚으로 넘긴다.** 빚은 급여일에 선원보다 먼저 걷히고(`settlePayroll`),
   못 갚으면 이자가 붙는다 — 인물에게 빌린 돈과 같은 자리를 쓴다. 가난이 **결과**를 갖게 하는 것이
   이 함수의 목적이다(ISSUES #4·#13이 같은 뿌리다). */
export function payFine(amount, why = '', { ledger = true } = {}) {
  const paid = Math.min(state.gold, amount);
  state.gold -= paid;
  /* 장부를 여기서 적을지는 부르는 쪽이 정한다 — 항해비처럼 **갈래가 여럿인 지출**은
     호출부가 갈래별로 적는다(안 그러면 `port` 한 줄과 갈래 줄이 겹쳐 두 번 적힌다). */
  if (paid && ledger) book('outgo', 'port', paid);
  const owed = amount - paid;
  if (owed <= 0) return { paid, owed: 0 };

  const b = (state.boons ??= { permit: {}, smuggle: {}, repair: {}, reroll: {}, loan: null });
  if (b.loan) {
    b.loan.owed += owed;                       // 이미 빚이 있으면 얹는다
  } else {
    b.loan = { principal: owed, owed: Math.round(owed * BOON.loanRate),
               due: state.day + BOON.loanDays, forced: true, why };
  }
  return { paid, owed };
}

/** 기한이 지났는지 — advanceDays가 부른다.
    ★ 예전에는 `{ expired: c, fine }`를 돌려주었는데, 부르는 쪽(`advanceDays`)이
      그것을 다시 `expired`라는 이름으로 감싸 **두 겹**이 됐다. 그래서 화면이
      `cost.expired.to`를 읽으면 undefined이고, **기한을 넘겨 입항하는 순간 게임이 통째로 죽었다**
      (`Cannot read properties of undefined (reading 'name')` — 지중해 테스터가 실제로 두 번 겪었고,
      세이브가 없어 그 판이 끝났다). 계약 객체에 `fine`만 얹어 **한 겹으로** 돌려준다. */
function checkContractDue() {
  const c = state.contract;
  if (!c || state.day <= c.due) return null;
  const fine = Math.round(c.advance * CONTRACT.penalty);
  state.gold = Math.max(0, state.gold - fine);
  state.contract = null;
  return { ...c, fine };
}

/* ── 부관 ─────────────────────────────────────────────────────
   한 명뿐이다(data.js: OFFICER). 배처럼 여러 척 굴리는 것이 아니라 데리고 있거나 없거나다.

   효과는 전부 **기존 파생 함수에 계수로 곱해** 넣는다 — 새 계산 경로를 파면 부관이 붙었을 때와
   아닐 때의 값이 두 갈래로 갈려 어느 쪽이 정답인지 알 수 없게 된다.
   대가(성과급)는 `sell()` 한 곳에서만 뗀다. */
export function hasOfficer() {
  return !!state.officer;
}

/** 부관이 있으면 그 계수, 없으면 0 — 호출하는 쪽은 부관 유무를 몰라도 된다 */
export function officerPerk(key) {
  return state.officer ? (OFFICER.perks[key] || 0) : 0;
}

/* ── 출신 갈래의 특전 ──────────────────────────────────────
   `data.js: ORIGINS`의 다섯 갈래. 부관 특전과 **같은 자리에서 더해진다** —
   읽는 쪽은 `officerPerk(k) + originPerk(k)` 꼴로 쓴다.
   ★ `joseonOnly`가 붙은 갈래의 특전은 **조선 항구에서만** 돈다. 종친의 첩지를 명 시박사가
     알아줄 이유가 없다 — "제도는 바다마다 다르다"가 이 게임의 뼈대이므로 특전도 그것을 따른다. */
export function originPerk(key, cityId = state.at) {
  const o = ORIGIN_BY_ID[state.origin ?? DEFAULT_ORIGIN];
  if (!o) return 0;
  const v = o.perks?.[key] ?? 0;
  if (!v) return 0;
  if (o.perks?.joseonOnly) {
    const c = CITY_BY_ID[cityId];
    if (!c || c.flag !== 'joseon') return 0;
  }
  return v;
}

/** 선원 하나를 태우는 값 — 갈래에 따라 오른다(양수가 벌점) */
export function hireUnit() {
  return Math.max(1, Math.round(HIRE_UNIT * (1 + originPerk('hireUp'))));
}

/** 지금 고른 갈래 — 화면이 "누구로 시작했나"를 보여줄 때 */
export const originOf = () => ORIGIN_BY_ID[state.origin ?? DEFAULT_ORIGIN] ?? null;

/** 처음부터 승선해 있는 상태 — `resetGame()`이 이걸로 시작한다.
    등용/해고 함수는 없다. 만나는 장면도 헤어지는 장면도 없기 때문이다. */
export function initialOfficer() {
  return { hiredDay: 0, earned: 0, paid: 0 };
}

/** 이 항구의 수리 단가 — 선장인에게 말을 넣어 두었으면 깎인다 */
export function repairUnit(cityId = state.at) {
  const off = ((state.boons?.repair?.[cityId] ?? 0) > state.day ? BOON.repairOff : 0)
            + originPerk('repairCut', cityId)        // 좌수영의 손은 제 배를 싸게 고친다
            + (hasHolding('slipway', cityId) ? (HOLDINGS.slipway.repairCut ?? 0) : 0);
  return Math.max(1, Math.round(REPAIR_UNIT * (1 - Math.min(0.7, off))));
}

export function repair(amount) {
  const need = Math.min(amount, state.maxHp - state.hp);
  const cost = need * repairUnit();
  if (need <= 0) return { ok: false, reason: '선체는 멀쩡하다' };
  if (cost > state.gold) return { ok: false, reason: '금화가 모자란다' };
  state.gold -= cost;
  state.hp += need;
  book('outgo', 'port', cost);
  return { ok: true, need, cost };
}

export function hire(n) {
  const room = state.crewMax - state.crew;
  /* 갈래에 따라 삯이 다르다 — 종친의 배에 오르는 것은 **기록에 남는 일**이라
     사람이 값을 더 부른다(`ORIGINS.royal.perks.hireUp`). */
  const unit = hireUnit();
  const max = Math.min(n, room, Math.floor(state.gold / unit));
  if (max <= 0) return { ok: false, reason: room <= 0 ? '선실이 가득 찼다' : '금화가 모자란다' };
  state.gold -= max * unit;
  state.crew += max;
  book('outgo', 'port', max * HIRE_UNIT);
  // 부두에서 급히 긁어모은 인력에는 이름이 없다. 일당은 표준값으로 친다 —
  // 값을 두 배로 치르는 대신 고르지 않는 것이 이 경로의 성격이다.
  state.bands.push({ n: max, trait: 'steady', wage: CREW_WAGE, name: '부두 인부', from: state.at, day: state.day, unrest: 0 });
  return { ok: true, n: max, cost: max * HIRE_UNIT };
}

/* ── 술집 ─────────────────────────────────────────────────────
   선원을 모으는 자리. 부두 고용(`hire`)이 "값을 두 배로 치르고 아무나 긁어모으는" 길이라면
   이쪽은 **고르는** 길이다 — 자리마다 인원·기질·계약금·요구 일당이 다르다.

   매물(`usedListings`)·계약(`contractOffer`)과 같은 결정론 규칙을 쓴다:
   항구를 나갔다 들어와도 같은 사람이 앉아 있어야 한다(재입장 스캠 방지).
   사람은 이틀마다 갈린다 — 배보다 빠르고 시세와도 리듬이 다르다. */

/** 기질을 weight에 비례해 하나 뽑는다. */
function pickTrait(r) {
  const total = CREW_TRAIT_KEYS.reduce((a, k) => a + CREW_TRAITS[k].weight, 0);
  let t = r * total;
  for (const k of CREW_TRAIT_KEYS) {
    t -= CREW_TRAITS[k].weight;
    if (t <= 0) return k;
  }
  return 'steady';
}

/** 그 항구 술집에 지금 앉아 있는 무리들. 화면과 규칙이 같은 목록을 본다. */
export function tavernCrews(cityId = state.at, day = state.day) {
  const city = CITY_BY_ID[cityId];
  if (!city) return [];

  const cyc = Math.floor(day / TAVERN.cycle);
  // 큰 항구일수록 사람이 많다. size 1→2자리, 3→4자리가 기본이고 여기서 빈 자리가 빠진다.
  const slots = Math.min(TAVERN.slots[1], TAVERN.slots[0] + (city.size - 1));
  // 나포선 경매항(튀니스·알제·몰타)에는 거친 자들이 더 모인다 — 그 도시의 성격이
  // 시장·조선소만이 아니라 **사람**에서도 드러나야 한다.
  const roughPort = !!city.prizeYard;
  /* 해적 소굴(flag==='pirate')은 나라가 없으니 **그 바다**로 고른다 — 안 그러면
     토르투가·쌍서·계롱 술집에 이탈리아 이름 무리가 앉는다. */
  const poolKey = city.flag === 'pirate'
    ? (PIRATE_NAME_POOL[regionOf(cityId)] ?? 'latin')
    : (CREW_NAME_POOL[city.flag] ?? 'latin');
  const pool = CREW_NAMES[poolKey];

  const out = [];
  const taken = new Set();   // 같은 술집에 같은 이름이 두 번 앉지 않게 (자리마다 해시가 독립이라 겹친다)
  for (let i = 0; i < slots; i++) {
    if (hash(cityId, 'tav', i, cyc) < TAVERN.emptyOdds) continue;   // 빈 자리

    let trait = pickTrait(hash(cityId, 'tavtrait', i, cyc));
    /* 거친 항구에서 물러 보이는 자가 걸리면 다시 굴린다 — 그리고 **거친 쪽으로 기울여** 굴린다.
       ★ 원래는 애송이일 때 그냥 한 번 더 굴렸는데, 그 재굴림이 아무 기질이나 뽑으므로
         기대값이 거의 안 움직였다. 도시가 열여섯일 때는 우연히 통과했고,
         전 세계로 넓혀 나포항이 열 곳이 되자 20% 대 21%로 **차이가 사라진 것이 드러났다**.
         표본이 작을 때 통과한 테스트가 규칙의 부재를 가려 준 셈이다.
       확률표를 따로 두지 않고 재굴림으로 기울이는 이유는 그대로다 — 도시를 늘려도 표를 안 고친다. */
    if (roughPort && (trait === 'green' || trait === 'drunk')) {
      const r2 = hash(cityId, 'tavtrait2', i, cyc);
      trait = r2 < 0.34 ? 'rough' : r2 < 0.52 ? 'corsair' : pickTrait(r2);
    }
    const T = CREW_TRAITS[trait];

    const rn = hash(cityId, 'tavn', i, cyc);
    const n = TAVERN.band[0] + Math.floor(rn * (TAVERN.band[1] - TAVERN.band[0] + 1));
    // 값은 기질이 정하고 ±12%만 흔든다. 흔들림이 크면 기질이 안 읽힌다.
    const jitter = 0.88 + hash(cityId, 'tavjit', i, cyc) * 0.24;

    /* 이름은 자리마다 따로 뽑히므로 그냥 두면 겹친다 — 광저우에 `황(黃)씨 형제`가 둘 앉아 있었다.
       자리가 최대 5, 가장 작은 풀도 5라 **옆으로 한 칸씩 비켜 가면** 반드시 빈 이름을 찾는다. */
    let nameIdx = Math.floor(hash(cityId, 'tavname', i, cyc) * pool.length);
    while (taken.has(nameIdx) && taken.size < pool.length) nameIdx = (nameIdx + 1) % pool.length;
    taken.add(nameIdx);
    out.push({
      id: `${cityId}-${cyc}-${i}`,
      n,
      trait,
      traitName: T.name,
      desc: T.desc,
      troop: T.troop,
      temper: T.temper,
      wage: Math.round(CREW_WAGE * T.wageMul * jitter * 100) / 100,
      advance: Math.round(TAVERN.advanceUnit * T.advMul * jitter) * n,
      name: pool[nameIdx],
      city: cityId,
    });
  }
  return out;
}

/** 무리를 통째로 태운다. 낱개로 고를 수 없다 — 같이 다니는 사람들이기 때문이다. */
export function recruitBand(id, cityId = state.at) {
  const band = tavernCrews(cityId).find((b) => b.id === id);
  if (!band) return { ok: false, reason: '그 자리는 비었다' };
  if (state.hired?.includes(id)) return { ok: false, reason: '이미 태운 무리다' };
  const room = state.crewMax - state.crew;
  if (room <= 0) return { ok: false, reason: '선실이 가득 찼다' };
  if (band.n > room) return { ok: false, reason: `선실이 ${band.n - room}자리 모자란다` };
  if (band.advance > state.gold) {
    return { ok: false, reason: `계약금이 ${(band.advance - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  }

  state.gold -= band.advance;
  state.crew += band.n;
  book('outgo', 'port', band.advance);
  state.bands.push({
    n: band.n, trait: band.trait, wage: band.wage,
    name: band.name, from: cityId, day: state.day, unrest: 0,
  });
  (state.hired ||= []).push(id);
  return { ok: true, band };
}

/** 선원 1인 1일 평균 임금 — 무리마다 요구가 다르므로 가중평균으로 낸다.
    무리 기록이 없으면(시뮬·테스트가 `state.crew`만 세울 때) 표준 일당으로 떨어진다.
    ★ 인원과 무관한 **단가**를 돌려주는 이유: `voyageCost`가 `crew`를 인자로 받아
      "선원이 N명이면 얼마인가"를 묻기 때문이다. 총액을 돌려주면 그 물음에 못 답한다. */
export function avgCrewWage() {
  const inBands = state.bands.reduce((a, b) => a + b.n, 0);
  if (!inBands) return CREW_WAGE;
  return state.bands.reduce((a, b) => a + b.n * b.wage, 0) / inBands;
}

/** 무리 인원 합을 `state.crew`에 맞춘다 — 사람이 죽으면 무리도 줄어야 한다.
    싼 무리부터 깎지 않고 **뒤에 태운 무리부터** 깎는다(먼저 탄 사람이 살아남는다). */
export function trimBands() {
  let over = state.bands.reduce((a, b) => a + b.n, 0) - state.crew;
  while (over > 0 && state.bands.length) {
    const last = state.bands[state.bands.length - 1];
    const cut = Math.min(over, last.n);
    last.n -= cut;
    over -= cut;
    if (last.n <= 0) state.bands.pop();
  }
}

/* ── 개장 ─────────────────────────────────────────────────────
   배 한 척에 영구히 붙는 손질. 갈아타면 그 배의 개장을 쓰게 된다.
   선체 최대치처럼 상태값에 직접 반영되는 것은 recalcShip()이 다시 계산한다. */
export function hasRefit(key) {
  return !!state.refits[key];
}

export function refitPrice(key) {
  return REFITS[key].price;
}

export function buyRefit(key) {
  const r = REFITS[key];
  if (!r) return { ok: false, reason: '그런 개장은 없다' };
  if (state.refits[key]) return { ok: false, reason: '이미 손본 배다' };
  if (r.price > state.gold) return { ok: false, reason: `금화가 ${(r.price - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  state.gold -= r.price;
  book('outgo', 'ships', r.price);
  state.refits[key] = true;
  const before = state.maxHp;
  recalcShip();
  /* ★ **덧댄 만큼은 새것이다.** 전에는 `maxHp`만 오르고 `hp`는 그대로여서, 2,400닢짜리
     떡갈나무 장갑을 사고 나면 배가 "231 중 185"가 됐다 — **산 직후가 가장 약한 상태**였고
     모르고 나가면 46pt를 손해 본 채 싸웠다(완주 플레이 ISSUES #23).
     현측에 새 널을 덧댄 것이므로 **그 몫은 성한 것이 맞다.** 낡은 부분은 그대로 낡아 있다. */
  const gained = Math.max(0, state.maxHp - before);
  if (gained > 0) state.hp = Math.min(state.maxHp, state.hp + gained);
  // 상갑판을 깎았으면 넘치는 포문을 내린다 (환불은 없다 — 뜯어낸 것이다)
  const over = armsTotal() - gunCap();
  if (over > 0) {
    let left = over;
    for (const k of CANNON_KEYS) {
      const take = Math.min(left, state.arms[k] || 0);
      state.arms[k] -= take;
      left -= take;
      if (left <= 0) break;
    }
    syncGuns();
  }
  return { ok: true, cost: r.price, dropped: Math.max(0, over) };
}

/** 개장까지 반영한 선체 최대치 */
export function maxHullOf(shipKey = state.shipKey, refits = state.refits) {
  const base = SHIPS[shipKey].hp;
  return Math.round(base * (refits.oakArmor ? 1.25 : 1) * (refits.razee ? 0.90 : 1));
}

/** 선체 최대치를 다시 계산해 상태에 반영 (개장·승선 시) */
export function recalcShip() {
  state.maxHp = maxHullOf();
  state.hp = Math.min(state.hp, state.maxHp);
}

/** 개장과 인원 사정까지 반영한 실제 속력 */
export function shipSpeed() {
  const s = ship();
  let v = s.speed;
  if (state.refits.copper) v *= 1.08;
  if (state.refits.sails) v *= 1.05;
  if (state.refits.razee) v *= 1.15;
  if (shorthanded()) v *= 0.75;     // 최소 인원 미달 — 돛을 다 못 편다
  return v;
}

/** 운항 최소 인원에 못 미치는가 */
export function shorthanded() {
  return state.crew < (ship().crewMin || 0);
}

/* ── 대양은 사람이 있어야 건넌다 ───────────────────────────────
   ★ 인원 미달이 **속력 벌점뿐**이라 선원 1명·선체 44/231로도 원양이 열려 있었다
   (완주 플레이 ISSUES #24). 그러면 **백병전에 사람을 갈아 넣는 것이 늘 옳아지고**,
   "사람을 잃는다"가 실질 손해가 아니게 된다.

   근해는 그대로 둔다 — 어떻게든 노를 저어 옆 항구까지는 간다. 막히는 것은 **원양**뿐이다.
   며칠씩 뭍이 안 보이는 구간은 교대로 키를 잡을 사람이 있어야 하기 때문이고,
   무엇보다 **항구에 갇히는 일이 없어야** 하기 때문이다(근해가 열려 있으면 언제든 빠져나간다). */
export const OCEAN_CREW_MIN = 0.6;      // 그 배 최소 인원의 이 비율
export const OCEAN_HULL_MIN = 0.25;     // 선체가 이보다 상하면 대양은 못 건넌다

export function oceanReady() {
  const need = Math.max(3, Math.ceil((ship().crewMin || 0) * OCEAN_CREW_MIN));
  if (state.crew < need) {
    return { ok: false, need, why: `대양을 건너려면 선원이 ${need}명은 있어야 한다 (지금 ${state.crew}명)` };
  }
  if (state.maxHp > 0 && state.hp / state.maxHp < OCEAN_HULL_MIN) {
    return { ok: false, why: `선체가 ${state.hp}/${state.maxHp}다. 이 배로는 뭍이 안 보이는 곳에 못 나간다` };
  }
  return { ok: true };
}

/** 도주 성공률 보정 (돛 증축) */
export function fleeBonus() {
  return state.refits.sails ? 0.14 : 0;
}

/** 도주 성공 확률. 멀수록·빠를수록 잘 도망치고, 찢긴 돛은 양쪽 모두에 반영된다.
    ★ **적 배의 속력이 들어간다** — 전에는 상대가 누구든 같은 확률이라 노를 젓는 갤리와
      둔한 정크가 똑같이 따라왔다. 선종을 고르는 일에 뜻이 생기는 자리다.
    ★ 전투 화면(`battle.js: tryFlee`)과 조우 안내(`map.js`)가 **같은 식을 본다** —
      보여 준 가망과 실제 판정이 어긋나면 안내가 거짓말이 된다. */
export function fleeOdds({ range = 78, foeHull = null, mySail = 0, foeSail = 0 } = {}) {
  const foeSpd = SHIPS[foeHull]?.speed ?? 1;      // 적 선체명은 SHIPS 키와 같다(brig·galley…)
  const p = 0.24 + (range / 100) * 0.52 + (shipSpeed() - foeSpd) * 0.25
          + fleeBonus() + (foeSail / 100) * 0.30 - (mySail / 100) * 0.25;
  return Math.max(0.05, Math.min(0.95, p));       // 확실한 도주도, 확실한 포획도 없다
}

/** 도주 가망을 말로 — 이 게임은 확률을 숫자로 내보이지 않는다(적의 세기도 `RANK`로 옮긴다) */
export function fleeWord(p) {
  return p >= 0.68 ? '따돌릴 만하다' : p >= 0.5 ? '반반이다'
       : p >= 0.32 ? '쉽지 않다' : '거의 빠져나갈 수 없다';
}

/** 피격 시 선원 사상 배율 (내포격 골조) */
export function crewLossFactor() {
  return state.refits.frames ? 0.55 : 1;
}

/* ── 특수탄 ───────────────────────────────────────────────── */
export function buyShot(type, n = 5) {
  const s = SHOTS[type];
  if (!s || !s.price) return { ok: false, reason: '살 수 없는 탄이다' };
  const max = Math.min(n, Math.floor(state.gold / s.price));
  if (max <= 0) return { ok: false, reason: '금화가 모자란다' };
  state.gold -= max * s.price;
  book('outgo', 'ships', max * s.price);
  state.shots[type] = (state.shots[type] || 0) + max;
  return { ok: true, n: max, cost: max * s.price };
}

export function shotStock(type) {
  return type === 'round' ? Infinity : (state.shots[type] || 0);
}

export function useShot(type) {
  if (type === 'round') return true;
  if ((state.shots[type] || 0) <= 0) return false;
  state.shots[type]--;
  return true;
}

/* ── 무장 ─────────────────────────────────────────────────────
   포문 상한은 선종의 기본 포문 수 × 1.5. 그 안에서 종류를 섞어 싣는다.
   레이지 개조로 상갑판을 깎으면 그만큼 줄어든다. */
export function gunCap() {
  return Math.floor(ship().guns * 1.5 * (state.refits.razee ? 0.75 : 1));
}
export function armsTotal(arms = state.arms) {
  return CANNON_KEYS.reduce((a, k) => a + (arms[k] || 0), 0);
}
function syncGuns() {
  state.guns = armsTotal();
}

/** 편성된 대포의 평균 배율 — 포문이 비면 1.0 */
export function armsFactor(field) {
  const n = armsTotal();
  if (n <= 0) return 1;
  let sum = 0;
  for (const k of CANNON_KEYS) sum += (state.arms[k] || 0) * CANNONS[k][field];
  return sum / n;
}

export function zoneFactor(c, range) {
  const over = Math.max(0, range - c.far);
  const under = Math.max(0, c.near - range);
  return Math.max(ZONE_FLOOR, 1 - (over / ZONE_FAR_FALL + under / ZONE_NEAR_FALL));
}

/** 그 거리에서의 조준 판정대 배율 (문수 가중 평균) — 포문이 비면 1.0 */
export function armsAimAt(range) {
  const n = armsTotal();
  if (n <= 0) return 1;
  let sum = 0;
  for (const k of CANNON_KEYS) {
    const c = CANNONS[k];
    sum += (state.arms[k] || 0) * c.aim * zoneFactor(c, range);
  }
  return sum / n;
}

export function buyCannon(type, n = 1) {
  const c = CANNONS[type];
  const room = gunCap() - armsTotal();
  const max = Math.min(n, room, Math.floor(state.gold / c.price));
  if (max <= 0) return { ok: false, reason: room <= 0 ? '포문을 더 낼 수 없다' : '금화가 모자란다' };
  state.gold -= max * c.price;
  book('outgo', 'ships', max * c.price);
  state.arms[type] = (state.arms[type] || 0) + max;
  syncGuns();
  return { ok: true, n: max, cost: max * c.price };
}

export function removeCannon(type, n = 1) {
  const c = CANNONS[type];
  const max = Math.min(n, state.arms[type] || 0);
  if (max <= 0) return { ok: false, reason: '철거할 대포가 없다' };
  const refund = Math.round(c.price * CANNON_REFUND) * max;
  state.arms[type] -= max;
  state.gold += refund;
  syncGuns();
  return { ok: true, n: max, refund };
}

/* ── 갑판 배치 ────────────────────────────────────────────────
   슬롯 0은 선장 고정. 나머지는 선원 7명당 1칸씩 열린다. */
export function openSlots() {
  return Math.min(MELEE_SLOTS - 1, Math.floor(state.crew / 7));
}

export function setSlot(i, troopKey) {
  if (i <= 0 || i >= MELEE_SLOTS) return { ok: false, reason: '건드릴 수 없는 자리다' };
  if (i > openSlots()) return { ok: false, reason: '선원이 모자라 아직 열리지 않은 자리다' };
  const prev = state.loadout[i];
  if (prev === troopKey) return { ok: false, reason: '이미 그 병종이다' };
  const cost = troopKey ? TROOPS[troopKey].hire : 0;
  const refund = prev && TROOPS[prev].hire ? Math.round(TROOPS[prev].hire * TROOP_REFUND) : 0;
  if (cost - refund > state.gold) return { ok: false, reason: `금화가 ${cost - refund - state.gold}닢 모자란다` };
  state.gold += refund - cost;
  state.loadout[i] = troopKey;
  return { ok: true, cost, refund };
}

/* ── 선단 ─────────────────────────────────────────────────────
   보유 선박은 마지막으로 내린 항구에 정박한 채로 남는다. 자동 매각은 없다. */
export function fleetRecord(key) {
  return state.fleet[key];
}
export function resaleOf(key) {
  return Math.round(SHIPS[key].price * SHIP_RESALE);
}

/** 기함의 현재 상태(선체·무장·개장·정박지)를 선단 기록에 적어 둔다 */
function stowFlagship() {
  state.fleet[state.shipKey] = {
    at: state.at,
    hp: state.hp,
    arms: { ...state.arms },
    refits: { ...state.refits },
  };
}

/** 이 항구의 조선소가 그 선종을 내놓는가 — 국적별로 파는 배가 다르다 */
/* ── 조선소 ───────────────────────────────────────────────────
   "어느 항구에서 어느 배를 짓는가"는 하드코딩된 목록이 아니라 **도시 공업력**으로 정해진다.
   `map/geo.js: industry`(0~3) ≥ `SHIPS[].tier`면 지을 수 있고, 제 나라 배는 한 등급 쉽다.
   도시를 추가해도 규칙이 알아서 따라오고, "왜 여기선 못 사나"가 수치로 설명된다. */

export function industryOf(cityId = state.at) {
  /* 부두(`HOLDINGS.dock`)를 세우면 그 항구가 더 큰 배를 짓는다 — A-2 공업력의 첫 계단이다.
     `tierNeeded`·`sellsShip`·`shipPriceAt`·`usedListings`가 전부 이 함수를 거치므로 여기 한 줄이 전부다. */
  const base = CITY_BY_ID[cityId]?.industry ?? 0;
  const dock = hasHolding('dock', cityId) ? (HOLDINGS.dock.industryUp ?? 0) : 0;
  const boost = state.yards?.[cityId]?.boost ?? 0;   // A-2 승급
  return Math.min(YARD.cap, base + Math.min(HOLDING.industryCap - base, dock) + boost);
}

/** 그 항구에서 이 배를 지으려면 필요한 공업력 — 원산국 항구는 1 낮다 */
export function tierNeeded(key, cityId = state.at) {
  const s = SHIPS[key];
  const t = s.tier ?? 0;
  if (!t) return Infinity;                                    // tier 0 = 시중에 안 나온다(시작배)
  const home = s.originFlag && CITY_BY_ID[cityId]?.flag === s.originFlag;
  return Math.max(1, t - (home ? 1 : 0));
}

/** 아직 열리지 않은 배면 "무엇을 몰아 봐야 하는지"를 돌려준다. 열렸으면 null. */
export function shipLockedBy(key) {
  const req = SHIPS[key]?.requires;
  if (!req) return null;
  if (state.everOwned?.has(req)) return null;
  return SHIPS[req]?.name ?? req;
}

export function sellsShip(key, cityId = state.at) {
  if (shipLockedBy(key)) return false;
  /* ★ **공사 중에는 배를 못 짓는다.** 부두를 넓히는 동안 그 부두가 제 일을 못 한다는 뜻이고,
     그것이 이 투자의 진짜 값이다 — 돈보다 **그 항구를 몇 달 잃는 것**이 크다. */
  if (yardBusy(cityId)) return false;
  return industryOf(cityId) >= tierNeeded(key, cityId);
}

/** 공업력만 놓고 보면 지을 수 있는가 (해금 여부는 따지지 않는다 — UI에서 이유를 갈라 보여주려고) */
export function yardCapable(key, cityId = state.at) {
  return industryOf(cityId) >= tierNeeded(key, cityId);
}

/** 그 배를 오래 지어온 전통 조선지 이름들 (값이 싸진다 — 살 수 있는 곳과는 다르다) */
export function yardsOf(key) {
  return (SHIPS[key].yards || []).map((id) => CITY_BY_ID[id].name);
}

/** 지금 이 배를 지을 수 있는 항구 이름들 */
export function buildableAt(key) {
  return CITIES.filter((c) => sellsShip(key, c.id)).map((c) => c.name);
}

export function shipPriceAt(key, cityId = state.at) {
  const s = SHIPS[key];
  if (!sellsShip(key, cityId)) return s.price;
  const slack = industryOf(cityId) - tierNeeded(key, cityId);
  let p = s.price * (1 - Math.min(YARD_SLACK_CAP, Math.max(0, slack) * YARD_SLACK_OFF));
  if ((s.yards || []).includes(cityId)) p *= 1 - YARD_TRADITION_OFF;
  return Math.round(p);
}

/** 새 배를 산다 — 구입만 하고 기존 배는 그대로 둔다 */
export function purchaseShip(key) {
  const s = SHIPS[key];
  if (state.fleet[key]) return { ok: false, reason: '이미 보유한 선종이다' };
  if (!sellsShip(key)) {
    if (!s.tier) return { ok: false, reason: '시중에 나오지 않는 배다' };
    const lock = shipLockedBy(key);
    if (lock) return { ok: false, reason: `${lock}${josa(lock, '을/를')} 몰아 본 선주에게만 내놓는다` };
    const where = buildableAt(key);
    return {
      ok: false,
      reason: where.length
        ? `이 항구는 공업력 ${industryOf()}이라 못 짓는다 (${tierNeeded(key)} 필요) — ${where.slice(0, 4).join('·')}`
        : '어디서도 짓지 못하는 배다',
    };
  }
  const price = shipPriceAt(key);
  if (price > state.gold) return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  state.gold -= price;
  book('outgo', 'ships', price);
  state.fleet[key] = { at: state.at, hp: s.hp, arms: { light: 0, medium: s.guns, long: 0 }, refits: {} };
  state.everOwned.add(key);
  return { ok: true, cost: price };
}

/* ── 중고선 ───────────────────────────────────────────────────
   신조만 있으면 "그 항구에 가기 전까지는 방법이 없다"가 된다. 실제로도 즉시 손에 넣을 수 있는 배는
   신조가 아니라 **중고선과 나포선**이었다. 항구마다 매물이 사흘 주기로 갈리고,
   나포선을 뜯어 고쳐 파는 항구(`prizeYard` — 튀니스·알제)는 더 자주, 더 싸게 나온다.
   싸지만 선체가 상해 있어 수리비가 든다. */
export function usedListings(cityId = state.at, day = state.day) {
  const city = CITY_BY_ID[cityId];
  if (!city) return [];
  const ind = industryOf(cityId);
  if (ind <= 0) return [];        // 내륙 도시는 배가 드나들지 않는다
  if (yardBusy(cityId)) return []; // 공사 중인 부두에는 매물이 안 걸린다
  const prize = !!city.prizeYard;
  // 중고는 흘러드는 것이라 신조보다 관대하다 — 공업력보다 한 등급 위까지 들어온다.
  const pool = Object.entries(SHIPS)
    .filter(([k, s]) => s.tier > 0 && s.tier <= ind + 1 && !shipLockedBy(k))
    .map(([k]) => k);
  if (!pool.length) return [];

  const out = [];
  const slots = USED.slots + (prize ? 1 : 0)
              + (hasHolding('slipway', cityId) ? (HOLDINGS.slipway.usedSlots ?? 0) : 0);
  const cyc = Math.floor(day / USED.cycle);
  for (let i = 0; i < slots; i++) {
    // hash()는 0~1 실수를 돌려준다 — 정수 비트연산을 쓰면 전부 0이 되어 매물이 사라진다.
    if (hash(cityId, 'used', i, cyc) < (prize ? 0.30 : 0.48)) continue;   // 빈 자리도 있다
    const key = pool[Math.floor(hash(cityId, 'usedkey', i, cyc) * pool.length)];
    if (out.some((u) => u.key === key)) continue;
    const s = SHIPS[key];
    const r1 = hash(cityId, 'usedhull', i, cyc);
    const r2 = hash(cityId, 'usedprice', i, cyc);
    const hull = Math.max(8, Math.round(s.hp * (USED.hullMul[0] + r1 * (USED.hullMul[1] - USED.hullMul[0]))));
    let price = s.price * (USED.priceMul[0] + r2 * (USED.priceMul[1] - USED.priceMul[0]));
    if (prize) price *= 0.88;                                  // 나포선을 뜯어 고쳐 넘기는 항구
    out.push({
      key, hp: hull, price: Math.round(price), prize,
      wear: 1 - hull / s.hp,
    });
  }
  return out;
}

export function buyUsed(key, cityId = state.at) {
  const lot = usedListings(cityId).find((u) => u.key === key);
  if (!lot) return { ok: false, reason: '그런 매물이 없다' };
  if (state.fleet[key]) return { ok: false, reason: '이미 보유한 선종이다' };
  if (lot.price > state.gold) return { ok: false, reason: `금화가 ${(lot.price - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  const s = SHIPS[key];
  state.gold -= lot.price;
  book('outgo', 'ships', lot.price);
  state.fleet[key] = { at: cityId, hp: lot.hp, arms: { light: 0, medium: s.guns, long: 0 }, refits: {} };
  state.everOwned.add(key);
  return { ok: true, cost: lot.price, hp: lot.hp };
}

/* ── 나포한 배 ────────────────────────────────────────────────
   백병전으로 이겨 갑판을 장악하면 그 배를 끌고 갈 수 있다.
   이미 같은 선종을 가지고 있으면 끌고 갈 인원이 없어 자재로 판다. */
/* ★ 나포선을 끌고 가려면 **사람을 옮겨 태워야 한다**(prize crew).
   남는 선원이 모자라면 배는 못 끌고 가고 해체값만 건진다 — 씬은 이미 그 갈래를
   ("끌고 갈 인원이 없어 …해체해 자재로 팔았다") 문장으로 갖고 있었고,
   지금까지는 *같은 선종을 이미 가진 경우*에만 그 길로 갔다.
   이 규칙이 없으면 선원 여섯짜리 낡은 바사가 브리간틴(4,200닢)을 통째로 끌고 가
   성장 사다리를 다섯 칸 건너뛴다. → data.js: PRIZE_CREW */
export function prizeCrewNeed(key) {
  return Math.ceil((SHIPS[key]?.crewMin || 0) * PRIZE_CREW);
}
export function spareCrew() {
  return Math.max(0, state.crew - (ship().crewMin || 0));
}

export function captureShip(key) {
  const s = SHIPS[key];
  if (!s) return { ok: false, reason: '끌고 갈 만한 배가 아니다' };
  const short = spareCrew() < prizeCrewNeed(key);
  if (state.fleet[key] || short) {
    // 해체값도 **실어 갈 수 있는 만큼만** — 안 그러면 해체가 상한을 우회하는 뒷문이 된다
    const gain = capSpoils(s.price * PRIZE_SCRAP);
    state.gold += gain;
    book('income', 'loot', gain);
    return { ok: true, scrapped: true, gain, why: short && !state.fleet[key] ? 'crew' : 'dup' };
  }
  state.fleet[key] = {
    at: state.at,
    hp: Math.round(s.hp * PRIZE_HULL),
    arms: { light: 0, medium: Math.round(s.guns * 0.6), long: 0 },
    refits: {},
  };
  state.towing = key;      // 항해 중이라면 다음 입항지까지 끌고 간다
  state.everOwned.add(key);   // 빼앗은 배도 "몰아 본" 것으로 친다 — 상위 선박 해금 경로가 하나 더 생긴다
  return { ok: true, scrapped: false };
}

/* ── 선단 유지비 ──────────────────────────────────────────────
   기함 밖의 배도 정박해 있는 동안 삯과 관리비가 나간다. 배를 쟁여두는 값. */
export function fleetUpkeep() {
  let sum = 0;
  for (const key of Object.keys(state.fleet)) {
    if (key === state.shipKey) continue;      // 기함은 선원 급여로 따로 나간다
    sum += SHIPS[key].upkeep || 0;
  }
  return sum;
}

/** 정박해 둔 배로 갈아탄다 — 화물·선원은 함께 옮겨진다 */
export function boardShip(key) {
  const s = SHIPS[key];
  const rec = state.fleet[key];
  if (!rec) return { ok: false, reason: '보유하지 않은 배다' };
  if (state.shipKey === key) return { ok: false, reason: '이미 그 배를 몰고 있다' };
  if (rec.at !== state.at) return { ok: false, reason: `${CITY_BY_ID[rec.at].name}에 정박해 있다` };
  if (cargoUsed() > s.cargo) return { ok: false, reason: '화물이 새 배의 적재량을 넘는다' };

  stowFlagship();
  const dropped = Math.max(0, state.crew - s.crewMax);   // 선실이 좁으면 초과분은 하선
  state.shipKey = key;
  state.refits = { ...(rec.refits || {}) };               // 개장은 배를 따라다닌다
  state.maxHp = maxHullOf(key, state.refits);
  state.hp = Math.min(rec.hp, state.maxHp);
  state.crewMax = s.crewMax;
  state.crew = Math.min(state.crew, s.crewMax);
  state.cargoCap = s.cargo;
  state.arms = { light: 0, medium: 0, long: 0, ...rec.arms };
  syncGuns();
  trimLoadout();
  return { ok: true, dropped, short: shorthanded() };
}

/* ── 개발용 지급 ───────────────────────────────────────────────
   `?start=…&ship=…&crew=…`로 시작 조건을 바꿀 때 쓴다(`main.js: applyDebugStart`).
   ★ 규칙을 여기서 다시 쓰지 않는다 — 배는 선단에 넣고 `boardShip`이 하는 일을 그대로 태운다.
     안 그러면 "테스트에서는 되는데 실제로는 적재·무장이 안 맞는" 상태가 만들어진다. */
export function grantShip(key) {
  const s = SHIPS[key];
  if (!s) return { ok: false, reason: '없는 선종' };
  state.fleet[key] = state.fleet[key] ?? {
    at: state.at, hp: maxHullOf(key, {}), refits: {}, arms: { light: 0, medium: 0, long: 0 },
  };
  state.fleet[key].at = state.at;
  state.everOwned.add(key);
  const r = boardShip(key);
  if (!r.ok && state.shipKey !== key) return r;
  // 포문을 빈 채로 두면 전투를 시험할 수 없다 — 중포로 채운다
  state.arms = { light: 0, medium: SHIPS[key].guns, long: 0 };
  syncGuns();
  return { ok: true };
}

/** 선원을 태운다(계약금 없이). 배의 정원을 넘기지 않는다. */
export function grantCrew(n) {
  state.crew = Math.min(SHIPS[state.shipKey].crewMax, Math.max(0, n));
  trimLoadout();
  return state.crew;
}

/** 정박 중인 배를 판다 — 타고 있는 배는 팔 수 없다 */
export function sellShip(key) {
  const rec = state.fleet[key];
  if (!rec) return { ok: false, reason: '보유하지 않은 배다' };
  if (state.shipKey === key) return { ok: false, reason: '타고 있는 배는 팔 수 없다' };
  if (rec.at !== state.at) return { ok: false, reason: `${CITY_BY_ID[rec.at].name}에 정박해 있다` };
  const gain = resaleOf(key);
  delete state.fleet[key];
  state.gold += gain;
  book('income', 'loot', gain);
  return { ok: true, gain };
}

/** 선원이 줄어 슬롯이 닫히면 그 자리의 병종도 내린다.
    무리 명부도 여기서 함께 맞춘다 — `state.crew`가 줄어드는 자리(전투 사상·폭풍)는
    전부 이 함수를 이미 부르고 있으므로, 배선을 한 곳으로 모으면 빠뜨릴 자리가 없다. */
export function trimLoadout() {
  const open = openSlots();
  for (let i = open + 1; i < MELEE_SLOTS; i++) state.loadout[i] = null;
  trimBands();
}

/* ── 항로 ─────────────────────────────────────────────────── */
export function neighborsOf(cityId) {
  const out = [];
  for (const [a, b] of ROUTES) {
    if (a === cityId) out.push(b);
    else if (b === cityId) out.push(a);
  }
  return out;
}

/** 두 항구 사이의 거리.
    ★ 권역이 다르면 **좌표로 잴 수 없다** — 지도마다 좌표계가 따로이기 때문이다.
      그런 구간(원양 항로)은 `days`를 직접 적어 두었으므로 그것을 거리로 환산한다
      (항해 일수 공식이 `거리 / (13 × 속력)`이라 13을 곱하면 속력 1.0에서 그 일수가 된다). */
export function distanceBetween(aId, bId) {
  const lane = laneOf(aId, bId);
  if (lane) return lane.days * 13;
  const a = CITY_BY_ID[aId], b = CITY_BY_ID[bId];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 지금 있는 권역 */
export const regionOf = (cityId) => REGION_OF_CITY[cityId] ?? HOME_REGION;
export const currentRegion = () => regionOf(state.at);

/* ── 바람과 해류 ──────────────────────────────────────────────
   범선은 어디로 가느냐에 따라 걸리는 날이 달라진다. 이 게임에서 "항로 선택"이
   거리 재기 이상이 되게 하는 축이다.

   · 바람: 계절풍. 여름에는 북풍(에테시아)이 남쪽으로 밀고, 겨울에는 남서풍이
     북동으로 민다. 방향은 날짜로 결정되며 3일마다 갱신된다(시세와 같은 리듬 —
     항구를 드나들며 다시 굴리는 스캠을 막는다).
   · 돛: 스퀘어리그는 순풍을 잘 받고, 라틴세일은 바람을 거슬러 갈 수 있다.
     `HULLS[hull].masts[].sail` 구성에서 그대로 뽑는다.
   · 노: 갤리는 바람을 덜 탄다.
   · 해류: 지중해는 아프리카 연안을 동쪽으로 흐르고 레반트에서 북상해 되돌아온다.
     `CURRENTS`에 실은 구간만 반영한다. */
const YEAR = 120;   // 1년 = 120일
export const YEAR_DAYS = YEAR;

/** 그날의 철. 이 게임의 계절은 **바람과 같은 축**이다 —
    `windOf`가 이미 `day % YEAR`로 여름 북풍과 겨울 남서풍을 가르고 있으므로,
    계절을 따로 정의하면 "바람은 여름인데 철은 겨울"인 날이 생긴다.

    ★ 계절이 규칙에 물리는 자리는 **NPC의 등장**이다. 바르바리 코르세어는 여름에만 나왔고
      (겨울 지중해는 배가 안 떴다), 발트는 얼어붙어 한자법이 2/22~11/11만 허용했고,
      말라바르는 남서 계절풍 넉 달 동안 해안이 통째로 닫혔다. 그래서 같은 달에
      지중해와 인도양의 위험이 **정반대로** 움직인다 — 플레이어가 지도가 아니라 달력을 본다. */
export function seasonOf(day = state.day) {
  return (day % YEAR) < YEAR / 2 ? 'summer' : 'winter';
}

/** 그 NPC가 지금 철에 바다에 나와 있는가. `season`이 없으면 사철 돈다. */
export const inSeason = (def, day = state.day) => !def?.season || def.season === seasonOf(day);

/** 그날 바람이 밀어주는 방향(단위벡터) — x 동쪽, y 남쪽 */
export function windOf(day = state.day) {
  const season = ((day % YEAR) / YEAR) * Math.PI * 2;
  // 여름: 북 → 남으로 민다 (0, 1) / 겨울: 남서 → 북동으로 민다 (0.7, -0.7)
  const sx = 0.35 - Math.cos(season) * 0.35;
  const sy = Math.cos(season) * 0.85;
  // 3일마다 바뀌는 결정론적 흔들림 (±30°)
  const jitter = (wobble('wind', 'dir', day) - 0.5) * (Math.PI / 3);
  const ang = Math.atan2(sy, sx) + jitter;
  return { x: Math.cos(ang), y: Math.sin(ang) };
}

const WIND_NAMES = [
  [0, '동풍'], [45, '남동풍'], [90, '남풍'], [135, '남서풍'],
  [180, '서풍'], [225, '북서풍'], [270, '북풍'], [315, '북동풍'],
];
/** 바람 이름 — "밀어주는 방향"이 아니라 뱃사람이 부르는 대로(불어오는 쪽) */
export function windName(day = state.day) {
  const w = windOf(day);
  let deg = (Math.atan2(w.y, w.x) * 180) / Math.PI;
  deg = (deg + 360) % 360;
  let best = WIND_NAMES[0];
  for (const n of WIND_NAMES) {
    const d = Math.min(Math.abs(deg - n[0]), 360 - Math.abs(deg - n[0]));
    const bd = Math.min(Math.abs(deg - best[0]), 360 - Math.abs(deg - best[0]));
    if (d < bd) best = n;
  }
  return best[1];
}

/** 항로에 대한 바람 배율 — 1보다 크면 빨라진다 */
export function windFactor(aId, bId, day = state.day, shipKey = state.shipKey) {
  const a = CITY_BY_ID[aId], b = CITY_BY_ID[bId];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const w = windOf(day);
  const align = (dx / len) * w.x + (dy / len) * w.y;    // -1(역풍) ~ +1(순풍)
  const square = SHIPS[shipKey].rig ?? 0.5;
  const gain = align >= 0
    ? align * (0.16 + square * 0.20)                    // 스퀘어리그가 순풍을 잘 받는다
    : align * (0.30 - (1 - square) * 0.16);             // 라틴세일이 역풍에 강하다
  return Math.max(0.6, Math.min(1.5, 1 + gain));
}

/** 해류 배율 — CURRENTS에 실린 구간만 */
export function currentFactor(aId, bId) {
  const key = [aId, bId].sort().join('|');
  const c = CURRENTS[key];
  if (!c) return 1;
  const forward = c.from === aId;                       // 실린 방향대로 가면 순류
  return 1 + (forward ? c.push : -c.push);
}

/** 그 항로가 지금 얼마나 잘 나가나 (1보다 크면 빠르다) */
export function routeFactor(aId, bId, day = state.day) {
  return windFactor(aId, bId, day) * currentFactor(aId, bId);
}

/** 순풍/역풍 라벨 */
export function routeWindLabel(aId, bId, day = state.day) {
  const f = routeFactor(aId, bId, day);
  if (f >= 1.14) return { text: '순풍', kind: 'good' };
  if (f >= 1.04) return { text: '뒷바람', kind: 'good' };
  if (f > 0.96) return { text: '옆바람', kind: '' };
  if (f > 0.86) return { text: '맞바람', kind: 'warn' };
  return { text: '역풍', kind: 'bad' };
}

export function voyageDays(aId, bId, day = state.day) {
  const base = distanceBetween(aId, bId) / (13 * shipSpeed());
  return Math.max(1, Math.round(base / routeFactor(aId, bId, day)));
}

/* ── 항해 이벤트 ────────────────────────────────────────────
   조우 확률은 **항로마다 다르다.** 근거는 당대 해상보험 요율(`geo.js: ROUTE_RISK`)이고,
   거기에 그 구간에 실제로 떠 있는 해적 수를 얹는다.

   ★ weight 합 100을 반드시 유지한다. pirate만 올리면 폭풍·표류물·상선조우의 상대 빈도가
     통째로 내려앉는다. 그래서 **calm에서 덜어내 pirate로 옮긴다** — 나머지 넷은 안 건드린다. */

/** 그 항로의 보험료율(%) — 없으면 null(해적 미적용 구간) */
export function routeRisk(aId, bId) {
  const v = ROUTE_RISK[riskKey(aId, bId)];
  return v === undefined ? BASE_RISK : v;
}

/** 이 항로에서 해적을 만날 확률. threat은 `world.js: pirateThreat()`가 준다.
    (state는 world를 모른다 — 순환 참조를 막으려고 호출자가 넘긴다) */
/* 화물이 값나갈수록 해적이 꼬인다.
   ★ 이것이 이 게임의 성장 곡선을 만든다 — 초반엔 곡물·소금처럼 싼 것을 가까운
     안전 항로로 나르니 조우가 드물고, 커져서 향신료·비단을 싣기 시작하면 같은
     항로라도 표적이 된다. "돈이 되는 곳에는 해적이 있을 수밖에 없다"를 규칙으로 옮긴 것.
   내해(risk=null)에는 걸리지 않는다 — 거기엔 애초에 코르세어가 없다. */
export function cargoLure(value = cargoValue()) {
  return Math.min(LURE_CAP, (value / LURE_PER) * LURE_PER_STEP);
}

/** 지금 실은 화물의 시세 가치 — 표적이 되는 정도를 재는 값 */
export function cargoValue(at = state.at) {
  let sum = 0;
  for (const [gid, n] of Object.entries(state.cargo || {})) {
    if (!n) continue;
    sum += (state.prices[at]?.[gid] ?? GOOD_BY_ID[gid]?.base ?? 0) * n;
  }
  return sum;
}

export function encounterOdds({ from, to, threat = 0, lure = null } = {}) {
  if (from == null || to == null) return SEA_EVENTS.find((e) => e.id === 'pirate').weight / 100;
  const risk = routeRisk(from, to);
  if (risk === null) return 0;                       // 오스만 내해·육로
  const bait = lure == null ? cargoLure() : cargoLure(lure);
  /* 악명이 조우를 부른다 — 털린 쪽이 배를 띄워 찾아다닌다 */
  return Math.min(ODDS_CAP, ODDS_BASE + risk * ODDS_PER_PCT + threat * THREAT_PER_SHIP + bait
                          + infamyOdds(from, to));
}

/** 위험도 라벨 — 출항 카드에 띄운다. 확률이 달라져도 못 읽으면 판단이 안 생긴다. */
export function routeDangerLabel({ from, to, threat = 0 } = {}) {
  const risk = routeRisk(from, to);
  if (risk === null) return { text: '내해', kind: 'calm', odds: 0 };
  const odds = encounterOdds({ from, to, threat });
  const kind = odds >= 0.28 ? 'bad' : odds >= 0.20 ? 'warn' : odds >= 0.13 ? '' : 'good';
  const text = odds >= 0.28 ? '매우 위험' : odds >= 0.20 ? '위험' : odds >= 0.13 ? '주의' : '평온';
  return { text, kind, odds, risk, threat };
}

/** 이 구간이 뭍인가 — 오스만 내해·육로에는 코르세어가 안 뜬다(`ROUTE_RISK`가 null) */
export function isInland(from, to) {
  return from != null && to != null && routeRisk(from, to) === null;
}

export function rollSeaEvent(opts = {}) {
  const { rand = Math.random, from = null, to = null, damp = 1 } = opts;

  /* `damp`는 **같은 항해에서 몇 번째 판정인가**를 받는다.
     긴 항해일수록 판정을 여러 번 굴리는데(map.js), 매번 같은 확률이면 서른 날 항로는
     사건이 100% 나고 나쁜 일만 두 번 가까이 겹친다 — 그건 위험이 아니라 통행세다.
     뒤로 갈수록 눅여서, 긴 항해가 **확실히 더 험하되 반드시 험하지는 않게** 둔다. */
  if (damp < 1 && rand() >= damp) return SEA_EVENTS.find((e) => e.id === 'calm');

  // 뭍의 구간 — 해적을 뺀 자리를 노상강도·통행세가 받는다.
  // 안 그러면 아나톨리아 안쪽 주머니가 **완전 무위험 구간**이 되어
  // 최적 플레이의 실효 조우율이 10.3%까지 내려간다(node tools/sim-risk.mjs).
  if (isInland(from, to)) {
    if (rand() < INLAND_ODDS) {
      const id = rand() < 0.45 ? 'bandit' : 'toll';
      return SEA_EVENTS.find((e) => e.id === id);
    }
    return SEA_EVENTS.find((e) => e.id === 'calm');
  }

  const p = encounterOdds(opts);
  const flat = SEA_EVENTS.find((e) => e.id === 'pirate').weight / 100;

  const total = SEA_EVENTS.reduce((a, e) => a + e.weight, 0);
  let n = rand() * total;
  for (const e of SEA_EVENTS) {
    // pirate는 항로별 확률로 갈아 끼우고, 그 차이를 calm이 흡수한다
    const w = e.id === 'pirate' ? p * total
            : e.id === 'calm'   ? e.weight + (flat - p) * total
            : e.weight;
    n -= w;
    if (n <= 0) return e;
  }
  return SEA_EVENTS[0];
}

/* ── 전리품 상한 — 실어 갈 수 있는 만큼만 ─────────────────────
   전리품은 **진 자의 크기**로 정해지는데 뜻은 **이긴 자의 크기**로 읽힌다.
   그 어긋남이 초반을 통째로 지웠다(실측 `node tools/sim-events.mjs`):
   세기 1 좀도둑 하나가 시작 자산의 573% — 첫 배로 하나만 잡으면 코카를 샀다.

   해적을 가난하게 만들지 않는다(그러면 후반 현상금이 죽는다). 대신 **옮겨 실을 수 있는
   양**에 한계를 둔다 — 낡은 바사 갑판에 여섯이 서서 갤리엇의 금고를 통째로 나를 수는 없다.
   상한 위로도 꼬리(SPOILS_TAIL)가 남아 큰 놈이 여전히 더 값나간다. → data.js: SPOILS_* */
export function spoilsCap() {
  return Math.max(SPOILS_FLOOR, Math.round((state.gold + cargoValue()) * SPOILS_SHARE));
}

export function capSpoils(v) {
  const cap = spoilsCap();
  return Math.round(v <= cap ? v : cap + (v - cap) * SPOILS_TAIL);
}

/** 노획 화물의 품목 수 — 씬이 품목마다 3~11개를 옮겨 싣는다.
    갑판에 사람이 많아야 적선 화물칸을 다 털 수 있다(선장 혼자서는 한 품목이 고작이다). */
export function spoilsGoodsLimit() {
  return Math.max(1, Math.min(SPOILS_GOODS_CAP, 1 + Math.floor(state.crew / SPOILS_GOODS_PER_CREW)));
}

/** 적함 정의에 상한을 씌운 **사본**을 돌려준다(원본 ENEMIES를 건드리지 않는다).
    `world.js: pirateEnemy()`도 이것을 통과시킨다 — 명부 해적과 떠돌이 해적이 같은 규칙을 받게. */
export function capLoot(e) {
  const [lo, hi] = e.loot.gold;
  return {
    ...e,
    loot: {
      ...e.loot,
      gold: [capSpoils(lo), capSpoils(hi)],
      goods: (e.loot.goods || []).slice(0, spoilsGoodsLimit()),
    },
  };
}

/* 등급은 그대로 두고 **얼굴만** 그 바다 것으로 갈아 끼운다.
   ★ 이것이 없던 동안 네 명의 테스터가 서로 다른 바다에서 같은 것을 보고했다 —
     홍해 한복판의 프랑스 순찰 프리깃, 대만 해협의 바르바리 기함, 기니만의 바르바리
     코르세어, 발트해의 바르바리 배. `ENEMIES` 다섯이 원래 지중해를 그린 것인데
     그것을 아홉 바다가 공용으로 쓰고 있었다. 위험(보험 요율)은 권역마다 다르게 적어
     두고도, 그 위험을 채우는 얼굴이 전 세계 하나였던 것이다.
   수치(hp·포·선원·병력·전리품 금액)는 손대지 않는다 — 밸런스는 이미 맞춰져 있고
   여기서 바꿔야 할 것은 "누가 왔는가"뿐이다. */
/* ── 나포하면 무엇이 들어오나 ──────────────────────────────
   ★ 얼굴(`FOES`)은 권역별로 갈렸는데 **전리품 선종(`prize`)은 안 갈려 있었다.**
   그래서 동해에서 왜구 소선단을 나포하면 **지중해 「브리간틴」**이 나왔고, 제원도 안 맞아
   ("적선 선체 80 · 포 6"인데 브리간틴은 130/10) *"저 배를 뺏었다"*가 성립하지 않았다
   (완주 플레이 ISSUES #20). **나포는 이 게임 전투 설계의 축**(격침 0.45 vs 나포 1.00)이라
   그 축의 보상이 세계관 밖이면 안 된다.

   그 권역에서 짓는 배(`yards`가 그 바다 항구를 가진 선종) 가운데 **등급에 맞는 tier**를 고른다.
   못 고르면 원래 값을 그대로 쓴다 — 콘텐츠가 없다고 나포가 막히면 안 되기 때문이다. */
const PRIZE_TIER = [0, 1, 2, 3, 4];     // 적 등급(0~4) → 노리는 선종 tier
function regionPrize(regionId, tier, fallback) {
  const ids = new Set(citiesOfRegion(regionId).map((c) => c.id));
  const want = PRIZE_TIER[tier] ?? 2;
  let best = null, bestGap = 99;
  for (const [key, sh] of Object.entries(SHIPS)) {
    if (!(sh.yards ?? []).some((y) => ids.has(y))) continue;
    if (sh.leak) continue;                       // 물 새는 배를 상으로 주지 않는다
    const gap = Math.abs((sh.tier ?? 0) - want);
    if (gap < bestGap) { best = key; bestGap = gap; }
  }
  return best ?? fallback;
}

function localize(base, tier, regionId) {
  const skin = FOES_BY_REGION[regionId]?.[tier];
  if (!skin) return base;
  return {
    ...base,
    id: `${base.id}:${regionId}`,
    name: skin.name,
    nation: skin.nation ?? base.nation,
    hull: skin.hull ?? base.hull,
    tint: skin.tint ?? base.tint,
    flag: skin.flag ?? base.flag,
    // 명부가 전리품을 지정했으면 그것을, 아니면 그 바다에서 짓는 배를 준다
    prize: base.prize == null ? null : (skin.prize ?? regionPrize(regionId, tier, base.prize)),
    loot: { ...base.loot, goods: skin.goods ?? base.loot.goods },
  };
}

export function pickEnemy(rand = Math.random, regionId = currentRegion()) {
  const pick = (i) => capLoot(localize(ENEMIES[i], i, regionId));
  // 자산이 커질수록 거물이 붙는다. 낡은 배로 시작하는 초반엔 큰 놈이 아예 붙지 않는다
  // (해적도 털 값이 나오는 배를 고른다).
  const wealth = state.gold + cargoUsed() * 60;
  // 볼품없는 배는 큰 놈이 상대해 주지 않는다 — 낡은 바사를 모는 동안은 잡배만 붙는다
  if (SHIPS[state.shipKey].leak) return pick(rand() < 0.9 ? 0 : 1);
  const table = wealth > 30000 ? [0.05, 0.10, 0.25, 0.35, 0.25]
              : wealth > 14000 ? [0.10, 0.25, 0.40, 0.20, 0.05]
              : wealth > 6000  ? [0.30, 0.42, 0.24, 0.04, 0.00]
              : wealth > 2000  ? [0.62, 0.32, 0.06, 0.00, 0.00]
                               : [0.88, 0.12, 0.00, 0.00, 0.00];
  let n = rand();
  for (let i = 0; i < table.length; i++) {
    n -= table[i];
    if (n <= 0) return pick(i);
  }
  return pick(0);
}

/* ── 항해 비용 ────────────────────────────────────────────────
   다섯 갈래로 나눠 둔다. 뭉뚱그리면 "왜 돈이 안 모이나"를 플레이어가 읽을 수 없다.
     · 일당    선원에게 매일 나가는 삯. 큰 배는 사람이 많아 비싸다.
     · 보급    식량과 물. 역시 사람 수 × 날수.
     · 선단    기함 밖의 배를 정박해 두는 값.
     · 무장    실은 대포를 쓸 수 있게 두는 값 — 화약·탄약·포수.
     · 부관    에이미의 고정 급여.

   ★ 임금은 사료 대비 과중했다(→ content/asset-evidence.json). 선원 연봉으로 배를
     몇 척 사느냐로 재면 게임 11배 : 사료 30배였다. 그래서 일당을 절반으로 내리고,
     줄어든 압박을 **성장에 따라 늘어나는 쪽**(선단·무장)으로 옮겼다.
     초반엔 작은 배로 싸고 안전한 화물을 나르니 비용이 낮고, 커질수록 갈래마다 함께 는다. */
/* ── 적하보험 ─────────────────────────────────────────────────
   `map/geo.js: ROUTE_RISK`는 원래 **당대 해상보험 요율(%)**이다. 지금까지 그 숫자를
   해적 조우 확률에만 썼는데, 본래 쓰임이 이것이다 — 값나가는 짐을 위험한 구간으로
   나르면 인수업자가 그만큼 뗀다.

   ★ 이 항목이 게임의 성장 브레이크다. 초반엔 곡물·소금을 안전한 이웃 항구로 나르니
     거의 0이고, 커져서 향신료·비단을 먼 구간으로 나르기 시작하면 급격히 무거워진다.
     "돈이 되는 곳에는 대가가 있다"를 비용 쪽에서 받는 장치. */
/** 이 항차에 실은 짐에 붙는 보험료. 내해·육로(risk=null)는 0. */
export function insuranceFor({ from = state.at, to = null, value = null } = {}) {
  const risk = to == null ? null : routeRisk(from, to);
  if (!risk) return 0;
  const v = value == null ? cargoValue(from) : value;
  return Math.round((v * risk / 100) * INSURANCE_RATE);
}

/* ── 공동해손 — 보험이 실제로 보상하는 사건 ────────────────────
   보험료를 걷으면서 보상하는 사건이 없으면 그것은 보험이 아니라 세금이다.
   사료에서 보험이 문 것은 전손과 **투하**(jettison)였다 — 폭풍에 배를 살리려
   짐을 바다에 던지는 것. 그래서 폭풍이 심하면 화물을 잃고, 잃은 값의 일부를 보험이 문다.

   보상률을 요율 계수와 같은 값으로 두는 이유: 게임은 사료 요율의 30%만 걷는다
   (`INSURANCE_RATE`). 30%만 내고 100%를 받으면 보험이 공짜 이익이 되므로
   **낸 만큼만 받는다**. 손해는 남지만 파산까지는 안 가는 크기가 된다. */
export function jettisonOdds({ from = state.at, to = null } = {}) {
  const risk = to == null ? null : routeRisk(from, to);
  if (!risk) return 0;                       // 내해·육로에는 폭풍 투하가 없다
  return Math.min(0.55, JETTISON_BASE + risk * JETTISON_PER_PCT);
}

/** 짐을 던진다. 실은 것의 일부를 값이 **싼 것부터** 버린다 —
    선장이라면 당연히 그렇게 한다(비단을 먼저 던지지 않는다).
    돌려주는 값으로 로그·모달을 쓰고, 보상금은 여기서 바로 금고에 넣는다. */
export function jettisonCargo(share = 0.4, rand = Math.random) {
  const held = Object.entries(state.cargo).filter(([, n]) => n > 0);
  if (!held.length) return null;

  const cheapFirst = held.sort((a, b) =>
    (state.prices[state.at]?.[a[0]] ?? GOOD_BY_ID[a[0]].base) -
    (state.prices[state.at]?.[b[0]] ?? GOOD_BY_ID[b[0]].base));

  const total = held.reduce((a, [, n]) => a + n, 0);
  let toss = Math.max(1, Math.round(total * share * (0.7 + rand() * 0.6)));
  const lost = {};
  let value = 0;
  for (const [gid, have] of cheapFirst) {
    if (toss <= 0) break;
    const n = Math.min(have, toss);
    state.cargo[gid] = have - n;
    if (!state.cargo[gid]) delete state.cargo[gid];
    lost[gid] = n;
    value += (state.buyPrice[gid] || GOOD_BY_ID[gid].base) * n;
    toss -= n;
  }
  const payout = Math.round(value * INSURANCE_COVER);
  state.gold += payout;
  book('income', 'insurance', payout);
  return { lost, value: Math.round(value), payout };
}

/* ── 뭍의 사고 ────────────────────────────────────────────────
   내해·육로 구간의 위험. 바다와 성격이 다르다 —
     · 노상강도는 **값나가는 것부터** 집어간다(투하와 정반대다. 강도는 고르니까).
     · 통행세는 화물이 아니라 금화를 문다. 싸우거나 도망칠 여지가 없는 대신 값이 얕다.
   둘 다 보험이 보상하지 않는다. 해상보험은 바다의 위험만 인수했다. */
export function banditRaid(rand = Math.random) {
  const held = Object.entries(state.cargo).filter(([, n]) => n > 0);
  if (!held.length) return { lost: {}, value: 0 };
  // 값비싼 것부터 — 강도는 고른다
  const dearFirst = held.sort((a, b) =>
    (state.prices[state.at]?.[b[0]] ?? GOOD_BY_ID[b[0]].base) -
    (state.prices[state.at]?.[a[0]] ?? GOOD_BY_ID[a[0]].base));

  const total = held.reduce((a, [, n]) => a + n, 0);
  let take = Math.max(1, Math.round(total * INLAND_LOSS.banditShare * (0.6 + rand() * 0.8)));
  const lost = {};
  let value = 0;
  for (const [gid, have] of dearFirst) {
    if (take <= 0) break;
    const n = Math.min(have, take);
    state.cargo[gid] = have - n;
    if (!state.cargo[gid]) delete state.cargo[gid];
    lost[gid] = n;
    value += (state.buyPrice[gid] || GOOD_BY_ID[gid].base) * n;
    take -= n;
  }
  return { lost, value: Math.round(value) };
}

export function payToll(rand = Math.random) {
  const v = cargoValue();
  const fee = Math.min(state.gold, Math.round(v * INLAND_LOSS.tollRate * (0.7 + rand() * 0.6)));
  state.gold -= fee;
  book('outgo', 'port', fee);
  return { fee };
}

export function armsUpkeep(arms = state.arms) {
  let sum = 0;
  for (const [kind, n] of Object.entries(arms || {})) sum += (ARM_UPKEEP[kind] || 0) * n;
  return sum;
}

export function voyageCost(days, crew = state.crew, leg = null) {
  // 일당은 무리마다 다르다 — 술집에서 누구를 태웠는지가 여기서 값으로 돌아온다.
  const wages = Math.round(crew * avgCrewWage() * days);
  const supplies = Math.round(crew * SUPPLY_UNIT * days);
  const fleet = fleetUpkeep() * days;
  // 기함 선체 유지 — 삭구·타르·펌프질. 예전에는 "기함은 선원 급여로 갈음한다"며 뺐는데,
  // 그러면 배를 키워도 고정비가 안 늘어 후반이 너무 풍족해진다(실측 90항차 +65%).
  // 큰 배를 몰수록 무거워지는 값이라 성장에 브레이크를 거는 자리다.
  const hull = Math.round((SHIPS[state.shipKey].upkeep || 0) * HULL_UPKEEP * days);
  const arms = Math.round(armsUpkeep() * days);
  const insurance = leg ? insuranceFor(leg) : 0;
  // 부관 급여 — 벌든 못 벌든 나간다. 선원 급여와 섞지 않고 따로 세운다:
  // 뭉뚱그리면 "부관을 데리고 있는 값"이 얼마인지 플레이어가 읽을 수 없다.
  const officer = state.officer ? Math.round(OFFICER.wage * days) : 0;
  return {
    wages, supplies, fleet, hull, arms, officer, insurance,
    total: wages + supplies + fleet + hull + arms + officer + insurance,
  };
}

/** 항해 1구간 진행 — 날짜·보급·유지비·급여 발생·누수·시장 회복
 *
 *  ★ **급여는 여기서 나가지 않는다.** 날마다 쌓아 두었다가(`state.payroll.due`)
 *    달마다 항구에서 치른다(`settlePayroll`). 사료에서도 선원 삯은 항해가 끝나거나
 *    달이 바뀔 때 치렀고, 식량·물은 출항 전에 사야 했다 — 그래서 둘을 가른다.
 *    게임에서 이 구분이 중요한 이유는 **못 주는 상태가 존재하게** 되기 때문이다.
 *    매일 금고에서 빼 버리면 체불이라는 사건 자체가 생기지 않는다. */
/* ── 항구에서 날을 보낸다 (A-1b) ───────────────────────────────
   ★ **정박 중인 날이 공짜였다.** 날은 `advanceDays()`에서만 가는데 그것은 항해할 때만 불린다 —
   그래서 항구에 서 있는 동안은 급여도 보급도 유지비도 나가지 않았다.
   소설이 이 자리에서 게임과 가장 크게 어긋났다: 아덴 억류·반다 반년·아바나 한 해 대기가
   **게임에서는 아무 대가가 없는 일**이었고, 그 규약이 없으면 급여 위기 네 장면이 통째로 사라진다
   (`story/GAME-LINK.md §8` A-1b).

   ── 정박은 항해보다 싸다 ─────────────────────────────────────
   보급(`SUPPLY_UNIT`)은 절반만 든다(뭍에서 사 먹는다), 선체·무장 유지비와 **급여는 그대로**다.
   ★ 그래서 **사람이 곧 시계**가 된다 — 기다리는 것이 공짜가 아니면 "언제 떠나나"가 판단이 된다.

   ── 창고가 있으면 사람을 내려놓을 수 있다 ────────────────────
   `dischargeCrew()`가 선원을 내리면 급여 시계가 멈춘다. 다시 태우는 값은 `HIRE_UNIT`의 절반 —
   그 사람들이 이 항구에 그대로 있기 때문이다. **거점이 있어야 그 선택지가 생긴다**(A-1과 짝). */
export const PORT_SUPPLY_RATE = 0.5;
export const RECALL_RATE = 0.5;

export function portDayCost(days = 1) {
  /* 항해비와 **같은 식**을 쓰되 보급만 절반이다 — 뭍에서는 사 먹기 때문이다.
     `voyageCost`가 그 계산의 정본이므로 여기서 다시 쓰지 않는다(값이 갈리면 안 된다). */
  const v = voyageCost(days, state.crew, null);
  const supplies = Math.round(v.supplies * PORT_SUPPLY_RATE);
  const now = supplies + v.hull + v.arms + v.fleet;     // 지금 나가는 것
  return { ...v, supplies, now, total: now + v.wages + v.officer };
}

/** 항구에서 며칠을 보낸다 — 세계는 돌고, 삯은 쌓이고, 짐은 그대로다 */
export function waitDays(n = 1) {
  if (n <= 0) return { ok: false, reason: '하루는 지나야 한다' };
  state.day += n;
  decayInfamy(n);

  const c = portDayCost(n);
  c.now += yardUpkeepPerDay() * n;      // 넓힌 부두는 놀려도 값이 나간다
  const before = state.gold;
  const r = payFine(c.now, '정박 유지비', { ledger: false });
  const paidNow = before - state.gold;
  const share = c.now > 0 ? paidNow / c.now : 0;
  const sup = Math.round(c.supplies * share);
  book('outgo', 'supplies', sup);
  book('outgo', 'upkeep', paidNow - sup);
  if (r.owed > 0) {
    pushLog(`정박 중에도 값은 나간다 — ${r.owed.toLocaleString('ko-KR')}닢을 못 내 빚으로 남았다.`, 'bad');
  }

  // 급여는 발생주의 — 정박 중에도 날마다 쌓인다(치르는 것은 급여일)
  state.payroll.due += c.wages + c.officer;
  book('outgo', 'wages', c.wages);
  book('outgo', 'officer', c.officer);
  if (state.officer) state.officer.paid += c.officer;

  // 시장은 회복하고 사건은 익는다 — 기다리는 것이 전략이 되려면 세계가 돌아야 한다
  const keep = MARKET.decay ** n;
  for (const cityId of Object.keys(state.impact)) {
    const row = state.impact[cityId];
    for (const gid of Object.keys(row)) {
      row[gid] *= keep;
      if (row[gid] < 1) delete row[gid];
    }
    if (!Object.keys(row).length) delete state.impact[cityId];
  }
  const shocks = rollShockEvents(n);
  return { ok: true, days: n, cost: c, unpaid: r.owed, shocks };
}

/** 사람을 내려놓는다 — 창고가 있는 항구에서만. 급여 시계가 멈춘다. */
export function dischargeCrew() {
  if (!storeCap(state.at)) return { ok: false, reason: '내려놓을 데가 없다 — 이 항구에 창고가 필요하다' };
  if (state.crew <= 0) return { ok: false, reason: '갑판이 이미 비었다' };
  const n = state.crew;
  const m = (state.holdings[state.at] ??= { paid: state.day, spent: 0 });
  m.ashore = (m.ashore ?? 0) + n;
  state.crew = 0;
  state.bands = [];
  trimLoadout();
  pushLog(`${CITY_BY_ID[state.at].name}에 선원 ${n}명을 내려놓았다. 삯이 멎는다.`, 'warn');
  return { ok: true, n };
}

/** 내려놓은 사람을 다시 태운다 — 새로 뽑는 값의 절반 */
export function recallCrew() {
  const m = state.holdings?.[state.at];
  const n = m?.ashore ?? 0;
  if (!n) return { ok: false, reason: '이 항구에 내려놓은 사람이 없다' };
  const room = Math.min(n, state.crewMax - state.crew);
  if (room <= 0) return { ok: false, reason: '갑판에 자리가 없다' };
  const cost = Math.round(HIRE_UNIT * RECALL_RATE * room);
  if (cost > state.gold) return { ok: false, reason: `금화가 ${(cost - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  state.gold -= cost;
  book('outgo', 'port', cost);
  state.crew += room;
  m.ashore = n - room;
  pushLog(`${CITY_BY_ID[state.at].name}에서 ${room}명을 다시 태웠다 (−${cost.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, n: room, cost };
}

export function advanceDays(n, leg = null) {
  state.day += n;
  /* 악명은 잊힌다 — 40일마다 한 칸씩. 지워 주는 것이 아니라 **한 번 크게 턴 값이
     오래가되 영원하지는 않게** 두는 것이다(`INFAMY.decayDays`). */
  decayInfamy(n);
  const c = voyageCost(n, state.crew, leg);

  // 즉시 나가는 것 — 물자와 배에 드는 돈은 외상이 안 된다
  const now = c.supplies + c.fleet + c.hull + c.arms + c.insurance + yardUpkeepPerDay() * n;
  /* ★ 금고가 모자라면 부족분이 **소리 없이 사라지고 있었다**(`Math.max(0, …)`만 있었다).
     가난할수록 항해비를 덜 내는 셈이라, 파산 직전이 오히려 싸게 다니는 구멍이었다.
     그다음엔 항해일지에 알리기만 했는데, 그러자 **경고 문장이 거짓**이 됐다 —
     *"다음 항구에서 물건을 팔지 못하면 배가 서게 된다"*고 여섯 항차를 말하고도 아무 일이 없었다
     (완주 플레이 ISSUES #4·#13). 가난이 아무것도 막지 않으면 파산이 성립하지 않는다.
     그래서 **못 낸 몫을 빚으로 넘긴다**(`payFine`) — 급여일에 선원보다 먼저 걷히고 이자가 붙는다.
     배를 세우지 않는 이유는 그러면 항구에 갇혀 빠져나갈 길이 없어지기 때문이다.
     **길은 열어 두되 값은 남긴다.** */
  const before = state.gold;
  const r = payFine(now, '보급·유지비', { ledger: false });
  const unpaid = r.owed;
  if (unpaid > 0) {
    pushLog(`금고가 비어 보급·유지비 ${unpaid.toLocaleString('ko-KR')}닢을 치르지 못했다.`
            + ' 그만큼이 빚으로 남아 급여일에 이자와 함께 걷힌다.', 'bad');
  }
  /* 장부는 **실제로 나간 만큼**만 갈래별로 적는다(빚으로 넘어간 몫은 급여일에 적힌다).
     반올림 오차가 금고와 어긋나지 않게 **마지막 갈래가 나머지를 흡수**한다 —
     `test-payroll`의 "금고 증감이 장부와 맞는다"가 이것을 지킨다. */
  const paidNow = before - state.gold;
  const share = now > 0 ? paidNow / now : 0;
  const sup = Math.round(c.supplies * share);
  const upk = Math.round((c.fleet + c.hull + c.arms) * share);
  book('outgo', 'supplies', sup);
  book('outgo', 'upkeep', upk);
  book('outgo', 'insurance', paidNow - sup - upk);

  // 쌓이는 것 — 급여
  state.payroll.due += c.wages + c.officer;
  book('outgo', 'wages', c.wages);
  book('outgo', 'officer', c.officer);
  if (state.officer) state.officer.paid += c.officer;   // 급여와 성과급을 따로 센다

  // 삭은 배는 항해할수록 물이 샌다
  let leak = 0;
  const lk = ship().leak || 0;
  if (lk > 0) {
    leak = Math.min(state.hp - 1, lk * n);
    if (leak > 0) state.hp -= leak;
  }

  // 시장은 날이 지나면 회복한다 (그래서 같은 항구를 계속 쥐어짜지 못한다)
  const keep = MARKET.decay ** n;
  for (const cityId of Object.keys(state.impact)) {
    const row = state.impact[cityId];
    for (const gid of Object.keys(row)) {
      row[gid] *= keep;
      if (row[gid] < 1) delete row[gid];
    }
    if (!Object.keys(row).length) delete state.impact[cityId];
  }

  // 사건이 만든 시장 충격 — 날이 차면 걷히고, 그 사이 새 사건이 일어난다
  pruneShocks();
  const shocks = rollShockEvents(n);

  const expired = checkContractDue();
  refreshPrices();
  return { ...c, leak, expired, shocks };
}

/* ── 급여 정산 ────────────────────────────────────────────────
   달마다 항구에서 급여를 치른다. **바다에서는 정산하지 않는다** — 돈을 줄 데가 없고,
   못 주는 상황을 항해 중에 터뜨리면 플레이어가 손쓸 방법이 없다.
   항구에 들어와야 판정이 나므로, 급여일이 다가오면 "얼마를 벌어서 들어갈 것인가"가 압박이 된다.

   못 주면 **반란이 아니라 이탈**이다. 배를 빼앗기는 것이 아니라 사람이 조용히 사라지고,
   갈 때 **돈 되는 짐을 들고 간다** — 밀린 삯을 제 손으로 챙겨 가는 것이다.
   그래서 체불의 대가가 "게임 오버"가 아니라 "다음 장사 밑천이 줄어드는 것"이 된다. */
/** 지금 정산할 때가 됐나 (항구에 있을 때만 참) */
export function paydayDue() {
  return state.day >= state.payroll.nextDue && (state.payroll.due > 0 || state.payroll.arrears > 0);
}

/** 오늘은 "짐을 팔고 오겠다"고 미뤄 둔 상태인가 — 같은 날 항구 안에서만 유효하다.
    **떠날 때는 안 봐준다**(출항 단추가 다시 띄운다). */
export const paydayDeferred = () => state.payroll.deferredDay === state.day;

/** 다음 급여일까지 남은 날 */
export const daysToPayday = () => Math.max(0, state.payroll.nextDue - state.day);

/** 이번에 치러야 할 총액(이번 달 발생분 + 지난 체불) */
export const payrollOwed = () => state.payroll.due + state.payroll.arrears;

/** 무리 하나가 들고 갈 짐을 고른다 — **값나가는 것부터**.
    폭풍 투하(싼 것부터)와 정반대다. 훔쳐 가는 쪽은 고르기 때문이다. */
function stealCargo(headcount, rand = Math.random) {
  const held = Object.entries(state.cargo).filter(([, n]) => n > 0);
  if (!held.length) return { lost: {}, value: 0 };
  const dearFirst = held.sort((a, b) =>
    (state.prices[state.at]?.[b[0]] ?? GOOD_BY_ID[b[0]].base) -
    (state.prices[state.at]?.[a[0]] ?? GOOD_BY_ID[a[0]].base));

  // 한 사람이 지고 갈 수 있는 만큼 — 2~4칸. 무리가 클수록 손실이 크다
  let take = Math.max(1, Math.round(headcount * (2 + rand() * 2)));
  const lost = {};
  let value = 0;
  for (const [gid, have] of dearFirst) {
    if (take <= 0) break;
    const n = Math.min(have, take);
    state.cargo[gid] = have - n;
    if (!state.cargo[gid]) { delete state.cargo[gid]; delete state.buyPrice[gid]; }
    lost[gid] = n;
    value += (state.prices[state.at]?.[gid] ?? GOOD_BY_ID[gid].base) * n;
    take -= n;
  }
  return { lost, value: Math.round(value) };
}

/** 급여를 치른다. 금고가 모자라면 **낼 수 있는 만큼 내고** 나머지는 체불로 넘긴다.
    돌려주는 값이 그대로 정산 화면의 재료다. */
export function settlePayroll(rand = Math.random) {
  /* ★ **빌린 돈이 먼저다.** 전주는 급여일에 맞춰 사람을 보내고, 선원보다 먼저 받아 간다 —
     그것이 이 돈이 무이자가 아닌 이유이자 빌리는 것이 위험한 이유다.
     금고가 모자라면 갚은 만큼만 줄고 나머지는 이자가 한 번 더 붙어 다음 달로 넘어간다. */
  const loan = state.boons?.loan;
  let loanPaid = 0, loanLeft = 0;
  if (loan && state.day >= loan.due) {
    loanPaid = Math.min(state.gold, loan.owed);
    state.gold -= loanPaid;
    if (loanPaid) book('outgo', 'port', loanPaid);
    const rest = loan.owed - loanPaid;
    if (rest > 0) {
      loan.owed = Math.round(rest * BOON.loanRate);
      loan.due = state.day + BOON.loanDays;
      loanLeft = loan.owed;
      pushLog(`빚 ${rest.toLocaleString('ko-KR')}닢을 못 갚아 `
            + `${loan.owed.toLocaleString('ko-KR')}닢으로 불었다.`, 'bad');
    } else {
      state.boons.loan = null;
      pushLog(`빌린 돈 ${loanPaid.toLocaleString('ko-KR')}닢을 갚았다.`, 'good');
    }
  }

  const owed = payrollOwed();
  const paid = Math.min(state.gold, owed);
  const missed = owed - paid;
  state.gold -= paid;

  const ratio = owed > 0 ? missed / owed : 0;   // 못 준 비율
  const deserted = [];

  for (const b of [...state.bands]) {
    const temper = CREW_TRAITS[b.trait]?.temper ?? 0.6;
    if (ratio > 0) b.unrest = Math.min(1.5, (b.unrest || 0) + ratio * (1 - temper) * UNREST_PER_MISS);
    else b.unrest = Math.max(0, (b.unrest || 0) - UNREST_HEAL);

    if (b.unrest < DESERT_AT) continue;
    // 문턱을 넘었다고 반드시 떠나지는 않는다 — 불만이 클수록 확률이 오른다.
    // 확정으로 두면 한 번 밀린 달에 갑판이 통째로 비어 회복할 여지가 없다.
    if (rand() > b.unrest - DESERT_AT + 0.15) continue;

    const loot = stealCargo(b.n, rand);
    state.crew = Math.max(0, state.crew - b.n);
    state.bands.splice(state.bands.indexOf(b), 1);
    deserted.push({ name: b.name, n: b.n, trait: b.trait, ...loot });
  }
  if (deserted.length) trimLoadout();

  state.payroll.arrears = missed;
  state.payroll.due = 0;
  // 밀렸어도 다음 급여일은 온다 — 밀린 달을 건너뛰면 체불이 벌이 안 된다
  while (state.payroll.nextDue <= state.day) state.payroll.nextDue += MONTH_DAYS;

  const closed = state.ledger;
  state.ledger = newLedger(state.day);
  return { owed, paid, missed, deserted, ledger: closed, arrears: missed, loanPaid, loanLeft };
}

/* ── 저 혼자 일어나는 사건 ────────────────────────────────────
   사료가 말하는 대박은 확률이 아니라 사건이다. 기근·봉쇄는 값을 올리고
   풍작·독점 붕괴는 내린다 — 오르기만 하면 "기다렸다 팔면 된다"가 되어 판단이 사라진다.
   `rand`를 받는 이유는 검증 스크립트가 시드를 고정해 발생률을 재기 때문이다. */
export function rollShockEvents(days, rand = Math.random) {
  const hit = [];
  /* ★ `perDay`는 **세계 전체에서** 하루에 몇 건이냐다. 도시가 16에서 175로 늘자
     한 도시가 사건을 겪는 주기가 20개월 → 216개월로 벌어져, "대박은 사건에서 나온다"는
     설계가 세계를 넓힌 것만으로 사실상 사라졌다. 도시 수로 환산해 **도시당 빈도**를
     지중해 시절과 같게 맞춘다 — 바다를 늘리면 사건도 따라 는다. → data.js: SHOCK.densityBase */
  const density = CITIES.length / (SHOCK.densityBase || CITIES.length);
  for (let d = 0; d < days; d++) {
    for (const ev of SHOCK.events) {
      if (rand() >= Math.min(0.4, ev.perDay * density)) continue;

      // 그 사건이 걸릴 수 있는 도시·품목 짝을 모은다.
      // ★ 후보를 여기서 만드는 이유: 도시나 품목을 늘리면 사건도 저절로 늘어난다.
      //   목록을 하드코딩하면 콘텐츠를 더할 때마다 여기를 고쳐야 하고, 결국 안 고친다.
      const pool = [];
      for (const c of CITIES) {
        const side = ev.kind === 'demand' ? c.demand : c.supply;
        for (const gid of Object.keys(side)) {
          if (ev.goods && !ev.goods.includes(gid)) continue;
          pool.push([c, gid]);
        }
      }
      if (!pool.length) continue;

      const [city, gid] = pool[Math.floor(rand() * pool.length)];
      const already = state.shocks.some((sh) => sh.city === city.id && sh.good === gid && sh.why === ev.id);
      addShock(city.id, gid, ev.mult, ev.days, ev.id);
      if (already) continue;

      const goodName = GOOD_BY_ID[gid].name;
      hit.push({
        kind: ev.id, name: ev.name, tone: ev.tone,
        city: city.id, cityName: city.name, good: gid, goodName,
        text: ev.line(city.name, goodName),
      });
      pushLog(ev.line(city.name, goodName), ev.tone === 'good' ? 'good' : 'warn');
    }
  }
  return hit;
}

/* ── 플레이어 백병전 병력 구성 ──────────────────────────────
   조선소 선원 탭에서 짠 갑판 배치가 그대로 백병전에 나간다. */
export function playerTroops() {
  const open = openSlots();
  const out = ['captain'];
  for (let i = 1; i < MELEE_SLOTS; i++) {
    if (i > open) break;
    if (state.loadout[i]) out.push(state.loadout[i]);
  }
  return out;
}

/** 판을 처음 상태로 되돌린다. `at`은 **시작할 부두**다(고르지 않으면 `DEFAULT_START`).
    ★ 시작지가 여기 한 곳에서만 정해진다 — 화면에 적는 문구는 상태에서 읽으므로(main.js: titleScreen)
      이 값을 바꾸면 타이틀·항구·선단 기록이 함께 따라온다. */
export function resetGame(at = DEFAULT_START, originId = null) {
  /* ★ **갈래가 시작 항구를 정한다.** 한반도 다섯 갈래(`data.js: ORIGINS`)는 저마다 다른 문으로
     바다에 나가므로 부두도 다르다 — 역관은 부산포, 종친·상인·서자는 마포(경강), 군관은 여수.
     `at`을 따로 주면 그쪽이 이긴다(디버그·다른 바다에서 시작할 때). */
  const origin = ORIGIN_BY_ID[originId] ?? null;
  if (origin && at === DEFAULT_START) at = origin.at;
  const s = SHIPS.hulk;
  const arms = { light: s.guns, medium: 0, long: 0 };
  Object.assign(state, {
    day: 1, gold: origin?.gold ?? START_GOLD, shipKey: origin?.ship ?? 'hulk',
    origin: origin?.id ?? null,
    hp: s.hp, maxHp: s.hp, crew: origin?.crew ?? 0, crewMax: s.crewMax,
    guns: s.guns, arms: { ...arms },
    refits: {}, shots: { grape: 0, chain: 0, heated: 0 },
    cargoCap: s.cargo,
    cargo: {}, buyPrice: {}, impact: {}, shocks: [], contract: null, npcs: [], at,
    infamy: {}, holdings: {}, stored: {}, yards: {}, ended: 0,
    boons: { permit: {}, smuggle: {}, repair: {}, reroll: {}, loan: null },
    officer: initialOfficer(),   // 에이미는 첫날부터 타고 있다 — 고르는 인물이 아니다
    bands: [], hired: [],        // 갑판이 비어 있다. 술집에서 사람을 모아야 배가 뜬다
    payroll: { due: 0, arrears: 0, nextDue: MONTH_DAYS, lastDay: 1, deferredDay: 0 },
    ledger: newLedger(1),
    fleet: { hulk: { at, hp: s.hp, arms: { ...arms }, refits: {} } },
    towing: null,
    loadout: ['captain', null, null, null, null, null],
    known: new Set(['venezia']), everOwned: new Set(['hulk']), log: [],
    stats: { battles: 0, wins: 0, profit: 0, distance: 0 },
  });
  trimLoadout();
  refreshPrices();
  pushLog(`베네치아 부두. 물이 새는 낡은 바사 한 척과 금화 ${START_GOLD}닢으로 시작한다.`, 'warn');
  pushLog('갑판에 사람이 없다. 술집에서 선원을 모으지 않으면 배는 뜨지 않는다.', 'warn');
  pushLog(`${OFFICER.name}${josa(OFFICER.name, '이/가')} 장부를 안고 갑판에 올라섰다. 급여 ${OFFICER.wage}닢/일.`, 'good');
}
