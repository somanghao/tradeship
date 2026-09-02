// regions/mideast/npc-pirates.js — 중동·홍해의 해적
//
// 상인을 노리고 돌아다닌다. 플레이어도 사냥감이다. 이들이 턴 짐은 목적지에 닿지 못해
// **그 항구에서 그 물건이 귀해진다**(`world.js: raids` → 시장 충격).
//
// ── 필드 ────────────────────────────────────────────────────
//   id, name, flag, ship, purse   무역상과 같다
//   base     소굴 항구 · hunt 즐겨 노리는 구간 키('a|b' 정렬형)
//   strength 1~5 · bounty [최소,최대] 현상금
//   circuit  순회로 · season 'summer'|'winter'|null · scope 'region'|'ocean'
//   blurb, lines { hail, spare }
//
// ★ circuit은 **인접 항로만 밟도록** 적었다. ★ world.js는 아직 이 필드들을 읽지 않는다.
//
// ── 이 바다의 배치 근거 ──────────────────────────────────────
// **이 권역은 아홉 바다 중 가장 안전하다.** 요율 최고가 8.0(무스카트~시흐르)이고 9.0을 넘는
// 구간이 하나도 없다. 그래서 두목(strength 5)을 두지 않았다 — 요율 9~11대 구간에 앉는 자리다.
// 여기 배를 잔뜩 띄우면 권역 담당자가 매긴 요율이 거짓말이 된다.
//
// 또 하나 — 이 권역은 항로 여섯이 `null`이다(카이로~지다, 다마스쿠스~얀부, 바그다드~바스라…).
// 배가 아니라 낙타와 강배가 짐을 나르는 길이라 해적 개념이 성립하지 않는다.
// 그 길의 위험은 베두인의 통행세와 사막이지 바다의 사람이 아니다 — 그래서 아무도 안 앉혔다.
//
// ★ 카와심(알카시미)은 쓰지 않았다. 1778년 이후의 세력이라 이 시대가 아니다.
//   권역 담당자가 그 점을 확인해 요율에서 뺐으므로 해적 쪽도 같이 뺀다.
//
// ── 2026-09-01 확장 — 4명 → 7명(회차 29 나-2③) ──────────────────
// §1 실측(RULE-BACKLOG)에서 이 바다가 해적 명부 최하위(4명)로 잡혔다. 세 자리를 더 앉힌다 —
// ★ **인물은 지어낸 것이고, 판정은 "그 자리(직명·소속·업무)가 이 바다에 실재했는가"에
//   매긴다**(회차 27 규약). 위 넷(셀만 레이스·피리 레이스)처럼 실명이 남은 제독도 있었지만,
//   이번 셋은 사료가 이름까지 전하지 않는 자리를 채운 것이라 처음부터 그렇게 적는다.
// 빈 사냥터부터 채웠다 — 북홍해(수에즈~쿠세이르~얀부, 지금껏 아무도 없었다) ·
// 소코트라~하드라마우트 해안(아덴만 바깥, 이 권역 최고 요율대인데 비어 있었다) ·
// 이란 쪽 해협(곰브룬~콩, 1622년 이후 정세가 바뀐 자리인데 비어 있었다). 강도는 여전히
// **요율 8.0을 넘지 않는다** — 두목(strength 5)을 안 두는 것은 위 판정 그대로다.

