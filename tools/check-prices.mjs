// check-prices.mjs — 물가·자산·유지비가 근거와 어긋나지 않았는지 본다
//
// 근거는 **카테고리마다 파일이 다르다**(섞어 두면 무엇을 고쳐야 할지 흐려진다):
//   content/goods-evidence.json   교역품 물가 · 화물 1칸의 실물 정의 · 대조 원칙
//   content/asset-evidence.json   선박가 · 부동산(집세·주택) · 임금 대비 배값
//   content/upkeep-evidence.json  선체·무장 유지비 · 적하보험 · 화물 유인
//   content/wage-evidence.json    임금(→ check-wages.mjs가 본다. 여기서는 배값 계산에만 쓴다)
//
// 코드 정본은 js/data.js: GOODS[].base·SHIPS[].price 와 js/state.js의 임금·유지비 상수다.
//
// 여기서 지키는 것은 **절대액이 아니라 비율**이다. 게임 화폐 ‘닢’은 실화폐가 아니므로
// 사료와 대조할 수 있는 축은 두 개뿐이다 — 곡물 대비 품목 가격, 그리고 임금 대비 자산 가격.
//
//   node tools/check-prices.mjs

import { readFileSync } from 'node:fs';
import { GOODS, GOOD_BY_ID, SHIPS, OFFICER, MARKET } from '../js/data.js';
import {
  CREW_WAGE, SUPPLY_UNIT, ARM_UPKEEP, HULL_UPKEEP, INSURANCE_RATE,
} from '../js/state.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../content/${f}`, import.meta.url), 'utf8'));
const GOODS_EV = read('goods-evidence.json');
const ASSET_EV = read('asset-evidence.json');
const UPKEEP_EV = read('upkeep-evidence.json');
const T = {
  ...GOODS_EV.gameTargets,
  ...ASSET_EV.gameTargets,
  upkeepLayers: UPKEEP_EV.upkeepLayers,
  cargoLure: UPKEEP_EV.cargoLure,
};

const problems = [];
const warn = (kind, msg) => problems.push({ kind, msg });

/* ── 1. 교역품 상대가격 (곡물 = 1) ────────────────────────── */
const grain = GOOD_BY_ID.grain.base;
const RATIO_TOL = 0.12;                 // 12%까지는 반올림·미세조정 여지로 둔다
const rows = [];

for (const g of GOODS) {
  const target = T.goodsRatioToGrain[g.id];
  const actual = g.base / grain;
  if (target == null) {
    warn('근거없음', `'${g.id}'(${g.name})의 목표 비율이 goods-evidence.json에 없다`);
    continue;
  }
  const off = Math.abs(actual - target) / target;
  rows.push({ id: g.id, name: g.name, base: g.base, actual, target, off });
  if (off > RATIO_TOL) {
    warn('비율어긋남', `${g.name}: 곡물의 ${actual.toFixed(2)}배 ≠ 목표 ${target}배 ` +
      `(base ${g.base} → ${Math.round(target * grain)} 근처여야 한다)`);
  }
}

/* 근거에만 있고 코드에 없는 유령 항목 */
for (const id of Object.keys(T.goodsRatioToGrain)) {
  if (id.startsWith('_')) continue;
  if (!GOOD_BY_ID[id]) warn('유령항목', `goods-evidence.json의 '${id}'가 GOODS에 없다`);
}

/* ── 2. 임금 사다리 ────────────────────────────────────────── */
const officerRatio = OFFICER.wage / CREW_WAGE;
// 임금 사다리의 목표는 wage-evidence.json이 갖는다(→ check-wages.mjs). 여기서는 읽기만.
const WAGE_T = read('wage-evidence.json').gameTargets || {};
for (const [key, actual, label] of [
  ['officerToCrew', officerRatio, '부관/선원'],
  ['supplyToWage', SUPPLY_UNIT / CREW_WAGE, '보급/일당'],
]) {
  const t = WAGE_T[key];
  if (!t) continue;
  if (Math.abs(actual - t.value) > t.tolerance) {
    warn('배율어긋남', `${label} ${actual.toFixed(2)}배 ≠ 목표 ${t.value}±${t.tolerance} (${t.basis})`);
  }
}

/* ── 3. 임금 대비 배값 — "선원 연봉으로 배를 몇 척 사나" ──────
   이 지표가 낮으면 배가 싼 게 아니라 **임금이 비싼** 것이다.
   부관 급여가 과하다는 지적이 실제로 여기서 드러났다(게임 11배 : 사료 30배). */
const crewYear = CREW_WAGE * 365;
const carrackRatio = SHIPS.carrack.price / crewYear;
{
  const t = T.shipToCrewYear;
  if (carrackRatio < t.min || carrackRatio > t.max) {
    warn('스케일어긋남', `캐랙 ÷ 선원연봉 = ${carrackRatio.toFixed(1)}배 — 목표 구간 ${t.min}~${t.max} 밖이다. ${t.note}`);
  }
}

/* ── 4. 유지비 갈래가 살아 있는가 ─────────────────────────── */
const L = T.upkeepLayers || {};
if (HULL_UPKEEP !== L.hullUpkeep?.value) {
  warn('불일치', `HULL_UPKEEP ${HULL_UPKEEP} ≠ 근거 ${L.hullUpkeep?.value}`);
}
if (INSURANCE_RATE !== L.insuranceRate?.value) {
  warn('불일치', `INSURANCE_RATE ${INSURANCE_RATE} ≠ 근거 ${L.insuranceRate?.value}`);
}
for (const k of ['light', 'medium', 'long']) {
  if (ARM_UPKEEP[k] !== L.armUpkeep?.[k]) {
    warn('불일치', `ARM_UPKEEP.${k} ${ARM_UPKEEP[k]} ≠ 근거 ${L.armUpkeep?.[k]}`);
  }
}
if (!(HULL_UPKEEP > 0) || !(INSURANCE_RATE > 0)) {
  warn('배선끊김', '선체 유지나 적하보험이 0이다 — 성장 브레이크가 통째로 빠진 상태다');
}

/* ── 결과 ────────────────────────────────────────────────── */
const worst = [...rows].sort((a, b) => b.off - a.off).slice(0, 3);
console.log(`교역품 ${rows.length}종 · 곡물 기준가 ${grain}닢 · 가장 비싼 품목은 곡물의 ` +
  `${Math.max(...rows.map((r) => r.actual)).toFixed(1)}배`);
console.log(`부관/선원 ${officerRatio.toFixed(2)}배 · 보급/일당 ${(SUPPLY_UNIT / CREW_WAGE).toFixed(2)}배 · ` +
  `캐랙/선원연봉 ${carrackRatio.toFixed(1)}배`);
console.log(`유지비: 선체 ×${HULL_UPKEEP} · 무장 ${ARM_UPKEEP.light}/${ARM_UPKEEP.medium}/${ARM_UPKEEP.long} · ` +
  `보험 요율×${INSURANCE_RATE} · 시장깊이 cap ${MARKET.cap}`);
console.log(`목표에서 가장 먼 품목: ` +
  worst.map((r) => `${r.name} ${(r.off * 100).toFixed(0)}%`).join(' · '));
console.log();

if (!problems.length) {
  console.log('PASS — 물가·임금·유지비가 근거와 일치한다.');
  process.exit(0);
}
for (const p of problems) console.log(`  [${p.kind}] ${p.msg}`);
console.log(`\nFAIL — ${problems.length}건. 수치를 고쳤다면 해당 카테고리의 근거 파일(goods/asset/upkeep-evidence.json)도 같은 커밋에서 고칠 것.`);
process.exit(1);
