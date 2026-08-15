// pirate-view.js — 해적 탭 그리기
//
// 계측은 `pirates.mjs`가 하고 여기서는 그리기만 한다.
// 규칙을 다시 구현하지 않는다는 원칙은 dash.js와 같다.

import { measureAll } from './pirates.mjs';
import { $, fmt, pct, el, svg, node, mono, TIER_COLOR, tipShow, tipMove, tipHide, withTip } from './shared.mjs';

let P = null;              // 계측 결과
let frameIdx = 0;
let playing = null;
let showTraders = true;

/* ── 요약 카드 ───────────────────────────────────────────── */
function drawCards() {
  const w = P.world;
  const cards = [
    ['가장 위험한 항로', pct(w.routes[0].odds, 1), `${w.routes[0].aName}~${w.routes[0].bName}`],
    ['10항차 누적', pct(P.events.cumulative.find((c) => c.n === 10).p, 0), '한 번 이상 만날 확률'],
    ['배회하는 해적', `${w.pirateCount}척`, `평균 ${w.meanSailing.toFixed(1)}척이 항해 중`],
    ['평균 조우확률', pct(w.routes.reduce((s, r) => s + r.odds, 0) / w.routes.length, 1), `${w.routes.length}개 항로 · 사료 요율 기반`],
    ['구간 점유율', pct(w.meanOcc, 1), `NPC가 실제로 떠 있던 비율`],
    ['NPC 습격 성공', `${w.raids.length}건`, `${w.days}일 동안 · 하루 ${pct(w.raidBase, 0)}`],
    ['최고 현상금', fmt(w.roster[0]?.bountyHi ?? 0), `${w.roster[0]?.name ?? '-'} · 전과 ${w.roster[0]?.kills ?? 0}`],
  ];
  const box = $('p-cards');
  box.replaceChildren(...cards.map(([k, v, s]) => {
    const c = el('div', 'card');
    c.append(el('div', 'k', k), el('div', 'v', `${v}<small>${s}</small>`));
    return c;
  }));
}

/* ── 1. 해상 이벤트 확률 ─────────────────────────────────── */
function drawEvents() {
  const W = 560, rowH = 26, H = P.events.rows.length * rowH + 16;
  const s = svg(W, H);
  const max = Math.max(...P.events.rows.map((r) => r.actual));
  P.events.rows.forEach((r, i) => {
    const y = 8 + i * rowH;
    const isPirate = r.id === 'pirate';
    s.append(node('text', {
      x: 92, y: y + 14, 'text-anchor': 'end', fill: isPirate ? '#e08282' : '#8b8394',
      'font-size': 11.5,
    }, r.name));
    const bw = (r.actual / max) * 360;
    s.append(node('rect', {
      x: 100, y: y + 4, width: Math.max(1, bw), height: 14, rx: 2,
      fill: isPirate ? 'rgba(224,130,130,.75)' : 'rgba(127,178,216,.4)',
    }));
    s.append(node('text', {
      x: 106 + bw, y: y + 15, fill: isPirate ? '#e08282' : '#ded2b8', 'font-size': 11,
    }, `${(r.actual * 100).toFixed(2)}%`));
    s.append(node('text', {
      x: W - 4, y: y + 15, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10,
    }, `weight ${r.weight}`));
  });
  const box = $('p-events');
  box.replaceChildren(s);
  const warn = P.events.weightSumIs100
    ? `weight 합이 <b>${P.events.total}</b> — weight가 곧 퍼센트다.`
    : `<b style="color:#e0a45c">weight 합이 ${P.events.total}이라 weight ≠ 퍼센트다.</b> 항목을 추가하면 모든 이벤트 빈도가 함께 흔들린다.`;
  box.append(el('p', 'legend', `20만 회 실측 · ${warn}`));
}

