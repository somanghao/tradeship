// regions/atlantic/ships.js — 대서양·북해에서 짓는 배
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
//
// ★ **이 바다의 배가 지중해의 배와 다른 이유**는 물이 다르기 때문이다.
//   북해·발트는 파도가 높고 조수 차가 커서, 배는 건현이 높아야 물을 안 뒤집어쓰고
//   바닥이 평평해야 썰물에 갯벌에 앉혀 짐을 부릴 수 있었다. 그래서 북방은 외판을
//   겹쳐 붙이는 **클링커(shell-first)**로 배를 지었고, 골조를 먼저 세우는 지중해식
//   **카벨(skeleton-first)**과는 만드는 순서부터 달랐다. 1380년 브레멘 코그는 바닥은
//   카벨, 옆구리는 클링커인 **두 전통의 혼혈**이라 그 전환기를 한 척으로 보여 준다.
//   15~16세기에 이베리아 카벨 공법이 북상하면서 비로소 대형 원양선이 가능해졌다 —
//   그 갈림길이 게임에서는 코그·홀크 계보(값싸고 많이 싣는다)와
//   나우·크라벨 계보(무겁고 파도를 견딘다)로 갈라진다.
//
// ★ 한자 배(코그·홀크·크라벨)의 originFlag는 `hanse`다. 한자는 나라가 아니라 도시 동맹이라
//   통일기가 없었지만, 배가 단 적백 깃발이 곧 "이 배는 한자 것"이라는 표시였다.
//   ※ 깃발 배선이 끝났다 — geo.js의 한자 도시(함부르크·뤼베크·단치히·리가·레발)가 `hanse`를
//     달았으므로 이제 그 항구에서 요구 공업력이 1 내려간다. 포르투갈 배(카라벨라 레돈다·나우)도
//     같은 이유로 originFlag가 `spain`에서 `portugal`로 바뀌어 리스본에서 값이 내린다.
//
// ★ 플류트는 이미 지중해 파일에 수입선으로 있다. 여기 다시 정의하지 않는다.
//   대신 그 조상인 홀크를 두어 계보가 보이게 했다(홀크는 플류트보다 한 칸당 값이 비싸다 —
//   플류트가 그것을 밀어낸 이유가 바로 그 차이다).

