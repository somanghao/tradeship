// regions/africa/ships.js — 아프리카에서 짓는 배
//
// ★ 이 권역의 배들은 **유럽선과 원리가 다르다.** 그 차이를 desc로 설명하지 않고
//   숫자로 드러내려 했다 — `rig`(가로돛 비율) · `crewMin`(최소 승조원) · `cargo`가 그 자리다.
//
//   ① **다우(삼북·바갈라)는 rig 0.00이다.** 세티/라틴세일 하나로 계절풍을 비스듬히 탄다.
//      순풍에서는 유럽 가로돛에 밀리지만 역풍을 파고드는 데는 낫다. 그리고 **사람이 적게 든다** —
//      화물톤÷승조원이 14~15로 코카(13)보다 높고 플류트(18.9)에 다가간다.
//      계약서가 "다우·정크는 이 값이 높은 쪽"이라 적은 것이 이 뜻이다.
//   ② **므템베는 거꾸로 rig 0.85다.** 스와힐리의 꿰맨 배가 사각 돗자리 돛을 달았다.
//      "아프리카 배=라틴세일"이 아니라는 것을 이 한 칸이 말한다. 대신 못을 안 쓰고
//      야자 노끈으로 꿰맨 선체라 hp가 낮다 — 유연해서 안 부러지지만 포탄은 못 견딘다.
//   ③ **카누는 화물칸이 아니라 사람으로 가는 배다.** 화물 34에 최소 인원 14 —
//      화물톤÷승조원 2.4로 갤리(1.2) 쪽에 가깝다. 노(패들)로 가는 배의 셈법이다.
//
// ★ hull은 `js/sprites/ship.js: HULLS`에 있는 열 개뿐이라 전부 빌려 썼다.
//   다우도 카누도 므템베도 그림이 아직 없다 — 무엇이 달라야 하는지는 근거 JSON의
//   `art.hullTodo`에 적었다.
// ★ `originFlag`가 그 항구 깃발과 같으면 요구 공업력이 1 낮아진다. 포르투갈 깃발이
//   아직 없어 `spain`을, 스와힐리 술탄국 깃발이 없어 `hafsid`를 빌렸다(geo.js 머리말 참조).
// ★ 값 사다리는 지중해 기준선에 맞췄다 — 코카 1,100(78) / 브리간틴 4,200(140) /
//   캐랙 9,800(240). 이 권역에는 **최상급이 없다.** 변방의 바다이므로 그게 맞다.

