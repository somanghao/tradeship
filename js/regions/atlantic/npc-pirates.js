// regions/atlantic/npc-pirates.js — 대서양·북해의 해적
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
//   season   'summer'|'winter'|null
//   scope    'region' | 'ocean'
//   blurb, lines { hail, spare }
//
// ★ circuit은 **인접 항로만 밟도록** 적었다(ROUTES에 실제로 있는 구간만 잇는다).
// ★ 지금 `world.js`는 circuit·season·hunt·strength를 읽지 않는다 — 배선은 통합자 몫이다.
//
// ── 이 바다의 배치 근거 ──────────────────────────────────────
// 지중해가 "여름의 바다"라면 이쪽은 **철이 갈리는 바다**다.
//   · 발트는 언다. 11~4월에 동발트 항구가 닫히므로 이 바다의 해적은 물리적으로 여름에만 뜬다.
//   · 반대로 좁은 해협(도버·비스케이)은 겨울이 사냥철이다 — 큰 함대가 뭍에 올라앉기 때문이다.
//     덩케르커가 겨울 순항으로 이름을 얻은 것이 그 이유다.
// 요율 상위 구간(빌바오~라로셸 9.0 · 베르겐~브리스톨 8.5 · 빌바오~보르도 8.0)에
// 반드시 임자를 하나씩 붙였고, 요율 3.0 이하 내해(안트베르펜~브뤼헤)에는 아무도 두지 않았다.

