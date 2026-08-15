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
];
