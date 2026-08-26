// overview-view.js — 오버뷰 탭 그리기
//
// 계층·동적생성·상태의 정본은 `architecture.mjs`이고 여기서는 그리기만 한다.
// 스프라이트 캐시만 **실측**이다 — 지금 이 탭에서 재는 값이라 게임을 돌린 만큼만 잡힌다.

import { LAYERS, RUNTIME, STATE_FIELDS } from './architecture.mjs';
import { cacheStats, knownKeys } from '../js/pixel.js';
import { state, resetGame } from '../js/state.js';
import { REGIONS, OCEAN_LANES } from '../js/regions/index.js';
import { $, fmt, el, mono } from './shared.js';
/* 권역 선택은 **공유물**이다 — 오버뷰에서 고른 바다가 다른 탭에서도 그대로여야 한다 */
import { mountRegionBar, injectRegionBarStyle, onRegionChange,
  currentRegion, setRegion } from './region-filter.js';

let loaded = false;
export const overviewLoaded = () => loaded;

const md = (s = '') => s
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

export function runOverview() {
  loaded = true;
  injectRegionBarStyle();
  mountRegionBar($('o-regionbar'), { countOf: (r) => seaRow(r).total });
  onRegionChange(() => { if (loaded) { drawCards(); drawSeas(); } });
  drawCards();
  drawSeas();
  drawTree();
  drawRuntime();
  drawState();
}

/* ── 아홉 바다 한눈에 (C-6) ──────────────────────────────────
   ★ 이 탭은 파일과 상태만 말하고 **세계는 뭉뚱그렸다.** 그런데 이 저장소의 최상위 원칙이
     "콘텐츠는 풍부하게"라 **늘어난 것을 바다별로 세는 자리**가 먼저 있어야 한다.
     계측이 아니다 — `js/regions/index.js`를 그대로 세어 편다. */
function seaRow(r) {
  const cities = r.mod.geo.CITIES ?? [];
  const routes = r.mod.geo.ROUTES ?? [];
  const goods = r.mod.goods.GOODS ?? [];
  const ships = Object.keys(r.mod.ships.SHIPS ?? {});
  const traders = r.mod.traders?.TRADERS ?? [];
  const pirates = r.mod.pirates?.PIRATES ?? [];
  const figures = r.mod.figures?.FIGURES ?? [];
  const mates = r.mod.mates?.MATES ?? [];
  /* 원양 항로는 **양끝이 서로 다른 바다**다 — 한쪽 끝이 이 바다면 이 바다의 문이다.
     그래서 합계는 실제 항로 수의 두 배가 된다(표 아래에 그 말을 적어 둔다). */
  const ids = new Set(cities.map((c) => c.id));
  const lanes = (OCEAN_LANES ?? []).filter((l) => ids.has(l.a) || ids.has(l.b)).length;
  const risk = r.mod.geo.ROUTE_RISK ?? {};
  const riskN = Object.keys(risk).length;
  return {
    id: r.id, name: r.name, order: r.order, blurb: r.blurb,
    cities: cities.length, routes: routes.length, riskN, lanes,
    goods: goods.length, ships: ships.length,
    traders: traders.length, pirates: pirates.length, figures: figures.length, mates: mates.length,
    total: traders.length + pirates.length + figures.length + mates.length,
    industry: cities.length ? (cities.reduce((a, c) => a + (c.industry ?? 0), 0) / cities.length) : 0,
  };
}

