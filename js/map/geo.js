// map/geo.js — 지중해의 지리 (지도 담당 영역)
//
// ★ 이 파일은 "어디에 무엇이 있고 어떻게 이어지는가"만 다룬다.
//   교역품 산지·수요지 같은 **경제 수치는 `js/data.js`**에 있다. 둘을 갈라 둔 이유는
//   지도를 손보는 사람과 경제를 조율하는 사람이 같은 줄을 놓고 충돌하지 않게 하기 위해서다.
//   두 쪽은 `id`로만 맞물린다 — 여기에 도시를 추가하면 data.js의 `CITY_TRADE`에도
//   같은 id를 넣어야 하고, 빠지면 시작할 때 콘솔에 경고가 뜬다.
//
// 좌표계: 논리 해상도 400×225 기준. 지도 그림(`js/sprites/scene.js: mapSprite`)과
//   같은 좌표계이므로, 해안선을 고치면 도시 좌표도 함께 봐야 한다.

/** 도시의 지리·외형.
    x,y   지도 위 위치(400×225)
    style 항구 배경 화풍 — latin | hellenic | levant  (sprites/scene.js: STYLES)
    flag  항구에 걸리는 깃발 — sprites/ship.js: FLAGS
          15~16세기 기준으로 맞춰져 있다: 로도스=성 요한 기사단(1522년까지) · 마르세유=프랑스(1481년 프로방스 병합)
          · 튀니스=하프스 왕조(오스만 확정은 1574년). 근거 → .claude/docs/wiki/city-goods-history.md
    seed  항구 그림을 결정하는 난수 씨앗(같은 값이면 같은 항구 그림)
    size  항구 규모 1~3 — 시장 깊이와 입항세가 여기서 나온다
    industry 조선 공업력 0~3 — **어떤 배를 지을 수 있는가**를 정한다(`SHIPS[].tier` 이상이어야 한다).
          국적별 조선소를 하드코딩하는 대신 이 수치로 푼다 — 도시를 추가하면 자동으로 정해지고,
          "제 나라 배는 짓기 쉽다"(원산국 항구는 요구등급 −1)로 기술 전파도 표현된다.
          0=내륙이라 못 짓는다 · 1=소형까지 · 2=대형 상선까지 · 3=최상급까지.
    prizeYard 나포선을 뜯어 고쳐 파는 항구 — 중고 매물이 더 자주, 더 싸게 나온다.
          튀니스·알제는 자체 건조가 약해 나포 상선 개조가 주된 함대 확보 수단이었다. */
