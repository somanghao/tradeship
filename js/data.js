// data.js — 도시 / 교역품 / 선박 / 적 정의
// 지도 좌표는 400x225 논리 해상도 기준.

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
  size: [30, 90],         // 요구 수량
  payMul: [1.30, 1.55],   // 목적지 시세 대비 보수 배율 (관세도 안 뗀다)
  advance: 0.30,          // 선금 비율 (나머지는 납품할 때)
  daysPad: [4, 10],       // 편도 일수 × 1.6 + 이만큼이 기한
  // 위약금은 **선금보다 커야 한다**. 0.5로 뒀더니 선금만 받고 파기하는 것이
  // 순이득이 됐다(선금 6,896 − 위약금 3,448 = +3,448). 지금은 받은 것을 다 토하고 더 문다.
  penalty: 1.25,
};

/* 입항세 — 파는 쪽에만 붙는다. 큰 항구일수록 시세는 좋지만 떼 가는 몫도 크다.
   (도시 `size` 기준. 밀무역·면세 특권은 뒷날의 확장 자리다) */
export const TARIFF = { 1: 0.03, 2: 0.045, 3: 0.06 };

/* 도시.
   supply = 산지라 싸다 (배율<1) / demand = 수요지라 비싸다 (배율>1) */
export const CITIES = [
  {
    id: 'venezia', name: '베네치아', region: '아드리아', style: 'latin',
    x: 141, y: 63, flag: 'venice', seed: 1101, size: 3,
    supply: { glass: 0.48, silk: 0.72 }, demand: { spice: 1.42, fur: 1.30, grain: 1.18 },
    blurb: '유리와 비단의 도시. 동방 향신료라면 값을 아끼지 않는다.',
  },
  {
    id: 'genova', name: '제노바', region: '리구리아', style: 'latin',
    x: 116, y: 76, flag: 'genoa', seed: 1202, size: 3,
    supply: { weapon: 0.66, wine: 0.62 }, demand: { silk: 1.38, ivory: 1.32 },
    blurb: '베네치아의 숙적. 조선소와 무기고가 항구를 메운다.',
  },
  {
    id: 'marseille', name: '마르세유', region: '프로방스', style: 'latin',
    x: 91, y: 71, flag: 'genoa', seed: 1303, size: 2,
    supply: { wine: 0.55, oliveoil: 0.60 }, demand: { ceramic: 1.32, spice: 1.34 },
    blurb: '포도밭과 올리브 언덕에 둘러싸인 프랑스의 관문.',
  },
  {
    id: 'barcelona', name: '바르셀로나', region: '카탈루냐', style: 'latin',
    x: 57, y: 89, flag: 'spain', seed: 1404, size: 3,
    supply: { weapon: 0.62, salt: 0.52 }, demand: { silk: 1.30, gold: 1.22, spice: 1.26 },
    blurb: '아라곤 왕관의 항구. 대장간 망치 소리가 끊이지 않는다.',
  },
  {
    id: 'napoli', name: '나폴리', region: '캄파니아', style: 'latin',
    x: 131, y: 110, flag: 'spain', seed: 1505, size: 2,
    supply: { grain: 0.50, oliveoil: 0.56 }, demand: { fur: 1.40, glass: 1.30 },
    blurb: '베수비오 아래 곡창지대. 밀이 남아돈다.',
  },
  {
    id: 'palermo', name: '팔레르모', region: '시칠리아', style: 'latin',
    x: 151, y: 144, flag: 'spain', seed: 1606, size: 2,
    supply: { grain: 0.46, salt: 0.56 }, demand: { weapon: 1.36, wine: 1.24, fur: 1.28 },
    blurb: '지중해 한복판의 곡물 창고. 해적도 자주 들른다.',
  },
  {
    id: 'tunis', name: '튀니스', region: '이프리키야', style: 'levant',
    x: 174, y: 157, flag: 'ottoman', seed: 1707, size: 2,
    supply: { ivory: 0.62, gold: 0.76 }, demand: { grain: 1.50, wine: 1.42, weapon: 1.30 },
    blurb: '사하라 대상로의 종착지. 상아와 사금이 흘러든다.',
  },
  {
    id: 'algiers', name: '알제', region: '마그레브', style: 'levant',
    x: 106, y: 151, flag: 'ottoman', seed: 1808, size: 2,
    supply: { salt: 0.50, fur: 0.72 }, demand: { grain: 1.46, weapon: 1.44 },
    blurb: '코르세어의 소굴. 항구에 정박한 갤리가 심상치 않다.',
  },
  {
    id: 'athens', name: '아테네', region: '아티카', style: 'hellenic',
    x: 191, y: 110, flag: 'ottoman', seed: 1909, size: 2,
    supply: { oliveoil: 0.50, ceramic: 0.58 }, demand: { grain: 1.32, silk: 1.36 },
    blurb: '올리브 기름과 도기의 산지. 폐허가 된 신전이 항구를 굽어본다.',
  },
  {
    id: 'rodos', name: '로도스', region: '에게', style: 'hellenic',
    x: 239, y: 109, flag: 'venice', seed: 2010, size: 1,
    supply: { wine: 0.60, ceramic: 0.64 }, demand: { weapon: 1.38, grain: 1.34 },
    blurb: '기사단의 요새 섬. 동지중해 항로의 길목이다.',
  },
  {
    id: 'istanbul', name: '이스탄불', region: '보스포루스', style: 'hellenic',
    x: 241, y: 55, flag: 'ottoman', seed: 2111, size: 3,
    supply: { silk: 0.58, spice: 0.66 }, demand: { glass: 1.42, wine: 1.46, ceramic: 1.24 },
    blurb: '두 대륙이 만나는 대도시. 대상로의 비단이 여기서 풀린다.',
  },
  {
    id: 'beirut', name: '베이루트', region: '레반트', style: 'levant',
    x: 351, y: 121, flag: 'ottoman', seed: 2212, size: 2,
    supply: { spice: 0.54, silk: 0.66 }, demand: { ceramic: 1.42, fur: 1.36, glass: 1.28 },
    blurb: '인도 항로의 향신료가 처음 배에 실리는 곳.',
  },
  {
    id: 'alexandria', name: '알렉산드리아', region: '이집트', style: 'levant',
    x: 320, y: 159, flag: 'ottoman', seed: 2313, size: 3,
    supply: { grain: 0.48, ivory: 0.66 }, demand: { wine: 1.52, weapon: 1.34, glass: 1.30 },
    blurb: '나일의 밀이 쌓이는 항구. 등대 자리엔 이제 요새가 섰다.',
  },
];

