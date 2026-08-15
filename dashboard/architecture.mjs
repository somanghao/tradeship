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
      ['js/scenes/port.js', '항구 — 시세·매매·정비·진입점'],
      ['js/scenes/map.js', '지도 — 항로 선택·항해·해상 이벤트'],
      ['js/scenes/battle.js', '전투 — 포격전·백병전'],
      ['js/scenes/shipyard.js', '조선소 — 선박·갑판배치·무장·개장·중고'],
      ['js/scenes/tavern.js', '술집 — 선원 무리 등용'],
      ['mapcheck.html', '권역 지도 검수 — 항구가 물가인가·항로가 바다인가. **발주 기준판이기도 하다**'],
      ['js/payday.js', '급여 정산 화면 — 씬이 아니라 입항 때 뜨는 모달'],
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
      ['tools/check-architecture.mjs', '이 파일 ↔ 실제 파일 (누락·유령)'],
      ['tools/check-world.mjs', '**아홉 바다가 하나로 이어져 있는가** — 도달성·권역 거리·죽은 품목'],
      ['tools/gen-map-brief.mjs', '지도 발주 의뢰서를 게임 데이터에서 뽑는다(손으로 적으면 어긋난다)'],
      ['tools/check-map.py', '납품된 지도 그림 검수(Pillow)'],
      ['tools/test-rules.mjs', '규칙 테스트'],
      ['tools/test-world.mjs', 'NPC·계약·바람 테스트'],
      ['tools/test-tavern.mjs', '술집·시작 조건 20종'],
      ['tools/test-payroll.mjs', '급여·체불·이탈·장부 정합'],
      ['tools/sim-core.mjs', '무역 시뮬 몸통 — CLI와 대시보드가 같은 코드를 돌린다'],
      ['tools/sim-trade.mjs', '자산 곡선 CLI'],
      ['tools/sim-risk.mjs', '실효 조우율(시드 평균)'],
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
      ['dashboard/wages.mjs', '보수 지표 채집'],
      ['dashboard/architecture.mjs', '이 파일 — 계층·동적생성·상태 정본'],
      ['dashboard/dash.js', '경제 탭 렌더'],
      ['dashboard/pirate-view.js', '해적 탭 렌더'],
      ['dashboard/port-view.js', '항구 탭 렌더'],
      ['dashboard/wage-view.js', '보수 탭 렌더'],
      ['dashboard/overview-view.js', '오버뷰 탭 렌더'],
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
  { k: 'shipKey', g: '배', d: '지금 타는 선종' },
  { k: 'hp / maxHp', g: '배', d: '선체 — maxHp는 개장으로 늘어난다' },
  { k: 'guns / arms', g: '배', d: '포문 수와 편성 — 항상 합이 같다(`syncGuns`)' },
  { k: 'refits', g: '배', d: '기함에 붙은 개장' },
  { k: 'shots', g: '배', d: '특수탄 재고(일반탄은 무한)' },
  { k: 'cargoCap / cargo / buyPrice', g: '화물', d: '적재량·실은 것·평균 매입가(손익 표시용)' },
  { k: 'fleet', g: '배', d: '보유 선박 — 마지막으로 내린 항구에 정박한 채로 남는다' },
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
  { k: 'shocks', g: '시장', d: '기근·봉쇄·풍작 — 기한이 차면 걷힌다' },
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
