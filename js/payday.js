// payday.js — 급여 정산 화면 (월말 결산서)
//
// 항구에 들어왔을 때 급여일이 지났으면 뜬다(`state.js: paydayDue`).
// 바다에서는 뜨지 않는다 — 돈을 줄 데가 없고, 못 주는 상황을 항해 중에 터뜨리면
// 플레이어가 손쓸 방법이 없기 때문이다.
//
// 이 화면이 답해야 하는 것 넷:
//   ① 이 달에 얼마를 벌고 얼마를 썼나 (장부)
//   ② 유지비가 어디로 나갔나 (지출 갈래)
//   ③ 지금 선창에 무엇이 실려 있고 그게 얼마짜리인가 (평가손익)
//   ④ 급여를 치를 수 있나 — 못 치르면 무슨 일이 나나
//
// ★ 화면은 규칙을 다시 구현하지 않는다. 금액 판정은 전부 `state.js`가 하고
//   여기서는 그 값을 읽어 배치할 뿐이다(대시보드와 같은 원칙).

import { GOOD_BY_ID, CITY_BY_ID, OFFICER, CREW_TRAITS, SHIPS, BOON } from './data.js';
import {
  state, settlePayroll, payrollOwed, ledgerTotal, MONTH_DAYS,
  pushLog, cargoUsed, priceOf, DESERT_AT, cargoCapTotal,
  /* C-8 — 급여일에 선택이 있으려면 **팔 것이 이 화면에 닿아야** 한다.
     값 계산은 전부 `state.js: salvage`(C-17과 같은 표)이고 여기서는 줄로 옮기고 단추만 건다. */
  salvage, sell, sellShip, sellHolding, sellMill, takeGoods, storedUsed, buyService,
} from './state.js';
import { figuresAt } from './world.js';
import { el, modal, refreshHUD, refreshLog, iconEl, josa, toast } from './ui.js';

/* 장부 항목의 표시 이름. `LEDGER_*` 키와 1:1이라 여기 빠진 항목은 화면에서 사라진다 —
   state.js에 항목을 더하면 여기도 더한다(그러라고 §장부 주석에 적어 두었다). */
const INCOME_LABEL = {
  sales: '교역품 매각',
  contracts: '대형 주문',
  loot: '전리품·매각',
  salvage: '표류물',
  insurance: '보험금',
};
const OUTGO_LABEL = {
  goods: '교역품 매입',
  wages: '선원 급여',
  officer: `${OFFICER.name} 몫`,
  supplies: '식량·물',
  upkeep: '선체·무장·선단',
  insurance: '적하보험',
  tariff: '입항세',
  port: '항구 잡비',
  ships: '배·무장·개장',
};

const won = (n) => n.toLocaleString('ko-KR');

/* 지금 떠 있는 급여일 모달. **다시 열 때는 먼저 지운다.**
   ★ 안 지웠더니 실측에서 낡은 판이 **뒤에 그대로 남았다** — 화면에는 금고 300닢짜리 옛 모달과
     1,015닢짜리 새 모달이 겹쳐 있었고, 자동 조종도 사람도 앞의 것(옛 값)을 먼저 잡는다.
     여기서 파는 단추가 생긴 이상 이 화면은 **여러 번 다시 그려진다** — 그 전제가 새로 생긴 것이다. */
let openModal = null;

