// char.js — 병종 캐릭터 스프라이트 (48x48 그리드, 오른쪽 3/4 뷰)
// 구조: 베이스 바디 1종 + 파츠(머리장구/무기/방어구) 오버레이 + 팔레트 스왑.
// 이 조합 방식 덕에 병종을 늘려도 실루엣과 비례가 어긋나지 않는다.

import { PAL as P, G, bake, outline } from '../pixel.js';

export const CW = 48, CH = 48;     // 스프라이트 규격
const FOOT = 45;                   // 발바닥 기준선

/* ── 의상 색 스킴 ─────────────────────────────────────────────── */
export const SCHEMES = {
  navy:    { cD: P.blueD, cM: P.blueM, cL: P.blueL, trim: P.goldM, trimD: P.goldD,
             pD: '#282b36', pM: '#414659', skin: 'light' },
  crimson: { cD: P.redD, cM: P.redM, cL: P.redL, trim: P.goldM, trimD: P.goldD,
             pD: '#2e2624', pM: '#4a3c36', skin: 'light' },
  forest:  { cD: P.grnD, cM: P.grnM, cL: P.grnL, trim: P.clothD, trimD: '#8a7d68',
             pD: '#33301f', pM: '#55503a', skin: 'light' },
  ink:     { cD: '#1d1a24', cM: '#332e3e', cL: '#4d465c', trim: P.redM, trimD: P.redD,
             pD: '#221f28', pM: '#3a3542', skin: 'dark' },
  sand:    { cD: '#8f7448', cM: '#c2a068', cL: P.sandL, trim: P.purM, trimD: P.purD,
             pD: '#6b563a', pM: '#967c52', skin: 'dark' },
  plum:    { cD: P.purD, cM: P.purM, cL: P.purL, trim: P.goldM, trimD: P.goldD,
             pD: '#2b2430', pM: '#463c4e', skin: 'light' },
  // 부관 에이미 전용 — 짙은 청록에 금장. 선장(plum)과 안 겹치면서 갑판에서 눈에 띈다.
  teal:    { cD: '#1e4444', cM: '#2f7570', cL: '#54a89b', trim: P.goldM, trimD: P.goldD,
             pD: '#243a3c', pM: '#3a5c5c', skin: 'light' },
};

const skinOf = (s) => s.skin === 'dark'
  ? { D: P.skin2D, M: P.skin2M, L: P.skin2L }
  : { D: P.skinD,  M: P.skinM,  L: P.skinL };

/* ── 포즈 ───────────────────────────────────────────────────────
   idle / attack / hit 세 가지. 오프셋 몇 개만 바꿔 실루엣을 흔든다. */
function poseOf(name) {
  switch (name) {
    case 'attack': return { lean: 2, armY: -4, armX: 3, legSpread: 2, headY: 0, wSwing: -20 };
    case 'hit':    return { lean: -2, armY: 1, armX: -2, legSpread: 0, headY: 1, wSwing: 25 };
    default:       return { lean: 0, armY: 0, armX: 0, legSpread: 0, headY: 0, wSwing: 0 };
  }
}

/* ── 베이스 바디 ─────────────────────────────────────────────── */
function drawLegs(g, s, po) {
  const sp = po.legSpread;
  // 뒤쪽 다리 (그림자 톤)
  g.r(19 - sp, 34, 4, 7, s.pD);
  g.r(19 - sp, 40, 5, 4, P.woodD);            // 부츠
  g.h(43, 19 - sp, 24 - sp, '#1e1820');       // 밑창
  // 앞쪽 다리
  g.r(25 + sp, 34, 4, 7, s.pM);
  g.v(25 + sp, 34, 40, s.pD);                 // 다리 안쪽 그림자
  g.r(25 + sp, 40, 6, 5, P.woodM);            // 부츠
  g.r(25 + sp, 40, 6, 1, P.woodL);            // 부츠 접힘 하이라이트
  g.h(44, 25 + sp, 31 + sp, '#1e1820');
  g.px(30 + sp, 41, P.woodD);
}

