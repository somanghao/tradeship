// scenes/shipyard.js — 조선소: 선박 교체 · 갑판 배치 · 무장
//
// 항구 사이드패널의 모달로는 배가 작게밖에 안 보여서 전용 씬으로 뺐다.
// 화면 왼쪽 절반은 배(캔버스), 오른쪽 절반은 탭 패널(DOM). 패널을 논리좌표
// 기준으로 배치하므로 창 크기가 변해도 배를 가리지 않는다.

import { portSprite, cannonSprite, VH } from '../sprites/scene.js';
import { shipSprite, shipTopSprite, HULLS, WATERLINE } from '../sprites/ship.js';
import { unitSprite, CHAR_FOOT } from '../sprites/char.js';
import { blit } from '../pixel.js';
import {
  SHIPS, CITY_BY_ID, CANNONS, CANNON_KEYS, CANNON_REFUND,
  TROOPS, RECRUITS, TROOP_REFUND, MELEE_SLOTS,
  REFITS, REFIT_KEYS, SHOTS, SHOT_KEYS,
} from '../data.js';
import {
  state, ship, cargoUsed, hire, repair, HIRE_UNIT, REPAIR_UNIT,
  gunCap, armsTotal, armsFactor, armsAimAt, zoneFactor, buyCannon, removeCannon,
  openSlots, setSlot, purchaseShip, boardShip, sellShip, resaleOf,
  pushLog, hasRefit, buyRefit, sellsShip, yardsOf, buyShot, shipSpeed, shorthanded,
  industryOf, tierNeeded, shipPriceAt, shipLockedBy, yardCapable, buildableAt,
  usedListings, buyUsed,
  fleetUpkeep,
} from '../state.js';
import { el, overlay, toast, modal, refreshHUD, refreshLog, spriteEl, spriteElTrim } from '../ui.js';
import { go, viewport } from '../main.js';

/* 배가 놓이는 자리 — 논리 좌표. 패널은 x=206부터라 겹치지 않는다. */
const SHIP_X = 12, SEA_Y = 170;
const PANEL = { x: 206, y: 10, w: 182, h: VH - 20 };

let bg, city, tab = 'ship', panelEl = null, fireT = 0, firePort = -1;
let preview = null;    // 선박 탭에서 들여다보는 배 (null이면 지금 타고 있는 배)
let armsHilite = null; // 무장 탭에서 마우스를 올린 대포 종류 (부두의 그 대포만 밝게)

/** 캔버스에 그릴 배 */
function shown() {
  return SHIPS[tab === 'ship' && preview ? preview : state.shipKey];
}

export const shipyardScene = {
  enter(params = {}) {
    city = CITY_BY_ID[state.at];
    bg = portSprite(city.style, city.seed);
    tab = params.tab || 'ship';
    preview = null;
    armsHilite = null;
    fireT = 0; firePort = -1;
    buildUI();
  },

  exit() { panelEl = null; },

  resize() { layout(); },

  update(dt) {
    // 무장 탭에서는 포문이 어디에 있는지 보이도록 차례로 시험 발포한다
    if (tab !== 'arms' || armsTotal() <= 0) { firePort = -1; return; }
    fireT += dt;
    if (fireT > 1.4) {
      fireT = 0;
      firePort = (firePort + 1) % HULLS[ship().hull].ports;
    } else if (fireT > 0.22) {
      firePort = -1;
    }
  },

  draw(ctx, t) {
    blit(ctx, bg, 0, 0, 1);

    const s = shown();
    const mine = s === ship();
    const bob = Math.round(Math.sin(t * 0.9) * 1.2);
    const shipY = SEA_Y - WATERLINE + bob;
    blit(ctx, shipSprite(s.hull, {
      tint: s.tint, flag: city.flag,
      furl: tab === 'crew' || tab === 'arms',      // 선박·개장 탭에서는 돛을 편다
      firing: tab === 'arms' ? firePort : -1,
      damaged: mine && state.hp / state.maxHp < 0.34 ? 1 : 0,
    }), SHIP_X, shipY, 1);

    // 갑판 위 배치 병력 — 선원 탭에서 바꾼 결과가 여기 바로 나타난다.
    // 남의 배(미리보기)에는 우리 선원을 세우지 않는다.
    if (!mine) return;
    const H = HULLS[s.hull];
    const deckY = shipY + H.deck - CHAR_FOOT;
    const crewList = ['captain', ...state.loadout.slice(1, openSlots() + 1).filter(Boolean)];
    // 선종마다 선체가 놓이는 자리(x0)와 길이가 달라 갑판 위치를 선체에서 가져온다.
    // 상수로 두면 작은 배에서는 선원이 뱃전 밖 허공에 선다.
    const gap = Math.max(11, Math.min(17, Math.round(H.len * 0.15)));
    crewList.forEach((k, i) => {
      const x = SHIP_X + H.x0 + Math.round(H.len * 0.18) + i * gap;
      const step = tab === 'crew' ? Math.round(Math.sin(t * 2 + i) * 1) : 0;
      blit(ctx, unitSprite(k, 'idle'), x, deckY + step, 1, i % 2 === 1);
    });

    if (tab === 'arms') drawBattery(ctx);
  },
};

