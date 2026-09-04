/* ★ **세이브 검사에 필요한 최소 폴리필.** node에는 `localStorage`가 없다 —
   `js/save.js`는 그것이 없으면 조용히 실패하도록(사파리 프라이빗 모드) 만들어졌으므로,
   폴리필 없이 부르면 **전부 통과해 버린다.** 검사가 검사를 안 하는 자리가 된다. */
if (!globalThis.localStorage) {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}

import { SHIPS, ENEMIES, REFITS, OFFICER, CITY_BY_ID, CITIES, GOOD_BY_ID, ROUTES, ORIGINS, START_PORTS, DEFAULT_START, DEFAULT_ORIGIN, startShipAt, YARD } from '../js/data.js';
import {
  state, resetGame, advanceDays, purchaseShip, boardShip, buyRefit, gunCap,
  shipSpeed, shorthanded, captureShip, fleetUpkeep, pickEnemy, voyageDays,
  buyShot, useShot, shotStock, maxHullOf, buy, sell, hire, sellsShip, yardsOf,
  cargoUsed, armsTotal, industryOf, tierNeeded, shipPriceAt, shipLockedBy,
  usedListings, buyUsed, buildableAt, yardCapable,
  hasOfficer, tariffRate, impactFactor, ship, encounterOdds, routeRisk, rollSeaEvent, neighborsOf, legRegion,
  flagshipSinks, sinkFlagship, liquidate, originPerk,
  /* C-18 — 부두는 살 수 없고 나라가 짓는다 */
  noteDues, duesOf, duesOfFlag, civicOf, civicRoom, civicBusy, civicBuilding, civicProgress, tickCivic,
  /* 조우 손실 상한(2026-08-28) — 값은 data.js, 식은 state.js */
  encounterLossCap, capEncounterLoss, crewAfterLoss,
  /* 국가를 거쳐 항구로(2026-08-28) */
  mainPortOf, civicSplit,
  industryPathHint, yardBusy, endingProgress,
  growKind, growStock, growCap, canBuyGrow, buyGrow, workAt, chainMargin, costFor,
  shopCut, canBuyShop, buyShop, shopAt, millOf, shopTick, collectShop, consignToShop,
  canConsign, sendConsign, arriveConsign, canStartLine, startLine, stopLine, cargoCapTotal, waitDays,
  gripMarkup, hasOutsideSource, enrollOffer, buyEnroll, enrolled, convoyDue, rollConvoys,
  fleetSlain, bondPenalty, workEntry, rollPoach, addRegard, regardOf, reviveTrespass,
  /* 회차 28 · 나-1 — 상단과 세력이 **관계**에서 만나는 자리 둘 */
  guildBackers, backerSlain, stirSeen, gripsHere, guildCounterAt, recordSlain,
  rollFelling, rollFactionRaid, atWar,
  contractOffer, acceptContract, START_GOLD,
  /* 수직계열화 1단계(A-9) — 값은 `check-chain.mjs`가 보고, 여기서는 규칙의 뼈대만 본다 */
  buyHolding, canBuyMill, buyMill, sellMill, millPrice, millRecipes,
  millBatchCap, runMill, collectMill, worksUpkeepDue, settleWorks,
  /* 거점의 유예·매각과 파산 — 「바닥에는 바닥의 규칙이 있다」 */
  hasHolding, ownsHolding, holdingIdle, holdingUpkeepDue, settleHolding, sellHolding, holdingsValue,
  storeCap, payFine, debtOwed, nothingLeft, enforceDebt, settlePayroll, resaleOf,
  /* 바닥에서 나가는 문(C-17) — 안내가 적을 값을 규칙이 센다 */
  salvage, salvageValue, sellNet, cheapestExit, voyageCost,
  /* C-17 ② — 판정을 화면에서 규칙으로 올렸다(회차 23) */
  recoveryOptions, salvageElsewhere,
  /* 패권이 화면에서 말을 안 하던 자리 둘(A-8c) */
  foeWealth, foeOdds, foeWealthGate, hegemonyOf,
  /* 삭은 배와 명부 사냥 */
  hullFactor, soakCargo, shipSpeed as speedOf,
  rosterOpenIn, bountyTipPrice, tamePrice, buyBountyTip, tamePirate, activeBounty,
  tamedIn, passOff, tipOff, regionHasHolding,
  huntLegs, oweBounty, payBounties, capLoot, spoilsCap,
  /* 성장 설계 — P5 초행 정보 · P2 선단 · P3 동료 */
  knowPort, priceKnown, holdingTip, metFactions, escortNeed, oceanReady, convoyInsureOff, insuranceFor,
  matesAt, hireMate, dismissMate, mateCut, matePerk, mateStake, mateCap, mateCount, crewMates, freeMates,
  canConsort, setConsort, consortCount, voyageDays as legDays,
  /* 비용 축(P4) — 선원 사무역 · 원양 보험 · 원양 전손 */
  privateTradeCut, insureRateFor, totalLossOdds, totalLoss,
  /* 수익형 부동산(#5)과 후반 브레이크(#6) */
  estateGrade, estateDef, estatePrice, estateUpgradeCost, canUpgradeEstate, upgradeEstate,
  vacancyOdds, estateRent, estateOccupied, holdingIncomeDue,
  netWorth, tariffScale, tariffShockFactor, baseTariff, seizureOdds, seizeCargo,
  addShock, rollShockEvents, shockFactor, priceOf,   // voyageCost는 위 C-17 줄에서 이미 온다
  /* 상단(商團) — 회차 25. 값이 아니라 **부호**가 요점이다 */
  guildFactor, addGuildFlow, guildFlowOf, decayGuildFlow, guildCredit, guildEscortOff,
  refreshPrices, marketDepth,
  /* #3 조선소 교역권 사다리 · #4 계절풍 */
  yardReach, yardShortOf,
  routeSeason, inRouteSeason, seasonFactor, seasonRiskMul, routeSeasonLabel, seasonOf,
  routeFactor, windFactor, currentFactor, YEAR_DAYS,
  /* §A-11 명 — 자리(座) */
  seatCity, seatAt, seatTier, seatPrice, seatUpcharge, seatCount, buySeat, rollSeatAudit,
  seatSellerOK, holdingPrice,
  /* §A-11 조선 — 작위와 개항 */
  royalEligible, royalCalling, royalProgress, takeRoyal, claimRoyal, joseonOpen,
  civicCapOf, civicDuesOf, fairOpen, rollFair,
} from '../js/state.js';
import { HOLDING, BANKRUPT, MONTH_DAYS, HULL, wreckShipOf, seaOriginAt, WORKS, WORK, CHAIN, CHAIN_BY_ID, FACTION, ROSTER, FLEET, COMMENDA, CONTRACT, ALL_PIRATES,
  PRIVATE_TRADE, INSURANCE_RATE, INSURANCE_RATE_OCEAN, TOTAL_LOSS, HEGEMONY,
  HOLDINGS, HOLDING_KEYS, ESTATE_KEYS, ESTATE, TARIFF_SCALE, SEIZURE, SEA_EVENTS, SHOCK, SEASON,
  /* C-18 — 나라가 짓는 조선소 */
  CIVIC, ENCOUNTER_LOSS, FACTIONS, SEAT, ROYAL } from '../js/data.js';
import { readFileSync } from 'node:fs';
import { LIVE_LANES } from '../js/regions/index.js';
import { saveGame, savedHead, loadGame, clearSave, stashSave, restoreStashed } from '../js/save.js';
import { huntedOnLeg, rosterOf, initWorld, npcsOnLeg, rosterClosed } from '../js/world.js';

/* ★ **이 함수가 exit code를 안 건드리고 있었다.** 그래서 검사가 전부 FAIL이어도
   `node tools/test-rules.mjs`가 **exit 0**을 돌려주었고, 자동 회차와 문서는 그것을
   "통과"로 읽었다(HANDOFF가 적어 둔 `PASS 66/0`도 사람이 눈으로 센 것이다).
   실패할 수 없는 검사는 검사가 아니다 — `test-tavern.mjs`는 처음부터 이렇게 되어 있었다. */
