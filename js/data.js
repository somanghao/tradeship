// data.js — 교역품 / 도시 경제 / 선박 / 적 정의
//
// ★ 도시의 **지리**(좌표·항로·해류·깃발·규모)는 `js/map/geo.js`에 있다.
//   여기에는 그 도시가 무엇을 싸게 내놓고 무엇을 비싸게 사는지(경제)만 둔다.
//   지도를 손보는 사람과 경제를 조율하는 사람이 같은 줄에서 충돌하지 않게 가른 것이다.
//   `CITIES`는 둘을 id로 맞물려 합성한 결과다 — 읽는 쪽 코드는 예전과 똑같이 쓰면 된다.

import { CITY_GEO, GEO_BY_ID, ROUTES, CURRENTS } from './map/geo.js';

export { ROUTES, CURRENTS };

export const GOODS = [
  { id: 'grain',    name: '곡물',     base: 20,  icon: 'grain',    bulk: 1 },
  { id: 'salt',     name: '소금',     base: 35,  icon: 'salt',     bulk: 1 },
  { id: 'oliveoil', name: '올리브유', base: 45,  icon: 'oliveoil', bulk: 1 },
  { id: 'wine',     name: '와인',     base: 62,  icon: 'wine',     bulk: 1 },
  { id: 'ceramic',  name: '도자기',   base: 120, icon: 'ceramic',  bulk: 1 },
  { id: 'fur',      name: '모피',     base: 145, icon: 'fur',      bulk: 1 },
  { id: 'glass',    name: '유리세공', base: 155, icon: 'glass',    bulk: 1 },
  { id: 'weapon',   name: '무기',     base: 185, icon: 'weapon',   bulk: 1 },
  { id: 'spice',    name: '향신료',   base: 225, icon: 'spice',    bulk: 1 },
  { id: 'ivory',    name: '상아',     base: 265, icon: 'ivory',    bulk: 1 },
  { id: 'silk',     name: '비단',     base: 310, icon: 'silk',     bulk: 1 },
  { id: 'gold',     name: '금괴',     base: 520, icon: 'gold',     bulk: 1 },
];

export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g]));

/* 시장 깊이 — 한 항구가 한 번에 소화할 수 있는 물량에는 한계가 있다.
   많이 살수록 비싸게 사고 많이 팔수록 싸게 판다. 그 항구·품목의 최근 거래량(압력)이
   누적되므로 나눠 팔아도 피하지 못하고, 날이 지나면 시장이 회복한다.
   이 장치가 없으면 "화물칸을 통째로 사서 통째로 판다"가 항상 최적이라 돈이 너무 쉽게 불어난다. */
export const MARKET = {
  depthPerSize: 45,  // 항구가 소화하는 물량 = 이 값 × 도시 size (큰 항구일수록 깊다)
  impact: 0.30,      // 깊이만큼 밀어 넣었을 때 단가가 이만큼 불리해진다
  cap: 0.35,         // 아무리 밀어 넣어도 이 이상은 안 나빠진다
  decay: 0.68,       // 하루가 지나면 압력이 이만큼 남는다 (낮을수록 시장이 빨리 회복한다)
};

/* 산지/수요지 배율 압축 — 도시별 supply/demand 값을 1 쪽으로 당긴다.
   원래 값(0.46~1.52)은 한 항차에 자산이 배로 불어날 만큼 차익이 커서
   "여러 번 무역해야 다음 배"가 성립하지 않았다. 도시 데이터는 그대로 두고
   여기 한 계수로 폭만 조인다 — 도시를 추가할 때 다시 균형을 맞출 필요가 없다. */
export const SPREAD = 0.62;

/* 대형 주문 — 상관이 내는 큰 계약. 항구마다 하나씩 걸려 있고 사흘마다 갈린다.
   화물은 직접 조달해야 하고 기한도 있지만, 성사되면 시세보다 훨씬 후하게 쳐준다.
   "여러 항차를 굴려 모으는 길"과 "한 건을 크게 물어 도약하는 길"을 나란히 두기 위한 장치. */
export const CONTRACT = {
  /* 보수를 먼저 정하고 **수량을 역산한다.** 전에는 수량(30~90)을 먼저 뽑고 단가를 곱해서,
     비단·금괴처럼 비싼 품목이 걸리면 계약 하나가 5만 닢을 넘었다(시작 자금이 900닢인데).
     지금은 "상관이 이 정도 규모의 일을 낸다"를 먼저 정하므로 품목이 뭐든 규모가 비슷하다. */
  value: [900, 4000],     // 목표 보수 — 도시 size로 스케일된다(작은 항구는 작은 일감)
  qty: [5, 64],           // 역산한 수량의 상하한 (화물칸을 넘는 일감도 있어야 큰 배가 값어치를 한다)
  payMul: [1.22, 1.42],   // 목적지 시세 대비 보수 배율 (관세도 안 뗀다)
  advance: 0.25,          // 선금 비율 (나머지는 납품할 때)
  daysPad: [4, 10],       // 편도 일수 × 1.6 + 이만큼이 기한
  // 위약금은 **선금보다 커야 한다**. 0.5로 뒀더니 선금만 받고 파기하는 것이
  // 순이득이 됐다(선금 6,896 − 위약금 3,448 = +3,448). 지금은 받은 것을 다 토하고 더 문다.
  penalty: 1.25,
};

