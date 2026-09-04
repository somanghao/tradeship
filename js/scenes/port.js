// scenes/port.js — 항구: 시세 확인과 매매, 선박 정비, 출항

import { portSprite } from '../sprites/scene.js';
import { shipSprite, WATERLINE } from '../sprites/ship.js';
import { unitSprite, figureSprite, mateSprite } from '../sprites/char.js';
/* 부두에 선 사람은 **작은 인물**(24×28 · 실질 키 21px)이다 — 48px 그림은 건너편에 댄 배보다
   너무 커서 배가 장난감으로 보였다. 사이드패널의 초상은 크기가 곧 정보라 큰 그림 그대로다. */
import { miniUnitSprite, MINI_FOOT } from '../sprites/char-mini.js';
import { blit } from '../pixel.js';
import { GOODS, GOOD_BY_ID, CITIES, CITY_BY_ID, SHIPS, OFFICER, HOLDINGS, HOLDING_KEYS, HOLDING, FLAG_NAME,
         ESTATE_KEYS, WORK, WORKS, CONSIGN, LINE, FACTIONS, FACTION, REGARD, ROSTER, COMMENDA, BANKRUPT, BOON, HEGEMONY,
         /* 상단 — 세 갈래의 문턱(`pressAt`·`helpAt`)과 사주 보상을 화면 말로 옮길 때만 읽는다 */
         GUILD,
         /* 입항세 셋째 겹(총자산 누진)을 화면 말로 옮길 때만 읽는다 — 회차 28 다-1 */
         TARIFF_SCALE,
         /* 자리(座) — §A-11 명. 값과 임기를 화면 말로 옮길 때만 읽는다 */
         SEAT,
         /* 작위·개시 — §A-11 조선 */
         ROYAL } from '../data.js';
import {
  state, ship, cargoUsed, cargoFree, buy, sell, repair,
  marketTag, tagRank, pushLog, gunCap, playerTroops, REPAIR_UNIT,
  impactFactor, costFor, tariffRate, shorthanded,
  /* 세력이 쥔 자리인가 — 「독점이 자본을 밀어낸다」를 화면 말로 옮길 때만 읽는다(회차 28 다-1) */
  gripHeld,
  /* ★ 입항세는 세 겹이다 — 화면이 결과 %만 적어 오던 셋째 겹(총자산 누진)을 조각으로 가른다 */
  tariffScale, netWorth,
  contractOffer, acceptContract, deliverContract, abandonContract,
  /* 바닥의 문 — **판정은 규칙이 한 벌로 갖고 있다**(지도 `brokeCard`와 같은 표를 본다).
     ★ 문이 넷이 됐다(계약 선금) — 지도가 그것을 가리키는데 항구에 없으면 **가리킨 곳이 빈다.** */
  recoveryOptions,
  hasOfficer, paydayDue, paydayDeferred, daysToPayday, payrollOwed, regionOf,
  /* ⚠️ 성과급은 **함수로 읽는다** — `OFFICER.cut`은 상수라 급여를 미뤄 지분을 내준 뒤에도
     11%라고 말한다(회차 27 · 규칙 PM이 잡아 넘긴 자리). `officerCut()`이 정본이다. */
  officerCut, officerDeferred,
  priceOf, voyageDays, neighborsOf,
  buyService, figureFee, activeBoons, repairUnit, infamyHere, infamyTariffUp, tariffCutPreview,
  /* 자리(座) — §A-11 명. `job:'官'`이 여는 문이라 `service`와 나란히 쓴다 */
  seatSellerOK, seatCity, seatAt, seatPrice, buySeat,
  /* §A-11 조선 — 작위와 개항 */
  royalProgress, claimRoyal, takeRoyal, fairOpen,
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
  salvage, salvageElsewhere, cheapestExit, debtOwed, sellShip, liquidate,
  /* 패권이 화면에서 말을 안 하던 자리 둘(A-8c) — 표는 state가 정본, 여기서는 읽기만 한다 */
  foeWealth, foeOdds, foeWealthGate,
  /* 상단이 값에 남긴 것과 상단이 준 것(회차 26 · G-6·G-3) — **읽기만 한다** */
  guildFactor, guildCredit, guildEscortOff,
} from '../state.js';
import { openPayday } from '../payday.js';
import { openFactions } from '../factions.js';
import { autoSave } from '../save.js';
/* 해적 명부(`rosterOf`)는 규칙이 `world.js`에 있다 — 후보에서 빼는 규칙(`pickDef`)과
   같은 자리라야 카드와 세계가 갈리지 않는다. 여기서는 **세어 보여주기만** 한다. */
import { npcsAtPort, figuresAt, rosterOf } from '../world.js';
/* ★ 상단(商團) — 회차 25가 규칙·데이터를 다 세워 두고도 **화면이 안 읽어서** 플레이어가
   존재를 몰랐다(회차 26 주과녁 G-1·G-2·G-3·G-6). 여기서는 **읽기만 한다** —
   `js/npc/*`는 경제 트랙 소유라 한 줄도 고치지 않는다. */
import { guildsAtCity, guildRank, guildRegard, guildOfferAt, initGuilds } from '../npc/guild.js';
import { HOUSE_BY_ID } from '../npc/houses.js';
import { goodRank, goodBasis } from '../evidence.js';
/* ★ `refreshLog`가 **import에 빠져 있었다.** 정박 카드(기다린다·선원을 내린다)와 거점 카드가
   이미 부르고 있었으므로 그 단추들은 눌리는 순간 ReferenceError로 죽었다 —
   화면은 멀쩡하고 아무 일도 안 일어나는 꼴이라 버그로 안 보인다. */
import { el, overlay, toast, refreshHUD, refreshLog, iconEl, spriteElTrim, modal, josa, npcTitle } from '../ui.js';
import { go, gameStarted, viewport } from '../main.js';

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

/* ══════════════════════════════════════════════════════════════
   무대 배치 — 배와 부두 사람을 **DOM 패널이 안 덮는 구간**에 놓는다 (회차 25 · S-5)
   ══════════════════════════════════════════════════════════════
   ★ 회차 24가 남긴 가장 큰 과녁이 여기였다. 항구 씬은 `main.js`의 인셋(`setInsetRight`)을
     쓰지 않는다 — 캔버스는 늘 창 전체 폭에 가운데 정렬되고 DOM 패널이 그 위에 그냥 얹힌다.
     그래서 배를 논리 x=132에 **못박아 두면** 창이 좁을수록 시장 패널에 물린다(실측: 800×600에서
     352px 중 268px이 가려졌다). 그렇다고 인셋을 쓰면 400칸을 다 보여주느라 배율이 통째로
     떨어진다(1280 창에서 2배 → 1배) — 그림이 반으로 작아지므로 **더 나쁘다.**
   ⇒ 고른 길: **캔버스는 그대로 두고, 그림 쪽이 빈자리를 찾아간다.** 두 가지를 함께 한다.
     ① 그리드 가운데 열의 최소폭(`--port-gap`)을 여기서 준다 — CSS가 양쪽 패널을 그만큼 좁힌다.
     ② 그러고도 남는 틈에 맞춰 배와 사람의 논리 x를 다시 잡는다.
   ★ **실측이 결론을 뒤집은 자리**: 배 스프라이트는 176×128이지만 **실제로 그려진(불투명) 폭은
     100~163px**이고 좌우 여백이 선종마다 다르다(hulk 43~142 · 고속프리깃 13~175).
     176을 요구하면 아무 데도 안 들어가는 창이 생긴다 — **요구폭은 불투명 상자로 잰다.** */
const SHIP_CW = 176;                 // 스프라이트 캔버스 폭(굽는 규격)
const GRP_LEFT = 21;                 // 원래 조합에서 맨 왼쪽 부두 사람의 왼쪽 끝
let stageOx = 0;                     // 무리 전체를 옮기는 논리 x 오프셋(0이면 지금까지와 같다)
const bboxCache = new Map();

/** 배 스프라이트의 **불투명 가로 범위**(캔버스 안 좌표). 선종마다 한 번만 잰다. */
function shipBox(sprite, key) {
  const hit = bboxCache.get(key);
  if (hit) return hit;
  let lo = SHIP_CW, hi = -1;
  try {
    const c = document.createElement('canvas');
    c.width = sprite.width; c.height = sprite.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(sprite, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y++) {
      const row = y * c.width;
      for (let x = 0; x < c.width; x++) {
        if (d[(row + x) * 4 + 3] > 8) { if (x < lo) lo = x; if (x > hi) hi = x; }
      }
    }
  } catch { /* 캔버스를 못 읽으면 규격 그대로 쓴다 */ }
  const box = hi < lo ? { lo: 0, hi: SHIP_CW - 1 } : { lo, hi };
  bboxCache.set(key, box);
  return box;
}

/** 지금 배의 불투명 상자 — 그릴 때도 배치할 때도 같은 것을 쓴다. */
function curShipBox() {
  const s = ship();
  const key = `${s.hull}|${s.tint}|${city?.flag}`;
  return shipBox(shipSprite(s.hull, { tint: s.tint, flag: city.flag, furl: true }), key);
}

