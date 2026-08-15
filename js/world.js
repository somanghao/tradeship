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
} from './state.js';
import { SHOCK } from './data.js';
import { NPC, TRADER_SHIPS, PIRATE_SHIPS, TRADER_NAMES, PIRATE_NAMES, PURSE } from './npc/config.js';
import { chooseTrade, choosePirateMove, chooseWander } from './npc/behavior.js';

let seq = 0;
const rnd = () => Math.random();
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
  const at = pick(CITIES).id;
  const shipKey = pick(TRADER_SHIPS);
  return {
    id: ++seq, kind: 'trader',
    name: TRADER_NAMES[seq % TRADER_NAMES.length],
    shipKey, at, to: null, days: 0, legs: 0,
    gold: between(PURSE.trader),
    cargo: {}, hp: SHIPS[shipKey].hp,
  };
}

function makePirate() {
  const at = pick(CITIES).id;
  return {
    id: ++seq, kind: 'pirate',
    name: PIRATE_NAMES[seq % PIRATE_NAMES.length],
    shipKey: pick(PIRATE_SHIPS), at, to: null, days: 0, legs: 0,
    gold: between(PURSE.pirate),
    cargo: {}, hp: 90, kills: 0,
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

/** 다음 항구를 골라 싣고 떠난다 — 무엇을 살지·어디로 갈지는 behavior.js가 정한다 */
function depart(n, news) {
  if (n.kind === 'trader') {
    const best = chooseTrade(n, ctx);
    if (best) {
      n.gold -= best.buyAt * best.qty;
      n.cargo[best.gid] = (n.cargo[best.gid] || 0) + best.qty;
      addPressure(n.at, best.gid, best.qty * NPC.pressure);
      news.push({ kind: 'bought', who: n.name, city: n.at, goodId: best.gid, qty: best.qty });
      setSail(n, best.to);
      return;
    }
    const to = chooseWander(n, ctx);      // 남는 게 없으면 그냥 옮겨 다닌다
    if (to) setSail(n, to);
    return;
  }
  const to = choosePirateMove(n, ctx);
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
export function pirateEnemy(n) {
  const s = SHIPS[n.shipKey];
  const gold = Math.max(200, Math.round(n.gold));
  return {
    id: `npc:${n.id}`, name: `${n.name}호`, nation: '해적',
    hull: s.hull, tint: 'dark', flag: 'pirate',
    hp: Math.round(s.hp * 0.9), guns: Math.max(4, Math.round(s.guns * 0.8)),
    crew: Math.max(16, Math.round(s.crewMax * 0.6)),
    level: 2, prize: n.shipKey,
    troops: ['pirate', 'corsair', 'pirate', 'swordsman', 'pirate'],
    loot: {
      gold: [Math.round(gold * 0.6), gold],
      goods: Object.keys(n.cargo).length ? Object.keys(n.cargo) : ['salt', 'wine'],
    },
  };
}

void pushLog;