/* 입항세 — 파는 쪽에만 붙는다. 큰 항구일수록 시세는 좋지만 떼 가는 몫도 크다.
   (도시 `size` 기준. 밀무역·면세 특권은 뒷날의 확장 자리다) */
export const TARIFF = { 1: 0.03, 2: 0.045, 3: 0.06 };

/* 도시 경제 — 그 항구가 무엇을 싸게 내놓고 무엇을 비싸게 사는가.
   supply = 산지라 싸다 (배율<1) / demand = 수요지라 비싸다 (배율>1)
   좌표·항로·깃발·규모는 `js/map/geo.js`에 있고, 여기와는 id로만 맞물린다.

   ★ 15~16세기 실제 교역을 조사해 맞춰 두었다. 수치를 바꾸기 전에
      `.claude/docs/wiki/city-goods-history.md`(도시별 근거·출처)를 먼저 본다.
      "게임 밸런스상 여기에 X를 넣자"가 고증을 덮어쓸 때는 그 문서에 사유를 남긴다. */
export const CITY_TRADE = {
  venezia: {
    // 무라노 유리는 유럽 독점 수출품, 비단업에 인구의 1/5이 종사했다.
    // 석호 도시라 곡물은 상시 수입. 흑해 타나 모피와 동방 향신료의 재분배 허브.
    supply: { glass: 0.48, silk: 0.72 },
    demand: { spice: 1.42, fur: 1.30, grain: 1.18, oliveoil: 1.20 },
    blurb: '유리와 비단의 도시. 동방 향신료라면 값을 아끼지 않는다.',
  },
  genova: {
    // 리구리아 와인과 조알리 벨벳("벨루르 드 젠")이 실제 수출품.
    // 무기는 밀라노·브레시아가 본산이라 약한 공급으로만 남긴다(아스날은 실재).
    supply: { wine: 0.62, silk: 0.70, weapon: 0.76 },
    demand: { spice: 1.30, ivory: 1.28, fur: 1.26 },
    blurb: '베네치아의 숙적. 조선소가 항구를 메우고 조알리의 벨벳이 실려 나간다.',
  },
  marseille: {
    // 프로방스 포도밭과 올리브 언덕. 레반트 항로로 향신료·사치직물을 들여온다.
    supply: { wine: 0.55, oliveoil: 0.60 },
    demand: { spice: 1.34, silk: 1.28 },
    blurb: '포도밭과 올리브 언덕에 둘러싸인 프랑스의 관문.',
  },
  barcelona: {
    // 리폴을 필두로 한 카탈루냐 화기 산업 — 이베리아 최대 산지. 소금은 이비사 염전.
    // 아라곤 플로린 주조를 위한 금 수요, 레반트 직교역으로 들여온 향신료.
    supply: { weapon: 0.62, salt: 0.52 },
    demand: { silk: 1.30, gold: 1.22, spice: 1.26 },
    blurb: '아라곤 왕관의 항구. 대장간 망치 소리가 끊이지 않는다.',
  },
  napoli: {
    // 올리브유는 확실한 수출품. 곡물 잉여는 실은 풀리아 쪽이라 이 항구는 집산에 가깝다.
    supply: { oliveoil: 0.56, grain: 0.58 },
    demand: { fur: 1.40, glass: 1.30 },
    blurb: '왕국의 밀이 모이는 집산항. 언덕마다 올리브가 익는다.',
  },
  palermo: {
    // 시칠리아 곡물 수출은 제노바행 정기 항로였고, 소금은 트라파니 염전이 본산.
    // 와인은 자체 산지라 사들이지 않는다(이슬람 지배기에도 빚었다는 화학 증거).
    supply: { grain: 0.46, salt: 0.56, wine: 0.72 },
    demand: { weapon: 1.36, fur: 1.28, glass: 1.26 },
    blurb: '지중해 한복판의 곡물 창고. 해적도 자주 들른다.',
  },
  tunis: {
    // 사하라 대상로의 종착지 — 금과 상아가 여기로 올라온다. 하프스 왕조는
    // 곡물·올리브유를 **수출**했다(곡물을 사들이는 항구가 아니다).
    supply: { ivory: 0.62, gold: 0.76, oliveoil: 0.62 },
    demand: { weapon: 1.30, silk: 1.30, ceramic: 1.28 },
    blurb: '사하라 대상로의 종착지. 상아와 사금이 흘러들고 밀과 기름이 실려 나간다.',
  },
  algiers: {
    // 배후의 미티드자 평원이 "알제의 빵바구니" — 곡물 산지다.
    // 사략 경제라 화기는 유럽에서 사들인다. 와인은 유럽 상관·포로 대상의 작은 시장.
    supply: { grain: 0.52, salt: 0.62 },
    demand: { weapon: 1.44, ceramic: 1.30, wine: 1.26 },
    blurb: '코르세어의 소굴. 배후의 밀밭이 도시를 먹인다.',
  },
  athens: {
    // 아티카 올리브는 고대부터의 지리적 특성. 이 시기 아테네 자체는 쇠락한 소읍이라
    // 큰 수출항이 아니다(도자기는 고대 아티카 도기와의 혼동이라 뺐다).
    supply: { oliveoil: 0.50, wine: 0.66 },
    demand: { grain: 1.32, silk: 1.36 },
    blurb: '올리브 기름과 포도의 땅. 폐허가 된 신전이 항구를 굽어본다.',
  },
  rodos: {
    // 기사단령 시절 올리브·포도가 성했다. 도자기는 이곳 생산이 아니라
    // 이즈니크 도기가 거쳐 가는 **중계**다("로디안 웨어"라는 이름 자체가 후대의 오인).
    supply: { wine: 0.60, ceramic: 0.74 },
    demand: { weapon: 1.38, grain: 1.34 },
    blurb: '기사단의 요새 섬. 동방의 도기가 여기를 거쳐 유럽으로 팔려 나간다.',
  },
  istanbul: {
    // 부르사에서 올라온 생사, 이즈니크 도기, 흑해에서 보스포루스로 들어오는 모피.
    // 비단·도자기는 안쪽 시장(부르사·이즈니크)보다 값이 붙는다 — 여기는 재유통 거점이다.
    // 향신료는 산지가 아니라 최종 소비지라 뺐다. 제국 수도는 이집트 밀의 최대 목적지였고,
    // 금주령에도 갈라타 술집이 수백 곳이라 와인 수요는 실재했다.
    supply: { silk: 0.62, ceramic: 0.70, fur: 0.70 },
    demand: { glass: 1.42, wine: 1.46, grain: 1.30 },
    blurb: '두 대륙이 만나는 대도시. 부르사의 생사와 흑해의 모피가 여기서 풀린다.',
  },
  bursa: {
    // 1400~1630년 이란산 원료 생사의 국제 시장. 이탈리아 상인이 여기까지 와서
    // 생사를 사고 금·은화로 결제했다 — 그 금이 다시 동방으로 빠져나간다.
    supply: { silk: 0.46 },
    demand: { gold: 1.26, glass: 1.30, spice: 1.22 },
    blurb: '이란 생사가 풀리는 아나톨리아의 시장. 배는 뮈단야에 대고 뭍길로 들어간다.',
  },
  iznik: {
    // 오스만 도기의 본산. 궁정 주문으로 먹고 사는 도공 마을이라 먹을 것은 밖에서 온다.
    supply: { ceramic: 0.44 },
    demand: { grain: 1.28, oliveoil: 1.22, wine: 1.18 },
    blurb: '가마 연기가 걷히지 않는 도공의 마을. 이 도기가 유럽에서 로도스산으로 오해받는다.',
  },
  beirut: {
    // 향신료가 지나가긴 하나 본선은 알레포–트리폴리 축이라 1차 산지가 아니다.
    // 알렉산드리아보다 불리한 값에 실린다.
    supply: { spice: 0.68, silk: 0.72 },
    demand: { ceramic: 1.42, fur: 1.36, glass: 1.28 },
    blurb: '레반트 대상로의 곁가지 항구. 향신료가 여기서도 배에 실린다.',
  },
  alexandria: {
    // 나일의 밀과 홍해 향신료 — 맘루크가 독점하던 유럽행 향신료의 최대 유통항이다.
    // 상아는 아프리카 내륙에서 나일을 타고 내려온다. 와인 수요는 이스탄불보다 얕다.
    supply: { grain: 0.48, spice: 0.62, ivory: 0.66 },
    demand: { wine: 1.34, weapon: 1.34, glass: 1.30 },
    blurb: '나일의 밀과 홍해의 향신료가 쌓이는 항구. 등대 자리엔 이제 요새가 섰다.',
  },
};

