# 토픽: 렌더 구조와 씬 매니저

> `js/main.js` + `js/ui.js` + `index.html` + `css/style.css` — 캔버스/DOM 이중 레이어, 레터박스 스케일링, 씬 전환. (2026-08-08)

## 캔버스는 그림, DOM은 글자

픽셀 한글 폰트를 웹폰트로 가져올 수 없는 환경이다. 캔버스에 `fillText`로 한글을 그리면 정수배 확대 시 뭉개진다.

**그래서 레이어를 나눴다.**

| 레이어 | 담당 | 확대 |
|---|---|---|
| `<canvas id="screen">` | 배경·선박·캐릭터·이펙트·지도 마커 | 정수배 픽셀 확대 |
| `<div id="overlay">` | 패널·버튼·표·모달·상태바 | 확대 안 함 (CSS px) |

UI는 선명한 시스템 폰트로 나오고, 그림은 픽셀 그대로 유지된다. 레이아웃도 CSS가 처리하니 훨씬 싸다.

**예외:** 지도의 도시 이름표만 캔버스에 `fillText`(6px)로 그린다. 마커에 정확히 붙어야 해서. 작지만 지도에서는 충분히 읽힌다.

## 레터박스 스케일링 (중요)

처음엔 `canvas.width = VW × scale`로 캔버스를 게임 화면 크기에 맞췄다. **실패했다** — 오버레이를 캔버스 크기(예: 400×225 CSS px)에 묶으니 UI 패널이 그 밖으로 밀려나 화면을 뒤덮었다.

**확정 구조:** 캔버스는 무대 전체를 차지하고, 400×225 게임 화면은 그 **안쪽에 정수배로 중앙 배치**한다.

```js
canvas.width  = stage.clientWidth;      // 무대 전체
canvas.height = stage.clientHeight;
scale = max(1, floor(min(w/VW, h/VH))); // 정수배만
offX  = round((w - VW*scale) / 2);
offY  = round((h - VH*scale) / 2);
```

매 프레임:
```js
ctx.setTransform(1,0,0,1,0,0);
ctx.fillRect(0,0,canvas.width,canvas.height);   // 레터박스 여백 (#0a0910)
ctx.setTransform(scale,0,0,scale, offX,offY);
ctx.rect(0,0,VW,VH); ctx.clip();                // 게임 화면 밖으로 새지 않게
scene.draw(ctx, t);                             // 씬은 항상 400x225 좌표로만 그린다
```

오버레이는 `#stage` 전체(`inset:0`)를 쓰므로 창이 좁아도 패널이 밀려나지 않는다.

### 좌표 변환

```js
toLogical(ev)   // 마우스 → 400x225 논리 좌표  (지도 도시 클릭 판정)
toScreen(x,y)   // 논리 → 무대 픽셀 (오버레이 요소를 그림 위에 붙일 때)
viewport()      // {offX, offY, scale, w, h}
```
`offX/offY`를 빼먹으면 클릭 판정이 레터박스 폭만큼 어긋난다.

## 씬 매니저

```js
register(name, scene);
go(name, params);       // exit() → 오버레이 비움 → enter(params) → HUD/로그 갱신
sceneName();
```

씬 인터페이스 (전부 선택):
```js
{ enter(params), exit(), update(dt, t), draw(ctx, t), resize() }
```

- `go()`가 `clearOverlay()`를 호출하므로 씬은 자기 DOM을 정리할 필요가 없다.
- 단 **캔버스 이벤트 리스너는 직접 해제해야 한다.** `mapScene.exit()`에서 `mousemove`/`click`을 떼지 않으면 다른 씬에서도 도시 클릭이 먹는다.
- 씬 모듈은 `main.js`에서 동적 `import()`로 로드된다(순환 참조 회피: 씬 → `main.go` 참조, `main` → 씬 lazy 로드).

## 루프

```js
dt = min(0.05, (now - last)/1000);   // 탭 복귀 시 dt 폭주 방지
scene.update(dt, t);  → 그리기
```
`requestAnimationFrame` 단일 루프. 씬 전환 중에도 루프는 계속 돈다(`current?.draw?.()`).

## UI 헬퍼 (`ui.js`)

```js
el('div.panel#id', {text, html, style, onclick, disabled}, ...children)
```
자체 미니 DOM 빌더. `.class`/`#id`를 셀렉터 문법으로 받고 `on*`을 리스너로 연결한다. 템플릿 문자열보다 안전하고(XSS·따옴표) 조건부 자식(`falsy`는 자동 무시)이 편하다.

| 함수 | 용도 |
|---|---|
| `modal({title, body, actions, closable})` | 이벤트/결과 팝업. `actions[].onClick`이 `false`를 반환하면 안 닫힘 |
| `toast(text, kind)` | 2초 후 자동 소멸 |
| `refreshHUD()` | 상단 상태바 갱신 (HP·선원 부족 시 `.low` 빨강) |
| `refreshLog()` / `pushLog()` | 하단 항해일지 (최근 60건) |
| `spriteEl(sprite, scale)` / `iconEl(icon)` | 스프라이트를 `<canvas>` DOM으로 |
| `bar(kind, v, max)` | 전투 HP/선원 게이지 |

**모달 셀렉터 함정:** 항해일지 모달(`#logmodal`)이 숨겨진 채로 DOM에 상주한다. `document.querySelector('.modal')`은 이것도 잡으므로 결과 모달을 찾을 땐 `id !== 'logmodal'`로 걸러야 한다.

## 씬별 오버레이 레이아웃

| 씬 | 구조 |
|---|---|
| port | `#port-wrap` grid `452px / 1fr / 292px` — 가운데 열은 **비워서** 항구 그림이 보이게 |
| map | `#map-side` 우상단 고정 268px (현재 위치 / 항로 / hover 정보) |
| battle | 좌우 상태바, 상단 페이즈·거리, 하단 커맨드바, 조준 패널, 병력 칩 |

## 상태 갱신 방식

씬은 상태가 바뀌면 **오버레이를 통째로 다시 만든다**(`buildUI()`). 부분 갱신을 하지 않는다.
규모가 작아 성능 문제가 없고, 상태↔DOM 불일치가 생기지 않는다.

**주의:** `mousemove`처럼 초당 수십 번 발생하는 이벤트에서 `buildUI()`를 그대로 호출하면 DOM이 계속 재생성되어 깜빡이고 hover가 끊긴다. 지도 씬은 **hover 대상이 실제로 바뀔 때만** 호출한다.

```js
if (found === hover) return;   // 이 가드가 없으면 사이드 패널이 떤다
hover = found; buildUI();
```

## 한계 / TODO

- 창이 작으면 `scale`이 1로 떨어져 게임 화면이 400×225로 작게 나온다(정수배 정책상 1.9배를 못 쓴다).
  넓은 모니터에서는 3~4배로 시원하게 나온다.
- `resize()` 훅을 인터페이스에 뒀지만 어떤 씬도 구현하지 않았다. 창 크기를 바꾸면
  캔버스는 즉시 맞춰지나 오버레이 패널은 CSS에만 의존한다.
- 씬 전환 애니메이션(페이드 등) 없음.
- 키보드 입력은 전투의 `Space`(발사)뿐. 나머지는 마우스 전용.

관련: [pixel-pipeline.md](pixel-pipeline.md) (blit/스케일), [battle-system.md](battle-system.md) (setTimeout 턴 체인)
