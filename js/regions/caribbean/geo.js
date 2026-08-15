// regions/caribbean/geo.js — 카리브·누에바에스파냐의 지리
//
// 좌표계는 **이 권역 전용 400×225**다. 다른 권역의 좌표와 아무 관계가 없다.
// 규약과 필드 설명은 `js/regions/mediterranean/geo.js`가 본보기다.
//
// 지켜야 할 것:
//   · 도시 사이는 **12px 이상**(클릭 판정 반경 6px) · 이름표는 도시 위쪽, 한글 글자당 약 6px
//   · x는 8~392, y는 20~205
//   · 다른 권역으로 나가는 항로는 `js/regions/index.js: OCEAN_LANES`에 이미 그어져 있다

export const CITIES = [];
export const ROUTES = [];
export const ROUTE_RISK = {};
export const CURRENTS = {};
