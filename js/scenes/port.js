// scenes/port.js — 항구: 시세 확인과 매매, 선박 정비, 출항

import { portSprite } from '../sprites/scene.js';
import { shipSprite, WATERLINE } from '../sprites/ship.js';
import { unitSprite } from '../sprites/char.js';
import { blit } from '../pixel.js';
import { GOODS, GOOD_BY_ID, CITY_BY_ID, SHIPS } from '../data.js';
import {
  state, ship, cargoUsed, cargoFree, buy, sell, repair, hire,
  marketTag, pushLog, gunCap, playerTroops, REPAIR_UNIT, HIRE_UNIT,
  impactFactor, costFor, tariffRate,
  contractOffer, acceptContract, deliverContract, abandonContract,
} from '../state.js';
import { npcsAtPort } from '../world.js';
import { el, overlay, toast, refreshHUD, iconEl } from '../ui.js';
import { go } from '../main.js';

let bg, city, dockers;

/* 부두에 세워둘 NPC — 도시마다 고정되도록 seed로 뽑는다 */
function pickDockers(seedBase) {
  const roster = ['sailor', 'musketeer', 'pikeman', 'gunner', 'swordsman', 'corsair'];
  const out = [];
  for (let i = 0; i < 3; i++) {
    const k = roster[(seedBase + i * 7) % roster.length];
    // 배를 논리 x=132로 옮겼으므로 부두 사람들은 그 왼쪽에 세운다
    out.push({ key: k, x: 8 + i * 34 + ((seedBase * (i + 3)) % 11), flip: i % 2 === 1 });
  }
  return out;
}

export const portScene = {
  enter() {
    city = CITY_BY_ID[state.at];
    bg = portSprite(city.style, city.seed);
    dockers = pickDockers(city.seed);
    state.known.add(city.id);
    buildUI();
  },

  draw(ctx, t) {
    blit(ctx, bg, 0, 0, 1);

    // 정박한 우리 배 — 수면선을 항구 물높이에 맞춘다.
    // x는 좌우 UI 패널 사이의 빈 구간(논리 132~308)에 맞춘 값이다.
    // 오른쪽에 두면 사이드패널에 가려 배가 안 보인다.
    const bob = Math.round(Math.sin(t * 0.9) * 1.2);
    blit(ctx, shipSprite(ship().hull, { tint: ship().tint, flag: city.flag, furl: true }),
         132, 168 - WATERLINE + bob, 1);

    // 부두 위 사람들
    for (const d of dockers) {
      blit(ctx, unitSprite(d.key, 'idle'), d.x, 150, 1, d.flip);
    }
  },
};

/* ══════════════════════════════════════════════════════════════ */
function buildUI() {
  overlay.replaceChildren(
    el('div#port-wrap', {}, [marketPanel(), sidePanel()])
  );
}

function marketPanel() {
  const body = el('div.scroll');
  const panel = el('div.panel#port-market', {}, [
    el('h3', {}, [
      el('span', { text: `${city.name} 시장` }),
      el('span', {
        style: { fontSize: '11px', color: '#9a917f', letterSpacing: 0 },
        text: `적재 ${cargoUsed()}/${state.cargoCap}`,
      }),
    ]),
    body,
  ]);
  body.append(marketTable());
  return panel;
}