function placeStage() {
  const wrap = document.getElementById('port-wrap');
  if (!wrap || !city) return;
  const { offX, scale } = viewport();
  const box = curShipBox();
  const ow = box.hi - box.lo + 1;

  /* ① 가운데 열이 요구할 최소폭. **남는 것을 넘게 요구하면 세 칸 합이 창을 넘어**
     회차 24가 고친 결함(출항 단추가 뷰포트 밖)이 되살아난다 — 그래서 반드시 깎아서 준다. */
  /* 인라인으로 깎아 둔 하한을 먼저 지운다 — 안 그러면 지난번에 깎은 값을 정본으로 읽는다. */
  wrap.style.removeProperty('--mk-min');
  wrap.style.removeProperty('--sd-min');
  const cs = getComputedStyle(wrap);
  const px = (v) => parseFloat(v) || 0;
  const chrome = px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.columnGap) * 2;
  let mkMin = px(cs.getPropertyValue('--mk-min'));
  let sdMin = px(cs.getPropertyValue('--sd-min'));
  /* ★ **두 하한의 합이 창을 넘으면 하한 자체를 깎는다.** 안 깎으면 그리드가 넘쳐 오른쪽 열이
     통째로 뷰포트 밖으로 밀리고 「⚓ 출항하기」가 안 눌린다 — 회차 24가 640px에서 고친 바로 그
     결함이 **360~480px에서 되살아나 있었다**(실측: 360×640에서 `#port-wrap` 가로 넘침 122px ·
     출항 단추 `inVp:false, hit:false`). 문턱을 하나 더 파는 대신 **자를 창에 맞춘다** —
     미디어쿼리 값이 어떻든 세 칸의 합이 창을 넘지 않는다. */
  if (mkMin + sdMin + chrome > wrap.clientWidth) {
    const k = Math.max(0.2, (wrap.clientWidth - chrome) / (mkMin + sdMin));
    mkMin = Math.floor(mkMin * k); sdMin = Math.floor(sdMin * k);
    wrap.style.setProperty('--mk-min', `${mkMin}px`);
    wrap.style.setProperty('--sd-min', `${sdMin}px`);
  }
  const avail = wrap.clientWidth - chrome - mkMin - sdMin;
  /* ★ **요구하는 것은 「배」뿐이다 — 부두 무리까지 요구하면 손해가 더 크다.**
     무리까지(배 불투명폭 + 사람 띠) 요구해 봤더니 1440×900에서 시장 452→368 · 사이드
     240→176으로 두 패널이 통째로 쪼그라들었다(실측). 사람 서넛을 더 보이자고 넓은 창의
     패널을 깎는 것은 남는 장사가 아니다 — **넓은 창에서는 회차 24와 같은 폭(452·240)을 지킨다.**
     ⚠️ 눈에 보이는 틈은 가운데 칸보다 넓다(양옆 거터도 비어 있다) — 그만큼 빼지 않으면
     칸을 과하게 요구해 800×600에서 2px이 모자랐다. */
  const want = (ow + 4) * scale - px(cs.columnGap) * 2;
  wrap.style.setProperty('--port-gap', `${Math.max(0, Math.min(want, avail))}px`);

  /* ② 패널이 자리를 잡은 뒤의 **진짜 빈 구간**을 논리 좌표로 되돌린다. */
  const r = (id) => document.getElementById(id)?.getBoundingClientRect() || null;
  const cr = document.getElementById('screen')?.getBoundingClientRect();
  const mk = r('port-market'), sd = r('port-side');
  const base = cr ? cr.left : 0;
  const vLo = mk ? (mk.right - base - offX) / scale : 0;
  const vHi = sd ? (sd.left - base - offX) / scale : 400;
  const gapW = vHi - vLo;

  const fullW = (132 + box.hi) - GRP_LEFT + 1;     // 부두 무리 왼끝 ~ 배 오른끝 (논리 폭)
  let ox;
  if (gapW >= fullW) {
    ox = vLo + (gapW - fullW) / 2 - GRP_LEFT;      // 다 들어간다 → 무리째 가운데
  } else if (gapW >= ow) {
    /* 배부터 — 오른쪽에 붙이고 사람은 남는 만큼. 오른쪽 여백은 **남는 만큼만** 준다:
       4px을 무조건 띄웠더니 여유가 2px뿐인 창에서 그만큼 왼쪽이 잘렸다(실측 800×600 · 4px). */
    ox = vHi - Math.max(0, Math.min(3, gapW - ow)) - (132 + box.hi);
  } else {
    ox = vLo + (gapW - ow) / 2 - (132 + box.lo);   // 배도 안 들어간다 → 배를 가운데 두고 균등하게 잘린다
  }
  // 논리 캔버스(0~400) 밖으로 배를 밀어내지 않는다 — 밖은 `ctx.clip()`이 잘라 낸다
  const min = 2 - (132 + box.lo), max = 398 - (132 + box.hi);
  stageOx = Math.round(Math.max(Math.min(ox, max), min));

  /* ③ 시장 표는 **452px이라야 한 줄도 안 접힌다**(실측 — 420px에서 4줄, 380px 아래로는 절반이
     두 줄, 320px 아래로는 모든 줄이 두 줄이 된다). 「가로 넘침 0」은 가독성의 보증이 아니었다.
     좁은 열에서는 글자·여백·거래칸을 한 단계 줄여 **접히는 줄 수를 줄인다**(`#port-market.tight`). */
  const mkEl = document.getElementById('port-market');
  if (mkEl) mkEl.classList.toggle('tight', mkEl.clientWidth < 450);
  /* 사이드도 같은 처방 — 배에 자리를 내주느라 150px까지 좁아지는 창(≤900px)이 있다.
     240px에서 짜 놓은 글자·여백 그대로면 카드 글이 두세 자마다 접힌다. */
  const sdEl = document.getElementById('port-side');
  if (sdEl) sdEl.classList.toggle('tight', sdEl.clientWidth < 200);
}

/** 검증용 — 지금 배가 실제로 어디에 그려지는지(논리 x)와 불투명 상자.
    `.playtest/round-25/scripts/measure-port.mjs`가 이 값으로 가림 px를 잰다. */
export const portStageDebug = () => ({ ox: stageOx, shipX: 132 + stageOx, box: curShipBox() });

export const portScene = {
  /* U2(회차 29) — 술집의 `strandedCard`가 「상관 게시판」(거래 탭)으로 곧장 보내려면
     이 화면이 `params.tab`을 읽어야 한다(`shipyard.js: enter(params)`와 같은 자리 —
     `main.js: go(name, params)`는 이미 params를 넘겨주고 있었는데 이 씬만 안 받고 있었다).
     안 주면 지금 탭 그대로다(세션 동안 기억하는 `sideTab`을 강제로 되돌리지 않는다). */
  enter(params = {}) {
    if (params.tab) sideTab = params.tab;
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
    /* ★★ **새 판의 첫 항구에는 상단 장부가 아직 없다.** `resetGame`이 `state.guilds = {}`로
       비우고, 그것을 채우는 `initGuilds()`는 **`guildTick` 안에서만** 불린다 —
       곧 첫 출항 전까지 `guildRank()`가 빈 배열이라 **상단 카드가 통째로 안 뜬다**(실측으로 잡았다).
       이 화면이 상단을 처음 보여 주는 자리인데 하필 **처음 켠 사람에게만 안 보이는** 꼴이다.
       ⚠️ **비어 있을 때만** 부른다 — `initGuilds()`는 장부를 통째로 새로 만든다.
       (제자리는 `world.js: initWorld()`다. 그 파일은 경제 트랙 소유라 A-ISSUES X-5로 넘긴다.) */
    if (!state.guilds || !Object.keys(state.guilds).length) initGuilds();
    if (gameStarted()) autoSave();
    // 급여일은 **항구에서만** 온다 — 바다에서는 돈을 줄 데가 없다.
    // 화면을 세운 뒤에 띄워야 정산이 끝나고 닫혔을 때 뒤에 항구가 있다.
    /* 급여일은 **항구에서만** 온다 — 바다에서는 돈을 줄 데가 없다.
       "짐을 팔고 오겠다"로 미뤄 둔 날이면 다시 띄우지 않는다(→ payday.js) — 대신 **떠날 때 막는다.** */
    if (paydayDue() && !paydayDeferred()) openPayday(() => after());
  },

  resize() { placeStage(); },

  draw(ctx, t) {
    blit(ctx, bg, 0, 0, 1);

    /* 정박한 우리 배 — 수면선을 항구 물높이에 맞춘다.
       ★ x는 더 이상 못박은 132가 아니다(회차 25). `placeStage()`가 **DOM 패널이 안 덮는
         구간**을 재서 무리째 옮긴다 — 넓은 창에서는 지금까지와 거의 같은 자리이고, 좁은 창에서만
         오른쪽으로 비켜선다. 부두는 0~400 전 폭에 깔려 있어(`sprites/scene.js: drawQuay`)
         어디에 세워도 물에 뜨거나 뭍에 오르지 않는다. */
    const bob = Math.round(Math.sin(t * 0.9) * 1.2);
    blit(ctx, shipSprite(ship().hull, { tint: ship().tint, flag: city.flag, furl: true }),
         132 + stageOx, 168 - WATERLINE + bob, 1);

    /* 부두 위 사람들 — 발바닥이 닿는 자리(`QUAY_FEET`)를 기준으로 세운다.
       48px 그림을 쓰던 시절의 `y=150`은 그 값에 큰 그림의 발밑선을 미리 뺀 것이었다.
       배와 **같은 오프셋**으로 옮긴다 — 따로 놀면 사람만 패널 뒤에 남는다. */
    for (const d of dockers) {
      blit(ctx, miniUnitSprite(d.key, 'idle', null, regionOf(state.at)),
           d.x + DOCKER_DX + stageOx, QUAY_FEET - MINI_FOOT, 1, d.flip);
    }

    // 부관은 배 곁에 선다 — 사이드패널을 열지 않아도 함께 있다는 것이 보인다
    if (hasOfficer()) {
      blit(ctx, miniUnitSprite(OFFICER.sprite, 'idle'),
           108 + DOCKER_DX + stageOx, QUAY_FEET - MINI_FOOT, 1);
    }
  },
};

