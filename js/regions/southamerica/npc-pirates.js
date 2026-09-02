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
// 넷뿐이던 데는 이유가 있었다(회차29 이전).
//
//   ① **이 권역은 초반에 갈 수 없다.** 원양 항로(리스본~사우바도르 30일 · 아카풀코~마닐라 48일)를
//      건너야 닿으므로 여기 오는 플레이어는 이미 배와 선원을 갖췄다. 그래서 strength 1이 없다 —
//      다른 여덟 권역에는 전부 두었지만 여기만은 두지 않는 것이 맞다. **회차29 확장도 이 원칙을
//      지킨다** — 일곱이 되어도 strength 1은 여전히 하나도 없다.
//   ② **태평양 쪽에는 해적의 소굴이 있을 수 없다.** 마젤란 해협을 넘어온 배는 보급항이 없고,
//      돌아갈 길도 없어 태평양을 가로지르거나 다시 해협을 되짚어야 했다. 그래서 이 바다의
//      사략선은 소굴을 갖는 대신 **한 번 들어와 훑고 사라진다** — 그것이 circuit에 담긴 그림이다.
//   ③ 요율 최고가 부에노스아이레스~산투스 9.0이고, 그 위험의 정체는 습격이 아니라
//      **밀무역선과 감시선이 같은 물목에 있다**는 것이다. 그래서 그 자리에 사략선이 아니라
//      밀무역선을 앉혔다. 포토시의 은이 세비야를 거치지 않고 새어 나가던 길이 이 물이다.
//
// ── 회차29 확장 (4명 → 7명) ────────────────────────────────────
// RULE-BACKLOG §1이 이 권역을 해적 명부 최하위권(4명 · 지중해·동아시아 7명의 57%)으로 잡았다.
// 등급표(strength 1~5)에 **5가 하나도 없던 구멍**도 함께 있었다 — 이 바다에서 가장 유명한
// 침입자(드레이크)가 정작 빠져 있었다. 셋을 더해 그 구멍을 메운다.
//   · **나사우 함대**(strength 5) — 캐번디시(§드레이크는 카리브 권역이 이미 썼다 — id·이름
//     충돌을 피해 이 자리는 대신 태평양 쪽의 실재했던 큰 원정으로 채운다)보다 더 큰,
//     네덜란드가 태평양에 보낸 유일한 정규 함대다.
//   · **서인도회사 원정함대**(strength 4) — 대서양 쪽에 **네덜란드 서인도회사(WIC)**라는
//     제도가 실재했다는 것을 명부에도 새긴다(이미 FOES에 '서인도회사 함대'로 얼굴은 있었다).
//   · **바르톨로뮤 샤프**(strength 3) — 1680~81년 파나마 지협을 걸어 넘어 태평양으로
//     나온 잉글랜드 사략단. 소굴 없는 '지나가는 사람' 유형을 하나 더 둔다.
// 셋 다 **직명·제도는 사료이고 인물 서사는 이 명부의 관례대로 각색**했다 — 근거 판정은
// "이 사람이 실재했는가"가 아니라 "이 자리(태평양 침입·WIC 원정·지협 사략)가 이 바다에
// 실재했는가"에 매긴다(사용자 지시).

