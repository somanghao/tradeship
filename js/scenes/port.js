// scenes/port.js — 항구: 시세 확인과 매매, 선박 정비, 출항

import { portSprite } from '../sprites/scene.js';
import { shipSprite, WATERLINE } from '../sprites/ship.js';
import { unitSprite } from '../sprites/char.js';
import { blit } from '../pixel.js';
import { GOODS, GOOD_BY_ID, CITIES, CITY_BY_ID, SHIPS, OFFICER } from '../data.js';
import {
  state, ship, cargoUsed, cargoFree, buy, sell, repair,
  marketTag, tagRank, pushLog, gunCap, playerTroops, REPAIR_UNIT,
  impactFactor, costFor, tariffRate, shorthanded,
  contractOffer, acceptContract, deliverContract, abandonContract,
  hasOfficer, paydayDue, daysToPayday, payrollOwed,
} from '../state.js';
import { openPayday } from '../payday.js';
import { npcsAtPort, figuresAt } from '../world.js';
import { goodRank, goodBasis } from '../evidence.js';
import { el, overlay, toast, refreshHUD, iconEl, spriteElTrim, modal, josa, npcTitle } from '../ui.js';
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
    // 급여일은 **항구에서만** 온다 — 바다에서는 돈을 줄 데가 없다.
    // 화면을 세운 뒤에 띄워야 정산이 끝나고 닫혔을 때 뒤에 항구가 있다.
    if (paydayDue()) openPayday(() => after());
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

    // 부관은 배 곁에 선다 — 사이드패널을 열지 않아도 함께 있다는 것이 보인다
    if (hasOfficer()) {
      blit(ctx, unitSprite(OFFICER.sprite, 'idle'), 108, 150, 1);
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

  /* ★ 목록 순서 = 근거의 신뢰도 순. GOODS 정의 순서로 쌓으면
     구색으로 넣은 줄이 사료로 확인된 특산보다 위에 온다.
     확실한 수요 → 확실한 산지 → 근거가 약한 것 → 교역 대상 아닌 것.
     같은 등급 안에서는 1에서 먼 것(= 값이 세게 갈린 것)부터. */
  /* ★ **그 바다에서 거래되는 것만 목록에 올린다.**
     교역품이 열둘일 때는 전부 늘어놓아도 됐다. 아홉 권역 77종이 되자
     베네치아 시장에 담배와 로그우드가 떴다 — 아직 아메리카를 발견하지도 않았는데.
     그렇다고 그 도시의 supply/demand만 남기면 이웃 항구에서 실어 온 것을 못 판다.
     그래서 세 갈래를 합친다: **이 도시가 사고파는 것 · 이 바다에서 유통되는 것 ·
     지금 내가 싣고 있는 것**. 마지막 갈래가 있어야 카리브에서 실어 온 담배를
     베네치아에서 팔 수 있다 — 그것이 원양 무역의 값어치다. */
  const tradable = (() => {
    const live = new Set();
    for (const c of CITIES) {
      if (c.region !== city.region) continue;
      for (const gid of Object.keys(c.supply ?? {})) live.add(gid);
      for (const gid of Object.keys(c.demand ?? {})) live.add(gid);
    }
    for (const [gid, q] of Object.entries(state.cargo)) if (q > 0) live.add(gid);
    return live;
  })();

  const ordered = GOODS.filter((g) => tradable.has(g.id)).map((g) => {
    const side = marketTag(city.id, g.id);
    const raw = side === 'supply' ? city.supply[g.id] : side === 'demand' ? city.demand[g.id] : 1;
    return { g, side, rank: goodRank(city.id, g.id, side), strength: Math.abs(raw - 1) };
  }).sort((a, b) => a.rank - b.rank || b.strength - a.strength);

  /* 딱지 하나 — '산지/수요' 위에 **이 바다에서 몇째인가**를 얹는다.
     첫째면 진하게, 꼴찌면 옅게. 툴팁이 그 순위를 말로 풀어 준다. */
  const tagChip = (cid, gid, tag) => {
    const r = tagRank(cid, gid);
    const first = r && r.rank === 1 && r.of > 1;
    const last = r && r.rank === r.of && r.of > 2;
    const word = tag === 'supply' ? '산지' : '수요';
    const cls = `span.tag.${tag}${first ? '.deep' : last ? '.faint' : ''}`;
    const tip = !r || r.of < 2
      ? (tag === 'supply' ? '이 바다에서 이곳만 난다' : '이 바다에서 이곳만 원한다')
      : tag === 'supply'
        ? `이 바다의 ${word} ${r.of}곳 가운데 ${r.rank}번째로 싸다`
          + (first ? ' — 여기서 싣는 것이 가장 낫다' : '')
        : `이 바다의 ${word} ${r.of}곳 가운데 ${r.rank}번째로 비싸다`
          + (first ? ' — 여기서 푸는 것이 가장 낫다' : '');
    return el(cls, { text: r && r.of > 1 ? `${word} ${r.rank}/${r.of}` : word, title: tip });
  };

  const tb = el('tbody');
  for (const { g, side: tag, strength } of ordered) {
    const unit = state.prices[city.id][g.id];
    const have = state.cargo[g.id] || 0;
    const avg = state.buyPrice[g.id] || 0;
    const diff = have > 0 ? unit - avg : 0;
    const press = impactFactor(city.id, g.id, 0);      // 지금 이 품목에 걸린 시장 압력

    const tr = el('tr', {}, [
      el('td', {}, el('div.gname', {}, [
        iconEl(g.icon, 1),
        el('span', { text: g.name }),
        /* ★ 딱지에 **정도**를 담는다. 전에는 '산지'냐 '수요'냐만 보여 줬는데,
           같은 '산지'라도 값이 크게 다르다 — 은 사다리에서 포토시(0.44)와 놈브레데디오스(0.74)가
           둘 다 '산지'인데 화면 값은 277과 356으로 30% 차이난다. 그래서 아메리카 테스터가
           "산지 여섯 곳 + 표시 없는 두 곳이라 사다리가 거꾸로 읽힌다"고 적어 왔다.
           딱지 하나로 여섯 항구를 같아 보이게 하면 이 게임에서 가장 공들인 사다리가 안 보인다. */
        tag && tagChip(city.id, g.id, tag),
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
        + (r.tariff ? ` · 입항세 ${r.tariff.toLocaleString('ko-KR')}` : '')
        + (r.cut ? ` · ${OFFICER.name} 몫 ${r.cut.toLocaleString('ko-KR')}` : '') + ')',
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

/* ── 부관 ──────────────────────────────────────────────
   에이미는 첫날부터 타고 있다. 등용도 해고도 없으므로 이 카드는 **버튼 없는 살림 창**이다.
   모든 항구에서 뜬다 — 리알토에만 앉아 있던 사람이 아니라 같이 다니는 사람이기 때문이다. */
function officerCard() {
  const p = OFFICER.perks;
  const leaky = !!ship().leak;
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: OFFICER.title }),
      el('span', {
        text: `함께 ${state.day - state.officer.hiredDay}일째`,
        style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
      }),
    ]),
    el('div.svc', {}, [
      el('div', { style: { display: 'flex', alignItems: 'flex-start' } }, [
        el('div', {
          style: { flex: '0 0 auto', imageRendering: 'pixelated', marginRight: '8px' },
        }, spriteElTrim(unitSprite(OFFICER.sprite, 'idle'), 2)),
        el('div', {}, [
          el('div.ctr-line', { html: `<b>${OFFICER.name}</b>` }),
          el('div.ctr-sub', {
            text: `입항세 −${Math.round(p.tariffOff * 100)}% · 대량거래 벌점 −${Math.round(p.impactOff * 100)}%`
                + ` · 계약 보수 +${Math.round(p.contractUp * 100)}%`,
          }),
          el('div.ctr-sub', {
            html: `급여 <b>${OFFICER.wage}닢/일</b>`
                + ` · 성과급 <b>이익의 ${Math.round(OFFICER.cut * 100)}%</b>`,
          }),
          el('div.ctr-sub', {
            html: `<span style="color:#6f6858">지금까지 급여 `
                + `${state.officer.paid.toLocaleString('ko-KR')} · 성과급 `
                + `${state.officer.earned.toLocaleString('ko-KR')}닢</span>`,
          }),
        ]),
      ]),
      /* 한 줄만 띄운다. 셋을 한꺼번에 걸면 카드가 대사집이 되고, 매번 같은 줄이 붙어 있으면
         벽지가 된다. 지금 상황에 맞는 것 하나만:
           ① 물 새는 배를 몰고 있으면 재촉한다(떠나겠다는 말이 아니다 — 떠날 수 없는 사람이다)
           ② 첫날에는 자기소개. ★ 이 줄이 이 게임 문체의 기준인데 **어디에도 안 떠 있었다.**
           ③ 세금이 무거운 항구에서는 서류 이야기를 한다(그 감면이 실제로 걸리는 자리다) */
      officerLine(leaky),
    ].filter(Boolean)),
  ]);
}

/** 지금 이 항구에서 에이미가 할 말 — 없으면 null */
function officerLine(leaky) {
  const L = OFFICER.lines;
  // 아직 한 번도 안 떠난 날. 날짜는 항해할 때만 흐르므로(state.js: advanceDays) 이것이 첫날이다
  const first = state.day <= state.officer.hiredDay + 1;
  // 감면이 이미 반영된 실효 세율이다(state.js: tariffRate). 큰 항구·중과세 항구에서만 걸린다
  const heavy = tariffRate(city.id) >= 0.038;
  /* ★ 순서가 중요하다. 처음에는 `leaky`를 먼저 봤는데, **시작 배가 물이 새는 배**라
     첫 화면이 늘 재촉으로 열렸고 자기소개(`start`)는 끝내 한 번도 안 떴다 —
     이 게임 문체의 기준으로 적어 둔 줄이 정작 화면에 없었다는 뜻이다.
     첫날은 소개가 먼저다. 그 줄이 이미 "배는 낡았고"라고 말하고 있다. */
  const pick = first ? L.start : leaky ? L.leaky : heavy ? L.tariff : null;
  if (!pick) return null;
  return el('div.ctr-sub', {
    html: `<span style="color:${!first && leaky ? '#d05a4a' : '#54a89b'}">${pick}</span>`,
    style: { lineHeight: '1.5' },
  });
}

/* ── 급여 ──────────────────────────────────────────────
   급여일이 언제 오고 얼마가 쌓였는지를 **상시** 보여준다.
   정산 모달만 있으면 그날이 닥쳐서야 알게 되고, 그때는 이미 늦다 —
   "얼마를 벌어서 들어갈 것인가"가 항해 전에 판단되어야 압박이 성립한다. */
function payrollCard() {
  const left = daysToPayday();
  const owed = payrollOwed();
  const short = owed > state.gold;
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '급여' }),
      el('span', {
        text: left > 0 ? `${left}일 뒤 지급` : '오늘이 급여일',
        style: { fontSize: '11px', letterSpacing: 0, color: left <= 5 ? '#d0a04a' : '#8f8878' },
      }),
    ]),
    el('div.svc', {}, [
      el('div.ctr-sub', {
        html: `쌓인 삯 <b>${owed.toLocaleString('ko-KR')}닢</b>`
            + ` · 선원 ${state.crew}명 · 금고 ${state.gold.toLocaleString('ko-KR')}닢`,
      }),
      state.payroll.arrears
        ? el('div.ctr-sub', {
            html: `<span style="color:#d05a4a">밀린 삯 ${state.payroll.arrears.toLocaleString('ko-KR')}닢 — `
                + `참다 못한 무리는 짐을 들고 떠난다.</span>`,
          })
        : short
          ? el('div.ctr-sub', {
              html: `<span style="color:#d0a04a">지금 금고로는 못 치른다. 팔아서 채워야 한다.</span>`,
            })
          : null,
    ].filter(Boolean)),
  ]);
}