let PASS = 0, FAIL = 0;
const ok = (c, msg) => {
  if (c) PASS++; else { FAIL++; process.exitCode = 1; }
  console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`);
};
process.on('exit', () => console.log(`
규칙 — ${PASS}/${PASS + FAIL} 통과${FAIL ? ` · **실패 ${FAIL}건**` : ''}`));

resetGame();
/* ★ 시작배는 **그 바다에서 가장 싼 배**다(`data.js: START_PORTS[].ship`).
   전에는 아홉 어디서 시작해도 `hulk` 하나였다 — 그 시절 이 검사가 `'hulk'`를 박아 두었다. */
ok(state.shipKey === startShipAt(DEFAULT_START) && state.gold === START_GOLD,
   `시작: ${state.shipKey} / ${state.gold}닢 / 선체 ${state.hp} / 화물칸 ${state.cargoCap}`);
// 갑판이 빈 채로 시작하므로(술집에서 모은다) 이 아래 검사들은 선원을 세워 두고 돈다.
// 술집 규칙 자체는 tools/test-tavern.mjs가 본다.
state.crew = 10;
ok(armsTotal() === state.guns, `포문 동기화 ${state.guns}문`);

/* 누수: 항해하면 선체가 삭는다.
   ⚠️ **`leak`는 `hulk` 고유 속성이다** — 시작배가 바다마다 갈리면서 기본 시작배(사후선)에는
   없어졌다. 그래도 이 규칙은 살아 있어야 한다: 청산하면 받는 배가 `hulk`이고
   (`BANKRUPT.keepShip`), 중고로도 잡힌다. 그래서 **그 배를 직접 태워** 검사한다. */
const leakWas = state.shipKey;
state.fleet.hulk = { at: state.at, hp: SHIPS.hulk.hp, arms: { light: SHIPS.hulk.guns, medium: 0, long: 0 }, refits: {} };
boardShip('hulk');
const hp0 = state.hp;
const c1 = advanceDays(4);
ok(c1.leak === 8 && state.hp === hp0 - 8, `누수 4일 → ${c1.leak}pt (선체 ${hp0}→${state.hp}), 급여 ${c1.wages}닢`);
boardShip(leakWas); delete state.fleet.hulk; state.hp = state.maxHp;

// 조선소 — 도시 공업력이 무엇을 지을 수 있는지 정한다
ok(industryOf('venezia') === 3 && industryOf('iznik') === 0,
   `공업력: 베네치아 ${industryOf('venezia')} · 이즈니크 ${industryOf('iznik')}(내륙)`);
ok(!sellsShip('caravel', 'iznik'), '내륙 도시(이즈니크)에서는 아무 배도 못 짓는다');
ok(sellsShip('carrack', 'venezia'), '베네치아(공업력3)는 캐랙을 짓는다');
ok(!sellsShip('carrack', 'rodos'), `로도스(공업력1)는 캐랙을 못 짓는다 — ${tierNeeded('carrack', 'rodos')} 필요`);
// 제 나라 배는 한 등급 쉽다: 갈레온(tier3)은 스페인 깃발 항구에서 공업력2로도 지어진다
ok(tierNeeded('galleon', 'napoli') === 2 && yardCapable('galleon', 'napoli'),
   `나폴리(스페인 깃발)는 갈레온 요구등급 ${tierNeeded('galleon', 'napoli')} — 제 나라 배라 한 등급 싸다`);
ok(tierNeeded('galleon', 'athens') === 3 && !yardCapable('galleon', 'athens'),
   '아테네는 갈레온 요구등급 3 — 못 짓는다');
// 전통 조선지는 값이 싸다
ok(shipPriceAt('carrack', 'genova') < shipPriceAt('carrack', 'alexandria'),
   `캐랙 값: 제노바 ${shipPriceAt('carrack', 'genova')}닢 < 알렉산드리아 ${shipPriceAt('carrack', 'alexandria')}닢`);

// 해금 — 몰아 본 배가 있어야 다음 배를 내준다
ok(shipLockedBy('galleon') === '캐랙', `갈레온은 잠겨 있다 (필요: ${shipLockedBy('galleon')})`);
ok(!sellsShip('galleon', 'barcelona'), '해금 전에는 공업력이 충분해도 못 산다');

/* ⚠️ **이 줄이 없어서 이 아래 검사들이 여덟 줄 내내 거짓말을 하고 있었다.** 라벨은 "베네치아"인데
   `state.at`은 `resetGame()`이 세운 시작 항구(부산포)였다 — 지중해 카라벨을 조선 부두에서 사면서
   그것을 「베네치아 카라벨 구입」이라 적고 통과시켰다. 교역권 사다리(`yardReach`)가 그 자리를
   막으면서 드러났다. 검사가 라벨대로 돌게 자리를 세운다. */
state.at = 'venezia';
state.gold = 60000;
let r = purchaseShip('caravel');
ok(r.ok, `베네치아 카라벨 구입 ${r.ok ? `OK (${r.cost}닢 — 정가 ${SHIPS.caravel.price})` : r.reason}`);
r = boardShip('caravel');
ok(r.ok && state.shipKey === 'caravel', `승선 → ${state.shipKey}, 최대선체 ${state.maxHp}`);

// 선단 유지비: 낡은 바사가 베네치아에 남아 있다
ok(fleetUpkeep() === SHIPS.hulk.upkeep, `선단 유지비 ${fleetUpkeep()}닢/일 (정박 중인 바사)`);
const c2 = advanceDays(3);
ok(c2.fleet === SHIPS.hulk.upkeep * 3 && c2.leak === 0, `3일 → 선단비 ${c2.fleet}닢, 누수 ${c2.leak} (카라벨은 안 샌다)`);

// 개장
state.gold = 60000;
const spd0 = shipSpeed(), cap0 = gunCap();
buyRefit('copper'); buyRefit('sails');
ok(shipSpeed() > spd0, `동판+돛 증축 → 속력 ${spd0.toFixed(2)} → ${shipSpeed().toFixed(2)}`);
const max0 = state.maxHp;
/* ★ **덧댄 만큼은 새것이다**(conquest ISSUES #23). 전에는 `maxHp`만 올라
   2,400닢을 내고 나면 배가 "231 중 185"가 됐다 — **산 직후가 가장 약한 상태**였다.
   낡은 부분은 그대로 낡아 있어야 하므로 **차액만** 채운다(전부 수리가 아니다). */
state.hp = Math.round(state.maxHp * 0.6);
const hpRefit0 = state.hp;
buyRefit('oakArmor');
ok(state.maxHp === Math.round(SHIPS.caravel.hp * 1.25 * 1), `떡갈나무 장갑 → 최대선체 ${max0} → ${state.maxHp}`);
ok(state.hp === hpRefit0 + (state.maxHp - max0),
   `덧댄 만큼은 성하다 — 선체 ${hpRefit0} → ${state.hp} (최대치가 ${state.maxHp - max0}pt 올랐다)`);
ok(state.hp < state.maxHp,
   '그래도 낡은 부분은 낡은 채다 — 개장이 수리를 대신하지 않는다');
const armsBefore = armsTotal();
const rz = buyRefit('razee');
ok(gunCap() < cap0, `레이지 개조 → 포문 상한 ${cap0} → ${gunCap()}, 뜯긴 대포 ${rz.dropped}문 (${armsBefore}→${armsTotal()})`);
ok(armsTotal() <= gunCap(), '상한 초과 대포가 남지 않았다');
ok(state.maxHp === maxHullOf('caravel', state.refits), `레이지 후 최대선체 ${state.maxHp}`);

// 개장은 배를 따라다닌다 (브리간틴은 해금이 걸리지 않은 classic 선종이라 시험대로 쓴다)
state.at = 'genova';
r = purchaseShip('brig');
ok(r.ok, `제노바 브리간틴 구입 ${r.ok ? `OK (${r.cost}닢)` : r.reason}`);
boardShip('brig');
ok(!state.refits.copper, `브리간틴으로 갈아탐 → 개장 없음(${JSON.stringify(state.refits)}), 최대선체 ${state.maxHp}`);
state.at = 'barcelona'; state.fleet.caravel.at = 'barcelona';
boardShip('caravel');
ok(state.refits.copper && state.refits.razee, `카라벨로 복귀 → 개장 복원 ${Object.keys(state.refits).join('+')}`);

// 인원 부족
state.crew = 30;
const spdFull = shipSpeed();
state.crew = 3;
ok(shorthanded() && Math.abs(shipSpeed() - spdFull * 0.75) < 1e-9,
   `선원 3명(최소 ${SHIPS.caravel.crewMin}) → 속력 ${spdFull.toFixed(2)} → ${shipSpeed().toFixed(2)} (×0.75)`);
state.crew = 30;

// 특수탄
state.gold = 5000;
const bs = buyShot('chain', 5);
ok(bs.ok && shotStock('chain') === 5, `사슬탄 5발 구입 ${bs.cost}닢 → 재고 ${shotStock('chain')}`);
useShot('chain');
ok(shotStock('chain') === 4 && shotStock('round') === Infinity, `1발 소모 → ${shotStock('chain')}발, 일반탄 무한`);
ok(!useShot('grape'), '재고 없는 포도탄은 못 쏜다');

// 나포 편입
const before = Object.keys(state.fleet).length;
const cap = captureShip('carrack');
ok(cap.ok && !cap.scrapped && state.fleet.brig, `캐랙 나포 편입 → 선단 ${before}→${Object.keys(state.fleet).length}척, 선체 ${state.fleet.brig?.hp}/${SHIPS.brig.hp}`);
const cap2 = captureShip('carrack');
ok(cap2.scrapped && cap2.gain > 0, `같은 선종 재나포 → 해체 매각 +${cap2.gain}닢`);

// 적 티어 분포
state.shipKey = 'hulk';
{
  const cnt = {};
  state.gold = 4000; state.cargo = { silk: 40 };
  for (let i = 0; i < 4000; i++) { const e = pickEnemy(); cnt[e.name] = (cnt[e.name] || 0) + 1; }
  ok(!cnt['검은 깃발단'] && !cnt['프랑스 순찰 프리깃 팡당'],
     `낡은 바사 + 자산 6400닢 → ${Object.entries(cnt).map(([k, v]) => `${k} ${(v / 40).toFixed(0)}%`).join(', ')}`);
}
state.shipKey = 'caravel'; state.cargo = {};
for (const wealth of [500, 3000, 9000, 20000, 50000]) {
  state.gold = wealth; state.cargo = {};
  const cnt = {};
  for (let i = 0; i < 4000; i++) { const e = pickEnemy(); cnt[e.name] = (cnt[e.name] || 0) + 1; }
  const s = Object.entries(cnt).map(([k, v]) => `${k} ${(v / 40).toFixed(0)}%`).join(', ');
  console.log(`      자산 ${wealth}닢 → ${s}`);
}

// 항해 일수 비교
state.shipKey = 'hulk'; state.refits = {}; state.crew = 10;
const dHulk = voyageDays('venezia', 'istanbul');
state.shipKey = 'superfrigate'; state.crew = 100;
const dSF = voyageDays('venezia', 'istanbul');
ok(dHulk > dSF, `베네치아→이스탄불: 낡은 바사 ${dHulk}일 vs 슈퍼 프리깃 ${dSF}일`);

// 적 5티어
console.log('      적:', ENEMIES.map((e) => `${e.name}(${e.nation}/HP${e.hp}/포${e.guns}${e.prize ? '/나포:' + SHIPS[e.prize].name : ''})`).join('\n           '));

/* ── 중고선 ─────────────────────────────────────────────────── */
resetGame();
state.gold = 60000;
let seen = 0, prizeCheaper = 0;
for (const cid of ['venezia', 'genova', 'tunis', 'algiers', 'iznik']) {
  for (let d = 1; d < 40; d += 3) {
    const lots = usedListings(cid, d);
    seen += lots.length;
    for (const l of lots) {
      if (l.price >= SHIPS[l.key].price) console.log(`FAIL  중고가 신조보다 비싸다: ${cid} ${SHIPS[l.key].name}`);
      if (l.hp >= SHIPS[l.key].hp) console.log(`FAIL  중고 선체가 멀쩡하다: ${cid} ${SHIPS[l.key].name}`);
      if (l.prize) prizeCheaper++;
    }
  }
}
ok(seen > 0, `중고 매물이 돈다 — 5개 항구 40일치에서 ${seen}건`);
ok(usedListings('iznik', 5).length === 0, '내륙(이즈니크)에는 중고 매물도 없다');
ok(prizeCheaper > 0, `나포선 개조항(튀니스·알제)에 매물이 걸린다 — ${prizeCheaper}건`);
{
  const a = usedListings('venezia', 9), b = usedListings('venezia', 9);
  ok(JSON.stringify(a) === JSON.stringify(b), '같은 날 다시 봐도 같은 매물이다(재입장 스캠 방지)');
}
{
  state.at = 'genova';
  const lots = usedListings('genova');
  if (lots.length) {
    const lot = lots[0];
    const r2 = buyUsed(lot.key);
    ok(r2.ok && state.fleet[lot.key]?.hp === lot.hp,
       `중고 구입 → ${SHIPS[lot.key].name} ${r2.cost}닢 (정가 ${SHIPS[lot.key].price}) · 선체 ${r2.hp}/${SHIPS[lot.key].hp}`);
    ok(state.everOwned.has(lot.key), '중고로 산 배도 해금 이력에 남는다');
  } else {
    ok(true, '제노바에 마침 매물이 없다 (건너뜀)');
  }
}

/* ── 부관 에이미 ─────────────────────────────────────────────
   등용하는 인물이 아니라 **주어진 동행**이다. 그래서 보는 것이 바뀌었다 —
   "언제 붙나"가 아니라 "처음부터 붙어 있고 절대 떨어지지 않나". */
resetGame();
ok(hasOfficer(), '시작할 때부터 부관이 타고 있다');
ok(state.officer.hiredDay === 0 && state.officer.paid === 0 && state.officer.earned === 0,
   '0일차부터 함께 — 장부는 아직 백지다');
ok(state.gold === START_GOLD, `계약금이 없다 — 시작 금화가 그대로 ${START_GOLD}닢`);

// 물 새는 배를 몰아도 떠나지 않는다 (예전엔 이 조건에서 승선을 거절했다)
const offWas = state.shipKey;
state.fleet.hulk = { at: state.at, hp: SHIPS.hulk.hp, arms: { light: SHIPS.hulk.guns, medium: 0, long: 0 }, refits: {} };
boardShip('hulk');
ok(ship().leak && hasOfficer(), '물 새는 낡은 바사를 몰아도 함께 있다');
boardShip(offWas); delete state.fleet.hulk;

// 어느 항구에 있든 붙어 있다 — 리알토에 앉아 있던 사람이 아니다
state.at = 'rodos';
ok(hasOfficer(), `${OFFICER.home} 밖(로도스)에서도 함께 있다`);
state.at = 'venezia';

// 능력은 첫날부터 걸려 있다
state.gold = 60000;
purchaseShip('cocca');
boardShip('cocca');
{
  state.impact.venezia = { silk: 200 };
  /* ★ 원값과 대는 기준을 `baseTariff × 누진`으로 바꿨다(#6). 전에는 상수 0.06과 댔는데,
     입항세에 **자산 누진**이 붙은 뒤로는 금고 60,000닢을 쥔 이 시점에 원값 자체가 6%가
     아니다 — 그래서 "부관 감면이 걸려 있다"는 검사가 부관과 무관한 이유로 실패했다.
     재는 것은 여전히 같다: **같은 자산에서 부관이 있으면 더 싸다.** */
  const bare = baseTariff('venezia') * tariffScale();
  ok(tariffRate('venezia') < bare,
     `입항세가 이미 감면돼 있다 — 같은 자산의 원값 ${(bare * 100).toFixed(2)}% → ${(tariffRate('venezia') * 100).toFixed(2)}%`);
  ok(impactFactor('venezia', 'silk', 10) < 1,
     `대량거래 벌점도 이미 완화돼 있다 (${(impactFactor('venezia', 'silk', 10) * 100).toFixed(1)}%)`);
  state.impact = {};
}

// 급여 — 벌든 못 벌든 매일 나간다(동업자이지 하인이 아니다)
{
  const paid0 = state.officer.paid;
  const c = advanceDays(5);
  ok(c.officer === OFFICER.wage * 5 && state.officer.paid === paid0 + c.officer,
     `급여 5일치 ${c.officer.toLocaleString('ko-KR')}닢이 항해 비용에 실린다 (${OFFICER.wage}닢/일)`);
  ok(c.total === c.wages + c.supplies + c.fleet + c.hull + c.arms + c.officer + c.insurance,
     '항해비는 여섯 갈래(일당·보급·선단·선체·무장·부관)와 보험료로 나뉘어 잡힌다');
  ok(c.hull > 0 && c.arms > 0,
     `선체 유지 ${c.hull}닢 · 무장 유지 ${c.arms}닢 — 배와 대포를 늘릴수록 오른다`);
}

// 성과급 — 남은 이익에서만 뗀다
{
  state.cargo = { silk: 10 };
  state.buyPrice = { silk: 60 };
  const earned0 = state.officer.earned;
  const r = sell('silk', 10);
  ok(r.ok && r.cut > 0 && state.officer.earned === earned0 + r.cut,
     `매각 이익에서 ${OFFICER.name} 몫 ${r.cut.toLocaleString('ko-KR')}닢을 뗀다 (손에 남는 이익 ${r.profit.toLocaleString('ko-KR')}닢)`);

  // 밑진 거래에서는 떼지 않는다 — 손해에 수수료까지 물면 되팔기가 막힌다
  state.cargo = { grain: 10 };
  state.buyPrice = { grain: 9999 };
  const r2 = sell('grain', 10);
  ok(r2.ok && r2.cut === 0 && r2.profit < 0, `밑진 거래에서는 몫을 떼지 않는다 (${r2.profit.toLocaleString('ko-KR')}닢)`);
}

// 내보낼 수 없다 — 해고 경로 자체가 없어야 한다
{
  ok(typeof state.officer === 'object' && state.officer !== null,
     '게임이 도는 내내 부관 자리가 비지 않는다');
  ok(state.officer.paid > 0 && state.officer.earned > 0,
     `장부에 급여 ${state.officer.paid.toLocaleString('ko-KR')} · 성과급 `
     + `${state.officer.earned.toLocaleString('ko-KR')}닢이 쌓였다`);
  // 새 판을 시작해도 다시 타고 있다
  resetGame();
  ok(hasOfficer() && state.officer.paid === 0, '새 판에서도 처음부터 함께다');
}

/* ── 항로 위험도 ─────────────────────────────────────────────
   근거(요율)가 실제로 확률에 걸리는지, 그리고 weight 합이 안 깨지는지를 본다.
   배선이 끊기면 근거를 아무리 잘 적어도 게임은 예전 그대로 돈다 — 그게 직전까지의 상태였다. */
resetGame();
{
  const safe = encounterOdds({ from: 'napoli', to: 'palermo' });   // 요율 2%
  const risky = encounterOdds({ from: 'malta', to: 'tunis' });     // 요율 9%
  ok(risky > safe * 2,
     `항로마다 위험이 다르다 — 나폴리~팔레르모 ${(safe * 100).toFixed(1)}% vs 몰타~튀니스 ${(risky * 100).toFixed(1)}%`);

  ok(encounterOdds({ from: 'bursa', to: 'iznik' }) === 0,
     '육로(부르사~이즈니크)에는 해적이 나오지 않는다');
  ok(routeRisk('istanbul', 'bursa') === null, '오스만 내해는 요율 자체가 없다');

  // 그 구간에 뜬 해적이 확률을 밀어 올린다 — pirateThreat이 드디어 쓰인다
  const base = encounterOdds({ from: 'palermo', to: 'tunis' });
  const withThreat = encounterOdds({ from: 'palermo', to: 'tunis', threat: 2 });
  ok(withThreat > base,
     `지도에 뜬 해적이 확률을 올린다 — ${(base * 100).toFixed(1)}% → ${(withThreat * 100).toFixed(1)}% (2척)`);

  // 방향이 없다
  ok(routeRisk('tunis', 'palermo') === routeRisk('palermo', 'tunis'), '항로 위험은 방향과 무관하다');
}

// weight 합 100 유지 — pirate만 올리면 나머지 이벤트가 통째로 눌린다
{
  const count = (opts, n = 40000) => {
    const t = {};
    for (let i = 0; i < n; i++) { const e = rollSeaEvent(opts); t[e.id] = (t[e.id] || 0) + 1; }
    return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v / n]));
  };
  const safe = count({ from: 'napoli', to: 'palermo' });
  const risky = count({ from: 'malta', to: 'tunis' });
  ok(Math.abs(safe.storm - risky.storm) < 0.02 && Math.abs(safe.merchant - risky.merchant) < 0.02,
     `위험한 항로에서도 폭풍·상선조우 빈도는 그대로다 (폭풍 ${(safe.storm * 100).toFixed(1)}% vs ${(risky.storm * 100).toFixed(1)}%)`);
  ok(risky.calm < safe.calm,
     `늘어난 해적은 calm에서 덜어온다 (평온 ${(safe.calm * 100).toFixed(1)}% → ${(risky.calm * 100).toFixed(1)}%)`);
  ok(Math.abs(risky.pirate - encounterOdds({ from: 'malta', to: 'tunis' })) < 0.012,
     `실제 굴림이 계산된 확률과 맞는다 (${(risky.pirate * 100).toFixed(1)}%)`);
}

// 몰타
{
  ok(CITY_BY_ID.malta && CITY_BY_ID.malta.flag === 'hospitaller', '몰타는 기사단령이다');
  // ★ 연도를 고정하지 않는다(최상위 지침). 실제로는 로도스 함락(1522)의 결과로 기사단이
  //   몰타로 옮겨가므로 둘은 배타적이지만, 콘텐츠를 덜어내지 않으려고 일부러 공존시켰다.
  //   이 테스트는 "그렇게 두기로 한 결정"을 지키는 장치다 — 누가 고증을 이유로 되돌리면 여기서 걸린다.
  ok(CITY_BY_ID.rodos.flag === 'hospitaller',
     '로도스도 기사단령으로 둔다 — 연표를 지키려고 콘텐츠를 버리지 않는다(의도적 예외)');
  /* ★ 지킬 것은 "이웃이 둘"이 아니라 **몰타를 거치지 않는 길이 살아 있다**는 것이다.
     원래 이 테스트는 이웃 수를 셌는데, 지중해를 넓히며 메시나가 들어와 셋이 되자 걸렸다 —
     메시나~몰타는 지리적으로 옳은 선이고 막을 이유가 없다. 진짜 위험은 다른 쪽이다:
     팔레르모~튀니스 직항을 끊으면 해협 물동량이 **통째로** 몰타를 지나게 되어
     곡물 흐름이 바뀌고, 몰타가 "들르는 선택지"가 아니라 관문이 된다.
     몰타의 값어치는 항로가 아니라 나포선 경매(prizeYard)에 있다. */
  ok(neighborsOf('palermo').includes('tunis'),
     '몰타를 거치지 않는 해협 직항(팔레르모~튀니스)이 살아 있다 — 몰타는 관문이 아니라 선택지다');
  ok(neighborsOf('malta').length <= 4,
     `몰타는 해협 언저리에만 이어진다 (${neighborsOf('malta').map((i) => CITY_BY_ID[i].name).join(', ')})`);
  ok(CITY_BY_ID.malta.demand.grain > 1.4, '바위섬이라 곡물 수요가 가장 높다');
}

/* ── 수직계열화 1단계 — 가공 사슬과 가공장 (A-9) ────────────────
   ★ 여기서 지키는 것은 **값이 아니라 규칙의 뼈대**다. 값(마진 밴드·산지 대조식)은
     `node tools/check-chain.mjs`가 따로 본다 — 그쪽이 밴드의 정본이다.
   ★ 「창고가 먼저다」와 「매각하면 40%가 증발한다」와 「못 내면 휴업 → 두 번이면 압류」
     셋이 이 층의 대가 전부이므로, 그 셋이 실제로 작동하는지만 확인한다. */
{
  resetGame('venezia');
  state.gold = 300000; state.crew = 10;
  const R = 'dye_scarlet';                      // 베네치아는 공업력 3이라 셋 다 지을 수 있다

  ok(!canBuyMill(R, 'venezia').ok, '창고가 없으면 가공장을 못 세운다 — 산출물을 둘 데가 먼저다');
  buyHolding('rental', 'venezia'); buyHolding('warehouse', 'venezia');
  ok(canBuyMill(R, 'venezia').ok, '창고를 세우면 가공장이 열린다');

  // 값 공식 — (9,000 + 산출 base × 80) × TIER_MUL[요구 공업력]
  ok(millPrice(R, 'venezia', 1) === 67230, `염색장(주홍) 값 ${millPrice(R, 'venezia', 1).toLocaleString('en-US')}닢 (공업력 2라 ×1.35)`);
  // 공업력이 문지기다 — 이즈니크(0)에서는 어떤 사슬도 못 돈다
  ok(millRecipes('iznik').length === 0, '내륙 도시(공업력 0)에서는 사슬이 하나도 안 열린다');

  const gold0 = state.gold;
  /* ★ 베네치아는 **베네치아 상단이 앉은 자리**라 입회비가 붙는다(A-10 2단계 · 시설값의 25%).
     「모른다」(0)에서는 침범이 아니라 입회비다 — 아무 잘못도 안 한 사람에게 문을 닫지 않는다. */
  const entryFee = Math.round(67230 * FACTION.entryFee);
  ok(buyMill(R, 'venezia').ok && state.gold === gold0 - 67230 - entryFee,
     `가공장을 세우면 그 값이 금고에서 빠진다 (67,230닢 + 임자 입회비 ${entryFee.toLocaleString('en-US')}닢)`);

  // 착수 — 투입은 **창고에서** 빠지고 가공비는 **지금** 나간다
  state.stored.venezia = { woolcloth: 20, cochineal: 10 };
  const g1 = state.gold;
  const run = runMill(R, 'venezia', millBatchCap(R, 'venezia'));
  ok(run.ok && run.batches === 10, `모직 20 + 코치닐 10 → 10회분 착수 (${run.days}일 · 가공비 ${run.fee}닢)`);
  ok(state.gold === g1 - run.fee, '가공비는 착수할 때 현금으로 나간다');
  ok(!state.stored.venezia.woolcloth && !state.stored.venezia.cochineal,
     '투입 원료는 착수하는 순간 창고에서 빠진다 (배가 아니라 창고다)');

  // 완성일 전에는 아무것도 안 나온다 — 기다리는 것이 이 시스템의 시계다
  state.day += run.days - 1;
  ok(Object.keys(collectMill('venezia')).length === 0, '완성일 전에는 수령해도 빈손이다');
  state.day += 1;
  const got = collectMill('venezia');
  ok(got.scarlet === 20, `완성일에 주홍 모직 ${got.scarlet}칸이 창고로 들어온다`);

  // 유지비 — 연 10%를 30일마다. 못 내면 휴업, 두 번 연속이면 압류.
  state.day += 30;
  const due = worksUpkeepDue('venezia');
  ok(due === Math.round(67230 * 0.10 * (30 / 360)), `30일 유지비 ${due}닢 = 들인 돈의 연 10%`);
  state.gold = 0;
  const s1 = settleWorks('venezia');
  ok(s1.idle && !s1.seized, '못 내면 곧바로 압류가 아니라 **휴업**이다');
  state.day += 30;
  ok(worksUpkeepDue('venezia') === Math.round(due * 0.5), '휴업 중에는 유지비를 절반만 문다 — 그래도 0은 아니다');
  const s2 = settleWorks('venezia');
  ok(s2.seized && !state.works.venezia, '두 번 연속 못 내면 그 항구의 시설이 넘어간다');

  // 매각 — 들인 돈의 60%. 40%는 즉시 증발한다.
  resetGame('venezia');
  state.gold = 300000;
  buyHolding('rental', 'venezia'); buyHolding('warehouse', 'venezia'); buyMill(R, 'venezia');
  const before = state.gold;
  const sold = sellMill(R, 'venezia');
  ok(sold.ok && sold.back === Math.round(67230 * 0.60) && state.gold === before + sold.back,
     `매각하면 ${sold.back.toLocaleString('en-US')}닢만 돌아온다 (들인 67,230의 60%)`);

  // ★ 패권 조건을 건드리지 않는다 — 시설은 `works`에 있고 `hegemonyOf`는 `holdings`만 센다
  ok(!('works' in (state.holdings.venezia ?? {})),
     '시설은 `state.works`에 있고 `state.holdings`에 얹히지 않는다 — 패권 조건이 안 바뀐다');
}

/* ── 바닥에는 바닥의 규칙이 있다 — 거점 유예·매각과 파산 ────────
   ★ 실플레이(supremacy ISSUES #3·#4)가 낸 두 구멍을 지킨다:
     ① 유지비 **3닢**을 못 내 2,000닢짜리 거점이 그 자리에서 압류됐다
     ② 금고 0 · 빚만 30일마다 ×1.25로 불면서 **36일이 그냥 비었다**
   여기서 보는 것은 값이 아니라 **규칙의 뼈대**다 — 유예가 있나 · 되팔 수 있나 ·
   빚에 끝이 있나 · 청산이 판을 끝내지 않나. 근거는 `data.js: HOLDING·BANKRUPT`의 주석. */
{
  // ① 거점 — 한 번은 문을 닫고, 두 번째에 넘어간다 (`settleWorks`와 같은 모양)
  resetGame('venezia');
  state.gold = 300000; state.crew = 10;
  buyHolding('rental', 'venezia');
  const spent = state.holdings.venezia.spent;
  state.day += HOLDING.upkeepEvery; state.gold = 0;
  const h1 = settleHolding('venezia');
  ok(h1.idle && !h1.seized && !!state.holdings.venezia,
     `거점도 못 내면 곧바로 압류가 아니라 **문을 닫는다** (미납 ${h1.due - h1.paid}닢)`);
  ok(!hasHolding('rental', 'venezia') && ownsHolding('rental', 'venezia'),
     '문을 닫으면 특전은 멈추고 소유는 남는다 — 유예가 공짜가 아닌 자리');
  ok(storeCap('venezia') === 0, '문을 닫은 창고에는 새로 맡길 수 없다');
  ok(holdingUpkeepDue('venezia')
       === Math.round(spent * HOLDING.upkeepRate * (HOLDING.upkeepEvery / 360) * HOLDING.idleRate),
     '문을 닫은 동안에는 유지비를 절반만 문다 — 그래도 0은 아니다');
  const idleDue = holdingUpkeepDue('venezia');
  state.gold = 5000;
  const h2 = settleHolding('venezia');
  ok(!h2.idle && hasHolding('rental', 'venezia'),
     '밀린 것을 내면 **그 자리에서** 다시 문을 연다 — 다음 청구일까지 기다리지 않는다');
  /* ★ 청구 때 3닢인데 낼 때 1닢이라는 보고(ISSUES #23)는 **어긋난 것이 아니다** —
     문을 닫은 동안에는 `HOLDING.idleRate`(절반)만 문다. 화면 문구가 그 이유를 안 적어
     같은 값이 두 자리에서 다르게 보였을 뿐이다. 검사로 박아 둔다. */
  const exact = spent * HOLDING.upkeepRate * (HOLDING.upkeepEvery / 360);
  ok(idleDue === Math.round(exact * HOLDING.idleRate) && idleDue < h1.due,
     `문을 닫으면 청구가 ${h1.due}닢 → ${idleDue}닢이 된다 — 어긋난 것이 아니라 절반(idleRate)이다`
     + ` (반올림 전 값 ${exact.toFixed(2)}에 곱한다 — 반올림한 뒤 곱하면 ${Math.round(h1.due * HOLDING.idleRate)}이 되어 어긋난다)`);

  resetGame('venezia');
  state.gold = 300000; buyHolding('rental', 'venezia');
  state.day += HOLDING.upkeepEvery; state.gold = 0; settleHolding('venezia');
  state.day += HOLDING.upkeepEvery;
  ok(settleHolding('venezia').seized && !state.holdings.venezia,
     `두 번 연속 못 내면 그때 넘어간다 (seizeAfter ${HOLDING.seizeAfter})`);

  // ② 거점 매각 — 들인 돈의 40%만 돌아온다(저금통이 되지 않게)
  resetGame('venezia');
  state.gold = 300000; buyHolding('rental', 'venezia');
  const put = state.holdings.venezia.spent, purse = state.gold;
  const sold = sellHolding('venezia');
  ok(sold.ok && sold.back === Math.round(put * HOLDING.sellBack) && state.gold === purse + sold.back,
     `거점을 되팔면 들인 ${put.toLocaleString('en-US')}의 ${Math.round(HOLDING.sellBack * 100)}%인 `
     + `${sold.back.toLocaleString('en-US')}닢만 돌아온다`);
  ok(!state.holdings.venezia && holdingsValue('venezia') === 0, '판 거점은 패권 집계에서도 빠진다');

  // ③ 빚에 끝이 있다 — 채권자가 집행하고, 배를 넘기면 셈이 끝난다
  resetGame('venezia');
  state.crew = 6; state.gold = 0;
  payFine(900, '시험');
  ok(debtOwed() > 0 && nothingLeft(),
     '금고 0 · 짐 0 · 정박선 0 · 거점 0이면 「팔 것이 하나도 없다」로 잡힌다');
  state.day += MONTH_DAYS;
  const pay1 = settlePayroll(() => 1);
  ok(pay1.enforced?.liquidated,
     '팔 것이 없으면 유예를 기다리지 않고 곧바로 집행한다 — 빈 30일을 만들지 않는다');
  ok(debtOwed() === 0 && state.shipKey === BANKRUPT.keepShip && state.gold === BANKRUPT.seedGold,
     `청산: 배를 넘기면 빚이 사라지고 ${SHIPS[BANKRUPT.keepShip].name} 한 척과 `
     + `${BANKRUPT.seedGold}닢이 남는다 (해상대차)`);
  ok(state.payroll.arrears === 0 && cargoUsed() === 0 && !state.contract,
     '체불·실은 짐·맡은 주문도 그 자리에서 정리된다 — 판은 끝나지 않는다');

  // ④ 값나가는 배를 작은 빚에 통째로 잃지 않는다 — 잉여는 돌아온다
  resetGame('venezia');
  state.crew = 10; state.gold = 500000;
  purchaseShip('carrack'); boardShip('carrack');
  // 시작배는 바다마다 다르다 — 베네치아면 타르타네다. 키를 박지 말고 지금 것을 지운다.
  for (const k of Object.keys(state.fleet)) if (k !== 'carrack') delete state.fleet[k];
  state.gold = 0;
  payFine(400, '작은 위약금');
  state.day += MONTH_DAYS;
  const pay2 = settlePayroll(() => 1);
  ok(pay2.enforced?.liquidated && pay2.enforced.surplus > resaleOf('carrack') * 0.8,
     `배를 넘기고 남은 ${pay2.enforced?.surplus?.toLocaleString('en-US')}닢이 돌아온다`
     + ` (캐랙 매각가 ${resaleOf('carrack').toLocaleString('en-US')})`);

  // ⑤ 채권자는 부동산을 못 가져간다 — 그 대신 내가 던질 수 있다
  resetGame('venezia');
  state.crew = 6; state.gold = 300000;
  buyHolding('rental', 'venezia');
  state.gold = 0;
  payFine(9000, '큰 위약금');
  for (let i = 0; i < 4 && debtOwed() > 0; i++) { state.day += MONTH_DAYS; settlePayroll(() => 1); }
  ok(!!state.holdings.venezia,
     '청산해도 거점은 남는다 — 해상대차의 담보는 **배와 화물**이지 부동산이 아니다');

  // ⑥ 기한을 넘긴 위약금도 빚으로 남는다 (스스로 파기한 것과 같은 취급)
  /* ⚠️ **항구를 하나로 못박으면 그날 일감이 이 배로 못 싣는 크기일 때 검사가 통째로 죽는다.**
     회차 27에 `state.js: hash()`를 고쳐 난수가 다시 뽑히자 베네치아 1일차 일감이 곡물 50개가
     됐고(낡은 바사 선복 42칸) 이 줄이 `state.contract` null로 러너를 통째로 세웠다.
     **규칙은 멀쩡했다** — 테스트가 특정 난수에 기대고 있었던 것이다(제안 3,710건 중 못 싣는 것
     0.8%는 `CONTRACT.qtyCap`이 만드는 의도된 값이다). ⇒ 실을 수 있는 일감이 나오는 첫 항구를 쓴다. */
  let cport = 'venezia';
  for (const cid of ['venezia', 'genova', 'napoli', 'marseille', 'barcelona', 'palermo']) {
    resetGame(cid);
    state.crew = 6; state.gold = 0;
    acceptContract();
    if (state.contract) { cport = cid; break; }
  }
  const adv = state.contract?.advance ?? 0;
  state.gold = 0;
  if (state.contract) {
    state.day = state.contract.due + 1;
    advanceDays(1, { from: cport, to: cport });
  }
  ok(adv === 0 || debtOwed() > 0,
     '기한을 넘긴 위약금도 증발하지 않고 빚으로 남는다 — 자진 파기와 같은 취급');
}

/* ── 바닥에서 나가는 문을 화면이 말한다 (C-17) ──────────────────
   ★ 규칙은 진작 다 있었고 없던 것은 **안내**였다. 그래서 여기서 재는 것은
     *팔 수 있나*가 아니라 **화면이 적을 값이 실제와 맞나**다 —
     안내가 적은 값과 눌렀을 때 들어오는 값이 다르면 그 안내는 거짓말이다. */
{
  resetGame('venezia');
  state.crew = 8; state.gold = 300000;

  // ① 미리보기(`sellNet`)와 실제 매각액이 **한 닢도 안 갈린다**
  buy('grain', 20);
  const pre = sellNet('grain', cargoUsed());
  const purse0 = state.gold;
  const sr = sell('grain', 999);
  ok(sr.ok && state.gold - purse0 === pre,
     `팔기 전에 적은 ${pre.toLocaleString('en-US')}닢이 그대로 들어온다`
     + ` — 세·성과급·동료 몫·선원 사무역까지 뺀 값(실제 ${(state.gold - purse0).toLocaleString('en-US')})`);

  // ② 「지금 팔 수 있는 것」이 짐·정박선·거점을 다 센다
  resetGame('venezia');
  state.crew = 8; state.gold = 300000;
  buy('grain', 10);
  purchaseShip('cog');                      // 정박선 한 척
  buyHolding('rental', 'venezia');
  const rows = salvage('venezia');
  const kinds = new Set(rows.map((r) => r.kind));
  ok(kinds.has('cargo') && kinds.has('ship') && kinds.has('holding'),
     `바닥 안내가 갈래를 다 센다 — ${[...kinds].join('·')} (${rows.length}줄)`);
  ok(rows.every((r, i) => i === 0 || rows[i - 1].gold >= r.gold),
     '값이 큰 것부터 나온다 — 무엇을 먼저 던질지가 곧 판단이다');
  ok(salvageValue('venezia') === rows.reduce((a, r) => a + r.gold, 0),
     `다 팔면 ${salvageValue('venezia').toLocaleString('en-US')}닢 — 합이 줄과 맞는다`);

  // ③ **정박한 배는 그 항구에서만** 줄이 된다 — 남의 항구 배를 팔라고 하면 안내가 거짓이 된다
  state.fleet.cog.at = 'genova';
  ok(!salvage('venezia').some((r) => r.kind === 'ship'),
     '다른 항구에 둔 배는 여기 줄에 안 나온다 (`sellShip`이 거절하는 것과 같은 판정)');

  // ④ 「팔 것이 하나도 없다」와 `nothingLeft()`가 같은 자리를 가리킨다
  resetGame('venezia');
  state.crew = 6; state.gold = 0;
  ok(nothingLeft() && salvage('venezia').length === 0,
     '팔 것이 없으면 안내도 빈 목록이다 — 둘이 어긋나면 없는 문을 가리키게 된다');

  // ⑤ 「여기서 가장 싼 항차」가 실제 항해비와 같다
  resetGame('venezia');
  state.crew = 10;
  const cheap = cheapestExit('venezia');
  const each = neighborsOf('venezia')
    .map((to) => voyageCost(voyageDays('venezia', to), state.crew, { from: 'venezia', to }).total);
  ok(cheap === Math.min(...each),
     `여기서 가장 싼 항차 ${cheap.toLocaleString('en-US')}닢 — 이웃 ${each.length}곳 중 최솟값과 같다`);
}

/* ── C-17 ② · **판정을 화면에서 규칙으로 올렸다**(회차 23) ────────────
   `scenes/port.js: salvageCard()`가 하던 판정(stranded·drowning·covered·다른 항구)을
   `recoveryOptions()`가 대신 한다. 여기서 재는 것은 **그 판정이 화면과 같은 답을 내는가**와
   ★ **벌칙이 한 칸도 무르지 않았는가**다 — 사용자 결정이 *"파산의 긴장은 남긴다"*이고
   하한 보장(`ENCOUNTER_LOSS.keepAfloat`)은 채택되지 않았다. 이 함수는 **읽기만** 한다. */
{
  // ① 안내는 판을 한 칸도 안 바꾼다 — 순수 판정이어야 매 프레임 불러도 안전하다
  resetGame('venezia');
  state.crew = 8; state.gold = 300000;
  buy('grain', 10); purchaseShip('cog'); buyHolding('rental', 'venezia');
  const snap = JSON.stringify({ g: state.gold, c: state.cargo, f: state.fleet, h: state.holdings, d: state.day });
  const r0 = recoveryOptions('venezia');
  ok(JSON.stringify({ g: state.gold, c: state.cargo, f: state.fleet, h: state.holdings, d: state.day }) === snap,
     '회복 안내는 판을 한 칸도 안 바꾼다 — 벌칙을 무르게 하는 것이 아니라 말해 주는 것뿐이다');

  // ② `here`가 `salvage()`와 같은 표다 — 두 표가 갈리면 화면이 없는 값을 적는다
  ok(r0.hereValue === salvageValue('venezia') && r0.here.length === salvage('venezia').length,
     `여기서 팔 것 ${r0.hereValue.toLocaleString('en-US')}닢 — salvage()와 같은 표를 쓴다`);

  // ③ 부자는 안내가 안 뜬다 — 짐을 실을 때마다 경보가 뜨면 진짜 바닥에서 아무도 안 읽는다
  ok(!r0.needsHelp && r0.covered && !r0.stuck,
     '금고 30만 닢에는 안내가 안 뜬다 (경보 피로를 만들지 않는다)');

  // ④ **다른 항구에 남은 것을 「어디에 얼마」까지 말한다** — 세기만 하면 스스로 세계를 뒤져야 한다
  state.fleet.cog.at = 'genova';
  state.gold = 3;
  const r1 = recoveryOptions('venezia');
  const far = r1.elsewhere.find((e) => e.city === 'genova');
  ok(r1.stranded && far && far.ships === 1 && far.gold === resaleOf('cog'),
     `여기선 못 뜨는데 ${far?.name}에 ${far?.gold.toLocaleString('en-US')}닢어치가 있다`
     + `${far?.days != null ? ` (${far.days}일)` : ''} — 값이 sellShip과 같은 재판매가다`);
  ok(!r1.here.some((x) => x.kind === 'ship'),
     '그 배는 `here`에는 안 담긴다 — 오늘 팔 수 있는 것과 가야 팔 수 있는 것을 가른다');

  // ⑤ 문은 **언제나 다 보인다** — 청산을 감추면 "다 떨어진 뒤에야 아는 문"이 되어 C-17이 재발한다
  /* ⚠️ 회차 27에 계약 선금이 문으로 늘었다(화면이 그 문을 못 가리키고 있었다).
     ★ 화면은 `kind`로 찾는다 — **개수나 순서로 읽지 않는다**(문이 또 늘면 그 화면이 죽는다). */
  const kinds = r1.doors.map((d) => d.kind);
  ok(kinds.join(',') === 'sell,loan,advance,liquidate' && r1.doors.at(-1).ok === true,
     '문은 넷(팔기·빌리기·**계약 선금**·청산)이고 **청산은 팔 것이 남아 있어도 보인다**');

  // ⑥ **대금업자는 주입받는다** — `figuresAt`은 world.js라 state가 부를 수 없다(모듈 방향)
  ok(recoveryOptions('venezia').doors[1].ok === null,
     '안 주면 대금업 문은 `null`(모른다) — state는 world를 모른다(순환 참조 방지)');
  ok(recoveryOptions('venezia', { lender: null }).doors[1].ok === false
     && recoveryOptions('venezia', { lender: { name: '아무개' } }).doors[1].ok === true,
     '주면 그 답을 그대로 쓴다 — 화면이 `figuresAt()`으로 채운다');

  // ⑦ 바닥 — `stuck`이 `nothingLeft()`와 같은 자리를 가리킨다
  resetGame('venezia');
  state.crew = 6; state.gold = 0;
  const r2 = recoveryOptions('venezia');
  ok(r2.stuck === nothingLeft() && r2.stuck && r2.grave && r2.doors[0].ok === false,
     '팔 것이 세계 어디에도 없으면 `stuck` — 남은 문은 빚과 청산뿐이라고 말한다');
}

/* ── 패권이 화면에서 말을 안 하던 자리 둘 (A-8c) ────────────────
   규칙은 그대로다. 잰 것은 **화면이 읽을 값이 실제 규칙과 같은가**뿐이다. */
{
  // ① 조건 ③의 자산 하한 — 화면이 적을 표가 `pickEnemy`가 쓰는 표와 같은가
  resetGame('venezia');
  state.crew = 12; state.gold = 300000;
  purchaseShip('carrack'); boardShip('carrack');
  state.gold = 1000;
  ok(foeOdds()[HEGEMONY.bossTier - 1] === 0,
     `가난하면 등급 ${HEGEMONY.bossTier}는 확률이 0이다 — "세지면"이 아니라 "부자가 되어야" 열린다`);
  const gate = foeWealthGate(HEGEMONY.bossTier);
  state.gold = gate;
  ok(foeOdds()[HEGEMONY.bossTier - 1] > 0,
     `문턱 ${gate.toLocaleString('en-US')}닢을 넘기면 붙기 시작한다`
     + ` (${Math.round(foeOdds()[HEGEMONY.bossTier - 1] * 100)}%)`);
  ok(foeWealth() === state.gold + cargoUsed() * 60,
     '화면이 적는 자산은 `금고 + 실은 짐`이다 — `pickEnemy`가 재는 것과 같은 값');
  /* 표가 규칙과 갈리지 않나 — 같은 난수로 `pickEnemy`를 굴려 표대로 나오는지 본다 */
  {
    const t = foeOdds();
    let acc = 0; const cuts = t.map((v) => (acc += v));
    const hit = pickEnemy(() => cuts[HEGEMONY.bossTier - 1] - 1e-9, 'mediterranean');
    ok(!!hit, `표의 마지막 칸을 겨냥한 난수가 실제로 적을 낸다 — 표와 \`pickEnemy\`가 한 몸이다`);
  }
  // 삭은 배는 아예 안 붙는다 — 화면이 그 말을 따로 한다
  ok(foeOdds(999999, 'hulk')[HEGEMONY.bossTier - 1] === 0,
     '삭은 배로는 아무리 부자여도 두목이 안 붙는다 — 배부터 갈아야 한다');

  // ② 거점을 잃으면 패권이 되돌아간다 — 그것을 항해일지가 적는가
  resetGame('venezia');
  state.crew = 6; state.gold = 300000;
  buyHolding('rental', 'venezia');
  const had = hegemonyOf('mediterranean').ports.have;
  const n0 = state.log.length;
  sellHolding('venezia');
  const said = state.log.slice(0, state.log.length - n0)
    .some((l) => l.text.includes('패권이 되돌아갔다'));
  ok(had === 1 && hegemonyOf('mediterranean').ports.have === 0 && said,
     '거점을 넘기면 **패권이 되돌아갔다고 항해일지가 적는다** — 전에는 아무 말이 없었다');

  // 압류(유지비 두 번 체납)도 같은 줄을 낸다
  resetGame('venezia');
  state.gold = 300000; buyHolding('rental', 'venezia');
  state.day += HOLDING.upkeepEvery; state.gold = 0; settleHolding('venezia');
  state.day += HOLDING.upkeepEvery;
  const n1 = state.log.length;
  settleHolding('venezia');
  ok(state.log.slice(0, state.log.length - n1).some((l) => l.text.includes('패권이 되돌아갔다')),
     '압류로 잃어도 같은 줄이 뜬다 — 잃는 자리가 둘인데 한쪽만 말하면 반쪽이다');
}

