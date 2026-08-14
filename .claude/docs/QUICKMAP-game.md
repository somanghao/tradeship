# QUICKMAP — game (게임성·규칙·밸런스)

> 교역 경제와 해상 전투. 수치를 조정하거나 규칙을 바꿀 때.

## 1. 키워드 → 문서

| 키워드 | 문서 | 관장 |
|---|---|---|
| 시세 · 가격 · 물가 · 산지/수요 · `wobble` · 매매 · 사기/팔기 · 손익 · 매입가 · 화물 · 적재 · 수리/고용/대포/조선소 단가 · 선박 성능표 · 항해 일수 · 급여 · 선단 유지비 · 누수 · 초기 조건 · 도시 추가 · 교역품 추가 | [wiki/economy-trade.md](wiki/economy-trade.md) | 시세 공식과 경제 규칙 전 수치 |
| 전투 · 포격 · 조준 미니게임 · 거리(range) · 명중/치명타 · 데미지 공식 · **탄종(포도탄·사슬탄·가열탄)** · 돛 손상 · 화재 · 백병전 · 병종 능력치 · 자세(돌격/난전/방진/일제사격) · 적 AI · 적 5티어 · 도주 · 나포 편입 · 격침 · 전리품 · 이펙트 타이밍 · 갑판 배치 | [wiki/battle-system.md](wiki/battle-system.md) | 전투 2단계 규칙과 전 수치 |
| 선단 · 배 여러 척 · 구입/승선/매각 · **국적별 조선소(어디서 파나)** · 정박지 · 예인 · **개장(동판·장갑·돛증축·골조·격실·레이지)** · 최소 인원 · 대포 종류(경포·중포·장포) · 포문 상한 · 탄약고 · 갑판 슬롯 · 병종 고용비 · 배치 환불 | [wiki/shipyard.md](wiki/shipyard.md) | 조선소 4탭의 규칙과 수치 |
| 상인/해적 NPC · 세계가 혼자 돈다 · 시장 압력의 출처 · 해상 조우(흥정·약탈) · 소문 · **대형 주문(계약)** · 선금/위약금/기한 · NPC 수·행동 규칙 교체 | [wiki/world-npc.md](wiki/world-npc.md) | 세계와 계약. 숫자는 `npc/config.js`, 판단은 `npc/behavior.js`, 집행은 `world.js` |
| 경제 관측 · 시세가 실제로 움직이나 · 물자가 부족한 항구에 닿나 · 현금 흐름 · 도시×품목 매트릭스 · 자산 곡선 확인 | [wiki/economy-trade.md](wiki/economy-trade.md) | 대시보드 `http://localhost:8891/dashboard/` — 게임 모듈을 그대로 돌려 계측한다 |
| **도시 특산품 고증** · 어느 도시가 뭘 팔았나 · 깃발/국적 근거 · 왜 이 수치인가 · 사료 출처 | [wiki/city-goods-history.md](wiki/city-goods-history.md) | 서술본. 기계가 읽는 정본은 `content/city-evidence.json` — **`CITY_TRADE`를 고치기 전에 필독** |
| 파일이 뭘 담당하나 · 데이터 조정 지점 · 씬 흐름 | [wiki/file-map.md](wiki/file-map.md) | 파일↔기능 맵 |

## 2. 자주 하는 일

