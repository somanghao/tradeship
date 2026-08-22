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
import { CITY_BY_ID, TROOPS, CREW_TRAITS } from '../data.js';
import {
  state, ship, tavernCrews, recruitBand, avgCrewWage, shorthanded,
  pushLog, hire, HIRE_UNIT, CREW_WAGE, regionOf,
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

/* ══════════════════════════════════════════════════════════════ */
function buildUI() {
  const need = ship().crewMin || 0;
  const short = state.crew < need;

  panelEl = el('div#tavern-panel', {}, [
    el('div.tav-head', {}, [
      el('div', {}, [
        el('h3', { text: `${city.name} 술집` }),
        el('div.sub', {
          text: `선원 ${state.crew}/${state.crewMax}`
              + (need ? ` · 이 배는 최소 ${need}명` : '')
              + ` · 평균 일당 ${avgCrewWage().toFixed(2)}닢`,
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
      ...(crews.length ? crews.map(bandCard) : [
        el('div.tav-empty', { text: '오늘은 자리가 비었다. 며칠 뒤에 다시 와 보자.' }),
      ]),
      dockCard(),
    ]),
  ]);
  overlay.replaceChildren(panelEl);
  layout();
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
