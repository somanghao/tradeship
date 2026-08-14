// world.js — 지중해에서 저 혼자 돌아가는 세계
//
// 상인 NPC가 실제로 항구를 돌며 사고팔고, 해적 NPC가 그들을 노린다.
// 핵심은 "연출"이 아니라 **같은 시장을 쓴다**는 것 — NPC의 거래가 플레이어가 보는
// 시세에 그대로 압력으로 남는다. 늦게 가면 이미 쓸어간 뒤다.
//
// state.js를 한 방향으로만 import한다(여기서 state를 쓰고, state는 여기를 모른다).
// 그래서 순환 참조가 없다. 시간 진행은 호출자(map.js)가 advanceDays 뒤에 worldTick을 부른다.

import { CITIES, CITY_BY_ID, GOODS, GOOD_BY_ID, SHIPS } from './data.js';
import {
  state, neighborsOf, distanceBetween, priceOf, addPressure, tariffRate, pushLog,
} from './state.js';

const TRADERS = 9;         // 동시에 도는 상인 수
const PIRATES = 4;         // 배회하는 해적 수
const RAID_BASE = 0.16;    // 같은 구간에서 마주쳤을 때 해적이 덮칠 확률(하루당)
/* NPC 거래가 시장에 남기는 몫. 1.0으로 두면 아홉 척이 매일 사고팔아 시세를 계속
   불리하게 만들어 플레이어가 벌 곳이 없어진다(시뮬레이션에서 5~15항차 자산이 바닥을 겼다).
   세계가 살아 있다는 감각은 주되, 시장을 통째로 선점하지는 않게 절반만 남긴다. */
const NPC_PRESSURE = 0.5;

const TRADER_NAMES = [
  '산타 마리아', '레드티', '골든 로즈', '루나 디 마레', '세인트 조지',
  '비앙카', '알 부라크', '스텔라', '메르쿠리오', '포르투나', '아르고',
];
const PIRATE_NAMES = ['검은 갈매기', '붉은 이빨', '해골 깃발', '살렘의 늑대', '자칼'];

let seq = 0;
const rnd = () => Math.random();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

/* ── 생성 ─────────────────────────────────────────────────── */
export function initWorld() {
  seq = 0;
  state.npcs = [];
  for (let i = 0; i < TRADERS; i++) state.npcs.push(makeTrader());
  for (let i = 0; i < PIRATES; i++) state.npcs.push(makePirate());
}

function makeTrader() {
  const at = pick(CITIES).id;
  const shipKey = pick(['caravel', 'fluyt', 'brig', 'carrack']);
  return {
    id: ++seq, kind: 'trader',
    name: TRADER_NAMES[seq % TRADER_NAMES.length],
    shipKey, at, to: null, days: 0, legs: 0,
    gold: 900 + Math.round(rnd() * 2600),
    cargo: {}, hp: SHIPS[shipKey].hp,
  };
}

function makePirate() {
  const at = pick(CITIES).id;
  return {
    id: ++seq, kind: 'pirate',
    name: PIRATE_NAMES[seq % PIRATE_NAMES.length],
    shipKey: pick(['brig', 'caravel']), at, to: null, days: 0, legs: 0,
    gold: 300 + Math.round(rnd() * 900),
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
  for (let i = traders; i < TRADERS; i++) state.npcs.push(makeTrader());
  for (let i = pirates; i < PIRATES; i++) state.npcs.push(makePirate());
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
    addPressure(n.at, gid, qty * NPC_PRESSURE);   // 플레이어가 보는 시세가 실제로 움직인다
    news.push({ kind: 'sold', who: n.name, city: n.at, goodId: gid, qty });
  }
  n.cargo = {};
}

/** 다음 항구를 골라 싣고 떠난다 */
function depart(n, news) {
  const nb = neighborsOf(n.at);
  if (!nb.length) return;

  if (n.kind === 'trader') {
    // 이웃 중 가장 남는 곳으로 — 플레이어와 같은 판단을 한다
    const cands = [];
    for (const to of nb) {
      for (const g of GOODS) {
        const buyAt = priceOf(n.at, g.id), sellAt = priceOf(to, g.id);
        const margin = sellAt * (1 - tariffRate(to)) - buyAt;
        if (margin <= 0) continue;
        const room = Math.floor(SHIPS[n.shipKey].cargo * (0.35 + rnd() * 0.35));
        const qty = Math.min(room, Math.floor(n.gold / buyAt));
        if (qty < 5) continue;
        cands.push({ to, gid: g.id, qty, buyAt, score: margin * qty });
      }
    }
    // 상위 후보 중에서 고른다 — 전부 같은 최적해로 몰리면 한 항구만 계속 짓눌린다
    cands.sort((a, b) => b.score - a.score);
    const best = cands.length ? cands[Math.floor(rnd() * Math.min(4, cands.length))] : null;
    if (best) {
      n.gold -= best.buyAt * best.qty;
      n.cargo[best.gid] = (n.cargo[best.gid] || 0) + best.qty;
      addPressure(n.at, best.gid, best.qty * NPC_PRESSURE);
      news.push({ kind: 'bought', who: n.name, city: n.at, goodId: best.gid, qty: best.qty });
      setSail(n, best.to);
    } else {
      setSail(n, pick(nb));            // 남는 게 없으면 그냥 옮겨 다닌다
    }
    return;
  }
  // 해적은 상인이 많은 쪽으로 기운다
  const weights = nb.map((to) => 1 + tradersNear(to) * 1.6);
  let r = rnd() * weights.reduce((a, b) => a + b, 0);
  let idx = 0;
  for (; idx < nb.length; idx++) { r -= weights[idx]; if (r <= 0) break; }
  setSail(n, nb[Math.min(idx, nb.length - 1)]);
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
    if (rnd() > RAID_BASE) continue;
    // 화물과 금화를 빼앗고 상인은 사라진다
    const loot = Object.entries(victim.cargo).map(([gid, q]) => `${GOOD_BY_ID[gid].name} ${q}`).join(', ');
    p.gold += victim.gold;
    p.cargo = { ...victim.cargo };
    p.kills++;
    state.npcs = state.npcs.filter((n) => n.id !== victim.id);
    news.push({ kind: 'raid', who: p.name, victim: victim.name, at: victim.at, to: victim.to, loot });
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
            + (e.loot ? ` (${e.loot})` : ''),
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

void pushLog;
