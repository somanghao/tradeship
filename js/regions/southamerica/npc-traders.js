// regions/southamerica/npc-traders.js — 남아메리카의 무역상
//
// 이 바다에서 **저 혼자 장사하는 사람들**이다. 플레이어와 같은 시장을 쓰므로
// 이들이 사고판 것이 시세에 그대로 압력으로 남는다(`js/world.js`).
//
// ── 필드 ────────────────────────────────────────────────────
//   id       세계에서 하나뿐인 키
//   name     화면에 뜨는 이름 (상단·상관·개인 무엇이든)
//   flag     깃발 (sprites/ship.js: FLAGS) — 없으면 그 권역 기본
//   ship     타는 배 (선종 키). 큰 배일수록 한 번에 나르는 양이 많아 시세를 세게 민다
//   purse    [최소,최대] 밑천
//   goods    주로 다루는 품목 id들. 비우면 아무거나 (전문 상단일수록 좁게)
//   scope    'region' = 이 권역 안만 돈다 / 'ocean' = 원양 항로를 넘나든다
//   circuit  **순회로** — 시간이 지나면 이 순서대로 항구를 돈다. 마지막이 첫 항구면 고리가 된다.
//            비우면 그때그때 이문이 남는 쪽으로 간다(기존 방식).
//   season   'summer' | 'winter' | null — 그 철에만 나타나는 상단(계절풍·결빙)
//   rank     1~5. 규모다. 높을수록 밑천도 배도 크고 소문에도 자주 오른다
//   blurb    한 줄 소개
//   lines    { greet, deal, refuse } — 해상에서 만났을 때 한 줄씩(없어도 된다)
//
// ★ **이 바다의 상단은 사슬의 어느 고리에 붙어 있느냐로 갈린다.** 은은 산에서 나서
//   노새·배·노새를 갈아타며 바다로 나가는데, 그 사슬 어느 한 칸이 끊기면 전부가 선다.
//   그래서 여기 상단은 **은을 나르는 배**보다 **은이 나오게 하는 것을 나르는 배**가 더 무겁다
//   (수은·코카·육포·마테 — 광산이 굴러가려면 사람과 짐승이 먹어야 한다).
//
// ★ **명부가 비면 그 바다에는 상선이 한 척도 안 뜬다** — `world.js: makeTrader`가
//   `ALL_TRADERS`에서 뽑기 때문이다. 그러면 `merchant` 조우가 전부 *"멀리 돛 하나가 지나갔다"*로
//   끝나고 나포 여파 충격도 이 바다발로는 안 난다(2026-08-22 실클릭 검증이 잡았다).
//
// 이 바다의 뼈대:
//   · **은의 길** — 포토시에서 아리카로 내려와 카야오에 모이고, 포르토벨로로 넘어간다.
//     한 방향으로만 흐르는 화물이라 순회로가 왕복이 아니라 **한 줄**이 되는 드문 자리다.
//   · **브라질 설탕** — 헤시피·살바도르에서 리스본으로. 루안다에서 남대서양을 가로지르는
//     원양 항로가 이 권역에 닿아 있으니 'ocean' 상단이 여기서 들어온다.
//   · **부에노스아이레스 밀무역** — 은이 세비야를 거치지 않고 라플라타로 새어 나가던 길.
//     왕실이 금지했는데도 굴러가던 장사라, rank는 낮고 goods는 은 하나로 좁히면 성격이 산다.

