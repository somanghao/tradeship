// regions/indian/geo.js — 인도양의 지리
//
// 좌표계는 **이 권역 전용 400×225**다. 다른 권역의 좌표와 아무 관계가 없다.
// 규약과 필드 설명은 `js/regions/mediterranean/geo.js`가 본보기다.
//
// ── 이 지도를 이렇게 그린 이유 ────────────────────────────────
// 아대륙을 **역삼각형**으로 놓았다. 왼쪽 위가 구자라트, 왼쪽 변을 타고 내려오면
// 콘칸·카나라·말라바르, 바닥에서 실론과 몰디브가 갈라지고, 오른쪽 변을 타고
// 올라가면 코로만델과 벵골이다. 이렇게 두면 원양 항로 셋이 각자 다른 모서리로
// 들어온다 — 호르무즈는 왼쪽 위(캄바트), 아덴은 왼쪽 아래(캘리컷),
// 말라카는 오른쪽 아래(나가파티남). 세 대양 관문이 한자리에 뭉치지 않는다.
//
// 서안이 지그재그로 물결치는 것은 **일부러**다. 이름표가 도시 위쪽에
// 박스째 그려져(한글 글자당 약 6px) 세로로 곧게 세우면 아래 도시의 이름표가
// 위 도시의 표식을 덮는다. 12~14px 간격으로 내려가려면 좌우로 24px씩 흔들어야 한다.
// 마침 말라바르는 석호(backwater) 해안이라 항구가 갯벌 안쪽과 바깥에 번갈아 앉는다 —
// 계산 결과가 지형과 어긋나지 않았다.
//
// ── 20 → 28곳으로 늘릴 때의 규칙 ─────────────────────────────
// 지중해가 28곳이라 이 바다도 거기에 맞췄다. 새 항구는 **기존 항구를 옮기지 않고**
// 사이에 끼워 넣었고, 자리를 고를 때 셋을 지켰다:
//   ① 기존 도시와 최소 12px 떨어뜨린다(이름표 상자가 서로를 덮지 않는 최소 간격).
//   ② 연안 항로 회랑에서 **뭍 쪽으로** 10px 남짓 물린다. 회랑 위에 놓으면
//      `sprites/maps/auto.js`가 그 자리를 물로 파서 항구가 해협 한가운데 뜬다.
//      서안은 동쪽이 뭍이고 동안(코로만델)은 서쪽이 뭍이다 — 물리는 방향이 반대다.
//   ③ 한 지방에 몰지 않는다. 신드·구자라트·콘칸·카나라·말라바르·어장해안·
//      코로만델·벵골에 하나씩 나눠 여덟 곳을 채웠다.

/** 도시의 지리·외형. 필드 뜻은 지중해 geo.js 참조.
    flag  ★ FLAGS에 인도 세력의 깃발이 아직 하나도 없다. 셋으로 갈라 빌려 썼다:
          spain=포르투갈령(고아·코친·디우·콜롬보) · ottoman=이슬람 술탄국(구자라트·데칸·벵골·몰디브)
          · venice=힌두/불교 토착 왕국(사무티리·콜라티리·비자야나가르·자프나·코테).
          붉은 바탕 금색 문장이라 남인도 라자의 기치로 읽어도 어색하지 않다.
          진짜 도안은 근거 JSON의 art.flagTodo에.
    style 'malabar'(가파른 기와·목조 회랑·야자숲)를 말라바르·콘칸에, 'dravidian'(라테라이트 담·고푸람)을
          코로만델·자프나에, 'colonial'(회벽 능보)을 포르투갈 요새도시에, 'swahili'(산호석)를 몰디브에 쓴다.
          구자라트·벵골 이슬람 항구는 그대로 levant — 굽은 처마의 벵골 화풍은 아직 없다(art.styleTodo).
    prizeYard 나포선을 뜯어 파는 항구. 캘리컷은 쿤할리 마라카르가 포르투갈 배를 끌고 왔고,
          치타공은 아라칸·포르투갈 사략이 벵골만에서 턴 배를 부리던 소굴이었다. */
