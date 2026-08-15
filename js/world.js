// world.js — 지중해에서 저 혼자 돌아가는 세계 (NPC 담당 영역)
//
// 상인 NPC가 실제로 항구를 돌며 사고팔고, 해적 NPC가 그들을 노린다.
// 핵심은 "연출"이 아니라 **같은 시장을 쓴다**는 것 — NPC의 거래가 플레이어가 보는
// 시세에 그대로 압력으로 남는다. 늦게 가면 이미 쓸어간 뒤다.
//
// ★ 이 파일은 **생성·시간진행·습격 처리·조회**만 한다.
//   · 몇 척이 어떤 배로 도는가 → `js/npc/config.js`
//   · 어디로 갈지 어떻게 정하는가 → `js/npc/behavior.js`
//   판단을 저쪽에 몰아둔 덕에, 행동 규칙을 통째로 갈아 끼워도 여기는 그대로다.
//
// state.js를 한 방향으로만 import한다(여기서 state를 쓰고, state는 여기를 모른다).
// 그래서 순환 참조가 없다. 시간 진행은 호출자(map.js)가 advanceDays 뒤에 worldTick을 부른다.

import { CITIES, CITY_BY_ID, GOODS, GOOD_BY_ID, SHIPS } from './data.js';
import {
  state, neighborsOf, distanceBetween, priceOf, addPressure, tariffRate, pushLog, addShock,
  capLoot,
} from './state.js';
import { SHOCK } from './data.js';
import { NPC, TRADER_SHIPS, PIRATE_SHIPS, TRADER_NAMES, PIRATE_NAMES, PURSE } from './npc/config.js';
import { chooseTrade, choosePirateMove, chooseWander } from './npc/behavior.js';
import { ALL_TRADERS, ALL_PIRATES, ALL_FIGURES, REGION_OF_CITY } from './regions/index.js';
import { seasonOf, inSeason } from './state.js';
import { riskKey } from './map/geo.js';

let seq = 0;
const rnd = () => Math.random();

/* ── 명부에서 뽑는다 ───────────────────────────────────────────
   예전에는 이름 목록에서 돌려 쓰고 배는 아무거나 골랐다. 지중해 한 바다에 아홉 척일 때는
   그것으로 됐지만, 아홉 권역이 되자 **어느 바다에서든 똑같은 배가 도는** 세계가 됐다.
   지금은 권역마다 적어 둔 명부(`js/regions/<권역>/npc-traders.js`·`npc-pirates.js`)에서
   뽑는다 — 그 바다에 있던 상단과 그 바다에서 이름난 해적이 그 바다에 뜬다.

   ★ 철을 가린다. 바르바리 코르세어는 여름에만 나오고 발트는 겨울에 얼어 배가 안 떴다.
     `season`이 안 맞는 명부는 아예 안 뽑히므로 **달마다 어느 바다가 위험한지가 바뀐다.**
   ★ 명부보다 척수가 많으면 남는 자리는 예전처럼 무명 배로 채운다 — 세계가 비지 않게. */
function inUse(kind) {
  return new Set((state.npcs ?? []).filter((n) => n.defId).map((n) => n.defId));
}

