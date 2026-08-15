// regions/mideast/geo.js — 중동·홍해의 지리
//
// ★ 이 파일은 "어디에 무엇이 있고 어떻게 이어지는가"만 다룬다.
//   산지·수요지 같은 경제 수치는 `trade.js`에 있고, 둘은 `id`로만 맞물린다.
//
// 좌표계는 **이 권역 전용 400×225**다. 다른 권역의 좌표와 아무 관계가 없다.
//
// ── 이 지도를 이렇게 그린 이유 ────────────────────────────────
// 이 권역은 바다가 하나가 아니라 **셋**이다 — 홍해·아라비아해·페르시아만.
// 셋을 한 화면에 억지로 실제 축척으로 얹으면 아라비아 반도가 화면을 다 먹고
// 도시가 가장자리로 밀린다. 그래서 반도를 가운데 빈 사막으로 두고 **바다를 갈고리 모양**으로
// 둘렀다 — 왼쪽 위 카이로에서 홍해를 타고 내려와(아래로), 바브엘만데브에서 동쪽으로 꺾어
// 남아라비아 해안을 지나(오른쪽으로), 호르무즈 해협에서 다시 올라가 바스라에 닿는다(위로).
// 뱃길이 실제로 그렇게 한 줄로 이어졌으므로, 도식이 곧 항해 순서가 된다.
//
// 위쪽 띠(y 30~55)는 **뭍의 도시**다 — 알레포·다마스쿠스·바그다드·이스파한·카이로.
// 이들은 배가 못 닿는 대상로의 시장이라 항구 하나에서만 이어 **막다른 주머니**로 뒀다
// (지중해의 부르사·이즈니크와 같은 처리). 그래서 "안쪽까지 들어가면 값이 다르다"가 성립한다.
//
// 이름표 겹침은 좌표를 정한 뒤 계산했다(한글 글자당 6px · 도시 위쪽에 박스째).
// 가장 붐비는 곳은 카티프·바레인·줄파르·호르무즈가 줄지어 선 페르시아만 안쪽이라
// 그 넷은 y를 16~18px씩 층지게 내려 표가 서로를 덮지 않게 했다.

/** 도시의 지리·외형. 필드 뜻은 `js/regions/mediterranean/geo.js`가 정본이다.
    flag  — 이 바다에는 오스만·맘루크·호르무즈 왕국·오만 아랍·사파비가 뒤섞여 있다.
           ★ 배선이 끝난 만큼만 갈랐다 — 오스만 세력권(맘루크 포함)은 'ottoman',
           **오만 아랍(마스카트·줄파르)과 하드라마우트(시흐르)는 'oman'**(표식 없는 붉은기),
           **사파비의 수도 이스파한은 'safavid'**(초록 바탕에 해와 사자)다.
           ※ 아직 안 그려진 것은 **호르무즈 왕국기**다 — 호르무즈·바레인·카티프 셋은
           그 왕국의 세력권이라 하나로 묶어 'hafsid'(흰 바탕)를 그대로 빌려 쓴다.
           근거 JSON의 art.flagTodo 참조.
    style — 기본은 'levant'(황토벽·미나레트). 산호석으로 지은 홍해 세 항구(수아킨·마사와·지다)만
           'swahili'(산호석 흰 벽·평지붕)로 갈랐다 — 실제로 같은 재료·같은 인상이다.
           로샨 발코니의 아라비아, 청록 타일의 페르시아 화풍은 아직 없다(styleTodo).
    industry — 이 권역의 상한은 **2**다. 여기는 다우를 짓던 바다이지 갈레온을 짓던 바다가
           아니다. 게다가 아라비아에는 배를 지을 나무가 없어 티크를 인도에서 실어 왔다 —
           "최상급 배는 여기서 못 짓는다"가 이 바다의 성격이다. */
