# 토픽: 실행 · 검증 · 디버깅

> 빌드 없음. 순수 ES 모듈 + Canvas. 로컬 서버로 `index.html`을 열면 실행된다. (2026-08-13)

## 실행

```bash
cd C:\Users\soman\AntiProject\tradeship
python serve.py 8891            # run_in_background · 포트 생략 시 8891
start http://localhost:8891/index.html            # 게임 (PowerShell도 같다)
start http://localhost:8891/preview.html          # 에셋 미리보기
start "http://localhost:8891/index.html?speed=8"  # 8배속 — 연출만 빨라진다
```

⚠️ **이 저장소의 예시는 bash 표기다.** 이 PC의 기본 셸은 PowerShell이라 `&`(백그라운드)와
`VAR=x cmd`(인라인 환경변수)가 안 먹는다. PowerShell에서는 각각 `Start-Process`(또는 Bash 툴을 쓴다)와
`$env:VAR='x'; cmd`로 바꾼다 — 예: `$env:PLAYTEST_SPEED='8'; node tools/playtest-live/launch.mjs`.

`file://`로 열면 ES 모듈이 CORS로 막힌다 — 반드시 http 서버로.
웹 출력은 claude.ai Artifact가 아니라 로컬 HTML + 로컬 서버 + 브라우저(사용자 지침).

**`python -m http.server`는 쓰지 않는다.** 그건 `Cache-Control`을 보내지 않아 브라우저가 .js 모듈을
휴리스틱 캐시한다(파일 수정 시각이 오래될수록 캐시 유효기간이 길어진다). 빌드도 캐시버스터도 없는
순수 ES 모듈이라 `index.html`만 새로 받고 `state.js`는 낡은 것을 쓰는 **섞인 상태**가 생기고,
그러면 import가 링크 단계에서 실패해 **화면이 검게 남는다**. `serve.py`가 `no-store`를 붙여 막는다.

이미 낡은 캐시를 문 탭은 `Ctrl+Shift+R`로 털거나, **다른 포트로 띄운다**(포트가 다르면 캐시가 분리된다).

## 콘솔에서 씬 강제 전환

모듈은 동적 import로 **같은 인스턴스**를 얻는다(URL이 같으면 캐시된 모듈). 전투를 매번 항해로 유발하지 않아도 된다.

```js
const main = await import('./js/main.js');
const data = await import('./js/data.js');
const st   = await import('./js/state.js');

st.state.gold = 50000; st.state.crew = 34;          // 상태 직접 조작
main.go('battle', { enemy: data.ENEMIES[2],          // 0=약 1=중 2=강
  onEnd: () => main.go('port'), retreatTo: () => main.go('port') });
main.go('map');  main.go('port');
```

## 자동 조작 시 타이밍

포격전 한 턴 ≈ **2초** (내 행동 420ms → 적 턴 620ms → 적 포격 420+480ms).
스크립트로 버튼을 연속 클릭할 땐 턴당 2.2초 이상 대기해야 `disabled`에 막히지 않는다.

★ **이 수치는 1× 기준이다**(2026-08-23~). `js/speed.js`가 시간 스케일 정본이고 `?speed=N`·화면 토글로
**연출과 대기시간만** 줄어든다 — 실측 8×에서 한 턴 **0.27초**다. 일수·확률·판정 횟수는 배속과 **무관**하고,
조준 바늘은 연출이 아니라 난이도라 제외했다. 하네스는 `PLAYTEST_SPEED=8` 또는 `play.mjs --fast=8`(옵트인).
새 연출 대기를 넣을 때 **`setTimeout`을 직접 쓰지 말고** `speed.js`의 `after()`/`delay()`를 쓴다. → `QUICKMAP-engine.md`

```js
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn  = (t) => [...document.querySelectorAll('#battle-cmd .btn')]
                      .find(b => b.textContent.includes(t));
```

## 검증 도구 (`tools/` — 브라우저 없이 돈다)

