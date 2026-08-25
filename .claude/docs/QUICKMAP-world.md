# QUICKMAP — world (세계가 스스로 도는 것 · 그 근거 · 관측)

> 누가 돌아다니고(NPC 상인·해적 명부·계약), 누가 임자이고(세력·관계·독점),
> 어디에 무엇이 있고 어디가 위험한가(도시 특산·항로 위험 = 권역 근거 JSON),
> 그리고 그것을 눈으로 보는 장치(대시보드·아키텍처 트리).
> 값이 오가는 쪽(시세·매매·항해비·부관·급여·술집·가공 사슬)은 [QUICKMAP-trade.md](QUICKMAP-trade.md)로,
> 전투·선박·조선소는 [QUICKMAP-combat.md](QUICKMAP-combat.md)로 간다.

## 1. 키워드 → 문서 · 코드 정본

**한 줄에 "무엇을 읽고 어느 파일을 여는가"가 함께 있다.** 문서는 왜·어떻게, 코드는 값.

| 키워드 | 읽을 문서 | 코드 정본 |
|---|---|---|
| **새 바다·새 권역을 만든다** · 권역 담당자가 읽는 규약 · 폴더 구성(`geo·trade·goods·ships·npc-*`) · 권역끼리 import 금지 · 원양으로만 잇는다 | [WORLD-EXPANSION-CONTRACT.md](WORLD-EXPANSION-CONTRACT.md) (§0 원칙은 협상 대상 아님) · 남은 배선 [WORLD-INTEGRATION-TODO.md](WORLD-INTEGRATION-TODO.md) | `js/regions/<권역>/` · 합치는 곳 `js/regions/index.js`(`OCEAN_LANES`는 거리가 아니라 `days`를 직접 적는다) |
| 상인/해적 NPC · 세계가 혼자 돈다 · 시장압력의 출처 · 해상 조우(흥정·약탈) · 소문 · **대형 주문(계약)** · 선금/위약금/기한 | [wiki/world-npc.md](wiki/world-npc.md) | 숫자 `js/npc/config.js` · 판단 `js/npc/behavior.js` · 집행 `js/world.js` · 계약 `js/data.js: CONTRACT` |
| **해적 명부 · 이름난 해적 40 · 명부 닫기(격파/초무) · 현상금 · 소식(`bounty-tip`)** · 꺾은 자가 왜 다음 날 다시 서 있었나 | 사양 `SPEC-supremacy.md` §1 · 얼굴은 `story/FACTIONS.md` | 값 `js/data.js: ROSTER`(tameMult·tipRate·tipFloor·tipDays) · 명부 권역 `npc-pirates.js: PIRATES` · 규칙 `js/world.js`(`rosterClosed`·`pickDef`·`rosterOf`) · 상태 `state.slain['pirate:<id>']`·`state.tamed` · 키 `js/state.js`(`rosterKey`·`recordSlain`) |
| **명부 사냥** · 이름난 해적을 어떻게 만나나 · 현상금 소식(`bounty-tip`) · **초무**(招撫 — 값을 치러 명부를 닫는다) | 사양 `SPEC-supremacy.md` §1-3 | 값 `js/data.js: ROSTER`(tipRate·tipFloor·tipDays·tameMult) · 규칙 `js/state.js`(`rosterOpenIn`·`bountyTipPrice`·`buyBountyTip`·`tamePrice`·`tamePirate`·`activeBounty`) · 조우 `js/world.js: huntedOnLeg` → `scenes/map.js`의 `pirate` 갈래 · 상태 `state.boons.bounty`·`state.tamed` · 화면 패권 카드의 명부 줄 |
| **세력 · 관계 · 독점** · 누가 이 항구의 임자인가 · 덮치면 누가 화나나 · 일감이 왜 비나 · 문서를 왜 안 파나 · 관계도 화면 | 사양 정본 `SPEC-factions.md`(§8-1이 1단계) · 세력의 얼굴은 `story/FACTIONS.md` | 값 `js/data.js: FACTIONS·FACTION_TIES·REGARD` · 규칙 `js/state.js`(regardOf·addRegard·decayRegard·factionOfCity·contractFactionOK·sellBlocked) · 화면 `js/factions.js`(관계도 모달)·`port.js: factionCard` · 검증 `node tools/check-factions.mjs` |
| **도시 특산품 고증** · 어느 도시가 뭘 팔았나 · 깃발/국적 근거 · 사료 출처 | [wiki/city-goods-history.md](wiki/city-goods-history.md) (서술본·34KB로 무겁다) | **`content/regions/<권역>-evidence.json`**(기계 정본) → 검증 `node tools/check-evidence.mjs` |
| **항로 위험도 고증** · 어느 항로가 위험했나 · 보험료율 | 근거 JSON이 곧 문서다 | **`content/regions/<권역>-evidence.json`의 `routes`** · 수치 각 권역 `geo.js: ROUTE_RISK` → 검증 `node tools/check-routes.mjs` |
| 권역 항로 그물이 실제로 어떻게 생겼나 · 못 간 항구가 **항로가 없어서**인가 하네스 탓인가 · 연결 성분이 갈리면 그 권역 패권이 성립하지 않는다 | 도구 머리주석 `tools/region-topology.mjs` | `node tools/region-topology.mjs` (`--md`면 테스터가 붙여 쓰는 표) · 항로 값은 권역 `geo.js: ROUTES` |
| **아키텍처 트리 · 동적 생성물 · 상태(세이브 대상)** — 무엇이 어느 계층에 있나 · 런타임에 만들어지는 것 · state가 들고 있는 것 | 대시보드 **오버뷰** 탭 | 정본 `dashboard/architecture.mjs` · 렌더 `overview-view.js` · **검증 `node tools/check-architecture.mjs`**(실제 파일·실제 state와 대조) |
| 경제·해적·보수 **관측**(시세가 실제로 움직이나 · 물자가 닿나 · 자산 곡선 · 조우확률 · 급여 사료 대조) | `dashboard/` — `python serve.py` 후 `/dashboard/` | 계측(DOM 없음) `measure.mjs`·`pirates.mjs`·`ports.mjs`·`wages.mjs`·`architecture.mjs` · 렌더(DOM) `dash.js`·`*-view.js`·`shared.js` · 셸 `app.js` |
| 파일이 뭘 담당하나 · 씬 흐름 (역방향: 파일 → 기능) | [wiki/file-map.md](wiki/file-map.md) | — |

