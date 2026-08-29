// gen-map-spans.mjs — **해안선 다각형 → 행별 수역 격자(SEA_SPANS)**로 굽는다.
//
//   node tools/gen-map-spans.mjs <권역>          # 굽고 검증표를 낸다
//   node tools/gen-map-spans.mjs <권역> --ascii  # 터미널에 실루엣을 그려 본다(빠른 반복용)
//   node tools/gen-map-spans.mjs --all
//
// ★ 왜 이 도구가 있는가 — 회차 25에서 지도담당 PM이 만들었다.
//   사용자 판정이 *"안 맞는 게 많다 · 새로 만들어도 된다 · 픽셀아트로 정교하게"*였다.
//   여덟 권역이 `auto`(도시·항로에서 바다를 역산)로 그려져 있었는데, 그 방식은 **정의상
//   실루엣을 만들 수 없다** — 항로가 지형을 정하므로 이탈리아 장화도 일본 열도도 나올 수가 없다.
//   지중해만 쓰던 `hand`(행별 수역 격자) 경로는 실루엣을 그대로 두고 **항구 앞만 2.5px로 판다**
//   (`scene.js`의 `carveHarbors(lane:2.5, bay:3.5)`). 그래서 아홉을 전부 그리로 옮긴다.
//
//   그런데 격자를 손으로 찍는 것은(지중해가 그랬다) 사람이 형태를 통제하기 어렵다.
//   ⇒ **그리는 것은 다각형, 저장하는 것은 격자**로 가른다. 다각형은 400×225 게임 좌표라
//     도시 좌표(`js/regions/<권역>/geo.js`)와 **같은 자로 잴 수 있다.**
//
//   ⚠️ `map-terrain.md`의 「1차: 육지 폴리곤 나열 — 실패」를 다시 읽어라. 그때 실패한 이유는
//     다각형이라서가 아니라 **렌더해 보지 않아서**다(이탈리아가 1px 사선이 된 것을 몰랐다).
//     이 도구는 굽는 즉시 ① 아스키 실루엣 ② 항구별 물가 판정 ③ 항로별 육지 관통률을 낸다.
//     그래도 **`gen-map-png.mjs`로 렌더해 눈으로 보는 것**을 생략하지 마라.
//
// ── 입력 `assets/map-shape/<권역>.json` ─────────────────────────
//   {
//     "gw": 200, "gh": 113, "gs": 2,      // 격자 200×113 · 한 칸 2px (≈20~30km)
//     "land":  [ { "name":"이베리아", "poly": [[x,y],…] } ],   // 400×225 게임 좌표
//     "sea":   [ { "name":"지브롤터", "poly": [[x,y],…] } ],   // land 다음에 **빼는** 다각형
//     "isles": [ [cx,cy,rx,ry,"시칠리아"] ],                   // 격자에 안 넣는다(스무딩에 먹힌다)
//     "ranges":[ [[x,y],[x,y],…] ]                            // 산줄기 폴리라인
//   }
// ── 출력 `js/sprites/maps/<권역>.js` ────────────────────────────
//   `export const SEA_SPANS / ISLES / RANGES` — **생성물이다. 손으로 고치지 마라.**
//   고칠 것은 `assets/map-shape/<권역>.json` 쪽이다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_CITY_GEO, ALL_ROUTES, ALL_ROUTE_RISK } from '../js/regions/index.js';
/* ★ **뭍길은 항로가 아니다.** 요율이 `null`인 구간은 대상로라 바다를 파면 안 된다(C-12 —
   아라비아가 섬이 된다). `scenes/map.js: terrainRoutes`·`gen-map-png.mjs`와 같은 필터다. */
const riskKey = (a, b) => [a, b].sort().join('|');
const isSeaRoute = ([a, b]) => ALL_ROUTE_RISK[riskKey(a, b)] !== null;

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SHAPE = join(ROOT, 'assets', 'map-shape');
const OUTDIR = join(ROOT, 'js', 'sprites', 'maps');
const VW = 400, VH = 225;
const NL = String.fromCharCode(10);

