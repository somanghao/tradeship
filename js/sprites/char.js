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

  /* ── 명부 인물 전용 배색 (회차 23) ──────────────────────────────
     ★ 위 일곱은 **병종의 정보**다 — 한 픽셀도 안 건드린다.
     아래 여섯은 **병종이 아닌 사람**(항구 인물·동료·이름난 해적)에게만 쓴다.
     항구에 앉은 서기와 전주가 전부 남색 선원복을 입고 있던 것을 갈랐다. */
  earth:   { cD: '#40301f', cM: '#6b5334', cL: '#96784c', trim: P.clothD, trimD: '#7a6b54',
             pD: '#332a1f', pM: '#4f4335', skin: 'light' },
  olive:   { cD: '#333a1f', cM: '#5b6434', cL: '#8a9455', trim: P.woodL, trimD: P.woodD,
             pD: '#2e3020', pM: '#4a4c33', skin: 'light' },
  slate:   { cD: '#232a33', cM: '#3f4c5c', cL: '#69798c', trim: P.steelL, trimD: P.steelD,
             pD: '#22262c', pM: '#3a4048', skin: 'light' },
  wine:    { cD: '#3f1620', cM: '#6b2431', cL: '#9c3d47', trim: P.goldM, trimD: P.goldD,
             pD: '#2b1c1e', pM: '#453032', skin: 'light' },
  saffron: { cD: '#8a5a12', cM: '#c98f22', cL: '#eec25a', trim: '#4a1418', trimD: '#2b0e10',
             pD: '#6b4a1c', pM: '#95702f', skin: 'light' },
  indigo:  { cD: '#1b2440', cM: '#2f3d6b', cL: '#5464a0', trim: P.clothM, trimD: P.clothD,
             pD: '#20243a', pM: '#363c58', skin: 'light' },
  ivory:   { cD: '#8a8270', cM: '#c2b89e', cL: '#e8e0c8', trim: P.blueM, trimD: P.blueD,
             pD: '#5c584f', pM: '#847e70', skin: 'light' },
};

/* ── 피부톤 넷 ────────────────────────────────────────────────────
   ★ **C-14 — 권역이 이름만 갈리고 얼굴은 안 갈렸다.** `faceKey`는 *키만* 갈라 두어
     PNG를 갈아 끼울 자리를 만들었을 뿐이라, **그림이 없는 여덟 바다는 전부 지중해 얼굴**이었다.
     그림을 기다리는 동안에도 바다가 달라 보이게, **코드 생성 쪽도 권역을 본다.**
   ★ 갈리는 것은 **피부톤 하나**다 — 의상 배색(`scheme`)은 병종의 정보라 안 건드린다.
     실루엣·머리장구를 바다마다 바꾸면 "또 다른 병종"으로 읽힌다(이 도메인의 함정). */
const SKINS = {
  light: { D: P.skinD,  M: P.skinM,  L: P.skinL },
  dark:  { D: P.skin2D, M: P.skin2M, L: P.skin2L },
  amber: { D: P.skin3D, M: P.skin3M, L: P.skin3L },
  copper:{ D: P.skin4D, M: P.skin4M, L: P.skin4L },
  pale:  { D: P.skin5D, M: P.skin5M, L: P.skin5L },
  tan:   { D: P.skin6D, M: P.skin6M, L: P.skin6L },
  bronze:{ D: P.skin7D, M: P.skin7M, L: P.skin7L },
  ebony: { D: P.skin8D, M: P.skin8M, L: P.skin8L },
};

/** 그 바다의 얼굴빛 — 없으면 배색이 정한 대로 간다(지중해가 그렇다).
    ★ 회차 22 — 넷이던 것을 **권역마다 하나**로 갈랐다. 넷일 때는 동아시아와 동남아,
      인도양과 아메리카, 아프리카와 중동이 화면에서 같은 얼굴이었다(4배 확대 실대조). */
export const REGION_SKIN = {
  atlantic: 'pale',
  eastasia: 'amber', seasia: 'tan',
  indian: 'copper', southamerica: 'bronze', caribbean: 'bronze',
  africa: 'ebony', mideast: 'dark',
};

/** 이 사람의 살빛 세 톤 — `s`는 `SCHEMES`의 한 줄, `faceKey`는 권역 이름이다.
    ★ export하는 이유: **작은 인물**(`char-mini.js`)이 같은 규칙을 봐야 하기 때문이다.
      두 파일이 각자 표를 들면 바다별 얼굴빛이 큰 그림에서만 갈리는 일이 다시 생긴다(C-14). */
