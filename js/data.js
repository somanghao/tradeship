// data.js — 교역품 / 도시 경제 / 선박 / 적 정의
//
// ★ 도시의 **지리**(좌표·항로·해류·깃발·규모)는 `js/map/geo.js`에 있다.
//   여기에는 그 도시가 무엇을 싸게 내놓고 무엇을 비싸게 사는지(경제)만 둔다.
//   지도를 손보는 사람과 경제를 조율하는 사람이 같은 줄에서 충돌하지 않게 가른 것이다.
//   `CITIES`는 둘을 id로 맞물려 합성한 결과다 — 읽는 쪽 코드는 예전과 똑같이 쓰면 된다.

import {
  CITY_GEO, GEO_BY_ID, ROUTES, CURRENTS, ROUTE_RISK, riskKey,
  OCEAN_LANES, LANE_BY_KEY, isOceanLane, laneOf, sameRegion, REGION_OF_CITY,
  REGIONS, REGION_BY_ID, REGION_IDS, HOME_REGION, citiesOfRegion,
} from './map/geo.js';
import { ALL_GOODS, ALL_SHIPS, ALL_CITY_TRADE, ALL_CITY_TARIFF, FOES_BY_REGION, ALL_PIRATES, ALL_MATES } from './regions/index.js';

export {
  ROUTES, CURRENTS, ROUTE_RISK, riskKey,
  OCEAN_LANES, LANE_BY_KEY, isOceanLane, laneOf, sameRegion, REGION_OF_CITY,
  REGIONS, REGION_BY_ID, REGION_IDS, HOME_REGION, citiesOfRegion,
  FOES_BY_REGION,
  /* ★ 해적 **명부**를 여기서도 내보낸다 — `state.js`가 현상금·초무 값을 재려면 그 정의가 필요한데,
     `state`는 `world`를 몰라야 하기 때문이다(모듈 방향 `data → state → world → scenes`).
     정본은 여전히 권역 `npc-pirates.js`이고 여기는 지나가는 자리다. */
  ALL_PIRATES,
  /** 동료 51명 — 권역 `npc-mates.js`가 정본. 계약 모양은 `COMMENDA` */
  ALL_MATES,
};

/* 교역품 — **권역마다 갈라져 있다.** 그 물건이 나온 권역의 `js/regions/<권역>/goods.js`가
   정본이고, 여기서는 모아서 예전과 같은 모양으로 내놓는다.
   id는 세계에서 하나뿐이라 두 권역이 같은 id를 적으면 index.js가 경고하고 뒤엣것을 버린다.

   base 기준가는 **곡물 20닢 대비 사료 비율**이다(향신료 ×16.5·비단 ×21·금괴 ×35).
   고치면 `content/goods-evidence.json`도 같은 커밋에서 — check-prices.mjs가 대조한다. */
export const GOODS = ALL_GOODS;

export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g]));

/* 시장 깊이 — 한 항구가 한 번에 소화할 수 있는 물량에는 한계가 있다.
   많이 살수록 비싸게 사고 많이 팔수록 싸게 판다. 그 항구·품목의 최근 거래량(압력)이
   누적되므로 나눠 팔아도 피하지 못하고, 날이 지나면 시장이 회복한다.
   이 장치가 없으면 "화물칸을 통째로 사서 통째로 판다"가 항상 최적이라 돈이 너무 쉽게 불어난다. */
export const MARKET = {
  depthPerSize: 45,  // 항구가 소화하는 물량 = 이 값 × 도시 size (큰 항구일수록 깊다)
  impact: 0.36,      // 깊이만큼 밀어 넣었을 때 단가가 이만큼 불리해진다
  cap: 0.50,         // 아무리 밀어 넣어도 이 이상은 안 나빠진다
  decay: 0.68,       // 하루가 지나면 압력이 이만큼 남는다 (낮을수록 시장이 빨리 회복한다)
  gateDepth: 2.5,    // 원양 항로가 닿는 항구는 소비권이 그 도시 규모보다 넓다 (아래 ★)
  /* ★ 원양 관문의 깊이를 따로 두는 이유.
     이 벌점은 **한 번에 크게 사고 크게 파는 쪽**을 때린다. 그런데 원양은 그럴 수밖에 없다 —
     왕복이 48~66일이라 나눠 팔려면 몇 해가 걸린다. 그래서 같은 은 항로가 45개면 실거래
     +45%인데 200개면 **+5%**로 주저앉았고, 항해비를 못 넘겨 마닐라 갤리온도 은 항로도
     적자였다(테스터 셋이 각각 −2,847닢 · −5,911닢 · −367닢으로 확인).
     **가장 긴 항로가 가장 안 벌리는 것은 설계가 뒤집힌 것이다.**
     근거도 이쪽을 가리킨다 — caribbean-evidence.json이 포르토벨로를 이렇게 적어 두었다:
     "페리아에서 팔린 유럽 물건은 지협을 넘어 페루 부왕령 전체로 퍼졌으므로
      **소비권이 이 항구 규모보다 훨씬 넓었다**." 아카풀코도 평소엔 작은 마을이지만
     갤리온이 닿으면 누에바에스파냐 전역의 상인이 모였다(게임에선 size 1이라 깊이 45였다).
     즉 깊이를 도시 규모로만 재는 것이 애초에 틀렸다. 대양을 잇는 항구는 배후지를 상대한다. */
  /* ★ cap 0.35는 대형선을 못 막았다. 320칸짜리 아르고시가 한 항구에 화물을 통째로
     쏟아부어도 단가가 35%밖에 안 밀려, 배를 키울수록 수익이 가속했다(90항차 실측 +80%).
     한 항구가 하루에 소화할 수 있는 물량에는 한계가 있다는 것이 경제적으로도 맞다.
     초반 소량 거래에는 거의 걸리지 않으므로 **성장할수록만 무거워지는** 브레이크다. */
  /* ★★ 「cap에 닿으면 한계벌점이 0이 되어 선단이 깊이를 뚫는다」는 판정이 한 번 나왔지만
     (BALANCE.md §5-L: 2,298칸 선단이 한 항차 69,124닢 = 갈레온의 7.1배) **그것은 측정이 만든 수다.**
     그 스크립트가 `칸당 순이익 × 화물칸`을 항차 이익으로 적었는데, 물량을 채우는 `planFor()`는
     **한계마진이 0이 되면 그 자리에서 멈춘다** — 곧 화물칸을 열 배로 늘려도 실제로 채우는 칸은
     안 늘고, cap(0.50)에는 애초에 닿지도 않는다(멈추는 자리는 f ≈ 0.1~0.2다).
     `node tools/sim-fleet.mjs 30 40`이 그것을 낸다 — 화물칸 45→2,298에서 **채운 칸 45→128**,
     실제 항차 순이익 1,504→2,102닢. 동행 여덟을 공짜로 얹은 판은 오히려 항차 순이익이
     **1,842 → −355닢**이었다(유지비만 늘고 팔 곳이 없다).
     ⇒ **cap을 완만한 곡선이나 점근선으로 바꾸면 벌점이 지금보다 *낮아져* 수익이 오른다.**
        고칠 자리가 아니다. 여기를 다시 만지려거든 `sim-fleet.mjs`부터 돌릴 것. */
};

/* 산지/수요지 배율 압축 — 도시별 supply/demand 값을 1 쪽으로 당긴다.
   원래 값(0.46~1.52)은 한 항차에 자산이 배로 불어날 만큼 차익이 커서
   "여러 번 무역해야 다음 배"가 성립하지 않았다. 도시 데이터는 그대로 두고
   여기 한 계수로 폭만 조인다 — 도시를 추가할 때 다시 균형을 맞출 필요가 없다.

   ★ 0.62 → 0.70. 조이는 것에도 값이 있다 — 산지 배율 0.46과 0.52의 차이가 5.6%까지
     짓눌려 **어느 항구가 원가에 가까운지 화면에서 알 수 없었다**(아프리카 금·아메리카 은).
     시뮬 12회로 재 보니 0.70과 0.78이 사실상 같아 덜 움직이는 쪽을 골랐다.
     같은 측정에서 10항차 파산이 12회 중 11회 → 0회로 바뀌었는데, 그것은 이 계수보다
     `priceOf`의 흔들림을 시황과 도시 사정으로 가른 쪽이 낸 것이다. */
export const SPREAD = 0.70;

/* 대형 주문 — 상관이 내는 큰 계약. 항구마다 하나씩 걸려 있고 사흘마다 갈린다.
   화물은 직접 조달해야 하고 기한도 있지만, 성사되면 시세보다 훨씬 후하게 쳐준다.
   "여러 항차를 굴려 모으는 길"과 "한 건을 크게 물어 도약하는 길"을 나란히 두기 위한 장치. */
export const CONTRACT = {
  /* 보수를 먼저 정하고 **수량을 역산한다.** 전에는 수량(30~90)을 먼저 뽑고 단가를 곱해서,
     비단·금괴처럼 비싼 품목이 걸리면 계약 하나가 5만 닢을 넘었다(시작 자금이 900닢인데).
     지금은 "상관이 이 정도 규모의 일을 낸다"를 먼저 정하므로 품목이 뭐든 규모가 비슷하다. */
  // 교역품 기준가를 사료 비율로 올리면서(평균 ×1.23) 함께 올렸다 — 안 올리면
  // 계약이 시세 거래보다 초라해져 "한 건을 크게 무는 길"이 죽는다.
  value: [1100, 4900],    // **갈레온 한 척(200칸)분** 일감의 목표 보수. 도시 size와 선복 배수로 스케일된다

  /* ★ 선복(船腹) 단위 발주 ─────────────────────────────────────
     이 표는 오래 **도시 규모로만** 스케일됐다. 곧 1일차 낡은 바사에게도 500일차 갈레온에게도
     같은 표에서 뽑았고, 그래서 **초반엔 자산의 열여덟 배**이고 **후반엔 무역보다 못했다**
     (실측: 1일차 보수 3,684닢·선금 921닢 = 자산의 2.45배 / 후반·선단 보수 3,4xx닢으로 같은 값).
     테스터 실측 한 판에서는 계약 한 건이 **금고 23닢을 3,772닢으로** 만들었다.

     사료가 가리키는 단위는 재산이 아니라 **선복**이다 — 상관·아시엔다의 대형 주문은
     "이 배 한 척을 채워 오라"였지 상인의 재산을 보고 발주하지 않았다. 그래서 규모를
     화물칸에 묶는다. 기준(1.0)은 갈레온 200칸이고, 그보다 작으면 작은 일감이 걸린다.

     ★ 재는 것은 **기함 한 척의 선복**이지 선단 합이 아니다(사료도 "선단 **한 척분** 화물값"이다).
       선단 합으로 재면 동행을 늘리는 것이 그대로 계약 수입의 배수가 된다.
     지수 0.85는 **선복이 커질수록 조금씩 둔해지게** 한다(선형이면 배가 곧 배수가 된다).
       45칸 낡은 바사 0.28 · 90칸 카라벨 0.50 · 140칸 브리간틴 0.73 · 200칸 갈레온 1.00 ·
       320칸 아르고시 1.49 · 380칸 보선 1.73. */
  holdRef: 200,           // 선복 배수의 기준 화물칸 (갈레온 한 척)
  holdPow: 0.85,          // 선복이 n배면 일감은 n^0.85배
  holdMul: [0.25, 3.0],   // 선복 배수의 상하한 — 안전판(지금 가장 큰 배도 1.73이라 닿지 않는다)
  /* ⓑ 계약 **수량**을 선단이 키운다 — 선금 상한은 이미 `fleetCollateral()`(선단 전체)에 묶여 있는데
     수량만 기함 기준이라 **반쪽만 배선돼 있었다**(DESIGN-growth §1-4). 사료도 한쪽이다:
     해상대차·코멘다 모두 담보는 **선복(船腹)**이고, 그 항해에 나서는 배가 담보다.
     ★ 동행 적재를 **전량 세지 않는다** — 전량이면 「동행이 곧 계약 배수」가 되어
       밸런스 담당이 철회한 그 구멍이 계약 쪽에서 되살아난다.
     ★★ **설계문이 제안한 0.6은 실측에서 기각했다.** 지켜야 하는 선은 *"보수 배수 < 적재 배수"*인데,
       0.6은 적재 ×2.60에 보수 **×4.10**(동행 1척) · 적재 ×8.04에 보수 **×10.63**(8척)으로
       **배수를 넘겼다.** 설계문이 못 본 것은 **수량 상한과의 맞물림**이다 — 값싼 부피화물은
       단독일 때 `qtyCap`에 잘려 보수가 목표에 못 미치는데, 동행이 그 자물쇠까지 풀어 주므로
       보수가 두 번 오른다. 120장×2세트를 훑어 계수를 쓸어 보고 **선을 넘지 않는 가장 큰 값**을 골랐다:
         0.60 → ×4.10 / ×10.63   0.35 → ×2.88 / ×8.22   **0.25 → ×2.38 / ×6.33**   0.15 → ×1.85 / ×4.34
       ⇒ 0.25에서 처음으로 둘 다 적재 배수 아래로 들어온다. 재현은 `node tools/test-rules.mjs`의
         「동행이 계약을 키우되 배수는 아니다」 검사. */
  consortHold: 0.25,
  /* 수량 상한 = **기함(+동행×`consortHold`)** 화물칸 × 이것. 값싼 부피화물이 걸렸을 때만 실제로 문다(귀중품은
     보수를 채우는 데 몇 개면 되니까). 1을 넘겨 둔 것은 **혼자서는 못 싣는 일감**을 남겨
     동행선에 값어치를 주기 위해서다 — 다만 규모가 선복에 묶인 뒤로는 드물게만 걸린다.
     큰 배를 사는 이유는 이제 "못 싣는 일감을 실으려고"가 아니라 **큰 배에 큰 일감이 걸려서**다. */
  qtyCap: 1.2,
  qtyFloor: 5,            // 절대 하한 — 다섯 개 미만은 일감이 아니다

  payMul: [1.22, 1.42],   // 목적지 시세 대비 보수 배율 (관세도 안 뗀다)
  advance: 0.25,          // 선금 비율 (나머지는 납품할 때)
  /* ★ 해상대차(海上貸借) — 선금은 담보를 넘지 못한다.
     `advance: 0.25` 고정이 1일차에 **시작자산의 두 배 반**을 무이자로 안겨 주고 있었다.
     사료의 선대(先貸)는 담보 있는 돈이었다 — *cambio marittimo*·bottomry의 담보는 **배와 화물**이고,
     배가 돌아오지 못하면 채권자가 잃는 구조라 담보 없이 큰돈이 나가지 않았다.
     그래서 선금을 **지금 함께 나서는 배들의 매각가**에 묶는다. 낡은 바사(매각가 176닢)로도
     132닢은 나오므로 **첫 탈출구가 닫히지는 않는다** — 다만 그 한 건이 판을 열어 주지는 않는다.
     화물은 담보에 안 넣는다. 아직 사지도 않은 짐이고, 넣으면 시장에서 물건을 집었다 놓을 때마다
     게시판의 선금이 흔들려 "드나들며 새로 뽑을 수 없다"는 규칙이 깨진다. */
  advanceCap: 0.75,       // 선금 ≤ 선단 매각가 × 이것
  daysPad: [4, 10],       // 편도 일수 × 1.6 + 이만큼이 기한
  // 위약금은 **선금보다 커야 한다**. 0.5로 뒀더니 선금만 받고 파기하는 것이
  // 순이득이 됐다(선금 6,896 − 위약금 3,448 = +3,448). 지금은 받은 것을 다 토하고 더 문다.
  penalty: 1.25,
};

/* ── 입항세 ────────────────────────────────────────────────────
   파는 쪽에만 붙는다. 큰 항구일수록 시세는 좋지만 떼 가는 몫도 크다.

   두 겹이다:
     TARIFF        도시 `size`로 정해지는 **기본율**. 도시를 추가해도 저절로 정해진다.
     CITY_TARIFF   그 도시만의 **오버라이드**. 사료가 특별히 말하는 항구에만 적는다.

   ★ 오버라이드를 비워 두면 기본율이 그대로 쓰인다 — 그러니 여기 없는 도시가
     "빠진 것"이 아니다. 관세가 도시 성격의 일부인 곳만 적는 자리다.
   ★ 값을 적었으면 `content/regions/<권역>-evidence.json`의 `cities[id].tariff`에도
     같은 값과 근거를 적는다(`node tools/check-evidence.mjs`가 불일치를 실패시킨다). */
export const TARIFF = { 1: 0.03, 2: 0.045, 3: 0.06 };

export const CITY_TARIFF = ALL_CITY_TARIFF;

/* ── 입항세 누진 — 후반 브레이크 (#6) ──────────────────────────
   ★ **관세가 자산 규모와 무관했다.** 그래서 후반에 금고가 커질수록 세가 상대적으로 가벼워지고,
     사용자가 짚은 대로 *"나중에 돈이 너무 많아지는"* 구간이 생긴다. 입항세를 **운영비용**으로
     세우려면 그것이 규모를 따라가야 한다.

   ── 무엇에 연동하나 ─────────────────────────────────────────
   **총자산(금화 + 선단 매각가 + 거점·시설 회수가)**이다. 금화만 보면 "방금 배를 샀는가"에
   지배되고(부관 측정에서 실제로 부호가 뒤집혔다 → wiki/officer.md), 거점 수만 보면
   거점을 안 사는 플레이가 브레이크를 통째로 피한다. 관이 보는 것은 **그 상인의 크기**다.

   ── 사료 ────────────────────────────────────────────────────
   당대에 큰 상인이 더 크게 뜯긴 것은 실재한다 — 베네치아 `decima`(신고 재산에 매기는 재산세),
   제노바 산조르조의 강제공채, 카스티야의 `servicio`·강제 공채와 선박 징발(embargo),
   오스만의 `avarız`(비상 부과). 다만 **누진의 곱과 상한은 사료값이 아니라 설계값**이므로
   근거 파일에 `verdict: "gameplay"`로 적는다(→ content/upkeep-evidence.json: tariffScale).

   ── 막다른 골목 금지 ────────────────────────────────────────
   `ceil`이 있다. 악명(최대 ×2.6)과 관세 폭탄(×2.2)까지 겹치면 실효세가 30%를 넘어
   **팔수록 손해**가 되는데, 그건 값을 물리는 것이 아니라 길을 막는 것이다. */
export const TARIFF_SCALE = {
  /* ★ 이 값들은 **두 번 다시 잡았다.** 처음 25,000/55,000/0.32는 짝지은 20판에서
     차이 중앙값이 0닢이었다 — 브레이크가 아예 안 켜진 것이다. 두 번째 20,000/40,000/0.35도
     45항차에 겨우 ×1.15라 **시뮬 잡음 아래**에 묻혔다(줄어든 판 17/30 = 사실상 동전 던지기).
     원인은 자산 곡선이 **끝에 몰려 있다**는 것이다 — 실측 총자산 중앙값 30항차 13,500 ·
     45항차 36,600 · 60항차 104,400닢. 45→60항차에 세 배가 되므로, 그 구간에서 세가
     확실히 무거워지지 않으면 브레이크라는 이름이 무색하다.
     그래서 **기울기를 세웠다** — 40,000닢에서 ×1.40 · 70,000닢에서 ×2.00 · 90,000닢부터 상한 ×2.40.
     ★ 상한에서 실효세는 4.5% → 10.8%(size 3이면 14.4%)인데, 이것은 사료를 **벗어나지 않는다**:
       포르투갈의 dízima가 10%였고 카스티야 almojarifazgo는 5~15%였다. 누진의 꼭대기가
       "당대에 실제로 물던 무거운 관세"쯤에 가서 멎는 셈이다. */
  from: 20000,     // 총자산이 이 아래면 누진 없음 (실측 30항차 중앙값보다 위)
  per: 50000,      // 자산이 이만큼 늘 때마다
  step: 1.0,       // 세율이 원래의 +100%
  cap: 2.4,        // 최대 2.4배 (자산 90,000닢부터)
  ceil: 0.19,      // 무엇이 겹치든 실효 입항세는 이 위로 안 간다
};

/* ── 무역품 몰수 (#6) ──────────────────────────────────────────
   관선·순찰선이 배를 세우고 짐을 뒤진다. **부자일수록 자주 걸린다** — 확률이
   `TARIFF_SCALE`의 누진 계수에 그대로 물려 있어, 가난할 때는 0이다.

   ★ **피할 길이 있다.** 그 바다의 문서(`BOON.permit` — 감합·카르타스·인표)를 쥐고 있으면
     확률이 `permitOff`배로 준다. 이 게임이 두 번 고른 답이 *"막지 않고 값을 물린다"*이고,
     여기서는 한 걸음 더 간다 — **값을 미리 치른 사람은 덜 물린다.**
   ★ 판정은 `SEA_EVENTS`의 **calm을 잡아서** 바꾼다(weight 0 항목). pirate·storm·merchant의
     상대 빈도를 건드리지 않는 유일한 방법이다 — weight 합 100 규약(`rollSeaEvent`). */
