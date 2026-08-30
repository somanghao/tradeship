// check-mates.mjs — 동료(항해사) 명부가 세계·규칙·근거와 맞물리는가
//
//   node tools/check-mates.mjs
//
// ★ **실패와 경고를 가른다**(claude-memory.md 절대 원칙).
//   실패(exit 1) = **코드와 세계/근거가 어긋난 것 · 규칙이 자기모순인 것** —
//                  유령 항구·유령 권역·id 중복·근거와 값 불일치·유령 근거·
//                  **규칙이 조용히 무시하는 특전 키**·없는 role·cut을 가진 기능직.
//   경고        = 미조사(근거 없음·출처 빈칸)와 밴드 이탈.
//                 ⚠️ **「근거 없음」으로 실패시키면 동료를 하나 늘리려 조사부터 끝내야 하는
//                 구조가 된다.** 콘텐츠는 풍부해야 하고 근거는 뒤따른다.
//
// ── 이 검사기가 지키는 것 (그리고 왜) ──────────────────────────
//  ① **조용한 실패 셋.** 이 데이터는 셋 다 소리를 안 낸다:
//     · `at`이 없는 항구면 그 사람은 **어디에서도 안 나타난다**(`matesAt`가 빈손을 돌려준다).
//     · `perks`에 목록 밖 키를 적으면 **규칙이 그냥 무시한다**(`matePerk`가 그 키를 안 본다).
//     · id가 겹치면 뒤엣것이 앞엣것을 덮는다.
//     화면도 검사도 아무 말을 안 하므로 **여기서 소리를 내게 한다.**
//  ② **배선.** `regions/index.js: ALL_MATES`에 실려야 게임이 그 사람을 안다. 실리지 않은
//     `npc-mates.js`는 파일만 있고 판에는 없다 — 회차 27 작업판이 그 상태를 「배선 없음」이라 적었다.
//  ③ **근거와 코드의 일치.** 근거 JSON이 사람의 `name·title·role·at`을 옮겨 적고 있으므로
//     한쪽만 고치면 조용히 갈린다. 보수(hire·wage·cut)는 **일부러 근거에 안 적는다**
//     (근거 JSON의 `_보수`가 그 이유를 적어 두었다) — 그래서 여기서도 대조하지 않고 **밴드만** 본다.

import { CITY_BY_ID, OFFICER, CREW_WAGE } from '../js/data.js';
import { REGIONS, REGION_IDS, ALL_MATES } from '../js/regions/index.js';
import { BY_REGION } from './evidence-load.mjs';

const bad = [], warn = [];
const fail = (id, m) => bad.push(`${id}: ${m}`);
const soft = (id, m) => warn.push(`${id}: ${m}`);

/* 규칙이 실제로 읽는 특전 키 — `state.js: matePerk`가 보는 것과 같아야 한다.
   ★ 목록 밖 키는 **조용히 무시된다**. 그것이 이 검사기의 첫째 이유다. */
const PERK_KEYS = new Set([
  'sailDaysOff', 'gunUp', 'meleeUp', 'hullUp', 'repairOff',
  'upkeepOff', 'tariffOff', 'impactOff', 'fleeUp', 'crewLossOff',
]);
const ROLES = new Set(['captain', 'navigator', 'gunner', 'bosun', 'surgeon', 'interpreter', 'purser']);
const VERDICTS = new Set(['confirmed', 'probable', 'corrected', 'gameplay']);

/* 밴드 — `npc-mates.js` 머리글과 근거 JSON `_보수`가 적어 둔 것 그대로(경고용) */
const BAND = {
  captainHire: [800, 2500], skillHire: [300, 900],
  captainWage: [3, 6], skillWage: [2.8, 4],
  cut: [0, 0.06],
};
/* 특전 합의 천장 — 부관 에이미보다 세면 안 된다(`data.js: OFFICER.perks`).
   ★ **에이미의 특전 다섯 중 동료가 쓸 수 있는 것은 둘뿐이다**(`tariffOff`·`impactOff`).
     나머지 셋(`contractUp`·`salvageUp`·`haggleOff`)은 부관 전용이라 동료의 열 개 목록에 없다 —
     다섯을 다 더하면 천장이 1.34가 되어 **아무도 안 걸리는 무른 자가 된다.**
     설계 주석이 적어 둔 수(0.57 = .35 + .22)와 맞추려면 **같은 눈금끼리** 더해야 한다. */
const AMY = Object.entries(OFFICER?.perks ?? {})
  .filter(([k]) => PERK_KEYS.has(k))
  .reduce((a, [, v]) => a + (Number(v) || 0), 0);

