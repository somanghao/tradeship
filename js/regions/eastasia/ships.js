// regions/eastasia/ships.js — 동아시아에서 짓는 배
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
// ★ 선종 키도 **세계에서 하나뿐**이다.
// ★ hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜬다. 그 권역 고유 선형이 필요하면
//   가장 가까운 기존 hull을 쓰고 근거 JSON의 art.hullTodo에 "어떤 배인지"를 적어 둔다.
// ★ 값은 지중해 선종의 사다리에 맞춘다 — 코카 1,100 / 캐랙 9,800 / 갈레온 19,500이 기준선이다.

export const SHIPS = {
  // nau: {
  //   hull:'carrack', name:'나우', origin:'포르투갈', originFlag:'portugal',
  //   tier:2, era:'classic', yards:['lisboa'], price:11000,
  //   hp:200, crew:50, crewMax:80, crewMin:32, cargo:260, guns:16, speed:1.00,
  //   upkeep:24, rig:0.67, tint:'oak',
  //   desc:'인도 항로를 오가던 대형 상선. 짐을 많이 싣고 파도를 잘 견딘다.',
  // },
};
