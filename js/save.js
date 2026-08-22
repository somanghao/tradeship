// save.js — 판을 저장하고 이어한다 (A-0)
//
// ★ **`js/` 전체에 `localStorage` 호출이 0건이었다.** 새로고침 한 번에 판이 통째로 사라졌다.
//   소설 《구해기》의 코스를 게임 수치로 환산하면 **총 항차 330~380 · 총 항해일 900~1,100**이고
//   (`story/level/economy.md §1`), 그것은 **한 세션에 끝나지 않는다** — 세이브가 없으면
//   이 게임의 후반은 아무도 못 본다. 그래서 거점(A-1)·공업력(A-2)보다 이것이 먼저다
//   (`story/GAME-LINK.md §8`의 판정).
//
// ── 무엇을 저장하나 ────────────────────────────────────────────
//   `state` **통째로**. 규칙에서 다시 계산할 수 있는 것(시세표 같은 것)까지 담는 이유는,
//   빼기 시작하면 **필드가 늘 때마다 세이브가 조용히 낡기** 때문이다. 저장 대상 목록을
//   따로 관리하는 순간 다음 사람이 추가한 필드는 저장되지 않는다.
//   대신 `Set`만 배열로 바꿔 실었다가 되돌린다(JSON이 Set을 모른다).
//
// ── 판이 바뀌면 못 읽는다 ──────────────────────────────────────
//   세계가 늘거나 규칙이 바뀌면 옛 세이브가 깨진 상태로 살아난다. 그래서 `VERSION`을 둔다 —
//   맞지 않으면 **조용히 무시**하고 새 판으로 연다. 억지로 이어 붙이는 것보다 낫다.

import { state } from './state.js';

const KEY = 'tradeship:save:v1';
const VERSION = 1;

/** JSON이 모르는 것 — `Set`은 배열로 눕혀 싣는다 */
const SET_KEYS = ['known', 'everOwned'];

export function saveGame(slot = 'auto') {
  try {
    const plain = { ...state };
    for (const k of SET_KEYS) plain[k] = [...(state[k] ?? [])];
    const blob = JSON.stringify({
      version: VERSION,
      when: new Date().toISOString(),
      slot,
      // 목록에 보여줄 것 — 파일을 다 풀지 않고도 "언제 어디까지"를 읽을 수 있게
      head: { day: state.day, at: state.at, gold: state.gold, ship: state.shipKey, origin: state.origin },
      state: plain,
    });
    localStorage.setItem(KEY, blob);
    return { ok: true, bytes: blob.length };
  } catch (e) {
    // 사파리 프라이빗 모드처럼 저장이 막힌 환경이 있다 — 게임을 멈추지는 않는다
    return { ok: false, reason: String(e?.message ?? e) };
  }
}

/** 저장된 판의 머리말 — 없으면 null */
export function savedHead() {
  try {
    const blob = localStorage.getItem(KEY);
    if (!blob) return null;
    const d = JSON.parse(blob);
    if (d.version !== VERSION) return null;
    return { ...d.head, when: d.when };
  } catch { return null; }
}

/** 저장된 판을 `state`에 되돌린다. 성공하면 true. */
export function loadGame() {
  try {
    const blob = localStorage.getItem(KEY);
    if (!blob) return false;
    const d = JSON.parse(blob);
    if (d.version !== VERSION || !d.state) return false;

    /* ★ `state`는 **다른 모듈이 이미 참조를 쥐고 있는 객체**다(`import { state }`).
       새 객체로 갈아 끼우면 그 참조들이 옛 객체를 계속 본다 — 그래서 **속을 비우고 채운다.** */
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, d.state);
    for (const k of SET_KEYS) state[k] = new Set(d.state[k] ?? []);
    return true;
  } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); return true; } catch { return false; }
}

/** 언제 저장하나 — 항구에 들어올 때마다. 바다 위에서는 저장하지 않는다.
    ★ 항해 도중 상태(`sailing`)는 씬의 모듈 변수라 어차피 담기지 않는다.
      **항구가 곧 세이브 포인트**라는 규약이 그 사실과 맞아떨어진다. */
export function autoSave() {
  return saveGame('auto');
}
