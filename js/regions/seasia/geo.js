// regions/seasia/geo.js — 동남아·향료제도의 지리
//
// ★ 이 파일은 "어디에 무엇이 있고 어떻게 이어지는가"만 다룬다.
//   산지·수요지 같은 경제 수치는 `trade.js`에 있고, 둘은 `id`로만 맞물린다.
//
// 좌표계는 **이 권역 전용 400×225**다. 다른 권역의 좌표와 아무 관계가 없다.
//
// ── 이 지도를 이렇게 그린 이유 ────────────────────────────────
// 이 바다의 게임성은 **"서에서 동으로 갈수록 멀고 값지다"** 한 줄로 요약된다.
// 그래서 실제 위경도를 옮기는 대신 **값어치의 축을 x축에 그대로 얹었다** —
//
//   왼쪽 위(x 20~130)   말라카 해협. 세계의 목이자 이 권역의 관문.
//   위쪽 띠(x 40~130)   버마·샴·반도 동안. 쌀과 소목이 나는 뭍의 시장.
//   가운데 아래(x 150~260) 자바 북안. 쌀을 대고 배를 짓고 짐을 나르는 중개자.
//   오른쪽 가운데(x 250~300) 보르네오·술라웨시. 장뇌·제비집과 자유항.
//   오른쪽 끝(x 340~380)  향료제도. 정향과 육두구가 나는 유일한 섬들.
//
// 그래서 지도 위에서 **오른쪽으로 갈수록 배가 커야 하고 손해도 커진다.**
// 원양 항로 둘(`nagapattinam~melaka` · `melaka~guangzhou`)이 모두 왼쪽 위 믈라카에
// 닿는다 — 인도에서 온 면포와 중국으로 갈 향료가 이 한 점에서 만난다.
//
// ★ 아유타야는 **내륙**이다(차오프라야 강 상류). 배가 못 닿는 자리라 파타니에서만
//   이어지는 막다른 주머니로 뒀고, 페구와는 뭍길로만 잇는다(지중해의 부르사와 같은 처리).
//   "안쪽까지 들어가면 쌀과 소목을 원가에 산다"가 이 주머니의 값어치다.
//
// 이름표 겹침은 좌표를 정한 뒤 계산했다(한글 글자당 6px · 도시 위쪽에 박스째).
// 가장 붐비는 곳은 해협의 아체~파세~페락~믈라카~조호르 다섯이라, x를 벌리면서
// y를 12~16px씩 층지게 내려 **표가 이웃의 표식을 덮지 않게** 계단으로 앉혔다.
// '순다칼라파'는 다섯 글자라 표 폭이 30px이다 — 반텐과 투반 사이 빈 곳에 혼자 뒀다.

/** 도시의 지리·외형. 필드 뜻은 `js/regions/mediterranean/geo.js`가 정본이다.
    flag  — 이 바다는 말레이·자바·마카사르·말루쿠의 술탄국과 상좌부 불교 왕국이 뒤섞였는데
           `sprites/ship.js: FLAGS`에는 그중 어느 깃발도 없다. 그래서
           **무슬림 술탄국은 'ottoman'(초록), 상좌부 뭍 왕국(샴·버마)은 'hafsid'(흰 바탕)**,
           **포르투갈이 요새를 세운 암본만 'spain'**을 빌렸다. 화면에서 세 세력이
           갈라져 보이게 하는 것이 목적이다. 근거 JSON의 art.flagTodo 참조.
    style — 'malay'(야자 이엉 고상가옥·다층 목조 므루·정글 구릉·대나무 부두)가 이 바다의 기본이고,
           포르투갈이 요새를 세운 암본만 'colonial'이다. 금박 쁘랑과 체디의 샴·버마 화풍은
           아직 없어 페구·아유타야도 malay를 쓴다(styleTodo).
    industry — 이 권역의 상한 3은 **자바 북안(투반·그레식)과 버마 페구**뿐이다.
           종(jong)을 짓던 곳이 거기이기 때문이다 — 믈라카는 세계 제일의 시장이었지만
           소금조차 실어다 먹던 중계항이라 큰 배를 짓는 곳이 아니었다.
           향료제도는 0~1이다. 작고 멀고 사람이 적다.
    prizeYard — 조호르. 믈라카를 빼앗긴 뒤 술탄가는 오랑 라우트를 데리고 해협에서
           포르투갈 배를 털어 먹고살았다. 나포선 개조가 함대 확보의 주된 수단이었다. */