function drawCumulative() {
  const W = 560, H = 190, pad = { l: 40, r: 14, t: 12, b: 26 };
  const s = svg(W, H);
  const xs = (i) => pad.l + (i / (P.events.cumulative.length - 1)) * (W - pad.l - pad.r);
  const ys = (p) => H - pad.b - p * (H - pad.t - pad.b);
  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    s.append(node('line', { x1: pad.l, y1: ys(g), x2: W - pad.r, y2: ys(g), stroke: '#2e2839' }));
    s.append(node('text', { x: pad.l - 6, y: ys(g) + 4, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 }, `${g * 100}%`));
  }
  const d = P.events.cumulative.map((c, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(c.p)}`).join(' ');
  s.append(node('path', { d, fill: 'none', stroke: '#e08282', 'stroke-width': 2 }));
  P.events.cumulative.forEach((c, i) => {
    s.append(node('circle', { cx: xs(i), cy: ys(c.p), r: 3, fill: '#e08282' }));
    s.append(node('text', { x: xs(i), y: H - 8, 'text-anchor': 'middle', fill: '#8b8394', 'font-size': 10 }, c.n));
    if ([3, 5, 10, 20].includes(c.n)) {
      s.append(node('text', { x: xs(i), y: ys(c.p) - 8, 'text-anchor': 'middle', fill: '#ded2b8', 'font-size': 10 }, pct(c.p, 0)));
    }
  });
  $('p-cum').replaceChildren(s);
}

/* ── 2. 등급표 ───────────────────────────────────────────── */
function drawTierTable() {
  const t = el('table', 'list');
  t.innerHTML = `<thead><tr>
    <th>등급</th><th>이름</th><th>깃발</th><th class="n">선체</th><th class="n">포</th>
    <th class="n">선원</th><th class="n">무장도</th><th class="n">현상금</th><th>나포</th><th>전리품</th>
  </tr></thead>`;
  const tb = el('tbody');
  const maxPow = Math.max(...P.table.map((r) => r.power));
  for (const r of P.table) {
    const tr = el('tr');
    const col = TIER_COLOR[r.rank - 1];
    tr.innerHTML = `
      <td><span style="color:${col}">●</span> ${r.rank}</td>
      <td>${r.name}</td>
      <td class="d">${r.nation}</td>
      <td class="n">${r.hp}</td>
      <td class="n">${r.guns}</td>
      <td class="n">${r.crew}</td>
      <td class="n" style="background:${mono(r.power / maxPow, '224,164,92')}">${r.power}</td>
      <td class="n y">${fmt(r.lootLo)}~${fmt(r.lootHi)}</td>
      <td class="d">${r.prize ?? '—'}</td>
      <td class="d" style="font-size:11px">${r.goods.join(' · ')}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  $('p-tiers').replaceChildren(t);
}

/* ── 3. 자산별 등급 출현 확률 ────────────────────────────── */
function drawTierMix() {
  const leaky = $('p-leak').classList.contains('on');
  const rows = P.tiers.rows.filter((r) => r.leaky === leaky);
  const W = 560, rowH = 30, H = rows.length * rowH + 30;
  const s = svg(W, H);
  const barX = 88, barW = W - barX - 12;

  rows.forEach((r, i) => {
    const y = 20 + i * rowH;
    s.append(node('text', { x: barX - 8, y: y + 14, 'text-anchor': 'end', fill: '#ded2b8', 'font-size': 11 }, fmt(r.wealth)));
    let acc = 0;
    P.table.forEach((t, ti) => {
      const p = r.dist[t.id] || 0;
      if (p <= 0) return;
      const x = barX + acc * barW, w = p * barW;
      const rect = node('rect', { x, y: y + 2, width: w, height: 18, fill: TIER_COLOR[ti], opacity: 0.82 });
      withTip(rect, `<b>${t.name}</b><br>자산 ${fmt(r.wealth)}닢에서 <b>${pct(p, 1)}</b><br>` +
        `<span style="color:#8b8394">현상금 ${fmt(t.lootLo)}~${fmt(t.lootHi)} · 무장도 ${t.power}</span>`);
      s.append(rect);
      if (p > 0.13) {
        s.append(node('text', {
          x: x + w / 2, y: y + 15, 'text-anchor': 'middle', fill: '#14121a', 'font-size': 10, 'font-weight': 700,
        }, pct(p, 0)));
      }
      acc += p;
    });
  });
  s.append(node('text', { x: barX - 8, y: 13, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 }, '자산'));
  $('p-mix').replaceChildren(s);

  const lg = el('div', 'legend');
  lg.innerHTML = P.table.map((t, i) =>
    `<span><i style="background:${TIER_COLOR[i]}"></i>${t.name}</span>`).join('');
  $('p-mix').append(lg);
}

/* ── 4. 지도 — NPC 해적 위치 ─────────────────────────────── */
const S = 3;                       // 게임 논리 400×225 → 화면 배율

