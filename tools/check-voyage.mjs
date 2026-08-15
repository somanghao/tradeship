// check-voyage.mjs — 항차 수익의 **분포 모양**이 사료와 어긋나지 않았는지 본다
//
// 다른 검증기들과 결이 다르다. check-prices·check-wages는 코드에 박힌 상수를
// 근거와 대조하지만, 여기서 재는 것은 상수가 아니라 **시뮬을 돌려야 나오는 분포**다.
//   · 항차 ROI 중앙값 — 한 항차가 보통 얼마를 버나
//   · 꼬리 비율(p90 ÷ 중앙값) — 대박이 전형값의 몇 배인가
//   · 화물을 잃는 사건의 빈도 — 보험이 무는 일이 몇 항차에 한 번인가
//   · 톤/승조원 — 선종의 정체성이 살아 있는가
//
// ★ ROI는 경제가 아니라 **얼마나 가려 싣느냐**가 정한다. `planFor`의 minMargin이
//   0이면(총이익 최대화) 마지막 칸의 마진이 0이라 중앙값이 구조적으로 눌린다.
//   그래서 근거 파일이 정한 minMargin에서만 판정한다 — 이 단서 없이 "중앙값이 낮다"고
//   MARKET을 건드리면 중앙값은 1%p 오르고 후반 자산만 3배로 부푼다(실측).
//
// ★ 시드를 고정해 여러 판을 평균한다. 한 판만 돌리면 어느 항로를 탔느냐가 통째로 운이라
//   같은 코드에서 실효 조우율이 10%대와 20%대를 오간다(sim-risk.mjs의 같은 교훈).
//
// ★★ 무엇을 실패로 다루는가 — **콘텐츠를 제약하지 않는 것**이 이 파일의 설계 원칙이다.
//   실패(exit 1)는 **규칙이 자기모순인 경우**로만 한정한다:
//     · 보험료를 걷는데 보상하는 사건이 없다 (그건 보험이 아니라 세금이다)
//     · 해적을 뺀 구간에 아무 위험도 없다 (공짜 항로가 된다)
//     · 대박을 사건에 붙이기로 해 놓고 배선이 끊겨 있다
//   분포 밴드(ROI 중앙값·꼬리비·톤당승조원)는 **경고**다. 도시·품목·선종을 늘리면
//   분포는 당연히 흔들리는데, 그걸 실패로 잡으면 검사기가 콘텐츠를 억제하는 장치가 된다.
//   수치는 근거에 충실하되, 콘텐츠를 덜어내는 방향으로는 쓰지 않는다(프로젝트 최상위 지침).
//   선종을 일부러 밴드 밖에 두려면 근거 파일의 `tonsPerCrewMin.gameplay`에 이유와 함께 적는다.
//
//   node tools/check-voyage.mjs [항차수] [시드수]

import { readFileSync } from 'node:fs';
import { runSim } from './sim-core.mjs';
import { SHIPS, SEA_EVENTS, INLAND_ODDS } from '../js/data.js';
import {
  jettisonOdds, isInland, INSURANCE_COVER, INSURANCE_RATE,
  state, resetGame, pickEnemy,
} from '../js/state.js';

const EV = JSON.parse(readFileSync(new URL('../content/voyage-evidence.json', import.meta.url), 'utf8'));
const T = EV.gameTargets;

const N = +(process.argv[2] || 90);
const SEEDS = +(process.argv[3] || 24);

const problems = [];
const softs = [];
const fail = (where, msg) => problems.push({ where, msg });
const warn = (where, msg) => softs.push({ where, msg });

function withSeed(seed, fn) {
  const orig = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = orig; }
}

const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const band = (v, [lo, hi]) => v >= lo && v <= hi;

/* ── 1. ROI 분포 ─────────────────────────────────────────── */
const minMargin = T.voyageRoiMedian.measuredAtMinMargin ?? 0;
const rois = [];
const legs = new Map();
let voyages = 0;

for (let i = 0; i < SEEDS; i++) {
  withSeed((1013904223 + i * 2654435761) >>> 0, () => runSim({
    maxVoyages: N,
    minMargin,
    hooks: {
      onVoyage: (r) => {
        voyages++;
        const cost = r.wages + r.supplies + r.fleetCost + r.hullCost + r.armsCost + r.insCost + r.officerCost;
        const inv = r.spend + cost;
        if (inv > 0) rois.push((r.gain - inv) / inv);
        const k = [r.from, r.to].sort().join('|');
        legs.set(k, (legs.get(k) || 0) + 1);
      },
    },
  }));
}

const med = q(rois, 0.5);
const p90 = q(rois, 0.9);
const tail = p90 / med;
const negShare = rois.filter((x) => x < 0).length / rois.length;

