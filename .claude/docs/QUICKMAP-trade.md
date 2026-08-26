# QUICKMAP — trade (교역 경제 · 값이 오가는 것)

> 무엇을 얼마에 사고팔고, 누구에게 얼마를 주고, 무엇을 만들어 얼마를 남기나 —
> 시세·매매·항해비·부관·급여·술집·수직계열화와 **그 금액의 사료 근거**(물가·자산·유지비·급여).
> 세계가 스스로 도는 쪽(NPC·계약·세력·도시/항로 고증·대시보드)은 [QUICKMAP-world.md](QUICKMAP-world.md)로,
> 전투·선박·조선소·무장은 [QUICKMAP-combat.md](QUICKMAP-combat.md)로 간다.

## 1. 키워드 → 문서 · 코드 정본

**한 줄에 "무엇을 읽고 어느 파일을 여는가"가 함께 있다.** 문서는 왜·어떻게, 코드는 값.

| 키워드 | 읽을 문서 | 코드 정본 |
|---|---|---|
| 시세 · 가격 공식 · 산지/수요 · `wobble` · 매매 · 손익 · 매입가 · 화물/적재 · 항해 일수 · 항해비 · 초기 조건 · 무역 곡선 | [wiki/economy-trade.md](wiki/economy-trade.md) | `js/data.js`(GOODS·CITY_TRADE·SPREAD·MARKET·TARIFF) · `js/state.js`(priceOf·buy/sell·voyageCost) |
| **부관 · 부선장 · 에이미** · 급여 · 성과급 · 입항세 감면 · 시장압력 감면 | [wiki/officer.md](wiki/officer.md) | `js/data.js: OFFICER` · `js/state.js`(officerPerk·voyageCost의 officer·sell의 cut) |
| **거점**(임차창고·창고·상관·조선대·부두) · 유지비 · 문 닫음 · 압류 · **되팔기** · 창고 보관 | [wiki/economy-trade.md](wiki/economy-trade.md) §거점 | `js/data.js: HOLDINGS·HOLDING` · `js/state.js`(buyHolding·settleHolding·**sellHolding**·ownsHolding/hasHolding·storeGoods) · 화면 `scenes/port.js: holdingCard` |
| **수익형 부동산**(가게·여관) · 등급 승급 · **공실** · 세(월세) · 왜 무역보다 느린가 | 근거 JSON이 곧 문서다(`asset-evidence.json`) | `js/data.js: HOLDINGS.shop/inn[].grades·ESTATE_KEYS·ESTATE` · `js/state.js`(estateGrade·estatePrice·**canUpgradeEstate/upgradeEstate**·**vacancyOdds**·estateRent·estateOccupied·holdingIncomeDue) · 화면 `scenes/port.js: holdingCard` |
| **후반 브레이크** · 관세 누진 · 총자산 · **관세 폭탄** · **무역품 몰수** · 임검 | 근거 JSON이 곧 문서다(`upkeep-evidence.json`) | `js/data.js: TARIFF_SCALE·SEIZURE·SHOCK.events의 levy·SEA_EVENTS의 seizure` · `js/state.js`(**netWorth**·tariffScale·tariffShockFactor·seizureOdds·seizeCargo) · 화면 `scenes/map.js`(항로 툴팁·소문·몰수 모달) |
| **빚 · 파산 · 채권자 집행 · 청산** · 금고 0에서 무슨 일이 일어나나 · 왜 배를 넘기면 셈이 끝나나 | [wiki/payroll.md](wiki/payroll.md) §7 | `js/data.js: BANKRUPT·BOON`(loan*) · `js/state.js`(payFine·debtOwed·**nothingLeft·enforceDebt·liquidate**·settlePayroll) · 화면 `js/payday.js` |
| **급여 정산 · 급여일 · 체불 · 불만 · 이탈 · 화물 절도 · 장부 · 결산 화면** | [wiki/payroll.md](wiki/payroll.md) | `js/state.js`(payroll·ledger·`book`·`settlePayroll`·`stealCargo`·`MONTH_DAYS`·`DESERT_AT`) · 화면 `js/payday.js` · 검증 `node tools/test-payroll.mjs` |
| **술집 · 선원 등용 · 무리 · 기질 · 계약금 · 요구 일당** · 선원이 왜 0명으로 시작하나 · 부두 인부 | [wiki/crew-tavern.md](wiki/crew-tavern.md) | `js/data.js: TAVERN·CREW_TRAITS·CREW_NAMES` · `js/state.js`(tavernCrews·recruitBand·avgCrewWage·trimBands) · 씬 `js/scenes/tavern.js` · 검증 `node tools/test-tavern.mjs` |
| **교역품 물가 고증** · 밀·소금·기름·와인·후추가 서로 몇 배였나 · 화물 1칸은 실제로 얼마인가 · **대조 2축의 정본** | 근거 JSON이 곧 문서다(주석이 상세) | **`content/goods-evidence.json`** → 검증 `node tools/check-prices.mjs` |
| **선박·부동산 고증** · 배가 선원 연봉의 몇 배인가 · 집세·주택값 · **부동산 수익률의 앵커** | 근거 JSON | **`content/asset-evidence.json`** — 순 연수익률 밴드 `estateNetYield` 3~9%(당대 안전자산 이율) · 사다리 단조성 `estateLadder` |
| **유지비·위험비용 고증** · 선체/무장 유지 · 적하보험 · 화물이 해적을 부르는 정도 · **후반 브레이크** | 근거 JSON | **`content/upkeep-evidence.json`** — `tariffScale`(누진)·`tariffLevy`(관세 폭탄)·`seizure`(몰수) |
| **급여 고증** · 부관이 선원의 몇 배인가 · maestre · 사무역(quintalada) | [wiki/officer.md](wiki/officer.md) §고증 — 지금 ×2.17로 **c.1500 사료 구간(2.0~2.3) 안**이다(한때 ×6.67 = 1634년 값) | **`content/wage-evidence.json`** → 검증 `node tools/check-wages.mjs` |
| **수직계열화 · 가공 사슬 · 가공장 · 가공마진 밴드** · 사라사/주홍 모직 · 창고에서 돌리는 가공 · 시설 유지비/휴업/압류 | [wiki/vertical-chain.md](wiki/vertical-chain.md) (사양 정본은 `SPEC-vertical.md`) | `js/data.js: CHAIN·WORKS·WORK` · `js/state.js`(millPrice·runMill·collectMill·settleWorks) · 화면 `js/scenes/port.js: worksCard` · 검증 `node tools/check-chain.mjs`·`sim-chain.mjs` |
| 파일이 뭘 담당하나 · 씬 흐름 (역방향: 파일 → 기능) | [wiki/file-map.md](wiki/file-map.md) | — |

