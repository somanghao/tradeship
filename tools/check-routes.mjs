// check-routes.mjs — 항로 위험도와 근거가 어긋나지 않았는지 본다
//
// 항로 데이터는 세 겹이다:
//   ① js/map/geo.js: ROUTES        어디와 어디가 이어지는가
//   ② js/map/geo.js: ROUTE_RISK    그 항로의 보험료율(%)         ← 코드 정본
//   ③ content/route-evidence.json  판정·근거·출처               ← 근거 정본
//
// 요율만 고치고 근거를 안 고치면 "왜 이 값인지"를 아무도 모르게 되고,
// 다음 사람이 밸런스만 보고 고증을 되돌린다. 도시 특산품에서 이미 겪은 실패다.
//
//   node tools/check-routes.mjs

import { readFileSync } from 'node:fs';
import { ROUTES, ROUTE_RISK, riskKey } from '../js/map/geo.js';
import { CITY_BY_ID } from '../js/data.js';
import { encounterOdds, routeRisk } from '../js/state.js';

const EV = JSON.parse(readFileSync(new URL('../content/route-evidence.json', import.meta.url), 'utf8'));

const problems = [];
const warn = (kind, where, msg) => problems.push({ kind, where, msg });

const nameOf = (id) => CITY_BY_ID[id]?.name ?? id;
const byVerdict = {};
let sourced = 0, inland = 0;

/* ── 1. 모든 항로에 요율과 근거가 있는가 ─────────────────── */
for (const [a, b] of ROUTES) {
  const key = riskKey(a, b);
  const where = `${nameOf(a)}~${nameOf(b)}`;

  if (!(key in ROUTE_RISK)) {
    warn('요율없음', where, `ROUTE_RISK에 '${key}'가 없다 — 기본값으로 조용히 처리된다`);
  }
  const ev = EV.routes[key];
  if (!ev) {
    warn('근거없음', where, `route-evidence.json에 '${key}'가 없다`);
    continue;
  }
  const code = ROUTE_RISK[key];
  if (code !== ev.risk) {
    warn('불일치', where, `코드 ${code} ≠ 근거 ${ev.risk}`);
  }
  if (!ev.basis) warn('빈칸', where, 'basis(근거 서술)가 비어 있다');
  if (ev.verdict && !EV.verdicts[ev.verdict]) {
    warn('빈칸', where, `모르는 verdict '${ev.verdict}'`);
  }
  byVerdict[ev.verdict] = (byVerdict[ev.verdict] || 0) + 1;
  if (ev.sources?.length) sourced++;
  if (ev.risk === null) inland++;
}

/* ── 2. 근거에만 있고 항로에 없는 것 (항로를 지웠는데 근거가 남은 경우) ── */
const live = new Set(ROUTES.map(([a, b]) => riskKey(a, b)));
for (const key of Object.keys(EV.routes)) {
  if (!live.has(key)) warn('유령', key, '이 항로는 ROUTES에 없다 — 근거만 남아 있다');
}
for (const key of Object.keys(ROUTE_RISK)) {
  if (!live.has(key)) warn('유령', key, 'ROUTE_RISK에 있으나 ROUTES에 없다');
}

/* ── 3. 확률이 실제로 갈렸는가 ───────────────────────────
   근거를 다 채워 놓고 배선이 빠져 모든 항로가 같은 확률이면 이 작업 전체가 헛것이다. */
const odds = ROUTES.map(([a, b]) => ({
  where: `${nameOf(a)}~${nameOf(b)}`,
  risk: routeRisk(a, b),
  p: encounterOdds({ from: a, to: b }),
}));
const sea = odds.filter((o) => o.risk !== null);
const lo = Math.min(...sea.map((o) => o.p));
const hi = Math.max(...sea.map((o) => o.p));
const mean = sea.reduce((s, o) => s + o.p, 0) / sea.length;
if (hi - lo < 0.05) {
  warn('배선', '전체', `가장 안전한 항로와 위험한 항로의 차이가 ${((hi - lo) * 100).toFixed(1)}%p뿐이다 — 배선이 끊겼을 수 있다`);
}

/* ── 보고 ────────────────────────────────────────────────── */
console.log(`\n=== 항로 근거 점검 (${EV.era.label}) ===`);
console.log(`항로 ${ROUTES.length} · 출처가 달린 항로 ${sourced} · 해적 미적용(내해·육로) ${inland}`);
console.log('판정 분포: ' + Object.entries(byVerdict)
  .map(([k, v]) => `${EV.verdicts[k] ?? k} ${v}`).join(' · '));
console.log(`\n환산식: ${EV.formula.text}`);
console.log(`조우 확률: 최저 ${(lo * 100).toFixed(1)}% · 평균 ${(mean * 100).toFixed(1)}% · 최고 ${(hi * 100).toFixed(1)}%`);

const top = [...sea].sort((a, b) => b.p - a.p).slice(0, 5);
const bot = [...sea].sort((a, b) => a.p - b.p).slice(0, 3);
console.log('\n가장 위험한 항로');
for (const o of top) console.log(`  ${o.where.padEnd(22)} 요율 ${String(o.risk).padStart(4)}%  →  ${(o.p * 100).toFixed(1)}%`);
console.log('가장 안전한 항로');
for (const o of bot) console.log(`  ${o.where.padEnd(22)} 요율 ${String(o.risk).padStart(4)}%  →  ${(o.p * 100).toFixed(1)}%`);

if (!problems.length) {
  console.log('\n문제 없음 — 요율과 근거가 맞물려 있다.\n');
  process.exit(0);
}
console.log(`\n문제 ${problems.length}건`);
for (const p of problems) console.log(`  [${p.kind}] ${p.where}: ${p.msg}`);
process.exit(1);
