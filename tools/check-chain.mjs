// check-chain.mjs — 가공 사슬이 스스로 모순되지 않는가 (수직계열화 A-9)
//
//   node tools/check-chain.mjs
//
// 사양 정본은 `.claude/docs/SPEC-vertical.md` §6-4. 코드 정본은 `js/data.js: CHAIN·WORK`.
//
// ★ **실패와 경고의 선을 지킨다**(최상위 지침). 이 저장소에서 exit 1은
//   *코드와 근거가 어긋남* 또는 *규칙이 자기모순*일 때뿐이다:
//
//     실패 ① 투입·산출 품목이 `GOODS`에 없다            ← 유령 규칙
//          ② 가공마진이 밴드 [1.08, 1.25] 밖이다        ← 규칙이 자기모순
//          ③ 사슬 그래프에 순환이 있다 (A→B→A)          ← 규칙이 자기모순
//          ④ 그 가공장을 지을 수 있는 도시가 하나도 없다  ← 죽은 규칙
//     경고 ②-b 사슬 조달가 ÷ 최저 산지 시세가 [0.95, 1.10] 밖이다
//          ⑥  새 가공품이 `content/goods-evidence.json`에 없다
//          ⑦  가공품의 산지가 0이거나 수요지가 3 미만이다
//
// ── ②가 왜 **실패**인가 ────────────────────────────────────────
// 밴드는 이 시스템의 존재 조건이다. 아래로 벗어나면 가공비 10%에 먹혀 **어떤 조건에서도
// 손해**라 시설이 죽고, 위로 벗어나면 *"원료를 시세로 사서 가공해도 남는"* 구간이 열려
// **수직계열화가 새 수입원**이 된다 — `HEGEMONY` 주석이 금한 바로 그 자리다.
// 근거가 없어서 실패시키는 것이 아니라 **값끼리 어긋나서** 실패시키는 것이다.

import { readFileSync } from 'node:fs';
import { CHAIN, GOOD_BY_ID, CITIES, SPREAD, WORK, WORKS } from '../js/data.js';
import { chainMargin, chainOut, chainOutValue, chainInUnits, chainOutUnits, millPrice } from '../js/state.js';

const problems = [];
const softs = [];
const bad = (kind, msg) => problems.push({ kind, msg });
const soft = (kind, msg) => softs.push({ kind, msg });

const GOODS_EV = JSON.parse(readFileSync(new URL('../content/goods-evidence.json', import.meta.url), 'utf8'));
let CHAIN_EV = null;
try {
  CHAIN_EV = JSON.parse(readFileSync(new URL('../content/chain-evidence.json', import.meta.url), 'utf8'));
} catch { /* 근거가 아직 없는 것은 경고 대상이지 실패가 아니다 */ }

/* 그 품목의 산지/수요지 목록. 배율이 작을수록 싼 산지다. */
const supplyOf = (gid) => CITIES.filter((c) => c.supply?.[gid] != null)
  .map((c) => ({ id: c.id, name: c.name, mul: c.supply[gid], industry: c.industry }))
  .sort((a, b) => a.mul - b.mul);
const demandOf = (gid) => CITIES.filter((c) => c.demand?.[gid] != null)
  .map((c) => ({ id: c.id, name: c.name, mul: c.demand[gid] }))
  .sort((a, b) => b.mul - a.mul);

/** 배율이 걸린 그 항구의 시세 — `state.js: priceOf`의 흔들림 없는 뼈대다 */
const priceAt = (gid, mul) => GOOD_BY_ID[gid].base * (1 + (mul - 1) * SPREAD);
/** 그 품목을 세계에서 가장 싸게 살 수 있는 값 (산지가 없으면 기준가) */
const cheapest = (gid) => {
  const s = supplyOf(gid);
  return s.length ? priceAt(gid, s[0].mul) : GOOD_BY_ID[gid].base;
};

