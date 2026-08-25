// sim-roster.mjs — **명부 사냥이 사다리인가 벌금인가**
//
// 실플레이에서 삼도의 왜구(세기 1) 사냥이 벌이 1,457닢에 순찰비 1,758닢으로 **−301닢**이었다.
// 그런데 명부 40명의 `hunt` 구간을 무역으로 뛰어 보면 **적자가 하나도 없다** — 당연하다,
// **해적은 털 것이 지나가는 곳에 앉아 있다.** 게임이 그 사실을 화면에서 말하지 않을 뿐이었다.
//
// 이 도구가 답해야 하는 것 셋:
//   ① 세기별 수지가 **오르는 사다리**인가 (약한 자가 값이 되나)
//   ② **빈 배로 순찰**했을 때와 **그 구간을 무역하며 순찰**했을 때가 얼마나 다른가
//   ③ 소식값이 현상금보다 비싼 자리가 있나 (사다리의 첫 칸이 마이너스인가)
//
//   node tools/sim-roster.mjs [시드수]
//
// ※ 수치는 여러 시드의 중앙값이다(1회 실행으로 판단하지 않는다 — 프로젝트 규약).

import {
  state, resetGame, boardShip, hire, shorthanded, voyageCost, voyageDays, neighborsOf,
  bountyTipPrice, tamePrice, capLoot, cargoFree, rosterOpenIn, routeRisk,
} from '../js/state.js';
import { planFor } from './sim-core.mjs';
import { SHIPS, ALL_PIRATES, CITY_BY_ID } from '../js/data.js';
import { initWorld } from '../js/world.js';

const SEEDS = +(process.argv[2] || 8);
const PATROL = 10;                       // 순찰 일수 — 설계문(P6-0)과 같은 눈금
const won = (n) => Math.round(n).toLocaleString('en-US');
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/* 후반의 자리 — 갈레온 단독 · 금고 60,000닢(설계문 P6-0과 같다) */
function setup(at) {
  resetGame(at);
  state.gold = 1e7;
  const s = SHIPS.galleon;
  state.fleet.galleon = { at: state.at, hp: s.hp, arms: { light: s.guns, medium: 0, long: 0 }, refits: {} };
  boardShip('galleon');
  while (shorthanded()) if (!hire(1).ok) break;
  while (state.crew < state.crewMax) if (!hire(1).ok) break;
  state.gold = 60000;
}

/** 그자를 잡으면 실제로 손에 쥐는 금화 — `capLoot`을 실제로 통과시킨다 */
function takeFrom(def) {
  const purse = def.purse ? (def.purse[0] + def.purse[1]) / 2 : 800;
  const lv = Math.min(5, Math.max(1, def.strength ?? 2));
  const e = capLoot({
    loot: { gold: [Math.round(purse * 0.6), purse], goods: ['salt', 'wine'] },
    bounty: def.bounty ?? null,       // ★ 지갑과 갈라 둔다 — `capLoot`을 안 지난다
  });
  void lv;
  const gold = (e.loot.gold[0] + e.loot.gold[1]) / 2;
  /* ★ 현상금은 **`capLoot` 밖**이다(P6-2) — 옮겨 싣는 물건이 아니라 항구에서 받는 돈이라
     갑판 인원과 무관하다. 그래서 상한을 안 지나고 그대로 더해진다. */
  const bounty = e.bounty ? (e.bounty[0] + e.bounty[1]) / 2 : 0;
  return gold + bounty;
}

/** 그자의 사냥터를 **무역으로** 뛰면 하루에 얼마인가 — 빈 배 순찰과 나란히 놓는다 */
function huntLegValue(def) {
  const keys = def.hunt ?? [];
  let best = null;
  for (const key of keys) {
    const [a, b] = key.split('|');
    if (!CITY_BY_ID[a] || !CITY_BY_ID[b]) continue;
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!neighborsOf(from).includes(to)) continue;
      setup(from);
      const days = Math.max(1, voyageDays(from, to));
      const p = planFor(to, cargoFree(), state.gold, 0);
      const net = p.gain - p.spend - voyageCost(days).total;
      const perDay = net / days;
      if (!best || perDay > best.perDay) best = { perDay, from, to, days };
    }
  }
  return best;
}

console.log(`시드 ${SEEDS} · 갈레온 단독 · 금고 60,000닢 · 순찰 ${PATROL}일 (중앙값)\n`);