/* 이 항구에 지금 들어와 있는 배들 — 세계가 혼자 돌아간다는 것이 보이는 창 */
function harborCard() {
  const ships = npcsAtPort(city.id);
  if (!ships.length) return null;
  return el('div.panel', {}, [
    el('h3', {}, el('span', { text: '정박 중인 배' })),
    /* ★ 이름 뒤에 '호'를 무조건 붙이던 자리다 — 명부에서 온 배는 이름이 사람·상단의 것이라
       '개성 송상호'·'왕직호'가 부두에 떴다. 부르는 법은 `npcTitle`이 안다. */
    el('div.svc', {}, ships.slice(0, 5).map((n) => el('div.ctr-sub', {
      text: `${npcTitle(n)} (${SHIPS[n.shipKey].name})`
          + (n.kind === 'pirate' ? ' — 수상한 무리다' : ''),
      style: n.kind === 'pirate' ? { color: '#d05a4a' } : null,
    }))),
  ]);
}

/* 이 항구에 앉아 있는 사람들 — 술집이 "누구를 태울 것인가"를 물었다면
   이쪽은 "이 항구에 누가 있나"를 보여 준다. 항구에 들어갈 이유를 늘리는 자리다.

   ★ 이들이 파는 것(`service`)은 **아직 규칙에 물려 있지 않다.** 지금은 누가 있고
     무엇을 해 준다고 말하는지까지다 — 그것만으로도 그 바다의 제도가 드러난다.
     명의 감합을 파는 관리, 카르타스를 쓰는 서기, 왜관의 통사가 그 예다.
     값(`fee`)을 실제로 받게 하려면 하루에 몇 번 살 수 있나부터 정해야 한다
     (`state.hired`가 같은 무리를 두 번 못 태우게 하는 것과 같은 꼴). */
