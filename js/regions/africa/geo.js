// regions/africa/geo.js — 아프리카의 지리
//
// ★ 이 권역에는 **바다가 둘** 있다. 서안(대서양)과 동안(인도양)은 바람도 해류도 상인도
//   서로 남남이었고, 그 둘을 잇는 것은 희망봉 하나뿐이었다. 지도도 그렇게 그렸다 —
//   왼쪽 세로줄(기니만·앙골라)과 오른쪽 세로줄(스와힐리 해안)을 **항로로 잇지 않고**
//   아래 가운데를 비워 뒤집힌 U자로 뒀다. 두 해안을 오가는 유일한 길은
//   `js/regions/index.js: OCEAN_LANES`의 `luanda~mocambique`(26일·요율 11.0)다.
//   그 선 하나가 이 권역의 심장이고, "이 배로 저기까지 갈 수 있는가"라는 판단을 만든다.
//
// 좌표계: 이 권역 전용 400×225. 다른 권역의 (141,63)과는 아무 관계가 없다.
//   실제 위경도를 옮기지 않고 **놀기 좋은 도식**으로 폈다 — 기니만은 실제보다 짧게,
//   스와힐리 해안은 실제보다 곧게 늘였다. 도시 간 최소 간격 21px, 이름표(한글 글자당 6px,
//   도시 위쪽 박스)가 이웃 표식을 덮지 않는 것을 좌표마다 계산해 확인했다.
//
// ── 깃발·화풍에 대하여 (읽고 넘어갈 것) ─────────────────────────
//   `FLAGS`에 아직 포르투갈이 없다. 이 해안의 유럽 요새는 전부 포르투갈 것이었으므로
//   가장 가까운 이베리아 깃발 `spain`을 빌려 썼다(1580~1640년 두 왕관이 한 사람 것이었던
//   기간을 근거로 삼는다). 스와힐리·베냉 같은 아프리카 세력은 유럽이 아닌 깃발 중
//   가장 덜 어긋나는 `hafsid`(마그레브 이슬람)를 빌렸다. 둘 다 근거 JSON의
//   `art.flagTodo`에 "무엇을 그려야 하는지"를 적어 뒀다 — 그림이 생기면 이 줄만 고치면 된다.
//   화풍(`STYLES`)은 갖춰졌다 — 산호석 도시는 `swahili`, 흙벽·이엉은 `guinea`,
//   포르투갈 요새는 `colonial`(회벽 능보)이다. 희망봉만 맞는 화풍이 없어 guinea를 쓴다.

/** 도시의 지리·외형. 필드 설명은 `js/regions/mediterranean/geo.js`가 정본이다.
    size     1~3 시장 깊이와 입항세
    industry 0~3 조선 공업력 — `SHIPS[].tier` 이상이어야 그 배를 짓는다(원산국 항구는 −1) */