/* 지리(map/geo.js) + 경제(위) 를 합쳐 읽는 쪽이 쓰던 모양 그대로 돌려준다.
   한쪽에만 도시를 추가하면 조용히 어긋나므로 시작할 때 경고를 띄운다. */
export const CITIES = CITY_GEO.map((geo) => {
  const t = CITY_TRADE[geo.id];
  if (!t) console.warn(`[data] '${geo.id}': 경제 설정(CITY_TRADE)이 없다 — 아무것도 안 나고 안 사는 항구가 된다.`);
  return { ...geo, supply: t?.supply ?? {}, demand: t?.demand ?? {}, blurb: t?.blurb ?? '' };
});

for (const id of Object.keys(CITY_TRADE)) {
  if (!GEO_BY_ID[id]) console.warn(`[data] '${id}': 지리 설정(map/geo.js)이 없다 — 지도에 나타나지 않는다.`);
}

export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c]));

/* 선박.
   origin      어느 나라에서 나온 배인가(표시용).
   originFlag  그 나라 깃발(map/geo.js: flag). **그 깃발을 단 항구는 요구등급이 1 낮다** —
               "제 나라 배는 짓기 쉽다". 지중해에 본국이 없는 배(플류트 등)는 null.
   tier        지으려면 필요한 도시 공업력(map/geo.js: industry). 0이면 시중에 안 나온다.
               예전에는 `yards`에 판매 항구를 하드코딩했으나, 도시를 늘릴 때마다 어긋나고
               "왜 여기선 못 사나"가 설명되지 않았다. 지금은 공업력 수치로 푼다.
   yards       **전통 조선지** — 살 수 있는 곳이 아니라 값이 싸지는 곳이다(그 배를 오래 지어온 항구).
   era         'classic' = 이 바다에서 오래 쓰던 배. 낡았어도 값이 싸고 제 몫이 있다.
               'modern'  = 시대를 앞선 배. 공업력만으로는 안 되고 `requires`를 거쳐야 열린다.
   requires    이 선종을 **한 번이라도 몰아 봤어야** 다음 배를 짓는다. 조선소가 그냥 만들어 주는 게
               아니라 "그런 배를 다뤄 본 선주에게만 내놓는다"는 규칙 — 배 계보가 곧 해금 트리다.
   rig = 스퀘어리그 비율(0=라틴세일뿐 … 1=전부 가로돛). 순풍/역풍 성능을 가른다.
     그림의 돛(`sprites/ship.js: HULLS[].masts[].sail`)과 **같이 고쳐야 한다**.
     지중해 어디서나 같은 배를 사던 것을 국적별로 갈랐다 — 배를 사려면 그 나라 항구까지 가야 한다.
   crewMin = 돛과 키를 다루는 데 필요한 최소 인원. 미달이면 배가 제 속력을 못 낸다.
     플류트처럼 "적은 선원으로 많이 싣는" 배와 프리깃처럼 "사람을 많이 먹는" 배를 가르는 축.
   upkeep = 정박해 두기만 해도 나가는 하루 유지비(선단). 배를 쟁여두는 데 값을 매긴다. */
