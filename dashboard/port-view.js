// port-view.js — 항구 탭 그리기
//
// 계측은 `ports.mjs`, 근거는 `content/city-evidence.json`·`asset-evidence.json`이 정본이고
// 여기서는 그리기만 한다. 이 탭이 답해야 하는 질문은 셋이다:
//   ① 이 항구는 무엇을 팔고 무엇을 사는가 — 그리고 **그중 무엇이 믿을 만한가**
//   ② 배를 지을 수 있는가 (공업력)
//   ③ 이 도시의 살림 규모는 (부동산 — 아직 게임 기능이 아니라 스케일 기준점)
//
// ★ 교역 항목이 많은 항구가 좋은 항구가 아니다. 그래서 목록을 값 순이 아니라
//   **근거의 신뢰도 순**으로 쌓는다(ports.mjs: RANK). 구색으로 넣은 줄이 위에 오면
//   그 항구를 잘못 읽게 된다.

import { portRows, goodsOf, realEstate, RANK } from './ports.mjs';
import { CREW_WAGE } from '../js/state.js';
import { $, fmt, pct, el, svg, node, withTip, mono } from './shared.mjs';

let EV = null;    // content/city-evidence.json
let AE = null;    // content/asset-evidence.json
let rows = null;  // portRows(EV)
let sel = 'venezia';
let loaded = false;

export const portLoaded = () => loaded;

const BADGE = {
  confirmed: ['●', '확인', 'g'],
  probable: ['○', '개연', 'b'],
  corrected: ['◆', '바로잡음', 'y'],
  gameplay: ['▲', '게임성', 'o'],
};

const FLAG_NAME = {
  venice: '베네치아', genoa: '제노바', france: '프랑스', spain: '스페인',
  ottoman: '오스만', hafsid: '하프스', hospitaller: '성 요한 기사단',
};

const md = (s = '') => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const para = (html) => el('p', 'legend para', html);

/* 등급 3묶음의 색 — 확실한 수요(주황) · 확실한 산지(파랑) · 약함(회색).
   dash.js의 도시별 시세 매트릭스가 수요=주황/공급=파랑을 쓰므로 같은 축을 지킨다. */
const RANK_COLOR = ['224,164,92', '127,178,216', '139,131,148'];

