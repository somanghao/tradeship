// sprites/maps/index.js — 권역마다 지도를 어떻게 그릴 것인가
//
// 지도는 두 갈래로 만들어진다:
//   ① **손으로 그린 격자** — 지중해만 그렇다(`mediterranean.js`). 실루엣을 정확히 통제한다.
//   ② **도시 좌표에서 역산** — 나머지 여섯 권역(`auto.js`). 항구가 반드시 물가에 오고
//      항로가 반드시 바다를 지난다. 지도가 없는 바다를 즉시 굴려 볼 수 있게 하는 장치이자,
//      나중에 사람이 그릴 때의 **기준판**이다.
//
// 기후(`CLIMATE`)는 그 위에 얹는 색조다. 같은 방식으로 만든 지도라도 북해와 향료제도가
// 같은 색이면 "다른 바다에 왔다"는 감각이 안 산다 — 이 게임에서 그 감각은 싸게 얻을수록 좋다.

import * as med from './mediterranean.js';

/* ── 기후 ──────────────────────────────────────────────────────
   land   육지 기본색 · alt 얼룩 · 지대별 색
   sea    외해 그라데이션 세 단계(위·가운데·아래)
   shore  해안선 바깥으로 번지는 네 겹 (백사장 → 얕은 물 → 깊은 물)
   zones  지대를 y로 가르는 함수. 없으면 육지 전체가 기본색이다 */
export const CLIMATE = {
  // 지중해 — 관목과 사막이 위아래로 갈린다
  inland: {
    land: '#5f8043', alt: ['#4a6b34', '#6f8347', '#87995a'],
    zone: { forest: null, scrub: '#6f8347', desert: '#c9a870' },
    sea: ['#154762', '#1d5a78', '#0a2033'],
    shore: ['#e8d5a8', '#6fc4cc', '#3f92ad', '#2c6f8c'],
    zones: med.ZONES,
  },
  // 대서양·북해 — 침엽수림과 히스, 차고 탁한 바다
  cold: {
    land: '#4d6b45', alt: ['#3a5436', '#5c7a52', '#6b7f58'],
    zone: { forest: null, scrub: '#5f7048', desert: null, tundra: '#8a9483' },
    sea: ['#123c52', '#1a4f68', '#08192a'],
    shore: ['#d8cfb0', '#5fb0bc', '#357f9c', '#245f7e'],
    zones: { scrubY: (x) => 150 + Math.sin(x * 0.02) * 14, tundraY: (x) => 46 + Math.sin(x * 0.017 + 1) * 10 },
  },
  // 아프리카 — 사바나에서 사막으로, 적도에 밀림
  warm: {
    land: '#7a8a44', alt: ['#5f7036', '#8f9a52', '#a89a5c'],
    zone: { forest: '#4a6b34', scrub: null, desert: '#cdb079' },
    sea: ['#155a6b', '#1d6b7d', '#0b2a38'],
    shore: ['#eadaa8', '#74cdd0', '#3f9aad', '#2a7288'],
    zones: { desertY: (x) => 62 + Math.sin(x * 0.026) * 12, forestY: (x) => 108 + Math.sin(x * 0.02 + 2) * 14 },
  },
  // 중동·홍해 — 거의 다 사막이고 물가에만 초록이 있다
  arid: {
    land: '#c2a26c', alt: ['#a8874f', '#d4b47c', '#8f7648'],
    zone: { forest: null, scrub: '#9a9455', desert: null },
    sea: ['#176073', '#1f7186', '#0c2c3a'],
    shore: ['#f0dcac', '#7ad2d4', '#43a0b0', '#2d788c'],
    zones: { scrubY: () => -1 },     // 지대를 안 가른다 — 전부 사막
  },
  // 인도양 — 계절풍이 적시는 초록, 데칸은 건조하다
  monsoon: {
    land: '#5f8a42', alt: ['#486c31', '#719a4e', '#93a45a'],
    zone: { forest: '#3f6b2e', scrub: '#8a9450', desert: null },
    sea: ['#136578', '#1b768c', '#0a2e3c'],
    shore: ['#eedcae', '#7ed6d6', '#45a4b2', '#2f7c90'],
    zones: { scrubY: (x) => 96 + Math.sin(x * 0.023 + 1) * 16 },
  },
  // 동남아 — 진한 열대림과 산호초
  tropic: {
    land: '#3f7a3a', alt: ['#2f6130', '#4f8c45', '#6a9c4e'],
    sea: ['#0f6b7c', '#178294', '#08313f'],
    shore: ['#f4e6bc', '#8ae0dc', '#4bb0ba', '#2f8496'],
    zones: null,
  },
  // 동아시아 — 온대림, 북쪽으로 갈수록 마른다
  temperate: {
    land: '#548049', alt: ['#3f6438', '#688f54', '#7e9a58'],
    zone: { forest: null, scrub: '#7e9058', desert: '#bda874' },
    sea: ['#14556e', '#1c6683', '#092634'],
    shore: ['#e4d4a8', '#6cc6cc', '#3f97ac', '#2a6f88'],
    zones: { scrubY: (x) => 60 + Math.sin(x * 0.021) * 12, desertY: (x) => 26 + Math.sin(x * 0.03 + 1) * 8 },
  },
};

