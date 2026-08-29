// scenes/shipyard.js — 조선소: 선박 교체 · 갑판 배치 · 무장
//
// 항구 사이드패널의 모달로는 배가 작게밖에 안 보여서 전용 씬으로 뺐다.
// 화면 왼쪽 절반은 배(캔버스), 오른쪽 절반은 탭 패널(DOM). 패널을 논리좌표
// 기준으로 배치하므로 창 크기가 변해도 배를 가리지 않는다.

import { portSprite, cannonSprite, VH } from '../sprites/scene.js';
import { shipSprite, shipTopSprite, HULLS, WATERLINE, railAt } from '../sprites/ship.js';
import { unitSprite } from '../sprites/char.js';
/* 갑판에 서는 사람은 **작은 인물**(24×28 · 실질 키 21px)이다 — 큰 그림(48px)은 배에 비해 너무 컸다.
   패널 목록의 아이콘은 크기가 곧 정보라 여전히 `unitSprite`(48px)를 쓴다. → `sprites/char-mini.js` */
import { miniUnitSprite, MW as MINI_W, MINI_FOOT } from '../sprites/char-mini.js';
import { blit } from '../pixel.js';
import {
  SHIPS, CITY_BY_ID, GOOD_BY_ID, CANNONS, CANNON_KEYS, CANNON_REFUND,
  TROOPS, RECRUITS, TROOP_REFUND, MELEE_SLOTS,
  REFITS, REFIT_KEYS, SHOTS, SHOT_KEYS, REGION_OF_CITY,
} from '../data.js';
import {
  state, ship, cargoUsed, hire, repair, HIRE_UNIT, REPAIR_UNIT, repairUnit,
  yardNext, canUpgradeYard, upgradeYard, yardBusy, yardBuilding, industryPathHint, regionOf,
  /* 나라가 짓는 조선소(C-18) — 값은 `data.js: CIVIC`, 규칙은 `state.js` */
  civicBuilding, civicProgress,
  /* 원양 문턱 — 「왜 지금 고쳐야 하나」를 수리 줄이 말한다(2026-08-28) */
  OCEAN_HULL_MIN,
  storeCap, ownsHolding,
  gunCap, armsTotal, armsFactor, armsAimAt, zoneFactor, buyCannon, removeCannon,
  openSlots, setSlot, purchaseShip, boardShip, sellShip, resaleOf,
  pushLog, hasRefit, buyRefit, sellsShip, yardsOf, buyShot, shipSpeed, shorthanded,
  industryOf, tierNeeded, shipPriceAt, shipLockedBy, yardCapable, buildableAt,
  yardReach, yardReachWord, yardShortOf,
  usedListings, buyUsed,
  fleetUpkeep,
  /* 동행 선단 — 규칙은 `state.js`, 여기서는 줄에 토글 하나를 얹을 뿐이다 */
  isConsort, consortCount, fleetSize, fleetCrew, fleetDailyCost, cargoCapTotal,
  setConsort, stowConsort, canConsort, consortCrewNeed, consortHireCost, captainOf,
  fleetSpeedPenalty, fleetLaggard,
} from '../state.js';
import { el, overlay, toast, modal, refreshHUD, refreshLog, spriteEl, spriteElTrim, josa } from '../ui.js';
import { go, viewport } from '../main.js';

