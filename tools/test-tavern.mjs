// test-tavern.mjs — 술집에서 선원을 모으는 규칙
//
// 이 게임은 **갑판이 빈 채로 시작한다.** 그래서 여기 깨지면 게임이 아예 시작되지 않는다:
// 배는 있는데 사람이 없고, 사람을 태우는 유일한 길이 술집이기 때문이다.
//
// 검사하는 것:
//   ① 시작 조건 — 선원 0명 · 금화 START_GOLD
//   ② 결정론 — 같은 날 다시 들어와도 같은 사람이 앉아 있다(재입장 스캠 방지)
//   ③ 항구 성격 — 큰 항구일수록 자리가 많고, 나포항에는 거친 자가 모인다
//   ④ 값의 두 갈래 — 계약금(지금)과 일당(계속)이 기질에 따라 갈린다
//   ⑤ 첫 항차가 성립하는가 — START_GOLD로 최소 인원을 태우고도 화물 살 돈이 남는가

import { CITIES, CITY_BY_ID, CREW_TRAITS, TAVERN } from '../js/data.js';
import {
  state, resetGame, tavernCrews, recruitBand, avgCrewWage, shorthanded,
  voyageCost, ship, START_GOLD, CREW_WAGE, priceOf, trimLoadout,
  neighborsOf, voyageDays,
} from '../js/state.js';

const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };

/* ── ① 시작 조건 ─────────────────────────────────────────── */
resetGame();
ok(state.crew === 0, `갑판이 비어 있다 — 선원 ${state.crew}명`);
ok(state.gold === START_GOLD, `금화 ${state.gold}닢으로 시작한다`);
ok(state.bands.length === 0 && state.hired.length === 0, '무리 명부도 비어 있다');
ok(shorthanded(), `${ship().name}은(는) 최소 ${ship().crewMin}명이 필요하다 — 지금은 못 몬다`);
ok(avgCrewWage() === CREW_WAGE, `무리가 없으면 표준 일당(${CREW_WAGE}닢)으로 떨어진다`);

/* ── ② 결정론 ────────────────────────────────────────────── */
const a1 = JSON.stringify(tavernCrews('venezia', 1));
ok(a1 === JSON.stringify(tavernCrews('venezia', 1)), '같은 날 다시 들어와도 같은 사람이 앉아 있다');
ok(a1 !== JSON.stringify(tavernCrews('venezia', 1 + TAVERN.cycle)), `${TAVERN.cycle}일이 지나면 사람이 갈린다`);
ok(a1 !== JSON.stringify(tavernCrews('palermo', 1)), '항구마다 다른 사람이 앉아 있다');

/* ── ③ 항구 성격 ─────────────────────────────────────────── */
console.log('');
let bigMax = 0, smallMax = 0, roughHits = 0, calmHits = 0;
for (const c of CITIES) {
  // 여러 날을 훑는다 — 하루만 보면 빈 자리 굴림에 결론이 흔들린다
  let slots = 0, rough = 0, total = 0;
  for (let d = 1; d < 60; d += TAVERN.cycle) {
    const rows = tavernCrews(c.id, d);
    slots = Math.max(slots, rows.length);
    for (const r of rows) {
      total++;
      if (r.trait === 'rough' || r.trait === 'corsair') rough++;
    }
  }
  if (c.size >= 3) bigMax = Math.max(bigMax, slots); else if (c.size === 1) smallMax = Math.max(smallMax, slots);
  if (c.prizeYard) roughHits += rough / total; else calmHits += rough / total;
  console.log(`      ${c.name.padEnd(12)} size${c.size}${c.prizeYard ? ' 나포항' : '      '} 자리 최대 ${slots} · 거친 자 ${Math.round(rough / total * 100)}%`);
}
const prizeN = CITIES.filter((c) => c.prizeYard).length;
const calmN = CITIES.length - prizeN;
ok(bigMax > smallMax, `큰 항구가 작은 항구보다 자리가 많다 (${bigMax} vs ${smallMax})`);
ok(roughHits / prizeN > calmHits / calmN,
   `나포항에 거친 자가 더 모인다 (${Math.round(roughHits / prizeN * 100)}% vs ${Math.round(calmHits / calmN * 100)}%)`);

