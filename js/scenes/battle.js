// scenes/battle.js — 해상 전투
//   1단계 포격전: 거리 조절 + 조준 미니게임
//   2단계 백병전: 접현 후 갑판 난투 (병종 상성 + 커맨드)

import { VW, openSeaSprite, blastSprite, smokeSprite, splashSprite, ballSprite } from '../sprites/scene.js';
import { shipSprite, WATERLINE, SW, HULLS } from '../sprites/ship.js';
import { unitSprite, pirateSprite, CHAR_FOOT } from '../sprites/char.js';
import { blit } from '../pixel.js';
import { TROOPS, GOOD_BY_ID, SHOTS, SHOT_KEYS, SHIPS } from '../data.js';
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
} from '../state.js';
import { el, overlay, toast, modal, refreshHUD, refreshLog, bar, josa, spriteElTrim } from '../ui.js';
import { go } from '../main.js';
/* 연출 대기는 전부 배속을 거친다 — 규칙(피해·확률·거리)은 건드리지 않는다. → js/speed.js */
import { after } from '../speed.js';

const SEA_Y = 138;          // 두 배가 떠 있는 기준 수면 y
const MIN_RANGE = 0, MAX_RANGE = 100;
/** 교전 거리 → 두 배 사이의 화면상 간격 (양끝에서 잘리지 않는 범위로 묶는다) */
const gapOf = (range) => 14 + (range / MAX_RANGE) * 68;

let B = null;               // 전투 상태
let fx = [];                // 이펙트 목록

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
    buildUI();
  },

  exit() { B = null; fx = []; },

  update(dt, t) {
    if (!B) return;
    B.shake = Math.max(0, B.shake - dt * 3.4);
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

    // 백병전은 두 선체가 현측을 맞댄 상태로 고정한다
    const gap = B.phase === 'melee' ? 62 : gapOf(B.range);
    const bobA = Math.sin(t * 1.1) * 1.6;
    const bobB = Math.cos(t * 1.3) * 1.6;

    // 우리 배 (왼쪽, 오른쪽을 향함)
    const yourX = Math.round(VW / 2 - gap - SW * 0.62);
    blit(ctx, shipSprite(ship().hull, {
      tint: ship().tint, flag: 'venice',
      furl: B.phase === 'melee',
      firing: B.fireFlash === 'you' ? 2 : -1,
      damaged: dmgLevel(B.you),
    }), yourX, SEA_Y - WATERLINE + Math.round(bobA), 1);

    // 적선 (오른쪽, 좌우 반전해 왼쪽을 향함)
    const foeX = Math.round(VW / 2 + gap - SW * 0.38);
    blit(ctx, shipSprite(B.enemy.hull, {
      tint: B.enemy.tint, flag: B.enemy.flag,
      furl: B.phase === 'melee',
      firing: B.fireFlash === 'foe' ? 2 : -1,
      damaged: dmgLevel(B.foe),
    }), foeX, SEA_Y - WATERLINE + Math.round(bobB), 1, true);

    if (B.phase === 'melee') drawMelee(ctx, yourX, foeX, bobA, bobB);

    drawFx(ctx);
    ctx.restore();
  },
};

const dmgLevel = (s) => s.hp / s.maxHp < 0.3 ? 2 : s.hp / s.maxHp < 0.62 ? 1 : 0;

/* ══════════════════════════════════════════════════════════════
   이펙트
   ══════════════════════════════════════════════════════════════ */
function addFx(kind, x, y, life = 0.5) { fx.push({ kind, x, y, t: 0, life }); }

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
      blit(ctx, s, f.x - s.width / 2, f.y - s.height / 2 - u * 10, 1, false, 0.85 - u * 0.7);
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
  const aim = armsAimAt(B.range);
  const goodW = (0.20 + closeness * 0.24) * aim;
  const critW = (0.05 + closeness * 0.06) * aim;
  const center = 0.30 + Math.random() * 0.40;
  B.aim = {
    pos: 0, dir: 1,
    speed: 0.85 + Math.random() * 0.35 + B.range / 260,
    good: [center - goodW / 2, center + goodW / 2],
    crit: [center - critW / 2, center + critW / 2],
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
      const base = (4 + (B.you.guns + B.you.aux) * 1.15) * armsFactor('dmg') * SHOT.dmg;
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

    // 거리가 가까울수록 잘 맞는다
    const acc = 0.34 + (1 - B.range / MAX_RANGE) * 0.42;
    after(() => {
      if (!B) return;
      if (Math.random() < acc) {
        const dmg = Math.round((3 + e.guns * 1.05) * (0.8 + Math.random() * 0.45));
        /* ★ 동행선이 한 척 끼어들어 대신 맞는다 — 그 몫은 **그 배의 선체**로 간다.
           크게 상한 배는 여기서 가라앉고 선단에서 빠진다(state.js: spreadDamage). */
        const sp = spreadDamage(dmg);
        B.you.hp = Math.max(0, B.you.hp - sp.toYou);
        // 내포격 골조를 넣었으면 파편이 갑판까지 튀지 않는다
        const cl = Math.round(sp.toYou * (0.1 + Math.random() * 0.12) * crewLossFactor());
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
      slot: i, pose: 'idle', poseT: 0, offset: 0,
    };
  });
}

