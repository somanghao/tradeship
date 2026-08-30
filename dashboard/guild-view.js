// guild-view.js — 상단(商團) 탭 그리기 (G-7)
//
// 계측은 `guilds.mjs`, 규칙은 `js/npc/guild.js`가 정본이고 여기서는 그리기만 한다.
// 이 탭이 답해야 하는 질문은 넷이다:
//   ① **부가 실제로 쌓이나** — 자본 곡선(사료 자본 대비 몇 배)
//   ② **무역로** — 상단이 실제로 손대는 구간과 지금 남은 가격차
//   ③ **민 폭 상위** — 어느 항구의 어느 물건을 얼마나 밀었나 (`guildFactor`가 정본)
//   ④ **흥망** — 누가 문을 닫았고 누가 삼켰나 (회차 26)
//
// ★ 상단은 **지도에 배로 안 뜬다.** 소문 세 줄이 유일한 얼굴이라, 이 화면이 없으면
//   물가를 누르는 층 전체가 플레이어에게 안 보인다 — 이 저장소가 다섯 번 겪은
//   *"규칙이 멀쩡한데 화면이 말하지 않는다"*의 자리다.

import { measureGuilds } from './guilds.mjs';
import { $, fmt, pct, el, svg, node, withTip, TIER_COLOR } from './shared.js';
import { REGION_BY_ID } from '../js/map/geo.js';

/** 바다 이름 — 서열표에 `eastasia`가 그대로 뜨면 읽는 사람이 한 번 더 옮겨 적어야 한다 */
const seaName = (rid) => REGION_BY_ID[rid]?.name ?? rid;

let M = null;
let loaded = false;
export const guildLoaded = () => loaded;

const C = { up: '#7fd8a0', down: '#e08282', line: '#2a2632', dim: '#8b8394', gold: '#e0b45c' };

/* ── 자본 곡선 ────────────────────────────────────────────
   ★ **닢이 아니라 「사료 자본의 몇 배」로 그린다.** 절대액으로 그리면 큰 상단 몇이
     화면을 차지해 나머지 마흔 곳이 바닥에 붙은 한 줄이 된다 — 그러면 서열이 안 보인다.
     이 게임의 상단은 사료 서열을 로그 압축해 세운 것이므로(`GUILD.capPow`),
     읽어야 하는 것도 *제 규모에 견줘 얼마나 컸나*다. */
