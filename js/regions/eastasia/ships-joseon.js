// regions/eastasia/ships-joseon.js — 한국(조선)의 배
//
// ★ 왜 나라별로 갈랐나. 동아시아 한 파일에 셋을 담아 두었더니 세 나라를 동시에
//   조사·확장할 때 같은 줄에서 부딪혔다. 권역 폴더가 서로를 import하지 않는 것과 같은
//   이유로, 이 셋도 서로를 모른다 — 합치는 것은 `ships.js` 하나뿐이다.
//
// ★ 쇠못을 안 쓰고 참나무 나무못을 박는다. 물을 먹으면 오히려 조여져 단단해지고, 그래서 오래 간다.
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
// hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜬다. 이 바다의 선형(정크·아타케부네·
// 판옥선)은 아직 없어 가장 가까운 것을 빌려 쓰고, 무엇이 달라야 하는지는 근거 JSON의
// art.hullTodo에 적는다.

export const SHIPS = {
  panokseon: {
    hull: 'frigate', name: '판옥선', origin: '조선', originFlag: 'joseon', tier: 2, era: 'classic',
    yards: ['busanpo'],
    price: 4000,
    // 1555년에 처음 지었다. 길이 스물몇~서른몇 미터에 한쪽 노가 여덟에서 열, 격군과
    // 전투원을 합쳐 백일흔 남짓이 탔고 총통을 스물여섯 문 넘게 실었다. 쇠못을 안 쓰고
    // 참나무 나무못을 박아 물을 먹으면 오히려 조여지는 배다 — 그래서 튼튼하다.
    hp: 175, crew: 90, crewMax: 170, crewMin: 50, cargo: 90, guns: 16, speed: 1.10,
    upkeep: 17, rig: 0.80, tint: 'dark',
    desc: '두 층 갑판에 총통을 늘어세운 조선의 주력 군선. 쇠못 대신 나무못을 박아 물을 먹을수록 단단해진다.',
  },
  geobukseon: {
    hull: 'frigate', name: '거북선', origin: '조선', originFlag: 'joseon', tier: 3, era: 'classic', requires: 'panokseon',
    yards: ['busanpo'],
    price: 9200,
    // 판옥선의 위층 갑판을 널판으로 덮고 그 위에 쇠못과 송곳을 심은 배다. 1415년 태종 때
    // 이미 '귀선(龜船)'이 실록에 보이고, 임진년에는 개전 직전에 석 척이 갖춰졌다.
    // ★ 상선이 아니다. 함대의 맨 앞에서 적진을 뚫는 **돌격선**이라 화물칸을 45로 눌렀다 —
    //   이 바다에서 짐을 가장 못 싣는 배다. 대신 이 값에 이만한 선체는 없다.
    // ★ 포문은 판옥선보다 오히려 적다(좌우 여섯씩에 용두). 판옥선이 총통 스물여섯을
    //   늘어세운 포대라면 이 배의 무기는 뚜껑이다 — 그래서 hp만 크게 올리고 guns는 낮췄다.
    hp: 285, crew: 110, crewMax: 150, crewMin: 70, cargo: 45, guns: 15, speed: 1.06,
    upkeep: 31, rig: 0.75, tint: 'dark',
    desc: '판옥선에 뚜껑을 씌우고 쇠못을 심은 돌격선. 적진 한복판으로 먼저 들어가는 배라 짐은 거의 못 싣는다.',
  },
};