export const SHIPS = {
  crayer: {
    hull: 'hulk', name: '크라이어', origin: '잉글랜드', originFlag: 'england', tier: 1, era: 'classic',
    yards: ['bristol', 'london', 'amsterdam'],
    price: 900,
    // 항해 성능이 아니라 **선창 용적만** 보고 지은 연안 잡화선이다. 낡은 바사(320)와
    // 코카(1,100) 사이를 메워, 밑천이 얇을 때도 제대로 된 배를 한 척 살 수 있게 했다.
    hp: 58, crew: 8, crewMax: 14, crewMin: 4, cargo: 52, guns: 2, speed: 1.05,
    upkeep: 3, rig: 0.75, tint: 'oak',
    desc: '연안을 도는 작은 잡화선. 볼품은 없지만 값이 싸고 선원이 적게 든다.',
  },
  cog: {
    hull: 'hulk', name: '코그', origin: '한자', originFlag: 'hanse', tier: 1, era: 'classic',
    yards: ['lubeck', 'hamburg', 'danzig', 'kobenhavn'],
    price: 1300,
    // 브레멘 코그(1380)가 23.3×7.6m에 90~130톤. 화물 1칸=밀 2톤이라 84칸≈168톤으로
    // 사료의 큰 쪽에 맞췄다. 선원은 코그의 경험칙 "적재 10톤당 1명"을 그대로 옮겨
    // 16명(168÷10)으로 두었다 — 짐에 비해 사람이 적게 드는 것이 이 배의 값어치다.
    hp: 86, crew: 16, crewMax: 26, crewMin: 7, cargo: 84, guns: 4, speed: 0.90,
    upkeep: 5, rig: 0.85, tint: 'oak',
    desc: '한자의 밑천이 된 상선. 느리고 뭉툭하지만 파도를 견디고 짐을 잘 싣는다.',
  },
  holk: {
    hull: 'fluyt', name: '홀크', origin: '한자', originFlag: 'hanse', tier: 2, era: 'classic', requires: 'cog',
    yards: ['danzig', 'lubeck', 'amsterdam'],
    price: 3000,
    // 14세기에 코그를 밀어낸 후계선. 탈린 앞바다에서 나온 난파선이 24.5×9×4m다.
    // 선수재·선미재 없이 외판을 이물에서 고물까지 휘어 붙인 통짜 선체라
    // 같은 길이에 더 실었다 — 그것이 코그보다 화물칸이 크게 뛰는 이유다.
    hp: 132, crew: 24, crewMax: 36, crewMin: 11, cargo: 155, guns: 7, speed: 0.98,
    upkeep: 12, rig: 0.80, tint: 'oak',
    desc: '코그를 밀어낸 한자의 화물선. 통짜로 휜 선체에 짐이 곱절로 들어간다.',
  },
  redonda: {
    hull: 'caravel', name: '카라벨라 레돈다', origin: '포르투갈', originFlag: 'portugal', tier: 1, era: 'classic',
    yards: ['lisboa', 'sevilla', 'bilbao'],
    price: 1500,
    // 지중해 카라벨(라틴세일뿐, rig 0.00)과 **같은 선체에 돛만 다른 배**다.
    // 라틴 3장에 선수 사각돛 1장을 얹어 순풍 구간의 효율을 얻었고, 그래서 rig가 0.28이다.
    // 150~180 tonéis라는 사료에 맞춰 82칸(≈164톤). 원양으로 나가는 첫 배의 자리다.
    hp: 94, crew: 22, crewMax: 32, crewMin: 11, cargo: 82, guns: 6, speed: 1.30,
    upkeep: 7, rig: 0.28, tint: 'white',
    desc: '라틴세일에 사각돛 하나를 얹은 카라벨. 역풍도 순풍도 무난히 타고 외해로 나간다.',
  },
  whaler: {
    hull: 'carrack', name: '고래잡이 나오', origin: '바스크', originFlag: 'spain', tier: 2, era: 'classic',
    yards: ['bilbao'],
    price: 7400,
    // 1565년 래브라도 레드베이에서 침몰한 산 후안이 본보기다 — 파사이아에서 지은
    // 길이 22m·200~250톤 나오로, 고래기름 1,000배럴을 실은 채 폭풍에 닻줄이 끊겼다.
    // 이 배의 정체성은 화물이 아니라 **사람**이다. 모선 하나에 차루파(7인승 보트) 여럿을
    // 걸고 다녔으므로 화물톤÷최소선원이 5.0으로 상선 기준선(엘리자베스기 조선가
    // 매슈 베이커가 적은 5:1)에 정확히 앉는다 — 코그(12)의 절반도 안 된다.
    // 그 대신 북대서양 겨울을 나려고 지은 선체라 같은 값의 배보다 튼튼하다.
    hp: 215, crew: 58, crewMax: 88, crewMin: 26, cargo: 130, guns: 10, speed: 0.95,
    upkeep: 27, rig: 0.67, tint: 'dark',
    desc: '북대서양 겨울을 나려고 지은 바스크의 배. 사람을 많이 먹지만 어지간해선 부서지지 않는다.',
  },
  nau: {
    hull: 'carrack', name: '나우', origin: '포르투갈', originFlag: 'portugal', tier: 2, era: 'classic',
    yards: ['lisboa', 'sevilla'],
    price: 11000,
    // 인도 항로의 대형 상선. 16세기 표준이 500~600톤이라 260칸(≈520톤)으로 잡았고,
    // 600톤급이 대포 스무 문쯤 달았다는 사료에 맞춰 16문을 얹었다.
    // 돛은 사각 둘에 후미 라틴 하나 — 그 비율이 rig 0.67이다.
    // 높은 건현과 큰 선체가 대서양 너울을 견디게 했고, 그것이 이 배가 대양으로 나간 이유다.
    hp: 200, crew: 50, crewMax: 80, crewMin: 32, cargo: 260, guns: 16, speed: 1.00,
    upkeep: 24, rig: 0.67, tint: 'oak',
    desc: '인도 항로를 오가던 대형 상선. 짐을 많이 싣고 파도를 잘 견딘다.',
  },
  kraweel: {
    hull: 'galleon', name: '대형 크라벨', origin: '단치히', originFlag: 'hanse', tier: 3, era: 'modern', requires: 'holk',
    yards: ['danzig', 'lubeck', 'amsterdam'],
    price: 21000,
    // 한자가 남쪽에서 카벨 공법을 들여와 지은 대형선. 이 계보의 끝이 700톤짜리
    // 뤼베크의 예수호(1544)다. 홀크를 몰아 본 뒤에야 지을 수 있게 한 것은
    // 그 전환이 실제로 기술 전파였기 때문이다 — 배 계보가 곧 해금 트리다.
    hp: 285, crew: 78, crewMax: 125, crewMin: 40, cargo: 240, guns: 22, speed: 1.00,
    upkeep: 46, rig: 0.80, tint: 'dark',
    desc: '한자가 남쪽 공법을 들여와 지은 거선. 상선인데 어지간한 군함만큼 물린다.',
  },
};
