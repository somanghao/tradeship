// scenes/port.js — 항구: 시세 확인과 매매, 선박 정비, 출항

import { portSprite } from '../sprites/scene.js';
import { shipSprite, WATERLINE } from '../sprites/ship.js';
import { unitSprite, figureSprite, mateSprite } from '../sprites/char.js';
/* 부두에 선 사람은 **작은 인물**(24×28 · 실질 키 21px)이다 — 48px 그림은 건너편에 댄 배보다
   너무 커서 배가 장난감으로 보였다. 사이드패널의 초상은 크기가 곧 정보라 큰 그림 그대로다. */
import { miniUnitSprite, MINI_FOOT } from '../sprites/char-mini.js';
import { blit } from '../pixel.js';
import { GOODS, GOOD_BY_ID, CITIES, CITY_BY_ID, SHIPS, OFFICER, HOLDINGS, HOLDING_KEYS, HOLDING, FLAG_NAME,
         ESTATE_KEYS, WORK, WORKS, CONSIGN, LINE, FACTIONS, FACTION, REGARD, ROSTER, COMMENDA, BANKRUPT, BOON, HEGEMONY } from '../data.js';
import {
  state, ship, cargoUsed, cargoFree, buy, sell, repair,
  marketTag, tagRank, pushLog, gunCap, playerTroops, REPAIR_UNIT,
  impactFactor, costFor, tariffRate, shorthanded,
  contractOffer, acceptContract, deliverContract, abandonContract,
  hasOfficer, paydayDue, paydayDeferred, daysToPayday, payrollOwed, regionOf,
  priceOf, voyageDays, neighborsOf,
  buyService, figureFee, activeBoons, repairUnit, infamyHere, infamyTariffUp, tariffCutPreview,
  /* 세력 2단계 — 웃돈·자격·선단 달력 */
  gripMarkup, enrollOffer, buyEnroll, convoyDue,
  activeBounty, rosterOpenIn, bountyTipPrice, buyBountyTip, tamePrice, tamePirate,
  tamedIn, passOff, tipOff, regionHasHolding, huntLegs,
  knowPort, holdingTip, insuranceAdd,
  /* 동료 — 코멘다(P3). 규칙은 `state.js`, 값은 `data.js: COMMENDA` */
  matesAt, crewMates, mateCount, mateCap, mateCut, mateStake, hireMate, dismissMate,
  hasHolding, ownsHolding, holdingIdle, holdingPrice, canBuyHolding, buyHolding, storeCap, storedUsed,
  industryPathHint,
  /* 나라가 짓는 조선소(C-18) — 규칙은 `state.js`, 값은 `data.js: CIVIC`. 여기서는 **말만** 한다 */
  civicProgress, tickCivic, duesOf, duesOfFlag, civicCutOf, mainPortOf, industryOf,
  storeGoods, takeGoods, holdingUpkeepDue, settleHolding, sellHolding, holdingsValue,
  /* 수익형 부동산(#5) — 등급·세·공실. 값은 `data.js: HOLDINGS[].grades·ESTATE` */
  estateGrade, estateDef, estateRent, estateUpgradeCost, vacancyOdds, canUpgradeEstate, upgradeEstate,
  portDayCost, waitDays, dischargeCrew, recallCrew, settleYard,
  endingProgress, markEnded,
  /* 권역 패권 — 규칙은 `state.js`, 값은 `data.js: HEGEMONY`. 여기서는 보여주기만 한다 */
  hegemonyOf, hegemonyAll, markNineEnded, homelandProgress,
  /* 동행 선단 — 규칙은 `state.js`, 여기서는 보여주고 토글만 한다 */
  cargoCapTotal, consortCount, fleetSize, fleetCrew, fleetDailyCost,
  fleetLaggard, fleetSpeedPenalty, setConsort, stowConsort, canConsort, syncConsortPort,
  consortHireCost, consortCrewNeed, captainOf, isConsort,
  /* 수직계열화 1단계(A-9) — 값은 `data.js: CHAIN·WORKS·WORK`, 규칙은 `state.js`.
     여기서는 보여주고 누르기만 한다. */
  millRecipes, millOf, millPrice, canBuyMill, buyMill, canUpgradeMill, upgradeMill, sellMill,
  millBatchCap, millFee, millDays, canRunMill, runMill, collectMill,
  worksUpkeepDue, settleWorks, workList, chainOutUnits,
  /* 2단계 — 농장·광산 */
  growCandidates, growPrice, growRate, growCap, growOff, growStock, workAt,
  canBuyGrow, buyGrow, canUpgradeGrow, upgradeGrow, sellGrow,
  /* 3단계 — 판매소 */
  shopAt, shopPrice, shopTick, collectShop, consignToShop,
  canBuyShop, buyShop, canUpgradeShop, upgradeShop, sellShop,
  /* 3단계 — 위탁·정기선 */
  canConsign, sendConsign, arriveConsign, consignFee,
  lineList, canStartLine, startLine, stopLine,
  /* 세력 관계(SPEC-factions 1단계) — 규칙은 `state.js`, 값은 `data.js: FACTIONS·REGARD`.
     여기서는 **이 항구의 임자 한 줄**만 보여주고 나머지는 관계도 모달이 편다. */
  factionOfCity, factionsOfCity, regardOf, regardBand, infamyWeight,
  /* 바닥에서 나가는 문(C-17) — 값은 전부 `state.js`가 센다. 여기서는 줄로 옮기고 단추만 건다. */
  salvage, cheapestExit, debtOwed, sellShip, liquidate,
  /* 패권이 화면에서 말을 안 하던 자리 둘(A-8c) — 표는 state가 정본, 여기서는 읽기만 한다 */
  foeWealth, foeOdds, foeWealthGate,
} from '../state.js';
import { openPayday } from '../payday.js';
import { openFactions } from '../factions.js';
import { autoSave } from '../save.js';
/* 해적 명부(`rosterOf`)는 규칙이 `world.js`에 있다 — 후보에서 빼는 규칙(`pickDef`)과
   같은 자리라야 카드와 세계가 갈리지 않는다. 여기서는 **세어 보여주기만** 한다. */
import { npcsAtPort, figuresAt, rosterOf } from '../world.js';
import { goodRank, goodBasis } from '../evidence.js';
/* ★ `refreshLog`가 **import에 빠져 있었다.** 정박 카드(기다린다·선원을 내린다)와 거점 카드가
   이미 부르고 있었으므로 그 단추들은 눌리는 순간 ReferenceError로 죽었다 —
   화면은 멀쩡하고 아무 일도 안 일어나는 꼴이라 버그로 안 보인다. */
import { el, overlay, toast, refreshHUD, refreshLog, iconEl, spriteElTrim, modal, josa, npcTitle } from '../ui.js';
import { go, gameStarted } from '../main.js';

let bg, city, dockers;

/* 부두에 세워둘 NPC — 도시마다 고정되도록 seed로 뽑는다 */
/* 부두에 선 사람의 발이 닿는 자리 — 예전 48px 그림의 `y=150 + CHAR_FOOT`과 같은 높이다.
   `DOCKER_DX`는 스프라이트가 좁아진 만큼(48 → 24) 가운데를 맞추는 보정이다. */
