// factions.js — 세력 관계도 (전면 모달)
//
// 값은 `data.js: FACTIONS·FACTION_TIES·REGARD`, 규칙은 `state.js: regardOf·factionOfCity…`.
// **여기서는 읽어서 배치만 한다** — 화면이 규칙을 다시 구현하지 않는다(payday.js와 같은 원칙).
//
// ── 왜 캔버스가 아닌가 ────────────────────────────────────────
//   핵심 모델이 *"그림은 캔버스, 글자·버튼은 DOM 오버레이"*다. 세력 열의 이름·수치·「쥔 것」이
//   전부 한글이라 400×225 논리 좌표계에 얹으면 픽셀 폰트가 없어 **한 줄도 안 읽힌다.**
//   그래서 DOM 패널 + **인라인 SVG 선 한 겹**이다. 400×225는 캔버스 씬의 좌표계이지
//   오버레이의 제약이 아니다(급여일 화면이 이미 그 층에서 훨씬 큰 표를 그린다).
//
// ── 이 화면이 보여야 하는 것 셋 (소설이 정한 「읽는 법」) ──────
//   ① **실선(싸움)은 전부 세력끼리다** — 나에게로 오는 실선이 **하나도 없다**
//   ② **점선(돈)은 국경을 안 본다** — 제노바 하나가 에스파냐와 에스타두와 나에게 동시에 댄다
//   ③ **굵은 선(배제)만 나에게 온다** — 세력이 나를 대하는 방식은 공격이 아니라 **제외**다
//   곧 관계 수치가 그리는 것은 **배제선의 굵기**이지 싸움선이 아니다.
//   화면이 그것을 *말하지 않고 보여 준다.*
//
// ★ **읽기 전용이다.** 「선전한다」 단추를 만들지 않는다 — 세력을 이기는 문은 패권 조건 ③으로
//   이미 나 있고, 같은 것이 둘이 되면 둘 다 죽는다.

import { FACTIONS, FACTION_TIES, REGARD, CITY_BY_ID, GOOD_BY_ID, REGION_BY_ID } from './data.js';
import { state, regardOf, regardRaw, regardBand, infamyWeight,
         factionOfCity, metFactions } from './state.js';
import { el, modal, josa } from './ui.js';
import { FLAGS } from './sprites/ship.js';

/* ── 좌표 (고정) ───────────────────────────────────────────────
   측정 없이 그린다 — 노드와 SVG가 **같은 픽셀 좌표계**를 쓰므로 창 크기·글꼴에 안 흔들린다.
   두 열 × 다섯 행, 가운데 나. 왼쪽이 「사고파는 자」, 오른쪽이 「문을 쥔 자」다. */
const W = 700, H = 404;
const COL = 196, ROW = 76, NODE = 62, TOP = 24;
const LX = 0, RX = W - COL;
const ME = { x: 266, y: TOP + 2 * ROW, w: 168, h: NODE };

const rowY = (i) => TOP + i * ROW;
const midY = (i) => rowY(i) + NODE / 2;

/* 색 — 기존 팔레트 안에서 고른다. 음수는 적갈, 0은 회, 양수는 청. */
const C_NEG = '#a8563f', C_ZERO = '#6f6858', C_POS = '#5f86a8';
const hue = (v) => (v < 0 ? C_NEG : v > 0 ? C_POS : C_ZERO);

/** `state.js: addRegard`의 `why` → 화면 문장. 그 함수가 관계를 움직이는 유일한 문이므로
    여기 없는 `why`가 새로 생기면 문구가 `(사유 미상)`으로 떨어진다 — 새 사유를 추가하면 같이 채운다. */
const WHY_LABEL = {
  backer: '호위선단을 꺾었다', stir: '이 세력 마당에서 사주를 벌였다',
  trespass: '허락 없이 자리에 시설을 세웠다', enroll: '명부에 이름을 올렸다',
  bond: '한편인 상단이 덮쳤다', fleet: '이 세력의 함대를 꺾었다', contract: '주문을 해냈다',
};

const SIDE_NAME = { trade: '사고파는 자', gate: '문을 쥔 자' };
const SELLS_LABEL = {
  paper: '종이 (카르타스)', order: '순서 (감합)', toll: '세 (조약문)',
  enroll: '한 철 자격 · 등록', money: '돈 (대부)', price: '값 (흥정과 소식)',
  open: '아무것도 안 묻는 것', nothing: '★ 아무것도 안 판다',
};

const ids = (side) => Object.keys(FACTIONS).filter((k) => FACTIONS[k].side === side);

