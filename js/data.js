// data.js — 교역품 / 도시 경제 / 선박 / 적 정의
//
// ★ 도시의 **지리**(좌표·항로·해류·깃발·규모)는 `js/map/geo.js`에 있다.
//   여기에는 그 도시가 무엇을 싸게 내놓고 무엇을 비싸게 사는지(경제)만 둔다.
//   지도를 손보는 사람과 경제를 조율하는 사람이 같은 줄에서 충돌하지 않게 가른 것이다.
//   `CITIES`는 둘을 id로 맞물려 합성한 결과다 — 읽는 쪽 코드는 예전과 똑같이 쓰면 된다.

import { CITY_GEO, GEO_BY_ID, ROUTES, CURRENTS, ROUTE_RISK, riskKey } from './map/geo.js';

export { ROUTES, CURRENTS, ROUTE_RISK, riskKey };

export const GOODS = [
  { id: 'grain',    name: '곡물',     base: 20,  icon: 'grain',    bulk: 1 },
  { id: 'salt',     name: '소금',     base: 48,  icon: 'salt',     bulk: 1 },
  { id: 'oliveoil', name: '올리브유', base: 52,  icon: 'oliveoil', bulk: 1 },
  { id: 'wine',     name: '와인',     base: 38,  icon: 'wine',     bulk: 1 },
  { id: 'ceramic',  name: '도자기',   base: 130, icon: 'ceramic',  bulk: 1 },
  { id: 'fur',      name: '모피',     base: 175, icon: 'fur',      bulk: 1 },
  { id: 'glass',    name: '유리세공', base: 190, icon: 'glass',    bulk: 1 },
  { id: 'weapon',   name: '무기',     base: 165, icon: 'weapon',   bulk: 1 },
  { id: 'spice',    name: '향신료',   base: 330, icon: 'spice',    bulk: 1 },
  { id: 'ivory',    name: '상아',     base: 300, icon: 'ivory',    bulk: 1 },
  { id: 'silk',     name: '비단',     base: 420, icon: 'silk',     bulk: 1 },
  { id: 'gold',     name: '금괴',     base: 700, icon: 'gold',     bulk: 1 },
];

export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g]));

/* 시장 깊이 — 한 항구가 한 번에 소화할 수 있는 물량에는 한계가 있다.
   많이 살수록 비싸게 사고 많이 팔수록 싸게 판다. 그 항구·품목의 최근 거래량(압력)이
   누적되므로 나눠 팔아도 피하지 못하고, 날이 지나면 시장이 회복한다.
   이 장치가 없으면 "화물칸을 통째로 사서 통째로 판다"가 항상 최적이라 돈이 너무 쉽게 불어난다. */
export const MARKET = {
  depthPerSize: 45,  // 항구가 소화하는 물량 = 이 값 × 도시 size (큰 항구일수록 깊다)
  impact: 0.36,      // 깊이만큼 밀어 넣었을 때 단가가 이만큼 불리해진다
  cap: 0.50,         // 아무리 밀어 넣어도 이 이상은 안 나빠진다
  decay: 0.68,       // 하루가 지나면 압력이 이만큼 남는다 (낮을수록 시장이 빨리 회복한다)
  /* ★ cap 0.35는 대형선을 못 막았다. 320칸짜리 아르고시가 한 항구에 화물을 통째로
     쏟아부어도 단가가 35%밖에 안 밀려, 배를 키울수록 수익이 가속했다(90항차 실측 +80%).
     한 항구가 하루에 소화할 수 있는 물량에는 한계가 있다는 것이 경제적으로도 맞다.
     초반 소량 거래에는 거의 걸리지 않으므로 **성장할수록만 무거워지는** 브레이크다. */
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
  // 교역품 기준가를 사료 비율로 올리면서(평균 ×1.23) 함께 올렸다 — 안 올리면
  // 계약이 시세 거래보다 초라해져 "한 건을 크게 무는 길"이 죽는다.
  value: [1100, 4900],    // 목표 보수 — 도시 size로 스케일된다(작은 항구는 작은 일감)
  qty: [5, 64],           // 역산한 수량의 상하한 (화물칸을 넘는 일감도 있어야 큰 배가 값어치를 한다)
  payMul: [1.22, 1.42],   // 목적지 시세 대비 보수 배율 (관세도 안 뗀다)
  advance: 0.25,          // 선금 비율 (나머지는 납품할 때)
  daysPad: [4, 10],       // 편도 일수 × 1.6 + 이만큼이 기한
  // 위약금은 **선금보다 커야 한다**. 0.5로 뒀더니 선금만 받고 파기하는 것이
  // 순이득이 됐다(선금 6,896 − 위약금 3,448 = +3,448). 지금은 받은 것을 다 토하고 더 문다.
  penalty: 1.25,
};

