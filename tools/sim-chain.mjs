// sim-chain.mjs — 수직계열화가 곡선을 움직이는가 (A-9)
//
//   node tools/sim-chain.mjs [판수] [항차]        (기본 20판 · 140항차)
//
// ★ **같은 시드로 짝지어(paired) 잰다.** 따로 20판씩 돌려 비교하면 기준선이 25%씩 튀어
//   **효과의 부호가 뒤집힌다** — 부관 측정에서 실제로 −20%와 +62%가 같은 설정에서 나왔다.
//   `Math.random`을 시드 난수로 갈아 끼우고 `chain:false`와 `chain:'basic'`을 한 번씩 돌린다.
//
// ★ 지표는 금화가 아니라 **총자산**이다(금고 + 선단 매각가 + 시설 매각가 60% + 창고·화물 시가).
//   금화만 보면 *"방금 시설을 샀는가"*에 지배된다.
//
// ── 왜 140항차이고 왜 시작 부두를 돌리나 ───────────────────────
// ① 직물 사슬의 원료가 나는 자리는 지중해(원면)와 구자라트(면포+인디고)다. 기본 시작지
//    부산포에서 60항차를 굴리면 시뮬이 **동아시아를 못 벗어나** 사슬을 한 번도 안 짓는다 —
//    그러면 "±5% 안"이라는 판정이 *"아무 일도 안 일어났다"*는 뜻이 되어 아무것도 검증 못 한다.
// ② 「짓는 규칙 ①」(금고 > 시설값 × 2.5)이 세다. 실측에서 첫 가공장이 **100~130항차**에
//    선다 — 사양 §6-3이 요구한 "첫 시설은 20항차 이후"를 크게 웃돈다. 그래서 60항차까지의
//    수치는 **사슬이 아직 없는 구간**이고, 그 사실 자체가 이 회차의 결론 하나다.
//
// 사양 §6-3의 합격선(1단계) — **기준선 대비 ±5%**. 사슬만으로는 거의 안 남는 것이 정상이고
// (§0-2: 사슬은 시세보다 비싸다), 5%를 넘게 움직이면 밴드나 가공비가 틀린 것이다.
// ★ 위아래 **양쪽**으로 본다. 위로 새면 새 수입원이고, 아래로 꺼지면 그냥 벌금이다.

import { runSim } from './sim-core.mjs';
import { CHAIN_BY_ID } from '../js/data.js';

const N = +(process.argv[2] || 20);
const V = +(process.argv[3] || 140);

/* 시작 부두 — 사슬의 원료가 닿는 바다를 골고루 돈다.
   같은 시드 쌍은 **같은 부두**에서 시작하므로 짝짓기가 깨지지 않는다. */
const STARTS = ['cambay', 'venezia', 'goa', 'lisboa', 'melaka', 'alexandria'];

