// scenes/map.js — 권역 지도: 항로 선택, 항해 연출, 해상 이벤트
//
// ★ 지도는 **한 번에 한 권역만** 보여준다. 권역마다 좌표계가 따로이기 때문에
//   전 세계 도시를 한 화면에 찍으면 좌표가 겹쳐 엉킨다. 다른 바다로 가는 길
//   (원양 항로)은 선으로 긋지 않고 **항로 목록에만** 나온다 — 그을 좌표가 없다.

import { mapSprite } from '../sprites/scene.js';
import { shipTopSprite } from '../sprites/ship.js';
import { blit } from '../pixel.js';
import {
  CITIES, CITY_BY_ID, ROUTES, GOOD_BY_ID, SHIPS, OFFICER, FLAG_NAME,
  REGION_OF_CITY, REGION_BY_ID, laneOf,
} from '../data.js';
import {
  state, ship, neighborsOf, voyageDays, distanceBetween, advanceDays,
  rollSeaEvent, pickEnemy, pushLog, cargoFree, routeWindLabel, voyageCost, windName,
  hasOfficer, officerPerk, routeDangerLabel,
  jettisonOdds, jettisonCargo, banditRaid, payToll, activeShocks, trimLoadout,
  fleeOdds, fleeWord, oceanReady, capLoot, addInfamy,
} from '../state.js';
import {
  worldTick, npcsOnLeg, tradersNearLeg, strayTrader, npcPos, removeNpc,
  pirateThreat, newsLines, pirateEnemy,
} from '../world.js';
import { ALL_TRADERS, ALL_PIRATES } from '../regions/index.js';
import { el, overlay, toast, modal, refreshHUD, refreshLog, josa, npcTitle } from '../ui.js';
import { go, toLogical, canvas, setInsetRight, setViewSpan } from '../main.js';

let bg, hover = null, sailing = null, pendingArrival = null;
let bgRegion = null;      // 지금 구워 둔 배경이 어느 권역 것인가

/* ── 권역 ─────────────────────────────────────────────────────
   지도는 지금 정박한 바다만 그린다. 다른 권역 도시는 좌표계가 달라 찍을 수 없다. */
const curRegion = () => REGION_OF_CITY[state.at] ?? 'mediterranean';
const viewCities = () => CITIES.filter((c) => c.region === curRegion());
const viewRoutes = () => {
  const rid = curRegion();
  return ROUTES.filter(([a, b]) => REGION_OF_CITY[a] === rid && REGION_OF_CITY[b] === rid);
};

/** 배경을 지금 권역에 맞춰 굽는다. 권역이 그대로면 캐시를 그대로 쓴다. */
function syncBg() {
  const rid = curRegion();
  if (bgRegion === rid && bg) return;
  bg = mapSprite(rid, viewCities(), viewRoutes());
  bgRegion = rid;
  // 이 바다의 도시가 걸쳐 있는 폭만 보이면 된다 — 그래야 배율이 한 단계 안 떨어진다
  const xs = viewCities().map((c) => c.x);
  if (xs.length) setViewSpan(Math.min(...xs), Math.max(...xs));
}

/* 항해 연출 길이(초) = BASE + 일수 × PER_DAY.
   처음엔 3일 항로가 1초 만에 끝나 "언제 움직였는지 모르겠다"는 소리를 들었다. */
const VOYAGE_BASE = 1.5, VOYAGE_PER_DAY = 0.42;

/* 몇 번째 판정이냐에 따라 사건 확률을 눅인다 — 긴 항해가 '반드시' 험해지지 않게. */
const EVENT_DAMP = [1, 0.62, 0.45, 0.34];

/* 항해 중인 배의 상태 */
function startVoyage(toId) {
  const from = CITY_BY_ID[state.at], to = CITY_BY_ID[toId];
  const days = voyageDays(state.at, toId);
  sailing = {
    from, to, days,
    // 이 구간에 실제로 떠 있는 배들 — 조우하면 지도에서 보던 그 배가 나온다
    foes: npcsOnLeg(state.at, toId, 'pirate'),
    ships: tradersNearLeg(state.at, toId),
    // 출항 시점에 굳힌다 — 항해 중에는 세계가 멈춰 있으므로(worldTick은 입항 때 돈다)
    threat: pirateThreat(state.at, toId),
    t: 0,
    speed: 1 / (VOYAGE_BASE + days * VOYAGE_PER_DAY),   // 거리에 비례한 연출 시간
    /* ★ 판정 횟수를 **일수에 매단다.** 전에는 항해 한 건에 딱 한 번이었다 —
       그러면 이틀짜리 잔지바르 항로와 **서른 날짜리 희망봉 항로의 위험이 같다.**
       요율 11.0을 적어 두어도 상한이 1건이라 "보험료가 비싸다"는 뜻밖에 못 했다.
       아프리카 테스터가 희망봉을 여섯 번 넘었는데 넷이 사건 0건이었고,
       그래서 이 게임에서 가장 긴 항로가 가장 지루하다고 적어 왔다.
       8일에 한 번씩, 넉 장까지. 좋은 사건(표류물·순풍·상선)도 같이 늘어나므로
       긴 항해가 위험해지기만 하는 것이 아니라 **사건이 많아진다.** */
    rollsLeft: Math.max(1, Math.min(4, Math.ceil(days / 8))),
    rollIdx: 0,
    eventAt: 0.22 + Math.random() * 0.3,
    eventDone: false,
  };
  buildUI();
}

export const mapScene = {
  enter() {
    // 오른쪽 항로 패널이 지도를 덮지 않게 그 폭만큼 좁혀 그린다(240px + 여백 14px씩)
    setInsetRight(268);
    syncBg();
    hover = null;
    /* ★ 씬에 들어올 때 항해를 지운다 — 항구에서 지도로 올 때는 이것이 맞다.
       그래서 **전투에서 돌아와 항해를 이어 붙일 때는 `go('map')`을 먼저 부르고
       그 다음에 `resumeVoyage`를 세워야 한다.** 순서를 뒤집으면 조용히 사라진다. */
    sailing = null;
    pendingArrival = null;
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    canvas.style.cursor = 'default';
    buildUI();
  },
  exit() {
    setInsetRight(0);
    setViewSpan(null);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('click', onClick);
    canvas.style.cursor = 'default';
  },

  update(dt) {
    if (!sailing) return;
    sailing.t = Math.min(1, sailing.t + dt * sailing.speed);

    if (!sailing.eventDone && sailing.t >= sailing.eventAt) {
      // 항로마다 위험이 다르다 — 보험료율(ROUTE_RISK) + 그 구간에 실제로 뜬 해적 수
      const ev = rollSeaEvent({
        from: sailing.from.id, to: sailing.to.id, threat: sailing.threat,
        damp: EVENT_DAMP[sailing.rollIdx ?? 0] ?? 0.3,
      });
      if (ev.id !== 'calm') {
        const held = sailing;
        sailing = null;                    // 연출 정지
        resolveEvent(ev, held);
        return;
      }
      /* ★ 잔잔했어도 **판정 한 장을 쓴 것**이라 다음 자리를 잡아야 한다.
         전에는 여기서 `eventDone = true`로 먼저 잠그고 calm이면 그대로 끝냈다 —
         그러면 `rollsLeft`를 넉 장으로 잡아 둬도 **첫 판정이 잔잔한 순간 나머지 세 장이
         버려진다.** 다음 자리를 잡는 곳이 `resumeVoyage` 하나뿐이고 그것은 사건이 났을 때만
         불리기 때문이다. 그래서 "긴 항해가 더 험하다"가 화면에 안 나왔다 —
         아프리카 테스터가 희망봉을 16구간 뛰어 6구간이 여전히 사건 0건임을 보고 잡아냈다.
         ★ 교훈: 규칙 함수를 직접 N번 불러 재는 것과 **게임이 실제로 밟는 경로**를 재는 것은
           다르다. 나는 앞의 방법으로 재고 "고쳤다"고 했다. */
      sailing = resumeVoyage(sailing);
    }
    if (sailing.t >= 1) {
      const to = sailing.to;
      sailing = null;
      arrive(to.id);
    }
  },

  draw(ctx, t) {
    syncBg();   // 항해로 다른 바다에 닿았으면 배경을 갈아 끼운다
    blit(ctx, bg, 0, 0, 1);
    drawRoutes(ctx, t);
    drawNpcs(ctx, t);
    drawCities(ctx, t);
    drawPlayer(ctx, t);
  },
};