/* ── 입항세 ────────────────────────────────────────────────────
   파는 쪽에만 붙는다. 큰 항구일수록 시세는 좋지만 떼 가는 몫도 크다.

   두 겹이다:
     TARIFF        도시 `size`로 정해지는 **기본율**. 도시를 추가해도 저절로 정해진다.
     CITY_TARIFF   그 도시만의 **오버라이드**. 사료가 특별히 말하는 항구에만 적는다.

   ★ 오버라이드를 비워 두면 기본율이 그대로 쓰인다 — 그러니 여기 없는 도시가
     "빠진 것"이 아니다. 관세가 도시 성격의 일부인 곳만 적는 자리다.
   ★ 값을 적었으면 `content/city-evidence.json`의 `cities[id].tariff`에도
     같은 값과 근거를 적는다(`node tools/check-evidence.mjs`가 불일치를 실패시킨다). */
export const TARIFF = { 1: 0.03, 2: 0.045, 3: 0.06 };

export const CITY_TARIFF = {
  // 맘루크는 유럽 상인에게 무거운 세를 물렸고 향신료에는 특히 그랬다. 게임은
  // **매각에만** 물어 사료의 10~20%를 그대로 옮기면 이 항구가 통째로 죽는다 —
  // 성격이 드러날 만큼만 올린다. 근거·판정은 city-evidence.json에.
  alexandria: 0.085,
  // 카피툴레이션으로 유럽 상인에게 정률 관세를 물린 것이 오스만의 방식이다.
  // 수도라 규모는 크지만 세율 자체는 맘루크만큼 무겁지 않았다.
  istanbul: 0.07,
  // 자유항에 가까웠다 — 제노바는 상인의 도시였고 통과 무역을 막지 않았다.
  genova: 0.045,
};

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
  malta: {
    // 바위섬이라 자급이 안 된다 — 곡물은 시칠리아에서 상시 수입했고, 그것이 이 섬의
    // 항구적 약점이자 봉쇄에 취약한 이유였다. 내놓을 것은 고조의 염전 소금 정도.
    // **나포품(비단·향신료) 재판매를 supply로 넣지 않았다** — 넣으면 산지보다 싼
    // 향신료 창구가 생겨 경제가 통째로 여기로 쏠린다. 그 성격은 prizeYard(중고선)로만 준다.
    supply: { salt: 0.60 },
    demand: { grain: 1.44, wine: 1.22, weapon: 1.26 },
    blurb: '해협 한복판의 바위섬. 곡물은 실어 와야 하고, 부두에는 나포선이 매물로 선다.',
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
    // crewMin 14→9: 플류트의 역사적 정체성이 바로 이 숫자다. 화물톤/승조원 1인이
    // 사료로 20 안팎(코카 10·갤리 1.2)인데 14명이면 12.1이 되어 **코카(13.0)와 사실상 같아진다**.
    // 9명이면 18.9로 밴드에 들고, "적은 선원으로 많이 싣는 배"가 비용에서 실제로 드러난다.
    // → .claude/docs/wiki/research-voyage-returns.md §3-1
    hp: 120, crew: 20, crewMax: 30, crewMin: 9, cargo: 170, guns: 6, speed: 1.10,
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
  home: 'venezia',               // 출신지. 시작 항구와 같다 — 여기서부터 함께 떠난다
  origin: '베네치아 리알토의 상관 서기 출신',
  blurb: '장부를 손에서 놓지 않는다. 셈이 밝고 값을 깎는 데 망설임이 없다.',

  /* ★ 에이미는 **등용하는 인물이 아니다.** 첫 화면부터 이미 배에 타고 있다.
     고를 수 있는 선택지가 아니라 **주어진 동행**이다 — 선장 다음가는 인물이고,
     물 새는 바사를 몰던 시절부터 같이 굶는다. 그래서 계약금도 면접도 없고,
     내보낼 수도 없다(관계가 아니라 거래가 되어 버린다).
     대신 급여는 첫날부터 나간다 — 함께 간다는 것이 공짜라는 뜻은 아니다. */

  /* 보수는 두 갈래다 — **동업자이지 하인이 아니다.**
       wage 고정 급여(1일). 벌든 못 벌든 나간다. 이것이 "월급을 받는다"는 쪽이고,
                 배가 놀아도 나가므로 데리고 있으려면 규모가 받쳐줘야 한다.
       cut  성과 배분. 잘 벌면 그만큼 더 가져간다 — 이쪽이 "동업"이다.
     성과급만 두면 못 버는 달에 한 푼도 안 나가 고용인만도 못한 대우가 되고,
     급여만 두면 잘 벌어도 몫이 그대로라 동업이 아니다. 둘 다 있어야 관계가 성립한다.

     선원 일당이 2.4닢이므로 16닢은 선원 예닐곱 몫 — 선장의 오른팔값으로 무겁지만 터무니없지 않다.
     90항차(278일) 기준 급여 4,448 + 성과급 11,401 = **15,849닢**을 가져간다. */
  wage: 2.6,
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
       배 구입 타이밍 때문에 기준선이 25%씩 튀어 부호가 뒤집힌다(실제로 겪었다).
     ★ 자동 동행으로 바꾸면서 전제가 무너져 **재측정했다.** 위 표는 "중반에 계약금 1,800을
       내고 고용한다"를 가정한 값이다. 지금은 계약금이 없고 급여가 1일차부터 나간다.
       같은 시드 40쌍(부관있음 − 부관없음, 중앙값 / 승률):
          3항차   −178닢 ( 0/40)
          5항차   −322닢 ( 0/40)
         10항차 −1,204닢 ( 1/40)   ← 코카 한 척 값보다 크다
         20항차 +1,421닢 (24/35)
         45항차   −712닢 (13/31)   ← 배 구입 타이밍 때문에 흔들리는 구간
         90항차/최종 +11,497닢 (33/40)
       읽는 법: **초반 10항차는 예외 없이 손해**고(급여가 고정인데 벌이가 없다),
       20항차부터 뒤집혀 후반에는 확실히 이득이다. 이것은 버그가 아니라 지금의 설계다 —
       "같이 굶다가 같이 번다". 초반이 너무 가혹하다고 판단되면 wage를 낮추지 말고
       **가난할 때 급여를 미루는 규칙**을 넣는 편이 서사와 맞는다(미구현). */
  cut: 0.11,

  /* 능력 — 전부 '돈'에 관한 것이다. 폭풍을 잠재우거나 적을 베지 않는다. */
  perks: {
    tariffOff:  0.35,   // 입항세 −35%   (서류를 꼼꼼히 갖춰 감면을 받아낸다)
    // 압력 감면은 매 항차 복리로 쌓여 단일 항목 중 가장 세다 — 여기를 먼저 의심할 것
    impactOff:  0.22,   // 시장 압력 −22% (한 번에 밀어 넣지 않고 나눠 넘긴다)
    contractUp: 0.12,   // 계약 보수 +12% (계약서의 독소 조항을 짚는다)
    salvageUp:  0.50,   // 표류물 +50%    (건질 것과 버릴 것을 셈해 고른다)
    haggleOff:  0.15,   // 해상 흥정가 −15% (뱃전에서도 값을 깎는다)
  },

  /* 대사 — 상황마다 한 줄. 서사는 이 정도로 가볍게 둔다.
     등용·해고 대사는 없다. 만나는 장면도 헤어지는 장면도 없기 때문이다. */
  lines: {
    // 첫 화면에서 한 번. 이 인물이 왜 여기 있는지를 이 한 줄로 끝낸다
    start:    '“배는 낡았고 금고는 가볍네요. …그래도 장부는 제가 맡죠. 어차피 같이 굶을 테니까.”',
    // 물 새는 배를 몰고 있을 때 항구에서. 떠나겠다는 말이 아니라 재촉이다
    leaky:    '“이 배로 얼마나 더 버틸 생각이세요. 다음 항구에서는 꼭 바꾸시죠.”',
    storm:    '“짐부터 묶으세요! 젖으면 값이 반이 됩니다!”',
    salvage:  '“이건 값이 나가고, 저건 버리세요. 뒤엉킨 것부터 풀면 됩니다.”',
    merchant: '“그 값엔 못 삽니다. 다음 항구까지 못 버틸 물건이잖아요.”',
    pirate:   '“금고는 제가 안고 있겠습니다. 뺏기면 제 몫도 날아가니까요.”',
    tariff:   '“세관 서류는 맞춰 뒀습니다. 이번엔 덜 뗄 거예요.”',
  },
};