/** 급여일 화면을 띄운다. `onDone`은 정산이 끝난 뒤(모달이 닫힌 뒤) 불린다. */
export function openPayday(onDone) {
  openModal?.remove();
  const owed = payrollOwed();
  const short = Math.max(0, owed - state.gold);

  const box = el('div.pay-wrap', {}, [
    ledgerPane(),
    holdPane(),
  ]);

  /* ★ **C-8 — 급여일에 선택이 없다.** 단추가 하나뿐이라 늘 "낼 수 있는 만큼"이었다.
     새 규칙(유예 제도)을 만들지 않는다 — **이미 있는 선택지들을 이 화면에 끌어온다.**
       ① 팔 것 목록(`salvage`) — 짐·창고·정박선·거점·가공장을 **여기서 바로 판다**.
          전에는 짐만, 그것도 "팔고 오겠다"로 화면을 나가야 닿았다.
       ② 이 항구에 대금업자가 있으면 **빌린다**.
       ③ 「이번 달은 미룬다 — 한 푼도 안 준다」. 규칙은 `settlePayroll(rand, {pay:0})` 한 인자이고
          벌칙은 그대로다(못 준 비율이 그대로 불만·이탈로 간다). 화면 주석이
          *"안 주는 것도 선택이지 회피가 아니다"*라고 적어 두고 **안 주는 단추가 없던** 자리를 채운다.
     ★ 다시 그릴 때는 이 모달을 지우고 새로 연다 — 팔면 청구·금고·목록이 한꺼번에 바뀐다. */
  const rows = short ? salvage(state.at) : [];
  const redraw = () => { refreshHUD(); refreshLog(); openPayday(onDone); };
  const sellPane = short && (rows.length || lenderHere()) ? salvagePane(rows, redraw) : null;

  const m = modal({
    title: `급여일 — ${state.day}일차 · ${CITY_BY_ID[state.at].name}`,
    body: el('div', {}, [
      el('div.pay-lead', {
        html: `한 달치 삯을 치를 때다. 청구 <b>${won(owed)}닢</b>`
            + (state.payroll.arrears ? ` <span class="pay-warn">(밀린 삯 ${won(state.payroll.arrears)} 포함)</span>` : '')
            + ` · 금고 <b>${won(state.gold)}닢</b>`
            + (short ? ` · <span class="pay-warn">${won(short)}닢 모자란다</span>` : ''),
      }),
      short ? el('div.pay-danger', {
        html: '모자란 만큼은 <b>밀린 삯</b>으로 남는다. 불만이 오르고, 참다 못한 무리는 '
            + '<b>돈 되는 짐을 들고</b> 배를 떠난다.',
      }) : null,
      box,
      sellPane,
      unrestPane(),
    ].filter(Boolean)),
    closable: false,      // 급여일은 넘길 수 없다 — 안 주는 것도 선택이지 회피가 아니다
    actions: [
      {
        label: short ? `낼 수 있는 만큼 치른다 (−${won(state.gold)}닢)` : `급여를 치른다 (−${won(owed)}닢)`,
        kind: short ? 'dark' : '',
        onClick: () => {
          const r = settlePayroll();
          report(r, onDone);
        },
      },
      /* ★ **짐을 팔 기회를 준다.** 무역선은 **입항하는 순간이 언제나 가장 가난한 순간**이다 —
         금고를 다 털어 물건을 싣고 왔으니까. 그런데 급여일이 입항 즉시라, 잘 굴러가는 상단도
         서른 날마다 체불로 몰렸다(완주 플레이 ISSUES #12: 청구 427닢·금고 0 → 전액 체불인데
         그 자리에서 짐을 팔자 3,713닢이었다).
         회피는 아니다 — **떠나려 하면 다시 뜬다**(`port.js`의 출항 단추가 막는다).
         이것이 `UNIMPLEMENTED.md` C-8("급여일에 선택이 없다")의 답이기도 하다. */
      short && Object.keys(state.cargo || {}).length ? {
        label: '나가서 팔고 오겠다',
        kind: 'dark',
        onClick: () => {
          state.payroll.deferredDay = state.day;
          pushLog('선원들에게 잠시만 기다리라 했다. 짐을 풀어야 삯이 나온다.', 'warn');
          onDone?.();
        },
      } : null,
      /* ★ **안 주는 것도 선택이다** — 그러나 회피는 아니다(`closable:false`가 그것을 지킨다).
         모자랄 때만 낸다: 다 낼 수 있는데 안 내는 것은 판단이 아니라 그냥 벌점 줍기다. */
      short ? {
        label: `이번 달은 미룬다 — 한 푼도 안 준다 (체불 ${won(owed)}닢)`,
        kind: 'danger',
        onClick: () => report(settlePayroll(Math.random, { pay: 0 }), onDone, true),
      } : null,
    ].filter(Boolean),
  });
  openModal = m;
  return m;
}

/** 이 항구의 대금업자 — 있으면 급여일에 빌리는 것도 선택이 된다 */
function lenderHere() {
  if (state.boons?.loan) return null;      // 갚을 것이 있으면 더 못 빌린다
  return figuresAt(state.at).find((f) => f.service === 'loan') ?? null;
}