const SERVICE_LABEL = {
  'price-tip': '먼 항구 시세', 'route-tip': '항로의 위험', contract: '큰 일감',
  smuggle: '세관을 피하는 길', loan: '돈을 빌려준다', repair: '수리를 깎아준다',
  recruit: '사람을 소개한다', permit: '이 바다를 다닐 문서',
};

/** 직업 — 그 사람이 무엇을 하는 사람인지. 명부의 `job` 키를 말로 옮긴다. */
const JOB_LABEL = {
  broker: '중개인', informant: '정보상', smuggler: '밀수업자', moneylender: '전주',
  shipwright: '선장인', harbormaster: '항무관', interpreter: '통역', cartographer: '지도장이',
  physician: '선의', gunsmith: '총포장이', priest: '사제', scholar: '학자',
  guildmaster: '길드장', official: '관리', '官': '관리',
};

/* ★ 인물 명부에는 `blurb`와 `lines{greet,offer,done}`이 사람마다 적혀 있는데,
   화면에서는 그것이 **마우스를 올려야 나오는 title 툴팁** 한 덩어리였다.
   툴팁은 읽히지 않는다 — 그 자리에 사람이 있다는 것조차 모르고 지나간다.
   그래서 줄을 눌러 **말을 걸 수 있게** 한다. 거래는 아직 없다(값이 규칙에 안 물렸다).
   지금 여기서 일어나는 일은 하나뿐이고 그것으로 충분하다 — 그 사람이 말을 한다. */
