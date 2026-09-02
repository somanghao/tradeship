// check-world.mjs — 아홉 바다가 하나의 세계로 이어져 있는가
//
// 권역을 나눠 만들면 **각 바다는 멀쩡한데 세계가 끊기는** 일이 생긴다. 원양 항로 한쪽 끝의
// 항구 이름이 다르거나, 어느 권역이 관문을 안 만들었거나, 내륙 도시가 어디에도 안 붙거나.
// 각 권역 담당자는 제 바다만 보므로 그 이음매를 아무도 안 본다 — 그것을 여기서 본다.
//
// 이 스크립트가 답하는 것:
//   ① 시작 항구에서 **175곳 전부**에 갈 수 있는가 (도달성)
//   ② 아홉 권역이 다 열리는가, 그리고 **몇 번 갈아타야 닿는가** (권역 거리)
//   ③ 실제로 배를 몰고 갔을 때 며칠이 걸리는가 (원양 항해의 무게)
//   ④ 고립된 항구·죽은 교역품이 없는가
//   ⑤ **명부 해적의 사냥터(`hunt`)가 실재하는 항로인가** (회차 26에 넣었다)
//
//   node tools/check-world.mjs

import { CITIES, CITY_BY_ID, GOODS, GOOD_BY_ID, SHIPS, YARD, HOLDING, HOLDINGS,
         ALL_PIRATES, ALL_MATES, riskKey } from '../js/data.js';

/* 공업력이 실제로 어디까지 오르나 — `state.js: industryOf`가 쓰는 그 상한을 그대로 읽는다.
   여기서 숫자를 새로 적으면 그쪽이 바뀔 때 조용히 갈라진다. */
const YARD_CAP = YARD.cap;
const YARD_MAX_BOOST = YARD_CAP;   // 승급은 cap까지 오른다(나라 조선소 `CIVIC`도 그 안이다)
import { REGIONS, REGION_BY_ID, REGION_OF_CITY, isOceanLane, laneOf } from '../js/map/geo.js';
import { state, resetGame, neighborsOf, voyageDays } from '../js/state.js';
/* 그림 틀 목록 — 배가 실제로 그려지는지 보려면 이쪽을 읽어야 한다(규칙 파일엔 없다) */
import { HULLS } from '../js/sprites/ship.js';

const problems = [];
const softs = [];
const bad = (kind, msg) => problems.push({ kind, msg });
const soft = (kind, msg) => softs.push({ kind, msg });

resetGame();
const START = state.at;

/* ── ① 도달성 — **일수**로 가장 가까운 순서로 훑는다 ────────
   처음에는 항구 수(홉)로 쟀는데, 그러면 "믈라카까지 열 항구"라는 답이 나오면서
   그 열 항구가 대서양을 건너 태평양을 가로지르는 251일짜리 길이었다.
   갈아타는 횟수가 아니라 **며칠 걸리는가**가 이 세계에서 궁금한 것이다. */
const dist = { [START]: 0 };     // 일수
const hops = { [START]: 0 };
const prev = {};
const seen = new Set();
const queue = [START];
while (true) {
  let at = null, best = Infinity;
  for (const id of Object.keys(dist)) {
    if (seen.has(id) || dist[id] >= best) continue;
    at = id; best = dist[id];
  }
  if (!at) break;
  seen.add(at);
  for (const to of neighborsOf(at)) {
    const d = dist[at] + voyageDays(at, to);
    if (dist[to] != null && dist[to] <= d) continue;
    dist[to] = d; hops[to] = hops[at] + 1; prev[to] = at;
    if (!queue.includes(to)) queue.push(to);
  }
}

const unreachable = CITIES.filter((c) => dist[c.id] == null);
if (unreachable.length) {
  bad('고립', `시작 항구(${CITY_BY_ID[START].name})에서 못 가는 항구 ${unreachable.length}곳: `
    + unreachable.slice(0, 8).map((c) => `${c.name}(${c.region})`).join(' · '));
}

/* ── ② 권역이 다 열리는가 ─────────────────────────────────── */
const regionHop = {};      // 그 권역에 처음 닿기까지 몇 항구를 거치나
for (const c of CITIES) {
  if (dist[c.id] == null) continue;
  const r = c.region;
  if (regionHop[r] == null || dist[c.id] < regionHop[r].days) {
    regionHop[r] = { days: dist[c.id], hops: hops[c.id], via: c.id };
  }
}
for (const rg of REGIONS) {
  const n = CITIES.filter((c) => c.region === rg.id).length;
  if (!n) { soft('빈 권역', `${rg.name}에 항구가 없다`); continue; }
  if (!regionHop[rg.id]) bad('닫힌 권역', `${rg.name}에 갈 방법이 없다 — 원양 항로를 확인하라`);
}

