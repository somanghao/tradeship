// 사람 속도로 게임을 눌러 보는 조종기 — 떠 있는 크롬에 CDP로 붙었다 뗀다.
//
//   node tools/playtest-live/play.mjs shot            캡쳐(.out/shot.png) + 누를 수 있는 것 목록
//   node tools/playtest-live/play.mjs ui [검색어]      누를 수 있는 것 목록만 (검색어를 주면 그것만 전부)
//   node tools/playtest-live/play.mjs ui --full       접지 않고 전부
//   node tools/playtest-live/play.mjs click "출항하기"  그 단추로 커서를 밀어 실제로 누른다
//   node tools/playtest-live/play.mjs click "후추 · 사기"   같은 글자가 여럿이면 문맥을 붙여 고른다
//   node tools/playtest-live/play.mjs clickxy 375 242 [n]
//   node tools/playtest-live/play.mjs eval "<js>"     페이지에서 평가(게임 상태 조회·조작)
//   node tools/playtest-live/play.mjs wait 6          기다렸다가 캡쳐
//   node tools/playtest-live/play.mjs speed [n]       떠 있는 창의 연출 배속을 바꾼다(안 주면 지금 값)
//   node tools/playtest-live/play.mjs state           __game.snapshot() — 판정에 필요한 것만
//
// 먼저 `node tools/playtest-live/launch.mjs`로 창을 띄워 둔다. 자세한 것은 wiki/playtest-harness.md.
//
// ── 빠른 모드 (옵트인) ─────────────────────────────────────────
//   node tools/playtest-live/play.mjs --fast=8 sail 마카오
//   PLAYTEST_SPEED=8 node tools/playtest-live/play.mjs click "곡물 · 사기"
//
// ★ **기본값은 지금 그대로 사람 속도다**(사용자 지침 — "검증은 사람 속도로, 보이게").
//   `--fast=N`을 준 때만 커서 이동·겨냥·결과 대기를 N으로 나누고, **게임 쪽 연출도 함께**
//   N배로 올린다(`__game.speed(N)` → `js/speed.js`). 둘 중 하나만 올리면 소용이 없다 —
//   하네스만 빠르면 포격전 `disabled`에 막히고(harness §3), 게임만 빠르면 하네스가 놀고 있다.
//   빠른 모드에서는 고정 대기 대신 `__game.waitIdle()`로 **연출이 실제로 끝난 것**을 본다.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playwright } from './pw.mjs';

const { chromium } = playwright();
const HERE = dirname(fileURLToPath(import.meta.url));
/* ★ 창이 여럿일 때 캡쳐가 서로를 덮어쓴다 — `PLAYTEST_SLOT`으로 폴더를 가른다.
   슬롯을 안 주면 지금까지와 완전히 같은 자리(`.out/shot.png`)다. */
const SLOT = process.env.PLAYTEST_SLOT || '';
const OUT = SLOT ? join(HERE, '.out', SLOT) : join(HERE, '.out');
mkdirSync(OUT, { recursive: true });
const SHOT = join(OUT, 'shot.png');

/* ── 배속 ──────────────────────────────────────────────────────
   `--fast=N`(또는 환경변수 `PLAYTEST_SPEED`)이 없으면 1 — 즉 **지금까지와 완전히 같다.** */
const argvAll = process.argv.slice(2);
const fastArg = argvAll.find(a => /^--fast(=|$)/.test(a));
const argv = argvAll.filter(a => a !== fastArg);
const FAST = (() => {
  const raw = fastArg ? (fastArg.split('=')[1] ?? '8') : process.env.PLAYTEST_SPEED;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(50, Math.max(1, n)) : 1;
})();

const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** 사람 속도로 뜸을 들이는 자리. **여기만** 배속으로 나눈다 —
    `rnd`는 픽셀 오프셋에도 쓰이므로 그것을 나누면 커서가 엉뚱한 데서 출발한다. */
const pause = (a, b) => sleep(rnd(a, b) / FAST);

/* CDP 포트와 서버 포트를 환경변수로 가른다 — 창 다섯을 동시에 조종하기 위해서다.
   `PLAYTEST_CDP`는 `launch.mjs`에 준 것과 같은 값이어야 한다. */
const CDP = Number(process.env.PLAYTEST_CDP || 9222);
const WEB = Number(process.env.PLAYTEST_PORT || 8891);
const browser = await chromium.connectOverCDP(`http://localhost:${CDP}`);
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes(`localhost:${WEB}`)) || ctx.pages()[0];