function drawSeas() {
  const rows = REGIONS.map(seaRow).sort((a, b) => a.order - b.order);
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const t = el('table', 'list');
  t.innerHTML = `<thead><tr>
    <th>바다</th><th class="n">도시</th><th class="n">항로</th><th class="n">요율</th>
    <th class="n">원양</th><th class="n">교역품</th><th class="n">선종</th>
    <th class="n">상단</th><th class="n">해적</th><th class="n">인물</th><th class="n">동료</th>
    <th class="n">평균 공업력</th><th>한 줄</th></tr></thead>`;
  const tb = el('tbody');
  const cell = (v, cls = '') => `<td class="n ${v ? cls : 'd'}">${v || '—'}</td>`;
  for (const r of rows) {
    const tr = el('tr');
    if (currentRegion() === r.id) tr.style.background = 'rgba(244,221,134,.07)';
    tr.style.cursor = 'pointer';
    tr.innerHTML = `<td>${r.name}</td>`
      + cell(r.cities) + cell(r.routes) + cell(r.riskN) + cell(r.lanes, 'b')
      + cell(r.goods) + cell(r.ships)
      + cell(r.traders, 'b') + cell(r.pirates, 'r') + cell(r.figures, 'y') + cell(r.mates, 'g')
      + `<td class="n d">${r.industry.toFixed(1)}</td>`
      + `<td class="d" style="font-size:10.5px">${r.blurb}</td>`;
    tb.append(tr);
  }
  const foot = el('tr');
  foot.style.borderTop = '1px solid #3b3348';
  foot.innerHTML = `<td><b>아홉 바다</b></td>`
    + ['cities', 'routes', 'riskN', 'lanes', 'goods', 'ships', 'traders', 'pirates', 'figures', 'mates']
        .map((k) => `<td class="n y">${fmt(sum(k))}</td>`).join('')
    + `<td class="n d">—</td><td class="d" style="font-size:10.5px">`
    + `사람 ${fmt(sum('total'))}명 · 원양 항로는 양끝을 각각 세므로 실제 개수의 두 배다</td>`;
  tb.append(foot);
  t.append(tb);
  const box = $('o-seas');
  box.replaceChildren(t);
  box.append(el('p', 'legend para',
    '줄을 누르면 그 바다가 <b>전 탭에서</b> 선택된다. '
    + '<code>js/regions/&lt;권역&gt;/</code>를 그대로 센 값이라 파일을 늘리면 이 표가 저절로 늘어난다.'));
  for (const [i, r] of rows.entries()) {
    tb.children[i].onclick = () => setRegion(r.id);
  }
}

/* ── 요약 카드 ───────────────────────────────────────────── */
function drawCards() {
  const files = LAYERS.reduce((n, l) => n + l.files.length, 0);
  const dyn = RUNTIME.reduce((n, g) => n + g.rows.length, 0);
  const c = cacheStats();
  resetGame();      // 상태 필드 수를 실제 state에서 센다
  const cards = [
    ['계층', LAYERS.length, '값 → 규칙 → 화면'],
    ['소스 파일', files, '기계가 실제 파일과 대조한다'],
    ['상태 필드', Object.keys(state).length, `세이브 대상 — ${STATE_FIELDS.length}줄로 묶어 적었다`],
    ['동적 생성물', dyn, '캐시 · 결정론 · 난수'],
    ['스프라이트 캐시 상한', `${(c.maxBytes / 1048576).toFixed(0)} MB`,
      `LRU — 게임 최악이 5.8 MB에서 멈춘다`],
  ];
  $('o-cards').replaceChildren(...cards.map(([k, v, s]) => {
    const d = el('div', 'card');
    d.innerHTML = `<div class="k">${k}</div><div class="v">${typeof v === 'number' ? fmt(v) : v}${s ? ` <small>${s}</small>` : ''}</div>`;
    return d;
  }));
}

/* ── 계층 트리 ───────────────────────────────────────────── */
function drawTree() {
  const box = $('o-tree');
  box.replaceChildren();

  for (const l of LAYERS) {
    const sec = el('div');
    sec.style.cssText = `margin:0 0 14px;padding:10px 12px;border-radius:4px;
      background:rgba(${l.color},.06);border-left:3px solid rgb(${l.color})`;
    const rows = l.files.map(([p, d]) => `
      <tr>
        <td style="white-space:nowrap"><code>${p}</code></td>
        <td class="d">${md(d)}</td>
      </tr>`).join('');
    sec.innerHTML = `
      <div style="font-size:13px;color:rgb(${l.color});font-weight:600;margin-bottom:2px">
        ${l.name} <span class="d" style="font-weight:400;font-size:11px">${l.files.length}개</span>
      </div>
      <p class="legend para" style="margin:0 0 7px">${md(l.what)}</p>
      <table class="list"><tbody>${rows}</tbody></table>`;
    box.append(sec);
  }
}

