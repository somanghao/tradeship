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
| **급여 정산 · 급여일 · 체불 · 불만 · 이탈 · 화물 절도 · 장부 · 결산 화면** | [wiki/payroll.md](wiki/payroll.md) | `js/state.js`(payroll·ledger·`book`·`settlePayroll`·`stealCargo`·`MONTH_DAYS`·`DESERT_AT`) · 화면 `js/payday.js` · 검증 `node tools/test-payroll.mjs` |
| **술집 · 선원 등용 · 무리 · 기질 · 계약금 · 요구 일당** · 선원이 왜 0명으로 시작하나 · 부두 인부 | [wiki/crew-tavern.md](wiki/crew-tavern.md) | `js/data.js: TAVERN·CREW_TRAITS·CREW_NAMES` · `js/state.js`(tavernCrews·recruitBand·avgCrewWage·trimBands) · 씬 `js/scenes/tavern.js` · 검증 `node tools/test-tavern.mjs` |
| **교역품 물가 고증** · 밀·소금·기름·와인·후추가 서로 몇 배였나 · 화물 1칸은 실제로 얼마인가 · **대조 2축의 정본** | 근거 JSON이 곧 문서다(주석이 상세) | **`content/goods-evidence.json`** → 검증 `node tools/check-prices.mjs` |
| **선박·부동산 고증** · 배가 선원 연봉의 몇 배인가 · 집세·주택값 · 거점을 넣을 때의 앵커 | 근거 JSON | **`content/asset-evidence.json`** (부동산은 아직 게임 기능이 아니라 스케일 기준점) |
| **유지비·위험비용 고증** · 선체/무장 유지 · 적하보험 · 화물이 해적을 부르는 정도 | 근거 JSON | **`content/upkeep-evidence.json`** |
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
| 입항세를 읽는 함수 | 항구의 성질 → **`state.js: baseTariff()`** · 지금 실제로 무는 값(부관 특전 포함) → `tariffRate()` |
| 항해비 갈래 | `state.js: voyageCost()` — 일당(**`avgCrewWage()`** — 술집에서 누구를 태웠나로 갈린다·기본 `CREW_WAGE` 1.2)·보급(`SUPPLY_UNIT` 1.3)·선체(`HULL_UPKEEP`×`SHIPS[].upkeep`)·무장(`ARM_UPKEEP`)·선단·**적하보험**(`INSURANCE_RATE`×항로요율×화물가치)·부관 |
| 시작 조건(금화·선원·배) | `state.js: START_GOLD`(200) · `resetGame()` — **선원 0명**으로 시작한다. 값의 근거는 [payroll.md](wiki/payroll.md) §6 |
| **한반도 갈래 다섯**(신분 특전·시작 항구) | `data.js: ORIGINS` — 특전은 **조선 항구에서만**(`joseonOnly`). 소설 쪽 사본표(`story/PROTAGONISTS.md` §6-1 · `story/GAME-LINK.md` 갈래표)와 어긋나면 `node tools/check-origins.mjs`가 실패시킨다 |
| 급여 주기·불만·이탈 문턱 | `state.js: MONTH_DAYS`(30) · `UNREST_PER_MISS`·`UNREST_HEAL`·`DESERT_AT` · 참을성은 `data.js: CREW_TRAITS[].temper` |
| 선원 무리의 값·기질 | `data.js: TAVERN`(cycle·slots·band·emptyOdds·**advanceUnit**) · `CREW_TRAITS`(wageMul·advMul·troop·temper) → [crew-tavern.md](wiki/crew-tavern.md) |
| 부관 급여·성과급·능력 | `data.js: OFFICER` — `wage`·`cut`·`perks`는 **한 묶음**이라 함께 재측정. 고치면 `content/wage-evidence.json`도 같은 커밋에서 → [officer.md](wiki/officer.md) |
| 경제가 실제로 도는지 확인 | 대시보드 `/dashboard/` · 곡선 `node tools/sim-trade.mjs` · 실효 위험 `node tools/sim-risk.mjs` · 항차 수익 분포 `node tools/check-voyage.mjs` · 화면 없이 계측만 `node -e "import('./dashboard/measure.mjs')…"` |
| 가공 사슬 비율·새 가공품 base | `data.js: CHAIN` — **정수는 감이 아니라 「가공마진 밴드」(`WORK.marginMin/Max` 1.08~1.25)에서 역산한다.** 고치면 `content/chain-evidence.json`도 같은 커밋에서 · `node tools/check-chain.mjs`가 밴드 이탈을 **실패**시킨다 |
| 가공장 값·유지비·매각 회수율 | `data.js: WORKS`(값 공식 `(9,000 + 산출base×80) × TIER_MUL[공업력]`) · `WORK`(유지비 연 10% · 휴업 절반 · 두 번이면 압류 · 매각 0.60) |

