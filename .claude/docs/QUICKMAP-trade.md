# QUICKMAP — trade (교역 경제 · 세계 · 고증)

> 시세·물가·항해비·NPC·계약과 그 **고증 근거**. 돈이 흐르는 쪽 전부.
> 전투·선박·조선소·무장은 [QUICKMAP-combat.md](QUICKMAP-combat.md)로 간다.

## 1. 키워드 → 문서 · 코드 정본

**한 줄에 "무엇을 읽고 어느 파일을 여는가"가 함께 있다.** 문서는 왜·어떻게, 코드는 값.

| 키워드 | 읽을 문서 | 코드 정본 |
|---|---|---|
| 시세 · 가격 공식 · 산지/수요 · `wobble` · 매매 · 손익 · 매입가 · 화물/적재 · 항해 일수 · 항해비 · 초기 조건 · 무역 곡선 | [wiki/economy-trade.md](wiki/economy-trade.md) | `js/data.js`(GOODS·CITY_TRADE·SPREAD·MARKET·TARIFF) · `js/state.js`(priceOf·buy/sell·voyageCost) |
| **부관 · 부선장 · 에이미** · 급여 · 성과급 · 입항세 감면 · 시장압력 감면 | [wiki/officer.md](wiki/officer.md) | `js/data.js: OFFICER` · `js/state.js`(officerPerk·voyageCost의 officer·sell의 cut) |
| 상인/해적 NPC · 세계가 혼자 돈다 · 시장압력의 출처 · 해상 조우(흥정·약탈) · 소문 · **대형 주문(계약)** · 선금/위약금/기한 | [wiki/world-npc.md](wiki/world-npc.md) | 숫자 `js/npc/config.js` · 판단 `js/npc/behavior.js` · 집행 `js/world.js` · 계약 `js/data.js: CONTRACT` |
| **도시 특산품 고증** · 어느 도시가 뭘 팔았나 · 깃발/국적 근거 · 사료 출처 | [wiki/city-goods-history.md](wiki/city-goods-history.md) (서술본·34KB로 무겁다) | **`content/city-evidence.json`**(기계 정본) → 검증 `node tools/check-evidence.mjs` |
| **교역품 물가 고증** · 밀·소금·기름·와인·후추가 서로 몇 배였나 · 화물 1칸은 실제로 얼마인가 · **대조 2축의 정본** | 근거 JSON이 곧 문서다(주석이 상세) | **`content/goods-evidence.json`** → 검증 `node tools/check-prices.mjs` |
| **선박·부동산 고증** · 배가 선원 연봉의 몇 배인가 · 집세·주택값 · 거점을 넣을 때의 앵커 | 근거 JSON | **`content/asset-evidence.json`** (부동산은 아직 게임 기능이 아니라 스케일 기준점) |
| **유지비·위험비용 고증** · 선체/무장 유지 · 적하보험 · 화물이 해적을 부르는 정도 | 근거 JSON | **`content/upkeep-evidence.json`** |
| **급여 고증** · 부관이 선원의 몇 배인가 · maestre · 사무역(quintalada) | [wiki/officer.md](wiki/officer.md) §고증 — 지금 ×2.17로 **c.1500 사료 구간(2.0~2.3) 안**이다(한때 ×6.67 = 1634년 값) | **`content/wage-evidence.json`** → 검증 `node tools/check-wages.mjs` |
| **항로 위험도 고증** · 어느 항로가 위험했나 · 보험료율 | 근거 JSON이 곧 문서다 | **`content/route-evidence.json`** · 수치 `js/map/geo.js: ROUTE_RISK` → 검증 `node tools/check-routes.mjs` |
| 경제·해적·보수 **관측**(시세가 실제로 움직이나 · 물자가 닿나 · 자산 곡선 · 조우확률 · 급여 사료 대조) | `dashboard/` — `python serve.py` 후 `/dashboard/` | 계측 `dashboard/measure.mjs`·`pirates.mjs`·`wages.mjs` · 렌더 `dash.js`·`pirate-view.js`·`wage-view.js` · 공용 `shared.mjs` · 셸 `app.js` |
| 파일이 뭘 담당하나 · 씬 흐름 (역방향: 파일 → 기능) | [wiki/file-map.md](wiki/file-map.md) | — |

