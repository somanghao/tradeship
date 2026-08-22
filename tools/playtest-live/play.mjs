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
//
// 먼저 `node tools/playtest-live/launch.mjs`로 창을 띄워 둔다. 자세한 것은 wiki/playtest-harness.md.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playwright } from './pw.mjs';

const { chromium } = playwright();
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '.out');
mkdirSync(OUT, { recursive: true });
const SHOT = join(OUT, 'shot.png');

const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('localhost:8891')) || ctx.pages()[0];

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
    await sleep(rnd(12, 22));
  }
  await sleep(rnd(220, 420));
  await page.evaluate(([x, y]) => window.__curClick(x, y), [tx, ty]);
  await page.mouse.down();
  await sleep(rnd(60, 120));
  await page.mouse.up();
  await sleep(rnd(900, 1600));
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

const [cmd, ...rest] = process.argv.slice(2);
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
  const q = rest.join('&').replace(/^&/, '');
  await page.goto(`http://localhost:8891/index.html?start=${q}`);
  await sleep(7500);                                   // 6~8초 — 짧으면 빈 화면이 찍힌다(harness §3)
  // 타이틀 문구는 상태에서 읽어 쓴다(main.js: titleScreen) — 권역별 시작이 제대로 열렸는지 여기서 드러난다
  const title = await page.evaluate(() => {
    const t = document.getElementById('title-screen');
    return t ? [...t.querySelectorAll('h1, .sub')].map(e => e.innerText.trim()).join(' — ') : '(타이틀 없음)';
  });
  console.log(title);
  const intro = (await ui()).find(e => e.label === '출항하기');
  if (intro) await humanClick(intro.x, intro.y);
  const st = await page.evaluate(() => ({ at: __game.state.at, gold: __game.state.gold, crew: __game.state.crew, ship: __game.state.ship }));
  /* ★ 없는 도시 id를 주면 게임은 콘솔 경고만 하고 **베네치아 그대로** 연다(main.js: applyDebugStart).
     그것을 모르고 훑으면 인도양을 본다면서 지중해를 본다 — 실제로 `khambhat`으로 한 번 속았다. */
  const want = q.split('&')[0];
  if (want && st.at !== want) console.log(`WRONG_START: '${want}'로 열었는데 '${st.at}'에 있다 — 도시 id를 확인한다`);
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
  for (let i = 0; i < 40; i++) {                       // 최대 40초 — 한 항차는 대개 몇 초다
    st = await page.evaluate(() => ({
      at: __game.state.at, day: __game.state.day, gold: __game.state.gold, scene: __game.scene,
    }));
    // 사건은 항해 **도중** 모달로 끊는다 — 이걸 안 보면 조우해 놓고 "항로가 없다"고 죽는다
    st.modal = await blockingModal();
    if (st.modal || st.scene === 'battle' || st.at !== at0) break;
    await sleep(1000);
  }
  console.log(JSON.stringify(st));
  const last = await page.evaluate(() => __game.state.log.slice(0, 3).map(l => `${l.day}일: ${l.text}`));   // 최신이 앞이다
  last.forEach(l => console.log('  ' + l));
  await shot();
} else if (cmd === 'eval') console.log(JSON.stringify(await page.evaluate(rest.join(' ')), null, 1));
else if (cmd === 'wait') { await sleep(+rest[0] * 1000); await shot(); }
else console.log('usage: shot [검색어] | ui [검색어|--full] | click <text> | clickxy <x> <y> [n] | start <도시id> [&gold=…] | sail <도시> | eval <js> | wait <sec>');

await browser.close();   // CDP 연결만 끊는다 — 창과 게임 상태는 그대로 남는다
