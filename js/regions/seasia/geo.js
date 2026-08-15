// regions/seasia/geo.js — 동남아·향료제도의 지리
//
// 좌표계는 **이 권역 전용 400×225**다. 다른 권역의 좌표와 아무 관계가 없다.
// 규약과 필드 설명은 `js/regions/mediterranean/geo.js`가 본보기다 — 그것을 보고 채운다.
//
// 지켜야 할 것:
//   · 도시 사이는 **12px 이상** 떨어뜨린다(클릭 판정 반경 6px).
//   · 이름표는 도시 **위쪽**에 배경 박스째 그려진다 — 한글 글자당 약 6px 폭으로 겹침을 계산한다.
//   · x는 8~392, y는 20~205 안에 둔다(가장자리는 지도 그림의 여백이다).
//   · 다른 권역으로 나가는 항로는 여기가 아니라 `js/regions/index.js: OCEAN_LANES`에 적는다.

export const CITIES = [
  // { id:'lisboa', name:'리스본', area:'에스트레마두라', style:'latin', x:60, y:120,
  //   flag:'portugal', seed:3101, size:3, industry:3, prizeYard:false },
];

/** 권역 안 항로. 여기 없는 두 항구는 직항이 없다. */
export const ROUTES = [
  // ['lisboa','sevilla'],
];

/** 항로 위험도 = **당대 해상보험 요율(%)**. 키는 도시 두 개를 정렬해 '|'로 이은 것.
    null = 해적 개념이 없는 구간(내해·육로·강). 근거는 권역 근거 JSON의 routes에 적는다. */
export const ROUTE_RISK = {
  // 'lisboa|sevilla': 4.0,
};

/** 해류·계절풍. from 방향으로 가면 물길을 타고 거스르면 느리다. */
export const CURRENTS = {
  // 'lisboa|arguin': { from:'lisboa', push:0.12 },
};