console.log(`가공 사슬 ${CHAIN.length}갈래 · 밴드 [${WORK.marginMin}, ${WORK.marginMax}] · 가공비 ${Math.round(WORK.feeRate * 100)}%\n`);

const rows = [];
for (const r of CHAIN) {
  /* ── ① 유령 품목 ─────────────────────────────────────────── */
  let ghost = false;
  for (const [gid] of [...Object.entries(r.in), ...Object.entries(r.out)]) {
    if (!GOOD_BY_ID[gid]) { bad('유령품목', `${r.id}: '${gid}'가 GOODS에 없다`); ghost = true; }
  }
  if (ghost) continue;

  /* ── ② 가공마진 밴드 ─────────────────────────────────────── */
  const margin = chainMargin(r);
  if (margin < WORK.marginMin || margin > WORK.marginMax) {
    bad('밴드이탈', `${r.name}(${r.id}): 마진 ${margin.toFixed(3)} — 밴드 [${WORK.marginMin}, ${WORK.marginMax}] 밖이다. `
      + (margin < WORK.marginMin
        ? '가공비에 먹혀 어떤 조건에서도 손해다 — 시설이 죽는다.'
        : '원료를 시세로 사서 가공해도 남는 구간이 생긴다 — 새 수입원이 된다.'));
  }

  /* ── ②-b 사슬 조달가 vs 최저 산지 시세 ─────────────────────
     "사슬은 시세보다 비싸다"(§0-2)가 지금도 참인지 **가장 사슬에 유리한 가정**으로 본다 —
     투입은 세계 최저 산지가로 사고, 그 대신 가공비만 문다.
     실제로는 한 항구에서 그 값을 다 만날 수 없고(§1-6) 대량거래 벌점이 투입 비율만큼
     더 쌓이므로(방어 ②), 이 값은 **하한**이다. */
  let supplyCost = 0;
  for (const [gid, n] of Object.entries(r.in)) supplyCost += cheapest(gid) * n;
  const fee = chainOutValue(r) * WORK.feeRate;
  const perUnit = (supplyCost + fee) / chainOutUnits(r);
  const outId = chainOut(r);
  const src = supplyOf(outId);
  const buyAt = src.length ? priceAt(outId, src[0].mul) : null;
  const ratio = buyAt ? perUnit / buyAt : null;
  if (ratio != null && (ratio < 0.95 || ratio > 1.10)) {
    soft('대조식', `${r.name}: 사슬 조달가 ${perUnit.toFixed(1)}닢 ÷ 최저 산지 시세 ${buyAt.toFixed(1)}닢`
      + ` = ${ratio.toFixed(3)} — 목표 [0.95, 1.10] 밖이다.`
      + (ratio < 0.95 ? ' 산지 배율이 얕거나(비싸거나) 마진이 높다 — 사슬이 공짜 차익에 가깝다.'
                      : ' 사슬이 지나치게 불리해 아무도 짓지 않는다.'));
  }

  /* ── ④ 지을 수 있는 도시가 있나 ───────────────────────────── */
  const sites = CITIES.filter((c) => c.industry >= r.req);
  if (!sites.length) {
    bad('죽은사슬', `${r.name}: 공업력 ${r.req} 이상인 도시가 하나도 없다 — 이 사슬은 규칙만 있고 자리가 없다`);
  }
  /* 그 항구에서 **투입을 다 살 수 있는** 자리 — 없어도 사슬은 성립한다(원료를 실어 오면 된다).
     다만 하나도 없으면 그 사슬은 항로 없이는 시작조차 못 하므로 세어서 보여 준다. */
  const oneStop = sites.filter((c) =>
    Object.keys(r.in).every((gid) => c.supply?.[gid] != null || c.demand?.[gid] != null));

  /* ── ⑦ 가공품의 산지·수요지 ──────────────────────────────── */
  const dem = demandOf(outId);
  if (!src.length) soft('죽은칸', `${GOOD_BY_ID[outId].name}: 산지가 0곳이다 — 수요만 있으면 그 칸은 아예 죽는다`);
  if (dem.length < 3) soft('얕은수요', `${GOOD_BY_ID[outId].name}: 수요지가 ${dem.length}곳뿐이다 (4~8곳이 목표)`);

  /* ── ⑥ 근거 ──────────────────────────────────────────────── */
  if (!CHAIN_EV?.chains?.[r.id]) soft('미조사', `${r.id}: content/chain-evidence.json에 근거가 없다`);
  for (const gid of Object.keys(r.out)) {
    if (GOODS_EV.gameTargets?.goodsRatioToGrain?.[gid] == null) {
      soft('미조사', `${GOOD_BY_ID[gid].name}(${gid}): goods-evidence.json의 목표 비율에 없다`);
    }
  }

  rows.push({
    name: r.name, work: r.work, margin, req: r.req,
    price: millPrice(r.id, sites[0]?.id ?? CITIES[0].id, 1),
    perUnit, buyAt, ratio, sites: sites.length, oneStop: oneStop.length,
    src: src.length, dem: dem.length,
    inU: chainInUnits(r), outU: chainOutUnits(r),
  });
}

