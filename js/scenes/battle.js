// scenes/battle.js — 해상 전투
//   1단계 포격전: 거리 조절 + 조준 미니게임
//   2단계 백병전: 접현 후 갑판 난투 (병종 상성 + 커맨드)

import { VW, openSeaSprite, blastSprite, smokeSprite, splashSprite, ballSprite } from '../sprites/scene.js';
import { shipSprite, WATERLINE, SW, HULLS, railAt } from '../sprites/ship.js';
import { unitSprite, pirateSprite, CHAR_FOOT, CW } from '../sprites/char.js';
/* 명부(40명)를 이름으로 찾기 위한 것뿐이다 — `scenes/map.js`가 이미 같은 자리에서 가져다 쓴다.
   ★ **해적이 어느 바다 사람인가는 명부가 정본이다**(`base` 소굴 항구 → `regions/index.js`가
     달아 주는 `region`). 예전에는 그림 쪽(`sprites/char.js`)에 `PIRATE_SEA` 40줄이 따로 있어
     명부가 늘 때마다 두 곳을 고쳐야 했다(ART-ISSUES B-1) — 그 표는 걷었다. */
import { ALL_PIRATES } from '../regions/index.js';
/** 명부 id → 정의. 40명뿐이라 한 번 만들어 두고 매 프레임 쓴다. */
const PIRATE_DEF = new Map(ALL_PIRATES.map((d) => [d.id, d]));
/* `blitTinted`는 실루엣만 단색으로 찍는다 — 백병전 피격 플래시·쓰러지는 병사에 쓴다.
   ⚠️ `js/pixel.js`·`js/sprites/**`는 **읽기 전용**이다(아트 테스터가 동시에 만진다).
      여기서는 부르기만 한다. 그 함수는 부를 때마다 캔버스를 새로 만드므로(bake 캐시를 안 탄다)
      **플래시가 살아 있는 몇 프레임·몇 유닛에만** 쓴다. → DEV-B-ISSUES #4 */
import { blit, blitTinted } from '../pixel.js';
/* 조우 손실의 몫·상한·선원 바닥은 **`data.js: ENCOUNTER_LOSS` 한 벌이 정본**이다.
   `scenes/map.js`(도주)가 이 파일의 두 함수를 그대로 불러 **같은 값을 본다**. */
import { TROOPS, GOOD_BY_ID, SHOTS, SHOT_KEYS, SHIPS, ENCOUNTER_LOSS, PRIZE_SCRAP } from '../data.js';
import {
  state, ship, playerTroops, pushLog, cargoFree, armsFactor, armsAimAt, trimLoadout,
  shotStock, useShot, fleeBonus, fleeOdds, fleeWord, crewLossFactor, shipSpeed, captureShip, PRIZE_HULL, regionOf,
  originPerk, matePerk, recordSlain, oweBounty,
  /* 동행 선단 — **규칙은 전부 state.js의 순수 함수**이고 여기서는 부르기만 한다.
     포화력이 얹히고(consortGunBonus), 갑판이 두꺼워지고(consortMeleeBoost),
     맞는 것을 나눠 받는다(spreadDamage — 크게 상한 배는 여기서 가라앉는다). */
  consortCount, consortGunBonus, consortMelee, consortMeleeBoost, spreadDamage,
  /* ★ 기함은 여기서 가라앉지 않는다 — **패배 처리**가 따로 있고(C-13 N4),
     그 판정과 실행이 이 둘이다. 삭은 배로 졌을 때만 걸린다. */
  flagshipSinks, sinkFlagship,
  /* 세력 — 함대를 꺾으면 그 집 장부에 이름이 붉게 적힌다(−4) */
  fleetSlain,
  /* ★★ **나포의 둘째 문턱은 선원이다**(회차 28 다-1 · `data.js: PRIZE_CREW`).
     `captureShip`은 `spareCrew() < prizeCrewNeed(key)`면 **말없이 해체**로 간다(`why:'crew'`).
     화면은 그동안 `state.fleet[prizeKey]`(같은 선종 보유)만 보고 「예인하면 선단에 들어온다」고
     적었다 — 규칙이 서 있는데 화면이 딴 말을 하던 자리다. 여기서 둘 다 본다. */
  spareCrew, prizeCrewNeed, capSpoils,
  /* 패배가 **원양을 막지 않게** 하는 선원 바닥이 이 문턱을 정본으로 쓴다(ⓒ) */
  OCEAN_CREW_MIN,
} from '../state.js';
import { el, overlay, toast, modal, refreshHUD, refreshLog, bar, josa, spriteElTrim } from '../ui.js';
import { go } from '../main.js';
/* 연출 대기는 전부 배속을 거친다 — 규칙(피해·확률·거리)은 건드리지 않는다. → js/speed.js
   ★ `speed`(계수 자체)를 함께 가져오는 이유: 백병전 연출은 `after`가 아니라 **프레임(dt)**으로 돈다.
     대기만 8배로 줄고 그림은 실시간으로 남으면 라운드가 끝난 뒤에도 병사가 계속 찌른다 —
     그래서 이 씬의 연출 시계는 `dt * speed.mul`로 감는다. **규칙 수치에는 절대 안 쓴다.** */
import { after, speed } from '../speed.js';

const SEA_Y = 138;          // 두 배가 떠 있는 기준 수면 y
const MIN_RANGE = 0, MAX_RANGE = 100;
/** 교전 거리 → 두 배 사이의 화면상 간격 (양끝에서 잘리지 않는 범위로 묶는다) */
const gapOf = (range) => 14 + (range / MAX_RANGE) * 68;

let B = null;               // 전투 상태
let fx = [];                // 이펙트 목록

/* ══════════════════════════════════════════════════════════════
   동료 특전 둘 — `gunUp`·`crewLossOff` (A-5의 남은 것)
   ══════════════════════════════════════════════════════════════
   ★ 나머지 여덟은 `state.js`가 겹치는데 이 둘만 **전투 씬 안쪽**이라 여기서 겹친다.
     값을 합치는 것은 여전히 `state.js: matePerk()`이고 — 부관(`OFFICER.perks`)·
     갈래(`ORIGINS`)와 **같은 키**를 본다. 새 계산 경로를 파지 않는다:
     `meleeUp`이 이미 `(1 + originPerk(k) + matePerk(k))` 꼴로 곱해지고(meleeRound),
     여기 둘도 그 자리에 그대로 얹는다.

   ★ 상한을 두는 이유 — `state.js`의 선례(`hullUp` .35 · `fleeUp` .25 · `sailDaysOff` .30)와 같다.
     명부 51명 중 포수는 여덟(합 0.86) · 외과의·갑판장은 일곱(합 0.87)이고 갑판에 여덟까지
     태울 수 있다(`mateCap()`). 상한이 없으면 **포수만 모아 태운 배가 전투를 지운다** —
     사상 −87%면 등급 5 격파(패권 조건 ③)가 헐거워진다. 0.30은 "포수 셋"쯤이다.

   ★ `gunUp`을 명중과 피해에 **나눠** 싣는다. 둘 다 온전히 곱하면 1.30 × 1.30 = 1.69로
     복리가 되고, 포수 셋이 대포를 두 배로 만든다. 포수가 버는 것은 화약이 아니라
     **정조준**이라 명중에 온전히, 피해에는 절반만 준다(`GUN_PERK_DMG_SHARE`).
     ⚠️ 되돌리기 쉽게 상수 셋을 여기 모아 둔다. */
const GUN_PERK_CAP = 0.30;          // gunUp 합산 상한
const GUN_PERK_DMG_SHARE = 0.5;     // 그중 피해에 실리는 몫 (나머지는 명중에만)
const CREW_LOSS_PERK_CAP = 0.30;    // crewLossOff 합산 상한

/** 동료 포수들이 벌어 주는 포격 보정 (0~GUN_PERK_CAP) */
const gunPerk = () => Math.min(GUN_PERK_CAP, matePerk('gunUp'));
/** 전투 사상에 곱하는 배율 — 외과의·갑판장이 있으면 1보다 작다 */
const crewLossPerk = () => 1 - Math.min(CREW_LOSS_PERK_CAP, matePerk('crewLossOff'));

/* ══════════════════════════════════════════════════════════════
   조우 손실의 상한 — 「적도 옮겨 실을 수 있는 만큼만 가져간다」
   ══════════════════════════════════════════════════════════════
   실측·설계는 `.playtest/round-22/DEV-B-ISSUES.md`(PM 지시 절)가 정본이다. 요약만 둔다.

   ★ **왜 필요했나** — 패배(금고 ×0.50)도 도주(×0.12)도 **비율이고 상한이 없었다.**
     조우는 드물지 않다(100일에 5.5~9.0회). 비율 손실 × 잦은 조우는 금고에
     **자연 상한**을 만든다: `G* = P/(q·r)` — 그 위로는 버는 족족 걷어간다.
     *올바른 플레이*(언제나 싸우기 전 도주)조차 항차 이익의 23배에서 멈춰,
     패권 거점 총투자 912,630닢에 닿는 문이 구조적으로 닫혀 있었다.

   ★ **왜 이 모양인가** — 새 상한을 발명하지 않았다. 이 게임은 *내가* 얻는 전리품을 이미
     「옮겨 실을 수 있는 만큼」으로 누른다(`data.js: SPOILS_*` · `state.js: capLoot`),
     그리고 그 양을 **갑판의 사람 수**로 잰다(`spoilsGoodsLimit`: 선원 25명마다 한 품목).
     **없던 것은 그 대칭뿐이다.** 그래서 같은 자를 반대로 대어 준다 —
     적 갑판에 선 사람 수가 그들이 지고 갈 수 있는 양을 정한다.

   ⚠️ **`capSpoils`의 꼬리(tail)는 일부러 안 가져왔다.** 그대로 뒤집으면
     `0.5G → 0.3G + 0.2G×0.12 = 0.324G`로 **여전히 비율**이라 천장이 낮아질 뿐 안 걷힌다
     (실측: `probe-purse.mjs` ⑥). 게다가 "질 수 있는 만큼보다 조금 더 진다"는 말이 안 된다.
     플레이어 쪽 꼬리는 *"큰 놈이 더 값나가게"*라는 다른 이유로 있는 것이다.

   ⚠️ **패배의 아픔은 화물이 짊어진다.** 금화에만 상한을 두고 **화물 전량 상실은 그대로**다.
     화물 손실은 쌓인 재산이 아니라 **한 항차의 밑천**에 비례해 천장을 안 만든다.
     ⇒ 지는 것은 여전히 아프고, 다만 **다시 설 수 있게** 아프다.

   ⓘ 최종 거처는 `js/data.js: ENCOUNTER_LOSS`다(PM 결정 · 개발자 A가 넣는 중).
     그 블록이 들어오면 **이 상수만 지우고 import로 갈아 끼운다** — 식은 그대로다.
     `scenes/map.js`(도주)가 **이 파일의 이것을 그대로 본다.** 각자 계산하면 반드시 어긋난다. */
