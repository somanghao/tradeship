// sim-events.mjs — 돌발 이벤트·전투 보상이 **성장 단계마다 얼마나 큰가**
//
// `sim-trade.mjs`는 자산 곡선을, `sim-risk.mjs`는 조우 *빈도*를 잰다.
// 여기서 재는 것은 조우 *한 건의 크기*다 — 같은 이벤트가 금고 200닢인 시기와
// 20,000닢인 시기에 뜻이 같을 수 없으므로, 단계마다 **자산 대비 %**와
// **항차 순이익 대비 배수**로 환산한다. 후자가 더 중요하다:
// "이 사건 하나가 무역 몇 번과 맞먹나"가 곧 이벤트의 무게이기 때문이다.
//
//   node tools/sim-events.mjs [시드수]
//
// ★ 반드시 여러 시드를 평균한다(메모리: 1회 실행 표본오차를 결론으로 적어 오판한 적 있음).

import {
  state, resetGame, neighborsOf, voyageDays, voyageCost, buy, cargoValue, cargoFree,
  cargoUsed, hire, shorthanded, ship, jettisonCargo, banditRaid, payToll,
  jettisonOdds, officerPerk, boardShip, tariffRate,
} from '../js/state.js';
import { planFor, setLastPort } from './sim-core.mjs';
import {
  SHIPS, GOOD_BY_ID, ENEMIES, CITY_BY_ID, SHIP_RESALE, PRIZE_SCRAP,
  INSURANCE_COVER, INLAND_LOSS, INLAND_ODDS, SEA_EVENTS,
} from '../js/data.js';
import { ALL_PIRATES } from '../js/regions/index.js';
import { pirateEnemy } from '../js/world.js';

const SEEDS = +(process.argv[2] || 12);

/* ══════════════════════════════════════════════════════════════
   ★ scenes/map.js에서 **거울로 베껴 온 값**들
   이벤트 처리의 일부는 아직 씬에 상수로 박혀 있다(→ 보고서 §"안 고친 것").
   여기 값이 저쪽과 어긋나면 이 도구가 조용히 거짓말을 한다.
   출처: js/scenes/map.js `resolveEvent()` — drift / storm / pirate 도주.
   ══════════════════════════════════════════════════════════════ */
const MIRROR = {
  driftCoin: [60, 300],          // 표류물 금화 (60 + rand*240)
  driftQty: [3, 11],             // 표류물 화물 개수 (3 + floor(rand*8))
  driftGoods: ['salt', 'wine', 'grain', 'fur', 'ceramic'],
  stormHull: [6, 20],            // 폭풍 선체 피해 (6 + floor(rand*14))
  stormCrewOdds: 0.35,           // 선원 실종 확률
  stormCrew: [1, 3],
  fleeCargoShare: 0.35,          // '화물을 던지고 도주' — 품목마다 35%
  fleeGoldShare: 0.12,           // 그리고 금화 12%
  repairUnit: 14,                // REPAIR_UNIT (data.js) — 선체 1pt당
};

/* ── 시드 ─────────────────────────────────────────────────── */
function withSeed(seed, fn) {
  const orig = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = orig; }
}

const mid = ([a, b]) => (a + b) / 2;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const won = (n) => Math.round(n).toLocaleString('ko-KR');

/* ── 단계 ─────────────────────────────────────────────────────
   금고와 배는 **함께** 움직인다 — 200닢으로 갈레온을 몰 수 없고
   20,000닢을 쥔 채 낡은 바사를 몰 이유도 없다. */
const STAGES = [
  { key: 'early', label: '초반', gold: 200, shipKey: 'hulk', note: '낡은 바사 · 200~1,100닢' },
  { key: 'mid', label: '중반', gold: 4000, shipKey: 'caravel', note: '카라벨 · 1,100~10,000닢' },
  { key: 'late', label: '후반', gold: 20000, shipKey: 'galleon', note: '갈레온 · 10,000~42,000닢' },
];

