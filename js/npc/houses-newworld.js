// npc/houses-newworld.js — 카리브·남아메리카의 상단(商團)
//
// 이 두 바다의 상업은 한 문장으로 요약된다: **세비야가 독점을 선언했고, 그 틈에서
// 모두가 장사했다.** 카사 데 콘트라타시온(1503)이 인디아스 무역을 세비야 한 항구로
// 묶었고, 콘술라도(상인 길드)가 그 특권을 관리했다 — 그래서 두 바다 모두 "누가 자격을
// 쥐었나"로 첫 층이 갈린다: 세비야 카르가도레스 → 멕시코·리마 콘술라도 → 노예 아시엔토
// 계약상 순으로 특권이 내려간다.
//
// 그 아래 둘째 층은 **은의 사슬**이다. 포토시가 세계 은의 태반을 냈고, 그 은이 은
// 하나로 못 가는 것이 이 바다의 특징이다 — 수은(우앙카벨리카)이 없으면 아말감 정련이
// 안 되고, 노새가 없으면 산에서 바다로 못 내려온다. 그래서 은을 나르는 상단만큼
// 은이 나오게 하는 것을 나르는 상단(아소게로)이 이 명부에 무겁게 들어간다.
//
// 셋째 층은 **독점이 만든 틈**이다. 세비야가 합법을 정하면 정할수록 그 밖이 굵어졌다.
// 카리브 변방(리오아차·퀴라소·토르투가)의 밀무역, 라플라타로 새어 나가는 포토시 은,
// 이 모두가 "독점은 짧게 이기고 길게 진다"는 이 저장소의 문장을 그대로 증명한다.
// 그래서 이 명부는 **밀무역 상단을 일부러 여럿 넣었다** — 그것이 이 바다의 실제
// 경제였기 때문이다.
//
// 넷째, 브라질은 이 사슬 밖에 있다 — 은이 아니라 **설탕 계약**으로 굴렀다. 엔제뉴
// 주인(세뇨르 데 엔제뉴)이 사탕수수를 대고, 그 설탕이 리스본으로 건너가는 계약상의
// 손을 거친다. 같은 "계약이 특권이 되는" 구조이되 화폐가 은이 아니라 설탕이라는 점이
// 이 바다를 카리브와 갈라놓는다.