export const SEIZURE = {
  perScale: 0.07,   // (누진계수 − 1)당 calm 판정의 이만큼이 임검이 된다
  cap: 0.055,       // 판정 하나당 상한
  share: 0.22,      // 실은 것 중 이만큼을 뺏긴다 (값나가는 것부터)
  permitOff: 0.35,  // 문서를 쥐고 있으면 확률이 이 배
};

/* 도시 경제 — 그 항구가 무엇을 싸게 내놓고 무엇을 비싸게 사는가.
   **권역마다 갈라져 있다** — 정본은 `js/regions/<권역>/trade.js`이고 여기서는 모으기만 한다.
   좌표·항로·깃발·규모는 `js/regions/<권역>/geo.js`에 있고, 둘은 id로만 맞물린다.

   ★ 15~16세기 실제 교역을 조사해 맞춰 두었다. 수치를 바꾸기 전에
      `content/regions/<권역>-evidence.json`(도시별 근거·출처)을 먼저 본다. */
export const CITY_TRADE = ALL_CITY_TRADE;


/* 지리(map/geo.js) + 경제(위) 를 합쳐 읽는 쪽이 쓰던 모양 그대로 돌려준다.
   한쪽에만 도시를 추가하면 조용히 어긋나므로 시작할 때 경고를 띄운다. */
export const CITIES = CITY_GEO.map((geo) => {
  const t = CITY_TRADE[geo.id];
  if (!t) console.warn(`[data] '${geo.id}': 경제 설정(CITY_TRADE)이 없다 — 아무것도 안 나고 안 사는 항구가 된다.`);
  return { ...geo, supply: t?.supply ?? {}, demand: t?.demand ?? {}, blurb: t?.blurb ?? '' };
});

for (const id of Object.keys(CITY_TRADE)) {
  if (!GEO_BY_ID[id]) console.warn(`[data] '${id}': 지리 설정(map/geo.js)이 없다 — 지도에 나타나지 않는다.`);
}

export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c]));

/* 선박 — **권역마다 갈라져 있다.** 그 배가 나온 권역의 `js/regions/<권역>/ships.js`가
   정본이고 여기서는 모으기만 한다. 필드 설명은 그 파일들의 머리주석에 있다.
   요구 공업력(`tier`)·원산국 깃발(`originFlag`)·계보(`requires`)가 해금 트리를 만든다. */
export const SHIPS = ALL_SHIPS;


/* 개장 — 배 한 척에 영구히 붙는다. 배마다 따로 관리(state.fleet[key].refits) */
export const REFITS = {
  copper: {
    name: '동판 선저', price: 1800,
    desc: '흘수선 아래를 구리로 싼다. 따개비가 붙지 않아 발이 빨라진다.',
    effect: '속력 +8%',
  },
  oakArmor: {
    name: '떡갈나무 장갑', price: 2400,
    desc: '현측에 24인치 떡갈나무를 덧댄다. 포탄이 관통하지 못한다.',
    effect: '선체 최대치 +25%',
  },
  sails: {
    name: '돛 증축', price: 1500,
    desc: '보조돛을 더 단다. 바람을 더 먹으니 따돌리기 쉬워진다.',
    effect: '도주 +14%p · 속력 +5%',
  },
  frames: {
    name: '내포격 골조', price: 1600,
    desc: '내부 골조를 촘촘히 넣는다. 파편이 갑판까지 튀지 않는다.',
    effect: '피격 시 선원 사상 −45%',
  },
  bulkhead: {
    name: '4부 격실', price: 2800,
    desc: '선창을 네 구획으로 나눠 침수를 가둔다. 한 번은 가라앉지 않는다.',
    effect: '격침 직전 1회 버팀',
  },
  razee: {
    name: '레이지 개조', price: 3600,
    desc: '상갑판을 통째로 깎아낸다. 포문을 잃는 대신 배가 가벼워진다.',
    effect: '속력 +15% · 포문 상한 −25% · 선체 −10%',
  },
};
export const REFIT_KEYS = Object.keys(REFITS);

/* 포탄 — 포격할 때 무엇을 쟁여 넣을지.
   일반탄은 무한, 나머지는 조선소에서 사 둔 재고를 한 발씩 소모한다. */
export const SHOTS = {
  round: {
    id: 'round', name: '일반탄', price: 0, dmg: 1.0, crew: 1.0, sail: 0, fire: 0,
    desc: '선체를 부순다. 화약고에 늘 쌓여 있다.',
  },
  grape: {
    id: 'grape', name: '포도탄', price: 90, dmg: 0.45, crew: 3.4, sail: 0, fire: 0,
    desc: '작은 탄을 뭉쳐 쏜다. 갑판을 쓸어 선원을 죽인다 — 백병전 전에 머릿수를 깎는 탄.',
  },
  chain: {
    id: 'chain', name: '사슬탄', price: 110, dmg: 0.35, crew: 0.6, sail: 22, fire: 0,
    desc: '사슬로 이은 두 덩이가 돛과 삭구를 찢는다. 적의 발을 묶어 도망치지 못하게 한다.',
  },
  heated: {
    id: 'heated', name: '가열탄', price: 170, dmg: 0.80, crew: 1.0, sail: 8, fire: 3,
    desc: '붉게 달군 탄. 박히면 불이 붙어 몇 턴이고 타들어간다.',
  },
};
export const SHOT_KEYS = ['round', 'grape', 'chain', 'heated'];

/* 대포 — 포문 하나에 얹는 무장.
   dmg는 피해 배율, aim은 조준 판정대 폭 배율.
   near~far는 **잘 맞는 거리 구간**. 이 밖으로 나가면 조준이 급격히 무너진다
   (state.js: zoneFactor). 장포는 포신이 길어 코앞의 배를 겨누지 못한다. */
export const CANNONS = {
  light:  { id: 'light',  name: '경포', price: 240, dmg: 0.95, aim: 1.22, near: 0,  far: 40,
            desc: '가볍고 다루기 쉽다. 접현해서 두들길 때 가장 세다.' },
  medium: { id: 'medium', name: '중포', price: 420, dmg: 1.15, aim: 1.00, near: 0,  far: 70,
            desc: '표준 함포. 어느 거리에서도 무난하게 맞는다.' },
  long:   { id: 'long',   name: '장포', price: 720, dmg: 1.38, aim: 0.80, near: 35, far: 100,
            desc: '긴 포신. 거리를 두고 싸울 때 강하지만 근접에서는 못 겨눈다.' },
};
export const CANNON_KEYS = ['light', 'medium', 'long'];
export const CANNON_REFUND = 0.5;   // 철거 시 환불 비율

/* 백병전 병종 — 공격/방어/사거리.
   hire가 있는 병종만 조선소 선원 탭에서 갑판 슬롯에 배치할 수 있다. */
export const TROOPS = {
  sailor:    { atk: 6,  def: 4,  hp: 16, name: '선원',     hire: 0,
               desc: '기본 승조원. 값은 안 들지만 갑판에서는 약하다.' },
  swordsman: { atk: 11, def: 9,  hp: 24, name: '검병',     hire: 320,
               desc: '단단하다. 전열이 무너지는 것을 막는다.' },
  pikeman:   { atk: 13, def: 6,  hp: 20, name: '창병',     hire: 300,
               desc: '긴 창으로 먼저 찌른다. 공수 균형형.' },
  musketeer: { atk: 16, def: 3,  hp: 15, name: '총병',     hire: 480,
               desc: '화력 최고. 맞으면 바로 쓰러진다.' },
  crossbow:  { atk: 12, def: 4,  hp: 16, name: '석궁병',   hire: 360,
               desc: '무난한 사격 병종. 총병보다 싸다.' },
  gunner:    { atk: 8,  def: 5,  hp: 18, name: '포수',     hire: 260,
               desc: '포격에 익숙하다. 갑판에서는 평범하다.' },
  corsair:   { atk: 14, def: 6,  hp: 22, name: '코르세어', hire: 560,
               desc: '바르바리 해안의 백병 전문가. 비싸다.' },
  captain:   { atk: 20, def: 12, hp: 40, name: '선장' },
  pirate:    { atk: 10, def: 4,  hp: 18, name: '해적' },
};

/** 조선소에서 고용 가능한 병종 (선장·해적 제외) */
export const RECRUITS = ['sailor', 'gunner', 'pikeman', 'swordsman', 'crossbow', 'musketeer', 'corsair'];
export const TROOP_REFUND = 0.5;    // 슬롯 교체 시 기존 병종 환불 비율
export const MELEE_SLOTS = 6;       // 선장 1 + 배치 5

/* 적 함선.
   nation = 어느 깃발을 달고 나오나. prize = 나포했을 때 선단에 들어오는 선종
   (없으면 부술 수만 있는 배다). */
export const ENEMIES = [
  {
    id: 'raider', name: '해적 소함', nation: '해적', hull: 'brig', tint: 'dark', flag: 'pirate',
    hp: 80, guns: 6, crew: 22, level: 1, prize: 'brig',
    troops: ['pirate', 'pirate', 'sailor', 'pirate'],
    loot: { gold: [180, 420], goods: ['salt', 'wine', 'grain'] },
  },
  {
    id: 'corsair', name: '바르바리 코르세어', nation: '바르바리', hull: 'galley', tint: 'oak', flag: 'pirate',
    hp: 110, guns: 5, crew: 34, level: 2, prize: null,
    troops: ['corsair', 'corsair', 'pirate', 'crossbow', 'corsair'],
    loot: { gold: [420, 900], goods: ['ivory', 'spice', 'salt'] },
  },
  {
    id: 'blackflag', name: '검은 깃발단', nation: '해적', hull: 'carrack', tint: 'dark', flag: 'pirate',
    hp: 175, guns: 12, crew: 48, level: 3, prize: 'carrack',
    troops: ['pirate', 'musketeer', 'corsair', 'swordsman', 'pirate', 'captain'],
    loot: { gold: [900, 1900], goods: ['silk', 'gold', 'spice', 'ivory'] },
  },
  {
    id: 'patrol', name: '프랑스 순찰 프리깃 팡당', nation: '프랑스', hull: 'frigate', tint: 'white', flag: 'france',
    hp: 240, guns: 20, crew: 90, level: 4, prize: 'frigate',
    troops: ['musketeer', 'swordsman', 'musketeer', 'pikeman', 'swordsman', 'captain'],
    loot: { gold: [1800, 3400], goods: ['wine', 'weapon', 'glass', 'silk'] },
  },
  {
    id: 'flagship', name: '바르바리 기함 알 사파', nation: '바르바리', hull: 'galleon', tint: 'green', flag: 'ottoman',
    hp: 360, guns: 30, crew: 130, level: 5, prize: 'galleon',
    troops: ['corsair', 'musketeer', 'corsair', 'swordsman', 'corsair', 'captain'],
    loot: { gold: [3600, 7200], goods: ['gold', 'ivory', 'spice', 'silk'] },
  },
];

/* ── 부관 ─────────────────────────────────────────────────────
   이 바다에서 이름을 가진 사람은 선장과 에이미 둘뿐이다. 부관은 **오직 한 명**이며
   갈아 끼우는 부품이 아니다(그래서 목록이 아니라 상수다).

   설계의 축은 "쓸모와 대가가 같은 화폐로 매겨진다"는 것 —
   에이미는 항해술도 검술도 손대지 않고 **오직 돈만** 만진다. 값을 깎고 세금을 줄이고
   장부를 맞추는 대신, 벌어들인 이익에서 제 몫을 떼 간다. 그래서 거래가 작으면 손해고
   커질수록 남는다. 후반 금화가 갈 곳이 없다는 문제와 "부관을 언제 쓰나"가 한 장치로 풀린다.

   등장 조건도 성격에서 나온다 — 물 새는 배를 모는 선장에게는 오지 않는다. */
export const OFFICER = {
  id: 'amy',
  name: '에이미',
  title: '부선장',
  sprite: 'amy',                 // sprites/char.js: UNITS.amy
  home: 'venezia',               // 출신지. 시작 항구와 같다 — 여기서부터 함께 떠난다
  origin: '베네치아 리알토의 상관 서기 출신',
  blurb: '장부를 손에서 놓지 않는다. 셈이 밝고 값을 깎는 데 망설임이 없다.',

  /* ★ 에이미는 **등용하는 인물이 아니다.** 첫 화면부터 이미 배에 타고 있다.
     고를 수 있는 선택지가 아니라 **주어진 동행**이다 — 선장 다음가는 인물이고,
     물 새는 바사를 몰던 시절부터 같이 굶는다. 그래서 계약금도 면접도 없고,
     내보낼 수도 없다(관계가 아니라 거래가 되어 버린다).
     대신 급여는 첫날부터 나간다 — 함께 간다는 것이 공짜라는 뜻은 아니다. */

  /* 보수는 두 갈래다 — **동업자이지 하인이 아니다.**
       wage 고정 급여(1일). 벌든 못 벌든 나간다. 이것이 "월급을 받는다"는 쪽이고,
                 배가 놀아도 나가므로 데리고 있으려면 규모가 받쳐줘야 한다.
       cut  성과 배분. 잘 벌면 그만큼 더 가져간다 — 이쪽이 "동업"이다.
     성과급만 두면 못 버는 달에 한 푼도 안 나가 고용인만도 못한 대우가 되고,
     급여만 두면 잘 벌어도 몫이 그대로라 동업이 아니다. 둘 다 있어야 관계가 성립한다.

     선원 일당이 2.4닢이므로 16닢은 선원 예닐곱 몫 — 선장의 오른팔값으로 무겁지만 터무니없지 않다.
     90항차(278일) 기준 급여 4,448 + 성과급 11,401 = **15,849닢**을 가져간다. */
  wage: 2.6,
  /* 성과급 — 능력(아래 perks)·급여와 **한 묶음으로** 맞춘 값이라 하나만 건드리면 균형이 깨진다.
     같은 시드로 짝지어(paired) 90항차를 돌린 결과(총자산 증감 · 40쌍 승률):
       cut 18% · 압력감면 15% · 급여  0 →   0.0% ( 7/20)   ← 고용할 이유가 없다
       cut 12% · 압력감면 22% · 급여  0 → +14.0% (24/40)   ← 급여 없던 시절의 채택값
       cut  8% · 압력감면 22% · 급여 16 → +21.1% (26/40)   ← 너무 후하다
       cut 11% · 압력감면 22% · 급여 16 → +15.7% (27/40)   ← 채택
     승률 6할이 노림수다 — 대체로 이득이지만 거래가 작은 판에서는 밑진다.

     ★ 급여와 성과급은 총액이 같아도 효과가 다르다. 성과급만 12%였을 때와 총 부담이
       비슷하도록 8%+급여16으로 짰더니 순효과가 +14%→+21%로 **올라갔다** —
       성과급은 잘 벌 때 더 떼므로 성장기 재투자 자본을 깎아 복리로 아프고,
       급여는 고정이라 규모가 커질수록 상대적으로 가벼워지기 때문이다.
       그래서 "총액을 맞췄으니 균형도 같겠지"가 성립하지 않는다.
     ★ 재측정할 때는 반드시 **같은 시드로 짝지어** 비교할 것. 그냥 두 번 돌리면
       배 구입 타이밍 때문에 기준선이 25%씩 튀어 부호가 뒤집힌다(실제로 겪었다).
     ★ 자동 동행으로 바꾸면서 전제가 무너져 **재측정했다.** 위 표는 "중반에 계약금 1,800을
       내고 고용한다"를 가정한 값이다. 지금은 계약금이 없고 급여가 1일차부터 나간다.
       같은 시드 40쌍(부관있음 − 부관없음, 중앙값 / 승률):
          3항차   −178닢 ( 0/40)
          5항차   −322닢 ( 0/40)
         10항차 −1,204닢 ( 1/40)   ← 코카 한 척 값보다 크다
         20항차 +1,421닢 (24/35)
         45항차   −712닢 (13/31)   ← 배 구입 타이밍 때문에 흔들리는 구간
         90항차/최종 +11,497닢 (33/40)
       읽는 법: **초반 10항차는 예외 없이 손해**고(급여가 고정인데 벌이가 없다),
       20항차부터 뒤집혀 후반에는 확실히 이득이다. 이것은 버그가 아니라 지금의 설계다 —
       "같이 굶다가 같이 번다". 초반이 너무 가혹하다고 판단되면 wage를 낮추지 말고
       **가난할 때 급여를 미루는 규칙**을 넣는 편이 서사와 맞는다(미구현). */
  cut: 0.11,

  /* 능력 — 전부 '돈'에 관한 것이다. 폭풍을 잠재우거나 적을 베지 않는다. */
  perks: {
    tariffOff:  0.35,   // 입항세 −35%   (서류를 꼼꼼히 갖춰 감면을 받아낸다)
    // 압력 감면은 매 항차 복리로 쌓여 단일 항목 중 가장 세다 — 여기를 먼저 의심할 것
    impactOff:  0.22,   // 시장 압력 −22% (한 번에 밀어 넣지 않고 나눠 넘긴다)
    contractUp: 0.12,   // 계약 보수 +12% (계약서의 독소 조항을 짚는다)
    salvageUp:  0.50,   // 표류물 +50%    (건질 것과 버릴 것을 셈해 고른다)
    haggleOff:  0.15,   // 해상 흥정가 −15% (뱃전에서도 값을 깎는다)
  },

  /* 대사 — 상황마다 한 줄. 서사는 이 정도로 가볍게 둔다.
     등용·해고 대사는 없다. 만나는 장면도 헤어지는 장면도 없기 때문이다. */
  lines: {
    // 첫 화면에서 한 번. 이 인물이 왜 여기 있는지를 이 한 줄로 끝낸다
    start:    '“배는 낡았고 금고는 가볍네요. …그래도 장부는 제가 맡죠. 어차피 같이 굶을 테니까.”',
    // 물 새는 배를 몰고 있을 때 항구에서. 떠나겠다는 말이 아니라 재촉이다
    leaky:    '“이 배로 얼마나 더 버틸 생각이세요. 다음 항구에서는 꼭 바꾸시죠.”',
    storm:    '“짐부터 묶으세요! 젖으면 값이 반이 됩니다!”',
    salvage:  '“이건 값이 나가고, 저건 버리세요. 뒤엉킨 것부터 풀면 됩니다.”',
    merchant: '“그 값엔 못 삽니다. 다음 항구까지 못 버틸 물건이잖아요.”',
    pirate:   '“금고는 제가 안고 있겠습니다. 뺏기면 제 몫도 날아가니까요.”',
    tariff:   '“세관 서류는 맞춰 뒀습니다. 이번엔 덜 뗄 거예요.”',
  },
};

/* ── 술집 ─────────────────────────────────────────────────────
   **선원은 부두에서 버튼으로 사는 물건이 아니다.** 첫 화면에서 선장은 배만 있고
   사람이 없다 — 술집에 들어가 자리를 돌며 무리를 모아야 배가 움직인다.

   자리에 앉은 것은 개인이 아니라 **무리(패거리)**다. 같이 배를 타 온 몇이 함께
   움직이므로 통째로 데려가거나 통째로 보낸다. 개인을 낱개로 세면 화면이 명부가 되고,
   무리로 두면 "어느 패를 태울 것인가"라는 판단이 남는다.

   자리마다 값이 두 갈래인 것이 핵심이다:
     · advance 계약금 — **지금 당장** 나간다. 초반 금고를 직접 때린다.
     · wage     요구 일당 — 항해하는 내내 따라온다. 싸게 태운 대가는 뒤에 온다.
   싼 무리는 계약금도 일당도 낮지만 갑판에서 쓸모가 없고 쉽게 토라진다.
   비싼 무리는 그 반대다 — "지금 아낄 것인가 나중에 아낄 것인가"가 매 자리마다 걸린다. */
export const TAVERN = {
  cycle: 2,          // 며칠마다 사람이 갈리나 (매물보다 빠르다 — 술집은 하루가 다르다)
  slots: [2, 5],     // 자리 수 — 도시 size로 스케일된다(큰 항구일수록 사람이 많다)
  band: [2, 6],      // 한 무리의 인원
  emptyOdds: 0.22,   // 빈 자리가 나올 확률 (늘 만원이면 고를 맛이 없다)

  /* 계약금 기준(1인당). 부두 고용(HIRE_UNIT 55닢)보다 **훨씬 싸다** —
     제 발로 배를 찾아온 사람들이기 때문이다. 대신 값은 일당으로 돌아온다.

     ★ 이 값은 감이 아니라 **시작 조건에서 역산한 것**이다(tools/test-tavern.mjs가 지킨다).
       금화 150닢으로 최소 인원(낡은 바사 5명)을 태우고도 첫 항차의 항해비와
       화물값이 남아야 한다. 14닢으로 뒀더니 여섯을 태우는 데 92닢이 나가
       남은 58닢으로는 가장 짧은 항로(제노바 2일·41닢)조차 화물을 못 실었다 —
       "아슬아슬"이 아니라 막다른 길이었다. */
  advanceUnit: 8,
};