function toMelee() {
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

function drawMelee(ctx, yourX, foeX, bobA, bobB) {
  const m = B.melee;
  if (!m) return;
  // 선종마다 건현 높이가 달라 갑판선을 선체 정의에서 직접 가져온다
  const deckOf = (hull, bob) =>
    SEA_Y - WATERLINE + Math.round(bob) + HULLS[hull].deck - CHAR_FOOT;

  const yH = HULLS[ship().hull], fH = HULLS[B.enemy.hull];
  const yDeck = deckOf(ship().hull, bobA);
  const fDeck = deckOf(B.enemy.hull, bobB);
  const alive = (arr) => arr.filter((u) => u.hp > 0);

  // 병사는 적을 마주보는 현측에 늘어선다. 배마다 선체 자리와 길이가 달라
  // 시작점과 간격을 선체에서 뽑는다 — 상수로 두면 작은 배에서 뱃전 밖에 선다.
  const yStep = Math.max(10, Math.min(16, Math.round(yH.len * 0.13)));
  const fStep = Math.max(10, Math.min(16, Math.round(fH.len * 0.13)));
  const yStart = yH.x0 + Math.round(yH.len * 0.46);
  const fStart = fH.x0 + Math.round(fH.len * 0.42);

  // 양쪽 갑판 모두 이 바다 사람들이다 — 왜구 배에 지중해 선원이 서 있었다
  const face = regionOf(state.at);
  alive(m.you).forEach((u, i) => {
    blit(ctx, unitSprite(u.key, u.pose, null, face), yourX + yStart + i * yStep + u.offset, yDeck, 1, false);
  });
  alive(m.foe).forEach((u, i) => {
    blit(ctx, unitSprite(u.key, u.pose, null, face), foeX + fStart - i * fStep - u.offset, fDeck, 1, true);
  });
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
    u.pose = 'attack'; u.offset = 5;
  }
  // 적 반격 (죽은 유닛은 빠진다)
  for (const u of m.foe.filter((x) => x.hp > 0)) {
    const target = yl[Math.floor(Math.random() * yl.length)];
    const raw = u.atk * (0.8 + Math.random() * 0.45);
    const d = Math.max(1, Math.round(raw - target.def * 0.42 * mods.def));
    target.hp -= d; fdmg += d;
    u.pose = 'attack'; u.offset = 5;
  }
  for (const u of [...m.you, ...m.foe]) if (u.hp <= 0) u.pose = 'hit';

  const yDead = m.you.filter((u) => u.hp <= 0).length;
  const fDead = m.foe.filter((u) => u.hp <= 0).length;
  logLine(`${mods.label} — 적에게 ${ydmg}, 아군 ${fdmg} 피해. (전사 아군 ${yDead} / 적 ${fDead})`);

  // 선원 수에도 반영
  B.you.crew = Math.max(0, B.you.crew - Math.round(fdmg / 7));
  B.foe.crew = Math.max(0, B.foe.crew - Math.round(ydmg / 7));

  m.round++;
  buildUI();

  after(() => {
    if (!B) return;
    for (const u of [...m.you, ...m.foe]) { if (u.hp > 0) { u.pose = 'idle'; u.offset = 0; } }
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
    const lostGold = Math.round(state.gold * 0.5);
    state.gold -= lostGold;
    const dumped = [];
    for (const id of Object.keys(state.cargo)) {
      dumped.push(`${GOOD_BY_ID[id].name} ${state.cargo[id]}`);
      delete state.cargo[id];
    }
    state.hp = Math.max(12, Math.round(state.maxHp * 0.25));
    state.crew = Math.max(4, Math.round(state.crew * 0.5));
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

  const rows = el('div.result-list', {}, [
    el('div.result-row', {}, [el('span', { text: '노획 금화' }), el('b', { text: coin.toLocaleString('ko-KR') + '닢' })]),
    bounty && el('div.result-row', {}, [
      el('span', { text: '목에 걸린 값' }),
      el('b', { text: `${bounty.toLocaleString('ko-KR')}닢 — 항구에서 받는다` }),
    ]),
    gained.length && el('div.result-row', {}, [el('span', { text: '노획 화물' }), el('b', { text: gained.join(', ') })]),
    prize && el('div.result-row', {}, [
      el('span', { text: '적선' }),
      el('b', { text: state.fleet[prizeKey] ? `${prize.name} — 이미 같은 배가 있다 (해체 가능)` : `${prize.name} — 예인 가능` }),
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
      rows,
      prize ? el('p', {
        style: { marginTop: '6px', color: '#9a927f', fontSize: '12px' },
        text: state.fleet[prizeKey]
          ? `같은 선종을 이미 가지고 있다. 끌고 갈 선원이 없으니 해체해 자재로 팔 수 있다.`
          : `${prize.name}${josa(prize.name, '은/는')} 선체가 ${Math.round(PRIZE_HULL * 100)}%만 남았다. 다음 입항지까지 예인하면 선단에 들어온다.`,
      }) : null,
    ].filter(Boolean)),
    actions: [
      prize && {
        label: state.fleet[prizeKey] ? '해체해서 판다' : `${prize.name}을 예인한다`,
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

  // 거리 게이지
  if (B.phase === 'gunnery') {
    const pos = 100 - B.range;
    ui.append(el('div#range-wrap', {}, [
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
  const face = side === 'right' && B.enemy.face
    ? el('div.bar-face', {}, spriteElTrim(pirateSprite(B.enemy.face, B.enemy.level), 2))
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
