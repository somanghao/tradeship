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
// 세 사람뿐인 것도 같은 이유다. 여기 배를 잔뜩 띄우면 권역 담당자가 매긴 요율이 거짓말이 된다.
//
// 또 하나 — 이 권역은 항로 여섯이 `null`이다(카이로~지다, 다마스쿠스~얀부, 바그다드~바스라…).
// 배가 아니라 낙타와 강배가 짐을 나르는 길이라 해적 개념이 성립하지 않는다.
// 그 길의 위험은 베두인의 통행세와 사막이지 바다의 사람이 아니다 — 그래서 아무도 안 앉혔다.
//
// ★ 카와심(알카시미)은 쓰지 않았다. 1778년 이후의 세력이라 이 시대가 아니다.
//   권역 담당자가 그 점을 확인해 요율에서 뺐으므로 해적 쪽도 같이 뺀다.

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
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   **홍해 한복판에서 프랑스 순찰 프리깃**이 나왔다. 여기서 상선을 세우는 것은
   카르타스를 단속하는 포르투갈 순찰선이거나 걸프의 습격선이다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '홍해 잡배', nation: '해적', hull: 'galley', tint: 'oak', goods: ['salt', 'grain', 'spice'] },
  { name: '카와심 습격선', nation: '카와심', hull: 'galley', tint: 'dark', goods: ['spice', 'ivory', 'salt'] },
  { name: '포르투갈 순찰 카라크', nation: '포르투갈', hull: 'carrack', tint: 'white', goods: ['spice', 'silk', 'gold'] },
  { name: '오스만 홍해 함대', nation: '오스만', hull: 'frigate', tint: 'green', goods: ['spice', 'silk', 'gold'] },
  { name: '포르투갈 인도 함대', nation: '포르투갈', hull: 'galleon', tint: 'white', goods: ['gold', 'spice', 'silk'] },
];