| 하고 싶은 것 | 어디 |
|---|---|
| 도시 추가 | `map/geo.js: CITY_GEO`(좌표·깃발·규모) **와** `data.js: CITY_TRADE`(경제)에 **같은 id**로 — 한쪽만 넣으면 콘솔 경고 |
| 시세 성향 | `data.js: CITY_TRADE` — `supply`(배율<1, 산지) / `demand`(배율>1, 수요지). 근거 → [city-goods-history.md](wiki/city-goods-history.md) |
| 항로 연결 | `map/geo.js: ROUTES` — 선 하나가 경제 전체의 물길을 바꾼다 |
| 교역품 추가 | `data.js: GOODS` + `sprites/icons.js`에 아이콘 |
| 선박 성능·가격·국적 | `data.js: SHIPS` — `yards`(파는 항구) · `crewMin`(최소 인원) · `upkeep`(하루 유지비) · `leak`(누수) |
| 개장 종류·값 | `data.js: REFITS` — 효과 반영은 `state.js`의 `shipSpeed`/`maxHullOf`/`gunCap`/`fleeBonus`/`crewLossFactor` |
| 탄종 성능·값 | `data.js: SHOTS` (`dmg`/`crew`/`sail`/`fire`) — 재고는 `state.shots`, 소모는 `useShot()` |
| 적 강함·전리품·나포선 | `data.js: ENEMIES` (`prize`=나포 시 얻는 선종) / 등장 확률은 `state.js: pickEnemy()` |
| 병종 능력치·고용비 | `data.js: TROOPS` (`hire` 없는 병종은 조선소에서 못 뽑는다) / 목록은 `RECRUITS` |
| 대포 성능·가격·유효 구간 | `data.js: CANNONS` (`near`~`far`) — 전투 반영은 `state.js: armsFactor()` / `armsAimAt()` |
| 구간 밖 페널티 기울기 | `state.js: ZONE_FAR_FALL`(50) · `ZONE_NEAR_FALL`(25) · `ZONE_FLOOR`(0.4) |
| 선박 매각 비율 | `state.js: SHIP_RESALE` (0.55) |
| 해적 조우 빈도 | `data.js: SEA_EVENTS`의 weight (현재 합 100) |
| 시세 변동폭·주기 | `state.js: wobble()` (3일 주기 ±15%) |
| 차익 폭(돈 버는 속도) | `data.js: SPREAD` — 이 한 계수가 무역 곡선 전체를 좌우한다 |
| 대량 거래 벌점 | `data.js: MARKET` (`depthPerSize`·`impact`·`cap`·`decay`) |
| 입항세 | `data.js: TARIFF` (도시 size별) |
| 항해 비용 | `state.js: CREW_WAGE`(2.4) · `SUPPLY_UNIT`(1.3) · 선종별 `upkeep` |
| 바람·해류 | `map/geo.js: CURRENTS` · 배의 `rig` · `state.js: windOf/windFactor/routeFactor` |
| 계약 규모·보수·위약금 | `data.js: CONTRACT` |
| NPC 수·습격률·시장 영향·싣는 양 | `npc/config.js: NPC` (traders·pirates·raidBase·pressure·loadRatio·pickTop) |
| NPC가 어디로 갈지·무엇을 살지 | `npc/behavior.js: chooseTrade/choosePirateMove` — `ctx`로만 받으므로 통째로 갈아 끼워도 `world.js`는 그대로 |
| 도시 수치의 근거·출처 | `content/city-evidence.json` (정본) — 고치면 `node tools/check-evidence.mjs`로 정합 확인. 대시보드 매트릭스 **근거** 모드에서도 보인다 |
| 경제가 실제로 도는지 확인 | 대시보드 `dashboard/` (`python serve.py` 후 `/dashboard/`) · 계측만 떼서 보려면 `node -e "import('./dashboard/measure.mjs')…"` |

## 3. 이 도메인 전용 함정·가드