/* ── 급여일에 선택이 있다 (C-8) ─────────────────────────────────
   ★ 새 규칙(유예 제도)을 만들지 않았다. 바뀐 것은 **얼마를 주느냐** 한 인자뿐이고
     벌칙은 그대로다 — 덜 주면 그만큼 정확히 더 아프다. */
{
  // ① 「이번 달은 미룬다」 — 금고가 있어도 한 푼도 안 준다
  resetGame('venezia');
  state.crew = 10; state.gold = 5000;
  state.payroll.due = 900; state.payroll.nextDue = state.day;
  const before = state.gold;
  const r = settlePayroll(() => 1, { pay: 0 });
  ok(r.paid === 0 && r.missed === 900 && state.gold === before,
     '「미룬다」는 금고를 열지 않는다 — 5,000닢을 쥔 채 900닢이 그대로 체불로 남는다');
  ok(state.payroll.arrears === 900,
     '안 준 몫은 밀린 삯이 된다 — 사라지지도, 깎이지도 않는다');

  // ② 벌칙은 그대로다 — 다 주면 불만이 안 오르고, 안 주면 오른다
  resetGame('venezia');
  state.crew = 10; state.gold = 5000;
  state.payroll.due = 900; state.payroll.nextDue = state.day;
  state.bands = [{ name: '시험 무리', n: 10, trait: 'steady', wage: 3, unrest: 0.2 }];
  const calm0 = state.bands.reduce((a, b) => a + (b.unrest || 0), 0);
  settlePayroll(() => 1);                     // 인자를 안 주면 예전 그대로 = 다 준다
  const calm1 = state.bands.reduce((a, b) => a + (b.unrest || 0), 0);
  resetGame('venezia');
  state.crew = 10; state.gold = 5000;
  state.payroll.due = 900; state.payroll.nextDue = state.day;
  state.bands = [{ name: '시험 무리', n: 10, trait: 'steady', wage: 3, unrest: 0.2 }];
  settlePayroll(() => 1, { pay: 0 });
  const cross = state.bands.reduce((a, b) => a + (b.unrest || 0), 0);
  ok(calm1 <= calm0 && cross > calm1,
     `안 주면 그만큼 더 아프다 — 불만 ${calm1.toFixed(2)}(다 줌) vs ${cross.toFixed(2)}(안 줌)`);

  // ③ 인자를 안 주면 **한 줄도 안 바뀐 예전 그대로**여야 한다(기존 판이 흔들리면 안 된다)
  resetGame('venezia');
  state.crew = 10; state.gold = 400;
  state.payroll.due = 900; state.payroll.nextDue = state.day;
  const r3 = settlePayroll(() => 1);
  ok(r3.paid === 400 && r3.missed === 500 && state.gold === 0,
     '인자를 안 주면 예전대로 「낼 수 있는 만큼」이다 — 기본 동작은 안 건드렸다');
}

/* ── 삭은 배에도 값이 붙는다 (C-13 · supremacy ISSUES #9) ────────
   ★ 선체 1/55로 열여섯 항차를 뛰어도 잃는 것이 없었다 — 경고 문장이 거짓이었다.
     막지 않고 **값을 물리는** 두 갈래로 세운다(근거 `data.js: HULL`). */
{
  resetGame('venezia');
  state.crew = 12; state.gold = 200000;
  ok(hullFactor() === 1, '멀쩡한 배는 속력 벌점이 없다');
  const far0 = voyageDays('venezia', 'istanbul');
  state.hp = Math.round(state.maxHp * (HULL.slowAt - 0.05));
  ok(hullFactor() === HULL.slowMul, `선체가 ${Math.round(HULL.slowAt * 100)}% 밑이면 느려진다 (×${HULL.slowMul})`);
  state.hp = 1;
  ok(hullFactor() === HULL.crawlMul, `더 밑이면 더 느려진다 (×${HULL.crawlMul})`);
  const far1 = voyageDays('venezia', 'istanbul');
  ok(far1 > far0, `삭은 배로는 먼 길이 길어진다 (${far0}일 → ${far1}일) — 삯·보급이 그만큼 는다`);

  /* ★ **짧은 항로는 안 막힌다.** 실플레이가 금고 0 · 선체 1에서 1일 항로 열여섯 항차로
     빠져나왔다(ISSUES #14). 그 탈출구를 닫으면 고친 것이 아니라 새 데드락이다. */
  const near = neighborsOf('venezia').map((to) => voyageDays('venezia', to));
  ok(Math.min(...near) >= 1, '가장 짧은 항로는 여전히 다닐 수 있다 — 항구에 갇히지 않는다');

  // 물이 스민다 — 값싼 것부터
  resetGame('venezia');
  state.crew = 12; state.gold = 200000;
  state.hp = Math.max(1, Math.round(state.maxHp * (HULL.soakAt - 0.05)));
  buy('grain', 40); buy('silk', 4);
  const before = state.cargo.grain;
  const soak = soakCargo(4);
  ok(soak && soak.lost.grain > 0 && !soak.lost.silk,
     `선창에 물이 들면 **값싼 것부터** 상한다 (곡물 ${before}→${state.cargo.grain} · 비단은 그대로)`);
  resetGame('venezia');
  state.crew = 12; state.gold = 200000; buy('grain', 40);
  ok(soakCargo(4) === null, '멀쩡한 배는 짐이 안 젖는다');
}

/* ── 명부를 찾아갈 수 있다 (SPEC-supremacy §1-3 · ISSUES #12) ────
   ★ 984 게임일에 명부 조우 0회였다. 강하게 두되 **고를 수 있게** 한다 —
     해적을 약하게 만드는 것이 아니라 만날 길을 여는 것이다. */
{
  resetGame('busanpo');
  state.crew = 12; state.gold = 400000;
  const open = rosterOpenIn('eastasia');
  const wang = open.find((d) => d.id === 'wangzhi');
  ok(!!wang && wang.hunt?.length, `명부에 사냥터가 적혀 있다 (${wang?.name} · 구간 ${wang?.hunt?.length}개)`);
  /* 하한도 **그자의 현상금**에 묶인다(P6-4) — 고정 200닢이던 시절 그 값이 세기 1의 현상금
     하한보다 비싸 사다리의 첫 칸이 마이너스였다. */
  ok(bountyTipPrice(wang) === Math.max(ROSTER.tipFloorAbs,
                                       Math.round(wang.bounty[0] * ROSTER.bountyFloorRate),
                                       Math.round(wang.bounty[1] * ROSTER.tipRate)),
     `소식 값은 현상금에서 나온다 (${bountyTipPrice(wang).toLocaleString('en-US')}닢)`);
  ok(huntedOnLeg('hirado', 'shuangyu') === null, '소식을 사기 전에는 그자를 찾아갈 수 없다 — 지금까지의 규칙 그대로');
  const tip = buyBountyTip(wang);
  ok(tip.ok && activeBounty()?.id === 'wangzhi', '소식을 사면 그자를 쫓는다');
  const met = huntedOnLeg('hirado', 'shuangyu');
  ok(met?.defId === 'wangzhi' && met.shipKey === wang.ship,
     '그 구간으로 나가면 **그자가** 온다 (제 배를 타고 · 현상금째로)');
  ok(huntedOnLeg('busanpo', 'naeipo') === null, '엉뚱한 구간에서는 안 나온다 — 조우 확률은 안 건드린다');
  ok(met.strength === wang.strength && met.bounty === wang.bounty,
     `세기와 현상금은 명부 그대로다 (세기 ${met.strength}) — 찾아갈 수 있게 했을 뿐 약하게 만들지 않았다`);

  // 초무 — 소굴에서만, 격파보다 비싸게
  ok(!tamePirate(wang, 'busanpo').ok, '소굴이 아닌 곳에서는 초무가 안 된다');
  ok(tamePrice(wang) > wang.bounty[1], `초무는 격파보다 비싸다 (${tamePrice(wang).toLocaleString('en-US')}닢 지출 : 현상금 ${wang.bounty[1].toLocaleString('en-US')}닢 수입)`);
  const t = tamePirate(wang, 'hirado');
  ok(t.ok && state.tamed.wangzhi > 0, '소굴에서 값을 치르면 명부가 닫힌다 — 이길 필요가 없다');
  ok(huntedOnLeg('hirado', 'shuangyu') === null && !rosterOpenIn('eastasia').some((d) => d.id === 'wangzhi'),
     '닫힌 이름은 다시 안 뜬다 (격파와 같은 무게)');
  resetGame('busanpo');
  ok(!state.tamed.wangzhi, '새 판은 초무 기록을 물려받지 않는다 — `slain`과 같은 규약');
}

/* ── 시작 항구가 곧 아는 항구다 (ISSUES #10) ──────────────────── */
{
  resetGame('busanpo');
  ok(state.known.has('busanpo') && !state.known.has('venezia'),
     '부산포에서 시작하면 `known`에 부산포가 들어간다 — 가 본 적 없는 베네치아가 안 박힌다');
}

/* ── 초무는 「지우는 것」이 아니라 「내 편으로 만드는 것」 (ISSUES #26 · P6-4) ────
   ★ 920닢을 치르고 *"이제 우리 배는 건드리지 않는다"*를 받았는데 39일 뒤 그자와 싸워 나포했다 —
     `tamed`와 `slain`이 **둘 다 박혔다.** 고칠 자리는 「그자를 지우는 것」이 아니라
     **「그자가 내 배를 안 건드리는 것」**이었다: 지워 봐야 정원이 안 줄어 `standIn`이 얼굴 없는 배로
     그 자리를 채우므로 **바다가 하나도 안 안전해진다.**
   ★ 사료가 그 답을 명부 `blurb`에 이미 적어 뒀다 — 정지룡은 관군이 되어 **다른 해적을 소탕했고**,
     무라카미 수군은 **과소기(過所旗)**를 주고 안전 통행을 보장했다. **둘 다 일해 준 사람이다.** */
{
  resetGame('sakai');
  state.gold = 500000; state.crew = 10;
  initWorld();
  const def = rosterOpenIn('eastasia').find((d) => d.id === 'murakami');
  const wang = rosterOpenIn('eastasia').find((d) => d.id === 'wangzhi');
  const odds0 = encounterOdds({ from: 'sakai', to: 'hirado' });
  const tip0 = bountyTipPrice(wang);
  state.npcs.push({ id: 9999, kind: 'pirate', defId: def.id, name: def.name, shipKey: def.ship,
                    at: 'sakai', to: 'hirado', gold: 1000, cargo: {}, hp: 90,
                    strength: def.strength, bounty: def.bounty });
  state.at = def.base;
  ok(tamePirate(def, def.base).ok, `소굴에서 초무한다 (${tamePrice(def).toLocaleString('en-US')}닢)`);

  ok(state.npcs.some((n) => n.defId === 'murakami'),
     '**그자는 바다에 남는다** — 초무는 사라지게 하는 것이 아니라 내 편으로 만드는 것이다');
  ok(!npcsOnLeg('sakai', 'hirado', 'pirate').some((n) => n.defId === 'murakami' && !rosterClosed(n.defId)),
     '**다만 내 배는 안 건드린다** — 산 약속이 지켜진다 (ISSUES #26)');

  const odds1 = encounterOdds({ from: 'sakai', to: 'hirado' });
  ok(Math.abs(odds1 / odds0 - (1 - ROSTER.passOddsOff)) < 1e-6,
     `과소기 — 그 바다 조우가 ${(odds0 * 100).toFixed(1)}% → ${(odds1 * 100).toFixed(1)}%`
     + ` (초무 1명당 −${Math.round(ROSTER.passOddsOff * 100)}% 상대감소)`);
  ok(bountyTipPrice(wang) === Math.round(tip0 * (1 - ROSTER.tipOffPer)),
     `토벌 협조 — 남은 명부의 소식값이 ${tip0} → ${bountyTipPrice(wang)}닢`
     + ' (그자가 동료의 소재를 안다)');
  ok(Math.abs(encounterOdds({ from: 'venezia', to: 'napoli' })
              - (() => { const t = state.tamed; state.tamed = {}; const v = encounterOdds({ from: 'venezia', to: 'napoli' }); state.tamed = t; return v; })()) < 1e-9,
     '다른 바다는 그대로다 — 과소기는 **그 권역에 매인다**');

  state.day += (ROSTER.tameGraceDays ?? 180) + 1;
  ok(tamedIn('eastasia') === 0,
     `거점이 없으면 ${ROSTER.tameGraceDays}일 뒤 식는다 — 과소기는 갱신하는 것이었다`);
  buyHolding('rental', 'sakai');
  ok(tamedIn('eastasia') === 1, '그 바다에 거점을 세우면 다시 산다 — 이름을 대 줄 자리가 생긴다');
  ok(!!state.tamed.murakami, '식어도 명부는 닫힌 채다 — 값을 치른 것은 사라지지 않는다');
}

/* ── P5 초행 정보 — 임차창고가 값을 알려 준다 ────────────────────
   ★ 실클릭 테스터가 *"처음 가는 항구는 시세를 알 방법이 없어 초행이 늘 손해"*라고 적었다
     (conquest ISSUES #16 · 8항차 23일에 6,661 → 5,448닢). **보너스가 아니라 정보**다 —
     차익 자체는 한 톨도 안 바뀐다. 근거는 `data.js: HOLDINGS.rental`의 주석. */
{
  resetGame('busanpo');
  ok(state.known.has('busanpo') && state.known.size === 1 && Object.keys(state.scouted).length > 0,
     `부두에 서 있으면 이웃 소문은 들린다 — 들른 곳 ${state.known.size} · 소문으로 아는 곳 ${Object.keys(state.scouted).length}`);
  ok(metFactions().length === 0,
     '소문은 세력을 만난 것이 아니다 — `known`과 `scouted`를 갈라 두는 이유');
  const far = CITIES.find((c) => !priceKnown(c.id));
  ok(!priceKnown(far.id), `아직 못 들은 항구는 값을 모른다 (${far.name})`);

  state.gold = 300000;
  buyHolding('rental', far.id);
  ok(holdingTip(far.id) && priceKnown(far.id),
     '임차창고가 선 항구는 그 값이 내게 온다 — 팩토리아의 첫 값어치가 가격 정보였다');
  state.holdings[far.id].idle = true;
  ok(!priceKnown(far.id), '문을 닫으면 소식도 끊긴다 — 유예가 공짜가 아닌 자리');

  resetGame('venezia');
  const nb = neighborsOf('venezia').find((id) => !state.known.has(id));
  const r = knowPort(nb);
  ok(state.known.has(nb) && !state.scouted[nb] && r.opened.every((id) => !state.known.has(id) && state.scouted[id]),
     `닿으면 그곳은 「들른 곳」이 되고 가까운 이웃 ${r.opened.length}곳은 「소문」이 된다`
     + ` (HOLDING.scoutNeighbors ${HOLDING.scoutNeighbors})`);
}

/* ── P2 선단이 「한 척으로는 못 하는 일」을 갖는다 ────────────────
   ★ 실측에서 동행 8척은 하루 +733닢을 먹고 적재 200→1,588칸이 **전부 무용**이었다.
     ⚠️ **적재 배수는 주지 않는다**(161칸 천장 유지 = 사용자 요구 ⑤). 대신 입장권 셋. */
{
  // ⓐ 원양은 혼자 못 간다 (사료: 1561년 이후 카레라의 함대 편성 의무)
  resetGame('sevilla');
  state.gold = 1e7; state.crew = 10;
  purchaseShip('galleon'); boardShip('galleon');
  while (shorthanded()) if (!hire(1).ok) break;
  ok(escortNeed('sevilla', 'havana') === 2 && routeRisk('sevilla', 'havana') > 8.5,
     `요율이 높은 원양은 동행 ${escortNeed('sevilla', 'havana')}척을 요구한다 (세비야~아바나 risk ${routeRisk('sevilla', 'havana')})`);
  ok(!oceanReady('havana').ok, '동행이 없으면 그 바다를 못 건넌다 — 항로를 막는 것이 아니라 조건을 붙인 것이다');
  const near = neighborsOf('sevilla')[0];
  ok(oceanReady(near).ok && escortNeed('sevilla', near) === 0,
     '근해는 그대로 열려 있다 — 막으면 항구에 갇힌다');

  // ⓒ 선단이 보험료를 깎는다
  for (const k of ['carrack', 'fluyt']) {
    const sh = SHIPS[k];
    state.fleet[k] = { at: state.at, hp: sh.hp, arms: { light: sh.guns, medium: 0, long: 0 }, refits: {} };
    state.consorts[k] = { crew: sh.crewMin, captain: null };
  }
  ok(oceanReady('havana').ok, '동행 둘을 채우면 건널 수 있다');
  ok(Math.abs(convoyInsureOff() - 2 * FLEET.insureOffPer) < 1e-9,
     `동행 2척이면 보험료를 ${Math.round(convoyInsureOff() * 100)}% 깎는다 (척당 ${Math.round(FLEET.insureOffPer * 100)}%)`);
  for (let i = 0; i < 12; i++) {
    const k = Object.keys(SHIPS)[i + 20];
    if (!k || state.consorts[k] || consortCount() >= 20) continue;
    state.consorts[k] = { crew: 1, captain: null };
  }
  ok(convoyInsureOff() <= FLEET.insureOffCap + 1e-9,
     `아무리 많아도 ${Math.round(FLEET.insureOffCap * 100)}%까지다 — 깎아 주되 본전은 아니다`);

  // ⓑ 계약 수량이 선복을 따라 큰다 — 다만 **배수는 아니다**
  resetGame('sevilla');
  state.gold = 1e7; state.crew = 10;
  purchaseShip('galleon'); boardShip('galleon');
  /* ★ 한 장으로 재면 품목이 바뀌며 튄다 — **게시판 여러 장의 중앙값**으로 본다.
     지켜야 하는 선은 하나다: **보수 배수 < 적재 배수.** 넘으면 「동행이 곧 계약 배수」가 된다. */
  const ratios = [];
  for (let d = 1; d <= 60; d++) {
    resetGame('sevilla');
    state.gold = 1e7; state.crew = 10;
    purchaseShip('galleon'); boardShip('galleon');
    const a = contractOffer('sevilla', d);
    const sh2 = SHIPS.indiaman;
    state.fleet.indiaman = { at: state.at, hp: sh2.hp, arms: { light: sh2.guns, medium: 0, long: 0 }, refits: {} };
    state.consorts.indiaman = { crew: sh2.crewMin, captain: null };
    ratios.push(contractOffer('sevilla', d).pay / Math.max(1, a.pay));
  }
  ratios.sort((a, b) => a - b);
  const payRatio = ratios[Math.floor(ratios.length / 2)];
  const holdRatio = (200 + 320) / 200;                        // 적재는 2.6배
  ok(payRatio > 1.05 && payRatio < holdRatio,
     `동행이 계약을 키우되 **배수는 아니다** — 적재 ×${holdRatio.toFixed(2)}에 보수 ×${payRatio.toFixed(2)}`
     + ` (consortHold ${CONTRACT.consortHold})`);
}

/* ── C-3 · 받는 순간 실패가 확정된 일감이 없어야 한다 ─────────────────
   ★ 기한을 **직선거리**로 재고 있었다. 이웃끼리는 직선이 곧 항로지만 목적지는 2홉까지 뽑고,
     권역이 다르면 좌표계 자체가 달라 직선이 뜻을 잃는다 — 바르셀로나→아바나가 직선 13일인데
     실제 길은 75일이었다. 실측 530건 중 **38건(7.2%)이 도착 불가능**이었다.
   ★ 검사는 `hopDays`를 안 쓰고 **직접 다익스트라를 돌린다** — 검사기가 검사 대상의 함수로
     자기를 검사하면 둘이 함께 틀렸을 때 통과한다(`check-routes`가 계절에서 배운 자리). */
{
  resetGame('busanpo');
  const minDays = (a, b, day, maxHops = 4) => {
    if (a === b) return 0;
    const best = new Map([[a, 0]]);
    let front = [a];
    for (let h = 0; h < maxHops; h++) {
      const nx = new Set();
      for (const c of front) for (const n of neighborsOf(c)) {
        const dd = best.get(c) + voyageDays(c, n, day);
        if (best.has(n) && best.get(n) <= dd) continue;
        best.set(n, dd); nx.add(n);
      }
      front = [...nx];
    }
    return best.has(b) ? best.get(b) : null;
  };
  let bad = 0, seen = 0, worst = null;
  for (const c of CITIES) {
    for (let k = 0; k < 2; k++) {
      const day = 1 + k * 3;
      const o = contractOffer(c.id, day);
      if (!o) continue;
      seen++;
      const need = minDays(o.from, o.to, day);
      if (need == null) continue;
      const room = o.due - day;
      if (need > room) { bad++; if (!worst || need - room > worst.gap) worst = { o, need, room, gap: need - room }; }
    }
  }
  ok(bad === 0, `기한 안에 못 가는 일감이 없다 — 표본 ${seen}건 중 ${bad}건`
     + (worst ? ` (가장 나쁜 것 ${worst.o.from}→${worst.o.to} 실제 ${Math.round(worst.need)}일 vs 기한 ${worst.room}일)` : ''));
}

