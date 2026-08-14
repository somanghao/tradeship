// state.js — 게임 상태와 규칙 (렌더링과 무관한 순수 로직)

import {
  GOODS, GOOD_BY_ID, CITIES, CITY_BY_ID, ROUTES, SHIPS, ENEMIES, SEA_EVENTS,
  CANNONS, CANNON_KEYS, CANNON_REFUND, TROOPS, TROOP_REFUND, MELEE_SLOTS,
  REFITS, SHOTS, MARKET, CURRENTS, TARIFF, SPREAD, CONTRACT, OFFICER,
} from './data.js';

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
  contract: null,            // 맡은 대형 주문 (한 번에 하나)
  officer: null,             // 부관 — { hiredDay, earned }. 오직 한 명(data.js: OFFICER)
  npcs: [],                  // 저 혼자 도는 상인·해적 (world.js가 굴린다)
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

export function priceOf(cityId, goodId) {
  const city = CITY_BY_ID[cityId];
  const good = GOOD_BY_ID[goodId];
  const raw = city.supply[goodId] ?? city.demand[goodId] ?? 1;
  const mul = 1 + (raw - 1) * SPREAD;          // 차익 폭을 SPREAD로 조인다
  const w = 0.86 + wobble(cityId, goodId, state.day) * 0.30;   // ±15%
  return Math.max(1, Math.round(good.base * mul * w));
}