/* ── 술집 ─────────────────────────────────────────────────────
   **선원은 부두에서 버튼으로 사는 물건이 아니다.** 첫 화면에서 선장은 배만 있고
   사람이 없다 — 술집에 들어가 자리를 돌며 무리를 모아야 배가 움직인다.

   자리에 앉은 것은 개인이 아니라 **무리(패거리)**다. 같이 배를 타 온 몇이 함께
   움직이므로 통째로 데려가거나 통째로 보낸다. 개인을 낱개로 세면 화면이 명부가 되고,
   무리로 두면 "어느 패를 태울 것인가"라는 판단이 남는다.

   자리마다 값이 두 갈래인 것이 핵심이다:
     · advance 계약금 — **지금 당장** 나간다. 초반 금고를 직접 때린다.
     · wage     요구 일당 — 항해하는 내내 따라온다. 싸게 태운 대가는 뒤에 온다.
   싼 무리는 계약금도 일당도 낮지만 갑판에서 쓸모가 없고 쉽게 토라진다.
   비싼 무리는 그 반대다 — "지금 아낄 것인가 나중에 아낄 것인가"가 매 자리마다 걸린다. */
export const TAVERN = {
  cycle: 2,          // 며칠마다 사람이 갈리나 (매물보다 빠르다 — 술집은 하루가 다르다)
  slots: [2, 5],     // 자리 수 — 도시 size로 스케일된다(큰 항구일수록 사람이 많다)
  band: [2, 6],      // 한 무리의 인원
  emptyOdds: 0.22,   // 빈 자리가 나올 확률 (늘 만원이면 고를 맛이 없다)

  /* 계약금 기준(1인당). 부두 고용(HIRE_UNIT 55닢)보다 **훨씬 싸다** —
     제 발로 배를 찾아온 사람들이기 때문이다. 대신 값은 일당으로 돌아온다.

     ★ 이 값은 감이 아니라 **시작 조건에서 역산한 것**이다(tools/test-tavern.mjs가 지킨다).
       금화 150닢으로 최소 인원(낡은 바사 5명)을 태우고도 첫 항차의 항해비와
       화물값이 남아야 한다. 14닢으로 뒀더니 여섯을 태우는 데 92닢이 나가
       남은 58닢으로는 가장 짧은 항로(제노바 2일·41닢)조차 화물을 못 실었다 —
       "아슬아슬"이 아니라 막다른 길이었다. */
  advanceUnit: 8,
};