function marketTable() {
  const tbl = el('table.market');
  tbl.append(el('thead', {}, el('tr', {}, [
    el('th', { text: '품목' }),
    el('th.num', { text: '시세' }),
    el('th.num', { text: '보유' }),
    el('th.num', { text: '손익' }),
    el('th.num', { text: '거래', style: { width: '150px' } }),
  ])));

  const tb = el('tbody');
  for (const g of GOODS) {
    const unit = state.prices[city.id][g.id];
    const have = state.cargo[g.id] || 0;
    const tag = marketTag(city.id, g.id);
    const avg = state.buyPrice[g.id] || 0;
    const diff = have > 0 ? unit - avg : 0;
    const press = impactFactor(city.id, g.id, 0);      // 지금 이 품목에 걸린 시장 압력

    const tr = el('tr', {}, [
      el('td', {}, el('div.gname', {}, [
        iconEl(g.icon, 1),
        el('span', { text: g.name }),
        tag && el(`span.tag.${tag}`, { text: tag === 'supply' ? '산지' : '수요' }),
      ])),
      el('td.num', {}, [
        el('span', { text: unit.toLocaleString('ko-KR') }),
        press >= 0.02 ? el('span.press', {
          text: ` ∓${Math.round(press * 100)}%`,
          title: '최근 이 항구에서 많이 거래해 값이 불리해졌다. 날이 지나면 회복한다.',
        }) : null,
      ].filter(Boolean)),
      el('td.num', {}, have ? el('span.qty', { text: have }) : el('span', {
        text: '—', style: { color: '#5d5768' },
      })),
      el('td.num', {}, have
        ? el(`span.${diff >= 0 ? 'profit-up' : 'profit-dn'}`, {
            text: `${diff >= 0 ? '+' : ''}${(diff * have).toLocaleString('ko-KR')}`,
          })
        : el('span', { text: '—', style: { color: '#5d5768' } })),
      el('td.num', {}, el('div.trade-btns', {}, [
        el('button.btn.sm.dark', {
          text: '사기', disabled: costFor(g.id, 1) > state.gold || cargoFree() <= 0,
          onclick: (e) => doBuy(g.id, e.shiftKey ? 999 : e.ctrlKey ? 1 : 10),
        }),
        el('button.btn.sm', {
          text: '팔기', disabled: have <= 0,
          onclick: (e) => doSell(g.id, e.shiftKey ? 999 : e.ctrlKey ? 1 : 10),
        }),
      ])),
    ]);
    tb.append(tr);
  }
  tbl.append(tb);
  tbl.append(el('caption', {
    text: `기본 10개 단위 · Shift=전량 · Ctrl=1개 · 한 번에 많이 거래할수록 단가가 불리해진다 · 입항세 ${Math.round(tariffRate(city.id) * 100)}%`,
    style: {
      captionSide: 'bottom', fontSize: '11px', color: '#6f6858',
      padding: '6px 8px', textAlign: 'left',
    },
  }));
  return tbl;
}

function doBuy(id, qty) {
  const r = buy(id, qty);
  if (!r.ok) return toast(r.reason, 'bad');
  toast(`${GOODS.find((g) => g.id === id).name} ${r.qty}개 매입 · ${r.cost.toLocaleString('ko-KR')}닢`
        + (r.unit > r.base ? ` (단가 ${r.unit} — 시세 ${r.base}, 물량이 값을 밀어올렸다)` : ''));
  after();
}

function doSell(id, qty) {
  const r = sell(id, qty);
  if (!r.ok) return toast(r.reason, 'bad');
  const name = GOODS.find((g) => g.id === id).name;
  toast(`${name} ${r.qty}개 매각 · ${r.gain.toLocaleString('ko-KR')}닢`
        + ` (${r.profit >= 0 ? '+' : ''}${r.profit.toLocaleString('ko-KR')}`
        + (r.tariff ? ` · 입항세 ${r.tariff.toLocaleString('ko-KR')}` : '') + ')',
        r.profit >= 0 ? 'good' : 'bad');
  after();
}

function after() {
  refreshHUD();
  buildUI();
}

/* ── 대형 주문 ────────────────────────────────────────
   여러 항차를 굴려 모으는 길 옆에 "한 건 크게 무는 길"을 둔다. */
