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

/** 조사를 골라 준다. `${name}${josa(name, '이/가')}`
    받침 있는 쪽을 앞에 적는다 — '이/가' · '을/를' · '은/는' · '과/와' · '으로/로' · '아/야' */
export function josa(word, pair) {
  const [hasJong, isRieul] = batchim(word);
  const [withJong, without] = pair.split('/');
  // '으로'만 예외다 — ㄹ 받침은 받침이 없는 것처럼 '로'를 쓴다(‘서울로’)
  if (withJong === '으로' && isRieul) return without;
  return hasJong ? withJong : without;
}
