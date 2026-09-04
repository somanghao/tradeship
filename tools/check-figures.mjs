// check-figures.mjs — 항구 인물(`FIGURES`) 71명이 실제로 말을 하고 물건을 파는가
//
// ★ **이 검사가 없던 동안 인물은 무방비였다.** `check-world` ⑦의 id 유일성은 `ALL_PIRATES`·
//   `ALL_MATES`만 보고 `ALL_FIGURES`는 빠져 있었으며, `check-evidence`엔 `figures`라는 개념
//   자체가 없었다(회차 31 확인). 인물은 규칙에 얕게 물려 있어서 **틀려도 아무 일이 안 난다** —
//   `service` 철자가 하나 어긋나면 `buyService`의 switch가 조용히 default로 떨어지고,
//   `at`이 없는 항구면 `figuresAt()`이 영영 빈 배열을 돌려준다. 화면은 멀쩡하고 경고도 없다.
//   회차 30이 «조용한 실패가 가장 비싸다»라고 적은 그 모양이다.
//
// ★★ **§A-11 동아시아 세 문이 전부 인물에 앉는다** — 조선의 조정(왕·지방관)도, 명의 지방
//   관리도 세력이 아니라 `job:'官'` 인물이다(`QUICKMAP-world.md` §3의 잠금). 규칙을 얹기
//   **전에** 검사를 세운다.
//
// ⚠️ **정본을 여기 새로 적지 않는다.** service 목록은 `state.js: buyService`의 `case`에서,
//   직업·서비스 라벨은 `scenes/port.js`의 `JOB_LABEL`·`SERVICE_LABEL`에서 **소스를 읽어 뽑는다**.
//   여기에 배열을 하드코딩하면 저쪽이 늘어날 때 이 검사가 조용히 낡는다(check-world가
//   `YARD.cap`을 읽어 쓰는 것과 같은 규약).
//
// 이 스크립트가 답하는 것:
//   ① id가 세계에서 하나뿐인가 (겹치면 뒤엣것이 안 잡힌다)
//   ② `at`·`roam`이 실재하는 항구인가 · 앉을 자리가 아예 없는 인물은 없는가
//   ③ `service`가 `buyService`가 아는 값인가 (모르는 값이면 눌러도 아무 일도 안 난다)
//   ④ `job`이 화면이 아는 값인가 (모르면 직업 줄이 빈칸으로 뜬다)
//   ⑤ `fee`가 [최소,최대] 꼴인가 (`figureFee`가 구조분해한다 — 어긋나면 값이 NaN이다)
//   ⑥ `season`이 두 철 중 하나인가 (`seasonOf`는 'summer'|'winter'뿐이다)
//   ⑦ 말을 걸 수 있는가 (`lines.greet`)
//   ⑧ ★ **한 항구에 같은 service가 둘이면 뒤엣것은 죽은 인물이다** — 화면과 규칙이
//      `figuresAt(city).find((f) => f.service === …)`로 **첫 하나만** 집는다
//      (`payday.js:177` · `scenes/port.js:900` · `scenes/map.js:1201`)
//
//   node tools/check-figures.mjs
//   node tools/check-figures.mjs --seats   ← 인물이 앉지 않은 항구를 권역별로 센다(§A-11)

import { readFileSync } from 'node:fs';
import { CITY_BY_ID } from '../js/data.js';
import { ALL_FIGURES } from '../js/regions/index.js';
import { REGION_BY_ID, REGION_OF_CITY, REGIONS } from '../js/map/geo.js';

const SEATS = process.argv.includes('--seats');

const problems = [];
const softs = [];
const bad = (kind, msg) => problems.push({ kind, msg });
const soft = (kind, msg) => softs.push({ kind, msg });

/* ── 정본을 코드에서 뽑는다 ─────────────────────────────────
   ⚠️ 정규식으로 소스를 읽는 것이라 **못 뽑으면 실패시킨다**(빈 목록으로 조용히 전부 통과하면
   이 검사가 있으나 마나다 — 그것이 이 파일이 막으려는 바로 그 실패 모양이다). */
function extract(path, re, what) {
  const src = readFileSync(new URL(path, import.meta.url), 'utf8');
  const out = [...src.matchAll(re)].map((m) => m[1]);
  if (!out.length) {
    console.error(`\n✗ ${what}을(를) ${path}에서 못 뽑았다 — 그쪽 코드 모양이 바뀌었다.`);
    console.error('  이 검사기의 정규식을 고쳐라. 목록을 여기 하드코딩하지는 마라.\n');
    process.exit(2);
  }
  return out;
}

/* `buyService`의 switch가 아는 service — 이것이 «실제로 무슨 일이 일어나는가»의 정본이다.
   ⚠️ `state.js` 전체에서 긁으면 딴 switch의 case까지 섞이므로 그 함수 본문만 자른다. */
