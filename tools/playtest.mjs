// playtest.mjs — 게임을 **실제로 클릭해서** 플레이해 보는 자동 조종 드라이버
//
// ★ 왜 필요한가.
//   지금까지의 검증(`test-rules`·`sim-trade`)은 전부 **규칙을 직접 불러** 확인한다.
//   그래서 "규칙은 맞는데 화면에서 그 단추를 누를 수 없다"를 못 잡는다 —
//   콘텐츠가 아홉 바다로 늘면서 실제로 그런 자리가 생겼다(시장 목록이 77줄이 되어
//   화면 밖으로 밀리고, 원양 항로가 항로 목록에 안 뜨고 하는 것들).
//   이 파일은 사람이 하듯 **DOM 단추를 누르고 캔버스를 클릭한다.**
//
//   `window.__game`(main.js)은 **읽기와 좌표 변환에만** 쓴다. 그쪽으로 상태를 고치면
//   "테스트는 통과하는데 사람이 하면 안 되는" 일이 생긴다.
//
// ── 쓰는 법 ────────────────────────────────────────────────────
//   // 1) 서버를 띄워 둔다:  python serve.py 8155
//   // 2) 짧은 스크립트를 쓴다:
//   import { open } from './tools/playtest.mjs';
//   const g = await open({ port: 8155 });
//   await g.click('출항하기');            // 제목 화면을 닫는다
//   await g.click('술집으로 간다');
//   await g.click('태운다');              // 첫 무리를 태운다
//   await g.back();                       // 항구로
//   await g.buy('grain', 20);
//   await g.sail('genova');               // 지도에서 제노바를 **클릭**한다
//   await g.sellAll();
//   console.log(g.gold, g.day);
//   await g.shot('after-first-run.png');
//   await g.close();
//
// CLI로 간단히 굴려 보려면:  node tools/playtest.mjs --smoke

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.claude', 'skills', 'web-capture');

