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
//
// ── 무엇을 바다로 하는가 (우선순위 순) ────────────────────────
//   ① 항로 회랑    — 배가 지나는 길은 반드시 바다다. 아무것도 이것을 덮지 못한다.
//   ② 항구 앞바다  — **항로가 나가는 쪽만** 연다(아래 ★).
//   ③ openSea      — 대양 쪽. 이것이 없으면 지도가 "항로를 따라 난 운하"가 된다.
//   ④ landmass     — 통째로 뭍인 자리. ①②를 **덮지 못한다**(덮으면 항구가 내륙에 갇힌다).
//
// ★ 항구 앞바다를 원형으로 파면 안 된다 — 처음에 그렇게 만들었다가 검수에서 드러났다.
//   원형으로 파면 항구가 물가에 서는 게 아니라 **호수 한가운데 떠 있는 섬**이 된다.
//   항구는 뭍과 물이 만나는 자리다. 그래서 그 도시에서 **항로가 나가는 방향으로만** 열고
//   반대쪽은 뭍으로 남긴다. 그러면 해안선이 저절로 생기고 항구가 그 위에 앉는다.
//
//   ★ 이 코드가 그린 결과는 `tools/gen-map-png.mjs`가 PNG로 뽑아 `assets/map/`에 굳혀 두었고,
//   게임은 그 PNG를 쓴다(`assets/manifest.json`). 여기는 **그 PNG를 만드는 자리**이자
//   팩이 없을 때의 폴백이다 — 좌표를 옮겼으면 반드시 다시 뽑아야 한다.
//   사람이 그린 지도가 오면 `assets/manifest.json`으로
//   갈아 끼운다 — 그때 이 그림이 그대로 발주용 기준판이 된다(좌표가 이미 맞으므로).
//   검수는 `mapcheck.html`이 한다(항구가 물가인가 · 항로가 바다인가 · 이름표가 겹치는가).

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