export const CITY_GEO = [
  { id: 'venezia',    name: '베네치아',     region: '아드리아',   style: 'latin',    x: 141, y: 63,  flag: 'venice',  seed: 1101, size: 3, industry: 3 },
  { id: 'genova',     name: '제노바',       region: '리구리아',   style: 'latin',    x: 116, y: 76,  flag: 'genoa',   seed: 1202, size: 3, industry: 3 },
  { id: 'marseille',  name: '마르세유',     region: '프로방스',   style: 'latin',    x: 91,  y: 71,  flag: 'france',  seed: 1303, size: 2, industry: 2 },
  { id: 'barcelona',  name: '바르셀로나',   region: '카탈루냐',   style: 'latin',    x: 57,  y: 89,  flag: 'spain',   seed: 1404, size: 3, industry: 2 },
  { id: 'napoli',     name: '나폴리',       region: '캄파니아',   style: 'latin',    x: 131, y: 110, flag: 'spain',   seed: 1505, size: 2, industry: 2 },
  { id: 'palermo',    name: '팔레르모',     region: '시칠리아',   style: 'latin',    x: 151, y: 144, flag: 'spain',   seed: 1606, size: 2, industry: 2 },
  { id: 'tunis',      name: '튀니스',       region: '이프리키야', style: 'levant',   x: 174, y: 157, flag: 'hafsid',  seed: 1707, size: 2, industry: 1, prizeYard: true },
  { id: 'algiers',    name: '알제',         region: '마그레브',   style: 'levant',   x: 106, y: 151, flag: 'ottoman', seed: 1808, size: 2, industry: 1, prizeYard: true },
  { id: 'athens',     name: '아테네',       region: '아티카',     style: 'hellenic', x: 191, y: 110, flag: 'ottoman', seed: 1909, size: 2, industry: 1 },
  // ★ 기사단령으로 둔다. 실제로는 1522년에 오스만에 함락되고 기사단이 몰타로 옮겨가므로
  //   로도스와 몰타가 **동시에** 기사단령인 해는 없다. 그래도 둘 다 기사단으로 두는 이유는
  //   이 게임이 특정 연도가 아니라 "대항해시대쯤"을 배경으로 하고, 연표에 맞추느라
  //   콘텐츠를 덜어내지 않기로 했기 때문이다(프로젝트 최상위 지침).
  //   기사단 요새 도시가 둘이면 색깔이 겹치지 않도록 성격을 갈라 둔다 —
  //   로도스는 에게해의 오래된 요새, 몰타는 해협의 신흥 나포항.
  { id: 'rodos',      name: '로도스',       region: '에게',       style: 'hellenic', x: 239, y: 109, flag: 'hospitaller', seed: 2010, size: 1, industry: 1 },
  { id: 'istanbul',   name: '이스탄불',     region: '보스포루스', style: 'hellenic', x: 241, y: 55,  flag: 'ottoman', seed: 2111, size: 3, industry: 3 },
  // 부르사·이즈니크는 실제로는 **내륙**이다(부르사의 외항은 뮈단야, 이즈니크는 호수 동안).
  // 이스탄불을 통해서만 이어 두어 "안쪽 시장까지 들어가면 원가에 산다"는 구조로 삼았다.
  // 좌표는 이름표가 이스탄불 표식·서로를 덮지 않는 자리로 잡았다 — 지도에서 이 셋이 가장 붐빈다.
  { id: 'bursa',      name: '부르사',       region: '비티니아',   style: 'hellenic', x: 222, y: 66,  flag: 'ottoman', seed: 2414, size: 2, industry: 0 },
  { id: 'iznik',      name: '이즈니크',     region: '비티니아',   style: 'hellenic', x: 242, y: 76,  flag: 'ottoman', seed: 2515, size: 1, industry: 0 },
  { id: 'beirut',     name: '베이루트',     region: '레반트',     style: 'levant',   x: 351, y: 121, flag: 'ottoman', seed: 2212, size: 2, industry: 1 },
  { id: 'alexandria', name: '알렉산드리아', region: '이집트',     style: 'levant',   x: 320, y: 159, flag: 'ottoman', seed: 2313, size: 3, industry: 2 },
  // 몰타 — 카를 5세가 성 요한 기사단에 넘긴 섬(1530). 시칠리아 해협의 병목에 앉아
  // 동서 해운 전체를 내려다본다. 생산지가 아니라 **나포품 집산지**라 특산이 거의 없고
  // 곡물을 상시 수입한다. 나포선 경매가 서던 곳이라 tunis·algiers와 같은 prizeYard.
  { id: 'malta',      name: '몰타',         region: '시칠리아 해협', style: 'latin', x: 169, y: 161, flag: 'hospitaller', seed: 2616, size: 1, industry: 1, prizeYard: true },
];

/* 항로 — 인접 도시 간 연결. 여기에 없는 두 항구는 직항이 없다.
   NPC도 플레이어도 이 그래프 위에서만 움직이므로, 선 하나를 긋고 지우는 것이
   경제 전체의 물길을 바꾼다. 값은 `distanceBetween`이 좌표에서 직접 잰다. */
export const ROUTES = [
  ['venezia', 'genova'], ['venezia', 'rodos'], ['venezia', 'athens'], ['venezia', 'napoli'],
  ['genova', 'marseille'], ['genova', 'napoli'],
  ['marseille', 'barcelona'],
  ['barcelona', 'algiers'], ['barcelona', 'palermo'],
  ['napoli', 'palermo'], ['napoli', 'athens'],
  ['palermo', 'tunis'], ['palermo', 'algiers'], ['palermo', 'athens'],
  // 몰타는 시칠리아 해협의 두 기슭에만 붙인다. 직항 palermo~tunis는 그대로 두어
  // "몰타를 들르는 것은 선택"으로 남긴다 — 끊으면 해협 물동량이 통째로 몰타를 지나게 되어
  // 곡물 흐름이 바뀐다. 몰타의 값어치는 항로가 아니라 나포선 경매(prizeYard)에 있다.
  ['malta', 'palermo'], ['malta', 'tunis'],
  ['tunis', 'algiers'], ['tunis', 'alexandria'],
  ['athens', 'rodos'], ['athens', 'istanbul'],
  ['rodos', 'istanbul'], ['rodos', 'beirut'], ['rodos', 'alexandria'],
  ['beirut', 'alexandria'],
  // 이집트 밀을 제국 수도로 직송하던 간선. 이 선이 없으면 로도스·아테네가 곡물을
  // 먼저 빨아들여 이스탄불까지 한 톨도 못 간다(대시보드에서 유입 1로 확인).
  ['alexandria', 'istanbul'],
  // 아나톨리아 안쪽 시장 — 이스탄불에서만 들어간다(막다른 주머니).
  ['istanbul', 'bursa'], ['istanbul', 'iznik'], ['bursa', 'iznik'],
];

