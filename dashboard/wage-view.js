// wage-view.js — 보수 탭 그리기
//
// 계측은 `wages.mjs`, 사료 대조값은 `content/wage-evidence.json`이 정본이고
// 여기서는 그리기만 한다. 이 탭이 답해야 하는 질문은 둘이다:
//   ① 에이미의 급여는 당대 사료에 비추어 말이 되는가 (배율로만 비교한다)
//   ② 그 값을 치르고 데리고 다닐 만한가 (같은 시드로 짝지어 잰다)

import { measureAll, goodsTable } from './wages.mjs';
import { $, fmt, pct, el, svg, node, withTip } from './shared.js';

let Wg = null;   // 계측 결과
let EV = null;   // 근거 정본

let PV = null;   // 교역품 물가 근거 정본(goods-evidence.json)

fetch('../content/wage-evidence.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => { EV = j; if (Wg) { drawCards(); drawHistory(); drawEvidence(); } })
  .catch(() => {});

fetch('../content/goods-evidence.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => { PV = j; if (Wg) drawPrices(); })
  .catch(() => {});

const BADGE = {
  confirmed: ['●', '확인', 'g'],
  probable: ['○', '개연', 'b'],
  corrected: ['◆', '바로잡음', 'y'],
  gameplay: ['▲', '게임성', 'o'],
};

/** 근거 JSON은 사람이 읽는 문서와 같은 문법으로 쓴다 — **강조**만 살려서 옮긴다 */
const md = (s = '') => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

/** 문장형 설명. shared.js의 .legend는 flex(색 견본 나열용)라
    문장을 넣으면 낱말마다 14px씩 벌어진다 — 그래서 문단용을 따로 둔다. */
const para = (html) => el('p', 'legend para', html);

/* ── 요약 카드 ───────────────────────────────────────────── */
function drawCards() {
  const { ladder, pay, paired } = Wg;
  const anchors = EV?.anchors ?? [];
  const old = anchors.find((a) => a.id === 'med_c1500');
  const late = anchors.find((a) => a.id === 'armada_1634');
  const cards = [
    ['부관 일당', `${ladder.officerWage}<small>닢/일</small>`, `선원 ${ladder.crewWage}닢의 ${ladder.ratio.toFixed(1)}배`],
    ['c.1500 사료', old ? `${old.ratio[0]}~${old.ratio[1]}<small>배</small>` : '—', '게임 배경에 맞는 시대'],
    ['1634 사료', late ? `${late.ratio[0]}<small>배</small>` : '—', '게임과 사실상 같은 자리'],
    ['성과급', `${(ladder.cut * 100).toFixed(0)}<small>%</small>`, '매각 이익에서만'],
    [`${pay.voyages}항차 총보수`, fmt(pay.takeHome), `급여 ${fmt(pay.paid)} + 성과급 ${fmt(pay.earned)}`],
    ['성과급 비중', pct(pay.cutShare, 0), '봉급보다 사무역이 컸던 시대'],
    ['항해비 중 부관 몫', pct(pay.voyageCostShare, 0), '일당·보급·선단과 나란히'],
    ['데려간 값어치', `${paired.rows.at(-1).med >= 0 ? '+' : ''}${fmt(paired.rows.at(-1).med)}`,
      `${paired.voyages}항차 총자산 차이 · ${paired.rows.at(-1).wins}/${paired.pairs}승`],
  ];
  $('w-cards').replaceChildren(...cards.map(([k, v, s]) => {
    const c = el('div', 'card');
    c.append(el('div', 'k', k), el('div', 'v', `${v}<small>${s}</small>`));
    return c;
  }));
}

/* ── 1. 하루치 보수 사다리 ───────────────────────────────── */
function drawLadder() {
  const rows = Wg.ladder.rows;
  const W = 560, rowH = 34, H = rows.length * rowH + 22;
  const s = svg(W, H);
  const barX = 118, barW = W - barX - 78;
  const max = Math.max(...rows.map((r) => r.perDay));
  rows.forEach((r, i) => {
    const y = 12 + i * rowH;
    const on = r.key === 'officer';
    s.append(node('text', { x: barX - 10, y: y + 13, 'text-anchor': 'end', fill: on ? '#f4dd86' : '#ded2b8', 'font-size': 12 }, r.who));
    s.append(node('text', { x: barX - 10, y: y + 25, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 }, r.sub));
    const w = (r.perDay / max) * barW;
    const rect = node('rect', {
      x: barX, y: y + 3, width: Math.max(2, w), height: 18, rx: 2,
      fill: on ? 'rgba(244,221,134,.8)' : r.key === 'crew' ? 'rgba(127,178,216,.55)' : 'rgba(127,178,216,.25)',
    });
    withTip(rect, `<b>${r.who}</b><br>하루 ${r.perDay}닢 · 선원의 <b>${r.mult.toFixed(2)}배</b>`);
    s.append(rect);
    s.append(node('text', { x: barX + w + 8, y: y + 17, fill: '#ded2b8', 'font-size': 11.5 }, `${r.perDay}닢`));
    s.append(node('text', { x: W - 4, y: y + 17, 'text-anchor': 'end', fill: on ? '#f4dd86' : '#5f5870', 'font-size': 11 },
      `×${r.mult.toFixed(2)}`));
  });
  $('w-ladder').replaceChildren(s);
  $('w-ladder').append(para(
    `급여는 <code>voyageCost()</code>에서 <b>선원 일당과 따로</b> 나간다 — 뭉치면 "부관을 데리고 있는 값"을 읽을 수 없다. ` +
    `보급은 급여가 아니라 먹이는 값이라 비교 대상이 아니다(참고로만 실었다).`));
}

/* ── 2. 사료 대조 — 오직 배율로만 ────────────────────────── */
function drawHistory() {
  if (!EV) return;
  const W = 560, H = 168, pad = { l: 16, r: 16, t: 34, b: 42 };
  const s = svg(W, H);
  const hi = Math.max(Wg.ladder.ratio, ...EV.anchors.map((a) => a.ratio[1])) * 1.18;
  const xs = (v) => pad.l + (v / hi) * (W - pad.l - pad.r);
  const axisY = H - pad.b;

  s.append(node('line', { x1: pad.l, y1: axisY, x2: W - pad.r, y2: axisY, stroke: '#3b3348' }));
  for (let v = 0; v <= hi; v += 1) {
    s.append(node('line', { x1: xs(v), y1: axisY, x2: xs(v), y2: axisY + 4, stroke: '#3b3348' }));
    if (v % 2 === 0) s.append(node('text', { x: xs(v), y: axisY + 17, 'text-anchor': 'middle', fill: '#5f5870', 'font-size': 10 }, `×${v}`));
  }
  s.append(node('text', { x: W - pad.r, y: axisY + 33, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 },
    '선원 일당을 1로 놓았을 때 부선장이 받는 배수'));

  // 사료 구간 — 폭이 3px밖에 안 되는 앵커(단일값)도 있으므로 이름표는 밴드 **위**에 얹는다.
  // 오른쪽 끝에 붙은 앵커는 이름표가 화면 밖으로 나가므로 왼쪽으로 뒤집는다.
  EV.anchors.forEach((a, i) => {
    const y = pad.t + i * 30;
    const x0 = xs(a.ratio[0]), x1 = xs(a.ratio[1]);
    const band = node('rect', { x: x0 - 2, y: y - 6, width: Math.max(4, x1 - x0 + 4), height: 14, rx: 2, fill: 'rgba(127,178,216,.45)' });
    const range = a.ratio[0] === a.ratio[1] ? `×${a.ratio[0]}` : `×${a.ratio[0]}~${a.ratio[1]}`;
    withTip(band, `<b>${a.label}</b> ${range}<br><span style="color:#8b8394">${md(a.basis)}</span><br>${md(a.vsGame)}`);
    s.append(band);
    const flip = x1 > W * 0.62;
    s.append(node('text', {
      x: flip ? x0 - 6 : x1 + 6, y: y + 5,
      'text-anchor': flip ? 'end' : 'start', fill: '#7fb2d8', 'font-size': 11,
    }, `${a.label} ${range}`));
  });

  // 게임 값
  const gx = xs(Wg.ladder.ratio);
  s.append(node('line', { x1: gx, y1: pad.t - 22, x2: gx, y2: axisY, stroke: '#f4dd86', 'stroke-width': 2 }));
  s.append(node('text', { x: gx, y: pad.t - 26, 'text-anchor': 'middle', fill: '#f4dd86', 'font-size': 11.5 },
    `게임 ×${Wg.ladder.ratio.toFixed(2)}`));

  $('w-hist').replaceChildren(s);
  const g = EV.findings.find((f) => f.id === 'gap_widened');
  $('w-hist').append(para(
    `${g ? g.basis : ''} <b>게임 화폐 '닢'은 실화폐가 아니므로 절대액은 비교하지 않는다</b> — 대조는 언제나 배율로만 한다.`));
}

/* ── 3. 에이미 수입 구성 ─────────────────────────────────── */
function drawIncome() {
  const S = Wg.pay.series;
  const W = 560, H = 220, pad = { l: 52, r: 12, t: 14, b: 26 };
  const s = svg(W, H);
  const max = Math.max(...S.map((r) => r.paid + r.earned)) || 1;
  const xs = (i) => pad.l + (i / Math.max(1, S.length - 1)) * (W - pad.l - pad.r);
  const ys = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);

  for (let g = 0; g <= 4; g++) {
    const v = (max / 4) * g;
    s.append(node('line', { x1: pad.l, y1: ys(v), x2: W - pad.r, y2: ys(v), stroke: '#2e2839' }));
    s.append(node('text', { x: pad.l - 6, y: ys(v) + 4, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 }, fmt(v)));
  }

  const area = (pick, fill) => {
    let d = `M${xs(0)},${ys(0)}`;
    S.forEach((r, i) => { d += ` L${xs(i)},${ys(pick(r))}`; });
    d += ` L${xs(S.length - 1)},${ys(0)} Z`;
    s.append(node('path', { d, fill }));
  };
  area((r) => r.paid + r.earned, 'rgba(244,221,134,.30)');   // 총액
  area((r) => r.paid, 'rgba(127,178,216,.45)');              // 급여

  const line = (pick, stroke) => {
    const d = S.map((r, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(pick(r))}`).join(' ');
    s.append(node('path', { d, fill: 'none', stroke, 'stroke-width': 1.6 }));
  };
  line((r) => r.paid, '#7fb2d8');
  line((r) => r.paid + r.earned, '#f4dd86');

  // 성과급이 급여를 넘어서는 시점
  const cx = Wg.pay.crossover;
  if (cx) {
    const i = S.findIndex((r) => r.v === cx.v);
    s.append(node('line', { x1: xs(i), y1: pad.t, x2: xs(i), y2: H - pad.b, stroke: '#e0a45c', 'stroke-dasharray': '3 3' }));
    s.append(node('text', { x: xs(i) + 5, y: pad.t + 10, fill: '#e0a45c', 'font-size': 10 },
      `${cx.v}항차 — 성과급이 급여를 넘는다`));
  }
  for (const [i, r] of S.entries()) {
    const hit = node('rect', { x: xs(i) - 3, y: pad.t, width: 6, height: H - pad.t - pad.b, fill: 'transparent' });
    withTip(hit, `<b>${r.v}항차</b> (${r.day}일차)<br>급여 누적 <b>${fmt(r.paid)}</b>닢<br>` +
      `성과급 누적 <b>${fmt(r.earned)}</b>닢<br><span style="color:#8b8394">합 ${fmt(r.paid + r.earned)}닢</span>`);
    s.append(hit);
  }
  $('w-income').replaceChildren(s);
  $('w-income').append(para(
    `<span style="color:#7fb2d8">■</span> 급여(고정) &nbsp; <span style="color:#f4dd86">■</span> 급여+성과급 &nbsp;` +
    ` 이 판에서 에이미가 가져간 몫은 총매출의 <b>${pct(Wg.pay.revenueShare, 1)}</b>이고, 그중 ` +
    `<b>${pct(Wg.pay.cutShare, 0)}</b>가 성과급이다.`));
}

/* ── 4. 항해비 안에서 부관 몫 ────────────────────────────── */
function drawCostMix() {
  const t = Wg.pay.totals;
  const parts = [
    ['선원 일당', t.wages, '#7fb2d8'],
    ['보급', t.supplies, '#7fd8a0'],
    ['선체 유지', t.hull, '#9f8fc0'],
    ['무장 유지', t.arms, '#c08f8f'],
    ['적하보험', t.insurance, '#e0a45c'],
    ['선단 유지비', t.fleet, '#8b8394'],
    ['부관 급여', t.officer, '#f4dd86'],
  ];
  const sum = parts.reduce((a, p) => a + p[1], 0) || 1;
  const W = 560, H = 92;
  const s = svg(W, H);
  let acc = 0;
  for (const [name, v, col] of parts) {
    const x = 8 + (acc / sum) * (W - 16), w = (v / sum) * (W - 16);
    const rect = node('rect', { x, y: 16, width: w, height: 28, fill: col, opacity: 0.85 });
    withTip(rect, `<b>${name}</b><br>${fmt(v)}닢 · 항해비의 <b>${pct(v / sum, 1)}</b>`);
    s.append(rect);
    if (w > 42) s.append(node('text', { x: x + w / 2, y: 35, 'text-anchor': 'middle', fill: '#14121a', 'font-size': 10.5, 'font-weight': 700 }, pct(v / sum, 0)));
    acc += v;
  }
  parts.forEach(([name, , col], i) => {
    const x = 8 + (i % 4) * 138, y = 56 + Math.floor(i / 4) * 16;
    s.append(node('rect', { x, y, width: 9, height: 9, rx: 2, fill: col }));
    s.append(node('text', { x: x + 14, y: y + 8, fill: '#8b8394', 'font-size': 10.5 }, name));
  });
  $('w-cost').replaceChildren(s);
  $('w-cost').append(para(
    `배·수리·고용은 뺀 <b>순수 항해비</b>만 갈랐다. 임금을 사료 쪽으로 내린 대신 ` +
    `<b>성장할수록 무거워지는 갈래</b>를 세웠다 — 선체 유지는 배가 커질수록, 무장 유지는 포를 실을수록, ` +
    `적하보험은 <b>값나가는 짐을 위험한 구간으로 나를수록</b> 오른다(요율은 당대 해상보험 그대로). ` +
    `부관 급여는 한 명분 고정이라 규모가 커질수록 저절로 가벼워진다.`));
}

/* ── 5. 부관 유무 짝지어 비교 ────────────────────────────── */
function drawPaired() {
  const P = Wg.paired;

  // 판정문은 고정 문구로 두지 않는다 — 콘텐츠가 바뀌면 뒤집히는 항차도 바뀌기 때문이다
  // (실제로 몰타·항로 개편 뒤 20항차 판정이 이득에서 손해로 뒤집혔다).
  const early = P.rows.find((r) => r.v === 10) ?? P.rows[0];
  const last = P.rows.at(-1);
  $('w-verdict').innerHTML =
    `<b>${early.v}항차에서 ${early.med >= 0 ? '이미 이득' : `${fmt(-early.med)}닢 손해`}` +
    `(${early.wins}/${early.n}쌍)</b>, ${last.v}항차에서 ` +
    `<b>${last.med >= 0 ? '+' : ''}${fmt(last.med)}닢(${last.wins}/${last.n}쌍)</b>. ` +
    (P.breakEven
      ? `중앙값이 처음으로 이득으로 돌아서는 곳은 <b>${P.breakEven.v}항차</b>입니다. `
      : `이 판에서는 끝까지 이득으로 돌아서지 않았습니다 — 쌍 수를 늘려 다시 보세요. `) +
    `급여가 1일차부터 나가는데 벌이가 아직 없어 초반이 손해인 것은 버그가 아니라 설계입니다 ` +
    `(“같이 굶다가 같이 번다”). 쌍이 적으면 중반 구간은 배 구입 타이밍 때문에 크게 흔들립니다.`;
  const W = 560, H = 230, pad = { l: 58, r: 12, t: 16, b: 30 };
  const s = svg(W, H);
  const vals = P.curve.map((c) => c.med);
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const xs = (i) => pad.l + (i / Math.max(1, P.curve.length - 1)) * (W - pad.l - pad.r);
  const ys = (v) => H - pad.b - ((v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);

  for (let g = 0; g <= 4; g++) {
    const v = lo + ((hi - lo) / 4) * g;
    s.append(node('line', { x1: pad.l, y1: ys(v), x2: W - pad.r, y2: ys(v), stroke: '#2e2839' }));
    s.append(node('text', { x: pad.l - 6, y: ys(v) + 4, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 }, fmt(v)));
  }
  s.append(node('line', { x1: pad.l, y1: ys(0), x2: W - pad.r, y2: ys(0), stroke: '#5f5870', 'stroke-dasharray': '4 3' }));

  // 손해 구간을 붉게 칠한다 — "초반은 예외 없이 손해"가 눈에 보여야 한다
  let d = `M${xs(0)},${ys(0)}`;
  P.curve.forEach((c, i) => { d += ` L${xs(i)},${ys(c.med)}`; });
  d += ` L${xs(P.curve.length - 1)},${ys(0)} Z`;
  s.append(node('path', { d, fill: 'rgba(224,130,130,.16)' }));
  s.append(node('path', {
    d: P.curve.map((c, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(c.med)}`).join(' '),
    fill: 'none', stroke: '#f4dd86', 'stroke-width': 1.8,
  }));

  if (P.breakEven) {
    const i = P.breakEven.v - 1;
    s.append(node('line', { x1: xs(i), y1: pad.t, x2: xs(i), y2: H - pad.b, stroke: '#7fd8a0', 'stroke-dasharray': '3 3' }));
    s.append(node('text', { x: xs(i) + 5, y: pad.t + 10, fill: '#7fd8a0', 'font-size': 10 }, `${P.breakEven.v}항차부터 이득`));
  }
  P.curve.forEach((c, i) => {
    if (i % 5 && i !== P.curve.length - 1) return;
    s.append(node('text', { x: xs(i), y: H - 10, 'text-anchor': 'middle', fill: '#5f5870', 'font-size': 9.5 }, c.v));
  });
  P.curve.forEach((c, i) => {
    const hit = node('rect', { x: xs(i) - 3, y: pad.t, width: 6, height: H - pad.t - pad.b, fill: 'transparent' });
    withTip(hit, `<b>${c.v}항차</b><br>총자산 차이 중앙값 <b>${c.med >= 0 ? '+' : ''}${fmt(c.med)}</b>닢<br>` +
      `<span style="color:#8b8394">${P.pairs}쌍 중 ${Math.round(c.win * P.pairs)}쌍이 이득</span>`);
    s.append(hit);
  });
  $('w-paired').replaceChildren(s);

  const t = el('table', 'list');
  t.innerHTML = `<thead><tr><th>시점</th><th class="n">총자산 차이(중앙값)</th><th class="n">이득인 쌍</th><th class="n">최악</th><th class="n">최선</th></tr></thead>`;
  const tb = el('tbody');
  for (const r of P.rows) {
    const tr = el('tr');
    tr.innerHTML = `<td>${r.v}항차</td>
      <td class="n ${r.med >= 0 ? 'g' : 'r'}">${r.med >= 0 ? '+' : ''}${fmt(r.med)}</td>
      <td class="n ${r.wins * 2 >= r.n ? 'y' : 'd'}">${r.wins}/${r.n}</td>
      <td class="n d">${fmt(r.lo)}</td>
      <td class="n d">${fmt(r.hi)}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  $('w-paired-tbl').replaceChildren(t);
  $('w-paired-tbl').append(para(
    `같은 시드로 <b>같은 세계를 두 번</b> 돌려(부관 있음 − 없음) 차이만 본다. ` +
    `그냥 두 번 돌려 비교하면 "돈이 모이면 즉시 큰 배를 사는" 탓에 기준선이 25%씩 튀어 <b>효과의 부호가 뒤집힌다</b>.`));
}

/* ── 6. 근거 ─────────────────────────────────────────────── */
function drawEvidence() {
  if (!EV) return;
  const box = $('w-evi');
  const t = el('table', 'list');
  t.innerHTML = `<thead><tr><th>항목</th><th>판정</th><th>근거</th><th>게임과의 관계</th></tr></thead>`;
  const tb = el('tbody');
  const add = (label, verdict, basis, impl, sources) => {
    const [mark, name, cls] = BADGE[verdict] ?? ['·', verdict, 'd'];
    const tr = el('tr');
    tr.innerHTML = `<td style="white-space:nowrap">${label}</td>
      <td class="${cls}" style="white-space:nowrap">${mark} ${name}</td>
      <td style="max-width:340px">${md(basis)}</td>
      <td class="d" style="max-width:300px">${md(impl ?? '')}</td>`;
    if (sources?.length) {
      withTip(tr, `<b>출처</b><br>${sources.map((s) => `${s.title}${s.note ? ` — ${s.note}` : ''}`).join('<br>')}`);
    }
    tb.append(tr);
  };
  for (const a of EV.anchors) {
    add(`${a.label} <span class="d">×${a.ratio[0] === a.ratio[1] ? a.ratio[0] : `${a.ratio[0]}~${a.ratio[1]}`}</span>`,
      a.verdict, a.basis, a.vsGame, a.sources);
  }
  for (const f of EV.findings) add(f.label, f.verdict, f.basis, f.implication, f.sources);
  t.append(tb);
  box.replaceChildren(t);

  const cav = el('div', 'warnbox');
  cav.innerHTML = `<b>이 표를 인용할 때</b><br>` +
    EV.caveats.map((c) => `· ${md(c)}`).join('<br>');
  box.append(cav);
  box.append(para(
    `정본은 <code>content/wage-evidence.json</code> · 코드와의 불일치는 <code>node tools/check-wages.mjs</code>가 잡는다. ` +
    `행에 올리면 출처가 뜬다.`));
}

/* ── 7. 물가 대조 ────────────────────────────────────────────
   게임 기준가가 사료의 위계와 같은 순서인가. 절대액이 아니라 **곡물의 몇 배인가**로만 본다. */
function drawPrices() {
  if (!PV) return;
  const T = PV.gameTargets.goodsRatioToGrain;
  const rows = goodsTable();
  const W = 560, rowH = 22, H = rows.length * rowH + 28;
  const s = svg(W, H);
  const barX = 74, barW = W - barX - 96;
  const max = Math.max(...rows.map((r) => r.ratio)) * 1.05;

  s.append(node('text', { x: barX - 8, y: 12, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 }, '품목'));
  s.append(node('text', { x: W - 4, y: 12, 'text-anchor': 'end', fill: '#5f5870', 'font-size': 10 }, '곡물 대비 · 기준가'));

  rows.forEach((r, i) => {
    const y = 22 + i * rowH;
    const w = (r.ratio / max) * barW;
    s.append(node('text', { x: barX - 8, y: y + 11, 'text-anchor': 'end', fill: '#ded2b8', 'font-size': 11 }, r.name));
    const rect = node('rect', { x: barX, y: y + 2, width: Math.max(2, w), height: 12, rx: 2, fill: 'rgba(127,178,216,.5)' });
    const target = T[r.id];
    // 사료 항목은 제 이름(pepper)으로 실려 있고 게임 품목 id(spice)와 다르다 — goodId로 잇는다
    const anchor = Object.values(PV.anchors).find((a) => a.goodId === r.id) || null;
    withTip(rect, `<b>${r.name}</b> — 기준가 ${r.base}닢 · 곡물의 <b>${r.ratio.toFixed(2)}배</b>` +
      (target != null ? `<br>목표 ${target}배` : '') +
      (anchor ? `<br><span style="color:#8b8394">사료: ${anchor.price}` +
        (anchor.ratioToWheat ? ` → 밀의 ${anchor.ratioToWheat}배` : '') + '</span>' +
        (anchor.note ? `<br>${md(anchor.note)}` : '') : ''));
    s.append(rect);
    // 사료 원값 표식 — 게임이 사료를 얼마나 눌렀는지 한눈에
    if (anchor?.ratioToWheat != null) {
      const ax = barX + (anchor.ratioToWheat / max) * barW;
      if (ax <= barX + barW) {
        s.append(node('line', { x1: ax, y1: y, x2: ax, y2: y + 16, stroke: '#e0a45c', 'stroke-width': 1.5 }));
      }
    }
    s.append(node('text', { x: W - 4, y: y + 12, 'text-anchor': 'end', fill: '#8b8394', 'font-size': 10.5 },
      `×${r.ratio.toFixed(2)} · ${r.base}닢`));
  });
  $('w-prices').replaceChildren(s);
  $('w-prices').append(para(
    `<span style="color:#e0a45c">주황 선</span>은 사료의 원 비율이다 — 소금(밀의 4.3배)과 향신료(30배)는 ` +
    `그대로 넣으면 항로 하나가 경제를 삼켜서 <b>절반쯤만 반영</b>했다(방향은 사료, 폭은 게임). ` +
    `와인은 반대로 사료가 훨씬 싸다(산지 벌크 기준 0.3배) — 원거리로 나른 상품 와인이라 보고 최저선까지 내리지 않았다. ` +
    `정본은 <code>content/goods-evidence.json</code> · 검증 <code>node tools/check-prices.mjs</code>.`));
}

/* ── 실행 ────────────────────────────────────────────────── */
export function runWages() {
  $('w-stamp').textContent = '돌리는 중…';
  requestAnimationFrame(() => {
    const t0 = performance.now();
    Wg = measureAll({ voyages: +$('w-voy').value, pairs: +$('w-pairs').value });
    drawCards();
    drawLadder();
    drawHistory();
    drawIncome();
    drawCostMix();
    drawPaired();
    drawPrices();
    drawEvidence();
    $('w-stamp').textContent =
      `${Wg.pay.voyages}항차 · ${Wg.paired.pairs}쌍 · ${Math.round(performance.now() - t0)}ms`;
  });
}

export function bindWageControls() {
  $('w-run').onclick = runWages;
  $('w-voy').oninput = () => { $('w-voyN').textContent = $('w-voy').value; };
  $('w-voy').onchange = runWages;
  $('w-pairs').oninput = () => { $('w-pairsN').textContent = $('w-pairs').value; };
  $('w-pairs').onchange = runWages;
}

export function wageLoaded() { return !!Wg; }
