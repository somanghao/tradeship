// sprites/maps/auto.js — 도시와 항로에서 **바다를 역산해** 지도를 만든다
//
// ★ 이 파일이 있는 이유가 프로젝트에서 가장 비싸게 배운 교훈이다.
//   지중해 지도를 외주로 두 번 발주해 두 번 다 반려했다. 1차는 실제 지중해를 훌륭하게
//   그렸는데 **게임 좌표와 최대 55px 어긋나** 항구가 사하라 한복판에 앉았다. 이 게임의 지도는
//   위경도의 투영이 아니라 플레이하기 좋게 늘리고 줄인 도식이기 때문이다.
//   2차는 좌표에 맞췄으나 도시·항로의 볼록껍질을 그냥 바다로 칠해 반도도 섬도 없었다.
//
//   결론은 **작업 순서를 뒤집는 것**이었다 — 지형을 그리고 도시를 얹는 게 아니라,
//   **도시를 놓고 그 점들이 물가에 오도록 지형을 만든다.** 그것을 코드로 한 것이 이 파일이다.
//   그래서 여기서 나온 지도는 "항구가 물가에 있고 항로가 바다를 지난다"가 **구조적으로 참**이다.
//   검수 스크립트(tools/check-map.py)가 검사하는 항목을 그림이 만족하는 게 아니라,
//   만족할 수밖에 없는 방식으로 만든다.
//
//   다만 이것만으로는 실루엣이 밋밋하다(2차 납품의 실패가 그것이었다). 그래서
//   해안선에 **값 잡음(value noise)**을 먹여 만과 곶을 파고, 바다 쪽에 섬을 흩고,
//   항로에서 먼 바다는 통째로 열어 둔다. 이 셋이 "선 모양 바다"를 지도처럼 보이게 한다.
//
//   이 그림은 **기준판이자 임시본**이다. 사람이 그린 지도가 오면 `assets/manifest.json`으로
//   갈아 끼운다 — 그때 이 그림이 그대로 발주용 기준판이 된다(좌표가 이미 맞으므로).

import { rng } from '../../pixel.js';

export const VW = 400, VH = 225;

/* ── 값 잡음 ───────────────────────────────────────────────────
   해안선을 흔드는 데 쓴다. 격자에 난수를 깔고 이중선형으로 읽는다 —
   `Math.random()`을 픽셀마다 부르면 흰 잡음이라 해안이 톱니가 되고,
   이렇게 하면 파도치듯 굽이친다. 씨앗을 권역마다 달리해 바다마다 다른 해안을 얻는다. */
function valueNoise(seed, cell) {
  const r = rng(seed);
  const N = 96;
  const grid = new Float32Array(N * N);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  const at = (gx, gy) => grid[((gy % N) + N) % N * N + (((gx % N) + N) % N)];
  return (x, y) => {
    const fx = x / cell, fy = y / cell;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    // 부드럽게 — 선형 그대로면 격자 자국이 남는다
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return at(x0, y0) * (1 - sx) * (1 - sy) + at(x0 + 1, y0) * sx * (1 - sy)
         + at(x0, y0 + 1) * (1 - sx) * sy + at(x0 + 1, y0 + 1) * sx * sy;
  };
}

/** 점에서 선분까지의 거리 */
function distToSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = x0 + dx * t, qy = y0 + dy * t;
  return Math.hypot(px - qx, py - qy);
}

/**
 * 도시·항로에서 바다를 만든다.
 *
 * @param cities  [{id,x,y,size}] — 이 권역의 도시
 * @param routes  [[aId,bId]]     — 이 권역 **안**의 항로만 (원양 항로는 좌표계가 달라 제외)
 * @param opts
 *   seed      권역마다 다른 해안을 얻기 위한 씨앗
 *   lane      항로 회랑의 기본 반폭(px). 클수록 바다가 넓다
 *   bay       항구 앞바다의 기본 반경(px)
 *   openSea   [[x0,y0,x1,y1]…] 통째로 바다인 사각형 — **대양 쪽을 열어 두는 자리**다.
 *             이것이 없으면 지도가 "항로를 따라 난 운하"처럼 보인다.
 *   landmass  [[x0,y0,x1,y1]…] 통째로 육지인 사각형 — 대륙 안쪽을 굳혀 만을 막는다.
 *             openSea보다 **먼저** 적용되므로 겹치면 바다가 이긴다.
 * @returns Uint8Array(VW*VH) — 1이면 육지
 */
