// regions/indian/npc-traders.js — 인도양의 무역상
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
// ★ **시나리오가 있는 상단을 몇은 두어라.** circuit과 season이 그 장치다 —
//   "여름이면 알렉산드리아에 향신료를 부리고 겨울에는 안 온다"가 성립하면
//   플레이어가 달력을 보고 항로를 짜게 된다.

export const TRADERS = [
  // { id:'contarini', name:'콘타리니 상관', flag:'venice', ship:'carrack',
  //   purse:[4000,12000], goods:['spice','silk'], scope:'region', rank:4,
  //   circuit:['venezia','rodos','alexandria','beirut','rodos','venezia'],
  //   season:null,
  //   blurb:'리알토에 상관을 둔 오래된 가문. 향신료라면 값을 아끼지 않는다.',
  //   lines:{ greet:'“베네치아의 배요. 길을 비켜 주시오.”' } },
];
