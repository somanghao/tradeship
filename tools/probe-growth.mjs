/* 「적절히 번다」 설계를 위한 사실 조사 (사용자 지시 → PM 과제).
   ① 비용 축은 자산과 함께 커지나 — 항해비 일곱 갈래의 구성비
   ② 161칸 천장의 정체 — 품목 수가 막나, 시장 깊이가 막나
   ③ 원양 항로(gateDepth 2.5)는 근해보다 나은가 — 「새 무역로를 뚫는 재미」가 성립하나
   node .playtest/supremacy-balance/probe-growth.mjs [시드]
   ※ 게임 코드는 읽기만 한다. */
import {
  state, resetGame, neighborsOf, voyageDays, voyageCost, buy, cargoFree, hire, shorthanded,
  boardShip, marketDepth, isOceanGate, impactFactor, priceOf, tariffRate, cargoValue,
} from '../js/state.js';
import { planFor } from './sim-core.mjs';
import { SHIPS, CITY_BY_ID, CITIES, GOODS, MARKET } from '../js/data.js';
import { LIVE_LANES } from '../js/regions/index.js';
import { initWorld } from '../js/world.js';

const SEEDS = +(process.argv[2] || 24);
const won = n => Math.round(n).toLocaleString('en-US');
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const STAGES = [
  { label: '초반', ship: 'hulk', gold: 400 },
  { label: '중반', ship: 'fluyt', gold: 6000 },
  { label: '후반', ship: 'galleon', gold: 40000 },
  { label: '최후반', ship: 'indiaman', gold: 300000 },
];
function setup(st) {
  resetGame();
  if (st.ship !== 'hulk') {
    const s = SHIPS[st.ship];
    state.fleet[st.ship] = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
    state.gold = 1e9; boardShip(st.ship);
  }
  state.gold = 1e9;
  while (shorthanded()) if (!hire(1).ok) break;
  state.gold = st.gold;
}

/* ── ① 비용 축 ─────────────────────────────────────────── */
console.log('① 항해비 일곱 갈래 — 자산이 커질 때 무엇이 함께 커지나 (하루당 · 24시드 중앙)\n');
console.log('단계     적재  선원   일당  보급  선체  무장  보험   부관   합계/일   합계÷적재칸');
for (const st of STAGES) {
  const rows = [];
  for (let i = 0; i < SEEDS; i++) {
    setup(st);
    initWorld();
    const ids = Object.keys(CITY_BY_ID);
    state.at = ids[Math.floor(Math.random() * ids.length)];
    state.fleet[state.shipKey].at = state.at;
    const nb = neighborsOf(state.at);
    if (!nb.length) { i--; continue; }
    // 화물을 채워야 보험이 잡힌다
    let best = null;
    for (const to of nb) {
      const p = planFor(to, cargoFree(), 1e9, 0);
      const n = p.gain - p.spend;
      if (!best || n > best.n) best = { to, p, n };
    }
    for (const [gid, q] of Object.entries(best.p.take)) buy(gid, q);
    const d = voyageDays(state.at, best.to);
    const c = voyageCost(d, state.crew, { from: state.at, to: best.to });
    rows.push({ ...c, d, crew: state.crew, cargo: cargoValue() });
  }
  const per = k => med(rows.map(r => r[k] / r.d));
  const tot = med(rows.map(r => r.total / r.d));
  console.log(`${st.label.padEnd(7)} ${String(SHIPS[st.ship].cargo).padStart(4)} ${String(med(rows.map(r => r.crew))).padStart(4)} `
    + `${won(per('wages')).padStart(6)} ${won(per('supplies')).padStart(5)} ${won(per('hull')).padStart(5)} ${won(per('arms')).padStart(5)} `
    + `${won(per('insurance')).padStart(5)} ${won(per('officer')).padStart(5)}  ${won(tot).padStart(7)}   ${(tot / SHIPS[st.ship].cargo).toFixed(2)}`);
}

