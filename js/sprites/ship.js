// ship.js — 선박 스프라이트
//  · 측면 뷰(전투/항구용): 176x128
//  · 탑다운 뷰(지도용):    28x28
// 선체는 좌표를 일일이 찍지 않고 현호(sheer)/용골(keel) 곡선 함수로 생성한다.
// 덕분에 선종별 비례만 바꿔도 실루엣이 자연스럽게 달라진다.

import { PAL as P, G, bake, outline, rng } from '../pixel.js';

export const SW = 176, SH = 128;
export const WATERLINE = 104;      // 측면 뷰에서 수면이 닿는 y

/* ── 진영 색 ──────────────────────────────────────────────── */
export const FLAGS = {
  venice:  { field: P.redM,   fieldD: P.redD,   mark: P.goldM },
  genoa:   { field: P.clothL, fieldD: P.clothD, mark: P.redM },
  spain:   { field: P.goldM,  fieldD: P.goldD,  mark: P.redM },
  ottoman: { field: P.grnM,   fieldD: P.grnD,   mark: P.clothL },
  france:  { field: P.blueM,  fieldD: P.blueD,  mark: P.goldL },   // 부르봉 백합
  england: { field: P.clothL, fieldD: P.clothD, mark: P.blueM },
  pirate:  { field: '#1d1a24', fieldD: '#000000', mark: P.clothL },
  // 성 요한 기사단(로도스) — 붉은 바탕에 흰 십자. 베네치아도 붉은 바탕이지만 마크가 금색이라 갈린다.
  hospitaller: { field: P.redM, fieldD: P.redD, mark: P.clothL },
  // 하프스 왕조(튀니스) — 흰 바탕에 검은 초승달. 오스만(녹색)과 구별된다.
  hafsid:      { field: P.clothL, fieldD: P.clothD, mark: P.blackM },
};

