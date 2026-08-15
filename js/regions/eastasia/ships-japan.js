// regions/eastasia/ships-japan.js — 일본의 배
//
// ★ 왜 나라별로 갈랐나. 동아시아 한 파일에 셋을 담아 두었더니 세 나라를 동시에
//   조사·확장할 때 같은 줄에서 부딪혔다. 권역 폴더가 서로를 import하지 않는 것과 같은
//   이유로, 이 셋도 서로를 모른다 — 합치는 것은 `ships.js` 하나뿐이다.
//
// ★ 노가 주력이고 돛은 네모 한 장이라 맞바람에 약하다. 대신 좁은 물목에서 빠르고 배를 붙여 뛰어드는 싸움에 맞다.
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
// hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜬다. 이 바다의 선형(정크·아타케부네·
// 판옥선)은 아직 없어 가장 가까운 것을 빌려 쓰고, 무엇이 달라야 하는지는 근거 JSON의
// art.hullTodo에 적는다.

export const SHIPS = {
  sekibune: {
    hull: 'galley', name: '세키부네', origin: '일본', originFlag: 'japan', tier: 1, era: 'classic',
    yards: ['hakata', 'hirado', 'bonotsu'],
    price: 2300,
    // 노가 주력이고 돛은 네모 한 장이라 맞바람에 거의 못 간다. 대신 좁은 물목에서 빠르고
    // 배를 붙여 뛰어드는 싸움에 맞다 — 왜구가 이 배로 연안을 쳤다.
    hp: 100, crew: 40, crewMax: 70, crewMin: 28, cargo: 60, guns: 4, speed: 1.42,
    upkeep: 11, rig: 0.85, tint: 'dark',
    desc: '노로 가는 일본의 중형 군선. 좁은 물목에서 빠르고 배를 붙여 뛰어드는 싸움에 맞다. 맞바람에는 거의 못 간다.',
  },
  atakebune: {
    hull: 'galleon', name: '아타케부네', origin: '일본', originFlag: 'japan', tier: 3, era: 'classic', requires: 'sekibune',
    yards: ['sakai', 'hakata'],
    price: 19500,
    // 세키부네를 키워 널판으로 통째로 싸 버린 배. 떠다니는 성이라 튼튼하고 무섭지만
    // 노와 네모돛 한 장으로 그 덩치를 미는 것이라 발이 느리다. 1578년 구키 요시타카가
    // 여기에 쇠판까지 둘렀다는 철갑선이 이 계열이다.
    hp: 300, crew: 100, crewMax: 200, crewMin: 60, cargo: 150, guns: 22, speed: 0.92,
    upkeep: 44, rig: 1.00, tint: 'dark',
    desc: '널판으로 통째로 싸 버린 일본의 떠다니는 성. 화살도 총알도 튕겨 내지만, 그 덩치를 노와 돛 한 장으로 민다.',
  },
  shuinsen: {
    hull: 'indiaman', name: '주인선', origin: '일본', originFlag: 'japan', tier: 3, era: 'modern', requires: 'fuchuan',
    yards: ['nagasaki', 'sakai', 'naha'],
    price: 26000,
    // 막부의 붉은 도장(朱印狀)을 받은 배만 바다로 나갈 수 있었다. 1604~1635년에 350척이
    // 넘게 나갔고 평균 승선 인원이 236명이었다. 선체는 정크, 고물은 유럽식, 돛은 정크세일과
    // 네모돛을 섞어 단 **혼혈선**이라 rig가 한가운데(0.45)다. 화물칸은 이 바다에서 가장 크지만
    // 포문은 여섯에서 여덟뿐이었다 — 싸우러 나가는 배가 아니라 짐을 나르는 배다.
    hp: 235, crew: 80, crewMax: 236, crewMin: 24, cargo: 300, guns: 8, speed: 1.05,
    upkeep: 46, rig: 0.45, tint: 'white',
    desc: '막부의 붉은 도장을 받아야 뜨는 배. 정크 선체에 유럽식 고물을 얹은 혼혈선이라 짐은 산더미인데 포문은 여덟뿐이다.',
  },
};