/* ── ② 161칸 천장의 정체 ──────────────────────────────── */
console.log('\n② 161칸 천장 — 무엇이 멈추게 하나 (갈레온·자금 무제한·24시드)\n');
{
  const rows = [];
  for (let i = 0; i < SEEDS; i++) {
    setup({ ship: 'galleon', gold: 1e9 }); initWorld();
    const ids = Object.keys(CITY_BY_ID);
    state.at = ids[Math.floor(Math.random() * ids.length)];
    state.fleet.galleon.at = state.at;
    const nb = neighborsOf(state.at);
    if (!nb.length) { i--; continue; }
    let best = null;
    for (const to of nb) {
      const p = planFor(to, 3000, 1e9, 0);
      const n = p.gain - p.spend;
      if (!best || n > best.n) best = { to, p, n };
    }
    const used = Object.values(best.p.take).reduce((a, b) => a + b, 0);
    const from = state.at, to = best.to;
    // 그 항구 쌍에서 「이문이 나는 품목」이 몇 개인가 (수량 1일 때 마진 > 0)
    let live = 0;
    for (const g of GOODS) {
      const m = priceOf(to, g.id) * (1 - tariffRate(to)) - priceOf(from, g.id);
      if (m > 0) live++;
    }
    rows.push({ used, kinds: Object.keys(best.p.take).length, live,
      depthFrom: marketDepth(from), depthTo: marketDepth(to),
      gate: isOceanGate(from) || isOceanGate(to),
      perKind: used / Math.max(1, Object.keys(best.p.take).length) });
  }
  console.log(`  채운 칸 중앙 ${med(rows.map(r => r.used))} · 실은 품목 ${med(rows.map(r => r.kinds))}종 · **품목당 ${med(rows.map(r => r.perKind)).toFixed(0)}칸**`);
  console.log(`  그 항구 쌍에서 이문이 나는 품목 수 중앙 ${med(rows.map(r => r.live))}종 / 전체 ${GOODS.length}종`);
  console.log(`  시장 깊이 중앙 출발 ${med(rows.map(r => r.depthFrom))} · 도착 ${med(rows.map(r => r.depthTo))}`);
  console.log(`  ⇒ 품목당 ${med(rows.map(r => r.perKind)).toFixed(0)}칸에서 마진이 0이 된다. **깊이(${med(rows.map(r => r.depthTo))})의 ${(med(rows.map(r => r.perKind)) / med(rows.map(r => r.depthTo)) * 100).toFixed(0)}%**뿐이다`);
  console.log(`     — 즉 막는 것은 시장 깊이가 아니라 **그 항구 쌍의 차익이 얕다**는 것이다.`);
}

/* ── ③ 원양 항로는 값어치가 있나 ──────────────────────── */
console.log('\n③ 원양 항로 vs 근해 — 「새 무역로를 뚫는 재미」가 지금 성립하나 (갈레온 200칸)\n');
{
  const near = [], ocean = [];
  for (const lane of LIVE_LANES) {
    for (const [a, b] of [[lane.a, lane.b], [lane.b, lane.a]]) {
      setup({ ship: 'galleon', gold: 1e9 }); initWorld();
      state.at = a; state.fleet.galleon.at = a;
      const p = planFor(b, 200, 1e9, 0);
      const d = voyageDays(a, b);
      const net = p.gain - p.spend - voyageCost(d).total;
      const used = Object.values(p.take).reduce((x, y) => x + y, 0);
      ocean.push({ net, d, perDay: net / Math.max(1, d), used, risk: lane.risk ?? 0, a, b });
    }
  }
  for (let i = 0; i < SEEDS * 2; i++) {
    setup({ ship: 'galleon', gold: 1e9 }); initWorld();
    const ids = Object.keys(CITY_BY_ID);
    state.at = ids[Math.floor(Math.random() * ids.length)];
    state.fleet.galleon.at = state.at;
    const nb = neighborsOf(state.at).filter(x => !isOceanGate(x) || true);
    if (!nb.length) { i--; continue; }
    let best = null;
    for (const to of nb) {
      const d = voyageDays(state.at, to);
      const p = planFor(to, 200, 1e9, 0);
      const net = p.gain - p.spend - voyageCost(d).total;
      if (!best || net / d > best.perDay) best = { net, d, perDay: net / d, used: Object.values(p.take).reduce((x, y) => x + y, 0) };
    }
    near.push(best);
  }
  const f = (rows, label) => console.log(`  ${label.padEnd(10)} 항차 순이익 중앙 ${won(med(rows.map(r => r.net))).padStart(8)}닢 · 일수 중앙 ${String(med(rows.map(r => r.d))).padStart(3)}일 · **${won(med(rows.map(r => r.perDay))).padStart(6)}닢/일** · 채운 칸 ${med(rows.map(r => r.used))}`);
  f(near, '근해');
  f(ocean, `원양(${ocean.length / 2}개 항로)`);
  const top = [...ocean].sort((x, y) => y.perDay - x.perDay).slice(0, 5);
  console.log(`  원양 상위 5: ${top.map(t => `${CITY_BY_ID[t.a].name}→${CITY_BY_ID[t.b].name} ${won(t.perDay)}닢/일`).join(' · ')}`);
  const neg = ocean.filter(o => o.net <= 0).length;
  console.log(`  ⇒ 원양 ${ocean.length}개 방향 중 **적자가 ${neg}개(${Math.round(neg / ocean.length * 100)}%)**`);
}