export const skinOf = (s, faceKey = null) => SKINS[REGION_SKIN[faceKey]] ?? SKINS[s.skin] ?? SKINS.light;

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

  longhair: (g, s, po) => {                            // 어깨까지 내린 금발
    const L = Math.round(po.lean * 0.6), Y = po.headY;
    // PAL.sand 3톤 그대로 — 금색 계열은 이미 표에 있으므로 새 색을 만들지 않는다.
    // goldM(#d2a52a)은 금속용이라 머리에 쓰면 투구처럼 보인다.
    const H = P.sandM, HD = P.sandD, HL = P.sandL;
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
    // 비녀 — 값나가는 것을 몸에 지니는 취향.
    // 머리가 금발이 되면서 금색 비녀가 머리에 묻힌다. 짙은 청록(의상색)으로 받치고
    // 금은 끝의 반짝임 1px만 남긴다 — 2px짜리 소품은 대비가 없으면 그냥 사라진다.
    g.px(21 + L, 11 + Y, s.cD);
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

/* ══ 명부 인물을 가르는 축 (회차 23) ═══════════════════════════════
   ★ **한 그림이 아홉 바다에 그대로 쓰이는 구조**가 인물에도 있었다.
   `figureSprite`·`pirateSprite`는 그림이 없으면 공용 병종 스프라이트로 폴백했고,
   그때 `faceKey`를 안 넘겨 **회차 22가 판 여덟 얼굴빛이 명부 인물에는 한 번도 안 닿았다** —
   아홉 바다 162명(항구 71 · 동료 51 · 해적 40)이 화면에서 다섯 장이었다.

   그래서 얼굴빛 하나가 아니라 **여덟 축**을 판다. 전부 id에서 결정론으로 뽑으므로
   같은 사람은 언제나 같은 얼굴이고, 명부가 늘어도 그림을 새로 안 그려도 된다:
     ① 얼굴빛(권역)  ② 머리모양  ③ 머리색  ④ 수염  ⑤ 모자/두건(권역 문화)
     ⑥ 옷깃          ⑦ 장신구    ⑧ 나이대  (+ 배색과 손에 든 것은 직업이 정한다)
   ⚠️ 병종(`UNITS`·`unitSprite`)은 여전히 **한 픽셀도 안 건드린다** — 그쪽은 배색이 곧 정보다. */

/** FNV-1a — id 문자열 하나에서 사람의 생김새를 뽑는 씨앗 */
function seedOf(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** 씨앗 하나에서 순서대로 골라 쓰는 선택기 (pixel.js: rng와 같은 xorshift) */
function chooser(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s >>> 0; };
  return {
    pick: (a) => a[next() % a.length],
    odds: (p) => (next() % 1024) / 1024 < p,
  };
}

/* 인물 id의 권역 약자 — `npc-figures.js`·`npc-mates.js`의 규약이다(`권역약자-항구-직능`) */
const REGION_BY_PREFIX = {
  med: 'mediterranean', atl: 'atlantic', afr: 'africa', mid: 'mideast', ind: 'indian',
  sea: 'seasia', eas: 'eastasia', car: 'caribbean', sam: 'southamerica',
};

/* ── 머리색 [기본, 그늘] ─────────────────────────────────────── */
const HAIRS = {
  black:  ['#191219', '#0c090e'],
  jet:    ['#241a11', '#140e09'],
  brown:  ['#4a3524', '#2f2016'],
  chest:  ['#6b4626', '#3d2a1b'],
  auburn: ['#7a3b22', '#4a1f12'],
  blond:  ['#c2a06a', '#8a6a44'],
  grey:   ['#8a8578', '#5c584f'],
  white:  ['#cfc7b4', '#8f8878'],
};

/* ── 천 색 (모자·두건·옷깃) ──────────────────────────────────── */
const CLOTHES = {
  white:  { M: P.clothM,  L: P.clothL,  D: P.clothD },
  indigo: { M: '#2f3d6b', L: '#5464a0', D: '#1b2440' },
  saffron:{ M: '#c98f22', L: '#eec25a', D: '#8a5a12' },
  crimson:{ M: P.redM,    L: P.redL,    D: P.redD },
  black:  { M: '#2a2230', L: '#463c4e', D: '#17121c' },
  earth:  { M: '#6b5334', L: '#96784c', D: '#40301f' },
  green:  { M: P.grnM,    L: P.grnL,    D: P.grnD },
  straw:  { M: P.sandM,   L: P.sandL,   D: P.sandD },
};

/* 두상 좌표 헬퍼 — `drawHead`와 같은 기준을 쓴다(머리 10~21 · 얼굴 x19~29) */
const HX = (po) => Math.round(po.lean * 0.6);
const HY = (po) => po.headY;

/* ── ② 머리모양 ─────────────────────────────────────────────── */
const HAIRSTYLES = {
  /* 짧게 친 머리 — 병종이 쓰던 그것. 색만 사람마다 다르다 */
  crop: (g, po, c, d) => drawHair(g, po, c, d),

  /* 귀 뒤로 넘겨 목덜미까지 */
  side: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    drawHair(g, po, c, d);
    g.r(17 + L, 12 + Y, 2, 9, c);
    g.v(17 + L, 14 + Y, 20 + Y, d);
    g.px(29 + L, 14 + Y, c);
  },

  /* 어깨까지 내린 긴 머리 */
  long: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    g.h(9 + Y, 21 + L, 26 + L, c);
    g.h(10 + Y, 20 + L, 27 + L, c);
    g.h(11 + Y, 19 + L, 28 + L, c);
    g.h(12 + Y, 19 + L, 28 + L, c);
    g.h(9 + Y, 22 + L, 25 + L, d);
    g.h(13 + Y, 19 + L, 21 + L, c);
    g.px(28 + L, 13 + Y, c);
    g.r(17 + L, 12 + Y, 3, 13, c);
    g.v(17 + L, 13 + Y, 24 + Y, d);
    g.r(28 + L, 13 + Y, 2, 9, c);
    g.px(29 + L, 15 + Y, d);
    g.h(25 + Y, 17 + L, 19 + L, d);
  },

  /* 땋아 늘인 머리 — 등 뒤로 내려간다 */
  queue: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    drawHair(g, po, c, d);
    g.r(16 + L, 13 + Y, 2, 16, c);
    g.px(16 + L, 16 + Y, d); g.px(17 + L, 20 + Y, d);
    g.px(16 + L, 24 + Y, d); g.px(17 + L, 28 + Y, d);
    g.h(29 + Y, 16 + L, 17 + L, d);
  },

  /* 상투 — 정수리에 틀어 올린다 */
  topknot: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    g.h(10 + Y, 20 + L, 27 + L, c);
    g.h(11 + Y, 19 + L, 28 + L, c);
    g.h(12 + Y, 19 + L, 28 + L, c);
    g.h(13 + Y, 19 + L, 20 + L, c);
    g.px(28 + L, 13 + Y, c);
    g.r(18 + L, 13 + Y, 2, 4, c);
    g.r(22 + L, 6 + Y, 3, 3, c);        // 튼 머리
    g.h(6 + Y, 22 + L, 24 + L, d);
    g.v(23 + L, 9 + Y, 10 + Y, d);
  },

  /* 벗어진 머리 — 옆머리만 남는다 */
  bald: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    g.r(18 + L, 13 + Y, 2, 5, c);
    g.px(19 + L, 13 + Y, c);
    g.h(13 + Y, 27 + L, 28 + L, c);
    g.px(28 + L, 14 + Y, d);
    g.px(18 + L, 17 + Y, d);
  },

  /* 곱슬 — 윤곽이 울퉁불퉁하다 */
  curly: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    g.h(10 + Y, 20 + L, 27 + L, c);
    g.h(11 + Y, 19 + L, 28 + L, c);
    g.h(12 + Y, 18 + L, 29 + L, c);
    g.h(13 + Y, 18 + L, 20 + L, c);
    g.px(29 + L, 13 + Y, c);
    g.px(20 + L, 9 + Y, c); g.px(23 + L, 8 + Y, c); g.px(26 + L, 9 + Y, c);
    g.px(18 + L, 10 + Y, c); g.px(29 + L, 11 + Y, c);
    g.px(22 + L, 10 + Y, d); g.px(25 + L, 11 + Y, d); g.px(19 + L, 12 + Y, d);
    g.r(18 + L, 14 + Y, 2, 3, c);
  },

  /* 정수리를 민 삭발 — 사제 */
  tonsure: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    g.h(12 + Y, 19 + L, 28 + L, c);
    g.h(13 + Y, 19 + L, 21 + L, c);
    g.px(28 + L, 13 + Y, c);
    g.px(19 + L, 11 + Y, c); g.px(28 + L, 11 + Y, c);
    g.r(18 + L, 13 + Y, 2, 5, c);
    g.h(12 + Y, 22 + L, 25 + L, d);
  },
};