## 2. 수치를 어디서 고치나

| 하고 싶은 것 | 어디 |
|---|---|
| 교역품 기준가 | `data.js: GOODS[].base` — 곡물 20닢이 기준이고 나머지는 **사료 비율**(향신료 ×16.5·비단 ×21·금괴 ×35). 고치면 `content/goods-evidence.json`도 같은 커밋에서 |
| 교역품 추가 | `data.js: GOODS` + `sprites/icons.js`에 아이콘 |
| 차익 폭(돈 버는 속도) | `data.js: SPREAD` — 이 한 계수가 무역 곡선 전체를 좌우한다 |
| 시세 변동폭·주기 | `state.js: wobble()` (3일 주기 ±15%) |
| 대량 거래 벌점 | `data.js: MARKET` (`depthPerSize`·`impact`·`cap`·`decay`) |
| 입항세 | `data.js: TARIFF` (도시 size별) |
| 항해비 갈래 | `state.js: voyageCost()` — 일당(`CREW_WAGE` 1.2)·보급(`SUPPLY_UNIT` 1.3)·선체(`HULL_UPKEEP`×`SHIPS[].upkeep`)·무장(`ARM_UPKEEP`)·선단·**적하보험**(`INSURANCE_RATE`×항로요율×화물가치)·부관 |
| 부관 급여·성과급·능력 | `data.js: OFFICER` — `wage`·`cut`·`perks`는 **한 묶음**이라 함께 재측정. 고치면 `content/wage-evidence.json`도 같은 커밋에서 → [officer.md](wiki/officer.md) |
| 도시 추가 | `map/geo.js: CITY_GEO`(좌표·깃발·규모) **와** `data.js: CITY_TRADE`(경제)에 **같은 id**로 — 한쪽만 넣으면 콘솔 경고 |
| 시세 성향 | `data.js: CITY_TRADE` — `supply`(배율<1, 산지) / `demand`(배율>1, 수요지). 근거 → [city-goods-history.md](wiki/city-goods-history.md) |
| 도시 수치의 근거·출처 | `content/city-evidence.json` (정본) — 고치면 `node tools/check-evidence.mjs`. 대시보드 매트릭스 **근거** 모드에서도 보인다 |
| 항로 연결 | `map/geo.js: ROUTES` — 선 하나가 경제 전체의 물길을 바꾼다 |
| 바람·해류 | `map/geo.js: CURRENTS` · 배의 `rig` · `state.js: windOf/windFactor/routeFactor` |
| 해적 조우 빈도 | 기본 표는 `data.js: SEA_EVENTS`(합 100), **항로별 차등은 `map/geo.js: ROUTE_RISK` → `state.js: encounterOdds()`**. 라벨은 `routeDangerLabel()` |
| 항로 위험도 값 | `map/geo.js: ROUTE_RISK`(요율 %, `null`=내해·육로) · 환산 상수는 `state.js: ODDS_BASE/ODDS_PER_PCT/THREAT_PER_SHIP` |
| 화물이 해적을 부르는 정도 | `state.js: cargoLure` (`LURE_PER` 9,000닢당 `LURE_PER_STEP` 5%p·상한 14%p) → `encounterOdds`에 더해진다 |
| 계약 규모·보수·위약금 | `data.js: CONTRACT` — **보수(`value`)를 먼저 정하고 수량을 역산**한다(품목이 비싸다고 계약이 통째로 커지지 않게) |
| NPC 수·습격률·시장 영향·싣는 양 | `npc/config.js: NPC` (traders·pirates·raidBase·pressure·loadRatio·pickTop) |
| NPC가 어디로 갈지·무엇을 살지 | `npc/behavior.js: chooseTrade/choosePirateMove` — `ctx`로만 받으므로 통째로 갈아 끼워도 `world.js`는 그대로 |
| 경제가 실제로 도는지 확인 | 대시보드 `/dashboard/` · 곡선 `node tools/sim-trade.mjs` · 실효 위험 `node tools/sim-risk.mjs` · 항차 수익 분포 `node tools/check-voyage.mjs` · 화면 없이 계측만 `node -e "import('./dashboard/measure.mjs')…"` |
| 대시보드 탭이 무엇을 보여주나 | 사이드바 4탭. **경제** 시세·현금흐름·물동량·NPC(`dash.js`) · **해적** 조우확률·등급별 발생·현상금·NPC 위치 재생·항로 위험(`pirate-view.js`+`pirates.mjs`) · **항구** 항구별 교역품(근거 신뢰도 순)·공업력·부동산 앵커·근거 현황(`port-view.js`+`ports.mjs`) · **보수** 급여 사다리·사료 대조·에이미 수입·부관 유무 짝비교(`wage-view.js`+`wages.mjs`). 탭 셸은 `app.js`, 공용 그리기는 `shared.mjs` |
| 대시보드 탭 추가 | `index.html`에 nav `.grp` + `section.tabpage` → `app.js`에 `run*()`/`*Loaded()` 배선 → 계측 `*.mjs`(출력 없는 순수 로직) + 그리기 `*-view.js`로 가른다 |
| 시장 충격(기근·봉쇄·풍작·나포) | `data.js: SHOCK.events`(종류·확률·문구) · 판정 `state.js: shockFactor/addShock/rollShockEvents` · 나포 배선 `world.js: raids()` · 화면 `scenes/map.js` "뱃사람들의 소문" |
| 화물을 잃는 사건 | 폭풍 투하 `state.js: jettisonOdds/jettisonCargo` · 보상 `INSURANCE_COVER` · 뭍의 사고 `banditRaid/payToll`(`INLAND_ODDS`) · 빈도 검증 `node tools/sim-risk.mjs` |
| 게임이 근거 JSON을 읽는 곳 | `js/evidence.js` — 항구 시장 목록을 **근거 신뢰도 순**으로 쌓으려고 `content/city-evidence.json`을 읽는다. 못 읽으면 조용히 원래 순서(`assets.js`와 같은 fail-soft) |