/** 게임 쪽 연출도 같이 올린다 — 안 올리면 하네스만 빨라져 `disabled`에 막힌다. */
async function syncSpeed() {
  if (FAST === 1) return;
  const got = await page.evaluate(n => (window.__game?.speed ? window.__game.speed(n) : null), FAST)
    .catch(() => null);
  if (got == null) console.log(`[fast] 하네스만 ${FAST}× — 페이지에 __game.speed가 없다(낡은 탭?)`);
}

/** 연출이 끝날 때까지. 빠른 모드에서만 쓴다 — 기본 경로는 지금 그대로 고정 대기다. */
async function settle(ms = 12000) {
  const ok = await page.evaluate(
    t => (window.__game?.waitIdle ? window.__game.waitIdle({ timeout: t }) : true), ms,
  ).catch(() => true);
  return ok;
}

await syncSpeed();

/* 화면에 보이는 손 커서 — 실제 클릭이 어디로 가는지 사람이 눈으로 따라갈 수 있게.
   ★ OS 마우스(SetCursorPos)는 이 환경에서 페이지에 닿지 않는다(wiki/playtest-harness.md §3).
     그래서 입력은 CDP로 넣고, "커서가 움직이는 그림"만 페이지 안에 그린다. */
async function ensureCursor() {
  await page.evaluate(() => {
    const CUR_V = '2';                                  // 모양을 고치면 올린다 — 떠 있는 창의 낡은 커서를 갈아 끼운다
    const old = document.getElementById('__cur');
    if (old?.dataset.v === CUR_V) return;
    old?.remove();
    document.getElementById('__ring')?.remove();
    /* 유저테스트 녹화처럼 **반투명 원**으로 그린다 — 화살표는 촉 끝이 어디를 가리키는지 눈으로 좇기 어렵다. */
    const c = document.createElement('div');
    c.id = '__cur';
    c.dataset.v = CUR_V;
    c.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;'
      + 'background:rgba(255,212,121,.30);border:2px solid rgba(255,212,121,.92);box-shadow:0 0 12px rgba(0,0,0,.45);'
      + 'z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
    c.innerHTML = '<div style="position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff"></div>';
    document.body.appendChild(c);
    const r = document.createElement('div');
    r.id = '__ring';
    r.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border:3px solid #ffd479;border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0;transform:translate(-100px,-100px) scale(.4)';
    document.body.appendChild(r);
    window.__curAt = (x, y) => { document.getElementById('__cur').style.transform = `translate(${x}px,${y}px)`; };
    window.__curClick = (x, y) => {
      const ring = document.getElementById('__ring');
      ring.style.transition = 'none';
      ring.style.transform = `translate(${x}px,${y}px) scale(.4)`;
      ring.style.opacity = '1';
      requestAnimationFrame(() => {
        ring.style.transition = 'transform .34s ease-out, opacity .34s ease-out';
        ring.style.transform = `translate(${x}px,${y}px) scale(1.5)`;
        ring.style.opacity = '0';
      });
    };
    window.__curPos = { x: -100, y: -100 };
  });
}

/* 사람처럼: 커서를 ease-in-out으로 밀고 → 겨냥하며 잠깐 멈칫 → 누르고 → 결과를 본다.
   포격전은 한 턴이 약 2초라 클릭 뒤 대기가 짧으면 `disabled`에 막힌다(wiki/dev-workflow.md). */