/* ── ③ 순환 사슬 ─────────────────────────────────────────────
   A의 산출이 B의 투입이고 B의 산출이 다시 A의 투입이면 **무에서 값이 나온다.**
   지금 이 저장소에서 원면 → 면포 → 사라사가 2단으로 물려 있으므로 실제로 걸릴 수 있는 검사다. */
const edges = new Map();      // 산출 품목 → 그 사슬이 먹는 투입 품목들
for (const r of CHAIN) {
  for (const o of Object.keys(r.out)) {
    const set = edges.get(o) ?? new Set();
    for (const i of Object.keys(r.in)) set.add(i);
    edges.set(o, set);
  }
}
const state0 = new Map();     // 0 안 봄 · 1 보는 중 · 2 끝
function walk(node, trail) {
  if (state0.get(node) === 1) {
    bad('순환사슬', `${[...trail, node].map((g) => GOOD_BY_ID[g]?.name ?? g).join(' → ')} — 사슬이 스스로를 먹는다`);
    return;
  }
  if (state0.get(node) === 2) return;
  state0.set(node, 1);
  for (const nxt of edges.get(node) ?? []) walk(nxt, [...trail, node]);
  state0.set(node, 2);
}
for (const node of edges.keys()) walk(node, []);

/* ── 보고 ────────────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n, ' ');
console.log(pad('사슬', 10) + pad('시설', 16) + pad('비율', 8) + pad('마진', 8)
          + pad('값', 10) + pad('조달가', 9) + pad('산지가', 9) + pad('대조식', 8) + '자리');
for (const r of rows) {
  console.log(pad(r.name, 10) + pad(r.work, 16) + pad(`${r.inU}:${r.outU}`, 8)
    + pad(r.margin.toFixed(3), 8) + pad(r.price.toLocaleString('en-US'), 10)
    + pad(r.perUnit.toFixed(1), 9) + pad(r.buyAt ? r.buyAt.toFixed(1) : '—', 9)
    + pad(r.ratio ? r.ratio.toFixed(3) : '—', 8)
    + `공업력 ${r.req} ${r.sites}곳 (원료까지 있는 곳 ${r.oneStop}) · 산지 ${r.src} · 수요 ${r.dem}`);
}

if (softs.length) {
  console.log(`\n경고 ${softs.length}건 (실패는 아니다 — 콘텐츠를 막지 않는다):`);
  for (const s of softs) console.log(`  [${s.kind}] ${s.msg}`);
}
if (problems.length) {
  console.log(`\n★ 실패 ${problems.length}건 — 규칙이 자기모순이다:`);
  for (const p of problems) console.log(`  [${p.kind}] ${p.msg}`);
  process.exitCode = 1;
} else {
  console.log('\nPASS — 사슬이 밴드 안이고 순환이 없으며 지을 자리가 있다. (경고는 위에)');
}
