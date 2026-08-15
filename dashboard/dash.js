// dash.js — 경제 대시보드
//
// 게임 모듈을 그대로 import해서 시뮬레이션을 돌리고 그 결과를 관측한다.
// 여기서 규칙을 다시 구현하지 않는다 — 그러면 "대시보드에서는 맞는데 게임에서는 다른"
// 상태가 생겨 지표를 믿을 수 없게 된다. 계측만 한다.

import { CITIES, GOODS, GOOD_BY_ID, CITY_BY_ID, SHIPS, MARKET } from '../js/data.js';
import { state, marketDepth, tariffRate, tierNeeded, sellsShip, shipPriceAt, shipLockedBy } from '../js/state.js';
import { measure, statsOf, starvedCells, allCells } from './measure.mjs';
/* 그리기 도구는 `shared.mjs`가 정본 — 해적 탭과 같은 것을 써야 한 화면으로 보인다 */
import { $, fmt, el, heat, mono, svg, node } from './shared.mjs';

/* 근거 데이터 — 수치가 왜 그 값인지. content/city-evidence.json이 정본이고
   `node tools/check-evidence.mjs`가 코드와의 불일치를 잡는다. 여기서는 읽기만 한다. */
let EV = null;
const VERDICT_STYLE = {
  confirmed: { mark: '●', cls: 'g',  label: '사료 확인' },
  corrected: { mark: '◆', cls: 'y',  label: '조사로 바로잡음' },
  probable:  { mark: '○', cls: 'b',  label: '개연성' },
  gameplay:  { mark: '▲', cls: 'o',  label: '게임성 예외' },
};
const evidenceOf = (cid, gid) => EV?.cities?.[cid]?.goods?.[gid] ?? null;

/* ── 현금 흐름 차트 ───────────────────────────────────────── */
function drawChart(M) {
  const box = $('chart');
  box.innerHTML = '';
  const W = 1000, H = 260, L = 62, R = 14, T = 14, B = 26;
  const s = svg(W, H);

  const pts = M.rows.map((r) => ({ v: r.v, gold: r.gold }));
  if (!pts.length) { box.append(el('div', 'empty', '항차가 없다.')); return; }
  const maxV = pts[pts.length - 1].v;
  const maxY = Math.max(
    ...pts.map((p) => p.gold),
    ...M.npcSeries.map((n) => n.max),
  ) * 1.06 || 1;

  const X = (v) => L + (v / maxV) * (W - L - R);
  const Y = (g) => H - B - (g / maxY) * (H - T - B);

  // 격자
  for (let i = 0; i <= 4; i++) {
    const g = (maxY / 4) * i;
    s.append(node('line', { x1: L, y1: Y(g), x2: W - R, y2: Y(g), stroke: '#2a2434', 'stroke-width': 1 }));
    s.append(node('text', {
      x: L - 7, y: Y(g) + 3.5, fill: '#8b8394', 'font-size': 10, 'text-anchor': 'end',
    }, fmt(g)));
  }
  for (let i = 0; i <= 5; i++) {
    const v = Math.round((maxV / 5) * i);
    s.append(node('text', { x: X(v), y: H - 8, fill: '#8b8394', 'font-size': 10, 'text-anchor': 'middle' }, `${v}항차`));
  }

  // NPC 상인 자산 최고~최저 띠
  const band = M.npcSeries.filter((n) => n.v > 0);
  if (band.length) {
    const up = band.map((n) => `${X(n.v)},${Y(n.max)}`).join(' ');
    const dn = [...band].reverse().map((n) => `${X(n.v)},${Y(n.min)}`).join(' ');
    s.append(node('polygon', { points: `${up} ${dn}`, fill: 'rgba(127,178,216,.13)' }));
    s.append(node('polyline', {
      points: band.map((n) => `${X(n.v)},${Y(n.med)}`).join(' '),
      fill: 'none', stroke: '#7fb2d8', 'stroke-width': 1.6, 'stroke-dasharray': '4 3',
    }));
  }

  // 배를 갈아탄 시점
  for (const [key, g] of Object.entries(M.got)) {
    s.append(node('line', { x1: X(g.v), y1: T, x2: X(g.v), y2: H - B, stroke: '#4b4160', 'stroke-width': 1 }));
    s.append(node('text', {
      x: X(g.v) + 3, y: T + 10, fill: '#8b8394', 'font-size': 9.5,
    }, SHIPS[key].name));
  }

  // 주인공 자산
  s.append(node('polyline', {
    points: pts.map((p) => `${X(p.v)},${Y(p.gold)}`).join(' '),
    fill: 'none', stroke: '#f4dd86', 'stroke-width': 2,
  }));

  box.append(s);
  box.append(el('div', 'legend',
    '<span><i style="background:#f4dd86"></i>주인공 소지 금화</span>'
    + '<span><i style="background:#7fb2d8"></i>NPC 상인 자산 중앙값(띠 = 최저~최고)</span>'
    + '<span><i style="background:#4b4160"></i>배를 갈아탄 시점</span>'));
}