async function humanClick(px, py) {
  await ensureCursor();
  const from = await page.evaluate(() => window.__curPos || { x: -100, y: -100 });
  const start = from.x < 0 ? { x: px + rnd(150, 320), y: py + rnd(90, 220) } : from;
  const tx = px + rnd(-2, 2), ty = py + rnd(-2, 2);
  const steps = Math.max(10, Math.min(40, Math.round(Math.hypot(tx - start.x, ty - start.y) / 16)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = start.x + (tx - start.x) * e, y = start.y + (ty - start.y) * e;
    await page.evaluate(([x, y]) => { window.__curAt(x, y); window.__curPos = { x, y }; }, [x, y]);
    await page.mouse.move(x, y);
    await pause(12, 22);
  }
  await pause(220, 420);
  await page.evaluate(([x, y]) => window.__curClick(x, y), [tx, ty]);
  await page.mouse.down();
  await pause(60, 120);
  await page.mouse.up();
  await pause(900, 1600);
  /* 빠른 모드에서는 "0.9~1.6초 결과를 본다"만으로는 모자랄 수 있다 — 그 값도 나눠졌기 때문이다.
     연출이 실제로 끝났는지를 게임에 직접 묻는다(`__game.waitIdle` → js/speed.js). */
  if (FAST > 1) await settle();
}

/* 누를 수 있는 것 목록.
   ★ 시장은 '사기'가 24줄, 술집은 '태운다'가 여럿이라 글자만으로는 고를 수 없다. 그래서
     **같은 글자가 둘 이상일 때만** 조상에서 문맥(품목명·인물명)을 끌어와 `label`을 만든다.
     — 좌표로 연속 클릭하면 매매 뒤 행 높이가 바뀌어 엉뚱한 품목을 누른다(harness §3). */
async function ui() {
  return await page.evaluate(() => {
    const flat = s => (s || '').trim().replace(/\s+/g, ' ');
    const head1 = s => flat((s || '').trim().split('\n')[0]);   // 이름만 — 배지·설명은 시세 따라 바뀐다
    /* 단추 태그만 보면 놓친다 — 지도의 항로는 `span.rn`에 리스너를 달아 두어 `[onclick]`에도 안 걸린다.
       그래서 **cursor:pointer**(누를 수 있다는 화면상의 신호)까지 후보로 본다. */
    const tagged = new Set(document.querySelectorAll('button, [role=button], a, .btn, li, [data-act], [onclick]'));
    const cands = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.id === '__cur' || el.id === '__ring') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
      if (!tagged.has(el) && st.cursor !== 'pointer') continue;
      if (!flat(el.innerText || el.textContent)) continue;
      cands.push(el);
    }
    /* 겹친 후보를 하나로 줄인다.
       · 같은 글자를 감싼 바깥 껍데기는 버린다(li > button 중첩)
       · 단추가 아닌데 누를 수 있는 조상 안에 든 조각(항로의 `뒷바람`·`2일 · 42닢` 배지)은 그 행에 흡수한다 */
    const raw = [];
    for (const el of cands) {
      const t = flat(el.innerText || el.textContent).slice(0, 60);
      if (cands.some(o => o !== el && el.contains(o) && flat(o.innerText || o.textContent).slice(0, 60) === t)) continue;
      if (!tagged.has(el) && cands.some(o => o !== el && o.contains(el))) continue;
      const r = el.getBoundingClientRect();
      raw.push({ el, t, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) });
    }
    // 값만 다른 형제도 "같은 단추"다 — 술집 `태운다 (−21닢)`×4는 글자가 달라도 누구인지 알 수 없다.
    const norm = s => s.replace(/[\d.,]+/g, '#');
    const n = new Map();
    for (const e of raw) n.set(norm(e.t), (n.get(norm(e.t)) || 0) + 1);

    // 행/카드의 이름칸을 먼저 찾고, 없으면 형제 단추 글자를 걷어낸 나머지의 앞부분을 쓴다.
    const nameOf = box => {
      const cell = box.tagName === 'TR' ? box.querySelector('td, th') : null;
      const head = cell || box.querySelector('h1, h2, h3, h4, h5, .name, .title, strong, b');
      return head ? head1(head.innerText) : '';
    };
    const ctxOf = (el, own) => {
      for (let box = el.parentElement, i = 0; box && i < 5; box = box.parentElement, i++) {
        const full = flat(box.innerText);
        if (full.length <= own.length) continue;          // 자기 자신만 담은 껍데기는 건너뛴다
        let name = nameOf(box);
        if (!name) {
          name = box.innerText;
          for (const b of box.querySelectorAll('button, [role=button], .btn')) {
            const bt = flat(b.innerText);
            if (bt) name = name.split(bt).join(' ');
          }
          name = head1(name) || flat(name);
        }
        if (name) return name.slice(0, 16);            // 한 글자 품목이 있다(광저우 '은') — 길이로 거르지 않는다
      }
      return '';
    };
    return raw.map(e => {
      const ctx = n.get(norm(e.t)) > 1 ? ctxOf(e.el, e.t) : '';
      return { t: e.t, ctx, label: ctx ? `${ctx} · ${e.t}` : e.t, x: e.x, y: e.y };
    });
  });
}