/* ── ④ 값의 두 갈래 ──────────────────────────────────────── */
console.log('');
const seen = {};
for (const c of CITIES) {
  for (let d = 1; d < 200; d += TAVERN.cycle) {
    for (const b of tavernCrews(c.id, d)) {
      (seen[b.trait] ||= []).push(b);
    }
  }
}
for (const key of Object.keys(CREW_TRAITS)) {
  const rows = seen[key] || [];
  if (!rows.length) { ok(false, `${CREW_TRAITS[key].name}이(가) 한 번도 안 나온다`); continue; }
  const avgW = rows.reduce((a, b) => a + b.wage, 0) / rows.length;
  const avgA = rows.reduce((a, b) => a + b.advance / b.n, 0) / rows.length;
  console.log(`      ${CREW_TRAITS[key].name.padEnd(8)} ${String(rows.length).padStart(4)}회 · 일당 ${avgW.toFixed(2)}닢 · 계약금 ${avgA.toFixed(0)}닢/명`);
}
const cheap = seen.drunk, dear = seen.corsair;
ok(cheap.reduce((a, b) => a + b.wage, 0) / cheap.length < dear.reduce((a, b) => a + b.wage, 0) / dear.length,
   '주정뱅이가 해적 출신보다 싸다 — 기질이 값으로 드러난다');
ok(Object.values(seen).flat().every((b) => b.advance > 0 && b.wage > 0),
   '계약금과 일당이 모두 양수다');

/* ── ⑤ 첫 항차가 성립하는가 ──────────────────────────────── */
console.log('');
resetGame();
const need = ship().crewMin;
// 계약금이 싼 순으로 태운다 — 첫 항차를 띄우려는 플레이어의 합리적 선택
const offer = tavernCrews('venezia', 1).slice().sort((x, y) => x.advance / x.n - y.advance / y.n);
const took = [];
for (const b of offer) {
  if (state.crew >= need) break;
  const r = recruitBand(b.id, 'venezia');
  if (r.ok) took.push(b);
}
console.log(`      태운 무리: ${took.map((b) => `${b.name}(${b.n}명·${b.traitName})`).join(' + ') || '없음'}`);
console.log(`      선원 ${state.crew}명 · 남은 금화 ${state.gold}닢 · 평균 일당 ${avgCrewWage().toFixed(2)}닢`);

ok(state.crew >= need, `최소 인원 ${need}명을 채웠다 (${state.crew}명)`);
ok(!shorthanded(), '배가 제 속력을 낸다');

/* 첫 항차는 **가장 가까운 이웃**으로 잡는다 — 시작 자금으로 먼 항로를 택하는 것은
   플레이어의 실수지 밸런스의 문제가 아니다. 여기서 보는 것은
   "제일 짧은 길조차 막혀 있지는 않은가"다. */
let best = null;
for (const id of neighborsOf('venezia')) {
  const d = voyageDays('venezia', id);
  if (!best || d < best.days) best = { id, days: d };
}
const trip = voyageCost(best.days, state.crew, { from: 'venezia', to: best.id });
const grain = priceOf('venezia', 'grain');
const canBuy = Math.floor((state.gold - trip.total) / grain);
console.log(`      가장 가까운 이웃: ${CITY_BY_ID[best.id].name} ${best.days}일`);
console.log(`      항해비 ${trip.total}닢 (일당 ${trip.wages}·보급 ${trip.supplies}·선체 ${trip.hull}·무장 ${trip.arms}·부관 ${trip.officer})`);
console.log(`      항해비를 빼고 곡물(${grain}닢)을 ${canBuy}칸 살 수 있다`);
ok(state.gold > trip.total, `항해비를 치를 돈이 남았다 (${state.gold}닢 vs ${trip.total}닢)`);
ok(canBuy >= 1, `화물을 실을 여지가 있다 — ${canBuy}칸`);

/* ── ⑥ 무리 명부가 인원과 어긋나지 않는다 ─────────────────── */
console.log('');
const before = state.bands.reduce((a, b) => a + b.n, 0);
ok(before === state.crew, `무리 인원 합(${before})과 선원 수(${state.crew})가 같다`);
state.crew -= 2;                       // 전투에서 둘을 잃었다고 치고
trimLoadout();
ok(state.bands.reduce((a, b) => a + b.n, 0) === state.crew,
   `사람이 죽으면 명부도 줄어든다 (${state.crew}명)`);
ok(avgCrewWage() > 0, `평균 일당은 여전히 유효하다 (${avgCrewWage().toFixed(2)}닢)`);

/* ── ⑦ 같은 무리를 두 번 태우지 못한다 ───────────────────── */
const dup = tavernCrews('venezia', 1).find((b) => state.hired.includes(b.id));
ok(dup && !recruitBand(dup.id, 'venezia').ok, '이미 태운 무리는 다시 태울 수 없다');