/* 무장 탭 — 실제로 실린 대포를 부두 바닥에 늘어놓는다.
   종류별로 포신 길이가 달라서 무엇을 샀는지 눈으로 구별된다. */
const BATTERY_Y = 196, BATTERY_X = 8, BATTERY_W = 192;
const BATTERY_GAP = 11;      // 종류 사이 여백
const BATTERY_ROW = 5;       // 앞줄을 이만큼 내려 지그재그로 놓는다

function drawBattery(ctx) {
  const groups = CANNON_KEYS
    .map((k) => ({ k, n: state.arms[k] || 0 }))
    .filter((g) => g.n > 0);
  if (!groups.length) return;

  const total = groups.reduce((a, g) => a + g.n, 0);
  // 마지막 대포의 폭까지 넣어야 오른쪽 끝이 패널(x=206) 밑으로 들어가지 않는다
  const lastW = cannonSprite(groups[groups.length - 1].k).width;
  const room = BATTERY_W - (groups.length - 1) * BATTERY_GAP - lastW;
  const step = total > 1 ? Math.max(8, Math.min(26, room / (total - 1))) : 0;

  // 한 줄로 늘어놓으면 포신끼리 이어져 파이프처럼 보인다 → 두 줄 지그재그
  const items = [];
  let x = BATTERY_X;
  for (const g of groups) {
    for (let i = 0; i < g.n; i++) {
      items.push({ k: g.k, x: Math.round(x), row: i % 2 });
      x += step;
    }
    x += BATTERY_GAP;
  }

  // 뒷줄 먼저, 각 줄은 오른쪽부터 — 왼쪽/앞줄이 위로 겹쳐 깊이가 생긴다
  for (const row of [0, 1]) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.row !== row) continue;
      const dim = armsHilite && it.k !== armsHilite;
      blit(ctx, cannonSprite(it.k), it.x, BATTERY_Y + row * BATTERY_ROW,
           1, false, dim ? 0.3 : 1);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   레이아웃 — 패널을 논리좌표에 맞춰 무대 위에 얹는다
   ══════════════════════════════════════════════════════════════ */
function layout() {
  if (!panelEl) return;
  const { offX, offY, scale } = viewport();
  Object.assign(panelEl.style, {
    left: `${offX + PANEL.x * scale}px`,
    top: `${offY + PANEL.y * scale}px`,
    width: `${PANEL.w * scale}px`,
    height: `${PANEL.h * scale}px`,
  });
}

const TABS = [
  { id: 'ship', label: '선박' },
  { id: 'used', label: '중고' },
  { id: 'crew', label: '선원' },
  { id: 'arms', label: '무장' },
  { id: 'refit', label: '개장' },
];