/** 그 세력이 지금 무는 것 — **화면은 규칙에 없는 것을 말하지 않는다.**
    1단계에 실제로 걸린 것은 둘뿐이라(일감·문서) 여기도 둘뿐이다. */
const SELL_SHORT = { paper: '종이', order: '순서', toll: '조약문' };
function bites(id) {
  const f = FACTIONS[id];
  const v = regardOf(id);
  const out = [];
  if (v <= REGARD.contractAt) out.push('이 세력 도시에 일감이 안 걸린다');
  const s = SELL_SHORT[f.sells];
  if (v <= REGARD.refuseAt && s) out.push(`${s}${josa(s, '을/를')} 안 판다`);
  return out;
}

/* ── 노드 ────────────────────────────────────────────────────── */
function flagChip(f) {
  // 깃발은 그림이지 글자가 아니다 — 12×8 두 색으로 낸다(스프라이트를 굽지 않는다).
  // ★ 푸거는 깃발이 없어 **장부**를 대신 세운다. 그것이 이 세력의 성격이다.
  if (!f.flags.length) return el('span.fac-chip.fac-ledger', { text: '▤', title: '깃발이 없다' });
  const fl = FLAGS[f.flags[0]] ?? {};
  return el('span.fac-chip', {
    style: { background: fl.field ?? '#5a5348', borderColor: fl.fieldD ?? '#2a1d14' },
  }, el('i', { style: { background: fl.mark ?? '#00000055' } }));
}

function nodeEl(id, met, sel, onPick) {
  const f = FACTIONS[id];
  if (!met) {
    return el('div.fac-node.fac-unmet', { title: '아직 만나지 않은 세력' }, [
      el('span.fac-q', { text: '?' }),
      el('span.fac-name', { text: '아직 만나지 못했다' }),
    ]);
  }
  const v = regardOf(id);
  const band = regardBand(id);
  const cells = [];
  for (let i = 1; i <= REGARD.cap; i++) {
    cells.push(el('i', { style: i <= Math.abs(v) ? { background: hue(v) } : null }));
  }
  return el(`div.fac-node${sel === id ? '.on' : ''}${f.sells === 'nothing' ? '.fac-shut' : ''}`, {
    title: f.blurb, onclick: () => onPick(id),
  }, [
    el('div.fac-head', {}, [
      flagChip(f),
      el('span.fac-name', { text: f.short }),
      el('span.fac-val', { text: (v > 0 ? '+' : '') + v, style: { color: hue(v) } }),
    ]),
    el('div.fac-bar', {}, cells),
    el('div.fac-band', { text: f.sells === 'nothing' ? `${band.name} · 파는 것이 없다` : band.name }),
  ]);
}

/* ── 선 ──────────────────────────────────────────────────────── */
const svgEl = (tag, attrs) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  // null을 그대로 넣으면 `stroke-dasharray="null"`이 된다 — 브라우저가 조용히 무시하는 쪽이라
  // 눈에는 안 보이지만 콘솔 검증(속성 유효성)에서는 잡힌다. 빈 것은 아예 안 적는다.
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  return n;
};

/** 왼쪽 열은 오른쪽 모서리에서, 오른쪽 열은 왼쪽 모서리에서 선이 난다 */
function anchor(id) {
  const side = FACTIONS[id].side;
  const i = ids(side).indexOf(id);
  return side === 'trade'
    ? { x: LX + COL, y: midY(i), out: 1 }
    : { x: RX, y: midY(i), out: -1 };
}
const meAnchor = (side) => (side === 'trade'
  ? { x: ME.x, y: ME.y + ME.h / 2 }
  : { x: ME.x + ME.w, y: ME.y + ME.h / 2 });

