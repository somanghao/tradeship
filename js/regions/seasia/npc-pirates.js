// regions/seasia/npc-pirates.js — 동남아·향료제도의 해적
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
// 이 권역 최고 요율은 아체~믈라카 9.5다. 권역 근거 JSON이 그 이유를 두 가지로 적는다 —
// 해협의 가장 좁은 곳이 2.8km라 큰 배가 반드시 뭍에 붙어야 했다는 것(그 자리가 오랑 라우트의 자리),
// 그리고 아체와 포르투갈령 믈라카가 평생 싸운 사이라는 것. 그래서 이 바다의 두목은 **해협에 있다.**
//
// ★ **해적과 수군의 경계가 없는 바다다.** 오랑 라우트(바다 사람)는 믈라카 술탄에게는
//   항로를 지키는 수군이었고 포르투갈에게는 해적이었다. 술탄가가 조호르로 옮겨 앉자
//   같은 사람들이 그대로 조호르의 수군이 되었다 — 바뀐 것은 그들을 부르는 이름뿐이다.
//
// ★ 일라눈(Iranun)은 쓰지 않았다. 그들의 습격 전성기는 18~19세기라 이 시대가 아니다 —
//   중동 권역에서 카와심을 뺀 것과 같은 이유다(위키백과도 이주·습격을 18~19세기로 적는다).
//   대신 같은 물에서 이 시대에 실재한 자들을 놓았다: 아체의 락사마나, 조호르의 오랑 라우트,
//   그리고 스페인 기록이 '카무코네스'라 부른 보르네오 북안의 습격선.