/* 기질 — 무리의 성격. 임금·백병 실력·다루기 쉬운 정도가 한 묶음으로 움직인다.
     wageMul  요구 일당 배율 (state.js: CREW_WAGE 1.2에 곱한다)
     advMul   계약금 배율
     troop    백병전에서 이 무리가 서는 병종 (data.js: TROOPS)
     temper   다루기 쉬운 정도 0~1 — 높을수록 참을성이 있다.
              **아직 게임 규칙에 쓰이지 않는다**(급여 체불·충성도가 미구현).
              지금은 화면에 성격으로만 드러나고, 월급 정산을 넣을 때 이 값이 임계가 된다.
     weight   술집에 나타나는 빈도 */
export const CREW_TRAITS = {
  green:   { id: 'green',   name: '애송이',   wageMul: 0.70, advMul: 0.70, troop: 'sailor',   temper: 0.55, weight: 20,
             desc: '바다를 처음 본다. 값이 싸고 그만큼 쓸모도 없다.' },
  steady:  { id: 'steady',  name: '성실하다', wageMul: 1.00, advMul: 1.00, troop: 'sailor',   temper: 0.85, weight: 24,
             desc: '시키는 일을 군말 없이 한다. 오래 데리고 있을 만하다.' },
  thrifty: { id: 'thrifty', name: '검소하다', wageMul: 0.82, advMul: 1.15, troop: 'sailor',   temper: 0.75, weight: 14,
             desc: '계약금을 더 부르는 대신 일당을 덜 받는다. 길게 갈수록 이쪽이 싸다.' },
  salty:   { id: 'salty',   name: '노련하다', wageMul: 1.35, advMul: 1.30, troop: 'gunner',   temper: 0.80, weight: 16,
             desc: '뱃밥을 오래 먹었다. 비싸지만 포와 삭구를 안다.' },
  rough:   { id: 'rough',   name: '거칠다',   wageMul: 1.20, advMul: 1.10, troop: 'swordsman', temper: 0.45, weight: 14,
             desc: '싸움에 이골이 났다. 갑판에서는 든든하고 항구에서는 골칫거리다.' },
  corsair: { id: 'corsair', name: '해적 출신', wageMul: 1.50, advMul: 1.45, troop: 'corsair', temper: 0.35, weight: 8,
             desc: '어느 배를 털었는지는 묻지 않는 편이 좋다. 백병전에서 값을 한다.' },
  drunk:   { id: 'drunk',   name: '주정뱅이', wageMul: 0.55, advMul: 0.55, troop: 'sailor',   temper: 0.25, weight: 10,
             desc: '싸다. 아주 싸다. 그럴 만한 이유가 있다.' },
};
export const CREW_TRAIT_KEYS = Object.keys(CREW_TRAITS);

/* 무리 이름 — 깃발(권역)마다 다른 풀에서 뽑는다. 항구를 옮기면 사람이 달라 보이는 것이
   이 게임에서 "다른 바다에 왔다"를 느끼는 가장 싼 방법이다. */
export const CREW_NAMES = {
  latin:   ['조반니 패', '마테오 형제', '루카의 무리', '베르나르도 패', '도메니코 패',
            '피에트로 형제', '안젤로의 무리', '리카르도 패', '살바토레 패', '토마소 형제'],
  iberian: ['디에고 패', '라몬의 무리', '알폰소 형제', '후안 패', '미겔의 무리',
            '파블로 패', '산초 형제', '엔리케의 무리'],
  greek:   ['니콜라오스 패', '스타브로스의 무리', '디미트리 형제', '얀니스 패',
            '테오도로스의 무리', '마놀리스 패', '코스타스 형제'],
  levant:  ['하산 패', '유수프의 무리', '카림 형제', '무라트 패', '이브라힘의 무리',
            '살림 패', '오마르 형제', '라시드의 무리'],

  /* ── 아홉 바다로 넓히며 더한 풀 ─────────────────────────────
     ★ 없던 동안 **광저우 술집에 조반니 패가 앉아 있었다.** 새 깃발이 전부 `latin`으로
       떨어졌기 때문이다(동아시아 감수자가 잡았다). 항구를 옮겼을 때 "다른 바다에 왔다"를
       느끼게 하는 가장 싼 방법이 사람 이름인데, 그 자리가 통째로 비어 있었다. */
  germanic: ['한스 패', '클라우스의 무리', '디트리히 형제', '오토 패', '베른트의 무리',
             '헤닝 패', '요한 형제', '루드거의 무리'],
  iberoatl: ['주앙 패', '누누의 무리', '디오구 형제', '페드루 패', '바스쿠의 무리',
             '고메스 패', '아폰수 형제'],
  swahili:  ['하미시 패', '주마의 무리', '살림 형제', '바카리 패', '아티 무리',
             '무사 패', '라시디 형제'],
  guinean:  ['콰메 패', '코피의 무리', '아두 형제', '야우 패', '멘사의 무리', '오세이 패'],
  indic:    ['라마 패', '고빈드의 무리', '크리슈나 형제', '나라얀 패', '바수의 무리',
             '체티 형제', '쿤할리 패', '마단의 무리'],
  malay:    ['항 파', '아왕의 무리', '다투크 형제', '라덴 파', '수타의 무리',
             '판글리마 파', '나코다 형제', '와크 파'],
  sinic:    ['진(陳)씨 패', '임(林)씨의 무리', '황(黃)씨 형제', '정(鄭)씨 패',
             '오(吳)씨의 무리', '허(許)씨 패', '채(蔡)씨 형제', '양(楊)씨의 무리'],
  japanese: ['사부로 패', '헤이시로의 무리', '고로 형제', '진베에 패', '야시치의 무리',
             '겐타 패', '이치조 형제'],
  korean:   ['만수 패', '돌쇠의 무리', '삼봉 형제', '억쇠 패', '길동의 무리', '덕구 패'],
  andean:   ['투팍 패', '와만의 무리', '키스페 형제', '마마니 패', '초케의 무리'],
  antilles: ['바카 패', '카오나의 무리', '과라 형제', '시마론 패', '야리마의 무리'],
};

/** 깃발 → 이름 풀. 여기 없는 깃발은 latin으로 떨어진다(도시를 늘려도 안 깨진다). */
export const CREW_NAME_POOL = {
  venice: 'latin', genoa: 'latin', france: 'latin',
  spain: 'iberian',
  hospitaller: 'greek',
  ottoman: 'levant', hafsid: 'levant',
  // ── 아홉 바다 ──
  portugal: 'iberoatl',
  hanse: 'germanic', denmark: 'germanic', sweden: 'germanic',
  burgundy: 'germanic', england: 'germanic',
  swahili: 'swahili', benin: 'guinean',
  oman: 'levant', safavid: 'levant',
  zamorin: 'indic', gujarat: 'indic', vijayanagara: 'indic',
  bengal: 'indic', kotte: 'indic',
  malacca: 'malay', majapahit: 'malay',
  ming: 'sinic', ryukyu: 'sinic', japan: 'japanese', joseon: 'korean',
};

/* 해적 소굴은 깃발이 `pirate`라 **나라를 알 수 없다.** 그래서 이름 풀을 못 고르고
   전부 `latin`으로 떨어져 **쌍서와 계롱 술집에 조반니 패가 앉았다**(동아시아 테스터 보고).
   깃발 하나로는 세 대륙을 못 가르므로 **그 바다를 본다** — 해적도 근처에서 태운다. */
export const PIRATE_NAME_POOL = {
  mediterranean: 'latin', atlantic: 'germanic', africa: 'guinean', mideast: 'levant',
  indian: 'indic', seasia: 'malay', eastasia: 'sinic', caribbean: 'antilles', southamerica: 'andean',
};


/* 해상 이벤트 가중치 */
export const SEA_EVENTS = [
  { id: 'calm',     weight: 40, name: '순조로운 항해' },
  { id: 'wind',     weight: 11, name: '순풍' },
  { id: 'storm',    weight: 12, name: '폭풍' },
  { id: 'drift',    weight: 7,  name: '표류물 발견' },
  { id: 'merchant', weight: 12, name: '상선 조우' },
  { id: 'pirate',   weight: 18, name: '해적 조우' },
  /* ── weight 0 = 확률표로는 절대 안 뽑힌다 ──────────────────────
     `rollSeaEvent`가 **육로·내해 구간에서만** 명시적으로 골라 내보내는 항목이다.
     weight를 주면 합 100이 무너져 조우 빈도가 통째로 흔들리므로 0으로 둔다.
     오스만 내해(마르마라해)와 육로 80km 구간에 코르세어를 띄우는 것은 오류라
     해적을 뺐는데, 그 결과 최적 플레이의 37%가 **무위험 구간**이 됐다.
     바다의 위험을 뭍의 위험으로 갈음한다. → wiki/research-voyage-returns.md */
  { id: 'bandit',   weight: 0,  name: '노상강도' },
  { id: 'toll',     weight: 0,  name: '통행세 징수' },
  /* 관선 임검 — **잔잔한 판정 하나를 잡아서** 바꾼다(`state.js: rollSeaEvent`).
     확률은 자산 누진에 물려 있어 가난할 때는 0이다(`SEIZURE`). */
  { id: 'seizure',  weight: 0,  name: '무역품 몰수' },
];

/** 육로·내해 구간에서 뭍의 사고가 날 확률.
    해상 구간의 평균 조우율(18%)보다 낮게 둔다 — 안쪽 시장이 안전한 것 자체는 맞고,
    다만 **완전 무위험**이어서는 안 된다는 것이 이 값의 취지다. */
export const INLAND_ODDS = 0.12;

/* ── 시장 충격 ────────────────────────────────────────────────
   사료가 지지하는 '대박 항차'는 확률이 아니라 **사건**이다 —
   기근(제노바 밀 1590→91 ×2) · 경쟁 선단 전손 · 독점 붕괴 · 나포.
   ±15% 노이즈(`wobble`)에서 나오는 꼬리는 사료와 모양이 다르다.
   그래서 값이 뛰는 자리를 따로 만든다. → content/voyage-evidence.json */
/* ── 항구 인물에게 사는 것 ────────────────────────────────────
   명부(`npc-figures.js`)의 71명이 `service`를 하나씩 갖고 있다. 값은 사람마다 `fee`로 적혀 있고,
   **여기 있는 것은 그 값이 무엇을 사는가**다. 규칙은 `state.js: buyService`.

   ★ 세를 깎는 것이 둘(문서·밀수)인데 합쳐도 0이 되지 않게 바닥(`tariffFloor`)을 둔다.
     제도는 **피해 갈 수 있어야 하지만 없어지면 안 된다** — 이 세계의 이야기가 거기서 나온다.
   ★ 문서(permit)를 가장 길고 세게 둔 것은 그것이 이 게임의 제도 그 자체이기 때문이다
     (감합·카르타스·인표). 밀수는 짧고 좁다 — 한 항구, 보름. */
export const BOON = {
  tariffFloor: 0.25,       // 아무리 깎아도 원래 세의 이만큼은 문다
  /* ★ 처음엔 90일이었는데 **한 번 사면 사실상 영구**였다 — 첫 계약 하나 값(152닢)에
     권역 전체 −35%가 석 달이면, 갈래 특전(역관 −10%·종친 −55%)과 겹쳐 실효세가 곧바로
     바닥(`tariffFloor`)에 눕는다(완주 플레이 ISSUES #7). **한 철**로 줄인다 —
     문서는 갱신하는 것이고, 갱신하러 그 항구에 다시 들르는 것이 이 인물의 값어치다. */
  permitTariffOff: 0.35,   // 그 바다 전체
  permitDays: 45,
  smuggleTariffOff: 0.30,  // 그 항구만
  smuggleDays: 14,
  repairOff: 0.35,
  repairDays: 20,
  loanMul: 9,              // 수수료의 몇 배를 빌려주나
  loanMin: 400,
  loanRate: 1.25,          // 갚을 때 원금의 이 배
  loanDays: 30,            // 급여일과 같은 주기 — 한 번에 걷힌다
  recruitCrew: 6,
};

/* ── 악명 ──────────────────────────────────────────────────────
   상선을 덮치면 그 깃발에 쌓인다. **잡히지 않아도 소문은 남는다** —
   털린 배가 항구에 닿으면 누가 털었는지 말하기 때문이다.
   ★ 값을 세게 두지 않는다. 약탈을 막으려는 것이 아니라 **공짜가 아니게** 하려는 것이다:
     한두 번은 감당되고, 그것으로 먹고살려 하면 그 바다에서 장사를 못 하게 된다. */
/** 깃발 → 사람들이 부르는 이름. 악명·소문처럼 **세력을 말로 불러야 할 때** 쓴다.
    키는 `sprites/ship.js: FLAGS`와 같다. 없는 깃발은 키를 그대로 보여 준다. */
export const FLAG_NAME = {
  venice: '베네치아', genoa: '제노바', spain: '에스파냐', ottoman: '오스만', france: '프랑스',
  england: '잉글랜드', pirate: '무법자', hospitaller: '기사단', hafsid: '하프스', portugal: '포르투갈',
  hanse: '한자', denmark: '덴마크', sweden: '스웨덴', burgundy: '네덜란드', swahili: '스와힐리',
  benin: '베냉', oman: '오만', safavid: '사파비', zamorin: '자모린', vijayanagara: '비자야나가르',
  gujarat: '구자라트', bengal: '벵골', kotte: '코테', malacca: '말라카', majapahit: '마자파히트',
  ming: '명', joseon: '조선', japan: '일본', ryukyu: '류큐',
};

export const INFAMY = {
  cap: 10,
  tariffPer: 0.22,     // 악명 1당 그 깃발 항구의 세가 +22%
  tariffCap: 1.6,      // 최대 2.6배
  oddsPer: 0.018,      // 악명 1당 조우 확률 +1.8%p
  oddsCap: 0.12,
  decayDays: 40,       // 이만큼 지나면 1이 준다 — 잊히기는 한다
};

export const SHOCK = {
  // 상인 NPC가 털리면 그가 대던 항구에서 그 물건이 귀해진다
  raidMult: 1.55,
  raidDays: 12,
  cap: 2.6,                  // 충격이 겹쳐도 이 이상은 안 오른다
  floor: 0.45,               // 내려가는 쪽도 바닥이 있다

  /* ★ `perDay`는 **세계 전체에서 하루에 몇 건**이냐다. 그래서 도시가 늘면
     한 도시에 사건이 걸릴 확률이 그만큼 묽어진다 — 지중해 16항구 시절에 맞춘 값을
     그대로 두었더니 175항구에서는 **한 도시가 사건을 겪는 데 216개월**이 걸렸다
     (16항구 시절 20개월). "큰돈은 확률이 아니라 사건에서 나온다"는 설계가
     세계를 넓힌 것만으로 조용히 죽은 것이다.
     그래서 밀도로 환산한다 — `state.js: rollShockEvents`가 `CITIES.length / densityBase`를
     곱해 **도시당 빈도**를 16항구 시절과 같게 맞춘다. 바다를 늘려도 사건은 따라 는다. */
  densityBase: 16,

  /* 저 혼자 일어나는 사건들. 조사가 든 유형 넷 중 나포(raid)는 위에 있고,
     나머지 셋이 여기 있다. 값이 **내려가는** 사건을 함께 두는 것이 중요하다 —
     오르기만 하면 "기다렸다 팔면 된다"가 되어 판단이 사라진다.
     → .claude/docs/wiki/research-voyage-returns.md §4-4 */
  events: [
    {
      id: 'famine', name: '기근', kind: 'demand', tone: 'bad',
      mult: 2.0, days: 20, perDay: 0.010,
      goods: ['grain'],
      // 제노바 밀값이 1590→91년에 두 배가 됐다. **사들이던** 도시에만 건다 —
      // 산지에 기근을 걸면 살 곳이 사라져 항로가 통째로 죽는다(콘텐츠가 준다).
      line: (city, good) => `${city}에 흉년이 들었다. ${good}값이 치솟는다.`,
    },
    {
      id: 'blockade', name: '봉쇄', kind: 'demand', tone: 'bad',
      mult: 1.7, days: 14, perDay: 0.008,
      goods: ['grain', 'weapon', 'wine', 'oliveoil'],
      /* ★ 전에는 "함대가 ○○ 앞바다를 막았다"였다. 이 사건은 그 물건을 **사들이는** 도시면
         어디든 걸리므로 바그다드·이스파한·투쿠만처럼 **바다가 없는 도시**에도 함대가 떴다.
         봉쇄는 물길만의 일이 아니다 — 끊긴 것은 앞바다가 아니라 **길**이다. */
      line: (city, good) => `${city}로 들어가는 길이 끊겼다. ${good} 재고가 바닥났다.`,
    },
    {
      id: 'glut', name: '풍작·독점 붕괴', kind: 'supply', tone: 'good',
      mult: 0.62, days: 16, perDay: 0.009,
      goods: null,             // 산지 품목이면 무엇이든
      // 톨파 명반이 무너졌을 때 값이 절반이 됐다. 싸게 살 기회 — 소식을 듣고 달려가는 재미.
      // 품목 이름 뒤에 조사가 붙지 않는 문장으로 적는다. 붙여야 하면 `js/josa.js`의
      // `josa()`를 쓴다 — leaf 모듈이라 data.js에서 불러도 모듈 방향이 깨지지 않는다.
      line: (city, good) => `${city} 부두에 ${good} 자루가 쌓였다. 지금이 살 때다.`,
    },
    /* ── 관세 폭탄 (#6) ────────────────────────────────────────
       ★ 앞의 셋은 **도시×품목**에 걸리지만 이것은 **도시**에만 걸린다(`good: null`).
         `shockFactor`는 품목이 맞아야 곱하므로 시세에는 손대지 않고, `tariffShockFactor`가
         이것만 골라 읽는다 — 사건 배관(`state.shocks`)을 그대로 쓰면서 성질만 다른 것이다.
       ★ **부자일수록 자주 온다** — `rollShockEvents`가 `perDay`에 누진 계수를 곱한다.
         사용자가 *"적당히 돈이 많아지는 시점에 특히 더"*라고 한 자리다.
       사료: 베네치아 decima·제노바 강제공채·카스티야 servicio·오스만 avarız처럼
       비상 재정 수요는 **항구에서 걷는 것부터** 올렸다. 배율·기간은 설계값이다. */
    {
      id: 'levy', name: '관세 폭탄', kind: 'tariff', tone: 'bad',
      mult: 2.2, days: 18, perDay: 0.007,
      goods: null,
      line: (city) => `${city}의 관이 특별세를 매겼다. 입항세가 두 배를 넘는다.`,
    },
  ],
};

/* ── 경쟁 세력 ────────────────────────────────────────────────
   정본은 `.claude/docs/SPEC-factions.md`(값이 왜 그 값인가)와 `story/FACTIONS.md`(세력의 얼굴).
   여기 있는 것은 **1단계 「누가 화났는지가 보인다」**가 쓰는 값 전부다.

   ★ **깃발이 아니다.** 깃발은 도시의 속성이고(28종) 세력은 그 위에 앉은 주체다(10).
     한 세력이 깃발을 여럿 쓸 수도 있고(여는 항구) 아예 없을 수도 있다(푸거 — 배를 안 띄우므로
     **덮칠 수가 없다.** 자본과의 싸움은 칼로 안 풀린다는 것이 규칙이 되는 자리다).
   ★ **어긋난 자리가 곧 이야기다** — 세비야는 카스티야 깃발인데 제노바 장부가 돌고,
     브뤼헤 콘토어는 부르고뉴 도시 안의 독일 구역이고, 암본은 포르투갈 깃발인데 회사가 앉아 있다.
     그래서 세력을 깃발로 대신하지 않고 따로 둔다.
   ★ **연도를 고정하지 않으므로 등장 조건에 연도를 쓰지 않는다.** 세력은 「바다를 밟으면
     만나는 것」이지 「몇 년이 지나면 생기는 것」이 아니다 — 만난 세력은 `state.known`에서 파생한다.
   ★ **「회사」는 이름을 안 준다.** VOC·EIC·설립 연도·본국을 화면 어디에서도 말하지 않는다.
     코드가 먼저 그렇게 부르고 있었다(`seasia/npc-pirates.js`의 「회사 향료 함대」).

   ★★ **이 값들이 주는 것은 전부 뺄셈이다.** 관계가 좋아져도 원래보다 더 벌지 않는다 —
     세율·시세·보수 중 어느 것도 관계가 좋다고 유리해지지 않는다. 눈금의 양수 쪽이 비어 있는 것이
     이 사양의 방어선이고, 그것이 `HEGEMONY` 주석의 *"보상으로 돈이나 수입을 주지 않는다"*와 같은 규약이다.
   ⚠️ **이중과세 금지** — 관계는 세율·조우 확률을 **다시 곱하지 않는다.** 그것은 악명(`INFAMY`)의 몫이고,
     관계가 무는 것은 **접근권**(문서·일감·흥정·입항·시설)이다. */