export const CITIES = [
  // ── 서안: 대서양 ─────────────────────────────────────────────
  // 아르갱 — 포르투갈이 1445년에 세운 첫 해외 상관. 사하라 서쪽 끝의 모래섬이라
  // 뭍에서 나는 것이 없고, 대상로가 내려놓는 사금과 아우릴 염전의 소금만이 값어치다.
  // ★ 이 항구가 대서양 노예무역의 첫 거점이기도 했다는 사실은 근거 JSON에 적었다 —
  //   사람은 교역품으로 만들지 않는다(goods.js 머리말 참조).
  { id: 'arguin',     name: '아르갱',   area: '사하라 해안',   style: 'colonial', x: 44,  y: 32,  flag: 'spain',  seed: 4101, size: 1, industry: 1 },
  // 산티아구(히베이라 그란지) — 1462년 정착. 열대 최초의 유럽 상설 도시이고
  // 기니 해안으로 나가는 배가 모두 여기서 물과 면포를 싣는다.
  { id: 'santiago',   name: '산티아구', area: '카보베르데',    style: 'colonial', x: 22,  y: 62,  flag: 'spain',  seed: 4102, size: 2, industry: 1 },
  // 아심 — 앙코브라 강이 사금을 실어 내리는 자리. 1515년 산투 안토니우 요새.
  { id: 'axim',       name: '아심',     area: '황금해안',      style: 'colonial', x: 52,  y: 100, flag: 'spain',  seed: 4103, size: 1, industry: 1 },
  // 엘미나(상 조르즈 다 미나) — 1482년. **이 권역 전체의 이유**다.
  // 16세기 초 이 해안에서 해마다 금 680kg(24,000온스)이 나갔고 그것이 당시 세계 금 공급의 1/10이었다.
  { id: 'elmina',     name: '엘미나',   area: '황금해안',      style: 'colonial', x: 80,  y: 92,  flag: 'spain',  seed: 4104, size: 2, industry: 1 },
  // 그웨이토(우그호톤) — 베냉 왕국의 강어귀 외항. 도시 본체는 뭍 안쪽이라
  // 여기는 오바의 세관이 서는 자리에 가깝다. 유럽선은 여기까지만 들어왔다.
  { id: 'gwato',      name: '그웨이토', area: '베냉',          style: 'guinea',   x: 118, y: 100, flag: 'hafsid', seed: 4105, size: 2, industry: 1 },
  // 상투메 — 1493년 정착, 1515년 물레방아 제당소가 들어서면서 섬 전체가 사탕수수밭이 됐다.
  // 1595년 반란 때 불탄 것만 제당소 85곳 중 60곳. 먹을 것은 죄다 배로 들어온다.
  { id: 'saotome',    name: '상투메',   area: '기니만',        style: 'colonial', x: 124, y: 128, flag: 'spain',  seed: 4106, size: 2, industry: 1 },
  // 루안다 — 1576년. 콩고 왕국이 화폐로 쓰던 은질부 조개가 앞바다 섬에서 나고,
  // 카탕가의 구리 십자 주괴가 강을 타고 내려온다. 희망봉으로 나가는 서안의 마지막 큰 항구.
  { id: 'luanda',     name: '루안다',   area: '앙골라',        style: 'colonial', x: 80,  y: 156, flag: 'spain',  seed: 4107, size: 2, industry: 1 },
  // 벵겔라 — 뭍은 사막이고 앞바다는 차가운 벵겔라 해류다. 배후 고원의 상아가 유일한 밑천.
  { id: 'benguela',   name: '벵겔라',   area: '앙골라',        style: 'guinea',   x: 66,  y: 180, flag: 'spain',  seed: 4108, size: 1, industry: 1 },
  // 희망봉 — ★ 이 시대엔 **도시가 아니다.** 유럽인의 상설 정착은 1652년에야 생긴다.
  //   그 전까지는 배가 물을 긷고 코이코이와 소·양을 물물교환하던 정박지였을 뿐이다.
  //   그래서 size 1 · industry 0(배를 못 짓는다) · 입항세 1%(세관이 없다)로 뒀다.
  //   깃발도 임자가 없어 지나가는 유럽 선단의 것으로 뒀다 — 알고 그렇게 둔 것이다.
  { id: 'cabo',       name: '희망봉',   area: '아굴라스',      style: 'guinea',   x: 146, y: 200, flag: 'spain',  seed: 4109, size: 1, industry: 0 },

  // ── 동안: 인도양 · 스와힐리 해안 ─────────────────────────────
  // ★ 이 해안은 포르투갈이 오기 훨씬 전부터 촘촘한 무역망이었다. 킬와·몸바사·말린디는
  //   서로 경쟁하는 도시국가였고, 포르투갈은 그 위에 얹혔을 뿐 시작이 아니다.
  //   blurb와 근거 서술을 그 순서로 적었다.
  // 소팔라 — 무타파(대짐바브웨)의 금이 마니카를 거쳐 바다로 나오는 문. 1505년 상 카에타누 요새.
  { id: 'sofala',     name: '소팔라',   area: '무타파',        style: 'colonial', x: 228, y: 182, flag: 'spain',  seed: 4110, size: 1, industry: 0 },
  // 모잠비크 섬 — 희망봉을 돈 인도 항로 선단이 **처음 닻을 내리는 자리**다.
  // 생산지가 아니라 배를 고치고 겨울을 나는 곳이라 industry를 2로 뒀다.
  { id: 'mocambique', name: '모잠비크', area: '모잠비크',      style: 'colonial', x: 256, y: 158, flag: 'spain',  seed: 4111, size: 2, industry: 2, prizeYard: true },
  // 킬와 — 12세기에 소팔라의 금을 빼앗아 스와힐리 해안의 맹주가 된 술탄국.
  // 1505년 알메이다가 500명을 상륙시켜 무너뜨린 뒤로는 궁전만 남았다.
  { id: 'kilwa',      name: '킬와',     area: '스와힐리',      style: 'swahili',  x: 282, y: 130, flag: 'hafsid', seed: 4112, size: 2, industry: 1 },
  // 잔지바르 — 뭍의 물건과 바다 건너 물건이 임자를 바꾸는 중개상의 섬.
  // 포르투갈은 1503년에 조공만 받아 갔을 뿐 요새도 수비대도 두지 않았다(1591년 영국선 기록).
  { id: 'zanzibar',   name: '잔지바르', area: '스와힐리',      style: 'swahili',  x: 302, y: 112, flag: 'hafsid', seed: 4113, size: 2, industry: 1 },
  // 몸바사 — 이 해안 최대의 항구이자 가장 완강하게 저항한 도시. 1500·1505·1528·1589년에
  // 네 번 불탔고 그때마다 다시 섰다. 다우 건조 전통이 있어 industry 2.
  { id: 'mombasa',    name: '몸바사',   area: '스와힐리',      style: 'swahili',  x: 320, y: 90,  flag: 'hafsid', seed: 4114, size: 3, industry: 2 },
  // 말린디 — 몸바사의 숙적이라 포르투갈과 손을 잡았다. 1498년 다 가마를 환대한 도시로
  // 그때 인구 5,000~10,000. 유럽 배에 관세가 헐한 것이 이 도시의 성격이다.
  { id: 'malindi',    name: '말린디',   area: '스와힐리',      style: 'swahili',  x: 338, y: 78,  flag: 'hafsid', seed: 4115, size: 2, industry: 1 },
  // 라무·파테 군도 — 뱃집의 섬. 못 하나 안 쓰고 야자 노끈으로 판자를 꿰매는
  // 므템베 목수들이 여기 있었다. 1506년 포르투갈 봉쇄로 연 600메티칼의 조공을 물었다.
  { id: 'lamu',       name: '라무',     area: '스와힐리',      style: 'swahili',  x: 354, y: 54,  flag: 'hafsid', seed: 4116, size: 2, industry: 2 },
  // 모가디슈 — 이븐 바투타가 "지극히 큰 도시"라 적은 곳. 토브 베나디르라 불린 직물을
  // 이집트와 시리아로 내다 팔았다. 이 권역에서 유일하게 **만든 것을 수출하는** 항구다.
  { id: 'mogadishu',  name: '모가디슈', area: '베나디르',      style: 'swahili',  x: 364, y: 32,  flag: 'hafsid', seed: 4117, size: 3, industry: 1 },
];