> 경제와 세계가 만나는 지점 셋 — **항로 요율**(`ROUTE_RISK`: 적하보험료 ↔ 해적 조우 확률) · **도시 시세 성향**(`CITY_TRADE`) ·
> **대시보드 관측**은 [QUICKMAP-world.md](QUICKMAP-world.md)에 있다. 값을 치르는 쪽만 여기서 다룬다.

## 2. 수치를 어디서 고치나

| 하고 싶은 것 | 어디 |
|---|---|
| 교역품 기준가 | `data.js: GOODS[].base` — 곡물 20닢이 기준이고 나머지는 **사료 비율**(향신료 ×16.5·비단 ×21·금괴 ×35). 고치면 `content/goods-evidence.json`도 같은 커밋에서 |
| 교역품 추가 | `data.js: GOODS` + `sprites/icons.js`에 아이콘 |
| 차익 폭(돈 버는 속도) | `data.js: SPREAD` — 이 한 계수가 무역 곡선 전체를 좌우한다 |
| 시세 변동폭·주기 | `state.js: wobble()` (3일 주기 ±15%) |
| 대량 거래 벌점 | `data.js: MARKET` (`depthPerSize`·`impact`·`cap`·`decay`·`gateDepth`) — **선단이 이것을 뚫는지 재는 도구는 `node tools/sim-fleet.mjs 30 40`.** 만지기 전에 §3의 함정을 읽을 것 |
| 입항세 | **두 겹** — `data.js: TARIFF`(size별 기본율) + `CITY_TARIFF`(그 도시만의 오버라이드). 오버라이드를 적으면 `content/regions/<권역>-evidence.json`의 `cities[id].tariff`에도 같은 값과 근거를 적는다 |
| 입항세를 읽는 함수 | 항구의 성질 → **`state.js: baseTariff()`** · 지금 실제로 무는 값(부관 특전·누진·폭탄 포함) → `tariffRate()`. 감면·가산·누진을 한곳에 모은 것은 **`tariffFromOff()`** — 새 계수는 여기 넣는다(`tariffCutPreview`와 공식이 갈리지 않게) |
| 후반 브레이크(누진·관세 폭탄·몰수) | `data.js: TARIFF_SCALE`(20,000 / 50,000 / 1.0 / cap 2.4 / **ceil 0.19**) · `SEIZURE` · `SHOCK.events`의 `levy` · `SEA_EVENTS`의 `seizure`(weight 0). 고치면 `content/upkeep-evidence.json`도 같은 커밋에서 |
| 부동산 값·수익률·공실 | `data.js: HOLDINGS.shop/inn[].grades`(`priceBase`·`priceBySize`·`yield`·`vacancy`·`industry`) · `ESTATE`. 고치면 `content/asset-evidence.json`도 같은 커밋에서(`check-prices.mjs` §5가 밴드·단조성을 실패시킨다) |
| 항해비 갈래 | `state.js: voyageCost()` — 일당(**`avgCrewWage()`** — 술집에서 누구를 태웠나로 갈린다·기본 `CREW_WAGE` 1.2)·보급(`SUPPLY_UNIT` 1.3)·선체(`HULL_UPKEEP`×`SHIPS[].upkeep`)·무장(`ARM_UPKEEP`)·선단·**적하보험**(`INSURANCE_RATE`×항로요율×화물가치)·부관 |
| 시작 조건(금화·선원·배) | `state.js: START_GOLD`(200) · `resetGame()` — **선원 0명**으로 시작한다. 값의 근거는 [payroll.md](wiki/payroll.md) §6 |
| **한반도 갈래 다섯**(신분 특전·시작 항구) | `data.js: ORIGINS` — 특전은 **조선 항구에서만**(`joseonOnly`). 소설 쪽 사본표(`story/PROTAGONISTS.md` §6-1 · `story/GAME-LINK.md` 갈래표)와 어긋나면 `node tools/check-origins.mjs`가 실패시킨다 |
| 거점 값·유지비·유예·매각 회수율 | `data.js: HOLDINGS`(값·특전) · `HOLDING`(유지비 연 6% · `idleRate` 0.5 · `seizeAfter` 2 · **`sellBack` 0.40**) |
| **동료**(항해사 51명) · 코멘다 · 편무/쌍무 · 밑천 · 선장 자리 | [wiki/world-npc.md](wiki/world-npc.md) §동료 | 값 `js/data.js: COMMENDA`·`FLEET.requireCaptain` · 명부 권역 `npc-mates.js` → `regions/index.js: ALL_MATES` · 규칙 `js/state.js`(matesAt·hireMate·dismissMate·matePerk·mateCut·freeMates) · 상태 `state.mates` · 화면 `scenes/port.js: mateCard` |
| 선단의 값어치(원양 호위·계약 선복·보험 할인) | 설계 `.playtest/supremacy-balance/DESIGN-growth.md` P2 | `js/data.js: FLEET`(escortAt·insureOffPer/Cap) · `CONTRACT.consortHold` · 규칙 `js/state.js`(escortNeed·oceanReady(to)·convoyInsureOff·contractOffer) |
| **초행 정보**(임차창고가 시세를 연다 · 이웃 소문) | 설계 DESIGN-growth P5 | `js/data.js: HOLDINGS.rental.priceTip`·`HOLDING.scoutNeighbors` · 규칙 `js/state.js`(knowPort·priceKnown·holdingTip) · 상태 `state.scouted` |
| 삭은 배의 대가 | `data.js: HULL`(`slowAt`·`slowMul`·`crawlAt`·`crawlMul`·`soakAt`·`soakRate`) · 규칙 `state.js: hullFactor`(속력)·`soakCargo`(짐이 젖는다) · 원양 금지선은 따로다(`OCEAN_HULL_MIN`) |
| 첫 배까지 걸리는 시간 | 관측 `node tools/sim-firstship.mjs 12 40` — 시작 항구마다 **계약 없이** 몇 항차에 첫 배를 사나 · 「가까운 둘만 왕복」했을 때의 자산 천장 |
| 빚·파산 문턱 | `data.js: BANKRUPT`(`rollsBefore` 2 · `keepShip` hulk · `seedGold` = `START_GOLD`) · 이자·주기는 `BOON.loanRate/loanDays` |
| 급여 주기·불만·이탈 문턱 | `state.js: MONTH_DAYS`(30) · `UNREST_PER_MISS`·`UNREST_HEAL`·`DESERT_AT` · 참을성은 `data.js: CREW_TRAITS[].temper` |
| 선원 무리의 값·기질 | `data.js: TAVERN`(cycle·slots·band·emptyOdds·**advanceUnit**) · `CREW_TRAITS`(wageMul·advMul·troop·temper) → [crew-tavern.md](wiki/crew-tavern.md) |
| 부관 급여·성과급·능력 | `data.js: OFFICER` — `wage`·`cut`·`perks`는 **한 묶음**이라 함께 재측정. 고치면 `content/wage-evidence.json`도 같은 커밋에서 → [officer.md](wiki/officer.md) |
| 경제가 실제로 도는지 확인 | 대시보드 `/dashboard/` · 곡선 `node tools/sim-trade.mjs` · 실효 위험 `node tools/sim-risk.mjs` · 항차 수익 분포 `node tools/check-voyage.mjs` · 화면 없이 계측만 `node -e "import('./dashboard/measure.mjs')…"` |
| 가공 사슬 비율·새 가공품 base | `data.js: CHAIN` — **정수는 감이 아니라 「가공마진 밴드」(`WORK.marginMin/Max` 1.08~1.25)에서 역산한다.** 고치면 `content/chain-evidence.json`도 같은 커밋에서 · `node tools/check-chain.mjs`가 밴드 이탈을 **실패**시킨다 |
| 가공장 값·유지비·매각 회수율 | `data.js: WORKS`(값 공식 `(9,000 + 산출base×80) × TIER_MUL[공업력]`) · `WORK`(유지비 연 10% · 휴업 절반 · 두 번이면 압류 · 매각 0.60) |

