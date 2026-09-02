// npc/houses-asia.js — 중동·인도양·동남아·동아시아의 상단(商團)
//
// 이 네 바다는 하나의 사슬로 이어져 있다. 인도의 면포·인디고가 홍해의 은·금과 바뀌고,
// 그 면포가 다시 향료제도의 정향·육두구와 바뀌고, 그 향료가 믈라카를 거쳐 중국의 생사·자기와
// 바뀌고, 그 생사가 일본의 은과 바뀐다 — 은이 서에서 동으로 갈수록 값이 오르고(명 금은비
// 1:6, 일본 1:10~12, 유럽 1:12~15), 그 격차가 배를 계속 밀어낸다. 그래서 아래 스무 상단은
// 저마다 **이 사슬의 한 구간**을 쥔 자들이다 — 향신료를 캐는 자가 아니라 나르는 자,
// 파는 자가 아니라 값을 매기는 자다.
//
// ── 이 상단들을 이렇게 고른 이유 ──────────────────────────────
// ① **디아스포라와 왕실을 나란히 두었다.** 하드라미·바니아·체티·아르메니아·휘주상인은
//    나라 없이 신용과 친족망으로 버틴 상인이고, 아체 왕실무역단·류큐 조공무역청·
//    경강상인(관허 조운)은 왕권이 상업을 직접 쥔 쪽이다. 이 둘의 대비가 곧 근세 아시아
//    교역의 두 얼굴이다.
// ② **바다마다 하나씩은 "무력을 겸한 상단"을 넣었다.** 마라카르 가문(자모린의 해군 겸
//    상인), 정씨 해상집단(명의 변경에서 사무역과 무력을 함께 쥔 집단), 아체 왕실무역단
//    (오스만제 화포로 무장한 후추 직송선)이 그것이다 — `temper`를 높게 둔 것도 이 때문이다.
// ③ **자본의 절대값은 사료마다 격차가 크다.** 개별 대상인(비르지 보라·휘주 염상)의
//    결산은 전설적인 규모로 전해지지만 대다수 상단은 결산 자료가 아예 없다. 그래서
//    수치가 있는 곳은 그대로 옮기고, 없는 곳은 같은 파일 안 동급 상단과의 **서열**로
//    추정했다 — 근거 JSON의 verdict를 보면 어느 쪽인지 알 수 있다.
// ④ **계절풍이 이 넷을 하나로 묶는다.** 구자라트 함대의 여름 홍해행, 아체의 여름 직항,
//    오만 다우의 겨울 남행, 류큐 진공선의 겨울 북행, 월항 정크의 겨울 남행 — 방향은
//    다르지만 전부 같은 바람 체계 안에서 정해진다.
//
// ── 필드는 js/npc/houses.js(설계 §2-1)와 동일 ──────────────────
//   id·name·region·flag·seats·goods·capital·fleet·reach·temper·season·rank·blurb·lines
//   capital(닢) 환산 규약: 선원 1인 연봉 ≈ 1,100닢 · 곡물 1단위 기준가 ≈ 12닢.
//   사료의 자본을 "선원 몇 명의 1년 치인가"로 환산해 적었다 — 근거는
//   .playtest/round-25/houses-asia-evidence.json.