function wires(met, sel) {
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'fac-svg' });
  const defs = svgEl('defs', {});
  const mk = svgEl('marker', {
    id: 'fac-arrow', viewBox: '0 0 8 8', refX: '7', refY: '4',
    markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse',
  });
  mk.append(svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: '#8f8878' }));
  defs.append(mk);
  svg.append(defs);

  /* ① 굵은 선(배제) — **나에게 오는 유일한 선.** 굵기 = 2 + |regard| × 0.5.
     관계가 0이어도 가늘게 이어 둔다. 이어져 있다는 것 자체가 「제외당할 수 있다」는 뜻이다. */
  for (const id of met) {
    const a = anchor(id), m = meAnchor(FACTIONS[id].side);
    const v = regardOf(id);
    svg.append(svgEl('line', {
      x1: a.x, y1: a.y, x2: m.x, y2: m.y,
      stroke: hue(v), 'stroke-width': (2 + Math.abs(v) * 0.5).toFixed(1),
      'stroke-linecap': 'round', opacity: v === 0 ? 0.35 : 0.85,
    }));
  }

  /* ② 점선(돈) — `sells: 'money'`인 세력은 **관계가 나빠도 나에게 댄다.** 그것이 자본이다. */
  for (const id of met) {
    if (FACTIONS[id].sells !== 'money') continue;
    const a = anchor(id), m = meAnchor(FACTIONS[id].side);
    svg.append(svgEl('line', {
      x1: a.x, y1: a.y, x2: m.x, y2: m.y,
      stroke: '#8f8878', 'stroke-width': 1.4, 'stroke-dasharray': '2 4',
      'marker-end': 'url(#fac-arrow)', opacity: 0.9,
    }));
  }

  /* ③ 누른 세력에 걸린 **세력↔세력** 선만 그린다.
     싸움 7 + 돈 5를 다 그으면 열두 줄이고, 그것은 관계도가 아니라 벽지다. */
  if (sel) {
    const draw = (a, b, dashed) => {
      if (!met.includes(a) || !met.includes(b)) return;
      const p = anchor(a), q = anchor(b);
      /* 같은 열이면 바깥으로 돌아 나간다 — 노드 위를 가로지르면 이름이 안 읽힌다 */
      const bow = p.out === q.out ? p.out * 26 : 0;
      const cx = bow ? (p.out > 0 ? p.x + bow : p.x - bow) : (p.x + q.x) / 2;
      svg.append(svgEl('path', {
        d: `M${p.x} ${p.y} C${cx} ${p.y} ${cx} ${q.y} ${q.x} ${q.y}`,
        fill: 'none', stroke: dashed ? '#8f8878' : '#c9b98a',
        'stroke-width': dashed ? 1.4 : 1.6,
        'stroke-dasharray': dashed ? '2 4' : null,
        'marker-end': dashed ? 'url(#fac-arrow)' : null,
        opacity: 0.9,
      }));
    };
    for (const [a, b] of FACTION_TIES.war) if (a === sel || b === sel) draw(a, b, false);
    for (const [a, b] of FACTION_TIES.money) if (a === sel || b === sel) draw(a, b, true);
  }
  return svg;
}

/* ── 아래 상세 ────────────────────────────────────────────────── */
function detail(id) {
  if (!id) {
    return el('div.fac-detail', {}, el('div.fac-line', {
      text: '노드를 누르면 그 세력에 걸린 선만 그려진다.',
    }));
  }
  const f = FACTIONS[id];
  const v = regardOf(id), raw = regardRaw(id), inf = infamyWeight(id);
  const band = regardBand(id);
  const names = (arr, map) => arr.map((x) => map[x]?.name ?? x).join(' · ');
  const war = FACTION_TIES.war.filter((e) => e.includes(id)).map((e) => FACTIONS[e[0] === id ? e[1] : e[0]].short);
  const backs = FACTION_TIES.money.filter((e) => e[1] === id).map((e) => FACTIONS[e[0]].short);
  const lends = FACTION_TIES.money.filter((e) => e[0] === id).map((e) => FACTIONS[e[1]].short);
  const shuts = FACTION_TIES.exclude.some((e) => e[0] === id && e[1] === '*');
  const bite = bites(id);

  const line = (k, t, cls = '') => el(`div.fac-line${cls}`, {}, [
    el('span.k', { text: k }), el('span.v', { text: t }),
  ]);

  return el('div.fac-detail', {}, [
    el('div.fac-title', {
      text: `${f.name} — ${band.name} (${v > 0 ? '+' : ''}${v}`
          + (inf ? ` · 그중 악명 ${inf}` : '') + ')',
      style: { color: hue(v) },
    }),
    el('div.fac-blurb', { text: f.blurb }),
    /* ★ 회차 29 나-1 후속 — 관계가 **왜** 바뀌었는지. `pushLog`는 60줄이 지나면 사라지지만
       `state.regardWhy`는 세력당 최근 한 건을 계속 들고 있으므로, 여기서 다시 읽으면 언제든 「최근 변동 사유」로 찾아볼 수 있다. */
    (() => {
      const why = state.regardWhy?.[id];
      if (!why || !why.delta) return null;
      return line('최근 변동', `${why.day}일차 · ${why.delta > 0 ? '+' : ''}${why.delta} — `
        + (WHY_LABEL[why.why] ?? '(사유 미상)'));
    })(),
    line('파는 것', SELLS_LABEL[f.sells] + (v <= REGARD.refuseAt ? ' — 지금은 안 판다' : '')),
    line('쥔 것', `${names(f.grip.goods, GOOD_BY_ID)} │ ${names(f.grip.cities, CITY_BY_ID)}`),
    line('앉은 곳', names(f.seats, CITY_BY_ID)),
    f.fleets.length ? line('함대', f.fleets
      .map((x) => `${REGION_BY_ID[x.region]?.name ?? x.region} 등급 ${x.tier} 「${x.name}」`).join(' · ')) : null,
    line('지금 무는 것', bite.length ? bite.join(' · ')
      : v > 0 ? '없다 — 관계는 더 벌기 위한 것이 아니라 잃지 않기 위한 것이다'
              : '없다 — 아직 아무 일도 없다'),
    war.length ? line('싸움', war.join(' · ')) : null,
    backs.length ? line('돈을 대는 자', backs.join(' · ')) : null,
    lends.length ? line('돈을 대는 곳', lends.join(' · ')) : null,
    shuts ? line('배제', '명부·문서 밖의 배는 이 세력에게 없는 배다') : null,
    raw !== v ? el('div.fac-note', {
      text: `장부에 적힌 값은 ${raw > 0 ? '+' : ''}${raw}이고 그 위에 악명 ${inf}${josa(String(inf), '이/가')} 얹혀 있다.`
          + ' 소문은 40일마다, 장부는 90일마다 한 칸씩 삭는다.',
    }) : null,
  ].filter(Boolean));
}