/** playwright-core — web-capture 스킬이 이미 받아 둔 것을 그대로 쓴다 */
function loadPlaywright() {
  const cands = [
    join(SKILL, '.cache', 'noop.js'),
    join(SKILL, 'scripts', 'noop.js'),
    join(HERE, 'noop.js'),
  ];
  for (const base of cands) {
    try { return createRequire(base)('playwright-core'); } catch { /* 다음 후보 */ }
  }
  const cacheDir = join(SKILL, '.cache');
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  console.error('[playtest] playwright-core 설치(1회)…');
  execSync(`npm i playwright-core --no-save --prefix "${cacheDir}"`, { stdio: 'inherit' });
  return createRequire(join(cacheDir, 'noop.js'))('playwright-core');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 게임을 띄우고 조종기를 돌려준다.
 * @param opts.port     serve.py 포트 (기본 8155)
 * @param opts.headed   true면 창을 띄워 눈으로 본다
 * @param opts.slow     한 동작 사이 대기(ms). 눈으로 볼 때 크게
 * @param opts.outDir   스크린샷 폴더
 */
export async function open(opts = {}) {
  const { port = 8155, headed = false, slow = 0, outDir = join(HERE, '..', '.playtest') } = opts;
  /* 창을 어느 모니터 어디에 띄울까 — `{ x, y, w, h }`.
     ★ 아홉 바다를 나란히 놓고 보려면 창이 겹치면 안 된다. 주지 않으면 예전대로 1400×900 뷰포트다. */
  const pos = opts.pos ?? null;
  const pw = loadPlaywright();

  let browser = null;
  const args = pos ? [`--window-position=${pos.x},${pos.y}`, `--window-size=${pos.w},${pos.h}`] : [];
  /* ★ 회차 22(worktree 전용) — **러너의 크롬에 붙을 수 있게 CDP 포트를 연다.**
     playwright 기본은 파이프라 `--remote-debugging-port`가 없고, 그래서 러너가 죽은 판의
     `state.log`를 사후에 읽을 방법이 아예 없었다(회차 22 GRAND-ISSUES #4 — run 1의 25,000,000닢이
     어디로 갔는지 두 시간을 되짚어야 했다). 환경변수를 준 때만 열린다 — 기본 동작은 그대로다.
       PLAYTEST_RUNNER_CDP=9444 node .playtest/grand-run/grand-run22.mjs
       node tools/playtest-live/play.mjs eval "…"   (PLAYTEST_CDP=9444로 붙는다) */
  const RCDP = Number(process.env.PLAYTEST_RUNNER_CDP || 0);
  if (RCDP > 0) args.push(`--remote-debugging-port=${RCDP}`);
  const viewport = pos ? null : { width: 1400, height: 900 };

  /* ★ **`userDataDir`를 주면 프로필이 남는다 — 세이브가 회차를 건너 산다.**
     `browser.newContext()`는 매번 **빈 프로필**이라 `js/save.js`가 쓰는 `localStorage`가
     드라이버를 다시 띄우는 순간 통째로 사라진다. 완주 회차가 448일차 판을 그렇게 잃었다
     (`.playtest/supremacy/ISSUES.md` #8). 이 캠페인은 설계상 한 세션에 안 끝나므로
     (총 항해일 900~1,100) **이어받기가 없으면 후반은 아무도 못 본다.**
     ⚠️ 프로필 하나를 두 러너가 같이 쓰면 크롬이 잠금으로 죽는다 — 러너마다 다른 디렉터리를 준다. */
  let ctx = null;
  if (opts.userDataDir) {
    if (!existsSync(opts.userDataDir)) mkdirSync(opts.userDataDir, { recursive: true });
    for (const t of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
      try {
        ctx = await pw.chromium.launchPersistentContext(opts.userDataDir,
          { headless: !headed, args, viewport, ...t });
        break;
      } catch { /* 다음 */ }
    }
    if (!ctx) throw new Error('브라우저를 못 띄웠다(persistent) — 다른 러너가 같은 userDataDir를 쓰고 있지 않은지 본다');
    browser = ctx.browser() ?? { close: () => ctx.close() };
  } else {
    for (const t of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
      try { browser = await pw.chromium.launch({ headless: !headed, args, ...t }); break; } catch { /* 다음 */ }
    }
    if (!browser) throw new Error('브라우저를 못 띄웠다 — Chrome을 설치하거나 npx playwright install chromium');
    // pos를 주면 창 크기를 그대로 뷰포트로 쓴다 — 안 그러면 1400×900이 창 밖으로 넘친다
    ctx = await browser.newContext(viewport ? { viewport } : { viewport: null });
  }
  const page = ctx.pages()[0] ?? await ctx.newPage();
  const errors = [];
  /* 실패는 아니지만 **사람이 겪는 불편**을 적어 두는 자리 — 러너가 통과했다고 해서
     그 화면이 사람에게 눌리는 것은 아니다(F-7의 DOM 클릭 폴백이 여기 남는다). */
  const notes = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  /* `query`로 시작 조건을 바꿔 연다 — `{ query: 'start=guangzhou&gold=20000' }`.
     이것이 없어 테스터들이 매번 따로 `page.goto`를 해야 했다. */
  const url = `http://localhost:${port}/index.html${opts.query ? `?${opts.query}` : ''}`;
  await page.goto(url, { waitUntil: 'load' });
  /* ★ `__game`이 안 생기면 **왜 안 생겼는지**를 함께 던진다. 전에는 `TimeoutError`만 나와서
     "브라우저가 안 뜬다"와 "게임 코드가 죽었다"를 구분할 수 없었다 — 모듈 하나가 깨져
     스크립트가 한 줄도 안 돌 때가 그것이다(그때 화면은 검고 콘솔에만 자국이 남는다). */
  try {
    await page.waitForFunction(() => !!window.__game, null, { timeout: 15000 });
  } catch (e) {
    const why = errors.length ? errors.slice(0, 3).join(' | ') : '(콘솔에 아무 자국도 없다)';
    await browser.close().catch(() => {});
    throw new Error(`window.__game이 안 뜬다 — 게임 코드가 죽었을 수 있다: ${why}`);
  }
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  /* ★ **뜨자마자 한 번 짚는다.** 타이틀이 떠 있는 것은 정상이지만(부팅 순서상 늘 그렇다),
     그것을 모르고 클릭부터 하는 러너가 *"단추가 없다"*를 적는다. 여기서 미리 알린다. */
  const titleUp = await page.evaluate(() => {
    const cx = Math.round(window.innerWidth / 2), cy = Math.round(window.innerHeight / 2);
    const hit = document.elementFromPoint(cx, cy);
    return !!(hit && hit.closest && hit.closest('#title-screen'));
  }).catch(() => false);
  if (titleUp) {
    console.warn('[playtest] 타이틀 화면이 판을 덮고 있다(정상) — 클릭은 g.start()로 닫은 뒤에 한다.'
               + ' 덮인 채로는 scene이 port로 보여도 마우스가 안 닿는다.');
  }

  const read = () => page.evaluate(() => ({
    scene: window.__game.scene,
    gold: window.__game.state.gold,
    day: window.__game.state.day,
    at: window.__game.state.at,
    crew: window.__game.state.crew,
    hp: window.__game.state.hp,
    /* ★★★ 회차 23 — **이 한 줄이 두 회차를 먹었다.**
       `maxHp`가 없어서 러너의 `if (s.hp < s.maxHp * 0.85)`가 언제나 `x < NaN` = **false**였고,
       그래서 `repairAndRefit`의 수리 블록과 `phaseTour`의 중간 수리가 **한 번도 도지 않았다**
       (실측: 네 판 전부 `notes[kind=repair]` **0건** · 로그에 `수리(항구)` **0회**).
       회차 22가 「조선소 선원 탭」(#20)과 「씨」(#22)로 진단한 선체 고갈 증상의
       마지막 뚜껍이에 이것이 있었다 — 그 둘을 고쳐도 수리는 여전히 0회였다. */
    maxHp: window.__game.state.maxHp,
    ship: window.__game.state.shipKey,
    cargo: { ...window.__game.state.cargo },
    cargoCap: window.__game.state.cargoCap,
    neighbors: window.__game.neighbors(),
  }));

  const g = {
    page, browser, errors, notes, titleUp,
    /** 제목 화면을 닫는다.
        ★ `click('출항하기')`는 제목 화면과 **항구 사이드패널의 출항 단추 둘 다** 매치해
          뒤에 가려진 쪽을 눌러 실패했다(중동 테스터가 잡았다). 제목 화면만 집는다. */
    async start() {
      /* ★ **first를 누르면 안 된다.** 타이틀 안에는 갈래 고르기(`.sea-pick`)·바다 고르기·
         **이어하기**가 먼저 오고, 저장된 판이 있으면 첫 단추가 '이어하기'라 자동 조종이
         *다른 판*을 이어받는다. 시작 단추는 `.sea-pick`이 아닌 `.btn`이다. */
      const b = page.locator('#title-screen button.btn:not(.sea-pick)').last();
      try { await b.waitFor({ state: 'visible', timeout: 4000 }); } catch { return false; }
      /* ★★ 회차 24 — 하네스 H-1. **Playwright `.click()`은 `scrollIntoView`로 스크롤해서
         눌러 준다 — 사람은 못 누르는데 자동검증은 통과한다.** 타이틀 「출항하기」가
         **1280×720에서도 y=729**(뷰포트 밖)인 채로 **다섯 회차를 통과했다.**
         그래서 누르기 전에 ① `getBoundingClientRect()`가 뷰포트 안인지
         ② `document.elementFromPoint(cx,cy)`가 이 노드(또는 그 자손)를 돌려주는지 —
         **둘 다** 확인한다. 실패하면 **`errors`에 넣어 소리를 낸다**(조용히 넘어가지 않는다 —
         `notes`가 아니라 `errors`인 이유는 이것이 바로 `G-A1`이 다섯 회차 동안 놓친 그 결함이라서다).
         ⚠️ 그래도 **클릭 자체는 그대로 진행한다** — 여기서 러너를 세우면 몇 시간짜리 회차가
         첫 화면에서 끝난다. 사람이 못 누르는 자리라는 **사실만 기록**하고, 화면 고침은
         DES-UI 소유다(GRAND은 게임 코드 0줄). */
      /* ★★ 회차 24-b — DES-UI가 먼저 밟은 구멍: **`scrollIntoView`로 "닿나"를 재면 거짓 양성이 난다.**
         `position:sticky`는 페인트 시점 시각 효과라 브라우저의 스크롤 계산엔 안 잡힌다 — 요소가
         스크롤 없이 이미 뷰포트 "안"이면(그 위를 sticky 형제가 **그림으로만** 덮고 있어도)
         `scrollIntoView`가 스크롤을 안 시킨다. 그래서 "지금 이 스크롤 위치에서 안 닿는다"만으로는
         **영구히 막힌 것(H-1a)**과 **스크롤하면 닿는 것(H-1b — 오조작 위험이지 차단은 아니다)**을
         못 가른다. 판정은 `scrollTop`을 0부터 `max`까지 훑어 **어느 지점에서든** `elementFromPoint`가
         이 노드를 돌려주는지로 한다(DES-UI `_scroll-sweep.mjs`와 같은 방식). */
      const hit = await b.evaluate((el) => {
        const testAt = () => {
          const r = el.getBoundingClientRect();
          const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
          const inViewport = r.width > 0 && r.height > 0
            && r.top >= 0 && r.left >= 0
            && r.bottom <= (window.innerHeight || document.documentElement.clientHeight)
            && r.right <= (window.innerWidth || document.documentElement.clientWidth);
          if (!inViewport) return { inViewport: false, hitsSelf: false, rect: r, atTag: null };
          const atPoint = document.elementFromPoint(cx, cy);
          const hitsSelf = !!atPoint && (atPoint === el || el.contains(atPoint));
          return {
            inViewport, hitsSelf, rect: r,
            atTag: atPoint ? (atPoint.tagName + (atPoint.id ? '#' + atPoint.id : '') + (atPoint.className ? '.' + String(atPoint.className).replace(/\s+/g, '.') : '')) : null,
          };
        };
        // 스크롤 가능한 조상을 찾는다(없으면 지금 자리 하나만 본다 — 타이틀은 대개 이 경로)
        let scroller = null, n = el.parentElement;
        while (n) {
          const cs = getComputedStyle(n);
          if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) { scroller = n; break; }
          n = n.parentElement;
        }
        const fmt = (res) => ({
          inViewport: res.inViewport, hitsSelf: res.hitsSelf, atTag: res.atTag,
          rect: { top: Math.round(res.rect.top), left: Math.round(res.rect.left), bottom: Math.round(res.rect.bottom), right: Math.round(res.rect.right) },
          vw: window.innerWidth, vh: window.innerHeight,
        });
        if (!scroller) {
          const r0 = testAt();
          return { tier: (r0.inViewport && r0.hitsSelf) ? 'ok' : 'H-1a', ...fmt(r0) };
        }
        const prevTop = scroller.scrollTop;
        const max = scroller.scrollHeight - scroller.clientHeight;
        const step = Math.max(10, Math.round(max / 40) || 10);
        let anyOk = false;
        const atRest = testAt();
        for (let s = 0; s <= max; s += step) {
          scroller.scrollTop = s;
          if (testAt().hitsSelf) { anyOk = true; break; }
        }
        scroller.scrollTop = prevTop;   // 원상복구 — 관측이 상태를 바꾸면 안 된다
        const tier = (atRest.inViewport && atRest.hitsSelf) ? 'ok' : (anyOk ? 'H-1b' : 'H-1a');
        return { tier, ...fmt(atRest) };
      }).catch(() => null);
      if (hit && hit.tier !== 'ok') {
        const sev = hit.tier === 'H-1a' ? 'H-1a(치명 — 어떤 스크롤에서도 안 닿는다)' : 'H-1b(경고 — 스크롤하면 닿는다, 오조작 위험)';
        const line = `[${hit.tier}] 「출항하기」 ${sev} — `
          + `rect=${JSON.stringify(hit.rect)} viewport=${hit.vw}x${hit.vh} `
          + `inViewport=${hit.inViewport} elementFromPoint=${hit.atTag ?? '(없음)'}`;
        if (hit.tier === 'H-1a') {
          if (!errors.includes(line)) errors.push(line);   // 진짜 FAIL — 조용히 안 넘어간다
          console.warn('[playtest] ' + line);
        } else {
          if (!notes.includes(line)) notes.push(line);      // 경고 — 러너는 그대로 진행
          console.warn('[playtest] ' + line);
        }
      }
      try { await b.click({ timeout: 4000 }); await sleep(200 + slow); return true; }
      catch { return false; }
    },
    /** 지금 상태를 한 번에 읽는다 */
    async snap() { return read(); },
    get gold() { return read().then((s) => s.gold); },

    /** 화면에 보이는 단추·요소를 **글로 찾아** 누른다. 없으면 false. */
    /** 지금 **무엇이 클릭을 먹고 있나** — 화면 한가운데를 실제로 받는 요소를 본다.
        ★ `#title-screen`은 `position:absolute; inset:0; z-index:50`이라 **판 전체를 덮는다.**
          그런데 `boot()`이 타이틀보다 **먼저** `go('port')`를 부르므로 그 아래에는 이미 항구가
          그려져 있다 — `scene==='port'`도, `state.at`도, `#port-side`·`.btn-sail`도 전부 참이다.
          곧 **러너가 "게임이 시작됐다"고 읽을 근거가 전부 참인데 클릭만 안 먹는다.**
          그 상태에서 나온 실패를 러너들은 *"출항 단추가 없다"*·*"원양이 막혔다"*로 적었다.
        사람은 안 속는다(검은 덮개와 큰 제목이 보인다). **속는 것은 DOM만 읽는 쪽**이라
        여기서 한 번 짚어 준다. 닫는 법은 `g.start()`(타이틀의 단추). */
    async overlay() {
      return page.evaluate(() => {
        const cx = Math.round(window.innerWidth / 2), cy = Math.round(window.innerHeight / 2);
        const hit = document.elementFromPoint(cx, cy);
        const cover = hit && hit.closest ? hit.closest('#title-screen') : null;
        if (!cover) return { up: false };
        const btns = [...cover.querySelectorAll('button')].map((b) => b.textContent.trim());
        return { up: true, id: 'title-screen', z: getComputedStyle(cover).zIndex,
                 head: cover.innerText.split(String.fromCharCode(10))[0], buttons: btns.slice(0, 12) };
      });
    },

    async click(text, { exact = false, timeout = 4000 } = {}) {
      const loc = page.getByText(text, { exact }).first();
      try {
        await loc.waitFor({ state: 'visible', timeout });
        await loc.click({ timeout: 2000 });
        await sleep(120 + slow);
        return true;
      } catch {
        /* ★ **뷰포트 밖이면 여기서 스스로 끌어온다**(UNIMPLEMENTED F-7).
           조선소 선박 목록은 세로 9,000px이 넘고 항구 인물 패널도 y≈985에 있어,
           지금까지는 러너가 `eval "…scrollIntoView()"`를 손으로 먼저 넣어야 했다.
           playwright의 자동 스크롤은 **가려진 것**(sticky 출항 단추 등)에는 안 듣는다 —
           그때는 화면 한가운데로 끌어온 뒤 다시 누른다.
           ★ 실패했을 때만 도는 길이라 기존 러너의 동작은 한 줄도 안 바뀐다. */
        const pulled = await loc.evaluate((e) => {
          e.scrollIntoView({ block: 'center', inline: 'center' });
          return e.getBoundingClientRect().top;
        }).catch(() => null);
        if (pulled != null) {
          await sleep(120);
          try {
            await loc.click({ timeout: 2000 });
            await sleep(120 + slow);
            return true;
          } catch { /* 그래도 안 되면 아래로 */ }
          /* 마지막 수단 — **DOM 클릭**. 좌표를 안 쓰므로 무엇이 위에 덮여 있든 닿는다.
             사람이 못 누르는 자리를 눌러 버릴 수 있으므로 **여기까지 온 것을 기록에 남긴다** —
             남기지 않으면 "사람은 못 누르는데 러너만 통과하는" 화면이 조용히 생긴다. */
          const hit = await loc.evaluate((e) => {
            if (e.disabled) return 'disabled';
            e.click();
            return 'ok';
          }).catch(() => null);
          if (hit === 'ok') {
            const line = `[F-7] "${text}"가 뷰포트 밖이거나 가려져 DOM 클릭으로 눌렀다`
                       + ' — 사람은 스크롤해야 닿는 자리다.';
            /* ⚠️ `errors`가 아니라 `notes`다 — `--smoke`가 `errors`로 exit code를 정하므로,
               **넘어간 것**을 거기 넣으면 편의 장치가 실패로 둔갑한다. */
            if (!notes.includes(line)) notes.push(line);
            console.warn('[playtest] ' + line);
            await sleep(120 + slow);
            return true;
          }
        }
        /* ★ 그래도 실패했으면 **덮개부터 의심한다.** 조용히 false를 돌려주면 러너가
           "그 단추가 없다"고 적고, 그 오독이 회차 하나를 통째로 잡아먹는다. */
        const ov = await g.overlay().catch(() => ({ up: false }));
        if (ov.up) {
          const line = `타이틀 덮개가 클릭을 먹는다 — #title-screen(z:${ov.z})이 판을 덮고 있다.`
                     + ` 그 아래 게임은 이미 돌고 있다(scene은 port로 보인다).`
                     + ` 단추: ${(ov.buttons || []).join(' / ')} · 닫으려면 g.start()`;
          if (!errors.includes(line)) errors.push(line);
          console.warn('[playtest] ' + line);
        }
        return false;
      }
    },

    /** 지금 화면에 그 글이 보이나 */
    async has(text) {
      return page.getByText(text).first().isVisible().catch(() => false);
    },

    /** 화면에 보이는 단추 목록 — 무엇을 누를 수 있는지 모를 때.
        ★ `offsetParent`로 걸렀더니 **모달 단추를 하나도 못 봤다.** `.modal`이 `position:fixed`라
          offsetParent가 null이기 때문이다. 그래서 해상 사건이 뜨면 자동 조종이 조용히 멈췄다
          (중동 테스터가 잡았다). 보임 판정은 `getClientRects()`로 한다. */
    async buttons() {
      return page.$$eval('button', (bs) => bs
        .filter((b) => b.getClientRects().length > 0)
        .map((b) => b.textContent.trim()).filter(Boolean));
    },

    /** 지금 모달이 떠 있나 — 해상 사건·전투 결과·급여 정산이 이걸로 뜬다.
        ★ 항해일지(`#logmodal`)는 `.modal.hidden`으로 **DOM에 상주**하므로 빼야 한다
          (이 프로젝트가 실제로 "전투 결과 모달 없음"을 오판한 함정이다). */
    async modal() {
      return page.evaluate(() => {
        const m = [...document.querySelectorAll('.modal')]
          .find((e) => e.id !== 'logmodal' && e.getClientRects().length > 0);
        if (!m) return null;
        return {
          text: m.innerText.trim().slice(0, 600),
          buttons: [...m.querySelectorAll('button')].map((b) => b.textContent.trim()),
        };
      });
    },

    /** 모달이 떠 있으면 그 안의 단추를 누른다. 이름을 안 주면 첫 단추. */
    async modalClick(name = null) {
      const m = await g.modal();
      if (!m) return false;
      const pick = name ?? m.buttons[0];
      if (!pick) return false;
      const btn = page.locator('.modal:not(#logmodal)').getByRole('button', { name: pick }).first();
      try { await btn.click({ timeout: 2500 }); await sleep(160 + slow); return true; }
      catch { return false; }
    },

    /** 항구 시장에서 사기/팔기 — 그 품목 줄의 단추를 누른다.
        기본 10개 단위이므로 qty는 10의 배수로 눌린다(Shift=전량은 `sellAll`). */
    async trade(goodName, kind = '사기', times = 1) {
      for (let i = 0; i < times; i++) {
        const row = page.locator('tr', { hasText: goodName }).first();
        const btn = row.getByRole('button', { name: kind }).first();
        try {
          await btn.waitFor({ state: 'visible', timeout: 2500 });
          if (await btn.isDisabled()) return false;
          await btn.click({ timeout: 2000 });
          await sleep(90 + slow);
        } catch { return false; }
      }
      return true;
    },

    /** 실은 것을 전부 판다.
        ★ 처음에는 화면의 **첫 번째** '팔기' 단추를 눌렀는데, 그 줄은 대개 보유 0이라
          단추가 꺼져 있어 곧바로 그만두었다 — 제노바에 곡물 일곱 개를 싣고 가서
          하나도 못 팔고 돌아왔다(창을 띄워 클릭해 보고서야 드러났다).
          **켜져 있는 '팔기'를 찾아** 누른다. Shift는 전량이다. */
    async sellAll() {
      for (let i = 0; i < 40; i++) {
        const btns = page.getByRole('button', { name: '팔기' });
        const n = await btns.count().catch(() => 0);
        let clicked = false;
        for (let k = 0; k < n; k++) {
          const b = btns.nth(k);
          if (await b.isDisabled().catch(() => true)) continue;
          await b.click({ modifiers: ['Shift'], timeout: 2000 }).catch(() => {});
          await sleep(90 + slow);
          clicked = true;
          break;
        }
        if (!clicked) break;
      }
      return read();
    },

    /** 그 품목을 살 수 있는 만큼 산다(Shift = 가능한 최대) */
    async buyMax(goodName) {
      const row = page.locator('tr', { hasText: goodName }).first();
      const btn = row.getByRole('button', { name: '사기' }).first();
      try {
        if (await btn.isDisabled()) return false;
        await btn.click({ modifiers: ['Shift'], timeout: 2000 });
        await sleep(110 + slow);
        return true;
      } catch { return false; }
    },

    /** 지도에서 그 항구를 **클릭해** 항해한다. 지도 씬이 아니면 먼저 '출항' 한다.
        `name`(그 도시의 한글 이름)을 주면 캔버스 클릭이 안 통할 때 **사이드 카드**로 간다.

        ★ 원양 항로(`OCEAN_LANES`)는 지도에 **선으로 안 그려진다** — 권역마다 좌표계가 따로라
          그을 좌표가 없기 때문이다(`map.js: oceanRows` 주석). 그래서 캔버스 좌표 클릭으로는
          영원히 못 탄다. 실제로 원양 라운드가 여덟 번 전부 "미도착·1일차 그대로"를 냈다.
          사람은 사이드패널의 `.route-row` 카드를 눌러 간다 — 하네스도 그 길을 알아야 한다. */
    async sail(cityId, { wait = 12000, front = true, name = null } = {}) {
      let s = await read();
      if (s.scene !== 'map') {
        /* ★ **글자로 '출항'을 찾으면 안 된다.** 제목 화면(`#title-screen`)이 닫힌 뒤에도 DOM에
           남아 있어 그 안의 '출항하기'가 먼저 잡히고, 누르면 아무 일도 안 일어난다 —
           `click`은 true를 돌려주는데 씬은 그대로라 "지도로 못 갔다"만 반복된다.
           실측에서 이것 하나로 한 배치의 미도착이 68건까지 갔다.
           항구의 출항 단추는 `.btn-sail`이다(`port.js`) — 그것을 직접 누른다. */
        const sailBtn = page.locator('#port-side .btn-sail, .btn-sail').last();
        let opened = false;
        try { await sailBtn.click({ timeout: 2500 }); opened = true; } catch { /* 아래 폴백 */ }
        if (!opened && !(await g.click('출항하기'))) {
          /* ★ **"단추가 없다"고 적지 마라 — 덮개일 수 있다.** 실제로 완주 러너가 이 문장을
             *"원양이 막혔다"*로 오독했다(supremacy ISSUES #35). 이유를 갈라서 돌려준다. */
          const ov = await g.overlay().catch(() => ({ up: false }));
          if (ov.up) return { ok: false, why: `타이틀 덮개가 클릭을 먹는다 — #title-screen(z:${ov.z})이 판을 덮고 있다. g.start()로 닫아라`, overlay: ov };
          return { ok: false, why: '출항 단추가 없다' };
        }
        await sleep(300 + slow);
        s = await read();
        if (s.scene !== 'map') return { ok: false, why: '지도로 못 갔다' };
      }
      if (!s.neighbors.includes(cityId)) {
        return { ok: false, why: `직항이 없다 (이웃: ${s.neighbors.join(',')})` };
      }
      /** 사이드 카드로 간다 — 이름칸(.rn)이 정확히 그 도시인 행을 누른다.
          '마카오'가 '마카사르'를 물지 않게 정확 일치로 찾는다. */
      const clickCard = async () => {
        if (!name) return false;
        /* ★ **`^이름$`으로 잡으면 처음 가는 항구를 통째로 놓친다.** `map.js`가 아직 안 가 본
           항구의 이름칸에 배지를 붙여 `.rn`의 텍스트가 **"의주 초행"**이 되기 때문이다
           (`state.known.has(id)`가 거짓일 때). 러너가 도는 항구는 **거의 전부 초행**이라
           좌표 클릭이 실패하는 자리(육로·화면 가장자리)에서 폴백이 함께 죽었다 —
           마포→의주 · 등주→톈진 · 오사카→쓰루가가 여러 갈래에서 되풀이해 타임아웃 났다.
           그래서 **이름으로 시작하고 그 뒤가 끝이거나 공백**인 것까지 받는다.
           '마카오'가 '마카사르'를 물지 않게 뒤에 글자가 바로 붙는 것은 여전히 거른다. */
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const row = page.locator('.route-row').filter({
          has: page.locator('.rn', { hasText: new RegExp(`^${esc}(\\s|$)`) }),
        }).first();
        try { await row.click({ timeout: 2500 }); await sleep(300 + slow); return true; }
        catch { return false; }
      };

      const pos = await page.evaluate((id) => window.__game.cityScreenPos(id), cityId);
      if (!pos) {
        // 원양 항로처럼 지도에 없는 곳 — 카드로 간다
        if (!(await clickCard())) return { ok: false, why: '화면 좌표도 사이드 카드도 못 찾았다' };
      }
      /* ★ 창이 다른 창에 **가리면** `requestAnimationFrame`이 멈춰 항해 연출이 진행되지 않는다.
         여러 테스터가 헤디드 브라우저를 함께 띄우면 반드시 걸린다(중동 테스터가 잡았다).
         ★ 다만 아홉 창을 **동시에** 굴릴 때는 이것이 해가 된다 — 매 항해마다 아홉이 서로
           앞으로 튀어나와 포커스를 뺏는다. 창을 겹치지 않게 깔았다면 가려질 일이 없으므로
           `front:false`로 끈다(`nine-seas.mjs`가 그렇게 쓴다). */
      if (front) await page.bringToFront().catch(() => {});
      if (pos) {
        await page.mouse.click(pos.x, pos.y);
        /* 좌표를 눌렀는데 배가 안 떴으면(항해 카드가 안 보이면) 카드로 한 번 더 시도한다.
           도시가 화면 가장자리에 걸리거나 다른 라벨에 가리면 이 일이 난다. */
        await sleep(400);
        const sailing = await page.locator('#map-side').getByText('항해 중').first()
          .isVisible().catch(() => false);
        if (!sailing) await clickCard();
      }

      const events = [];
      const t0 = Date.now();
      while (Date.now() - t0 < wait) {
        await sleep(250);
        const n = await read();
        if (n.at === cityId) return { ok: true, events, ...n };
        if (n.scene === 'battle') return { ok: true, battle: true, events, ...n };
        // 해상 사건 모달 — 무엇이 떴는지 적어 두고 넘긴다
        const m = await g.modal();
        if (m) {
          events.push(m.text.split('\n')[0]);
          /* ★ 회차 22(worktree 전용) — **여기가 조우의 진짜 입구다.**
             이름을 안 주면 `modalClick`이 `buttons[0]`를 누르는데, 조우 모달
             「돛이 보인다」의 첫 단추는 **「전투 준비」**다(`scenes/map.js:884`).
             그러면 12% 배삯으로 끝났을 자리가 전투가 되고, 전투 안 도주(`fleeOdds`)는
             접근당할수록 무너져(0.53→0.13) 실패하면 **금고의 50%**를 잃는다
             (`scenes/battle.js:589`). 실측: run 1이 조우 17회로 25,000,000 → 12늢.
             ⇒ 「…도주」 단추가 있으면 그것을 고른다. 없으면 지금까지와 같다. */
          /* ★ 회차 22-b — **게임이 이미 판정을 내려 준다.** `foeVersusLine`이
             상대가 세면 「이쪽이 밀린다」를, 지면 배를 잃을 상황이면 「선체가 바닥이다」를
             모달 본문에 적는다(`scenes/map.js:420`). 그 말이 있으면 도주(금고 12%),
             없으면 싸운다 — 이 저장소의 원칙 「사람은 이길 수 있는 상대만 싸운다」 그대로다.
             도주만 고르면 25,000,000닢이 751일에 0이 됐다(run 3 · gold-watch.log). */
          const flee = (m.buttons ?? []).find((b) => /도주/.test(b));
          const outmatched = /이쪽이 밀린다|선체가 바닥이다/.test(m.text ?? '');
          /* ★ 회차 22 — **사냥 구간에서는 밀려도 싸운다.**
             패권 ③은 「등급 5 격파」인데 등급 5는 hp 360·포 30·선원 130이라 게임이 언제나
             *"이쪽이 밀린다"*고 답한다. 「사람은 이길 수 있는 상대만 싸운다」 정책을 그대로 두면
             **조건 ③이 요구하는 싸움만 골라서 피하게 된다** — 실측: 전투 55건의 등급이
             1~4뿐이고 5는 0건, 그런데 `foeOdds()`는 등급 5가 **25%**다(만나서 다 도망친 것).
             그래서 러너가 사냥 중임을 알리면(`__r22_hunt`) 이 회피를 끈다. */
          const hunting = await page.evaluate(() => !!window.__r22_hunt).catch(() => false);
          const wantFight = !!flee && (hunting || !outmatched);
          if (wantFight) await page.evaluate(() => { window.__r22_fight = true; }).catch(() => {});
          if (!(await g.modalClick(wantFight ? null : (flee ?? null)))) break;
        }
      }
      return { ok: false, why: '시간 안에 못 닿았다', events, ...(await read()) };
    },

    /** 씬 이동 — 항구의 큰 단추들 */
    async goTavern() { return g.click('술집으로 간다'); },
    async goShipyard() { return g.click('조선소로 간다'); },
    /** 씬에서 항구로 — 씬마다 단추 글이 다르다(술집은 '나가기') */
    async back() {
      for (const t of ['나가기', '항구로 돌아간다', '돌아간다', '항구로']) {
        if (await g.click(t)) return true;
      }
      return false;
    },

    /* ── 화면을 읽는다 ─────────────────────────────────────────
       ★ 정합성 검증은 **상태가 아니라 화면**을 봐야 뜻이 있다. 근거 JSON이 "베네치아는
         유리세공 산지"라고 적어 두었어도, 화면의 그 줄에 '산지' 딱지가 안 붙어 있으면
         플레이어에게는 없는 사실이다. 아래 함수들은 사람이 보는 것을 그대로 긁는다. */

    /** 항구 시장 목록 — [{name, price, tag, has}] */
    async market() {
      return page.$$eval('table.market tbody tr', (rows) => rows.map((tr) => {
        const tds = tr.querySelectorAll('td');
        const nameEl = tr.querySelector('.gname span');
        const tagEl = tr.querySelector('.tag');
        return {
          name: nameEl?.textContent.trim() ?? '',
          price: Number((tds[1]?.textContent ?? '').replace(/[^0-9]/g, '')) || 0,
          tag: tagEl ? tagEl.textContent.trim() : null,     // '산지' | '수요' | null
          has: Number((tds[2]?.textContent ?? '').replace(/[^0-9]/g, '')) || 0,
        };
      }));
    },

    /** 조선소에 걸린 배 — 씬을 열어 두고 부른다.
        ★ 셀렉터가 실제 DOM과 어긋나 **아홉 바다 전부에서 "배 목록 0줄"**이 나왔다.
          조선소가 그리는 것은 `#yard-panel` 안의 `.yard-ship`이다(`js/scenes/shipyard.js`).
          화면에는 93척이 떠 있는데 측정기만 못 본 것이라, 게임 결함으로 오진할 뻔했다. */
    async shipyard() {
      return page.$$eval('#yard-panel, #port-side, #yard, body', (roots) => {
        const out = [];
        const seen = new Set();
        for (const root of roots) {
          for (const row of root.querySelectorAll('.yard-ship, .ship-row, .yard-row, tr')) {
            const t = row.textContent.replace(/\s+/g, ' ').trim();
            if (!t || t.length > 160 || seen.has(t)) continue;
            if (!/닢/.test(t)) continue;
            seen.add(t); out.push(t);
          }
        }
        return out;
      });
    },

    /** 술집 자리 — 무리 이름·인원·값이 담긴 줄 그대로.
        ★ 술집이 그리는 것은 `#tavern-panel` 안의 `.tav-card`다(`js/scenes/tavern.js`).
          조선소와 같은 이유로 여기도 늘 0줄이었다. */
    async tavern() {
      return page.$$eval('#tavern-panel, #tav-list, #port-side, body', (roots) => {
        const out = [];
        const seen = new Set();
        for (const root of roots) {
          for (const row of root.querySelectorAll('.tav-card, .crew-row, .band, .ctr-sub, tr')) {
            const t = row.textContent.replace(/\s+/g, ' ').trim();
            if (!t || t.length > 160 || seen.has(t)) continue;
            seen.add(t); out.push(t);
          }
        }
        return out;
      });
    },

    /** 지금 화면의 사이드패널 글 전체 — 무엇이 보이는지 훑을 때 */
    async sideText() {
      return page.$eval('#port-side', (e) => e.innerText).catch(() => '');
    },

    async shot(name) {
      const p = join(outDir, name.endsWith('.png') ? name : `${name}.png`);
      await page.screenshot({ path: p, fullPage: false });
      return p;
    },

    async close() { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); },
  };
  return g;
}

