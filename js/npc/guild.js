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

import { GUILD, GOOD_BY_ID, CITY_BY_ID, SHIPS } from '../data.js';
import {
  state, neighborsOf, distanceBetween, priceOf, baseTariff, routeRisk,
  marketDepth, addGuildFlow, guildFlowOf, regionOf, infamyOf,
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

/* ── 시야 — 그 상단이 닿는 항구들 ─────────────────────────────
   ★ **한 번만 계산한다.** 항로 그물은 안 변하므로 매일 BFS를 돌 이유가 없다
     (돌면 264 도시 × 상단 수십 × 수천 일이라 시뮬이 못 끝난다). */
const reachCache = new Map();

function reachOf(h) {
  if (reachCache.has(h.id)) return reachCache.get(h.id);
  const rid = h.region;
  const out = [];
  for (const seat of h.seats ?? []) {
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
  for (const h of HOUSES) {
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
    };
  }
}

export const guildOf = (id) => state.guilds?.[id] ?? null;

/** 자본 서열 — 화면·소문이 읽는다 */
export function guildRank(regionId = null) {
  return HOUSES
    .filter((h) => !regionId || h.region === regionId)
    .map((h) => ({ h, g: state.guilds?.[h.id] }))
    .filter((x) => x.g)
    .sort((a, b) => b.g.cap - a.g.cap)
    .map((x, i) => ({
      rank: i + 1, id: x.h.id, name: x.h.name, region: x.h.region,
      cap: Math.round(x.g.cap), fleet: x.g.fleet, might: mightOf(x.g.cap),
      legs: x.g.legs, gain: Math.round(x.g.gain), regard: Math.round(x.g.regard),
    }));
}

/** 그 항구에 상관을 둔 상단들(장부까지) */
export const guildsAtCity = (cityId) =>
  HOUSES.filter((h) => (h.seats ?? []).includes(cityId))
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
          if (!best || score > best.score) best = { from, to, gid, qty, buy, days, score };
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
    for (const h of HOUSES) {
      const g = state.guilds[h.id];
      if (!g) continue;
      g.voy ??= [];                 // 옛 세이브가 배열 없이 실려 올 수 있다
      if (g.cool > 0) g.cool--;

      // ① 떠 있는 항차가 닿는다
      for (let i = g.voy.length - 1; i >= 0; i--) {
        const v = g.voy[i];
        if (--v.eta > 0) continue;
        g.voy.splice(i, 1);
        const unit = px(v.to, v.gid);
        const revenue = unit * v.qty * (1 - baseTariff(v.to));
        const profit = revenue - v.spend - GUILD.dayCost * v.days;
        g.cap = Math.max(g.cap0 * 0.2, g.cap + revenue - GUILD.dayCost * v.days);
        g.gain += profit;
        g.legs++;
        /* ★ **부으면 값이 내린다.** 이 한 줄이 물가 안정화의 절반이다(나머지 절반은 아래 매입). */
        pushFlow(v.to, v.gid, v.qty);
        if (profit > 0 && rnd() < 0.03) {
          news.push({ kind: 'guild-sold', who: h.name, city: v.to, goodId: v.gid, qty: v.qty });
        }
      }

      // ② 유지비 — 안 굴리면 마른다(자본이 영원히 불지 않게)
      g.cap = Math.max(g.cap0 * 0.2, g.cap * (1 - GUILD.upkeep));
      g.fleet = fleetOf(g.cap);

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
        g.voy.push({ from: v.from, to: v.to, gid: v.gid, qty: v.qty, spend, days: v.days, eta: v.days });
      }
    }
    rollGuildActs(news);
  }
  return news;
}

/* ── 세 갈래 — 괴롭히고 · 이용하고 · 돕는다 ────────────────────
   판정은 하루에 한 번. 그 상단이 **플레이어가 선 바다**에 있어야 걸린다 —
   못 가는 바다의 상단이 나를 괴롭히면 화면에 아무 일도 안 일어난다. */
function rollGuildActs(news) {
  const here = regionOf(state.at);
  for (const h of HOUSES) {
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
  const seats = (h.seats ?? []).filter((c) => CITY_BY_ID[c]);
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
  const seats = (h.seats ?? []).filter((c) => CITY_BY_ID[c]);
  if (!seats.length) return;
  const b = (state.guildBoon ||= { credit: null, escort: null });
  b.credit = { cities: [...seats], off: GUILD.creditOff, until: state.day + GUILD.helpDays, by: h.id };
  b.escort = { cities: [...seats], off: GUILD.escortOff, until: state.day + GUILD.helpDays, by: h.id };
  news.push({ kind: 'guild-help', who: h.name, city: seats[0], line: h.lines?.help ?? null });
}

/** ② 이용 — A가 B의 자리를 흔들라고 사주한다. 주인공이 남의 싸움의 도구가 된다. */
function offerCommission(h, g, news) {
  if (state.guildOffer && state.guildOffer.until > state.day) return;
  const rivals = HOUSES.filter((x) => x.id !== h.id && x.region === h.region
    && (x.seats ?? []).length && (state.guilds[x.id]?.cap ?? 0) > 0);
  if (!rivals.length) return;
  const foe = rivals[Math.floor(rnd() * rivals.length)];
  // 흔들 자리 = 경쟁 상단의 상관, 흔들 물건 = 그가 취급하는 것
  const city = foe.seats[Math.floor(rnd() * foe.seats.length)];
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
  for (const h of HOUSES) {
    const g = state.guilds?.[h.id];
    if (!g?.press || g.press.until <= state.day) continue;
    const seats = h.seats ?? [];
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
      const push = -(GUILD.flowK * f) / Math.max(1, marketDepth(cityId));
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