/** 도시·항로에서 선분 목록과 항구별 "바다가 열린 방향"을 뽑는다 */
function topology(cities, routes) {
  const byId = Object.fromEntries(cities.map((c) => [c.id, c]));
  const segs = [];
  const dirs = {};
  for (const c of cities) dirs[c.id] = [];
  for (const [a, b] of routes) {
    const ca = byId[a], cb = byId[b];
    if (!ca || !cb) continue;
    segs.push([ca.x, ca.y, cb.x, cb.y]);
    const d = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
    dirs[a].push([(cb.x - ca.x) / d, (cb.y - ca.y) / d]);
    dirs[b].push([(ca.x - cb.x) / d, (ca.y - cb.y) / d]);
  }
  return { byId, segs, dirs };
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
 *   openSea   [[x0,y0,x1,y1]…] 통째로 바다인 사각형 — **대양 쪽을 열어 두는 자리**
 *   landmass  [[x0,y0,x1,y1]…] 통째로 육지인 사각형 — 대륙 안쪽을 굳혀 만을 막는다.
 *             ★ 항로 회랑과 항구 앞바다는 **덮지 못한다**(덮으면 항구가 내륙에 갇힌다).
 * @returns Uint8Array(VW*VH) — 1이면 육지
 */
export function autoLandMap(cities, routes, opts = {}) {
  const {
    seed = 0xA11A5, lane = 8, bay = 9, openSea = [], landmass = [],
  } = opts;

  const { segs, dirs } = topology(cities, routes);

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

      // ① 항로 회랑 — 아무것도 이것을 덮지 못한다
      let core = false;
      const w = lane + wob * 3.5 + fine * 1.6;
      for (const s of segs) {
        if (distToSeg(x, y, s[0], s[1], s[2], s[3]) < w) { core = true; break; }
      }

      // ② 항구 앞바다 — **항로가 나가는 쪽만** 연다
      if (!core) {
        for (const c of cities) {
          const dx = x - c.x, dy = y - c.y;
          const dist = Math.hypot(dx, dy);
          const r = bay * (0.8 + (c.size ?? 2) * 0.16) + wob * 3 + fine * 1.5;
          if (dist > r) continue;
          const dl = dirs[c.id];
          if (!dl.length) { core = true; break; }        // 외딴 항구는 그냥 둘레를 판다
          if (dist < 2.5) { core = true; break; }        // 항구 바로 앞은 늘 물이다
          const ux = dx / dist, uy = dy / dist;
          // 항로 방향과 이루는 각이 100도 안쪽이면 바다 쪽이다
          if (dl.some(([vx, vy]) => vx * ux + vy * uy > -0.17)) { core = true; break; }
        }
      }

      let sea = core;

      // ③ 열린 바다 — 대양 쪽. 경계를 잡음으로 흔들어 사각형 티를 없앤다
      if (!sea) {
        for (const [x0, y0, x1, y1] of openSea) {
          const m = 4 + wob * 5;
          if (x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m) { sea = true; break; }
        }
      }
      // ④ 대륙을 굳히는 자리 — 단, 항로·항구 앞바다(core)는 못 지운다
      if (sea && !core) {
        /* ★ 경계를 **바깥으로** 번지게 한다. 예전에는 안쪽으로 물렸는데(`edge > 3+fine*3`),
           그러면 사각형 가장자리 3~6px이 늘 물로 남는다 — 대륙을 계단 사각형 여러 장으로
           쌓으면 **장과 장 사이가 줄무늬 바다로 벌어진다.** 남아메리카가 가로줄 친 대륙으로
           보였던 것이 이것이다. 바깥으로 번지면 이웃 사각형과 저절로 이어지고,
           잡음이 실려 자로 그은 티도 안 난다. */
        const m = 3 + fine * 3.5;
        for (const [x0, y0, x1, y1] of landmass) {
          if (x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m) { sea = false; break; }
        }
      }

      /* ⑤ 항구 **뒤편**은 뭍이다 — 이것이 마지막이고 무엇보다 세다.
         ★ 앞의 규칙들만으로는 부족했다. 항로 회랑이 항구를 통과하므로 항구 둘레가
           결국 사방 다 물이 되어, 항구가 물가가 아니라 **물 한가운데** 서 있었다
           (검수 페이지가 "바다 한복판"으로 잡아냈다). 항구는 뭍에 붙어 있어야 항구다.
         그래서 그 도시의 **모든 항로 방향과 등지는 쪽**을 뭍으로 되돌린다.
         이웃이 사방에 있는 도시는 되돌릴 자리가 없어 섬이 되는데, 그것은 옳다 —
         실제로 그런 항구는 섬이거나 곶이다. */
      if (sea) {
        for (const c of cities) {
          const dx = x - c.x, dy = y - c.y;
          const dist = Math.hypot(dx, dy);
          const back = bay * 1.7 + wob * 3;
          if (dist > back || dist < 2.5) continue;
          const dl = dirs[c.id];
          if (!dl.length) continue;
          const ux = dx / dist, uy = dy / dist;
          // 모든 항로 방향과 110도 넘게 벌어졌으면 배가 갈 일이 없는 쪽 = 뭍
          if (dl.every(([vx, vy]) => vx * ux + vy * uy < -0.34)) { sea = false; break; }
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

/** 육지 속에 갇힌 물웅덩이를 메운다.
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
  /* ★ 여기서 메우는 것은 **가장자리에 닿지 않는 물**이다. 항로로 판 물길은 대개
     지도 밖까지 이어지지 않으므로 그대로 메워질 수 있다 — 그래서 이 함수는
     **호수가 될 만큼 작은 것만** 지운다. 큰 내해(지중해 같은)를 통째로 메우면 안 된다. */
  const pool = [];
  const mark = new Uint8Array(VW * VH);
  for (let i = 0; i < land.length; i++) {
    if (land[i] || seen[i] || mark[i]) continue;
    // 이 웅덩이의 크기를 잰다
    const cells = [i]; mark[i] = 1;
    for (let k = 0; k < cells.length; k++) {
      const j = cells[k], x = j % VW, y = (j / VW) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= VW || ny >= VH) continue;
        const n = ny * VW + nx;
        if (land[n] || mark[n]) continue;
        mark[n] = 1; cells.push(n);
      }
    }
    if (cells.length < 90) pool.push(...cells);     // 90px 미만이면 웅덩이로 본다
  }
  for (const i of pool) land[i] = 1;
  return land;
}

/** 바다 위에 섬을 흩는다 — 항로에서 충분히 떨어진 자리에만.
    실루엣이 밋밋해지는 것을 막는 장치다. 항로를 막지 않으므로 게임에는 영향이 없다.
    @returns [[cx,cy,rx,ry]…] — 호출부가 `ellipse`로 찍는다 */
export function scatterIsles(land, cities, routes, opts = {}) {
  const { seed = 0x15E5, count = 14 } = opts;
  const r = rng(seed);
  const { segs } = topology(cities, routes);
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

/**
 * 손으로 찍은 격자에 **항구와 항로만 파낸다.**
 *
 * ★ 지중해는 실루엣이 눈에 익어 손으로 찍은 격자를 그대로 쓴다. 그런데 그 격자는
 *   열여섯 항구에 맞춰 찍은 것이라, 나중에 라구사·키오스·파마구스타를 넣자
 *   **새 항구가 뭍 한복판에 앉았다**(검수 페이지가 잡아냈다).
 *   격자를 통째로 다시 찍는 것은 실루엣을 잃는 일이고, 도시 좌표를 지형에 맞춰 비트는 것은
 *   이 프로젝트가 지도 외주에서 두 번 실패하며 하지 않기로 한 바로 그것이다.
 *   그래서 **지형은 두고 물길만 판다** — 최소한으로.
 *
 * @param land  landFromSpans가 만든 육지 맵 (제자리에서 고친다)
 */
export function carveHarbors(land, cities, routes, opts = {}) {
  const { seed = 0xC0A57, lane = 4.5, bay = 5.5 } = opts;
  const { segs, dirs } = topology(cities, routes);
  const n = valueNoise(seed, 9);

  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      if (!land[y * VW + x]) continue;              // 이미 바다면 둘 것 없다
      const wob = (n(x, y) - 0.5) * 2;

      // 항로 — 배가 지나는 길은 반드시 물이어야 한다
      const w = lane + wob * 1.8;
      let cut = segs.some((s) => distToSeg(x, y, s[0], s[1], s[2], s[3]) < w);

      // 항구 앞바다 — 항로가 나가는 쪽만. 뒤편은 뭍으로 남겨 물가가 되게 한다
      if (!cut) {
        for (const c of cities) {
          const dx = x - c.x, dy = y - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist > bay + wob * 2) continue;
          const dl = dirs[c.id];
          if (!dl.length || dist < 2) { cut = true; break; }
          const ux = dx / dist, uy = dy / dist;
          if (dl.some(([vx, vy]) => vx * ux + vy * uy > 0)) { cut = true; break; }
        }
      }
      if (cut) land[y * VW + x] = 0;
    }
  }

  /* ── 2차: **아직 막힌 항로만** 더 판다 ─────────────────────
     ★ 손으로 찍은 격자에서는 한 번 파는 것으로 안 뚫리는 구간이 남는다 —
       사르데냐를 지나는 알게로~제노바(육지 75%)와 시칠리아 해협의 팔레르모~튀니스(61%)가
       그랬다. 회랑 폭을 통째로 키우면 멀쩡한 해안까지 깎이므로, **막힌 선만 골라** 넓힌다.
       그래서 나중에 도시를 더 넣어도 그 선만 저절로 뚫린다. */
  for (let pass = 0; pass < 3; pass++) {
    let fixed = 0;
    for (const seg of segs) {
      const n = Math.max(1, Math.round(Math.hypot(seg[2] - seg[0], seg[3] - seg[1])));
      let onLand = 0;
      for (let i = 3; i < n - 2; i++) {
        const t = i / n;
        const x = Math.round(seg[0] + (seg[2] - seg[0]) * t);
        const y = Math.round(seg[1] + (seg[3] - seg[1]) * t);
        if (land[y * VW + x]) onLand++;
      }
      if (onLand / Math.max(1, n - 5) <= 0.30) continue;    // 이미 지날 만하다

      // 이 선을 따라 좁은 물길을 낸다(폭 3~4px). 실루엣을 최소로 깎는다
      const w = 3 + pass;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const cx = seg[0] + (seg[2] - seg[0]) * t;
        const cy = seg[1] + (seg[3] - seg[1]) * t;
        for (let dy = -w; dy <= w; dy++) {
          for (let dx = -w; dx <= w; dx++) {
            if (dx * dx + dy * dy > w * w) continue;
            const x = Math.round(cx + dx), y = Math.round(cy + dy);
            if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
            land[y * VW + x] = 0;
          }
        }
      }
      fixed++;
    }
    if (!fixed) break;
  }
  return land;
}