export const CITIES = [
  // ── 뭍의 왕국: 버마·샴 ────────────────────────────────────
  // 페구는 버마 티크로 종(jong)을 지어 팔던 곳이다. 인도양 쪽 관문이라 아체와만 잇는다.
  // 아유타야는 강을 한참 거슬러 올라간 내륙 수도 — 왕실이 교역을 독점했다.
  { id: 'pegu',        name: '페구',       area: '버마',         style: 'malay',    x: 40,  y: 32,  flag: 'hafsid',  seed: 6101, size: 2, industry: 3 },
  { id: 'ayutthaya',   name: '아유타야',   area: '샴',           style: 'malay',    x: 104, y: 38,  flag: 'hafsid',  seed: 6102, size: 3, industry: 0 },
  { id: 'patani',      name: '파타니',     area: '반도 동안',    style: 'malay',    x: 126, y: 66,  flag: 'ottoman', seed: 6103, size: 2, industry: 2 },

  // ── 말라카 해협 — 세계의 목 ───────────────────────────────
  // 좁고 얕고 섬이 많아 **배가 반드시 뭍 가까이로 붙어야 지나간다.** 그 자리가
  // 오랑 라우트의 자리였다. 아체는 그 해협의 서쪽 문을 쥐고 포르투갈령 믈라카와
  // 평생 싸웠고, 후추를 홍해로 직송해 유럽의 향료 값을 흔들었다.
  { id: 'aceh',        name: '아체',       area: '수마트라 북단', style: 'malay',    x: 22,  y: 76,  flag: 'ottoman', seed: 6104, size: 3, industry: 2 },
  { id: 'pasai',       name: '파세',       area: '수마트라 북안', style: 'malay',    x: 38,  y: 95,  flag: 'ottoman', seed: 6105, size: 2, industry: 1 },
  { id: 'perak',       name: '페락',       area: '반도 서안',    style: 'malay',    x: 88,  y: 88,  flag: 'ottoman', seed: 6106, size: 1, industry: 1 },
  // ★ 관문 항구. `OCEAN_LANES`의 nagapattinam~melaka(인도)와 melaka~guangzhou(중국)가
  //   둘 다 여기 닿는다. 이 id를 바꾸면 두 대양이 끊긴다.
  //   믈라카 자체는 아무것도 나지 않는다 — 생선 절일 소금까지 실어다 썼다.
  //   그 성격을 지키려고 supply를 주석(tin) 하나로만 뒀다(몰타와 같은 처리).
  { id: 'melaka',      name: '믈라카',     area: '말라카 해협',  style: 'malay',    x: 106, y: 104, flag: 'ottoman', seed: 6107, size: 3, industry: 2 },
  { id: 'johor',       name: '조호르',     area: '반도 남단',    style: 'malay',    x: 124, y: 118, flag: 'ottoman', seed: 6108, size: 2, industry: 2, prizeYard: true },

  // ── 자바·순다 — 쌀과 배와 중개 ────────────────────────────
  // 자바는 향료를 **먹는 곳이 아니라 나르는 곳**이다. 말루쿠에서 정향을 실어다
  // 믈라카에 넘기고, 대신 쌀을 동쪽 섬으로 올려 보냈다. 그래서 여기에는
  // 정향 수요를 두지 않았다 — 중개자가 소비자가 되면 향료가 자바에서 끝나 버린다.
  { id: 'banten',      name: '반텐',       area: '순다',         style: 'malay',    x: 150, y: 170, flag: 'ottoman', seed: 6109, size: 3, industry: 2 },
  { id: 'sundakelapa', name: '순다칼라파', area: '순다',         style: 'malay',    x: 186, y: 178, flag: 'ottoman', seed: 6110, size: 2, industry: 1 },
  { id: 'tuban',       name: '투반',       area: '자바 북안',    style: 'malay',    x: 232, y: 170, flag: 'ottoman', seed: 6111, size: 2, industry: 3 },
  { id: 'gresik',      name: '그레식',     area: '자바 북안',    style: 'malay',    x: 252, y: 178, flag: 'ottoman', seed: 6112, size: 2, industry: 3 },

  // ── 보르네오·술라웨시 ─────────────────────────────────────
  // 브루나이는 장뇌와 동굴 제비집이 나가는 항구, 마카사르는 **누구에게나 열린 자유항**이다.
  // 마카사르가 이 바다에서 갖는 뜻은 향료를 대는 것이 아니라 **말루쿠에 쌀을 대는 것**이었다.
  { id: 'brunei',      name: '브루나이',   area: '보르네오',     style: 'malay',    x: 250, y: 96,  flag: 'ottoman', seed: 6113, size: 2, industry: 2 },
  { id: 'makassar',    name: '마카사르',   area: '술라웨시',     style: 'malay',    x: 300, y: 140, flag: 'ottoman', seed: 6114, size: 2, industry: 2 },

  // ── 향료제도(말루쿠) — 세계에서 여기서만 난다 ──────────────
  // 작고 멀고 값비싼 섬들이다. size 1 · industry 0~1이 그 성격이다.
  // 테르나테와 티도레는 마주 보는 두 화산섬이고 서로를 평생 쳤다. 반다는 육두구가 나는
  // **세계 유일의 곳**인데 인구가 3천이 못 됐고 쌀 한 톨 안 났다 — 몰타가 그렇듯,
  // 이 섬들은 먹을 것을 사들여야 산다. 그것이 이 바다에서 왕복이 성립하는 이유다.
  { id: 'ternate',     name: '테르나테',   area: '말루쿠',       style: 'malay',    x: 352, y: 62,  flag: 'ottoman', seed: 6115, size: 1, industry: 1 },
  { id: 'tidore',      name: '티도레',     area: '말루쿠',       style: 'malay',    x: 368, y: 78,  flag: 'ottoman', seed: 6116, size: 1, industry: 1 },
  // 암본만 'spain'(포르투갈 대용) — 요새를 끼고 독점을 강요하던 항구다.
  // 마카사르의 자유항과 정면으로 대비시키려고 입항세도 이 권역 최고로 뒀다.
  { id: 'ambon',       name: '암본',       area: '말루쿠',       style: 'colonial', x: 344, y: 126, flag: 'spain',   seed: 6117, size: 1, industry: 1 },
  { id: 'banda',       name: '반다',       area: '반다 제도',    style: 'malay',    x: 372, y: 150, flag: 'ottoman', seed: 6118, size: 1, industry: 0 },
];

