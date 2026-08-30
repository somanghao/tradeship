// npc/guild.js — 상단(商團)이 부를 쌓고, 그 부가 물가를 누른다 (NPC 담당 영역)
//
// ★ **이 파일이 있는 이유 한 줄**: 지금까지의 NPC는 **이웃 한 칸**만 봤다. 그래서
//   "수요지를 신설해도 항로가 멀면 아무도 안 나른다"(이스탄불 곡물 유입이 **1**이었다).
//   무역로를 따라 부를 축적하는 상단은 **정의상 여러 칸을 보는 주체**이고,
//   그 시야가 곧 **물가 안정화의 엔진**이다 — 먼 가격차를 상단이 먹으면 그 차가 줄어든다.
//
// ── 모듈 방향 ────────────────────────────────────────────────
//   data.js ← state.js ← **guild.js** ← world.js ← scenes/*
//   state.js는 이 파일을 모른다(순환 참조 없음). state가 들고 있는 것은 **값**뿐이고
//   (`state.guilds`·`state.guildFlow`·`state.guildBoon`·`state.guildOffer`)
//   그것을 굴리는 규칙은 전부 여기 있다.
//
// ── 상단은 지도에 안 뜬다 ────────────────────────────────────
//   상단의 선단은 **장부상의 항차**다(`g.voy`). `state.npcs` 정원을 한 척도 안 건드리므로
//   해적 밀도·조우 확률이 움직이지 않는다 — *"밀도를 올려서 풀지 마라"*(QUICKMAP-world §3).
//
// 설계 정본 `.playtest/round-25/NPC-DESIGN.md` · 수치 `js/data.js: GUILD`
// 관측 `node tools/sim-guild.mjs 20`

import { GUILD, GOOD_BY_ID, CITY_BY_ID, SHIPS, SHOCK } from '../data.js';
import {
  state, neighborsOf, distanceBetween, priceOf, baseTariff, routeRisk,
  marketDepth, addGuildFlow, guildFlowOf, regionOf, infamyOf, addShock, guildFactor,
} from '../state.js';
import { HOUSES, HOUSE_BY_ID } from './houses.js';

const rnd = () => Math.random();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── 사료 자본 → 게임 자본 ────────────────────────────────────
   ⚠️ 사료값을 그대로 쓰면 푸거(수백만 굴덴)와 지방 상단의 차가 1000배라
      세계가 한 상단의 것이 된다. **서열은 남기고 크기만 누른다.** */
export function startCapital(h) {
  const src = Math.max(1, h.capital ?? GUILD.capRef);
  return Math.round(GUILD.capBase * (src / GUILD.capRef) ** GUILD.capPow);
}

/** 자본이 정하는 선단 수 — 물가를 누르는 힘이 여기서 나온다 */
export const fleetOf = (cap) =>
  clamp(1 + Math.floor(Math.log2(Math.max(1, cap) / GUILD.fleetStep)), 1, GUILD.fleetCap);

/** 자본이 정하는 압박 함대의 세기 1~5 — `pirateEnemy`의 `strength`와 **같은 눈금**이다 */
export const mightOf = (cap) =>
  clamp(1 + Math.floor(Math.log2(Math.max(1, cap) / GUILD.mightStep)), 1, 5);

/** 한 항차에 나르는 칸 — 규모가 큰 상단일수록 크다 */
const holdOf = (h) => Math.round(GUILD.holdBase * (0.55 + 0.18 * (h.rank ?? 3)));

/* ── 상관은 명부가 아니라 장부에 있다 (회차 26) ────────────────
   ★ **상관은 팔리고 넘어간다.** 파산·합병으로 임자가 바뀌므로 런타임 값이 필요한데,
     명부(`js/npc/houses*.js`)는 **콘텐츠 정본**이라 판 안에서 고치면 안 된다
     (세이브에 안 실리고 `content/houses-evidence.json`·`check-houses`와 갈린다).
     ⇒ 장부(`state.guilds[id].seats`)에 두고 **이 함수 하나로만** 읽는다.
   ⚠️ `h.seats`를 직접 읽는 자리가 하나라도 남으면 넘겨받은 상관이 **어떤 규칙에는 보이고
     어떤 규칙에는 안 보인다** — 이 저장소가 여러 번 겪은 「규칙이 서 있는데 아무 일도 안 나는」 모양이다. */
export function seatsOf(h) {
  const g = state.guilds?.[h.id];
  const arr = (g?.seats ?? h.seats ?? []);
  return arr.filter((c) => CITY_BY_ID[c]);
}

/** 아직 문을 닫지 않은 상단만 — 문 닫은 상단은 항차도 상호작용도 안 한다 */
export const liveHouses = () => HOUSES.filter((h) => !state.guilds?.[h.id]?.dead);

/* ── 총자산 — **현금이 아니라 자산으로 잰다** (회차 26) ─────────
   ★ 처음엔 부실을 `g.cap`(현금)으로 쟀더니 **모든 상단이 120일에 파산**했다.
     상단은 자본의 최대 80%(`loadRatio`)를 짐에 쓰므로 **떠 있는 항차가 있는 동안 현금이
     바닥에 가깝다** — 그것은 부실이 아니라 정상 영업이다. 사료의 결산도 현금이 아니라
     *미착 상품(goods in transit)을 자산으로 세는* 대차대조였다.
   ⇒ 부실·결산·합병은 전부 이 값으로 잰다. `fleetOf`/`mightOf`는 지금까지대로 **현금**을 본다
     (그쪽은 *"지금 몇 척을 띄울 수 있나"*라서 현금이 맞다 — 규칙을 안 바꾼다). */
export const worthOf = (g) =>
  (g?.cap ?? 0) + (g?.voy ?? []).reduce((a, v) => a + (v.spend ?? 0), 0);

/** 그 바다에서 살아 있는 상단 수 — 합병·재기의 하한(`GUILD.minHouses`)이 이것을 본다 */
export const liveInRegion = (rid) => liveHouses().filter((h) => h.region === rid).length;