/* ── ④ 수염 ─────────────────────────────────────────────────── */
const BEARDS = {
  none: () => {},

  stubble: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    for (const [x, y] of [[21, 20], [23, 20], [25, 20], [27, 19], [22, 21], [25, 21], [27, 21]]) {
      g.px(x + L, y + Y, d);
    }
    void c;
  },

  mustache: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    g.h(18 + Y, 25 + L, 28 + L, c);
    g.px(24 + L, 18 + Y, d); g.px(28 + L, 19 + Y, d);
  },

  goatee: (g, po, c, d) => {
    BEARDS.mustache(g, po, c, d);
    const L = HX(po), Y = HY(po);
    g.r(24 + L, 20 + Y, 3, 2, c);
    g.px(25 + L, 22 + Y, c);
    g.px(24 + L, 21 + Y, d);
  },

  short: (g, po, c, d) => {
    const L = HX(po), Y = HY(po);
    g.v(20 + L, 17 + Y, 19 + Y, c);
    g.h(19 + Y, 20 + L, 28 + L, c);
    g.h(20 + Y, 20 + L, 28 + L, c);
    g.h(21 + Y, 22 + L, 27 + L, c);
    g.h(18 + Y, 25 + L, 28 + L, c);
    g.h(21 + Y, 23 + L, 26 + L, d);
  },

  full: (g, po, c, d) => {
    BEARDS.short(g, po, c, d);
    const L = HX(po), Y = HY(po);
    g.v(19 + L, 16 + Y, 19 + Y, c);
    g.h(22 + Y, 22 + L, 27 + L, c);
    g.h(22 + Y, 23 + L, 26 + L, d);
  },

  long: (g, po, c, d) => {
    BEARDS.full(g, po, c, d);
    const L = HX(po), Y = HY(po);
    g.r(23 + L, 23 + Y, 4, 3, c);
    g.h(26 + Y, 24 + L, 26 + L, c);
    g.h(24 + Y, 24 + L, 25 + L, d);
    g.px(25 + L, 27 + Y, d);
  },
};

/* ── ⑤ 모자·두건 ────────────────────────────────────────────────
   `HEADGEAR`(병종용)에 손대지 않고 여기서만 늘린다. 다섯 가지는 그쪽을 그대로 빌려 쓰는데
   그것들은 **머리카락을 스스로 그리므로** `HAT_DRAWS_HAIR`에 적어 두고 머리모양을 건너뛴다. */
const HAT_DRAWS_HAIR = new Set(['tricorne', 'plumehat', 'morion', 'hood', 'bandana']);

const HATS = {
  none: () => {},

  tricorne: (g, s, po) => HEADGEAR.tricorne(g, s, po),
  plumehat: (g, s, po) => HEADGEAR.plumehat(g, s, po),
  morion:   (g, s, po) => HEADGEAR.morion(g, s, po),
  hood:     (g, s, po) => HEADGEAR.hood(g, s, po),
  bandana:  (g, s, po) => HEADGEAR.bandana(g, s, po),

  /* 챙 없는 납작 모자 */
  cap: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.r(19 + L, 9 + Y, 10, 3, h.M);
    g.h(9 + Y, 21 + L, 26 + L, h.L);
    g.h(12 + Y, 18 + L, 30 + L, h.D);
    g.px(30 + L, 11 + Y, h.M);
  },

  /* 베레 — 한쪽으로 흘러내린다 */
  beret: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.ellipse(23 + L, 10 + Y, 6, 3, h.M);
    g.h(8 + Y, 21 + L, 25 + L, h.L);
    g.h(12 + Y, 18 + L, 28 + L, h.D);
    g.px(30 + L, 10 + Y, h.M); g.px(29 + L, 11 + Y, h.M);
    g.px(23 + L, 6 + Y, h.D);
  },

  /* 머릿수건 — 두상을 감싸 목까지 내려온다 */
  coif: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.h(9 + Y, 21 + L, 26 + L, h.M);
    g.h(10 + Y, 20 + L, 27 + L, h.M);
    g.r(18 + L, 11 + Y, 12, 3, h.M);
    g.r(17 + L, 12 + Y, 3, 9, h.M);
    g.r(28 + L, 12 + Y, 2, 5, h.M);
    g.h(9 + Y, 22 + L, 25 + L, h.L);
    g.h(11 + Y, 20 + L, 26 + L, h.L);
    g.v(17 + L, 14 + Y, 20 + Y, h.D);
    g.h(21 + Y, 17 + L, 19 + L, h.D);
    g.h(13 + Y, 18 + L, 29 + L, h.D);   // 이마를 두른 천의 가장자리 — 없으면 '머리카락'으로 읽힌다
  },

  /* 터번 — 감은 결이 보인다 */
  turban: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.ellipse(23 + L, 10 + Y, 6, 4, h.M);
    g.h(6 + Y, 21 + L, 26 + L, h.L);
    g.h(12 + Y, 18 + L, 28 + L, h.D);
    g.line(18 + L, 11 + Y, 28 + L, 8 + Y, h.D);
    g.line(18 + L, 13 + Y, 28 + L, 10 + Y, h.D);
    g.line(19 + L, 10 + Y, 27 + L, 7 + Y, h.L);
    g.r(16 + L, 12 + Y, 3, 5, h.M);       // 흘러내린 자락
    g.px(16 + L, 16 + Y, h.D);
  },

  /* 페즈(타르부시) — 술이 달린 원통 */
  tarbush: (g, s, po) => {
    const L = HX(po), Y = HY(po);
    g.r(20 + L, 6 + Y, 8, 6, '#8f1f22');
    g.h(6 + Y, 21 + L, 26 + L, P.redM);
    g.h(7 + Y, 21 + L, 25 + L, P.redL);
    g.h(12 + Y, 19 + L, 28 + L, '#5c1216');
    g.v(28 + L, 6 + Y, 10 + Y, '#231d29');   // 술
    g.px(28 + L, 11 + Y, '#463c4e');
  },

  /* 쿠피야 — 머리에 얹은 천을 검은 끈으로 눌렀다 */
  keffiyeh: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.h(8 + Y, 21 + L, 26 + L, h.M);
    g.r(18 + L, 9 + Y, 12, 4, h.M);
    g.r(16 + L, 12 + Y, 3, 12, h.M);
    g.r(29 + L, 12 + Y, 2, 8, h.M);
    g.h(8 + Y, 22 + L, 25 + L, h.L);
    g.v(16 + L, 14 + Y, 23 + Y, h.D);
    g.h(24 + Y, 16 + L, 18 + L, h.D);
    g.h(20 + Y, 29 + L, 30 + L, h.D);
    g.h(10 + Y, 18 + L, 29 + L, '#231d29');  // 이깔
    g.h(12 + Y, 18 + L, 29 + L, '#231d29');
  },

  /* 쿠피(둥근 챙 없는 모자) */
  kufi: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.h(8 + Y, 21 + L, 26 + L, h.M);
    g.r(19 + L, 9 + Y, 10, 4, h.M);
    g.h(9 + Y, 21 + L, 26 + L, h.L);
    g.h(13 + Y, 19 + L, 28 + L, h.D);
    g.px(21 + L, 11 + Y, h.D); g.px(24 + L, 11 + Y, h.D); g.px(27 + L, 11 + Y, h.D);
  },

  /* 감아 두른 천 — 매듭이 한쪽에 온다 */
  headwrap: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.r(18 + L, 9 + Y, 12, 4, h.M);
    g.h(9 + Y, 20 + L, 26 + L, h.L);
    g.line(18 + L, 12 + Y, 29 + L, 9 + Y, h.D);
    g.h(13 + Y, 18 + L, 29 + L, h.D);
    g.r(16 + L, 8 + Y, 3, 3, h.M);           // 매듭
    g.px(16 + L, 9 + Y, h.L);
    g.r(15 + L, 10 + Y, 2, 4, h.D);
  },

  /* 밀짚모자 — 넓은 챙 */
  strawhat: (g, s, po) => {
    const L = HX(po), Y = HY(po);
    g.r(20 + L, 7 + Y, 8, 5, P.sandM);
    g.h(7 + Y, 21 + L, 26 + L, P.sandL);
    g.h(11 + Y, 20 + L, 27 + L, P.woodM);    // 띠
    g.ellipse(23 + L, 12 + Y, 10, 2, P.sandM);
    g.h(11 + Y, 15 + L, 31 + L, P.sandL);
    g.h(13 + Y, 14 + L, 32 + L, P.sandD);
  },

  /* 삿갓 — 원뿔 */
  conical: (g, s, po) => {
    const L = HX(po), Y = HY(po);
    g.poly([[23 + L, 4 + Y], [33 + L, 13 + Y], [13 + L, 13 + Y]], P.sandM);
    g.line(23 + L, 4 + Y, 14 + L, 13 + Y, P.sandL);
    g.line(24 + L, 5 + Y, 31 + L, 12 + Y, P.sandD);
    g.h(13 + Y, 13 + L, 33 + L, P.sandD);
    g.line(20 + L, 13 + Y, 22 + L, 20 + Y, '#3d2a1b');   // 턱끈
  },

  /* 갓 — 말총 원통에 넓고 얇은 챙, 망건이 이마를 두른다 */
  gat: (g, s, po) => {
    const L = HX(po), Y = HY(po);
    g.r(20 + L, 4 + Y, 8, 7, '#2a2230');
    g.h(4 + Y, 21 + L, 26 + L, '#463c4e');
    g.h(5 + Y, 21 + L, 24 + L, '#5a5064');
    g.h(11 + Y, 13 + L, 33 + L, '#231d29');
    g.h(12 + Y, 15 + L, 31 + L, '#17121c');
    g.h(13 + Y, 19 + L, 28 + L, '#17121c');              // 망건
    g.line(21 + L, 12 + Y, 22 + L, 19 + Y, '#3a3542');   // 갓끈
    g.px(22 + L, 20 + Y, '#3a3542');
  },

  /* 망건에 상투만 — 갓을 안 쓴 차림 */
  topknotband: (g, s, po, h, hc) => {
    const L = HX(po), Y = HY(po);
    g.r(22 + L, 6 + Y, 3, 3, hc[0]);
    g.h(6 + Y, 22 + L, 24 + L, hc[1]);
    g.v(23 + L, 9 + Y, 10 + Y, hc[1]);
    g.h(10 + Y, 20 + L, 27 + L, hc[0]);
    g.h(11 + Y, 19 + L, 28 + L, hc[0]);
    g.h(12 + Y, 19 + L, 28 + L, '#2a2230');
    g.h(13 + Y, 19 + L, 28 + L, '#17121c');
    g.px(21 + L, 7 + Y, P.goldM);                        // 동곳
  },

  /* 송콕 — 납작한 벨벳 모자 */
  songkok: (g, s, po) => {
    const L = HX(po), Y = HY(po);
    g.r(20 + L, 7 + Y, 9, 6, '#231d29');
    g.h(7 + Y, 21 + L, 27 + L, '#3a3542');
    g.h(8 + Y, 21 + L, 25 + L, '#4a4358');
    g.h(13 + Y, 19 + L, 28 + L, '#0e0a10');
  },

  /* 챙 넓은 펠트 모자 */
  broadhat: (g, s, po, h) => {
    const L = HX(po), Y = HY(po);
    g.r(20 + L, 5 + Y, 9, 6, h.M);
    g.h(5 + Y, 21 + L, 27 + L, h.L);
    g.h(10 + Y, 20 + L, 28 + L, h.D);
    g.h(11 + Y, 14 + L, 33 + L, h.M);
    g.h(12 + Y, 15 + L, 32 + L, h.D);
    g.px(14 + L, 11 + Y, h.D); g.px(33 + L, 11 + Y, h.D);
  },

  /* 모피 모자 — 북해 */
  fur: (g, s, po) => {
    const L = HX(po), Y = HY(po);
    g.r(19 + L, 8 + Y, 10, 4, '#4a3524');
    g.h(8 + Y, 21 + L, 26 + L, '#6b4626');
    g.h(12 + Y, 18 + L, 29 + L, '#3b2a1c');
    for (const x of [18, 20, 22, 24, 26, 28]) g.px(x + L, 13 + Y, '#6b4626');
    for (const x of [19, 21, 23, 25, 27, 29]) g.px(x + L, 13 + Y, '#3b2a1c');
  },
};

