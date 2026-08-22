// check-evidence.mjs — 수치와 근거가 어긋나지 않았는지 본다
//
// 도시 데이터는 세 겹이다:
//   ① js/regions/<권역>/geo.js    좌표·깃발·규모   (UI 도시)
//   ② js/regions/<권역>/trade.js  supply/demand    (도시 테이블)
//   ③ content/regions/<권역>-evidence.json  근거·출처   (근거 데이터 · 권역마다 파일이 다르다)
//
// 수치만 고치고 근거를 안 고치면 셋이 조용히 어긋난다. 그 순간
// "왜 이 값인지"를 아무도 모르게 되고, 다음 사람이 고증을 되돌려 놓는다.
// 이 스크립트가 그걸 막는다.
//
//   node tools/check-evidence.mjs

import { CITIES, GOOD_BY_ID, CITY_TARIFF } from '../js/data.js';
import { baseTariff } from '../js/state.js';
import { GEO_BY_ID, REGIONS } from '../js/map/geo.js';
import { CITY_EV, VERDICTS, ERA } from './evidence-load.mjs';

// 근거는 권역마다 파일이 다르다 — `tools/evidence-load.mjs`가 모아서 준다.
const EV = { cities: CITY_EV, verdicts: VERDICTS, era: ERA };

const problems = [];
const warn = (kind, where, msg) => problems.push({ kind, where, msg });

// 실패까지는 아니지만 손봐야 할 것 — 종료코드를 바꾸지 않는다.
const softs = [];
const soft = (kind, where, msg) => softs.push({ kind, where, msg });

/** '사료로 확인됨'·'고증조사로 바로잡음'은 **출처가 있다는 뜻의 라벨**이다.
    출처 없이 이 판정이 붙으면 다음 사람이 "검증된 값이구나" 하고 지나간다 —
    근거 계층을 만든 목적이 정확히 그것을 막는 것이라 실패로 다룬다.
    출처를 못 찾았으면 판정을 'probable'로 내리는 것이 정직한 처리다. */
const NEEDS_SOURCE = ['confirmed', 'corrected'];

/** basis는 "무엇을 근거로 이 값인가"가 한 문장으로 읽혀야 한다.
    스무 자짜리 조각글은 있으나 마나라 경고로 잡는다(실패는 아니다 —
    사료가 없다는 사실을 적은 짧은 basis도 유효하기 때문). */
const BASIS_MIN = 40;

/* ★★ 무엇을 실패로 다루는가 — **콘텐츠를 제약하지 않는 것**이 원칙이다.
   실패(exit 1)는 **코드와 근거가 어긋난 경우**로만 한정한다:
     · 값·방향이 다르다 (수치를 고치고 근거를 안 고쳤다)
     · 근거에만 있고 코드엔 없다 (유령)
     · '확인·바로잡음' 판정인데 출처가 없다 (라벨이 거짓말을 한다)
   **근거가 아직 없는 것은 경고다.** 도시·품목·선종을 늘리는 데 조사가 선행조건이면
   콘텐츠가 안 늘어난다 — 먼저 넣고 나중에 채우는 순서를 막지 않는다.
   금액은 근거에 충실하되, 근거가 콘텐츠를 덜어내는 쪽으로 작동하면 안 된다. */

let checked = 0, sourced = 0, gameplay = 0, tariffN = 0;
const byVerdict = {};

