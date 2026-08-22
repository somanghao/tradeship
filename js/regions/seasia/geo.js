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
//   위쪽 띠(x 40~150)   버마·샴·반도 동안·꽝남. 쌀과 소목과 침향이 나는 뭍의 시장.
//   왼쪽 아래(x 30~130)  수마트라. 서안은 장뇌, 동안은 후추다.
//   가운데 아래(x 150~265) 자바 북안. 쌀을 대고 배를 짓고 짐을 나르는 중개자.
//   오른쪽 가운데(x 250~322) 보르네오·술라웨시. 장뇌·제비집과 자유항.
//   맨 아래(x 305~310)   소순다. 티모르 백단향이 여기 한 점에 모인다.
//   오른쪽 끝(x 340~380)  향료제도. 정향과 육두구가 나는 유일한 섬들.
//
// 그래서 지도 위에서 **오른쪽으로 갈수록 배가 커야 하고 손해도 커진다.**
// 원양 항로 둘(`nagapattinam~melaka` · `melaka~guangzhou`)이 모두 왼쪽 위 믈라카에
// 닿는다 — 인도에서 온 면포와 중국으로 갈 향료가 이 한 점에서 만난다.
//
// ★ 아유타야는 **내륙**이다(차오프라야 강 상류). 배가 못 닿는 자리라 파타니에서만
//   이어지는 막다른 주머니로 뒀고, 페구와는 뭍길로만 잇는다(지중해의 부르사와 같은 처리).
//   "안쪽까지 들어가면 쌀과 소목을 원가에 산다"가 이 주머니의 값어치다.
//   ★ 이 주머니에 **두 번째 문**을 냈다(메르귀). 인도·페르시아 상인이 실제로 쓴 길이
//     그것이기 때문이다 — 벵골만에서 메르귀에 배를 대고 지협을 걸어 왕도로 갔다.
//     대신 그 문은 **뭍길(null)**이라 배로는 못 지나고, 아유타야에 사다리를 하나 더
//     붙이지 않으려고 리고르와는 잇지 않았다(문이 셋이 되면 주머니가 아니라 통로가 된다).
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
           ★ 호이안을 넣으면서 'hafsid'의 뜻을 **뭍의 비무슬림 왕국 전체**로 넓혔다.
             꽝남(응우옌)은 상좌부도 아니고 무슬림도 아니지만, 이 바다에서 갈라 보여야 할
             축은 교리가 아니라 **뭍이냐 섬이냐**다. 'ming'을 빌릴 수도 있었으나
             그러면 명 선종의 건조 조건(originFlag)이 베트남 항구에 달라붙는다 —
             깃발 하나를 빌리려고 조선소 규칙을 흔들 일이 아니다.
    style — 'malay'(야자 이엉 고상가옥·다층 목조 므루·정글 구릉·대나무 부두)가 이 바다의 기본이고,
           포르투갈이 요새를 세운 암본·솔로르만 'colonial'이다. 금박 쁘랑과 체디의 샴·버마 화풍은
           아직 없어 페구·아유타야도 malay를 쓴다(styleTodo).
           ★ 호이안만 'sinic'이다 — 기와 얹은 통집과 강 양쪽의 중국인 거리·일본인 거리가
             이 항구의 인상이고, 그것은 malay보다 sinic에 가깝다.
    industry — 이 권역의 상한 3은 **자바 북안(투반·그레식·수라바야)과 버마 페구**뿐이다.
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
  // ★ 메르귀(믜익)는 **아유타야가 벵골만으로 나가는 문**이었다. 믈라카 해협은 좁고 적대적이라
  //   인도·페르시아 상인은 아예 배를 버리는 길을 택했다 — 메르귀에 내려 테나세림 강을
  //   거슬러 지협을 걸어 왕도까지 갔다. 그래서 이 항구는 **해협을 한 번도 지나지 않는
  //   유일한 우회로**의 서쪽 끝이고, 뭍길(요율 null)로 아유타야에 붙는다.
  //   테나세림 티크가 여기서 실려 구자라트 조선소로 갔고, 코끼리 상아도 이 부두에서 떴다.
  //   size 1 — 창고와 왕실 대리인 몇 채뿐인 환적항이었다.
  { id: 'mergui',      name: '메르귀',     area: '테나세림',     style: 'malay',    x: 86,  y: 54,  flag: 'hafsid',  seed: 6119, size: 1, industry: 1 },
  { id: 'patani',      name: '파타니',     area: '반도 동안',    style: 'malay',    x: 126, y: 66,  flag: 'malacca', seed: 6103, size: 2, industry: 2 },
  // 리고르(나콘시탐마랏)는 샴이 반도를 눌러 두던 남쪽 큰 성이다. 반도 주석과 사슴가죽이
  // 여기서 중국·일본 배에 실렸고 — 샴 사슴가죽은 나가사키에서 값이 매겨지는 물건이었다 —
  // 라오스 산에서 강을 타고 내려온 안식향('샴 벤조인')이 이 부두에 모였다.
  { id: 'ligor',       name: '리고르',     area: '반도 동안',    style: 'malay',    x: 130, y: 48,  flag: 'hafsid',  seed: 6120, size: 2, industry: 1 },
  // ★ 호이안(파이포)은 **침향의 원산지**다. `goods.js`가 침향 base 540을 정할 때 근거로 든
  //   "회안에서 15냥에 산 것이 나가사키에서 600냥이 됐다"의 그 회안이 여기다. 그래서 이 항구의
  //   침향 supply를 이 세계에서 가장 낮게(0.42) 뒀다 — 산지가 산지답게 싸야 그 문장이 값이 된다.
  //   봄마다 일본 주인선과 중국 정크가 함께 들어와 강 양쪽에 일본인 거리·중국인 거리가 섰다.
  //   꽝남 계피와 사탕수수도 이 강으로 내려왔고, 응우옌은 그 값으로 화약 원료를 사들였다.
  { id: 'hoian',       name: '호이안',     area: '꽝남',         style: 'sinic',    x: 146, y: 28,  flag: 'hafsid',  seed: 6121, size: 2, industry: 1 },

  // ── 말라카 해협 — 세계의 목 ───────────────────────────────
  // 좁고 얕고 섬이 많아 **배가 반드시 뭍 가까이로 붙어야 지나간다.** 그 자리가
  // 오랑 라우트의 자리였다. 아체는 그 해협의 서쪽 문을 쥐고 포르투갈령 믈라카와
  // 평생 싸웠고, 후추를 홍해로 직송해 유럽의 향료 값을 흔들었다.
  { id: 'aceh',        name: '아체',       area: '수마트라 북단', style: 'malay',    x: 22,  y: 76,  flag: 'malacca', seed: 6104, size: 3, industry: 2 },
  { id: 'pasai',       name: '파세',       area: '수마트라 북안', style: 'malay',    x: 38,  y: 95,  flag: 'malacca', seed: 6105, size: 2, industry: 1 },
  // ★ 바루스는 **품목이 항구 이름을 가진** 드문 자리다. 장뇌의 최상품 등급을 뜻하는
  //   '카푸르 바루스'가 이 항구에서 왔다 — 아랍·인도 상인이 수마트라 서안까지 배를 몬 이유가
  //   이 나무 수지 하나였다. 파세의 주석("서안에서 넘어온 바루스 장뇌가 여기서 팔린다")이
  //   가리키던 산지가 이제 지도에 있다. 뒤로는 바탁 고지가 서서 안식향(케메냔)도 함께 내려왔다.
  //   해협 반대편(서안)이라 아체·파세에서만 이어지는 작은 주머니다 — 쌀도 소금도 쇠도 배로 온다.
  { id: 'barus',       name: '바루스',     area: '수마트라 서안', style: 'malay',    x: 30,  y: 108, flag: 'malacca', seed: 6122, size: 1, industry: 0 },
  { id: 'perak',       name: '페락',       area: '반도 서안',    style: 'malay',    x: 88,  y: 88,  flag: 'malacca', seed: 6106, size: 1, industry: 1 },
  // ★ 관문 항구. `OCEAN_LANES`의 nagapattinam~melaka(인도)와 melaka~guangzhou(중국)가
  //   둘 다 여기 닿는다. 이 id를 바꾸면 두 대양이 끊긴다.
  //   믈라카 자체는 아무것도 나지 않는다 — 생선 절일 소금까지 실어다 썼다.
  //   그 성격을 지키려고 supply를 주석(tin) 하나로만 뒀다(몰타와 같은 처리).
  { id: 'melaka',      name: '믈라카',     area: '말라카 해협',  style: 'malay',    x: 106, y: 104, flag: 'malacca', seed: 6107, size: 3, industry: 2 },
  { id: 'johor',       name: '조호르',     area: '반도 남단',    style: 'malay',    x: 124, y: 118, flag: 'malacca', seed: 6108, size: 2, industry: 2, prizeYard: true },

  // ── 수마트라 동안 — 강을 거슬러 올라가야 있는 후추 ────────
  // 이 두 항구는 **강 항구**다(잠비는 바탕하리, 팔렘방은 무시 강 상류 80km).
  // 아유타야처럼 안쪽에 있어서 값이 물가와 다르다 — 후추를 산지에서 사려면 강을 타야 한다.
  // 후추 산지를 아체·반텐 둘로만 두면 이 바다의 후추가 양 끝에서만 나는 물건이 되는데,
  // 사실 16세기 수마트라 후추의 몸통은 이 동안 강 유역이었다.
  { id: 'jambi',       name: '잠비',       area: '수마트라 동안', style: 'malay',    x: 118, y: 134, flag: 'malacca', seed: 6123, size: 2, industry: 1 },
  // ★ 팔렘방은 **스리위자야의 옛 도읍**이다. 항구가 곧 나라였던 시절이 끝난 뒤에는
  //   중국계 이주민과 해적의 소굴이었다(정화 함대가 여기서 진조의를 잡아갔다).
  //   무시 강 삼각주의 늪은 배를 숨기기에 좋았고, 그 늪의 목재로 배를 짰다.
  { id: 'palembang',   name: '팔렘방',     area: '수마트라 동안', style: 'malay',    x: 130, y: 154, flag: 'malacca', seed: 6124, size: 2, industry: 2 },

  // ── 자바·순다 — 쌀과 배와 중개 ────────────────────────────
  // 자바는 향료를 **먹는 곳이 아니라 나르는 곳**이다. 말루쿠에서 정향을 실어다
  // 믈라카에 넘기고, 대신 쌀을 동쪽 섬으로 올려 보냈다. 그래서 여기에는
  // 정향 수요를 두지 않았다 — 중개자가 소비자가 되면 향료가 자바에서 끝나 버린다.
  { id: 'banten',      name: '반텐',       area: '순다',         style: 'malay',    x: 150, y: 170, flag: 'majapahit', seed: 6109, size: 3, industry: 2 },
  { id: 'sundakelapa', name: '순다칼라파', area: '순다',         style: 'malay',    x: 186, y: 178, flag: 'majapahit', seed: 6110, size: 2, industry: 1 },
  // 치르본은 자바 북안 가운데의 소금과 쌀이다. 갯벌에 염전을 널어 소금을 굽던 항구인데,
  // 이 바다에서 소금은 **작지만 아무도 안 대는 물건**이었다 — 믈라카조차 생선 절일 소금을
  // 실어다 썼다는 그 소금을 여기서 낸다. 궁정과 모스크는 안식향을 태웠고 쪽(인디고)도 났다.
  // ★ y를 176에 둔 것은 지도 때문이다. 168에 두었더니 순다칼라파~투반 회랑과 새 회랑 둘이
  //   한자리에서 겹쳐 반경 16px 안에 뭍이 5px밖에 남지 않았다 — 물가가 아니라 물 위였다.
  //   8px 남쪽으로 내려 자바 안쪽에 등을 붙였다(뭍 5px → 111px).
  { id: 'cirebon',     name: '치르본',     area: '자바 북안',    style: 'malay',    x: 212, y: 176, flag: 'majapahit', seed: 6125, size: 2, industry: 2 },
  { id: 'tuban',       name: '투반',       area: '자바 북안',    style: 'malay',    x: 232, y: 170, flag: 'majapahit', seed: 6111, size: 2, industry: 3 },
  { id: 'gresik',      name: '그레식',     area: '자바 북안',    style: 'malay',    x: 252, y: 178, flag: 'majapahit', seed: 6112, size: 2, industry: 3 },
  // ★ 수라바야는 브란타스 강 하구의 조선지다. 그레식이 **상인의 항구**라면 여기는
  //   **배를 짜는 항구**였다 — 강 상류에서 티크가 내려오고 마두라 해협이 방파제가 되어
  //   선거를 앉히기에 이 해안에서 가장 나은 자리였다. industry 3을 준 넷째 항구이고,
  //   그레식과 14px 떨어져 있다(실제로도 두 항구는 걸어 다닐 거리였다).
  { id: 'surabaya',    name: '수라바야',   area: '자바 동단',    style: 'malay',    x: 262, y: 188, flag: 'majapahit', seed: 6126, size: 2, industry: 3 },

  // ── 보르네오·술라웨시 ─────────────────────────────────────
  // 브루나이는 장뇌와 동굴 제비집이 나가는 항구, 마카사르는 **누구에게나 열린 자유항**이다.
  // 마카사르가 이 바다에서 갖는 뜻은 향료를 대는 것이 아니라 **말루쿠에 쌀을 대는 것**이었다.
  { id: 'brunei',      name: '브루나이',   area: '보르네오',     style: 'malay',    x: 250, y: 96,  flag: 'majapahit', seed: 6113, size: 2, industry: 2 },
  { id: 'makassar',    name: '마카사르',   area: '술라웨시',     style: 'malay',    x: 300, y: 140, flag: 'majapahit', seed: 6114, size: 2, industry: 2 },
  // ★ 부톤은 **향료 항로의 목**이다. 자바·마카사르에서 말루쿠로 가려면 이 섬 옆을 지나야 했고,
  //   술탄은 그 지나가는 배에 값을 물렸다(그래서 size 1인데 입항세가 6%다).
  //   석회질 섬이라 쌀이 안 나 사고(사구)와 수입 쌀로 살았고, 대신 대모(거북등껍질)와
  //   카우리 조개를 긁어 팔았다. 이 항구가 생기면 마카사르~반다 직항(9.0) 말고
  //   **두 번 끊어 가는 안전한 길**이 열린다 — 느리지만 덜 털리는 선택지다.
  { id: 'buton',       name: '부톤',       area: '술라웨시 남동', style: 'malay',    x: 322, y: 160, flag: 'majapahit', seed: 6127, size: 1, industry: 1 },

  // ── 소순다 — 백단향 한 품목이 세운 항구 ───────────────────
  // ★ 솔로르는 **티모르 백단향의 집하지**다. `goods.js`가 백단향을 "티모르와 소순다 열도"라
  //   적어 두었는데 정작 그 섬이 지도에 없었다 — 마카사르(0.52)와 반다(0.60)의 supply가
  //   산지 없이 떠 있던 셈이다. 도미니코회가 1566년 로하용에 요새를 세워 이 섬을 근거로
  //   티모르 백단향을 긁어모았고, 그래서 깃발과 화풍이 암본과 같다(portugal·colonial).
  //   메마른 작은 섬이라 쌀은 한 톨도 안 난다. 백단향과 밀랍만 나가고 먹을 것은 다 들어온다.
  { id: 'solor',       name: '솔로르',     area: '소순다',       style: 'colonial', x: 308, y: 194, flag: 'portugal',  seed: 6128, size: 1, industry: 0 },

  // ── 향료제도(말루쿠) — 세계에서 여기서만 난다 ──────────────
  // 작고 멀고 값비싼 섬들이다. size 1 · industry 0~1이 그 성격이다.
  // 테르나테와 티도레는 마주 보는 두 화산섬이고 서로를 평생 쳤다. 반다는 육두구가 나는
  // **세계 유일의 곳**인데 인구가 3천이 못 됐고 쌀 한 톨 안 났다 — 몰타가 그렇듯,
  // 이 섬들은 먹을 것을 사들여야 산다. 그것이 이 바다에서 왕복이 성립하는 이유다.
  { id: 'ternate',     name: '테르나테',   area: '말루쿠',       style: 'malay',    x: 352, y: 62,  flag: 'majapahit', seed: 6115, size: 1, industry: 1 },
  { id: 'tidore',      name: '티도레',     area: '말루쿠',       style: 'malay',    x: 368, y: 78,  flag: 'majapahit', seed: 6116, size: 1, industry: 1 },
  // 암본만 'spain'(포르투갈 대용) — 요새를 끼고 독점을 강요하던 항구다.
  // 마카사르의 자유항과 정면으로 대비시키려고 입항세도 이 권역 최고로 뒀다.
  { id: 'ambon',       name: '암본',       area: '말루쿠',       style: 'colonial', x: 344, y: 126, flag: 'portugal',   seed: 6117, size: 1, industry: 1 },
  { id: 'banda',       name: '반다',       area: '반다 제도',    style: 'malay',    x: 372, y: 150, flag: 'majapahit', seed: 6118, size: 1, industry: 0 },
];