/* ── 긴 옷 바디 ────────────────────────────────────────────────
   ★ **인물은 실루엣부터 갈라야 알아본다**(이 도메인의 함정). 얼굴빛·모자를 아무리 갈라도
     162명이 전부 **무릎길이 코트에 장화**면 멀리서는 한 사람이다. 그래서 바다에 따라
     발목까지 내려오는 긴 옷을 입힌다 — 도포·젤라바·쿠르타·바주. 48px 안에서
     **다리가 안 보이는 것** 하나만으로 실루엣이 갈린다.
   비례 기준선은 공용이다: 머리 10~21 · 어깨 23 · 허리 31 · 자락 끝 43 · 발 43~45. */
function drawRobe(g, s, po) {
  const L = po.lean;
  // 상의 — 어깨에서 허리로 조금만 좁아진다
  g.poly([[17 + L, 23], [31 + L, 23], [31 + L, 31], [16 + L, 31]], s.cM);
  g.h(23, 18 + L, 30 + L, s.cL);
  g.h(24, 17 + L, 31 + L, s.cL);
  // 자락 — 허리에서 발치로 퍼진다(원통이면 뭉툭하다)
  g.poly([[16 + L, 31], [31 + L, 31], [33 + L, 42], [14 + L, 42]], s.cM);
  g.h(32, 17 + L, 30 + L, s.cL);
  g.h(40, 15 + L, 32 + L, s.cD);
  g.h(41, 14 + L, 33 + L, s.cD);
  g.h(42, 14 + L, 33 + L, s.trimD);          // 밑단 — 한 줄이면 족하다
  // 주름 — 퍼지는 방향을 따라간다
  g.line(20 + L, 33, 17 + L, 41, s.cD);
  g.line(24 + L, 33, 24 + L, 41, s.cD);
  g.line(28 + L, 33, 31 + L, 41, s.cD);
  // 목깃
  g.r(21 + L, 22, 6, 3, P.clothM);
  g.h(22, 21 + L, 26 + L, P.clothL);
  // 허리띠 — 넓게 두른다
  g.r(16 + L, 30, 16, 3, s.trimD);
  g.h(30, 16 + L, 31 + L, s.trim);
  g.px(24 + L, 31, s.trim); g.px(25 + L, 32, s.trimD);
  // 앞자락 여밈
  g.v(25 + L, 23, 29, s.cD);
  g.v(26 + L, 23, 29, s.cL);
}