for (const city of CITIES) {
  const ev = EV.cities[city.id];
  if (!ev) {
    // 도시를 새로 넣었다 — 막지 않는다. 근거는 뒤따라오면 된다.
    soft('미조사', city.name, '이 도시가 아직 권역 근거 파일에 없다 — 굴려 본 뒤 채워라');
    continue;
  }

  // 깃발
  const geo = GEO_BY_ID[city.id];
  if (!ev.flag) soft('미조사', `${city.name} 깃발`, '깃발 근거가 아직 없다');
  else if (ev.flag.value !== geo.flag) {
    warn('불일치', `${city.name} 깃발`, `코드 '${geo.flag}' ≠ 근거 '${ev.flag.value}'`);
  }

  /* 입항세 — **항구별로 지정한 곳만** 근거를 요구한다.
     size 기본율로 굴러가는 도시는 적을 것이 없다(그게 '기본'이라는 뜻이다).
     반대로 근거에만 있고 코드에 없으면 유령이다 — 누가 CITY_TARIFF에서 지웠다는 뜻. */
  const tariffCode = CITY_TARIFF[city.id];
  const tariffEv = ev.tariff;
  if (tariffCode != null && !tariffEv) {
    /* ★ 이것은 **경고다**(실패가 아니다). 관세를 지정한 것은 *콘텐츠*이고 근거는 *뒤따르는 조사*다 —
       실패로 다루면 "항구를 늘리려면 먼저 그 항구의 관세 사료를 찾아야" 하고, 그것이 곧
       검증 스크립트가 콘텐츠를 억제하는 구조다(최상위 원칙이 금지한다).
       실패로 남는 것은 아래 둘 — **유령**(근거에만 있다)과 **불일치**(코드 ≠ 근거)다. */
    soft('무근거', `${city.name} 입항세`,
      `CITY_TARIFF에 ${(tariffCode * 100).toFixed(1)}%로 지정해 놓고 근거가 없다 — 굴려 본 뒤 채워라`);
  } else if (tariffCode == null && tariffEv) {
    warn('유령', `${city.name} 입항세`, '근거에는 있는데 CITY_TARIFF에 없다');
  } else if (tariffCode != null && tariffEv) {
    if (Math.abs(tariffEv.value - tariffCode) > 1e-9) {
      warn('불일치', `${city.name} 입항세`,
        `코드 ${(tariffCode * 100).toFixed(1)}% ≠ 근거 ${(tariffEv.value * 100).toFixed(1)}%`);
    }
    // 실제로 쓰이는 값과도 대조한다 — 배선이 끊기면 데이터만 맞고 게임은 기본율로 돈다
    if (Math.abs(baseTariff(city.id) - tariffCode) > 1e-9) {
      warn('배선끊김', `${city.name} 입항세`,
        `baseTariff()가 ${(baseTariff(city.id) * 100).toFixed(1)}%를 돌려준다 — CITY_TARIFF가 안 읽히고 있다`);
    }
    if (!EV.verdicts[tariffEv.verdict]) {
      warn('빈칸', `${city.name} 입항세`, `모르는 verdict '${tariffEv.verdict}'`);
    }
    if (NEEDS_SOURCE.includes(tariffEv.verdict) && !(tariffEv.sources?.length)) {
      warn('무출처', `${city.name} 입항세`,
        `'${EV.verdicts[tariffEv.verdict]}' 판정인데 출처가 없다`);
    }
    if ((tariffEv.basis || '').length < BASIS_MIN) {
      soft('짧은근거', `${city.name} 입항세`, `근거가 ${(tariffEv.basis || '').length}자뿐이다`);
    }
    tariffN++;
  }

  // 교역품
  const inCode = new Map();
  for (const [gid, v] of Object.entries(city.supply)) inCode.set(gid, { side: 'supply', value: v });
  for (const [gid, v] of Object.entries(city.demand)) inCode.set(gid, { side: 'demand', value: v });

  const goods = ev.goods || {};
  for (const [gid, code] of inCode) {
    checked++;
    const e = goods[gid];
    const name = GOOD_BY_ID[gid]?.name ?? gid;
    if (!e) {
      // 실패가 아니라 경고 — 새로 넣은 교역품은 먼저 굴려 보고 근거를 채워도 된다
      soft('미조사', `${city.name} · ${name}`,
        `${code.side} ${code.value} — 아직 근거가 없다. 굴려 본 뒤 권역 근거 파일에 채워라`);
      continue;
    }
    if (e.side !== code.side) {
      warn('불일치', `${city.name} · ${name}`, `코드 ${code.side} ≠ 근거 ${e.side}`);
    }
    if (Math.abs((e.value ?? -1) - code.value) > 1e-9) {
      warn('불일치', `${city.name} · ${name}`, `코드 ${code.value} ≠ 근거 ${e.value}`);
    }
    byVerdict[e.verdict] = (byVerdict[e.verdict] || 0) + 1;
    if (e.verdict === 'gameplay') gameplay++;
    if (e.sources?.length) sourced++;
    if (!e.basis) soft('빈칸', `${city.name} · ${name}`, 'basis(근거 서술)가 비어 있다');
    else if (e.basis.length < BASIS_MIN) {
      soft('짧은근거', `${city.name} · ${name}`, `basis ${e.basis.length}자 — ${BASIS_MIN}자 미만이라 근거 구실을 못 한다`);
    }
    if (e.verdict && !EV.verdicts[e.verdict]) {
      warn('빈칸', `${city.name} · ${name}`, `모르는 verdict '${e.verdict}'`);
    }
    if (NEEDS_SOURCE.includes(e.verdict) && !e.sources?.length) {
      warn('무출처', `${city.name} · ${name}`,
        `판정이 '${EV.verdicts[e.verdict] ?? e.verdict}'인데 sources가 비었다 — 출처를 달거나 판정을 'probable'로 내려라`);
    }
  }

  // 근거에만 있고 코드에 없는 항목 (수치를 지웠는데 근거가 남은 경우)
  for (const gid of Object.keys(goods)) {
    if (!inCode.has(gid)) {
      warn('유령', `${city.name} · ${GOOD_BY_ID[gid]?.name ?? gid}`, '근거에는 있는데 CITY_TRADE에 없다');
    }
  }
}

// 근거에만 있는 도시
for (const id of Object.keys(EV.cities)) {
  if (!CITIES.some((c) => c.id === id)) warn('유령', id, '근거에는 있는데 CITIES에 없다');
}

/* ── 출력 ─────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n=== 도시 근거 점검 (${EV.era.label}) ===`);
console.log(`도시 ${CITIES.length} · 교역 항목 ${checked} · 출처가 달린 항목 ${sourced} · 게임성 예외 ${gameplay}`);
console.log(`입항세: 기본율(size) ${CITIES.length - tariffN}곳 · 항구별 지정 ${tariffN}곳 — `
  + CITIES.filter((c) => CITY_TARIFF[c.id] != null)
      .map((c) => `${c.name} ${(baseTariff(c.id) * 100).toFixed(1)}%`).join(' · '));
console.log('판정 분포: ' + Object.entries(byVerdict)
  .map(([k, n]) => `${EV.verdicts[k] ?? k} ${n}`).join(' · '));

const show = (list) => {
  for (const p of list) console.log(`  [${pad(p.kind, 6)}] ${pad(p.where, 22)} ${p.msg}`);
};

if (softs.length) {
  console.log(`\n경고 ${softs.length}건 (실패는 아니다):`);
  show(softs);
}

if (!problems.length) {
  console.log(`\n문제 없음 — 수치와 근거가 맞물려 있다.${softs.length ? ' (경고는 위에)' : ''}\n`);
  process.exit(0);
}

console.log(`\n문제 ${problems.length}건:`);
show(problems);
console.log('');
// 근거 누락·불일치는 실패로 다룬다. 수치를 고쳤으면 근거도 같이 고쳐야 한다.
process.exit(1);
