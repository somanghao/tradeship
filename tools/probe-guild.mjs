// probe-guild.mjs — 상단의 **세 갈래가 실제로 도는가** (괴롭힘 / 이용 / 도움)
//
//   node tools/probe-guild.mjs [일수] [판수]        (기본 720일 · 8판)
//
// ★ **성공 로그를 믿지 않는다.** 이 저장소는 「+198칸」을 여섯 번 찍고 실제로는 0이었던 자리를 겪었다.
//   그래서 여기서는 **소문 줄을 세지 않고 결과를 직접 센다**:
//     · 괴롭힘 → `state.guildFlow`가 그 항구·품목에서 실제로 움직였나 · `guildFoeOnLeg`가 배를 세우나
//     · 도움   → `guildCredit()`가 실제로 매입가를 깎나 (같은 실행 안에서 두 번 재서 차이를 찍는다)
//     · 이용   → `state.guildOffer`가 실제로 서고, 물건을 부으면 `done`이 오르고, 값이 치러지나
//
// ⚠️ 이 도구는 **밸런스를 재지 않는다**(그건 `sim-guild.mjs`). 여기는 *배선이 살아 있나*만 본다.

import { GUILD, CITY_BY_ID } from '../js/data.js';
import { state, resetGame, costFor, refreshPrices, decayGuildFlow, guildCredit, guildEscortOff,
         neighborsOf, encounterOdds, routeRisk, sell } from '../js/state.js';
import { guildTick, initGuilds, guildFoeOnLeg, settleGuildOffer, guildRegard, guildRank,
         addGuildRegard, guildsAtCity } from '../js/npc/guild.js';
import { HOUSES } from '../js/npc/houses.js';

const DAYS = +(process.argv[2] || 720);
const RUNS = +(process.argv[3] || 8);

function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/* 첫인상이 실제로 갈리나 — 셋 다 살아 있으려면 세 무리가 다 있어야 한다 */
resetGame(); initGuilds();
const r0 = HOUSES.map((h) => guildRegard(h));
const nPress = r0.filter((r) => r <= GUILD.pressAt).length;
const nHelp = r0.filter((r) => r >= GUILD.helpAt).length;
const nMid = r0.length - nPress - nHelp;
console.log(`상단 ${HOUSES.length}곳 · 첫인상 — 괴롭히려는 쪽 ${nPress} · 중립(사주) ${nMid} · 도우려는 쪽 ${nHelp}`);
if (!nPress || !nHelp || !nMid) console.log('  ★ 세 무리 중 빈 것이 있다 — 그 갈래는 한 번도 안 돈다(GUILD.temperRegard)');

const orig = Math.random;
const tally = { press: 0, offer: 0, help: 0, paid: 0, foe: 0, credit: 0 };
let sample = { press: null, offer: null, help: null };
const startPorts = ['busanpo', 'venezia', 'lisboa', 'melaka', 'cartagena', 'goa', 'hakata', 'aden'];

for (let i = 0; i < RUNS; i++) {
  Math.random = seeded(0x9d11 + i * 7919);
  resetGame(startPorts[i % startPorts.length]);
  initGuilds();
  for (let d = 0; d < DAYS; d++) {
    state.day++;
    refreshPrices();
    const news = [];
    guildTick(1, news);
    decayGuildFlow(1);
    for (const e of news) {
      if (e.kind === 'guild-press') { tally.press++; sample.press ??= e; }
      if (e.kind === 'guild-offer') { tally.offer++; sample.offer ??= e; }
      if (e.kind === 'guild-help') { tally.help++; sample.help ??= e; }
    }
    /* 사주를 사람이 마쳤다 치고 — 값이 실제로 치러지나 · 호감이 실제로 옮겨가나 */
    const o = state.guildOffer;
    if (o && o.done < o.need && Math.random() < 0.06) o.done = o.need;
    const done = settleGuildOffer();
    if (done?.ok) tally.paid++;
    /* 압박 함대가 실제로 서나 — 그 상단 상관을 잇는 구간에서 */
    if (!(d % 30)) {
      for (const h of HOUSES) {
        const seats = h.seats ?? [];
        for (const a of seats) {
          const b = neighborsOf(a)[0];
          if (b && guildFoeOnLeg(a, b)) { tally.foe++; a; break; }
        }
      }
    }
    if (guildCredit(state.at) > 0) tally.credit++;
  }
}
Math.random = orig;

const per = (n) => (n / RUNS).toFixed(1);
console.log(`\n${RUNS}판 × ${DAYS}일 — 판당 평균`);
console.log(`  ① 괴롭힘(매점·투매)   ${per(tally.press)}회   · 압박 함대가 항로에 선 관측 ${per(tally.foe)}회`);
console.log(`  ② 이용(사주)         ${per(tally.offer)}회   · 셈을 치른 것 ${per(tally.paid)}회`);
console.log(`  ③ 도움(신용장·호위)   ${per(tally.help)}회   · 신용장이 살아 있던 날 ${per(tally.credit)}일`);
for (const [k, e] of Object.entries(sample)) {
  if (!e) { console.log(`  ★ ${k}: 한 번도 안 났다 — 그 갈래는 죽어 있다`); continue; }
  const where = CITY_BY_ID[e.city]?.name ?? e.city;
  console.log(`  보기(${k}) ${e.who} · ${where}${e.foe ? ` ↔ ${e.foe}` : ''}`);
}

/* ── 도움이 **실제로** 값을 깎나 — 같은 실행에서 두 번 재서 차이를 찍는다 ── */
resetGame();
const city = state.at;
const gid = Object.keys(CITY_BY_ID[city].supply ?? {})[0] ?? Object.keys(CITY_BY_ID[city].demand ?? {})[0];
const c0 = costFor(gid, 10, city);
state.guildBoon = { credit: { cities: [city], off: GUILD.creditOff, until: state.day + 30 }, escort: null };
const c1 = costFor(gid, 10, city);
state.guildBoon = null;
const nb = neighborsOf(city).find((x) => routeRisk(city, x));
const o0 = nb ? encounterOdds({ from: city, to: nb }) : 0;
state.guildBoon = { credit: null, escort: { cities: [city], off: GUILD.escortOff, until: state.day + 30 } };
const o1 = nb ? encounterOdds({ from: city, to: nb }) : 0;
state.guildBoon = null;
console.log(`\n도움의 실효 — 매입 ${c0} → ${c1}닢(−${((1 - c1 / c0) * 100).toFixed(1)}%)`
  + (nb ? ` · 조우 ${(o0 * 100).toFixed(1)}% → ${(o1 * 100).toFixed(1)}%` : ''));

/* ── 악명이 상단을 돌려세우나 ────────────────────────────── */
resetGame(); initGuilds();
const h0 = HOUSES.find((h) => h.flag);
const before = guildRegard(h0);
state.infamy[h0.flag] = 5;
console.log(`악명의 실효 — ${h0.name}(${h0.flag}) 호감 ${before} → ${guildRegard(h0)} (악명 5)`);
void guildRank; void addGuildRegard; void guildsAtCity; void guildEscortOff; void sell;