/* ── 급여일에 팔 수 있는 것 (C-8) ────────────────────────────
   ★ 값은 `state.js: salvage()`가 센다 — 바닥 안내(C-17)와 **같은 표**다.
     두 화면이 다른 값을 말하면 어느 쪽도 못 믿는다. */
function salvagePane(rows, redraw) {
  const total = rows.reduce((a, r) => a + r.gold, 0);
  const lender = lenderHere();
  const line = (label, note, btn, disabled, onClick) => el('div.pay-sell', {}, [
    el('span.k', { text: label }),
    el('span.n', { text: note }),
    el('button.btn.sm.dark', { text: btn, disabled, onclick: onClick }),
  ]);

  const kids = [
    el('div.pay-sub', {
      text: rows.length ? `지금 여기서 팔 수 있는 것 — 다 팔면 ${won(total)}닢` : '지금 여기서 팔 것은 없다',
    }),
  ];
  for (const r of rows) {
    kids.push(line(`${r.label} — ${won(r.gold)}닢`, r.note,
      r.kind === 'stored' ? '싣는다' : '판다',
      r.kind === 'mill' && r.gold <= 0,
      () => { doSell(r); redraw(); }));
  }
  if (lender) {
    kids.push(line(`${lender.name}에게 빌린다`,
      `${Math.round((BOON.loanRate - 1) * 100)}% 얹어 ${BOON.loanDays}일 뒤에 갚는다 — 급여일에 선원보다 먼저 걷힌다`,
      '빌린다', false, () => {
        const b = buyService(lender);
        if (!b.ok) return toast(b.reason, 'bad');
        pushLog(b.line, 'warn');
        redraw();
      }));
  }
  kids.push(el('div.pay-note', {
    text: '판 돈은 그 자리에서 금고에 들어간다 — 팔고 나서 다시 「급여를 치른다」를 누르면 된다.',
  }));
  return el('div.pay-sellpane', {}, kids);
}

/** 줄 하나를 실제로 판다 — 규칙은 전부 `state.js`, 여기서는 부르고 알릴 뿐이다 */
function doSell(r) {
  if (r.kind === 'cargo') {
    const s = sell(r.key, state.cargo[r.key] || 0);
    if (!s.ok) return toast(s.reason, 'bad');
    pushLog(`${GOOD_BY_ID[r.key].name} ${s.qty}칸을 급여일에 풀었다 (+${won(s.gain)}닢).`, 'warn');
    return;
  }
  if (r.kind === 'stored') {
    const store = { ...(state.stored?.[state.at] ?? {}) };
    let moved = 0;
    for (const [gid, n] of Object.entries(store)) {
      const t = takeGoods(gid, n, state.at);
      if (t.ok) moved += t.n;
    }
    if (!moved) return toast('화물칸이 가득 차 창고 짐을 실을 수 없다', 'bad');
    const left = storedUsed(state.at);
    pushLog(`창고에서 ${moved}칸을 실었다.` + (left ? ` ${left}칸은 자리가 없어 남았다.` : ''), 'warn');
    return;
  }
  if (r.kind === 'ship') {
    const s = sellShip(r.key);
    if (!s.ok) return toast(s.reason, 'bad');
    pushLog(`삯을 채우려고 ${SHIPS[r.key].name}${josa(SHIPS[r.key].name, '을/를')} 넘겼다`
          + ` (+${won(s.gain)}닢).`, 'warn');
    return;
  }
  if (r.kind === 'holding') {
    const s = sellHolding(state.at);
    if (!s.ok) return toast(s.reason, 'bad');
    return;
  }
  if (r.kind === 'mill') {
    const s = sellMill(r.key, state.at);
    if (!s.ok) return toast(s.reason, 'bad');
  }
}

