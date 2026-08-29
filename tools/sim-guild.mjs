// sim-guild.mjs — 상단(商團)이 물가를 좁히는가, 그래서 주인공이 벌기 어려워졌는가
//
//   node tools/sim-guild.mjs [시드수] [세계일수] [항차]      (기본 20 · 360일 · 60항차)
//
// ★ **같은 시드로 짝지어(paired) 잰다.** 따로 돌려 비교하면 기준선이 25%씩 튀어
//   **효과의 부호가 뒤집힌다**(이 저장소가 부관 측정에서 실제로 겪었다 —
//   같은 설정에서 −20%와 +62%가 나왔다). `Math.random`을 시드 난수로 갈아 끼우고
//   `GUILD.enabled`를 껐다 켜서 **한 시드에 두 번** 돌린다.
//
// ★ **판정(PASS)도 결함을 감춘다.** 그래서 이 도구는 「좁아졌다」만 보지 않고
//   **좁아지면 안 되는 것이 안 좁아졌는지**를 나란히 낸다:
//     ① 위험 항로 프리미엄 — 상단은 요율 높은 구간을 피해야 한다
//     ② 사건(shock) 창 — 상단이 즉시 먹으면 큰 기회가 사라진다
//     ③ 완주 — 파산이 늘면 「어렵게」가 아니라 「불가능」으로 간 것이다
//
// ── 왜 측정이 둘인가 ────────────────────────────────────────
//   A. **세계만** 굴린다(플레이어 없음) — 물가가 실제로 좁아졌는지는 사람이 안 끼어야 보인다.
//   B. **짝지은 runSim** — 그 물가에서 사람이 얼마나 벌기 어려워졌는지.
//   둘을 한 도구에 둔 이유: 「좁아졌다」와 「그래서 못 번다」가 **같은 수치로 이어져야** 하기 때문이다.

import { GUILD, CITIES, CITY_BY_ID, GOODS, GOOD_BY_ID, ROUTES } from '../js/data.js';
import {
  state, resetGame, priceOf, refreshPrices, decayGuildFlow, routeRisk, regionOf,
} from '../js/state.js';
import { initWorld, worldTick } from '../js/world.js';
import { guildRank, guildPriceReport, mightOf, houseLanes } from '../js/npc/guild.js';
import { HOUSES } from '../js/npc/houses.js';
import { runSim } from './sim-core.mjs';

const N = +(process.argv[2] || 20);
const DAYS = +(process.argv[3] || 360);
const V = +(process.argv[4] || 60);