/* ── 시야 — 그 상단이 닿는 항구들 ─────────────────────────────
   ★ **한 번만 계산한다.** 항로 그물은 안 변하므로 매일 BFS를 돌 이유가 없다
     (돌면 264 도시 × 상단 수십 × 수천 일이라 시뮬이 못 끝난다).
   ⚠️ **상관이 바뀌면 그 캐시를 반드시 버린다**(`dropReach`). 안 버리면 인수한 상관이
     시야에 영영 안 들어와 규칙이 서 있는데 아무 일도 안 난다. */
const reachCache = new Map();
const dropReach = (id) => reachCache.delete(id);

function reachOf(h) {
  if (reachCache.has(h.id)) return reachCache.get(h.id);
  const rid = h.region;
  const out = [];
  for (const seat of seatsOf(h)) {
    if (!CITY_BY_ID[seat]) continue;
    // 거리를 함께 쌓는 너비우선 — `hops`칸까지
    /* ⚠️ **위험은 길을 따라 쌓인다.** 처음엔 `routeRisk(seat, target)` 하나로 쟀는데,
       두세 칸 건너 항구는 **직항이 아니라서** `routeRisk`가 기본값을 돌려준다 —
       그래서 요율 상위 구간과 하위 구간이 똑같이 −13% 눌렸다(실측이 잡아냈다).
       *"상단은 위험한 길을 안 간다"*가 규칙에 없었던 것이다. 길 위의 요율을 더한다. */
    const seen = new Map([[seat, { dist: 0, risk: 0 }]]);
    let frontier = [seat];
    for (let d = 0; d < GUILD.hops; d++) {
      const next = [];
      for (const a of frontier) {
        const cur = seen.get(a);
        for (const b of neighborsOf(a)) {
          if (seen.has(b)) continue;
          /* 제 바다만 도는 상단은 권역 밖으로 안 나간다 — 안 그러면 지중해 연안선이
             희망봉을 돈다(`world.js: reachOf`가 배에 대해 이미 지키는 규약). */
          if (h.reach !== 'ocean' && regionOf(b) !== rid) continue;
          seen.set(b, { dist: cur.dist + distanceBetween(a, b), risk: cur.risk + (routeRisk(a, b) ?? 0) });
          next.push(b);
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    const near = [...seen.entries()]
      .filter(([id]) => id !== seat && CITY_BY_ID[id])
      .map(([id, v]) => ({
        id,
        days: Math.max(1, Math.round(v.dist / (13 * GUILD.convoySpeed))),
        risk: v.risk,                       // 길 위 요율의 합 — 멀고 사나울수록 커진다
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, GUILD.reachCap);
    out.push({ seat, near });
  }
  reachCache.set(h.id, out);
  return out;
}

/* ── 상단이 **실제로 무역로로 삼는 구간** (도구가 읽는다) ────────
   ★ 물가 안정화를 「전체 인접 항로 평균」으로 재면 아무것도 안 보인다 —
     상단이 손대지 않는 구간이 표본의 대부분이기 때문이다. 여기가 그 정본 표본이다.
   ⚠️ **결과가 아니라 설계에서 뽑는다**(상관 × 시야 × 품목). 결과에서 뽑으면
     "손댄 데는 좁아졌다"는 동어반복이 된다. */
export function houseLanes(perSeat = 6) {
  const out = [];
  for (const h of liveHouses()) {
    for (const { seat, near } of reachOf(h)) {
      for (const t of near.slice(0, perSeat)) {
        for (const gid of (h.goods ?? [])) {
          if (GOOD_BY_ID[gid] && CITY_BY_ID[seat] && CITY_BY_ID[t.id]) {
            out.push({ a: seat, b: t.id, g: gid, risk: t.risk ?? 0, house: h.id });
          }
        }
      }
    }
  }
  return out;
}

/* ── 장부 ─────────────────────────────────────────────────── */
export function initGuilds() {
  state.guilds = {};
  reachCache.clear();                 // 새 판은 명부의 상관으로 되돌아간다
  for (const h of HOUSES) {
    const cap = startCapital(h);
    state.guilds[h.id] = {
      cap, cap0: cap, fleet: h.fleet ?? fleetOf(cap),
      legs: 0, gain: 0,
      /* ★ **호감이 전부 0에서 시작하면 세 갈래 중 하나만 돈다.**
         `regard`를 올리고 내리는 길이 사주 완수뿐이라, 새 판의 49곳이 전부 중립이고
         **괴롭힘도 도움도 한 번도 안 일어난다** — 규칙은 멀쩡한데 아무 일이 안 나는 자리다.
         상단의 성격(`temper`)이 곧 첫인상이다: 사나운 밀무역 상단은 처음부터 나를 눌러 보고,
         점잖은 상관은 처음부터 문을 열어 둔다. 그래야 세 갈래가 다 산다. */
      regard: Math.round((0.5 - (h.temper ?? 0.4)) * GUILD.temperRegard),
      voy: [], cool: 0,
      /* 흥망(회차 26) — 옛 세이브에는 없어도 되게 전부 `??`로 열어 읽는다 */
      seats: [...(h.seats ?? [])], low: 0, dead: 0, by: null, lost: 0,
      book: GUILD.bookDays, peak: cap,
    };
  }
}

export const guildOf = (id) => state.guilds?.[id] ?? null;

/** 자본 서열 — 화면·소문이 읽는다 */
export function guildRank(regionId = null) {
  return liveHouses()
    .filter((h) => !regionId || h.region === regionId)
    .map((h) => ({ h, g: state.guilds?.[h.id] }))
    .filter((x) => x.g)
    .sort((a, b) => b.g.cap - a.g.cap)
    .map((x, i) => ({
      rank: i + 1, id: x.h.id, name: x.h.name, region: x.h.region,
      cap: Math.round(x.g.cap), fleet: x.g.fleet, might: mightOf(x.g.cap),
      legs: x.g.legs, gain: Math.round(x.g.gain), regard: Math.round(x.g.regard),
      seats: seatsOf(x.h).length, lost: x.g.lost ?? 0,
      /* 사료 자본 대비 지금 — 「부가 힘이 된다」의 사다리를 화면이 이 값으로 읽는다 */
      cap0: Math.round(x.g.cap0 ?? 0), took: (x.g.took ?? []).length,
    }));
}

/** 그 항구에 상관을 둔 상단들(장부까지) */
export const guildsAtCity = (cityId) =>
  liveHouses().filter((h) => seatsOf(h).includes(cityId))
    .map((h) => ({ house: h, ledger: state.guilds?.[h.id] ?? null }));

/* ── 그 상단이 나를 어떻게 보는가 ─────────────────────────────
   ★ **악명을 함께 뺀다** — 세력의 `regardOf`가 쓰는 것과 같은 규약이다(장부와 악명은
     붙는 대상이 달라 따로 두고, 읽을 때 합친다). 그 깃발 배를 털면 그 깃발의 상단이 돌아선다. */
export function guildRegard(h) {
  const g = state.guilds?.[h.id];
  if (!g) return 0;
  return clamp(g.regard - infamyOf(h.flag) * GUILD.regardPerInfamy, -100, 100);
}

export function addGuildRegard(id, n) {
  const g = state.guilds?.[id];
  if (!g) return 0;
  g.regard = clamp(g.regard + n, -100, 100);
  return g.regard;
}

/* ── 값을 미는 자리 ───────────────────────────────────────────
   ⚠️ **쌓이는 양에도 상한을 둔다.** 안 두면 한 항차에 상한(`priceCap`)을 넘겨 놓고
     그 뒤 수십 일 동안 `guildFactor`가 상한에 붙어 있어, 상단이 손을 떼도 값이
     안 돌아온다 — *"어렵게"가 "불가능"이 되는 자리*가 정확히 여기다. */
function flowLimit(cityId) {
  return (GUILD.flowCapMul * GUILD.priceCap * Math.max(1, marketDepth(cityId))) / GUILD.flowK;
}

function pushFlow(cityId, gid, n) {
  const lim = flowLimit(cityId);
  const cur = guildFlowOf(cityId, gid);
  const next = clamp(cur + n, -lim, lim);
  addGuildFlow(cityId, gid, next - cur);
}

/* ── 사건이 난 자리는 며칠 비워 둔다 ──────────────────────────
   ★ **큰돈은 확률이 아니라 사건에서 나온다**(메모리 정본). 상단이 사건을 즉시 먹으면
     플레이어에게 남는 큰 기회가 사라진다 — 「어렵게」가 아니라 「불가능」이다.
   사료도 이쪽이다: 소식이 닿고 배를 채워 떠나기까지 시간이 걸렸다. */
const shockFresh = (cityId, gid) =>
  state.shocks.some((s) => s.city === cityId && s.good === gid
    && state.day - (s.since ?? 0) < GUILD.reactDays);

/** 시세는 캐시를 먼저 본다 — 매일 수천 번 부르는 자리라 `priceOf`를 직접 때리면 시뮬이 안 끝난다 */
const px = (cityId, gid) => state.prices?.[cityId]?.[gid] ?? priceOf(cityId, gid);

/* ── 한 항차를 고른다 ─────────────────────────────────────────
   ★ 상단은 **상관(seat)을 축으로** 움직인다 — 제 상관에서 싣고 나가거나, 밖에서 사서
     제 상관으로 들여온다. 팩토리 제도가 실제로 그 모양이었고, 그 덕에 후보가
     `seats × 시야 × 품목`으로 **선형**이라 매일 돌려도 싸다. */
/* ── 그 상관에서 손댈 수 있는 물건 ────────────────────────────
   ★★ **전문 품목만 보게 두면 상단이 세계의 얇은 조각만 만진다.** 49곳 × 상관 셋 × 품목 넷이면
     (도시 264 × 품목 90) 가운데 몇백 칸뿐이고, 그러면 **무역로 위에서는 값이 좁아지는데
     주인공의 장부는 한 톨도 안 움직인다** — 20시드 실측이 그것을 잡아냈다
     (10항차 **+0.0%** · 30항차 **+6.0%** · 항차 ROI **+8.14%p**. 되레 벌기 **쉬워졌다**).
     최적 플레이는 매 항차 수백 후보의 **최댓값**을 고르므로, 세계 어딘가에 손 안 댄 큰 차익이
     남아 있으면 그쪽을 집는다. ⇒ **가장 큰 차익을 상단이 먼저 먹어야** 주인공이 어려워진다.
   ⇒ 그래서 상관이 **실제로 거래하는 물건 전부**를 후보에 넣되, 전문 품목에 웃돈을 준다
     (사료도 이쪽이다 — 팩토리는 아는 물건을 주로 다뤘지 그것만 실은 것이 아니다). */
function goodsFor(h, seat) {
  const c = CITY_BY_ID[seat];
  const out = new Map();
  for (const gid of (h.goods ?? [])) if (GOOD_BY_ID[gid]) out.set(gid, 1);
  for (const gid of Object.keys(c?.supply ?? {})) if (GOOD_BY_ID[gid] && !out.has(gid)) out.set(gid, GUILD.offSpecialty);
  for (const gid of Object.keys(c?.demand ?? {})) if (GOOD_BY_ID[gid] && !out.has(gid)) out.set(gid, GUILD.offSpecialty);
  return [...out.entries()].slice(0, GUILD.goodsCap);
}

function pickVoyage(h, g) {
  const hold = holdOf(h);
  let best = null;

  for (const { seat, near } of reachOf(h)) {
    if (!near.length) continue;
    const goods = goodsFor(h, seat);
    if (!goods.length) continue;
    for (const [gid, know] of goods) {
      const here = px(seat, gid);
      if (!here) continue;
      const homeShock = shockFresh(seat, gid);
      for (const t of near) {
        if (shockFresh(t.id, gid) || homeShock) continue;
        const there = px(t.id, gid);
        if (!there) continue;
        // ① 내보낸다: 상관에서 사서 밖에 판다   ② 들여온다: 밖에서 사서 상관에 판다
        for (const [from, to, buy, sell] of [
          [seat, t.id, here, there],
          [t.id, seat, there, here],
        ]) {
          const net = sell * (1 - baseTariff(to)) - buy;
          if (net <= 0) continue;
          if (net / buy < GUILD.minMargin) continue;          // 잔 차익은 플레이어의 몫
          const qty = Math.min(hold, Math.floor((g.cap * GUILD.loadRatio[1]) / buy));
          if (qty < GUILD.minLot) continue;                    // 작은 배의 자리
          const days = Math.max(1, t.days) + GUILD.portDays;   // 싣고 부리는 날을 함께 센다
          /* ★ **위험 항로는 상단이 안 간다** — 그래서 원거리·위험 항로의 프리미엄이
             플레이어에게 남는다. 요율(당대 해상보험 요율)이 그대로 감점이 된다. */
          const riskCut = 1 - Math.min(0.9, (t.risk ?? 0) * GUILD.riskAversion);
          const score = ((net * qty - GUILD.dayCost * days) / days) * riskCut * know;
          if (score <= 0) continue;
          /* ★ 길 위 요율의 합을 항차에 **실어 보낸다** — 도착할 때 그 요율로 굴려
             배가 안 닿을 수 있다(`GUILD.lossPerPct`). 지금까지 요율은 점수만 깎았다. */
          if (!best || score > best.score) best = { from, to, gid, qty, buy, days, score, risk: t.risk ?? 0 };
        }
      }
    }
  }
  return best;
}

/* ── 하루 ─────────────────────────────────────────────────── */
export function guildTick(days = 1, news = []) {
  if (!GUILD.enabled) return news;
  if (!state.guilds || !Object.keys(state.guilds).length) initGuilds();
  /* ★ **명부가 늘면 옛 판에는 그 상단의 장부가 없다** — 그러면 새로 넣은 상단이 그 판에서
     영영 안 돈다(콘텐츠는 계속 는다는 것이 이 저장소의 전제다). 빠진 자리만 채운다. */
  else if (Object.keys(state.guilds).length < HOUSES.length) {
    for (const h of HOUSES) {
      if (state.guilds[h.id]) continue;
      const cap = startCapital(h);
      state.guilds[h.id] = { cap, cap0: cap, fleet: h.fleet ?? fleetOf(cap), legs: 0, gain: 0,
        regard: Math.round((0.5 - (h.temper ?? 0.4)) * GUILD.temperRegard), voy: [], cool: 0 };
    }
  }

  for (let d = 0; d < days; d++) {
    for (const h of liveHouses()) {
      const g = state.guilds[h.id];
      if (!g) continue;
      g.voy ??= [];                 // 옛 세이브가 배열 없이 실려 올 수 있다
      g.seats ??= [...(h.seats ?? [])];
      if (g.cool > 0) g.cool--;

      // ① 떠 있는 항차가 닿는다
      for (let i = g.voy.length - 1; i >= 0; i--) {
        const v = g.voy[i];
        if (--v.eta > 0) continue;
        g.voy.splice(i, 1);
        /* ★★ **배는 안 닿을 수도 있다**(회차 26). 사료에서 **요율이 곧 손실률**이고
           이 저장소는 `ROUTE_RISK`를 당대 인수업자의 요율로 적어 두었는데
           상단의 항차에는 한 번도 안 물렸다 — 그래서 아무도 안 망했다.
           ⚠️ 플레이어의 조우 확률은 한 톨도 안 바뀐다(상단의 배는 지도에 안 뜬다). */
        if (rnd() < Math.min(0.5, (v.risk ?? 0) * GUILD.lossPerPct)) {
          /* 적하보험이 매입액의 일부를 돌려준다(`GUILD.lossCover`) — 안 그러면 한 번 잃은
             상단이 그대로 죽어 「흥망」이 아니라 「한 번의 주사위」가 된다. */
          const back = v.spend * GUILD.lossCover;
          g.gain -= v.spend - back + GUILD.dayCost * v.days;
          g.cap = Math.max(0, g.cap + back - GUILD.dayCost * v.days);
          g.lost = (g.lost ?? 0) + 1;
          /* ★ 그 짐은 기다리던 항구에 안 닿는다 — **그 물건이 귀해진다.**
             `world.js: raids()`가 이미 쓰는 규약 **그대로** 쓴다: **그 항구가 실제로 사들이던
             물건일 때만** 걸고, 폭과 날수도 `SHOCK.raidMult`/`raidDays`를 그대로 쓴다.
             ⚠️ **처음엔 제 상수(1.35·40일)를 따로 두고 아무 항구에나 걸었다가 되돌렸다.**
               상단의 항차는 하루에 한 척꼴로 안 돌아오므로(600일에 555건) 그것이
               **사건 밀도를 통째로 흔든다** — 실측에서 `sim-guild`의 「사건 폭」이 **−36.4%**로
               떨어졌다. 그 지표는 활성 사건의 |mult−1| 중앙값이라, **작은 사건을 많이 뿌리면
               큰 기회가 사라진 것처럼 보인다.** 사건 밀도(`SHOCK.densityBase`)는 맞춰 둔 값이고
               거기에 눈금 없는 새 사건원을 얹으면 안 된다. */
          /* ★ **얇은 시장에서만 한 배가 값을 움직인다.** `demand` 문턱만으로는 사건이 6건 →
             24건으로 **네 배**가 됐다(실측) — 상단의 배는 하루에 한 척꼴로 안 돌아오기 때문이다.
             그 물건이 「귀해진다」가 참이려면 **잃은 양이 그 항구의 시장 깊이에 견줘 커야** 한다.
             큰 항구(깊이 338)는 한 배로 안 흔들리고 작은 항구(45)는 흔들린다 — 그것이 이 게임이
             이미 `marketDepth`로 적어 둔 규칙이고, 여기에 새 눈금을 만들지 않는다. */
          if (CITY_BY_ID[v.to]?.demand?.[v.gid]
              && v.qty >= marketDepth(v.to) * GUILD.lossShockShare) {
            addShock(v.to, v.gid, SHOCK.raidMult, SHOCK.raidDays, 'raid');
            news.push({ kind: 'guild-lost', who: h.name, city: v.to, goodId: v.gid, qty: v.qty });
          }
          continue;
        }
        const unit = px(v.to, v.gid);
        const revenue = unit * v.qty * (1 - baseTariff(v.to));
        const profit = revenue - v.spend - GUILD.dayCost * v.days;
        /* ⚠️ **자본 하한(`cap0 × 0.2`)을 뗐다** — 그것이 있으면 파산이 영영 안 걸린다.
           대신 0 아래로는 안 간다(음수 자본은 규칙이 아니라 버그다). */
        g.cap = Math.max(0, g.cap + revenue - GUILD.dayCost * v.days);
        g.gain += profit;
        g.legs++;
        /* ★ **부으면 값이 내린다.** 이 한 줄이 물가 안정화의 절반이다(나머지 절반은 아래 매입). */
        pushFlow(v.to, v.gid, v.qty);
        if (profit > 0 && rnd() < 0.03) {
          news.push({ kind: 'guild-sold', who: h.name, city: v.to, goodId: v.gid, qty: v.qty });
        }
      }

      /* ② 유지비 두 갈래.
         ⓐ 자본에 **비례**하는 몫 — 안 굴리면 마른다(자본이 영원히 불지 않게).
         ⓑ ★ 상관마다 붙는 **정액** — 이 한 줄이 파산을 성립시킨다. ⓐ만 있으면 자본이 줄 때
           유지비도 같이 줄어 **아무도 못 무너진다**(실측: 1,440일에 문 닫은 곳 0). 사료의 팩토리는
           건물·직원·현지 관리에 정액이 들었고, 수지가 안 맞는 상관을 닫는 것이 곧 상사의 몰락이었다. */
      g.cap = Math.max(0, g.cap * (1 - GUILD.upkeep) - seatsOf(h).length * GUILD.seatUpkeep);
      g.fleet = fleetOf(g.cap);

      /* ③ **결산과 배당** — 자본은 무한히 안 쌓인다(회차 26).
         손대기 전 실측: 두 해면 49곳이 전부 선단 6·세기 5로 **천장에 눌어붙어** 사다리가 사라지고
         사료 자본의 17.4배 서열이 4.6배 안으로 모였다. 사료의 상사는 2~3년마다 결산하고
         이익을 조합원에게 나눴다 — 그 한 줄이 서열을 판 내내 살린다.
         ⚠️ 나간 돈은 **세계 밖으로** 간다. 플레이어에게 오지 않는다. */
      /* ★ **장부가(book value)** — 「무너지고 있다」는 사료 자본이 아니라 **제 최고점**에 견줘야 한다.
         처음엔 `cap0`(사료 자본)로 재려 했는데, 판이 돌면 자본이 그 10~28배에서 놀아
         **부실 문턱에 영영 안 닿았다**(실측: 2,880일에 문 닫은 곳 0). 그건 흥망이 아니다.
         결산 때 책을 닫고 다시 여는 것이 사료의 모양이고, 그 사이의 최고점이 곧 장부가다. */
      g.peak = Math.max(g.peak ?? g.cap0, worthOf(g));

      g.book = (g.book ?? GUILD.bookDays) - 1;
      if (g.book <= 0) {
        g.book = GUILD.bookDays;
        const keep = g.cap0 * GUILD.capKeep;
        const worth = worthOf(g);
        if (worth > keep) {
          /* 나갈 몫은 총자산으로 재고, **치르는 것은 현금**이다(짐을 배당할 수는 없다). */
          const out = Math.min(g.cap * 0.9, (worth - keep) * GUILD.payout);
          g.paid = (g.paid ?? 0) + out;
          g.cap -= out;
          g.fleet = fleetOf(g.cap);
        }
        g.peak = worthOf(g);        // 책을 닫고 새로 연다 — 배당을 「추락」으로 읽으면 안 된다
      }

      /* ④ 부실을 센다 — 이어지면 문을 닫는다(`bustTick`).
         ⚠️ **총자산으로 잰다** — 현금으로 재면 짐을 실은 상단이 전부 부실이 된다(위 `worthOf`). */
      g.low = (worthOf(g) < (g.peak ?? g.cap0) * GUILD.bustAt) ? (g.low ?? 0) + 1 : 0;

      // ③ 빈 선단이 있으면 새 항차를 뽑는다
      let free = g.fleet - g.voy.length;
      while (free-- > 0) {
        const v = pickVoyage(h, g);
        if (!v) break;
        const spend = v.buy * v.qty;
        if (spend > g.cap * GUILD.loadRatio[1]) break;
        g.cap -= spend;
        /* ★ **사가면 값이 오른다.** 산지가 수요지 쪽으로 올라온다 — 양끝이 서로에게 다가간다. */
        pushFlow(v.from, v.gid, -v.qty);
        g.voy.push({ from: v.from, to: v.to, gid: v.gid, qty: v.qty, spend, days: v.days,
                     eta: v.days, risk: v.risk ?? 0 });
      }
    }
    rollGuildActs(news);
    /* ⚠️ **날을 먼저 센다.** 0에서 `% mergeCheckDays`를 보면 **첫날에 합병이 터진다** —
       실측에서 1일차에 상단 하나가 이미 문을 닫아 있었다(판이 시작하기도 전이다). */
    state.guildDay = (state.guildDay ?? 0) + 1;
    bustTick(news);
    mergeTick(news);
    reviveTick(news);
  }
  return news;
}

/* ══ 흥망 — 인수·합병·파산 (회차 26) ══════════════════════════
   설계 정본 `.playtest/round-26/C-DESIGN.md` · 관측 `node tools/probe-houses.mjs`

   ★ **명부는 한 줄도 안 지운다.** 문을 닫는 것은 장부(`state.guilds`)뿐이고
     `js/npc/houses*.js`·`content/houses-evidence.json`은 그대로다 —
     새 판은 언제나 49곳으로 선다(콘텐츠는 줄지 않는다는 최상위 원칙).
   ★ **상관이 빈 항구를 만들지 않는다.** 그래서 파산은 소멸이 아니라 **인수**다.
     회차 25가 이 기능을 미룬 이유가 정확히 그것이었다. */

/** 상관을 옮긴다 — 시야 캐시를 **반드시** 함께 버린다 */
function moveSeats(fromId, toId, seats) {
  const a = state.guilds[fromId], b = state.guilds[toId];
  if (!a || !b) return 0;
  b.seats = [...new Set([...(b.seats ?? []), ...seats])];
  a.seats = (a.seats ?? []).filter((c) => !seats.includes(c));
  dropReach(fromId); dropReach(toId);
  (b.took ??= []).push({ id: fromId, day: state.day, seats: seats.length });
  return seats.length;
}

/** 그 상단을 삼킬 수 있는 상대 — 같은 바다이거나 원양을 도는 상단 중 자본 1위 */
function buyerFor(h) {
  const cand = liveHouses().filter((x) => x.id !== h.id
    && (x.region === h.region || x.reach === 'ocean')
    && (state.guilds[x.id]?.cap ?? 0) > 0);
  if (!cand.length) return null;
  return cand.reduce((a, b) =>
    (worthOf(state.guilds[a.id]) >= worthOf(state.guilds[b.id]) ? a : b));
}

/** 문을 닫힌 것으로 적고 상관과 떠 있던 항차를 인수자에게 넘긴다 */
function foldInto(h, buyer, price, news, kind) {
  const g = state.guilds[h.id], b = state.guilds[buyer.id];
  const seats = seatsOf(h);
  b.cap = Math.max(0, b.cap - price);
  moveSeats(h.id, buyer.id, seats);
  /* 떠 있던 항차도 넘어간다 — 바다에 뜬 배가 임자 없이 남으면 그 짐이 영영 안 닿는다 */
  b.voy = [...(b.voy ?? []), ...(g.voy ?? [])];
  g.voy = [];
  /* ⚠️ **상단의 시계로 적는다.** `state.day`는 *항해했을 때만* 오르므로(항구에 시간이 없다)
     그것으로 적으면 재기(`reviveDays`)가 판에 따라 영영 안 오거나 즉시 온다. */
  g.dead = state.guildDay ?? 1;
  g.by = buyer.id;
  g.cap = 0;
  g.fleet = 0;
  g.low = 0;
  b.fleet = fleetOf(b.cap);
  dropReach(h.id);
  news.push({ kind, who: buyer.name, foe: h.name, city: seats[0] ?? null,
              seats: seats.length, coin: Math.round(price) });
  return true;
}

/** ③ 부실이 이어지면 문을 닫는다 — 살 사람이 없으면 부실인 채로 버틴다 */
function bustTick(news) {
  for (const h of liveHouses()) {
    const g = state.guilds[h.id];
    if (!g || (g.low ?? 0) < GUILD.bustDays) continue;
    /* ⚠️ 그 바다의 마지막 상단은 안 닫는다 — 상관이 빈 항구가 생긴다 */
    if (liveInRegion(h.region) <= 1) { g.low = 0; continue; }
    const buyer = buyerFor(h);
    if (!buyer) { g.low = 0; continue; }
    const price = g.cap + seatsOf(h).length * GUILD.seatPrice;
    foldInto(h, buyer, price, news, 'guild-bust');
  }
}

/** ④ 합병 — 큰 쪽이 작은 쪽을 산다. 서열을 실제로 바꾸는 자리다.
    ⚠️ **한 번 볼 때 바다마다 한 건만** 한다. 처음엔 조건만 맞으면 다 삼키게 두었더니
      첫 판정에서 **일곱 곳이 한꺼번에 사라졌다** — 흥망이 아니라 한 번의 정리해고다.
    ⚠️ 그리고 먹잇감은 **작기만 해서는 안 되고 기울고 있어야** 한다(`mergeWeakAt`).
      사료의 인수도 「작은 경쟁사」가 아니라 「무너지는 경쟁사」를 샀다. */
function mergeTick(news) {
  const regions = [...new Set(HOUSES.map((h) => h.region))];
  /* ★ **바다마다 판정 날을 어긋나게 둔다.** 같은 날 보게 두면 실측에서 **180일차에 일곱 곳이
     한꺼번에 문을 닫았다** — 규칙은 옳은데 화면에는 「어느 날 세계가 한 번 정리됐다」로 읽힌다.
     한 해에 걸쳐 흩으면 같은 횟수가 사건처럼 읽힌다(규칙은 한 줄도 안 바뀐다). */
  const step = Math.max(1, Math.floor(GUILD.mergeCheckDays / regions.length));
  regions.forEach((rid, i) => {
    if (((state.guildDay ?? 0) + i * step) % GUILD.mergeCheckDays) return;
    if (liveInRegion(rid) <= GUILD.minHouses) return;
    const here = liveHouses().filter((h) => h.region === rid);
    let done = false;
    for (const h of [...here].sort((a, b) =>
      worthOf(state.guilds[b.id]) - worthOf(state.guilds[a.id]))) {
      if (done) break;
      const A = state.guilds[h.id];
      if (!A || A.dead) continue;
      const mySeats = new Set(seatsOf(h));
      const prey = here.filter((x) => {
        if (x.id === h.id) return false;
        const B = state.guilds[x.id];
        if (!B || B.dead) return false;
        if (worthOf(A) < worthOf(B) * GUILD.mergeRatio) return false;
        // ★ 기울고 있어야 산다 — 잘 도는 상단은 안 팔린다
        if (worthOf(B) > (B.peak ?? B.cap0) * GUILD.mergeWeakAt) return false;
        /* 상관이 겹치거나 이웃이어야 산다 — 못 가는 바다의 상관을 살 수는 없다 */
        return seatsOf(x).some((c) => mySeats.has(c)
          || neighborsOf(c).some((n) => mySeats.has(n)));
      });
      if (!prey.length) continue;
      const B = prey.reduce((a, b) =>
        (worthOf(state.guilds[a.id]) >= worthOf(state.guilds[b.id]) ? a : b));
      const price = worthOf(state.guilds[B.id]) * GUILD.mergePrem;
      if (price > A.cap * 0.5) continue;           // 제 자본의 절반 넘게 쓰지 않는다
      foldInto(B, h, price, news, 'guild-merge');
      done = true;
    }
  });
}

/** ⑤ 재기 — 그 바다가 하한 아래로 내려가면 문 닫았던 이름이 다시 선다 */
function reviveTick(news) {
  if ((state.guildDay ?? 0) % GUILD.mergeCheckDays) return;
  const seen = new Set(HOUSES.map((h) => h.region));
  for (const rid of seen) {
    if (liveInRegion(rid) >= GUILD.minHouses) continue;
    const back = HOUSES.filter((h) => h.region === rid
      && state.guilds[h.id]?.dead
      && (state.guildDay ?? 0) - state.guilds[h.id].dead >= GUILD.reviveDays)
      .sort((a, b) => state.guilds[a.id].dead - state.guilds[b.id].dead)[0];
    if (!back) continue;
    const g = state.guilds[back.id];
    /* 옛 상관 하나를 되찾는다 — 지금 임자에게서 떨어져 나온다 */
    const want = (back.seats ?? []).filter((c) => CITY_BY_ID[c])[0];
    const holder = want ? liveHouses().find((x) => seatsOf(x).includes(want)) : null;
    g.dead = 0; g.by = null; g.low = 0; g.book = GUILD.bookDays;
    g.cap = g.cap0 * GUILD.reviveCap;
    g.peak = g.cap;
    g.fleet = fleetOf(g.cap);
    g.seats = want ? [want] : [...(back.seats ?? [])];
    if (holder && want) {
      const hg = state.guilds[holder.id];
      hg.seats = seatsOf(holder).filter((c) => c !== want);
      dropReach(holder.id);
    }
    dropReach(back.id);
    news.push({ kind: 'guild-revive', who: back.name, city: want ?? null });
  }
}

/** 흥망의 장부 — 도구·대시보드가 읽는다(소문 줄이 아니라 **결과**를 센다) */
export function guildHistory() {
  const out = { live: 0, dead: 0, took: 0, seatsMoved: 0, lost: 0, paid: 0, rows: [] };
  for (const h of HOUSES) {
    const g = state.guilds?.[h.id];
    if (!g) continue;
    if (g.dead) out.dead++; else out.live++;
    out.took += (g.took ?? []).length;
    out.seatsMoved += (g.took ?? []).reduce((a, t) => a + t.seats, 0);
    out.lost += g.lost ?? 0;
    out.paid += g.paid ?? 0;
    out.rows.push({
      id: h.id, name: h.name, region: h.region,
      cap: Math.round(g.cap), cap0: Math.round(g.cap0 ?? 0),
      seats: seatsOf(h).length, dead: g.dead ?? 0,
      by: g.by ? (HOUSE_BY_ID[g.by]?.name ?? g.by) : null,
      took: (g.took ?? []).length, lost: g.lost ?? 0,
    });
  }
  return out;
}

/* ── 세 갈래 — 괴롭히고 · 이용하고 · 돕는다 ────────────────────
   판정은 하루에 한 번. 그 상단이 **플레이어가 선 바다**에 있어야 걸린다 —
   못 가는 바다의 상단이 나를 괴롭히면 화면에 아무 일도 안 일어난다. */
function rollGuildActs(news) {
  const here = regionOf(state.at);
  for (const h of liveHouses()) {
    const g = state.guilds[h.id];
    if (!g || g.cool > 0) continue;
    if (h.region !== here && h.reach !== 'ocean') continue;
    const sway = g.fleet * mightOf(g.cap);
    if (rnd() > GUILD.actBase * sway) continue;
    g.cool = GUILD.coolDays;
    const r = guildRegard(h);
    if (r <= GUILD.pressAt) pressPlayer(h, g, news);
    else if (r >= GUILD.helpAt) helpPlayer(h, g, news);
    else offerCommission(h, g, news);
  }
}

/** ① 괴롭힘 — 매점(값을 올린다) 또는 투매(값을 내린다). 플레이어가 선 항구 언저리에서. */
function pressPlayer(h, g, news) {
  const seats = seatsOf(h);
  const goods = (h.goods ?? []).filter((gid) => GOOD_BY_ID[gid]);
  if (!seats.length || !goods.length) return;
  const city = seats.includes(state.at) ? state.at : seats[Math.floor(rnd() * seats.length)];
  const gid = goods[Math.floor(rnd() * goods.length)];
  const corner = rnd() < 0.5;
  const lot = GUILD.cornerLot * mightOf(g.cap);
  pushFlow(city, gid, corner ? -lot : lot);
  /* 압박 함대는 **조우 확률을 안 올린다** — 해적 사건이 났을 때 *누가 오는가*만 바꾼다
     (명부 해적과 같은 규약). `guildFoeOnLeg()`가 그 자리다. */
  g.press = { city, until: state.day + GUILD.pressDays, might: mightOf(g.cap) };
  news.push({
    kind: 'guild-press', who: h.name, city, goodId: gid, corner,
    line: h.lines?.press ?? null,
  });
}

/** ③ 도움 — 신용장(매입 할인) · 호위(조우 감소). **매매 대행은 없다**(설계 §0-2). */
function helpPlayer(h, g, news) {
  const seats = seatsOf(h);
  if (!seats.length) return;
  const b = (state.guildBoon ||= { credit: null, escort: null });
  b.credit = { cities: [...seats], off: GUILD.creditOff, until: state.day + GUILD.helpDays, by: h.id };
  b.escort = { cities: [...seats], off: GUILD.escortOff, until: state.day + GUILD.helpDays, by: h.id };
  news.push({ kind: 'guild-help', who: h.name, city: seats[0], line: h.lines?.help ?? null });
}

/** ② 이용 — A가 B의 자리를 흔들라고 사주한다. 주인공이 남의 싸움의 도구가 된다. */
function offerCommission(h, g, news) {
  if (state.guildOffer && state.guildOffer.until > state.day) return;
  const rivals = liveHouses().filter((x) => x.id !== h.id && x.region === h.region
    && seatsOf(x).length && (state.guilds[x.id]?.cap ?? 0) > 0);
  if (!rivals.length) return;
  const foe = rivals[Math.floor(rnd() * rivals.length)];
  // 흔들 자리 = 경쟁 상단의 상관, 흔들 물건 = 그가 취급하는 것
  const foeSeats = seatsOf(foe);
  const city = foeSeats[Math.floor(rnd() * foeSeats.length)];
  const pool = (foe.goods ?? []).filter((gid) => GOOD_BY_ID[gid]);
  if (!CITY_BY_ID[city] || !pool.length) return;
  const gid = pool[Math.floor(rnd() * pool.length)];
  const [lo, hi] = GUILD.useFee;
  const fee = Math.round(g.cap * (lo + rnd() * (hi - lo)));
  const need = Math.max(GUILD.minLot, Math.round(GUILD.cornerLot * (0.6 + rnd())));
  state.guildOffer = {
    by: h.id, byName: h.name, foe: foe.id, foeName: foe.name,
    city, gid, need, done: 0, fee,
    until: state.day + GUILD.offerDays,
    line: h.lines?.offer ?? null,
  };
  news.push({ kind: 'guild-offer', who: h.name, foe: foe.name, city, goodId: gid, need, fee });
}

/* ── 사주를 마쳤나 ────────────────────────────────────────────
   ★ 판정 자체는 `state.js: sell()`이 한다(그쪽이 파는 자리를 안다). 여기서는
     **다 찼는가**만 보고 값을 치른다 — 규칙과 지급을 한 자리에 두면 state가 상단을 알아야 한다. */
export function settleGuildOffer() {
  const o = state.guildOffer;
  if (!o) return null;
  if (o.done < o.need) {
    if (o.until <= state.day) { state.guildOffer = null; return { ok: false, why: 'expired' }; }
    return null;
  }
  state.gold += o.fee;
  addGuildRegard(o.by, GUILD.regardUse);
  addGuildRegard(o.foe, -GUILD.regardUse);
  state.guildOffer = null;
  return { ok: true, fee: o.fee, by: o.byName, foe: o.foeName };
}

/* ── 압박 함대 — 조우가 났을 때 *누가 오는가* ──────────────────
   ⚠️ **조우 확률은 안 건드린다.** 밀도를 올리면 그냥 더 자주 털리고
     *"사람은 이길 수 있는 상대만 싸운다"*는 전제가 깨진다(명부 해적과 같은 규약). */
export function guildFoeOnLeg(aId, bId) {
  for (const h of liveHouses()) {
    const g = state.guilds?.[h.id];
    if (!g?.press || g.press.until <= state.day) continue;
    const seats = seatsOf(h);
    if (!seats.includes(aId) && !seats.includes(bId)) continue;
    const might = clamp(g.press.might ?? 1, 1, 5);
    const shipKey = GUILD.escortShips[might - 1];
    /* ★ **`world.js: pirateEnemy(n)`가 그대로 먹을 수 있는 모양**으로 돌려준다 —
       씬이 붙일 것이 `|| guildFoeOnLeg(a, b)` 한 마디여야 하기 때문이다(명부 해적과 같은 자리).
       ⚠️ `defId`는 **null**이다 — 상단 호위선단을 꺾었다고 해적 명부가 닫히면 안 된다. */
    return {
      id: `guild-${h.id}-${state.day}`, kind: 'pirate', houseId: h.id, defId: null,
      name: `${h.name} 호위선단`, flag: h.flag ?? null, nation: h.name,
      strength: might, bounty: null,
      /* 상단의 배를 꺾으면 **그 상단이 더 미워한다** — 씬이 이 값을 보고 `addGuildRegard`를 부른다 */
      guildPenalty: GUILD.regardOnSlain,
      lootGoods: (h.goods ?? []).slice(0, 3),
      base: seats[0], hunt: null, season: null, scope: h.reach ?? 'region',
      circuit: null, circuitIdx: 0,
      shipKey: SHIPS[shipKey] ? shipKey : 'brig',
      at: aId, to: bId, days: 0, legs: 0,
      gold: Math.round(g.cap * GUILD.escortPurse),
      cargo: {}, hp: SHIPS[shipKey]?.hp ?? 130, kills: 0, stray: true,
      line: h.lines?.press ?? null,
    };
  }
  return null;
}

/** 그 항구에 걸린 사주 — 화면이 읽는다 */
export const guildOfferAt = (cityId) =>
  (state.guildOffer && state.guildOffer.city === cityId && state.guildOffer.until > state.day)
    ? state.guildOffer : null;

/* ── 관측 (도구·대시보드가 읽는다) ────────────────────────────
   ★ **「무엇과 비교해서 성공인가」를 값 안에 넣는다.** 판정(PASS)이 결함을 감춘 적이 있어
     이 저장소가 비싸게 배운 자리다 — 그래서 여기는 *지금 값*이 아니라 *상단이 민 폭*을 낸다. */
export function guildPriceReport(limit = 20) {
  const rows = [];
  for (const cityId of Object.keys(state.guildFlow ?? {})) {
    for (const gid of Object.keys(state.guildFlow[cityId])) {
      const f = guildFlowOf(cityId, gid);
      if (!f) continue;
      /* ★ **여기서 다시 셈하지 않는다**(X-2). 전에는 같은 식을 손으로 옮겨 적어 **상한(±10%)을
         안 물었고**, 실측 ±12%가 나왔다 — 항구 시세 칸의 「상단이 민 폭」과 대시보드가
         **서로 다른 수를 말하게 된다.** 정본은 `state.js: guildFactor()` 하나다. */
      const push = guildFactor(cityId, gid) - 1;
      rows.push({
        city: cityId, cityName: CITY_BY_ID[cityId]?.name ?? cityId,
        good: gid, goodName: GOOD_BY_ID[gid]?.name ?? gid,
        flow: Math.round(f), pushPct: +(push * 100).toFixed(1),
      });
    }
  }
  rows.sort((a, b) => Math.abs(b.pushPct) - Math.abs(a.pushPct));
  return rows.slice(0, limit);
}

export const HOUSE_COUNT = HOUSES.length;
void HOUSE_BY_ID;
