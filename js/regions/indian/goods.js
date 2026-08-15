// regions/indian/goods.js — 인도양이 세계에 처음 들여오는 교역품
//
// ★ 교역품 id는 **세계에서 하나뿐**이다. 이미 다른 권역이 정의한 품목(곡물·소금·향신료…)을
//   여기 다시 적지 않는다 — 중복이면 index.js가 경고하고 버린다.
//   "우리 권역에서도 난다"는 goods가 아니라 **trade.js의 supply**로 적는 것이다.
// ★ 새 품목을 넣으면 `js/sprites/icons.js`에 같은 icon 키가 있어야 화면에 그림이 뜬다.
//   아직 없으면 비슷한 기존 아이콘 키를 빌려 쓰고, 근거 JSON의 art.iconTodo에 적어 둔다.
// ★ base는 **곡물 20닢 대비 사료 비율**로 정한다. 감으로 매기지 않는다.

export const GOODS = [
  // { id:'clove', name:'정향', base:520, icon:'spice', bulk:1 },
];