## 2. 수치를 어디서 고치나

| 하고 싶은 것 | 어디 |
|---|---|
| 도시 추가 | `map/geo.js: CITY_GEO`(좌표·깃발·규모) **와** `data.js: CITY_TRADE`(경제)에 **같은 id**로 — 한쪽만 넣으면 콘솔 경고 |
| 시세 성향 | `data.js: CITY_TRADE` — `supply`(배율<1, 산지) / `demand`(배율>1, 수요지). 근거 → [city-goods-history.md](wiki/city-goods-history.md) |
| 도시 수치의 근거·출처 | `content/regions/<권역>-evidence.json` (정본) — 고치면 `node tools/check-evidence.mjs`. 대시보드 매트릭스 **근거** 모드에서도 보인다 |
| 항로 연결 | `map/geo.js: ROUTES` — 선 하나가 경제 전체의 물길을 바꾼다 |
| 바람·해류 | `map/geo.js: CURRENTS` · 배의 `rig` · `state.js: windOf/windFactor/routeFactor` |
| 해적 조우 빈도 | 기본 표는 `data.js: SEA_EVENTS`(합 100), **항로별 차등은 `map/geo.js: ROUTE_RISK` → `state.js: encounterOdds()`**. 라벨은 `routeDangerLabel()`. 판정은 **8일에 한 번씩 넉 장까지**이고 뒤로 갈수록 눅는다(`rollSeaEvent`의 `damp`) — 실주행에서 가장 안전한 항로와 **2.8배 차** |
| 항로 위험도 값 | `map/geo.js: ROUTE_RISK`(요율 %, `null`=내해·육로) · 환산 상수는 `state.js: ODDS_BASE/ODDS_PER_PCT/THREAT_PER_SHIP` |
| 화물이 해적을 부르는 정도 | `state.js: cargoLure` (`LURE_PER` 9,000닢당 `LURE_PER_STEP` 5%p·상한 14%p) → `encounterOdds`에 더해진다 |
| 계약 규모·보수·위약금·선금 | `data.js: CONTRACT` — **보수(`value`)를 먼저 정하고 수량을 역산**한다(품목이 비싸다고 계약이 통째로 커지지 않게). 그 보수의 크기는 **기함 선복**(`holdRef`·`holdPow`)이, 선금 천장은 **선단 매각가**(`advanceCap` — 해상대차의 담보)가 정한다 · 규칙 `state.js: contractOffer/fleetCollateral` · 관측 `node tools/sim-contract.mjs 16` |
| NPC 수·습격률·시장 영향·싣는 양 | `npc/config.js: NPC` (traders·pirates·raidBase·pressure·loadRatio·pickTop) |
| NPC가 어디로 갈지·무엇을 살지 | `npc/behavior.js: chooseTrade/choosePirateMove` — `ctx`로만 받으므로 통째로 갈아 끼워도 `world.js`는 그대로 |
| 대시보드 탭이 무엇을 보여주나 | **5탭** — 오버뷰(구조·동적생성·세이브 대상) · 경제 · 해적 · 항구 · 보수·물가. 탭↔파일 대응과 탭별 내용은 [file-map.md](wiki/file-map.md) `dashboard/` 행이 정본이고, 화면 왼쪽 사이드바의 하위 목록이 그 탭의 절을 그대로 보여준다 |
| 대시보드 탭 추가 | `index.html`에 nav `.grp` + `section.tabpage` → `app.js`에 `run*()`/`*Loaded()` 배선 → 계측 `*.mjs`(**DOM 없음**) + 그리기 `*-view.js`(**DOM 있음**)로 가른다. 파일을 늘리면 `dashboard/architecture.mjs` 트리에도 적는다 — 안 적으면 `check-architecture.mjs`가 실패시킨다 |
| 시장 충격(기근·봉쇄·풍작·나포) | `data.js: SHOCK.events`(종류·확률·문구) + `SHOCK.densityBase`(**perDay는 세계 전체 건수라 도시 수로 환산한다**) · 판정 `state.js: shockFactor/addShock/rollShockEvents` · 나포 배선 `world.js: raids()` · 화면 `scenes/map.js` "뱃사람들의 소문" |
| 화물을 잃는 사건 | 폭풍 투하 `state.js: jettisonOdds/jettisonCargo` · 보상 `INSURANCE_COVER` · 뭍의 사고 `banditRaid/payToll`(`INLAND_ODDS`) · 빈도 검증 `node tools/sim-risk.mjs` |
| 게임이 근거 JSON을 읽는 곳 | `js/evidence.js` — 항구 시장 목록을 **근거 신뢰도 순**으로 쌓으려고 `content/regions/<권역>-evidence.json`을 읽는다. 못 읽으면 조용히 원래 순서(`assets.js`와 같은 fail-soft) |