/* 항로 — 권역 안의 연결만 적는다. 다른 권역으로 나가는 선은 `js/regions/index.js: OCEAN_LANES`.
   ★ 이 그래프는 **한 줄기 긴 뱀**에 가깝게 짰다. 해협에서 자바를 지나 술라웨시를 거쳐
     향료제도에 닿는 동안 항구를 열 곳 넘게 지나야 한다 — 지름길이 없다는 것이
     "정향은 멀어서 비싸다"를 규칙으로 만드는 유일한 방법이다.
   ★ 아유타야는 파타니(바닷길)와 페구·메르귀(뭍길)에서만 이어진다(막다른 주머니).
   ★ 항구를 열 곳 늘리면서 **뱀의 길이는 그대로 두고 살만 붙였다** — 새 항로 열아홉 개 중
     동서를 단축하는 것은 하나도 없다. 새로 생긴 것은 세 종류뿐이다:
       ① 곁길   치르본·수라바야·잠비처럼 이미 있던 구간 사이에 낀 정박지(자바 북안·해협 남단)
       ② 주머니 바루스·메르귀처럼 본선에서 갈라져 되돌아 나와야 하는 막다른 가지
       ③ 우회로 부톤·솔로르·호이안. 짧지 않지만 **덜 위험한** 길이다.
         마카사르~반다 직항이 9.0인데 부톤을 거치면 6.5+8.5로 두 번 끊어 간다 —
         빠른 길과 안전한 길이 갈리는 것이 이 바다에 처음 생긴 선택이다. */
