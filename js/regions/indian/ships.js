// regions/indian/ships.js — 인도양에서 짓는 배
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
//
// ── 이 바다의 배가 지중해 배와 다른 점 ────────────────────────
// ① **꿰맨 선체(sewn hull).** 인도양 배는 널을 못으로 박지 않고 코이어(야자 껍질) 밧줄로
//    꿰매어 붙였다. 파도의 힘이 한 점에 몰리지 않고 선체 전체로 퍼져 산호초에 얹혀도
//    널이 터지지 않는다. 대신 밧줄이 삭으므로 자주 손을 봐야 한다 — 유지비를 조금 무겁게 뒀다.
// ② **라틴·세티세일.** 가로돛이 거의 없다. 그래서 `rig`가 전부 0.00~0.15이고,
//    계절풍처럼 한쪽으로만 부는 바람 아래에서 제 성능이 나온다.
// ③ **선원을 많이 먹는다.** 흔히 다우가 적은 인원으로 많이 싣는다고들 하는데
//    사료는 반대를 말한다 — 바글라는 275톤에 **최소 30명**(화물톤/1인 ≈ 9.2)이다.
//    무거운 활대 하나를 사람 힘으로 돌려야 하기 때문이다. 플류트(18.9)의 절반쯤이고
//    코카(13.0)보다도 낮다. 그 숫자를 `crewMin`에 그대로 옮겼다.
// ④ **티크.** 말라바르·벵골의 티크는 좀조개에 강해 오래 간다. 목재가 흔한 벵골은
//    세계에서 배를 가장 싸게 지었다 — 발람의 값/화물칸 비가 그것이다.
//
// ★ hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜨는데, 다우·아우트리거 선형은
//   아직 없다. 크기가 가장 가까운 것을 빌려 쓰고 art.hullTodo에 무엇이 달라야 하는지 적었다.
// ★ originFlag는 이제 제 깃발이다 — 실론=`kotte` · 말라바르=`zamorin` · 구자라트=`gujarat`
//   · 벵골=`bengal`. 전에 전부 null이었던 것은 빌린 깃발을 쓰면 "지중해의 오스만 항구가
//   벵골 배를 싸게 짓는다" 같은 엉뚱한 할인이 붙었기 때문이다.
//   ※ geo.js의 도시 깃발이 아직 빌린 값(ottoman·venice·spain)이라 지금은 할인이 붙지 않는다.
//     그때까지는 `yards`(전통 조선지 값 인하)가 원산지를 표현한다.