// 밴드 이탈은 경고다 — 콘텐츠를 늘리면 분포가 흔들리는 것이 정상이다
if (!band(med, T.voyageRoiMedian.value)) {
  warn('항차 ROI 중앙값', `${pct(med)} — 참고 밴드 ${T.voyageRoiMedian.value.map((v) => pct(v, 0)).join('~')}`
    + ` (minMargin ${minMargin}에서 측정). 도시·품목을 늘렸다면 자연스러운 이동이다.`);
}
if (!band(tail, T.voyageRoiTailRatio.value)) {
  warn('꼬리 비율 p90/중앙', `${tail.toFixed(2)}배 — 참고 밴드 ${T.voyageRoiTailRatio.value.join('~')}배`);
}

/* ── 2. 화물을 잃는 사건의 빈도 ───────────────────────────── */
const STORM = SEA_EVENTS.find((e) => e.id === 'storm').weight / 100;
const BANDIT_SHARE = 0.45;      // 뭍의 사고 중 강도의 몫(나머지 통행세는 화물을 안 뺏는다)

let trips = 0, jetW = 0, banditW = 0, inlandTrips = 0;
for (const [k, n] of legs) {
  const [a, b] = k.split('|');
  trips += n;
  if (isInland(a, b)) { inlandTrips += n; banditW += INLAND_ODDS * BANDIT_SHARE * n; }
  else jetW += STORM * jettisonOdds({ from: a, to: b }) * n;
}
const lossRate = (jetW + banditW) / trips;
const perVoyages = lossRate > 0 ? 1 / lossRate : Infinity;

if (!band(perVoyages, T.lossEventPerVoyages.value)) {
  warn('화물 손실 사건', `${perVoyages.toFixed(0)}항차에 1건 — 참고 밴드 ${T.lossEventPerVoyages.value.join('~')}항차.`
    + ' 항로를 늘렸다면 교통량 구성이 바뀐 것이다.');
}

/* ── 3. 보험이 실제로 보상하는가 ──────────────────────────── */
if (T.insurancePaysOut?.value && !(INSURANCE_COVER > 0)) {
  fail('보험', '보험료를 걷으면서 보상하는 사건이 없다 — 그것은 보험이 아니라 세금이다');
}
if (INSURANCE_COVER > INSURANCE_RATE + 1e-9) {
  warn('보험', `보상률(${INSURANCE_COVER})이 요율 계수(${INSURANCE_RATE})보다 크다 — 보험이 공짜 이익이 된다`);
}

/* ── 4. 내해가 무위험으로 남아 있지 않은가 ────────────────── */
if (!(INLAND_ODDS > 0)) {
  fail('내해·육로', '해적을 뺀 구간에 아무 위험도 없다 — 안쪽 시장이 공짜 항로가 된다');
}