/* ── 항차별 수지 ─────────────────────────────────────────── */
function drawBars(M) {
  const box = $('bars');
  box.innerHTML = '';
  const rows = M.rows;
  if (!rows.length) { box.append(el('div', 'empty', '항차가 없다.')); return; }
  const W = 1000, H = 170, L = 62, R = 14, T = 12, B = 20;
  const s = svg(W, H);

  const net = rows.map((r) => r.gain - r.spend - r.wages - r.supplies - r.fleetCost
    - (r.hullCost || 0) - (r.armsCost || 0) - (r.insCost || 0)
    - (r.officerCost || 0) - r.shipSpend - r.repairSpend - r.hireSpend);
  const lim = Math.max(1, ...net.map((n) => Math.abs(n)));
  const bw = Math.max(1.2, (W - L - R) / rows.length - 1.4);
  const Y0 = T + (H - T - B) / 2;
  const Y = (n) => Y0 - (n / lim) * ((H - T - B) / 2);

  s.append(node('line', { x1: L, y1: Y0, x2: W - R, y2: Y0, stroke: '#3b3348', 'stroke-width': 1 }));
  for (const sgn of [1, -1]) {
    s.append(node('text', {
      x: L - 7, y: Y(sgn * lim) + 3.5, fill: '#8b8394', 'font-size': 10, 'text-anchor': 'end',
    }, (sgn > 0 ? '+' : '−') + fmt(lim)));
  }

  rows.forEach((r, i) => {
    const n = net[i];
    const x = L + (i / rows.length) * (W - L - R);
    const y = n >= 0 ? Y(n) : Y0;
    s.append(node('rect', {
      x, y, width: bw, height: Math.max(1, Math.abs(Y(n) - Y0)),
      fill: n >= 0 ? 'rgba(127,216,160,.72)' : 'rgba(224,130,130,.72)',
    }));
  });

  box.append(s);
  const tot = net.reduce((a, b) => a + b, 0);
  const lose = net.filter((n) => n < 0).length;
  box.append(el('div', 'legend',
    `<span><i style="background:rgba(127,216,160,.72)"></i>흑자 항차</span>`
    + `<span><i style="background:rgba(224,130,130,.72)"></i>적자 항차 ${lose}회 / ${rows.length}회</span>`
    + `<span class="d">누적 순이익 ${fmt(tot)}닢</span>`));
}

/* ── 매트릭스 ────────────────────────────────────────────── */
let MODE = 'price';

function cellData(M, cid, gid) {
  const st = statsOf(M.priceSeries[cid][gid]);
  const f = M.flow[cid][gid];
  const base = GOOD_BY_ID[gid].base;
  const city = CITY_BY_ID[cid];
  return {
    st, f, base,
    mul: st.last / base,
    net: (f.inP + f.inN) - (f.outP + f.outN),
    vol: f.inP + f.inN + f.outP + f.outN,
    press: M.pressMax[cid][gid],
    tag: city.supply[gid] ? 's' : city.demand[gid] ? 'd' : null,
    raw: city.supply[gid] ?? city.demand[gid] ?? null,
  };
}