/** 긴 옷 아래로는 신발코만 나온다 */
function drawRobeFeet(g, s, po) {
  const sp = Math.round(po.legSpread * 0.5);
  /* ⚠️ 자락 밑으로 나오는 것은 2px뿐이라 **어두운 색을 쓰면 아예 안 보인다**
     (처음에 P.woodD로 그렸다가 아웃라인에 먹혀 사라졌다). 중간톤 + 윗면 빛으로 받친다. */
  g.r(18 - sp, 43, 5, 2, P.woodM);
  g.h(43, 18 - sp, 22 - sp, P.woodL);
  g.h(44, 18 - sp, 22 - sp, P.woodD);
  g.r(26 + sp, 43, 5, 2, P.woodM);
  g.h(43, 26 + sp, 30 + sp, P.woodH);
  g.h(44, 26 + sp, 30 + sp, P.woodD);
}

/* ── ⑥ 옷깃 ─────────────────────────────────────────────────── */
const COLLARS = {
  plain: () => {},

  ruff: (g, s, po) => {                       // 주름깃
    const L = po.lean;
    g.h(21, 20 + L, 28 + L, P.clothM);
    g.h(22, 19 + L, 29 + L, P.clothL);
    g.h(23, 20 + L, 28 + L, P.clothM);
    for (const x of [20, 22, 24, 26, 28]) g.px(x + L, 22, P.clothD);
    g.px(19 + L, 21, P.clothD); g.px(29 + L, 21, P.clothD);
  },

  wide: (g, s, po) => {                       // 넓게 눕힌 흰 깃
    const L = po.lean;
    g.poly([[19 + L, 22], [29 + L, 22], [27 + L, 27], [21 + L, 27]], P.clothL);
    g.h(22, 20 + L, 28 + L, P.clothM);
    g.line(24 + L, 23, 22 + L, 27, P.clothD);
    g.line(25 + L, 23, 27 + L, 27, P.clothD);
    g.h(27, 21 + L, 27 + L, P.clothD);
  },

  shawl: (g, s, po, h) => {                   // 어깨에 걸친 숄
    const L = po.lean;
    g.h(23, 16 + L, 32 + L, h.M);
    g.h(24, 15 + L, 33 + L, h.M);
    g.h(25, 16 + L, 20 + L, h.M);
    g.h(25, 28 + L, 32 + L, h.M);
    g.h(23, 18 + L, 30 + L, h.L);
    g.h(26, 16 + L, 19 + L, h.D);
    g.h(26, 29 + L, 32 + L, h.D);
  },

  fur: (g, s, po) => {                        // 모피 깃
    const L = po.lean;
    g.h(22, 17 + L, 31 + L, '#4a3524');
    g.h(23, 16 + L, 32 + L, '#6b4626');
    g.h(24, 17 + L, 31 + L, '#3b2a1c');
    for (const x of [17, 19, 21, 25, 27, 29, 31]) g.px(x + L, 24, '#6b4626');
  },

  robe: (g, s, po) => {                       // 사선 여밈
    const L = po.lean;
    g.line(20 + L, 23, 27 + L, 31, s.cD);
    g.line(21 + L, 23, 28 + L, 31, s.cL);
    g.line(22 + L, 23, 29 + L, 31, s.cD);
    g.h(22, 21 + L, 27 + L, P.clothM);
    g.px(21 + L, 23, P.clothL);
  },

  sash: (g, s, po, h) => {                    // 어깨에서 허리로 두른 띠
    const L = po.lean;
    g.line(19 + L, 23, 30 + L, 34, h.M);
    g.line(20 + L, 23, 31 + L, 34, h.M);
    g.line(19 + L, 24, 30 + L, 35, h.D);
    g.px(20 + L, 23, h.L); g.px(24 + L, 28, h.L);
  },

  beads: (g, s, po) => {                      // 목걸이
    const L = po.lean;
    g.h(23, 21 + L, 27 + L, '#3d2a1b');
    for (const x of [21, 23, 25, 27]) g.px(x + L, 24, P.goldM);
    g.px(24 + L, 25, P.goldL);
    g.px(22 + L, 24, '#8a641a'); g.px(26 + L, 24, '#8a641a');
  },
};

/* ── ⑦ 장신구 ───────────────────────────────────────────────── */
const ACCS = {
  none: () => {},
  earring: (g, po) => {
    const L = HX(po), Y = HY(po);
    g.px(18 + L, 18 + Y, P.goldM); g.px(18 + L, 19 + Y, P.goldD);
  },
  eyepatch: (g, po) => {
    const L = HX(po), Y = HY(po);
    g.h(15 + Y, 19 + L, 29 + L, '#17121c');
    g.r(26 + L, 14 + Y, 3, 3, '#231d29');
    g.px(26 + L, 14 + Y, '#3a3542');
  },
  scar: (g, po, sk) => {
    const L = HX(po), Y = HY(po);
    g.line(26 + L, 13 + Y, 28 + L, 18 + Y, sk.D);
    g.px(27 + L, 15 + Y, '#a8544a');
  },
  specs: (g, po) => {
    const L = HX(po), Y = HY(po);
    g.box(22 + L, 15 + Y, 3, 3, P.ironM);
    g.box(26 + L, 15 + Y, 3, 3, P.ironM);
    g.px(25 + L, 16 + Y, P.ironL);
    g.px(23 + L, 16 + Y, P.steelL);
  },
  pipe: (g, po) => {
    const L = HX(po), Y = HY(po);
    g.line(29 + L, 19 + Y, 33 + L, 21 + Y, '#3d2a1b');
    g.r(33 + L, 19 + Y, 2, 3, P.woodM);
    g.px(33 + L, 18 + Y, '#8f8878');
  },
};

/* ── 손에 든 것 — 직업의 표시 ────────────────────────────────── */
const PROPS = {
  scroll: (g, s, po) => {                     // 두루마리 (학자·지도장이)
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 30 + L + ax, hy = 32 + ay;
    g.r(hx, hy - 4, 3, 9, P.clothM);
    g.v(hx, hy - 4, hy + 4, P.clothL);
    g.v(hx + 2, hy - 4, hy + 4, P.clothD);
    g.h(hy - 5, hx - 1, hx + 3, '#8a6a44');
    g.h(hy + 5, hx - 1, hx + 3, '#8a6a44');
  },
  cane: (g, s, po) => {                       // 지팡이 (나이 든 사람)
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 32 + L + ax;
    g.v(hx, 28 + ay, 45, P.woodM);
    g.v(hx + 1, 28 + ay, 45, P.woodD);
    g.r(hx - 1, 27 + ay, 3, 2, P.goldD);
    g.px(hx, 27 + ay, P.goldM);
  },
  pouch: (g, s, po) => {                      // 돈주머니 (전주·중개인)
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 31 + L + ax, hy = 34 + ay;
    g.ellipse(hx + 1, hy + 1, 3, 3, '#6b4626');
    g.h(hy + 3, hx - 1, hx + 3, '#3d2a1b');
    g.h(hy - 2, hx, hx + 2, '#8a641a');       // 조인 목
    g.px(hx + 1, hy - 3, P.goldM);
    g.px(hx, hy, '#8a6a44');
  },
  scale: (g, s, po) => {                      // 손저울 (환전·계량)
    const L = po.lean, ay = po.armY, ax = po.armX;
    const hx = 32 + L + ax, hy = 31 + ay;
    g.v(hx, hy - 5, hy, P.ironM);             // 자루
    g.h(hy - 5, hx - 4, hx + 4, P.ironM);     // 대
    g.px(hx, hy - 6, P.ironL);
    g.v(hx - 4, hy - 4, hy - 2, '#6d5b3f');   // 줄
    g.v(hx + 4, hy - 4, hy - 2, '#6d5b3f');
    g.h(hy - 1, hx - 5, hx - 3, P.goldD);     // 접시
    g.h(hy - 1, hx + 3, hx + 5, P.goldD);
    g.px(hx - 4, hy - 1, P.goldM); g.px(hx + 4, hy - 1, P.goldM);
  },
};

