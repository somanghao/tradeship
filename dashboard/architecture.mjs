// architecture.mjs — 이 프로젝트가 어떻게 갈라져 있는가 (계측 계열 · DOM 없음)
//
// 오버뷰 탭이 읽는 정본이고, `tools/check-architecture.mjs`가 **실제 파일과 대조**한다.
// 문서로만 두면 파일이 늘거나 줄 때 조용히 낡는다 — 그래서 기계가 지키게 했다.
//
// 이 파일이 답해야 하는 것 셋:
//   ① 무엇이 어느 계층에 있나 (트리)  — **권역 계층은 파일이 규칙적이라 생성한다**
//   ② 런타임에 **만들어지는** 것은 무엇인가 (동적 생성물)
//   ③ 게임이 **들고 있는** 것은 무엇인가 (상태 · 세이브 대상)

import { REGIONS } from '../js/regions/index.js';

/** 권역 폴더마다 반드시 있는 일곱 파일. 권역이 늘면 트리도 저절로 는다 —
    손으로 적으면 권역 하나 늘 때마다 일곱 줄을 빠뜨릴 자리가 생긴다. */
export const REGION_FILES = [
  ['geo.js', '도시 좌표·항로·위험도·해류'],
  ['trade.js', '산지/수요지 배율 + 입항세 오버라이드'],
  ['goods.js', '이 권역이 세계에 처음 들여오는 교역품'],
  ['ships.js', '이 권역에서 짓는 선종'],
  ['npc-traders.js', '무역상 — 순회로·계절'],
  ['npc-pirates.js', '해적 — 소굴·사냥 구간·계절'],
  ['npc-figures.js', '항구 인물 — 중개인·정보상·밀수업자…'],
  ['npc-mates.js', '동료(항해사) — 선장·항해장·포술장·갑판장·선의·통역·화물장'],
];

/* ── ① 계층 ────────────────────────────────────────────────────
   위에서 아래로 의존한다. 거꾸로 가는 화살표가 생기면 그것이 곧 설계 붕괴다:
     값 → 규칙 → 화면        (규칙은 화면을 모르고, 값은 규칙을 모른다)
     그림은 어디서든 부르지만 게임 상태를 모른다
     근거는 값과 짝이고, 검증이 그 둘을 대조한다 */
