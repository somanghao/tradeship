# 토픽: 파일 ↔ 기능 맵

> 어느 파일이 무엇을 담당하고, 무엇을 바꾸려면 어디를 여는지. (2026-08-14)
> 협업 경계(누가 어느 파일을 만지나)는 저장소 루트 `CONTRIBUTING.md`가 정본이다.

## 파일 → 기능

| 파일 | 역할 | 핵심 export |
|---|---|---|
| `js/pixel.js` | 픽셀 드로잉 코어 | `PAL`(팔레트), `G`(드로잉 DSL), `bake`(스프라이트 캐시 + 에셋 오버라이드 훅), `blit`, `outline`(자동 외곽선), `rng`, `knownKeys`/`keyOf`(스프라이트 키 목록·역추적) |
| `js/assets.js` | 그림을 PNG로 갈아 끼우는 계층 | `loadAssetPack(base)`, `overrideFor(key)`, `registerOverride` — `assets/manifest.json`이 있으면 그 키의 스프라이트만 이미지로 대체 |
| `js/evidence.js` | 게임이 근거 JSON을 읽는 자리 | `loadEvidence()`, `goodRank(city,good,side)` — 항구 시장 목록을 **근거 신뢰도 순**으로 쌓는다. 못 읽으면 조용히 원래 순서(`assets.js`와 같은 fail-soft) |
| `js/sprites/char.js` | 병종 캐릭터 48×48 | `unitSprite(key, pose, scheme)`, `UNITS`, `SCHEMES`, `CHAR_FOOT` |
| `js/sprites/ship.js` | 선박 측면 176×128 / 탑다운 28×28 | `shipSprite(hull, opts)`, `shipTopSprite`, `HULLS`, `TINTS`, `FLAGS`, `WATERLINE`, `SW` |
| `js/sprites/scene.js` | 배경 + 이펙트 400×225 | `mapSprite`, `portSprite(style,seed)`, `openSeaSprite(mood)`, `blastSprite`, `smokeSprite`, `splashSprite`, `ballSprite`, `cannonSprite(kind,recoil)`, `VW/VH` |
| `js/sprites/icons.js` | 교역품 아이콘 16×16 | `iconSprite(kind)`, `ICON_KEYS` |
| `js/map/geo.js` | 지중해 지리 | `CITY_GEO`(좌표·깃발·규모·**`industry` 공업력**·`prizeYard`), `ROUTES`(항로 그래프), `CURRENTS`(해류), `GEO_BY_ID` |
| `js/data.js` | 교역품·도시 경제·선박·적 | `GOODS`, `CITY_TRADE`(supply/demand), `CITIES`(=지리+경제 합성), `ROUTES`/`CURRENTS`(geo에서 re-export), `SHIPS`(+`tier`/`originFlag`/`era`/`requires`/`yards`=전통 조선지/`rig`/`crewMin`/`upkeep`), `REFITS`, `SHOTS`, `CANNONS`, `TROOPS`(+`hire`), `RECRUITS`, `ENEMIES`, `SEA_EVENTS`, `MARKET`/`SPREAD`/`TARIFF`/`CONTRACT` |
| `js/world.js` | 저 혼자 도는 세계 — 생성·하루진행·습격·조회 | `initWorld`, `worldTick(days)`, `npcsOnLeg/npcsAtPort/npcPos`, `removeNpc`, `newsLines` |
| `js/npc/config.js` | NPC 튜닝값(숫자만) | `NPC`(traders·pirates·raidBase·pressure·loadRatio·pickTop), `TRADER_SHIPS`/`PIRATE_SHIPS`, `PURSE` |
| `js/npc/behavior.js` | NPC 판단(어디로·무엇을) | `chooseTrade`, `choosePirateMove`, `chooseWander` — 게임 모듈을 import하지 않고 `ctx`로만 받는다 |
| `js/state.js` | 게임 상태 + 규칙 | `state`, `priceOf`, `costFor/gainFor`(시장 깊이), `tariffRate`, `windOf/windFactor/routeFactor`(바람·해류), `voyageCost`, `contractOffer/acceptContract/deliverContract`(대형 주문), `buy/sell`, `repair/hire`, `purchaseShip/boardShip/sellShip`·`sellsShip/tierNeeded/yardCapable/shipPriceAt/buildableAt`(조선소)·`usedListings/buyUsed`(중고선)·`shipLockedBy`(해금), `buyCannon/removeCannon`·`armsFactor/armsAimAt/zoneFactor`(무장), `setSlot/openSlots/trimLoadout`(갑판 배치), `voyageDays`, `rollSeaEvent`, `pickEnemy`, `playerTroops`, `resetGame` |
| `js/ui.js` | DOM 오버레이 헬퍼 | `el`, `modal`, `toast`, `refreshHUD`, `refreshLog`, `iconEl`, `spriteEl`, `spriteElTrim`(여백 크롭), `bar` |
| `js/main.js` | 캔버스/씬 매니저/루프 | `go(scene)`, `toLogical`, `toScreen`, `viewport`, `register` |
| `js/scenes/port.js` | 항구 — 시세·매매·정비·조선소 | `portScene` |
| `js/scenes/map.js` | 지도 — 항로 선택·항해·해상 이벤트·NPC 조우 | `mapScene` |
| `js/scenes/battle.js` | 전투 — 포격전·백병전 | `battleScene` |
| `content/city-evidence.json` | 도시 수치의 **근거 정본** — 항목별 `{side, value, verdict, basis, sources[]}` | 서술본은 [city-goods-history.md](city-goods-history.md), 정합 검사는 `tools/check-evidence.mjs` |
| `content/route-evidence.json` | 항로 위험도의 **근거 정본** — 항로별 `{risk, verdict, basis, sources[]}`. `risk`는 당대 해상보험 요율(%) | 수치 정본은 `map/geo.js: ROUTE_RISK`, 검사는 `tools/check-routes.mjs` |
| `tools/check-evidence.mjs` | 코드(`CITY_TRADE`·깃발) ↔ 근거 JSON 정합 검사 | **실패**: 값 불일치·유령항목·'확인됨'인데 무출처. **경고**: 미조사·짧은 basis — 근거가 없다고 실패시키면 콘텐츠를 못 늘린다 |
| `tools/check-routes.mjs` | `ROUTE_RISK` ↔ `route-evidence.json` 정합 + **"확률이 실제로 갈렸는가"** 검사 | 배선이 끊겨 전 항로가 같은 확률이면 exit 1 |
| `content/wage-evidence.json` | 부관·선원 보수의 **근거 정본** — 사료 앵커(배율)·발견·판정 | 수치 정본은 `data.js: OFFICER`·`state.js: CREW_WAGE`, 검사는 `tools/check-wages.mjs` |
| `content/goods-evidence.json` | **교역품 물가**의 근거 — 밀·소금·기름·와인·후추 사료가, 화물 1칸의 실물 정의, **대조 2축의 정본** | 검사 `tools/check-prices.mjs` |
| `content/asset-evidence.json` | **선박·부동산**의 근거 — 캐랙 건조비·갤리·집세·주택값 + "선원 연봉의 몇 배" 지표 | 부동산은 아직 게임 기능이 아니라 스케일 기준점 |
| `content/upkeep-evidence.json` | **유지비·위험비용**의 근거 — 선체/무장 유지, 적하보험 요율, 화물 유인 | 임금을 내린 대신 압박을 옮긴 자리 |
| `content/voyage-evidence.json` | **한 항차가 얼마를 버나**의 근거 — 이익률·보험료율·전손률·코멘다 분배·톤당승조원 + 목표 밴드 | ★게임 실측값은 안 적는다(콘텐츠가 바뀌면 거짓이 된다) — `check-voyage.mjs`가 그때그때 산출해 대조. 조사 원문 [research-voyage-returns.md](research-voyage-returns.md) |
| `tools/check-prices.mjs` | 교역품 상대가격·임금 사다리·임금 대비 배값·유지비 계수를 근거와 대조 | 절대액이 아니라 **비율**을 지킨다 |
| `tools/check-voyage.mjs` | 항차 수익 **분포** 검증 | ROI 중앙값·꼬리비·손실 빈도·톤당승조원 ↔ `content/voyage-evidence.json`. 시뮬을 시드 평균으로 돌린다 — 상수 대조가 아니라 분포 대조라 결이 다르다 |
| `tools/check-wages.mjs` | `OFFICER.wage`·`cut` ↔ `wage-evidence.json` 정합 + 파생 배율 재계산 | 배율을 손으로 적어 둔 값이 굳으면 exit 1 |
| `tools/check-map.py` | **납품된 지도 그림 검수**(Pillow) — 규격·색수(손실 webp)·도시 16곳 해안선·항로 28개·바다 소음 | 좌표는 `map/geo.js`에서 직접 읽는다 · 기준판은 `assets/map-reference/` |
| `tools/sim-risk.mjs` | 최적 플레이가 실제로 다니는 항로에 가중한 **실효 조우율** | `sim-core`는 해상 이벤트를 모델링하지 않아 자산 곡선으로는 위험도 변화가 안 잡힌다 — 그 빈자리를 메운다 |
| `tools/sim-core.mjs` | 무역 시뮬의 몸통(출력 없음) — CLI와 대시보드가 같은 코드를 돌린다 | `runSim({maxVoyages, hooks})`, `planFor`, `bestRun` |
| `tools/*.mjs` | 브라우저 없는 검증 (규칙 테스트·세계 테스트·무역 곡선 시뮬) | `node tools/sim-trade.mjs` 등 → [dev-workflow.md](dev-workflow.md) |
| `dashboard/measure.mjs` | 경제 지표 채집(DOM 없음 — node로도 검증 가능) | `measure(voyages)`, `statsOf`, `starvedCells`, `allCells` |
| `dashboard/wages.mjs` | 보수 지표 채집(DOM 없음) | `measureAll` — 급여 사다리·수입 시계열·**시드 고정 짝지어 비교**(Math.random을 잠시 갈아 끼운다) |
| `dashboard/pirates.mjs` | 해적 지표 채집(DOM 없음) | `measureAll` — 조우확률(`rollSeaEvent` 실측)·등급분포(`pickEnemy`)·현상금(`pirateEnemy`)·NPC 위치 프레임·항로 위험 |
| `dashboard/dash.js` | **경제 탭** 렌더 | 시세 매트릭스·현금흐름·물동량·NPC |
| `dashboard/pirate-view.js` | **해적 탭** 렌더 | 조우빈도·등급표·자산별 발생확률·지도(재생)·항로 밀도·명부 |
| `dashboard/wage-view.js` | **보수 탭** 렌더 | 보수 사다리·사료 대조(배율)·수입 구성·항해비 몫·짝지어 비교·근거표 |
| `dashboard/shared.mjs` | 세 탭 공용 그리기 도구 | `$`·`el`·`svg`·`node`·`heat`·`TIER_COLOR`·툴팁 — 갈라지면 한 화면으로 안 보인다 |
| `dashboard/ports.mjs` | **항구** 지표 채집(DOM 없음) | `portRows`·`goodsOf`(근거 신뢰도 순 정렬)·`yardOf`(공업력)·`realEstate`(부동산 앵커 배율 환산) |
| `dashboard/port-view.js` | **항구 탭** 렌더 | 항구 일람·상세(교역품 3묶음)·공업력 비교·부동산·근거 현황 |
| `dashboard/app.js` | 탭 셸 | 왼쪽 사이드바 · 해적·항구·보수 탭은 **처음 열 때만** 계측(무겁다) |
| `js/scenes/shipyard.js` | 조선소 — 선박 교체·갑판 배치·무장 → [shipyard.md](shipyard.md) | `shipyardScene` |