export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c]));

/* 항로 — 인접 도시 간 연결. 값은 거리(항해 일수 계산에 사용) */
export const ROUTES = [
  ['venezia', 'genova'], ['venezia', 'rodos'], ['venezia', 'athens'], ['venezia', 'napoli'],
  ['genova', 'marseille'], ['genova', 'napoli'],
  ['marseille', 'barcelona'],
  ['barcelona', 'algiers'], ['barcelona', 'palermo'],
  ['napoli', 'palermo'], ['napoli', 'athens'],
  ['palermo', 'tunis'], ['palermo', 'algiers'], ['palermo', 'athens'],
  ['tunis', 'algiers'], ['tunis', 'alexandria'],
  ['athens', 'rodos'], ['athens', 'istanbul'],
  ['rodos', 'istanbul'], ['rodos', 'beirut'], ['rodos', 'alexandria'],
  ['beirut', 'alexandria'],
];

/* 해류 — 지중해는 대체로 아프리카 연안을 동쪽으로 흐르고 레반트에서 북상해 되돌아온다.
   `from` 방향으로 가면 물길을 타고, 거스르면 그만큼 느리다. 실린 구간만 반영한다.
   키는 도시 두 개를 정렬해 이은 것. */
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

/* 선박.
   origin/yards = 어느 나라 배이고 어느 항구의 조선소가 그 배를 내놓는가.
   rig = 스퀘어리그 비율(0=라틴세일뿐 … 1=전부 가로돛). 순풍/역풍 성능을 가른다.
     그림의 돛(`sprites/ship.js: HULLS[].masts[].sail`)과 **같이 고쳐야 한다**.
     지중해 어디서나 같은 배를 사던 것을 국적별로 갈랐다 — 배를 사려면 그 나라 항구까지 가야 한다.
   crewMin = 돛과 키를 다루는 데 필요한 최소 인원. 미달이면 배가 제 속력을 못 낸다.
     플류트처럼 "적은 선원으로 많이 싣는" 배와 프리깃처럼 "사람을 많이 먹는" 배를 가르는 축.
   upkeep = 정박해 두기만 해도 나가는 하루 유지비(선단). 배를 쟁여두는 데 값을 매긴다. */