const drawProp = (g, s, po, sk, key) => (PROPS[key] ?? WEAPONS[key] ?? WEAPONS.none)(g, s, po, sk);

/* ── ⑧ 나이 ─────────────────────────────────────────────────── */
function drawAged(g, po, sk) {
  const L = HX(po), Y = HY(po);
  g.h(14 + Y, 21 + L, 24 + L, sk.D);          // 이마 주름
  g.px(26 + L, 14 + Y, sk.D);
  g.px(22 + L, 18 + Y, sk.D);                 // 팔자
  g.px(26 + L, 18 + Y, sk.D);
  g.px(21 + L, 17 + Y, sk.D);                 // 눈밑
}

/* ── 바다마다 다른 차림 ──────────────────────────────────────── */
const CULTURE = {
  mediterranean: { hats: ['coif', 'beret', 'cap', 'none', 'hood', 'strawhat'],
                   hair: ['crop', 'side', 'curly', 'long', 'tonsure'],
                   hairCol: ['jet', 'brown', 'chest', 'black'],
                   collar: ['ruff', 'wide', 'plain', 'sash'],
                   cloth: ['white', 'crimson', 'earth', 'green', 'indigo'],
                   scheme: ['wine', 'plum', 'earth', 'crimson', 'ivory'] },
  atlantic:      { hats: ['cap', 'beret', 'coif', 'fur', 'tricorne', 'none'],
                   hair: ['crop', 'side', 'long', 'bald', 'curly'],
                   hairCol: ['brown', 'chest', 'auburn', 'blond', 'jet'],
                   collar: ['ruff', 'wide', 'fur', 'plain'],
                   cloth: ['black', 'earth', 'crimson', 'white'],
                   scheme: ['slate', 'ink', 'earth', 'navy', 'ivory'] },
  mideast:       { hats: ['turban', 'tarbush', 'keffiyeh', 'coif', 'none'],
                   hair: ['crop', 'side', 'bald'],
                   hairCol: ['black', 'jet'],
                   collar: ['robe', 'sash', 'shawl', 'plain'],
                   cloth: ['white', 'saffron', 'indigo', 'crimson', 'white'],
                   scheme: ['sand', 'saffron', 'ivory', 'indigo', 'wine'] },
  africa:        { hats: ['kufi', 'headwrap', 'strawhat', 'none', 'conical'],
                   hair: ['curly', 'crop', 'bald'],
                   hairCol: ['black', 'jet'],
                   collar: ['beads', 'shawl', 'sash', 'plain'],
                   cloth: ['saffron', 'indigo', 'crimson', 'white', 'green'],
                   scheme: ['saffron', 'indigo', 'earth', 'olive', 'wine'] },
  indian:        { hats: ['turban', 'headwrap', 'cap', 'none', 'coif'],
                   hair: ['crop', 'side', 'bald', 'long'],
                   hairCol: ['black', 'jet'],
                   collar: ['shawl', 'robe', 'sash', 'plain'],
                   cloth: ['white', 'saffron', 'crimson', 'indigo'],
                   scheme: ['ivory', 'saffron', 'wine', 'indigo', 'earth'] },
  seasia:        { hats: ['songkok', 'conical', 'headwrap', 'strawhat', 'none'],
                   hair: ['crop', 'topknot', 'side', 'bald'],
                   hairCol: ['black', 'jet'],
                   collar: ['sash', 'robe', 'shawl', 'plain'],
                   cloth: ['indigo', 'crimson', 'earth', 'saffron'],
                   scheme: ['indigo', 'olive', 'earth', 'saffron', 'wine'] },
  eastasia:      { hats: ['gat', 'conical', 'topknotband', 'cap', 'none'],
                   hair: ['topknot', 'queue', 'crop', 'side'],
                   hairCol: ['black', 'jet'],
                   collar: ['robe', 'sash', 'plain'],
                   cloth: ['indigo', 'white', 'black', 'crimson'],
                   scheme: ['indigo', 'ink', 'ivory', 'wine', 'slate'] },
  caribbean:     { hats: ['bandana', 'strawhat', 'tricorne', 'headwrap', 'none'],
                   hair: ['curly', 'crop', 'long', 'bald'],
                   hairCol: ['jet', 'black', 'brown', 'chest'],
                   collar: ['plain', 'sash', 'wide', 'beads'],
                   cloth: ['crimson', 'earth', 'white', 'green'],
                   scheme: ['earth', 'crimson', 'olive', 'ivory', 'slate'] },
  southamerica:  { hats: ['broadhat', 'morion', 'strawhat', 'cap', 'none'],
                   hair: ['crop', 'side', 'long', 'curly'],
                   hairCol: ['jet', 'brown', 'chest', 'black'],
                   collar: ['ruff', 'wide', 'plain', 'sash'],
                   cloth: ['black', 'earth', 'crimson', 'white'],
                   scheme: ['ink', 'wine', 'earth', 'slate', 'saffron'] },
};
const CULT = (r) => CULTURE[r] ?? CULTURE.mediterranean;

/* 그 바다에서 흔한 수염 — 얼굴빛만으로는 아홉이 안 갈린다 */
const BEARD_POOL = {
  mideast:  ['full', 'long', 'short', 'full', 'goatee'],
  indian:   ['full', 'short', 'mustache', 'goatee', 'none'],
  eastasia: ['none', 'mustache', 'goatee', 'long', 'none'],
  africa:   ['short', 'none', 'stubble', 'goatee', 'full'],
  seasia:   ['none', 'stubble', 'mustache', 'goatee', 'none'],
  default:  ['none', 'stubble', 'mustache', 'goatee', 'short', 'full'],
};