export const SHIPS = {
  hulk: {
    hull: 'hulk', name: '낡은 바사', origin: '출처 불명', originFlag: null, tier: 0, era: 'classic', yards: [], price: 320,
    hp: 55, crew: 10, crewMax: 16, crewMin: 5, cargo: 45, guns: 2, speed: 0.85,
    upkeep: 2, rig: 0.50, leak: 2, tint: 'rot',
    desc: '물이 새는 중고선. 항해할 때마다 선체가 삭는다. 오래 탈 배가 아니다.',
  },
  cocca: {
    hull: 'hulk', name: '코카', origin: '지중해', originFlag: null, tier: 1, era: 'classic',
    yards: ['venezia', 'genova', 'napoli', 'palermo', 'athens'],
    price: 1100,
    hp: 72, crew: 12, crewMax: 22, crewMin: 6, cargo: 78, guns: 3, speed: 0.95,
    upkeep: 4, rig: 0.50, tint: 'oak',
    desc: '중세부터 지중해를 메운 원형 상선. 느리고 볼품없지만 값싸고 제법 싣는다. 첫 배를 갈아탈 자리.',
  },
  galley: {
    hull: 'galley', name: '갤리', origin: '지중해', originFlag: null, tier: 1, era: 'classic',
    yards: ['venezia', 'istanbul', 'barcelona', 'palermo'],
    price: 2100,
    hp: 105, crew: 58, crewMax: 96, crewMin: 36, cargo: 58, guns: 5, speed: 1.45,
    upkeep: 11, rig: 0.00, tint: 'oak',
    desc: '노와 라틴세일. 바람이 죽어도 나아가고 좁은 물목에서 빠르지만, 사람을 많이 먹고 짐은 적게 싣는다.',
  },
  caravel: {
    hull: 'caravel', name: '카라벨', origin: '스페인(아라곤)', originFlag: 'spain', tier: 1, era: 'classic',
    yards: ['barcelona', 'palermo', 'napoli'],
    price: 1400,
    hp: 90, crew: 24, crewMax: 34, crewMin: 12, cargo: 90, guns: 6, speed: 1.35,
    upkeep: 6, rig: 0.00, tint: 'oak',
    desc: '작고 날렵하다. 화물칸은 좁지만 바람을 잘 탄다.',
  },
  fluyt: {
    hull: 'fluyt', name: '플류트', origin: '네덜란드(수입선)', originFlag: null, tier: 2, era: 'modern', requires: 'carrack',
    yards: ['genova', 'marseille'],
    price: 2600,
    hp: 120, crew: 20, crewMax: 30, crewMin: 14, cargo: 170, guns: 6, speed: 1.10,
    upkeep: 10, rig: 0.67, tint: 'oak',
    desc: '화물선의 정석. 이만한 짐을 이만큼 적은 선원으로 나르는 배는 없다. 대신 포문이 빈약하다.',
  },
  brig: {
    hull: 'brig', name: '브리간틴', origin: '지중해', originFlag: null, tier: 1, era: 'classic',
    yards: ['marseille', 'palermo', 'rodos'],
    price: 4200,
    hp: 130, crew: 34, crewMax: 52, crewMin: 20, cargo: 140, guns: 10, speed: 1.20,
    upkeep: 14, rig: 0.50, tint: 'dark',
    desc: '균형 잡힌 중형선. 무역과 전투 어느 쪽도 무난하다.',
  },
  carrack: {
    hull: 'carrack', name: '캐랙', origin: '제노바', originFlag: 'genoa', tier: 2, era: 'classic',
    yards: ['genova', 'venezia'],
    price: 9800,
    hp: 190, crew: 48, crewMax: 76, crewMin: 30, cargo: 240, guns: 14, speed: 0.95,
    upkeep: 22, rig: 0.67, tint: 'white',
    desc: '거대한 화물칸. 느리지만 한 번에 많이 싣는다.',
  },
  frigate: {
    hull: 'frigate', name: '갈레아스', origin: '베네치아', originFlag: 'venice', tier: 3, era: 'classic', requires: 'galley',
    yards: ['venezia', 'genova'],
    price: 14000,
    hp: 210, crew: 50, crewMax: 90, crewMin: 45, cargo: 110, guns: 18, speed: 1.40,
    upkeep: 30, rig: 1.00, tint: 'dark',
    desc: '작정하고 만든 프리깃 킬러. 빠르고 사납지만 화물칸이 좁고 선원을 많이 먹는다.',
  },
  galleon: {
    hull: 'galleon', name: '갈레온', origin: '스페인', originFlag: 'spain', tier: 3, era: 'classic', requires: 'carrack',
    yards: ['barcelona', 'napoli'],
    price: 19500,
    hp: 260, crew: 62, crewMax: 100, crewMin: 46, cargo: 200, guns: 24, speed: 1.05,
    upkeep: 40, rig: 0.67, tint: 'green',
    desc: '떠다니는 요새. 포문 스물넷이 현측을 메운다.',
  },
  indiaman: {
    hull: 'indiaman', name: '라구사 아르고시', origin: '라구사', originFlag: null, tier: 3, era: 'modern', requires: 'carrack',
    yards: ['venezia', 'istanbul'],
    price: 26000,
    hp: 240, crew: 70, crewMax: 110, crewMin: 40, cargo: 320, guns: 20, speed: 1.00,
    upkeep: 46, rig: 0.75, tint: 'white',
    desc: '동인도 항로의 대형 상선. 상선인데도 어지간한 군함만큼 물린다.',
  },
  superfrigate: {
    hull: 'superfrigate', name: '대형 갈레온', origin: '스페인', originFlag: 'spain', tier: 3, era: 'modern', requires: 'galleon',
    yards: ['barcelona', 'marseille'],
    price: 42000,
    hp: 330, crew: 90, crewMax: 150, crewMin: 70, cargo: 150, guns: 30, speed: 1.30,
    upkeep: 70, rig: 1.00, tint: 'dark',
    desc: '전열함의 화력에 프리깃의 발을 달았다. 유지비가 무겁다.',
  },
};