export const PIRATES = [
  /* ── 홍해 ───────────────────────────────────────────────────
     셀만 레이스. 맘루크·오스만 홍해 함대를 이끌었고, 지다를 지키다가도 제 배로 인도 항로를
     털어 결국 처형됐다. 관군과 해적 사이가 종이 한 장이던 자리가 이 바다다.
     ★ season 'summer' — 남서 계절풍이 인도에서 후추를 실은 배를 아덴·모카로 밀어 올린다.
       사냥감이 오는 철이 곧 사냥철이다. 반대 철에는 홍해 어귀에 털 배가 없다. */
  {
    id: 'selmanreis', name: '셀만 레이스', flag: 'ottoman', ship: 'galliot',
    base: 'jeddah', purse: [2000, 6500], strength: 4, bounty: [2200, 4800],
    hunt: ['aden|mokha', 'jeddah|mokha', 'jeddah|suakin', 'massawa|mokha'],
    circuit: ['jeddah', 'suakin', 'massawa', 'mokha', 'aden', 'mokha', 'massawa', 'suakin', 'jeddah'],
    season: 'summer', scope: 'region',
    blurb: '술탄의 함대를 몰면서 제 몫도 챙긴다. 어느 쪽인지는 그날 바람이 정한다.',
    lines: {
      hail: '“홍해는 술탄의 호수다. 여기 들어온 배는 술탄의 것이다.”',
      spare: '“향신료만 두고 가라. 배는 지다까지 끌고 가기 귀찮다.”',
    },
  },

  /* ── 북홍해 ─────────────────────────────────────────────────
     맘루크 홍해 함대의 세관 이력이 있는 자리다. 아미르 후사인 알쿠르디가 이끈 맘루크
     함대는 1505년 수에즈를 떠나 지다를 요새화하고 수아킨·메카 인근의 소요를 눌렀다
     (베네치아 포수·그리스 뱃사람까지 섞은 함대였다). 그 세관·순찰 체계가 1517년
     오스만 정복으로 갈아엎이며 자리를 잃은 하급 지휘관 하나가 옛 순찰 구역(수에즈~
     쿠세이르~얀부~지다)에서 밀수 단속을 빙자해 통행세를 사사로이 걷기 시작했다는
     설정이다 — 관군과 밀수꾼 사이가 종이 한 장이던 이 바다의 세 번째 얼굴이다
     (셀만 레이스·피리 레이스가 첫째·둘째). 이 권역 최고 관세(지다 9%)의 뒷그림자다.
     ★ 이 넷 구간은 지금까지 명부에 아무도 없던 빈자리였다(요율 4.0~6.0, 크지 않다). */
  {
    id: 'redseacustoms', name: '북홍해의 사설 세관선', flag: 'ottoman', ship: 'jalba',
    base: 'qusayr', purse: [380, 1400], strength: 2, bounty: [420, 950],
    hunt: ['suez|tur', 'qusayr|tur', 'qusayr|yanbu', 'jeddah|qusayr'],
    circuit: ['qusayr', 'tur', 'suez', 'tur', 'qusayr', 'yanbu', 'qusayr', 'jeddah', 'qusayr'],
    season: null, scope: 'region',
    blurb: '맘루크 세관 완장을 아직도 차고 다닌다. 술탄이 바뀐 것은 그의 알 바가 아니다.',
    lines: {
      hail: '“밀수 단속이다. 짐을 보이고 통행세를 내면 지나간다.”',
      spare: '“종이가 없어도 된다. 대신 짐칸 하나는 놓고 가라.”',
    },
  },

  /* ── 오만 연안 ──────────────────────────────────────────────
     이 권역 최고 요율(무스카트~시흐르 8.0)의 임자. 1507년 알부케르크가 무스카트를 불태운 뒤로도
     이 연안의 아랍 배들은 포르투갈 연안선을 간간이 덮쳤다. 큰 함대가 아니라 상찌를 노리는 무리라 2.
     깃발은 'oman' — 표식 없는 붉은기다. 민무늬라 오히려 멀리서 알아본다. */
  {
    id: 'muscatraiders', name: '무스카트 앞바다의 사략선', flag: 'oman', ship: 'zaruq',
    base: 'muscat', purse: [420, 1500], strength: 2, bounty: [450, 1000],
    hunt: ['hormuz|muscat', 'muscat|shihr', 'aden|shihr'],
    circuit: ['muscat', 'hormuz', 'muscat', 'shihr', 'aden', 'shihr', 'muscat'],
    season: null, scope: 'region',
    blurb: '불탄 항구에서 나온 배다. 포르투갈 깃발이면 화물이 뭐든 붙는다.',
    lines: { hail: '“무스카트를 태운 값이다. 오늘은 조금만 받아 두마.”' },
  },

  /* ── 소코트라·하드라마우트 ──────────────────────────────────
     이 권역 최고 요율대(살랄라~수르 8.0)의 임자. 10세기 지리학자 알마수디는 이미
     소코트라를 "해적의 은신처"라 적었을 만큼 오래된 자리다 — 계절풍을 갈아타려고
     섬 앞바다에 머무는 배들이 그 무풍 시간 동안 좋은 사냥감이었다. 향의 해안
     (도파르·하드라마우트)의 어촌 몇이 함께 무리를 이룬 소규모 선단이라는 설정.
     ★ season 'summer' — 셀만 레이스와 같은 이유다. 남서 계절풍이 인도발 배를
       아덴만 어귀로 밀어 올리는 철에 사냥감이 몰린다. */
  {
    id: 'socotrareavers', name: '소코트라의 노략선단', flag: 'oman', ship: 'sanbuq',
    base: 'socotra', purse: [900, 2800], strength: 3, bounty: [950, 2200],
    hunt: ['aden|socotra', 'shihr|socotra', 'salalah|shihr', 'salalah|sur'],
    circuit: ['socotra', 'shihr', 'salalah', 'sur', 'salalah', 'shihr', 'aden', 'shihr', 'socotra'],
    season: 'summer', scope: 'region',
    blurb: '계절풍을 기다리며 닻을 내린 배는 이 섬에서 가장 흔한 사냥감이다.',
    lines: {
      hail: '“바람이 바뀔 때까지 여기 있을 참이었나. 우리도 그렇다.”',
      spare: '“향과 말은 두고 가라. 물은 원하는 만큼 나눠 주마.”',
    },
  },

  /* ── 페르시아만 ─────────────────────────────────────────────
     ★ 초반 상대이자, 이 권역에서 사료가 가장 또렷한 자리다.
       페드루 테이셰이라가 1604년에 "그 바다에서 한시도 없는 법이 없는 해적의 테라다"를 보았고
       상선들이 포르투갈 푸스타를 호위로 붙였다고 적었다(권역 근거 JSON: hormuz|julfar).
       테라다는 사람 몇이 젓는 작은 배다. 잘바(hp 52·포 1문)가 그 크기에 맞고,
       낡은 바사를 몰고도 붙어 볼 수 있는 상대가 이 바다에 하나는 있어야 한다. */
  {
    id: 'terrada', name: '만의 테라다 무리', flag: 'pirate', ship: 'jalba',
    base: 'julfar', purse: [150, 600], strength: 1, bounty: [180, 400],
    hunt: ['hormuz|julfar', 'bahrain|julfar', 'bahrain|qatif', 'basra|qatif'],
    circuit: ['julfar', 'hormuz', 'julfar', 'bahrain', 'qatif', 'basra', 'qatif', 'bahrain', 'julfar'],
    season: null, scope: 'region',
    blurb: '노 젓는 작은 배 서넛이 붙는다. 한 척은 우습지만 넷이면 진주선 하나가 사라진다.',
    lines: {
      hail: '“진주냐 대추야자냐. 무거운 쪽으로 놔라.”',
      spare: '“얕은 데로 가라. 우리는 거기까지 안 쫓는다.”',
    },
  },

  /* ── 바스라 ─────────────────────────────────────────────────
     피리 레이스. 지도를 그린 사람이고 수에즈 함대를 몰던 제독이다. 1552년 무스카트를 빼앗고
     호르무즈를 치다 물러나 **바스라에 함대를 두고 제 몫만 싣고 돌아갔다** — 그 죄로 카이로에서
     목이 잘렸다. 관군과 해적 사이가 종이 한 장이던 이 바다의 두 번째 얼굴이다(셀만 레이스가 첫째).
     ★ **strength 5는 여전히 안 둔다**(파일 머리의 판정 — 이 바다는 요율 8.0이 최고다).
       걸프 안쪽 요율은 3.5~6이라 4로도 무겁다는 것을 알고 골랐다:
       이 사람은 **떠도는 해적이 아니라 함대**이고, 함대가 오는 것이 이 바다의 드문 일이다. */
  {
    id: 'piriereis', name: '피리 레이스', flag: 'ottoman', ship: 'galliot',
    base: 'basra', purse: [2400, 7000], strength: 4, bounty: [2600, 5600],
    hunt: ['bahrain|basra', 'basra|qatif', 'bahrain|qatif'],
    circuit: ['basra', 'qatif', 'bahrain', 'qatif', 'basra'],
    season: null, scope: 'region',
    blurb: '바다를 그린 사람이 그 바다를 막아섰다. 지도를 가진 쪽이 길목도 안다.',
    lines: {
      hail: '“이 만의 물길은 내가 그렸소. 당신이 어디로 빠질지도 그 종이에 있소.”',
      spare: '“술탄의 몫만 내리시오. 내 몫은 이미 따로 실었소.”',
    },
  },

  /* ── 이란 쪽 해협(곰브룬·콩) ────────────────────────────────
     1622년 사파비가 영국 동인도회사의 배를 빌려 호르무즈에서 포르투갈을 몰아낸 뒤,
     세관은 곰브룬(반다르아바스)으로 옮겨 갔고 옛 왕국의 질서는 무너졌다 — 그 빈틈에서
     "세관이 헐거운" 콩(파일 트레이드 절 참조)이 뜬 것과 같은 이야기다. 새 체제가 자리
     잡기 전 몇 년, 옛 호르무즈 왕국 시절의 하급 관리였던 자가 사파비 깃발을 걸고
     "통항 확인"을 빙자해 옛 항로를 떠도는 배를 턴다는 설정. 곰브룬·콩 둘 다 이
     권역에서 사파비(safavid) 깃발이라 소속도 그쪽이다. */
  {
    id: 'gombroonraiders', name: '곰브룬 해협의 사파비 순찰선', flag: 'safavid', ship: 'zaruq',
    base: 'kung', purse: [400, 1350], strength: 2, bounty: [430, 980],
    hunt: ['gombroon|hormuz', 'gombroon|sohar', 'hormuz|kung', 'bahrain|kung'],
    circuit: ['kung', 'bahrain', 'kung', 'hormuz', 'gombroon', 'sohar', 'gombroon', 'hormuz', 'kung'],
    season: null, scope: 'region',
    blurb: '무너진 호르무즈의 관인을 아직도 지니고 다닌다. 누구의 순찰인지는 아무도 안 묻는다.',
    lines: {
      hail: '“통항증을 보이시오. 없다면 여기서 하나 새로 끊어 드리리다.”',
      spare: '“콩까지만 가시오. 거기서부터는 우리 소관이 아니오.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   **홍해 한복판에서 프랑스 순찰 프리깃**이 나왔다. 여기서 상선을 세우는 것은
   카르타스를 단속하는 포르투갈 순찰선이거나 걸프의 습격선이다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
/* ★ `flag`를 반드시 적는다. 처음에 이름·국적·선체만 갈아 끼웠더니 `localize()`가
   `flag: skin.flag ?? base.flag`로 떨어져 **`ENEMIES`의 유럽 깃발이 그대로 남았다** —
   명 수군 순찰선이 부르봉 백합기를, 왜구 대선단이 오스만기를 달고 나왔다.
   이름만 바꾸는 것으로는 "이 바다의 적"이 되지 않는다. 쓸 수 있는 깃발은
   `js/sprites/ship.js: FLAGS`의 키다. */
export const FOES = [
  { name: '홍해 잡배', nation: '해적', flag: 'pirate', hull: 'galley', tint: 'oak', goods: ['salt', 'grain', 'spice'] },
  { name: '카와심 습격선', nation: '카와심', flag: 'oman', hull: 'galley', tint: 'dark', goods: ['spice', 'ivory', 'salt'] },
  { name: '포르투갈 순찰 카라크', nation: '포르투갈', flag: 'portugal', hull: 'carrack', tint: 'white', goods: ['spice', 'silk', 'gold'] },
  { name: '오스만 홍해 함대', nation: '오스만', flag: 'ottoman', hull: 'frigate', tint: 'green', goods: ['spice', 'silk', 'gold'] },
  { name: '포르투갈 인도 함대', nation: '포르투갈', flag: 'portugal', hull: 'galleon', tint: 'white', goods: ['gold', 'spice', 'silk'] },
];
