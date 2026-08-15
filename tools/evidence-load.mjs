// evidence-load.mjs — 권역별로 갈라진 근거 파일을 모아 읽는다 (검증 스크립트 공용)
//
// 근거는 권역마다 파일이 다르다:
//   content/evidence-meta.json               판정 라벨·시대 전제·항로 공식 (공통 · 여기 한 곳뿐)
//   content/regions/<권역>-evidence.json     그 권역의 도시·항로·교역품·선박 근거
//
// 갈라 둔 이유는 도시가 백 단위로 늘기 때문이다. 한 파일이면 여러 사람이 같은 줄에서
// 부딪히고, 파일이 300KB를 넘어 열어 보기도 어려워진다. 대신 **판정 라벨 같은 공통 규약은
// 반드시 한 곳에** 둔다 — 권역마다 적으면 조용히 갈라진다.

import { readFileSync } from 'node:fs';
import { REGION_IDS, REGION_BY_ID } from '../js/regions/index.js';

const read = (rel) => JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

export const META = read('content/evidence-meta.json');

/** 권역 id → 그 권역의 근거 객체 */
export const BY_REGION = Object.fromEntries(
  REGION_IDS.map((rid) => {
    try {
      return [rid, read(`content/regions/${rid}-evidence.json`)];
    } catch {
      // 권역 근거 파일이 아직 없어도 막지 않는다 — 콘텐츠가 먼저고 근거가 뒤따른다
      return [rid, { region: rid, cities: {}, routes: {}, goods: {}, ships: {} }];
    }
  }));

/** 어느 권역의 근거에서 왔는지를 함께 들고 합친다 (충돌하면 먼저 읽은 권역이 남는다) */
function mergeSection(section) {
  const out = {}, from = {};
  for (const rid of REGION_IDS) {
    for (const [k, v] of Object.entries(BY_REGION[rid][section] ?? {})) {
      if (out[k]) continue;
      out[k] = v; from[k] = rid;
    }
  }
  return { out, from };
}

/** 원양 항로는 어느 권역의 것도 아니다 — 권역과 권역 **사이**의 선이라 따로 둔다.
    권역 파일에 넣으면 양쪽이 서로 자기 것이라 여겨 두 벌이 생기거나 아무도 안 적는다. */
export const LANE_EV = (() => {
  try { return read('content/ocean-lanes-evidence.json').routes ?? {}; }
  catch { return {}; }
})();

const cityMerged = mergeSection('cities');
const routeMerged = mergeSection('routes');
// 권역 안 항로 + 원양 항로를 한 표로 낸다. check-routes.mjs는 둘을 구별할 필요가 없다.
Object.assign(routeMerged.out, LANE_EV);
const goodsMerged = mergeSection('goods');
const shipsMerged = mergeSection('ships');

export const CITY_EV = cityMerged.out;
export const CITY_EV_REGION = cityMerged.from;
export const ROUTE_EV = routeMerged.out;
export const ROUTE_EV_REGION = routeMerged.from;
export const GOODS_EV = goodsMerged.out;
export const SHIPS_EV = shipsMerged.out;

/** 판정 라벨 — 도시·항로가 각자 라벨을 쓰므로 둘 다 낸다 */
export const VERDICTS = META.verdicts;
export const ROUTE_VERDICTS = META.routeVerdicts ?? META.verdicts;
export const ERA = META.era;

export const regionName = (rid) => REGION_BY_ID[rid]?.name ?? rid;