function drawTorso(g, s, po) {
  const L = po.lean;
  // 코트 몸통
  g.poly([[17 + L, 23], [31 + L, 23], [32 + L, 31], [33 + L, 36], [15 + L, 36], [16 + L, 31]], s.cM);
  // 상단 하이라이트(탑 라이팅)
  g.h(23, 18 + L, 30 + L, s.cL);
  g.h(24, 17 + L, 31 + L, s.cL);
  // 하단 그림자
  g.h(34, 15 + L, 32 + L, s.cD);
  g.h(35, 15 + L, 32 + L, s.cD);
  g.h(36, 15 + L, 32 + L, s.cD);
  // 셔츠 깃
  g.r(21 + L, 22, 6, 3, P.clothM);
  g.h(22, 21 + L, 26 + L, P.clothL);
  g.px(23 + L, 24, P.clothD); g.px(25 + L, 24, P.clothD);
  // 코트 앞섶 + 금장 트림
  g.v(27 + L, 25, 34, s.cD);
  g.v(26 + L, 25, 33, s.trim);
  g.px(26 + L, 26, s.trimD); g.px(26 + L, 30, s.trimD);
  // 어깨띠
  g.line(20 + L, 24, 29 + L, 33, P.woodM);
  g.line(20 + L, 25, 29 + L, 34, P.woodD);
  // 벨트
  g.r(16 + L, 31, 17, 2, '#3a2c22');
  g.h(31, 16 + L, 32 + L, '#55402d');
  g.r(23 + L, 31, 3, 2, s.trim);
  g.px(24 + L, 31, s.trimD);
}

function drawArms(g, s, po, sk) {
  const L = po.lean;
  // 뒤쪽 팔 (몸통 뒤 — 먼저 호출되어야 함)
  g.r(14 + L, 24, 4, 9, s.cD);
  g.h(24, 14 + L, 17 + L, s.cM);
  g.r(14 + L, 32, 4, 3, sk.D);                 // 손
  g.px(14 + L, 33, sk.M);
}

function drawFrontArm(g, s, po, sk) {
  const L = po.lean, ay = po.armY, ax = po.armX;
  g.r(29 + L + ax, 24 + ay, 4, 8, s.cM);
  g.h(24 + ay, 29 + L + ax, 32 + L + ax, s.cL);
  g.r(29 + L + ax, 29 + ay, 4, 2, s.cD);       // 소매 접힘
  g.r(30 + L + ax, 31 + ay, 4, 4, sk.M);       // 손
  g.h(31 + ay, 30 + L + ax, 33 + L + ax, sk.L);
  g.h(34 + ay, 30 + L + ax, 33 + L + ax, sk.D);
}

function drawHead(g, s, po, sk) {
  const L = Math.round(po.lean * 0.6), Y = po.headY;
  const X = (x) => x + L, Yc = (y) => y + Y;
  // 목
  g.r(X(22), Yc(20), 4, 3, sk.D);
  // 두상
  g.h(Yc(11), X(21), X(26), sk.M);
  g.h(Yc(12), X(20), X(27), sk.M);
  g.r(X(19), Yc(13), 10, 7, sk.M);
  g.h(Yc(20), X(20), X(27), sk.M);
  g.h(Yc(21), X(22), X(26), sk.M);
  // 이마 하이라이트
  g.h(Yc(12), X(21), X(26), sk.L);
  g.h(Yc(13), X(20), X(27), sk.L);
  // 측면/턱 그림자
  g.v(X(19), Yc(13), Yc(19), sk.D);
  g.h(Yc(19), X(21), X(27), sk.D);
  g.h(Yc(20), X(22), X(26), sk.D);
  // 귀
  g.px(X(19), Yc(16), sk.D); g.px(X(18), Yc(16), sk.M); g.px(X(18), Yc(17), sk.D);
  // 눈 (3/4뷰라 오른쪽 눈이 가장자리에 붙는다)
  g.px(X(23), Yc(16), P.out); g.px(X(27), Yc(16), P.out);
  g.px(X(23), Yc(15), sk.D);  g.px(X(27), Yc(15), sk.D);
  // 코 / 입
  g.px(X(28), Yc(17), sk.D); g.px(X(29), Yc(17), sk.M); g.px(X(28), Yc(18), sk.D);
  g.h(Yc(19), X(26), X(27), '#7b4a34');
}

