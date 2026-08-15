// shared.js — 네 탭 공용 **그리기** 도구
//
// ★ 확장자가 `.js`인 이유: 이 폴더의 규약은 **`.mjs` = 계측(DOM을 안 쓴다 · node로 검증 가능)**,
//   **`.js` = 렌더(DOM을 쓴다)**이다. 이 파일은 `document`를 쓰므로 렌더 쪽이다.
//   한동안 `shared.mjs`였는데, 이름만 계측 계열이라 "node로 돌려도 되는 줄" 오해를 부른다.
//
// 탭이 둘 이상이 되면서 갈라졌던 것을 여기로 모은다.
// 각 탭이 제 버전을 들고 있으면 색이나 서식이 조금씩 어긋나 한 화면처럼 안 보인다.

export const $ = (id) => document.getElementById(id);
export const fmt = (n) => Math.round(n).toLocaleString('en-US');
export const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

/* ── 색 ──────────────────────────────────────────────────────
   -1(싸다/유출) … 0 … +1(비싸다/유입). 게임 팔레트에 맞춘 저채도. */
export function heat(t) {
  const x = Math.max(-1, Math.min(1, t));
  if (x >= 0) return `rgba(224,${Math.round(140 - 60 * x)},${Math.round(96 - 40 * x)},${0.16 + 0.5 * x})`;
  return `rgba(${Math.round(110 + 20 * x)},${Math.round(178 + 20 * x)},216,${0.16 + 0.5 * -x})`;
}

export function mono(t, rgb) {
  const x = Math.max(0, Math.min(1, t));
  return `rgba(${rgb},${0.06 + 0.62 * x})`;
}

/** 등급 5종에 고정 색 — 표·그래프·범례가 같은 색을 써야 눈이 따라간다 */
export const TIER_COLOR = ['#8b8394', '#7fb2d8', '#7fd8a0', '#e0a45c', '#e08282'];

/* ── SVG ─────────────────────────────────────────────────── */
export const NS = 'http://www.w3.org/2000/svg';

export function svg(w, h) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.setAttribute('width', '100%');
  s.style.height = `${h}px`;
  s.style.display = 'block';
  return s;
}

export function node(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

/* ── 툴팁 ────────────────────────────────────────────────── */
export function tipShow(ev, html) {
  const t = $('tip');
  t.innerHTML = html;
  t.style.display = 'block';
  tipMove(ev);
}

export function tipMove(ev) {
  const t = $('tip');
  const pad = 14;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  const r = t.getBoundingClientRect();
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
}

export function tipHide() { $('tip').style.display = 'none'; }

/** 요소 하나에 툴팁을 붙인다 — 매번 세 개씩 다는 것을 줄인다 */
export function withTip(target, html) {
  target.addEventListener('mouseenter', (e) => tipShow(e, typeof html === 'function' ? html() : html));
  target.addEventListener('mousemove', tipMove);
  target.addEventListener('mouseleave', tipHide);
  return target;
}