export const PIRATES = [
  /* ── 태평양 연안(페루 부왕령) ───────────────────────────────
     토머스 캐번디시. 1586~88년 세계를 한 바퀴 돌면서 페루·칠레 연안의 스페인 배를 태우고
     캘리포니아 앞바다에서 마닐라 갤리온 산타아나를 낚았다. 드레이크에 이어 두 번째로
     세계일주를 마친 잉글랜드인이고, 이 바다에서 그가 한 일은 나포보다 방화에 가까웠다.
     ★ 소굴이 없다. 발파라이소를 base로 둔 것은 물을 채우고 배를 눕힐 후미가 그쪽뿐이라서다.
     ★ hunt에 'callao|panama'가 들어 있다 — 페루 은이 파나마로 올라가는 구간이고,
       이 바다에 사략선이 들어오는 이유의 전부다.
     ⚠️ 회차 26에 'callao|portobelo'에서 고쳤다 — **그 둘은 이어져 있지 않다**(포르토벨로는
       지협 건너다). `huntedOnLeg`는 `riskKey`가 hunt와 **정확히 일치**할 때만 열리므로
       없는 항로를 적으면 그 줄은 조용히 죽고 화면만 사냥터라고 말한다
       (`node tools/probe-roster.mjs` §1이 이제 이것을 잡는다). */
  {
    id: 'cavendish', name: '토머스 캐번디시', flag: 'england', ship: 'redonda',
    base: 'valparaiso', purse: [2600, 8500], strength: 4, bounty: [2800, 6000],
    // 'acapulco|manila' — 이 게임에서 가장 긴 항로(48일·요율 10.0)이고, 캐번디시가
    // 실제로 그 배(산타아나)를 낚은 구간이다. 마닐라 갤리온을 노리는 자가 하나도 없으면
    // 태평양 요율 10.0이 그냥 날씨값이 되어 버린다.
    hunt: ['arica|callao', 'arica|valparaiso', 'callao|guayaquil', 'callao|panama', 'acapulco|manila'],
    circuit: ['valparaiso', 'arica', 'callao', 'paita', 'guayaquil', 'paita', 'callao', 'arica', 'valparaiso'],
    season: null, scope: 'ocean',
    blurb: '해협을 넘어온 배다. 돌아갈 길이 없으니 실어 가는 대신 태운다.',
    lines: {
      hail: '“이 바다에 우리 같은 배가 온 적 없다고 들었소. 이제 있소.”',
      spare: '“짐은 두고 가시오. 배는 태울 시간이 없소.”',
    },
  },
  /* ★ 회차29 확장 — strength 5. 나사우 함대(Nassause Vloot). 1623~26년 네덜란드
     서인도회사가 아니라 **국가(총독·의회)가 직접** 띄운 11척짜리 원정함대 — 태평양에
     들어온 유일한 유럽 국가함대다. 1624년 5월부터 여러 달 카야오 항을 봉쇄해
     페루~파나마·마닐라 은 수송을 끊었고, 과야킬을 태우고 물러났다. 캐번디시·판 노르트
     (개인 사략선 4급)보다 훨씬 큰 규모라 이 바다의 등급표에 없던 5를 여기 채운다.
     ⚠️ 카리브 권역이 이미 '프랜시스 드레이크'(id: drake)를 썼으므로 그와 겹치지 않는
       별개 사건을 골랐다 — 이름·id 충돌을 피하는 것이 이 게임의 명부 규약이다.
     ★ hunt에 callao|guayaquil을 넣었다 — 봉쇄한 항구(카야오)와 불태운 항구(과야킬) 사이,
       실제로 함대가 오르내린 구간이다. */
  {
    id: 'nassaufleet', name: '나사우 함대', flag: 'burgundy', ship: 'galleon',
    base: 'callao', purse: [4200, 14000], strength: 5, bounty: [4800, 11000],
    hunt: ['callao|guayaquil', 'callao|islay', 'arica|callao'],
    circuit: ['callao', 'guayaquil', 'callao', 'islay', 'arica', 'callao'],
    season: null, scope: 'ocean',
    blurb: '개인이 아니라 나라가 보낸 함대다. 카야오 앞바다에 몇 달을 눌러앉아 항구를 굶겼다.',
    lines: {
      hail: '“의회의 이름으로 이 항을 막는다. 통행세가 아니라 봉쇄다.”',
      spare: '“짐은 몰수한다. 배는 돌려주지 — 소문을 낼 사람이 있어야 하니까.”',
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
  /* ★ 회차29 확장 — strength 4. 네덜란드 서인도회사(WIC)의 바이아 원정함대. 1624년 5월,
     야코프 빌레케스 제독과 부제독 피트 헤인이 이끄는 26척의 함대가 살바도르(São Salvador
     da Bahia)를 점령하고 한 해 동안 지켰다 — 사략선 한두 척이 아니라 **회사가 조직한
     정규 원정**이었다는 점이 이 명부의 다른 인물들과 다르다. 1625년 스페인·포르투갈
     연합함대(회복함대)에 밀려났지만, 1630년 페르남부쿠(레시피·올린다)를 다시 침이
     결국 1654년까지 이어지는 '네덜란드령 브라질'의 시작이었다. FOES의 '서인도회사
     함대'가 이미 얼굴로 있던 그 세력을 명부에도 이름으로 새긴다.
     ★ hunt에 recife|salvador를 넣었다 — 1624년의 목표(살바도르)와 1630년의 목표
       (페르남부쿠) 사이, WIC가 실제로 오르내린 구간이다. */
  {
    id: 'wicfleet', name: '서인도회사 원정함대', flag: 'burgundy', ship: 'indiaman',
    base: 'salvador', purse: [2800, 8200], strength: 4, bounty: [3000, 6200],
    hunt: ['recife|salvador', 'ilheus|salvador'],
    circuit: ['salvador', 'ilheus', 'salvador', 'recife', 'salvador'],
    season: null, scope: 'region',
    blurb: '회사가 함대를 띄운다. 이름을 가진 사략선과 다르다 — 이긴 뒤에도 이듬해 다시 온다.',
    lines: {
      hail: '“회사가 이 항구를 접수한다. 항의는 암스테르담으로 보내시오.”',
      spare: '“짐만 두고 가면 배는 태우지 않겠다. 회사는 장사꾼이지 방화범이 아니다.”',
    },
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

  /* ── 발파라이소 ─────────────────────────────────────────────
     올리비어르 판 노르트. 네덜란드인으로는 처음 세계를 돌았고, 마젤란 해협을 나와 칠레·페루 연안을
     훑은 뒤 태평양을 건너 마닐라 앞바다에서 스페인 함대와 싸웠다.
     ★ 캐번디시와 같은 자리이되 **깃발이 다르다** — 이 바다의 남쪽 문(해협)이 잉글랜드만의 것이
       아니었다는 표시로 둔다. scope 'ocean'인 것도 그 때문이다: 이 사람은 지나가는 사람이다. */
  {
    id: 'vannoort', name: '올리비어르 판 노르트', flag: 'burgundy', ship: 'holk',
    base: 'valparaiso', purse: [2600, 8000], strength: 4, bounty: [3000, 6000],
    hunt: ['arica|valparaiso', 'concepcion|valparaiso', 'arica|callao'],
    circuit: ['valparaiso', 'concepcion', 'valparaiso', 'arica', 'callao', 'arica', 'valparaiso'],
    season: null, scope: 'ocean',
    blurb: '해협을 나온 배는 대개 굶주려 있다. 그래서 처음 만나는 항구가 가장 위험하다.',
    lines: {
      hail: '“해협에서 넉 달을 굶었소. 오늘은 예의를 차릴 형편이 아니오.”',
      spare: '“식량과 물이면 되오. 은은 당신들 왕에게나 가져다주시오.”',
    },
  },
  /* ★ 회차29 확장 — strength 3. 바르톨로뮤 샤프. 1680년 잉글랜드·프랑스 버커니어 무리가
     파나마 지협을 **걸어서** 넘어(배가 아니라 발로) 태평양에 나타났다 — 드레이크·캐번디시·
     판 노르트가 전부 해협을 돌아온 것과 반대다. 이듬해까지 페루·칠레 연안(일로·아리카
     인근)을 훑고 배 몇 척을 나포한 뒤, 결국 케이프 혼을 돌아 대서양으로 빠져나갔다 —
     '지협으로 들어와 혼곶으로 나간' 특이한 경로가 이 자의 정체성이다. ★ 소굴이 없다
     (지협을 넘어온 자라 발파라이소·과야킬 같은 정박 근거지가 없다). base는 활동 범위의
     북쪽 끝인 아리카로 둔다. */
  {
    id: 'sharp', name: '바르톨로뮤 샤프', flag: 'england', ship: 'brig',
    base: 'arica', purse: [1200, 4000], strength: 3, bounty: [1100, 2600],
    hunt: ['arica|islay', 'callao|islay'],
    circuit: ['arica', 'islay', 'callao', 'islay', 'arica'],
    season: null, scope: 'ocean',
    blurb: '배가 아니라 발로 태평양에 왔다. 지협을 넘어온 자들이라 돌아갈 배도 저희가 구해야 한다.',
    lines: {
      hail: '“지협을 걸어 넘었소. 이 정도는 받아 가야 그 발품 값이 나오지.”',
      spare: '“혼곶으로 돌아갈 배가 필요할 뿐이오. 그쪽 배는 아니니 안심하시오.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   대서양 쪽은 브라질 연안의 밀무역선, 태평양 쪽은 남해로 넘어온 사략선이다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
/* ★ `flag`를 반드시 적는다. 처음에 이름·국적·선체만 갈아 끼웠더니 `localize()`가
   `flag: skin.flag ?? base.flag`로 떨어져 **`ENEMIES`의 유럽 깃발이 그대로 남았다** —
   명 수군 순찰선이 부르봉 백합기를, 왜구 대선단이 오스만기를 달고 나왔다.
   이름만 바꾸는 것으로는 "이 바다의 적"이 되지 않는다. 쓸 수 있는 깃발은
   `js/sprites/ship.js: FLAGS`의 키다. */
export const FOES = [
  { name: '연안 밀무역선', nation: '해적', flag: 'pirate', hull: 'brig', tint: 'oak', goods: ['hide', 'salt', 'grain'] },
  { name: '프랑스 밀무역 사략선', nation: '프랑스', flag: 'france', hull: 'brig', tint: 'dark', goods: ['sugar', 'hide', 'grain'] },
  { name: '잉글랜드 사략선', nation: '잉글랜드', flag: 'england', hull: 'carrack', tint: 'white', goods: ['silver', 'sugar', 'hide'] },
  { name: '남해 순찰 함대', nation: '스페인', flag: 'spain', hull: 'frigate', tint: 'white', goods: ['silver', 'gold', 'sugar'] },
  { name: '서인도회사 함대', nation: '네덜란드', flag: 'burgundy', hull: 'galleon', tint: 'green', goods: ['sugar', 'silver', 'gold'] },
];
