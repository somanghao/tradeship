// guilds.mjs — 상단(商團) 탭 계측 (출력이 없는 순수 로직 · DOM 없음)
//
// G-7. 회차 25가 상단 49곳을 세우고 회차 26이 **흥망(인수·합병·파산)**을 얹었는데,
// 그 층은 **지도에 배로 안 뜬다** — 소문 세 줄이 유일한 얼굴이다. 그래서
// *"부가 실제로 쌓이나 · 누가 누구를 삼켰나 · 값을 어디서 얼마나 밀었나"*를 물을 자리가 없었다.
// 이 탭이 그 자리다.
//
// ★ **여기서 규칙을 다시 구현하지 않는다**(이 폴더의 규약). 세계를 실제로 굴리고
//   `js/npc/guild.js`의 `guildRank`·`guildHistory`·`guildPriceReport`·`houseLanes`를 읽는다.
// ★ **시드를 고정한다** — 한 번 돌린 값이 화면에 남으므로 새로고침마다 딴 소리를 하면 안 된다
//   (`wages.mjs: withSeed`와 같은 장치).

import { state, resetGame, refreshPrices, priceOf } from '../js/state.js';
import { initWorld, worldTick } from '../js/world.js';
import {
  guildRank, guildHistory, guildPriceReport, houseLanes, mightOf, worthOf, seatsOf,
} from '../js/npc/guild.js';
import { HOUSES, HOUSE_BY_ID } from '../js/npc/houses.js';
import { GUILD, CITY_BY_ID, GOOD_BY_ID } from '../js/data.js';
import { REGION_BY_ID } from '../js/map/geo.js';

/** 재현되게 — 같은 인자면 같은 그림 */
function withSeed(seed, fn) {
  const real = Math.random;
  let s = (seed >>> 0) || 1;
  Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  try { return fn(); } finally { Math.random = real; }
}

/** 자본 곡선을 몇 칸으로 찍나 */
const MARKS = [0, 90, 180, 360, 540, 720, 1080, 1440];

/* ── 세계를 굴리고 장부를 찍는다 ─────────────────────────────
   ⚠️ `state.day`를 함께 민다 — 게임은 `advanceDays` 뒤에 `worldTick`을 부른다.
     빼먹으면 사건·시세·재기가 얼어붙어 **딴 세계를 재게 된다**(프로브가 실제로 겪었다). */
export function measureGuilds({ days = 1440, seed = 20260830 } = {}) {
  return withSeed(seed, () => {
    resetGame();
    initWorld();
    refreshPrices();

    const curve = [];         // [{day, rows:[{id,cap}]}]
    const snapAt = new Set(MARKS.filter((m) => m <= days));
    const events = [];        // 흥망 — 언제 누가 누구를
    const seen = new Set();

    let d = 0;
    const snap = () => {
      const rk = guildRank();
      curve.push({
        day: d,
        cap: Object.fromEntries(rk.map((r) => [r.id, r.cap])),
        live: rk.length,
        f6: rk.filter((r) => r.fleet === 6).length,
        m5: rk.filter((r) => r.might === 5).length,
      });
    };
    if (snapAt.has(0)) snap();
    while (d < days) {
      state.day++;
      worldTick(1);
      d++;
      /* 흥망은 그 순간에 적는다 — 뒤에서 훑으면 「언제」가 사라진다 */
      for (const h of HOUSES) {
        const g = state.guilds?.[h.id];
        if (!g?.dead || seen.has(h.id)) continue;
        seen.add(h.id);
        events.push({
          day: d, id: h.id, name: h.name, region: h.region,
          by: g.by, byName: HOUSE_BY_ID[g.by]?.name ?? g.by,
          seats: (h.seats ?? []).length, lost: g.lost ?? 0,
        });
      }
      if (snapAt.has(d)) snap();
    }
    if (!snapAt.has(days)) snap();

    const rank = guildRank();
    const hist = guildHistory();
    const push = guildPriceReport(40);

    /* 무역로 — **결과가 아니라 설계에서 뽑는다**(상관 × 시야 × 품목).
       결과에서 뽑으면 "손댄 데는 좁아졌다"가 동어반복이 된다(회차 25 §B-2). */
    const lanes = [];
    for (const L of houseLanes(3)) {
      const pa = priceOf(L.a, L.g), pb = priceOf(L.b, L.g);
      if (!pa || !pb) continue;
      lanes.push({
        a: L.a, b: L.b, g: L.g, house: L.house, risk: L.risk,
        aName: CITY_BY_ID[L.a]?.name ?? L.a, bName: CITY_BY_ID[L.b]?.name ?? L.b,
        gName: GOOD_BY_ID[L.g]?.name ?? L.g,
        houseName: HOUSE_BY_ID[L.house]?.name ?? L.house,
        gap: Math.abs(pa - pb) / Math.max(1, Math.min(pa, pb)),
      });
    }
    lanes.sort((x, y) => y.gap - x.gap);

    /* 바다별 — 살아 있는 상단 · 자본 · 삼킨 수 */
    const seas = {};
    for (const h of HOUSES) {
      const g = state.guilds?.[h.id];
      const r = (seas[h.region] ??= { id: h.region, name: REGION_BY_ID[h.region]?.name ?? h.region,
                                      live: 0, dead: 0, cap: 0, seats: 0, took: 0 });
      if (g?.dead) r.dead++; else { r.live++; r.cap += g?.cap ?? 0; r.seats += seatsOf(h).length; }
      r.took += (g?.took ?? []).length;
    }

    return {
      days, seed, curve, events, rank, hist, push,
      lanes: lanes.slice(0, 40),
      seas: Object.values(seas),
      total: {
        live: hist.live, dead: hist.dead, seats: hist.seatsMoved,
        lost: hist.lost, paid: hist.paid,
        legs: rank.reduce((a, r) => a + r.legs, 0),
        cap: rank.reduce((a, r) => a + r.cap, 0),
        flowCities: Object.keys(state.guildFlow ?? {}).length,
        worth: Object.values(state.guilds ?? {}).reduce((a, g) => a + (g.dead ? 0 : worthOf(g)), 0),
      },
      knobs: {
        houses: HOUSES.length, priceCap: GUILD.priceCap, flowK: GUILD.flowK,
        bookDays: GUILD.bookDays, capKeep: GUILD.capKeep, payout: GUILD.payout,
        bustAt: GUILD.bustAt, bustDays: GUILD.bustDays,
        mergeRatio: GUILD.mergeRatio, minHouses: GUILD.minHouses,
        seatUpkeep: GUILD.seatUpkeep, lossPerPct: GUILD.lossPerPct,
      },
    };
  });
}

export { mightOf };
