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
  capLoot, rosterKey,
} from './state.js';
import { SHOCK } from './data.js';
import { NPC, TRADER_SHIPS, PIRATE_SHIPS, TRADER_NAMES, PIRATE_NAMES, PURSE } from './npc/config.js';
import { chooseTrade, choosePirateMove, chooseWander } from './npc/behavior.js';
import { ALL_TRADERS, ALL_PIRATES, ALL_FIGURES, REGION_OF_CITY, FOES_BY_REGION } from './regions/index.js';
import { seasonOf, inSeason, activeBounty, setRetireHook, setWorldHook, stirSeen,
         /* §A-11 조선 — 개항 전에는 바깥 배가 안 온다 */
         joseonOpen } from './state.js';
import { riskKey } from './map/geo.js';
/* ★ **꺾인 뱃길** — NPC 배도 플레이어와 같은 폴리라인을 타게 한다(`npcPos`).
   `sprites/maps/lanes.js`는 캔버스를 안 쓰는 **순수 등록소**라(그림 함수가 없다)
   이 파일이 Node에서 그대로 도는 규약을 안 깬다. 표가 없으면 직선을 돌려주는 fail-soft다. */
import { laneAt } from './sprites/maps/lanes.js';
/* ★ 상단(商團) — **지도에 안 뜨는 층**이다. `state.npcs` 정원을 한 척도 안 건드리므로
   해적 밀도·조우 확률이 안 움직인다. 자본을 쌓고 그 자본이 물가를 누른다 → `js/npc/guild.js` */
import { guildTick, settleGuildOffer, initGuilds } from './npc/guild.js';

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

/* ── 닫힌 명부는 두 번 오지 않는다 ────────────────────────────
   ★ 여기가 「해적을 다 무찌른다」가 **문장으로도 성립하지 않던** 자리다.
     명부의 왕직을 꺾으면 `removeNpc()`가 바다에서 지우지만, 같은 tick에 `worldTick()`이
     정원 13을 채우면서 이 함수가 **왕직을 다시 뽑았다** — `pickDef`가 뺀 것은
     *지금 떠 있는* defId뿐이었기 때문이다. 그래서 죽은 자가 다음 날 소굴에 서 있었다.
   닫는 길은 둘이고 **둘 다 영구다**(SPEC-supremacy §1-3):
     · 격파 — `state.slain['pirate:<id>']` (`recordSlain`이 이미 적고 있다)
     · 초무 — `state.tamed[<id>]`  (아직 사는 화면이 없다. 그 값이 서면 여기가 바로 읽는다)
   ⚠️ **정원은 안 줄인다.** 명부가 비면 그 자리를 얼굴 없는 배가 채우고(`makePirate` 폴백),
      세력이 들어오면 그 자리가 사략선이 된다(§1-2b). 위험도는 한 줄도 안 움직인다. */
export const rosterClosed = (pirateId) =>
  !!(state.slain?.[rosterKey(pirateId)] || state.tamed?.[pirateId]);

function pickDef(list, closed = null) {
  const used = inUse();
  const pool = list.filter((d) => inSeason(d) && !used.has(d.id) && !(closed && closed(d)));
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
  /* ★ **상단 장부도 여기서 선다**(회차 26 · X-5). 전에는 `initGuilds()`가 `guildTick` 안에만
     있어서 **새 판의 첫 항구에서 상단 카드가 통째로 안 떴다** — 첫 출항을 해야 세계가 생겼다.
     세계를 세우는 자리는 여기 하나다(`state.npcs`와 같은 자리에 두는 것이 그 뜻이다).
     ⚠️ 이어한 판은 장부가 이미 있으므로 **비었을 때만** 세운다 — 안 그러면 세이브가 통째로 초기화된다. */
  if (!state.guilds || !Object.keys(state.guilds).length) initGuilds();
}