/* 배가 놓이는 자리 — 논리 좌표. 패널은 x=206부터라 겹치지 않는다. */
const SHIP_X = 12, SEA_Y = 170;
const DECK_SINK = 2;   // 뱃전 윗선보다 이만큼 아래에 발을 둔다 — 난간 뒤에 선 느낌
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
    const crewList = ['captain', ...state.loadout.slice(1, openSlots() + 1).filter(Boolean)];
    // 선종마다 선체가 놓이는 자리(x0)와 길이가 달라 갑판 위치를 선체에서 가져온다.
    // 상수로 두면 작은 배에서는 선원이 뱃전 밖 허공에 선다.
    const gap = Math.max(8, Math.min(15, Math.round(H.len * 0.10)));
    crewList.forEach((k, i) => {
      const x = SHIP_X + H.x0 + Math.round(H.len * 0.20) + i * gap;
      /* ★ 발 높이도 **그 지점의 뱃전**에서 뽑는다(`ship.js: railAt`). `HULLS[].deck`은 현호가 0인
         중앙에서만 뱃전과 같아서, 상수로 쓰면 고물 쪽 사람이 선체에 파묻힌다 — 사람이 21px로
         작아지면서 그 7px가 키의 3분의 1이 되어 눈에 띄게 됐다. */
      const t01 = (x + MINI_W / 2 - SHIP_X - H.x0) / H.len;
      const step = tab === 'crew' ? Math.round(Math.sin(t * 2 + i) * 1) : 0;
      /* ★ 갑판에 선 사람도 그 바다의 얼굴이다(C-14) — 항구·술집·전투와 같은 규약 */
      blit(ctx, miniUnitSprite(k, 'idle', null, regionOf(state.at)),
           x, shipY + railAt(s.hull, t01) + DECK_SINK - MINI_FOOT + step, 1, i % 2 === 1);
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
              + (fleetUpkeep() ? ` · 정박 유지비 ${fleetUpkeep()}닢/일` : ''),
          style: shorthanded() ? { color: '#e0806e' } : null,
        }),
        /* 선단 현황 — 동행이 붙어 있을 때만. 조선소는 "배를 고르는 화면"이라
           지금 몇 척을 데리고 다니는지가 여기서 가장 무거운 정보다. */
        consortCount() ? el('div.sub', {
          style: { color: '#54a89b' },
          text: `선단 ${fleetSize()}척 · 총적재 ${cargoUsed()}/${cargoCapTotal()}칸`
              + ` · 총선원 ${fleetCrew()}명 · 하루 ${fleetDailyCost().toLocaleString('ko-KR')}닢`
              + (fleetSpeedPenalty() < 1
                  ? ` · 속력 −${Math.round((1 - fleetSpeedPenalty()) * 100)}%(${fleetLaggard()?.name})`
                  : ''),
        }) : null,
      ]),
      el('button.btn.sm.dark', { text: '나가기', onclick: () => go('port') }),
    ]),
    /* ★ **수리가 탭 하나에 숨어 있었다**(2026-08-28 · 완주 러너 run 4).
       조선소는 「선박」 탭으로 열리는데 「전부 수리」는 **「선원」 탭에만** 있었다.
       그래서 하카타에서 **금고 10,046,290닢 · 선체 1/285**인 판이 **358일 동안 원양에 못 나갔다** —
       러너가 조선소에 들어가 수리를 찾았지만 화면에 0개였고, 만 닢이면 될 일이었다(실제로는 2,380닢).
       ★ **사람에게도 똑같이 일어난다.** 선체가 바닥인 플레이어가 「선박」 탭을 보고
         *수리할 데가 없다*고 읽는다. 이 저장소가 되풀이해 배우는 그 자리다 —
         *"규칙이 멀쩡한데 화면이 말하지 않아 수백 일을 잃는다."*
       ⇒ **수리는 탭의 소속이 아니다.** 배를 손보는 것이 조선소가 하는 일이므로
         탭 **밖**, 머리말 바로 아래에 세운다. 어느 탭으로 들어와도 보인다.
         (선원 탭에 있던 같은 줄은 지웠다 — 단추가 둘이면 어느 것이 참인지 묻게 된다.) */
    repairBar(),
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
/* ── 부두를 넓힌다 (A-2) ───────────────────────────────────────
   ★ 도시 `industry`가 고정값이라 **배 사다리의 꼭대기가 첫날부터 정해져** 있었다.
   자재를 실물로 실어 와야 오르므로, 이 카드는 "돈을 쓰는 자리"가 아니라 **항로를 짜는 자리**다. */