function buildUI() {
  panelEl = el('div#yard-panel', {}, [
    el('div.yard-head', {}, [
      el('div', {}, [
        el('h3', { text: `${city.name} 조선소` }),
        el('div.sub', { text: `${ship().name} · 선체 ${state.hp}/${state.maxHp} · 선원 ${state.crew}/${state.crewMax} · 포 ${state.guns}/${gunCap()}문` }),
        el('div.sub', {
          text: `속력 ${shipSpeed().toFixed(2)}`
              + (shorthanded() ? ` · 인원 부족 (최소 ${ship().crewMin}명)` : '')
              + (fleetUpkeep() ? ` · 선단 유지비 ${fleetUpkeep()}닢/일` : ''),
          style: shorthanded() ? { color: '#e0806e' } : null,
        }),
      ]),
      el('button.btn.sm.dark', { text: '나가기', onclick: () => go('port') }),
    ]),
    el('div.yard-tabs', {}, TABS.map((t) =>
      el(`button.yard-tab${t.id === tab ? '.on' : ''}`, {
        text: t.label,
        onclick: () => { tab = t.id; armsHilite = null; buildUI(); },
      }))),
    el('div.yard-body', {}, tab === 'ship' ? shipTab()
                          : tab === 'used' ? usedTab()
                          : tab === 'crew' ? crewTab()
                          : tab === 'arms' ? armsTab()
                          : refitTab()),
  ]);
  overlay.replaceChildren(panelEl);
  layout();
}

function redraw() {
  preview = null;          // 배가 바뀌었을 수 있으니 미리보기를 접는다
  refreshHUD();
  refreshLog();
  buildUI();
}

/* ══════════════════════════════════════════════════════════════
   선박 탭 — 보유 / 구입. 자동 매각은 없다.
   ══════════════════════════════════════════════════════════════ */
function shipTab() {
  const rows = [];
  const seenKey = preview || state.shipKey;
  for (const [key, s] of Object.entries(SHIPS)) {
    const rec = state.fleet[key];
    const aboard = state.shipKey === key;
    const here = rec && rec.at === state.at;

    rows.push(el(`div.yard-ship${key === seenKey ? '.on' : ''}`, {
      title: '눌러서 이 배를 화면에 띄운다',
      onclick: (ev) => {
        if (ev.target.closest('button')) return;    // 버튼 클릭은 그대로 통과
        preview = key === state.shipKey ? null : key;
        buildUI();
      },
    }, [
      spriteEl(shipTopSprite(key, { tint: s.tint, flag: city.flag }), 2),
      el('div.info', {}, [
        el('div.n', {}, [
          el('b', { text: s.name }),
          el('span.origin', { text: s.origin }),
          aboard ? el('span.badge.now', { text: '승선 중' })
                 : rec ? el(`span.badge${here ? '.here' : ''}`,
                            { text: here ? '이 항구 정박' : `${CITY_BY_ID[rec.at].name} 정박` })
                       : el(`span.badge${sellsShip(key) ? '.buy' : ''}`, {
                           text: sellsShip(key) ? `${shipPriceAt(key).toLocaleString('ko-KR')}닢`
                             : shipLockedBy(key) ? '아직 못 짓는다' : '이 항구엔 못 짓는다',
                         }),
        ]),
        el('div.sp', { text: `선체 ${s.hp} · 화물 ${s.cargo} · 포문 ${s.guns}(최대 ${Math.floor(s.guns * 1.5)}) · 선원 ${s.crewMin ?? 0}~${s.crewMax} · 속력 ${s.speed} · 유지 ${s.upkeep}닢/일` }),
        el('div.ds', { text: s.desc }),
        !rec && !sellsShip(key)
          ? el('div.ds', {
              text: whyNot(key, s),
              style: { color: '#8a7f6a' },
            })
          : null,
      ]),
      el('div.acts', {}, shipActions(key, s, rec, aboard, here)),
    ]));
  }

  return el('div', {}, [
    el('p.yard-note', {
      html: `<b>${city.name}</b> 조선소 — 공업력 <b>${industryOf()}</b>`
          + `(0=내륙 · 1=소형 · 2=대형 상선 · 3=최상급). 제 나라 배는 한 등급 쉽게 짓고, `
          + '오래 지어온 항구는 값이 싸다.',
    }),
    el('p.yard-note', {
      html: '줄을 누르면 그 배가 <b>화면에 뜬다</b>. 배는 마지막으로 내린 항구에 그대로 남고, '
          + '갈아탈 때 자동으로 팔지 않는다.',
    }),
    preview && preview !== state.shipKey
      ? el('div.yard-seen', { text: `화면에 띄운 배 — ${SHIPS[preview].name} (미리보기)` })
      : null,
    ...rows,
  ]);
}