export function autoLandMap(cities, routes, opts = {}) {
  const {
    seed = 0xA11A5, lane = 7.5, bay = 11, openSea = [], landmass = [],
  } = opts;

  const byId = Object.fromEntries(cities.map((c) => [c.id, c]));
  const segs = [];
  for (const [a, b] of routes) {
    const ca = byId[a], cb = byId[b];
    if (ca && cb) segs.push([ca.x, ca.y, cb.x, cb.y]);
  }

  // 해안을 굽이치게 하는 잡음 둘 — 큰 굴곡과 잔 요철을 겹친다
  const nBig = valueNoise(seed, 26);
  const nSmall = valueNoise(seed ^ 0x9E37, 7);

  const land = new Uint8Array(VW * VH);

  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      // 잡음으로 "이 자리는 바다가 얼마나 넓은가"를 흔든다.
      // 같은 항로라도 어떤 구간은 좁은 해협이고 어떤 구간은 넓은 만이 된다.
      const wob = (nBig(x, y) - 0.5) * 2;          // -1 … 1
      const fine = (nSmall(x, y) - 0.5) * 2;

      let sea = false;

      // ① 항구 앞바다 — 큰 항구일수록 넓다(size 1~3)
      for (const c of cities) {
        const r = bay * (0.8 + (c.size ?? 2) * 0.16) + wob * 4 + fine * 2;
        if (Math.hypot(x - c.x, y - c.y) < r) { sea = true; break; }
      }
      // ② 항로 회랑
      if (!sea) {
        const w = lane + wob * 3.5 + fine * 1.6;
        for (const s of segs) {
          if (distToSeg(x, y, s[0], s[1], s[2], s[3]) < w) { sea = true; break; }
        }
      }
      // ③ 대륙을 굳히는 자리 — 바다가 안쪽으로 새는 것을 막는다
      if (sea) {
        for (const [x0, y0, x1, y1] of landmass) {
          if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
            // 가장자리는 잡음으로 물러 두어 자로 그은 경계가 안 생기게
            const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
            if (edge > 3 + fine * 3) sea = false;
            break;
          }
        }
      }
      // ④ 열린 바다 — 대양 쪽. 경계를 잡음으로 흔들어 사각형 티를 없앤다
      if (!sea) {
        for (const [x0, y0, x1, y1] of openSea) {
          const m = 4 + wob * 5;
          if (x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m) { sea = true; break; }
        }
      }

      land[y * VW + x] = sea ? 0 : 1;
    }
  }

  return smooth(despeckle(land));
}

/** 3×3 다수결 — 잡음이 만든 외딴 픽셀을 없앤다 */
function despeckle(src) {
  let land = src;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(land);
    for (let y = 1; y < VH - 1; y++) {
      for (let x = 1; x < VW - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) n += land[(y + dy) * VW + (x + dx)];
        }
        next[y * VW + x] = n > 4 ? 1 : n < 4 ? 0 : land[y * VW + x];
      }
    }
    land = next;
  }
  return land;
}

/** 바다 한복판에 갇힌 작은 육지 조각을 섬으로 남기고, 육지 속 웅덩이는 메운다.
    호수는 이 게임에 없다 — 배가 못 가는 물이 지도에 있으면 플레이어가 항로를 오해한다. */
function smooth(land) {
  const seen = new Uint8Array(VW * VH);
  const stack = [];
  // 가장자리에서 물을 채워 들어간다 — 닿지 않는 물이 곧 웅덩이다
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= VW || y >= VH) return;
    const i = y * VW + x;
    if (seen[i] || land[i]) return;
    seen[i] = 1; stack.push(i);
  };
  for (let x = 0; x < VW; x++) { push(x, 0); push(x, VH - 1); }
  for (let y = 0; y < VH; y++) { push(0, y); push(VW - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % VW, y = (i / VW) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  for (let i = 0; i < land.length; i++) if (!land[i] && !seen[i]) land[i] = 1;
  return land;
}

/** 바다 위에 섬을 흩는다 — 항로에서 충분히 떨어진 자리에만.
    실루엣이 밋밋해지는 것을 막는 장치다. 항로를 막지 않으므로 게임에는 영향이 없다.
    @returns [[cx,cy,rx,ry]…] — 호출부가 `ellipse`로 찍는다 */
export function scatterIsles(land, cities, routes, opts = {}) {
  const { seed = 0x15E5, count = 14 } = opts;
  const r = rng(seed);
  const byId = Object.fromEntries(cities.map((c) => [c.id, c]));
  const segs = [];
  for (const [a, b] of routes) {
    const ca = byId[a], cb = byId[b];
    if (ca && cb) segs.push([ca.x, ca.y, cb.x, cb.y]);
  }
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const x = 14 + Math.floor(r() * (VW - 28));
    const y = 14 + Math.floor(r() * (VH - 28));
    if (land[y * VW + x]) continue;                      // 육지엔 안 놓는다
    const rx = 2 + Math.floor(r() * 4), ry = 2 + Math.floor(r() * 3);
    const pad = Math.max(rx, ry) + 5;
    // 항로를 막지 않는다 — 섬이 항로 위에 앉으면 "왜 배가 섬을 지나가나"가 된다
    if (segs.some((s) => distToSeg(x, y, s[0], s[1], s[2], s[3]) < pad + 2)) continue;
    if (cities.some((c) => Math.hypot(x - c.x, y - c.y) < pad + 8)) continue;
    if (out.some((o) => Math.hypot(x - o[0], y - o[1]) < pad + 8)) continue;
    out.push([x, y, rx, ry]);
  }
  return out;
}