/* ── ③ 실제로 며칠이 걸리나 ───────────────────────────────
   경로를 되짚어 **기함으로** 갔을 때의 일수를 잰다. 원양 항로가 얼마나 무거운지를
   숫자로 보는 자리다 — 이 값이 너무 작으면 세계가 좁고, 너무 크면 아무도 안 간다. */
function pathTo(id) {
  const path = [];
  for (let at = id; at != null; at = prev[at]) path.unshift(at);
  return path;
}

function daysAlong(path) {
  let d = 0, lanes = 0;
  for (let i = 0; i < path.length - 1; i++) {
    d += voyageDays(path[i], path[i + 1]);
    if (isOceanLane(path[i], path[i + 1])) lanes++;
  }
  return { days: d, lanes };
}

const gates = [];
for (const rg of REGIONS) {
  const g = regionHop[rg.id];
  if (!g) continue;
  const path = pathTo(g.via);
  const { days, lanes } = daysAlong(path);
  gates.push({
    region: rg.name, city: CITY_BY_ID[g.via].name, hops: g.hops, days: Math.round(days), lanes,
    route: path.map((id) => CITY_BY_ID[id].name).join(' → '),
  });
}
gates.sort((a, b) => a.days - b.days);

/* ── ④ 죽은 교역품 — 산지나 수요가 아예 없는 것 ──────────── */
const hasSupply = new Set(), hasDemand = new Set();
for (const c of CITIES) {
  for (const g of Object.keys(c.supply ?? {})) hasSupply.add(g);
  for (const g of Object.keys(c.demand ?? {})) hasDemand.add(g);
}
for (const g of GOODS) {
  if (!hasSupply.has(g.id) && !hasDemand.has(g.id)) {
    bad('죽은 품목', `'${g.id}'(${g.name})은 어디서도 나지 않고 아무도 안 산다`);
  } else if (!hasSupply.has(g.id)) {
    soft('산지 없음', `${g.name} — 사는 곳만 있고 나는 곳이 없다(중립가로만 산다)`);
  } else if (!hasDemand.has(g.id)) {
    soft('수요 없음', `${g.name} — 나는 곳만 있고 사는 곳이 없다(중립가로만 팔린다)`);
  }
}

/* ── ⑥ 배가 그릴 수 있는 선체를 쓰는가 (2026-08-26) ──────────
   ★ `SHIPS[].hull`은 **선종 이름이 아니라 그림 틀 키**다(`sprites/ship.js: HULLS` — 열 개뿐).
     그런데 이름이 비슷해서 선종 id를 그대로 적기 쉽다. 실제로 시작배 여덟 종을 만들며
     `panokseon`·`dhow`·`cog` 같은 **없는 선체**를 적었고, 그 배를 그리는 순간
     `Error: unknown hull` 로 죽는다 — **기본 시작지(부산포)의 배가 그랬다.**
   ⚠️ 그런데 `check-*` **열넷과 규칙 192개가 전부 통과했다.** 그것들은 규칙만 재고
     `sprites/*`를 한 번도 안 거친다(`check-imports`도 import 이름만 본다).
     이번 회차에 같은 모양의 구멍이 **세 번째**다. 그래서 여기서 본다. */
for (const [key, s] of Object.entries(SHIPS)) {
  if (!s.hull) continue;
  if (!HULLS[s.hull]) {
    bad('없는 선체', `${s.name}(${key})의 hull '${s.hull}'이 sprites/ship.js: HULLS에 없다 — `
      + `그리는 순간 죽는다. 쓸 수 있는 것: ${Object.keys(HULLS).join(' · ')}`);
  }
}

/* ── ⑦ 명부 id가 세계에서 하나뿐인가 (회차 29) ─────────────────
   ★ 남미 해적을 넣다가 실제로 밟을 뻔한 자리다. `regions/index.js: npcOf`(ALL_PIRATES·
     ALL_MATES를 만드는 자리)는 교역품(`ALL_GOODS`)·선종(`ALL_SHIPS`)과 달리 **id 중복을
     걸러내지 않고 그대로 이어 붙인다** — 권역마다 흩어진 명부를 한 배열로 모을 뿐이다.
     남미에 '프랜시스 드레이크'(`id:'drake'`)를 넣을 뻔했는데, 카리브에 이미 같은 id의
     인물이 있었다. 들어갔다면 `state.slain['pirate:drake']`·`state.mates['drake']`(둘 다
     id를 키로 쓴다)가 **두 바다의 서로 다른 인물을 한 키로 묶어**, 한 바다에서 잡은/고용한
     것이 다른 바다에서도 잡힌/고용된 것으로 조용히 처리된다 — 패권 조건 ③이 거짓 통과한다.
     콘텐츠 부족이 아니라 **규칙의 자기모순**(id는 세계에서 하나뿐이어야 한다 — `regions/
     index.js` 파일 머리주석)이라 실패로 잡는다. ALL_MATES도 같은 모양으로 id를 키 삼으므로
     함께 본다(`hireMate`/`mateAt` 등이 `state.mates[m.id]`를 쓴다). */
