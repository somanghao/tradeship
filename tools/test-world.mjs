// 세계가 혼자 돌아가는지 — NPC 거래가 시세에 남고, 해적이 상인을 잡는가
import { CITY_BY_ID, GOOD_BY_ID, SHIPS } from '../js/data.js';
import {
  state, resetGame, advanceDays, pressureOf, costFor, contractOffer,
  acceptContract, deliverContract, voyageDays, windName, routeWindLabel,
  routeFactor, windFactor, currentFactor,
} from '../js/state.js';
import { initWorld, worldTick, npcsOnLeg, npcsAtPort, newsLines } from '../js/world.js';
import { NPC } from '../js/npc/config.js';

const ok = (c, m) => console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`);

resetGame();
initWorld();
/* ★ 절대수(13척)를 검사하다가 세계가 아홉 바다로 넓어지면서 걸렸다.
   척수는 이제 **권역 수에 비례해** 정해지므로(`npc/config.js: tradersPerRegion`),
   여기서 지킬 것은 "몇 척인가"가 아니라 **설정한 만큼 실제로 떴는가**다.
   숫자를 새 값으로 고쳐 두면 바다를 늘릴 때마다 또 걸린다. */
ok(state.npcs.length === NPC.traders + NPC.pirates,
   `세계 시작: 상인 ${state.npcs.filter((n) => n.kind === 'trader').length}/${NPC.traders}`
   + ` · 해적 ${state.npcs.filter((n) => n.kind === 'pirate').length}/${NPC.pirates}`
   + ` (권역 수에 비례한다)`);

// 30일을 돌려 본다
let raids = 0, sold = 0, bought = 0;
for (let d = 0; d < 30; d++) {
  advanceDays(1);
  const news = worldTick(1);
  for (const e of news) {
    if (e.kind === 'raid') raids++;
    if (e.kind === 'sold') sold++;
    if (e.kind === 'bought') bought++;
  }
}
ok(bought > 0 && sold > 0, `30일간 NPC 거래: 매입 ${bought}건 · 매도 ${sold}건`);
ok(raids > 0, `해적 습격 ${raids}건 (상인은 계속 보충된다: 현재 ${state.npcs.filter(n => n.kind === 'trader').length}척)`);

// NPC 거래가 실제로 시세 압력으로 남았는가
const pressed = [];
for (const c of Object.keys(state.impact)) {
  for (const g of Object.keys(state.impact[c])) {
    pressed.push(`${CITY_BY_ID[c].name} ${GOOD_BY_ID[g].name} ${Math.round(state.impact[c][g])}`);
  }
}
ok(pressed.length > 0, `NPC가 남긴 시장 압력: ${pressed.slice(0, 5).join(' / ') || '없음'}`);

// 같은 물건을 사는 값이 실제로 달라지는가
const someCity = Object.keys(state.impact)[0];
if (someCity) {
  const gid = Object.keys(state.impact[someCity])[0];
  state.at = someCity;
  const withPress = costFor(gid, 20);
  const saved = state.impact[someCity][gid];
  delete state.impact[someCity][gid];
  const without = costFor(gid, 20);
  state.impact[someCity][gid] = saved;
  ok(withPress > without,
    `${CITY_BY_ID[someCity].name}의 ${GOOD_BY_ID[gid].name} 20개: 압력 없을 때 ${without}닢 → 지금 ${withPress}닢`);
}

// 바람
console.log(`\n[바람] ${windName()} (${state.day}일차)`);
for (const [a, b] of [['venezia', 'istanbul'], ['istanbul', 'venezia'], ['tunis', 'alexandria'], ['alexandria', 'tunis']]) {
  const w = routeWindLabel(a, b);
  console.log(`  ${CITY_BY_ID[a].name} → ${CITY_BY_ID[b].name}: ${w.text}`
    + ` (바람 ×${windFactor(a, b).toFixed(2)} · 해류 ×${currentFactor(a, b).toFixed(2)} · ${voyageDays(a, b)}일)`);
}
// 돛 구성에 따라 같은 항로가 다르게 걸리는가
state.shipKey = 'caravel';                    // 라틴세일
const cara = voyageDays('venezia', 'istanbul');
const caraF = routeFactor('venezia', 'istanbul');
state.shipKey = 'frigate';                    // 전부 가로돛
const frig = routeFactor('venezia', 'istanbul');
ok(Math.abs(caraF - frig) > 0.001,
  `같은 항로·같은 날: 카라벨(라틴) ×${caraF.toFixed(2)} vs 프리깃(가로돛) ×${frig.toFixed(2)}`);

// 계약
state.shipKey = 'carrack'; state.cargoCap = 240; state.at = 'venezia';
const offer = contractOffer();
ok(!!offer, `주문: ${GOOD_BY_ID[offer.goodId].name} ${offer.qty}개 → ${CITY_BY_ID[offer.to].name}`
  + ` · 보수 ${offer.pay.toLocaleString('en-US')}닢(선금 ${offer.advance}) · 기한 ${offer.due - state.day}일`);
const g0 = state.gold;
acceptContract();
ok(state.gold === g0 + offer.advance && state.contract, `수주 → 선금 ${state.gold - g0}닢 수령`);
state.cargo[offer.goodId] = offer.qty;
state.at = offer.to;
const dl = deliverContract();
ok(dl.ok && !state.contract, `납품 → 잔금 ${dl.paid?.toLocaleString('en-US')}닢 (총 ${dl.total?.toLocaleString('en-US')}닢)`);

// 같은 날 같은 항구면 같은 주문이 뜨는가(재입장 스캠 방지)
state.at = 'genova';
const a1 = contractOffer(), a2 = contractOffer();
ok(a1.id === a2.id && a1.pay === a2.pay, '같은 날 다시 들어와도 같은 주문이다');
