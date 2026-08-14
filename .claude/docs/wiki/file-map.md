# 토픽: 파일 ↔ 기능 맵

> 어느 파일이 무엇을 담당하고, 무엇을 바꾸려면 어디를 여는지. (2026-08-08)

## 파일 → 기능

| 파일 | 역할 | 핵심 export |
|---|---|---|
| `js/pixel.js` | 픽셀 드로잉 코어 | `PAL`(팔레트), `G`(드로잉 DSL), `bake`(스프라이트 캐시), `blit`, `outline`(자동 외곽선), `rng` |
| `js/sprites/char.js` | 병종 캐릭터 48×48 | `unitSprite(key, pose, scheme)`, `UNITS`, `SCHEMES`, `CHAR_FOOT` |
| `js/sprites/ship.js` | 선박 측면 176×128 / 탑다운 28×28 | `shipSprite(hull, opts)`, `shipTopSprite`, `HULLS`, `TINTS`, `FLAGS`, `WATERLINE`, `SW` |
| `js/sprites/scene.js` | 배경 + 이펙트 400×225 | `mapSprite`, `portSprite(style,seed)`, `openSeaSprite(mood)`, `blastSprite`, `smokeSprite`, `splashSprite`, `ballSprite`, `cannonSprite(kind,recoil)`, `VW/VH` |
| `js/sprites/icons.js` | 교역품 아이콘 16×16 | `iconSprite(kind)`, `ICON_KEYS` |
| `js/data.js` | 정적 데이터 | `GOODS`, `CITIES`, `ROUTES`, `CURRENTS`, `SHIPS`(+`yards`/`rig`/`crewMin`/`upkeep`), `REFITS`, `SHOTS`, `CANNONS`, `TROOPS`(+`hire`), `RECRUITS`, `ENEMIES`, `SEA_EVENTS`, `MARKET`/`SPREAD`/`TARIFF`/`CONTRACT` |
| `js/world.js` | 저 혼자 도는 세계(NPC) | `initWorld`, `worldTick(days)`, `npcsOnLeg/npcsAtPort/npcPos`, `removeNpc`, `newsLines` |
| `js/state.js` | 게임 상태 + 규칙 | `state`, `priceOf`, `costFor/gainFor`(시장 깊이), `tariffRate`, `windOf/windFactor/routeFactor`(바람·해류), `voyageCost`, `contractOffer/acceptContract/deliverContract`(대형 주문), `buy/sell`, `repair/hire`, `purchaseShip/boardShip/sellShip`(선단), `buyCannon/removeCannon`·`armsFactor/armsAimAt/zoneFactor`(무장), `setSlot/openSlots/trimLoadout`(갑판 배치), `voyageDays`, `rollSeaEvent`, `pickEnemy`, `playerTroops`, `resetGame` |
| `js/ui.js` | DOM 오버레이 헬퍼 | `el`, `modal`, `toast`, `refreshHUD`, `refreshLog`, `iconEl`, `spriteEl`, `spriteElTrim`(여백 크롭), `bar` |
| `js/main.js` | 캔버스/씬 매니저/루프 | `go(scene)`, `toLogical`, `toScreen`, `viewport`, `register` |
| `js/scenes/port.js` | 항구 — 시세·매매·정비·조선소 | `portScene` |
| `js/scenes/map.js` | 지도 — 항로 선택·항해·해상 이벤트·NPC 조우 | `mapScene` |
| `js/scenes/battle.js` | 전투 — 포격전·백병전 | `battleScene` |
| `tools/*.mjs` | 브라우저 없는 검증 (규칙 테스트·세계 테스트·무역 곡선 시뮬) | `node tools/sim-trade.mjs` 등 → [dev-workflow.md](dev-workflow.md) |
| `js/scenes/shipyard.js` | 조선소 — 선박 교체·갑판 배치·무장 → [shipyard.md](shipyard.md) | `shipyardScene` |

기타: `index.html`(셸) · `css/style.css`(UI 테마) · `preview.html`(에셋 미리보기) · `serve.py`(개발 서버 — 캐시 끔, `-m http.server` 대신 이걸 쓴다)

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
| 도시 추가/시세 성향 | `data.js: CITIES` (supply=산지 배율<1, demand=수요 배율>1) |
| 항로 연결 | `data.js: ROUTES` |
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