/* 항로 — ★ 서안과 동안을 **잇지 않았다.** 벵겔라~희망봉에서 서안이 끊기고,
   동안은 소팔라에서 시작한다. 둘 사이는 원양 항로 `luanda~mocambique`뿐이다.
   희망봉을 지도상 벵겔라의 막다른 가지로 둔 것도 같은 이유다 — 여기에 소팔라행 선을
   그으면 26일짜리 원양 항로를 우회하는 지름길이 생겨 이 권역의 긴장이 통째로 사라진다.
   희망봉은 "건너기 전에 물을 긷는 자리"이지 건너는 길이 아니다. */
export const ROUTES = [
  // 서안 — 카나리아 해류를 타고 남하하는 외길. 되짚어 올라오는 것이 늘 더 어려웠다.
  ['arguin', 'santiago'], ['arguin', 'elmina'],
  ['santiago', 'elmina'], ['santiago', 'axim'],
  ['axim', 'elmina'],
  ['elmina', 'gwato'], ['gwato', 'saotome'],
  ['saotome', 'luanda'], ['luanda', 'benguela'],
  ['benguela', 'cabo'],

  // 동안 — 이미 촘촘했던 스와힐리 연안망. 사슬 하나에 킬와~몸바사 직항을 얹어
  // "잔지바르를 건너뛸 것인가"라는 선택만 남겼다(다 이으면 거미줄이 된다).
  ['sofala', 'mocambique'], ['sofala', 'kilwa'],
  ['mocambique', 'kilwa'],
  ['kilwa', 'zanzibar'], ['kilwa', 'mombasa'],
  ['zanzibar', 'mombasa'],
  ['mombasa', 'malindi'], ['malindi', 'lamu'], ['lamu', 'mogadishu'],
];

/* 항로 위험도 — **당대 해상보험 요율(%)**.
   지중해 앵커(2.0 내해 · 4.0 평범한 연안 · 6~8 외해·병목 · 9~11 사략 소굴·무기항)를
   그대로 쓰되, 이 바다에는 지중해에 없는 변수가 둘 더 있다:

     ① **뭍에 기댈 데가 없다.** 사하라 해안과 나미브 해안은 며칠을 가도 물도 사람도 없다.
        난파가 곧 전멸이라 요율이 지중해 연안보다 두 단계 높다.
     ② **돌아오는 길이 더 위험하다.** 카나리아·벵겔라 해류와 무역풍이 전부 한 방향이라
        남하는 쉽고 북상은 어렵다. 요율은 방향을 못 나누므로 왕복 평균으로 얹었다.

   실제 손실률: 포르투갈 인도 항로는 1586~90년에 무사 귀항이 40% 미만까지 떨어졌고,
   선원 사망은 좋은 해에도 1/3, 나쁘면 절반이었다. 코헨치스 곶 부근에서만 항해 선박의
   약 30%가 전복·좌초했다 — 인도 항로 전체에서 가장 많은 수다.
   이 권역 평균 요율이 6.3%로 지중해(≈5.5%)보다 높은 것은 그래서다.

   근거·출처는 `content/regions/africa-evidence.json`의 routes 절이 정본이고
   `node tools/check-routes.mjs`가 이 표와 어긋나면 실패시킨다. */