function makeTrader() {
  /* ★ 개항 전에는 **바깥 배가 안 온다**(§A-11 조선 · `openOnly`). 항로·시장·세력은 한 줄도
     안 건드리고 **누가 오는가만** 바꾼다 — 명부 해적에서 배운 그 규약이다
     (*"조우 확률은 그대로 두고 「누가 오는가」만 바꾼다"*). */
  const def = pickDef(ALL_TRADERS, (d) => d.openOnly && !joseonOpen());
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

/* ── 이름 없는 자리의 얼굴 ────────────────────────────────────
   ★ **이것을 빠뜨리면 명부를 비운 동중국해에 「살렘의 늑대」가 뜬다.**
     폴백 이름 다섯(`PIRATE_NAMES`)이 전 세계 공용이라, 명부가 닫힐수록 그 바다는
     이름을 잃는 게 아니라 **남의 바다 이름을 얻는다** — `QUICKMAP-combat.md §3`이
     이미 잡아 둔 함정("`FOES`를 안 적은 바다는 지중해 얼굴이 된다")의 재발이다.
     세력(`SPEC-factions.md`)이 이 자리를 사략선으로 채우기 전까지의 폴백ⓐ이고,
     세력이 늦어져도 40명을 다 닫은 판이 이것만으로 안 깨진다.

   ★ **여기서 오는 것은 얼굴뿐이다** — 이름·국적·깃발과 털어 온 짐. 수치(배·세기·소굴)는
     바로 아래 `standIn()`이 **그 자리에 있던 이름에게서** 가져온다. 둘을 갈라 둔 이유는
     `pickEnemy()`의 `localize()`와 같다: 얼굴이 바뀌어도 밸런스는 안 움직여야 한다.
   ★ 등급은 `strength`로 고른다 — `FOES`의 인덱스가 곧 등급이라 눈금이 이미 같다.
     세기 5짜리 자리를 물려받았으면 그 바다의 다섯째 얼굴(가장 사나운 쪽)이 선다. */
function foeFace(cityId, strength) {
  const foes = FOES_BY_REGION[REGION_OF_CITY[cityId]];
  if (!foes?.length) return null;
  return foes[Math.min(foes.length - 1, Math.max(0, strength - 1))];
}

/* ── 빈자리는 무엇을 물려받나 ─────────────────────────────────
   ★ **이름만 없고 나머지는 그 자리 그대로다.** 예전 폴백은 소굴이 `pick(CITIES)`(전 세계 균등),
     배가 `PIRATE_SHIPS`(브리그·캐러벨), 세기가 늘 2였다. 그대로 두면 명부를 닫을수록
     바다가 **평평하고 순해진다** — 회귀 검증(`.playtest/origin-sweep/roster-check.mjs`)이
     실측으로 잡아냈다: 세기 평균 2.63 → 2.00, 적 선원 30.4 → 23.0. 정원은 13척 그대로인데
     만나는 배가 약해졌으니 그것은 **위험도가 움직인 것**이고, 사양 §1-2 ②의 위반이다.
     (요율 상위 세 구간이 전부 동중국해인 것도 그 바다에 이름난 자가 많기 때문인데,
      소굴을 균등 분포로 두면 그 근거까지 함께 사라진다 — 지중해 7%→14%로 실제로 옮겨 갔다.)
   ★ 그래서 **명부를 그대로 분포로 쓴다.** 닫혔든 아니든 철이 맞는 한 사람을 뽑아
     그 소굴·그 배·그 세기·그 사냥터를 물려준다. 물려주지 않는 것은 셋뿐이다:
       · **이름**(그 바다 `FOES`의 얼굴이 대신 선다) · **현상금**(명부에만 붙는다)
       · **순회로**(소굴과 사냥터는 그 바다의 성질이지만 도는 길은 그 사람의 습관이다)
     "왕직을 죽였는데 히라도에 또 배가 있다. 다만 그 배에는 이름이 없다" — 이것이 이 설계의 값이다. */
function standIn() {
  /* 철을 가린다 — 겨울 바다에 여름 왜구를 세우지 않는다.
     ⚠️ `filter(inSeason)`이라고 쓰면 안 된다. `inSeason(def, day)`의 둘째 인자에
     **배열 인덱스가 들어가** 늘 'summer'로 판정된다(0~39 < 반년). 실제로 그렇게 썼다가
     회귀 검증에서 지중해 밀도가 8%→17%로 튀어 잡혔다 — 여름에만 나오는 바르바리
     코르세어가 겨울에도 자리를 채우고 있었던 것이다. */
  const pool = ALL_PIRATES.filter((d) => inSeason(d));
  return pool.length ? pick(pool) : null;
}

function makePirate() {
  const def = pickDef(ALL_PIRATES, (d) => rosterClosed(d.id));
  /* `def`는 **이름**이고 `slot`은 **자리**다. 명부에서 뽑혔으면 둘이 같고,
     못 뽑았으면(철이 안 맞거나 이미 떠 있거나 **닫혔거나**) 자리만 남는다. */
  const slot = def ?? standIn();
  const shipKey = (slot?.ship && SHIPS[slot.ship]) ? slot.ship : pick(PIRATE_SHIPS);
  const at = slot?.base && CITY_BY_ID[slot.base] ? slot.base : pick(CITIES).id;
  // 전투력 — 예전에는 전부 level 2였다. 바르바로사와 좀도둑이 같은 급으로 나왔다는 뜻이다
  const strength = slot?.strength ?? 2;
  const face = def ? null : foeFace(at, strength);      // 명부에서 뽑혔으면 제 이름이 있다
  return {
    id: ++seq, kind: 'pirate',
    defId: def?.id ?? null,
    name: def?.name ?? face?.name ?? PIRATE_NAMES[seq % PIRATE_NAMES.length],
    flag: def?.flag ?? face?.flag ?? 'pirate',
    /* 얼굴에서 온 것 — 전투 화면이 읽는다(`pirateEnemy`). 명부 해적은 null이다(제 이름이 있다).
       ★ `lootGoods`를 `goods`라 안 적은 이유: `goodsOf()`가 그 이름으로 **상단의 취급 품목**을
         읽는다. 겹치면 해적의 행동 판단이 세 품목으로 좁아진다. */
    nation: face?.nation ?? null,
    lootGoods: face?.goods ?? null,
    strength,
    bounty: def?.bounty ?? null,           // ★ 현상금은 명부에만 붙는다 — 닫을수록 전리품 꼬리가 마른다
    base: at,
    hunt: slot?.hunt ?? null,            // 즐겨 노리는 구간 — 사냥터는 그 바다의 성질이라 물려받는다
    season: slot?.season ?? null,        // 철도 물려받는다 — `worldTick`의 철 지난 배 정리가 읽는다
    scope: slot?.scope ?? 'region',
    circuit: def?.circuit ?? null,       // 순회로는 그 사람의 습관이라 안 물려받는다
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
  /* ★ 상단은 배가 아니라 **회사**다 — 위 정원 셈과 따로 돈다.
     여기 두는 이유: 시간 진행의 입구가 하나여야 "항구에 서 있는 동안 상단이 멈춘다"가 안 난다. */
  guildTick(days, news);
  /* ⚠️ **어느 부두였는지는 치르기 전에 읽는다** — `settleGuildOffer()`가 `state.guildOffer`를
     비우고 나면 그 자리를 물을 방법이 없다(그쪽은 `js/npc/guild.js`라 한 줄도 안 고친다). */
  const stirCity = state.guildOffer?.city ?? null;
  const paid = settleGuildOffer();
  if (paid?.ok) {
    news.push({ kind: 'guild-paid', who: paid.by, foe: paid.foe, fee: paid.fee });
    /* ★ **사주는 임자의 마당에서 벌어진다**(회차 28 · 나-1) — 흔든 것은 남의 상관이지만
       흔들린 부두는 그 세력의 것이다. 삯(`fee`)은 한 닢도 안 건드린다: 값이 하나 붙을 뿐이다.
       ★ 세력의 이름을 아는 곳은 `state.js` 하나다 — 여기서는 항구 id만 넘긴다. */
    if (stirCity) stirSeen(stirCity);
  }
  /* 철이 지난 배는 **항구에 있을 때만** 물러난다 — 바다 한복판에서 배가 사라지면
     플레이어가 본 것이 무엇이었는지 설명되지 않는다. 발트가 얼고 계절풍이 뒤집히면
     그 바다의 배가 한 철 통째로 자취를 감추는 것이 이 규칙의 목적이다. */
  /* ★ 이름 없는 배도 철을 탄다. 예전에는 `!n.defId`면 그냥 건너뛰었는데, 명부를 다 닫은
     세계에서는 **철이 안 도는 바다**가 된다 — 여름에 뜬 배가 겨울 내내 눌러앉아
     지중해 밀도가 8%→17%로 굳었다(`roster-check.mjs` 실측). 여름 왜구의 자리를 물려받은
     배는 그 자리의 철도 함께 물려받아야 "여름에는 중국 연안이, 겨울에는 루손 해협이
     위험해진다"가 명부를 닫은 뒤에도 성립한다. */
  for (const n of state.npcs) {
    if (n.to) continue;
    const def = n.defId
      ? (n.kind === 'pirate' ? ALL_PIRATES : ALL_TRADERS).find((d) => d.id === n.defId)
      : null;
    if (!inSeason(def ?? n)) n.gone = true;     // `n.season`은 물려받은 자리의 철
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

/** 그 바다의 명부와 각자의 닫힘 상태 — 권역 id를 안 주면 **아홉 바다 전부**(40명).
    ★ 사양(§8-2)은 이 판정을 `state.js`에 두라고 적었지만 여기 둔다.
      닫힘의 정의(`rosterClosed`)를 `pickDef`와 **같은 파일 한 자리**에 두기 위해서다 —
      "후보에서 빠지는 규칙"과 "화면이 세는 규칙"이 갈리면 카드가 6/6인데 왕직이 도는
      판이 생긴다. 명부(`ALL_PIRATES`)를 이미 들고 있는 파일도 여기다. */
export function rosterOf(regionId = null) {
  const list = ALL_PIRATES
    .filter((d) => !regionId || d.region === regionId)
    .map((d) => ({
      id: d.id, name: d.name, region: d.region, base: d.base,
      bounty: d.bounty ?? null,
      slain: state.slain?.[rosterKey(d.id)] ?? 0,
      tamed: state.tamed?.[d.id] ?? 0,
    }));
  const closed = list.filter((x) => x.slain || x.tamed);
  const open = list.filter((x) => !x.slain && !x.tamed);
  return { list, closed, open, have: closed.length, need: list.length,
           done: list.length > 0 && open.length === 0 };
}

/** 그 구간을 지금 지나는 NPC들 */
export function npcsOnLeg(aId, bId, kind = null) {
  return (state.npcs || []).filter((n) =>
    n.to && ((n.at === aId && n.to === bId) || (n.at === bId && n.to === aId))
    && (!kind || n.kind === kind));
}

/* ── 쫓는 자를 만난다 ─────────────────────────────────────────
   ★ 명부 해적은 `npcsOnLeg`가 **`at`·`to`가 정확히 내 두 항구일 때만** 잡는다. 264 도시에서
   그 일치는 사실상 안 나서, 실플레이 **984 게임일에 명부 조우 0회**였다(supremacy ISSUES #12).
   상선이 겪던 것과 같은 문제인데(C-15) 상선만 세 단 폴백을 받았다.

   ★ **밀도를 올려 푸는 것이 아니다.** 해적을 더 띄우면 그냥 더 자주 털린다 —
     *"사람은 이길 수 있는 상대만 싸운다"*는 전제가 깨진다. 대신 **고른 사람에게만** 열어 준다:
     `bounty-tip`으로 소식을 산 자에 한해, 그자의 사냥터(`hunt`)나 소굴(`base`)에 닿는 구간에서
     **그자가 온다.** 찾아갈 수 있게 되면 고를 수 있게 된다(SPEC-supremacy §1-3 (b)).
   ⚠️ 조우 확률 자체는 안 건드린다 — 해적 사건이 났을 때 **누가 오는가**만 바뀐다. */
export function huntedOnLeg(aId, bId) {
  const b = activeBounty();
  if (!b) return null;
  const def = ALL_PIRATES.find((d) => d.id === b.id);
  if (!def || rosterClosed(def.id)) return null;
  const key = riskKey(aId, bId);
  const onHunt = (def.hunt ?? []).includes(key);
  const nearBase = def.base === aId || def.base === bId;
  if (!onHunt && !nearBase) return null;

  /* 이미 그 배가 세계에 떠 있으면 그 배를 쓴다 — 같은 사람이 둘이 되지 않게 */
  const live = (state.npcs || []).find((n) => n.kind === 'pirate' && n.defId === def.id);
  if (live) return live;

  const shipKey = (def.ship && SHIPS[def.ship]) ? def.ship : pick(PIRATE_SHIPS);
  return {
    id: `hunt-${++seq}`, kind: 'pirate', defId: def.id, name: def.name,
    flag: def.flag ?? 'pirate', nation: null, lootGoods: null,
    strength: def.strength ?? 2, bounty: def.bounty ?? null,
    base: def.base, hunt: def.hunt ?? null, season: def.season ?? null,
    scope: def.scope ?? 'region', circuit: null, circuitIdx: 0,
    shipKey, at: aId, to: bId, days: 0, legs: 0,
    gold: def.purse ? between(def.purse) : between(PURSE.pirate),
    cargo: {}, hp: SHIPS[shipKey]?.hp ?? 90, kills: 0, stray: true,
  };
}

/** 그 항구에 정박 중인 NPC */
export function npcsAtPort(cityId, kind = null) {
  return (state.npcs || []).filter((n) => !n.to && n.at === cityId && (!kind || n.kind === kind));
}

/* ── 상선 조우가 빈손으로 끝나지 않게 ─────────────────────────
   `npcsOnLeg`는 **그 배의 `at`·`to`가 정확히 내가 가는 두 항구일 때만** 잡는다.
   지중해 열여섯 항구 시절에는 그것으로 충분했는데, 세계가 264 도시가 되자
   상선 예순여덟 척이 흩어져 겹칠 일이 드물어졌다 — 실측에서 **상선 조우 열세 번 중
   실제로 만난 것이 두 번**이었고 나머지 열한 번은 "멀리 돛 하나가 지나갔다"로 끝났다
   (2026-08-22 실클릭 · `.playtest/nine-seas/FINDINGS.md` G-2).

   가중치를 올리는 것은 답이 아니다 — 조우 자체는 12%로 제대로 나고 있었다.
   **만날 대상을 찾는 범위**가 좁았던 것이다. 그래서 세 단으로 넓힌다:
     ① 정확히 그 구간을 지나는 배 (지금까지의 규칙 — "지도에서 보던 그 배")
     ② 두 항구 중 하나를 오가는 배 (같은 바닷목이다)
     ③ 그래도 없으면 **그 바다의 명부에서 한 척**을 세운다(수평선 너머에서 온 배)
   ③은 `state.npcs`에 넣지 않는다 — 세계의 정원(`NPC.traders`)을 흔들지 않기 위해서다.
   해적은 이미 같은 폴백을 갖고 있었다(`pickEnemy`) — 상선만 없었다. */

/** 그 구간 언저리를 지나는 상선 — ①정확 → ②근처 */
export function tradersNearLeg(aId, bId) {
  const exact = npcsOnLeg(aId, bId, 'trader');
  if (exact.length) return exact;
  return (state.npcs || []).filter((n) => n.kind === 'trader'
    && (n.at === aId || n.at === bId || n.to === aId || n.to === bId));
}

/** ③ 수평선 너머에서 온 배 — 그 바다의 상단 하나를 즉석으로 세운다(짐을 싣고 온다) */
export function strayTrader(aId, bId) {
  const rid = REGION_OF_CITY[aId] ?? REGION_OF_CITY[bId];
  const here = CITY_BY_ID[aId] ? aId : bId;
  // 그 바다를 도는 상단을 먼저, 없으면 아무 상단이나 (계절을 벗어난 상단은 제외)
  const inRegion = ALL_TRADERS.filter((d) => inSeason(d)
    && (d.circuit ?? []).some((c) => REGION_OF_CITY[c] === rid));
  // ⚠️ `filter(inSeason)`은 인덱스가 `day`로 들어가 늘 여름이 된다 — 위 `standIn()` 주석 참고
  const def = pick(inRegion.length ? inRegion : ALL_TRADERS.filter((d) => inSeason(d))) ?? null;
  if (!def) return null;

  const shipKey = (def.ship && SHIPS[def.ship]) ? def.ship : pick(TRADER_SHIPS);
  const ship = SHIPS[shipKey];
  const n = {
    id: `stray-${++seq}`, kind: 'trader', defId: def.id, name: def.name,
    flag: def.flag ?? null, rank: def.rank ?? 2, goods: def.goods ?? null,
    scope: def.scope ?? 'region', circuit: def.circuit ?? null, circuitIdx: 0,
    shipKey, at: here, to: here === aId ? bId : aId, days: 0, legs: 0,
    gold: def.purse ? between(def.purse) : between(PURSE.trader),
    cargo: {}, hp: ship?.hp ?? 90, stray: true,
  };

  /* 빈 배로 만나면 살 것이 없어 결국 같은 "돛만 지나갔다"가 된다 — 짐을 실어 보낸다.
     무엇을 실었나는 **그 상단이 다루는 품목**을 따르고, 없으면 출발 항구의 산지 품목을 싣는다. */
  const pool = (def.goods ?? []).filter((g) => GOOD_BY_ID[g]);
  const gid = pool.length ? pick(pool) : pick(GOODS).id;
  const hold = Math.max(4, Math.round((ship?.cargo ?? 40) * (0.25 + rnd() * 0.45)));
  n.cargo[gid] = hold;
  return n;
}

/** 지도에 찍을 위치 — 항해 중이면 **꺾인 뱃길 위를** 보간한다.
    ★ 회차 26에 고쳤다(지도 PM이 소유 밖이라 넘긴 것). 전에는 두 항구를 **직선**으로 이어
      NPC 배가 이탈리아 반도와 일본 열도를 가로질러 갔다 — 아홉 장을 손으로 다시 그린
      회차이므로 그 한 척이 지형을 통째로 거짓말로 만든다.
    ★ 플레이어의 배는 이미 `scenes/map.js`가 `laneAt()`으로 같은 폴리라인을 탄다
      (`sprites/maps/lanes.js` 머리주석). 같은 함수를 쓰므로 **두 배가 같은 길로 간다.**
    ⚠️ `lanes.js`는 **캔버스를 안 쓰는 순수 등록소**라 `world.js`가 Node에서 그대로 import된다
      (이 파일이 `sprites/`를 피해 온 이유는 Canvas 의존이었고, 여기엔 그것이 없다).
      권역 표가 아직 등록 전이면 `laneAt`이 **직선을 돌려준다** — fail-soft라 시뮬이 안 깨진다.
    ⚠️ **규칙엔 한 줄도 안 닿는다** — 항해일(`voyageDays`)은 여전히 두 항구의 직선거리다.
      꺾인 길은 그림에만 쓴다(`lanes.js`가 정한 규약 그대로). */
export function npcPos(n) {
  const a = CITY_BY_ID[n.at];
  if (!n.to) {
    // 정박 중인 배는 항구 둘레에 흩어 놓는다 — 한 점에 겹치면 몇 척인지 안 보인다
    const ang = (n.id * 2.39996) % (Math.PI * 2);
    return { x: a.x + Math.cos(ang) * 7, y: a.y + Math.sin(ang) * 5 + 1 };
  }
  const b = CITY_BY_ID[n.to];
  const u = n.legs ? 1 - n.days / n.legs : 0;
  /* 원양 구간은 두 바다에 걸쳐 있어 어느 권역 표에도 없다 — 그때는 직선이 맞다(지금까지대로). */
  const rid = REGION_OF_CITY[n.at];
  if (rid && rid === REGION_OF_CITY[n.to]) {
    const [x, y] = laneAt(rid, a, b, u);
    return { x, y };
  }
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** 그 배가 향하는 쪽 — 뱃머리를 돌려 놓는 데 쓴다(씬이 읽는다).
    ★ 꺾인 길에서는 **다음 점을 봐야** 뱃머리가 맞는다. 직선 시절에는 두 항구를 이은
      각도 하나로 충분했지만, 폴리라인에서는 그 각도가 실제 진행 방향과 어긋난다. */
export function npcHeading(n) {
  if (!n.to) return 0;
  const p = npcPos(n);
  const u = n.legs ? 1 - n.days / n.legs : 0;
  const a = CITY_BY_ID[n.at], b = CITY_BY_ID[n.to];
  const rid = REGION_OF_CITY[n.at];
  let nx, ny;
  if (rid && rid === REGION_OF_CITY[n.to]) {
    [nx, ny] = laneAt(rid, a, b, Math.min(1, u + 0.02));
  } else {
    nx = a.x + (b.x - a.x) * Math.min(1, u + 0.02);
    ny = a.y + (b.y - a.y) * Math.min(1, u + 0.02);
  }
  return Math.atan2(ny - p.y, nx - p.x);
}

/** 플레이어가 잡거나 격침시킨 NPC를 세계에서 지운다 */
export function removeNpc(id) {
  state.npcs = (state.npcs || []).filter((n) => n.id !== id);
}

/* ── 꺾은 이름은 바다에서도 내린다 ────────────────────────────
   ★ `pickDef`는 **새로 만들 때** 닫힌 명부를 후보에서 빼지만, **이미 떠 있는 배**는 그대로 둔다.
     그래서 꺾은 자가 다음 날 소굴에 서 있었다.
   ⚠️ **격파에만 쓴다 — 초무에는 안 쓴다.** 초무한 자는 사라지는 것이 아니라 **내 편이 되어
     그 바다에서 일한다**(과소기·토벌 협조 → `data.js: ROSTER`). 지워 봐야 정원이 안 줄어
     `standIn`이 얼굴 없는 배로 그 자리를 채우므로 **바다가 하나도 안 안전해진다** —
     24,000닢을 내고 체크리스트에서 이름 하나가 지워질 뿐이다. (한 번 그렇게 고쳤다가 되돌렸다.)
   정원은 안 줄인다 — 사라지는 것은 **이름과 현상금**뿐이라는 `rosterOf` 주석의 규약 그대로다. */
setRetireHook((id) => retireRosterShip(id));   // 명부가 닫히면 `state.js`가 이것을 부른다

/* ★★ **항구에 서 있는 동안에도 세계가 돈다**(회차 26 · X-1). `waitDays()`가 이것을 부른다 —
   전에는 그쪽이 `decayGuildFlow`만 불러 **자국이 삭기만 하고 상단 항차가 0회**였다
   (실측: 열흘 대기에 자국 −22.4% · 항차 0). 입구가 둘인데 하나만 돌고 있었다.
   ⚠️ 항해 쪽 입구는 `scenes/map.js`가 입항할 때 부르는 `worldTick(days)`이고 그쪽은 그대로다 —
     두 입구가 겹쳐 도는 일은 없다(항해와 대기는 배타적이다). */
setWorldHook((n) => worldTick(n));

export function retireRosterShip(pirateId) {
  const gone = (state.npcs || []).filter((n) => n.kind === 'pirate' && n.defId === pirateId);
  if (!gone.length) return 0;
  state.npcs = state.npcs.filter((n) => !(n.kind === 'pirate' && n.defId === pirateId));
  return gone.length;
}

/** 항구에서 듣는 소문 — 최근 사건을 문장으로 */
export function newsLines(news, limit = 3) {
  const out = [];
  /* ★ **내 바다 소식을 앞에 세운다.** 사건은 265곳에 고루 나므로 그대로 흘려보내면
     항해일지가 **못 가는 바다 이야기로 찬다** — 실측에서 40줄 중 22줄이 소문이었고
     그중 내 권역은 2줄이었다(완주 플레이 ISSUES #14). 항해일지는 "무슨 일이 있었나"를
     되짚는 화면인데 실제 사건(폭풍·해적·급여)이 남의 바다 소문에 밀려나면 안 된다.
     먼 소식을 지우지는 않는다 — 세계가 산다는 감각은 그쪽에서 온다. 순서만 바꾼다. */
  const here = REGION_OF_CITY[state.at];
  const mine = (e) => REGION_OF_CITY[e.at] === here || REGION_OF_CITY[e.to] === here;
  news = [...news].sort((a, b) => (mine(b) ? 1 : 0) - (mine(a) ? 1 : 0));
  /* ★ **상단에게 자리를 한 칸 남긴다.** 습격 줄은 상한을 안 보고 밀어 넣은 뒤 끝에서 잘라내므로,
     사건이 흔한 날에는 상단 소문이 **한 번도 안 뜬다** — 상단은 지도에 배로 안 뜨니
     소문이 그들의 유일한 얼굴이고, 그러면 물가를 누르는 층이 통째로 안 보인다.
     이 저장소가 다섯 번 겪은 *"규칙이 멀쩡한데 화면이 말하지 않는다"*의 자리다. */
  const hasGuild = news.some((e) => String(e.kind).startsWith('guild-'));
  const raidCap = hasGuild ? Math.max(1, limit - 1) : limit;
  for (const e of news) {
    if (out.length >= raidCap) break;
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
  /* ★ **상단 소식을 습격 바로 다음에 세운다.** 상단은 화면에 배로 안 뜨므로
     소문이 그들의 유일한 얼굴이다 — 이 줄이 없으면 물가를 누르는 층이 통째로 안 보인다. */
  for (const e of news) {
    if (out.length >= limit) break;
    if (e.kind === 'guild-press') {
      out.push({
        text: `${CITY_BY_ID[e.city]?.name ?? e.city}에서 ${e.who}이(가) ${GOOD_BY_ID[e.goodId]?.name ?? e.goodId}을(를) `
            + (e.corner ? '쓸어 담고 있다 — 값이 뛴다.' : '헐값에 풀고 있다 — 값이 무너진다.'),
        kind: 'bad',
      });
    } else if (e.kind === 'guild-offer') {
      out.push({
        text: `${e.who}이(가) 사람을 찾는다 — ${CITY_BY_ID[e.city]?.name ?? e.city}의 ${e.foeName ?? e.foe}을(를) 흔들 `
            + `${GOOD_BY_ID[e.goodId]?.name ?? e.goodId} ${e.need}개. 보수 ${e.fee.toLocaleString('en-US')}닢.`,
        kind: '',
      });
    } else if (e.kind === 'guild-help') {
      out.push({ text: `${e.who}이(가) 신용장을 끊어 주었다.`, kind: 'good' });
    } else if (e.kind === 'guild-paid') {
      out.push({ text: `${e.who}이(가) 셈을 치렀다 — ${e.fee.toLocaleString('en-US')}닢.`, kind: 'good' });
    /* ── 흥망(회차 26) — **이 넷이 없으면 인수·합병이 대시보드에만 있고 판에는 없다.**
       상단은 지도에 배로 안 뜨므로 소문이 그들의 유일한 얼굴이다. */
    } else if (e.kind === 'guild-bust') {
      out.push({
        text: `${e.foe}이(가) 문을 닫았다. 상관 ${e.seats}곳을 ${e.who}이(가) `
            + `${e.coin.toLocaleString('en-US')}닢에 넘겨받았다.`,
        kind: 'bad',
      });
    } else if (e.kind === 'guild-merge') {
      out.push({
        text: `${e.who}이(가) ${e.foe}을(를) 사들였다 — 상관 ${e.seats}곳이 한 장부로 들어갔다`
            + ` (${e.coin.toLocaleString('en-US')}닢).`,
        kind: 'bad',
      });
    } else if (e.kind === 'guild-revive') {
      out.push({
        text: `${e.who}의 이름이 다시 걸렸다`
            + (e.city ? ` — ${CITY_BY_ID[e.city]?.name ?? e.city}의 옛 상관을 되찾았다.` : '.'),
        kind: 'good',
      });
    }
  }
  /* ★ **잃은 항차는 따로, 그리고 한 줄만.** 세계 전체로 보면 하루에 한 척꼴로 안 돌아오므로
     (실측 600일에 555건) 앞의 갈래와 같은 자리에 두면 **괴롭힘·사주·도움 줄을 통째로 밀어낸다** —
     `raid`가 상단 줄을 밀어내던 것과 **정확히 같은 사고**다(회차 25 §A-3). 그래서 뒤에 두고 하나만 쓴다.
     ⚠️ 그래도 반드시 한 줄은 남긴다 — 안 닿은 짐은 그 항구에서 **값이 뛰고**(`raids()`와 같은 규약)
       그것을 화면이 말하지 않으면 플레이어에게 그 기회는 없는 것과 같다. */
  /* ⚠️ **내 바다 것만 쓴다.** 세계 전체를 쓰면 900일에 461줄이 되어 괴롭힘(20)·사주(18)를
     스무 배로 덮는다 — 못 가는 바다의 배가 안 돌아온 이야기는 기회가 아니라 소음이다. */
  const lost = news.find((e) => e.kind === 'guild-lost' && REGION_OF_CITY[e.city] === here);
  if (lost && out.length < limit) {
    out.push({
      text: `${lost.who}의 배가 돌아오지 않았다 — ${CITY_BY_ID[lost.city]?.name ?? lost.city}에서 기다리던 `
          + `${GOOD_BY_ID[lost.goodId]?.name ?? lost.goodId} ${lost.qty}개가 닿지 않는다. 값이 뛴다.`,
      kind: 'warn',
    });
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
    // `face`는 **명부 id**다(`defId`) — 전투 화면이 이것으로 그 해적의 초상을 찾는다(그림이 없으면 실루엣)
    // ★ 이름 없는 배는 `defId`가 null이라 `recordSlain`이 `pirate:` 키를 안 적는다 —
    //   **얼굴을 입혔다고 명부가 닫히면 안 된다.** 닫히는 것은 이름 있는 자뿐이다.
    id: `npc:${n.id}`, face: n.defId, name: `${n.name}호`, nation: n.nation ?? '해적',
    /* 선체는 **그 배가 실제로 타고 다니는 배**다. 얼굴 없는 자리도 그 자리에 있던 배를
       그대로 물려받으므로(`makePirate: standIn`) 동중국해에서 브리그가 나오지 않는다 —
       `fleeOdds`가 이 값으로 적 속력을 재고, 나포하면 이 배가 들어온다. */
    hull: s.hull, tint: 'dark', flag: n.flag ?? 'pirate',
    /* ★ **어느 집 배였는지를 전투 화면까지 들려 보낸다**(회차 28 · 나-1) — 없으면
       `state.js: backerSlain`이 깃발만 보게 되어 **그 깃발을 단 떠돌이 해적**을 잡아도
       나라가 화를 내는 엉뚱한 규칙이 된다. 상단 호위선단에만 붙는 값이다. */
    houseId: n.houseId ?? null,
    hp: Math.round(s.hp * mul), guns: Math.max(2, Math.round(s.guns * mul)),
    crew: Math.max(10, Math.round(s.crewMax * (0.35 + lv * 0.09))),
    level: lv, prize: n.shipKey,
    troops: PIRATE_TROOPS[lv],
    /* ★ **현상금은 지갑에 안 섞는다**(P6-2). 전에는 `loot.gold`에 더해 넣고 `capLoot`이 통째로
       눌렀는데, 그 상한의 정당화는 *"낡은 바사 갑판에 여섯이 서서 갤리엇의 금고를 통째로 옮길 수는
       없다"* — **옮겨 싣는 것**이라 상한이 있는 것이다. 그런데 **현상금은 옮겨 싣는 물건이 아니다.**
       사료: 나포 포상(prize money)은 **나포심판소의 판결 뒤 항구에서** 관이 장부로 치른 돈이고
       갑판 인원과 무관했다. 그래서 `bounty`로 따로 들려 보내고 `capLoot`을 안 지난다.
       ⚠️ **액수는 한 닢도 안 바꾼다.** 상한을 안 걸 뿐이다. 대신 **입항해서 받는다** —
         이기고 나서 항구까지 살아 돌아와야 한다는 대가가 하나 생긴다. */
    bounty: n.bounty ? [...n.bounty] : null,
    loot: {
      gold: [Math.round(gold * 0.6), gold],
      goods: Object.keys(n.cargo).length ? Object.keys(n.cargo)
           : (n.lootGoods ?? ['salt', 'wine']),
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
