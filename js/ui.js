// ui.js — DOM 오버레이 헬퍼
// 게임 그림은 캔버스, 글자/버튼은 DOM. 픽셀 폰트를 쓰지 않고도
// 한글이 또렷하게 나오고 레이아웃 잡기도 쉽다.

import { state, cargoUsed, ship, cargoCapTotal } from './state.js';
import { blit } from './pixel.js';
import { iconSprite } from './sprites/icons.js';
import { after, speed, setSpeed, onSpeedChange, SPEED_STEPS } from './speed.js';

export const overlay = document.getElementById('overlay');
const toastBox = document.getElementById('toast');

/* ── 굵게 (`**…**`) ──────────────────────────────────────────────
   ★ **왜 렌더러가 이것을 알아야 하나**(GRAND #14). 문장을 쓰는 곳이 씬만이 아니다 —
     `state.js`·`payday.js`도 `pushLog`로 문장을 쓰고, 거기에 `**…**`로 강조를 적어 왔다.
     찍는 쪽이 그 표기를 모르니 별표가 그대로 나갔다: 코멘다 계약 카드가
     *「**매매차익**의 25%를 가져간다」* 로 보였다 — 이 게임에서 설명이 가장 긴 카드인데
     강조가 통째로 깨진 채였다. 실측 13곳(port 7 · state 5 · payday 1).
   ★ **`josa.js`와 같은 이유의 같은 해법이다.** 표기 규약은 문장을 쓰는 층이 아니라
     **찍는 층**이 안다. 문자열 열세 개를 고치는 대신 `el()` 한 곳을 고치면,
     앞으로 누가 어느 층에서 `**`를 적어도 화면이 알아본다.
   ⚠️ `**`가 **없는** 문자열은 한 글자도 안 건드린다 — `text:`는 여전히 textContent라
     이스케이프가 필요한 문자열이 실수로 HTML이 되지 않는다. `**`가 있을 때만 이스케이프 후
     `<b>`로 바꿔 innerHTML로 넣는다. */
const BOLD_RE = /\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*/g;
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** `**…**`가 들어 있나 */
export const hasBold = (s) => typeof s === 'string' && s.includes('**');
/** 이미 HTML인 문자열의 `**…**`만 굵게 (나머지는 그대로 둔다) */
export const boldHtml = (s) => String(s).replace(BOLD_RE, '<b>$1</b>');
/** 평문을 이스케이프한 뒤 `**…**`만 굵게 */
export const boldText = (s) => boldHtml(escHtml(s));

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
    if (k === 'html') node.innerHTML = hasBold(v) ? boldHtml(v) : v;
    else if (k === 'text') {
      if (hasBold(v)) node.innerHTML = boldText(v);   // 위 §굵게 — `**`가 있을 때만
      else node.textContent = v;
    }
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
  // 머무는 시간도 연출이다 — 배속으로 굴리면 토스트가 다음 장면까지 남지 않는다
  after(() => {
    item.style.transition = 'opacity .3s, transform .3s';
    item.style.opacity = '0';
    item.style.transform = 'translateY(-6px)';
    after(() => item.remove(), 320);
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
  hud.cargo.textContent = `${cargoUsed()}/${cargoCapTotal()}`;
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
  // 일지도 굵게를 안다 — `state.js`·`payday.js`가 `**…**`로 강조해 온 줄이 여기로 온다(§굵게)
  if (last && hasBold(last.text)) logLine.innerHTML = boldText(last.text);
  else logLine.textContent = last ? last.text : '—';
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

/* ── 배속 토글 ──────────────────────────────────────
   항해일지 바 오른쪽에 붙는다 — 눈에 띄지만 화면을 가리지 않는 자리다.
   ★ 기본은 1×이고, 이것을 올려도 **줄어드는 것은 연출과 대기시간뿐**이다(→ `js/speed.js`).
     `?speed=`로 연 판은 단계에 없는 값일 수 있으므로 라벨이 지금 값을 그대로 적는다. */
const speedBox = document.getElementById('speed-box');
if (speedBox) {
  const label = el('span', {
    style: { color: 'var(--brass-d)', fontSize: '11px', letterSpacing: '.04em' },
  });
  const btns = SPEED_STEPS.map((n) => el('button.mini', {
    text: `${n}×`,
    title: `연출 ${n}배속 — 일수·확률·수치는 그대로다`,
    style: { padding: '2px 5px' },
    onclick: () => setSpeed(n, { persist: true }),
  }));
  const paint = () => {
    label.textContent = `배속 ${speed.mul}×`;
    btns.forEach((b, i) => {
      const on = SPEED_STEPS[i] === speed.mul;
      b.style.color = on ? '#f4dd86' : '';
      b.style.background = on ? '#3b3222' : '';
      b.style.borderColor = on ? '#8a6a2f' : '';
    });
  };
  speedBox.append(label, ...btns);
  onSpeedChange(paint);
  paint();
}

/* ── 진행바 ─────────────────────────────────────────── */
export function bar(kind, value, max) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return el(`div.bar.${kind}`, {}, el('i', { style: { width: pct + '%' } }));
}