/* ── 그리기 ─────────────────────────────────────────── */
function drawRoutes(ctx, t) {
  const reachable = new Set(neighborsOf(state.at));
  for (const [a, b] of viewRoutes()) {
    const A = CITY_BY_ID[a], B = CITY_BY_ID[b];
    const live = !sailing && (a === state.at || b === state.at);
    const dash = live ? 3 : 2, gap = live ? 3 : 5;
    const n = Math.round(Math.hypot(B.x - A.x, B.y - A.y));
    const phase = live ? (t * 14) % (dash + gap) : 0;
    for (let i = 0; i < n; i++) {
      if (((i + phase) % (dash + gap)) >= dash) continue;
      const u = i / n;
      const x = Math.round(A.x + (B.x - A.x) * u);
      const y = Math.round(A.y + (B.y - A.y) * u);
      ctx.fillStyle = live ? '#f4dd86' : '#ffffff28';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  void reachable;
}

function drawCities(ctx, t) {
  const reachable = new Set(neighborsOf(state.at));
  for (const c of viewCities()) {
    const here = c.id === state.at;
    const near = reachable.has(c.id);
    const hot = hover === c.id;
    const r = 2 + c.size;

    // 항구 표식
    ctx.fillStyle = '#17121c';
    ctx.beginPath(); ctx.arc(c.x, c.y, r + 1.4, 0, 7); ctx.fill();
    ctx.fillStyle = here ? '#f4dd86' : near ? '#e6c96a' : '#b0a692';
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.fill();
    ctx.fillStyle = here ? '#8a641a' : '#3d2a1b';
    ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(1, r - 2), 0, 7); ctx.fill();

    if (here) {                                   // 현재 정박지 강조 링
      const pulse = 1 + Math.sin(t * 3) * 0.18;
      ctx.strokeStyle = '#f4dd86'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c.x, c.y, (r + 3) * pulse, 0, 7); ctx.stroke();
    }
    if (hot && near && !sailing) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c.x, c.y, r + 3, 0, 7); ctx.stroke();
    }

    // 이름표
    const known = state.known.has(c.id) || near || here;
    if (known || hot) {
      ctx.font = '6px "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      const label = c.name;
      const w = ctx.measureText(label).width;
      const ly = c.y - r - 4;
      ctx.fillStyle = '#0d0b11c8';
      ctx.fillRect(c.x - w / 2 - 2, ly - 6, w + 4, 8);
      ctx.fillStyle = here ? '#f4dd86' : near ? '#ded2b8' : '#a89a84';
      ctx.fillText(label, c.x, ly);
      ctx.textAlign = 'left';
    }
  }
}

/* 저 혼자 도는 배들 — 상인은 흰 점, 해적은 붉은 점.
   지도가 좁아(400x225) 스프라이트를 다 그리면 뭉개지므로 점과 항적으로만 표시한다. */
function drawNpcs(ctx, t) {
  for (const n of state.npcs || []) {
    const p = npcPos(n);
    const x = Math.round(p.x), y = Math.round(p.y);
    const pirate = n.kind === 'pirate';
    ctx.fillStyle = '#17121c';
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = pirate ? '#d05a4a' : '#ded2b8';
    ctx.fillRect(x, y, 1, 1);
    if (n.to) {                                   // 진행 방향으로 짧은 항적
      const a = CITY_BY_ID[n.at], b = CITY_BY_ID[n.to];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
      ctx.fillStyle = pirate ? '#d05a4a66' : '#ded2b866';
      for (let i = 1; i <= 2; i++) {
        ctx.fillRect(Math.round(x - ux * i * 2), Math.round(y - uy * i * 2), 1, 1);
      }
    }
    if (pirate) {                                 // 해적은 천천히 깜빡여 눈에 띈다
      const pulse = 0.5 + Math.sin(t * 3 + n.id) * 0.5;
      ctx.fillStyle = `rgba(208,90,74,${0.25 * pulse})`;
      ctx.fillRect(x - 2, y - 2, 5, 5);
    }
  }
}

function drawPlayer(ctx, t) {
  const s = ship();
  const spr = shipTopSprite(s.hull, { tint: s.tint, flag: 'venice' });
  let x, y, ang = 0;

  if (sailing) {
    const u = ease(sailing.t);
    x = sailing.from.x + (sailing.to.x - sailing.from.x) * u;
    y = sailing.from.y + (sailing.to.y - sailing.from.y) * u;
    ang = Math.atan2(sailing.to.y - sailing.from.y, sailing.to.x - sailing.from.x) + Math.PI / 2;
    // 항적
    ctx.fillStyle = '#ffffff30';
    for (let i = 1; i <= 9; i++) {
      const uu = Math.max(0, u - i * 0.012);
      const px = sailing.from.x + (sailing.to.x - sailing.from.x) * uu;
      const py = sailing.from.y + (sailing.to.y - sailing.from.y) * uu;
      ctx.fillRect(Math.round(px), Math.round(py + Math.sin(t * 6 + i) * 0.6), 1, 1);
    }
  } else {
    const c = CITY_BY_ID[state.at];
    x = c.x + 7; y = c.y + 6;
    ang = Math.PI * 0.15;
  }
  const bob = Math.sin(t * 2.2) * 0.6;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(ang);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  ctx.restore();
}

const ease = (u) => u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;

/* ── 입력 ───────────────────────────────────────────── */
/** 커서 아래 항구 — **가장 가까운 것**을 고른다.
    ★ 예전에는 반경 안에 든 **첫 번째**를 잡았다. 도시가 열여섯일 때는 아무 도시도 겹치지
      않아 문제가 안 됐지만, 세계가 139곳이 되자 6px 안에 둘이 드는 자리가 생겼다
      (시칠리아 해협의 튀니스~몰타가 6.4px다). 첫 번째를 잡으면 목록에서 뒤에 있는 도시는
      **영영 고를 수 없다** — 지도를 넓힐 때마다 좌표를 억지로 떼어 놓는 대신 판정을 고친다. */
function cityAt(p) {
  let best = null, bestD = 6;
  for (const c of viewCities()) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d <= bestD) { best = c; bestD = d; }
  }
  return best;
}

function onMove(ev) {
  if (sailing) { hover = null; return; }
  const p = toLogical(ev);
  const found = cityAt(p)?.id ?? null;
  const near = found && neighborsOf(state.at).includes(found);
  canvas.style.cursor = near ? 'pointer' : 'default';
  if (found === hover) return;          // 바뀔 때만 사이드 패널을 다시 그린다
  hover = found;
  buildUI();
}

