# 재발 방지 체크리스트 (세션시작 필독)

> `claude-memory.md`와 함께 **매 세션 반드시 읽는다.** 여기엔 **어느 작업에서도 밟을 수 있는** 함정만 둔다.
> **도메인 전용 함정은 각 `QUICKMAP-<도메인>.md` §3**(art/game/engine)에 있고, 그 도메인 작업이면 라우팅 체인이 반드시 도달시킨다.
> 자체 상한 **≤4KB** — 넘으면 축약이 아니라 도메인 §3으로 이관.

## 1. 에셋·지형을 고쳤는데 화면이 그대로다 → `bake` 캐시

- **원인**: 모든 스프라이트는 `bake(key, w, h, draw)`로 캐시된다. 같은 key면 그리기 코드를 고쳐도 이미 만들어진 캔버스가 재사용된다.
- **교훈**: 그리기 코드 수정 후에는 **새로고침**. "코드를 고쳤는데 안 바뀐다"를 로직 버그로 오진하지 말 것. 외형을 바꾸는 인자는 전부 key에 포함시킨다.
- 정본 → [pixel-pipeline.md](pixel-pipeline.md), [dev-workflow.md](dev-workflow.md)

## 2. 결과 모달을 찾을 때 숨겨진 항해일지가 잡힌다

- **원인**: 항해일지 모달(`#logmodal`)이 `.modal.hidden`으로 **DOM에 상주**한다. `document.querySelector('.modal')`이 이것을 먼저 잡는다.
- **교훈**: 결과 모달 탐색은 반드시 `[...document.querySelectorAll('.modal')].find(m => m.id !== 'logmodal')`. 실제로 이걸로 "전투 결과 모달 없음"을 오판했다.
- 정본 → [render-architecture.md](render-architecture.md), [dev-workflow.md](dev-workflow.md)

## 3. 브라우저 스크린샷이 CDP 타임아웃

- **원인**: 캔버스가 많은 페이지에서 `Page.captureScreenshot`이 30초 타임아웃으로 실패한다. 렌더러가 죽은 게 아니다.
- **교훈**: **그대로 한 번 더 호출하면 대개 성공**한다. 페이지를 리로드하거나 코드를 의심하기 전에 재시도부터. 스크롤 직후 검은 화면이 찍히면 1틱 스크롤로 리페인트를 유도한다.
- 정본 → [dev-workflow.md](dev-workflow.md)

## 4. 코드로 그린 그림은 렌더 확인 없이 품질을 단정하지 않는다

- **원인**: 좌표 DSL로 그린 결과는 코드만 봐서는 어떻게 보이는지 알 수 없다. 지도를 세 번 갈아엎은 것도, 성벽이 물에 잠긴 것도, 병사가 허공에 뜬 것도 전부 **렌더해 보고서야** 발견됐다.
- **교훈**: 에셋·배경·배치를 만들거나 고치면 `preview.html` 또는 실제 화면을 **눈으로 확인**한다. "코드상 맞으니 됐다"로 넘기지 말 것.
- 정본 → [pixel-pipeline.md](pixel-pipeline.md)

## 5. `file://`로 열면 아무것도 안 뜬다

- **원인**: 순수 ES 모듈이라 `file://`에서는 CORS로 import가 전부 막힌다.
- **교훈**: 항상 **`python serve.py`**로 띄운다(아래 6번 — `python -m http.server`는 쓰지 않는다). 웹 출력은 claude.ai Artifact가 아니라 **로컬 HTML + 로컬 서버 + 브라우저**(사용자 지침).
- 정본 → [dev-workflow.md](dev-workflow.md)

## 6. 코드를 고쳤는데 **화면이 통째로 검다** → 낡은 모듈 캐시

- **원인**: `python -m http.server`는 `Cache-Control`을 안 보내 브라우저가 .js를 휴리스틱 캐시한다. 새 `index.html`·`main.js`에 **낡은 `state.js`가 섞이면** 새 export를 못 찾아 import가 링크 단계에서 실패하고, 스크립트가 한 줄도 안 돌아 화면이 검게 남는다.
- **판별**: 서버 로그가 `index.html`·`main.js`만 200이고 나머지 모듈 요청이 **아예 없으면** 캐시에서 쓴 것이다. 콘솔엔 `does not provide an export named ...`.
- **교훈**: `serve.py`(no-store)로 띄운다. 이미 물린 탭은 `Ctrl+Shift+R`, 확실히 하려면 **다른 포트로**(포트가 다르면 캐시가 분리된다). **코드 버그로 오진하지 말 것** — 새 프로필로 열어 정상이면 캐시다.
- 정본 → [dev-workflow.md](dev-workflow.md)