const QUAY_FEET = 195, DOCKER_DX = 13;

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
    knowPort(city.id);   // 닿으면 이웃 몇 곳의 시세도 열린다 (P5)
    /* ★ **동행선의 정박지를 여기서 맞춘다.** 도착 처리(`scenes/map.js: arrive`)는 기함과
       예인선만 옮기므로, 함께 다닌 배들은 항구 화면이 열릴 때 이 한 줄로 따라온다.
       세이브를 불러온 판에서도 어긋나지 않는 자리다. */
    syncConsortPort(city.id);
    buildUI();
    /* ★ **항구가 곧 세이브 포인트다.** 바다 위 상태(`sailing`)는 씬의 모듈 변수라 어차피
       담기지 않으므로, 저장 시점을 항구로 못박는 것이 그 사실과 맞아떨어진다.
       단 **타이틀이 닫히기 전에는 저장하지 않는다** — 부팅 순서상 여기가 먼저 불린다. */
    /* 거점 유지비는 **그 항구에 들어올 때** 문다 — 연 6%를 30일마다. 못 내면 압류된다. */
    settleHolding(city.id);
    /* 시설 유지비도 **들어올 때** 문다 — 거점(연 6%)과 같은 리듬, 값만 더 무겁다(연 10%).
       ★ `settleHolding` **바로 옆**에 두는 것이 규약이다. 한 곳에 모아 두지 않으면
         "어느 항구에서는 청구되고 어느 항구에서는 안 되는" 자리가 생긴다. */
    settleWorks(city.id);
    /* 위탁도 **들를 때** 받는다(3단계 · §3-1) — 남의 배가 부려 놓고 간 짐이 창고에 들어온다.
       자동으로 금고에 넣지 않는 것과 같은 규약이다: 유통은 **짐만 옮기고 사고팔지 않는다.** */
    arriveConsign(city.id);
    settleYard(city.id);     // 내가 건 부두 공사가 끝났으면 여기서 올라간다
    /* 나라가 건 조선소도 **같은 자리**에서 장부에 옮긴다(C-18). `civicOf()`가 이미 참을 세므로
       공업력은 들르지 않아도 맞지만, **로그는 여기서 뜬다** — 규칙이 멀쩡한데 화면이
       말하지 않아 수백 일을 잃는 그 자리다. */
    tickCivic(city.id);
    if (gameStarted()) autoSave();
    // 급여일은 **항구에서만** 온다 — 바다에서는 돈을 줄 데가 없다.
    // 화면을 세운 뒤에 띄워야 정산이 끝나고 닫혔을 때 뒤에 항구가 있다.
    /* 급여일은 **항구에서만** 온다 — 바다에서는 돈을 줄 데가 없다.
       "짐을 팔고 오겠다"로 미뤄 둔 날이면 다시 띄우지 않는다(→ payday.js) — 대신 **떠날 때 막는다.** */
    if (paydayDue() && !paydayDeferred()) openPayday(() => after());
  },

  draw(ctx, t) {
    blit(ctx, bg, 0, 0, 1);

    // 정박한 우리 배 — 수면선을 항구 물높이에 맞춘다.
    // x는 좌우 UI 패널 사이의 빈 구간(논리 132~308)에 맞춘 값이다.
    // 오른쪽에 두면 사이드패널에 가려 배가 안 보인다.
    const bob = Math.round(Math.sin(t * 0.9) * 1.2);
    blit(ctx, shipSprite(ship().hull, { tint: ship().tint, flag: city.flag, furl: true }),
         132, 168 - WATERLINE + bob, 1);

    /* 부두 위 사람들 — 발바닥이 닿는 자리(`QUAY_FEET`)를 기준으로 세운다.
       48px 그림을 쓰던 시절의 `y=150`은 그 값에 큰 그림의 발밑선을 미리 뺀 것이었다. */
    for (const d of dockers) {
      blit(ctx, miniUnitSprite(d.key, 'idle', null, regionOf(state.at)),
           d.x + DOCKER_DX, QUAY_FEET - MINI_FOOT, 1, d.flip);
    }

    // 부관은 배 곁에 선다 — 사이드패널을 열지 않아도 함께 있다는 것이 보인다
    if (hasOfficer()) {
      blit(ctx, miniUnitSprite(OFFICER.sprite, 'idle'), 108 + DOCKER_DX, QUAY_FEET - MINI_FOOT, 1);
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
        // 적재량은 **선단 전체**다 — 동행선을 데리고 나가면 여기부터 늘어난다
        text: `적재 ${cargoUsed()}/${cargoCapTotal()}`
            + (consortCount() ? ` (기함 ${state.cargoCap} + 동행 ${cargoCapTotal() - state.cargoCap})` : ''),
      }),
      /* ★ 악명은 **값이 오르는 자리에서 보여야** 뜻이 있다. 상선을 턴 값이 여기서 돌아온다
         (`state.js: infamyTariffUp`). 아무 데도 안 뜨면 "왜 세가 비싸졌지"를 알 길이 없다. */
      infamyHere() > 0 ? el('span', {
        style: { fontSize: '11px', color: '#c98a6a', letterSpacing: 0 },
        title: `이 항구의 깃발 쪽 배를 턴 일이 소문났다.
입항세가 ${Math.round(infamyTariffUp() * 100)}% 무겁다. 날이 지나면 잊힌다.`,
        text: `악명 ${infamyHere()} · 세 +${Math.round(infamyTariffUp() * 100)}%`,
      }) : null,
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
          /* ★ **값나가는 짐은 두 번 대가를 치른다** — 그 둘째(적하보험)를 **담기 전에** 보여 준다.
             완주 러너가 62거점에서 하루 −600닢으로 150일을 샜는데, 같은 조건의 시뮬은 +274닢이었다.
             차이는 하나 — 시뮬은 짐을 싣고 다녔다. 규칙은 안 바꾸고 **보이게만 한다**(`insuranceAdd`). */
          text: '사기', disabled: costFor(g.id, 1) > state.gold || cargoFree() <= 0,
          title: (() => {
            /* ★ C-18 ⓒ의 짝 — **왜 못 누르는지를 말한다.** 화물칸이 차면 단추가 이유 없이
               잠겨, 자재를 모으던 사람이 "게임이 고장 났나"로 읽었다. */
            if (cargoFree() <= 0) return `화물칸이 가득 찼다 (${cargoCapTotal()}칸) — 팔거나 창고에 맡겨야 산다`;
            if (costFor(g.id, 1) > state.gold) return `금화가 모자란다 — 한 개에 ${costFor(g.id, 1).toLocaleString('ko-KR')}닢`;
            const ins = insuranceAdd(g.id, 10, city.id);
            return '10개 · Shift 전량 · Ctrl 1개 (금화·빈 칸이 모자라면 살 수 있는 만큼만)'
              + (ins.add > 0
                  ? `\n★ 10개를 실으면 적하보험료가 +${ins.add.toLocaleString('ko-KR')}닢`
                    + ` (가장 험한 이웃 ${CITY_BY_ID[ins.to].name} 기준 · 요율 ${ins.risk}%)`
                  : '\n이 항구에서 나가는 길은 전부 내해라 적하보험이 안 붙는다');
          })(),
          onclick: (e) => doBuy(g.id, e.shiftKey ? 999 : e.ctrlKey ? 1 : 10),
        }),
        el('button.btn.sm', {
          text: '팔기', disabled: have <= 0,
          title: '10개 · Shift 전량 · Ctrl 1개',
          onclick: (e) => doSell(g.id, e.shiftKey ? 999 : e.ctrlKey ? 1 : 10),
        }),
      ])),
    ]);
    tb.append(tr);
  }
  tbl.append(tb);
  /* ★ 위에 붙인다(`bottom`이었다). 품목이 20줄을 넘는 항구에서는 맨 아래 안내가
     스크롤 밖으로 밀려, 처음 켠 사람은 한 번 누를 때 몇 개가 실리는지 모른 채 누른다 —
     실제 플레이에서 세 번 눌러 18개가 실리고 금고가 바닥났다. → wiki/playtest-log.md §3-2 */
  tbl.append(el('caption', {
    text: `기본 10개 단위 · Shift=전량 · Ctrl=1개 · 한 번에 많이 거래할수록 단가가 불리해진다 · 입항세 ${Math.round(tariffRate(city.id) * 100)}%`,
    style: {
      captionSide: 'top', fontSize: '11px', color: '#6f6858',
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
      /* ★ **얼마가 드는지를 고르기 전에 보여 준다.** 전에는 "물건은 직접 마련해야 한다"까지만
         적혀 있어서, 조달비가 전 재산의 두 배인 주문을 받아 놓고 기한을 넘겨 위약금을 무는 일이
         생겼다(완주 플레이 1일차: 소금 30개 1,320닢 ↔ 금고 200 + 선금 598).
         막지는 않는다 — 짐을 팔아 마련하거나 이미 실어 둔 것으로 채울 수도 있다.
         값을 숨기면 선택이 아니라 도박이 된다(해적 조우 카드와 같은 원칙). */
      (() => {
        const here = Math.round(priceOf(state.at, o.goodId) * o.qty);
        const have = state.cargo[o.goodId] || 0;
        const need = Math.max(0, o.qty - have);
        const cost = Math.round(here * (need / o.qty));
        const purse = state.gold + o.advance;
        const short = cost - purse;
        const direct = neighborsOf(state.at).includes(o.to);
        const legs = voyageDays(state.at, o.to);
        return el('div.ctr-sub', {
          style: short > 0 ? { color: '#c98a6a' } : null,
          text: (have ? `실은 것 ${have}개 · ` : '')
              + (need ? `여기서 ${need}개를 사면 약 ${cost.toLocaleString('ko-KR')}닢` : '실은 것으로 채운다')
              + ` (금고 ${state.gold.toLocaleString('ko-KR')} + 선금 ${o.advance.toLocaleString('ko-KR')})`
              + (short > 0 ? ` · ${short.toLocaleString('ko-KR')}닢 모자란다` : '')
              + ` · ${CITY_BY_ID[o.to].name}${direct ? '' : '(직항 아님)'} 편도 ${legs}일`,
        });
      })(),
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

/* ── 동료 (P3 · 코멘다) ────────────────────────────────────────
   ★ **에이미와 다른 자리다.** 부관은 주어진 동행이라 카드에 단추가 없지만, 동료는 **고르는 사람**이다.
     계약 모양이 둘이고(편무 25% · 쌍무 50%+밑천) 그 고름이 이 카드의 전부다.
   ★ 이 항구에 사람이 없고 태운 사람도 없으면 **카드를 안 띄운다** — 빈 패널은 벽지다. */
/* ── 동료의 얼굴 (ART-ISSUES B-2 · D-4) ────────────────────────
   ★ **51명이 이름만 다른 글자 줄이었다.** 회차 23에 `sprites/char.js`가 `mateSprite`를 냈는데
     **아무도 부르지 않아** 화면에는 한 픽셀도 안 나왔다 — 그 회차 아트 작업의 절반이
     이 한 줄에 걸려 있었다. 「규칙이 멀쩡한데 화면이 말하지 않는다」의 그림 판이다.
   ★ 액자는 항구 인물 패널과 **같은 것**(`.fig-por`)을 쓴다. 두 목록이 같은 종류의 사람을
     다른 크기로 보여 주면 어느 쪽이 중요한지가 흐려진다.
   ★ `m.sex`는 **명부에 있을 때만** 넘어간다 — 없으면 기본값(남성 바디)이다(B-4). */
function mateHead(m, sub) {
  return el('div.ctr-sub.fig-row', { title: m.blurb ?? '' }, [
    el('span.fig-por', {}, spriteElTrim(mateSprite(m.id, m.role, null, m.sex), 3)),
    el('span.fig-who', {}, [
      el('b', { text: m.name }),
      el('span.fig-job', { text: sub }),
    ]),
  ]);
}

function mateCard() {
  const here = matesAt(city.id);
  const mine = crewMates();
  if (!here.length && !mine.length) return null;

  const rows = [];
  if (mine.length) {
    /* ★ **밑절미를 정직하게 적는다**(ISSUES #30). *"이익의 50%"*는 순이익으로 읽히는데
       실제로 떼는 것은 **매매차익**이고 항해비·급여·보험·유지비는 전부 플레이어가 문다.
       그리고 **지금까지 그가 가져간 액수**를 보여 준다 — 실플레이에서 19일에 3,263닢이었는데
       화면 어디에도 그 수가 없었다. 「언제 내릴 것인가」는 그 수를 봐야 정해진다. */
    const took = crewMates().reduce((a, m) => a + (m.earned || 0), 0);
    rows.push(el('div.ctr-sub', {
      text: `함께 가는 사람 ${mateCount()}/${mateCap()}명 — **매매차익**의 ${Math.round(mateCut() * 100)}%가 이들 몫이다`
          + ' (항해비·급여·보험은 내가 문다)'
          + (took ? ` · 여태 ${took.toLocaleString('ko-KR')}닢 가져갔다` : ''),
      style: { color: mateCut() > 0.5 ? '#c98a6a' : '#8f8878' },
    }));
    for (const m of mine) {
      rows.push(mateHead(m, `${m.title} · 일당 ${m.wage}닢`));
      rows.push(svcRow(`${m.joint ? '쌍무' : '편무'} 계약`,
        `매매차익의 ${Math.round((m.joint ? COMMENDA.cutJoint : COMMENDA.cutSole) * 100)}%`
        + (m.stake ? ` · 밑천 ${m.stake.toLocaleString('ko-KR')}닢을 댔다(내리면 돌려준다)` : '')
        + (m.earned ? ` · 여태 ${m.earned.toLocaleString('ko-KR')}닢` : ''),
        '내린다', false, () => {
          const r = dismissMate(m.id);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${m.name}${josa(m.name, '이/가')} 내렸다`, 'warn');
          refreshHUD(); refreshLog(); after();
        }));
    }
  }
  for (const m of here) {
    const stake = mateStake(m);
    const full = mateCount() >= mateCap();
    rows.push(mateHead(m, `${m.title} · ${m.origin}`));
    rows.push(el('div.ctr-sub', { text: m.blurb, style: { opacity: 0.8 } }));
    /* ★ **두 계약을 나란히 놓는다.** 초반엔 쌍무가 자본을 주고(밑천 > 계약금) 후반엔 그 절반이
       순손실이 된다 — 같은 사람이 단계마다 다른 값이라는 것이 이 장치의 전부다. */
    rows.push(svcRow(`편무 — 계약금 ${(m.hire ?? 0).toLocaleString('ko-KR')}닢`,
      `**매매차익**의 ${Math.round(COMMENDA.cutSole * 100)}%를 가져간다(항해비는 내가 문다). 밑천은 안 댄다.`,
      '태운다', full || (m.hire ?? 0) > state.gold, () => {
        const r = hireMate(m.id, { joint: false });
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${m.name}${josa(m.name, '이/가')} 올랐다`, 'good');
        refreshHUD(); refreshLog(); after();
      }));
    rows.push(svcRow(`쌍무 — 계약금 ${(m.hire ?? 0).toLocaleString('ko-KR')}닢 · 밑천 +${stake.toLocaleString('ko-KR')}닢`,
      `그가 ${stake.toLocaleString('ko-KR')}닢을 대고 **매매차익**의 ${Math.round(COMMENDA.cutJoint * 100)}%를 가져간다`
      + '(항해비는 내가 문다). 내릴 때 밑천은 돌려준다 — 다만 **파산하면 그도 함께 잃는다**.',
      '태운다', full || (m.hire ?? 0) > state.gold, () => {
        const r = hireMate(m.id, { joint: true });
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${m.name} — 밑천 ${r.stake.toLocaleString('ko-KR')}닢`, 'good');
        refreshHUD(); refreshLog(); after();
      }));
  }
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '동료' }),
      el('span', { text: `${mateCount()}/${mateCap()}`,
                   style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, rows),
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

/* ── 바닥에서 나가는 문 (C-17) ─────────────────────────────────
   ★ **규칙이 아니라 안내다.** 회복 경로는 진작 다 있었다 — 짐을 팔고(`sell`), 창고를 비우고
     (`takeGoods`), 정박선을 넘기고(`sellShip`), 거점·가공장을 던지고(`sellHolding`·`sellMill`),
     빌리고(`buyService('loan')`), 마지막에 청산한다(`liquidate`).
     그런데 화면은 `금화가 모자란다` 한 줄뿐이었고, 완주 러너는 960일차에 금고가 0이 되자
     마지막 2,241닢까지 근해를 왕복하다 멈췄다. **팔 것이 있다는 말을 아무도 안 했기 때문이다.**
   ★ 파산 벌칙은 한 칸도 안 건드린다. 값은 전부 `state.js: salvage()`가 세고
     (입항세·재판매율·되사기율이 규칙과 갈리지 않게), 여기서는 **줄로 옮기고 단추만 건다.**
   ★ 자리는 사이드패널 **맨 위**다 — 이 카드가 뜨는 국면에서 시장·정비·거점보다 먼저 읽혀야 한다. */
function salvageCard() {
  const exit = cheapestExit();
  const debt = debtOwed();
  /* 뜨는 조건 둘 — ① 여기서 가장 싼 항차조차 못 낸다 ② 빚이 금고보다 크다.
     ★ 출항 자체는 막히지 않는다(못 낸 몫은 빚이 된다). 그래도 **떠나는 순간 빚이 느는**
       상태이므로, 그 사실과 팔 것을 함께 말해야 "왜 계속 가난해지나"를 읽을 수 있다. */
  const stranded = exit != null && state.gold < exit;
  const drowning = debt > 0 && state.gold < debt;
  if (!stranded && !drowning) return null;

  const rows = salvage(city.id);
  const total = rows.reduce((a, r) => a + r.gold, 0);
  const lender = figuresAt(city.id).find((f) => f.service === 'loan');
  const canLoan = lender && !state.boons?.loan;

  /* ★ **경보와 안내를 가른다.** 무역선은 짐을 싣는 순간이 늘 가장 가난하다 —
     그때마다 붉은 「금고가 바닥이다」가 뜨면 진짜 바닥일 때 아무도 안 읽는다(경보 피로).
     그래서 **팔 것이 한 항차를 덮으면 안내**(놋빛), **못 덮으면 경보**(붉은색)다.
     C-17이 실제로 죽은 자리는 후자다 — 팔 것으로도 못 채우는 국면. */
  const covered = total + state.gold >= (exit ?? 0) && total + state.gold >= debt;
  const grave = !covered;

  const lines = [];
  lines.push(el('div.ctr-line', {
    html: `금고 <b>${state.gold.toLocaleString('ko-KR')}닢</b>`
        + (exit != null ? ` · 여기서 가장 싼 항차 <b>${exit.toLocaleString('ko-KR')}닢</b>` : '')
        + (debt ? ` · 빚 <span style="color:#d05a4a">${debt.toLocaleString('ko-KR')}닢</span>` : ''),
  }));
  lines.push(el('div.ctr-sub', {
    html: !stranded
      ? '빚이 금고보다 크다. 급여일에 채권자가 <b>금고 → 정박선 → 창고 짐</b> 순으로 집행한다.'
      : covered
        ? '이대로 뜨면 <b>못 낸 몫이 빚으로 남는다</b>(급여일에 이자와 함께 걷힌다).'
          + ' 아래를 팔면 채워진다 — 뜨기 전에 정하면 된다.'
        : '<b>팔 것을 다 팔아도 한 항차를 못 채운다.</b> 이대로 나가면 빚만 는다 —'
          + ' 아래 문 가운데 하나를 골라야 한다.',
  }));

  if (rows.length) {
    lines.push(el('div.ctr-sub', {
      html: `<b style="color:#e6c96a">지금 팔 수 있는 것 — 다 팔면 ${total.toLocaleString('ko-KR')}닢</b>`,
      style: { marginTop: '4px' },
    }));
    for (const r of rows) {
      lines.push(svcRow(`${r.label} — ${r.gold.toLocaleString('ko-KR')}닢`, r.note,
        r.kind === 'stored' ? '싣는다' : '판다',
        r.kind === 'mill' && r.gold <= 0, () => doSalvage(r)));
    }
  } else {
    /* ★ 빈 상태에도 말을 시킨다. "목록이 없다"가 아니라 **"이 항구에는 없다"**여야
       다른 항구에 둔 배·거점을 떠올릴 수 있다. */
    const away = Object.keys(state.fleet).filter((k) => k !== state.shipKey).length;
    const holds = Object.keys(state.holdings ?? {}).length;
    lines.push(el('div.ctr-sub', {
      html: away || holds
        ? `이 항구에서 팔 것은 없다 — 그러나 <b>다른 항구에 배 ${away}척 · 거점 ${holds}곳</b>이 있다.`
          + ' 그 항구로 가면 팔 수 있다.'
        /* ⚠️ **문 수를 세서 말한다.** 예전에는 「아래 둘뿐이다」로 박아 뒀는데, 대금업자는
           항구마다 있는 것이 아니라 **없는 항구에서는 문이 하나(청산)뿐**이다 —
           화면이 없는 문을 가리키면 사람은 그것을 찾다가 판을 접는다. */
        : `팔 것이 하나도 없다. 남은 문은 아래 ${canLoan ? '둘' : '하나'}뿐이다.`,
      style: { color: '#d0a04a' },
    }));
  }

  const acts = [];
  if (canLoan) {
    acts.push(svcRow(`${lender.name}에게 빌린다`,
      `${Math.round((BOON.loanRate - 1) * 100)}% 얹어 ${BOON.loanDays}일 뒤에 갚는다`,
      '빌린다', false, () => {
        const r = buyService(lender);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(r.line, 'warn');
        refreshHUD(); refreshLog(); after();
      }));
  }
  /* ★ 청산은 **마지막 문이고, 그래서 늘 보인다.** 팔 것이 남아 있어도 감추지 않는다 —
     감추면 "팔 것이 다 떨어진 뒤에야 알게 되는 문"이 되어 C-17이 그대로 재발한다.
     대신 단추가 `.danger`이고 모달이 잃는 것을 전부 적는다. */
  acts.push(svcRow('청산한다 — 배를 넘기고 셈을 끝낸다',
    `${SHIPS[BANKRUPT.keepShip].name} 한 척과 ${BANKRUPT.seedGold}닢으로 다시 시작한다`,
    '청산', false, () => askLiquidate()));

  return el('div.panel', { style: { borderColor: grave ? '#8f2f26' : '#6f5214' } }, [
    el('h3', {
      style: grave
        ? { background: 'linear-gradient(#4a2018, #331610)', color: '#f0b8a6' }
        : null,
    }, [
      el('span', { text: grave ? '금고가 바닥이다' : '금고가 비었다 — 팔면 채워진다' }),
      el('span', {
        text: rows.length ? `팔 것 ${rows.length}가지 · ${total.toLocaleString('ko-KR')}닢` : '팔 것이 없다',
        style: { fontSize: '11px', color: grave ? '#d09080' : '#8f8878', letterSpacing: 0 },
      }),
    ]),
    el('div.svc', {}, [...lines, ...acts]),
  ]);
}

function doSalvage(r) {
  if (r.kind === 'cargo') return doSell(r.key, state.cargo[r.key] || 0);
  if (r.kind === 'stored') {
    /* 창고 짐은 **싣고 나서** 판다 — 화물칸이 모자라면 실을 수 있는 만큼만 온다.
       그 사실을 토스트가 말해야 "눌렀는데 다 안 온다"가 버그로 안 읽힌다. */
    const stored = { ...(state.stored?.[city.id] ?? {}) };
    let moved = 0;
    for (const [gid, n] of Object.entries(stored)) {
      const t = takeGoods(gid, n, city.id);
      if (t.ok) moved += t.n;
    }
    if (!moved) return toast('화물칸이 가득 차 창고 짐을 실을 수 없다', 'bad');
    const left = storedUsed(city.id);
    toast(`창고에서 ${moved}칸을 실었다` + (left ? ` (${left}칸은 자리가 없어 남았다)` : ''), 'good');
    return after();
  }
  if (r.kind === 'ship') {
    const s = sellShip(r.key);
    if (!s.ok) return toast(s.reason, 'bad');
    pushLog(`${city.name}에서 ${SHIPS[r.key].name}${josa(SHIPS[r.key].name, '을/를')} 넘겼다`
          + ` (+${s.gain.toLocaleString('ko-KR')}닢).`, 'warn');
    toast(`${SHIPS[r.key].name} 매각 · +${s.gain.toLocaleString('ko-KR')}닢`, 'good');
    refreshHUD(); refreshLog(); return after();
  }
  if (r.kind === 'holding') {
    const h = sellHolding(city.id);
    if (!h.ok) return toast(h.reason, 'bad');
    toast(`거점 매각 · +${h.back.toLocaleString('ko-KR')}닢`, 'warn');
    refreshHUD(); refreshLog(); return after();
  }
  if (r.kind === 'mill') {
    const m = sellMill(r.key, city.id);
    if (!m.ok) return toast(m.reason, 'bad');
    toast(`가공장 매각 · +${m.back.toLocaleString('ko-KR')}닢`, 'warn');
    refreshHUD(); refreshLog(); return after();
  }
}

/** 청산 확인 — **브라우저 confirm은 쓰지 않는다**(자동화가 통째로 막힌다). */
function askLiquidate() {
  const ships = Object.keys(state.fleet).filter((k) => k !== BANKRUPT.keepShip);
  modal({
    title: '청산한다',
    body: '<b>배를 넘기면 셈이 끝난다 — 빚은 사라진다.</b><br><br>'
        + `<span style="color:#d05a4a">가는 것</span> — 배 ${Object.keys(state.fleet).length}척`
        + `(${SHIPS[BANKRUPT.keepShip].name}만 남는다) · 실은 짐 · 창고 짐 · 대부분의 선원 · 맡은 주문`
        + (mateCount() ? ` · 함께 건 동료 ${mateCount()}명과 그들의 밑천` : '')
        + '<br>'
        + '<span style="color:#8ac07a">남는 것</span> — 거점 · 세력 관계 · 악명 · 아는 항구 · 해적 명부 · 공업력 승급'
        + `<br><br>다시 시작하는 밑천은 <b>${BANKRUPT.seedGold}닢</b>이다. 판은 끝나지 않는다.`
        + (ships.length ? '' : '<br><br><span style="opacity:.7">넘길 배가 낡은 바사 한 척뿐이라 돌아올 것이 거의 없다.</span>'),
    actions: [
      { label: '그만둔다' },
      { label: '청산한다', onClick: () => {
          const r = liquidate();
          toast(`청산했다 — ${SHIPS[r.kept].name} 한 척과 ${r.gold}닢`, 'bad');
          refreshHUD(); refreshLog(); after();
        } },
    ],
  });
}

/* 이 항구에 지금 들어와 있는 배들 — 세계가 혼자 돌아간다는 것이 보이는 창 */
/* ── 끝 ────────────────────────────────────────────────────────
   ★ **무엇을 해야 끝나는지 보이지 않으면 그것은 목표가 아니라 우연이다.**
   조선 항구에서만 뜬다 — 이 끝은 조선의 항구를 깨우는 일이기 때문이다(`story/ENDING.md`). */
function endingCard() {
  if (city.flag !== 'joseon') return null;
  const p = endingProgress();
  if (p.done && markEnded()) {
    /* 한 번만 축하한다. 게임은 계속된다 — 끝을 본 뒤에도 배는 뜬다. */
    setTimeout(() => modal({
      title: '여덟 항구와 한 척',
      body: '염포의 부두에서 쇠를 덧댄 배가 내려왔다.<br>'
          + '달천에서 온 철과 여수에서 온 나무가 한 배에 들었고, '
          + '구리는 아홉 바다를 건너온 것이었다.<br><br>'
          + '<b>이 배는 벌지 못한다.</b> 화물칸이 좁고 유지비가 무겁다 — '
          + '어느 항로에서도 값을 돌려받지 못한다.<br>'
          + '그래도 부두에 서 있는 동안 이 나라의 배는 한 척 늘었다.<br><br>'
          + '<span style="opacity:.75">수첩 아홉 장 가운데 여섯은 심겼고 셋은 끝내 뒤집혔다. '
          + '그 셋을 적어 두는 것까지가 이 기록이다.</span>',
      actions: [{ label: '수첩을 덮는다' }],
    }), 400);
  }
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: p.done ? '끝 — 여덟 항구와 한 척' : '나라에 부두를 낸다' }),
      el('span', { text: p.done ? `${state.ended}일차` : `${p.steps.filter((x) => x.now >= x.need).length}/3`,
                   style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, p.steps.map((st) => el('div.ctr-sub', {
      style: st.now >= st.need ? { color: '#8fbf8a' } : null,
      text: `${st.now >= st.need ? '✓' : '·'} ${st.label} (${st.now}/${st.need}) — ${st.detail}`,
    }))),
  ]);
}

/** 패권 조건 ③의 **자산 하한**을 한 줄로 (A-8c).
    ★ 규칙은 한 줄도 안 바꾼다 — `state.js: foeOdds`가 정본이고 여기서는 그 표를 읽어 적는다.
      *"세력 함대는 전부 등급 4~5인데 부자가 될수록 더 못 이긴다"*(`story/FACTIONS.md`)가
      뒤집혀 읽히던 자리다. 실제로는 **부자가 되어야 그 함대가 나타난다.** */
function bossGateLine() {
  const w = foeWealth();
  const odds = foeOdds();
  const p = odds[HEGEMONY.bossTier - 1] ?? 0;
  const gate = foeWealthGate(HEGEMONY.bossTier);
  const leaky = !!ship().leak;
  return el('div.ctr-sub', {
    style: { color: p > 0 ? '#8f8878' : '#d0a04a', marginLeft: '10px' },
    html: leaky
      ? `이 배로는 등급 ${HEGEMONY.bossTier}가 <b>아예 안 붙는다</b> — `
        + '삭은 배는 거물이 상대해 주지 않는다. 배부터 갈아야 한다.'
      : p > 0
        ? `자산 <b>${w.toLocaleString('ko-KR')}닢</b>(금고 + 실은 짐) — `
          + `지금 조우에서 등급 ${HEGEMONY.bossTier}가 붙을 확률 <b>${Math.round(p * 100)}%</b>.`
        : `자산 <b>${w.toLocaleString('ko-KR')}닢</b>(금고 + 실은 짐) — `
          + `<b>등급 ${HEGEMONY.bossTier}는 지금 확률이 0이다.</b> 해적은 털 값이 나오는 배를 고르므로`
          + ` <b>${(gate ?? 0).toLocaleString('ko-KR')}닢</b>을 넘겨야 두목이 붙는다.`
          + ' 세지는 것이 아니라 <b>부자가 되어야</b> 열리는 조건이다.',
  });
}

/* ── 권역 패권 (지역 패자) ─────────────────────────────────────
   ★ 아홉 바다 각각에 **같은 모양의 중간 목표**를 준다. 조건 넷은 `data.js: HEGEMONY`,
     판정은 `state.js: hegemonyOf`. 이 카드는 **지금 이 항구가 속한 바다**를 펴서 보여주고
     나머지 여덟은 접어 둔다 — 사이드패널이 이미 길다.
   ★ 보상은 없다. 얻는 것은 거점이 이미 주는 이득(세·시장 깊이·매물)뿐이고,
     늘어난 유지비가 그 값이다. 화면도 그것을 그대로 말한다. */
function hegemonyCard() {
  const rid = regionOf(city.id);
  const h = hegemonyOf(rid);
  const all = hegemonyAll();
  const home = homelandProgress();

  /* 아홉 바다를 전부 잡으면 두 번째 끝이 열린다. 조선의 끝(`endingCard`)과 따로 논다 —
     둘은 겹치지 않으므로 기존 밸런스가 한 줄도 움직이지 않는다. */
  if (all.done && markNineEnded()) {
    setTimeout(() => modal({
      title: '아홉 바다',
      body: '아홉 개의 바다에 장부가 하나씩 섰다.<br>'
          + '어느 항구에 들어가도 이쪽 이름으로 된 창고가 있고, 세 곳마다 상관이 문을 연다.<br><br>'
          + '<b>이것으로 벌이가 늘지는 않는다.</b> 늘어난 것은 서른 날마다 나가는 유지비뿐이고, '
          + '깎인 세와 깊어진 시장은 애초에 거점이 주던 것이다.<br>'
          + '바다를 가진다는 말은 그 바다에서 더 받는다는 뜻이 아니라 '
          + '<b>그 바다가 무너지면 이쪽이 함께 무너진다</b>는 뜻이었다.<br><br>'
          + '<span style="opacity:.75">아홉 바다의 두목을 차례로 꺾었고, 아홉 바다가 짓는 가장 큰 배를 '
          + '한 척씩 몰아 보았다. 남은 것은 장부와 배 한 척이다.</span>',
      actions: [{ label: '장부를 덮는다' }],
    }), 400);
  }

  const mark = (ok) => (ok ? '✓' : '·');
  const line = (ok, text) => el('div.ctr-sub', {
    style: ok ? { color: '#8fbf8a' } : null, text: `${mark(ok)} ${text}`,
  });

  const rows = [
    line(h.ports.have >= h.ports.need,
      `모든 항구에 거점 (${h.ports.have}/${h.ports.need}) — 뭍의 도시도 센다`),
    line(h.factories.have >= h.factories.need,
      `상관 (${h.factories.have}/${h.factories.need}) — 세가 가볍고 시장이 깊어진다`),
    line(h.boss.done,
      `${h.boss.name}${josa(h.boss.name, '을/를')} 꺾는다`
      + (h.boss.done ? ` — ${h.boss.day}일차` : ' — 아직')),
    /* ★ **조건 ③은 "강해지면"이 아니라 "부자가 되어야" 열린다**(A-8c).
       `pickEnemy`가 `금고 + 실은 짐 × 60`으로 등급표를 고르므로, 자산이 문턱 아래면
       **등급 5 확률이 0**이다 — 120닢으로 시작하는 갈래는 아무리 세도 두목을 못 만난다.
       그런데 카드는 *"이 바다의 주인을 꺾어라"*라고만 적고 있었다. 그 문턱을 여기서 말한다.
       ★ 규칙은 안 건드린다. 표는 `state.js: foeOdds`가 정본이고 여기서는 읽기만 한다. */
    h.boss.done ? null : bossGateLine(),
    line(h.topShip.done,
      `이 바다가 짓는 가장 큰 배 (tier ${h.topShip.tier})`
      + ` — ${h.topShip.done ? `${h.topShip.name} 보유`
            : h.topShip.choices.length > 1
              ? `${h.topShip.choices.slice(0, 3).join(' · ')} 중 하나`
              : `${h.topShip.name}${josa(h.topShip.name, '이/가')} 아직 없다`}`),
  ].filter(Boolean);

  /* ★ **채운 것이 되돌아갈 수 있다는 말**(A-8c). 41/41을 채운 판이 금고 0이 되자
     압류가 돌아 39/41 · 3/4 → 2/4로 내려갔는데, 그때까지 화면 어디에도 그 가능성이 없었다.
     사건이 난 뒤에는 `state.js: hegemonyLoss`가 항해일지에 적는다 — 여기는 **나기 전**이다. */
  if (h.ports.have > 0) {
    const risk = Object.keys(state.holdings ?? {})
      .filter((cid) => regionOf(cid) === rid && holdingIdle(cid)).length;
    rows.push(el('div.ctr-sub', {
      style: { marginTop: '4px', color: risk ? '#d05a4a' : '#8f8878' },
      html: risk
        ? `⚠ 유지비를 못 채워 <b>문을 닫은 거점이 ${risk}곳</b>이다 — 한 번 더 밀리면 넘어가고,`
          + ` 여기 채운 <b>${h.ports.have}/${h.ports.need}</b>${josa(h.ports.need, '이/가')} 그만큼 되돌아간다.`
        : `거점은 서른 날마다 유지비를 문다. 두 번 못 내면 압류라, 금고가 마르면`
          + ` 여기 채운 <b>${h.ports.have}/${h.ports.need}</b>${josa(h.ports.need, '이/가')} 되돌아간다.`,
    }));
  }

  /* ── 아홉 바다 요약 — 접어 둔다 ─────────────────────────── */
  rows.push(el('details', { style: { marginTop: '6px' } }, [
    el('summary', {
      style: { cursor: 'pointer', fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
      text: `아홉 바다 ${all.have}/${all.need}`,
    }),
    el('div', { style: { marginTop: '4px' } }, all.seas.map((s) => el('div.ctr-sub', {
      style: s.done ? { color: '#8fbf8a' } : null,
      text: `${mark(s.done)} ${s.name} ${s.done ? '— 패자다' : `${s.steps}/4 · 항구 ${s.ports.have}/${s.ports.need}`}`,
    }))),
  ]));

  /* ── 명부 줄 ──────────────────────────────────────────────
     ★ **장식이다. 패권 조건이 아니다.** 조건 넷(`data.js: HEGEMONY`)은 손으로 실클릭까지
       끝난 값이라 다섯째를 얹으면 이미 달성한 판이 통째로 무효가 된다(SPEC-supremacy §1-3 (a)).
       그래서 ✓/· 를 안 붙이고 회색으로만 적는다 — 세어 볼 수는 있되 관문은 아니다.
     ★ 「다 무찌른다」의 눈금은 이름난 자(`PIRATES` 명부)뿐이다. 정원 13척은 그대로라
       명부를 다 닫아도 이 바다가 안전해지지는 않는다 — 이름과 현상금만 사라진다. */
  const ros = rosterOf(rid);
  const seas = rosterOf();               // 아홉 바다 전부(40명)
  if (ros.need) {
    rows.push(el('div.ctr-sub', {
      style: { marginTop: '6px', opacity: 0.75, color: ros.done ? '#8fbf8a' : null },
      text: `명부 ${ros.have}/${ros.need}`
          + (ros.done ? ' — 이 바다의 이름은 다 지워졌다'
                      : ` — 아직: ${ros.open.map((x) => x.name).join(' · ')}`)
          + ` (아홉 바다 ${seas.have}/${seas.need}`
          + (seas.done ? ' — 명부가 비었다' : '') + ')',
    }));

    /* ── 찾아갈 수 있게 한다 (SPEC-supremacy §1-3 (b)·(c)) ──────────────
       ★ 실플레이 **984 게임일에 명부 조우 0회**였다(ISSUES #12). 조우는 나는데 이름 있는 자가
         안 왔다 — 그러면 명부 40은 목표가 아니라 복권이다. 두 문을 여기 둔다:
           **소식**(`bounty-tip`) 그자의 사냥터로 나가면 그자가 온다 · **초무** 소굴에서 값을 치른다.
       ★ 해적을 약하게 만들지 않는다 — 강한 채로 **고를 수 있게** 하는 것이다.
       ★ 자리를 새 카드로 빼지 않은 이유: 사이드패널은 이미 카드 열둘이라 열셋째가 넘으면
         출항 단추가 화면 밖으로 밀린다(947행 주석의 사고). 그래서 **명부 줄에 두 줄만** 얹는다. */
    /* ★ **초무는 지우는 것이 아니라 내 편으로 만드는 것이다**(P6-4) — 그 효과를 화면이 말해야
       24,000닢이 선택이 된다. 안 적으면 값만 나가고 아무 일도 안 난 것으로 보인다. */
    const tamedN = tamedIn(rid);
    if (tamedN) {
      rows.push(el('div.ctr-sub', { style: { color: '#8fbf8a' },
        text: `   초무 ${tamedN}명 — 과소기로 이 바다 조우 −${Math.round(passOff(rid) * 100)}%`
            + ` · 남은 명부의 소식값 −${Math.round(tipOff(rid) * 100)}%`
            + (regionHasHolding(rid) ? '' : ` (이 바다에 거점이 없으면 ${ROSTER.tameGraceDays}일 뒤 식는다)`) }));
    }
    const chase = activeBounty();
    const chased = chase ? rosterOpenIn(rid).find((d) => d.id === chase.id) : null;
    if (chased) {
      /* ★ **사냥터를 이름으로 적어 준다**(P6-1·P6-5). `huntedOnLeg`는 `riskKey`가 `def.hunt`와
         **정확히 일치**해야 열리므로, 어느 구간인지를 화면이 말해 주지 않으면 그 규칙은 없는 것과 같다.
         그리고 그 구간은 **무역으로도 흑자**다(명부 40명 전수 적자 0) — 빈 배로 돌 이유가 없다. */
      const legs = huntLegs(chased);
      rows.push(el('div.ctr-sub', { style: { color: '#c9b98a' },
        text: `   쫓는 중 — ${chased.name} · ${CITY_BY_ID[chased.base]?.name ?? chased.base} 언저리`
            + ` (${chase.until - state.day}일 남음)`
            + (legs.length ? ` · 사냥터 ${legs.map(([a, b]) => `${CITY_BY_ID[a].name}↔${CITY_BY_ID[b].name}`).join(' · ')}` : '') }));
      rows.push(el('div.ctr-sub', { style: { opacity: 0.75 },
        text: '   그 구간을 **짐을 싣고** 도는 것이 순찰이다 — 값나가는 짐일수록 그자가 붙는다.' }));
    }
    const opens = rosterOpenIn(rid);
    const den = opens.filter((d) => d.base === city.id);
    if (!chased) {
      for (const d of [...opens].sort((a, b) => bountyTipPrice(a) - bountyTipPrice(b)).slice(0, 2)) {
        rows.push(svcRow(`${d.name}의 소식 — ${bountyTipPrice(d).toLocaleString('ko-KR')}닢`,
          `어느 구간을 도는지 산다. ${ROSTER.tipDays}일 안에 그리로 나가면 만난다`
          + (d.bounty ? ` (현상금 ${d.bounty[0].toLocaleString('ko-KR')}~${d.bounty[1].toLocaleString('ko-KR')}닢).` : '.'),
          '산다', bountyTipPrice(d) > state.gold, () => {
            const r = buyBountyTip(d);
            if (!r.ok) return toast(r.reason, 'bad');
            toast(r.line, 'warn');
            refreshHUD(); refreshLog(); after();
          }));
      }
    }
    for (const d of den) {
      rows.push(svcRow(`${d.name}을 초무한다 — ${tamePrice(d).toLocaleString('ko-KR')}닢`,
        '여기가 그자의 소굴이다. 값을 치르면 **그가 내 편이 된다** — 사라지는 것이 아니라'
        + ` 이 바다에서 일한다(조우 −${Math.round(ROSTER.passOddsOff * 100)}% · 남은 명부의 소식값 −${Math.round(ROSTER.tipOffPer * 100)}%).`,
        '값을 친다', tamePrice(d) > state.gold, () => {
          const r = tamePirate(d, city.id);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${d.name}${josa(d.name, '을/를')} 초무했다`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
  }

  /* ── 한반도 줄 ────────────────────────────────────────────
     ★ 조선 아홉 항구는 **부두가 없는 곳이 둘**(마포·의주 `industry 0`)이다.
       "숨겨진 항구를 연다"는 지도에 포구를 더하는 것이 아니라 그 둘에 부두를 내는 것이다. */
  const hiddenDone = home.hidden.filter((x) => x.done).length;
  rows.push(el('div.ctr-sub', {
    style: { marginTop: '6px', color: home.done ? '#8fbf8a' : '#c9b98a' },
    text: `${mark(home.done)} 조선 ${home.ports}항구 — 거점 ${home.holdings.have}/${home.holdings.need}`
        + ` · 나라 조선소 ${home.docks.have}/${home.docks.need}`
        + ` · 공업력 ${home.yards.map((y) => `${y.name} ${y.now}/${y.need}`).join(' · ')}`,
  }));
  rows.push(el('div.ctr-sub', {
    style: { opacity: 0.75 },
    text: `   숨은 항구 ${hiddenDone}/${home.hidden.length} — `
        + home.hidden.map((x) => `${x.name} ${x.done ? '열렸다' : '부두 없음'}`).join(' · ')
        + ' (그 항구에 세를 내면 관아가 조선소를 놓는다)',
  }));

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: h.done ? `패자 — ${h.name}` : `패권 — ${h.name}` }),
      el('span', {
        text: h.done ? `아홉 바다 ${all.have}/${all.need}` : `${h.steps}/4`,
        style: { fontSize: '11px', color: h.done ? '#8fbf8a' : '#8f8878', letterSpacing: 0 },
      }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

/* ── 세력 (SPEC-factions 1단계) ────────────────────────────────
   ★ **세 줄만 쓴다.** 사이드패널은 이미 카드 열둘을 쌓고 있고, 열셋째가 넘으면 출항 단추가
     화면 밖으로 밀린다(947행 주석의 사고 — 시흐르에서 y가 941px였다). 그래서 이 카드는
     **이 항구의 임자 한 줄 · 그와의 사이 한 줄 · 단추 하나**이고, 열 세력 전부는 모달이 편다.
   ★ 임자가 없는 항구(조선 아홉 항구가 그렇다)에서는 **카드 자체를 안 띄운다** —
     빈 패널은 벽지다(`fleetCard()`와 같은 규약).
   ★ 자리는 패권 카드 **아래**, 정박 카드 **위**다. 「이 항구가 누구 것인가」가
     「여기서 무엇을 할까」보다 먼저다. */
function factionCard() {
  const fid = factionOfCity(city.id);
  if (!fid) return null;
  const f = FACTIONS[fid];
  const v = regardOf(fid);
  const band = regardBand(fid);
  const inf = infamyWeight(fid);
  const how = factionsOfCity(city.id).find((x) => x.id === fid)?.how;
  const HOW = { seat: '앉은 자리', grip: '쥔 산지', flag: '이 깃발의 항구' };

  /* 무는 것은 **규칙에 실제로 걸린 것만** 적는다. 화면이 없는 규칙을 말하면
     플레이어는 자기가 무엇을 물고 있는지 영영 못 읽는다. */
  const bite = [];
  if (v <= REGARD.contractAt) bite.push('상관 게시판이 빈다');
  const sold = { paper: '종이', order: '순서', toll: '조약문' }[f.sells];
  if (v <= REGARD.refuseAt && sold) bite.push(`${sold}${josa(sold, '을/를')} 안 판다`);

  const cells = '▓'.repeat(Math.abs(v)) + '░'.repeat(REGARD.cap - Math.abs(v));
  const tone = v < 0 ? '#a8563f' : v > 0 ? '#5f86a8' : '#8f8878';

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '세력' }),
      el('span', { text: `${f.short} · ${band.name}`,
                   style: { fontSize: '11px', color: tone, letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, [
      el('div.ctr-sub', { text: `이 항구의 임자 — ${f.name} (${city.name} · ${HOW[how] ?? ''})` }),
      el('div.ctr-sub', {
        style: { color: tone },
        text: `${v > 0 ? '+' : ''}${v} ${cells}`
            + (inf ? ` · 그중 악명 ${inf}` : '')
            + (bite.length ? ` · ${bite.join(' · ')}` : ''),
      }),
      /* ── 2단계 · 쥔 자리에서 무는 것과, 살 수 있는 자격 ─────────────── */
      (() => {
        /* **웃돈은 이 항구에서 실제로 무는 것만** 적는다 — 규칙이 있어도 화면이 침묵하면
           플레이어는 왜 여기가 비싼지 영영 못 읽는다. */
        const bites = (f.grip.goods ?? [])
          .map((g) => ({ g, up: gripMarkup(g, city.id) }))
          .filter((x) => x.up > 0);
        return bites.length ? el('div.ctr-sub', { style: { color: '#c98a6a' },
          html: `쥔 자리라 웃돈이 붙는다 — `
              + bites.map((x) => `${GOOD_BY_ID[x.g].name} +${Math.round(x.up * 100)}%`).join(' · ')
              + `<br><span style="opacity:.8">밖의 항구에서는 안 붙는다. 딴 데서 사면 된다 — 대신 항로가 길어진다.</span>`,
        }) : null;
      })(),
      (() => {
        const o = enrollOffer(city.id);
        if (!o) return null;
        if (o.until > state.day) {
          return el('div.ctr-sub', { style: { color: '#8fbf8a' },
            text: `${o.name} 명부에 올라 있다 — ${o.until - state.day}일 남았다 (세는 안 깎인다)` });
        }
        return svcRow(`${o.name}의 명부에 이름을 올린다 — ${o.price.toLocaleString('ko-KR')}닢`,
          o.blocked ? o.blocked
                    : `${o.days}일 · 관계 +${FACTION.enrollRegard}. ★ 세를 깎아 주지는 않는다 — 이름이 오를 뿐이다`,
          o.blocked ? '거절당했다' : '올린다', !!o.blocked || o.price > state.gold, () => {
            const r = buyEnroll(city.id);
            if (!r.ok) return toast(r.reason, 'bad');
            toast(`${o.name} 명부에 올랐다`, 'good');
            refreshHUD(); refreshLog(); after();
          });
      })(),
      (() => {
        /* 정기선단 달력 — **한편이면 그냥 보인다.** 값은 안 바뀌고 아는 것만 는다. */
        const c = convoyDue(fid);
        if (!c || regardOf(fid) < 6) return null;
        return el('div.ctr-sub', { style: { color: '#8f8878' },
          text: `정기선단 — ${c.inDays}일 뒤 ${c.to.map((x) => CITY_BY_ID[x]?.name ?? x).join('·')}에`
              + ` ${c.goods.map((g) => GOOD_BY_ID[g].name).join('·')}가 든다 (${c.every}일마다)` });
      })(),
      el('button.btn.sm.dark', { text: '관계도를 편다  (F)', onclick: () => openFactions(city.id) }),
    ].filter(Boolean)),
  ]);
}

/* ── 정박 (A-1b) ───────────────────────────────────────────────
   ★ **정박 중인 날이 공짜였다.** 날은 항해할 때만 갔으므로 항구에 서 있는 동안은
   급여도 보급도 유지비도 나가지 않았다 — 소설의 *"아덴 억류·반다 반년·아바나 한 해 대기"*가
   게임에서는 **아무 대가가 없는 일**이었다. 기다리는 것이 값을 가져야 "언제 떠나나"가 판단이 된다. */
function waitCard() {
  const ashore = state.holdings?.[city.id]?.ashore ?? 0;
  const c3 = portDayCost(3), c10 = portDayCost(10);
  const rows = [
    svcRow(`사흘 머문다 (−${c3.now.toLocaleString('ko-KR')}닢 · 삯 ${(c3.wages + c3.officer).toLocaleString('ko-KR')} 쌓임)`,
      '시세가 회복하고 매물과 일감이 갈린다', '기다린다', false, () => {
        const r = waitDays(3);
        toast(`사흘이 지났다 — ${state.day}일차`, 'warn');
        refreshHUD(); refreshLog(); after();
        void r;
      }),
    svcRow(`열흘 머문다 (−${c10.now.toLocaleString('ko-KR')}닢 · 삯 ${(c10.wages + c10.officer).toLocaleString('ko-KR')} 쌓임)`,
      '계절이 바뀌기를, 함대가 오기를 기다린다', '기다린다', false, () => {
        waitDays(10);
        toast(`열흘이 지났다 — ${state.day}일차`, 'warn');
        refreshHUD(); refreshLog(); after();
      }),
  ];
  /* 사람을 내려놓는 선택지는 **창고가 있어야** 생긴다(A-1과 짝) — 재우고 먹일 데가 있어야 하니까. */
  if (storeCap(city.id) > 0 || ashore > 0) {
    if (state.crew > 0) {
      rows.push(svcRow(`선원 ${state.crew}명을 내려놓는다`, '삯이 멎는다. 배는 뜨지 못한다', '내린다', false, () => {
        const r = dischargeCrew();
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${r.n}명을 내려놓았다`, 'warn');
        refreshHUD(); refreshLog(); after();
      }));
    }
    if (ashore > 0) {
      const cost = Math.round(55 * 0.5 * Math.min(ashore, state.crewMax - state.crew));
      rows.push(svcRow(`뭍에 ${ashore}명이 있다`, `다시 태우는 값은 새로 뽑는 값의 절반 (−${cost.toLocaleString('ko-KR')}닢)`,
        '태운다', false, () => {
          const r = recallCrew();
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${r.n}명을 다시 태웠다`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
  }
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '정박' }),
      el('span', { text: `${state.day}일차`, style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

/* ── 거점 (A-1) ────────────────────────────────────────────────
   ★ **후반에 금화가 갈 곳**이자 *"짐을 쪼갠다"*를 처음 전략으로 만드는 자리다 —
   창고에 둔 짐은 시장을 누르지 않는다(`state.js: storeGoods`). 값과 효과는 `data.js: HOLDINGS`. */
/* ── 나라가 짓는 조선소 (C-18 · 2026-08-28) ─────────────────────
   ★ **이 카드가 이 회차에서 가장 중요한 자리다.** 규칙은 「그 항구에 낸 세가 쌓이면 나라가
     조선소를 놓는다」인데, 화면이 그것을 말하지 않으면 플레이어에게는 *아무 일도 안 일어난다.*
     이 저장소가 한 회차에 다섯 번 잃은 자리가 그것이다.
   ★ 값은 **`state.js: civicProgress` 한 곳**에서 온다 — 조선소 화면과 같은 수를 쓴다.
     두 화면이 각자 계산하면 반드시 어긋난다. */
/** 깃발 이름 — 없으면 깃발 코드를 그대로 쓴다(콘텐츠가 앞서 가도 화면이 안 깨지게) */
const flagName = (f) => FLAG_NAME[f] ?? f ?? '이 나라';

function civicCard() {
  const p = civicProgress(city.id);
  const flag = city.flag;
  const rows = [];

  // ① 공사 중 — 언제 끝나고, 그동안 무엇을 못 하나
  if (p.building) {
    rows.push(el('div.ctr-line', { style: { color: '#c9b98a' },
      html: `<b>관아가 조선소를 놓고 있다</b> — 공업력 ${p.building.to}까지 `
          + `<b>${p.building.left}일</b> 남았다`,
    }));
    rows.push(el('div.ctr-sub', { style: { color: '#c98a6a' },
      text: '공사가 끝날 때까지 이 항구에서는 배를 못 짓고 중고 매물도 안 걸린다.' }));
  } else if (p.capped) {
    // ② 나라 몫이 꼭대기 — 그 뒤는 **내 돈**뿐이라는 것을 말한다
    rows.push(el('div.ctr-line', {
      html: `<b>이 항구의 관영 조선소는 꼭대기다</b> (공업력 ${industryOf(city.id)} · 나라 몫 상한 ${p.cap})`,
    }));
    rows.push(el('div.ctr-sub', { style: { opacity: 0.8 },
      text: '여기서 더 올리려면 조선소에서 내 돈과 자재로 승급해야 한다.' }));
  } else {
    // ③ 진척 — **낸 세 N닢 · 다음 조선소까지 M닢**
    const pct = Math.min(100, Math.round((p.paid / Math.max(1, p.need)) * 100));
    rows.push(el('div.ctr-line', {
      html: `<b>이 항구에 쌓인 세 ${Math.round(p.paid).toLocaleString('ko-KR')}닢</b>`
          + ` <span style="opacity:.7">/ ${p.need.toLocaleString('ko-KR')}닢 (${pct}%)</span>`,
    }));
    rows.push(el('div.ctr-sub', {
      style: { color: p.ready ? '#8fbf8a' : '#c9b98a' },
      text: p.ready
        ? `문턱을 넘었다 — 곧 관아가 공사를 시작한다 (${p.days}일).`
        : `다음 조선소까지 ${Math.round(p.left).toLocaleString('ko-KR')}닢 — `
          + `여기서 사고팔면 그만큼 세를 내고, 그것이 쌓이면 관아가 부두를 놓는다 (공사 ${p.days}일).`,
    }));
    /* ★ **낸 것과 쌓인 것이 다르다**(2026-08-28 「국가를 거쳐 항구로」). 화면이 그 말을 안 하면
       플레이어는 *"만 닢을 냈는데 왜 육천만 올랐지"*를 버그로 읽는다 — 규칙이 멀쩡한데
       화면이 말하지 않아 잃는 그 자리다. 그래서 **몫과 이유를 함께** 적는다. */
    const cut = Math.round(civicCutOf(city.id) * 100);
    rows.push(el('div.ctr-sub', { style: { opacity: 0.8 },
      text: `여기 내는 세의 ${cut}%가 이 항구 몫이다 — 나머지는 나라를 거쳐 `
          + `${flagName(flag)} 다른 항구로 흘러간다(주항구가 먼저).`,
    }));
    rows.push(el('div.ctr-sub', { style: { opacity: 0.75 },
      text: `공업력 ${industryOf(city.id)} → ${p.now + 1}`
          + ` (도시 ${p.base} + 나라 ${p.civic}`
          + `${industryOf(city.id) - p.now ? ` + 내 승급 ${industryOf(city.id) - p.now}` : ''})`
          + ` · 이 나라 전체 ${Math.round(duesOfFlag(flag)).toLocaleString('ko-KR')}닢`,
    }));
  }

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '관영 조선소' }),
      el('span', { text: `공업력 ${industryOf(city.id)}`,
                   style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

function holdingCard() {
  /* ★ 목록은 **소유**(`ownsHolding`)로 센다. `hasHolding`은 특전용이라 유지비가 밀려
     문을 닫은 동안 false가 되는데, 그것으로 세면 있는 거점이 화면에서 사라지고
     "세운다" 단추가 다시 떠서 같은 거점을 두 번 사게 된다. */
  const idle = holdingIdle(city.id);
  const mine = HOLDING_KEYS.filter((k) => ownsHolding(k, city.id));
  const next = HOLDING_KEYS.filter((k) => !ownsHolding(k, city.id));
  const cap = storeCap(city.id);
  const used = storedUsed(city.id);
  const stored = state.stored?.[city.id] ?? {};

  const rows = [];
  if (mine.length) {
    rows.push(el('div.ctr-line', {
      html: `<b>${mine.map((k) => HOLDINGS[k].name).join(' · ')}</b>`
          + (cap ? ` <span style="opacity:.7">창고 ${used}/${cap}칸</span>` : ''),
    }));
    const due = holdingUpkeepDue(city.id);
    if (idle) {
      rows.push(el('div.ctr-sub', { style: { color: '#d05a4a' },
        text: '유지비가 밀려 **문을 닫았다** — 특전이 멈췄고, 한 번 더 밀리면 넘어간다' }));
    }
    /* ★ **밀린 것을 그 자리에서 낼 단추가 없었다.** 규칙은 *"밀린 것을 내면 그 자리에서 다시 연다"*인데
       화면에 낼 방법이 없어, 금고가 7,105닢인데도 나갔다 와야(6일) 문이 열렸다(supremacy ISSUES #22).
       「한 번 더 밀리면 압류」이므로 **항로가 긴 자리에서는 돈이 있어도 넘어간다** — 막으려던 바로 그 사고다.
       ★ 액수가 청구 때 3닢, 문 닫은 뒤 1닢인 것은 어긋난 것이 아니라 **`HOLDING.idleRate`(절반)**다
         (ISSUES #23 — 확인 결과 설계대로다). 그래서 문구에 그 이유를 적어 둔다. */
    if (due > 0) {
      rows.push(svcRow(`밀린 유지비 ${due.toLocaleString('ko-KR')}닢`,
        (idle ? `문을 닫은 동안이라 절반만 문다(${Math.round(HOLDING.idleRate * 100)}%). 내면 그 자리에서 다시 연다.`
              : '못 내면 문을 닫는다 — 특전이 멈추고, 한 번 더 밀리면 넘어간다.'),
        '낸다', due > state.gold, () => {
          const r = settleHolding(city.id);
          if (!r) return toast('밀린 것이 없다', 'warn');
          toast(r.seized ? '거점을 빼앗겼다' : r.idle ? '아직 모자란다' : '유지비를 냈다',
                r.seized || r.idle ? 'bad' : 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
    /* ★ **되팔 수 있다 — 헐값에.** 금고가 0이면 자산을 갖고도 굶는 자리가 있었다(ISSUES #3).
       값이 들인 돈의 40%뿐이라 이득이 될 수 없고, 그래서 저금통이 아니라 탈출구다.
       패권 집계에서 그 항구가 빠진다는 것을 **누르기 전에** 적어 준다 — 값을 숨기면 선택이 아니라 도박이다. */
    rows.push(svcRow(`거점을 넘긴다 — +${holdingsValue(city.id).toLocaleString('ko-KR')}닢`,
      `들인 돈의 ${Math.round(HOLDING.sellBack * 100)}%만 돌아온다. 창고에 둔 짐도 함께 넘어가고, 이 항구가 패권 집계에서 빠진다.`,
      '넘긴다', false, () => {
        const r = sellHolding(city.id);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`거점을 넘겼다 · +${r.back.toLocaleString('ko-KR')}닢`, 'warn');
        refreshHUD(); refreshLog(); after();
      }));
  }

  /* 창고에 맡기고 찾는다 — 시장 행마다 단추를 다는 대신 **한 칸씩** 옮긴다.
     "무엇을 얼마나"까지 고르게 하려면 화면이 커지는데, 이 게임의 사이드패널은 이미 길다. */
  if (cap > 0) {
    const held = Object.entries(state.cargo).filter(([, n]) => n > 0);
    for (const [gid, n] of held.slice(0, 4)) {
      rows.push(svcRow(`${GOOD_BY_ID[gid].name} ${n}개`, '배에 실려 있다', '맡긴다',
        used >= cap, () => {
          const r = storeGoods(gid, n, city.id);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${GOOD_BY_ID[gid].name} ${r.n}개를 창고에 넣었다`, 'good');
          after();
        }));
    }
    for (const [gid, n] of Object.entries(stored).slice(0, 4)) {
      rows.push(svcRow(`${GOOD_BY_ID[gid].name} ${n}개`, '창고에 있다 — 시장을 누르지 않는다', '찾는다',
        cargoFree() <= 0, () => {
          const r = takeGoods(gid, n, city.id);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${GOOD_BY_ID[gid].name} ${r.n}개를 실었다`, 'good');
          after();
        }));
    }
  }

  /* ── 수익형 부동산 (#5) ──────────────────────────────────────
     ★ **규칙이 멀쩡해도 화면이 말하지 않으면 없는 것이다.** 공실은 이 설계의 심장인데
       확률이 안 보이면 "고급이 좋은 것"으로만 읽혀 도박이 성립하지 않는다.
       그래서 한 줄에 **등급 · 만실 세 · 빈방 확률**을 다 적는다. */
  for (const k of ESTATE_KEYS) {
    const grade = estateGrade(k, city.id);
    if (!grade) continue;
    const h = HOLDINGS[k];
    const gd = estateDef(k, grade);
    const rent = estateRent(k, city.id, grade);
    const vac = Math.round(vacancyOdds(k, city.id) * 100);
    rows.push(el('div.ctr-sub', {
      html: `<b>${gd.name}</b>(${h.name} ${grade}급) — 만실이면 30일에 <b>${rent.toLocaleString('ko-KR')}닢</b>`
          + ` · 빈방 <b style="color:${vac >= 35 ? '#d05a4a' : vac >= 20 ? '#c98a6a' : '#8fbf8a'}">${vac}%</b>`
          + (idle ? ' <span style="color:#d05a4a">(문을 닫아 한 닢도 안 들어온다)</span>' : ''),
    }));
    const up = canUpgradeEstate(k, city.id);
    const top = grade >= h.grades.length;
    if (!top) {
      const nx = h.grades[grade];
      const nxRent = estateRent(k, city.id, grade + 1);
      // 공실 공식은 `state.js: vacancyOdds` 하나뿐이다 — 화면이 제 계산을 따로 하면 반드시 어긋난다
      const nxVac = Math.round(vacancyOdds(k, city.id, grade + 1) * 100);
      rows.push(svcRow(`${nx.name}(으)로 올린다 — ${estateUpgradeCost(k, city.id).toLocaleString('ko-KR')}닢`,
        `만실 ${nxRent.toLocaleString('ko-KR')}닢 · 빈방 ${nxVac}% · 공업력 ${nx.industry} 필요`,
        up.ok ? '올린다' : (up.reason.length > 10 ? '못 올린다' : up.reason),
        !up.ok, () => {
          const r = upgradeEstate(k, city.id);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${h.name}${josa(h.name, '을/를')} 올렸다`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
  }

  for (const k of next) {
    const h = HOLDINGS[k];
    const can = canBuyHolding(k, city.id);
    const price = holdingPrice(k, city.id);
    /* 부동산은 **살 때부터** 벌이와 위험을 함께 보여 준다 — 값만 적으면 "그래서 얼마 버나"를
       사고 나서야 알게 되고, 그러면 고급이 도박이라는 것도 살 때는 안 보인다. */
    const est = h.grades
      ? `${h.desc} 30일에 ${estateRent(k, city.id, 1).toLocaleString('ko-KR')}닢 · `
        + `빈방 ${Math.round(vacancyOdds(k, city.id, 1) * 100)}% · 유지비는 그래도 나간다`
      : h.desc;
    rows.push(svcRow(`${h.name}${h.grades ? `(${h.grades[0].name})` : ''} — ${price.toLocaleString('ko-KR')}닢`, est,
      can.ok ? '세운다' : (can.reason.length > 10 ? '못 세운다' : can.reason),
      !can.ok, () => {
        const r = buyHolding(k, city.id);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${h.name}${josa(h.name, '을/를')} 세웠다`, 'good');
        refreshHUD(); refreshLog(); after();
      }));
    /* ★ C-18(2026-08-28) — 여기 있던 「부두 먼저 vs 승급 먼저」 안내는 사라졌다.
       **부두를 살 수 없게 됐으므로** 그 갈림길 자체가 없다. 두 길의 값은 `civicCard`와
       조선소 화면이 함께 말하고, 계산은 여전히 `state.js: industryPathHint` 한 곳이다. */
  }
  if (!rows.length) return null;

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '거점' }),
      el('span', {
        text: mine.length ? `${mine.length}개 · 연 6%` : '금화가 갈 곳',
        style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
      }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

/* ── 가공장 (A-9 1단계) ────────────────────────────────────────
   ★ 「거점」 카드 **바로 아래**에 둔다 — 창고가 있어야 가공장이 서고, 투입도 산출도
     그 창고를 지나기 때문이다. 「정박」 카드와도 이웃이라 *"기다리면 가공이 끝난다"*가
     한 화면에 보인다(기다리는 것이 공짜가 아니라는 것도 그 카드가 같이 말한다).

   ★ **새 수입원이 아니다.** 원료를 시세로 사서 가공하면 그 완제품을 산지에서 사는 것보다
     손해다(`data.js: WORK` 머리주석의 가공마진 밴드). 이 카드가 파는 것은 이문이 아니라
     *"어디까지 가공해서 팔 것인가"*라는 판단이다. */
/* ── 3단계 · 유통 — 위탁과 정기선 (SPEC-vertical §3) ───────────────────────
   ★ **경계 하나가 이 카드의 전부다 — 짐을 옮기기만 하고 사고팔지 않는다.**
     자동으로 시세를 보고 사고파는 창구를 만들면 최적 플레이가 *"항로를 걸어 놓고
     지켜본다"*가 되고, 그 순간 이 게임의 몸통이 사라진다. 그래서 이 카드에는
     「어디로 옮기나」만 있고 「얼마에 파나」는 없다. */
function lineCard() {
  const myPorts = CITIES.filter((c) => c.id !== city.id
    && (hasHolding('warehouse', c.id) || hasHolding('factory', c.id)));
  const here = hasHolding('warehouse', city.id) || hasHolding('factory', city.id);
  const lines = lineList();
  const open = (state.consign ?? []);
  if (!here && !lines.length && !open.length) return null;

  const rows = [];

  /* ── 띄워 둔 위탁 ─────────────────────────────────────────── */
  for (const c of open) {
    const left = c.arrive - state.day;
    rows.push(el('div.ctr-sub', {
      html: `<b>${GOOD_BY_ID[c.good].name} ${c.n}칸</b> — ${CITY_BY_ID[c.from].name} → `
          + `${CITY_BY_ID[c.to].name} · ${left > 0 ? `${left}일 남았다` : '도착했다 — 가서 받는다'}`
          + (c.insured ? ' · 보험' : ''),
    }));
  }

  /* ── 위탁 보내기 — 이 항구 창고의 짐을 내 다른 창고로 ─────────── */
  if (here) {
    const stored = Object.entries(state.stored?.[city.id] ?? {}).filter(([, n]) => n > 0);
    for (const [gid, n] of stored.slice(0, 3)) {
      /* 가장 가까운 내 창고 항구를 기본값으로 준다 — 목적지를 고르는 화면을 새로 열지 않는다.
         (사이드패널이 이미 길다. 고를 것이 늘면 그때 모달로 뺀다.) */
      const dest = myPorts
        .map((c) => ({ c, d: voyageDays(city.id, c.id) }))
        .sort((a, b) => a.d - b.d)[0];
      if (!dest) break;
      const f = consignFee(gid, Math.min(n, CONSIGN.capPer), city.id, dest.c.id, false);
      const can = canConsign(gid, n, dest.c.id, city.id, false);
      rows.push(svcRow(
        `${GOOD_BY_ID[gid].name} ${Math.min(n, CONSIGN.capPer)}칸 → ${dest.c.name}`,
        `남의 배에 실어 보낸다 — 수수료 ${f.fee.toLocaleString('ko-KR')}닢`
        + `(${Math.round(f.rate * 100)}%) · 짐만 잃을 수 있다 · 한 건에 ${CONSIGN.capPer}칸까지`,
        can.ok ? '위탁' : (can.reason.length > 10 ? '못 보낸다' : can.reason), !can.ok, () => {
          const r = sendConsign(gid, n, dest.c.id, city.id, false);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${GOOD_BY_ID[gid].name} ${r.n}칸 위탁 — ${r.days}일`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
  }

  /* ── 정기선 ─────────────────────────────────────────────────
     ★ **값은 돈이 아니라 선단이다** — 묶은 배는 동행에서 빠져 화물칸·포·피해 분산을 잃는다. */
  for (const [key, l] of lines) {
    const nm = SHIPS[key]?.name ?? key;
    const at = l.leg === 'ab' ? l.a : l.b;
    rows.push(svcRow(`정기선 ${nm}`,
      `${CITY_BY_ID[l.a].name} ↔ ${CITY_BY_ID[l.b].name} · ${l.goods.map((g) => GOOD_BY_ID[g].name).join('·')}`
      + ` · 다음 다리 ${Math.max(0, l.next - state.day)}일 · 지금 ${CITY_BY_ID[at].name} 쪽`,
      '푼다', false, () => {
        const r = stopLine(key);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${nm} 정기선을 풀었다`, 'warn');
        refreshHUD(); refreshLog(); after();
      }));
  }
  if (here && lines.length < LINE.max) {
    const free = Object.keys(state.consorts ?? {});
    const dest = myPorts
      .map((c) => ({ c, d: voyageDays(city.id, c.id) }))
      .sort((a, b) => a.d - b.d)[0];
    const goods = Object.keys(state.stored?.[city.id] ?? {}).slice(0, LINE.goodsMax);
    const key = free[0] ?? null;
    const can = key && dest
      ? canStartLine(key, city.id, dest.c.id, goods)
      : { ok: false, reason: free.length ? '보낼 창고가 없다' : '동행선이 없다' };
    rows.push(svcRow(
      key && dest ? `${SHIPS[key].name}을(를) ${dest.c.name} 정기선으로` : '정기선을 묶는다',
      key && dest
        ? `왕복 ${voyageDays(city.id, dest.c.id) * 2 + LINE.turnPad}일 · 적재 `
          + `${Math.floor((SHIPS[key].cargo ?? 0) * LINE.holdRate)}칸 · 나를 것 `
          + (goods.length ? goods.map((g) => GOOD_BY_ID[g].name).join('·') : '창고가 비었다')
          + ` — ★ 묶으면 동행에서 빠진다(화물칸·포·피해 분산을 잃는다)`
        : (can.reason ?? '동행선과 창고 둘이 있어야 한다'),
      can.ok ? '묶는다' : '못 묶는다', !can.ok, () => {
        const r = startLine(key, city.id, dest.c.id, goods);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`정기선 — 왕복 ${r.turn}일`, 'good');
        refreshHUD(); refreshLog(); after();
      }));
  }

  if (!rows.length) return null;
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '유통' }),
      el('span', { text: `위탁 ${open.length}/${CONSIGN.maxOpen} · 정기선 ${lines.length}/${LINE.max}`,
                   style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

function worksCard() {
  const recipes = millRecipes(city.id);
  const mine = workList(city.id);
  const grows = growCandidates(city.id);
  if (!recipes.length && !mine.length && !grows.length) return null;

  const rows = [];
  const due = worksUpkeepDue(city.id);
  if (due > 0) {
    rows.push(el('div.ctr-sub', { style: { color: '#c98a6a' },
      text: `유지비 ${due.toLocaleString('ko-KR')}닢이 밀려 있다 — 못 내면 휴업, 두 번이면 빼앗긴다` }));
  }

  for (const r of recipes) {
    const w = millOf(r.id, city.id);
    const inTxt = Object.entries(r.in).map(([g, n]) => `${GOOD_BY_ID[g].name} ${n}`).join(' + ');
    const outTxt = Object.entries(r.out).map(([g, n]) => `${GOOD_BY_ID[g].name} ${n}`).join(' + ');

    if (!w) {
      const can = canBuyMill(r.id, city.id);
      const price = millPrice(r.id, city.id, 1);
      rows.push(svcRow(`${r.work} — ${price.toLocaleString('ko-KR')}닢`,
        `${inTxt} → ${outTxt} · 공업력 ${r.req} 필요 · 유지비 연 ${Math.round(WORK.upkeepRate * 100)}%`,
        can.ok ? '세운다' : (can.reason.length > 10 ? '못 세운다' : can.reason),
        !can.ok, () => {
          const res = buyMill(r.id, city.id);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${r.work}${josa(r.work, '을/를')} 세웠다`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
      continue;
    }

    /* ── 가진 가공장 ─────────────────────────────────────────── */
    const label = `${r.work} ${w.level}등급` + (w.idle ? ' · 휴업' : '');
    if (w.job) {
      const left = w.job.until - state.day;
      if (left > 0) {
        rows.push(svcRow(label, `${r.name} 진행 중 — ${left}일 남았다`, '기다린다', true, () => {}));
      } else {
        rows.push(svcRow(label, `${outTxt.replace(/\d+$/, '')} ${chainOutUnits(r) * w.job.batches}칸이 다 됐다`,
          '받는다', false, () => {
            const got = collectMill(city.id);
            const n = Object.values(got).reduce((a, b) => a + b, 0);
            toast(n ? `가공품 ${n}칸을 창고에 넣었다` : '창고가 가득 차 못 받는다', n ? 'good' : 'bad');
            refreshLog(); after();
          }));
      }
    } else {
      const cap = millBatchCap(r.id, city.id);
      const can = canRunMill(r.id, city.id, cap);
      const fee = millFee(r.id, Math.max(1, cap));
      rows.push(svcRow(label,
        cap > 0
          ? `${cap}회분 — ${inTxt} ×${cap} → ${outTxt} ×${cap} · 가공비 ${fee.toLocaleString('ko-KR')}닢`
            + ` · ${millDays(r.id, cap, w.level)}일`
          : (can.reason ?? '창고에 원료를 채워야 한다'),
        '착수', cap <= 0, () => {
          const res = runMill(r.id, city.id, cap);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${r.name} 착수 — ${res.days}일`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }

    const up = canUpgradeMill(r.id, city.id);
    if (w.level < WORK.levelCap) {
      const price = millPrice(r.id, city.id, w.level + 1);
      rows.push(svcRow(`　└ ${w.level + 1}등급으로 — ${price.toLocaleString('ko-KR')}닢`,
        `하루 처리 ${WORK.millPerDay[w.level]} → ${WORK.millPerDay[w.level + 1]}칸`,
        up.ok ? '올린다' : (up.reason.length > 10 ? '못 올린다' : up.reason), !up.ok, () => {
          const res = upgradeMill(r.id, city.id);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${r.work} ${res.level}등급`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
    // 매각은 **들인 돈의 60%**만 돌아온다 — 화면이 그것을 그대로 말해야 잘못 누르지 않는다
    rows.push(svcRow('　└ 넘긴다', `들인 돈의 ${Math.round(WORK.sellBack * 100)}%만 돌아온다`,
      '넘긴다', !!w.job, () => {
        const res = sellMill(r.id, city.id);
        if (!res.ok) return toast(res.reason, 'bad');
        toast(`+${res.back.toLocaleString('ko-KR')}닢`, 'warn');
        refreshHUD(); refreshLog(); after();
      }));
  }

  /* ── 2단계 · 농장과 광산 (SPEC-vertical §2-5) ────────────────────────
     ★ **밭이 대는 것은 마진이 아니라 원가다.** 재고까지는 −12~24%로 사고 **시장을 안 누른다**.
       그래서 화면이 말해야 하는 것도 값이 아니라 **「지금 몇 칸이 서 있나」**다. */
  for (const cand of growCandidates(city.id)) {
    const w = workAt(cand.kind, cand.gid, city.id);
    const nm = WORKS[cand.kind].name;
    const gn = cand.good.name;
    if (!w) {
      const can = canBuyGrow(cand.gid, city.id);
      const price = growPrice(cand.gid, city.id, 1);
      rows.push(svcRow(`${gn} ${nm} — ${price.toLocaleString('ko-KR')}닢`,
        `하루 ${growRate(cand.kind, 1)}칸 · ${WORKS[cand.kind].stockDays}일치까지 쌓인다`
        + ` · 그 몫은 원가 −${Math.round(growOff(1) * 100)}%이고 시장을 안 누른다`,
        can.ok ? '세운다' : (can.reason.length > 10 ? '못 세운다' : can.reason),
        !can.ok, () => {
          const res = buyGrow(cand.gid, city.id);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${gn} ${nm}${josa(nm, '을/를')} 세웠다`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
      continue;
    }
    const have = growStock(cand.gid, city.id);
    const cap = growCap(cand.kind, w.level);
    rows.push(svcRow(`${gn} ${nm} ${w.level}등급` + (w.idle ? ' · 휴업' : ''),
      w.idle ? '휴업 중이라 한 칸도 안 쌓인다 — 밀린 유지비를 내야 한다'
             : `밭에 ${have}/${cap}칸 · 하루 ${growRate(cand.kind, w.level)}칸`
               + ` · 여기서 ${gn}을(를) 사면 그만큼 원가 −${Math.round(growOff(w.level) * 100)}%`,
      '—', true, () => {}));
    if (w.level < WORK.levelCap) {
      const up = canUpgradeGrow(cand.gid, city.id);
      const price = growPrice(cand.gid, city.id, w.level + 1);
      rows.push(svcRow(`　└ ${w.level + 1}등급으로 — ${price.toLocaleString('ko-KR')}닢`,
        `하루 ${growRate(cand.kind, w.level)} → ${growRate(cand.kind, w.level + 1)}칸`
        + ` · 원가 −${Math.round(growOff(w.level) * 100)}% → −${Math.round(growOff(w.level + 1) * 100)}%`,
        up.ok ? '올린다' : (up.reason.length > 10 ? '못 올린다' : up.reason), !up.ok, () => {
          const res = upgradeGrow(cand.gid, city.id);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${gn} ${nm} ${res.level}등급`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
    rows.push(svcRow('　└ 넘긴다', `들인 돈의 ${Math.round(WORK.sellBack * 100)}%만 돌아온다 · 쌓인 것도 함께 넘어간다`,
      '넘긴다', false, () => {
        const res = sellGrow(cand.gid, city.id);
        if (!res.ok) return toast(res.reason, 'bad');
        toast(`+${res.back.toLocaleString('ko-KR')}닢`, 'warn');
        refreshHUD(); refreshLog(); after();
      }));
  }

  /* ── 3단계 · 판매소 (SPEC-vertical §2-5·3-1) ────────────────────────
     ★ **판매소가 파는 것은 마진이 아니라 시장 깊이다.** 한 항구에 쏟아부으면 `MARKET.cap`에
       닿는데, 판매소는 그 벌점을 **시간으로 바꾼다.** 그래서 화면이 말해야 하는 것도
       "얼마 버나"가 아니라 **「팔 때 얼마나 덜 무너지나」와 「지금 몇 칸이 남았나」**다. */
  for (const gid of Object.keys(city.demand ?? {})) {
    const w = shopAt(gid, city.id);
    const gn = GOOD_BY_ID[gid]?.name ?? gid;
    if (!w) {
      /* 목록이 길어지지 않게 — **이미 하나라도 시설이 있는 항구**에서만 권한다 */
      if (!mine.length) continue;
      const can = canBuyShop(gid, city.id);
      const price = shopPrice(gid, city.id, 1);
      rows.push(svcRow(`${gn} 판매소 — ${price.toLocaleString('ko-KR')}닢`,
        `팔 때 시장 벌점 −${Math.round(WORK.shopCut[1] * 100)}% · 위탁하면 하루 ${WORK.shopFlow[1]}칸씩`
        + ` 그날 시세로 팔린다(수수료 ${Math.round(WORK.shopFee * 100)}%)`,
        can.ok ? '연다' : (can.reason.length > 10 ? '못 연다' : can.reason),
        !can.ok, () => {
          const res = buyShop(gid, city.id);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${gn} 판매소를 열었다`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
      continue;
    }
    shopTick(gid, city.id);
    const left = Math.floor(w.stock ?? 0);
    const due = Math.round(w.proceeds ?? 0);
    rows.push(svcRow(`${gn} 판매소 ${w.level}등급` + (w.idle ? ' · 휴업' : ''),
      w.idle ? '휴업 중이라 한 칸도 안 팔린다 — 밀린 유지비를 내야 한다'
             : `팔 때 시장 벌점 −${Math.round(WORK.shopCut[w.level] * 100)}%`
               + ` · 맡긴 것 ${left}칸 · 하루 ${WORK.shopFlow[w.level]}칸씩 나간다`,
      '—', true, () => {}));
    const inStore = (state.stored?.[city.id] ?? {})[gid] ?? 0;
    if (inStore > 0 && !w.idle) {
      rows.push(svcRow(`　└ 창고의 ${gn} ${inStore}칸을 맡긴다`,
        `하루 ${WORK.shopFlow[w.level]}칸씩 그날 시세로 팔린다 · 수수료 ${Math.round(WORK.shopFee * 100)}% + 입항세`,
        '맡긴다', false, () => {
          const res = consignToShop(gid, inStore, city.id);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${gn} ${res.n}칸을 판매소에 맡겼다`, 'good');
          refreshLog(); after();
        }));
    }
    if (due > 0) {
      rows.push(svcRow(`　└ 팔린 돈 ${due.toLocaleString('ko-KR')}닢`,
        '판매소는 금고로 자동 입금하지 않는다 — 들러서 걷는다',
        '걷는다', false, () => {
          const got = collectShop(city.id);
          toast(`+${got.toLocaleString('ko-KR')}닢`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
    if (w.level < WORK.levelCap) {
      const up = canUpgradeShop(gid, city.id);
      const price = shopPrice(gid, city.id, w.level + 1);
      rows.push(svcRow(`　└ ${w.level + 1}등급으로 — ${price.toLocaleString('ko-KR')}닢`,
        `벌점 −${Math.round(WORK.shopCut[w.level] * 100)}% → −${Math.round(WORK.shopCut[w.level + 1] * 100)}%`
        + ` · 하루 ${WORK.shopFlow[w.level]} → ${WORK.shopFlow[w.level + 1]}칸`,
        up.ok ? '올린다' : (up.reason.length > 10 ? '못 올린다' : up.reason), !up.ok, () => {
          const res = upgradeShop(gid, city.id);
          if (!res.ok) return toast(res.reason, 'bad');
          toast(`${gn} 판매소 ${res.level}등급`, 'good');
          refreshHUD(); refreshLog(); after();
        }));
    }
    rows.push(svcRow('　└ 넘긴다', `들인 돈의 ${Math.round(WORK.sellBack * 100)}%만 돌아온다 · 맡긴 것은 창고로 돌아온다`,
      '넘긴다', false, () => {
        const res = sellShop(gid, city.id);
        if (!res.ok) return toast(res.reason, 'bad');
        toast(`+${res.back.toLocaleString('ko-KR')}닢`, 'warn');
        refreshHUD(); refreshLog(); after();
      }));
  }

  if (!rows.length) return null;
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '시설' }),
      el('span', {
        text: mine.length ? `${mine.length}개 · 연 ${Math.round(WORK.upkeepRate * 100)}%`
                          : `공업력 ${city.industry}`,
        style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
      }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

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
/* 산 것을 화면 말로 옮긴다 — 정보형은 **표가 곧 상품**이라 여기서 줄을 만든다. */
function serviceResult(r, f) {
  if (r.kind === 'price-tip') {
    if (!r.tips?.length) return '“여기서 실어 나갈 만한 것이 지금은 안 보이오. 값만 받은 셈이 됐소.”';
    return '<b>여기서 싣고 나가면 값이 오르는 곳</b><br>'
      + r.tips.map((t) => `${t.goodName} — ${t.toName} <b>+${t.gain}%</b>`
          + ` <span style="opacity:.7">(${t.buyAt.toLocaleString('ko-KR')} → ${t.sellAt.toLocaleString('ko-KR')}닢 · ${t.days}일)</span>`).join('<br>');
  }
  if (r.kind === 'route-tip') {
    if (!r.tips?.length) return '“나가는 길이 없소.”';
    return '<b>여기서 나가는 길</b><br>'
      + r.tips.map((t) => `${t.toName} — 조우 <b>${Math.round(t.odds * 100)}%</b>`
          + ` <span style="opacity:.7">(${t.risk == null ? '내해·육로' : `요율 ${t.risk}%`} · ${t.days}일)</span>`).join('<br>');
  }
  return r.line ?? '';
}

function talkTo(f) {
  const job = JOB_LABEL[f.job] ?? f.job ?? '';
  const fee = figureFee(f);
  const head = `<span style="color:#8f8878">${[job, city.name].filter(Boolean).join(' · ')}</span><br><br>`
        + (f.blurb ? `${f.blurb}<br>` : '')
        + (f.lines?.greet ? `<br><span style="color:#c9b98a">${f.lines.greet}</span>` : '')
        + (f.lines?.offer ? `<br><span style="color:#c9b98a">${f.lines.offer}</span>` : '');

  /* ★ 오래도록 이 모달은 **값까지 띄워 놓고 단추가 '자리를 뜬다' 하나**였다.
     소설이 이 바다들을 "제도를 인물로 보여 준다"로 설계했는데 그 문지기가 안 눌리면
     제도가 통째로 안 굴러간다 — 그래서 여기에 사는 자리를 낸다(UNIMPLEMENTED B-1). */
  const actions = [];
  if (SERVICE_LABEL[f.service]) {
    actions.push({
      label: fee ? `${SERVICE_LABEL[f.service]} 사기 (${fee.toLocaleString('ko-KR')}닢)`
                 : `${SERVICE_LABEL[f.service]} 받기`,
      onClick: () => {
        const r = buyService(f);
        if (!r.ok) return toast(r.reason, 'bad');
        pushLog(`${city.name}에서 ${f.name}에게 ${SERVICE_LABEL[f.service]}${josa(SERVICE_LABEL[f.service], '을/를')} 샀다`
              + (r.fee ? ` (−${r.fee.toLocaleString('ko-KR')}닢).` : '.'), 'good');
        refreshHUD();
        modal({
          title: f.name,
          body: (f.lines?.done ? `<span style="color:#c9b98a">${f.lines.done}</span><br><br>` : '')
              + serviceResult(r, f),
          actions: [{ label: '알겠다', onClick: () => after() }],
        });
      },
    });
  }
  actions.push({ label: '자리를 뜬다' });

  /* ★ 결함 C — 세를 깎는 서비스(permit·smuggle)는 부관·갈래 특전이 이미 바닥(`BOON.tariffFloor`)에
     눌러 놓았으면 사도 세가 안 움직인다. 사기 전에 이 항구에서 실제로 얼마가 내려가는지 보여준다 —
     막지는 않는다(시장 깊이 등 다른 이유로 살 수도 있다), 다만 효과 0은 반드시 화면에 나와야 한다. */
  const tariffPreview = (f.service === 'permit' || f.service === 'smuggle')
    ? tariffCutPreview(f.service, city.id)
    : null;
  const previewLine = tariffPreview
    ? (tariffPreview.active
        ? `<br><span style="opacity:.75">이미 갖고 있다(세 ${(tariffPreview.before * 100).toFixed(2)}%) — 다시 사면 기한만 늘어난다.</span>`
        : tariffPreview.delta > 0
          ? `<br><span style="opacity:.75">지금 사면 세가 ${(tariffPreview.before * 100).toFixed(2)}%`
            + `→${(tariffPreview.after * 100).toFixed(2)}%로 내려간다.</span>`
          : `<br><span style="color:#c98a5a">이미 세율이 바닥이다(${(tariffPreview.before * 100).toFixed(2)}%)`
            + ` — 사도 세는 그대로다.</span>`)
    : '';

  modal({
    title: f.name,
    body: head
        + (SERVICE_LABEL[f.service]
            ? `<br><br><span style="opacity:.75">파는 것 — ${SERVICE_LABEL[f.service]}`
              + (f.fee ? ` · 오늘 값 ${fee.toLocaleString('ko-KR')}닢` : ' · 값은 받지 않는다')
              + `</span>${previewLine}`
            : ''),
    actions,
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
      /* 얼굴을 앞에 세운다 — 그림이 오면 `figure:<id>:idle`로 갈리고, 없으면 직업 실루엣이다(BRIEF-NPC §4 ②)
         ★ **초상 칸이 24×24 CSS px이었다**(ART A-5). 사람은 24×43으로 그려져 있는데 칸이
           24px밖에 안 돼 **전신을 머리만 남기고 잘라 넣은 꼴**이었고, 얼굴은 대여섯 픽셀이었다.
           사람이 그린 PNG가 와도 이 칸에서는 읽히지 않는다 — **그림보다 칸이 먼저 걸린다.**
         ⇒ ① 2배 → **3배**로 굽고 ② 칸을 42×46으로 키워 **가슴 위(bust)**만 담는다
           (`.fig-por`가 가운데로 모아 좌우를 자르고, 위에서부터 담아 아래를 자른다 — 트림된
           스프라이트는 맨 윗줄이 곧 머리끝이라 어느 인물이든 얼굴이 칸 안에 든다).
           ③ 남는 세로를 **이름 / 하는 일** 두 줄로 쓴다 — 예전에는 한 줄에 다 이어 붙여
              긴 이름이 「…」로 잘렸다. */
      ...people.slice(0, 6).map((f) => el('div.ctr-sub.fig-row', {
        title: f.blurb ?? '',
        style: { cursor: 'pointer' },
        onclick: () => talkTo(f),
      }, [
        el('span.fig-por', {}, spriteElTrim(figureSprite(f.id, f.job, null, f.sex), 3)),
        el('span.fig-who', {}, [
          el('b', { text: f.name }),
          el('span.fig-job', {
            text: [JOB_LABEL[f.job], SERVICE_LABEL[f.service]].filter(Boolean).join(' · ')
                  || '이 항구 사람',
          }),
        ]),
      ])),
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
/* ── 사이드패널 접기 (2026-08-28 · PM 지시 ②) ───────────────────
   ★ 실측: `#port-side`가 **clientHeight 530 / scrollHeight 3,372**이었다. 1280×720 창에서
     「나라에 부두를 낸다」·「패권」 같은 **완주 판정 카드를 보려면 972px을 굴려야** 했다.
     이 저장소에서 가장 비싼 실수의 자리다 — *"규칙이 멀쩡한데 화면이 말하지 않아 수백 일을 잃는다."*
   ⇒ 고친 것은 둘이다:
     ① **차례를 바꿨다** — 목표(관영 조선소·조선의 끝·패권)를 맨 위로, 살림살이를 아래로.
     ② **긴 카드는 접어 둔다** — 머리말은 그대로 보이므로 *무엇이 있는지는 안 감춘다.*
        한 번 펼치면 그 상태를 **세션 동안 기억한다**(`foldOpen`).
   ⚠️ 접힘 상태를 `state`에 넣지 않는다 — `save.js`가 state를 통째로 싣고
     `check-architecture`가 필드를 세므로, 화면 취향이 세이브에 섞이면 안 된다. */
const foldOpen = new Map();      // 패널 key → 펼쳤나 (모듈 변수 · 새로고침하면 기본값으로)

/** 카드 하나를 접는다. `panel`이 null이면(카드가 안 뜨는 국면) 그대로 null을 돌려준다. */
function fold(key, panel, openDefault = false, badge = null) {
  if (!panel) return null;
  const open = foldOpen.has(key) ? foldOpen.get(key) : openDefault;
  const h3 = panel.querySelector('h3');
  if (!h3) return panel;
  for (const c of [...panel.children]) if (c !== h3) c.style.display = open ? '' : 'none';
  h3.style.cursor = 'pointer';
  h3.title = open ? '접는다' : '펼친다';
  /* 접힌 카드에도 **한 줄 요약**을 남긴다 — 접는 것과 감추는 것은 다르다 */
  if (!open && badge) {
    h3.append(el('span', { text: badge,
      style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0, marginLeft: 'auto' } }));
  }
  h3.append(el('span', { text: open ? ' ▾' : ' ▸',
    style: { fontSize: '11px', color: '#8f8878', marginLeft: badge && !open ? '6px' : 'auto' } }));
  h3.addEventListener('click', () => { foldOpen.set(key, !open); buildUI(); });
  return panel;
}

function sidePanel() {
  return el('div#port-side', {}, [
    /* ★ 바닥에서 나가는 문은 **맨 위**다(C-17). 이 카드가 뜨는 국면에서
       시장·정비·거점보다 먼저 읽히지 않으면 "출구가 없다"가 그대로 재발한다. */
    salvageCard(),

    /* ★ 목표가 맨 위다 — 이 셋이 972px 아래에 있었다.
       ⓐ 「관영 조선소」와 「조선의 끝」은 **펼친 채로** 올린다(이 회차의 새 규칙과 최종 목표).
       ⓑ 「패권」은 496px이라 그대로 올리면 정비·급여를 다시 밀어낸다 — **접고 머리말에 `n/9`**를 적는다.
          접는 것과 감추는 것은 다르다: 몇 바다를 잡았는지는 굴리지 않고 읽힌다.

       ── 2026-08-29 (회차 23) ─────────────────────────────────
       ★ **끝이 둘인데 한 쪽만 첫 화면에 있었다.** 회차 22가 「관영 조선소」·「조선의 끝」을
         올리고 「패권」은 접기만 했는데, 접힌 36px짜리가 **정비(289px) 아래**에 있어
         1280×720에서 y=773 — 여전히 굴려야 보였다(실측 `clientHeight` 625).
         *"끝이 둘"*(claude-memory §현재 상태)인 게임에서 **완주 판정 카드 셋은 한 화면에
         나란해야 한다.** 접힌 채로 여기 올리면 36px밖에 안 들고 `n/9`는 그대로 읽힌다. */
    civicCard(),
    endingCard(),
    fold('hegemony', hegemonyCard(), false, `${hegemonyAll().have}/9 바다`),

    /* 급여는 **때를 놓치면 사람이 떠나는 것**이라 정비보다 위다(74px밖에 안 든다) */
    payrollCard(),

    el('div.panel', {}, [
      el('h3', {}, el('span', { text: '선박 정비' })),
      el('div.svc', {}, [
        svcRow(`선체 수리 (${repairUnit()}닢/pt${repairUnit() < REPAIR_UNIT ? ' · 깎았다' : ''})`, `${state.hp}/${state.maxHp}`,
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

    fold('city', el('div.panel', {}, [
      el('h3', {}, el('span', { text: city.name })),
      el('div.city-card', {}, [
        el('div', {}, [
          el('span.cname', { text: city.name }),
          el('span.creg', { text: city.area }),
        ]),
        el('div.cblurb', { text: city.blurb }),
      ]),
    ]), false, city.area),
    contractCard(),      // 계약은 기한이 있다 — 접지 않는다

    /* ── 아래는 살림살이 — 머리말만 보이게 접어 둔다(한 번 펼치면 세션 동안 기억한다) ── */
    fold('fleet', fleetCard(), false, `동행 ${consortCount()}척`),
    fold('officer', officerCard(), false, OFFICER.name),
    fold('mate', mateCard(), false, `${mateCount()}/${mateCap()}`),
    fold('faction', factionCard(), false, null),
    /* ⚠️ `portDayCost()`는 **갈래별 내역 객체**를 준다(state.js) — 예전에는 그것을 그대로
       `toLocaleString`해서 접힌 「정박」 머리말에 `하루 [object Object]닢`이 찍혔다.
       지금 나가는 몫은 `.now`다(`waitCard`의 `c3.now`·`c10.now`와 같은 갈래). */
    fold('wait', waitCard(), false, `하루 ${portDayCost().now.toLocaleString('ko-KR')}닢`),
    fold('holding', holdingCard(), false,
         `${HOLDING_KEYS.filter((k) => ownsHolding(k, city.id)).length}개`),
    fold('works', worksCard(), false, null),
    fold('line', lineCard(), false, null),
    fold('harbor', harborCard(), false, null),

    fold('figure', figureCard(), false, null),
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
      /* ★ 미뤄 둔 급여일은 **출항이 걷는다.** 짐을 팔 기회는 주되 회피는 안 된다 —
         그것이 "안 주는 것도 선택이지 회피가 아니다"라는 급여일의 규칙이다. */
      onclick: () => {
        if (state.crew <= 0) return go('tavern');
        if (paydayDue()) return openPayday(() => after());
        go('map');
      },
    }),
  ]);
}

/* ── 선단 ──────────────────────────────────────────────
   ★ 배를 여러 척 가지고 있어도 **함께 몰고 나갈 방법이 없었다.** 이 카드가 그 문이다.
     「동행시킨다 / 정박시킨다」 토글 하나지만 값이 두 갈래다 —
     띄울 때 사람을 태우는 계약금, 다니는 내내 삯과 보급. 술집과 같은 구조다.
     규칙·값은 전부 `state.js`·`data.js: FLEET`에 있고 여기서는 보여주고 부르기만 한다. */
function fleetCard() {
  // 기함 밖의 배만 줄이 된다. 한 척도 없으면 카드 자체를 띄우지 않는다(빈 패널은 벽지다).
  const others = Object.keys(state.fleet).filter((k) => k !== state.shipKey);
  if (!others.length) return null;

  const n = consortCount();
  const lag = fleetLaggard();
  const slow = Math.round((1 - fleetSpeedPenalty()) * 100);

  const rows = others.map((key) => {
    const s = SHIPS[key];
    const rec = state.fleet[key];
    const here = rec.at === state.at;
    const on = isConsort(key);
    const cap = captainOf(key);

    if (on) {
      const c = state.consorts[key];
      return svcRow(`${s.name} — 동행 중`,
        `선원 ${c.crew}명 · 화물 ${s.cargo}칸 · 선체 ${rec.hp}/${s.hp}`
        + ` · 속력 ${s.speed}` + (cap ? ` · 선장 ${cap.name ?? cap}` : ' · 선장 없음'),
        '정박시킨다', false, () => {
          const r = stowConsort(key);
          if (!r.ok) return toast(r.reason, 'bad');
          toast(`${s.name}${josa(s.name, '을/를')} 매어 두었다 — 선원 ${r.crew}명 하선`, 'warn');
          refreshHUD(); refreshLog(); after();
        });
    }

    if (!here) {
      return svcRow(`${s.name}`, `${CITY_BY_ID[rec.at].name}에 정박해 있다 · 유지비 ${s.upkeep}닢/일`,
        '여기 없음', true, () => {});
    }

    const can = canConsort(key);
    const need = consortCrewNeed(key);
    const cost = consortHireCost(key);
    return svcRow(`${s.name}`,
      `선원 ${need}명을 태워야 한다 (−${cost.toLocaleString('ko-KR')}닢)`
      + ` · 화물 +${s.cargo}칸 · 포 ${s.guns}문 · 속력 ${s.speed}`
      + (can.ok ? '' : ` — ${can.reason}`),
      '동행시킨다', !can.ok, () => {
        const r = setConsort(key);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`${s.name}${josa(s.name, '이/가')} 따라나선다 — 선원 ${r.crew}명 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
        refreshHUD(); refreshLog(); after();
      });
  });

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '선단' }),
      el('span', { text: `${fleetSize()}척`,
                   style: { fontSize: '11px', color: n ? '#54a89b' : '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, [
      el('div.ctr-sub', {
        text: `${fleetSize()}척 · 총적재 ${cargoUsed()}/${cargoCapTotal()}칸`
            + ` · 총선원 ${fleetCrew()}명`
            + (n ? ` · 동행 하루 ${fleetDailyCost().toLocaleString('ko-KR')}닢` : ''),
      }),
      /* 무엇이 발목을 잡는가 — 선단은 가장 느린 배에 맞춘다. 안 보여주면
         "왜 갑자기 항해가 길어졌지"가 버그로 읽힌다. */
      lag && slow > 0 ? el('div.ctr-sub', {
        style: { color: '#c98a6a' },
        text: `${lag.name}${josa(lag.name, '이/가')} 가장 느리다 — 선단 속력 −${slow}%. 항해가 그만큼 길어진다.`,
      }) : null,
      n === 0 ? el('div.ctr-sub', {
        style: { color: '#6f6858' },
        text: '데리고 나가려면 사람을 따로 태워야 한다. 짐은 늘고, 포는 함께 쏘고, 적탄을 나눠 받는다 — 대신 가라앉는다.',
      }) : null,
      ...rows,
    ].filter(Boolean)),
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