export const CITIES = [
  // ── 신드 — 인더스가 바다로 나오는 자리. 아대륙 서북 구석의 문이다 ──
  // 타타는 인더스 항행의 종점이자 신드의 수도였고, 외항 라리반다르가 그 하구를 지켰다.
  // 신드 무명(로히·주트르)과 인디고를 내고, 큰 숲이 없어 강선을 지을 티크는 말라바르에서 사 왔다.
  { id: 'thatta',       name: '타타',         area: '신드',       style: 'levant',    x: 42,  y: 22,  flag: 'gujarat', seed: 5121, size: 2, industry: 1 },
  // ── 구자라트 — 인도양에서 제일 부유한 상인 해안. 면포와 인디고가 여기서 나간다 ──
  { id: 'cambay',       name: '캄바트',       area: '구자라트',   style: 'levant',    x: 56,  y: 36,  flag: 'gujarat', seed: 5101, size: 3, industry: 2 },
  // 바루치(옛 바리가자)는 나르마다 하구의 고항이다 — 로마 배가 대던 자리에 그대로 있었고,
  // '바프타'라 불린 이 항구의 무명이 홍해·페르시아만 어디서나 그 이름으로 팔렸다.
  // 캄바트 만 안쪽이라 조수 역류가 무섭지, 사략이 무서운 구간은 아니다.
  { id: 'bharuch',      name: '바루치',       area: '구자라트',   style: 'levant',    x: 60,  y: 50,  flag: 'gujarat', seed: 5122, size: 2, industry: 2 },
  { id: 'surat',        name: '수라트',       area: '구자라트',   style: 'levant',    x: 80,  y: 50,  flag: 'gujarat', seed: 5102, size: 2, industry: 3 },
  { id: 'diu',          name: '디우',         area: '사우라슈트라', style: 'colonial',  x: 34,  y: 56,  flag: 'portugal',   seed: 5103, size: 2, industry: 2 },
  // ── 콘칸·카나라 — 데칸 술탄국들의 바다 문. 말과 은이 여기로 들어와 내륙으로 간다 ──
  // 바세인(바사이)은 1534년 구자라트 술탄이 포르투갈에 넘긴 항구다. '북부주'의 수도가 되어
  // 고아 다음으로 큰 조선대를 굴렸다 — 서고츠의 티크가 강을 타고 내려와 여기서 갤리언이 됐다.
  // 살세테의 염전이 붙어 있어 소금도 낸다. industry 3은 그 조선대의 값이다.
  { id: 'bassein',      name: '바세인',       area: '콘칸',       style: 'colonial',  x: 86,  y: 66,  flag: 'portugal',   seed: 5123, size: 2, industry: 3 },
  // 차울은 갈베트(노 젓는 무장 연안선)의 전통 조선지라 industry 2다 — 1이면
  // ships.js의 yards가 값을 깎지 못하고 그냥 죽은 줄이 된다.
  { id: 'chaul',        name: '차울',         area: '콘칸',       style: 'malabar',   x: 64,  y: 84,  flag: 'gujarat', seed: 5104, size: 2, industry: 2 },
  { id: 'dabhol',       name: '다불',         area: '콘칸',       style: 'malabar',   x: 88,  y: 96,  flag: 'gujarat', seed: 5105, size: 2, industry: 1 },
  { id: 'goa',          name: '고아',         area: '고아',       style: 'colonial',  x: 64,  y: 112, flag: 'portugal',   seed: 5106, size: 3, industry: 3 },
  { id: 'bhatkal',      name: '바트칼',       area: '카나라',     style: 'malabar',   x: 92,  y: 126, flag: 'vijayanagara',  seed: 5107, size: 1, industry: 1 },
  // 망갈로르는 카나라 쌀이 바다로 나가는 최대 선적항이었다. 먹을 것이 모자란 말라바르와
  // 나무 한 그루 없는 호르무즈가 이 쌀로 먹었다 — 쌀이 곧 이 항구의 무기였다.
  { id: 'mangalore',    name: '망갈로르',     area: '카나라',     style: 'malabar',   x: 98,  y: 138, flag: 'vijayanagara',  seed: 5124, size: 2, industry: 1 },
  // ── 말라바르 — 후추가 나는 유일한 해안. 이 게임 경제의 축이 여기 있다 ──
  { id: 'cannanore',    name: '칸나노르',     area: '말라바르',   style: 'malabar',   x: 68,  y: 140, flag: 'zamorin',  seed: 5108, size: 2, industry: 1 },
  { id: 'calicut',      name: '캘리컷',       area: '말라바르',   style: 'malabar',   x: 96,  y: 152, flag: 'zamorin',  seed: 5109, size: 3, industry: 2, prizeYard: true },
  // 크랑가노르(코둥갈루르)는 로마 배가 대던 옛 무지리스다. 1341년 홍수가 강 하구를 막아
  // 대항의 자리를 코친에 넘겼지만, 유대인 거리와 성 토마스의 시리아 기독교 회당이 남았고
  // 포르투갈이 1523년 요새를 얹었다. 이제는 야자와 후추가 나가는 석호 포구다.
  // style은 colonial이 아니라 malabar다 — 요새 하나 말고는 야자숲 속 옛 포구 그대로였다.
  { id: 'cranganore',   name: '크랑가노르',   area: '말라바르',   style: 'malabar',   x: 100, y: 164, flag: 'portugal',   seed: 5125, size: 1, industry: 1 },
  { id: 'cochin',       name: '코친',         area: '말라바르',   style: 'colonial',  x: 72,  y: 166, flag: 'portugal',   seed: 5110, size: 3, industry: 2 },
  { id: 'quilon',       name: '킬론',         area: '말라바르',   style: 'malabar',   x: 100, y: 180, flag: 'zamorin',  seed: 5111, size: 1, industry: 1 },
  // ── 어장해안 — 마나르 만의 진주 채취장. 실론과 아대륙이 서로 마주 보는 얕은 바다 ──
  // 투티코린(툿투쿠디)은 파라바 잠수부의 항구다. 1532~37년 그들이 개종하며 포르투갈
  // 보호 아래로 들어가 '어장해안(Costa da Pescaria)'이 생겼다. 부두까지 염전이 이어진다.
  // 깃발은 vijayanagara — 이 해안의 땅은 마두라이 나야카, 곧 비자야나가르의 것이었다.
  { id: 'tuticorin',    name: '투티코린',     area: '어장해안',   style: 'dravidian', x: 144, y: 170, flag: 'vijayanagara',  seed: 5126, size: 1, industry: 1 },
  // ── 섬들 — 몰디브는 조개돈, 실론은 계피와 진주 ──
  { id: 'maldives',     name: '몰디브',       area: '몰디브',     style: 'swahili',   x: 36,  y: 190, flag: 'kotte', seed: 5112, size: 1, industry: 1 },
  { id: 'colombo',      name: '콜롬보',       area: '실론',       style: 'colonial',  x: 152, y: 188, flag: 'kotte',   seed: 5113, size: 2, industry: 1 },
  { id: 'galle',        name: '갈레',         area: '실론',       style: 'malabar',   x: 180, y: 198, flag: 'kotte',  seed: 5114, size: 1, industry: 1 },
  { id: 'jaffna',       name: '자프나',       area: '실론',       style: 'dravidian', x: 168, y: 166, flag: 'kotte',  seed: 5115, size: 1, industry: 1 },
  // ── 코로만델 — 항구다운 항구가 없는 모래 해안인데도 면포가 세계로 나간다 ──
  { id: 'nagapattinam', name: '나가파티남',   area: '코로만델',   style: 'dravidian', x: 216, y: 152, flag: 'vijayanagara',  seed: 5116, size: 2, industry: 2 },
  // 산투메(상투메 데 멜리아포르)는 성 토마스의 무덤 위에 선 도시다. 왕의 요새도 세관도 없이
  // 포르투갈 사인(카사두)들이 제 배로 굴린 사무역의 소굴이라, 코로만델 무명이 카르타즈 장부에
  // 안 남는 길로 믈라카·페구로 빠져나갔다. 관세를 거의 안 물린 것이 이 도시의 성격이다.
  { id: 'santhome',     name: '산투메',       area: '코로만델',   style: 'colonial',  x: 224, y: 129, flag: 'portugal',   seed: 5127, size: 2, industry: 1 },
  { id: 'pulicat',      name: '풀리카트',     area: '코로만델',   style: 'dravidian', x: 248, y: 124, flag: 'vijayanagara',  seed: 5117, size: 2, industry: 1 },
  { id: 'masulipatnam', name: '마술리파트남', area: '코로만델',   style: 'dravidian', x: 272, y: 92,  flag: 'vijayanagara', seed: 5118, size: 3, industry: 2 },
  // ── 벵골 — 쌀과 초석과 모슬린. 세계에서 배를 가장 싸게 짓던 곳이다 ──
  // 벵골은 목재가 흔해 삼각주 어디서나 배를 지었다(치타공 3 · 사트가온 2 · 후글리 2).
  // 후글리는 사트가온의 강이 메워지자 1580년경 무굴의 허락을 받아 새로 선 항구다 —
  // '포르투 페케노'라는 이름의 실체가 강을 몇 리 내려와 여기로 옮겨 앉았다.
  // 다카 모슬린·비하르 초석에 벵골 설탕까지 실린다.
  { id: 'hooghly',      name: '후글리',       area: '벵골',       style: 'levant',    x: 300, y: 62,  flag: 'bengal', seed: 5128, size: 2, industry: 2 },
  { id: 'satgaon',      name: '사트가온',     area: '벵골',       style: 'levant',    x: 312, y: 48,  flag: 'bengal', seed: 5119, size: 2, industry: 2 },
  { id: 'chittagong',   name: '치타공',       area: '벵골',       style: 'levant',    x: 352, y: 66,  flag: 'bengal', seed: 5120, size: 2, industry: 3, prizeYard: true },
];