export const CITIES = [
  // ── 홍해 서안(아프리카 쪽) ─────────────────────────────────
  // 수아킨은 산호섬 위에 통째로 지어진 항구다. 산호 미로를 지나야 들어가는 자리라
  // 적이 못 들어오는 대신 큰 배도 못 들어온다. 마사와는 에티오피아 고원의 바깥문.
  { id: 'suakin',   name: '수아킨',     area: '누비아',       style: 'swahili', x: 44,  y: 104, flag: 'ottoman', seed: 4101, size: 2, industry: 1 },
  { id: 'massawa',  name: '마사와',     area: '에리트레아',   style: 'swahili', x: 58,  y: 152, flag: 'ottoman', seed: 4102, size: 1, industry: 1 },

  // ── 홍해 동안(아라비아 쪽) ─────────────────────────────────
  // 얀부는 메디나의 외항, 지다는 메카의 외항이다. 홍해 북쪽은 일 년 내내 북풍이 불어
  // 큰 배가 거슬러 올라가지 못했다 — 그래서 **지다가 대형선 항행의 북쪽 한계**였고
  // 거기서 짐을 내려 작은 배나 낙타로 넘겼다. 이 사실이 이 권역의 뼈대다.
  { id: 'yanbu',    name: '얀부',       area: '히자즈',       style: 'levant',  x: 62,  y: 66,  flag: 'ottoman', seed: 4103, size: 1, industry: 1 },
  { id: 'jeddah',   name: '지다',       area: '히자즈',       style: 'swahili', x: 76,  y: 108, flag: 'ottoman', seed: 4104, size: 3, industry: 1 },
  { id: 'mokha',    name: '모카',       area: '예멘',         style: 'levant',  x: 86,  y: 168, flag: 'ottoman', seed: 4105, size: 2, industry: 1 },

  // ── 아덴만·하드라마우트 ────────────────────────────────────
  // 아덴은 홍해의 문지기다. 사화산 분화구 안에 앉은 항구라 뭍에서 치기 어렵고,
  // 인도양에서 올라온 배는 여기서 계절풍을 갈아탔다. 시흐르는 유향의 적출항.
  { id: 'aden',     name: '아덴',       area: '예멘',         style: 'levant',  x: 112, y: 186, flag: 'ottoman', seed: 4106, size: 3, industry: 2 },
  { id: 'shihr',    name: '시흐르',     area: '하드라마우트', style: 'levant',  x: 176, y: 190, flag: 'oman',  seed: 4107, size: 1, industry: 1 },

  // ── 오만·페르시아만 ────────────────────────────────────────
  // 마스카트는 이 바다에서 배를 가장 잘 짓던 곳이다(수르의 조선소). 호르무즈는
  // 물 한 방울 안 나는 민둥섬인데도 해협에 앉았다는 이유만으로 왕국이 됐다 —
  // 먹을 것과 마실 물까지 전부 배로 실어 왔다.
  { id: 'muscat',   name: '마스카트',   area: '오만',         style: 'levant',  x: 292, y: 168, flag: 'oman',  seed: 4108, size: 2, industry: 2 },
  { id: 'hormuz',   name: '호르무즈',   area: '해협',         style: 'levant',  x: 322, y: 134, flag: 'hafsid',  seed: 4109, size: 3, industry: 2 },
  { id: 'julfar',   name: '줄파르',     area: '오만 해안',    style: 'levant',  x: 300, y: 118, flag: 'oman',  seed: 4110, size: 1, industry: 1 },
  { id: 'bahrain',  name: '바레인',     area: '진주 어장',    style: 'levant',  x: 276, y: 102, flag: 'hafsid',  seed: 4111, size: 2, industry: 1 },
  { id: 'qatif',    name: '카티프',     area: '알하사',       style: 'levant',  x: 252, y: 84,  flag: 'hafsid',  seed: 4112, size: 1, industry: 1 },
  { id: 'basra',    name: '바스라',     area: '이라크',       style: 'levant',  x: 238, y: 52,  flag: 'ottoman', seed: 4113, size: 3, industry: 2 },

  // ── 뭍의 시장(industry 0 · 배가 못 닿는다) ─────────────────
  // 항구가 아니라 **대상로의 시장**이다. 관문 항구 하나에서만 이어 막다른 주머니로 뒀다.
  // 여기까지 짐을 들고 들어가면 항구보다 좋은 값을 받지만, 되돌아 나와야 한다.
  { id: 'cairo',    name: '카이로',     area: '이집트',       style: 'levant',  x: 30,  y: 52,  flag: 'ottoman', seed: 4114, size: 3, industry: 0 },
  { id: 'damascus', name: '다마스쿠스', area: '샴',           style: 'levant',  x: 118, y: 44,  flag: 'ottoman', seed: 4115, size: 2, industry: 0 },
  { id: 'aleppo',   name: '알레포',     area: '샴',           style: 'levant',  x: 150, y: 30,  flag: 'ottoman', seed: 4116, size: 3, industry: 0 },
  { id: 'baghdad',  name: '바그다드',   area: '이라크',       style: 'levant',  x: 196, y: 40,  flag: 'ottoman', seed: 4117, size: 2, industry: 0 },
  { id: 'isfahan',  name: '이스파한',   area: '이란고원',     style: 'levant',  x: 300, y: 46,  flag: 'safavid',  seed: 4118, size: 3, industry: 0 },
];

