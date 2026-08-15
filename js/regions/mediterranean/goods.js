// regions/mediterranean/goods.js — 지중해가 세계에 내놓는 교역품
//
// ★ 교역품 id는 **세계에서 하나뿐**이다. 어느 권역이든 같은 물건이면 같은 id를 쓰고,
//   그 물건을 **처음 정의하는 권역** 한 곳에만 적는다(여기서는 지중해가 원적지다).
//   두 권역이 같은 id를 적으면 `js/regions/index.js`가 경고하고 뒤엣것을 버린다.
//   "우리 권역에서도 난다"는 것은 goods가 아니라 **trade.js의 supply**로 적는 것이다.
//
//   base  기준가. 곡물 20닢이 축이고 나머지는 **사료 비율**로 정한다.
//         고치면 `content/goods-evidence.json`도 같은 커밋에서 — check-prices.mjs가 대조한다.
//   icon  `js/sprites/icons.js`의 아이콘 키. 없으면 그 품목은 화면에서 빈칸이 된다.
//   bulk  한 칸이 차지하는 부피(지금은 전부 1).

export const GOODS = [
  { id: 'grain',    name: '곡물',     base: 20,  icon: 'grain',    bulk: 1 },
  { id: 'salt',     name: '소금',     base: 48,  icon: 'salt',     bulk: 1 },
  { id: 'oliveoil', name: '올리브유', base: 52,  icon: 'oliveoil', bulk: 1 },
  { id: 'wine',     name: '와인',     base: 38,  icon: 'wine',     bulk: 1 },
  { id: 'ceramic',  name: '도자기',   base: 130, icon: 'ceramic',  bulk: 1 },
  { id: 'fur',      name: '모피',     base: 175, icon: 'fur',      bulk: 1 },
  { id: 'glass',    name: '유리세공', base: 190, icon: 'glass',    bulk: 1 },
  { id: 'weapon',   name: '무기',     base: 165, icon: 'weapon',   bulk: 1 },
  { id: 'spice',    name: '향신료',   base: 330, icon: 'spice',    bulk: 1 },
  { id: 'ivory',    name: '상아',     base: 300, icon: 'ivory',    bulk: 1 },
  { id: 'silk',     name: '비단',     base: 420, icon: 'silk',     bulk: 1 },
  { id: 'gold',     name: '금괴',     base: 700, icon: 'gold',     bulk: 1 },

  /* ── 2차 확장분 — **동방으로 싣고 나갈 것**을 만든다 ─────────────────
     여섯 바다가 열리면 향신료·비단의 원가는 동방에 있다는 게 드러난다. 그때 지중해는
     '비싸게 사는 최종 시장'이 되는데, 유럽에서 동방으로 가져갈 물건이 무기·유리세공뿐이면
     **나갈 때 배가 빈다.** 그래서 지중해에서만 나는 것(명반·산호·마스틱·수은)과
     유럽이 실제로 동방에 팔던 것(모직물)을 채웠다.

     base는 전부 **곡물 20닢 대비 사료 비율**로 잡되, 기존 12종과 같은 방식으로
     사료 비율을 그대로 쓰지 않고 **절반쯤 반영**했다(goods-evidence.json의 원칙).
     후추가 밀의 30배지만 게임에선 16.5배인 것과 같은 완화다.
     ★ 아이콘은 icons.js에 새 키가 없어 가장 가까운 것을 빌렸다 —
       무엇을 그려야 하는지는 근거 JSON의 art.iconTodo에 적어 두었다. */

  // 명반 — 모직을 염색하려면 반드시 있어야 하는 매염제라 유럽이 전략물자로 다뤘다.
  // 벌크 광물이라 값은 싸다(밀의 서너 배). 대신 무게로 팔린다.
  { id: 'alum',      name: '명반',   base: 60,  icon: 'salt',     bulk: 1 },
  // 양모 — 카스티야 메리노. 원료라 완제품(모직물)의 절반쯤이다.
  { id: 'wool',      name: '양모',   base: 120, icon: 'fur',      bulk: 1 },
  // 산호 — 지중해에서 인도로 나가던 몇 안 되는 상품. 서쪽에서 나 동쪽에서 팔린다.
  { id: 'coral',     name: '산호',   base: 240, icon: 'ivory',    bulk: 1 },
  // 수은 — 아말감 정련에 필수라 아메리카 은과 직결된다. 주사(진사)를 구워 만든다.
  { id: 'mercury',   name: '수은',   base: 310, icon: 'oliveoil', bulk: 1 },
  // 마스틱 — 키오스 유향나무(Pistacia lentiscus)의 수지. "오스만 치하에서 같은 무게의 금값"이라
  // 마을을 성벽으로 두르고 사다리로만 드나들었다. 비단보다 비싸고 금괴보다 싸게 둔다.
  // ★ 표시 이름을 '유향'에서 '마스틱'으로 고쳤다(2026-08-15, 지중해 감수).
  //   유향(乳香)은 보스웰리아 수지 = 프랑킨센스이고, **중동 권역이 그 이름으로 `incense`를
  //   이미 쓰고 있다**(도파르·하드라마우트산 170닢). 같은 이름의 화물이 값이 다른 채로
  //   창고에 둘 뜨는 상태였다. 우리말 나무 이름이 '유향나무'라 붙은 것이지 같은 물건이 아니다 —
  //   위키백과 Mastic 항목도 "프랑킨센스처럼 향으로 쓸 수 있다"며 둘을 갈라 적는다.
  { id: 'mastic',    name: '마스틱', base: 400, icon: 'spice',    bulk: 1 },

  /* ★ 여기 없는데 지중해 trade.js가 쓰는 두 품목 — `sugar`(설탕 280)와 `woolcloth`(모직물 210)는
     **대서양 권역이 먼저 정의했다.** 같은 물건은 세계에서 한 번만 정의하는 것이 규약이고,
     "우리 바다에서도 난다"는 goods가 아니라 trade.js의 supply로 적는 것이다 —
     시칠리아·키프로스·시리아의 사탕수수와 라구사·살로니카의 모직 공방이 그렇게 들어가 있다.
     설탕은 대서양이 잡은 280이 우리가 잡으려던 값과 같았고, 모직물은 210(우리 계산은 230)이라
     그대로 따랐다. 마데이라·브라질 대농장이 값을 무너뜨리기 전의 값이라는 뜻이다. */
];
