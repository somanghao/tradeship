// check-houses.mjs — 상단(商團) 명부가 세계·근거와 맞물리는가
//
//   node tools/check-houses.mjs
//
// ★ **실패와 경고를 가른다**(이 저장소의 규약 · claude-memory.md 절대 원칙).
//   실패(exit 1) = **코드와 세계/근거가 어긋난 것** — 유령 항구·유령 품목·id 중복·
//                  근거와 값 불일치·상관 없음.
//   경고        = 미조사(근거 없음·출처 빈칸). ⚠️ **「근거 없음」으로 실패시키면
//                  상단을 하나 늘리려 조사부터 끝내야 하는 구조가 된다.** 콘텐츠는 풍부해야 한다.

import { readFileSync, existsSync } from 'node:fs';
import { CITY_BY_ID, GOOD_BY_ID, GUILD } from '../js/data.js';
import { REGIONS } from '../js/regions/index.js';
import { HOUSES } from '../js/npc/houses.js';
import { startCapital, fleetOf, mightOf } from '../js/npc/guild.js';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const EV = `${ROOT}content/houses-evidence.json`;

const bad = [], warn = [];
const fail = (id, m) => bad.push(`${id}: ${m}`);
const soft = (id, m) => warn.push(`${id}: ${m}`);

const REGION_IDS = new Set(REGIONS.map((r) => r.id));
const seen = new Set();

for (const h of HOUSES) {
  if (!h.id) { fail('(무명)', 'id가 없다'); continue; }
  if (seen.has(h.id)) fail(h.id, '★ id가 두 번 쓰였다 — 세계에서 하나뿐이어야 한다');
  seen.add(h.id);
  if (!h.name) fail(h.id, '이름이 없다');
  if (!REGION_IDS.has(h.region)) fail(h.id, `유령 권역 '${h.region}'`);

  const seats = h.seats ?? [];
  if (seats.length < 2) fail(h.id, '상관이 둘 미만이다 — 나를 데가 없으면 상단이 아니다');
  if (seats.length > 5) soft(h.id, `상관이 ${seats.length}곳 — 한 바다를 통째로 누를 수 있다`);
  for (const c of seats) if (!CITY_BY_ID[c]) fail(h.id, `유령 항구 '${c}'`);
  const home = seats.filter((c) => CITY_BY_ID[c] && CITY_BY_ID[c].region === h.region).length;
  if (home < 1) fail(h.id, `제 바다(${h.region})에 상관이 하나도 없다`);

  const goods = h.goods ?? [];
  if (!goods.length) soft(h.id, '취급 품목이 비었다 — 전 품목을 다룬다는 뜻이 된다');
  for (const g of goods) if (!GOOD_BY_ID[g]) fail(h.id, `유령 품목 '${g}'`);

  if (!(h.capital > 0)) fail(h.id, 'capital이 없다(또는 0)');
  if (!(h.temper >= 0 && h.temper <= 1)) fail(h.id, `temper가 0~1 밖이다 (${h.temper})`);
  if (!(h.rank >= 1 && h.rank <= 5)) fail(h.id, `rank가 1~5 밖이다 (${h.rank})`);
  if (h.reach !== 'region' && h.reach !== 'ocean') fail(h.id, `reach가 'region'|'ocean'이 아니다 (${h.reach})`);
  if (h.season != null && h.season !== 'summer' && h.season !== 'winter') fail(h.id, `season이 이상하다 (${h.season})`);
  if (!h.blurb) soft(h.id, 'blurb가 없다');
  for (const k of ['greet', 'press', 'offer', 'help']) {
    if (!h.lines?.[k]) soft(h.id, `lines.${k}가 없다 — 그 갈래에서 상단이 말을 안 한다`);
  }
}

/* ── 근거 대조 ─────────────────────────────────────────────── */
let ev = null;
if (existsSync(EV)) {
  try { ev = JSON.parse(readFileSync(EV, 'utf8')); }
  catch (e) { bad.push(`content/houses-evidence.json: 못 읽는다 — ${e.message}`); }
} else {
  warn.push('content/houses-evidence.json: 아직 없다 (근거 미조사)');
}
if (ev) {
  const byId = new Map((ev.houses ?? []).map((r) => [r.id, r]));
  for (const h of HOUSES) {
    const r = byId.get(h.id);
    if (!r) { soft(h.id, '근거 없음 (경고 — 콘텐츠를 막지 않는다)'); continue; }
    if (r.capital !== h.capital) fail(h.id, `★ 근거와 capital 불일치 — 코드 ${h.capital} ≠ 근거 ${r.capital}`);
    const a = JSON.stringify(h.seats ?? []), b = JSON.stringify(r.seats ?? []);
    if (a !== b) fail(h.id, `★ 근거와 seats 불일치 — 코드 ${a} ≠ 근거 ${b}`);
    if (!r.basis) soft(h.id, '근거에 basis가 없다');
    if (!r.source) soft(h.id, '근거에 출처가 없다');
    const V = ['confirmed', 'probable', 'corrected', 'gameplay'];
    if (r.verdict && !V.includes(r.verdict)) fail(h.id, `판정이 이상하다 '${r.verdict}'`);
  }
  for (const r of ev.houses ?? []) {
    if (!seen.has(r.id)) fail(r.id, '★ 유령 근거 — 근거에는 있는데 명부에 없다');
  }
}

/* ── 세계가 골고루 찼나 (경고) ─────────────────────────────── */
const byRegion = {};
for (const h of HOUSES) byRegion[h.region] = (byRegion[h.region] ?? 0) + 1;
for (const r of REGIONS) {
  if (!(r.mod.geo.CITIES ?? []).length) continue;
  const n = byRegion[r.id] ?? 0;
  if (n < 3) warn.push(`${r.id}: 상단이 ${n}곳뿐이다 — 바다마다 얼굴이 있어야 한다(최소 3 권장)`);
}

/* ── 사다리가 실제로 갈리나 ────────────────────────────────────
   ★ **「무엇과 비교해서 성공인가」를 넣는다.** 자본이 다 같은 선단·세기로 눌리면
     "부가 힘이 된다"는 사다리가 화면에서 아무것도 아니게 된다. */
const ladder = HOUSES.map((h) => {
  const c = startCapital(h);
  return { id: h.id, cap: c, fleet: fleetOf(c), might: mightOf(c) };
});
const fleets = new Set(ladder.map((x) => x.fleet));
const mights = new Set(ladder.map((x) => x.might));
if (fleets.size < 2) bad.push(`사다리: 선단이 전부 ${[...fleets][0]}이다 — 자본이 힘이 안 된다(GUILD.fleetStep)`);
if (mights.size < 2) bad.push(`사다리: 세기가 전부 ${[...mights][0]}이다 — 압박이 다 같아진다(GUILD.mightStep)`);

const lo = Math.min(...ladder.map((x) => x.cap)), hi = Math.max(...ladder.map((x) => x.cap));
console.log(`상단 ${HOUSES.length}곳 · 바다별 ${Object.entries(byRegion).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`게임 자본 ${lo.toLocaleString('en-US')} ~ ${hi.toLocaleString('en-US')}닢 (${(hi / lo).toFixed(1)}배)`
  + ` · 선단 ${[...fleets].sort().join('/')} · 세기 ${[...mights].sort().join('/')}`);
console.log(`  ※ 사료 자본의 서열은 남기고 크기만 눌렀다 — GUILD.capPow=${GUILD.capPow}`);

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
console.log('\n상단 명부 — 통과');
