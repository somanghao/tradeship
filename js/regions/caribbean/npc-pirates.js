// regions/caribbean/npc-pirates.js — 카리브·누에바에스파냐의 해적
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
// ★ **이 권역을 비워 둘 수는 없다.** 사략이라는 말이 가장 잘 어울리는 바다이고,
//   요율도 그렇게 말한다 — 산토도밍고~토르투가 9.5 · 산티아고데쿠바~토르투가 9.5 ·
//   카르타헤나~자메이카 9.0. 은이 한 줄로 흐르는 바다라 그 줄 옆에 전부 누군가 앉아 있다.
//
// ★ **이 바다의 해적은 대부분 나라의 배다.** 드레이크는 여왕의 투자를 받았고 소르는
//   프랑스 위그노였으며 아라야의 네덜란드 배는 소금을 사러 왔다가 총을 쐈다.
//   그래서 졸리 로저가 아니라 제 나라 깃발을 단다 — 그것이 사략과 해적의 차이다.
//   깃발이 'pirate'인 자는 시마론뿐인데, 그들에게는 애초에 나라가 없었다.
//
// ★ 계절: 카리브의 허리케인철은 6~11월이다. 은 함대(플로타)도 사략선도 그 철을 피해
//   건기에 움직였다 — 그래서 **이 바다는 겨울에 위험해진다.** 지중해와 정반대다.
//   다만 소르는 반대로 여름에 나온다(아래 주석 참조).

