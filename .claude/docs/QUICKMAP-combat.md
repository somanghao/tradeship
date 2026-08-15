# QUICKMAP — combat (전투 · 선박 · 조선소)

> 포격전·백병전과 그 준비(배·무장·개장·병종). 배를 사고 꾸미고 싸우는 쪽 전부.
> 시세·물가·NPC·계약·고증은 [QUICKMAP-trade.md](QUICKMAP-trade.md)로 간다.

## 1. 키워드 → 문서 · 코드 정본

**한 줄에 "무엇을 읽고 어느 파일을 여는가"가 함께 있다.** 문서는 왜·어떻게, 코드는 값.

| 키워드 | 읽을 문서 | 코드 정본 |
|---|---|---|
| 전투 · 포격 · 조준 미니게임 · 거리(range) · 명중/치명타 · 데미지 공식 · **탄종(포도탄·사슬탄·가열탄)** · 돛 손상 · 화재 · 백병전 · 병종 능력치 · 자세(돌격/난전/방진/일제사격) · 적 AI · 적 5티어 · 도주 · 나포 편입 · 격침 · 전리품 · 이펙트 타이밍 | [wiki/battle-system.md](wiki/battle-system.md) | 규칙 `js/state.js`(armsFactor·armsAimAt·playerTroops) · 씬 `js/scenes/battle.js` · 수치 `js/data.js`(ENEMIES·TROOPS·SHOTS·CANNONS) |
| 선단 · 배 여러 척 · 구입/승선/매각 · **어느 항구에서 뭘 짓나(공업력)** · 정박지 · 예인 · **개장**(동판·장갑·돛증축·골조·격실·레이지) · 최소 인원 · 대포 종류 · 포문 상한 · 탄약고 · 갑판 슬롯 · 병종 고용비 · 배치 환불 · 중고선 | [wiki/shipyard.md](wiki/shipyard.md) | 규칙 `js/state.js`(purchaseShip·boardShip·usedListings·refit) · 씬 `js/scenes/shipyard.js` · 수치 `js/data.js`(SHIPS·REFITS·CANNONS·TROOPS) |
| 갑판 배치가 그림에서 어긋남 · 선체 비례 · 대포 실물 | [wiki/shipyard.md](wiki/shipyard.md) + [QUICKMAP-art.md](QUICKMAP-art.md) | `js/sprites/ship.js: HULLS`(deck·x0·len) · `js/sprites/char.js: CHAR_FOOT` |
| 파일이 뭘 담당하나 · 씬 흐름 (역방향: 파일 → 기능) | [wiki/file-map.md](wiki/file-map.md) | — |

> 전투와 경제가 만나는 지점 둘 — **해적 조우 확률**(항로 위험 + 화물 가치)과 **선박 가격**은
> [QUICKMAP-trade.md](QUICKMAP-trade.md)에 있다. 조우가 터진 *뒤*의 규칙만 여기서 다룬다.

## 2. 수치를 어디서 고치나

| 하고 싶은 것 | 어디 |
|---|---|
| 선박 성능·가격·국적 | `data.js: SHIPS` — `tier`(필요 공업력) · `originFlag`(제 나라 항구는 한 등급 쉽다) · `era`/`requires`(해금) · `yards`(**전통 조선지 = 값 할인**, 판매처가 아니다) · `crewMin` · `upkeep` · `leak` |
| 어느 항구에서 뭘 짓나 | `map/geo.js: industry`(0~3) ≥ `SHIPS[].tier`. 판정은 `state.js: sellsShip/tierNeeded/yardCapable`, 값은 `shipPriceAt` |
| 중고선·나포선 매물 | `state.js: usedListings/buyUsed` · `USED` 상수도 `state.js`에 있다 · 나포선 개조항은 `map/geo.js: prizeYard` |
| 상위 선박 해금 | `data.js: SHIPS[].requires` — 그 선종을 몰아 봤어야(`state.everOwned`) 다음 배가 열린다 |
| 선박 매각 비율 | `state.js: SHIP_RESALE` (0.55) |
| 개장 종류·값 | `data.js: REFITS` — 효과 반영은 `state.js`의 `shipSpeed`/`maxHullOf`/`gunCap`/`fleeBonus`/`crewLossFactor` |
| 대포 성능·가격·유효 구간 | `data.js: CANNONS` (`near`~`far`) — 전투 반영은 `state.js: armsFactor()` / `armsAimAt()` |
| 구간 밖 페널티 기울기 | `state.js: ZONE_FAR_FALL`(50) · `ZONE_NEAR_FALL`(25) · `ZONE_FLOOR`(0.4) |
| 무장 유지비 | `state.js: ARM_UPKEEP` (경0.5·중0.9·장1.6 / 1문 1일) → `voyageCost()`의 `arms` |
| 탄종 성능·값 | `data.js: SHOTS` (`dmg`/`crew`/`sail`/`fire`) — 재고는 `state.shots`, 소모는 `useShot()` |
| 적 강함·전리품·나포선 | `data.js: ENEMIES` (`prize`=나포 시 얻는 선종) / 등장 확률은 `state.js: pickEnemy()` |
| **전리품 상한**(자산 대비) | `data.js: SPOILS_SHARE/TAIL/FLOOR·SPOILS_GOODS_*` — 규칙 `state.js: spoilsCap/capSpoils/capLoot`. `pickEnemy()`와 `world.js: pirateEnemy()`가 **둘 다** 통과한다 |
| 나포선을 끌고 갈 수 있나 | `data.js: PRIZE_CREW`(0.35) — 판정 `state.js: spareCrew/prizeCrewNeed`. 모자라면 해체값(`PRIZE_SCRAP`)만, 그것도 상한을 받는다 |
| 이벤트·전투 보상이 단계마다 얼마나 큰가 | `node tools/sim-events.mjs [시드수]` — 초·중·후반 자산 대비 %와 항차 순이익 대비 배수로 낸다 |
| 병종 능력치·고용비 | `data.js: TROOPS` (`hire` 없는 병종은 조선소에서 못 뽑는다) / 목록은 `RECRUITS` |
| 갑판 슬롯 수 | 선원 7명당 1칸 · `state.js: MELEE_SLOTS`·`trimLoadout()` |
| 전투 밸런스 확인 | `node tools/test-rules.mjs`(규칙) · 해적 등급 분포는 대시보드 **해적** 탭 |

