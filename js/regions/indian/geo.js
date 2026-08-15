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
  // ── 구자라트 — 인도양에서 제일 부유한 상인 해안. 면포와 인디고가 여기서 나간다 ──
  { id: 'cambay',       name: '캄바트',       area: '구자라트',   style: 'levant',    x: 56,  y: 36,  flag: 'gujarat', seed: 5101, size: 3, industry: 2 },
  { id: 'surat',        name: '수라트',       area: '구자라트',   style: 'levant',    x: 80,  y: 50,  flag: 'gujarat', seed: 5102, size: 2, industry: 3 },
  { id: 'diu',          name: '디우',         area: '사우라슈트라', style: 'colonial',  x: 34,  y: 56,  flag: 'portugal',   seed: 5103, size: 2, industry: 2 },
  // ── 콘칸·카나라 — 데칸 술탄국들의 바다 문. 말과 은이 여기로 들어와 내륙으로 간다 ──
  // 차울은 갈베트(노 젓는 무장 연안선)의 전통 조선지라 industry 2다 — 1이면
  // ships.js의 yards가 값을 깎지 못하고 그냥 죽은 줄이 된다.
  { id: 'chaul',        name: '차울',         area: '콘칸',       style: 'malabar',   x: 64,  y: 84,  flag: 'gujarat', seed: 5104, size: 2, industry: 2 },
  { id: 'dabhol',       name: '다불',         area: '콘칸',       style: 'malabar',   x: 88,  y: 96,  flag: 'gujarat', seed: 5105, size: 2, industry: 1 },
  { id: 'goa',          name: '고아',         area: '고아',       style: 'colonial',  x: 64,  y: 112, flag: 'portugal',   seed: 5106, size: 3, industry: 3 },
  { id: 'bhatkal',      name: '바트칼',       area: '카나라',     style: 'malabar',   x: 92,  y: 126, flag: 'vijayanagara',  seed: 5107, size: 1, industry: 1 },
  // ── 말라바르 — 후추가 나는 유일한 해안. 이 게임 경제의 축이 여기 있다 ──
  { id: 'cannanore',    name: '칸나노르',     area: '말라바르',   style: 'malabar',   x: 68,  y: 140, flag: 'zamorin',  seed: 5108, size: 2, industry: 1 },
  { id: 'calicut',      name: '캘리컷',       area: '말라바르',   style: 'malabar',   x: 96,  y: 152, flag: 'zamorin',  seed: 5109, size: 3, industry: 2, prizeYard: true },
  { id: 'cochin',       name: '코친',         area: '말라바르',   style: 'colonial',  x: 72,  y: 166, flag: 'portugal',   seed: 5110, size: 3, industry: 2 },
  { id: 'quilon',       name: '킬론',         area: '말라바르',   style: 'malabar',   x: 100, y: 180, flag: 'zamorin',  seed: 5111, size: 1, industry: 1 },
  // ── 섬들 — 몰디브는 조개돈, 실론은 계피와 진주 ──
  { id: 'maldives',     name: '몰디브',       area: '몰디브',     style: 'swahili',   x: 36,  y: 190, flag: 'kotte', seed: 5112, size: 1, industry: 1 },
  { id: 'colombo',      name: '콜롬보',       area: '실론',       style: 'colonial',  x: 152, y: 188, flag: 'kotte',   seed: 5113, size: 2, industry: 1 },
  { id: 'galle',        name: '갈레',         area: '실론',       style: 'malabar',   x: 180, y: 198, flag: 'kotte',  seed: 5114, size: 1, industry: 1 },
  { id: 'jaffna',       name: '자프나',       area: '실론',       style: 'dravidian', x: 168, y: 166, flag: 'kotte',  seed: 5115, size: 1, industry: 1 },
  // ── 코로만델 — 항구다운 항구가 없는 모래 해안인데도 면포가 세계로 나간다 ──
  { id: 'nagapattinam', name: '나가파티남',   area: '코로만델',   style: 'dravidian', x: 216, y: 152, flag: 'vijayanagara',  seed: 5116, size: 2, industry: 2 },
  { id: 'pulicat',      name: '풀리카트',     area: '코로만델',   style: 'dravidian', x: 248, y: 124, flag: 'vijayanagara',  seed: 5117, size: 2, industry: 1 },
  { id: 'masulipatnam', name: '마술리파트남', area: '코로만델',   style: 'dravidian', x: 272, y: 92,  flag: 'vijayanagara', seed: 5118, size: 3, industry: 2 },
  // ── 벵골 — 쌀과 초석과 모슬린. 세계에서 배를 가장 싸게 짓던 곳이다 ──
  // 벵골은 목재가 흔해 삼각주 어디서나 배를 지었다(치타공 3 · 사트가온 2).
  { id: 'satgaon',      name: '사트가온',     area: '벵골',       style: 'levant',    x: 312, y: 48,  flag: 'bengal', seed: 5119, size: 2, industry: 2 },
  { id: 'chittagong',   name: '치타공',       area: '벵골',       style: 'levant',    x: 352, y: 66,  flag: 'bengal', seed: 5120, size: 2, industry: 3, prizeYard: true },
];

