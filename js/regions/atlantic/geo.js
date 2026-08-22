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
    style 'hanseatic'(붉은 벽돌 고딕·계단 박공·창고 도르래)를 한자·저지대에,
          'nordic'(목조 부두·가파른 널지붕·잿빛 하늘)을 노르웨이·스웨덴·루시·잉글랜드에 쓴다.
          이베리아·프랑스는 그대로 'latin' — 마누엘 양식의 흰 회벽(atlanticiberia)은 아직 없다.
    flag  ★ 배선이 끝났다. 전에는 FLAGS에 없어 색이 가까운 것을 빌려 썼지만
          (이베리아·저지대 'spain' · 한자·덴마크 'hospitaller' · 스웨덴 'france'),
          지금은 제 깃발을 단다 — 포르투갈 'portugal' · 한자 'hanse' ·
          덴마크·노르웨이 'denmark' · 스웨덴 'sweden' · 부르고뉴령 저지대 'burgundy'.
          카스티야(세비야·빌바오)만 그대로 'spain'이다.
          ※ 아직 안 그려진 것이 둘이다 — **루시**(노브고로드는 색이 가까운 'venice'를
          빌려 쓴다)와 **스코틀랜드**(리스는 오랜 동맹을 근거로 'france'를 빌려 쓴다).
          둘 다 근거 JSON의 art.flagTodo에 올라 있다. */
