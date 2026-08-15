// overview-view.js — 오버뷰 탭 그리기
//
// 계층·동적생성·상태의 정본은 `architecture.mjs`이고 여기서는 그리기만 한다.
// 스프라이트 캐시만 **실측**이다 — 지금 이 탭에서 재는 값이라 게임을 돌린 만큼만 잡힌다.

import { LAYERS, RUNTIME, STATE_FIELDS } from './architecture.mjs';
import { cacheStats, knownKeys } from '../js/pixel.js';
import { state, resetGame } from '../js/state.js';
import { $, fmt, el, mono } from './shared.js';

let loaded = false;
export const overviewLoaded = () => loaded;

const md = (s = '') => s
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

export function runOverview() {
  loaded = true;
  drawCards();
  drawTree();
  drawRuntime();
  drawState();
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