/** 그 단계의 배와 금고를 갖춘 상태를 만들고, 화물을 싣고, 출항 직전에서 멈춘다. */
function setupStage(st) {
  resetGame();
  if (st.shipKey !== 'hulk') {
    const s = SHIPS[st.shipKey];
    state.fleet[st.shipKey] = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
    state.gold = 10 ** 7;
    boardShip(st.shipKey);
  }
  // 사람을 채운다 — 부두 고용으로 단순화한다(술집은 시드마다 매물이 달라 비교를 흐린다)
  state.gold = 10 ** 7;
  while (shorthanded()) if (!hire(1).ok) break;
  state.gold = st.gold;

  // 이웃 중 가장 남는 곳으로 화물을 싣는다(sim-core와 같은 눈)
  setLastPort(null);
  let best = null;
  for (const to of neighborsOf(state.at)) {
    const days = voyageDays(state.at, to);
    const cost = voyageCost(days).total;
    const p = planFor(to, cargoFree(), state.gold, 0.15);
    const net = p.gain - p.spend - cost;
    if (!best || net > best.net) best = { to, ...p, net, days, cost };
  }
  if (best) for (const [gid, n] of Object.entries(best.take)) buy(gid, n);
  return best;
}

/** 지금 실은 화물의 **매입가** 합계 — 잃었을 때 실제로 날아가는 돈 */
function cargoCost() {
  let sum = 0;
  for (const [gid, n] of Object.entries(state.cargo)) sum += (state.buyPrice[gid] || GOOD_BY_ID[gid].base) * n;
  return sum;
}

const snapshot = () => ({
  gold: state.gold, cargo: { ...state.cargo }, buyPrice: { ...state.buyPrice },
  hp: state.hp, crew: state.crew,
});
const restore = (s) => Object.assign(state, {
  gold: s.gold, cargo: { ...s.cargo }, buyPrice: { ...s.buyPrice }, hp: s.hp, crew: s.crew,
});

/* ── 단계별 측정 ──────────────────────────────────────────── */
const TRIALS = 40;

function measure(st) {
  const run = setupStage(st);
  const base = snapshot();
  const cargoAt = cargoCost();
  const assets = state.gold + cargoAt;          // 가용자산 = 금고 + 실은 짐(매입가)
  const legTo = run?.to ?? null;
  const voyNet = run?.net ?? 0;

  const out = { st, assets, cargoAt, gold: state.gold, voyNet, legTo, days: run?.days ?? 0, ev: {} };

  // 폭풍 투하 — 실제 함수를 돌린다
  const jets = [];
  for (let i = 0; i < TRIALS; i++) {
    restore(base);
    const j = jettisonCargo(0.4);
    jets.push(j ? j.payout - j.value : 0);
  }
  out.ev.jettison = median(jets);

  // 노상강도 (내해·육로)
  const bandits = [];
  for (let i = 0; i < TRIALS; i++) { restore(base); bandits.push(-banditRaid().value); }
  out.ev.bandit = median(bandits);

  // 통행세
  const tolls = [];
  for (let i = 0; i < TRIALS; i++) { restore(base); tolls.push(-payToll().fee); }
  out.ev.toll = median(tolls);
  restore(base);

  // 표류물 — scenes/map.js 거울
  const salv = 1 + officerPerk('salvageUp');
  const driftQty = Math.min(cargoFree(), Math.round(mid(MIRROR.driftQty) * salv));
  const driftGoodVal = driftQty * (MIRROR.driftGoods.reduce((a, g) => a + GOOD_BY_ID[g].base, 0) / MIRROR.driftGoods.length);
  out.ev.drift = Math.round(mid(MIRROR.driftCoin) * salv) + driftGoodVal;

  // 폭풍 선체 피해 → 수리비(금화 환산)
  out.ev.stormHull = -Math.round(mid(MIRROR.stormHull) * MIRROR.repairUnit);
  out.ev.stormHullPct = mid(MIRROR.stormHull) / state.maxHp;
  out.ev.stormCrewPct = (MIRROR.stormCrewOdds * mid(MIRROR.stormCrew)) / Math.max(1, state.crew);

  // 해적에게 짐을 던지고 도주
  out.ev.flee = -Math.round(cargoAt * MIRROR.fleeCargoShare + state.gold * MIRROR.fleeGoldShare);

  // 고정 적함(ENEMIES) — 나포 시 전리품
  out.enemies = ENEMIES.map((e) => ({
    name: e.name, level: e.level,
    capture: mid(e.loot.gold) + prizeValue(e.prize),
    sink: mid(e.loot.gold) * 0.45,
  }));

  return out;
}

