# tradeship — 아홉 바다 교역기

대항해시대 2 풍의 무역·전투 캐주얼 게임. 웹(순수 ES 모듈 + Canvas, 빌드 없음), 픽셀아트.
**바다가 아홉이다** — 지중해 · 대서양/북해 · 아프리카 · 중동/홍해 · 인도양 · 동남아 · 동아시아 · 카리브 · 남아메리카.

## ★ 세션시작 필독 (BLOCKING)

1. **이 파일** + **`wiki/gotchas.md`**(도메인 무관 함정) 를 반드시 먼저 읽는다.
2. **작업 대상이 정해지면 `QUICKMAP.md`를 Read**해 도메인을 고르고, 해당 `QUICKMAP-<도메인>.md`로 간다.
   도메인 파일은 `§1~2 키워드→문서` + `§3 그 도메인 전용 함정`이라 자족적이다.
3. **"마지막 작업이 뭐였나"는 `git log` + `changelog.md` 맨 위**를 본다 — 이 파일은 *최종상태*만 담는다.

도메인: **art**(픽셀 에셋·지형·배경) / **trade**(경제·물가·NPC·고증) / **combat**(전투·선박·조선소) / **engine**(캔버스·씬·UI·실행) / **story**(소설 — 코드 아님)

4. **어느 바다를 건드리든 `js/regions/<권역>/`부터** — `map/geo.js`·`data.js`엔 값이 없다(§핵심 모델).

## 절대 원칙

- **★ 콘텐츠는 풍부하게, 금액은 근거에 충실하게 — 이 둘을 섞지 않는다(최상위 지침).**
  - **콘텐츠**(배·교역품·도시·해적·사건의 *종류*)는 **많을수록 좋다. 어떤 장치도 이것을 제약해선 안 된다.**
    근거가 아직 없다는 이유로 도시·품목·선종을 못 넣으면 안 된다 — **먼저 넣고 근거는 뒤따른다.**
  - **금액·시세**(값·비율·위험도)는 사료에 충실하고 현실적이어야 한다. **돈은 어렵게 벌려야 재미가 있다** —
    수익을 올려 달라는 압력이 오면 근거부터 확인하고, 근거가 아니라 편의면 올리지 않는다.
  - ⚠️ **검증 스크립트가 콘텐츠를 억제하는 장치가 되기 쉽다.** 그래서 실패/경고를 갈라 둔다:
    **실패**(exit 1)는 *코드와 근거가 어긋남·규칙이 자기모순*일 때만. **경고**는 밴드 이탈·미조사.
    "근거 없음"으로 실패시키면 콘텐츠를 늘리려 조사부터 끝내야 하는 구조가 된다.
- **연도를 고정하지 않는다 — 배경은 "대항해시대쯤"이다(최상위 지침).** 특정 해에 맞추면
  그 해에 없던 도시·세력·선종을 계속 덜어내야 하고 수정 범위가 눈덩이처럼 커진다.
  **콘텐츠가 풍성한 쪽을 택한다 — 이왕이면 모두 나오게 한다.** 그래서 실제로는 공존하지 않은
  것이 한 화면에 있을 수 있다(기사단령 로도스 ↔ 기사단령 몰타). 그런 항목은 근거 JSON에
  `verdict: "gameplay"`로 표시해 **알고 그렇게 뒀다**는 것을 남긴다.
  개별 사실의 고증(무엇이 어디서 났나, 어느 항로가 위험했나)은 여전히 사료를 따른다.
- 웹 출력은 claude.ai Artifact 금지 — **로컬 HTML + 로컬 서버(`python serve.py`) + 브라우저**(사용자 지침).
- 에셋은 `js/sprites/`에 모아 **팩토리 함수만 노출**한다. 나중에 렌더링 이미지로 교체 가능하게(사용자 지침).
- 이미지 기준: **2D 픽셀 형태, 고급스러울 필요는 없지만 싸구려로 보이면 안 된다**(사용자 지침).

## 핵심 모델