## 3. 이 도메인 전용 함정·가드

- **나포 전리품 > 격침 전리품**(1.00 vs 0.45, 화물은 나포만)이 전투 설계의 축이다. 이 비대칭이 사라지면 플레이어가 위험한 접현을 감수할 이유가 없어진다.
- **초반 밸런스는 자산이 아니라 "탄 배"로도 거른다.** `pickEnemy()`는 `leak` 있는 배(낡은 바사)를 몰 때 1~2티어만 붙인다. 자산 구간만으로 막으면 화물을 채운 순간 상위 티어가 붙어 필패한다(시작배를 바꾸며 실제로 걸렸던 함정).
- **대포 밸런스는 "거리 구간"으로 가른다.** 배율 하나로 전 구간을 좋게/나쁘게 만들면 상위호환이 생긴다(장포 사건). 수치를 건드리면 기대피해를 검산해 **거리별 1위가 2종 이상인지** 확인할 것.
- **`armsFactor()`/`armsAimAt()`는 포문이 0일 때 1.0을 돌려준다.** 대포를 전부 철거해도 전투 계산이 0으로 나눠지지 않게 하는 가드다.
- **개장 효과를 상태값에 반영하는 것을 잊지 마라.** `state.maxHp`는 파생이 아니라 저장값이라 개장·승선 후 `recalcShip()`을 불러야 한다. 속력·도주·포문 상한은 함수(`shipSpeed`/`fleeBonus`/`gunCap`)라 자동.
- **개장은 배에 붙는다.** `state.refits`는 기함 것이고 정박선은 `fleet[key].refits`. `stowFlagship()`이 기록하고 `boardShip()`이 복원한다 — 이 왕복을 빼면 갈아탈 때마다 개장이 증발한다.
- **선원이 줄면 `trimLoadout()`을 부른다.** 갑판 슬롯은 선원 7명당 하나라, 전투로 선원을 잃으면 닫힌 슬롯의 병종이 유령으로 남는다.
- **갑판 위 배치는 x·y 둘 다 선체에서 가져온다.** 기준선을 상수로 박아 병사가 돛대 높이에 뜬 적(y·`HULLS[hull].deck`/`CHAR_FOOT`), 짧은 선체에서 뱃전 밖 허공에 선 적(x·`HULLS[hull].x0`/`len`)이 각각 있다. 선종이 늘수록 상수는 반드시 깨진다.
- **조선소는 하드코딩된 목록이 아니라 도시 공업력이다.** 예전에는 `SHIPS[].yards`에 판매 항구를 박아 뒀는데, 도시를 늘릴 때마다 어긋나고 "왜 여기선 못 사나"가 설명되지 않았다. 지금은 `industry ≥ tier`로 풀고 `yards`는 **값이 싸지는 전통 조선지**로 의미가 바뀌었다 — 옛 뜻으로 읽지 말 것.
- **무장을 늘리면 매일 돈이 나간다.** `ARM_UPKEEP`이 붙어 있어 "해적이 무서워 포를 더 싣는다"에 대가가 있다. 대포 수치를 만지면 유지비도 함께 보고, 근거는 `content/upkeep-evidence.json`에 있다.
- **전리품은 자산 대비 상한을 받는다 — `ENEMIES[].loot`를 올려도 초반에는 안 오른다.** `capLoot()`가 "옮겨 실을 수 있는 만큼"으로 누르기 때문이다(초반 상한 60닢). 상한을 빼면 세기 1 좀도둑 하나가 시작 자산의 573%가 되어 첫 배로 코카를 산다 — 실측 근거는 `content/voyage-evidence.json: spoilsVsAssets`. 보상을 키우려면 상한 계수부터 본다.
- **이벤트 보상 수치의 일부는 아직 `scenes/map.js`에 박혀 있다.** 표류물(금화 60~300 + 화물 3~11개)과 폭풍 피해(선체 6~19)가 그렇다 — `data.js`에 없으니 **밸런스를 만지려고 값을 찾다 못 찾는다.** 둘 다 **금액이 고정**이라 초반엔 자산의 587%·91%이고 후반엔 6%·1%다(`tools/sim-events.mjs`). 옮길 때는 `data.js`로 빼고 `sim-events.mjs`의 `MIRROR` 블록을 지운다.
- **패배는 게임오버가 아니다.** 금화 50%·화물 전량을 잃고 항구로 예인된다(재기 가능). 이 처리를 바꿀 때 진행 불가 상태가 되지 않게.