## 3. 이 도메인 전용 함정·가드

> ⚠️ 도시·항로·NPC·계약·세력·고증·대시보드 쪽 함정은 [QUICKMAP-world.md](QUICKMAP-world.md) §3으로 옮겼다
> (예전에 `QUICKMAP-trade.md §3`으로 인용된 *"수요만 있고 산지가 0이면 그 칸은 아예 죽는다"* 등).

- **★ 짝지어 잰 뒤에는 「짝지은 차이의 중앙값」을 봐라 — 두 중앙값을 나누면 짝짓기가 도로 풀린다.** 같은 자료에서 `median(B) ÷ median(A)`가 **−14%**, 짝지은 차이가 **+0.0%**였다(다른 판이 중앙에 온다). 시드를 맞추는 것은 절반이고 **비교도 짝 안에서** 해야 한다.
- **★ `planFor()`는 한계마진이 0이 되면 멈춘다 — 「칸당 이익 × 화물칸」을 항차 이익으로 적지 마라.** 화물칸을 45→2,298로 키워도 **실제로 채우는 칸은 45→128**밖에 안 되므로, 곱셈으로 적으면 없는 수입이 생긴다. 이 한 줄이 「2,298칸 선단이 한 항차 69,124닢(갈레온의 7.1배)을 벌어 시장 깊이를 뚫는다」는 판정을 낳았지만 **실제 항차 순이익은 1,504→2,102닢**이고, 동행 여덟을 **공짜로** 얹은 판은 오히려 **1,842 → −355닢**이었다(유지비만 늘고 팔 곳이 없다). ⇒ **`MARKET.cap`을 완만한 곡선이나 점근선으로 바꾸면 벌점이 지금보다 *낮아져* 수익이 오른다 — 고칠 자리가 아니다.** 물량 벌점을 재는 스크립트는 **반드시 `used`(채운 칸)를 함께 출력**해야 한다. 정본 도구 `node tools/sim-fleet.mjs 30 40`. (2026-08-25 정정)
- **★ 밸런스를 재기 전에 `sim-core.mjs`의 *플레이 전략*부터 의심하라.** 곡선이 나쁘게 나오면 게임이 아니라 시뮬의 행동 규칙이 범인일 수 있다. 실제로 "선체 60% 미만이면 전액 수리"가 **누수 2pt/일짜리 시작배**에 적용돼 하루 28닢(급여의 3배)을 태웠고, 그 탓에 20판 중 18판이 배를 한 척도 못 샀다 — 게임은 멀쩡했다. 지금은 **누수 있는 배는 수리하지 않는다**. ⇒ `START_GOLD = 200`의 근거("완주 8/12")도 그 잘못된 전략으로 잰 값이라 **다시 재야 한다**. → [wiki/playtest-log.md](wiki/playtest-log.md) §4-2
- **★ 수직계열화 시설은 `state.works`다 — `HOLDINGS`에 얹지 말고 `state.industry`라 부르지도 마라.** `hegemonyOf()`가 `state.holdings`를 세므로 같은 그릇에 담으면 **권역 패권 조건이 조용히 바뀐다.** 이름 쪽은 `city.industry`·`state.yards`와 셋이 뒤섞이는 함정이다. 함정 넷 더(신규 가공품 산지 배율·`settleWorks` 배선·`SET_KEYS`·양쪽 tick) → [wiki/vertical-chain.md](wiki/vertical-chain.md) §6
- **★ 항구에는 시간이 없다 — 고정비를 설계할 때 이것부터 본다.** `advanceDays()`는 **`js/scenes/map.js:318` 한 곳에서만** 불린다. 곧 날·보급·유지비·급여 발생은 **항해할 때만** 일어나고 정박은 공짜가 아니라 **존재하지 않는다.** "정박 중에도 삯이 나간다" 류의 규칙은 비용 한 줄이 아니라 *체류 일수·그 일수를 쓰는 행동·표시*까지 붙는 **시간 모델 신설**이다. 배관은 절반 깔려 있다 — 급여는 발생주의(`state.payroll.due`)에 월 정산(`settlePayroll`)이고 체불·이탈까지 있다. 없는 것은 **항구에서 날을 흘리는 입구 하나**뿐이다. → 사양은 `story/GAME-LINK.md` §8 A-1b
- **값은 `data.js`, 규칙은 `state.js`다.** 튜닝 상수(임금·보급·유지비·보험·급여 주기·시작 자금·조우 확률 환산·조선소 계수)는 전부 `data.js` 아래쪽 "튜닝 상수" 절에 있고, `state.js`가 그대로 re-export한다 — **기존 import는 안 깨지지만 새 코드는 `data.js`에서 직접 가져오는 쪽이 뜻이 분명하다.** 밸런스를 만지려고 1,500줄짜리 로직 파일을 열지 말 것.
- **인원의 정본은 `state.crew`(숫자)이고 `state.bands`는 기록일 뿐이다.** 둘은 어긋날 수 있다(전투·폭풍으로 사람이 죽으면 crew만 준다) — `trimBands()`가 맞추고, 그 호출은 **`trimLoadout()` 안에** 있다. `crew`가 줄어드는 자리는 전부 이미 `trimLoadout()`을 부르고 있으므로 배선을 거기 모아 두면 빠뜨릴 자리가 없다. 새로 crew를 깎는 코드를 쓸 때도 같은 함수를 부를 것.
- **`avgCrewWage()`는 총액이 아니라 단가를 돌려준다.** `voyageCost(days, crew, leg)`가 crew를 인자로 받아 "N명이면 얼마인가"를 묻기 때문이다. 총액으로 바꾸면 시뮬·대시보드가 조용히 틀린 값을 낸다.
- **`TAVERN.advanceUnit`은 시작 조건에서 역산한 값이다.** 14닢으로 뒀더니 **당시 시작 금화 150닢**에서 여섯을 태우는 데 92닢이 나가 **가장 짧은 항로조차 화물을 못 실었다**(시작 금화는 그 뒤 200이 됐고 계약금 8닢은 그대로다). 이 값을 올릴 때는 `node tools/test-tavern.mjs` ⑤(첫 항차 성립)를 반드시 다시 돌린다.
- **급여는 `advanceDays`에서 금고를 안 건드린다** — 쌓기만 하고(`state.payroll.due`) 항구에서 `settlePayroll()`이 치른다. 항해비를 "이 항해가 얼마 드나"로 보여주는 곳(`voyageCost`)은 **총액**을 그대로 돌려주므로, 실제 차감액과 다르다는 것을 알고 써야 한다.
- **장부는 `book()` 하나로만 적는다.** 그리고 **매출은 관세를 떼기 전(`raw`)으로** 적는다 — `sell()`의 `gain`은 이미 관세가 빠진 값이라 그걸 적으면서 관세를 지출로 또 적으면 **관세가 두 번 잡힌다**(실제로 장부가 금고와 8닢 어긋났고 `test-payroll.mjs` ⑥이 잡았다).
- **시뮬도 정산을 해야 한다**(`sim-core.mjs`, 입항해서 팔고 난 뒤). 빼면 급여가 영영 안 나가 **사실상 공짜**가 되고 자산 곡선이 통째로 부풀어 오른다.
- **시뮬은 술집을 쓴다**(`sim-core.mjs: manCrew`). 선원을 안 태우면 첫 항차부터 인원 부족으로 속력이 깎여 곡선이 통째로 어긋난다 — 실제로 배를 한 척도 못 사는 결과가 나왔다. 시작 조건을 만지면 `node tools/sim-trade.mjs`를 다시 돌릴 것.
- **시세 노이즈는 `Math.random()`이 아니라 (도시·품목·날짜) 해시**다. 항구를 나갔다 들어와도 값이 변하면 안 된다(재입장 스캠 방지). `wobble()`을 난수로 바꾸지 말 것.
- **매매 수량은 실패시키지 말고 클램프**한다. `min(요청, 화물여유, floor(gold/단가))` — "가능한 만큼" 사는 게 기존 UX다.
- **전량 매도 시 `cargo`와 `buyPrice`를 함께 삭제**한다. 안 그러면 수량 0 항목이 손익 계산에 남는다.
- **경제 수치를 건드리면 `node tools/sim-trade.mjs`를 다시 돌린다.** 최적 플레이·다품목·NPC를 가정한 무역 곡선으로 "몇 항차에 어느 배"가 나온다. `SPREAD` 하나만 움직여도 초반이 무너지거나 후반이 막힌다 — 눈으로 판단하지 말 것.
- **임금을 내리면 후반이 풍족해진다 — 압박을 옮겨야 한다.** 임금이 사료 대비 과중해서 내렸더니(선원 2.4→1.2·부관 16→2.6) 90항차 자산이 +65%로 뛰었다. 인건비는 **규모와 무관하게 붙는 고정비**라 후반 브레이크 역할을 하고 있었기 때문이다. 그래서 선체 유지·무장 유지·**적하보험**을 신설해 성장할수록만 무거워지게 옮겼다. 임금 계수 하나만 만지고 끝내면 곡선이 반드시 무너진다.
- **`GOODS[].base`를 고치면 `content/goods-evidence.json`도 같은 커밋에서.** `node tools/check-prices.mjs`가 곡물 대비 비율·임금 사다리·**임금 대비 배값**(캐랙 ÷ 선원연봉)·유지비 계수를 대조해 실패시킨다. 이 "임금 대비 배값"이 낮으면 배가 싼 게 아니라 **임금이 비싼** 것이다 — 부관 급여 과다가 실제로 여기서 드러났다.
- **교역품 값을 올리면 화물 매입 자본이 커진다.** 사료 비율로 기준가를 올렸더니 시뮬이 배를 사고 나서 실을 것을 못 사 **절반이 파산**했다(금화의 92%까지 배에 쓰던 규칙 때문). 물가를 만지면 `sim-core`의 구매 여유(`state.gold * 0.70`)도 함께 본다.
- **항차 ROI는 경제가 아니라 "얼마나 가려 싣느냐"가 정한다.** `sim-core.mjs: planFor`의 `minMargin`이 0이면(총이익 최대화) 마지막 칸의 마진이 0이라 중앙값이 5%로 눌리고, 0.15면 같은 경제·같은 시드에서 10.1%가 된다. 조사가 "중앙값이 사료(10~20%)의 절반"이라며 `MARKET`을 낮추자고 제안했으나 **실측에서 폐기**했다 — impact를 0.36→0.22로 낮추면 중앙값은 1.7%p 오르고 90항차 자산이 34k→100k로 부푼다. 판정은 `node tools/check-voyage.mjs`가 근거 파일이 정한 minMargin에서만 한다.
- **부관 효과는 같은 시드로 짝지어(paired) 잰다.** 그냥 두 번 돌려 비교하면 시뮬이 "돈이 모이면 즉시 큰 배를 사는" 탓에 기준선이 25%씩 튀어 **효과의 부호가 뒤집힌다**(실제로 −20%와 +62%가 같은 설정에서 나왔다). 지표도 금화가 아니라 **총자산(금화+선단 매각가)**으로 본다 — 금화만 보면 "방금 배를 샀는가"에 지배된다.
- **부관은 능력·급여·성과급을 한 묶음으로 조정한다.** `perks`만 후하게 하면 "고용 안 할 이유가 없는" 장치가 되고 `cut`만 올리면 아무도 안 쓴다(노림수는 승률 6할). 그리고 **총액이 같아도 급여와 성과급은 효과가 다르다** — 성과급은 잘 벌 때 더 떼므로 성장기 재투자 자본을 깎아 **복리로** 아프고, 급여는 고정이라 규모가 커질수록 가벼워진다. 총 부담을 맞춰 성과급 12%→8%+급여16으로 갈랐더니 순효과가 +14%→**+21%로 올라갔다.** "총액을 맞췄으니 균형도 같겠지"로 넘기지 말 것.
- **시뮬의 `ORDER`는 화물칸 오름차순이다.** 가격순으로 두면 갤리(비싸고 짐은 적다)를 사서 화물칸이 줄어든다. 그리고 **지금 타는 배보다 나은 것만** 사게 해야 한다 — 안 그러면 싼 배를 사서 하향 갈아탄다(실제로 그랬다).
