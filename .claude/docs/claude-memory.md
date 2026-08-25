# tradeship — 아홉 바다 교역기

대항해시대 2 풍의 무역·전투 캐주얼 게임. 웹(순수 ES 모듈 + Canvas, 빌드 없음), 픽셀아트.
**바다가 아홉이다** — 지중해 · 대서양/북해 · 아프리카 · 중동/홍해 · 인도양 · 동남아 · 동아시아 · 카리브 · 남아메리카.

## ★ 세션시작 필독 (BLOCKING)

1. **이 파일** + **`wiki/gotchas.md`**(도메인 무관 함정) 를 반드시 먼저 읽는다.
2. **작업 대상이 정해지면 `QUICKMAP.md`를 Read**해 도메인을 고르고, 해당 `QUICKMAP-<도메인>.md`로 간다.
   도메인 파일은 `§1~2 키워드→문서` + `§3 그 도메인 전용 함정`이라 자족적이다.
3. **"마지막 작업이 뭐였나"는 `git log` + `changelog.md` 맨 위**를 본다 — 이 파일은 *최종상태*만 담는다.

도메인: **art** · **trade** · **world** · **combat** · **engine** · **story**(소설 — 코드 아님)

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
| 도메인 라우팅 | `QUICKMAP.md` → `QUICKMAP-{art,trade,world,combat,engine}.md` — §1이 **읽을 문서 + 코드 정본**을 한 줄에 준다 |
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
| 그림 발주 사양 | `assets/BRIEF-MAP.md`·`BRIEF-NPC.md` → `QUICKMAP-art.md` (바다별 의뢰서는 **생성물**) |
| 부관(에이미) | `js/data.js: OFFICER` (정본) → `wiki/officer.md` |
| 급여 정산·체불·이탈·장부 | `state.js`(payroll·settlePayroll) · 화면 `js/payday.js` → `wiki/payroll.md` |
| 협업 경계(누가 어느 파일) | 루트 `CONTRIBUTING.md` · `.github/CODEOWNERS` |
| 그림 교체 절차 | `assets/README.md` |
| 아직 없는 기능·손대는 순서 | `UNIMPLEMENTED.md` |

## 현재 상태