기타: `index.html`(셸) · `css/style.css`(UI 테마) · `preview.html`(에셋 미리보기 — 그림마다 `bake` 키를 적어 준다) · `serve.py`(개발 서버 — 캐시 끔 + `.mjs` MIME 등록, `-m http.server` 대신 이걸 쓴다) · `assets/`(에셋 팩 — `README.md`에 교체 절차)

## 씬 흐름

```
port ──조선소──▶ shipyard ──나가기──▶ port      (선박·선원·무장)
port ──출항──▶ map ──도시 클릭──▶ (항해 연출)
                     │
                     ├ 이벤트 없음 ─▶ port (도착)
                     ├ 폭풍/표류물 ─▶ 모달 ─▶ 항해 재개
                     └ 해적 조우 ──▶ battle
                                       ├ 승리/도주 ─▶ map (항해 재개)
                                       └ 패배 ─────▶ port
```

## 데이터 조정 지점

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 도시 추가 | `map/geo.js: CITY_GEO`(좌표·깃발·규모) **와** `data.js: CITY_TRADE`(경제)에 **같은 id**로 — 한쪽만 넣으면 콘솔 경고 |
| 시세 성향 | `data.js: CITY_TRADE` (supply=산지 배율<1, demand=수요 배율>1) |
| 항로 연결 | `map/geo.js: ROUTES` |
| NPC 수·습격률·시장 영향 | `npc/config.js: NPC` |
| 도시 수치의 근거·출처 | `content/city-evidence.json` → `node tools/check-evidence.mjs` |
| 항로 위험도의 근거·출처 | `content/route-evidence.json` · 수치는 `map/geo.js: ROUTE_RISK` → `node tools/check-routes.mjs` |
| 부관 보수의 근거·출처 | `content/wage-evidence.json` · 수치는 `data.js: OFFICER` → `node tools/check-wages.mjs` |
| 그림 발주 사양 | `assets/PORT-BACKGROUND-BRIEF.md`(항구 16장) · `assets/WORLD-MAP-BRIEF.md`(지도 1장) |
| 그림을 PNG로 교체 | `assets/manifest.json` (키는 `preview.html`에서) → `assets/README.md` |
| 선박 성능/가격/등급 | `data.js: SHIPS` (`tier`=필요 공업력 · `requires`=해금) |
| 어느 항구에서 뭘 짓나 | `map/geo.js: industry` (0~3) → [shipyard.md](shipyard.md) |
| 적 강함·전리품 | `data.js: ENEMIES` |
| 해적 조우 빈도 | `data.js: SEA_EVENTS`의 weight |
| 시세 변동폭·주기 | `state.js: wobble()` (현재 3일 주기 ±15%) |
| 병종 능력치·고용비 | `data.js: TROOPS` (`hire` 있는 병종만 갑판 배치 가능 — `RECRUITS`) |
| 대포 성능·유효 구간 | `data.js: CANNONS` (`near`~`far`) → [shipyard.md](shipyard.md) |
| 선박 매각 비율 · 갑판 슬롯 규칙 | `state.js: SHIP_RESALE` · `openSlots()`(선원 7명당 1칸) |
| 캐릭터 의상 색 | `sprites/char.js: SCHEMES` |
| 도시 건축 양식 | `sprites/scene.js: STYLES` (latin / hellenic / levant) |
| 지도 지형 | `sprites/scene.js: SEA_SPANS` / `ISLES` → [map-terrain.md](map-terrain.md) 필독 |