const REGION_SET = new Set(REGION_IDS);
const seen = new Set();
const byRegion = {}, capByRegion = {};

for (const m of ALL_MATES) {
  const id = m.id || '(무명)';
  if (!m.id) { fail(id, 'id가 없다 — 근거와 짝지을 길이 없다'); continue; }
  if (seen.has(m.id)) fail(id, '★ id가 두 번 쓰였다 — 뒤엣것이 앞엣것을 덮는다');
  seen.add(m.id);

  if (!REGION_SET.has(m.region)) { fail(id, `유령 권역 '${m.region}'`); continue; }
  byRegion[m.region] = (byRegion[m.region] ?? 0) + 1;

  if (!m.name) fail(id, '이름이 없다');
  if (!ROLES.has(m.role)) fail(id, `★ role '${m.role}'은 규칙이 모르는 직능이다 (${[...ROLES].join('|')})`);
  if (!m.title) soft(id, 'title이 없다');

  /* ── ★ 배선 — `at`이 없는 항구면 이 사람은 어디에서도 안 나타난다 ── */
  const city = CITY_BY_ID[m.at];
  if (!city) fail(id, `★ 유령 항구 '${m.at}' — 이 사람은 어느 부두에도 안 선다(조용한 실패)`);
  else if (city.region !== m.region) {
    fail(id, `★ 항구 '${m.at}'는 ${city.region}인데 이 사람은 ${m.region} 소속이다 — 권역이 갈린다`);
  }

  /* ── ★ 특전 — 목록 밖 키는 규칙이 그냥 무시한다 ── */
  const perks = m.perks ?? {};
  const pk = Object.keys(perks);
  if (!pk.length) soft(id, '특전이 없다 — 태워도 달라지는 것이 없다');
  for (const k of pk) {
    if (!PERK_KEYS.has(k)) fail(id, `★ 특전 키 '${k}'는 규칙이 조용히 무시한다 (쓸 수 있는 열 개: ${[...PERK_KEYS].join('·')})`);
    const v = Number(perks[k]);
    if (!(v > 0)) fail(id, `특전 '${k}'의 값이 ${perks[k]}다 — 0이나 음수면 없는 것과 같다`);
  }
  if (pk.length > 2) soft(id, `특전이 ${pk.length}개다 — 「한 사람에 하나나 둘, 얕게」`);
  const psum = pk.reduce((a, k) => a + (Number(perks[k]) || 0), 0);
  if (AMY > 0 && psum >= AMY) {
    fail(id, `★ 특전 합 ${psum.toFixed(2)}가 부관(에이미 ${AMY.toFixed(2)}) 이상이다 — 동료 하나가 부관을 대체하면 안 된다`);
  }

  /* ── 보수 — 근거에 안 적는 값이라 **밴드만** 본다(경고) ── */
  const cap = m.role === 'captain';
  const [hLo, hHi] = cap ? BAND.captainHire : BAND.skillHire;
  const [wLo, wHi] = cap ? BAND.captainWage : BAND.skillWage;
  if (!(m.hire > 0)) fail(id, 'hire(계약금)가 없다(또는 0)');
  else if (m.hire < hLo || m.hire > hHi) soft(id, `계약금 ${m.hire}닢이 밴드 ${hLo}~${hHi} 밖이다`);
  if (!(m.wage > 0)) fail(id, 'wage(일당)가 없다(또는 0)');
  else if (m.wage < wLo || m.wage > wHi) soft(id, `일당 ${m.wage}닢이 밴드 ${wLo}~${wHi} 밖이다`);
  if (m.wage > 0 && CREW_WAGE > 0 && m.wage < CREW_WAGE) {
    soft(id, `일당 ${m.wage}닢이 선원 일당(${CREW_WAGE}닢)보다 싸다 — 이름을 가진 사람인데 머릿수보다 싸다`);
  }

  /* ★ **cut은 선장급만 갖는다.** 기능직에 붙으면 규칙의 자기모순이다(설계 주석 · 근거 `_보수`) */
  const cut = Number(m.cut ?? 0);
  if (cut && !cap) fail(id, `★ cut(성과 배분) ${cut}은 선장급만 갖는다 — role='${m.role}'`);
  if (cut < BAND.cut[0] || cut > BAND.cut[1]) soft(id, `cut ${cut}이 밴드 ${BAND.cut[0]}~${BAND.cut[1]} 밖이다`);
  if (cap) capByRegion[m.region] = (capByRegion[m.region] ?? 0) + 1;

  if (m.sex != null && m.sex !== 'f' && m.sex !== 'm') fail(id, `sex가 이상하다 '${m.sex}' ('f'만 쓴다)`);
  if (!m.blurb) soft(id, 'blurb가 없다');
  for (const k of ['greet', 'hire', 'refuse', 'aboard', 'leave']) {
    if (!m.lines?.[k]) soft(id, `lines.${k}가 없다 — 그 갈래에서 이 사람이 말을 안 한다`);
  }
}

