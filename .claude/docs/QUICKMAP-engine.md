# QUICKMAP — engine (구조·씬·UI·개발환경)

> 캔버스/DOM 레이어, 씬 전환, 레이아웃, 입력, 실행·디버깅. 화면 구조나 개발 흐름을 건드릴 때.

## 1. 키워드 → 문서

| 키워드 | 문서 | 관장 |
|---|---|---|
| 캔버스 · DOM 오버레이 · 레터박스 · 스케일 · 논리 해상도 400×225 · 좌표 변환(`toLogical`·`toScreen`) · 씬 매니저 · `go()` · 씬 전환 · 루프 · `el()` 빌더 · 모달 · 토스트 · HUD · 항해일지 · 씬별 레이아웃 · 입력/클릭 판정 | [wiki/render-architecture.md](wiki/render-architecture.md) | 이중 레이어 구조와 씬 매니저 |
| 실행 · 로컬 서버(`serve.py`) · 포트 · 브라우저 캐시 · 검은 화면 · 콘솔 디버깅 · 씬 강제 전환 · 자동 조작 타이밍 · 검증 체크리스트 · 새로고침 · Playwright 자동검증 | [wiki/dev-workflow.md](wiki/dev-workflow.md) | 띄우고 확인하는 법 |
| 조선소 씬 · 패널을 논리좌표에 얹기 · 탭 UI · 선단/무장/갑판배치 | [wiki/shipyard.md](wiki/shipyard.md) | 조선소를 고칠 때, UI가 게임 화면을 가릴 때 |
| 파일이 뭘 담당하나 · 씬 흐름도 · 데이터 조정 지점 | [wiki/file-map.md](wiki/file-map.md) | 파일↔기능 맵 |

## 2. 자주 하는 일

| 하고 싶은 것 | 어디 |
|---|---|
| 씬 추가 | `main.js: register(name, scene)` + `scenes/<name>.js`에 `{enter, exit, update, draw}` |
| 씬 전환 | `main.js: go(name, params)` — 오버레이는 자동으로 비워진다 |
| UI 패널 레이아웃 | `css/style.css`의 `#port-wrap` / `#map-side` / `#battle-ui` |
| 게임 화면 크기 | `sprites/scene.js: VW/VH` (400×225) — 바꾸면 전 배경 에셋 영향 |
| 상태바 항목 | `index.html`의 `#hud` + `ui.js: refreshHUD()` |
| 스프라이트를 DOM 패널에 얹기 | `ui.js: spriteEl()` (원본 그대로) / `spriteElTrim()` (투명 여백 잘라냄 — 176×128 선박처럼 큰 것) |
| 조선소 화면 | `scenes/shipyard.js` + `css/style.css`의 `#yard-panel` 계열 → [wiki/shipyard.md](wiki/shipyard.md) |
| UI가 게임 그림을 가릴 때 | 패널을 고정 px 대신 `viewport()` 기반 논리좌표로 배치 (조선소 씬 `layout()`이 본보기) |
| 키 입력 | 현재 전투 `Space`(발사)뿐 — `battle.js` 하단 `keydown` |
| 경제 대시보드 | `dashboard/` — `index.html`(화면) · `dash.js`(렌더) · `measure.mjs`(계측, DOM 없음) |
| 부팅 순서 | `main.js: boot()` — **에셋 팩 로드가 첫 `bake`보다 먼저**여야 한다(한 번 구우면 캐시에 박힌다) |

## 3. 이 도메인 전용 함정·가드

- **캔버스를 논리 해상도 크기로 만들지 마라.** 오버레이를 캔버스 크기에 묶으면 DOM UI 패널이 화면 밖으로 밀려나 무대를 뒤덮는다. 캔버스 = 무대 전체, 게임 화면은 그 안에 정수배 중앙 배치(레터박스). → [render-architecture.md](wiki/render-architecture.md)
- **좌표 변환에 `offX`/`offY`를 반영**한다. 빼먹으면 레터박스 폭만큼 클릭 판정이 어긋난다.
- **`mousemove`에서 `buildUI()`를 그냥 호출하면 UI가 떤다.** hover 대상이 실제로 바뀔 때만 재생성(`if (found === hover) return;`).
- **씬 `exit()`에서 캔버스 이벤트 리스너를 직접 해제**한다. 오버레이 DOM은 `go()`가 치워주지만 리스너는 남아 다른 씬에서도 클릭이 먹는다.
- **결과 모달을 찾을 때 `#logmodal`을 걸러라** — 숨겨진 항해일지가 `.modal`로 잡힌다. 가장 안전한 건 `modal()`이 돌려주는 노드를 잡아 두고 그걸 `.remove()`하는 것. (도메인 무관이라 [gotchas.md](wiki/gotchas.md) #2에도 있음)
- **DOM 패널을 고정 px로 깔면 게임 그림을 덮는다.** 항구 사이드패널(292px)이 정박한 배를 절반 넘게 가리고 있었다. 그림을 보여줘야 하는 화면은 `viewport()`로 논리좌표에 맞춰 배치한다.
- **씬 전환 시 남은 `setTimeout` 체인** — 전투 턴이 타이머 체인이라 씬을 급히 벗어나면 콜백이 살아 있다. 각 콜백이 `if (!B) return`으로 방어 중이니 이 가드를 지울 것.
- **정수배 스케일 정책** 때문에 창이 작으면 `scale=1`로 떨어진다(1.9배를 못 씀). 버그가 아니라 픽셀 선명도를 지키는 의도된 동작.
- **`.mjs`는 서버가 MIME을 안 주면 모듈로 안 읽힌다.** 파이썬 `mimetypes`에 `.mjs`가 없어 `text/plain`으로 나가고 브라우저가 거부한다. `serve.py`가 `extensions_map`에 등록해 둔 이유 — 대시보드가 `tools/*.mjs`를 직접 import한다.