function contractCard() {
  const c = state.contract;

  if (c) {
    const left = c.due - state.day;
    const here = c.to === state.at;
    const have = state.cargo[c.goodId] || 0;
    return el('div.panel', {}, [
      el('h3', {}, [
        el('span', { text: '맡은 주문' }),
        el('span', {
          text: `기한 ${left}일`,
          style: { fontSize: '11px', color: left <= 2 ? '#d05a4a' : '#8f8878', letterSpacing: 0 },
        }),
      ]),
      el('div.svc', {}, [
        el('div.ctr-line', {
          html: `<b>${GOOD_BY_ID[c.goodId].name} ${c.qty}개</b> → <b>${CITY_BY_ID[c.to].name}</b>`,
        }),
        el('div.ctr-sub', {
          text: `보수 ${c.pay.toLocaleString('ko-KR')}닢 (선금 ${c.advance.toLocaleString('ko-KR')} 수령) · `
              + `실은 것 ${have}/${c.qty}`,
        }),
        here
          ? el('button.btn.sm', {
              text: have >= c.qty ? '납품한다' : `${c.qty - have}개 모자란다`,
              disabled: have < c.qty,
              onclick: () => {
                const r = deliverContract();
                if (!r.ok) return toast(r.reason, 'bad');
                toast(`납품 완료 · 잔금 ${r.paid.toLocaleString('ko-KR')}닢`, 'good');
                pushLog(`${city.name}에 주문을 납품했다. 보수 ${r.total.toLocaleString('ko-KR')}닢.`, 'good');
                after();
              },
            })
          : el('div.ctr-sub', { text: `${CITY_BY_ID[c.to].name}까지 가야 한다.` }),
        el('button.btn.sm.dark', {
          text: '포기한다',
          onclick: () => {
            const r = abandonContract();
            if (!r.ok) return toast(r.reason, 'bad');
            toast(`계약 파기 · 위약금 ${r.fine.toLocaleString('ko-KR')}닢`, 'bad');
            after();
          },
        }),
      ]),
    ]);
  }

  const o = contractOffer();
  if (!o) return null;
  const days = o.due - state.day;
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '상관 게시판' }),
      el('span', { text: `기한 ${days}일`, style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, [
      el('div.ctr-line', {
        html: `<b>${GOOD_BY_ID[o.goodId].name} ${o.qty}개</b>를 <b>${CITY_BY_ID[o.to].name}</b>까지`,
      }),
      el('div.ctr-sub', {
        text: `보수 ${o.pay.toLocaleString('ko-KR')}닢 · 선금 ${o.advance.toLocaleString('ko-KR')}닢 · `
            + `물건은 직접 마련해야 한다`,
      }),
      el('button.btn.sm', {
        text: `수주 (선금 +${o.advance.toLocaleString('ko-KR')})`,
        onclick: () => {
          const r = acceptContract();
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`주문 수주 · 선금 ${r.contract.advance.toLocaleString('ko-KR')}닢`, 'good');
          pushLog(`${city.name} 상관에서 ${GOOD_BY_ID[o.goodId].name} ${o.qty}개 주문을 맡았다.`, 'good');
          after();
        },
      }),
    ]),
  ]);
}

/* 이 항구에 지금 들어와 있는 배들 — 세계가 혼자 돌아간다는 것이 보이는 창 */
function harborCard() {
  const ships = npcsAtPort(city.id);
  if (!ships.length) return null;
  return el('div.panel', {}, [
    el('h3', {}, el('span', { text: '정박 중인 배' })),
    el('div.svc', {}, ships.slice(0, 5).map((n) => el('div.ctr-sub', {
      text: `${n.name}호 (${SHIPS[n.shipKey].name})`
          + (n.kind === 'pirate' ? ' — 수상한 무리다' : ''),
      style: n.kind === 'pirate' ? { color: '#d05a4a' } : null,
    }))),
  ]);
}

/* ── 우측: 정비/조선소/출항 ─────────────────────────── */
function sidePanel() {
  return el('div#port-side', {}, [
    el('div.panel', {}, [
      el('h3', {}, el('span', { text: city.name })),
      el('div.city-card', {}, [
        el('div', {}, [
          el('span.cname', { text: city.name }),
          el('span.creg', { text: city.region }),
        ]),
        el('div.cblurb', { text: city.blurb }),
      ]),
    ]),

    el('div.panel', {}, [
      el('h3', {}, el('span', { text: '선박 정비' })),
      el('div.svc', {}, [
        svcRow(`선체 수리 (${REPAIR_UNIT}닢/pt)`, `${state.hp}/${state.maxHp}`,
          '전부 수리', state.hp >= state.maxHp, () => {
            const r = repair(state.maxHp - state.hp);
            if (!r.ok) return toast(r.reason, 'bad');
            toast(`선체 ${r.need}pt 수리 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
            pushLog(`${city.name}에서 선체를 수리했다.`);
            after();
          }),
        svcRow(`선원 고용 (${HIRE_UNIT}닢/명)`, `${state.crew}/${state.crewMax}`,
          '5명', state.crew >= state.crewMax, () => {
            const r = hire(5);
            if (!r.ok) return toast(r.reason, 'bad');
            toast(`선원 ${r.n}명 고용 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
            after();
          }),
        svcRow('무장', `${state.guns}/${gunCap()}문`,
          '무장 탭', false, () => go('shipyard', { tab: 'arms' })),
        svcRow('갑판 배치', `${playerTroops().length}칸`,
          '선원 탭', false, () => go('shipyard', { tab: 'crew' })),
        el('button.btn.dark', {
          text: '⚒  조선소로 간다',
          onclick: () => go('shipyard'),
        }),
      ]),
    ]),

    contractCard(),
    harborCard(),

    el('button.btn', {
      text: '⚓  출항하기',
      style: { fontSize: '14px', padding: '10px' },
      onclick: () => go('map'),
    }),
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
