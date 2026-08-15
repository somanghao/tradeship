// regions/eastasia/trade.js — 동아시아의 경제
//
// supply = 산지라 싸다(배율<1) / demand = 수요지라 비싸다(배율>1).
// 본보기는 `js/regions/mediterranean/trade.js`.
//
// ★ 품목마다 **산지와 수요지가 둘 다 있어야** 죽지 않는다.
//   산지만 있고 수요가 0이면 중립가로만 팔리고, 수요만 있고 산지가 0이면 그 칸은 아예 죽는다.
// ★ 배율 폭은 대략 supply 0.44~0.78 / demand 1.18~1.46이다. 이 밖으로 나가면
//   `data.js: SPREAD`가 눌러도 차익이 튀어 경제가 그 항구로 쏠린다.

export const TRADE = {
  // lisboa: {
  //   // 왜 이 값인지를 한두 줄로 — 근거 JSON의 basis와 같은 이야기를 짧게
  //   supply: { salt:0.52 },
  //   demand: { spice:1.30, grain:1.22 },
  //   blurb: '테주 강어귀의 왕도. 대양으로 나가는 배가 여기서 짐을 싣는다.',
  // },
};

/** 입항세 오버라이드 — 관세가 그 도시 성격의 일부인 곳만 적는다(없으면 규모별 기본율). */
export const TARIFF_OVERRIDE = {
  // lisboa: 0.05,
};