- 게임 루프 3파트(무역·항해·전투) + 조선소·술집 · **후반 4종**(거점·공업력 승급·정박·**가공장** `state.works`). **끝이 둘** — 조선의 「여덟 항구와 한 척」(`ENDING`)과 아홉 바다 **패권**(`HEGEMONY`). 완주 검증 현황(A-8·A-8e)은 `UNIMPLEMENTED.md`가 정본.
- **공개 저장소** `github.com/somanghao/tradeship`(public·main)
- 에셋은 코드 생성이고 PNG로 갈아 끼운다(`bake` 키 → `assets/manifest.json`). ⚠️ **manifest 키는 코드가 *부르는* 키여야 한다** → `QUICKMAP-art.md` §3
- **지도 아홉 장은 PNG다**(`assets/map/`) — **좌표를 옮기면 `gen-map-png.mjs`를 다시 돌린다.** ⚠️ **아홉 장만 미커밋**(F-8 반복 무늬) → `QUICKMAP-art.md` §3
- **통합 대시보드** `/dashboard/` — 게임 모듈을 그대로 돌려 계측한다. **파일이나 state 필드를 늘리면 `dashboard/architecture.mjs`에 적어야** `check-architecture`가 통과한다.
- **값은 `data.js`, 규칙은 `state.js`.** 콘텐츠 수치·도시 경제·**튜닝 상수 전부**가 `js/data.js`, 도시 좌표·항로·해류는 권역 `geo.js`. `state.js`가 re-export하므로 **기존 import 경로는 그대로 쓴다.** → `QUICKMAP-trade.md`
- **입항세는 두 겹** — `TARIFF`(기본율) + `CITY_TARIFF`(오버라이드). **비어 있는 도시는 빠진 게 아니다.** 성질은 `baseTariff()`로 읽는다
- **데이터는 세 겹 — UI ▸ 수치 ▸ 근거**(권역 `geo.js` ▸ `trade.js` ▸ `content/regions/*.json`). **수치를 고치면 근거도 같은 커밋에서.** ★ 특산품·깃발은 이미 사료에 맞다 — **밸런스나 연표만 보고 되돌리면 같은 오류가 재발한다** → `QUICKMAP-world.md` §3
- **한반도 갈래 다섯 중 하나로 시작한다**(`ORIGINS`). ★ **신분 특전은 조선 항구에서만 돈다**(`joseonOnly`) — 제1해에서 가장 센 갈래가 제3해에서 가장 약해진다.
- **선원은 술집에서 무리 단위로** — 값이 두 갈래라(계약금은 지금, 일당은 내내) 싸게 태운 대가가 나중에 온다 → `wiki/crew-tavern.md`
- **배는 도시 공업력이 정한다**(`industry ≥ SHIPS[].tier`). 상급선은 선행 선종을 몰아 봐야 열리고 즉시 얻는 길은 **중고선**뿐. 조선소 목록은 **그 바다 배가 앞줄**이다(`shipOrder`). → `QUICKMAP-combat.md`
- **배는 아홉까지 함께 몬다**(기함 + 동행 8) — 선단은 **가장 느린 배**에 맞고 배마다 선원·항해비가 따로 든다 → `QUICKMAP-combat.md`
- **부관은 에이미 하나** — 첫날부터 탄 동행이라 계약금도 해고도 없다 → `wiki/officer.md`
- **세계가 혼자 돈다** — NPC 거래가 시세에 압력으로 남고, **항구마다 임자가 있어** 덮치면 관계가 상한다 → `QUICKMAP-world.md`
- **항로마다 위험이 다르고 길수록 잦다** — 근거는 **당대 해상보험 요율**(`ROUTE_RISK`) → `QUICKMAP-world.md`
- **바다마다 적의 얼굴이 다르다** — 권역 `npc-pirates.js`(**명부 40**). **수치는 `ENEMIES` 등급 그대로**이고 이름·국적·선체만 갈아 끼운다 → `QUICKMAP-world.md`
- **값 차이는 구조이고 흔들림은 시황이다** — `priceOf`가 시황과 도시 사정을 갈라 곱한다. 도시마다 따로 흔들면 산지→수요 사다리가 뒤집힌다(광산에서 멀수록 은이 싸졌다).
- **경제는 "여러 항차"와 "대형 주문 한 건"이 나란하다 — 그 한 건의 크기는 *선복*이 정한다**(→ `QUICKMAP-world.md`). 곡선은 `node tools/sim-stat.mjs 20`(분포)이고 **거기에 계약은 없다**(크기는 `sim-contract.mjs`). **1회 실행으로 판단하지 않는다.** → `wiki/economy-trade.md`
- **물가·임금은 사료 비율에 맞춘다**(대조 축은 **곡물의 몇 배**·**선원 연봉으로 몇 개**). **‘닢’은 실화폐가 아니라** 절대액 환산을 안 한다.
- **급여는 발생주의** — 날마다 쌓여 30일마다 항구에서 치른다(`state.payroll`). 못 주면 **반란이 아니라 이탈**이고 **값나가는 짐을 들고 간다**. → `wiki/payroll.md`
- **바닥에는 바닥의 규칙이 있다** — 못 낸 돈은 빚이 되고, 급여일에 못 갚으면 채권자가 집행하며, **배를 넘기면 셈이 끝난다**(해상대차). 청산해도 판은 안 끝나고 **1일차 조건**이 된다. → `wiki/payroll.md` §7
- **거점은 자산이면서 고정비다**(연 6%) — 못 내면 **한 번 문을 닫고 두 번째에 압류**, 되팔면 40%, **밀린 것은 그 자리에서 낼 수 있다**. 임차창고는 **그 항구 시세를 열어 준다**(`priceTip`). ⚠️ 소유(`ownsHolding`)·일함(`hasHolding`)·들른 곳(`known`)·소문(`scouted`)이 다 다르다 → `QUICKMAP-trade.md` §3
- **삭은 배는 막히는 게 아니라 값을 문다** — 선체가 바닥이면 **느려지고 실은 짐이 젖는다**(`HULL`). 막으면 삭은 배로 3일 항로뿐인 항구에 갇힌다 → `QUICKMAP-engine.md` §3
- **명부 해적은 찾아가야 만난다** — 소식이 **그 사냥터의 시세까지** 판다(사냥터는 이미 값나가는 항로다 · 적자 0/40). **현상금은 상한 밖이고 항구에서 받는다.** **초무는 지우는 것이 아니라 내 편으로**(과소기·토벌 협조) → `QUICKMAP-world.md`
- **선단은 배수가 아니라 입장권이다** — 적재 배수를 안 준다(161칸 천장 유지). 대신 **원양 호위 의무**·**계약 선복**·**보험 할인** → `QUICKMAP-trade.md` §3
- **동료는 코멘다다**(`COMMENDA` · 편무 25% · 쌍무 50%+밑천) — **초반엔 자본이고 후반엔 비용**이다. 동행선에는 선장이 있어야 하므로 **선단 규모가 동료 수에 묶인다** → `wiki/world-npc.md`
- **항해비는 일곱 갈래** — **성장할수록만 무거워진다.** 정박 중에도 나간다(`waitDays`)
- **값나가는 짐은 두 번 대가를 치른다** — 보험료와 조우 확률이 함께 오른다(`cargoLure`) · **원양 관문은 배후지를 상대한다**(`MARKET.gateDepth`).
- **큰돈은 확률이 아니라 사건에서 나온다** — `state.shocks`가 시세를 올리거나 **내린다** → `wiki/economy-trade.md`
- **눌러 보는 검증** — 창은 **2번 모니터에만** → `wiki/playtest-harness.md`
- **배속은 연출만 줄인다** — 일수·확률은 배속과 **무관**하다 → `QUICKMAP-engine.md`
- **`START_GOLD`는 난이도 손잡이가 아니다**(200 유지 · 근거 `wiki/playtest-log.md` §4-2-b).
- **판은 항구에서 자동 저장된다**(`js/save.js` · 타이틀에 이어하기) — 캠페인이 한 세션에 안 끝난다.
- **한글 조사는 `js/josa.js`(leaf)** — `ui.js`가 re-export. `을(를)`을 손으로 안 적는다.
- **보험은 실제로 보상한다**(공동해손의 30%) → `wiki/economy-trade.md`
- **`story/`에 장편소설이 있다** — **게임 데이터를 바꾸지 않는 것이 규약**이고, 그 검수가 후반 사양을 값까지 냈다 → `story/GAME-LINK.md` §8 · `story/OUTLINE.md`

