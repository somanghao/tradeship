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
  for (const t of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { browser = await pw.chromium.launch({ headless: !headed, args, ...t }); break; } catch { /* 다음 */ }
  }
  if (!browser) throw new Error('브라우저를 못 띄웠다 — Chrome을 설치하거나 npx playwright install chromium');

  // pos를 주면 창 크기를 그대로 뷰포트로 쓴다 — 안 그러면 1400×900이 창 밖으로 넘친다
  const ctx = await browser.newContext(pos ? { viewport: null } : { viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
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

  const read = () => page.evaluate(() => ({
    scene: window.__game.scene,
    gold: window.__game.state.gold,
    day: window.__game.state.day,
    at: window.__game.state.at,
    crew: window.__game.state.crew,
    hp: window.__game.state.hp,
    ship: window.__game.state.shipKey,
    cargo: { ...window.__game.state.cargo },
    cargoCap: window.__game.state.cargoCap,
    neighbors: window.__game.neighbors(),
  }));

  const g = {
    page, browser, errors,
    /** 제목 화면을 닫는다.
        ★ `click('출항하기')`는 제목 화면과 **항구 사이드패널의 출항 단추 둘 다** 매치해
          뒤에 가려진 쪽을 눌러 실패했다(중동 테스터가 잡았다). 제목 화면만 집는다. */
    async start() {
      const b = page.locator('#title-screen button').first();
      try { await b.click({ timeout: 4000 }); await sleep(200 + slow); return true; }
      catch { return false; }
    },
    /** 지금 상태를 한 번에 읽는다 */
    async snap() { return read(); },
    get gold() { return read().then((s) => s.gold); },

    /** 화면에 보이는 단추·요소를 **글로 찾아** 누른다. 없으면 false. */
    async click(text, { exact = false, timeout = 4000 } = {}) {
      const loc = page.getByText(text, { exact }).first();
      try {
        await loc.waitFor({ state: 'visible', timeout });
        await loc.click({ timeout: 2000 });
        await sleep(120 + slow);
        return true;
      } catch { return false; }
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
        if (!opened && !(await g.click('출항하기'))) return { ok: false, why: '출항 단추가 없다' };
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
        const row = page.locator('.route-row').filter({
          has: page.locator('.rn', { hasText: new RegExp(`^${name}$`) }),
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
          if (!(await g.modalClick())) break;
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

    async close() { await browser.close(); },
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