/* ── 화면 ─────────────────────────────────────────────────────── */
export function openFactions(atCity = state.at) {
  const met = metFactions();
  const here = factionOfCity(atCity);
  // 안 누르면 **이 항구의 임자**가 기본으로 열려 있다
  let sel = met.includes(here) ? here : null;

  const board = el('div.fac-board', { style: { width: `${W}px`, height: `${H}px` } });
  const detailBox = el('div', {});

  const paint = () => {
    board.replaceChildren();
    board.append(wires(met, sel));
    board.append(el('div.fac-col-title', { text: SIDE_NAME.trade, style: { left: '0px', width: `${COL}px` } }));
    board.append(el('div.fac-col-title', { text: SIDE_NAME.gate, style: { left: `${RX}px`, width: `${COL}px` } }));
    for (const side of ['trade', 'gate']) {
      ids(side).forEach((id, i) => {
        const n = nodeEl(id, met.includes(id), sel, (picked) => { sel = picked === sel ? null : picked; paint(); });
        Object.assign(n.style, {
          left: `${side === 'trade' ? LX : RX}px`, top: `${rowY(i)}px`,
          width: `${COL}px`, height: `${NODE}px`,
        });
        board.append(n);
      });
    }
    const meBox = el('div.fac-me', {}, [
      el('span.fac-name', { text: '나' }),
      el('span.fac-me-sub', { text: `${CITY_BY_ID[atCity]?.name ?? ''} · ${state.day}일차` }),
    ]);
    Object.assign(meBox.style, { left: `${ME.x}px`, top: `${ME.y}px`, width: `${ME.w}px`, height: `${ME.h}px` });
    board.append(meBox);
    detailBox.replaceChildren(detail(sel));
  };
  paint();

  return modal({
    title: `세력 — 만난 세력 ${met.length}/${Object.keys(FACTIONS).length}`,
    body: el('div.fac-wrap', {}, [
      el('div.fac-legend', {
        html: '<b>━</b> 배제 — 나에게 오는 유일한 선 (굵을수록 나쁘다)'
            + ' &nbsp;·&nbsp; <b>┄▸</b> 돈 — 국경을 안 본다'
            + ' &nbsp;·&nbsp; <b>─</b> 싸움 — <b>전부 세력끼리다</b>',
      }),
      el('div.fac-scroll', {}, board),
      detailBox,
    ]),
    actions: [{ label: '접는다' }],
  });
}

/* ★ 항해 중에도 열린다 — **값을 한 자리도 안 바꾸는 읽기 전용 화면**이라 안전하다.
   항구 카드의 단추는 그 항구에 임자가 있을 때만 서므로, 조선의 바다처럼 세력이 없는
   항구에서는 이 키가 유일한 문이 된다. */
window.addEventListener('keydown', (e) => {
  if (e.key !== 'f' && e.key !== 'F' && e.key !== 'ㄹ') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (document.querySelector('.fac-wrap')) return;   // 두 번 겹쳐 뜨지 않게
  openFactions();
});