/** 왜 여기선 못 짓는지 — 공업력이 모자란 것과 아직 안 열린 것은 다른 문제다 */
function whyNot(key, s) {
  if (!s.tier) return '→ 시중에 나오지 않는 배';
  const lock = shipLockedBy(key);
  if (lock) return `→ ${lock}을(를) 몰아 본 선주에게만 내놓는다`;
  const where = buildableAt(key).slice(0, 4).join(' · ');
  return `→ 이 항구는 공업력 ${industryOf()}, ${tierNeeded(key)} 필요`
       + (where ? ` — ${where}에서 짓는다` : '');
}

/** 중고 매물 — 신조만 있으면 "그 항구에 가기 전엔 방법이 없다"가 된다.
    싸게 즉시 손에 넣되 선체가 상해 있어 수리비가 든다. */
function usedTab() {
  const lots = usedListings();
  const prize = !!city.prizeYard;
  const head = el('p.yard-note', {
    html: prize
      ? `<b>${city.name}</b>는 나포선을 뜯어 고쳐 넘기는 항구다 — 매물이 자주, 싸게 걸린다. `
        + '선체가 상한 채로 오니 수리비를 셈에 넣어야 한다.'
      : '중고선은 값이 싸고 <b>지금 바로</b> 손에 들어오지만 선체가 상해 있다. '
        + '매물은 사흘마다 갈린다.',
  });
  if (!lots.length) {
    return el('div', {}, [head, el('div.yard-seen', { text: '지금은 나온 매물이 없다.' })]);
  }
  const rows = lots.map((lot) => {
    const s = SHIPS[lot.key];
    const mine = !!state.fleet[lot.key];
    return el('div.yard-ship', {}, [
      spriteEl(shipTopSprite(lot.key, { tint: s.tint, flag: city.flag }), 2),
      el('div.info', {}, [
        el('div.n', {}, [
          el('b', { text: s.name }),
          el('span.origin', { text: lot.prize ? '나포선 개조' : '중고' }),
          el('span.badge.buy', { text: `${lot.price.toLocaleString('ko-KR')}닢` }),
          el('span.origin', { text: `정가 ${s.price.toLocaleString('ko-KR')}닢` }),
        ]),
        el('div.sp', {
          text: `선체 ${lot.hp}/${s.hp} (${Math.round(lot.wear * 100)}% 상함) · 화물 ${s.cargo}`
              + ` · 포문 ${s.guns} · 선원 ${s.crewMin ?? 0}~${s.crewMax} · 속력 ${s.speed}`,
        }),
        el('div.ds', { text: s.desc }),
      ]),
      el('div.acts', {}, [
        mine ? el('span.dim', { text: '이미 보유' })
             : el('button.btn.sm', {
                 text: '사들이기',
                 disabled: lot.price > state.gold,
                 onclick: () => {
                   const r = buyUsed(lot.key);
                   if (!r.ok) return toast(r.reason, 'bad');
                   toast(`${s.name} 중고 매입 · ${r.cost.toLocaleString('ko-KR')}닢 (선체 ${r.hp}/${s.hp})`, 'good');
                   pushLog(`${city.name}에서 중고 ${s.name}을(를) 사들였다. 선체가 ${Math.round((1 - r.hp / s.hp) * 100)}% 상해 있다.`, 'good');
                   redraw();
                 },
               }),
      ]),
    ]);
  });
  return el('div', {}, [head, ...rows]);
}