/* 개장 — 배 한 척에 영구히 붙는다. 배마다 따로 관리(state.fleet[key].refits) */
export const REFITS = {
  copper: {
    name: '동판 선저', price: 1800,
    desc: '흘수선 아래를 구리로 싼다. 따개비가 붙지 않아 발이 빨라진다.',
    effect: '속력 +8%',
  },
  oakArmor: {
    name: '떡갈나무 장갑', price: 2400,
    desc: '현측에 24인치 떡갈나무를 덧댄다. 포탄이 관통하지 못한다.',
    effect: '선체 최대치 +25%',
  },
  sails: {
    name: '돛 증축', price: 1500,
    desc: '보조돛을 더 단다. 바람을 더 먹으니 따돌리기 쉬워진다.',
    effect: '도주 +14%p · 속력 +5%',
  },
  frames: {
    name: '내포격 골조', price: 1600,
    desc: '내부 골조를 촘촘히 넣는다. 파편이 갑판까지 튀지 않는다.',
    effect: '피격 시 선원 사상 −45%',
  },
  bulkhead: {
    name: '4부 격실', price: 2800,
    desc: '선창을 네 구획으로 나눠 침수를 가둔다. 한 번은 가라앉지 않는다.',
    effect: '격침 직전 1회 버팀',
  },
  razee: {
    name: '레이지 개조', price: 3600,
    desc: '상갑판을 통째로 깎아낸다. 포문을 잃는 대신 배가 가벼워진다.',
    effect: '속력 +15% · 포문 상한 −25% · 선체 −10%',
  },
};
export const REFIT_KEYS = Object.keys(REFITS);

