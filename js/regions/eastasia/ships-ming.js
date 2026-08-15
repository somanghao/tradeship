// regions/eastasia/ships-ming.js — 중국(명)의 배
//
// ★ 왜 나라별로 갈랐나. 동아시아 한 파일에 셋을 담아 두었더니 세 나라를 동시에
//   조사·확장할 때 같은 줄에서 부딪혔다. 권역 폴더가 서로를 import하지 않는 것과 같은
//   이유로, 이 셋도 서로를 모른다 — 합치는 것은 `ships.js` 하나뿐이다.
//
// ★ 강·개펄·외해가 한 나라 안에 다 있어 배가 그만큼 갈린다 — 사선(강남 평저선)과 복선(복건 첨저선)이 그 양끝이다.
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
// hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜬다. 이 바다의 선형(정크·아타케부네·
// 판옥선)은 아직 없어 가장 가까운 것을 빌려 쓰고, 무엇이 달라야 하는지는 근거 JSON의
// art.hullTodo에 적는다.

export const SHIPS = {
  sachuan: {
    hull: 'hulk', name: '사선', origin: '명(강남)', originFlag: 'ming', tier: 1, era: 'classic',
    yards: ['ningbo', 'shuangyu', 'yuegang'],
    price: 1300,
    // 밑이 평평해 개펄에 얹혀도 넘어지지 않는다 — 강어귀와 모래톱이 많은 중국 연안에서
    // 그것이 곧 안전이었다. 대신 용골이 없어 외해에서 옆으로 밀린다.
    hp: 76, crew: 11, crewMax: 18, crewMin: 5, cargo: 80, guns: 2, speed: 1.00,
    upkeep: 4, rig: 0.15, tint: 'oak',
    desc: '밑이 평평한 연안 정크. 개펄에 얹혀도 넘어지지 않아 강어귀를 마음대로 드나든다. 외해로 나가면 옆으로 밀린다.',
  },
  fuchuan: {
    hull: 'carrack', name: '복선', origin: '명(복건)', originFlag: 'ming', tier: 2, era: 'classic',
    yards: ['quanzhou', 'fuzhou', 'guangzhou'],
    price: 10500,
    // 유럽인이 소마(soma)라 부르던 원양 정크다. 400~500톤급이 남중국해를 상시로 오갔고,
    // 1613~1640년에만도 해마다 예순에서 여든 척이 일본에 닿았다. 깊은 V자 용골로
    // 외해를 견디고 격벽으로 칸을 나눠 한 칸이 새도 가라앉지 않는다.
    // 화물 235칸(≈470톤)을 스물몇으로 굴린다 — 칸/선원 비가 유럽 화물선(플류트 18.9)에
    // 맞먹는 16.8이다. 정크가 사람을 적게 먹는다는 것이 이 숫자다.
    hp: 185, crew: 30, crewMax: 60, crewMin: 14, cargo: 235, guns: 10, speed: 1.00,
    upkeep: 21, rig: 0.15, tint: 'white',
    desc: '남중국해를 오가던 원양 정크. 격벽으로 칸을 나눠 한 칸이 새도 뜨고, 이만한 짐을 이만큼 적은 사람으로 나른다.',
  },
};