export const FACTIONS = {
  /* ── 사고파는 자 다섯 (`side: 'trade'`) — 파는 것이 있다 ─────────────── */
  sangiorgio: {
    name: '산 조르조', short: '산 조르조',
    // 갈래는 소설(story/FACTIONS.md §3)의 여섯을 그대로 쓴다.
    // 'crown'(관) | 'company'(회사) | 'guild'(조합) | 'capital'(자본) | 'house'(상단)
    // ★ 'stateless'(무국적)는 세력 목록에 안 넣는다 — `PIRATES` 명부 40이 그 자리다.
    kind: 'capital',
    side: 'trade',                     // 관계도 배치 — 'trade'(왼쪽 다섯) | 'gate'(오른쪽 다섯)
    flags: ['genoa'],                  // 이 세력으로 읽히는 깃발. 비면 깃발이 없다
    seats: ['genova', 'chios', 'sevilla'],   // ★ 최대 3 — 관계도 한 줄에 들어가는 수
    /* ★ **무엇을 파는가** — 이 열이 세력의 정체다.
       'paper'(종이·permit) | 'order'(순서·permit) | 'toll'(세·permit)
       | 'enroll'(자격·등록 · 2단계) | 'money'(loan) | 'price'(흥정·price-tip)
       | 'open'(아무것도 안 묻는다) | 'nothing'(★ 회사 하나뿐 — 안 판다. 대신 벤다) */
    sells: 'money',
    grip: {
      goods: ['alum', 'mastic'],       // 톨파·포카이아의 명반과 키오스의 마스틱
      cities: ['genova', 'chios', 'sevilla'],
      // 쥔 항로 — `map/geo.js: riskKey(a,b)` 형식이고 **가나다(ASCII)순으로 정렬된 키**다
      // (`[a,b].sort().join('|')`). 손으로 적을 때 순서를 뒤집으면 영영 안 걸린다.
      routes: ['athens|chios'],
    },
    fleets: [],                        // ★ 배가 아니라 장부로 이긴다 — 적 명부에 얼굴이 없다
    blurb: '배가 아니라 장부로 이긴다. 남의 전쟁에 양쪽으로 돈을 대고 양쪽에서 이자를 받는다.',
    lines: {
      warn: '“이 배는 산 조르조가 보증했소. 털면 제노바 전체와 싸우는 것이오.”',
      refuse: '“장부에 당신 이름이 붉게 적혀 있소. 이 집은 더 대지 않소.”',
    },
  },
  fugger: {
    name: '푸거 상사', short: '푸거',
    kind: 'capital', side: 'trade',
    /* ★ **깃발이 없다.** 광산과 왕실 대부를 쥐고 배는 남의 것을 산다 —
       그래서 이 세력에는 악명이 안 붙는다(덮칠 배가 없다). */
    flags: [],
    seats: ['antwerpen', 'lisboa', 'danzig'],
    sells: 'money',
    grip: {
      goods: ['copper', 'mercury', 'silver'],
      cities: ['malaga', 'antwerpen', 'danzig'],   // 알마덴의 수은이 말라가로 나온다
      routes: [],
    },
    fleets: [],
    blurb: '깃발이 없다. 광산과 왕실 대부를 쥐고, 배는 남의 것을 산다.',
    lines: {
      warn: '“이 짐은 이미 팔린 것이오. 계약서가 안트베르펜에 있소.”',
      refuse: '“이 집은 당신과 계약하지 않소.”',
    },
  },
  venezia: {
    name: '베네치아 원로원', short: '베네치아',
    kind: 'house', side: 'trade',
    flags: ['venice'],
    seats: ['venezia', 'candia', 'famagusta'],
    sells: 'price',
    grip: {
      goods: ['spice', 'glass', 'sugar'],
      cities: ['venezia', 'candia', 'famagusta'],
      routes: ['alexandria|candia', 'candia|famagusta'],
    },
    fleets: [],
    blurb: '국가가 달력을 짠다. 정기 갤리선단의 자리를 경매로 판다.',
    lines: {
      warn: '“원로원의 화물이오. 손대면 총독이 안다.”',
      refuse: '“리알토에 당신 이름이 붙었소.”',
    },
  },
  hanse: {
    name: '한자 동맹', short: '한자',
    kind: 'guild', side: 'trade',
    flags: ['hanse'],
    // ★ 브뤼헤는 `burgundy` 깃발이다 — 콘토어는 **남의 도시 안의 남의 구역**이라는 것이 그 제도의 정의다
    seats: ['lubeck', 'danzig', 'brugge'],
    sells: 'enroll',                   // 한 철 손님 자격 — 값은 2단계에 붙는다
    grip: {
      goods: ['grain', 'timber', 'herring', 'stockfish', 'amber'],
      cities: ['danzig', 'riga', 'hamburg'],
      routes: ['danzig|lubeck', 'antwerpen|brugge'],
    },
    fleets: [],
    blurb: '배제가 무기다. 세율이 아니라 자격을 쥔다 — 명부에 없으면 부두 밖으로 못 나간다.',
    lines: {
      warn: '“이 배는 명부에 있소. 당신 배는 어느 명부에 있소?”',
      refuse: '“총회가 당신 이름을 지웠소. 부두 밖으로는 못 나가오.”',
    },
  },
  openport: {
    name: '여는 항구', short: '여는 항구',
    kind: 'house', side: 'trade',
    flags: ['malacca', 'majapahit'],
    seats: ['aceh', 'johor', 'makassar'],
    sells: 'open',                     // ★ 파는 것이 없다 — 세가 원래 싸다(마카사르 3%)
    grip: {
      goods: ['pepper', 'sandalwood'],
      cities: ['aceh', 'johor', 'makassar'],
      routes: ['aceh|melaka', 'banten|johor'],
    },
    fleets: [],
    blurb: '아무것도 안 묻는 것을 판다 — “누구든 이 도시에서 장사할 권리가 있다.”',
    lines: {
      warn: '“이 바다는 아무의 것도 아니오.”',
      refuse: '“이 부두는 누구에게나 열려 있소. 당신만 빼고.”',
    },
  },

  /* ── 문을 쥔 자 다섯 (`side: 'gate'`) — 문에 값을 붙인다 ─────────────── */
  estado: {
    name: '에스타두 다 인디아', short: '에스타두',
    kind: 'crown', side: 'gate',
    flags: ['portugal'],
    seats: ['goa', 'cochin', 'macau'],
    sells: 'paper',
    grip: {
      goods: ['pepper', 'cinnamon'],
      cities: ['goa', 'cochin', 'ambon', 'elmina'],
      routes: ['calicut|goa', 'calicut|cochin'],
    },
    /* ★ **이 세력의 함대는 이미 있다.** `FOES`(권역별 등급 1~5)의 넷째·다섯째가 그것이고,
       권역 패권 조건 ③이 그 등급 5를 꺾으라고 이미 말한다. 여기서는 **잇기만** 한다 —
       새 적을 한 척도 만들지 않는다. 어느 바다의 몇 번째 얼굴이 이 세력인가를 적을 뿐이다. */
    fleets: [
      { region: 'indian', tier: 5, name: '포르투갈 인도 함대 기함' },
      { region: 'indian', tier: 4, name: '포르투갈 순찰 함대' },
      { region: 'mideast', tier: 5, name: '포르투갈 인도 함대' },
    ],
    blurb: '종이 한 장으로 바다를 갖는다 — 카르타스 없는 배는 화물이 아니라 증거다.',
    lines: {
      warn: '“통행증을 보여 주시오. 없으면 이 배는 우리 것이오.”',
      refuse: '“고아의 총독이 당신 이름을 적었소. 이 인장은 못 주오.”',
    },
  },
  casa: {
    name: '카사 데 콘트라타시온', short: '카사',
    kind: 'crown', side: 'gate',
    flags: ['spain'],
    seats: ['sevilla', 'havana', 'portobelo'],
    sells: 'enroll',                   // 등록(registro)과 날짜 — 값은 2단계에 붙는다
    grip: {
      goods: ['silver', 'cochineal'],
      cities: ['potosi', 'veracruz', 'havana', 'portobelo'],
      routes: ['havana|sevilla', 'nombrededios|portobelo'],
    },
    fleets: [
      { region: 'caribbean', tier: 5, name: '스페인 은함대 호위기함' },
      { region: 'caribbean', tier: 4, name: '과르다코스타 순찰선' },
      { region: 'atlantic', tier: 5, name: '스페인 은함대 호위기함' },
      { region: 'southamerica', tier: 4, name: '남해 순찰 함대' },
    ],
    blurb: '은은 혼자 못 간다. 함대에 실리지 않은 은은 밀수다.',
    lines: {
      warn: '“등록된 배요. 명단에 없는 배는 여기 못 붙소.”',
      refuse: '“명단에 당신 배가 없소. 등록도 안 받소.”',
    },
  },
  shibosi: {
    name: '명 시박사', short: '시박사',
    kind: 'crown', side: 'gate',
    flags: ['ming'],
    seats: ['guangzhou', 'quanzhou', 'ningbo'],
    sells: 'order',                    // 감합 — 통과가 아니라 **순서**를 판다
    grip: {
      goods: ['silk', 'ceramic', 'tea'],
      cities: ['guangzhou', 'quanzhou', 'ningbo', 'yuegang'],
      routes: ['guangzhou|macau'],
    },
    fleets: [
      { region: 'eastasia', tier: 4, name: '명 수군 순찰선' },
    ],
    blurb: '문을 닫고 그 좁은 문에 값을 붙인다. 감합 없는 배는 왜구다.',
    lines: {
      warn: '“감합을 보이시오. 없으면 연안에 못 붙소.”',
      refuse: '“순서는 규칙이 아니라 내 재량이오. 당신 차례는 없소.”',
    },
  },
  ottoman: {
    name: '오스만 관세청', short: '오스만',
    kind: 'crown', side: 'gate',
    flags: ['ottoman'],
    seats: ['istanbul', 'alexandria', 'aden'],
    sells: 'toll',                     // 카피툴레이션 — 세율이 배가 아니라 조약문으로 정해진다
    grip: {
      goods: ['coffee', 'incense', 'carpet'],
      cities: ['mokha', 'aden', 'alexandria', 'istanbul'],
      routes: ['alexandria|jeddah', 'aden|mokha'],
    },
    fleets: [
      { region: 'africa', tier: 5, name: '오스만 홍해 함대' },
      { region: 'mideast', tier: 4, name: '오스만 홍해 함대' },
      // 지중해 등급 5는 바르바리 기함이다 — 사략이되 이 깃발을 단다
      { region: 'mediterranean', tier: 5, name: '바르바리 기함 알 사파' },
    ],
    blurb: '육로의 목을 쥐고 있다. 세율이 배가 아니라 조약문으로 정해진다.',
    lines: {
      warn: '“세를 낼 때까지 돛과 키와 닻은 창고에 두겠소.”',
      refuse: '“포르테는 당신에게 조약문을 내주지 않소.”',
    },
  },
  company: {
    name: '회사', short: '회사',
    kind: 'company', side: 'gate',
    flags: ['burgundy'],
    seats: ['amsterdam', 'banten', 'ambon'],
    /* ★★ **회사만 아무것도 안 판다.** 그들이 파는 것은 정향이고, 정향은 이미 그들 것이다.
       그래서 이 세력은 관계가 **0에서 내려가기만 한다**(`REGARD.companyCap`) —
       돈으로 회복할 길이 없고, 손을 떼고 삭기를 기다리는 것이 유일한 길이다. */
    sells: 'nothing',
    grip: {
      goods: ['clove', 'nutmeg', 'camphor'],
      cities: ['ternate', 'tidore', 'banda', 'ambon'],
      routes: ['ambon|makassar', 'ambon|banda'],
    },
    /* ★ 몸이 가장 작고 이빨이 가장 크다 — 깃발 도시는 넷뿐인데 등급 4·5 함대가 넷이다 */
    fleets: [
      { region: 'seasia', tier: 5, name: '회사 향료 함대' },
      { region: 'seasia', tier: 4, name: '회사 순찰선' },
      { region: 'southamerica', tier: 5, name: '서인도회사 함대' },
      { region: 'africa', tier: 4, name: '네덜란드 사략 선단' },
    ],
    blurb: '흥정할 수 없는 유일한 상대. 값을 지키는 방법이 파는 것을 줄이는 것이 아니라 자라는 것을 없애는 것이다.',
    lines: {
      warn: '“향료는 우리 창고에만 부리시오.”',
      refuse: '“우리는 당신에게 팔 것이 없소.”',
    },
  },
};

/** 세력끼리의 사이 — **축이 셋이다**(싸움 · 돈 · 배제).
    값이 아니라 **간선(edge) 목록**이고, `story/FACTIONS.md` §4-1 표가 정본이다.
    ★ 셋 다 정적이다 — 판이 굴러도 안 변한다. 변하게 하면 별도 시뮬이 필요한데
      그 결과를 플레이어가 볼 화면도, 바꿀 방법도 없다. **화면에 안 보이는 시뮬은 만들지 않는다.**
    ★ 관계도가 이 셋을 **갈라 그린다** — 실선(싸움)은 전부 세력끼리라 나에게 오는 것이 하나도 없고,
      점선(돈)은 국경을 안 보고, **굵은 선(배제)만 나에게 온다.** 세력이 나를 대하는 방식은
      공격이 아니라 **제외**라는 것이 그 그림의 전부다. */
export const FACTION_TIES = {
  /* 싸움 — 대칭. 게임 근거는 전부 `FOES`·명부의 깃발이다 */
  war: [
    ['estado', 'company'],     // 향료제도의 임자 — 동남아 등급 4·5가 둘 다 burgundy, 암본은 portugal 항구다
    ['estado', 'ottoman'],     // 홍해의 목 — 아프리카 등급 5가 「오스만 홍해 함대」다
    ['estado', 'openport'],    // 해협의 가장 좁은 곳 — 아체~믈라카 요율 9.5(권역 최고)
    ['estado', 'venezia'],     // 후추가 희망봉으로 도느냐 홍해로 오르느냐
    ['casa', 'company'],       // 소금과 카리브의 문 — 퀴라소(burgundy) · 남미 등급 5 서인도회사 함대
    ['ottoman', 'venezia'],    // 지중해
    ['company', 'openport'],   // ★ 여는 항구를 없애는 것이 회사의 사업이다
  ],
  /* 돈 — **방향이 있다**(대는 쪽 → 받는 쪽). ★ 국경을 안 본다 */
  money: [
    ['sangiorgio', 'casa'],    // 은함대를 담보로 왕에게 꿔 준다
    ['sangiorgio', 'estado'],
    ['fugger', 'casa'],        // 알마덴 수은 임차
    ['fugger', 'estado'],      // 리스본 후추 계약
    ['fugger', 'hanse'],
  ],
  /* 배제 — **방향이 있다**(배제하는 쪽 → 당하는 쪽). '*'는 「바깥 전부」이고, 거기 내가 든다 */
  exclude: [
    ['hanse', '*'],            // 콘토어 밖으로 못 나간다
    ['shibosi', '*'],          // 해금 · 감합은 순서를 판다
    ['casa', '*'],             // 등록 없는 배는 명단에 없다
    ['estado', '*'],           // 카르타스 없으면 나포다
    ['company', 'openport'],   // ★ 값 자체를 배제한다 — 나무를 벤다
    ['company', '*'],
  ],
};

/** 관계의 값 — **1단계가 쓰는 것만** 있다.
    ⚠️ `WAR` 블록이 없다는 것을 확인해 둔다. 세력을 이기는 문은 **패권 조건 ③**으로 이미 나 있고
      (`HEGEMONY.bossTier: 5` — 여덟 바다의 등급 5가 나라·회사의 함대다), 같은 것이 둘이 되면 둘 다 죽는다.
    ⚠️ grip 웃돈·입회비·정기선단·가로채기·`enroll`·연대 악명은 **2단계**라 값도 여기 없다 —
      안 쓰는 상수를 미리 두면 화면이 그것을 읽어 **없는 규칙을 말하게 된다.** */
export const REGARD = {
  cap: 10,                 // ★ 악명과 **같은 눈금**이다 — 자를 둘 만들지 않으려고 일부러 같게 뒀다
  decayDays: 90,           // 악명(40일)의 2.25배. **소문은 잊히고 장부는 안 잊힌다**
  contractCap: 6,          // 일감 완수로 오를 수 있는 상한 — 일은 신뢰이지 동무가 아니다
  companyCap: 0,           // ★ `sells: 'nothing'`인 세력은 0 위로 못 올라간다 (회사 하나뿐)
  contractAt: -1,          // 눈총 — 이 아래면 그 세력 도시에 일감이 안 걸린다
  refuseAt: -6,            // 원수 — 이 아래면 그 세력이 파는 것을 안 판다
  /* 다섯 칸 — [아래끝, 위끝, 이름]. 사양(§2-3)은 경계를 숫자 여섯으로 적었는데
     음수 쪽은 안쪽 끝(−1·−6)을, 양수 쪽은 바깥 끝(+1·+6)을 적어 두어 한 방향으로 못 읽는다.
     그래서 **구간을 통째로** 적는다 — 읽는 쪽이 규칙을 다시 짜맞추지 않게. */
  bands: [
    [-10, -10, '바닥'],    // 더 내려갈 데가 없다. 그리고 여기가 끝이다 — 선전포고 같은 것은 없다
    [-9, -6, '원수'],      // 파는 것을 안 판다
    [-5, -1, '눈총'],      // 그 세력 도시에 일감이 안 걸린다
    [0, 0, '모른다'],      // 기본선. 문서·일감·흥정·입항 전부 지금 그대로
    [1, 5, '거래처'],
    [6, 10, '한편'],       // ★ 주는 것은 지출할 자격 · 아는 것 · 안 잃는 것뿐이다(2단계)
  ],
};

/* ══════════════════════════════════════════════════════════════
   튜닝 상수 — 규칙이 아니라 **값**
   ══════════════════════════════════════════════════════════════
   원래 `js/state.js`에 흩어져 있던 것들이다. state.js는 *규칙*(어떻게 계산하나)을
   맡고, 여기는 *값*(얼마인가)을 맡는다 — 밸런스를 만질 때 로직 파일을 열지 않아도 되게.

   ★ `state.js`가 이것들을 그대로 re-export하므로 **기존 import 경로는 그대로 쓴다.**
     `import { CREW_WAGE } from './state.js'`도, `from './data.js'`도 같은 값이다.
   ★ 값을 고치면 근거 파일(`content/*-evidence.json`)도 같은 커밋에서 고친다 —
     `node tools/check-prices.mjs`·`check-wages.mjs`가 어긋나면 실패시킨다.
   ══════════════════════════════════════════════════════════════ */

/* ── 시작 조건 ─────────────────────────────────────────────── */
/* 배는 있고 **사람이 없다.** 선원 0명은 난이도 조정이 아니라 시작의 뼈대다 —
   첫 화면에서 할 수 있는 일이 "술집에 간다" 하나로 좁혀지고, 선장이 맨 처음 내리는
   결정이 매매가 아니라 **누구를 태울 것인가**가 된다.

   ★ 사용자 지정은 **150**이었고 의도는 "아슬아슬하게"였다. 실측하니 150은 아슬아슬이 아니라
     **불가능**이라 200으로 올렸다.

   ★★ 2026-08-17 재측정 — **이 값은 난이도 손잡이가 아니다.** 예전 근거("완주 8/12 · 체불 2/12")는
     시뮬이 삭은 배를 계속 전액 수리하던 시절의 값이라 폐기한다(→ wiki/playtest-log.md §4-2).
     고친 시뮬로 20판씩 다시 재면 이렇다:
       175닢 → **0항차**(선원을 태우고 나면 살 물건이 없어 첫 항해도 못 뜬다)
       180 · 190 · 200 · 210 → 완주 100% · **10항차 금고가 모두 1,072닢으로 같다**
       250 → 첫 배만 9항차로 당겨진다(10항차 1,381닢)
     즉 175와 180 사이가 **절벽**이고, 그 위로는 시작 자금이 초반 곡선을 거의 바꾸지 않는다 —
     10항차쯤이면 시장 깊이와 화물칸이 병목이라 출발선 차이가 씻긴다.
     ⇒ **200을 유지한다.** 낮추면 난이도는 그대로인 채 절벽까지 여유만 줄고, 올리면 첫 배만 빨라진다.
     "아슬아슬"이 옅어진 진짜 원인은 시작 자금이 아니라 **삭은 배를 수리 없이 무한히 몰 수 있다는 것**이다
     (`advanceDays`의 누수는 hp를 1 밑으로 깎지 않는다) → `UNIMPLEMENTED.md`. */
