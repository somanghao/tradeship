// scenes/tavern.js — 술집: 선원 무리를 모으는 자리
//
// 첫 화면에서 갑판은 비어 있다(state.js: resetGame의 crew 0). 배가 뜨려면
// 여기서 사람을 모아야 하므로, 이 씬은 게임에서 **선장이 가장 먼저 들어가는 방**이다.
//
// 조선소와 같은 얼개다 — 왼쪽은 그림(캔버스), 오른쪽은 목록(DOM 패널).
// 다만 조선소가 "무엇을 살 것인가"라면 여기는 "누구를 태울 것인가"라서,
// 값이 두 갈래로 나뉜다(지금 나가는 계약금 · 항해 내내 따라오는 일당).

import { tavernSprite, tavernFrontSprite, TAVERN_SEATS, TAV_FRONT, VH } from '../sprites/scene.js';
import { unitSprite, CHAR_FOOT, CW } from '../sprites/char.js';
import { blit } from '../pixel.js';
import { CITY_BY_ID, GOOD_BY_ID, TROOPS, CREW_TRAITS, TAVERN } from '../data.js';
import {
  state, ship, tavernCrews, recruitBand, avgCrewWage, shorthanded,
  pushLog, hire, HIRE_UNIT, CREW_WAGE, regionOf, salvage, salvageElsewhere,
  /* 술집 평판(다-3) — 체불·이탈이 이 부두에 남긴 자국. **화면은 읽기만 한다**
     (자국을 남기는 곳은 급여일 하나뿐이다 · `state.js: settlePayroll`). */
  crewRepAt,
  /* U2(회차 29) — `strandedCard`가 `salvage`/`salvageElsewhere`(파는 문)만 보고 있었다.
     항구의 `salvageCard`(`port.js:886`)는 **계약 선금**(`recoveryOptions().doors`의 `advance`)까지
     같이 센다 — 같은 "돈이 모자라 못 태운다" 처지인데 두 화면의 선택지가 어긋나 있었다.
     ★ 새 계산을 파지 않는다 — `recoveryOptions()`는 이미 있는 함수를 그대로 부를 뿐이다. */
  recoveryOptions,
} from '../state.js';
import { el, overlay, toast, refreshHUD, refreshLog, spriteElTrim, josa } from '../ui.js';
import { go, viewport } from '../main.js';

const PANEL = { x: 196, y: 8, w: 194, h: VH - 16 };

let bg, front, city, panelEl = null, crews = [], hover = -1;

export const tavernScene = {
  enter() {
    city = CITY_BY_ID[state.at];
    bg = tavernSprite(city.style, city.seed);
    front = tavernFrontSprite();
    crews = tavernCrews(city.id);
    hover = -1;
    buildUI();
  },

  exit() { panelEl = null; },

  resize() { layout(); },

  draw(ctx, t) {
    blit(ctx, bg, 0, 0, 1);

    /* 자리에 앉은 무리 — 한 무리에 한 사람만 세운다.
       인원수만큼 세우면 여섯 명짜리 무리가 화면을 메우고 무리끼리 구별이 안 된다.
       대신 그 무리가 백병전에서 서는 병종(CREW_TRAITS[].troop)으로 그려
       "거친 자들"과 "애송이"가 실루엣에서 갈리게 한다.

       좌석 좌표는 **중심 x**라 스프라이트 폭의 절반을 뺀다 — 좌상단으로 두면
       테이블과 반 칸씩 어긋나고, 좌석을 옮길 때마다 그 보정을 다시 계산해야 한다. */
    crews.forEach((b, i) => {
      const seat = TAVERN_SEATS[i];
      if (!seat) return;
      // 이미 태운 무리는 자리를 비운다 — 배로 갔기 때문이다
      if (state.hired.includes(b.id)) return;
      const bob = i === hover ? Math.round(Math.sin(t * 4) * 1) : 0;
      // 이 바다 사람들이다 — 그림이 있는 권역은 그 얼굴로 뜬다(assets/npc/char-sailor-<권역>.png)
      blit(ctx, unitSprite(b.troop, 'idle', null, regionOf(state.at)),
           seat.x - CW / 2, seat.y - CHAR_FOOT + bob, 1, seat.flip);
    });

    // 테이블 앞면 — 인물 뒤에 그리면 발치에 널빤지가 깔린 꼴이 된다.
    // 화면 전체가 아니라 테이블 영역만 구운 스프라이트라 그 자리에 얹는다.
    blit(ctx, front, TAV_FRONT.x, TAV_FRONT.y, 1);
  },
};

