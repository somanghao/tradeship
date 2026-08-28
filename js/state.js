// state.js — 게임 상태와 규칙 (렌더링과 무관한 순수 로직)

import {
  GOODS, GOOD_BY_ID, CITIES, CITY_BY_ID, ROUTES, SHIPS, ENEMIES, SEA_EVENTS,
  CANNONS, CANNON_KEYS, CANNON_REFUND, TROOPS, TROOP_REFUND, MELEE_SLOTS,
  REFITS, SHOTS, MARKET, CURRENTS, TARIFF, CITY_TARIFF, SPREAD, CONTRACT, OFFICER,
  /* 두 회차가 같은 줄에 이름을 더했다 — 부동산·브레이크(#5·#6)와 계절(#4). 둘 다 필요하다. */
  ROUTE_RISK, ROUTE_SEASON, SEASON, riskKey, SHOCK, INLAND_ODDS, BOON, ROSTER, INFAMY, ORIGIN_BY_ID, DEFAULT_ORIGIN,
  SEA_ORIGINS, seaOriginAt,
  HOLDINGS, HOLDING_KEYS, HOLDING, ESTATE_KEYS, ESTATE, BANKRUPT, HULL, wreckShipOf, YARD_UPGRADE, YARD, CIVIC, ENDING, HEGEMONY,
  CONSIGN, LINE, FACTION, FACTION_TIES,
  TARIFF_SCALE, SEIZURE,
  CHAIN, CHAIN_BY_ID, WORKS, WORK,
  FACTIONS, REGARD,
  laneOf, sameRegion, isOceanLane, REGION_OF_CITY, REGIONS, REGION_BY_ID, HOME_REGION, citiesOfRegion, OCEAN_LANES,
  FOES_BY_REGION, ALL_PIRATES, ALL_MATES, COMMENDA,
  TAVERN, CREW_TRAITS, CREW_TRAIT_KEYS, CREW_NAMES, CREW_NAME_POOL, PIRATE_NAME_POOL,
  // ── 튜닝 상수 — 값은 data.js가 정본이고 여기서는 **쓰기만** 한다 ──
  START_GOLD, START_PORTS, DEFAULT_START, startShipAt, REPAIR_UNIT, HIRE_UNIT,
  CREW_WAGE, SUPPLY_UNIT, ARM_UPKEEP, HULL_UPKEEP,
  MONTH_DAYS, UNREST_PER_MISS, UNREST_HEAL, DESERT_AT,
  INSURANCE_RATE, INSURANCE_COVER, JETTISON_BASE, JETTISON_PER_PCT, INLAND_LOSS,
  INSURANCE_RATE_OCEAN, PRIVATE_TRADE, TOTAL_LOSS,
  INSURE_LOAD, INSURE_COVER_MIN, INSURE_COVER_MAX, STORM_WEIGHT, JETTISON_SHARE,
  ODDS_BASE, ODDS_PER_PCT, BASE_RISK, THREAT_PER_SHIP, ODDS_CAP,
  LURE_PER, LURE_PER_STEP, LURE_CAP,
  ZONE_FAR_FALL, ZONE_NEAR_FALL, ZONE_FLOOR,
  SHIP_RESALE, YARD_SLACK_OFF, YARD_SLACK_CAP, YARD_TRADITION_OFF,
  USED, PRIZE_HULL, PRIZE_SCRAP, PRIZE_CREW, FLEET,
  SPOILS_SHARE, SPOILS_TAIL, SPOILS_FLOOR, SPOILS_GOODS_PER_CREW, SPOILS_GOODS_CAP,
  /* 조우 손실 상한(2026-08-28) — 값은 data.js, 식은 이 파일 */
  ENCOUNTER_LOSS,
} from './data.js';
import { josa } from './josa.js';   // leaf 유틸 — 화면 헬퍼(ui.js)가 아니라 모듈 방향을 안 깬다

/* 튜닝 상수를 그대로 내보낸다 — **호출부는 예전처럼 `state.js`에서 가져와도 된다.**
   값의 정본은 `data.js`로 옮겼지만(로직 파일에서 밸런스를 찾지 않게), 이미 30곳 넘는
   import를 한꺼번에 고치면 그 커밋의 diff에서 정작 중요한 변화가 묻힌다.
   새로 쓰는 코드는 `data.js`에서 직접 가져오는 쪽이 뜻이 분명하다. */