## 3. 이 도메인 전용 함정·가드

- ★ **시뮬로 재는 법과 그 함정 열셋은 [wiki/sim-measurement.md](wiki/sim-measurement.md)로 옮겼다**
  (`sim-core` 전략·짝짓기·시드·`ORDER`·정산·술집·노이즈…). **시뮬을 돌리기 전에 그 문서를 먼저 읽는다** —
  그 열셋은 전부 *"측정기가 거짓 신호를 낸" 자리*라 모르면 게임을 잘못 고친다.

- **★ 선단에 「적재 배수」를 주지 마라 — 「없으면 못 하는 일」을 줘라.** 동행 8척은 하루 +733닢을 먹는데 적재 200→1,588칸이 **전부 무용**이다(시장이 161칸에서 막는다). 그렇다고 적재를 배수로 주면 밸런스 담당이 §5-L에서 철회한 그 구멍이 되살아나고, 사용자 요구 ⑤(*"무제한으로 무역품을 실을수는 없잖아"*)를 정면으로 어긴다. 지금 값어치는 셋이다 — **원양 호위 의무**(`FLEET.escortAt`)·**계약 선복**(`CONTRACT.consortHold`)·**보험 할인**(`insureOffPer/Cap`).

- **★ 「선단이 계약을 키운다」를 넣을 때 지켜야 하는 선은 *보수 배수 < 적재 배수*다.** 설계문이 제안한 `consortHold 0.6`은 실측에서 **적재 ×2.60에 보수 ×4.10**(1척) · **×8.04에 ×10.63**(8척)으로 그 선을 넘겼다. 원인은 **수량 상한과의 맞물림**이다 — 값싼 부피화물은 단독일 때 `qtyCap`에 잘려 보수가 목표에 못 미치는데 동행이 그 자물쇠까지 풀어 주므로 **보수가 두 번 오른다.** ⇒ 계수를 쓸어 **0.25**를 골랐다(그때 처음 둘 다 적재 배수 아래). **한 장으로 재지 마라** — 품목이 바뀌며 튄다(게시판 60~120장의 중앙값으로 본다).