export const CITIES = [
  // ── 이베리아·대서양 제도 — 대양으로 나가는 문 ──────────────────
  // 푼샬은 이 시대 유럽 최대의 설탕 산지다(1490년대에 키프로스를 제쳤다).
  // 지도 맨 아래 왼쪽 바깥에 홀로 떨어뜨려 "뭍을 떠났다"는 느낌을 준다.
  { id: 'funchal',    name: '푼샬',       area: '마데이라',     style: 'latin',     x: 24,  y: 194, flag: 'portugal',       seed: 3101, size: 2, industry: 1 },
  // 라스팔마스는 카나리아의 카스티야 쪽 짝이다. 마데이라가 포르투갈의 설탕섬이라면
  // 그란카나리아는 1483년에 정복이 끝난 **카스티야의** 설탕섬이었고, 인디아스 함대가
  // 산루카르를 떠나 처음 물과 장작을 싣는 자리가 여기였다. 같은 바다에 깃발이 둘 서게 된다.
  { id: 'laspalmas',  name: '라스팔마스', area: '카나리아',     style: 'latin',     x: 40,  y: 214, flag: 'spain',       seed: 5323, size: 1, industry: 1 },
  { id: 'lisboa',     name: '리스본',     area: '에스트레마두라', style: 'latin',     x: 62,  y: 158, flag: 'portugal',       seed: 3202, size: 3, industry: 3 },
  // 포르투는 리스본이 대양을 보는 동안 **유럽을 보던** 항구다. 두루 강이 상류의 포도주를
  // 실어 내리고, 빌라두콘디·가이아의 선대(船臺)가 미뉴의 소나무로 배를 지었다.
  // 잉글랜드 상인이 모직을 싣고 내려와 포도주를 채워 돌아간 길의 남쪽 끝이 여기다.
  { id: 'porto',      name: '포르투',     area: '두루',         style: 'latin',     x: 46,  y: 146, flag: 'portugal',       seed: 5121, size: 2, industry: 2 },
  { id: 'sevilla',    name: '세비야',     area: '안달루시아',   style: 'latin',     x: 88,  y: 178, flag: 'spain',       seed: 3303, size: 3, industry: 2 },
  // 카디스는 세비야의 **바깥문**이다. 과달키비르 강 모래톱(산루카르 앞의 barra)이
  // 큰 배를 자꾸 걸리게 해 짐이 여기서 갈렸고, 헤레스의 포도주와 카디스만 염전의 소금이
  // 그 배에 실렸다. 카사 데 콘트라타시온의 등록은 세비야에서만 했으니 세는 조금 가볍다.
  { id: 'cadiz',      name: '카디스',     area: '카디스만',     style: 'latin',     x: 70,  y: 190, flag: 'spain',       seed: 5222, size: 2, industry: 2 },
  // 빌바오는 공업력 3이다 — 바스크의 철과 참나무가 한자리에 있어 이베리아 조선의 본산이었다.
  { id: 'bilbao',     name: '빌바오',     area: '비스카야',     style: 'latin',     x: 108, y: 134, flag: 'spain',       seed: 3404, size: 2, industry: 3 },

  // ── 프랑스 대서양안 — 포도주와 소금 ────────────────────────────
  { id: 'bordeaux',   name: '보르도',     area: '기옌',         style: 'latin',     x: 126, y: 126, flag: 'france',      seed: 3505, size: 2, industry: 1 },
  { id: 'larochelle', name: '라로셸',     area: '오니',         style: 'latin',     x: 130, y: 102, flag: 'france',      seed: 3606, size: 2, industry: 1 },
  // 낭트는 루아르 강어귀의 브르타뉴 공국 수도였다(1532년에 프랑스로 합쳐진다).
  // 이 항구가 유럽에 댄 것은 셋이다 — 부르뇌프만의 천일염, 루아르의 포도주, 그리고
  // **브르타뉴 아마포**. 대서양을 다니는 배의 돛과 선원 옷이 거의 다 이 아마포였다.
  { id: 'nantes',     name: '낭트',       area: '브르타뉴',     style: 'latin',     x: 118, y: 98,  flag: 'france',      seed: 5424, size: 2, industry: 1 },

  // ── 잉글랜드·스코틀랜드 ───────────────────────────────────────
  { id: 'bristol',    name: '브리스틀',   area: '서부',         style: 'nordic',    x: 108, y: 76,  flag: 'england',     seed: 3707, size: 2, industry: 2 },
  // 플리머스는 규모 1인데 공업력 2다 — 작은 도시에 배 짓는 손이 몰려 있었다는 뜻이다.
  // 콘월의 **주석**은 유럽이 청동과 백랍을 만드는 원료였고, 뉴펀들랜드 대구 어장으로
  // 나가는 서부 배들이 여기서 소금을 싣고 떠났다. 해협 서쪽 입구를 지키는 자리다.
  { id: 'plymouth',   name: '플리머스',   area: '데번',         style: 'nordic',    x: 104, y: 90,  flag: 'england',     seed: 5525, size: 1, industry: 2 },
  { id: 'london',     name: '런던',       area: '템스',         style: 'nordic',    x: 146, y: 74,  flag: 'england',     seed: 3808, size: 3, industry: 3 },
  // 헐은 험버 강어귀에서 **요크셔 모직을 내보내고 발트를 사들이던** 항구다.
  // 목재·타르·철·아마가 여기로 들어와 잉글랜드 북부의 배와 밧줄이 됐고, 반대로
  // 아이슬란드 어장을 다니는 헐 배들이 건대구를 실어 왔다. 한자와 가장 자주 다툰 잉글랜드 항구.
  { id: 'hull',       name: '헐',         area: '요크셔',       style: 'nordic',    x: 144, y: 58,  flag: 'england',     seed: 5626, size: 2, industry: 2 },
  // 리스는 에든버러의 항구다. 스코틀랜드가 팔 것은 양모·소가죽·청어였고 살 것은
  // 포도주·목재·곡물이었다 — 오랜 동맹(Auld Alliance)이 프랑스 포도주를 여기로 끌어왔다.
  // ★ 깃발은 빌려 쓴다. FLAGS에 스코틀랜드(파란 바탕 흰 사선십자)가 없어 색이 가장 가까운
  //   'france'를 얹었다 — 동맹 관계라 오히려 읽히는 차용이다(근거 JSON의 art.flagTodo).
  { id: 'leith',      name: '리스',       area: '포스',         style: 'nordic',    x: 140, y: 40,  flag: 'france',      seed: 5727, size: 2, industry: 1 },

  // ── 저지대 — 유럽의 시장 ──────────────────────────────────────
  // 깃발을 'spain'으로 둔 것은 이 시기 저지대가 합스부르크령이었기 때문이다.
  // 브뤼헤는 즈윈이 메워져 쇠락 중이라 규모는 크되 공업력이 낮다.
  { id: 'brugge',     name: '브뤼헤',     area: '플랑드르',     style: 'hanseatic', x: 166, y: 90,  flag: 'burgundy',       seed: 3909, size: 3, industry: 1 },
  { id: 'antwerpen',  name: '안트베르펜', area: '브라반트',     style: 'hanseatic', x: 190, y: 80,  flag: 'burgundy',       seed: 4010, size: 3, industry: 2 },
  { id: 'amsterdam',  name: '암스테르담', area: '홀란트',       style: 'hanseatic', x: 178, y: 54,  flag: 'burgundy',       seed: 4111, size: 2, industry: 3 },

  // ── 북해·한자 ─────────────────────────────────────────────────
  { id: 'bergen',     name: '베르겐',     area: '노르웨이',     style: 'nordic',    x: 200, y: 30,  flag: 'denmark', seed: 4212, size: 2, industry: 1 },
  { id: 'hamburg',    name: '함부르크',   area: '엘베',         style: 'hanseatic', x: 224, y: 72,  flag: 'hanse', seed: 4313, size: 2, industry: 2 },

  // ── 발트 ──────────────────────────────────────────────────────
  { id: 'lubeck',     name: '뤼베크',     area: '홀슈타인',     style: 'hanseatic', x: 248, y: 56,  flag: 'hanse', seed: 4414, size: 3, industry: 3 },
  { id: 'kobenhavn',  name: '코펜하겐',   area: '외레순',       style: 'hanseatic', x: 266, y: 36,  flag: 'denmark', seed: 4515, size: 2, industry: 2 },
  // 단치히는 한자 최대 도시였다. 비스와 강이 폴란드의 호밀과 숲을 통째로 실어 내린다.
  { id: 'danzig',     name: '단치히',     area: '프로이센',     style: 'hanseatic', x: 292, y: 66,  flag: 'hanse', seed: 4616, size: 3, industry: 3 },
  // 비스뷔는 **한 세대 늦게 온 손님이 보는 폐허**다. 13~14세기에 이 섬이 노브고로드
  // 무역의 서쪽 끝이었고 『비스뷔 해법』이 발트 전역의 뱃법이었지만, 1361년 덴마크
  // 발데마르 4세가 성을 빼앗은 뒤로는 뤼베크가 그 자리를 가져갔다. 그래서 규모 2 ·
  // 공업력 1이다 — 성벽은 아직 서 있고 물건은 아직 지나가되 값을 정하는 곳은 아니다.
  { id: 'visby',      name: '비스뷔',     area: '고틀란드',     style: 'hanseatic', x: 288, y: 40,  flag: 'denmark', seed: 5828, size: 2, industry: 1 },
  { id: 'stockholm',  name: '스톡홀름',   area: '스웨덴',       style: 'nordic',    x: 306, y: 32,  flag: 'sweden',      seed: 4717, size: 2, industry: 2 },
  { id: 'riga',       name: '리가',       area: '리보니아',     style: 'hanseatic', x: 330, y: 50,  flag: 'hanse', seed: 4818, size: 2, industry: 1 },
  { id: 'reval',      name: '레발',       area: '에스토니아',   style: 'hanseatic', x: 344, y: 30,  flag: 'hanse', seed: 4919, size: 2, industry: 1 },
  // 노브고로드는 **내륙**이다(볼호프 강가). 레발에서만 들어가는 막다른 주머니로 두었다 —
  // 한자의 페터호프가 외지 상인을 막고 있었으니 "관문을 거쳐야 들어간다"가 곧 고증이다.
  { id: 'novgorod',   name: '노브고로드', area: '루시',         style: 'nordic',    x: 378, y: 42,  flag: 'venice',      seed: 5020, size: 2, industry: 0 },
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
  // 이베리아 연안의 사슬 — 포르투는 리스본 위, 카디스는 세비야 아래에 끼어든다.
  // 포르투~브리스틀은 잉글랜드 모직과 포르투갈 포도주가 오간 실제 항해다.
  ['lisboa', 'porto'], ['bilbao', 'porto'], ['bristol', 'porto'],
  ['cadiz', 'sevilla'], ['cadiz', 'lisboa'],
  // 인디아스 함대의 첫 구간 — 산루카르·카디스를 떠나 카나리아에서 물을 싣는다.
  ['cadiz', 'laspalmas'], ['funchal', 'laspalmas'],
  ['bilbao', 'larochelle'], ['bilbao', 'bordeaux'], ['bordeaux', 'larochelle'],
  ['bordeaux', 'bristol'], ['larochelle', 'london'], ['bristol', 'london'],
  ['bergen', 'bristol'],
  // 브르타뉴 — 소금·아마포가 해협을 비스듬히 건너 잉글랜드 서부로 간다.
  ['larochelle', 'nantes'], ['bristol', 'nantes'], ['nantes', 'plymouth'],
  ['bristol', 'plymouth'], ['london', 'plymouth'],
  ['brugge', 'london'], ['antwerpen', 'london'], ['hamburg', 'london'],
  ['antwerpen', 'brugge'], ['amsterdam', 'antwerpen'], ['amsterdam', 'hamburg'],
  ['amsterdam', 'bergen'],
  // 잉글랜드 동안·스코틀랜드 — 요크셔 모직과 스코틀랜드 양모가 북해로 나가는 길.
  // 브뤼헤~리스는 스코틀랜드 스테이플(플랑드르에 둔 지정 시장)로 가는 뱃길이다.
  ['hull', 'london'], ['hamburg', 'hull'], ['bergen', 'hull'],
  ['hull', 'leith'], ['bergen', 'leith'], ['brugge', 'leith'],
  // 함부르크~뤼베크는 배가 아니라 짐이 넘어가는 길이다 — 홀슈타인 지협을 가로지르는
  // 슈테크니츠 운하·육로. 이 지름길이 있었기에 한자가 유틀란트를 도는 뱃길을 건너뛰었다.
  ['hamburg', 'lubeck'],
  ['bergen', 'kobenhavn'], ['kobenhavn', 'lubeck'], ['danzig', 'lubeck'],
  ['danzig', 'kobenhavn'], ['kobenhavn', 'visby'], ['danzig', 'stockholm'],
  ['reval', 'stockholm'], ['danzig', 'riga'], ['reval', 'riga'],
  // 고틀란드는 발트 한가운데 놓인 징검돌이다 — 스웨덴·프로이센·에스토니아 어느 쪽으로도
  // 하루 이틀이면 닿는다. 그것이 이 섬이 한때 발트의 시장이었던 이유이기도 하다.
  ['stockholm', 'visby'], ['danzig', 'visby'], ['reval', 'visby'],
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
  // 리스본~포르투는 이 권역에서 가장 순한 외해다 — 하루면 닿고 피난할 강어귀가 줄지어 있다.
  'lisboa|porto': 5.5,
  // 포르투~빌바오는 핀스테레 곶을 돌아 비스케이만으로 드는 구간이다. 그 곶이 문제다.
  'bilbao|porto': 8.0,
  // 포르투~브리스틀은 뭍을 며칠 안 보는 종단 항해다. 브르타뉴 나포면허선의 사냥터를 지난다.
  'bristol|porto': 8.5,
  // 카디스~세비야는 강어귀다 — 모래톱은 무섭지만 해적은 없다.
  'cadiz|sevilla': 3.0,
  // 카디스~리스본은 상 비센치 곶. 바르바리 코르세어가 알가르브 해안을 덮치던 물이다.
  'cadiz|lisboa': 6.5,
  // 제도로 내려가는 구간 — 카나리아 해류를 등에 지므로 가기는 쉽고 돌아오기가 어렵다.
  'cadiz|laspalmas': 7.5,
  'funchal|laspalmas': 6.5,
  // 비스케이만 — 이 바다에서 가장 악명 높은 물
  'bilbao|larochelle': 9.0,
  'bilbao|bordeaux': 8.0,
  'bordeaux|larochelle': 4.5,
  'bordeaux|bristol': 7.5,
  // 브르타뉴 — 부르뇌프만 소금 배가 늘 오가는 연안은 순하고, 해협 입구를 건너면 값이 뛴다
  'larochelle|nantes': 4.5,
  'bristol|nantes': 8.0,
  'nantes|plymouth': 7.0,
  // 해협 — 짧고 붐비고 사략선이 지킨다
  'bristol|plymouth': 6.5,   // 랜즈엔드 곶을 돈다
  'london|plymouth': 6.0,
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
  // 잉글랜드 동안·스코틀랜드 — 연안은 뭍이 늘 보여 순하고, 북해를 가로지르면 값이 붙는다
  'hull|london': 5.5,
  'hull|leith': 5.0,
  'hamburg|hull': 7.0,
  'bergen|hull': 8.5,       // 아이슬란드·노르웨이 어장으로 나가는 종단 항해
  'bergen|leith': 8.5,
  'brugge|leith': 7.5,      // 스코틀랜드 스테이플로 가는 길 — 해협 입구를 지난다
  // 발트 — 한자의 앞바다
  'hamburg|lubeck': null,
  'kobenhavn|lubeck': 3.5,
  'danzig|lubeck': 4.0,
  'danzig|kobenhavn': 4.0,
  // 코펜하겐~스톡홀름 직선은 스칸디나비아 남단을 관통한다(축척 탓이고 실제로도 고틀란드를
  //   거쳐 갔다) — 외레순에서 고틀란드로 잇고, 스톡홀름은 비스뷔·단치히에서 닿는다.
  'kobenhavn|visby': 4.0,
  'danzig|stockholm': 4.5,
  'reval|stockholm': 5.0,
  'danzig|riga': 4.5,
  'reval|riga': 3.5,
  // 고틀란드 — 발트에서도 가장 순한 물이다. 다만 한자가 승자병단(Victual Brothers)을
  // 이 섬에서 몰아낸 것이 15세기 초의 일이라 아주 옛날 이야기는 아니다.
  'stockholm|visby': 3.5,
  'danzig|visby': 4.5,
  'reval|visby': 4.0,
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
  'lisboa|porto':       { from: 'porto',      push: 0.08 },  // 같은 해류의 위쪽 토막
  'funchal|sevilla':    { from: 'sevilla',    push: 0.11 },  // 카나리아 해류 — 제도로 내려가는 물
  'cadiz|laspalmas':    { from: 'cadiz',      push: 0.11 },  // 인디아스 함대가 이 물을 타고 내려갔다
  'bergen|bristol':     { from: 'bristol',    push: 0.07 },  // 북대서양 해류 — 북동으로 밀어 올린다
  'bilbao|larochelle':  { from: 'bilbao',     push: 0.05 },
  'larochelle|london':  { from: 'larochelle', push: 0.06 },  // 해협으로 밀려드는 조류
  'brugge|london':      { from: 'london',     push: 0.05 },  // 해협의 잔류류는 동쪽으로 빠진다
  'bergen|kobenhavn':   { from: 'kobenhavn',  push: 0.06 },  // 유틀란트 연안을 북상하는 물
  'kobenhavn|lubeck':   { from: 'lubeck',     push: 0.05 },  // 발트 표층수가 해협 밖으로 흘러 나간다
};
