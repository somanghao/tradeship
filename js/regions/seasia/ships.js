// regions/seasia/ships.js — 동남아·향료제도에서 짓는 배
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
//
// ── 이 바다의 배가 다른 이유 ────────────────────────────────
// 두 가지가 유럽 배와 다르다.
//   ① **선체**: 널을 나무못(도웰)으로 꿰어 옆으로 잇는 껍질우선 공법이라 **쇠못을 안 쓴다.**
//      큰 종(jong)은 널을 **네 겹**으로 댔고, 포르투갈 포탄이 두 겹까지밖에 못 뚫었다는
//      기록이 남아 있다. 그래서 종의 hp를 이 게임 최상급으로 뒀다 — 이 바다의 배는
//      빠르거나 무장이 좋아서가 아니라 **맞아도 안 뚫려서** 강하다.
//   ② **돛**: 탄자세일(기울어진 사각 러그세일)과 정크세일이다. 가로돛이 아니다 —
//      그래서 `rig`가 전부 0.0~0.20이다. 그림의 돛도 같이 가야 한다(art.hullTodo 참조).
//
// ★ hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜬다. 종·프라우·란차랑·코라코라·
//   발랑가이는 하나도 없어서 **가장 가까운 것을 빌렸고**, 무엇이 달라야 하는지를
//   근거 JSON의 art.hullTodo에 적어 뒀다.
// ★ originFlag는 자바 배(프라우·종)가 `majapahit`, 말레이 배(란차랑)가 `malacca`다.
//   전에 전부 null이었던 것은 이 권역 항구가 거의 다 'ottoman'을 빌려 써서
//   **어느 항구에서나 종을 짓게 되기 때문**이었다. 깃발이 갈린 지금은 그 걱정이 없다.
//   ※ geo.js 배선이 끝나야 실제로 할인이 붙는다. 말루쿠(코라코라)와 루손(발랑가이)은
//     아직 제 깃발이 없어 null 그대로다.