/* 목록 출력 — 기본은 **접어서** 낸다. 시장 한 화면이 51줄이라 매번 통째로 뱉으면 세션이 무거워진다. */
function render(list, arg = '') {
  const full = arg === '--full';
  const L = full || !arg ? list : list.filter(e => e.label.includes(arg));
  if (!L.length) return `(없다${arg && !full ? `: ${arg}` : ''})`;
  const line = e => `${e.label} @${e.x},${e.y}`;
  if (full || arg || L.length <= 14) return L.map(line).join('\n');
  const g = new Map();
  const key = e => e.t.replace(/[\d.,]+/g, '#');
  for (const e of L) { const k = key(e); if (!g.has(k)) g.set(k, []); g.get(k).push(e); }
  return [...g].map(([t, a]) => a.length === 1 ? line(a[0])
    : `${t} ×${a.length}: ${a.slice(0, 3).map(e => e.ctx || '?').join(' / ')}${a.length > 3 ? ` … (+${a.length - 3})` : ''}`
  ).join('\n');
}
/* 지금 화면을 막고 있는 모달의 첫 줄. 없으면 빈 문자열.
   ★ `.modal-box`를 그냥 잡으면 **항해일지 모달**이 걸린다 — 그것은 `display:none`으로 늘 DOM에 있다.
     보이는 것만 세지 않으면 "사건이 떴다"를 영원히 놓치고, 그 상태로 다음 명령이 죽는다. */
async function blockingModal() {
  return await page.evaluate(() => {
    for (const m of document.querySelectorAll('.modal')) {
      const st = getComputedStyle(m);
      if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
      const line = (m.innerText || '').split('\n').map(s => s.trim()).filter(Boolean)[0];
      if (line) return line;
    }
    return '';
  });
}

async function shot(arg = '') {
  await page.screenshot({ path: SHOT });
  console.log(render(await ui(), arg));
}