/* 항로 — 연안을 한 줄로 잇고, 건너뛰는 선은 넷만 두었다.
   ① calicut~goa  포르투갈 함대가 말라바르를 단숨에 오르내리던 길. 카나라를 건너뛴다.
   ② chittagong~masulipatnam  벵골만 어귀를 가로지르는 외해 항로.
   ③ maldives를 코친·킬론·콜롬보 셋에 붙였다 — 조개돈이 나가는 유일한 섬이라
      막다른 주머니로 두면 아무도 안 간다.
   ④ chittagong~hooghly  포르투 그란지와 포르투 페케노, 벵골의 두 포르투갈 항구를
      직접 이었다. 삼각주를 빙 돌지 않고 만 어귀를 질러가는 대신 요율이 이 권역 둘째로 높다.

   새로 얹은 여덟 항구는 모두 **연안 사슬의 사이에 끼워** 넣었다 — 막다른 가지를 만들면
   그 항구는 지나가는 배가 없어 값이 굳는다. 타타(신드)만 사슬의 끝인데, 그 끝이
   호르무즈행 원양 항로가 붙은 캄바트 바로 옆이라 막다른 주머니가 되지 않는다.
   실론은 킬론(말라바르)과 나가파티남(코로만델) 양쪽에 붙어 있어 서안↔동안을 잇는
   유일한 다리가 된다. 이 다리가 끊기면 후추와 면포가 서로 만나지 못한다.
   ★ 다른 권역으로 나가는 선은 `js/regions/index.js: OCEAN_LANES`에 있다. */