- 논리 해상도 **400×225** 고정, 정수배 배치. 지도 씬만 **도시가 걸친 폭**에 맞춘다(`setViewSpan`) — 400 전체로 재면 배율이 한 단계 떨어진다.
- **그림은 캔버스, 글자·버튼은 DOM 오버레이** — 픽셀 폰트 없이 한글 가독성을 얻는 방법.
- 모든 스프라이트는 `bake(key,…)` 캐시 — 매 프레임 불러도 비용 0, 대신 고친 뒤 새로고침이 필요하다.
- 씬: `port`(무역) ↔ `map`(항해) → `battle`(포격전→백병전), `port` → `shipyard`(선박·선원·무장·개장).
- **권역이 단위다.** 한 바다 = `js/regions/<권역>/` 한 폴더(`geo·trade·goods·ships·npc-*`)이고,
  `js/regions/index.js`가 그것을 합쳐 옛 이름(`CITIES`·`ROUTES`·`GOODS`·`SHIPS`)으로 내보낸다.
  **`js/map/geo.js`와 `js/data.js`에는 값이 없다** — 좌표를 찾아 그 파일을 열면 빈손이다.
  권역끼리는 서로 import하지 않는다(그래서 여럿이 동시에 만질 수 있다). 같은 이유로
  **동아시아 선박만 나라별로 더 갈려 있다**(`ships-{ming,joseon,japan}.js` → `ships.js`가 합침). 잇는 것은 `OCEAN_LANES`뿐이고
  **거리가 아니라 `days`를 직접 적는다** — 권역마다 좌표계가 따로라 좌표로는 잴 수 없다.
- 모듈 방향은 `data → state → world → scenes` **한 방향**이다. `world.js`(NPC)가 state를 쓰고, state는 world를 모른다(순환 참조 방지).
- **UI가 그림을 가리면 안 되는 화면은 패널을 `viewport()` 논리좌표에 얹는다**(조선소 씬).

## 정본(SoT) 지도

| 알고 싶은 것 | 정본 |
|---|---|
| 도메인 라우팅 | `QUICKMAP.md` → `QUICKMAP-{art,trade,combat,engine}.md` — §1이 **읽을 문서 + 코드 정본**을 한 줄에 준다 |
| 도메인 무관 함정 | `wiki/gotchas.md` (세션필독) |
| 도메인 전용 함정 | 각 `QUICKMAP-<도메인>.md` §3 |
| 서브시스템 상세 | `wiki/<topic>.md` |
| 파일↔기능·데이터 조정 지점 | `wiki/file-map.md` |
| 실행·디버깅 | `wiki/dev-workflow.md` |
| 변경 이력·경위 | `changelog.md` |
| 게임 수치 | `js/data.js` (코드가 정본, 문서는 해설) |
| 도시 특산품이 왜 이 값인가 | `content/regions/<권역>-evidence.json` · 검증 `check-evidence.mjs` → 서술본 `wiki/city-goods-history.md` |
| 항로가 왜 이만큼 위험한가 | 근거 JSON의 `routes` · 수치 권역 `geo.js: ROUTE_RISK` · 검증 `check-routes.mjs` |
| 부관 급여가 사료에 맞나 | `content/wage-evidence.json` · 검증 `check-wages.mjs` · 서술본 `wiki/officer.md` |
| 물가·자산·유지비가 사료에 맞나 | **카테고리마다 파일이 다르다**(`content/{goods,asset,upkeep}-evidence.json`) · 검증 `check-prices.mjs` → `QUICKMAP-trade.md` |
| 한 항차가 얼마를 버나 (분포) | `content/voyage-evidence.json` · 검증 `check-voyage.mjs` · 조사 `wiki/research-voyage-returns.md` |
| 그림 발주 사양 | **대표 2장뿐** — `assets/BRIEF-MAP.md`(지도·배경) · `BRIEF-NPC.md`(사람). 바다별 목록은 `gen-{map,npc}-brief.mjs`가 갱신한다 |
| 부관(에이미) | `js/data.js: OFFICER` (정본) → `wiki/officer.md` |
| 급여 정산·체불·이탈·장부 | `state.js`(payroll·settlePayroll) · 화면 `js/payday.js` → `wiki/payroll.md` |
| 협업 경계(누가 어느 파일) | 루트 `CONTRIBUTING.md` · `.github/CODEOWNERS` |
| 그림 교체 절차 | `assets/README.md` |
| 아직 없는 기능·손대는 순서 | `UNIMPLEMENTED.md` |

## 현재 상태

