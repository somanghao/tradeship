// pixel.js — 픽셀아트 드로잉 코어
// 모든 스프라이트는 논리 픽셀 그리드(1u = 1px)에 그린 뒤 정수배로 확대한다.

import { overrideFor } from './assets.js';

/* ── 공용 팔레트 ────────────────────────────────────────────────
   각 색군은 D(그림자) / M(기본) / L(하이라이트) 3톤 + 공용 아웃라인.
   난잡함을 막기 위해 스프라이트는 반드시 이 표에서만 색을 고른다. */
export const PAL = {
  out:    '#17121c', // 아웃라인 (순검정 대신 보라기 섞인 먹색)
  out2:   '#2a2230', // 내부 구획선 (약한 아웃라인)

  woodD:  '#3d2a1b', woodM:  '#6b4626', woodL:  '#9c6b38', woodH: '#c99a5c',
  skinD:  '#8a5334', skinM:  '#c58a5c', skinL:  '#e6b487',
  skin2D: '#5d3520', skin2M: '#8f5b34', skin2L: '#b8825a', // 어두운 피부톤

  steelD: '#3f4a5c', steelM: '#7d8ca3', steelL: '#c3cede',
  ironD:  '#2c2f36', ironM:  '#565c68', ironL:  '#8b93a1',
  goldD:  '#8a641a', goldM:  '#d2a52a', goldL:  '#f4dd86',

  redD:   '#711d29', redM:   '#b8323a', redL:   '#e06053',
  blueD:  '#1b3350', blueM:  '#2f5d8c', blueL:  '#5d9ec9',
  grnD:   '#26432a', grnM:   '#456f39', grnL:   '#79a44f',
  purD:   '#3a2044', purM:   '#61356b', purL:   '#9159a0',

  clothD: '#a89a84', clothM: '#ded2b8', clothL: '#f7f0dd', // 돛/셔츠
  stoneD: '#443f3c', stoneM: '#6f6961', stoneL: '#a49b8a',
  seaD:   '#0e2a40', seaM:   '#1b5570', seaL:   '#3f93ab', seaH: '#8fd3d8',
  skyD:   '#2b4a72', skyM:   '#6f93bb', skyL:   '#c2d5e4',
  sandD:  '#8a6a44', sandM:  '#c2a06a', sandL:  '#e6cd9a',
  blackM: '#231d29', whiteM: '#f7f0dd',
};

/* ── 그리기 헬퍼 ────────────────────────────────────────────────
   문자열 픽셀맵 대신 좌표 DSL을 쓴다. 행 길이 어긋남 같은 실수가 없고
   파츠 단위 재사용/색 교체가 쉽다. */
export class G {
  constructor(ctx) { this.c = ctx; }
  px(x, y, col) { this.c.fillStyle = col; this.c.fillRect(x | 0, y | 0, 1, 1); }
  r(x, y, w, h, col) { this.c.fillStyle = col; this.c.fillRect(x | 0, y | 0, w | 0, h | 0); }
  /** 수평선 x0..x1 포함 */
  h(y, x0, x1, col) { this.r(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, col); }
  /** 수직선 y0..y1 포함 */
  v(x, y0, y1, col) { this.r(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, col); }
  /** 브레젠험 직선 */
  line(x0, y0, x1, y1, col) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** 채워진 타원 (중심 cx,cy / 반지름 rx,ry) */
  ellipse(cx, cy, rx, ry, col) {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      if (w >= 0) this.h(cy + y, cx - w, cx + w, col);
    }
  }
  /** 다각형 채우기 (스캔라인) */
  poly(pts, col) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, py] of pts) { if (py < minY) minY = py; if (py > maxY) maxY = py; }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        this.h(y, Math.round(xs[i]), Math.round(xs[i + 1]) - 1, col);
      }
    }
  }
  /** 사각형 테두리 */
  box(x, y, w, h, col) {
    this.h(y, x, x + w - 1, col); this.h(y + h - 1, x, x + w - 1, col);
    this.v(x, y, y + h - 1, col); this.v(x + w - 1, y, y + h - 1, col);
  }
}