export {
  START_GOLD, START_PORTS, DEFAULT_START, startShipAt, REPAIR_UNIT, HIRE_UNIT,
  CREW_WAGE, SUPPLY_UNIT, ARM_UPKEEP, HULL_UPKEEP,
  MONTH_DAYS, UNREST_PER_MISS, UNREST_HEAL, DESERT_AT,
  INSURANCE_RATE, INSURANCE_COVER, JETTISON_BASE, JETTISON_PER_PCT, INLAND_LOSS,
  INSURANCE_RATE_OCEAN, PRIVATE_TRADE, TOTAL_LOSS,
  INSURE_LOAD, INSURE_COVER_MIN, INSURE_COVER_MAX, STORM_WEIGHT, JETTISON_SHARE,
  ZONE_FAR_FALL, ZONE_NEAR_FALL, ZONE_FLOOR,
  SHIP_RESALE, YARD_SLACK_OFF, YARD_SLACK_CAP, YARD_TRADITION_OFF,
  USED, PRIZE_HULL, PRIZE_SCRAP, PRIZE_CREW, FLEET,
  SPOILS_SHARE, SPOILS_TAIL, SPOILS_FLOOR,
  TARIFF_SCALE, SEIZURE, ESTATE, ESTATE_KEYS,
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
  /* 지금 **함께 몰고 나가는** 배 — `shipKey -> { crew, captain }`. 기함은 여기 들어가지 않는다.
     배 자체(선체·무장·개장·정박지)는 그대로 `fleet`에 있고, 이쪽은 "따라 나섰는가"만 적는다.
     ★ 평범한 객체다(Set이 아니다) — `save.js`가 state를 통째로 직렬화하므로 그대로 실린다.
       `captain`은 **자리만 있고 아직 아무도 없다**(null 허용 · `data.js: FLEET.requireCaptain`). */
  consorts: {},
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

  /* ── 세력 관계 (SPEC-factions 1단계) ────────────────────────
     ★ **덮쳐도 아무도 화내지 않았다.** 악명은 깃발에 쌓이는데 깃발은 도시의 속성일 뿐이라,
       숫자 하나가 오를 뿐 *누가* 화났는지가 화면에 없었다. `regard`가 그 얼굴이다.
     ★ **이름이 `standing`이 아닌 이유** — `SPEC-supremacy.md`가 `STANDING`(국세 · 나라의 형세)을
       이미 그 말로 쓴다. 셋이 뒤섞이면 나중에 어느 것을 고치는지 아무도 모른다
       (`state.industry`로 한 번 겪은 함정이다). *"그 세력이 나를 어떻게 보는가"* → `regard`.
     ★ **저장이 둘인 것은 붙는 대상이 달라서다** — 악명은 깃발 28종, 관계는 세력 10.
       화면에는 **합쳐진 하나**만 뜬다(`regardOf` = raw − 그 세력 깃발의 악명).
     ★ 평범한 객체·숫자다(`Set` 금지) — `save.js`가 `state`를 통째로 직렬화한다. */
  regard: {},                // 세력 id → −10…+10 (악명을 빼기 **전**의 raw)
  _regardAge: 0,             // 삭음 누적일 — 90일마다 한 칸씩 0 쪽으로 (`decayRegard`)

  /* ── 거점과 보관 화물 (A-1) ────────────────────────────────
     `holdings[cityId] = { rental:true, warehouse:true, … , paid: 마지막 유지비 낸 날 }`
     `stored[cityId]  = { goodId: 수량 }` — **여기 있는 짐은 시장을 누르지 않는다.** */
  holdings: {},
  stored: {},
  /* 공업력 승급(A-2) — `yards[cityId] = { boost, building: { to, until }, civic, civicBuilding }`
     ★ **`boost`(내 돈으로 산 승급)와 `civic`(나라가 지어 준 조선소)을 갈라 센다**(C-18).
       섞으면 나중에 판정이 갈리지 않는다 — 「내가 올린 것」과 「무역이 올린 것」이
       화면에서도 규칙에서도 다른 길이기 때문이다. `industryOf`가 둘을 더한다. */
  yards: {},
  /* ★ **그 항구에 낸 세**(C-18) — `dues[cityId] = 누적 닢`. 나라가 조선소를 짓는 지표다.
     사용자 원문 *"그 국가에 이익이 쌓이면"*. 새 수입원이 아니라 **이미 내던 세를 세는 것**이다. */
  dues: {},
  /* 수직계열화 시설(A-9) — `works[cityId] = { paid, spent, missed, '<종>:<품목>': {…} }`.
     ★ **`holdings`와 갈라 둔 것이 이 필드의 존재 이유다** — `hegemonyOf`가 `holdings`를
       세므로 같은 그릇에 담으면 권역 패권 조건이 조용히 바뀐다. → `data.js: WORK` 머리주석 */
  works: {},
  /* 꺾은 상대의 기록 — `{ '<권역>:t<등급>': 날, 'pirate:<명부id>': 날 }`. 권역 패권 조건 ③이 읽는다.
     ★ **평범한 객체다(Set이 아니다)** — `save.js`가 `state`를 통째로 JSON으로 눕히므로
       Set을 새로 만들면 `SET_KEYS`에 손을 대야 하고, 그 목록은 조용히 낡는다.
       날짜를 값으로 두면 "언제 꺾었나"까지 남아 나중에 화면이 쓸 수 있다. */
  /* 아직 못 받은 **현상금** — `[{ name, coin }]`. 나포심판이 항구에서 치르는 돈이라
     싸움터가 아니라 **다음 입항**에서 들어온다(`payBounties`). 옮겨 싣는 것이 아니므로
     `capLoot`을 안 지난다(P6-2 · `data.js: SPOILS_*` 주석의 정당화가 여기엔 안 맞는다). */
  bountyDue: [],
  /* 들러 보진 않았지만 **값은 아는 항구** — `{ <도시id>: 들은 날 }`.
     ★ `known`(실제로 들른 곳)과 **갈라 둔다.** `metFactions()`가 `known`을 세어
       「만난 세력」을 내므로, 소문으로 들은 항구를 거기 섞으면 **가 본 적 없는 세력을
       만난 것으로** 센다(실제로 그렇게 깨졌다). 소문은 소문의 자리에 둔다. */
  scouted: {},
  /* 태운 동료 — `{ <동료id>: { day, joint, stake, earned } }`. 코멘다 계약이 그 모양이다
     (`data.js: COMMENDA`). 동행선의 선장 자리를 채우는 것도 이들이다(`consorts[].captain`). */
  mates: {},
  slain: {},
  /* 초무(招撫)한 자 — `{ <명부id>: 날 }`. 격파(`slain`)와 **같은 무게로 명부를 닫는다**
     (SPEC-supremacy §1-3 (c) · `world.js: rosterClosed`가 둘을 함께 읽는다).
     ★ `slain`과 나란히 **여기 선언해 두어야** `resetGame`이 비우는 것을 빠뜨리지 않는다 —
       `??=`로만 만들면 새 판에 옛 판의 초무가 살아남는다. Set이 아니라 평범한 객체다. */
  tamed: {},
  ended: 0,                  // 끝을 본 날 (0이면 아직)
  endedNine: 0,              // 두 번째 끝 「아홉 바다」를 본 날 (0이면 아직)
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
/** 선단 전체의 적재량 — 기함 + 동행선의 화물칸 합.
    ★ 동행 선단의 **첫째 이득**이 이것이다. `cargoFree()`가 이 값을 보므로
      매매·전리품·계약이 전부 늘어난 칸을 쓴다. */
export function cargoCapTotal() {
  let cap = state.cargoCap;
  for (const key of consortKeys()) cap += SHIPS[key]?.cargo || 0;
  return cap;
}
export function cargoFree() {
  return cargoCapTotal() - cargoUsed();
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
   ★ 항목은 **수입 6 · 지출 9**로 고정한다. 늘리려면 화면(정산 모달)도 함께 본다 —
     이름만 늘고 화면에 안 나오면 "적히지 않은 돈"이 생긴 것처럼 보인다. */
export const LEDGER_INCOME = ['sales', 'contracts', 'loot', 'salvage', 'insurance', 'estate'];
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
    /* 품목이 없는 충격이 있다 — **관세 폭탄**은 도시에만 걸린다(`good: null`).
       예전 코드는 `?? s.good`이라 화면에 `null`이 찍혔을 자리다. */
    goodName: s.good == null ? '입항세' : (GOOD_BY_ID[s.good]?.name ?? s.good),
    tariff: s.good == null,
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
  return raw * (1 - Math.min(0.75, officerPerk('impactOff') + originPerk('impactOff') + matePerk('impactOff')));
}

export function addPressure(cityId, goodId, n) {
  const c = (state.impact[cityId] ||= {});
  c[goodId] = (c[goodId] || 0) + n;
}

/** n개 매입 총액 / 매각 총액 — 수량이 늘수록 불리해진다 */
/* ★ **두 구간이다**(2단계 · SPEC-vertical §2-5). 앞의 `밭 재고`칸은 **원가**(−12~24%)이고
   시장 압력을 안 받는다 — 자기 밭에서 실었기 때문이다. 그 위는 지금까지와 똑같다.
   ⚠️ `buy()`의 이분 탐색은 **단조 증가**를 전제한다. 원가 < 시세이므로 단조는 유지되지만,
     그것을 사람 눈으로 믿지 않고 `test-rules`가 매번 확인한다("원가 구간이 섞여도 단조인가"). */
export function costFor(goodId, n, cityId = state.at) {
  if (n <= 0) return 0;
  const unit = state.prices[cityId][goodId];
  const g = growReady(goodId, cityId);
  const own = Math.min(n, g.n);
  const rest = n - own;
  /* 밭 몫은 압력을 **일으키지도 받지도** 않는다. 나머지 칸의 압력도 `rest` 기준으로 잰다 —
     밭에서 실은 칸까지 시장 물량으로 세면 자기 밭이 제 시세를 밀어 올린다. */
  const ownCost = unit * own * (1 - g.off);
  /* ★ **쥔 자리에서 무는 웃돈**(A-10 2단계) — 그 세력이 앉은 도시에서 그 세력이 쥔 품목을
     살 때만 붙는다. 밖에서는 안 붙으므로 답은 언제나 **딴 데서 사는 것**이고,
     그 답이 곧 항로가 길어진다는 대가다. ⚠️ **수량과 무관한 상수 배율**이라
     `buy()`의 이분 탐색이 전제하는 단조 증가가 안 깨진다. */
  const grip = 1 + gripMarkup(goodId, cityId);
  const restCost = rest > 0 ? unit * rest * (1 + impactFactor(cityId, goodId, rest)) : 0;
  return Math.round((ownCost + restCost) * grip);
}
export function gainFor(goodId, n, cityId = state.at) {
  if (n <= 0) return 0;
  return Math.round(state.prices[cityId][goodId] * n * (1 - impactFactor(cityId, goodId, n)));
}

/** 지금 팔면 **금고에 실제로 들어오는 돈** — `sell()`이 떼는 것을 다 뗀 뒤의 값.
    입항세 → 부관 성과급 → 동료 코멘다 → 선원 사무역, **순서까지 `sell()`과 같다**(고칠 땐 둘을 함께).
    ★ 미리보기와 실제가 갈리면 안내가 거짓말이 된다 — 바닥 안내(C-17 `salvage`)가 이 값을 적는다.
      `gainFor`(세전 총액)를 그대로 적었더니 413닢이라 적고 368닢이 들어왔다. */
export function sellNet(goodId, n, cityId = state.at) {
  if (n <= 0) return 0;
  const raw = gainFor(goodId, n, cityId);
  const gain = raw - Math.round(raw * tariffRate(cityId));
  const profit = gain - (state.buyPrice[goodId] || 0) * n;
  if (profit <= 0) return gain;          // 밑진 거래에서는 아무도 떼지 않는다
  let left = profit;
  const cut = state.officer ? Math.round(left * OFFICER.cut) : 0;
  left -= cut;
  const mrate = mateCut();
  const mcut = left > 0 && mrate > 0 ? Math.round(left * mrate) : 0;
  left -= mcut;
  const prate = privateTradeCut();
  const pcut = left > 0 && prate > 0 ? Math.round(left * prate) : 0;
  return gain - cut - mcut - pcut;
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
  /* ★ **밭에서 실은 몫은 시장을 안 누른다**(2단계). 재고에서 빼고, 남은 칸만 압력이 된다. */
  const grown = takeGrown(goodId, max);
  if (max - grown > 0) addPressure(state.at, goodId, max - grown);
  return { ok: true, qty: max, cost, unit: Math.round(cost / max), grown,
           base: state.prices[state.at][goodId] };
}

/** 그 항구가 매기는 입항세 — 부관 특전을 **빼기 전**의 값.
    항구의 성질을 적는 자리(대시보드 표·근거 검증)는 반드시 이쪽을 쓴다.
    `tariffRate()`를 쓰면 부관이 탔는지에 따라 같은 항구가 6.0%도 되고 3.9%도 된다. */
export function baseTariff(cityId = state.at) {
  const size = CITY_BY_ID[cityId]?.size;
  return CITY_TARIFF[cityId] ?? TARIFF[size] ?? 0.045;
}

/* ── 총자산 ────────────────────────────────────────────────────
   **금화만 보면 "방금 배를 샀는가"에 지배된다** — 부관 효과를 잴 때 이것 때문에 부호가
   뒤집힌 적이 있다(wiki/officer.md). 그래서 규모를 물을 때는 언제나
   **다 팔면 얼마인가**로 센다 — 금화 + 선단 매각가 + 거점·시설 회수가.
   대시보드 `wages.mjs: netWorth`가 같은 정의(금화+선단)를 쓰고 있었는데 게임 쪽에는 없어
   계측기에만 있던 개념이었다 — 여기로 올리고 부동산·시설까지 넣는다.
   ★ 거점·시설은 **`holdingsValue`·`worksValue`를 그대로 쓴다.** "내 재산이 얼마인가"의
     정의가 두 개가 되면 어느 쪽이 옳은지 아무도 모르게 된다. */
export function netWorth() {
  let w = state.gold;
  const keys = new Set([...Object.keys(state.fleet || {}), state.shipKey]);
  for (const k of keys) if (SHIPS[k]) w += resaleOf(k);
  return w + holdingsValue() + worksValue();
}

/** 후반 브레이크 — 자산이 클수록 관이 더 뜯는다. 가난하면 1.0 (→ data.js: TARIFF_SCALE) */
export function tariffScale(worth = netWorth()) {
  const over = Math.max(0, worth - TARIFF_SCALE.from);
  return 1 + Math.min(TARIFF_SCALE.cap - 1, (over / TARIFF_SCALE.per) * TARIFF_SCALE.step);
}

/** 지금 이 항구에 걸린 **관세 폭탄**의 곱 (없으면 1).
    `state.shocks`를 그대로 쓰되 품목이 없는 것(`good == null`)만 읽는다 — 시세 쪽
    `shockFactor`는 품목이 맞아야 곱하므로 둘이 서로를 밟지 않는다. */
export function tariffShockFactor(cityId = state.at) {
  let f = 1;
  for (const s of state.shocks) if (s.city === cityId && s.good == null) f *= s.mult;
  return Math.min(SHOCK.cap, f);
}

/** 감면 총합(off)에서 실제 무는 세율까지 — 바닥·상관·부두 가산·**후반 브레이크**를 한곳에 모은다.
    `tariffRate()`와 `tariffCutPreview()`가 같이 쓴다. 이 계산을 두 곳에 따로 베끼면
    "지금 세율"과 "이 문서를 사면 얼마가 되나"가 서로 다른 공식으로 어긋나기 쉽다. */
function tariffFromOff(off, cityId) {
  /* 악명은 **깎는 것들과 반대 방향**으로 붙는다 — 문서를 쥐고도 털고 다니면 그 문서가 무색해진다. */
  const rate = baseTariff(cityId) * Math.max(BOON.tariffFloor, 1 - off) * (1 + infamyTariffUp(cityId));
  /* 상관은 **비율이 아니라 자릿수**를 깎는다(−1.5%p) — 제 이름으로 통관하기 때문이다.
     그래도 바닥(1%)은 있다. 제도는 피해 갈 수 있되 없어지지 않는다. */
  /* 부두를 넓힌 항구는 세가 조금 오른다 — 늘어난 것을 관이 안 볼 리 없다(등급당 +0.5%p) */
  const yardUp = yardBoost(cityId) * YARD.tariffPerBoost;
  const before = hasHolding('factory', cityId)
    ? Math.max(HOLDING.tariffFloorPt, rate - (HOLDINGS.factory.tariffCut ?? 0)) + yardUp
    : rate + yardUp;

  /* ── 후반 브레이크 (#6) ────────────────────────────────────
     ★ 누진과 관세 폭탄은 **깎는 것들이 다 끝난 뒤에** 곱한다. 순서를 바꾸면 문서·밀수가
       누진분까지 깎아 버려, 정작 커진 상인이 가장 잘 빠져나가는 꼴이 된다.
     ★ `ceil`은 **막다른 골목 금지**다 — 누진(×1.85)·악명(×2.6)·폭탄(×2.2)이 다 겹치면
       실효세가 30%를 넘어 *팔수록 손해*가 되는데, 그건 값을 물리는 게 아니라 길을 막는 것이다.
       이 프로젝트는 같은 자리에서 두 번 "막지 않고 값을 물린다"를 골랐다. */
  return Math.min(TARIFF_SCALE.ceil, before * tariffScale() * tariffShockFactor(cityId));
}

/** 지금 우리가 실제로 무는 입항세율 — 부관이 서류를 갖추면 덜 뗀다 */
export function tariffRate(cityId = state.at) {
  /* 부관이 깎고, **문서와 밀수가 또 깎는다.** 셋은 곱이 아니라 합으로 두되 바닥을 둔다 —
     감합·카르타스를 쥐고 밀수업자까지 끼면 세가 0이 되어 제도가 사라지기 때문이다.
     제도는 피해 갈 수 있어야 하지만 **없어지면 안 된다**(그것이 이 세계의 이야기다). */
  const off = officerPerk('tariffOff') + originPerk('tariffOff', cityId) + matePerk('tariffOff') + boonTariffOff(cityId);
  return tariffFromOff(off, cityId);
}

/** 세를 깎는 인물 서비스(permit·smuggle)를 사면 **이 항구에서 지금 실제로** 세가 얼마나 내려가나.
    화면(구매 전 안내·구매 후 결과 문구)이 이걸 보여줘야 "종친이 문서를 사도 한 닢도 안 내려가는데
    아무 표시가 없다"는 결함이 재발하지 않는다(원인 — royal+에이미는 이미 바닥(`BOON.tariffFloor`)
    아래에 눌려 있어 문서분(35%p)을 더해도 `Math.max(floor, …)`에 막혀 buy가 무효가 된다).
    ⚠️ 이미 그 서비스를 갖고 있어도(갱신 구매) delta는 "지금부터 새로 얻는 몫"이 아니라
    "이 서비스가 없다면 얼마나 더 물었을까"를 보여준다 — 갱신은 만료를 늦추는 것이지 감면을
    다시 얻는 게 아니므로, 상시 갖고 있다고 가정한 delta를 보여주는 쪽이 "이 서비스의 값어치"를
    더 정직하게 답한다. */
export function tariffCutPreview(kind, cityId = state.at) {
  const before = tariffRate(cityId);
  const addOff = kind === 'permit' ? BOON.permitTariffOff : kind === 'smuggle' ? BOON.smuggleTariffOff : 0;
  if (!addOff) return { before, after: before, delta: 0 };
  const active = kind === 'permit'
    ? (state.boons?.permit?.[REGION_OF_CITY[cityId]] ?? 0) > state.day
    : (state.boons?.smuggle?.[cityId] ?? 0) > state.day;
  // 이미 갖고 있으면 그 몫은 지금 세율에 이미 반영돼 있다 — 다시 더하면 두 번 깎는 꼴이 된다.
  const off = officerPerk('tariffOff') + originPerk('tariffOff', cityId) + matePerk('tariffOff') + boonTariffOff(cityId)
            + (active ? 0 : addOff);
  const after = tariffFromOff(off, cityId);
  return { before, after, delta: Math.max(0, before - after), active };
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

/** 이 항구에 그 거점을 **가지고 있나** — 소유만 본다(문을 닫았어도 내 것이다).
    패권 집계(`hegemonyOf`)가 세는 것이 이쪽이다. */
export const ownsHolding = (kind, cityId = state.at) => !!state.holdings?.[cityId]?.[kind];

/** 그 거점이 지금 **일하고 있나** — 특전을 읽는 자리는 전부 이쪽이다.
    ★ 유지비가 밀려 문을 닫으면(`settleHolding`) 소유는 유지되지만 특전은 멈춘다.
      "문을 닫은 상관은 상관이 아니다" — 유예가 공짜가 아니게 하는 자리다. */
export const hasHolding = (kind, cityId = state.at) => {
  const m = state.holdings?.[cityId];
  return !!m?.[kind] && !m.idle;
};

/* ── 시세를 아는 항구 (P5) ────────────────────────────────────
   ★ `state.known`은 원래 「가 본 항구」였는데, 그것이 곧 **「값을 아는 항구」**다 —
   못 가 본 곳은 항로 카드가 *"시세는 닿아야 안다"*로 막는다. 그래서 초행이 늘 손해였다
   (conquest ISSUES #16 · 8항차 23일에 6,661 → 5,448닢).
   두 길로 연다. **둘 다 보너스가 아니라 정보다** — 차익 자체는 한 톨도 안 바뀐다.
     ① 거점(임차창고 이상)이 선 항구는 그 값이 내게 온다 (`HOLDINGS.rental.priceTip` · 사료: 팩토리아)
     ② 처음 닿은 항구가 **직항 이웃 몇 곳**의 값을 함께 연다 (`HOLDING.scoutNeighbors` · 부두의 소문) */

/** 그 항구에 「값을 알려 주는」 거점이 서 있나 — 문을 닫았으면(`idle`) 소식도 끊긴다 */
export function holdingTip(cityId) {
  const m = state.holdings?.[cityId];
  if (!m || m.idle) return false;
  return HOLDING_KEYS.some((k) => m[k] && HOLDINGS[k].priceTip);
}

/** 지금 이 항구의 시세를 알 수 있나 — **들렀거나 · 소문을 들었거나 · 거점이 섰거나** */
export const priceKnown = (cityId) =>
  state.known.has(cityId) || !!state.scouted?.[cityId] || holdingTip(cityId);

/** 항구에 닿았다 — 그 항구와 **가까운 직항 이웃 몇 곳**의 값이 열린다.
    ★ 도착 처리가 있는 자리(`scenes/map.js: arrive` · `port.js`)는 전부 이 함수를 부른다.
      `state.known.add`를 손으로 쓰면 이웃이 안 열려 초행 벌금이 그대로 남는다. */
export function knowPort(cityId = state.at) {
  state.known.add(cityId);                 // 여기는 **들른** 곳이다
  delete state.scouted?.[cityId];          // 소문으로만 알던 곳이면 이제 진짜로 안다
  const n = HOLDING.scoutNeighbors ?? 0;
  if (n <= 0) return { opened: [] };
  const opened = neighborsOf(cityId)
    .filter((to) => !priceKnown(to))
    .sort((a, b) => voyageDays(cityId, a) - voyageDays(cityId, b))
    .slice(0, n);
  const m = (state.scouted ??= {});
  for (const to of opened) m[to] = state.day;   // 이쪽은 **소문**이다 — 세력을 만난 것이 아니다
  return { opened };
}

/** 유지비가 밀려 문을 닫았나 */
export const holdingIdle = (cityId = state.at) => !!state.holdings?.[cityId]?.idle;

/** 그 거점의 값 — 도시 규모(또는 공업력)에 따라 다르다.
    등급이 있는 부동산(`shop`·`inn`)은 **다음 등급의 값**을 돌려준다. */
export function holdingPrice(kind, cityId = state.at) {
  const h = HOLDINGS[kind];
  const c = CITY_BY_ID[cityId];
  if (!h || !c) return Infinity;
  if (h.grades) return estatePrice(kind, estateGrade(kind, cityId) + 1, cityId);
  /* ⚠️ `priceByIndustry`(공업력에 비례하던 부두값) 분기는 사라졌다 — C-18에서 부두가
     거점 목록을 떠났고, 그 값 공식을 쓰던 유일한 거점이었다. */
  return h.priceBase + (c.size ?? 1) * (h.priceBySize ?? 0);
}

/* ── 수익형 부동산 (#5) ────────────────────────────────────────
   ★ 등급은 **`state.holdings[city][kind]`에 숫자로** 들어간다(1·2·3). 기존 다섯은 `true`라
     `hasHolding`의 `!!`가 둘 다 참으로 읽는다 — 세이브 모양이나 다른 규칙을 안 건드린다. */

/** 지금 등급 (0이면 없다) */
export function estateGrade(kind, cityId = state.at) {
  const v = state.holdings?.[cityId]?.[kind];
  return typeof v === 'number' ? v : (v ? 1 : 0);
}

/** 그 등급의 정의 (1부터) */
export const estateDef = (kind, grade) => HOLDINGS[kind]?.grades?.[grade - 1] ?? null;

/** 그 등급을 통째로 지을 때의 값 — 승급은 **차액만** 문다(`estateUpgradeCost`) */
export function estatePrice(kind, grade, cityId = state.at) {
  const g = estateDef(kind, grade);
  const c = CITY_BY_ID[cityId];
  if (!g || !c) return Infinity;
  return g.priceBase + (c.size ?? 1) * (g.priceBySize ?? 0);
}

/** 한 등급 올리는 값 — 자리와 자재를 그대로 쓰므로 **차액**이다 */
export function estateUpgradeCost(kind, cityId = state.at) {
  const now = estateGrade(kind, cityId);
  if (!now || now >= (HOLDINGS[kind]?.grades?.length ?? 0)) return Infinity;
  return estatePrice(kind, now + 1, cityId) - estatePrice(kind, now, cityId);
}

/** 승급할 수 있나 — **공업력이 등급의 문**이다(사용자 원문: "승급은 공업력으로 올려도 되고").
    나라가 지은 조선소(`CIVIC`)와 A-2 승급(`YARD_UPGRADE`)으로 올린 공업력이 여기서 두 번째 쓸모를 얻는다. */
export function canUpgradeEstate(kind, cityId = state.at) {
  const h = HOLDINGS[kind];
  if (!h?.grades) return { ok: false, reason: '등급이 없는 거점이다' };
  const now = estateGrade(kind, cityId);
  if (!now) return { ok: false, reason: `${h.name}${josa(h.name, '이/가')} 먼저다` };
  if (now >= h.grades.length) return { ok: false, reason: '이미 꼭대기다' };
  const next = h.grades[now];        // 0-based → 다음 등급
  const ind = industryOf(cityId);
  if (ind < (next.industry ?? 0)) {
    return { ok: false, reason: `이 항구 공업력이 ${next.industry} 이상이어야 한다 (지금 ${ind})` };
  }
  const price = estateUpgradeCost(kind, cityId);
  if (price > state.gold) {
    return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  }
  return { ok: true, price, to: now + 1, name: next.name };
}

export function upgradeEstate(kind, cityId = state.at) {
  const r = canUpgradeEstate(kind, cityId);
  if (!r.ok) return r;
  state.gold -= r.price;
  book('outgo', 'ships', r.price);
  const m = (state.holdings[cityId] ??= { paid: state.day, spent: 0 });
  m[kind] = r.to;
  m.spent = (m.spent ?? 0) + r.price;      // 유지비는 들인 돈 전체에 붙는다
  pushLog(`${CITY_BY_ID[cityId].name}의 ${HOLDINGS[kind].name}${josa(HOLDINGS[kind].name, '을/를')} `
        + `${r.name}(으)로 올렸다 (−${r.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: r.price, to: r.to };
}

/** 그 부동산이 빌 확률 — **고급일수록 크다.** 축은 둘뿐이다(항구 규모 · 그 깃발의 악명).
    → 근거와 왜 이 둘인지는 `data.js: ESTATE` 주석. */
export function vacancyOdds(kind, cityId = state.at, grade = estateGrade(kind, cityId)) {
  const g = estateDef(kind, grade);
  if (!g) return 0;
  const c = CITY_BY_ID[cityId];
  const size = c?.size ?? 2;
  const fame = state.infamy?.[c?.flag] ?? 0;
  const v = g.vacancy - ESTATE.sizeRelief * (size - 2) + ESTATE.infamyPer * fame;
  return Math.max(ESTATE.floor, Math.min(ESTATE.ceil, v));
}

/** 만실일 때 한 기간(30일)에 들어오는 세 */
export function estateRent(kind, cityId = state.at, grade = estateGrade(kind, cityId)) {
  const g = estateDef(kind, grade);
  if (!g) return 0;
  return Math.round(estatePrice(kind, grade, cityId) * g.yield * (HOLDING.upkeepEvery / 360));
}

/** 그 기간에 손님이 들었나 — **결정론적**이다(시세 `wobble`과 같은 이유: 드나들며 다시 굴릴 수 없게). */
export function estateOccupied(kind, cityId, period) {
  let h = 2166136261;
  const s = `${cityId}|${kind}|${period}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000 >= vacancyOdds(kind, cityId);
}

/** 이 항구에서 밀린 기간 수 (유지비·세가 같은 시계를 쓴다) */
function holdingPeriods(cityId) {
  const m = state.holdings?.[cityId];
  if (!m) return 0;
  return Math.floor((state.day - (m.paid ?? state.day)) / HOLDING.upkeepEvery);
}

/** 이 항구의 부동산이 지금까지 벌어 둔 세 — 기간마다 공실을 따로 굴린다.
    ★ **공실이면 그 달은 0**이고 유지비는 그대로 나가므로 **마이너스**가 된다.
      이것이 없으면 고급 여관이 그냥 돈 찍는 기계다(설계의 심장). */
export function holdingIncomeDue(cityId) {
  const m = state.holdings?.[cityId];
  if (!m) return { gold: 0, rows: [] };
  /* ★ **문을 닫은 동안에는 한 닢도 안 들어온다.** 유예(`m.idle`)가 공짜면 미납이 답이 된다 —
     유지비는 절반만 나가는데 세는 그대로 들어오는 꼴이 되기 때문이다. */
  if (m.idle) return { gold: 0, rows: [], idle: true };
  const periods = holdingPeriods(cityId);
  if (periods <= 0) return { gold: 0, rows: [] };
  const base = Math.floor((m.paid ?? state.day) / HOLDING.upkeepEvery);
  let gold = 0;
  const rows = [];
  for (const kind of ESTATE_KEYS) {
    const grade = estateGrade(kind, cityId);
    if (!grade) continue;
    const rent = estateRent(kind, cityId, grade);
    let full = 0, empty = 0;
    for (let p = 0; p < periods; p++) {
      if (estateOccupied(kind, cityId, base + p)) { full++; gold += rent; } else empty++;
    }
    rows.push({ kind, grade, name: estateDef(kind, grade).name, rent, full, empty });
  }
  return { gold, rows };
}

/** 살 수 있나 — 앞 단계가 있어야 하는 것들이 있다(창고 없이 상관을 열 수 없다) */
export function canBuyHolding(kind, cityId = state.at) {
  const h = HOLDINGS[kind];
  if (!h) return { ok: false, reason: '그런 거점은 없다' };
  /* ★ 여기서만 `ownsHolding`을 쓴다 — 문을 닫은 거점도 **내 것**이라 다시 살 수 없다.
     `hasHolding`(특전용)으로 보면 휴업 중에 같은 거점을 또 사서 `spent`가 두 배가 된다. */
  if (ownsHolding(kind, cityId)) return { ok: false, reason: '이미 있다' };
  if (holdingIdle(cityId)) return { ok: false, reason: '유지비가 밀려 문을 닫았다' };
  if (h.requires && !ownsHolding(h.requires, cityId)) {
    const need = HOLDINGS[h.requires].name;
    return { ok: false, reason: `${need}${josa(need, '이/가')} 먼저다` };
  }
  /* ⚠️ 여기 있던 `dock` 분기는 사라졌다(C-18) — **부두는 살 수 있는 것이 아니다.**
     공업력을 올리는 것은 그 항구에 낸 세이고, 규칙은 `tickCivic`이 갖는다. */
  /* 부동산 1등급도 공업력 문을 통과해야 한다 — 「번화가」는 1등급부터 공업력 1을 요구하므로
     **나라가 조선소를 올린 항구라야 줄이 선다**(②와 ③이 여기서 맞물린다). */
  if (h.grades) {
    const need = h.grades[0].industry ?? 0;
    if (industryOf(cityId) < need) {
      return { ok: false, reason: `이 항구 공업력이 ${need} 이상이어야 한다` };
    }
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
  /* 등급이 있는 부동산은 **숫자**로 적는다(1등급). 나머지는 예전대로 `true` —
     `hasHolding`의 `!!`가 둘을 같게 읽으므로 다른 규칙은 그대로다. */
  m[kind] = HOLDINGS[kind].grades ? 1 : true;
  m.spent = (m.spent ?? 0) + r.price;      // 유지비는 **들인 돈 전체**에 붙는다
  pushLog(`${CITY_BY_ID[cityId].name}에 ${HOLDINGS[kind].name}${josa(HOLDINGS[kind].name, '을/를')} 두었다`
        + ` (−${r.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: r.price };
}

/** 이 항구에서 보관할 수 있는 칸 */
export function storeCap(cityId = state.at) {
  const m = state.holdings?.[cityId];
  if (!m || m.idle) return 0;      // 문을 닫으면 **새로 맡을 수 없다**(맡긴 것은 `takeGoods`로 찾아온다)
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

/** 30일마다 무는 거점 유지비 — 못 내면 문을 닫고, 두 번째에 압류된다 */
export function holdingUpkeepDue(cityId) {
  const m = state.holdings?.[cityId];
  if (!m) return 0;
  const days = state.day - (m.paid ?? state.day);
  if (!m.idle && days < HOLDING.upkeepEvery) return 0;
  /* ★ 문을 닫은 동안에는 **언제 들러도 밀린 몫이 걸려 있다**(최소 한 몫). 안 그러면 다음 청구일이
     올 때까지 낼 방법이 없어 "돈을 들고 왔는데 못 여는" 30일이 생기고, 그 30일 끝에 압류된다. */
  const periods = Math.max(m.idle ? 1 : 0, Math.floor(days / HOLDING.upkeepEvery));
  const full = (m.spent ?? 0) * HOLDING.upkeepRate * (HOLDING.upkeepEvery / 360) * periods;
  // 문을 닫은 동안에는 절반만 문다 — 사람이 덜 붙기 때문이다. 대신 **0은 아니다**(방치가 답이 되지 않게).
  return Math.round(full * (m.idle ? HOLDING.idleRate : 1));
}

/** 이 항구의 거점 유지비를 치르고 **부동산이 번 세를 걷는다**(항구에 들어올 때 · `settleWorks` 옆).
    ★ 시설과 **같은 모양으로 유예를 한 번 거친다** — 한 번은 문을 닫고, 두 번째에 압류다.
      전에는 유예가 없어 **3닢을 못 내 2,000닢짜리 거점이 그 자리에서 넘어갔다**(ISSUES #4).
      근거와 값은 `data.js: HOLDING`의 주석.
    ★ 세를 **먼저** 걷는다(#5) — 그래야 만실이면 유지비를 제가 벌어 내고, 공실이면 그 달이
      통째로 마이너스가 된다. 순서를 바꾸면 금고가 얕을 때 "세를 받고도 압류당하는" 일이 난다.
      **문을 닫은 동안에는 세도 안 들어온다**(`holdingIncomeDue`) — 닫힌 여관에 누가 묵겠나. */
export function settleHolding(cityId = state.at) {
  const m = state.holdings?.[cityId];
  if (!m) return null;
  const rent = holdingIncomeDue(cityId);
  const due = holdingUpkeepDue(cityId);
  if (due <= 0 && rent.gold <= 0) return null;
  if (rent.gold > 0) {
    state.gold += rent.gold;
    book('income', 'estate', rent.gold);
    const empty = rent.rows.reduce((a, r) => a + r.empty, 0);
    pushLog(`${CITY_BY_ID[cityId].name}의 부동산이 ${rent.gold.toLocaleString('ko-KR')}닢을 벌었다`
          + (empty ? ` (빈 달 ${empty}번).` : '.'), empty ? 'warn' : 'good');
  } else if (rent.rows.length) {
    pushLog(`${CITY_BY_ID[cityId].name}의 부동산이 내내 비어 있었다 — 들어온 것이 없다.`, 'bad');
  }
  if (due <= 0) return { due: 0, paid: 0, seized: false, rent };
  const paid = Math.min(state.gold, due);
  state.gold -= paid;
  if (paid) book('outgo', 'port', paid);
  m.paid = state.day;
  const name = CITY_BY_ID[cityId].name;
  if (paid >= due) {
    if (m.idle) {
      m.idle = false;
      pushLog(`${name} 거점이 다시 문을 열었다 — 밀린 유지비 ${due.toLocaleString('ko-KR')}닢을 냈다.`, 'good');
    } else {
      pushLog(`${name} 거점 유지비 ${due.toLocaleString('ko-KR')}닢을 냈다.`, 'warn');
    }
    m.missed = 0;
    return { due, paid, idle: false, seized: false, rent };
  }
  m.missed = (m.missed ?? 0) + 1;
  if (m.missed >= HOLDING.seizeAfter) {
    /* ★ 두 번째에 **압류**다. 거점은 자산이면서 고정비라, 후반이 "그냥 부자"가 아니라
       "더 벌지 않으면 지킬 수 없는" 구조가 된다. 짐도 함께 넘어간다. */
    const before = hegemonyOf(regionOf(cityId));
    delete state.holdings[cityId];
    const lostGoods = state.stored?.[cityId];
    if (lostGoods) delete state.stored[cityId];
    pushLog(`${name} 거점을 유지비 ${(due - paid).toLocaleString('ko-KR')}닢 때문에 빼앗겼다.`
          + (lostGoods && Object.keys(lostGoods).length ? ' 창고에 둔 짐도 함께 넘어갔다.' : ''), 'bad');
    hegemonyLoss(cityId, before);
    return { due, paid, idle: false, seized: true };
  }
  m.idle = true;
  pushLog(`${name} 거점이 유지비 ${(due - paid).toLocaleString('ko-KR')}닢을 못 채워 **문을 닫는다**.`
        + ' 한 번 더 밀리면 넘어간다.', 'bad');
  return { due, paid, idle: true, seized: false };
}

/** 이 항구의 거점을 통째로 판다 — **헐값이다**(`HOLDING.sellBack`).
    ★ 금고가 0일 때 자산을 갖고도 굶는 자리를 여는 문이다(ISSUES #3). 되파는 값이 들인 돈의
      40%뿐이라 이득이 될 수 없고, 그래서 **위기의 탈출구일 뿐 전략이 되지 않는다.**
      `sellMill`과 같은 갈래(`loot`)에 적는다 — 장부 항목을 늘리면 정산 모달도 함께 봐야 한다. */
/* ── 패권이 되돌아가는 것을 화면이 말한다 (A-8c) ────────────────
   ★ 41/41을 채운 뒤 금고가 0이 되자 압류가 돌아 `ports` 41/41 → 39/41, 진행도 3/4 → 2/4로
     내려갔다. **설계대로지만 로그 한 줄이 전부였다** — 무엇이 얼마나 되돌아갔는지 아무 데도 없었다.
     거점이 사라지는 자리(압류·매각·집행) 전부가 이 한 줄을 부른다. */
function hegemonyLoss(cityId, before) {
  if (!before) return;
  const after = hegemonyOf(before.region);
  if (after.ports.have >= before.ports.have && after.steps >= before.steps) return;
  pushLog(`${before.name}의 패권이 되돌아갔다 — 거점 ${before.ports.have}/${before.ports.need}`
        + ` → ${after.ports.have}/${after.ports.need}`
        + (after.steps < before.steps ? ` · 진행 ${before.steps}/4 → ${after.steps}/4` : '')
        + (before.done && !after.done ? ' · **패자 자리를 잃었다**' : ''), 'bad');
}

export function sellHolding(cityId = state.at) {
  const m = state.holdings?.[cityId];
  if (!m) return { ok: false, reason: '이 항구엔 거점이 없다' };
  const heg = hegemonyOf(regionOf(cityId));
  const back = Math.round((m.spent ?? 0) * HOLDING.sellBack);
  const kinds = HOLDING_KEYS.filter((k) => m[k]).map((k) => HOLDINGS[k].name);
  const lost = state.stored?.[cityId];
  const lostN = lost ? Object.values(lost).reduce((a, b) => a + b, 0) : 0;
  delete state.holdings[cityId];
  if (lost) delete state.stored[cityId];
  state.gold += back;
  if (back) book('income', 'loot', back);
  pushLog(`${CITY_BY_ID[cityId].name}의 ${kinds.join('·')}${josa(kinds.join('·'), '을/를')} 넘겼다`
        + ` (+${back.toLocaleString('ko-KR')}닢 — 들인 돈의 ${Math.round(HOLDING.sellBack * 100)}%).`
        + (lostN ? ` 창고에 둔 짐 ${lostN}개도 함께 넘어갔다.` : ''), 'warn');
  hegemonyLoss(cityId, heg);
  return { ok: true, back, kinds, storedLost: lostN };
}

/** 지금 거점을 다 넘기면 얼마가 돌아오나 — 화면·검증이 읽는다 */
export function holdingsValue(cityId = null) {
  const ids = cityId ? [cityId] : Object.keys(state.holdings ?? {});
  let v = 0;
  for (const id of ids) v += (state.holdings?.[id]?.spent ?? 0) * HOLDING.sellBack;
  return Math.round(v);
}

/* ── 수직계열화 ① 가공장 (A-9 1단계) ───────────────────────────
   값과 설계 근거는 `data.js: CHAIN·WORKS·WORK`, 사양은 `.claude/docs/SPEC-vertical.md`.

   ★ **`state.holdings`에 얹지 않고 `state.works`를 새로 둔다.** 이유가 결정적이다 —
     `hegemonyOf()`가 `state.holdings`를 세므로 같은 그릇에 담으면 **권역 패권 조건이
     조용히 바뀐다.** `HEGEMONY` 주석이 *"조건을 무겁게 하면 목표가 아니라 벌금이 된다"*고
     못박은 자리라 건드리지 않는다. 게다가 거점은 종류가 다섯인 **불리언 집합**인데
     시설은 `{level, job}`을 들어야 해서 애초에 모양이 다르다.

   ★ 이름이 `state.industry`가 아닌 이유 — `city.industry`(공업력)와 `state.yards`
     (공업력 승급)가 이미 그 말을 쓰고 있어 셋이 뒤섞인다.

   ★ **평범한 객체다(Set 금지).** `save.js`가 `state`를 통째로 JSON으로 눕히므로
     `SET_KEYS`에 손댈 일이 없다.

     works[cityId] = {
       paid: 마지막 유지비를 낸 날, spent: 들인 돈 누계, missed: 연속으로 못 낸 횟수,
       'mill:<산출품목>': { level, since, idle, job: { recipe, out:{gid:n}, until } },
     }

   ── 왜 창고가 먼저인가 ────────────────────────────────────────
   투입은 **창고에서 빠지고** 산출은 **창고로 들어온다**(배가 아니다). 산출물을 둘 데가
   있어야 하기 때문이고, 동시에 그것이 진입 문턱이 된다(창고는 `size × 8,000닢`). */

export const workKey = (kind, good) => `${kind}:${good}`;
/** 사슬의 대표 산출 품목 — 지금은 사슬마다 산출이 하나뿐이라 첫 키가 곧 그것이다 */
export const chainOut = (recipe) => Object.keys(recipe.out)[0];
export const chainOutUnits = (recipe) => Object.values(recipe.out).reduce((a, b) => a + b, 0);
export const chainInUnits = (recipe) => Object.values(recipe.in).reduce((a, b) => a + b, 0);

/** 산출 기준가 합 — 가공비(×`WORK.feeRate`)와 마진 밴드가 함께 읽는 값 */
export const chainOutValue = (recipe) =>
  Object.entries(recipe.out).reduce((a, [g, n]) => a + (GOOD_BY_ID[g]?.base ?? 0) * n, 0);
export const chainInValue = (recipe) =>
  Object.entries(recipe.in).reduce((a, [g, n]) => a + (GOOD_BY_ID[g]?.base ?? 0) * n, 0);
/** 가공마진 — `check-chain.mjs`가 이 값이 밴드 안인지 본다(코드가 정본) */
export const chainMargin = (recipe) => chainOutValue(recipe) / chainInValue(recipe);

export const worksOf = (cityId = state.at) => state.works?.[cityId] ?? null;
/** 그 항구의 시설 목록 — `[key, 시설]`. `paid`·`spent` 같은 살림 필드는 걸러 낸다. */
export function workList(cityId = state.at) {
  const m = state.works?.[cityId];
  if (!m) return [];
  return Object.entries(m).filter(([k]) => k.includes(':'));
}
export const workAt = (kind, good, cityId = state.at) =>
  state.works?.[cityId]?.[workKey(kind, good)] ?? null;
export const hasWork = (kind, good, cityId = state.at) => !!workAt(kind, good, cityId);
/** 그 사슬의 가공장 — 사슬 하나에 가공장 하나다(산출 품목이 열쇠) */
export const millOf = (recipeId, cityId = state.at) => {
  const r = CHAIN_BY_ID[recipeId];
  return r ? workAt('mill', chainOut(r), cityId) : null;
};
export const worksIdle = (cityId = state.at) => workList(cityId).some(([, w]) => w.idle);

/** 이 항구에서 지을 수 있는 사슬 — 공업력이 문지기다.
    ★ 광산 도시(포토시·우앙카벨리카)는 `industry 0`이고 A-2 부두 승급 대상도 아니라
      **영영 0이다.** 2단계에서 정련 사슬을 얹을 때 `req`를 2로 두면 그 사슬이 통째로 죽는다. */
export const millRecipes = (cityId = state.at) =>
  CHAIN.filter((r) => industryOf(cityId) >= r.req);

/* ══ 2단계 · 농장과 광산 (SPEC-vertical §2-4·2-5) ═══════════════════════
   ★ **이 층에서 처음 곡선이 움직인다.** 가공장만 있을 때는 원료를 시세로 사야 해서
     "거의 안 남는 것이 정상"이었다(`check-chain`의 대조식 1.15~1.22가 그 말이다).
     밭이 원료를 **원가로** 대 주는 순간 그 사슬이 남기 시작한다.
   ★ 밭에서 실은 몫은 **`addPressure`를 안 한다** — 시장에서 산 것이 아니기 때문이다.
     그 대신 **45일 상한**이 규모를 묶는다(넘으면 밭에서 썩는다). 창고 칸도 안 먹는다.
   ★ 농장이냐 광산이냐는 **`GOODS[].kind`**가 정한다(`crop`/`mineral`). 없으면 "은광석 농장"이
     지어진다 — 태그 90종을 그래서 붙였다. */

/** 이 품목에 어울리는 시설 종 — `farm` | `mine` | null */
export function growKind(goodId) {
  const k = GOOD_BY_ID[goodId]?.kind;
  if (k === 'crop') return 'farm';
  if (k === 'mineral') return 'mine';
  return null;                     // 사람이 만든 것(`craft`)은 밭에서 안 난다
}

/** 이 항구에 세울 수 있는 밭·광산 후보 — **그 도시가 실제로 내는 것**만 */
export function growCandidates(cityId = state.at) {
  const c = CITY_BY_ID[cityId];
  if (!c) return [];
  return Object.keys(c.supply ?? {})
    .filter((gid) => growKind(gid))
    .map((gid) => ({ gid, kind: growKind(gid), good: GOOD_BY_ID[gid] }));
}

/** 농장·광산 값 — `(3,000 + base×50) × (0.7 + 0.15×size)`.
    `level`은 가공장과 같은 규약이다 — **그 등급에 새로 내는 몫**(1→2가 0.80배, 2→3이 1.30배). */
export function growPrice(goodId, cityId = state.at, level = 1) {
  const kind = growKind(goodId);
  const g = GOOD_BY_ID[goodId];
  const c = CITY_BY_ID[cityId];
  if (!kind || !g || !c) return Infinity;
  const w = WORKS[kind];
  const size = c.size ?? 1;
  const full = (w.priceBase + g.base * w.priceByBase)
             * (WORK.farmPriceBySize.base + WORK.farmPriceBySize.per * size);
  return Math.round(full * (WORK.levelMul[level] ?? 1));
}

/** 하루에 밭에 쌓이는 칸 · 재고 상한 */
export const growRate = (kind, level = 1) => WORKS[kind]?.perDay?.[level] ?? 0;
export const growCap = (kind, level = 1) => growRate(kind, level) * (WORKS[kind]?.stockDays ?? 0);
/** 밭 재고까지는 이만큼 싸게 산다 */
export const growOff = (level = 1) => WORK.farmOff[level] ?? 0;

/** 마지막으로 본 날부터 오늘까지 쌓인 것을 반영하고 지금 재고를 돌려준다.
    ★ **읽을 때 정산한다**(lazy) — 날마다 도는 루프를 새로 만들지 않는다.
      `advanceDays`에 얹으면 아홉 바다 265항구를 매일 훑게 되고, 그것은 이 층이
      치를 값이 아니다. `since`가 마지막 정산일이다. */
export function growStock(goodId, cityId = state.at) {
  const kind = growKind(goodId);
  if (!kind) return 0;
  const w = workAt(kind, goodId, cityId);
  if (!w) return 0;
  const days = Math.max(0, state.day - (w.since ?? state.day));
  if (days > 0) {
    if (!w.idle) {
      const cap = growCap(kind, w.level);
      w.stock = Math.min(cap, (w.stock ?? 0) + days * growRate(kind, w.level));
    }
    w.since = state.day;           // 휴업 중이면 쌓지 않고 날짜만 넘긴다
  }
  return Math.floor(w.stock ?? 0);
}

/** 그 항구에서 밭이 대 주는 칸 수 — `costFor`가 이만큼을 싸게 판다 */
export function growReady(goodId, cityId = state.at) {
  const kind = growKind(goodId);
  const w = kind ? workAt(kind, goodId, cityId) : null;
  if (!w || w.idle) return { n: 0, off: 0, level: 0 };
  return { n: growStock(goodId, cityId), off: growOff(w.level), level: w.level };
}

/** 밭에서 실은 몫을 재고에서 뺀다 — `buy()`가 부른다 */
export function takeGrown(goodId, n, cityId = state.at) {
  const kind = growKind(goodId);
  const w = kind ? workAt(kind, goodId, cityId) : null;
  if (!w || n <= 0) return 0;
  const took = Math.min(n, Math.floor(w.stock ?? 0));
  w.stock = (w.stock ?? 0) - took;
  return took;
}

export function canBuyGrow(goodId, cityId = state.at) {
  const kind = growKind(goodId);
  if (!kind) return { ok: false, reason: '밭에서 나는 것이 아니다' };
  const c = CITY_BY_ID[cityId];
  if (!c?.supply?.[goodId]) return { ok: false, reason: '이 항구에서 나지 않는다' };
  if (workAt(kind, goodId, cityId)) return { ok: false, reason: '이미 있다' };
  if (!hasHolding('warehouse', cityId) && !hasHolding('factory', cityId)) {
    return { ok: false, reason: '창고가 먼저다' };
  }
  const list = workList(cityId);
  if (list.filter(([k]) => k.startsWith(kind + ':')).length >= WORKS[kind].perPort) {
    return { ok: false, reason: `${WORKS[kind].name}은 한 항구에 ${WORKS[kind].perPort}까지다` };
  }
  if (list.length >= WORK.perPort) return { ok: false, reason: `시설은 한 항구에 ${WORK.perPort}까지다` };
  const price = growPrice(goodId, cityId, 1);
  if (price > state.gold) {
    return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  }
  return { ok: true, price, kind };
}

export function buyGrow(goodId, cityId = state.at) {
  const c = canBuyGrow(goodId, cityId);
  if (!c.ok) return c;
  /* ★ **임자가 있는 자리에는 값이 붙는다**(A-10 §3-2). 막지는 않는다 — 막으면 사슬 여럿이
     관계 하나에 잠긴다(설탕=푼샬이 에스타두 · 은=포토시가 카사). 대신 값을 물리고,
     눈총 아래에서 세운 것은 **휴업으로 시작**해 유지비만 나간다. */
  const ent = workEntry(cityId);
  const fee = Math.round(c.price * ent.fee);
  if (c.price + fee > state.gold) {
    return { ok: false, reason: `입회비까지 ${(c.price + fee - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  }
  state.gold -= c.price + fee;
  book('outgo', 'ships', c.price + fee);
  const m = ((state.works ??= {})[cityId] ??= { paid: state.day, spent: 0, missed: 0 });
  m[workKey(c.kind, goodId)] = { level: 1, since: state.day, idle: ent.idle, stock: 0 };
  m.spent = (m.spent ?? 0) + c.price;
  noteEntry(ent, cityId);
  const nm = WORKS[c.kind].name, gn = GOOD_BY_ID[goodId].name;
  pushLog(`${CITY_BY_ID[cityId].name}에 ${gn} ${nm}${josa(nm, '을/를')} 세웠다`
        + ` (−${c.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: c.price, kind: c.kind };
}

export function canUpgradeGrow(goodId, cityId = state.at) {
  const kind = growKind(goodId);
  const w = kind ? workAt(kind, goodId, cityId) : null;
  if (!w) return { ok: false, reason: '없다' };
  if (w.level >= WORK.levelCap) return { ok: false, reason: '더 올릴 수 없다' };
  const price = growPrice(goodId, cityId, w.level + 1);
  if (price > state.gold) {
    return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  }
  return { ok: true, price, to: w.level + 1, kind };
}

export function upgradeGrow(goodId, cityId = state.at) {
  const c = canUpgradeGrow(goodId, cityId);
  if (!c.ok) return c;
  const w = workAt(c.kind, goodId, cityId);
  growStock(goodId, cityId);            // 올리기 전에 그동안 쌓인 것을 정산한다
  state.gold -= c.price;
  book('outgo', 'ships', c.price);
  state.works[cityId].spent += c.price;
  w.level = c.to;
  const gn = GOOD_BY_ID[goodId].name;
  pushLog(`${CITY_BY_ID[cityId].name} ${gn} ${WORKS[c.kind].name}${josa(WORKS[c.kind].name, '을/를')}`
        + ` ${c.to}등급으로 올렸다 (−${c.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: c.price, level: c.to };
}

/** 매각 — 가공장과 같은 회수율(60%). 쌓여 있던 재고는 함께 넘어간다. */
export function sellGrow(goodId, cityId = state.at) {
  const kind = growKind(goodId);
  const w = kind ? workAt(kind, goodId, cityId) : null;
  if (!w) return { ok: false, reason: '없다' };
  let spent = 0;
  for (let lv = 1; lv <= w.level; lv++) spent += growPrice(goodId, cityId, lv);
  const back = Math.round(spent * WORK.sellBack);
  const m = state.works[cityId];
  delete m[workKey(kind, goodId)];
  m.spent = Math.max(0, (m.spent ?? 0) - spent);
  if (!workList(cityId).length) delete state.works[cityId];
  state.gold += back;
  book('income', 'loot', back);
  const gn = GOOD_BY_ID[goodId].name;
  pushLog(`${CITY_BY_ID[cityId].name} ${gn} ${WORKS[kind].name}${josa(WORKS[kind].name, '을/를')} 넘겼다`
        + ` (+${back.toLocaleString('ko-KR')}닢 — 들인 돈의 ${Math.round(WORK.sellBack * 100)}%).`, 'warn');
  return { ok: true, back, spent };
}

/* ══ 3단계 · 판매소 · 위탁 · 정기선 (SPEC-vertical §2-5·3) ══════════════
   ★ **경계 하나가 이 층의 전부다 — 유통은 짐을 옮기기만 하고 사고팔지 않는다.**
     자동으로 시세를 보고 사고파는 창구를 만들면 최적 플레이가 *"항로를 걸어 놓고
     지켜본다"*가 되고, 그 순간 이 게임의 몸통(항구를 눌러 사고파는 것)이 사라진다.
     유일한 예외가 **판매소의 위탁 판매**인데 그것도 ①이미 산 물건을 ②수수료 12%를 물고
     ③하루 3~8칸씩만 ④**그 항구에 들러야 정산된다** — 자동화가 아니라 **느린 매도 창구**다. */

/** 그 항구의 그 품목 판매소 */
export const shopAt = (goodId, cityId = state.at) => workAt('shop', goodId, cityId);

/** 팔 때 시장에 쌓이는 압력을 이만큼 덜어 준다 (0이면 판매소가 없다).
    ★ **팔 때만이다.** 살 때도 깎으면 같은 항구에서 사고팔기를 되풀이하는 무한 루프가 열린다. */
export function shopCut(goodId, cityId = state.at) {
  const w = shopAt(goodId, cityId);
  return w && !w.idle ? (WORK.shopCut[w.level] ?? 0) : 0;
}

/** 판매소 값 — `(2,000 + base×22) × size` */
export function shopPrice(goodId, cityId = state.at, level = 1) {
  const g = GOOD_BY_ID[goodId], c = CITY_BY_ID[cityId];
  if (!g || !c) return Infinity;
  const w = WORKS.shop;
  const full = (w.priceBase + g.base * w.priceByBase) * (c.size ?? 1);
  return Math.round(full * (WORK.levelMul[level] ?? 1));
}

export function canBuyShop(goodId, cityId = state.at) {
  const c = CITY_BY_ID[cityId];
  if (!c?.demand?.[goodId]) return { ok: false, reason: '이 항구가 원하지 않는다' };
  if (shopAt(goodId, cityId)) return { ok: false, reason: '이미 있다' };
  if (!hasHolding('warehouse', cityId) && !hasHolding('factory', cityId)) {
    return { ok: false, reason: '창고가 먼저다' };
  }
  const list = workList(cityId);
  if (list.filter(([k]) => k.startsWith('shop:')).length >= WORKS.shop.perPort) {
    return { ok: false, reason: `판매소는 한 항구에 ${WORKS.shop.perPort}까지다` };
  }
  if (list.length >= WORK.perPort) return { ok: false, reason: `시설은 한 항구에 ${WORK.perPort}까지다` };
  const price = shopPrice(goodId, cityId, 1);
  if (price > state.gold) {
    return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  }
  return { ok: true, price };
}

export function buyShop(goodId, cityId = state.at) {
  const c = canBuyShop(goodId, cityId);
  if (!c.ok) return c;
  state.gold -= c.price;
  book('outgo', 'ships', c.price);
  const ent = workEntry(cityId);
  const fee = Math.round(c.price * ent.fee);
  if (fee > state.gold) return { ok: false, reason: `입회비 ${fee.toLocaleString('ko-KR')}닢이 모자란다` };
  state.gold -= fee;
  if (fee) book('outgo', 'ships', fee);
  const m = ((state.works ??= {})[cityId] ??= { paid: state.day, spent: 0, missed: 0 });
  m[workKey('shop', goodId)] = { level: 1, since: state.day, idle: ent.idle, stock: 0, proceeds: 0 };
  m.spent = (m.spent ?? 0) + c.price;
  noteEntry(ent, cityId);
  const gn = GOOD_BY_ID[goodId].name;
  pushLog(`${CITY_BY_ID[cityId].name}에 ${gn} 판매소를 열었다 (−${c.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: c.price };
}

export function canUpgradeShop(goodId, cityId = state.at) {
  const w = shopAt(goodId, cityId);
  if (!w) return { ok: false, reason: '판매소가 없다' };
  if (w.level >= WORK.levelCap) return { ok: false, reason: '더 올릴 수 없다' };
  const price = shopPrice(goodId, cityId, w.level + 1);
  if (price > state.gold) {
    return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  }
  return { ok: true, price, to: w.level + 1 };
}

export function upgradeShop(goodId, cityId = state.at) {
  const c = canUpgradeShop(goodId, cityId);
  if (!c.ok) return c;
  shopTick(goodId, cityId);                 // 올리기 전에 그동안 팔린 것을 정산한다
  const w = shopAt(goodId, cityId);
  state.gold -= c.price;
  book('outgo', 'ships', c.price);
  state.works[cityId].spent += c.price;
  w.level = c.to;
  pushLog(`${CITY_BY_ID[cityId].name} ${GOOD_BY_ID[goodId].name} 판매소를 ${c.to}등급으로 올렸다`
        + ` (−${c.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: c.price, level: c.to };
}

/** 매각 — 남은 위탁 재고는 창고로 돌아온다(창고가 좁으면 그만큼만) */
export function sellShop(goodId, cityId = state.at) {
  const w = shopAt(goodId, cityId);
  if (!w) return { ok: false, reason: '판매소가 없다' };
  shopTick(goodId, cityId);
  if ((w.proceeds ?? 0) > 0) return { ok: false, reason: '팔린 돈부터 걷어야 한다' };
  let spent = 0;
  for (let lv = 1; lv <= w.level; lv++) spent += shopPrice(goodId, cityId, lv);
  const back = Math.round(spent * WORK.sellBack);
  const left = Math.floor(w.stock ?? 0);
  const m = state.works[cityId];
  delete m[workKey('shop', goodId)];
  m.spent = Math.max(0, (m.spent ?? 0) - spent);
  if (!workList(cityId).length) delete state.works[cityId];
  if (left > 0) {
    const room = storeCap(cityId) - storedUsed(cityId);
    const put = Math.min(left, Math.max(0, room));
    if (put > 0) {
      ((state.stored ??= {})[cityId] ??= {})[goodId] = ((state.stored[cityId] ?? {})[goodId] ?? 0) + put;
    }
  }
  state.gold += back;
  book('income', 'loot', back);
  pushLog(`${CITY_BY_ID[cityId].name} ${GOOD_BY_ID[goodId].name} 판매소를 넘겼다`
        + ` (+${back.toLocaleString('ko-KR')}닢).`, 'warn');
  return { ok: true, back, spent };
}

/** 창고 재고를 판매소에 넘긴다 — 하루 3~8칸씩 그날 시세로 팔린다 */
export function consignToShop(goodId, n, cityId = state.at) {
  const w = shopAt(goodId, cityId);
  if (!w) return { ok: false, reason: '판매소가 없다' };
  if (w.idle) return { ok: false, reason: '휴업 중이다' };
  const have = (state.stored?.[cityId] ?? {})[goodId] ?? 0;
  const take = Math.min(n, have);
  if (take <= 0) return { ok: false, reason: '창고에 그 물건이 없다' };
  shopTick(goodId, cityId);
  state.stored[cityId][goodId] = have - take;
  if (!state.stored[cityId][goodId]) delete state.stored[cityId][goodId];
  w.stock = (w.stock ?? 0) + take;
  return { ok: true, n: take };
}

/** 마지막으로 본 날부터 팔린 만큼을 `proceeds`에 쌓는다 (lazy — 밭과 같은 방식).
    ★ **금고로 자동 입금하지 않는다.** 그 항구에 들러 `collectShop`을 눌러야 들어온다(§3-1). */
export function shopTick(goodId, cityId = state.at) {
  const w = shopAt(goodId, cityId);
  if (!w) return 0;
  const days = Math.max(0, state.day - (w.since ?? state.day));
  w.since = state.day;
  if (!days || w.idle || (w.stock ?? 0) <= 0) return 0;
  const sold = Math.min(Math.floor(w.stock), days * (WORK.shopFlow[w.level] ?? 0));
  if (sold <= 0) return 0;
  w.stock -= sold;
  /* 그날 시세로 판다. 시장 압력은 **안 쌓는다** — 하루 몇 칸씩 흘린 것이라 시장이 소화한다.
     그 대신 수수료 12%와 입항세를 문다. */
  const unit = state.prices[cityId]?.[goodId] ?? GOOD_BY_ID[goodId].base;
  const raw = Math.round(unit * sold);
  const fee = Math.round(raw * WORK.shopFee);
  const tax = Math.round(raw * baseTariff(cityId));
  noteDues(cityId, tax);      // 판매소가 문 세도 그 항구의 몫이다 (C-18)
  w.proceeds = (w.proceeds ?? 0) + Math.max(0, raw - fee - tax);
  return sold;
}

/** 그 항구의 판매소가 벌어 둔 돈을 걷는다 — **들러야 들어온다** */
export function collectShop(cityId = state.at) {
  let got = 0;
  for (const [k, w] of workList(cityId)) {
    if (!k.startsWith('shop:')) continue;
    shopTick(k.slice(5), cityId);
    got += w.proceeds ?? 0;
    w.proceeds = 0;
  }
  if (got > 0) {
    state.gold += got;
    book('income', 'sales', got);
    pushLog(`${CITY_BY_ID[cityId].name}의 판매소가 ${got.toLocaleString('ko-KR')}닢을 벌어 두었다.`, 'good');
  }
  return got;
}

/* ── 위탁 (§3-3) ─────────────────────────────────────────────────────
   ★ **초반의 문**이다. 정기선은 동행선을 하나 빼야 하므로 선단이 자란 뒤에나 성립하는데,
     위탁은 **창고 둘**만 있으면 된다. 대신 수수료 8~15%가 항차 ROI 중앙값과 맞먹어
     *"급할 때만 쓰는 길"*이 된다. */

/** 위탁 수수료 — 시가 × (0.06 + 그 항로 요율) · 보험을 켜면 ×2 */
export function consignFee(goodId, n, from, to, insure = false) {
  const unit = state.prices[from]?.[goodId] ?? GOOD_BY_ID[goodId].base;
  const risk = (routeRisk(from, to) ?? 0) / 100;
  const rate = (CONSIGN.feeBase + risk) * (insure ? CONSIGN.insureMul : 1);
  return { fee: Math.round(unit * n * rate), value: Math.round(unit * n), rate };
}

export function canConsign(goodId, n, to, from = state.at, insure = false) {
  if (!hasHolding('warehouse', from) && !hasHolding('factory', from)) {
    return { ok: false, reason: '이 항구에 창고가 없다' };
  }
  if (!hasHolding('warehouse', to) && !hasHolding('factory', to)) {
    return { ok: false, reason: '받는 항구에 창고가 없다' };
  }
  if ((state.consign ?? []).length >= CONSIGN.maxOpen) {
    return { ok: false, reason: `동시에 ${CONSIGN.maxOpen}건까지다` };
  }
  const have = (state.stored?.[from] ?? {})[goodId] ?? 0;
  const take = Math.min(n, have, CONSIGN.capPer);
  if (take <= 0) return { ok: false, reason: '창고에 그 물건이 없다' };
  const f = consignFee(goodId, take, from, to, insure);
  if (f.fee > state.gold) return { ok: false, reason: `수수료 ${f.fee.toLocaleString('ko-KR')}닢이 모자란다` };
  return { ok: true, n: take, fee: f.fee, value: f.value, rate: f.rate };
}

export function sendConsign(goodId, n, to, from = state.at, insure = false) {
  const c = canConsign(goodId, n, to, from, insure);
  if (!c.ok) return c;
  state.stored[from][goodId] -= c.n;
  if (!state.stored[from][goodId]) delete state.stored[from][goodId];
  state.gold -= c.fee;
  book('outgo', 'upkeep', c.fee);
  const days = Math.max(1, Math.round((hopDays(from, to) ?? voyageDays(from, to)) * CONSIGN.daysMul));
  (state.consign ??= []).push({
    from, to, good: goodId, n: c.n, arrive: state.day + days, insured: !!insure, value: c.value,
  });
  pushLog(`${GOOD_BY_ID[goodId].name} ${c.n}칸을 ${CITY_BY_ID[to].name}으로 위탁했다`
        + ` — 수수료 ${c.fee.toLocaleString('ko-KR')}닢 · ${days}일.`, 'warn');
  return { ok: true, n: c.n, fee: c.fee, days };
}

/** 도착한 위탁을 받는다 — 그 항구에 **들를 때** 처리한다(§3-1) */
export function arriveConsign(cityId = state.at) {
  const list = state.consign ?? [];
  const got = [], lost = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    if (c.to !== cityId || c.arrive > state.day) continue;
    list.splice(i, 1);
    /* 유실 — **짐만 잃는다**(남의 배다). 보험을 켰으면 시가의 30%가 돌아온다. */
    const odds = (routeRisk(c.from, c.to) ?? 0) / 100 * CONSIGN.lossMul;
    if (Math.random() < odds) {
      const pay = c.insured ? Math.round(c.value * CONSIGN.cover) : 0;
      if (pay) { state.gold += pay; book('income', 'loot', pay); }
      lost.push({ ...c, pay });
      pushLog(`위탁한 ${GOOD_BY_ID[c.good].name} ${c.n}칸이 오지 않았다.`
            + (pay ? ` 보험으로 ${pay.toLocaleString('ko-KR')}닢을 받았다.` : ' 보험이 없었다.'), 'bad');
      continue;
    }
    const room = storeCap(cityId) - storedUsed(cityId);
    const put = Math.min(c.n, Math.max(0, room));
    if (put > 0) {
      ((state.stored ??= {})[cityId] ??= {})[c.good] = ((state.stored[cityId] ?? {})[c.good] ?? 0) + put;
    }
    got.push({ ...c, put });
    pushLog(`위탁한 ${GOOD_BY_ID[c.good].name} ${put}칸이 ${CITY_BY_ID[cityId].name} 창고에 들어왔다.`
          + (put < c.n ? ` (창고가 좁아 ${c.n - put}칸은 못 받았다)` : ''), put ? 'good' : 'warn');
  }
  return { got, lost };
}

/* ── 정기선 (§3-2) ─────────────────────────────────────────────────── */

export const lineList = () => Object.entries(state.lines ?? {});

export function canStartLine(shipKey, a, b, goods) {
  if (lineList().length >= LINE.max) return { ok: false, reason: `정기선은 ${LINE.max}선까지다` };
  if (state.lines?.[shipKey]) return { ok: false, reason: '이미 묶여 있다' };
  if (!state.consorts?.[shipKey]) return { ok: false, reason: '동행 중인 배라야 묶는다' };
  if (a === b) return { ok: false, reason: '두 항구가 같다' };
  for (const id of [a, b]) {
    if (!hasHolding('warehouse', id) && !hasHolding('factory', id)) {
      return { ok: false, reason: `${CITY_BY_ID[id]?.name ?? id}에 창고가 없다` };
    }
  }
  if (!goods?.length) return { ok: false, reason: '나를 물건을 골라야 한다' };
  return { ok: true, goods: goods.slice(0, LINE.goodsMax) };
}

export function startLine(shipKey, a, b, goods) {
  const c = canStartLine(shipKey, a, b, goods);
  if (!c.ok) return c;
  /* ★ **값은 돈이 아니라 선단이다** — 묶은 배는 동행에서 빠진다(화물칸·포·피해 분산을 잃는다). */
  delete state.consorts[shipKey];
  const turn = Math.max(2, voyageDays(a, b) * 2 + LINE.turnPad);
  (state.lines ??= {})[shipKey] = { a, b, goods: c.goods, leg: 'ab', next: state.day + Math.round(turn / 2), turn };
  const nm = SHIPS[shipKey]?.name ?? shipKey;
  pushLog(`${nm}${josa(nm, '을/를')} ${CITY_BY_ID[a].name}~${CITY_BY_ID[b].name} 정기선으로 묶었다`
        + ` — 왕복 ${turn}일. 동행에서는 빠진다.`, 'warn');
  return { ok: true, turn };
}

export function stopLine(shipKey) {
  const l = state.lines?.[shipKey];
  if (!l) return { ok: false, reason: '그런 정기선이 없다' };
  delete state.lines[shipKey];
  const at = l.leg === 'ab' ? l.a : l.b;
  if (state.fleet[shipKey]) state.fleet[shipKey].at = at;
  pushLog(`${SHIPS[shipKey]?.name ?? shipKey} 정기선을 풀었다 — ${CITY_BY_ID[at].name}에 정박한다.`, 'warn');
  return { ok: true, at };
}

/** 날이 지나면 정기선이 한 다리씩 나아간다.
    ⚠️ **`advanceDays`와 `waitDays` 양쪽에서 부른다** — 한쪽만 걸면 항구에 서 있는 동안
      정기선이 멈춘다(또는 그 반대). `QUICKMAP-trade.md`의 *"항구에는 시간이 없다"*가
      이 층에서 절반만 참이 되는 자리다. */
export function tickLines() {
  const out = [];
  for (const [key, l] of lineList()) {
    let guard = 0;
    while (state.day >= l.next && guard++ < 12) {
      const from = l.leg === 'ab' ? l.a : l.b;
      const to = l.leg === 'ab' ? l.b : l.a;
      const cap = Math.floor((SHIPS[key]?.cargo ?? 0) * LINE.holdRate);
      /* 창고 A에서 실을 수 있는 만큼 싣고 창고 B에 부린다 — **사고팔지 않는다**(§3-1).
         ★ **한 방향으로만 나른다**(a→b). 처음엔 왕복 양쪽에서 실었는데, 그러면 같은 짐을
           **도로 실어 오는** 배가 된다(실측: 60칸이 갔다가 그대로 돌아왔다).
           정기선이 하는 일은 *"밭의 재고를 가공장으로"*·*"가공품을 판매소로"* 옮기는 것이라
           방향이 있다. 돌아오는 다리는 빈 배이고, 그 시간이 이 장치의 값이다. */
      const carrying = l.leg === 'ab';
      let loaded = 0;
      const src = carrying ? (state.stored?.[from] ?? {}) : {};
      const moved = {};
      for (const gid of (carrying ? l.goods : [])) {
        if (loaded >= cap) break;
        const take = Math.min(src[gid] ?? 0, cap - loaded);
        if (take <= 0) continue;
        src[gid] -= take;
        if (!src[gid]) delete src[gid];
        moved[gid] = take;
        loaded += take;
      }
      /* 해적 — 편도마다 요율로 판정한다. 걸리면 짐 전량, 그중 15%는 배까지. */
      let sunk = false, robbed = false;
      if (loaded > 0 && Math.random() < (routeRisk(from, to) ?? 0) / 100) {
        robbed = true;
        if (Math.random() < LINE.lossShip) sunk = true;
      }
      if (!robbed) {
        const room = storeCap(to) - storedUsed(to);
        let put = 0;
        for (const [gid, q] of Object.entries(moved)) {
          const fit = Math.min(q, Math.max(0, room - put));
          if (fit > 0) {
            ((state.stored ??= {})[to] ??= {})[gid] = ((state.stored[to] ?? {})[gid] ?? 0) + fit;
          }
          put += fit;
        }
        if (loaded > 0) {
          pushLog(`정기선 ${SHIPS[key]?.name ?? key} — ${CITY_BY_ID[from].name}에서 ${CITY_BY_ID[to].name}으로`
                + ` ${put}칸을 옮겼다.`, 'good');
        }
      } else {
        pushLog(`정기선 ${SHIPS[key]?.name ?? key}이(가) ${CITY_BY_ID[from].name}~${CITY_BY_ID[to].name}에서 털렸다`
              + ` — ${loaded}칸을 잃었다.` + (sunk ? ' 배도 돌아오지 않았다.' : ''), 'bad');
      }
      out.push({ key, from, to, loaded, robbed, sunk });
      if (sunk) {
        delete state.lines[key];
        delete state.fleet[key];
        state.everOwned?.add(key);
        break;
      }
      l.leg = l.leg === 'ab' ? 'ba' : 'ab';
      l.next += Math.max(1, Math.round(l.turn / 2));
    }
  }
  return out;
}

/** 가공장 값 — `(9,000 + 산출 base × 80) × TIER_MUL[요구 공업력]`.
    `level`은 **그 등급에 새로 내는 몫**이다(1→2가 0.80배, 2→3이 1.30배). */
export function millPrice(recipeId, cityId = state.at, level = 1) {
  const r = CHAIN_BY_ID[recipeId];
  if (!r) return Infinity;
  const out = GOOD_BY_ID[chainOut(r)];
  if (!out) return Infinity;
  const w = WORKS.mill;
  const full = (w.priceBase + out.base * w.priceByOut) * (WORK.tierMul[r.req] ?? 1);
  return Math.round(full * (WORK.levelMul[level] ?? 1));
}

/** 하루에 뽑는 산출 칸 수 */
export const millRate = (level = 1) => WORK.millPerDay[level] ?? WORK.millPerDay[1];
/** 가공비(현금) — 착수할 때 낸다 */
export const millFee = (recipeId, batches = 1) =>
  Math.round(chainOutValue(CHAIN_BY_ID[recipeId]) * WORK.feeRate * batches);
/** 소요 일수 = 2 + ceil(산출 수량 ÷ 하루 처리) */
export const millDays = (recipeId, batches, level = 1) =>
  WORK.setupDays + Math.ceil((chainOutUnits(CHAIN_BY_ID[recipeId]) * batches) / millRate(level));

/** 이 항구에 세울 수 있나 — 창고 · 공업력 · 시설 상한 · 금화 */
export function canBuyMill(recipeId, cityId = state.at) {
  const r = CHAIN_BY_ID[recipeId];
  if (!r) return { ok: false, reason: '그런 사슬은 없다' };
  if (millOf(recipeId, cityId)) return { ok: false, reason: '이미 있다' };
  /* 창고(`warehouse`) 이상이 먼저다 — 임차창고(20칸)로는 사슬이 안 돈다.
     투입과 산출이 둘 다 창고를 지나기 때문이고, 동시에 그것이 진입 문턱이다. */
  if (!hasHolding('warehouse', cityId) && !hasHolding('factory', cityId)) {
    return { ok: false, reason: '창고가 먼저다' };
  }
  if (industryOf(cityId) < r.req) return { ok: false, reason: `공업력 ${r.req}이 필요하다` };
  const list = workList(cityId);
  if (list.filter(([k]) => k.startsWith('mill:')).length >= WORKS.mill.perPort) {
    return { ok: false, reason: `가공장은 한 항구에 ${WORKS.mill.perPort}까지다` };
  }
  if (list.length >= WORK.perPort) return { ok: false, reason: `시설은 한 항구에 ${WORK.perPort}까지다` };
  const price = millPrice(recipeId, cityId, 1);
  if (price > state.gold) {
    return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  }
  return { ok: true, price };
}

export function buyMill(recipeId, cityId = state.at) {
  const c = canBuyMill(recipeId, cityId);
  if (!c.ok) return c;
  const r = CHAIN_BY_ID[recipeId];
  state.gold -= c.price;
  book('outgo', 'ships', c.price);      // 거점과 같은 갈래 — 배 밖에 묶이는 자본이다
  const ent = workEntry(cityId);
  const fee = Math.round(c.price * ent.fee);
  if (fee > state.gold) return { ok: false, reason: `입회비 ${fee.toLocaleString('ko-KR')}닢이 모자란다` };
  state.gold -= fee;
  if (fee) book('outgo', 'ships', fee);
  const m = ((state.works ??= {})[cityId] ??= { paid: state.day, spent: 0, missed: 0 });
  m[workKey('mill', chainOut(r))] = { level: 1, since: state.day, idle: ent.idle, job: null };
  m.spent = (m.spent ?? 0) + c.price;   // 유지비는 **들인 돈 전체**에 붙는다(거점과 같다)
  noteEntry(ent, cityId);
  pushLog(`${CITY_BY_ID[cityId].name}에 ${r.work}${josa(r.work, '을/를')} 세웠다`
        + ` (−${c.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: c.price };
}

export function canUpgradeMill(recipeId, cityId = state.at) {
  const w = millOf(recipeId, cityId);
  if (!w) return { ok: false, reason: '가공장이 없다' };
  if (w.level >= WORK.levelCap) return { ok: false, reason: '더 올릴 수 없다' };
  if (w.job) return { ok: false, reason: '가공 중이다' };
  const price = millPrice(recipeId, cityId, w.level + 1);
  if (price > state.gold) {
    return { ok: false, reason: `금화가 ${(price - state.gold).toLocaleString('ko-KR')}닢 모자란다`, price };
  }
  return { ok: true, price, to: w.level + 1 };
}

export function upgradeMill(recipeId, cityId = state.at) {
  const c = canUpgradeMill(recipeId, cityId);
  if (!c.ok) return c;
  const w = millOf(recipeId, cityId);
  state.gold -= c.price;
  book('outgo', 'ships', c.price);
  const m = state.works[cityId];
  m.spent = (m.spent ?? 0) + c.price;   // 승급분도 유지비 밑변에 얹힌다 — 커질수록 무거워진다
  w.level = c.to;
  pushLog(`${CITY_BY_ID[cityId].name} ${CHAIN_BY_ID[recipeId].work}${josa(CHAIN_BY_ID[recipeId].work, '을/를')}`
        + ` ${c.to}등급으로 올렸다 (−${c.price.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, price: c.price, level: c.to };
}

/** 매각 — ★ 들인 돈의 60%만 돌아온다. 사면 40%가 즉시 증발한다는 것이 이 층의 대가다.
    가공 중인 것은 못 판다(원료가 사라진다). */
export function sellMill(recipeId, cityId = state.at) {
  const w = millOf(recipeId, cityId);
  if (!w) return { ok: false, reason: '가공장이 없다' };
  if (w.job) return { ok: false, reason: '가공 중이다' };
  const r = CHAIN_BY_ID[recipeId];
  let spent = 0;
  for (let lv = 1; lv <= w.level; lv++) spent += millPrice(recipeId, cityId, lv);
  const back = Math.round(spent * WORK.sellBack);
  const m = state.works[cityId];
  delete m[workKey('mill', chainOut(r))];
  m.spent = Math.max(0, (m.spent ?? 0) - spent);
  if (!workList(cityId).length) delete state.works[cityId];
  state.gold += back;
  // 배 매각(`sellShip`)과 같은 갈래에 적는다 — 장부 항목을 늘리면 정산 모달도 함께 봐야 한다
  book('income', 'loot', back);
  pushLog(`${CITY_BY_ID[cityId].name} ${r.work}${josa(r.work, '을/를')} 넘겼다`
        + ` (+${back.toLocaleString('ko-KR')}닢 — 들인 돈의 ${Math.round(WORK.sellBack * 100)}%).`, 'warn');
  return { ok: true, back, spent };
}

/** 창고 재고로 몇 회분을 돌릴 수 있나 — 원료·금화·창고 자리를 다 본다.
    ★ 산출이 들어갈 자리까지 미리 센다. 투입이 빠진 뒤의 빈자리에 산출이 들어오므로
      `여유 + 투입칸 ≥ 산출칸`이 성립해야 한다. */
export function millBatchCap(recipeId, cityId = state.at) {
  const r = CHAIN_BY_ID[recipeId];
  const w = millOf(recipeId, cityId);
  if (!r || !w || w.idle || w.job) return 0;
  const store = state.stored?.[cityId] ?? {};
  let k = Infinity;
  for (const [gid, n] of Object.entries(r.in)) k = Math.min(k, Math.floor((store[gid] ?? 0) / n));
  if (!Number.isFinite(k)) return 0;
  const fee = chainOutValue(r) * WORK.feeRate;
  k = Math.min(k, Math.floor(state.gold / Math.max(1, fee)));
  const room = storeCap(cityId) - storedUsed(cityId);
  const inU = chainInUnits(r), outU = chainOutUnits(r);
  if (outU > inU) k = Math.min(k, Math.floor(room / (outU - inU)));
  return Math.max(0, k);
}

export function canRunMill(recipeId, cityId = state.at, batches = 1) {
  const r = CHAIN_BY_ID[recipeId];
  const w = millOf(recipeId, cityId);
  if (!r || !w) return { ok: false, reason: '가공장이 없다' };
  if (w.idle) return { ok: false, reason: '휴업 중이다 — 밀린 유지비를 내야 한다' };
  if (w.job) return { ok: false, reason: '이미 돌고 있다' };
  const cap = millBatchCap(recipeId, cityId);
  if (cap <= 0) {
    const store = state.stored?.[cityId] ?? {};
    const missing = Object.entries(r.in).find(([gid, n]) => (store[gid] ?? 0) < n);
    if (missing) {
      const g = GOOD_BY_ID[missing[0]];
      return { ok: false, reason: `창고에 ${g.name}${josa(g.name, '이/가')} 모자란다` };
    }
    return { ok: false, reason: '가공비나 창고 자리가 모자란다' };
  }
  return { ok: true, batches: Math.min(batches, cap), cap };
}

/** 착수 — 투입은 **지금** 창고에서 빠지고 가공비도 **지금** 나간다.
    ★ 기다리는 것은 공짜가 아니다 — `waitDays()`가 정박 급여·유지비를 문다.
      다시 오는 쪽을 골라도 되고, 그 선택이 이 시스템의 시계다. */
export function runMill(recipeId, cityId = state.at, batches = 1) {
  const c = canRunMill(recipeId, cityId, batches);
  if (!c.ok) return c;
  const r = CHAIN_BY_ID[recipeId];
  const w = millOf(recipeId, cityId);
  const k = c.batches;
  const store = (state.stored[cityId] ??= {});
  for (const [gid, n] of Object.entries(r.in)) {
    store[gid] -= n * k;
    if (store[gid] <= 0) delete store[gid];
  }
  const fee = millFee(recipeId, k);
  state.gold -= fee;
  book('outgo', 'goods', fee);
  const days = millDays(recipeId, k, w.level);
  w.job = {
    recipe: recipeId, batches: k, until: state.day + days,
    out: Object.fromEntries(Object.entries(r.out).map(([g, n]) => [g, n * k])),
  };
  const outName = GOOD_BY_ID[chainOut(r)].name;
  pushLog(`${CITY_BY_ID[cityId].name} ${r.work}에 ${r.name}${josa(r.name, '을/를')} 걸었다 —`
        + ` ${days}일 뒤 ${outName} ${chainOutUnits(r) * k}칸 (가공비 ${fee.toLocaleString('ko-KR')}닢).`, 'good');
  return { ok: true, batches: k, fee, days, until: w.job.until };
}

/** 완성분을 창고로 옮긴다 — 창고가 차 있으면 **들어간 만큼만** 옮기고 나머지는 기다린다.
    (사라지지 않는다. 다음에 자리를 비우고 다시 부르면 나머지가 들어온다.) */
export function collectMill(cityId = state.at) {
  const got = {};
  for (const [, w] of workList(cityId)) {
    const job = w.job;
    if (!job || state.day < job.until) continue;
    const store = (state.stored[cityId] ??= {});
    for (const gid of Object.keys(job.out)) {
      const room = storeCap(cityId) - storedUsed(cityId);
      if (room <= 0) break;
      const n = Math.min(job.out[gid], room);
      if (n <= 0) continue;
      store[gid] = (store[gid] ?? 0) + n;
      job.out[gid] -= n;
      if (!job.out[gid]) delete job.out[gid];
      got[gid] = (got[gid] ?? 0) + n;
    }
    if (!Object.keys(job.out).length) w.job = null;
  }
  const names = Object.entries(got).map(([g, n]) => `${GOOD_BY_ID[g].name} ${n}칸`);
  if (names.length) {
    pushLog(`${CITY_BY_ID[cityId].name} 가공장에서 ${names.join(' · ')}${josa(names[names.length - 1], '을/를')} 받아 창고에 넣었다.`, 'good');
  }
  return got;
}

/** 30일마다 무는 시설 유지비 — 들인 돈의 **연 10%**(거점 6%보다 무겁다) */
export function worksUpkeepDue(cityId) {
  const m = state.works?.[cityId];
  if (!m) return 0;
  const days = state.day - (m.paid ?? state.day);
  if (days < WORK.upkeepEvery) return 0;
  const periods = Math.floor(days / WORK.upkeepEvery);
  const full = (m.spent ?? 0) * WORK.upkeepRate * (WORK.upkeepEvery / 360) * periods;
  // 휴업 중에는 절반만 문다 — 사람이 덜 붙기 때문이다. 대신 **0은 아니다**(방치가 답이 되지 않게).
  return Math.round(full * (worksIdle(cityId) ? WORK.idleRate : 1));
}

/** 이 항구의 시설 유지비를 치른다(항구에 들어올 때 · `settleHolding` 옆).
    ★ 거점과 달리 **휴업을 한 번 거친다** — 사슬은 여러 항구에 걸치므로 한 항구의 사고로
      전체가 끊기면 "수직계열화"가 도박이 된다. 두 번 연속이면 그때 압류다. */
/** ★ **침범으로 문을 닫은 시설은 관계가 풀리면 열린다**(A-10 §3-2).
    허락 없이 세운 것은 유지비 문제가 아니라 **관계 문제**라 `settleWorks`가 못 연다 —
    그러면 유지비만 영원히 나가는 자리가 생긴다. 회복하는 길은 **그 세력과 다시 거래하는 것**이다. */
export function reviveTrespass(cityId = state.at) {
  const m = state.works?.[cityId];
  if (!m || (m.missed ?? 0) > 0) return null;      // 체불로 닫힌 것은 저쪽 규칙이다
  const ent = workEntry(cityId);
  if (!ent.fac || ent.idle) return null;            // 아직 눈총 아래다
  const shut = workList(cityId).filter(([, w]) => w.idle);
  if (!shut.length) return null;
  for (const [, w] of shut) w.idle = false;
  pushLog(`${FACTIONS[ent.fac].name}이(가) 문을 열어 주었다 — ${CITY_BY_ID[cityId].name}의 시설이 다시 돈다.`, 'good');
  return { fac: ent.fac, n: shut.length };
}

export function settleWorks(cityId = state.at) {
  const m = state.works?.[cityId];
  if (!m) return null;
  reviveTrespass(cityId);
  const due = worksUpkeepDue(cityId);
  if (due <= 0) return null;
  const paid = Math.min(state.gold, due);
  state.gold -= paid;
  if (paid) book('outgo', 'port', paid);
  m.paid = state.day;
  const name = CITY_BY_ID[cityId].name;
  if (paid >= due) {
    if (worksIdle(cityId)) {
      for (const [, w] of workList(cityId)) w.idle = false;
      pushLog(`${name} 가공장이 다시 돈다 — 밀린 유지비 ${due.toLocaleString('ko-KR')}닢을 냈다.`, 'good');
    } else {
      pushLog(`${name} 시설 유지비 ${due.toLocaleString('ko-KR')}닢을 냈다.`, 'warn');
    }
    m.missed = 0;
    return { due, paid, idle: false, seized: false };
  }
  m.missed = (m.missed ?? 0) + 1;
  if (m.missed >= WORK.seizeAfter) {
    delete state.works[cityId];
    const lost = state.stored?.[cityId];
    if (lost) delete state.stored[cityId];
    pushLog(`${name}의 시설을 유지비 ${(due - paid).toLocaleString('ko-KR')}닢 때문에 빼앗겼다.`
          + (lost && Object.keys(lost).length ? ' 창고에 둔 짐도 함께 넘어갔다.' : ''), 'bad');
    return { due, paid, idle: false, seized: true };
  }
  for (const [, w] of workList(cityId)) { w.idle = true; w.job = null; }
  pushLog(`${name} 시설이 유지비 ${(due - paid).toLocaleString('ko-KR')}닢을 못 채워 **휴업**한다.`
        + ' 한 번 더 밀리면 넘어간다.', 'bad');
  return { due, paid, idle: true, seized: false };
}

/** 지금 이 시설들을 다 넘기면 얼마가 돌아오나 — 총자산 계산(시뮬·대시보드)이 읽는다 */
export function worksValue(cityId = null) {
  const ids = cityId ? [cityId] : Object.keys(state.works ?? {});
  let v = 0;
  for (const id of ids) v += (state.works?.[id]?.spent ?? 0) * WORK.sellBack;
  return Math.round(v);
}

/* ── 공업력 승급 (A-2) ─────────────────────────────────────────
   **자재를 실물로 실어 와야** 오른다. 그래서 승급은 돈 쓰는 일이 아니라 **항로를 짜는 일**이다. */

export const yardBoost = (cityId = state.at) => state.yards?.[cityId]?.boost ?? 0;
export const yardBuilding = (cityId = state.at) => state.yards?.[cityId]?.building ?? null;

/** 공사 중인가 — 그동안 그 부두는 제 일을 못 한다(신조·중고 0).
    ★ **내가 건 공사든 나라가 건 공사든 마찬가지다**(C-18) — 뜻은 「이 항구의 부두가
      지금 제 일을 못 한다」이지 「누가 걸었나」가 아니다. `sellsShip`·`usedListings`가
      이 함수 하나만 보므로 여기서 합쳐 두지 않으면 공사 중인 나라 조선소에서 배가 나온다. */
export function yardBusy(cityId = state.at) {
  const b = yardBuilding(cityId);
  if (b && state.day < b.until) return true;
  return civicBusy(cityId);
}

/** 다음 등급과 그 값 — 더 올릴 수 없으면 null */
export function yardNext(cityId = state.at) {
  const to = industryOf(cityId) + 1;
  if (to > YARD.cap) return null;
  const spec = YARD_UPGRADE[to];
  if (!spec) return null;
  return { to, ...spec };
}

/* ── 나라가 짓는 조선소 (C-18 · 2026-08-28) ─────────────────────
   ★ **부두는 더 이상 살 수 없다.** 사용자 지시로 공업력의 첫 계단이 「거점을 산다」에서
     **「그 항구에 세를 낸다」**로 바뀌었다 — 근거·앵커·왜 항구별인가는 `data.js: CIVIC` 주석이 정본.

   ── 배선 (딱 셋) ────────────────────────────────────────────
     ① `noteDues(cityId, 닢)` — 세를 낼 때마다 `state.dues[cityId]`에 쌓는다.
        부르는 자리는 **관세를 실제로 떼는 곳 전부**다(`sell`·`shopTick`).
     ② `tickCivic(cityId)` — 문턱을 넘었으면 **공사를 걸고**, 공사가 끝났으면 **올린다**.
        `noteDues` 끝과 항구 입장(`scenes/port.js`)에서 부른다.
     ③ `civicProgress(cityId)` — 화면이 읽는 **한 곳**. 두 화면이 각자 계산하면 반드시 어긋난다.

   ⚠️ `boost`(내 돈)와 `civic`(내 교역)을 **따로 센다.** 같은 칸에 더하면 "누가 올린 칸인가"를
     나중에 되물을 수 없고, 옛 부두가 승급을 우회하던 그 자리가 이름만 바꿔 돌아온다. */

/** 나라가 올려 준 칸 — ★ **공기가 지난 공사는 이미 오른 것으로 센다.**
    실측에서 이것 없이 만들었더니 `tickCivic`이 그 항구에 다시 들를 때만 불려,
    60항차 열 판 전부에서 **공사가 시작만 되고 한 칸도 안 올라갔다**(probe-dues).
    ⇒ 읽는 쪽(`industryOf`·`endingProgress`·`hegemonyOf`)은 들르지 않아도 참을 봐야 한다.
      `tickCivic`은 그것을 **장부에 옮기고 로그를 띄우는** 일만 한다(값은 안 바뀐다). */
export function civicOf(cityId = state.at) {
  const y = state.yards?.[cityId];
  if (!y) return 0;
  const b = y.civicBuilding;
  return (y.civic ?? 0) + (b && state.day >= b.until ? 1 : 0);
}
export const civicBuilding = (cityId = state.at) => state.yards?.[cityId]?.civicBuilding ?? null;

/** 나라 조선소 공사 중인가 — 그동안 그 항구는 배를 못 짓는다(`yardBusy`와 같은 뜻, 다른 주체) */
export function civicBusy(cityId = state.at) {
  const b = civicBuilding(cityId);
  return !!b && state.day < b.until;
}

/** 이 항구에 지금까지 낸 세 */
export const duesOf = (cityId = state.at) => state.dues?.[cityId] ?? 0;

/** 그 깃발 전체에 낸 세 — 화면이 *"이 나라에"*를 함께 말할 때 쓴다(판정에는 안 쓴다) */
export function duesOfFlag(flag) {
  let sum = 0;
  for (const [id, v] of Object.entries(state.dues ?? {})) {
    if (CITY_BY_ID[id]?.flag === flag) sum += v;
  }
  return sum;
}

/** 나라가 더 올릴 수 있는 칸이 남았나 — 도시 `industry` + `civic`이 `CIVIC.cap`을 못 넘는다 */
export function civicRoom(cityId = state.at) {
  const base = CITY_BY_ID[cityId]?.industry ?? 0;
  return Math.max(0, CIVIC.cap - base - civicOf(cityId));
}

/* ── 낸 세를 나눈다 — 「국가를 거쳐 항구로」 (2026-08-28 · 사용자 결정) ──────
   ★ 갈래는 둘이다: `keep`은 **낸 그 항구**에 남고, 나머지는 **그 나라 몫**이 되어
     그 깃발 항구들에 `size` 가중으로 흘러든다(주항구에 `mainBonus`). → `data.js: CIVIC.spill`
   ★ **총량은 보존된다** — 세를 새로 만들지 않는다. 나뉘어 들어갈 뿐이다.
   ★ **미리 나눠 넣는다**(읽을 때 계산하지 않는다). `state.dues[cityId]`가 그대로 「그 항구 몫」이라
     화면·판정·세이브가 전부 예전 모양 그대로 돌고, **몫이 나중에 줄어드는 자리가 없다.** */

/** 그 깃발의 주항구 — (공업력, 규모, id) 순으로 가장 앞. 정적 데이터라 판마다 안 변한다. */
const MAIN_PORT = new Map();
export function mainPortOf(flag) {
  if (MAIN_PORT.has(flag)) return MAIN_PORT.get(flag);
  const list = CITIES.filter((c) => c.flag === flag).sort((a, b) =>
    (b.industry ?? 0) - (a.industry ?? 0) || (b.size ?? 0) - (a.size ?? 0) || (a.id < b.id ? -1 : 1));
  const id = list[0]?.id ?? null;
  MAIN_PORT.set(flag, id);
  return id;
}

/** 나라 몫이 어떻게 갈리나 — `[{ id, w }]`(정규화 전). **아직 올릴 자리가 남은 항구만** 센다.
    상한에 닿은 항구는 한 번 닿으면 되돌아오지 않으므로, 남은 항구의 몫은 **늘기만 한다.** */
export function civicSplit(flag) {
  const main = mainPortOf(flag);
  const out = [];
  for (const c of CITIES) {
    if (c.flag !== flag) continue;
    if (civicRoom(c.id) <= 0) continue;            // 꼭대기에 닿은 항구에는 안 흘러든다
    out.push({ id: c.id, w: (c.size ?? 1) + (c.id === main ? CIVIC.spill.mainBonus : 0) });
  }
  return out;
}

/** 이 항구에 세를 냈을 때 **그중 얼마가 이 항구 몫이 되나**(0~1).
    ★ 화면이 제 손으로 계산하면 배분 규칙이 바뀔 때 조용히 어긋난다 — `noteDues`와 같은 식을 쓴다. */
export function civicCutOf(cityId = state.at) {
  const flag = CITY_BY_ID[cityId]?.flag ?? null;
  const keep = CIVIC.spill.keep;
  if (!flag) return 1;
  const split = civicSplit(flag);
  const sum = split.reduce((a, b) => a + b.w, 0);
  if (!sum) return 1;                                  // 그 나라가 전부 꼭대기다 — 낸 자리에 그대로
  const mine = split.find((x) => x.id === cityId);
  return keep + (1 - keep) * ((mine?.w ?? 0) / sum);
}

/** 세를 냈다 — **여기 한 곳에서만** 쌓는다. 관세를 떼는 자리는 전부 이것을 부른다. */
export function noteDues(cityId, gold) {
  if (!cityId || !(gold > 0)) return 0;
  const m = (state.dues ??= {});
  const flag = CITY_BY_ID[cityId]?.flag ?? null;
  const add = (id, v) => { if (v > 0) m[id] = (m[id] ?? 0) + v; };

  /* ① 낸 그 항구에 남는 몫 */
  const keep = Math.round(gold * CIVIC.spill.keep);
  add(cityId, keep);

  /* ② 나라 몫 — 그 깃발 항구들에 `size` 가중으로. 나머지 한 닢까지 주항구 쪽에 몰아 준다
     (반올림으로 세가 사라지거나 생기지 않게 — 총량 보존이 이 규칙의 약속이다). */
  const touched = new Set([cityId]);
  let pool = gold - keep;
  if (flag && pool > 0) {
    const split = civicSplit(flag);
    const sum = split.reduce((a, b) => a + b.w, 0);
    if (sum > 0) {
      let left = pool;
      for (let i = 0; i < split.length; i++) {
        const share = i === split.length - 1 ? left : Math.round(pool * (split[i].w / sum));
        const give = Math.max(0, Math.min(left, share));
        add(split[i].id, give);
        if (give > 0) touched.add(split[i].id);
        left -= give;
      }
    } else {
      add(cityId, pool);        // 그 나라가 전부 꼭대기다 — 낸 자리에 그대로 둔다
    }
  } else if (pool > 0) {
    add(cityId, pool);
  }

  /* ③ 몫이 늘어난 항구는 그 자리에서 문턱을 다시 본다 — **로그가 그 순간에 떠야 한다.** */
  for (const id of touched) tickCivic(id);
  return m[cityId] ?? 0;
}

/** 화면이 읽는 한 곳 — 「이 항구에 낸 세 N닢 · 다음 조선소까지 M닢」.
    ★ 값을 두 화면이 각자 계산하면 반드시 어긋난다(이 프로젝트에서 가장 비싼 실수의 자리). */
export function civicProgress(cityId = state.at) {
  const base = CITY_BY_ID[cityId]?.industry ?? 0;
  const civic = civicOf(cityId);
  const now = base + civic;                 // 나라 몫만 본다 — 내가 산 `boost`는 문턱과 무관하다
  const paid = duesOf(cityId);
  const room = civicRoom(cityId);
  const b = civicBuilding(cityId);
  const building = b && state.day < b.until
    ? { to: b.to, until: b.until, left: b.until - state.day, days: b.days ?? (b.until - (b.started ?? state.day)) }
    : null;
  if (!room) {
    return { cityId, base, civic, now, paid, room: 0, need: null, left: 0,
             ready: false, days: 0, building, capped: true, cap: CIVIC.cap };
  }
  const need = CIVIC.dues[Math.min(now, CIVIC.dues.length - 1)];
  return {
    cityId, base, civic, now, paid, room, need,
    left: Math.max(0, need - paid), ready: paid >= need && !building,
    days: CIVIC.days[Math.min(now, CIVIC.days.length - 1)],
    building, capped: false, cap: CIVIC.cap,
  };
}

/** 공사를 걸고, 끝났으면 올린다 — **나라가 스스로 한다**(플레이어의 단추가 아니다).
    ★ *"차근차근"* — 문턱을 넘어도 즉시가 아니라 공사 기간이 지나야 오른다. */
export function tickCivic(cityId = state.at) {
  if (!cityId || !CITY_BY_ID[cityId]) return null;
  const y = (state.yards[cityId] ??= { boost: 0, building: null });
  const out = {};
  const b = y.civicBuilding;
  // ① 끝났으면 올린다
  if (b && state.day >= b.until) {
    y.civic = (y.civic ?? 0) + 1;
    y.civicBuilding = null;
    pushLog(`${CITY_BY_ID[cityId].name}에 새 조선소가 섰다 — 공업력 ${industryOf(cityId)}. `
          + '이 항구에 낸 세가 그 값을 치렀다.', 'good');
    out.done = true; out.industry = industryOf(cityId);
  } else if (b) {
    return null;                            // 아직 공사 중
  }
  /* ② 문턱을 넘었으면 건다.
     ★ **①에서 돌아가지 않는다.** 한 번은 그렇게 썼는데, 오래 나갔다 온 판에서
       「끝난 공사를 장부에 옮기고 그대로 끝」이라 **이미 세가 충분한 다음 칸이 안 걸렸다.**
       `test-rules`의 「교역만으로 염포 공업력 3에 닿는다」가 그것을 잡았다. */
  const p = civicProgress(cityId);
  if (!p.capped && p.ready) {
    y.civicBuilding = { to: p.now + 1, until: state.day + p.days, started: state.day, days: p.days };
    pushLog(`${CITY_BY_ID[cityId].name} 관아가 조선소 부두를 놓기 시작했다 — ${p.days}일. `
          + '그동안 이 항구에서는 배를 못 짓는다.', 'warn');
    out.started = true; out.until = y.civicBuilding.until; out.days = p.days;
  }
  return Object.keys(out).length ? out : null;
}

/* ── C-18 · 공업력을 올리는 길이 **둘**이다 (2026-08-28 설계 변경) ────────
   ★ 예전 갈림길은 「부두를 먼저 사나, 승급을 먼저 하나」였다 — **둘 다 내 돈**이었고,
     부두값이 `priceByIndustry`로 지금 공업력에 비례해 **순서로 총액이 갈렸다.**
     지금 두 길은 성질이 다르다:
       ① **내 돈으로 승급**(`YARD_UPGRADE`) — 금화 + **자재를 실어 와서** + 공기
       ② **내 교역으로 나라 조선소**(`CIVIC`) — 그 항구에 낸 세 + 공기. **살 수 없다.**
     ⇒ 되돌릴 수 없는 선택이 아니라 **나란히 가는 두 길**이다(둘 다 하면 둘 다 오른다).
   ★ 값은 **여기 한 곳**에서 내고 두 화면이 읽는다
     (거점 카드 `scenes/port.js: holdingCard` · 부두 카드 `scenes/shipyard.js: yardUpgradeCard`). */
export function industryPathHint(cityId = state.at) {
  const ind = industryOf(cityId);
  if (ind >= YARD.cap) return null;                    // 꼭대기다
  const up = YARD_UPGRADE[ind + 1] ?? null;            // ① 내 돈으로 승급
  const matSum = (u) => (u ? Object.values(u.mats).reduce((a, b) => a + b, 0) : 0);
  const civic = civicProgress(cityId);                 // ② 내 교역으로 나라 조선소
  if (!up && civic.capped) return null;
  return {
    base: ind,
    /* ① 내 돈 — 금화·자재·공기 */
    buy: up && { to: ind + 1, gold: up.gold, days: up.days, mats: matSum(up) },
    /* ② 내 교역 — 낸 세·남은 세·공기. 나라 몫 상한에 걸렸으면 null */
    trade: civic.capped ? null : {
      to: civic.now + 1, paid: civic.paid, need: civic.need, left: civic.left,
      days: civic.days, building: civic.building, ready: civic.ready,
    },
    capped: civic.capped, cap: CIVIC.cap,
  };
}

/** 승급을 걸 수 있나 — 금화와 **실은 자재**를 함께 본다 */
export function canUpgradeYard(cityId = state.at) {
  if (yardBusy(cityId)) {
    /* 내 공사일 수도 나라 공사일 수도 있다 — **누가 걸었는지까지 말한다**(C-18) */
    const mine = yardBuilding(cityId);
    const b = (mine && state.day < mine.until) ? mine : civicBuilding(cityId);
    const who = (mine && state.day < mine.until) ? '' : '관아가 놓는 ';
    return { ok: false, reason: `${who}공사 중이다 — ${b.until - state.day}일 남았다` };
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

/* ── 꺾은 상대의 기록 ──────────────────────────────────────────
   ★ 이 게임은 **누구를 이겼는지 기억하지 않았다.** `state.stats.wins`가 횟수만 세고,
   어느 바다에서 무엇을 꺾었는지는 전투가 끝나는 순간 사라졌다. 권역 패권 조건 ③
   ("그 바다의 최상급 적을 꺾었다")은 그 기억 없이는 판정 자체가 불가능하다.

   ── 무엇을 키로 삼나 ────────────────────────────────────────
   후보가 셋이었다.
     ⓐ `enemy.id` — 익명 적은 `localize()`가 `'flagship:eastasia'`로 만들지만
        이름난 해적은 `'npc:<런타임 id>'`이고 그 id는 **판마다 다시 뽑힌다**(`world.js`).
        세이브를 건너면 뜻이 사라지는 키다.
     ⓑ `enemy.face`(명부 id) — 이름난 해적만 있고 익명 `FOES`에는 아예 없다.
        아홉 바다 중 이름난 tier 5가 없는 바다가 생기면 그 바다는 영영 못 잡는다.
     ⓒ **`<권역>:t<등급>`** ← 채택. 익명 `FOES`와 이름난 해적을 **한 자리에 모은다**.
        `FOES`는 id 없는 다섯 칸 배열이라 인덱스(=등급)가 사실상 그 배열의 이름이고,
        이름난 해적의 `strength`가 그대로 `level`이 되므로 둘의 눈금이 이미 같다.
        "그 바다의 다섯째 얼굴을 꺾었다"는 문장이 그대로 키가 된다.
   ⓑ는 버리지 않고 `pirate:<명부id>`로 **함께** 적는다 — 판정에는 안 쓰지만
   "왕직을 잡은 판인가"를 나중에 화면이 물을 수 있는 값이라 공짜로 남겨 둔다. */
export const slainKey = (regionId, tier) => `${regionId}:t${tier}`;

/** ⓑ 명부 한 사람의 키 — `recordSlain`이 적고 **`world.js: pickDef`가 읽는다**.
    ★ 위 주석의 *"판정에는 안 쓰지만"*은 이제 반만 맞다. 패권 판정은 여전히 ⓒ만 보지만,
      「해적을 다 무찌른다」(SPEC-supremacy §1)가 이 키로 명부를 닫는다.
      키 문자열을 두 파일에 손으로 적지 않으려고 함수로 뽑아 둔다. */
export const rosterKey = (pirateId) => `pirate:${pirateId}`;

/** 그 바다에서 그 등급을 꺾은 날 (0이면 아직) */
export const slainOn = (regionId, tier) => state.slain?.[slainKey(regionId, tier)] ?? 0;

/** 전투 승리를 기록한다 — `scenes/battle.js: finish()`가 이긴 순간에 부른다.
    ★ **상선은 세지 않는다.** 내가 먼저 덮친 상선이 조건 ③을 채우면 "이 바다의 두목을
      꺾었다"가 "살진 배 한 척을 털었다"로 바뀐다. 분류 규칙은 `battle.js: foeKind`와 같다. */
export function recordSlain(enemy, regionId = currentRegion()) {
  if (!enemy || !regionId) return null;
  if (enemy.nation === '상인') return null;
  const tier = Math.min(5, Math.max(1, enemy.level ?? 1));
  const keys = [slainKey(regionId, tier)];
  if (enemy.face) keys.push(rosterKey(enemy.face));
  const box = (state.slain ??= {});
  for (const k of keys) box[k] ??= state.day;    // 처음 꺾은 날을 남긴다
  // 꺾은 이름도 바다에서 내린다 — 초무와 같은 자리다(ISSUES #26)
  if (enemy.face) retireHook?.(enemy.face);
  return keys;
}

/* ── 권역 패권 (지역 패자) ─────────────────────────────────────
   조건 넷은 `data.js: HEGEMONY` 주석이 정본. 여기서는 **진행도까지 담아** 돌려준다 —
   `21/24`를 못 보여 주면 그것은 목표가 아니라 우연이다(`endingProgress`와 같은 이유). */

/** 그 권역에서 짓는 배 가운데 가장 높은 tier의 것들 — 동률이면 전부 */
export function regionTopShips(regionId) {
  const ids = new Set(citiesOfRegion(regionId).map((c) => c.id));
  let best = 0, out = [];
  for (const [key, sh] of Object.entries(SHIPS)) {
    if (!(sh.yards ?? []).some((y) => ids.has(y))) continue;
    const t = sh.tier ?? 0;
    if (t > best) { best = t; out = [key]; }
    else if (t === best && t > 0) out.push(key);
  }
  return { tier: best, keys: out };
}

/** 이 바다의 패자인가 — 진행도까지 담은 객체를 돌려준다 */
export function hegemonyOf(regionId) {
  const cities = citiesOfRegion(regionId);
  const held = cities.filter((c) => !!state.holdings?.[c.id]);
  const facs = cities.filter((c) => hasHolding('factory', c.id));

  const ports = { have: held.length, need: cities.length };
  const factories = { have: facs.length, need: HEGEMONY.factoriesNeeded };

  const day = slainOn(regionId, HEGEMONY.bossTier);
  const boss = {
    done: day > 0, day,
    name: FOES_BY_REGION[regionId]?.[HEGEMONY.bossTier - 1]?.name
       ?? ENEMIES[HEGEMONY.bossTier - 1]?.name ?? '두목',
  };

  const top = regionTopShips(regionId);
  const owned = top.keys.find((k) => state.everOwned?.has?.(k)) ?? null;
  const key = owned ?? top.keys[0] ?? null;
  const topShip = {
    done: !!owned, tier: top.tier, key,
    name: key ? (SHIPS[key]?.name ?? key) : '없다',
    /* 동률이 여럿이면 "이 중 하나" — 화면이 그대로 읽어 쓴다 */
    choices: top.keys.map((k) => SHIPS[k]?.name ?? k),
  };

  const done = ports.have >= ports.need && factories.have >= factories.need
            && boss.done && topShip.done;
  return {
    region: regionId, name: REGION_BY_ID[regionId]?.name ?? regionId,
    ports, factories, boss, topShip, done,
    /* 넷 중 몇을 채웠나 — 카드 머리말이 `2/4`를 쓴다 */
    steps: (ports.have >= ports.need ? 1 : 0) + (factories.have >= factories.need ? 1 : 0)
         + (boss.done ? 1 : 0) + (topShip.done ? 1 : 0),
  };
}

/** 아홉 바다 전부 — 두 번째 끝의 조건이자 요약 화면의 자료 */
export function hegemonyAll() {
  const seas = REGIONS.map((r) => hegemonyOf(r.id));
  const have = seas.filter((s) => s.done).length;
  return { seas, have, need: seas.length, done: have >= seas.length };
}

/** 두 번째 끝을 한 번만 축하한다 — 조선의 끝(`markEnded`)과 **따로 논다** */
export function markNineEnded() {
  if (state.endedNine) return false;
  state.endedNine = state.day;
  return true;
}

/* ── 한반도 항구 개발 ("숨겨진 항구") ──────────────────────────
   ★ 조선 항구는 아홉인데 그중 **둘은 부두가 없다**(마포·의주 `industry 0`). 배를 짓기는커녕
   중고 매물도 안 걸리는 항구다. "숨겨진 항구를 연다"는 새 포구를 지도에 그리는 것이 아니라
   **부두가 없던 그 자리에 부두를 내는 것**이다 — `조선대`+`부두`를 세우면 `industryOf()`가
   +1 하므로 **규칙은 이미 있었고 목표와 화면만 없었다**(SPEC §4).
   ⚠️ 새 도시를 지도에 더하지 않는다 — 좌표를 늘리면 지도 아홉 장을 다시 뽑아야 한다. */
export function homelandProgress() {
  const cities = CITIES.filter((c) => c.flag === HEGEMONY.homeFlag);
  const held = cities.filter((c) => !!state.holdings?.[c.id]);
  /* ★ 예전에는 「거점 부두를 몇 곳에 세웠나」였다. 부두를 살 수 없게 됐으므로(C-18)
     같은 자리를 **나라가 조선소를 올린 항구 수**로 읽는다 — 뜻은 그대로다. */
  const docks = cities.filter((c) => civicOf(c.id) > 0);
  /* 태어날 때 부두가 없던 항구 — 여는 것이 이 목표의 이름이다 */
  const hidden = cities.filter((c) => (c.industry ?? 0) === 0).map((c) => ({
    id: c.id, name: c.name, now: industryOf(c.id), done: industryOf(c.id) > 0,
  }));
  const yards = Object.entries(ENDING.yards).map(([cityId, need]) => ({
    cityId, name: CITY_BY_ID[cityId]?.name ?? cityId,
    now: industryOf(cityId), need, done: industryOf(cityId) >= need,
  }));
  return {
    cities, ports: cities.length,
    holdings: { have: held.length, need: cities.length },
    docks: { have: docks.length, need: cities.length },
    hidden, yards,
    done: held.length >= cities.length && hidden.every((h) => h.done) && yards.every((y) => y.done),
  };
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

/* ── 세력 관계 규칙 (SPEC-factions 1단계) ──────────────────────
   1단계가 하는 일은 넷뿐이다 — **움직이는 것 둘 · 무는 것 둘.**
     움직인다 ① 그 세력 깃발 상선을 덮치면 내려간다 (`regardOf`가 악명을 흡수해 읽는다 — 새 배선 0)
     움직인다 ② 그 세력이 낸 일감을 완수하면 +1 (`deliverContract` · 상한 +6)
     문다   ① 눈총(−1 이하) → 그 세력 도시에 **일감이 안 걸린다** (`contractOffer`)
     문다   ② 원수(−6 이하) → 그 세력이 **파는 것을 안 판다** (`buyService`의 `permit`)
   ⚠️ **이중과세 금지** — 여기 있는 어떤 함수도 `tariffRate`·`encounterOdds`를 건드리지 않는다.
     세율과 조우는 악명(`INFAMY`)의 몫이고, 관계가 무는 것은 **접근권**이다.
     그래서 관계를 바닥까지 내려도 세율·조우 확률은 한 자리도 안 움직인다. */

/** 그 세력에 실제로 쌓인 값 — 악명을 빼기 **전**이다 */
export const regardRaw = (facId) => state.regard?.[facId] ?? 0;

/** 그 세력이 읽는 내 악명 — 그 세력 깃발 중 가장 무거운 것.
    ★ 푸거는 깃발이 없어 언제나 0이다. **배를 안 띄우므로 덮칠 수가 없다** —
      "돈으로 하는 싸움은 칼로 못 푼다"가 규칙이 되는 자리다. */
export function infamyWeight(facId) {
  const f = FACTIONS[facId];
  if (!f) return 0;
  let worst = 0;
  for (const flag of f.flags) worst = Math.max(worst, infamyOf(flag));
  return worst;
}

/** 화면과 규칙이 보는 **하나의 값** — raw에서 악명을 뺀 것. [−10, +10] */
export function regardOf(facId) {
  const v = regardRaw(facId) - infamyWeight(facId);
  return Math.max(-REGARD.cap, Math.min(REGARD.cap, v));
}

/** 다섯 칸 중 어디인가 — `{ lo, hi, name }`. 값이 아니라 **말**이 필요한 자리에 쓴다 */
export function regardBand(facId) {
  const v = regardOf(facId);
  for (const [lo, hi, name] of REGARD.bands) if (v >= lo && v <= hi) return { lo, hi, name, value: v };
  return { lo: 0, hi: 0, name: '모른다', value: v };
}

/** 관계를 움직인다. **상한 판정을 여기 한 곳에 모은다** — 호출부마다 두면 반드시 어긋난다.
    `why`는 상한이 갈리는 이유다(`'contract'`는 +6에서 멈춘다). */
export function addRegard(facId, n, why = '') {
  const f = FACTIONS[facId];
  if (!f || !n) return regardRaw(facId);
  const m = (state.regard ??= {});
  const cur = m[facId] ?? 0;
  let v = cur + n;
  // ★ 일감만으로는 「한편」에 못 간다 — 일은 신뢰이지 동무가 아니다
  if (n > 0 && why === 'contract') v = Math.min(v, REGARD.contractCap);
  /* ★ 회사(`sells: 'nothing'`)는 0 위로 못 올라간다. 살 것이 없으니 거래로 못 올린다 —
     회복하는 유일한 길은 그 산지에서 손을 떼고 90일을 기다리는 것이다. */
  if (f.sells === 'nothing') v = Math.min(v, REGARD.companyCap);
  v = Math.max(-REGARD.cap, Math.min(REGARD.cap, v));
  if (v === cur) return cur;
  if (v === 0) delete m[facId];        // 0이 기본선이라 안 적는다 — 세이브가 그만큼 가벼워진다
  else m[facId] = v;
  return v;
}

/** 날이 지나면 삭는다 — **90일마다 한 칸씩 0 쪽으로.** 양수도 음수도 같이 삭는다.
    ★ `decayInfamy`를 그대로 베낀 모양이다(누적일 하나 · while 한 번).
      방치의 종착지가 파산이 아니라 **무관심**이라, 관계가 벌금이 되지 않는다. */
export function decayRegard(days = 1) {
  const m = state.regard;
  if (!m) return;
  state._regardAge = (state._regardAge ?? 0) + days;
  while (state._regardAge >= REGARD.decayDays) {
    state._regardAge -= REGARD.decayDays;
    for (const k of Object.keys(m)) {
      m[k] += m[k] > 0 ? -1 : 1;
      if (m[k] === 0) delete m[k];
    }
  }
}

/** 이 도시에 걸린 세력 전부 — `{ id, how }`. `how`는 'seat' | 'grip' | 'flag'.
    ★ 한 도시에 둘이 걸리는 자리가 실제로 있다(세비야 = 카사 seat + 산 조르조 seat,
      단치히 = 한자 seat + 푸거 seat, 암본 = 회사 seat + 에스타두 grip). */
export function factionsOfCity(cityId) {
  const c = CITY_BY_ID[cityId];
  if (!c) return [];
  const out = [];
  for (const [id, f] of Object.entries(FACTIONS)) {
    if (f.seats.includes(cityId)) out.push({ id, how: 'seat', rank: 0 });
    else if (f.grip.cities.includes(cityId)) out.push({ id, how: 'grip', rank: 1 });
    else if (f.flags.includes(c.flag)) out.push({ id, how: 'flag', rank: 2 });
  }
  return out;
}

/** 이 도시의 **임자** 하나 — 없으면 null. seats → grip.cities → flags 순으로 찾는다.
    ★ 같은 층위에서 겹치면 **그 도시의 깃발을 쓰는 쪽**이 이긴다. 세비야는 카사(에스파냐 깃발)이고
      단치히는 한자다 — 제노바 자본과 푸거의 상관은 그 도시에 *앉아 있을* 뿐 임자가 아니다.
      순서에 기대지 않고 데이터로 갈리게 해 둔 것이다(FACTIONS의 선언 순서를 바꿔도 답이 같다).
    ★ 그래서 리스본의 임자는 푸거다(seat) — 후추 계약을 쥔 것이 그 집이라는 사료 그대로이고,
      `story/FACTIONS.md`가 *"어긋난 자리가 곧 이야기다"*라고 적은 다섯 자리 중 하나다. */
export function factionOfCity(cityId) {
  const flag = CITY_BY_ID[cityId]?.flag;
  const cands = factionsOfCity(cityId);
  if (!cands.length) return null;
  cands.sort((a, b) => (a.rank - b.rank)
    || ((FACTIONS[a.id].flags.includes(flag) ? 0 : 1) - (FACTIONS[b.id].flags.includes(flag) ? 0 : 1)));
  return cands[0].id;
}

/** 만난 세력 — **`state.known`에서 파생한다.** 새 상태를 만들지 않는다.
    ★ 제1해에서 둘, 제7해에서 다섯. 바다를 넓힐수록 관계도가 자라는 것이 그대로 진행 표시다. */
export function metFactions() {
  const out = new Set();
  for (const cityId of state.known) {
    for (const { id } of factionsOfCity(cityId)) out.add(id);
  }
  return [...out];
}

/** 이 항구에 일감이 걸리는가 — **눈총이면 빈다.**
    ★ 값이 아니라 **동선**을 문다. 관계가 나쁜 세력의 바다에서는 게시판이 자주 비고,
      일감을 찾아 다른 항구로 가게 된다. */
export function contractFactionOK(cityId) {
  const fid = factionOfCity(cityId);
  return !fid || regardOf(fid) > REGARD.contractAt;
}

/** 그 세력이 지금 이것을 파는가 — 안 팔면 **거절 문구**를 돌려준다(팔면 null).
    ★ 무엇이 막히는지는 그 세력이 **무엇을 파느냐**(`sells`)로 갈린다 —
      종이(카르타스)·순서(감합)·세(카피툴레이션)가 전부 `BOON.permit` 한 자리에 붙어 있다. */
const SELLS_FOR = { permit: ['paper', 'order', 'toll'] };
export function sellBlocked(cityId, service = 'permit') {
  const fid = factionOfCity(cityId);
  const f = FACTIONS[fid];
  if (!f) return null;
  if (!(SELLS_FOR[service] ?? []).includes(f.sells)) return null;
  if (regardOf(fid) > REGARD.refuseAt) return null;
  return f.lines?.refuse ?? `${f.name}이 이 문서를 내주지 않는다`;
}

/* ══ A-10 2단계 · 경쟁 (SPEC-factions §3) ═══════════════════════════════
   ★ **전쟁을 새로 만들지 않는다.** 여덟 바다의 등급 5가 나라·회사의 함대이고,
     그것을 꺾는 문의 이름이 이미 「패권」이다. 2단계가 더하는 것은 **값과 동선**뿐이다:
     쥔 자리에서 웃돈을 물고 · 자격을 사고 · 일감을 가로채이고 · 선단이 시세를 무너뜨린다. */

/** 이 도시에서 그 세력이 「앉아 있는가」 — seat이거나 grip 도시 */
export function gripsHere(facId, cityId = state.at) {
  const f = FACTIONS[facId];
  if (!f) return false;
  return f.seats.includes(cityId) || f.grip.cities.includes(cityId);
}

/** 이 품목의 산지가 그 세력 grip 도시 **밖에도** 있나.
    ★ 없으면(마스틱처럼 키오스 하나뿐이면) 웃돈을 **절반**으로 문다 —
      빠져나갈 항구가 없는 품목에 온 값을 물리면 그것은 경쟁이 아니라 통행세다. */
export function hasOutsideSource(facId, goodId) {
  const f = FACTIONS[facId];
  if (!f) return true;
  const inside = new Set([...f.seats, ...f.grip.cities]);
  for (const c of CITIES) {
    if (inside.has(c.id)) continue;
    if (c.supply?.[goodId] != null) return true;
  }
  return false;
}

/** **쥔 자리에서 무는 웃돈** — 그 세력이 앉은 도시에서 그 세력이 쥔 품목을 살 때만 붙는다.
    ★ 밖의 항구에서는 안 붙는다. 그래야 *"딴 데서 사면 된다"*가 답이 되고,
      그 답이 곧 **항로가 길어진다**는 대가다. 후추를 고아에서 못 사면 캘리컷으로 간다.
    ★ **상수 배율이라야 한다** — `buy()`의 이분 탐색이 단조 증가를 전제하므로
      수량에 따라 움직이는 항을 여기 넣으면 그 탐색이 깨진다. */
export function gripMarkup(goodId, cityId = state.at) {
  let worst = 0;
  for (const [id, f] of Object.entries(FACTIONS)) {
    if (!f.grip.goods.includes(goodId)) continue;
    if (!gripsHere(id, cityId)) continue;
    const v = regardOf(id);
    if (v >= 0) continue;
    let up = v <= REGARD.refuseAt ? FACTION.gripUpHard : FACTION.gripUp;
    if (!hasOutsideSource(id, goodId)) up *= FACTION.gripSoleHalf;
    worst = Math.max(worst, up);
  }
  return worst;
}

/** 그 자리에 시설을 세울 때의 **입회비와 대가** — `SPEC-vertical`과 물리는 자리.
    ★ **막지 않는 것이 규약이다.** 막으면 사슬 여럿이 관계 하나에 잠긴다
      (설탕=푼샬이 에스타두 · 은=포토시가 카사 · 육두구=반다가 회사).
      대신 **값을 물린다** — 눈총 아래에서 세운 시설은 **휴업으로 시작**해서
      유지비만 나가고 산출이 0이다. */
/** 시설을 세운 뒤 그 자리의 임자에게 무엇을 치렀는지 적는다 — **화면이 말해야 값이 값이 된다** */
export function noteEntry(ent, cityId = state.at) {
  if (!ent?.fac) return;
  const f = FACTIONS[ent.fac];
  if (ent.raw) {
    addRegard(ent.fac, ent.raw, 'trespass');
    pushLog(`${f.name}이(가) 쥔 자리다 — 허락 없이 세웠다(${ent.raw}).`
          + ' 문을 열어 주지 않아 **휴업으로 시작한다** — 유지비만 나간다.', 'bad');
  } else if (ent.fee) {
    pushLog(`${f.name}에 입회비를 냈다 — 시설값의 ${Math.round(ent.fee * 100)}%.`, 'warn');
  } else {
    pushLog(`${f.name}과 한편이라 입회비가 없다.`, 'good');
  }
}

export function workEntry(cityId = state.at) {
  const fid = factionOfCity(cityId);
  const f = FACTIONS[fid];
  if (!f || !gripsHere(fid, cityId)) return { fee: 0, idle: false, raw: 0, fac: null };
  const v = regardOf(fid);
  if (v >= FACTION.entryFreeAt) return { fee: 0, idle: false, raw: 0, fac: fid };
  /* ⚠️ **「모른다」(0)는 침범이 아니다** — 아무 잘못도 안 한 사람에게 문을 닫지 않는다.
     사양에서 한 칸 물러선 자리이고 그 이유는 `data.js: FACTION.trespassAt` 주석에 있다. */
  if (v > FACTION.trespassAt) return { fee: FACTION.entryFee, idle: false, raw: 0, fac: fid };
  return { fee: 0, idle: true, raw: FACTION.trespassRaw, fac: fid };
}

/* ── 자격·등록 (`BOON.enroll`) — 한자와 카사가 파는 것 ─────────────────
   ★ **세를 깎아 주지 않는다.** `enroll`이 주는 것은 오직 `regard +2`뿐이다 —
     그것이 "명부에 이름을 올린다"의 정직한 번역이다. */

/** 그 세력의 자격을 이 항구에서 살 수 있나 · 값은 얼마인가 */
export function enrollOffer(cityId = state.at) {
  const fid = factionOfCity(cityId);
  const f = FACTIONS[fid];
  if (!f || f.sells !== 'enroll' || !f.seats.includes(cityId)) return null;
  const size = CITY_BY_ID[cityId]?.size ?? 1;
  const price = f.enrollFlat ?? Math.round(size * FACTION.enrollBySize);
  const until = state.boons?.enroll?.[fid] ?? 0;
  return { fac: fid, name: f.name, price, days: FACTION.enrollDays, until,
           blocked: regardOf(fid) <= REGARD.refuseAt ? (f.lines?.refuse ?? null) : null };
}

export function buyEnroll(cityId = state.at) {
  const o = enrollOffer(cityId);
  if (!o) return { ok: false, reason: '여기서는 자격을 팔지 않는다' };
  if (o.blocked) return { ok: false, reason: o.blocked };
  if (o.price > state.gold) {
    return { ok: false, reason: `금화가 ${(o.price - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  }
  state.gold -= o.price;
  book('outgo', 'upkeep', o.price);
  ((state.boons ??= {}).enroll ??= {})[o.fac] = state.day + o.days;
  addRegard(o.fac, FACTION.enrollRegard, 'enroll');
  pushLog(`${o.name}의 명부에 이름을 올렸다 — ${o.days}일 (−${o.price.toLocaleString('ko-KR')}닢).`
        + ' 세가 깎이지는 않는다. 이름이 올랐을 뿐이다.', 'good');
  return { ok: true, price: o.price, until: state.day + o.days };
}

/** 지금 그 세력 명부에 올라 있나 */
export const enrolled = (facId) => (state.boons?.enroll?.[facId] ?? 0) > state.day;

/* ── 연대(連帶) — 한 상단을 덮치면 여럿이 함께 등을 돌린다 ────────────────
   ★ **악명은 깃발 하나에만** 붙고(기존 그대로) `regard`만 여럿에 걸린다.
     ⚠️ `bond`는 **대사가 있는 상단에만** 단다 — 대사가 없는데 규칙만 있으면
       플레이어가 이유를 못 읽는다. */
export function bondPenalty(npc) {
  const bond = npc?.bond ?? [];
  const hit = [];
  for (const fid of bond) {
    if (!FACTIONS[fid]) continue;
    addRegard(fid, -1, 'bond');
    hit.push(FACTIONS[fid].name);
  }
  return hit;
}

/* ── 함대를 꺾으면 관계가 내려간다 (−4) ──────────────────────────────
   ★ **패권을 향해 가는 것이 곧 척지는 것이다** — 성장이 대가를 낳는 구조이지
     보상을 낳는 구조가 아니다. 등급 4·5만 세력의 함대다. */
export function fleetSlain(enemy, cityId = state.at) {
  const tier = enemy?.level ?? 0;
  if (tier < FACTION.fleetTier) return null;
  const fid = FACTIONS[enemy?.fac] ? enemy.fac : factionOfCity(cityId);
  const f = FACTIONS[fid];
  if (!f) return null;
  addRegard(fid, FACTION.fleetRaw, 'fleet');
  pushLog(`${f.name}의 함대를 꺾었다 — 그 집 장부에 내 이름이 붉게 적힌다`
        + ` (${f.name} ${regardOf(fid)}).`, 'warn');
  return { fac: fid, name: f.name, delta: FACTION.fleetRaw, now: regardOf(fid) };
}

/* ── 정기선단 — 달력이 시세를 무너뜨린다 (§3-3) ─────────────────────────
   ★ **확률이 아니라 달력이다.** 예측 가능해야 *"늦으면 손해"*가 판단이 된다.
   ★ **`demand` 도시에만** 건다 — 산지에 걸면 **싸게 살 기회**가 되어 새 수입원이 된다.
     그래서 이 사건이 주는 것은 **비싸게 팔 기회를 잃는 것 하나**뿐이다. */
export function convoyDue(facId, day = state.day) {
  const f = FACTIONS[facId];
  if (!f?.convoy?.everyDays) return null;
  const every = f.convoy.everyDays;
  const next = Math.ceil(Math.max(1, day) / every) * every;
  return { next, inDays: next - day, every, goods: f.convoy.goods, to: f.convoy.to };
}

/** 오늘 도착하는 선단이 있으면 그 항구·품목에 시세 충격을 건다.
    `advanceDays`·`waitDays`가 부르는 `rollShockEvents` 옆에 선다. */
export function rollConvoys(days = 1) {
  const out = [];
  for (const [fid, f] of Object.entries(FACTIONS)) {
    const c = f.convoy;
    if (!c?.everyDays) continue;
    for (let d = state.day - days + 1; d <= state.day; d++) {
      if (d <= 0 || d % c.everyDays !== 0) continue;
      for (const cityId of c.to) {
        const city = CITY_BY_ID[cityId];
        if (!city) continue;
        for (const gid of c.goods) {
          /* ★ 수요 도시에만 — 산지에 걸면 싸게 살 기회가 된다 */
          if (city.demand?.[gid] == null) continue;
          /* ★ **`addShock`을 쓴다** — 같은 도시·품목에 같은 이유가 이미 걸려 있으면
             기간만 늘린다(무한 중첩 방지). 손으로 push하면 그 규칙을 비켜 간다. */
          addShock(cityId, gid, FACTION.convoyMult, FACTION.convoyDays, `convoy:${fid}`);
          out.push({ fac: fid, city: cityId, good: gid });
        }
      }
    }
  }
  if (out.length) {
    for (const o of out) {
      pushLog(`${FACTIONS[o.fac].name}의 정기선단이 ${CITY_BY_ID[o.city].name}에 들었다`
            + ` — ${GOOD_BY_ID[o.good].name} 값이 주저앉는다.`, 'warn');
    }
  }
  return out;
}

/* ── 계약 가로채기 (§3-4) ────────────────────────────────────────────
   ★ **손실이 선금 반환뿐**인 것이 중요하다. 가로채기가 파산을 만들면
     그것은 경쟁이 아니라 사고다. 위약금은 안 문다 — 내 잘못이 아니다. */
export function rollPoach() {
  const c = state.contract;
  if (!c || c.poachRolled) return null;
  const half = c.taken + Math.round((c.due - c.taken) / 2);
  if (state.day < half) return null;
  c.poachRolled = true;
  const fid = c.by;
  if (!FACTIONS[fid]) return null;
  const odds = regardOf(fid) <= REGARD.refuseAt ? FACTION.poachHard : FACTION.poachOdds;
  if (Math.random() >= odds) return null;
  const back = c.advance ?? 0;
  state.contract = null;
  if (back > 0) { state.gold -= back; book('outgo', 'upkeep', back); }
  pushLog(`${FACTIONS[fid].name}이(가) 그 일감을 다른 배에 넘겼다 — 선금 ${back.toLocaleString('ko-KR')}닢만 토했다.`
        + ' 위약금은 없다. 내 잘못이 아니다.', 'bad');
  return { fac: fid, back };
}

/* ══ A-10 3단계 · 회사의 벌목 · 세력끼리의 나포 (SPEC-factions §3-6·§8-1) ══
   ★★ **이 층이 「회사」를 규칙으로 무섭게 만든다.** 다른 아홉과는 값을 치르면 대화가 되는데,
     회사는 **관계가 0에서 내려가기만 하고 회복하는 길이 돈이 아니다**(`REGARD.companyCap` — 1단계).
     회복하는 유일한 길은 **그 산지에서 손을 떼고 90일을 기다리는 것**(자연 삭음)이다.
   ★ 그리고 **파는 대신 벤다** — 값을 지키는 방법이 파는 것을 줄이는 것이 아니라
     자라는 것을 없애는 것이다. 아래 `rollFelling`이 그 한 줄이다. */

/** 오늘 「벌목」이 걸리는가 — `sells: 'nothing'`인 세력이 regard ≤ −3일 때, 그 세력이 쥔
    산지의 그 품목에 **공급 충격**(값이 오른다)을 60일마다 건다.
    ⚠️ **새 수입원이 아니다.** 산지 값이 **오르므로 사는 쪽이 손해**이고, 수요지 값은
      한 톨도 안 건드리므로 **팔 때 이득이 되는 자리가 없다.** */
export function rollFelling(days = 1) {
  const out = [];
  for (const [fid, f] of Object.entries(FACTIONS)) {
    if (f.sells !== 'nothing') continue;
    if (regardOf(fid) > FACTION.fellAt) continue;
    for (let d = state.day - days + 1; d <= state.day; d++) {
      if (d <= 0 || d % FACTION.fellEvery !== 0) continue;
      for (const cityId of f.grip.cities) {
        const city = CITY_BY_ID[cityId];
        if (!city) continue;
        for (const gid of f.grip.goods) {
          /* ★ **산지에만** 건다 — 그 물건이 자라는 자리를 베는 것이다 */
          if (city.supply?.[gid] == null) continue;
          addShock(cityId, gid, FACTION.fellMult, FACTION.fellDays, `fell:${fid}`);
          out.push({ fac: fid, city: cityId, good: gid });
        }
      }
    }
  }
  for (const o of out) {
    pushLog(`${FACTIONS[o.fac].name}이(가) ${CITY_BY_ID[o.city].name}의 ${GOOD_BY_ID[o.good].name}`
          + '을(를) 베어 냈다 — 파는 것을 줄이는 대신 자라는 것을 없앤다. 값이 뛴다.', 'bad');
  }
  return out;
}

/** 저 둘이 서로 싸우는 사이인가 — `FACTION_TIES.war`는 대칭이다 */
export function atWar(a, b) {
  return (FACTION_TIES.war ?? []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/* ── 세력끼리의 나포 — **목격할 뿐이다** (§8-1 ①) ──────────────────────
   ★ *"실선(싸움)은 전부 세력끼리다 — 주인공에게로 오는 실선이 하나도 없다."*
     ⚠️ **플레이어에게 아무것도 안 준다.** 그 물건이 그 항구에서 귀해지는 것을 볼 뿐이다.
     ⚠️ **상선 정원을 안 줄인다** — 털린 배는 다시 채워진다. 그래서 `state.npcs`를 안 건드린다.
   ★ 기존 `raid` 충격을 그대로 재사용한다 — 새 사건 유형을 만들지 않는다. */
export function rollFactionRaid(days = 1) {
  const pairs = FACTION_TIES.war ?? [];
  if (!pairs.length) return null;
  if (Math.random() >= FACTION.raidPerDay * days) return null;
  const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
  const fa = FACTIONS[a], fb = FACTIONS[b];
  if (!fa || !fb) return null;
  /* 터는 쪽·털리는 쪽을 반반으로 정하고, **털린 쪽이 쥔 산지**에서 그 물건이 귀해진다 */
  const [hunter, prey] = Math.random() < 0.5 ? [fa, fb] : [fb, fa];
  const cities = prey.grip.cities.filter((id) => CITY_BY_ID[id]);
  if (!cities.length) return null;
  const cityId = cities[Math.floor(Math.random() * cities.length)];
  const goods = prey.grip.goods.filter((g) => CITY_BY_ID[cityId].supply?.[g] != null);
  if (!goods.length) return null;
  const gid = goods[Math.floor(Math.random() * goods.length)];
  addShock(cityId, gid, FACTION.raidMult, FACTION.raidDays, 'facraid');
  pushLog(`${CITY_BY_ID[cityId].name} 앞바다에서 ${hunter.name}이(가) ${prey.name}의 배를 끌고 갔다`
        + ` — ${GOOD_BY_ID[gid].name}값이 뛴다. 이쪽으로 온 배는 아니다.`, 'warn');
  return { hunter: hunter.name, prey: prey.name, city: cityId, good: gid };
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
      /* ★ **원수(regard ≤ −6)면 그 세력이 문서를 안 판다.** 관계가 무는 것은 세율이 아니라
         **접근권**이다 — 값을 더 받는 것이 아니라 아예 안 내준다. 거절 문구는 명부의 것을 그대로 쓴다.
         ⚠️ 세율을 다시 곱하지 않는다(이중과세 금지 · 그것은 `infamyTariffUp`의 몫이다). */
      const refused = sellBlocked(cityId, 'permit');
      if (refused) return { ok: false, reason: refused };
      if ((b.permit[rid] ?? 0) > state.day) return { ok: false, reason: '이미 이 바다의 문서를 갖고 있다' };
      // ★ 결함 C — 부관·갈래 특전으로 이미 세율 바닥(BOON.tariffFloor)에 눌려 있으면
      //   문서를 사도 실효세가 안 움직인다. 사기 전에 실제 효과를 재서 문구에 넣는다
      //   (막지는 않는다 — 시장 깊이 등 세율 말고 다른 이유로 살 수도 있으므로).
      const cut = tariffCutPreview('permit', cityId);
      pay();
      b.permit[rid] = state.day + BOON.permitDays;
      return { ok: true, fee, kind: 'permit',
               line: cut.delta > 0
                 ? `${BOON.permitDays}일 동안 이 바다에서 세가 ${(cut.before * 100).toFixed(2)}%에서 `
                   + `${(cut.after * 100).toFixed(2)}%로 내려간다.`
                 : `이 항구는 이미 세율이 바닥이다(부관·특전으로 ${(cut.before * 100).toFixed(2)}%) — `
                   + `문서를 사도 세는 그대로다.` };
    }
    case 'smuggle': {
      if ((b.smuggle[cityId] ?? 0) > state.day) return { ok: false, reason: '이 항구에서는 이미 길이 나 있다' };
      const cut = tariffCutPreview('smuggle', cityId);
      pay();
      b.smuggle[cityId] = state.day + BOON.smuggleDays;
      return { ok: true, fee, kind: 'smuggle',
               line: cut.delta > 0
                 ? `${BOON.smuggleDays}일 동안 이 항구에서 세가 ${(cut.before * 100).toFixed(2)}%에서 `
                   + `${(cut.after * 100).toFixed(2)}%로 내려간다. 들키면 그때 일이다.`
                 : `이 항구는 이미 세율이 바닥이다(부관·특전으로 ${(cut.before * 100).toFixed(2)}%) — `
                   + `길을 터도 세는 그대로다.` };
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
      /* ★ 일감이 안 걸리는 항구에서 **일감 갱신을 팔면 돈만 받고 아무 일도 안 난다** —
         `contractOffer`가 `null`을 내므로 갈아 줄 자리가 없다. 값을 받기 전에 거절한다. */
      if (!contractFactionOK(cityId)) {
        return { ok: false, reason: FACTIONS[factionOfCity(cityId)]?.lines?.refuse
                                 ?? '이 항구의 게시판에는 걸릴 일감이 없다' };
      }
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
    /* ★ `bounty-tip` — **찾아갈 수 있게 한다**(SPEC-supremacy §1-3 (b) · `UNIMPLEMENTED N5`).
       값은 `figureFee`가 아니라 그자의 현상금에서 나오므로, 인물이 팔 때도 `buyBountyTip`을 거친다.
       인물 카드는 "누구의 소식인가"를 못 고르므로 **이 바다에서 아직 안 닫힌 자 중 가장 싼 쪽**을 판다. */
    case 'bounty-tip': {
      const open = rosterOpenIn(rid);
      if (!open.length) return { ok: false, reason: '이 바다에는 이름이 남은 자가 없다' };
      const def = open.reduce((a, b) => (bountyTipPrice(a) <= bountyTipPrice(b) ? a : b));
      return buyBountyTip(def);
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
  /* ★ **낸 세를 그 항구 앞으로 적는다**(C-18) — 나라가 조선소를 짓는 지표다.
     새 수입원이 아니라 이미 내던 것을 **세는** 것뿐이다. → `data.js: CIVIC` */
  noteDues(state.at, tariff);
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
  /* ★ **동료의 코멘다 몫** — 부관 성과급과 **같은 자리**에서, 오직 남은 이익에서만 나간다.
     밑진 거래에서는 떼지 않는다(손해에 수수료까지 물면 되팔기가 아예 막힌다).
     편무 25% · 쌍무 50%는 사료 그대로다 → `data.js: COMMENDA`.
     ⚠️ **밑절미는 「매매차익」이지 「순이익」이 아니다** — 항해비·급여·보험·유지비는 플레이어가 문다.
       근거 JSON(`commendaSplit`)에 **경비를 누가 물었는지가 없어서** 비율을 못 바꾼다
       (없는 근거로 수치를 만들지 않는다는 이 저장소 규약). 대신 **화면이 그렇게 말한다** —
       *"매매차익의 N% · 항해비는 내가 문다"*. 실플레이가 *"이익의 50%"*를 순이익으로 읽었다(ISSUES #30). */
  let mcut = 0;
  const mrate = mateCut();
  if (profit - cut > 0 && mrate > 0) {
    mcut = Math.round((profit - cut) * mrate);
    state.gold -= mcut;
    const ms = crewMates();
    for (const m of ms) {
      const share = (m.joint ? COMMENDA.cutJoint : COMMENDA.cutSole) / Math.max(1e-9, mrate);
      state.mates[m.id].earned += Math.round(mcut * share);
    }
  }
  /* ★ **선원 사무역(quintalada)** — P4-a. 부관·동료와 **같은 자리**에서, 남은 이익에서만 뗀다.
     사료에서 선원은 삯만 받고 타지 않았다: 제 몫의 짐을 실을 권리가 계약의 절반이었고
     실측에서 그것이 총수입의 20~46%였다(`data.js: PRIVATE_TRADE`).
     ★ **인원에 비례한다** — 큰 배는 사람이 많고, 그래서 규모가 곧 비용이 된다.
       갈레온 46명이면 −18.4%, 낡은 바사 5명이면 −2%. 「많이 벌어도 유지비가 같이 오른다」가
       계수 하나가 아니라 **배를 키운 결과**로 오게 하는 자리다. */
  let pcut = 0;
  const prate = privateTradeCut();
  if (profit - cut - mcut > 0 && prate > 0) {
    pcut = Math.round((profit - cut - mcut) * prate);
    state.gold -= pcut;
  }
  state.stats.profit += profit - cut - mcut - pcut;
  /* 매출·관세·성과급은 한 거래에서 세 갈래로 갈린다 — 장부에도 셋으로 적는다.
     순이익 한 줄로 뭉치면 "관세로 얼마가 나갔나"를 정산 화면이 못 보여준다.

     ★ 매출은 **관세를 떼기 전(`raw`)**으로 적는다. `gain`은 이미 관세가 빠진 값이라
       그것을 적으면서 관세를 지출로 또 적으면 **관세가 두 번 잡힌다**
       (실제로 이 버그로 장부가 금고와 8닢 어긋났다 — tools/test-payroll.mjs ⑥이 잡았다). */
  book('income', 'sales', raw);
  book('outgo', 'tariff', tariff);
  book('outgo', 'officer', cut + mcut);
  // 선원 몫은 급여 갈래에 적는다 — 삯의 다른 절반이지 성과급이 아니다
  book('outgo', 'wages', pcut);
  /* ★ **판매소는 쏟아붓는 벌점을 시간으로 바꾼다**(3단계 · §2-5). 파는 쪽에만 걸린다 —
     살 때도 깎으면 같은 항구에서 사고팔기를 되풀이하는 무한 루프가 열린다. */
  const scut = shopCut(goodId, state.at);
  addPressure(state.at, goodId, max * (1 - scut));
  return {
    ok: true, qty: max, gain, tariff, cut, mateCut: mcut, crewCut: pcut, shopCut: scut,
    unit: Math.round(gain / max),
    base: state.prices[state.at][goodId], profit: profit - cut - mcut - pcut,
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
/* ── C-3 · 기한은 **실제로 가는 길**로 잰다 ─────────────────────────────
   ★ `voyageDays(a,b)`는 **직선거리**다. 이웃끼리는 그것이 곧 항로지만, 계약 목적지는
     2홉까지 뽑으므로 **직선이 길이 아니다.** 게다가 권역이 다르면 좌표계 자체가 달라
     (`regions/index.js` 머리주석) 직선거리는 **뜻이 없다** — 바르셀로나→아바나가 직선 13일인데
     실제 길은 75일이었다(세비야를 거쳐 대서양을 건넌다).
   ⇒ 실측: 주문 530건 가운데 **38건(7.2%)이 기한 안에 도착이 불가능**했다.
     받는 순간 실패가 확정된 일감이라, 이것은 어려움이 아니라 결함이다.
   ★ 목적지가 1~2홉이라 **BFS를 2홉으로 닫는다** — 항구 화면이 매 프레임 부르는 자리다. */
export function hopDays(aId, bId, day = state.day) {
  if (aId === bId) return 0;
  const nb = neighborsOf(aId);
  if (nb.includes(bId)) return voyageDays(aId, bId, day);
  let best = null;
  for (const m of nb) {
    if (!neighborsOf(m).includes(bId)) continue;
    const d = voyageDays(aId, m, day) + voyageDays(m, bId, day);
    if (best == null || d < best) best = d;
  }
  return best;                                  // 2홉 안에 길이 없으면 null
}

export function contractOffer(cityId = state.at, day = state.day) {
  /* 사흘마다 갈리는 것이 기본이고, **중개인에게 값을 치르면 한 칸 앞당겨 다른 일감을 본다**
     (`boons.reroll`). 드나들며 새로 뽑을 수는 없다는 규칙은 그대로다 — 값을 낸 만큼만 바뀐다. */
  const slot = Math.floor(day / 3) + (state.boons?.reroll?.[cityId] ?? 0);
  /* ★ **눈총(regard ≤ −1)이면 이 항구의 자리가 빈다.** 일감을 내는 것은 그 도시의 임자이고,
     그가 나를 안 좋게 보면 상관 게시판에 내 이름이 안 오른다. 값을 무는 것이 아니라
     **일감을 찾아 다른 항구로 가게** 하는 규칙이다(§3-4). */
  if (!contractFactionOK(cityId)) return null;
  const nb = neighborsOf(cityId);
  // 2홉까지 목적지 후보 (먼 곳일수록 보수가 크다)
  const far = new Set();
  for (const n of nb) for (const m of neighborsOf(n)) if (m !== cityId) far.add(m);
  const dests = [...new Set([...nb, ...far])];
  if (!dests.length) return null;

  const r1 = hash(cityId, slot, 'dest');
  const to = dests[Math.floor(r1 * dests.length)];

  const [pl, ph] = CONTRACT.payMul;
  const mul = pl + hash(cityId, slot, 'pay') * (ph - pl);

  /* 보수를 먼저 정하고 수량을 역산한다 — 품목이 비싸다고 계약이 통째로 커지지 않게.
     ★ 그 보수의 크기를 **선복(船腹)**이 정한다 — 상관은 "이 배를 채워 오라"고 발주했지
       상인의 재산을 보고 발주하지 않았다. 근거와 계수는 `data.js: CONTRACT`의 주석. */
  const [vl, vh] = CONTRACT.value;
  const scale = 0.6 + CITY_BY_ID[cityId].size * 0.28;          // 큰 항구일수록 큰 일감
  /* ★ 선단 전체(`cargoCapTotal`)가 아니라 **기함 한 척의 선복**이다.
     사료가 말하는 것은 "단일 계약 = 선단 **한 척분** 화물값"이고, 선단 합으로 재면
     동행을 늘리는 것이 그대로 계약 수입의 배수가 된다 — §5-L이 시장 깊이에서 지적한 것과
     똑같은 구멍을 계약 쪽에 새로 파는 셈이다. 동행선의 몫은 "그 일감을 실을 수 있느냐"
     (`acceptContract`의 `cargoCapTotal`)로만 온다. */
  /* ★ **선복 = 기함 + 동행의 일부**(P2-b). ★1에서는 기함만 셌는데, 그러면 선금 상한만
     `fleetCollateral()`(선단 전체)에 묶이고 **수량은 기함 기준이라 반쪽**이었다.
     동행 적재를 **전량이 아니라 `consortHold`(0.6)만** 세는 것이 그때의 걱정(「동행이 곧 배수」)에
     대한 답이다 — 적재가 7.9배일 때 계약은 4배가 된다. 근거·수치는 `data.js: CONTRACT.consortHold`. */
  let cap = Math.max(1, state.cargoCap);
  for (const k of consortKeys()) cap += (SHIPS[k]?.cargo || 0) * (CONTRACT.consortHold ?? 0);
  const [ml, mh] = CONTRACT.holdMul;
  const hold = Math.min(mh, Math.max(ml, (cap / CONTRACT.holdRef) ** CONTRACT.holdPow));
  const target = (vl + hash(cityId, slot, 'val') * (vh - vl)) * scale * hold;

  /* ★ 작은 일감에는 값싼 물건이 걸린다.
     수량에 하한(`qtyFloor`)이 있어서, 목표 보수가 작을 때 금괴·비단이 걸리면 다섯 개만으로도
     규모가 통째로 튀어 오른다(금괴 5개 = 3,432닢). 그래서 **그 일감 크기로 다섯 개를 살 수 있는
     물건**만 후보로 둔다. 사료 쪽도 같다 — 작은 배에 오는 주문은 곡물·소금·목재 같은 부피화물이었고
     귀중품 위탁은 큰 상관이 큰 배에 맡겼다. 후보가 하나도 없으면 그 항구에서 가장 싼 것으로 간다
     (일감이 사라지지는 않게 — 콘텐츠를 줄이지 않는다). */
  const wants = Object.keys(CITY_BY_ID[to].demand);
  const all = wants.length ? wants : GOODS.map((g) => g.id);
  const room = target * 1.25;
  const fits = all.filter((id) => priceOf(to, id) * CONTRACT.qtyFloor * mul <= room);
  const goods = fits.length ? fits
    : [all.reduce((a, b) => (priceOf(to, a) <= priceOf(to, b) ? a : b))];
  const goodId = goods[Math.floor(hash(cityId, slot, 'good') * goods.length)];
  const unit = priceOf(to, goodId);

  /* 수량 상한도 선복이 정한다 — 기함 화물칸의 1.2배까지(고정 64였다. 그 고정값이 값싼 부피화물이
     걸린 큰 배의 일감을 눌러 놓고 있었다). 값싼 물건이 걸렸을 때만 실제로 문다. */
  const qhi = Math.max(CONTRACT.qtyFloor, Math.round(cap * CONTRACT.qtyCap));
  const qty = Math.max(CONTRACT.qtyFloor, Math.min(qhi, Math.round(target / Math.max(1, unit * mul))));
  // 부관이 계약서를 짚으면 보수가 오른다 (수량은 그대로 — 규모가 아니라 조건을 고치는 것이다)
  const pay = Math.round(unit * qty * mul * (1 + officerPerk('contractUp') + originPerk('contractUp', cityId)));

  /* ★ 직선이 아니라 **실제로 가는 길**이다(C-3 · 위 `hopDays` 주석).
     2홉 안에 길이 없으면 예전처럼 직선으로 떨어뜨린다 — 일감이 사라지지는 않게. */
  const legs = Math.max(1, hopDays(cityId, to, day) ?? voyageDays(cityId, to, day));
  const [dl, dh] = CONTRACT.daysPad;
  const due = day + Math.round(legs * 1.6) + Math.round(dl + hash(cityId, slot, 'due') * (dh - dl));

  return {
    from: cityId, to, goodId, qty, pay, due,
    /* ★ 선금은 담보를 넘지 못한다 — 해상대차의 담보는 배다(`data.js: CONTRACT.advanceCap`). */
    advance: Math.min(Math.round(pay * CONTRACT.advance),
                      Math.round(fleetCollateral() * CONTRACT.advanceCap)),
    id: `${cityId}:${slot}`,
    /* ★ 일감에 **임자가 생긴다.** 이 한 줄이 "누가 낸 일인가"이고, 납품하면 그가 +1이 된다.
       임자가 없는 항구(어느 세력에도 안 걸리는 도시)는 `null`이라 지금과 똑같이 굴러간다. */
    by: factionOfCity(cityId),
  };
}

export function acceptContract() {
  if (state.contract) return { ok: false, reason: '이미 맡은 주문이 있다' };
  const c = contractOffer();
  if (!c) return { ok: false, reason: '지금은 들어온 주문이 없다' };
  // 실을 수 없는 주문은 받지 못한다 — 큰 계약이 큰 배를 사는 이유가 된다
  if (c.qty > cargoCapTotal()) {
    return { ok: false, reason: `화물칸이 ${c.qty - cargoCapTotal()}칸 모자란다 (${c.qty}개를 실어야 한다)` };
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
  /* ★ **일을 해내면 그 세력이 그것을 적는다.** 관계가 오르는 두 길 중 하나이고(다른 하나는
     덮치지 않는 것, 곧 시간이다), 오르는 쪽에는 **금액이 하나도 안 붙는다** —
     보수도 세율도 그대로다. 늘어나는 것은 숫자 하나뿐이다. */
  let regard = null;
  if (c.by && FACTIONS[c.by]) {
    const before = regardOf(c.by);
    addRegard(c.by, 1, 'contract');
    const after = regardOf(c.by);
    if (after !== before) {
      regard = { fac: c.by, value: after };
      const nm = FACTIONS[c.by].short;
      pushLog(`${nm}${josa(nm, '이/가')} 이 일을 적어 두었다 (관계 ${after > 0 ? '+' : ''}${after}).`, 'good');
    }
  }
  return { ok: true, paid: rest, total: c.pay, regard };
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

/** 지금 지고 있는 빚 */
export const debtOwed = () => state.boons?.loan?.owed ?? 0;

/** 팔 것이 하나도 없나 — 금고·실은 짐·창고 짐·정박선·거점이 전부 비었다.
    ★ 이 상태에서는 **기다림이 판단이 아니라 빈 시간**이다. 실플레이의 36일이 그 시간이었다. */
export function nothingLeft() {
  if (state.gold > 0 || cargoUsed() > 0) return false;
  if (Object.keys(state.holdings ?? {}).length) return false;
  for (const m of Object.values(state.stored ?? {})) if (Object.keys(m).length) return false;
  return Object.keys(state.fleet).every((k) => k === state.shipKey);
}

/* ── 바닥에서 「팔 수 있는 것」을 값과 함께 (C-17) ──────────────
   ★ **규칙은 한 줄도 새로 만들지 않는다.** 회복 경로는 이미 전부 있다 —
     짐(`sell`) · 창고(`takeGoods`) · 정박선(`sellShip`) · 거점(`sellHolding`) ·
     가공장(`sellMill`) · 청산(`liquidate`). 없던 것은 **그것을 말해 주는 화면**이다.
     실플레이 960일차에 금고가 0이 되자 `금화가 모자란다`만 뜨고 *팔 수 있는 것이 있다*는
     말이 어디에도 없어, 러너가 마지막 2,241닢까지 근해를 왕복하다 멈췄다(C-17).
   ★ 값 계산이 화면에 있으면 시장 마찰(`gainFor`)·재판매율(`SHIP_RESALE`)·되사기율
     (`HOLDING.sellBack`·`WORK.sellBack`)이 규칙과 갈라진다. 그래서 여기서 센다.
     화면은 이 표를 줄로 옮기고 단추만 건다. */

/** 이 항구에서 **가장 싸게 나갈 수 있는 한 항차**의 값 — "나갈 수 있나"의 기준.
    ★ 출항 자체는 막히지 않는다(못 낸 몫은 `payFine`이 빚으로 넘긴다 — *"길은 열어 두되 값은 남긴다"*).
      그래도 이 값을 못 채우면 **떠나는 순간 빚이 는다.** 안내를 띄울 자리가 거기다. */
export function cheapestExit(cityId = state.at) {
  let best = null;
  for (const to of neighborsOf(cityId)) {
    const d = voyageDays(cityId, to);
    const c = voyageCost(d, state.crew, { from: cityId, to }).total;
    if (best === null || c < best) best = c;
  }
  return best;   // 이웃이 없는 항구는 null (아홉 바다에는 없지만 방어)
}

/** 지금 이 항구에서 **당장 금화로 바꿀 수 있는 것**들 — 값이 큰 것부터.
    돌려주는 줄: `{ kind, key, label, note, gold }`
      cargo(실은 짐 · 품목마다 한 줄) · stored(창고 짐 · 한 줄) · ship(정박선 · 배마다)
      · holding(이 항구 거점) · mill(가공장 · 사슬마다)
    ★ 빚(`buyService('loan')`)과 청산(`liquidate`)은 **파는 것이 아니라서 여기 안 담는다** —
      화면이 따로 덧붙인다(빚은 이 항구에 그 사람이 있어야 하고, 청산은 마지막 문이다). */
export function salvage(cityId = state.at) {
  const rows = [];

  // ① 실은 짐 — **여기서 지금 팔면 금고에 들어오는 돈**(`sellNet` — 세·성과급·몫까지 뗀 값)
  for (const [gid, n] of Object.entries(state.cargo)) {
    if (!n) continue;
    const gold = sellNet(gid, n, cityId);
    if (gold <= 0) continue;
    rows.push({ kind: 'cargo', key: gid, gold,
                label: `${GOOD_BY_ID[gid]?.name ?? gid} ${n}칸`,
                note: `${Math.round(gold / n).toLocaleString('ko-KR')}닢/칸 · 세·몫 뺀 값` });
  }

  // ② 창고에 둔 짐 — 꺼내서 팔아야 하므로 화물칸이 필요하다(그래서 note에 적는다)
  const store = state.stored?.[cityId] ?? {};
  let sn = 0, sv = 0;
  for (const [gid, n] of Object.entries(store)) {
    if (!n) continue;
    sn += n;
    sv += sellNet(gid, n, cityId);
  }
  if (sn > 0) rows.push({ kind: 'stored', key: cityId, gold: sv,
                          label: `창고에 둔 짐 ${sn}칸`, note: '배로 옮겨 실은 뒤 판다' });

  // ③ 정박해 둔 배 — **여기 있는 것만** 팔린다(다른 항구의 배는 그 항구로 가야 한다)
  for (const key of Object.keys(state.fleet)) {
    if (key === state.shipKey) continue;
    if (state.fleet[key].at !== cityId) continue;
    rows.push({ kind: 'ship', key, gold: resaleOf(key),
                label: `${SHIPS[key]?.name ?? key} (정박)`,
                note: `정가의 ${Math.round(SHIP_RESALE * 100)}%` });
  }

  // ④ 이 항구의 거점 — 헐값이지만 **채권자가 못 가져가는 것을 내가 던지는** 자리다
  if (state.holdings?.[cityId]) {
    /* ★ 부동산은 **등급까지 적는다.** 값은 이미 맞다(`holdingsValue`가 `spent`를 쓰고
       승급 차액이 거기 쌓인다) — 문제는 이름이었다: 고급 여관과 선술집이 똑같이
       *"거점 — 여관"*으로 읽혀, **무엇을 던지는지 모르고 던지는** 줄이 된다.
       바닥에서 나가는 문(C-17)과 급여일(C-8)이 같은 표를 쓰므로 여기 한 곳만 고치면 된다. */
    const kinds = HOLDING_KEYS.filter((k) => state.holdings[cityId][k])
      .map((k) => (HOLDINGS[k].grades
        ? (estateDef(k, estateGrade(k, cityId))?.name ?? HOLDINGS[k].name)
        : HOLDINGS[k].name));
    rows.push({ kind: 'holding', key: cityId, gold: holdingsValue(cityId),
                label: `거점 — ${kinds.join('·')}`,
                note: `들인 돈의 ${Math.round(HOLDING.sellBack * 100)}%`
                    + (Object.keys(store).length ? ' · 창고 짐도 함께 넘어간다' : '') });
  }

  // ⑤ 가공장 — 돌리는 중이면 못 판다(원료가 사라진다). 그 사실을 note가 말한다.
  for (const [k, w] of workList(cityId)) {
    if (!k.startsWith('mill:')) continue;
    const r = Object.values(CHAIN_BY_ID).find((c) => chainOut(c) === k.slice(5));
    if (!r) continue;
    let spent = 0;
    for (let lv = 1; lv <= w.level; lv++) spent += millPrice(r.id, cityId, lv);
    rows.push({ kind: 'mill', key: r.id, gold: w.job ? 0 : Math.round(spent * WORK.sellBack),
                label: `${r.work} ${w.level}등급`,
                note: w.job ? '가공 중이라 못 판다' : `들인 돈의 ${Math.round(WORK.sellBack * 100)}%` });
  }

  rows.sort((a, b) => b.gold - a.gold);
  return rows;
}

/** 위 표의 합 — "지금 다 팔면 얼마인가" 한 줄 */
export const salvageValue = (cityId = state.at) =>
  salvage(cityId).reduce((a, r) => a + r.gold, 0);

/* ── 바닥에는 바닥의 규칙이 있다 ────────────────────────────────
   ★ 빚은 30일마다 ×1.25로 불기만 하고 **끝이 없었다.** 금고 0·화물 0이 되면 살 돈이 없어
   못 사고 실은 것이 없어 못 팔아, 실플레이에서 **36일이 그냥 비었다**(ISSUES #3).
   답은 해상대차(bottomry)에 있다 — **담보는 배와 화물이고, 배가 사라지면 채무도 사라진다.**
   근거·값·"왜 이 형태인가"는 `data.js: BANKRUPT`의 주석이 정본이다. */

/** 채권자의 집행 — 금고 → 정박선 → 창고 짐 → (그래도 모자라면) 청산.
    ★ **거점은 손대지 않는다.** 부동산은 해상대차의 담보가 아니다 — 그 대신 내가 스스로
      헐값에 팔 수 있다(`sellHolding`). 채권자는 못 가져가고 나는 던질 수 있다는 이 비대칭이
      「파산 전에 무엇을 버릴 것인가」를 판단으로 만든다. */
export function enforceDebt() {
  const loan = state.boons?.loan;
  if (!loan || loan.owed <= 0) return null;
  const out = { need: loan.owed, gold: 0, ships: [], stored: 0, surplus: 0, liquidated: false };
  let need = loan.owed;

  // ① 금고부터
  const g = Math.min(state.gold, need);
  state.gold -= g; need -= g; out.gold = g;

  /* ② 정박해 둔 배 — **싼 것부터** 넘긴다.
     채권자는 값을 채우면 그만이므로, 좋은 배를 남기는 쪽이 "다시 일어설 수 있게" 한다.
     그것이 이 규칙의 목적이다(벌이 아니라 바닥의 형태). 바다에 함께 나선 동행선(`consorts`)과
     지금 타고 있는 기함은 여기서 안 건드린다 — 그 둘은 ④의 청산에서 한꺼번에 간다. */
  if (need > 0) {
    const keys = Object.keys(state.fleet)
      .filter((k) => k !== state.shipKey && !isConsort(k))
      .sort((a, b) => resaleOf(a) - resaleOf(b));
    for (const k of keys) {
      if (need <= 0) break;
      need -= resaleOf(k);
      delete state.fleet[k];
      out.ships.push(k);
    }
  }

  // ③ 창고에 둔 짐 — 담보의 나머지 절반이 '화물'이다
  if (need > 0) {
    for (const [cid, m] of Object.entries(state.stored ?? {})) {
      if (need <= 0) break;
      for (const [gid, n] of Object.entries(m)) {
        if (need <= 0) break;
        const unit = state.prices[cid]?.[gid] ?? GOOD_BY_ID[gid]?.base ?? 0;
        const take = Math.min(n, Math.ceil(need / Math.max(1, unit)));
        m[gid] -= take;
        if (!m[gid]) delete m[gid];
        need -= unit * take;
        out.stored += take;
      }
      if (!Object.keys(m).length) delete state.stored[cid];
    }
  }

  if (need > 0) {
    /* ④ 그래도 모자라면 **기함과 동행선까지** 넘기고 셈이 끝난다(해상대차의 마지막 조항).
       ★ 넘긴 배값이 빚보다 크면 **잉여를 돌려준다.** 이것이 없으면 빚 500닢에 갈레온
         한 척(매각가 10,725닢)을 통째로 잃는다 — 압류액과 미납액의 자릿수가 어긋나는
         바로 그 결함(ISSUES #4)을 여기 다시 파는 셈이다. */
    for (const k of Object.keys(state.fleet)) {
      if (k !== BANKRUPT.keepShip) need -= resaleOf(k);
    }
    out.liquidated = true;
    liquidate();
    if (need < 0) {
      out.surplus = Math.round(-need);
      state.gold += out.surplus;
      pushLog(`배를 넘기고 남은 ${out.surplus.toLocaleString('ko-KR')}닢이 돌아왔다.`, 'warn');
    }
    return out;
  }
  /* 값을 채우고 남으면 돌려준다 — 경매 잉여금이다. 이것이 있어야 집행이 곧바로
     "금고 0"으로 되돌아가지 않고, 배 한 척을 잃은 대가로 다시 나설 밑천이 남는다. */
  out.surplus = Math.round(-need);
  state.gold += out.surplus;
  state.boons.loan = null;
  const lost = out.ships.map((k) => SHIPS[k].name).join('·');
  pushLog(`빚 ${out.need.toLocaleString('ko-KR')}닢을 채권자가 집행했다`
        + (lost ? ` — ${lost}${josa(lost, '을/를')} 넘겼다.` : '.')
        + (out.stored ? ` 창고에 둔 짐 ${out.stored}개도 갔다.` : '')
        + (out.surplus ? ` 남은 ${out.surplus.toLocaleString('ko-KR')}닢이 돌아왔다.` : ''), 'bad');
  return out;
}

/** 청산 — 배를 넘기면 셈이 끝난다. **판은 끝나지 않고 1일차의 조건으로 돌아간다.**
    남는 것: 거점 · 세력 관계 · 악명 · 아는 항구 · 해적 명부 · 공업력 승급.
    가는 것: 배 전부(낡은 바사만 남는다) · 실은 짐 · 창고 짐 · 대부분의 선원 · 맡은 주문. */
export function liquidate() {
  /* ★ **그 바다의 삭은 배**를 남긴다(2026-08-27). 시작배는 아홉으로 갈렸는데 청산 뒤에 남는
     배만 `hulk` 하나여서, 광저우에서 파산한 사람이 지중해 배를 받고 있었다.
     제원이 아홉 나란하므로 난이도는 안 움직인다 — 얼굴만 맞는다. */
  const keep = wreckShipOf(currentRegion()) ?? BANKRUPT.keepShip;
  const s = SHIPS[keep];
  const lostShips = Object.keys(state.fleet).filter((k) => k !== keep);
  const arms = { light: s.guns, medium: 0, long: 0 };

  state.fleet = { [keep]: { at: state.at, hp: s.hp, arms: { ...arms }, refits: {} } };
  state.consorts = {};
  state.towing = null;
  state.shipKey = keep;
  state.hp = s.hp; state.maxHp = s.hp; state.cargoCap = s.cargo;
  state.guns = s.guns; state.arms = { ...arms }; state.refits = {};
  state.shots = { grape: 0, chain: 0, heated: 0 };
  state.cargo = {}; state.buyPrice = {};
  state.stored = {};
  state.contract = null;
  state.gold = BANKRUPT.seedGold;
  if (state.boons) state.boons.loan = null;    // ★ 배가 사라지면 채무도 사라진다
  /* ★ **코멘다도 여기서 끝난다** — 안 끝내면 청산 뒤에도 동료가 갑판에 남아 50%를 떼고,
     내리는 순간 밑천이 **빚으로 부활한다**(실플레이 663일차: 1,800닢 · supremacy ISSUES #29).
     그러면 *"셈이 끝났다 — 빚은 없다"*가 거짓이 되고, ★3이 세운 「끝이 있는 실패」가 무너진다.
     ★ **사료가 그 답을 준다 — 코멘다는 대차가 아니라 공동 위험 인수다.** 쌍무 콜레간자에서
       항해자가 댄 1/3은 *그도 그 항해에 건 자본*이라, 배와 짐이 사라지면 **양쪽이 함께 잃는다** —
       그가 투자자에게 물어낼 것이 없다. 해상대차(배가 사라지면 채무 소멸)와 **같은 논리의 다른 얼굴**이다.
     ⇒ 밑천은 **돌려주지 않는다**(`dismissMate`를 안 거친다). 전략적 파산이 되지도 않는다 —
       거기 닿으려면 금고·정박선·창고 짐·배를 먼저 다 잃어야 한다. */
  const mateN = mateCount();
  const mateStakes = Object.values(state.mates ?? {}).reduce((a, m) => a + (m.stake || 0), 0);
  state.mates = {};
  /* 선원 — 대부분 떠나고 배를 뜨게 할 최소 인원만 남는다. **삯은 못 받은 채로다**
     (소설 `story/CHARACTERS.md` — *"아덴의 파산 뒤에도 삯을 못 받은 채 남는 셋"*). */
  state.crewMax = s.crewMax;
  state.crew = Math.min(state.crew, s.crewMin ?? 0);
  state.payroll.due = 0; state.payroll.arrears = 0;
  trimLoadout();
  state.everOwned?.add(keep);

  pushLog('파산했다. 채권자가 배와 짐을 가져가고 셈이 끝났다 — 빚은 없다.', 'bad');
  if (mateN) {
    pushLog(`함께 걸었던 ${mateN}명도 부두에 내렸다.`
          + (mateStakes ? ` 그들이 댄 밑천 ${mateStakes.toLocaleString('ko-KR')}닢도 같이 잃었다 —`
                          + ' 코멘다는 빌린 돈이 아니라 함께 건 돈이다.' : ''), 'bad');
  }
  pushLog(`남은 것은 ${s.name} 한 척과 ${BANKRUPT.seedGold}닢, 그리고 여태 열어 둔 항구들이다.`, 'warn');
  return { lostShips, kept: keep, gold: state.gold, mates: mateN, mateStakes };
}

/* ── 명부 사냥 — 찾아갈 수 있게 한다 ───────────────────────────
   ★ 실플레이 **984 게임일 동안 명부 해적을 한 번도 못 만났다**(supremacy ISSUES #12).
   조우는 나는데, 이름 있는 자는 `npcsOnLeg`가 **그 배의 `at`·`to`가 정확히 내 두 항구일 때만**
   잡고 아니면 `pickEnemy()`가 **이름 없는 적**을 낸다. 세계가 264 도시라 그 일치는 사실상 안 난다 —
   상선이 겪던 것과 같은 문제이고(C-15), 상선만 폴백을 받았다.
   패권 조건 ③(등급5 격파)과 목표 ④(명부 40)가 여기 걸려 있으므로 **우연에 맡길 수 없다.**

   해법은 SPEC-supremacy §1-3이 이미 적어 두었다 — **강하게 두되 찾아갈 수 있게 한다.**
     (b) `bounty-tip`  그자가 지금 어느 구간을 도는지를 산다 → 그 구간에 나가면 **그자가 온다**
     (c) 초무(招撫)     못 이길 상대는 **소굴 항구에서 값을 치러** 명부를 닫는다(격파보다 비싸다)
   ⚠️ **해적을 약하게 만들지 않는다.** 문제는 강해서 못 잡는 것이 아니라 만날 수가 없는 것이었다.
   값은 `data.js: ROSTER`(`tipRate`·`bountyFloorRate`·`tipDays`·`tameMult`·과소기). */

/** 이 바다에서 아직 이름이 안 지워진 자들 — 명부(`ALL_PIRATES`)가 정본이다 */
export function rosterOpenIn(regionId) {
  return ALL_PIRATES.filter((d) => (!regionId || d.region === regionId)
    && !state.slain?.[`pirate:${d.id}`] && !state.tamed?.[d.id]);
}

/** 목에 걸린 값을 적어 둔다 — **항구에서 받는다**(나포심판 뒤 관이 치르는 돈) */
export function oweBounty(name, coin) {
  if (!(coin > 0)) return 0;
  (state.bountyDue ??= []).push({ name: name ?? '이름 없는 자', coin: Math.round(coin) });
  return Math.round(coin);
}

/** 입항하면 밀린 현상금을 받는다. `arrive`가 부른다 — 이기고 **살아 돌아와야** 받는다. */
export function payBounties() {
  const due = state.bountyDue ?? [];
  if (!due.length) return null;
  const total = due.reduce((a, d) => a + d.coin, 0);
  state.gold += total;
  book('income', 'loot', total);
  state.bountyDue = [];
  return { total, list: due };
}

/** 명부가 닫힐 때 그 배를 세계에서 내리는 자리 — `world.js`가 꽂는다(`setRetireHook`).
    ★ 모듈 방향(`data → state → world → scenes`)을 안 깨려고 후크로 둔다. 안 꽂혀 있으면
      아무 일도 안 일어나므로 시뮬·검증 스크립트가 `world`를 안 불러도 그대로 돈다. */
let retireHook = null;
export const setRetireHook = (fn) => { retireHook = fn; };

/* ── 초무한 자가 그 바다에서 일한다 (과소기 · 토벌 협조) ────────
   ★ 효과는 **그 권역에 매인다** — 무라카미의 과소기가 카리브에서 통할 리 없다.
     그리고 **갱신해야 산다**: 그 바다에 거점이 없으면 `ROSTER.tameGraceDays` 뒤에 식는다
     (이름을 대 줄 사람이 그 항구에 없기 때문이다 · `BOON.permitDays`와 같은 논리). */

/** 그 권역에서 **지금 효과가 살아 있는** 초무의 수 */
export function tamedIn(regionId) {
  if (!regionId) return 0;
  let n = 0;
  for (const [id, day] of Object.entries(state.tamed ?? {})) {
    const def = ALL_PIRATES.find((d) => d.id === id);
    if (!def || def.region !== regionId) continue;
    const fresh = state.day - day <= (ROSTER.tameGraceDays ?? Infinity);
    if (fresh || regionHasHolding(regionId)) n++;
  }
  return n;
}

/** 그 권역에 내 거점이 하나라도 있나 — 과소기를 갱신해 줄 자리 */
export function regionHasHolding(regionId) {
  for (const id of Object.keys(state.holdings ?? {})) {
    if (REGION_OF_CITY[id] === regionId) return true;
  }
  return false;
}

/** 과소기 — 그 권역 해적 조우 확률의 **상대감소**(0~cap) */
export function passOff(regionId) {
  return Math.min(ROSTER.passOddsCap ?? 0, tamedIn(regionId) * (ROSTER.passOddsOff ?? 0));
}

/** 토벌 협조 — 그 권역 **남은 명부**의 소식값 할인(0~cap) */
export function tipOff(regionId) {
  return Math.min(ROSTER.tipOffCap ?? 0, tamedIn(regionId) * (ROSTER.tipOffPer ?? 0));
}

/** 소식 값 — 현상금의 일부. 정보상 `fee`(70~240)와 같은 자릿수가 되게 하한을 둔다.
    ★ **초무한 자가 동료의 소재를 안다** — 그 권역에 초무가 있으면 소식이 싸진다(토벌 협조). */
export const bountyTipPrice = (def) => {
  const b = def?.bounty ?? [0, 0];
  /* 하한은 **그자의 현상금 하한**에 묶인다 — 잔챙이 소식이 잔챙이 값보다 비싸면 사다리가 거꾸로 선다 */
  const base = Math.max(
    ROSTER.tipFloorAbs ?? 0,
    Math.round((b[0] ?? 0) * (ROSTER.bountyFloorRate ?? 0)),
    Math.round((b[1] ?? 0) * ROSTER.tipRate),
  );
  return Math.max(1, Math.round(base * (1 - tipOff(def?.region))));
};

/** 초무 값 — 격파하면 현상금을 **받고**, 초무하면 그 상한의 두 배를 **낸다** */
export const tamePrice = (def) => Math.round((def?.bounty?.[1] ?? 0) * ROSTER.tameMult);

/** 지금 쫓고 있는 자 — `{ id, until }` 또는 null (날이 차면 스스로 식는다) */
export function activeBounty() {
  const b = state.boons?.bounty;
  if (!b || b.until <= state.day) return null;
  return b;
}

/** 그자의 사냥터 구간들 — `'a|b'` 키를 도시 쌍으로 편다(실재하는 항로만) */
export function huntLegs(def) {
  const out = [];
  for (const key of def?.hunt ?? []) {
    const [a, b] = String(key).split('|');
    if (!CITY_BY_ID[a] || !CITY_BY_ID[b]) continue;
    out.push([a, b]);
  }
  return out;
}

/** 소식을 산다 — 그자를 `ROSTER.tipDays` 동안 **만날 수 있게** 된다.
    ★ **그 구간의 시세도 함께 판다**(P6-1). 실플레이에서 삼도의 왜구 사냥이 −301닢이었는데,
      명부 40명의 사냥터를 무역으로 뛰어 보면 **적자가 하나도 없다**(중앙 1,986닢/일 · 기준선의 1.16배).
      당연하다 — **해적은 털 것이 지나가는 곳에 앉아 있다.** 게임이 그 사실을 화면에서 말하지 않아
      플레이어가 **빈 배로 순찰**했을 뿐이다. 그러니 고칠 것은 현상금이 아니라 **정보**다.
    ★ 사료도 한 사람이다 — 상관망(팩토리아)의 편지에는 *"어느 항로에 코르세어가 있다"*와
      *"그 항구의 후추 값이 얼마다"*가 **같은 장에** 적혔다. 상인에게 둘은 같은 정보였기 때문이다
      (`voyage-evidence.json: lossCause` — 손실 원인의 60%가 코르세어).
    ⚠️ **값은 한 닢도 안 올렸다**(`tipRate` 그대로 · 하한은 P6-4에서 *내렸다*). 주는 것은 정보뿐이다. */
export function buyBountyTip(def) {
  if (!def?.id) return { ok: false, reason: '이 소식은 팔 것이 없다' };
  const fee = bountyTipPrice(def);
  if (fee > state.gold) return { ok: false, reason: `금화가 ${(fee - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  const b = (state.boons ??= { permit: {}, smuggle: {}, repair: {}, reroll: {}, loan: null });
  state.gold -= fee;
  book('outgo', 'port', fee);
  b.bounty = { id: def.id, until: state.day + ROSTER.tipDays };
  /* ★ 소식에 **그 구간의 시세가 딸려 온다** — 정보상이 위험과 시세를 같이 팔았다. */
  const legs = huntLegs(def);
  const opened = [];
  const m = (state.scouted ??= {});
  for (const [a, c] of legs) {
    for (const id of [a, c]) {
      if (priceKnown(id)) continue;
      m[id] = state.day;
      opened.push(id);
    }
  }
  const where = CITY_BY_ID[def.base]?.name ?? def.base;
  const legWord = legs.map(([a, c]) => `${CITY_BY_ID[a].name}↔${CITY_BY_ID[c].name}`).join(' · ');
  pushLog(`${def.name}의 소식을 샀다 — ${where} 언저리를 돈다고 한다 (${ROSTER.tipDays}일).`, 'warn');
  if (legWord) pushLog(`그자가 노리는 구간: ${legWord}. 그 항구들 시세도 함께 들었다.`, 'good');
  return { ok: true, fee, kind: 'bounty-tip', def, legs, opened,
           line: `${def.name}${josa(def.name, '이/가')} ${where} 언저리에 있다.`
               + ` ${ROSTER.tipDays}일 안에 그 구간으로 나가면 만난다.`
               + (legWord ? ` 사냥터는 ${legWord} — **그 구간을 무역하며 도는 것이 순찰이다.**` : '') };
}

/** 초무 — **그자의 소굴 항구에서만** 값을 치른다. 명부가 닫히고 악명은 안 오른다 */
export function tamePirate(def, cityId = state.at) {
  if (!def?.id) return { ok: false, reason: '그런 자가 없다' };
  if (state.slain?.[`pirate:${def.id}`] || state.tamed?.[def.id]) {
    return { ok: false, reason: '이미 명부에서 지워진 이름이다' };
  }
  if (def.base !== cityId) {
    return { ok: false, reason: `${CITY_BY_ID[def.base]?.name ?? def.base}까지 가야 말이 닿는다` };
  }
  const fee = tamePrice(def);
  if (fee > state.gold) return { ok: false, reason: `금화가 ${(fee - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  state.gold -= fee;
  book('outgo', 'port', fee);
  (state.tamed ??= {})[def.id] = state.day;
  /* ★ **그자를 지우지 않는다.** 초무는 「돈으로 사라지게 하는 것」이 아니라 「내 편으로 만드는 것」이고,
     지워 봐야 `standIn`이 얼굴 없는 배로 그 자리를 채워 **바다가 하나도 안 안전해진다.**
     대신 **그자가 내 배를 안 건드리고**(조우 갈래가 `rosterClosed`로 거른다) **그 바다에서 일한다**
     (`passOff`·`tipOff` → `data.js: ROSTER`). ISSUES #26이 그 규칙으로 풀린다. */
  pushLog(`${def.name}${josa(def.name, '을/를')} 초무했다 — ${fee.toLocaleString('ko-KR')}닢.`
        + ' 그자는 하던 일을 바꾸지 않았지만, 이제 우리 배는 건드리지 않는다.', 'good');
  return { ok: true, fee, kind: 'tame', def };
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
  /* ★ 여기만 `Math.max(0, …)`로 잘려 **기한을 넘긴 위약금은 증발**하고 있었다 —
     스스로 파기하면(`abandonContract`) 빚으로 남는데 기한을 넘기면 공짜라 규칙이 자기모순이었다
     (곧 "받아 놓고 안 갚고 버티는" 쪽이 언제나 이득이다). 같은 `payFine`을 지난다. */
  const r = payFine(fine, `${CITY_BY_ID[c.to]?.name ?? c.to} 주문의 기한을 넘겼다`);
  state.contract = null;
  return { ...c, fine, owed: r.owed };
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

/* ── 동료 — 코멘다(commenda) ────────────────────
   값과 근거는 `data.js: COMMENDA`의 주석이 정본이다. 여기는 **규칙**만 둔다.
   ★ 특전은 부관·갈래와 **같은 자리에서 더해진다** — 읽는 쪽은
     `officerPerk(k) + originPerk(k) + matePerk(k)` 꼴로 쓴다. 새 계산 경로를 파지 않는다. */

/** 그 항구에서 만나는 동료 — 이미 태운 사람은 빼고 보여 준다 */
export function matesAt(cityId = state.at) {
  return ALL_MATES.filter((m) => m.at === cityId && !state.mates?.[m.id]);
}

/** 지금 태운 동료들 (명부 정의 + 계약 상태) */
export function crewMates() {
  const out = [];
  for (const [id, rec] of Object.entries(state.mates ?? {})) {
    const def = ALL_MATES.find((m) => m.id === id);
    if (def) out.push({ ...def, ...rec });
  }
  return out;
}
export const mateCount = () => Object.keys(state.mates ?? {}).length;
export const mateCap = () => Math.round((FLEET.max ?? 0) * (COMMENDA.maxRatio ?? 1));

/** 동료 특전의 합 — 부관·갈래와 같은 키를 쓴다(새 키를 만들면 규칙이 조용히 무시한다) */
export function matePerk(key) {
  let v = 0;
  for (const m of crewMates()) v += m.perks?.[key] || 0;
  return v;
}

/** 동료가 가져가는 이익 몫의 합 (0~1) — 편무 25% · 쌍무 50% */
export function mateCut() {
  let v = 0;
  for (const m of crewMates()) v += m.joint ? COMMENDA.cutJoint : COMMENDA.cutSole;
  return Math.min(0.9, v);
}

/** 선원이 제 짐으로 가져가는 이익 몫 (0~cap) — 인원에 비례한다.
    ★ `state.crew`가 정본이다(`state.bands`는 기록일 뿐 — 전투·폭풍으로 어긋난다).
    ★ **동행선의 선원은 세지 않는다.** 사무역 권리는 그 배의 화주와 맺은 것이고,
      동행선은 제 몫을 제가 싣는다(그 값은 이미 `consortCost`의 삯으로 나간다).
      선단 몫까지 세면 「동행을 늘리면 매각이 통째로 사라지는」 벌점이 된다. */
export function privateTradeCut(crew = state.crew) {
  return Math.min(PRIVATE_TRADE.cap, Math.max(0, crew) * PRIVATE_TRADE.perCrew);
}

/** 쌍무로 태울 때 그가 내놓는 밑천 */
export const mateStake = (def) => Math.round((def?.hire ?? 0) * (COMMENDA.stakeMul ?? 0));

/** 동료를 태운다. `joint`면 쌍무 콜레간자 — **그가 밑천을 대고 절반을 가져간다.**
    ★ 계약금(`hire`)은 내가 내고, 쌍무면 그의 밑천이 그 자리에서 들어온다 —
      그래서 **초반에는 태우는 것이 순자본 유입**이고(340닢 내고 1,020닢을 받는다)
      후반에는 그 밑천이 아무것도 아니면서 이익의 절반이 나간다. */
export function hireMate(mateId, { joint = false } = {}) {
  const def = ALL_MATES.find((m) => m.id === mateId);
  if (!def) return { ok: false, reason: '그런 사람이 없다' };
  if (state.mates?.[mateId]) return { ok: false, reason: '이미 함께 가고 있다' };
  if (def.at !== state.at) return { ok: false, reason: `${CITY_BY_ID[def.at]?.name ?? def.at}에 있는 사람이다` };
  if (mateCount() >= mateCap()) return { ok: false, reason: `데리고 다닐 수 있는 사람은 ${mateCap()}명까지다` };
  const fee = def.hire ?? 0;
  if (fee > state.gold) return { ok: false, reason: `금화가 ${(fee - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  const stake = joint ? mateStake(def) : 0;
  state.gold -= fee;
  book('outgo', 'wages', fee);
  if (stake) { state.gold += stake; book('income', 'contracts', stake); }
  (state.mates ??= {})[mateId] = { day: state.day, joint: !!joint, stake, earned: 0 };
  pushLog(`${def.name}${josa(def.name, '이/가')} 갑판에 올랐다 (계약금 ${fee.toLocaleString('ko-KR')}닢`
        + (stake ? ` · 쌍무 — 밑천 ${stake.toLocaleString('ko-KR')}닢을 대고 이익의 `
                   + `${Math.round(COMMENDA.cutJoint * 100)}%를 가져간다`
                 : ` · 편무 — 이익의 ${Math.round(COMMENDA.cutSole * 100)}%를 가져간다`) + ').', 'good');
  return { ok: true, fee, stake, def };
}

/** 내려보낸다 — 쌍무였으면 **밑천을 돌려준다**(출자이지 증여가 아니다).
    그가 선장으로 앉아 있던 배는 동행에서 내려진다(`FLEET.requireCaptain`). */
export function dismissMate(mateId) {
  const rec = state.mates?.[mateId];
  if (!rec) return { ok: false, reason: '함께 가는 사람이 아니다' };
  const def = ALL_MATES.find((m) => m.id === mateId);
  const back = COMMENDA.refundStake ? (rec.stake || 0) : 0;
  const r = back ? payFine(back, `${def?.name ?? mateId}의 밑천을 돌려줬다`) : { owed: 0 };
  delete state.mates[mateId];
  for (const k of consortKeys()) if (state.consorts[k]?.captain === mateId) state.consorts[k].captain = null;
  pushLog(`${def?.name ?? mateId}${josa(def?.name ?? mateId, '이/가')} 부두로 내렸다.`
        + (back ? ` 밑천 ${back.toLocaleString('ko-KR')}닢을 돌려줬다.` : ''), 'warn');
  return { ok: true, back, owed: r.owed };
}

/** 동행선에 선장으로 앉지 않은 동료 — 배 하나에 선장 하나 */
export function freeMates() {
  const taken = new Set(consortKeys().map((k) => state.consorts[k]?.captain).filter(Boolean));
  return crewMates().filter((m) => !taken.has(m.id));
}

/* ── 출신 갈래의 특전 ──────────────────────────────────────
   `data.js: ORIGINS`의 다섯 갈래. 부관 특전과 **같은 자리에서 더해진다** —
   읽는 쪽은 `officerPerk(k) + originPerk(k)` 꼴로 쓴다.
   ★ `joseonOnly`가 붙은 **키만** 조선 항구에서만 돈다(결함 D, PM 지시).
     예전엔 갈래 전체에 붙은 플래그라 그 갈래의 *모든* perk가 조선 밖에서 0이 됐다 —
     종친은 특전(tariffOff)뿐 아니라 벌점(hireUp)까지 죽어 조선 밖에서 "아무 갈래도 아닌 상태"가
     됐다. 신분은 국경에서 죽어도(특전 무효) **결격은 보증인이 필요 없다**(벌점은 어디서나 산다)는
     소설 원리 B와 정반대였다. 그래서 `joseonOnly`를 **이득 키만 골라 게이팅하는 배열**로 바꾼다 —
     `true`(전부 게이팅)도 계속 받는다(기존 데이터·`interpreter`처럼 벌점이 없는 갈래는 어차피 결과가 같다). */
export function originPerk(key, cityId = state.at) {
  const o = ORIGIN_BY_ID[state.origin ?? DEFAULT_ORIGIN];
  if (!o) return 0;
  const v = o.perks?.[key] ?? 0;
  if (!v) return 0;
  /* ① 한반도 다섯 — **깃발**로 잠근다(조선 관이 알아주는 신분이다) */
  const gate = o.perks?.joseonOnly;
  if (gate === true || (Array.isArray(gate) && gate.includes(key))) {
    const c = CITY_BY_ID[cityId];
    if (!c || c.flag !== 'joseon') return 0;
  }
  /* ② 여덟 바다 — **권역**으로 잠근다(`data.js: SEA_ORIGINS`). 같은 장치의 다른 눈금이다:
     한반도 갈래는 한 나라의 신분이고, 이쪽은 한 바다의 자리다. */
  const home = o.perks?.homeOnly;
  if (home === true || (Array.isArray(home) && home.includes(key))) {
    if (!o.region || REGION_OF_CITY[cityId] !== o.region) return 0;
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
  const off = matePerk('repairOff') + ((state.boons?.repair?.[cityId] ?? 0) > state.day ? BOON.repairOff : 0)
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
  const cost = max * unit;
  state.gold -= cost;
  state.crew += max;
  // ★ 장부·반환값도 실제 할증 단가(unit)로 적는다 — 예전에는 HIRE_UNIT(기본값)으로 적어
  //   갈래가 할증을 물어도 장부엔 안 잡혀 지출이 새는 것처럼 보였다(결함 B).
  book('outgo', 'port', cost);
  // 부두에서 급히 긁어모은 인력에는 이름이 없다. 일당은 표준값으로 친다 —
  // 값을 두 배로 치르는 대신 고르지 않는 것이 이 경로의 성격이다.
  state.bands.push({ n: max, trait: 'steady', wage: CREW_WAGE, name: '부두 인부', from: state.at, day: state.day, unrest: 0 });
  return { ok: true, n: max, cost };
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
      // ★ 일당(wage)에는 갈래 할증을 안 붙인다 — 요구 일당은 그 사람의 기질이 정하는 값이지
      //   "누가 태우느냐"로 바뀌면 안 된다(무리는 결정론으로 앉아 있고, 값만 갈래마다 달라야 한다).
      //   갈래 할증(`hireUp`)은 **태우는 그 순간의 값**(계약금)에만 붙는다 — 부두 즉석고용(`hireUnit`)이
      //   이미 그 꼴이고(할증이 단가 하나에 붙는다), 종친의 cost 문구("사람을 몰래 부리지 못해
      //   선원이 더디 모인다")도 "모으는 값이 비싸진다"는 뜻이지 "데리고 있는 내내 더 비싸다"가 아니다.
      //   일당까지 올리면 90항차 내내 복리로 불어나 밸런스가 종친 하나만으로 크게 흔들린다
      //   (economy-trade.md: "임금은 규모와 무관한 고정비라 후반 브레이크" — 갈래 하나 때문에
      //   그 브레이크의 세기를 바꾸지 않는다).
      wage: Math.round(CREW_WAGE * T.wageMul * jitter * 100) / 100,
      advance: Math.round(TAVERN.advanceUnit * T.advMul * jitter * (1 + originPerk('hireUp', cityId))) * n,
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
  // 선장인(shipwright)이 타면 널을 두껍게 댄다 — 동료 특전 `hullUp`
  return Math.round(base * (refits.oakArmor ? 1.25 : 1) * (refits.razee ? 0.90 : 1)
                         * (1 + Math.min(0.35, matePerk('hullUp'))));
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
  v *= hullFactor();                // 삭은 배는 느리다 (data.js: HULL)
  return v;
}

/** 선체가 상한 만큼의 속력 배율 (1 이하).
    ★ **선원 미달(×0.75)과 같은 모양이다** — 막는 것이 아니라 값을 물린다.
      일수가 늘면 삯·보급·유지비가 함께 늘므로 *"수리비를 아끼는 것이 늘 옳다"*가 깨진다.
      짧은 항로는 `voyageDays`의 `max(1, …)`에 걸려 거의 안 변하고 먼 길만 무거워진다 —
      곧 **삭은 배로는 먼 길을 못 간다**가 규칙이 된다. 근거는 `data.js: HULL`. */
export function hullFactor() {
  if (!state.maxHp) return 1;
  const r = state.hp / state.maxHp;
  if (r < HULL.crawlAt) return HULL.crawlMul;
  if (r < HULL.slowAt) return HULL.slowMul;
  return 1;
}

/** 선체가 바닥이면 실은 짐에 물이 스민다 — **값싼 것부터**(폭풍 투하와 같은 규약).
    성장에 비례하는 대가라, 큰 배에 값나가는 짐을 싣고 삭은 채 다니면 항차마다 크게 문다. */
export function soakCargo(days = 1) {
  if (!state.maxHp || state.hp / state.maxHp >= HULL.soakAt) return null;
  let take = Math.floor(cargoUsed() * HULL.soakRate * days);
  if (take <= 0) return null;
  const order = Object.keys(state.cargo)
    .filter((g) => state.cargo[g] > 0)
    .sort((a, b) => (GOOD_BY_ID[a]?.base ?? 0) - (GOOD_BY_ID[b]?.base ?? 0));
  const lost = {};
  let value = 0;
  for (const gid of order) {
    if (take <= 0) break;
    const n = Math.min(state.cargo[gid], take);
    state.cargo[gid] -= n;
    if (!state.cargo[gid]) { delete state.cargo[gid]; delete state.buyPrice[gid]; }
    lost[gid] = n;
    value += (state.prices[state.at]?.[gid] ?? GOOD_BY_ID[gid].base) * n;
    take -= n;
  }
  return Object.keys(lost).length ? { lost, value: Math.round(value) } : null;
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

/** 이 원양 항로가 요구하는 동행 척수 — 위험이 곧 호위 요구다(`data.js: FLEET.escortAt`) */
export function escortNeed(from = state.at, to = null) {
  if (to == null || !isOceanLane(from, to)) return 0;
  const risk = routeRisk(from, to) ?? 0;
  for (const [over, n] of FLEET.escortAt ?? []) if (risk > over) return n;
  return 0;
}

/** 대양을 건널 수 있나 — **사람 · 배 · 그리고 호위**.
    ★ `to`를 주면 그 항로의 호위 의무까지 본다(안 주면 예전처럼 사람·배만 — 호출부 호환).
      근해는 여전히 안 막는다. 막으면 항구에 갇혀 빠져나갈 길이 없어진다. */
export function oceanReady(to = null) {
  const need = Math.max(3, Math.ceil((ship().crewMin || 0) * OCEAN_CREW_MIN));
  if (state.crew < need) {
    return { ok: false, need, why: `대양을 건너려면 선원이 ${need}명은 있어야 한다 (지금 ${state.crew}명)` };
  }
  if (state.maxHp > 0 && state.hp / state.maxHp < OCEAN_HULL_MIN) {
    return { ok: false, why: `선체가 ${state.hp}/${state.maxHp}다. 이 배로는 뭍이 안 보이는 곳에 못 나간다` };
  }
  /* ★ **혼자서는 못 건넌다**(DESIGN-growth P2-a · 사료: 1561년 이후 카레라의 함대 편성 의무).
     이 한 줄이 원양을 「큰 판돈」으로 묶는다 — 벌이가 큰 만큼 입장권이 있어야 한다.
     ⚠️ 항로를 **막는 것이 아니라 조건을 붙이는 것**이다. 콘텐츠는 한 줄도 안 준다. */
  const esc = escortNeed(state.at, to);
  if (esc > consortCount()) {
    return { ok: false, escort: esc,
             why: `이 바다는 혼자 못 건넌다 — 동행 ${esc}척이 있어야 한다 (지금 ${consortCount()}척)` };
  }
  return { ok: true, escort: esc };
}

/** 도주 성공률 보정 (돛 증축) */
export function fleeBonus() {
  return (state.refits.sails ? 0.14 : 0) + Math.min(0.25, matePerk('fleeUp'));
}

/** 도주 성공 확률. 멀수록·빠를수록 잘 도망치고, 찢긴 돛은 양쪽 모두에 반영된다.
    ★ **적 배의 속력이 들어간다** — 전에는 상대가 누구든 같은 확률이라 노를 젓는 갤리와
      둔한 정크가 똑같이 따라왔다. 선종을 고르는 일에 뜻이 생기는 자리다.
    ★ 전투 화면(`battle.js: tryFlee`)과 조우 안내(`map.js`)가 **같은 식을 본다** —
      보여 준 가망과 실제 판정이 어긋나면 안내가 거짓말이 된다. */
export function fleeOdds({ range = 78, foeHull = null, mySail = 0, foeSail = 0 } = {}) {
  const foeSpd = SHIPS[foeHull]?.speed ?? 1;      // 적 선체명은 SHIPS 키와 같다(brig·galley…)
  /* ★ 도망치는 것은 기함이 아니라 **선단 전체**다 — 굼뜬 동행선을 끌고 기함 속력으로
     빠져나갈 수는 없다. `fleetSpeedPenalty()`는 항해 일수에도 곱해지는 그 배율이라
     "느려서 오래 걸린다"와 "느려서 못 도망친다"가 **같은 수 하나**에서 나온다.
     호출처 셋(전투 도주·전투 안내·조우 안내)이 전부 이 함수를 거치므로 값이 갈리지 않는다. */
  const mySpd = shipSpeed() * fleetSpeedPenalty();
  const p = 0.24 + (range / 100) * 0.52 + (mySpd - foeSpd) * 0.25
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
  return Math.round((SHIPS[key]?.price ?? 0) * SHIP_RESALE);
}

/** 지금 함께 나서는 배들의 매각가 합 — **해상대차의 담보**다(`contractOffer`의 선금 상한).
    ★ 정박해 둔 배(`state.fleet`)까지 세지 않는다. 담보로 잡히는 것은 그 항해에 나서는 선복이고,
      항구에 남겨 둔 배까지 세면 "배를 팔지 않고 담보만 늘리는" 자리가 생긴다. */
export function fleetCollateral() {
  let v = resaleOf(state.shipKey);
  for (const k of consortKeys()) v += resaleOf(k);
  return v;
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
  /* 계단이 **둘**이다(C-18) — 나라가 지은 조선소(`civic` · 그 항구에 낸 세로 오른다)와
     내가 산 A-2 승급(`boost` · 금화 + 자재). `tierNeeded`·`sellsShip`·`shipPriceAt`·
     `usedListings`가 전부 이 함수를 거치므로 여기 한 줄이 전부다.
     ★ 나라 몫에만 상한이 있다(`CIVIC.cap`) — 옛 `HOLDING.industryCap`이 있던 자리다.
       내 돈으로 올리는 `boost`는 `YARD.cap`까지 간다. */
  const base = CITY_BY_ID[cityId]?.industry ?? 0;
  /* ⚠️ **`state.yards[].civic`을 직접 읽지 마라** — 공기가 지난 공사가 안 세어진다.
     실제로 그렇게 썼다가 `test-rules`의 「공기가 지나면 오른다」가 잡았다. `civicOf()`가 정본이다. */
  const civic = Math.min(Math.max(0, CIVIC.cap - base), civicOf(cityId));
  const boost = state.yards?.[cityId]?.boost ?? 0;   // A-2 승급
  return Math.min(YARD.cap, base + civic + boost);
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
  if (!yardAllowed(key, cityId)) return false;
  /* ★ 사다리가 **둘**이다 — 기술(`tierNeeded`)과 교역(`yardReach`). 아래 절을 볼 것. */
  const ind = industryOf(cityId);
  return ind >= tierNeeded(key, cityId) && ind >= yardReach(key, cityId);
}

/* ── 교역권 — 「어느 바다의 배를 짓는가」 ────────────────────────
   ★ **공업력만 보던 시절의 실측**: 공업력 1이면 94종 가운데 **47종**이 한꺼번에 걸렸고
     (도시 265곳 중 142곳이 공업력 1이다) 카라벨·코카·갈리오트 따위 **10종은 240곳**에서,
     **67종은 100곳 넘는 곳**에서 지어졌다. 나가사키에서 브라질 카라벨랑이 나왔다.
     그래서 "어느 항구에 왔는가"가 조선소 화면에서 거의 뜻이 없었다.

   ⇒ 사용자 지시: *"공업력이 올라가면서 점점 지어지는 배가 많아지고 **교역이 잘 이뤄지는 곳의
     배를 먼저** 만들 수 있게 해"*. **목록을 좁히는 것이 아니라 계단으로 만드는 것**이라,
     기술 사다리(`tierNeeded`) 옆에 **교역 사다리**를 나란히 놓는다. 둘 다 같은 공업력을 본다.

     공업력 1 — 제 바다의 배          공업력 3 — 내 바다가 닿는 바다의 배
     공업력 2 — 내가 직접 오가는 바다   공업력 4 — 온 세계의 배  (= `YARD.cap`, 지금과 같은 수)

   ★ **새 데이터를 만들지 않는다.** 이미 있는 것으로만 잰다 —
     `SHIPS[].yards`(전통 조선지) · `originFlag`(제 나라) · `SHIPS[].home`(그 배가 난 바다) ·
     `ROUTES`(항로로 이어진 이웃) · `OCEAN_LANES`(원양으로 무엇과 잇는가) · 권역.

   ★ 「꼭대기」는 3이 아니라 **4**다(`YARD.cap`). 그래서 *온 세계의 배*가 A-2 승급의
     마지막 보상이 되고, 공업력 3짜리 큰 항구 스물넷이 지금처럼 전부를 열지 않는다.
     걸음을 0~3으로 접는 안도 재 봤으나 그러면 베네치아에서 평두선이 나온다(꼭대기에서 규칙이 사라진다). */

/** 이 항구가 **원양 항로로 직접** 잇는 바다들 (도시 id → 권역 id Set) */
const LANE_REGIONS = (() => {
  const out = {};
  for (const l of OCEAN_LANES) {
    const ra = REGION_OF_CITY[l.a], rb = REGION_OF_CITY[l.b];
    if (!ra || !rb) continue;                       // 아직 안 이어진 항로
    (out[l.a] ??= new Set()).add(rb);
    (out[l.b] ??= new Set()).add(ra);
  }
  return out;
})();

/** 이 **바다**가 원양 항로로 잇는 바다들 (권역 id → 권역 id Set) */
const REGION_LANES = (() => {
  const out = {};
  for (const l of OCEAN_LANES) {
    const ra = REGION_OF_CITY[l.a], rb = REGION_OF_CITY[l.b];
    if (!ra || !rb || ra === rb) continue;
    (out[ra] ??= new Set()).add(rb);
    (out[rb] ??= new Set()).add(ra);
  }
  return out;
})();

/** 항로로 이어진 이웃 (도시 id → 도시 id[]) — `neighborsOf`와 같은 값을 미리 접어 둔다.
    조선소 화면이 선종 94개 × 도시마다 이것을 묻기 때문이다. */
const ROUTE_NB = (() => {
  const out = {};
  for (const [a, b] of ROUTES) { (out[a] ??= []).push(b); (out[b] ??= []).push(a); }
  return out;
})();

/** 그 배의 고향이 이 항구에서 몇 걸음인가 — 0(제 고장)에서 4(먼 바다)까지.
    **이 값이 곧 필요한 공업력**이다(기술 사다리와 큰 쪽이 이긴다). */
export function yardReach(key, cityId = state.at) {
  const s = SHIPS[key];
  const c = CITY_BY_ID[cityId];
  if (!s || !c) return YARD.cap + 1;
  const yards = s.yards ?? [];
  // 0 — 제 고장(전통 조선지) · 제 나라(깃발) · **항로로 이어진 이웃이 그 조선지**
  if (yards.includes(cityId)) return 0;
  if (s.originFlag && c.flag === s.originFlag) return 0;
  for (const nb of ROUTE_NB[cityId] ?? []) if (yards.includes(nb)) return 0;
  const rid = REGION_OF_CITY[cityId];
  if (s.home === rid) return 1;                          // 1 — 같은 바다
  if (LANE_REGIONS[cityId]?.has(s.home)) return 2;       // 2 — 이 항구가 직접 오가는 바다
  if (REGION_LANES[rid]?.has(s.home)) return 3;          // 3 — 이 바다가 닿는 바다
  return 4;                                              // 4 — 먼 바다
}

/** 교역권을 말로 옮긴다 — 화면이 "왜 여기선 안 짓나"를 말해야 규칙이 존재한다 */
export const YARD_REACH_WORD = [
  '이 항구가 오래 지어온 배',
  '이 바다의 배',
  '이 항구가 직접 오가는 바다의 배',
  '이 바다가 닿는 바다의 배',
  '먼 바다의 배',
];
export function yardReachWord(key, cityId = state.at) {
  return YARD_REACH_WORD[Math.min(YARD_REACH_WORD.length - 1, yardReach(key, cityId))];
}

/* ── `yards`의 두 가지 뜻 ──────────────────────────────────────
   `SHIPS[].yards`는 원래 **전통 조선지 = 값이 싸지는 곳**이다(`shipPriceAt` → `YARD_TRADITION_OFF`).
   *"거기서만 살 수 있다"*가 아니다. 그래서 **한때는 `sellsShip`이 공업력만 봤다** —
   ⚠️ 예전 주석이 *"그것이 설계다"*라고 못박아 두었는데, 사용자가 그 설계를 바꾸라고 했다.
   지금은 `yards`가 **셋째 뜻**을 하나 더 갖는다: 위 `yardReach`의 0걸음(제 고장)을 정한다.

   딱 한 배만 다르다. **`yardsOnly: true`를 세운 배는 그 부두에서만 나온다.**
   플래그를 배 쪽에 둔 이유: 규칙을 바꾸면 아흔 척이 전부 영향을 받지만,
   플래그는 **데이터에 드러나고 그 배 한 줄만 바꾼다.**

   ★ 문이 **셋**이라 셋 다 같은 함수를 지나게 했다 — 하나만 막으면 나머지로 새어 나온다:
     ① 신조   `sellsShip`      (→ `buildableAt`·`shipPriceAt`·조선소 화면이 전부 이것을 거친다)
     ② 중고   `usedListings`   공업력 3 항구의 매물 풀이 `tier <= ind + 1`이라 tier 4가 걸렸다.
                               실측 **정가 24,000닢 → 사카이 14,300닢**(정공법의 6%)
     ③ 나포   `regionPrize`    등급 5의 전리품이 *"그 바다에서 짓는 tier 4"*라 **정확히 이 배**였다.
                               4,000회 표본에서 **1,020/1,020(100%)**. 패권 조건 ③을 채우는 그
                               전투가 ④까지 통째로 채워 줬다.
   → `.playtest/origin-sweep/out/FINDINGS-hegemony.md` F1·F2 */
export function yardAllowed(key, cityId = state.at) {
  const s = SHIPS[key];
  if (!s?.yardsOnly) return true;
  return (s.yards ?? []).includes(cityId);
}

/** 공업력만 놓고 보면 지을 수 있는가 (해금 여부는 따지지 않는다 — UI에서 이유를 갈라 보여주려고).
    ★ 사다리 **둘 다** 본다 — 기술이 되어도 교역권 밖이면 이 항구의 부두는 그 배를 모른다. */
export function yardCapable(key, cityId = state.at) {
  const ind = industryOf(cityId);
  return ind >= tierNeeded(key, cityId) && ind >= yardReach(key, cityId);
}

/** 이 배가 이 항구에서 안 열리는 **까닭이 무엇인가** — 화면이 이유를 갈라 말하게 한다.
    `null`이면 열려 있다. `'tier'`는 기술, `'reach'`는 교역권이 모자란 것이다. */
export function yardShortOf(key, cityId = state.at) {
  const ind = industryOf(cityId);
  const t = tierNeeded(key, cityId), r = yardReach(key, cityId);
  if (ind >= t && ind >= r) return null;
  // 둘 다 모자라면 **더 먼 쪽**을 말한다 — 부두를 넓혀도 안 열리는 것을 먼저 알려야 한다.
  return r > t ? { why: 'reach', need: r, word: yardReachWord(key, cityId) }
               : { why: 'tier', need: t, word: null };
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
    /* `yardsOnly`인 배는 "공업력이 모자란다"가 아니라 **"여기서 짓는 배가 아니다"**가 이유다.
       그 말을 안 하면 플레이어가 이 항구의 부두를 넓히며 시간을 태운다. */
    if (!yardAllowed(key)) {
      const w = yardsOf(key).join('·');
      return { ok: false, reason: `${w}에서만 짓는 배다 (공업력 ${tierNeeded(key, (s.yards ?? [])[0])} 필요)` };
    }
    /* ★ **부두를 넓혀도 안 열리는 것**을 먼저 말한다 — 교역권 밖의 배는 이유가 기술이 아니다.
       이 말을 안 하면 플레이어가 엉뚱한 항구에 자재와 몇백 일을 태운다. */
    const short = yardShortOf(key);
    const where = buildableAt(key);
    if (short?.why === 'reach') {
      return {
        ok: false,
        reason: `${short.word}다 — 이 부두는 공업력 ${short.need}까지 올라야 그 물건을 안다 `
              + `(지금 ${industryOf()})` + (where.length ? ` · ${where.slice(0, 3).join('·')}` : ''),
      };
    }
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
  /* ★ `yardsOnly`인 배는 **중고로도 안 흘러든다.** 매물 풀은 `tier <= ind + 1`이라
     공업력 3 항구에서 tier 4가 걸렸고, 그래서 정가 24,000닢짜리 히든 함선이
     사카이 24일차에 **14,300닢**으로 나왔다(실측). 지어야만 갖는 배다.
     ★ 교역권(`yardReach`)도 **한 걸음 관대하게** 본다 — 중고는 짓는 것이 아니라 *흘러드는* 것이라
       기술과 같은 여유(`+1`)를 준다. 이 줄이 없으면 신조를 막아 놓고 중고로 새어 나간다
       (나가사키의 브라질 카라벨랑이 조선소에서 사라지고 중고 매대에 그대로 남는다). */
  const pool = Object.entries(SHIPS)
    .filter(([k, s]) => s.tier > 0 && s.tier <= ind + 1 && !s.yardsOnly && !shipLockedBy(k)
                     && yardReach(k, cityId) <= ind + 1)
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
   기함 밖의 배도 정박해 있는 동안 삯과 관리비가 나간다. 배를 쟁여두는 값.
   ★ **동행 중인 배는 여기서 빠진다** — 그 배들은 정박 유지비가 아니라 항해비를 문다
     (`consortCost`). 두 군데서 다 걷으면 같은 배에 값을 두 번 매기는 셈이 된다. */
export function fleetUpkeep() {
  let sum = 0;
  for (const key of Object.keys(state.fleet)) {
    if (key === state.shipKey) continue;      // 기함은 선원 급여로 따로 나간다
    if (isConsort(key)) continue;             // 따라 나선 배는 항해비 쪽에서 센다
    sum += SHIPS[key].upkeep || 0;
  }
  return sum;
}

/* ══════════════════════════════════════════════════════════════
   동행 선단 (consort) — 기함 1 + 동행 최대 8 = 아홉 척
   ──────────────────────────────────────────────────────────────
   설계·값의 정본은 `data.js: FLEET`이고 여기는 **규칙**만 둔다.
   ★ `state.fleet`(가진 배)과 `state.consorts`(따라 나선 배)를 갈라 둔 이유:
     배의 선체·무장·개장은 어차피 `fleet`에 있고, "지금 함께 가는가"는 매 항차 바뀐다.
     한 곳에 몰면 `boardShip`·`sellShip`·나포 편입이 전부 이 플래그를 신경 써야 한다.
   ══════════════════════════════════════════════════════════════ */

export function consortKeys() {
  return Object.keys(state.consorts || {});
}
export function isConsort(key) {
  return !!state.consorts?.[key];
}
export function consortCount() {
  return consortKeys().length;
}
/** 기함까지 센 선단 규모 — 화면에 "N척"으로 나가는 값 */
export function fleetSize() {
  return 1 + consortCount();
}

/** 이 배를 동행시키려면 태워야 하는 인원 */
export function consortCrewNeed(key) {
  return Math.max(1, Math.ceil((SHIPS[key]?.crewMin || 0) * FLEET.crewRate));
}
/** 그 인원을 부두에서 뽑는 값(계약금) — 술집이 아니라 부두다(`HIRE_UNIT`) */
export function consortHireCost(key) {
  return consortCrewNeed(key) * HIRE_UNIT;
}

/** 동행선에 타고 있는 사람 수의 합 */
export function consortCrew() {
  let n = 0;
  for (const k of consortKeys()) n += state.consorts[k].crew || 0;
  return n;
}
/** 선단 총원 — 기함(`state.crew`) + 동행선.
    ★ `state.crew`는 여전히 **기함 정원(`crewMax`)에 묶인 값**이고 이쪽은 합계일 뿐이다.
      갑판 슬롯·백병 병종·술집 무리는 전부 기함 쪽만 본다. */
export function fleetCrew() {
  return state.crew + consortCrew();
}

/** 동행선의 선장 — **아직 아무도 없다.** Dev-B의 NPC 동료가 이 자리를 채운다.
    지금은 늘 null을 돌려주고, 규칙(`FLEET.requireCaptain`)도 닫혀 있지 않다. */
export function captainOf(key) {
  return state.consorts?.[key]?.captain ?? null;
}
/** 선장을 앉힌다(후크) — 동료 데이터는 이 파일이 만들지 않는다. */
export function setCaptain(key, captain) {
  if (!state.consorts?.[key]) return { ok: false, reason: '동행 중인 배가 아니다' };
  state.consorts[key].captain = captain ?? null;
  return { ok: true };
}

/** 동행선 한 척의 실제 속력 — 개장과 인원 사정까지 본다(기함의 `shipSpeed`와 같은 꼴) */
export function consortSpeed(key) {
  const s = SHIPS[key];
  if (!s) return 1;
  const r = state.fleet[key]?.refits || {};
  let v = s.speed;
  if (r.copper) v *= 1.08;
  if (r.sails) v *= 1.05;
  if (r.razee) v *= 1.15;
  if ((state.consorts[key]?.crew || 0) < (s.crewMin || 0)) v *= 0.75;
  return v;
}

/** 선단은 **가장 느린 배**에 맞춘다 — 기함 속력에 곱할 배율(1 이하).
    ★ `voyageDays()`가 이것을 곱하므로 **항해 일수 계산은 `state.js` 안에서 닫힌다**
      (`scenes/map.js`는 `voyageDays`만 부르므로 손댈 곳이 없다). */
export function fleetSpeedPenalty() {
  const keys = consortKeys();
  if (!keys.length) return 1;
  let slowest = shipSpeed();
  for (const k of keys) slowest = Math.min(slowest, consortSpeed(k));
  const mine = shipSpeed();
  return mine > 0 ? Math.min(1, slowest / mine) : 1;
}

/** 지금 선단에서 가장 느린 배의 이름 — 화면에 "무엇이 발목을 잡는가"를 보여준다. 없으면 null */
export function fleetLaggard() {
  const keys = consortKeys();
  if (!keys.length) return null;
  let key = null, v = shipSpeed();
  for (const k of keys) {
    const s = consortSpeed(k);
    if (s < v) { v = s; key = k; }
  }
  return key ? { key, name: SHIPS[key].name, speed: v } : null;
}

/* ── 동행선 몫의 항해비 ────────────────────────────────────────
   ★ **정박 유지비가 아니라 항해비다.** 사람 몫(삯·보급)은 표준 단가를 쓰고
     (`CREW_WAGE`·`SUPPLY_UNIT` — 부두에서 뽑은 사람이라 술집 기질이 없다),
     배 몫은 기함과 같은 식(`HULL_UPKEEP`·`ARM_UPKEEP`)이다.
     값을 새로 만들지 않은 것이 요점이다 — 선단이 커져도 비용 구조는 하나다. */
export function consortCost(days = 1) {
  const crew = consortCrew();
  const wages = Math.round(crew * CREW_WAGE * days);
  const supplies = Math.round(crew * SUPPLY_UNIT * days);
  let up = 0;
  for (const key of consortKeys()) {
    up += (SHIPS[key]?.upkeep || 0) * HULL_UPKEEP;
    up += armsUpkeep(state.fleet[key]?.arms);
  }
  return { crew, ships: consortCount(), wages, supplies, upkeep: Math.round(up * days) };
}

/** 선단이 하루에 먹는 돈 — 항구 화면이 "N척 · 하루 얼마"로 보여주는 값 */
export function fleetDailyCost() {
  const c = consortCost(1);
  return c.wages + c.supplies + c.upkeep;
}

/* ── 동행시킨다 / 정박시킨다 ───────────────────────────────────
   토글 하나지만 값이 두 갈래다 — **띄울 때 계약금, 다니는 내내 일당.**
   술집 무리와 같은 구조이고(계약금은 지금, 일당은 내내) 그래서 같은 상수를 쓴다. */
export function canConsort(key) {
  const rec = state.fleet[key];
  if (!rec) return { ok: false, reason: '보유하지 않은 배다' };
  if (key === state.shipKey) return { ok: false, reason: '기함은 저 스스로를 동행시킬 수 없다' };
  if (isConsort(key)) return { ok: false, reason: '이미 동행 중이다' };
  if (rec.at !== state.at) return { ok: false, reason: `${CITY_BY_ID[rec.at]?.name ?? '다른 항구'}에 정박해 있다` };
  if (consortCount() >= FLEET.max) {
    return { ok: false, reason: `한 번에 데리고 나갈 수 있는 배는 ${FLEET.max}척까지다 (기함까지 ${FLEET.max + 1}척)` };
  }
  /* ★ **배 하나에 선장 하나.** `FLEET.requireCaptain`을 켰으므로(2026-08-25 · A-5 배선 완료)
     동행선에는 태운 동료 중 아직 배를 안 맡은 사람이 있어야 한다.
     ⇒ **선단 규모가 동료 수에 묶인다** — 사용자가 *"동료를 모으고 여러배를 같이 운용하고"*를
       한 문장에 붙여 쓴 구조가 이것이다. 자동으로 앉히되(고를 것이 없다), 없으면 막는다. */
  if (FLEET.requireCaptain && !captainOf(key) && !freeMates().length) {
    return { ok: false, reason: '이 배를 맡길 선장이 없다 — 항구에서 동료를 태워야 한다' };
  }
  const cost = consortHireCost(key);
  if (cost > state.gold) {
    return { ok: false, reason: `선원 ${consortCrewNeed(key)}명을 태울 ${cost.toLocaleString('ko-KR')}닢이 모자란다`, cost };
  }
  return { ok: true, cost, crew: consortCrewNeed(key) };
}

/** 정박해 둔 배를 데리고 나선다 — 사람을 태우는 값이 지금 나간다 */
export function setConsort(key) {
  const can = canConsort(key);
  if (!can.ok) return can;
  state.gold -= can.cost;
  book('outgo', 'port', can.cost);       // 부두에서 뽑는 값이다 — `hire()`·술집 계약금과 같은 갈래
  /* 배를 맡을 사람을 그 자리에서 앉힌다 — 아직 배가 없는 동료 중 앞엣사람이다.
     고를 것이 없으므로(누가 어느 배를 맡든 특전은 선단 전체에 붙는다) 화면을 늘리지 않는다. */
  const cap = FLEET.requireCaptain ? (freeMates()[0] ?? null) : null;
  state.consorts[key] = { crew: can.crew, captain: cap?.id ?? null };
  const n = SHIPS[key].name;
  pushLog(`${n}${josa(n, '이/가')} 뱃머리를 나란히 했다. 선원 ${can.crew}명을 태우는 데 `
        + `${can.cost.toLocaleString('ko-KR')}닢`
        + (cap ? ` · 키는 ${cap.name}${josa(cap.name, '이/가')} 잡는다` : '')
        + `. 선단 ${fleetSize()}척.`, 'good');
  return { ok: true, cost: can.cost, crew: can.crew, captain: cap?.id ?? null };
}

/** 다시 매어 둔다 — 태운 사람은 내리고 계약금은 돌아오지 않는다.
    ★ **짐을 먼저 내려야 한다.** 화물칸이 줄어드는 일이라, 안 막으면 실은 것이
      허공으로 사라지거나 `cargoFree()`가 음수가 된다(매매 계산이 통째로 어긋난다). */
export function stowConsort(key) {
  if (!isConsort(key)) return { ok: false, reason: '동행 중인 배가 아니다' };
  const over = cargoUsed() - (cargoCapTotal() - (SHIPS[key]?.cargo || 0));
  if (over > 0) {
    return { ok: false, reason: `실은 짐 ${over}칸을 먼저 내려야 이 배를 뺄 수 있다`, over };
  }
  const crew = state.consorts[key].crew || 0;
  delete state.consorts[key];
  if (state.fleet[key]) state.fleet[key].at = state.at;
  const n = SHIPS[key].name;
  pushLog(`${n}${josa(n, '을/를')} ${CITY_BY_ID[state.at].name} 부두에 매어 두었다.`
        + ` 선원 ${crew}명이 내렸다.`, 'warn');
  return { ok: true, crew };
}

/** 동행선을 항구에 맞춰 둔다 — 함께 다녔으니 정박지도 함께 옮긴다.
    ★ 배선은 **`scenes/port.js: enter()`** 한 곳이다. 도착 처리(`scenes/map.js`)는
      기함과 예인선만 옮기고 있으므로, 항구 화면이 열릴 때 여기서 맞춘다.
      (그 편이 세이브를 불러온 판에서도 어긋나지 않는다.) */
export function syncConsortPort(cityId = state.at) {
  for (const key of consortKeys()) {
    if (state.fleet[key]) state.fleet[key].at = cityId;
    else delete state.consorts[key];      // 배가 사라졌으면(격침·매각) 명부도 지운다
  }
}

/* ── 전투에서의 선단 ───────────────────────────────────────────
   ★ 규칙은 전부 여기 순수 함수로 두고 `scenes/battle.js`는 **부르기만** 한다.
     전투 씬은 이미 850줄이고, 선단 규칙이 그 안에 흩어지면 다음 사람이 못 찾는다. */

/** 동행선이 함께 내는 포문 수 (실린 대포 기준 · 없으면 선종 기본 포문) */
export function consortGuns() {
  let n = 0;
  for (const key of consortKeys()) {
    const rec = state.fleet[key];
    const mounted = rec ? armsTotal(rec.arms) : 0;
    n += mounted || SHIPS[key]?.guns || 0;
  }
  return n;
}

/** 기함의 한 발에 얹히는 **실효 포문 수** — 조준이 따로라 전부는 못 얹는다 */
export function consortGunBonus() {
  return consortGuns() * FLEET.gunShare;
}

/** 동행선에서 갑판으로 넘어오는 손 — 백병전 인원 */
export function consortMelee() {
  return consortCrew();
}

/** 그 손이 갑판 병력을 얼마나 두껍게 하는가 (유닛 수가 아니라 체력으로 반영한다 —
    갑판 그림의 자리가 `MELEE_SLOTS` 여섯 칸으로 정해져 있기 때문이다) */
export function consortMeleeBoost() {
  return 1 + Math.min(FLEET.meleeCap, consortMelee() * FLEET.meleePerHand);
}

/** 기함이 맞을 것을 동행선이 나눠 받는 비율 (0~`FLEET.shieldCap`) */
export function consortShield() {
  return Math.min(FLEET.shieldCap, consortCount() * FLEET.shieldPer);
}

/* ── 배가 가라앉는다 ───────────────────────────────────────────
   ★ **이 게임에 침몰 규칙이 없었다.** 져도 예인되고, 배는 잃지 않았다.
     동행선을 데리고 나가는 것이 순이득이 되지 않으려면 잃을 수 있어야 한다.
     기함은 여기서 가라앉지 않는다 — 패배 처리(`battle.js: finish('lose')`)가 따로 있다. */
export function spreadDamage(dmg) {
  const keys = consortKeys();
  if (!keys.length || dmg <= 0) return { toYou: dmg, absorbed: 0, hit: null, sunk: [] };

  const taken = Math.round(dmg * consortShield());
  if (taken <= 0) return { toYou: dmg, absorbed: 0, hit: null, sunk: [] };

  // 한 척이 대신 맞는다 — 여러 척에 흩뿌리면 아무 배도 가라앉지 않아 침몰이 안 생긴다
  const key = keys[Math.floor(Math.random() * keys.length)];
  const rec = state.fleet[key];
  if (!rec) { delete state.consorts[key]; return { toYou: dmg, absorbed: 0, hit: null, sunk: [] }; }

  rec.hp -= taken;
  const name = SHIPS[key].name;
  const sunk = [];
  if (rec.hp <= 0) {
    const lostCrew = state.consorts[key].crew || 0;
    delete state.consorts[key];
    delete state.fleet[key];
    state.everOwned.add(key);          // 잃어도 "몰아 본" 것은 남는다(해금 경로를 되돌리지 않는다)
    sunk.push({ key, name, crew: lostCrew });
    pushLog(`${name}${josa(name, '이/가')} 현측이 갈라지며 가라앉았다.`
          + (lostCrew ? ` 선원 ${lostCrew}명이 함께 바다에 남았다.` : ''), 'bad');
  }
  return { toYou: Math.max(0, dmg - taken), absorbed: taken, hit: { key, name, hp: Math.max(0, rec.hp) }, sunk };
}

/* ── C-13 N4 · **기함이 가라앉는다 — 삭은 배로 졌을 때만** ────────────────────
   ★ 오래 「고를 자리」를 못 찾던 규칙이다(`data.js: HULL.sinkAt` 주석에 그 판단이 있다).
     폭풍에 붙이면 사고가 되고, 안 붙이면 **삭은 배를 수리 없이 영원히 몬다.**
     ⇒ **플레이어가 고른 자리**(전투)에, **플레이어가 고른 상태**(선체 바닥)에서만 붙인다.
   ★ 막다른 골목을 만들지 않는다 — 청산과 **같은 출구**를 쓴다. 그 바다의 삭은 배 한 척이 남고
     거점·관계·악명·아는 항구·해적 명부는 그대로다. 빚은 안 지운다(배를 뺏긴 것이 아니라 잃은 것이다).
   ★ 정박해 둔 배가 있으면 **가라앉지 않는다** — 갈아탈 배가 있는데 판을 되돌릴 이유가 없다. */
export function flagshipSinks() {
  /* ★ **잃을 것이 있을 때만 가라앉는다.** 이미 그 바다의 삭은 배를 몰고 있으면 안 가라앉는다 —
     안 그러면 「져서 배를 새로 받는 것」이 **공짜 수리**가 된다(패배는 선체를 25%로 되돌리는데
     침몰은 100%짜리 배를 준다). 그리고 그 자리는 애초에 이 규칙의 과녁이 아니다.
     과녁은 **좋은 배를 사 놓고 수리를 안 하는 사람**이다. */
  if (state.shipKey === (wreckShipOf(currentRegion()) ?? BANKRUPT.keepShip)) return false;
  return state.maxHp > 0 && state.hp / state.maxHp <= HULL.sinkAt
      /* 정박해 둔 배가 있으면 갈아탈 데가 있다 — 판을 되돌릴 이유가 없다 */
      && Object.keys(state.fleet).filter((k) => k !== state.shipKey).length === 0;
}

/** 기함이 가라앉는다 — 그 바다의 삭은 배 한 척으로 다시 선다 */
export function sinkFlagship() {
  const lost = state.shipKey;
  const lostName = SHIPS[lost]?.name ?? lost;
  const keep = wreckShipOf(currentRegion()) ?? BANKRUPT.keepShip;
  const s = SHIPS[keep];
  const arms = { light: s.guns, medium: 0, long: 0 };

  state.fleet = { [keep]: { at: state.at, hp: s.hp, arms: { ...arms }, refits: {} } };
  state.consorts = {};
  state.towing = null;
  state.shipKey = keep;
  state.hp = s.hp; state.maxHp = s.hp; state.cargoCap = s.cargo;
  state.guns = s.guns; state.arms = { ...arms }; state.refits = {};
  state.shots = { grape: 0, chain: 0, heated: 0 };
  state.cargo = {}; state.buyPrice = {};
  state.contract = null;
  state.crewMax = s.crewMax;
  state.crew = Math.max(s.crewMin ?? 1, Math.round(state.crew * 0.5));
  trimLoadout();
  state.everOwned?.add(keep);
  pushLog(`${lostName}${josa(lostName, '이/가')} 갈라진 현측으로 물을 먹고 가라앉았다.`
        + ` 삭은 배로 싸운 값이다 — 부두에서 ${s.name} 한 척을 얻어 다시 선다.`, 'bad');
  return { lost, lostName, kept: keep, keptName: s.name };
}

/** 정박해 둔 배로 갈아탄다 — 화물·선원은 함께 옮겨진다 */
export function boardShip(key) {
  const s = SHIPS[key];
  const rec = state.fleet[key];
  if (!rec) return { ok: false, reason: '보유하지 않은 배다' };
  if (state.shipKey === key) return { ok: false, reason: '이미 그 배를 몰고 있다' };
  if (rec.at !== state.at) return { ok: false, reason: `${CITY_BY_ID[rec.at].name}에 정박해 있다` };
  /* ★ 적재량은 **선단 전체**로 잰다. 동행선을 넷 데리고 있으면 기함이 작아도 짐은 실린다 —
     다만 갈아탈 배가 동행선이면 그 배는 기함이 되므로 제 몫이 중복되지 않게 뺀다. */
  const capAfter = cargoCapTotal() - state.cargoCap + s.cargo
                 - (isConsort(key) ? (s.cargo || 0) : 0);
  if (cargoUsed() > capAfter) return { ok: false, reason: '화물이 새 배의 적재량을 넘는다' };

  /* 동행선으로 갈아타면 그 배는 기함이 된다 — 명부에서 뺀다.
     그 배에 태워 두었던 사람은 내린다(기함 선원은 아래에서 그대로 옮겨 탄다). */
  let consortCrewOff = 0;
  if (isConsort(key)) {
    consortCrewOff = state.consorts[key].crew || 0;
    delete state.consorts[key];
  }

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
  return { ok: true, dropped, short: shorthanded(), consortCrewOff };
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
  /* 동행 중인 배는 짐을 싣고 있을 수 있다 — `stowConsort`가 그 판정을 갖고 있으므로 거기 맡긴다. */
  if (isConsort(key)) {
    const off = stowConsort(key);
    if (!off.ok) return off;
  }
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

/* ── 계절풍 — 철이 항해를 좌우한다 ────────────────────────────────
   ★ **오래도록 계절은 NPC의 등장에만 걸려 있었다.** `OCEAN_LANES`에 `monsoon: true`가 적혀 있었지만
     그 값을 읽는 규칙이 하나도 없었고(항로 카드에 글자 한 줄이 전부였다), 권역 안 항로에는
     계절 표시가 아예 없었다. 곧 *"계절풍이 반년마다 방향을 바꾼다"*는 인도양의 소개문이
     화면에서 관측 불가능했다.

   ⇒ 이제 항로마다 **열리는 철**(`ROUTE_SEASON` · `OCEAN_LANES[].season`)이 있고,
     철을 어기면 **막히는 대신 크게 값을 문다** — 판정과 그 근거는 `data.js: SEASON` 주석에.
       · 일수  `routeFactor`에 `SEASON.offSpeed`(0.55)가 곱해져 약 1.8배
       · 요율  조우 확률(`encounterOdds`)과 적하보험(`insuranceFor`)이 `SEASON.offRisk`(1.6)배
     ⚠️ **`routeRisk()` 자체는 안 건드린다.** 그 함수는 `escortNeed`(원양 동행 의무)도 먹이는데,
       철에 따라 입장권이 흔들리면 *같은 문이 날짜에 따라 열렸다 닫혔다* 한다 —
       그것은 「막지 않는다」는 판정을 뒷문으로 깨는 것이다. 그래서 **무는 자리에서만** 곱한다. */

/** 그 항로가 열리는 철 — 'summer'|'winter'. 계절이 안 걸린 항로면 null.

    ★ **계절풍은 방향을 가린다 — 반년마다 뒤집히기 때문이다.** 이것이 결빙과 다른 점이다.
      발트가 어는 것은 오가는 두 방향에 똑같이 걸리지만(그래서 `ROUTE_SEASON`은 대칭이다),
      계절풍은 *내려갈 때 미는 바람이 올라올 때는 맞바람*이다 — 주인선이 겨울 북동풍에 남으로
      내려가 여름 남서풍에 돌아왔고, 인도양의 배가 그 반대였다. 항로 주석이 이미
      *"여름 남서 계절풍이면 스무 날이 열흘로 준다"*고 적어 두었는데 규칙은 왕복 모두에
      같은 철을 요구하고 있었다 — **그래서 어느 한쪽 다리는 언제나 철을 어겼다.**
    ⇒ `OCEAN_LANES`의 `monsoon: true`인 선만 방향을 가린다. `a→b`가 적힌 철이고 `b→a`는 그 반대다.
      `ROUTE_SEASON`(결빙·연안 폐쇄)은 그대로 대칭이다. */
export function routeSeason(aId, bId) {
  /* 계절풍 선이 먼저다 — `ROUTE_SEASON`은 원양 항로의 철도 **대칭으로** 접어 넣은 표라
     (`regions/index.js: ALL_ROUTE_SEASON`) 그것을 먼저 보면 방향이 도로 지워진다.
     그 표는 근거 대조(`check-routes`)가 쓰므로 건드리지 않고 여기서 방향만 되살린다. */
  const lane = laneOf(aId, bId);
  if (lane?.monsoon && lane.season) {
    return aId === lane.a ? lane.season : flipSeason(lane.season);
  }
  return ROUTE_SEASON[riskKey(aId, bId)] ?? lane?.season ?? null;
}

/** 반년 뒤의 철 */
export const flipSeason = (s) => (s === 'summer' ? 'winter' : 'summer');

/** 지금 이 구간이 철에 맞나 — `null`(계절 없음) · `true`(제철) · `false`(철을 어긴다) */
export function inRouteSeason(aId, bId, day = state.day) {
  const s = routeSeason(aId, bId);
  return s == null ? null : s === seasonOf(day);
}

/** 철이 속력에 매기는 배율 (1 = 제철이거나 계절 없음) */
export function seasonFactor(aId, bId, day = state.day) {
  return inRouteSeason(aId, bId, day) === false ? SEASON.offSpeed : 1;
}

/** 철이 요율에 매기는 배율 (1 = 제철이거나 계절 없음) */
export function seasonRiskMul(aId, bId, day = state.day) {
  return inRouteSeason(aId, bId, day) === false ? SEASON.offRisk : 1;
}

/** 항로 카드에 띄울 한 줄 — **규칙만 있고 화면이 침묵하면 없는 것과 같다.**
    계절이 안 걸린 항로는 null을 돌려주어 줄을 아예 안 만든다. */
export function routeSeasonLabel(aId, bId, day = state.day) {
  const s = routeSeason(aId, bId);
  if (s == null) return null;
  const open = s === seasonOf(day);
  const word = s === 'summer' ? '여름' : '겨울';
  return {
    open, season: s,
    text: open ? `제철(${word})` : `철 아님(${word} 항로)`,
    kind: open ? 'good' : 'bad',
    why: open
      ? `${word}에 여는 계절풍 구간이다 — 지금이 그 철이다.`
      : `${word}에만 여는 계절풍 구간인데 지금은 ${seasonOf(day) === 'summer' ? '여름' : '겨울'}이다.`
        + ` 막지는 않는다 — 대신 일수가 약 ${(1 / SEASON.offSpeed).toFixed(1)}배로 늘고`
        + ` 요율이 ${SEASON.offRisk}배가 된다(보험료와 해적 조우가 함께 오른다).`,
  };
}

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

/** 그 항로가 지금 얼마나 잘 나가나 (1보다 크면 빠르다)
    ★ 철(`seasonFactor`)이 여기 곱해지므로 **일수 계산은 `voyageDays` 한 곳으로 닫힌다** —
      `scenes/map.js`도 시뮬도 손댈 곳이 없다. 계절이 안 걸린 항로에서는 1이라 종전과 한 치도 같다. */
export function routeFactor(aId, bId, day = state.day) {
  return windFactor(aId, bId, day) * currentFactor(aId, bId) * seasonFactor(aId, bId, day);
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

/** ★ 선단은 **가장 느린 배**에 맞춘다 — `fleetSpeedPenalty()`가 1 이하의 배율이다.
    동행선이 없으면 1이라 기존 계산과 한 치도 다르지 않다. */
export function voyageDays(aId, bId, day = state.day) {
  const base = distanceBetween(aId, bId) / (13 * shipSpeed() * fleetSpeedPenalty());
  /* 물길을 외운 사람은 **서 있는 날을 없앤다** — 빠른 배를 모는 것이 아니다(`sailDaysOff`).
     상한을 두는 이유: 아홉을 모아 항해가 하루가 되면 거리가 뜻을 잃는다. */
  const off = Math.min(0.30, matePerk('sailDaysOff'));
  return Math.max(1, Math.round((base / routeFactor(aId, bId, day)) * (1 - off)));
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

export function encounterOdds({ from, to, threat = 0, lure = null, day = state.day } = {}) {
  if (from == null || to == null) return SEA_EVENTS.find((e) => e.id === 'pirate').weight / 100;
  /* ★ 철을 어기면 요율이 오른다 — 계절풍을 거스르는 배는 느리고, 느린 배가 표적이 된다.
     `routeRisk()` 자체는 안 건드린다(`escortNeed`가 그것을 먹기 때문 — 위 계절풍 절 주석). */
  const risk = routeRisk(from, to) === null ? null : routeRisk(from, to) * seasonRiskMul(from, to, day);
  if (risk === null) return 0;                       // 오스만 내해·육로
  const bait = lure == null ? cargoLure() : cargoLure(lure);
  /* 악명이 조우를 부른다 — 털린 쪽이 배를 띄워 찾아다닌다 */
  const raw = Math.min(ODDS_CAP, ODDS_BASE + risk * ODDS_PER_PCT + threat * THREAT_PER_SHIP + bait
                                + infamyOdds(from, to));
  /* ★ **과소기** — 초무한 자가 있는 바다에서는 덜 만난다(`data.js: ROSTER.passOddsOff`).
     `infamyOdds`와 **부호만 반대인 자리**이고, 악명은 더하고 과소기는 곱해서 던다
     (악명은 "찾아온다"이고 과소기는 "그냥 지나간다"라 성질이 다르다). */
  return raw * (1 - passOff(REGION_OF_CITY[from] ?? REGION_OF_CITY[to]));
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
    if (n <= 0) return seizeMaybe(e, { from, to, rand });
  }
  return seizeMaybe(SEA_EVENTS[0], { from, to, rand });
}

/** 관선 임검 확률 — **자산 누진에 물려 있다.** 가난하면 0이고, 문서를 쥐면 훨씬 준다. */
export function seizureOdds({ to = state.at } = {}) {
  const p = SEIZURE.perScale * (tariffScale() - 1);
  const rid = REGION_OF_CITY[to];
  const permit = rid && (state.boons?.permit?.[rid] ?? 0) > state.day;
  return Math.min(SEIZURE.cap, p) * (permit ? SEIZURE.permitOff : 1);
}

/** **잔잔한 판정 하나를 잡아** 임검으로 바꾼다.
    ★ 이 자리를 고른 이유: `SEA_EVENTS`의 weight 합 100 규약을 지키는 유일한 방법이다.
      pirate·storm·merchant를 건드리면 그 상대 빈도가 통째로 흔들리고, 이 저장소는
      이미 같은 실수를 한 번 했다(→ data.js: SEA_EVENTS 주석 · test-rules.mjs가 지킨다).
      "늘어난 것은 calm에서 덜어온다"는 것이 이 게임이 정해 둔 답이다. */
function seizeMaybe(ev, { from, to, rand }) {
  if (ev.id !== 'calm' || from == null || to == null) return ev;
  if (rand() >= seizureOdds({ to })) return ev;
  return SEA_EVENTS.find((e) => e.id === 'seizure');
}

/** 관이 짐을 압수한다 — **값나가는 것부터.** 해상보험은 관의 처분을 인수하지 않는다.
    노상강도(`banditRaid`)와 같은 꼴이지만 몫이 다르고, 뺏기는 이유가 다르다. */
export function seizeCargo(rand = Math.random) {
  const held = Object.entries(state.cargo).filter(([, n]) => n > 0);
  if (!held.length) return { lost: {}, value: 0 };
  const dearFirst = held.sort((a, b) =>
    (GOOD_BY_ID[b[0]].base) - (GOOD_BY_ID[a[0]].base));
  const totalQty = held.reduce((a, [, n]) => a + n, 0);
  let take = Math.max(1, Math.round(totalQty * SEIZURE.share * (0.7 + rand() * 0.6)));
  const lost = {};
  let value = 0;
  for (const [gid, have] of dearFirst) {
    if (take <= 0) break;
    const n = Math.min(have, take);
    // ★ 값을 **먼저** 센다 — 전량이면 아래에서 `buyPrice`가 지워져 0원 손실로 잡힌다.
    value += (state.buyPrice[gid] || GOOD_BY_ID[gid].base) * n;
    state.cargo[gid] = have - n;
    if (!state.cargo[gid]) { delete state.cargo[gid]; delete state.buyPrice[gid]; }
    lost[gid] = n;
    take -= n;
  }
  return { lost, value: Math.round(value) };
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

/* ── 조우가 앗아가는 것 — 상한 (2026-08-28 · 사용자 결정 「상한 + 선원 바닥」) ────
   ★ **값은 `data.js: ENCOUNTER_LOSS`, 식은 여기다.** 개발자 B가 `scenes/battle.js`에 먼저 세웠는데,
     그 파일은 **node에서 import하면 `main.js: boot()`가 돌아 게임이 통째로 뜬다** — 회귀 검사를
     걸 수 없다. 이 저장소의 규약(`값은 data.js · 규칙은 state.js` · 모듈 방향 `data → state → scenes`)
     대로 순수 함수를 규칙 파일로 올린다. 그래야 `tools/test-rules.mjs`가 **진짜 그 함수**를 잰다.
   ⚠️ **지금은 `scenes/battle.js`에 같은 식이 쌍둥이로 있다**(B의 파일이라 내가 안 지웠다).
     B가 그 사본을 지우고 `import { capEncounterLoss } from '../state.js'`로 갈아 끼우면 끝난다
     (`scenes/map.js`도 같은 한 줄 — 지금 scene이 scene을 import하고 있어 모듈 방향도 함께 풀린다).
     **그때까지는 아래 「식이 갈라졌나」 검사가 두 사본을 묶어 둔다**(`test-rules.mjs`).

   ── 왜 상한인가 ────────────────────────────────────────────
   손실이 금고의 **비율**이고 상한이 없으면 금고에 자연 상한이 선다:
   `G* = 항차이익 / (조우율 × 손실률)`. 항차이익 2,000닢이면 도주만 골라도 46,425닢에서 멈추는데
   **패권 거점 총투자가 912,630닢**이다 — 후반 목표의 문이 구조적으로 닫힌다.
   ★ 이 게임은 *내가 얻는* 전리품을 이미 `capLoot`/`spoilsCap`으로 *"옮겨 실을 수 있는 만큼"*
     누른다. **그 대칭이 없어서** 잃는 쪽만 무한이었다. → `data.js: ENCOUNTER_LOSS` 머리주석 */

/** 저 갑판이 지고 갈 수 있는 금화 — **적의 크기**로 잰다(내 자산이 아니다. 그것이 이 설계의 심장이다).
    적 선원 수를 못 읽으면 등급으로 어림잡는다(`crewPerLevel`). */
export function encounterLossCap(foeCrew = 0, level = 1) {
  const crew = foeCrew > 0 ? foeCrew : Math.max(1, level) * ENCOUNTER_LOSS.crewPerLevel;
  return Math.max(ENCOUNTER_LOSS.floor, Math.round(crew * ENCOUNTER_LOSS.perCrew));
}

/** 조우로 잃는 금화 — 비율로 재고 **상한에서 꺾는다**. 패배·도주가 같은 이 함수를 쓴다.
    ★ 딱 자르지 않고 `tail`만큼 더 간다(`capSpoils`와 같은 모양) — 그래야 *"큰 놈에게 지는 것이
      여전히 더 아프다"*가 남는다. 그 대신 천장이 `1/tail`배로 물러난다. */
export function capEncounterLoss(raw, foeCrew = 0, level = 1) {
  const v = Math.max(0, raw);
  const cap = encounterLossCap(foeCrew, level);
  return Math.round(v <= cap ? v : cap + (v - cap) * ENCOUNTER_LOSS.tail);
}

/** 패배 뒤 남는 선원 — **하한이지 회복이 아니다**(`min(지금, 바닥)`이라 사람을 주지 않는다).
    잠기는 축은 금고가 아니라 사람이다: 선체는 되돌아갈 뿐인데 선원은 ×0.5로 누적된다. */
export function crewAfterLoss(crew = state.crew, shipKey = state.shipKey) {
  const s = SHIPS[shipKey];
  const oceanFloor = ENCOUNTER_LOSS.crewFloorOcean
    ? Math.max(3, Math.ceil((s?.crewMin ?? 0) * OCEAN_CREW_MIN)) : 0;
  const floor = Math.min(crew, Math.max(ENCOUNTER_LOSS.crewFloor, oceanFloor));
  return Math.max(floor, Math.round(crew * ENCOUNTER_LOSS.crewShare));
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
    /* ★ 지어야만 갖는 배(`yardsOnly`)는 **상으로도 주지 않는다.** 이것이 없으면 동아시아
       등급 5의 전리품이 tier 4에 가장 가까운 배 = **철갑 거북선**으로 고정된다(표본 1,020/1,020).
       패권 ③을 채우는 그 한 판이 ④까지 채워 버려, 조건 넷 중 둘이 한 번에 붙었다. */
    if (sh.yardsOnly) continue;
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

/** 해적이 재는 「털 값」 — 금고 + 실은 짐. 등급표를 고르는 축이다. */
export const foeWealth = () => state.gold + cargoUsed() * 60;

/** 그 자산이면 등급 1~5가 각각 얼마의 확률로 붙나.
    ★ **표를 여기 한 곳에만 둔다.** 화면(패권 조건 ③)이 이 표를 그대로 읽는다 —
      베끼면 규칙이 바뀔 때 화면만 옛 표를 말하게 된다.
    ★ 이 표가 A-8c가 짚은 자리다: **자산 30,000닢 아래에서는 등급 5 확률이 0**이라
      아무리 세도 두목을 못 만난다. "강해지면"이 아니라 **"부자가 되어야"** 열린다. */
export function foeOdds(wealth = foeWealth(), shipKey = state.shipKey) {
  // 볼품없는 배는 큰 놈이 상대해 주지 않는다 — 낡은 바사를 모는 동안은 잡배만 붙는다
  if (SHIPS[shipKey]?.leak) return [0.90, 0.10, 0.00, 0.00, 0.00];
  return wealth > 30000 ? [0.05, 0.10, 0.25, 0.35, 0.25]
       : wealth > 14000 ? [0.10, 0.25, 0.40, 0.20, 0.05]
       : wealth > 6000  ? [0.30, 0.42, 0.24, 0.04, 0.00]
       : wealth > 2000  ? [0.62, 0.32, 0.06, 0.00, 0.00]
                        : [0.88, 0.12, 0.00, 0.00, 0.00];
}

/** 그 등급이 붙기 시작하는 자산 문턱 — 화면이 *"얼마를 모아야 두목이 붙나"*를 적을 때 쓴다.
    표를 훑어 **처음으로 확률이 0을 넘는 밴드의 하한**을 돌려준다(없으면 null). */
export function foeWealthGate(tier) {
  for (const w of [0, 2001, 6001, 14001, 30001]) {
    if (foeOdds(w, 'carrack')[tier - 1] > 0) return w;
  }
  return null;
}

/* ── C-10 · **원양 구간의 적은 두 바다 어느 쪽에서도 온다** ────────────────
   ★ `pickEnemy`의 기본값이 `currentRegion()`, 곧 **출발지의 바다**였다. 그런데 원양 구간은
     두 바다 사이를 건너는 길이라, 아카풀코→마닐라(태평양 한복판)에서 **부카니에**가 나오고
     반대 방향에서 **왜구**가 나왔다 — 같은 물 위인데 어디서 떠났는지로 얼굴이 갈렸다.
   ★ 수치는 한 톨도 안 바뀐다(`ENEMIES` 등급 그대로) — `localize`가 갈아 끼우는 **얼굴**만 갈린다.
     그래서 밸런스에 손대지 않고 「같은 바다인데 적이 다르다」만 없앤다. */
export function legRegion(fromId = state.at, toId = null, rand = Math.random) {
  const a = REGION_OF_CITY[fromId] ?? currentRegion();
  if (toId == null) return a;
  const b = REGION_OF_CITY[toId] ?? a;
  if (a === b) return a;
  return rand() < 0.5 ? a : b;      // 반반 — 그 물은 두 바다의 것이다
}

export function pickEnemy(rand = Math.random, regionId = currentRegion()) {
  const pick = (i) => capLoot(localize(ENEMIES[i], i, regionId));
  // 자산이 커질수록 거물이 붙는다. 낡은 배로 시작하는 초반엔 큰 놈이 아예 붙지 않는다
  // (해적도 털 값이 나오는 배를 고른다).
  if (SHIPS[state.shipKey].leak) return pick(rand() < 0.9 ? 0 : 1);
  const table = foeOdds();
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
/** 이 구간에 인수업자가 곱하는 계수 — **원양이 근해보다 세다**(P4-b).
    사료 요율 중앙값 5%에 닿으려면 원양은 0.50이어야 한다(근거는 `data.js: INSURANCE_RATE_OCEAN`).
    ★ 항로에 새 필드를 더하지 않고 `isOceanLane`에서 뽑는다 — `OCEAN_LANES`는 권역 담당이
      늘리는 자리라, 새 항로가 생길 때마다 손으로 적게 하면 조용히 빠진다. */
export function insureRateFor(from, to) {
  return to != null && isOceanLane(from, to) ? INSURANCE_RATE_OCEAN : INSURANCE_RATE;
}

export function insuranceFor({ from = state.at, to = null, value = null, day = state.day } = {}) {
  const risk = to == null ? null : routeRisk(from, to);
  if (!risk) return 0;
  const v = value == null ? cargoValue(from) : value;
  /* ★ 철을 어기면 인수업자가 더 뗀다 — 당대에도 겨울 요율이 여름보다 비쌌고
     (안트베르펜 장부: 1월이 7월보다 +28%), 아예 닫힌 철은 인수 자체를 꺼렸다. */
  return Math.round((v * risk * seasonRiskMul(from, to, day) / 100)
                    * insureRateFor(from, to) * (1 - convoyInsureOff()));
}

/** 함께 가는 배가 많을수록 인수업자가 덜 뗀다 (`data.js: FLEET.insureOffPer/Cap` · P2-c) */
export function convoyInsureOff() {
  return Math.min(FLEET.insureOffCap ?? 0, consortCount() * (FLEET.insureOffPer ?? 0));
}

/* ── 「이걸 실으면 얼마가 더 나가나」 ─────────────────────────
   ★ **이번 회차에 같은 유형이 네 번째다** — 사냥터를 빈 배로 순찰(P6-1) · 짐이 곧 미끼인 줄 모름 ·
   원양 문이 안 보임 · 순회를 빈 배로. **게임이 이미 아는 것을 화면이 말하지 않아 생기는 손실**이고
   값이 매번 수백 일이다. 완주 러너가 62거점에서 하루 −600닢으로 150일을 새다 청산됐는데
   같은 조건의 시뮬은 하루 +274닢이었다 — 차이는 하나, **시뮬은 짐을 싣고 다녔다.**
   ⇒ 규칙은 한 줄도 안 바꾼다. `voyageCost()`는 이미 일곱 갈래로 돌려주고
     `insuranceFor({value})`는 이미 값을 인자로 받는다. **보이게만 한다.**
   ⚠️ 작은 배일수록 심하다 — 조운선은 비용의 83%가 보험이고 갈레온은 56%다.
     적은 칸에서 최대 이익을 내려고 **칸당 비싼 물건**을 싣기 때문이다(칸당 256닢 ↔ 111닢).
     **초반 플레이어가 가장 크게 당한다.** */

/** 지금 이 항구에서 나갈 수 있는 길 중 **가장 험한** 이웃 — 보험 미리보기의 기준이다.
    최악을 보여 주는 이유: 미리보기는 *"이만큼까지 나갈 수 있다"*여야 판단 재료가 된다. */
export function worstNeighbor(cityId = state.at) {
  let worst = null;
  for (const to of neighborsOf(cityId)) {
    const r = routeRisk(cityId, to) ?? 0;
    if (!worst || r > worst.risk) worst = { to, risk: r };
  }
  return worst;
}

/** 이 품목 `qty`칸을 더 실으면 **적하보험료가 얼마나 오르나**(가장 험한 이웃 항로 기준).
    ★ 미리 보여 주는 것뿐이다 — 실제로 무는 값은 출항할 때 `insuranceFor`가 다시 잰다. */
export function insuranceAdd(goodId, qty = 10, cityId = state.at) {
  const w = worstNeighbor(cityId);
  if (!w || !w.risk) return { add: 0, to: null, risk: 0 };
  const unit = state.prices[cityId]?.[goodId] ?? GOOD_BY_ID[goodId]?.base ?? 0;
  const now = cargoValue(cityId);
  const add = insuranceFor({ from: cityId, to: w.to, value: now + unit * qty })
            - insuranceFor({ from: cityId, to: w.to, value: now });
  return { add: Math.max(0, add), to: w.to, risk: w.risk };
}

/** 이 항차 비용에서 **보험이 차지하는 몫**(0~1) — 작은 배일수록 크다 */
export function insuranceShare(cost) {
  const t = cost?.total ?? 0;
  return t > 0 ? (cost.insurance ?? 0) / t : 0;
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

/* ── 원양 전손 (P4-c) ──────────────────────────────────────────
   ★ 지금까지 **배가 사라지는 길은 전투 패배뿐**이었고, 폭풍은 화물 일부만 던지게 했다.
   그래서 「먼 바다로 나가는 것이 큰 판돈이다」가 규칙으로 성립하지 않았다 —
   원양(P1)이 벌이가 되는 순간 그 반대쪽이 있어야 한다.
   근거·값은 `data.js: TOTAL_LOSS`(카레라 데 인디아스 1540~1650 · 11,000척 중 519척 = 4.7%).
   ⚠ **원양 구간에서만 굴린다** — 그 4.7%가 대서양 원양 항로의 수치이기 때문이다. */

/** 이 구간에서 배를 통째로 잃을 확률. 근해·내해는 0. */
export function totalLossOdds({ from = state.at, to = null } = {}) {
  if (to == null || !isOceanLane(from, to)) return 0;
  const risk = routeRisk(from, to);
  if (!risk) return 0;
  const hull = Math.max(0, Math.min(1, state.hp / Math.max(1, state.maxHp)));
  const wear = 1 + (1 - hull) * TOTAL_LOSS.hullPer;    // 삭은 배는 더 잘 가라앉는다
  return Math.min(TOTAL_LOSS.cap, TOTAL_LOSS.rate * (risk / TOTAL_LOSS.refRisk) * wear);
}

/** 배를 잃는다. **판을 끝내지 않는다** — 「바닥의 규칙」으로 들어가는 두 번째 문이다.
    ① 동행선이 있으면 **그 배로 갈아탄다**(선단을 사는 또 하나의 이유).
    ② 없으면 `liquidate()` — 배와 짐이 가고 낡은 바사 한 척과 종잣돈이 남으며
       **빚도 함께 사라진다**(해상대차: 담보가 사라지면 채무도 사라진다).
    화물은 어느 쪽이든 전부 잃고, 적하보험이 낸 만큼만 문다(선체는 보상하지 않는다). */
export function totalLoss(rand = Math.random, leg = null) {
  let value = 0;
  for (const [gid, n] of Object.entries(state.cargo)) {
    value += (state.buyPrice[gid] || GOOD_BY_ID[gid]?.base || 0) * n;
  }
  const payout = Math.round(value * insureCover(leg?.from ?? state.at, leg?.to ?? null));
  state.cargo = {}; state.buyPrice = {};

  const lostShip = state.shipKey;
  const spare = consortKeys()[0] ?? null;
  let mode;
  if (spare) {
    /* 동행선으로 갈아탄다. `boardShip`이 화물칸·무장·인원 상한을 그 배에 맞춘다. */
    delete state.fleet[lostShip];
    mode = 'consort';
    boardShip(spare);
  } else {
    mode = 'liquidate';
    liquidate();
  }
  state.gold += payout;
  if (payout > 0) book('income', 'insurance', payout);
  pushLog(`${SHIPS[lostShip].name}${josa(SHIPS[lostShip].name, '이/가')} 바다에 가라앉았다.`
    + (mode === 'consort' ? ` ${SHIPS[spare].name}으로 옮겨 탔다.` : '')
    + (payout > 0 ? ` 적하보험이 ${payout.toLocaleString('ko-KR')}닢을 물어 준다.` : ''), 'bad');
  return { ship: lostShip, mode, moved: spare, value: Math.round(value), payout };
}

/* ── 공정 보상률 — **보험이 세금이 아니게** (P8-1) ──────────────
   ★ 예전에는 보상률이 요율 계수와 **같은 상수**(0.30)였고, 그 결과 낸 것의 26~70%만
   돌아왔다 — 그리고 **위험할수록 더 나빠졌다.** 등식이 틀린 이유는 `data.js`의 주석에 있다.
   여기서는 **그 항차에 실제로 낸 요율**을 **그 항차의 기대손실률**로 나눠 공정률을 구하고
   인수업자의 몫(`INSURANCE_LOAD` 10%)만 뗀다. 보험료는 한 닢도 안 내린다.

   ★ 실제로 낸 요율을 쓰므로 **선단 할인(P2-c)이 저절로 맞물린다** — 60%만 내면 60%만
     받되 순손실도 60%로 준다. 할인이 무의미해지지도, 공짜 이익이 되지도 않는다. */

/** 이 구간에서 짐값의 몇 %가 사고로 사라질 것인가(기대값). 투하 + 원양 전손. */
export function expectedLossRate(from = state.at, to = null) {
  const risk = to == null ? null : routeRisk(from, to);
  if (!risk) return 0;                                   // 내해·육로는 보험이 안 붙는다
  const jettison = STORM_WEIGHT * jettisonOdds({ from, to }) * JETTISON_SHARE;
  /* 전손은 짐을 통째로 가져간다. **선체 상태는 빼고** 센다 —
     보상률이 내 배의 hp에 따라 출렁이면 "삭은 배일수록 보험이 후해진다"가 된다. */
  const wreck = isOceanLane(from, to)
    ? Math.min(TOTAL_LOSS.cap, TOTAL_LOSS.rate * (risk / TOTAL_LOSS.refRisk)) : 0;
  return jettison + wreck;
}

/** 잃은 값의 몇 %를 인수업자가 무나. 낸 만큼에 맞춘다(90%). */
export function insureCover(from = state.at, to = null) {
  const loss = expectedLossRate(from, to);
  if (!(loss > 0)) return INSURE_COVER_MIN;
  // 실제로 낸 요율(선단 할인 포함) — 짐값 1에 대한 보험료
  const premium = insuranceFor({ from, to, value: 1e6 }) / 1e6;
  const fair = (premium / loss) * INSURE_LOAD;
  return Math.min(INSURE_COVER_MAX, Math.max(INSURE_COVER_MIN, fair));
}

/** 짐을 던진다. 실은 것의 일부를 값이 **싼 것부터** 버린다 —
    선장이라면 당연히 그렇게 한다(비단을 먼저 던지지 않는다).
    돌려주는 값으로 로그·모달을 쓰고, 보상금은 여기서 바로 금고에 넣는다. */
export function jettisonCargo(share = 0.4, rand = Math.random, leg = null) {
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
  /* 낸 만큼 받는다 — 그 항차에 실제로 문 보험료로 역산한 공정 보상률(P8-1).
     leg를 안 주면 하한(옛 값 0.30)으로 떨어진다 — 옛 호출부가 안 깨지게. */
  const payout = Math.round(value * insureCover(leg?.from ?? state.at, leg?.to ?? null));
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
  /* ★ 동행선 몫은 **기존 갈래에 얹는다**(새 항목을 만들지 않는다) —
     삯은 `wages`, 보급은 `supplies`, 배 몫은 `fleet`. 그래야 항해일지·정산 화면·
     대시보드·시뮬이 배선 없이 그대로 선단 비용을 보여준다. 갈래별 내역이 필요하면
     돌려주는 `consort` 필드를 읽는다(총액에는 이미 들어가 있으므로 다시 더하지 말 것). */
  const cs = consortCost(days);
  // 일당은 무리마다 다르다 — 술집에서 누구를 태웠는지가 여기서 값으로 돌아온다.
  const wages = Math.round(crew * avgCrewWage() * days) + cs.wages;
  const supplies = Math.round(crew * SUPPLY_UNIT * days) + cs.supplies;
  const fleet = fleetUpkeep() * days + cs.upkeep;
  // 기함 선체 유지 — 삭구·타르·펌프질. 예전에는 "기함은 선원 급여로 갈음한다"며 뺐는데,
  // 그러면 배를 키워도 고정비가 안 늘어 후반이 너무 풍족해진다(실측 90항차 +65%).
  // 큰 배를 몰수록 무거워지는 값이라 성장에 브레이크를 거는 자리다.
  // 갑판장·화물장이 배를 아낀다 — 동료 특전 `upkeepOff`(선체·무장 유지비에만 붙는다)
  const upOff = 1 - Math.min(0.30, matePerk('upkeepOff'));
  const hull = Math.round((SHIPS[state.shipKey].upkeep || 0) * HULL_UPKEEP * days * upOff);
  const arms = Math.round(armsUpkeep() * days * upOff);
  const insurance = leg ? insuranceFor(leg) : 0;
  // 부관 급여 — 벌든 못 벌든 나간다. 선원 급여와 섞지 않고 따로 세운다:
  // 뭉뚱그리면 "부관을 데리고 있는 값"이 얼마인지 플레이어가 읽을 수 없다.
  const officer = state.officer ? Math.round(OFFICER.wage * days) : 0;

  /* ── 입항세도 운영비용이다 (#6) ─────────────────────────────
     사용자 원문: *"이것도 운영비용에 속하는거지."* 지금까지 관세는 `sell()` 안에서만
     떼여서 **항해비 표에 자리가 없었고**, 그래서 후반에 세가 무거워져도 플레이어가
     그것을 "비용"으로 읽을 데가 없었다. 여기에 갈래 하나를 더 세운다 —
     지금 실은 짐을 저기서 팔면 얼마를 떼이나.

     ★ **`total`에는 넣지 않는다.** `total`은 *출항하면 나갈 돈*이고 관세는 *팔 때* 나간다.
       섞으면 두 곳이 조용히 깨진다: `advanceDays`가 관세까지 미리 걷고,
       `sim-core.bestRun`이 이미 `planFor`에서 관세를 뺀 순이익에 또 뺀다(이중 계상).
       그래서 **옆자리**(`tariff`)와 합계(`withTariff`)를 따로 준다. */
  const tariff = leg?.to ? Math.round(cargoValue() * tariffRate(leg.to)) : 0;

  return {
    wages, supplies, fleet, hull, arms, officer, insurance, tariff, consort: cs,
    total: wages + supplies + fleet + hull + arms + officer + insurance,
    withTariff: wages + supplies + fleet + hull + arms + officer + insurance + tariff,
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
  const total = now + v.wages + v.officer;
  // 정박에는 관세가 없다(파는 것이 아니니까) — 갈래를 지우지 말고 0으로 세워 둔다.
  return { ...v, supplies, now, total, tariff: 0, withTariff: total };
}

/** 항구에서 며칠을 보낸다 — 세계는 돌고, 삯은 쌓이고, 짐은 그대로다 */
export function waitDays(n = 1) {
  if (n <= 0) return { ok: false, reason: '하루는 지나야 한다' };
  state.day += n;
  decayInfamy(n);
  decayRegard(n);          // 소문은 40일이면 잊히지만 장부는 90일이다

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
  /* ⚠️ **정기선은 여기서도 돈다.** `advanceDays`에만 걸면 *"항구에 서 있는 동안 정기선이
     멈춘다"*가 된다 — `QUICKMAP-trade.md`의 *"항구에는 시간이 없다"*가 이 층에서 절반만 참이다. */
  const lines = tickLines();
  const convoys = rollConvoys(n);
  rollFelling(n);
  rollFactionRaid(n);
  rollPoach();
  return { ok: true, days: n, cost: c, unpaid: r.owed, shocks, lines, convoys };
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
  /* 관계도 삭는다 — 다만 **2.25배 느리게**(90일). 방치의 종착지가 파산이 아니라 무관심이다. */
  decayRegard(n);
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
  /* ★ 선체가 바닥이면 **실은 짐이 젖는다.** 누수가 hp를 1 밑으로 안 깎아 선체가 눈금이
     아니게 된 자리(C-13)를, 막는 대신 **값을 물려서** 세운다 → `data.js: HULL`.
     ⚠️ 누수(`leak`)와 다르다 — 이쪽은 **어느 배든** 선체가 상하면 문다(전투·폭풍으로 삭은 캐랙도). */
  const soaked = soakCargo(n);

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
  /* ⚠️ **정기선은 `waitDays`에도 걸려 있다** — 양쪽에 안 걸면 한쪽에서 시간이 멈춘다(§3-2). */
  const lines = tickLines();
  const convoys = rollConvoys(n);      // 세력의 정기선단 — 확률이 아니라 달력이다(A-10 §3-3)
  rollFelling(n);                       // 회사의 벌목 — 파는 대신 벤다(3단계)
  rollFactionRaid(n);                   // 세력끼리의 나포 — 목격할 뿐이다(3단계)
  rollPoach();                          // 일감 가로채기 — 기한의 절반이 지나면 한 번 판정한다
  refreshPrices();
  return { ...c, leak, soaked, expired, shocks, lines, convoys };
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
/** 급여 정산.
    @param opts.pay 이번 달에 **줄 상한**. 안 주면 낼 수 있는 만큼 전부 준다.
      ★ **C-8의 답이 이 인자 하나다.** 화면 주석은 오래도록 *"안 주는 것도 선택이지 회피가 아니다"*라고
        적어 두었는데 **안 주는 단추가 없었다.** 원양은 화물에 전 재산을 넣은 채 급여일을 맞으므로
        20일 넘는 구간에서는 체납이 구조적으로 강제된다 — 그러면 그것은 선택이 아니라 사고다.
      ★ **벌칙은 한 칸도 안 바뀐다.** 못 준 비율(`ratio`)이 그대로 불만·이탈로 간다.
        유예 제도를 새로 만들지 않았다는 뜻이다 — 바뀌는 것은 *얼마를 주느냐*뿐이고,
        덜 주면 그만큼 정확히 더 아프다. */
export function settlePayroll(rand = Math.random, opts = {}) {
  /* ★ **빌린 돈이 먼저다.** 전주는 급여일에 맞춰 사람을 보내고, 선원보다 먼저 받아 간다 —
     그것이 이 돈이 무이자가 아닌 이유이자 빌리는 것이 위험한 이유다.
     금고가 모자라면 갚은 만큼만 줄고 나머지는 이자가 한 번 더 붙어 다음 달로 넘어간다. */
  const loan = state.boons?.loan;
  let loanPaid = 0, loanLeft = 0, enforced = null;
  if (loan && state.day >= loan.due) {
    loanPaid = Math.min(state.gold, loan.owed);
    state.gold -= loanPaid;
    if (loanPaid) book('outgo', 'port', loanPaid);
    const rest = loan.owed - loanPaid;
    if (rest > 0) {
      loan.owed = Math.round(rest * BOON.loanRate);
      loan.due = state.day + BOON.loanDays;
      loanLeft = loan.owed;
      /* ★ **빚에는 끝이 있다.** 전에는 여기서 ×1.25로 불기만 하고 아무 일도 안 일어나
         금고 0인 판이 영영 떠다녔다(ISSUES #3). 두 번 연속 못 넘기면 채권자가 집행한다 —
         금고·정박선·창고 짐을 가져가고, 그래도 모자라면 배까지 가져가고 **셈이 끝난다**
         (해상대차: 배가 사라지면 채무도 사라진다 → `data.js: BANKRUPT`). */
      loan.rolled = (loan.rolled ?? 0) + 1;
      /* ★ **팔 것이 하나도 없으면 곧바로 집행한다.** 유예는 "무엇을 버릴지 고르라"는 시간인데,
         고를 것이 없으면 그 30일은 판단이 아니라 빈 시간이다 — 실플레이의 36일이 그 시간이었다. */
      const now = loan.rolled >= BANKRUPT.rollsBefore || nothingLeft();
      pushLog(`빚 ${rest.toLocaleString('ko-KR')}닢을 못 갚아 `
            + `${loan.owed.toLocaleString('ko-KR')}닢으로 불었다.`
            + (now ? '' : ' 다음 급여일에도 못 갚으면 채권자가 집행한다.'), 'bad');
      if (now) {
        enforced = enforceDebt();
        loanLeft = debtOwed();
      }
    } else {
      state.boons.loan = null;
      pushLog(`빌린 돈 ${loanPaid.toLocaleString('ko-KR')}닢을 갚았다.`, 'good');
    }
  }

  const owed = payrollOwed();
  const cap = opts.pay == null ? owed : Math.max(0, Math.min(owed, Math.round(opts.pay)));
  const paid = Math.min(state.gold, cap);
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
  return { owed, paid, missed, deserted, ledger: closed, arrears: missed, loanPaid, loanLeft, enforced };
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
      /* ★ **관세 폭탄만 자산에 물려 있다.** 사용자 원문이 *"적당히 돈이 많아지는 시점에
         특히 더"*라고 했고, 기근·봉쇄·풍작은 세계의 일이지 내 금고의 일이 아니다. */
      const lean = ev.kind === 'tariff' ? tariffScale() : 1;
      if (rand() >= Math.min(0.4, ev.perDay * density * lean)) continue;

      /* ── 관세 폭탄은 **도시에만** 걸린다 ──────────────────────
         품목이 없으므로(`good: null`) `shockFactor`는 이것을 절대 곱하지 않고,
         `tariffShockFactor`만 읽는다. 사건 배관(`state.shocks`)을 새로 만들지 않고
         성질만 다른 항목을 같은 배열에 둔다. */
      if (ev.kind === 'tariff') {
        const city = CITIES[Math.floor(rand() * CITIES.length)];
        const already = state.shocks.some((sh) => sh.city === city.id && sh.good == null && sh.why === ev.id);
        addShock(city.id, null, ev.mult, ev.days, ev.id);
        if (already) continue;
        hit.push({
          kind: ev.id, name: ev.name, tone: ev.tone,
          city: city.id, cityName: city.name, good: null, goodName: '입항세',
          text: ev.line(city.name),
        });
        pushLog(ev.line(city.name), 'warn');
        continue;
      }

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
  /* ★ 갈래를 고르면 그쪽이 이기고, 안 고르면 **그 바다의 얼굴**이 붙는다(A-3 · `SEA_ORIGINS`).
     예전에는 아홉 어디서 시작해도 얼굴이 없었다 — 배만 갈리고 사람은 하나였다.
     ⚠️ 동아시아는 한반도 다섯이 이미 있으므로 `DEFAULT_ORIGIN`(역관의 서자)이 이긴다. */
  let origin = ORIGIN_BY_ID[originId] ?? null;
  if (origin && at === DEFAULT_START) at = origin.at;
  if (!origin) origin = (at === DEFAULT_START ? ORIGIN_BY_ID[DEFAULT_ORIGIN] : null) ?? seaOriginAt(at);
  /* ★ **시작배는 그 바다에서 가장 싼 배다**(사용자 지시 · `data.js: START_PORTS[].ship`).
     갈래가 배를 따로 정하면 그쪽이 이긴다 — 군관은 사람을 열넷 데려오므로 정원이 큰 병선을 탄다. */
  const shipKey = origin?.ship ?? startShipAt(at);
  const s = SHIPS[shipKey] ?? SHIPS.hulk;
  const arms = { light: s.guns, medium: 0, long: 0 };
  Object.assign(state, {
    day: 1, gold: origin?.gold ?? START_GOLD, shipKey,
    origin: origin?.id ?? null,
    hp: s.hp, maxHp: s.hp, crew: Math.min(origin?.crew ?? 0, s.crewMax), crewMax: s.crewMax,
    guns: s.guns, arms: { ...arms },
    refits: {}, shots: { grape: 0, chain: 0, heated: 0 },
    cargoCap: s.cargo,
    cargo: {}, buyPrice: {}, impact: {}, shocks: [], contract: null, npcs: [], at,
    infamy: {}, holdings: {}, stored: {}, yards: {}, works: {},
    dues: {},                    // 새 판에는 아무 나라에도 세를 안 냈다 (C-18)
    /* 3단계 — 유통. 새 판에는 묶어 둔 배도 띄워 둔 위탁도 없다 */
    lines: {}, consign: [],
    /* 새 판에서는 아무도 나를 모른다 — 열 세력 전부 0(「모른다」)에서 시작한다 */
    regard: {}, _regardAge: 0,
    /* 새 판은 아무도 꺾지 않았다 — 안 비우면 옛 판의 패권이 그대로 살아난다 */
    mates: {}, scouted: {}, bountyDue: [], slain: {}, tamed: {}, ended: 0, endedNine: 0,
    boons: { permit: {}, smuggle: {}, repair: {}, reroll: {}, loan: null },
    officer: initialOfficer(),   // 에이미는 첫날부터 타고 있다 — 고르는 인물이 아니다
    bands: [], hired: [],        // 갑판이 비어 있다. 술집에서 사람을 모아야 배가 뜬다
    payroll: { due: 0, arrears: 0, nextDue: MONTH_DAYS, lastDay: 1, deferredDay: 0 },
    ledger: newLedger(1),
    fleet: { [shipKey]: { at, hp: s.hp, arms: { ...arms }, refits: {} } },
    consorts: {},                // 새 판에는 따라 나선 배가 없다 — 안 비우면 옛 선단이 남는다
    towing: null,
    loadout: ['captain', null, null, null, null, null],
    /* ★ **시작 항구가 곧 아는 항구다.** 'venezia'가 하드코딩돼 있어, 부산포에서 시작해도
       가 본 적 없는 베네치아가 `known`에 박혔다(supremacy ISSUES #10). `known`은
       「가 본 항구」를 재는 값이라 정보 화면·지도 표시가 안 가 본 곳을 아는 것으로 셌다. */
    known: new Set([at]), everOwned: new Set([shipKey]), log: [],
    stats: { battles: 0, wins: 0, profit: 0, distance: 0 },
  });
  trimLoadout();
  refreshPrices();
  knowPort(at);        // 부두에 서 있으면 이웃 소문은 들린다 (P5)
  pushLog(`${CITY_BY_ID[at]?.name ?? at} 부두. 물이 새는 낡은 바사 한 척과 금화 ${state.gold}닢으로 시작한다.`, 'warn');
  pushLog('갑판에 사람이 없다. 술집에서 선원을 모으지 않으면 배는 뜨지 않는다.', 'warn');
  pushLog(`${OFFICER.name}${josa(OFFICER.name, '이/가')} 장부를 안고 갑판에 올라섰다. 급여 ${OFFICER.wage}닢/일.`, 'good');
}