export const ROUTE_RISK = {
  // 서안
  'arguin|santiago': 8.0,   // 뭍이 보이지 않는 대양 구간
  'arguin|elmina':   9.0,   // 사하라~기니, 무기항 최장 구간. 북상은 사실상 불가에 가까웠다
  'elmina|santiago': 8.5,
  'axim|santiago':   8.0,
  'axim|elmina':     4.0,   // 요새 둘 사이의 짧은 연안. 이 권역에서 가장 안전하다
  'elmina|gwato':    6.5,   // 기니만 무풍대의 초입
  'gwato|saotome':   7.0,   // 무풍대 한복판 — 바람이 죽으면 몇 주를 떠 있는다
  'luanda|saotome':  8.0,   // 적도 무풍대를 지나 남하. 남행이 특히 더디다
  'benguela|luanda': 5.0,   // 벵겔라 해류를 타는 연안 구간
  'benguela|cabo':   9.5,   // 나미브 사막 해안 — 물도 사람도 없고 남서풍 파도가 높다

  // 동안
  'kilwa|sofala':     5.5,
  'mocambique|sofala': 4.5,
  'kilwa|mocambique': 5.0,
  'kilwa|zanzibar':   4.0,
  'kilwa|mombasa':    6.0,  // 잔지바르를 건너뛰는 외해 지름길
  'mombasa|zanzibar': 4.0,
  'malindi|mombasa':  5.0,  // 하루 거리인데도 두 도시가 서로 적대라 값이 붙는다
  'lamu|malindi':     4.5,
  'lamu|mogadishu':   7.5,  // 소말리 해안 — 항구가 드물고 해류가 사납다
};

/* 해류·계절풍 — 이 권역은 지중해와 달리 **거의 모든 구간에 물길이 있다.**
   그것이 이 바다의 성격이다.

     서안: 카나리아 해류가 북서아프리카를 남하하고, 기니 해류가 기니만을 동쪽으로 민다.
           앙골라 앞바다에서는 벵겔라 해류가 반대로 **북상**한다 — 그래서 남쪽으로 내려가는
           것이 유독 어렵다. 포르투갈이 볼타 두 마르(대양으로 크게 돌아 나가는 항법)를
           고안한 이유가 이것이다.
     동안: 동아프리카 연안류가 사철 북상한다. 계절풍이 겹치면 여름에는 소말리 해류가
           맹렬히 북으로 흐른다 — 라무~모가디슈 구간의 push가 가장 큰 것은 그래서다.

   `from` 방향으로 가면 물길을 타고 거스르면 그만큼 느리다. */
export const CURRENTS = {
  // 서안 — 남하와 동진은 물길, 되짚는 것은 노동
  'arguin|santiago':  { from: 'arguin',   push: 0.10 },  // 카나리아 해류
  'arguin|elmina':    { from: 'arguin',   push: 0.12 },
  'elmina|santiago':  { from: 'santiago', push: 0.08 },
  'axim|santiago':    { from: 'santiago', push: 0.08 },
  'axim|elmina':      { from: 'axim',     push: 0.08 },  // 기니 해류는 동향
  'elmina|gwato':     { from: 'elmina',   push: 0.10 },
  'gwato|saotome':    { from: 'gwato',    push: 0.06 },
  'luanda|saotome':   { from: 'luanda',   push: 0.08 },  // 벵겔라 해류가 북상 — 남행이 역류다
  'benguela|luanda':  { from: 'benguela', push: 0.12 },
  'benguela|cabo':    { from: 'cabo',     push: 0.12 },  // 곶에서 북으로 밀어 올린다

  // 동안 — 동아프리카 연안류가 사철 북상한다
  'mocambique|sofala': { from: 'sofala',     push: 0.08 },
  'kilwa|sofala':      { from: 'sofala',     push: 0.08 },
  'kilwa|mocambique':  { from: 'mocambique', push: 0.10 },
  'kilwa|zanzibar':    { from: 'kilwa',      push: 0.08 },
  'kilwa|mombasa':     { from: 'kilwa',      push: 0.08 },
  'mombasa|zanzibar':  { from: 'zanzibar',   push: 0.08 },
  'malindi|mombasa':   { from: 'mombasa',    push: 0.08 },
  'lamu|malindi':      { from: 'malindi',    push: 0.10 },
  'lamu|mogadishu':    { from: 'lamu',       push: 0.12 },  // 여름 소말리 해류
};
