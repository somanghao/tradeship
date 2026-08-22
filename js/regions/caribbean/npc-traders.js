// regions/caribbean/npc-traders.js — 카리브·누에바에스파냐의 무역상
//
// 이 바다에서 **저 혼자 장사하는 사람들**이다. 플레이어와 같은 시장을 쓰므로
// 이들이 사고판 것이 시세에 그대로 압력으로 남는다(`js/world.js`).
//
// ── 필드 ────────────────────────────────────────────────────
//   id       세계에서 하나뿐인 키
//   name     화면에 뜨는 이름 (상단·상관·개인 무엇이든)
//   flag     깃발 (sprites/ship.js: FLAGS) — 없으면 그 권역 기본
//   ship     타는 배 (선종 키). 큰 배일수록 한 번에 나르는 양이 많아 시세를 세게 민다
//   purse    [최소,최대] 밑천
//   goods    주로 다루는 품목 id들. 비우면 아무거나 (전문 상단일수록 좁게)
//   scope    'region' = 이 권역 안만 돈다 / 'ocean' = 원양 항로를 넘나든다
//   circuit  **순회로** — 시간이 지나면 이 순서대로 항구를 돈다. 마지막이 첫 항구면 고리가 된다.
//            비우면 그때그때 이문이 남는 쪽으로 간다(기존 방식).
//   season   'summer' | 'winter' | null — 그 철에만 나타나는 상단(계절풍·결빙)
//   rank     1~5. 규모다. 높을수록 밑천도 배도 크고 소문에도 자주 오른다
//   blurb    한 줄 소개
//   lines    { greet, deal, refuse } — 해상에서 만났을 때 한 줄씩(없어도 된다)
//
// ★ **이 바다의 상단은 "누가 은을 지키느냐"로 갈린다.** 다른 바다는 무엇을 나르느냐로 갈리는데
//   여기는 실어야 할 것이 이미 정해져 있다 — 은이다. 그래서 배가 셋으로 나뉜다:
//   **떼로 몰려가는 배**(플로타) · **그 떼를 기다리는 배**(포르토벨로의 장) ·
//   **떼를 안 기다리고 새는 배**(변방 밀무역).
//
// ★ **명부가 비면 그 바다에는 상선이 한 척도 안 뜬다.** `world.js: makeTrader`가
//   `ALL_TRADERS`에서 뽑으므로 여기 없는 권역의 상단은 **애초에 생성되지 않는다.**
//   그러면 `merchant` 조우가 전부 *"멀리 돛 하나가 지나갔다"*로 끝나고, 털 상대가 없어
//   `raids()`의 나포 여파 충격(`SHOCK.raidMult`)도 이 바다발로는 영원히 안 난다.
//   (2026-08-22 실클릭 검증이 잡았다 → `.playtest/nine-seas/FINDINGS.md`)
//
// 이 바다의 뼈대(regions/index.js의 OCEAN_LANES):
//   · **서인도 함대(flota)** — 세비야에서 아바나로. 은을 모아 떼로 건너간다.
//     한 해에 한 번 뜨는 배라 season을 붙이기에 가장 좋은 자리다(허리케인 철을 피해 떠났다).
//   · **파나마 지협** — 포르토벨로에서 노새로 넘어 카야오까지. 배가 아니라 짐이 넘는 길이다.
//     포르토벨로의 장(feria)은 함대가 올 때만 섰다 — 이것도 season 자리다.
//   · **밀무역** — 리오아차·마라카이보 같은 변방 항구는 왕실 허가 없이 외국 배와 거래했다.
//     작은 rank, 좁은 goods, 순회로 없는(그때그때 이문을 좇는) 상단이 어울린다.

