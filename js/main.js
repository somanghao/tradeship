// main.js — 캔버스 셋업, 씬 매니저, 메인 루프

import { VW, VH } from './sprites/scene.js';
import { loadAssetPack } from './assets.js';
import { state, resetGame } from './state.js';
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

  const { mapScene } = await import('./scenes/map.js');
  const { portScene } = await import('./scenes/port.js');
  const { battleScene } = await import('./scenes/battle.js');
  const { shipyardScene } = await import('./scenes/shipyard.js');
  register('map', mapScene);
  register('port', portScene);
  register('battle', battleScene);
  register('shipyard', shipyardScene);

  fit();
  resetGame();
  initWorld();          // 상인·해적이 지중해를 돌기 시작한다
  go('port', { first: true });
  requestAnimationFrame(frame);

  titleScreen();
}

function titleScreen() {
  const scr = el('div#title-screen', {}, [
    el('h1', { text: '지중해 교역기' }),
    el('div.sub', { text: '1500년, 베네치아 — 카라벨 한 척과 금화 3,200닢' }),
    el('div.keys', {
      html: '항구에서 <b>싸게 사고</b> 다른 도시에서 <b>비싸게 판다</b>.<br>'
          + '바다에는 해적이 있다. <b>포격</b>으로 몰아붙이고 <b>백병전</b>으로 나포하라.',
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
