// test-payroll.mjs — 급여 정산 · 체불 · 불만 · 이탈
//
// 이 규칙의 핵심은 **못 주는 상태가 존재한다**는 것이다. 급여를 날마다 금고에서 빼면
// 체불이라는 사건 자체가 생기지 않는다 — 그래서 발생주의(쌓아 두었다가 달마다 치름)로 두었다.
//
// 검사하는 것:
//   ① 급여가 항해 중 빠지지 않고 쌓인다 (보급·유지비는 즉시 빠진다)
//   ② 달이 차면 정산할 때가 된다 · 항구에서만
//   ③ 다 치르면 불만이 가라앉는다
//   ④ 못 치르면 체불로 남고 불만이 오른다 — **참을성 낮은 무리가 더 빨리**
//   ⑤ 이탈하면 인원이 줄고 **값나가는 화물부터** 들고 간다
//   ⑥ 장부가 실제 금고 흐름과 맞는다
//   ⑦ 밀린 달을 건너뛰지 않는다

import { GOOD_BY_ID, CREW_TRAITS } from '../js/data.js';
import {
  state, resetGame, advanceDays, voyageCost, settlePayroll, paydayDue,
  payrollOwed, daysToPayday, MONTH_DAYS, DESERT_AT, book, ledgerTotal,
  buy, sell, priceOf, tavernCrews, recruitBand, hire, avgCrewWage, newLedger,
} from '../js/state.js';

const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };

/** 시드 고정 난수 — 이탈은 확률이라 시드 없이 재면 결론이 흔들린다 */
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 선원을 태운 상태로 시작 */
function withCrew(n = 8) {
  resetGame();
  while (state.crew < n) {
    const free = tavernCrews(state.at).filter((b) => !state.hired.includes(b.id));
    if (!free.length || !recruitBand(free[0].id).ok) { if (!hire(n - state.crew).ok) break; }
  }
}

/* ── ① 급여는 쌓이고, 물자값은 즉시 빠진다 ──────────────── */
withCrew(8);
state.gold = 5000;
const g0 = state.gold;
const c = voyageCost(10, state.crew, null);
advanceDays(10);
const spentNow = g0 - state.gold;

console.log(`      10일 항해 — 총 비용 ${c.total}닢 (급여 ${c.wages + c.officer} · 물자·유지 ${c.total - c.wages - c.officer})`);
ok(state.payroll.due === c.wages + c.officer,
   `급여 ${state.payroll.due}닢이 금고가 아니라 장부에 쌓였다`);
ok(spentNow === c.total - c.wages - c.officer,
   `금고에서는 물자·유지비 ${spentNow}닢만 빠졌다`);
ok(state.gold === g0 - spentNow, '급여만큼은 아직 금고에 남아 있다');

/* ── ② 달이 차야 정산할 때가 된다 ───────────────────────── */
ok(!paydayDue(), `${state.day}일차 — 아직 급여일이 아니다 (${daysToPayday()}일 남음)`);
advanceDays(MONTH_DAYS);
ok(paydayDue(), `${state.day}일차 — 급여일이 지났다 (청구 ${payrollOwed()}닢)`);

/* ── ③ 다 치르면 불만이 가라앉는다 ──────────────────────── */
state.gold = 99999;
for (const b of state.bands) b.unrest = 0.4;
const owedFull = payrollOwed();
const goldBefore = state.gold;
const r1 = settlePayroll(seeded(1));
console.log('');
ok(r1.paid === owedFull && r1.missed === 0, `청구 ${owedFull}닢을 전액 치렀다`);
ok(goldBefore - state.gold === owedFull, '금고에서 정확히 그만큼 빠졌다');
ok(state.bands.every((b) => b.unrest < 0.4), `불만이 내려갔다 (${state.bands.map((b) => b.unrest.toFixed(2)).join(', ')})`);
ok(!r1.deserted.length, '떠난 무리가 없다');
ok(state.payroll.due === 0 && state.payroll.arrears === 0, '장부가 비워졌다');
ok(state.payroll.nextDue > state.day, `다음 급여일은 ${state.payroll.nextDue}일차`);

/* ── ④ 못 치르면 체불 · 참을성이 낮을수록 불만이 빨리 오른다 ── */
console.log('');
resetGame();
// 참을성이 정반대인 두 무리를 손으로 세운다 — 술집 굴림에 기대면 검사가 흔들린다
state.bands = [
  { n: 4, trait: 'steady', wage: 1.2, name: '성실한 패', from: 'venezia', day: 1, unrest: 0 },
  { n: 4, trait: 'drunk',  wage: 1.2, name: '주정뱅이 패', from: 'venezia', day: 1, unrest: 0 },
];
state.crew = 8;
state.payroll.due = 1000;
state.gold = 400;                       // 40%만 낼 수 있다
const r2 = settlePayroll(seeded(7));
const steady = state.bands.find((b) => b.trait === 'steady');
const drunk = state.bands.find((b) => b.trait === 'drunk');
console.log(`      청구 1,000 · 금고 400 → 지급 ${r2.paid} · 체불 ${r2.missed}`);
ok(r2.paid === 400 && r2.missed === 600, '낼 수 있는 만큼만 내고 나머지는 체불로 넘어갔다');
ok(state.gold === 0, '금고가 바닥났다');
ok(state.payroll.arrears === 600, `체불 ${state.payroll.arrears}닢이 다음 달로 넘어간다`);
if (steady && drunk) {
  console.log(`      불만 — 성실(temper ${CREW_TRAITS.steady.temper}) ${steady.unrest.toFixed(3)}`
            + ` vs 주정뱅이(temper ${CREW_TRAITS.drunk.temper}) ${drunk.unrest.toFixed(3)}`);
  ok(drunk.unrest > steady.unrest, '참을성이 낮은 무리의 불만이 더 빨리 오른다');
} else {
  ok(false, '두 무리 중 하나가 이미 떠났다 — 시드를 바꿔 다시 잰다');
}