export const LAYERS = [
  {
    id: 'data', name: '값 (데이터)', color: '224,164,92',
    what: '얼마인가. 밸런스를 만질 때 여는 곳 — 로직 파일을 열 일이 없다.',
    files: [
      ['js/data.js', '적·부관·술집·시장·계약 + **튜닝 상수 전부**. 교역품·도시경제·선박은 권역에서 모은다'],
      ['js/map/geo.js', '지리 **합성 계층** — 권역 조각을 모아 예전과 같은 이름으로 내놓는다(값은 없다)'],
      ['js/npc/config.js', 'NPC 튜닝값(숫자만)'],
    ],
  },
  {
    id: 'region', name: '권역 (세계 데이터)', color: '224,196,120',
    what: '세계는 권역으로 갈라져 있고 **권역마다 자기 400×225 좌표계**를 쓴다. '
        + '권역 폴더는 서로를 import하지 않는다 — 합치는 것은 `js/regions/index.js` 하나뿐이라 '
        + '여러 사람이 각자 바다를 동시에 손봐도 같은 줄에서 부딪히지 않는다. '
        + '권역이 늘면 이 트리도 저절로 는다 — 손으로 적으면 권역 하나에 일곱 줄을 빠뜨릴 자리가 생긴다.',
    files: [
      ['js/regions/index.js', '권역 목록 · **원양 항로**(권역을 잇는 선) · 조각 합성'],
      // 동아시아만 선박이 나라별로 갈려 있다 — 세 나라를 동시에 손볼 때 같은 줄에서 안 부딪히게
      ['js/regions/eastasia/ships-ming.js', '명(중국)의 배 — ships.js가 합친다'],
      ['js/regions/eastasia/ships-joseon.js', '조선(한국)의 배 — ships.js가 합친다'],
      ['js/regions/eastasia/ships-japan.js', '일본의 배 — ships.js가 합친다'],
      ...REGIONS.flatMap((r) => REGION_FILES.map(([f, d]) => [`js/regions/${r.id}/${f}`, `${r.name} — ${d}`])),
    ],
  },
  {
    id: 'rule', name: '규칙 (로직)', color: '127,178,216',
    what: '어떻게 계산하나. 값은 위층에서 가져와 쓰기만 한다(그대로 re-export도 한다).',
    files: [
      ['js/state.js', '게임 상태 + 규칙 — 시세·매매·항해비·조선소·술집·급여 정산·장부'],
      ['js/world.js', '저 혼자 도는 세계 — NPC 생성·하루 진행·습격·소문'],
      ['js/npc/behavior.js', 'NPC 판단 — 게임 모듈을 import하지 않고 `ctx`로만 받는다'],
      ['js/evidence.js', '게임이 근거 JSON을 읽는 자리 — 못 읽으면 조용히 기본 순서(fail-soft)'],
    ],
  },
  {
    id: 'view', name: '화면 (씬 · UI)', color: '127,216,160',
    what: '캔버스에 그리고 DOM 패널을 세운다. 규칙을 여기서 다시 구현하지 않는다.',
    files: [
      ['js/main.js', '캔버스·씬 매니저·루프·좌표 변환'],
      ['js/ui.js', 'DOM 오버레이 헬퍼 — `el`·`modal`·`toast`·HUD·항해일지'],
      ['js/josa.js', '조사 고르기(`을/를`·`이/가`) — leaf라 state·씬 어디서든 쓴다'],
      ['js/speed.js', '연출 배속의 단일 정본 — `?speed=`·토글·`delay/after/scaled`. **규칙(일수·확률·수치)은 절대 안 바꾼다**, 줄이는 것은 대기시간뿐'],
      ['js/scenes/port.js', '항구 — 시세·매매·정비·진입점'],
      ['js/scenes/map.js', '지도 — 항로 선택·항해·해상 이벤트'],
      ['js/scenes/battle.js', '전투 — 포격전·백병전'],
      ['js/scenes/shipyard.js', '조선소 — 선박·갑판배치·무장·개장·중고'],
      ['js/scenes/tavern.js', '술집 — 선원 무리 등용'],
      ['mapcheck.html', '권역 지도 검수 — 항구가 물가인가·항로가 바다인가. **발주 기준판이기도 하다**'],
      ['js/payday.js', '급여 정산 화면 — 씬이 아니라 입항 때 뜨는 모달'],
      ['js/factions.js', '세력 관계도 — 씬이 아니라 항구 카드·`F`로 뜨는 전면 모달. DOM 노드 + 인라인 SVG 선 세 종류(싸움은 세력끼리·돈은 국경을 안 본다·**배제만 나에게 온다**). 캔버스가 아닌 이유는 400×225에 한글 노드 열 개가 안 읽혀서다'],
      ['js/save.js', '판을 `localStorage`에 통째로 저장하고 이어한다(A-0) — 항구가 세이브 포인트. 캠페인이 항차 330~380이라 한 세션에 안 끝난다'],
    ],
  },
  {
    id: 'art', name: '그림 (에셋)', color: '200,160,220',
    what: '전부 코드로 그린다. `bake` 캐시를 지나므로 PNG로 갈아 끼울 수 있다.',
    files: [
      ['js/pixel.js', '드로잉 코어 — 팔레트·DSL·**bake 캐시(6MB LRU)**·외곽선'],
      ['js/assets.js', 'PNG 교체 계층 — `assets/manifest.json`이 있으면 그 키만 대체'],
      ['js/sprites/char.js', '병종 캐릭터 48×48'],
      ['js/sprites/ship.js', '선박 측면 176×128 · 탑다운 28×28'],
      ['js/sprites/scene.js', '배경 400×225 — 지도·항구·외해·술집 + 이펙트'],
      ['js/sprites/maps/index.js', '권역별 지도 정의 + 기후 팔레트 — 바다마다 색이 달라야 "다른 바다"가 된다'],
      ['js/sprites/maps/auto.js', '**도시 좌표에서 바다를 역산한다** — 항구가 반드시 물가에 오는 지도 생성기'],
      ['js/sprites/maps/mediterranean.js', '지중해만 손으로 찍은 격자 — 실루엣을 정확히 통제한다'],
      ['js/sprites/icons.js', '교역품 아이콘 16×16'],
    ],
  },
  {
    id: 'evi', name: '근거 (사료)', color: '216,178,127',
    what: '값이 왜 그 값인가. 카테고리마다 파일이 다르다 — 파일 이름만 봐도 어디를 고칠지 정해진다.',
    files: [
      ['content/evidence-meta.json', '**판정 라벨·시대 전제·항로 공식** — 권역이 공유하는 규약(여기 한 곳뿐)'],
      ['content/ocean-lanes-evidence.json', '원양 항로 — 권역 **사이**의 선이라 어느 권역에도 넣지 않는다'],
      ...REGIONS.map((r) => [`content/regions/${r.id}-evidence.json`,
        `${r.name} — 도시 특산·깃발·입항세 + 항로 위험도`]),
      ['content/goods-evidence.json', '교역품 물가 — 대조 2축의 정본'],
      ['content/wage-evidence.json', '임금 — 부관이 선원의 몇 배인가'],
      ['content/asset-evidence.json', '선박·부동산 — 선원 연봉의 몇 배인가'],
      ['content/upkeep-evidence.json', '유지비·적하보험·화물 유인'],
      ['content/voyage-evidence.json', '한 항차가 얼마를 버나 — 분포 밴드'],
      ['content/chain-evidence.json', '가공 사슬 — 투입:산출 비율이 왜 그 정수인가 · 새 가공품 base의 출처(가공마진 밴드)'],
    ],
  },
  {
    id: 'check', name: '검증 (기계)', color: '216,127,127',
    what: '값↔근거가 어긋나면 실패시킨다. 단 *근거가 아직 없는 것*은 경고일 뿐 — 콘텐츠를 막지 않는다.',
    files: [
      ['tools/evidence-load.mjs', '권역별 근거 파일을 모아 읽는다 — 검증 스크립트 공용'],
      ['tools/check-evidence.mjs', '도시 특산·깃발·입항세 ↔ 근거'],
      ['tools/check-routes.mjs', '항로 위험도 ↔ 근거 + 확률이 실제로 갈렸는가'],
      ['tools/check-prices.mjs', '교역품 상대가격·임금 사다리·유지비 계수'],
      ['tools/check-wages.mjs', '부관 급여·성과급 ↔ 사료 배율'],
      ['tools/check-voyage.mjs', '항차 수익 **분포** ↔ 목표 밴드'],
      ['tools/check-chain.mjs', '가공 사슬이 **가공마진 밴드**(1.08~1.25) 안인가 · 순환은 없나 · 지을 자리가 있나. 밴드 이탈은 근거 없음이 아니라 **규칙이 자기모순**이라 exit 1이다'],
      ['tools/check-architecture.mjs', '이 파일 ↔ 실제 파일 (누락·유령)'],
      ['tools/check-factions.mjs', '세력 관계 — 값이 실재하나(깃발·도시·품목·항로) · **함대가 진짜 그 얼굴인가**(`FACTIONS[].fleets` ↔ `FOES` · 동아시아 등급 5가 무국적인가) · 움직이는 것 둘과 무는 것 둘이 걸려 있나 · ★ **세율·조우가 안 움직이나**(이중과세 금지의 증거) · 삭음과 세이브 왕복'],
      ['tools/check-world.mjs', '**아홉 바다가 하나로 이어져 있는가** — 도달성·권역 거리·죽은 품목'],
      ['tools/gen-map-brief.mjs', '지도 발주 의뢰서를 게임 데이터에서 뽑는다(손으로 적으면 어긋난다)'],
      ['tools/gen-npc-brief.mjs', 'NPC 발주 의뢰서 — 술집 무리·항구 인물·적의 얼굴을 권역별로 뽑는다'],
      ['tools/gen-map-png.mjs', '권역 지도를 PNG로 굳혀 assets/map/에 넣는다 — 좌표를 옮기면 다시 돌린다'],
      ['tools/playtest.mjs', '**게임을 실제로 클릭해 본다** — 규칙이 맞아도 그 단추를 못 누르면 소용없다'],
      ['tools/sim-events.mjs', '돌발 이벤트·전투 보상이 성장 단계별로 어느 크기인가'],
      ['tools/check-map.py', '납품된 지도 그림 검수(Pillow)'],
      ['tools/clean-map-art.py', '납품 지도에서 게임이 그리는 것(글자·항로선·나침도·배)을 지우고 400×225로 줄인다'],
      ['tools/gen-map-tracing.mjs', '그림쟁이가 덧그릴 기준판 — 게임 지도 4배 확대판 + 해안선만 남긴 판'],
      ['tools/check-memory-routing.mjs', '**메모리 3-tier 라우터가 실제로 라우팅을 하는가** — 트립와이어(바이트−줄 수)·dead pointer·고아 문서·세션시작에서 몇 hop. 라우터는 **백틱 경로로도 잇는다**(`QUICKMAP.md`)'],
      ['tools/check-imports.mjs', '**없는 이름을 가져오는 import**가 있는가 — 브라우저는 그 모듈 그래프를 통째로 거부하므로 **게임이 아예 안 뜬다**. ★ 실제로 `scenes/map.js`가 `riskKey`를 `state.js`에서 가져와 게임이 죽어 있었는데 **`check-*` 열셋과 규칙 184개가 전부 통과했다** — 그것들은 `data.js`·`state.js`를 직접 부르는 도구라 `scenes/*`를 한 번도 안 거친다. 지도 아홉 장이 낡은 채 굳어 있던 것도 그 장애의 증상이었다(`gen-map-png.mjs`는 게임을 띄워서 굽는다)'],
      ['tools/check-dup-decl.mjs', '**한 import 문에 같은 이름이 두 번** 들어갔는가 — 그 한 줄이면 모듈이 통째로 안 돌아 화면이 검게 남고, 검증 스크립트는 전부 통과한다(파싱을 안 하므로)'],
      ['tools/test-rules.mjs', '규칙 테스트'],
      ['tools/test-world.mjs', 'NPC·계약·바람 테스트'],
      ['tools/test-tavern.mjs', '술집·시작 조건 20종'],
      ['tools/test-payroll.mjs', '급여·체불·이탈·장부 정합'],
      ['tools/sim-core.mjs', '무역 시뮬 몸통 — CLI와 대시보드가 같은 코드를 돌린다'],
      ['tools/sim-trade.mjs', '자산 곡선 CLI'],
      ['tools/sim-stat.mjs', '무역 곡선을 여러 판 돌려 분포로 본다(1회 실행 금지)'],
      ['tools/sim-chain.mjs', '사슬을 쓰는 판과 안 쓰는 판을 **같은 시드로 짝지어**(paired) 돌린다 — 따로 돌려 비교하면 기준선이 25%씩 튀어 효과의 부호가 뒤집힌다'],
      ['tools/sim-roster.mjs', '**명부 사냥이 사다리인가 벌금인가** — 세기별 `실수령 − 소식값`. ★ **빈 배로 순찰**했을 때와 **그 사냥터를 무역하며 순찰**했을 때를 나란히 낸다: 전자가 마이너스인데 후자가 플러스면 고칠 것은 현상금이 아니라 **정보**다(해적은 털 것이 지나가는 곳에 앉아 있다)'],
      ['tools/sim-gate.mjs', '**집 바다를 언제 벗어나나** — 첫 원양의 일차를 분포로 본다(합격선 80~150일 · DESIGN-growth P7-7). ★ 여섯 회차가 663일 동안 한 바다도 못 벗어났는데 **기존 계측기 어느 것도 그것을 재지 않았다.** ⚠️ 이 도구가 못 재는 것은 「문이 어디 있는지 아는가」다 — `bestRun`은 이웃을 전수로 훑어 **문을 언제나 안다.** 그 차이가 663일이었다(화면 쪽은 `scenes/map.js: oceanGateRows`)'],
      ['tools/sim-firstship.mjs', '**낡은 바사에서 첫 배까지, 시작 자리마다** — 계약 없이 무역만으로 사다리의 첫 칸이 밟히나 · 「가까운 둘만 왕복」했을 때의 자산 천장은 얼마인가(실플레이가 밟은 벽)'],
      ['tools/sim-fleet.mjs', '동행 선단이 **시장 깊이를 뚫는가** — 화물칸 단면과 짝지은 한 판. ★ 반드시 **실제로 채운 칸(used)**을 함께 낸다: `planFor`는 한계마진 0에서 멈추므로 `칸당 이익 × 화물칸`을 항차 이익으로 적으면 거짓 수가 나온다'],
      ['tools/sim-contract.mjs', '대형 주문이 **플레이어 단계에 맞는 크기인가** — 무역 곡선(sim-trade·sim-stat)이 계약을 빼고 재기 때문에 아무도 안 보던 자리다. 판정선 둘: **선금/자산**(너무 쉬운 쪽)과 **자금이닿나**(막다른 길 쪽)'],
      ['tools/playtest-live/launch.mjs', '관전용 — 크롬 창을 띄우고 CDP를 연 채 대기'],
      ['tools/playtest-live/play.mjs', '관전용 — 창을 살려 둔 채 한 스텝씩 사람 속도로 누른다'],
      ['tools/playtest-live/pw.mjs', 'playwright-core 찾기(이 저장소엔 node_modules가 없다)'],
      ['tools/sim-risk.mjs', '실효 조우율(시드 평균)'],
      /* ── 원양 vs 근해 프로브 (P1·P4 회차) ─────────────────────────
         ★ 이 다섯은 **`.playtest/`에 있던 조사 도구를 저장소로 올린 것**이다 —
           그 디렉터리는 커밋되지 않아 다음 사람이 같은 수치를 다시 못 냈다. */
      ['tools/probe-ocean.mjs', '원양 42방향 **전수** — 방향마다 얼마를 며칠에 버는가와 무엇을 싣는가. `probe-growth ③`은 중앙값만 내놓아 *어느 항로를 손봐야 하는지*를 못 알려 준다'],
      ['tools/probe-near.mjs', '근해 **전수**(원양 제외·결정론) — ★ `probe-growth ③`의 근해 표본은 무작위 48곳인 데다 `!isOceanGate(x) || true`라 **원양이 근해에 섞인다.** 그 도구로는 「근해 ±3%」를 못 잰다. 도시마다 *가장 나은 이웃*으로 갈 때의 중앙값도 함께 낸다 — 사람은 아무 데나 가지 않는다'],
      ['tools/probe-insure.mjs', '실효 보험 요율을 **선단 0척과 5척 둘 다** 잰다 — 원양 요율을 올려도 선단 할인(−40%)이 곱해지므로 한쪽만 보면 "사료 중앙값에 닿았다"가 거짓이 된다'],
      ['tools/probe-lane.mjs', '원양 항로별 **최고 차익 배율**과 「이 대양을 건너야만 얻는 물건」 수 — ⚠️ 이 지표의 0종 바닥은 0이 아니라 **8/42**다(원양 항로 넷이 권역 *안*을 잇는다)'],
      ['tools/probe-growth.mjs', '비용 축 일곱 갈래 · 161칸 천장 · 원양 vs 근해 — ⚠️ ③은 `voyageCost(d)`를 leg 없이 불러 **적하보험을 0으로 센다**. 보험을 만졌으면 probe-ocean/near로 잰다'],
      ['tools/probe-gate.mjs', '원양 관문 항구의 산지/수요 현황 + 권역별 산지·수요 집합 — 「어느 권역이 무엇을 안 만드나」가 곧 대양을 건널 이유다'],
      ['tools/probe-good.mjs', '한 품목이 어디서 나고 어디서 팔리나 — 배율 사다리(광산에서 멀수록 비싸야 한다)를 깨지 않았는지 보는 자리'],
      ['tools/probe-fair.mjs', '**보험이 낸 것의 몇 %를 돌려주나** — 게임의 판정 함수를 그대로 불러 요율·배 크기·선단 척수로 갈라 잰다. ⚠️ 큰 배로만 재면 안 보이는 자리가 있다'],
      ['tools/probe-port.mjs', '한 항구에서 그 배로 무엇을 어디에 팔 수 있나 — 「첫 배까지」가 안 서는 시작 항구를 진단한다(`sim-firstship`이 0/12를 낼 때 여는 곳)'],
      ['tools/probe-crewcut.mjs', '선원 사무역(P4-a)이 **배마다 얼마를 가져가나** — 초반 압박을 과하게 키우지 않았는지'],
      ['tools/probe-fleet.mjs', '선단 수지 — 채운 칸이 여전히 161 근처인가(적재 배수가 안 생겼는지)'],
      ['tools/probe-circuit.mjs', '회로 항구 수 → 닢/일 — 2~4항구가 여전히 마이너스인가(초반 압박 유지)'],
      ['tools/coverage.mjs', '테스트케이스 카탈로그와 커버리지를 **코드에서 파생**시킨다 — 손으로 적으면 세계가 늘 때마다 낡는다'],
      ['tools/event-inventory.mjs', '사건이 **걸릴 자리**를 코드에서 전수로 센다 — 자리가 0이면 실클릭 이전에 결함이다'],
      ['tools/check-novel-events.mjs', '소설 소재집 §6 이벤트 72건의 근거 ↔ 코드(세율·항로위험·시세·계절·prizeYard)'],
      ['tools/check-origins.mjs', '한반도 갈래 다섯이 **코드 ↔ story/PROTAGONISTS.md §6-1 ↔ story/GAME-LINK.md** 세 곳에서 같은가 — 문서 둘은 스스로 "사본"이라 적어 두고도 어긋남을 아무도 확인하지 않았다. 세율 바닥(BOON.tariffFloor)이 큰 특전을 삼키는 구간도 경고한다'],
      ['tools/region-topology.mjs', '권역별 항구 그래프(뭍길·해로) 정본 — 회차 러너가 "못 간 항구"를 결함과 설계상 육로/원양단절로 가른다(정본 문서 REGION-TOPOLOGY.md)'],
      ['tools/nine-seas-report.mjs', '인벤토리 + 근거대조 + 실클릭 결과를 합쳐 RESULTS.md를 만든다'],
      ['tools/playtest-live/event-signs.mjs', '로그 한 줄 → 어느 사건인가. 회차 러너 셋의 공용 분류표'],
      ['tools/playtest-live/nine-seas.mjs', '아홉 바다를 **동시에** 굴려 기동·항구·항해와 사건 발동을 본다(권역당 14구간)'],
      ['tools/playtest-live/ocean-season.mjs', '원양 항로와 계절 전환 — 권역 안 항해로는 구조적으로 안 나오는 자리'],
      ['tools/playtest-live/payday-inland.mjs', '급여일·체불과 육로 사건 — 30일·0.12 확률이라 짧은 회차로는 안 걸린다'],
      ['tools/enhance_map_texture.py', '권역 지도에 질감을 얹는다 — ⚠️ 지금 판은 42px 주기로 반복된다(UNIMPLEMENTED F-8)'],
    ],
  },
  {
    id: 'dash', name: '대시보드 (관측)', color: '160,200,216',
    what: '게임 모듈을 **그대로 돌려** 계측한다(재구현 아님). '
        + '`.mjs` = 계측(DOM 없음 · node로도 검증 가능) / `.js` = 렌더(DOM을 쓴다).',
    files: [
      ['dashboard/measure.mjs', '경제 지표 채집'],
      ['dashboard/pirates.mjs', '해적 지표 채집'],
      ['dashboard/ports.mjs', '항구 지표 채집'],
      ['dashboard/ships.mjs', '선박 계측 — 건조 가능 항구·해금 사슬·공업력 분포(sellsShip을 그대로 부른다)'],
      ['dashboard/ship-view.js', '선박 탭 그리기 — 바다별 선단·명부·화물칸↔값·전통 조선지 어긋남'],
      ['dashboard/wages.mjs', '보수 지표 채집'],
      ['dashboard/architecture.mjs', '이 파일 — 계층·동적생성·상태 정본'],
      ['dashboard/dash.js', '경제 탭 렌더'],
      ['dashboard/pirate-view.js', '해적 탭 렌더'],
      ['dashboard/port-view.js', '항구 탭 렌더'],
      ['dashboard/wage-view.js', '보수 탭 렌더'],
      ['dashboard/overview-view.js', '오버뷰 탭 렌더 — 아홉 바다 한눈에 + 계층·동적생성·상태'],
      ['dashboard/npc-view.js', '사람 탭 렌더 — 상단·해적·인물·동료를 **한자리에서** (해적 탭은 명부만 본다)'],
      ['dashboard/shared.js', '탭 공용 그리기 도구 + 권역 근거 로더 (DOM을 쓰므로 `.js`)'],
      ['dashboard/region-filter.js', '**전 탭이 공유하는 권역 선택** — 탭마다 두면 탭을 옮길 때 선택이 풀린다'],
      ['dashboard/app.js', '탭 셸 — 처음 열 때만 계측한다'],
      ['dashboard/index.html', '대시보드 셸'],
    ],
  },
];