export const HOUSES_NEWWORLD = [
  /* ── 세비야의 특권 ──────────────────────────────────────────
     인디아스 무역 자격 그 자체를 쥔 세 상단. 위로 갈수록 특권이 크고 아래로 갈수록
     그 특권을 빌려 쓴다. */
  {
    id: 'cargadoresdeindias',
    name: '세비야 카르가도레스(적하상단)',
    region: 'caribbean',
    flag: 'spain',
    seats: ['sevilla', 'cadiz', 'havana', 'veracruz', 'cartagena'],
    goods: ['wine', 'oliveoil', 'woolcloth', 'silver', 'mercury'],
    capital: 9000000,
    fleet: 5,
    reach: 'ocean',
    temper: 0.35,
    season: null,
    rank: 5,
    blurb: '세비야 콘트라타시온에 등록된 적하상단. 서류가 곧 자격이다.',
    lines: {
      greet: '“카사 데 콘트라타시온의 등록 상단이오. 짐을 보기 전에 문서부터 봅시다.”',
      press: '“등록 없는 배와는 거래하지 않소. 규칙이오, 취향이 아니라.”',
      offer: '“유럽 물건이 필요하시오? 우리 창고가 세비야에서 가장 크오.”',
      help: '“신용장을 끊어 드리리다. 등록 상단의 이름은 그만한 값을 하오.”',
    },
  },
  {
    id: 'mexicoconsulado',
    name: '멕시코시티 콘술라도',
    region: 'caribbean',
    flag: 'spain',
    seats: ['veracruz', 'acapulco', 'campeche'],
    goods: ['silver', 'cochineal', 'vanilla', 'silk', 'cacao'],
    capital: 9450000,
    fleet: 5,
    reach: 'region',
    temper: 0.4,
    season: null,
    rank: 5,
    blurb: '누에바에스파냐 무역을 쥔 콘술라도. 은과 비단이 이 손을 거친다.',
    lines: {
      greet: '“누에바에스파냐 콘술라도요. 베라크루스와 아카풀코, 양쪽을 다 우리가 쥐고 있소.”',
      press: '“갈레온 값을 우리가 먼저 정하오. 다른 값은 인정 안 하오.”',
      offer: '“코치닐이 필요하면 말씀하시오. 물량은 우리가 댈 수 있소.”',
      help: '“두 바다를 다 아는 상단이오. 소식이라면 우리가 제일 빠르오.”',
    },
  },
  {
    id: 'cartagenaasiento',
    name: '카르타헤나 아시엔토 계약상',
    region: 'caribbean',
    flag: 'portugal',
    seats: ['cartagena', 'portobelo', 'veracruz', 'havana', 'lisboa'],
    goods: ['hide', 'sugar', 'wine', 'weapon'],
    capital: 3000000,
    fleet: 3,
    reach: 'ocean',
    temper: 0.5,
    season: null,
    rank: 4,
    blurb: '노예 아시엔토를 쥔 계약상단. 계약이 곧 독점이다.',
    lines: {
      greet: '“왕실 계약을 쥔 상단이오. 우리 배는 검문을 안 받소.”',
      press: '“계약이 우리 것이오. 남의 자리를 넘보지 마시오.”',
      offer: '“짐칸에 빈자리가 나면 알려 드리리다. 값은 후하게 쳐 드리오.”',
      help: '“이 항구의 세관은 우리와 말이 통하오. 얹어 드릴 수 있소.”',
    },
  },

  /* ── 세비야의 특권을 빌려 쓰는 자리 ────────────────────────── */
  {
    id: 'portobeloferistas',
    name: '포르토벨로 정기시(feria) 중개상단',
    region: 'caribbean',
    flag: 'spain',
    seats: ['portobelo', 'panama', 'cartagena', 'nombrededios'],
    goods: ['silver', 'mercury', 'woolcloth', 'wine'],
    capital: 4050000,
    fleet: 3,
    reach: 'region',
    temper: 0.3,
    season: 'summer',
    rank: 4,
    blurb: '함대가 와야 여는 장의 중개상. 사십 일이 한 해 벌이다.',
    lines: {
      greet: '“장이 섰소. 값은 오늘과 내일이 다르니 서두르시오.”',
      press: '“함대가 뜨면 이 부두는 다시 빈 항구요. 지금이 흥정할 때요.”',
      offer: '“수은을 쥐고 있소. 은과 같은 값을 쳐 드리오.”',
      help: '“다음 장이 언제 서는지는 우리가 제일 먼저 아오.”',
    },
  },

  /* ── 독점이 만든 틈 ────────────────────────────────────────── */
  {
    id: 'curacaowic',
    name: '퀴라소 서인도회사 밀무역 상관',
    region: 'caribbean',
    flag: 'burgundy',
    seats: ['curacao', 'riohacha', 'maracaibo', 'cartagena', 'amsterdam'],
    goods: ['tobacco', 'cacao', 'logwood', 'sarsaparilla'],
    capital: 840000,
    fleet: 3,
    reach: 'ocean',
    temper: 0.75,
    season: null,
    rank: 3,
    blurb: '자유항에서 스페인 밤배를 받는 밀무역 상관.',
    lines: {
      greet: '“여기는 자유항이오. 세관 이야기는 꺼내지 마시오.”',
      press: '“암스테르담이 값을 정하오. 세비야 값은 안 통하오.”',
      offer: '“유럽 물건을 은 없이도 바꿔 드리오. 담배와 카카오면 충분하오.”',
      help: '“스페인 순찰선의 항로는 우리가 늘 먼저 아오.”',
    },
  },
  {
    id: 'tortugafilibusteros',
    name: '토르투가·자메이카 밀무역 중개인',
    region: 'caribbean',
    flag: 'pirate',
    seats: ['tortuga', 'jamaica', 'stkitts'],
    goods: ['hide', 'logwood', 'sugar', 'weapon'],
    capital: 378000,
    fleet: 2,
    reach: 'region',
    temper: 0.85,
    season: null,
    rank: 2,
    blurb: '해안형제단의 장물을 값으로 바꾸는 중개인들.',
    lines: {
      greet: '“여기서 만난 적 없는 걸로 합시다. 그게 이 섬의 예의요.”',
      press: '“문서를 묻지 마시오. 값이 좋으면 됐지 않소.”',
      offer: '“가죽과 화약이오. 누구 것이었는지는 안 파오.”',
      help: '“총독의 배가 어디 있는지는 우리가 제일 잘 아오.”',
    },
  },

  /* ── 은의 사슬 ────────────────────────────────────────────── */
  {
    id: 'limaconsulado',
    name: '리마 상인단(콘술라도)',
    region: 'southamerica',
    flag: 'spain',
    seats: ['callao', 'arica', 'potosi'],
    goods: ['silver', 'wine', 'woolcloth'],
    capital: 5200000,
    fleet: 3,
    reach: 'ocean',
    temper: 0.4,
    season: null,
    rank: 5,
    blurb: '부왕령의 은을 쥔 리마 상인단. 왕실보다 먼저 시세를 안다.',
    lines: {
      greet: '“리마 콘술라도요. 카야오에 닿는 배는 다 우리를 거치오.”',
      press: '“포토시 값은 우리가 먼저 아오. 늦게 오면 헐값이오.”',
      offer: '“유럽 옷감이 필요하시오? 부왕령에서 우리보다 물량이 많은 곳은 없소.”',
      help: '“은길 소식이라면 우리가 제일 빠르오. 신용장을 끊어 드리리다.”',
    },
  },
  {
    id: 'consorcioazoguero',
    name: '포토시 은 정련·수은 계약상(아소게로)',
    region: 'southamerica',
    flag: 'spain',
    seats: ['potosi', 'huancavelica', 'arica', 'callao'],
    goods: ['mercury', 'silver', 'silverore'],
    capital: 40500000,
    fleet: 6,
    reach: 'region',
    temper: 0.45,
    season: null,
    rank: 5,
    blurb: '수은으로 은을 뽑는 정련 계약상. 안 오면 산이 선다.',
    lines: {
      greet: '“아소게로요. 우앙카벨리카 수은이 없으면 은은 돌덩이요.”',
      press: '“우리가 서면 포토시 전체가 서오. 그걸 잊지 마시오.”',
      offer: '“정련 은을 좋은 값에 넘기리다. 물량은 걱정 마시오.”',
      help: '“왕실 채무 장부도 우리 손을 거치오. 필요하면 말씀하시오.”',
    },
  },
  {
    id: 'buenosairesplateros',
    name: '부에노스아이레스 은 밀수 상인',
    region: 'southamerica',
    flag: 'portugal',
    seats: ['buenosaires', 'colonia', 'montevideo'],
    goods: ['silver', 'hide', 'woolcloth'],
    capital: 1080000,
    fleet: 2,
    reach: 'region',
    temper: 0.7,
    season: null,
    rank: 3,
    blurb: '포토시 은이 세비야를 안 거치고 새는 뒷문 상인.',
    lines: {
      greet: '“여기서 만난 적 없는 걸로 합시다.”',
      press: '“세가 없는 값이오. 세비야 값과 비교하지 마시오.”',
      offer: '“유럽 옷감을 은과 바꾸리다. 거리가 절반이니 서로 이득이오.”',
      help: '“강 건너 콜로니아의 소식은 우리가 제일 먼저 아오.”',
    },
  },

  /* ── 설탕 계약 (브라질 — 은의 사슬 밖) ───────────────────────── */
  {
    id: 'senhoresengenho',
    name: '브라질 설탕 엔제뉴 계약상단(세뇨르 데 엔제뉴)',
    region: 'southamerica',
    flag: 'portugal',
    seats: ['recife', 'salvador', 'ilheus', 'portoseguro', 'lisboa'],
    goods: ['sugar', 'brazilwood', 'cane', 'wine'],
    capital: 1620000,
    fleet: 4,
    reach: 'ocean',
    temper: 0.3,
    season: null,
    rank: 4,
    blurb: '엔제뉴 여럿을 낀 설탕 계약상단. 리스본이 값을 정한다.',
    lines: {
      greet: '“엔제뉴 계약상이오. 상자째로만 파오.”',
      press: '“리스본 값이 곧 우리 값이오. 흥정할 여지가 적소.”',
      offer: '“설탕에 붉은 나무를 얹어 드리리다. 배가 빈 채로 가면 손해요.”',
      help: '“대서양 양쪽 시세를 다 아는 상단이오. 소식을 드리리다.”',
    },
  },

  /* ── 목장과 잎사귀 — 라플라타의 곁가지 ─────────────────────── */
  {
    id: 'yerbamateros',
    name: '아순시온 예르바 마테 상인',
    region: 'southamerica',
    flag: 'spain',
    seats: ['asuncion', 'buenosaires', 'montevideo'],
    goods: ['yerbamate', 'hide', 'timber'],
    capital: 324000,
    fleet: 1,
    reach: 'region',
    temper: 0.35,
    season: null,
    rank: 2,
    blurb: '광부가 마시는 잎을 나르는 파라과이 상인.',
    lines: {
      greet: '“마테요. 파라과이에서 강을 타고 왔소.”',
      press: '“포토시까지 가면 값이 세 곱이오. 여기선 급하게 파오.”',
      offer: '“가죽도 함께 싣소. 강 위에서 나는 건 다 우리 짐이오.”',
      help: '“강 위 소식이라면 우리가 제일 빠르오.”',
    },
  },
  {
    id: 'laplatacueros',
    name: '리오데라플라타 가죽·우지 상인',
    region: 'southamerica',
    flag: 'spain',
    seats: ['montevideo', 'colonia', 'buenosaires'],
    goods: ['hide', 'tallow', 'charqui'],
    capital: 594000,
    fleet: 2,
    reach: 'region',
    temper: 0.35,
    season: null,
    rank: 3,
    blurb: '가죽과 우지로 광산을 먹이는 라플라타 상인.',
    lines: {
      greet: '“가죽과 수지요. 산 위 광산으로 올라갈 짐이오.”',
      press: '“소가 사람보다 많은 땅이오. 값을 너무 깎지는 마시오.”',
      offer: '“육포도 있소. 미타의 배급으로 나가는 물건이오.”',
      help: '“몬테비데오 부두 사정이라면 우리가 제일 밝소.”',
    },
  },
];