const stateSrc = readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const fnAt = stateSrc.indexOf('export function buyService');
if (fnAt < 0) { console.error('\n✗ state.js에서 buyService를 못 찾았다.\n'); process.exit(2); }
const fnBody = stateSrc.slice(fnAt, stateSrc.indexOf('\nexport ', fnAt + 10));
const SERVICES = [...fnBody.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]);
if (!SERVICES.length) { console.error('\n✗ buyService에서 case를 못 뽑았다.\n'); process.exit(2); }

/* 화면이 아는 라벨 — 여기 없으면 단추와 직업 줄이 빈칸으로 뜬다(규칙은 도는데 말이 없다). */
const JOBS = extract('../js/scenes/port.js',
  /(?:^|[\s{,])'?([A-Za-z官]+)'?\s*:\s*'[^']*'/gm, 'JOB_LABEL');
const portSrc = readFileSync(new URL('../js/scenes/port.js', import.meta.url), 'utf8');
const cut = (name) => {
  const at = portSrc.indexOf(`const ${name} = {`);
  return at < 0 ? '' : portSrc.slice(at, portSrc.indexOf('};', at));
};
const JOB_KEYS = [...cut('JOB_LABEL').matchAll(/(?:^|[\s{,])'?([A-Za-z官]+)'?\s*:/gm)]
  .map((m) => m[1]).filter((k) => k !== 'JOB_LABEL');
const SERVICE_KEYS = [...cut('SERVICE_LABEL').matchAll(/'?([a-z-]+)'?\s*:/g)]
  .map((m) => m[1]).filter((k) => k !== 'SERVICE_LABEL');
if (!JOB_KEYS.length || !SERVICE_KEYS.length) {
  console.error('\n✗ port.js에서 JOB_LABEL/SERVICE_LABEL을 못 뽑았다 — 정규식을 고쳐라.\n');
  process.exit(2);
}
void JOBS;

const SEASONS = ['summer', 'winter'];   // `state.js: seasonOf`가 내는 값 전부

/* ── 전수 검사 ───────────────────────────────────────────── */
const seen = new Map();          // id → 인물
const bySeat = new Map();        // `${city}|${service}` → [이름…]
const seatOf = new Map();        // city → 인물 수
const jobCount = new Map();
const svcCount = new Map();

for (const f of ALL_FIGURES) {
  const who = f.name ?? f.id ?? '(이름 없음)';

  // ① id
  if (!f.id) bad('id', `${who} — id가 없다`);
  else if (seen.has(f.id)) bad('id중복', `'${f.id}' — ${seen.get(f.id).name}와 ${who}가 같은 id다 (뒤엣것이 안 잡힌다)`);
  else seen.set(f.id, f);

  // ② 앉을 자리
  const seats = [f.at, ...(f.roam ?? [])].filter(Boolean);
  if (!seats.length) bad('자리', `${who} — at도 roam도 없다 (figuresAt이 영영 못 찾는다)`);
  for (const c of seats) {
    if (!CITY_BY_ID[c]) bad('자리', `${who} — '${c}'는 없는 항구다`);
    else seatOf.set(c, (seatOf.get(c) ?? 0) + 1);
  }

  // ③ service
  if (!f.service) bad('service', `${who} — service가 없다`);
  else if (!SERVICES.includes(f.service))
    bad('service', `${who} — '${f.service}'는 buyService가 모르는 값이다 (눌러도 아무 일도 안 난다 · 아는 것 ${SERVICES.length}종)`);
  else if (!SERVICE_KEYS.includes(f.service))
    soft('라벨', `${who} — '${f.service}'가 SERVICE_LABEL에 없다 (규칙은 도는데 단추에 이름이 안 뜬다)`);
  if (f.service) svcCount.set(f.service, (svcCount.get(f.service) ?? 0) + 1);

  // ④ job
  if (!f.job) bad('job', `${who} — job이 없다`);
  else if (!JOB_KEYS.includes(f.job))
    bad('job', `${who} — job '${f.job}'이 JOB_LABEL에 없다 (직업 줄이 빈칸으로 뜬다)`);
  if (f.job) jobCount.set(f.job, (jobCount.get(f.job) ?? 0) + 1);

  // ⑤ fee — `figureFee`가 `const [lo, hi] = f.fee`로 구조분해한다
  if (f.fee != null) {
    if (!Array.isArray(f.fee) || f.fee.length !== 2)
      bad('fee', `${who} — fee가 [최소,최대] 꼴이 아니다 (${JSON.stringify(f.fee)})`);
    else {
      const [lo, hi] = f.fee;
      if (!Number.isFinite(lo) || !Number.isFinite(hi))
        bad('fee', `${who} — fee에 숫자가 아닌 것이 있다 (${JSON.stringify(f.fee)} → 값이 NaN이 된다)`);
      else if (lo > hi) bad('fee', `${who} — fee의 최소가 최대보다 크다 (${lo} > ${hi})`);
      else if (lo < 0) bad('fee', `${who} — fee가 음수다 (${lo})`);
    }
  }

  // ⑥ season
  if (f.season != null && !SEASONS.includes(f.season))
    bad('철', `${who} — season '${f.season}'은 없는 철이다 (${SEASONS.join('|')}뿐 · 영영 안 나온다)`);

  // ⑦ 말
  if (!f.lines?.greet) bad('대사', `${who} — lines.greet이 없다 (말을 걸 수 없다)`);
  if (!f.lines?.offer) soft('대사', `${who} — lines.offer가 없다`);
  if (!f.lines?.done) soft('대사', `${who} — lines.done이 없다`);
  if (!f.blurb) soft('소개', `${who} — blurb가 없다 (목록에서 한 줄 소개가 빈다)`);

  // ⑧ 한 자리에 같은 service가 둘이면 뒤엣것은 죽는다
  for (const c of seats) {
    if (!CITY_BY_ID[c] || !f.service) continue;
    const key = `${c}|${f.service}`;
    if (!bySeat.has(key)) bySeat.set(key, []);
    bySeat.get(key).push(who);
  }
}

for (const [key, names] of bySeat) {
  if (names.length < 2) continue;
  const [city, svc] = key.split('|');
  /* ⚠️ 실패가 아니라 경고다 — 화면의 인물 목록에는 둘 다 뜨고 말도 건다.
     죽는 것은 `find()`로 **한 명만** 집는 자리(대금업자·수리·문서)에서다. */
  soft('겹침', `${CITY_BY_ID[city].name} — '${svc}'가 ${names.length}명이다(${names.join(' · ')}) `
    + `· find()로 집는 자리에서는 첫 하나만 쓰인다`);
}

/* ── 출력 ─────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
console.log('\n=== 항구 인물이 성한가 ===');
console.log(`인물 ${ALL_FIGURES.length}명 · 앉은 항구 ${seatOf.size}곳 / ${Object.keys(CITY_BY_ID).length}`);
console.log(`service ${SERVICES.length}종(buyService 기준) · job ${JOB_KEYS.length}종(JOB_LABEL 기준)`);

console.log('\n권역별');
for (const r of REGIONS) {
  const list = ALL_FIGURES.filter((f) => REGION_OF_CITY[f.at] === r.id);
  const cities = Object.keys(CITY_BY_ID).filter((c) => REGION_OF_CITY[c] === r.id);
  const held = cities.filter((c) => seatOf.has(c)).length;
  console.log(`  ${pad(r.name, 18)} 인물 ${String(list.length).padStart(2)}명 · `
    + `항구 ${String(held).padStart(2)}/${String(cities.length).padStart(2)}곳에 앉아 있다`);
}

console.log('\n파는 것');
for (const [k, n] of [...svcCount].sort((a, b) => b[1] - a[1])) {
  const known = SERVICE_KEYS.includes(k) ? '' : '  ← SERVICE_LABEL에 없다';
  console.log(`  ${pad(k, 12)} ${String(n).padStart(2)}명${known}`);
}
const unused = SERVICES.filter((s) => !svcCount.has(s));
if (unused.length) console.log(`  (아무도 안 파는 것 — ${unused.join(' · ')})`);

if (SEATS) {
  console.log('\n인물이 없는 항구 (§A-11이 앉힐 자리를 찾는 자리)');
  for (const r of REGIONS) {
    const empty = Object.keys(CITY_BY_ID)
      .filter((c) => REGION_OF_CITY[c] === r.id && !seatOf.has(c))
      .map((c) => CITY_BY_ID[c].name);
    if (!empty.length) continue;
    console.log(`  ${pad(r.name, 18)} ${String(empty.length).padStart(2)}곳 — ${empty.join(' · ')}`);
  }
}

if (softs.length) {
  console.log(`\n경고 ${softs.length}건 (실패는 아니다):`);
  for (const p of softs.slice(0, 20)) console.log(`  [${pad(p.kind, 6)}] ${p.msg}`);
  if (softs.length > 20) console.log(`  … 그리고 ${softs.length - 20}건 더`);
}

if (!problems.length) {
  console.log('\n문제 없음 — 인물이 전부 실재하는 항구에 앉아 말을 하고, 파는 것이 규칙에 닿는다.\n');
  process.exit(0);
}
console.log(`\n문제 ${problems.length}건:`);
for (const p of problems) console.log(`  [${p.kind}] ${p.msg}`);
console.log('');
process.exit(1);