/* 기질 — 무리의 성격. 임금·백병 실력·다루기 쉬운 정도가 한 묶음으로 움직인다.
     wageMul  요구 일당 배율 (state.js: CREW_WAGE 1.2에 곱한다)
     advMul   계약금 배율
     troop    백병전에서 이 무리가 서는 병종 (data.js: TROOPS)
     temper   다루기 쉬운 정도 0~1 — 높을수록 참을성이 있다.
              **아직 게임 규칙에 쓰이지 않는다**(급여 체불·충성도가 미구현).
              지금은 화면에 성격으로만 드러나고, 월급 정산을 넣을 때 이 값이 임계가 된다.
     weight   술집에 나타나는 빈도 */
export const CREW_TRAITS = {
  green:   { id: 'green',   name: '애송이',   wageMul: 0.70, advMul: 0.70, troop: 'sailor',   temper: 0.55, weight: 20,
             desc: '바다를 처음 본다. 값이 싸고 그만큼 쓸모도 없다.' },
  steady:  { id: 'steady',  name: '성실하다', wageMul: 1.00, advMul: 1.00, troop: 'sailor',   temper: 0.85, weight: 24,
             desc: '시키는 일을 군말 없이 한다. 오래 데리고 있을 만하다.' },
  thrifty: { id: 'thrifty', name: '검소하다', wageMul: 0.82, advMul: 1.15, troop: 'sailor',   temper: 0.75, weight: 14,
             desc: '계약금을 더 부르는 대신 일당을 덜 받는다. 길게 갈수록 이쪽이 싸다.' },
  salty:   { id: 'salty',   name: '노련하다', wageMul: 1.35, advMul: 1.30, troop: 'gunner',   temper: 0.80, weight: 16,
             desc: '뱃밥을 오래 먹었다. 비싸지만 포와 삭구를 안다.' },
  rough:   { id: 'rough',   name: '거칠다',   wageMul: 1.20, advMul: 1.10, troop: 'swordsman', temper: 0.45, weight: 14,
             desc: '싸움에 이골이 났다. 갑판에서는 든든하고 항구에서는 골칫거리다.' },
  corsair: { id: 'corsair', name: '해적 출신', wageMul: 1.50, advMul: 1.45, troop: 'corsair', temper: 0.35, weight: 8,
             desc: '어느 배를 털었는지는 묻지 않는 편이 좋다. 백병전에서 값을 한다.' },
  drunk:   { id: 'drunk',   name: '주정뱅이', wageMul: 0.55, advMul: 0.55, troop: 'sailor',   temper: 0.25, weight: 10,
             desc: '싸다. 아주 싸다. 그럴 만한 이유가 있다.' },
};
export const CREW_TRAIT_KEYS = Object.keys(CREW_TRAITS);