export const START_GOLD = 200;

/* ── 어느 바다에서 시작하나 ────────────────────────────────
   ★ 아홉 바다 전부에서 시작할 수 있다. 고르는 것은 **바다**이고, 그 바다의 부두 하나가 붙는다.
     항구를 175곳 다 늘어놓으면 고르는 일이 숙제가 되고, 막다른 주머니(마포·사카이·카이로·
     이스파한·세부)를 고르면 첫 항해비가 시작 자금에 육박해 게임이 시작부터 막힌다
     (→ `wiki/playtest-log.md` §4-1에서 아홉 바다를 다 눌러 보고 고른 자리들이다).
   ★ `home: true`가 기본값이다 — 지금은 **부산포**다. 조선은 사무역을 금해 열린 부두가 하나뿐인데,
     그 폐쇄성이 곧 이 시작지의 성격이 된다(항로가 마포·하카타 둘뿐이다). */
/* ★ **시작배는 그 바다에서 가장 싼 배다**(사용자 지시 2026-08-26:
     *"주인공은 각 지역의 가장 싸구려배로 시작해야지"*).
   전에는 아홉 어디서 시작해도 `hulk`(낡은 바사) 하나였다 — 지중해 배 한 척이
   광저우에도 아르갱에도 떠 있었다는 뜻이고, 바다마다 얼굴이 다르다는 이 게임의 축과 어긋났다.

   **고른 기준**: 그 바다 배의 **낡은 판**(tier 0 · `leak` 있음 · 시중에 안 나온다).
   지중해의 `hulk`(낡은 바사)가 원래 그 자리였고, 나머지 여덟에 같은 자리를 만들었다.

   ⚠️ **제원은 `hulk`에 맞춘다 — 바다마다 다른 것은 얼굴이지 난이도가 아니다.**
     처음엔 그 바다에서 **가장 싼 정품 tier 1 배**를 줬는데, 그것들은 `leak`가 없고
     속력이 1.7배라 실측에서 **첫 배가 10~16항차 → 1항차**로 무너졌다
     (10항차 금고 899 → 2,144닢 · 40항차 자산 최대 +177%). *"돈은 어렵게 벌려야 재미가 있다"*가
     이 게임의 최상위 원칙이므로 되돌리고, 대신 **낡은 판 여덟 종을 새로 만들었다**(선종 94 → 102).
     콘텐츠는 늘고 곡선은 그대로다. */
export const START_PORTS = [
  { region: 'eastasia',      at: 'busanpo',  home: true, ship: 'oldsahuseon',
    hook: '조선이 바깥과 닿는 유일한 부두. 열린 항로가 둘뿐이라 좁게 시작한다.' },
  { region: 'seasia',        at: 'melaka',   ship: 'oldperahu',
    hook: '두 대양을 잇는 목. 정향과 육두구가 여기서 값을 얻는다.' },
  { region: 'indian',        at: 'cambay',   ship: 'oldyathra',
    hook: '면포와 인디고의 항구. 계절풍이 왕복을 정한다.' },
  { region: 'mideast',       at: 'hormuz',   ship: 'oldjalba',
    hook: '진주와 말이 오가는 좁은 물목. 내해 항로가 육로처럼 굽는다.' },
  { region: 'africa',        at: 'arguin',   ship: 'oldcanoa',
    hook: '사금과 소금이 사막을 건너오는 첫 무역관.' },
  { region: 'atlantic',      at: 'bilbao',   ship: 'oldcrayer',
    hook: '철과 모직물의 북쪽 바다. 폭풍이 잦고 값은 무겁다.' },
  { region: 'mediterranean', at: 'venezia',  ship: 'hulk',
    hook: '유리와 비단의 도시. 항로가 촘촘해 첫 항해가 가장 쉽다.' },
  { region: 'caribbean',     at: 'jamaica',  ship: 'oldpiragua',
    hook: '설탕과 로그우드, 그리고 사략선. 위험이 기본값이다.' },
  { region: 'southamerica',  at: 'salvador', ship: 'oldbalsa',
    hook: '설탕과 담배의 해안. 대양을 건너야 값이 붙는다.' },
];

/** 그 부두에서 시작할 때 타는 배. 못 찾으면 `hulk`(청산 뒤 남는 배와 같다) */
export const startShipAt = (at) => START_PORTS.find((p) => p.at === at)?.ship ?? 'hulk';

/* ── 한반도 출신 갈래 (ORIGINS) ────────────────────────────────
   ★ 사용자 요청: *"한반도의 대항해시대 다양한 주인공을 시작할 수 있게"*.
   조선은 사무역을 금했다 — 그래서 이 나라 사람이 바다로 나가려면 **어떤 문으로 나가느냐**가
   먼저 정해진다. 다섯 갈래는 그 문이 다섯이라는 뜻이고, 아홉 바다의 뼈대(제도·위기·발견·대가)는
   똑같은데 **그 바다를 통과하는 방법**이 갈린다.

   ── 설계 규칙 ──────────────────────────────────────────────
   ① **총가치를 맞춘다.** 자금·선원·배·특전을 합쳐 대략 같은 자리에서 출발하되,
      *무엇이 넉넉하고 무엇이 없는가*가 다르다. 난이도가 아니라 **결이 갈리는 것**이 목적이다.
   ② **특전마다 대가가 붙는다.** 종친은 세를 안 물지만 사람을 못 부리고(감시), 군관은 배와
      사람을 갖고 시작하지만 금고가 비었다. 공짜인 갈래는 없다.
   ③ **`perks`의 키는 `OFFICER.perks`와 같은 자리에서 더해진다**(`state.js: originPerk`).
      부관이 이미 쓰는 다섯(`tariffOff`·`contractUp`·`impactOff`·`haggleOff`·`salvageUp`)은 그대로 쓰고,
      갈래가 필요로 하는 넷은 새로 냈다 — `hireUp`(삯이 비싸진다·양수가 벌점) ·
      `permitUp`(인물의 값이 비싸진다·양수가 벌점) · `meleeUp`(백병) · `repairCut`(수리 할인).
      **새 키를 낼 때는 그것을 읽는 자리를 같은 커밋에서 만든다** — 안 그러면 화면에만 있는 특전이 된다.
   ④ **조선 항구에서만 도는 특전은 `joseonOnly`로 표시한다.** 종친의 면세가 대표적이다 —
      명·일본 관이 조선 종친을 알아줄 이유가 없다. 그것이 이 게임의 "제도는 바다마다 다르다"이다.
      ★ `joseonOnly`는 **특전에만 건다** — `true`(그 갈래의 perk 전부)나 `['tariffOff']`처럼
      키를 골라 적는다(`state.js: originPerk`). **벌점은 여기 넣지 않는다** — 신분은 국경에서
      죽어도(특전 무효) 결격은 보증인이 필요 없다(벌점은 어디서나 산다)는 것이 이 세계의 계급론이다
      (원리 B, `story/PROTAGONISTS.md`). 종친이 그 실례다: 첩지(tariffOff)는 조선 관만 알아주지만
      "지켜보는 눈"(hireUp)은 조정의 눈이라 아홉 바다 어디서나 따라온다. */
export const ORIGINS = [
  {
    id: 'interpreter', name: '역관의 서자', at: 'busanpo',
    gold: 200, crew: 0, ship: 'oldsahuseon',
    line: '왜관의 담 안에서 말을 옮기며 자랐다. 두 나라 말을 아는데 어느 쪽 사람도 아니다.',
    boon: '왜관의 셈을 안다 — 조선 항구의 세가 가볍다',
    cost: '이름이 없다. 문서에 제 이름을 못 올린다',
    perks: { tariffOff: 0.10, joseonOnly: true },
    /* 소설 《구해기》의 주인공이 이 갈래다. 특전이 가장 얇은 대신 **첫날부터 다 열려 있다** —
       기준선이자 기본값이라 여기서 시작해 다른 갈래의 세기를 잰다. */
  },
  {
    id: 'bastard', name: '재상가의 서자', at: 'mapo',
    gold: 1400, crew: 0, ship: 'oldsahuseon',
    line: '아버지는 정승이고 어머니는 종이다. 집에 돈은 있는데 그 돈으로 살 수 있는 것이 벼슬만 빼고 전부다.',
    boon: '집의 이름이 계약서에 먹힌다 — 대형 주문의 보수가 오른다',
    cost: '서얼금고법. 관이 얽히는 자리마다 한 걸음씩 밀린다 — 세가 무겁다',
    perks: { contractUp: 0.18, tariffOff: -0.12 },
  },
  {
    id: 'royal', name: '후궁 소생의 종친', at: 'mapo',
    gold: 900, crew: 4, ship: 'oldsahuseon',
    line: '왕의 피가 절반 섞였다. 그 절반이 평생 감시가 된다.',
    boon: '종친의 첩지 — 조선 항구에서는 세를 거의 안 문다',
    cost: '늘 지켜보는 눈이 있다. 사람을 몰래 부리지 못해 선원이 더디 모인다',
    perks: { tariffOff: 0.55, joseonOnly: ['tariffOff'], hireUp: 0.25 },
    /* `hireUp`은 **삯이 비싸진다**는 뜻이다(양수가 벌점) — 종친의 배에 오르는 것은
       기록에 남는 일이라 사람이 값을 더 부른다.
       ★ `joseonOnly`는 **`tariffOff`에만** 건다(결함 D) — 종친의 첩지는 조선 관만 알아주니
       특전은 조선 밖에서 죽어야 맞지만, "지켜보는 눈"이라는 벌점은 애초에 조정(朝廷)의 눈이지
       조선 세관의 눈이 아니다 — 종친 신분 자체가 감시 대상이라 아홉 바다 어디서 배를 태워도
       그 배에 오르는 사람은 값을 더 부른다. 소설 원리 B("신분은 국경에서 죽고 결격은 안 죽는다")와
       일치시킨다. `true`였을 때는 벌점까지 조선 밖에서 0이 되어 "특전도 벌점도 없는 갈래"가 됐다. */
  },
  {
    id: 'merchant', name: '경강상인의 아들', at: 'mapo',
    gold: 800, crew: 6, ship: 'oldsahuseon',
    line: '한강 나루에서 세곡을 세며 자랐다. 셈은 누구보다 빠른데 신분이 셈을 이긴다.',
    boon: '경강의 셈 — 한꺼번에 사고팔아도 값이 덜 무너진다',
    cost: '상인은 관 앞에서 약하다. 문서가 필요한 자리마다 값을 더 치른다',
    perks: { impactOff: 0.30, permitUp: 0.35 },
  },
  {
    id: 'navy', name: '좌수영의 군관', at: 'yeosu',
    /* 사람을 열넷 데리고 온다 — 삭은 사후선 정원이 **딱 14**라 그들이 다 탄다.
       (정품 사후선은 정원이 여덟이라 넘쳤다. 낡은 판을 만들며 이 갈래에 맞춰 두었다.) */
    gold: 120, crew: 14, ship: 'oldsahuseon',
    line: '판옥선의 노를 세던 손이다. 배와 사람은 아는데 돈을 만져 본 적이 없다.',
    boon: '수군의 갑판 — 사람을 데리고 시작하고, 싸움에서 밀리지 않는다',
    cost: '금고가 비어 있다. 그리고 군항의 문은 사무역에 좁다',
    perks: { meleeUp: 0.20, repairCut: 0.20 },
    /* 여수에서 시작하는 유일한 갈래다. 조선 항구 가운데 **배를 짓는 곳**(industry 2)이
       시작지라, 돈이 아니라 **배**로 앞서 나가는 길이 열린다 → 6부 거북선과 이어진다. */
  },
];

export const ORIGIN_BY_ID = Object.fromEntries(ORIGINS.map((o) => [o.id, o]));
/** 아무것도 고르지 않았을 때의 갈래 — 소설의 주인공이자 기준선 */
export const DEFAULT_ORIGIN = 'interpreter';

/** 아무것도 고르지 않았을 때 시작하는 부두 */
export const DEFAULT_START = START_PORTS.find((p) => p.home).at;

/* ── 항구 서비스 ──────────────────────────────────────────── */
export const REPAIR_UNIT = 14;   // HP 1당 금화
export const HIRE_UNIT = 55;     // 선원 1명당 — 술집 계약금의 일곱 배다(고르지 않는 값)

/* ── 항해비 ────────────────────────────────────────────────
   ★ 임금은 사료 대비 과중했다(→ content/asset-evidence.json). 선원 연봉으로 배를
     몇 척 사느냐로 재면 게임 11배 : 사료 30배였다. 그래서 일당을 절반으로 내리고,
     줄어든 압박을 **성장에 따라 늘어나는 쪽**(선단·무장)으로 옮겼다. */
export const CREW_WAGE = 1.2;      // 1명 1일 — 술집에서 누구를 태웠나로 실제 값은 갈린다
export const SUPPLY_UNIT = 1.3;    // 1명 1일 — 사료에서 식비는 임금과 비슷하거나 더 컸다

/** 대포 유지비(1문 1일) — 화약과 탄약은 쟁여 두는 것만으로 돈이 나간다.
    무장을 늘릴수록 오르므로 "해적이 무서워 포를 더 싣는다"에 대가가 붙는다. */
export const ARM_UPKEEP = { light: 0.5, medium: 0.9, long: 1.6 };

/** 기함 선체 유지 계수 — SHIPS[].upkeep(정박 유지비)에 곱한다.
    정박해 두는 것보다 몰고 다니는 쪽이 더 든다. */
export const HULL_UPKEEP = 1.0;

/* ── 급여 정산 ────────────────────────────────────────────────
   급여는 발생주의다 — 날마다 쌓이고 달마다 **항구에서** 치른다.
   못 주면 반란이 아니라 이탈이고, 떠나는 무리는 값나가는 짐을 들고 간다.
   → .claude/docs/wiki/payroll.md */
export const MONTH_DAYS = 30;
/** 불만이 오르는 정도 — 못 준 비율 × (1 − 참을성) × 이 계수.
    참을성(`CREW_TRAITS[].temper`)이 0.25인 주정뱅이는 0.85인 성실한 무리보다 5배 빨리 오른다. */
export const UNREST_PER_MISS = 1.15;
/** 제때 다 주면 이만큼 가라앉는다. 한 번 밀렸다고 영영 앙심을 품지는 않는다. */
export const UNREST_HEAL = 0.34;
/** 이탈 판정 문턱 — 불만이 이 위로 올라간 무리만 굴린다. */
export const DESERT_AT = 0.55;

/* ── 선원 사무역 (quintalada) — P4-a ───────────────────────────
   ★ **선원은 삯만 받고 타지 않았다.** 제 몫의 짐을 실을 권리(포르투갈 *quintalada*,
   스페인 *pacotilla*, 잉글랜드 *private trade*)가 계약의 절반이었다.
   `content/voyage-evidence.json: privateTrade`가 그 한도를 준다 — 동지중해 항로 1621년에
   선장 £100 · 사관 £10 · 선원 £5(직급 간 20배)이고, 실측 사례에서 사무역이
   **총수입의 20~46%**를 차지했다(Coxere, 1659). 게임에는 이 축이 아예 없었다.

   ★ 왜 이것이 「많이 벌어도 유지비가 같이 오른다」의 정답인가:
     큰 배는 선원이 많다(갈레온 46 · 아르고시 40 · 대형 갈레온 70). 그래서
     **규모가 커질수록 저절로 무거워지고**, `crew`는 이미 속력·백병·나포에 쓰는 값이라
     새 자원을 만들지 않는다. 원양(P1)이 새로 내주는 차익을 이것이 되받아 간다.

   ★ 사료 밴드(20~46%)의 **하단만** 쓴다 — 상단은 게임이 이미 `wages`로 일부 걷고 있어
     이중 과금이 된다. 그리고 **매각 순이익에서만** 뗀다(매출이 아니다):
     매출의 18%를 떼면 마진 8~16%짜리 항차가 통째로 적자가 되고, 그것은 사료가 말한
     "선원이 제 짐을 실었다"가 아니라 "선원이 화주의 원금을 가져갔다"가 된다.
     밑진 거래에서는 떼지 않는 것도 같은 이유다(부관 성과급과 같은 규약). */
export const PRIVATE_TRADE = {
  perCrew: 0.004,   // 선원 1명당 이익의 이만큼
  cap: 0.20,        // 아무리 많이 태워도 여기서 멈춘다 (갈레온 46명이면 −18.4%)
};

/* ── 적하보험 ─────────────────────────────────────────────────
   `map/geo.js: ROUTE_RISK`는 원래 **당대 해상보험 요율(%)**이다. 값나가는 짐을
   위험한 구간으로 나르면 인수업자가 그만큼 뗀다.

   ★ 이 항목이 게임의 성장 브레이크다. 초반엔 곡물·소금을 안전한 이웃 항구로 나르니
     거의 0이고, 커져서 향신료·비단을 먼 구간으로 나르기 시작하면 급격히 무거워진다. */
export const INSURANCE_RATE = 0.30;    // 요율(%)에 곱하는 계수 — 1이면 사료 그대로

/** ★ **원양 구간만 따로 걷는다**(P4-b). `content/upkeep-evidence.json: insurancePremium`이
    1340~1500 지중해 27,659건 중 요율이 적힌 2,259건에서 **중앙값 5% · p90 22%**를 준다.
    그런데 게임 실효는 `INSURANCE_RATE × 항로요율`이라 가장 위험한 원양(risk 9.5~11)에서도
    2.9~3.3%로 **사료 중앙값에 못 미쳤다.** 0.50이면 4.8~5.5%가 되어 중앙값에 닿는다.
    ⚠ 근해(risk 2~5)는 0.30 그대로다 — 실효 0.6~1.5%. 초반 압박을 건드리면 안 된다.
    ⚠ 선단 할인(`FLEET.insureOffCap` −40%)이 곱해지므로 동행 5척이면 원양 실효가
      2.9~3.3%로 돌아온다. **「호위를 데려가면 종전 요율」**이 이 두 값의 뜻이다. */
export const INSURANCE_RATE_OCEAN = 0.50;

/* ★★ 보상률 — **등식 하나가 틀려 있었다.**
   예전 코드는 `INSURANCE_COVER = INSURANCE_RATE`(0.30)였고 주석의 논리는
   *"요율의 30%만 걷으니 보상도 30%"*였다. **그 대칭이 성립하지 않는다** — 둘은
   **서로 다른 것에 곱해진다.** 요율 계수는 *사료 요율*(짐값의 2~10%)에 곱하고,
   보상률은 *실제 잃은 값*에 곱한다. 게임의 실제 사고 기대손실은 짐값의 1.4~2.6%인데
   사료 요율은 2~10%라 **눈금이 애초에 다르다.**
   그래서 실측이 이렇게 나왔다 — 요율 2에서 70%, 요율 6에서 34%, 요율 10에서 **26%**만
   돌려받는다. **위험할수록 더 나빠진다 — 설계 의도의 정반대다.**
   이 파일 스스로 *"보상하는 사건이 없으면 보험이 아니라 세금"*이라 적어 두었는데,
   사건은 생겼고 비율이 안 맞았다.

   ⇒ **보험료는 한 닢도 안 내린다.** 무는 쪽을 걷은 값에 맞춘다:
        cover = clamp( (그 항차에 실제로 낸 요율 ÷ 기대손실률) × INSURE_LOAD, MIN, MAX )
      전 구간이 **낸 것의 90%**로 평평해진다.

   ★ 기대손실률에 **전손(P4-c)까지 넣는다** — 설계문의 식은 투하만 셌는데,
     전손이 생긴 뒤로는 그것이 원양 기대손실의 절반을 넘는다(요율 9.5에서 투하 2.65% vs 전손 4.7%).
     투하만으로 역산하면 원양 공정률이 1.79로 나와 상한에 잘리고, 그러면 **보험이 이문이 된다**
     (낸 4.75%에 7.0%를 받는다). 걷는 쪽(P4-b)과 무는 쪽을 같은 회차에 넣었기 때문에 보이는 자리다. */