/* 해류 — 지중해는 대체로 아프리카 연안을 동쪽으로 흐르고 레반트에서 북상해 되돌아온다.
   `from` 방향으로 가면 물길을 타고, 거스르면 그만큼 느리다. 실린 구간만 반영한다.
   키는 도시 두 개를 정렬해 이은 것. */
/* 항로 위험도 — **당대 해상보험 요율(%)**이다.
   추정치가 아니라 16세기 제노바·피렌체 인수업자가 실제로 매긴 값을 앵커로 삼았다.
   "당대인이 돈을 걸고 매긴 위험"이라 우리가 감으로 매기는 것보다 낫다.

   앵커(사료에서 직접 나온 값): 아드리아·나폴리·메시나 2 · 알렉산드리아 편도 6 ·
   팔레르모 7~8 · 에게해 8 · 튀니스 9.
   나머지는 그 사이를 **내해/외해 · 양단 깃발의 적대 여부 · 병목(해협) 통과**로 채웠다.
   판정과 출처는 `content/route-evidence.json`이 정본이고
   `node tools/check-routes.mjs`가 이 표와 어긋나면 실패시킨다.

   null = 해적 개념이 적용되지 않는 구간(오스만 내해·육로). 조우 확률이 0이 된다. */
export const ROUTE_RISK = {
  'genova|venezia': 3.5,
  'napoli|venezia': 2.0,
  'athens|venezia': 4.5,
  'rodos|venezia': 7.0,
  'genova|marseille': 2.0,
  'genova|napoli': 2.5,
  'barcelona|marseille': 2.5,
  'algiers|barcelona': 9.0,
  'barcelona|palermo': 6.0,
  'napoli|palermo': 2.0,
  'athens|napoli': 5.5,
  'palermo|tunis': 8.0,
  'algiers|palermo': 8.0,
  'athens|palermo': 6.5,
  'algiers|tunis': 5.0,
  'alexandria|tunis': 6.0,
  'athens|rodos': 8.0,
  'athens|istanbul': 4.0,
  'istanbul|rodos': 4.5,
  'beirut|rodos': 5.5,
  'alexandria|rodos': 7.5,
  'alexandria|beirut': 5.0,
  'alexandria|istanbul': 6.0,
  'bursa|istanbul': null,
  'istanbul|iznik': null,
  'bursa|iznik': null,
  'malta|palermo': 4.0,
  'malta|tunis': 9.0,
};

/** 항로 키 — 방향이 없으므로 정렬해서 맞춘다 */
export const riskKey = (aId, bId) => [aId, bId].sort().join('|');

export const CURRENTS = {
  'algiers|barcelona':  { from: 'barcelona',  push: 0.06 },
  'algiers|tunis':      { from: 'algiers',    push: 0.10 },
  'palermo|tunis':      { from: 'palermo',    push: 0.06 },
  'alexandria|tunis':   { from: 'tunis',      push: 0.12 },
  'alexandria|beirut':  { from: 'alexandria', push: 0.10 },
  'beirut|rodos':       { from: 'beirut',     push: 0.08 },
  'athens|rodos':       { from: 'rodos',      push: 0.06 },
  'istanbul|rodos':     { from: 'istanbul',   push: 0.10 },   // 보스포루스에서 밀려 나오는 물
  'napoli|palermo':     { from: 'napoli',     push: 0.05 },
  'genova|venezia':     { from: 'venezia',    push: 0.05 },
};

export const GEO_BY_ID = Object.fromEntries(CITY_GEO.map((c) => [c.id, c]));