/* ── A-9 2단계 · 농장과 광산 ──────────────────────────────────────────
   ★ **여기서 처음 곡선이 움직인다.** 밭이 원료를 원가로 대 줄 때 사슬이 남기 시작한다.
   ★ 그리고 `costFor`가 **두 구간**을 갖게 됐다 — `buy()`의 이분 탐색은 단조 증가를
     전제하므로, 그것을 사람 눈으로 믿지 않고 여기서 매번 확인한다. */
{
  resetGame('venezia');
  state.at = 'funchal'; state.gold = 1e7;
  state.holdings = { funchal: { rental: true, warehouse: true } };
  ok(growKind('cane') === 'farm' && growKind('silverore') === 'mine' && growKind('silk') === null,
     '무엇이 밭에서 나는지는 `GOODS[].kind`가 정한다 — 「은광석 농장」이 안 지어진다');
  ok(!canBuyGrow('silk', 'funchal').ok, '푼샬에서 안 나는 것은 밭을 못 세운다');
  const b = buyGrow('cane', 'funchal');
  ok(b.ok && b.kind === 'farm', `사탕수수 농장을 세웠다 (−${b.price?.toLocaleString('ko-KR')}닢)`);
  ok(growStock('cane', 'funchal') === 0, '세운 날은 밭이 비어 있다');
  state.day += 30;
  ok(growStock('cane', 'funchal') === 30 * WORKS.farm.perDay[1],
     `하루 ${WORKS.farm.perDay[1]}칸씩 쌓인다 — 30일에 ${growStock('cane', 'funchal')}칸`);
  state.day += 999;
  ok(growStock('cane', 'funchal') === growCap('farm', 1),
     `상한(${WORKS.farm.stockDays}일치 = ${growCap('farm', 1)}칸)을 넘으면 안 쌓인다 — 밭에서 썩는다`);
  /* ★ 단조 — 원가 구간이 섞여도 `costFor(n)`은 늘기만 해야 한다 */
  let mono = true, prev = -1;
  for (let i = 0; i <= 300; i++) { const v = costFor('cane', i, 'funchal'); if (v < prev) mono = false; prev = v; }
  ok(mono, '원가 구간이 섞여도 costFor(n)이 단조 증가다 — buy()의 이분 탐색이 안 깨진다');
  /* 밭 몫은 싸고, 시장을 안 누른다 */
  const unit = state.prices.funchal.cane;
  const off = WORK.farmOff[1];
  ok(Math.abs(costFor('cane', 10, 'funchal') - Math.round(unit * 10 * (1 - off))) <= 1,
     `밭 재고까지는 원가다 — 10칸 ${costFor('cane', 10, 'funchal')}닢 (시세 ${Math.round(unit * 10)}닢)`);
  state.impact = {}; state.cargoCap = 400; state.cargo = {};
  const r = buy('cane', 20);
  ok(r.ok && r.grown === 20 && !(state.impact.funchal?.cane),
     '밭에서 실은 몫은 시장을 안 누른다 — 자기 밭에서 실었기 때문이다');
  /* 휴업이면 안 쌓인다 */
  const w = workAt('farm', 'cane', 'funchal');
  w.idle = true; const before = growStock('cane', 'funchal');
  state.day += 30;
  ok(growStock('cane', 'funchal') === before, '휴업 중에는 한 칸도 안 쌓인다');
  w.idle = false;
  /* 사슬 여덟이 전부 밴드 안 */
  const bad = CHAIN.filter((x) => {
    const m = chainMargin(x); return m < WORK.marginMin || m > WORK.marginMax;
  });
  ok(CHAIN.length === 8 && !bad.length,
     `가공 사슬 여덟이 전부 밴드[${WORK.marginMin}, ${WORK.marginMax}] 안이다`);
  ok(CHAIN_BY_ID.smelt_silver.req === 1,
     '제련만 공업력 1이다 — 포토시·우앙카벨리카가 내륙 광산이라 2를 걸면 그 사슬이 죽는다');
}

/* ── A-10 2단계 · 경쟁 ────────────────────────────────────────────────
   ★ **전쟁을 새로 만들지 않는다.** 2단계가 더하는 것은 **값과 동선**뿐이다 —
     쥔 자리에서 웃돈을 물고, 자격을 사고, 일감을 가로채이고, 선단이 시세를 무너뜨린다. */
{
  resetGame('venezia');
  state.gold = 1e7;
  /* ⓐ 쥔 자리의 웃돈 — **그 세력이 앉은 도시에서만** 붙는다 */
  ok(gripMarkup('pepper', 'goa') === 0, '사이가 멀쩡하면 웃돈이 없다');
  addRegard('estado', -3, 'test');
  const upGoa = gripMarkup('pepper', 'goa');
  const upCal = gripMarkup('pepper', 'calicut');
  ok(upGoa === FACTION.gripUp && upCal === 0,
     `눈총이면 고아에서 후추가 +${Math.round(upGoa * 100)}% — 캘리컷에서는 안 붙는다(딴 데서 사면 된다)`);
  addRegard('estado', -5, 'test');
  ok(gripMarkup('pepper', 'goa') === FACTION.gripUpHard,
     `원수면 +${Math.round(FACTION.gripUpHard * 100)}%로 오른다`);
  /* ★ 빠져나갈 항구가 없는 품목은 절반만 문다 */
  addRegard('sangiorgio', -8, 'test');
  ok(!hasOutsideSource('sangiorgio', 'mastic')
     && gripMarkup('mastic', 'chios') === FACTION.gripUpHard * FACTION.gripSoleHalf,
     '마스틱은 산지가 키오스 하나뿐이라 웃돈이 절반이다 — 온 값을 물리면 경쟁이 아니라 통행세다');
  /* ★ 상수 배율이라 `buy()`의 이분 탐색이 안 깨진다 */
  {
    state.at = 'goa'; state.cargoCap = 400; state.cargo = {}; state.impact = {};
    let mono = true, prev = -1;
    for (let i = 0; i <= 200; i++) { const v = costFor('pepper', i, 'goa'); if (v < prev) mono = false; prev = v; }
    ok(mono, '웃돈이 붙어도 costFor(n)이 단조 증가다 — 상수 배율이라야 하는 이유');
  }

  /* ⓑ 자격(`enroll`) — **세를 깎아 주지 않는다** */
  resetGame('venezia'); state.gold = 1e7;
  ok(enrollOffer('venezia') === null, '베네치아는 자격을 팔지 않는다(파는 것이 흥정이다)');
  const off = enrollOffer('lubeck');
  ok(off && off.fac === 'hanse' && off.price === 520,
     `한자는 한 철 자격을 판다 — ${off?.price}닢 (소설 52장이 값까지 적어 두었다)`);
  {
    state.at = 'lubeck';
    const t0 = baseTariff('lubeck');
    const r = buyEnroll('lubeck');
    ok(r.ok && regardOf('hanse') === FACTION.enrollRegard,
       `명부에 올리면 관계가 +${FACTION.enrollRegard}가 된다`);
    ok(baseTariff('lubeck') === t0,
       '★ 세는 한 닢도 안 깎인다 — `enroll`이 주는 것은 오직 관계뿐이다');
    ok(enrolled('hanse'), '올라 있는 동안은 명부에 있다');
  }

  /* ⓒ 정기선단 — **확률이 아니라 달력**이고 **수요 도시에만** 건다 */
  {
    resetGame('venezia');
    const d = convoyDue('casa', 1);
    ok(d && d.every === 90, `카사의 플로타는 ${d?.every}일마다다 — 한 해 한 번`);
    state.day = 90; state.shocks = [];
    const fired = rollConvoys(1);
    ok(fired.length > 0, `달력이 오면 선단이 든다 — ${fired.length}건`);
    for (const f of fired) {
      ok(CITY_BY_ID[f.city].demand?.[f.good] != null,
         `★ 수요 도시에만 건다 — ${CITY_BY_ID[f.city].name}의 ${GOOD_BY_ID[f.good].name}`
         + ' (산지에 걸면 싸게 살 기회가 되어 새 수입원이 된다)');
    }
    ok(state.shocks.some((x) => String(x.why).startsWith('convoy:') && x.mult < 1),
       '값이 주저앉는다 — 비싸게 팔 기회를 잃는 것 하나뿐이다');
  }

  /* ⓓ 함대를 꺾으면 −4 — 등급 4·5만 */
  {
    resetGame('venezia');
    const before = regardOf('venezia');
    ok(fleetSlain({ level: 2 }, 'venezia') === null, '잡배를 잡는 것으로는 안 걸린다');
    const hit = fleetSlain({ level: 5 }, 'venezia');
    ok(hit && regardOf('venezia') === before + FACTION.fleetRaw,
       `함대를 꺾으면 ${FACTION.fleetRaw} — 패권을 향해 가는 것이 곧 척지는 것이다`);
  }

  /* ⓔ 연대 — 한 배를 덮치면 여럿이 등을 돌린다 */
  {
    resetGame('venezia');
    const hit = bondPenalty({ bond: ['venezia', 'sangiorgio'] });
    ok(hit.length === 2 && regardOf('venezia') === -1 && regardOf('sangiorgio') === -1,
       `뒤에 선 것이 하나가 아니면 함께 등을 돌린다 — ${hit.join(' · ')}`);
  }

  /* ⓕ 시설 입회비와 침범 — **막지 않는다. 값을 물린다** */
  {
    resetGame('venezia'); state.gold = 1e7;
    state.holdings = { potosi: { rental: true, warehouse: true } };
    state.at = 'potosi';
    ok(workEntry('potosi').fee === FACTION.entryFee && !workEntry('potosi').idle,
       '★ 「모른다」(0)는 침범이 아니다 — 입회비를 내고 들어간다. 사양에서 한 칸 물러선 자리다');
    addRegard('casa', -2, 'test');            // 눈총으로 내려간다
    const ent = workEntry('potosi');
    ok(ent.fac === 'casa' && ent.idle && ent.raw === FACTION.trespassRaw,
       '눈총부터는 침범이다 — 세울 수는 있다');
    ok(buyGrow('silverore', 'potosi').ok
       && workAt('mine', 'silverore', 'potosi').idle,
       '★ 막지 않는다 — 대신 **휴업으로 시작**해 유지비만 나가고 산출이 0이다');
    ok(regardOf('casa') === -2 + FACTION.trespassRaw, `침범한 값이 관계로 온다 (${regardOf('casa')})`);
    /* ★ 침범으로 닫힌 문은 **관계가 풀리면 열린다** — 유지비 문제가 아니라 관계 문제이므로
       `settleWorks`가 못 연다. 그러면 유지비만 영원히 나가는 자리가 생긴다. */
    addRegard('casa', 8, 'test');
    ok(reviveTrespass('potosi') && !workAt('mine', 'silverore', 'potosi').idle,
       '관계가 풀리면 그 문이 열린다 — 회복하는 길이 있어야 벌이 벌이 된다');
  }

  /* ⓕ-2 ★ **입회비를 못 낼 때 값만 삼키지 않는다** — 세 매입 함수가 같은 규약인가 (회차 28)
     `buyShop`·`buyMill`이 정가를 먼저 빼고 나서 입회비를 검사해 **정가만 사라지고 시설은 안 서는**
     자리가 있었다(실측 27,780닢). 셋 다 **빼기 전에 정가+입회비**를 본다. */
  {
    for (const [name, plan] of [
      ['광산', () => { state.at = 'potosi'; const c = canBuyGrow('silverore', 'potosi');
                       return [c.price, () => buyGrow('silverore', 'potosi'),
                               () => workAt('mine', 'silverore', 'potosi')]; }],
      ['판매소', () => { state.at = 'venezia'; const c = canBuyShop('pepper', 'venezia');
                       return [c.price, () => buyShop('pepper', 'venezia'),
                               () => shopAt('pepper', 'venezia')]; }],
      ['가공장', () => { state.at = 'venezia'; const c = canBuyMill('dye_scarlet', 'venezia');
                       return [c.price, () => buyMill('dye_scarlet', 'venezia'),
                               () => millOf('dye_scarlet', 'venezia')]; }],
    ]) {
      resetGame('venezia'); state.gold = 1e7;
      state.holdings = { potosi: { rental: true, warehouse: true },
                         venezia: { rental: true, warehouse: true } };
      const [price, buy, has] = plan();
      state.gold = price;                       // 정가만 있고 입회비가 없다
      const r = buy();
      ok(r.ok === false && state.gold === price && !has(),
         `${name}: 입회비가 모자라면 **아무것도 안 일어난다** — 금고도 그대로다 (${price?.toLocaleString('ko-KR')}닢)`);
    }
  }

  /* ⓗ 3단계 · 회사의 벌목 — **파는 대신 벤다** */
  {
    resetGame('venezia');
    state.shocks = []; state.day = FACTION.fellEvery;
    ok(rollFelling(1).length === 0, '사이가 멀쩡하면 안 벤다');
    addRegard('company', FACTION.fellAt - 2, 'test');
    const fell = rollFelling(1);
    ok(fell.length > 0, `회사와 사이가 ${regardOf('company')}이면 벤다 — ${fell.length}곳`);
    for (const x of fell) {
      ok(CITY_BY_ID[x.city].supply?.[x.good] != null,
         `★ **산지에만** 건다 — ${CITY_BY_ID[x.city].name}의 ${GOOD_BY_ID[x.good].name}`);
    }
    ok(state.shocks.every((x) => x.mult > 1),
       '★ 값이 **오른다** — 사는 쪽이 손해다. 새 수입원이 아니다(수요지는 한 톨도 안 건드린다)');
    ok(addRegard('company', 5, 'test') <= 0,
       '★ 회사는 0 위로 못 올라간다 — 살 것이 없으니 거래로 못 올린다(1단계 규칙이 여기서 값을 갖는다)');
  }

  /* ⓘ 3단계 · 세력끼리의 나포 — **목격할 뿐이다** */
  {
    resetGame('venezia');
    ok(atWar('estado', 'company') && !atWar('estado', 'casa'),
       '싸우는 사이는 `FACTION_TIES.war`가 정한다 — 대칭이다');
    const npc0 = (state.npcs ?? []).length;
    /* ★ 확률 지표를 검사에 그대로 쓰지 않는다 — 이 프로젝트가 두 번 밟은 자리다.
       `days`를 크게 줘 **문턱을 확실히 넘긴 뒤** 「짝을 고르는 규칙」만 본다. */
    let seen = null;
    for (let i = 0; i < 400 && !seen; i++) seen = rollFactionRaid(200);
    ok(seen, `드물게 목격한다 — ${seen?.hunter}이(가) ${seen?.prey}의 배를 끌고 갔다`);
    ok((state.npcs ?? []).length === npc0,
       '★ **상선 정원을 안 줄인다** — 털린 배는 다시 채워진다');
    ok(state.shocks.some((x) => x.why === 'facraid' && x.mult > 1),
       '★ 플레이어에게 아무것도 안 준다 — 그 물건이 그 항구에서 귀해지는 것을 볼 뿐이다');
  }

  /* ⓖ 가로채기 — **손실은 선금 반환뿐**이다 */
  {
    resetGame('sevilla'); state.gold = 1e7; state.cargoCap = 400;
    addRegard('casa', -8, 'test');
    state.contract = { from: 'sevilla', to: 'lisboa', goodId: 'wine', qty: 5, pay: 1000,
                       due: state.day + 20, advance: 200, by: 'casa', taken: state.day };
    state.day += 20;
    let poached = 0;
    for (let i = 0; i < 200; i++) {
      state.contract = { ...state.contract, poachRolled: false };
      if (rollPoach()) poached++;
    }
    ok(poached > 0, `원수면 가로채인다 — 200번에 ${poached}번`);
  }
}

/* ── A-9 3단계 · 판매소 · 위탁 · 정기선 ───────────────────────────────
   ★ **경계 하나가 이 층의 전부다 — 유통은 짐을 옮기기만 하고 사고팔지 않는다.**
     그것이 깨지면 최적 플레이가 "항로를 걸어 놓고 지켜본다"가 되어 게임의 몸통이 사라진다.
     그래서 검사도 **무엇을 안 하는가**부터 본다. */
{
  resetGame('venezia');
  state.gold = 1e7;
  state.holdings = { venezia: { rental: true, warehouse: true },
                     genova:  { rental: true, warehouse: true } };
  /* ⓐ 판매소 — 팔 때만 벌점을 깎는다 */
  ok(buyShop('pepper', 'venezia').ok, '수요가 있는 항구에 판매소를 연다');
  ok(!canBuyShop('grain', 'venezia').ok || CITY_BY_ID.venezia.demand.grain != null,
     '수요가 없는 품목은 판매소를 못 연다');
  ok(shopCut('pepper', 'venezia') === WORK.shopCut[1],
     `팔 때 시장 벌점이 −${Math.round(WORK.shopCut[1] * 100)}%가 된다`);
  {
    state.impact = {}; state.cargoCap = 400; state.cargo = { pepper: 100 }; state.buyPrice = { pepper: 1 };
    sell('pepper', 100);
    const pressed = state.impact.venezia?.pepper ?? 0;
    ok(Math.abs(pressed - 100 * (1 - WORK.shopCut[1])) < 1e-6,
       `100칸을 팔아도 시장에는 ${Math.round(pressed)}칸만 쌓인다 — 값을 시간으로 산 것이다`);
  }
  /* ⓑ 위탁 판매 — 하루 몇 칸씩, 그리고 **들러야 들어온다** */
  state.stored = { venezia: { pepper: 40 } };
  ok(consignToShop('pepper', 40, 'venezia').ok, '창고의 짐을 판매소에 맡긴다');
  const goldBefore = state.gold;
  state.day += 10;
  const sold = shopTick('pepper', 'venezia');
  ok(sold === 10 * WORK.shopFlow[1], `하루 ${WORK.shopFlow[1]}칸씩 팔린다 — 10일에 ${sold}칸`);
  ok(state.gold === goldBefore,
     '★ 팔려도 금고에는 안 들어온다 — 그 항구에 들러 걷어야 한다(§3-1의 경계)');
  ok(collectShop('venezia') > 0 && state.gold > goldBefore, '걷으면 그때 들어온다');

  /* ⓒ 위탁 — 짐만 옮긴다. 창고가 양쪽에 있어야 한다 */
  state.stored.venezia = { silk: 30 };
  ok(!canConsign('silk', 30, 'napoli', 'venezia').ok,
     '받는 항구에 창고가 없으면 위탁을 못 보낸다');
  const cs = sendConsign('silk', 30, 'genova', 'venezia', false);
  ok(cs.ok && !state.stored.venezia.silk, `위탁하면 창고에서 빠진다 — ${cs.n}칸 · ${cs.days}일`);
  ok((state.consign ?? []).length === 1, '띄워 둔 위탁이 한 건이다');
  state.day += cs.days;
  state.at = 'genova';
  const arr = arriveConsign('genova');
  ok(arr.got.length + arr.lost.length === 1, '도착한 위탁은 들를 때 처리된다');

  /* ⓓ 정기선 — 값은 돈이 아니라 선단이다 */
  resetGame('venezia');
  state.gold = 1e7;
  state.holdings = { venezia: { rental: true, warehouse: true },
                     genova:  { rental: true, warehouse: true } };
  state.at = 'venezia';
  const sh = SHIPS.cocca;
  state.fleet.cocca = { at: 'venezia', hp: sh.hp, arms: { light: sh.guns, medium: 0, long: 0 }, refits: {} };
  /* 동행선에는 선장이 있어야 한다(`FLEET.requireCaptain`) — 그 자리에 앉는 것이 동료다 */
  const mate = matesAt('venezia')[0];
  if (mate) hireMate(mate.id, { joint: false });
  setConsort('cocca');
  const capWith = cargoCapTotal();
  state.stored = { venezia: { salt: 60 } };
  const ln = startLine('cocca', 'venezia', 'genova', ['salt']);
  ok(ln.ok, `정기선을 묶었다 — 왕복 ${ln.turn}일`);
  ok(cargoCapTotal() < capWith,
     `★ 묶은 배는 동행에서 빠진다 — 적재 ${capWith} → ${cargoCapTotal()}칸. 값은 돈이 아니라 선단이다`);
  ok(!canStartLine('cocca', 'venezia', 'genova', ['salt']).ok, '같은 배를 두 번 묶지 못한다');
  /* ⚠️ 양쪽 시계 — `waitDays`에도 걸려 있어야 한다 */
  const moved0 = (state.stored.venezia?.salt ?? 0);
  const wd = waitDays(Math.max(2, ln.turn));
  /* ⚠️ **「제노바에 쌓였나」로 재면 요율만큼 빨개진다** — `tickLines`는 편도마다 `routeRisk`로
     해적을 굴리고(베네치아~제노바 4%), 걸리면 짐이 통째로 사라져 제노바가 0칸이 된다.
     실측 30회 중 1회가 그렇게 떨어졌다. 이 검사가 지키려는 것은 *짐이 닿았나*가 아니라
     **정기선이 `waitDays`에서도 돌았나**이므로, 확률이 안 낀 것으로 잰다 —
     `waitDays()`가 돌려주는 `lines`(그 자리에서 실제로 실은 칸)를 본다. */
  const ran = (wd.lines ?? []).some((x) => x.loaded > 0);
  ok(ran && (state.stored.venezia?.salt ?? 0) < moved0,
     `★ 항구에 서 있는 동안에도 정기선이 돈다 — tickLines가 waitDays에도 걸려 있다`
     + ` (베네치아 ${moved0} → ${state.stored.venezia?.salt ?? 0}칸 · 실은 ${(wd.lines ?? []).map((x) => x.loaded).join('/')}칸`
     + ` · 제노바 ${state.stored.genova?.salt ?? 0}칸${(wd.lines ?? []).some((x) => x.robbed) ? ' — 이번 판은 털렸다' : ''})`);
  /* 같은 이유로 이 줄도 **털린 판을 빼고** 본다 — 털리면 제노바가 0인 것이 정상이다 */
  ok((wd.lines ?? []).some((x) => x.robbed)
     || !(state.stored.venezia?.salt > 0 && state.stored.genova?.salt === 0),
     '★ 한 방향으로만 나른다 — 왕복 양쪽에서 실으면 같은 짐을 도로 실어 오는 배가 된다');
  ok(stopLine('cocca').ok, '언제든 풀 수 있다');
}

/* ── A-3 · 여덟 바다에도 얼굴이 생겼다 ────────────────────────────────
   ★ 배는 2026-08-26에 아홉으로 갈렸는데 **사람은 하나**였다. 여기서 지켜야 하는 선은 하나 —
     **금화·선원·배가 아홉 나란해야 한다.** 갈리는 것은 특전 하나와 대가 하나뿐이고,
     그래야 *"콘텐츠는 늘고 곡선은 그대로"*가 성립한다. */
{
  const seats = START_PORTS.filter((p) => p.region !== 'eastasia');
  for (const p of seats) {
    const f = seaOriginAt(p.at);
    ok(!!f && f.region === p.region, `${p.at} — 그 바다의 얼굴이 있다 (${f?.name ?? '없다'})`);
  }
  let golds = new Set(), crews = new Set();
  for (const p of START_PORTS) {
    resetGame(p.at);
    golds.add(state.gold); crews.add(state.crew);
    ok(state.shipKey === p.ship, `${p.at} — 배는 그 바다의 삭은 배 그대로다 (${SHIPS[state.shipKey].name})`);
  }
  ok(golds.size === 1 && crews.size === 1,
     `아홉이 금화·선원에서 나란하다 — 금화 ${[...golds]}닢 · 선원 ${[...crews]}명`);
  /* 특전은 제 바다에서만 산다(`homeOnly`) — 한반도의 `joseonOnly`와 같은 장치, 다른 눈금 */
  resetGame('venezia');
  ok(originPerk('contractUp', 'venezia') > 0 && originPerk('contractUp', 'lisboa') === 0,
     '상관 서기의 특전은 제 바다에서만 산다(권역으로 잠근다)');
  ok(originPerk('permitUp', 'lisboa') > 0,
     '대가는 국경에서 안 죽는다 — 소설 원리 B를 종친 갈래와 같은 방식으로 지킨다');
  resetGame('jamaica');
  ok(originPerk('tariffOff', 'venezia') < 0,
     '사략의 이름은 아홉 바다 어디서나 무겁다(그 갈래는 대가에 homeOnly를 안 걸었다)');
  /* 한반도는 종전과 한 치도 같다 */
  resetGame();
  ok(state.origin === DEFAULT_ORIGIN, `부산포 기본값은 여전히 역관의 서자다 (${state.origin})`);
}

/* ── C-13 N4 · 기함이 가라앉는다 — **삭은 배로 졌을 때만** ────────────────
   ★ 오래 「고를 자리」를 못 찾던 규칙이다. 폭풍에 붙이면 사고가 되고, 안 붙이면 삭은 배를
     영원히 몬다. 그래서 **플레이어가 고른 자리(전투)**에, **고른 상태(선체 바닥)**에만 붙였다. */
{
  resetGame('busanpo');
  ok(!flagshipSinks(), '멀쩡한 배는 안 가라앉는다');
  state.gold = 1e7;
  state.fleet.jounseon = { at: 'busanpo', hp: SHIPS.jounseon.hp,
                           arms: { light: SHIPS.jounseon.guns, medium: 0, long: 0 }, refits: {} };
  boardShip('jounseon');
  delete state.fleet.oldsahuseon;
  state.hp = Math.round(state.maxHp * 0.05);
  ok(flagshipSinks(), `선체가 ${Math.round(HULL.sinkAt * 100)}% 밑이면 지는 순간 가라앉는다`);
  state.fleet.gyeonggangseon = { at: 'busanpo', hp: 10, arms: { light: 0, medium: 0, long: 0 }, refits: {} };
  ok(!flagshipSinks(), '정박해 둔 배가 있으면 안 가라앉는다 — 갈아탈 데가 있다');
  delete state.fleet.gyeonggangseon;
  const r = sinkFlagship();
  ok(r.lost === 'jounseon' && state.shipKey === wreckShipOf('eastasia'),
     `가라앉으면 **그 바다의 삭은 배**로 다시 선다 — ${r.lostName} → ${r.keptName}`);
  ok(state.hp === state.maxHp && !Object.keys(state.cargo).length,
     '배는 새것이고 짐은 없다 — 막다른 골목을 만들지 않는다');
  /* ★ 공짜 수리가 되면 안 된다 — 이미 삭은 배면 안 가라앉는다 */
  state.hp = 1;
  ok(!flagshipSinks(), '이미 그 바다의 삭은 배를 몰고 있으면 안 가라앉는다 — 「져서 새 배」가 공짜 수리가 된다');
  /* 청산도 그 바다의 배를 남긴다 */
  resetGame('jamaica');
  state.gold = 0; liquidate();
  ok(state.shipKey === wreckShipOf('caribbean'),
     `청산 뒤에 남는 배도 그 바다의 것이다 — ${SHIPS[state.shipKey].name}`);
}