/* ★ 조선소와 **같은 규칙**이다(2026-08-29 · 회차 25) — 패널은 논리좌표에 얹되 레터박스까지 쓴다.
   `scale=1`(640×360)에서 패널이 194×209 CSS px밖에 안 되는데 안의 글자는 CSS px 고정이라,
   머리말이 123px을 먹고 본문(`.tav-body`)에 **83px**만 남았다. 무리 카드 한 장이 272px이니
   **카드 한 장도 안 들어갔다.** 왼쪽 모서리(논리 x=196)는 그대로 못박아 그림은 안 덮는다. */
const MIN_W = 300, EDGE = 4;

function layout() {
  if (!panelEl) return;
  const { offX, offY, scale, w: vw, h: vh } = viewport();
  /* ⚠️ `viewport().h`는 `fit()`이 마지막으로 잰 **캔버스** 크기다 — 640×360에서 상태바가 두 줄로
     접히면 `#stage`가 그보다 22px 작다(실측). 상자는 **지금 살아 있는 `#overlay`**를 잰다. */
  const box = panelEl.parentElement;
  const sw = box?.clientWidth || vw, sh = box?.clientHeight || vh;
  const left = offX + PANEL.x * scale;
  const w = Math.max(PANEL.w * scale, Math.min(MIN_W, Math.max(80, sw - left - EDGE)));
  /* 높이는 무대 세로를 다 쓴다 — 왼쪽 모서리가 논리 x=196에 못박혀 있어 그림을 안 덮고,
     위아래는 레터박스다(조선소와 같은 규칙). */
  const h = Math.max(80, sh - EDGE * 2);
  const top = EDGE;
  Object.assign(panelEl.style, {
    left: `${left}px`, top: `${top}px`,
    width: `${w}px`, height: `${h}px`,
  });
}

/* ══════════════════════════════════════════════════════════════ */
function buildUI() {
  const need = ship().crewMin || 0;
  const short = state.crew < need;

  panelEl = el('div#tavern-panel', {}, [
    el('div.tav-head', {}, [
      el('div', {}, [
        el('h3', { text: `${city.name} 술집` }),
        /* 선원 수는 상태바에도 있지만 **이 화면의 주제**라 남긴다 — 대신 한 줄로 줄였다.
           (회차 25 실측: 640×360에서 머리말 123px · 본문 83px이라 카드 한 장도 안 들어갔다) */
        el('div.sub', {
          text: `선원 ${state.crew}/${state.crewMax}`
              + (need ? ` (최소 ${need})` : '')
              + ` · 일당 ${avgCrewWage().toFixed(2)}닢`,
          style: short ? { color: '#e0806e' } : null,
        }),
        el('div.sub', {
          text: state.crew === 0
            ? '갑판에 사람이 없다. 무리를 태우지 않으면 배는 뜨지 않는다.'
            : short
              ? `${need - state.crew}명이 모자라 배가 제 속력을 못 낸다.`
              : '사람은 이틀마다 갈린다.',
          style: short ? { color: '#e0806e' } : { color: '#8f8878' },
        }),
      ]),
      el('button.btn.sm.dark', { text: '나가기', onclick: () => go('port') }),
    ]),

    el('div.tav-body', {}, [
      repCard(),
      strandedCard(),
      ...(crews.length ? crews.map(bandCard) : [
        el('div.tav-empty', { text: '오늘은 자리가 비었다. 며칠 뒤에 다시 와 보자.' }),
      ]),
      dockCard(),
    ]),
  ].filter(Boolean));
  overlay.replaceChildren(panelEl);
  layout();
}