/* 포탄 — 포격할 때 무엇을 쟁여 넣을지.
   일반탄은 무한, 나머지는 조선소에서 사 둔 재고를 한 발씩 소모한다. */
export const SHOTS = {
  round: {
    id: 'round', name: '일반탄', price: 0, dmg: 1.0, crew: 1.0, sail: 0, fire: 0,
    desc: '선체를 부순다. 화약고에 늘 쌓여 있다.',
  },
  grape: {
    id: 'grape', name: '포도탄', price: 90, dmg: 0.45, crew: 3.4, sail: 0, fire: 0,
    desc: '작은 탄을 뭉쳐 쏜다. 갑판을 쓸어 선원을 죽인다 — 백병전 전에 머릿수를 깎는 탄.',
  },
  chain: {
    id: 'chain', name: '사슬탄', price: 110, dmg: 0.35, crew: 0.6, sail: 22, fire: 0,
    desc: '사슬로 이은 두 덩이가 돛과 삭구를 찢는다. 적의 발을 묶어 도망치지 못하게 한다.',
  },
  heated: {
    id: 'heated', name: '가열탄', price: 170, dmg: 0.80, crew: 1.0, sail: 8, fire: 3,
    desc: '붉게 달군 탄. 박히면 불이 붙어 몇 턴이고 타들어간다.',
  },
};
export const SHOT_KEYS = ['round', 'grape', 'chain', 'heated'];

/* 대포 — 포문 하나에 얹는 무장.
   dmg는 피해 배율, aim은 조준 판정대 폭 배율.
   near~far는 **잘 맞는 거리 구간**. 이 밖으로 나가면 조준이 급격히 무너진다
   (state.js: zoneFactor). 장포는 포신이 길어 코앞의 배를 겨누지 못한다. */
export const CANNONS = {
  light:  { id: 'light',  name: '경포', price: 240, dmg: 0.95, aim: 1.22, near: 0,  far: 40,
            desc: '가볍고 다루기 쉽다. 접현해서 두들길 때 가장 세다.' },
  medium: { id: 'medium', name: '중포', price: 420, dmg: 1.15, aim: 1.00, near: 0,  far: 70,
            desc: '표준 함포. 어느 거리에서도 무난하게 맞는다.' },
  long:   { id: 'long',   name: '장포', price: 720, dmg: 1.38, aim: 0.80, near: 35, far: 100,
            desc: '긴 포신. 거리를 두고 싸울 때 강하지만 근접에서는 못 겨눈다.' },
};
export const CANNON_KEYS = ['light', 'medium', 'long'];
export const CANNON_REFUND = 0.5;   // 철거 시 환불 비율

/* 백병전 병종 — 공격/방어/사거리.
   hire가 있는 병종만 조선소 선원 탭에서 갑판 슬롯에 배치할 수 있다. */
export const TROOPS = {
  sailor:    { atk: 6,  def: 4,  hp: 16, name: '선원',     hire: 0,
               desc: '기본 승조원. 값은 안 들지만 갑판에서는 약하다.' },
  swordsman: { atk: 11, def: 9,  hp: 24, name: '검병',     hire: 320,
               desc: '단단하다. 전열이 무너지는 것을 막는다.' },
  pikeman:   { atk: 13, def: 6,  hp: 20, name: '창병',     hire: 300,
               desc: '긴 창으로 먼저 찌른다. 공수 균형형.' },
  musketeer: { atk: 16, def: 3,  hp: 15, name: '총병',     hire: 480,
               desc: '화력 최고. 맞으면 바로 쓰러진다.' },
  crossbow:  { atk: 12, def: 4,  hp: 16, name: '석궁병',   hire: 360,
               desc: '무난한 사격 병종. 총병보다 싸다.' },
  gunner:    { atk: 8,  def: 5,  hp: 18, name: '포수',     hire: 260,
               desc: '포격에 익숙하다. 갑판에서는 평범하다.' },
  corsair:   { atk: 14, def: 6,  hp: 22, name: '코르세어', hire: 560,
               desc: '바르바리 해안의 백병 전문가. 비싸다.' },
  captain:   { atk: 20, def: 12, hp: 40, name: '선장' },
  pirate:    { atk: 10, def: 4,  hp: 18, name: '해적' },
};