/** 아주 흔한 LCG. 암호가 아니라 **재현**이 목적이다. */
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const med = (a) => { const s = [...a].filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const pct = (a, b) => (b ? (a / b - 1) * 100 : 0);

/** 한 판에서 뽑는 지표 */
function digest(res) {
  const rows = res.rows;
  const at = (v) => rows[v - 1]?.assets ?? rows.at(-1)?.assets ?? 0;
  /* 항차 ROI — 매입액 대비 순이익. `check-voyage.mjs`와 같은 뜻이되 여기서는 **중앙값**만 본다. */
  const rois = rows.filter((r) => r.spend > 0).map((r) => (r.gain - r.spend) / r.spend);
  /* 고정비 — **규모에 비례해 붙는 것**(사람·보급·선체·무장·선단)에 시설 유지비를 더한 것.
     총지출은 거기에 화물 매입·수리·배·원료·가공비까지 더한 전부다. */
  const fixed = sum(rows.map((r) => r.wages + r.officerCost + r.supplies + r.fleetCost
                                  + r.hullCost + r.armsCost + (r.chainUpkeep ?? 0)));
  const total = fixed + sum(rows.map((r) => r.spend + r.shipSpend + r.repairSpend + r.hireSpend
                                          + r.insCost + (r.chainSpend ?? 0) - (r.chainUpkeep ?? 0)));
  return {
    n: rows.length, a30: at(30), a60: at(60), aEnd: rows.at(-1)?.assets ?? 0,
    roi: med(rois), fixedShare: total ? fixed / total : 0,
    firstWork: res.firstWork || Infinity, seized: res.seizedRuns || 0,
    works: Object.keys(res.works ?? {}).length,
    built: Object.values(res.works ?? {}).flatMap((m) => Object.keys(m).filter((k) => k.includes(':'))),
  };
}

const A = [], B = [];      // A 기준선 · B 사슬
const orig = Math.random;
for (let i = 0; i < N; i++) {
  const seed = 0x9e37 + i * 7919;
  const start = STARTS[i % STARTS.length];
  Math.random = seeded(seed);
  A.push(digest(runSim({ maxVoyages: V, chain: false, start })));
  Math.random = seeded(seed);
  B.push(digest(runSim({ maxVoyages: V, chain: 'basic', start })));
}
Math.random = orig;

const g = (arr, k) => med(arr.map((x) => x[k]));
/** ★ **짝지은 차이의 중앙값**이 정답이다. 두 중앙값을 나누면(median(B)/median(A)) 서로 다른
    판이 중앙에 오므로 짝짓기가 도로 풀린다 — 실제로 그 계산은 −14%를, 짝지은 차이는
    −0.0%를 냈다(사슬을 한 판도 안 지은 판이 절반을 넘기 때문이다). */
const pairDelta = (k) => med(A.map((a, i) => (a[k] ? pct(B[i][k], a[k]) : NaN)));
const pass = (d) => (Math.abs(d) <= 5 ? 'PASS' : Math.abs(d) <= 15 ? '경계' : '★ 벗어남');

console.log(`짝지어(paired) ${N}쌍 · ${V}항차 · 시작 부두 ${STARTS.length}곳 순환`);
console.log('  ※ 합격선(1단계) = 기준선 대비 **±5%** — 사슬만으로는 거의 안 남는 것이 정상이다.');
console.log('    위로 새면 새 수입원이고(§0-5), 아래로 ×0.85(−15%)를 밑돌면 그냥 벌금이다.\n');

const pad = (s, n) => String(s).padEnd(n, ' ');
console.log(pad('지표', 26) + pad('기준선 중앙', 14) + pad('사슬 중앙', 14) + pad('짝지은 차이', 12) + '판정');
for (const [name, k] of [['30항차 총자산', 'a30'], ['60항차 총자산', 'a60'], [`${V}항차 총자산`, 'aEnd']]) {
  const d = pairDelta(k);
  console.log(pad(name, 26) + pad(Math.round(g(A, k)).toLocaleString('en-US'), 14)
    + pad(Math.round(g(B, k)).toLocaleString('en-US'), 14)
    + pad(`${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, 12) + pass(d));
}

const roiA = g(A, 'roi'), roiB = g(B, 'roi');
console.log(pad('항차 ROI 중앙값', 26) + pad(`${(roiA * 100).toFixed(1)}%`, 14)
  + pad(`${(roiB * 100).toFixed(1)}%`, 14) + pad(`${((roiB - roiA) * 100).toFixed(1)}%p`, 12)
  + (roiB - roiA > 0.03 ? '★ 사슬이 항차 수익을 올린다' : ''));
console.log('  ※ ROI 절대값이 사료 밴드(8~13%)보다 높은 것은 **이 도구의 시작 부두 탓**이다 —');
console.log('    사슬이 닿는 여섯 바다에서 시작하므로 기본 시작지(부산포)보다 항로가 좋다.');
console.log('    판정은 언제나 **기준선 대비**로 한다(양쪽이 같은 부두에서 시작한다).');
const fA = g(A, 'fixedShare'), fB = g(B, 'fixedShare');
console.log(pad('고정비 ÷ 총지출', 26) + pad(`${(fA * 100).toFixed(1)}%`, 14)
  + pad(`${(fB * 100).toFixed(1)}%`, 14) + pad(`${((fB - fA) * 100).toFixed(1)}%p`, 12)
  + '(+8%p 목표는 2단계 이후 — 1단계는 참고값)');

/* ── 실제로 사슬을 쓴 판만 따로 ─────────────────────────────────
   ★ 이것이 이 도구의 진짜 숫자다. 사슬을 한 판도 안 지은 짝은 정의상 차이가 0이므로
     전체 중앙값에 섞으면 "아무 일도 안 일어났다"가 "합격"으로 읽힌다. */
const used = A.map((a, i) => ({ a, b: B[i] })).filter((p) => p.b.built.length);
if (used.length) {
  const d = med(used.map((p) => pct(p.b.aEnd, p.a.aEnd)));
  const d60 = med(used.map((p) => (p.a.a60 ? pct(p.b.a60, p.a.a60) : NaN)));
  console.log(`\n★ 사슬을 실제로 지은 ${used.length}쌍만: 60항차 ${d60 >= 0 ? '+' : ''}${d60.toFixed(1)}%`
    + ` · ${V}항차 ${d >= 0 ? '+' : ''}${d.toFixed(1)}%   ${pass(d)}`);
  const parked = med(used.map((p) => Object.values(p.b.spentByCity ?? {}).reduce((x, y) => x + y, 0)));
  void parked;
}

const done = (arr) => arr.filter((x) => x.n >= V).length;
const firsts = B.map((x) => x.firstWork).filter(Number.isFinite);
const builtAll = B.flatMap((x) => x.built);
const tally = {};
for (const k of builtAll) tally[k] = (tally[k] ?? 0) + 1;

console.log(`\n완주(${V}항차)      기준선 ${done(A)}/${N} · 사슬 ${done(B)}/${N}`);
console.log(`첫 가공장 항차     ${firsts.length ? `중앙값 ${med(firsts)}항차 (지은 판 ${firsts.length}/${N})` : '한 판도 안 지었다'}`
  + (firsts.length && med(firsts) < 12 ? '   ★ 12항차 이전이면 시설값이 싸다' : ''));
console.log(`시설 압류·휴업 판   ${B.filter((x) => x.seized > 0).length}/${N}`);
console.log(`세운 가공장        ${Object.keys(tally).length ? Object.entries(tally).map(([k, v]) => `${k} ×${v}`).join(' · ') : '없다'}`);
if (!builtAll.some((k) => k.endsWith(':scarlet'))) {
  console.log('  ※ 주홍 염색이 안 잡히는 것은 설계다 — 모직(플랑드르)과 코치닐(누에바에스파냐)이');
  console.log('    한 항구에 같이 있는 자리가 세계에 없어 **대서양을 한 번 건너야** 한다(§1-6).');
  console.log('    한 칸 앞만 보는 이 시뮬은 그 항로를 못 짠다 — 게임의 결함이 아니라 시뮬의 시야다.');
}
void CHAIN_BY_ID;