/* 직업 → 배색·손에 든 것·나이. **직업이 사람의 절반**이다 */
const JOB_LOOK = {
  '官':          { scheme: ['plum', 'indigo', 'slate', 'wine'], prop: 'ledger', alt: 'scroll', robe: 0.8, old: 0.5 },
  official:      { scheme: ['plum', 'indigo', 'slate', 'wine'], prop: 'ledger', alt: 'scroll', robe: 0.8, old: 0.5 },
  harbormaster:  { scheme: ['slate', 'navy', 'indigo'], prop: 'ledger', alt: 'scale', old: 0.35 },
  guildmaster:   { scheme: ['wine', 'plum', 'ivory'], prop: 'ledger', alt: 'pouch', robe: 0.4, old: 0.55 },
  broker:        { scheme: ['earth', 'slate', 'ivory', 'indigo'], prop: 'ledger', alt: 'scale', old: 0.3 },
  moneylender:   { scheme: ['ink', 'slate', 'earth', 'wine'], prop: 'ledger', alt: 'pouch', old: 0.5 },
  scholar:       { scheme: ['ink', 'slate', 'ivory', 'olive'], prop: 'scroll', robe: 0.7, old: 0.55, acc: 'specs' },
  cartographer:  { scheme: ['olive', 'slate', 'ivory'], prop: 'scroll', old: 0.35, acc: 'specs' },
  priest:        { scheme: ['ink', 'ivory', 'wine'], prop: 'none', alt: 'scroll', robe: 0.9, old: 0.5 },
  physician:     { scheme: ['ivory', 'ink', 'slate'], prop: 'scroll', alt: 'pouch', robe: 0.5, old: 0.45 },
  interpreter:   { scheme: ['saffron', 'earth', 'indigo', 'ivory'], prop: 'scroll', alt: 'ledger', old: 0.2 },
  shipwright:    { scheme: ['earth', 'olive', 'navy'], prop: 'none', old: 0.3 },
  smuggler:      { scheme: ['ink', 'earth', 'olive', 'slate'], prop: 'cutlass', old: 0.15 },
  informant:     { scheme: ['ink', 'earth', 'slate'], prop: 'none', old: 0.2 },
  gunsmith:      { scheme: ['crimson', 'earth', 'slate'], prop: 'musket', old: 0.3 },
  /* 동료(항해사) — `npc-mates.js: role` */
  captain:       { scheme: ['plum', 'navy', 'crimson', 'wine'], prop: 'cutlass', old: 0.3 },
  navigator:     { scheme: ['navy', 'indigo', 'slate'], prop: 'scroll', old: 0.25 },
  gunner:        { scheme: ['crimson', 'earth', 'saffron'], prop: 'musket', old: 0.2 },
  bosun:         { scheme: ['forest', 'olive', 'earth'], prop: 'none', old: 0.2 },
  surgeon:       { scheme: ['ivory', 'ink', 'slate'], prop: 'none', old: 0.4, acc: 'specs' },
  purser:        { scheme: ['earth', 'slate', 'ivory'], prop: 'ledger', old: 0.3 },
};
const JOB_DEFAULT = { scheme: ['earth', 'navy', 'olive', 'slate'], prop: 'none', old: 0.25 };

/* 그 바다에서 발목까지 오는 긴 옷을 입은 사람의 비율 — **실루엣이 갈리는 자리**다.
   배를 타는 사람(동료·해적)은 자락이 걸리므로 코트 쪽이고, 항구에 앉은 사람은 긴 옷이 흔하다. */
const ROBE_ODDS = {
  mideast: 0.75, indian: 0.6, eastasia: 0.65, africa: 0.55, seasia: 0.45,
  mediterranean: 0.2, atlantic: 0.12, caribbean: 0.1, southamerica: 0.15,
};

/** id 하나에서 한 사람의 생김새를 뽑는다 — 같은 id면 언제나 같은 얼굴이다 */
function lookOf(id, { region = null, job = null, kind = 'figure', tier = 2, sex = null } = {}) {
  const c = chooser(seedOf(`${kind}|${id}`));
  const cu = CULT(region);
  const jl = JOB_LOOK[job] ?? JOB_DEFAULT;
  const pirate = kind === 'pirate';

  const age = c.odds(jl.old) ? 'old' : (c.odds(0.35) ? 'young' : 'mid');
  let hair = c.pick(cu.hairCol);
  if (age === 'old' && c.odds(0.65)) hair = c.odds(0.5) ? 'white' : 'grey';

  /* 해적은 그 바다의 차림 위에 **자기 표식**을 얹는다 — 두건·안대·귀고리·흉터 */
  const hats = pirate ? [...cu.hats, 'bandana', 'headwrap', 'none'] : cu.hats;
  const hat = (tier >= 4 && c.odds(0.5)) ? c.pick(['plumehat', 'tricorne', 'turban', 'broadhat'])
                                         : c.pick(hats);

  const accPool = pirate ? ['none', 'earring', 'eyepatch', 'scar', 'earring', 'scar']
                         : ['none', 'none', 'none', 'earring', 'scar', 'pipe'];
  const acc = (jl.acc && c.odds(0.55)) ? jl.acc : c.pick(accPool);

  const scheme = c.odds(0.45) ? c.pick(cu.scheme)
               : (pirate ? c.pick(['ink', 'crimson', 'wine', 'sand', 'forest', 'slate', 'earth'])
                         : c.pick(jl.scheme));

  return {
    skin: REGION_SKIN[region] ?? (SCHEMES[scheme]?.skin ?? 'light'),
    scheme,
    hairStyle: c.pick(cu.hair),
    hair,
    beard: c.pick(BEARD_POOL[region] ?? BEARD_POOL.default),
    hat,
    cloth: c.pick(cu.cloth),
    collar: c.pick(cu.collar),
    acc,
    age,
    /* ★ **성별은 뽑지 않는다 — 데이터가 말해 줄 때만 안다**(ART-ISSUES B-4).
       명부의 `sex:'f'`가 있는 사람만 여성 바디로 그린다. 씨앗으로 굴려 배정하면
       *역사 인물의 성별을 코드가 추측하는 것*이 되고, 이 저장소의 규약(「사실은 사료에
       충실하게」)을 화면이 어긴다. 그래서 기본값은 언제나 남성 바디다. */
    fem: sex === 'f',
    /* 뱃사람은 자락이 걸린다 — 긴 옷은 항구에 앉은 사람 쪽이다.
       ⚠️ 여성 바디에는 `drawRobe`의 짝(치마 실루엣과 겹친다)이 없으므로 코트로 묶는다. */
    body: (!pirate && kind !== 'mate' && sex !== 'f'
           && c.odds(jl.robe ?? (ROBE_ODDS[region] ?? 0.15))) ? 'robe' : 'coat',
    prop: pirate ? (tier >= 4 ? 'scimitar' : c.pick(['cutlass', 'cutlass', 'scimitar', 'musket', 'torch']))
                 : ((age === 'old' && jl.prop === 'none' && c.odds(0.4)) ? 'cane'
                    : (jl.alt && c.odds(0.45)) ? jl.alt : jl.prop),
    armor: pirate ? (tier >= 4 ? 'buffcoat' : (c.odds(0.3) ? 'bandolier' : 'none'))
                  : (c.odds(0.12) ? 'buffcoat' : 'none'),
  };
}