## 3. 이 도메인 전용 함정·가드

- **★ 이름 있는 자는 `npcsOnLeg`로는 못 만난다 — 264 도시에서 그 일치는 안 난다.** 실플레이 **984 게임일에 명부 조우 0회**였다(supremacy ISSUES #12). 해적 사건은 12%로 제대로 나는데, `npcsOnLeg`가 **그 배의 `at`·`to`가 정확히 내 두 항구일 때만** 잡고 아니면 `pickEnemy()`가 **이름 없는 적**을 낸다 — 상선이 겪던 것과 같은 문제인데(C-15) 폴백을 상선만 받았다. ⇒ 지금은 **소식을 산 자에 한해** 그자의 `hunt`·`base` 구간에서 `huntedOnLeg()`가 그자를 세운다. ⚠️ **밀도를 올려 풀지 마라** — 해적을 더 띄우면 그냥 더 자주 털리고 *"사람은 이길 수 있는 상대만 싸운다"*가 깨진다. **조우 확률은 그대로 두고 「누가 오는가」만 바꾼다.**
- **★ 초무는 「지우는 것」이 아니라 「내 편으로 만드는 것」이다 — 지우면 아무 일도 안 일어난다.** 920닢을 치르고 초무한 자가 **39일 뒤 항로를 막은 것**(supremacy ISSUES #26)을 처음엔 *"떠 있던 배를 안 지운 버그"*로 보고 `retireRosterShip()`으로 지웠다. **그것이 잘못된 처방이었다** — 정원은 안 줄어 `standIn`이 얼굴 없는 배로 그 자리를 채우므로 **바다가 하나도 안 안전해지고**, 24,000닢을 내고 체크리스트에서 이름 하나가 지워질 뿐이다. 고칠 자리는 **「그자가 내 배를 안 건드리는 것」**이었다. 사료도 그쪽이고 **그 문장이 명부 `blurb`에 이미 있었다** — 정지룡은 관군이 되어 **다른 해적을 소탕했고**(⇒ 토벌 협조: 남은 명부의 소식값 −20%/명) 무라카미 수군은 **과소기(過所旗)**로 안전 통행을 보장했다(⇒ 그 권역 조우 −12%/명·상한 −40%). 값(`tameMult 2.0`)은 안 건드리고 **효과만** 붙였다. ⚠️ **`retireRosterShip`은 격파 전용이다**(죽은 자는 죽었다) — 초무에 쓰지 말 것.
- **초무 효과는 권역에 매이고 갱신해야 산다.** 무라카미의 과소기가 카리브에서 통할 리 없다(`tamedIn(regionId)`). 그 바다에 **거점이 없으면 `ROSTER.tameGraceDays`(180일) 뒤 식고**, 거점을 세우면 다시 산다 — 명부는 닫힌 채 그대로다(값을 치른 것은 안 사라진다). `BOON.permitDays`와 같은 논리다.
- **명부를 닫는 길은 둘이고 둘 다 영구다** — 격파(`state.slain['pirate:<id>']`)와 **초무**(`state.tamed[<id>]`). ⚠️ **`state.tamed`는 `resetGame`이 비워야 한다** — `??=`로만 만들면 새 판에 옛 판의 초무가 살아남는다(`slain`이 같은 이유로 명시 선언돼 있다). 초무는 **소굴 항구에서만** 되고 격파보다 비싸다(현상금을 받는 대신 그 상한의 두 배를 낸다) — 그래야 *"못 이길 상대를 만나도 길이 막히지 않는다"*가 성립한다.
- **★ 권역을 여럿이 동시에 늘릴 수 있다 — 다만 `id`는 세계에서 하나뿐이다.** 권역끼리 import하지 않으므로 여덟 권역을 병렬로 채울 수 있는데(2026-08-17에 그렇게 175 → 264곳으로 늘렸다), **서로의 id는 못 본다.** 실제로 카리브(온두라스)와 남미(페루)가 둘 다 `trujillo`를 써서 `check-evidence`가 유령·불일치 12건으로 잡았다. 같은 지명이 두 대륙에 있는 경우(트루히요·산티아고·트리니다드·발렌시아…)를 미리 정하고 나눠라 — 이 저장소의 해법은 **뭍의 도시 ↔ 바다 쪽 문**을 갈라 외항 이름을 쓰는 것이다(리마↔카야오, 아레키파↔이슬라이, 트루히요↔우앙차코).
- **★ 검증기가 콘텐츠를 막지 않게 실패와 경고를 갈라 둔다.** `check-routes`의 **근거없음**과 `check-evidence`의 **관세 무근거**가 exit 1이어서, 항구를 늘리려면 그 항구의 사료를 먼저 찾아야 하는 구조였다(2026-08-17에 고쳤다). **실패는 *코드와 근거가 어긋난 것*뿐이다** — 불일치·유령·요율없음·배선. 미조사(근거없음·빈칸·미조사)는 경고다. 새 검사를 넣을 때 이 선을 지켜라. 최상위 원칙이 "근거 없음으로 실패시키면 콘텐츠를 늘리려 조사부터 끝내야 하는 구조가 된다"고 못박아 둔 자리다.
- **항구 성질을 적는 표에서는 `tariffRate()`를 쓰면 안 된다** — 부관 특전이 곱해져 **탭을 여는 순서에 따라 값이 달라진다**(6.0%가 3.9%로). `baseTariff()`를 쓴다. 대시보드가 실제로 이 버그를 겪었다.
- **`ROUTE_RISK`는 두 곳에서 쓰인다.** 해적 조우 확률(`encounterOdds`)과 **적하보험료**(`insuranceFor`)다. 요율을 고치면 위험만 바뀌는 게 아니라 후반 비용 구조가 함께 움직인다 — 한쪽만 보고 조정하지 말 것.
- **`ROUTE_RISK`를 고치면 `content/regions/<권역>-evidence.json`도 같은 커밋에서.** `node tools/check-routes.mjs`가 불일치·유령 항로뿐 아니라 **"확률이 실제로 갈렸는가"**까지 본다(배선이 끊기면 실패). 요율은 추정이 아니라 당대 인수업자가 매긴 값이라 감으로 바꾸지 말 것.
- **`SEA_EVENTS`의 weight 합 100을 깨지 말 것.** 항로별 위험은 pirate weight를 갈아 끼우고 **그 차이를 calm에서 덜어와** 유지한다(`state.js: rollSeaEvent`). pirate만 올리면 폭풍·표류물·상선조우의 상대 빈도가 통째로 내려앉는다 — 테스트가 이걸 지킨다.
- **시뮬 수치는 반드시 여러 시드를 평균한다 — 한 판은 판단 근거가 못 된다.** "내해를 안전하게 만들어 실효 조우율이 18%→**10.3%**로 내려갔다(90항차 중 33항차가 무위험)"고 메모리에 적어 두고 대체 이벤트까지 후보로 올렸는데, **시드 20판을 평균하니 18.6%·내해 통과 7%로 종전과 같았다**(2026-08-15 정정). 원인은 `sim-risk.mjs`가 시드 없는 1회 실행이었던 것 — 어느 항로를 탔느냐가 통째로 운이라 10%대와 20%대를 오간다. 지금은 `node tools/sim-risk.mjs [항차] [시드수]`가 평균을 낸다. **`sim-trade.mjs`로는 안 잡힌다**(해상 이벤트를 모델링하지 않는다).
- **`CITY_TRADE`를 고치면 `content/regions/<권역>-evidence.json`도 같은 커밋에서 고친다.** 항목마다 판정(`confirmed`/`probable`/`corrected`/`gameplay`)·근거·출처가 붙어 있고 `node tools/check-evidence.mjs`가 불일치·누락·유령 항목을 잡아 **실패시킨다**. 수치만 바꾸면 "왜 이 값인지"를 아무도 모르게 된다.
- **`CITY_TRADE` 수치에는 고증 근거가 달려 있다.** 15~16세기 실제 교역을 조사해 맞춰 둔 것이라, 밸런스만 보고 되돌리면 같은 오류가 재발한다(곡물을 북아프리카 수요지로 두는 것이 대표적 — 알제·튀니스는 곡물 **수출**지였다). 게임성 때문에 일부러 고증을 덮어쓴 곳도 문서에 따로 적혀 있으니 고치기 전에 [city-goods-history.md](wiki/city-goods-history.md)를 본다.
- **품목마다 산지와 수요지가 둘 다 있어야 죽지 않는다.** 산지만 있고 수요가 0이면 그 품목은 중립가로만 팔린다(거래는 되지만 재미가 준다). 반대로 수요만 있고 산지가 0이면 그 칸은 아예 죽는다 — 모피가 그럴 뻔했고 이스탄불(흑해 관문)을 산지로 세워 살렸다. 확인은 대시보드 **물동량** 모드.
- **수요지를 신설해도 항로가 멀면 아무도 안 나른다.** NPC는 이웃 한 칸만 보므로 중간 항구가 먼저 흡수한다. 이스탄불 곡물 수요를 넣었더니 유입이 **1**이었고, 알렉산드리아 직항을 놓고서야 흘렀다. 수요를 추가하면 대시보드 "부족한데 아무도 안 나르는 곳"을 반드시 확인할 것.
- **도시는 두 파일에 걸쳐 있다.** 지리(`map/geo.js: CITY_GEO`)와 경제(`data.js: CITY_TRADE`)를 id로 맞물려 `CITIES`를 합성한다. 한쪽에만 추가하면 게임은 돌지만 그 항구가 아무것도 안 팔거나 지도에 안 나온다 — 콘솔 경고로만 드러난다.
- **도시를 추가하면 지도에서 이름표가 겹친다.** 클릭 판정은 반경 6px(`map.js: onClick`)이라 도시 간 12px 이상이어야 하고, 이름표는 도시 **위쪽**(`y-r-4`)에 배경 박스째 그려져 이웃 도시의 항구 표식을 덮는다. 부르사·이즈니크를 넣었을 때 이스탄불과 4건이 겹쳤다 — 좌표를 넣고 나서 **겹침을 계산해 보고** 자리를 잡는다(라벨 폭은 한글 6px 폰트 기준 글자당 약 6px).
- **연표로 콘텐츠를 덜어내지 않는다(최상위 지침).** 도시·세력·선종을 넣을 때 "그 해에 있었나"를 따지지 말 것. 로도스와 몰타를 **둘 다 기사단령**으로 둔 것이 그 예다(실제로는 배타적). 대신 실제로 공존하지 않은 것끼리 붙일 때는 근거 JSON에 `verdict: "gameplay"`로 남긴다 — 고증을 몰라서가 아니라 골랐다는 표시다.
- **선금이 있는 계약은 위약금이 선금보다 커야 한다.** 위약금을 선금의 50%로 뒀더니 "받고 파기"가 순이득이었다(+3,448닢). 지금은 ×1.25.
- **계약 보수는 수량 × 단가가 아니라 목표 보수에서 역산한다.** 수량을 먼저 뽑으면 비단·금괴가 걸렸을 때 계약 하나가 5만 닢을 넘었다(시작 자금이 200닢인데). `CONTRACT.value`가 규모를 잡고 수량은 거기서 나온다.
- **★ 계약 규모는 도시 규모만으로 스케일하면 안 된다 — 반드시 플레이어 단계(선복)를 함께 본다.** 도시 size로만 스케일하던 시절, 1일차 낡은 바사와 500일차 갈레온이 **같은 표에서** 일감을 뽑아 **초반엔 자산의 열여덟 배**(선금만 자산의 2.45배)이고 **후반엔 무역보다 못했다**. 실측 한 판에서 계약 한 건이 금고 23닢을 3,772닢으로 만들었고, 그 판에서 무역 사다리·중고선·술집이 통째로 건너뛰어졌다. 지금은 **기함 선복**이 보수를, **선단 매각가**가 선금 천장을 정한다(사료: 선복 단위 발주 · 해상대차의 담보는 배와 화물). ⚠️ **`sim-trade`·`sim-stat`은 계약을 아예 안 넣고 재므로 이 자리를 못 본다** — 계약을 만졌으면 `node tools/sim-contract.mjs 16`을 돌린다.
- **계약 규모를 `cargoCapTotal()`(선단 합)으로 재면 동행이 곧 계약 수입의 배수가 된다.** 재는 것은 **기함 한 척의 선복**(`state.cargoCap`)이다 — 사료도 "단일 계약 = 선단 **한 척분** 화물값"이다. 동행선의 몫은 "그 일감을 실을 수 있느냐"(`acceptContract`)로만 온다.
- **선금을 담보에 묶을 땐 하한이 실제로 서는지 확인한다.** 낡은 바사 매각가가 176닢이라 천장이 132닢으로 서지만, 시작배 매각가가 0인 게임이었다면 그 한 줄이 **초반의 유일한 탈출구를 닫는다**. 판정선은 `sim-contract.mjs`의 **「자금이닿나」** 열이다 — 선금을 받고 나서 그 자리에서 조달되는 일감의 비율이고, 0%면 막다른 길이다(고치기 전 1일차 **0%** → 고친 뒤 **13%**로 오히려 열렸다. 일감이 작아졌기 때문이다).
- **`test-world.mjs`의 「해적 습격 0건」은 확률 판정이라 가끔 빨개진다.** 실측 25회 중 1회가 `9/10`으로 떨어졌다(`NPC.raidBase` 판정이 한 번도 안 걸리는 판이 있다). 실패가 exit 1이 된 뒤로 이게 **가짜 회귀**로 보인다 — 한 번 더 돌려 보고, 연속 실패일 때만 코드를 의심한다.
- **NPC가 시장을 선점하면 플레이어가 굶는다.** NPC 거래 압력을 100% 반영했더니 5~15항차 자산이 바닥을 겼다. `npc/config.js: NPC.pressure`(0.5)로 절반만 남긴다.