/* ══════════════════════════════════════════════════════════════ */
function buildUI() {
  overlay.replaceChildren(
    el('div#port-wrap', {}, [marketPanel(), sidePanel()])
  );
  /* 패널을 다시 세울 때마다 무대도 다시 잡는다 — 탭을 바꾸면 카드가 달라지고,
     배를 사거나 팔면 배 그림의 폭 자체가 바뀐다(불투명 폭 100~163px). */
  placeStage();
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
    /* 거래 칸의 폭은 **CSS가 정한다**(`.market th.tcol`) — 좁은 창에서 `#port-market.tight`가
       한 단계 줄일 수 있어야 하는데, 인라인 style은 그것을 이긴다(회차 25). */
    el('th.num.tcol', { text: '거래' }),
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
        /* ★ G-6 — **이 값이 왜 이런가**를 한 조각으로. 상단이 이 항구에 부으면(−) 값이 내리고
           사가면(+) 오른다(`state.js: guildFactor`). 회차 25가 세운 층이 값에 실제로 남긴
           자국인데 화면 어디에도 안 나와 있었다 — 위 `∓`(내 거래 압력)와 **다른 것**이라
           딱지를 갈라 붙인다. 툴팁이 아니라 **조각 자체**가 뜻을 지녀야 읽힌다. */
        (() => {
          const gp = (guildFactor(city.id, g.id) - 1) * 100;
          if (Math.abs(gp) < 0.5) return null;
          return el(`span.gpush.${gp > 0 ? 'up' : 'dn'}`, {
            /* 부호는 화면 전체와 같은 활자를 쓴다 — ASCII `-`는 이 글꼴에서 가늘어 안 보인다 */
            text: ` ${gp > 0 ? '+' : '−'}${Math.abs(gp).toFixed(1)}%(상단)`,
            title: (gp > 0
              ? '상단이 이 항구에서 이 물건을 사갔다 — 그만큼 값이 올라 있다.'
              : '상단이 이 항구에 이 물건을 부었다 — 그만큼 값이 내려 있다.')
              + ' 상단이 손을 놓으면 며칠에 걸쳐 되돌아온다.',
          });
        })(),
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
  /* ★★ **입항세의 셋째 겹을 화면이 한 번도 말한 적이 없다**(회차 28 다-1).
     `baseTariff`는 `TARIFF` + `CITY_TARIFF` + **총자산 누진**(`tariffScale` ×1.00→×2.40)인데,
     화면은 `tariffRate()`의 **결과 %만** 적어 왔다. 실측(`u-probe-silent.mjs`):
     부산포가 가난할 때 3.30% → 총자산 9만닢에서 **7.92%**로 같은 모양의 숫자만 바뀐다.
     후반 브레이크(`data.js: TARIFF_SCALE`)는 **읽혀야 브레이크**다 — 이유를 안 적으면
     플레이어는 성장할수록 무거워지는 세를 「항구가 비싸다」로 오독한다.
     ⚠️ 세를 **안 바꾼다**. 이미 있는 값을 조각으로 갈라 붙일 뿐이다.
     ★ 소수 한 자리로 내린다 — `Math.round(…*100)`이면 3.30%와 3.44%가 같은 「3%」였다. */
  const tScale = tariffScale();
  tbl.append(el('caption', {
    style: {
      captionSide: 'top', fontSize: '11px', color: '#6f6858',
      padding: '6px 8px', textAlign: 'left',
    },
  }, [
    el('span', {
      text: `기본 10개 단위 · Shift=전량 · Ctrl=1개 · 한 번에 많이 거래할수록 단가가 불리해진다`
          + ` · 입항세 ${(tariffRate(city.id) * 100).toFixed(1)}%`,
    }),
    tScale > 1.005 ? el('span', {
      text: ` (자산 누진 ×${tScale.toFixed(2)})`,
      style: { color: '#c98a5a' },
      title: `총자산 ${Math.round(netWorth()).toLocaleString('ko-KR')}닢 — `
           + `${TARIFF_SCALE.from.toLocaleString('ko-KR')}닢을 넘으면 관이 더 뜯는다.\n`
           + `${TARIFF_SCALE.per.toLocaleString('ko-KR')}닢 늘 때마다 원래 세율의 +${Math.round(TARIFF_SCALE.step * 100)}%,`
           + ` 최대 ×${TARIFF_SCALE.cap}까지. 배·거점·시설도 자산에 든다.`,
    }) : null,
  ].filter(Boolean)));
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
      /* ★ **접혀 있을 때 이 딱지가 이 카드의 전부다.** 「0/8」만 적으면 *자리가 비었다*는 말이라
         이 항구에 사람이 기다린다는 사실이 사라진다 — 등용은 항구를 골라 다니는 일인데
         화면이 그것을 안 말하면 51명이 있어도 지나친다(2026-08-30 육안 판정 · ⓓ).
         ⚠️ `fold`의 badge와 **같은 값을 두 번** 그리고 있었다(접힌 머리에 `0/8 0/8`) —
            badge는 `peopleTab`에서 `null`로 바꿨고 세는 자리는 여기 하나다. */
      el('span', { text: `${mateCount()}/${mateCap()}`
                       + (here.length ? ` · 이 항구에 ${here.length}명` : ''),
                   style: { fontSize: '11px', color: here.length ? '#c8a86a' : '#8f8878', letterSpacing: 0 } }),
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
                + ` · 성과급 <b>이익의 ${(officerCut() * 100).toFixed(1)}%</b>`
                + (state.officer.share
                    ? ` <span style="color:#c8a86a">(삯을 미뤄 ${(OFFICER.cut * 100).toFixed(0)}%에서 올랐다)</span>`
                    : ''),
          }),
          /* 미뤄 둔 삯이 있으면 그것도 이 카드가 말한다 — 급여일에만 보이면 「왜 청구가 늘었나」를
             달이 바뀌기 전에는 어디서도 못 읽는다(`payday.js`의 머리줄과 같은 값). */
          officerDeferred() ? el('div.ctr-sub', {
            html: `<span style="color:#d0a04a">미뤄 둔 삯 `
                + `<b>${officerDeferred().toLocaleString('ko-KR')}닢</b> — 다음 급여일에 걷힌다.</span>`,
          }) : null,
          /* U3(회차 29) — **유예 누계**가 이 화면 어디에도 없었다. `state.payroll.deferMonths`는
             `settlePayroll`이 미룰 때마다 세는 값인데(`state.js:6666` 주석 "누계(화면용)") 정작
             화면은 안 읽고 있었다 — `payday.js`의 급여일 결과 모달은 **미룬 그 순간**만 말하고,
             빚을 다 갚고 나면(`officerDeferred()`가 0으로 돌아가면) 「몇 번 미뤄서 몫이 이만큼
             올랐나」는 판이 끝날 때까지 다시 어디서도 안 보였다.
             ★ 새 계산이 아니다 — `state.payroll.deferMonths`(누계 횟수)와 `state.officer.share`
               (영구히 오른 지분, 위 성과급 줄이 이미 읽는 값)를 **문장으로만** 옮긴다. */
          state.payroll?.deferMonths ? el('div.ctr-sub', {
            html: `<span style="color:#8f8878">에이미의 삯을 여태 <b>${state.payroll.deferMonths}번</b> 미뤘다`
                + ` — 그때마다 지분이 영구히 올라 원래 ${(OFFICER.cut * 100).toFixed(1)}%였던 몫이`
                + ` 지금 <b>${(officerCut() * 100).toFixed(1)}%</b>다(되돌릴 수 없다).</span>`,
          }) : null,
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
      /* ★ **「쌓인 삯」에는 미뤄 둔 부관 몫이 섞여 있다**(`payrollOwed`가 그것을 더한다) —
         안 적으면 어느 달 갑자기 청구가 뛴 것으로만 보인다. 부관 카드는 다른 탭(사람)에 있어
         이 화면에서는 그 이유에 닿지 않는다. 유예는 면제가 아니라 **다음 달로 미는 것**이다. */
      officerDeferred() ? el('div.ctr-sub', {
        html: `<span style="color:#d0a04a">그 가운데 <b>${officerDeferred().toLocaleString('ko-KR')}닢</b>은`
            + ` 미뤄 둔 ${OFFICER.name}의 삯이다(${state.payroll.deferMonths || 1}달째).</span>`,
      }) : null,
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
  /* ⚠️ **`kind`로 찾는다 — 개수·순서로 읽지 않는다.** 문이 또 늘면 그 화면이 죽는다. */
  const adv = recoveryOptions(city.id, { lender }).doors.find((d) => d.kind === 'advance');

  /* ★ **경보와 안내를 가른다.** 무역선은 짐을 싣는 순간이 늘 가장 가난하다 —
     그때마다 붉은 「금고가 바닥이다」가 뜨면 진짜 바닥일 때 아무도 안 읽는다(경보 피로).
     그래서 **팔 것이 한 항차를 덮으면 안내**(놋빛), **못 덮으면 경보**(붉은색)다.
     C-17이 실제로 죽은 자리는 후자다 — 팔 것으로도 못 채우는 국면. */
  const covered = total + state.gold >= (exit ?? 0) && total + state.gold >= debt;
  const grave = !covered;

  /* ★★ 2026-08-30 실측이 문구를 뒤집었다 — **「여기」만 세고 말하면 거짓말이 된다.**
     금고 0 · 이 항구에 팔 것 0인 판에서 카드가 *"팔 것을 다 팔아도 한 항차를 못 채운다"*라고
     적었는데, 실제로는 **하루 거리 내이포에 창고 짐 203닢**이 있었다(가장 싼 항차는 45닢).
     출항은 막히지 않으므로(못 낸 몫은 빚) **가서 파는 것이 그 판의 답**인데 화면이 그것을
     막다른 골목처럼 말한 것이다. `covered`는 규칙이 정한 대로 「여기」만 세되(사흘 걸리는
     항구의 배는 오늘의 답이 아니다), **문장은 밖에 있는 것까지 보고** 고른다. */
  const away = salvageElsewhere(city.id);
  const awayTotal = away.reduce((a, r) => a + r.gold, 0);
  const awayCovers = grave && away.length
    && state.gold + total + awayTotal >= (exit ?? 0)
    && state.gold + total + awayTotal >= debt;

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
        : awayCovers
          ? '<b>여기서는 못 채운다 — 그러나 막힌 것은 아니다.</b>'
            + ` 아래 항구로 가면 팔 것이 있다(${(away[0].days != null ? `${away[0].days}일 거리` : '이 바다 안')}).`
            + ' 출항은 막히지 않는다 — 못 낸 몫이 빚으로 남을 뿐이고, 가서 팔면 갚는다.'
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
       다른 항구에 둔 배·거점을 떠올릴 수 있다.
       ★★ 2026-08-30 — **세기만 하던 것을 이름으로 바꿨다.** 예전 줄은
          「다른 항구에 배 2척 · 거점 1곳」까지였는데, 그것으로는 *어느* 항구인지도
          *거기까지 며칠*인지도 알 수 없어 플레이어가 세계를 스스로 뒤져야 했다
          (`state.js: salvageElsewhere`의 머리주석이 이 자리를 그대로 적어 두고 있다).
          값·거리는 규칙이 세고(`resaleOf`·`HOLDING.sellBack`·`hopDays`) 화면은 편다.
          ⚠️ `days: null`은 *"못 간다"*가 아니라 **"2홉으로는 못 셈한다"**는 뜻이라
             일수를 안 적고 이름만 적는다. */
    if (away.length) {
      lines.push(el('div.ctr-sub', {
        html: `이 항구에서 팔 것은 없다 — 그러나 <b>다른 항구에 ${awayTotal.toLocaleString('ko-KR')}닢</b>어치가 있다.`,
        style: { color: '#d0a04a' },
      }));
      for (const r of away.slice(0, 3)) {
        const what = [r.ships ? `배 ${r.ships}척` : null,
                      r.holdings ? `거점 ${r.holdings}곳` : null,
                      r.stored ? `창고 ${r.stored}칸` : null].filter(Boolean).join(' · ');
        lines.push(el('div.ctr-sub', {
          html: `· <b>${r.name}</b>${r.days != null ? ` (${r.days}일)` : ''}`
              + ` — ${what} · ${r.gold.toLocaleString('ko-KR')}닢`,
          style: { color: '#c8bfa8' },
        }));
      }
      if (away.length > 3) {
        lines.push(el('div.ctr-sub', {
          text: `그 밖에 ${away.length - 3}곳에 더 있다.`, style: { color: '#8f8878' },
        }));
      }
    } else {
      /* ⚠️ **문 수를 세서 말한다.** 예전에는 「아래 둘뿐이다」로 박아 뒀는데, 대금업자는
         항구마다 있는 것이 아니라 **없는 항구에서는 문이 하나(청산)뿐**이다 —
         화면이 없는 문을 가리키면 사람은 그것을 찾다가 판을 접는다. */
      /* ★ 문 수는 **세어서** 말한다 — 선금이 넷째 문으로 들어왔다(회차 27). 「하나뿐」이라고
         적는 동안 규칙에 선금 124닢이 서 있으면, 화면이 사람을 가장 비싼 문(청산)으로 보낸다. */
      const doorN = 1 + (canLoan ? 1 : 0) + (adv?.ok ? 1 : 0);
      lines.push(el('div.ctr-sub', {
        text: `팔 것이 하나도 없다. 남은 문은 아래 ${['하나', '둘', '셋'][doorN - 1]}뿐이다.`,
        style: { color: '#d0a04a' },
      }));
    }
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
  /* ── 계약 선금 (X-3 · 회차 27) ─────────────────────────────
     ★ **지도가 가리키는 곳이 여기다.** 지도의 「금고가 바닥이다」가 *"남은 문은 계약 선금과
       청산"*이라고 적고 항구로 보내는데, 그 항구에 선금 줄이 없으면 사람은 **교역 탭을
       스스로 뒤져야** 한다 — C-17이 죽은 방식이 정확히 그것이다(있는데 아무도 안 말한다).
     ⚠️ **「돈이 생긴다」로 적지 않는다.** 선금은 갚는 돈이고(납품이 갚는 길이다) 못 지키면
       위약금 ×1.25가 빚으로 남는다. 들어오는 값과 무는 값을 **같은 줄에** 둔다. */
  if (adv?.ok) {
    acts.push(svcRow(`계약 선금 ${adv.value.toLocaleString('ko-KR')}닢 — 상관 게시판의 일감`,
      `${CITY_BY_ID[adv.to]?.name ?? adv.to}까지 ${GOOD_BY_ID[adv.goodId]?.name ?? adv.goodId}`
      + ` ${adv.qty}개 · ${adv.due}일차까지 · 못 지키면 위약금 ${adv.fine.toLocaleString('ko-KR')}닢이 빚으로`,
      '게시판으로', false, () => { sideTab = 'trade'; buildUI(); }));
  } else if (adv && adv.need > 0) {
    lines.push(el('div.ctr-sub', {
      style: { color: '#a89a84' },
      text: `상관에 일감은 있으나 선창이 ${adv.need}칸 모자란다 (${adv.qty}개를 실어야 한다).`,
    }));
  }

  /* ★ 청산은 **마지막 문이고, 그래서 늘 보인다.** 팔 것이 남아 있어도 감추지 않는다 —
     감추면 "팔 것이 다 떨어진 뒤에야 알게 되는 문"이 되어 C-17이 그대로 재발한다.
     대신 단추가 `.danger`이고 모달이 잃는 것을 전부 적는다. */
  acts.push(svcRow('청산한다 — 배를 넘기고 셈을 끝낸다',
    `${SHIPS[BANKRUPT.keepShip].name} 한 척과 ${BANKRUPT.seedGold}닢으로 다시 시작한다`,
    '청산', false, () => askLiquidate()));

  /* ⚠️ **머리말이 몸통과 반대말을 하면 안 된다.** 딱지가 「팔 것이 없다」인데 본문이
     「다른 항구에 2,733닢어치가 있다」였다(2026-08-30 실측). 딱지도 밖에 있는 것을 센다. */
  return el('div.panel', { style: { borderColor: grave && !awayCovers ? '#8f2f26' : '#6f5214' } }, [
    el('h3', {
      style: grave && !awayCovers
        ? { background: 'linear-gradient(#4a2018, #331610)', color: '#f0b8a6' }
        : null,
    }, [
      el('span', {
        text: !grave ? '금고가 비었다 — 팔면 채워진다'
            : awayCovers ? '금고가 비었다 — 팔 것은 다른 항구에 있다'
            : '금고가 바닥이다',
      }),
      el('span', {
        text: rows.length ? `팔 것 ${rows.length}가지 · ${total.toLocaleString('ko-KR')}닢`
            : away.length ? `여기엔 없다 · 다른 항구에 ${awayTotal.toLocaleString('ko-KR')}닢`
            : '팔 것이 없다',
        style: { fontSize: '11px', color: grave && !awayCovers ? '#d09080' : '#8f8878', letterSpacing: 0 },
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
        /* ★★ **독점이 자본을 밀어낸다**(회차 27 다-4 · `FACTION.gripBlocksGuild`) — 규칙은 섰는데
           화면이 한 마디도 안 하던 자리다(회차 28 다-1). 쥔 항구·품목에서는 **상단이 물가를
           좁히는 힘이 그만큼 덜 먹는다**. 실측(`u-probe-silent2.mjs`): 제노바·명반에 상단이
           같은 양을 부어도 **+1.46% ↔ 안 쥐었다면 +3.25%**다.
           ⇒ 「딴 데서 사면 된다」의 반쪽이 여기 있다 — *기다려도 값이 안 내려온다*.
           ⚠️ **줄을 새로 쌓지 않는다**(회차 27 B2-5: 알리는 카드가 고르는 카드를 가렸다).
              이미 있는 둘째 줄에 문장 하나를 잇는다. */
        const blockPct = Math.round((FACTION.gripBlocksGuild ?? 0) * 100);
        const held = (f.grip.goods ?? []).filter((g) => gripHeld(g, city.id));
        const guildLine = (blockPct > 0 && held.length)
          ? ` 상단이 값을 좁혀 주지도 않는다 — 쥔 자리에서는 그 힘이 ${blockPct}% 덜 먹는다.` : '';
        return (bites.length || held.length) ? el('div.ctr-sub', { style: { color: '#c98a6a' },
          title: guildLine
            ? `${held.map((g) => GOOD_BY_ID[g]?.name ?? g).join(' · ')} — 이 항구에서는 상단이 값을 밀어도`
              + `
${100 - blockPct}%만 먹는다(state.js: guildFactor · data.js: FACTION.gripBlocksGuild).`
              + `
곧 여기서는 값이 스스로 내려오기를 기다릴 수 없다.` : null,
          html: (bites.length
                  ? `쥔 자리라 웃돈이 붙는다 — `
                    + bites.map((x) => `${GOOD_BY_ID[x.g].name} +${Math.round(x.up * 100)}%`).join(' · ')
                  /* 웃돈이 아직 0이어도(호감이 나쁘지 않을 때) **쥐고 있다는 사실**은 말한다 */
                  : `이 항구·품목을 쥐고 있다 — `
                    + held.map((g) => GOOD_BY_ID[g]?.name ?? g).join(' · '))
              /* 웃돈이 0인데 「밖의 항구에서는 안 붙는다」를 적으면 없는 웃돈을 있는 것처럼 말한다 */
              + `<br><span style="opacity:.8">`
              + (bites.length ? `밖의 항구에서는 안 붙는다. 딴 데서 사면 된다 — 대신 항로가 길어진다.`
                              : `지금은 웃돈을 안 문다 — 눈총을 받으면 그때부터 문다.`)
              + `${guildLine}</span>`,
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

/* ══ 상단(商團) — 회차 26 · G-1·G-2·G-3 ═══════════════════════════
   ★ **이 저장소가 가장 비싸게 배운 것이 이 자리다** — 회차 25가 상단 49곳을 규칙·데이터로
     다 세우고 시뮬로 검증까지 마쳤는데, **항구 화면이 한 줄도 안 읽어서** 플레이어에게는
     그 층이 없는 것과 같았다(`grep guild js/scenes/port.js` → 0건이었다).
     *"규칙이 멀쩡한데 화면이 말하지 않아 수백 일을 잃는다."*

   ⚠️ **여기서는 읽기만 한다.** 규칙·값은 전부 `js/npc/guild.js`·`js/state.js`·`js/data.js: GUILD`에
     있고 이 파일은 한 톨도 계산하지 않는다 — 두 곳이 각자 셈하면 반드시 어긋난다
     (`civicCard`가 `civicProgress` 하나만 보는 것과 같은 규약). */

/* 상관 여덟(리스본)을 다 펴 볼까 — 접힘과 같은 자리라 **모듈 변수**다(세이브에 안 담는다) */
let guildAllHouses = false;

/** 호감 한 조각 — 세 갈래(괴롭힘·이용·도움)의 문턱은 `GUILD.pressAt`·`helpAt`이 정본이다 */
function guildRegardWord(r) {
  if (r <= GUILD.pressAt) return { word: '눌러 온다', color: 'var(--bad)' };
  if (r >= GUILD.helpAt) return { word: '돕는다', color: 'var(--good)' };
  return { word: '지켜본다', color: '#948c7c' };
}

/** 자본을 짧게 — 사이드패널이 150px까지 좁아지므로 자릿수를 그대로 적으면 줄이 접힌다.
    ⚠️ 「천」이 아니라 **「만」**이다 — 3,073천닢은 한국어로 안 읽힌다(첫 판을 눈으로 보고 잡았다). */
const guildCap = (n) => (n >= 10000
  ? `${(n / 10000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, '')}만닢`
  : `${Math.round(n).toLocaleString('ko-KR')}닢`);

/* ── G-1 「상단」 카드 ─────────────────────────────────────────
   이 항구에 **상관을 둔** 상단 · 자본 서열 · 선단/세기 · 나를 어떻게 보는가.
   ★ 상관이 하나도 없는 항구에서도 **이 바다의 큰 상단 셋**은 보여 준다 — 안 그러면
     상단이 없는 항구에서 시작한 사람은 그런 층이 있다는 것조차 모른다(그것이 회차 25의 결함이었다). */
function guildCard() {
  const reg = guildRank(city.region);
  if (!reg.length) return null;
  const all = guildRank();
  const seated = guildsAtCity(city.id);
  const rankOf = (id) => reg.find((r) => r.id === id) || all.find((r) => r.id === id);
  /* 상관 수의 폴백 — 장부가 아직 `seats`를 안 실어 오는 판(옛 세이브)에서는 명부를 센다 */
  const seatsCount = (h) => (h.seats ?? []).length;
  const localRank = (id) => reg.findIndex((r) => r.id === id) + 1;

  /* ★ **리스본에는 상관이 여덟이다**(실측 — 130개 항구 중 8곳이 상관 하나, 최대가 리스본 8).
     여덟을 다 펴면 카드 하나가 스물네 줄이 되어 「사이드 몇 화면」이 통째로 무너진다.
     조선소 선박 탭이 회차 25에 쓴 규약과 같은 것을 쓴다 — **넷까지 펴고, 나머지는 단추로**.
     한 곳도 지우지 않는다. */
  const CAP = 4;
  const shown = guildAllHouses ? seated : seated.slice(0, CAP);
  const rows = [];
  for (const { house, ledger } of shown) {
    const r = rankOf(house.id);
    if (!r) continue;
    const regard = guildRegard(house);
    const w = guildRegardWord(regard);
    const lr = localRank(house.id);
    /* 압박은 **여기 서 있는 동안 일어나는 일**이라 그 상단 줄에 붙인다
       (바다 위에서 누가 오는가는 지도 트랙의 G-4·G-5가 말한다). */
    const press = ledger?.press && ledger.press.until > state.day ? ledger.press : null;
    rows.push(el('div.gh-row', {
      title: `${house.blurb ?? ''}\n${house.lines?.greet ?? ''}`
           + `\n\n자본 ${Math.round(r.cap).toLocaleString('ko-KR')}닢 · 항차 ${r.legs}회`
           + `\n호감 ${regard >= 0 ? '+' : ''}${regard} — ${GUILD.pressAt} 이하면 눌러 오고 ${GUILD.helpAt} 이상이면 돕는다`,
    }, [
      el('div.ctr-line.gh-name', {}, [
        el('span', { text: house.name }),
        el('span.gh-rank', { text: lr > 0 ? `이 바다 ${lr}위` : '먼 바다의 상단' }),
      ]),
      el('div.ctr-sub', {}, [
        /* 240px 칸에 들어가야 한다 — 「자본」·「척」을 빼면 한 줄이 줄어든다(실측) */
        el('span', { text: `${guildCap(Math.round(r.cap))} · 선단 ${r.fleet} · 세기 ${r.might} · ` }),
        /* ⚠️ `nowrap` — 안 주면 「−22 / 눌러 온다」로 **숫자와 말이 갈려** 접힌다(실화면에서 봤다) */
        el('span.gh-regard', { style: { color: w.color },
          text: `${regard >= 0 ? '+' : '−'}${Math.abs(regard)} ${w.word}` }),
      ]),
      /* ★ **흥망은 회차 26에 경제 트랙이 짓고 있다**(`guildRank()`가 `seats`·`took`·`lost`를
         내기 시작했다). 여기서는 **있으면 보여 주고 없으면 아무것도 안 그린다** — 필드가
         바뀌어도 카드가 안 깨지게 전부 `??`로 연다. 상관을 뺏고 뺏기는 이야기가
         화면에 한 줄도 없으면 그 규칙 역시 「없는 것」이 된다. */
      (r.took ?? 0) || (r.lost ?? 0) ? el('div.ctr-sub.gh-far', {
        text: `상관 ${r.seats ?? seatsCount(house)}곳`
            + ((r.took ?? 0) ? ` · 인수 ${r.took}` : '')
            + ((r.lost ?? 0) ? ` · 잃음 ${r.lost}` : ''),
      }) : null,
      press ? el('div.ctr-sub.gh-press', {
        text: `압박 — ${CITY_BY_ID[press.city]?.name ?? press.city} 언저리에 호위선단을 세웠다`
            + ` (${Math.max(0, press.until - state.day)}일)`,
      }) : null,
    ].filter(Boolean)));
  }

  if (rows.length && seated.length > shown.length) {
    rows.push(el('button.btn.sm.dark', {
      text: `전부 ${seated.length}곳을 편다`,
      onclick: () => { guildAllHouses = true; buildUI(); },
    }));
  } else if (rows.length && guildAllHouses && seated.length > CAP) {
    rows.push(el('button.btn.sm.dark', {
      text: `${CAP}곳만 보인다`,
      onclick: () => { guildAllHouses = false; buildUI(); },
    }));
  }

  if (!rows.length) {
    rows.push(el('div.ctr-sub', { text: '이 항구에 상관을 둔 상단은 없다. 이 바다를 쥔 쪽은 —' }));
    for (const r of reg.slice(0, 3)) {
      /* ⚠️ 낱말 안에서 끊긴다 — 「선단 4 / 척」. 숫자와 단위는 한 덩어리로 묶는다
         (조선소가 회차 25에 `word-break: keep-all`로 고친 것과 같은 자리다). */
      rows.push(el('div.ctr-sub.gh-far', {}, [
        el('span', { text: `${r.rank}. ${r.name} — ` }),
        el('span.gh-nw', { text: `${guildCap(r.cap)} · 선단 ${r.fleet}척` }),
      ]));
    }
  }

  /* ★ **상단이 지금 이 항구의 값을 얼마나 밀고 있나**를 한 줄로 잇는다 — 시세 칸의
     `(상단)` 조각(G-6)과 같은 값을 쓴다. 두 자리가 다른 수를 말하면 안 읽힌다. */
  const touched = GOODS.filter((g) => Math.abs(guildFactor(city.id, g.id) - 1) >= 0.005);
  if (touched.length) {
    const top = touched
      .map((g) => ({ g, p: (guildFactor(city.id, g.id) - 1) * 100 }))
      .sort((a, b) => Math.abs(b.p) - Math.abs(a.p))[0];
    rows.push(el('div.ctr-sub.gh-push', {
      title: '상단이 이 항구에 부으면(−) 값이 내리고 사가면(+) 값이 오른다.\n시세 칸의 (상단) 조각과 같은 값이다.',
      text: `이 항구 ${touched.length}품목의 값을 밀고 있다 — 가장 큰 것은 `
          + `${top.g.name} ${top.p >= 0 ? '+' : '−'}${Math.abs(top.p).toFixed(1)}%`,
    }));
  }

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '상단' }),
      el('span', { text: seated.length ? `상관 ${seated.length}곳` : `이 바다 ${reg.length}곳`,
        style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, rows),
  ]);
}

/* ── G-2 「사주」 — 상관 게시판의 또 한 줄 ──────────────────────
   *"A가 B의 상관 C에 이 물건 N개를 부어 달라."* 주인공이 남의 싸움의 도구가 되는 자리다.
   ★ 진척(`done`)은 **그 항구에서 파는 순간** `state.js: sell()`이 센다. 값을 치르는 것은
     `npc/guild.js: settleGuildOffer()`이고 그것은 **날이 갈 때** 돈다 — 그래서 다 채워도
     그 자리에서 금화가 들어오지 않는다. 화면이 그것을 말하지 않으면 "고장 났다"로 읽힌다. */
function guildOfferCard() {
  const o = state.guildOffer;
  if (!o || o.until <= state.day) return null;
  const here = guildOfferAt(city.id);
  const left = o.until - state.day;
  const done = o.done ?? 0;
  const have = state.cargo[o.gid] || 0;
  const pct = Math.min(100, Math.round((done / Math.max(1, o.need)) * 100));
  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '상관 게시판 · 사주' }),
      el('span', { text: `기한 ${left}일`,
        style: { fontSize: '11px', color: left <= 5 ? '#d05a4a' : '#8f8878', letterSpacing: 0 } }),
    ]),
    el('div.svc', {}, [
      el('div.ctr-line', {
        html: `<b>${o.byName}</b>${josa(o.byName, '이/가')} <b>${o.foeName}</b>의 상관`
            + ` <b>${CITY_BY_ID[o.city]?.name ?? o.city}</b>에`
            + ` <b>${GOOD_BY_ID[o.gid]?.name ?? o.gid} ${o.need}개</b>를 부어 달라 한다`,
      }),
      o.line ? el('div.ctr-sub.gh-line', { text: o.line }) : null,
      el('div.gh-bar', { title: `진척 ${done}/${o.need}개` },
        el('div.gh-bar-in', { style: { width: `${pct}%` } })),
      el('div.ctr-sub', {
        text: `보수 ${o.fee.toLocaleString('ko-KR')}닢 · 진척 ${done}/${o.need}개 (${pct}%)`
            + (have ? ` · 싣고 있는 것 ${have}개` : ''),
      }),
      /* ⚠️ **설명을 두 줄로 나누지 않는다.** 640×360의 사이드는 151×201px이라 한 줄이 늘 때마다
         탭이 0.15화면씩 길어진다. 상단 이름도 다시 적지 않는다(위에 이미 있고, 「브라질 설탕
         엔제뉴 계약상단(세뇨르 데 엔제뉴)」처럼 길다) — 역할로만 부른다. */
      el('div.ctr-sub', {
        style: here ? { color: 'var(--good)' } : null,
        text: (here
          ? '여기가 그 상관이다 — 이 항구에서 파는 만큼 찬다'
          : `${CITY_BY_ID[o.city]?.name ?? o.city}에서 팔아야 찬다 (여기서 판 것은 안 센다)`)
          + ` · 마치면 호감 +${GUILD.regardUse}/−${GUILD.regardUse} · 셈은 날이 갈 때`,
      }),
    ].filter(Boolean)),
  ]);
}