/** 저 갑판이 지고 갈 수 있는 금화 — 살아남은 사람 수로 잰다.
    ★ 전투 끝에 저쪽 갑판을 비워 놓았다면 **덜 실어 간다**(포도탄이 값을 하는 자리).
    적 선원 수를 못 읽으면 등급으로 어림잡는다(`crewPerLevel`). */
export function encounterLossCap(foeCrew = 0, level = 1) {
  const crew = foeCrew > 0 ? foeCrew : Math.max(1, level) * ENCOUNTER_LOSS.crewPerLevel;
  return Math.max(ENCOUNTER_LOSS.floor, Math.round(crew * ENCOUNTER_LOSS.perCrew));
}

/** 조우로 잃는 금화 — 비율로 재고 **상한에서 꺾는다**. 패배·도주가 같은 이 함수를 쓴다.
    ★ 딱 자르지 않고 `tail`만큼 더 간다 — `capSpoils`와 **같은 모양**이고, 그래야
      *"큰 놈에게 지는 것이 여전히 더 아프다"*가 남는다. 그 대신 천장이 `1/tail`배로 물러난다. */
export function capEncounterLoss(raw, foeCrew = 0, level = 1) {
  const v = Math.max(0, raw);
  const cap = encounterLossCap(foeCrew, level);
  return Math.round(v <= cap ? v : cap + (v - cap) * ENCOUNTER_LOSS.tail);
}

/* ══════════════════════════════════════════════════════════════
   백병전 연출 상수 (§D — **연출만**이다)
   ══════════════════════════════════════════════════════════════
   ★ 여기 있는 것은 전부 **초(sec)와 픽셀**뿐이다. 피해·확률·라운드 수·선원 사상은
     한 줄도 안 건드린다 — 같은 씨앗이면 연출을 켜기 전과 **같은 결과**여야 한다.
   ★ 시계는 전부 `dt * speed.mul`로 감긴다(위 import 주석). 배속을 올리면 그림도 같이 빨라진다. */
const MELEE_LUNGE_SEC = 0.42;   // 찌르고 돌아오는 한 동작
const MELEE_LUNGE_PX  = 7;      // 앞으로 나가는 최대 거리
const MELEE_FLASH_SEC = 0.22;   // 맞은 병사가 하얗게 뜨는 시간 — 길면 유령처럼 보인다
const MELEE_FALL_SEC  = 0.55;   // 쓰러진 병사가 가라앉으며 사라지는 시간
const MELEE_FALL_PX   = 9;      // 그동안 내려앉는 높이
const FLASH_COLOR = '#fff2d8';  // 피격 — 등불빛에 가까운 흰색
const FALL_COLOR  = '#3b1512';  // 전사 — 그늘로 내려앉는 어두운 핏빛

/* ── 접현하면 카메라가 들어간다 (§D — 연출만) ──────────────────
   ★ **사람이 배에 비해 너무 컸다**(사용자 지적). 실측: 사람 실질 키 40px(`char.js` 48×48·FOOT 45)에
     캐랙 선체 124px ⇒ **배÷사람 3.1**. 실선은 캐랙 25m ÷ 1.7m ≒ **19**다. 곧 갑판에 선 것은
     키 6~10m짜리 거인이었다.

   ★ **줌인으로는 한 톨도 안 고쳐진다.** 배와 사람이 함께 커지므로 `배÷사람`은 그대로고,
     오히려 사람이 화면의 절반을 먹어 더 나빠 보인다. 고쳐야 하는 것은 카메라가 아니라
     **선체 배율**이다 — 접현하면 **선체만** `MELEE_HULL_SCALE`배로 그리고 **사람은 48px 그대로** 둔다.
     배가 화면 밖으로 잘리는 것이 바로 그 효과다: 사람이 *보이는 뱃전*의 작은 일부가 된다.

   ★ **포격 단계는 한 픽셀도 안 바꾼다.** 두 배 전체가 보이는 지금 구도가 포격전의 정보다
     (거리·풍상·포문). 배율은 `B.phase === 'melee'`에서만 붙는다.

   ★ 순간이동이 아니라 **밀고 들어간다** — `갈고리가 걸렸다` 로그와 함께 배율이 오른다.
     ⚠️ 시계는 다른 백병 연출과 **같이 `dt * speed.mul`을 탄다**. 안 그러면 8배속에서 이 한 컷이
        1:1로 돌아 러너가 멈춘 줄 안다. */
const MELEE_HULL_SCALE = 3;     // 접현했을 때 선체 배율 — **사람에는 안 곱한다**
const MELEE_ZOOM_SEC   = 0.62;  // 밀고 들어가는 시간
const MELEE_DECK_Y     = 146;   // 다 들어왔을 때 갑판선이 앉는 화면 y
const MELEE_TOUCH_PX   = -3;     // 두 뱃전 사이에 남기는 틈 — 간격은 **선체에서 뽑는다**(아래)
const MELEE_STAND_PX   = 16;    // 병사 사이 간격 — **화면 픽셀**이라 배율을 안 탄다
const MELEE_RAIL_BACK  = 22;    // 맞닿은 뱃전에서 이만큼 물러서서 줄이 시작한다
const MELEE_FOOT_SINK  = 2;     // 뱃전 윗선보다 이만큼 아래에 발을 둔다 (난간 뒤에 선 느낌)

/* ══════════════════════════════════════════════════════════════
   포격전의 바람 — 풍상(weather gauge) (§D)
   ══════════════════════════════════════════════════════════════
   설계와 버린 안은 `.playtest/round-22/DEV-B-ISSUES.md` ③이 정본이다. 요약만 둔다.

   ★ **`fleeOdds`에 한 톨도 안 들어간다.** 조우 카드가 싸우기 전에 보여 준 도주 가망이
     그대로 참이어야 하기 때문이다 — 바람은 전투가 열린 뒤에 알게 되는 것이라, 그것이
     도주율을 깎으면 **안내가 거짓말이 된다.** 풍하를 잡았으면 광고된 그 확률로 도망칠 수 있다.
     「사람은 이길 수 있는 상대만 싸운다」가 이 설계의 첫 제약이었다.
   ★ 방향이 화면과 맞다 — 우리 배가 왼쪽, 적이 오른쪽이다.
     **하늬바람(서풍)은 왼쪽→오른쪽**이라 우리가 풍상이고, 샛바람(동풍)은 그 반대다.
   ⚠️ 되돌리기 쉽게 손잡이를 셋으로 모았다. `WIND_AIM_EDGE = 0`이면 **연출만** 남는다. */
const WIND_AIM_EDGE     = 0.06;   // 풍상을 쥔 쪽이 얻는 조준 보정 — 규칙에 닿는 것은 이 하나뿐
const WIND_SMOKE_DRIFT  = 18;     // 포연이 바람에 밀리는 거리(px) — 연출 전용
const WIND_STREAKS      = 18;     // 수면의 바람결 개수 — 연출 전용

/** 이 판의 바람을 정한다. 빠른 배가 풍상을 잘 쥔다 — `fleeOdds`가 쓰는 계수(0.25) 그대로다. */
function rollWind(enemy) {
  const foeSpd = SHIPS[enemy.hull]?.speed ?? 1;
  const p = Math.max(0.2, Math.min(0.8, 0.5 + (shipSpeed() - foeSpd) * 0.25));
  const mine = Math.random() < p;
  return {
    mine,
    dir: mine ? 1 : -1,                       // 화면에서 바람이 부는 쪽 (+1 = 왼→오른)
    name: mine ? '하늬바람' : '샛바람',
    t: 0,                                     // 바람결이 흐른 시간 (배속을 탄다)
  };
}
/** 지금 이 편이 풍상인가에 따른 조준 보정 */
const windEdge = (mine) => (B.wind && B.wind.mine === mine ? WIND_AIM_EDGE : 0);

/** 찌르기 곡선: 빠르게 나가고(0~18%) **멈춰 있다가**(~45%) 천천히 돌아온다.
    가운데의 멈춤이 히트스톱이다 — 타격이 닿은 순간을 눈이 붙잡는 자리. */
function lungeCurve(v) {
  const u = 1 - Math.max(0, Math.min(1, v));      // 진행도 0→1
  if (u < 0.18) return u / 0.18;
  if (u < 0.45) return 1;
  return Math.max(0, 1 - (u - 0.45) / 0.55);
}

/** 밀고 들어가는 곡선 — 처음이 빠르고 끝에서 멎는다(smoothstep). */
const zoomCurve = (u) => u * u * (3 - 2 * u);

/** 지금 백병 화면의 **카메라와 선체 배율**.
    ★ 선체만 `k`배로 그리고 사람은 1배 그대로다 — 그것이 이 화면의 전부다(위 §D 주석).
    ★ 두 뱃전이 맞닿는 **간격도 선체에서 뽑는다.** 상수(예전 62)로 두면 작은 배는 멀찍이
      떨어져 물 위에서 싸우고 큰 배는 서로 파고든다. 식은 그림 배치의 역산이다 —
      `yourX = VW/2 − gap − SW·0.62` · `foeX = VW/2 + gap − SW·0.38`이므로
      두 선체 끝 사이 거리 = `2·gap + 1.24·SW − (내 x0+len) − (적 x0+len)`. */
function meleeView() {
  const y = HULLS[ship().hull], f = HULLS[B.enemy.hull];
  const u = zoomCurve(Math.max(0, Math.min(1, B.meleeZoom ?? 1)));
  const k = 1 + (MELEE_HULL_SCALE - 1) * u;
  const gapTo = ((y.x0 + y.len) + (f.x0 + f.len) + MELEE_TOUCH_PX - SW * 1.24) / 2;
  const gap0 = B.gap0 ?? gapTo;
  /* ★ **맞닿는 자리는 화면 한가운데가 아니다.** 두 선체의 `x0+len`이 다르면 이물이 만나는
     곳이 그 차이의 절반만큼 밀린다 — 선체 스프라이트는 176px 판 안에서 저마다 다른 자리에
     그려지기 때문이다. 이것을 `VW/2`로 두었더니 hulk↔슈퍼프리깃에서 **우리 병사 둘이
     상대 뱃머리 위에 섰다**(선종 훑기에서 잡았다). 그래서 월드 기준점은 실제 이물이고,
     화면에서는 그 자리를 한가운데(`VW/2`)로 끌어온다. */
  const CX = VW / 2 + ((y.x0 + y.len) - (f.x0 + f.len)) / 2;
  const FX = CX + (VW / 2 - CX) * u;                   // u=0이면 지금 자리 그대로 — 튀지 않는다
  const CY = SEA_Y - WATERLINE + (y.deck + f.deck) / 2;  // 갑판선 (흔들림은 안 넣는다)
  const FY = CY + (MELEE_DECK_Y - CY) * u;             // u=0이면 지금까지와 같은 자리
  return {
    u, k, CX, CY, FX, FY,
    gap: gap0 + (gapTo - gap0) * u,
    sx: (x) => FX + (x - CX) * k,
    sy: (v) => FY + (v - CY) * k,
    /** 화면 x → 월드 x (병사가 선체 어디에 서 있나를 되짚는다) */
    wx: (x) => CX + (x - FX) / k,
  };
}