export const ROUTES = [
  // 뭍의 왕국 — 페구·아유타야는 뭍길로 이어진 주머니다
  ['pegu', 'ayutthaya'], ['pegu', 'aceh'],
  ['ayutthaya', 'patani'],
  // 안다만해 쪽 문 — 메르귀에서 지협을 걸어 왕도로 든다(ayutthaya~mergui는 뭍길)
  ['pegu', 'mergui'], ['mergui', 'ayutthaya'], ['mergui', 'perak'],
  // 샴만·남중국해 서안 — 파타니에서 리고르를 거쳐 꽝남까지 뭍을 끼고 올라간다
  ['ligor', 'patani'], ['ligor', 'hoian'], ['hoian', 'brunei'],
  ['patani', 'johor'], ['patani', 'brunei'],
  // 말라카 해협 — 양 기슭을 지그재그로 건넌다. 해협을 통째로 가로지르는
  // aceh~melaka 직항을 남겨 두되 요율을 이 권역 최고로 매겼다(9.5).
  ['aceh', 'pasai'], ['aceh', 'melaka'],
  ['pasai', 'perak'], ['pasai', 'melaka'],
  ['perak', 'melaka'],
  ['melaka', 'johor'],
  // 수마트라 서안 — 해협 반대편으로 갈라지는 막다른 가지(바루스)
  ['pasai', 'barus'], ['aceh', 'barus'],
  // 수마트라 동안 — 해협 남단에서 강을 거슬러 올라간다
  ['melaka', 'jambi'], ['johor', 'jambi'], ['jambi', 'palembang'],
  // 해협에서 자바로 — 카리마타 쪽 외해를 건넌다
  ['johor', 'banten'],
  ['palembang', 'banten'],
  ['banten', 'sundakelapa'], ['sundakelapa', 'cirebon'], ['cirebon', 'tuban'],
  ['sundakelapa', 'tuban'], ['tuban', 'gresik'], ['gresik', 'surabaya'],
  // 자바해 — 산호초가 깔린 얕은 바다
  ['gresik', 'brunei'], ['gresik', 'makassar'],
  ['brunei', 'makassar'],
  // 소순다 — 백단향을 실으러 남쪽으로 내려간다
  ['surabaya', 'solor'], ['solor', 'buton'],
  // 향료제도로 — 여기서부터가 이 권역의 끝자락이다
  ['makassar', 'ternate'], ['makassar', 'ambon'], ['makassar', 'banda'],
  ['makassar', 'buton'], ['buton', 'banda'],
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
   null = 해적 개념이 없는 구간. 여기서는 뭍길 둘(페구~아유타야 · 아유타야~메르귀)뿐이다.
   판정과 출처는 `content/regions/seasia-evidence.json`이 정본이고
   `node tools/check-routes.mjs`가 이 표와 어긋나면 실패시킨다. */
export const ROUTE_RISK = {
  'ayutthaya|pegu': null,       // 버마-샴 뭍길. 배가 안 뜬다
  'ayutthaya|mergui': null,     // 지협을 걷는 뭍길. 인도 상인이 배를 버리고 넘던 길이다
  'aceh|pegu': 7.5,             // 안다만해 횡단 — 외해
  'mergui|pegu': 6.5,           // 마르타반 만~테나세림 연안. 외해지만 뭍을 끼고 간다
  'mergui|perak': 7.0,          // 반도 서안 남하 — 안다만해 쪽은 섬이 많고 순찰이 없다
  'ayutthaya|patani': 5.0,      // 샴만 연안
  'ligor|patani': 4.5,          // 같은 왕의 두 성 사이. 이 권역에서 가장 안전한 구간이다
  'hoian|ligor': 7.5,           // 샴만을 나와 남중국해 서안으로. 참파 해적이 오래 앉아 있던 물이다
  'brunei|hoian': 9.0,          // 남중국해 횡단. 파타니~브루나이와 같은 값이다
  'johor|patani': 5.5,          // 반도 동안 연안
  'brunei|patani': 9.0,         // 남중국해 횡단. 며칠씩 뭍이 안 보인다
  'aceh|pasai': 4.0,            // 같은 세력권의 짧은 연안
  'aceh|melaka': 9.5,           // ★ 해협 전 구간. 좁고 얕고 적대 — 이 권역 최고 요율
  'barus|pasai': 5.5,           // 수마트라 서안 연안. 해협 밖이라 오랑 라우트가 없다
  'aceh|barus': 6.5,            // 서안을 내려가는 외해 — 항구가 없어 피할 곳도 없다
  'pasai|perak': 7.0,           // 해협 횡단
  'melaka|pasai': 8.0,          // 해협 병목 안쪽
  'melaka|perak': 6.5,          // 해협 북쪽 좁은 물목
  'johor|melaka': 6.0,          // 해협 남단 — 섬이 빽빽하고 뱃길이 하나다
  'jambi|melaka': 8.0,          // 해협을 건너 강으로 든다. 하구의 늪이 배를 숨긴다
  'jambi|johor': 7.0,           // 해협 남단 동안~바탕하리 하구
  'jambi|palembang': 5.0,       // 수마트라 동안 내수로. 뭍이 양쪽에 붙어 있다
  'banten|palembang': 6.0,      // 방카 해협을 지나 순다로 — 얕고 좁다
  'banten|johor': 8.0,          // 카리마타 쪽 외해
  'banten|sundakelapa': 3.0,    // 순다 연안. 한 세력의 안뜰이다
  'cirebon|sundakelapa': 4.0,   // 자바 북안 연안. 뭍이 늘 보인다
  'cirebon|tuban': 4.5,         // 자바 북안 연안
  'sundakelapa|tuban': 5.0,     // 자바 북안 연안 항해
  'gresik|tuban': 3.0,          // 이웃 항구
  'gresik|surabaya': 3.0,       // 걸어 다닐 거리의 두 항구. 마두라 해협 안쪽이다
  'brunei|gresik': 8.0,         // 자바해 횡단 — 산호초와 얕은 물
  'gresik|makassar': 7.0,       // 자바해 동쪽
  'brunei|makassar': 7.5,       // 마카사르 해협
  'solor|surabaya': 8.0,        // 소순다 열도로 내려가는 길. 좁은 물목이 줄줄이 있다
  'buton|solor': 7.5,           // 플로레스해~반다해 어귀
  'buton|makassar': 6.5,        // 보네 만 남쪽. 술탄의 순찰선이 도는 물이다
  'makassar|ternate': 8.5,      // 향료제도로 가는 먼 뱃길
  'ambon|makassar': 7.5,
  'banda|makassar': 9.0,        // 밀무역선이 다니던 가장 먼 향료 항로
  'banda|buton': 8.5,           // 반다해 횡단. 직항(9.0)보다 낫지만 여전히 외해다
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
  'mergui|perak':       { from: 'mergui',      push: 0.06 },  // 안다만해에서 해협 쪽으로 남하
  'brunei|patani':      { from: 'patani',      push: 0.06 },  // 겨울 북동 계절풍
  'hoian|ligor':        { from: 'ligor',       push: 0.05 },  // 여름 남서풍이면 꽝남 쪽으로 올라간다
  'brunei|hoian':       { from: 'hoian',       push: 0.06 },  // 겨울 북동풍이 보르네오로 밀어 내린다
  'aceh|melaka':        { from: 'aceh',        push: 0.08 },  // 해협을 남동으로 흐르는 물
  'aceh|barus':         { from: 'aceh',        push: 0.05 },  // 수마트라 서안을 남동으로 흐른다
  'johor|melaka':       { from: 'melaka',      push: 0.05 },
  'jambi|palembang':    { from: 'jambi',       push: 0.04 },  // 동안을 남으로 내려가는 물
  'banten|johor':       { from: 'johor',       push: 0.06 },
  'cirebon|sundakelapa': { from: 'sundakelapa', push: 0.05 },
  'cirebon|tuban':      { from: 'cirebon',     push: 0.05 },
  'sundakelapa|tuban':  { from: 'sundakelapa', push: 0.06 },
  'gresik|tuban':       { from: 'tuban',       push: 0.05 },
  'gresik|surabaya':    { from: 'gresik',      push: 0.04 },
  'gresik|makassar':    { from: 'gresik',      push: 0.08 },
  'brunei|makassar':    { from: 'brunei',      push: 0.06 },  // 인도네시아 통과류는 북에서 남으로
  'solor|surabaya':     { from: 'surabaya',    push: 0.06 },  // 통과류가 소순다 물목을 남으로 빤다
  'buton|makassar':     { from: 'makassar',    push: 0.06 },
  'makassar|ternate':   { from: 'makassar',    push: 0.08 },
  'banda|makassar':     { from: 'makassar',    push: 0.07 },
  'banda|buton':        { from: 'buton',       push: 0.06 },
  'ambon|banda':        { from: 'ambon',       push: 0.05 },
};