function shipActions(key, s, rec, aboard, here) {
  if (aboard) return [el('span.dim', { text: '—' })];

  if (!rec) {
    if (!sellsShip(key)) {
      return [el('span.dim', { text: shipLockedBy(key) ? '미해금' : `공업력 ${tierNeeded(key)}` })];
    }
    return [el('button.btn.sm', {
      text: '건조',
      disabled: shipPriceAt(key) > state.gold,
      onclick: () => {
        const r = purchaseShip(key);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${s.name} 구입 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
        pushLog(`${city.name} 조선소에서 ${s.name}을(를) 사들였다.`, 'good');
        redraw();
      },
    })];
  }

  if (!here) return [el('span.dim', { text: '여기 없음' })];

  return [
    el('button.btn.sm', {
      text: '승선',
      disabled: cargoUsed() > s.cargo,
      onclick: () => doBoard(key, s),
    }),
    el('button.btn.sm.dark', {
      text: `매각 ${resaleOf(key).toLocaleString('ko-KR')}`,
      onclick: () => confirmSell(key, s),
    }),
  ];
}

function doBoard(key, s) {
  const drop = Math.max(0, state.crew - s.crewMax);
  const go2 = () => {
    const r = boardShip(key);
    if (!r.ok) return toast(r.reason, 'bad');
    toast(`${s.name}에 올랐다`, 'good');
    pushLog(`${city.name}에서 ${s.name}(으)로 갈아탔다.`
            + (r.dropped ? ` 선원 ${r.dropped}명이 하선했다.` : ''), 'good');
    // 큰 배는 사람을 더 먹는다 — 최소 인원을 못 채우면 돛을 다 펴지 못한다
    if (r.short) {
      pushLog(`${s.name}을(를) 몰려면 최소 ${s.crewMin}명이 필요하다. 지금 ${state.crew}명 — 속력이 떨어진다.`, 'warn');
      toast(`인원 부족 — 최소 ${s.crewMin}명`, 'bad');
    }
    redraw();
  };
  if (drop > 0) {
    modal({
      title: '선실이 모자란다',
      body: `${s.name}의 선실은 ${s.crewMax}명까지다. 선원 <b>${drop}명</b>이 하선한다.`,
      actions: [
        { label: '그래도 갈아탄다', onClick: go2 },
        { label: '취소', kind: 'dark' },
      ],
    });
  } else go2();
}

function confirmSell(key, s) {
  modal({
    title: `${s.name} 매각`,
    body: `정가의 55%인 <b>${resaleOf(key).toLocaleString('ko-KR')}닢</b>을 받는다. `
        + '실려 있던 대포도 함께 넘어간다.',
    actions: [
      { label: '판다', kind: 'danger', onClick: () => {
        const r = sellShip(key);
        if (!r.ok) { toast(r.reason, 'bad'); return; }
        toast(`${s.name} 매각 · ${r.gain.toLocaleString('ko-KR')}닢`, 'good');
        pushLog(`${city.name}에서 ${s.name}을(를) 팔았다.`);
        redraw();
      } },
      { label: '그만둔다', kind: 'dark' },
    ],
  });
}

/* ══════════════════════════════════════════════════════════════
   선원 탭 — 백병전에 나가는 갑판 6칸을 직접 짠다
   ══════════════════════════════════════════════════════════════ */