/** 지금 선체 배율 — **연출 검증용 읽기 창구**다(캡쳐 자막에 비율을 적는다). 게임은 안 쓴다. */
export const meleeScaleNow = () => (B && B.phase === 'melee' ? meleeView().k : 1);

/* 이름이 없는 상대의 첫마디 — 세기가 곧 성격이다.
   명부에서 온 자는 제 대사(`lines.hail`)를 쓰므로 여기까지 오지 않는다. */
const OPENING = {
  1: '저쪽 갑판에서 누군가 소리친다. “돛을 내려라!”',
  2: '뱃전에 사람이 늘어선다. 익숙한 손놀림이다.',
  3: '상대가 포문을 연다 — 세어 볼 것도 없이 이쪽보다 많다.',
  4: '깃발이 오른다. 이 이름을 아는 배는 대개 싸우지 않고 짐을 내린다.',
  5: '상대가 속도를 줄이지 않는다. 이쪽을 이미 제 것으로 셈한 자세다.',
};

/** 이 상대를 무엇이라 부르나 — 나포·격침 문구가 갈리는 기준이다 */
const foeKind = (e) =>
  e.nation === '상인' ? 'merchant'
  : (e.flag === 'pirate' || e.nation === '해적') ? 'pirate'
  : 'navy';

/* ══════════════════════════════════════════════════════════════
   진입 / 상태
   ══════════════════════════════════════════════════════════════ */
export const battleScene = {
  enter({ enemy, onEnd, retreatTo }) {
    B = {
      enemy,
      onEnd, retreatTo,
      bg: openSeaSprite(Math.random() < 0.25 ? 'dusk' : 'day'),
      phase: 'gunnery',          // gunnery | melee | over
      range: 78,
      turn: 'player',
      busy: false,
      /* `aux`는 동행선이 얹어 주는 **실효 포문 수**다. 전투가 시작될 때 한 번 재는 이유는
         싸우는 도중 배가 가라앉아도 이미 사거리 안에 든 포는 계속 쏘기 때문이고,
         무엇보다 매 발 다시 세면 격침 직후 화력이 툭 끊겨 읽히지 않기 때문이다. */
      you: { hp: state.hp, maxHp: state.maxHp, crew: state.crew, guns: state.guns, sailDmg: 0, fire: 0,
             aux: consortGunBonus(), consorts: consortCount() },
      foe: { hp: enemy.hp, maxHp: enemy.hp, crew: enemy.crew, guns: enemy.guns, sailDmg: 0, fire: 0 },
      wind: rollWind(enemy),     // 이 판의 풍상 — 위 주석이 정본
      shot: 'round',             // 다음 발에 재어 넣을 탄
      saved: false,              // 4부 격실로 한 번 버텼는가
      aim: null,
      shake: 0,
      melee: null,
      log: [],
    };
    fx = [];
    state.stats.battles++;
    /* 첫 줄을 상대에게 준다. 명부(`regions/<권역>/npc-pirates.js`)에 적혀 있던 `lines.hail`이
       여기서 처음 화면에 뜬다 — 없는 상대는 급으로 대신한다. 이 한 줄이 있고 없고가
       "바르바로사와 붙었다"와 "적선과 붙었다"를 가른다. */
    logLine(enemy.hail ?? OPENING[enemy.level] ?? OPENING[1], 'warn');
    /* ★ **바람을 먼저 말한다.** 규칙이 멀쩡한데 화면이 말하지 않아 수백 일을 잃는 그 자리다 —
       풍하를 잡았다는 것을 알아야 "그럼 도망친다"를 고를 수 있고, 도주 가망은 바람과
       무관하게 조우 카드가 보여 준 그대로다(위 주석). */
    logLine(B.wind.mine
      ? `${B.wind.name}이 우리 뒤에서 분다 — 풍상을 쥐었다. 포연이 저쪽으로 흐른다.`
      : `${B.wind.name}이 정면으로 온다 — 풍상은 저쪽이다. 조준이 한 뼘 밀린다.`,
      B.wind.mine ? 'good' : 'bad');
    buildUI();
  },

  exit() { B = null; fx = []; },

  update(dt, t) {
    if (!B) return;
    /* 흔들림도 연출이라 배속을 탄다 — 8배에서 화면이 계속 떨고 있던 것을 여기서 멎게 한다 */
    B.shake = Math.max(0, B.shake - dt * speed.mul * 3.4);
    if (B.wind) B.wind.t += dt * speed.mul;      // 바람결도 연출이라 배속을 탄다
    // 백병전 연출 시계 — 대기(`after`)와 같은 배속으로 감아야 라운드와 어긋나지 않는다
    if (B.melee) {
      const ds = dt * speed.mul;
      // 접현 카메라도 같은 배속을 탄다 — 8배속에서 이 한 컷만 1:1로 돌면 멈춘 줄 안다
      if (B.meleeZoom < 1) B.meleeZoom = Math.min(1, B.meleeZoom + ds / MELEE_ZOOM_SEC);
      for (const u of [...B.melee.you, ...B.melee.foe]) {
        if (u.lunge > 0) u.lunge = Math.max(0, u.lunge - ds / MELEE_LUNGE_SEC);
        if (u.flash > 0) u.flash = Math.max(0, u.flash - ds / MELEE_FLASH_SEC);
        if (u.fall  > 0) u.fall  = Math.max(0, u.fall  - ds / MELEE_FALL_SEC);
      }
    }
    if (B.aim) {
      B.aim.pos += B.aim.dir * B.aim.speed * dt;
      if (B.aim.pos > 1) { B.aim.pos = 1; B.aim.dir = -1; }
      if (B.aim.pos < 0) { B.aim.pos = 0; B.aim.dir = 1; }
      const needle = document.getElementById('aim-needle');
      if (needle) needle.style.left = (B.aim.pos * 100) + '%';
    }
    for (const f of fx) f.t += dt;
    fx = fx.filter((f) => f.t < f.life);
    void t;
  },

  draw(ctx, t) {
    if (!B) return;
    const sh = B.shake > 0 ? Math.round((Math.random() - 0.5) * B.shake * 5) : 0;
    ctx.save();
    ctx.translate(sh, Math.round(sh * 0.4));
    blit(ctx, B.bg, 0, 0, 1);
    /* 접현해 들어가면 수면의 바람결은 걷는다 — 그것만 배율을 안 타 뱃전 위로 흐르기 때문이다.
       포격 단계에서는 지금까지와 완전히 같다(§D). */
    const mv = B.phase === 'melee' ? meleeView() : null;
    drawWindStreaks(ctx, mv ? 1 - mv.u : 1);   // 배보다 먼저 — 뱃전 아래 물결이라 선체를 가리지 않는다

    /* 백병전은 두 선체가 현측을 맞댄 상태로 고정한다.
       ★ 간격도 배율도 **선체에서 뽑는다**(`meleeView`) — 상수로 두면 선종마다 어긋난다. */
    const gap = mv ? mv.gap : gapOf(B.range);
    const k = mv ? mv.k : 1;
    const bobA = Math.sin(t * 1.1) * 1.6;
    const bobB = Math.cos(t * 1.3) * 1.6;

    // 우리 배 (왼쪽, 오른쪽을 향함)
    const yourX = Math.round(VW / 2 - gap - SW * 0.62);
    const yourY = SEA_Y - WATERLINE + Math.round(bobA);
    blit(ctx, shipSprite(ship().hull, {
      tint: ship().tint, flag: 'venice',
      furl: B.phase === 'melee',
      firing: B.fireFlash === 'you' ? 2 : -1,
      damaged: dmgLevel(B.you),
    }), mv ? mv.sx(yourX) : yourX, mv ? mv.sy(yourY) : yourY, k);

    // 적선 (오른쪽, 좌우 반전해 왼쪽을 향함)
    const foeX = Math.round(VW / 2 + gap - SW * 0.38);
    const foeY = SEA_Y - WATERLINE + Math.round(bobB);
    blit(ctx, shipSprite(B.enemy.hull, {
      tint: B.enemy.tint, flag: B.enemy.flag,
      furl: B.phase === 'melee',
      firing: B.fireFlash === 'foe' ? 2 : -1,
      damaged: dmgLevel(B.foe),
    }), mv ? mv.sx(foeX) : foeX, mv ? mv.sy(foeY) : foeY, k, true);

    if (mv) drawMelee(ctx, mv, yourX, foeX, bobA, bobB);

    drawFx(ctx);
    ctx.restore();
  },
};

const dmgLevel = (s) => s.hp / s.maxHp < 0.3 ? 2 : s.hp / s.maxHp < 0.62 ? 1 : 0;

/* ══════════════════════════════════════════════════════════════
   이펙트
   ══════════════════════════════════════════════════════════════ */
function addFx(kind, x, y, life = 0.5) { fx.push({ kind, x, y, t: 0, life }); }

/** 수면의 바람결 — 뱃전 아래(y 150~214)를 바람 방향으로 흐른다. **연출 전용**이다.
    자리는 인덱스에서 뽑으므로 난수를 안 쓴다(매 프레임 튀지 않는다). */
function drawWindStreaks(ctx, fade = 1) {
  const w = B?.wind;
  if (!w || WIND_STREAKS <= 0 || fade <= 0.01) return;
  const span = VW + 48;
  ctx.save();
  ctx.fillStyle = `rgba(226,240,248,${(0.34 * fade).toFixed(3)})`;
  for (let i = 0; i < WIND_STREAKS; i++) {
    const seed = i * 97 + 13;
    const y = 150 + ((seed * 13) % 64);
    const len = 3 + (seed % 5);
    const spd = 13 + (seed % 11);          // 앞쪽 물결이 빨라 깊이가 생긴다
    let x = ((seed * 31) % span) + w.dir * w.t * spd;
    x = (((x % span) + span) % span) - 24;
    ctx.fillRect(Math.round(x), y, len, 1);
  }
  ctx.restore();
}

