// main.js — 캔버스 셋업, 씬 매니저, 메인 루프

import { VW, VH } from './sprites/scene.js';
import { loadAssetPack } from './assets.js';
import { loadEvidence } from './evidence.js';
import { state, resetGame, START_GOLD, neighborsOf, grantShip, grantCrew } from './state.js';
import { CITY_BY_ID, SHIPS, CITIES } from './data.js';
import { initWorld } from './world.js';
import { refreshHUD, refreshLog, clearOverlay, el, overlay } from './ui.js';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });

export let scale = 3;
let offX = 0, offY = 0;

/* 캔버스는 무대 전체를 차지하고, 400x225 게임 화면은 그 안에
   정수배로 확대해 중앙 배치한다(레터박스). UI 오버레이는 무대 전체를
   자유롭게 쓸 수 있어 좁은 창에서도 패널이 밀려나지 않는다. */
function fit() {
  const stage = document.getElementById('stage');
  const w = stage.clientWidth, h = stage.clientHeight;
  canvas.width = w;
  canvas.height = h;
  scale = Math.max(1, Math.floor(Math.min(w / VW, h / VH)));
  offX = Math.round((w - VW * scale) / 2);
  offY = Math.round((h - VH * scale) / 2);
  ctx.imageSmoothingEnabled = false;
  current?.resize?.();
}
window.addEventListener('resize', fit);

/** 마우스 이벤트 → 논리 좌표(400x225) */
export function toLogical(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left - offX) / scale,
    y: (ev.clientY - r.top - offY) / scale,
  };
}
/** 논리 좌표 → 무대 픽셀 좌표 (오버레이 배치용) */
export function toScreen(x, y) {
  return { x: offX + x * scale, y: offY + y * scale };
}
export const viewport = () => ({ offX, offY, scale, w: canvas.width, h: canvas.height });

export { canvas };

/* ── 씬 매니저 ──────────────────────────────────────── */
const scenes = new Map();
let current = null;
let currentName = '';

export function register(name, scene) { scenes.set(name, scene); }

export function go(name, params = {}) {
  if (current?.exit) current.exit();
  clearOverlay();
  currentName = name;
  current = scenes.get(name);
  if (!current) throw new Error(`no scene: ${name}`);
  current.enter?.(params);
  refreshHUD();
  refreshLog();
}
export const sceneName = () => currentName;

/* ── 루프 ───────────────────────────────────────────── */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  current?.update?.(dt, now / 1000);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0a0910';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  ctx.beginPath();
  ctx.rect(0, 0, VW, VH);
  ctx.clip();
  current?.draw?.(ctx, now / 1000);
  ctx.restore();

  requestAnimationFrame(frame);
}

/* ── 시작 ───────────────────────────────────────────── */
async function boot() {
  // 그림을 갈아 끼운 팩이 있으면 먼저 읽는다. 없는 것이 기본 — 그때는 코드 생성 그대로다.
  // 반드시 첫 스프라이트가 구워지기 전이어야 한다(한 번 구우면 캐시에 박힌다).
  await loadAssetPack();
  await loadEvidence();   // 시장 목록을 근거 순으로 쌓기 위해 — 없어도 게임은 돈다

  const { mapScene } = await import('./scenes/map.js');
  const { portScene } = await import('./scenes/port.js');
  const { battleScene } = await import('./scenes/battle.js');
  const { shipyardScene } = await import('./scenes/shipyard.js');
  const { tavernScene } = await import('./scenes/tavern.js');
  register('map', mapScene);
  register('port', portScene);
  register('battle', battleScene);
  register('shipyard', shipyardScene);
  register('tavern', tavernScene);

  fit();
  resetGame();
  applyDebugStart();    // ?start=… 로 시작 조건을 바꿔 연다 (개발·검증용)
  initWorld();          // 상인·해적이 세계를 돌기 시작한다
  go('port', { first: true });
  requestAnimationFrame(frame);

  titleScreen();
  exposeForTest();
}

/* ── 개발용 시작 조건 ───────────────────────────────────────────
   `?start=guangzhou&gold=50000&ship=carrack&crew=40` 처럼 붙여 연다.

   ★ 왜 필요한가. 세계가 아홉 바다가 되면서 **동아시아를 확인하려면 158일을 항해해야 한다.**
     그 바다의 시세·특산·배가 제대로 들어갔는지 보려고 매번 반년을 항해할 수는 없다.
     자동 조종(`tools/playtest.mjs`)도 같은 이유로 이 문을 쓴다 — **시작 지점만 옮기고
     플레이는 사람과 똑같이 클릭으로** 한다.
   ★ 주소에 아무것도 안 붙이면 이 함수는 아무 일도 안 한다. 평소 게임에는 영향이 없다. */