/** 아주 흔한 LCG. 암호가 아니라 **재현**이 목적이다. */
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const med = (a) => {
  const s = [...a].filter(Number.isFinite).sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const pct = (a, b) => (b ? (a / b - 1) * 100 : 0);
const pad = (s, n) => String(s).padEnd(n, ' ');
const won = (n) => Math.round(n).toLocaleString('en-US');

/* ── 표본 항로를 **미리** 고정한다 ─────────────────────────────
   ★ 상단이 실제로 손댄 곳만 재면 "손댄 데는 좁아졌다"는 동어반복이 된다.
     그래서 세계에서 **먼저** 뽑아 두고, 그 같은 표본을 두 판에 똑같이 쓴다.
   표본 = 인접 항로 (a,b) × 두 항구가 함께 거래하는 품목. */
function sampleLanes() {
  const out = [];
  for (const [a, b] of ROUTES) {
    const ca = CITY_BY_ID[a], cb = CITY_BY_ID[b];
    if (!ca || !cb) continue;
    const goods = new Set([
      ...Object.keys(ca.supply ?? {}), ...Object.keys(ca.demand ?? {}),
    ].filter((g) => (cb.supply?.[g] || cb.demand?.[g]) && GOOD_BY_ID[g]));
    for (const g of goods) out.push({ a, b, g, risk: routeRisk(a, b) ?? 0 });
  }
  return out;
}
const LANES = sampleLanes();
const RISKS = [...LANES.map((l) => l.risk)].sort((x, y) => x - y);
const RISK_HI = RISKS[Math.floor(RISKS.length * 0.70)] ?? 0;   // 상위 30% 문턱

/* ★ **상단이 무역로로 삼는 구간** — 설계(상관 × 시야 × 품목)에서 뽑는다.
   결과(`guildFlow`)에서 뽑으면 "손댄 데는 좁아졌다"는 동어반복이 된다. */
const GLANES = houseLanes(6);
const GRISKS = [...GLANES.map((l) => l.risk)].sort((x, y) => x - y);
const GRISK_HI = GRISKS[Math.floor(GRISKS.length * 0.70)] ?? 0;

/* ★★ **물가 안정화의 정본 지표** — 한 품목의 값이 세계에서 얼마나 고른가.
   *"싼 데서 사서 비싼 데로 나르면 그 차가 줄어든다"*를 그대로 재는 것은 이쪽이지
   인접 두 항구의 차가 아니다(인접 두 곳은 애초에 차가 작다 — 실측 중앙값 5.4%). */
const GOODS_LIVE = GOODS.filter((g) =>
  CITIES.filter((c) => c.supply?.[g.id] || c.demand?.[g.id]).length >= 6);
const CITIES_OF = new Map(GOODS_LIVE.map((g) =>
  [g.id, CITIES.filter((c) => c.supply?.[g.id] || c.demand?.[g.id]).map((c) => c.id)]));

function dispersion() {
  const out = [];
  for (const g of GOODS_LIVE) {
    const ps = CITIES_OF.get(g.id).map((c) => priceOf(c, g.id)).sort((a, b) => a - b);
    const q = (f) => ps[Math.min(ps.length - 1, Math.floor(ps.length * f))];
    const m = ps[Math.floor(ps.length / 2)];
    if (m > 0) out.push((q(0.9) - q(0.1)) / m);
  }
  return out;
}

/** 그 표본의 가격차(상대) */
const spreadOf = (l) => {
  const pa = priceOf(l.a, l.g), pb = priceOf(l.b, l.g);
  const m = (pa + pb) / 2;
  return m > 0 ? Math.abs(pb - pa) / m : NaN;
};

/* ── A. 세계만 굴린다 ─────────────────────────────────────────
   플레이어가 없다. 날짜만 흐르고 NPC와 상단이 사고판다.
   ⚠️ `advanceDays`를 쓰면 급여·계약·세력까지 함께 돌아 무엇이 값을 밀었는지 갈리지 않는다 —
      여기서는 **시장 관련 세 가지만** 손으로 돌린다(시세 갱신 · 세계 tick · 상단 자국 감쇠). */
function runWorld(days) {
  resetGame();
  initWorld();
  for (let d = 0; d < days; d++) {
    state.day++;
    refreshPrices();
    worldTick(1);
    decayGuildFlow(1);
  }
  const all = LANES.map(spreadOf);
  const hi = LANES.filter((l) => l.risk >= RISK_HI).map(spreadOf);
  const lo = LANES.filter((l) => l.risk < RISK_HI).map(spreadOf);
  const glAll = GLANES.map(spreadOf);
  const glHi = GLANES.filter((l) => l.risk >= GRISK_HI).map(spreadOf);
  const glLo = GLANES.filter((l) => l.risk < GRISK_HI).map(spreadOf);
  const disp = dispersion();
  /* ★ 사건 창 — 그 도시·품목이 지금 얼마나 정상에서 벗어나 있나.
     상단이 사건을 즉시 먹으면 이 값이 **줄어든다**. 줄면 안 된다. */
  const shockGap = state.shocks.filter((s) => s.good).map((s) => Math.abs(s.mult - 1));
  const touched = new Set();
  for (const c of Object.keys(state.guildFlow ?? {})) {
    for (const g of Object.keys(state.guildFlow[c])) touched.add(`${c}|${g}`);
  }
  const onLane = LANES.filter((l) => touched.has(`${l.a}|${l.g}`) || touched.has(`${l.b}|${l.g}`));
  return {
    all: med(all), hi: med(hi), lo: med(lo),
    disp: med(disp), gl: med(glAll), glHi: med(glHi), glLo: med(glLo),
    onIdx: onLane.map((l) => LANES.indexOf(l)),
    shock: med(shockGap), shocks: state.shocks.length,
    caps: Object.values(state.guilds ?? {}).map((g) => g.cap),
    legs: Object.values(state.guilds ?? {}).reduce((a, g) => a + g.legs, 0),
    flows: Object.keys(state.guildFlow ?? {}).length,
    rank: guildRank().slice(0, 5),
    push: guildPriceReport(6),
    lanes: LANES.map(spreadOf),
  };
}

/* ── B. 사람이 그 물가에서 얼마나 버는가 ───────────────────── */
function digest(res) {
  const rows = res.rows;
  const at = (v) => rows[v - 1]?.assets ?? rows.at(-1)?.assets ?? 0;
  const gat = (v) => rows[v - 1]?.gold ?? rows.at(-1)?.gold ?? 0;
  const live = rows.filter((r) => r.spend > 0);
  const rois = live.map((r) => (r.gain - r.spend) / r.spend);
  /* ★ **항차이익은 닢으로 잰다.** ROI(비율)는 이 변화에 쓸 수 없다 — 상단이 차익을 줄이면
     최적 플레이가 **덜 싣는 쪽으로** 옮겨 가고, 덜 실으면 `MARKET.impact` 벌점도 함께 줄어
     **비율은 오히려 오른다**(실측 −10.3% 금고에 +1.56%p ROI). 사용자가 물은 것도 「항차이익」이다.
     → `wiki/sim-measurement.md`의 같은 함정(후반 브레이크). */
  const nets = live.map((r) => r.gain - r.spend);
  return { n: rows.length, a30: at(30), a60: at(60), g10: gat(10), g30: gat(30),
           roi: med(rois), net: med(nets), net30: med(nets.slice(0, 30)) };
}

console.log(`상단 ${HOUSES.length}곳 · 짝지어(paired) ${N}시드 · 세계 ${DAYS}일 · 항차 ${V}`);
console.log(`표본 항로×품목 ${LANES.length}쌍 (요율 상위 30% 문턱 = ${RISK_HI}%)\n`);

const orig = Math.random;
const A = [], B = [], WA = [], WB = [];
for (let i = 0; i < N; i++) {
  const seed = 0x51ed + i * 7907;

  GUILD.enabled = false;
  Math.random = seeded(seed); WA.push(runWorld(DAYS));
  Math.random = seeded(seed); A.push(digest(runSim({ maxVoyages: V })));

  GUILD.enabled = true;
  Math.random = seeded(seed); WB.push(runWorld(DAYS));
  Math.random = seeded(seed); B.push(digest(runSim({ maxVoyages: V })));
}
Math.random = orig;

/* ★ **짝지은 차이의 중앙값**이 정답이다 — 두 중앙값을 나누면 짝짓기가 도로 풀린다
   (이 저장소가 같은 자료에서 −14%와 −0.0%를 얻은 적이 있다). */
const pairW = (k) => med(WA.map((a, i) => (a[k] ? pct(WB[i][k], a[k]) : NaN)));
const pairD = (k) => med(A.map((a, i) => (a[k] ? pct(B[i][k], a[k]) : NaN)));

/* 상단이 실제로 손댄 표본만 — 짝 안에서 같은 인덱스를 비교한다 */
const pairTouched = med(WB.map((b, i) => {
  const idx = b.onIdx;
  if (!idx.length) return NaN;
  const before = med(idx.map((j) => WA[i].lanes[j]));
  const after = med(idx.map((j) => WB[i].lanes[j]));
  return before ? pct(after, before) : NaN;
}));

const band = (d, lo, hi) => (d >= lo && d <= hi ? 'PASS' : d > hi ? '★ 모자람' : '★ 지나침');

console.log('── ① 물가가 좁아졌나 (세계만 굴린 판 · 짝지은 차이의 중앙값) ─────────');
console.log(pad('지표', 32) + pad('상단 없음', 12) + pad('상단 있음', 12) + pad('짝지은 차이', 12) + '판정');
const row = (name, k, note = '') => console.log(
  pad(name, 32) + pad((med(WA.map((x) => x[k])) * 100).toFixed(1) + '%', 12)
  + pad((med(WB.map((x) => x[k])) * 100).toFixed(1) + '%', 12)
  + pad((pairW(k) >= 0 ? '+' : '') + pairW(k).toFixed(1) + '%', 12) + note);
/* ★★ 이것이 「물가가 안정화된다」의 정본 지표다 — 한 품목의 값이 세계에서 고른가.
   인접 두 항구의 차(아래 참고 줄)는 애초에 작아서(중앙값 5.4%) 이 질문에 답하지 못한다. */
row('  ★★ 품목별 세계 가격 퍼짐', 'disp', band(pairW('disp'), -40, -2));
row('  ★ 상단의 무역로 가격차', 'gl', band(pairW('gl'), -45, -3));
row('     └ 그중 요율 낮은 쪽', 'glLo');
row('     └ ⚠ 그중 요율 상위 30%', 'glHi',
  Math.abs(pairW('glHi')) <= Math.abs(pairW('glLo')) ? 'PASS 위험 프리미엄이 남았다' : '★ 위험 항로까지 눌렸다');
row('  (참고) 전체 인접 항로', 'all');
row('  ⚠ 사건(shock) 폭', 'shock',
  Math.abs(pairW('shock')) <= 5 ? 'PASS 큰 기회는 그대로다' : '★ 상단이 사건을 먹었다');
void pairTouched;

console.log('\n── ② 상단이 실제로 굴렀나 (안 굴렀으면 위 ①은 아무 뜻이 없다) ─────');
console.log(`  누적 항차   ${won(med(WB.map((x) => x.legs)))}회 (상단 없음: ${won(med(WA.map((x) => x.legs)))}회)`);
console.log(`  자국 남긴 항구 ${won(med(WB.map((x) => x.flows)))}곳`);
console.log(`  자본 중앙값 ${won(med(WB.flatMap((x) => x.caps)))}닢 · 최대 ${won(Math.max(...WB.flatMap((x) => x.caps)))}닢`);
const top = WB[0]?.rank ?? [];
if (top.length) {
  console.log('  자본 서열 5 (첫 시드)');
  for (const r of top) console.log(`    ${r.rank}. ${r.name} — 자본 ${won(r.cap)}닢 · 선단 ${r.fleet} · 세기 ${r.might} · 항차 ${r.legs}`);
}
const push = WB[0]?.push ?? [];
if (push.length) {
  console.log('  값을 가장 세게 민 자리 (첫 시드 · +는 내렸다 / −는 올렸다)');
  for (const p of push) console.log(`    ${p.cityName} ${p.goodName}  ${p.pushPct > 0 ? '' : '+'}${(-p.pushPct).toFixed(1)}%  (flow ${p.flow})`);
}

console.log('\n── ③ 주인공이 벌기 어려워졌나 (짝지은 runSim) ─────────────────');
console.log(pad('지표', 30) + pad('상단 없음', 14) + pad('상단 있음', 14) + pad('짝지은 차이', 12) + '판정');
/* ★ **10항차는 「안 움직이는 것」이 합격이다.** 상단의 압력은 *부가 쌓이면서* 오는 것이라
   (그것이 이 회차의 사다리다) 첫 열 항차에 이미 눌리면 그건 「어렵게」가 아니라
   **시작이 막히는 것**이다. 그래서 이 줄만 밴드가 ±10%의 **가드**다. */
for (const [name, k, lo, hi] of [
  ['  ⚠ 10항차 금고(초반 가드)', 'g10', -10, 10],
  ['  30항차 금고', 'g30', -45, -1],
  ['  30항차 총자산', 'a30', -45, -1], ['  60항차 총자산', 'a60', -45, -1],
]) {
  const d = pairD(k);
  const mark = k === 'g10'
    ? (Math.abs(d) <= 10 ? 'PASS 초반은 안 건드린다 — 압력은 부가 쌓이며 온다' : '★ 시작이 막힌다')
    : band(d, lo, hi);
  console.log(pad(name, 30) + pad(won(med(A.map((x) => x[k]))), 14) + pad(won(med(B.map((x) => x[k]))), 14)
    + pad(`${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, 12) + mark);
}
for (const [name, k] of [['  ★ 항차이익 중앙값(닢)', 'net'], ['  ★ 앞 30항차의 항차이익', 'net30']]) {
  const d = pairD(k);
  console.log(pad(name, 30) + pad(won(med(A.map((x) => x[k]))), 14) + pad(won(med(B.map((x) => x[k]))), 14)
    + pad(`${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, 12) + band(d, -45, -1));
}
const roiA = med(A.map((x) => x.roi)), roiB = med(B.map((x) => x.roi));
const roiD = med(A.map((a, i) => (B[i].roi - a.roi)));
console.log(pad('  (참고) 항차 ROI 중앙값', 30) + pad((roiA * 100).toFixed(2) + '%', 14) + pad((roiB * 100).toFixed(2) + '%', 14)
  + pad(`${(roiD * 100).toFixed(2)}%p`, 12) + '※ 비율은 판정에 안 쓴다 — 덜 실으면 벌점도 줄어 되레 오른다');
console.log(pad('  ⚠ 완주', 30) + pad(`${A.filter((x) => x.n >= V).length}/${N}`, 14)
  + pad(`${B.filter((x) => x.n >= V).length}/${N}`, 14) + pad('', 12)
  + (B.filter((x) => x.n >= V).length >= A.filter((x) => x.n >= V).length - 1
     ? 'PASS 「어렵게」이지 「불가능」이 아니다' : '★ 판이 깨진다'));

console.log('\n※ 판정은 전부 **짝지은 차이의 중앙값**이다. 두 중앙값을 나누면 짝짓기가 풀린다.');
void CITIES; void GOODS; void regionOf; void mightOf;