for (const [label, list] of [['해적', ALL_PIRATES], ['동료', ALL_MATES]]) {
  const byId = new Map();
  for (const n of list) {
    if (!byId.has(n.id)) byId.set(n.id, []);
    byId.get(n.id).push(n.region);
  }
  for (const [id, regions] of byId) {
    if (regions.length > 1) {
      bad('명부id충돌', `${label} id '${id}'가 ${regions.length}개 권역(${regions.join(' · ')})에 있다 — `
        + 'state가 이 id를 키로 잡음/고용을 기록해 두 바다를 섞는다. id를 다시 짓는다');
    }
  }
}

/* ── ⑤ 표시 이름이 겹치는가 (C-4) ───────────────────────────
   ★ **권역을 나눠 만들면 이름이 겹치는 것을 아무도 못 본다.** 각 담당은 제 바다만 보고,
     id는 갈려 있으므로(`baghla` / `baghlah`) 다른 검사기는 전부 통과한다. 그런데 화면에는
     **값이 다른 두 줄이 같은 이름으로** 뜬다 — 실제로 조선소 목록에 '바갈라'가 둘이었고
     시장에 '유향'이 둘이었다. 이 검사가 없어 감수자가 눈으로 찾아야 했다.
   ⚠️ **합치라는 뜻이 아니다.** 같은 계열의 다른 바다 변종이면 제원이 다른 것이 옳다 —
     고칠 것은 **표시 이름**이다(지명을 붙인다). 콘텐츠를 줄이는 쪽으로 읽으면 안 된다.
   ★ **해적·동료도 여기 넣었다(회차 29) — 다만 이 둘은 사정이 다르다.** 배·품목은 "같은
     계열의 다른 지역 변종"이 정상이지만(그래서 표시 이름만 가르면 끝), 해적·동료는 **역사
     실존 인물 한 명씩을 가리키는 명부**라 같은 이름이 두 바다에 있는 것은 거의 항상
     "같은 사람을 두 번 만든" 사고다(드레이크가 그 예) — 동명이인을 의도적으로 둘 넣을
     이유가 이 명부의 설계상 없다. 그래서 이 검사가 잡아도 콘텐츠가 줄지 않는다: 잡히면
     "표시 이름에 지명을 붙인다"가 아니라 **다른 인물·다른 사건으로 바꾼다**(FIX-L의 처리
     그대로 — 나사우 함대로 교체). */
for (const [label, entries] of [['교역품', GOODS.map((g) => [g.id, g.name])],
                                ['선종', Object.entries(SHIPS).map(([k, s]) => [k, s.name])],
                                ['도시', CITIES.map((c) => [c.id, c.name])],
                                ['해적', ALL_PIRATES.map((p) => [p.id, p.name])],
                                ['동료', ALL_MATES.map((m) => [m.id, m.name])]]) {
  const by = new Map();
  for (const [id, name] of entries) {
    if (!name) continue;
    if (!by.has(name)) by.set(name, []);
    by.get(name).push(id);
  }
  for (const [name, ids] of by) {
    if (ids.length > 1) {
      bad('이름 충돌', `${label} '${name}'이 ${ids.length}개다 — ${ids.join(' · ')}. `
        + '같은 화면에 값이 다른 두 줄로 뜬다. **합치지 말고 표시 이름에 지명을 붙여 가른다**');
    }
  }
}

/* 선종도 같은 눈으로 — 지을 수 있는 항구가 하나도 없으면 그 배는 없는 것과 같다.

   ⚠️ **정적 `industry`만 보면 거짓 경고가 난다.** 도시 공업력은 고정값이 아니다 —
     나라가 짓는 조선소(`state.yards[].civic` · C-18)와 A-2 승급(`state.yards[].boost`)이
     `YARD.cap`까지 올린다.
     실제로 철갑 거북선(tier 4 · 염포 전용)이 "공업력이 닿는 항구가 없다"로 걸려 있었는데,
     염포를 **두 번 승급하면 열린다**(base 1 + boost 2 = 3 ≥ tierNeeded 3). 설계 그대로다.
   ⇒ 그래서 **올릴 수 있는 데까지 올려 놓고** 본다. 그래도 못 지으면 그건 진짜 구멍이다.
     대신 「승급해야 열리는 배」는 따로 세어 준다 — 그 사실 자체는 알 값어치가 있다. */