function drawHair(g, po, col, colD) {
  const L = Math.round(po.lean * 0.6), Y = po.headY;
  g.h(10 + Y, 21 + L, 26 + L, col);
  g.h(11 + Y, 20 + L, 27 + L, col);
  g.h(12 + Y, 19 + L, 28 + L, col);
  g.h(13 + Y, 19 + L, 22 + L, col);
  g.r(18 + L, 13 + Y, 2, 5, col);              // 뒷머리
  g.h(10 + Y, 22 + L, 25 + L, colD);
  g.px(18 + L, 18 + Y, colD);
}

/* ── 여성 바디 (UNITS[].body === 'fem') ───────────────────────────
   병종은 전부 같은 코트 실루엣을 쓰지만 인물은 실루엣부터 달라야 알아본다.
   어깨를 좁히고 허리를 조인 뒤 치마로 퍼뜨린다 — 48px 안에서 실루엣만으로 갈린다.
   비례 기준선은 공용이다: 머리 10~21 · 몸통 23~31 · 치마 33~41 · 발 41~45. */
function drawTorsoFem(g, s, po) {
  const L = po.lean;
  // 보디스 — 어깨(19~29)에서 허리(21~27)로 좁아진다
  g.poly([[19 + L, 23], [29 + L, 23], [28 + L, 28], [27 + L, 32], [21 + L, 32], [20 + L, 28]], s.cM);
  g.h(23, 20 + L, 28 + L, s.cL);
  g.h(24, 20 + L, 28 + L, s.cL);
  g.h(30, 21 + L, 27 + L, s.cD);                 // 허리 그늘
  g.h(31, 21 + L, 27 + L, s.cD);
  // 레이스 깃
  g.h(22, 21 + L, 27 + L, P.clothL);
  g.h(21, 22 + L, 26 + L, P.clothM);
  g.px(21 + L, 22, P.clothD); g.px(27 + L, 22, P.clothD);
  // 코르셋 앞끈 (금사)
  g.v(23 + L, 24, 30, s.cD);
  g.v(25 + L, 24, 30, s.cD);
  for (let i = 0; i < 4; i++) g.px(24 + L, 25 + i * 2, s.trim);
  // 벨트
  g.r(20 + L, 32, 8, 2, '#3a2c22');
  g.h(32, 20 + L, 27 + L, '#55402d');
  g.r(23 + L, 32, 3, 2, s.trim);
  // 치마 — 허리에서 발치로 크게 퍼진다(A라인). 원통형이면 실루엣이 뭉툭해진다.
  g.poly([[21 + L, 34], [27 + L, 34], [33 + L, 42], [15 + L, 42]], s.cM);
  g.h(35, 21 + L, 27 + L, s.cL);
  g.h(36, 20 + L, 28 + L, s.cL);
  g.h(41, 15 + L, 33 + L, s.cD);
  g.h(42, 15 + L, 33 + L, s.cD);
  g.line(23 + L, 35, 19 + L, 41, s.cD);          // 주름 — 퍼지는 방향을 따라간다
  g.line(26 + L, 35, 29 + L, 41, s.cD);
  g.line(24 + L, 36, 23 + L, 41, s.cD);
  g.h(40, 17 + L, 31 + L, s.trimD);              // 금색 밑단 — 한 줄이면 족하다
  // 허리에 찬 돈주머니 — 이 인물의 성격이 실루엣에 드러나는 자리
  g.ellipse(30 + L, 36, 2, 3, '#6b4626');
  g.h(33, 29 + L, 31 + L, '#8a641a');
  g.px(30 + L, 35, P.goldM);
}

function drawLegsFem(g, s, po) {
  const sp = Math.round(po.legSpread * 0.5);
  g.r(20 - sp, 42, 4, 3, P.woodD);               // 뒤쪽 구두 (치마 밑단 아래로만 나온다)
  g.h(44, 20 - sp, 23 - sp, '#1e1820');
  g.r(25 + sp, 42, 5, 3, P.woodM);               // 앞쪽 구두
  g.h(42, 25 + sp, 29 + sp, P.woodL);
  g.h(44, 25 + sp, 29 + sp, '#1e1820');
}

/* 좁아진 어깨에 맞춰 팔도 안쪽으로 당긴다 (남성 바디보다 각각 2px) */
function drawArmsFem(g, s, po, sk) {
  const L = po.lean;
  g.r(16 + L, 24, 4, 9, s.cD);
  g.h(24, 16 + L, 19 + L, s.cM);
  g.r(16 + L, 32, 3, 3, sk.D);
  g.px(16 + L, 33, sk.M);
}