const REGIONS = ['mediterranean', 'atlantic', 'africa', 'mideast', 'indian',
  'seasia', 'eastasia', 'caribbean', 'southamerica'];

/** 점이 다각형 안인가 — 짝수/홀수 규칙 */
function inPoly(px, py, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** 격자 한 칸을 2×2로 겉표본해 뭍/바다를 정한다 — 칸 경계가 계단으로 튀는 것을 줄인다 */
function rasterize(shape) {
  const { gw, gh, gs } = shape;
  const land = new Uint8Array(gw * gh);
  const lands = (shape.land ?? []).map((p) => p.poly);
  const seas = (shape.sea ?? []).map((p) => p.poly);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let hits = 0;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const x = (gx + ox) * gs, y = (gy + oy) * gs;
        let isLand = lands.some((p) => inPoly(x, y, p));
        if (isLand && seas.some((p) => inPoly(x, y, p))) isLand = false;
        if (isLand) hits++;
      }
      land[gy * gw + gx] = hits >= 2 ? 1 : 0;
    }
  }
  return land;
}

/** 육지 격자 → 행별 **바다** 구간 목록 */
function toSpans(land, gw, gh) {
  const spans = {};
  for (let gy = 0; gy < gh; gy++) {
    const row = [];
    let x0 = -1;
    for (let gx = 0; gx <= gw; gx++) {
      const sea = gx < gw && !land[gy * gw + gx];
      if (sea && x0 < 0) x0 = gx;
      if (!sea && x0 >= 0) { row.push([x0, gx - 1]); x0 = -1; }
    }
    if (row.length) spans[gy] = row;
  }
  return spans;
}

/** 400×225 육지 마스크 — 검증용(게임의 보간·해안옥타브 전 단계다) */
function upscale(land, gw, gh, gs) {
  const out = new Uint8Array(VW * VH);
  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      const gx = Math.min(gw - 1, Math.floor(x / gs));
      const gy = Math.min(gh - 1, Math.floor(y / gs));
      out[y * VW + x] = land[gy * gw + gx];
    }
  }
  return out;
}

const isLandAt = (m, x, y) => x >= 0 && y >= 0 && x < VW && y < VH && m[y * VW + x] === 1;

/** 그 자리에서 가장 가까운 뭍까지 몇 px — check-map.py의 land_reach와 같은 잣대 */
function landReach(m, x, y, limit = 34) {
  if (isLandAt(m, x, y)) return 0;
  for (let r = 1; r <= limit; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isLandAt(m, x + dx, y + dy)) return r;
      }
    }
  }
  return limit + 1;
}

function ascii(land, gw, gh, cities, gs) {
  // 터미널에 들어가도록 가로를 반으로 접는다(두 칸을 한 글자로)
  const step = gw > 120 ? 2 : 1;
  const mark = new Map();
  for (const c of cities) mark.set(`${Math.floor(c.x / gs / step)},${Math.floor(c.y / gs)}`, '@');
  const lines = [];
  for (let gy = 0; gy < gh; gy++) {
    let s = '';
    for (let gx = 0; gx < gw; gx += step) {
      const k = `${gx / step},${gy}`;
      if (mark.has(k)) { s += '@'; continue; }
      s += land[gy * gw + gx] ? '#' : '.';
    }
    lines.push(s);
  }
  return lines.join('\n');
}