function onClick(ev) {
  if (sailing) return;
  const c = cityAt(toLogical(ev));
  if (!c || c.id === state.at) return;
  if (!neighborsOf(state.at).includes(c.id)) {
    toast('직항로가 없다. 이웃 항구를 거쳐 가야 한다.', 'bad');
    return;
  }
  startVoyage(c.id);
}

/* ── 도착 / 이벤트 ──────────────────────────────────── */
function arrive(cityId) {
  const days = voyageDays(state.at, cityId);
  const dist = distanceBetween(state.at, cityId);
  // state.at은 아직 출발 항구다(아래에서 갱신) — 보험료는 이 구간의 요율로 매긴다
  const cost = advanceDays(days, { from: state.at, to: cityId });
  const news = worldTick(days);              // 그 사이 상인과 해적도 움직였다
  state.stats.distance += Math.round(dist);
  state.at = cityId;
  if (state.fleet[state.shipKey]) state.fleet[state.shipKey].at = cityId;  // 기함은 함께 이동
  // 항해 중 나포해 끌고 오던 배는 여기서 내린다
  if (state.towing && state.fleet[state.towing]) {
    state.fleet[state.towing].at = cityId;
    const prizeName = SHIPS[state.towing].name;
    pushLog(`나포한 ${prizeName}${josa(prizeName, '을/를')} ${CITY_BY_ID[cityId].name} 부두에 매어 두었다.`, 'good');
  }
  state.towing = null;
  state.known.add(cityId);
  const c = CITY_BY_ID[cityId];
  pushLog(`${days}일 항해 끝에 ${c.name}에 입항했다.`
        + ` (일당 ${cost.wages} · 보급 ${cost.supplies}`
        + (cost.hull ? ` · 선체 ${cost.hull}` : '')
        + (cost.arms ? ` · 무장 ${cost.arms}` : '')
        + (cost.fleet ? ` · 선단 ${cost.fleet}` : '')
        + (cost.insurance ? ` · 보험 ${cost.insurance}` : '')
        + (cost.officer ? ` · ${OFFICER.name} ${cost.officer}` : '') + `닢)`, 'good');
  if (cost.leak > 0) pushLog(`항해 중 선체로 물이 새어 ${cost.leak}pt 삭았다. 배를 갈아타야 한다.`, 'bad');
  if (cost.expired) {
    pushLog(`${CITY_BY_ID[cost.expired.to].name} 납품 기한을 넘겨 위약금 ${cost.expired.fine}닢을 물었다.`, 'bad');
  }
  for (const line of newsLines(news, 2)) pushLog(`[소문] ${line.text}`, line.kind);
  refreshHUD();
  refreshLog();
  go('port');
}

/* ── NPC 조우 ────────────────────────────────────────────────
   지도 위를 실제로 도는 배들과 바다 한복판에서 마주친다.
   상인과는 흥정하거나(항구를 안 거치고 사고판다) 덮칠 수 있다. */

/* 해적 NPC → 전투용 적 변환은 규칙이라 `world.js`가 정본이다(대시보드도 같은 값을 읽는다). */

/* ── 명부에 적힌 사람을 화면으로 꺼낸다 ───────────────────────
   `regions/<권역>/npc-traders.js`·`npc-pirates.js`에는 배마다 `blurb`와
   `lines{greet,deal,refuse}`·`lines{hail,spare}`가 적혀 있는데 **아무도 읽지 않았다.**
   그래서 바르바로사와 이름 없는 좀도둑이 화면에서 똑같이 "돛이 보인다"였다.
   여기서 명부를 되짚어 그 한 줄을 만나는 순간에 얹는다 — 새 규칙은 없고, 말만 붙는다. */
const defOf = (n) => (n?.defId
  ? (n.kind === 'pirate' ? ALL_PIRATES : ALL_TRADERS).find((d) => d.id === n.defId)
  : null);

/** 그 사람이 하는 말 — 명부에 없으면 빈 문자열(연출이 조용해질 뿐 깨지지 않는다) */
function quote(line, color = '#c9b98a') {
  return line ? `<br><br><span style="color:${color}">${line}</span>` : '';
}

/** 상대의 배와 내 배를 나란히 놓고, 도주 가망을 말로 붙인다.
    사람은 이길 수 있는 상대만 싸우고 나머지는 피하려 한다 — 그 판단의 재료다.
    수치는 나란히 둘 때만 뜻이 생기고, 확률은 이 게임의 방식대로 말로 옮긴다(`fleeWord`). */
function foeVersusLine(e) {
  const odds = fleeOdds({ foeHull: e.hull });
  const heavier = e.guns > state.guns * 1.6 || e.crew > state.crew * 2;
  return `<span style="opacity:.9">상대는 <b>선체 ${e.hp} · 선원 ${e.crew} · 포 ${e.guns}문</b>`
       + `, 내 배는 선체 ${state.hp}/${state.maxHp} · 선원 ${state.crew} · 포 ${state.guns}문.`
       + `${heavier ? ' <b style="color:#d98a6a">이쪽이 밀린다.</b>' : ''}`
       + ` 돛을 돌리면 ${fleeWord(odds)}.</span>`;
}

/* 이름만으로는 급이 안 보인다. 명부의 소개가 있으면 그것을, 없으면 세기를 말로 옮긴다.
   ★ 사다리를 둘로 나눈 이유 — 이 표에는 해적만 있는 게 아니다. 프랑스 순찰 프리깃한테
     "두목급이다. 상선단이 철을 피해 다니는 이름이다"라고 적으면 왕의 배가 산적이 된다. */
const RANK_WORD = {
  pirate: ['', '이름도 못 얻은 잡배다.', '몇 번 굴러 본 무리다.',
           '이 바다에서 이름이 도는 자다.', '두목급이다. 상선단이 철을 피해 다니는 이름이다.',
           '이 바다의 주인 행세를 하는 자다.'],
  navy:   ['', '허가장 한 장을 앞세운 작은 배다.', '순찰이라 부르지만 하는 일은 다르지 않다.',
           '이 물목을 맡은 배다. 서류가 모자라면 짐도 모자라게 된다.',
           '왕실이 이름을 아는 배다. 이쪽 서류로는 이기지 못한다.',
           '기함이다. 이 바다를 제 앞바다로 여긴다.'],
};

/** 상선 NPC를 전투용 적으로 — 무장이 빈약한 대신 화물이 실려 있다 */
function merchantEnemy(n) {
  const s = SHIPS[n.shipKey];
  const goods = Object.keys(n.cargo);
  const def = defOf(n);
  /* ★ **전리품 상한을 상선에도 건다.** 해적(`pirateEnemy`)에는 `capLoot`이 있는데 상선만 없어서,
     한 척에 금화 11,557 + 전리품선 매각 13,200이 나왔다 — 같은 판의 88일 무역 이익이 8,000이었다
     (완주 플레이 ISSUES #22). "옮겨 실을 수 있는 만큼"이라는 규칙은 상대가 상인이어도 같다. */
  return capLoot({
    id: `npc:${n.id}`,
    // 명부에서 온 상단은 '콘타리니 상관의 상선', 이름 없는 배는 '상선 산타 마리아호'
    name: n.defId ? `${n.name}의 상선` : `상선 ${n.name}호`,
    // 덮친 쪽이 먼저 듣는 말 — 전투 첫 줄에 뜬다
    hail: def?.lines?.refuse ?? null,
    nation: '상인',
    hull: s.hull, tint: s.tint, flag: 'genoa',
    hp: Math.round(s.hp * 0.85), guns: Math.max(2, Math.round(s.guns * 0.5)),
    crew: Math.max(12, Math.round(s.crewMax * 0.45)),
    level: 1, prize: n.shipKey,
    troops: ['sailor', 'sailor', 'crossbow', 'sailor'],
    loot: {
      gold: [Math.round(n.gold * 0.5), Math.max(120, n.gold)],
      goods: goods.length ? goods : ['grain', 'salt'],
    },
  });
}

