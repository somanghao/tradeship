import { SHIPS, ENEMIES, REFITS, OFFICER, CITY_BY_ID } from '../js/data.js';
import {
  state, resetGame, advanceDays, purchaseShip, boardShip, buyRefit, gunCap,
  shipSpeed, shorthanded, captureShip, fleetUpkeep, pickEnemy, voyageDays,
  buyShot, useShot, shotStock, maxHullOf, buy, sell, hire, sellsShip, yardsOf,
  cargoUsed, armsTotal, industryOf, tierNeeded, shipPriceAt, shipLockedBy,
  usedListings, buyUsed, buildableAt, yardCapable,
  hasOfficer, tariffRate, impactFactor, ship, encounterOdds, routeRisk, rollSeaEvent, neighborsOf,
  contractOffer, START_GOLD,
} from '../js/state.js';

const ok = (c, msg) => console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`);

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