function drawMap() {
  const w = P.world;
  const s = svg(400 * S, 225 * S);
  s.append(node('rect', { x: 0, y: 0, width: 400 * S, height: 225 * S, fill: '#101a24' }));

  // 항로 — 조우 확률이 높을수록 붉고 굵게 (사료 요율 기반)
  const maxOcc = Math.max(...w.routes.map((r) => r.odds)) || 1;
  for (const r of w.routes) {
    const t = r.odds / maxOcc;
    const line = node('line', {
      x1: r.ax * S, y1: r.ay * S, x2: r.bx * S, y2: r.by * S,
      stroke: t > 0.02 ? `rgba(224,130,130,${0.15 + 0.75 * t})` : 'rgba(127,178,216,.13)',
      'stroke-width': 1 + 4 * t,
    });
    withTip(line, `<b>${r.aName} ~ ${r.bName}</b><br>` +
      (r.risk === null ? '내해·육로 — 해적 없음'
        : `보험료율 <b>${r.risk}%</b> → 조우 <b>${pct(r.odds, 1)}</b>` +
          (r.oddsNow > r.odds ? `<br>지금 해적이 떠 있어 <b>${pct(r.oddsNow, 1)}</b>` : '')) +
      `<br><span style="color:#8b8394">NPC가 떠 있던 날 ${pct(r.occupancy, 1)}</span>`);
    s.append(line);
  }

  // 도시
  for (const c of w.cities) {
    s.append(node('circle', { cx: c.x * S, cy: c.y * S, r: 4, fill: '#1d1a26', stroke: '#8b8394', 'stroke-width': 1.5 }));
    s.append(node('text', {
      x: c.x * S, y: c.y * S - 9, 'text-anchor': 'middle', fill: '#8b8394', 'font-size': 11,
    }, c.name));
  }

  // NPC — 프레임 하나를 그린다
  const g = node('g', { id: 'p-npcs' });
  s.append(g);
  $('p-map').replaceChildren(s);
  drawFrame();
}

function drawFrame() {
  const g = document.getElementById('p-npcs');
  if (!g) return;
  const f = P.world.frames[frameIdx];
  if (!f) return;
  g.replaceChildren();

  for (const n of f.npcs) {
    if (n.kind === 'trader' && !showTraders) continue;
    const pirate = n.kind === 'pirate';
    if (pirate) {
      // 전과가 쌓일수록 크게 — 현상금이 곧 덩치다
      const r = 5 + Math.min(9, n.kills * 1.6);
      g.append(node('circle', { cx: n.x * S, cy: n.y * S, r, fill: 'rgba(224,130,130,.18)' }));
    }
    const dot = node('circle', {
      cx: n.x * S, cy: n.y * S, r: pirate ? 4.5 : 3,
      fill: pirate ? '#e08282' : '#ded2b8',
      stroke: pirate ? '#5c1f1f' : '#3b3348', 'stroke-width': 1,
      opacity: n.sailing ? 1 : 0.45,
    });
    withTip(dot, pirate
      ? `<b>${n.name}</b> (해적)<br>보유 ${fmt(n.gold)}닢 · 전과 ${n.kills}<br>` +
        `<span style="color:#8b8394">${n.sailing ? '항해 중' : '정박 중'}</span>`
      : `<b>${n.name}</b> (상인)<br>보유 ${fmt(n.gold)}닢`);
    g.append(dot);
  }
  $('p-day').textContent = `${f.day}일차`;
  $('p-slider').value = frameIdx;
}

function stopPlay() {
  if (playing) { clearInterval(playing); playing = null; }
  $('p-play').textContent = '▶ 재생';
  $('p-play').classList.remove('on');
}

function togglePlay() {
  if (playing) return stopPlay();
  $('p-play').textContent = '❚❚ 정지';
  $('p-play').classList.add('on');
  playing = setInterval(() => {
    frameIdx = (frameIdx + 1) % P.world.frames.length;
    drawFrame();
  }, 90);
}