function yardUpgradeCard() {
  const city = CITY_BY_ID[state.at];
  const building = yardBuilding(state.at);
  const rows = [];

  /* ★ C-18 — 공사 주체가 **둘**이다. 내가 건 승급(`yardBuilding`)과 관아가 놓는
     조선소(`civicBuilding`). `yardBusy`는 둘을 합쳐 보므로, 어느 쪽인지 여기서 갈라 적는다 —
     안 그러면 걸지도 않은 공사 때문에 배가 안 나오는 이유를 알 길이 없다. */
  const civicB = civicBuilding(state.at);
  const mineB = building && state.day < building.until;
  if (mineB || (civicB && state.day < civicB.until)) {
    const b = mineB ? building : civicB;
    rows.push(el('div.ctr-line', {
      html: `<b>${mineB ? '공사 중' : '관아가 조선소를 놓고 있다'}</b> — `
          + `공업력 ${b.to}까지 <b>${b.until - state.day}일</b> 남았다`,
    }));
    rows.push(el('div.ctr-sub', { style: { color: '#c98a6a' },
      text: mineB
        ? '그동안 이 부두는 배를 짓지도 팔지도 않는다. 그것이 이 투자의 진짜 값이다.'
        : '그동안 이 부두는 배를 짓지도 팔지도 않는다 — 내가 낸 세로 짓는 것이라 걸지도 취소할 수도 없다.' }));
  } else {
    const can = canUpgradeYard(state.at);
    const n = can.need ?? yardNext(state.at);
    if (!n) {
      rows.push(el('div.ctr-sub', { text: `이 항구는 이미 꼭대기다 (공업력 ${industryOf(state.at)}).` }));
    } else {
      const mats = Object.entries(n.mats).map(([g, q]) => {
        const have = (state.cargo[g] || 0) + ((state.stored?.[state.at] ?? {})[g] || 0);
        return `${GOOD_BY_ID[g]?.name ?? g} ${have}/${q}`;
      }).join(' · ');
      rows.push(el('div.ctr-line', {
        html: `공업력 <b>${industryOf(state.at)} → ${n.to}</b> · ${n.gold.toLocaleString('ko-KR')}닢 · ${n.days}일`,
      }));
      rows.push(el('div.ctr-sub', {
        style: can.ok ? null : { color: '#c98a6a' },
        text: `자재 ${mats}` + (can.ok ? '' : ` — ${can.reason}`),
      }));
      /* ★ C-18 ⓒ — **배 한 척으로는 자재를 못 싣는다.** 예전에는 `목재가 N칸 모자란다`만
         되풀이해서, 화물칸이 380인 사람이 1,440칸을 어떻게 모으는지 알 길이 없었다.
         답은 **동행 선단**(`cargoCapTotal`)과 **이 항구의 창고**인데 화면이 그 말을 안 했다. */
      const needSum = Object.values(n.mats).reduce((a, b) => a + b, 0);
      const room = cargoCapTotal() + (ownsHolding('warehouse', state.at) ? storeCap(state.at) : 0);
      if (needSum > room) {
        rows.push(el('div.ctr-sub', { style: { color: '#c98a6a' },
          html: `⚠️ 자재가 모두 <b>${needSum}칸</b>인데 지금 실을 수 있는 것은 <b>${room}칸</b>이다`
              + ` — <b>한 척으로는 못 나른다.</b> 동행선을 붙이거나(선단 적재가 합쳐진다)`
              + ` 이 항구에 창고를 세워 여러 항차에 나눠 부린다.`,
        }));
      }
      /* ★ C-18 ⓑ — **공사 중에는 배를 못 짓는데 그 대가가 공사를 건 뒤에만 떴다.** */
      rows.push(el('div.ctr-sub', { style: { color: '#8f8878' },
        text: `공사 ${n.days}일 동안 이 부두는 배를 짓지도 팔지도 않는다 — 돈보다 그것이 크다.`,
      }));
      /* ★ C-18(2026-08-28) — 길이 **둘**이다: **내 돈으로 승급** ↔ **내 교역으로 나라 조선소**.
         값은 `state.js: industryPathHint` 한 곳에서 온다(항구 화면 `civicCard`와 같은 수다). */
      const hint = industryPathHint(state.at);
      if (hint?.trade) {
        const t = hint.trade;
        rows.push(el('div.ctr-sub', { style: { color: '#c9b98a' },
          html: t.building
            ? `ⓘ <b>다른 길도 이미 돌고 있다</b> — 관아가 놓는 조선소가 ${t.building.left}일 남았다.`
            : `ⓘ <b>돈을 안 쓰는 길도 있다</b> — 이 항구에 낸 세가`
              + ` <b>${Math.round(t.paid).toLocaleString('ko-KR')}/${t.need.toLocaleString('ko-KR')}닢</b>이 되면`
              + ` 관아가 스스로 조선소를 놓는다(공사 ${t.days}일 · 공업력 ${t.to}).`
              + ` 남은 <b>${Math.round(t.left).toLocaleString('ko-KR')}닢</b>은 여기서 사고팔면 저절로 쌓인다 —`
              + ` <b>승급은 그보다 빠른 대신 금화와 자재를 문다.</b>`,
        }));
      } else if (hint?.capped) {
        rows.push(el('div.ctr-sub', { style: { opacity: 0.75 },
          html: `ⓘ 관영 조선소는 이 항구에서 꼭대기다(나라 몫 상한 ${hint.cap}) — 여기서 더 올리는 길은 이 승급뿐이다.`,
        }));
      }
      rows.push(el('button.btn.sm', {
        text: can.ok ? `부두를 넓힌다 (−${n.gold.toLocaleString('ko-KR')}닢)` : '아직 못 넓힌다',
        disabled: !can.ok,
        onclick: () => {
          const r = upgradeYard(state.at);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`공사를 걸었다 — ${r.to}까지 ${r.until - state.day}일`, 'good');
          refreshHUD(); refreshLog(); redraw();
        },
      }));
    }
  }

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '부두' }),
      el('span', { text: `${city.name} · 공업력 ${industryOf(state.at)}`,
                   style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

/* ★ **이 바다의 배가 먼저 온다.**
   목록은 `Object.entries(SHIPS)` 순서, 곧 권역 파일이 합쳐진 순서 그대로였다. 지중해·대서양이
   앞이고 동아시아가 맨 뒤라, 나가사키 조선소를 열면 **화면 첫 스무 줄이 전부 유럽 배**다.
   실플레이에서 테스터가 첫 갈아탈 배로 **스페인 카라벨**을 골랐고 *"동아시아 배가 한 척도 없다"*고
   적었다(ISSUES #5). 실제로는 스물여덟 척이 살 수 있었고 **마흔 줄 아래에 있었다.**
   ⇒ 후보에서 빠지는 문제가 아니라 **순서** 문제였으므로 `sellsShip`은 그대로 두고 여기서 정렬한다.
   ★ 단순한 UX가 아니다 — 권역 패권의 조건 ④가 *"그 권역 최고 tier 배를 몬다"*(`hegemonyOf: topShip`)라,
     그 바다 배가 눈에 안 띄면 완주 조건이 화면에서 막힌다.
   순서: ① 지금 가진 배 ② 이 바다에서 난 배 ③ 지금 살 수 있는 배 ④ 나머지 — 그 안에서는 원래 순서. */
function shipOrder(cityId) {
  const here = REGION_OF_CITY[cityId];
  const idx = Object.keys(SHIPS);
  const rank = (k) => (state.fleet[k] ? 0
    : SHIPS[k].home === here ? 1
    : sellsShip(k, cityId) ? 2 : 3);
  return (a, b) => (rank(a) - rank(b)) || (idx.indexOf(a) - idx.indexOf(b));
}

/** 지금 이 부두의 공업력이 **어느 바다까지 아는가** — 규칙을 한 줄로 옮긴 것뿐이다.
    `YARD_REACH_WORD`와 같은 사다리를 읽으므로 규칙이 바뀌면 이 줄도 따라간다. */
function yardReachHere() {
  const ind = industryOf(state.at);
  return ['아무 배도 못 짓는다(내륙)', '이 바다의 배까지',
          '이 항구가 직접 오가는 바다까지', '이 바다가 닿는 바다까지',
          '온 세계의 배까지'][Math.min(4, ind)];
}

function shipTab() {
  const upgradeCard = yardUpgradeCard();
  const rows = [];
  const seenKey = preview || state.shipKey;
  const order = Object.keys(SHIPS).sort(shipOrder(state.at)).map((k) => [k, SHIPS[k]]);
  for (const [key, s] of order) {
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
                 : rec ? el(`span.badge${isConsort(key) || here ? '.here' : ''}`,
                            { text: isConsort(key) ? '동행 중'
                                  : here ? '이 항구 정박' : `${CITY_BY_ID[rec.at].name} 정박` })
                       : el(`span.badge${sellsShip(key) ? '.buy' : ''}`, {
                           /* ★ **못 짓는 까닭을 배지에서 이미 가른다.** 「이 항구엔 못 짓는다」 하나로
                              뭉개면 부두를 넓혀 열리는 배와 아무리 넓혀도 안 열리는 배가 같아 보인다. */
                           text: sellsShip(key) ? `${shipPriceAt(key).toLocaleString('ko-KR')}닢`
                             : shipLockedBy(key) ? '아직 못 짓는다'
                             : yardShortOf(key)?.why === 'reach' ? '이 바다의 배가 아니다'
                             : '이 항구엔 못 짓는다',
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
    upgradeCard,
    /* ★ **사다리가 둘이라는 것을 화면이 말한다.** 기술(무엇을 지을 솜씨가 되나)과
       교역(어느 바다의 배를 아는가)이 나란히 걸리므로, 한쪽만 적으면 "공업력이 되는데
       왜 안 나오나"가 설명되지 않는다. 지금 이 부두가 어디까지 아는지를 한 줄로 준다. */
    el('p.yard-note', {
      html: `<b>${city.name}</b> 조선소 — 공업력 <b>${industryOf()}</b>`
          + `(0=내륙 · 1=소형 · 2=대형 상선 · 3=최상급 · 4=승급한 부두). 제 나라 배는 한 등급 쉽게 짓고, `
          + '오래 지어온 항구는 값이 싸다.',
    }),
    el('p.yard-note', {
      html: '부두는 <b>제가 오가는 바다의 배</b>부터 안다 — 공업력 1이면 이 바다, '
          + '2면 이 항구가 직접 오가는 바다, 3이면 이 바다가 닿는 바다, '
          + '<b>4라야 온 세계의 배</b>를 짓는다. '
          + `지금 이 부두가 아는 데까지 — <b>${yardReachHere()}</b>.`,
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
  if (lock) return `→ ${lock}${josa(lock, '을/를')} 몰아 본 선주에게만 내놓는다`;
  /* ★ `yardsOnly`인 배는 이유가 **공업력이 아니라 자리**다. 그 말을 안 하면 플레이어가
     엉뚱한 항구의 부두를 넓히며 자재와 몇백 일을 태운다. */
  if (s.yardsOnly && !(s.yards ?? []).includes(city.id)) {
    const w = yardsOf(key).join(' · ');
    return `→ ${w}에서만 짓는다 (그 부두에 공업력 ${tierNeeded(key, (s.yards ?? [])[0])} 필요)`;
  }
  const where = buildableAt(key).slice(0, 4).join(' · ');
  /* ★ **교역권이 막은 것과 기술이 막은 것을 가른다.** 둘을 "공업력 N 필요" 한 줄로 뭉개면
     플레이어가 이 항구의 부두를 넓히다가 열리지 않는 것을 보고서야 안다 —
     이 게임에서 한 회차에 다섯 번 나온 "규칙은 있는데 화면이 말하지 않는" 자리다. */
  const short = yardShortOf(key);
  if (short?.why === 'reach') {
    return `→ ${short.word}다 — 이 부두는 공업력 ${short.need}까지 올라야 그 물건을 안다`
         + ` (지금 ${industryOf()})` + (where ? ` · ${where}` : '');
  }
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
                   pushLog(`${city.name}에서 중고 ${s.name}${josa(s.name, '을/를')} 사들였다. 선체가 ${Math.round((1 - r.hp / s.hp) * 100)}% 상해 있다.`, 'good');
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
        pushLog(`${city.name} 조선소에서 ${s.name}${josa(s.name, '을/를')} 사들였다.`, 'good');
        redraw();
      },
    })];
  }

  /* ★ **동행 중인 배는 "여기"에 있다.** 함께 다니고 있으므로 정박지 판정보다 앞선다 —
     이 갈래를 뒤에 두면 항해 직후 그 배가 "여기 없음"으로 읽힌다. */
  if (isConsort(key)) {
    return [
      el('span.dim', { text: '동행 중', style: { color: '#54a89b' } }),
      el('button.btn.sm.dark', {
        text: '정박시킨다',
        title: '선단에서 뺀다. 태운 사람은 내리고 계약금은 돌아오지 않는다.',
        onclick: () => {
          const r = stowConsort(key);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${s.name}${josa(s.name, '을/를')} 매어 두었다 — 선원 ${r.crew}명 하선`, 'warn');
          redraw();
        },
      }),
    ];
  }

  if (!here) return [el('span.dim', { text: '여기 없음' })];

  const can = canConsort(key);
  return [
    el('button.btn.sm', {
      // 적재 판정은 **선단 전체**로 한다 — 동행선을 데리고 있으면 작은 기함으로도 갈아탈 수 있다
      text: '승선',
      disabled: cargoUsed() > cargoCapTotal() - state.cargoCap + s.cargo,
      onclick: () => doBoard(key, s),
    }),
    /* 「동행시킨다」 — 이 게임에서 배가 두 척 이상이 되는 자리다.
       값은 사람에게 든다(`consortHireCost` = 부두 고용 ×최소 인원). */
    el('button.btn.sm', {
      text: `동행 −${consortHireCost(key).toLocaleString('ko-KR')}`,
      disabled: !can.ok,
      title: can.ok
        ? `선원 ${consortCrewNeed(key)}명을 태워 함께 나간다. 화물 +${s.cargo}칸 · 포 ${s.guns}문이 함께 쏜다.`
          + (captainOf(key) ? '' : ' (맡길 선장은 아직 없다)')
        : can.reason,
      onclick: () => {
        const r = setConsort(key);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${s.name}${josa(s.name, '이/가')} 따라나선다 — 선원 ${r.crew}명 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
        redraw();
      },
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
    pushLog(`${city.name}에서 ${s.name}${josa(s.name, '으로/로')} 갈아탔다.`
            + (r.dropped ? ` 선원 ${r.dropped}명이 하선했다.` : ''), 'good');
    // 큰 배는 사람을 더 먹는다 — 최소 인원을 못 채우면 돛을 다 펴지 못한다
    if (r.short) {
      pushLog(`${s.name}${josa(s.name, '을/를')} 몰려면 최소 ${s.crewMin}명이 필요하다. 지금 ${state.crew}명 — 속력이 떨어진다.`, 'warn');
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
        pushLog(`${city.name}에서 ${s.name}${josa(s.name, '을/를')} 팔았다.`);
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
      k && !locked ? spriteElTrim(unitSprite(k, 'idle', null, regionOf(state.at)), 2, 0)
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
      /* ⚠️ 「선체 수리」는 여기 없다 — **탭 밖 `repairBar()`로 올렸다**(2026-08-28).
         이 탭에만 있어서 러너가 358일을 잃었다. 되돌리지 말 것. */
    ]),
  ]);
}

/* ── 선체 수리 — 탭 밖에 늘 서 있는 줄 ─────────────────────────
   ★ 판정 기준은 하나다: **선체가 바닥인 판으로 조선소에 들어갔을 때 수리가 눈에 보이는가.**
     그래서 ⓐ 탭과 무관하게 뜨고 ⓑ 선체가 낮으면 색이 갈리고 ⓒ *왜 급한지*를 적는다
     (원양이 막히는 것은 선체가 아니라 `OCEAN_HULL_MIN`이라 화면이 말해 주지 않으면 모른다). */
function repairBar() {
  const full = state.hp >= state.maxHp;
  const pct = state.maxHp ? state.hp / state.maxHp : 1;
  const need = state.maxHp - state.hp;
  const cost = Math.round(need * repairUnit());
  const low = pct <= OCEAN_HULL_MIN;
  const color = full ? '#8f8878' : low ? '#e0806e' : '#c9b98a';
  return el('div.yard-fix', {
    style: {
      flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', borderBottom: '1px solid var(--line)',
      background: low ? '#e0806e14' : 'transparent',
    },
  }, [
    el('div', { style: { flex: '1 1 auto', minWidth: 0, fontSize: '11.5px', lineHeight: 1.45 } }, [
      el('div', { style: { color },
        html: `선체 <b>${state.hp}/${state.maxHp}</b>`
            + (full ? ' — 성하다'
                    : ` · 전부 고치는 데 <b>${cost.toLocaleString('ko-KR')}닢</b>`
                      + `(${repairUnit()}닢/pt${repairUnit() < REPAIR_UNIT ? ' · 깎았다' : ''})`) }),
      low && !full ? el('div', { style: { color: '#e0806e', fontSize: '10.5px', marginTop: '2px' },
        text: `삭아서 원양에 못 나간다 (선체 ${Math.round(OCEAN_HULL_MIN * 100)}% 필요) — 고치지 않으면 근해에 갇힌다` }) : null,
    ]),
    el('button.btn.sm', {
      text: full ? '성하다' : '전부 수리',
      disabled: full,
      onclick: () => {
        const r = repair(state.maxHp - state.hp);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`선체 ${r.need}pt 수리 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
        refreshHUD(); redraw();
      },
    }),
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
    /* ★ **줄 어디를 눌러도 뽑힌다.** 전에는 오른쪽 작은 값 단추에만 `onclick`이 있어,
       초상·이름·설명이 든 큰 줄을 눌러도 아무 일이 없었다 — 같은 화면의 배 목록·술집 카드는
       줄 전체가 눌리므로 여기만 규칙이 달랐다. 실제로 자동 조종이 두 번 헛눌렀고 그때마다
       모달의 *첫* 단추가 대신 먹혀 엉뚱한 병종이 배치되고 돈이 오갔다
       (완주 플레이 ISSUES #18). 눌러도 안 되는 것처럼 느껴지는 화면은 그 자체가 결함이다. */
    const take = () => {
      if (k === prev) return;
      if (due > state.gold) return toast(`금화가 ${(due - state.gold).toLocaleString('ko-KR')}닢 모자란다`, 'bad');
      const r = setSlot(i, k);
      if (!r.ok) return toast(r.reason, 'bad');
      toast(`${i}번 자리에 ${t.name} 배치`, 'good');
      close();
      redraw();
    };
    list.append(el(`div.pick${k === prev ? '.on' : ''}`, {
      onclick: take,
      style: k === prev ? null : { cursor: 'pointer' },
    }, [
      spriteElTrim(unitSprite(k, 'idle', null, regionOf(state.at)), 2, 0),
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
        // 줄 전체가 이미 눌리므로 여기서는 **버블링만 막는다**(두 번 실행되지 않게)
        onclick: (e) => { e.stopPropagation(); take(); },
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
          const hpBefore = state.hp, maxBefore = state.maxHp;
          const r2 = buyRefit(k);
          if (!r2.ok) return toast(r2.reason, 'bad');
          toast(`${r.name} 완료 · ${r2.cost.toLocaleString('ko-KR')}닢`, 'good');
          pushLog(`${city.name} 조선소에서 ${ship().name}에 ${r.name}${josa(r.name, '을/를')} 했다.`, 'good');
          /* ★ **최대치를 올리는 개장은 무슨 일이 났는지 말해야 한다**(conquest ISSUES #23).
             덧댄 몫은 성하지만(`state.js: buyRefit`) **낡은 부분은 그대로 낡아 있다** —
             그래서 산 직후에도 눈금이 안 찬다. 그 사실을 안 적으면 "돈을 냈는데 왜 안 찼나"가 된다. */
          const up = state.maxHp - maxBefore;
          if (up > 0) {
            pushLog(`덧댄 ${up}pt는 새것이라 선체가 ${hpBefore} → ${state.hp}${josa(state.hp, '이/가')} 됐다`
                  + (state.hp < state.maxHp
                      ? ` — 나머지 ${state.maxHp - state.hp}pt는 낡은 채다. 채우려면 수리해야 한다.`
                      : '.'), state.hp < state.maxHp ? 'warn' : 'good');
          }
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
    /* ★ **사기 전에** 최대치와 현재치가 다르다는 것을 말한다(conquest ISSUES #23).
       떡갈나무 장갑은 여섯 중 두 번째로 비싼데, 전에는 사고 나면 "231 중 185"가 되어
       **산 직후가 가장 약한 상태**였다. 지금은 덧댄 몫이 성하지만 낡은 몫은 그대로다. */
    state.hp < state.maxHp ? el('p.yard-warn', {
      style: { color: '#c9b98a' },
      html: `선체를 올리는 개장은 <b>덧댄 만큼만 성하다</b> — 낡은 몫은 그대로 낡아 있다.`
          + ` 지금 <b>${state.hp}/${state.maxHp}</b>이니, 개장 뒤에도 ${state.maxHp - state.hp}pt는`
          + ` 수리로 채워야 한다.`,
    }) : null,
    el('p.yard-warn', {
      text: '레이지 개조는 포문 상한을 깎는다. 넘치는 대포는 환불 없이 뜯겨 나간다.',
    }),
  ].filter(Boolean));
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