function drawFrontArmFem(g, s, po, sk) {
  const L = po.lean, ay = po.armY, ax = po.armX;
  g.r(28 + L + ax, 24 + ay, 4, 8, s.cM);
  g.h(24 + ay, 28 + L + ax, 31 + L + ax, s.cL);
  g.r(28 + L + ax, 29 + ay, 4, 2, s.cD);
  g.r(29 + L + ax, 31 + ay, 3, 4, sk.M);
  g.h(31 + ay, 29 + L + ax, 31 + L + ax, sk.L);
  g.h(34 + ay, 29 + L + ax, 31 + L + ax, sk.D);
}

/* 공용 두상 위에 이목구비만 얹는다 — 두상을 새로 그리면 비례가 어긋난다.
   병종은 눈이 1px이라 4배로 봐도 표정이 없다. 인물은 눈을 세로 2px로 키우고
   속눈썹·눈동자 하이라이트를 넣어야 비로소 얼굴로 읽힌다. */
function drawHeadFem(g, s, po, sk) {
  drawHead(g, s, po, sk);
  const L = Math.round(po.lean * 0.6), Y = po.headY;
  // 큰 눈
  g.v(23 + L, 15 + Y, 16 + Y, P.out);
  g.v(27 + L, 15 + Y, 16 + Y, P.out);
  g.px(23 + L, 15 + Y, '#2f5d8c');               // 눈동자 — 청회색
  g.px(27 + L, 15 + Y, '#2f5d8c');
  // 속눈썹 (바깥 끝이 살짝 올라간다)
  g.px(22 + L, 14 + Y, P.out);
  g.px(28 + L, 14 + Y, P.out);
  // 눈썹 — 얇고 둥글게
  g.h(13 + Y, 22 + L, 24 + L, '#5c2e18');
  g.h(13 + Y, 26 + L, 28 + L, '#5c2e18');
  // 입술 · 볼
  g.h(19 + Y, 26 + L, 27 + L, '#b8323a');
  g.px(21 + L, 18 + Y, '#d98a76');
  g.px(28 + L, 18 + Y, '#d98a76');
}