/* ── 5. 항로별 해적 밀도 ─────────────────────────────────── */
function drawRoutes() {
  const t = el('table', 'list');
  t.innerHTML = `<thead><tr>
    <th>항로</th><th class="n">요율</th><th class="n">조우확률</th>
    <th class="n">해적이 떠 있던 날</th><th></th></tr></thead>`;
  const tb = el('tbody');
  const maxO = Math.max(...P.world.routes.map((r) => r.odds)) || 1;
  for (const r of P.world.routes) {
    const tr = el('tr');
    const inland = r.risk === null;
    const bar = `<div style="height:9px;border-radius:2px;width:${(r.odds / maxO) * 100}%;
      background:rgba(224,130,130,${0.22 + 0.65 * (r.odds / maxO)})"></div>`;
    tr.innerHTML = `<td>${r.aName} ~ ${r.bName}</td>
      <td class="n ${inland ? 'd' : 'b'}">${inland ? '내해' : `${r.risk}%`}</td>
      <td class="n ${r.odds >= 0.24 ? 'r' : r.odds >= 0.16 ? 'o' : inland ? 'd' : 'g'}">${pct(r.odds, 1)}</td>
      <td class="n ${r.occupancy > 0 ? 'y' : 'd'}">${r.occupancy > 0 ? pct(r.occupancy, 1) : '—'}</td>
      <td style="width:26%">${inland ? '<span class="d">—</span>' : bar}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  $('p-routes').replaceChildren(t);
  $('p-routes').append(el('p', 'legend',
    '<b>요율</b>은 당대 해상보험료율(사료) · <b>조우확률</b>은 그 환산값 · ' +
    '<b>떠 있던 날</b>은 NPC가 실제로 그 구간에 있던 비율. 앞 둘은 고정이고 뒤는 세계가 도는 대로 바뀐다.'));
}

/* ── 6. 해적 명부 ────────────────────────────────────────── */
function drawRoster() {
  const t = el('table', 'list');
  t.innerHTML = `<thead><tr>
    <th>해적</th><th>배</th><th class="n">선체</th><th class="n">포</th><th class="n">선원</th>
    <th class="n">전과</th><th class="n">현상금</th><th>나포 시</th><th>지금</th>
  </tr></thead>`;
  const tb = el('tbody');
  const topTier = P.table[P.table.length - 1];
  for (const r of P.world.roster) {
    const tr = el('tr');
    const over = r.bountyHi > topTier.lootHi;
    tr.innerHTML = `
      <td>${r.name}</td>
      <td class="d">${r.shipName}</td>
      <td class="n">${r.hp}</td>
      <td class="n">${r.guns}</td>
      <td class="n">${r.crew}</td>
      <td class="n ${r.kills ? 'o' : 'd'}">${r.kills}</td>
      <td class="n ${over ? 'r' : 'y'}">${fmt(r.bountyLo)}~${fmt(r.bountyHi)}</td>
      <td class="d">${r.prize}</td>
      <td class="d">${r.to ? `${r.at} → ${r.to}` : `${r.at} 정박`}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  $('p-roster').replaceChildren(t);

  const over = P.world.roster.filter((r) => r.bountyHi > topTier.lootHi);
  if (over.length) {
    $('p-roster').append(el('p', 'legend',
      `<span class="r">붉은 현상금 ${over.length}건</span>은 최상위 등급(${topTier.name} ` +
      `${fmt(topTier.lootLo)}~${fmt(topTier.lootHi)})보다 큽니다 — ` +
      `NPC 해적은 턴 만큼 부유해지므로 상한이 없습니다.`));
  }
}

/* ── 7. 지도와 조우의 연결 ───────────────────────────────── */
function drawLinkage() {
  const L = P.linkage;
  const W = 560, H = 74;
  const s = svg(W, H);
  const barW = W - 20;
  s.append(node('rect', { x: 10, y: 16, width: barW * L.real, height: 26, fill: '#e08282', rx: 2 }));
  s.append(node('rect', { x: 10 + barW * L.real, y: 16, width: barW * L.phantom, height: 26, fill: '#3b3348', rx: 2 }));
  s.append(node('text', { x: 16, y: 34, fill: '#14121a', 'font-size': 11, 'font-weight': 700 }, pct(L.real, 0)));
  s.append(node('text', { x: W - 16, y: 34, 'text-anchor': 'end', fill: '#8b8394', 'font-size': 11 }, pct(L.phantom, 0)));
  s.append(node('text', { x: 10, y: 60, fill: '#e08282', 'font-size': 11 }, '지도에서 보던 그 해적'));
  s.append(node('text', { x: W - 10, y: 60, 'text-anchor': 'end', fill: '#8b8394', 'font-size': 11 }, '허공에서 생긴 떠돌이'));
  $('p-link').replaceChildren(s);
}

/* ── 실행 ────────────────────────────────────────────────── */
export function runPirates() {
  $('p-stamp').textContent = '돌리는 중…';
  requestAnimationFrame(() => {
    const t0 = performance.now();
    P = measureAll({ rolls: 200000, tierRolls: 8000, days: +$('p-days').value });
    frameIdx = 0;
    drawCards();
    drawEvents();
    drawCumulative();
    drawTierTable();
    drawTierMix();
    drawMap();
    drawRoutes();
    drawRoster();
    drawLinkage();
    $('p-slider').max = P.world.frames.length - 1;
    $('p-stamp').textContent = `${P.world.days}일 · ${Math.round(performance.now() - t0)}ms`;
  });
}

export function bindPirateControls() {
  $('p-run').onclick = () => { stopPlay(); runPirates(); };
  $('p-days').oninput = () => { $('p-daysN').textContent = $('p-days').value; };
  $('p-days').onchange = () => { stopPlay(); runPirates(); };
  $('p-slider').oninput = () => { stopPlay(); frameIdx = +$('p-slider').value; drawFrame(); };
  $('p-play').onclick = togglePlay;
  $('p-traders').onclick = () => {
    showTraders = !showTraders;
    $('p-traders').classList.toggle('on', showTraders);
    drawFrame();
  };
  $('p-leak').onclick = () => {
    $('p-leak').classList.toggle('on');
    if (P) drawTierMix();
  };
}

export function pirateStopPlay() { stopPlay(); }
export function pirateLoaded() { return !!P; }