/* ── 선종 정의 ────────────────────────────────────────────── */
export const HULLS = {
  /* 시작배. 작고 뭉툭하고 삭았다 — worn이 켜지면 덧댄 판자와 물자국을 그린다. */
  hulk: {
    name: '낡은 바사', len: 84, x0: 44, deck: 88, depth: 13,
    sheerAft: 9, sheerFore: 6, aftCastle: 9, foreCastle: 4,
    masts: [{ at: 0.34, h: 40, sail: 'square' }, { at: 0.70, h: 32, sail: 'lateen' }],
    ports: 2, oars: false, worn: true,
  },
  caravel: {
    name: '카라벨', len: 108, x0: 30, deck: 84, depth: 15,
    sheerAft: 13, sheerFore: 7, aftCastle: 14, foreCastle: 5,
    masts: [{ at: 0.30, h: 54, sail: 'lateen' }, { at: 0.62, h: 46, sail: 'lateen' }],
    ports: 3, oars: false,
  },
  carrack: {
    name: '캐랙', len: 124, x0: 24, deck: 82, depth: 18,
    sheerAft: 16, sheerFore: 11, aftCastle: 22, foreCastle: 15,
    masts: [{ at: 0.24, h: 44, sail: 'lateen' }, { at: 0.50, h: 66, sail: 'square' }, { at: 0.76, h: 50, sail: 'square' }],
    ports: 5, oars: false,
  },
  galleon: {
    name: '갈레온', len: 138, x0: 20, deck: 80, depth: 20,
    sheerAft: 18, sheerFore: 10, aftCastle: 24, foreCastle: 10,
    masts: [{ at: 0.22, h: 50, sail: 'lateen' }, { at: 0.48, h: 68, sail: 'square' }, { at: 0.74, h: 58, sail: 'square' }],
    ports: 7, oars: false,
  },
  galley: {
    name: '갤리', len: 140, x0: 18, deck: 90, depth: 11,
    sheerAft: 10, sheerFore: 6, aftCastle: 10, foreCastle: 4,
    masts: [{ at: 0.42, h: 52, sail: 'lateen' }],
    ports: 2, oars: true, ram: true,
  },
  brig: {
    name: '브리간틴', len: 116, x0: 28, deck: 86, depth: 14,
    sheerAft: 11, sheerFore: 8, aftCastle: 12, foreCastle: 6,
    masts: [{ at: 0.34, h: 58, sail: 'square' }, { at: 0.66, h: 50, sail: 'lateen' }],
    ports: 4, oars: false,
  },
  /* 네덜란드 화물선 — 배가 불룩하고 선미가 높다. 포문은 셋뿐. */
  fluyt: {
    name: '플류트', len: 118, x0: 26, deck: 84, depth: 20,
    sheerAft: 15, sheerFore: 8, aftCastle: 18, foreCastle: 4,
    masts: [{ at: 0.26, h: 48, sail: 'square' }, { at: 0.52, h: 62, sail: 'square' },
            { at: 0.78, h: 40, sail: 'lateen' }],
    ports: 3, oars: false,
  },
  /* 전투 프리깃 — 선루를 걷어내 낮고 길다. 그래서 빠르게 보인다. */
  frigate: {
    name: '블랙월 프리깃', len: 140, x0: 18, deck: 88, depth: 14,
    sheerAft: 8, sheerFore: 5, aftCastle: 8, foreCastle: 3,
    masts: [{ at: 0.24, h: 58, sail: 'square' }, { at: 0.50, h: 68, sail: 'square' },
            { at: 0.76, h: 56, sail: 'square' }],
    ports: 6, oars: false,
  },
  /* 대형 무장 상선 — 선미루가 높고 마스트가 넷. */
  indiaman: {
    name: '인디아맨', len: 146, x0: 16, deck: 82, depth: 19,
    sheerAft: 15, sheerFore: 9, aftCastle: 20, foreCastle: 8,
    masts: [{ at: 0.18, h: 46, sail: 'square' }, { at: 0.42, h: 66, sail: 'square' },
            { at: 0.64, h: 60, sail: 'square' }, { at: 0.86, h: 44, sail: 'lateen' }],
    ports: 7, oars: false,
  },
  /* 전열함 화력에 프리깃 선형 — 가장 길고 포문이 아홉. */
  superfrigate: {
    name: '슈퍼 프리깃', len: 152, x0: 14, deck: 86, depth: 16,
    sheerAft: 10, sheerFore: 6, aftCastle: 11, foreCastle: 4,
    masts: [{ at: 0.22, h: 62, sail: 'square' }, { at: 0.48, h: 72, sail: 'square' },
            { at: 0.74, h: 62, sail: 'square' }],
    ports: 9, oars: false,
  },
};

/* 현호: 중앙이 낮고 양 끝이 올라가는 곡선 (t=0 선미 … t=1 선수) */
function sheerAt(H, t) {
  const u = 2 * t - 1;
  const back = H.sheerAft * Math.max(0, -u) ** 1.7;
  const fore = H.sheerFore * Math.max(0, u) ** 1.7;
  return back + fore;
}
/* 용골: 중앙이 가장 깊다 */
function keelAt(H, t) {
  const u = 2 * t - 1;
  return H.depth * (1 - u * u) ** 0.55;
}