- **★ 「거점이 시세를 열어 준다」를 `state.known`에 섞지 마라.** `metFactions()`가 `known`을 세어 「만난 세력」을 내므로, 소문으로 들은 항구를 거기 넣으면 **가 본 적 없는 세력을 만난 것으로** 센다(`check-factions`가 실제로 잡았다). 들른 곳은 `known`, 소문은 `state.scouted`다 — `priceKnown()`이 둘과 `holdingTip()`을 합쳐 본다.

- **밀린 유지비는 그 자리에서 낼 수 있어야 한다.** 「밀린 것을 내면 다시 연다」는 규칙만 넣고 **화면에 낼 단추가 없었다** — 금고가 7,105닢인데도 나갔다 와야(6일) 문이 열렸고, 「한 번 더 밀리면 압류」라 **항로가 긴 자리에서는 돈이 있어도 넘어간다**(supremacy ISSUES #22). ★ 청구 3닢이 문 닫은 뒤 1닢이 되는 것은 어긋난 것이 아니라 **`idleRate`(절반)**이고, **반올림 전 값에 곱한다**(3×0.5=2가 아니라 2.95×0.5=1).

- **★ 삭은 배는 *막지 말고 값을 물려라*.** 선체가 1에서 멈추고 아무 일도 안 나던 자리를(C-13 · ISSUES #9) **속력 벌점 + 짐 침수**로 세웠다(`data.js: HULL`). ⛔ **출항 금지·강제 정박은 고르지 않았다** — 실플레이가 금고 0·선체 1에서 **1일 항로 열여섯 항차로 0 → 1,720닢**을 벌어 빠져나왔고(ISSUES #14), 막으면 3일 항로뿐인 항구에서 영영 못 나가는 **새 데드락**이 된다(`oceanReady` 주석의 *"항구에 갇히는 일이 없어야 한다"*와 같은 원칙). ⛔ **침몰도 아직 아니다** — 폭풍은 항차당 12%라(`SEA_EVENTS`) 선체 1에서 치명적으로 만들면 그 열여섯 항차가 **87% 확률로 끊긴다.** 침몰은 우연이 아니라 **플레이어가 고른 자리**에 붙어야 한다.

- **★ 못 낸 돈에 「끝」을 두지 않으면 *게임 오버 없는 게임 오버*가 된다.** 빚 규칙(`payFine`)만 넣고 갚을 수단을 안 넣어, 금고 0·화물 0인 판이 **36일을 그냥 떠다녔다**(supremacy ISSUES #3 — 살 돈이 없어 못 사고 실은 것이 없어 못 팔고, 빚만 30일마다 ×1.25로 불었다). 지금은 **집행과 청산**이 있다(`enforceDebt`·`liquidate` → [wiki/payroll.md](wiki/payroll.md) §7). ⇒ **새로 "못 내면 빚"을 만들 때는 그 빚이 어디서 끝나는지를 같은 커밋에서 정해라.**

- **★ 압류액과 미납액의 자릿수가 달라지면 그것은 규칙이 아니라 사고다.** 유지비 **3닢**을 못 내 **2,000닢**짜리 거점이 그 자리에서 넘어갔다(ISSUES #4). 지금은 거점도 시설(`settleWorks`)과 같은 모양으로 **한 번은 문을 닫고 두 번째에 압류**한다. 같은 이유로 청산도 **넘긴 배값이 빚보다 크면 잉여를 돌려준다** — 빚 500닢에 갈레온(매각가 10,725닢)을 통째로 잃지 않게. **자산을 몰수하는 규칙을 쓸 때는 미납액과의 비를 먼저 계산해 볼 것.**

- **★ 관세에 새 계수를 넣을 때는 `tariffFromOff()`의 *맨 끝*에 곱하고 `TARIFF_SCALE.ceil`을 통과시킨다.** 감면(부관·갈래·문서·밀수)보다 앞에 두면 문서 한 장이 누진분까지 깎아 **정작 커진 상인이 가장 잘 빠져나간다.** ceil이 없으면 누진×악명×폭탄이 겹쳐 *팔수록 손해*가 된다 — 값을 물리는 게 아니라 길을 막는 것이다. `baseTariff()`에는 아무것도 안 붙는다. → [economy-trade.md](wiki/economy-trade.md) §후반 브레이크

- **★ 공실이 없으면 고급 여관은 돈 찍는 기계다.** 등급을 올릴 때 값·수익률·**공실률**이 *함께* 올라야 하고 `check-prices.mjs` §5가 그 단조성과 순 연수익률 밴드(3~9%)를 **실패로** 잡는다. 수익률을 올리려면 공실도 올려라. **문 닫은(`idle`) 거점은 세를 못 번다**(유예가 공짜면 미납이 이득이 된다). 등급은 `state.holdings[city][kind]`에 **숫자**라 `hasHolding`으로 물으면 늘 1로 읽힌다 — `estateGrade()`를 쓰고, 공실은 화면이 제 손으로 계산하지 말고 `vacancyOdds(kind, city, grade)`(3번째 인자)를 부른다. → [economy-trade.md](wiki/economy-trade.md) §수익형 부동산

- **거점은 `ownsHolding`(소유)과 `hasHolding`(일함)이 갈린다.** 유지비가 밀려 문을 닫으면 소유는 남고 특전만 멈춘다 — **목록·중복구매 판정은 `ownsHolding`**, 세 감면·시장 깊이·공업력 같은 **특전은 `hasHolding`**이다. 섞으면 문 닫힌 거점이 화면에서 사라지고 "세운다" 단추가 다시 떠 **같은 거점을 두 번 사서 `spent`가 두 배**가 된다.

- **★ `planFor()`는 한계마진이 0이 되면 멈춘다 — 「칸당 이익 × 화물칸」을 항차 이익으로 적지 마라.** 화물칸을 45→2,298로 키워도 **실제로 채우는 칸은 45→128**밖에 안 되므로, 곱셈으로 적으면 없는 수입이 생긴다. 이 한 줄이 「2,298칸 선단이 한 항차 69,124닢(갈레온의 7.1배)을 벌어 시장 깊이를 뚫는다」는 판정을 낳았지만 **실제 항차 순이익은 1,504→2,102닢**이고, 동행 여덟을 **공짜로** 얹은 판은 오히려 **1,842 → −355닢**이었다(유지비만 늘고 팔 곳이 없다). ⇒ **`MARKET.cap`을 완만한 곡선이나 점근선으로 바꾸면 벌점이 지금보다 *낮아져* 수익이 오른다 — 고칠 자리가 아니다.** 물량 벌점을 재는 스크립트는 **반드시 `used`(채운 칸)를 함께 출력**해야 한다. 정본 도구 `node tools/sim-fleet.mjs 30 40`. (2026-08-25 정정)

- **★ 수직계열화 시설은 `state.works`다 — `HOLDINGS`에 얹지 말고 `state.industry`라 부르지도 마라.** `hegemonyOf()`가 `state.holdings`를 세므로 같은 그릇에 담으면 **패권 조건이 조용히 바뀐다.** 함정 넷 더 → [wiki/vertical-chain.md](wiki/vertical-chain.md) §6

- **★ 항구에는 시간이 없다 — 고정비를 설계할 때 이것부터 본다.** `advanceDays()`는 **`js/scenes/map.js:318` 한 곳에서만** 불린다. 곧 날·보급·유지비·급여 발생은 **항해할 때만** 일어나고 정박은 공짜가 아니라 **존재하지 않는다.** "정박 중에도 삯이 나간다" 류의 규칙은 비용 한 줄이 아니라 *체류 일수·그 일수를 쓰는 행동·표시*까지 붙는 **시간 모델 신설**이다. 배관은 절반 깔려 있다 — 급여는 발생주의(`state.payroll.due`)에 월 정산(`settlePayroll`)이고 체불·이탈까지 있다. 없는 것은 **항구에서 날을 흘리는 입구 하나**뿐이다. → 사양은 `story/GAME-LINK.md` §8 A-1b

- **값은 `data.js`, 규칙은 `state.js`다.** 튜닝 상수(임금·보급·유지비·보험·급여 주기·시작 자금·조우 확률 환산·조선소 계수)는 전부 `data.js` 아래쪽 "튜닝 상수" 절에 있고, `state.js`가 그대로 re-export한다 — **기존 import는 안 깨지지만 새 코드는 `data.js`에서 직접 가져오는 쪽이 뜻이 분명하다.** 밸런스를 만지려고 1,500줄짜리 로직 파일을 열지 말 것.

- **인원의 정본은 `state.crew`(숫자)이고 `state.bands`는 기록일 뿐이다.** 둘은 어긋날 수 있다(전투·폭풍으로 사람이 죽으면 crew만 준다) — `trimBands()`가 맞추고, 그 호출은 **`trimLoadout()` 안에** 있다. `crew`가 줄어드는 자리는 전부 이미 `trimLoadout()`을 부르고 있으므로 배선을 거기 모아 두면 빠뜨릴 자리가 없다. 새로 crew를 깎는 코드를 쓸 때도 같은 함수를 부를 것.

- **`TAVERN.advanceUnit`은 시작 조건에서 역산한 값이다.** 14닢으로 뒀더니 **당시 시작 금화 150닢**에서 여섯을 태우는 데 92닢이 나가 **가장 짧은 항로조차 화물을 못 실었다**(시작 금화는 그 뒤 200이 됐고 계약금 8닢은 그대로다). 이 값을 올릴 때는 `node tools/test-tavern.mjs` ⑤(첫 항차 성립)를 반드시 다시 돌린다.

- **급여는 `advanceDays`에서 금고를 안 건드린다** — 쌓기만 하고(`state.payroll.due`) 항구에서 `settlePayroll()`이 치른다. 항해비를 "이 항해가 얼마 드나"로 보여주는 곳(`voyageCost`)은 **총액**을 그대로 돌려주므로, 실제 차감액과 다르다는 것을 알고 써야 한다.

- **장부는 `book()` 하나로만 적는다.** 그리고 **매출은 관세를 떼기 전(`raw`)으로** 적는다 — `sell()`의 `gain`은 이미 관세가 빠진 값이라 그걸 적으면서 관세를 지출로 또 적으면 **관세가 두 번 잡힌다**(실제로 장부가 금고와 8닢 어긋났고 `test-payroll.mjs` ⑥이 잡았다).

- **매매 수량은 실패시키지 말고 클램프**한다. `min(요청, 화물여유, floor(gold/단가))` — "가능한 만큼" 사는 게 기존 UX다.

- **전량 매도 시 `cargo`와 `buyPrice`를 함께 삭제**한다. 안 그러면 수량 0 항목이 손익 계산에 남는다.

- **임금을 내리면 후반이 풍족해진다 — 압박을 옮겨야 한다.** 임금이 사료 대비 과중해서 내렸더니(선원 2.4→1.2·부관 16→2.6) 90항차 자산이 +65%로 뛰었다. 인건비는 **규모와 무관하게 붙는 고정비**라 후반 브레이크 역할을 하고 있었기 때문이다. 그래서 선체 유지·무장 유지·**적하보험**을 신설해 성장할수록만 무거워지게 옮겼다. 임금 계수 하나만 만지고 끝내면 곡선이 반드시 무너진다.

- **`GOODS[].base`를 고치면 `content/goods-evidence.json`도 같은 커밋에서.** `node tools/check-prices.mjs`가 곡물 대비 비율·임금 사다리·**임금 대비 배값**(캐랙 ÷ 선원연봉)·유지비 계수를 대조해 실패시킨다. 이 "임금 대비 배값"이 낮으면 배가 싼 게 아니라 **임금이 비싼** 것이다 — 부관 급여 과다가 실제로 여기서 드러났다.

- **부관은 능력·급여·성과급을 한 묶음으로 조정한다.** `perks`만 후하게 하면 "고용 안 할 이유가 없는" 장치가 되고 `cut`만 올리면 아무도 안 쓴다(노림수는 승률 6할). 그리고 **총액이 같아도 급여와 성과급은 효과가 다르다** — 성과급은 잘 벌 때 더 떼므로 성장기 재투자 자본을 깎아 **복리로** 아프고, 급여는 고정이라 규모가 커질수록 가벼워진다. 총 부담을 맞춰 성과급 12%→8%+급여16으로 갈랐더니 순효과가 +14%→**+21%로 올라갔다.** "총액을 맞췄으니 균형도 같겠지"로 넘기지 말 것.
