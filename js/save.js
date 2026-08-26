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
/* ★ **덮어쓰기 직전의 판 한 장.** 타이틀에서 「어느 바다에서 시작할까」나 갈래를 고르면
   그 자리에서 `resetGame` → `go('port')`가 돌고, 입항 자동저장이 **옛 판을 그 순간 덮는다**
   (`scenes/port.js`). 실측하면 「새로 시작한다」 단추를 누르기 전에 이미 사라져 있었다 —
   완주 플레이 ISSUES #36이 "지워질 자리에 한 걸음 다가간다"고 적은 것보다 한 걸음 더 갔다.
   ⇒ 새 판이 옛 판을 덮기 전에 여기로 한 장 민다. **규칙은 아무것도 안 바뀐다** —
     러너도 사람도 하던 대로 누르면 되고, 실수했을 때만 되돌릴 자리가 생긴다. */
const KEY_PREV = 'tradeship:save:v1:prev';
const VERSION = 1;

/** 슬롯 이름 → localStorage 키 */
const keyOf = (slot) => (slot === 'prev' ? KEY_PREV : KEY);

/** JSON이 모르는 것 — `Set`은 배열로 눕혀 싣는다 */
const SET_KEYS = ['known', 'everOwned'];

/** 나중에 생긴 필드 — 옛 세이브에 없으면 이 값으로 채운다(아래 `loadGame` 주석) */
const FILL_IF_MISSING = {
  consorts: () => ({}),      // 동행 선단(`state.js`) — 옛 판은 데리고 나간 배가 없다
  /* 꺾은 상대의 기록(권역 패권 조건 ③) — 옛 판은 **아무도 꺾지 않은 것으로** 이어진다.
     이력이 비면 그 판의 패권이 한 칸 뒤로 물러날 뿐, 다시 싸우면 채워진다. */
  slain: () => ({}),
  endedNine: () => 0,        // 두 번째 끝 「아홉 바다」 — 옛 판은 아직 못 봤다
  /* 세력 관계(SPEC-factions 1단계) — 옛 판은 **아무도 나를 모르는 것으로** 이어진다.
     0이 기본선이라 비어 있어도 뜻이 통한다(악명은 `infamy`에 그대로 남아 있으므로,
     이어한 판에서도 덮친 값은 `regardOf`가 그대로 읽어 낸다). */
  regard: () => ({}),
  _regardAge: () => 0,
};

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
export function savedHead(slot = 'auto') {
  try {
    const blob = localStorage.getItem(keyOf(slot));
    if (!blob) return null;
    const d = JSON.parse(blob);
    if (d.version !== VERSION) return null;
    return { ...d.head, when: d.when };
  } catch { return null; }
}

/** 저장된 판을 `state`에 되돌린다. 성공하면 true. */
export function loadGame(slot = 'auto') {
  try {
    const blob = localStorage.getItem(keyOf(slot));
    if (!blob) return false;
    const d = JSON.parse(blob);
    if (d.version !== VERSION || !d.state) return false;

    /* ★ `state`는 **다른 모듈이 이미 참조를 쥐고 있는 객체**다(`import { state }`).
       새 객체로 갈아 끼우면 그 참조들이 옛 객체를 계속 본다 — 그래서 **속을 비우고 채운다.** */
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, d.state);
    for (const k of SET_KEYS) state[k] = new Set(d.state[k] ?? []);
    /* ★ **새로 생긴 필드는 옛 세이브에 없다.** VERSION을 올리면 그 판이 통째로 버려지므로,
       *비어 있어도 뜻이 통하는* 컨테이너는 여기서 기본값을 세워 준다.
       (뜻이 통하지 않는 변화 — 규칙이 갈리거나 세계가 바뀌는 것 — 은 그때 VERSION을 올린다.)
       `consorts` 동행 선단: 옛 판은 아무 배도 데리고 나가지 않은 것으로 이어진다. */
    for (const [k, v] of Object.entries(FILL_IF_MISSING)) state[k] ??= v();
    return true;
  } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); return true; } catch { return false; }
}

/** 지금 저장된 판을 **직전 판** 자리로 민다 — 새 판이 그것을 덮기 직전에 부른다.
    저장된 판이 없으면 아무것도 하지 않는다(빈 것을 밀어 옛 직전 판을 지우면 안 된다). */
export function stashSave() {
  try {
    const blob = localStorage.getItem(KEY);
    if (!blob) return false;
    localStorage.setItem(KEY_PREV, blob);
    return true;
  } catch { return false; }
}

/** 직전 판을 되살린다 — 되살린 뒤 그 자리를 비운다(두 번 되돌릴 자리는 두지 않는다). */
export function restoreStashed() {
  try {
    const blob = localStorage.getItem(KEY_PREV);
    if (!blob) return false;
    localStorage.setItem(KEY, blob);
    localStorage.removeItem(KEY_PREV);
    return loadGame('auto');
  } catch { return false; }
}

/** 언제 저장하나 — 항구에 들어올 때마다. 바다 위에서는 저장하지 않는다.
    ★ 항해 도중 상태(`sailing`)는 씬의 모듈 변수라 어차피 담기지 않는다.
      **항구가 곧 세이브 포인트**라는 규약이 그 사실과 맞아떨어진다. */
export function autoSave() {
  return saveGame('auto');
}
