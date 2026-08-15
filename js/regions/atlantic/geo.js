// regions/atlantic/geo.js — 대서양·북해의 지리
//
// ★ 이 파일은 "어디에 무엇이 있고 어떻게 이어지는가"만 다룬다.
//   경제 수치(산지·수요지·입항세)는 `trade.js`에 있고 둘은 `id`로만 맞물린다.
//
// 좌표계는 **이 권역 전용 400×225**다. 다른 권역의 좌표와 아무 관계가 없다.
// 배치는 실제 위경도를 옮긴 것이 아니라 **놀기 좋은 도식**이다 — 이베리아를 아래 왼쪽,
// 프랑스·잉글랜드를 가운데, 북해·발트를 위 오른쪽에 두어 항로가 대각선으로 흐르게 했다.
// 순수 투영으로 찍으면 함부르크와 뤼베크가 5px 거리에 겹쳐 클릭이 안 된다(반경 6px).
// 그래서 붐비는 발트를 옆으로 늘리고 텅 빈 대서양을 줄였다.
//
// 이 권역은 **모든 원양 항해가 지나는 문**이다. 지중해에서 제노바~리스본·바르셀로나~세비야로
// 들어오고, 리스본에서 아르갱·푼샬로 나간다(`js/regions/index.js: OCEAN_LANES`).
// 그래서 이베리아 세 항구의 좌표와 값은 세계 전체의 물길을 좌우한다.

/** 도시의 지리·외형. 필드 뜻은 `js/regions/mediterranean/geo.js`가 정본이다.
    style 이 권역에는 맞는 화풍이 아직 없다 — STYLES에 latin·hellenic·levant뿐이라
          붉은 기와의 'latin'을 전부 빌려 쓴다. 한자의 벽돌 고딕 계단박공과 노르웨이의
          목조 부두는 그림이 나와야 한다 → 근거 JSON의 art.styleTodo.
    flag  FLAGS에 포르투갈·한자·러시아 깃발이 없다. 색이 가장 가까운 것을 빌렸다:
          이베리아·저지대(합스부르크)는 'spain', 한자·덴마크·노르웨이의 붉은 바탕 흰 문장은
          'hospitaller', 스웨덴의 파란 바탕 금빛 십자는 'france', 루시의 붉은 바탕 금빛
          문장은 'venice'. 무엇을 그려야 하는지는 근거 JSON의 art.flagTodo에 적었다. */
