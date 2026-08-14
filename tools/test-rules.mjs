import { SHIPS, ENEMIES, REFITS, OFFICER } from '../js/data.js';
import {
  state, resetGame, advanceDays, purchaseShip, boardShip, buyRefit, gunCap,
  shipSpeed, shorthanded, captureShip, fleetUpkeep, pickEnemy, voyageDays,
  buyShot, useShot, shotStock, maxHullOf, buy, sell, hire, sellsShip, yardsOf,
  cargoUsed, armsTotal, industryOf, tierNeeded, shipPriceAt, shipLockedBy,
  usedListings, buyUsed, buildableAt, yardCapable,
  hasOfficer, officerOffer, hireOfficer, dismissOfficer, tariffRate, impactFactor,
  contractOffer,
} from '../js/state.js';

const ok = (c, msg) => console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`);

resetGame();
ok(state.shipKey === 'hulk' && state.gold === 900, `시작: ${state.shipKey} / ${state.gold}닢 / 선체 ${state.hp} / 화물칸 ${state.cargoCap}`);
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
   한 명뿐인 인물이라 "언제 붙고 언제 떨어지나"와 "값과 대가가 맞물리나"를 본다. */
resetGame();
ok(!hasOfficer(), '시작할 때는 부관이 없다');
{
  const o = officerOffer('venezia');
  ok(o && o.poor, '낡은 바사를 몰면 리알토에서 만나도 따라나서지 않는다');
  ok(!hireOfficer().ok, '거절당한다 — 물 새는 배에는 안 탄다');
}
state.at = 'rodos';
ok(officerOffer() === null, `${OFFICER.home} 밖(로도스)에서는 만날 수 없다`);

// 제대로 된 배로 갈아타면 따라나선다
state.at = 'venezia';
state.gold = 60000;
purchaseShip('cocca');
boardShip('cocca');
{
  const tariffBefore = tariffRate('venezia');
  state.impact.venezia = { silk: 200 };
  const impactBefore = impactFactor('venezia', 'silk', 10);
  const payBefore = contractOffer('venezia', 12).pay;

  const g0 = state.gold;
  const r = hireOfficer();
  ok(r.ok && state.gold === g0 - OFFICER.fee && hasOfficer(),
     `${OFFICER.name} 고용 — 계약금 ${r.cost.toLocaleString('ko-KR')}닢`);
  ok(!hireOfficer().ok, '부관은 오직 한 명 — 두 번 고용되지 않는다');

  const tariffAfter = tariffRate('venezia');
  ok(Math.abs(tariffAfter - tariffBefore * (1 - OFFICER.perks.tariffOff)) < 1e-9,
     `입항세 ${(tariffBefore * 100).toFixed(2)}% → ${(tariffAfter * 100).toFixed(2)}%`);
  ok(impactFactor('venezia', 'silk', 10) < impactBefore,
     `대량거래 벌점 ${(impactBefore * 100).toFixed(1)}% → ${(impactFactor('venezia', 'silk', 10) * 100).toFixed(1)}%`);
  ok(contractOffer('venezia', 12).pay > payBefore,
     `계약 보수 ${payBefore.toLocaleString('ko-KR')} → ${contractOffer('venezia', 12).pay.toLocaleString('ko-KR')}닢`);
  state.impact = {};
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

// 내보내면 효과도 함께 사라진다
{
  const withOfficer = tariffRate('venezia');
  const g0 = state.gold;
  const r = dismissOfficer();
  ok(r.ok && !hasOfficer() && state.gold === g0 - r.pay,
     `내보냈다 — 퇴직금 ${r.pay.toLocaleString('ko-KR')}닢 (그동안 가져간 몫 ${r.earned.toLocaleString('ko-KR')}닢)`);
  ok(tariffRate('venezia') > withOfficer, '입항세 감면이 사라진다');
  ok(!dismissOfficer().ok, '없는 부관은 내보낼 수 없다');
  ok(officerOffer('venezia') && !officerOffer('venezia').poor, '리알토에 가면 다시 만날 수 있다');
}