```bash
node tools/test-rules.mjs      # 규칙 전반(경제·개장·나포·유지비·부관·항로위험·가공사슬) 82항목
node tools/test-world.mjs      # NPC 세계·바람·해류·계약 10항목
node tools/test-payroll.mjs    # 급여 발생·정산·체불·이탈·장부
node tools/test-tavern.mjs     # 술집 등용 20항목
node tools/sim-trade.mjs       # 무역 곡선 — "몇 항차에 어느 배를 사는가"
node tools/sim-risk.mjs [항차] [시드수]   # 실효 조우율·화물 손실 빈도 (기본 90×20 — ★시드 평균)
node tools/check-evidence.mjs  # 도시 수치 ↔ content/regions/<권역>-evidence.json 정합 (exit 1)
node tools/check-routes.mjs    # 항로 요율 ↔ content/regions/<권역>-evidence.json 정합 (exit 1)
node tools/check-wages.mjs     # 부관·선원 보수 ↔ content/wage-evidence.json 정합 (exit 1)
node tools/check-prices.mjs    # 물가·자산·유지비 ↔ goods/asset/upkeep-evidence.json 정합 (exit 1)
node tools/check-voyage.mjs    # 항차 수익 분포·손실 빈도·톤당승조원 ↔ voyage-evidence.json
python tools/check-map.py      # 납품된 지도 그림 검수 (Pillow 필요 · exit 1)
node tools/check-architecture.mjs   # 계층 트리 ↔ 실제 파일·state 필드 (exit 1)
                                    # ★ 파일·state 필드를 늘리면 dashboard/architecture.mjs에 적어야 통과한다
node tools/check-novel-events.mjs   # 소설 소재집 §6 이벤트 72건의 근거 ↔ 코드
node tools/check-world.mjs          # 권역 데이터 정합
node tools/sim-stat.mjs 20          # 무역 곡선을 20판 분포로 — ★1회 실행으로 판단하지 않는다
node tools/sim-events.mjs           # 전리품·사건 규모
node tools/event-inventory.mjs      # 사건이 걸릴 자리를 코드에서 전수로 센다
node tools/check-chain.mjs          # 가공 사슬 ↔ content/chain-evidence.json · 가공마진 밴드 이탈 (exit 1)
node tools/sim-chain.mjs [판수] [항차]   # 수직계열화가 곡선을 움직이나 — ★같은 시드로 짝지어(paired)
node tools/check-factions.mjs       # 세력·관계·`FACTIONS[].fleets` ↔ FOES 배치 (exit 1)
node tools/check-origins.mjs        # 한반도 갈래 다섯(`data.js: ORIGINS`) ↔ story 사본표 (exit 1)
node tools/region-topology.mjs      # 권역 항로 그물 전수 — 연결 성분이 갈리면 그 권역 패권이 성립 안 한다 (`--md`)
```

### ★ "통과"로 보이는데 실패다 — exit code를 믿지 마라

`test-rules.mjs`·`test-world.mjs`는 **FAIL을 찍고도 exit 0**이었다(2026-08-23 고침 — 이제 exit 1이고
마지막에 `규칙 — 82/82 통과`·`세계 — 10/10 통과`를 찍는다). 그 탓에 문서가 낡은 통과 수(`PASS 66/0`)를
근거로 삼고 있었다. **판정은 exit code가 아니라 마지막 요약 줄로 한다**, 그리고 통과 수를 문서에
인용할 땐 **그날 실측한 값**을 적는다.

⚠️ 그 대가로 **`test-world.mjs`가 간헐적으로 빨개진다** — 「해적 습격 0건」 항목이 확률 판정이라
실측 25회 중 1회(회차 7)가 `9/10`으로 떨어졌다. **코드 회귀로 오진하지 말고 한 번 더 돌린다**;
연속으로 실패하면 그때가 진짜다. 근본 해법은 그 항목에 시드를 물리거나 표본을 늘리는 것이다.

**고증 데이터를 만졌으면 `check-*`를 다 돌린다.** 수치만 고치고 근거를 안 고치면
"왜 이 값인지"를 아무도 모르게 되고, 다음 사람이 밸런스만 보고 고증을 되돌린다.
실제로 급여를 내리자마자 `check-wages`가 "근거 16 ≠ 코드 2.6"으로 즉시 잡았다.

### ★ 무엇이 실패이고 무엇이 경고인가

**실패(exit 1)는 *코드와 근거가 어긋남* 또는 *규칙이 자기모순*일 때만이다.**
값 불일치 · 유령 항목 · '확인됨' 판정인데 무출처 · 보험료를 걷는데 보상 사건 없음 · 내해 무위험.

**경고는 미조사·짧은 basis·분포 밴드 이탈이다.** 도시·품목·선종을 늘리면 분포는 당연히
흔들리고 근거는 뒤늦게 채워진다 — 그걸 실패로 잡으면 **검사기가 콘텐츠를 억제하는 장치**가 된다
(실제로 `check-evidence`가 "근거 없음"을 실패로 잡아, 새 도시를 넣으려면 조사부터
끝내야 하는 구조였다). → 최상위 원칙은 `claude-memory.md` §절대 원칙.

### ★ 시뮬 수치는 반드시 여러 시드를 평균한다

한 판만 돌리면 **어느 항로를 탔느냐가 통째로 운**이라 실효 조우율이 10%대와 20%대를 오간다.
실제로 `sim-risk.mjs`가 시드 없는 1회 실행이던 시절 "18%→10.3%로 내려갔다"는 값이
메모리·QUICKMAP·wiki 4곳에 결론으로 박히고 작업 후보까지 만들어냈다(20판 평균은 18.6%).
시드 고정 패턴은 `dashboard/wages.mjs: withSeed`.