/** 나포선의 값 — 같은 선종을 이미 가졌으면 해체(0.30), 아니면 선단에 들어온다(되팔면 0.55) */
function prizeValue(key) {
  if (!key || !SHIPS[key]) return 0;
  return Math.round(SHIPS[key].price * SHIP_RESALE * 0.6 /* 선체 60%만 남아 값이 깎인다 */);
}

/* ── NPC 해적 명부 ────────────────────────────────────────── */
function pirateRoster() {
  const rows = [];
  for (const d of ALL_PIRATES) {
    const key = d.ship && SHIPS[d.ship] ? d.ship : 'brig';
    const s = SHIPS[key];
    const lv = Math.min(5, Math.max(1, d.strength ?? 2));
    const mul = 0.62 + lv * 0.14;
    // world.js: pirateEnemy — 생성 직후(purse 그대로)의 전리품
    const g0 = Math.max(200, d.purse ? d.purse[0] : 300);
    const g1 = Math.max(200, d.purse ? d.purse[1] : 1200);
    const lootLo = Math.round(g0 * 0.6) + (d.bounty ? d.bounty[0] : 0);
    const lootHi = g1 + (d.bounty ? d.bounty[1] : 0);
    rows.push({
      id: d.id, name: d.name, lv, ship: s.name, shipKey: key,
      hp: Math.round(s.hp * mul), guns: Math.max(2, Math.round(s.guns * mul)),
      crew: Math.max(10, Math.round(s.crewMax * (0.35 + lv * 0.09))),
      lootLo, lootHi, prize: prizeValue(key),
    });
  }
  return rows.sort((a, b) => a.lv - b.lv || a.lootLo - b.lootLo);
}

/* ══════════════════════════════════════════════════════════════ */
const stages = [];
for (const st of STAGES) {
  const runs = [];
  for (let i = 0; i < SEEDS; i++) {
    runs.push(withSeed((2166136261 + i * 16777619) >>> 0, () => measure(st)));
  }
  const avg = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  stages.push({
    st, assets: avg((r) => r.assets), cargoAt: avg((r) => r.cargoAt), gold: avg((r) => r.gold),
    voyNet: avg((r) => r.voyNet), days: avg((r) => r.days),
    ev: Object.fromEntries(Object.keys(runs[0].ev).map((k) => [k, avg((r) => r.ev[k])])),
    enemies: runs[0].enemies,
  });
}

console.log(`\n════ 이벤트·전투 보상의 크기 (시드 ${SEEDS} 평균) ════\n`);

console.log('단계별 기준선');
console.log('             배            금고      실은 짐     가용자산    항차 순이익');
for (const s of stages) {
  console.log(`  ${s.st.label.padEnd(6)} ${SHIPS[s.st.shipKey].name.padEnd(10)}`
    + `${won(s.gold).padStart(9)}${won(s.cargoAt).padStart(11)}${won(s.assets).padStart(11)}`
    + `${won(s.voyNet).padStart(12)}  (${s.days.toFixed(1)}일)`);
}

const EV_ROWS = [
  ['표류물 발견 (drift)', 'drift'],
  ['폭풍 — 투하 순손실', 'jettison'],
  ['폭풍 — 선체 수리비', 'stormHull'],
  ['해적에 짐 던지고 도주', 'flee'],
  ['노상강도 (육로)', 'bandit'],
  ['통행세 (육로)', 'toll'],
];