/* ── G-3 「신용장·호위」 배너 ────────────────────────────────────
   ★ **탭 밖**이다(`salvageCard`·「출항하기」와 같은 규약) — 지금 나를 돕거나 누르는 상단은
     어느 탭을 보고 있어도 보여야 한다. 아무 일도 없으면 아무것도 안 그린다(빈 띠는 벽지다). */
function guildBanner() {
  const lines = [];
  const b = state.guildBoon;
  /* ⚠️ 배너에서는 **이름을 짧게** 쓴다 — 「경강상인(京江商人)」처럼 한자 주석이 붙은 이름이
     151px 칸에서 한 줄을 통째로 먹어 띠가 세 줄이 된다(실측: 640×360에서 배너만으로 +0.69화면).
     주석은 카드(`guildCard`)가 온전한 이름으로 보여 주므로 여기서는 앞머리만 쓴다. */
  const nameOf = (id) => (HOUSE_BY_ID[id]?.name ?? id).replace(/\s*[（(][^)）]*[)）]\s*$/, '');
  const cr = b?.credit && b.credit.until > state.day ? b.credit : null;
  const es = b?.escort && b.escort.until > state.day ? b.escort : null;
  /* ⚠️ **이모지를 쓰지 않는다.** 📜🛡⚔은 이 PC의 본문 글꼴(맑은 고딕)에 없어서
     ○·×짜리 대체 글리프로 떨어졌다(첫 판을 눈으로 보고 잡았다 — `a-shots/g1-side-amsterdam.png`).
     ⚓·⚒처럼 이미 쓰는 것은 딩뱃이라 나오지만 이 셋은 아니다. 말머리는 **말로** 적는다. */
  /** 상관 목록을 짧게 — 240px 칸에 네 도시를 그대로 적으면 세 줄이 된다 */
  const seatWord = (ids) => {
    const names = ids.map((c) => CITY_BY_ID[c]?.name ?? c);
    return names.length <= 2 ? names.join('·') : `${names[0]} 등 ${names.length}곳`;
  };
  if (cr) {
    const off = Math.round(guildCredit(city.id) * 100);
    lines.push({
      cls: 'good', label: '신용장',
      text: `${nameOf(cr.by)} — `
          + (off > 0 ? `여기서 매입 −${off}%`
                     : `${seatWord(cr.cities ?? [])}에서 매입 −${Math.round((cr.off ?? 0) * 100)}%`)
          + ` · ${Math.max(0, cr.until - state.day)}일`,
      title: '친한 상단이 낸 신용장이다. 그 상단의 상관에서 살 때만 붙는다(state.js: guildCredit).'
           + `
상관 — ${(cr.cities ?? []).map((c) => CITY_BY_ID[c]?.name ?? c).join(' · ')}`,
    });
  }
  if (es) {
    /* 호위는 **구간**에 붙는다 — 지금 항구에서 나가는 길 가운데 실제로 덮이는 곳을 센다 */
    const covered = neighborsOf(city.id).filter((n) => guildEscortOff(city.id, n) > 0);
    lines.push({
      cls: 'good', label: '호위',
      text: `${nameOf(es.by)} — 조우 −${Math.round((es.off ?? 0) * 100)}%`
          + (covered.length ? ` · 여기서 ${covered.length}갈래` : ` · ${seatWord(es.cities ?? [])} 언저리`)
          + ` · ${Math.max(0, es.until - state.day)}일`,
      title: '그 상단의 상관을 잇는 구간에서 조우 확률이 상대적으로 줄어든다(state.js: guildEscortOff).'
           + `
상관 — ${(es.cities ?? []).map((c) => CITY_BY_ID[c]?.name ?? c).join(' · ')}`,
    });
  }
  /* 누르는 쪽도 같은 띠에 둔다 — "지금 상단이 나에게 하고 있는 일"이 이 배너의 뜻이다 */
  for (const { house, ledger } of guildsAtCity(city.id)) {
    const p = ledger?.press;
    if (!p || p.until <= state.day) continue;
    lines.push({
      cls: 'bad', label: '압박',
      text: (() => {
        const pn = CITY_BY_ID[p.city]?.name ?? p.city;
        return `${house.name} — ${pn}${josa(pn, '을/를')} 누른다 · `;
      })()
          + `세기 ${p.might} 호위선단 · ${Math.max(0, p.until - state.day)}일`,
      title: (house.lines?.press ?? '') + '\n\n조우 확률은 안 오른다 — 해적이 났을 때 누가 오는가만 바뀐다.',
    });
  }
  if (!lines.length) return null;
  return el('div#port-guild-banner', {}, lines.map((l) =>
    el(`div.gb-line.${l.cls}`, { title: l.title }, [
      el('span.gb-tag', { text: l.label }),
      el('span', { text: l.text }),
    ])));
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