function bake(region, { showAscii = false } = {}) {
  const src = join(SHAPE, `${region}.json`);
  if (!existsSync(src)) { console.log(`[건너뜀] ${region} — ${src} 가 없다`); return null; }
  const shape = JSON.parse(readFileSync(src, 'utf8'));
  const gw = shape.gw ?? 200, gh = shape.gh ?? 113, gs = shape.gs ?? 2;
  shape.gw = gw; shape.gh = gh; shape.gs = gs;

  const grid = rasterize(shape);
  const spans = toSpans(grid, gw, gh);
  const mask = upscale(grid, gw, gh, gs);

  const cities = ALL_CITY_GEO.filter((c) => c.region === region);
  const ids = new Set(cities.map((c) => c.id));
  const by = Object.fromEntries(cities.map((c) => [c.id, c]));
  const routes = ALL_ROUTES.filter(([a, b]) => ids.has(a) && ids.has(b) && isSeaRoute([a, b]));
  const via = shape.routeVia ?? {};

  // ── 검증 ①: 항구가 물가인가 (뭍까지 0~2px이 이상적, 28px 넘으면 check-map.py가 실패시킨다)
  const far = [], floating = [], buried = [];
  for (const c of cities) {
    const d = landReach(mask, c.x, c.y);
    if (d > 28) far.push([c.name, d]);
    else if (d >= 7) floating.push([c.name, d]);
    // 뭍 한복판 — 물이 6px 안에 없으면 항구가 갇힌다(내륙 도시는 정상이라 여기서 세기만 한다)
    let sea = 0;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      if (dx * dx + dy * dy > 36) continue;
      if (!isLandAt(mask, c.x + dx, c.y + dy)) sea++;
    }
    if (sea === 0) buried.push(c.name);
  }
  // ── 검증 ②: 항로가 뭍을 지나는가 (34% 넘으면 check-map.py 실패)
  //    ★ 꺾인 뱃길(routeVia)이 있으면 **그 폴리라인**을 따라 잰다 — 직선이 아니다.
  const pathOf = (ca, cb) => {
    const v = via[`${ca.id}|${cb.id}`]
      ?? (via[`${cb.id}|${ca.id}`] ? [...via[`${cb.id}|${ca.id}`]].reverse() : null);
    return v ? [[ca.x, ca.y], ...v, [cb.x, cb.y]] : [[ca.x, ca.y], [cb.x, cb.y]];
  };
  const blocked = [];
  for (const [a, b] of routes) {
    const ca = by[a], cb = by[b];
    const p = pathOf(ca, cb);
    let on = 0, tot = 0;
    for (let k = 0; k < p.length - 1; k++) {
      const [x0, y0] = p[k], [x1, y1] = p[k + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const gx = Math.round(x0 + (x1 - x0) * t), gy = Math.round(y0 + (y1 - y0) * t);
        // 접안 구간(항구에서 3.5px 안)은 뭍이어도 정상이다
        if (Math.hypot(gx - ca.x, gy - ca.y) < 3.5 || Math.hypot(gx - cb.x, gy - cb.y) < 3.5) continue;
        tot++;
        if (isLandAt(mask, gx, gy)) on++;
      }
    }
    const ratio = on / Math.max(1, tot);
    if (ratio > 0.34) blocked.push([`${ca.name}~${cb.name}`, Math.round(ratio * 100)]);
  }
  const seaRatio = 1 - mask.reduce((s, v) => s + v, 0) / (VW * VH);

  // ── 출력
  const rows = Object.entries(spans)
    .map(([y, list]) => `  ${String(y).padStart(3)}: [${list.map(([a, b]) => `[${a},${b}]`).join(', ')}],`)
    .join('\n');
  const isles = (shape.isles ?? [])
    .map((i) => `  [${i.slice(0, 4).join(', ')}],${i[4] ? `    // ${i[4]}` : ''}`).join('\n');
  const ranges = (shape.ranges ?? [])
    .map((r) => `  [${r.map(([x, y]) => `[${x}, ${y}]`).join(', ')}],`).join('\n');
  const lanesBody = Object.entries(via)
    .map(([k, v]) => `  '${k}': [${v.map(([x, y]) => `[${x}, ${y}]`).join(', ')}],`).join(NL);
  const lanes = lanesBody ? `{${NL}${lanesBody}${NL}}` : '{}';

  const js = `// sprites/maps/${region}.js — **생성물이다. 손으로 고치지 마라.**
//
//   정본은 \`assets/map-shape/${region}.json\`(해안선 다각형)이고
//   \`node tools/gen-map-spans.mjs ${region}\`가 이 파일을 굽는다.
//   좌표를 고쳤으면 이어서 \`node tools/gen-map-png.mjs --only ${region} --port 8891\`도 돌려라 —
//   안 돌리면 게임이 쓰는 \`assets/map/${region}.png\`가 낡은 채로 굳는다.
//
//   격자 ${gw}×${gh} · 한 칸 ${gs}px · 행마다 **바다인 x 구간**을 적는다(반도는 구간과 구간 사이의 틈이다).

/** 격자 규격 — **index.js가 이것을 읽어야 한다.** 예전에는 gw:100, gh:56, gs:4 가
    거기 손으로 박혀 있었고, 격자 해상도를 올린 순간 지도가 통째로 어긋났다(회차 25에서 겪었다). */
export const GRID = { gw: ${gw}, gh: ${gh}, gs: ${gs} };

export const SEA_SPANS = {
${rows}
};

/** 섬 — 확대 후 좌표(400×225). 격자에 넣으면 스무딩에 먹힌다. [중심x, 중심y, 반경x, 반경y] */
export const ISLES = [
${isles}
];

/** 산줄기 — 육지 위에만 찍힌다 */
export const RANGES = [
${ranges}
];

/** 꺾인 뱃길 — 두 항구 사이에 **끼워 넣을 중간점**. 그림과 지형 파기에만 쓰고 항해일은 안 바꾼다.
    정본은 assets/map-shape/<권역>.json 의 routeVia — 자세한 것은 js/sprites/maps/lanes.js 머리주석 */
export const LANES = ${lanes};
`;
  writeFileSync(join(OUTDIR, `${region}.js`), js, 'utf8');

  console.log(`\n═══ ${region} ═══  격자 ${gw}×${gh}(칸 ${gs}px) · 바다 ${(seaRatio * 100).toFixed(0)}%`
    + `${seaRatio < 0.2 || seaRatio > 0.8 ? '  ← ★ 20~80% 밴드 밖이다(check-map.py 실패)' : ''}`);
  console.log(`  항구 ${cities.length}곳 — 뭍에서 7px 이상 뜬 곳 ${floating.length} · 28px 초과(실패) ${far.length} · 물이 안 닿는 곳 ${buried.length}`);
  if (far.length) console.log(`   ★실패 ${far.map(([n, d]) => `${n}(${d}px)`).join(', ')}`);
  if (floating.length) console.log(`   뜬 항구 ${floating.slice(0, 40).map(([n, d]) => `${n}(${d})`).join(', ')}${floating.length > 10 ? ' …' : ''}`);
  if (buried.length) console.log(`   갇힌 항구 ${buried.slice(0, 10).join(', ')}${buried.length > 10 ? ' …' : ''}`);
  console.log(`  항로 ${routes.length}개 — 34% 넘게 뭍을 지나는 것 ${blocked.length}`
    + (blocked.length ? `: ${blocked.slice(0, 40).map(([n, r]) => `${n}(${r}%)`).join(', ')}` : ''));
  console.log(`  ⚠️ 이 표는 **해안 옥타브·항구 파기 전** 단계다. 최종 판정은 gen-map-png.mjs → check-map.py → 눈.`);
  if (showAscii) console.log('\n' + ascii(grid, gw, gh, cities, gs));
  return { spans, seaRatio, blocked, far, floating, buried };
}

mkdirSync(SHAPE, { recursive: true });
const args = process.argv.slice(2);
const showAscii = args.includes('--ascii');
const list = args.includes('--all') ? REGIONS : args.filter((a) => !a.startsWith('--'));
if (!list.length) {
  console.log('쓰기: node tools/gen-map-spans.mjs <권역>[ --ascii]  |  --all');
  process.exit(1);
}
for (const r of list) bake(r, { showAscii });
