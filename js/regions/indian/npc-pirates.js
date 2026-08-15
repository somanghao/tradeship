// regions/indian/npc-pirates.js — 인도양의 해적
//
// 상인을 노리고 돌아다닌다. 플레이어도 사냥감이다. 이들이 턴 짐은 목적지에 닿지 못해
// **그 항구에서 그 물건이 귀해진다**(`world.js: raids` → 시장 충격).
//
// ── 필드 ────────────────────────────────────────────────────
//   id, name, flag, ship, purse   무역상과 같다
//   base     소굴 항구 — 여기서 출항하고 여기로 돌아간다
//   hunt     즐겨 노리는 구간 키들 ('a|b' 정렬형). 비우면 상인이 많은 쪽으로 쏠린다
//   strength 1~5. 전투력이다. 5는 함대를 이끄는 두목이라 초반에 만나면 끝장난다
//   bounty   [최소,최대] 현상금 — 잡으면 받는다
//   circuit  순회로. 해적도 계절과 항로를 탄다
//   season   'summer'|'winter'|null — 코르세어는 여름에 나온다(겨울 지중해는 배가 안 뜬다)
//   scope    'region' | 'ocean'
//   blurb, lines
//
// ★ **시간의 흐름을 담아라.** circuit·season으로 "지금 어느 바다가 위험한가"가
//   달마다 바뀌면, 항로 선택이 지도만 보고 정하는 일이 아니게 된다.
// ★ 이름 있는 해적은 **역사에 실재한 인물**을 우선 쓴다(근거 JSON에 출처를 적는다).

export const PIRATES = [
  // { id:'barbarossa', name:'하이레딘 바르바로사', flag:'ottoman', ship:'galley',
  //   base:'algiers', purse:[2000,9000], strength:5, bounty:[4000,12000],
  //   hunt:['algiers|barcelona','algiers|palermo'], season:'summer', scope:'region',
  //   blurb:'알제의 주인. 여름이면 함대를 몰고 나와 서지중해를 쓸어 간다.' },
];