/* 항로 — 권역 안의 연결만 적는다. 다른 권역으로 나가는 선은 `js/regions/index.js: OCEAN_LANES`.
   ★ 이 그래프는 **한 줄기 긴 뱀**에 가깝게 짰다. 해협에서 자바를 지나 술라웨시를 거쳐
     향료제도에 닿는 동안 항구를 열 곳 넘게 지나야 한다 — 지름길이 없다는 것이
     "정향은 멀어서 비싸다"를 규칙으로 만드는 유일한 방법이다.
   ★ 아유타야는 파타니에서만, 페구는 아체와 아유타야에서만 이어진다(막다른 주머니). */
export const ROUTES = [
  // 뭍의 왕국 — 페구·아유타야는 뭍길로 이어진 주머니다
  ['pegu', 'ayutthaya'], ['pegu', 'aceh'],
  ['ayutthaya', 'patani'],
  ['patani', 'johor'], ['patani', 'brunei'],
  // 말라카 해협 — 양 기슭을 지그재그로 건넌다. 해협을 통째로 가로지르는
  // aceh~melaka 직항을 남겨 두되 요율을 이 권역 최고로 매겼다(9.5).
  ['aceh', 'pasai'], ['aceh', 'melaka'],
  ['pasai', 'perak'], ['pasai', 'melaka'],
  ['perak', 'melaka'],
  ['melaka', 'johor'],
  // 해협에서 자바로 — 카리마타 쪽 외해를 건넌다
  ['johor', 'banten'],
  ['banten', 'sundakelapa'], ['sundakelapa', 'tuban'], ['tuban', 'gresik'],
  // 자바해 — 산호초가 깔린 얕은 바다
  ['gresik', 'brunei'], ['gresik', 'makassar'],
  ['brunei', 'makassar'],
  // 향료제도로 — 여기서부터가 이 권역의 끝자락이다
  ['makassar', 'ternate'], ['makassar', 'ambon'], ['makassar', 'banda'],
  ['ternate', 'tidore'], ['ternate', 'ambon'], ['tidore', 'ambon'],
  ['ambon', 'banda'],
];

