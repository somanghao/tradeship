// regions/southamerica/npc-pirates.js — 남아메리카의 해적
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
// 셋뿐인 데는 이유가 있다.
//
//   ① **이 권역은 초반에 갈 수 없다.** 원양 항로(리스본~사우바도르 30일 · 아카풀코~마닐라 48일)를
//      건너야 닿으므로 여기 오는 플레이어는 이미 배와 선원을 갖췄다. 그래서 strength 1이 없다 —
//      다른 여덟 권역에는 전부 두었지만 여기만은 두지 않는 것이 맞다.
//   ② **태평양 쪽에는 해적의 소굴이 있을 수 없다.** 마젤란 해협을 넘어온 배는 보급항이 없고,
//      돌아갈 길도 없어 태평양을 가로지르거나 다시 해협을 되짚어야 했다. 그래서 이 바다의
//      사략선은 소굴을 갖는 대신 **한 번 들어와 훑고 사라진다** — 그것이 circuit에 담긴 그림이다.
//   ③ 요율 최고가 부에노스아이레스~산투스 9.0이고, 그 위험의 정체는 습격이 아니라
//      **밀무역선과 감시선이 같은 물목에 있다**는 것이다. 그래서 그 자리에 사략선이 아니라
//      밀무역선을 앉혔다. 포토시의 은이 세비야를 거치지 않고 새어 나가던 길이 이 물이다.

export const PIRATES = [
  /* ── 태평양 연안(페루 부왕령) ───────────────────────────────
     토머스 캐번디시. 1586~88년 세계를 한 바퀴 돌면서 페루·칠레 연안의 스페인 배를 태우고
     캘리포니아 앞바다에서 마닐라 갤리온 산타아나를 낚았다. 드레이크에 이어 두 번째로
     세계일주를 마친 잉글랜드인이고, 이 바다에서 그가 한 일은 나포보다 방화에 가까웠다.
     ★ 소굴이 없다. 발파라이소를 base로 둔 것은 물을 채우고 배를 눕힐 후미가 그쪽뿐이라서다.
     ★ hunt에 'callao|portobelo'가 들어 있다 — 페루 은이 파나마로 올라가는 원양 구간이고,
       이 바다에 사략선이 들어오는 이유의 전부다. */
  {
    id: 'cavendish', name: '토머스 캐번디시', flag: 'england', ship: 'redonda',
    base: 'valparaiso', purse: [2600, 8500], strength: 4, bounty: [2800, 6000],
    // 'acapulco|manila' — 이 게임에서 가장 긴 항로(48일·요율 10.0)이고, 캐번디시가
    // 실제로 그 배(산타아나)를 낚은 구간이다. 마닐라 갤리온을 노리는 자가 하나도 없으면
    // 태평양 요율 10.0이 그냥 날씨값이 되어 버린다.
    hunt: ['arica|callao', 'arica|valparaiso', 'callao|guayaquil', 'callao|portobelo', 'acapulco|manila'],
    circuit: ['valparaiso', 'arica', 'callao', 'paita', 'guayaquil', 'paita', 'callao', 'arica', 'valparaiso'],
    season: null, scope: 'ocean',
    blurb: '해협을 넘어온 배다. 돌아갈 길이 없으니 실어 가는 대신 태운다.',
    lines: {
      hail: '“이 바다에 우리 같은 배가 온 적 없다고 들었소. 이제 있소.”',
      spare: '“짐은 두고 가시오. 배는 태울 시간이 없소.”',
    },
  },

  /* ── 브라질 해안 ────────────────────────────────────────────
     과나바라의 프랑스 사략선. 1555년 빌레가뇽이 지금의 리우데자네이루 만에 '남극 프랑스'를
     세웠고 1567년 포르투갈이 몰아낼 때까지 이 만이 프랑스 배의 항구였다. 그 전후로도
     노르망디·브르타뉴 배가 투피낭바와 손을 잡고 파우 브라질을 실어 냈다.
     ★ 이쪽도 관점이 갈리는 자리다 — 포르투갈 장부에는 해적이고 프랑스 왕에게는 식민지였다.
       blurb에 그 두 이름을 나란히 적었다. */
  {
    id: 'guanabara', name: '과나바라의 프랑스 사략선', flag: 'france', ship: 'redonda',
    base: 'riodejaneiro', purse: [1200, 4000], strength: 3, bounty: [1100, 2600],
    hunt: ['riodejaneiro|salvador', 'ilheus|riodejaneiro', 'riodejaneiro|santos'],
    circuit: ['riodejaneiro', 'ilheus', 'salvador', 'recife', 'salvador', 'ilheus', 'riodejaneiro', 'santos', 'riodejaneiro'],
    season: null, scope: 'region',
    blurb: '리스본은 해적이라 적고 파리는 식민지라 적는다. 싣는 것은 똑같이 붉은 나무다.',
    lines: { hail: '“이 만은 프랑스요. 지도를 다시 보시오.”' },
  },

  /* ── 라플라타 ───────────────────────────────────────────────
     요율 9.0(부에노스아이레스~산투스)의 임자. 부에노스아이레스는 세비야로 가는 정규 길에서
     비켜난 뒷문이었고, 포토시 은이 여기서 브라질과 포르투갈 배로 새어 나갔다.
     스페인은 이 배들을 '악의의 기항(arribada maliciosa)'이라 불렀다 — 폭풍에 떠밀려
     어쩔 수 없이 들렀다고 우기며 짐을 부리던 관행이다.
     ★ 이 배는 먼저 쏘지 않는다. 다만 붙잡히면 나포되고, 붙잡으면 나포한다.
       strength 2 — 이 권역에서 가장 만만한 상대이되 초심자용은 아니다. */
  {
    id: 'arribada', name: '라플라타의 밀무역선', flag: 'portugal', ship: 'patache',
    base: 'colonia', purse: [500, 1800], strength: 2, bounty: [500, 1200],
    hunt: ['buenosaires|santos', 'buenosaires|colonia', 'colonia|santos'],
    circuit: ['colonia', 'buenosaires', 'colonia', 'santos', 'colonia'],
    season: null, scope: 'region',
    blurb: '폭풍에 떠밀려 왔다고 우긴다. 선창에는 포토시 은이 들어 있다.',
    lines: {
      hail: '“조난이오. 짐을 좀 내려야겠소 — 매번 그렇듯이.”',
      spare: '“서로 못 본 걸로 합시다.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   대서양 쪽은 브라질 연안의 밀무역선, 태평양 쪽은 남해로 넘어온 사략선이다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '연안 밀무역선', nation: '해적', hull: 'brig', tint: 'oak', goods: ['hide', 'salt', 'grain'] },
  { name: '프랑스 밀무역 사략선', nation: '프랑스', hull: 'brig', tint: 'dark', goods: ['sugar', 'hide', 'grain'] },
  { name: '잉글랜드 사략선', nation: '잉글랜드', hull: 'carrack', tint: 'white', goods: ['silver', 'sugar', 'hide'] },
  { name: '남해 순찰 함대', nation: '스페인', hull: 'frigate', tint: 'white', goods: ['silver', 'gold', 'sugar'] },
  { name: '서인도회사 함대', nation: '네덜란드', hull: 'galleon', tint: 'green', goods: ['sugar', 'silver', 'gold'] },
];
