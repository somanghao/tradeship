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

import { SHIPS, ENEMIES, REFITS, OFFICER, CITY_BY_ID, CITIES } from '../js/data.js';
import {
  state, resetGame, advanceDays, purchaseShip, boardShip, buyRefit, gunCap,
  shipSpeed, shorthanded, captureShip, fleetUpkeep, pickEnemy, voyageDays,
  buyShot, useShot, shotStock, maxHullOf, buy, sell, hire, sellsShip, yardsOf,
  cargoUsed, armsTotal, industryOf, tierNeeded, shipPriceAt, shipLockedBy,
  usedListings, buyUsed, buildableAt, yardCapable,
  hasOfficer, tariffRate, impactFactor, ship, encounterOdds, routeRisk, rollSeaEvent, neighborsOf,
  contractOffer, acceptContract, START_GOLD,
  /* 수직계열화 1단계(A-9) — 값은 `check-chain.mjs`가 보고, 여기서는 규칙의 뼈대만 본다 */
  buyHolding, canBuyMill, buyMill, sellMill, millPrice, millRecipes,
  millBatchCap, runMill, collectMill, worksUpkeepDue, settleWorks,
  /* 거점의 유예·매각과 파산 — 「바닥에는 바닥의 규칙이 있다」 */
  hasHolding, ownsHolding, holdingIdle, holdingUpkeepDue, settleHolding, sellHolding, holdingsValue,
  storeCap, payFine, debtOwed, nothingLeft, enforceDebt, settlePayroll, resaleOf,
  /* 바닥에서 나가는 문(C-17) — 안내가 적을 값을 규칙이 센다 */
  salvage, salvageValue, sellNet, cheapestExit, voyageCost,
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
} from '../js/state.js';
import { HOLDING, BANKRUPT, MONTH_DAYS, HULL, ROSTER, FLEET, COMMENDA, CONTRACT, ALL_PIRATES,
  PRIVATE_TRADE, INSURANCE_RATE, INSURANCE_RATE_OCEAN, TOTAL_LOSS, HEGEMONY } from '../js/data.js';
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
ok(state.shipKey === 'hulk' && state.gold === START_GOLD,
   `시작: ${state.shipKey} / ${state.gold}닢 / 선체 ${state.hp} / 화물칸 ${state.cargoCap}`);
// 갑판이 빈 채로 시작하므로(술집에서 모은다) 이 아래 검사들은 선원을 세워 두고 돈다.
// 술집 규칙 자체는 tools/test-tavern.mjs가 본다.
state.crew = 10;
ok(armsTotal() === state.guns, `포문 동기화 ${state.guns}문`);

// 누수: 항해하면 선체가 삭는다
const hp0 = state.hp;
const c1 = advanceDays(4);
ok(c1.leak === 8 && state.hp === hp0 - 8, `누수 4일 → ${c1.leak}pt (선체 ${hp0}→${state.hp}), 급여 ${c1.wages}닢`);

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
buyRefit('oakArmor');
ok(state.maxHp === Math.round(SHIPS.caravel.hp * 1.25 * 1), `떡갈나무 장갑 → 최대선체 ${max0} → ${state.maxHp}`);
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
ok(ship().leak && hasOfficer(), '물 새는 낡은 바사를 몰아도 함께 있다');

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
  const bare = 0.06;                                   // data.js CITY_TRADE 기준 입항세 원값
  ok(tariffRate('venezia') < bare,
     `입항세가 이미 감면돼 있다 — ${(tariffRate('venezia') * 100).toFixed(2)}%`);
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
  ok(buyMill(R, 'venezia').ok && state.gold === gold0 - 67230, '가공장을 세우면 그 값이 금고에서 빠진다');

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
  delete state.fleet.hulk;
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
  resetGame('venezia');
  state.crew = 6; state.gold = 0;
  acceptContract();
  const adv = state.contract?.advance ?? 0;
  state.gold = 0;
  state.day = state.contract.due + 1;
  advanceDays(1, { from: 'venezia', to: 'venezia' });
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
    ok(w2.mode === 'liquidate' && state.shipKey === BANKRUPT.keepShip && debtOwed() === 0,
       '혼자면 청산이다 — 배가 사라지면 **채무도 사라진다**(해상대차). 판은 1일차 조건으로 돌아간다');
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