/* ── 소문난 배 (다-3 · 2026-08-30 · 회차 27) ────────────────────
   ★ **이 한 줄이 없으면 규칙이 없는 것과 같다.** 체불·이탈은 그 부두에 자국을 남기고
     같은 바다로 절반 번지는데(`state.js: markCrewRep`·`crewRepAt`), 그 자국이 하는 일은
     **자리를 줄이고 · 계약금을 올리고 · 오는 사람의 기질을 갈아 치우는 것**이다
     (`data.js: TAVERN.rep` · 실측 자국 1.0에서 자리 −2 · 계약금 +60% · 일당 +20%).
     화면이 말하지 않으면 플레이어는 자기 배가 왜 안 차는지 영영 모르고 *"운이 나빴다"*로 읽는다.
     이 저장소가 이미 못박아 둔 자리다 — *"규칙이 멀쩡한데 화면이 말하지 않아 수백 일을 잃는다"*.
   ★ **값은 규칙에서만 온다** — 자국은 `crewRepAt()`가, 계수는 `TAVERN.rep`이 정본이고
     여기서는 곱셈 한 번으로 **보이는 말**로 바꿀 뿐이다(새 계산 경로를 파지 않는다).
   ⚠️ 자국이 0이면 **아무것도 안 그린다.** 늘 떠 있으면 벽지가 되고, 벽지가 되면
     정작 소문이 났을 때 안 읽힌다(strandedCard와 같은 기준). */
function repCard() {
  const rep = crewRepAt(city.id);
  if (!(rep > 0)) return null;

  const R = TAVERN.rep ?? {};
  /* 세 단계 — 문구는 규칙 PM이 넘긴 표 그대로다(RULE-ISSUES §A-2).
     자국은 이어진 값이지만 **말은 세 단계**여야 한다. 퍼센트를 그대로 읽어 주면
     "0.37의 평판"이라는 말이 되고, 그것은 이 게임의 어느 화면도 쓰지 않는 말투다. */
  const tier = rep >= 0.60 ? 2 : rep >= 0.30 ? 1 : 0;
  const line = [
    '삯이 밀렸다는 말이 돈다 — 값을 조금 더 부른다',
    '이 부두는 당신 배를 안다. 선불을 더 달라고 한다',
    '성한 무리는 딴 배를 골랐다. 남은 것은 아쉬운 사람들뿐이다',
  ][tier];

  const seats = Math.round(rep * (R.seats ?? 0));
  const adv = Math.round(rep * (R.adv ?? 0) * 100);
  const wage = Math.round(rep * (R.wage ?? 0) * 100);
  /* 여기에 제 자국이 없으면 **다른 항구에서 들려온 소문**이다(`crewRepAt`이 같은 바다를
     절반으로 친다). 그것을 안 적으면 "여기서는 밀린 적이 없는데 왜"가 된다. */
  const mine = state.crewRep?.[city.id];
  const heard = !(mine?.v > 0);

  /* ★ U4(회차 29) — "90일마다 절반씩 잊힌다"는 **일반 규칙**만 있고, 지금 이 자국이
     **언제** 다음 반감에 닿는지(남은 날)는 어디에도 없었다. `mine.day`는 이 자국이
     마지막으로 찍힌 날(`markCrewRep`)이고, 반감은 그날부터 `halfLife`마다 되풀이되는
     주기이므로 다음 경계까지 남은 날은 나머지 연산 하나면 된다 — 새 규칙이 아니라
     `crewRepAt`이 이미 쓰는 지수감쇠(`repMark`)를 **날짜로 되짚어** 읽을 뿐이다.
     소문(heard)만 들었을 땐 이 항구엔 제 자국이 없어 잴 것이 없다 — 일반 규칙만 남긴다. */
  const hl = R.halfLife ?? 90;
  const daysLeft = mine?.v > 0 ? hl - ((state.day - mine.day) % hl) : null;

  /* ⚠️ **줄을 셋 이상 쓰지 않는다.** 640×360에서 술집 본문은 182px뿐이라(실측)
     이 카드가 넉 줄이면 무리 카드가 통째로 접혀 내려간다 — 소문을 알리려다 **고를 사람을
     가리는** 꼴이 된다(회차 25가 머리말에서 겪은 그 자리). 그래서 값과 잊힘을 한 줄로 잇는다. */
  return el(`div.tav-card.tav-rep.t${tier}`, {}, [
    el('div.tav-name', {}, [el('b', { text: '소문난 배' })]),
    el('div.tav-desc.tav-rep-line', {
      text: (heard ? '이 바다의 다른 항구에서 들려온 말이다 — ' : '') + line,
    }),
    el('div.tav-desc', {
      style: { color: '#8f8878' },
      text: [seats > 0 ? `자리 −${seats}` : null,
             adv > 0 ? `계약금 +${adv}%` : null,
             wage > 0 ? `일당 +${wage}%` : null,
             `참을성 있는 무리가 딴 배를 고를 확률 ${Math.round(rep * 100)}%`,
             daysLeft != null ? `${daysLeft}일 뒤 절반으로 준다(주기 ${hl}일)` : `${hl}일마다 절반씩 잊힌다`,
            ].filter(Boolean).join(' · '),
    }),
  ]);
}