## 다음 후보

**목록의 정본은 `UNIMPLEMENTED.md`다**(상태·순서·✅해소 진단까지). 여기는 **방향과 이어받을 자리**만.

- **★ 이어받을 자리 — `UNIMPLEMENTED.md` §손대는 순서.** **NPC 동료 배선**이 1순위(데이터 51명은 있다).
- **★ 콘텐츠 확장 — 사용자가 명시한 방향.** 배·교역품·도시·해적의 *종류*를 늘린다.
- **사람은 이길 수 있는 상대만 싸우고 나머지는 피한다 — 전투 설계·측정의 전제다**(도주율 정본 `state.js: fleeOdds` → `QUICKMAP-combat.md`).
- **★ 소설 원고** — 착수 카드·부착표는 `story/ROADMAP.md`(68행 마스터 표·사본).
- 코드 쪽은 **지도 질감**(F-8) · **기함이 침몰하지 않는다**(C-13 — 동행선만 격침된다).

## 메모리 트립와이어

**상한·절차 정본은 `memory-optimizer` 스킬** — 이 프로젝트는 **기본값 그대로**다.
⚠️ **`wc -c`는 CRLF를 센다**(git이 바꾼다) — 판정은 **바이트 − 줄 수**.
`node tools/check-memory-routing.mjs`가 그것까지 대신 잰다 — 트립와이어·dead pointer·고아 문서·hop 수.
★ **라우터는 백틱 경로로도 잇는다**(`QUICKMAP.md`) — 마크다운 링크만 세면 체인이 끊긴 것처럼 보인다.