- 게임 루프 3파트(무역·항해·전투) + 조선소·술집. 아홉 바다 전부 **실클릭 검증**했다.
- **공개 저장소** `github.com/somanghao/tradeship` (public, main).
- 에셋은 **대부분** 코드 생성이고 PNG로 갈아 끼운다 — `bake` 키를 `assets/manifest.json`에(키 목록은 `preview.html`). 캐시 **6MB LRU**. ⚠️ **manifest 키는 코드가 *부르는* 키여야 한다** — 로더의 "갈아 끼웠다"는 적용이 아니다(→ `QUICKMAP-art.md` §3).
- **지도 아홉 장만은 이미 PNG다**(`assets/map/`, 코드 생성은 폴백). **좌표를 옮기면 `node tools/gen-map-png.mjs`를 다시 돌린다** — 안 돌리면 항구가 뭍에 앉고 `python tools/check-map.py --all`이 잡는다. **아홉 장 모두 코드판이다** — 사람이 그린 지도는 아직 반려 중이다(→ `QUICKMAP-art.md` §3 · `UNIMPLEMENTED.md` F-1). ⚠️ **지금 워킹트리의 아홉 장은 질감 스크립트가 덮은 판이라 육지가 42px 주기로 반복된다 — 커밋 전에 `UNIMPLEMENTED.md` F-8.**
- **통합 대시보드** `/dashboard/` — 게임 모듈을 그대로 돌려 계측한다(재구현 아님). 구조 정본 `dashboard/architecture.mjs` — `check-architecture.mjs`가 실제 파일·state와 대조하므로 **파일을 추가하면 여기 적어야 통과한다.**
- **값은 `data.js`, 규칙은 `state.js`.** 콘텐츠 수치·도시 경제·**튜닝 상수 전부**(임금·보급·유지비·보험·급여 주기·시작 자금·조우 확률 환산)가 `js/data.js`, 도시 좌표·항로·해류는 `js/map/geo.js`. `state.js`가 그대로 re-export하므로 **기존 import 경로는 그대로 쓴다.**
- **입항세는 두 겹** — 기본율(`TARIFF`) + 도시 오버라이드(`CITY_TARIFF`). **비어 있는 도시는 빠진 게 아니라** 기본율로 구른다. 항구 성질은 `baseTariff()`로 읽는다(부관 특전 제외).
- **데이터는 세 겹 — UI ▸ 수치 ▸ 근거.** 권역 `geo.js` ▸ `trade.js` ▸ `content/regions/<권역>-evidence.json`. **수치를 고치면 근거도 같은 커밋에서**(`check-*`가 실패시킨다. *근거 없음*은 경고일 뿐).
- 특산품·깃발은 사료에 맞춰져 있다. 밸런스나 연표만 보고 되돌리면 같은 오류가 재발한다.
- **아홉 바다에서 골라 시작한다**(기본 **부산포** · `data.js: START_PORTS`). 어디서든 **물 새는 낡은 바사 + 금화 200 + 선원 0명**이라 **첫 행동이 술집행**이다.
- **선원은 술집에서 무리 단위로.** 값이 두 갈래라(계약금은 지금, 일당은 내내) 싸게 태운 대가가 나중에 온다. → `wiki/crew-tavern.md`
- **배는 도시 공업력이 정한다**(`industry ≥ SHIPS[].tier`). 상급선은 선행 선종을 몰아 봐야 열리고 즉시 얻는 길은 **중고선**뿐. 전투는 **탄종 선택** + 백병전 나포. → `QUICKMAP-combat.md`
- **부관은 오직 한 명, 에이미** — 첫날부터 탄 동행이라 계약금도 해고도 없고 **오직 돈만** 만진다. → `wiki/officer.md`
- **세계가 혼자 돈다** — NPC의 거래가 시세에 압력으로 남고, 해적은 턴 만큼 부유해진다. → `wiki/world-npc.md`
- **항로마다 위험이 다르고, 길수록 잦다.** 근거는 **당대 해상보험 요율**(`ROUTE_RISK`) + 그 구간 해적 수(판정 방식은 `QUICKMAP-trade.md`). 내해·육로는 **노상강도·통행세**(`INLAND_ODDS`).
- **바다마다 적의 얼굴이 다르다** — 권역 `npc-pirates.js`의 `PIRATES`·`FOES`(티어 1~5). **수치는 `ENEMIES` 등급 그대로, 이름·국적·선체·깃발만 갈아 끼운다** → `QUICKMAP-combat.md` §3
- **값 차이는 구조이고 흔들림은 시황이다** — `priceOf`가 공통 시황(±12%)과 도시 사정(±3.5%)을 갈라 곱한다. 도시마다 따로 흔들면 산지→수요 사다리가 뒤집힌다(광산에서 멀수록 은이 싸졌다).
- **경제는 "여러 항차"와 "대형 주문 한 건"이 나란하다.** 곡선은 `node tools/sim-stat.mjs 20`(분포) — **1회 실행으로 판단하지 않는다.** → `wiki/economy-trade.md`
- **물가·임금은 사료 비율에 맞춘다.** 대조 축은 둘 — **곡물의 몇 배**, **선원 연봉으로 몇 개**. ‘닢’은 실화폐가 아니라 절대액 환산은 안 한다.
- **급여는 발생주의** — 날마다 쌓여 30일마다 항구에서 치른다(`state.payroll`). 못 주면 **반란이 아니라 이탈**이고 **값나가는 짐을 들고 간다**. → `wiki/payroll.md`
- **항해비는 일곱 갈래**(일당·보급·선체·무장·선단·보험·부관) — **성장할수록만 무거워진다.**
- **값나가는 짐은 두 번 대가를 치른다** — 보험료(`INSURANCE_RATE`)와 해적 조우 확률(`cargoLure`)이 함께 오른다.
- **원양 관문은 배후지를 상대한다** — 대양을 잇는 항구(`OCEAN_LANES`의 양끝)는 시장 깊이가 `MARKET.gateDepth`배. 대량거래 벌점이 "한 번에 크게 사고 파는 쪽"을 때리는데 **원양은 그럴 수밖에 없다**(왕복 48~66일).
- **큰돈은 확률이 아니라 사건에서 나온다** — `state.shocks`가 시세를 올리거나 **내린다**. 빈도가 `CITIES` 수를 따라가 **바다를 넓혀도 밀도가 그대로다**(`SHOCK.densityBase`). → `wiki/economy-trade.md`
- **눌러 보는 검증이 둘** — `tools/playtest.mjs`(절차를 한 방에·`--smoke`) / `tools/playtest-live/`(창을 살려 두고 한 스텝씩 — `start`·`sail`·`click`). 다음 대상은 `wiki/playtest-harness.md` §3-b, 결과는 `wiki/playtest-log.md`.
- **곡선이 나쁘면 게임보다 `sim-core.mjs`의 *플레이 전략*을 먼저 의심한다** — 수리 전략 하나가 "성장 불가" 신호를 냈다(게임은 멀쩡했다). 지금은 **누수 있는 배는 수리 안 함**.
- **`START_GOLD`는 난이도 손잡이가 아니다**(200 유지 — 절벽·평탄 구간 `wiki/playtest-log.md` §4-2-b). 초반 압박이 옅은 진짜 원인은 **삭은 배 무한 운항**(`UNIMPLEMENTED.md` C-13).
- **한글 조사는 `js/josa.js`(leaf)** — `ui.js`가 re-export. `을(를)`·`(으)로`를 손으로 적지 않는다.
- **보험은 실제로 보상한다** — 공동해손 손실의 30%(**낸 만큼만**). → `wiki/economy-trade.md`
- **`story/`에 이 세계를 무대로 한 장편소설이 있다.** **게임 데이터를 바꾸지 않는 것이 규약**이고,
  그 검수가 **게임 후반의 사양서**를 냈다 — A-1 거점 · A-1b 정박 유지비 · A-2 공업력이 값까지 확정.
  **설계는 끝났고 남은 것은 원고다.** 게임 쪽 미결은 **A-1b 하나**.
  → `story/GAME-LINK.md` §8 · `story/level/VERDICT.md` §3-2

