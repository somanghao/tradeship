// regions/mediterranean/npc-pirates.js — 지중해의 해적
//
// 상인을 노리고 돌아다닌다. 플레이어도 사냥감이다. 이들이 턴 짐은 목적지에 닿지 못해
// **그 항구에서 그 물건이 귀해진다**(`world.js: raids` → 시장 충격).
//
// ── 필드 ────────────────────────────────────────────────────
//   id, name, flag, ship, purse   무역상과 같다
//   base     소굴 항구 — 여기서 출항하고 여기로 돌아간다
//   hunt     즐겨 노리는 구간 키들 ('a|b' 정렬형). 비우면 상인이 많은 쪽으로 쏠린다
//   strength 1~5. 전투력이다. 5는 함대를 이끄는 두목이라 초반에 만나면 끝장난다
//   bounty   [최소,최대] 현상금 — 잡으면 받는다
//   circuit  순회로. 해적도 계절과 항로를 탄다
//   season   'summer'|'winter'|null — 코르세어는 여름에 나온다(겨울 지중해는 배가 안 뜬다)
//   scope    'region' | 'ocean'
//   blurb, lines
//
// ★ **시간의 흐름을 담아라.** circuit·season으로 "지금 어느 바다가 위험한가"가
//   달마다 바뀌면, 항로 선택이 지도만 보고 정하는 일이 아니게 된다.
// ★ 이름 있는 해적은 **역사에 실재한 인물**을 우선 쓴다(근거 JSON에 출처를 적는다).
//
// ── 이 파일의 규약 (해적 담당이 정한 것) ──────────────────────
//   lines    { hail, spare } — hail은 조우했을 때 첫 마디, spare는 짐을 던지고 달아날 때
//            그가 등 뒤로 던지는 말. 없어도 된다.
//   circuit  **인접 항로만 밟도록** 적었다(정박→다음 항구가 실제 ROUTES에 있다).
//            그래야 통합자가 경로 탐색을 붙이지 않고도 그대로 굴릴 수 있다.
//   season   말 그대로 "그 철에만 바다에 있다"는 뜻이다. 겨울 지중해는 배가 안 떴고
//            (11~3월 mare clausum), 발트는 얼었고, 말라바르는 남서 계절풍에 항구가 닫혔다.
//   ★ 지금 `world.js`는 circuit·season·hunt·strength를 하나도 읽지 않는다. 배선은 통합자 몫이다.
//
// ── 이 바다의 배치 근거 ──────────────────────────────────────
// 요율(ROUTE_RISK)이 말하는 순서를 그대로 따랐다.
//   9.0대 = 알제 앞(바르셀로나·말라가) · 몰타~튀니스     → 바르바로사 형제와 드라구트
//   8.0대 = 팔레르모~튀니스 · 에게해(아테네~로도스)      → 코르소와 에게 좀도둑
//   2.0대 = 아드리아 내해                                → 우스코크. 낮은 요율에 걸맞게 strength 2
// **기독교 쪽 해적을 반드시 넣었다.** 이 바다에서 해적질은 한쪽만 하던 일이 아니다 —
// 몰타 기사단과 토스카나의 코르소는 레반트 항로를 똑같이 털었고, 근거 JSON도
// 알제~튀니스 구간을 "위협의 방향이 반대인 구간"이라 적어 두었다.

