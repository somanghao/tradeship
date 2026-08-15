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
// ★ originFlag를 전부 null로 뒀다. 이 권역 항구의 깃발이 거의 다 'ottoman'이라
//   originFlag를 달면 **요구 공업력이 1씩 내려가 어느 항구에서나 종을 짓게 된다.**
//   "종은 자바 북안과 페구에서만 짓는다"는 이 바다의 성격이라 industry로만 가른다.

export const SHIPS = {
  perahu: {
    hull: 'caravel', name: '프라우', origin: '말레이·자바', originFlag: null, tier: 1, era: 'classic', requires: null,
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
    hull: 'galley', name: '란차랑', origin: '말레이·아체', originFlag: null, tier: 2, era: 'classic', requires: null,
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
    hull: 'indiaman', name: '종', origin: '자바', originFlag: null, tier: 3, era: 'classic', requires: 'perahu',
    yards: ['tuban', 'gresik', 'pegu'],
    price: 24000,
    hp: 260, crew: 90, crewMax: 180, crewMin: 36, cargo: 300, guns: 16, speed: 0.92,
    upkeep: 48, rig: 0.15, tint: 'white',
    desc: '자바 북안이 짓던 거대한 상선. 널을 네 겹으로 댄 선체는 포탄이 두 겹까지밖에 못 뚫는다. 느리지만 이보다 많이 싣는 배가 없다.',
  },
};
