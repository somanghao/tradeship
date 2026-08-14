// scene.js — 배경 스프라이트 (지중해 지도 / 항구 도시 / 외해)
// 게임 논리 해상도 400x225 기준으로 그린 뒤 정수배 확대해서 쓴다.

import { PAL as P, G, bake, outline, rng } from '../pixel.js';

export const VW = 400, VH = 225;

/* ══════════════════════════════════════════════════════════════
   1. 지중해 지도
   ══════════════════════════════════════════════════════════════ */

/* ── 지중해 수역 격자 ───────────────────────────────────────────
   100x56 저해상 격자에 "행별 바다 구간"을 적어두고 4배로 키운 뒤
   경계를 스무딩한다. 폴리곤보다 형태를 정확히 통제할 수 있다.
   x: 0=대서양 … 99=레반트 내륙 / y: 0=알프스 이북 … 55=사하라 */
const GW = 100, GH = 56, GS = 4;

const SEA_SPANS = {
  6:  [[68, 78]],                                          // 흑해
  7:  [[65, 81]],
  8:  [[63, 83]],
  9:  [[62, 84]],
  10: [[62, 83]],
  11: [[61, 80]],
  12: [[59, 63]],                                          // 보스포루스·마르마라
  13: [[56, 62]],                                          // 다르다넬스
  14: [[34, 36], [52, 60]],                                // 아드리아 북단 · 에게 북단
  15: [[33, 37], [51, 60]],
  16: [[21, 24], [32, 38], [50, 60]],                      // 리옹만
  17: [[19, 25], [31, 39], [49, 61]],
  18: [[17, 28], [35, 40], [48, 61]],                      // 리구리아해 · 아드리아
  19: [[15, 29], [35, 41], [47, 61]],
  20: [[13, 29], [36, 42], [47, 61]],
  21: [[12, 30], [36, 42], [46, 60]],
  22: [[0, 3], [11, 30], [36, 43], [47, 60]],              // 그리스 서안 43 · 동안 47
  23: [[0, 3], [10, 31], [37, 43], [47, 59]],
  24: [[0, 3], [9, 31], [37, 43], [48, 59]],
  25: [[0, 3], [8, 31], [36, 43], [48, 58]],
  26: [[0, 3], [8, 32], [37, 44], [49, 60]],               // 펠로폰네소스
  27: [[0, 3], [7, 32], [39, 45], [49, 68]],               // 풀리아 돌출 · 아나톨리아 남안 동진
  28: [[0, 3], [7, 33], [42, 78]],                         // 오트란토 해협 개통
  29: [[0, 3], [6, 33], [41, 88]],
  30: [[0, 3], [6, 34], [40, 88]],
  31: [[0, 34], [39, 88]],                                 // 지브롤터 개통
  32: [[0, 35], [39, 88]],
  33: [[0, 3], [5, 36], [40, 88]],
  34: [[0, 3], [5, 36], [40, 88]],
  35: [[0, 3], [5, 37], [41, 88]],
  36: [[0, 3], [5, 37], [42, 88]],
  37: [[0, 3], [5, 38], [43, 88]],
  38: [[0, 3], [45, 87]],                                  // 아프리카 북안 도달
  39: [[0, 3], [47, 68], [71, 86]],                        // 시르테만 · 이집트 앞바다
  40: [[0, 3], [49, 66], [73, 85]],
  41: [[0, 3], [51, 64], [75, 84]],
  42: [[0, 3], [53, 62], [77, 83]],
  43: [[0, 3], [55, 60]],
  44: [[0, 3]],
  45: [[0, 3]],
};

/* 섬 — 확대 후 좌표(400x225)로 직접 찍는다. 격자에 넣으면 스무딩에 먹힌다.
   [중심x, 중심y, 반경x, 반경y] */
const ISLES = [
  [117, 90, 5, 8],     // 코르시카
  [119, 110, 6, 11],   // 사르데냐
  [156, 147, 13, 5],   // 시칠리아
  [225, 135, 17, 3],   // 크레타
  [329, 111, 10, 3],   // 키프로스
  [85, 111, 10, 3],    // 발레아레스
  [239, 109, 3, 4],    // 로도스
  [166, 154, 2, 2],    // 몰타
  [216, 100, 3, 3],    // 에게 제도
  [226, 92, 2, 3],
  [209, 88, 3, 2],
  [232, 84, 2, 2],
  [196, 121, 3, 4],    // 이오니아 제도
  [188, 108, 2, 3],
];