export const PIRATES = [
  /* ── 서지중해 · 바르바리 ────────────────────────────────────
     ★ 오루치(1518년 전사)와 하이레딘(1546년 사망)은 실제로는 형제 대에 걸쳐 이어졌지만,
       이 게임은 연도를 고정하지 않으므로(evidence-meta: era) 둘을 한 바다에 같이 둔다.
       형이 갤리엇으로 연안을 훑고 아우가 함대를 몰고 나오는 그림이라 역할도 겹치지 않는다. */
  {
    id: 'barbarossa', name: '하이레딘 바르바로사', flag: 'ottoman', ship: 'greatgalley',
    base: 'algiers', purse: [4000, 14000], strength: 5, bounty: [5000, 12000],
    hunt: ['algiers|barcelona', 'algiers|malaga', 'algiers|mallorca', 'barcelona|palermo'],
    circuit: ['algiers', 'mallorca', 'barcelona', 'valencia', 'malaga', 'algiers'],
    season: 'summer', scope: 'region',
    blurb: '알제의 주인. 여름이면 함대를 몰고 나와 서지중해를 통째로 닫아 건다.',
    lines: {
      hail: '“알제의 깃발이다. 돛을 내려라 — 두 번 말하지 않는다.”',
      spare: '“짐은 받았다. 배는 두고 간다 — 다음에 또 실어 오라고.”',
    },
  },
  {
    // 형. 아우보다 먼저 이 바다에 있었고, 함대가 아니라 갤리엇 몇 척으로 연안을 훑었다.
    id: 'orucreis', name: '오루치 레이스', flag: 'ottoman', ship: 'galliot',
    base: 'algiers', purse: [2200, 7000], strength: 4, bounty: [2400, 5000],
    hunt: ['algiers|mallorca', 'algiers|palermo', 'palermo|tunis', 'alghero|mallorca'],
    circuit: ['algiers', 'tunis', 'palermo', 'malta', 'tunis', 'algiers'],
    season: 'summer', scope: 'region',
    blurb: '바르바로사의 형. 은팔을 달고도 노를 젓는다 — 큰 배는 아우에게 맡겼다.',
    lines: { hail: '“팔 하나로도 네 배는 뺏는다.”' },
  },
  {
    // 드라구트. 바르바로사의 부장으로 시작해 제 함대를 가졌다. 소굴은 제르바~트리폴리였으나
    // 이 지도에 없어 하프스 왕조의 튀니스에 앉혔다 — 같은 이프리키야 연안이고 prizeYard다.
    id: 'turgutreis', name: '투르구트 레이스', flag: 'hafsid', ship: 'galliot',
    base: 'tunis', purse: [1400, 4200], strength: 3, bounty: [1200, 2600],
    hunt: ['malta|tunis', 'palermo|tunis', 'malta|messina', 'malta|palermo'],
    circuit: ['tunis', 'malta', 'messina', 'ragusa', 'messina', 'malta', 'tunis'],
    season: 'summer', scope: 'region',
    blurb: '시칠리아 해협의 칼. 기사단이 가장 오래 쫓았고 가장 오래 못 잡은 자다.',
    lines: { hail: '“해협은 내 것이다. 통행세든 짐이든 하나는 놓고 가라.”' },
  },

  /* ── 기독교 쪽 코르소 ───────────────────────────────────────
     ★ 균형을 위해서가 아니라 사실이라서 넣는다. 근거 JSON은 알렉산드리아~베이루트를
       "몰타·토스카나 사략의 임검 표적"이라 적고, 로도스~베네치아 구간을 두고
       "에게·도데카니사는 기독교 사략의 최대 수익원"이라 적는다. */
  {
    // 알론소 데 콘트레라스 — 기사단 배를 타고 레반트를 털고 그 회고록을 직접 남긴 자.
    // 몰타는 항로가 셋뿐이라(튀니스·메시나·팔레르모) 순회로가 팔레르모로 나간다.
    id: 'contreras', name: '알론소 데 콘트레라스', flag: 'hospitaller', ship: 'xebec',
    base: 'malta', purse: [1200, 3800], strength: 3, bounty: [1000, 2400],
    hunt: ['alexandria|beirut', 'alexandria|rodos', 'athens|rodos', 'beirut|rodos'],
    circuit: ['malta', 'palermo', 'athens', 'rodos', 'alexandria', 'candia', 'ragusa', 'messina', 'malta'],
    season: 'summer', scope: 'region',
    blurb: '기사단의 배를 타고 레반트를 턴다. "무슬림 화물"이라는 말 한마디면 어느 배든 세운다.',
    lines: {
      hail: '“성 요한의 배요. 화물 명세를 내놓으시오 — 임검이지 약탈이 아니오.”',
      spare: '“기록에는 나포로 적겠소. 그쪽도 그렇게 적으시오.”',
    },
  },

  /* ── 아드리아 ───────────────────────────────────────────────
     세니의 우스코크. 요율 2.0~2.5대 내해에 두목을 앉히면 앞뒤가 안 맞으므로 strength 2다.
     ★ 이 게임에서 유일하게 **겨울에 나오는** 지중해 해적이다 — 베네치아 갤리대가
       배를 뭍에 올려놓는 철이 곧 그들의 철이었다. 노 젓는 작은 바르카라 사나운 물에도 뜬다. */
  {
    // 깃발을 'burgundy'(합스부르크 십자)로 둔 것은 그들이 스스로를 황제의 변경 수비대라
    // 여겼기 때문이다. 베네치아는 같은 배를 해적선이라 불렀다 — 이 어긋남이 우스코크다.
    id: 'uskoks', name: '세니의 우스코크', flag: 'burgundy', ship: 'tartane',
    base: 'ancona', purse: [400, 1500], strength: 2, bounty: [450, 1000],
    hunt: ['ancona|ragusa', 'ancona|venezia', 'candia|ragusa', 'messina|ragusa'],
    circuit: ['ancona', 'venezia', 'napoli', 'messina', 'ragusa', 'ancona'],
    season: 'winter', scope: 'region',
    blurb: '겨울에 나온다. 갤리가 뭍에 올라앉는 철이라야 이 작은 바르카가 바다의 주인이 된다.',
    lines: { hail: '“우리는 황제의 사람이다. 도둑이라 부르는 건 베네치아뿐이지.”' },
  },

  /* ── 에게해 ─────────────────────────────────────────────────
     ★ 초반 플레이어가 이길 수 있는 상대가 반드시 하나는 있어야 한다.
       첫 배가 낡은 바사(hp 55·포 2문)에 선원 0명이라, strength 4 이상만 있으면 게임이 시작되지 않는다.
       근거 JSON이 "파로스~낙소스 해협과 나우사만은 1420년부터 해적 정박지로 기록됐다"고 적은
       그 자리에 이름 없는 좀도둑을 앉힌다. 실존 인물이 아니라 **실존한 자리**다. */
  {
    id: 'naxosband', name: '낙소스 여울의 무리', flag: 'pirate', ship: 'tartane',
    base: 'athens', purse: [150, 600], strength: 1, bounty: [180, 420],
    hunt: ['athens|chios', 'athens|rodos', 'chios|rodos'],
    circuit: ['athens', 'chios', 'rodos', 'athens'],
    season: null, scope: 'region',
    blurb: '배 한 척에 열둘. 큰 배는 건드리지 않고 짐 실은 작은 배만 골라 붙는다.',
    lines: {
      hail: '“싣고 있는 게 뭐냐. 반만 놓고 가라.”',
      spare: '“됐다. 다음엔 호위를 붙이든가.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   그것이 홍해와 대만 해협까지 나갔다. 여기 옮겨 적어 **이 바다의 것으로 되돌린다.**
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '해적 소함', nation: '해적', hull: 'brig', tint: 'dark', goods: ['salt', 'wine', 'grain'] },
  { name: '바르바리 코르세어', nation: '바르바리', hull: 'galley', tint: 'oak', goods: ['ivory', 'spice', 'salt'] },
  { name: '검은 깃발단', nation: '해적', hull: 'carrack', tint: 'dark', goods: ['silk', 'gold', 'spice'] },
  { name: '프랑스 순찰 프리깃 팡당', nation: '프랑스', hull: 'frigate', tint: 'white', goods: ['wine', 'weapon', 'glass'] },
  { name: '바르바리 기함 알 사파', nation: '바르바리', hull: 'galleon', tint: 'green', goods: ['gold', 'ivory', 'silk'] },
];