/* ── ② 동적 생성물 ─────────────────────────────────────────────
   런타임에 만들어지는 것. 두 갈래다 —
     **캐시되는 것**(스프라이트): 한 번 만들면 메모리를 먹으므로 상한이 필요하다.
     **매번 계산되는 것**(결정론 생성): 저장하지 않는다. 같은 입력이면 같은 결과라
       저장할 이유가 없고, 저장하면 오히려 세이브가 커지고 어긋난다. */
export const RUNTIME = [
  {
    group: '스프라이트 (캐시된다)',
    note: '`pixel.js: bake(key, w, h, draw)`를 지난다. 같은 key면 두 번 그리지 않는다. '
        + '**6MB LRU 상한** — 넘치면 가장 오래 안 쓴 것부터 버리고, 다시 필요하면 그때 굽는다.',
    rows: [
      ['scene:*', '배경 400×225 — 지도·항구 16곳·외해·술집', '352KB/장 · 가장 무겁다'],
      ['ship:*', '선박 측면 176×128 — 선종 × 틴트 × 깃발 조합', '88KB/장 · 조합이 늘면 빨리 는다'],
      ['shiptop:*', '지도용 탑다운 28×28', '3KB'],
      ['char:*', '병종 48×48 — 병종 × 포즈 × 배색', '9KB'],
      ['icon:*', '교역품 16×16', '1KB'],
      ['fx:*', '포연·물기둥·폭발·대포', '작다'],
    ],
    measured: 'cache',      // 렌더가 cacheStats()로 실측을 채운다
    /* ★ 이 대시보드는 게임 화면을 그리지 않으므로 여기서는 **아무것도 굽지 않는다**(0개가 정상).
       아래는 게임을 실제로 돌리며 잰 값이다(2026-08-15, Chrome). */
    reference: [
      ['실제 플레이 경로', '항구 → 술집 → 조선소 5탭', '35개 · 0.98 MB'],
      ['항구 16곳을 다 방문', '배경이 가장 무겁다(352KB/장)', '5.98 MB — 상한에서 멈춘다'],
      ['+ 선박 전조합까지', '선종 11 × 깃발 5', '5.80 MB — 상한이 없을 때는 12.5 MB였다'],
    ],
  },
  {
    group: '결정론 생성 (저장하지 않는다)',
    note: '`hash(도시, 종류, 번호, 주기)`로 만든다 — **같은 날 다시 들어와도 같은 것**이 나온다. '
        + '항구를 나갔다 들어와 다시 굴리는 스캠을 막고, 세이브에 넣을 필요도 없앤다.',
    rows: [
      ['술집 무리', '`state.js: tavernCrews()`', '이틀마다 갈린다 · 자리 2~5'],
      ['중고 매물', '`state.js: usedListings()`', '사흘마다 갈린다 · 자리 2~3'],
      ['대형 주문', '`state.js: contractOffer()`', '사흘마다 갈린다 · 항구당 하나'],
      ['시세 노이즈', '`state.js: wobble()`', '3일 주기 ±15% — 난수가 아니라 해시다'],
    ],
  },
  {
    group: '난수로 굴리는 것 (결과만 상태에 남는다)',
    note: '이쪽은 `Math.random()`이다 — 굴린 **결과**가 상태에 남으므로 세이브 대상이다.',
    rows: [
      ['해상 이벤트', '`state.js: rollSeaEvent()`', '항로 위험도 + 화물 유인으로 확률이 갈린다'],
      ['시장 충격', '`state.js: rollShockEvents()`', '기근·봉쇄·풍작 — 후보는 매번 `CITIES`에서 만든다'],
      ['NPC 거래·습격', '`world.js: worldTick()`', '상인·해적이 실제로 사고팔고 서로 턴다'],
      ['급여일 이탈', '`state.js: settlePayroll()`', '불만이 문턱을 넘은 무리만 굴린다'],
    ],
  },
];