function meetMerchant(n, finish) {
  const cargoList = Object.entries(n.cargo);
  const to = n.to ? CITY_BY_ID[n.to].name : '어딘가';
  const rows = cargoList.map(([gid, q]) =>
    `${GOOD_BY_ID[gid].name} ${q}개`).join(', ') || '빈 배';
  const def = defOf(n);
  const who = npcTitle(n);

  // 흥정: 그가 실은 것을 그가 산 값에 웃돈을 얹어 산다 — 항구 시세보다는 싸다.
  // 부관이 곁에 있으면 뱃전에서 한 번 더 깎는다.
  const deal = cargoList.length ? (() => {
    const [gid, q] = cargoList[0];
    const unit = Math.max(1, Math.round(state.prices[n.at][gid] * 1.12 * (1 - officerPerk('haggleOff'))));
    const qty = Math.min(q, cargoFree(), Math.floor(state.gold / Math.max(1, unit)));
    return { gid, unit, qty, cost: unit * qty };
  })() : null;

  const actions = [];
  if (deal && deal.qty > 0) {
    actions.push({
      label: `${GOOD_BY_ID[deal.gid].name} ${deal.qty}개 사기 (${deal.cost.toLocaleString('ko-KR')}닢)`,
      onClick: () => {
        state.gold -= deal.cost;
        state.cargo[deal.gid] = (state.cargo[deal.gid] || 0) + deal.qty;
        const had = (state.cargo[deal.gid] || 0) - deal.qty;
        const prev = state.buyPrice[deal.gid] || 0;
        state.buyPrice[deal.gid] = Math.round((prev * had + deal.cost) / (had + deal.qty));
        n.cargo[deal.gid] -= deal.qty;
        if (n.cargo[deal.gid] <= 0) delete n.cargo[deal.gid];
        n.gold += deal.cost;
        pushLog(`${who}에게서 ${GOOD_BY_ID[deal.gid].name} ${deal.qty}개를 샀다.`, 'good');
        toast('해상 거래 성사', 'good');
        refreshHUD(); refreshLog();
        finish();
      },
    });
  }
  actions.push({
    label: '덮친다', kind: 'danger',
    onClick: () => {
      /* 이쪽이 먼저 손을 대는 순간이다. 상대의 마지막 말을 여기서 한 번 들려준다 —
         "원로원의 화물이오. 손대면 총독이 안다" 같은 줄이 명부에 이미 적혀 있었다. */
      /* ★ 덮치는 순간 **그 깃발에 악명이 쌓인다.** 잡히지 않아도 소문은 남는다 —
         털린 배가 항구에 닿으면 누가 털었는지 말하기 때문이다(ISSUES #22). */
      const flag = n.flag ?? defOf(n)?.flag ?? null;
      const lvl = flag ? addInfamy(flag, 1) : 0;
      pushLog(`${who}${josa(who, '을/를')} 덮치기로 했다.`
            + (def?.lines?.refuse ? ` ${def.lines.refuse}` : ''), 'warn');
      if (lvl) {
        pushLog(`이 일은 소문이 난다 — ${FLAG_NAME[flag] ?? flag} 쪽 항구에서 값을 치르게 된다 (악명 ${lvl}).`, 'bad');
      }
      refreshLog();
      go('battle', {
        enemy: merchantEnemy(n),
        /* ★ **순서가 규약이다 — `go('map')`을 먼저, `finish()`를 나중에.**
           `map.enter()`가 `sailing = null`로 시작하므로(88행) 반대로 쓰면
           `finish()`가 되살린 항해를 씬 진입이 곧바로 지운다. 그러면 **남은 항로가
           통째로 사라지고 출발 항구에 서 있게 된다** — 해적 쪽은 처음부터 이 순서였는데
           상선 쪽만 뒤집혀 있었다(완주 플레이가 잡았다 · `.playtest/conquest/ISSUES.md` #2). */
        onEnd: (result) => {
          if (result !== 'lose') removeNpc(n.id);
          if (result === 'lose') return;
          go('map');
          finish();
        },
        retreatTo: () => { go('map'); finish(); },
      });
    },
  });
  actions.push({ label: '지나 보낸다', kind: 'dark', onClick: finish });

  modal({
    title: '돛이 보인다 — 상선',
    body: `${CITY_BY_ID[n.at].name}에서 ${to}로 가는 <b>${who}</b>(${SHIPS[n.shipKey].name}).<br>`
        + (def?.blurb ? `<span style="opacity:.75">${def.blurb}</span><br>` : '')
        + `싣고 있는 것: <b>${rows}</b>`
        + (def?.lines?.greet ? quote(def.lines.greet) + '<br>' : '<br><br>')
        + (deal && deal.qty > 0
            ? `선장이 <b>${GOOD_BY_ID[deal.gid].name}</b>${josa(GOOD_BY_ID[deal.gid].name, '을/를')} `
              + `개당 ${deal.unit}닢에 넘기겠다고 한다. 항구 시세보다는 싸다.`
              + quote(def?.lines?.deal)
            : '넘겨받을 만한 것은 없어 보인다.')
        + (deal && deal.qty > 0 ? officerAside('merchant') : ''),
    actions,
    closable: false,
  });
}

/* 부관의 한마디 — 모달 본문 끝에 붙인다.
   새 이벤트를 추가하지 않고 **있던 이벤트가 다르게 풀리는 것**으로 부관을 체감시킨다.
   SEA_EVENTS의 weight 합은 이미 조율된 값이라 항목을 늘리면 조우 빈도가 통째로 흔들린다. */
function officerAside(lineKey) {
  if (!hasOfficer()) return '';
  return `<br><br><span style="color:#54a89b">${OFFICER.name}: ${OFFICER.lines[lineKey]}</span>`;
}

/* ── 이 구간은 바다인가 ───────────────────────────────────────
   원양 항로 둘(홍해 제다~알렉산드리아 · 바스라~베이루트)은 `overland: true`다.
   **배가 아니라 짐이 낙타에 실려 넘어가는 길**이라고 항로 설명에 적혀 있는데도,
   보험 요율이 숫자로 붙어 있는 탓에 `isInland`(요율 null)가 이 둘을 못 걸렀다.
   그래서 사막 한복판에서 "파도가 갑판을 덮쳤다"와 "수평선에 검은 깃발"이 떴다.
   ★ 여기서 고치는 것은 **어떤 사건이 어디서 일어나는가**다. 확률표(state.js)와
     피해량은 건드리지 않는다 — 같은 크기의 사고가 그 길에 맞는 얼굴로 온다. */
const isCaravan = (v) => !!laneOf(v.from.id, v.to.id)?.overland;

/** 대상로에서는 사건의 **얼굴**만 바꾼다 — 폭풍은 모래폭풍으로, 표류물은 길가에 버려진 짐으로.
    갈아 끼우는 것은 하나뿐이다: 해적 조우는 뱃전을 맞대야 성립하므로 노상강도가 받는다.
    (좋은 사건까지 나쁜 사건으로 바꾸면 그 구간만 조용히 더 가혹해진다 — 말이 아니라 밸런스다) */
const CARAVAN_EVENT = { pirate: 'bandit' };

