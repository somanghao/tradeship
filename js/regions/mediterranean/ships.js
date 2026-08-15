// regions/mediterranean/ships.js — 지중해에서 짓는 배
//
// ★ 선종 키도 **세계에서 하나뿐**이다. 그 배가 나온 권역의 파일에만 적는다.
//   `originFlag`를 단 항구는 요구등급이 1 낮다("제 나라 배는 짓기 쉽다").
//
//   origin      어느 나라에서 나온 배인가(표시용).
//   originFlag  그 나라 깃발(geo.js: flag). 본국이 이 권역에 없는 배는 null.
//   tier        지으려면 필요한 도시 공업력(geo.js: industry). 0이면 시중에 안 나온다.
//   yards       **전통 조선지** — 살 수 있는 곳이 아니라 값이 싸지는 곳이다.
//   era         'classic' = 이 바다에서 오래 쓰던 배 / 'modern' = 시대를 앞선 배(requires 필요).
//   requires    이 선종을 **한 번이라도 몰아 봤어야** 다음 배를 짓는다 — 배 계보가 곧 해금 트리다.
//   rig         스퀘어리그 비율(0=라틴세일뿐 … 1=전부 가로돛). 순풍/역풍 성능을 가른다.
//               그림의 돛(`sprites/ship.js: HULLS[].masts[].sail`)과 **같이 고쳐야 한다**.
//   crewMin     돛과 키를 다루는 데 필요한 최소 인원. 미달이면 제 속력을 못 낸다.
//   upkeep      정박해 두기만 해도 나가는 하루 유지비.