/* 무리 이름 — 깃발(권역)마다 다른 풀에서 뽑는다. 항구를 옮기면 사람이 달라 보이는 것이
   이 게임에서 "다른 바다에 왔다"를 느끼는 가장 싼 방법이다. */
export const CREW_NAMES = {
  latin:   ['조반니 패', '마테오 형제', '루카의 무리', '베르나르도 패', '도메니코 패',
            '피에트로 형제', '안젤로의 무리', '리카르도 패', '살바토레 패', '토마소 형제'],
  iberian: ['디에고 패', '라몬의 무리', '알폰소 형제', '후안 패', '미겔의 무리',
            '파블로 패', '산초 형제', '엔리케의 무리'],
  greek:   ['니콜라오스 패', '스타브로스의 무리', '디미트리 형제', '얀니스 패',
            '테오도로스의 무리', '마놀리스 패', '코스타스 형제'],
  levant:  ['하산 패', '유수프의 무리', '카림 형제', '무라트 패', '이브라힘의 무리',
            '살림 패', '오마르 형제', '라시드의 무리'],
};

/** 깃발 → 이름 풀. 여기 없는 깃발은 latin으로 떨어진다(도시를 늘려도 안 깨진다). */
export const CREW_NAME_POOL = {
  venice: 'latin', genoa: 'latin', france: 'latin',
  spain: 'iberian',
  hospitaller: 'greek',
  ottoman: 'levant', hafsid: 'levant',
};

/* 해상 이벤트 가중치 */
export const SEA_EVENTS = [
  { id: 'calm',     weight: 40, name: '순조로운 항해' },
  { id: 'wind',     weight: 11, name: '순풍' },
  { id: 'storm',    weight: 12, name: '폭풍' },
  { id: 'drift',    weight: 7,  name: '표류물 발견' },
  { id: 'merchant', weight: 12, name: '상선 조우' },
  { id: 'pirate',   weight: 18, name: '해적 조우' },
  /* ── weight 0 = 확률표로는 절대 안 뽑힌다 ──────────────────────
     `rollSeaEvent`가 **육로·내해 구간에서만** 명시적으로 골라 내보내는 항목이다.
     weight를 주면 합 100이 무너져 조우 빈도가 통째로 흔들리므로 0으로 둔다.
     오스만 내해(마르마라해)와 육로 80km 구간에 코르세어를 띄우는 것은 오류라
     해적을 뺐는데, 그 결과 최적 플레이의 37%가 **무위험 구간**이 됐다.
     바다의 위험을 뭍의 위험으로 갈음한다. → wiki/research-voyage-returns.md */
  { id: 'bandit',   weight: 0,  name: '노상강도' },
  { id: 'toll',     weight: 0,  name: '통행세 징수' },
];