export const CITIES = [
  // ── 이베리아·대서양 제도 — 대양으로 나가는 문 ──────────────────
  // 푼샬은 이 시대 유럽 최대의 설탕 산지다(1490년대에 키프로스를 제쳤다).
  // 지도 맨 아래 왼쪽 바깥에 홀로 떨어뜨려 "뭍을 떠났다"는 느낌을 준다.
  { id: 'funchal',    name: '푼샬',       area: '마데이라',     style: 'latin', x: 24,  y: 194, flag: 'spain',       seed: 3101, size: 2, industry: 1 },
  { id: 'lisboa',     name: '리스본',     area: '에스트레마두라', style: 'latin', x: 62,  y: 158, flag: 'spain',       seed: 3202, size: 3, industry: 3 },
  { id: 'sevilla',    name: '세비야',     area: '안달루시아',   style: 'latin', x: 88,  y: 178, flag: 'spain',       seed: 3303, size: 3, industry: 2 },
  // 빌바오는 공업력 3이다 — 바스크의 철과 참나무가 한자리에 있어 이베리아 조선의 본산이었다.
  { id: 'bilbao',     name: '빌바오',     area: '비스카야',     style: 'latin', x: 108, y: 134, flag: 'spain',       seed: 3404, size: 2, industry: 3 },

  // ── 프랑스 대서양안 — 포도주와 소금 ────────────────────────────
  { id: 'bordeaux',   name: '보르도',     area: '기옌',         style: 'latin', x: 126, y: 126, flag: 'france',      seed: 3505, size: 2, industry: 1 },
  { id: 'larochelle', name: '라로셸',     area: '오니',         style: 'latin', x: 130, y: 102, flag: 'france',      seed: 3606, size: 2, industry: 1 },

  // ── 잉글랜드 ───────────────────────────────────────────────────
  { id: 'bristol',    name: '브리스틀',   area: '서부',         style: 'latin', x: 108, y: 76,  flag: 'england',     seed: 3707, size: 2, industry: 2 },
  { id: 'london',     name: '런던',       area: '템스',         style: 'latin', x: 146, y: 74,  flag: 'england',     seed: 3808, size: 3, industry: 3 },

  // ── 저지대 — 유럽의 시장 ──────────────────────────────────────
  // 깃발을 'spain'으로 둔 것은 이 시기 저지대가 합스부르크령이었기 때문이다.
  // 브뤼헤는 즈윈이 메워져 쇠락 중이라 규모는 크되 공업력이 낮다.
  { id: 'brugge',     name: '브뤼헤',     area: '플랑드르',     style: 'latin', x: 166, y: 90,  flag: 'spain',       seed: 3909, size: 3, industry: 1 },
  { id: 'antwerpen',  name: '안트베르펜', area: '브라반트',     style: 'latin', x: 190, y: 80,  flag: 'spain',       seed: 4010, size: 3, industry: 2 },
  { id: 'amsterdam',  name: '암스테르담', area: '홀란트',       style: 'latin', x: 178, y: 54,  flag: 'spain',       seed: 4111, size: 2, industry: 3 },

  // ── 북해·한자 ─────────────────────────────────────────────────
  { id: 'bergen',     name: '베르겐',     area: '노르웨이',     style: 'latin', x: 200, y: 30,  flag: 'hospitaller', seed: 4212, size: 2, industry: 1 },
  { id: 'hamburg',    name: '함부르크',   area: '엘베',         style: 'latin', x: 224, y: 72,  flag: 'hospitaller', seed: 4313, size: 2, industry: 2 },

  // ── 발트 ──────────────────────────────────────────────────────
  { id: 'lubeck',     name: '뤼베크',     area: '홀슈타인',     style: 'latin', x: 248, y: 56,  flag: 'hospitaller', seed: 4414, size: 3, industry: 3 },
  { id: 'kobenhavn',  name: '코펜하겐',   area: '외레순',       style: 'latin', x: 266, y: 36,  flag: 'hospitaller', seed: 4515, size: 2, industry: 2 },
  // 단치히는 한자 최대 도시였다. 비스와 강이 폴란드의 호밀과 숲을 통째로 실어 내린다.
  { id: 'danzig',     name: '단치히',     area: '프로이센',     style: 'latin', x: 292, y: 66,  flag: 'hospitaller', seed: 4616, size: 3, industry: 3 },
  { id: 'stockholm',  name: '스톡홀름',   area: '스웨덴',       style: 'latin', x: 306, y: 32,  flag: 'france',      seed: 4717, size: 2, industry: 2 },
  { id: 'riga',       name: '리가',       area: '리보니아',     style: 'latin', x: 330, y: 50,  flag: 'hospitaller', seed: 4818, size: 2, industry: 1 },
  { id: 'reval',      name: '레발',       area: '에스토니아',   style: 'latin', x: 344, y: 30,  flag: 'hospitaller', seed: 4919, size: 2, industry: 1 },
  // 노브고로드는 **내륙**이다(볼호프 강가). 레발에서만 들어가는 막다른 주머니로 두었다 —
  // 한자의 페터호프가 외지 상인을 막고 있었으니 "관문을 거쳐야 들어간다"가 곧 고증이다.
  { id: 'novgorod',   name: '노브고로드', area: '루시',         style: 'latin', x: 378, y: 42,  flag: 'venice',      seed: 5020, size: 2, industry: 0 },
];

/* 항로 — 권역 안의 연결. 여기에 없는 두 항구는 직항이 없다.
   ★ 리스본~푼샬은 여기 없다. 그 선은 `js/regions/index.js: OCEAN_LANES`가 이미 긋고 있어
     여기 또 적으면 요율이 두 곳에서 정의되어 검증이 어긋난다. 대신 세비야~푼샬을 그어
     제도가 막다른 섬이 되지 않게 했다.
   ★ 한자의 물길은 사실상 하나의 사슬이다 — 노브고로드에서 모피와 밀랍이 나와
     레발·리가·단치히·뤼베크를 지나 브뤼헤·런던의 모직과 만난다. 그 사슬이 끊기지 않게
     발트 안쪽을 촘촘히 잇고, 대신 비스케이만과 해협은 선을 아껴 위험 구간을 지나게 했다. */
export const ROUTES = [
  ['lisboa', 'sevilla'], ['bilbao', 'lisboa'], ['funchal', 'sevilla'],
  ['bilbao', 'larochelle'], ['bilbao', 'bordeaux'], ['bordeaux', 'larochelle'],
  ['bordeaux', 'bristol'], ['larochelle', 'london'], ['bristol', 'london'],
  ['bergen', 'bristol'],
  ['brugge', 'london'], ['antwerpen', 'london'], ['hamburg', 'london'],
  ['antwerpen', 'brugge'], ['amsterdam', 'antwerpen'], ['amsterdam', 'hamburg'],
  ['amsterdam', 'bergen'],
  // 함부르크~뤼베크는 배가 아니라 짐이 넘어가는 길이다 — 홀슈타인 지협을 가로지르는
  // 슈테크니츠 운하·육로. 이 지름길이 있었기에 한자가 유틀란트를 도는 뱃길을 건너뛰었다.
  ['hamburg', 'lubeck'],
  ['bergen', 'kobenhavn'], ['kobenhavn', 'lubeck'], ['danzig', 'lubeck'],
  ['danzig', 'kobenhavn'], ['kobenhavn', 'stockholm'], ['danzig', 'stockholm'],
  ['reval', 'stockholm'], ['danzig', 'riga'], ['reval', 'riga'],
  // 나르바에서 페이푸스 호수를 지나 볼호프 강을 거슬러 오르는 내륙길.
  ['novgorod', 'reval'],
];