/* ── C-10 · 원양 구간의 적은 두 바다 어느 쪽에서도 온다 ────────────────
   ★ 태평양 한복판에서 부카니에가, 반대 방향에서 왜구가 나왔다 — 같은 물인데
     **어디서 떠났는지로 얼굴이 갈렸다.** 수치(`ENEMIES`)는 안 건드리고 얼굴만 고른다. */
{
  resetGame('busanpo');
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(legRegion('acapulco', 'manila', () => i / 200));
  ok(seen.has('caribbean') && seen.has('eastasia'),
     `아카풀코~마닐라는 두 바다의 물이다 — 나온 얼굴의 바다 ${[...seen].join('·')}`);
  const near = new Set();
  for (let i = 0; i < 50; i++) near.add(legRegion('busanpo', 'hakata', () => i / 50));
  ok(near.size === 1 && near.has('eastasia'),
     '근해 구간은 종전과 한 치도 같다 — 한 바다 안이면 갈릴 것이 없다');
  ok(legRegion('nagasaki') === 'eastasia',
     '목적지를 안 주면 예전처럼 서 있는 바다다(옛 호출부가 그대로 돈다)');
}

/* ── P3 동료 = 코멘다 ────────────────────────────────────────
   사료: `commendaSplit` — 편무 75/25 · 쌍무 50/50(항해자 자본 1/3).
   ★ 같은 동료가 **초반엔 자본이고 후반엔 비용**이다. 그 고름이 이 장치의 전부다. */
{
  resetGame('gunsan');
  state.gold = 5000; state.crew = 10;
  const m = matesAt('gunsan')[0];
  ok(!!m, `그 항구에서 만나는 동료가 있다 (${m?.name})`);

  const purse0 = state.gold;
  const joint = hireMate(m.id, { joint: true });
  ok(joint.ok && state.gold > purse0,
     `쌍무로 태우면 **자본이 늘어난다** — 계약금 ${joint.fee}닢 내고 밑천 ${joint.stake}닢을 받는다`
     + ` (초반엔 칸이 남고 돈이 없다)`);
  ok(Math.abs(mateCut() - COMMENDA.cutJoint) < 1e-9,
     `그 대신 이익의 ${Math.round(COMMENDA.cutJoint * 100)}%가 그의 몫이다 — 후반에는 이것이 순손실이다`);
  ok(matePerk('sailDaysOff') === (m.perks?.sailDaysOff ?? 0),
     '동료 특전은 부관·갈래와 같은 자리에서 더해진다 (새 계산 경로를 안 판다)');

  const back = dismissMate(m.id);
  ok(back.ok && back.back === joint.stake && mateCut() === 0,
     `내리면 밑천 ${back.back}닢을 돌려준다 — 코멘다는 출자이지 증여가 아니다`);

  const sole = hireMate(m.id, { joint: false });
  ok(sole.ok && sole.stake === 0 && Math.abs(mateCut() - COMMENDA.cutSole) < 1e-9,
     `편무는 밑천 없이 이익의 ${Math.round(COMMENDA.cutSole * 100)}%다 (사료 75/25 그대로)`);

  // 이익 분배가 실제로 돈다
  resetGame('gunsan');
  state.gold = 500000; state.crew = 10;
  buy('grain', 30);
  const noMate = sell('grain', 30);
  resetGame('gunsan');
  state.gold = 500000; state.crew = 10;
  hireMate(matesAt('gunsan')[0].id, { joint: false });
  buy('grain', 30);
  const withMate = sell('grain', 30);
  ok(withMate.mateCut >= 0 && (noMate.profit <= 0 || withMate.profit < noMate.profit),
     `매각 이익에서 동료 몫을 뗀다 (${withMate.mateCut}닢) — 밑진 거래에서는 안 뗀다`);

  // 선장 자리 — 선단 규모가 동료 수에 묶인다
  resetGame('gunsan');
  state.gold = 500000; state.crew = 30;
  const sh = SHIPS.cocca;
  state.fleet.cocca = { at: 'gunsan', hp: sh.hp, arms: { light: sh.guns, medium: 0, long: 0 }, refits: {} };
  ok(FLEET.requireCaptain && !canConsort('cocca').ok,
     '동료가 없으면 배를 데려갈 수 없다 — **선단 규모가 동료 수에 묶인다**');
  hireMate(matesAt('gunsan')[0].id, { joint: false });
  const cr = setConsort('cocca');
  ok(cr.ok && !!cr.captain && freeMates().length === 0,
     `동료를 태우면 그가 키를 잡는다 (${cr.captain}) — 배 하나에 선장 하나`);
  ok(mateCap() === FLEET.max, `데리고 다닐 수 있는 동료는 동행 상한과 같다 (${mateCap()}명)`);
}

/* ── 파산 청산이 코멘다도 끝낸다 (ISSUES #29) ────────────────────
   ★ *"셈이 끝났다 — 빚은 없다"* 뒤에도 동료가 갑판에 남아 50%를 떼고, 내리는 순간
     밑천 1,800닢이 **빚으로 부활**했다. 그러면 ★3이 세운 「끝이 있는 실패」가 무너진다.
   ★ 사료가 답을 준다 — **코멘다는 대차가 아니라 공동 위험 인수**다. 쌍무 콜레간자에서
     항해자가 댄 1/3은 *그도 그 항해에 건 자본*이라 배와 짐이 사라지면 **양쪽이 함께 잃는다**. */
{
  resetGame('quanzhou');
  state.gold = 5000; state.crew = 10;
  const m = matesAt('quanzhou')[0];
  ok(!!m, `취안저우에서 동료를 만난다 (${m?.name})`);
  const r = hireMate(m.id, { joint: true });
  ok(r.ok && mateCut() > 0, `쌍무로 태운다 — 밑천 ${r.stake}닢 · 몫 ${Math.round(mateCut() * 100)}%`);
  state.gold = 0;
  payFine(9000, '큰 위약금');
  for (let i = 0; i < 4 && debtOwed() > 0; i++) { state.day += MONTH_DAYS; settlePayroll(() => 1); }
  ok(mateCount() === 0 && mateCut() === 0,
     '청산은 **코멘다도 끝낸다** — 동료가 갑판에 남아 50%를 떼지 않는다');
  ok(debtOwed() === 0,
     '밑천이 빚으로 부활하지 않는다 — 그도 그 항해에 걸었던 자본이라 함께 잃는다');
}

/* ── P6-1 소식이 그 구간 시세를 함께 판다 ────────────────────────
   ★ 실플레이에서 세기 1 사냥이 −301닢이었는데, 명부 40명의 사냥터를 무역으로 뛰면 **적자가 0**이다.
     해적은 털 것이 지나가는 곳에 앉아 있다 — 고칠 것은 현상금이 아니라 **정보**였다. */
{
  resetGame('busanpo');
  state.gold = 100000;
  const wang = rosterOpenIn('eastasia').find((d) => d.id === 'wangzhi');
  const legs = huntLegs(wang);
  ok(legs.length > 0, `명부에 사냥터가 도시 쌍으로 적혀 있다 (${legs.length}구간)`);
  const ports = [...new Set(legs.flat())];
  ok(ports.every((id) => !priceKnown(id)), '소식을 사기 전에는 그 구간 항구들의 값을 모른다');
  const r = buyBountyTip(wang);
  ok(r.ok && ports.every((id) => priceKnown(id)),
     `소식이 **그 구간 시세를 함께 판다** — ${ports.length}곳이 열렸다 (값은 그대로다)`);
  ok(r.legs?.length === legs.length, '어느 구간인지도 함께 알려 준다 — 안 알려 주면 찾아갈 수 없다');
}

/* ── P6-2 현상금은 `capSpoils` 밖이다 ────────────────────────────
   ★ `capLoot`의 정당화는 *"갑판에 여섯이 금고를 통째로 못 옮긴다"* — **옮겨 싣는 것**이라 상한이 있다.
     현상금은 옮겨 싣는 물건이 아니다(나포심판 뒤 항구에서 관이 장부로 치른 돈이다). */
{
  resetGame('venezia');
  state.gold = 8000; state.crew = 10;
  const def = ALL_PIRATES.filter((d) => (d.strength ?? 2) === 5)[0];
  const purse = (def.purse[0] + def.purse[1]) / 2;
  const mixed = capLoot({ loot: { gold: [Math.round(purse * 0.6) + def.bounty[0], purse + def.bounty[1]], goods: [] } });
  const split = capLoot({ loot: { gold: [Math.round(purse * 0.6), purse], goods: [] }, bounty: def.bounty });
  const mixedTake = (mixed.loot.gold[0] + mixed.loot.gold[1]) / 2;
  const splitTake = (split.loot.gold[0] + split.loot.gold[1]) / 2 + (def.bounty[0] + def.bounty[1]) / 2;
  ok(split.bounty && split.bounty[1] === def.bounty[1],
     '현상금은 `capLoot`을 안 지난다 — 액수가 그대로 실려 온다');
  ok(splitTake > mixedTake,
     `가난할 때 가장 크게 갈린다 — 금고 8,000닢에서 실수령 ${Math.round(mixedTake).toLocaleString('en-US')}`
     + ` → ${Math.round(splitTake).toLocaleString('en-US')}닢 (상한 ${spoilsCap().toLocaleString('en-US')})`);

  // 받는 자리는 **항구**다 — 이기고 살아 돌아와야 받는다
  resetGame('venezia');
  state.gold = 1000;
  const before = state.gold;
  oweBounty('시험', 5000);
  ok(state.gold === before && state.bountyDue.length === 1,
     '싸움터에서는 안 준다 — 목에 걸린 값은 항구에서 받는다');
  const paid = payBounties();
  ok(paid.total === 5000 && state.gold === before + 5000 && state.bountyDue.length === 0,
     `입항하면 받는다 (${paid.total.toLocaleString('en-US')}닢) — 이기고 **살아 돌아와야** 한다`);
}

/* ── P6-4 소식값 하한을 현상금에 묶는다 ─────────────────────────
   ★ 고정 200닢이 **세기 1의 현상금 하한(180닢)보다 비쌌다** — 사다리의 첫 칸이 마이너스였다. */
{
  resetGame('venezia');
  const bad = ALL_PIRATES.filter((d) => (d.bounty?.[0] ?? 0) && bountyTipPrice(d) > d.bounty[0]);
  ok(bad.length === 0, `소식이 현상금 하한보다 비싼 자가 없다 (전에는 6명이었다)`);
  const t1 = ALL_PIRATES.filter((d) => (d.strength ?? 2) === 1)[0];
  const t5 = ALL_PIRATES.filter((d) => (d.strength ?? 2) === 5)[0];
  ok(bountyTipPrice(t1) < bountyTipPrice(t5),
     `소식값도 사다리다 — ${t1.name} ${bountyTipPrice(t1)}닢 < ${t5.name} ${bountyTipPrice(t5).toLocaleString('en-US')}닢`);
  ok(bountyTipPrice(t1) >= ROSTER.tipFloorAbs,
     `그래도 공짜는 아니다 (절대 바닥 ${ROSTER.tipFloorAbs}닢)`);
}

/* ── 비용 축 (P4) — 「많이 벌어도 유지비가 같이 오른다」 ────────────
   ⓐ 선원 사무역(quintalada) · ⓑ 원양 보험 · ⓒ 원양 전손.
   ★ 셋 다 **수입을 깎는 쪽**이라, 원양(P1)과 같은 회차에 들어가야 「적절히」가 된다. */
{
  // ⓐ 인원에 비례한다 — 규모가 곧 비용이다
  ok(Math.abs(privateTradeCut(46) - 0.184) < 1e-9,
     `갈레온 46명이면 매각 이익의 ${(privateTradeCut(46) * 100).toFixed(1)}%가 선원 몫이다 (perCrew ${PRIVATE_TRADE.perCrew})`);
  ok(privateTradeCut(5) < privateTradeCut(46) && privateTradeCut(5) > 0,
     `낡은 바사 5명이면 ${(privateTradeCut(5) * 100).toFixed(1)}% — **작은 배는 가볍다**`);
  ok(privateTradeCut(200) === PRIVATE_TRADE.cap,
     `아무리 많이 태워도 ${PRIVATE_TRADE.cap * 100}%에서 멈춘다 (사료 밴드 20~46%의 하단)`);

  // 실제로 매각에서 빠지는가 — 부관·동료와 같은 자리다
  resetGame('gunsan');
  state.gold = 500000; state.crew = 0; state.officer = null;
  buy('grain', 30);
  const bare = sell('grain', 30);
  resetGame('gunsan');
  state.gold = 500000; state.crew = 46; state.officer = null;
  buy('grain', 30);
  const manned = sell('grain', 30);
  ok(bare.profit <= 0 ? manned.crewCut === 0
       : (manned.crewCut > 0 && manned.profit < bare.profit),
     `매각 이익에서 선원 몫을 뗀다 (${manned.crewCut}닢) — 밑진 거래에서는 안 뗀다`);

  // ⓑ 원양만 요율이 세다 — 근해는 그대로여야 초반 압박이 안 흔들린다
  const lane = LIVE_LANES[0];
  ok(insureRateFor(lane.a, lane.b) === INSURANCE_RATE_OCEAN,
     `원양 구간의 보험 계수는 ${INSURANCE_RATE_OCEAN} (사료 요율의 절반)`);
  ok(insureRateFor('gunsan', 'yeosu') === INSURANCE_RATE,
     `근해는 ${INSURANCE_RATE} 그대로다 — 원양만 올린다`);
  {
    resetGame();
    const V = 100000;
    const eff = insuranceFor({ from: lane.a, to: lane.b, value: V }) / V * 100;
    ok(eff >= 2.0 && eff <= 6.0,
       `가장 붐비는 원양 구간의 실효 요율 ${eff.toFixed(2)}% — 사료 중앙값 5%(p10 0.75 · p90 22) 안쪽`);
    for (let i = 0; i < 5; i++) state.consorts['esc' + i] = { crew: 10, captain: null };
    const eff5 = insuranceFor({ from: lane.a, to: lane.b, value: V }) / V * 100;
    ok(eff5 < eff && eff5 >= 1.0,
       `동행 5척이면 ${eff5.toFixed(2)}%로 내려간다 — **호위를 데려가면 종전 요율**이 그 뜻이다`);
    state.consorts = {};
  }

  // ⓒ 전손은 원양에서만 굴린다
  {
    resetGame();
    ok(totalLossOdds({ from: 'gunsan', to: 'yeosu' }) === 0,
       '근해에는 전손이 없다 — 4.7%는 대서양 원양 항로의 수치다');
    const p = totalLossOdds({ from: lane.a, to: lane.b });
    ok(p > 0 && p <= TOTAL_LOSS.cap,
       `원양 한 구간의 전손 확률 ${(p * 100).toFixed(1)}% (기준 ${(TOTAL_LOSS.rate * 100).toFixed(1)}% · 요율로 환산)`);
    state.hp = Math.round(state.maxHp * 0.4);
    ok(totalLossOdds({ from: lane.a, to: lane.b }) > p,
       '삭은 배는 더 잘 가라앉는다 — 수리를 미룬 값이 여기서 온다');
  }

  // 전손이 「바닥의 규칙」과 어떻게 만나는가 — 동행이 있으면 갈아타고, 없으면 청산이다
  {
    resetGame('gunsan');
    state.gold = 500000; state.crew = 30;
    const sh = SHIPS.cocca;
    state.fleet.cocca = { at: 'gunsan', hp: sh.hp, arms: { light: sh.guns, medium: 0, long: 0 }, refits: {} };
    hireMate(matesAt('gunsan')[0].id, { joint: false });
    setConsort('cocca');
    buy('grain', 10);
    const w1 = totalLoss(() => 0.5, null);
    ok(w1.mode === 'consort' && state.shipKey === 'cocca' && cargoUsed() === 0,
       `동행선이 있으면 그 배로 갈아탄다 (${SHIPS[w1.ship].name} → ${SHIPS[state.shipKey].name}) — **선단을 사는 또 하나의 이유**`);

    resetGame('gunsan');
    state.gold = 500000; state.crew = 30;
    buy('grain', 10);
    state.boons = state.boons || {};
    state.boons.loan = { owed: 4000, due: state.day + 30 };
    const w2 = totalLoss(() => 0.5, null);
    /* ★ 남는 배는 **그 바다의 삭은 배**다(2026-08-27). 군산창은 동아시아라 삭은 사후선이고,
       지중해였다면 `BANKRUPT.keepShip`(낡은 바사)이다 — 시작배가 아홉으로 갈린 것과 짝이다. */
    ok(w2.mode === 'liquidate' && state.shipKey === wreckShipOf('eastasia') && debtOwed() === 0,
       `혼자면 청산이다 — 배가 사라지면 **채무도 사라진다**(해상대차). 남는 것은 그 바다의 ${SHIPS[state.shipKey].name}`);
  }
}

/* ── 세이브 — 새 판이 옛 판을 덮기 전에 한 장 민다 (ISSUES #36) ──────
   ★ 완주 플레이가 *"저장된 판이 지워질 자리에 한 걸음 다가간다"*고 적었는데,
     실측하면 **한 걸음 더 갔다** — 바다·갈래를 고르면 `resetGame` → `go('port')`가 돌고
     입항 자동저장이 그 자리에서 옛 판을 덮는다. 「새로 시작한다」를 누르기 전에 이미 없다.
   ⇒ 규칙은 안 바꾸고 **되돌릴 자리**를 만들었다. 그 규칙을 여기서 지킨다. */
{
  clearSave();
  resetGame('busanpo');
  state.day = 120; state.gold = 9999;
  saveGame();
  const before = savedHead();
  ok(before?.day === 120 && before?.at === 'busanpo', '저장된 판을 머리말로 읽는다 (120일차 · 부산포)');

  ok(stashSave() === true, '새 판이 덮기 전에 옛 판을 한 장 민다');
  resetGame('venezia');
  saveGame();                                   // 입항 자동저장이 덮는 그 자리
  ok(savedHead()?.at === 'venezia' && savedHead('prev')?.at === 'busanpo',
     '덮여도 **직전 판은 남아 있다** — 이 한 줄이 없으면 그대로 사라진다');

  ok(restoreStashed() === true && state.day === 120 && state.at === 'busanpo' && state.gold === 9999,
     '되돌리면 그 판이 그대로 살아난다 (120일차 · 부산포 · 9,999닢)');
  ok(savedHead('prev') === null, '되돌린 자리는 비운다 — 두 번 되돌릴 자리는 두지 않는다');

  clearSave();
  ok(stashSave() === false,
     '저장이 없으면 밀지 않는다 — **빈 것을 밀면 옛 직전 판이 지워진다**');
}

/* ══════════════════════════════════════════════════════════════
   거점을 부동산으로 (#5) — 등급 · 공실 · 세
   ══════════════════════════════════════════════════════════════ */
{
  resetGame('venezia');
  state.gold = 400000;

  // ① 등급이 있다 — 사고 나면 1급이고, 숫자로 적힌다
  ok(HOLDINGS.shop.grades.length === 3 && HOLDINGS.inn.grades.length === 3,
     `수익형 부동산 둘 — 가게 ${HOLDINGS.shop.grades.length}급 · 여관 ${HOLDINGS.inn.grades.length}급`);
  buyHolding('inn', 'venezia');
  ok(state.holdings.venezia.inn === 1 && estateGrade('inn', 'venezia') === 1,
     '여관을 세우면 등급이 숫자 1로 적힌다 (기존 다섯은 true 그대로)');
  ok(hasHolding('inn', 'venezia'),
     '숫자로 적혀도 `hasHolding`이 참으로 읽는다 — 세이브·다른 규칙이 안 깨진다');

  // ② 승급은 **차액만** 문다 (자리와 자재를 그대로 쓴다)
  const p1 = estatePrice('inn', 1, 'venezia'), p2 = estatePrice('inn', 2, 'venezia');
  ok(estateUpgradeCost('inn', 'venezia') === p2 - p1,
     `승급 값은 차액이다 (${p1.toLocaleString('en-US')} → ${p2.toLocaleString('en-US')} = ${(p2 - p1).toLocaleString('en-US')}닢)`);
  const spentBefore = state.holdings.venezia.spent;
  upgradeEstate('inn', 'venezia');
  ok(estateGrade('inn', 'venezia') === 2 && state.holdings.venezia.spent === spentBefore + (p2 - p1),
     '승급하면 등급이 2가 되고 들인 돈(유지비의 밑동)도 그만큼 는다');

  // ③ 승급의 문은 **공업력**이다 — 사용자 원문 "승급은 공업력으로 올려도 되고"
  ok(industryOf('venezia') === 3 && canUpgradeEstate('inn', 'venezia').ok,
     `베네치아(공업력 ${industryOf('venezia')})는 3급까지 열린다`);
  {
    const low = CITIES.find((c) => industryOf(c.id) === 0);
    state.gold = 400000;
    buyHolding('inn', low.id);
    const r = canUpgradeEstate('inn', low.id);
    ok(!r.ok && /공업력/.test(r.reason),
       `${low.name}(공업력 0)에서는 여관을 못 올린다 — "${r.reason}"`);
  }

  // ④ 공실이 이 설계의 심장이다 — 고급일수록 더 빈다
  const vac = (k, g) => vacancyOdds(k, 'venezia', g);
  ok(vac('inn', 3) > vac('inn', 2) && vac('inn', 2) > vac('inn', 1),
     `여관은 올릴수록 더 빈다 (${(vac('inn', 1) * 100).toFixed(0)}% → ${(vac('inn', 2) * 100).toFixed(0)}% → ${(vac('inn', 3) * 100).toFixed(0)}%)`);
  ok(vac('inn', 3) > vac('shop', 3),
     `여관이 가게보다 더 빈다 — 도박 쪽은 여관이다 (${(vac('inn', 3) * 100).toFixed(0)}% vs ${(vac('shop', 3) * 100).toFixed(0)}%)`);
  ok(estateRent('inn', 'venezia', 3) > estateRent('inn', 'venezia', 2),
     `대신 만실이면 더 번다 (${estateRent('inn', 'venezia', 2)} → ${estateRent('inn', 'venezia', 3)}닢/30일)`);

  // ⑤ 축은 **size와 악명 둘뿐**이다 (data.js: ESTATE의 주석이 그렇게 못박아 두었다)
  {
    const big = CITIES.find((c) => c.size === 3), small = CITIES.find((c) => c.size === 1);
    ok(vacancyOdds('inn', big.id, 2) < vacancyOdds('inn', small.id, 2),
       `큰 항구가 덜 빈다 — ${big.name}(size3) ${(vacancyOdds('inn', big.id, 2) * 100).toFixed(0)}%`
       + ` < ${small.name}(size1) ${(vacancyOdds('inn', small.id, 2) * 100).toFixed(0)}%`);
    const flag = CITY_BY_ID.venezia.flag;
    const base = vacancyOdds('inn', 'venezia', 2);
    state.infamy[flag] = 5;
    ok(vacancyOdds('inn', 'venezia', 2) > base,
       `악명이 쌓이면 손님이 끊긴다 (${(base * 100).toFixed(0)}% → ${(vacancyOdds('inn', 'venezia', 2) * 100).toFixed(0)}%)`);
    state.infamy[flag] = 0;
    ok(ESTATE.ceil < 1, `아무리 나빠도 공실은 ${Math.round(ESTATE.ceil * 100)}%에서 멈춘다 — 막다른 골목 금지`);
  }

  // ⑥ 판정은 **결정론적**이다 — 드나들며 다시 굴릴 수 없다(시세 `wobble`과 같은 이유)
  {
    const a = [...Array(20)].map((_, i) => estateOccupied('inn', 'venezia', i));
    const b = [...Array(20)].map((_, i) => estateOccupied('inn', 'venezia', i));
    ok(a.every((v, i) => v === b[i]), '같은 기간을 다시 물어도 같은 답이다 — 공실은 재입장으로 못 피한다');
    ok(a.some((v) => v) && a.some((v) => !v),
       `스무 달 중 만실 ${a.filter(Boolean).length}달 · 빈 달 ${20 - a.filter(Boolean).length}달`);
  }

  // ⑦ 세는 30일마다 들어오고, **빈 달은 0인데 유지비는 그대로 나간다**
  {
    resetGame('venezia');
    state.gold = 400000;
    buyHolding('inn', 'venezia');
    upgradeEstate('inn', 'venezia');
    state.day += HOLDING.upkeepEvery * 12;
    const inc = holdingIncomeDue('venezia');
    const due = holdingUpkeepDue('venezia');
    const row = inc.rows.find((r) => r.kind === 'inn');
    ok(row && row.full + row.empty === 12, `열두 달치를 한 번에 센다 (만실 ${row?.full}달 · 빈 달 ${row?.empty}달)`);
    ok(row.empty > 0, '★ 빈 달이 있다 — 고급 여관이 늘 만실이면 그냥 돈 찍는 기계다');
    ok(inc.gold === row.rent * row.full, `세는 만실인 달만 들어온다 (${inc.gold.toLocaleString('en-US')}닢)`);
    ok(due > 0, `유지비는 빈 달에도 그대로 나간다 (${due.toLocaleString('en-US')}닢/12달)`);
    const g0 = state.gold;
    settleHolding('venezia');
    ok(state.gold === g0 + inc.gold - due,
       `정산하면 금고가 세(+${inc.gold.toLocaleString('en-US')}) − 유지비(−${due.toLocaleString('en-US')})만큼 움직인다`);
    ok(state.ledger.income.estate === inc.gold, '장부의 「부동산 세」 갈래에 그대로 적힌다');
  }

  // ⑧ 문을 닫으면 한 닢도 안 들어온다 — 유예가 공짜면 미납이 답이 된다
  {
    resetGame('venezia');
    state.gold = 400000;
    buyHolding('inn', 'venezia');
    state.holdings.venezia.idle = true;
    state.day += HOLDING.upkeepEvery * 3;
    ok(holdingIncomeDue('venezia').gold === 0,
       '문을 닫은 거점은 세를 못 번다 — 미납이 이득이 되지 않는다');
  }

  // ⑨ 부동산 수익은 **무역보다 훨씬 느리다**(연 몇 % · 항차 ROI는 열흘에 10%)
  {
    let bad = 0;
    for (const k of ESTATE_KEYS) {
      for (const gd of HOLDINGS[k].grades) {
        const net = gd.yield * (1 - gd.vacancy) - HOLDING.upkeepRate;
        if (!(net > 0.02 && net < 0.10)) bad++;
      }
    }
    ok(bad === 0,
       '여섯 등급 전부 순 연수익률이 2~10%다 — 부동산은 번 돈을 두는 곳이지 버는 길이 아니다'
       + (bad ? ` (밴드 밖 ${bad}건)` : ''));
  }
}