function crewTab() {
  const open = openSlots();
  const slots = [];
  for (let i = 0; i < MELEE_SLOTS; i++) {
    const k = i === 0 ? 'captain' : state.loadout[i];
    const locked = i > open;
    slots.push(el(`div.slot${i === 0 ? '.fixed' : ''}${locked ? '.locked' : ''}`, {
      onclick: i === 0 || locked ? null : () => pickTroop(i),
    }, [
      k && !locked ? spriteElTrim(unitSprite(k, 'idle'), 2, 0)
                   : el('div.empty', { text: locked ? '─' : '＋' }),
      el('div.sn', { text: locked ? `선원 ${i * 7}명` : k ? TROOPS[k].name : '비었음' }),
      locked ? el('div.sn2', { text: '필요' }) : null,
    ]));
  }

  const troops = playerLine();
  return el('div', {}, [
    el('p.yard-note', {
      html: '갑판 배치가 <b>그대로 백병전에 나간다</b>. 선장 자리는 고정, '
          + '나머지는 <b>선원 7명당 한 칸</b>씩 열린다.',
    }),
    el('div.slot-row', {}, slots),
    el('div.yard-sum', {}, [
      el('div', {}, [el('span.k', { text: '백병 공격력' }), el('b', { text: troops.atk })]),
      el('div', {}, [el('span.k', { text: '방어력' }), el('b', { text: troops.def })]),
      el('div', {}, [el('span.k', { text: '총 체력' }), el('b', { text: troops.hp })]),
    ]),
    el('div.yard-svc', {}, [
      svcRow(`선원 고용 (${HIRE_UNIT}닢/명)`, `${state.crew}/${state.crewMax}명`, '5명 고용',
        state.crew >= state.crewMax, () => {
          const r = hire(5);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`선원 ${r.n}명 고용 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
          redraw();
        }),
      svcRow(`선체 수리 (${REPAIR_UNIT}닢/pt)`, `${state.hp}/${state.maxHp}`, '전부 수리',
        state.hp >= state.maxHp, () => {
          const r = repair(state.maxHp - state.hp);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`선체 ${r.need}pt 수리 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
          redraw();
        }),
    ]),
  ]);
}

function playerLine() {
  const keys = ['captain', ...state.loadout.slice(1, openSlots() + 1).filter(Boolean)];
  return keys.reduce((a, k) => ({
    atk: a.atk + TROOPS[k].atk, def: a.def + TROOPS[k].def, hp: a.hp + TROOPS[k].hp,
  }), { atk: 0, def: 0, hp: 0 });
}

function pickTroop(i) {
  const prev = state.loadout[i];
  const refund = prev && TROOPS[prev].hire ? Math.round(TROOPS[prev].hire * TROOP_REFUND) : 0;
  const list = el('div.pick-list');
  // 숨어 있는 항해일지(#logmodal)도 .modal이라 querySelector로 닫으면 안 된다.
  // modal()이 돌려주는 노드를 직접 잡아 닫는다.
  let box = null;
  const close = () => box?.remove();

  for (const k of RECRUITS) {
    const t = TROOPS[k];
    const due = t.hire - refund;
    list.append(el(`div.pick${k === prev ? '.on' : ''}`, {}, [
      spriteElTrim(unitSprite(k, 'idle'), 2, 0),
      el('div.info', {}, [
        el('div.n', {}, [
          el('b', { text: t.name }),
          el('span.st', { text: `공 ${t.atk} · 방 ${t.def} · 체 ${t.hp}` }),
        ]),
        el('div.ds', { text: t.desc }),
      ]),
      k === prev ? el('span.dim', { text: '배치 중' }) : el('button.btn.sm', {
        text: due <= 0 ? '무료' : `${due.toLocaleString('ko-KR')}닢`,
        disabled: due > state.gold,
        onclick: () => {
          const r = setSlot(i, k);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${i}번 자리에 ${t.name} 배치`, 'good');
          close();
          redraw();
        },
      }),
    ]));
  }

  box = modal({
    title: `${i}번 자리 — 누구를 세울까`,
    body: el('div', {}, [
      el('p', {
        html: prev
          ? `지금은 <b>${TROOPS[prev].name}</b>. 바꾸면 ${refund.toLocaleString('ko-KR')}닢을 돌려받고 차액만 낸다.`
          : '비어 있는 자리다.',
      }),
      list,
      prev ? el('button.btn.sm.dark', {
        text: `내리기 (+${refund.toLocaleString('ko-KR')}닢)`,
        style: { marginTop: '8px' },
        onclick: () => {
          const r = setSlot(i, null);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${TROOPS[prev].name} 하선 · +${r.refund.toLocaleString('ko-KR')}닢`);
          close();
          redraw();
        },
      }) : null,
    ]),
    actions: [{ label: '닫기', kind: 'dark' }],
  });
}

