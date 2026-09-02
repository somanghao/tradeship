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
  /* ★ 이 바다의 시작배(tier 0) — 지중해 `hulk`와 같은 자리. 제원은 그것에 맞춘다. */
  oldpiragua: {
    hull: 'caravel', name: '삭은 피라구아', origin: '섬의 헌 배', originFlag: null, tier: 0,
    era: 'classic', yards: [], price: 300,
    hp: 50, crew: 8, crewMax: 15, crewMin: 5, cargo: 45, guns: 1, speed: 0.87,
    upkeep: 2, rig: 0.35, leak: 2, tint: 'rot',
    desc: '사략선이 버리고 간 피라구아. 총구멍을 나무못으로 막아 두었다.',
  },
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

  /* ══ 회차 28 · 콘텐츠 확장 ═══════════════════════════════════════
     ★ **이 바다가 아홉 중 가장 얇았다** — 선종이 넷뿐이라 조선소에 갈 이유가 거의 없었다.
       넷을 더해 여덟으로 만든다. 값은 이 바다의 사다리(피라구아 1,200 ~ 갈리사브라 13,000)
       안에서만 움직이고 **가장 싼 자리는 안 건드린다** — 시작 언저리를 흔들지 않으려는 것이다.
     근거는 `content/regions/caribbean-evidence.json`의 `ships` 절에 같이 넣었다. */

  perlera: {
    hull: 'caravel', name: '진주잡이 카노아', origin: '쿠바과·마르가리타', originFlag: 'spain',
    tier: 1, era: 'classic', yards: ['maracaibo', 'trujillo', 'jamaica'], price: 1250,
    // 1520~40년대 베네수엘라 앞바다 진주 어장의 배. 잠수부 스물을 싣고 하루를 나가는 배라
    // 짐칸보다 갑판이 넓고 발이 빠르다 — 피라구아보다 비싸고 덜 싣지만 더 빠르고 포가 있다.
    hp: 74, crew: 12, crewMax: 20, crewMin: 7, cargo: 58, guns: 3, speed: 1.34,
    upkeep: 4, rig: 0.10, tint: 'oak',
    desc: '진주 어장으로 잠수부를 실어 나르던 배. 짐칸은 좁아도 발이 빠르고 갑판에 소포 셋을 걸었다.',
  },
  aviso: {
    hull: 'caravel', name: '아비소', origin: '아바나(급보선)', originFlag: 'spain',
    tier: 2, era: 'classic', yards: ['havana', 'cartagena'], price: 3800,
    // 플로타의 출항일과 은의 양을 세비야에 먼저 알리던 급보선. 짐이 아니라 **소식**을 나른다.
    // 그래서 이 바다에서 가장 빠르되 화물/최소선원이 7.0뿐이다.
    hp: 108, crew: 20, crewMax: 32, crewMin: 12, cargo: 84, guns: 6, speed: 1.46,
    upkeep: 12, rig: 0.55, tint: 'white',
    desc: '선단보다 먼저 떠나 소식을 먼저 옮기던 배. 이 바다에서 가장 빠르지만 짐칸이 좁다.',
  },
  fragata: {
    hull: 'brig', name: '프라가타', origin: '스페인령 본토 연안', originFlag: null,
    tier: 2, era: 'classic', yards: ['cartagena', 'campeche'], price: 5400,
    // ★ 16세기의 '프라가타'는 뒷날의 프리깃이 아니다 — 노와 돛을 함께 쓰는 작고 빠른 배이고,
    //   프랑스·잉글랜드 사략선이 스페인령 연안 마을을 덮칠 때 쓴 것이 이 배다.
    //   그래서 포는 많고 짐칸은 좁다(화물/최소선원 5.9 — 싸우려고 만든 배).
    hp: 138, crew: 26, crewMax: 42, crewMin: 15, cargo: 88, guns: 14, speed: 1.40,
    upkeep: 20, rig: 0.40, tint: 'dark',
    desc: '노와 돛을 함께 쓰는 사략선. 얕은 만으로 들어와 마을을 털고 바람이 서기 전에 빠져나간다.',
  },
  galeondelaplata: {
    hull: 'galleon', name: '은선단 갈레온', origin: '아바나(왕실 조선소)', originFlag: 'spain',
    tier: 3, era: 'classic', yards: ['havana'], price: 23000, requires: 'urca',
    // 아바나에서 쿠바 목재로 지어 플로타의 호위 겸 은 운반을 맡던 배. 이 바다의 꼭대기다.
    // ★ 우르카를 몰아 본 사람에게만 열린다 — 큰 배를 다뤄 본 뒤에야 왕실 조선소가 이름을 적는다.
    hp: 280, crew: 60, crewMax: 95, crewMin: 34, cargo: 265, guns: 26, speed: 0.98,
    upkeep: 46, rig: 0.70, tint: 'white',
    desc: '아바나의 왕실 조선소가 쿠바 목재로 지은 배. 은을 싣고 대서양을 건너라고 만든 것이라 짐칸과 포갑판이 함께 크다.',
  },

  /* ══ 회차 29 · 콘텐츠 확장 ═══════════════════════════════════════
     ★ 여덟 종에서 열한 종으로. **어느 칸의 「가장 싼 배」 자리도 안 건드린다** — 셋 다
       그 자리 위에 놓았다(피라구아 1,200 밑으로 내려가는 배가 없다). 값은 이 바다의
       사다리 사이 빈 계단에만 놓았다. 근거는 `content/regions/caribbean-evidence.json`. */

  balandra: {
    hull: 'caravel', name: '발란드라', origin: '스페인령 카리브(연안 다용도선)', originFlag: 'spain',
    tier: 1, era: 'classic', yards: ['campeche', 'veracruz', 'maracaibo'], price: 1450,
    // 스페인령 카리브의 식민지 항해 기록에 가장 자주 나오는 이름 중 하나다. 돛대 하나에
    // 화물칸과 포 몇 문을 함께 두어, 짐도 나르고 작은 마을을 습격하는 데도 쓰였다 —
    // 특정 용도로 못박기 어려운 "무엇이든 하는 배"였던 것이 곧 이 배의 정체성이다.
    hp: 70, crew: 10, crewMax: 18, crewMin: 6, cargo: 65, guns: 2, speed: 1.20,
    upkeep: 5, rig: 0.15, tint: 'oak',
    desc: '스페인령 카리브 어디서나 보이던 외대박이 다용도선. 짐도 나르고 작은 포 몇 문으로 연안 마을도 넘본다.',
  },
  sloop: {
    hull: 'brig', name: '자메이카 슬루프', origin: '자메이카(영국계 조선)', originFlag: 'england',
    tier: 2, era: 'classic', yards: ['stkitts', 'barbados', 'tortuga'], price: 4600,
    // ★ 이 게임의 자메이카는 아직 스페인령(1655년 전)이라 정작 그 이름을 못 쓴다 — 그래서
    //   조선지는 이 바다에서 실제로 영국 깃발을 단 두 항구(세인트키츠·바베이도스)와
    //   해안형제단의 토르투가로 돌렸다. 1670년대 자메이카에서 다듬어진 외대박이 쾌속선으로,
    //   흘수가 얕아(8피트) 얕은 물로 숨고 20~70명을 태워 상선을 앞지른다.
    hp: 100, crew: 14, crewMax: 50, crewMin: 10, cargo: 70, guns: 12, speed: 1.55,
    upkeep: 15, rig: 0.20, tint: 'dark',
    desc: '외대박이 쾌속선. 흘수가 얕아 얕은 물로 숨고, 이 바다에서 가장 빨라 상선을 앞지르고 순시선을 따돌린다. 짐칸은 좁다.',
  },
  registro: {
    hull: 'galleon', name: '등록선', origin: '스페인(개별 무역 특허선)', originFlag: 'spain',
    tier: 3, era: 'modern', yards: ['havana', 'cartagena'], price: 18000, requires: 'urca',
    // ★ 1740년 부르봉 왕조가 플로타 제도를 접고 "navío de registro"(등록선) 제도를 열었다 —
    //   함대를 기다리지 않고 배 한 척이 허가만 받아 대서양을 혼자 건너는 것이다. 호위가
    //   없는 대신 짐도 포도 스스로 감당해야 했으므로 갈리사브라보다 크고 은선단 갈레온보다는
    //   작다 — 그 중간에 놓았다. **곡선을 흔들지 않으려 우르카를 몰아 본 사람에게만 연다**
    //   (은선단 갈레온과 같은 자리).
    hp: 250, crew: 50, crewMax: 80, crewMin: 30, cargo: 190, guns: 22, speed: 1.10,
    upkeep: 36, rig: 0.75, tint: 'white',
    desc: '함대를 기다리지 않고 허가만으로 혼자 대서양을 건너는 배. 호위가 없는 대신 스스로를 지킬 포와 짐을 함께 싣는다.',
  },
};
