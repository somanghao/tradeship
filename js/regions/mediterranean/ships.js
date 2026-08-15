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
    yards: ['venezia', 'istanbul'],
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
};