/* ── 바다마다 선장이 흔하면 아홉 척을 채우는 일이 산책이 된다 (설계 주석: 권역당 둘 이하) ── */
for (const rid of REGION_IDS) {
  const n = capByRegion[rid] ?? 0;
  if (n > 2) soft(rid, `선장이 ${n}명이다 — 설계 주석은 「권역당 둘 이하」다(동행 한 척 = 선장 하나)`);
}
/* ── 바다마다 얼굴이 있어야 한다 (경고) ── */
for (const r of REGIONS) {
  if (!(r.mod.geo.CITIES ?? []).length) continue;
  const n = byRegion[r.id] ?? 0;
  if (n < 3) warn.push(`${r.id}: 동료가 ${n}명뿐이다 — 바다마다 얼굴이 있어야 한다(최소 3 권장)`);
}

/* ── 근거 대조 ─────────────────────────────────────────────
   ★ 근거는 **권역마다 파일이 다르다**(`content/regions/<권역>-evidence.json` §mates).
     `_`로 시작하는 키는 사람이 아니라 머리글이다(`_읽는이에게`·`_보수`). */
const evAll = new Map();          // id → { rec, rid }
for (const rid of REGION_IDS) {
  const sec = BY_REGION[rid]?.mates;
  if (!sec) { warn.push(`${rid}: 근거에 mates 절이 없다 (미조사)`); continue; }
  for (const [k, v] of Object.entries(sec)) {
    if (k.startsWith('_')) continue;
    if (evAll.has(k)) fail(k, `★ 근거가 두 권역에 있다 — ${evAll.get(k).rid} · ${rid}`);
    evAll.set(k, { rec: v, rid });
  }
}

let matched = 0;
for (const m of ALL_MATES) {
  const e = evAll.get(m.id);
  if (!e) { soft(m.id, '근거 없음 (경고 — 콘텐츠를 막지 않는다)'); continue; }
  matched++;
  if (e.rid !== m.region) fail(m.id, `★ 근거가 ${e.rid}에 있는데 코드는 ${m.region}이다`);
  for (const k of ['name', 'title', 'role', 'at']) {
    if (e.rec[k] != null && e.rec[k] !== m[k]) {
      fail(m.id, `★ 근거와 ${k} 불일치 — 코드 '${m[k]}' ≠ 근거 '${e.rec[k]}'`);
    }
  }
  if (e.rec.verdict && !VERDICTS.has(e.rec.verdict)) fail(m.id, `판정이 이상하다 '${e.rec.verdict}'`);
  if (!e.rec.verdict) soft(m.id, '근거에 verdict가 없다');
  if (!e.rec.basis) soft(m.id, '근거에 basis가 없다');
  const src = e.rec.sources ?? e.rec.source;
  if (!src || (Array.isArray(src) && !src.length)) soft(m.id, '근거에 출처가 없다');
}
/* ★ 유령 근거 — 근거에는 있는데 명부에 없다. 이쪽은 **실패**다(둘이 갈렸다는 뜻이므로) */
for (const [id, e] of evAll) {
  if (!seen.has(id)) fail(id, `★ 유령 근거 — ${e.rid} 근거에는 있는데 ALL_MATES에 없다(배선 끊김이거나 지운 사람이다)`);
}

/* ── 요약 ─────────────────────────────────────────────────── */
const roleN = {};
for (const m of ALL_MATES) roleN[m.role] = (roleN[m.role] ?? 0) + 1;
console.log(`동료 ${ALL_MATES.length}명 · 바다별 ${REGION_IDS.map((r) => `${r} ${byRegion[r] ?? 0}`).join(' · ')}`);
console.log(`  직능 ${Object.entries(roleN).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  근거 대조 ${matched}/${ALL_MATES.length}명 · 특전 합 천장 ${AMY.toFixed(2)}(부관 에이미)`);

if (warn.length) {
  console.log(`\n경고 ${warn.length}건 (콘텐츠를 막지 않는다)`);
  for (const w of warn.slice(0, 40)) console.log(`  · ${w}`);
  if (warn.length > 40) console.log(`  … 그리고 ${warn.length - 40}건 더`);
}
if (bad.length) {
  console.log(`\n실패 ${bad.length}건`);
  for (const b of bad) console.log(`  ✗ ${b}`);
  process.exit(1);
}
console.log('\n동료 명부 — 통과');