export const SHIPS = {
  hulk: {
    hull: 'hulk', name: '낡은 바사', origin: '출처 불명', yards: [], price: 320,
    hp: 55, crew: 10, crewMax: 16, crewMin: 5, cargo: 45, guns: 2, speed: 0.85,
    upkeep: 2, rig: 0.50, leak: 2, tint: 'rot',
    desc: '물이 새는 중고선. 항해할 때마다 선체가 삭는다. 오래 탈 배가 아니다.',
  },
  caravel: {
    hull: 'caravel', name: '카라벨', origin: '스페인', yards: ['barcelona', 'palermo', 'napoli'],
    price: 1400,
    hp: 90, crew: 24, crewMax: 34, crewMin: 12, cargo: 90, guns: 6, speed: 1.35,
    upkeep: 6, rig: 0.00, tint: 'oak',
    desc: '작고 날렵하다. 화물칸은 좁지만 바람을 잘 탄다.',
  },
  fluyt: {
    hull: 'fluyt', name: '플류트', origin: '네덜란드', yards: ['genova', 'marseille'],
    price: 2600,
    hp: 120, crew: 20, crewMax: 30, crewMin: 14, cargo: 170, guns: 6, speed: 1.10,
    upkeep: 10, rig: 0.67, tint: 'oak',
    desc: '화물선의 정석. 이만한 짐을 이만큼 적은 선원으로 나르는 배는 없다. 대신 포문이 빈약하다.',
  },
  brig: {
    hull: 'brig', name: '브리간틴', origin: '영국', yards: ['marseille', 'palermo', 'rodos'],
    price: 4200,
    hp: 130, crew: 34, crewMax: 52, crewMin: 20, cargo: 140, guns: 10, speed: 1.20,
    upkeep: 14, rig: 0.50, tint: 'dark',
    desc: '균형 잡힌 중형선. 무역과 전투 어느 쪽도 무난하다.',
  },
  carrack: {
    hull: 'carrack', name: '캐랙', origin: '베네치아', yards: ['venezia', 'genova'],
    price: 9800,
    hp: 190, crew: 48, crewMax: 76, crewMin: 30, cargo: 240, guns: 14, speed: 0.95,
    upkeep: 22, rig: 0.67, tint: 'white',
    desc: '거대한 화물칸. 느리지만 한 번에 많이 싣는다.',
  },
  frigate: {
    hull: 'frigate', name: '블랙월 프리깃', origin: '영국', yards: ['genova', 'barcelona'],
    price: 14000,
    hp: 210, crew: 50, crewMax: 90, crewMin: 45, cargo: 110, guns: 18, speed: 1.40,
    upkeep: 30, rig: 1.00, tint: 'dark',
    desc: '작정하고 만든 프리깃 킬러. 빠르고 사납지만 화물칸이 좁고 선원을 많이 먹는다.',
  },
  galleon: {
    hull: 'galleon', name: '갈레온', origin: '스페인', yards: ['barcelona', 'napoli'],
    price: 19500,
    hp: 260, crew: 62, crewMax: 100, crewMin: 46, cargo: 200, guns: 24, speed: 1.05,
    upkeep: 40, rig: 0.67, tint: 'green',
    desc: '떠다니는 요새. 포문 스물넷이 현측을 메운다.',
  },
  indiaman: {
    hull: 'indiaman', name: '인디아맨', origin: '영국·네덜란드', yards: ['venezia', 'istanbul'],
    price: 26000,
    hp: 240, crew: 70, crewMax: 110, crewMin: 40, cargo: 320, guns: 20, speed: 1.00,
    upkeep: 46, rig: 0.75, tint: 'white',
    desc: '동인도 항로의 대형 상선. 상선인데도 어지간한 군함만큼 물린다.',
  },
  superfrigate: {
    hull: 'superfrigate', name: '슈퍼 프리깃', origin: '프랑스', yards: ['marseille'],
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

/* 해상 이벤트 가중치 */
export const SEA_EVENTS = [
  { id: 'calm',     weight: 40, name: '순조로운 항해' },
  { id: 'wind',     weight: 11, name: '순풍' },
  { id: 'storm',    weight: 12, name: '폭풍' },
  { id: 'drift',    weight: 7,  name: '표류물 발견' },
  { id: 'merchant', weight: 12, name: '상선 조우' },
  { id: 'pirate',   weight: 18, name: '해적 조우' },
];