/* ══════════════════════════════════════════════════════════════
   관세를 후반 브레이크로 (#6) — 누진 · 관세 폭탄 · 무역품 몰수
   ══════════════════════════════════════════════════════════════ */
{
  resetGame('venezia');
  state.crew = 10;

  // ① 가난하면 누진이 없다 — 브레이크는 후반의 것이다
  ok(Math.abs(tariffScale() - 1) < 1e-9,
     `시작 자산(${netWorth().toLocaleString('en-US')}닢)에서는 누진이 없다 — ×${tariffScale().toFixed(2)}`);
  const poorRate = tariffRate('venezia');

  // ② 자산이 커지면 무거워지고, **상한이 있다**
  state.gold = TARIFF_SCALE.from + TARIFF_SCALE.per;
  ok(Math.abs(tariffScale() - (1 + TARIFF_SCALE.step)) < 0.03,
     `자산 ${netWorth().toLocaleString('en-US')}닢 → 누진 ×${tariffScale().toFixed(2)} (한 칸 = +${Math.round(TARIFF_SCALE.step * 100)}%)`);
  ok(tariffRate('venezia') > poorRate,
     `같은 항구인데 세가 무거워졌다 (${(poorRate * 100).toFixed(2)}% → ${(tariffRate('venezia') * 100).toFixed(2)}%)`);
  state.gold = 100000000;
  ok(Math.abs(tariffScale() - TARIFF_SCALE.cap) < 1e-9,
     `아무리 부자라도 누진은 ×${TARIFF_SCALE.cap}에서 멈춘다`);

  // ③ ★ 막다른 골목 금지 — 무엇이 겹쳐도 실효세에 천장이 있다
  {
    state.infamy[CITY_BY_ID.venezia.flag] = 10;              // 악명 최대
    addShock('venezia', null, SHOCK.events.find((e) => e.id === 'levy').mult, 30, 'levy');
    ok(tariffRate('venezia') <= TARIFF_SCALE.ceil + 1e-9,
       `누진 ×${TARIFF_SCALE.cap} + 악명 최대 + 관세 폭탄이 다 겹쳐도 `
       + `${(tariffRate('venezia') * 100).toFixed(1)}% ≤ 상한 ${(TARIFF_SCALE.ceil * 100).toFixed(0)}% — 팔수록 손해가 되지 않는다`);
    state.infamy[CITY_BY_ID.venezia.flag] = 0;
  }

  // ④ 관세 폭탄은 **시세를 안 건드린다**(품목 없는 충격)
  {
    ok(tariffShockFactor('venezia') > 1.5, `관세 폭탄이 걸려 있다 — 입항세 ×${tariffShockFactor('venezia').toFixed(2)}`);
    ok(shockFactor('venezia', 'grain') === 1 && priceOf('venezia', 'grain') > 0,
       '같은 사건이 곡물 시세에는 한 푼도 안 붙는다 — `shockFactor`는 품목이 맞아야 곱한다');
    ok(tariffShockFactor('napoli') === 1, '이웃 항구는 멀쩡하다 — 폭탄은 그 항구에만 걸린다');
    state.shocks.length = 0;
  }

  // ⑤ 관세 폭탄은 **부자에게 더 자주 온다** — 사용자 원문 "돈이 많아지는 시점에 특히 더"
  {
    const seeded = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
    const countLevy = () => {
      state.shocks.length = 0;
      return rollShockEvents(600, seeded(7)).filter((h) => h.kind === 'levy').length;
    };
    state.gold = 0; state.fleet = {};
    const poor = countLevy();
    state.gold = 100000000;
    const rich = countLevy();
    ok(rich > poor, `같은 600일·같은 시드에서 관세 폭탄이 가난할 때 ${poor}건 → 부자일 때 ${rich}건`);
    state.shocks.length = 0;
  }

  // ⑥ 무역품 몰수 — 가난하면 아예 안 뜨고, 문서를 쥐면 덜 걸린다
  {
    resetGame('venezia');
    state.crew = 10;
    ok(SEA_EVENTS.find((e) => e.id === 'seizure')?.weight === 0,
       '몰수는 weight 0이다 — 확률표(합 100)를 건드리지 않는다');
    ok(seizureOdds({ to: 'napoli' }) === 0, '시작 자산에서는 관선이 배를 안 세운다');
    state.gold = 100000000;
    ok(Math.abs(seizureOdds({ to: 'napoli' }) - SEIZURE.cap) < 1e-9,
       `부자가 되면 판정당 ${(SEIZURE.cap * 100).toFixed(1)}%까지 오른다`);
    state.boons.permit = { mediterranean: state.day + 30 };
    ok(Math.abs(seizureOdds({ to: 'napoli' }) - SEIZURE.cap * SEIZURE.permitOff) < 1e-9,
       `그 바다의 문서를 쥐면 확률이 ×${SEIZURE.permitOff}로 준다 — 값을 미리 치른 사람은 덜 물린다`);
    state.boons.permit = {};
  }

  // ⑦ 몰수는 **calm에서만** 나온다 — pirate·storm·merchant 빈도가 그대로여야 한다
  {
    resetGame('venezia');
    state.crew = 10;
    const tally = (n = 40000) => {
      const t = {};
      for (let i = 0; i < n; i++) { const e = rollSeaEvent({ from: 'napoli', to: 'palermo' }); t[e.id] = (t[e.id] || 0) + 1; }
      return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v / n]));
    };
    const poor = tally();
    state.gold = 100000000;
    const rich = tally();
    ok((rich.seizure ?? 0) > 0 && (poor.seizure ?? 0) === 0,
       `부자일 때만 몰수가 뜬다 (${((rich.seizure ?? 0) * 100).toFixed(1)}% vs 0%)`);
    ok(Math.abs(rich.pirate - poor.pirate) < 0.012 && Math.abs(rich.storm - poor.storm) < 0.012
       && Math.abs(rich.merchant - poor.merchant) < 0.012,
       `해적·폭풍·상선조우 빈도는 그대로다 (해적 ${(poor.pirate * 100).toFixed(1)}% → ${(rich.pirate * 100).toFixed(1)}%)`);
    ok(rich.calm < poor.calm,
       `늘어난 몫은 calm에서 덜어온다 (평온 ${(poor.calm * 100).toFixed(1)}% → ${(rich.calm * 100).toFixed(1)}%)`);
  }

  // ⑧ 몰수는 **값나가는 것부터** 가져가되 통째로는 안 가져간다
  {
    resetGame('venezia');
    state.crew = 10; state.gold = 200000;
    buy('grain', 20); buy('wine', 20);
    const had = cargoUsed();
    const hit = seizeCargo(() => 0.5);
    ok(hit.value > 0 && cargoUsed() < had && cargoUsed() > 0,
       `실은 ${had}칸 중 ${had - cargoUsed()}칸(${hit.value.toLocaleString('en-US')}닢어치)을 뺏겼다 — 배를 세우지는 않는다`);
  }

  // ⑨ 입항세가 **운영비용 갈래**로 선다 — 화면이 읽을 자리가 있어야 비용이 된다
  {
    resetGame('venezia');
    state.crew = 10; state.gold = 200000;
    buy('grain', 20);
    const c = voyageCost(6, state.crew, { from: 'venezia', to: 'napoli' });
    ok(c.tariff > 0 && c.withTariff === c.total + c.tariff,
       `항해비 옆에 입항세 ${c.tariff.toLocaleString('en-US')}닢이 선다 (합 ${c.withTariff.toLocaleString('en-US')}닢)`);
    ok(c.total === c.wages + c.supplies + c.fleet + c.hull + c.arms + c.officer + c.insurance,
       '★ `total`에는 안 넣는다 — `advanceDays`가 미리 걷거나 시뮬이 두 번 빼면 안 된다');
    ok(baseTariff('napoli') > 0 && tariffRate('napoli') > 0,
       `나폴리 기본세 ${(baseTariff('napoli') * 100).toFixed(1)}% · 지금 무는 세 ${(tariffRate('napoli') * 100).toFixed(1)}%`);
  }
}

/* ── 시작배는 바다마다 다르다 (사용자 지시 2026-08-26) ──────────────
   *"주인공은 각 지역의 가장 싸구려배로 시작해야지"* — 전에는 아홉 어디서 시작해도
   `hulk` 하나였다. 지중해 배 한 척이 광저우에도 아르갱에도 떠 있었다는 뜻이다.

   ★ **지키는 성질 둘** — ① 바다마다 얼굴이 다르다 ② **난이도는 나란하다.**
     ②가 없으면 시작지 고르기가 난이도 고르기가 된다. 처음에 정품 tier 1 배를 줬다가
     `leak`가 없고 속력이 1.7배라 **첫 배가 10~16항차 → 1항차**로 무너진 자리다. */
{
  const seen = new Set();
  let allDistinct = true, allFits = true, allLeak = true, allTier0 = true;
  const caps = [], hps = [], spds = [];
  for (const p of START_PORTS) {
    resetGame(p.at);
    const s0 = SHIPS[state.shipKey];
    seen.add(state.shipKey);
    // 데려온 사람이 그 배에 다 타야 한다
    if (state.crew > state.crewMax) allFits = false;
    // 싸구려는 물이 샌다 — 초반 압박의 축이다
    if (!(s0.leak > 0)) allLeak = false;
    // 시중에 안 나온다(조선소 목록·중고·나포에서 빠진다)
    if ((s0.tier ?? 0) !== 0) allTier0 = false;
    caps.push(s0.cargo); hps.push(s0.hp); spds.push(s0.speed);
  }
  ok(seen.size === START_PORTS.length,
     `아홉 바다가 저마다 다른 배로 선다 (${seen.size}종)`);
  ok(allFits, '데려온 사람이 그 배에 다 탄다 — 정원을 넘겨 시작하지 않는다');
  ok(allLeak, '시작배는 전부 물이 샌다 — 싸구려라는 말이 규칙이 된다');
  ok(allTier0, '시작배는 tier 0 — 조선소·중고·나포에 안 나온다');

  /* ★ **난이도가 나란한가.** 얼굴은 갈리되 힘은 같아야 한다. */
  const span = (a) => Math.max(...a) / Math.min(...a);
  ok(span(caps) <= 1.20 && span(hps) <= 1.25 && span(spds) <= 1.12,
     `아홉이 나란하다 — 화물 ${Math.min(...caps)}~${Math.max(...caps)}칸(×${span(caps).toFixed(2)})`
     + ` · 선체 ${Math.min(...hps)}~${Math.max(...hps)}(×${span(hps).toFixed(2)})`
     + ` · 속력 ×${span(spds).toFixed(2)}`);

  // 갈래 다섯도 그 바다 배를 탄다 — 군관은 사람이 열넷이라 정원이 그만큼이어야 한다
  resetGame(undefined, 'navy');
  ok(state.crew === 14 && state.crew <= state.crewMax,
     `군관이 데려온 열넷이 다 탄다 — ${SHIPS[state.shipKey].name} 정원 ${state.crewMax}`);
  resetGame(undefined, 'interpreter');
  ok(SHIPS[state.shipKey]?.leak > 0 && (SHIPS[state.shipKey].tier ?? 0) === 0,
     `역관도 삭은 배로 시작한다 (${SHIPS[state.shipKey].name})`);

  // `hulk`는 사라지지 않았다: 지중해의 시작배이자, 청산하면 남는 배다
  ok(SHIPS[BANKRUPT.keepShip]?.leak > 0,
     `청산 뒤 남는 배는 여전히 물이 샌다 (${SHIPS[BANKRUPT.keepShip].name})`);
}

/* ══════════════════════════════════════════════════════════════
   #3 조선소 — 교역권(reach) 계단
   ══════════════════════════════════════════════════════════════
   사용자 지시: *"공업력이 올라가면서 점점 지어지는 배가 많아지고 교역이 잘 이뤄지는 곳의
   배를 먼저 만들 수 있게 해"*. 검사가 봐야 하는 것은 셋이다 —
     ① 계단인가(공업력이 오를수록 목록이 늘어나고, 꼭대기에서 다시 전부가 되는가)
     ② 가까운 바다의 배가 먼 바다 배보다 먼저 열리는가
     ③ **막다른 길이 없는가**(어느 시작 항구에서도 첫 배 사다리가 선다) */
{
  resetGame();
  const keys = Object.keys(SHIPS);
  /* ★ **`tier 0`은 시중에 안 나오는 배다** — 아홉 바다의 삭은 시작배가 전부 그것이다.
     `tierNeeded`가 `Infinity`를 돌려주므로 조선소·중고·나포 어느 문으로도 안 나온다.
     계단을 잴 때는 **팔 수 있는 배**만 센다 — 안 그러면 시작배를 늘릴 때마다 이 검사가 깨진다. */
  const sellable = keys.filter((k) => (SHIPS[k].tier ?? 0) > 0);
  const openAt = (cityId) => sellable.filter((k) => yardCapable(k, cityId)).length;

  // ① 계단 — 같은 항구에서 공업력만 올려 본다(A-2 승급을 흉내 낸다)
  const step = [];
  for (let boost = 0; boost <= 3; boost++) {
    state.yards = { rodos: { boost } };
    step.push(openAt('rodos'));
  }
  state.yards = {};
  ok(step[0] < step[1] && step[1] < step[2] && step[2] < step[3],
     `공업력이 오를수록 목록이 는다 — 로도스 ${step.join(' → ')}종 (공업력 1→2→3→4)`);
  ok(step[3] >= sellable.length - 1,
     `꼭대기(공업력 ${YARD.cap})에서는 팔 수 있는 배가 사실상 전부 열린다 — ${step[3]}/${sellable.length}종`
     + ` (시중에 안 나오는 tier 0 ${keys.length - sellable.length}종은 제외)`);

  // ② 교역권 — 가까운 바다가 먼 바다보다 걸음이 짧다
  ok(yardReach('caravel', 'venezia') <= 1 && yardReach('caravel', 'nagasaki') > 2,
     `카라벨: 베네치아 ${yardReach('caravel', 'venezia')}걸음 · 나가사키 ${yardReach('caravel', 'nagasaki')}걸음`);
  /* ★ 실제 문(`sellsShip`)으로도 본다 — `yardCapable`만 검사하면 규칙을 `sellsShip`에서
     떼어내도 이 파일이 통과한다(일부러 떼어 보고 확인했다). 조선소 화면·구입·값·중고가
     전부 `sellsShip`을 지나므로 그것이 진짜 문이다. */
  ok(!sellsShip('caravelao', 'nagasaki'),
     '나가사키에서 브라질 카라벨랑을 짓지 않는다 — 사용자가 짚은 바로 그 자리');
  ok(sellsShip('caravelao', 'salvador'), '살바도르(제 고장)에서는 그대로 짓는다');
  ok(!sellsShip('caravel', 'nagasaki') && sellsShip('caravel', 'napoli'),
     '카라벨도 마찬가지 — 나가사키 ✗ · 나폴리(제 나라·전통 조선지) ✓');
  ok(yardReach('pingtouchuan', 'busanpo') <= 1,
     `제 바다의 배는 한 걸음 안 — 부산포의 평두선 ${yardReach('pingtouchuan', 'busanpo')}걸음`);
  ok(yardShortOf('caravel', 'nagasaki')?.why === 'reach',
     `못 짓는 까닭을 「교역권」이라고 답한다 — ${yardShortOf('caravel', 'nagasaki')?.word}`);
  ok(yardShortOf('carrack', 'rodos')?.why === 'tier',
     '기술이 모자란 것은 여전히 「공업력」이라고 답한다 — 로도스의 캐랙');

  // 한 선종이 온 세계에서 지어지던 것이 끝났다 (전에는 10종이 240곳, 67종이 100곳 넘었다)
  const wide = sellable.filter((k) => CITIES.filter((c) => yardCapable(k, c.id)).length > 100);
  ok(wide.length === 0, `100곳 넘는 곳에서 지어지는 선종이 없다 (전에는 67종) — 지금 ${wide.length}종`);

  // ③ 막다른 길 — 시작 항구마다 「이 항구 또는 이웃」에 낡은 바사보다 나은 배가 있다
  const nb = {};
  for (const [a, b] of ROUTES) { (nb[a] ??= []).push(b); (nb[b] ??= []).push(a); }
  /* ★ 기준은 `hulk`가 아니라 **그 자리의 시작배**다 — 시작배가 바다마다 갈렸기 때문이고(`startShipAt`),
     지중해의 낛은 바사로 재면 남아메리카에서 거짓 통과가 난다. */
  const better = (cid, base) => sellable
    .some((k) => SHIPS[k].cargo > base && !SHIPS[k].requires && yardCapable(k, cid));
  const spots = [...new Set([...ORIGINS.map((o) => o.at), ...START_PORTS.map((p) => p.at)])];
  const stuck = spots.filter((at) => {
    const base = SHIPS[startShipAt(at)]?.cargo ?? SHIPS.hulk.cargo;
    return !better(at, base) && !(nb[at] ?? []).some((o) => better(o, base));
  });
  ok(stuck.length === 0,
     `시작 자리 ${spots.length}곳 어디서도 첫 배 사다리가 끊기지 않는다`
     + `${stuck.length ? ` — 막힌 곳: ${stuck.join('·')}` : ''}`);

  // 중고 매대로도 안 샌다 — 신조를 막아 놓고 중고로 흘러들면 규칙이 없는 것과 같다
  let leak = 0;
  for (let d = 0; d < 90; d++) {
    for (const lot of usedListings('nagasaki', d)) {
      if (yardReach(lot.key, 'nagasaki') > industryOf('nagasaki') + 1) leak++;
    }
  }
  ok(leak === 0, `중고 매대도 교역권을 본다 — 나가사키 90일 표본에서 샌 매물 ${leak}건`);
}

/* ══════════════════════════════════════════════════════════════
   #4 계절풍 — 「막지 않고 값을 물린다」
   ══════════════════════════════════════════════════════════════
   사용자 지시: *"계절풍은 있어야지"*. 사료는 「통행 불가」라고 적지만 이 프로젝트는
   막지 않는 쪽을 두 번 골랐고, 무엇보다 **항구에 시간이 없어**(advanceDays가 항해에서만
   불린다) 막으면 갇힌 사람이 철이 바뀌기를 기다릴 방법이 없다. → `data.js: SEASON` */
{
  resetGame();
  const SUM = 0, WIN = Math.floor(YEAR_DAYS / 2);
  ok(seasonOf(SUM) === 'summer' && seasonOf(WIN) === 'winter',
     `철은 반년마다 바뀐다 — 0일 ${seasonOf(SUM)} · ${WIN}일 ${seasonOf(WIN)}`);

  // 발트 — 한자법의 겨울 폐쇄
  ok(routeSeason('danzig', 'lubeck') === 'summer',
     '발트(단치히~뤼베크)는 여름에 연다 — 한자법 2/22~11/11');
  ok(inRouteSeason('danzig', 'lubeck', SUM) === true
     && inRouteSeason('danzig', 'lubeck', WIN) === false,
     '겨울의 발트는 철이 아니다');
  ok(routeSeason('lisboa', 'sevilla') === null,
     '계절이 안 걸린 항로는 null — 대부분의 항로가 그렇다(이베리아 연안)');

  // ★ 막지 않는다 — 갈 수는 있다. 대신 훨씬 오래 걸리고 요율이 오른다.
  const dSum = voyageDays('danzig', 'lubeck', SUM);
  const dWin = voyageDays('danzig', 'lubeck', WIN);
  ok(dWin > dSum, `철을 어기면 오래 걸린다 — 단치히~뤼베크 여름 ${dSum}일 → 겨울 ${dWin}일`);
  ok(seasonFactor('danzig', 'lubeck', WIN) === SEASON.offSpeed
     && seasonFactor('danzig', 'lubeck', SUM) === 1,
     `속력 배율 ${SEASON.offSpeed} (제철엔 1 — **상은 안 준다**)`);
  ok(seasonRiskMul('danzig', 'lubeck', WIN) === SEASON.offRisk,
     `요율 배율 ${SEASON.offRisk}`);
  /* ★ **배선을 직접 본다.** "겨울이 여름보다 오래 걸린다"만으로는 모자란다 — 바람도
     날짜로 바뀌므로 `routeFactor`에서 철을 떼어내도 그 부등식은 그대로 서 있었다(일부러 떼어 확인했다).
     그래서 곱해진 것을 식으로 맞춰 본다 — 일수 계산은 `routeFactor` 한 곳으로 닫혀 있다. */
  ok(Math.abs(routeFactor('danzig', 'lubeck', WIN)
              - windFactor('danzig', 'lubeck', WIN) * currentFactor('danzig', 'lubeck') * SEASON.offSpeed) < 1e-9,
     'routeFactor가 철을 실제로 곱한다 — 바람·해류와 나란히');
  ok(Math.abs(routeFactor('lisboa', 'sevilla', WIN)
              - windFactor('lisboa', 'sevilla', WIN) * currentFactor('lisboa', 'sevilla')) < 1e-9,
     '계절이 안 걸린 항로는 종전과 한 치도 같다');
  ok(encounterOdds({ from: 'danzig', to: 'lubeck', day: WIN })
     > encounterOdds({ from: 'danzig', to: 'lubeck', day: SUM }),
     '철을 어기면 해적을 더 만난다');
  const iSum = insuranceFor({ from: 'danzig', to: 'lubeck', value: 10000, day: SUM });
  const iWin = insuranceFor({ from: 'danzig', to: 'lubeck', value: 10000, day: WIN });
  ok(iWin > iSum, `보험료도 오른다 — 여름 ${iSum}닢 → 겨울 ${iWin}닢 (화물 10,000닢)`);

  /* ⚠️ **막히면 안 된다** — 이 프로젝트가 두 번 고른 답이고, 항구에 시간이 없어
     막으면 진짜 데드락이 된다. 겨울에도 발트 안쪽에서 나가는 길이 서 있어야 한다. */
  ok(Number.isFinite(dWin) && dWin > 0, '철을 어겨도 항해 일수가 나온다 — 막지 않는다');
  ok(escortNeed('sevilla', 'havana') === 2,
     '입장권(원양 동행 의무)은 철과 무관하다 — routeRisk를 안 건드렸기 때문');

  // 인도양 — 두 해안이 **반대 철**에 연다. 이 바다의 성격이 규칙에 있는지 본다.
  ok(routeSeason('calicut', 'cochin') === 'winter'
     && routeSeason('masulipatnam', 'pulicat') === 'summer',
     '인도양은 서안(말라바르)과 동안(코로만델)이 반대 철에 연다');

  // 원양 — `monsoon: true`가 드디어 값을 물린다
  ok(routeSeason('aden', 'calicut') === 'summer', '원양 아덴~캘리컷은 여름 계절풍 항로다');
  const lab = routeSeasonLabel('aden', 'calicut', WIN);
  ok(lab && !lab.open && lab.text.includes('철 아님'),
     `항로 카드가 그것을 말한다 — "${lab?.text}"`);
  ok(routeSeasonLabel('lisboa', 'sevilla', WIN) === null,
     '계절이 안 걸린 항로에는 줄을 안 만든다');

  /* ★ 계절풍은 **방향을 가린다** — 반년마다 뒤집히기 때문이다(2026-08-27).
     전에는 왕복이 같은 철을 요구해 **어느 한쪽 다리는 언제나 철을 어겼다.**
     결빙(`ROUTE_SEASON`)은 그대로 대칭이어야 한다 — 얼음은 오가는 두 방향에 똑같이 걸린다. */
  ok(routeSeason('nagasaki', 'hoian') === 'winter'
     && routeSeason('hoian', 'nagasaki') === 'summer',
     '계절풍은 방향을 가린다 — 주인선은 겨울에 내려가 여름에 돌아온다');
  ok(routeSeason('aden', 'calicut') === 'summer'
     && routeSeason('calicut', 'aden') === 'winter',
     '인도양 원양도 같다 — 여름 남서풍에 건너가 겨울 북동풍에 돌아온다');
  ok(routeSeason('danzig', 'lubeck') === routeSeason('lubeck', 'danzig'),
     '결빙은 대칭이다 — 얼음은 방향을 안 가린다');
  ok(seasonFactor('hoian', 'nagasaki', SUM) === 1
     && seasonFactor('nagasaki', 'hoian', SUM) === SEASON.offSpeed,
     '그 방향성이 일수에 실제로 곱해진다(같은 날 같은 구간인데 두 방향이 갈린다)');
}