/** 조선소에서 고용 가능한 병종 (선장·해적 제외) */
export const RECRUITS = ['sailor', 'gunner', 'pikeman', 'swordsman', 'crossbow', 'musketeer', 'corsair'];
export const TROOP_REFUND = 0.5;    // 슬롯 교체 시 기존 병종 환불 비율
export const MELEE_SLOTS = 6;       // 선장 1 + 배치 5

/* 적 함선.
   nation = 어느 깃발을 달고 나오나. prize = 나포했을 때 선단에 들어오는 선종
   (없으면 부술 수만 있는 배다). */
export const ENEMIES = [
  {
    id: 'raider', name: '해적 소함', nation: '해적', hull: 'brig', tint: 'dark', flag: 'pirate',
    hp: 80, guns: 6, crew: 22, level: 1, prize: 'brig',
    troops: ['pirate', 'pirate', 'sailor', 'pirate'],
    loot: { gold: [180, 420], goods: ['salt', 'wine', 'grain'] },
  },
  {
    id: 'corsair', name: '바르바리 코르세어', nation: '바르바리', hull: 'galley', tint: 'oak', flag: 'pirate',
    hp: 110, guns: 5, crew: 34, level: 2, prize: null,
    troops: ['corsair', 'corsair', 'pirate', 'crossbow', 'corsair'],
    loot: { gold: [420, 900], goods: ['ivory', 'spice', 'salt'] },
  },
  {
    id: 'blackflag', name: '검은 깃발단', nation: '해적', hull: 'carrack', tint: 'dark', flag: 'pirate',
    hp: 175, guns: 12, crew: 48, level: 3, prize: 'carrack',
    troops: ['pirate', 'musketeer', 'corsair', 'swordsman', 'pirate', 'captain'],
    loot: { gold: [900, 1900], goods: ['silk', 'gold', 'spice', 'ivory'] },
  },
  {
    id: 'patrol', name: '프랑스 순찰 프리깃 팡당', nation: '프랑스', hull: 'frigate', tint: 'white', flag: 'france',
    hp: 240, guns: 20, crew: 90, level: 4, prize: 'frigate',
    troops: ['musketeer', 'swordsman', 'musketeer', 'pikeman', 'swordsman', 'captain'],
    loot: { gold: [1800, 3400], goods: ['wine', 'weapon', 'glass', 'silk'] },
  },
  {
    id: 'flagship', name: '바르바리 기함 알 사파', nation: '바르바리', hull: 'galleon', tint: 'green', flag: 'ottoman',
    hp: 360, guns: 30, crew: 130, level: 5, prize: 'galleon',
    troops: ['corsair', 'musketeer', 'corsair', 'swordsman', 'corsair', 'captain'],
    loot: { gold: [3600, 7200], goods: ['gold', 'ivory', 'spice', 'silk'] },
  },
];

/* ── 부관 ─────────────────────────────────────────────────────
   이 바다에서 이름을 가진 사람은 선장과 에이미 둘뿐이다. 부관은 **오직 한 명**이며
   갈아 끼우는 부품이 아니다(그래서 목록이 아니라 상수다).

   설계의 축은 "쓸모와 대가가 같은 화폐로 매겨진다"는 것 —
   에이미는 항해술도 검술도 손대지 않고 **오직 돈만** 만진다. 값을 깎고 세금을 줄이고
   장부를 맞추는 대신, 벌어들인 이익에서 제 몫을 떼 간다. 그래서 거래가 작으면 손해고
   커질수록 남는다. 후반 금화가 갈 곳이 없다는 문제와 "부관을 언제 쓰나"가 한 장치로 풀린다.

   등장 조건도 성격에서 나온다 — 물 새는 배를 모는 선장에게는 오지 않는다. */
