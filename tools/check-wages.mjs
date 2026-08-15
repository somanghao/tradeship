// check-wages.mjs — 보수 수치와 그 근거가 어긋나지 않았는지 본다
//
// 보수 데이터도 도시 특산품·항로 위험도와 같은 3계층이다:
//   ① js/data.js: OFFICER.wage / cut      부관이 받는 값        ← 코드 정본
//   ② js/state.js: CREW_WAGE / SUPPLY_UNIT 선원이 받는 값        ← 코드 정본
//   ③ content/wage-evidence.json           사료 배율·판정·출처   ← 근거 정본
//
// 급여만 고치고 근거를 안 고치면 대시보드 '보수' 탭이 조용히 거짓말을 한다
// (사료 대조 그래프가 옛 배율 위에 새 값을 찍는다).
//
//   node tools/check-wages.mjs

import { readFileSync } from 'node:fs';
import { OFFICER } from '../js/data.js';
import { CREW_WAGE, SUPPLY_UNIT } from '../js/state.js';

const EV = JSON.parse(readFileSync(new URL('../content/wage-evidence.json', import.meta.url), 'utf8'));

const problems = [];
const warn = (kind, msg) => problems.push({ kind, msg });

/* ── 1. 코드 값과 근거의 game 블록이 같은가 ──────────────── */
const pairs = [
  ['crewWage', CREW_WAGE, 'js/state.js: CREW_WAGE'],
  ['officerWage', OFFICER.wage, 'js/data.js: OFFICER.wage'],
  ['officerCut', OFFICER.cut, 'js/data.js: OFFICER.cut'],
  ['supplyUnit', SUPPLY_UNIT, 'js/state.js: SUPPLY_UNIT'],
];
for (const [key, code, where] of pairs) {
  const ev = EV.game?.[key];
  if (ev == null) warn('근거없음', `wage-evidence.json의 game.${key}가 없다 (${where} = ${code})`);
  else if (Math.abs(ev - code) > 1e-9) {
    warn('불일치', `game.${key}: 근거 ${ev} ≠ 코드 ${code} (${where})`);
  }
}

/* ── 2. 배율은 파생값이다 — 손으로 적어 둔 값이 굳지 않았는가 ── */
const ratio = OFFICER.wage / CREW_WAGE;
if (Math.abs((EV.game?.ratio ?? 0) - ratio) > 0.02) {
  warn('불일치', `game.ratio: 근거 ${EV.game?.ratio} ≠ 코드에서 파생한 ${ratio.toFixed(2)} ` +
    `(${OFFICER.wage} ÷ ${CREW_WAGE})`);
}

/* ── 3. 앵커·발견 항목이 형식을 갖췄는가 ─────────────────── */
const VERDICTS = Object.keys(EV.verdicts ?? {});
const byVerdict = {};
let sourced = 0;

for (const a of EV.anchors ?? []) {
  if (!Array.isArray(a.ratio) || a.ratio.length !== 2 || a.ratio[0] > a.ratio[1]) {
    warn('형식', `앵커 '${a.id}'의 ratio가 [최소, 최대]가 아니다`);
  }
  if (!VERDICTS.includes(a.verdict)) warn('형식', `앵커 '${a.id}'의 verdict '${a.verdict}'가 정의에 없다`);
  if (!a.basis) warn('형식', `앵커 '${a.id}'에 basis가 없다`);
  if (a.sources?.length) sourced++;
  byVerdict[a.verdict] = (byVerdict[a.verdict] || 0) + 1;
}
if (!(EV.anchors ?? []).length) warn('형식', '앵커가 하나도 없다 — 대조할 사료가 없으면 대시보드가 빈 축을 그린다');

for (const f of EV.findings ?? []) {
  if (!VERDICTS.includes(f.verdict)) warn('형식', `발견 '${f.id}'의 verdict '${f.verdict}'가 정의에 없다`);
  if (!f.basis) warn('형식', `발견 '${f.id}'에 basis가 없다`);
  byVerdict[f.verdict] = (byVerdict[f.verdict] || 0) + 1;
}

/* ── 4. 게임 배율이 어느 앵커에 서 있는가 (경고 아님, 보고) ── */
const inside = (EV.anchors ?? []).filter((a) => ratio >= a.ratio[0] - 0.3 && ratio <= a.ratio[1] + 0.3);
const nearest = (EV.anchors ?? [])
  .map((a) => ({ a, d: Math.min(Math.abs(ratio - a.ratio[0]), Math.abs(ratio - a.ratio[1])) }))
  .sort((p, q) => p.d - q.d)[0];

/* ── 결과 ────────────────────────────────────────────────── */
console.log(`부관 급여 ${OFFICER.wage}닢/일 · 선원 ${CREW_WAGE}닢/일 → 배율 ×${ratio.toFixed(2)} · 성과급 ${(OFFICER.cut * 100).toFixed(0)}%`);
console.log(`근거 항목 ${(EV.anchors ?? []).length}앵커 + ${(EV.findings ?? []).length}발견 ` +
  `(${Object.entries(byVerdict).map(([k, v]) => `${k} ${v}`).join(' · ')}) · 출처 있는 앵커 ${sourced}건`);
if (nearest) {
  console.log(inside.length
    ? `게임 배율은 '${inside[0].label}' 구간 안에 있다`
    : `게임 배율에 가장 가까운 사료는 '${nearest.a.label}' (거리 ${nearest.d.toFixed(2)}배)`);
}
console.log();

if (!problems.length) {
  console.log('PASS — 코드와 근거가 일치한다.');
  process.exit(0);
}
for (const p of problems) console.log(`  [${p.kind}] ${p.msg}`);
console.log(`\nFAIL — ${problems.length}건. 수치를 고쳤다면 content/wage-evidence.json도 같은 커밋에서 고칠 것.`);
process.exit(1);
