// regions/index.js — 세계를 권역으로 가른다 (지역 레지스트리)
//
// ★ 이 게임은 원래 지중해 한 장짜리였다. 전 세계로 넓히면서 **한 화면에 다 담지 않고**
//   권역마다 자기 지도를 갖게 했다. 이유는 좌표계다 —
//   논리 해상도가 400×225로 고정이고 도시 클릭 판정이 반경 6px이라, 도시 사이가
//   12px 이상 떨어져야 한다. 전 세계 도시 100여 곳을 한 장에 얹으면 물리적으로 안 들어간다.
//
//   그래서 **권역마다 400×225 좌표계를 따로 쓴다.** 지중해의 (141,63)과
//   인도양의 (141,63)은 아무 관계가 없다. 권역 안에서만 좌표가 의미를 갖는다.
//
// 권역 사이는 `OCEAN_LANES`(원양 항로)로 잇는다. 좌표가 다른 두 지도를 잇는 선이라
// 거리를 좌표에서 잴 수 없다 — 그래서 이 항로만 **일수를 직접 적는다**(`days`).
//
// ── 파일 배치 규약 ────────────────────────────────────────────
//   js/regions/<rid>/geo.js     지리 — 도시 좌표·항로·위험도·해류
//   js/regions/<rid>/trade.js   경제 — 무엇을 싸게 내놓고 무엇을 비싸게 사는가 + 입항세
//   js/regions/<rid>/goods.js   그 권역이 **세계에 처음 들여오는** 교역품
//   js/regions/<rid>/ships.js   그 권역에서 짓는 선종
//   js/regions/<rid>/npc-traders.js   그 권역의 무역상
//   js/regions/<rid>/npc-pirates.js   그 권역의 해적
//   js/regions/<rid>/npc-figures.js   그 권역의 항구 인물(중개인·정보상·밀수업자…)
//   content/regions/<rid>-evidence.json   위 값들의 사료 근거
//
//   권역 폴더는 서로를 import하지 않는다. 합치는 것은 이 파일뿐이라
//   여러 사람이 각자 권역을 동시에 손봐도 같은 줄에서 충돌하지 않는다.

import * as medGeo from './mediterranean/geo.js';
import * as medTrade from './mediterranean/trade.js';
import * as medGoods from './mediterranean/goods.js';
import * as medShips from './mediterranean/ships.js';
import * as medTrd from './mediterranean/npc-traders.js';
import * as medPir from './mediterranean/npc-pirates.js';
import * as medFig from './mediterranean/npc-figures.js';

import * as atlGeo from './atlantic/geo.js';
import * as atlTrade from './atlantic/trade.js';
import * as atlGoods from './atlantic/goods.js';
import * as atlShips from './atlantic/ships.js';
import * as atlTrd from './atlantic/npc-traders.js';
import * as atlPir from './atlantic/npc-pirates.js';
import * as atlFig from './atlantic/npc-figures.js';

import * as afrGeo from './africa/geo.js';
import * as afrTrade from './africa/trade.js';
import * as afrGoods from './africa/goods.js';
import * as afrShips from './africa/ships.js';
import * as afrTrd from './africa/npc-traders.js';
import * as afrPir from './africa/npc-pirates.js';
import * as afrFig from './africa/npc-figures.js';

import * as midGeo from './mideast/geo.js';
import * as midTrade from './mideast/trade.js';
import * as midGoods from './mideast/goods.js';
import * as midShips from './mideast/ships.js';
import * as midTrd from './mideast/npc-traders.js';
import * as midPir from './mideast/npc-pirates.js';
import * as midFig from './mideast/npc-figures.js';

import * as indGeo from './indian/geo.js';
import * as indTrade from './indian/trade.js';
import * as indGoods from './indian/goods.js';
import * as indShips from './indian/ships.js';
import * as indTrd from './indian/npc-traders.js';
import * as indPir from './indian/npc-pirates.js';
import * as indFig from './indian/npc-figures.js';

import * as seaGeo from './seasia/geo.js';
import * as seaTrade from './seasia/trade.js';
import * as seaGoods from './seasia/goods.js';
import * as seaShips from './seasia/ships.js';
import * as seaTrd from './seasia/npc-traders.js';
import * as seaPir from './seasia/npc-pirates.js';
import * as seaFig from './seasia/npc-figures.js';

import * as carGeo from './caribbean/geo.js';
import * as carTrade from './caribbean/trade.js';
import * as carGoods from './caribbean/goods.js';
import * as carShips from './caribbean/ships.js';
import * as carTrd from './caribbean/npc-traders.js';
import * as carPir from './caribbean/npc-pirates.js';
import * as carFig from './caribbean/npc-figures.js';