/* ── 머리장구 파츠 ──────────────────────────────────────────── */
const HEADGEAR = {
  none: (g, s, po) => drawHair(g, po, '#4a3524', '#2f2016'),

  bandana: (g, s, po) => {
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    drawHair(g, po, '#3b2a1c', '#241a11');
    g.r(19 + L, 11 + Y, 10, 3, P.redM);
    g.h(11 + Y, 20 + L, 27 + L, P.redL);
    g.h(13 + Y, 19 + L, 28 + L, P.redD);
    g.px(20 + L, 12 + Y, P.redD); g.px(24 + L, 12 + Y, P.redD);
    // 뒤로 흘린 매듭
    g.r(16 + L, 13 + Y, 3, 2, P.redM);
    g.r(14 + L, 14 + Y, 3, 2, P.redD);
  },

  tricorne: (g, s, po) => {
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    drawHair(g, po, '#3b2a1c', '#241a11');
    // 크라운
    g.r(20 + L, 8 + Y, 8, 4, s.cD);
    g.h(8 + Y, 21 + L, 26 + L, s.cM);
    // 챙 (앞뒤로 접힌 삼각모)
    g.h(12 + Y, 15 + L, 32 + L, s.cD);
    g.h(11 + Y, 17 + L, 30 + L, s.cM);
    g.h(11 + Y, 18 + L, 22 + L, s.cL);
    g.px(15 + L, 11 + Y, s.cD); g.px(32 + L, 11 + Y, s.cD);
    // 금장 테두리 + 깃털
    g.h(13 + Y, 16 + L, 31 + L, s.trimD);
    g.px(18 + L, 12 + Y, s.trim); g.px(29 + L, 12 + Y, s.trim);
  },

  plumehat: (g, s, po) => {
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    drawHair(g, po, '#4a3524', '#2f2016');
    g.r(20 + L, 7 + Y, 9, 5, s.cM);
    g.h(7 + Y, 21 + L, 27 + L, s.cL);
    g.h(11 + Y, 20 + L, 28 + L, s.cD);
    g.h(12 + Y, 14 + L, 33 + L, s.cD);          // 넓은 챙
    g.h(11 + Y, 16 + L, 32 + L, s.cM);
    g.r(20 + L, 10 + Y, 9, 1, s.trim);          // 모자띠
    // 깃털
    g.line(19 + L, 9 + Y, 12 + L, 4 + Y, P.clothM);
    g.line(19 + L, 10 + Y, 13 + L, 5 + Y, P.clothL);
    g.line(18 + L, 8 + Y, 13 + L, 3 + Y, P.clothD);
    g.px(12 + L, 3 + Y, P.clothM);
  },

  morion: (g, s, po) => {                        // 스페인 모리온 투구
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    g.r(20 + L, 8 + Y, 8, 5, P.steelM);
    g.h(7 + Y, 22 + L, 25 + L, P.steelM);
    g.h(8 + Y, 21 + L, 26 + L, P.steelL);
    g.v(23 + L, 7 + Y, 12 + Y, P.steelL);        // 볏
    g.h(12 + Y, 19 + L, 29 + L, P.steelD);
    // 앞뒤로 솟은 챙
    g.line(16 + L, 14 + Y, 20 + L, 12 + Y, P.steelD);
    g.line(17 + L, 14 + Y, 21 + L, 12 + Y, P.steelM);
    g.line(32 + L, 14 + Y, 28 + L, 12 + Y, P.steelD);
    g.line(31 + L, 14 + Y, 27 + L, 12 + Y, P.steelM);
    g.px(20 + L, 9 + Y, P.steelD); g.px(27 + L, 10 + Y, P.steelD);
  },

  turban: (g, s, po) => {
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    g.ellipse(23 + L, 10 + Y, 6, 4, P.clothM);
    g.h(7 + Y, 21 + L, 26 + L, P.clothL);
    g.h(12 + Y, 18 + L, 28 + L, P.clothD);
    g.line(18 + L, 11 + Y, 28 + L, 8 + Y, P.clothD);   // 감은 결
    g.line(18 + L, 13 + Y, 28 + L, 10 + Y, P.clothD);
    g.r(23 + L, 6 + Y, 2, 2, s.trim);                  // 보석 장식
    g.r(16 + L, 12 + Y, 3, 4, P.clothM);               // 흘러내린 자락
    g.px(16 + L, 15 + Y, P.clothD);
  },

  hood: (g, s, po) => {
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    g.poly([[18 + L, 16 + Y], [19 + L, 9 + Y], [24 + L, 7 + Y], [29 + L, 10 + Y], [29 + L, 16 + Y]], s.cM);
    g.h(8 + Y, 21 + L, 26 + L, s.cL);
    g.h(9 + Y, 20 + L, 27 + L, s.cL);
    g.r(18 + L, 13 + Y, 3, 6, s.cD);
    g.h(14 + Y, 19 + L, 21 + L, s.cD);
    g.h(13 + Y, 26 + L, 29 + L, s.cD);
    g.r(17 + L, 19 + Y, 6, 4, s.cD);                   // 어깨 케이프
  },

  longhair: (g, s, po) => {                            // 어깨까지 내린 적갈색 머리
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    const H = '#8a4a2a', HD = '#5c2e18', HL = '#b5673a';
    // 정수리
    g.h(9 + Y, 21 + L, 26 + L, H);
    g.h(10 + Y, 20 + L, 27 + L, H);
    g.h(11 + Y, 19 + L, 28 + L, H);
    g.h(12 + Y, 19 + L, 28 + L, H);
    g.h(9 + Y, 22 + L, 25 + L, HL);                    // 광택
    g.h(10 + Y, 22 + L, 24 + L, HL);
    // 앞머리 — 이마에서 갈라진다
    g.h(13 + Y, 19 + L, 21 + L, H);
    g.h(13 + Y, 27 + L, 28 + L, H);
    g.px(28 + L, 14 + Y, H);
    // 옆·뒷머리
    g.r(17 + L, 12 + Y, 3, 12, H);
    g.v(17 + L, 13 + Y, 23 + Y, HD);
    g.r(28 + L, 13 + Y, 2, 8, H);
    g.px(29 + L, 14 + Y, HD);
    g.h(24 + Y, 17 + L, 20 + L, HD);                   // 어깨에 닿는 끝단
    g.h(21 + Y, 28 + L, 29 + L, HD);
    // 금비녀 — 값나가는 것을 몸에 지니는 취향
    g.px(21 + L, 11 + Y, s.trim);
    g.px(22 + L, 10 + Y, s.trim);
  },
};