console.log('\n이벤트 한 건의 크기 — 금화 환산 / 가용자산 대비 % / 항차 순이익 대비 배수');
console.log('                          초반                중반                후반');
for (const [label, key] of EV_ROWS) {
  let line = `  ${label.padEnd(22)}`;
  for (const s of stages) {
    const v = s.ev[key];
    const pct = (v / s.assets) * 100;
    const mulv = s.voyNet > 0 ? v / s.voyNet : NaN;
    line += `${(won(v) + `닢`).padStart(9)} ${(`${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`).padStart(6)} `
      + `${(Number.isFinite(mulv) ? `${mulv >= 0 ? '' : ''}${mulv.toFixed(1)}x` : '—').padStart(6)}`;
  }
  console.log(line);
}

console.log('\n폭풍의 비화폐 피해 (선체·선원은 금화로 안 잡힌다)');
for (const s of stages) {
  console.log(`  ${s.st.label}  선체 ${(s.ev.stormHullPct * 100).toFixed(0)}% / 1회`
    + `   선원 손실 ${(s.ev.stormCrewPct * 100).toFixed(1)}% / 1회`);
}

console.log('\n고정 적함(ENEMIES) — 나포 시 전리품(금화 + 나포선 되판 값)');
console.log('                                 전리품      초반%     중반%     후반%');
for (const e of stages[0].enemies) {
  const line = `  lv${e.level} ${e.name.padEnd(22)} ${won(e.capture).padStart(8)}`
    + stages.map((s) => `${((e.capture / s.assets) * 100).toFixed(0)}%`.padStart(10)).join('');
  console.log(line);
}

console.log('\nNPC 해적 명부 — pirateEnemy() 실측 (생성 직후 · 습격 전)');
console.log('  세기 이름                        배           hp  포  선원      전리품(금화)    +나포선     초반자산대비');
for (const r of pirateRoster()) {
  console.log(`   ${r.lv}  ${r.name.padEnd(24)}${r.ship.padEnd(12)}`
    + `${String(r.hp).padStart(4)}${String(r.guns).padStart(4)}${String(r.crew).padStart(5)}`
    + `   ${(won(r.lootLo) + '~' + won(r.lootHi)).padStart(15)}`
    + `${won(r.prize).padStart(9)}`
    + `${(((mid([r.lootLo, r.lootHi]) + r.prize) / stages[0].assets) * 100).toFixed(0).padStart(9)}%`);
}

const s1 = pirateRoster().filter((r) => r.lv === 1);
if (s1.length) {
  const lo = Math.min(...s1.map((r) => r.lootLo)), hi = Math.max(...s1.map((r) => r.lootHi));
  const prize = Math.round(s1.reduce((a, r) => a + r.prize, 0) / s1.length);
  console.log(`\n  ★ 세기 1 해적 하나 = 금화 ${won(lo)}~${won(hi)} + 나포선 ~${won(prize)}닢`
    + `  = 시작 자산의 ${(((mid([lo, hi]) + prize) / stages[0].assets) * 100).toFixed(0)}%`
    + ` · 초반 항차 순이익의 ${((mid([lo, hi]) + prize) / stages[0].voyNet).toFixed(1)}배`);
}

console.log(`\n조우 빈도 참고 — 해적 ${SEA_EVENTS.find((e) => e.id === 'pirate').weight}% ·`
  + ` 폭풍 ${SEA_EVENTS.find((e) => e.id === 'storm').weight}% ·`
  + ` 표류물 ${SEA_EVENTS.find((e) => e.id === 'drift').weight}% ·`
  + ` 뭍 ${(INLAND_ODDS * 100).toFixed(0)}% (보험 보상률 ${(INSURANCE_COVER * 100).toFixed(0)}%)\n`);
