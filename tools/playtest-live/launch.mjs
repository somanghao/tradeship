// 진짜 크롬 창을 띄우고 CDP 포트(9222)를 열어 둔 채 대기한다.
//
//   python serve.py 8891                     (먼저)
//   node tools/playtest-live/launch.mjs           (백그라운드로 띄워 둘 것 — 이 프로세스가 살아 있어야 창이 산다)
//   node tools/playtest-live/play.mjs shot        (다른 셸에서 조종)
//
// 콘솔 로그와 페이지 오류를 그대로 흘려 준다 — 검은 화면·모듈 링크 실패를 여기서 본다.
import { playwright } from './pw.mjs';

const { chromium } = playwright();
const URL = process.argv[2] || 'http://localhost:8891/index.html';

const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: ['--remote-debugging-port=9222', '--window-size=1400,940', '--window-position=240,40'],
});
const ctx = await browser.newContext({ viewport: null });   // 창 크기를 그대로 뷰포트로
const page = await ctx.newPage();
page.on('console', m => console.log(`[console:${m.type()}] ${m.text()}`));
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(URL);
console.log(`[launch] ${URL} — CDP on 9222`);
await new Promise(() => {});   // 창을 살려 둔다