/* 항로 — 이 바다는 **한 줄로 이어진 갈고리**다. 홍해를 내려와 바브엘만데브에서 꺾고
   남아라비아를 지나 해협으로 올라간다. 지중해처럼 사방으로 건널 수 있는 바다가 아니라
   좁고 얕고 산호가 많아 실제로도 연안을 따라 한 줄로 다녔다 — 그 성격을 그래프로 옮겼다.

   ★ 다른 권역으로 나가는 선(지다~알렉산드리아 · 바스라~베이루트 · 아덴~캘리컷 ·
     아덴~몸바사 · 호르무즈~캄베이 · 호르무즈~모잠비크)은 여기가 아니라
     `js/regions/index.js: OCEAN_LANES`에 이미 그어져 있다. */
export const ROUTES = [
  // 홍해 — 얀부·지다는 아라비아 쪽 성지 항로, 수아킨·마사와는 건너편 아프리카 쪽
  ['yanbu', 'jeddah'],
  ['jeddah', 'suakin'],
  ['jeddah', 'mokha'],
  ['suakin', 'massawa'],
  ['massawa', 'mokha'],
  // 바브엘만데브 — 홍해가 대양으로 나가는 유일한 문
  ['mokha', 'aden'],
  // 남아라비아 해안 — 뭍이 사흘씩 안 보이는 구간
  ['aden', 'shihr'],
  ['shihr', 'muscat'],
  // 호르무즈 해협 — 페르시아만으로 들어가는 유일한 문
  ['muscat', 'hormuz'],
  ['hormuz', 'julfar'],
  ['julfar', 'bahrain'],
  ['bahrain', 'qatif'],
  ['bahrain', 'basra'],
  ['qatif', 'basra'],
  // ── 대상로(육로) — 배가 아니라 낙타가 넘는 길 ────────────────
  // 지다에서 나일까지, 바스라에서 알레포까지. 이 두 길이 곧 향신료가 유럽으로
  // 올라가던 옛 길이다. 다마스쿠스~얀부는 시리아 하지 대상로(다르브 알하지 앗샤미)로,
  // 해마다 순례 행렬이 오가던 길이라 짐도 같이 움직였다.
  ['jeddah', 'cairo'],
  ['yanbu', 'damascus'],
  ['damascus', 'aleppo'],
  ['aleppo', 'baghdad'],
  ['baghdad', 'basra'],
  ['hormuz', 'isfahan'],
];