/* ── CLI: 한 판 짧게 굴려 본다 ─────────────────────────────────
   "게임이 실제로 손에 잡히는가"를 가장 싸게 확인하는 길. */
if (process.argv.includes('--smoke')) {
  const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 8155;
  const g = await open({ port, headed: process.argv.includes('--headed') });
  const log = [];
  const step = async (what, fn) => {
    const ok = await fn();
    const s = await g.snap();
    log.push(`${ok === false ? 'FAIL' : 'ok  '}  ${what.padEnd(24)} `
      + `${s.scene.padEnd(8)} ${s.at.padEnd(10)} 금화 ${String(s.gold).padStart(5)} 선원 ${s.crew}`);
    return ok;
  };

  await step('제목 화면 닫기', () => g.click('출항하기'));
  await step('술집으로', () => g.goTavern());
  await step('선원 등용', async () => {
    for (let i = 0; i < 3; i++) await g.click('태운다');
    return true;
  });
  await step('항구로', () => g.back());
  /* ★ 한 번만 누른다. 매매는 **10개 단위**라 시작 자금(선원을 태우고 148닢)으로는
     한 번에 금고가 거의 빈다 — 두 번 누르면 두 번째 단추가 `disabled`라 늘 FAIL이었다.
     회귀 테스트가 항상 실패하면 신호가 죽는다. */
  await step('곡물 매입', () => g.trade('곡물', '사기', 1));
  const s0 = await g.snap();
  const to = s0.neighbors.find((n) => n !== s0.at);
  await step(`${to}로 항해`, async () => (await g.sail(to)).ok);
  await step('전량 매각', () => g.sellAll());
  await g.shot('smoke.png');

  console.log('\n=== 자동 조종 한 판 ===');
  for (const l of log) console.log('  ' + l);
  if (g.errors.length) {
    console.log(`\n브라우저 오류 ${g.errors.length}건:`);
    for (const e of g.errors.slice(0, 5)) console.log('  ' + e.slice(0, 160));
  } else {
    console.log('\n브라우저 오류 없음.');
  }
  await g.close();
  process.exit(g.errors.length ? 1 : 0);
}