export const ROUTES = [
  ['thatta', 'cambay'], ['thatta', 'diu'],
  ['cambay', 'diu'], ['cambay', 'surat'], ['diu', 'surat'],
  ['bharuch', 'cambay'], ['bharuch', 'surat'],
  ['surat', 'chaul'], ['bassein', 'surat'], ['bassein', 'chaul'],
  ['chaul', 'dabhol'], ['dabhol', 'goa'],
  ['goa', 'bhatkal'], ['bhatkal', 'mangalore'], ['mangalore', 'cannanore'],
  ['bhatkal', 'cannanore'],
  ['goa', 'calicut'],
  ['cannanore', 'calicut'], ['calicut', 'cochin'], ['cochin', 'quilon'],
  ['calicut', 'cranganore'], ['cochin', 'cranganore'],
  ['cochin', 'maldives'], ['quilon', 'maldives'], ['maldives', 'colombo'],
  ['quilon', 'colombo'],
  ['quilon', 'tuticorin'], ['tuticorin', 'jaffna'], ['tuticorin', 'colombo'],
  ['colombo', 'galle'], ['colombo', 'jaffna'],
  ['galle', 'nagapattinam'], ['jaffna', 'nagapattinam'],
  ['nagapattinam', 'pulicat'],
  ['nagapattinam', 'santhome'], ['santhome', 'pulicat'],
  ['pulicat', 'masulipatnam'],
  ['masulipatnam', 'satgaon'], ['satgaon', 'chittagong'],
  ['masulipatnam', 'hooghly'], ['hooghly', 'satgaon'], ['hooghly', 'chittagong'],
  ['masulipatnam', 'chittagong'],
];

