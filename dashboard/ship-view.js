// ship-view.js — 선박 탭 그리기
//
// 계측은 `ships.mjs`, 수치의 정본은 각 권역 `js/regions/<권역>/ships.js`이고 여기서는 그린다.
// 이 탭이 답해야 하는 질문은 넷이다:
//   ① **이 바다에는 어떤 배가 있는가** (권역 필터를 걸고 보는 명부)
//   ② 그 배를 어디서 지을 수 있는가 — 그리고 **전통 조선지와 얼마나 어긋나는가**
//   ③ 화물선으로서 어디쯤인가 (칸당 값 · 칸당 사람)
//   ④ 해금 사슬은 어떻게 이어지는가
//
// ★ ②가 이 탭의 핵심 볼거리다. `yards`(전통 조선지)는 **값 할인**일 뿐이고 건조 가능은
//   공업력만 본다. 그래서 기니 해안 카누를 몸바사에서, 판옥선을 리스본에서 짓는다.
//   숫자로 보이지 않으면 아무도 안 고치므로 **어긋난 수를 세어 앞에 세운다.**

import { allShips, regionSummary, unlockChains, industrySpread } from './ships.mjs';
import { $, fmt, el, svg, node, withTip, mono, TIER_COLOR } from './shared.js';
import {
  mountRegionBar, injectRegionBarStyle, onRegionChange,
  currentRegion, regionName, ALL,
} from './region-filter.js';

let ROWS = null;
let loaded = false;
export const shipLoaded = () => loaded;

const HULL_KO = {
  hulk: '허크', caravel: '카라벨', carrack: '캐랙', galleon: '갈레온', galley: '갤리',
  brig: '브리그', fluyt: '플류트', frigate: '프리깃', indiaman: '인디아맨', superfrigate: '대형 프리깃',
};

/** 지금 권역 선택에 걸린 배들 (배의 권역은 `home`이다 — `region`이 아니라) */
const visible = () => (currentRegion() === ALL ? ROWS : ROWS.filter((r) => r.home === currentRegion()));