/* ── 선체 ─────────────────────────────────────────────────── */
function drawHull(g, H, tint) {
  const { len, x0, deck } = H;
  const woodM = tint.hullM, woodD = tint.hullD, woodL = tint.hullL;
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    const x = x0 + i;
    const top = Math.round(deck - sheerAt(H, t));
    const bot = Math.round(deck + keelAt(H, t));
    if (bot <= top) continue;
    // 선수/선미 끝은 뾰족하게 좁혀 마감
    const taper = t > 0.94 ? Math.round((t - 0.94) / 0.06 * (bot - top) * 0.85)
                : t < 0.04 ? Math.round((0.04 - t) / 0.04 * (bot - top) * 0.5) : 0;
    const b = bot - taper;
    if (b <= top) continue;
    g.v(x, top, b, woodM);
    g.px(x, top, woodL);                     // 갑판 가장자리 하이라이트
    g.px(x, top + 1, woodL);
    g.v(x, b - 2, b, woodD);                 // 흘수선 그림자
    if (i % 11 === 5) g.v(x, top + 6, b - 3, tint.hullSeam);   // 늑재(frame) 세로줄
  }
  // 가로 판재 결 — 현호를 따라 흐르게 그려야 선체가 휘어 보인다
  for (let k = 1; k <= 4; k++) {
    for (let i = 2; i < len - 2; i++) {
      const t = i / (len - 1);
      const top = Math.round(deck - sheerAt(H, t));
      const bot = Math.round(deck + keelAt(H, t));
      const y = top + 5 + Math.round((bot - top - 6) * (k / 5));
      if (y < bot - 2) g.px(x0 + i, y, tint.hullSeam);
    }
  }
  // 현측 띠 — 선체를 조여 보이게 하는 핵심 디테일
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    const x = x0 + i, top = Math.round(deck - sheerAt(H, t));
    g.px(x, top + 2, tint.stripeD);
    g.px(x, top + 3, tint.stripe);
    g.px(x, top + 4, tint.stripeD);
  }
  // 흘수선 아래 (구리/타르 도장)
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    const x = x0 + i;
    const bot = Math.round(deck + keelAt(H, t));
    const taper = t > 0.94 ? Math.round((t - 0.94) / 0.06 * 12) : 0;
    const b = bot - taper;
    for (let y = Math.max(WATERLINE - 6, deck); y <= b; y++) g.px(x, y, tint.belowD);
    if (b > WATERLINE - 7) g.px(x, Math.max(WATERLINE - 7, deck), tint.below);
  }
}

/* ── 포문 ─────────────────────────────────────────────────── */
function drawGunports(g, H, n, tint, openIdx = -1) {
  const { len, x0, deck } = H;
  for (let i = 0; i < n; i++) {
    const t = 0.18 + (i / Math.max(1, n - 1)) * 0.60;
    const x = Math.round(x0 + t * len) - 3;
    const top = Math.round(deck - sheerAt(H, t)) + 7;
    g.r(x, top, 6, 5, '#12100f');
    g.box(x - 1, top - 1, 8, 7, tint.stripeD);
    g.px(x - 1, top - 1, tint.stripe); g.px(x + 6, top - 1, tint.stripe);
    if (i === openIdx) {                       // 발포 중인 포문
      g.r(x + 1, top + 1, 6, 3, P.ironM);
      g.h(top + 1, x + 1, x + 6, P.ironL);
      g.r(x + 7, top + 1, 2, 3, P.ironD);
    } else {
      g.r(x + 1, top + 1, 4, 3, P.ironD);      // 안쪽에 물린 포구
      g.px(x + 1, top + 1, P.ironM);
    }
  }
}

/* ── 선루(선미/선수) ──────────────────────────────────────── */
function drawCastles(g, H, tint) {
  const { len, x0, deck } = H;
  // 선미루
  if (H.aftCastle > 2) {
    const w = Math.round(len * 0.22), x = x0 + 1;
    const top = Math.round(deck - sheerAt(H, 0)) - H.aftCastle;
    g.r(x, top, w, H.aftCastle + 2, tint.hullM);
    g.h(top, x, x + w - 1, tint.hullL);
    g.h(top + 1, x, x + w - 1, tint.hullL);
    g.v(x, top, top + H.aftCastle, tint.hullD);
    // 선미 창문
    for (let i = 0; i < Math.max(2, Math.floor(w / 9)); i++) {
      const wx = x + 3 + i * 8, wy = top + 5;
      g.r(wx, wy, 5, 5, '#2a1f16');
      g.r(wx + 1, wy + 1, 3, 3, tint.window);
      g.px(wx + 1, wy + 1, P.goldL);
      g.box(wx - 1, wy - 1, 7, 7, tint.stripeD);
    }
    g.h(top + H.aftCastle + 2, x, x + w - 1, tint.hullD);
    // 난간
    for (let i = 0; i < w; i += 3) g.px(x + i, top - 1, tint.stripe);
  }
  // 선수루
  if (H.foreCastle > 2) {
    const w = Math.round(len * 0.14), x = x0 + len - w - 4;
    const top = Math.round(deck - sheerAt(H, 1)) - H.foreCastle;
    g.poly([[x, top], [x + w, top + 2], [x + w, top + H.foreCastle + 4], [x, top + H.foreCastle + 4]], tint.hullM);
    g.h(top, x, x + w - 1, tint.hullL);
    g.v(x, top, top + H.foreCastle, tint.hullD);
    for (let i = 0; i < w; i += 3) g.px(x + i, top - 1, tint.stripe);
  }
}

