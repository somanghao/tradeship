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
  /* 부관 급여 유예(다-2 · 회차 27) — **규칙은 전부 state.js에 서 있다.** 이 화면이 하는 일은
     ① 단추를 그릴지 묻고(`canDeferOfficer`) ② 액수를 읽고(`officerDeferAmount`·`officerDeferred`)
     ③ **무는 값을 그 자리에서 말한 뒤**(`officerCut` + `OFFICER.defer`) ④ 인자 하나를 넘기는 것뿐이다.
     ⚠️ 성과급은 반드시 `officerCut()`으로 읽는다 — `OFFICER.cut` 상수는 지분을 내준 뒤에도 11%다. */
  canDeferOfficer, officerDeferAmount, officerDeferred, officerCut,
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
  estate: '부동산 세',      // 가게·여관이 벌어 온 것 (공실이면 그 달은 0이다)
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

/* ── U1(회차 29) — 640×360 넘침 ────────────────────────────────
   ★ 회차 27 E2-1 → 28 E-3으로 두 번 이월된 자리다. 실측(`.playtest/round-29/u1-*.mjs`):
     장부+선창(`.pay-wrap`)이 **265px**로 이 화면에서 가장 큰 한 덩어리이고, 팔 것(`sellPane`)·
     부관 유예(`deferPane`)가 함께 뜨면 몸통이 636px까지 자라 640×360에서 **487px**를 넘친다.
     `.modal-box`가 `max-height:80vh; overflow:auto`라 단추 자체는 스크롤로 닿긴 하지만
     (`allActionsReachable: true`), 거의 두 화면을 훑어야 「급여를 치른다」에 닿는다.
   ⇒ **말을 줄이지 않고 자리를 접는다** — 장부·선창은 판단 재료이지 **막힌 순간의 선택**은
     아니다(그건 `pay-lead`가 이미 요약해 준다). 이 회차의 UI-BACKLOG가 짚은 방향 그대로
     ("작은 창에서는 장부를 접고 「청구·금고·모자란 액수 + 단추」만 먼저 보이게").
   ⚠️ **세션 동안 기억한다**(`port.js`·`shipyard.js`의 `foldOpen`과 같은 규약) — 한 번 펴 보면
     다음 급여일에도 펴져 있다. 매달 다시 접히면 그것도 성가심이다. */
let ledgerOpen = false;