/* ══════════════════════════════════════════════════════════════
   무장 탭 — 포문에 어떤 대포를 얹을지
   ══════════════════════════════════════════════════════════════ */
function armsTab() {
  const cap = gunCap(), used = armsTotal();
  const rows = CANNON_KEYS.map((k) => {
    const c = CANNONS[k];
    const have = state.arms[k] || 0;
    return el(`div.arm-row${have > 0 ? '.on' : ''}`, {
      // 부두에 늘어놓은 대포 중 이 종류만 밝게 — UI는 다시 그리지 않는다(떨림 방지)
      onmouseenter: () => { armsHilite = k; },
      onmouseleave: () => { armsHilite = null; },
    }, [
      el('div.info', {}, [
        el('div.n', {}, [
          el('b', { text: c.name }),
          el('span.st', { text: `피해 ×${c.dmg.toFixed(2)} · 조준 ×${c.aim.toFixed(2)}` }),
          el('span.zn', { text: `잘 맞는 거리 ${c.near}~${c.far}` }),
        ]),
        zoneBar(c),
        el('div.ds', { text: c.desc }),
      ]),
      el('div.cnt', { text: `${have}문` }),
      el('div.acts', {}, [
        el('button.btn.sm.dark', {
          text: `−  ${Math.round(c.price * CANNON_REFUND).toLocaleString('ko-KR')}`,
          disabled: have <= 0,
          onclick: () => {
            const r = removeCannon(k, 1);
            if (!r.ok) return toast(r.reason, 'bad');
            toast(`${c.name} 철거 · +${r.refund.toLocaleString('ko-KR')}닢`);
            redraw();
          },
        }),
        el('button.btn.sm', {
          text: `+  ${c.price.toLocaleString('ko-KR')}`,
          disabled: used >= cap || c.price > state.gold,
          onclick: () => {
            const r = buyCannon(k, 1);
            if (!r.ok) return toast(r.reason, 'bad');
            toast(`${c.name} ${r.n}문 탑재 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
            redraw();
          },
        }),
      ]),
    ]);
  });

  return el('div', {}, [
    el('p.yard-note', {
      html: `포문은 <b>${used}/${cap}문</b>. 대포마다 <b>잘 맞는 거리</b>가 달라서, `
          + '싸울 거리를 정해 놓고 고르거나 섞어서 구간을 메운다.',
    }),
    el('div.port-bar', {}, Array.from({ length: cap }, (_, i) =>
      el(`div.port${i < used ? '.on' : ''}`))),
    ...rows,
    el('div.yard-sum', {}, [
      el('div', {}, [el('span.k', { text: '한 발 피해' }), el('b', { text: `×${armsFactor('dmg').toFixed(2)}` })]),
      ...RANGE_PROBES.map((p) => el('div', {}, [
        el('span.k', { text: `${p.label} 조준` }),
        el('b', { text: `×${armsAimAt(p.at).toFixed(2)}` }),
      ])),
    ]),
    used <= 0 ? el('p.yard-warn', { text: '포문이 비었다. 이대로는 포격을 할 수 없다.' }) : null,
    shotShop(),
  ]);
}

/* 특수탄 — 전투에서 한 발씩 소모한다. 일반탄은 화약고에 늘 있다. */
function shotShop() {
  const rows = SHOT_KEYS.filter((k) => SHOTS[k].price > 0).map((k) => {
    const s = SHOTS[k];
    const have = state.shots[k] || 0;
    return el('div.shot-row', {}, [
      el('div.info', {}, [
        el('div.n', {}, [el('b', { text: s.name }), el('span.st', { text: `${s.price}닢/발` })]),
        el('div.ds', { text: s.desc }),
      ]),
      el('div.cnt', { text: `${have}발` }),
      el('button.btn.sm', {
        text: `+5  ${(s.price * 5).toLocaleString('ko-KR')}`,
        disabled: s.price > state.gold,
        onclick: () => {
          const r = buyShot(k, 5);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${s.name} ${r.n}발 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
          redraw();
        },
      }),
    ]);
  });

  return el('div', {}, [
    el('h4.yard-sub', { text: '탄약고' }),
    el('p.yard-note', {
      html: '포격할 때 <b>무엇을 재어 넣을지</b> 고른다. 사슬탄은 돛을 찢어 적을 묶고, '
          + '포도탄은 백병전 전에 머릿수를 깎고, 가열탄은 불을 붙인다.',
    }),
    ...rows,
  ]);
}

/* ══════════════════════════════════════════════════════════════
   개장 탭 — 배 한 척에 영구히 붙는 손질. 갈아타면 그 배의 개장을 쓴다.
   ══════════════════════════════════════════════════════════════ */
function refitTab() {
  const rows = REFIT_KEYS.map((k) => {
    const r = REFITS[k];
    const done = hasRefit(k);
    return el(`div.refit-row${done ? '.on' : ''}`, {}, [
      el('div.info', {}, [
        el('div.n', {}, [
          el('b', { text: r.name }),
          el('span.st', { text: r.effect }),
        ]),
        el('div.ds', { text: r.desc }),
      ]),
      done ? el('span.badge.here', { text: '완료' }) : el('button.btn.sm', {
        text: `${r.price.toLocaleString('ko-KR')}닢`,
        disabled: r.price > state.gold,
        onclick: () => {
          const r2 = buyRefit(k);
          if (!r2.ok) return toast(r2.reason, 'bad');
          toast(`${r.name} 완료 · ${r2.cost.toLocaleString('ko-KR')}닢`, 'good');
          pushLog(`${city.name} 조선소에서 ${ship().name}에 ${r.name}을(를) 했다.`, 'good');
          if (r2.dropped) {
            pushLog(`상갑판을 깎으며 대포 ${r2.dropped}문을 뜯어냈다.`, 'warn');
            toast(`포문이 줄어 대포 ${r2.dropped}문을 잃었다`, 'bad');
          }
          redraw();
        },
      }),
    ]);
  });

  return el('div', {}, [
    el('p.yard-note', {
      html: '개장은 <b>배에 붙는다</b>. 갈아타면 그 배에 해 둔 손질을 쓰게 되고, '
          + '팔면 함께 넘어간다. 지금 손보는 배는 <b>' + ship().name + '</b>.',
    }),
    ...rows,
    el('p.yard-warn', {
      text: '레이지 개조는 포문 상한을 깎는다. 넘치는 대포는 환불 없이 뜯겨 나간다.',
    }),
  ]);
}

/* 전투 거리(0~100) 위에 그 대포가 잘 맞는 구간을 띠로 표시한다 */
const RANGE_PROBES = [
  { label: '근접', at: 10 },
  { label: '중거리', at: 50 },
  { label: '원거리', at: 90 },
];

function zoneBar(c) {
  return el('div.zone-bar', {}, [
    el('div.band', { style: { left: `${c.near}%`, width: `${c.far - c.near}%` } }),
    ...RANGE_PROBES.map((p) => el('div.tick', {
      style: { left: `${p.at}%`, opacity: zoneFactor(c, p.at) },
      title: `${p.label} 조준 ×${(c.aim * zoneFactor(c, p.at)).toFixed(2)}`,
    })),
  ]);
}

function svcRow(label, value, btnLabel, disabled, onClick) {
  return el('div.svc-row', {}, [
    el('div', {}, [
      el('div.lbl', { text: label }),
      el('div.val', { text: value, style: { fontSize: '11.5px', color: '#8f8878' } }),
    ]),
    el('button.btn.sm.dark', { text: btnLabel, disabled, onclick: onClick }),
  ]);
}