function drawMatrix(M) {
  const t = $('matrix');
  t.innerHTML = '';
  const head = el('tr');
  head.append(el('th', 'city corner', ''));
  for (const g of GOODS) head.append(el('th', '', `${g.name}<br><span style="opacity:.55">${g.base}</span>`));
  t.append(head);

  // 모드별 스케일 기준
  let volMax = 1, pressMax = 1;
  for (const c of CITIES) for (const g of GOODS) {
    const d = cellData(M, c.id, g.id);
    volMax = Math.max(volMax, Math.abs(d.net));
    pressMax = Math.max(pressMax, d.press);
  }

  for (const c of CITIES) {
    const tr = el('tr');
    tr.append(el('th', 'city', `${c.name}<br><span style="opacity:.5;font-size:10px">size ${c.size} · 세 ${Math.round(tariffRate(c.id) * 100)}%</span>`));
    for (const g of GOODS) {
      const d = cellData(M, c.id, g.id);
      const td = el('td', d.tag ? `tag-${d.tag}` : '');
      let main = '', sub = '', bg = 'transparent';

      if (MODE === 'price') {
        main = fmt(d.st.last);
        sub = `×${d.mul.toFixed(2)}`;
        bg = heat((d.mul - 1) * 1.6);
      } else if (MODE === 'mul') {
        main = `×${d.mul.toFixed(2)}`;
        sub = d.raw ? `설정 ${d.raw}` : '기준';
        bg = heat((d.mul - 1) * 1.6);
      } else if (MODE === 'range') {
        main = `${Math.round(d.st.band * 100)}%`;
        sub = `${fmt(d.st.min)}~${fmt(d.st.max)}`;
        bg = mono(d.st.band / 0.45, '244,221,134');
      } else if (MODE === 'flow') {
        main = d.vol ? (d.net > 0 ? '+' : '') + fmt(d.net) : '·';
        sub = d.vol ? `거래 ${fmt(d.vol)}` : '거래 없음';
        bg = d.vol ? heat(-d.net / volMax) : 'transparent';
      } else if (MODE === 'press') {
        main = d.press ? d.press.toFixed(0) : '·';
        sub = d.press ? `${Math.round(Math.min(MARKET.cap, MARKET.impact * d.press / marketDepth(c.id)) * 100)}% 벌점` : '—';
        bg = mono(d.press / pressMax, '224,164,92');
      } else {
        const e = evidenceOf(c.id, g.id);
        const v = e && VERDICT_STYLE[e.verdict];
        main = v ? `<span class="${v.cls}">${v.mark}</span>` : '<span class="d">·</span>';
        sub = e ? (e.sources?.length ? `출처 ${e.sources.length}` : '출처 없음') : '';
        bg = e ? (e.verdict === 'gameplay' ? 'rgba(224,164,92,.22)'
          : e.verdict === 'corrected' ? 'rgba(244,221,134,.20)'
          : e.verdict === 'confirmed' ? 'rgba(127,216,160,.16)' : 'rgba(127,178,216,.12)') : 'transparent';
      }

      td.style.background = bg;
      td.innerHTML = `<div class="num">${main}</div><div class="sub2">${sub}</div>`;
      td.onmouseenter = (ev) => showTip(ev, c, g, d);
      td.onmousemove = moveTip;
      td.onmouseleave = hideTip;
      tr.append(td);
    }
    t.append(tr);
  }

  const notes = {
    price: '마지막 항차 시점의 단가와 기준가 대비 배율',
    mul: '기준가 대비 실제 배율 — data.js의 supply/demand 설정이 SPREAD로 조여진 결과',
    range: '시뮬 전 기간 변동폭 (최고−최저)/평균. 좁으면 시장이 안 움직인다는 뜻',
    flow: '순유입 = 그 도시에 팔린 양 − 그 도시에서 사간 양 (주인공+NPC 합)',
    press: '누적 거래 압력의 최고치와 그때 단가에 붙는 벌점',
    evi: '이 수치가 왜 이 값인지 — content/city-evidence.json. 칸에 올리면 근거와 출처가 뜬다',
  };
  $('mxNote').textContent = notes[MODE];

  const legends = {
    price: '<span><i style="background:rgba(110,178,216,.55)"></i>싸다(산지)</span><span><i style="background:rgba(224,110,70,.55)"></i>비싸다(수요지)</span>',
    mul: '<span><i style="background:rgba(110,178,216,.55)"></i>×1 미만</span><span><i style="background:rgba(224,110,70,.55)"></i>×1 초과</span>',
    range: '<span><i style="background:rgba(244,221,134,.55)"></i>많이 움직였다</span>',
    flow: '<span><i style="background:rgba(224,110,70,.55)"></i>순유입(팔려 들어온다)</span><span><i style="background:rgba(110,178,216,.55)"></i>순유출(실려 나간다)</span>',
    press: '<span><i style="background:rgba(224,164,92,.55)"></i>거래가 몰린 칸</span>',
    evi: '<span class="g">● 사료 확인</span><span class="y">◆ 조사로 바로잡음</span>'
       + '<span class="b">○ 개연성</span><span class="o">▲ 게임성 예외</span>',
  };
  $('legend').innerHTML = legends[MODE]
    + '<span><i style="box-shadow:inset 0 0 0 1.5px rgba(127,178,216,.9);background:transparent"></i>산지 설정</span>'
    + '<span><i style="box-shadow:inset 0 0 0 1.5px rgba(224,164,92,.9);background:transparent"></i>수요지 설정</span>';
}