export const INSURE_LOAD = 0.90;        // 인수업자의 몫 — 당대 보험은 자선이 아니라 장사였다
export const INSURE_COVER_MIN = 0.30;   // 예전 값. **어디서도 지금보다 나빠지지 않는다**는 보증
export const INSURE_COVER_MAX = 0.95;   // 낸 것보다 더 받을 수는 없다
export const STORM_WEIGHT = 0.12;       // `SEA_EVENTS`의 폭풍 비중 — 공정률을 역산하는 데 쓴다
export const JETTISON_SHARE = 0.40;     // 한 번 던질 때 잃는 몫(기대값 · `jettisonCargo`의 기본 share)

/** 옛 이름 — 하한값과 같다. 새 코드는 `state.js: insureCover(from, to)`를 쓴다. */
export const INSURANCE_COVER = INSURE_COVER_MIN;

/** 폭풍이 투하까지 갈 확률 — 위험한 항로일수록 높다.
    실효 발생률 목표는 15~25항차에 1건 → content/voyage-evidence.json: lossEventPerVoyages */
export const JETTISON_BASE = 0.22;
export const JETTISON_PER_PCT = 0.035;

/* ── 원양 전손 (P4-c) ─────────────────────────────────────────
   ★ **잃는 것이 없으면 판돈이 아니다.** 지금까지 배가 사라지는 길은 전투 패배뿐이었고
   폭풍은 화물 일부만 던지게 했다(`jettisonCargo`). 그래서 「먼 바다로 나가는 것이
   큰 판돈이다」가 규칙으로는 성립하지 않았다.

   근거: `content/voyage-evidence.json: totalLossRate` — 카레라 데 인디아스 1540~1650년
   11,000여 항차 중 519척 상실, **4.7%**. **대서양 원양 항로의 수치이므로 원양에만 건다** —
   근해에 같은 값을 물리면 사료에 없는 벌점이 된다.

   ★ **바닥의 규칙과 어떻게 만나는가**(다른 개발자가 세운 빚→집행→청산):
     기함을 잃으면 **동행선이 있으면 그 배로 갈아탄다**(선단을 사는 또 하나의 이유다).
     동행이 없으면 `liquidate()` — 이미 있는 「바닥」으로 간다. 배와 짐이 가고 낡은 바사
     한 척과 종잣돈이 남으며 **빚도 함께 사라진다**(해상대차: 배가 사라지면 채무도 사라진다).
     즉 전손은 **새 종료 조건이 아니라 기존 청산으로 들어가는 두 번째 문**이다.
   ★ 보험이 화물값의 일부를 문다(`state.js: insureCover`) — 배는 보상하지 않는다.
     당대 선체보험(*casco*)은 적하보험과 따로 든 별개의 계약이었고 이 게임에는 없다. */
export const TOTAL_LOSS = {
  rate: 0.047,      // 기준 항로에서 원양 한 구간당 전손 확률 (21항차에 한 번)
  refRisk: 9.5,     // 그 4.7%가 나온 항로의 요율 — 세비야~아바나가 이 게임에서 9.5다
  /** 삭은 배는 더 잘 가라앉는다. 선체가 성하면 ×1.0, 절반이면 ×1.5, 다 닳으면 ×2.0.
      「삭은 배에 값을 물린다」(C-13)의 마지막 값이 이것이다 — 수리를 미루면 배를 잃는다. */
  hullPer: 1.0,
  cap: 0.12,        // 아무리 험해도 한 구간에 이 이상은 안 굴린다
};

/* ── 뭍의 사고 ────────────────────────────────────────────────
   내해·육로 구간의 위험. 바다와 성격이 다르다 —
     · 노상강도는 **값나가는 것부터** 집어간다(투하와 정반대다. 강도는 고르니까).
     · 통행세는 화물이 아니라 금화를 문다.
   둘 다 보험이 보상하지 않는다. 해상보험은 바다의 위험만 인수했다. */
export const INLAND_LOSS = {
  banditShare: 0.16,      // 실은 것의 이 비율(±)을 뺏긴다
  tollRate: 0.045,        // 화물가치의 이만큼을 금화로 문다
};

/* ── 해적 조우 확률 환산 ──────────────────────────────────────
   요율(%) → 조우 확률. 요율 2%면 10%, 9%면 28%가 되도록 잡았다.
   평균 요율이 5% 언저리라 **전 항로 평균은 종전과 같은 18%**에 머문다 —
   난이도 총량은 그대로 두고 어디가 위험한지만 갈랐다는 뜻이다. */
export const ODDS_BASE = 0.05, ODDS_PER_PCT = 0.026;
export const BASE_RISK = 5.0;                 // 표에 없는 항로가 생겼을 때의 기본값
export const THREAT_PER_SHIP = 0.04;          // 그 구간에 뜬 해적 1척당 +4%p
export const ODDS_CAP = 0.42;

/* 값나가는 짐은 해적을 부른다 — 보험료가 오르는 것과 별개의 두 번째 대가. */
export const LURE_PER = 9000;                 // 화물 가치 9,000닢마다 +1 단계
export const LURE_PER_STEP = 0.05;            // 한 단계에 +5%p
export const LURE_CAP = 0.14;                 // 아무리 실어도 +14%p까지

/* ── 대포의 유효 구간 ────────────────────────────────────────
   near~far를 벗어난 만큼 조준이 무너진다. 멀어질 때(50)보다
   가까워질 때(25)가 두 배 가파르다 — 장포로 코앞을 겨누는 쪽이 더 곤란하다.
   바닥값이 있어 아무리 벗어나도 아예 못 맞히지는 않는다. */
export const ZONE_FAR_FALL = 50, ZONE_NEAR_FALL = 25, ZONE_FLOOR = 0.4;

/* ── 선단·조선소 ──────────────────────────────────────────── */
export const SHIP_RESALE = 0.55;      // 보유선 매각가 (정가 대비)

/* 값 — 공업력에 여유가 있는 항구일수록 싸고, 전통 조선지는 한 번 더 깎아준다.
   같은 배라도 어디서 사느냐로 값이 갈려 "조선 강국까지 가서 산다"는 동기가 남는다. */
export const YARD_SLACK_OFF = 0.07;   // 공업력 여유 1당
export const YARD_SLACK_CAP = 0.15;
export const YARD_TRADITION_OFF = 0.08;

/* ── 동행 선단 (consort) ──────────────────────────────────────
   ★ **보유선이 여러 척인데 함께 몰고 나가는 규칙이 없었다.** `state.fleet`은 선종당 한 척씩
   항구에 매어 두었다가 갈아타는 창고였고, 그동안 나가는 것은 정박 유지비뿐이었다 —
   그래서 "선단"이라는 말이 화면에만 있고 바다에는 없었다.

   기함 1척 + 동행 최대 8척 = **총 아홉 척**을 함께 항해시킨다.
   대항해시대의 선단은 실제로 이 규모였다(콘보이·아르마다·조운선단).

   ── 공짜가 아니다. 대가는 네 갈래다 ────────────────────────────
     ① **사람** — 동행선마다 그 배의 `crewMin`을 따로 태워야 한다. 부두에서 뽑으므로
        계약금은 `HIRE_UNIT`(55닢/인), 일당은 표준 `CREW_WAGE`·`SUPPLY_UNIT`이다.
        **술집 무리가 아니다** — 고르는 값이 아니라 치르는 값이다.
        (배를 정박시키면 그 사람들은 내린다. 계약금은 돌아오지 않는다.)
     ② **선장** — 동행선에는 선장이 있어야 한다. 자리(`state.consorts[key].captain`)만
        만들어 두고 규칙은 **열어 둔다**(`requireCaptain: false`). NPC 동료 등용이
        붙으면 이 값을 `true`로 올리는 것만으로 규칙이 닫힌다.
     ③ **돈** — 동행 중인 배는 정박 유지비가 아니라 **항해비**를 문다
        (선체 `HULL_UPKEEP` + 무장 `ARM_UPKEEP` + 사람 몫). `state.js: consortCost()`.
     ④ **속도** — 선단은 **가장 느린 배**에 맞춘다. 굼뜬 플류트를 끌고 다니면
        기함이 카라벨이어도 플류트 속력으로 간다(`state.js: fleetSpeedPenalty`).

   ── 이득은 둘 ────────────────────────────────────────────────
     · 화물칸이 동행선 `cargo` 합만큼 늘어난다(`cargoCapTotal`).
     · 전투에서 동행선의 포가 함께 쏘고(`consortGuns`), 갑판에 사람을 보태고
       (`consortMelee`), **맞는 것을 나눠 받는다**(`spreadDamage`).
       나눠 받는 대가로 동행선은 **가라앉는다** — 이 게임에서 배를 잃는 규칙이 여기서 처음 생긴다. */
export const FLEET = {
  max: 8,                 // 동행시킬 수 있는 배 수 (기함까지 총 9척)
  /* ★ **켰다**(2026-08-25 · A-5 배선 완료). 동행선에는 선장이 있어야 한다 —
     그 자리에 앉는 것이 `npc-mates.js`의 동료 51명이다. ⇒ **선단 규모가 동료 수에 묶인다.**
     사용자가 한 문장에 *"동료를 모으고 여러배를 같이 운용하고"*를 붙여 쓴 것이 이 구조다. */
  requireCaptain: true,

  /* 동행선에 태울 인원 = 그 배의 `crewMin` × 이 값. 1.0은 "겨우 돛과 키를 다룰 만큼"이다.
     최소 인원만 태우므로 동행선은 저 혼자서는 제 속력을 못 낸다 — 그것이 선단의 값이다. */
  crewRate: 1.0,

  /* 동행선 포문이 기함의 한 발에 얹히는 비율. 1.0이 아닌 이유는 **조준이 따로**이기 때문이다 —
     기함의 조준 미니게임 결과가 동행선 포에까지 그대로 적용되면 아홉 척이 한 몸으로 쏜다. */
  gunShare: 0.40,

  /* 백병전 — 동행선에서 넘어온 손이 갑판 병력을 두껍게 한다.
     유닛 수를 늘리지 않고 **각 유닛의 체력**을 올린다(갑판 그림의 자리가 여섯 칸으로 정해져 있다). */
  meleePerHand: 0.012,    // 손 하나당
  meleeCap: 0.50,         // 아무리 많아도 +50%까지

  /* 맞는 것을 나눠 받는다 — 동행선 1척당 기함이 이만큼 덜 맞는다.
     대신 그 몫은 **동행선의 선체**로 간다. 상한을 두는 이유는 아홉 척이 기함을 무적으로
     만들면 전투가 "배를 몇 척 데려왔나"만 묻는 판이 되기 때문이다. */
  shieldPer: 0.09,
  shieldCap: 0.40,

  /* ── 선단이 「한 척으로는 못 하는 일」을 갖는다 (DESIGN-growth P2) ──────────
     ★ 실측에서 동행 8척은 **하루 +733닢**을 먹고 적재 200→1,588칸이 **전부 무용**이었다
       (시장이 161칸에서 막으므로 · 2일 항차 −1,466닢). 사용자가 명시적으로 요구한 플레이
       (*"여러 배를 같이 운용하고"*)인데 게임이 벌하고 있었다.
     ⚠️ **적재 배수는 주지 않는다.** 161칸 천장은 요구 ⑤(*"무제한으로 무역품을 실을수는 없잖아"*)
       그 자체이고, 밸런스 담당이 §5-L에서 구멍으로 오판했다가 철회한 자리다.
       대신 **없으면 못 하는 일** 셋을 준다 — 선단은 배수가 아니라 **입장권**이 된다. */

  /* ⓐ **원양은 혼자 못 간다.** 사료: 카레라 데 인디아스는 1561년 이후 **함대(flota) 편성이 의무**였고
     무장 갈레온 호위 없는 상선은 출항 허가가 안 났다(포르투갈 카레이라 다 인디아도 같다).
     `content/voyage-evidence.json: lossCause`가 그 이유를 수치로 준다 — **손실 원인의 60%가 코르세어**다.
     ★ 항로 데이터에 필드를 더하지 않고 **요율에서 뽑는다** — `OCEAN_LANES`는 권역 담당이 늘리는
       자리라, 새 항로가 생길 때마다 손으로 적게 하면 조용히 빠진다. 위험이 곧 호위 요구다. */
  escortAt: [[8.5, 2], [6.0, 1]],   // [항로요율 초과, 필요한 동행 수] — 위에서부터 본다
  /* ⓒ **선단이 보험료를 깎는다.** 함대 항해분 요율이 단독보다 뚜렷이 낮았다(같은 `lossCause`가 근거고,
     `insurancePremium`의 p10 0.75% ↔ p90 22%라는 30배 스프레드가 "어떻게 가느냐로 갈렸다"는 증거다).
     ★ 눈금을 `shieldPer/Cap`과 **같은 값으로** 두지 않고 조금 얕게 잡았다 — 전투에서 맞는 것을
       나눠 받는 것과 보험료가 같은 비율일 이유는 없고, 이쪽은 **비용 축**이라 더 조심해야 한다.
     ⇒ 후반 보험이 하루 126닢(비용의 42%)이므로 동행 5척이면 하루 50닢을 깎는다.
       동행 5척 유지비(약 460닢/일)의 11%다 — **깎아 주되 그것만으로는 본전이 안 된다.** */
  insureOffPer: 0.08,
  insureOffCap: 0.40,
};

/* ── 중고선 ───────────────────────────────────────────────────
   신조만 있으면 "그 항구에 가기 전까지는 방법이 없다"가 된다. 실제로도 즉시 손에 넣을 수 있는 배는
   신조가 아니라 **중고선과 나포선**이었다. 항구마다 매물이 사흘 주기로 갈리고,
   나포선을 뜯어 고쳐 파는 항구(`prizeYard`)는 더 자주, 더 싸게 나온다. */
/* ── 항구 거점 (A-1) ───────────────────────────────────────────
   ★ **후반에 금화가 갈 곳이 없었다.** 배 꼭대기(대형 갈레온 42,000닢)를 사고 나면 쓸 데가
   사라져, 완주 플레이가 *"끝을 만드는 것이 규칙이 아니라 지루함뿐"*이라고 적었다.
   소설 검수도 같은 자리를 짚었다 — 게임의 부(富)가 31~45항차에서 꺾여 평탄해지는데
   소설 5·6부는 계속 커진다. **그 격차를 메우는 것은 벌이가 아니라 지출**이다.
   사양은 `story/GAME-LINK.md §8`에서 값까지 확정된 것을 그대로 쓴다.

   ── 다섯 종류는 **서로 다른 것을 산다** ─────────────────────────
     임차창고  가장 싸고 작다. "짐 둘 데"가 처음 생기는 자리
     창고      보관 60칸. ★**보관 중인 화물은 `state.impact`를 누적시키지 않는다** —
               지금 게임에서 성립하지 않는 *"짐을 쪼갠다"*가 이것 하나로 처음 전략이 된다
     상관      창고에 얹는다. 입항세를 깎고 그 항구의 시장을 깊게 한다
     조선대    중고 매물 한 칸 · 수리 −30% · 신조 −8%
     부두      **그 항구의 `industry`를 +1** (상한 3) — A-2 공업력의 첫 계단

   ── 대가 ────────────────────────────────────────────────────
     매입가의 **연 6%**를 30일마다 문다(`upkeepRate`). 못 내면 **압류**된다 —
     거점은 자산이면서 **고정비**다. 그래서 후반이 그냥 부자가 되는 것이 아니라
     "더 벌지 않으면 지킬 수 없는" 구조가 된다. 보험은 거점을 담보하지 않는다. */
export const HOLDINGS = {
  /* ★ **임차창고의 첫 값어치는 짐이 아니라 「소식」이다.**
     전에는 `tariffCut 0 · depthUp 0`이라 **수입 효과가 정확히 0인데** 30일마다 유지비만 나갔다 —
     265곳을 사라는 패권 목표와 정면으로 어긋났고(투자의 14%가 순수 지출), 실클릭 테스터는
     *"처음 가는 항구는 시세를 알 방법이 없어 초행이 늘 손해"*라고 적었다(conquest ISSUES #16 —
     8항차 23일에 6,661 → 5,448닢). 사료가 그 자리를 채운다: **상관망(팩토리아)의 첫 값어치가
     가격 정보**였고, 팩터가 보내는 편지가 곧 상품이었다.
     ⇒ `priceTip`은 보너스가 아니라 **같은 차익을 볼 수 있게** 하는 것이다. 수익을 올리지 않는다. */
  rental:   { name: '임차 창고', store: 20, priceBase: 320,   priceBySize: 90, priceTip: true,
              desc: '남의 창고 한 칸을 빌린다. 짐을 둘 데가 생기고, 그 항구 시세가 내게 온다.' },
  warehouse:{ name: '창고',      store: 60, priceBase: 0,     priceBySize: 8000, requires: 'rental',
              desc: '제 창고를 갖는다. 여기 둔 짐은 시장을 누르지 않는다.' },
  factory:  { name: '상관',      store: 60, priceBase: 0,     priceBySize: 20000, requires: 'warehouse',
              tariffCut: 0.015, depthUp: 0.5,
              desc: '상관을 연다. 세가 가벼워지고 이 항구의 시장이 깊어진다.' },
  slipway:  { name: '조선대',    store: 0,  priceBase: 40000, priceBySize: 10000,
              usedSlots: 1, repairCut: 0.30, buildCut: 0.08,
              desc: '배를 대어 놓고 손본다. 중고 매물이 한 칸 늘고 수리가 싸다.' },
  dock:     { name: '부두',      store: 0,  priceBase: 60000, priceByIndustry: 40000,
              requires: 'slipway', industryUp: 1,
              desc: '부두를 늘린다. 이 항구가 더 큰 배를 짓는다.' },

  /* ── 수익형 부동산 (#5) ──────────────────────────────────────
     ★ 위 다섯은 전부 **내 무역을 돕는** 시설이다 — 짐을 두고, 세를 깎고, 배를 짓는다.
       사용자가 말한 것은 그것이 아니라 *"물건 파는 샵일수도 있고 여관"* — **그 자체로
       돈을 버는** 부동산이다. 그래서 성질이 셋 더 붙는다:

       ① **등급이 있다**(`grades`). 같은 자리를 돈을 더 들여 올린다(`upgradeEstate`).
          값은 **차액만** 문다 — 자리와 자재를 그대로 쓰기 때문이다.
       ② **승급에 공업력이 든다**(`industry`). 부두와 A-2 승급으로 올린 공업력이
          여기서 두 번째 쓸모를 얻는다 — 사용자 원문 *"승급은 공업력으로 올려도 되고"*.
          기존 A-2 부두 승급(`YARD_UPGRADE`)은 **그대로 두고 그 옆에 선다.**
       ③ **공실이 있다.** 이 설계의 심장이다 — 고급 여관이 늘 만실이면 그냥 돈 찍는 기계다.
          공실이면 그 달 세가 **0**인데 유지비(연 6%)는 그대로 나가므로 **마이너스**가 된다.
          공실 확률은 `state.js: vacancyOdds`가 정한다(항구 `size` + 그 깃발의 악명).

     ── 수익률의 근거 ──────────────────────────────────────────
     `yield`는 **매입가 대비 연 총수익률(만실 기준)**이다. 공실 기대치를 곱하고
     유지비 연 6%를 빼면 **순 연 4~8%**로 떨어지는데, 이것이 당대 안전자산의 이율
     (카스티야 `censo al quitar` 5~7% · 베네치아 Monte · 제노바 luoghi 4~7%)과 나란하다.
     → content/asset-evidence.json: estateYield

     ★ **무역보다 쉬우면 안 된다.** 항차 하나의 ROI 중앙값이 10%인데(check-voyage.mjs)
       그 항차가 열흘 남짓이다. 부동산은 **연** 몇 %다 — 두 자리가 통째로 다르다.
       부동산은 돈을 버는 길이 아니라 **번 돈을 두는 곳**이고, 그래서 후반의 지출이다. */
  shop:     { name: '가게',      store: 0, estate: true,
              desc: '물건을 파는 자리를 낸다. 손님이 들면 달마다 세가 들어온다.',
              grades: [
                { name: '노점',     priceBase: 1200,  priceBySize: 900,  yield: 0.110, vacancy: 0.08, industry: 0 },
                { name: '가게',     priceBase: 6000,  priceBySize: 4500, yield: 0.135, vacancy: 0.14, industry: 1 },
                { name: '도매상점', priceBase: 15000, priceBySize: 9000, yield: 0.160, vacancy: 0.22, industry: 2 },
              ] },
  /* 여관이 도박 쪽이다 — 사용자 원문이 *"고급 여관은 비용이 많이들고 공실의 위험이 있지만
     돈은 많이 벌수 있겠지"*라고 여관을 콕 집었다. 가게는 완만하고 여관은 널을 뛴다. */
  inn:      { name: '여관',      store: 0, estate: true,
              desc: '사람을 재우고 먹인다. 벌이가 크고 빈방의 위험도 크다.',
              grades: [
                { name: '선술집',   priceBase: 2000,  priceBySize: 1600,  yield: 0.140, vacancy: 0.16, industry: 0 },
                { name: '여관',     priceBase: 11000, priceBySize: 8000,  yield: 0.180, vacancy: 0.28, industry: 1 },
                { name: '고급 여관', priceBase: 30000, priceBySize: 20000, yield: 0.240, vacancy: 0.42, industry: 2 },
              ] },
};

