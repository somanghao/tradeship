/* 조사 — 받침을 보고 `이/가`·`을/를`을 고른다.

   ★ 왜 아무것도 import하지 않는 leaf 모듈인가.
     `이(가)`·`을(를)`는 이름이 무엇이든 상관없이 찍어 내는 표기이고, 그 순간 문장은
     사람이 쓴 것이 아니라 코드가 뱉은 것이 된다. 이 게임은 한 줄에 인물이 서는 것을
     노린 물건이라 그 자국이 유난히 크게 남는다
     ("오루치 레이스호이(가) 바람을 타고 다가온다"를 실제로 만났다).
     처음에는 `ui.js`에 뒀는데, 문장을 만드는 곳이 씬만이 아니었다 — `state.js`도
     `pushLog`로 문장을 쓰고 모듈 방향(data → state → world → scenes)상 화면 헬퍼를
     부를 수 없어 조사 표기가 그대로 남아 있었다. 아무것도 import하지 않는 leaf로
     내려 두면 어느 층에서든 부를 수 있고 방향도 깨지지 않는다.
     (`ui.js`는 이것을 그대로 re-export하므로 기존 `from '../ui.js'` 경로는 그대로 쓴다.) */

/** 마지막 글자에 받침이 있나. [있나, ㄹ받침인가] */
function batchim(word) {
  const s = String(word ?? '').replace(/[\s"'”’)\]』」》>.··]+$/u, '');
  const ch = s.at(-1);
  if (!ch) return [false, false];
  const code = ch.codePointAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {          // 한글 음절
    const j = (code - 0xac00) % 28;
    return [j !== 0, j === 8];
  }
  if (ch >= '0' && ch <= '9') {                    // 숫자는 읽는 소리로 (1 일 · 3 삼 · 6 육 …)
    const j = [true, true, false, true, false, false, true, true, true, false][+ch];
    return [j, ch === '1' || ch === '7' || ch === '8'];
  }
  // 영문·기호는 읽는 법이 갈린다 — 없는 쪽으로 둔다(‘도자기A를’이 ‘도자기A을’보다 덜 튄다)
  return [false, false];
}

/* ── 짝이 아닌 인자를 받았을 때 ────────────────────────────────
   ★ **`undefined`가 화면에 찍힌 자리다**(GRAND #18). `josa(names, '의')`처럼 `/`가 없는 것을
     주면 `without`가 `undefined`가 되고, 받침 **없는** 이름으로 끝날 때만 그대로 찍힌다 —
     `페락 · 조호르 · 잠비undefined 시세가 열렸다.` 받침이 있으면 멀쩡하니 **데이터에 따라
     숨는 버그**였고, 실제로 믈라카 입항 로그에서 한 회차 만에 처음 드러났다.
   ⇒ 이제 두 가지를 함께 한다: ① 화면에는 **준 것을 그대로** 쓴다(형태가 하나뿐인 '의'·'도'는
     그것이 정답이다) ② **콘솔에 한 번 소리를 낸다** — 진짜 오타(`'이가'`)를 조용히 삼키면
     같은 종류의 버그가 다시 숨는다. 「조용한 실패가 가장 비싸다」. */
const warned = new Set();
function unpaired(pair) {
  if (!warned.has(pair)) {
    warned.add(pair);
    console.warn(`[josa] '${pair}'에는 '/'가 없다 — 두 형태를 적어라(예: '이/가'). 그대로 쓴다.`);
  }
  return pair;
}

/** 조사를 골라 준다. `${name}${josa(name, '이/가')}`
    받침 있는 쪽을 앞에 적는다 — '이/가' · '을/를' · '은/는' · '과/와' · '으로/로' · '아/야'
    ⚠️ **반드시 두 형태를 `/`로 적는다.** 하나만 주면 그것을 그대로 쓰고 콘솔에 경고를 남긴다. */
export function josa(word, pair) {
  const p = String(pair ?? '');
  if (!p.includes('/')) return unpaired(p);
  const [hasJong, isRieul] = batchim(word);
  const [withJong, without] = p.split('/');
  // '으로'만 예외다 — ㄹ 받침은 받침이 없는 것처럼 '로'를 쓴다(‘서울로’)
  if (withJong === '으로' && isRieul) return without;
  return hasJong ? withJong : without;
}
