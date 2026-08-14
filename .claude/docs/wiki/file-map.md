# 토픽: 파일 ↔ 기능 맵

> 어느 파일이 무엇을 담당하고, 무엇을 바꾸려면 어디를 여는지. (2026-08-14)
> 협업 경계(누가 어느 파일을 만지나)는 저장소 루트 `CONTRIBUTING.md`가 정본이다.

## 파일 → 기능

| 파일 | 역할 | 핵심 export |
|---|---|---|
| `js/pixel.js` | 픽셀 드로잉 코어 | `PAL`(팔레트), `G`(드로잉 DSL), `bake`(스프라이트 캐시 + 에셋 오버라이드 훅), `blit`, `outline`(자동 외곽선), `rng`, `knownKeys`/`keyOf`(스프라이트 키 목록·역추적) |
| `js/assets.js` | 그림을 PNG로 갈아 끼우는 계층 | `loadAssetPack(base)`, `overrideFor(key)`, `registerOverride` — `assets/manifest.json`이 있으면 그 키의 스프라이트만 이미지로 대체 |
| `js/sprites/char.js` | 병종 캐릭터 48×48 | `unitSprite(key, pose, scheme)`, `UNITS`, `SCHEMES`, `CHAR_FOOT` |
| `js/sprites/ship.js` | 선박 측면 176×128 / 탑다운 28×28 | `shipSprite(hull, opts)`, `shipTopSprite`, `HULLS`, `TINTS`, `FLAGS`, `WATERLINE`, `SW` |
| `js/sprites/scene.js` | 배경 + 이펙트 400×225 | `mapSprite`, `portSprite(style,seed)`, `openSeaSprite(mood)`, `blastSprite`, `smokeSprite`, `splashSprite`, `ballSprite`, `cannonSprite(kind,recoil)`, `VW/VH` |
| `js/sprites/icons.js` | 교역품 아이콘 16×16 | `iconSprite(kind)`, `ICON_KEYS` |
| `js/map/geo.js` | 지중해 지리 | `CITY_GEO`(좌표·깃발·규모), `ROUTES`(항로 그래프), `CURRENTS`(해류), `GEO_BY_ID` |
| `js/data.js` | 교역품·도시 경제·선박·적 | `GOODS`, `CITY_TRADE`(supply/demand), `CITIES`(=지리+경제 합성), `ROUTES`/`CURRENTS`(geo에서 re-export), `SHIPS`(+`yards`/`rig`/`crewMin`/`upkeep`), `REFITS`, `SHOTS`, `CANNONS`, `TROOPS`(+`hire`), `RECRUITS`, `ENEMIES`, `SEA_EVENTS`, `MARKET`/`SPREAD`/`TARIFF`/`CONTRACT` |
| `js/world.js` | 저 혼자 도는 세계 — 생성·하루진행·습격·조회 | `initWorld`, `worldTick(days)`, `npcsOnLeg/npcsAtPort/npcPos`, `removeNpc`, `newsLines` |
| `js/npc/config.js` | NPC 튜닝값(숫자만) | `NPC`(traders·pirates·raidBase·pressure·loadRatio·pickTop), `TRADER_SHIPS`/`PIRATE_SHIPS`, `PURSE` |
| `js/npc/behavior.js` | NPC 판단(어디로·무엇을) | `chooseTrade`, `choosePirateMove`, `chooseWander` — 게임 모듈을 import하지 않고 `ctx`로만 받는다 |
| `js/state.js` | 게임 상태 + 규칙 | `state`, `priceOf`, `costFor/gainFor`(시장 깊이), `tariffRate`, `windOf/windFactor/routeFactor`(바람·해류), `voyageCost`, `contractOffer/acceptContract/deliverContract`(대형 주문), `buy/sell`, `repair/hire`, `purchaseShip/boardShip/sellShip`(선단), `buyCannon/removeCannon`·`armsFactor/armsAimAt/zoneFactor`(무장), `setSlot/openSlots/trimLoadout`(갑판 배치), `voyageDays`, `rollSeaEvent`, `pickEnemy`, `playerTroops`, `resetGame` |
| `js/ui.js` | DOM 오버레이 헬퍼 | `el`, `modal`, `toast`, `refreshHUD`, `refreshLog`, `iconEl`, `spriteEl`, `spriteElTrim`(여백 크롭), `bar` |
| `js/main.js` | 캔버스/씬 매니저/루프 | `go(scene)`, `toLogical`, `toScreen`, `viewport`, `register` |
| `js/scenes/port.js` | 항구 — 시세·매매·정비·조선소 | `portScene` |
| `js/scenes/map.js` | 지도 — 항로 선택·항해·해상 이벤트·NPC 조우 | `mapScene` |
| `js/scenes/battle.js` | 전투 — 포격전·백병전 | `battleScene` |
| `content/city-evidence.json` | 도시 수치의 **근거 정본** — 항목별 `{side, value, verdict, basis, sources[]}` | 서술본은 [city-goods-history.md](city-goods-history.md), 정합 검사는 `tools/check-evidence.mjs` |
| `tools/check-evidence.mjs` | 코드(`CITY_TRADE`·깃발) ↔ 근거 JSON 정합 검사 | 불일치·근거누락·유령항목이면 exit 1 |
| `tools/sim-core.mjs` | 무역 시뮬의 몸통(출력 없음) — CLI와 대시보드가 같은 코드를 돌린다 | `runSim({maxVoyages, hooks})`, `planFor`, `bestRun` |
| `tools/*.mjs` | 브라우저 없는 검증 (규칙 테스트·세계 테스트·무역 곡선 시뮬) | `node tools/sim-trade.mjs` 등 → [dev-workflow.md](dev-workflow.md) |
| `dashboard/measure.mjs` | 시뮬을 돌리며 지표 채집(DOM 없음 — node로도 검증 가능) | `measure(voyages)`, `statsOf`, `starvedCells`, `allCells` |
| `dashboard/dash.js` | 경제 대시보드 렌더 | 시세 매트릭스·현금흐름·물동량·NPC — 규칙을 재구현하지 않고 게임 모듈을 그대로 돌린다 |
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
| 그림을 PNG로 교체 | `assets/manifest.json` (키는 `preview.html`에서) → `assets/README.md` |
| 선박 성능/가격 | `data.js: SHIPS` |
| 적 강함·전리품 | `data.js: ENEMIES` |
| 해적 조우 빈도 | `data.js: SEA_EVENTS`의 weight |
| 시세 변동폭·주기 | `state.js: wobble()` (현재 3일 주기 ±15%) |
| 병종 능력치·고용비 | `data.js: TROOPS` (`hire` 있는 병종만 갑판 배치 가능 — `RECRUITS`) |
| 대포 성능·유효 구간 | `data.js: CANNONS` (`near`~`far`) → [shipyard.md](shipyard.md) |
| 선박 매각 비율 · 갑판 슬롯 규칙 | `state.js: SHIP_RESALE` · `openSlots()`(선원 7명당 1칸) |
| 캐릭터 의상 색 | `sprites/char.js: SCHEMES` |
| 도시 건축 양식 | `sprites/scene.js: STYLES` (latin / hellenic / levant) |
| 지도 지형 | `sprites/scene.js: SEA_SPANS` / `ISLES` → [map-terrain.md](map-terrain.md) 필독 |