/** 사건 하나를 치른 뒤 남은 항로를 마저 간다. 판정이 남아 있으면 다음 자리를 잡는다. */
function resumeVoyage(voyage) {
  const left = (voyage.rollsLeft ?? 1) - 1;
  const t = voyage.t ?? 0;
  return {
    ...voyage,
    rollsLeft: left,
    rollIdx: (voyage.rollIdx ?? 0) + 1,
    eventDone: left <= 0,
    // 남은 구간 안에서 다음 판정 자리를 잡는다 — 사건이 연달아 붙지 않게 여유를 둔다
    eventAt: left > 0 ? Math.min(0.97, t + (1 - t) * (0.3 + Math.random() * 0.45)) : 2,
  };
}

function resolveEvent(ev0, voyage) {
  const caravan = isCaravan(voyage);
  const ev = caravan && CARAVAN_EVENT[ev0.id] ? { ...ev0, id: CARAVAN_EVENT[ev0.id] } : ev0;
  const finish = () => {
    // 이벤트 처리 후 남은 항로를 마저 간다
    sailing = resumeVoyage(voyage);
    buildUI();
  };

  switch (ev.id) {
    case 'wind': {
      voyage.t = Math.min(0.95, voyage.t + 0.25);
      pushLog(caravan
        ? '길이 말라 있었다. 대열이 하루를 벌었다.'
        : '순풍을 만나 항해가 빨라졌다.', 'good');
      toast(caravan ? '길이 좋다 — 하루를 벌었다' : '순풍! 항로를 앞당겼다', 'good');
      refreshLog();
      finish();
      break;
    }
    case 'storm': {
      const dmg = 6 + Math.floor(Math.random() * 14);
      const lost = Math.random() < 0.35 ? 1 + Math.floor(Math.random() * 2) : 0;
      state.hp = Math.max(1, state.hp - dmg);
      state.crew = Math.max(1, state.crew - lost);
      if (lost) trimLoadout();   // 무리 명부와 갑판 슬롯을 줄어든 인원에 맞춘다

      /* ★ 폭풍이 심하면 배를 살리려 짐을 던진다(공동해손) — 보험이 무는 사건이 이것이다.
         전에는 보험료만 걷고 보상하는 자리가 없어, 그 항목이 사실상 세금이었다.
         확률은 항로 위험도에서 나온다(그 숫자의 본래 뜻이 사고 확률의 시장가격이다). */
      const jet = Math.random() < jettisonOdds({ from: voyage.from.id, to: voyage.to.id })
        ? jettisonCargo() : null;
      const jetLine = jet
        ? (caravan
            ? `<br><br>짐승이 주저앉기 시작하자 대상장이 소리쳤다. <b>짐을 버려라.</b><br>`
            : `<br><br>파도가 갑판을 쓸자 갑판장이 소리쳤다. <b>짐을 던져라.</b><br>`)
          + Object.entries(jet.lost).map(([g, n]) => `${GOOD_BY_ID[g].name} <b>${n}</b>`).join(' · ')
          // 목록 끝에 오는 것은 수량이다 — '소금 10를'이 아니라 '소금 10을'
          + `${josa(String(Object.values(jet.lost).at(-1) ?? ''), '을/를')} `
          + `${caravan ? '모래' : '바다'}에 버렸다(${jet.value.toLocaleString('ko-KR')}닢어치).`
          + (jet.payout > 0
              ? `<br>적하보험이 <b>${jet.payout.toLocaleString('ko-KR')}닢</b>을 물어 준다.`
              : '')
        : '';
      if (jet) {
        pushLog(`${caravan ? '모래폭풍에' : '폭풍에'} 짐을 버렸다 — ${jet.value.toLocaleString('ko-KR')}닢어치.`
              + ` 보험금 ${jet.payout.toLocaleString('ko-KR')}닢.`, 'bad');
      }

      pushLog(caravan
        ? `모래폭풍에 대열이 흩어졌다. 짐과 짐승이 ${dmg} 상했다${lost ? `, 인부 ${lost}명 실종` : ''}.`
        : `폭풍우에 휩쓸렸다. 선체 ${dmg} 손상${lost ? `, 선원 ${lost}명 실종` : ''}.`, 'bad');
      refreshHUD(); refreshLog();
      modal({
        title: caravan
          ? (jet ? '모래폭풍 — 짐을 버리다' : '모래폭풍')
          : (jet ? '폭풍우 — 짐을 던지다' : '폭풍우'),
        body: (caravan
                ? `지평선이 누렇게 부풀더니 모래가 대열을 삼켰다.<br>`
                  + `짐과 짐승이 <b>${dmg}</b>만큼 상했다${lost ? `, 인부 <b>${lost}명</b>이 모래에 묻혔다` : ''}.`
                : `검은 구름이 몰려오더니 파도가 갑판을 덮쳤다.<br>`
                  + `선체가 <b>${dmg}</b> 손상되었다${lost ? `, 선원 <b>${lost}명</b>이 파도에 휩쓸렸다` : ''}.`)
            + jetLine
            + officerAside('storm'),
        actions: [{ label: caravan ? '모래가 지나가길 기다린다' : '버텨낸다', onClick: finish }],
        closable: false,
      });
      break;
    }
    case 'bandit': {
      /* 뭍의 구간 — 코르세어 대신 노상강도. 값나가는 것부터 집어간다.
         ★ '산길'이라고 못박아 두었더니 파라나 강배도 슈테크니츠 운하도 마르마라 내해도
           전부 산을 넘게 됐다. 길의 모양은 구간마다 다르므로 **길목**까지만 적는다. */
      const hit = banditRaid();
      const lostRows = Object.entries(hit.lost);
      const line = lostRows.map(([g, n]) => `${GOOD_BY_ID[g].name} <b>${n}</b>`).join(' · ');
      // 조사는 **마지막에 읽히는 글자**를 따른다 — 목록 끝은 수량이다(‘도자기 3을’ / ‘소금 5를’)
      const tail = String(lostRows.at(-1)?.[1] ?? '');
      const where = caravan ? '사막' : '길';
      pushLog(hit.value
        ? `${where}에서 강도를 만나 ${hit.value.toLocaleString('ko-KR')}닢어치를 빼앗겼다.`
        : `${where}에서 강도를 만났으나 실은 것이 없었다.`, 'bad');
      refreshHUD(); refreshLog();
      modal({
        title: caravan ? '대상을 덮치다' : '노상강도',
        body: (caravan
                ? `모래 언덕 뒤에서 기마 한 무리가 대열 옆구리를 갈랐다. 낙타는 달아나지 못한다.<br>`
                : `길이 좁아지는 곳에서 사내들이 앞을 막았다. 여기는 바다가 아니라 현측의 포도 소용없다.<br>`)
            + (hit.value
                ? `${line}${josa(tail, '을/를')} 빼앗겼다 — <b>${hit.value.toLocaleString('ko-KR')}닢</b>어치.<br>`
                  + `<span style="opacity:.7">해상보험은 바다의 위험만 인수한다. 이 손해는 보상되지 않는다.</span>`
                : `실은 것이 없어 가져갈 것도 없었다. 그들도 헛걸음이다.`),
        actions: [{ label: '길을 재촉한다', onClick: finish }],
        closable: false,
      });
      break;
    }
    case 'toll': {
      const { fee } = payToll();
      pushLog(`통행세로 ${fee.toLocaleString('ko-KR')}닢을 물었다.`, 'warn');
      refreshHUD(); refreshLog();
      modal({
        title: '통행세 징수',
        body: (caravan
                ? `우물을 낀 마을이 길을 막고 있다. 물값이라 부르지만 값은 짐을 보고 매긴다.<br>`
                : `길목의 초소가 짐을 헤아린다. 서류를 갖춰도 세는 셈은 그들의 것이다.<br>`)
            + `<b>${fee.toLocaleString('ko-KR')}닢</b>을 물었다.`,
        actions: [{ label: '치르고 지나간다', onClick: finish }],
        closable: false,
      });
      break;
    }
    case 'drift': {
      const kinds = ['salt', 'wine', 'grain', 'fur', 'ceramic'];
      const id = kinds[Math.floor(Math.random() * kinds.length)];
      // 부관이 건질 것과 버릴 것을 셈해 고른다 — 같은 잔해에서 더 많이 나온다
      const bonus = 1 + officerPerk('salvageUp');
      const qty = Math.min(cargoFree(), Math.round((3 + Math.floor(Math.random() * 8)) * bonus));
      const coin = Math.round((60 + Math.floor(Math.random() * 240)) * bonus);
      if (qty > 0) state.cargo[id] = (state.cargo[id] || 0) + qty;
      state.gold += coin;
      const gname = GOOD_BY_ID[id].name;
      pushLog(caravan
        ? `길가에 버려진 짐에서 ${qty > 0 ? `${gname} ${qty}개와 ` : ''}금화 ${coin}닢을 챙겼다.`
        : `난파선 잔해에서 ${qty > 0 ? `${gname} ${qty}개와 ` : ''}금화 ${coin}닢을 건졌다.`, 'good');
      refreshHUD(); refreshLog();
      modal({
        title: caravan ? '버려진 짐' : '표류물 발견',
        body: (caravan
                ? `길가에 짐짝이 흩어져 있다. 앞서 간 대열이 짐승을 잃은 자리다.<br>`
                : `부서진 선체 조각 사이에서 건질 만한 것이 나왔다.<br>`)
            + (qty > 0 ? `<b>${gname} ${qty}개</b>와 ` : '') + `<b>금화 ${coin}닢</b>.`
            + officerAside('salvage'),
        actions: [{ label: '거둬들인다', onClick: finish }],
        closable: false,
      });
      break;
    }
    case 'merchant': {
      const met = voyage.ships?.[0];
      /* ★ 이 구간에 상선이 하나도 안 떠 있으면 예전에는 **아무 말도 없이** 지나갔다.
         조우 열두 번 중 한 번이 소리 없이 사라진 셈이라, 플레이어에게는 그냥 멈칫한
         항해였다. 만난 것이 없으면 없는 대로 한 줄은 나와야 한다 — 바다는 넓다는 말이다. */
      /* ★ 이 구간에 상선이 하나도 안 떠 있으면 **수평선 너머에서 온 배**를 세운다.
         전에는 그대로 "돛 하나가 지나갔다"로 끝나서, 실측 열세 번 중 열한 번이
         만나지 못한 조우였다(→ world.js: strayTrader 주석). 대상(카라반) 구간은 그대로 둔다 —
         모래길에서 상선을 만들 수는 없다. */
      const other = met ?? (caravan ? null : strayTrader(voyage.from.id, voyage.to.id));
      if (!other || caravan) {
        pushLog(caravan
          ? '맞은편에서 오는 대열과 스쳤다. 물자루만 나눠 마시고 각자 길을 갔다.'
          : '멀리 돛 하나가 지나갔다. 깃발만 확인하고 각자 길을 갔다.');
        refreshLog();
        finish();
        break;
      }
      meetMerchant(other, finish);
      break;
    }
    case 'pirate': {
      // 이 구간에 실제 해적이 떠 있으면 그놈이 온다. 없으면 떠돌이 해적.
      const npc = voyage.foes?.[0] || null;
      const enemy = npc ? pirateEnemy(npc) : pickEnemy();
      const pdef = defOf(npc);
      if (npc) {
        /* `world.js`는 명부 이름 뒤에 '호'를 붙인다 — '왕직호'·'식량형제단호'가 그렇게 나왔다.
           부르는 법은 화면의 몫이므로 여기서 바로잡고, 명부의 대사도 함께 실어 보낸다
           (전투 씬이 도주·격침 순간에 그 줄을 쓴다). */
        enemy.name = npcTitle(npc);
        enemy.hail = pdef?.lines?.hail ?? null;
        enemy.spare = pdef?.lines?.spare ?? null;
        enemy.blurb = pdef?.blurb ?? null;
        enemy.bounty = npc.bounty ?? null;
      }
      const name = enemy.name;

      /* 깃발을 사실대로 적는다. 예전에는 무엇이 오든 "수평선에 검은 깃발"이었는데,
         이 표에는 프랑스 순찰 프리깃과 바르바리 기함도 들어 있다 —
         **국왕의 배가 검은 깃발을 달지는 않는다.** 왜 그 배가 상선을 세우는지도 함께 적는다. */
      /* ★ 깃발이 해적기가 아니라고 다 사략선인 것은 아니다. 처음에는 둘로만 갈랐다가
         **왜구에게 사략 허가장을 쥐여 주고, 명 수군 정규 순찰선에도 같은 문장을 붙였다.**
         셋으로 가른다 — 무법자(검은 깃발) · 왕의 배(임검) · 허가장을 쥔 사략선. */
      const outlaw = enemy.flag === 'pirate' || /해적|왜구/.test(enemy.nation ?? '');
      const official = !outlaw && /수군|함대|순찰|관|기함/.test(enemy.name ?? '');
      const flagLine = outlaw
        ? (enemy.nation && enemy.nation !== '해적'
            ? `수평선에 ${enemy.nation} 배다. 어느 나라 깃발도 달지 않았다.`
            : '수평선에 검은 깃발.')
        : official
          ? `수평선에 ${enemy.nation} 깃발. 왕의 배다 — 뱃짐과 문서를 보자고 할 것이다.`
          : `수평선에 ${enemy.nation} 깃발. 사략 허가장을 쥔 배다 — 이 바다에서 그것은 해적과 같은 말이다.`;
      const blackFlag = outlaw;
      const rank = RANK_WORD[blackFlag ? 'pirate' : 'navy'][enemy.level] ?? '';

      pushLog(`${name}${josa(name, '이/가')} 항로를 막아섰다!`, 'warn');
      refreshLog();
      modal({
        title: '돛이 보인다',
        body: `${flagLine} <b>${name}</b>${josa(name, '이/가')} 바람을 타고 다가온다.<br>`
            + `<span style="opacity:.75">${enemy.blurb ?? rank}`
            + `${enemy.bounty ? ' 목에 값이 걸린 자다.' : ''}</span>`
            + quote(enemy.hail)
            /* ★ 상대의 배와 도주 가망을 **고르기 전에** 보여 준다. 전에는 전투에 들어가서야
               선체·포 수가 나왔는데, 사람은 이길 수 있는 상대만 싸우고 나머지는 피하려 한다 —
               그 판단의 재료를 숨기면 "싸울까 피할까"가 선택이 아니라 도박이 된다.
               숫자는 내 것과 나란히 두어야 뜻이 생긴다(선체 80 하나로는 세다/약하다를 모른다). */
            + `<br><br>${foeVersusLine(enemy)}`
            + `<br><br>싸워서 나포하거나, 실은 것을 넘겨주고 달아날 수 있다.`
            + officerAside('pirate'),
        actions: [
          {
            label: '전투 준비', kind: '',
            onClick: () => {
              go('battle', {
                enemy,
                onEnd: (result) => {
                  if (npc && result !== 'lose') removeNpc(npc.id);   // 바다에서 지운다
                  if (result === 'lose') return;      // 패배는 battle 씬이 처리
                  go('map');
                  sailing = resumeVoyage(voyage);
                  buildUI();
                },
                retreatTo: () => {
                  go('map');
                  sailing = resumeVoyage(voyage);
                  buildUI();
                },
              });
            },
          },
          {
            /* ★ 이 단추는 **금고에도 손을 댄다**(12%). 그런데 글에는 화물 이야기밖에 없어서,
               빈 배로 도망친 플레이어가 금화가 왜 줄었는지 알 방법이 없었다.
               고르기 전에 값을 보여 주는 것이 선택의 조건이다 — 값을 숨기면 선택이 아니다. */
            label: Object.keys(state.cargo).length
              ? `짐을 넘기고 도주 (화물 35% · 금화 ${Math.round(state.gold * 0.12).toLocaleString('ko-KR')}닢)`
              : `뱃삯을 물고 도주 (금화 ${Math.round(state.gold * 0.12).toLocaleString('ko-KR')}닢)`,
            kind: 'dark',
            onClick: () => {
              const ids = Object.keys(state.cargo);
              let dumped = 0;
              for (const id of ids) {
                const n = Math.ceil(state.cargo[id] * 0.35);
                state.cargo[id] -= n; dumped += n;
                if (state.cargo[id] <= 0) delete state.cargo[id];
              }
              const coin = Math.round(state.gold * 0.12);
              state.gold -= coin;
              pushLog(dumped
                ? `화물 ${dumped}개와 금화 ${coin}닢을 넘기고 ${name}에게서 빠져나왔다.`
                : `실은 것이 없어 금고를 열었다. 금화 ${coin}닢을 넘기고 ${name}에게서 빠져나왔다.`, 'bad');
              refreshHUD(); refreshLog();
              // 명부에 "짐만 놓고 가라"고 적어 둔 자들이 있다. 물러설 때 그 줄이 나온다.
              if (enemy.spare) pushLog(enemy.spare, 'warn');
              toast(dumped ? `화물 ${dumped}개 · ${coin}닢 손실` : `${coin}닢 손실`, 'bad');
              finish();
            },
          },
        ],
        closable: false,
      });
      break;
    }
    default:
      finish();
  }
}