/* ── 결정론적 난수 ──────────────────────────────────────────────
   배경의 창문·돌·파도 배치를 매 프레임 흔들리지 않게 고정한다. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/* ── 스프라이트 베이킹 ──────────────────────────────────────────
   draw(g, opts) 를 1배 오프스크린 캔버스에 한 번만 그려 캐시한다.

   여기가 **모든 스프라이트가 지나가는 한 곳**이다. 그래서 에셋 팩(`js/assets.js`)이
   같은 key로 이미지를 등록해 두었으면 그리지 않고 그것을 쓴다 — 그림을 PNG로
   갈아 끼우는 데 sprites/ 코드를 고칠 필요가 없다. */
const cache = new Map();
const bakedKeys = new Map();   // key -> {w, h}  미리보기에서 "어떤 키가 있는지" 보여주는 데 쓴다
const keyByCanvas = new WeakMap();   // 구워진 캔버스 -> key (미리보기가 키를 되짚는 데 쓴다)

export function bake(key, w, h, draw) {
  const hit = cache.get(key);
  if (hit) return hit;
  bakedKeys.set(key, { w, h });

  const ov = overrideFor(key);
  if (ov) {
    if (ov.width !== w || ov.height !== h) {
      console.warn(`[assets] '${key}' 규격이 다르다 — 코드 기준 ${w}×${h}, 넣은 그림 ${ov.width}×${ov.height}. `
        + '앵커(수면선·발밑)가 어긋날 수 있다.');
    }
    cache.set(key, ov);
    keyByCanvas.set(ov, key);
    return ov;
  }

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(new G(ctx), ctx);
  cache.set(key, cv);
  keyByCanvas.set(cv, key);
  return cv;
}

/** 캐시 무효화 (에셋 미리보기에서 핫리로드용) */
export function clearCache() { cache.clear(); }

/** 지금까지 구워진 스프라이트 키와 규격 — 에셋 팩 manifest를 쓸 때 이 목록을 본다 */
export function knownKeys() { return [...bakedKeys.entries()].map(([key, s]) => ({ key, ...s })); }

/** 구워진 캔버스가 어떤 키였는지 — 미리보기에서 그림 밑에 키를 적는 데 쓴다 */
export function keyOf(canvas) { return keyByCanvas.get(canvas) || null; }

/* ── 자동 외곽선 ────────────────────────────────────────────────
   불투명 픽셀에 인접한 빈 픽셀을 1px 아웃라인으로 채운다.
   실루엣을 손으로 두르지 않아도 되고, 두께가 항상 균일해진다.
   (스프라이트 가장자리에 최소 1px 여백을 남겨둘 것) */
export function outline(ctx, w, h, col = PAL.out) {
  const src = ctx.getImageData(0, 0, w, h);
  const a = src.data;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : a[(y * w + x) * 4 + 3];
  const hits = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(x, y) !== 0) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) hits.push([x, y]);
    }
  }
  ctx.fillStyle = col;
  for (const [x, y] of hits) ctx.fillRect(x, y, 1, 1);
}

/** 베이크된 스프라이트를 정수배로 확대해 그린다. flip=true면 좌우 반전. */
export function blit(ctx, sprite, x, y, scale = 1, flip = false, alpha = 1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  const w = sprite.width * scale, h = sprite.height * scale;
  if (flip) {
    ctx.translate((x | 0) + w, y | 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, w, h);
  } else {
    ctx.drawImage(sprite, x | 0, y | 0, w, h);
  }
  ctx.restore();
}

/** 실루엣만 단색으로 (피격 플래시) */
export function blitTinted(ctx, sprite, x, y, scale, flip, color) {
  const key = `__tint:${color}:${sprite.width}x${sprite.height}`;
  const cv = document.createElement('canvas');
  cv.width = sprite.width; cv.height = sprite.height;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(sprite, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, cv.width, cv.height);
  void key;
  blit(ctx, cv, x, y, scale, flip);
}