/* ── 무기 파츠 (앞손 기준: 대략 x32,y33) ────────────────────── */
const WEAPONS = {
  none: () => {},

  cutlass: (g, s, po) => {
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 32 + L + ax, hy = 33 + ay;
    g.r(hx - 1, hy - 1, 2, 4, P.woodD);                  // 손잡이
    g.r(hx - 2, hy - 2, 5, 2, P.goldM);                  // 코등이
    g.px(hx + 2, hy - 1, P.goldD);
    // 휘어진 날
    const sw = po.wSwing;
    if (sw < 0) {                                        // 내려치기
      g.line(hx + 2, hy - 3, hx + 13, hy - 9, P.steelM);
      g.line(hx + 2, hy - 2, hx + 13, hy - 8, P.steelL);
      g.line(hx + 3, hy - 1, hx + 13, hy - 7, P.steelD);
      g.px(hx + 14, hy - 10, P.steelL);
    } else {
      g.line(hx + 1, hy - 3, hx + 5, hy - 13, P.steelM);
      g.line(hx + 2, hy - 3, hx + 6, hy - 13, P.steelL);
      g.line(hx + 1, hy - 4, hx + 4, hy - 12, P.steelD);
      g.px(hx + 6, hy - 14, P.steelL);
    }
  },

  scimitar: (g, s, po) => {
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 32 + L + ax, hy = 33 + ay;
    g.r(hx - 1, hy - 1, 2, 4, '#4a2f1c');
    g.r(hx - 2, hy - 2, 5, 1, P.goldM);
    // 크게 휜 곡도
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const x = hx + 1 + Math.round(t * 11);
      const y = hy - 3 - Math.round(Math.sin(t * 2.2) * 9);
      g.px(x, y, P.steelM); g.px(x, y - 1, P.steelL); g.px(x, y + 1, P.steelD);
    }
  },

  pike: (g, s, po) => {
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 31 + L + ax;
    const tip = Math.max(1, 9 + ay);                     // 창날 끝 (캔버스 안으로 고정)
    g.v(hx, tip + 7, 45, P.woodM);                       // 장창 자루
    g.v(hx + 1, tip + 7, 45, P.woodD);
    g.px(hx, 22 + ay, P.woodL); g.px(hx, 34 + ay, P.woodL);
    // 창날
    g.poly([[hx - 1, tip + 7], [hx + 3, tip + 7], [hx + 1, tip]], P.steelM);
    g.line(hx, tip + 6, hx + 1, tip + 1, P.steelL);
    g.px(hx + 1, tip, P.steelL);
    g.r(hx - 1, tip + 7, 4, 2, P.ironM);                 // 소켓
    g.h(tip + 8, hx - 1, hx + 2, P.ironD);
  },

  musket: (g, s, po, sk) => {
    const L = po.lean, ay = po.armY;
    const firing = po.wSwing < 0;
    const bx = 26 + L, by = 30 + ay;
    // 개머리판 → 총열
    g.poly([[bx - 4, by + 2], [bx, by], [bx, by + 4], [bx - 5, by + 6]], P.woodM);
    g.line(bx - 4, by + 2, bx, by, P.woodL);
    g.r(bx, by, 6, 3, P.woodD);
    g.r(bx + 6, by, 13, 2, P.ironM);                     // 총열
    g.h(by, bx + 6, bx + 18, P.ironL);
    g.px(bx + 19, by, P.ironD);
    // 화승식 기관부
    g.r(bx + 4, by - 2, 3, 2, P.ironD);
    g.px(bx + 5, by - 3, P.goldM);
    g.r(bx + 3, by + 3, 2, 3, P.ironD);                  // 방아쇠울
    // 총열을 받친 앞손 (무기가 손을 덮지 않도록 다시 얹는다)
    g.r(bx + 8, by + 1, 4, 3, sk.M);
    g.h(by + 1, bx + 8, bx + 11, sk.L);
    g.h(by + 3, bx + 8, bx + 11, sk.D);
    if (firing) {                                        // 총구 화염
      g.ellipse(bx + 22, by, 4, 3, P.goldM);
      g.ellipse(bx + 21, by, 2, 2, P.goldL);
      g.px(bx + 26, by, P.goldD); g.px(bx + 22, by - 4, P.goldD);
      g.px(bx + 22, by + 4, P.goldD);
    }
  },

  crossbow: (g, s, po) => {
    const L = po.lean, ay = po.armY, ax = po.armX;
    const bx = 28 + L, by = 31 + ay;
    g.r(bx - 3, by, 12, 2, P.woodM);                     // 개머리
    g.h(by, bx - 3, bx + 8, P.woodL);
    g.v(bx + 8, by - 5, by + 6, P.ironD);                // 활대
    g.line(bx + 8, by - 5, bx + 6, by - 6, P.ironM);
    g.line(bx + 8, by + 6, bx + 6, by + 7, P.ironM);
    g.line(bx + 6, by - 6, bx + 6, by + 7, '#6d5b3f');   // 시위
    g.r(bx + 2, by - 1, 7, 1, P.woodD);                  // 볼트
    g.px(bx + 9, by - 1, P.steelL);
  },

  swordshield: (g, s, po, sk) => {
    WEAPONS.cutlass(g, s, po, sk);
    // 뒷손의 라운드 실드
    const L = po.lean;
    g.ellipse(15 + L, 30, 6, 7, P.woodM);
    g.ellipse(15 + L, 30, 5, 6, P.woodL);
    g.ellipse(15 + L, 30, 3, 4, P.woodM);
    g.ellipse(15 + L, 30, 2, 2, P.ironM);
    g.px(15 + L, 29, P.ironL);
    g.v(15 + L, 24, 36, P.woodD);
  },

  torch: (g, s, po) => {
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 32 + L + ax, hy = 33 + ay;
    g.v(hx, hy - 10, hy + 2, P.woodM);
    g.v(hx + 1, hy - 10, hy + 2, P.woodD);
    g.ellipse(hx, hy - 13, 2, 3, P.redM);
    g.ellipse(hx, hy - 14, 1, 2, P.goldM);
    g.px(hx, hy - 16, P.goldL);
  },

  ledger: (g, s, po, sk) => {                          // 장부와 깃펜 — 무기가 아니라 직업의 표시
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 30 + L + ax, hy = 33 + ay;
    // 덮은 장부 — 펼친 흰 지면은 얼굴보다 눈에 띄어 시선을 뺏는다
    g.r(hx - 1, hy - 3, 5, 6, '#6b4626');              // 가죽 표지
    g.h(hy - 3, hx - 1, hx + 3, '#8a6a44');
    g.v(hx - 1, hy - 3, hy + 2, '#3d2a1b');            // 책등
    g.h(hy + 2, hx - 1, hx + 3, '#3d2a1b');
    g.v(hx + 3, hy - 2, hy + 1, P.clothM);             // 책배(종이 단면)
    g.px(hx + 1, hy - 1, s.trim);                      // 금박 문양
    g.px(hx + 1, hy + 1, s.trimD);
    // 깃펜 — 장부 바로 위에서 손에 쥔 것처럼. 떼어 놓으면 허공에 뜬 막대로 보인다.
    g.line(hx + 2, hy - 4, hx + 5, hy - 10, P.clothL);
    g.line(hx + 1, hy - 4, hx + 4, hy - 10, P.clothM);
    g.px(hx + 5, hy - 11, P.clothL);
    g.px(hx + 1, hy - 3, P.ironD);                     // 펜촉
  },
};