export const HOLDING_KEYS = Object.keys(HOLDINGS);

/** 등급이 있는 부동산 키만 (`shop`·`inn`) — 화면과 규칙이 이 둘을 따로 다룬다 */
export const ESTATE_KEYS = HOLDING_KEYS.filter((k) => HOLDINGS[k].estate);

/* ── 공실 (#5) ─────────────────────────────────────────────────
   ★ **무엇이 공실을 정하는가**는 이미 게임에 있는 데이터에서만 골랐다:

     `size`   그 항구의 규모. 이 게임에서 size는 이미 **입항세율과 시장 깊이**의 축이라
              "사람과 돈이 얼마나 도는 곳인가"를 뜻한다. 큰 항구일수록 빈방이 덜 난다.
              (사료도 같은 말을 한다 — 임대 수요는 도시 인구·교역량을 따라갔다.)
     악명     그 깃발에 쌓인 악명(`INFAMY`). 털고 다니는 자의 여관에 누가 묵겠나.
              이미 관세·조우 확률에 붙어 있는 값이라 배선을 새로 놓지 않는다.

   계절·시황은 **일부러 뺐다** — 계절은 아직 게임에 없고(#4가 만드는 중), 시황(`shocks`)은
   도시×품목에 걸리는 것이라 부동산에 붙이면 뜻이 흐려진다. 축을 둘로 좁혀 **읽히게** 둔다.

   ★ 판정은 **결정론적**이다(도시·종류·기간의 해시). 시세(`wobble`)와 같은 이유 —
     드나들며 다시 굴릴 수 있으면 공실이 위험이 아니라 귀찮음이 된다. */
export const ESTATE = {
  sizeRelief: 0.06,   // size가 2에서 한 칸 오를 때마다 공실 −6%p
  infamyPer: 0.02,    // 그 깃발 악명 1당 +2%p
  floor: 0.03,        // 아무리 좋아도 이만큼은 빈다
  ceil: 0.72,         // 아무리 나빠도 이 위로는 안 빈다 (막다른 골목 금지)
};

export const HOLDING = {
  upkeepRate: 0.06,     // 매입가의 연 6%
  upkeepEvery: 30,      // 30일마다 청구 (급여일과 같은 리듬)
  industryCap: 3,       // 부두로 올릴 수 있는 상한
  tariffFloorPt: 0.01,  // 상관이 깎아도 이 아래로는 안 내려간다

  /* ★ 한 번은 **문을 닫고**, 두 번째에 넘어간다 — `WORK.seizeAfter`와 같은 모양이다.
     전에는 유예가 없어서 **유지비 3닢을 못 내 2,000닢짜리 거점이 그 자리에서 압류**됐다
     (실플레이 supremacy ISSUES #4 — 압류액과 미납액의 자릿수가 셋 다르다).
     같은 파일 안에서 시설(`settleWorks`)은 휴업을 거치고 거점은 안 거쳤는데,
     그 주석이 적어 둔 이유(*"한 항구의 사고로 전체가 끊기면 도박이 된다"*)는 거점에 더 크게 적용된다 —
     아홉 바다 패권이 **265개 거점**을 전제하므로 미납 한 번이 곧 목표의 후퇴다.
     ★ 유예가 공짜는 아니다: 문을 닫은 동안 **그 거점의 특전이 멈춘다**(창고·상관 세 감면·조선대·부두 공업력).
       유지비도 절반은 계속 나가므로 방치가 답이 되지 않는다. */
  idleRate: 0.50,       // 문을 닫은 동안 무는 유지비 비율
  seizeAfter: 2,        // 이만큼 연속으로 못 내면 압류

  /* ★ **처음 닿은 항구가 이웃의 시세를 연다.** 낯선 항구에서 뱃사람이 먼저 하는 일이
     부두에서 소문을 듣는 것이다. 초행 벌금(값을 모르고 들어가는 손해)을 없애는 자리이고,
     **보너스가 아니라 정보**다 — 차익 자체는 그대로다. 직항 이웃 중 가까운 순으로 이만큼. */
  scoutNeighbors: 3,

  /* ★ 되팔 수 있다 — 다만 **헐값**이다(시설 `WORK.sellBack 0.60`보다 낮다).
     되파는 길이 없으면 금고 0에서 자산을 갖고도 굶는다(ISSUES #3). 그렇다고 후하게 두면
     거점이 저금통이 되어 **패권 265개**가 "샀다 팔았다"로 흔들린다. 40%는 사는 순간 60%가
     증발한다는 뜻이라 **위기의 탈출구일 뿐 전략이 되지 않는다.**
     사료 쪽도 이 방향이다 — 임차창고는 임차라 돌려받을 것이 거의 없고, 급매한 상관·창고는
     제값을 못 받았다. */
  sellBack: 0.40,
};

/* ── 동료 — 코멘다(commenda)가 그 계약 모양이다 ────────────────
   ★ 사용자 요구: *"동료를 모으고 여러배를 같이 운용하고"*. 데이터 51명은 아홉 권역에 다 있었는데
   (`js/regions/<권역>/npc-mates.js`) **배선이 없어 게임에 아무 영향이 없었다**(`UNIMPLEMENTED` A-5).

   ── 계약 모양은 사료가 준다 ──────────────────────────────────
   `content/voyage-evidence.json: commendaSplit` — 1199년 계약 원문 · 381건 데이터셋(Puga & Trefler, QJE 2014).

     **편무 코멘다**  투자자 75% : 항해자 **25%**   · 항해자 자본 0
     **쌍무 콜레간자** 투자자 50% : 항해자 **50%**   · 항해자 자본 **1/3**

   게임에서 **플레이어가 투자자(stans)**이고 동료가 항해자(tractator)다. 그래서 동료의 몫이
   자본을 안 대면 25%, 제 밑천을 보태면 50%가 된다 — **숫자를 지어내지 않고 사료를 그대로 옮긴 것**이다.

   ── 왜 이것이 「자본이 늘 때 무엇이 달라지는가」의 답인가 ─────
   **같은 동료가 초반엔 이득이고 후반엔 비용이다.**
     초반(자본이 병목) — 쌍무로 태우면 그의 밑천이 **내 화물칸을 채운다**. 초반은 칸이 남고 돈이 없다.
     후반(자본이 안 병목) — 25~50%는 **순손실**이다. 대신 그가 **선장 자리**를 채워 배를 한 척 더 데려간다.
   ⇒ 후반에는 *"누구를 데리고 갈 것인가"*를 고르게 된다. 그 고름이 요구 ②의 재미다.

   ⚠️ **강제되지 않는다.** 태우지 않으면 아무것도 안 바뀐다 — 그래서 이 값은 너프가 아니라
     **능력에 붙은 값**이다(동행선을 쓰려면 그때 필요해진다). */
export const COMMENDA = {
  cutSole: 0.25,      // 편무 — 자본을 안 대는 동료의 몫
  cutJoint: 0.50,     // 쌍무 — 제 밑천을 보탠 동료의 몫
  /* 쌍무로 태울 때 동료가 내놓는 밑천 = 그의 계약금(`hire`) × 이 배수.
     사료의 「항해자 자본 1/3」을 게임 눈금으로 옮긴 값이다 — 계약금 340~2,400닢이
     밑천 1,020~7,200닢이 되어 **초반에 실제로 화물칸을 채운다**. */
  stakeMul: 3.0,
  /* 그 밑천은 **돌려준다** — 코멘다는 출자이지 증여가 아니다. 해고하거나 판이 끝나면 원금이 나간다.
     ⇒ 쌍무는 「무이자로 빌리고 이익의 절반을 주는 것」이고, 그래서 **후반에 반드시 비싸진다.** */
  refundStake: true,
  maxRatio: 1.0,      // 동료 수 상한 = 동행 상한(`FLEET.max`) × 이것 — 배 하나에 선장 하나
};

/* ── 삭은 배 ──────────────────────────────────────────────────
   ★ **선체가 눈금이 아니었다.** 누수는 `advanceDays`에서 `Math.min(state.hp - 1, …)`이라
   hp를 1 밑으로 안 깎고, 전투·폭풍도 전부 1(또는 12)에서 잘린다. 그래서 실플레이에서
   **선체 1/55로 16항차를 뛰었고** 가라앉지도 막히지도 않았다(supremacy ISSUES #9 · `UNIMPLEMENTED` C-13).
   매 항해 *"물이 새어 2pt 삭았다. 배를 갈아타야 한다"*만 반복되니 **경고 문장이 거짓이 되고,
   수리비를 아끼는 것이 언제나 옳아진다.**

   ── 무엇을 골랐나 ────────────────────────────────────────────
   C-13의 설계 메모가 셋을 적어 두었다(① 느려진다 ② 짐이 젖어 상한다 ③ 펌프질에 사람이 묶인다).
   **①과 ②를 쓴다** — 둘 다 *막지 않고 값을 물리는* 쪽이라, 이 저장소가 `oceanReady` 주석에
   못박아 둔 원칙(*"항구에 갇히는 일이 없어야 한다"*)을 안 깬다.
   ★ **막는 쪽(강제 정박·출항 금지)을 안 고른 이유가 실측에 있다** — 테스터가 92일차에
     금고 0 · 선체 1에서 **1일 항로 열여섯 항차로 0 → 1,720닢**을 벌어 빠져나왔다. 출항을 막았으면
     그 탈출구가 닫힌다. 3일 항로뿐인 항구에 삭은 배로 서 있으면 영영 못 나가는 새 데드락이 된다.
   ★ **침몰(N4)도 아직 아니다** — 폭풍은 항차당 12%로 나므로(`SEA_EVENTS`) 선체 1에서
     치명적으로 만들면 위 열여섯 항차가 **87% 확률로 끊긴다.** 침몰은 우연이 아니라
     플레이어가 고른 자리(전투)에 붙어야 하고, 그것은 따로 설계할 몫이다.

   ── 왜 이 두 갈래인가 ────────────────────────────────────────
   ①은 **고정비**를 늘린다(일수 ↑ → 삯·보급·유지비 ↑). 짧은 항로는 `max(1, …)`에 걸려 거의 안 변하고
     먼 길만 무거워진다 — *"삭은 배로는 먼 길을 못 간다"*가 규칙이 된다.
   ②는 **성장에 비례**한다. 물이 스미면 상하는 것은 곡물·소금·직물 같은 부피화물이라
     값싼 것부터 잃는다(폭풍 투하 `jettisonCargo`와 같은 규약). 낡은 바사로 곡물 스물을 나르면
     몇 닢이지만, 캐랙에 향신료를 가득 싣고 다니면 항차마다 크게 문다.
     ⇒ **부자일수록 수리한다.** 이 저장소가 반복해 쓰는 "성장할수록만 무거워지는 브레이크"다. */
export const HULL = {
  slowAt: 0.25,     // 선체가 이 비율 밑이면 느려진다 (원양 금지선 `OCEAN_HULL_MIN`과 같은 눈금)
  slowMul: 0.85,
  crawlAt: 0.10,    // 더 밑이면 더 느려진다
  crawlMul: 0.70,
  soakAt: 0.20,     // 이 비율 밑이면 실은 짐에 물이 스민다
  soakRate: 0.02,   // 하루에 실은 칸의 이만큼 (값싼 것부터)
};

/* ── 파산 — 해상대차의 마지막 조항 ────────────────────────────────
   ★ 빚 규칙(`payFine`)이 들어오면서 못 낸 돈이 사라지지 않게 됐는데 **갚을 수단이 함께
   들어오지 않았다.** 실플레이에서 115일차에 금고가 0이 된 뒤 **36일 동안 아무것도 못 했다** —
   살 돈이 없어 못 사고, 실은 것이 없어 못 팔고, 빚이 있어 더 못 빌리고, 배가 한 척이라 못 팔았다.
   빚만 30일마다 ×1.25로 불었다. *게임 오버 없는 게임 오버*다(ISSUES #3).

   ── 왜 이 형태인가 ──────────────────────────────────────────
   답을 **해상대차(bottomry)**에서 가져왔다. 이 계약의 정의가 곧 규칙이다:
   **담보는 배와 화물이고, 배가 사라지면 채무도 사라진다.** 이자가 높았던 이유가 그것이다.
   그래서 채권자는 배를 가져가고 **그것으로 셈이 끝난다** — 빚이 영원히 불어나는 자리가 닫힌다.
   ★ **거점은 못 가져간다.** 부동산은 해상대차의 담보가 아니다(계약 문언이 "ship and cargo"다).
     그 대신 **내가 스스로 헐값에 팔 수 있다**(`HOLDING.sellBack`) — 채권자는 못 가져가고
     나는 던질 수 있다는 이 비대칭이 「파산 전에 무엇을 버릴 것인가」를 판단으로 만든다.
   ★ 판을 끝내지 않는다. 세이브가 있으므로 판이 끝나면 사람이 잃는 것은 그 판의 축적 전부인데,
     그것은 벌이 아니라 처벌이다. 대신 **1일차의 조건으로 되돌린다** — 낡은 바사 한 척과
     면제재산. 거점·관계·악명·아는 항구·해적 명부는 남는다. 소설도 같은 자리를 이렇게 적었다
     (`story/OUTLINE.md` 40장 「마흔한 번째 배」 — *"도경은 완전히 파산한다. 하주로 내려앉아
     남의 배 밑짐 칸을 사는 법을 배운다"* · `story/CHARACTERS.md` — *"아덴의 파산 뒤에도
     삯을 못 받은 채 남는 셋"*).
   ★ 전략적 파산이 되지 않는 이유: 청산에 닿으려면 **금고·정박선·창고 짐을 먼저 다 잃어야** 한다.
     자산이 빚보다 많으면 그 단계에서 집행이 끝나 청산까지 가지 않는다. 곧 청산이 "이득"인
     상황은 **이미 지급불능인 상황뿐**이다. */
export const BANKRUPT = {
  rollsBefore: 2,     // 급여일에 빚을 이만큼 연속으로 못 갚으면 채권자가 집행한다 (= 60일)
  keepShip: 'hulk',   // 값이 안 나가 아무도 안 가져가는 배 — 여기서 다시 시작한다
  seedGold: START_GOLD,   // 면제재산 — **1일차와 같은 조건**이라는 뜻이라 값을 따로 두지 않는다
};

/* ── 공업력 승급 (A-2) ─────────────────────────────────────────
   ★ 도시 `industry`가 **고정값**이라 플레이어가 올릴 방법이 없었다. 그래서 배 사다리의 꼭대기가
   **첫날부터 정해져** 있었고, 거북선이 부산포 공업력 2로 열려 있어 "히든"이 아니었다.
   사양은 `story/GAME-LINK.md §8` A-2 확정값 그대로다.

   ── 금화·자재·공기 3중 ────────────────────────────────────────
   **자재는 실물로 낸다** — 그 항구까지 목재와 철을 실어 와야 한다. 그래서 승급은
   "돈을 쓰는 일"이 아니라 **항로를 짜는 일**이 된다. 여수는 나무가 남고 쇠가 없으며
   염포는 그 반대라, 철갑 거북선은 **둘이 물려야** 나온다.
   구리는 조선에 산지가 없어 **아홉 바다와 끊기지 않는다.**

   ── 대가 넷 ──────────────────────────────────────────────────
     ① 유지비 `boost × 8닢/일` ② 그 항구 자재값 `demand +0.12/등급`
     ③ 입항세 `+0.5%p/등급` ④ **공사 중에는 그 항구의 신조·중고 매물이 0**
   짓는 동안 그 부두가 제 일을 못 한다는 뜻이고, 그것이 이 투자의 진짜 값이다. */
export const YARD_UPGRADE = [
  null,                                                                    // 0단계는 없다
  { gold: 9000,   days: 90,  mats: { timber: 90 } },                       // → 1
  { gold: 34000,  days: 180, mats: { timber: 240, iron: 90 } },            // → 2
  { gold: 96000,  days: 360, mats: { timber: 480, iron: 220, copper: 60 } },// → 3
  { gold: 240000, days: 540, mats: { timber: 900, iron: 420, copper: 120 } },// → 4
];

export const YARD = {
  cap: 4,               // 승급으로 닿을 수 있는 꼭대기
  upkeepPerBoost: 8,    // 하루에 등급당
  demandPerBoost: 0.12, // 그 항구가 자재를 더 비싸게 산다
  tariffPerBoost: 0.005,
};

/* ── 끝 (엔딩) ─────────────────────────────────────────────────
   ★ **이 게임에는 승리도 패배도 없었다.** 배 꼭대기를 사고 나면 금화가 갈 데가 사라지고,
   그 뒤로는 아무 일도 일어나지 않는다 — 완주 플레이가 *"끝을 만드는 것이 규칙이 아니라
   지루함뿐"*이라고 적은 자리다.

   끝을 소설이 이미 정해 두었다(`story/ENDING.md` 「여덟 항구와 한 척」):
   **조선의 항구를 깨우고 철갑 거북선으로 닫는다.** 그 문서가 게임 값까지 확정했으므로
   여기서는 그것을 **조건 셋**으로 옮긴다.

     ① **두 부두를 3까지 올린다** — 염포(1→3)와 부산포(2→3). 여덟을 전부 올리는 안은
        380,000닢·1,800일이라 6부 예산을 넘어(검수 #5) **둘로 한정**된 것이다.
     ② **조선 항구 여섯 곳에 거점을 둔다** — 소설에서 *제도를 심는* 여섯 자리다.
        게임에는 "제도를 심는다"는 규칙이 없으므로 **거점**이 그 자리를 대신한다.
     ③ **철갑 거북선을 짓는다** — 염포 공업력 3에서만 나온다.

   ★ 셋 다 **돈만으로는 안 된다** — 자재를 실어 오고(①③) 유지비를 견뎌야 한다(②).
     그래서 끝이 "부자가 되는 것"이 아니라 **나라에 부두를 남기는 것**이 된다. */
export const ENDING = {
  yards: { yeompo: 3, busanpo: 3 },
  holdingsNeeded: 6,        // 조선 항구 중 거점을 둔 곳
  ship: 'ironclad',
  flag: 'joseon',           // "조선 항구"의 기준
};

/* ── 권역 패권 (지역 패자) ─────────────────────────────────────
   ★ **끝이 하나뿐이었다.** 「여덟 항구와 한 척」은 조선 한정이라, 다른 여덟 바다에서는
   후반 금화가 갈 곳이 `ENDING` 한 줄로만 수렴했다. 아홉 바다 각각을 *제 것으로 만드는*
   중간 목표가 없었던 것이다. 사양은 `.playtest/auto-improve/SPEC-hegemony.md` §2.

   ── 조건 넷 (`state.js: hegemonyOf`) ────────────────────────────
     ① 그 권역 **모든 항구에 거점**(최소 임차창고) — 값이 아니라 **수**를 묻는다.
        내륙 도시도 센다. 거점은 배가 아니라 **장부**가 서는 자리이므로 뭍에도 선다.
     ② 그 권역에 **상관 세 곳** — 세를 깎고 시장을 깊게 하는 자리
     ③ 그 바다의 **최상급 적(등급 5) 격파 이력** — `state.slain`
     ④ 그 권역에서 짓는 **최고 tier 배 보유**(`everOwned`)

   ── 대가와 보상 ──────────────────────────────────────────────
   ★ **보상으로 돈이나 수입을 주지 않는다.** 얻는 것은 이미 있는 이득(세·시장 깊이·매물)뿐이고,
     거점이 늘어난 만큼 **유지비가 무거워지는 것**이 이 목표의 값이다. 새 수입원을 만들면
     "돈은 어렵게 벌려야 재미가 있다"가 통째로 무너진다.
   ★ 아홉 바다 전부를 잡으면 **두 번째 끝**(「아홉 바다」)이 열린다. 조선의 끝(`ENDING`)은
     그대로 둔다 — 둘은 겹치지 않고, 그래서 밸런스 회귀가 없다. */