function applyDebugStart() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;

  const at = q.get('start');
  if (at && CITY_BY_ID[at]) {
    state.at = at;
    state.known.add(at);
  } else if (at) {
    console.warn(`[debug] '${at}'라는 항구가 없다 — 시작 항구를 그대로 둔다.`);
  }
  const gold = Number(q.get('gold'));
  if (Number.isFinite(gold) && gold > 0) state.gold = Math.round(gold);

  const ship = q.get('ship');
  if (ship && SHIPS[ship]) {
    // 배를 갈아 끼울 때는 선단·적재·무장까지 함께 맞춰야 한다 — 규칙을 여기서 다시 쓰지 않는다
    grantShip(ship);
  } else if (ship) {
    console.warn(`[debug] '${ship}'라는 선종이 없다.`);
  }
  const crew = Number(q.get('crew'));
  if (Number.isFinite(crew) && crew > 0) grantCrew(Math.round(crew));

  console.info(`[debug] 시작 조건을 바꿨다 — ${state.at} · 금화 ${state.gold} `
    + `· ${SHIPS[state.shipKey].name} · 선원 ${state.crew}`);
}

/* ── 자동 조종 창구 ─────────────────────────────────────────────
   ★ 이 게임은 빌드가 없다(순수 ES 모듈). 그래서 "테스트 빌드에만 넣는 훅" 같은 것을
     만들 수 없고, 대신 **읽기와 좌표 변환만** 여는 창구를 하나 둔다.
     여기로 게임을 조작하지는 않는다 — 자동 조종(`tools/playtest.mjs`)도 사람과 똑같이
     **DOM 단추를 누르고 캔버스를 클릭**한다. 그래야 "테스트는 통과하는데 사람이 하면
     안 되는" 일이 안 생긴다. 이 창구가 하는 일은 셋뿐이다:
       ① 지금 어느 씬인가 · 상태가 어떤가 (읽기)
       ② 논리좌표(400×225) → 화면좌표 (캔버스를 클릭하려면 필요하다)
       ③ 도시가 화면 어디에 있나 (지도에서 항구를 누르려면 필요하다)
     쓰지 않으면 아무 일도 안 하므로 게임에는 영향이 없다. */
function exposeForTest() {
  window.__game = {
    get scene() { return sceneName(); },
    get state() { return state; },
    toScreen,
    viewport,
    /** 그 도시가 지금 화면 어디에 있나 — 지도 씬에서만 뜻이 있다 */
    cityScreenPos(id) {
      const c = CITY_BY_ID[id];
      if (!c) return null;
      const p = toScreen(c.x, c.y);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y };
    },
    /** 지금 이 항구에서 갈 수 있는 곳 */
    neighbors() { return neighborsOf(state.at); },
  };
}

function titleScreen() {
  const scr = el('div#title-screen', {}, [
    el('h1', { text: '아홉 바다 교역기' }),
    /* ★ 연도를 박지 않는다(최상위 지침) · 시작 조건은 state.js: resetGame이 정본이다.
       전에는 "1500년, 카라벨 한 척과 3,200닢"이었는데 둘 다 사실이 아니게 된 지 오래였고,
       그다음엔 "베네치아 — 낡은 바사"로 박아 뒀는데 세계가 아홉 바다가 되면서 또 틀렸다
       (개발용 `?start=`로 광저우에서 열어도 "베네치아에서 시작"이라고 적혀 있었다).
       **화면에 적는 사실은 상태에서 읽는다** — 그래야 다시는 안 틀린다. */
    el('div.sub', {
      text: `${CITY_BY_ID[state.at].name} — ${SHIPS[state.shipKey].name} 한 척과 금화 `
          + `${state.gold.toLocaleString('ko-KR')}닢`
          + (state.crew ? ` · 선원 ${state.crew}명` : ''),
    }),
    el('div.keys', {
      html: (state.crew ? '' : '갑판에는 아무도 없다. 먼저 <b>술집</b>에서 선원을 모아야 배가 뜬다.<br>')
          + '항구에서 <b>싸게 사고</b> 다른 도시에서 <b>비싸게 판다</b>.<br>'
          + '바다에는 해적이 있다. <b>포격</b>으로 몰아붙이고 <b>백병전</b>으로 나포하라.<br>'
          + `아홉 바다에 항구가 <b>${CITIES.length}곳</b> 있다. 먼 바다일수록 값진 것이 난다.`,
    }),
    el('button.btn', {
      text: '출항하기',
      onclick: () => scr.remove(),
      style: { fontSize: '15px', padding: '10px 26px' },
    }),
  ]);
  document.getElementById('stage').append(scr);
}

boot();