/* ── 돛 ───────────────────────────────────────────────────── */
function squareSail(g, cx, topY, w, h, furl) {
  if (furl) {                                   // 접힌 돛
    g.r(cx - w / 2, topY, w, 3, P.clothD);
    g.h(topY, cx - w / 2, cx + w / 2 - 1, P.clothM);
    for (let x = cx - w / 2; x < cx + w / 2; x += 3) g.px(x, topY + 2, '#8d8270');
    return;
  }
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const belly = Math.sin(Math.PI * t) * (w * 0.07);
    const hw = Math.round(w / 2 + belly);
    const sag = Math.round(Math.sin(Math.PI * t) * 0); // 상단 직선
    const yy = topY + y + sag;
    g.h(yy, cx - hw, cx + hw, P.clothM);
    // 바람 받는 쪽(왼쪽) 밝게, 반대쪽 그림자
    g.h(yy, cx - hw, cx - hw + Math.round(w * 0.22), P.clothL);
    g.h(yy, cx + hw - Math.round(w * 0.18), cx + hw, P.clothD);
  }
  // 아랫단 처짐
  const t1 = 1;
  const hwB = Math.round(w / 2 + Math.sin(Math.PI * t1) * (w * 0.07));
  for (let x = -hwB; x <= hwB; x++) {
    const d = Math.round(Math.cos((x / hwB) * (Math.PI / 2)) * 3);
    for (let k = 0; k < d; k++) g.px(cx + x, topY + h + k, k === d - 1 ? P.clothD : P.clothM);
  }
  // 세로 이음선 + 가로 리프밴드
  for (let x = cx - w / 2 + 5; x < cx + w / 2; x += 9) g.v(x, topY + 1, topY + h - 1, '#cabfa6');
  g.h(topY + Math.round(h * 0.55), cx - w / 2 + 2, cx + w / 2 - 2, '#c3b89f');
}

function lateenSail(g, x, topY, h, dir = 1, furl = false) {
  const bw = Math.round(h * 0.62);
  if (furl) {                                   // 활대에 감아올린 상태
    for (let i = 0; i <= bw + 2; i++) {
      const t = i / (bw + 2);
      const yy = Math.round(topY + t * (h - 5));
      g.px(x + dir * i, yy, P.woodM);
      g.px(x + dir * i, yy + 1, P.clothM);
      g.px(x + dir * i, yy + 2, P.clothD);
      if (i % 4 === 0) g.px(x + dir * i, yy + 1, '#8d8270');
    }
    return;
  }
  // 삼각돛: 활대가 비스듬히 걸린다
  const ax = x + dir * 2;
  const pts = [[ax, topY], [ax + dir * bw, topY + h - 6], [ax - dir * 6, topY + h]];
  g.poly(pts, P.clothM);
  // 하이라이트 / 그림자
  g.line(ax, topY, ax - dir * 6, topY + h, P.clothL);
  g.line(ax + 1, topY, ax - dir * 5, topY + h, P.clothL);
  g.line(ax + dir * bw, topY + h - 6, ax - dir * 6, topY + h, P.clothD);
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    g.line(Math.round(ax + dir * bw * t), Math.round(topY + (h - 6) * t),
           Math.round(ax - dir * 6 * t), Math.round(topY + h * t), '#cabfa6');
  }
  // 활대(yard)
  g.line(ax - dir, topY - 1, ax + dir * (bw + 2), topY + h - 5, P.woodM);
  g.line(ax - dir, topY, ax + dir * (bw + 2), topY + h - 4, P.woodD);
}