export const PIRATES = [
  /* ── 스페인 본토 해안(티에라 피르메) ────────────────────────
     프랜시스 드레이크. 1572~73년 지협에서 은 대상을 털었고, 1585~86년에는 함대를 몰고 와
     산토도밍고와 카르타헤나를 통째로 점령해 몸값을 받아 냈다. 1595~96년 마지막 항해에서
     이 바다에서 병으로 죽었다.
     ★ 소굴: 그에게는 항구가 없었다 — 스페인령뿐인 바다에서 사략선의 소굴은 지도에 없는 후미다.
       자메이카를 base로 둔 것은 이 시기 이 섬이 스페인이 이름만 걸어 둔 빈 섬이었고
       풍하 쪽 후미가 밀무역선의 물터로 쓰였기 때문이다.
     ★ 이 권역의 유일한 strength 5다. 요율 9.0대 구간이 셋인 바다에 두목이 하나는 있어야 한다. */
  {
    id: 'drake', name: '프랜시스 드레이크', flag: 'england', ship: 'frigate',
    base: 'jamaica', purse: [4500, 15000], strength: 5, bounty: [5000, 12000],
    // 'havana|sevilla'는 은 함대(플로타)가 대양을 건너는 구간이다. 요율 9.5짜리 이 선을
    // 노리는 자가 아무도 없으면 이 바다에 사략선이 오는 이유 자체가 설명되지 않는다.
    hunt: ['cartagena|havana', 'cartagena|jamaica', 'cartagena|nombrededios',
      'jamaica|santodomingo', 'havana|sevilla'],
    circuit: ['jamaica', 'cartagena', 'nombrededios', 'cartagena', 'santamarta', 'riohacha',
      'maracaibo', 'nuevacadiz', 'sanjuan', 'santodomingo', 'jamaica'],
    season: 'winter', scope: 'ocean',
    blurb: '여왕이 배당을 받는 해적이다. 도시를 털지 않는다 — 몸값을 매겨 판다.',
    lines: {
      hail: '“은을 실었소? 그럼 이야기가 짧아지겠군.”',
      spare: '“가시오. 세비야에 가서 내 이름을 정확히 전해 주시오.”',
    },
  },

  /* ── 쿠바 · 이스파니올라 ────────────────────────────────────
     자크 드 소르. 프랑스 위그노 사략선장으로 1555년 7월 아바나를 습격해 요새를 함락시키고
     도시를 불태웠다. 몸값을 안 주자 항구를 태워 버린 자다.
     ★ season 'summer'가 사실이다 — 그는 허리케인철 한복판인 7월에 들이닥쳤다.
       스페인 순찰선이 배를 뭍에 올려놓는 철이라 오히려 막을 자가 없었다. 이 바다에서
       겨울에만 위험하지 않게 만드는 장치가 이 한 사람이다.
     ★ 소굴 토르투가: 이 섬이 사략의 소굴로 굳는 것은 1620년대 이후라 소르의 시대보다 뒤다.
       이 프로젝트는 연도를 고정하지 않으므로(evidence-meta: era) 그대로 두었다 —
       토르투가는 이 권역의 prizeYard이고, 나포선이 경매에 서는 자리가 곧 사략선의 자리다. */
  {
    id: 'sores', name: '자크 드 소르', flag: 'france', ship: 'patache',
    base: 'tortuga', purse: [2400, 7500], strength: 4, bounty: [2600, 5600],
    hunt: ['havana|santiagocuba', 'santiagocuba|tortuga', 'santodomingo|tortuga', 'cartagena|havana'],
    circuit: ['tortuga', 'santiagocuba', 'havana', 'veracruz', 'havana', 'santiagocuba', 'tortuga'],
    season: 'summer', scope: 'region',
    blurb: '폭풍철에 들어온다. 지킬 배가 뭍에 올라앉는 철이라야 항구가 열려 있다.',
    lines: { hail: '“몸값이오, 잿더미요. 고르시오 — 나는 둘 다 익숙하오.”' },
  },

  /* ── 진주 해안 · 아라야 ─────────────────────────────────────
     푼타 데 아라야의 네덜란드 소금선. 1590년대 말부터 해마다 수십 척이 소금을 퍼 가려고
     들어왔고, 스페인 순찰대와 마주치면 그대로 싸웠다. 소금을 사러 온 배가 무장 상선이 되고
     무장 상선이 사략선이 되는 자리가 이 해안이다.
     ★ strength 2 — 함대가 아니라 상선이다. 이기면 짐이 두둑하지만 두목은 아니다. */
  {
    id: 'arayasalters', name: '아라야의 소금선단', flag: 'burgundy', ship: 'patache',
    base: 'nuevacadiz', purse: [450, 1700], strength: 2, bounty: [480, 1100],
    hunt: ['nuevacadiz|sanjuan', 'maracaibo|nuevacadiz', 'maracaibo|riohacha'],
    circuit: ['nuevacadiz', 'sanjuan', 'nuevacadiz', 'maracaibo', 'riohacha', 'maracaibo', 'nuevacadiz'],
    season: null, scope: 'region',
    blurb: '소금을 퍼러 왔다. 막아서면 그때부터 사략선이 된다.',
    lines: { hail: '“소금은 바다가 만든 거요. 국왕이 만든 게 아니라.”' },
  },

  /* ── 파나마 지협 ────────────────────────────────────────────
     ★ 초반 상대. 시마론은 지협의 농장에서 달아나 숲에 마을을 세운 사람들이다.
       1572년 드레이크가 은 대상을 턴 것도 이들이 노새길을 알려 준 덕이다.
     피라과는 통나무를 파낸 배다(hp 68·포 2문). 은을 실을 수는 없어도 그 은이 언제
     어느 길로 넘어오는지를 안다 — 그래서 이 무리가 파는 것은 짐이 아니라 소식이다. */
  {
    id: 'cimarron', name: '시마론의 피라과', flag: 'pirate', ship: 'piragua',
    base: 'nombrededios', purse: [150, 650], strength: 1, bounty: [180, 430],
    hunt: ['cartagena|nombrededios', 'nombrededios|portobelo'],
    circuit: ['nombrededios', 'portobelo', 'nombrededios', 'cartagena', 'nombrededios'],
    season: null, scope: 'region',
    blurb: '노새길을 아는 사람들이다. 은은 못 실어도 그 은이 언제 넘어오는지는 판다.',
    lines: {
      hail: '“스페인 배요? 그럼 내릴 게 있소.”',
      spare: '“가시오. 우리가 찾는 건 저 노새들이오.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   부카니에와 과르다코스타가 같은 물에 떠 있던 바다다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '부카니에 소선', nation: '해적', hull: 'brig', tint: 'dark', goods: ['salt', 'grain', 'hide'] },
  { name: '프랑스 해적', nation: '프랑스', hull: 'brig', tint: 'oak', goods: ['sugar', 'hide', 'salt'] },
  { name: '잉글랜드 사략선', nation: '잉글랜드', hull: 'carrack', tint: 'white', goods: ['silver', 'sugar', 'hide'] },
  { name: '과르다코스타 순찰선', nation: '스페인', hull: 'frigate', tint: 'white', goods: ['silver', 'pearl', 'sugar'] },
  { name: '스페인 은함대 호위기함', nation: '스페인', hull: 'galleon', tint: 'green', goods: ['silver', 'gold', 'pearl'] },
];