/** 육로·내해 구간에서 뭍의 사고가 날 확률.
    해상 구간의 평균 조우율(18%)보다 낮게 둔다 — 안쪽 시장이 안전한 것 자체는 맞고,
    다만 **완전 무위험**이어서는 안 된다는 것이 이 값의 취지다. */
export const INLAND_ODDS = 0.12;

/* ── 시장 충격 ────────────────────────────────────────────────
   사료가 지지하는 '대박 항차'는 확률이 아니라 **사건**이다 —
   기근(제노바 밀 1590→91 ×2) · 경쟁 선단 전손 · 독점 붕괴 · 나포.
   ±15% 노이즈(`wobble`)에서 나오는 꼬리는 사료와 모양이 다르다.
   그래서 값이 뛰는 자리를 따로 만든다. → content/voyage-evidence.json */
export const SHOCK = {
  // 상인 NPC가 털리면 그가 대던 항구에서 그 물건이 귀해진다
  raidMult: 1.55,
  raidDays: 12,
  cap: 2.6,                  // 충격이 겹쳐도 이 이상은 안 오른다
  floor: 0.45,               // 내려가는 쪽도 바닥이 있다

  /* 저 혼자 일어나는 사건들. 조사가 든 유형 넷 중 나포(raid)는 위에 있고,
     나머지 셋이 여기 있다. 값이 **내려가는** 사건을 함께 두는 것이 중요하다 —
     오르기만 하면 "기다렸다 팔면 된다"가 되어 판단이 사라진다.
     → .claude/docs/wiki/research-voyage-returns.md §4-4 */
  events: [
    {
      id: 'famine', name: '기근', kind: 'demand', tone: 'bad',
      mult: 2.0, days: 20, perDay: 0.010,
      goods: ['grain'],
      // 제노바 밀값이 1590→91년에 두 배가 됐다. **사들이던** 도시에만 건다 —
      // 산지에 기근을 걸면 살 곳이 사라져 항로가 통째로 죽는다(콘텐츠가 준다).
      line: (city, good) => `${city}에 흉년이 들었다. ${good}값이 치솟는다.`,
    },
    {
      id: 'blockade', name: '봉쇄', kind: 'demand', tone: 'bad',
      mult: 1.7, days: 14, perDay: 0.008,
      goods: ['grain', 'weapon', 'wine', 'oliveoil'],
      line: (city, good) => `함대가 ${city} 앞바다를 막았다. ${good}이(가) 동난다.`,
    },
    {
      id: 'glut', name: '풍작·독점 붕괴', kind: 'supply', tone: 'good',
      mult: 0.62, days: 16, perDay: 0.009,
      goods: null,             // 산지 품목이면 무엇이든
      // 톨파 명반이 무너졌을 때 값이 절반이 됐다. 싸게 살 기회 — 소식을 듣고 달려가는 재미.
      line: (city, good) => `${city}에 ${good}이(가) 넘쳐난다. 지금이 살 때다.`,
    },
  ],
};

/* ══════════════════════════════════════════════════════════════
   튜닝 상수 — 규칙이 아니라 **값**
   ══════════════════════════════════════════════════════════════
   원래 `js/state.js`에 흩어져 있던 것들이다. state.js는 *규칙*(어떻게 계산하나)을
   맡고, 여기는 *값*(얼마인가)을 맡는다 — 밸런스를 만질 때 로직 파일을 열지 않아도 되게.

   ★ `state.js`가 이것들을 그대로 re-export하므로 **기존 import 경로는 그대로 쓴다.**
     `import { CREW_WAGE } from './state.js'`도, `from './data.js'`도 같은 값이다.
   ★ 값을 고치면 근거 파일(`content/*-evidence.json`)도 같은 커밋에서 고친다 —
     `node tools/check-prices.mjs`·`check-wages.mjs`가 어긋나면 실패시킨다.
   ══════════════════════════════════════════════════════════════ */

