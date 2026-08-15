// map/geo.js — 세계의 지리 (합성 계층)
//
// ★ 이 파일은 이제 **아무 값도 담지 않는다.** 지리의 정본은 권역마다 갈라져 있다:
//     js/regions/<권역>/geo.js       그 권역의 도시·항로·위험도·해류
//     js/regions/index.js            권역 목록과 **원양 항로**(권역과 권역을 잇는 선)
//
//   여기서는 그것들을 모아 **예전과 똑같은 이름·모양으로** 내놓기만 한다.
//   그래서 `CITY_GEO`·`ROUTES`·`ROUTE_RISK`를 쓰던 코드는 한 줄도 고칠 필요가 없다.
//
//   가른 이유는 하나다 — 도시가 열여섯에서 백 단위로 늘면 한 파일로는 손을 못 댄다.
//   권역별로 갈라 두면 여러 사람이 각자 바다를 동시에 손봐도 같은 줄에서 부딪히지 않는다.
//
// 좌표계 주의: 좌표는 **권역 안에서만 유효하다.** 지중해의 (141,63)과 인도양의 (141,63)은
//   아무 관계가 없다. 그래서 두 도시의 거리는 **같은 권역일 때만** 좌표에서 잰다
//   (다른 권역이면 원양 항로의 `days`를 쓴다 — `state.js: distanceBetween`).

import {
  ALL_CITY_GEO, ALL_ROUTES, ALL_ROUTE_RISK, ALL_CURRENTS,
  OCEAN_LANES, LANE_BY_KEY, isOceanLane, REGION_OF_CITY,
  REGIONS, REGION_BY_ID, REGION_IDS, HOME_REGION, citiesOfRegion,
} from '../regions/index.js';

/** 모든 권역의 도시. 도시마다 `region`(권역 id)과 `area`(소지역 표시명)가 있다. */
export const CITY_GEO = ALL_CITY_GEO;

/** 권역 안 항로 + 원양 항로를 합친 것. 읽는 쪽은 둘을 구별하지 않아도 된다. */
export const ROUTES = ALL_ROUTES;

/** 항로 위험도 — 당대 해상보험 요율(%). null = 해적 개념이 없는 구간(내해·육로). */
export const ROUTE_RISK = ALL_ROUTE_RISK;

/** 해류·계절풍 */
export const CURRENTS = ALL_CURRENTS;

/** 항로 키 — 방향이 없으므로 정렬해서 맞춘다 */
export const riskKey = (aId, bId) => [aId, bId].sort().join('|');

export const GEO_BY_ID = Object.fromEntries(CITY_GEO.map((c) => [c.id, c]));

/* 권역 관련은 그대로 통과시킨다 — 지리를 묻는 쪽이 regions/를 직접 import하지 않게 */
export {
  OCEAN_LANES, LANE_BY_KEY, isOceanLane, REGION_OF_CITY,
  REGIONS, REGION_BY_ID, REGION_IDS, HOME_REGION, citiesOfRegion,
};

/** 두 도시가 같은 권역인가 — 다르면 좌표로 거리를 재면 안 된다 */
export const sameRegion = (aId, bId) => REGION_OF_CITY[aId] === REGION_OF_CITY[bId];

/** 그 원양 항로의 정의(일수·계절풍·육로 환적 여부). 권역 안 항로면 null */
export const laneOf = (aId, bId) => LANE_BY_KEY[riskKey(aId, bId)] ?? null;