/* 항로 위험도 — **당대 해상보험 요율(%)**이다.
   이 권역의 앵커는 지중해와 다른 장부에서 왔다:
     · 1438년 런던~브뤼헤 에식스 브로드클로스 **5.86%** (보로메이 은행 런던지점) — 해협 횡단의 실측치
     · 1560년대 안트베르펜 중개인 장부 1,471건: 평균 **7.70%** · 중앙값 **7.00%**,
       지중해 항로는 대서양 대비 **+48%**, 1월은 7월 대비 **+28%**
   즉 이 바다는 "요율이 지중해보다 조금 높은 바다"다. 그 차이를 만드는 것이 셋이다 —
   ① 비스케이만: 대륙붕단에서 수심이 급히 얕아져 너울이 서고, 브레스트 이남에는
      전천후 피난항이 없다. 만 전체가 바람에 밀리는 뭍(lee shore)이라 도망칠 데가 없다.
   ② 영국해협: 거리는 짧은데 양안 수십 마일 안에 적대 항구가 늘어서 있다.
      덩케르커·노르망디·브르타뉴의 나포면허선이 여기서 먹고살았다.
   ③ 발트: 반대로 **가장 안전하다**. 한자가 제 앞바다를 지켰고 뭍이 늘 가깝다.
      대신 겨울에는 아예 못 다녔다 — 15세기 한자법이 카테드라 페트리(2/22)부터
      성 마르티노일(11/11)까지만 항해를 허용했다. 그것은 위험이 아니라 **통행 불가**라
      요율로 옮길 수 없다. 계절 봉쇄를 다루는 규칙이 생기면 그때 붙일 것(근거 JSON의 openQuestions).

   null = 해적 개념이 없는 구간(운하·육로·강). */
export const ROUTE_RISK = {
  // 이베리아 — 곶을 도는 외해
  'lisboa|sevilla': 6.5,
  'bilbao|lisboa': 7.5,
  'funchal|sevilla': 7.0,
  // 비스케이만 — 이 바다에서 가장 악명 높은 물
  'bilbao|larochelle': 9.0,
  'bilbao|bordeaux': 8.0,
  'bordeaux|larochelle': 4.5,
  'bordeaux|bristol': 7.5,
  // 해협 — 짧고 붐비고 사략선이 지킨다
  'larochelle|london': 7.0,
  'bristol|london': 6.0,
  'brugge|london': 5.9,
  'antwerpen|london': 6.0,
  'hamburg|london': 6.5,
  // 북해 — 뭍이 며칠 안 보이는 구간이 섞인다
  'bergen|bristol': 8.5,
  'amsterdam|bergen': 7.5,
  'amsterdam|hamburg': 5.0,
  'antwerpen|brugge': 2.5,
  'amsterdam|antwerpen': 3.0,
  'bergen|kobenhavn': 6.0,
  // 발트 — 한자의 앞바다
  'hamburg|lubeck': null,
  'kobenhavn|lubeck': 3.5,
  'danzig|lubeck': 4.0,
  'danzig|kobenhavn': 4.0,
  'kobenhavn|stockholm': 4.0,
  'danzig|stockholm': 4.5,
  'reval|stockholm': 5.0,
  'danzig|riga': 4.5,
  'reval|riga': 3.5,
  'novgorod|reval': null,
};

/* 해류 — 이 바다의 물길은 한 문장으로 요약된다: **남하는 쉽고 북상은 어렵다.**
   카나리아 해류와 그 북쪽 연장인 포르투갈 해류가 이베리아 연안을 남쪽으로 흐르기 때문에,
   내려갈 때는 물과 바람을 타지만 돌아올 때는 연안을 거스를 수 없었다. 그 해답이
   `volta do mar` — 서쪽 외해로 크게 돌아 아조레스 부근에서 편서풍을 잡고 리스본으로 든다.
   게임은 항로 하나에 방향 하나만 실을 수 있어 그 큰 우회를 그리지는 못하고,
   **남향에 물길을 얹는 것**으로만 표현했다. from 쪽에서 출발하면 물을 타고, 거스르면 느리다. */
export const CURRENTS = {
  'bilbao|lisboa':      { from: 'bilbao',     push: 0.09 },  // 포르투갈 해류 — 남하
  'funchal|sevilla':    { from: 'sevilla',    push: 0.11 },  // 카나리아 해류 — 제도로 내려가는 물
  'bergen|bristol':     { from: 'bristol',    push: 0.07 },  // 북대서양 해류 — 북동으로 밀어 올린다
  'bilbao|larochelle':  { from: 'bilbao',     push: 0.05 },
  'larochelle|london':  { from: 'larochelle', push: 0.06 },  // 해협으로 밀려드는 조류
  'brugge|london':      { from: 'london',     push: 0.05 },  // 해협의 잔류류는 동쪽으로 빠진다
  'bergen|kobenhavn':   { from: 'kobenhavn',  push: 0.06 },  // 유틀란트 연안을 북상하는 물
  'kobenhavn|lubeck':   { from: 'lubeck',     push: 0.05 },  // 발트 표층수가 해협 밖으로 흘러 나간다
};