export const PIRATES = [
  /* ── 도버 해협 · 플랑드르 ───────────────────────────────────
     덩케르커. 됭케르크가 이 지도에 없어 같은 합스부르크령 스헬더 어귀의 안트베르펜에 앉혔다.
     ★ 이들은 해적이 아니라 **사략선**이다 — 그래서 졸리 로저가 아니라 부르고뉴 십자를 단다.
       그 차이가 이 게임에서 갖는 뜻은 단순하다: 잡히면 재판을 받고, 잡으면 경매에 부친다. */
  {
    id: 'jacobsen', name: '얀 야콥선', flag: 'burgundy', ship: 'redonda',
    base: 'antwerpen', purse: [2200, 7000], strength: 4, bounty: [2400, 5200],
    hunt: ['antwerpen|london', 'brugge|london', 'hamburg|london', 'larochelle|london'],
    circuit: ['antwerpen', 'brugge', 'london', 'antwerpen'],
    season: 'winter', scope: 'region',
    blurb: '겨울 해협의 주인. 함대가 뭍에 올라앉는 철에만 나오는 프리깃 한 척이다.',
    lines: {
      hail: '“나포면허가 있소. 이건 강도질이 아니라 전쟁이오.”',
      spare: '“배는 두고 가시오. 됭케르크 법정에 세울 만한 물건이 아니라서.”',
    },
  },

  /* ── 바르바리가 북쪽으로 ────────────────────────────────────
     ★ 사용자가 지목한 "바르바리가 아이슬란드까지 올라간 사건"이다.
       1627년 여름 살레·알제의 코르세어가 아이슬란드에 상륙해 사람을 실어 갔고,
       1631년에는 아일랜드 볼티모어를 통째로 비웠다. 지휘한 자가 하를럼 출신의
       네덜란드 배교자 얀 얀손 — 무라트 레이스 알사기르다.
     살레가 이 지도에 없어 마데이라(푼샬)를 출항지로 둔다. 대양으로 나가는 첫 기항지이고,
     실제로 이 섬들도 코르세어에게 사람을 뺏겼다. scope는 'ocean' — 이 자는 권역을 넘는다. */
  {
    id: 'muratreis', name: '무라트 레이스 알사기르', flag: 'ottoman', ship: 'redonda',
    base: 'funchal', purse: [2400, 7500], strength: 4, bounty: [2600, 5600],
    hunt: ['bergen|bristol', 'amsterdam|bergen', 'bergen|kobenhavn', 'funchal|sevilla'],
    // 한 방향으로 올라갔다가 그대로 되짚어 내려온다. 북상은 여름 한 철뿐이다.
    circuit: ['funchal', 'lisboa', 'bilbao', 'larochelle', 'london', 'bristol', 'bergen'],
    season: 'summer', scope: 'ocean',
    blurb: '하를럼에서 태어나 알제에서 이름을 바꿨다. 여름이면 북극까지 올라가 사람을 실어 온다.',
    lines: { hail: '“북쪽 사람은 값이 좋다. 짐보다 너희가 값이 나가.”' },
  },

  /* ── 비스케이 · 이베리아 서안 ───────────────────────────────
     장 플뢰리. 1522년 아소르스 앞바다에서 코르테스가 카를 5세에게 보낸 아즈텍 보물선을 통째로 낚았다.
     디에프의 장 앙고 밑에서 뛴 노르망디 사략선인데 디에프가 지도에 없어 라로셸에 앉혔다.
     ★ 여름인 이유: 대양에서 돌아오는 배가 여름 끝에 이베리아 서안으로 몰렸다. 사냥감이 그때 온다. */
  {
    id: 'jeanfleury', name: '장 플뢰리', flag: 'france', ship: 'redonda',
    base: 'larochelle', purse: [1200, 4000], strength: 3, bounty: [1100, 2600],
    hunt: ['bilbao|lisboa', 'bilbao|larochelle', 'bilbao|bordeaux', 'funchal|sevilla'],
    circuit: ['larochelle', 'bordeaux', 'bilbao', 'lisboa', 'funchal', 'lisboa', 'bilbao', 'larochelle'],
    season: 'summer', scope: 'region',
    blurb: '대양에서 돌아오는 배만 기다린다. 한 번의 나포로 왕의 금고를 갈아 치운 자다.',
    lines: {
      hail: '“신대륙은 교황이 갈랐다지. 나는 그 유언장을 본 적이 없소.”',
      spare: '“은만 놓고 가시오. 소금은 나도 먹을 만큼 있소.”',
    },
  },

  /* ── 발트 ───────────────────────────────────────────────────
     ★ 식량형제단(비탈리엔브뤼더)은 14세기 말의 무리이고 슈퇴르테베커는 1401년에 처형됐다 —
       게임 시대보다 백 년 앞이다. 그래서 **그 사람이 아니라 그 이름을 자처하는 무리**로 뒀다.
       근거 JSON도 단치히~뤼베크를 두고 "14세기 말 비탈리엔브뤼더 같은 해적이 실재했다"고
       과거형으로 적는다. 전설이 남아 이름값을 하는 쪽이 고증에도 게임에도 맞다.
     ★ season 'summer'는 연출이 아니라 물리다 — 동발트는 겨울에 언다. */
  {
    id: 'vitalienbrueder', name: '식량형제단', flag: 'pirate', ship: 'crayer',
    base: 'stockholm', purse: [400, 1500], strength: 2, bounty: [420, 950],
    hunt: ['danzig|stockholm', 'danzig|riga', 'danzig|lubeck', 'kobenhavn|stockholm'],
    circuit: ['stockholm', 'danzig', 'riga', 'reval', 'stockholm'],
    season: 'summer', scope: 'region',
    blurb: '슈퇴르테베커의 이름을 아직도 판다. 얼음이 풀리는 넉 달만 바다에 있다.',
    lines: { hail: '“신의 벗, 세상의 적. 그 말 들어 봤나?”' },
  },

  /* ── 브리스톨 해협 ──────────────────────────────────────────
     ★ 초반 상대. 킬리그루 가문은 팰머스의 부총독이면서 해적의 뒷배였고,
       1582년에는 안주인이 직접 한자 상선에 올라탔다는 소동이 기록에 남았다.
       배 한 척에 사람 몇이라 낡은 바사로도 붙어 볼 만하다. */
  {
    id: 'killigrew', name: '킬리그루 부인의 배', flag: 'england', ship: 'crayer',
    base: 'bristol', purse: [150, 650], strength: 1, bounty: [200, 450],
    hunt: ['bordeaux|bristol', 'bristol|london', 'bergen|bristol'],
    circuit: ['bristol', 'london', 'larochelle', 'bordeaux', 'bristol'],
    season: null, scope: 'region',
    blurb: '항구의 부총독이 뒷배다. 털고 들어와도 잡아넣을 사람이 그 집 식구다.',
    lines: {
      hail: '“여긴 우리 만이오. 정박료를 안 냈잖소.”',
      spare: '“그 정도면 정박료로 치겠소. 다음엔 미리 내시오.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   **발트해에서 바르바리 코르세어가 나왔다.**
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '던커크 소형 사략선', nation: '던커크', hull: 'brig', tint: 'dark', goods: ['salt', 'grain', 'cloth'] },
  { name: '젤란트 사략선', nation: '젤란트', hull: 'fluyt', tint: 'oak', goods: ['herring', 'timber', 'cloth'] },
  { name: '식량형제단 잔당', nation: '해적', hull: 'carrack', tint: 'dark', goods: ['grain', 'fur', 'wax'] },
  { name: '잉글랜드 사략 선단', nation: '잉글랜드', hull: 'frigate', tint: 'white', goods: ['wine', 'weapon', 'cloth'] },
  { name: '스페인 은함대 호위기함', nation: '스페인', hull: 'galleon', tint: 'green', goods: ['gold', 'weapon', 'wine'] },
];