/** 급여일 화면을 띄운다. `onDone`은 정산이 끝난 뒤(모달이 닫힌 뒤) 불린다. */
export function openPayday(onDone) {
  openModal?.remove();
  const owed = payrollOwed();
  const short = Math.max(0, owed - state.gold);

  /* ★ 접힌 채로는 **한 줄 요약**만 보인다 — 몇 종을 들고 있는지는 이미 있는 값을 세기만 한다
     (새 계산이 아니다. `Object.keys(state.cargo||{}).length`은 이 파일 다른 곳에서도 쓴다). */
  const heldN = Object.values(state.cargo || {}).filter((n) => n > 0).length;
  const box = el('div.pay-foldwrap', {}, [
    el('div.pay-fold-head', {
      text: `${ledgerOpen ? '▾' : '▸'} 장부 · 선창 자세히 보기`
          + (heldN ? ` (선창 ${heldN}종)` : ''),
      onclick: () => { ledgerOpen = !ledgerOpen; openPayday(onDone); },
    }),
    ledgerOpen ? el('div.pay-wrap', {}, [
      ledgerPane(),
      holdPane(),
    ]) : null,
  ].filter(Boolean));

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
  /* ★ **유예 단추는 모자랄 때만 그린다.** 다 낼 수 있는데 미루는 것은 판단이 아니라
     이자와 지분을 그냥 버리는 것이다(「안 주는 단추」와 같은 기준). */
  const deferPane = short && canDeferOfficer() ? officerDeferPane(owed, onDone) : null;

  const m = modal({
    title: `급여일 — ${state.day}일차 · ${CITY_BY_ID[state.at].name}`,
    body: el('div', {}, [
      el('div.pay-lead', {
        html: `한 달치 삯을 치를 때다. 청구 <b>${won(owed)}닢</b>`
            + (state.payroll.arrears ? ` <span class="pay-warn">(밀린 삯 ${won(state.payroll.arrears)} 포함)</span>` : '')
            + ` · 금고 <b>${won(state.gold)}닢</b>`
            + (short ? ` · <span class="pay-warn">${won(short)}닢 모자란다</span>` : ''),
      }),
      /* ★ **미뤄 둔 삯은 청구에 이미 섞여 있다** — 그 사실을 안 적으면 「청구」가 갑자기
         불어난 것으로만 보인다(유예는 면제가 아니라 다음 달로 미는 것이다 · `payrollOwed`). */
      officerDeferred() ? el('div.pay-lead.pay-defer-note', {
        html: `그 가운데 <b>${won(officerDeferred())}닢</b>은 지난 달 미뤄 둔 ${OFFICER.name}의 삯이다`
            + `(${state.payroll.deferMonths || 1}달째 · 달마다 ×${OFFICER.defer?.rate ?? 1}로 분다).`,
      }) : null,
      short ? el('div.pay-danger', {
        html: '모자란 만큼은 <b>밀린 삯</b>으로 남는다. 불만이 오르고, 참다 못한 무리는 '
            + '<b>돈 되는 짐을 들고</b> 배를 떠난다.',
      }) : null,
      box,
      sellPane,
      deferPane,
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

/* ── 부관 급여 유예 (다-2 · 2026-08-30 · 회차 27) ───────────────
   ★ **이것은 「공짜로 넘기는 단추」가 아니다.** 규칙 쪽이 값을 네 번 다시 잡은 이유가 그것이고
     (`data.js: OFFICER.defer`의 실측표 — 1차는 *안 미룰 이유가 없는 단추*, 2차는 *미룰 이유가
     없는 단추*, 3차는 *횟수 제한이 제한이 아니었다*), 화면이 대가를 안 적으면 그 네 번이
     통째로 무의미해진다. 그래서 단추만 두지 않고 **얻는 것과 무는 것을 한 상자에** 적는다.
   ★ **얻는 것은 돈이 아니라 「갑판이 흩어지지 않는 것」**이다 — 급여일의 벌은 *못 준 비율*로
     매겨지는데(`settlePayroll: ratio`), 떠날 수 없는 사람(에이미)의 몫이 그 분모에 섞여 있었다.
     유예는 그 몫을 분모에서 뺀다. 그래서 화면도 **비율의 전→후**를 적는다.
   ⚠️ 여기서 규칙을 다시 구현하지 않는다 — 액수는 `officerDeferAmount()`, 성과급은
     `officerCut()`, 이자·지분은 `OFFICER.defer`가 정본이고 이 함수는 그것을 **뺄셈 한 번**으로
     보여 줄 뿐이다(`settlePayroll`이 쓰는 `min(payrollOwed, deferAmount)`과 같은 식). */
function officerDeferPane(owed, onDone) {
  const D = OFFICER.defer ?? {};
  const amount = Math.min(owed, officerDeferAmount());
  const after = Math.max(0, owed - amount);
  const missBefore = Math.max(0, owed - state.gold);
  const missAfter = Math.max(0, after - state.gold);
  const pct = (m, o) => (o > 0 ? Math.round((m / o) * 100) : 0);
  const cut = officerCut();
  const cutNext = Math.min(OFFICER.cut + (D.shareMax ?? 0), cut + (D.share ?? 0));
  // 「평생 두 번」이 실제로 몇 번 남았나 — 문지기는 횟수가 아니라 **지분 상한**이다
  const left = (D.share ?? 0) > 0
    ? Math.max(0, Math.round((((D.shareMax ?? 0) - (state.officer?.share || 0)) / D.share) * 10) / 10)
    : 0;

  /* ⚠️ **상자 하나가 세로 100px을 먹으면 급여일의 단추 줄이 화면 밖으로 밀린다**
     (`.modal-box`는 `max-height:80vh; overflow:auto` — 실측에서 「급여를 치른다」가 접혔다).
     그래서 두 문단을 **두 줄 + 오른쪽 단추 한 칸**으로 눕힌다. 말은 안 줄이고 자리만 줄인다. */
  return el('div.pay-sellpane.pay-deferpane', {}, [
    /* ★ 「얻는 것은 돈이 아니라 사람이다」는 **머리줄**이 진다 — 아래 두 줄은 숫자만 진다.
       한 상자에 문장과 숫자를 다 넣으면 네 줄이 되고, 네 줄이면 급여일의 단추가 밀린다. */
    el('div.pay-sub', {
      text: `${OFFICER.name}에게 빌린다 — 그의 삯만 미룬다. 얻는 것은 돈이 아니라 사람이다`,
    }),
    el('div.pay-defer-body', {}, [
      el('div', {}, [
        el('div.pay-defer-gain', {
          html: `청구 <b>${won(owed)} → ${won(after)}닢</b> · 못 주는 몫`
              + ` <b>${won(missBefore)} → ${won(missAfter)}닢</b>`
              + ` (<b>${pct(missBefore, owed)}% → ${pct(missAfter, after)}%</b>) —`
              + ' 이 비율이 불만과 이탈을 정한다',
        }),
        /* ⚠️ **무는 값이 단추 옆에 없으면 이 규칙은 「공짜 단추」로 읽힌다**(규칙 PM의 인계 문구). */
        el('div.pay-defer-cost', {
          html: `<b>무는 값</b> — ${won(amount)}닢이 다음 달`
              + ` <b>${won(Math.round(amount * (D.rate ?? 1)))}닢</b>으로(×${D.rate ?? 1}) ·`
              + ` ${OFFICER.name} 몫 <b>${(cut * 100).toFixed(1)}% → ${(cutNext * 100).toFixed(1)}%</b>`
              + ' <b>영구</b>, 되돌릴 수 없다'
              + (left > 0 ? ` · 남은 유예 <b>${left}번</b>` : ''),
        }),
      ]),
      el('button.btn.sm.dark', {
        text: `삯 ${won(amount)}닢을 미룬다`,
      title: `미룬 삯은 다음 급여일에 ${won(Math.round(amount * (D.rate ?? 1)))}닢으로 걷힌다`
           + ` · 성과급 ${(cut * 100).toFixed(1)}% → ${(cutNext * 100).toFixed(1)}% (영구)`,
      /* ⚠️ **이 단추는 모달의 `actions`가 아니라 몸통 안에 있다** — 대가를 단추 옆에 두려면
         그래야 하는데, 그 대신 **스스로 닫지 않는다**(`ui.js: modal`은 `actions`의 단추만
         누르면 제 wrap을 지운다). 실측에서 정산이 끝난 뒤에도 급여일 판이 그대로 남아
         결과 모달과 겹쳤다 — 자동 조종도 사람도 앞의 것(옛 값)을 먼저 잡는다.
         파는 단추들은 `redraw()`가 `openPayday()`를 다시 불러 지워 주지만 이쪽은 흐름이
         여기서 끝나므로 **직접 지운다**(이 파일 머리의 `openModal` 주석이 적어 둔 그 함정). */
      onclick: () => {
        openModal?.remove();
        openModal = null;
        report(settlePayroll(Math.random, { deferOfficer: true }), onDone);
      },
      }),
    ]),
  ]);
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
  /* ★ **미룬 것은 결과 화면에도 남는다.** 항해일지에만 적으면 "왜 다음 달 청구가 늘었나"와
     "언제 몫이 올랐나"를 모달에서 못 읽는다 — 대가를 무는 순간이 여기이기 때문이다. */
  if (r.deferred > 0) {
    lines.push(el('p.pay-warn', {
      html: `${OFFICER.name}의 삯 <b>${won(r.deferred)}닢</b>을 미뤘다 —`
          + ` 다음 급여일에 <b>${won(r.officerDefer)}닢</b>으로 걷힌다.`
          + ` 대신 그의 몫이 <b>${(officerCut() * 100).toFixed(1)}%</b>가 됐다. 되돌리는 길은 없다.`
          + (r.deferMonths > 1 ? ` (${r.deferMonths}달째)` : ''),
    }));
  }
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