## 3. 이 도메인 전용 함정·가드

- **시세 노이즈는 `Math.random()`이 아니라 (도시·품목·날짜) 해시**다. 항구를 나갔다 들어와도 값이 변하면 안 된다(재입장 스캠 방지). `wobble()`을 난수로 바꾸지 말 것.
- **매매 수량은 실패시키지 말고 클램프**한다. `min(요청, 화물여유, floor(gold/단가))` — "가능한 만큼" 사는 게 기존 UX다.
- **전량 매도 시 `cargo`와 `buyPrice`를 함께 삭제**한다. 안 그러면 수량 0 항목이 손익 계산에 남는다.
- **경제 수치를 건드리면 `node tools/sim-trade.mjs`를 다시 돌린다.** 최적 플레이·다품목·NPC를 가정한 무역 곡선으로 "몇 항차에 어느 배"가 나온다. `SPREAD` 하나만 움직여도 초반이 무너지거나 후반이 막힌다 — 눈으로 판단하지 말 것.
- **임금을 내리면 후반이 풍족해진다 — 압박을 옮겨야 한다.** 임금이 사료 대비 과중해서 내렸더니(선원 2.4→1.2·부관 16→2.6) 90항차 자산이 +65%로 뛰었다. 인건비는 **규모와 무관하게 붙는 고정비**라 후반 브레이크 역할을 하고 있었기 때문이다. 그래서 선체 유지·무장 유지·**적하보험**을 신설해 성장할수록만 무거워지게 옮겼다. 임금 계수 하나만 만지고 끝내면 곡선이 반드시 무너진다.
- **`GOODS[].base`를 고치면 `content/goods-evidence.json`도 같은 커밋에서.** `node tools/check-prices.mjs`가 곡물 대비 비율·임금 사다리·**임금 대비 배값**(캐랙 ÷ 선원연봉)·유지비 계수를 대조해 실패시킨다. 이 "임금 대비 배값"이 낮으면 배가 싼 게 아니라 **임금이 비싼** 것이다 — 부관 급여 과다가 실제로 여기서 드러났다.
- **교역품 값을 올리면 화물 매입 자본이 커진다.** 사료 비율로 기준가를 올렸더니 시뮬이 배를 사고 나서 실을 것을 못 사 **절반이 파산**했다(금화의 92%까지 배에 쓰던 규칙 때문). 물가를 만지면 `sim-core`의 구매 여유(`state.gold * 0.70`)도 함께 본다.
- **`ROUTE_RISK`는 두 곳에서 쓰인다.** 해적 조우 확률(`encounterOdds`)과 **적하보험료**(`insuranceFor`)다. 요율을 고치면 위험만 바뀌는 게 아니라 후반 비용 구조가 함께 움직인다 — 한쪽만 보고 조정하지 말 것.
- **`ROUTE_RISK`를 고치면 `content/route-evidence.json`도 같은 커밋에서.** `node tools/check-routes.mjs`가 불일치·유령 항로뿐 아니라 **"확률이 실제로 갈렸는가"**까지 본다(배선이 끊기면 실패). 요율은 추정이 아니라 당대 인수업자가 매긴 값이라 감으로 바꾸지 말 것.
- **`SEA_EVENTS`의 weight 합 100을 깨지 말 것.** 항로별 위험은 pirate weight를 갈아 끼우고 **그 차이를 calm에서 덜어와** 유지한다(`state.js: rollSeaEvent`). pirate만 올리면 폭풍·표류물·상선조우의 상대 빈도가 통째로 내려앉는다 — 테스트가 이걸 지킨다.
- **시뮬 수치는 반드시 여러 시드를 평균한다 — 한 판은 판단 근거가 못 된다.** "내해를 안전하게 만들어 실효 조우율이 18%→**10.3%**로 내려갔다(90항차 중 33항차가 무위험)"고 메모리에 적어 두고 대체 이벤트까지 후보로 올렸는데, **시드 20판을 평균하니 18.6%·내해 통과 7%로 종전과 같았다**(2026-08-15 정정). 원인은 `sim-risk.mjs`가 시드 없는 1회 실행이었던 것 — 어느 항로를 탔느냐가 통째로 운이라 10%대와 20%대를 오간다. 지금은 `node tools/sim-risk.mjs [항차] [시드수]`가 평균을 낸다. **`sim-trade.mjs`로는 안 잡힌다**(해상 이벤트를 모델링하지 않는다).
- **항차 ROI는 경제가 아니라 "얼마나 가려 싣느냐"가 정한다.** `sim-core.mjs: planFor`의 `minMargin`이 0이면(총이익 최대화) 마지막 칸의 마진이 0이라 중앙값이 5%로 눌리고, 0.15면 같은 경제·같은 시드에서 10.1%가 된다. 조사가 "중앙값이 사료(10~20%)의 절반"이라며 `MARKET`을 낮추자고 제안했으나 **실측에서 폐기**했다 — impact를 0.36→0.22로 낮추면 중앙값은 1.7%p 오르고 90항차 자산이 34k→100k로 부푼다. 판정은 `node tools/check-voyage.mjs`가 근거 파일이 정한 minMargin에서만 한다.
- **`CITY_TRADE`를 고치면 `content/city-evidence.json`도 같은 커밋에서 고친다.** 항목마다 판정(`confirmed`/`probable`/`corrected`/`gameplay`)·근거·출처가 붙어 있고 `node tools/check-evidence.mjs`가 불일치·누락·유령 항목을 잡아 **실패시킨다**. 수치만 바꾸면 "왜 이 값인지"를 아무도 모르게 된다.
- **`CITY_TRADE` 수치에는 고증 근거가 달려 있다.** 15~16세기 실제 교역을 조사해 맞춰 둔 것이라, 밸런스만 보고 되돌리면 같은 오류가 재발한다(곡물을 북아프리카 수요지로 두는 것이 대표적 — 알제·튀니스는 곡물 **수출**지였다). 게임성 때문에 일부러 고증을 덮어쓴 곳도 문서에 따로 적혀 있으니 고치기 전에 [city-goods-history.md](wiki/city-goods-history.md)를 본다.
- **품목마다 산지와 수요지가 둘 다 있어야 죽지 않는다.** 산지만 있고 수요가 0이면 그 품목은 중립가로만 팔린다(거래는 되지만 재미가 준다). 반대로 수요만 있고 산지가 0이면 그 칸은 아예 죽는다 — 모피가 그럴 뻔했고 이스탄불(흑해 관문)을 산지로 세워 살렸다. 확인은 대시보드 **물동량** 모드.
- **수요지를 신설해도 항로가 멀면 아무도 안 나른다.** NPC는 이웃 한 칸만 보므로 중간 항구가 먼저 흡수한다. 이스탄불 곡물 수요를 넣었더니 유입이 **1**이었고, 알렉산드리아 직항을 놓고서야 흘렀다. 수요를 추가하면 대시보드 "부족한데 아무도 안 나르는 곳"을 반드시 확인할 것.
- **도시는 두 파일에 걸쳐 있다.** 지리(`map/geo.js: CITY_GEO`)와 경제(`data.js: CITY_TRADE`)를 id로 맞물려 `CITIES`를 합성한다. 한쪽에만 추가하면 게임은 돌지만 그 항구가 아무것도 안 팔거나 지도에 안 나온다 — 콘솔 경고로만 드러난다.
- **도시를 추가하면 지도에서 이름표가 겹친다.** 클릭 판정은 반경 6px(`map.js: onClick`)이라 도시 간 12px 이상이어야 하고, 이름표는 도시 **위쪽**(`y-r-4`)에 배경 박스째 그려져 이웃 도시의 항구 표식을 덮는다. 부르사·이즈니크를 넣었을 때 이스탄불과 4건이 겹쳤다 — 좌표를 넣고 나서 **겹침을 계산해 보고** 자리를 잡는다(라벨 폭은 한글 6px 폰트 기준 글자당 약 6px).
- **연표로 콘텐츠를 덜어내지 않는다(최상위 지침).** 도시·세력·선종을 넣을 때 "그 해에 있었나"를 따지지 말 것. 로도스와 몰타를 **둘 다 기사단령**으로 둔 것이 그 예다(실제로는 배타적). 대신 실제로 공존하지 않은 것끼리 붙일 때는 근거 JSON에 `verdict: "gameplay"`로 남긴다 — 고증을 몰라서가 아니라 골랐다는 표시다.
- **부관 효과는 같은 시드로 짝지어(paired) 잰다.** 그냥 두 번 돌려 비교하면 시뮬이 "돈이 모이면 즉시 큰 배를 사는" 탓에 기준선이 25%씩 튀어 **효과의 부호가 뒤집힌다**(실제로 −20%와 +62%가 같은 설정에서 나왔다). 지표도 금화가 아니라 **총자산(금화+선단 매각가)**으로 본다 — 금화만 보면 "방금 배를 샀는가"에 지배된다.
- **부관은 능력·급여·성과급을 한 묶음으로 조정한다.** `perks`만 후하게 하면 "고용 안 할 이유가 없는" 장치가 되고 `cut`만 올리면 아무도 안 쓴다(노림수는 승률 6할). 그리고 **총액이 같아도 급여와 성과급은 효과가 다르다** — 성과급은 잘 벌 때 더 떼므로 성장기 재투자 자본을 깎아 **복리로** 아프고, 급여는 고정이라 규모가 커질수록 가벼워진다. 총 부담을 맞춰 성과급 12%→8%+급여16으로 갈랐더니 순효과가 +14%→**+21%로 올라갔다.** "총액을 맞췄으니 균형도 같겠지"로 넘기지 말 것.
- **선금이 있는 계약은 위약금이 선금보다 커야 한다.** 위약금을 선금의 50%로 뒀더니 "받고 파기"가 순이득이었다(+3,448닢). 지금은 ×1.25.
- **계약 보수는 수량 × 단가가 아니라 목표 보수에서 역산한다.** 수량을 먼저 뽑으면 비단·금괴가 걸렸을 때 계약 하나가 5만 닢을 넘었다(시작 자금이 900닢인데). `CONTRACT.value`가 규모를 잡고 수량은 거기서 나온다.
- **NPC가 시장을 선점하면 플레이어가 굶는다.** NPC 거래 압력을 100% 반영했더니 5~15항차 자산이 바닥을 겼다. `npc/config.js: NPC.pressure`(0.5)로 절반만 남긴다.
- **시뮬의 `ORDER`는 화물칸 오름차순이다.** 가격순으로 두면 갤리(비싸고 짐은 적다)를 사서 화물칸이 줄어든다. 그리고 **지금 타는 배보다 나은 것만** 사게 해야 한다 — 안 그러면 싼 배를 사서 하향 갈아탄다(실제로 그랬다).