/* 항로 위험도 — **당대 해상보험 요율(%)**이다.
   인도양에는 지중해 같은 인수업자 장부가 남아 있지 않다. 그래서 지중해에서 뽑은
   앵커(내해 2 · 평범한 연안 4~5.5 · 외해/적대 6~8 · 사략 소굴 9~11)에
   이 바다의 사실을 얹어 채웠다. 값을 가르는 축은 셋이다 —
     ① 사략이 실제로 있었나  ② 며칠씩 뭍이 안 보이나  ③ 양단의 깃발이 적대인가.

   이 바다가 지중해와 다른 점 둘:
     · **말라바르 해적** — 사무티리의 제독 쿤할리 마라카르 4대가 1520~1600년 내내
       포르투갈 배를 노렸다. 캘리컷~코친은 사무티리와 포르투갈 동맹 코친이
       서로 배를 태우던 구간이라 이 권역 최고 요율급이다.
     · **벵골만의 폭풍과 아라칸·포르투갈 사략** — 만 어귀를 가로지르는 구간은
       사이클론에 뭍도 안 보이고, 치타공은 그 사략선의 소굴이었다.
   판정과 출처는 `content/regions/indian-evidence.json`의 routes가 정본이다. */
export const ROUTE_RISK = {
  // 신드 — 인더스 삼각주와 쿠치 사이는 상가니안(카티아와르·쿠치의 뱃사략)의 물이었다.
  // 얕은 사주가 몇 리씩 뻗어 큰 배는 뭍을 멀리 두고 돌아야 했다 — 그것이 사략에게 이롭다.
  'cambay|thatta': 6.5,
  'diu|thatta': 7.0,
  // 구자라트 — 캄바트 만은 조수가 10m씩 오르내리고 카티아와르 연안은 사략의 땅이었다
  'cambay|diu': 6.0,
  'cambay|surat': 4.5,
  'diu|surat': 5.5,
  // 바루치 — 만 가장 안쪽의 두 구간. 무서운 것은 사략이 아니라 나르마다의 조수 역류다.
  // 이 권역에서 가장 낮은 요율을 여기 두었다(내해에 준한다).
  'bharuch|cambay': 4.0,
  'bharuch|surat': 4.5,
  // 콘칸 — 데칸 술탄국들의 연안. 아군 해안이 늘 가깝다
  'chaul|surat': 5.0,
  'bassein|surat': 5.0,
  // 바세인~차울은 포르투갈 북부주의 안마당이라 갈베트가 상시 순찰했다
  'bassein|chaul': 4.5,
  'chaul|dabhol': 5.0,
  'dabhol|goa': 5.5,
  // 카나라 — 비자야나가르의 쌀 해안. 이 바다에서 가장 조용한 구간
  'bhatkal|goa': 4.5,
  'bhatkal|mangalore': 4.5,
  'bhatkal|cannanore': 5.0,
  // 망갈로르에서 남으로 한 발 내려서면 마라카르의 물이 시작된다
  'cannanore|mangalore': 5.5,
  // 말라바르 — 마라카르의 바다
  'calicut|cannanore': 7.0,
  'calicut|cochin': 9.0,
  'calicut|goa': 8.5,
  // 크랑가노르는 사무티리와 포르투갈 코친이 서로 노리던 사이에 끼어 있다.
  // 캘리컷 쪽이 코친 쪽보다 위험한 것은 사무티리의 배가 북에서 내려왔기 때문이다.
  'calicut|cranganore': 8.0,
  'cochin|cranganore': 7.5,
  'cochin|quilon': 6.0,
  // 몰디브 — 수면에서 겨우 몇 자 솟은 환초라 밤에는 보이지 않는다
  'cochin|maldives': 9.0,
  'maldives|quilon': 8.5,
  'colombo|maldives': 9.5,
  // 어장해안 — 마나르 만은 진주 채취선이 떠 있는 얕은 물이라 양안이 늘 보인다.
  // 대신 코모린 곶을 도는 구간은 곶에서 바람이 뒤집혀 배가 서안에 밀려 붙었다.
  'quilon|tuticorin': 7.5,
  'jaffna|tuticorin': 4.5,
  // 콜롬보행은 만나르의 사주(라마의 다리)를 우회해야 한다
  'colombo|tuticorin': 6.5,
  // 실론
  'colombo|quilon': 7.0,
  'colombo|galle': 4.0,
  'colombo|jaffna': 6.5,
  'galle|nagapattinam': 6.5,
  'jaffna|nagapattinam': 5.0,
  // 코로만델 — 천연 항구가 없어 배를 바깥에 세우고 거룻배로 짐을 옮긴다
  'nagapattinam|pulicat': 6.5,
  'nagapattinam|santhome': 6.0,
  'pulicat|santhome': 5.5,
  'masulipatnam|pulicat': 6.5,
  'masulipatnam|satgaon': 7.5,
  // 벵골 — 삼각주의 마그·페링기 사략, 그리고 만 어귀의 사이클론
  // 후글리~사트가온은 같은 강의 두 부두다. 사주가 무섭지 뭍이 안 보이는 구간은 아니지만,
  // 마그의 배가 강 위까지 올라와 촌락을 털었으니 내해(null)로 둘 수는 없다.
  'hooghly|satgaon': 5.0,
  'hooghly|masulipatnam': 7.5,
  'chittagong|satgaon': 9.0,
  'chittagong|hooghly': 9.5,
  'chittagong|masulipatnam': 10.0,
};