/* ── 방어구 오버레이 ────────────────────────────────────────── */
const ARMOR = {
  none: () => {},
  cuirass: (g, s, po) => {                              // 흉갑
    const L = po.lean;
    g.poly([[19 + L, 24], [29 + L, 24], [30 + L, 31], [24 + L, 33], [18 + L, 31]], P.steelM);
    g.h(24, 20 + L, 28 + L, P.steelL);
    g.h(25, 19 + L, 29 + L, P.steelL);
    g.v(24 + L, 25, 32, P.steelL);                      // 중앙 융기
    g.h(31, 18 + L, 30 + L, P.steelD);
    g.h(32, 19 + L, 29 + L, P.steelD);
    g.px(20 + L, 26, P.steelD); g.px(28 + L, 26, P.steelD);
    g.r(18 + L, 23, 4, 2, P.steelL);                    // 어깨 가리개
    g.r(27 + L, 23, 4, 2, P.steelL);
    g.h(25, 18 + L, 21 + L, P.steelD);
    g.h(25, 27 + L, 30 + L, P.steelD);
  },
  buffcoat: (g, s, po) => {                             // 가죽 버프코트
    const L = po.lean;
    g.poly([[19 + L, 24], [29 + L, 24], [30 + L, 32], [18 + L, 32]], '#8a6a44');
    g.h(24, 20 + L, 28 + L, '#a8834f');
    g.h(32, 18 + L, 30 + L, '#5f472c');
    g.v(24 + L, 25, 31, '#5f472c');
    for (let i = 0; i < 4; i++) g.px(22 + L, 26 + i * 2, P.goldD);
  },
  bandolier: (g, s, po) => {                            // 탄약대
    const L = po.lean;
    g.line(19 + L, 23, 29 + L, 33, '#6b5334');
    g.line(20 + L, 23, 30 + L, 33, '#8a6a44');
    for (let i = 0; i < 5; i++) {
      const x = 20 + L + i * 2, y = 24 + i * 2;
      g.r(x, y, 2, 2, P.woodD);
      g.px(x, y, P.woodL);
    }
  },
};

