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
//
//   node tools/check-world.mjs

import { CITIES, CITY_BY_ID, GOODS, GOOD_BY_ID, SHIPS } from '../js/data.js';
import { REGIONS, REGION_BY_ID, REGION_OF_CITY, isOceanLane, laneOf } from '../js/map/geo.js';
import { state, resetGame, neighborsOf, voyageDays } from '../js/state.js';

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

/* 선종도 같은 눈으로 — 지을 수 있는 항구가 하나도 없으면 그 배는 없는 것과 같다 */
for (const [key, s] of Object.entries(SHIPS)) {
  if ((s.tier ?? 0) === 0) continue;         // 시작배·적 전용은 시중에 안 나온다
  const where = CITIES.filter((c) => (c.industry ?? 0) >= s.tier
    || (s.originFlag && c.flag === s.originFlag && (c.industry ?? 0) >= s.tier - 1));
  if (!where.length) soft('못 짓는 배', `${s.name}(${key}) — 공업력이 닿는 항구가 없다`);
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