/* ── 왼쪽: 이 달 장부 ─────────────────────────────────── */
function ledgerPane() {
  const L = state.ledger;
  const inc = ledgerTotal('income');
  const out = ledgerTotal('outgo');
  const net = inc - out;

  const rows = (label, obj, labels) => {
    const items = Object.entries(obj).filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    if (!items.length) return [el('div.pay-empty', { text: '없다' })];
    return items.map(([k, v]) => el('div.pay-row', {}, [
      el('span.k', { text: labels[k] ?? k }),
      el('span.v', { text: won(v) }),
    ]));
  };

  return el('div.pay-pane', {}, [
    el('h4', { text: `장부 — ${L.since}일차부터 ${state.day - L.since}일간` }),
    el('div.pay-sub', { text: '들어온 돈' }),
    ...rows('income', L.income, INCOME_LABEL),
    el('div.pay-row.pay-sum', {}, [
      el('span.k', { text: '수입 합계' }), el('span.v', { text: won(inc) }),
    ]),
    el('div.pay-sub', { text: '나간 돈' }),
    ...rows('outgo', L.outgo, OUTGO_LABEL),
    el('div.pay-row.pay-sum', {}, [
      el('span.k', { text: '지출 합계' }), el('span.v', { text: won(out) }),
    ]),
    el(`div.pay-row.pay-net${net >= 0 ? '.up' : '.dn'}`, {}, [
      el('span.k', { text: '이 달 손익' }),
      el('span.v', { text: `${net >= 0 ? '+' : ''}${won(net)}닢` }),
    ]),
    /* ★ 급여는 위 '나간 돈'에 이미 발생액으로 잡혀 있다. 실제로는 아직 안 나갔으므로
       "장부상 손익"과 "금고"는 다르다 — 그 차이가 곧 이번에 치를 돈이다. */
    el('div.pay-note', {
      text: '급여는 날마다 쌓아 두었다가 여기서 한 번에 치른다. 위 지출에는 아직 안 나간 급여도 들어 있다.',
    }),
  ]);
}

/* ── 오른쪽: 선창 ─────────────────────────────────────── */
function holdPane() {
  const held = Object.entries(state.cargo).filter(([, n]) => n > 0);
  const rows = held.map(([gid, n]) => {
    const now = priceOf(state.at, gid);
    const avg = state.buyPrice[gid] || 0;
    const diff = (now - avg) * n;
    return { gid, n, now, avg, diff, value: now * n };
  }).sort((a, b) => b.value - a.value);

  const total = rows.reduce((a, r) => a + r.value, 0);
  const cost = rows.reduce((a, r) => a + r.avg * r.n, 0);

  return el('div.pay-pane', {}, [
    el('h4', { text: `선창 — ${cargoUsed()}/${cargoCapTotal()}칸` }),
    rows.length
      ? el('div', {}, rows.map((r) => el('div.pay-hold', {}, [
          el('span.i', {}, iconEl(GOOD_BY_ID[r.gid].icon, 1)),
          el('span.k', { text: GOOD_BY_ID[r.gid].name }),
          el('span.q', { text: `${r.n}칸` }),
          el('span.v', { text: won(r.value) }),
          el(`span.d.${r.diff >= 0 ? 'up' : 'dn'}`, {
            text: `${r.diff >= 0 ? '+' : ''}${won(r.diff)}`,
          }),
        ])))
      : el('div.pay-empty', { text: '비어 있다 — 팔 것이 없으면 삯도 못 낸다' }),
    rows.length ? el('div.pay-row.pay-sum', {}, [
      el('span.k', { text: `여기서 팔면 (매입 ${won(cost)})` }),
      el('span.v', { text: won(total) }),
    ]) : null,
    /* 사용자가 정산 화면에서 보고 싶어한 것 — "지금 무역품을 살 수 있는가".
       급여를 치르고 남는 돈이 다음 장사의 밑천이라, 그 숫자가 여기 있어야 판단이 된다. */
    el('div.pay-sub', { text: '다음 장사 밑천' }),
    el('div.pay-row', {}, [
      el('span.k', { text: '급여를 치르고 나면' }),
      el('span.v', { text: `${won(Math.max(0, state.gold - payrollOwed()))}닢` }),
    ]),
    el('div.pay-note', {
      html: buyingHint(),
    }),
  ].filter(Boolean));
}