## 다음 후보

**목록의 정본은 `UNIMPLEMENTED.md`다**(상태·순서·✅해소 진단까지). 여기는 **방향과 이어받을 자리**만.

- **★ 콘텐츠 확장 — 사용자가 명시한 방향.** 배·교역품·도시·해적의 *종류*를 늘린다.
  구조는 늘려도 막히지 않는다(사건 후보는 `CITIES`에서 매번 생성 · `check-*`는 미조사를 경고로만).
- **사람은 이길 수 있는 상대만 싸우고 나머지는 피한다 — 전투 설계·측정의 전제다**(조우 안내가 양쪽 수치·도주 가망을 먼저 보여 준다 · 도주율 정본 `state.js: fleeOdds` → `QUICKMAP-combat.md`).
- **★ 이어받을 자리 — 지도 질감이 미결이다**(`UNIMPLEMENTED.md` F-8. 워킹트리의 아홉 장이 반복 무늬판).
  그다음은 하네스 `wiki/playtest-harness.md` §3-b의 1번(급여일)부터.

## 메모리 트립와이어

| 대상 | 상한 | 초과 시 |
|---|---|---|
| `claude-memory.md` (always-load) | ≤15KB | 이동/분할 |
| `wiki/gotchas.md` (세션필독) | ≤4KB | 도메인 §3으로 이관 |
| `QUICKMAP.md` (도메인 인덱스) | ≤2.5KB | 키워드 축약 / 도메인 수 조정 |
| `QUICKMAP-<도메인>.md` | ≤25KB·200줄 (30행/8KB 경고) | 하위 재분할 |
| `changelog.md` | ≤40KB | 시점 경계 분할 |

**멈춤 규칙**: 상한 이하면 크기 축소는 더 하지 않는다. 단 **품질 1패스**(중복·stale·과정서술·dead pointer)는 크기와 무관하게 편집할 때마다 돈다.
**메모리에는 최종상태만** — "무엇을 어떻게 고쳤다"는 `changelog.md`가 정본.
