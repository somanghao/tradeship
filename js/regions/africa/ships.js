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
// ★ `originFlag`가 그 항구 깃발과 같으면 요구 공업력이 1 낮아진다. 깃발 배선이 끝나
//   포르투갈 배는 `portugal`, 스와힐리 배는 `swahili`, 카누는 `benin`을 단다(geo.js 머리말 참조).
// ★ 값 사다리는 지중해 기준선에 맞췄다 — 코카 1,100(78) / 브리간틴 4,200(140) /
//   캐랙 9,800(240). 이 권역에는 **최상급이 없다.** 변방의 바다이므로 그게 맞다.

export const SHIPS = {
  /* ★ 이 바다의 시작배(tier 0) — 지중해 `hulk`와 같은 자리. 제원은 그것에 맞춘다. */
  oldcanoa: {
    hull: 'galley', name: '삭은 대형 카누', origin: '기니만 헌 배', originFlag: null, tier: 0,
    era: 'classic', yards: [], price: 290,
    hp: 48, crew: 10, crewMax: 18, crewMin: 6, cargo: 40, guns: 0, speed: 0.90,
    upkeep: 2, rig: 0, leak: 2, tint: 'rot',
    desc: '통나무를 파낸 자리가 갈라졌다. 노 젓는 손이 많아야 겨우 간다.',
  },
  canoa: {
    // 기니 해안의 대형 카누. 유럽 배가 파도를 못 넘어 정박한 채 짐을 부릴 때
    // 그 짐을 뭍으로 나른 것이 이 배다. 파도 위에서만큼은 어떤 유럽선보다 빨랐다.
    // 첫 배 밴드(1,100~1,400)보다 싸지만 화물칸이 3분의 1이라 사다리를 흔들지 않는다.
    hull: 'galley', name: '대형 카누', origin: '기니 해안', originFlag: 'benin',
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
    hull: 'caravel', name: '삼북', origin: '스와힐리 해안', originFlag: 'swahili',
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
    hull: 'hulk', name: '므템베', origin: '라무·파테', originFlag: 'swahili',
    tier: 1, era: 'classic', requires: null,
    yards: ['lamu', 'mombasa', 'kilwa'],
    price: 1450,
    hp: 58, crew: 14, crewMax: 22, crewMin: 7, cargo: 96, guns: 1, speed: 1.05,
    upkeep: 5, rig: 0.85, tint: 'oak',
    desc: '쇠못을 하나도 쓰지 않고 야자 노끈으로 꿰맨 배. 사각 돗자리 돛을 단다. 잘 휘어 안 부서지지만 포에는 속수무책이다.',
  },
  barca: {
    // 바르카 — ★ 회차29 트랙 M. 이 사다리의 t1 자리가 **지중해 `caravel`**을 그대로
    //   가리키고 있어(옛 guineiro.requires) 아프리카 최고선 사슬(naudamina←guineiro←…)의
    //   앞칸 한 칸이 딴 바다에 있었다 — 아홉 바다 중 아프리카만 그랬다. 그 구멍을 이 배가 메운다.
    //   ★ 처음엔 '카라벨랑(caravelão)'을 붙이려 했는데 **남아메리카가 이미 그 키·이름을
    //   쓰고 있었다**(브라질 연안선, `js/regions/southamerica/ships.js`) — 세계에서 선종
    //   키·이름은 하나뿐이라 겹칠 수 없다. 그래서 이 바다 고유의 다른 후보로 바꿨다:
    //   주라라의 기니 연대기가 적은 **바르카(barcha)**다. 카라벨이 나오기 전 기니 탐험에
    //   쓰인 두 배(바르카·바리넬) 중 하나이고, 바리넬은 이미 이 파일에 있다(1,050 자리).
    //   1440년대의 그 바르카는 카라벨에 밀려난 작은 배였지만, "바르카"는 이후로도 몇
    //   세기를 이어간 범선 계급명이다 — 이 자리는 그 계보의 후기·대형 개체로 본다.
    // ★ **제원은 지중해 `caravel`과 완전히 같다** — 사다리에서 그 칸을 대신하는 것이므로
    //   더 세거나 약하면 곡선이 움직인다(사용자 지시). tier·hull도 그대로 맞췄다. 그 값
    //   자체(캐랙급 카라벨과 동급)는 사료가 아니라 verdict: gameplay다.
    hull: 'caravel', name: '바르카', origin: '카보베르데·리오스 데 기네', originFlag: 'portugal',
    tier: 1, era: 'classic', requires: null,
    yards: ['santiago', 'cacheu', 'elmina', 'axim'],
    price: 1400,
    hp: 90, crew: 24, crewMax: 34, crewMin: 12, cargo: 90, guns: 6, speed: 1.35,
    upkeep: 6, rig: 0.00, tint: 'oak',
    desc: '카보베르데에서 리오스 데 기네를 오가던 연안 범선. 란사두들이 즐겨 탔다.',
  },
  guineiro: {
    // 기니 무역선 — 포르투갈이 이 해안에 두려고 카라벨(또는 바르카)을 고쳐 만든 배.
    // 삼각돛 카라벨에 가로돛을 얹어(카라벨라 헤돈다) 무역풍 구간에서 속력을 얻고,
    // 얕은 강어귀에 들어갈 만큼 흘수가 얕은 것은 그대로 뒀다.
    // 화물칸은 캐랙의 절반이지만 포 여덟 문을 달아 이 바다에서는 웬만하면 이긴다.
    // ★ 회차29 — requires를 지중해 `caravel`에서 이 바다의 `barca`로 바꿨다(사슬을
    //   제 바다 안에서 닫는다). `requiresAlt: 'caravel'`을 함께 둬 **이미 caravel을 몰아 본
    //   기존 세이브**가 막히지 않게 했다(state.js: shipLockedBy가 둘 중 하나만 봐도 통과시킨다).
    hull: 'caravel', name: '기니 무역선', origin: '포르투갈', originFlag: 'portugal',
    tier: 2, era: 'classic', requires: 'barca', requiresAlt: 'caravel',
    yards: ['elmina', 'santiago', 'luanda', 'mocambique'],
    price: 3400,
    hp: 112, crew: 26, crewMax: 38, crewMin: 13, cargo: 118, guns: 8, speed: 1.25,
    upkeep: 12, rig: 0.67, tint: 'dark',
    desc: '기니 항로용으로 고쳐 만든 카라벨. 강어귀까지 들어가고 포를 여덟 문 물었다.',
  },
  baghla: {
    /* ★ 이름을 **'잔지바르 바갈라'**로 갈랐다(C-4). 중동 `baghlah`와 표시 이름이 둘 다 '바갈라'라
       조선소 목록에 값이 다른 두 줄이 같은 이름으로 떴다 — 세계에서 이름이 겹치는 선종은 이것 하나였다.
       지우거나 합치지 않는다: 둘은 같은 다우 계열의 **다른 바다 변종**이고 제원도 실제로 다르다
       (이쪽 포 4문·현측이 비었다 / 걸프 쪽 포 10문·각진 선미). 본가가 걸프이므로 그쪽이 '바갈라'를
       그대로 쓰고, 스와힐리 해안 것에 지명을 붙인다 — `africa-evidence.json`의 감수 메모가 적어 둔 대로다. */
    // 원양 다우. 티크를 인도에서 실어 와 짓던 배라 값이 붙는다.
    // 큰 다우의 승조원이 서른 남짓이었다 — 화물 178을 최소 12명으로 나르는 것이
    // 이 배의 정체성이다(화물÷인원 14.8. 코카 13 · 플류트 18.9 사이).
    // 대신 포는 넷뿐이다. 이 바다에서 다우는 싸우는 배가 아니었다.
    // ★ originFlag는 'swahili'다. 전에 null이었던 것은 hafsid를 달면 스와힐리 술탄국과
    //   **베냉 왕국**이 그 깃발을 함께 빌려 쓰던 탓에 그웨이토(강어귀 카누 항구)에서
    //   원양 다우가 나왔기 때문이다. 이제 베냉은 제 깃발(benin)이 있으니 그 걱정이 없다.
    //   ※ 깃발 배선이 끝나 몸바사·잔지바르·라무가 'swahili'를 달았다 —
    //     이제 그 세 항구에서 요구 공업력이 1로 내려가 잔지바르에서도 지을 수 있다.
    // ★ era를 'classic'에서 'modern'으로 옮겼다(2026-08-15 감수). 이 배의 정체성인
    //   **각진 선미와 선미 창**은 유럽 선미루를 보고 배운 것이라 바갈라는 15~16세기 배가
    //   아니다 — 문헌에 크게 나타나는 것은 18~19세기이고, 중동 권역도 같은 이유로
    //   바갈라를 'modern'으로 두었다(js/regions/mideast/ships.js). 지우지 않고 계보 뒤로
    //   민 것은 이 프로젝트가 연도를 고정하지 않기 때문이다 — 삼북을 몰아 봐야 열린다.
    hull: 'carrack', name: '잔지바르 바갈라', origin: '잔지바르·오만', originFlag: 'swahili',
    tier: 2, era: 'modern', requires: 'sambuk',
    yards: ['mombasa', 'zanzibar', 'lamu', 'mocambique'],
    price: 5200,
    hp: 130, crew: 26, crewMax: 42, crewMin: 12, cargo: 178, guns: 4, speed: 1.10,
    upkeep: 15, rig: 0.00, tint: 'white',
    desc: '계절풍을 타고 인도까지 오가던 대형 다우. 적은 선원으로 많이 싣지만 현측이 비어 있다.',
  },

  /* ══ 회차 28 · 콘텐츠 확장 ═══════════════════════════════════════
     ★ **이 바다에는 tier 3이 하나도 없었다** — 위가 막힌 사다리라 조선소가 곧 끝났다.
       아래(바리넬)·가운데(팡가이오)·꼭대기(미나 나우) 셋을 더해 여덟으로 만든다. */

  barinel: {
    hull: 'caravel', name: '바리넬', origin: '기니 탐험선', originFlag: 'portugal',
    tier: 1, era: 'classic', yards: ['santiago', 'elmina'], price: 1050,
    // 카라벨 이전에 기니 해안을 내려간 배. 노를 저을 수 있어 무풍대와 강어귀를 지났고,
    // 그 대신 먼바다에서는 굼떴다 — 실제로 카라벨이 나오자 곧 밀려났다.
    hp: 60, crew: 14, crewMax: 22, crewMin: 8, cargo: 66, guns: 3, speed: 1.20,
    upkeep: 4, rig: 0.30, tint: 'oak',
    desc: '카라벨 이전에 기니 해안을 내려가던 배. 노가 있어 무풍대를 지나지만 먼바다에서는 굼뜨다.',
  },
  pangaio: {
    hull: 'caravel', name: '팡가이오', origin: '스와힐리 해안', originFlag: 'swahili',
    tier: 2, era: 'classic', yards: ['kilwa', 'mocambique', 'zanzibar'], price: 2700,
    // 포르투갈 기록이 모잠비크~킬와 사이에서 가장 자주 적은 꿰맨 배. 못 하나 없이
    // 야자 노끈으로 판자를 꿰맸고 돛은 매트로 짰다. 싸울 수 없되 잘 싣는다(12.8).
    hp: 96, crew: 16, crewMax: 26, crewMin: 10, cargo: 128, guns: 2, speed: 1.12,
    upkeep: 8, rig: 0.00, tint: 'white',
    desc: '못 없이 노끈으로 꿰맨 스와힐리 연안선. 돛은 야자잎 매트다. 싸울 수는 없지만 잘 싣는다.',
  },
  naudamina: {
    hull: 'carrack', name: '미나 나우', origin: '엘미나 금 항로', originFlag: 'portugal',
    tier: 3, era: 'classic', yards: ['mocambique', 'elmina', 'luanda'], price: 16500, requires: 'guineiro',
    // 상 조르즈 다 미나의 금을 리스본으로 나르던 왕실 나우. 금은 부피가 없으므로 이 배의
    // 짐칸은 사실 **돌아가는 길의 물건**을 위한 것이다 — 노예·후추·상아가 그 자리에 실렸다.
    hp: 220, crew: 44, crewMax: 70, crewMin: 25, cargo: 255, guns: 16, speed: 0.98,
    upkeep: 35, rig: 0.67, tint: 'white',
    desc: '미나의 금을 리스본으로 나르던 왕실 나우. 이 바다에서 가장 크고, 가장 늦게 열린다.',
  },
};
