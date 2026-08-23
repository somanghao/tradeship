// speed.js — 게임 시간 스케일의 **단일 정본**
//
// ★ 배속은 **게임 규칙을 절대 바꾸지 않는다.**
//   일수·확률·시세·피해량·판정 횟수는 배속과 무관하다. 이 파일이 줄이는 것은 오직
//   **화면 연출과 그것이 끝나기를 기다리는 시간**뿐이다 — 포격 한 발의 연기가 걷히는 시간,
//   항해 애니메이션이 지도를 가로지르는 시간, 토스트가 사라지는 시간.
//   그래서 8배로 굴린 판과 1배로 굴린 판은 **같은 씨앗이면 같은 결과**여야 한다.
//
//   ⚠️ 여기에 조준 미니게임의 바늘 속도(`battle.js: B.aim.speed`)를 넣으면 안 된다.
//      그것은 연출이 아니라 **난이도**다 — 빨라지면 맞히기 어려워지고, 배속이 규칙을 바꾼 것이 된다.
//   ⚠️ 메인 루프(`main.js: frame`)의 `requestAnimationFrame`도 건드리지 않는다.
//      프레임을 빠르게 하는 것이 아니라 **대기시간을 짧게** 하는 것이 배속이다.
//
// 설정 경로 셋 — 앞이 이긴다:
//   ① `?speed=8` 쿼리 파라미터 (검증·하네스용. 그 탭에만 걸린다)
//   ② `localStorage['tradeship.speed']` (화면의 토글이 여기 적는다)
//   ③ 기본값 1배 — **평소 게임에는 아무 영향이 없다.**

/** 화면 토글이 도는 단계. 상한과는 별개다(쿼리로는 그 사이 아무 값이나 줄 수 있다). */
export const SPEED_STEPS = [1, 2, 4, 8];

/** 0이나 음수로 게임이 멎지 않게 묶는다. 50배 위로는 연출이 프레임보다 짧아져 뜻이 없다. */
export const SPEED_MIN = 1, SPEED_MAX = 50;

const LS_KEY = 'tradeship.speed';

/** 배속 계수. 읽기는 어디서나, 쓰기는 `setSpeed`로만. */
export const speed = { mul: 1 };

const listeners = new Set();

/** 넘어온 값을 쓸 수 있는 배속으로 만든다. 못 읽으면 null. */
function sane(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, n));
}

/** 배속을 바꾼다. `persist`가 참이면 다음 새로고침에도 남는다(화면 토글). */
export function setSpeed(n, { persist = false } = {}) {
  const v = sane(n);
  if (v == null) return speed.mul;
  speed.mul = v;
  if (persist) {
    try {
      if (v === 1) localStorage.removeItem(LS_KEY);
      else localStorage.setItem(LS_KEY, String(v));
    } catch { /* 사생활 모드 등 — 배속은 저장 못 해도 이번 판에는 걸린다 */ }
  }
  for (const fn of listeners) { try { fn(v); } catch { /* 구독자 하나가 죽어도 배속은 걸린다 */ } }
  return v;
}

/** 배속이 바뀔 때 부른다(화면 토글이 제 표시를 갱신하는 데 쓴다). 해제 함수를 돌려준다. */
export function onSpeedChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 연출 시간(ms)을 배속으로 환산한다. 숫자만 다룬다 — 규칙 수치에는 절대 쓰지 않는다. */
export const scaled = (ms) => ms / speed.mul;

/* ── 진행 중인 연출 세기 ────────────────────────────────────────
   자동 조종이 "지금 눌러도 되나"를 폴링으로 때려 맞히지 않게, **아직 안 끝난 연출 대기**를
   여기서 센다. `after`로 잡은 대기가 하나라도 남아 있으면 화면은 아직 움직이는 중이다.
   ★ 콜백이 **끝난 뒤에** 세는 것을 줄인다 — 연쇄 대기(`setTimeout` 안에서 다시 `setTimeout`)가
     그 사이 0으로 떨어져 "다 끝났다"고 거짓 신호를 내는 것을 막는다. */
let pending = 0;
const busyProbes = new Set();

/** "이 조건이 참인 동안은 연출 중이다"를 등록한다(프레임으로 도는 애니메이션용). 해제 함수를 돌려준다. */
export function registerBusy(fn) {
  busyProbes.add(fn);
  return () => busyProbes.delete(fn);
}

/** 지금 연출이 돌고 있나 */
export function isBusy() {
  if (pending > 0) return true;
  for (const p of busyProbes) { try { if (p()) return true; } catch { /* 죽은 프로브는 무시 */ } }
  return false;
}

/** `setTimeout`과 같은 자리에 그대로 쓴다 — 배속으로 줄이고, 진행 중인 연출로 센다. */
export function after(fn, ms) {
  pending++;
  return setTimeout(() => {
    try { fn(); } finally { pending--; }
  }, scaled(ms));
}

/** `await delay(400)` — 배속으로 줄인 대기 프라미스. */
export function delay(ms) {
  return new Promise((res) => { after(res, ms); });
}

/** 연출이 다 끝날 때까지 기다린다. 이미 한가하면 즉시 끝난다.
    `timeout`은 **실시간** 상한이라 배속으로 줄지 않는다 — 안전장치이기 때문이다. */
export function waitIdle({ timeout = 20000 } = {}) {
  if (!isBusy()) return Promise.resolve(true);
  return new Promise((res) => {
    const t0 = Date.now();
    /* 프레임 애니메이션(항해)은 타이머가 아니라 `update`로 끝나므로 **폴링이 정본**이다.
       25ms는 화면 한 프레임보다 짧아 사람이 못 느끼고, 8배 연출(52ms)도 놓치지 않는다. */
    const poll = setInterval(() => {
      if (!isBusy()) { clearInterval(poll); res(true); }
      else if (Date.now() - t0 > timeout) { clearInterval(poll); res(false); }
    }, 25);
  });
}

/* ── 초기값 ─────────────────────────────────────────────────── */
(function boot() {
  let v = null;
  try { v = sane(new URLSearchParams(location.search).get('speed')); } catch { /* 없다 */ }
  if (v == null) { try { v = sane(localStorage.getItem(LS_KEY)); } catch { /* 없다 */ } }
  if (v != null) {
    speed.mul = v;
    console.info(`[speed] ${v}× — 연출과 대기시간만 줄인다(규칙은 그대로).`);
  }
})();