/* ── 5. 대박이 사건에서 나오는가 ──────────────────────────── */
if (T.windfallIsEventDriven?.value) {
  const src = readFileSync(new URL('../js/world.js', import.meta.url), 'utf8');
  if (!/addShock\(/.test(src)) {
    fail('시장 충격', 'world.js가 addShock을 부르지 않는다 — 대박이 노이즈에서만 나온다');
  }
}

/* ── 5-2. 사건 밀도가 세계 크기를 따라가는가 ────────────────
   `SHOCK.events[].perDay`는 **세계 전체**의 하루 발생 건수다. 도시를 늘리면 한 도시가
   사건을 겪는 주기가 그만큼 길어져, "대박은 사건에서 나온다"가 배선은 살아 있는 채로
   사실상 죽는다(16 → 175항구에서 도시당 20개월 → 216개월). 그래서 밀도 환산을 강제한다. */
if (T.shockDensityPerCity?.value) {
  const src = readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
  if (!/densityBase/.test(src)) {
    fail('시장 충격 밀도', 'rollShockEvents가 도시 수로 환산하지 않는다 — 바다를 넓힐수록 사건이 닿지 않는 곳에서만 일어난다');
  }
}

/* ── 5-3. 전리품이 성장 사다리를 건너뛰지 않는가 ─────────────
   전리품은 **진 자의 크기**로 정해지는데 뜻은 **이긴 자의 크기**로 읽힌다.
   상한이 없으면 세기 1 좀도둑 하나가 시작 자산의 다섯 배가 되어 초반이 통째로 사라진다. */
if (T.spoilsVsAssets) {
  const world = readFileSync(new URL('../js/world.js', import.meta.url), 'utf8');
  if (!/capLoot/.test(world)) {
    fail('전리품 상한', 'world.js: pirateEnemy가 capLoot을 통과하지 않는다 — 명부 해적만 상한 밖이 된다');
  }
  resetGame();                       // 출항 전 시작 상태에서 잰다
  const assets = state.gold;
  let sum = 0;
  const ROLLS = 400;
  withSeed(20260816, () => {
    for (let i = 0; i < ROLLS; i++) {
      const [lo, hi] = pickEnemy().loot.gold;
      sum += (lo + hi) / 2;
    }
  });
  const share = sum / ROLLS / assets;
  if (!band(share, T.spoilsVsAssets.value)) {
    warn('전리품 vs 자산', `시작 상태에서 한 판의 노획 금화가 자산의 ${pct(share, 0)}`
      + ` — 참고 밴드 ${T.spoilsVsAssets.value.map((v) => pct(v, 0)).join('~')}.`
      + ' 위로 벗어나면 전투 한 판이 다음 배를 사 버리고, 아래면 싸울 이유가 없다(도주 비용 34%).');
  }
  var spoilsShare = share;           // 출력용
}

/* ── 6. 톤/승조원 — 선종의 정체성 ─────────────────────────── */
const tpc = [];
const exempt = T.tonsPerCrewMin.gameplay ?? {};
for (const [key, target] of Object.entries(T.tonsPerCrewMin.target)) {
  const sh = SHIPS[key];
  if (!sh) { warn('톤/승조원', `근거에 있는 '${key}'가 SHIPS에 없다 — 선종을 지웠으면 근거도 지운다`); continue; }
  const v = sh.cargo / sh.crewMin;
  const why = exempt[key];
  tpc.push({ key, name: sh.name, v, target, why });
  if (!band(v, target) && !why) {
    // 실패가 아니라 경고 — 선종을 일부러 그렇게 두는 것도 설계다.
    // 의도한 것이면 근거 파일 tonsPerCrewMin.gameplay에 이유를 적으면 이 줄이 사라진다.
    warn(`톤/승조원 · ${sh.name}`, `${v.toFixed(1)} — 참고 밴드 ${target.join('~')}`
      + ` (cargo ${sh.cargo} ÷ crewMin ${sh.crewMin}). 의도한 것이면 근거의 gameplay에 이유를 적어라.`);
  }
}
// 근거에 없는 선종은 문제가 아니다 — 선종을 늘리는 데 근거 파일이 걸림돌이 되면 안 된다.
const uncovered = Object.entries(SHIPS)
  .filter(([k, sh]) => sh.crewMin && !T.tonsPerCrewMin.target[k]).map(([, sh]) => sh.name);

/* ── 출력 ────────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n=== 항차 수익 점검 (${EV.era.label}) ===`);
console.log(`시드 ${SEEDS} × ${N}항차 = ${voyages}항차 · minMargin ${minMargin} (가려 싣는 정도)`);
console.log('');
console.log(`  항차 ROI 중앙값     ${pad(pct(med), 8)} 목표 ${T.voyageRoiMedian.value.map((v) => pct(v, 0)).join('~')}`);
console.log(`  p90                ${pad(pct(p90), 8)}`);
console.log(`  꼬리 p90/중앙       ${pad(tail.toFixed(2) + '배', 8)} 목표 ${T.voyageRoiTailRatio.value.join('~')}배`);
console.log(`  적자 항차           ${pct(negShare)}`);
console.log(`  화물 손실 사건       ${pad(perVoyages.toFixed(0) + '항차', 8)} 목표 ${T.lossEventPerVoyages.value.join('~')}항차에 1건`);
console.log(`  내해·육로 통과       ${pct(inlandTrips / trips, 0)} (뭍의 사고 ${pct(INLAND_ODDS, 0)})`);
console.log(`  보험 보상률          ${pct(INSURANCE_COVER, 0)} (요율 계수 ${pct(INSURANCE_RATE, 0)})`);
if (typeof spoilsShare === 'number') {
  console.log(`  전리품 vs 자산       ${pad(pct(spoilsShare, 0), 8)} 목표 ${T.spoilsVsAssets.value.map((v) => pct(v, 0)).join('~')}`
    + ' (시작 상태 · 나포선 제외)');
}
console.log('\n  톤/승조원 1인 — 선종의 정체성');
for (const t of tpc) {
  console.log(`    ${pad(t.name, 12)} ${pad(t.v.toFixed(1), 6)} 참고 ${pad(t.target.join('~'), 8)}`
    + (t.why ? ` ▲ ${t.why}` : ''));
}
if (uncovered.length) {
  console.log(`    ${pad('(밴드 없음)', 12)} ${uncovered.join(' · ')}`);
  console.log(`    ${' '.repeat(12)} 근거에 밴드가 없는 선종이다 — 문제가 아니다. 사료 대조가 필요해지면 그때 적는다.`);
}

if (softs.length) {
  console.log(`\n경고 ${softs.length}건 (실패는 아니다):`);
  for (const p of softs) console.log(`  [${pad(p.where, 18)}] ${p.msg}`);
}

if (!problems.length) {
  console.log('\n문제 없음 — 항차 수익의 분포가 사료와 맞물려 있다.\n');
  process.exit(0);
}

console.log(`\n문제 ${problems.length}건:`);
for (const p of problems) console.log(`  [${pad(p.where, 18)}] ${p.msg}`);
console.log('');
process.exit(1);
