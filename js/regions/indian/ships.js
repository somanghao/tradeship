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
};
