// wages.mjs — 보수(급여·성과급) 계측 (출력이 없는 순수 로직)
//
// dash.js·pirates.mjs와 같은 원칙: **여기서 규칙을 다시 구현하지 않는다.**
// 급여는 `voyageCost()`의 officer 항목이, 성과급은 `sell()`이 정본이고
// 여기서는 시뮬을 돌리며 지나갈 때 찍어 둘 뿐이다.
//
// 사료 대조값은 `content/wage-evidence.json`이 정본이라 이 파일에 숫자로 적지 않는다
// (`tools/check-wages.mjs`가 코드와 근거의 불일치를 잡는다).

import { OFFICER, SHIPS, GOODS, GOOD_BY_ID } from '../js/data.js';
import { state, CREW_WAGE, SUPPLY_UNIT, resaleOf } from '../js/state.js';
import { runSim } from '../tools/sim-core.mjs';

/* ── 1. 하루치 보수 사다리 ───────────────────────────────────
   "부관은 선원의 몇 배인가"가 사료와 대조할 수 있는 유일한 축이다 —
   게임 화폐 '닢'은 실화폐가 아니므로 절대액은 비교 대상이 못 된다. */
export function payLadder() {
  const ratio = OFFICER.wage / CREW_WAGE;
  return {
    crewWage: CREW_WAGE,
    supplyUnit: SUPPLY_UNIT,
    officerWage: OFFICER.wage,
    cut: OFFICER.cut,
    ratio,
    rows: [
      { who: `부관 ${OFFICER.name}`, sub: OFFICER.title, perDay: OFFICER.wage, mult: ratio, key: 'officer' },
      { who: '선원 1명', sub: '일당', perDay: CREW_WAGE, mult: 1, key: 'crew' },
      { who: '보급 1명분', sub: '급여가 아니라 먹이는 값', perDay: SUPPLY_UNIT, mult: SUPPLY_UNIT / CREW_WAGE, key: 'supply' },
    ],
  };
}

/* ── 1-b. 교역품 상대가격 ────────────────────────────────────
   사료와 대조할 수 있는 유일한 축은 "곡물(밀)의 몇 배인가"다.
   목표 비율과 사료 원값은 content/goods-evidence.json이 정본이라 여기서 적지 않는다. */
export function goodsTable() {
  const grain = GOOD_BY_ID.grain.base;
  return GOODS.map((g) => ({
    id: g.id, name: g.name, base: g.base, ratio: g.base / grain,
  })).sort((a, b) => a.ratio - b.ratio);
}

/* ── 2. 총자산 ───────────────────────────────────────────────
   금화만 보면 "방금 배를 샀는가"에 지배된다(officer.md의 실패 기록).
   그래서 언제나 금화 + 선단 매각가로 잰다. */
function netWorth() {
  let w = state.gold;
  const keys = new Set([...Object.keys(state.fleet || {}), state.shipKey]);
  for (const k of keys) if (SHIPS[k]) w += resaleOf(k);
  return w;
}

/* ── 3. 시드 고정 ────────────────────────────────────────────
   `world.js`도 `state.js`도 호출 시점에 `Math.random`을 조회하므로
   전역을 잠시 갈아 끼우면 세계 전체가 같은 난수열을 탄다.
   부관 유무를 **짝지어(paired)** 비교하려면 이것이 없으면 안 된다. */
function withSeed(seed, fn) {
  const orig = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = orig; }
}

/* ── 4. 한 판을 돌리며 보수를 찍는다 ─────────────────────────
   `state.officer.paid`(급여 누적)와 `earned`(성과급 누적)는 게임이 스스로 세는 값이다.
   여기서 다시 더하지 않고 그때그때 읽기만 한다. */