export const SHIPS = {
  /* ★ 이 바다의 시작배(tier 0) — 지중해 `hulk`와 같은 자리. 제원은 그것에 맞춘다. */
  oldperahu: {
    hull: 'caravel', name: '삭은 프라우', origin: '해협의 헌 배', originFlag: null, tier: 0,
    era: 'classic', yards: [], price: 320,
    hp: 52, crew: 8, crewMax: 15, crewMin: 5, cargo: 46, guns: 1, speed: 0.86,
    upkeep: 2, rig: 0.30, leak: 2, tint: 'rot',
    desc: '야자 섬유로 꿰맨 자리가 삭았다. 물을 퍼내며 가는 배다.',
  },
  perahu: {
    hull: 'caravel', name: '프라우', origin: '말레이·자바', originFlag: 'majapahit', tier: 1, era: 'classic', requires: null,
    yards: ['melaka', 'johor', 'banten', 'pasai'],
    price: 1300,
    hp: 66, crew: 12, crewMax: 20, crewMin: 6, cargo: 88, guns: 3, speed: 1.30,
    upkeep: 5, rig: 0.00, tint: 'oak',
    desc: '이 바다 어디에나 있는 널배. 탄자세일 한 장으로 섬 사이를 부지런히 오간다. 값싸고 제법 싣는다.',
  },
  korakora: {
    // 향료제도의 노 젓는 배. 대나무 아웃리거 위에 사람이 늘어서서 젓는다.
    // 짐칸이 26칸뿐이라 장사에는 쓸모가 없다 — 대신 이 바다에서 가장 빠르다.
    // 화물 26 ÷ 최소인원 30 = 0.87. 지중해 갤리(1.2)보다도 극단적인 값인데,
    // 애초에 짐을 싣는 배가 아니라 사람을 실어 나르는 배였으니 그 값이 맞다.
    hull: 'galley', name: '코라코라', origin: '말루쿠', originFlag: null, tier: 1, era: 'classic', requires: null,
    yards: ['ternate', 'tidore', 'ambon'],
    price: 1900,
    hp: 58, crew: 44, crewMax: 90, crewMin: 30, cargo: 26, guns: 5, speed: 1.55,
    upkeep: 8, rig: 0.00, tint: 'dark',
    desc: '아웃리거 위에 노잡이 마흔이 늘어선 향료제도의 전투선. 바람이 없어도 나아가고 무섭게 빠르지만 짐은 거의 못 싣는다.',
  },
  balangay: {
    // 널을 나무못과 등나무 끈으로 꿰어 만든 배. 큰 것은 밀 500~600파네가를 실었다는
    // 에스파냐 기록이 있다 — 이 바다의 **쌀 운반선**이다. 향료제도가 굶지 않는 이유.
    hull: 'hulk', name: '발랑가이', origin: '루손·보르네오', originFlag: null, tier: 1, era: 'classic', requires: null,
    yards: ['brunei', 'makassar', 'sundakelapa'],
    price: 2300,
    hp: 96, crew: 34, crewMax: 60, crewMin: 20, cargo: 128, guns: 2, speed: 1.00,
    upkeep: 8, rig: 0.15, tint: 'oak',
    desc: '널을 등나무로 꿰어 만든 둔한 짐배. 포문은 둘뿐이지만 쌀을 잔뜩 싣고 동쪽 섬으로 올라간다.',
  },
  lancaran: {
    // 노와 탄자세일을 같이 쓰는 말레이의 주력선. 짐배로도 싸움배로도 썼다.
    // 사료의 승조원은 150~200명이고 화물은 150톤 안팎 — 사람을 많이 먹는 배다.
    hull: 'galley', name: '란차랑', origin: '말레이·아체', originFlag: 'malacca', tier: 2, era: 'classic', requires: null,
    yards: ['aceh', 'johor', 'patani'],
    price: 3400,
    hp: 130, crew: 70, crewMax: 130, crewMin: 45, cargo: 120, guns: 10, speed: 1.30,
    upkeep: 16, rig: 0.20, tint: 'dark',
    desc: '노 두 줄에 탄자세일을 얹은 말레이의 주력선. 선수에 르라 포를 걸고 짐도 나른다. 사람을 많이 먹는다.',
  },
  jong: {
    // ★ 이 바다의 대표선. 널을 네 겹으로 댄 선체, 돛 서너 장, 쇠못 없음.
    //   포르투갈 배가 올려다볼 만큼 컸다는 기록이 있어 hp를 최상급으로 뒀다.
    //   대신 느리고(0.92) 포문이 적다 — 싸움배가 아니라 **거대한 짐배**다.
    //   화물 300 ÷ 최소인원 36 = 8.3. 코카(13)보다 낮고 갤리(1.2)보다 훨씬 높다.
    //   큰 선체를 다루는 데 손이 많이 갔던 배라 이 자리가 맞다.
    hull: 'indiaman', name: '종', origin: '자바', originFlag: 'majapahit', tier: 3, era: 'classic', requires: 'perahu',
    yards: ['tuban', 'gresik', 'pegu'],
    price: 24000,
    hp: 260, crew: 90, crewMax: 180, crewMin: 36, cargo: 300, guns: 16, speed: 0.92,
    upkeep: 48, rig: 0.15, tint: 'white',
    desc: '자바 북안이 짓던 거대한 상선. 널을 네 겹으로 댄 선체는 포탄이 두 겹까지밖에 못 뚫는다. 느리지만 이보다 많이 싣는 배가 없다.',
  },

  /* ══ 회차 28 · 콘텐츠 확장 ═══════════════════════════════════════
     ★ 란차랑(3,400)에서 종(24,000)까지 **일곱 배의 빈 계단**이 있었다. 그 사이를 채운다. */

  penjajap: {
    hull: 'galley', name: '펜자잡', origin: '말레이 해협', originFlag: 'malacca',
    tier: 1, era: 'classic', yards: ['johor', 'patani', 'aceh'], price: 1750,
    // 해협의 습격선. 노가 스물이 넘고 돛은 보조라, 무풍의 좁은 물목에서 상선을 따라잡는다.
    // 포르투갈 기록이 믈라카 함락 전후로 가장 자주 적은 배 이름이 이것이다.
    hp: 62, crew: 20, crewMax: 30, crewMin: 12, cargo: 34, guns: 6, speed: 1.50,
    upkeep: 7, rig: 0.10, tint: 'dark',
    desc: '노 스물로 좁은 물목을 건너 상선에 붙는 습격선. 실을 것은 거의 없고 발만 빠르다.',
  },
  pencalang: {
    hull: 'fluyt', name: '펜찰랑', origin: '자바 북안', originFlag: 'majapahit',
    tier: 2, era: 'classic', yards: ['banten', 'makassar', 'brunei'], price: 5400,
    // 자바·수마트라 연안을 오가던 무역선. 이물이 높고 선미가 넓어 쌀과 후추를 많이 싣는다.
    // 화물/최소선원 12.3 — 이 바다에서 사람 대비 가장 많이 싣는 배다.
    hp: 126, crew: 22, crewMax: 36, crewMin: 14, cargo: 172, guns: 4, speed: 1.05,
    upkeep: 17, rig: 0.25, tint: 'oak',
    desc: '자바 북안의 연안 무역선. 싸움은 못 하지만 적은 손으로 쌀과 후추를 잔뜩 싣는다.',
  },
  ghurab: {
    hull: 'frigate', name: '구랍', origin: '아체 술탄국', originFlag: 'malacca',
    tier: 2, era: 'classic', yards: ['aceh', 'patani'], price: 8900, requires: 'lancaran',
    // 아체가 포르투갈령 믈라카를 여러 번 치러 갈 때 앞세운 큰 갤리(아랍어 ghurāb, '까마귀').
    // 오스만이 보낸 포수와 대포가 이 배에 실렸다 — 그래서 이 바다에서 포가 가장 많다.
    hp: 178, crew: 44, crewMax: 68, crewMin: 24, cargo: 96, guns: 18, speed: 1.30,
    upkeep: 27, rig: 0.25, tint: 'dark',
    desc: '아체 술탄이 믈라카를 치러 갈 때 앞세운 큰 갤리. 오스만이 보낸 대포를 그대로 얹었다.',
  },

  /* ══ 회차 29 · 콘텐츠 확장 ═══════════════════════════════════════
     ★ 여덟 종에서 열한 종으로. 가장 싼 자리(프라우 1,300)는 그대로 두고 그 위 빈 계단만 채운다.
       근거는 `content/regions/seasia-evidence.json`. */

  orembai: {
    hull: 'caravel', name: '오렘바이', origin: '말루쿠', originFlag: null,
    tier: 1, era: 'classic', yards: ['ternate', 'tidore', 'ambon'], price: 1600,
    // 말루쿠의 판재 조립선. 이물과 고물이 둘 다 초승달처럼 치솟은 좌우대칭 배로, 술탄이
    // 공식 행렬에 쓰던 배이자 평범한 어로·운송선이기도 했다. 이름은 말레이어 rembaya
    // ('국가의 배')에 포르투갈식 관사가 붙은 것으로 본다. 17세기 바타비아에서는 네덜란드인이
    // 저녁에 운하로 이 배를 저어 나가는 것이 한동안 유행이었을 만큼 흔한 배였다.
    hp: 60, crew: 10, crewMax: 18, crewMin: 6, cargo: 72, guns: 1, speed: 1.15,
    upkeep: 5, rig: 0.10, tint: 'oak',
    desc: '이물고물이 초승달처럼 치솟은 말루쿠의 판재선. 술탄의 행렬에도 쓰이고 평소엔 흔한 어로·운송선이다.',
  },
  juanga: {
    hull: 'galley', name: '주앙가', origin: '테르나테', originFlag: null,
    tier: 1, era: 'classic', yards: ['ternate', 'tidore', 'ambon'], price: 2900, requires: 'korakora',
    // 큰 코라코라를 이 바다는 따로 '주앙가(juanga/joanga)'라 불렀다. 테르나테의 하이룬
    // 술탄이 1530~70년 포르투갈과 싸울 때 병력을 실어 나른 배가 이것이다 — 코라코라를
    // 몰아 본 사람이 다음으로 짓는 큰 배로 두었다. 짐칸보다 사람 태우는 갑판이 넓다.
    hp: 80, crew: 60, crewMax: 110, crewMin: 40, cargo: 34, guns: 7, speed: 1.45,
    upkeep: 11, rig: 0.00, tint: 'dark',
    desc: '코라코라보다 큰 향료제도의 노잡이 전함. 테르나테 술탄이 포르투갈과 싸울 때 병력을 이 배로 날랐다.',
  },
  padewakang: {
    hull: 'fluyt', name: '파데왕앙', origin: '부기스·마카사르', originFlag: 'majapahit',
    tier: 2, era: 'classic', yards: ['makassar', 'banten'], price: 4200,
    // 부기스·마카사르의 원양 무역선. 탄자세일을 걸고 뉴기니 서단에서 필리핀 남부, 말레이
    // 반도까지 오갔다는 기록이 있는, 남술라웨시가 낸 배 중 가장 크다(20세기 초 팔라리에게
    // 자리를 넘기기 전까지). 훗날 서양 스쿠너 삭구와 섞여 '피니시'가 되는 것이 바로 이 계보다.
    hp: 140, crew: 26, crewMax: 40, crewMin: 18, cargo: 150, guns: 4, speed: 1.15,
    upkeep: 15, rig: 0.05, tint: 'white',
    desc: '부기스·마카사르가 낸 원양 무역선. 탄자세일 하나로 뉴기니에서 말레이 반도까지 오갔다.',
  },
};