/* 항로 — 연안을 한 줄로 잇고, 건너뛰는 선은 셋만 두었다.
   ① calicut~goa  포르투갈 함대가 말라바르를 단숨에 오르내리던 길. 카나라를 건너뛴다.
   ② chittagong~masulipatnam  벵골만 어귀를 가로지르는 외해 항로.
   ③ maldives를 코친·킬론·콜롬보 셋에 붙였다 — 조개돈이 나가는 유일한 섬이라
      막다른 주머니로 두면 아무도 안 간다.
   실론은 킬론(말라바르)과 나가파티남(코로만델) 양쪽에 붙어 있어 서안↔동안을 잇는
   유일한 다리가 된다. 이 다리가 끊기면 후추와 면포가 서로 만나지 못한다.
   ★ 다른 권역으로 나가는 선은 `js/regions/index.js: OCEAN_LANES`에 있다. */
export const ROUTES = [
  ['cambay', 'diu'], ['cambay', 'surat'], ['diu', 'surat'],
  ['surat', 'chaul'], ['chaul', 'dabhol'], ['dabhol', 'goa'],
  ['goa', 'bhatkal'], ['bhatkal', 'cannanore'],
  ['goa', 'calicut'],
  ['cannanore', 'calicut'], ['calicut', 'cochin'], ['cochin', 'quilon'],
  ['cochin', 'maldives'], ['quilon', 'maldives'], ['maldives', 'colombo'],
  ['quilon', 'colombo'],
  ['colombo', 'galle'], ['colombo', 'jaffna'],
  ['galle', 'nagapattinam'], ['jaffna', 'nagapattinam'],
  ['nagapattinam', 'pulicat'], ['pulicat', 'masulipatnam'],
  ['masulipatnam', 'satgaon'], ['satgaon', 'chittagong'],
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
  // 구자라트 — 캄바트 만은 조수가 10m씩 오르내리고 카티아와르 연안은 사략의 땅이었다
  'cambay|diu': 6.0,
  'cambay|surat': 4.5,
  'diu|surat': 5.5,
  // 콘칸 — 데칸 술탄국들의 연안. 아군 해안이 늘 가깝다
  'chaul|surat': 5.0,
  'chaul|dabhol': 5.0,
  'dabhol|goa': 5.5,
  // 카나라 — 비자야나가르의 쌀 해안. 이 바다에서 가장 조용한 구간
  'bhatkal|goa': 4.5,
  'bhatkal|cannanore': 5.0,
  // 말라바르 — 마라카르의 바다
  'calicut|cannanore': 7.0,
  'calicut|cochin': 9.0,
  'calicut|goa': 8.5,
  'cochin|quilon': 6.0,
  // 몰디브 — 수면에서 겨우 몇 자 솟은 환초라 밤에는 보이지 않는다
  'cochin|maldives': 9.0,
  'maldives|quilon': 8.5,
  'colombo|maldives': 9.5,
  // 실론
  'colombo|quilon': 7.0,
  'colombo|galle': 4.0,
  'colombo|jaffna': 6.5,
  'galle|nagapattinam': 6.5,
  'jaffna|nagapattinam': 5.0,
  // 코로만델 — 천연 항구가 없어 배를 바깥에 세우고 거룻배로 짐을 옮긴다
  'nagapattinam|pulicat': 6.5,
  'masulipatnam|pulicat': 6.5,
  'masulipatnam|satgaon': 7.5,
  // 벵골 — 삼각주의 마그·페링기 사략, 그리고 만 어귀의 사이클론
  'chittagong|satgaon': 9.0,
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
  'chaul|surat':              { from: 'chaul',        push: 0.05 },
  'chaul|dabhol':             { from: 'dabhol',       push: 0.06 },
  'dabhol|goa':               { from: 'goa',          push: 0.06 },
  'bhatkal|goa':              { from: 'bhatkal',      push: 0.08 },
  'bhatkal|cannanore':        { from: 'cannanore',    push: 0.08 },
  'calicut|cannanore':        { from: 'calicut',      push: 0.10 },
  'calicut|cochin':           { from: 'cochin',       push: 0.10 },
  'maldives|quilon':          { from: 'quilon',       push: 0.12 },
  'colombo|maldives':         { from: 'colombo',      push: 0.12 },
  'colombo|galle':            { from: 'colombo',      push: 0.05 },
  'nagapattinam|pulicat':     { from: 'pulicat',      push: 0.08 },
  'masulipatnam|pulicat':     { from: 'masulipatnam', push: 0.08 },
  'masulipatnam|satgaon':     { from: 'satgaon',      push: 0.10 },
  'chittagong|masulipatnam':  { from: 'chittagong',   push: 0.10 },
};