const byTier = new Map();
for (const def of ALL_PIRATES) {
  const t = Math.min(5, Math.max(1, def.strength ?? 2));
  if (!byTier.has(t)) byTier.set(t, []);
  byTier.get(t).push(def);
}

/* ★ **사다리는 「사냥 수지」로 읽는다** — `실수령 − 소식값`. 그것이 *"그자를 잡을 값이 되나"*이고,
   순찰비와 무역은 그 위에 얹히는 별개의 축이다. 무역을 섞어 한 칸으로 합치면 무역이 사냥을
   덮어 버려(10일에 2만 닢대) **세기 차이가 안 보인다** — 그러면 사다리를 재는 자가 못 된다. */
console.log('세기  인원  현상금상한   소식값   실수령   ┃ **사냥 수지**   빈배 순찰비   빈배로 순찰   사냥터 무역(10일)   무역하며 순찰   적자사냥터');
console.log('─'.repeat(132));

const rowsAll = [];
for (const t of [1, 2, 3, 4, 5]) {
  const defs = (byTier.get(t) ?? []).filter((d) => d.hunt?.length);
  if (!defs.length) continue;
  const tips = [], takes = [], patrols = [], trades = [], caps = [];
  let redLegs = 0;
  for (const def of defs) {
    const per = [];
    for (let i = 0; i < SEEDS; i++) {
      setup(def.base && CITY_BY_ID[def.base] ? def.base : 'venezia');
      initWorld();
      const hv = huntLegValue(def);
      if (hv) per.push(hv.perDay);
    }
    const perDay = med(per);
    if (perDay < 0) redLegs++;
    setup(def.base && CITY_BY_ID[def.base] ? def.base : 'venezia');
    tips.push(bountyTipPrice(def));
    takes.push(takeFrom(def));
    patrols.push(voyageCost(PATROL).total);
    trades.push(perDay * PATROL);
    caps.push(def.bounty?.[1] ?? 0);
  }
  const tip = med(tips), take = med(takes), patrol = med(patrols), trade = med(trades);
  rowsAll.push({ t, n: defs.length, tip, take, patrol, trade, red: redLegs, cap: med(caps) });
  console.log(
    `${String(t).padStart(3)}${String(defs.length).padStart(6)}${won(med(caps)).padStart(12)}${won(tip).padStart(9)}`
    + `${won(take).padStart(9)}   ┃${won(take - tip).padStart(14)}${won(patrol).padStart(14)}`
    + `${won(take - tip - patrol).padStart(14)}${won(trade).padStart(19)}${won(take - tip + trade).padStart(16)}`
    + `${String(redLegs + '/' + defs.length).padStart(11)}`,
  );
}

const first = rowsAll[0], last = rowsAll[rowsAll.length - 1];
console.log('\n※ 「빈배로 순찰」이 마이너스인데 「무역하며 순찰」이 플러스면 — 고칠 것은 현상금이 아니라 **정보**다.');
console.log('  (명부를 만든 사람이 해적을 값나가는 항로에 앉혔다. 당연하다 — 해적은 털 것이 지나가는 곳에 있다.)');
if (first && last) {
  const a = first.take - first.tip, b = last.take - last.tip;
  console.log(`   사다리(사냥 수지): 세기 ${first.t} ${won(a)}닢 → 세기 ${last.t} ${won(b)}닢`
            + ` (${(b / Math.max(1, a)).toFixed(1)}배)`
            + (a <= 0 ? '  ⚠️ 첫 칸이 마이너스다 — 약한 자는 잡을 이유가 없다' : ''));
}
/* 소식값이 그 세기 **현상금 하한**보다 비싼 자리 — 사다리의 첫 칸이 마이너스로 시작하는 자리다 */
const bad = [];
for (const def of ALL_PIRATES) {
  const lo = def.bounty?.[0] ?? 0;
  if (lo && bountyTipPrice(def) > lo) bad.push(`${def.name}(소식 ${won(bountyTipPrice(def))} > 현상금 하한 ${won(lo)})`);
}
console.log(bad.length
  ? `   ⚠️ 소식이 현상금보다 비싼 자 ${bad.length}명: ${bad.slice(0, 4).join(' · ')}${bad.length > 4 ? ' …' : ''}`
  : '   ✅ 소식이 현상금보다 비싼 자는 없다');
void rosterOpenIn; void tamePrice; void routeRisk;