`js/state.js`·`js/world.js`는 Canvas에 의존하지 않는 순수 로직이라 Node로 그대로 import된다
(그래서 `world.js`는 `sprites/`를 쓰지 않고 돛 성능도 `data.js: SHIPS[].rig`에서 읽는다).

**경제 수치를 만졌으면 `sim-trade.mjs`를 반드시 다시 돌린다.** `SPREAD` 한 계수만 움직여도
초반이 통째로 무너지거나 후반이 막힌다 — 실제로 조정 과정에서 "2항차에 카라벨"과
"5~15항차 내내 굶음"을 오간 끝에 잡은 곡선이다.

⚠️ **`sim-trade.mjs`는 해상 이벤트를 모델링하지 않는다.** 순수 무역만 재므로 항로 위험도를
바꿔도 자산 곡선이 안 움직인다 — 그것을 "영향 없음"으로 읽으면 안 된다. 위험도를 만졌으면
**`sim-risk.mjs`**로 교통량 가중 실효 조우율을 따로 본다.

⚠️ **부관·위험도처럼 확률이 걸린 것은 같은 시드로 짝지어(paired) 잰다.** 그냥 두 번 돌리면
배 구입 타이밍 때문에 기준선이 25%씩 튀어 **효과의 부호가 뒤집힌다**. `Math.random`을
mulberry32 같은 시드 PRNG로 갈아 끼우고 두 팔을 같은 시드로 돌린 뒤 중앙값·승률을 본다.

## 자동 검증 (에이전트용)

MCP로 붙는 Chrome은 원격(Linux/macOS)이라 **이 PC의 `localhost:8891`에 닿지 않는다.**
로컬에서 실제 화면을 확인하려면 스크래치패드에 `playwright-core`만 깔고 시스템 Chrome을 몰면 된다(브라우저 다운로드 불필요).

```bash
npm i playwright-core --prefix <scratchpad>        # 브라우저는 안 받는다
```
```js
import { chromium } from './node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ channel: 'chrome' });   // 시스템 Chrome
// 페이지에서 게임 모듈을 그대로 집어올 수 있다 (동적 import는 같은 인스턴스)
await page.evaluate(async () => (await import('./js/state.js')).state.gold = 40000);
```

- 상태만 바꾸면 UI는 그대로다 — 탭을 왕복하거나 액션을 눌러 `buildUI()`를 태워야 버튼 `disabled`가 풀린다.
- 텍스트 셀렉터는 설명문에도 걸린다(`.pick:has-text("총병")`이 석궁병 설명의 "총병보다 싸다"에 매칭). `:has(b:text-is("총병"))`처럼 이름 노드로 좁힐 것.
- 순수 로직(`state.js`+`data.js`)은 브라우저 없이도 검증된다. 두 파일을 `{"type":"module"}` 붙인 디렉터리에 복사해 Node로 돌리면 된다.

## 에셋 수정 후

스프라이트는 `bake(key, ...)`로 **캐시**되므로 그리기 코드를 고쳐도 이미 만들어진 캔버스가 재사용된다.
→ 반드시 **새로고침**해야 반영된다. (`clearCache()`가 있으나 핫리로드 배선은 없음)

## 검증 체크리스트

전 구간을 브라우저로 실제 돌려본 항목:
매매(금화·적재 HUD 반영) · 항해 이동 · 해상 이벤트 모달 · 포격 조준/명중/빗나감 ·
백병전 라운드/전사 처리 · 나포 승리 전리품 · 패배 나포 처리 · 항구 복귀.

관련 함정은 [gotchas.md](gotchas.md) 참조 — 특히 모달 셀렉터와 스크린샷 타임아웃.

## 화면이 통째로 검을 때 — 판별과 실제 사례 (`gotchas.md` #6에서 이관)

- **판별**: 서버 로그가 `index.html`·`main.js`만 200이고 나머지 모듈 요청이 **아예 없으면** 캐시에서 쓴 것이다. 콘솔엔 `does not provide an export named ...`.
  ★ **`check-*`와 규칙 테스트가 전부 통과해도 그렇다** — 그것들은 `data.js`·`state.js`를 직접 부르는 도구라 `scenes/*`를 한 번도 안 거친다. 실제로 `scenes/map.js`가 `riskKey`를 잘못 가져와 **게임이 죽은 채로 회차가 돌았고**, 지도가 낡은 채 굳은 것이 그 증상이었다(`gen-map-png.mjs`는 게임을 띄워서 굽는다). 커밋 전 **둘 다** 돌린다.