function drawMasts(g, H, tint, furl) {
  const { len, x0, deck } = H;
  for (const m of H.masts) {
    const x = Math.round(x0 + m.at * len);
    const base = Math.round(deck - sheerAt(H, m.at)) - 1;
    const top = base - m.h;
    g.v(x, top, base, P.woodM);
    g.v(x + 1, top, base, P.woodD);
    g.px(x, top, P.woodL);
    if (m.sail === 'square') {
      const w = Math.round(m.h * 0.66);
      const yardY = top + 6;
      g.h(yardY, x - w / 2 - 3, x + w / 2 + 3, P.woodM);      // 활대
      g.h(yardY + 1, x - w / 2 - 3, x + w / 2 + 3, P.woodD);
      squareSail(g, x, yardY + 2, w, Math.round(m.h * 0.46), furl);
      // 상부 소형 돛
      const w2 = Math.round(w * 0.6);
      g.h(top + 2, x - w2 / 2, x + w2 / 2, P.woodD);
      if (!furl) squareSail(g, x, top + 3, w2, 5, false);
      // 삭구
      g.line(x, top + 4, x0 + Math.round(m.at * len) - w / 2 - 10, base, '#7a6a52');
      g.line(x, top + 4, x0 + Math.round(m.at * len) + w / 2 + 10, base, '#7a6a52');
    } else {
      lateenSail(g, x, top + 4, Math.round(m.h * 0.72), 1, furl);
      g.line(x, top + 2, x + 14, base, '#7a6a52');
      g.line(x, top + 2, x - 12, base, '#7a6a52');
    }
    // 망대
    g.r(x - 3, top + 4, 7, 3, P.woodD);
    g.h(top + 4, x - 3, x + 3, P.woodM);
  }
}

function drawFlag(g, H, flag) {
  const { len, x0, deck } = H;
  const m = H.masts.reduce((a, b) => (b.h > a.h ? b : a), H.masts[0]);
  const x = Math.round(x0 + m.at * len);
  const base = Math.round(deck - sheerAt(H, m.at)) - 1;
  const top = base - m.h - 8;
  g.v(x, top, top + 10, P.woodD);
  // 펄럭이는 깃발
  for (let i = 0; i < 18; i++) {
    const yOff = Math.round(Math.sin(i * 0.45) * 1.4);
    const hgt = 9 - Math.round(i * 0.12);
    g.v(x + 1 + i, top + 1 + yOff, top + hgt + yOff, flag.field);
    g.px(x + 1 + i, top + 1 + yOff, flag.fieldD);
    g.px(x + 1 + i, top + hgt + yOff, flag.fieldD);
  }
  if (flag === FLAGS.pirate) {                    // 졸리 로저
    const sx = x + 6, sy = top + 3;
    g.r(sx, sy, 4, 3, flag.mark);
    g.px(sx + 1, sy + 1, '#1d1a24'); g.px(sx + 3, sy + 1, '#1d1a24');
    g.h(sy + 3, sx + 1, sx + 2, flag.mark);
    g.line(sx - 1, sy + 5, sx + 5, sy + 4, flag.mark);
  } else {
    g.r(x + 6, top + 3, 4, 4, flag.mark);
    g.px(x + 7, top + 4, flag.field);
  }
}

/* ── 부속 ─────────────────────────────────────────────────── */
function drawBowsprit(g, H, tint) {
  const { len, x0, deck } = H;
  const bx = x0 + len - 4, by = Math.round(deck - sheerAt(H, 1)) + 2;
  // 선체 길이에 맞춘다 — 고정 길이로 두면 작은 배에서 장대처럼 튀어나온다
  const bl = Math.max(14, Math.min(24, Math.round(len * 0.2)));
  const bh = Math.round(bl * 0.64);
  g.line(bx, by, bx + bl, by - bh, P.woodM);
  g.line(bx, by + 1, bx + bl, by - bh + 1, P.woodD);
  g.px(bx + bl, by - bh, P.woodL);
  // 선수상
  g.r(bx - 4, by + 2, 3, 5, tint.hullL);
  g.px(bx - 3, by + 3, P.goldM);
  if (H.ram) {                                    // 갤리 충각
    g.poly([[bx - 2, by + 8], [bx + 16, by + 10], [bx - 2, by + 14]], P.ironM);
    g.line(bx - 2, by + 8, bx + 16, by + 10, P.ironL);
  }
}