/* ── 여기가 잠기는 자리다 (C-17 · 화면 쪽) ──────────────────────
   ★ **규칙이 아니라 안내다.** 이 씬은 게임에서 선장이 가장 먼저 들어가는 방이고,
     동시에 **판이 잠기는 방**이다 — 금고가 비면 사람을 못 태우고, 사람이 없으면 배가 안 뜬다
     (GRAND-ISSUES #6). 그런데 화면이 하는 말은 단추마다 붙은 *「N닢 모자란다」* 뿐이라,
     실제로 완주 러너가 960일차에 그 앞에서 멈췄다. 회복 경로(짐·창고·정박선·거점을 팔고
     마지막에 청산)는 **진작 다 있었는데 아무도 그 말을 안 했다.**
   ★ 벌칙은 한 칸도 안 건드린다 — 값은 전부 `state.js: salvage()`가 세고, 여기서는
     **막힌 이유와 문이 어디 있는지**만 말한다. 「파산의 긴장은 남긴다」(사용자 결정).
   ⚠️ 뜨는 조건을 좁게 잡는다 — *사람이 필요한데 아무도 못 태우는* 국면에서만.
     돈이 잠깐 없을 때마다 붉은 판이 뜨면 진짜 막혔을 때 아무도 안 읽는다(경보 피로). */