/* ── ① 권역 요약 ───────────────────────────────────────── */
function drawSummary() {
  const host = $('s-summary');
  if (!host) return;
  const rows = regionSummary(ROWS);
  const maxN = Math.max(...rows.map((r) => r.n));
  host.innerHTML = '';
  const t = el('table', 'tbl');
  t.innerHTML = `<thead><tr><th>바다</th><th>선종</th><th></th><th class="r">최고 등급</th>
    <th class="r">가장 큰 배</th><th class="r">평균 화물칸</th><th class="r">해금선</th></tr></thead>`;
  const tb = document.createElement('tbody');
  for (const r of rows) {
    const tr = document.createElement('tr');
    const on = currentRegion() === r.region;
    if (on) tr.style.background = '#ffffff10';
    tr.innerHTML = `<td>${r.name}</td><td class="r">${r.n}척</td>
      <td style="width:120px"><div style="height:8px;border-radius:2px;background:${TIER_COLOR[Math.min(4, r.tierMax)]};
        width:${Math.round((r.n / maxN) * 100)}%"></div></td>
      <td class="r">${r.tierMax}</td><td class="r">${fmt(r.cargoMax)}칸</td>
      <td class="r">${fmt(r.cargoAvg)}칸</td><td class="r">${r.hidden}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  host.append(t);
}

/* ── ② 선박 명부 ───────────────────────────────────────── */
function drawTable() {
  const host = $('s-table');
  if (!host) return;
  const rows = visible();
  host.innerHTML = '';
  host.append(el('p', 'sub', `${regionName(currentRegion())} — <b>${rows.length}척</b>. `
    + '값은 정가이고, 실제 값은 그 항구의 공업력 여유와 전통 조선지 할인만큼 내려간다.'));

  const t = el('table', 'tbl');
  t.innerHTML = `<thead><tr>
    <th>배</th><th>원산</th><th class="r">등급</th><th class="r">정가</th>
    <th class="r">화물칸</th><th class="r">칸당 값</th><th class="r">최소 선원</th>
    <th class="r">칸당 사람</th><th class="r">선체</th><th class="r">포문</th>
    <th class="r">속력</th><th class="r">유지비</th><th>전통 조선지</th><th class="r">지을 수 있는 항구</th>
  </tr></thead>`;
  const tb = document.createElement('tbody');
  for (const r of rows) {
    const tr = document.createElement('tr');
    const stray = r.strayCount ?? 0;
    // 전통 조선지 밖에서 지을 수 있는 수가 많을수록 붉게 — "이 바다의 배"가 무색해진 정도다
    const strayTint = stray > 40 ? '#e08282' : stray > 10 ? '#e0a45c' : '#8b8394';
    tr.innerHTML = `
      <td><b>${r.name}</b> <span class="dim">${HULL_KO[r.hull] ?? r.hull}</span></td>
      <td class="dim">${r.origin ?? '—'}</td>
      <td class="r" style="color:${TIER_COLOR[Math.min(4, r.tier)]}">${r.tier}</td>
      <td class="r">${fmt(r.price)}</td>
      <td class="r">${fmt(r.cargo)}</td>
      <td class="r dim">${r.perCargo ?? '—'}</td>
      <td class="r">${r.crewMin}</td>
      <td class="r dim">${r.crewPerCargo ?? '—'}</td>
      <td class="r">${r.hp}</td>
      <td class="r">${r.guns}</td>
      <td class="r">${r.speed.toFixed(2)}</td>
      <td class="r">${r.upkeep}</td>
      <td class="dim">${r.yardNames.length ? r.yardNames.join('·') : '—'}</td>
      <td class="r" style="color:${strayTint}">${r.portCount}곳${stray ? ` <span class="dim">(밖 ${stray})</span>` : ''}</td>`;
    if (r.requires) {
      const req = ROWS.find((x) => x.key === r.requires);
      withTip(tr.children[0], `<b>${r.name}</b><br>${r.desc ?? ''}<br><br>`
        + `<b>해금</b> — ${req ? req.name : r.requires}을(를) 몰아 봐야 열린다`);
    } else if (r.desc) {
      withTip(tr.children[0], `<b>${r.name}</b><br>${r.desc}`);
    }
    tb.append(tr);
  }
  t.append(tb);
  host.append(t);
}

/* ── ③ 화물칸 ↔ 값 ─────────────────────────────────────── */
function drawScatter() {
  const host = $('s-scatter');
  if (!host) return;
  host.innerHTML = '';
  const W = 860, H = 340, P = 46;
  const s = svg(W, H);
  const maxC = Math.max(...ROWS.map((r) => r.cargo)) * 1.05;
  const maxP = Math.max(...ROWS.map((r) => r.price)) * 1.05;
  const x = (c) => P + (c / maxC) * (W - P * 2);
  const y = (p) => H - P - (p / maxP) * (H - P * 2);

  for (let i = 0; i <= 4; i++) {
    const gy = H - P - (i / 4) * (H - P * 2);
    s.append(node('line', { x1: P, y1: gy, x2: W - P, y2: gy, stroke: '#ffffff12' }));
    s.append(node('text', { x: P - 8, y: gy + 4, fill: '#8b8394', 'font-size': 10, 'text-anchor': 'end' },
      fmt((maxP * i) / 4)));
  }
  s.append(node('text', { x: W / 2, y: H - 10, fill: '#8b8394', 'font-size': 11, 'text-anchor': 'middle' }, '화물칸 →'));
  s.append(node('text', { x: 12, y: 18, fill: '#8b8394', 'font-size': 11 }, '정가 ↑'));

  const cur = currentRegion();
  for (const r of ROWS) {
    const on = cur === ALL || r.home === cur;
    const c = node('circle', {
      cx: x(r.cargo), cy: y(r.price), r: on ? 5 : 3,
      fill: on ? TIER_COLOR[Math.min(4, r.tier)] : '#3b3448',
      opacity: on ? 0.95 : 0.5, stroke: '#14111b', 'stroke-width': 1,
    });
    withTip(c, `<b>${r.name}</b> <span style="color:#8b8394">${r.regionName}</span><br>`
      + `${fmt(r.price)}닢 · ${fmt(r.cargo)}칸 · 칸당 ${r.perCargo}닢<br>`
      + `선원 ${r.crewMin}~${r.crewMax} · 포 ${r.guns} · 속력 ${r.speed.toFixed(2)}`);
    s.append(c);
  }
  host.append(s);
  host.append(el('p', 'sub',
    '왼쪽 아래에 붙을수록 <b>칸당 값이 싸다</b>. 오른쪽 위로 갈수록 큰 배이고, '
    + '같은 화물칸에서 위에 있는 배는 그만큼 전투력·속력에 값을 낸 것이다. '
    + '권역을 고르면 그 바다 배만 밝게 남는다.'));
}

/* ── ④ 해금 사슬 ───────────────────────────────────────── */
function drawChains() {
  const host = $('s-chains');
  if (!host) return;
  const chains = unlockChains(ROWS).filter((ch) => ch.length > 1);
  const cur = currentRegion();
  const mine = cur === ALL ? chains : chains.filter((ch) => ch.some((r) => r.home === cur));
  host.innerHTML = '';
  if (!mine.length) {
    host.append(el('p', 'sub', '이 바다에는 선행 선종을 요구하는 배가 없다.'));
    return;
  }
  for (const ch of mine) {
    const line = el('div', 'chain');
    line.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0';
    ch.forEach((r, i) => {
      if (i) line.append(el('span', 'dim', '→'));
      const b = el('span', '', `<b>${r.name}</b> <span class="dim">${fmt(r.price)}닢 · ${r.cargo}칸</span>`);
      b.style.cssText = `padding:3px 8px;border-radius:3px;background:#ffffff0d;`
        + `border-left:3px solid ${TIER_COLOR[Math.min(4, r.tier)]}`;
      if (cur !== ALL && r.home !== cur) b.style.opacity = '0.45';
      line.append(b);
    });
    host.append(line);
  }
}