/* ── 툴팁 ────────────────────────────────────────────────── */
function showTip(ev, c, g, d) {
  const tip = $('tip');
  const tagTxt = d.tag === 's' ? `<span class="b">산지 ${d.raw}</span>`
    : d.tag === 'd' ? `<span class="o">수요지 ${d.raw}</span>` : '<span class="d">기준가</span>';
  tip.innerHTML = `<b>${c.name} · ${g.name}</b> ${tagTxt}<br>`
    + `단가 ${fmt(d.st.last)}닢 (기준 ${d.base} · ×${d.mul.toFixed(2)})<br>`
    + `변동 ${fmt(d.st.min)}~${fmt(d.st.max)}닢 · 폭 ${Math.round(d.st.band * 100)}%<br>`
    + `유입 ${fmt(d.f.inP + d.f.inN)} <span class="d">(주인공 ${fmt(d.f.inP)} / NPC ${fmt(d.f.inN)})</span><br>`
    + `유출 ${fmt(d.f.outP + d.f.outN)} <span class="d">(주인공 ${fmt(d.f.outP)} / NPC ${fmt(d.f.outN)})</span><br>`
    + `최대 압력 ${d.press.toFixed(1)} / 깊이 ${marketDepth(c.id)}`;
  const e = evidenceOf(c.id, g.id);
  if (e) {
    const v = VERDICT_STYLE[e.verdict];
    tip.innerHTML += `<hr style="border:0;border-top:1px solid #2e2839;margin:6px 0">`
      + `<span class="${v?.cls || 'd'}">${v?.mark || ''} ${v?.label || e.verdict}</span><br>`
      + `<span style="opacity:.9">${e.basis || ''}</span>`
      + (e.sources?.length ? `<br><span class="d">출처: ${e.sources.map((x) => x.title).join(' · ')}</span>` : '');
  }
  tip.style.display = 'block';
  moveTip(ev);
}
function moveTip(ev) {
  const tip = $('tip');
  const x = Math.min(ev.clientX + 14, window.innerWidth - 300);
  const y = Math.min(ev.clientY + 14, window.innerHeight - 130);
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}
function hideTip() { $('tip').style.display = 'none'; }

/* ── 진단: 부족한데 아무도 안 나르는 곳 ──────────────────── */
function drawStarve(M) {
  const box = $('starve');
  box.innerHTML = '';
  const bad = starvedCells(M);
  const starving = bad.filter((b) => b.inQty === 0);

  if (starving.length) {
    box.append(el('div', 'warnbox',
      `수요지로 선언된 <b>${bad.length}칸</b> 중 <b>${starving.length}칸</b>에 시뮬 내내 물자가 한 톨도 안 들어왔다. `
      + '그 도시는 비싸게 사줄 준비가 돼 있는데 항로·이웃 관계상 아무도 거기까지 나르지 않는다는 뜻이다.'));
  }

  const t = el('table', 'list');
  t.innerHTML = '<tr><th>도시</th><th>품목</th><th style="text-align:right">수요 배율</th>'
    + '<th style="text-align:right">유입</th><th style="text-align:right">유출</th><th>판정</th></tr>';
  for (const b of bad.slice(0, 26)) {
    const verdict = b.inQty === 0
      ? '<span class="r">아무도 안 나른다</span>'
      : b.inQty < 40 ? '<span class="o">간신히 닿는다</span>' : '<span class="g">공급된다</span>';
    const tr = el('tr');
    tr.innerHTML = `<td>${b.city.name}</td><td>${GOOD_BY_ID[b.goodId].name}</td>`
      + `<td class="n o">${b.mul}</td><td class="n">${fmt(b.inQty)}</td>`
      + `<td class="n d">${fmt(b.outQty)}</td><td>${verdict}</td>`;
    t.append(tr);
  }
  const p = el('div', 'panel');
  p.style.overflow = 'auto';
  p.append(t);
  box.append(p);
}