/* ── ③ 상태 (게임이 들고 있는 것) ───────────────────────────────
   `js/state.js: state`의 필드. **세이브/로드를 넣으면 이것이 그대로 직렬화 대상**이다.
   `Set` 두 개(`known`·`everOwned`)는 JSON으로 그냥 안 나가므로 배열 변환이 필요하다. */
export const STATE_FIELDS = [
  { k: 'day', g: '진행', d: '몇 일차인가 — 급여일·시세 주기·매물 교체가 전부 여기 물린다' },
  { k: 'gold', g: '진행', d: '금화' },
  { k: 'at', g: '진행', d: '지금 정박한 도시 id' },
  { k: 'origin', g: '진행', d: '한반도 출신 갈래(`data.js: ORIGINS`) — 시작 부두·자금·선원·특전을 정한다. 다른 바다에서 시작하면 null' },
  { k: 'holdings', g: '진행', d: '항구 거점(A-1) — `{cityId: {rental,warehouse,factory,slipway,dock, shop,inn, paid, spent, idle, missed, ashore}}`. 앞 다섯은 `true`, **수익형 부동산(shop·inn)은 등급 숫자 1~3**이다. 유지비는 들인 돈의 연 6%를 30일마다, 한 번 밀리면 문을 닫고(idle) 두 번째에 압류. 부동산은 30일마다 세를 벌지만 **공실이면 그 달은 0**(`vacancyOdds`)' },
  { k: 'ended', g: '진행', d: '끝을 본 날(0이면 아직) — 「여덟 항구와 한 척」 조건 셋을 채우면 찍힌다(`data.js: ENDING`). 한 번만 축하하고 판은 계속된다' },
  { k: 'endedNine', g: '진행', d: '두 번째 끝 「아홉 바다」를 본 날(0이면 아직) — 아홉 권역 전부에서 패권(`state.js: hegemonyAll`)을 잡으면 찍힌다. 조선의 끝(`ended`)과 따로 논다 — 둘이 겹치지 않아야 기존 밸런스가 안 움직인다' },
  { k: 'slain', g: '진행', d: '꺾은 상대의 기록 — `{ "<권역>:t<등급>": 날, "pirate:<명부id>": 날 }`. 권역 패권 조건 ③("그 바다의 최상급 적을 꺾었다")이 읽는다. **Set이 아니라 평범한 객체**다(`save.js`가 통째로 직렬화하므로). 상선은 적지 않는다' },
  { k: 'bountyDue', g: '진행', d: '아직 못 받은 **현상금** — `[{ name, coin }]`. 나포심판(prize court)이 **항구에서** 치르는 돈이라 싸움터가 아니라 다음 입항에 들어온다(`oweBounty`·`payBounties`). 옮겨 싣는 물건이 아니므로 **`capLoot`을 안 지난다** — 그 상한의 정당화(*"갑판에 여섯이 금고를 통째로 못 옮긴다"*)가 여기엔 안 맞는다. ⇒ 이기고 **살아 돌아와야** 받는다' },
  { k: 'scouted', g: '진행', d: '**소문으로 값만 아는 항구** — `{ "<도시id>": 들은 날 }`. 닿은 항구(`known`)와 갈라 둔다: `metFactions()`가 `known`을 세므로 섞으면 **가 본 적 없는 세력을 만난 것으로** 센다. 초행 벌금을 없애는 자리(`knowPort` · `HOLDING.scoutNeighbors`)이고 **보너스가 아니라 정보**다' },
  { k: 'mates', g: '진행', d: '태운 **동료**(항해사) — `{ "<동료id>": { day, joint, stake, earned } }`. 계약 모양은 **코멘다**다(`data.js: COMMENDA` · 편무 25% · 쌍무 50%+밑천). 특전은 부관·갈래와 같은 자리에서 더해지고(`matePerk`), 동행선의 선장 자리를 채운다(`FLEET.requireCaptain` — **선단 규모가 동료 수에 묶인다**). 명부 51명의 정본은 권역 `npc-mates.js`' },
  { k: 'tamed', g: '진행', d: '**초무**한 명부 해적 — `{ "<명부id>": 날 }`. 격파(`slain`)와 같은 무게로 명부를 닫는다(`world.js: rosterClosed`). 못 이길 상대도 소굴에서 값을 치르면 지워진다 — *"이길 수 있는 상대만 싸운다"*와 목표를 양립시키는 자리(SPEC-supremacy §1-3 (c))' },
  { k: 'yards', g: '진행', d: '공업력 승급(A-2) — `{cityId: {boost, building:{to,until}}}`. 자재를 실물로 부어야 오르고, 공사 중에는 그 부두가 배를 짓지도 팔지도 않는다' },
  { k: 'lines', g: '진행', d: '정기선(A-9 3단계) — `{shipKey: {a, b, goods[], leg, next, turn}}`. 동행선 하나를 A↔B에 묶어 **창고에서 창고로 짐만 옮긴다**(사고팔지 않는다 — SPEC-vertical §3-1). ★ 값은 돈이 아니라 **선단**이다: 묶은 배는 `consorts`에서 빠져 화물칸·포화력·피해 분산을 잃는다. ⚠️ `tickLines()`는 `advanceDays`와 `waitDays` **양쪽**에서 불러야 한다 — 한쪽만 걸면 항구에 서 있는 동안 정기선이 멈춘다' },
  { k: 'consign', g: '진행', d: '위탁(A-9 3단계) — `[{from, to, good, n, arrive, insured, value}]`. 남의 배에 실어 보낸다. **창고 둘**만 있으면 되는 초반의 문이고, 대신 수수료 8~15%가 항차 ROI와 맞먹는다. 유실되면 **짐만** 잃는다(배가 아니다). 도착 처리는 그 항구에 **들를 때**(`arriveConsign`)' },
  { k: 'works', g: '진행', d: '수직계열화 시설(A-9) — `{cityId: {paid, spent, missed, "<종>:<품목>": {level, since, idle, job}}}`. 유지비는 들인 돈의 **연 10%**를 30일마다(거점 6%보다 무겁다), 못 내면 **휴업** → 두 번 연속이면 압류. ★ `holdings`와 갈라 둔 것이 이 필드의 존재 이유다 — `hegemonyOf`가 `holdings`를 세므로 같은 그릇에 담으면 **권역 패권 조건이 조용히 바뀐다**. 이름을 `industry`로 짓지 않은 것도 같은 이유(`city.industry`·`state.yards`와 뒤섞인다)' },
  { k: 'stored', g: '진행', d: '거점 창고에 둔 화물 — **여기 있는 짐은 `impact`를 누적시키지 않는다**(짐을 쪼개는 전략의 자리)' },
  { k: 'infamy', g: '진행', d: '깃발별 악명 — 상선을 덮치면 쌓인다. 그 세력 항구의 세가 오르고 그 세력이 나를 사냥한다(`data.js: INFAMY`). 40일마다 한 칸씩 잊힌다' },
  { k: 'regard / _regardAge', g: '진행', d: '세력 관계(SPEC-factions 1단계) — `{facId: −10…+10}`. **깃발이 아니라 세력 10에 붙는다**(`data.js: FACTIONS`). 화면이 보는 값은 `regardOf` = 여기 적힌 raw − 그 세력 깃발의 악명이라, **덮치는 것과 일을 해내는 것이 같은 눈금에서 만난다**. ⚠️ 이름을 `standing`으로 짓지 않은 이유는 `SPEC-supremacy`가 그 말을 국세(나라의 형세)로 이미 쓰기 때문이다. 무는 것은 세율이 아니라 **접근권**(눈총이면 그 도시 일감이 안 걸리고, 원수면 문서를 안 판다) — 세율·조우는 `infamy`의 몫이고 **이중과세하지 않는다**. `_regardAge`는 삭음 누적일(90일마다 한 칸씩 0 쪽으로)' },
  { k: 'boons', g: '진행', d: '항구 인물에게 산 것 — 문서(권역별)·밀수(항구별)·수리·일감 갱신·빚·**해적 소식**(`bounty`: 쫓는 자와 그 기한 — 그 구간에 나가면 그자가 온다). 기한이 있다' },
  { k: 'shipKey', g: '배', d: '지금 타는 선종' },
  { k: 'hp / maxHp', g: '배', d: '선체 — maxHp는 개장으로 늘어난다' },
  { k: 'guns / arms', g: '배', d: '포문 수와 편성 — 항상 합이 같다(`syncGuns`)' },
  { k: 'refits', g: '배', d: '기함에 붙은 개장' },
  { k: 'shots', g: '배', d: '특수탄 재고(일반탄은 무한)' },
  { k: 'cargoCap / cargo / buyPrice', g: '화물', d: '적재량·실은 것·평균 매입가(손익 표시용)' },
  { k: 'fleet', g: '배', d: '보유 선박 — 마지막으로 내린 항구에 정박한 채로 남는다' },
  { k: 'consorts', g: '배', d: '지금 **함께 몰고 나가는** 배 — `{shipKey: {crew, captain}}`. 기함 1 + 동행 최대 8 = 아홉 척(`data.js: FLEET`). 배 자체는 `fleet`에 있고 이쪽은 "따라 나섰는가"만 적는다. 화물칸·포화력이 늘고 대신 사람·삯·속도를 문다. `captain`은 자리만 있고 아직 비어 있다(NPC 동료가 채울 후크)' },
  { k: 'towing', g: '배', d: '항해 중 나포해 끌고 가는 배' },
  { k: 'crew / crewMax', g: '사람', d: '**인원의 정본**' },
  { k: 'bands', g: '사람', d: '태운 무리 — 이름·기질·요구 일당·불만. `crew`와 어긋나면 `trimBands()`가 맞춘다' },
  { k: 'hired', g: '사람', d: '이미 태운 술집 자리 id — 같은 무리를 두 번 태우지 못하게' },
  { k: 'loadout', g: '사람', d: '갑판 배치 6칸 — 백병전에 그대로 나간다' },
  { k: 'officer', g: '사람', d: '부관 — 급여·성과급 누계. 오직 한 명이라 목록이 아니다' },
  { k: 'payroll', g: '돈', d: '쌓인 급여·체불·다음 급여일 — **급여가 발생주의인 이유가 이 필드다**' },
  { k: 'ledger', g: '돈', d: '이 달 장부(수입 5 · 지출 9) — 정산 화면이 읽는다. 정산 때 비워진다' },
  { k: 'stats', g: '돈', d: '누계 — 전투·승리·순이익·항해 거리' },
  { k: 'prices / impact', g: '시장', d: '도시×품목 시세와 최근 거래 압력(날이 지나면 감쇠)' },
  { k: 'shocks', g: '시장', d: '기근·봉쇄·풍작 — 기한이 차면 걷힌다. **관세 폭탄(levy)만 품목이 없다**(`good: null`) — 시세가 아니라 그 항구의 입항세에 걸리고 `tariffShockFactor`가 읽는다' },
  { k: 'contract', g: '시장', d: '맡은 대형 주문(한 번에 하나)' },
  { k: 'npcs', g: '세계', d: '상인·해적 — `world.js`가 굴린다' },
  { k: 'known', g: '기록', d: '가 본 도시 (Set)' },
  { k: 'everOwned', g: '기록', d: '한 번이라도 몰아 본 선종 (Set) — 상위 선박 해금 조건' },
  { k: 'log', g: '기록', d: '항해일지 60줄' },
];

/** 계층 전체의 파일 경로 — 검증 스크립트가 실제 파일과 대조한다 */
export function allFiles() {
  return LAYERS.flatMap((l) => l.files.map(([path]) => path));
}