export const SHIPS = {
  /* ★ 이 바다의 시작배(tier 0) — 지중해 `hulk`와 같은 자리. 제원은 그것에 맞춘다. */
  oldyathra: {
    hull: 'caravel', name: '삭은 야트라 도니', origin: '말라바르 헌 배', originFlag: null, tier: 0,
    era: 'classic', yards: [], price: 310,
    hp: 54, crew: 9, crewMax: 16, crewMin: 5, cargo: 44, guns: 1, speed: 0.84,
    upkeep: 2, rig: 0.15, leak: 2, tint: 'rot',
    desc: '순례선으로 늙은 도니. 야자 밧줄이 삭아 이음매마다 물이 든다.',
  },
  yathra: {
    hull: 'caravel', name: '야트라 도니', origin: '실론', originFlag: 'kotte', tier: 1, era: 'classic',
    yards: ['galle', 'colombo', 'jaffna'],
    price: 1150,
    // 아우트리거를 단 원양 무역선이다. 현외부재가 복원력을 대신해 주므로
    // 밸러스트와 돛 인원이 적게 든다 — 이 권역에서 유일하게 화물톤/1인이 높은 배(11.7).
    hp: 62, crew: 10, crewMax: 18, crewMin: 7, cargo: 82, guns: 1, speed: 1.15,
    upkeep: 4, rig: 0.00, tint: 'oak',
    desc: '현외부재를 단 실론의 무역선. 사람을 적게 먹고 얕은 물을 탄다. 대신 포를 실을 자리가 없다.',
  },
  pattamar: {
    hull: 'fluyt', name: '파타마르', origin: '말라바르·콘칸', originFlag: 'zamorin', tier: 1, era: 'classic',
    yards: ['calicut', 'cochin', 'cannanore', 'quilon'],
    price: 2400,
    // 구자라트에서 실론까지 쌀을 나르던 연안 화물선. 라틴세일 두세 장에
    // 곤봉처럼 굽은 이물이 특징이다. 화물톤/1인 9.1로 이 바다의 표준값.
    hp: 96, crew: 20, crewMax: 30, crewMin: 16, cargo: 145, guns: 4, speed: 1.10,
    upkeep: 9, rig: 0.00, tint: 'oak',
    desc: '쌀과 무명을 싣고 해안을 오르내리는 연안선. 값에 비해 잘 싣지만 외해로 나가면 약하다.',
  },
  galbat: {
    hull: 'galley', name: '갈베트', origin: '구자라트', originFlag: 'gujarat', tier: 2, era: 'classic',
    yards: ['diu', 'chaul', 'calicut'],
    price: 2900,
    // 노와 라틴세일을 함께 쓰는 무장 연안선. 마라카르와 구자라트 사략이 이 배로
    // 바람이 죽은 날 포르투갈 대형선에 붙었다. 짐은 거의 못 싣는다.
    hp: 118, crew: 52, crewMax: 80, crewMin: 34, cargo: 54, guns: 8, speed: 1.42,
    upkeep: 13, rig: 0.00, tint: 'dark',
    desc: '노를 저어 대형선에 달라붙는 무장 연안선. 바람이 죽어도 나아가지만 화물칸이 없다시피 하다.',
  },
  balam: {
    hull: 'hulk', name: '발람', origin: '벵골', originFlag: 'bengal', tier: 2, era: 'classic',
    yards: ['chittagong', 'satgaon'],
    price: 3600,
    // 벵골은 목재가 흔해 배를 세계에서 가장 싸게 지었다(16~17세기 연 22만 톤 규모 추정).
    // 그 값이 이 배의 정체성이다 — 화물칸 168을 3,600에 얻는다. 대신 느리고 무르다.
    hp: 108, crew: 22, crewMax: 34, crewMin: 14, cargo: 168, guns: 3, speed: 0.92,
    upkeep: 11, rig: 0.30, tint: 'oak',
    desc: '벵골 삼각주에서 통째로 찍어 내는 값싼 화물선. 느리고 물러도 이 값에 이만큼 싣는 배가 없다.',
  },
  kotia: {
    hull: 'carrack', name: '코티아', origin: '쿠치·구자라트', originFlag: 'gujarat', tier: 2, era: 'classic',
    yards: ['cambay', 'surat', 'diu'],
    price: 10400,
    // 티크를 코이어로 꿰맨 원양 다우. 계절풍을 타고 동아프리카까지 갔다.
    // 세티세일 두 장에 활대가 커서 최소 인원이 23명(화물톤/1인 8.9) — 짐값에 사람값이 붙는다.
    hp: 176, crew: 30, crewMax: 48, crewMin: 23, cargo: 205, guns: 10, speed: 1.05,
    upkeep: 20, rig: 0.10, tint: 'white',
    desc: '티크를 밧줄로 꿰맨 원양 다우. 계절풍을 타면 빠르지만 거스르면 아예 못 간다.',
  },
  ghanjah: {
    hull: 'indiaman', name: '간자', origin: '쿠치·구자라트', originFlag: 'gujarat', tier: 3, era: 'classic', requires: 'kotia',
    yards: ['surat', 'goa', 'chittagong'],
    price: 13600,
    // 다우 계보의 끝. 포르투갈이 온 뒤 고물 누각과 조각 장식이 갈레온식으로 바뀐다.
    // 코티아를 몰아 본 사람만 짓는다 — 꿰맨 선체를 다뤄 봐야 이 크기를 감당한다.
    hp: 205, crew: 40, crewMax: 64, crewMin: 26, cargo: 238, guns: 12, speed: 1.00,
    upkeep: 26, rig: 0.15, tint: 'oak',
    desc: '다우 중에 가장 큰 배. 고물 누각에 포르투갈식 조각이 붙었다. 짐도 포도 웬만큼 얹는다.',
  },

  /* ══ 회차 28 · 콘텐츠 확장 ═══════════════════════════════════════
     ★ 코로만델(동안)에서 짓는 배가 하나도 없었다 — 조선소가 전부 서안이었다. 그쪽에 하나,
       그리고 이 바다의 꼭대기에 하나를 더한다. */

  thoni: {
    hull: 'caravel', name: '토니', origin: '코로만델', originFlag: 'vijayanagara',
    tier: 1, era: 'classic', yards: ['nagapattinam', 'masulipatnam', 'pulicat'], price: 1350,
    // 벵골만 동안의 연안 화물선. 이 해안에는 항구다운 항구가 없어 배가 모래톱 밖에 서고
    // 작은 배가 짐을 실어 날랐다 — 그 큰 쪽이 토니다. 면포를 싣고 실론·믈라카까지 갔다.
    hp: 68, crew: 12, crewMax: 20, crewMin: 8, cargo: 88, guns: 1, speed: 1.18,
    upkeep: 5, rig: 0.10, tint: 'oak',
    desc: '모래톱 밖에 선 큰 배로 짐을 실어 나르던 코로만델의 연안선. 면포를 싣고 실론까지 간다.',
  },
  naodegoa: {
    hull: 'carrack', name: '고아 나우', origin: '고아(티크 조선소)', originFlag: 'portugal',
    tier: 3, era: 'classic', yards: ['goa', 'cochin', 'diu'], price: 17500, requires: 'kotia',
    // ★ **리스본이 아니라 고아에서 지은 배가 더 오래 버텼다** — 인도 티크는 유럽 참나무와 달리
    //   좀에 잘 안 먹혔고, 그래서 16세기 후반에는 인도 항로의 큰 나우를 아예 이쪽에서 지었다.
    //   이 바다에서 가장 크고, 코티아를 몰아 본 사람에게만 열린다.
    hp: 245, crew: 48, crewMax: 76, crewMin: 27, cargo: 300, guns: 18, speed: 0.96,
    upkeep: 40, rig: 0.70, tint: 'white',
    desc: '인도 티크로 고아에서 지은 큰 나우. 유럽에서 지은 같은 배보다 좀에 강하고 오래 버틴다.',
  },

  /* ══ 회차 29 · 콘텐츠 확장 ═══════════════════════════════════════
     ★ 여덟 종에서 열한 종으로. 가장 싼 자리(야트라 도니 1,150)는 그대로 두고 그 위 빈 계단만
       채운다. 근거는 `content/regions/indian-evidence.json`. */

  gallivat: {
    hull: 'galley', name: '갈리바트', origin: '콘칸', originFlag: null,
    tier: 1, era: 'classic', yards: ['chaul', 'dabhol'], price: 1900,
    // 노와 라틴세일을 함께 쓰는 작고 빠른 호위·상륙정. 콘칸의 마라타 함대(칸호지 앙그레)가
    // 그랩(아래 참조) 한 척에 이 배를 여럿 딸려 보냈다 — 무풍에 그랩을 끌어 주고, 사람을
    // 더 태우고, 얕은 하구까지 쫓아 들어간다. 70톤 아래가 흔했고 짐칸은 두지 않는다시피 했다.
    hp: 70, crew: 30, crewMax: 50, crewMin: 20, cargo: 28, guns: 4, speed: 1.35,
    upkeep: 8, rig: 0.00, tint: 'dark',
    desc: '노와 돛을 함께 쓰는 작고 빠른 호위정. 큰 배를 무풍에 끌어 주고 얕은 하구까지 쫓아 들어간다. 짐은 거의 못 싣는다.',
  },
  uru: {
    hull: 'carrack', name: '우루', origin: '베이포레(말라바르)', originFlag: 'zamorin',
    tier: 2, era: 'classic', yards: ['calicut', 'cannanore'], price: 6800,
    // 캘리컷 인근 베이포레에서 아랍 상인의 주문을 받아 지은 원양 다우. 코이어 밧줄로 널을
    // 꿰매는 공법은 코티아와 같지만 짓는 손이 다르다 — 예멘·오만 상인이 직접 목수를 두고
    // 감독했다. 큰 것은 300~500톤에 이르렀다고 하나, 이 바다의 사다리를 지키려 중형 상선
    // 규모로 낮춰 잡았다(값·정확한 톤수 사료는 없어 판정은 probable).
    hp: 150, crew: 26, crewMax: 42, crewMin: 20, cargo: 180, guns: 6, speed: 1.02,
    upkeep: 17, rig: 0.05, tint: 'oak',
    desc: '베이포레에서 아랍 상인의 주문으로 짓던 원양 다우. 코이어 밧줄로 꿰맨 선체가 산호초에 얹혀도 잘 안 터진다.',
  },
  grab: {
    hull: 'frigate', name: '그랩', origin: '콘칸(마라타)', originFlag: null,
    tier: 2, era: 'classic', yards: ['chaul', 'dabhol'], price: 8300,
    // 마라타 해군(칸호지 앙그레)의 주력함. 뱃머리가 낮고 길게 뻗어 앞으로 포문을 냈고,
    // 뱃전에는 6~9파운드 포를, 갑판에는 9~12파운드 포 두 문을 얹었다. 큰 것은 400톤에
    // 이르러 동인도회사 순시선과 정면으로 붙었다 — 짐보다 싸움에 지은 배라 화물칸은 작다.
    hp: 165, crew: 42, crewMax: 66, crewMin: 28, cargo: 100, guns: 16, speed: 1.20,
    upkeep: 24, rig: 0.05, tint: 'dark',
    desc: '마라타 해군의 주력함. 낮고 길게 뻗은 뱃머리에 포문을 촘촘히 냈다. 갈리바트를 거느리고 동인도회사 배와 맞섰다.',
  },
};