/** 그 생김새 한 사람을 그리는 붓 */
function portraitPainter(look) {
  return (g, ctx) => {
    const s = SCHEMES[look.scheme] ?? SCHEMES.navy;
    const sk = SKINS[look.skin] ?? SKINS.light;
    const hc = HAIRS[look.hair] ?? HAIRS.brown;
    const h = CLOTHES[look.cloth] ?? CLOTHES.white;
    const po = poseOf('idle');
    const robe = look.body === 'robe';
    /* ★ 여성 바디(ART-ISSUES B-4). `drawHeadFem`은 **공용 두상 위에 이목구비만** 얹으므로
       모자·머리모양·수염·장신구는 좌표가 그대로 맞는다 — 갈리는 것은 실루엣과 얼굴뿐이다. */
    const fem = look.fem === true;
    (fem ? drawArmsFem : drawArms)(g, s, po, sk);   // 뒤팔 → 몸 → 머리 → 앞팔 → 물건 (순서가 곧 z축)
    if (robe) { drawRobe(g, s, po); drawRobeFeet(g, s, po); }
    else if (fem) { drawLegsFem(g, s, po); drawTorsoFem(g, s, po); }
    else { drawLegs(g, s, po); drawTorso(g, s, po); }
    if (!robe && !fem) ARMOR[look.armor]?.(g, s, po);   // 흉갑·탄띠는 남성 몸통 기준으로 그려진다
    if (!fem) COLLARS[look.collar]?.(g, s, po, h);      // 보디스에 레이스 깃이 이미 있다
    (fem ? drawHeadFem : drawHead)(g, s, po, sk);
    if (look.age === 'old') drawAged(g, po, sk);
    if (!fem) BEARDS[look.beard]?.(g, po, hc[0], hc[1]);
    if (!HAT_DRAWS_HAIR.has(look.hat)) HAIRSTYLES[look.hairStyle]?.(g, po, hc[0], hc[1]);
    (HATS[look.hat] ?? HATS.none)(g, s, po, h, hc);
    (fem ? drawFrontArmFem : drawFrontArm)(g, s, po, sk);
    drawProp(g, s, po, sk, look.prop);
    ACCS[look.acc]?.(g, po, sk);
    outline(ctx, CW, CH);
  };
}

/** 인물 id에서 권역을 읽는다 — `med-rialto-tipster` → `mediterranean` */
export const regionOfNpcId = (id) => REGION_BY_PREFIX[String(id || '').slice(0, 3)] ?? null;

/* ── 조립 ──────────────────────────────────────────────────── */
export function unitSprite(unitKey, pose = 'idle', schemeOverride = null, faceKey = null) {
  const u = UNITS[unitKey];
  if (!u) throw new Error(`unknown unit: ${unitKey}`);
  const schemeKey = schemeOverride || u.scheme;
  /* ★ `faceKey`는 **그림을 갈아 끼울 자리**다(권역 이름이 온다 — `eastasia`·`mediterranean`).
     키만 갈라 두고 배색(`schemeKey`)은 그대로 쓴다. 그래서 PNG가 있는 바다는 그 얼굴이 뜨고,
     없는 바다는 지금까지처럼 코드 생성으로 그려진다.
     전에는 키가 배색뿐이라 `assets/npc/char-sailor-eastasia.png`를 manifest에 적어도
     **아무 데서도 불리지 않아** 그림이 한 픽셀도 안 나왔다(로더는 "갈아 끼웠다"고 말한다). */
  const key = `char:${unitKey}:${pose}:${faceKey || schemeKey}`;
  return bake(key, CW, CH, painter(u, pose, schemeKey, faceKey));
}

/** 한 사람을 그리는 붓 — 키만 다른 초상들(인물·이름난 해적)이 같은 붓을 쓴다. */
function painter(u, pose, schemeKey, faceKey = null) {
  return (g, ctx) => {
    const s = SCHEMES[schemeKey];
    /* ★ 얼굴빛만 권역을 본다 — 배색은 병종의 정보라 안 건드린다(C-14) */
    const sk = skinOf(s, faceKey);
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
  };
}

/* ── 초상 — 얼굴이 오면 갈아 끼울 자리 (assets/BRIEF-NPC.md §4 ②③) ──────
   ★ 회차 22까지는 **그림이 없으면 개별 키로 굽지 않았다** — 폴백이 다 같은 그림이라
     각자 키로 구우면 똑같은 캔버스가 수십 장 캐시(6MB LRU)를 먹어서였다.
   ★ 회차 23에 그 전제가 깨졌다. 이제 폴백은 사람마다 **다른 그림**이다(위 `lookOf`).
     그래서 각자 자기 키로 굽는다 — 162명이 전부 캐시에 오르면 48×48×4 = 9.2KB × 162 ≒ 1.5MB로
     상한 6MB 안이고, 실제로는 한 화면에 대여섯 명뿐이라 LRU가 알아서 정리한다. */

/** 항구에 머무는 사람(중개인·관리·정보상…) — 그림은 `figure:<인물id>:idle`.
    권역은 id 접두사에서 읽는다(`med-rialto-tipster`). 씬이 넘겨 주면 그쪽이 이긴다. */
export function figureSprite(id, job = null, region = null, sex = null) {
  const key = `figure:${id}:idle`;              // 그림이 있으면 bake가 그것을 돌려준다
  const look = lookOf(id, { region: region ?? regionOfNpcId(id), job, kind: 'figure', sex });
  return bake(key, CW, CH, portraitPainter(look));
}

/** 배에 타는 사람(동료 51명) — 그림은 `mate:<동료id>:idle`.
    ★ 회차 23에 새로 낸 자리다. `port.js: mateCard`에는 아직 초상 칸이 없다(ART-ISSUES B-2). */
export function mateSprite(id, role = null, region = null, sex = null) {
  const key = `mate:${id}:idle`;
  const look = lookOf(id, { region: region ?? regionOfNpcId(id), job: role, kind: 'mate', sex });
  return bake(key, CW, CH, portraitPainter(look));
}

/** 이름난 해적 — 그림은 `pirate:<해적id>:idle`. 두목급(tier≥4)은 차림이 화려해진다.
    ⚠️ **`region`은 부르는 쪽이 준다.** 해적 명부 id에는 권역 약자가 없어서(`barbarossa`)
      한동안 이 파일에 `PIRATE_SEA` 40줄짜리 표를 임시로 뒀는데, 그 사실의 정본은
      명부의 `base`(소굴 항구)이고 `regions/index.js`가 이미 각 항목에 `region`을 달아 준다.
      **같은 사실이 두 곳에 있으면 갈라진다** — 명부가 늘 때마다 그림 쪽 표를 같이 고쳐야 했다.
      ⇒ 표를 걷었다. 호출부(`scenes/battle.js`)가 명부에서 읽어 넘긴다(ART-ISSUES B-1). */
export function pirateSprite(id, tier = 1, region = null, sex = null) {
  const key = `pirate:${id}:idle`;
  const look = lookOf(id, { region, kind: 'pirate', tier, sex });
  return bake(key, CW, CH, portraitPainter(look));
}

export const UNIT_KEYS = Object.keys(UNITS);
export { FOOT as CHAR_FOOT };