function drawOars(g, H, phase = 0) {
  const { len, x0, deck } = H;
  for (let i = 0; i < 9; i++) {
    const t = 0.14 + i * 0.075;
    const x = Math.round(x0 + t * len);
    const y = Math.round(deck - sheerAt(H, t)) + 8;
    const swing = Math.sin(phase + i * 0.3) * 2;
    g.line(x, y, x - 12, y + 12 + swing, P.woodM);
    g.line(x, y + 1, x - 12, y + 13 + swing, P.woodD);
    g.r(x - 15, y + 11 + swing, 4, 3, P.woodL);
  }
}

/* ── 색 세트 ──────────────────────────────────────────────── */
export const TINTS = {
  oak:   { hullM: P.woodM, hullD: P.woodD, hullL: P.woodL, hullSeam: '#573a20',
           stripe: P.goldM, stripeD: P.goldD, below: '#4a3a2a', belowD: '#33281c', window: P.goldM },
  dark:  { hullM: '#3d3340', hullD: '#231d29', hullL: '#5b4d5e', hullSeam: '#2c2430',
           stripe: P.redM, stripeD: P.redD, below: '#241f28', belowD: '#161219', window: P.redL },
  white: { hullM: '#a8977c', hullD: '#6f6250', hullL: '#cbbb9a', hullSeam: '#8a7a62',
           stripe: P.blueM, stripeD: P.blueD, below: '#5c5342', belowD: '#413a2e', window: P.goldL },
  green: { hullM: '#4b6144', hullD: '#2c3b28', hullL: '#6b855e', hullSeam: '#3a4a34',
           stripe: P.goldM, stripeD: P.goldD, below: '#2b3a26', belowD: '#1d281a', window: P.goldM },
  // 삭은 배 — 도장이 다 벗겨져 띠까지 나무색이다
  rot:   { hullM: '#6b5a44', hullD: '#463a2c', hullL: '#877459', hullSeam: '#514032',
           stripe: '#7a6a52', stripeD: '#57493a', below: '#3d3529', belowD: '#2a241c', window: '#5a4a34' },
};

/* ── 조립: 측면 뷰 ────────────────────────────────────────── */
export function shipSprite(hullKey, opts = {}) {
  const {
    tint = 'oak', flag = 'venice', furl = false,
    firing = -1, damaged = 0,
  } = opts;
  const key = `ship:${hullKey}:${tint}:${flag}:${furl}:${firing}:${damaged}`;
  const H = HULLS[hullKey];
  if (!H) throw new Error(`unknown hull: ${hullKey}`);
  return bake(key, SW, SH, (g, ctx) => {
    const T = TINTS[tint], F = FLAGS[flag];
    if (H.oars) drawOars(g, H, 0);
    drawMasts(g, H, T, furl);
    drawFlag(g, H, F);
    drawHull(g, H, T);
    drawCastles(g, H, T);
    drawGunports(g, H, H.ports, T, firing);
    drawBowsprit(g, H, T);
    if (H.worn) drawWorn(g, H, T);
    if (damaged > 0) drawDamage(g, H, damaged);
    outline(ctx, SW, SH);
  });
}

/* 삭은 배 — 색이 다른 덧댄 판자와 흘수선 위로 번진 물자국.
   손상(drawDamage)은 구멍이지만 이건 "원래부터 낡았다"는 표시라 따로 그린다. */
