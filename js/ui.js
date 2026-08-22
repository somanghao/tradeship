// ui.js — DOM 오버레이 헬퍼
// 게임 그림은 캔버스, 글자/버튼은 DOM. 픽셀 폰트를 쓰지 않고도
// 한글이 또렷하게 나오고 레이아웃 잡기도 쉽다.

import { state, cargoUsed, ship } from './state.js';
import { blit } from './pixel.js';
import { iconSprite } from './sprites/icons.js';

export const overlay = document.getElementById('overlay');
const toastBox = document.getElementById('toast');

/** el('div.klass#id', {attr}, ...children) */
export function el(spec, props = {}, ...kids) {
  const m = spec.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const tag = (m && m[1]) || 'div';
  const node = document.createElement(tag);
  if (m && m[2]) {
    for (const tok of m[2].match(/[.#][\w-]+/g) || []) {
      if (tok[0] === '.') node.classList.add(tok.slice(1));
      else node.id = tok.slice(1);
    }
  }
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

export function clearOverlay() {
  overlay.replaceChildren();
}

/** 스프라이트를 그대로 넣은 <canvas> */
export function spriteEl(sprite, scale = 2) {
  const cv = el('canvas', { width: sprite.width * scale, height: sprite.height * scale });
  blit(cv.getContext('2d'), sprite, 0, 0, scale);
  return cv;
}

export function iconEl(goodIcon, scale = 1) {
  return spriteEl(iconSprite(goodIcon), scale);
}

/** 투명 여백을 잘라낸 <canvas>. 큰 스프라이트를 패널에 얹을 때 쓴다. */
const trimCache = new WeakMap();
export function spriteElTrim(sprite, scale = 2, pad = 1) {
  let b = trimCache.get(sprite);
  if (!b) { b = trimBounds(sprite); trimCache.set(sprite, b); }
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  const w = Math.min(sprite.width - x, b.w + pad * 2);
  const h = Math.min(sprite.height - y, b.h + pad * 2);
  const cv = el('canvas', { width: w * scale, height: h * scale });
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, x, y, w, h, 0, 0, w * scale, h * scale);
  return cv;
}

function trimBounds(sprite) {
  const { width: W, height: H } = sprite;
  const a = sprite.getContext('2d').getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (a[(y * W + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: W, h: H };   // 전부 투명
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/* ── 글 ─────────────────────────────────────────────────────────
   화면에 얹는 것은 그림과 단추만이 아니다. **문장도 여기서 다듬는다.**
   조사(`이/가`·`을/를`)는 씬만 쓰는 게 아니라 `state.js`도 써야 해서 leaf 모듈로 내려갔다.
   여기서 re-export하므로 씬은 계속 `from '../ui.js'`로 가져다 쓴다. → `js/josa.js` */
export { josa } from './josa.js';

/** 바다에서 만난 배를 뭐라고 부를 것인가.
    ★ 명부(`regions/<권역>/npc-traders.js`·`npc-pirates.js`)에서 온 배는 이름이 이미 **사람·상단·무리**의 것이다.
      거기에 '호'를 붙이면 '왕직호'·'개성 송상호'·'식량형제단호'가 된다.
      이름이 없어 배 이름을 굴려 쓴 쪽(`npc/config.js`의 '산타 마리아')만 '호'를 받는다. */
export const npcTitle = (n) => (n?.defId ? n.name : `${n?.name ?? ''}호`);

/* ── 토스트 ─────────────────────────────────────────── */
export function toast(text, kind = '') {
  const item = el(`div.toast-item${kind ? '.' + kind : ''}`, { text });
  toastBox.append(item);
  setTimeout(() => {
    item.style.transition = 'opacity .3s, transform .3s';
    item.style.opacity = '0';
    item.style.transform = 'translateY(-6px)';
    setTimeout(() => item.remove(), 320);
  }, 2000);
}

/* ── 모달 ───────────────────────────────────────────── */
export function modal({ title, body, actions = [], closable = true }) {
  const wrap = el('div.modal');
  const box = el('div.modal-box');
  box.append(el('h3', { text: title }));
  if (typeof body === 'string') box.append(el('p', { html: body }));
  else if (body) box.append(body);

  const bar = el('div.modal-actions');
  for (const a of actions) {
    bar.append(el(`button.btn${a.kind ? '.' + a.kind : ''}`, {
      text: a.label,
      onclick: () => { if (a.onClick?.() !== false) wrap.remove(); },
    }));
  }
  if (actions.length) box.append(bar);
  wrap.append(box);
  if (closable) wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
  document.body.append(wrap);
  return wrap;
}

/* ── HUD ────────────────────────────────────────────── */
const hud = {
  day: document.querySelector('#hud-day b'),
  gold: document.querySelector('#hud-gold b'),
  ship: document.querySelector('#hud-ship b'),
  hull: document.querySelector('#hud-hull b'),
  crew: document.querySelector('#hud-crew b'),
  guns: document.querySelector('#hud-guns b'),
  cargo: document.querySelector('#hud-cargo b'),
};

export function refreshHUD() {
  hud.day.textContent = state.day;
  hud.gold.textContent = state.gold.toLocaleString('ko-KR');
  hud.ship.textContent = ship().name;
  hud.hull.textContent = `${state.hp}/${state.maxHp}`;
  hud.crew.textContent = `${state.crew}/${state.crewMax}`;
  hud.guns.textContent = state.guns;
  hud.cargo.textContent = `${cargoUsed()}/${state.cargoCap}`;
  document.getElementById('hud-hull')
    .classList.toggle('low', state.hp < state.maxHp * 0.34);
  document.getElementById('hud-crew')
    .classList.toggle('low', state.crew < 6);
}

/* ── 항해일지 ───────────────────────────────────────── */
const logLine = document.getElementById('log-line');
const logFull = document.getElementById('logfull');
const logModal = document.getElementById('logmodal');

export function refreshLog() {
  const last = state.log[0];
  logLine.textContent = last ? last.text : '—';
  logLine.className = last?.kind || '';
}

document.getElementById('log-toggle').addEventListener('click', () => {
  logFull.replaceChildren(...state.log.map((l) =>
    el('div', {}, el('span.d', { text: `${l.day}일` }), el(`span.${l.kind}`, { text: l.text }))));
  logModal.classList.remove('hidden');
});
logModal.addEventListener('click', (e) => {
  if (e.target === logModal || e.target.hasAttribute('data-close-log')) {
    logModal.classList.add('hidden');
  }
});

/* ── 진행바 ─────────────────────────────────────────── */
export function bar(kind, value, max) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return el(`div.bar.${kind}`, {}, el('i', { style: { width: pct + '%' } }));
}