export const SHIPS = {
  hulk: {
    hull: 'hulk', name: '낡은 바사', origin: '출처 불명', originFlag: null, tier: 0, era: 'classic', yards: [], price: 320,
    hp: 55, crew: 10, crewMax: 16, crewMin: 5, cargo: 45, guns: 2, speed: 0.85,
    upkeep: 2, rig: 0.50, leak: 2, tint: 'rot',
    desc: '물이 새는 중고선. 항해할 때마다 선체가 삭는다. 오래 탈 배가 아니다.',
  },
  cocca: {
    hull: 'hulk', name: '코카', origin: '지중해', originFlag: null, tier: 1, era: 'classic',
    yards: ['venezia', 'genova', 'napoli', 'palermo', 'athens'],
    price: 1100,
    hp: 72, crew: 12, crewMax: 22, crewMin: 6, cargo: 78, guns: 3, speed: 0.95,
    upkeep: 4, rig: 0.50, tint: 'oak',
    desc: '중세부터 지중해를 메운 원형 상선. 느리고 볼품없지만 값싸고 제법 싣는다. 첫 배를 갈아탈 자리.',
  },
  galley: {
    hull: 'galley', name: '갤리', origin: '지중해', originFlag: null, tier: 1, era: 'classic',
    yards: ['venezia', 'istanbul', 'barcelona', 'palermo'],
    price: 2100,
    hp: 105, crew: 58, crewMax: 96, crewMin: 36, cargo: 58, guns: 5, speed: 1.45,
    upkeep: 11, rig: 0.00, tint: 'oak',
    desc: '노와 라틴세일. 바람이 죽어도 나아가고 좁은 물목에서 빠르지만, 사람을 많이 먹고 짐은 적게 싣는다.',
  },
  caravel: {
    hull: 'caravel', name: '카라벨', origin: '스페인(아라곤)', originFlag: 'spain', tier: 1, era: 'classic',
    yards: ['barcelona', 'palermo', 'napoli'],
    price: 1400,
    hp: 90, crew: 24, crewMax: 34, crewMin: 12, cargo: 90, guns: 6, speed: 1.35,
    upkeep: 6, rig: 0.00, tint: 'oak',
    desc: '작고 날렵하다. 화물칸은 좁지만 바람을 잘 탄다.',
  },
  fluyt: {
    hull: 'fluyt', name: '플류트', origin: '네덜란드(수입선)', originFlag: null, tier: 2, era: 'modern', requires: 'carrack',
    yards: ['genova', 'marseille'],
    price: 2600,
    // crewMin 14→9: 플류트의 역사적 정체성이 바로 이 숫자다. 화물톤/승조원 1인이
    // 사료로 20 안팎(코카 10·갤리 1.2)인데 14명이면 12.1이 되어 **코카(13.0)와 사실상 같아진다**.
    // 9명이면 18.9로 밴드에 들고, "적은 선원으로 많이 싣는 배"가 비용에서 실제로 드러난다.
    // → .claude/docs/wiki/research-voyage-returns.md §3-1
    hp: 120, crew: 20, crewMax: 30, crewMin: 9, cargo: 170, guns: 6, speed: 1.10,
    upkeep: 10, rig: 0.67, tint: 'oak',
    desc: '화물선의 정석. 이만한 짐을 이만큼 적은 선원으로 나르는 배는 없다. 대신 포문이 빈약하다.',
  },
  brig: {
    hull: 'brig', name: '브리간틴', origin: '지중해', originFlag: null, tier: 1, era: 'classic',
    yards: ['marseille', 'palermo', 'rodos'],
    price: 4200,
    hp: 130, crew: 34, crewMax: 52, crewMin: 20, cargo: 140, guns: 10, speed: 1.20,
    upkeep: 14, rig: 0.50, tint: 'dark',
    desc: '균형 잡힌 중형선. 무역과 전투 어느 쪽도 무난하다.',
  },
  carrack: {
    hull: 'carrack', name: '캐랙', origin: '제노바', originFlag: 'genoa', tier: 2, era: 'classic',
    yards: ['genova', 'venezia'],
    price: 9800,
    hp: 190, crew: 48, crewMax: 76, crewMin: 30, cargo: 240, guns: 14, speed: 0.95,
    upkeep: 22, rig: 0.67, tint: 'white',
    desc: '거대한 화물칸. 느리지만 한 번에 많이 싣는다.',
  },
  frigate: {
    hull: 'frigate', name: '갈레아스', origin: '베네치아', originFlag: 'venice', tier: 3, era: 'classic', requires: 'galley',
    yards: ['venezia', 'genova'],
    price: 14000,
    hp: 210, crew: 50, crewMax: 90, crewMin: 45, cargo: 110, guns: 18, speed: 1.40,
    upkeep: 30, rig: 1.00, tint: 'dark',
    desc: '작정하고 만든 프리깃 킬러. 빠르고 사납지만 화물칸이 좁고 선원을 많이 먹는다.',
  },
  galleon: {
    hull: 'galleon', name: '갈레온', origin: '스페인', originFlag: 'spain', tier: 3, era: 'classic', requires: 'carrack',
    yards: ['barcelona', 'napoli'],
    price: 19500,
    hp: 260, crew: 62, crewMax: 100, crewMin: 46, cargo: 200, guns: 24, speed: 1.05,
    upkeep: 40, rig: 0.67, tint: 'green',
    desc: '떠다니는 요새. 포문 스물넷이 현측을 메운다.',
  },
  indiaman: {
    hull: 'indiaman', name: '라구사 아르고시', origin: '라구사', originFlag: null, tier: 3, era: 'modern', requires: 'carrack',
    // ★ 'ragusa'를 앞에 붙인 것이 이 확장에서 기존 선종에 손댄 **유일한 자리**다.
    //   본국 라구사가 지도에 없어 전통 조선지에서 빠져 있었다 — 도시가 생겼으니 제자리를 준다.
    //   originFlag는 그대로 null로 둔다(라구사 깃발이 FLAGS에 없어 오스만을 빌려 쓰고 있는데,
    //   그것을 원산국 깃발로 삼으면 이스탄불까지 요구등급이 내려간다).
    yards: ['ragusa', 'venezia', 'istanbul'],
    price: 26000,
    hp: 240, crew: 70, crewMax: 110, crewMin: 40, cargo: 320, guns: 20, speed: 1.00,
    upkeep: 46, rig: 0.75, tint: 'white',
    desc: '동인도 항로의 대형 상선. 상선인데도 어지간한 군함만큼 물린다.',
  },
  superfrigate: {
    hull: 'superfrigate', name: '대형 갈레온', origin: '스페인', originFlag: 'spain', tier: 3, era: 'modern', requires: 'galleon',
    yards: ['barcelona', 'marseille'],
    price: 42000,
    hp: 330, crew: 90, crewMax: 150, crewMin: 70, cargo: 150, guns: 30, speed: 1.30,
    upkeep: 70, rig: 1.00, tint: 'dark',
    desc: '전열함의 화력에 프리깃의 발을 달았다. 유지비가 무겁다.',
  },

  /* ── 2차 확장분 — **사다리의 빈 칸을 메운다** ──────────────────────
     열한 척으로는 값 사다리에 구멍이 컸다. 낡은 바사(320)에서 코카(1,100)로 건너뛰고,
     카라벨(1,400)과 갤리(2,100) 사이가 비고, 브리간틴(4,200)에서 캐랙(9,800)까지가
     통째로 비어 있었다 — 중반에 갈아탈 배가 없어 돈만 모으는 구간이 생긴다.
     ★ 화물칸÷crewMin이 사료 밴드(갤리 1.6 · 코카 13 · 플류트 18.9)에 들어가는지
       한 척씩 검산했다. 이 값이 그 배의 정체성이고 임금 부담으로 곧장 드러난다. */

  tartane: {
    hull: 'caravel', name: '타르타네', origin: '프로방스', originFlag: 'france', tier: 1, era: 'classic',
    yards: ['marseille', 'napoli', 'messina'],
    // 320 → 1,100 사이가 비어 있었다. 정직한 타르타네는 30~60톤짜리 연안선이라
    // 1,400~2,100 칸에 넣을 수 있는 배가 아니다 — 아래쪽 빈 칸을 메우는 데 쓴다.
    price: 700,
    hp: 60, crew: 7, crewMax: 12, crewMin: 4, cargo: 44, guns: 2, speed: 1.20,
    upkeep: 3, rig: 0.15, tint: 'oak',
    // 44÷4 = 11 — 코카(13)와 같은 결의 '적은 손으로 나르는 배'다.
    desc: '라틴세일 한 장으로 연안을 훑는 작은 배. 네 사람이면 몬다. 파도가 서면 항구에 붙어 있어야 한다.',
  },
  galliot: {
    hull: 'galley', name: '갈리오트', origin: '바르바리 해안', originFlag: null, tier: 1, era: 'classic',
    // 바르바리의 배지만 알제·튀니스는 자체 건조가 약하다. 나포선을 뜯어 고쳐 쓰던
    // 항구들이라 그곳을 전통 조선지로 두되 originFlag는 달지 않는다.
    yards: ['algiers', 'tunis', 'malta'],
    price: 1900,
    hp: 88, crew: 44, crewMax: 72, crewMin: 26, cargo: 40, guns: 5, speed: 1.52,
    upkeep: 9, rig: 0.00, tint: 'dark',
    // 노 열여섯 쌍에 50~150명. 40÷26 = 1.5로 갤리(1.6)와 같은 자리에 선다 —
    // 갤리보다 싸고 빠른 대신 더 작다.
    desc: '노 열여섯 쌍의 작은 갤리. 바르바로사가 교황의 배를 뺏을 때 탔던 물건이다. 빠르지만 짐은 거의 못 싣는다.',
  },
  xebec: {
    hull: 'caravel', name: '샤벡', origin: '바르바리 해안', originFlag: null, tier: 2, era: 'classic',
    yards: ['algiers', 'tunis', 'malaga'],
    price: 5200,
    hp: 150, crew: 46, crewMax: 78, crewMin: 24, cargo: 96, guns: 14, speed: 1.42,
    upkeep: 18, rig: 0.10, tint: 'dark',
    // 사료 100~200톤 · 대포 3~40문(대개 20~30) · 사략 승조원 90~400.
    // 게임의 압축된 눈금에 맞춰 중간값을 취했다. 96÷24 = 4.0 — 화물선과 군함 사이.
    desc: '바닥이 좁고 뱃전이 넓다. 라틴세일 세 장으로 바람을 훔쳐 달아나는 바르바리 사략선의 대명사.',
  },
  caramusal: {
    hull: 'carrack', name: '카라무살', origin: '오스만', originFlag: 'ottoman', tier: 2, era: 'classic',
    yards: ['istanbul', 'salonika'],
    price: 7200,
    hp: 175, crew: 26, crewMax: 44, crewMin: 15, cargo: 200, guns: 6, speed: 0.90,
    upkeep: 16, rig: 0.55, tint: 'oak',
    // 200÷15 = 13.3 — 코카와 같은 '짐만 싣는 배'의 자리다. 캐랙(9,800/240)보다
    // 한 칸 아래에서 같은 일을 한다. 대신 포문이 여섯뿐이라 혼자 다니면 먹힌다.
    desc: '고물이 높이 솟은 오스만 상선. 느리고 무장이 없다시피 하지만 짐칸이 넓고 사람을 적게 먹는다.',
  },
  greatgalley: {
    hull: 'galley', name: '상용 대갤리', origin: '베네치아', originFlag: 'venice', tier: 2, era: 'classic', requires: 'galley',
    yards: ['venezia', 'ragusa'],
    price: 8600,
    hp: 175, crew: 78, crewMax: 128, crewMin: 58, cargo: 108, guns: 12, speed: 1.32,
    upkeep: 34, rig: 0.00, tint: 'white',
    // 사료: 길이 46m · 화물 140~250톤 · 승조원 150~180명이고 **전원이 병력을 겸했다.**
    // 그래서 향신료·비단 같은 값나가는 화물을 이 배로 날랐다. 108÷58 = 1.9로
    // 갤리 계열의 자리를 지키되, 사람값이 무거워 싼 화물을 실으면 손해가 난다.
    desc: '국가가 몰던 무역 갤리. 노잡이가 곧 병력이라 값나가는 짐을 실어도 사략선이 쉽게 덤비지 못한다. 대신 사람값이 배를 잡아먹는다.',
  },
};