/** 남는 돈으로 이 항구에서 무엇을 몇 칸 살 수 있나 — 가장 싼 산지 품목 기준 */
function buyingHint() {
  const left = Math.max(0, state.gold - payrollOwed());
  const city = CITY_BY_ID[state.at];
  const room = cargoCapTotal() - cargoUsed();
  if (room <= 0) return '선창이 가득 찼다. 팔지 않으면 실을 자리가 없다.';
  if (left <= 0) return '급여를 치르고 나면 <b>살 돈이 없다</b>. 실은 것을 팔아야 한다.';

  // 이 항구가 싸게 내놓는 것(산지) 중 가장 싼 것
  const cand = Object.keys(city.supply || {}).map((gid) => ({ gid, p: priceOf(state.at, gid) }))
    .sort((a, b) => a.p - b.p)[0];
  if (!cand) return `남는 ${won(left)}닢으로 살 것을 고른다. 여기는 특산이 없다.`;
  const n = Math.min(room, Math.floor(left / cand.p));
  const gname = GOOD_BY_ID[cand.gid].name;
  return n > 0
    ? `남는 ${won(left)}닢이면 <b>${gname}</b>${josa(gname, '을/를')} ${n}칸까지 실을 수 있다.`
    : `남는 ${won(left)}닢으로는 여기서 <b>한 칸도 못 산다</b>(${GOOD_BY_ID[cand.gid].name} ${won(cand.p)}닢).`;
}

/* ── 아래: 불만 ──────────────────────────────────────── */
function unrestPane() {
  const rows = state.bands.filter((b) => (b.unrest || 0) > 0.01);
  if (!rows.length) return null;
  return el('div.pay-unrest', {}, [
    el('div.pay-sub', { text: '갑판 분위기' }),
    ...rows.sort((a, b) => b.unrest - a.unrest).map((b) => {
      const risk = b.unrest >= DESERT_AT;
      return el('div.pay-row', {}, [
        el('span.k', {
          text: `${b.name} (${b.n}명 · ${CREW_TRAITS[b.trait]?.name ?? b.trait})`,
        }),
        el('span.v', {
          text: risk ? '떠날 낌새다' : '불만이 있다',
          style: { color: risk ? '#e0806e' : '#c8a86a' },
        }),
      ]);
    }),
  ]);
}