/* ── 시작 조건 ─────────────────────────────────────────────── */
/* 배는 있고 **사람이 없다.** 선원 0명은 난이도 조정이 아니라 시작의 뼈대다 —
   첫 화면에서 할 수 있는 일이 "술집에 간다" 하나로 좁혀지고, 선장이 맨 처음 내리는
   결정이 매매가 아니라 **누구를 태울 것인가**가 된다.

   ★ 사용자 지정은 **150**이었고 의도는 "아슬아슬하게"였다. 그런데 급여를 월말 정산으로
     옮긴 뒤 실측하니 150은 아슬아슬이 아니라 **불가능**이었다 — 30항차 12판에서
     완주 1판 · 체불 7판. 매입 자본이 100닢 남짓이라 한 항차 이익이 항해비를 못 넘는다.
     의도를 실현하는 값은 **200**이다(완주 8/12 · 체불 2/12). 250이면 완주 12/12 ·
     체불 0으로 긴장이 사라진다. 되돌리려면 `node tools/sim-trade.mjs`를 여러 판 다시 돌린다. */
export const START_GOLD = 200;

/* ── 항구 서비스 ──────────────────────────────────────────── */
export const REPAIR_UNIT = 14;   // HP 1당 금화
export const HIRE_UNIT = 55;     // 선원 1명당 — 술집 계약금의 일곱 배다(고르지 않는 값)

/* ── 항해비 ────────────────────────────────────────────────
   ★ 임금은 사료 대비 과중했다(→ content/asset-evidence.json). 선원 연봉으로 배를
     몇 척 사느냐로 재면 게임 11배 : 사료 30배였다. 그래서 일당을 절반으로 내리고,
     줄어든 압박을 **성장에 따라 늘어나는 쪽**(선단·무장)으로 옮겼다. */
export const CREW_WAGE = 1.2;      // 1명 1일 — 술집에서 누구를 태웠나로 실제 값은 갈린다
export const SUPPLY_UNIT = 1.3;    // 1명 1일 — 사료에서 식비는 임금과 비슷하거나 더 컸다

/** 대포 유지비(1문 1일) — 화약과 탄약은 쟁여 두는 것만으로 돈이 나간다.
    무장을 늘릴수록 오르므로 "해적이 무서워 포를 더 싣는다"에 대가가 붙는다. */
export const ARM_UPKEEP = { light: 0.5, medium: 0.9, long: 1.6 };

/** 기함 선체 유지 계수 — SHIPS[].upkeep(정박 유지비)에 곱한다.
    정박해 두는 것보다 몰고 다니는 쪽이 더 든다. */
export const HULL_UPKEEP = 1.0;

/* ── 급여 정산 ────────────────────────────────────────────────
   급여는 발생주의다 — 날마다 쌓이고 달마다 **항구에서** 치른다.
   못 주면 반란이 아니라 이탈이고, 떠나는 무리는 값나가는 짐을 들고 간다.
   → .claude/docs/wiki/payroll.md */
export const MONTH_DAYS = 30;
/** 불만이 오르는 정도 — 못 준 비율 × (1 − 참을성) × 이 계수.
    참을성(`CREW_TRAITS[].temper`)이 0.25인 주정뱅이는 0.85인 성실한 무리보다 5배 빨리 오른다. */
export const UNREST_PER_MISS = 1.15;
/** 제때 다 주면 이만큼 가라앉는다. 한 번 밀렸다고 영영 앙심을 품지는 않는다. */
export const UNREST_HEAL = 0.34;
/** 이탈 판정 문턱 — 불만이 이 위로 올라간 무리만 굴린다. */
export const DESERT_AT = 0.55;

/* ── 적하보험 ─────────────────────────────────────────────────
   `map/geo.js: ROUTE_RISK`는 원래 **당대 해상보험 요율(%)**이다. 값나가는 짐을
   위험한 구간으로 나르면 인수업자가 그만큼 뗀다.

   ★ 이 항목이 게임의 성장 브레이크다. 초반엔 곡물·소금을 안전한 이웃 항구로 나르니
     거의 0이고, 커져서 향신료·비단을 먼 구간으로 나르기 시작하면 급격히 무거워진다. */
export const INSURANCE_RATE = 0.30;    // 요율(%)에 곱하는 계수 — 1이면 사료 그대로

/** 보상률. 게임은 사료 요율의 30%만 걷으므로(`INSURANCE_RATE`) **낸 만큼만** 받는다 —
    30%만 내고 100%를 받으면 보험이 공짜 이익이 된다. */
