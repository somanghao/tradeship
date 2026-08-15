// regions/caribbean/ships.js — 카리브·누에바에스파냐에서 짓는 배
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
// ★ 선종 키도 세계에서 하나뿐이다. hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜬다.
//   `galleon`(갈레온)은 지중해가 이미 정의했으므로 여기서 다시 적지 않는다 —
//   서인도 함대의 주력이 갈레온이라는 사실은 바르셀로나·나폴리 조선소로 이미 표현돼 있다.
//   `canoa`도 아프리카 권역이 먼저 썼다.
//
// ★ 이 바다의 배는 **함대 제도(플로타)를 전제로 갈린다.** 스페인은 1566년부터 상선을
//   혼자 보내지 않고 해마다 두 무리로 묶어 보냈다(누에바에스파냐 함대 → 베라크루스,
//   티에라피르메 갈레온 → 카르타헤나·포르토벨로). 그래서 여기서 나온 배는
//   "혼자서도 살아남는 배"가 아니라 **함대 안에서 맡은 일이 있는 배**다 —
//   앞을 살피는 배(파타체), 짐만 싣는 배(우르카), 대열을 안 기다리고 은만 들고 튀는 배(갈리사브라).
//   피라구아만이 그 바깥에 있다. 아메리카가 이미 쓰고 있던 배이기 때문이다.

export const SHIPS = {
  piragua: {
    hull: 'caravel', name: '피라구아', origin: '카리브 원주민', originFlag: null, tier: 1, era: 'classic',
    yards: ['campeche', 'jamaica', 'trujillo', 'maracaibo'],
    price: 1200,
    hp: 68, crew: 14, crewMax: 24, crewMin: 7, cargo: 82, guns: 2, speed: 1.30,
    upkeep: 4, rig: 0.15, tint: 'oak',
    // 통나무를 파낸 카누에 뱃전 판을 덧대고 돛 한두 장을 올린 배. 유럽이 가져온 것이 아니라
    // 이 바다가 이미 쓰던 것을 유럽인이 그대로 물려받았다 — 뷰캐니어의 첫 배도 이것이었다.
    // 얕은 물과 강어귀로 들어가고, 바람이 죽으면 노를 젓는다. 대신 파도를 못 견딘다.
    desc: '통나무를 파고 뱃전을 덧댄 배. 얕은 물과 강어귀로 들어가고 바람이 죽으면 노를 젓는다. 외해에 나가면 곧 후회한다.',
  },
  patache: {
    hull: 'brig', name: '파타체', origin: '스페인', originFlag: 'spain', tier: 1, era: 'classic',
    yards: ['havana', 'cartagena', 'campeche'],
    price: 2400,
    // 화물톤/승조원 1인이 7.9로 낮다 — 짐배가 아니라 **함대의 눈**이기 때문이다.
    // 앞서 나가 해안과 항구를 살피고, 급보를 싣고(파타체 데 아비소) 먼저 달린다.
    hp: 105, crew: 22, crewMax: 34, crewMin: 12, cargo: 95, guns: 8, speed: 1.35,
    upkeep: 9, rig: 0.50, tint: 'dark',
    desc: '흘수가 얕고 발이 빠른 두대박이. 함대보다 앞서 나가 해안을 살피고 급보를 나른다. 짐은 많이 못 싣는다.',
  },
  urca: {
    hull: 'fluyt', name: '우르카', origin: '스페인(북방 수입선)', originFlag: 'spain', tier: 2, era: 'classic', requires: 'patache',
    yards: ['havana', 'campeche'],
    price: 10500,
    // crewMin 16 → 화물톤/승조원 15.6. 코카(13.0)와 플류트(18.9) 사이다.
    // 우르카는 북방(한자·네덜란드)의 둥근 짐배를 스페인이 사다 쓴 것이라 사람은 적게 먹고
    // 짐은 많이 싣지만, 함대 안에서 남의 보호를 받는 배라 포문이 빈약하다.
    hp: 175, crew: 36, crewMax: 58, crewMin: 16, cargo: 250, guns: 8, speed: 0.88,
    upkeep: 20, rig: 0.75, tint: 'oak',
    desc: '함대의 짐칸. 배 한 척이 다른 세 척 몫을 싣는다. 대신 느리고 포가 없어 혼자 다니면 남의 밥이다.',
  },
  galizabra: {
    hull: 'frigate', name: '갈리사브라', origin: '스페인', originFlag: 'spain', tier: 3, era: 'modern', requires: 'urca',
    yards: ['havana', 'cartagena'],
    price: 13000,
    // 1590년대에 스페인이 실제로 쓴 방법이다 — 함대가 늦어 은이 묶이면 작고 빠르고
    // 무장한 배 몇 척에 은만 실어 대열을 기다리지 않고 먼저 보냈다.
    // 그래서 값은 대형 상선급인데 화물칸은 중형선만 하다. 그 불균형이 이 배의 정체성이다.
    hp: 190, crew: 55, crewMax: 88, crewMin: 34, cargo: 105, guns: 20, speed: 1.42,
    upkeep: 30, rig: 0.85, tint: 'dark',
    desc: '함대를 기다리지 않고 은만 싣고 먼저 뜨는 배. 빠르고 사납지만 화물칸이 값에 비해 좁다.',
  },
};