/* 항로 위험도 — **당대 해상보험 요율(%)**이다.
   ★ 이 바다에는 지중해의 제노바 장부 같은 요율 사료가 없다. 그래서 값은
     **지중해 앵커에 이 바다의 사실을 얹어** 매겼다(그래서 대부분 probable이다):
       · 병목: 말라카 해협은 가장 좁은 곳이 2.8km(필립스 수로)이고 최소 수심이 25m다.
         큰 배가 반드시 뭍 가까이로 붙어 지나가야 하는 자리라 오랑 라우트가 앉았다.
       · 적대: 아체·조호르·포르투갈령 믈라카가 삼각으로 싸웠다. 해협을 통째로 가로지르는
         구간(아체~믈라카)이 이 권역에서 가장 위험한 이유다.
       · 외해: 남중국해 횡단(파타니~브루나이)과 향료제도행은 며칠씩 뭍이 안 보인다.
       · 자바해는 얕고 산호초가 깔려 있다 — 해적이 아니라 좌초가 값을 올린다.
   null = 해적 개념이 없는 구간. 여기서는 페구~아유타야 뭍길뿐이다.
   판정과 출처는 `content/regions/seasia-evidence.json`이 정본이고
   `node tools/check-routes.mjs`가 이 표와 어긋나면 실패시킨다. */
export const ROUTE_RISK = {
  'ayutthaya|pegu': null,       // 버마-샴 뭍길. 배가 안 뜬다
  'aceh|pegu': 7.5,             // 안다만해 횡단 — 외해
  'ayutthaya|patani': 5.0,      // 샴만 연안
  'johor|patani': 5.5,          // 반도 동안 연안
  'brunei|patani': 9.0,         // 남중국해 횡단. 며칠씩 뭍이 안 보인다
  'aceh|pasai': 4.0,            // 같은 세력권의 짧은 연안
  'aceh|melaka': 9.5,           // ★ 해협 전 구간. 좁고 얕고 적대 — 이 권역 최고 요율
  'pasai|perak': 7.0,           // 해협 횡단
  'melaka|pasai': 8.0,          // 해협 병목 안쪽
  'melaka|perak': 6.5,          // 해협 북쪽 좁은 물목
  'johor|melaka': 6.0,          // 해협 남단 — 섬이 빽빽하고 뱃길이 하나다
  'banten|johor': 8.0,          // 카리마타 쪽 외해
  'banten|sundakelapa': 3.0,    // 순다 연안. 한 세력의 안뜰이다
  'sundakelapa|tuban': 5.0,     // 자바 북안 연안 항해
  'gresik|tuban': 3.0,          // 이웃 항구
  'brunei|gresik': 8.0,         // 자바해 횡단 — 산호초와 얕은 물
  'gresik|makassar': 7.0,       // 자바해 동쪽
  'brunei|makassar': 7.5,       // 마카사르 해협
  'makassar|ternate': 8.5,      // 향료제도로 가는 먼 뱃길
  'ambon|makassar': 7.5,
  'banda|makassar': 9.0,        // 밀무역선이 다니던 가장 먼 향료 항로
  'ternate|tidore': 6.0,        // 짧지만 숙적끼리 마주 본 해협이다
  'ambon|ternate': 7.0,
  'ambon|tidore': 7.0,
  'ambon|banda': 6.5,
};

/* 해류·계절풍 — 이 바다의 리듬은 조류가 아니라 **계절풍**이다.
   남서 계절풍(여름)이면 서에서 동으로, 북동 계절풍(겨울)이면 동에서 서로 분다.
   CURRENTS에는 계절 개념이 없으므로 **향료를 실으러 나가는 철**(동쪽으로 가는 길)을
   물길로 새겼다 — 돌아오는 길은 반대 계절풍을 기다려야 한다는 뜻이 된다.
   예외는 둘이다: 남중국해는 겨울 북동풍이 반도에서 보르네오 쪽으로 밀고,
   벵골만에서는 배가 남하해 아체로 들어온다. */
export const CURRENTS = {
  'aceh|pegu':          { from: 'pegu',        push: 0.06 },
  'brunei|patani':      { from: 'patani',      push: 0.06 },  // 겨울 북동 계절풍
  'aceh|melaka':        { from: 'aceh',        push: 0.08 },  // 해협을 남동으로 흐르는 물
  'johor|melaka':       { from: 'melaka',      push: 0.05 },
  'banten|johor':       { from: 'johor',       push: 0.06 },
  'sundakelapa|tuban':  { from: 'sundakelapa', push: 0.06 },
  'gresik|tuban':       { from: 'tuban',       push: 0.05 },
  'gresik|makassar':    { from: 'gresik',      push: 0.08 },
  'brunei|makassar':    { from: 'brunei',      push: 0.06 },  // 인도네시아 통과류는 북에서 남으로
  'makassar|ternate':   { from: 'makassar',    push: 0.08 },
  'banda|makassar':     { from: 'makassar',    push: 0.07 },
  'ambon|banda':        { from: 'ambon',       push: 0.05 },
};
