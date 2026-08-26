// npc-view.js — NPC 탭 그리기 (사람 명부)
//
// ★ **아홉 바다에 사람이 몇이고 누구인지를 한자리에서 볼 곳이 없었다**(C-6).
//   해적 탭은 명부(`PIRATES`)만 보고, 상단·항구 인물·동료는 어느 화면에도 안 모인다.
//   그래서 "이 바다에 사람을 몇 앉혔나 · 어느 항구가 비었나"를 물을 데가 없었다 —
//   콘텐츠를 늘리는 것이 이 저장소의 최상위 원칙인데 **늘어난 것을 세는 자리**가 없던 셈이다.
//
// 계측이랄 것이 없다(시뮬을 안 돌린다). `js/regions/index.js`를 그대로 읽어 표로 편다 —
// 대시보드는 게임 모듈을 다시 구현하지 않는다는 이 폴더의 규약 그대로다.

import { REGIONS } from '../js/regions/index.js';
import { CITY_BY_ID, SHIPS } from '../js/data.js';
import { $, fmt, el } from './shared.js';
import {
  mountRegionBar, injectRegionBarStyle, onRegionChange,
  currentRegion, regionName, setRegion, ALL,
} from './region-filter.js';

let ROWS = null;
let kind = 'all';
let query = '';

export const npcLoaded = () => !!ROWS;

/* 갈래 — 색과 이름을 한 곳에 둔다. 갈래를 늘리면 여기만 고친다. */
const KINDS = {
  trader: { name: '상단', cls: 'b', what: '저 혼자 장사하는 배. 사고판 것이 시세에 압력으로 남는다' },
  pirate: { name: '해적', cls: 'r', what: '명부에 이름이 오른 자. 현상금과 사냥터가 있다' },
  figure: { name: '인물', cls: 'y', what: '항구에 머물며 무언가를 해 주는 사람' },
  mate:   { name: '동료', cls: 'g', what: '갑판에 태우는 사람. 코멘다로 몫을 나눈다' },
};

const JOB_LABEL = {
  broker: '중개인', informant: '정보상', smuggler: '밀수업자', moneylender: '전주',
  shipwright: '선장인', harbormaster: '항무관', interpreter: '통역', cartographer: '지도장이',
  physician: '선의', gunsmith: '총포장이', priest: '사제', scholar: '학자',
  guildmaster: '길드장', official: '관리',
};
const SERVICE_LABEL = {
  'price-tip': '시세 정보', 'route-tip': '항로 정보', contract: '일감 주선',
  smuggle: '밀수', loan: '대부', repair: '수리 할인', recruit: '사람 소개', permit: '통행 문서',
};

const cityName = (id) => CITY_BY_ID[id]?.name ?? id ?? '—';
const shipName = (k) => SHIPS[k]?.name ?? k ?? '—';

/* ── 명부를 한 줄씩 편다 ─────────────────────────────────── */
function build() {
  const out = [];
  for (const r of REGIONS) {
    const rid = r.id, rname = r.name;
    for (const t of r.mod.traders?.TRADERS ?? []) {
      out.push({
        kind: 'trader', region: rid, regionName: rname,
        id: t.id, name: t.name,
        /* 순회로가 있으면 첫 항구가 그 사람의 자리다 — 없으면 그때그때 이문을 좇는다 */
        where: t.circuit?.[0] ?? null,
        role: shipName(t.ship),
        rank: t.rank ?? null,
        tags: [t.scope === 'ocean' ? '원양' : null, t.season ? seasonName(t.season) : null,
               t.circuit ? `순회 ${t.circuit.length - 1}구간` : '자유항해'].filter(Boolean),
        blurb: t.blurb ?? '',
      });
    }
    for (const p of r.mod.pirates?.PIRATES ?? []) {
      out.push({
        kind: 'pirate', region: rid, regionName: rname,
        id: p.id, name: p.name,
        where: p.base ?? null,
        role: shipName(p.ship),
        rank: p.strength ?? null,
        tags: [p.season ? seasonName(p.season) : null,
               p.bounty ? `현상금 ${fmt(p.bounty[0])}~${fmt(p.bounty[1])}` : null,
               p.hunt?.length ? `사냥터 ${p.hunt.length}구간` : null].filter(Boolean),
        blurb: p.blurb ?? '',
      });
    }
    for (const f of r.mod.figures?.FIGURES ?? []) {
      out.push({
        kind: 'figure', region: rid, regionName: rname,
        id: f.id, name: f.name,
        /* 여러 항구를 도는 인물은 `at` 대신 `roam`을 든다 — 첫 곳을 적고 태그로 알린다 */
        where: f.at ?? f.roam?.[0] ?? null,
        role: JOB_LABEL[f.job] ?? f.job ?? '—',
        rank: null,
        tags: [SERVICE_LABEL[f.service] ?? f.service ?? null,
               f.roam?.length ? `${f.roam.length}곳을 돈다` : null,
               f.season ? seasonName(f.season) : null,
               f.fee ? `${fmt(f.fee[0])}~${fmt(f.fee[1])}닢` : (f.service ? '값을 안 받는다' : null),
              ].filter(Boolean),
        blurb: f.blurb ?? '',
      });
    }
    for (const m of r.mod.mates?.MATES ?? []) {
      out.push({
        kind: 'mate', region: rid, regionName: rname,
        id: m.id, name: m.name,
        where: m.at ?? null,
        role: m.title ?? m.role ?? '—',
        rank: null,
        tags: [m.hire ? `계약금 ${fmt(m.hire)}닢` : null,
               m.wage ? `일당 ${m.wage}` : null,
               m.cut ? `몫 ${Math.round(m.cut * 100)}%` : null,
               ...Object.keys(m.perks ?? {}).map((k) => k)].filter(Boolean),
        blurb: m.blurb ?? '',
      });
    }
  }
  return out;
}