function drawCurve(box, top) {
  const W = 900, H = 260, P = { l: 46, r: 130, t: 12, b: 24 };
  const s = svg(W, H);
  const days = M.curve.map((c) => c.day);
  const maxD = Math.max(...days, 1);
  const vals = [];
  for (const r of top) for (const c of M.curve) vals.push((c.cap[r.id] ?? 0) / Math.max(1, r.cap0));
  const maxV = Math.max(1, ...vals);
  const x = (d) => P.l + (W - P.l - P.r) * (d / maxD);
  const y = (v) => H - P.b - (H - P.t - P.b) * (v / maxV);

  for (let i = 0; i <= 4; i++) {
    const v = (maxV / 4) * i;
    s.appendChild(node('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: C.line }));
    s.appendChild(node('text', { x: P.l - 6, y: y(v) + 3, 'text-anchor': 'end',
      fill: C.dim, 'font-size': 10 }, `${v.toFixed(0)}배`));
  }
  for (const c of M.curve) {
    s.appendChild(node('text', { x: x(c.day), y: H - 8, 'text-anchor': 'middle',
      fill: C.dim, 'font-size': 10 }, `${c.day}`));
  }
  /* 이름표가 겹치면 아래로 민다 — 여섯 줄이 비슷한 높이로 끝나면 글자가 포개져 못 읽는다 */
  const used = [];
  const place = (v) => {
    let ty = y(v) + 3;
    while (used.some((u) => Math.abs(u - ty) < 11)) ty += 11;
    used.push(ty);
    return ty;
  };
  const last = M.curve[M.curve.length - 1];
  [...top].sort((a, b) => (last.cap[b.id] ?? 0) / Math.max(1, b.cap0)
                        - (last.cap[a.id] ?? 0) / Math.max(1, a.cap0)).forEach((r) => {
    const i = top.indexOf(r);
    const col = TIER_COLOR[i % TIER_COLOR.length];
    const pts = M.curve.map((c) => `${x(c.day)},${y((c.cap[r.id] ?? 0) / Math.max(1, r.cap0))}`).join(' ');
    s.appendChild(node('polyline', { points: pts, fill: 'none', stroke: col, 'stroke-width': 1.6 }));
    s.appendChild(node('text', { x: W - P.r + 6, y: place((last.cap[r.id] ?? 0) / Math.max(1, r.cap0)),
      fill: col, 'font-size': 10 }, r.name.length > 13 ? `${r.name.slice(0, 13)}…` : r.name));
  });
  box.innerHTML = '';
  box.appendChild(s);
}

/* ── 표 하나 ─────────────────────────────────────────────── */
function table(cols, rows) {
  const t = el('table', 'list');
  const h = el('tr');
  for (const c of cols) h.appendChild(el('th', null, c));
  t.appendChild(h);
  for (const r of rows) {
    const tr = el('tr');
    for (const c of r) {
      const td = el('td');
      if (c && typeof c === 'object') { td.innerHTML = c.html; if (c.cls) td.className = c.cls; }
      else td.innerHTML = c ?? '';
      tr.appendChild(td);
    }
    t.appendChild(tr);
  }
  return t;
}

function card(k, v, sub) {
  const c = el('div', 'card');
  c.appendChild(el('div', 'k', k));
  c.appendChild(el('div', 'v', `${v}${sub ? `<small>${sub}</small>` : ''}`));
  return c;
}

export function runGuilds() {
  const days = +($('g-days')?.value ?? 1440);
  $('g-stamp').textContent = '세계를 굴리는 중…';
  // 한 프레임 넘겨서 「굴리는 중」이 실제로 보이게 한다 (계측이 무겁다)
  setTimeout(() => {
    M = measureGuilds({ days });
    draw();
    loaded = true;
  }, 20);
}

function draw() {
  const T = M.total, K = M.knobs;
  const cards = $('g-cards');
  cards.innerHTML = '';
  cards.appendChild(card('살아 있는 상단', `${T.live}`, `/ ${K.houses}곳`));
  cards.appendChild(card('문을 닫은 상단', `${T.dead}`, '인수·합병'));
  cards.appendChild(card('임자가 바뀐 상관', `${T.seats}`, '곳'));
  cards.appendChild(card('누적 항차', fmt(T.legs), `잃은 항차 ${fmt(T.lost)}`));
  cards.appendChild(card('자국을 남긴 항구', `${T.flowCities}`, '곳'));
  cards.appendChild(card('총자산', fmt(T.worth), '닢'));
  cards.appendChild(card('배당(세계 밖으로)', fmt(T.paid), '닢'));

  $('g-stamp').innerHTML = `세계 ${M.days}일 · 시드 ${M.seed} · 상한 ±${pct(K.priceCap, 0)}`
    + ` · 결산 ${K.bookDays}일(장부 ${K.capKeep}배·배당 ${K.payout})`
    + ` · 부실 장부가의 ${K.bustAt} ${K.bustDays}일 · 합병 ${K.mergeRatio}배 · 바다별 하한 ${K.minHouses}곳`
    + ` · 상관 유지비 ${K.seatUpkeep}닢/일`;

  /* ① 자본 곡선 — 상위 6곳 */
  const top = M.rank.slice(0, 6);
  drawCurve($('g-curve'), top);

  /* 서열 표 */
  $('g-rank').innerHTML = '';
  $('g-rank').appendChild(table(
    ['#', '상단', '바다', '자본(닢)', '사료 대비', '상관', '선단', '세기', '항차', '잃은 항차', '삼킴', '호감'],
    M.rank.slice(0, 24).map((r) => [
      `${r.rank}`, r.name, seaName(r.region), fmt(r.cap),
      { html: `${(r.cap / Math.max(1, r.cap0)).toFixed(1)}배`, cls: 'dim' },
      `${r.seats}`, `${r.fleet}`, `${r.might}`, fmt(r.legs), fmt(r.lost), `${r.took}`,
      { html: `${r.regard > 0 ? '+' : ''}${r.regard}`,
        cls: r.regard >= 25 ? 'g' : r.regard <= -12 ? 'r' : '' },
    ])));

  /* ② 무역로 */
  $('g-lanes').innerHTML = '';
  $('g-lanes').appendChild(table(
    ['상단', '구간', '품목', '남은 가격차', '길 위 요율'],
    M.lanes.slice(0, 24).map((l) => [
      l.houseName, `${l.aName} ↔ ${l.bName}`, l.gName,
      { html: pct(l.gap), cls: l.gap > 0.2 ? 'y' : '' },
      { html: `${l.risk.toFixed(1)}%p`, cls: 'dim' },
    ])));

  /* ③ 민 폭 상위 — `guildFactor()`가 정본이라 ±상한을 반드시 문다 */
  $('g-push').innerHTML = '';
  $('g-push').appendChild(table(
    ['항구', '품목', '민 폭', '자국(flow)', '무엇이 일어났나'],
    M.push.slice(0, 24).map((p) => [
      p.cityName, p.goodName,
      { html: `${p.pushPct > 0 ? '+' : ''}${p.pushPct.toFixed(1)}%`,
        cls: p.pushPct > 0 ? 'r' : 'g' },
      fmt(p.flow),
      { html: p.flow > 0 ? '상단이 부었다 — 값이 내렸다' : '상단이 사갔다 — 값이 올랐다', cls: 'dim' },
    ])));

  /* ④ 흥망 */
  $('g-fall').innerHTML = '';
  $('g-fall').appendChild(table(
    ['며칠째', '문을 닫은 상단', '바다', '넘겨받은 상단', '넘어간 상관', '바다에서 잃은 항차'],
    M.events.length
      ? M.events.map((e) => [`${e.day}일`, e.name, seaName(e.region), e.byName ?? '—', `${e.seats}곳`, `${e.lost}`])
      : [[{ html: '<i style="color:var(--dim)">이 판에서는 아무도 문을 닫지 않았다 — 세계 일수를 늘려 보라</i>' }, '', '', '', '', '']]));

  /* 바다별 */
  $('g-seas').innerHTML = '';
  $('g-seas').appendChild(table(
    ['바다', '살아 있는 상단', '문 닫음', '상관', '자본 합(닢)', '삼킨 횟수'],
    M.seas.map((s) => [
      s.name,
      { html: `${s.live}`, cls: s.live < M.knobs.minHouses ? 'r' : '' },
      `${s.dead}`, `${s.seats}`, fmt(s.cap), `${s.took}`,
    ])));
}

export function bindGuildControls() {
  const d = $('g-days');
  if (!d) return;
  d.onchange = () => runGuilds();
  $('g-run').onclick = () => runGuilds();
}

void withTip;
