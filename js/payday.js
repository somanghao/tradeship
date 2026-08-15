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

import { GOOD_BY_ID, CITY_BY_ID, OFFICER, CREW_TRAITS } from './data.js';
import {
  state, settlePayroll, payrollOwed, ledgerTotal, MONTH_DAYS,
  pushLog, cargoUsed, priceOf, DESERT_AT,
} from './state.js';
import { el, modal, refreshHUD, refreshLog, iconEl, josa } from './ui.js';

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

/** 급여일 화면을 띄운다. `onDone`은 정산이 끝난 뒤(모달이 닫힌 뒤) 불린다. */
export function openPayday(onDone) {
  const owed = payrollOwed();
  const short = Math.max(0, owed - state.gold);

  const box = el('div.pay-wrap', {}, [
    ledgerPane(),
    holdPane(),
  ]);

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
      unrestPane(),
    ].filter(Boolean)),
    closable: false,      // 급여일은 넘길 수 없다 — 안 주는 것도 선택이지 회피가 아니다
    actions: [{
      label: short ? `낼 수 있는 만큼 치른다 (−${won(state.gold)}닢)` : `급여를 치른다 (−${won(owed)}닢)`,
      kind: short ? 'dark' : '',
      onClick: () => {
        const r = settlePayroll();
        report(r, onDone);
      },
    }],
  });
  return m;
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
    el('h4', { text: `선창 — ${cargoUsed()}/${state.cargoCap}칸` }),
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
  const room = state.cargoCap - cargoUsed();
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
function report(r, onDone) {
  /* ★ 결과 모달을 띄우기 **전에** 뒤 화면을 새로 그린다.
     닫을 때 갱신하면 결과를 읽는 동안 사이드패널이 정산 전 값(쌓인 삯·금고)을
     그대로 보여줘, 방금 치른 돈이 안 나간 것처럼 보인다. */
  refreshHUD();
  onDone?.();

  const lines = [];
  if (r.missed > 0) {
    /* ★ "0닢을 치렀다"는 문장이 실제로 떴다. 금고가 비어 **한 푼도 못 준** 달이
       "얼마를 냈다"는 말투로 보고되면, 이 게임에서 가장 나쁜 소식이 회계 항목이 된다. */
    lines.push(el('p', {
      html: r.paid > 0
        ? `<b>${won(r.paid)}닢</b>을 치렀다. <span class="pay-warn">${won(r.missed)}닢이 밀렸다.</span>`
        : `금고를 열어 보였다. 바닥이었다. `
          + `<span class="pay-warn">${won(r.missed)}닢이 그대로 밀린 삯으로 남는다.</span>`,
    }));
    pushLog(r.paid > 0
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

  refreshLog();
  modal({
    title: r.missed > 0 ? '급여를 다 치르지 못했다' : '급여 지급 완료',
    body: el('div', {}, lines),
    actions: [{ label: '알겠다' }],
  });
  return true;
}
