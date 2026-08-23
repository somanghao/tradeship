// 진짜 크롬 창을 띄우고 CDP 포트(9222)를 열어 둔 채 대기한다.
//
//   python serve.py 8891                     (먼저)
//   node tools/playtest-live/launch.mjs           (백그라운드로 띄워 둘 것 — 이 프로세스가 살아 있어야 창이 산다)
//   node tools/playtest-live/play.mjs shot        (다른 셸에서 조종)
//
// 콘솔 로그와 페이지 오류를 그대로 흘려 준다 — 검은 화면·모듈 링크 실패를 여기서 본다.
import { playwright } from './pw.mjs';

const { chromium } = playwright();
/* 배속을 주소에 실어 열 수 있다 — `?speed=8`을 직접 붙이거나 `PLAYTEST_SPEED=8`을 준다.
   ★ 배속은 **연출과 대기시간만** 줄인다(js/speed.js). 기본은 1×라 아무 영향이 없다. */
let URL = process.argv[2] || 'http://localhost:8891/index.html';
const sp = Number(process.env.PLAYTEST_SPEED);
if (Number.isFinite(sp) && sp > 1 && !/[?&]speed=/.test(URL)) {
  URL += (URL.includes('?') ? '&' : '?') + `speed=${Math.min(50, sp)}`;
}

/* ★ **창을 여럿 띄워 따로 조종한다** — CDP 포트를 `PLAYTEST_CDP`로 가른다(기본 9222).
   갈래 다섯을 서로 다른 사람이 동시에 굴리려면 창마다 제 포트가 있어야 한다:
   포트가 하나면 `play.mjs`가 늘 같은 창에 붙어 다섯이 한 판을 서로 밟는다.
   창 크기도 `PLAYTEST_WINSIZE`로 줄여 2번 모니터에 여럿 놓는다. */
const CDP = Number(process.env.PLAYTEST_CDP || 9222);
const WINSIZE = process.env.PLAYTEST_WINSIZE || '1400,940';

const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  /* 창 자리는 `PLAYTEST_WINPOS="0,1080"`으로 옮길 수 있다 — **2번 모니터**가 (0,1080)이다
     (러너 셋의 `MON2`와 같은 값). 기본값은 지금까지와 같다. */
  args: [`--remote-debugging-port=${CDP}`, `--window-size=${WINSIZE}`,
         `--window-position=${process.env.PLAYTEST_WINPOS || '240,40'}`],
});
const ctx = await browser.newContext({ viewport: null });   // 창 크기를 그대로 뷰포트로
const page = await ctx.newPage();
page.on('console', m => console.log(`[console:${m.type()}] ${m.text()}`));
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(URL);
console.log(`[launch] ${URL} — CDP on ${CDP} @ ${process.env.PLAYTEST_WINPOS || '240,40'}`);
await new Promise(() => {});   // 창을 살려 둔다