function drawFx(ctx) {
  for (const f of fx) {
    const u = f.t / f.life;
    if (f.kind === 'blast') {
      const fr = Math.min(3, Math.floor(u * 4));
      const s = blastSprite(fr);
      blit(ctx, s, f.x - s.width / 2, f.y - s.height / 2, 1, false, 1 - u * 0.3);
    } else if (f.kind === 'smoke') {
      const fr = Math.min(3, Math.floor(u * 4));
      const s = smokeSprite(fr);
      // 포연은 뜨면서 **바람을 탄다** — 이 한 줄이 화면에서 바람을 가장 크게 말한다(연출 전용)
      const drift = (B?.wind?.dir ?? 0) * u * WIND_SMOKE_DRIFT;
      blit(ctx, s, f.x - s.width / 2 + drift, f.y - s.height / 2 - u * 10, 1, false, 0.85 - u * 0.7);
    } else if (f.kind === 'splash') {
      const fr = Math.min(3, Math.floor(u * 4));
      const s = splashSprite(fr);
      blit(ctx, s, f.x - s.width / 2, f.y - s.height + 4, 1, false, 1 - u * 0.4);
    } else if (f.kind === 'ball') {
      const s = ballSprite();
      const x = f.x + (f.x2 - f.x) * u;
      const y = f.y + (f.y2 - f.y) * u - Math.sin(Math.PI * u) * 22;
      blit(ctx, s, x, y, 1);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   포격전
   ══════════════════════════════════════════════════════════════ */
function startAim() {
  if (B.busy) return;
  // 거리가 가까울수록 판정대가 넓다.
  // 여기에 실린 대포의 조준 배율이 곱해지는데, 그 값은 거리마다 다르다 —
  // 대포마다 잘 맞는 구간(CANNONS.near~far)이 있어 밖으로 나가면 무너진다.
  const closeness = Math.max(0, Math.min(1, 1 - B.range / MAX_RANGE));
  /* 동료 포수는 판정대를 넓힌다 — 포문의 조준 배율과 **같은 자리**에 곱한다(A-5 gunUp).
     풍상을 쥐었으면 여기에 한 뼘 더 붙는다(§D · `WIND_AIM_EDGE`) — 바람이 규칙에 닿는 곳은 여기뿐이다. */
  const aim = armsAimAt(B.range) * (1 + gunPerk() + windEdge(true));
  const goodW = (0.20 + closeness * 0.24) * aim;
  const critW = (0.05 + closeness * 0.06) * aim;
  const center = 0.30 + Math.random() * 0.40;
  /* 바늘은 0~1만 오가므로 판정대를 [0,1]로 자르는 것은 **판정을 바꾸지 않는다**(p≥0·p≤1은 항상 참).
     자르는 이유는 화면뿐이다 — 넓어진 띠가 패널 밖으로 삐져나가 안 보인다. */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  B.aim = {
    pos: 0, dir: 1,
    speed: 0.85 + Math.random() * 0.35 + B.range / 260,
    good: [clamp01(center - goodW / 2), clamp01(center + goodW / 2)],
    crit: [clamp01(center - critW / 2), clamp01(center + critW / 2)],
  };
  buildUI();
}

function fire() {
  const a = B.aim;
  if (!a) return;
  const p = a.pos;
  let grade = 'miss';
  if (p >= a.crit[0] && p <= a.crit[1]) grade = 'crit';
  else if (p >= a.good[0] && p <= a.good[1]) grade = 'good';
  B.aim = null;
  B.busy = true;

  // 재어 넣은 탄을 실제로 쓴다. 재고가 떨어졌으면 일반탄으로 물러난다.
  const shotKey = useShot(B.shot) ? B.shot : 'round';
  const SHOT = SHOTS[shotKey];
  if (shotKey !== B.shot) B.shot = 'round';
  buildUI();

  const gap = gapOf(B.range);
  const fromX = VW / 2 - gap - 10, toX = VW / 2 + gap + 10;
  B.fireFlash = 'you';
  addFx('smoke', fromX, SEA_Y - 22, 0.9);
  addFx('ball', 0, 0, 0.42);
  Object.assign(fx[fx.length - 1], { x: fromX, y: SEA_Y - 24, x2: toX, y2: SEA_Y - 26 });
  B.shake = 0.5;
  after(() => { B.fireFlash = null; }, 160);

  after(() => {
    if (!B) return;
    if (grade === 'miss') {
      addFx('splash', toX + 12, SEA_Y + 6, 0.55);
      logLine(`${SHOT.name}이 빗나가 물기둥만 솟았다.`);
    } else {
      // 동행선의 포가 함께 쏜다 — 조준은 기함 것이라 전부는 못 얹는다(data.js: FLEET.gunShare)
      // 동료 포수의 몫은 **절반만** 여기 실린다 — 나머지 절반은 조준폭이 이미 받았다(A-5 gunUp)
      const base = (4 + (B.you.guns + B.you.aux) * 1.15) * armsFactor('dmg') * SHOT.dmg
                 * (1 + gunPerk() * GUN_PERK_DMG_SHARE);
      const mult = grade === 'crit' ? 2.1 : 1;
      const dmg = Math.round((base * mult) * (0.85 + Math.random() * 0.3));
      B.foe.hp = Math.max(0, B.foe.hp - dmg);
      // 탄종에 따라 갑판을 쓸거나(포도탄) 돛을 찢는다(사슬탄)
      const crewLoss = Math.round(dmg * (0.12 + Math.random() * 0.14) * SHOT.crew);
      B.foe.crew = Math.max(0, B.foe.crew - crewLoss);
      const sail = SHOT.sail ? Math.round(SHOT.sail * (grade === 'crit' ? 1.5 : 1)) : 0;
      if (sail) B.foe.sailDmg = Math.min(100, B.foe.sailDmg + sail);
      if (SHOT.fire) B.foe.fire = Math.max(B.foe.fire, SHOT.fire);

      addFx('blast', toX + 4, SEA_Y - 22, 0.5);
      addFx('smoke', toX + 4, SEA_Y - 26, 1.0);
      B.shake = 1;

      const tail = [
        `${dmg} 피해`,
        crewLoss > 0 ? `적 선원 ${crewLoss}명 사상` : null,
        sail ? `적 돛 ${sail}% 손상` : null,
        SHOT.fire ? '적선에 불이 붙었다' : null,
      ].filter(Boolean).join(', ');
      logLine((grade === 'crit' ? '정통으로 꽂혔다! ' : '명중. ') + tail + '.',
              grade === 'crit' ? 'good' : '');
    }
    buildUI();
    after(endPlayerTurn, 520);
  }, 420);
}

function approach() {
  if (B.busy) return;
  B.busy = true;
  B.range = Math.max(MIN_RANGE, B.range - (18 + Math.round(Math.random() * 10)));
  logLine('돛을 펴 거리를 좁혔다.');
  buildUI();
  after(endPlayerTurn, 420);
}

function withdraw() {
  if (B.busy) return;
  B.busy = true;
  B.range = Math.min(MAX_RANGE, B.range + (16 + Math.round(Math.random() * 10)));
  logLine('바람을 받아 거리를 벌렸다.');
  buildUI();
  after(endPlayerTurn, 420);
}

function tryFlee() {
  if (B.busy) return;
  // 식은 state.js가 정본이다 — 조우 안내가 보여 준 가망과 같은 값이어야 한다.
  const chance = fleeOdds({
    range: B.range, foeHull: B.enemy.hull,
    mySail: B.you.sailDmg, foeSail: B.foe.sailDmg,
  });
  if (Math.random() < chance) {
    const e = B.enemy;
    pushLog(`${e.name}${josa(e.name, '을/를')} 따돌리고 항로로 돌아왔다.`, 'warn');
    // 놓아 주는 자에게는 놓아 주는 말이 있다 — 명부의 `lines.spare`
    if (e.spare) pushLog(e.spare, 'warn');
    refreshLog();
    toast('도주 성공', 'good');
    const back = B.retreatTo;
    B = null;
    back?.();
  } else {
    B.busy = true;
    logLine('돛을 돌렸지만 따라잡혔다!', 'bad');
    buildUI();
    after(endPlayerTurn, 420);
  }
}

/** 불붙은 배는 턴이 돌 때마다 타들어간다 */
function tickFire(who) {
  const s = who === 'you' ? B.you : B.foe;
  if (s.fire <= 0) return;
  const burn = Math.round(s.maxHp * 0.05) + 2;
  s.hp = Math.max(0, s.hp - burn);
  s.fire--;
  addFx('smoke', VW / 2 + (who === 'you' ? -gapOf(B.range) : gapOf(B.range)), SEA_Y - 30, 1.0);
  logLine(who === 'you' ? `갑판의 불이 번져 ${burn} 피해를 입었다.` : `적선의 불길이 번진다. ${burn} 피해.`,
          who === 'you' ? 'bad' : 'good');
}

function endPlayerTurn() {
  if (!B) return;
  tickFire('foe');
  if (checkGunneryEnd()) return;
  B.turn = 'foe';
  buildUI();
  after(foeTurn, 620);
}

function foeTurn() {
  if (!B) return;
  const e = B.enemy;
  // AI: 멀면 접근, 사거리 안이면 포격, 백병 우세하면 접현.
  // 돛이 찢긴 만큼 기동이 굼떠지고, 심하면 아예 거리를 못 좁힌다.
  const rig = 1 - B.foe.sailDmg / 100;
  const meleeEdge = B.foe.crew / Math.max(1, B.you.crew);
  let act = 'fire';
  if (B.range > 70) act = 'approach';
  else if (meleeEdge > 1.25 && B.range > 18) act = 'approach';
  else if (B.foe.hp < B.foe.maxHp * 0.25 && Math.random() < 0.3) act = 'withdraw';
  if (act !== 'fire' && rig < 0.35) act = 'fire';        // 돛이 걸레가 되면 붙지도 떨어지지도 못한다

  if (act === 'approach') {
    const step = Math.round((14 + Math.random() * 10) * Math.max(0.25, rig));
    B.range = Math.max(MIN_RANGE, B.range - step);
    logLine(B.foe.sailDmg > 30
      ? `${e.name}${josa(e.name, '이/가')} 찢어진 돛으로 힘겹게 거리를 좁힌다.`
      : `${e.name}${josa(e.name, '이/가')} 거리를 좁혀온다.`, 'warn');
  } else if (act === 'withdraw') {
    B.range = Math.min(MAX_RANGE, B.range + Math.round(14 * Math.max(0.25, rig)));
    logLine(`${e.name}${josa(e.name, '이/가')} 물러선다.`);
  } else {
    const gap = gapOf(B.range);
    const fromX = VW / 2 + gap + 10, toX = VW / 2 - gap - 10;
    B.fireFlash = 'foe';
    addFx('smoke', fromX, SEA_Y - 22, 0.9);
    fx.push({ kind: 'ball', x: fromX, y: SEA_Y - 24, x2: toX, y2: SEA_Y - 26, t: 0, life: 0.42 });
    after(() => { if (B) B.fireFlash = null; }, 160);

    /* 거리가 가까울수록 잘 맞는다. 풍상이 저쪽이면 저쪽 조준도 한 뼘 낫다(§D).
       ★ **곱으로 준다.** 처음엔 `+ 0.06`으로 더했는데, 우리 쪽은 판정대에 `× 1.06`이라
         적만 +6%p(= 상대값 +9.5%)를 받아 **바람이 플레이어에게만 손해**가 됐다.
         실측으로 잡았다 — 양쪽 다 상대값 +6%로 맞춘다. */
    const acc = (0.34 + (1 - B.range / MAX_RANGE) * 0.42) * (1 + windEdge(false));
    after(() => {
      if (!B) return;
      if (Math.random() < acc) {
        const dmg = Math.round((3 + e.guns * 1.05) * (0.8 + Math.random() * 0.45));
        /* ★ 동행선이 한 척 끼어들어 대신 맞는다 — 그 몫은 **그 배의 선체**로 간다.
           크게 상한 배는 여기서 가라앉고 선단에서 빠진다(state.js: spreadDamage). */
        const sp = spreadDamage(dmg);
        B.you.hp = Math.max(0, B.you.hp - sp.toYou);
        /* 내포격 골조를 넣었으면 파편이 갑판까지 튀지 않는다.
           그 위에 **동료 외과의**가 곱해진다(A-5 crewLossOff) — `crewLossFactor()`는
           개장만 보는 state.js 함수라 그 안을 고치지 않고 여기서 겹친다. */
        const cl = Math.round(sp.toYou * (0.1 + Math.random() * 0.12) * crewLossFactor() * crewLossPerk());
        B.you.crew = Math.max(0, B.you.crew - cl);
        addFx('blast', toX - 4, SEA_Y - 22, 0.5);
        B.shake = 1.1;
        let extra = '';
        if (Math.random() < 0.22) {                       // 유탄이 삭구를 스친다
          B.you.sailDmg = Math.min(100, B.you.sailDmg + 8 + Math.round(Math.random() * 8));
          extra = ' 삭구가 끊겼다.';
        }
        if (sp.absorbed > 0 && sp.hit) {
          extra += ` ${sp.hit.name}${josa(sp.hit.name, '이/가')} ${sp.absorbed}을 대신 받아냈다.`;
        }
        for (const s of sp.sunk) {
          extra += ` ${s.name}${josa(s.name, '이/가')} 가라앉는다!`;
          B.you.consorts = Math.max(0, B.you.consorts - 1);
        }
        logLine(`적탄이 현측을 뚫었다. ${sp.toYou} 피해, 선원 ${cl}명 사상.${extra}`, 'bad');
        if (sp.sunk.length) { refreshLog(); refreshHUD(); }   // 항해일지에 침몰 한 줄이 적혔다
      } else {
        addFx('splash', toX - 14, SEA_Y + 6, 0.55);
        logLine('적탄이 빗나갔다.');
      }
      buildUI();
      after(() => {
        if (!B) return;
        tickFire('you');
        if (checkGunneryEnd()) return;
        B.turn = 'player'; B.busy = false;
        buildUI();
      }, 480);
    }, 420);
    return;
  }

  buildUI();
  after(() => {
    if (!B || checkGunneryEnd()) return;
    B.turn = 'player'; B.busy = false;
    buildUI();
  }, 480);
}

function checkGunneryEnd() {
  if (B.foe.hp <= 0) { finish('sink'); return true; }
  // 4부 격실 — 침수를 구획에 가둬 한 번은 가라앉지 않는다
  if (B.you.hp <= 0 && state.refits.bulkhead && !B.saved) {
    B.saved = true;
    B.you.hp = Math.max(6, Math.round(B.you.maxHp * 0.22));
    B.you.fire = 0;
    logLine('침수가 격벽에서 멎었다 — 배가 버텨냈다!', 'good');
    toast('4부 격실이 배를 살렸다', 'good');
  }
  if (B.you.hp <= 0) { finish('lose'); return true; }
  if (B.you.crew <= 0) { finish('lose'); return true; }
  // 양쪽이 붙으면 자동으로 백병전
  if (B.range <= 12 && B.phase === 'gunnery') { toMelee(); return true; }
  return false;
}

/* ══════════════════════════════════════════════════════════════
   백병전
   ══════════════════════════════════════════════════════════════ */
function makeUnits(keys, side) {
  return keys.map((k, i) => {
    const t = TROOPS[k];
    return {
      key: k, side, name: t.name,
      hp: t.hp, maxHp: t.hp, atk: t.atk, def: t.def,
      /* `lunge`·`flash`·`fall`은 **1에서 0으로 닳는 연출 시계**다(초 단위는 위 상수).
         `offset`은 그 시계에서 매 프레임 뽑아 쓰므로 여기서는 0으로 둔다. */
      slot: i, pose: 'idle', poseT: 0, offset: 0, lunge: 0, flash: 0, fall: 0,
    };
  });
}

function toMelee() {
  /* 카메라가 **지금 있던 자리에서** 밀고 들어가야 "붙었다"로 읽힌다 —
     그래서 배율이 오르기 시작하는 간격을 포격 마지막 간격으로 잡아 둔다(§D). */
  B.gap0 = gapOf(B.range);
  B.meleeZoom = 0;
  B.phase = 'melee';
  B.range = 6;
  B.busy = false;
  B.turn = 'player';
  const crewScale = Math.max(0.35, B.you.crew / Math.max(1, state.crew));
  B.melee = {
    you: makeUnits(playerTroops(), 'you'),
    foe: makeUnits(B.enemy.troops, 'foe'),
    stance: 'balanced',
    round: 1,
  };
  /* 포격으로 선원을 잃었다면 백병 병력도 그만큼 약해진다.
     반대로 **동행선에서 사람이 건너오면 갑판이 두꺼워진다** — 자리(6칸)를 늘리지 않고
     각 유닛의 체력으로 반영한다(갑판 그림의 병사 자리가 선체 길이에 묶여 있다). */
  const boost = consortMeleeBoost();
  for (const u of B.melee.you) {
    u.hp = Math.max(4, Math.round(u.hp * crewScale * boost));
    u.maxHp = u.hp;
  }
  if (B.you.consorts > 0) {
    logLine(`동행선 ${B.you.consorts}척에서 ${consortMelee()}명이 갑판으로 건너왔다.`, 'good');
  }
  logLine('갈고리가 걸렸다 — 백병전!', 'warn');
  pushLog(`${B.enemy.name}${josa(B.enemy.name, '과/와')} 갑판에서 맞붙었다.`, 'warn');
  refreshLog();
  buildUI();
}

function drawMelee(ctx, mv, yourX, foeX, bobA, bobB) {
  const m = B.melee;
  if (!m) return;
  const yKey = ship().hull, fKey = B.enemy.hull;

  /* ★ 쓰러진 병사는 **제자리를 지키다가** 사라진다(`fall`이 다 닳을 때까지).
     죽는 순간 `hp>0`으로만 걸러 내면 줄이 툭 당겨져 옆 병사가 순간이동한 것처럼 보인다 —
     한 박자 두었다가 줄이 메워지는 편이 "하나가 쓰러지고 줄이 좁혀졌다"로 읽힌다. */
  const alive = (arr) => arr.filter((u) => u.hp > 0 || u.fall > 0);

  /* ★ **자리는 여전히 선체에서 뽑는다** — 상수로 두면 작은 배에서 뱃전 밖에 선다.
     달라진 것은 기준점이다. 예전에는 「선체 길이의 46%」에서 시작해 선체 비례로 벌렸는데,
     선체가 `k`배가 되면 그 줄도 `k`배로 벌어져 화면 밖으로 흩어진다.
     지금은 **맞닿은 뱃전**에서 시작해 뒤로 물러서고, 간격은 **화면 픽셀**이다 —
     사람은 배율을 안 타므로 사람 사이 거리도 타면 안 된다.
     그림으로도 이쪽이 맞다: 접현 백병은 갑판 전체가 아니라 **뱃전에 몰려서** 벌어진다.

     ⓘ 줄의 기준점은 **맞닿은 자리가 화면에 놓인 곳(`mv.FX`)** 하나다. 각자 제 이물 끝에서 재면 두 뱃전이
       겹쳐 있는 만큼 어긋나 안쪽 병사가 *상대 뱃머리 위*에 선다(hulk↔슈퍼프리깃에서 실제로 났다).
       간격(`meleeView().gap`)이 이미 두 이물을 이 자리로 모아 주므로 여기가 곧 두 배의 이물이다.
     ⓘ 발 높이는 **그 지점의 뱃전 윗선**(`ship.js: railAt`)에서 뽑는다. `HULLS[].deck`은 현호가 0인
       중앙에서만 뱃전과 같아서, 상수로 쓰면 이물 쪽 병사가 선체에 파묻힌다 — 배율이 붙자 드러났다. */
  // 양쪽 갑판 모두 이 바다 사람들이다 — 왜구 배에 지중해 선원이 서 있었다
  const face = regionOf(state.at);

  /** 한 줄을 세운다. `dir`는 그 편이 나아가는 방향(우리 +1 / 적 −1)이다. */
  const line = (units, dir, hullKey, hullOriginX, bob, flip) => {
    const H = HULLS[hullKey];
    units.forEach((u, i) => {
      const cx = mv.FX - dir * (MELEE_RAIL_BACK + i * MELEE_STAND_PX);
      /* 화면 자리를 선체 안 자리로 되짚어 **그 지점의 뱃전 높이**에 발을 둔다.
         `deck`을 상수로 쓰면 현호가 올라간 뱃머리에서 사람이 선체에 파묻힌다(→ `ship.js: railAt`). */
      const wx = mv.wx(cx);
      const local = flip ? SW - (wx - hullOriginX) : (wx - hullOriginX);
      const t = (local - H.x0) / H.len;
      const footY = SEA_Y - WATERLINE + bob + railAt(hullKey, t) + MELEE_FOOT_SINK;
      drawUnit(ctx, u, Math.round(cx - CW / 2), Math.round(mv.sy(footY)) - CHAR_FOOT, flip, face, dir);
    });
  };

  line(alive(m.you), +1, yKey, yourX, bobA, false);
  line(alive(m.foe), -1, fKey, foeX, bobB, true);
}

/** 병사 하나 — 찌르기(lunge) · 피격 플래시(flash) · 쓰러짐(fall)을 한자리에서 그린다.
    `dir`는 이 편이 나아가는 방향(우리 +1 / 적 −1)이다. */
function drawUnit(ctx, u, baseX, baseY, flip, face, dir) {
  const spr = unitSprite(u.key, u.pose, null, face);
  const x = baseX + dir * Math.round(MELEE_LUNGE_PX * lungeCurve(u.lunge)) + dir * u.offset;

  /* 전사 — **제 모습인 채로** 무릎이 꺾이듯 내려앉으며 어두워진다.
     처음엔 실루엣만 단색으로 찍어 봤는데, 밝은 하늘 위에서 분홍빛 유령으로 보였다.
     원래 스프라이트를 깔고 그 위에 어두운 색을 덧대야 "사람이 쓰러진다"로 읽힌다. */
  if (u.hp <= 0) {
    const v = Math.max(0, Math.min(1, u.fall));
    const dy = Math.round((1 - v) * MELEE_FALL_PX);
    ctx.save();
    ctx.globalAlpha = v * 0.9;
    blit(ctx, spr, x, baseY + dy, 1, flip);
    ctx.globalAlpha = v * 0.62;          // 쓰러지는 순간이 가장 어둡고 그대로 옅어진다
    blitTinted(ctx, spr, x, baseY + dy, 1, flip, FALL_COLOR);
    ctx.restore();
    return;
  }

  blit(ctx, spr, x, baseY, 1, flip);
  // 맞은 순간 실루엣이 하얗게 뜬다 — 누가 맞았는지가 이 화면에서 가장 안 보이던 정보다
  if (u.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, u.flash) * 0.9;
    blitTinted(ctx, spr, x, baseY, 1, flip, FLASH_COLOR);
    ctx.restore();
  }
}

function meleeRound(stance) {
  if (B.busy) return;
  B.busy = true;
  const m = B.melee;
  m.stance = stance;

  const mods = {
    charge:  { atk: 1.45, def: 0.65, label: '돌격' },
    balanced:{ atk: 1.0,  def: 1.0,  label: '난전' },
    hold:    { atk: 0.65, def: 1.55, label: '방진' },
    volley:  { atk: 1.15, def: 0.85, label: '일제사격' },
  }[stance];

  const yl = m.you.filter((u) => u.hp > 0);
  const fl = m.foe.filter((u) => u.hp > 0);
  if (!yl.length || !fl.length) return;

  // 우리 측 공격
  let ydmg = 0, fdmg = 0;
  for (const u of yl) {
    const isRanged = u.key === 'musketeer' || u.key === 'crossbow';
    const mult = stance === 'volley' ? (isRanged ? 1.7 : 0.6) : mods.atk;
    const target = fl[Math.floor(Math.random() * fl.length)];
    /* 갈래가 백병을 거든다 — 좌수영의 군관은 갑판 싸움을 배운 사람이다
       (`ORIGINS.navy.perks.meleeUp`). 이 루프는 **우리 측 공격**이라 적에게는 안 붙는다. */
    const raw = u.atk * mult * (1 + originPerk('meleeUp') + matePerk('meleeUp')) * (0.8 + Math.random() * 0.45);
    const d = Math.max(1, Math.round(raw - target.def * 0.42));
    target.hp -= d; ydmg += d;
    // 연출만 — 찌르는 쪽은 앞으로 나가고 맞는 쪽은 하얗게 뜬다
    u.pose = 'attack'; u.lunge = 1;
    target.flash = 1;
  }
  // 적 반격 (죽은 유닛은 빠진다)
  for (const u of m.foe.filter((x) => x.hp > 0)) {
    const target = yl[Math.floor(Math.random() * yl.length)];
    const raw = u.atk * (0.8 + Math.random() * 0.45);
    const d = Math.max(1, Math.round(raw - target.def * 0.42 * mods.def));
    target.hp -= d; fdmg += d;
    u.pose = 'attack'; u.lunge = 1;
    target.flash = 1;
  }
  /* 이 라운드에 쓰러진 자에게 낙하 시계를 준다. 이미 쓰러져 있던(fall이 닳은) 자에게는
     다시 안 준다 — `pose`가 이미 'hit'인지로 가른다. */
  for (const u of [...m.you, ...m.foe]) {
    if (u.hp <= 0 && u.pose !== 'hit') { u.pose = 'hit'; u.fall = 1; u.flash = 0; }
  }
  // 갑판이 한 번 울린다 — 타격이 닿은 것을 화면 전체가 받는 자리(연출만)
  B.shake = Math.max(B.shake, 0.8);

  const yDead = m.you.filter((u) => u.hp <= 0).length;
  const fDead = m.foe.filter((u) => u.hp <= 0).length;
  logLine(`${mods.label} — 적에게 ${ydmg}, 아군 ${fdmg} 피해. (전사 아군 ${yDead} / 적 ${fDead})`);

  /* 선원 수에도 반영. 갑판에서 죽는 것도 **전투 사상**이라 동료 외과의가 여기도 걸린다
     (A-5 crewLossOff). ⚠️ 유닛 체력에는 안 곱한다 — 그것은 이기고 지는 판정이고,
     이 특전은 "얼마나 죽는가"이지 "이기는가"가 아니다. */
  B.you.crew = Math.max(0, B.you.crew - Math.round((fdmg / 7) * crewLossPerk()));
  B.foe.crew = Math.max(0, B.foe.crew - Math.round(ydmg / 7));

  m.round++;
  buildUI();

  after(() => {
    if (!B) return;
    for (const u of [...m.you, ...m.foe]) {
      if (u.hp > 0) { u.pose = 'idle'; u.offset = 0; u.lunge = 0; u.flash = 0; }
    }
    const yAlive = m.you.some((u) => u.hp > 0);
    const fAlive = m.foe.some((u) => u.hp > 0);
    if (!fAlive) return finish('capture');
    if (!yAlive) return finish('lose');
    B.busy = false;
    buildUI();
  }, 700);
}

function meleeRetreat() {
  if (B.busy) return;
  if (Math.random() < 0.45) {
    pushLog('갈고리를 끊고 간신히 떨어져 나왔다.', 'warn');
    refreshLog();
    toast('이탈 성공', 'good');
    const back = B.retreatTo;
    B = null;
    back?.();
  } else {
    logLine('밧줄을 끊지 못했다!', 'bad');
    B.busy = true;
    buildUI();
    after(() => { if (B) { B.busy = false; meleeRound('hold'); } }, 400);
  }
}

/* ══════════════════════════════════════════════════════════════
   종료 처리
   ══════════════════════════════════════════════════════════════ */
function finish(kind) {
  if (!B || B.phase === 'over') return;
  B.phase = 'over';
  const e = B.enemy;

  // 전투 결과를 실제 상태에 반영
  state.hp = Math.max(1, B.you.hp);
  state.crew = Math.max(1, B.you.crew);
  trimLoadout();          // 선원이 줄면 갑판 슬롯도 닫힌다

  if (kind === 'lose') {
    /* ★ **삭은 배로 지면 가라앉는다**(C-13 N4 · `state.js: flagshipSinks`).
       판정을 선체를 되돌리기 **전에** 한다 — 되돌린 뒤에 재면 영영 안 걸린다. */
    const sinking = flagshipSinks();
    /* ★ **상한이 붙었다** — 저쪽 갑판이 지고 갈 수 있는 만큼만 가져간다(위 `ENCOUNTER_LOSS` 주석).
       비율(0.50)은 안 바꿨다. 초반에는 상한이 한참 위라 **한 자리도 안 달라지고**,
       금고가 커진 뒤에야 잘린다 — 천장을 만들던 것이 바로 그 구간이다.
       `B.foe.crew`(살아남은 적)로 재므로 갑판을 비워 놓고 지면 덜 실어 간다. */
    const lostGold = capEncounterLoss(state.gold * ENCOUNTER_LOSS.loseShare, B.foe.crew, e.level);
    state.gold -= lostGold;
    const dumped = [];
    for (const id of Object.keys(state.cargo)) {
      dumped.push(`${GOOD_BY_ID[id].name} ${state.cargo[id]}`);
      delete state.cargo[id];
    }
    state.hp = Math.max(12, Math.round(state.maxHp * 0.25));
    /* ★ **선원에 바닥을 준다**(ⓒ). 잠그는 축은 금고가 아니라 **선원**이었다 —
       선체는 `maxHp`의 25%로 되돌아갈 뿐 누적이 아닌데, 선원은 매번 반씩 누적돼
       42→21→11→6→4로 내려간다. 그 아래에서 `oceanReady()`가 원양을 막고
       금고가 비면 사람을 못 태워 **판이 잠긴다**(GRAND-ISSUES #6).
       바닥은 **그 문턱 자체**로 둔다 — 새 숫자를 만들지 않고 `oceanReady`가 보는
       `max(3, ceil(crewMin × OCEAN_CREW_MIN))`를 그대로 쓴다. 지는 것은 여전히 아프되
       **원양이 닫히지는 않는다.**
       ⚠️ 이미 그 밑이었다면 바닥이 사람을 **늘려서는 안 된다** — `min(지금 선원, 바닥)`. */
    const oceanFloor = ENCOUNTER_LOSS.crewFloorOcean
      ? Math.max(3, Math.ceil((ship().crewMin || 0) * OCEAN_CREW_MIN))
      : 0;
    const crewFloor = Math.min(state.crew, Math.max(ENCOUNTER_LOSS.crewFloor, oceanFloor));
    state.crew = Math.max(crewFloor, Math.round(state.crew * ENCOUNTER_LOSS.crewShare));
    trimLoadout();
    const sank = sinking ? sinkFlagship() : null;
    /* ★ 여기는 언제나 "해적들이 화물칸을 털어갔다"였다. 그런데 이 자리에는
       국왕의 순찰선도 오고, **내가 먼저 덮친 상선**도 온다 — 그때 이 문장은
       누가 도둑이었는지를 통째로 뒤집는다. 진 상대가 누구였는지로 말을 가른다. */
    const k = foeKind(e);
    const scene = k === 'merchant'
      ? '덮친 쪽이 갑판을 잃었다. 상선의 선원들이 우리 화물칸을 열어 값을 받아 갔다.'
      : k === 'navy'
        ? '저항할 힘이 남지 않았다. 임검이라는 이름으로 화물칸이 열렸고, 장부에 적힌 것은 하나도 남지 않았다.'
        : '저항할 힘이 남지 않았다. 해적들이 화물칸을 털어갔다.';
    pushLog(`${e.name}에게 배를 내주었다. 화물과 금화 ${lostGold}닢을 빼앗겼다.`, 'bad');
    refreshHUD(); refreshLog();
    modal({
      title: sank ? '배를 잃었다'
           : k === 'merchant' ? '되레 털렸다' : k === 'navy' ? '임검당했다' : '나포당했다',
      body: `${scene}<br><br>`
          + `<b>금화 ${lostGold.toLocaleString('ko-KR')}닢</b> 상실`
          + (dumped.length ? `<br>화물 전량 상실 — ${dumped.join(', ')}` : '')
          + (sank
              ? `<br><br><b style="color:#d05a4a">${sank.lostName}이(가) 가라앉았다.</b>`
                + ` 삭은 배로 싸운 값이다 — 부두에서 <b>${sank.keptName}</b> 한 척을 얻어 다시 선다.`
                + `<br><span style="opacity:.85">거점 · 세력 관계 · 악명 · 아는 항구 · 해적 명부는 그대로다.</span>`
              : `<br>가까스로 목숨은 건져 항구로 예인되었다.`),
      actions: [{
        label: '항구로 돌아간다', kind: 'danger',
        onClick: () => { B = null; go('port'); },
      }],
      closable: false,
    });
    return;
  }

  // 승리 — 나포가 격침보다 전리품이 많다
  state.stats.wins++;
  /* 누구를 꺾었는지 남긴다 — 권역 패권 조건 ③이 읽는다(`state.js: recordSlain`).
     격침이든 나포든 꺾은 것은 같으므로 가르지 않는다. 상선은 저쪽에서 걸러진다. */
  recordSlain(e, regionOf(state.at));
  /* ★ **함대를 꺾으면 그 집 장부에 이름이 붉게 적힌다**(A-10 2단계 · −4).
     패권을 향해 가는 것이 곧 척지는 것이다 — 성장이 대가를 낳는 구조이지 보상을 낳는 구조가 아니다.
     등급 4·5만 세력의 함대이므로 잡배를 잡는 것으로는 안 걸린다. */
  const facHit = fleetSlain(e, state.at);
  const [lo, hi] = e.loot.gold;
  const mult = kind === 'capture' ? 1 : 0.45;
  const coin = Math.round((lo + Math.random() * (hi - lo)) * mult);
  state.gold += coin;
  /* ★ **현상금은 여기서 안 준다** — 목에 걸린 값은 나포심판 뒤 **항구에서** 받는다(P6-2).
     격침이면 시신을 못 내놓으므로 격파와 같은 비율(`mult`)을 그대로 문다. */
  const bounty = e.bounty
    ? oweBounty(e.name, Math.round((e.bounty[0] + Math.random() * (e.bounty[1] - e.bounty[0])) * mult))
    : 0;

  const gained = [];
  if (kind === 'capture') {
    for (const gid of e.loot.goods) {
      const room = cargoFree();
      if (room <= 0) break;
      const qty = Math.min(room, 3 + Math.floor(Math.random() * 9));
      if (qty <= 0) continue;
      state.cargo[gid] = (state.cargo[gid] || 0) + qty;
      gained.push(`${GOOD_BY_ID[gid].name} ${qty}개`);
    }
  }

  // 나포한 배는 선단에 끌고 갈 수 있다 — 아르고노트가 센츄리온이 된 것처럼
  const prizeKey = kind === 'capture' ? e.prize : null;
  const prize = prizeKey ? SHIPS[prizeKey] : null;
  /* ★★ **끌고 갈 손이 있느냐** — `captureShip`이 실제로 보는 두 문턱을 화면도 그대로 본다.
     실측(회차 28 `u-probe-silent2.mjs`): 코카로 갈레아스를 끌려면 선원을 **정원의 100%**로
     태워야 하고 갈레온은 **정원을 다 채워도 불가**다. 그런데 이 모달은 방금 싸움이 끝난
     자리라 선원이 가장 적을 때다 — 여기서 「예인한다」만 적으면 눌러 보고서야 해체된다. */
  const prizeNeed = prizeKey ? prizeCrewNeed(prizeKey) : 0;
  const prizeSpare = spareCrew();
  const prizeDup = prizeKey ? !!state.fleet[prizeKey] : false;
  const prizeShort = !!prizeKey && !prizeDup && prizeSpare < prizeNeed;
  /* 해체값도 규칙에서 받아 온다 — 화면이 제 손으로 세면 `capSpoils` 상한과 갈라진다 */
  const prizeScrap = prize ? capSpoils(prize.price * PRIZE_SCRAP) : 0;

  const rows = el('div.result-list', {}, [
    el('div.result-row', {}, [el('span', { text: '노획 금화' }), el('b', { text: coin.toLocaleString('ko-KR') + '닢' })]),
    bounty && el('div.result-row', {}, [
      el('span', { text: '목에 걸린 값' }),
      el('b', { text: `${bounty.toLocaleString('ko-KR')}닢 — 항구에서 받는다` }),
    ]),
    gained.length && el('div.result-row', {}, [el('span', { text: '노획 화물' }), el('b', { text: gained.join(', ') })]),
    prize && el('div.result-row', {}, [
      el('span', { text: '적선' }),
      el('b', {
        text: prizeDup ? `${prize.name} — 이미 같은 배가 있다 (해체 가능)`
            : prizeShort ? `${prize.name} — 끌고 갈 손이 ${prizeNeed - prizeSpare}명 모자란다 (해체만)`
            : `${prize.name} — 예인 가능`,
        style: prizeShort ? { color: '#c98a5a' } : null,
      }),
    ]),
    /* 모자랄 때만 **얼마나** 모자란지를 수로 남긴다 — 다음 항차에 몇을 더 태울지가 판단이 된다 */
    prizeShort && el('div.result-row', {}, [
      el('span', { text: '여유 선원' }),
      el('b', { text: `${prizeSpare}명 / 필요 ${prizeNeed}명 (최소 인원 ${ship().crewMin}명은 내 배에 남는다)` }),
    ]),
    el('div.result-row', {}, [el('span', { text: '선체' }), el('b', { text: `${state.hp}/${state.maxHp}` })]),
    el('div.result-row', {}, [el('span', { text: '생존 선원' }), el('b', { text: `${state.crew}명` })]),
  ].filter(Boolean));

  const takePrize = () => {
    const r = captureShip(prizeKey);
    if (!r.ok) return toast(r.reason, 'bad');
    if (r.scrapped) {
      pushLog(`끌고 갈 인원이 없어 ${prize.name}${josa(prize.name, '을/를')} 해체해 자재로 팔았다. +${r.gain}닢`, 'good');
      toast(`해체 매각 · +${r.gain.toLocaleString('ko-KR')}닢`, 'good');
    } else {
      pushLog(`${prize.name}${josa(prize.name, '을/를')} 나포해 선단에 편입했다. 선체는 상한 채로 끌려온다.`, 'good');
      toast(`${prize.name} 편입`, 'good');
    }
    refreshHUD(); refreshLog();
    const cb = B?.onEnd; B = null; cb?.(kind);
  };

  pushLog(kind === 'capture'
    ? `${e.name}${josa(e.name, '을/를')} 나포했다. 금화 ${coin}닢 노획.`
    : `${e.name}${josa(e.name, '을/를')} 격침시켰다. 잔해에서 금화 ${coin}닢을 건졌다.`, 'good');
  refreshHUD(); refreshLog();

  /* 이긴 순간에도 상대가 누구였는지가 남는다. 이름난 자를 잡았으면 그 사실을 적는다 —
     그러지 않으면 두목을 잡은 항차와 좀도둑을 쫓은 항차가 같은 문장으로 끝난다. */
  const won = kind === 'capture'
    ? '갑판을 장악했다. 적선의 화물칸을 열어 쓸 만한 것을 옮겨 실었다.'
    : '적선이 기울더니 마스트부터 물속으로 사라졌다. 화물은 대부분 함께 가라앉았다.';
  const weight = e.bounty
    ? ' 이 이름에는 값이 걸려 있었다 — 다음 항구에서 그 이야기가 먼저 도착할 것이다.'
    : e.level >= 4 ? ' 이 구간을 쥐고 있던 이름이 하나 사라졌다.' : '';

  modal({
    title: kind === 'capture' ? '나포 성공' : '적선 격침',
    body: el('div', {}, [
      el('p', { text: won + weight }),
      /* ★ **꺾은 값이 관계로 돌아온다**(A-10 2단계). 이긴 자리에서 그 사실을 함께 말하지 않으면
         플레이어는 다음 항구에서 문서가 안 팔릴 때까지 이유를 모른다 —
         "규칙이 멀쩡한데 화면이 말하지 않아 수백 일을 잃는다"의 그 자리다. */
      facHit ? el('p', {
        style: { marginTop: '6px', color: '#d98a6a', fontSize: '12px' },
        text: `${facHit.name}의 함대였다. 그 집 장부에 내 이름이 붉게 적힌다`
            + ` (${facHit.delta} → 지금 ${facHit.now}).`
            + ' 패권을 향해 가는 것이 곧 척지는 것이다.',
      }) : null,
      rows,
      prize ? el('p', {
        style: { marginTop: '6px', color: prizeShort ? '#c98a5a' : '#9a927f', fontSize: '12px' },
        html: prizeDup
          ? `같은 선종을 이미 가지고 있다. 끌고 갈 선원이 없으니 해체해 자재로 팔 수 있다.`
          : prizeShort
            /* ★ 「무엇이 막나 · 얼마가 필요한가 · 대신 무엇이 되나」 셋을 한 상자에.
                 값을 숨기면 선택이 아니라 도박이 된다(계약 조달비·해적 조우 카드와 같은 원칙). */
            ? `${prize.name}${josa(prize.name, '을/를')} 끌고 가려면 <b>여유 선원 ${prizeNeed}명</b>이 있어야 한다`
              + ` — 지금은 ${prizeSpare}명뿐이다(최소 인원 ${ship().crewMin}명은 내 배에 남겨야 한다).`
              + `<br>이대로 손을 대면 <b>해체해 자재로 판다 — ${prizeScrap.toLocaleString('ko-KR')}닢</b>.`
              + ` 큰 배를 끌고 오려면 술집에서 사람을 더 태우고 나와야 한다.`
            : `${prize.name}${josa(prize.name, '은/는')} 선체가 ${Math.round(PRIZE_HULL * 100)}%만 남았다. 다음 입항지까지 예인하면 선단에 들어온다.`
              + ` (여유 선원 ${prizeSpare}명 · 이 배를 끌려면 ${prizeNeed}명)`,
      }) : null,
    ].filter(Boolean)),
    actions: [
      prize && {
        /* ★ 단추의 말이 곧 일어날 일이어야 한다 — 선원이 모자라면 눌러도 해체다 */
        label: (prizeDup || prizeShort) ? `해체해서 판다 (+${prizeScrap.toLocaleString('ko-KR')}닢)`
                                        : `${prize.name}${josa(prize.name, '을/를')} 예인한다`,
        onClick: takePrize,
      },
      {
        label: prize ? '버려두고 떠난다' : '항해를 계속한다',
        kind: prize ? 'dark' : '',
        onClick: () => { const cb = B?.onEnd; B = null; cb?.(kind); },
      },
    ].filter(Boolean),
    closable: false,
  });
}

/* ══════════════════════════════════════════════════════════════
   UI
   ══════════════════════════════════════════════════════════════ */
function logLine(text, kind = '') {
  B.log.unshift({ text, kind });
  if (B.log.length > 4) B.log.pop();
}

function buildUI() {
  if (!B) return;
  const ui = el('div#battle-ui');

  // 좌우 상태바
  ui.append(sideBar('left', ship().name, B.you, '#5d9ec9'));
  ui.append(sideBar('right', B.enemy.name, B.foe, '#d05a4a'));

  // 페이즈 표시
  ui.append(el('div#battle-phase', {
    text: B.phase === 'melee' ? `백병전 · ${B.melee.round}라운드`
        : B.phase === 'over' ? '전투 종료'
        : B.turn === 'player' ? '포격전 · 우리 차례' : '포격전 · 적 차례',
  }));

  /* 거리 게이지 — 그 위에 **바람 한 줄**을 둔다.
     첫 로그는 두 줄 뒤로 밀려 사라지므로, 판 내내 보이는 자리가 따로 있어야 한다. */
  if (B.phase === 'gunnery') {
    const pos = 100 - B.range;
    ui.append(el('div#range-wrap', {}, [
      el('div', {
        text: B.wind.mine
          ? `${B.wind.name} →   풍상은 우리에게 있다`
          : `←  ${B.wind.name}   풍상은 저쪽이다`,
        style: { fontSize: '11px', color: B.wind.mine ? '#8fbf74' : '#c98a6a', marginBottom: '2px' },
      }),
      el('div', { text: `거리 ${Math.round(B.range)} — ${rangeLabel()}` }),
      el('div#range-bar', {}, [
        el('div.zone', { style: { left: '78%', right: '0%' } }),
        el('i', { style: { left: pos + '%' } }),
      ]),
    ]));
  }

  // 전투 로그 (짧게)
  ui.append(el('div', {
    style: {
      position: 'absolute', left: '50%', bottom: '112px', transform: 'translateX(-50%)',
      width: '420px', textAlign: 'center', fontSize: '12px', lineHeight: 1.7,
      color: '#c5baa8', textShadow: '0 1px 3px #000',
    },
  }, B.log.slice(0, 2).map((l) => el('div', {
    text: l.text,
    style: { color: l.kind === 'bad' ? '#e0806e' : l.kind === 'good' ? '#9cc46e' : '#c5baa8' },
  }))));

  // 조준 미니게임 — 재어 넣을 탄을 여기서 고른다 (바늘은 그동안에도 움직인다)
  if (B.aim) {
    const a = B.aim;
    ui.append(el('div.panel#aim', {}, [
      el('div#shot-row', {}, SHOT_KEYS.map((k) => {
        const s = SHOTS[k];
        const stock = shotStock(k);
        return el(`button.shot${B.shot === k ? '.on' : ''}`, {
          disabled: stock <= 0,
          title: `${s.desc}${s.price ? ` (${s.price}닢/발)` : ''}`,
          onclick: () => { B.shot = k; buildUI(); },
        }, [
          el('b', { text: s.name }),
          el('span', { text: stock === Infinity ? '∞' : `${stock}발` }),
        ]);
      })),
      el('div.hint', { html: '초록 구간에서 <b>발사</b> — 노란 구간은 <b>치명타</b> (Space)' }),
      el('div#aim-track', {}, [
        el('div.band.good', { style: { left: a.good[0] * 100 + '%', width: (a.good[1] - a.good[0]) * 100 + '%' } }),
        el('div.band.crit', { style: { left: a.crit[0] * 100 + '%', width: (a.crit[1] - a.crit[0]) * 100 + '%' } }),
        el('div#aim-needle', { style: { left: a.pos * 100 + '%' } }),
      ]),
      el('button.btn', { text: '발사!', style: { marginTop: '8px', width: '100%' }, onclick: fire }),
    ]));
  }

  // 커맨드
  ui.append(commandBar());

  // 백병전 병력 칩
  if (B.phase === 'melee') {
    ui.append(unitStrip('left', B.melee.you));
    ui.append(unitStrip('right', B.melee.foe));
  }

  overlay.replaceChildren(ui);
}

function rangeLabel() {
  if (B.range > 72) return '원거리 — 명중이 어렵다';
  if (B.range > 40) return '중거리';
  if (B.range > 14) return '근거리 — 명중률이 높다';
  return '접현 직전';
}

function sideBar(side, name, s, color) {
  const marks = [
    s.sailDmg > 0 ? `돛 ${s.sailDmg}% 손상` : null,
    s.fire > 0 ? `화재 ${s.fire}턴` : null,
  ].filter(Boolean).join(' · ');
  /* 상대가 누구인지를 이름표 밑에 한 줄로 둔다.
     ★ 명부에 세기(strength)를 적어 두었는데 화면에는 이름뿐이라, 좀도둑과 바르바로사가
       같은 무게로 읽혔다. 숫자를 그대로 내보이지 않고 말로 옮긴다 — 이 게임의 방식이다. */
  const RANK = {
    pirate:   ['', '잡배', '무리', '이름난 자', '두목', '이 바다의 주인'],
    navy:     ['', '초계', '순찰', '물목지기', '왕실 소속', '기함'],
    merchant: ['', '작은 상단', '상단', '큰 상단', '선단', '선단'],
  };
  const tag = side === 'right'
    ? [B.enemy.nation, RANK[foeKind(B.enemy)][B.enemy.level] || null,
       B.enemy.bounty ? '현상금' : null].filter(Boolean).join(' · ')
    : null;
  /* 이름난 해적은 **얼굴을 내건다** — 명부의 세기·현상금이 이름표에만 있으면 좀도둑과 구분이 약하다.
     그림은 `pirate:<명부id>:idle`로 갈리고(BRIEF-NPC §4 ③), 없으면 세기에 맞는 실루엣이다. */
  /* ★ **명부에서 읽는다 — 지금 서 있는 바다가 아니라.** 원양을 건너다 만나면 `state.at`은
     아직 떠나온 항구라, 그것으로 얼굴빛을 정하면 바르바로사가 동아시아 사람으로 나온다.
     `sex`도 같은 자리에서 온다 — 여성으로 사료가 확실한 사람만 명부에 `sex:'f'`가 있다. */
  const foeDef = B.enemy.face ? PIRATE_DEF.get(B.enemy.face) : null;
  const face = side === 'right' && B.enemy.face
    ? el('div.bar-face', {}, spriteElTrim(
        pirateSprite(B.enemy.face, B.enemy.level, foeDef?.region ?? regionOf(state.at), foeDef?.sex), 2))
    : null;
  return el(`div.bar-wrap.${side}`, {}, [
    face,
    el('div.bar-name', { text: name, style: { color } }),
    tag ? el('div.bar-num', { text: tag, style: { color: '#a2957c' } }) : null,
    bar('hp', s.hp, s.maxHp),
    el('div.bar-num', { text: `선체 ${s.hp}/${s.maxHp}` }),
    bar('crew', s.crew, Math.max(s.crew, side === 'left' ? state.crewMax : B.enemy.crew)),
    el('div.bar-num', {
      text: `선원 ${s.crew} · 포 ${s.guns}문`
          + (s.aux > 0 ? ` (+${Math.round(s.aux)} 동행)` : ''),
    }),
    /* 몇 척이 따라와 있는가 — 대신 맞아 주는 배가 몇인지가 이 화면에서 가장 중요한 정보다 */
    s.consorts > 0 ? el('div.bar-num', {
      text: `동행 ${s.consorts}척`, style: { color: '#54a89b' },
      title: '동행선이 포를 보태고 적탄을 나눠 받는다. 크게 상하면 가라앉는다.',
    }) : null,
    marks ? el('div.bar-num', { text: marks, style: { color: s.fire > 0 ? '#e0806e' : '#c8a24a' } }) : null,
  ].filter(Boolean));
}

function unitStrip(side, units) {
  return el(`div.melee-side.${side}`, {}, units.map((u) =>
    el(`div.unit-chip${u.hp <= 0 ? '.dead' : ''}`, { title: u.name }, [
      el('span', { text: u.name.slice(0, 2), style: { fontSize: '10px' } }),
      el('span.uhp', {}, el('i', { style: { width: Math.max(0, (u.hp / u.maxHp) * 100) + '%' } })),
    ])));
}

function commandBar() {
  const box = el('div.panel#battle-cmd');
  if (B.phase === 'over') return box;

  if (B.phase === 'gunnery') {
    const off = B.busy || B.turn !== 'player' || !!B.aim;
    box.append(
      el('button.btn', { text: `포격 · ${SHOTS[B.shot].name}`, disabled: off, onclick: startAim }),
      el('button.btn.dark', { text: '접근', disabled: off, onclick: approach }),
      el('button.btn.dark', { text: '이탈', disabled: off, onclick: withdraw }),
      el('button.btn.dark', {
        text: '백병전 돌입', disabled: off || B.range > 26, onclick: () => { B.busy = true; toMelee(); },
      }),
      // 거리가 멀 때 도망치는 게 낫다 — 가망이 지금 얼마인지 눌러 보기 전에 알려 준다
      el('button.btn.danger', {
        text: '도주', disabled: off, onclick: tryFlee,
        title: `지금 도주하면 ${fleeWord(fleeOdds({ range: B.range, foeHull: B.enemy.hull, mySail: B.you.sailDmg, foeSail: B.foe.sailDmg }))}`,
      }),
    );
  } else {
    const off = B.busy;
    box.append(
      el('button.btn', { text: '돌격', disabled: off, onclick: () => meleeRound('charge') }),
      el('button.btn.dark', { text: '난전', disabled: off, onclick: () => meleeRound('balanced') }),
      el('button.btn.dark', { text: '방진', disabled: off, onclick: () => meleeRound('hold') }),
      el('button.btn.dark', { text: '일제사격', disabled: off, onclick: () => meleeRound('volley') }),
      el('button.btn.danger', { text: '이탈', disabled: off, onclick: meleeRetreat }),
    );
  }
  return box;
}

/* 스페이스바로 발사 */
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || !B) return;
  e.preventDefault();
  if (B.aim) fire();
  else if (B.phase === 'gunnery' && !B.busy && B.turn === 'player') startAim();
});
