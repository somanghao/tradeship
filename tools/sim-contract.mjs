// sim-contract.mjs — 대형 주문(계약)이 **플레이어 단계에 맞는 크기인가**
//
// `sim-trade`·`sim-stat`은 계약을 아예 넣지 않고 재기 때문에(순수 무역 곡선) 계약의 크기를
// 아무도 안 보고 있었다. 그래서 「계약 한 건이 금고 23닢을 3,772닢으로 만든다」를
// 실측 한 판이 나오고서야 알았다(.playtest/supremacy-balance/BALANCE.md §3).
//
// 이 도구는 단계마다 **게시판을 여러 장 뽑아** 그 일감의 크기를 잰다:
//   보수 · 선금 · 조달원가 · 웃돈(시세 대비) · **그 시점 자산 대비 몇 배인가**.
// 판정 기준은 하나다 — **선금이 그때 자산의 몇 배인가**. 자산의 몇 배짜리 무이자 운전자금이
// 1일차에 들어오면 나머지 설계(무역 사다리·중고선·술집)가 통째로 무의미해진다.
//
//   node tools/sim-contract.mjs [시드수]
//
// ※ 수치는 반드시 여러 시드의 중앙값이다(1회 실행으로 판단하지 않는다 — 프로젝트 규약).

import {
  state, resetGame, boardShip, hire, shorthanded, cargoCapTotal,
  contractOffer, costFor, gainFor, tariffRate, resaleOf, voyageDays, voyageCost,
} from '../js/state.js';
import { SHIPS, CITIES } from '../js/data.js';

const SEEDS = +(process.argv[2] || 12);
const CARDS = 8;                       // 시드마다 게시판 몇 장을 뽑나
const won = (n) => Math.round(n).toLocaleString('en-US');
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/* 단계 — sim-income.mjs·sim-events.mjs와 같은 눈금(금고와 배는 함께 움직인다).
   `gold`는 **그 시점의 자산**이기도 하다(배값은 따로 더한다). */
const STAGES = [
  { label: '1일차   (낡은 바사·200닢)', ship: 'hulk', gold: 200, day: 1 },
  { label: '초반    (낡은 바사·400닢)', ship: 'hulk', gold: 400, day: 12 },
  { label: '초반+   (낡은 바사·1,500닢)', ship: 'hulk', gold: 1500, day: 20 },
  { label: '중반    (카라벨·4,000닢)', ship: 'caravel', gold: 4000, day: 60 },
  { label: '후반    (갈레온·20,000닢)', ship: 'galleon', gold: 20000, day: 300 },
  { label: '선단    (갈레온+동행 8척·20만닢)', ship: 'galleon', gold: 200000, day: 700, consorts: true },
];

/* 동행 8척 — 화물칸이 큰 배 여덟(합 2,158칸). BALANCE.md §5-L의 2,298칸과 같은 자리다. */
const CONSORTS = ['indiaman', 'jong', 'shuinsen', 'nau', 'urca', 'navio', 'carrack', 'ghanjah'];

function setup(st) {
  resetGame();
  state.gold = 1e7;
  if (st.ship !== 'hulk') {
    const s = SHIPS[st.ship];
    state.fleet[st.ship] = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
    boardShip(st.ship);
  }
  while (shorthanded()) if (!hire(1).ok) break;
  if (st.consorts) {
    for (const key of CONSORTS) {
      const s = SHIPS[key];
      if (!s) continue;
      state.fleet[key] ||= { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
      state.consorts[key] = { crew: s.crewMin, captain: null };
    }
  }
  state.day = st.day;
  state.gold = st.gold;
}

/** 지금 선단이 담보로 내놓을 수 있는 것 — 해상대차(bottomry)의 담보는 배다 */
function collateral() {
  let v = resaleOf(state.shipKey);
  for (const k of Object.keys(state.consorts || {})) v += resaleOf(k);
  return v;
}

console.log(`시드 ${SEEDS} × 게시판 ${CARDS}장 · 단계별 중앙값\n`);
console.log('단계                              보수      선금  선금/자산  조달원가  웃돈(시세대비)  수량  실을수있나  자금이닿나');
console.log('─'.repeat(118));

for (const st of STAGES) {
  const pay = [], adv = [], ratio = [], cost = [], edge = [], net = [], qty = [];
  let fit = 0, over = 0, none = 0, afford = 0;
  for (let i = 0; i < SEEDS; i++) {
    setup(st);
    const assets = st.gold + collateral();
    for (let k = 0; k < CARDS; k++) {
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      state.at = city.id;
      if (state.fleet[state.shipKey]) state.fleet[state.shipKey].at = city.id;
      const day = st.day + k;
      const c = contractOffer(city.id, day);
      if (!c) { none++; continue; }
      if (c.qty > cargoCapTotal()) { over++; } else { fit++; }
      const buyCost = costFor(c.goodId, c.qty, city.id);
      // 선금을 받고 나면 그 자리에서 조달이 되나 — **초반의 탈출구가 실제로 성립하는가**
      if (buyCost <= state.gold + c.advance) afford++;
      const plain = gainFor(c.goodId, c.qty, c.to) * (1 - tariffRate(c.to));
      const days = Math.max(1, voyageDays(city.id, c.to, day));
      pay.push(c.pay); adv.push(c.advance); ratio.push(c.advance / Math.max(1, assets));
      cost.push(buyCost); edge.push(c.pay - plain); qty.push(c.qty);
      net.push(c.pay - buyCost - voyageCost(days).total);
    }
  }
  const tot = fit + over;
  console.log(
    `${st.label.padEnd(28)}${won(med(pay)).padStart(8)}${won(med(adv)).padStart(10)}`
    + `${med(ratio).toFixed(2).padStart(9)}배${won(med(cost)).padStart(10)}${won(med(edge)).padStart(14)}`
    + `${won(med(qty)).padStart(6)}${`${Math.round((fit / Math.max(1, tot)) * 100)}%`.padStart(10)}`
    + `${`${Math.round((afford / Math.max(1, tot)) * 100)}%`.padStart(12)}`,
  );
}

console.log('\n※ 「선금/자산」이 이 표의 판정선이다 — 1일차에 자산의 몇 배가 무이자로 들어오면');
console.log('  무역 사다리·중고선·술집이 통째로 건너뛰어진다. 「자금이닿나」는 그 반대쪽 판정선으로,');
console.log('  선금을 받고 나서 그 자리에서 조달이 되는 일감의 비율이다 — 0%가 되면 계약이 막다른 길이 된다.');