/* ── 동적 생성물 ─────────────────────────────────────────── */
function drawRuntime() {
  const box = $('o-runtime');
  box.replaceChildren();

  // 지금 구워져 있는 것을 그룹별로 실측한다 — 표의 "지금" 칸을 채운다
  const live = {};
  for (const k of knownKeys()) {
    const g = String(k.key).split(':')[0];
    live[g] = live[g] || { n: 0, bytes: 0 };
    live[g].n++; live[g].bytes += (k.w || 0) * (k.h || 0) * 4;
  }

  for (const grp of RUNTIME) {
    const sec = el('div');
    sec.style.cssText = 'margin:0 0 14px';
    const isCache = grp.measured === 'cache';
    const rows = grp.rows.map(([a, b, c]) => {
      const key = String(a).replace(':*', '');
      const m = isCache ? live[key] : null;
      return `<tr>
        <td style="white-space:nowrap"><code>${a}</code></td>
        <td>${md(b)}</td>
        <td class="d">${md(c)}</td>
        ${isCache ? `<td class="n ${m ? 'y' : 'd'}">${m ? `${m.n}개 · ${(m.bytes / 1024).toFixed(0)}KB` : '—'}</td>` : ''}
      </tr>`;
    }).join('');
    sec.innerHTML = `
      <div style="font-size:12.5px;color:var(--gold);font-weight:600;margin-bottom:3px">${grp.group}</div>
      <p class="legend para" style="margin:0 0 7px">${md(grp.note)}</p>
      <table class="list">
        <thead><tr><th>무엇</th><th>어디서</th><th>메모</th>${isCache ? '<th class="n">지금 구워진 것</th>' : ''}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    if (grp.reference) {
      const ref = el('div');
      ref.style.cssText = 'margin:6px 0 0';
      ref.innerHTML = `<p class="legend para" style="margin:0 0 5px">
          <b class="y">게임에서 잰 값</b>
          <span class="d">— 이 대시보드는 게임 화면을 그리지 않아 위 "지금" 칸이 비어 있는 것이 정상이다.</span></p>
        <table class="list"><tbody>${grp.reference.map(([a, b, cc]) =>
          `<tr><td style="white-space:nowrap">${a}</td><td class="d">${md(b)}</td><td class="n y">${cc}</td></tr>`).join('')}
        </tbody></table>`;
      sec.append(ref);
    }
    box.append(sec);
  }

  const note = el('p', 'legend para');
  note.style.marginTop = '2px';
  note.innerHTML = md('★ **결정론 생성물은 세이브에 넣지 않는다.** 같은 입력이면 같은 결과라 '
    + '저장할 이유가 없고, 저장하면 오히려 세이브가 커지고 코드와 어긋날 여지가 생긴다. '
    + '반대로 **난수로 굴린 결과**는 되돌릴 수 없으므로 상태에 남고 세이브 대상이 된다.');
  box.append(note);
}

/* ── 상태 필드 ───────────────────────────────────────────── */
function drawState() {
  const box = $('o-state');
  box.replaceChildren();

  // 지금 실제 state에 있는 키 — 문서와 어긋나면 표에서 바로 보이게 한다
  resetGame();
  const real = new Set(Object.keys(state));

  const groups = [...new Set(STATE_FIELDS.map((f) => f.g))];
  for (const g of groups) {
    const rows = STATE_FIELDS.filter((f) => f.g === g).map((f) => {
      const keys = f.k.split('/').map((s) => s.trim());
      const missing = keys.filter((k) => !real.has(k));
      return `<tr>
        <td style="white-space:nowrap"><code>${f.k}</code>${missing.length
          ? ` <span class="b" title="실제 state에 없다">⚠</span>` : ''}</td>
        <td class="d">${md(f.d)}</td>
      </tr>`;
    }).join('');
    const sec = el('div');
    sec.style.cssText = 'margin:0 0 12px';
    sec.innerHTML = `<div style="font-size:12px;color:var(--gold);margin-bottom:3px">${g}</div>
      <table class="list"><tbody>${rows}</tbody></table>`;
    box.append(sec);
  }

  const note = el('p', 'legend para');
  note.innerHTML = md('세이브/로드는 **아직 없다**(새로고침하면 초기화된다). 넣을 때 이 표가 그대로 '
    + '직렬화 목록이 된다 — 다만 `known`·`everOwned`는 `Set`이라 JSON으로 그냥 안 나가므로 '
    + '배열 변환이 필요하고, `prices`는 `refreshPrices()`로 다시 만들 수 있어 저장을 생략해도 된다. '
    + '이 표가 실제 `state`와 어긋나면 `node tools/check-architecture.mjs`가 실패시킨다.');
  box.append(note);
}