/* ── 사이드 UI ──────────────────────────────────────── */
function buildUI() {
  overlay.replaceChildren(el('div#map-side', {}, sailing ? sailingCard() : routeCards()));
}

function sailingCard() {
  return el('div.panel', {}, [
    el('h3', {}, el('span', { text: '항해 중' })),
    el('div.city-card', {}, [
      el('div', { html: `<b>${sailing.from.name}</b> → <b style="color:#f4dd86">${sailing.to.name}</b>` }),
      el('div.cblurb', { text: `예상 ${sailing.days}일 · ${ship().name}` }),
    ]),
  ]);
}

function routeCards() {
  const here = CITY_BY_ID[state.at];
  const nb = neighborsOf(state.at);
  /* 이웃을 둘로 가른다 — 같은 바다 안이냐, 다른 바다로 나가는 원양 항로냐.
     한 목록에 섞으면 "며칠짜리 항해인지" 감각이 뭉개진다. 스무 날짜리 대양 항해와
     이틀짜리 연안 항해는 애초에 다른 결정이다. */
  const inSea = nb.filter((id) => !laneOf(state.at, id));
  const oceanIds = nb.filter((id) => laneOf(state.at, id));

  /* 날짜·비용 칸. ★ **출항 즉시 나갈 몫**(보급·유지·보험 — 급여는 쌓였다 나중에 나간다)을
     금고가 못 대면 붉게 짚는다. 전에는 아무 표시가 없었고, 모자란 만큼은 조용히 사라졌다
     (금화 9닢으로 44닢짜리 항로에 나갔다). → wiki/playtest-log.md §3-3 */
  const costCell = (d, cost) => {
    const now = cost.supplies + cost.fleet + cost.hull + cost.arms + cost.insurance;
    const short = now > state.gold;
    return el(`span.rd${short ? '.short' : ''}`, {
      text: `${d}일 · ${cost.total}닢`,
      style: short ? { color: '#d98a6a' } : null,
      title: short
        ? `금고 ${state.gold.toLocaleString('ko-KR')}닢으로는 출항하며 나갈 ${now.toLocaleString('ko-KR')}닢을 못 댄다`
        : null,
    });
  };
  /* ★ **가기 전에 그곳이 무엇을 내고 무엇을 원하는지 알려 준다.**
     전에는 도착해서야 값을 알 수 있어 **초행이 늘 손해**였다 — 여덟 항차를 도는 동안
     금고가 6,661 → 5,448로 줄었고, 실을 것을 짐작으로 고르니 그럴 수밖에 없었다
     (완주 플레이 ISSUES #16). 시세까지 주면 정보상(`price-tip`)이 파는 것을 공짜로 주는 셈이라
     **품목만** 준다 — *"저기는 향신료가 난다"*까지가 뱃사람 사이에 도는 이야기의 한계다.
     값이 얼마인지는 여전히 가 봐야 알고, 그것을 미리 아는 길이 인물에게 사는 소식이다. */
  const goodsHint = (c) => {
    const pick = (o, n) => Object.entries(o ?? {})
      .sort((a, b) => (a[1] - b[1]) * (o === c.supply ? 1 : -1))
      .slice(0, n).map(([g]) => GOOD_BY_ID[g]?.name).filter(Boolean);
    const sup = pick(c.supply, 2);
    const dem = pick(c.demand, 2);
    return (sup.length ? `
난다 — ${sup.join(' · ')}` : '')
         + (dem.length ? `
원한다 — ${dem.join(' · ')}` : '');
  };

  const rows = inSea.map((id) => {
    const c = CITY_BY_ID[id];
    const d = voyageDays(state.at, id);
    const w = routeWindLabel(state.at, id);
    const cost = voyageCost(d, state.crew, { from: state.at, to: id });
    const threat = pirateThreat(state.at, id);
    const dg = routeDangerLabel({ from: state.at, to: id, threat });
    return el('div.route-row', {
      title: `일당 ${cost.wages} · 보급 ${cost.supplies}`
           + (cost.hull ? ` · 선체 ${cost.hull}` : '')
           + (cost.arms ? ` · 무장 ${cost.arms}` : '')
           + (cost.fleet ? ` · 선단 ${cost.fleet}` : '')
           + (cost.insurance ? ` · 적하보험 ${cost.insurance}` : '')
           + (cost.officer ? ` · ${OFFICER.name} ${cost.officer}` : '') + `닢`
           + `\n해적 조우 ${Math.round(dg.odds * 100)}%`
           + (dg.risk != null ? ` (보험료율 ${dg.risk}%` : ' (내해')
           + (threat ? ` · 이 구간에 해적 ${threat}척` : '') + ')'
           + goodsHint(c)
           + (state.known.has(id) ? '' : '\n★ 아직 못 가 본 항구다 — 시세는 닿아야 안다'),
      onclick: () => startVoyage(id),
    }, [
      /* 처음 가는 곳은 이름 옆에 표를 단다 — 값을 모르고 들어간다는 것이 곧 위험이다 */
      el('span.rn', {}, [
        el('span', { text: c.name }),
        state.known.has(id) ? null : el('span', {
          text: ' 초행', style: { color: '#8fb4d8', fontSize: '10.5px' },
        }),
      ].filter(Boolean)),
      el(`span.rw.${w.kind || 'calm'}`, { text: w.text }),
      el(`span.rw.${dg.kind || 'calm'}`, { text: threat ? `${dg.text}·${threat}` : dg.text }),
      costCell(d, cost),
    ]);
  });

  /* 다른 바다로 — 원양 항로.
     선으로 긋지 않는 이유는 그을 좌표가 없기 때문이다(권역마다 좌표계가 따로다).
     대신 어디로 이어지고 며칠이 걸리는지를 글로 준다. */
  const oceanRows = oceanIds.map((id) => {
    const c = CITY_BY_ID[id];
    const lane = laneOf(state.at, id);
    const rg = REGION_BY_ID[REGION_OF_CITY[id]];
    const d = voyageDays(state.at, id);
    const cost = voyageCost(d, state.crew, { from: state.at, to: id });
    const threat = pirateThreat(state.at, id);
    const dg = routeDangerLabel({ from: state.at, to: id, threat });
    /* ★ 대양은 **사람과 배가 성해야** 건넌다(`state.js: oceanReady`).
       근해는 막지 않는다 — 막으면 항구에 갇혀 빠져나갈 길이 없어진다. 선원 1명·선체 44/231로도
       원양이 열려 있어서 "백병전에 사람을 갈아 넣는 것이 늘 옳았다"(완주 플레이 ISSUES #24). */
    const ready = oceanReady();
    return el('div.route-row', {
      title: [
        lane.note,
        `기준 ${lane.days}일 (이 배로 ${d}일) · 항해비 ${cost.total}닢`,
        `해적 조우 ${Math.round(dg.odds * 100)}%`,
        lane.monsoon ? '★ 계절풍 구간 — 철을 잘못 잡으면 훨씬 오래 걸린다' : null,
        lane.overland ? '★ 육로 환적 — 배가 아니라 짐이 넘어간다' : null,
        ready.ok ? null : `⚑ ${ready.why}`,
      ].filter(Boolean).join('\n'),
      style: ready.ok ? null : { opacity: 0.55 },
      onclick: () => {
        if (!ready.ok) return toast(ready.why, 'bad');
        startVoyage(id);
      },
    }, [
      el('span.rn', { text: c.name }),
      el('span.rw', { text: rg?.name ?? '', style: { color: '#8fb4d8' } }),
      el(`span.rw.${dg.kind || 'calm'}`, {
        text: lane.monsoon ? '계절풍' : lane.overland ? '육로' : dg.text,
      }),
      costCell(d, cost),
    ]);
  });

  /* 지금 값이 흔들리는 곳 — 소식을 들어야 달려갈 수 있다.
     사건형 대박을 넣어 놓고 화면에 안 띄우면 플레이어에겐 없는 것과 같다.

     ★ **닿을 수 있는 곳을 앞에 세운다.** 사건은 `CITIES` 265곳에 고루 걸리므로 값이 큰 순으로
       고르면 **거의 언제나 남의 바다**가 뽑힌다 — 실측에서 열한 장이 연속으로 전부 `멀다`였고
       그중 내 권역은 한 장도 없었다(완주 플레이 ISSUES #3). 항로 카드와 같은 목록의 절반을
       차지하면서 정보값이 0이면, 그건 화면을 어지럽히는 것이지 소식이 아니다.
       그래서 **직항 → 같은 바다 → 그 밖** 순으로 세우고, 먼 것은 두 장까지만 남긴다.
       (먼 소식을 아주 지우지는 않는다 — "저 바다에서 무슨 일이 나고 있다"는 세계가 산다는 감각이다.) */
  const nbSet = new Set(nb);
  const hereRegion = curRegion();
  const reach = (sh) => (nbSet.has(sh.city) ? 0 : REGION_OF_CITY[sh.city] === hereRegion ? 1 : 2);
  const sorted = activeShocks().sort((a, b) => reach(a) - reach(b) || b.mult - a.mult);
  const near = sorted.filter((sh) => reach(sh) < 2);
  const far = sorted.filter((sh) => reach(sh) === 2);
  const shocks = [...near.slice(0, 5), ...far.slice(0, Math.max(1, 6 - Math.min(near.length, 5)) - 1 + 1)]
    .slice(0, 6);
  const shockRows = shocks.map((sh) => el('div.route-row', {
    title: `${sh.cityName}의 ${sh.goodName} 시세가 평시의 ×${sh.mult.toFixed(2)}
남은 기간 약 ${sh.daysLeft}일`,
    onclick: () => { const near = nb.includes(sh.city); if (near) startVoyage(sh.city); },
  }, [
    el('span.rn', { text: sh.cityName }),
    el(`span.rw.${sh.mult >= 1 ? 'bad' : 'good'}`, { text: sh.goodName }),
    el(`span.rw.${sh.mult >= 1 ? 'bad' : 'good'}`, { text: `×${sh.mult.toFixed(2)}` }),
    el('span.rd', { text: `${sh.daysLeft}일 남음${nb.includes(sh.city) ? '' : ' · 멀다'}` }),
  ]));

  const cards = [
    el('div.panel', {}, [
      el('h3', {}, [
        el('span', { text: '현재 위치' }),
        el('span', {
          text: REGION_BY_ID[curRegion()]?.name ?? '',
          style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
        }),
      ]),
      el('div.city-card', {}, [
        el('div', {}, [
          el('span.cname', { text: here.name }),
          el('span.creg', { text: here.area }),
        ]),
        el('div.cblurb', { text: here.blurb }),
        el('button.btn.sm.dark', { text: '항구로 들어가기', onclick: () => go('port') }),
      ]),
    ]),
    el('div.panel', {}, [
      el('h3', {}, [
        el('span', { text: '항로' }),
        el('span', {
          text: `${windName()} · ${ship().rig >= 0.7 ? '가로돛' : ship().rig <= 0.2 ? '라틴세일' : '혼합범장'}`,
          style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
        }),
      ]),
      el('div.route-list', {}, rows),
    ]),
  ];

  if (oceanRows.length) {
    cards.push(el('div.panel', {}, [
      el('h3', {}, [
        el('span', { text: '다른 바다로' }),
        el('span', {
          text: '원양 항로',
          style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
        }),
      ]),
      el('div.route-list', {}, oceanRows),
    ]));
  }

  if (shockRows.length) {
    cards.push(el('div.panel', {}, [
      el('h3', {}, [
        el('span', { text: '뱃사람들의 소문' }),
        el('span', {
          text: '값이 흔들리는 곳',
          style: { fontSize: '11px', color: '#8f8878', letterSpacing: 0 },
        }),
      ]),
      el('div.route-list', {}, shockRows),
    ]));
  }

  if (hover && hover !== state.at) {
    const c = CITY_BY_ID[hover];
    cards.push(el('div.panel', {}, [
      el('h3', {}, el('span', { text: '항구 정보' })),
      el('div.city-card', {}, [
        el('div', {}, [el('span.cname', { text: c.name }), el('span.creg', { text: c.area })]),
        el('div.cblurb', { text: c.blurb }),
        el('div', {
          style: { fontSize: '11.5px', lineHeight: 1.7 },
          html: `<span style="color:#79a44f">산지</span> ${Object.keys(c.supply).map((k) => GOOD_BY_ID[k].name).join(', ')}<br>`
              + `<span style="color:#e0a63a">수요</span> ${Object.keys(c.demand).map((k) => GOOD_BY_ID[k].name).join(', ')}`,
        }),
      ]),
    ]));
  }
  return cards;
}