function drawWorn(g, H, tint) {
  const r = rng(0xba5a);
  const { len, x0, deck } = H;
  for (let i = 0; i < 5; i++) {
    const t = 0.14 + r() * 0.70;
    const x = Math.round(x0 + t * len);
    const top = Math.round(deck - sheerAt(H, t));
    const y = top + 5 + Math.round(r() * 7);
    const w = 5 + Math.round(r() * 6), h = 3 + Math.round(r() * 2);
    g.r(x, y, w, h, tint.hullD);                       // 덧댄 판자
    g.h(y, x, x + w - 1, tint.hullL);
    for (let k = 0; k < w; k += 3) g.px(x + k, y + h - 1, '#3a2c1e');   // 못자국
  }
  // 흘수선 위로 배어 오른 물때
  for (let i = 2; i < len - 2; i += 2) {
    const t = i / (len - 1);
    const bot = Math.round(deck + keelAt(H, t));
    if (r() < 0.45) g.px(x0 + i, bot - 3 - Math.round(r() * 2), '#4a4436');
  }
}

function drawDamage(g, H, level) {
  const r = rng(0x5eed + level);
  const { len, x0, deck } = H;
  const holes = level * 3;
  for (let i = 0; i < holes; i++) {
    const t = 0.12 + r() * 0.76;
    const x = Math.round(x0 + t * len);
    const top = Math.round(deck - sheerAt(H, t));
    const y = top + 6 + Math.round(r() * 8);
    const w = 3 + Math.round(r() * 3);
    g.r(x, y, w, 2 + Math.round(r() * 2), '#12100f');
    g.px(x - 1, y, '#3a2c1e'); g.px(x + w, y + 1, '#3a2c1e');
  }
  if (level >= 2) {                                 // 부러진 돛대
    const m = H.masts[H.masts.length - 1];
    const x = Math.round(x0 + m.at * len);
    const base = Math.round(deck - sheerAt(H, m.at));
    g.line(x, base - Math.round(m.h * 0.5), x + 26, base - 18, P.woodD);
    g.line(x + 1, base - Math.round(m.h * 0.5), x + 27, base - 17, P.woodM);
  }
}

/* ── 조립: 탑다운(지도) 뷰 ────────────────────────────────── */
export const TOP_W = 28, TOP_H = 28;
const BIG_HULLS = new Set(['galleon', 'carrack', 'indiaman', 'superfrigate', 'frigate']);

export function shipTopSprite(hullKey, opts = {}) {
  const { tint = 'oak', flag = 'venice' } = opts;
  const key = `shiptop:${hullKey}:${tint}:${flag}`;
  return bake(key, TOP_W, TOP_H, (g, ctx) => {
    const T = TINTS[tint], F = FLAGS[flag];
    const big = BIG_HULLS.has(hullKey);
    const small = hullKey === 'hulk';
    const L = big ? 22 : small ? 15 : 19;             // 선체 길이 (위쪽이 선수)
    const cx = 14, y0 = Math.round((TOP_H - L) / 2);
    // 선체 (물방울 형태)
    for (let i = 0; i < L; i++) {
      const t = i / (L - 1);
      const hw = Math.round((big ? 4.6 : 3.9) * Math.sin(Math.PI * Math.min(1, t * 1.12)) ** 0.7 * (1 - t * 0.18));
      if (hw < 1) continue;
      g.h(y0 + i, cx - hw, cx + hw, T.hullM);
      g.px(cx - hw, y0 + i, T.hullD);
      g.px(cx + hw, y0 + i, T.hullD);
      g.px(cx, y0 + i, T.hullL);
    }
    g.px(cx, y0, T.hullL);
    // 갑판 구조물 + 돛대
    g.r(cx - 2, y0 + L - 7, 5, 5, T.hullD);
    g.h(y0 + L - 7, cx - 2, cx + 2, T.hullM);
    const mastY = y0 + Math.round(L * 0.42);
    g.ellipse(cx, mastY, big ? 4 : 3, big ? 6 : 5, P.clothM);
    g.ellipse(cx - 1, mastY, big ? 2 : 2, big ? 5 : 4, P.clothL);
    g.px(cx + (big ? 3 : 2), mastY, P.clothD);
    g.v(cx, mastY - 3, mastY + 3, P.woodD);
    // 깃발
    g.r(cx + 1, y0 + L - 6, 3, 2, F.field);
    outline(ctx, TOP_W, TOP_H);
  });
}

export const HULL_KEYS = Object.keys(HULLS);