export const PIRATES = [
  /* ── 말라카 해협 북단 · 아체 ────────────────────────────────
     ★ 크우말라하야티(말라하야티). 아체 술탄국의 락사마나(제독)이고, 전사한 남편들의
       과부로 편성한 '이농 발레' 함대를 이끌었다. 1599년 코르넬리스 더 하우트만을
       배 위에서 직접 죽였다. 이 바다에서 가장 강한 함대를 쥔 자가 그였으므로 strength 5다.
     깃발은 'ottoman' — 아체는 1560년대에 오스만에 사절을 보내 대포와 포수를 받아 왔고,
       스스로를 술탄의 서쪽 끝 문이라 여겼다. 그 관계를 깃발로 낸다.
     ★ season 'summer' — 남서 계절풍(5~9월)이 인도양에서 배를 해협 어귀로 밀어 넣는다.
       사냥감이 오는 철이 사냥철이다. */
  {
    id: 'malahayati', name: '크우말라하야티', flag: 'ottoman', ship: 'lancaran',
    base: 'aceh', purse: [3600, 12000], strength: 5, bounty: [4500, 10000],
    hunt: ['aceh|melaka', 'melaka|pasai', 'aceh|pegu', 'pasai|perak'],
    circuit: ['aceh', 'pasai', 'melaka', 'pasai', 'aceh', 'pegu', 'aceh'],
    season: 'summer', scope: 'region',
    blurb: '아체의 락사마나. 과부들로 함대를 채웠고, 그 배 위에서 네덜란드 선장을 베었다.',
    lines: {
      hail: '“이농 발레다. 우리는 잃을 것이 이미 없는 사람들이다.”',
      spare: '“가라. 오늘 우리가 찾는 배는 포르투갈 것이다.”',
    },
  },

  /* ── 해협 남단 · 조호르 ─────────────────────────────────────
     항 나딤. 1511년 믈라카가 함락된 뒤 술탄가를 따라 빈탄으로 물러나 해협에서 포르투갈 보급선을
     끊었다. 그 손발이 오랑 라우트다 — 섬이 빽빽해 뱃길이 사실상 하나뿐인 남단에서
     매복이 쉬웠다는 것이 권역 근거 JSON이 조호르~믈라카에 적은 말이다.
     조호르는 이 권역의 prizeYard다. 나포한 배를 뜯어 파는 자리가 곧 그의 자리다. */
  {
    id: 'hangnadim', name: '항 나딤', flag: 'malacca', ship: 'lancaran',
    base: 'johor', purse: [2200, 7000], strength: 4, bounty: [2400, 5200],
    hunt: ['johor|melaka', 'aceh|melaka', 'banten|johor', 'johor|patani'],
    circuit: ['johor', 'melaka', 'perak', 'melaka', 'johor', 'patani', 'johor', 'banten', 'johor'],
    season: null, scope: 'region',
    blurb: '믈라카를 뺏긴 술탄의 락사마나. 도시는 잃었어도 해협은 놓지 않았다.',
    lines: { hail: '“이 물목은 술탄의 것이다. 성채를 가졌다고 바다가 네 것은 아니다.”' },
  },

  /* ── 보르네오 북안 · 술루 바다 ──────────────────────────────
     '카무코네스'는 스페인 기록이 보르네오 북동안과 술루 바다에서 나오던 습격선을 부르던 이름이다.
     코라코라는 이 게임에서 가장 빠른 배다(속력 1.55) — 노와 돛을 같이 쓰는 아웃리거 전선이라
     바람이 죽어도 멈추지 않는다. 다만 hp 58에 포 5문이라 정면 싸움은 못 한다.
     ★ 그래서 strength 2다. **빠르지만 약하다** — 도망칠 수 없고 이길 수는 있는 상대라
       초반 플레이어에게 가장 쓸모 있는 종류의 위험이다.
     ★ season 'winter' — 북동 계절풍이 배를 남쪽으로 밀어 준다. 습격은 그 바람을 타고 나갔다. */
  {
    id: 'camucones', name: '카무코네스', flag: 'pirate', ship: 'korakora',
    base: 'brunei', purse: [420, 1600], strength: 2, bounty: [450, 1050],
    // 'banda|makassar'(요율 9.0)는 향료 밀무역선의 길이다. 스페인 기록의 카무코네스는
    // 술루 바다에만 있지 않고 몰루카 쪽 물동에도 손을 댔다 — 이 구간에 임자를 둔 근거다.
    hunt: ['brunei|patani', 'brunei|gresik', 'brunei|makassar', 'banda|makassar'],
    circuit: ['brunei', 'patani', 'brunei', 'makassar', 'brunei', 'gresik', 'brunei'],
    season: 'winter', scope: 'region',
    blurb: '노와 돛을 같이 쓴다. 바람이 죽으면 그때부터 이쪽이 빠르다.',
    lines: {
      hail: '“바람을 기다리지 마라. 우리는 안 기다린다.”',
      spare: '“됐다. 노잡이가 지쳤다.”',
    },
  },

  /* ── 해협 중간 · 페락 ───────────────────────────────────────
     ★ 초반 상대. 이름난 두목이 아니라 해협에 붙어 사는 좀도둑이다.
       페라후는 hp 66·포 3문이라 낡은 바사(hp 55·포 2문)와 거의 대등하다 —
       이 게임에서 "첫 승리"가 나올 만한 자리를 일부러 하나 비워 둔 것이다. */
  {
    id: 'selatband', name: '해협의 좀도둑', flag: 'pirate', ship: 'perahu',
    base: 'perak', purse: [150, 650], strength: 1, bounty: [180, 430],
    hunt: ['melaka|perak', 'pasai|perak', 'johor|melaka'],
    circuit: ['perak', 'melaka', 'perak', 'pasai', 'perak'],
    season: null, scope: 'region',
    blurb: '맹그로브 뒤에서 나온다. 배 두 척에 사람 스물, 그것뿐이다.',
    lines: { hail: '“주석이냐 후추냐. 무거운 쪽을 내려라.”' },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   군도의 습격선과 회사 순찰선이 같은 물에 떠 있던 바다다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '이라눈 습격선', nation: '해적', hull: 'galley', tint: 'oak', goods: ['grain', 'salt', 'spice'] },
  { name: '술루 함대', nation: '술루', hull: 'galley', tint: 'dark', goods: ['spice', 'pepper', 'grain'] },
  { name: '조호르 함대', nation: '조호르', hull: 'carrack', tint: 'oak', goods: ['pepper', 'spice', 'tin'] },
  { name: '회사 순찰선', nation: '네덜란드', hull: 'frigate', tint: 'white', goods: ['clove', 'nutmeg', 'pepper'] },
  { name: '회사 향료 함대', nation: '네덜란드', hull: 'galleon', tint: 'green', goods: ['clove', 'nutmeg', 'spice'] },
];