export const HEGEMONY = {
  factoriesNeeded: 3,   // ② 그 권역 상관 수
  bossTier: 5,          // ③ 격파해야 하는 적 등급 (`ENEMIES[4].level` = 권역 `FOES`의 다섯째)
  homeFlag: 'joseon',   // 한반도 줄이 세는 깃발 — `ENDING.flag`와 같지만 쓰임이 다르다
  /* ④ 최고 tier 배가 **여러 종**인 권역이 있다(지중해 넷·아프리카 둘·중동 둘).
     하나만 몰아 봤어도 인정한다 — 넷을 다 사게 하면 조건이 아니라 벌금이 된다. */
  topShipAny: true,
};

export const USED = {
  priceMul: [0.52, 0.74],   // 정가 대비
  hullMul: [0.45, 0.85],    // 선체 잔량
  slots: 2,                 // 한 항구에 걸리는 매물 수 상한
  cycle: 3,                 // 며칠마다 갈리나 (시세와 같은 리듬)
};

/* ── 나포한 배 ──────────────────────────────────────────────── */
export const PRIZE_HULL = 0.6;    // 나포선은 선체가 상한 채로 들어온다
export const PRIZE_SCRAP = 0.30;  // 해체 시 정가 대비

/** 나포선을 끌고 가려면 **사람을 옮겨 태워야 한다**(prize crew).
    지금 배의 최소 인원을 뺀 남는 선원이 `나포선 최소 인원 × 이 값` 이상이어야 한다.
    ★ 이것이 없으면 낡은 바사(선원 6명)가 브리간틴(4,200닢)을 통째로 끌고 가 사다리를
      다섯 칸 건너뛴다. 값이 0.35인 것은 **불가능이 아니라 대가**로 두기 위해서다 —
      바사도 열둘을 태우면(선실 상한 16) 브리간틴을 몰고 갈 수 있다. 대신 일당이 두 배로 든다.
      "해적을 사냥해 배를 뺏는 길"이 열려 있되 공짜가 아니게 만드는 값. */
export const PRIZE_CREW = 0.35;

/* ── 전리품 상한 — 실어 갈 수 있는 만큼만 ─────────────────────
   전리품은 **진 자의 크기**로 정해지는데, 뜻은 **이긴 자의 크기**로 읽힌다.
   그래서 같은 해적을 잡아도 금고가 200닢인 시기와 20,000닢인 시기에 사건의 뜻이 다르다.
   실측(`node tools/sim-events.mjs`)이 잡아낸 것:
     세기 1 해적 하나 = 금화 300~1,160 + 나포선 ≈ **시작 자산의 573% · 항차 순이익의 39배**.
     첫 배로 좀도둑 하나만 잡으면 곧바로 코카(1,100)를 사고 초반이 통째로 사라졌다.

   고치는 방향은 "해적을 가난하게" 만드는 것이 아니다(그러면 후반 현상금이 죽는다).
   **옮겨 실을 수 있는 양에 한계를 두는 것**이다 — 낡은 바사 갑판에 여섯이 서서
   갤리엇의 금고를 통째로 옮길 수는 없다. 규칙은 `state.js: capLoot()`.

   그래서 큰 배로 큰 놈을 잡을수록 실제로 더 받는다(사다리는 유지) —
   다만 **한 건이 다음 배를 통째로 사 주지는 않는다.** */
/* 값을 고른 근거 — `node tools/sim-events.mjs`로 세 단계를 재고 맞춘 것이다.
   목표는 "**어느 단계에서든 한 판이 자산의 절반쯤**, 세기가 오를수록 더".
     0.45/0.18 → 초반 세기1이 자산의 198%였다(도주 −34%와 견주면 여전히 싸우는 게 정답).
     0.30/0.12 → 초반 109% · 중반 52% · 후반 48%. 싸움이 도박이 되고 도주가 선택지가 된다. */
export const SPOILS_SHARE = 0.30;   // 가용자산(금고+실은 짐)의 이만큼까지는 그대로 받는다
export const SPOILS_TAIL = 0.12;    // 그 위로는 이만큼만 — 현상금 큰 놈이 여전히 더 값나가게
export const SPOILS_FLOOR = 60;     // 빈털터리여도 이만큼은 (상한이 0이 되어 재기가 막히는 것을 막는다)
/** 노획 화물은 **품목 수**로 갈린다(씬이 품목마다 3~11개를 옮겨 싣는다).
    선원 이만큼마다 한 품목씩 더 — 갑판에 사람이 많아야 화물칸을 다 털 수 있다. */
export const SPOILS_GOODS_PER_CREW = 25;
export const SPOILS_GOODS_CAP = 4;

/* ── 해적 명부 — 「해적을 다 무찌른다」 ────────────────────────
   사양 정본은 `.claude/docs/SPEC-supremacy.md` §1. 여기는 그 값만 둔다.

   ── 무엇을 세는가 ────────────────────────────────────────────
   **권역 `npc-pirates.js`의 `PIRATES` 명부뿐이다(전 세계 40명).** 셋 중 하나를 골라야 했다:
     ⓐ `PIRATES` 명부 ← 채택. 이름·소굴·순회로·현상금이 붙은 **사람**이고, 유한하고, 세계에서 하나뿐이다
     ⓑ 권역 `FOES` 다섯 — 사람이 아니라 **얼굴표**(등급별로 이름·깃발·선체만 갈아 끼우는 스킨)다.
        *이름 없는 자를 다 잡았다*는 문장이 성립하지 않는다
     ⓒ 살아 도는 `state.npcs` 13척 — 정원은 세계의 **밀도**이지 인구가 아니다.
        여기를 세면 "다 잡았다"가 영영 안 닫힌다
   판정 키는 **이미 있다** — `state.js: recordSlain`이 `state.slain['pirate:<명부id>']`에
   격파일을 적어 두고 *"판정에는 안 쓰지만 공짜로 남겨 둔다"*고 주석한 그 값이다(`rosterKey`).
   새 기록 장치를 만들지 않는다.

   ── 딜레마: 영구인가 일시인가 ────────────────────────────────
   다시 생기면 목표가 안 닫히고, 안 생기게 하면 그 바다가 심심해진다. 세 겹으로 푼다.
     ① 닫힌 명부는 후보에서 **영구히** 뺀다(`world.js: pickDef`) → 왕직은 두 번 오지 않는다
     ② 정원 `NPC.pirates` 13은 **한 척도 안 줄인다** → 바다는 절대 비지 않는다.
        **위험도·조우 확률·`pirateThreat()`가 한 줄도 안 움직인다**
     ③ 사라지는 것은 안전이 아니라 **이름과 현상금**이다 — `bounty`는 명부 해적에게만 붙어 있으므로
        명부를 닫을수록 그 바다의 **전리품 위쪽 꼬리가 마른다**. 위험은 그대로인데 수입이 준다
   ★ 바다를 청소한 보상이 *"안전해졌다"*가 아니라 *"만나는 자가 바뀐다"*인 것 —
     `HEGEMONY`의 무보상 원칙과 같은 모양이다. 그래서 **패권 조건에 넣지 않는다**(장식 줄만 선다).

   ── 값 ───────────────────────────────────────────────────────
   `tameMult`는 **초무(招撫)** — 격파 대신 소굴 항구에서 값을 치러 명부를 닫는 길이다.
   정지룡은 1628년 초무를 받아 관군이 되고도 하던 일을 안 바꿨고, 무라카미 수군은
   애초에 털지 않고 과소기(過所旗) 값을 받았다(둘 다 명부 `blurb`에 이미 적혀 있다).
   ★ 이 길이 있어야 "사람은 이길 수 있는 상대만 싸운다"는 전제와 양립한다 —
     못 이길 상대를 만나도 길이 막히지 않고, 대신 **격파보다 비싸다**:
     격파하면 현상금을 **받고**, 초무하면 그 상한의 두 배를 **낸다**(전 세계 40명이면 302,360닢).
   `tip*`은 `service: 'bounty-tip'` — 그자가 지금 어느 구간을 도는지를 파는 값이다.
   우연에 기대는 목표는 목표가 아니므로 **찾아갈 수 있게** 한다(`UNIMPLEMENTED N5`).
   정보상 `fee`(70~240)와 같은 자릿수가 되도록 현상금의 5%에 하한 200닢을 뒀다. */
export const ROSTER = {
  tameMult: 2.0,    // 초무값 = `bounty[1] × 이 배수` (§6-2 밸런스 판단)
  tipRate: 0.05,    // 소식 값 = `bounty[1] × 이 비율`
  /* ★ **하한을 현상금에 묶는다**(P6-4). 고정 200닢이던 시절 그 값이 **세기 1의 현상금 하한(180닢)보다
     비쌌다** — 명부 40명 중 여섯이 그랬고, 곧 **사다리의 첫 칸이 마이너스로 시작**했다.
     `tipRate 0.05`가 200을 못 넘어 세기 1~3 전부가 같은 값을 물던 것도 같은 뿌리다.
     ⇒ `max(bounty[0] × bountyFloorRate, bounty[1] × tipRate)` — **잔챙이 정보는 싸지고
       거물 정보는 그대로다.** 정보상 `fee`(70~240)와 자릿수가 어긋나지 않는 선에서 골랐다. */
  bountyFloorRate: 0.35,   // 현상금 **하한**의 이 비율이 소식값의 바닥
  tipFloorAbs: 40,         // 그래도 공짜는 아니다 — 절대 바닥
  tipDays: 20,      // 그 소식이 유효한 날수 (해적도 그동안 돌아다닌다)

  /* ── 초무는 「돈으로 지우는 길」이 아니라 「내 편으로 만드는 길」이다 ──────────
     ★ 값만 사료에서 가져오고 **효과를 안 가져왔다.** 그 결과 초무는 경제적으로 죽어 있었다 —
       이길 수 있으면 격파가 언제나 압도적이고(세기 5: 격파 +19,656 대 초무 −24,000),
       *"못 이길 상대"*가 사실상 없어서 그 길이 한 번도 안 열린다.
     ★ **사료는 그 답을 이미 명부 `blurb`에 적어 두었다** — 둘 다 *사라진 사람*이 아니라 *일해 준 사람*이다:
       · 정지룡  *"관직을 받은 뒤에도 값만 올랐지 하는 일은 그대로다"* — 1628년 초무로 해방유격이 되어
                 **다른 해적을 소탕했다.** 그자가 동료의 소재를 안다 ⇒ **토벌 협조**(남은 명부의 소식이 싸진다)
       · 무라카미 수군 *"배를 털지 않는다. 지나가는 값을 받는다"* — **과소기(過所旗)**를 주고
                 세토내해 전 구간의 **안전 통행을 보장**했다 ⇒ **그 바다에서 덜 만난다**
     ⇒ **`tameMult 2.0`은 그대로 둔다.** 값을 올리거나 내리지 않고 **효과를 붙이는 것**이 전부다.
       그러면 초무는 「지금 못 이길 상대」가 아니라 **「그 바다를 오래 쓸 사람」의 선택**이 된다 —
       한 번 지나갈 사람에게는 여전히 비싸고, 100항차를 굴릴 사람에게는 남는 장사다.
     ★ **supremacy ISSUES #26이 여기서 함께 풀린다** — *"초무한 자가 39일 뒤에 내 항로를 막았다"*.
       고칠 자리는 「그자를 지우는 것」이 아니라 **「그자가 내 배를 안 건드리는 것」**이었다.
       (지우는 쪽으로 먼저 고쳤다가 이 설계를 받고 되돌렸다 — 지워도 정원이 안 줄어
        `standIn`이 얼굴 없는 배로 그 자리를 채우므로 **바다가 하나도 안 안전해졌다.**) */
  passOddsOff: 0.12,   // 과소기 — 초무 1명당 그 권역 조우 확률 **상대감소**
  passOddsCap: 0.40,   // 그 권역 상한
  tipOffPer: 0.20,     // 토벌 협조 — 초무 1명당 그 권역 남은 명부의 소식값 −20%
  tipOffCap: 0.60,
  /* 과소기는 **갱신하는 것**이었다(`BOON.permitDays`가 이미 같은 논리다).
     그 바다에 거점이 없으면 반년 뒤 식는다 — 이름을 대 줄 사람이 그 항구에 없기 때문이다. */
  tameGraceDays: 180,
};

/* ══════════════════════════════════════════════════════════════
   수직계열화 ① — 가공 사슬과 가공장 (A-9 1단계 · 직물 세 갈래)
   ══════════════════════════════════════════════════════════════
   사양 정본은 `.claude/docs/SPEC-vertical.md`. 여기는 그 값만 둔다.

   ── 이 장치가 먼저 답해야 하는 것 — "돈이 쉬워지지 않는가" ──────
   ★ **사슬은 시세보다 비싸다.** 원료를 시세로 사서 가공하면 그 완제품을 산지에서
     사는 것보다 손해다. 밸런스 감이 아니라 아래 **가공마진 밴드**와 기존 `SPREAD 0.70`이
     만드는 산술적 결과이고, `node tools/check-chain.mjs`가 그것을 지킨다:

       1.08 ≤ (산출 기준가 × 수량) ÷ Σ(투입 기준가 × 수량) ≤ 1.25
       가공비(현금) = 산출 기준가 합 × 0.10          ← 밴드의 절반을 먹는다

     밴드 하한 1.08 — 그 아래면 가공비 10%에 먹혀 **어떤 조건에서도 손해**라 시설이 죽는다.
     밴드 상한 1.25 — 그 위면 *"시세로 사서 가공해도 남는"* 구간이 생기고,
                      그 순간 수직계열화는 **새 수입원**이 된다(`HEGEMONY` 주석이 금한 것).

   ── 그러면 왜 짓는가 ─────────────────────────────────────────
   1단계(가공장만)에서는 **거의 안 남는 것이 정상이다.** 남기 시작하는 것은 2단계에서
   농장·광산이 원료를 원가로 대 줄 때다(그 원가분은 `impact`를 쌓지 않는다).
   곧 이 층은 **혼자 사면 벌을 받는 층**이고, 그것이 "수직계열화"라는 말의 정직한 번역이다.

   ── 브레이크는 새로 만들지 않았다 ────────────────────────────
   ① 대량거래 벌점을 **투입 비율만큼 더** 받는다 — 사라사 20칸을 만들려면 면포 20 + 인디고 10을
      사야 하므로 `impact`가 원료 쪽에 30만큼 쌓인다. 기존 `MARKET.cap 0.50`이 사슬 맨 앞에서 문다
   ② 고정비가 규모에 비례해 붙는다 — 들인 돈의 **연 10%**를 30일마다(거점 6%보다 무겁다)
   ③ 자본이 배 밖에 묶이고 매각하면 **40%가 증발한다**(회수율 0.60)
   ④ 기다리는 것이 공짜가 아니다 — `waitDays()`가 정박 급여·유지비를 문다

   ⚠️ 이름 — 상태는 **`state.works`**다. `state.industry`로 지으면 `city.industry`(공업력)·
      `state.yards`(공업력 승급)와 셋이 뒤섞인다. 그리고 `HOLDINGS`에 얹지 않는다 —
      `hegemonyOf`가 `state.holdings`를 세므로 같은 그릇에 담으면 **패권 조건이 조용히 바뀐다.**
   ══════════════════════════════════════════════════════════════ */

/* 가공 사슬. `in`/`out`은 화물 칸 수이고 `req`는 그 항구에 필요한 **공업력**이다.
   ★ **정수 수량은 밴드에서 역산한 값**이다 — 사료가 말해 주는 것은 비율의 *방향*
     (원면→면포 무게 손실 ~35% · 염색은 천에 염료를 얹는 일이라 천이 주재료)뿐이고,
     그 방향 안에서 밴드에 드는 정수를 고른 것이다. 근거는 `content/chain-evidence.json`.
   ★ **사슬이 사슬을 먹는다** — 날염은 방직의 산출(면포)을 투입으로 받는다.
     그 자리가 있어야 "계열화"라는 말이 성립한다(원면 → 면포 → 사라사, 2단 사슬). */
export const CHAIN = [
  {
    id: 'weave_calico', name: '방직', work: '직조장(면)',
    in: { cotton: 3 }, out: { calico: 2 }, req: 1,
    // 145×2 ÷ 78×3 = 290/234 = **1.239** — 밴드 상단이다.
    // 원면은 씨를 빼고 빗고 잣는 동안 무게가 3분의 1쯤 준다(3:2가 그 방향이다).
    blurb: '원면을 자아 실로 만들고 베틀에 걸어 무명을 짠다.',
  },
  {
    id: 'print_chintz', name: '날염', work: '염색장(사라사)',
    in: { calico: 2, indigo: 1 }, out: { chintz: 2 }, req: 2,
    // 320×2 ÷ (145×2 + 260) = 640/550 = **1.164**
    // 염색은 천을 늘리지 않는다 — 그래서 면포 2칸이 사라사 2칸이 되고, 값의 차이는
    // 인디고와 손이 만든다. 공업력 2를 요구하는 것은 매염·날염이 도시의 기술이었기 때문이다.
    blurb: '무명에 밑그림을 찍고 인디고에 담가 무늬를 낸다.',
  },
  {
    id: 'dye_scarlet', name: '주홍 염색', work: '염색장(주홍)',
    in: { woolcloth: 2, cochineal: 1 }, out: { scarlet: 2 }, req: 2,
    // 510×2 ÷ (210×2 + 460) = 1020/880 = **1.159**
    // ★ 이 사슬만 **대서양을 한 번 건너야** 만들어진다 — 모직은 플랑드르·잉글랜드,
    //   코치닐은 누에바에스파냐다. 수직계열화의 진짜 대가가 돈이 아니라 **항로**라는 것을
    //   세 갈래 중 이것이 가장 분명하게 말한다.
    blurb: '고급 모직을 코치닐 물에 넣어 그 시대 가장 값나가는 붉은색을 낸다.',
  },
];

export const CHAIN_BY_ID = Object.fromEntries(CHAIN.map((r) => [r.id, r]));

/* 시설 — 1단계는 **가공장 하나뿐**이다. 농장·광산(`farm`·`mine`)·판매소(`shop`)는 2·3단계.
     값 = (priceBase + 산출 품목 base × priceByOut) × TIER_MUL[요구 공업력]
   직조장(면) 20,600 · 염색장(사라사) 46,710 · 염색장(주홍) 67,230 —
   대형 갈레온(42,000)과 같은 자릿수다. 곧 **배 꼭대기를 산 뒤에 갈 곳**이지
   초·중반의 선택지가 아니다(그것이 이 층의 설계 목표다). */
export const WORKS = {
  mill: {
    name: '가공장', priceBase: 9000, priceByOut: 80, perPort: 3,
    desc: '원료를 창고에서 꺼내 가공품으로 바꾼다. 창고가 먼저다.',
  },
};

export const WORK = {
  /* ★ 이 두 줄이 이 문서 전체에서 가장 중요하다 — 벗어나면 `check-chain.mjs`가 **실패**시킨다
     (근거 없음이 아니라 **규칙이 자기모순**인 경우라, 이 저장소의 "실패 vs 경고" 선에서 실패 쪽이다). */
  marginMin: 1.08,
  marginMax: 1.25,
  feeRate: 0.10,            // 가공비 = 산출 기준가 합 × 이 값 (착수할 때 현금으로)

  tierMul: { 0: 1.0, 1: 1.0, 2: 1.35, 3: 1.8 },   // 요구 공업력이 값을 올린다
  /* 승급 값 — 그 등급에 **새로 내는** 몫이다(누적하면 1 + 0.80 + 1.30 = 총 3.10배).
     2등급이 1등급보다 싼 것은 자리와 건물이 이미 있기 때문이다. */
  levelMul: { 1: 1.0, 2: 0.80, 3: 1.30 },
  levelCap: 3,

  millPerDay: { 1: 3, 2: 5, 3: 8 },   // 하루에 뽑는 **산출 칸** 수
  setupDays: 2,                       // 소요 일수 = setupDays + ceil(산출 수량 ÷ 하루 처리)

  /* 유지비 — 거점(연 6%)보다 무겁다. **사람이 붙기 때문**이다.
     못 내면 거점처럼 곧바로 압류하지 않고 **휴업**을 한 번 거친다 — 사슬은 여러 항구에
     걸치므로 한 항구의 사고로 전체가 끊기면 "수직계열화"가 도박이 된다.
     대신 휴업 중에도 절반은 나가므로 방치가 답이 되지는 않는다. */
  upkeepRate: 0.10,
  upkeepEvery: 30,
  idleRate: 0.50,           // 휴업 중에는 유지비를 이만큼만 문다
  seizeAfter: 2,            // 이만큼 연속으로 못 내면 압류 (그 항구 works + stored 전부)

  sellBack: 0.60,           // 매각 회수율 — ★ 사면 40%가 즉시 증발한다
  perPort: 6,               // 한 항구에 세울 수 있는 시설 수 (2단계까지 내다본 상한)
};