export const OFFICER = {
  id: 'amy',
  name: '에이미',
  title: '부선장',
  sprite: 'amy',                 // sprites/char.js: UNITS.amy
  home: 'venezia',               // 여기 상관에 앉아 있다 — 한 명뿐이니 만나는 자리도 하나여야 한다
  origin: '베네치아 리알토의 상관 서기 출신',
  blurb: '장부를 손에서 놓지 않는다. 셈이 밝고 값을 깎는 데 망설임이 없다.',

  fee: 1800,                     // 계약금(일시불)

  /* 보수는 두 갈래다 — **동업자이지 하인이 아니다.**
       wage 고정 급여(1일). 벌든 못 벌든 나간다. 이것이 "월급을 받는다"는 쪽이고,
                 배가 놀아도 나가므로 데리고 있으려면 규모가 받쳐줘야 한다.
       cut  성과 배분. 잘 벌면 그만큼 더 가져간다 — 이쪽이 "동업"이다.
     성과급만 두면 못 버는 달에 한 푼도 안 나가 고용인만도 못한 대우가 되고,
     급여만 두면 잘 벌어도 몫이 그대로라 동업이 아니다. 둘 다 있어야 관계가 성립한다.

     선원 일당이 2.4닢이므로 16닢은 선원 예닐곱 몫 — 선장의 오른팔값으로 무겁지만 터무니없지 않다.
     90항차(278일) 기준 급여 4,448 + 성과급 11,401 = **15,849닢**을 가져간다(계약금 별도). */
  wage: 16,
  /* 성과급 — 능력(아래 perks)·급여와 **한 묶음으로** 맞춘 값이라 하나만 건드리면 균형이 깨진다.
     같은 시드로 짝지어(paired) 90항차를 돌린 결과(총자산 증감 · 40쌍 승률):
       cut 18% · 압력감면 15% · 급여  0 →   0.0% ( 7/20)   ← 고용할 이유가 없다
       cut 12% · 압력감면 22% · 급여  0 → +14.0% (24/40)   ← 급여 없던 시절의 채택값
       cut  8% · 압력감면 22% · 급여 16 → +21.1% (26/40)   ← 너무 후하다
       cut 11% · 압력감면 22% · 급여 16 → +15.7% (27/40)   ← 채택
     승률 6할이 노림수다 — 대체로 이득이지만 거래가 작은 판에서는 밑진다.

     ★ 급여와 성과급은 총액이 같아도 효과가 다르다. 성과급만 12%였을 때와 총 부담이
       비슷하도록 8%+급여16으로 짰더니 순효과가 +14%→+21%로 **올라갔다** —
       성과급은 잘 벌 때 더 떼므로 성장기 재투자 자본을 깎아 복리로 아프고,
       급여는 고정이라 규모가 커질수록 상대적으로 가벼워지기 때문이다.
       그래서 "총액을 맞췄으니 균형도 같겠지"가 성립하지 않는다.
     ★ 재측정할 때는 반드시 **같은 시드로 짝지어** 비교할 것. 그냥 두 번 돌리면
       배 구입 타이밍 때문에 기준선이 25%씩 튀어 부호가 뒤집힌다(실제로 겪었다). */
  cut: 0.11,
  severance: 0.30,               // 내보낼 때 계약금의 이만큼을 얹어 준다

  /* 능력 — 전부 '돈'에 관한 것이다. 폭풍을 잠재우거나 적을 베지 않는다. */
  perks: {
    tariffOff:  0.35,   // 입항세 −35%   (서류를 꼼꼼히 갖춰 감면을 받아낸다)
    // 압력 감면은 매 항차 복리로 쌓여 단일 항목 중 가장 세다 — 여기를 먼저 의심할 것
    impactOff:  0.22,   // 시장 압력 −22% (한 번에 밀어 넣지 않고 나눠 넘긴다)
    contractUp: 0.12,   // 계약 보수 +12% (계약서의 독소 조항을 짚는다)
    salvageUp:  0.50,   // 표류물 +50%    (건질 것과 버릴 것을 셈해 고른다)
    haggleOff:  0.15,   // 해상 흥정가 −15% (뱃전에서도 값을 깎는다)
  },

  /* 대사 — 상황마다 한 줄. 서사는 이 정도로 가볍게 둔다. */
  lines: {
    greet:    '“급료는 정확히 받겠습니다. 대신 그보다 많이 벌어 드리죠 — 그게 제 일이니까요.”',
    hire:     '“계약서는 제가 씁니다. 동업이라면 셈이 분명해야 오래 갑니다.”',
    poor:     '“선장님. 저 배로는 제 급료도 안 나옵니다. 배부터 바꾸시죠.”',
    dismiss:  '“섭섭하네요. 장부는 정리해 두었습니다 — 마지막까지 정확하게.”',
    storm:    '“짐부터 묶으세요! 젖으면 값이 반이 됩니다!”',
    salvage:  '“이건 값이 나가고, 저건 버리세요. 뒤엉킨 것부터 풀면 됩니다.”',
    merchant: '“그 값엔 못 삽니다. 다음 항구까지 못 버틸 물건이잖아요.”',
    pirate:   '“금고는 제가 안고 있겠습니다. 뺏기면 제 몫도 날아가니까요.”',
    tariff:   '“세관 서류는 맞춰 뒀습니다. 이번엔 덜 뗄 거예요.”',
  },
};

/* 해상 이벤트 가중치 */
export const SEA_EVENTS = [
  { id: 'calm',     weight: 40, name: '순조로운 항해' },
  { id: 'wind',     weight: 11, name: '순풍' },
  { id: 'storm',    weight: 12, name: '폭풍' },
  { id: 'drift',    weight: 7,  name: '표류물 발견' },
  { id: 'merchant', weight: 12, name: '상선 조우' },
  { id: 'pirate',   weight: 18, name: '해적 조우' },
];