/* 해류·계절풍 — **이 바다의 법은 계절풍이다.**
   반년은 남서풍(6~9월), 반년은 북동풍(10~12월)이고 그 사이에 아예 못 가는 철이 있다.
   게임 엔진에는 아직 계절이 없어 `CURRENTS`는 방향이 고정된 밀어주기 하나뿐이다.
   그래서 **배가 실제로 다니던 철의 방향**을 골라 적었다 — 계절풍이 안 부는 철에는
   애초에 배를 안 띄웠으니, 다니던 철의 물길이 곧 그 구간의 물길이다.

     · 서안(구자라트→말라바르): 남서 계절풍이 부는 철엔 연안류가 **북상**한다.
       그래서 남쪽 항구에서 북으로 갈 때 밀린다(from = 남쪽 항구).
     · 몰디브 쪽: 적도 해류가 서로 흐른다. 인도·실론에서 환초로 갈 때 밀린다.
     · 동안(코로만델): 북동 계절풍 철에 연안류가 **남하**한다(from = 북쪽 항구).
     · 벵골만: 큰 시계반대 순환이라 치타공에서 서남쪽으로 나갈 때 밀린다.
   근거는 evidence의 openQuestions에 한계를 적어 두었다. */
export const CURRENTS = {
  'cambay|thatta':            { from: 'cambay',       push: 0.05 },
  'diu|thatta':               { from: 'diu',          push: 0.06 },
  'bharuch|cambay':           { from: 'bharuch',      push: 0.04 },
  'bharuch|surat':            { from: 'surat',        push: 0.04 },
  'chaul|surat':              { from: 'chaul',        push: 0.05 },
  'bassein|surat':            { from: 'bassein',      push: 0.05 },
  'bassein|chaul':            { from: 'chaul',        push: 0.05 },
  'chaul|dabhol':             { from: 'dabhol',       push: 0.06 },
  'dabhol|goa':               { from: 'goa',          push: 0.06 },
  'bhatkal|goa':              { from: 'bhatkal',      push: 0.08 },
  'bhatkal|mangalore':        { from: 'mangalore',    push: 0.08 },
  'cannanore|mangalore':      { from: 'cannanore',    push: 0.08 },
  'bhatkal|cannanore':        { from: 'cannanore',    push: 0.08 },
  'calicut|cannanore':        { from: 'calicut',      push: 0.10 },
  'calicut|cochin':           { from: 'cochin',       push: 0.10 },
  'calicut|cranganore':       { from: 'cranganore',   push: 0.10 },
  'cochin|cranganore':        { from: 'cochin',       push: 0.10 },
  'maldives|quilon':          { from: 'quilon',       push: 0.12 },
  // 코모린 곶에서는 남서 계절풍 철의 물길이 모퉁이를 돌아 **동으로** 꺾여 마나르 만으로 든다.
  // 같은 킬론에서 서(몰디브)로도 밀리고 동(어장해안)으로도 밀리는 것이 모순처럼 보이지만,
  // 앞의 것은 적도 해류이고 이것은 곶을 도는 연안류다 — 위도가 다른 두 물길이다.
  'quilon|tuticorin':         { from: 'quilon',       push: 0.10 },
  'jaffna|tuticorin':         { from: 'tuticorin',    push: 0.06 },
  'colombo|maldives':         { from: 'colombo',      push: 0.12 },
  'colombo|galle':            { from: 'colombo',      push: 0.05 },
  'nagapattinam|pulicat':     { from: 'pulicat',      push: 0.08 },
  'nagapattinam|santhome':    { from: 'santhome',     push: 0.08 },
  'pulicat|santhome':         { from: 'pulicat',      push: 0.08 },
  'masulipatnam|pulicat':     { from: 'masulipatnam', push: 0.08 },
  'masulipatnam|satgaon':     { from: 'satgaon',      push: 0.10 },
  // 후글리~사트가온은 강물이다. 내려가는 쪽으로만 밀린다 — 올라갈 때는 조수를 기다렸다.
  'hooghly|satgaon':          { from: 'satgaon',      push: 0.06 },
  'hooghly|masulipatnam':     { from: 'hooghly',      push: 0.10 },
  'chittagong|hooghly':       { from: 'chittagong',   push: 0.10 },
  'chittagong|masulipatnam':  { from: 'chittagong',   push: 0.10 },
};