const [cmd, ...rest] = argv;
if (cmd === 'shot') await shot(rest.join(' '));
else if (cmd === 'ui') console.log(render(await ui(), rest.join(' ')));
else if (cmd === 'clickxy') {
  const n = rest[2] ? +rest[2] : 1;
  for (let i = 0; i < n; i++) await humanClick(+rest[0], +rest[1]);
  await shot();
} else if (cmd === 'click') {
  const want = rest.join(' ');
  const list = await ui();
  // 문맥까지 정확히 → 단추 글자만 정확히 → 부분 일치. 여럿이면 첫 번째를 누르되 구별법을 알린다.
  const hits = [e => e.label === want, e => e.t === want, e => e.label.includes(want)]
    .map(f => list.filter(f)).find(a => a.length) || [];
  if (!hits.length) { console.log('NOT_FOUND: ' + want); console.log(render(list)); process.exit(2); }
  if (hits.length > 1) console.log(`AMBIGUOUS ×${hits.length} — 첫 번째를 누른다. 골라 누르려면: ${hits.slice(0, 3).map(e => `"${e.label}"`).join(' / ')}`);
  const hit = hits[0];
  console.log(`click "${hit.label}" @ ${hit.x},${hit.y}`);
  await humanClick(hit.x, hit.y);
  await shot();
} else if (cmd === 'start') {
  // 권역별 시작 시험 — `?start=<도시id>`로 다시 열고, 검게 있는 동안(에셋 베이크) 기다렸다가 타이틀을 닫는다.
  let q = rest.join('&').replace(/^&/, '');
  /* ★ 첫 조각이 `key=value`면 **그대로 쿼리로 쓴다** — `origin=navy`처럼 도시가 아닌 것으로
     열 수 있어야 갈래 다섯을 자동으로 돈다. 예전처럼 도시 id만 주면 `start=`를 붙여 준다. */
  const first = q.split('&')[0];
  if (first && !first.includes('=')) q = `start=${q}`;
  // 빠른 모드면 배속을 주소에 실어 연다 — 페이지를 새로 여는 자리라 `__game.speed`가 아직 없다
  const sp = FAST > 1 && !/(^|&)speed=/.test(q) ? `&speed=${FAST}` : '';
  await page.goto(`http://localhost:${WEB}/index.html?${q}${sp}`);
  await sleep(7500);                                   // 6~8초 — 짧으면 빈 화면이 찍힌다(harness §3)
                                                       // ★ 에셋 베이크는 **실제 계산**이라 배속으로 줄지 않는다
  // 타이틀 문구는 상태에서 읽어 쓴다(main.js: titleScreen) — 권역별 시작이 제대로 열렸는지 여기서 드러난다
  const title = await page.evaluate(() => {
    const t = document.getElementById('title-screen');
    return t ? [...t.querySelectorAll('h1, .sub')].map(e => e.innerText.trim()).join(' — ') : '(타이틀 없음)';
  });
  console.log(title);
  /* 저장된 판이 있으면 이 단추가 '새로 시작한다'로 바뀐다(main.js: titleScreen) —
     글자 하나로만 찾으면 타이틀이 안 닫히고 그 뒤 모든 명령이 조용히 실패한다. */
  const intro = (await ui()).find(e => e.label === '출항하기' || e.label === '새로 시작한다');
  if (intro) await humanClick(intro.x, intro.y);
  const st = await page.evaluate(() => ({ at: __game.state.at, gold: __game.state.gold, crew: __game.state.crew, ship: __game.state.ship }));
  /* ★ 없는 도시 id를 주면 게임은 콘솔 경고만 하고 **베네치아 그대로** 연다(main.js: applyDebugStart).
     그것을 모르고 훑으면 인도양을 본다면서 지중해를 본다 — 실제로 `khambhat`으로 한 번 속았다. */
  const mStart = /(^|&)start=([^&]+)/.exec(q);
  const want = mStart ? mStart[2] : null;
  if (want && st.at !== want) console.log(`WRONG_START: '${want}'로 열었는데 '${st.at}'에 있다 — 도시 id를 확인한다`);
  const mOrigin = /(^|&)origin=([^&]+)/.exec(q);
  if (mOrigin) {
    const got = await page.evaluate(() => __game.state.origin);
    if (got !== mOrigin[2]) console.log(`WRONG_ORIGIN: '${mOrigin[2]}'로 열었는데 갈래가 '${got}'다`);
  }
  console.log(JSON.stringify(st));
  await shot();
} else if (cmd === 'sail') {
  // 항구 → 지도 → 그 항로. 도착하거나 **조우가 나서 전투로 넘어갈 때까지** 지켜본다.
  const to = rest.join(' ');
  // 앞선 항해가 사건에서 멈춰 있으면 항로 목록이 없다 — "NO_ROUTE"로 죽는 대신 무엇이 걸렸는지 말한다
  const pending = await blockingModal();
  if (pending) { console.log(`PENDING_MODAL: ${pending} — 먼저 이 화면을 처리한다`); console.log(render(await ui())); process.exit(3); }
  const at0 = await page.evaluate(() => __game.state.at);
  const port = (await ui()).find(e => e.label.includes('출항하기'));
  if (port) await humanClick(port.x, port.y);
  const route = (await ui()).find(e => e.label.startsWith(to));
  if (!route) { console.log('NO_ROUTE: ' + to); console.log(render(await ui())); process.exit(2); }
  await humanClick(route.x, route.y);
  let st;
  for (let i = 0; i < 40 * FAST; i++) {                // 최대 40초(실시간) — 한 항차는 대개 몇 초다
    st = await page.evaluate(() => ({
      at: __game.state.at, day: __game.state.day, gold: __game.state.gold, scene: __game.scene,
    }));
    // 사건은 항해 **도중** 모달로 끊는다 — 이걸 안 보면 조우해 놓고 "항로가 없다"고 죽는다
    st.modal = await blockingModal();
    if (st.modal || st.scene === 'battle' || st.at !== at0) break;
    await sleep(1000 / FAST);
  }
  console.log(JSON.stringify(st));
  const last = await page.evaluate(() => __game.state.log.slice(0, 3).map(l => `${l.day}일: ${l.text}`));   // 최신이 앞이다
  last.forEach(l => console.log('  ' + l));
  await shot();
} else if (cmd === 'eval') console.log(JSON.stringify(await page.evaluate(rest.join(' ')), null, 1));
else if (cmd === 'speed') {
  // 떠 있는 창의 연출 배속. 인자를 안 주면 지금 값만 읽는다(게임 규칙은 어느 쪽이든 안 바뀐다)
  const n = rest[0] ? Number(rest[0]) : null;
  console.log(await page.evaluate(v => (v == null ? __game.speed() : __game.speed(v)), n) + '×');
} else if (cmd === 'state') console.log(JSON.stringify(await page.evaluate(() => __game.snapshot()), null, 1));
else if (cmd === 'wait') { await sleep(+rest[0] * 1000); await shot(); }
else console.log('usage: shot [검색어] | ui [검색어|--full] | click <text> | clickxy <x> <y> [n] | start <도시id> [&gold=…] '
  + '| sail <도시> | eval <js> | speed [n] | state | wait <sec>    (앞에 --fast=8 을 붙이면 사람 속도를 8로 나눈다)');

await browser.close();   // CDP 연결만 끊는다 — 창과 게임 상태는 그대로 남는다