function strandedCard() {
  const room = state.crewMax - state.crew;
  if (room <= 0) return null;                       // 자리가 없어 못 태우는 것은 다른 이야기다
  if (!(state.crew === 0 || shorthanded())) return null;

  const bands = crews.filter((b) => !state.hired.includes(b.id) && b.n <= room);
  const cheapest = bands.length ? Math.min(...bands.map((b) => b.advance)) : null;
  const dock = Math.min(5, room) * HIRE_UNIT;
  const wall = Math.min(...[cheapest, dock].filter((v) => v != null));
  if (state.gold >= wall) return null;              // 아직 태울 수 있다 — 막힌 것이 아니다

  const rows = salvage(city.id);
  const total = rows.reduce((a, r) => a + r.gold, 0);
  /* ★ 2026-08-30 — 「다른 항구에 둔 배·거점이 있으면」이라고 **가정법**으로 적고 있었다.
     규칙은 그것이 어디에 얼마나 있는지 이미 안다(`salvageElsewhere`) — 물어봐서 말한다. */
  const away = salvageElsewhere(city.id);
  const awayTotal = away.reduce((a, r) => a + r.gold, 0);
  /* ★ U2 — 항구의 `salvageCard`와 **같은 문**을 본다(`recoveryOptions().doors`의 `kind:'advance'`).
     계약 선금은 파는 것이 아니라 **빌리는 것**(갚는 길은 납품)이라 `salvage`엔 안 잡힌다 —
     그래서 이 카드가 따로 물어야 한다. `kind`로 찾는다(문 순서가 바뀌어도 안 죽게). */
  const adv = recoveryOptions(city.id).doors.find((d) => d.kind === 'advance');

  return el('div.tav-card.tav-stranded', {}, [
    el('div.tav-name', {}, [el('b', { text: '사람을 못 태운다' })]),
    el('div.tav-desc', {
      text: `금고 ${state.gold.toLocaleString('ko-KR')}닢 — 여기서 가장 싼 계약금이`
          + ` ${wall.toLocaleString('ko-KR')}닢이다. **사람이 없으면 배는 뜨지 않는다.**`,
    }),
    el('div.tav-desc', {
      style: { color: total > 0 ? '#d0a04a' : '#e0806e' },
      text: total > 0
        ? `항구로 나가면 지금 여기서 팔 수 있는 것이 ${total.toLocaleString('ko-KR')}닢어치 있다`
          + ` (${rows.slice(0, 3).map((r) => r.label).join(' · ')}${rows.length > 3 ? ' …' : ''}).`
        : away.length
          ? `이 항구에서 팔 것은 없다. 그러나 **${away[0].name}**`
            + `${away[0].days != null ? `(${away[0].days}일)` : ''}에 `
            + `${away[0].gold.toLocaleString('ko-KR')}닢어치가 있다`
            + (away.length > 1 ? ` (다 합치면 ${awayTotal.toLocaleString('ko-KR')}닢).` : '.')
            + ' 출항은 막히지 않는다 — 못 낸 몫이 빚으로 남을 뿐이다.'
          : '이 항구에서 팔 것은 없고 다른 항구에 둔 것도 없다.'
            + ' 남은 문은 **청산**이다 — 배를 넘기고 셈을 끝내면 판은 1일차 조건으로 다시 선다.',
    }),
    /* ★ U2 — 파는 문 말고 **빌리는 문**도 있다는 것을 여기서 처음 말한다.
       금액·기한·위약금까지 함께 적는다(`port.js`의 같은 문과 같은 기준 — 「가능」만 있으면 잘못 권한다). */
    adv?.ok ? el('div.tav-desc', {
      style: { color: '#d0a04a' },
      text: `상관 게시판에 계약 선금 ${adv.value.toLocaleString('ko-KR')}닢짜리 일감도 있다`
          + ` — ${CITY_BY_ID[adv.to]?.name ?? adv.to}까지 ${GOOD_BY_ID[adv.goodId]?.name ?? adv.goodId}`
          + ` ${adv.qty}개를 ${adv.due}일차까지 넘겨야 하고,`
          + ` 못 지키면 위약금 ${adv.fine.toLocaleString('ko-KR')}닢이 빚으로 남는다.`,
    }) : adv && adv.need > 0 ? el('div.tav-desc', {
      style: { color: '#8f8878' },
      text: `상관에 일감은 있으나 선창이 ${adv.need}칸 모자라 선금을 못 받는다`
          + ` (${adv.qty}개를 실어야 한다).`,
    }) : null,
    el('button.btn.sm', {
      text: adv?.ok ? '항구로 — 팔 것 · 계약 선금을 본다' : '항구로 — 팔 것을 본다',
      title: '항구 오른쪽 맨 위 「금고가 바닥이다」 카드에 팔 것과 마지막 문이 모여 있다',
      onclick: () => go('port', adv?.ok ? { tab: 'trade' } : undefined),
    }),
  ]);
}