export const SHIPS = {
  canoa: {
    // 기니 해안의 대형 카누. 유럽 배가 파도를 못 넘어 정박한 채 짐을 부릴 때
    // 그 짐을 뭍으로 나른 것이 이 배다. 파도 위에서만큼은 어떤 유럽선보다 빨랐다.
    // 첫 배 밴드(1,100~1,400)보다 싸지만 화물칸이 3분의 1이라 사다리를 흔들지 않는다.
    hull: 'galley', name: '대형 카누', origin: '기니 해안', originFlag: 'hafsid',
    tier: 1, era: 'classic', requires: null,
    yards: ['elmina', 'axim', 'gwato', 'luanda'],
    price: 780,
    hp: 42, crew: 22, crewMax: 30, crewMin: 14, cargo: 34, guns: 1, speed: 1.35,
    upkeep: 3, rig: 0.00, tint: 'oak',
    desc: '통나무를 파낸 배에 스무 명이 노를 젓는다. 부서지는 파도를 타고 넘지만 먼바다로는 못 나간다.',
  },
  sambuk: {
    // 스와힐리 해안의 작은 다우. 연안 장사꾼의 배라 값이 첫 배 밴드에 딱 걸린다.
    // 코카(1,100·78칸·최소 6명)와 값도 짐도 비슷한데 rig가 0이라 성격이 갈린다 —
    // 순풍에서 느리고 역풍에서 빠르다.
    hull: 'caravel', name: '삼북', origin: '스와힐리 해안', originFlag: 'hafsid',
    tier: 1, era: 'classic', requires: null,
    yards: ['mombasa', 'zanzibar', 'mocambique', 'malindi'],
    price: 1200,
    hp: 66, crew: 12, crewMax: 20, crewMin: 6, cargo: 76, guns: 2, speed: 1.25,
    upkeep: 4, rig: 0.00, tint: 'white',
    desc: '삼각돛 하나로 계절풍을 비스듬히 타는 연안 다우. 순풍에선 굼뜨지만 맞바람을 파고든다.',
  },
  mtepe: {
    // 라무·파테의 꿰맨 배. 널을 나무못과 야자 노끈으로 꿰매 만들어 선체가 통째로 휜다 —
    // 산호초에 얹혀도 부서지지 않는다. 포르투갈이 들어온 뒤 서양식 건조법에 밀려 끊겼다.
    // hp 58은 이 권역 최저다. 포문도 하나뿐이다. 대신 짐은 삼북보다 많이 싣는다.
    hull: 'hulk', name: '므템베', origin: '라무·파테', originFlag: 'hafsid',
    tier: 1, era: 'classic', requires: null,
    yards: ['lamu', 'mombasa', 'kilwa'],
    price: 1450,
    hp: 58, crew: 14, crewMax: 22, crewMin: 7, cargo: 96, guns: 1, speed: 1.05,
    upkeep: 5, rig: 0.85, tint: 'oak',
    desc: '쇠못을 하나도 쓰지 않고 야자 노끈으로 꿰맨 배. 사각 돗자리 돛을 단다. 잘 휘어 안 부서지지만 포에는 속수무책이다.',
  },
  guineiro: {
    // 기니 무역선 — 포르투갈이 이 해안에 두려고 카라벨을 고쳐 만든 배.
    // 삼각돛 카라벨에 가로돛을 얹어(카라벨라 헤돈다) 무역풍 구간에서 속력을 얻고,
    // 얕은 강어귀에 들어갈 만큼 흘수가 얕은 것은 그대로 뒀다.
    // 화물칸은 캐랙의 절반이지만 포 여덟 문을 달아 이 바다에서는 웬만하면 이긴다.
    hull: 'caravel', name: '기니 무역선', origin: '포르투갈', originFlag: 'spain',
    tier: 2, era: 'classic', requires: 'caravel',
    yards: ['elmina', 'santiago', 'luanda', 'mocambique'],
    price: 3400,
    hp: 112, crew: 26, crewMax: 38, crewMin: 13, cargo: 118, guns: 8, speed: 1.25,
    upkeep: 12, rig: 0.67, tint: 'dark',
    desc: '기니 항로용으로 고쳐 만든 카라벨. 강어귀까지 들어가고 포를 여덟 문 물었다.',
  },
  baghla: {
    // 원양 다우. 티크를 인도에서 실어 와 짓던 배라 값이 붙는다.
    // 큰 다우의 승조원이 서른 남짓이었다 — 화물 178을 최소 12명으로 나르는 것이
    // 이 배의 정체성이다(화물÷인원 14.8. 코카 13 · 플류트 18.9 사이).
    // 대신 포는 넷뿐이다. 이 바다에서 다우는 싸우는 배가 아니었다.
    // ★ originFlag를 일부러 null로 뒀다. hafsid를 달면 요구 공업력이 1로 내려가는데,
    //   그 깃발은 스와힐리 술탄국과 **베냉 왕국**이 함께 빌려 쓰는 임시 깃발이라
    //   그웨이토(강어귀 카누 항구)에서 원양 다우가 나오는 우스운 일이 생긴다.
    //   null로 두면 공업력 2인 큰 조선지(몸바사·라무·모잠비크)에서만 나온다 — 그게 맞다.
    //   포르투갈·스와힐리 깃발이 생기면 이 줄을 'swahili'로 고치면 된다.
    hull: 'carrack', name: '바갈라', origin: '잔지바르·오만', originFlag: null,
    tier: 2, era: 'classic', requires: 'sambuk',
    yards: ['mombasa', 'zanzibar', 'lamu', 'mocambique'],
    price: 5200,
    hp: 130, crew: 26, crewMax: 42, crewMin: 12, cargo: 178, guns: 4, speed: 1.10,
    upkeep: 15, rig: 0.00, tint: 'white',
    desc: '계절풍을 타고 인도까지 오가던 대형 다우. 적은 선원으로 많이 싣지만 현측이 비어 있다.',
  },
};