/* ── 진단: 가격이 안 움직이는 칸 ─────────────────────────── */
function drawFlat(M) {
  const box = $('flat');
  box.innerHTML = '';
  const all = allCells(M).map((a) => ({ c: a.city, g: a.good, band: a.st.band, vol: a.vol, press: a.press }));
  const dead = all.filter((a) => a.vol === 0).length;
  box.append(el('div', 'warnbox',
    `전체 <b>${all.length}칸</b> 중 <b>${dead}칸</b>은 시뮬 내내 거래가 0이었다. `
    + `이 칸들의 가격은 3일 주기 난수(<code>wobble</code> ±15%)로만 흔들린다 — `
    + `시장 깊이(<code>MARKET</code>)가 전혀 작동하지 않는 영역이다.`));

  all.sort((a, b) => a.band - b.band);
  const t = el('table', 'list');
  t.innerHTML = '<tr><th>도시</th><th>품목</th><th style="text-align:right">변동폭</th>'
    + '<th style="text-align:right">거래량</th><th style="text-align:right">최대 압력</th></tr>';
  for (const a of all.slice(0, 14)) {
    const tr = el('tr');
    tr.innerHTML = `<td>${a.c.name}</td><td>${a.g.name}</td>`
      + `<td class="n ${a.band < 0.2 ? 'r' : ''}">${Math.round(a.band * 100)}%</td>`
      + `<td class="n ${a.vol ? '' : 'd'}">${a.vol ? fmt(a.vol) : '—'}</td>`
      + `<td class="n d">${a.press ? a.press.toFixed(0) : '—'}</td>`;
    t.append(tr);
  }
  const p = el('div', 'panel');
  p.style.overflow = 'auto';
  p.append(t);
  box.append(p);
}

/* ── 선박표 ──────────────────────────────────────────────── */
function drawShips(M) {
  const t = $('ships');
  t.innerHTML = '<tr><th>선종</th><th>시대</th><th>원산</th><th style="text-align:right">필요 공업력</th>'
    + '<th>지을 수 있는 항구</th><th style="text-align:right">가격</th>'
    + '<th style="text-align:right">화물</th><th style="text-align:right">선원</th><th style="text-align:right">포문</th>'
    + '<th style="text-align:right">속력</th><th>해금</th><th>구입 시점</th></tr>';
  for (const [key, s] of Object.entries(SHIPS)) {
    const g = M.got[key];
    // 시뮬이 끝난 시점 기준 — 그 판에서 실제로 어디서 지을 수 있었는지
    const where = CITIES.filter((c) => (c.industry ?? 0) >= tierNeeded(key, c.id));
    const cheapest = where.length
      ? where.map((c) => ({ c, p: shipPriceAt(key, c.id) })).sort((a, b) => a.p - b.p)[0] : null;
    const lock = shipLockedBy(key);
    const tr = el('tr');
    tr.innerHTML = `<td class="y">${s.name}</td>`
      + `<td class="${s.era === 'modern' ? 'o' : 'd'}">${s.era === 'modern' ? '신형' : '재래'}</td>`
      + `<td class="d">${s.origin}</td>`
      + `<td class="n">${s.tier ? s.tier : '<span class="d">—</span>'}</td>`
      + `<td style="font-size:11px">${where.length ? `${where.length}곳 <span class="d">· 최저 ${cheapest.c.name} ${fmt(cheapest.p)}닢</span>` : '<span class="d">—</span>'}</td>`
      + `<td class="n">${fmt(s.price)}</td><td class="n">${s.cargo}</td>`
      + `<td class="n">${s.crew}~${s.crewMax}</td><td class="n">${s.guns}</td>`
      + `<td class="n">${s.speed}</td>`
      + `<td style="font-size:11px">${lock ? `<span class="o">${lock} 필요</span>` : '<span class="g">열림</span>'}</td>`
      + `<td>${g ? `<span class="g">${g.v}항차 · ${g.day}일차</span>` : '<span class="d">—</span>'}</td>`;
    t.append(tr);
  }
}

/* ── NPC ─────────────────────────────────────────────────── */
function drawNpcs() {
  const t = $('npcs');
  t.innerHTML = '<tr><th>이름</th><th>배</th><th>위치</th><th style="text-align:right">금화</th><th>화물</th></tr>';
  const list = [...(state.npcs || [])].sort((a, b) => b.gold - a.gold);
  for (const n of list) {
    const where = n.to
      ? `${CITY_BY_ID[n.at].name} → ${CITY_BY_ID[n.to].name} <span class="d">(${n.days}일)</span>`
      : `${CITY_BY_ID[n.at].name} <span class="d">정박</span>`;
    const cargo = Object.entries(n.cargo || {}).map(([g, q]) => `${GOOD_BY_ID[g].name} ${q}`).join(', ') || '<span class="d">빈 배</span>';
    const tr = el('tr');
    tr.innerHTML = `<td class="${n.kind === 'pirate' ? 'r' : 'y'}">${n.name}${n.kind === 'pirate' ? ' <span class="d">해적</span>' : ''}</td>`
      + `<td class="d">${SHIPS[n.shipKey].name}</td><td style="font-size:11px">${where}</td>`
      + `<td class="n">${fmt(n.gold)}</td><td style="font-size:11px">${cargo}</td>`;
    t.append(tr);
  }
}