export const TRADERS = [
  /* ── 은의 길 ──────────────────────────────────────────────
     한 방향으로만 흐른다. 산에서 바다로, 바다에서 지협으로. 되돌아오는 것은 빈 배다. */
  {
    id: 'plataflota', name: '남해 은 수송선', flag: 'spain', ship: 'navio',
    purse: [12000, 30000], goods: ['silver', 'mercury', 'woolcloth', 'wine'],
    scope: 'region', rank: 5, season: null,
    /* 카야오에서 파나마로 올라간다. **내려오기가 올라가기보다 빠르다** — 훔볼트 해류를
       거스르기 때문이다(`OCEAN_LANES panama~callao` 주석). 그래서 이 배의 한 해는
       올라가는 한 번과 내려오는 한 번으로 끝난다. */
    circuit: ['callao', 'arica', 'callao', 'paita', 'callao'],
    blurb: '산에서 내려온 은을 카야오에 모아 지협으로 올려보낸다.',
    lines: {
      greet: '“왕의 은이오. 뱃길을 비켜 주시오.”',
      deal: '“싣는 것은 정해져 있소. 빈자리는 없소.”',
      refuse: '“이 배에 흥정할 짐은 없소.”',
    },
  },
  {
    id: 'azogueros', name: '우앙카벨리카 수은 운반대', flag: 'spain', ship: 'balsa',
    purse: [4000, 12000], goods: ['mercury', 'potato', 'coca', 'grain'],
    scope: 'region', rank: 3, season: null,
    /* ★ **이 사슬의 가장 좁은 고리가 이 배다.** 수은이 없으면 은을 못 뽑는다(아말감법).
       그런데 수은은 산 하나에서만 나서 갈 곳이 없다 — 그래서 이 작은 운반대가 멈추면
       포토시 전체가 선다. 값이 아니라 **끊기느냐**가 이 짐의 성질이다. */
    circuit: ['huancavelica', 'potosi', 'huancavelica', 'lapaz', 'huancavelica'],
    blurb: '수은이 없으면 은을 못 뽑는다. 이 작은 배가 서면 산 하나가 선다.',
    lines: {
      greet: '“수은이오. 조심해 다루시오, 새면 사람이 상하오.”',
      deal: '“이건 값을 부르는 짐이 아니오. 제때 닿느냐가 값이오.”',
    },
  },
  {
    id: 'yerbatero', name: '아순시온 마테 상단', flag: 'portugal', ship: 'sumaca',
    purse: [1800, 5600], goods: ['yerbamate', 'timber', 'hide'],
    scope: 'region', rank: 2, season: null,
    /* 광부가 마테를 마시지 못하면 일을 못 한다 — 그래서 이 잎이 은광의 필수품이 됐다.
       강을 타고 내려와 노새로 산을 오르는, 물길과 뭍길이 반씩인 짐이다. */
    circuit: ['asuncion', 'buenosaires', 'montevideo', 'asuncion'],
    blurb: '광부가 마시지 못하면 일을 못 한다. 그래서 잎사귀가 은광의 필수품이다.',
    lines: {
      greet: '“마테요. 파라과이에서 강을 타고 왔소.”',
      deal: '“포토시까지 가면 값이 세 곱이오. 여기서 파는 건 급해서요.”',
    },
  },
  {
    id: 'charquero', name: '판파의 육포·수지 배', flag: 'spain', ship: 'barcalonga',
    purse: [1400, 4800], goods: ['charqui', 'tallow', 'hide', 'grain'],
    scope: 'region', rank: 2, season: null,
    /* 소가 남아돌아 **가죽만 벗기고 고기를 버리던** 땅이다. 그 고기를 말려 육포로 만들자
       비로소 팔 것이 되었고, 그것이 산 위 광산의 밥이 됐다. 수지는 초가 되어 갱도를 밝힌다. */
    circuit: ['montevideo', 'buenosaires', 'colonia', 'montevideo'],
    blurb: '가죽만 벗기고 버리던 고기를 말렸더니 산 위 광산의 밥이 됐다.',
    lines: {
      greet: '“육포와 수지요. 산으로 올라갈 짐이오.”',
      deal: '“싸게 드리리다. 여긴 소가 사람보다 많소.”',
    },
  },

  /* ── 대서양으로 나가는 배 ────────────────────────────────── */
  {
    id: 'engenho', name: '헤시피 제당 선단', flag: 'portugal', ship: 'caravelao',
    purse: [7000, 18000], goods: ['sugar', 'brazilwood', 'woolcloth', 'wine'],
    scope: 'ocean', rank: 4, season: null,
    /* 이 바다에서 가장 확실한 돈은 은이 아니라 **설탕**이다 — 은은 왕의 것이지만 설탕은
       제당소 주인의 것이기 때문이다. 리스본으로 곧장 건너간다(`lisboa~salvador` 30일). */
    circuit: ['recife', 'salvador', 'ilheus', 'salvador', 'recife'],
    blurb: '은은 왕의 것이고 설탕은 제 것이다. 그래서 이 배가 더 부지런하다.',
    lines: {
      greet: '“설탕이오. 상자째로만 파오.”',
      deal: '“리스본 값을 아시오? 그 값에서 배삯을 빼면 여기 값이오.”',
    },
  },
  {
    id: 'paubrasil', name: '브라질우드 벌목 청부선', flag: 'france', ship: 'caravelao',
    purse: [2600, 8000], goods: ['brazilwood', 'weapon', 'hide'],
    scope: 'region', rank: 3, season: null,
    /* 나라 이름이 이 나무에서 왔다. 붉은 물감이 되는 심재라 유럽이 탐냈고, 포르투갈이
       독점을 선언했는데도 프랑스 배가 해안 곳곳에서 원주민과 직접 거래해 실어 갔다 —
       **독점은 짧게 이기고 길게 진다**는 제5해의 문장이 이 바다에서도 그대로 성립한다. */
    circuit: ['portoseguro', 'ilheus', 'natal', 'portoseguro'],
    blurb: '포르투갈이 독점을 선언한 나무를 프랑스 배가 해안에서 직접 실어 간다.',
    lines: {
      greet: '“나무요. 누구 허락을 받았냐고는 묻지 마시오.”',
      deal: '“도끼와 칼을 주면 저들이 베어 실어 주오.”',
      refuse: '“오늘은 포르투갈 배가 가까이 있소.”',
    },
  },
  {
    id: 'arribadaplata', name: '라플라타 밀무역 상단', flag: 'portugal', ship: 'sumaca',
    purse: [2000, 9000], goods: ['silver'],
    scope: 'region', rank: 2, season: null,
    /* ★ 왕실이 금한 길이다. 포토시의 은이 세비야를 안 거치고 **라플라타로 새어 나갔다** —
       거리가 절반이고 세가 없으니 그럴 수밖에 없었다. 다루는 것이 은 하나뿐인 것이
       이 상단의 성격이다: 다른 것은 실을 이유가 없다. */
    circuit: ['buenosaires', 'colonia', 'buenosaires'],
    blurb: '왕이 금한 길로 은이 샌다. 거리가 절반이고 세가 없으니 그럴 수밖에.',
    lines: {
      greet: '“여기서 만난 적 없는 걸로 합시다.”',
      deal: '“은만 보오. 다른 건 실을 자리가 없소.”',
      refuse: '“오늘은 안 되오. 총독의 배가 강에 있소.”',
    },
  },
  {
    id: 'quinero', name: '과야킬 키나·카카오 배', flag: 'spain', ship: 'balsa',
    purse: [1600, 5200], goods: ['quina', 'cacao', 'timber'],
    scope: 'region', rank: 2, season: null,
    /* 열병을 잡는 나무껍질이다 — 이 해안이 그것을 가진 유일한 곳이라, 뒷날 유럽이
       열대를 드나들 수 있게 된 것도 이 짐 덕이다. 뗏목(발사)으로 나르는 짐치고는 무겁다. */
    circuit: ['guayaquil', 'paita', 'callao', 'guayaquil'],
    blurb: '열병을 잡는 껍질. 뗏목으로 나르지만 실린 것은 가볍지 않다.',
    lines: {
      greet: '“키나요. 열이 오르는 사람에게는 은보다 급하오.”',
      deal: '“카카오도 있소. 이건 마시는 쪽이 값을 더 쳐주오.”',
    },
  },
];