export const INSURANCE_COVER = INSURANCE_RATE;

/** 폭풍이 투하까지 갈 확률 — 위험한 항로일수록 높다.
    실효 발생률 목표는 15~25항차에 1건 → content/voyage-evidence.json: lossEventPerVoyages */
export const JETTISON_BASE = 0.22;
export const JETTISON_PER_PCT = 0.035;

/* ── 뭍의 사고 ────────────────────────────────────────────────
   내해·육로 구간의 위험. 바다와 성격이 다르다 —
     · 노상강도는 **값나가는 것부터** 집어간다(투하와 정반대다. 강도는 고르니까).
     · 통행세는 화물이 아니라 금화를 문다.
   둘 다 보험이 보상하지 않는다. 해상보험은 바다의 위험만 인수했다. */
export const INLAND_LOSS = {
  banditShare: 0.16,      // 실은 것의 이 비율(±)을 뺏긴다
  tollRate: 0.045,        // 화물가치의 이만큼을 금화로 문다
};

/* ── 해적 조우 확률 환산 ──────────────────────────────────────
   요율(%) → 조우 확률. 요율 2%면 10%, 9%면 28%가 되도록 잡았다.
   평균 요율이 5% 언저리라 **전 항로 평균은 종전과 같은 18%**에 머문다 —
   난이도 총량은 그대로 두고 어디가 위험한지만 갈랐다는 뜻이다. */
export const ODDS_BASE = 0.05, ODDS_PER_PCT = 0.026;
export const BASE_RISK = 5.0;                 // 표에 없는 항로가 생겼을 때의 기본값
export const THREAT_PER_SHIP = 0.04;          // 그 구간에 뜬 해적 1척당 +4%p
export const ODDS_CAP = 0.42;

/* 값나가는 짐은 해적을 부른다 — 보험료가 오르는 것과 별개의 두 번째 대가. */
export const LURE_PER = 9000;                 // 화물 가치 9,000닢마다 +1 단계
export const LURE_PER_STEP = 0.05;            // 한 단계에 +5%p
export const LURE_CAP = 0.14;                 // 아무리 실어도 +14%p까지

/* ── 대포의 유효 구간 ────────────────────────────────────────
   near~far를 벗어난 만큼 조준이 무너진다. 멀어질 때(50)보다
   가까워질 때(25)가 두 배 가파르다 — 장포로 코앞을 겨누는 쪽이 더 곤란하다.
   바닥값이 있어 아무리 벗어나도 아예 못 맞히지는 않는다. */
export const ZONE_FAR_FALL = 50, ZONE_NEAR_FALL = 25, ZONE_FLOOR = 0.4;

/* ── 선단·조선소 ──────────────────────────────────────────── */
export const SHIP_RESALE = 0.55;      // 보유선 매각가 (정가 대비)

/* 값 — 공업력에 여유가 있는 항구일수록 싸고, 전통 조선지는 한 번 더 깎아준다.
   같은 배라도 어디서 사느냐로 값이 갈려 "조선 강국까지 가서 산다"는 동기가 남는다. */
export const YARD_SLACK_OFF = 0.07;   // 공업력 여유 1당
export const YARD_SLACK_CAP = 0.15;
export const YARD_TRADITION_OFF = 0.08;

/* ── 중고선 ───────────────────────────────────────────────────
   신조만 있으면 "그 항구에 가기 전까지는 방법이 없다"가 된다. 실제로도 즉시 손에 넣을 수 있는 배는
   신조가 아니라 **중고선과 나포선**이었다. 항구마다 매물이 사흘 주기로 갈리고,
   나포선을 뜯어 고쳐 파는 항구(`prizeYard`)는 더 자주, 더 싸게 나온다. */
export const USED = {
  priceMul: [0.52, 0.74],   // 정가 대비
  hullMul: [0.45, 0.85],    // 선체 잔량
  slots: 2,                 // 한 항구에 걸리는 매물 수 상한
  cycle: 3,                 // 며칠마다 갈리나 (시세와 같은 리듬)
};

/* ── 나포한 배 ──────────────────────────────────────────────── */
export const PRIZE_HULL = 0.6;    // 나포선은 선체가 상한 채로 들어온다
export const PRIZE_SCRAP = 0.30;  // 해체 시 정가 대비