function drawNews(M) {
  const t = $('news');
  t.innerHTML = '<tr><th style="text-align:right">일차</th><th>사건</th></tr>';
  const ev = M.events.slice(-140).reverse();
  for (const e of ev) {
    let txt;
    if (e.kind === 'raid') {
      txt = `<span class="r">${e.who}</span>가 ${CITY_BY_ID[e.at].name}~${CITY_BY_ID[e.to].name} 항로에서 `
        + `${e.victim}호를 털었다${e.loot ? ` <span class="d">(${e.loot})</span>` : ''}`;
    } else {
      const verb = e.kind === 'sold' ? '<span class="g">풀었다</span>' : '<span class="b">사들였다</span>';
      txt = `${e.who}호가 ${CITY_BY_ID[e.city].name}에서 ${GOOD_BY_ID[e.goodId].name} ${e.qty}개를 ${verb}`;
    }
    const tr = el('tr');
    tr.innerHTML = `<td class="n d">${e.day}</td><td style="font-size:11.5px">${txt}</td>`;
    t.append(tr);
  }
}

/* ── 요약 카드 ───────────────────────────────────────────── */
function drawCards(M) {
  const box = $('cards');
  box.innerHTML = '';
  const last = M.rows[M.rows.length - 1];
  const npcLast = M.npcSeries[M.npcSeries.length - 1] || {};
  const raids = M.events.filter((e) => e.kind === 'raid').length;
  const trades = M.events.filter((e) => e.kind !== 'raid').length;
  const totVol = CITIES.reduce((a, c) => a + GOODS.reduce((b, g) => {
    const f = M.flow[c.id][g.id];
    return b + f.inP + f.inN + f.outP + f.outN;
  }, 0), 0);

  const cards = [
    ['주인공 소지 금화', fmt(last?.gold ?? 0), '닢'],
    ['타고 있는 배', last ? SHIPS[last.ship].name : '—', ''],
    ['항차 / 일차', `${last?.v ?? 0} / ${last?.day ?? 0}`, ''],
    ['NPC 상인 자산 중앙값', fmt(npcLast.med ?? 0), '닢'],
    ['NPC 상인 / 해적', `${npcLast.n ?? 0} / ${npcLast.pirates ?? 0}`, '척'],
    ['NPC 거래 건수', fmt(trades), '건'],
    ['해적 습격', fmt(raids), '회'],
    ['총 물동량', fmt(totVol), '개'],
  ];
  for (const [k, v, u] of cards) {
    const c = el('div', 'card');
    c.innerHTML = `<div class="k">${k}</div><div class="v">${v}${u ? `<small>${u}</small>` : ''}</div>`;
    box.append(c);
  }
}

/* ── 실행 ────────────────────────────────────────────────── */
let M = null;

function run() {
  const n = +$('voy').value;
  $('stamp').textContent = '돌리는 중…';
  // 렌더를 한 프레임 넘겨 "돌리는 중" 표시가 실제로 보이게 한다
  requestAnimationFrame(() => {
    const t0 = performance.now();
    M = measure(n);
    drawCards(M);
    drawChart(M);
    drawBars(M);
    drawMatrix(M);
    drawStarve(M);
    drawFlat(M);
    drawShips(M);
    drawNpcs();
    drawNews(M);
    $('stamp').textContent = `${M.rows.length}항차 · ${Math.round(performance.now() - t0)}ms`;
  });
}

$('voy').oninput = () => { $('voyN').textContent = $('voy').value; };
$('voy').onchange = run;
$('run').onclick = run;
for (const b of $('mode').querySelectorAll('button')) {
  b.onclick = () => {
    for (const o of $('mode').querySelectorAll('button')) o.classList.remove('on');
    b.classList.add('on');
    MODE = b.dataset.m;
    if (M) drawMatrix(M);
  };
}

/* 근거 데이터를 먼저 읽는다 — 없어도 대시보드는 돈다(근거 칸만 빈다). */
fetch('../content/city-evidence.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => { EV = j; })
  .catch(() => { EV = null; })
  .finally(run);
