// regions/africa/npc-pirates.js — 아프리카의 해적
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
// 아프리카는 **한 권역에 두 바다**가 들어 있다. 성격이 완전히 다르므로 배치도 갈랐다.
//
//   ① 기니만·서안 — 여기서 해적질은 "밀무역"의 다른 이름이다.
//      포르투갈이 교황 칙서로 이 해안을 독점했으므로, 값을 치르고 사고파는 프랑스·잉글랜드 배도
//      리스본 장부에는 해적으로 적혔다. 요율 9.0(아르귐~엘미나)·8.5(엘미나~산티아구)가 그 자리다.
//   ② 스와힐리·소말리 연안 — 계절풍이 주인이다. 북동 계절풍(11~3월)이 아라비아에서
//      배를 밀어 내리고, 남서 계절풍(4~9월)이 되밀어 올린다. **북에서 내려오는 습격자는
//      겨울에 온다** — 그래서 이 해안은 지중해와 위험한 철이 정반대다.
//
// 요율 11.0인 루안다~모잠비크(희망봉 구간)에는 아무도 두지 않았다. 근거 JSON이
// 그 값의 이유를 "서풍대의 파도와 뭍이 안 보이는 날"로 적었기 때문이다 — 거기 위험한 건 바다다.

export const PIRATES = [
  /* ── 기니만 ─────────────────────────────────────────────────
     존 호킨스. 1562·64·67년 세 번의 항해에서 시에라리온 연안에서 사람을 잡거나
     포르투갈 배를 털어 실은 뒤 곧장 서인도로 건너가 팔았다. 포르투갈에게도 스페인에게도
     그는 해적이었고 잉글랜드 여왕에게는 배를 빌려준 투자처였다.
     ★ scope 'ocean' — 이 자는 기니에서 사서 카리브에서 판다. 권역을 넘는 유일한 이유다. */
  {
    id: 'hawkins', name: '존 호킨스', flag: 'england', ship: 'nau',
    base: 'santiago', purse: [2400, 7500], strength: 4, bounty: [2400, 5400],
    // 'funchal|santodomingo'는 그가 실제로 건넌 선이다 — 1562·64년 항해가 기니에서
    // 이스파니올라로 곧장 넘어갔다. 요율 9.0인 이 횡단에 임자가 없으면 값이 뜬다.
    hunt: ['arguin|santiago', 'axim|santiago', 'elmina|santiago', 'arguin|elmina', 'funchal|santodomingo'],
    circuit: ['santiago', 'arguin', 'santiago', 'elmina', 'axim', 'elmina', 'santiago'],
    season: null, scope: 'ocean',
    blurb: '기니에서 싣고 서인도에서 판다. 여왕은 그를 상인이라 부르고 리스본은 해적이라 적는다.',
    lines: {
      hail: '“짐을 사겠소. 값은 내가 매기고, 파는 것도 그쪽 선택이 아니오.”',
      spare: '“영수증을 써 드리리다. 어디에 낼 데는 없겠지만.”',
    },
  },
  /* 디에프·오네플뢰르의 프랑스 밀무역선. 1530년대부터 포르투갈 요새를 피해
     베냉 강어귀(그와토)에서 직접 거래했다 — 요새가 없는 항구가 곧 그들의 항구였다.
     strength 2로 둔 것은 이들이 함대가 아니라 배 한두 척짜리 장사꾼이었기 때문이다. */
  {
    id: 'dieppois', name: '디에프의 밀무역선', flag: 'france', ship: 'caravel',
    base: 'gwato', purse: [450, 1600], strength: 2, bounty: [450, 1000],
    hunt: ['elmina|gwato', 'gwato|saotome', 'axim|elmina'],
    circuit: ['gwato', 'saotome', 'luanda', 'saotome', 'gwato', 'elmina', 'gwato'],
    season: null, scope: 'region',
    blurb: '요새가 없는 강어귀만 골라 든다. 총을 먼저 쏘지는 않지만 먼저 맞을 생각도 없다.',
    lines: { hail: '“교황이 그은 선은 우리 왕의 지도엔 없소.”' },
  },

  /* ── 스와힐리 · 소말리 연안 ─────────────────────────────────
     미르 알리 베이. 1585년과 1588년 두 차례, 갤리 한두 척만 끌고 홍해에서 이 해안을 내려와
     연안 도시들을 포르투갈에서 떼어 내고 포르투갈 배를 나포했다. 1589년 몸바사에서 붙잡혔다.
     ★ season 'winter' — 북동 계절풍을 타야 아라비아에서 이 해안으로 내려올 수 있다.
       지중해의 코르세어가 여름에 나오는 것과 정확히 반대다. 달력이 바다마다 다르다는 것이
       이 게임에서 항로 선택을 지도만 보고 못 하게 만드는 장치다. */
  {
    id: 'miralibeg', name: '미르 알리 베이', flag: 'ottoman', ship: 'galliot',
    base: 'mombasa', purse: [1200, 3800], strength: 3, bounty: [1200, 2800],
    hunt: ['lamu|mogadishu', 'lamu|malindi', 'malindi|mombasa', 'mombasa|zanzibar'],
    circuit: ['mombasa', 'malindi', 'lamu', 'mogadishu', 'lamu', 'malindi', 'mombasa'],
    season: 'winter', scope: 'region',
    blurb: '갤리 두 척으로 해안 하나를 뒤집는다. 배보다 그가 들고 오는 술탄의 칙서가 무섭다.',
    lines: { hail: '“이 해안은 술탄의 것이다. 포르투갈 통행증은 여기서 종이일 뿐이다.”' },
  },
  /* ★ 초반 상대. 케림바 군도는 모잠비크~킬와 사이에 흩어진 작은 섬 무리이고,
     포르투갈 기록에 연안 항해선이 이 물목에서 털렸다는 불평이 반복해 나온다.
     음테페는 못을 안 쓰고 야자 밧줄로 꿰맨 배다 — 빠르지도 튼튼하지도 않다. 그래서 strength 1. */
  {
    id: 'querimba', name: '케림바 군도의 습격꾼', flag: 'swahili', ship: 'mtepe',
    base: 'kilwa', purse: [150, 600], strength: 1, bounty: [180, 420],
    hunt: ['kilwa|mocambique', 'kilwa|sofala', 'kilwa|zanzibar'],
    circuit: ['kilwa', 'mocambique', 'sofala', 'kilwa', 'zanzibar', 'mombasa', 'kilwa'],
    season: null, scope: 'region',
    blurb: '꿰맨 배에 열 남짓. 큰 배는 못 붙고 연안을 기는 작은 배만 노린다.',
    lines: {
      hail: '“상아냐 곡식이냐. 무거운 쪽을 내려놔라.”',
      spare: '“가라. 섬 사이는 우리가 더 잘 안다.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   **기니만에서 바르바리 코르세어**가 나왔다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
/* ★ `flag`를 반드시 적는다. 처음에 이름·국적·선체만 갈아 끼웠더니 `localize()`가
   `flag: skin.flag ?? base.flag`로 떨어져 **`ENEMIES`의 유럽 깃발이 그대로 남았다** —
   명 수군 순찰선이 부르봉 백합기를, 왜구 대선단이 오스만기를 달고 나왔다.
   이름만 바꾸는 것으로는 "이 바다의 적"이 되지 않는다. 쓸 수 있는 깃발은
   `js/sprites/ship.js: FLAGS`의 키다. */
export const FOES = [
  { name: '기니 연안 습격선', nation: '해적', flag: 'pirate', hull: 'galley', tint: 'oak', goods: ['salt', 'grain', 'cloth'] },
  { name: '무어 코르세어', nation: '바르바리', flag: 'hafsid', hull: 'galley', tint: 'dark', goods: ['ivory', 'salt', 'gold'] },
  { name: '포르투갈 사략선', nation: '포르투갈', flag: 'portugal', hull: 'caravel', tint: 'white', goods: ['gold', 'ivory', 'spice'] },
  { name: '네덜란드 사략 선단', nation: '네덜란드', flag: 'burgundy', hull: 'fluyt', tint: 'oak', goods: ['gold', 'ivory', 'spice'] },
  { name: '오스만 홍해 함대', nation: '오스만', flag: 'ottoman', hull: 'galleon', tint: 'green', goods: ['gold', 'ivory', 'spice'] },
];