import * as samGeo from './southamerica/geo.js';
import * as samTrade from './southamerica/trade.js';
import * as samGoods from './southamerica/goods.js';
import * as samShips from './southamerica/ships.js';
import * as samTrd from './southamerica/npc-traders.js';
import * as samPir from './southamerica/npc-pirates.js';
import * as samFig from './southamerica/npc-figures.js';

import * as easGeo from './eastasia/geo.js';
import * as easTrade from './eastasia/trade.js';
import * as easGoods from './eastasia/goods.js';
import * as easShips from './eastasia/ships.js';
import * as easTrd from './eastasia/npc-traders.js';
import * as easPir from './eastasia/npc-pirates.js';
import * as easFig from './eastasia/npc-figures.js';

/* ── 권역 ──────────────────────────────────────────────────────
   order  지도 화면에서 나열하는 순서 (서→동)
   gate   그 권역으로 들어가는 관문 항구 — 원양 항로가 여기 닿는다
   tone   지도 배경의 바다 색조 힌트 (art가 읽는다. 없으면 지중해 색)
   home   true인 권역에서 게임이 시작한다 */
export const REGIONS = [
  {
    id: 'mediterranean', name: '지중해', order: 2, home: true,
    blurb: '유럽과 아프리카와 아시아가 만나는 안쪽 바다. 이 게임이 시작되는 곳.',
    tone: 'inland',
    mod: { geo: medGeo, trade: medTrade, goods: medGoods, ships: medShips, traders: medTrd, pirates: medPir, figures: medFig },
  },
  {
    id: 'caribbean', name: '카리브·누에바에스파냐', order: -1,
    blurb: '서인도 함대가 은을 싣고 떠나는 바다. 지협 하나가 두 대양을 가른다.',
    tone: 'antilles',
    mod: { geo: carGeo, trade: carTrade, goods: carGoods, ships: carShips, traders: carTrd, pirates: carPir, figures: carFig },
  },
  {
    id: 'southamerica', name: '남아메리카', order: 0,
    blurb: '포토시의 은과 브라질의 설탕. 세계의 은이 여기서 나 태평양과 대서양으로 갈린다.',
    tone: 'newworld',
    mod: { geo: samGeo, trade: samTrade, goods: samGoods, ships: samShips, traders: samTrd, pirates: samPir, figures: samFig },
  },
  {
    id: 'atlantic', name: '대서양·북해', order: 1,
    blurb: '이베리아에서 발트까지. 모직과 청어와 목재의 바다, 그리고 대양으로 나가는 문.',
    tone: 'cold',
    mod: { geo: atlGeo, trade: atlTrade, goods: atlGoods, ships: atlShips, traders: atlTrd, pirates: atlPir, figures: atlFig },
  },
  {
    id: 'africa', name: '아프리카', order: 3,
    blurb: '기니만의 금과 상아, 스와힐리 해안의 항구들. 희망봉이 두 대양을 잇는다.',
    tone: 'warm',
    mod: { geo: afrGeo, trade: afrTrade, goods: afrGoods, ships: afrShips, traders: afrTrd, pirates: afrPir, figures: afrFig },
  },
  {
    id: 'mideast', name: '중동·홍해', order: 4,
    blurb: '홍해와 페르시아만. 향신료가 유럽으로 올라가던 옛 길목이자 대상로의 끝.',
    tone: 'arid',
    mod: { geo: midGeo, trade: midTrade, goods: midGoods, ships: midShips, traders: midTrd, pirates: midPir, figures: midFig },
  },
  {
    id: 'indian', name: '인도양', order: 5,
    blurb: '후추와 면포의 해안. 계절풍이 반년마다 방향을 바꾼다.',
    tone: 'monsoon',
    mod: { geo: indGeo, trade: indTrade, goods: indGoods, ships: indShips, traders: indTrd, pirates: indPir, figures: indFig },
  },
  {
    id: 'seasia', name: '동남아·향료제도', order: 6,
    blurb: '정향과 육두구가 나는 유일한 섬들. 말라카 해협이 두 바다를 잇는 병목이다.',
    tone: 'tropic',
    mod: { geo: seaGeo, trade: seaTrade, goods: seaGoods, ships: seaShips, traders: seaTrd, pirates: seaPir, figures: seaFig },
  },
  {
    id: 'eastasia', name: '동아시아', order: 7,
    blurb: '비단과 자기와 은. 감합과 해금 사이로 밀무역이 흐른다.',
    tone: 'temperate',
    mod: { geo: easGeo, trade: easTrade, goods: easGoods, ships: easShips, traders: easTrd, pirates: easPir, figures: easFig },
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const REGION_IDS = REGIONS.map((r) => r.id);
export const HOME_REGION = (REGIONS.find((r) => r.home) ?? REGIONS[0]).id;

/* ── 원양 항로 ─────────────────────────────────────────────────
   권역과 권역을 잇는 선. 권역 안의 항로와 다른 점이 셋이다:

     ① 거리를 좌표에서 못 잰다 — 두 지도의 좌표계가 다르다. 그래서 `days`를 직접 적는다
        (기함 속력 1.0 기준 일수. 실제 일수는 배·바람으로 갈린다).
     ② 위험이 크다 — 며칠씩 뭍이 안 보이는 구간이라 요율이 권역 안보다 높다.
     ③ 되돌아올 수 없는 구간이 있다 — 계절풍이 반년마다 방향을 바꾸는 인도양이 그렇다.
        `monsoon: true`인 항로는 계절에 따라 일수가 크게 갈린다.

   ★ 이 표가 세계의 뼈대다. 선 하나를 긋는 것이 권역 하나를 여는 것과 같다.
     값은 `content/ocean-lanes-evidence.json`에 근거를 적는다. */
export const OCEAN_LANES = [
  /* ── 대서양 횡단 ────────────────────────────────────────────
     이 선들이 열리는 순간 세계 경제의 무게중심이 바뀐다. 포토시 은이 세비야로 올라오고,
     그 은이 다시 지중해와 인도양을 거쳐 중국으로 빨려 들어간다. 마닐라 갤리온은
     그 흐름의 **지름길**이다 — 아카풀코에서 곧장 태평양을 건넌다. */
  { a: 'sevilla', b: 'havana', days: 34, risk: 9.5,
    note: '서인도 함대(플로타)의 길. 카나리아에서 무역풍을 타고 서쪽으로, 돌아올 때는 걸프 스트림을 타고 북동으로 크게 돈다.' },
  { a: 'funchal', b: 'santodomingo', days: 30, risk: 9.0,
    note: '마데이라에서 무역풍을 타고 소앤틸리스로. 콜럼버스 이래의 표준 항로다.' },
  { a: 'lisboa', b: 'salvador', days: 30, risk: 8.5,
    note: '기니만 무풍대를 피하려 대서양 서쪽으로 크게 돌아 브라질에 닿는다(볼타 두 마르).' },
  { a: 'luanda', b: 'salvador', days: 22, risk: 8.0,
    note: '남대서양을 가로지른다. 남동 무역풍과 벵겔라 해류를 타면 아프리카에서 브라질 쪽이 순풍이다.' },
  { a: 'havana', b: 'cartagena', days: 9, risk: 7.5,
    note: '카리브 안쪽 길. 은과 에메랄드가 아바나로 모여 함대를 기다린다.' },
  /* ★ 지협을 두 번 넘던 것을 한 번으로 고쳤다(2026-08-16).
     카리브 담당자가 권역 안에 `panama|portobelo` 노새길을 그었고, 여기에도 `portobelo~callao`가
     육로로 그어져 있었다. 두 사람이 **같은 지협을 각자 한 번씩** 그린 것이라,
     파나마(태평양)에 있는 배가 카야오로 가려면 뭍을 두 번 넘어야 했다 —
     그리고 실제 남해 함대(아르마다 델 마르 델 수르)의 본선이던 **파나마~카야오 뱃길이
     세계 지도에 아예 없었다.** 지협은 카리브 권역이 이미 그었으므로 여기는 바닷길로 잇는다. */
  { a: 'panama', b: 'callao', days: 18, risk: 5.5,
    note: '파나마에서 카야오로 내려가는 남해 함대의 본선. 훔볼트 해류를 거슬러 남하하므로 내려가기가 올라오기보다 오래 걸린다.' },
  // 마닐라 갤리온 — 이 게임에서 가장 긴 항로
  { a: 'acapulco', b: 'manila', days: 48, risk: 10.0, monsoon: true,
    note: '태평양을 곧장 건넌다. 서행은 무역풍을 타 넉 달, 동행은 북위 40도까지 올라가 편서풍을 잡아야 해 훨씬 길고 괴혈병이 배를 비운다.' },

  // 지브롤터 — 지중해가 대양으로 나가는 유일한 문
  { a: 'genova', b: 'lisboa', days: 14, risk: 7.0,
    note: '지브롤터 해협을 지나 이베리아 서안을 돈다. 좁은 물목이라 사략선이 지킨다.' },
  { a: 'barcelona', b: 'sevilla', days: 11, risk: 6.5,
    note: '카탈루냐에서 해협을 지나 과달키비르 강어귀로.' },

  // 아프리카 서안 — 대양 항로의 첫 구간
  { a: 'lisboa', b: 'arguin', days: 12, risk: 7.5,
    note: '카나리아 해류를 타고 남하한다. 내려가기는 쉽고 올라오기가 어렵다.' },
  { a: 'lisboa', b: 'funchal', days: 6, risk: 4.5,
    note: '마데이라는 대양으로 나가는 첫 기항지다.' },

  // 희망봉 — 두 대양을 잇는 유일한 뱃길
  { a: 'luanda', b: 'mocambique', days: 26, risk: 11.0,
    note: '희망봉을 도는 구간. 서풍대의 파도가 높고 뭍이 보이지 않는 날이 길다.' },

  // 스와힐리 해안 ↔ 홍해·페르시아만
  { a: 'mombasa', b: 'aden', days: 13, risk: 7.0,
    note: '계절풍을 타고 아프리카 뿔을 돈다.' },
  { a: 'mocambique', b: 'hormuz', days: 18, risk: 8.0,
    note: '아라비아해를 가로지른다.' },

  // 홍해 — 지중해로 올라가는 옛 향신료 길 (육로 환적)
  { a: 'jeddah', b: 'alexandria', days: 16, risk: 5.0, overland: true,
    note: '홍해에서 짐을 내려 낙타에 싣고 나일로 넘긴다. 배가 지나는 물길이 아니라 짐이 넘어가는 길이다.' },
  { a: 'basra', b: 'beirut', days: 20, risk: 6.0, overland: true,
    note: '바스라에서 바그다드를 거쳐 알레포로 올라가는 대상로.' },

  // 인도양 — 계절풍 구간
  { a: 'aden', b: 'calicut', days: 17, risk: 7.5, monsoon: true,
    note: '여름 남서 계절풍이면 스무 날이 열흘로 준다. 반대 철에는 아예 못 간다.' },
  { a: 'hormuz', b: 'cambay', days: 11, risk: 6.5, monsoon: true,
    note: '페르시아만에서 구자라트로. 이 구간의 말과 은이 인도의 후추와 바뀐다.' },

  // 벵골만 — 인도 ↔ 동남아
  { a: 'nagapattinam', b: 'melaka', days: 15, risk: 7.0, monsoon: true,
    note: '코로만델에서 말라카 해협으로. 인도 면포가 향료와 바뀌는 축이다.' },

  // 남중국해 — 동남아 ↔ 동아시아
  { a: 'melaka', b: 'guangzhou', days: 16, risk: 8.5, monsoon: true,
    note: '남중국해를 북상한다. 겨울 북동풍이면 거슬러야 한다.' },
  { a: 'manila', b: 'quanzhou', days: 7, risk: 8.0,
    note: '루손에서 복건으로. 은이 이 짧은 구간으로 흘러 들어간다.' },
];

/* ── 조각을 합친다 ─────────────────────────────────────────────
   아래부터는 권역 폴더들이 내놓은 것을 하나로 모으는 기계적인 코드다.
   여기서 하는 일은 **모으기와 검사**뿐 — 값을 만들지 않는다. */

const each = (key) => REGIONS.map((r) => ({ r, m: r.mod[key] }));

/** 모든 권역의 도시 — 도시마다 `region`(권역 id)이 박힌다 */
export const ALL_CITY_GEO = each('geo').flatMap(({ r, m }) =>
  (m.CITIES ?? []).map((c) => ({ ...c, region: r.id })));

const CITY_IDS = new Set(ALL_CITY_GEO.map((c) => c.id));

/** 실제로 이을 수 있는 원양 항로만 산다.
    ★ 권역을 채우는 작업이 동시에 굴러가므로, 아직 한쪽 항구가 없는 원양 항로가 있을 수 있다.
      그것을 그대로 `ROUTES`에 넣으면 `neighborsOf`가 없는 도시를 돌려주어 게임이 깨진다 —
      그래서 **양 끝이 다 존재할 때만** 잇는다. 빠진 쪽은 파일 끝에서 한 줄로 알린다. */
export const LIVE_LANES = OCEAN_LANES.filter((l) => CITY_IDS.has(l.a) && CITY_IDS.has(l.b));

/** 권역 안 항로 + 원양 항로. 원양 항로는 `days`를 들고 다닌다 */
export const ALL_ROUTES = [
  ...each('geo').flatMap(({ m }) => m.ROUTES ?? []),
  ...LIVE_LANES.map((l) => [l.a, l.b]),
];

export const ALL_ROUTE_RISK = Object.assign(
  {},
  ...each('geo').map(({ m }) => m.ROUTE_RISK ?? {}),
  Object.fromEntries(LIVE_LANES.map((l) => [[l.a, l.b].sort().join('|'), l.risk])),
);

export const ALL_CURRENTS = Object.assign({}, ...each('geo').map(({ m }) => m.CURRENTS ?? {}));

/** 원양 항로 조회 — 좌표로 거리를 못 재는 구간이라 일수를 직접 준다 */
export const LANE_BY_KEY = Object.fromEntries(
  LIVE_LANES.map((l) => [[l.a, l.b].sort().join('|'), l]));

export const isOceanLane = (aId, bId) => !!LANE_BY_KEY[[aId, bId].sort().join('|')];

export const ALL_CITY_TRADE = Object.assign({}, ...each('trade').map(({ m }) => m.TRADE ?? {}));
export const ALL_CITY_TARIFF = Object.assign({}, ...each('trade').map(({ m }) => m.TARIFF_OVERRIDE ?? {}));

/** 교역품 — 권역이 **처음 들여오는** 것만 자기 파일에 적는다.
    같은 품목을 두 권역이 적으면 id가 겹치므로 검증이 실패시킨다(먼저 적은 쪽이 남는다). */
export const ALL_GOODS = (() => {
  const out = [], seen = new Set();
  for (const { r, m } of each('goods')) {
    for (const g of m.GOODS ?? []) {
      if (seen.has(g.id)) {
        console.warn(`[regions] 교역품 '${g.id}'가 여러 권역에 중복 정의됐다 — '${r.id}'의 것을 버린다.`);
        continue;
      }
      seen.add(g.id);
      out.push({ ...g, origin: g.origin ?? r.id });
    }
  }
  return out;
})();

/** 선박 — 같은 요령. `home`은 그 배가 나온 권역이다. */
export const ALL_SHIPS = (() => {
  const out = {};
  for (const { r, m } of each('ships')) {
    for (const [k, v] of Object.entries(m.SHIPS ?? {})) {
      if (out[k]) {
        console.warn(`[regions] 선종 '${k}'가 여러 권역에 중복 정의됐다 — '${r.id}'의 것을 버린다.`);
        continue;
      }
      out[k] = { ...v, home: v.home ?? r.id };
    }
  }
  return out;
})();

/** NPC — 상단·해적·인물. 권역이 박힌 채로 모인다. */
const npcOf = (slot, key) => each(slot).flatMap(({ r, m }) =>
  (m[key] ?? []).map((n) => ({ ...n, region: n.region ?? r.id })));

export const ALL_TRADERS = npcOf('traders', 'TRADERS');
export const ALL_PIRATES = npcOf('pirates', 'PIRATES');
export const ALL_FIGURES = npcOf('figures', 'FIGURES');

/** 권역별 **이름 없는 적** — 그 바다에 이름난 해적이 떠 있지 않을 때 붙는 얼굴.
    `data.js: ENEMIES`의 등급(세기·병력·전리품 금액)을 그대로 쓰고 이름·국적·선체만 바꾼다.
    이것이 없던 동안 홍해에서 프랑스 프리깃이, 대만 해협에서 바르바리 기함이 나왔다. */
export const FOES_BY_REGION = Object.fromEntries(
  each('pirates').map(({ r, m }) => [r.id, m.FOES ?? []]).filter(([, v]) => v.length));

/** 도시 id → 권역 id */
export const REGION_OF_CITY = Object.fromEntries(ALL_CITY_GEO.map((c) => [c.id, c.region]));

/** 그 권역의 도시들 */
export const citiesOfRegion = (rid) => ALL_CITY_GEO.filter((c) => c.region === rid);

/* 조각들이 서로 어긋나면 시작할 때 알린다 — 조용히 빈 항구가 생기는 것보다 낫다 */
for (const c of ALL_CITY_GEO) {
  if (!ALL_CITY_TRADE[c.id]) {
    console.warn(`[regions] '${c.id}'(${c.region}): trade.js에 경제가 없다 — 아무것도 안 나고 안 사는 항구가 된다.`);
  }
}
const pending = OCEAN_LANES.filter((l) => !LIVE_LANES.includes(l));
if (pending.length) {
  console.info(`[regions] 원양 항로 ${pending.length}/${OCEAN_LANES.length}개가 아직 안 이어졌다 — `
    + `한쪽 항구가 없다: ${pending.map((l) => `${l.a}~${l.b}`).join(', ')}`);
}
