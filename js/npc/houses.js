// npc/houses.js — 상단(商團) 명부의 합침 자리
//
// 바다별 명부는 파일이 따로다(여럿이 동시에 써도 같은 줄에서 안 부딪히게):
//   houses-euro.js      지중해 · 대서양 · 아프리카
//   houses-asia.js      중동 · 인도양 · 동남아 · 동아시아
//   houses-newworld.js  카리브 · 남아메리카
//
// ── 상단은 배가 아니라 회사다 ─────────────────────────────────
// `js/regions/<권역>/npc-traders.js`의 명부는 **배**다 — 지도 위의 점 하나이고 정원이 있다.
// 이쪽은 **회사**다: 자본을 들고 여러 항차를 동시에 굴리며, 지도에 점으로 안 뜬다.
// 그래서 상단을 늘려도 `NPC.traders` 정원과 해적 밀도는 한 톨도 안 움직인다
// (이 저장소가 두 번 지킨 규약 — *"밀도를 올려서 풀지 마라"*).
//
// ★ **상단이 하는 일은 셋뿐이다**: 재고·시세·항차. 쥔 자리의 웃돈(`gripMarkup`)과
//   계약 가로채기는 **세력**의 것이다(`SPEC-factions.md`) — 여기서 다시 만들지 않는다.
//
// 스키마와 자본 환산 규약 → `.playtest/round-25/NPC-DESIGN.md` §2
// 근거 → `content/houses-evidence.json` · 검증 → `node tools/check-houses.mjs`

import { HOUSES_EURO } from './houses-euro.js';
import { HOUSES_ASIA } from './houses-asia.js';
import { HOUSES_NEWWORLD } from './houses-newworld.js';

export const HOUSES = [...HOUSES_EURO, ...HOUSES_ASIA, ...HOUSES_NEWWORLD];

export const HOUSE_BY_ID = Object.fromEntries(HOUSES.map((h) => [h.id, h]));

/** 그 바다의 상단 */
export const housesOfRegion = (regionId) => HOUSES.filter((h) => h.region === regionId);

/** 그 항구에 상관을 둔 상단 */
export const housesAtCity = (cityId) => HOUSES.filter((h) => (h.seats ?? []).includes(cityId));