/* 무리 한 자리 */
function bandCard(b, i) {
  const taken = state.hired.includes(b.id);
  const room = state.crewMax - state.crew;
  const tooMany = b.n > room;
  const tooDear = b.advance > state.gold;
  const T = CREW_TRAITS[b.trait];

  // 표준 일당(1.2닢) 대비 얼마나 비싼가 — 숫자만 보면 비교가 안 된다
  const wagePct = Math.round((b.wage / CREW_WAGE - 1) * 100);

  return el(`div.tav-card${taken ? '.taken' : ''}`, {
    onmouseenter: () => { if (hover !== i) { hover = i; } },
    onmouseleave: () => { hover = -1; },
  }, [
    el('div.tav-row', {}, [
      el('div.tav-por', {}, spriteElTrim(unitSprite(b.troop, 'idle', null, regionOf(state.at)), 2)),
      el('div.tav-info', {}, [
        el('div.tav-name', {}, [
          el('b', { text: b.name }),
          el('span.tav-n', { text: `${b.n}명` }),
        ]),
        el('div.tav-trait', { text: `${b.traitName} · 백병 ${TROOPS[b.troop].name}` }),
        el('div.tav-desc', { text: T.desc }),
      ]),
    ]),
    el('div.tav-cost', {}, [
      el('div.tav-cost-cell', {}, [
        el('span.k', { text: '계약금' }),
        el('b', {
          text: `${b.advance.toLocaleString('ko-KR')}닢`,
          style: tooDear && !taken ? { color: '#e0806e' } : null,
        }),
      ]),
      el('div.tav-cost-cell', {}, [
        el('span.k', { text: '일당' }),
        el('b', { text: `${b.wage.toFixed(2)}닢 ×${b.n}` }),
        el('span.tav-delta', {
          text: wagePct === 0 ? '표준' : `${wagePct > 0 ? '+' : ''}${wagePct}%`,
          style: { color: wagePct > 0 ? '#c88a6a' : wagePct < 0 ? '#7fa86a' : '#8f8878' },
        }),
      ]),
    ]),
    taken
      ? el('div.tav-done', { text: '배에 올랐다' })
      : el('button.btn.sm', {
          text: tooMany ? `선실이 ${b.n - room}자리 모자란다`
              : tooDear ? `${(b.advance - state.gold).toLocaleString('ko-KR')}닢 모자란다`
              : `태운다 (−${b.advance.toLocaleString('ko-KR')}닢)`,
          disabled: tooMany || tooDear,
          onclick: () => doRecruit(b),
        }),
  ]);
}

/* 부두 인부 — 술집에 마땅한 사람이 없을 때의 도피처.
   값이 네 배쯤 비싸므로 평소에는 고르지 않는다. 이 카드가 있는 이유는
   "술집이 텅 빈 날 배가 묶이는" 막다른 길을 막기 위해서다. */
function dockCard() {
  const room = state.crewMax - state.crew;
  const n = Math.min(5, room);
  const cost = n * HIRE_UNIT;
  return el('div.tav-card.tav-dock', {}, [
    el('div.tav-row', {}, [
      el('div.tav-info', {}, [
        el('div.tav-name', {}, [el('b', { text: '부두 인부' })]),
        el('div.tav-desc', {
          text: '이름도 묻지 않고 태운다. 값이 네 배지만 언제든 구할 수 있다.',
        }),
      ]),
    ]),
    el('div.tav-cost', {}, [
      el('div.tav-cost-cell', {}, [
        el('span.k', { text: '계약금' }),
        el('b', { text: `${HIRE_UNIT}닢/명` }),
      ]),
      el('div.tav-cost-cell', {}, [
        el('span.k', { text: '일당' }),
        el('b', { text: `${CREW_WAGE.toFixed(2)}닢` }),
        el('span.tav-delta', { text: '표준', style: { color: '#8f8878' } }),
      ]),
    ]),
    el('button.btn.sm.dark', {
      text: n <= 0 ? '선실이 가득 찼다' : `${n}명 고용 (−${cost.toLocaleString('ko-KR')}닢)`,
      disabled: n <= 0 || cost > state.gold,
      onclick: () => {
        const r = hire(5);
        if (!r.ok) return toast(r.reason, 'bad');
        toast(`부두에서 ${r.n}명을 태웠다 · ${r.cost.toLocaleString('ko-KR')}닢`, 'good');
        after();
      },
    }),
  ]);
}

function doRecruit(b) {
  const r = recruitBand(b.id);
  if (!r.ok) return toast(r.reason, 'bad');
  toast(`${b.name} ${b.n}명이 배에 올랐다 · 계약금 ${b.advance.toLocaleString('ko-KR')}닢`, 'good');
  pushLog(`${city.name} 술집에서 ${b.name}(${b.traitName}) ${b.n}명을 태웠다.`, 'good');

  // 인원이 최소선을 채우는 순간을 짚어 준다 — 이 게임의 첫 관문이기 때문이다
  if (!shorthanded() && state.crew - b.n < (ship().crewMin || 0)) {
    pushLog(`${ship().name}${josa(ship().name, '을/를')} 몰 사람이 모였다. 이제 출항할 수 있다.`, 'good');
  }
  after();
}

function after() {
  crews = tavernCrews(city.id);
  refreshHUD();
  refreshLog();
  buildUI();
}