/* ── 근거 읽기 ───────────────────────────────────────────── */
Promise.all([
  fetch('../content/city-evidence.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  fetch('../content/asset-evidence.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
]).then(([c, a]) => {
  EV = c; AE = a;
  if (loaded) drawAll();
});

/* ── 진입점 ──────────────────────────────────────────────── */
export function runPorts() {
  loaded = true;
  drawAll();
}

function drawAll() {
  rows = portRows(EV);
  drawCards();
  drawList();
  drawDetail();
  drawIndustry();
  drawEstate();
  drawEvidence();
}

/* ── 요약 카드 ───────────────────────────────────────────── */
function drawCards() {
  const items = rows.reduce((n, r) => n + r.goods.length, 0);
  const solid = rows.reduce((n, r) => n + r.solid, 0);
  const yards = rows.filter((r) => r.yard.buildable.length).length;
  const prize = rows.filter((r) => r.yard.prizeYard).length;
  const cards = [
    ['항구', rows.length, ''],
    ['교역 항목', items, '공급 + 수요'],
    ['근거가 확실한 항목', solid, `${pct(solid / items, 0)} — 출처가 달린 확인·바로잡음`],
    ['배를 지을 수 있는 항구', yards, `공업력 1 이상`],
    ['나포선 경매항', prize, '중고가 더 싸게 나온다'],
  ];
  $('p2-cards').replaceChildren(...cards.map(([k, v, s]) => {
    const c = el('div', 'card');
    c.innerHTML = `<div class="k">${k}</div><div class="v">${fmt(v)}${s ? ` <small>${s}</small>` : ''}</div>`;
    return c;
  }));
}

/* ── 항구 일람 ───────────────────────────────────────────── */
function drawList() {
  const t = el('table', 'list');
  t.innerHTML = `<thead><tr>
    <th>항구</th><th>세력</th><th class="n">규모</th><th class="n">항로</th>
    <th class="n">입항세</th><th class="n">공업력</th><th class="n">교역품</th><th>근거</th>
  </tr></thead>`;
  const tb = el('tbody');
  for (const r of rows) {
    const tr = el('tr');
    tr.style.cursor = 'pointer';
    if (r.id === sel) tr.style.background = '#2a2338';
    const ind = r.yard.industry;
    tr.innerHTML = `
      <td><b class="${r.id === sel ? 'y' : ''}">${r.name}</b> <span class="d">${r.region}</span></td>
      <td class="d">${FLAG_NAME[r.flag] ?? r.flag}</td>
      <td class="n">${'★'.repeat(r.size)}</td>
      <td class="n">${r.routes}</td>
      <td class="n">${pct(r.tariff, 1)}</td>
      <td class="n">${ind === 0 ? '<span class="d">—</span>' : '●'.repeat(ind)}${r.yard.prizeYard ? ' <span class="o" title="나포선 경매항">⚑</span>' : ''}</td>
      <td class="n">${r.goods.length}</td>
      <td>${solidBar(r)}</td>`;
    tr.onclick = () => { sel = r.id; drawList(); drawDetail(); };
    tb.append(tr);
  }
  t.append(tb);
  $('p2-list').replaceChildren(t);
}

/** 확실 / 약함 비율을 한 칸에 — 어느 항구가 재조사 대상인지 표에서 바로 보이게 */
function solidBar(r) {
  const w = 78;
  const solidW = r.goods.length ? Math.round((r.solid / r.goods.length) * w) : 0;
  return `<span style="display:inline-block;width:${w}px;height:8px;background:rgba(139,131,148,.35);border-radius:2px;vertical-align:0;overflow:hidden">
      <span style="display:block;width:${solidW}px;height:100%;background:rgba(127,216,160,.85)"></span>
    </span> <span class="d" style="font-size:11px">${r.solid}/${r.goods.length}</span>`;
}

/* ── 항구 상세 ───────────────────────────────────────────── */
function drawDetail() {
  const r = rows.find((x) => x.id === sel);
  const box = $('p2-detail');
  box.replaceChildren();

  const head = el('div');
  head.innerHTML = `<h3 style="margin:0 0 3px;font-size:15px;color:var(--gold)">${r.name}
      <span class="d" style="font-size:12px;font-weight:400">${r.region} · ${FLAG_NAME[r.flag] ?? r.flag}</span></h3>
    <p class="legend para" style="margin:0 0 10px">
      규모 ${'★'.repeat(r.size)} · 항로 ${r.routes}개 ·
      입항세 ${pct(r.tariff, 1)}<span class="d">(규모별 기본율 — 부관 특전은 빼고 본다)</span> ·
      시장 깊이 ${r.depth.toFixed(1)}<span class="d">(클수록 한 번에 많이 팔아도 값이 덜 무너진다)</span>
      ${r.yard.prizeYard ? ' · <b class="o">나포선 경매항</b>' : ''}
    </p>`;
  box.append(head);

  // 교역품 — 신뢰 등급 3묶음
  for (const rank of [0, 1, 2]) {
    const list = r.goods.filter((g) => g.rank === rank);
    if (!list.length) continue;
    const meta = RANK[rank];
    const h = el('div');
    h.innerHTML = `<div style="margin:12px 0 5px;font-size:12px">
        <b style="color:rgb(${RANK_COLOR[rank]})">${meta.label}</b>
        <span class="d" style="font-size:11px"> ${meta.note}</span></div>`;
    box.append(h);
    box.append(goodsTable(list, rank));
  }

  if (r.weak && !r.solid) {
    const w = el('div', 'warnbox');
    w.style.marginTop = '10px';
    w.innerHTML = `<b>이 항구는 근거가 하나도 확실하지 않다.</b><br>
      교역품 ${r.goods.length}줄이 전부 개연 수준이거나 구색이다 — 재조사 대상이다.`;
    box.append(w);
  }

  // 공업력
  box.append(yardBlock(r));
}

function goodsTable(list, rank) {
  const t = el('table', 'list');
  t.style.width = '100%';
  t.innerHTML = `<thead><tr>
    <th>품목</th><th class="n">배율</th><th style="width:120px"></th><th class="n">기준가</th><th>판정</th>
  </tr></thead>`;
  const tb = el('tbody');
  for (const g of list) {
    const tr = el('tr');
    const [mark, name, cls] = BADGE[g.verdict] ?? ['·', '근거없음', 'd'];
    // 산지는 1보다 작고 수요는 1보다 크다 — 막대는 1에서의 거리로 그린다
    const w = Math.min(100, Math.round(g.strength * 190));
    tr.innerHTML = `
      <td>${g.name} <span class="d" style="font-size:10.5px">${g.side === 'supply' ? '산지' : '수요'}</span></td>
      <td class="n ${g.side === 'supply' ? 'b' : 'o'}">×${g.value.toFixed(2)}</td>
      <td><span style="display:inline-block;width:${w}px;height:7px;border-radius:2px;background:rgba(${RANK_COLOR[rank]},.8)"></span></td>
      <td class="n d">${g.base}</td>
      <td class="${cls}" style="white-space:nowrap">${mark} ${name}${g.sources.length ? ` <span class="d">[${g.sources.length}]</span>` : ''}</td>`;
    withTip(tr, () => {
      const src = g.sources.length
        ? `<br><br><b>출처</b><br>${g.sources.map((s) => `${s.title}${s.note ? ` — ${s.note}` : ''}`).join('<br>')}`
        : '<br><br><span style="opacity:.7">출처 없음</span>';
      return `<b>${g.name}</b> ${g.side === 'supply' ? '산지' : '수요'} ×${g.value.toFixed(2)}<br>${md(g.basis || '근거 서술이 없다')}${src}`;
    });
    tb.append(tr);
  }
  t.append(tb);
  return t;
}

function yardBlock(r) {
  const y = r.yard;
  const box = el('div');
  box.innerHTML = `<div style="margin:14px 0 5px;font-size:12px">
      <b class="y">공업력 ${y.industry}</b>
      <span class="d" style="font-size:11px"> ${['내륙이라 배를 짓지 못한다', '소형까지', '대형 상선까지', '최상급까지'][y.industry]}
      · 값은 공업력에 여유가 있을수록 싸고 전통 조선지는 한 번 더 깎인다</span></div>`;

  if (!y.buildable.length && !y.locked.length) {
    box.append(el('p', 'empty', '이 항구에서는 어떤 배도 짓지 못한다.'));
    return box;
  }

  const t = el('table', 'list');
  t.style.width = '100%';
  t.innerHTML = `<thead><tr>
    <th>선종</th><th class="n">요구</th><th class="n">화물칸</th><th class="n">값</th><th>비고</th>
  </tr></thead>`;
  const tb = el('tbody');
  const add = (s, locked) => {
    const off = s.list ? 1 - s.price / s.list : 0;
    const tr = el('tr');
    tr.innerHTML = `
      <td>${locked ? '<span class="d">🔒 </span>' : ''}${s.name}</td>
      <td class="n d">${s.need}${s.need < s.tier ? ` <span class="g" title="원산국 항구라 −1">↓</span>` : ''}</td>
      <td class="n">${s.cargo}</td>
      <td class="n ${off > 0 ? 'g' : ''}">${fmt(s.price)}${off > 0 ? ` <span class="d" style="font-size:10.5px">−${pct(off, 0)}</span>` : ''}</td>
      <td class="d">${s.tradition ? '<span class="y">전통 조선지</span>' : ''}${locked ? ` ${s.requires} 몰아 본 뒤` : ''}</td>`;
    tb.append(tr);
  };
  for (const s of y.buildable) add(s, false);
  for (const s of y.locked) add(s, true);
  t.append(tb);
  box.append(t);

  if (y.traditions.length) {
    box.append(para(`<b>전통 조선지</b> — ${y.traditions.join(' · ')}. 살 수 있는 곳이 아니라 <b>값이 싸지는 곳</b>이다.`));
  }
  return box;
}

/* ── 공업력 비교 ─────────────────────────────────────────── */
function drawIndustry() {
  const W = 900, rowH = 22, pad = 96;
  const s = svg(W, rows.length * rowH + 26);
  const max = Math.max(...rows.map((r) => r.yard.buildable.length + r.yard.locked.length), 1);
  const barW = W - pad - 130;

  rows.forEach((r, i) => {
    const y = i * rowH + 16;
    s.append(node('text', { x: pad - 8, y: y + 4, 'text-anchor': 'end', fill: '#b9b2c6', 'font-size': 11.5 }, r.name));
    const n = r.yard.buildable.length;
    const nl = r.yard.locked.length;
    const w1 = Math.round((n / max) * barW);
    const w2 = Math.round((nl / max) * barW);
    s.append(node('rect', { x: pad, y: y - 7, width: Math.max(w1, 1), height: 12, rx: 2, fill: mono(0.35 + 0.22 * r.yard.industry, '127,178,216') }));
    if (w2) s.append(node('rect', { x: pad + w1, y: y - 7, width: w2, height: 12, rx: 2, fill: 'rgba(139,131,148,.4)' }));
    s.append(node('text', {
      x: pad + w1 + w2 + 7, y: y + 4, fill: '#8b8394', 'font-size': 11,
    }, `${n}종${nl ? ` (+${nl} 해금 필요)` : ''} · 공업력 ${r.yard.industry}${r.yard.prizeYard ? ' · 나포항' : ''}`));
  });
  $('p2-industry').replaceChildren(s);
  $('p2-industry').append(para(
    `막대는 <b>그 항구에서 지을 수 있는 선종 수</b>. 회색은 공업력은 되지만 ` +
    `<code>requires</code>(그 배를 몰아 본 경험)가 걸려 아직 못 사는 것. ` +
    `정본은 <code>js/map/geo.js: industry</code> · 판정은 <code>js/state.js: yardCapable()</code>.`));
}

/* ── 부동산 ──────────────────────────────────────────────── */
function drawEstate() {
  const box = $('p2-estate');
  if (!AE) { box.replaceChildren(el('p', 'empty', 'asset-evidence.json을 읽지 못했다.')); return; }

  const crewYear = CREW_WAGE * 365;
  const re = realEstate(AE, crewYear);

  const t = el('table', 'list');
  t.style.width = '100%';
  t.innerHTML = `<thead><tr>
    <th>항목</th><th>사료값</th><th class="n">선원 연봉의</th><th class="n">게임 환산</th><th>판정</th>
  </tr></thead>`;
  const tb = el('tbody');
  for (const a of re.rows) {
    const [mark, name, cls] = BADGE[a.verdict] ?? ['·', a.verdict, 'd'];
    const g = a.goldLo == null ? '<span class="d">—</span>'
      : a.goldLo === a.goldHi ? `${fmt(a.goldLo)}닢` : `${fmt(a.goldLo)}~${fmt(a.goldHi)}닢`;
    const tr = el('tr');
    tr.innerHTML = `
      <td>${a.label}</td>
      <td class="d">${a.price}</td>
      <td class="n">${a.lo == null ? '—' : (a.lo === a.hi ? `×${a.lo}` : `×${a.lo}~${a.hi}`)}</td>
      <td class="n y">${g}</td>
      <td class="${cls}" style="white-space:nowrap">${mark} ${name}</td>`;
    if (a.note) withTip(tr, md(a.note));
    tb.append(tr);
  }
  t.append(tb);
  box.replaceChildren(t);

  const w = el('div', 'warnbox');
  w.innerHTML = `<b>부동산은 아직 게임 기능이 아니다.</b><br>
    항구 거점·창고를 넣을 때 쓸 <b>스케일 기준점</b>으로만 둔다. 환산은 배율로만 했다 —
    선원 연봉 ${fmt(crewYear)}닢(일당 ${CREW_WAGE} × 365)을 1로 놓고 곱한 값이다.
    닢은 실화폐가 아니라 절대액 대조는 성립하지 않는다.`;
  box.append(w);
  if (re.rentShare) {
    box.append(para(`<b>${re.rentShare.label}</b> ${re.rentShare.price} — ${md(re.rentShare.note ?? '')}`));
  }
  box.append(para(`정본은 <code>content/asset-evidence.json</code> · 검증 <code>node tools/check-prices.mjs</code>.`));
}

/* ── 근거 현황 ───────────────────────────────────────────── */
function drawEvidence() {
  const box = $('p2-evi');
  const all = rows.flatMap((r) => r.goods);
  const byVerdict = {};
  let noSrc = 0;
  for (const g of all) {
    const k = g.verdict ?? '없음';
    byVerdict[k] = (byVerdict[k] || 0) + 1;
    if (['confirmed', 'corrected'].includes(g.verdict) && !g.sources.length) noSrc++;
  }

  const t = el('table', 'list');
  t.innerHTML = `<thead><tr><th>판정</th><th class="n">항목</th><th class="n">비중</th><th>뜻</th></tr></thead>`;
  const tb = el('tbody');
  for (const [k, n] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) {
    const [mark, name, cls] = BADGE[k] ?? ['·', k, 'd'];
    const tr = el('tr');
    tr.innerHTML = `<td class="${cls}">${mark} ${name}</td><td class="n">${n}</td>
      <td class="n d">${pct(n / all.length, 0)}</td>
      <td class="d">${EV?.verdicts?.[k] ?? ''}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  box.replaceChildren(t);

  if (noSrc) {
    const w = el('div', 'warnbox');
    w.innerHTML = `<b>판정과 출처가 어긋난 항목 ${noSrc}건.</b><br>
      '확인'·'바로잡음'은 출처가 있다는 뜻의 판정인데 <code>sources</code>가 비어 있다.
      이 표에서는 <b>근거가 약한 것</b>으로 내려 세었다 —
      <code>node tools/check-evidence.mjs</code>가 같은 기준으로 실패시킨다.`;
    box.append(w);
  }
  box.append(para(
    `정본은 <code>content/city-evidence.json</code> · 검증 <code>node tools/check-evidence.mjs</code>. ` +
    `<b>교역 항목이 많은 항구가 좋은 항구가 아니다</b> — 목록은 값이 아니라 근거의 신뢰도 순으로 쌓았다.`));
}