const seasonName = (s) => (s === 'summer' ? '여름에만' : s === 'winter' ? '겨울에만' : s);

/* ── 지금 보고 있는 것 ───────────────────────────────────── */
function view() {
  const rid = currentRegion();
  const q = query.trim();
  return ROWS.filter((x) => (rid === ALL || x.region === rid))
    .filter((x) => (kind === 'all' || x.kind === kind))
    .filter((x) => !q || `${x.name} ${x.role} ${cityName(x.where)} ${x.blurb} ${x.tags.join(' ')}`.includes(q));
}

/* ── 요약 카드 ───────────────────────────────────────────── */
function drawCards() {
  const rid = currentRegion();
  const mine = ROWS.filter((x) => rid === ALL || x.region === rid);
  const n = (k) => mine.filter((x) => x.kind === k).length;
  /* ★ **사람이 없는 항구가 몇인가**가 이 탭에서 가장 쓸모 있는 숫자다 —
     콘텐츠를 어디에 더 넣어야 하는지를 그것이 가리킨다. */
  const cities = REGIONS.filter((r) => rid === ALL || r.id === rid)
    .flatMap((r) => r.mod.geo.CITIES ?? []);
  const peopled = new Set(mine.map((x) => x.where).filter(Boolean));
  const empty = cities.filter((c) => !peopled.has(c.id)).length;

  const cards = [
    ['사람', fmt(mine.length), rid === ALL ? '아홉 바다 전부' : regionName(rid)],
    ['상단', fmt(n('trader')), KINDS.trader.what],
    ['해적', fmt(n('pirate')), KINDS.pirate.what],
    ['인물', fmt(n('figure')), KINDS.figure.what],
    ['동료', fmt(n('mate')), KINDS.mate.what],
    ['사람이 선 항구', `${peopled.size}/${cities.length}`,
      empty ? `${empty}곳은 아직 아무도 없다 — 콘텐츠를 더할 자리다` : '빈 항구가 없다'],
  ];
  $('n-cards').replaceChildren(...cards.map(([k, v, s]) => {
    const c = el('div', 'card');
    c.innerHTML = `<div class="k">${k}</div><div class="v">${v}<small>${s}</small></div>`;
    return c;
  }));
}

/* ── 바다 × 갈래 표 ──────────────────────────────────────── */
function drawGrid() {
  const t = el('table', 'list');
  const ks = Object.keys(KINDS);
  t.innerHTML = `<thead><tr><th>바다</th>${ks.map((k) => `<th class="n">${KINDS[k].name}</th>`).join('')}
    <th class="n">합</th><th class="n">항구</th><th class="n">사람이 선 항구</th></tr></thead>`;
  const tb = el('tbody');
  for (const r of [...REGIONS].sort((a, b) => a.order - b.order)) {
    const mine = ROWS.filter((x) => x.region === r.id);
    const cities = r.mod.geo.CITIES ?? [];
    const peopled = new Set(mine.map((x) => x.where).filter(Boolean));
    const tr = el('tr');
    if (currentRegion() === r.id) tr.style.background = 'rgba(244,221,134,.07)';
    tr.innerHTML = `<td>${r.name}</td>`
      + ks.map((k) => {
          const c = mine.filter((x) => x.kind === k).length;
          return `<td class="n ${c ? KINDS[k].cls : 'd'}">${c || '—'}</td>`;
        }).join('')
      + `<td class="n">${mine.length}</td>`
      + `<td class="n d">${cities.length}</td>`
      + `<td class="n ${peopled.size === cities.length ? 'g' : 'd'}">${peopled.size}</td>`;
    tr.style.cursor = 'pointer';
    tr.onclick = () => setRegion(r.id);
    tb.append(tr);
  }
  t.append(tb);
  $('n-grid').replaceChildren(t);
}