export const TRADERS = [
  /* ── 은을 떼로 나르는 배 ──────────────────────────────────
     이 바다의 은은 혼자 못 간다. 한 해에 한 번, 함대가 되어서만 건넌다. */
  {
    id: 'flota', name: '서인도 함대', flag: 'spain', ship: 'galizabra',
    purse: [14000, 34000], goods: ['silver', 'cochineal', 'hide', 'sugar'],
    scope: 'ocean', rank: 5, season: 'summer',
    /* 여름에만 뜬다 — 허리케인 철을 피해 떠나야 했기 때문이다. 그래서 이 배를 놓치면
       한 해를 기다린다. 순회로가 베라크루스와 포르토벨로를 들러 아바나에 모이는 것은
       **은이 두 갈래로 올라와 한 항구에서 합쳐지기** 때문이다. */
    circuit: ['havana', 'veracruz', 'havana', 'cartagena', 'portobelo', 'cartagena', 'havana'],
    blurb: '은을 모아 떼로 건넌다. 이 배를 놓치면 한 해를 기다린다.',
    lines: {
      greet: '“함대요. 흩어져 가는 배와는 말을 섞지 않소.”',
      deal: '“짐을 얹고 싶으면 아바나로 오시오. 여기서는 값을 매기지 않소.”',
      refuse: '“함대는 기다리지 않소.”',
    },
  },
  {
    id: 'feriaportobelo', name: '포르토벨로 장(feria) 중개상', flag: 'spain', ship: 'urca',
    purse: [9000, 22000], goods: ['silver', 'mercury', 'woolcloth', 'wine'],
    scope: 'region', rank: 4, season: 'summer',
    /* 이 장은 **함대가 와야 선다.** 노새가 카야오의 은을 지협 너머로 지고 오면 그것이
       사십 일 남짓 부두에 쌓였다가 함대와 함께 사라진다. 값이 그 사십 일 안에만 있다 —
       장이 안 서는 철의 포르토벨로는 습한 빈 항구다. */
    circuit: ['portobelo', 'panama', 'portobelo', 'nombrededios', 'portobelo'],
    blurb: '함대가 와야 서는 장. 사십 일 동안 세상의 은이 이 부두에 쌓인다.',
    lines: {
      greet: '“장이 섰소. 값은 오늘과 내일이 다르오.”',
      deal: '“수은을 가져오셨소? 그것은 은과 같은 값이오.”',
      refuse: '“함대가 떠났소. 내년에 오시오.”',
    },
  },
  {
    id: 'novohispano', name: '베라크루스 코치닐 상관', flag: 'spain', ship: 'urca',
    purse: [6000, 16000], goods: ['cochineal', 'vanilla', 'silver', 'wine'],
    scope: 'region', rank: 4, season: null,
    /* 붉은 염료 한 자루가 은보다 비쌌다 — 그 벌레는 다른 데서 나지 않았고, 스페인은
       그것이 벌레라는 사실 자체를 오래 숨겼다. 이 상관의 일은 그 비밀을 지키는 일이기도 하다. */
    circuit: ['veracruz', 'campeche', 'havana', 'veracruz'],
    blurb: '붉은 염료를 쥐고 있다. 이것이 어디서 나는지는 말하지 않는다.',
    lines: {
      greet: '“코치닐이오. 값을 물으시기 전에 색부터 보시오.”',
      deal: '“한 자루가 은 한 자루요. 놀랄 것 없소.”',
    },
  },
  {
    id: 'galeondemanila', name: '아카풀코 마닐라 갈레온', flag: 'spain', ship: 'urca',
    purse: [16000, 40000], goods: ['silver', 'silk', 'ceramic', 'spice'],
    scope: 'ocean', rank: 5, season: 'winter',
    /* 이 세계 최장 항로(아카풀코~마닐라 48일)의 그 배다. 왕이 정한 것은 **두 척뿐**이라
       이 배 한 척의 짐이 한 해의 태평양 무역 전부였다. 은이 서쪽으로 가고 비단이 동쪽으로 온다. */
    circuit: ['acapulco', 'acapulco'],
    blurb: '왕이 정한 두 척 중 하나. 이 배의 짐이 한 해의 태평양 전부다.',
    lines: {
      greet: '“마닐라에서 왔소. 백사십 날 만에 뭍을 보오.”',
      deal: '“비단은 이미 임자가 있소. 은을 실을 자리라면 이야기가 되오.”',
      refuse: '“왕의 배요. 흥정하는 배가 아니오.”',
    },
  },

  /* ── 떼를 안 기다리는 배 ──────────────────────────────────
     왕실 허가 없이 외국 배와 거래하던 변방 항구들. 규모는 작고 값은 좋다. */
  {
    id: 'rescate', name: '리오아차의 구조무역선', flag: 'burgundy', ship: 'patache',
    purse: [1800, 5200], goods: ['pearl', 'salt', 'woolcloth', 'weapon'],
    scope: 'region', rank: 2, season: null,
    /* `rescate`(구조)는 밀무역의 관용어였다 — "난파선을 구했다"는 명목으로 외국 배와 거래했다.
       변방 항구엔 함대가 안 들르니 옷감 한 필도 이렇게만 들어온다. 값이 좋은 이유이자
       총독이 눈감는 이유다. */
    circuit: ['riohacha', 'curacao', 'santamarta', 'riohacha'],
    blurb: '“난파선을 구했다”는 명목으로 외국 배와 거래한다. 총독도 옷감이 필요하다.',
    lines: {
      greet: '“구조요. 그 배는 난파했고 우리는 짐을 건졌을 뿐이오.”',
      deal: '“문서는 없소. 대신 값이 좋소.”',
      refuse: '“오늘은 순찰선이 가까이 있소.”',
    },
  },
  {
    id: 'maracaibocacao', name: '마라카이보 카카오 중매인', flag: 'spain', ship: 'piragua',
    purse: [1200, 4000], goods: ['cacao', 'tobacco', 'hide'],
    scope: 'region', rank: 2, season: null,
    /* 호수 안쪽 카카오는 큰 배가 못 들어가 **작은 배로만** 나온다. 그 짐이 퀴라소에서
       옮겨 실리고 나면, 서류상 그 카카오는 이 세상에 없던 것이 된다. */
    circuit: ['maracaibo', 'curacao', 'riohacha', 'maracaibo'],
    blurb: '호수 안쪽 카카오는 작은 배로만 나온다. 나온 뒤의 일은 묻지 않는다.',
    lines: {
      greet: '“호수에서 왔소. 큰 배로는 못 들어가는 데요.”',
      deal: '“퀴라소에 닿기 전에 파는 게 낫소. 거기 값은 그들이 정하오.”',
    },
  },
  {
    id: 'perleros', name: '쿠마나 진주 잠수선단', flag: 'spain', ship: 'piragua',
    purse: [1500, 6000], goods: ['pearl', 'salt', 'grain'],
    scope: 'region', rank: 2, season: 'summer',
    /* 진주는 사람이 숨을 참아 건진다 — 그래서 이 선단의 진짜 재고는 진주가 아니라 사람이고,
       그 사람이 오래 못 산다. 여름에만 나오는 것은 물이 맑아야 바닥이 보이기 때문이다. */
    circuit: ['cumana', 'nuevacadiz', 'cumana', 'curacao', 'cumana'],
    blurb: '숨을 참아 건진다. 이 선단의 재고는 진주가 아니라 사람이다.',
    lines: {
      greet: '“진주요. 오늘 건진 것만 있소.”',
      deal: '“알이 굵은 건 이미 총독 몫이오. 나머지를 보시오.”',
    },
  },
  {
    id: 'azucarero', name: '산토도밍고 제당소 배', flag: 'spain', ship: 'patache',
    purse: [2200, 7000], goods: ['sugar', 'ginger', 'hide', 'woolcloth'],
    scope: 'region', rank: 3, season: null,
    /* 이 섬의 설탕은 브라질에 밀려 값이 안 나온다. 그래서 배는 설탕만으로 못 채우고
       **가죽**을 함께 싣는다 — 들소가 아니라 내버려 둔 소가 불어난 것이다. */
    circuit: ['santodomingo', 'puertoplata', 'sanjuan', 'santodomingo'],
    blurb: '설탕만으로는 배가 안 찬다. 그래서 가죽을 함께 싣는다.',
    lines: {
      greet: '“설탕이오. 브라질 값을 대지는 못하오.”',
      deal: '“가죽을 얹어 드리리다. 이 섬엔 소가 남아도오.”',
    },
  },
];