/* ── C-18 · 부두는 살 수 없고 나라가 짓는다 (2026-08-28 설계 변경) ────
   사용자 지시: *"부두는 거점이 될수 없고 (…) 그 국가에 이익이 쌓이면 차근차근 국가에서
   조선소 부두를 만들고 (…) 거점은 국영말고 다른것들이 되어야지 번화가 상점 여관같은거 말야."*
   ★ 실측이 잡아낸 옛 구멍이 이것이다 — **부산포에서 1일차에 두 클릭(200,500닢)으로 공업력 3.**
     여기서 지키는 것은 그 두 클릭이 다시 생기지 않는 것이다. */
{
  resetGame('busanpo');
  state.crew = 10;

  ok(!HOLDING_KEYS.includes('dock') && !HOLDINGS.dock,
     '거점 목록에 「부두」가 없다 — 살 수 있는 것이 아니다');
  ok(!!HOLDINGS.slipway,
     '조선대(slipway)는 남았다 — 내 배를 손보는 민간 시설이라 국영이 아니다');
  ok(HOLDINGS.slipway.requires == null,
     '조선대는 말단이다 — 부두가 사라졌으므로 뒤에 이어지는 것이 없다');

  /* ① 1일차 두 클릭이 사라졌다 — 부산포는 base 2에서 안 움직인다 */
  const before = industryOf('busanpo');
  buyHolding('slipway', 'busanpo');       // 살 수 있는 것을 다 사도
  ok(industryOf('busanpo') === before && before === 2,
     `1일차에 돈으로 공업력을 못 올린다 — 부산포 ${before} 그대로 (옛 규칙은 두 클릭에 3이었다)`);

  /* ② 세를 내면 쌓인다 — `noteDues`가 유일한 입구다 */
  const p0 = civicProgress('busanpo');
  ok(p0.need === CIVIC.dues[2] && p0.paid === 0,
     `문턱은 지금 공업력이 정한다 — 부산포(공업력 2)는 ${p0.need.toLocaleString('en-US')}닢`);
  /* ★ 「국가를 거쳐 항구로」 이후 **낸 것과 쌓인 것이 다르다** — 낸 세의 일부는 다른 항구로 간다.
     그래서 검사도 「얼마를 냈나」가 아니라 **「그 항구에 얼마가 쌓였나」**로 센다. */
  let paid0 = 0;
  /* 한 번에 크게 내면 문턱을 **건너뛴다** — 잘게 내서 바로 아래에 세운다(경계를 재는 검사다) */
  while (duesOf('busanpo') < p0.need - 20) { noteDues('busanpo', 10); paid0 += 10; }
  ok(duesOf('busanpo') < p0.need && !civicProgress('busanpo').ready && !civicBuilding('busanpo'),
     `문턱 바로 아래에서는 공사가 안 걸린다 (${duesOf('busanpo').toLocaleString('en-US')}/${p0.need.toLocaleString('en-US')})`);
  ok(paid0 > p0.need,
     `쌓인 것보다 **더 많이 냈다** — ${paid0.toLocaleString('en-US')}닢 내서 ${duesOf('busanpo').toLocaleString('en-US')}닢이 쌓였다`
     + ' (나머지는 그 나라의 다른 항구로 흘렀다)');
  noteDues('busanpo', 100);      // 이 한 번이 문턱을 넘긴다
  const b = civicBuilding('busanpo');
  ok(!!b && b.to === 3, '문턱을 넘으면 나라가 **스스로** 공사를 건다 — 플레이어의 단추가 아니다');
  ok(industryOf('busanpo') === 2,
     '★ 즉시가 아니다 — *"차근차근"*. 공사 중에는 공업력이 그대로다');
  ok(yardBusy('busanpo') && !sellsShip('panokseon', 'busanpo'),
     '공사 중에는 그 항구가 배를 못 짓는다 — 내가 건 공사와 같은 대가를 문다');

  /* ③ 공기가 지나면 오른다. 들르지 않아도 읽는 쪽은 참을 본다 */
  state.day += CIVIC.days[2];
  ok(industryOf('busanpo') === 3,
     `공기 ${CIVIC.days[2]}일이 지나면 오른다 — 들르지 않아도 industryOf가 참을 본다`);
  ok(civicOf('busanpo') === 1 && (state.yards.busanpo.boost ?? 0) === 0,
     '★ 나라 몫(civic)과 내가 산 승급(boost)을 따로 센다 — 섞으면 누가 올린 칸인지 못 되묻는다');
  tickCivic('busanpo');
  ok(state.yards.busanpo.civic === 1 && !civicBuilding('busanpo'),
     'tickCivic은 그것을 장부에 옮기고 로그를 띄울 뿐 — 값은 안 바뀐다');

  /* ④ 나라 몫에는 상한이 있다 (옛 `HOLDING.industryCap`이 있던 자리) */
  ok(civicRoom('busanpo') === 0 && civicProgress('busanpo').capped,
     `나라가 올리는 것은 공업력 ${CIVIC.cap}까지다 — 그 위는 내 돈과 자재뿐이다`);
  noteDues('busanpo', 10 ** 7);
  ok(industryOf('busanpo') === 3,
     '상한을 넘겨 세를 내도 더 안 오른다 — 무역만으로 꼭대기에 닿지 않는다');

  /* ⑤ **국가를 거쳐 항구로**(2026-08-28 사용자 결정) — 셋을 함께 지킨다:
     ⓐ 총량 보존(세를 새로 만들지 않는다) ⓑ 주항구가 가장 많이 받는다
     ⓒ 다른 항구에도 흘러들되 **동시에 다 올라가지는 않는다**(「차근차근」) */
  resetGame('busanpo');
  state.crew = 10;
  noteDues('yeompo', 100000);                 // 염포에 냈는데
  const spread = CITIES.filter((c) => c.flag === 'joseon')
    .map((c) => ({ id: c.id, v: duesOf(c.id) })).sort((a, b) => b.v - a.v);
  const total = spread.reduce((a, b) => a + b.v, 0);
  ok(total === 100000,
     `★ 총량이 보존된다 — 100,000닢을 내면 조선 아홉 항구에 정확히 ${total.toLocaleString('en-US')}닢이 쌓인다`
     + ' (세를 새로 만들지 않는다)');
  ok(spread[0].id === 'yeompo',
     `낸 그 항구가 가장 많이 받는다 — 염포 ${spread[0].v.toLocaleString('en-US')}닢`
     + ` (`+ Math.round(spread[0].v / 1000) + '%) · 「차근차근」이 사는 자리다');
  ok(duesOf('busanpo') > 0 && duesOf('busanpo') < duesOf('yeompo'),
     `★ 나라를 거쳐 다른 항구로도 흘러든다 — 부산포 ${duesOf('busanpo').toLocaleString('en-US')}닢`
     + ' (안 흘러들면 사용자 결정 「둘 다」가 반만 구현된 것이다)');
  ok(duesOf('busanpo') === Math.max(...spread.filter((x) => x.id !== 'yeompo').map((x) => x.v)),
     '주항구가 나머지 중 가장 많이 받는다 — `CIVIC.spill.mainBonus`');
  ok(mainPortOf('joseon') === 'busanpo' && mainPortOf('joseon') === mainPortOf('joseon'),
     '주항구는 정적 데이터로 정해진다 — 판마다·부를 때마다 안 변한다');
  ok(duesOf('venezia') === 0,
     '깃발이 다르면 한 닢도 안 간다 — 나라를 거치는 것이지 세계를 거치는 것이 아니다');
  /* ⓓ 상한에 닿은 항구는 배분에서 빠진다 — 남은 항구 몫은 **늘기만** 한다(줄면 선 공사가 취소된다) */
  const beforeSplit = civicSplit('joseon').length;
  state.yards.busanpo = { boost: 0, building: null, civic: 1 };   // 부산포 base2 + civic1 = 상한
  ok(civicSplit('joseon').length === beforeSplit - 1
     && !civicSplit('joseon').some((x) => x.id === 'busanpo'),
     '꼭대기에 닿은 항구에는 더 안 흘러든다 — 몫이 새지 않는다');

  /* ⑥ 파는 순간 실제로 쌓인다 — 배선이 `sell()`에 붙어 있나 */
  resetGame('busanpo');
  state.crew = 10;
  state.gold = 200000;
  const gid = Object.keys(state.prices[state.at])[0];
  buy(gid, 5);
  const d0 = duesOf('busanpo');
  sell(gid, 5);
  ok(duesOf('busanpo') > d0,
     `팔면 그 자리에서 쌓인다 — ${d0} → ${duesOf('busanpo')}닢 (관세를 떼는 곳이 곧 세는 곳)`);

  /* ⑦ 화면이 읽는 값은 한 곳에서 온다 */
  const hint = industryPathHint('yeompo');
  const prog = civicProgress('yeompo');
  ok(hint && hint.trade && hint.trade.need === prog.need && hint.trade.left === prog.left,
     '★ 두 화면이 같은 수를 쓴다 — industryPathHint가 civicProgress를 그대로 읽는다');
  ok(hint.buy && hint.buy.gold > 0 && hint.trade.need > 0,
     '길이 둘이다 — 내 돈으로 승급(금화·자재) ↔ 내 교역으로 나라 조선소(낸 세)');

  /* ⑧ 조선의 끝이 막히지 않는다 — 두 길 중 어느 쪽으로든 염포 3에 닿는다 */
  resetGame('busanpo');
  state.crew = 10;
  let bill = 0;
  const payUntil = (id, want) => { while (duesOf(id) < want) { noteDues(id, 250); bill += 250; } };
  payUntil('yeompo', CIVIC.dues[1]);          // 염포 base 1 → 2
  state.day += CIVIC.days[1];
  payUntil('yeompo', CIVIC.dues[2]);          // 2 → 3
  state.day += CIVIC.days[2];
  ok(industryOf('yeompo') === 3,
     `교역만으로 염포 공업력 3에 닿는다 — **낸 세 ${bill.toLocaleString('en-US')}닢**`
     + ` (쌓인 ${duesOf('yeompo').toLocaleString('en-US')}닢) · 공사 ${CIVIC.days[1] + CIVIC.days[2]}일`);
  /* ★ 앵커 — 옛 부두 한 칸이 약 30,000닢이었다. 「국가를 거쳐 항구로」로 회수율이 55%가 되면서
     문턱을 0.55배로 되돌려 곱했으므로, **납부액**이 그 앵커 자리에 그대로 앉아야 한다. */
  ok(bill > 25000 && bill < 70000,
     `그 값이 앵커 구간 안이다 — ${bill.toLocaleString('en-US')}닢 (옛 부두 100,000닢 · 한 칸 약 30,000닢 납부)`);
  ok(endingProgress().steps.find((s) => s.key === 'yards').detail.includes('염포 3/3'),
     '끝 카드가 그것을 말한다 — ENDING 판정이 나라 조선소를 센다');

  /* ⑨ 번화가 — 사용자가 콕 집은 셋째 부동산 */
  ok(ESTATE_KEYS.includes('bazaar') && HOLDINGS.bazaar.grades.length === 3,
     '번화가가 부동산이다 — 등급 셋(골목 행랑 · 시전 행랑 · 번화가)');
  for (let i = 0; i < 3; i++) {
    const b = HOLDINGS.bazaar.grades[i], sh = HOLDINGS.shop.grades[i];
    ok(b.vacancy < sh.vacancy && b.yield < sh.yield
       && (b.priceBase + 2 * b.priceBySize) > (sh.priceBase + 2 * sh.priceBySize),
       `번화가 ${i + 1}급은 가게보다 **덜 비고 덜 벌고 더 비싸다** — 줄은 한둘이 비어도 굴러간다`);
  }
  ok(HOLDINGS.bazaar.grades[0].industry === 1,
     '★ 번화가 1등급이 공업력 1을 요구한다 — 나라가 조선소를 올린 항구라야 줄이 선다(②↔③이 맞물린다)');

  /* ⑩ 옛 세이브 — 부두를 세워 둔 판이 **공업력 한 칸도 안 움직인 채** 열린다 */
  resetGame('busanpo');
  state.crew = 10;
  state.holdings.yeompo = { paid: 1, spent: 100000, slipway: true, dock: true };
  const wasInd = 1 + 1;                       // 옛 규칙: 염포 base 1 + 부두 1
  saveGame();
  resetGame('busanpo');
  loadGame();
  ok(!state.holdings.yeompo.dock && state.yards.yeompo?.civic === 1,
     '옛 세이브의 `holdings[].dock`이 `yards[].civic` 한 칸으로 옮겨진다');
  ok(industryOf('yeompo') === wasInd,
     `★ 이어한 판의 공업력이 안 움직인다 — 염포 ${industryOf('yeompo')} (옛 규칙과 같다)`);
  clearSave();
}