/** 격자 → 확대 → 스무딩한 육지 불리언 맵 */
function buildLandMap() {
  const sea = new Uint8Array(GW * GH);
  for (const [yStr, spans] of Object.entries(SEA_SPANS)) {
    const y = +yStr;
    for (const [x0, x1] of spans) {
      for (let x = x0; x <= x1; x++) sea[y * GW + x] = 1;
    }
  }
  // 이중선형 보간으로 확대한다. 최근접으로 키우면 대각 해안이
  // 4px 톱니가 되는데, 보간하면 경계가 실수값이라 매끄럽게 떨어진다.
  const at = (gx, gy) => {
    gx = Math.max(0, Math.min(GW - 1, gx));
    gy = Math.max(0, Math.min(GH - 1, gy));
    return sea[gy * GW + gx];
  };
  const noise = rng(0x5EA0);
  const jitter = new Float32Array(VW * VH);
  for (let i = 0; i < jitter.length; i++) jitter[i] = noise();

  let land = new Uint8Array(VW * VH);
  for (let y = 0; y < VH; y++) {
    const fy = y / GS - 0.5, gy0 = Math.floor(fy), ty = fy - gy0;
    for (let x = 0; x < VW; x++) {
      const fx = x / GS - 0.5, gx0 = Math.floor(fx), tx = fx - gx0;
      const v =
        at(gx0, gy0) * (1 - tx) * (1 - ty) + at(gx0 + 1, gy0) * tx * (1 - ty) +
        at(gx0, gy0 + 1) * (1 - tx) * ty + at(gx0 + 1, gy0 + 1) * tx * ty;
      // 해안선에 미세한 요철을 섞어 자로 그은 느낌을 없앤다
      const wob = (jitter[y * VW + x] - 0.5) * 0.22;
      land[y * VW + x] = v + wob < 0.5 ? 1 : 0;
    }
  }
  // 3x3 다수결 — 보간 잔여 노이즈로 생긴 외딴 픽셀 정리
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

export function mapSprite() {
  return bake('scene:map', VW, VH, (g, ctx) => {
    const r = rng(0xC0FFEE);

    // 1) 육지 찍기
    const land = buildLandMap();
    for (let y = 0; y < VH; y++) {
      let run = -1;
      for (let x = 0; x <= VW; x++) {
        const on = x < VW && land[y * VW + x];
        if (on && run < 0) run = x;
        else if (!on && run >= 0) { g.h(y, run, x - 1, P.grnM); run = -1; }
      }
    }
    // 2) 섬
    for (const [cx, cy, rx, ry] of ISLES) g.ellipse(cx, cy, rx, ry, P.grnM);

    // 3) 육지 마스크 확보 — 이후 텍스처를 육지 안에만 찍기 위해
    const mask = ctx.getImageData(0, 0, VW, VH).data;
    const isLand = (x, y) =>
      x >= 0 && y >= 0 && x < VW && y < VH && mask[((y | 0) * VW + (x | 0)) * 4 + 3] > 0;

    // 4) 지대 색조 — 삼림 / 지중해 관목 / 사막.
    //    경계를 직선으로 두면 띠처럼 보이므로 파형으로 흔든다.
    const desertY = (x) => 152 + Math.sin(x * 0.031) * 7 + Math.sin(x * 0.011 + 2) * 6;
    const scrubY  = (x) => 78 + Math.sin(x * 0.024 + 1) * 12 + Math.sin(x * 0.009) * 9;
    const zoneOf = (x, y) => {
      if (y > desertY(x) || (x > 352 && y > 116 + Math.sin(y * 0.06) * 8)) return 'desert';
      return y > scrubY(x) ? 'scrub' : 'forest';
    };
    for (let y = 0; y < VH; y++) {
      for (let x = 0; x < VW; x++) {
        if (!isLand(x, y)) continue;
        const z = zoneOf(x, y);
        if (z === 'desert') g.px(x, y, P.sandM);
        else if (z === 'scrub') g.px(x, y, '#6f8347');
      }
    }
    // 5) 내륙 얼룩 (육지 한정)
    for (let i = 0; i < 16000; i++) {
      const x = Math.floor(r() * VW), y = Math.floor(r() * VH);
      if (!isLand(x, y)) continue;
      const v = r(), z = zoneOf(x, y);
      if (z === 'desert') {
        if (v < 0.32) g.px(x, y, P.sandD);
        else if (v < 0.48) g.px(x, y, '#d4b47c');
      } else if (v < 0.24) g.px(x, y, P.grnD);
      else if (v < 0.36) g.px(x, y, z === 'scrub' ? '#87995a' : P.grnL);
    }

    // 6) 산맥 (육지 한정)
    const ranges = [
      [[20, 124], [40, 118], [56, 112]],    // 시에라네바다
      [[24, 96], [48, 92], [66, 96]],       // 이베리아 중앙 산지
      [[54, 80], [72, 78], [86, 74]],       // 피레네
      [[92, 62], [110, 58], [126, 64]],     // 알프스
      [[126, 78], [140, 100], [154, 126]],  // 아펜니노
      [[162, 66], [176, 84], [188, 104]],   // 디나르알프스
      [[252, 100], [296, 104], [338, 102]], // 타우루스
      [[262, 74], [304, 70], [344, 74]],    // 아나톨리아 고원
      [[44, 164], [92, 168], [140, 162]],   // 아틀라스
    ];
    for (const path of ranges) {
      for (let i = 0; i < path.length - 1; i++) {
        const [x0, y0] = path[i], [x1, y1] = path[i + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= steps; s += 3) {
          const t = s / steps;
          const x = Math.round(x0 + (x1 - x0) * t + (r() - 0.5) * 5);
          const y = Math.round(y0 + (y1 - y0) * t + (r() - 0.5) * 5);
          if (!isLand(x, y) || !isLand(x, y - 3)) continue;
          const h = 2 + Math.floor(r() * 3);
          for (let k = 0; k < h; k++) {
            g.h(y - k, x - (h - k - 1), x + (h - k - 1), k === h - 1 ? '#8f8a72' : '#5d5a48');
          }
          g.px(x, y - h + 1, '#c9c4a8');
        }
      }
    }

    // 7) 해안선 → 얕은 바다 순으로 바깥으로 번지게
    outline(ctx, VW, VH, P.sandL);      // 백사장
    outline(ctx, VW, VH, '#6fc4cc');
    outline(ctx, VW, VH, P.seaL);
    outline(ctx, VW, VH, '#2c6f8c');

    // 8) 남은 빈 픽셀 = 외해
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, '#154762');
    grad.addColorStop(0.55, P.seaD);
    grad.addColorStop(1, '#0a2033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();

    // 9) 해류 결 — 바다 위에만
    const r2 = rng(0x51DE);
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(r2() * VW), y = Math.floor(r2() * VH);
      if (isLand(x, y) || isLand(x, y - 4) || isLand(x, y + 4)) continue;
      const len = 2 + Math.floor(r2() * 4);
      g.h(y, x, x + len, '#2a6d88');
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   2. 항구 도시 배경
   ══════════════════════════════════════════════════════════════ */

/* 도시 건축 양식 — 지중해 3대 권역 */
export const STYLES = {
  latin: {   // 이탈리아·프로방스: 테라코타 지붕, 종탑
    wall: ['#d8bd94', '#c9a97c', '#e3cfab'], wallD: '#a2855e',
    roof: ['#b0492f', '#983c26', '#c25a3a'], roofD: '#732b1b',
    sky: ['#3f6f9e', '#7fa8c9', '#e0cbb0'], hill: '#5c7a4a', hillD: '#3d5632',
    tower: 'campanile', accent: P.redM,
  },
  hellenic: { // 그리스·에게: 백벽, 청색 돔
    wall: ['#e8e2d2', '#d5cebb', '#f6f2e6'], wallD: '#b0a894',
    roof: ['#2f6f9e', '#255880', '#4a8fbd'], roofD: '#1a3f5c',
    sky: ['#2f6796', '#78a6c8', '#dcc9ae'], hill: '#6d7a4a', hillD: '#4a5432',
    tower: 'dome', accent: P.blueL,
  },
  levant: {  // 마그레브·레반트: 황토벽, 미나레트
    wall: ['#d9b477', '#c39c5f', '#e8cf9c'], wallD: '#9c7a45',
    roof: ['#a8905e', '#8a744a', '#c4ab72'], roofD: '#6b5834',
    sky: ['#4a6a92', '#a89a86', '#e8d0a4'], hill: '#8a7a4a', hillD: '#5f5432',
    tower: 'minaret', accent: P.grnM,
  },
};

/* 항구 씬 세로 배치
   0 ─ 하늘 ─ 78 ─ 구릉 ─ 132 ─ 시가지/성벽 ─ 150 ─ 정박 수면 ─ 186 ─ 부두 ─ 225 */
const HORIZON = 150;
const QUAY_Y = 186;

function skyGradient(ctx, S) {
  const grad = ctx.createLinearGradient(0, 0, 0, HORIZON);
  grad.addColorStop(0, S.sky[0]);
  grad.addColorStop(0.6, S.sky[1]);
  grad.addColorStop(1, S.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, HORIZON);
}

function drawHills(g, S, r) {
  // 원경 구릉 2겹
  for (let layer = 0; layer < 2; layer++) {
    const baseY = 84 + layer * 14;
    const col = layer === 0 ? S.hillD : S.hill;
    let y = baseY;
    for (let x = 0; x < VW; x++) {
      y += Math.round((r() - 0.5) * 2.2);
      const wave = Math.sin((x + layer * 60) * 0.021) * 10 + Math.sin(x * 0.007) * 6;
      const yy = Math.round(baseY + wave + (y - baseY) * 0.5);
      g.v(x, yy, HORIZON, col);
      g.px(x, yy, layer === 0 ? '#6f8a58' : '#7d9463');
    }
  }
}

/** 건물 한 채 */
function building(g, S, r, x, w, groundY, hMin, hMax) {
  const h = hMin + Math.floor(r() * (hMax - hMin));
  const top = groundY - h;
  const wall = S.wall[Math.floor(r() * S.wall.length)];
  g.r(x, top, w, h, wall);
  g.v(x, top, groundY, S.wallD);                     // 좌측 그림자면
  g.v(x + w - 1, top, groundY, S.wallD);
  // 지붕
  const roof = S.roof[Math.floor(r() * S.roof.length)];
  const flat = S.tower === 'minaret' && r() < 0.6;
  if (flat) {
    g.r(x - 1, top - 2, w + 2, 2, roof);
    g.h(top - 2, x - 1, x + w, S.roof[2]);
    for (let i = 0; i < w; i += 3) g.px(x + i, top - 3, S.wallD);   // 난간
  } else {
    const rh = 3 + Math.floor(r() * 3);
    for (let k = 0; k < rh; k++) {
      g.h(top - k, x - 1 + k, x + w - k, k === rh - 1 ? S.roof[2] : roof);
    }
    g.h(top + 1, x - 1, x + w, S.roofD);
  }
  // 창문
  const cols = Math.max(1, Math.floor((w - 3) / 4));
  const rows = Math.max(1, Math.floor((h - 4) / 5));
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const wx = x + 2 + cx * 4, wy = top + 3 + cy * 5;
      if (wx + 1 >= x + w - 1) continue;
      const lit = r() < 0.22;
      g.r(wx, wy, 2, 3, lit ? P.goldM : '#4a3a2e');
      if (lit) g.px(wx, wy, P.goldL);
      if (r() < 0.3) g.h(wy + 3, wx, wx + 1, S.wallD);   // 차양
    }
  }
  return top;
}

function landmark(g, S, r, x, groundY) {
  switch (S.tower) {
    case 'campanile': {                              // 종탑
      const w = 9, h = 62, top = groundY - h;
      g.r(x, top, w, h, S.wall[2]);
      g.v(x, top, groundY, S.wallD);
      g.v(x + w - 1, top, groundY, S.wallD);
      for (let i = 0; i < 4; i++) g.r(x + 2, top + 14 + i * 12, 2, 5, '#3f3226');
      g.r(x - 2, top - 2, w + 4, 4, S.wall[1]);       // 종실
      g.r(x, top - 12, w, 10, S.wall[0]);
      g.r(x + 3, top - 9, 3, 6, '#3a2f24');
      for (let k = 0; k < 7; k++) g.h(top - 12 - k, x + k, x + w - 1 - k, S.roof[1]);
      g.px(x + 4, top - 21, P.goldM);
      break;
    }
    case 'dome': {                                   // 돔 성당
      const w = 30, h = 26, top = groundY - h;
      g.r(x, top, w, h, S.wall[0]);
      g.h(top, x, x + w - 1, S.wall[2]);
      g.ellipse(x + w / 2, top, 13, 12, S.roof[0]);
      g.ellipse(x + w / 2 - 3, top - 1, 8, 9, S.roof[2]);
      g.ellipse(x + w / 2 + 6, top + 2, 5, 8, S.roofD);
      g.r(x + w / 2 - 1, top - 16, 2, 4, P.goldM);
      g.px(x + w / 2, top - 17, P.goldL);
      for (let i = 0; i < 4; i++) g.r(x + 3 + i * 7, top + 8, 3, 8, '#3f4a58');
      break;
    }
    case 'minaret': {                                // 미나레트 + 돔
      const w = 7, h = 68, top = groundY - h;
      g.r(x, top, w, h, S.wall[2]);
      g.v(x + w - 1, top, groundY, S.wallD);
      g.r(x - 2, top + 16, w + 4, 2, S.roof[0]);      // 발코니
      g.r(x - 2, top + 4, w + 4, 2, S.roof[0]);
      g.r(x + 1, top + 8, 2, 6, '#3f3226');
      for (let k = 0; k < 5; k++) g.h(top - k, x + k - 1, x + w - k, S.roof[1]);
      g.v(x + 3, top - 10, top - 5, P.goldM);
      g.px(x + 3, top - 11, P.goldL);
      // 옆 돔
      g.ellipse(x + 22, groundY - 16, 12, 11, S.wall[1]);
      g.ellipse(x + 19, groundY - 17, 8, 8, S.wall[2]);
      g.r(x + 10, groundY - 16, 24, 16, S.wall[0]);
      g.h(groundY - 16, x + 10, x + 33, S.wall[2]);
      break;
    }
  }
}

function drawSeaFront(g, ctx, r) {
  // 항구 수면
  const grad = ctx.createLinearGradient(0, HORIZON, 0, VH);
  grad.addColorStop(0, '#2d7a90');
  grad.addColorStop(0.5, P.seaM);
  grad.addColorStop(1, '#123c52');
  ctx.fillStyle = grad;
  ctx.fillRect(0, HORIZON, VW, VH - HORIZON);
  // 잔물결
  for (let i = 0; i < 420; i++) {
    const y = HORIZON + Math.floor(r() * (VH - HORIZON));
    const x = Math.floor(r() * VW);
    const len = 2 + Math.floor(r() * ((y - HORIZON) / 8 + 2));
    const bright = (y - HORIZON) / (VH - HORIZON);
    g.h(y, x, x + len, bright > 0.5 ? '#2a6b84' : P.seaL);
  }
}

function drawQuay(g, S, r) {
  const qy = QUAY_Y;                                 // 부두 상판
  g.r(0, qy, VW, VH - qy, P.stoneM);
  g.h(qy, 0, VW - 1, P.stoneL);
  g.h(qy + 1, 0, VW - 1, P.stoneL);
  g.h(qy + 2, 0, VW - 1, P.stoneD);
  // 석재 이음
  for (let y = qy + 4; y < VH; y += 6) {
    g.h(y, 0, VW - 1, P.stoneD);
    const off = ((y - qy) / 6) % 2 ? 6 : 0;
    for (let x = off; x < VW; x += 12) g.v(x, y, y + 5, P.stoneD);
  }
  // 계선주 + 늘어진 밧줄 — 부두 상판 위에 세운다
  const pz = qy + 9;                                 // 프롭이 놓이는 바닥선
  for (let i = 0; i < 5; i++) {
    const x = 26 + i * 88;
    g.r(x, pz - 7, 5, 8, '#4a4038');
    g.h(pz - 7, x, x + 4, '#6b5d4f');
    g.r(x - 1, pz - 8, 7, 2, '#5a4d42');
    g.px(x, pz, '#2f2a24');
    if (i < 4) {
      for (let k = 0; k <= 88; k++) {
        const t = k / 88;
        const yy = pz - 8 - Math.round(Math.sin(Math.PI * t) * 4) + 4;
        g.px(x + 2 + k, yy, '#6d5b3f');
      }
    }
  }
  // 화물 — 통과 나무상자
  const props = [[52, 'crate'], [70, 'barrel'], [80, 'barrel'], [300, 'crate'],
                 [318, 'crate'], [330, 'barrel'], [212, 'barrel']];
  for (const [x, kind] of props) {
    if (kind === 'crate') {
      g.r(x, pz - 12, 12, 12, P.woodM);
      g.h(pz - 12, x, x + 11, P.woodL);
      g.v(x + 11, pz - 12, pz - 1, P.woodD);
      g.line(x, pz - 12, x + 11, pz - 1, P.woodD);
      g.line(x + 11, pz - 12, x, pz - 1, P.woodD);
      g.h(pz, x + 1, x + 12, '#00000044');           // 접지 그림자
    } else {
      g.r(x, pz - 14, 9, 14, P.woodM);
      g.v(x, pz - 14, pz - 1, P.woodD);
      g.v(x + 8, pz - 14, pz - 1, P.woodD);
      g.px(x + 2, pz - 14, P.woodL); g.px(x + 3, pz - 14, P.woodL);
      g.h(pz - 12, x, x + 8, P.ironM);
      g.h(pz - 5, x, x + 8, P.ironM);
      g.h(pz - 14, x + 1, x + 7, P.woodL);
      g.h(pz, x + 1, x + 9, '#00000044');
    }
  }
}

export function portSprite(styleKey, seed) {
  const key = `scene:port:${styleKey}:${seed}`;
  return bake(key, VW, VH, (g, ctx) => {
    const S = STYLES[styleKey];
    const r = rng(seed);
    skyGradient(ctx, S);

    // 구름
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(r() * VW), cy = 12 + Math.floor(r() * 46);
      const w = 14 + Math.floor(r() * 26);
      g.ellipse(cx, cy, w, 3 + Math.floor(r() * 3), '#ffffff22');
      g.ellipse(cx - w / 3, cy - 2, w / 2, 3, '#f4ead6aa');
      g.ellipse(cx + w / 4, cy - 1, w / 3, 2, '#f4ead6cc');
    }
    // 갈매기
    for (let i = 0; i < 5; i++) {
      const x = 40 + Math.floor(r() * 320), y = 20 + Math.floor(r() * 40);
      g.px(x, y, '#2c2a30'); g.px(x + 1, y - 1, '#2c2a30'); g.px(x + 2, y, '#2c2a30');
      g.px(x + 3, y - 1, '#2c2a30'); g.px(x + 4, y, '#2c2a30');
    }

    drawHills(g, S, r);

    // 시가지 — 뒤쪽(작고 어두움) → 앞쪽(크고 밝음) 3열
    for (let row = 0; row < 3; row++) {
      const groundY = 112 + row * 10;
      const hMin = 14 + row * 7, hMax = 32 + row * 13;
      let x = -4 + Math.floor(r() * 6);
      while (x < VW + 4) {
        const w = 8 + Math.floor(r() * 16);
        building(g, S, r, x, w, groundY, hMin, hMax);
        x += w + (r() < 0.7 ? 1 : 3);
      }
      // 뒤 열은 대기원근으로 살짝 퍼뜨린다
      if (row < 2) {
        ctx.save();
        ctx.globalAlpha = row === 0 ? 0.30 : 0.14;
        ctx.fillStyle = S.sky[1];
        ctx.fillRect(0, 0, VW, groundY);
        ctx.restore();
      }
    }

    landmark(g, S, r, 300, 134);
    landmark(g, S, r, 54, 130);

    // 해안 성벽 — 밑동이 물에 잠기도록 수면선에 걸친다
    g.r(0, 134, VW, 18, P.stoneM);
    g.h(134, 0, VW - 1, P.stoneL);
    g.h(135, 0, VW - 1, P.stoneL);
    g.h(151, 0, VW - 1, P.stoneD);
    for (let x = 0; x < VW; x += 10) {               // 총안
      g.r(x, 130, 6, 5, P.stoneM);
      g.h(130, x, x + 5, P.stoneL);
    }
    for (let x = 4; x < VW; x += 16) g.r(x, 139, 2, 5, '#3c3833');
    for (let x = 0; x < VW; x += 7) g.px(x, 148, P.stoneD);   // 이끼 낀 하부
    // 수문 — 아치가 수면에 닿는다
    g.r(186, 132, 28, 20, P.stoneD);
    g.h(132, 186, 213, P.stoneL);
    g.ellipse(200, 146, 10, 11, '#241f1c');
    g.r(190, 146, 20, 6, '#241f1c');
    // 부두로 이어지는 방파제 기둥
    for (const bx of [96, 288]) {
      g.r(bx, 138, 8, 14, P.stoneM);
      g.h(138, bx, bx + 7, P.stoneL);
      g.r(bx - 1, 135, 10, 3, P.stoneL);
    }

    drawSeaFront(g, ctx, r);
    drawQuay(g, S, r);
  });
}

/* ══════════════════════════════════════════════════════════════
   3. 외해 (전투/항해 연출용)
   ══════════════════════════════════════════════════════════════ */
export function openSeaSprite(mood = 'day') {
  const key = `scene:sea:${mood}`;
  return bake(key, VW, VH, (g, ctx) => {
    const r = rng(mood === 'day' ? 0xBEEF : 0xDEAD);
    const hz = 96;
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    if (mood === 'dusk') {
      sky.addColorStop(0, '#2b3560'); sky.addColorStop(0.5, '#8a5a72'); sky.addColorStop(1, '#e0a06a');
    } else if (mood === 'storm') {
      sky.addColorStop(0, '#232838'); sky.addColorStop(0.6, '#464e60'); sky.addColorStop(1, '#6b7280');
    } else {
      sky.addColorStop(0, '#2f6796'); sky.addColorStop(0.62, '#7fb0d0'); sky.addColorStop(1, '#cfe0e8');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, hz);

    // 구름층
    const cloudCol = mood === 'storm' ? '#3a4152' : mood === 'dusk' ? '#c98a80' : '#f2ead9';
    for (let i = 0; i < 12; i++) {
      const cx = Math.floor(r() * VW), cy = 8 + Math.floor(r() * 60);
      const w = 16 + Math.floor(r() * 34);
      g.ellipse(cx, cy, w, 3 + Math.floor(r() * 4), cloudCol + 'aa');
      g.ellipse(cx - w / 3, cy - 2, w / 2, 3, cloudCol);
    }

    // 바다
    const sea = ctx.createLinearGradient(0, hz, 0, VH);
    if (mood === 'storm') {
      sea.addColorStop(0, '#2c4656'); sea.addColorStop(0.5, '#1d3a4a'); sea.addColorStop(1, '#0e222e');
    } else if (mood === 'dusk') {
      sea.addColorStop(0, '#4a5878'); sea.addColorStop(0.5, '#2a4460'); sea.addColorStop(1, '#101f33');
    } else {
      sea.addColorStop(0, '#3f93ab'); sea.addColorStop(0.45, P.seaM); sea.addColorStop(1, '#0e2c40');
    }
    ctx.fillStyle = sea;
    ctx.fillRect(0, hz, VW, VH - hz);
    g.h(hz, 0, VW - 1, mood === 'day' ? '#a8d4dc' : '#7a8a9a');

    // 원근에 따라 길고 굵어지는 물결
    const foam = mood === 'storm' ? '#8fa4ae' : P.seaH;
    for (let i = 0; i < 700; i++) {
      const t = r() ** 1.7;
      const y = Math.floor(hz + 2 + t * (VH - hz - 2));
      const x = Math.floor(r() * VW);
      const len = 1 + Math.floor(t * 9);
      const c = r() < 0.28 ? foam : (r() < 0.5 ? P.seaL : '#155066');
      g.h(y, x, x + len, c);
      if (len > 5 && r() < 0.4) g.h(y + 1, x + 1, x + len - 1, '#12384c');
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   4. 이펙트
   ══════════════════════════════════════════════════════════════ */

/** 포연 — r 단계별 */
export function smokeSprite(stage) {
  const key = `fx:smoke:${stage}`;
  const S = 40;
  return bake(key, S, S, (g) => {
    const r = rng(0x5A0 + stage);
    const rad = 5 + stage * 4;
    const shade = ['#e8e4dc', '#c9c4bc', '#a49f98', '#7d7973'];
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * rad;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.85;
      const rr = Math.max(1, rad * 0.42 * (1 - d / (rad + 1)) + r() * 2);
      g.ellipse(x, y, rr, rr * 0.9, shade[Math.min(3, Math.floor(d / rad * 3 + r()))]);
    }
  });
}

/** 폭발 — 4프레임 */
export function blastSprite(frame) {
  const key = `fx:blast:${frame}`;
  const S = 44;
  return bake(key, S, S, (g) => {
    const r = rng(0xB1A57 + frame);
    const rad = 4 + frame * 5;
    const cols = frame < 2
      ? ['#fff6d0', P.goldL, P.goldM, '#e07030']
      : [P.goldM, '#d4642a', '#8a3c1e', '#5c4238'];
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2, d = r() ** 0.6 * rad;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d;
      const rr = Math.max(1, rad * 0.4 * (1 - d / (rad + 1)) + r() * 2);
      g.ellipse(x, y, rr, rr, cols[Math.min(3, Math.floor(d / rad * 3.2))]);
    }
    if (frame < 2) g.ellipse(S / 2, S / 2, rad * 0.4, rad * 0.4, '#fffdf2');
    // 파편
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = rad + r() * 6;
      g.px(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, P.woodD);
    }
  });
}

/** 물기둥 (빗나간 포탄) */
export function splashSprite(frame) {
  const key = `fx:splash:${frame}`;
  const W = 24, H = 34;
  return bake(key, W, H, (g) => {
    const r = rng(0x5915 + frame);
    const h = 8 + frame * 7;
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const w = Math.round((3 + frame) * (1 - t * 0.55));
      const yy = H - 2 - y;
      g.h(yy, W / 2 - w, W / 2 + w, t < 0.4 ? '#bfe4e8' : P.seaH);
      if (r() < 0.5) g.px(W / 2 + Math.round((r() - 0.5) * w * 3), yy, '#e8f6f8');
    }
    for (let i = 0; i < 10; i++) {                    // 흩어지는 물방울
      const a = -Math.PI * r(), d = h * (0.5 + r() * 0.6);
      g.px(W / 2 + Math.cos(a) * d * 0.8, H - 4 + Math.sin(a) * d * 0.5, '#d4eef2');
    }
    g.ellipse(W / 2, H - 3, 6 + frame, 2, '#9fd8dc');
  });
}

/** 포탄 */
export function ballSprite() {
  return bake('fx:ball', 6, 6, (g) => {
    g.ellipse(3, 3, 2, 2, P.ironM);
    g.ellipse(2, 2, 1, 1, P.ironL);
    g.px(4, 4, P.ironD);
  });
}

/** 갑판 대포 (백병전/포격 UI용, 측면) */
/* 대포 3종 — 포신 길이와 포가 크기로 종류가 구별된다.
   data.js의 CANNONS와 키를 맞춘다(경포/중포/장포). */
const CANNON_ART = {
  light:  { w: 32, barrel: 13, carriage: 15, wheel: 2 },
  medium: { w: 40, barrel: 20, carriage: 20, wheel: 3 },
  long:   { w: 48, barrel: 30, carriage: 24, wheel: 3 },
};
export const CANNON_ART_KEYS = Object.keys(CANNON_ART);

export function cannonSprite(kind = 'medium', recoil = 0) {
  const A = CANNON_ART[kind] || CANNON_ART.medium;
  return bake(`fx:cannon:${kind}:${recoil}`, A.w, 24, (g, ctx) => {
    const x = 6 - recoil;
    const bEnd = x + 7 + A.barrel;                   // 포신 끝
    const cEnd = x + 2 + A.carriage;                 // 포가 끝
    // 포신
    g.r(x + 8, 8, A.barrel, 6, P.ironM);
    g.h(8, x + 8, bEnd, P.ironL);
    g.h(13, x + 8, bEnd, P.ironD);
    g.r(bEnd - 1, 7, 3, 8, P.ironM);                 // 포구 링
    g.h(7, bEnd - 1, bEnd + 1, P.ironL);
    g.r(x + 5, 7, 5, 8, P.ironD);                    // 약실
    g.ellipse(x + 5, 11, 3, 4, P.ironM);
    g.px(x + 3, 9, P.ironL);
    // 포가
    g.poly([[x + 2, 15], [cEnd, 15], [cEnd - 4, 21], [x + 4, 21]], P.woodM);
    g.h(15, x + 2, cEnd - 1, P.woodL);
    g.h(20, x + 4, cEnd - 4, P.woodD);
    for (const wx of [x + 7, cEnd - 5]) {            // 바퀴
      g.ellipse(wx, 20, A.wheel + 1, A.wheel, P.woodD);
      g.ellipse(wx, 20, A.wheel, A.wheel - 1, P.woodM);
    }
    outline(ctx, A.w, 24);
  });
}
