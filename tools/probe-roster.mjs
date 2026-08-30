// probe-roster.mjs — **명부 40이 실제로 닫히는 구조인가**
//
// 회차 26 이월 ①. 실플레이 **984 게임일에 명부 조우 0회**(supremacy ISSUES #12) 뒤에
// 「찾아가야 만난다」(`bounty-tip` → `huntedOnLeg`)를 넣었다. 그런데 **넣은 것과 도는 것은
// 다른 문장이다** — 이 저장소가 세 번 겪은 자리다. 그래서 소문 줄을 세지 않고 **결과를 센다**:
//
//   ① 정적 도달성 — `hunt` 키가 실재 항로인가 · `riskKey` 정렬형과 **정확히** 일치하는가
//      (`huntedOnLeg`는 일치할 때만 열린다) · 그 구간에 해적이 뜨긴 하는가(`routeRisk !== null`)
//   ② 살 수 있는가 — 소굴 권역에서 소식이 팔리는가 · 값이 화면에 오르는가(권역 최저 2인만 뜬다)
//   ③ **만나는가** — 소식을 사고 `ROSTER.tipDays` 동안 그자의 사냥터를 왕복하면
//      `map.js`가 밟는 것과 **같은 판정 경로**로 몇 번 만나나 (`rollSeaEvent` → `huntedOnLeg`)
//
// ★ 하네스가 게임을 흉내 내지 않는다 — `map.js`의 굴림 규칙(rollsLeft·EVENT_DAMP)을 그대로 쓰고
//   판정은 전부 게임의 함수(`rollSeaEvent`·`huntedOnLeg`·`activeBounty`)에 묻는다.
//
//   node tools/probe-roster.mjs [시드수]

import {
  state, resetGame, boardShip, hire, shorthanded, voyageDays, neighborsOf,
  routeRisk, encounterOdds, rollSeaEvent, buyBountyTip, activeBounty,
  bountyTipPrice, rosterOpenIn, huntLegs,
} from '../js/state.js';
import { SHIPS, ALL_PIRATES, CITY_BY_ID, riskKey, ROSTER, REGION_OF_CITY } from '../js/data.js';
import { initWorld, huntedOnLeg } from '../js/world.js';

const SEEDS = +(process.argv[2] || 12);
const won = (n) => Math.round(n).toLocaleString('en-US');
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (n) => `${(n * 100).toFixed(1)}%`;

/* `map.js`의 굴림 규칙 — 여기만 손으로 옮겨 적는다(씬은 소유 밖이라 import 못 한다).
   ⚠️ 저쪽이 바뀌면 여기도 바뀌어야 한다 → `map.js: EVENT_DAMP`·`rollsLeft`. */
const EVENT_DAMP = [1, 0.62, 0.45, 0.34];
const rollsFor = (days) => Math.max(1, Math.min(4, Math.ceil(days / 8)));

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 사냥에 나설 수 있는 자리 — 갈레온 단독·금고 넉넉(소식값이 막지 않게) */
function setup(at) {
  resetGame(at);
  state.gold = 1e7;
  const s = SHIPS.galleon;
  state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
  boardShip('galleon');
  while (shorthanded()) if (!hire(1).ok) break;
  while (state.crew < state.crewMax) if (!hire(1).ok) break;
  state.gold = 200000;
  initWorld();
}

/* ── ① 정적 도달성 ────────────────────────────────────────── */
function staticCheck(def) {
  const out = { id: def.id, name: def.name, region: def.region, tier: def.strength ?? 2,
                baseOK: !!CITY_BY_ID[def.base], legs: [], bad: [] };
  for (const key of def.hunt ?? []) {
    const [a, b] = String(key).split('|');
    if (!CITY_BY_ID[a] || !CITY_BY_ID[b]) { out.bad.push(`유령 도시 ${key}`); continue; }
    if (riskKey(a, b) !== key) { out.bad.push(`정렬형 아님 ${key}→${riskKey(a, b)}`); continue; }
    if (!neighborsOf(a).includes(b)) { out.bad.push(`항로 없음 ${key}`); continue; }
    const risk = routeRisk(a, b);
    if (risk === null) { out.bad.push(`내해라 해적 0 ${key}`); continue; }
    out.legs.push([a, b]);
  }
  /* 소굴이 항로에 걸려 있으면 `hunt`가 비어도 `nearBase`로 열린다 */
  if (!out.legs.length && out.baseOK) {
    for (const n of neighborsOf(def.base)) {
      if (routeRisk(def.base, n) !== null) { out.legs.push([def.base, n]); out.viaBase = true; break; }
    }
  }
  return out;
}

/* ── ③ 실제로 만나는가 — `map.js`와 같은 판정 경로 ─────────── */
function meetRuns(def, legs, seed) {
  const rand = mulberry32(seed);
  const [a, b] = legs[Math.floor(rand() * legs.length)];
  setup(a);
  const r = buyBountyTip(def);
  if (!r.ok) return { bought: false, met: 0, events: 0, days: 0 };

  let met = 0, events = 0, days = 0, from = a, to = b;
  while (activeBounty() && days < ROSTER.tipDays + 2) {
    const d = Math.max(1, voyageDays(from, to));
    const rolls = rollsFor(d);
    for (let i = 0; i < rolls; i++) {
      const ev = rollSeaEvent({ from, to, threat: 0, damp: EVENT_DAMP[i] ?? 0.3, rand });
      if (ev.id === 'calm') continue;
      events++;
      if (ev.id !== 'pirate') continue;
      state.at = from;                       // 씬은 항해 중이라도 `state.at`이 출발지다
      const npc = huntedOnLeg(from, to);
      if (npc && npc.defId === def.id) met++;
    }
    days += d; state.day += d; state.at = to;
    [from, to] = [to, from];                 // 왕복 순찰
  }
  return { bought: true, met, events, days, odds: encounterOdds({ from: a, to: b }) };
}