/* ── 조우 손실 상한 (2026-08-28 · 사용자 결정 「상한 + 선원 바닥」) ──────────
   ★ **이 회차 최대의 밸런스 변경인데 그물이 0개였다**(개발자 B가 스스로 지적).
     손실이 금고의 비율이고 상한이 없으면 금고에 자연 상한이 선다 —
     `G* = 항차이익 / (조우율 × 손실률)`. 여기서 지키는 것은 그 천장이 다시 내려오지 않는 것이다.
   ⚠️ 규칙 함수는 **`state.js`**를 잰다 — `scenes/battle.js`는 node에서 import하면
     `main.js: boot()`가 돌아 게임이 통째로 뜬다. 두 사본이 갈라지지 않게 아래 ⑦이 묶는다. */
{
  const EL = ENCOUNTER_LOSS;

  /* ① **초반은 한 자리도 안 바뀐다** — 상한이 초반을 건드리면 실패해야 한다 */
  const foe1 = { crew: 22, level: 1 };          // 세기 1 좀도둑
  ok(capEncounterLoss(200 * EL.loseShare, foe1.crew, foe1.level) === 100,
     '금고 200닢에서 패배 손실은 정확히 100닢 — 상한이 붙기 전과 한 자리도 안 다르다');
  ok(capEncounterLoss(200 * EL.loseShare, foe1.crew, foe1.level) === Math.round(200 * EL.loseShare),
     '초반에는 상한이 아예 안 걸린다 — 날 비율 그대로다 (어려움은 있던 자리에 그대로 둔다)');

  /* ② **상한은 「적의 크기」로 잰다** — 내 자산의 비율로 재면 `G*`가 한 치도 안 움직인다.
     이 설계의 심장이라 「자산에 비례하지 않는다」를 못으로 박는다. */
  const capSmall = encounterLossCap(22, 1);
  const capBig = encounterLossCap(130, 5);
  ok(capBig > capSmall && capSmall === Math.max(EL.floor, 22 * EL.perCrew),
     `상한이 적 선원 수를 따라간다 — 22명 ${capSmall.toLocaleString('en-US')}닢 · 130명 ${capBig.toLocaleString('en-US')}닢`);
  {
    /* 같은 적에게 금고만 열 배로 늘려 본다. 자산 비례라면 손실도 열 배여야 한다. */
    const lo = capEncounterLoss(100000 * EL.fleeShare, 22, 1);
    const hi = capEncounterLoss(1000000 * EL.fleeShare, 22, 1);
    ok(hi / lo < 3,
       `★ 금고가 열 배가 되어도 손실은 ${(hi / lo).toFixed(2)}배뿐이다 — 상한이 **내 자산이 아니라 적의 크기**로`
       + ` 재진다는 증거다 (자산 비례면 10배가 되고 그러면 천장이 그대로 남는다)`);
    ok(encounterLossCap(22, 1) === capEncounterLoss(1e9, 22, 1) - Math.round((1e9 - encounterLossCap(22, 1)) * EL.tail),
       '상한 위로는 `tail`만큼만 더 간다 — `capSpoils`와 같은 모양(큰 놈이 여전히 더 아프다)');
  }

  /* ③ **천장이 실제로 걷혔나** — `G* = P / (q × share × tail)`.
     P·q는 `.playtest/round-22/probe-purse.mjs` 실측(항차 순이익 2,000닢 · 값나가는 짐 조우율 35.9%). */
  {
    const P = 2000, q = 0.359, TARGET = 912630;      // 패권 거점 총투자(실측)
    const gStar = (tail) => P / (q * EL.fleeShare * tail);
    ok(gStar(EL.tail) > TARGET,
       `후반 천장이 패권 총투자 위에 있다 — G* ${Math.round(gStar(EL.tail)).toLocaleString('en-US')}닢`
       + ` > ${TARGET.toLocaleString('en-US')}닢 (tail ${EL.tail})`);
    /* ★ 이 검사에 이빨이 있나 — 옛 값(0.10)이면 실제로 떨어져야 한다.
       안 떨어지면 검사가 아니라 벽지다(이 저장소가 `ok()`의 exit code로 한 번 겪은 자리). */
    ok(gStar(0.10) < TARGET,
       `그 검사에 이빨이 있다 — tail 0.10이면 G*가 ${Math.round(gStar(0.10)).toLocaleString('en-US')}닢으로 목표 아래다`);
  }

  /* ④ **선원 바닥은 하한이지 회복이 아니다** — `min(지금, 바닥)`이라 사람을 주지 않는다 */
  resetGame('busanpo');
  ok(crewAfterLoss(42) === 21, `패배하면 선원이 절반 — 42 → ${crewAfterLoss(42)}`);
  ok(crewAfterLoss(3) === 3 && crewAfterLoss(2) === 2 && crewAfterLoss(1) === 1,
     '★ 바닥이 선원을 **주지는 않는다** — 3명이면 3명, 1명이면 1명 그대로다');
  for (const n of [0, 1, 2, 3, 5, 8, 13, 40, 200]) {
    if (crewAfterLoss(n) > n) ok(false, `바닥이 사람을 만들어 냈다 — ${n} → ${crewAfterLoss(n)}`);
  }
  ok(true, '어떤 인원에서도 패배가 선원을 늘리지 않는다 (0·1·2·3·5·8·13·40·200 전수)');
  ok(crewAfterLoss(8) >= EL.crewFloor || crewAfterLoss(8) === 8,
     `바닥 아래로는 안 내려간다 — 8명 → ${crewAfterLoss(8)} (절대 바닥 ${EL.crewFloor})`);

  /* ⑤ **`keepAfloat`는 꺼진 채다** — 사용자가 ⓑ 하한 보장을 **채택하지 않았다**(*"파산의 긴장은 남긴다"*).
     ★ 조용히 아무것도 안 하는 손잡이를 두지 않으려고 **일부러 배선하지 않았다.**
       이 검사는 그 사실을 못으로 박는다 — 나중에 누가 `true`로 되돌리면 배선 없이 켜진 척하게 된다. */
  ok(EL.keepAfloat === false,
     '`keepAfloat`는 false다 — 사용자가 하한 보장을 채택하지 않았다(파산의 긴장은 남긴다)');

  /* ⑥·⑦ **화면과 규칙이 갈라지지 않았나** — 소스를 읽어 구조를 본다.
     ⚠️ 값이 아니라 **배선**을 재는 검사다. `scenes/*`는 node에서 못 불러오므로(게임이 뜬다)
       이 셋만은 텍스트로 잰다 — 그래도 "두 곳이 각자 계산한다"는 사고는 여기서 잡힌다. */
  {
    const battleSrc = readFileSync(new URL('../js/scenes/battle.js', import.meta.url), 'utf8');
    const mapSrc = readFileSync(new URL('../js/scenes/map.js', import.meta.url), 'utf8');

    /* ⑥ 광고된 값 = 무는 값 — 도주 비용을 **한 번만** 재서 라벨과 차감이 같은 변수를 쓴다 */
    ok((mapSrc.match(/capEncounterLoss\(/g) || []).length === 1,
       '도주 비용을 **한 번만** 잰다 — 두 번 재면 라벨과 차감이 갈려 조우 카드가 거짓말을 한다');
    ok(/const fleeCoin = capEncounterLoss\(/.test(mapSrc)
       && /금화 \$\{fleeCoin/.test(mapSrc) && /const coin = fleeCoin;/.test(mapSrc),
       '★ 라벨과 차감이 **같은 `fleeCoin`**을 쓴다 — 고르기 전에 보여 준 값이 곧 무는 값이다');
    ok(!/state\.gold\s*\*\s*0\.12/.test(mapSrc) && !/state\.gold\s*\*\s*0\.5\b/.test(battleSrc),
       '상한 없는 날 비율(`state.gold * 0.12` · `* 0.5`)이 씬에 남아 있지 않다');

    /* ⑦ 식이 갈라졌나 — `battle.js`의 쌍둥이가 `state.js`와 **같은 식**이거나, 아예 import로 바뀌었거나 */
    const imported = /import\s*\{[^}]*capEncounterLoss[^}]*\}\s*from\s*'\.\.\/state\.js'/.test(battleSrc);
    const sameFormula = /cap \+ \(v - cap\) \* ENCOUNTER_LOSS\.tail/.test(battleSrc)
                     && /Math\.max\(ENCOUNTER_LOSS\.floor, Math\.round\(crew \* ENCOUNTER_LOSS\.perCrew\)\)/.test(battleSrc);
    ok(imported || sameFormula,
       imported
         ? '`battle.js`가 `state.js`의 규칙을 import한다 — 사본이 사라졌다(가장 좋은 상태)'
         : '★ `battle.js`의 쌍둥이 식이 `state.js`와 아직 같다 — 갈라지면 여기서 걸린다'
           + ' (B가 import로 갈아 끼우면 이 줄이 위 문구로 바뀐다)');
    ok(/keepAfloat/.test(battleSrc) === false || /배선하지 않/.test(battleSrc),
       '`keepAfloat`는 배선되지 않았다 — 켜도 아무 일이 안 나는 손잡이를 두지 않는다');
  }
}

/* ── 상단(商團) — 자본이 물가를 누른다 (회차 25) ───────────────────────────
   ★ 이 절이 지키는 것은 **부호**다. 값이 아니라 방향이 틀리면 물가가 안 좁혀진다.
   ★ **판정에 「무엇과 비교해서」를 넣는다** — 이 저장소가 「최고선 ✓」가 강등에 찍혀 있는
     것을 겪은 뒤의 규약이다. 그래서 아래 검사는 대부분 **같은 실행 안에서 두 번 재서
     차이를 찍는다**(성공 로그를 믿지 않는다). */
{
  const { GUILD } = await import('../js/data.js');
  const { HOUSES } = await import('../js/npc/houses.js');
  const { startCapital, fleetOf, mightOf, initGuilds, guildTick, guildRank,
          liveHouses, guildHistory, guildsAtCity } =
    await import('../js/npc/guild.js');
  const { REGIONS } = await import('../js/regions/index.js');
  const { readFileSync: rf } = await import('node:fs');

  resetGame();

  /* ① 명부 — 바다마다 얼굴이 있나 */
  const seas = REGIONS.filter((r) => (r.mod.geo.CITIES ?? []).length).map((r) => r.id);
  const empty = seas.filter((id) => !HOUSES.some((h) => h.region === id));
  ok(HOUSES.length >= 20 && empty.length === 0,
     `상단 명부 ${HOUSES.length}곳 · 빈 바다 ${empty.length}개${empty.length ? ` (${empty.join(',')})` : ''}`);

  /* ② **상단이 없으면 옛 값 그대로다** — 기준선이 안 움직였다는 증거 */
  ok(guildFactor('venezia', 'grain') === 1,
     '상단이 손 안 댄 항구·품목은 계수가 정확히 1이다 — 옛 값과 한 닢도 안 다르다');

  /* ③ ★ **부호** — 사가면 오르고, 부으면 내린다. 같은 실행에서 두 번 재서 차이를 찍는다 */
  refreshPrices();
  const p0 = priceOf('venezia', 'grain');
  addGuildFlow('venezia', 'grain', -marketDepth('venezia') * 0.1 / GUILD.flowK);
  const pUp = priceOf('venezia', 'grain');
  addGuildFlow('venezia', 'grain', +marketDepth('venezia') * 0.2 / GUILD.flowK);
  const pDown = priceOf('venezia', 'grain');
  ok(pUp > p0, `상단이 **사가면 값이 오른다** — ${p0} → ${pUp}닢 (flow < 0)`);
  ok(pDown < p0, `상단이 **부으면 값이 내린다** — ${p0} → ${pDown}닢 (flow > 0)`);

  /* ④ 상한이 실제로 선다 — 없으면 「어렵게」가 「불가능」이 된다 */
  addGuildFlow('venezia', 'grain', 1e9);
  const f = guildFactor('venezia', 'grain');
  ok(Math.abs(f - (1 - GUILD.priceCap)) < 1e-9,
     `아무리 부어도 ±${(GUILD.priceCap * 100).toFixed(0)}%를 못 넘는다 — 구조 사다리가 안 뒤집힌다 (계수 ${f.toFixed(3)})`);

  /* ⑤ 삭는다 — 상단이 손을 놓으면 값이 되돌아온다 */
  state.guildFlow = { venezia: { grain: 100 } };
  decayGuildFlow(30);
  const left = guildFlowOf('venezia', 'grain');
  ok(left > 0 && left < 100 * 0.9,
     `자국은 삭는다 — 30일 뒤 100 → ${left.toFixed(1)} (반감기 ≈ ${Math.round(Math.log(0.5) / Math.log(GUILD.flowDecay))}일)`);

  /* ⑥ 스위치 — 끄면 세계가 상단 이전으로 돌아간다(짝지은 측정이 이것을 쓴다) */
  state.guildFlow = { venezia: { grain: -400 } };
  const onF = guildFactor('venezia', 'grain');
  GUILD.enabled = false;
  const offF = guildFactor('venezia', 'grain');
  GUILD.enabled = true;
  ok(onF !== 1 && offF === 1, `GUILD.enabled를 끄면 계수가 1로 돌아간다 (${onF.toFixed(3)} → ${offF})`);
  state.guildFlow = {};

  /* ⑦ ★ 자본 → 힘의 사다리가 **실제로 갈린다** — 다 같으면 "부가 힘이 된다"가 거짓말이다 */
  const lad = HOUSES.map((h) => { const c = startCapital(h); return { c, f: fleetOf(c), m: mightOf(c) }; });
  const fl = new Set(lad.map((x) => x.f)), mi = new Set(lad.map((x) => x.m));
  ok(fl.size >= 2 && mi.size >= 2,
     `자본이 힘이 된다 — 선단 ${[...fl].sort().join('/')} · 세기 ${[...mi].sort().join('/')}`
     + ` (자본 ${Math.min(...lad.map((x) => x.c)).toLocaleString('en-US')}~${Math.max(...lad.map((x) => x.c)).toLocaleString('en-US')}닢)`);

  /* ⑧ ★ **상단은 지도의 정원을 안 건드린다** — 밀도를 올려 푸는 것이 아니다(QUICKMAP-world §3) */
  resetGame(); initWorld();
  const npc0 = state.npcs.length;
  guildTick(30, []);
  ok(state.npcs.length === npc0,
     `상단이 30일을 굴러도 지도 위 배는 ${npc0}척 그대로다 — 해적 밀도·조우 확률이 안 움직인다`);

  /* ⑨ ★ 상단이 **실제로 굴렀나** — 안 구르면 위 검사 전부가 아무것도 안 지킨다.
        (「+198칸을 여섯 번 찍고 실제로는 0이었다」를 겪은 뒤의 규약: 결과를 직접 센다) */
  resetGame(); initGuilds();
  for (let d = 0; d < 120; d++) { state.day++; refreshPrices(); guildTick(1, []); decayGuildFlow(1); }
  const legs = Object.values(state.guilds).reduce((a, g) => a + g.legs, 0);
  const marked = Object.keys(state.guildFlow).length;
  ok(legs > 0 && marked > 0, `상단이 120일에 항차 ${legs}회 · 자국 남긴 항구 ${marked}곳`);
  const rk = guildRank();
  /* ⚠️ **`guildRank()`는 살아 있는 상단만 낸다**(회차 26 — 문 닫은 상단이 화면 서열에 남으면 안 된다).
     그래서 `=== HOUSES.length`가 아니라 `=== liveHouses().length`로 잰다. 명부는 안 줄어든다. */
  ok(rk.length === liveHouses().length && rk.length <= HOUSES.length && rk[0].cap >= rk.at(-1).cap,
     `자본 서열이 선다 — 살아 있는 ${rk.length}/${HOUSES.length}곳 · 1위 ${rk[0].name} ${rk[0].cap.toLocaleString('en-US')}닢 · 꼴찌 ${rk.at(-1).cap.toLocaleString('en-US')}닢`);

  /* ⑨-2 ★ **흥망이 실제로 도는가**(회차 26) — 문을 닫은 상단이 있으면 **그 상관에 임자가 있어야** 한다.
     상관이 빈 항구가 생기면 화면이 설명할 길이 없다(회차 25가 이 기능을 미룬 이유). */
  {
    const hist = guildHistory();
    const orphan = [];
    for (const r of hist.rows) {
      if (!r.dead) continue;
      const def = HOUSES.find((h) => h.id === r.id);
      for (const c of (def.seats ?? [])) {
        if (!guildsAtCity(c).length) orphan.push(`${def.name}→${c}`);
      }
    }
    ok(orphan.length === 0,
       `문 닫은 ${hist.dead}곳의 상관이 전부 임자를 찾았다 — 넘어간 상관 ${hist.seatsMoved}곳`
       + (orphan.length ? ` ⛔ 빈 상관 ${orphan.slice(0, 3).join(' · ')}` : ''));
    /* 명부는 한 줄도 안 줄어든다 — 문을 닫는 것은 장부뿐이다(콘텐츠 보존) */
    ok(hist.live + hist.dead === HOUSES.length,
       `명부는 그대로다 — 살아 ${hist.live} + 문닫음 ${hist.dead} = ${HOUSES.length}곳`);
  }

  /* ⑩ ⚠️ **사건이 갓 난 자리는 상단이 안 건드린다** — 큰 기회는 플레이어의 것이다 */
  resetGame(); initGuilds();
  const hh = HOUSES.find((h) => (h.seats ?? []).length && (h.goods ?? []).length);
  addShock(hh.seats[0], hh.goods[0], 1.6, 90, 'famine');
  for (let d = 0; d < GUILD.reactDays - 1; d++) { state.day++; refreshPrices(); guildTick(1, []); }
  ok(!guildFlowOf(hh.seats[0], hh.goods[0]),
     `사건이 난 지 ${GUILD.reactDays}일 안에는 상단이 손대지 않는다 (${hh.name} · ${hh.seats[0]})`);

  /* ⑪ 도움 — 신용장이 **실제로** 매입가를 깎는다(같은 실행에서 두 번 재서 차이를 찍는다) */
  resetGame();
  const city = state.at, gid = Object.keys(CITY_BY_ID[city].supply ?? {})[0]
    ?? Object.keys(CITY_BY_ID[city].demand ?? {})[0] ?? 'grain';
  const before = costFor(gid, 10, city);
  state.guildBoon = { credit: { cities: [city], off: GUILD.creditOff, until: state.day + 30, by: 'x' }, escort: null };
  const after = costFor(gid, 10, city);
  ok(guildCredit(city) === GUILD.creditOff && after < before,
     `신용장이 매입가를 깎는다 — ${before} → ${after}닢 (−${((1 - after / before) * 100).toFixed(1)}%)`);
  state.guildBoon = null;

  /* ⑫ 도움 — 호위가 조우를 깎는다. ⚠️ **조우를 올리는 자리는 없어야 한다**(압박은 확률을 안 건드린다) */
  const nb = neighborsOf(state.at).find((x) => routeRisk(state.at, x));
  if (nb) {
    const o0 = encounterOdds({ from: state.at, to: nb });
    state.guildBoon = { credit: null, escort: { cities: [state.at], off: GUILD.escortOff, until: state.day + 30, by: 'x' } };
    const o1 = encounterOdds({ from: state.at, to: nb });
    state.guildBoon = null;
    ok(o1 < o0 && Math.abs(o1 / o0 - (1 - GUILD.escortOff)) < 1e-6,
       `호위가 조우를 깎는다 — ${(o0 * 100).toFixed(1)}% → ${(o1 * 100).toFixed(1)}%`);
  }
  const guildSrc = rf(new URL('../js/npc/guild.js', import.meta.url), 'utf8');
  ok(!/encounterOdds|ODDS_BASE|SEA_EVENTS/.test(guildSrc),
     '★ 상단은 **조우 확률을 한 줄도 안 건드린다** — 바뀌는 것은 「누가 오는가」뿐이다');

  /* ⑬ ★ **세력과 겹치지 않는다**(설계 §0) — 상단은 쥔 자리의 웃돈도, 계약 가로채기도 안 한다 */
  ok(!/gripMarkup|rollPoach|enrollOffer|convoyDue/.test(guildSrc),
     '★ 상단은 `gripMarkup`·`rollPoach`를 쓰지 않는다 — 그 둘은 **세력**의 것이다(중복 금지)');

  /* ⑬-b ★ **상단 ↔ 세력이 관계에서 만나는 자리 둘**(회차 28 · 나-1)
     회차 27은 둘을 **값**에서 만나게 했다(`gripBlocksGuild`·`guildCounter`). 여기 둘은
     **관계**에서 만난다 — 그리고 둘 다 순수한 뺄셈이라 **새 수입원이 아니다**.
     ★ 경계는 그대로다: 만나는 자리는 `state.js` 하나이고 `guild.js`는 한 줄도 안 바뀐다. */
  {
    /* ⓐ 깃발이 실제로 겹치는가 — 겹치는 곳이 0이면 이 규칙은 서 있어도 없는 것과 같다 */
    const { HOUSES } = await import('../js/npc/houses.js');
    const backed = HOUSES.filter((h) => guildBackers(h.flag).length);
    ok(backed.length > 0 && backed.length < HOUSES.length,
       `★ 뒤에 선 세력이 있는 상단이 ${backed.length}/${HOUSES.length}곳 — 전부도 0도 아니다`);
    ok(guildBackers('pirate').length === 0 && guildBackers(null).length === 0,
       '해적기 뒤에도, 깃발 없는 회사(푸거) 뒤에도 나라가 없다');

    /* ⓑ 상단의 호위선단을 꺾으면 그 깃발 뒤에 선 세력이 등을 돌린다 */
    resetGame('venezia');
    const h = backed[0], fids = guildBackers(h.flag);
    const foe = { id: 'x', houseId: h.id, flag: h.flag, nation: h.name, level: 3 };
    recordSlain(foe, 'mediterranean');       // ★ 전투 승리의 유일한 관문이 부른다
    ok(fids.every((f) => regardOf(f) === FACTION.backerRaw),
       `상단의 배를 꺾으면 그 깃발의 나라가 등을 돌린다 — ${fids.map((f) => `${f} ${regardOf(f)}`).join(' · ')}`);

    /* ⓒ ⚠️ **`houseId`가 문지기다** — 같은 깃발의 떠돌이 해적으로는 나라가 안 움직인다 */
    resetGame('venezia');
    recordSlain({ id: 'y', flag: h.flag, nation: '해적', level: 3 }, 'mediterranean');
    ok(fids.every((f) => regardOf(f) === 0),
       '★ 깃발만 같은 배로는 안 문다 — 물면 그 깃발을 단 해적을 잡아도 나라가 화내는 규칙이 된다');

    /* ⓓ 사주를 끝낸 부두에 임자가 앉아 있으면 임자도 본다. **삯은 한 닢도 안 건드린다** */
    resetGame('venezia');
    const owners = Object.keys(FACTIONS).filter((f) => gripsHere(f, 'venezia'));
    const gold0 = state.gold;
    const hit = stirSeen('venezia');
    ok(owners.length > 0 && hit?.length === owners.length
       && owners.every((f) => regardOf(f) === FACTION.stirRaw) && state.gold === gold0,
       `사주의 소란을 그 부두의 임자가 본다 — ${owners.join(' · ')} (금고는 그대로)`);
    ok(stirSeen('marseille') === null, '임자 없는 부두에서는 아무도 안 본다');

    /* ⓔ 회차 27 ⓑ가 **흥망까지 이미 담고 있다** — 상단이 문을 닫으면 웃돈이 되살아난다 */
    resetGame('venezia');
    const { initGuilds: ig } = await import('../js/npc/guild.js');
    ig();
    const live = guildCounterAt('venezia');
    for (const [id, g] of Object.entries(state.guilds)) if ((g.seats ?? []).includes('venezia')) state.guilds[id].dead = 1;
    ok(live > 0 && guildCounterAt('venezia') === 0,
       `★ 상단이 문을 닫으면 그 항구의 웃돈이 되살아난다 — 감쇠 ${(live * 100).toFixed(1)}% → 0%`);
  }

  /* ⑭ 이용 — 사주의 진척을 `sell()`이 센다(경쟁 상단의 상관에 물건을 부으면 그 자리가 흔들린다) */
  resetGame();
  state.cargo = { grain: 20 }; state.buyPrice = { grain: 1 };
  state.guildOffer = { by: 'a', foe: 'b', city: state.at, gid: 'grain', need: 30, done: 0, fee: 500, until: state.day + 30 };
  sell('grain', 12);
  ok(state.guildOffer.done === 12, `사주 진척을 파는 자리에서 센다 — ${state.guildOffer.done}/30`);

  /* ⑮ ★ **소문에 상단 자리가 남는다** — 상단은 지도에 배로 안 뜨므로 소문이 유일한 얼굴이다.
        습격 줄이 상한을 다 먹으면 물가를 누르는 층이 **화면에서 통째로 사라진다**
        (이 저장소가 다섯 번 겪은 *"규칙이 멀쩡한데 화면이 말하지 않는다"*). */
  {
    const { newsLines } = await import('../js/world.js');
    resetGame();
    const flood = [];
    for (let i = 0; i < 6; i++) {
      flood.push({ kind: 'raid', who: '갑', victim: '을', at: 'venezia', to: 'rodos', loot: '', shocked: [] });
    }
    flood.push({ kind: 'guild-press', who: '아무 상단', city: 'venezia', goodId: 'grain', corner: true });
    const lines = newsLines(flood, 3);
    ok(lines.some((l) => /쓸어 담고|헐값에 풀고/.test(l.text)),
       `습격 소문이 여섯 개여도 상단 줄이 항해일지에 남는다 (${lines.length}줄 중)`);
  }

  /* ⑯ 세이브 왕복 — 상단 장부가 그대로 실린다(`voy`까지 평범한 객체라 직렬화된다) */
  resetGame(); initWorld();
  for (let d = 0; d < 60; d++) { state.day++; refreshPrices(); guildTick(1, []); decayGuildFlow(1); }
  const snap = JSON.stringify({
    legs: Object.values(state.guilds).reduce((a, g) => a + g.legs, 0),
    flows: Object.keys(state.guildFlow).length,
  });
  saveGame(); resetGame(); loadGame();
  ok(JSON.stringify({
    legs: Object.values(state.guilds ?? {}).reduce((a, g) => a + g.legs, 0),
    flows: Object.keys(state.guildFlow ?? {}).length,
  }) === snap, `세이브 왕복에 상단 장부가 그대로다 — ${snap}`);

  /* ⑰ ★ **옛 세이브가 안 깨진다** — 상단 필드가 통째로 없는 판을 이어도 스스로 선다.
        (`save.js`의 `FILL_IF_MISSING`에 안 넣었으므로 **여기서 지킨다**) */
  saveGame();
  const KEY = 'tradeship:save:v1';
  const blob = JSON.parse(localStorage.getItem(KEY));
  for (const k of ['guilds', 'guildFlow', 'guildBoon', 'guildOffer']) delete blob.state[k];
  localStorage.setItem(KEY, JSON.stringify(blob));
  const loaded = loadGame();
  for (let d = 0; d < 20; d++) { state.day++; refreshPrices(); guildTick(1, []); decayGuildFlow(1); }
  ok(loaded && Object.keys(state.guilds ?? {}).length === HOUSES.length,
     `상단 필드가 없는 옛 세이브를 이어도 상단이 스스로 선다 (${Object.keys(state.guilds ?? {}).length}곳)`);

  /* ⑱ 새 판은 상단도 처음부터다 — `??=`로만 만들면 옛 판의 자본·호감이 살아남는다 */
  state.guilds = { x: { cap: 1 } }; state.guildFlow = { venezia: { grain: 9 } };
  state.guildBoon = { credit: {} }; state.guildOffer = { by: 'a' };
  resetGame();
  ok(!Object.keys(state.guilds).length && !Object.keys(state.guildFlow).length
     && !state.guildBoon && !state.guildOffer,
     'resetGame이 상단 장부·자국·신용장·사주를 전부 비운다');

  /* ══ 자리(座) — §A-11 명 ═══════════════════════════════════════
     ★ 이 절이 지키는 것은 **막지 않는다**와 **세를 안 건드린다** 둘이다.
       둘 중 하나라도 무너지면 동아시아 패권이 이 기능에 잠기거나 `check-factions` ⑤가 깨진다. */
  {
    resetGame(); state.gold = 5_000_000;
    const MING = Object.values(SEAT.provinces).flat();

    // ① 자리는 **명 13항구에서만** 열린다 — 아니면 할증이 아홉 바다 전체에 붙는다
    ok(MING.length === 13 && MING.every((c) => seatCity(c))
       && !seatCity('macau') && !seatCity('busanpo') && !seatCity('venezia'),
       `자리는 명 13항구에서만 열린다 (마카오·부산포·베네치아는 아니다)`);

    // ② `job:'官'`이 여는 열쇠다 — 문서를 파는 것과 다른 층이다
    ok(seatSellerOK({ job: '官' }) && !seatSellerOK({ job: 'broker' }) && !seatSellerOK(null),
       `자리를 여는 열쇠는 job:'官'이다`);

    // ③ 값은 규모에 비례하고 두 번째부터 누진한다
    const p1 = seatPrice('guangzhou');
    buySeat('guangzhou');
    state.boons.seat.guangzhou.until = 0;          // 임기가 끝난 것으로 둔다
    const p2 = seatPrice('guangzhou');
    ok(p1 === SEAT.bySize * 3 && Math.abs(p2 - p1 * (1 + SEAT.step)) <= 1,
       `자리값이 누진한다 — ${p1.toLocaleString('ko-KR')} → ${p2.toLocaleString('ko-KR')}닢`);

    // ④ ★ **막지 않고 값을 물린다** — 자리가 없으면 거점이 비싸지만 살 수는 있다
    resetGame(); state.gold = 5_000_000;
    const noSeat = holdingPrice('warehouse', 'ningbo');
    buySeat('ningbo');
    const withSeat = holdingPrice('warehouse', 'ningbo');
    ok(seatUpcharge('ningbo') === 1 && Math.abs(noSeat / withSeat - (1 + SEAT.noSeatUp)) < 0.01,
       `★ 자리가 없으면 거점이 ${Math.round(SEAT.noSeatUp * 100)}% 비싸다 — 막는 것이 아니다`
       + ` (${withSeat.toLocaleString('ko-KR')} → ${noSeat.toLocaleString('ko-KR')}닢)`);

    // ⑤ ★ **세는 한 자리도 안 움직인다**(`check-factions` ⑤ 이중과세 금지와 같은 선)
    resetGame(); state.gold = 5_000_000;
    const tBefore = tariffRate('guangzhou');
    buySeat('guangzhou');
    ok(tariffRate('guangzhou') === tBefore,
       `★ 자리를 사도 입항세가 안 움직인다 — ${(tBefore * 100).toFixed(3)}% 그대로`);

    // ⑥ 다른 바다는 값이 안 변한다 — 할증이 새어 나가면 세계가 통째로 비싸진다
    resetGame();
    ok(seatUpcharge('venezia') === 1 && seatUpcharge('busanpo') === 1 && seatUpcharge('macau') === 1,
       '명이 아닌 항구의 거점값은 자리와 무관하다');

    // ⑦ 계약 보수가 커지되 **수량은 그대로다** — 실어 나르는 것은 안 변한다
    resetGame(); state.gold = 5_000_000;
    const cb = contractOffer('ningbo', 0);
    buySeat('ningbo');
    const ca = contractOffer('ningbo', 0);
    ok(!cb || (ca.pay > cb.pay && ca.qty === cb.qty),
       `자리가 있으면 관의 일감이 커진다 — ${cb ? cb.pay.toLocaleString('ko-KR') : '-'} → `
       + `${ca ? ca.pay.toLocaleString('ko-KR') : '-'}닢 (수량 ${cb ? cb.qty : '-'} 그대로)`);

    // ⑧ 감찰 — 걸리면 자리가 사라지되 `tier`는 남는다(다음이 더 비싸다)
    resetGame(); state.gold = 5_000_000;
    buySeat('ningbo');
    const hit = rollSeatAudit('ningbo', 0);        // r=0이면 반드시 걸린다
    ok(hit && !seatAt('ningbo') && seatTier('ningbo') === 1,
       '감찰에 걸리면 자리가 사라지고 값은 안 돌려받는다 — 다만 tier는 남는다');
    ok(!rollSeatAudit('ningbo', 0), '죽은 자리는 다시 감찰에 안 걸린다');

    // ⑨ 세이브 왕복 — `boons` 안이라 그릇은 그대로여야 한다
    resetGame(); state.gold = 5_000_000;
    buySeat('guangzhou'); buySeat('penghu');
    const snapSeat = JSON.stringify(state.boons.seat);
    saveGame(); resetGame(); loadGame();
    ok(JSON.stringify(state.boons.seat) === snapSeat && seatCount() === 2,
       `세이브 왕복에 자리가 그대로다 — ${seatCount()}곳`);

    // ⑩ 새 판은 자리도 처음부터다 — `??=`로만 만들면 옛 판의 자리가 살아남는다(state.tamed가 실제로 그랬다)
    state.boons.seat = { guangzhou: { until: 9999, tier: 3 } };
    resetGame();
    ok(!Object.keys(state.boons.seat ?? {}).length, 'resetGame이 자리를 비운다');
  }

  /* ══ 작위(爵位)와 개항 — §A-11 조선 ═══════════════════════════════
     ★ 이 절이 지키는 것 셋 — **조선 갈래만** · **다른 나라는 안 움직인다** · **돈을 안 준다.** */
  {
    // ① 조정은 제 나라 사람만 부른다
    resetGame(undefined, 'interpreter');
    const mine = royalEligible();
    resetGame(undefined, 'scrivano');            // 여덟 바다 갈래
    ok(mine && !royalEligible(), '조정은 한반도 갈래만 부른다 (여덟 바다 갈래는 아니다)');

    // ② 부름은 바다 하나를 잡아야 온다 — 아무 때나 열면 1일차에 카드가 뜬다
    resetGame(undefined, 'interpreter');
    ok(!royalCalling() && !takeRoyal().ok, '패권이 0이면 조정이 부르지 않는다');

    // ③ 받들지 않았으면 작위도 없다
    ok(!claimRoyal().ok, '뜻을 받들지 않으면 교지도 없다');

    // ④ ★ 계단 셋이 저마다 다른 것을 연다 (tier를 직접 올려 잰다 — 패권을 손으로 못 채운다)
    state.royal.taken = 1;
    const cap0 = civicCapOf('mapo'), dues0 = civicDuesOf(0, 'mapo'), tar0 = tariffRate('busanpo');
    state.royal.tier = 1; state.royal.opened = 1;
    const tar1 = tariffRate('busanpo');
    ok(joseonOpen() && tar1 < tar0 && civicCapOf('mapo') === cap0,
       `1계단은 문을 연다 — 부산포 세 ${(tar0 * 100).toFixed(2)}% → ${(tar1 * 100).toFixed(2)}%`
       + ` (천장은 아직 ${cap0})`);
    state.royal.tier = 2;
    ok(civicCapOf('mapo') === ROYAL.civicCap && civicDuesOf(0, 'mapo') === dues0,
       `2계단은 천장을 연다 — ${cap0} → ${civicCapOf('mapo')} (문턱은 아직 그대로)`);
    state.royal.tier = 3;
    ok(civicDuesOf(0, 'mapo') === Math.round(dues0 * (1 - ROYAL.duesOff)),
       `3계단은 문턱을 깎는다 — ${dues0.toLocaleString('ko-KR')} → `
       + `${civicDuesOf(0, 'mapo').toLocaleString('ko-KR')}닢`);

    // ⑤ ★ **다른 나라는 한 자리도 안 움직인다** — 안 그러면 아홉 바다가 통째로 갈린다
    ok(civicCapOf('guangzhou') === CIVIC.cap && civicDuesOf(0, 'guangzhou') === CIVIC.dues[0],
       '작위는 조선 깃발에만 걸린다 (명·일본은 그대로다)');

    /* ⑥ ⛔ **금화를 한 닢도 주지 않는다** — 「보상으로 돈이나 수입을 주지 않는다」 규약.
       ⚠️ `tier`를 손으로 올려 재면 아무것도 안 재는 것이다 — **`claimRoyal()` 실제 경로**로
         밟아야 «그 함수가 몰래 금화를 주지 않는가»를 잰다(자를 잘못 대면 부호가 뒤집힌다). */
    resetGame(undefined, 'interpreter');
    state.royal.taken = 1;
    const goldBefore = state.gold, cargoBefore = JSON.stringify(state.cargo);
    /* 패권을 손으로 못 채우므로 `claimRoyal`의 문턱만 잠깐 낮춰 실제 경로를 타게 한다 —
       규칙을 고치는 것이 아니라 **값**을 빌린다(끝나면 되돌린다). */
    const needSaved = ROYAL.steps.map((st) => st.need);
    for (const st of ROYAL.steps) st.need = 0;
    let claims = 0;
    for (let i = 0; i < ROYAL.steps.length; i++) if (claimRoyal().ok) claims++;
    const goldAfter = state.gold, tierAfter = state.royal.tier, openedAfter = state.royal.opened;
    ROYAL.steps.forEach((st, i) => { st.need = needSaved[i]; });
    ok(claims === ROYAL.steps.length && tierAfter === ROYAL.steps.length,
       `교지를 계단 수만큼 받는다 — ${claims}회 · tier ${tierAfter}`);
    ok(goldAfter === goldBefore && JSON.stringify(state.cargo) === cargoBefore,
       `★ 작위는 금화도 짐도 한 닢 안 준다 (${goldBefore}닢 그대로)`);
    ok(openedAfter > 0, '첫 교지가 곧 개항이다 — 이름과 문이 한 장면이다');
    ok(!claimRoyal().ok, '다 받으면 더 오를 자리가 없다');

    // ⑦ 개시는 확률이 아니라 달력이다 — 두 시간 입구 어느 쪽에서 불러도 같다
    resetGame(undefined, 'interpreter');
    state.royal.tier = 1; state.royal.opened = 1;
    const opens = [];
    for (let d = 1; d <= 400; d++) { state.day = d; if (rollFair()) opens.push(d); }
    ok(opens.length === Math.floor(400 / ROYAL.fairEveryDays) + 1,
       `개시가 ${ROYAL.fairEveryDays}일마다 선다 — 400일에 ${opens.length}회(${opens.join('·')}일차)`);

    // ⑧ 개항 전에는 장이 안 선다
    resetGame(undefined, 'interpreter');
    state.day = 181;
    ok(!rollFair() && !fairOpen(), '개항 전에는 장이 서지 않는다');

    // ⑨ 세이브 왕복 · 새 판 초기화
    resetGame(undefined, 'interpreter');
    state.royal = { taken: 5, tier: 2, opened: 9, fair: 40 };
    const snapR = JSON.stringify(state.royal);
    saveGame(); resetGame(); loadGame();
    ok(JSON.stringify(state.royal) === snapR, `세이브 왕복에 작위가 그대로다 — ${snapR}`);
    state.royal = { taken: 5, tier: 3, opened: 9, fair: 40 };
    resetGame();
    ok(!state.royal.tier && !state.royal.opened, 'resetGame이 작위를 비운다');

    // ⑩ 진행도는 순수 함수다 — 두 번 불러도 상태가 안 바뀐다
    resetGame(undefined, 'interpreter');
    const before = JSON.stringify(state.royal);
    royalProgress(); royalProgress();
    ok(JSON.stringify(state.royal) === before, 'royalProgress()는 상태를 안 건드린다');
  }
}