/* ── ⑤ 이탈하면 값나가는 짐부터 들고 간다 ────────────────── */
console.log('');
resetGame();
state.bands = [{ n: 5, trait: 'drunk', wage: 1.2, name: '주정뱅이 패', from: 'venezia', day: 1, unrest: 1.4 }];
state.crew = 5;
state.cargo = { grain: 20, silk: 10, spice: 10 };
state.buyPrice = { grain: 19, silk: 380, spice: 300 };
state.payroll.due = 900;
state.gold = 0;

const before = { ...state.cargo };
const prices = Object.keys(before).map((g) => `${GOOD_BY_ID[g].name} ${priceOf('venezia', g)}닢`);
console.log(`      선창: ${prices.join(' · ')}`);

let r3 = null;
for (let seed = 1; seed <= 40 && !r3?.deserted.length; seed++) {
  // 같은 상태에서 시드만 바꿔 이탈이 나는 판을 찾는다(확률 사건이라 한 번으로는 못 잡는다)
  state.bands = [{ n: 5, trait: 'drunk', wage: 1.2, name: '주정뱅이 패', from: 'venezia', day: 1, unrest: 1.4 }];
  state.crew = 5;
  state.cargo = { ...before };
  state.payroll = { due: 900, arrears: 0, nextDue: 30, lastDay: 1 };
  state.gold = 0;
  r3 = settlePayroll(seeded(seed));
}
ok(r3.deserted.length > 0, `불만 1.4에서 이탈이 일어난다`);
if (r3.deserted.length) {
  const d = r3.deserted[0];
  const took = Object.entries(d.lost).map(([g, n]) => `${GOOD_BY_ID[g].name} ${n}칸`).join(' · ');
  console.log(`      ${d.name} ${d.n}명이 떠나며 ${took} (${d.value}닢어치)를 들고 갔다`);
  ok(state.crew === 0, `인원이 줄었다 (${state.crew}명)`);
  ok(!state.bands.length, '명부에서도 빠졌다');
  ok(d.value > 0, '값이 나가는 것을 가져갔다');
  // 곡물(19닢)보다 비단(367닢)·향신료를 먼저 집는다
  const tookCheapOnly = Object.keys(d.lost).length === 1 && d.lost.grain;
  ok(!tookCheapOnly, '가장 싼 곡물만 집어 가지는 않는다 — 강도는 고른다');
}

/* ── ⑥ 장부가 금고 흐름과 맞는다 ────────────────────────── */
console.log('');
withCrew(6);
state.gold = 3000;
// ★ 장부를 새로 연다. 선원을 태운 계약금이 이미 적혀 있는 채로 재면
//   "금고 흐름 vs 장부"가 그 계약금만큼 어긋난다(실제로 처음에 이걸로 실패했다).
state.ledger = newLedger(state.day);
const gStart = state.gold;
buy('grain', 10);
advanceDays(6, null);
sell('grain', 10);
const gEnd = state.gold;
const inc = ledgerTotal('income');
const out = ledgerTotal('outgo');
const unpaid = state.payroll.due;         // 장부에는 잡혔지만 아직 안 나간 급여
console.log(`      수입 ${inc} · 지출 ${out}(미지급 급여 ${unpaid} 포함) · 금고 ${gStart}→${gEnd}`);
ok(gEnd - gStart === inc - (out - unpaid),
   `금고 증감(${gEnd - gStart})이 장부(수입 − 실제나간지출 = ${inc - (out - unpaid)})와 맞는다`);

/* ── ⑦ 밀린 달을 건너뛰지 않는다 ────────────────────────── */
console.log('');
resetGame();
state.crew = 5;
state.bands = [{ n: 5, trait: 'steady', wage: 1.2, name: '패', from: 'venezia', day: 1, unrest: 0 }];
state.day = 95;                       // 급여일 30·60·90을 지나쳐 들어왔다
state.payroll = { due: 500, arrears: 0, nextDue: 30, lastDay: 1 };
state.gold = 500;
settlePayroll(seeded(3));
ok(state.payroll.nextDue === 120,
   `95일차에 정산하면 다음 급여일은 120일차 (${state.payroll.nextDue}) — 지나친 달로 즉시 또 청구하지 않는다`);