/* ── ⑤ 전통 조선지가 지켜지는가 ────────────────────────────── */
function drawStray() {
  const host = $('s-stray');
  if (!host) return;
  const rows = visible().filter((r) => r.yardNames.length).sort((a, b) => b.strayCount - a.strayCount);
  host.innerHTML = '';
  if (!rows.length) { host.append(el('p', 'sub', '이 바다에는 전통 조선지가 적힌 배가 없다.')); return; }
  const worst = rows.slice(0, 12);
  const t = el('table', 'tbl');
  t.innerHTML = `<thead><tr><th>배</th><th>전통 조선지</th>
    <th class="r">거기서</th><th class="r">그 밖에서도</th><th>그 밖의 예</th></tr></thead>`;
  const tb = document.createElement('tbody');
  for (const r of worst) {
    const outside = r.ports.filter((p) => !r.yards.includes(p.id));
    const sample = outside.slice(0, 4).map((p) => p.name).join('·');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${r.name}</b> <span class="dim">${r.regionName}</span></td>
      <td class="dim">${r.yardNames.join('·')}</td>
      <td class="r">${r.ports.length - outside.length}곳</td>
      <td class="r" style="color:${outside.length > 40 ? '#e08282' : '#e0a45c'}">${outside.length}곳</td>
      <td class="dim">${sample}${outside.length > 4 ? ' …' : ''}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  host.append(t);
  host.append(el('p', 'sub',
    '<b>`yards`는 값 할인일 뿐 건조 제한이 아니다.</b> 건조 가능 여부는 공업력만 본다'
    + '(<code>js/state.js: sellsShip</code>). 그래서 기니 해안 카누를 몸바사에서, '
    + '판옥선을 리스본에서 짓는다. 오른쪽 숫자가 그 어긋남의 크기다 — '
    + '<code>UNIMPLEMENTED.md</code> C-2.'));
}

/* ── ⑥ 공업력 분포 ─────────────────────────────────────── */
function drawIndustry() {
  const host = $('s-industry');
  if (!host) return;
  const rows = industrySpread();
  host.innerHTML = '';
  const t = el('table', 'tbl');
  t.innerHTML = '<thead><tr><th class="r">공업력</th><th class="r">항구</th><th>지을 수 있는 등급</th><th>어디</th></tr></thead>';
  const tb = document.createElement('tbody');
  for (const r of rows) {
    const cur = currentRegion();
    const ports = cur === ALL ? r.ports : r.ports.filter((p) => p.region === cur);
    if (!ports.length) continue;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="r"><b>${r.industry}</b></td><td class="r">${ports.length}곳</td>
      <td>${r.industry >= 1 ? `tier ${r.industry} 이하` : '못 짓는다'}</td>
      <td class="dim">${ports.slice(0, 10).map((p) => p.name).join('·')}${ports.length > 10 ? ' …' : ''}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  host.append(t);
}

function redraw() {
  drawSummary(); drawTable(); drawScatter(); drawChains(); drawStray(); drawIndustry();
}

export function runShips() {
  if (!ROWS) ROWS = allShips();
  loaded = true;
  injectRegionBarStyle();
  const bar = $('s-regionbar');
  if (bar && !bar.dataset.mounted) {
    mountRegionBar(bar, { countOf: (r) => ROWS.filter((x) => x.home === r.id).length });
    bar.dataset.mounted = '1';
    onRegionChange(() => { if (loaded) redraw(); });
  }
  redraw();
}