const reachable = (c) => Math.min(YARD_CAP, (c.industry ?? 0) + YARD_MAX_BOOST);
for (const [key, s] of Object.entries(SHIPS)) {
  if ((s.tier ?? 0) === 0) continue;         // 시작배·적 전용은 시중에 안 나온다
  const need = (c) => (s.originFlag && c.flag === s.originFlag ? Math.max(1, s.tier - 1) : s.tier);
  const yardsOnly = s.yardsOnly ? (s.yards ?? []) : null;
  const pool = yardsOnly ? CITIES.filter((c) => yardsOnly.includes(c.id)) : CITIES;
  const nowhere = pool.filter((c) => reachable(c) >= need(c));
  const already = pool.filter((c) => (c.industry ?? 0) >= need(c));
  if (!nowhere.length) {
    soft('못 짓는 배', `${s.name}(${key}) — 끝까지 승급해도 공업력이 닿는 항구가 없다`);
  } else if (!already.length) {
    soft('승급해야 열림', `${s.name}(${key}) — 지금은 0곳. `
      + `${nowhere.slice(0, 3).map((c) => c.name).join(' · ')}${nowhere.length > 3 ? ' …' : ''}`
      + `를 공업력 ${Math.min(...nowhere.map(need))}까지 올리면 열린다`);
  }
}

/* ── ⑤ 명부 해적의 사냥터가 실재하는 항로인가 ───────────────
   ★ `world.js: huntedOnLeg`는 `riskKey(a,b)`가 `def.hunt`와 **정확히 일치**할 때만 열린다.
     그래서 없는 항로·정렬 안 된 키를 적으면 그 줄은 **조용히 죽고**, 항구 카드는 여전히
     "사냥터 A↔B"라고 말한다 — 플레이어는 그리로 나가 보고 아무도 안 만난다.
     이 저장소가 **984 게임일에 명부 조우 0회**로 겪은 사고의 작은 판이다.
   실패로 잡는 이유: 콘텐츠 부족이 아니라 **규칙의 자기모순**이다(최상위 원칙의 갈림선).
   실측 도구는 `node tools/probe-roster.mjs`. */
for (const def of ALL_PIRATES) {
  if (!CITY_BY_ID[def.base]) bad('명부소굴', `${def.name} — 소굴 '${def.base}'가 없는 항구다`);
  let live = 0;
  for (const key of def.hunt ?? []) {
    const [a, b] = String(key).split('|');
    if (!CITY_BY_ID[a] || !CITY_BY_ID[b]) { bad('명부사냥터', `${def.name} — '${key}'에 없는 항구가 있다`); continue; }
    if (riskKey(a, b) !== key) { bad('명부사냥터', `${def.name} — '${key}'가 정렬형이 아니다(→'${riskKey(a, b)}')`); continue; }
    if (!neighborsOf(a).includes(b)) { bad('명부사냥터', `${def.name} — '${key}'는 이어져 있지 않은 두 항구다`); continue; }
    live++;
  }
  if (!live && (def.hunt ?? []).length) soft('명부사냥터', `${def.name} — 쓸 수 있는 사냥터가 하나도 없다(소굴 언저리로만 만난다)`);
}

/* ── 출력 ─────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
console.log('\n=== 세계가 이어져 있는가 ===');
console.log(`항구 ${CITIES.length} · 권역 ${REGIONS.length} · 교역품 ${GOODS.length} · 선종 ${Object.keys(SHIPS).length}`);
console.log(`시작 ${CITY_BY_ID[START].name} → 갈 수 있는 항구 ${queue.length}/${CITIES.length}`);
console.log(`가장 먼 항구까지 ${Math.round(Math.max(...Object.values(dist)))}일 · ${Math.max(...Object.values(hops))}번 갈아탄다`);

console.log('\n권역에 처음 닿기까지 (기함 · 낡은 바사 기준)');
for (const g of gates) {
  console.log(`  ${pad(g.region, 18)} ${pad(g.city, 10)} ${String(g.hops).padStart(2)}항구 `
    + `${String(g.days).padStart(4)}일  원양 ${g.lanes}회`);
}
console.log(`\n가장 먼 바다로 가는 길:\n  ${gates[gates.length - 1].route}`);

if (softs.length) {
  console.log(`\n경고 ${softs.length}건 (실패는 아니다):`);
  for (const p of softs.slice(0, 14)) console.log(`  [${pad(p.kind, 8)}] ${p.msg}`);
  if (softs.length > 14) console.log(`  … 그리고 ${softs.length - 14}건 더`);
}

if (!problems.length) {
  console.log('\n문제 없음 — 아홉 바다가 하나로 이어져 있다.\n');
  process.exit(0);
}
console.log(`\n문제 ${problems.length}건:`);
for (const p of problems) console.log(`  [${p.kind}] ${p.msg}`);
console.log('');
process.exit(1);