function pickDef(list) {
  const used = inUse();
  const pool = list.filter((d) => inSeason(d) && !used.has(d.id));
  return pool.length ? pick(pool) : null;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = ([lo, hi]) => lo + Math.round(rnd() * (hi - lo));

/** behavior.js가 판단에 쓰는 창구 — 게임 모듈을 저쪽에 노출하지 않기 위한 얇은 껍데기 */
const ctx = {
  neighbors: neighborsOf,
  price: priceOf,
  tariff: tariffRate,
  goods: GOODS,
  ships: SHIPS,
  tradersNear: (cityId) => tradersNear(cityId),
  /* 그 해적이 즐겨 노리는 구간인가 — `behavior.js`가 게임 모듈을 모른 채 판단하도록
     키 계산까지 여기서 해 넘긴다. 저쪽은 "이 수가 크면 그쪽으로 기운다"만 알면 된다. */
  huntBonus: (npc, to) => (npc.hunt?.includes(riskKey(npc.at, to)) ? 3.2 : 0),
  rnd,
};

/* ── 생성 ─────────────────────────────────────────────────── */
export function initWorld() {
  seq = 0;
  state.npcs = [];
  for (let i = 0; i < NPC.traders; i++) state.npcs.push(makeTrader());
  for (let i = 0; i < NPC.pirates; i++) state.npcs.push(makePirate());
}

function makeTrader() {
  const def = pickDef(ALL_TRADERS);
  const shipKey = (def?.ship && SHIPS[def.ship]) ? def.ship : pick(TRADER_SHIPS);
  // 순회로가 있으면 그 첫 항구에서 시작한다 — 도는 길이 정해진 상단이라야
  // "지금 알렉산드리아에 가면 그 배가 있겠다"는 예측이 선다
  const at = def?.circuit?.length ? def.circuit[0]
    : (def?.region ? pick(CITIES.filter((c) => c.region === def.region) || CITIES).id : pick(CITIES).id);
  return {
    id: ++seq, kind: 'trader',
    defId: def?.id ?? null,
    name: def?.name ?? TRADER_NAMES[seq % TRADER_NAMES.length],
    flag: def?.flag ?? null,
    rank: def?.rank ?? 2,
    goods: def?.goods ?? null,           // 전문 상단은 다루는 품목이 좁다
    scope: def?.scope ?? 'region',       // 'ocean'이면 원양 항로를 넘나든다
    circuit: def?.circuit ?? null,
    circuitIdx: 0,
    shipKey, at: CITY_BY_ID[at] ? at : pick(CITIES).id, to: null, days: 0, legs: 0,
    gold: def?.purse ? between(def.purse) : between(PURSE.trader),
    cargo: {}, hp: SHIPS[shipKey].hp,
  };
}

function makePirate() {
  const def = pickDef(ALL_PIRATES);
  const shipKey = (def?.ship && SHIPS[def.ship]) ? def.ship : pick(PIRATE_SHIPS);
  const at = def?.base && CITY_BY_ID[def.base] ? def.base : pick(CITIES).id;
  return {
    id: ++seq, kind: 'pirate',
    defId: def?.id ?? null,
    name: def?.name ?? PIRATE_NAMES[seq % PIRATE_NAMES.length],
    flag: def?.flag ?? 'pirate',
    // 전투력 — 예전에는 전부 level 2였다. 바르바로사와 좀도둑이 같은 급으로 나왔다는 뜻이다
    strength: def?.strength ?? 2,
    bounty: def?.bounty ?? null,
    base: at,
    hunt: def?.hunt ?? null,             // 즐겨 노리는 구간
    scope: def?.scope ?? 'region',
    circuit: def?.circuit ?? null,
    circuitIdx: 0,
    shipKey, at, to: null, days: 0, legs: 0,
    gold: def?.purse ? between(def.purse) : between(PURSE.pirate),
    cargo: {}, hp: SHIPS[shipKey]?.hp ?? 90, kills: 0,
  };
}

/* ── 하루 진행 ────────────────────────────────────────────── */
export function worldTick(days = 1) {
  if (!state.npcs?.length) initWorld();
  const news = [];
  for (let d = 0; d < days; d++) {
    for (const n of state.npcs) stepOne(n, news);
    raids(news);
  }
  /* 철이 지난 배는 **항구에 있을 때만** 물러난다 — 바다 한복판에서 배가 사라지면
     플레이어가 본 것이 무엇이었는지 설명되지 않는다. 발트가 얼고 계절풍이 뒤집히면
     그 바다의 배가 한 철 통째로 자취를 감추는 것이 이 규칙의 목적이다. */
  for (const n of state.npcs) {
    if (n.to || !n.defId) continue;
    const def = (n.kind === 'pirate' ? ALL_PIRATES : ALL_TRADERS).find((d) => d.id === n.defId);
    if (def && !inSeason(def)) n.gone = true;
  }
  state.npcs = state.npcs.filter((n) => !n.gone);

  // 사라진 배를 채워 세계가 비지 않게 한다
  const traders = state.npcs.filter((n) => n.kind === 'trader').length;
  const pirates = state.npcs.filter((n) => n.kind === 'pirate').length;
  for (let i = traders; i < NPC.traders; i++) state.npcs.push(makeTrader());
  for (let i = pirates; i < NPC.pirates; i++) state.npcs.push(makePirate());
  return news;
}

function stepOne(n, news) {
  if (n.to) {                       // 항해 중
    n.days--;
    if (n.days <= 0) { n.at = n.to; n.to = null; n.days = 0; arrivePort(n, news); }
    return;
  }
  depart(n, news);
}

/** 항구에 닿았다 — 상인은 싣고 온 것을 판다 */
function arrivePort(n, news) {
  if (n.kind !== 'trader') return;
  for (const [gid, qty] of Object.entries(n.cargo)) {
    if (!qty) continue;
    const unit = priceOf(n.at, gid);
    const gain = Math.round(unit * qty * (1 - tariffRate(n.at)));
    n.gold += gain;
    addPressure(n.at, gid, qty * NPC.pressure);   // 플레이어가 보는 시세가 실제로 움직인다
    news.push({ kind: 'sold', who: n.name, city: n.at, goodId: gid, qty });
  }
  n.cargo = {};
}

/** 순회로를 따르는 배의 다음 항구. 끝에 닿으면 되감는다(고리로 적었으면 저절로 이어진다).
    ★ 지금 있는 곳이 순회로의 어디인지를 매번 다시 찾는다 — 전투로 끌려가거나 항로가 바뀌어
      길에서 벗어날 수 있기 때문이다. 인덱스만 믿으면 그때 배가 엉뚱한 데로 간다. */
function nextOnCircuit(n) {
  if (!n.circuit?.length) return null;
  const here = n.circuit.indexOf(n.at);
  const idx = here >= 0 ? here : n.circuitIdx;
  const to = n.circuit[(idx + 1) % n.circuit.length];
  n.circuitIdx = (idx + 1) % n.circuit.length;
  // 순회로가 인접 항로만 밟도록 적혀 있지만, 항로가 바뀌었을 수 있으니 확인한다
  return to && to !== n.at && neighborsOf(n.at).includes(to) ? to : null;
}

/** 그 배가 실제로 갈 수 있는 이웃.
    ★ `ROUTES`에는 원양 항로가 섞여 있어 `neighborsOf`가 권역 밖을 돌려준다.
      그대로 두면 **지중해 연안선이 희망봉을 돈다.** `scope: 'region'`인 배는 제 바다만 돈다.
    ★ 순회로가 있는 배는 예외다 — 그 길이 원양을 건너도록 적혀 있으면 그것이 그 상단의 정체다. */
function reachOf(n) {
  const nb = neighborsOf(n.at);
  if (n.circuit?.length || n.scope !== 'region') return nb;
  const rid = REGION_OF_CITY[n.at];
  const inside = nb.filter((id) => REGION_OF_CITY[id] === rid);
  return inside.length ? inside : nb;     // 갇히면 안 되니 빈손이면 그냥 다 돌려준다
}

/** 그 배가 다루는 품목. 전문 상단은 좁다 — "향신료만 나르는 배"가 있어야
    그 배를 털었을 때 무엇이 나올지가 예측된다. */
function goodsOf(n) {
  if (!n.goods?.length) return GOODS;
  const list = GOODS.filter((g) => n.goods.includes(g.id));
  return list.length ? list : GOODS;
}

/** 그 배 전용 판단 창구 — 갈 수 있는 곳과 다루는 품목을 좁혀 넘긴다 */
const ctxFor = (n) => ({ ...ctx, neighbors: () => reachOf(n), goods: goodsOf(n) });

/** 다음 항구를 골라 싣고 떠난다 — 무엇을 살지·어디로 갈지는 behavior.js가 정한다 */
function depart(n, news) {
  if (n.kind === 'trader') {
    /* 순회로가 있는 상단은 **길이 먼저다.** 이문이 남는 쪽으로 가는 것이 아니라
       늘 도는 길을 돌고, 그 길 위에서 살 만한 것을 싣는다. 그래야 플레이어가
       "저 배는 다음에 어디 있겠다"를 알 수 있다. */
    const fixed = nextOnCircuit(n);
    if (fixed) {
      const best = chooseTrade(n, { ...ctxFor(n), neighbors: () => [fixed] });
      if (best) {
        n.gold -= best.buyAt * best.qty;
        n.cargo[best.gid] = (n.cargo[best.gid] || 0) + best.qty;
        addPressure(n.at, best.gid, best.qty * NPC.pressure);
        news.push({ kind: 'bought', who: n.name, city: n.at, goodId: best.gid, qty: best.qty });
      }
      setSail(n, fixed);          // 살 것이 없어도 길은 간다
      return;
    }
    const best = chooseTrade(n, ctxFor(n));
    if (best) {
      n.gold -= best.buyAt * best.qty;
      n.cargo[best.gid] = (n.cargo[best.gid] || 0) + best.qty;
      addPressure(n.at, best.gid, best.qty * NPC.pressure);
      news.push({ kind: 'bought', who: n.name, city: n.at, goodId: best.gid, qty: best.qty });
      setSail(n, best.to);
      return;
    }
    const to = chooseWander(n, ctxFor(n));      // 남는 게 없으면 그냥 옮겨 다닌다
    if (to) setSail(n, to);
    return;
  }
  // 해적도 순회로를 돈다 — 소굴에서 나와 사냥터를 돌고 돌아간다
  const fixed = nextOnCircuit(n);
  const to = fixed ?? choosePirateMove(n, ctxFor(n));
  if (to) setSail(n, to);
}

function setSail(n, to) {
  const dist = distanceBetween(n.at, to);
  const legs = Math.max(1, Math.round(dist / (13 * SHIPS[n.shipKey].speed)));
  n.to = to; n.legs = legs; n.days = legs;
}

const tradersNear = (cityId) =>
  state.npcs.filter((n) => n.kind === 'trader' && (n.at === cityId || n.to === cityId)).length;

/* ── 습격 ─────────────────────────────────────────────────── */
function sameLeg(a, b) {
  if (a.to && b.to) return (a.at === b.at && a.to === b.to) || (a.at === b.to && a.to === b.at);
  return !a.to && !b.to && a.at === b.at ? false : false;   // 항구 안은 안전하다
}

function raids(news) {
  const pirates = state.npcs.filter((n) => n.kind === 'pirate' && n.to);
  for (const p of pirates) {
    const prey = state.npcs.filter((n) => n.kind === 'trader' && n.to && sameLeg(p, n));
    if (!prey.length) continue;
    const victim = pick(prey);
    if (rnd() > NPC.raidBase) continue;
    // 화물과 금화를 빼앗고 상인은 사라진다
    const loot = Object.entries(victim.cargo).map(([gid, q]) => `${GOOD_BY_ID[gid].name} ${q}`).join(', ');
    p.gold += victim.gold;
    p.cargo = { ...victim.cargo };
    p.kills++;
    state.npcs = state.npcs.filter((n) => n.id !== victim.id);

    /* ★ 그 짐은 목적지에 도착하지 못한다 — 기다리던 항구에서 그 물건이 귀해진다.
       사료가 말하는 '대박 항차'가 이것이다: 확률적 잭팟이 아니라
       **남이 망했을 때 마침 그 짐을 싣고 있던 항차**. 노이즈(±15%)로는 만들 수 없는 꼬리다.
       → content/voyage-evidence.json: windfallIsEventDriven */
    const shocked = [];
    for (const gid of Object.keys(victim.cargo || {})) {
      if (!CITY_BY_ID[victim.to]?.demand?.[gid]) continue;   // 사려던 항구에만 걸린다
      addShock(victim.to, gid, SHOCK.raidMult, SHOCK.raidDays, 'raid');
      shocked.push(gid);
    }
    news.push({ kind: 'raid', who: p.name, victim: victim.name, at: victim.at, to: victim.to, loot, shocked });
  }
}

/* ── 조회 (씬에서 쓴다) ───────────────────────────────────── */

/** 그 구간을 지금 지나는 NPC들 */
export function npcsOnLeg(aId, bId, kind = null) {
  return (state.npcs || []).filter((n) =>
    n.to && ((n.at === aId && n.to === bId) || (n.at === bId && n.to === aId))
    && (!kind || n.kind === kind));
}

/** 그 항구에 정박 중인 NPC */
export function npcsAtPort(cityId, kind = null) {
  return (state.npcs || []).filter((n) => !n.to && n.at === cityId && (!kind || n.kind === kind));
}

/** 지도에 찍을 위치 — 항해 중이면 두 항구 사이를 보간한다 */
export function npcPos(n) {
  const a = CITY_BY_ID[n.at];
  if (!n.to) {
    // 정박 중인 배는 항구 둘레에 흩어 놓는다 — 한 점에 겹치면 몇 척인지 안 보인다
    const ang = (n.id * 2.39996) % (Math.PI * 2);
    return { x: a.x + Math.cos(ang) * 7, y: a.y + Math.sin(ang) * 5 + 1 };
  }
  const b = CITY_BY_ID[n.to];
  const u = n.legs ? 1 - n.days / n.legs : 0;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** 플레이어가 잡거나 격침시킨 NPC를 세계에서 지운다 */
export function removeNpc(id) {
  state.npcs = (state.npcs || []).filter((n) => n.id !== id);
}

/** 항구에서 듣는 소문 — 최근 사건을 문장으로 */
export function newsLines(news, limit = 3) {
  const out = [];
  for (const e of news) {
    if (e.kind === 'raid') {
      out.push({
        text: `${CITY_BY_ID[e.at].name}~${CITY_BY_ID[e.to].name} 항로에서 ${e.victim}호가 ${e.who}에게 털렸다.`
            + (e.loot ? ` (${e.loot})` : '')
            + (e.shocked?.length
                ? ` — ${CITY_BY_ID[e.to].name}의 ${e.shocked.map((g) => GOOD_BY_ID[g].name).join('·')} 값이 뛴다.`
                : ''),
        kind: 'bad',
      });
    }
  }
  for (const e of news) {
    if (out.length >= limit) break;
    if (e.kind === 'sold') {
      out.push({
        text: `${e.who}호가 ${CITY_BY_ID[e.city].name}에 ${GOOD_BY_ID[e.goodId].name} ${e.qty}개를 풀었다.`,
        kind: '',
      });
    }
  }
  return out.slice(0, limit);
}

/** 플레이어가 그 항로를 갈 때 해적을 만날 확률 보정 */
export function pirateThreat(aId, bId) {
  return npcsOnLeg(aId, bId, 'pirate').length;
}

/** 해적 NPC를 전투용 적으로 — 그놈이 그동안 턴 것이 그대로 전리품이 된다.
    씬(map.js)이 아니라 여기 두는 이유: 이건 연출이 아니라 **규칙**이라
    대시보드도 같은 값을 읽어야 한다. 씬에 두면 계측이 재구현이 되어 갈라진다. */
/* 이름난 해적일수록 강하다 — 갑판에 세우는 병종을 세기별로 갈라 둔다.
   ★ 예전에는 전부 `level: 2`에 같은 병종이었다. 바르바로사와 좀도둑이 같은 급으로 나왔다는 뜻이고,
     그러면 명부에 적어 둔 `strength`가 화면에서 아무것도 아니게 된다. */
const PIRATE_TROOPS = {
  1: ['pirate', 'sailor', 'pirate'],
  2: ['pirate', 'pirate', 'sailor', 'swordsman'],
  3: ['pirate', 'corsair', 'pirate', 'swordsman', 'pirate'],
  4: ['corsair', 'musketeer', 'pirate', 'swordsman', 'corsair', 'captain'],
  5: ['corsair', 'musketeer', 'corsair', 'swordsman', 'corsair', 'captain'],
};

export function pirateEnemy(n) {
  const s = SHIPS[n.shipKey];
  const gold = Math.max(200, Math.round(n.gold));
  const lv = Math.min(5, Math.max(1, n.strength ?? 2));
  /* 세기가 배와 사람에 함께 실린다. 낮은 세기는 배를 덜어 **첫 배로도 붙어 볼 수 있게** 하고,
     높은 세기는 그 반대다 — 명부의 1~2가 43%인 것이 초반이 성립하는 이유다. */
  const mul = 0.62 + lv * 0.14;                 // 1→0.76 … 5→1.32
  /* ★ 전리품은 **여기서 정해지고 씬에서 지급된다.** 그 사이에 상한이 없으면
     세기 1 좀도둑의 지갑(+현상금)이 시작 자산의 다섯 배가 된다 —
     첫 배로 하나만 잡으면 코카를 사서 초반이 통째로 사라졌다(tools/sim-events.mjs).
     `capLoot`(state.js)이 "옮겨 실을 수 있는 만큼"으로 눌러 준다. 규칙은 떠돌이 해적과 같다. */
  return capLoot({
    id: `npc:${n.id}`, name: `${n.name}호`, nation: '해적',
    hull: s.hull, tint: 'dark', flag: n.flag ?? 'pirate',
    hp: Math.round(s.hp * mul), guns: Math.max(2, Math.round(s.guns * mul)),
    crew: Math.max(10, Math.round(s.crewMax * (0.35 + lv * 0.09))),
    level: lv, prize: n.shipKey,
    troops: PIRATE_TROOPS[lv],
    loot: {
      // 현상금이 걸린 자는 잡으면 그만큼 더 나온다 — 일부러 찾아갈 이유가 생긴다
      gold: n.bounty
        ? [Math.round(gold * 0.6) + n.bounty[0], gold + n.bounty[1]]
        : [Math.round(gold * 0.6), gold],
      goods: Object.keys(n.cargo).length ? Object.keys(n.cargo) : ['salt', 'wine'],
    },
  });
}

/** 그 항구에 상주하는 인물들 — 철이 맞는 사람만.
    `npcsAtPort()`와 짝이다(저쪽은 배, 이쪽은 사람). */
export function figuresAt(cityId, day = state.day) {
  return ALL_FIGURES.filter((f) =>
    (f.at === cityId || f.roam?.includes(cityId)) && inSeason(f, day));
}

void pushLog;