- **시세 노이즈는 `Math.random()`이 아니라 (도시·품목·날짜) 해시**다. 항구를 나갔다 들어와도 값이 변하면 안 된다(재입장 스캠 방지). `wobble()`을 난수로 바꾸지 말 것.
- **나포 전리품 > 격침 전리품**(1.00 vs 0.45, 화물은 나포만)이 전투 설계의 축이다. 이 비대칭이 사라지면 플레이어가 위험한 접현을 감수할 이유가 없어진다.
- **갑판 위 배치는 x·y 둘 다 선체에서 가져온다.** 기준선을 상수로 박아 병사가 돛대 높이에 뜬 적(y·`HULLS[hull].deck`/`CHAR_FOOT`), 짧은 선체에서 뱃전 밖 허공에 선 적(x·`HULLS[hull].x0`/`len`)이 각각 있다. 선종이 늘수록 상수는 반드시 깨진다.
- **매매 수량은 실패시키지 말고 클램프**한다. `min(요청, 화물여유, floor(gold/단가))` — "가능한 만큼" 사는 게 기존 UX다.
- **전량 매도 시 `cargo`와 `buyPrice`를 함께 삭제**한다. 안 그러면 수량 0 항목이 손익 계산에 남는다.
- **초반 밸런스는 자산이 아니라 "탄 배"로도 거른다.** `pickEnemy()`는 `leak` 있는 배(낡은 바사)를 몰 때 1~2티어만 붙인다. 자산 구간만으로 막으면 화물을 채운 순간 상위 티어가 붙어 필패한다(시작배를 바꾸며 실제로 걸렸던 함정).
- **개장 효과를 상태값에 반영하는 것을 잊지 마라.** `state.maxHp`는 파생이 아니라 저장값이라 개장·승선 후 `recalcShip()`을 불러야 한다. 속력·도주·포문 상한은 함수(`shipSpeed`/`fleeBonus`/`gunCap`)라 자동.
- **개장은 배에 붙는다.** `state.refits`는 기함 것이고 정박선은 `fleet[key].refits`. `stowFlagship()`이 기록하고 `boardShip()`이 복원한다 — 이 왕복을 빼면 갈아탈 때마다 개장이 증발한다.
- **선원이 줄면 `trimLoadout()`을 부른다.** 갑판 슬롯은 선원 7명당 하나라, 전투로 선원을 잃으면 닫힌 슬롯의 병종이 유령으로 남는다.
- **`armsFactor()`/`armsAimAt()`는 포문이 0일 때 1.0을 돌려준다.** 대포를 전부 철거해도 전투 계산이 0으로 나눠지지 않게 하는 가드다.
- **대포 밸런스는 "거리 구간"으로 가른다.** 배율 하나로 전 구간을 좋게/나쁘게 만들면 상위호환이 생긴다(장포 사건). 수치를 건드리면 기대피해를 검산해 **거리별 1위가 2종 이상인지** 확인할 것.
- **경제 수치를 건드리면 `node tools/sim-trade.mjs`를 다시 돌린다.** 최적 플레이·다품목·NPC를 가정한 무역 곡선으로 "몇 항차에 어느 배"가 나온다. `SPREAD` 하나만 움직여도 초반이 무너지거나 후반이 막힌다 — 눈으로 판단하지 말 것.
- **선금이 있는 계약은 위약금이 선금보다 커야 한다.** 위약금을 선금의 50%로 뒀더니 "받고 파기"가 순이득이었다(+3,448닢). 지금은 ×1.25.
- **NPC가 시장을 선점하면 플레이어가 굶는다.** NPC 거래 압력을 100% 반영했더니 5~15항차 자산이 바닥을 겼다. `npc/config.js: NPC.pressure`(0.5)로 절반만 남긴다.
- **`CITY_TRADE`를 고치면 `content/city-evidence.json`도 같은 커밋에서 고친다.** 항목마다 판정(`confirmed`/`probable`/`corrected`/`gameplay`)·근거·출처가 붙어 있고 `node tools/check-evidence.mjs`가 불일치·누락·유령 항목을 잡아 **실패시킨다**. 수치만 바꾸면 "왜 이 값인지"를 아무도 모르게 된다.
- **`CITY_TRADE` 수치에는 고증 근거가 달려 있다.** 15~16세기 실제 교역을 조사해 맞춰 둔 것이라, 밸런스만 보고 되돌리면 같은 오류가 재발한다(곡물을 북아프리카 수요지로 두는 것이 대표적 — 알제·튀니스는 곡물 **수출**지였다). 게임성 때문에 일부러 고증을 덮어쓴 곳도 문서에 따로 적혀 있으니 고치기 전에 [city-goods-history.md](wiki/city-goods-history.md)를 본다.
- **품목마다 산지와 수요지가 둘 다 있어야 죽지 않는다.** 산지만 있고 수요가 0이면 그 품목은 중립가로만 팔린다(거래는 되지만 재미가 준다). 반대로 수요만 있고 산지가 0이면 그 칸은 아예 죽는다 — 모피가 그럴 뻔했고 이스탄불(흑해 관문)을 산지로 세워 살렸다. 확인은 대시보드 **물동량** 모드.
- **수요지를 신설해도 항로가 멀면 아무도 안 나른다.** NPC는 이웃 한 칸만 보므로 중간 항구가 먼저 흡수한다. 이스탄불 곡물 수요를 넣었더니 유입이 **1**이었고, 알렉산드리아 직항을 놓고서야 흘렀다. 수요를 추가하면 대시보드 "부족한데 아무도 안 나르는 곳"을 반드시 확인할 것.
- **도시는 두 파일에 걸쳐 있다.** 지리(`map/geo.js: CITY_GEO`)와 경제(`data.js: CITY_TRADE`)를 id로 맞물려 `CITIES`를 합성한다. 한쪽에만 추가하면 게임은 돌지만 그 항구가 아무것도 안 팔거나 지도에 안 나온다 — 콘솔 경고로만 드러난다.
- **패배는 게임오버가 아니다.** 금화 50%·화물 전량을 잃고 항구로 예인된다(재기 가능). 이 처리를 바꿀 때 진행 불가 상태가 되지 않게.