/* ── 정산 결과 ───────────────────────────────────────── */
function report(r, onDone, refused = false) {
  /* ★ 결과 모달을 띄우기 **전에** 뒤 화면을 새로 그린다.
     닫을 때 갱신하면 결과를 읽는 동안 사이드패널이 정산 전 값(쌓인 삯·금고)을
     그대로 보여줘, 방금 치른 돈이 안 나간 것처럼 보인다. */
  refreshHUD();
  onDone?.();

  const lines = [];
  if (r.missed > 0) {
    /* ★ "0닢을 치렀다"는 문장이 실제로 떴다. 금고가 비어 **한 푼도 못 준** 달이
       "얼마를 냈다"는 말투로 보고되면, 이 게임에서 가장 나쁜 소식이 회계 항목이 된다. */
    /* ★ **못 준 것과 안 준 것은 다른 문장이다**(C-8). 「이번 달은 미룬다」로 온 자리에서
       *"금고를 열어 보였다. 바닥이었다"*라고 적으면, 금고에 1,015닢이 있는데 화면이 거짓말을 한다.
       선택을 만들었으면 그 선택이 무엇이었는지도 화면이 말해야 한다. */
    lines.push(el('p', {
      html: refused
        ? `금고를 열지 않았다. <span class="pay-warn">${won(r.missed)}닢이 그대로 밀린 삯으로 남는다.</span>`
          + ` 이유는 말하지 않았고, 아무도 묻지 않았다.`
        : r.paid > 0
          ? `<b>${won(r.paid)}닢</b>을 치렀다. <span class="pay-warn">${won(r.missed)}닢이 밀렸다.</span>`
          : `금고를 열어 보였다. 바닥이었다. `
            + `<span class="pay-warn">${won(r.missed)}닢이 그대로 밀린 삯으로 남는다.</span>`,
    }));
    pushLog(refused
      ? `이번 달 삯 ${won(r.missed)}닢을 **주지 않기로** 했다.`
      : r.paid > 0
        ? `급여 ${won(r.paid)}닢 지급 · ${won(r.missed)}닢 체불.`
        : `급여를 한 푼도 못 치렀다 — ${won(r.missed)}닢 체불.`, 'bad');
  } else {
    lines.push(el('p', { html: `삯 <b>${won(r.paid)}닢</b>을 남김없이 치렀다. 갑판이 조용하다.` }));
    pushLog(`급여 ${won(r.paid)}닢을 모두 치렀다.`, 'good');
  }

  /* 밀렸는데 아직 아무도 안 내려갔을 때 — **다음이 있다는 것**을 말해 준다.
     이 경고가 없으면 두 달째에 갑자기 사람이 사라지고, 플레이어는 그것을 사고로 읽는다. */
  if (r.missed > 0 && !r.deserted.length) {
    const edgy = state.bands.filter((b) => (b.unrest || 0) >= DESERT_AT * 0.6).length;
    lines.push(el('p.pay-warn', {
      html: edgy
        ? '이번엔 아무도 내려가지 않았다. 대신 갑판에서 말이 줄었다 — 다음 달까지다.'
        : '이번엔 넘어갔다. 두 번은 안 넘어간다.',
    }));
  }

  /* ★ 이 대목은 이 게임에서 가장 무거운 장면이다 — 사람이 배를 버리고, 밀린 삯 대신
     **선창을 열어** 값나가는 것을 들고 내려간다. 그런데 문장은 정산표의 한 줄이었다.
     떠나는 쪽에도 할 말이 있어야 한다. 여기서는 설명하지 않고 **장면으로** 적는다. */
  if (r.deserted.length) {
    lines.push(el('p.pay-danger', {
      html: '삯을 못 받은 자들이 선창 문을 열었다. 말리는 사람은 없었다 — 그들이 옳기 때문이다.',
    }));
  }
  for (const d of r.deserted) {
    const took = Object.entries(d.lost).map(([gid, n]) => `${GOOD_BY_ID[gid].name} ${n}칸`).join(' · ');
    const tail = took ? String(Object.values(d.lost).at(-1)) + '칸' : '';
    lines.push(el('p.pay-danger', {
      html: `<b>${d.name}</b>(${d.n}명)${josa('명', '이/가')} 짐을 챙겨 부두로 내려갔다.`
          + (took
              ? ` 밀린 삯 대신 <b>${took}</b>${josa(tail, '을/를')} 들고 갔다(${won(d.value)}닢어치).`
              : ' 들고 갈 것조차 없어 빈손으로 갔다. 그쪽이 더 아프다.'),
    }));
    pushLog(`${d.name} ${d.n}명이 이탈했다.${took ? ` ${took}${josa(tail, '을/를')} 들고 갔다.` : ''}`, 'bad');
  }

  if (r.deserted.length && state.crew === 0) {
    lines.push(el('p.pay-danger', {
      html: '<b>갑판에 아무도 남지 않았다.</b> 배는 부두에 묶였다 — 술집에서 다시 사람을 모으는 수밖에 없다.',
    }));
  }

  /* ★ **채권자의 집행은 이 게임에서 가장 무거운 한 줄이다.** 항해일지에만 적으면
     "왜 배가 사라졌나"를 모달에서 못 읽는다 — 급여일 화면이 그 자리를 갖는 이유가 그것이다.
     규칙은 `state.js: enforceDebt·liquidate`, 근거는 `data.js: BANKRUPT`. */
  const e = r.enforced;
  if (e) {
    if (e.liquidated) {
      lines.push(el('p.pay-danger', {
        html: '<b>파산했다.</b> 채권자가 배와 짐을 가져가고 셈이 끝났다 — 빚은 없다. '
            + '남은 것은 낡은 바사 한 척과 밑천, 그리고 여태 열어 둔 항구들이다.',
      }));
      if (e.surplus) {
        lines.push(el('p.pay-warn', { html: `배를 넘기고 남은 <b>${won(e.surplus)}닢</b>이 돌아왔다.` }));
      }
    } else {
      const lost = e.ships.map((k) => SHIPS[k].name).join(' · ');
      lines.push(el('p.pay-danger', {
        html: `<b>채권자가 빚 ${won(e.need)}닢을 집행했다.</b>`
            + (lost ? ` <b>${lost}</b>${josa(lost, '을/를')} 넘겼다.` : '')
            + (e.stored ? ` 창고에 둔 짐 ${e.stored}개도 갔다.` : '')
            + (e.surplus ? ` 남은 ${won(e.surplus)}닢이 돌아왔다.` : ''),
      }));
    }
  }

  refreshLog();
  modal({
    title: e ? (e.liquidated ? '파산 — 셈이 끝났다' : '채권자가 집행했다')
             : r.missed > 0 ? '급여를 다 치르지 못했다' : '급여 지급 완료',
    body: el('div', {}, lines),
    actions: [{ label: '알겠다' }],
  });
  return true;
}