/* 항로 위험도 — **당대 해상보험 요율(%)**이다. 지중해의 앵커(내해 2 · 연안 4 ·
   외해·병목 6~8 · 사략 소굴 9~11)와 같은 자로 잰다.

   ★ 이 바다의 위험은 **해적이 아니라 물길 자체**다. 홍해는 산호초가 양안을 메워
     밤에는 아예 못 다녔고(해가 지면 닻을 내렸다), 북쪽은 일 년 내내 맞바람이라
     큰 배가 지다 위로 못 올라갔다. 페르시아만은 얕고 모래톱이 옮겨 다니는 데다
     샤말(북서풍)이 불면 시야가 사라졌다. 그래서 지중해보다 요율이 **전반적으로 반 칸 높고**,
     대신 "사략 소굴 앞" 같은 9~11대 구간이 없다.
   ★ 걸프의 이름난 해적(카와심)은 18~19세기 이야기다. 이 시대에 그 값을 매기면
     사료가 아니라 후대의 인상을 옮기는 것이 되므로 매기지 않았다. 근거 JSON 참조.

   null = 해적 개념이 없는 구간(육로 대상로). 대신 뭍의 사고가 난다. */
export const ROUTE_RISK = {
  // 홍해 — 산호초와 무풍. 짧은 뜀뛰기라 뭍은 늘 가깝지만 좌초가 잦다.
  'jeddah|yanbu': 4.5,
  'jeddah|suakin': 5.5,
  'jeddah|mokha': 6.0,
  'massawa|suakin': 5.0,
  'massawa|mokha': 5.5,
  // 바브엘만데브 — 좁은 물목에 페림섬의 여울, 조류가 세다
  'aden|mokha': 7.0,
  // 아덴만·아라비아해 — 여기서부터 대양이다. 소코트라 앞은 배를 터는 자들이 있었다.
  'aden|shihr': 6.5,
  'muscat|shihr': 8.0,
  // 호르무즈 해협 — 모두가 지나야 하는 문. 조류가 세고 통항료를 뜯긴다.
  'hormuz|muscat': 6.5,
  // 페르시아만 안쪽 — 얕고 좁다. 진주 어장의 모래톱이 해마다 자리를 옮긴다.
  'hormuz|julfar': 5.0,
  'bahrain|julfar': 5.5,
  'bahrain|qatif': 3.5,
  'bahrain|basra': 6.0,
  'basra|qatif': 5.0,
  // 대상로 — 배가 다니는 길이 아니다
  'cairo|jeddah': null,
  'damascus|yanbu': null,
  'aleppo|damascus': null,
  'aleppo|baghdad': null,
  'baghdad|basra': null,
  'hormuz|isfahan': null,
};

/* 해류·계절풍 — 이 바다는 **바람이 곧 달력**이다.
   홍해 북쪽 절반은 일 년 내내 북풍이라 남쪽으로 가는 배는 밀리고 올라오는 배는 기어간다.
   홍해와 페르시아만은 둘 다 증발이 심해 바깥 바다에서 물이 **안으로 빨려 들어온다** —
   그래서 두 해협(바브엘만데브·호르무즈)은 들어가는 쪽이 순류다.
   페르시아만 안쪽은 샤티알아랍의 강물과 샤말이 함께 아래로 밀어내므로
   바스라에서 나오기는 쉽고 올라가기는 어렵다. */
export const CURRENTS = {
  'jeddah|yanbu':   { from: 'yanbu',   push: 0.10 },   // 홍해 북쪽의 항상풍 — 내려가는 길만 쉽다
  'jeddah|mokha':   { from: 'jeddah',  push: 0.08 },
  'massawa|suakin': { from: 'suakin',  push: 0.07 },
  'aden|mokha':     { from: 'aden',    push: 0.06 },   // 증발한 만큼 바깥 물이 홍해로 빨려 든다
  'muscat|shihr':   { from: 'shihr',   push: 0.08 },   // 남서 계절풍철의 남아라비아 연안류
  'hormuz|muscat':  { from: 'muscat',  push: 0.07 },   // 해협을 통해 만 안으로 드는 표층류
  'hormuz|julfar':  { from: 'hormuz',  push: 0.05 },   // 만 안의 반시계 순환
  'bahrain|julfar': { from: 'julfar',  push: 0.06 },
  'bahrain|basra':  { from: 'basra',   push: 0.06 },   // 강물과 샤말이 함께 아래로 민다
  'basra|qatif':    { from: 'basra',   push: 0.05 },
};