/* ── 명부 ────────────────────────────────────────────────── */
function drawList() {
  const rows = view();
  const t = el('table', 'list');
  t.innerHTML = `<thead><tr>
    <th>이름</th><th style="white-space:nowrap">갈래</th><th>바다</th><th>자리</th><th>배·직업</th>
    <th class="n" style="white-space:nowrap">등급</th><th>딸린 것</th><th>한 줄</th></tr></thead>`;
  const tb = el('tbody');
  for (const x of rows) {
    const tr = el('tr');
    tr.innerHTML = `
      <td>${x.name}</td>
      <td class="${KINDS[x.kind].cls}" style="white-space:nowrap">${KINDS[x.kind].name}</td>
      <td class="d" style="white-space:nowrap">${x.regionName}</td>
      <td class="d" style="white-space:nowrap">${cityName(x.where)}</td>
      <td class="d" style="white-space:nowrap">${x.role}</td>
      <td class="n ${x.rank ? 'y' : 'd'}">${x.rank ?? '—'}</td>
      <td class="d" style="font-size:10.5px">${x.tags.join(' · ')}</td>
      <td class="d" style="font-size:10.5px">${x.blurb}</td>`;
    tb.append(tr);
  }
  t.append(tb);
  const box = $('n-list');
  box.replaceChildren(t);
  /* ★ **빈 표는 고장으로 읽힌다.** 왜 비었는지를 말해 준다 — 거른 것 때문인지,
     그 바다에 정말 아무도 없는지. 해적 탭이 같은 자리에서 배운 것이다. */
  if (!rows.length) {
    box.replaceChildren(el('p', 'legend para',
      query ? `<b>“${query}”</b>에 걸리는 사람이 없다 — 검색을 지우면 다시 보인다.`
        : kind !== 'all'
          ? `${regionName(currentRegion())}에는 <b>${KINDS[kind].name}</b>이 아직 없다.`
            + ' 갈래를 「전부」로 돌리면 이 바다의 다른 사람이 보인다.'
          : `${regionName(currentRegion())}에는 아직 아무도 없다 — 채울 자리다.`));
  }
  $('n-stamp').textContent = `${fmt(rows.length)}명 / 전체 ${fmt(ROWS.length)}명`;
}

/* ── 갈래 칩 ─────────────────────────────────────────────── */
function mountKindBar() {
  const host = $('n-kindbar');
  if (!host) return;
  host.classList.add('regionbar');
  const mk = (k, label, n) => {
    const b = document.createElement('button');
    b.className = 'rgb' + (kind === k ? ' on' : '');
    b.dataset.k = k;
    b.innerHTML = `${label}${n != null ? ` <span class="n">${n}</span>` : ''}`;
    b.onclick = () => {
      kind = k;
      for (const o of host.querySelectorAll('.rgb')) o.classList.toggle('on', o.dataset.k === k);
      drawList();
    };
    return b;
  };
  host.replaceChildren(
    mk('all', '전부', ROWS.length),
    ...Object.entries(KINDS).map(([k, v]) => mk(k, v.name, ROWS.filter((x) => x.kind === k).length)),
  );
}

/* ── 실행 ────────────────────────────────────────────────── */
export function runNpcs() {
  ROWS = build();
  injectRegionBarStyle();
  mountRegionBar($('n-regionbar'), {
    countOf: (r) => ROWS.filter((x) => x.region === r.id).length,
  });
  mountKindBar();
  onRegionChange(() => { if (ROWS) { drawCards(); drawGrid(); drawList(); } });
  const q = $('n-q');
  if (q) q.oninput = () => { query = q.value; drawList(); };
  drawCards();
  drawGrid();
  drawList();
}