export function refreshPrices() {
  for (const c of CITIES) {
    state.prices[c.id] = {};
    for (const g of GOODS) state.prices[c.id][g.id] = priceOf(c.id, g.id);
  }
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

/** n개를 한 번에 거래할 때의 평균 벌점 (0~cap) */
export function marketDepth(cityId) {
  return MARKET.depthPerSize * CITY_BY_ID[cityId].size;
}

export function impactFactor(cityId, goodId, n = 0) {
  const p = pressureOf(cityId, goodId) + Math.max(0, n - 1) / 2;
  const raw = Math.min(MARKET.cap, (MARKET.impact * p) / marketDepth(cityId));
  return raw * (1 - officerPerk('impactOff'));   // 부관이 물량을 나눠 넘긴다
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
  addPressure(state.at, goodId, max);
  return { ok: true, qty: max, cost, unit: Math.round(cost / max), base: state.prices[state.at][goodId] };
}

/** 그 항구의 입항세율 — 부관이 서류를 갖추면 덜 뗀다 */
export function tariffRate(cityId = state.at) {
  const base = TARIFF[CITY_BY_ID[cityId].size] ?? 0.045;
  return base * (1 - officerPerk('tariffOff'));
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
  const slot = Math.floor(day / 3);
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
  const pay = Math.round(unit * qty * mul * (1 + officerPerk('contractUp')));

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
  state.contract = null;
  return { ok: true, paid: rest, total: c.pay };
}

export function abandonContract() {
  const c = state.contract;
  if (!c) return { ok: false, reason: '맡은 주문이 없다' };
  const fine = Math.round(c.advance * CONTRACT.penalty);
  state.gold = Math.max(0, state.gold - fine);
  state.contract = null;
  return { ok: true, fine };
}

/** 기한이 지났는지 — advanceDays가 부른다 */
function checkContractDue() {
  const c = state.contract;
  if (!c || state.day <= c.due) return null;
  const fine = Math.round(c.advance * CONTRACT.penalty);
  state.gold = Math.max(0, state.gold - fine);
  state.contract = null;
  return { expired: c, fine };
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

/** 이 항구에서 부관을 만날 수 있는가. `poor`면 만나도 따라나서지 않는다. */
export function officerOffer(cityId = state.at) {
  if (state.officer) return null;
  if (cityId !== OFFICER.home) return null;
  // 물이 새는 배를 모는 선장에게는 가지 않는다 — 제 몫이 이익에서 나오는 사람이다
  return { fee: OFFICER.fee, poor: !!ship().leak };
}

export function hireOfficer() {
  if (state.officer) return { ok: false, reason: '이미 부관이 있다' };
  const o = officerOffer();
  if (!o) return { ok: false, reason: `${CITY_BY_ID[OFFICER.home].name}에 가야 만날 수 있다` };
  if (o.poor) return { ok: false, reason: '이 배로는 따라나서지 않는다' };
  if (OFFICER.fee > state.gold) {
    return { ok: false, reason: `계약금이 ${(OFFICER.fee - state.gold).toLocaleString('ko-KR')}닢 모자란다` };
  }
  state.gold -= OFFICER.fee;
  state.officer = { hiredDay: state.day, earned: 0 };
  return { ok: true, cost: OFFICER.fee };
}

export function dismissOfficer() {
  if (!state.officer) return { ok: false, reason: '부관이 없다' };
  const pay = Math.round(OFFICER.fee * OFFICER.severance);
  const earned = state.officer.earned;
  state.gold = Math.max(0, state.gold - pay);
  state.officer = null;
  return { ok: true, pay, earned };
}

/* ── 항구 서비스 ──────────────────────────────────────────── */
export const REPAIR_UNIT = 14;   // HP 1당 금화
export const HIRE_UNIT = 55;     // 선원 1명당 (대포 값은 data.js CANNONS)

export function repair(amount) {
  const need = Math.min(amount, state.maxHp - state.hp);
  const cost = need * REPAIR_UNIT;
  if (need <= 0) return { ok: false, reason: '선체는 멀쩡하다' };
  if (cost > state.gold) return { ok: false, reason: '금화가 모자란다' };
  state.gold -= cost;
  state.hp += need;
  return { ok: true, need, cost };
}

export function hire(n) {
  const room = state.crewMax - state.crew;
  const max = Math.min(n, room, Math.floor(state.gold / HIRE_UNIT));
  if (max <= 0) return { ok: false, reason: room <= 0 ? '선실이 가득 찼다' : '금화가 모자란다' };
  state.gold -= max * HIRE_UNIT;
  state.crew += max;
  return { ok: true, n: max, cost: max * HIRE_UNIT };
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
  state.refits[key] = true;
  recalcShip();
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

/** 도주 성공률 보정 (돛 증축) */
export function fleeBonus() {
  return state.refits.sails ? 0.14 : 0;
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

/* ── 대포의 유효 구간 ────────────────────────────────────────
   near~far를 벗어난 만큼 조준이 무너진다. 멀어질 때(50)보다
   가까워질 때(25)가 두 배 가파르다 — 장포로 코앞을 겨누는 쪽이 더 곤란하다.
   바닥값이 있어 아무리 벗어나도 아예 못 맞히지는 않는다. */
export const ZONE_FAR_FALL = 50, ZONE_NEAR_FALL = 25, ZONE_FLOOR = 0.4;

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
export const SHIP_RESALE = 0.55;

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
  return CITY_BY_ID[cityId]?.industry ?? 0;
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

/* 값 — 공업력에 여유가 있는 항구일수록 싸고, 전통 조선지는 한 번 더 깎아준다.
   같은 배라도 어디서 사느냐로 값이 갈려 "조선 강국까지 가서 산다"는 동기가 남는다. */
export const YARD_SLACK_OFF = 0.07;   // 공업력 여유 1당
export const YARD_SLACK_CAP = 0.15;
export const YARD_TRADITION_OFF = 0.08;

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
    if (lock) return { ok: false, reason: `${lock}을(를) 몰아 본 선주에게만 내놓는다` };
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
  state.fleet[key] = { at: state.at, hp: s.hp, arms: { light: 0, medium: s.guns, long: 0 }, refits: {} };
  state.everOwned.add(key);
  return { ok: true, cost: price };
}

/* ── 중고선 ───────────────────────────────────────────────────
   신조만 있으면 "그 항구에 가기 전까지는 방법이 없다"가 된다. 실제로도 즉시 손에 넣을 수 있는 배는
   신조가 아니라 **중고선과 나포선**이었다. 항구마다 매물이 사흘 주기로 갈리고,
   나포선을 뜯어 고쳐 파는 항구(`prizeYard` — 튀니스·알제)는 더 자주, 더 싸게 나온다.
   싸지만 선체가 상해 있어 수리비가 든다. */
export const USED = {
  priceMul: [0.52, 0.74],   // 정가 대비
  hullMul: [0.45, 0.85],    // 선체 잔량
  slots: 2,                 // 한 항구에 걸리는 매물 수 상한
  cycle: 3,                 // 며칠마다 갈리나 (시세와 같은 리듬)
};

export function usedListings(cityId = state.at, day = state.day) {
  const city = CITY_BY_ID[cityId];
  if (!city) return [];
  const ind = industryOf(cityId);
  if (ind <= 0) return [];        // 내륙 도시는 배가 드나들지 않는다
  const prize = !!city.prizeYard;
  // 중고는 흘러드는 것이라 신조보다 관대하다 — 공업력보다 한 등급 위까지 들어온다.
  const pool = Object.entries(SHIPS)
    .filter(([k, s]) => s.tier > 0 && s.tier <= ind + 1 && !shipLockedBy(k))
    .map(([k]) => k);
  if (!pool.length) return [];

  const out = [];
  const slots = USED.slots + (prize ? 1 : 0);
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
  state.fleet[key] = { at: cityId, hp: lot.hp, arms: { light: 0, medium: s.guns, long: 0 }, refits: {} };
  state.everOwned.add(key);
  return { ok: true, cost: lot.price, hp: lot.hp };
}

/* ── 나포한 배 ────────────────────────────────────────────────
   백병전으로 이겨 갑판을 장악하면 그 배를 끌고 갈 수 있다.
   이미 같은 선종을 가지고 있으면 끌고 갈 인원이 없어 자재로 판다. */
export const PRIZE_HULL = 0.6;    // 나포선은 선체가 상한 채로 들어온다
export const PRIZE_SCRAP = 0.30;  // 해체 시 정가 대비

export function captureShip(key) {
  const s = SHIPS[key];
  if (!s) return { ok: false, reason: '끌고 갈 만한 배가 아니다' };
  if (state.fleet[key]) {
    const gain = Math.round(s.price * PRIZE_SCRAP);
    state.gold += gain;
    return { ok: true, scrapped: true, gain };
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

/** 정박 중인 배를 판다 — 타고 있는 배는 팔 수 없다 */
export function sellShip(key) {
  const rec = state.fleet[key];
  if (!rec) return { ok: false, reason: '보유하지 않은 배다' };
  if (state.shipKey === key) return { ok: false, reason: '타고 있는 배는 팔 수 없다' };
  if (rec.at !== state.at) return { ok: false, reason: `${CITY_BY_ID[rec.at].name}에 정박해 있다` };
  const gain = resaleOf(key);
  delete state.fleet[key];
  state.gold += gain;
  return { ok: true, gain };
}

/** 선원이 줄어 슬롯이 닫히면 그 자리의 병종도 내린다 */
export function trimLoadout() {
  const open = openSlots();
  for (let i = open + 1; i < MELEE_SLOTS; i++) state.loadout[i] = null;
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

export function distanceBetween(aId, bId) {
  const a = CITY_BY_ID[aId], b = CITY_BY_ID[bId];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

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

/* ── 항해 이벤트 ──────────────────────────────────────────── */
export function rollSeaEvent(rand = Math.random) {
  const total = SEA_EVENTS.reduce((a, e) => a + e.weight, 0);
  let n = rand() * total;
  for (const e of SEA_EVENTS) {
    n -= e.weight;
    if (n <= 0) return e;
  }
  return SEA_EVENTS[0];
}

export function pickEnemy(rand = Math.random) {
  // 자산이 커질수록 거물이 붙는다. 낡은 배로 시작하는 초반엔 큰 놈이 아예 붙지 않는다
  // (해적도 털 값이 나오는 배를 고른다).
  const wealth = state.gold + cargoUsed() * 60;
  // 볼품없는 배는 큰 놈이 상대해 주지 않는다 — 낡은 바사를 모는 동안은 잡배만 붙는다
  if (SHIPS[state.shipKey].leak) return rand() < 0.9 ? ENEMIES[0] : ENEMIES[1];
  const table = wealth > 30000 ? [0.05, 0.10, 0.25, 0.35, 0.25]
              : wealth > 14000 ? [0.10, 0.25, 0.40, 0.20, 0.05]
              : wealth > 6000  ? [0.30, 0.42, 0.24, 0.04, 0.00]
              : wealth > 2000  ? [0.62, 0.32, 0.06, 0.00, 0.00]
                               : [0.88, 0.12, 0.00, 0.00, 0.00];
  let n = rand();
  for (let i = 0; i < table.length; i++) {
    n -= table[i];
    if (n <= 0) return ENEMIES[i];
  }
  return ENEMIES[0];
}

/* ── 항해 비용 ────────────────────────────────────────────────
   세 갈래로 나눠 둔다. 뭉뚱그리면 "왜 돈이 안 모이나"를 플레이어가 읽을 수 없다.
     · 일당    선원에게 매일 나가는 삯. 큰 배는 사람이 많아 비싸다.
     · 보급    식량과 물. 역시 사람 수 × 날수.
     · 선단    기함 밖의 배를 정박해 두는 값. */
export const CREW_WAGE = 2.4;      // 1명 1일
export const SUPPLY_UNIT = 1.3;    // 1명 1일

export function voyageCost(days, crew = state.crew) {
  const wages = Math.round(crew * CREW_WAGE * days);
  const supplies = Math.round(crew * SUPPLY_UNIT * days);
  const fleet = fleetUpkeep() * days;
  return { wages, supplies, fleet, total: wages + supplies + fleet };
}

/** 항해 1구간 진행 — 날짜·일당·보급·선단 유지비·누수·시장 회복 */
export function advanceDays(n) {
  state.day += n;
  const c = voyageCost(n);
  state.gold = Math.max(0, state.gold - c.total);

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

  const expired = checkContractDue();
  refreshPrices();
  return { ...c, leak, expired };
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

export function resetGame() {
  const s = SHIPS.hulk;
  const arms = { light: s.guns, medium: 0, long: 0 };
  Object.assign(state, {
    day: 1, gold: 900, shipKey: 'hulk',
    hp: s.hp, maxHp: s.hp, crew: s.crew, crewMax: s.crewMax,
    guns: s.guns, arms: { ...arms },
    refits: {}, shots: { grape: 0, chain: 0, heated: 0 },
    cargoCap: s.cargo,
    cargo: {}, buyPrice: {}, impact: {}, contract: null, officer: null, npcs: [], at: 'venezia',
    fleet: { hulk: { at: 'venezia', hp: s.hp, arms: { ...arms }, refits: {} } },
    towing: null,
    loadout: ['captain', 'sailor', null, null, null, null],
    known: new Set(['venezia']), everOwned: new Set(['hulk']), log: [],
    stats: { battles: 0, wins: 0, profit: 0, distance: 0 },
  });
  trimLoadout();
  refreshPrices();
  pushLog('베네치아 부두. 물이 새는 낡은 바사 한 척과 금화 900닢으로 시작한다.', 'warn');
  pushLog('제대로 된 배를 살 때까지는 짧은 항로만 돌아야 한다.', 'info');
}
