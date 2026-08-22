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
// ★ 17곳 → 28곳 (지중해와 같은 수로 맞췄다). 늘리면서 **최소 간격 21px는 못 지켰다** —
//   황금해안·노예해안(엘미나~그웨이토 38px 안에 아크라·위다)과 베나디르(라무~모가디슈)는
//   실제로 항구가 그만큼 촘촘했던 해안이고, 그것을 21px로 벌리면 기니만이 통째로 늘어나
//   희망봉까지의 거리감이 무너진다. 그래서 **새 항구의 최소 간격은 10px**이고
//   이름표가 겹치는 자리는 y를 2~4px씩 엇물려 피했다. 21px는 이제 "기존 17곳 사이의 간격"이다.
//   ★ 좌표를 새로 넣었으므로 `node tools/gen-map-png.mjs`로 지도를 다시 뽑아야
//     새 항구가 `assets/map/africa.png`에 나온다 — 이 작업에서는 아홉 장을 한꺼번에
//     덮어쓰지 않으려고 미뤘다. 그림이 갱신되기 전까지 새 항구는 좌표만 있고 지도엔 없다.
//
// ★ 새 항구를 어디에 놓았는가 — `js/sprites/maps/index.js`의 `africa.auto.landmass`가
//   대륙을 계단 일곱 칸으로 쌓는다(서안 x=40→70, 동안 x=356→222로 남하할수록 좁아진다).
//   자동 지도는 **항로 회랑을 바다로 파내므로**, 새 항구는 죄다 기존 항구 사이의
//   그 회랑 위에 얹었다 — 기니만 선(y 92~100), 상투메~루안다 선, 스와힐리 연안선.
//   대륙 안쪽으로 파고든 좌표는 하나도 없다.
//
// ── 깃발·화풍에 대하여 (읽고 넘어갈 것) ─────────────────────────
//   ★ 배선이 끝났다. 전에는 `FLAGS`에 포르투갈이 없어 이베리아 깃발 `spain`을,
//   스와힐리·베냉 같은 아프리카 세력에는 `hafsid`(마그레브 이슬람)를 빌려 썼다.
//   지금은 제 깃발을 단다 — 포르투갈 상관·요새 열넷이 `portugal`, 스와힐리 도시국가 아홉이
//   `swahili`(붉은 바탕 흰 초승달), 아프리카 왕국 다섯이 `benin`(오바의 산호빛·검은 표범)이다.
//   베냉이 이슬람 깃발을 달고 있던 것이 이 권역에서 가장 어긋난 자리였다.
//   ※ 아직 안 그려진 것 둘은 근거 JSON의 `art.flagTodo`에 남겨 두었다 —
//     모가디슈의 소말리(베나디르) 깃발과, 임자 없는 희망봉에 쓸 "깃발 없음"이다.
//   ※★ **깃발 빚이 넷 늘었다.** 아크라(가)·위다(후에다)·로안고(비리)·음핀다(콩고)는
//     포르투갈도 무슬림도 아닌 제각기 다른 왕국인데 넷 다 `benin`을 빌려 쓴다.
//     이슬람 깃발(`hafsid`)이나 포르투갈 깃발을 다는 것보다 덜 틀리다는 이유뿐이다 —
//     특히 콩고는 1512년에 제 문장(마니콩고의 방패)을 받은 왕국이라 남의 깃발이 아깝다.
//     근거 JSON을 이 작업에서 건드릴 수 없어 `art.flagTodo`에 못 적었으니 여기 적어 둔다.
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
  { id: 'arguin',     name: '아르갱',   area: '사하라 해안',   style: 'colonial', x: 44,  y: 32,  flag: 'portugal',  seed: 4101, size: 1, industry: 1 },
  // 고레(베제기시) — 카부베르드 곶 앞의 바위섬. 1444년에 발견되고 1481년에 예배당이 섰다.
  // 뭍은 월로프의 카요르·바올 왕국이라 유럽선은 이 섬에 정박해 물을 긷고 배를 눕혀 긁었다.
  // 세네갈·감비아 강이 내려놓는 것이 여기 모인다 — 가죽(쿠루스 다 기네)과 용연향, 밀랍.
  // ★ 요새가 아니라 정박지라 style은 흙벽·이엉(guinea)으로 뒀다. 깃발만 포르투갈이다.
  { id: 'goree',      name: '고레',     area: '세네감비아',    style: 'guinea',   x: 48,  y: 52,  flag: 'portugal',  seed: 4118, size: 1, industry: 1 },
  // 산티아구(히베이라 그란지) — 1462년 정착. 열대 최초의 유럽 상설 도시이고
  // 기니 해안으로 나가는 배가 모두 여기서 물과 면포를 싣는다.
  { id: 'santiago',   name: '산티아구', area: '카보베르데',    style: 'colonial', x: 22,  y: 62,  flag: 'portugal',  seed: 4102, size: 2, industry: 1 },
  // 카슈에우 — "리오스 데 기네"(기니의 강들)로 들어가는 문. 1588년에 목책 요새가 섰지만
  // 그 전부터 산티아구에서 건너온 란사두(왕의 허가 없이 뭍에 산 밀무역상)들의 마을이었다.
  // 밀랍·상아·무명이 강에서 내려오고, 카보베르데가 먹는 쌀과 기장도 여기서 실린다.
  { id: 'cacheu',     name: '카슈에우', area: '상류 기니',     style: 'colonial', x: 54,  y: 74,  flag: 'portugal',  seed: 4119, size: 2, industry: 1 },
  // 아심 — 앙코브라 강이 사금을 실어 내리는 자리. 1515년 산투 안토니우 요새.
  { id: 'axim',       name: '아심',     area: '황금해안',      style: 'colonial', x: 52,  y: 100, flag: 'portugal',  seed: 4103, size: 1, industry: 1 },
  // 엘미나(상 조르즈 다 미나) — 1482년. **이 권역 전체의 이유**다.
  // 16세기 초 이 해안에서 해마다 금 680kg(24,000온스)이 나갔고 그것이 당시 세계 금 공급의 1/10이었다.
  { id: 'elmina',     name: '엘미나',   area: '황금해안',      style: 'colonial', x: 80,  y: 92,  flag: 'portugal',  seed: 4104, size: 2, industry: 1 },
  // 아크라(대아크라) — 가 사람들의 시장 도시. 요새가 세 개나 나란히 서는 것은 뒷일이고
  // 이 시대에는 **내륙 아콰무의 금이 내려오는 자리**다. 앞바다에 부두를 놓을 수 없어
  // 배는 먼바다에 닻을 내리고 카누가 파도를 뚫고 짐을 옮겼다 — 이 해안의 하역법이다.
  // 동쪽 아다·송고르 갯벌에서 구운 바다소금이 금과 바뀌어 내륙으로 올라갔다.
  { id: 'accra',      name: '아크라',   area: '황금해안',      style: 'guinea',   x: 94,  y: 94,  flag: 'benin',     seed: 4120, size: 2, industry: 1 },
  // 위다(우이다·사비) — 후에다 왕국의 항구. 노예해안 최대의 시장이고, 여기서 값을 치른 것이
  // 몰디브에서 실려 온 **카우리 조개**였다(서아프리카의 화폐가 인도양의 조개였다).
  // 왕은 배가 짐을 풀기 전에 "관세"를 먼저 받았다 — 그 값을 TARIFF_OVERRIDE에 적었다.
  { id: 'whydah',     name: '위다',     area: '노예해안',      style: 'guinea',   x: 106, y: 98,  flag: 'benin',     seed: 4121, size: 2, industry: 1 },
  // 그웨이토(우그호톤) — 베냉 왕국의 강어귀 외항. 도시 본체는 뭍 안쪽이라
  // 여기는 오바의 세관이 서는 자리에 가깝다. 유럽선은 여기까지만 들어왔다.
  { id: 'gwato',      name: '그웨이토', area: '베냉',          style: 'guinea',   x: 118, y: 100, flag: 'benin', seed: 4105, size: 2, industry: 1 },
  // 상투메 — 1493년 정착, 1515년 물레방아 제당소가 들어서면서 섬 전체가 사탕수수밭이 됐다.
  // 1595년 반란 때 불탄 것만 제당소 85곳 중 60곳. 먹을 것은 죄다 배로 들어온다.
  { id: 'saotome',    name: '상투메',   area: '기니만',        style: 'colonial', x: 124, y: 128, flag: 'portugal',  seed: 4106, size: 2, industry: 1 },
  // 로안고 — 비리 사람들의 왕국이고 콩고 강 북쪽의 가장 큰 항구다. 포르투갈이 끝내
  // 요새를 세우지 못한 자리라 네덜란드·영국 배가 여기서 값을 흥정했다.
  // 민돌리·벰베의 구리, 야자 노끈으로 짠 라피아 천(리봉고 — 이것이 이 왕국의 화폐였다),
  // 그리고 내륙에서 내려온 상아. 값으로 받아 간 것은 라인란트의 쇠막대였다.
  { id: 'loango',     name: '로안고',   area: '로안고',        style: 'guinea',   x: 104, y: 140, flag: 'benin',     seed: 4122, size: 2, industry: 1 },
  // 음핀다(소요) — 콩고 왕국의 항구. 1483년 디오구 캉이 강어귀에 파드랑(석주)을 세운 자리이고
  // 여기서 뭍길로 사흘이면 왕의 도읍 음반자콩고다. 왕이 세운 마니 음핀다(항구 감독관)가
  // 배마다 값을 물렸다. 세례를 받은 아프리카 왕국이라 **미사에 쓸 포도주**가 들어왔다.
  { id: 'mpinda',     name: '음핀다',   area: '콩고',          style: 'guinea',   x: 92,  y: 148, flag: 'benin',     seed: 4123, size: 1, industry: 1 },
  // 루안다 — 1576년. 콩고 왕국이 화폐로 쓰던 은질부 조개가 앞바다 섬에서 나고,
  // 카탕가의 구리 십자 주괴가 강을 타고 내려온다. 희망봉으로 나가는 서안의 마지막 큰 항구.
  { id: 'luanda',     name: '루안다',   area: '앙골라',        style: 'colonial', x: 80,  y: 156, flag: 'portugal',  seed: 4107, size: 2, industry: 1 },
  // 벵겔라 — 뭍은 사막이고 앞바다는 차가운 벵겔라 해류다. 배후 고원의 상아가 유일한 밑천.
  { id: 'benguela',   name: '벵겔라',   area: '앙골라',        style: 'guinea',   x: 66,  y: 180, flag: 'portugal',  seed: 4108, size: 1, industry: 1 },
  // 희망봉 — ★ 이 시대엔 **도시가 아니다.** 유럽인의 상설 정착은 1652년에야 생긴다.
  //   그 전까지는 배가 물을 긷고 코이코이와 소·양을 물물교환하던 정박지였을 뿐이다.
  //   그래서 size 1 · industry 0(배를 못 짓는다) · 입항세 1%(세관이 없다)로 뒀다.
  //   깃발도 임자가 없어 지나가는 유럽 선단의 것으로 뒀다 — 알고 그렇게 둔 것이다.
  { id: 'cabo',       name: '희망봉',   area: '아굴라스',      style: 'guinea',   x: 146, y: 200, flag: 'portugal',  seed: 4109, size: 1, industry: 0 },

  // ── 동안: 인도양 · 스와힐리 해안 ─────────────────────────────
  // ★ 이 해안은 포르투갈이 오기 훨씬 전부터 촘촘한 무역망이었다. 킬와·몸바사·말린디는
  //   서로 경쟁하는 도시국가였고, 포르투갈은 그 위에 얹혔을 뿐 시작이 아니다.
  //   blurb와 근거 서술을 그 순서로 적었다.
  // 인함반느 — 1498년 다 가마가 여기 사람들을 후하게 여겨 "보아 젠치(선한 사람들)의 땅"이라
  // 적었다. 요새도 세관도 없고 해변에 서는 장이 전부다 — 통가 사람들이 배후 고원에서
  // 상아를 끌고 내려와 유리구슬과 면포로 바꿔 갔다. 이 권역 동안의 **남쪽 막다른 가지**다.
  // ★ 여기서 희망봉으로 선을 그으면 26일짜리 원양 항로가 무의미해진다 — 소팔라 하나만 잇는다.
  { id: 'inhambane',  name: '인함반느', area: '보아 젠치',     style: 'guinea',   x: 214, y: 192, flag: 'portugal',  seed: 4124, size: 1, industry: 0 },
  // 소팔라 — 무타파(대짐바브웨)의 금이 마니카를 거쳐 바다로 나오는 문. 1505년 상 카에타누 요새.
  { id: 'sofala',     name: '소팔라',   area: '무타파',        style: 'colonial', x: 228, y: 182, flag: 'portugal',  seed: 4110, size: 1, industry: 0 },
  // 켈리마네 — 잠베지 강 어귀. 강을 거슬러 세나·테테의 금 장(페이라)까지 배가 올라갔으므로
  // 이 항구는 바다의 끝이 아니라 **강길의 입구**다. 소팔라의 금이 마르자 무타파의 금은
  // 이 물길로 나왔다. 삼각주의 사주가 얕아 큰 배는 어귀에서 짐을 옮겨 실었다.
  { id: 'quelimane',  name: '켈리마네', area: '잠베지',        style: 'colonial', x: 244, y: 166, flag: 'portugal',  seed: 4125, size: 1, industry: 1 },
  // 모잠비크 섬 — 희망봉을 돈 인도 항로 선단이 **처음 닻을 내리는 자리**다.
  // 생산지가 아니라 배를 고치고 겨울을 나는 곳이라 industry를 2로 뒀다.
  { id: 'mocambique', name: '모잠비크', area: '모잠비크',      style: 'colonial', x: 256, y: 158, flag: 'portugal',  seed: 4111, size: 2, industry: 2, prizeYard: true },
  // 앙고셰 — 스와힐리 술탄국이고 포르투갈이 이 해안에서 가장 미워한 항구다.
  // 잠베지의 금이 모잠비크 섬의 세관을 거치지 않고 이 얕은 물길로 빠져나갔다 —
  // 1511년에 함대를 보내 불태웠는데도 몇 해 뒤에 다시 같은 일을 하고 있었다.
  // 얕은 늪과 섬 사이를 아는 다우만 들어올 수 있어 포르투갈 큰 배가 못 쫓아왔다.
  { id: 'angoche',    name: '앙고셰',   area: '스와힐리',      style: 'swahili',  x: 266, y: 142, flag: 'swahili',   seed: 4126, size: 1, industry: 1 },
  // 킬와 — 12세기에 소팔라의 금을 빼앗아 스와힐리 해안의 맹주가 된 술탄국.
  // 1505년 알메이다가 500명을 상륙시켜 무너뜨린 뒤로는 궁전만 남았다.
  { id: 'kilwa',      name: '킬와',     area: '스와힐리',      style: 'swahili',  x: 282, y: 130, flag: 'swahili', seed: 4112, size: 2, industry: 1 },
  // 잔지바르 — 뭍의 물건과 바다 건너 물건이 임자를 바꾸는 중개상의 섬.
  // 포르투갈은 1503년에 조공만 받아 갔을 뿐 요새도 수비대도 두지 않았다(1591년 영국선 기록).
  { id: 'zanzibar',   name: '잔지바르', area: '스와힐리',      style: 'swahili',  x: 302, y: 112, flag: 'swahili', seed: 4113, size: 2, industry: 1 },
  // 펨바 — 아랍인이 "알자지라 알카드라"(초록 섬)라 부른 곳. 이 해안의 **곳간**이다.
  // 쌀·기장·코코넛을 배에 실어 몸바사를 먹였고, 몸바사가 포르투갈에 버틴 힘의 절반이
  // 이 섬의 곡식이었다. 그래서 1500년대에 포르투갈이 여기 총독을 앉히려 했다.
  { id: 'pemba',      name: '펨바',     area: '스와힐리',      style: 'swahili',  x: 312, y: 100, flag: 'swahili', seed: 4127, size: 1, industry: 1 },
  // 몸바사 — 이 해안 최대의 항구이자 가장 완강하게 저항한 도시. 1500·1505·1528·1589년에
  // 네 번 불탔고 그때마다 다시 섰다. 다우 건조 전통이 있어 industry 2.
  { id: 'mombasa',    name: '몸바사',   area: '스와힐리',      style: 'swahili',  x: 320, y: 90,  flag: 'swahili', seed: 4114, size: 3, industry: 2 },
  // 말린디 — 몸바사의 숙적이라 포르투갈과 손을 잡았다. 1498년 다 가마를 환대한 도시로
  // 그때 인구 5,000~10,000. 유럽 배에 관세가 헐한 것이 이 도시의 성격이다.
  { id: 'malindi',    name: '말린디',   area: '스와힐리',      style: 'swahili',  x: 338, y: 78,  flag: 'swahili', seed: 4115, size: 2, industry: 1 },
  // 라무·파테 군도 — 뱃집의 섬. 못 하나 안 쓰고 야자 노끈으로 판자를 꿰매는
  // 므템베 목수들이 여기 있었다. 1506년 포르투갈 봉쇄로 연 600메티칼의 조공을 물었다.
  { id: 'lamu',       name: '라무',     area: '스와힐리',      style: 'swahili',  x: 354, y: 54,  flag: 'swahili', seed: 4116, size: 2, industry: 2 },
  // 브라바(바라와) — 베나디르 해안의 도시국가. 일곱 형제가 세웠다는 이야기가 있고
  // 술탄이 아니라 장로들이 다스렸다. 바르보자는 이곳을 "돌과 석회로 잘 지은 좋은 도시"라
  // 적었고, 1507년 트리스탕 다 쿠냐가 약탈한 뒤에도 캄바트와의 무역은 이어졌다.
  // 내륙 소말리 대상이 유향과 몰약, 밀랍, 상아를 끌고 내려와 인도 면포와 바꿨다.
  // ★ 홍해 안쪽(마사와·수아킨)과 아덴은 중동 권역 소관이라 손대지 않았다 —
  //   이 항구는 아프리카 해안 바깥쪽, 인도양을 보고 선 자리다.
  { id: 'brava',      name: '브라바',   area: '베나디르',      style: 'swahili',  x: 352, y: 40,  flag: 'swahili', seed: 4128, size: 2, industry: 1 },
  // 모가디슈 — 이븐 바투타가 "지극히 큰 도시"라 적은 곳. 토브 베나디르라 불린 직물을
  // 이집트와 시리아로 내다 팔았다. 이 권역에서 유일하게 **만든 것을 수출하는** 항구다.
  { id: 'mogadishu',  name: '모가디슈', area: '베나디르',      style: 'swahili',  x: 364, y: 32,  flag: 'swahili', seed: 4117, size: 3, industry: 1 },
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

  /* ★ 새 항구를 이을 때의 규칙 — **연안 사슬은 사슬로만 늘린다.** 새 항구마다 이웃 둘씩
     붙였고 건너뛰는 선은 하나도 얹지 않았다. 기존 지름길(아르갱~엘미나, 상투메~루안다)이
     그대로 살아 있어야 "연안을 짚어 갈 것인가, 먼바다로 건너뛸 것인가"가 선택으로 남는다. */
  // 세네감비아·상류 기니 — 아르갱에서 황금해안까지 비어 있던 구간을 채운 사슬.
  ['arguin', 'goree'], ['goree', 'santiago'], ['goree', 'cacheu'],
  ['cacheu', 'axim'],
  // 황금해안~노예해안 — 실제로 항구가 가장 촘촘했던 해안. 부두가 없어 카누로 하역했다.
  ['elmina', 'accra'], ['accra', 'whydah'], ['whydah', 'gwato'],
  // 로안고·콩고 — 상투메~루안다 직항(8.0)과 나란히 가는 연안길. 짧고 안전하지만 세 번 선다.
  ['saotome', 'loango'], ['loango', 'mpinda'], ['mpinda', 'luanda'],

  // 동안 — 이미 촘촘했던 스와힐리 연안망. 사슬 하나에 킬와~몸바사 직항을 얹어
  // "잔지바르를 건너뛸 것인가"라는 선택만 남겼다(다 이으면 거미줄이 된다).
  ['sofala', 'mocambique'], ['sofala', 'kilwa'],
  ['mocambique', 'kilwa'],
  ['kilwa', 'zanzibar'], ['kilwa', 'mombasa'],
  ['zanzibar', 'mombasa'],
  ['mombasa', 'malindi'], ['malindi', 'lamu'], ['lamu', 'mogadishu'],

  // 인함반느는 소팔라 하나만 문다 — 남쪽 막다른 가지다(희망봉으로 잇지 않는 이유는 위에).
  ['sofala', 'inhambane'],
  ['sofala', 'quelimane'], ['quelimane', 'mocambique'],
  ['mocambique', 'angoche'], ['angoche', 'kilwa'],
  ['zanzibar', 'pemba'], ['pemba', 'mombasa'],
  ['lamu', 'brava'], ['brava', 'mogadishu'],
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

  // 서안 — 새로 이은 구간. 사하라~세네갈은 여전히 뭍이 비어 있고(7.0), 강어귀 구간은
  // 사주와 얕은 물이 값을 올리고(5.5), 요새 사이 짧은 연안은 이 바다에서 가장 싸다(4.5).
  'arguin|goree':    7.0,   // 사막 해안이 끝나는 구간. 아르갱~엘미나(9.0)를 절반으로 끊은 값이다
  'goree|santiago':  7.5,   // 카부베르드 곶에서 섬으로 500km 외해. 이 권역에서 가장 짧은 대양 건너기다
  'cacheu|goree':    5.5,   // 강과 갯벌의 해안 — 파도는 낮은데 사주가 얕아 배를 앉힌다
  'axim|cacheu':     8.0,   // 세라리오아~후추해안. 며칠을 가도 기항할 데가 없고 무풍대가 걸린다
  'accra|elmina':    4.5,   // 요새와 시장 사이 하루 거리. 다만 부두가 없어 하역 자체가 위험했다
  'accra|whydah':    5.5,   // 노예해안의 파도 — 사주를 넘는 카누가 뒤집히는 것이 상습이었다
  'gwato|whydah':    6.0,   // 라군 해안에서 베냉 강으로. 무풍대의 초입이라 값이 붙는다
  'loango|saotome':  7.5,   // 기니만을 남으로 가로지른다. 상투메~루안다 직항(8.0)보다 조금 짧다
  'loango|mpinda':   5.5,   // 콩고 강이 뱉는 물살이 바다로 100km를 뻗는다 — 남행이 특히 힘겹다
  'luanda|mpinda':   5.0,   // 콩고 어귀에서 루안다로 내려가는 연안 구간

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

  // 동안 — 새로 이은 구간. 스와힐리 연안은 산호초 안쪽 물길이라 대개 싸고,
  // 삼각주와 소말리 해안에서만 값이 오른다.
  'inhambane|sofala': 6.5,  // 소팔라 남쪽 — 바자루투의 사주와 아굴라스 해류가 남행을 막는다
  'quelimane|sofala': 5.5,  // 잠베지 삼각주. 물이 얕고 사주가 해마다 자리를 바꾼다
  'mocambique|quelimane': 5.0,
  'angoche|mocambique':   4.5,  // 섬과 늪 사이의 짧은 물길 — 다우는 지나고 큰 배는 못 지난다
  'angoche|kilwa':        6.0,  // 밀무역선의 길. 포르투갈 순양선이 지키던 구간이라 값이 붙는다
  'pemba|zanzibar':       4.0,  // 산호초 안쪽 — 이 권역에서 가장 안전한 구간에 든다
  'mombasa|pemba':        4.5,  // 펨바 해협은 깊고 물살이 빠르다
  'brava|lamu':           7.0,  // 베나디르 해안 — 부두가 없고 파도가 곧장 모래에 부딪친다
  'brava|mogadishu':      6.5,  // 하루 거리인데도 배를 댈 데가 없어 먼바다에 닻을 내렸다
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
  // 새로 이은 서안 구간 — 카나리아 해류(남하)·기니 해류(동진)·벵겔라 해류(북상)를 그대로 따른다
  'arguin|goree':     { from: 'arguin',   push: 0.12 },  // 카나리아 해류
  'goree|santiago':   { from: 'goree',    push: 0.08 },  // 곶에서 섬으로 밀려 나간다
  'cacheu|goree':     { from: 'goree',    push: 0.10 },
  'axim|cacheu':      { from: 'cacheu',   push: 0.10 },  // 기니 해류가 동으로 끌고 간다
  'accra|elmina':     { from: 'elmina',   push: 0.08 },
  'accra|whydah':     { from: 'accra',    push: 0.08 },
  'gwato|whydah':     { from: 'whydah',   push: 0.06 },  // 무풍대 초입 — 물길도 약해진다
  'loango|saotome':   { from: 'loango',   push: 0.08 },  // 벵겔라 해류가 북상 — 남행이 역류다
  'loango|mpinda':    { from: 'mpinda',   push: 0.10 },  // 콩고 강물이 북으로 휘어 나간다
  'luanda|mpinda':    { from: 'luanda',   push: 0.10 },

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
  // 새로 이은 동안 구간 — 동아프리카 연안류가 사철 북상하므로 from은 모두 남쪽 항구다
  'inhambane|sofala':     { from: 'inhambane',  push: 0.08 },
  'quelimane|sofala':     { from: 'quelimane',  push: 0.08 },
  'mocambique|quelimane': { from: 'quelimane',  push: 0.08 },
  'angoche|mocambique':   { from: 'mocambique', push: 0.08 },
  'angoche|kilwa':        { from: 'angoche',    push: 0.10 },
  'pemba|zanzibar':       { from: 'zanzibar',   push: 0.08 },
  'mombasa|pemba':        { from: 'pemba',      push: 0.08 },
  'brava|lamu':           { from: 'lamu',       push: 0.12 },  // 여름 소말리 해류
  'brava|mogadishu':      { from: 'brava',      push: 0.12 },
};