/* ── 병종 정의 ─────────────────────────────────────────────── */
export const UNITS = {
  sailor:    { name: '선원',     head: 'bandana',  weap: 'cutlass',     armor: 'none',      scheme: 'navy' },
  swordsman: { name: '검병',     head: 'morion',   weap: 'swordshield', armor: 'cuirass',   scheme: 'navy' },
  pikeman:   { name: '창병',     head: 'morion',   weap: 'pike',        armor: 'cuirass',   scheme: 'forest' },
  musketeer: { name: '총병',     head: 'tricorne', weap: 'musket',      armor: 'bandolier', scheme: 'crimson' },
  crossbow:  { name: '석궁병',   head: 'hood',     weap: 'crossbow',    armor: 'buffcoat',  scheme: 'forest' },
  captain:   { name: '선장',     head: 'plumehat', weap: 'cutlass',     armor: 'buffcoat',  scheme: 'plum' },
  pirate:    { name: '해적',     head: 'bandana',  weap: 'cutlass',     armor: 'none',      scheme: 'ink' },
  corsair:   { name: '코르세어', head: 'turban',   weap: 'scimitar',    armor: 'none',      scheme: 'sand' },
  gunner:    { name: '포수',     head: 'none',     weap: 'torch',       armor: 'buffcoat',  scheme: 'crimson' },
  // 부관 에이미 — 병종이 아니라 인물이다. TROOPS에 없으니 갑판 슬롯에도 오르지 않는다.
  amy:       { name: '에이미',   head: 'longhair', weap: 'ledger',      armor: 'none',      scheme: 'teal', body: 'fem' },
};

/* ── 조립 ──────────────────────────────────────────────────── */
export function unitSprite(unitKey, pose = 'idle', schemeOverride = null) {
  const u = UNITS[unitKey];
  if (!u) throw new Error(`unknown unit: ${unitKey}`);
  const schemeKey = schemeOverride || u.scheme;
  const key = `char:${unitKey}:${pose}:${schemeKey}`;
  return bake(key, CW, CH, (g, ctx) => {
    const s = SCHEMES[schemeKey];
    const sk = skinOf(s);
    const po = poseOf(pose);
    const fem = u.body === 'fem';
    (fem ? drawArmsFem : drawArms)(g, s, po, sk);      // 뒤쪽 팔 먼저
    if (u.weap === 'swordshield') { /* 방패는 무기 파츠에서 뒷손에 그린다 */ }
    (fem ? drawLegsFem : drawLegs)(g, s, po);
    (fem ? drawTorsoFem : drawTorso)(g, s, po);
    ARMOR[u.armor](g, s, po);
    (fem ? drawHeadFem : drawHead)(g, s, po, sk);
    HEADGEAR[u.head](g, s, po);
    (fem ? drawFrontArmFem : drawFrontArm)(g, s, po, sk);
    WEAPONS[u.weap](g, s, po, sk);
    outline(ctx, CW, CH);
  });
}

export const UNIT_KEYS = Object.keys(UNITS);
export { FOOT as CHAR_FOOT };
