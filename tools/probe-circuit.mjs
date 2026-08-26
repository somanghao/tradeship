/* 회로의 항구 수가 곡선의 기울기를 정하는가 (PM 과제 ③).
   테스터 실측: 두 항구 왕복은 30~40일이면 마르고(천장 ≈800닢), 여섯을 엮으니 612→1,958닢/7일.
   여기서는 **압력 누적·급여 정산까지 실제로 돌려** 항구 수별 닢/일을 낸다.

   node .playtest/supremacy-balance/probe-circuit.mjs [판수] [일수] [배]
   ※ 게임 코드는 읽기만 한다. */
import {
  state, resetGame, neighborsOf, voyageDays, advanceDays, buy, sell, cargoFree,
  hire, shorthanded, boardShip, paydayDue, settlePayroll, tavernCrews, recruitBand,
} from '../js/state.js';
import { planFor, setLastPort, totalAssets } from './sim-core.mjs';
import { SHIPS } from '../js/data.js';
import { initWorld, worldTick } from '../js/world.js';

const N = +(process.argv[2] || 12);
const DAYS = +(process.argv[3] || 120);
const SHIP = process.argv[4] || 'hulk';
const SIZES = [2, 3, 4, 6, 8, 12];
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const won = n => Math.round(n).toLocaleString('en-US');

/** 시작 항구에서 너비우선으로 `k`개 항구를 잇는 회로를 만든다(서로 이웃인 것만). */
function circuitFrom(start, k) {
  const ring = [start];
  const seen = new Set([start]);
  while (ring.length < k) {
    const nb = neighborsOf(ring[ring.length - 1]).filter(x => !seen.has(x));
    if (!nb.length) break;
    const next = nb[0];
    ring.push(next); seen.add(next);
  }
  return ring;
}

function manCrew() {
  if (!shorthanded()) return;
  for (const b of tavernCrews(state.at).filter(b => !state.hired.includes(b.id))) {
    if (!shorthanded()) break;
    recruitBand(b.id);
  }
  while (shorthanded()) if (!hire(1).ok) break;
}

/** 고정 회로를 `DAYS`일 굴린다. 돌아오는 값은 하루당 총자산 증분. */
function runCircuit(k) {
  resetGame();
  if (SHIP !== 'hulk') {
    const s = SHIPS[SHIP];
    state.fleet[SHIP] = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
    state.gold = 50000; boardShip(SHIP);
  }
  initWorld(); manCrew();
  const ring = circuitFrom(state.at, k);
  if (ring.length < 2) return null;
  const a0 = totalAssets();
  let idx = 0, voyages = 0;
  const marks = {};
  while (state.day < DAYS) {
    // 판다
    for (const gid of Object.keys({ ...state.cargo })) if (state.cargo[gid] > 0) sell(gid, state.cargo[gid]);
    if (paydayDue()) { settlePayroll(); manCrew(); }
    marks[state.day] = totalAssets();
    /* 다음 항구 — **회로 안에서 가장 남는 곳**을 고른다.
       고정 순서로 돌면 "회로를 몇 개 엮었나"가 아니라 "순서가 운이 좋았나"를 재게 된다.
       실제 플레이어도 제 회로 안에서는 그날 가장 나은 곳으로 간다. */
    let dest = null, bestNet = -Infinity;
    for (const to of ring) {
      if (to === state.at) continue;
      if (!neighborsOf(state.at).includes(to)) continue;      // 직항이 있는 곳만
      const d = voyageDays(state.at, to);
      const pp = planFor(to, cargoFree(), Math.floor(state.gold * 0.92), 0);
      const n = pp.gain - pp.spend;
      if (n > bestNet) { bestNet = n; dest = to; }
    }
    if (!dest) { idx = (idx + 1) % ring.length; dest = ring[idx] === state.at ? ring[(idx + 1) % ring.length] : ring[idx]; }
    const p = planFor(dest, cargoFree(), Math.floor(state.gold * 0.92), 0);
    for (const [gid, n] of Object.entries(p.take)) buy(gid, n);
    setLastPort(state.at);
    const dd = voyageDays(state.at, dest);
    advanceDays(dd, { from: state.at, to: dest });
    worldTick(dd);
    state.at = dest;
    if (state.fleet[state.shipKey]) state.fleet[state.shipKey].at = dest;
    voyages++;
    if (voyages > 4000) break;
  }
  for (const gid of Object.keys({ ...state.cargo })) if (state.cargo[gid] > 0) sell(gid, state.cargo[gid]);
  const a1 = totalAssets();
  return { perDay: (a1 - a0) / Math.max(1, state.day - 1), end: a1, voyages, ring: ring.length,
    perVoy: (a1 - a0) / Math.max(1, voyages) };
}

console.log(`${N}판 · ${DAYS}일 · 기함 ${SHIP}(적재 ${SHIPS[SHIP].cargo}) · 부산포에서 이어 붙인 고정 회로\n`);
console.log(`회로 항구수   닢/일(중앙)   항차수   항차당 순증   ${DAYS}일 뒤 총자산`);
for (const k of SIZES) {
  const rows = [];
  for (let i = 0; i < N; i++) { const r = runCircuit(k); if (r) rows.push(r); }
  if (!rows.length) continue;
  console.log(`${String(rows[0].ring).padStart(9)}   ${won(med(rows.map(r => r.perDay))).padStart(11)}   ${String(med(rows.map(r => r.voyages))).padStart(6)}   ${won(med(rows.map(r => r.perVoy))).padStart(11)}   ${won(med(rows.map(r => r.end))).padStart(12)}`);
}