export function measurePay(maxVoyages = 90) {
  const series = [];
  const totals = { wages: 0, supplies: 0, fleet: 0, hull: 0, arms: 0, insurance: 0,
    officer: 0, gain: 0, spend: 0, ship: 0, repair: 0, hire: 0 };

  const { rows } = runSim({
    maxVoyages,
    hooks: {
      onVoyage(rec) {
        totals.wages += rec.wages;
        totals.supplies += rec.supplies;
        totals.fleet += rec.fleetCost;
        totals.hull += rec.hullCost || 0;
        totals.arms += rec.armsCost || 0;
        totals.insurance += rec.insCost || 0;
        totals.officer += rec.officerCost;
        totals.gain += rec.gain;
        totals.spend += rec.spend;
        totals.ship += rec.shipSpend;
        totals.repair += rec.repairSpend;
        totals.hire += rec.hireSpend;
        series.push({
          v: rec.v,
          day: rec.day,
          crew: state.crew,
          paid: state.officer ? Math.round(state.officer.paid) : 0,
          earned: state.officer ? Math.round(state.officer.earned) : 0,
          officerCost: rec.officerCost,
          wages: rec.wages,
          supplies: rec.supplies,
          fleetCost: rec.fleetCost,
          net: rec.gain - rec.spend,
          gold: rec.gold,
          worth: netWorth(),
        });
      },
    },
  });

  const last = series[series.length - 1] || { paid: 0, earned: 0, day: 0 };
  const takeHome = last.paid + last.earned;

  // 성과급이 급여를 앞지르는 시점 — "같이 굶다가 같이 번다"가 눈에 보이는 자리.
  // **그 뒤로 계속 앞선 첫 항차**를 찾는다. 단순히 처음 넘어선 곳을 잡으면
  // 첫 항차의 우연한 큰 거래 한 건이 잡혀 아무 뜻도 없는 지점이 나온다.
  let crossover = null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].earned > series[i].paid) crossover = series[i];
    else break;
  }

  return {
    maxVoyages,
    voyages: rows.length,
    days: last.day,
    series,
    totals,
    paid: last.paid,
    earned: last.earned,
    takeHome,
    cutShare: takeHome ? last.earned / takeHome : 0,
    crossover,
    // 항해비(일당·보급·선단·부관) 안에서 부관 급여가 차지하는 몫
    voyageCostShare: (() => {
      const t = totals.wages + totals.supplies + totals.fleet
              + totals.hull + totals.arms + totals.insurance + totals.officer;
      return t ? totals.officer / t : 0;
    })(),
    // 부관이 가져간 몫이 총매출에서 차지하는 비율
    revenueShare: totals.gain ? takeHome / totals.gain : 0,
  };
}

/* ── 5. 부관 유무를 짝지어 비교한다 ──────────────────────────
   ★ 그냥 두 번 돌려 비교하면 안 된다. 시뮬이 "돈이 모이면 즉시 큰 배를 사는" 탓에
     기준선이 25%씩 튀어 **효과의 부호가 뒤집힌다**(officer.md에 기록된 실제 사고).
     같은 시드로 같은 세계를 두 번 돌려 차이만 본다. */
function runOne(seed, withOfficer, voyages) {
  return withSeed(seed, () => {
    const worth = [];
    runSim({
      maxVoyages: voyages,
      hooks: {
        onStart() { if (!withOfficer) state.officer = null; },   // 부관 없는 세계
        onVoyage() { worth.push(netWorth()); },
      },
    });
    return worth;
  });
}

const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function pairedOfficer({ pairs = 12, voyages = 90, marks = [3, 5, 10, 20, 45, 90] } = {}) {
  const withA = [], withoutB = [];
  for (let i = 0; i < pairs; i++) {
    const seed = 1013904223 + i * 2654435761;
    withA.push(runOne(seed, true, voyages));
    withoutB.push(runOne(seed, false, voyages));
  }

  const at = (arr, v) => (arr.length ? arr[Math.min(v, arr.length) - 1] : 0);

  const rowsAt = marks.filter((m) => m <= voyages).map((m) => {
    const diffs = [];
    for (let i = 0; i < pairs; i++) diffs.push(at(withA[i], m) - at(withoutB[i], m));
    return {
      v: m,
      med: median(diffs),
      wins: diffs.filter((d) => d > 0).length,
      n: diffs.length,
      lo: Math.min(...diffs),
      hi: Math.max(...diffs),
    };
  });

  // 항차별 중앙 차이 곡선 — 어느 항차에서 부호가 뒤집히는가
  const curve = [];
  for (let v = 1; v <= voyages; v++) {
    const diffs = [];
    for (let i = 0; i < pairs; i++) diffs.push(at(withA[i], v) - at(withoutB[i], v));
    curve.push({ v, med: median(diffs), win: diffs.filter((d) => d > 0).length / pairs });
  }
  const breakEven = curve.find((c) => c.med > 0) || null;

  return {
    pairs, voyages, rows: rowsAt, curve, breakEven,
    medWith: median(withA.map((w) => at(w, voyages))),
    medWithout: median(withoutB.map((w) => at(w, voyages))),
  };
}

export function measureAll({ voyages = 90, pairs = 12 } = {}) {
  const ladder = payLadder();
  const pay = measurePay(voyages);
  const paired = pairedOfficer({ pairs, voyages });
  return { ladder, pay, paired };
}