/* ── ② 살 수 있는가 — 화면은 권역 최저 2인만 내놓는다(`port.js`) ── */
function tipRank(def) {
  const opens = rosterOpenIn(def.region);
  const sorted = [...opens].sort((x, y) => bountyTipPrice(x) - bountyTipPrice(y));
  return { rank: sorted.findIndex((d) => d.id === def.id) + 1, of: sorted.length };
}

/* ══ 실행 ══════════════════════════════════════════════════ */
console.log(`명부 ${ALL_PIRATES.length}명 · 시드 ${SEEDS} · 소식 유효 ${ROSTER.tipDays}일 · 갈레온 단독\n`);

const rows = [];
for (const def of ALL_PIRATES) {
  const st = staticCheck(def);
  let met = [], evs = [], odds = 0, bought = 0;
  if (st.legs.length) {
    for (let s = 0; s < SEEDS; s++) {
      const r = meetRuns(def, st.legs, 1000 + s * 7919 + def.id.length);
      if (r.bought) bought++;
      met.push(r.met); evs.push(r.events); odds = r.odds ?? odds;
    }
  }
  const hit = met.filter((x) => x > 0).length / Math.max(1, SEEDS);
  rows.push({ ...st, tip: bountyTipPrice(def), rank: tipRank(def),
              medMet: med(met), hit, odds, bought, legN: st.legs.length });
}

/* §1 정적 */
const noLeg = rows.filter((r) => !r.legN);
const badAny = rows.filter((r) => r.bad.length);
console.log('§1 정적 도달성');
console.log(`   사냥터가 성립하는 자 ${rows.length - noLeg.length}/${rows.length}`
          + (noLeg.length ? ` — ⛔ 없는 자: ${noLeg.map((r) => r.name).join(' · ')}` : ' — ✅ 전원'));
if (badAny.length) {
  console.log(`   ⚠️ 못 쓰는 hunt 키가 있는 자 ${badAny.length}명:`);
  for (const r of badAny.slice(0, 12)) console.log(`      ${r.name.padEnd(10)} ${r.bad.join(' · ')}`);
  if (badAny.length > 12) console.log(`      … 그 외 ${badAny.length - 12}명`);
} else console.log('   ✅ hunt 키가 전부 실재 항로이고 정렬형이다');

/* §2 살 수 있는가 */
const off = rows.filter((r) => r.rank.rank <= 2).length;
console.log('\n§2 소식을 살 수 있는가 (화면은 권역 최저 2인만 내놓는다 — `port.js`)');
console.log(`   판 시작 시점에 매대에 오르는 자 ${off}/${rows.length}`
          + ` · 나머지는 앞의 이름이 닫혀야 올라온다(사다리)`);
console.log(`   소식값 중앙 ${won(med(rows.map((r) => r.tip)))}닢 · 최고 ${won(Math.max(...rows.map((r) => r.tip)))}닢`);

/* §3 만나는가 */
console.log('\n§3 소식을 사고 그 사냥터를 왕복하면 만나는가 (판정 경로는 `map.js`와 같다)');
console.log('세기  인원   조우확률   ' + `${ROSTER.tipDays}일 만남 중앙`.padStart(14) + '   한 번이라도 만남');
console.log('─'.repeat(70));
const byTier = new Map();
for (const r of rows) { const t = Math.min(5, Math.max(1, r.tier)); (byTier.get(t) ?? byTier.set(t, []).get(t)).push(r); }
for (const t of [1, 2, 3, 4, 5]) {
  const g = byTier.get(t) ?? [];
  if (!g.length) continue;
  console.log(`${String(t).padStart(3)}${String(g.length).padStart(6)}`
    + pct(med(g.map((r) => r.odds))).padStart(11)
    + String(med(g.map((r) => r.medMet))).padStart(14)
    + pct(med(g.map((r) => r.hit))).padStart(20));
}
const never = rows.filter((r) => r.hit === 0);
const reach = rows.length - never.length;
console.log(`\n   ★ 명부 도달 ${reach}/${rows.length} — ${ROSTER.tipDays}일 순찰에 한 번이라도 만나는 자`);
if (never.length) {
  console.log(`   ⛔ 한 번도 못 만나는 자 ${never.length}명:`);
  for (const r of never.slice(0, 12)) {
    console.log(`      ${r.name.padEnd(10)} ${r.region.padEnd(14)} 사냥터 ${r.legN}구간 · 조우 ${pct(r.odds)}`
      + (r.bad.length ? ` · ${r.bad[0]}` : ''));
  }
}
console.log(`\n   전체 중앙: ${ROSTER.tipDays}일에 ${med(rows.map((r) => r.medMet))}회 만남`
          + ` · 한 번이라도 만날 확률 ${pct(med(rows.map((r) => r.hit)))}`);
console.log('\n※ 이 도구는 「만나는가」까지만 센다 — 이기는가는 `sim-roster.mjs`(수지)와 전투가 답한다.');
void REGION_OF_CITY; void huntLegs;