function talkTo(f) {
  const job = JOB_LABEL[f.job] ?? f.job ?? '';
  modal({
    title: f.name,
    body: `<span style="color:#8f8878">${[job, city.name].filter(Boolean).join(' · ')}</span><br><br>`
        + (f.blurb ? `${f.blurb}<br>` : '')
        + (f.lines?.greet ? `<br><span style="color:#c9b98a">${f.lines.greet}</span>` : '')
        + (f.lines?.offer ? `<br><span style="color:#c9b98a">${f.lines.offer}</span>` : '')
        + (SERVICE_LABEL[f.service]
            ? `<br><br><span style="opacity:.75">파는 것 — ${SERVICE_LABEL[f.service]}`
              + (f.fee ? ` · 값 ${f.fee[0]}~${f.fee[1]}닢` : ' · 값은 받지 않는다')
              + `</span>`
            : ''),
    actions: [{ label: '자리를 뜬다' }],
  });
}

function figureCard() {
  const people = figuresAt(city.id);
  if (!people.length) return null;
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '항구의 사람들' }),
      el('span', {
        text: `${people.length}명 · 눌러서 말을 건다`,
        style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
      }),
    ]),
    el('div.svc', {}, [
      ...people.slice(0, 6).map((f) => el('div.ctr-sub', {
        title: f.blurb ?? '',
        style: { cursor: 'pointer' },
        onclick: () => talkTo(f),
        text: `${f.name}`
            + (JOB_LABEL[f.job] ? ` (${JOB_LABEL[f.job]})` : '')
            + (SERVICE_LABEL[f.service] ? ` — ${SERVICE_LABEL[f.service]}` : ''),
      })),
      // 잘린 줄이 있으면 잘렸다고 말한다 — 아무 말 없이 여섯에서 끊으면 그 항구가 작아 보인다
      people.length > 6
        ? el('div.ctr-sub', {
            text: `…그 밖에 ${people.length - 6}명이 더 있다.`,
            style: { color: '#6f6858' },
          })
        : null,
    ].filter(Boolean)),
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
          el('span.creg', { text: city.area }),
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
        /* 선원은 부두에서 버튼으로 사지 않고 술집에서 모은다.
           "5명 고용" 버튼이던 자리다 — 값만 있고 선택이 없어서 뺐다. */
        svcRow('선원', `${state.crew}/${state.crewMax}`
              + (shorthanded() ? ` · 최소 ${ship().crewMin}명 미달` : ''),
          '술집', false, () => go('tavern')),
        svcRow('무장', `${state.guns}/${gunCap()}문`,
          '무장 탭', false, () => go('shipyard', { tab: 'arms' })),
        svcRow('갑판 배치', `${playerTroops().length}칸`,
          '선원 탭', false, () => go('shipyard', { tab: 'crew' })),
        el('button.btn.dark', {
          text: '⚒  조선소로 간다',
          onclick: () => go('shipyard'),
        }),
        el('button.btn.dark', {
          text: '🍺  술집으로 간다',
          onclick: () => go('tavern'),
        }),
      ]),
    ]),

    payrollCard(),
    officerCard(),
    contractCard(),
    harborCard(),

    figureCard(),
    /* 사람이 하나도 없으면 배는 부두에 묶여 있다.
       ★ crewMin **미달**은 막지 않는다 — 그건 속력이 떨어지는 벌칙이지 금지가 아니고,
         전투로 선원을 잃었을 때 항구에 갇히면 빠져나갈 길이 없어진다.
         0명만 막는 이유는 그 상태가 "출항"이라는 말 자체가 성립하지 않기 때문이다. */
    /* ★ 이 단추는 패널 아래에 **붙어 있어야 한다**(`.btn-sail`의 sticky).
       인물과 상관 게시판이 붙는 항구는 사이드패널이 길어져 단추가 화면 밖으로 밀린다 —
       시흐르에서 y가 941px(창 900px)이라 스크롤해야만 눌렸다. 출항은 이 화면에서
       나가는 유일한 길이라, 안 보이면 항구에 갇힌 것처럼 읽힌다. */
    el('button.btn.btn-sail', {
      text: state.crew > 0 ? '⚓  출항하기' : '⚓  선원이 없다 — 술집으로',
      onclick: () => go(state.crew > 0 ? 'map' : 'tavern'),
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