/* ── 조정(朝廷) — 작위와 개항 · §A-11 조선 ─────────────────────────
   ★ **화면이 말하지 않으면 규칙은 없는 것과 같다** — 이 저장소가 세 회차 연속 밟은 자리다.
     그래서 이 카드는 «지금 무엇이 열려 있고, 다음 칸이 무엇을 여는가»를 전부 적는다.
   ⚠️ **한반도 갈래가 아니면 카드 자체를 안 낸다**(`null`) — 조정은 제 나라 사람만 부른다. */
function royalCard() {
  const p = royalProgress();
  if (!p.eligible) return null;

  /* 아직 부름이 없다 — 무엇을 해야 오는지만 말한다(빈 카드를 내지 않는다) */
  if (!p.calling && !p.taken) {
    return el('div.panel', {}, [
      el('h3', {}, el('span', { text: '조정' })),
      el('div.ctr-sub', { style: { color: '#8f8878' },
        html: '아직 도성에서 사람이 오지 않았다.<br>'
            + '<b>바다 하나를 잡으면</b> 그 소식이 도성에 닿는다.' }),
    ]);
  }

  const rows = [];
  if (p.title) {
    rows.push(el('div.ctr-sub', { style: { color: '#8fbf8a' },
      html: `✓ <b>${p.title}</b> — 문서에 이름이 올랐다` }));
  }
  for (const st of p.steps) {
    rows.push(el('div.ctr-sub', {
      style: st.done ? { color: '#8fbf8a' } : null,
      html: `${st.done ? '✓' : '·'} <b>${st.title}</b>(${st.rank}) — 아홉 바다 가운데 ${st.need}`
          + `<br><span style="opacity:.72;margin-left:12px">${st.gain}</span>` }));
  }

  /* 지금 열려 있는 것 — 규칙이 실제로 하는 일을 숫자로 말한다 */
  if (p.opened) {
    const fair = fairOpen();
    rows.push(el('div.ctr-sub', { style: { marginTop: '4px', color: '#8fbf8a' },
      html: `개항 ${p.opened}일차 — 바깥 배가 조선 아홉 항구를 돈다 · 세 −${Math.round(ROYAL.openTariffOff * 100)}%`
          + (fair
              ? `<br><b style="color:#d8c07a">개시(開市)가 서 있다</b> — ${state.royal.fair - state.day}일 남았고`
                + ` 조선 항구의 값이 +${Math.round(ROYAL.fairDemand * 100)}%다.`
              : `<br><span style="opacity:.72">개시는 ${ROYAL.fairEveryDays}일마다 ${ROYAL.fairDays}일씩 선다.</span>`) }));
  }

  /* 받을 것이 있으면 여기서 받는다 — 인물을 다시 찾아가게 하지 않는다(작위는 문서다) */
  if (p.canClaim) {
    rows.push(el('button.btn', {
      style: { marginTop: '6px' },
      text: `${p.next.title} 교지를 받는다`,
      onclick: () => {
        const r = claimRoyal();
        if (!r.ok) return toast(r.reason, 'bad');
        pushLog(`도성에서 교지가 내려왔다 — ${r.title}.`, 'good');
        if (r.opened) {
          pushLog('삼포가 다시 열렸다. 바깥 배가 조선 항구로 든다.', 'good');
          modal({
            title: '개항',
            body: '이름 칸이 비어 있던 종이에 이름이 적혔다.<br>'
                + '역관의 서자도, 재상가의 서자도 문서에 제 이름을 못 올리던 나라에서 '
                + '<b>바다에서 번 것으로 이름을 샀다</b>.<br><br>'
                + '그리고 세 포구가 다시 열렸다 — 내이포·부산포·염포. '
                + '쓰시마의 세견선이 들어오고, 등주에서 명 상선이 압록강을 거슬러 오고, '
                + '류큐 배가 남해안 세 포구를 돈다.<br><br>'
                + '<b>벌이가 늘지는 않는다.</b> 늘어난 것은 <b>오는 배</b>와 <b>서는 장</b>뿐이고, '
                + '그 둘로 무엇을 할지는 여전히 이쪽 몫이다.<br>'
                + '<span style="opacity:.75">공명첩에는 「납속(納粟)」이라 적혀 있다. '
                + '실권이 없는 이름이라는 뜻이다.</span>',
            actions: [{ label: '교지를 받는다' }],
          });
        }
        buildUI(); refreshHUD();
      },
    }));
  } else if (p.next) {
    rows.push(el('div.ctr-sub', { style: { marginTop: '4px', color: '#8f8878' },
      html: `다음 <b>${p.next.title}</b>까지 바다 <b>${Math.max(0, p.next.need - p.have)}</b>이 남았다`
          + ` (지금 ${p.have}/9).` }));
  }

  return el('div.panel', {}, [
    el('h3', {}, [
      el('span', { text: '조정' }),
      el('span', { text: p.title ?? '교지를 기다린다',
        style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 } }),
    ]),
    ...rows,
  ]);
}

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
  /* ★ 자리(座) — §A-11 명. **`job:'官'`인 사람이면 파는 것과 별개로 자리를 연다.**
     감합을 파는 태감도 인(引)을 끊는 서리도, 「그 자리에 앉은 사람」이라는 점은 같다.
     ⚠️ 명 13항구에서만 열린다(`seatCity`) — 다른 바다의 官은 이 단추가 안 뜬다. */
  const canSeat = seatSellerOK(f) && seatCity(city.id);
  const seatLive = canSeat ? seatAt(city.id) : null;
  if (canSeat && !seatLive) {
    const sf = seatPrice(city.id);
    actions.push({
      label: `자리값을 치른다 (${sf.toLocaleString('ko-KR')}닢)`,
      onClick: () => {
        const r = buySeat(city.id);
        if (!r.ok) return toast(r.reason, 'bad');
        pushLog(`${city.name}의 ${f.name}에게 자리값을 치렀다 — ${r.days}일 (−${r.fee.toLocaleString('ko-KR')}닢).`, 'good');
        refreshHUD();
        modal({
          title: f.name,
          body: (f.lines?.done ? `<span style="color:#c9b98a">${f.lines.done}</span><br><br>` : '') + r.line,
          actions: [{ label: '알겠다', onClick: () => after() }],
        });
      },
    });
  }

  /* ★ 조정의 뜻(§A-11 조선) — **왕의 대리인 한 사람**이 전한다(⛔ 조정은 세력이 아니다).
     ⚠️ 부름이 없으면 단추 자체가 안 뜬다 — 아무 때나 열면 1일차에 뜨고 「부르는 장면」이 깨진다. */
  const rp = royalProgress();
  const isEnvoy = f.id === 'eas-mapo-jeongaeksa';
  if (isEnvoy && rp.calling && !rp.taken) {
    actions.push({
      label: '왕의 뜻을 받든다',
      onClick: () => {
        const r = takeRoyal();
        if (!r.ok) return toast(r.reason, 'bad');
        pushLog('도성의 뜻을 받들었다 — 아홉 바다 가운데 셋을 잡으면 이름을 준다 하였다.', 'good');
        refreshHUD();
        modal({
          title: f.name,
          body: '“전하께서 바다의 일을 물으셨소.”<br><br>'
              + '“아홉 바다 가운데 <b>셋</b>을 이쪽 장부 아래 두시오. 어느 바다든 상관없소 — '
              + '도성이 보는 것은 어디냐가 아니라 <b>몇이냐</b>요.”<br><br>'
              + '<span style="opacity:.75">“그리하시면 공명첩을 내리겠소. 이름 칸이 비어 있는 종이요 — '
              + '거기 적힐 이름이 당신 것이 되오.”</span>',
          actions: [{ label: '삼가 받든다', onClick: () => after() }],
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

  /* 자리가 무엇인지 화면이 말해야 한다 — *"규칙이 서 있는데 화면이 말하지 않는다"*가
     이 저장소의 3회차 연속 함정이다. 자리는 **세를 깎지 않는다**는 것을 먼저 적는다. */
  const seatLine = !canSeat ? ''
    : seatLive
      ? `<br><br><span style="color:#8aa87a">자리가 서 있다 — ${seatLive.until - state.day}일 남았다`
        + ` (거점 정가 · 관의 일감 +${Math.round(SEAT.contractUp * 100)}%).</span>`
      : `<br><br><span style="opacity:.75">자리값(常例) ${seatPrice(city.id).toLocaleString('ko-KR')}닢 · ${SEAT.days}일`
        + ` — 이 항구의 거점을 정가에 사고(지금은 ${Math.round(SEAT.noSeatUp * 100)}% 비싸다),`
        + ` 관에서 나오는 일감이 ${Math.round(SEAT.contractUp * 100)}% 커진다.`
        + `<br>세는 한 푼도 안 깎인다. 자리를 여럿 두면 어사의 눈에 든다.</span>`;

  modal({
    title: f.name,
    body: head
        + (SERVICE_LABEL[f.service]
            ? `<br><br><span style="opacity:.75">파는 것 — ${SERVICE_LABEL[f.service]}`
              + (f.fee ? ` · 오늘 값 ${fee.toLocaleString('ko-KR')}닢` : ' · 값은 받지 않는다')
              + `</span>${previewLine}`
            : '')
        + seatLine,
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

/* ── 사이드패널 탭 구조 (2026-08-29 · 회차 24 · DES-UI) ───────────
   ★ 실측(`.playtest/round-24/_measure-side.mjs`): 접기만으로는 안 끝났다.
     새 항해(선원 0) 기준 `#port-side` **scrollHeight 1,346px**, 640×360에서
     `clientHeight 243px` ⇒ **5.5화면**. 1280×720도 clientHeight 625 ⇒ 2.15화면.
     큰 카드 넷(관영 조선소 227 · 나라에 부두 144 · 선박 정비 289 · 상관 게시판 197)이
     접지 않는 카드라 접기만으로는 더 못 줄인다 — **성격이 다른 카드가 한 줄에 섞여 있었다.**
   ⇒ 성격별로 넷으로 나눴다. **자주 쓰는 것(항해 준비)이 기본 탭**이다 —
     항구에 들를 때마다 보는 것(정비·급여·정박)과, 어쩌다 보는 것(패권 진행도)을
     같은 줄에 두면 자주 쓰는 쪽이 매번 스크롤 밑에 깔린다.
     ⚠️ **바닥에서 나가는 문(`salvageCard`)과 출항 단추는 탭 밖에 그대로 둔다** — 어느 탭을
     보고 있어도 항상 있어야 하는 자리라, 탭에 넣으면 "그 탭에서만 나갈 수 있다"가 된다. */
const SIDE_TABS = [
  { id: 'voyage', label: '항해' },   // 정비·급여·정박·선단 — 들를 때마다 보는 것
  { id: 'trade', label: '거래' },    // 계약·거점·시설·물류·세력 — 사업 벌이는 화면
  { id: 'goal', label: '목표' },     // 관영 조선소·조선의 끝·패권 — 최종 진행도
  { id: 'people', label: '사람' },   // 도시·부관·동료·항구 인물
];
let sideTab = 'voyage';           // 모듈 변수 — 세이브에 안 담는다(폴드와 같은 이유)

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

/* 「선박 정비」 카드 — 항해 탭의 머리(항구에 들를 때마다 보는 것). 접지 않는다. */
function shipCareCard() {
  return el('div.panel', {}, [
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
  ]);
}

function cityInfoCard() {
  return el('div.panel', {}, [
    el('h3', {}, el('span', { text: city.name })),
    el('div.city-card', {}, [
      el('div', {}, [
        el('span.cname', { text: city.name }),
        el('span.creg', { text: city.area }),
      ]),
      el('div.cblurb', { text: city.blurb }),
    ]),
  ]);
}

/* 탭 하나의 내용. null을 섞어 두면 `fold()`가 뜨지 않는 카드를 그대로 걸러 준다. */
function voyageTab() {
  return [
    /* 급여는 **때를 놓치면 사람이 떠나는 것**이라 정비보다 위다(74px밖에 안 든다) */
    payrollCard(),
    shipCareCard(),
    /* ⚠️ `portDayCost()`는 **갈래별 내역 객체**를 준다(state.js) — 예전에는 그것을 그대로
       `toLocaleString`해서 접힌 「정박」 머리말에 `하루 [object Object]닢`이 찍혔다.
       지금 나가는 몫은 `.now`다(`waitCard`의 `c3.now`·`c10.now`와 같은 갈래). */
    fold('wait', waitCard(), false, `하루 ${portDayCost().now.toLocaleString('ko-KR')}닢`),
    fold('fleet', fleetCard(), false, `동행 ${consortCount()}척`),
  ];
}

function tradeTab() {
  return [
    contractCard(),      // 계약은 기한이 있다 — 접지 않는다
    /* ★ 사주도 **기한이 있는 일감**이라 계약과 같은 줄에 두고 접지 않는다(G-2).
       상관 게시판의 또 한 줄이라는 것이 이 자리의 뜻이다. */
    guildOfferCard(),
    /* ★ **상단은 펼친 채로 둔다**(G-1). 회차 25가 세운 층이 화면에 처음 나오는 자리라
       접어 두면 "머리말만 있고 아무도 안 펴는 카드"가 된다 — 그것이 이 회차의 과녁이다.
       한 번 접으면 그 상태는 `foldOpen`이 세션 동안 기억한다. */
    fold('guild', guildCard(), true, null),
    fold('holding', holdingCard(), false,
         `${HOLDING_KEYS.filter((k) => ownsHolding(k, city.id)).length}개`),
    fold('works', worksCard(), false, null),
    fold('line', lineCard(), false, null),
    fold('harbor', harborCard(), false, null),
    fold('faction', factionCard(), false, null),
  ];
}

function goalTab() {
  return [
    /* ★ 목표는 이 탭 안에서는 접지 않는다 — 「관영 조선소」·「조선의 끝」은 이 회차의
       새 규칙과 최종 목표라 펼친 채로 둔다. 「패권」만 496px이라 접고 머리말에 `n/9`. */
    civicCard(),
    endingCard(),
    fold('hegemony', hegemonyCard(), false, `${hegemonyAll().have}/9 바다`),
    /* 조정 — 한반도 갈래에만 뜬다(§A-11 조선). 아직 부름이 없으면 무엇을 해야 오는지만 말한다. */
    fold('royal', royalCard(), false, royalProgress().title ?? null),
  ];
}

function peopleTab() {
  return [
    fold('city', cityInfoCard(), false, city.area),
    fold('officer', officerCard(), false, OFFICER.name),
    /* badge는 `null`이다 — 카드 제 머리에 이미 「N/M · 이 항구에 K명」이 있다(중복 방지). */
    fold('mate', mateCard(), false, null),
    fold('figure', figureCard(), false, null),
  ];
}

function sidePanel() {
  const content = { voyage: voyageTab, trade: tradeTab, goal: goalTab, people: peopleTab }[sideTab]();
  return el('div#port-side', {}, [
    /* ── 스크롤 영역 (2026-08-29 · 회차 24 재투입 · D-2 고침) ──────────────────
       ★ 예전에는 「출항하기」가 스크롤 콘텐츠의 **마지막 자식**이면서 `position:sticky`였다.
         sticky는 자기 자리(스크롤 흐름상 맨 아래)에 닿기 **전에도** 뷰포트 바닥에 미리 박혀,
         `scrollTop=0`일 때 그 자리에 우연히 걸린 카드(선박 정비의 「전부 수리」)를 그림으로
         덮어 버렸다 — 눌러도 「출항하기」가 눌리는 오조작이 가능했다(실측: `scrollTop 0~20`
         구간은 안 눌리고 `30~210`에서만 정상, `.playtest/round-24/_scroll-sweep.mjs`).
       ⇒ 출항 단추를 **스크롤 흐름 밖**으로 뺐다. `#port-side`를 세로 flex 두 칸(스크롤 영역
         `flex:1 1 auto` + 단추 `flex:0 0 auto`)으로 나누면, 단추는 항상 제 칸에만 있고
         카드는 그 칸을 절대 침범 못 한다 — sticky 없이도 "늘 붙어 있다"가 성립하고,
         뒤늦게 나타나 남을 덮는 일 자체가 구조적으로 없어진다. */
    el('div#port-side-scroll', {}, [
      /* ★ 바닥에서 나가는 문은 **맨 위**다(C-17), **탭 밖**이다. 이 카드가 뜨는 국면에서
         어느 탭을 보고 있어도 먼저 읽히지 않으면 "출구가 없다"가 그대로 재발한다. */
      salvageCard(),

      /* ★ **상단이 지금 나에게 하고 있는 일**은 탭 밖이다(G-3) — 신용장·호위는 사는 날이
         정해져 있고 압박은 그 자리를 뜨면 끝난다. 어느 탭을 보고 있어도 보여야 한다.
         아무 일도 없으면 `guildBanner()`가 null을 주고 띠 자체가 안 그려진다. */
      guildBanner(),

      /* ── 탭 구조 (회차 24) ── 큰 카드 넷이 한 줄에 섞여 5.5화면(640×360)이었다.
         성격별로 나누면 어느 탭도 640×360에서 2화면을 안 넘는다 — 아래 `_measure-side.mjs` 실측. */
      /* ★ **기본 탭은 「항해」다 — 「거래」를 한 번도 안 누르는 판이 있다.**
         사주는 기한이 있는 일감이라 못 보고 지나면 그걸로 끝난다(계약과 같은 성질인데
         계약은 이미 이 탭 안이다). 탭에 **점 하나**를 찍어 「저기 뭔가 있다」만 말한다 —
         이 저장소가 다섯 번 잃은 자리가 *"규칙은 서 있는데 화면이 말하지 않는다"*이다.
         ⚠️ 숫자를 적지 않는다. 탭은 34px이라 숫자를 넣으면 라벨이 접힌다. */
      el('div.yard-tabs', {}, SIDE_TABS.map((t) => {
        const dot = t.id === 'trade' && state.guildOffer && state.guildOffer.until > state.day;
        return el(`button.yard-tab${t.id === sideTab ? '.on' : ''}`, {
          title: dot ? '상단이 낸 사주가 걸려 있다 — 기한이 있다' : null,
          onclick: () => { sideTab = t.id; buildUI(); },
        }, [
          el('span', { text: t.label }),
          dot ? el('span.tab-dot', { text: '•' }) : null,
        ]);
      })),
      ...content,
    ]),

    /* 사람이 하나도 없으면 배는 부두에 묶여 있다.
       ★ crewMin **미달**은 막지 않는다 — 그건 속력이 떨어지는 벌칙이지 금지가 아니고,
         전투로 선원을 잃었을 때 항구에 갇히면 빠져나갈 길이 없어진다.
         0명만 막는 이유는 그 상태가 "출항"이라는 말 자체가 성립하지 않기 때문이다. */
    /* ★ 이 단추는 패널 아래에 **붙어 있어야 한다**, **탭 밖**이다. 이제 스크롤 영역의
       형제(sibling)라 스크롤이 어디에 있든 늘 같은 자리에 있다 — sticky가 아니라 **그 자체가
       칸**이다. 탭에 넣으면 "그 탭에서만 나갈 수 있다"가 된다 — 출항은 이 화면에서 나가는
       유일한 길이라, 어느 탭을 보고 있어도 늘 있어야 한다. */
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