/* ── 권역별 지도 정의 ──────────────────────────────────────────
   hand  손으로 그린 격자가 있으면 그것을 쓴다
   auto  없으면 도시 좌표에서 역산한다. 그때 넘길 옵션:
     seed      권역마다 다른 해안
     lane/bay  항로 회랑 반폭 · 항구 앞바다 반경 — **이 둘이 바다의 넓이를 정한다**
     openSea   통째로 바다인 사각형. **대양 쪽을 열어 두는 자리**다.
               이것이 없으면 지도가 "항로를 따라 난 운하"처럼 보인다.
     landmass  통째로 육지인 사각형. 대륙 안쪽을 굳혀 만이 새는 것을 막는다.
     isles     흩뿌릴 섬의 수

   ★ openSea·landmass는 **그 권역의 도시 좌표가 정해진 뒤에** 맞춰야 한다.
     권역을 채우는 작업과 지도를 다듬는 작업이 이 값에서 만난다. */
export const MAPS = {
  mediterranean: {
    climate: 'inland',
    hand: { spans: med.SEA_SPANS, gw: 100, gh: 56, gs: 4, isles: med.ISLES, ranges: med.RANGES },
  },
  atlantic: {
    climate: 'cold',
    auto: {
      seed: 0xA71A, lane: 8.5, bay: 12, isles: 16,
      // 서쪽 바깥이 대양이다 — 여기를 열지 않으면 이베리아 서안이 호수처럼 보인다
      openSea: [[0, 0, 26, 225], [0, 150, 60, 225]],
      landmass: [],
    },
  },
  africa: {
    climate: 'warm',
    auto: {
      seed: 0xAF41, lane: 8, bay: 12, isles: 14,
      // 서안 바깥(대서양)과 동안 바깥(인도양)을 둘 다 연다. 가운데는 대륙이라 막는다
      openSea: [[0, 0, 22, 225], [378, 0, 400, 225]],
      landmass: [[120, 20, 280, 170]],
    },
  },
  mideast: {
    climate: 'arid',
    auto: {
      seed: 0x1D5E, lane: 7, bay: 10, isles: 10,
      openSea: [[0, 190, 400, 225]],
      landmass: [[120, 20, 300, 150]],
    },
  },
  indian: {
    climate: 'monsoon',
    auto: {
      seed: 0x1D1A, lane: 8.5, bay: 12, isles: 18,
      // 아대륙 아래가 대양이다
      openSea: [[0, 186, 400, 225]],
      landmass: [[110, 16, 300, 120]],
    },
  },
  seasia: {
    climate: 'tropic',
    auto: {
      // 섬이 많은 바다라 회랑을 좁게, 섬을 많이 — 군도처럼 보이는 것이 이 권역의 성격이다
      seed: 0x5EA5, lane: 9.5, bay: 11, isles: 26,
      openSea: [[0, 0, 400, 20], [0, 205, 400, 225]],
      landmass: [],
    },
  },
  eastasia: {
    climate: 'temperate',
    auto: {
      seed: 0xEA57, lane: 8.5, bay: 12, isles: 18,
      // 동쪽 바깥이 태평양
      openSea: [[366, 0, 400, 225]],
      landmass: [[0, 0, 120, 200]],
    },
  },
};

export const mapDefOf = (regionId) => MAPS[regionId] ?? MAPS.mediterranean;
export const climateOf = (regionId) => CLIMATE[mapDefOf(regionId).climate] ?? CLIMATE.inland;