export const HOUSES_ASIA = [
  /* ══════════════════════ 중동·홍해·페르시아만 ══════════════════════ */
  {
    id: 'karimi',
    name: '카리미 상인단',
    region: 'mideast',
    flag: null,
    /* 홍해–인도양 향신료를 쥔 **대상인 조합**. 맘루크 술탄과 이익을 나누며 카이로·지다·아덴을
       잇는 축을 사실상 독점했고, 알렉산드리아에서 베네치아 갤리에 넘기는 마지막 손이 이들이었다.
       ★ 이 바다에서 가장 큰 자본이다 — 기존 중동 상단은 친족망(하드라마우트 3)·선주단(무스카트 4)·
         환전상(줄파 4)·중개상(바스라 2)이라 **「축을 쥔 조합」 자리가 비어 있었다.**
       ★ 세력(`FACTIONS`)과 안 겹친다 — 맘루크·오스만은 정치체이고 이쪽은 그 그늘에서 도는 자본이다.
       ⚠️ 시대가 조금 이르다(전성기는 맘루크기다). **연도를 고정하지 않는다**는 최상위 지침대로
         두되 근거에 `verdict: "gameplay"`로 남긴다 — 알고 그렇게 둔 것이다.
       자본은 동급 조합과의 상대 서열로 잡았다: 무스카트 선주단(rank 4)의 위, 이 바다의 천장. */
    seats: ['cairo', 'jeddah', 'aden', 'alexandria'],
    goods: ['spice', 'pepper', 'incense', 'silk'],
    capital: 9000000,
    fleet: 4,
    reach: 'ocean',
    temper: 0.30,
    season: null,
    rank: 5,
    blurb: '향신료가 홍해를 올라오는 길목을 통째로 쥔 조합. 값은 카이로에서 정해진다.',
    lines: {
      greet: '“카리미요. 이 바다의 후추는 우리 장부를 한 번 지나가오.”',
      press: '“값을 흔들지 마시오. 카이로가 먼저 알고, 그다음에 당신이 알게 되오.”',
      deal: '“지다까지 오시오. 거기서라면 이야기가 되오.”',
      offer: '“후추를 넘기시오. 카이로 값에서 한 몫만 떼고 나머지는 당신 것이오.”',
      help: '“홍해는 길이 하나뿐이오. 우리 배 뒤를 따르시오.”',
    },
  },
  {
    id: 'hadrami',
    name: '하드라마우트 상인망',
    region: 'mideast',
    flag: null,
    // 아라비아 남안에서 아덴만·소코트라를 지나 말라바르까지 — 향과 대추야자를 좇아
    // 뻗은 디아스포라의 옛 항로다. 나라가 아니라 친족망이 신용을 대신했다.
    seats: ['shihr', 'aden', 'muscat', 'socotra', 'calicut'],
    goods: ['incense', 'dates', 'horse', 'ambergris'],
    capital: 1200000,
    fleet: 2,
    reach: 'ocean',
    temper: 0.35,
    season: null,
    rank: 3,
    blurb: '향과 대추야자를 좇아 아라비아 남안에 뿌리내린 친족 상인망.',
    lines: {
      greet: '“시흐르에서 왔소. 우리 집안은 이 바다에 삼대째 있소.”',
      press: '“향은 우리 손을 거치지 않으면 값이 반이 되오.”',
      offer: '“대추야자 창고를 열어 두겠소. 급할 때 찾아오시오.”',
      help: '“소코트라까지는 우리 배를 따라오면 되오. 그 바다는 우리가 아오.”',
    },
  },
  {
    id: 'omanfleet',
    name: '무스카트 선주단',
    region: 'mideast',
    flag: 'oman',
    // 수르의 조선대에서 다우를 짓고 그 배로 인도양을 오간 오만의 선주 가문들.
    // 겨울 북동풍에 남으로 내려가 인도의 티크를 사 오고 여름에 대추야자를 실어 돌아온다.
    seats: ['muscat', 'sur', 'sohar', 'hormuz'],
    goods: ['dates', 'teak', 'copper', 'carpet'],
    capital: 4500000,
    fleet: 4,
    reach: 'region',
    temper: 0.5,
    season: 'winter',
    rank: 4,
    blurb: '수르의 조선대에서 나온 다우로 인도양을 오간 선주 가문들.',
    lines: {
      greet: '“무스카트요. 우리 배는 수르에서 짰소 — 못이 아니라 줄로 꿰맸소.”',
      press: '“이 물목을 우리가 안 지나면 아무도 못 지나오.”',
      offer: '“티크가 급하면 말하시오. 우리가 실어 온 것 중에 나눠 드리리다.”',
      help: '“겨울 바람이 우리 편이오. 원한다면 같은 항로로 붙여 드리지.”',
    },
  },
  {
    id: 'julfahouse',
    name: '줄파의 아르메니아 상관',
    region: 'mideast',
    flag: 'safavid',
    // 사파비가 이스파한 근교에 옮겨 심은 아르메니아 상인촌. 생사를 페르시아 안에서
    // 사고, 진주·융단·장미수를 걸프까지 실어 낸 뒤 신용장 하나로 지중해까지 이었다.
    seats: ['hormuz', 'basra', 'bahrain', 'isfahan'],
    goods: ['silk', 'pearl', 'carpet', 'rosewater'],
    capital: 6000000,
    fleet: 3,
    reach: 'region',
    temper: 0.2,
    season: null,
    rank: 4,
    blurb: '이스파한 근교 신도시에서 생사·진주를 쥐고 유럽까지 잇는 상관.',
    lines: {
      greet: '“줄파에서 왔소. 왕이 우리에게 생사 전매를 맡겼소.”',
      press: '“우리 신용장 없이는 이스파한 밖에서 이 값을 못 받소.”',
      offer: '“진주를 좋은 값에 넘기리다. 우리는 되팔 곳을 이미 알고 있소.”',
      help: '“걸프 항로의 소식은 우리가 가장 빠르오. 나눠 드리지.”',
    },
  },
  {
    id: 'khalijbroker',
    name: '바스라·호르무즈 중개상',
    region: 'mideast',
    flag: 'safavid',
    // 세관이 무거운 두 관문 사이를 오가며 값을 고르는 페르시아만의 거간꾼들.
    // 큰 상관들이 놓친 잔 물량과 세관을 피한 짐이 이들 손을 거쳐 간다.
    seats: ['basra', 'hormuz', 'gombroon', 'qatif'],
    goods: ['pearl', 'horse', 'dates', 'calico'],
    capital: 700000,
    fleet: 2,
    reach: 'region',
    temper: 0.3,
    season: null,
    rank: 2,
    blurb: '세관이 무거운 두 항구 사이의 값 차이로 먹고사는 거간꾼들.',
    lines: {
      greet: '“걸프 어디든 아는 얼굴이 있소. 필요하면 이어 드리지.”',
      press: '“이 값에 안 넘기면 다음 배가 더 싸게 받아 가오.”',
      offer: '“진주는 우리가 먼저 손을 보오. 흠 없는 것만 넘기리다.”',
      help: '“세관이 헐거운 자리를 아오. 원한다면 알려 드리지.”',
    },
  },

  /* ══════════════════════════ 인도양 ══════════════════════════ */
  {
    id: 'gujaratsarraf',
    name: '수라트 바니아 상가',
    region: 'indian',
    flag: 'gujarat',
    // 17세기 수라트의 바니아 대상인(비르지 보라가 그 원형)은 영국 동인도회사조차
    // 견제할 정도의 자산을 쥐고 있었다고 유럽 상관 기록이 전한다. 면포·인디고를 내놓고
    // 홍해·페르시아만의 금을 빨아들이는 이 바다 최대의 환전상 가문이다.
    seats: ['cambay', 'surat', 'bharuch', 'diu'],
    goods: ['calico', 'indigo', 'chintz', 'gold'],
    capital: 290000000,
    fleet: 5,
    reach: 'region',
    temper: 0.25,
    season: 'summer',
    rank: 5,
    blurb: '영국 동인도회사조차 견제했다는 수라트 최대의 환전상 가문.',
    lines: {
      greet: '“수라트요. 우리 장부는 회사 상관보다 두껍소.”',
      press: '“이 값을 안 받으면 다음 계절풍까지 창고에서 썩소.”',
      offer: '“면포는 얼마든지 있소. 값은 흥정합시다.”',
      help: '“홍해행 배편에 자리를 하나 얹어 드리리다.”',
    },
  },
  {
    id: 'chettinad',
    name: '코로만델 체티 금융상',
    region: 'indian',
    flag: 'vijayanagara',
    // 비자야나가르·나야카의 비호 아래 코로만델 항구마다 자리 잡은 금융상 가문들.
    // 면포를 담보로 돈을 놓고, 그 면포는 벵골만을 건너 믈라카에서 향료와 바뀐다.
    seats: ['nagapattinam', 'santhome', 'pulicat', 'masulipatnam', 'melaka'],
    goods: ['calico', 'pearl', 'silver', 'chintz'],
    capital: 5000000,
    fleet: 3,
    reach: 'ocean',
    temper: 0.3,
    season: 'winter',
    rank: 4,
    blurb: '면포를 담보로 돈을 놓고 믈라카까지 배를 대는 금융상 가문.',
    lines: {
      greet: '“나가파티남의 체티요. 이자보다 신용을 먼저 보오.”',
      press: '“담보 없이는 이 값을 못 받소. 다음에 다시 오시오.”',
      offer: '“은이 급하면 면포를 잡히시오. 급한 값은 안 매기리다.”',
      help: '“믈라카행 배편의 시세를 먼저 알려 드리지.”',
    },
  },
  {
    id: 'marakkar',
    name: '캘리컷 마라카르 가문',
    region: 'indian',
    flag: 'zamorin',
    // 자모린의 해군을 맡아 포르투갈 카르타즈에 맞선 무슬림 상인 겸 제독 가문.
    // 후추를 캐는 것은 산의 몫이고 그것을 지키며 파는 것은 이 집안의 몫이었다.
    seats: ['calicut', 'cannanore', 'cranganore', 'cochin', 'colombo'],
    goods: ['pepper', 'ginger', 'spice', 'cinnamon'],
    capital: 3500000,
    fleet: 4,
    reach: 'region',
    temper: 0.7,
    season: null,
    rank: 4,
    blurb: '자모린의 해군을 맡아 카르타즈 없는 배를 지켜 준 상인 겸 제독 가문.',
    lines: {
      greet: '“캘리컷의 마라카르요. 카르타즈는 안 보여도 되오.”',
      press: '“포르투갈 세관보다 우리 값이 낫다는 것은 이미 알 텐데.”',
      offer: '“후추는 산에서 막 내려온 것이오. 만져 보고 사시오.”',
      help: '“우리 배가 앞장서면 그 항로에서 붙잡힐 일은 없소.”',
    },
  },
  {
    id: 'bengalhouse',
    name: '벵골 해상 상단',
    region: 'indian',
    flag: 'bengal',
    // 후글리·사트가온·치타공을 오가며 면포·설탕·초석을 내놓고 조개돈과 은을 삼키는
    // 벵골 술탄국의 뱃상인들. 겨울 계절풍을 타고 벵골만을 건너 믈라카까지 갔다.
    seats: ['hooghly', 'satgaon', 'chittagong', 'nagapattinam', 'melaka'],
    goods: ['calico', 'sugar', 'saltpetre', 'silver'],
    capital: 2200000,
    fleet: 3,
    reach: 'ocean',
    temper: 0.35,
    season: 'winter',
    rank: 3,
    blurb: '면포·설탕·초석을 싣고 겨울 계절풍에 벵골만을 건너는 뱃상인들.',
    lines: {
      greet: '“후글리요. 배가 싸서 짐이 무거워도 남는 게 많소.”',
      press: '“은화 한 닢이 조개 만 개와 바뀌는 걸 모르시오?”',
      offer: '“설탕은 우리가 세상에서 가장 싸게 내놓소.”',
      help: '“겨울바람이 남으로 불 때 우리 배를 따라오시오.”',
    },
  },
  {
    id: 'sindtata',
    name: '타타 신드 상단',
    region: 'indian',
    flag: null,
    // 인더스 하구의 옛 강선 도시. 무명·인디고를 내놓고, 강선을 지을 목재와 그것을
    // 꿰맬 코이어를 남에게서 사 왔다 — 배가 작고 셈이 조심스러운 것은 그 때문이다.
    seats: ['thatta', 'cambay', 'bharuch', 'diu'],
    goods: ['calico', 'indigo', 'gold', 'teak'],
    capital: 650000,
    fleet: 2,
    reach: 'region',
    temper: 0.25,
    season: null,
    rank: 2,
    blurb: '인더스 하구의 강선 상단. 무명은 팔고 목재는 늘 사들인다.',
    lines: {
      greet: '“타타요. 큰 배는 아니지만 값은 정직하게 매기오.”',
      press: '“이 값 밑으로는 안 되오. 우리 배는 남는 게 많지 않소.”',
      offer: '“로히 무명이 방금 짜여 나왔소. 색이 좋소.”',
      help: '“강선을 꿰맬 코이어가 필요하면 우리가 대오.”',
    },
  },

  /* ══════════════════════════ 동남아·향료제도 ══════════════════════════ */
  /* ── 독점 밖의 큰 자본 ──────────────────────────────────────
     마카사르(고와 왕국). 17세기 초 **어느 나라 배든 받는 자유항**이었다. 네덜란드의 향료 독점
     밖에서 포르투갈·잉글랜드·덴마크·부기스가 섞여 거래했고, 그 규모 때문에 결국 VOC가 무력으로 눌렀다.
     ★ 이 바다 상단은 후추(아체 4)·중개(자바 4·정향 3)·선주(부기스 3)·오랑카야(믈라카 3)라
       **「독점 밖에서 판을 벌린 자본」**이 비어 있었다 — 이 바다가 어떤 곳이었는지를 말하는 자리다.
     ★ `temper`를 낮게 둔 것은 그 성격 때문이다: 값을 눌러 이기는 쪽이 아니라
       **문을 열어 두어** 배를 모으는 쪽이었다. */
  {
    id: 'makassar', name: '마카사르 왕실 무역단', region: 'seasia', flag: null,
    seats: ['makassar', 'buton', 'banda', 'ambon'],
    goods: ['clove', 'nutmeg', 'pepper', 'sandalwood'],
    capital: 5600000, fleet: 4, reach: 'ocean', temper: 0.22, season: null, rank: 5,
    blurb: '문을 닫지 않는 항구다. 그것이 이 집안의 장사이고, 뒤에 그것 때문에 눌렸다.',
    lines: {
      greet: '“마카사르요. 여기서는 누구의 배든 짐을 내릴 수 있소.”',
      press: '“값을 다투기보다 문을 열어 두는 편이 남소. 우리는 그렇게 배웠소.”',
      deal: '“회사 허가장은 안 물어보오. 값만 맞으면 되오.”',
      offer: '“정향을 통째로 넘기리다. 어디서 났는지는 묻지 마시오.”',
      help: '“소순다의 물목은 좁소. 우리 배를 따라오시오.”',
    },
  },
  {
    id: 'wajobugis',
    name: '부기스 선주 연합',
    region: 'seasia',
    flag: null,
    // 술라웨시 와조에서 나와 이 바다 동쪽을 종횡한 프라후 선단. 향료 산지 코앞에는
    // 안 앉고, 그 대신 쌀·소금·거북등껍질을 실어 섬과 섬 사이를 이었다.
    seats: ['makassar', 'buton', 'banda', 'solor'],
    goods: ['sandalwood', 'grain', 'tortoise', 'nutmeg'],
    capital: 1800000,
    fleet: 3,
    reach: 'region',
    temper: 0.45,
    season: null,
    rank: 3,
    blurb: '와조에서 나온 프라후 선단. 향료 산지 코앞에는 앉지 않는다.',
    lines: {
      greet: '“와조에서 왔소. 우리 배는 바람만 있으면 어디든 가오.”',
      press: '“이 물목의 값은 우리가 정하오. 그게 이 바다의 규칙이오.”',
      offer: '“쌀이 필요하면 말하시오. 마카사르에서 방금 실어 왔소.”',
      help: '“솔로르까지 가는 길은 우리가 앞장서 드리지.”',
    },
  },
  {
    id: 'javanorthcoast',
    name: '자바 북안 중개상',
    region: 'seasia',
    flag: null,
    // 투반·그레식의 부유한 항시 상인들. 향료를 사서 서쪽으로 넘기는 것이 이 상단의
    // 본업이지 산지 자체를 쥐는 것이 아니다 — 그래서 티크·주석·백단향을 함께 다룬다.
    seats: ['tuban', 'gresik', 'surabaya', 'cirebon'],
    goods: ['teak', 'tin', 'sandalwood', 'salt'],
    capital: 3000000,
    fleet: 3,
    reach: 'region',
    temper: 0.3,
    season: null,
    rank: 4,
    blurb: '그레식·투반의 항시 상인. 향료를 사서 서쪽으로 넘기는 것이 본업이다.',
    lines: {
      greet: '“그레식에서 왔소. 우리 배가 말루쿠까지 대고 있소.”',
      press: '“티크 값은 자바가 정하오. 다른 데서 못 구할 것이오.”',
      offer: '“백단향이 방금 들어왔소. 향이 좋으니 맡아 보시오.”',
      help: '“말루쿠행 항로의 물목을 미리 알려 드리지.”',
    },
  },
  {
    id: 'acehsultanate',
    name: '아체 후추 왕실무역단',
    region: 'seasia',
    flag: null,
    // 술탄이 직접 배와 화포를 대고 믈라카를 건너뛰어 후추를 홍해로 곧장 실어 보낸
    // 국영 무역단. 오스만에서 들여온 대포로 무장했으니 상단이자 함대다.
    seats: ['aceh', 'pasai', 'barus', 'jeddah'],
    goods: ['pepper', 'gold', 'camphor', 'benzoin'],
    capital: 4200000,
    fleet: 4,
    reach: 'ocean',
    temper: 0.65,
    season: 'summer',
    rank: 4,
    blurb: '술탄이 직접 배를 대고 믈라카를 건너뛰어 후추를 홍해로 보내는 국영 함대.',
    lines: {
      greet: '“아체 술탄국의 배요. 우리는 믈라카를 거치지 않소.”',
      press: '“이 값이 싫으면 유럽까지 직접 가서 파시오. 못 할 것이오.”',
      offer: '“오스만 화포가 지키는 배요. 짐은 안심하고 실으시오.”',
      help: '“홍해까지 곧장 가는 뱃길을 알려 드리지.”',
    },
  },
  {
    id: 'malukubroker',
    name: '향료제도 정향 중개상',
    region: 'seasia',
    flag: null,
    // 테르나테·티도레·암본·반다를 도는 중개인들. 술탄들이 향료 값으로 받아 간 것은
    // 은이 아니라 쌀과 인도 면포였다 — 그 맞바꿈을 대신 해 주는 것이 이들의 일이다.
    seats: ['ternate', 'tidore', 'ambon', 'banda'],
    goods: ['clove', 'nutmeg', 'sandalwood', 'calico'],
    capital: 2600000,
    fleet: 2,
    reach: 'region',
    temper: 0.4,
    season: null,
    rank: 3,
    blurb: '향료 값으로 쌀과 면포를 대신 실어다 주는 말루쿠의 중개인들.',
    lines: {
      greet: '“테르나테요. 정향은 우리 손을 안 거치면 못 파오.”',
      press: '“술탄이 이미 값을 정했소. 흥정은 우리와 하시오.”',
      offer: '“쌀이 급하면 말하시오. 이 섬은 쌀 한 톨이 아쉽소.”',
      help: '“반다까지 가는 물목의 시세를 미리 일러 드리지.”',
    },
  },
  {
    id: 'melakaorangkaya',
    name: '조호르 오랑카야',
    region: 'seasia',
    flag: 'malacca',
    // 1511년 믈라카를 잃은 술탄가를 따라 강을 거슬러 올라간 상인 귀족들. 항구는
    // 빼앗겼어도 인맥과 배는 그대로라, 해협을 오가는 짐의 상당수가 여전히 이들 손을 거친다.
    seats: ['johor', 'jambi', 'palembang', 'melaka'],
    goods: ['pepper', 'tin', 'agarwood', 'timber'],
    capital: 1900000,
    fleet: 3,
    reach: 'region',
    temper: 0.5,
    season: null,
    rank: 3,
    blurb: '항구는 잃었어도 인맥은 그대로인 옛 믈라카 술탄가의 상인 귀족들.',
    lines: {
      greet: '“조호르요. 항구를 잃었다고 장사까지 잃은 건 아니오.”',
      press: '“이 물목은 우리가 아직 쥐고 있소. 값을 낮출 이유가 없소.”',
      offer: '“주석이 필요하면 말하시오. 페락 것이 방금 들어왔소.”',
      help: '“해협의 물목은 우리가 여전히 밝소.”',
    },
  },

  /* ══════════════════════════ 동아시아 ══════════════════════════ */
  {
    id: 'huizhou',
    name: '휘주 상인(徽商)',
    region: 'eastasia',
    flag: 'ming',
    // 신안상인이라고도 부른다. 소금 전매권으로 자본을 불려 생사·자기·차까지 손을 뻗은
    // 명대 최대의 상인 집단 — 학계는 이들의 결산 자본을 은 수천만 냥 대로 추산한다.
    seats: ['guangzhou', 'ningbo', 'yuegang', 'shanghai'],
    goods: ['silk', 'tea', 'ceramic', 'silver'],
    capital: 250000000,
    fleet: 4,
    reach: 'region',
    temper: 0.2,
    season: null,
    rank: 5,
    blurb: '소금 전매로 불린 자본을 생사·자기·차까지 뻗친 명대 최대의 상인 집단.',
    lines: {
      greet: '“휘주요. 소금으로 시작했지만 지금은 안 다루는 게 없소.”',
      press: '“우리 자본 앞에서는 그 값이 안 통하오.”',
      offer: '“생사가 필요하면 얼마든지 대오. 물량이 걱정할 일은 없소.”',
      help: '“은이 어디로 흐르는지는 우리가 가장 먼저 아오.”',
    },
  },
  {
    id: 'yuegangship',
    name: '월항 해상 조합',
    region: 'eastasia',
    flag: 'ming',
    // 1567년 해금이 풀리며 유일하게 열린 문, 월항의 인선(引)을 받은 해상들의 조합.
    // 마닐라의 은이 이 좁은 문으로 빨려 들어가는 것을 관과 함께 관리했다.
    seats: ['yuegang', 'quanzhou', 'manila', 'guangzhou'],
    goods: ['tea', 'ceramic', 'silver', 'spice'],
    capital: 15000000,
    fleet: 4,
    reach: 'ocean',
    temper: 0.35,
    season: 'winter',
    rank: 4,
    blurb: '유일하게 열린 월항의 문을 지나 마닐라의 은을 빨아들이는 해상 조합.',
    lines: {
      greet: '“월항의 인선을 받은 배요. 밀무역이 아니오.”',
      press: '“이 문을 안 지나면 그 짐은 명에 못 들어가오.”',
      offer: '“차는 무이산 것이오. 자기와 함께 실어 드리리다.”',
      help: '“마닐라행 항로의 은값을 먼저 알려 드리지.”',
    },
  },
  {
    id: 'zhengfleet',
    name: '정씨 해상집단',
    region: 'eastasia',
    flag: 'ming',
    // 명의 변경에서 사무역과 무력을 함께 쥔 해상 집단. 관의 인선 없이도 제 함대로
    // 항로를 지켰고, 그 함대가 곧 세금을 매기는 관청 노릇까지 했다.
    seats: ['yuegang', 'macau', 'manila', 'nagasaki'],
    goods: ['silk', 'silver', 'ceramic', 'lacquer'],
    capital: 45000000,
    fleet: 5,
    reach: 'ocean',
    temper: 0.6,
    season: null,
    rank: 5,
    blurb: '관의 인선 없이 제 함대로 항로를 지키고 세를 매기는 해상 집단.',
    lines: {
      greet: '“우리 깃발이 보이면 안심하고 지나가시오.”',
      press: '“이 바다에서 우리 허락 없이 지나가는 배는 없소.”',
      offer: '“생사든 은이든, 우리를 거치면 값을 더 쳐 드리오.”',
      help: '“나가사키까지 우리 함대가 붙어 드리리다.”',
    },
  },
  {
    id: 'itowappu',
    name: '나가사키 이토와푸',
    region: 'eastasia',
    flag: 'japan',
    // 사카이·교토·나가사키의 상인이 짠 생사 공동구매 조합(糸割符). 마카오 정기선이
    // 부리는 생사를 조합이 먼저 값을 정해 사들이니, 값을 흥정할 상대가 상인이 아니라 조합이다.
    seats: ['nagasaki', 'macau', 'hirado'],
    goods: ['silk', 'silver', 'gold', 'copper'],
    capital: 3000000,
    fleet: 2,
    reach: 'region',
    temper: 0.15,
    season: 'summer',
    rank: 3,
    blurb: '나우가 부리는 생사를 조합이 먼저 값을 매겨 통째로 사들이는 상인단.',
    lines: {
      greet: '“이토와푸요. 생사 값은 조합이 이미 정했소.”',
      press: '“그 값에는 못 사오. 조합의 값은 우리도 못 바꾸오.”',
      offer: '“은이 필요하면 말하시오. 나가사키에서 갓 들어온 것이오.”',
      help: '“마카오 정기선이 언제 닿는지는 우리가 먼저 아오.”',
    },
  },
  {
    id: 'ryukyuhouse',
    name: '류큐 왕부 조공무역청',
    region: 'eastasia',
    flag: 'ryukyu',
    // 만국진량 — 제 산물이 거의 없는 작은 왕국이 중계무역만으로 부유해졌다.
    // 나하에 앉아 명·일본·동남아를 잇는 조공선의 짐을 관이 직접 관리했다.
    seats: ['naha', 'fuzhou', 'quanzhou', 'hakata'],
    goods: ['sulfur', 'lacquer', 'silk', 'tea'],
    capital: 900000,
    fleet: 2,
    reach: 'region',
    temper: 0.15,
    season: 'winter',
    rank: 2,
    blurb: '제 산물이 거의 없어도 중계무역만으로 부유해진 작은 왕국의 무역청.',
    lines: {
      greet: '“류큐 왕부요. 조공이자 장사요, 둘 다 맞는 말이오.”',
      press: '“우리를 치면 명 조정이 아오. 그리 간단치 않소.”',
      offer: '“유황이 필요하면 말하시오. 유황조도에서 캔 것이오.”',
      help: '“남해 소식은 우리 진공선이 가장 먼저 들고 오오.”',
    },
  },
  {
    id: 'gyeonggang',
    name: '경강상인(京江商人)',
    region: 'eastasia',
    flag: 'joseon',
    // 마포·서강·용산의 경강을 근거로 세곡을 나르고 인삼을 쥔 조선의 뱃상인 집단.
    // 사무역이 금지된 나라라 배는 작지만, 도성의 목줄을 쥐고 있다는 점이 그 값이다.
    seats: ['mapo', 'busanpo', 'gunsan', 'gangjin'],
    goods: ['grain', 'ginseng', 'copper', 'calico'],
    capital: 750000,
    fleet: 2,
    reach: 'region',
    temper: 0.2,
    season: null,
    rank: 2,
    blurb: '경강을 근거로 세곡과 인삼을 쥔 조선의 뱃상인 집단. 배는 작아도 목줄을 쥐었다.',
    lines: {
      greet: '“경강 상인이오. 세곡 나르는 배가 남는 칸에 짐을 얹소.”',
      press: '“이 값은 도성 시세요. 흥정할 여지가 크지 않소.”',
      offer: '“인삼이 필요하면 말하시오. 뿌리 모양이 좋은 것으로 골라 드리리다.”',
      help: '“부산포 왜관 시세를 먼저 알려 드리지.”',
    },
  },
];
