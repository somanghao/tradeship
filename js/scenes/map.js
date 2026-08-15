// scenes/map.js — 지중해 지도: 항로 선택, 항해 연출, 해상 이벤트

import { mapSprite } from '../sprites/scene.js';
import { shipTopSprite } from '../sprites/ship.js';
import { blit } from '../pixel.js';
import { CITIES, CITY_BY_ID, ROUTES, GOOD_BY_ID, SHIPS, OFFICER } from '../data.js';
import {
  state, ship, neighborsOf, voyageDays, distanceBetween, advanceDays,
  rollSeaEvent, pickEnemy, pushLog, cargoFree, routeWindLabel, voyageCost, windName,
  hasOfficer, officerPerk, routeDangerLabel,
  jettisonOdds, jettisonCargo, banditRaid, payToll, activeShocks,
} from '../state.js';
import {
  worldTick, npcsOnLeg, npcPos, removeNpc, pirateThreat, newsLines, pirateEnemy,
} from '../world.js';
import { el, overlay, toast, modal, refreshHUD, refreshLog } from '../ui.js';
import { go, toLogical, canvas } from '../main.js';

let bg, hover = null, sailing = null, pendingArrival = null;

/* 항해 연출 길이(초) = BASE + 일수 × PER_DAY.
   처음엔 3일 항로가 1초 만에 끝나 "언제 움직였는지 모르겠다"는 소리를 들었다. */
const VOYAGE_BASE = 1.5, VOYAGE_PER_DAY = 0.42;

/* 항해 중인 배의 상태 */
function startVoyage(toId) {
  const from = CITY_BY_ID[state.at], to = CITY_BY_ID[toId];
  const days = voyageDays(state.at, toId);
  sailing = {
    from, to, days,
    // 이 구간에 실제로 떠 있는 배들 — 조우하면 지도에서 보던 그 배가 나온다
    foes: npcsOnLeg(state.at, toId, 'pirate'),
    ships: npcsOnLeg(state.at, toId, 'trader'),
    // 출항 시점에 굳힌다 — 항해 중에는 세계가 멈춰 있으므로(worldTick은 입항 때 돈다)
    threat: pirateThreat(state.at, toId),
    t: 0,
    speed: 1 / (VOYAGE_BASE + days * VOYAGE_PER_DAY),   // 거리에 비례한 연출 시간
    eventAt: 0.35 + Math.random() * 0.35,
    eventDone: false,
  };
  buildUI();
}

export const mapScene = {
  enter() {
    bg = mapSprite();
    hover = null;
    sailing = null;
    pendingArrival = null;
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    canvas.style.cursor = 'default';
    buildUI();
  },
  exit() {
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('click', onClick);
    canvas.style.cursor = 'default';
  },

  update(dt) {
    if (!sailing) return;
    sailing.t = Math.min(1, sailing.t + dt * sailing.speed);

    if (!sailing.eventDone && sailing.t >= sailing.eventAt) {
      sailing.eventDone = true;
      // 항로마다 위험이 다르다 — 보험료율(ROUTE_RISK) + 그 구간에 실제로 뜬 해적 수
      const ev = rollSeaEvent({
        from: sailing.from.id, to: sailing.to.id, threat: sailing.threat,
      });
      if (ev.id !== 'calm') {
        const held = sailing;
        sailing = null;                    // 연출 정지
        resolveEvent(ev, held);
        return;
      }
    }
    if (sailing.t >= 1) {
      const to = sailing.to;
      sailing = null;
      arrive(to.id);
    }
  },

  draw(ctx, t) {
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
  for (const [a, b] of ROUTES) {
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
  for (const c of CITIES) {
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
function onMove(ev) {
  if (sailing) { hover = null; return; }
  const p = toLogical(ev);
  let found = null;
  for (const c of CITIES) {
    if (Math.hypot(c.x - p.x, c.y - p.y) <= 6) { found = c.id; break; }
  }
  const near = found && neighborsOf(state.at).includes(found);
  canvas.style.cursor = near ? 'pointer' : 'default';
  if (found === hover) return;          // 바뀔 때만 사이드 패널을 다시 그린다
  hover = found;
  buildUI();
}

function onClick(ev) {
  if (sailing) return;
  const p = toLogical(ev);
  for (const c of CITIES) {
    if (Math.hypot(c.x - p.x, c.y - p.y) <= 6) {
      if (c.id === state.at) return;
      if (!neighborsOf(state.at).includes(c.id)) {
        toast('직항로가 없다. 이웃 항구를 거쳐 가야 한다.', 'bad');
        return;
      }
      startVoyage(c.id);
      return;
    }
  }
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
    pushLog(`나포한 ${SHIPS[state.towing].name}을(를) ${CITY_BY_ID[cityId].name} 부두에 매어 두었다.`, 'good');
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

/** 상선 NPC를 전투용 적으로 — 무장이 빈약한 대신 화물이 실려 있다 */
function merchantEnemy(n) {
  const s = SHIPS[n.shipKey];
  const goods = Object.keys(n.cargo);
  return {
    id: `npc:${n.id}`, name: `상선 ${n.name}호`, nation: '상인',
    hull: s.hull, tint: s.tint, flag: 'genoa',
    hp: Math.round(s.hp * 0.85), guns: Math.max(2, Math.round(s.guns * 0.5)),
    crew: Math.max(12, Math.round(s.crewMax * 0.45)),
    level: 1, prize: n.shipKey,
    troops: ['sailor', 'sailor', 'crossbow', 'sailor'],
    loot: {
      gold: [Math.round(n.gold * 0.5), Math.max(120, n.gold)],
      goods: goods.length ? goods : ['grain', 'salt'],
    },
  };
}

function meetMerchant(n, finish) {
  const cargoList = Object.entries(n.cargo);
  const to = n.to ? CITY_BY_ID[n.to].name : '어딘가';
  const rows = cargoList.map(([gid, q]) =>
    `${GOOD_BY_ID[gid].name} ${q}개`).join(', ') || '빈 배';

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
        pushLog(`${n.name}호에게서 ${GOOD_BY_ID[deal.gid].name} ${deal.qty}개를 샀다.`, 'good');
        toast('해상 거래 성사', 'good');
        refreshHUD(); refreshLog();
        finish();
      },
    });
  }
  actions.push({
    label: '덮친다', kind: 'danger',
    onClick: () => {
      pushLog(`${n.name}호를 덮치기로 했다.`, 'warn');
      refreshLog();
      go('battle', {
        enemy: merchantEnemy(n),
        onEnd: (result) => {
          if (result !== 'lose') removeNpc(n.id);
          if (result === 'lose') return;
          finish();
          go('map');
        },
        retreatTo: () => { finish(); go('map'); },
      });
    },
  });
  actions.push({ label: '지나 보낸다', kind: 'dark', onClick: finish });

  modal({
    title: '돛이 보인다 — 상선',
    body: `${CITY_BY_ID[n.at].name}에서 ${to}로 가는 <b>${n.name}호</b>(${SHIPS[n.shipKey].name}).<br>`
        + `싣고 있는 것: <b>${rows}</b><br><br>`
        + (deal && deal.qty > 0
            ? `선장이 <b>${GOOD_BY_ID[deal.gid].name}</b>을(를) 개당 ${deal.unit}닢에 넘기겠다고 한다. 항구 시세보다는 싸다.`
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

function resolveEvent(ev, voyage) {
  const finish = () => {
    // 이벤트 처리 후 남은 항로를 마저 간다
    sailing = { ...voyage, eventDone: true };
    buildUI();
  };

  switch (ev.id) {
    case 'wind': {
      voyage.t = Math.min(0.95, voyage.t + 0.25);
      pushLog('순풍을 만나 항해가 빨라졌다.', 'good');
      toast('순풍! 항로를 앞당겼다', 'good');
      refreshLog();
      finish();
      break;
    }
    case 'storm': {
      const dmg = 6 + Math.floor(Math.random() * 14);
      const lost = Math.random() < 0.35 ? 1 + Math.floor(Math.random() * 2) : 0;
      state.hp = Math.max(1, state.hp - dmg);
      state.crew = Math.max(1, state.crew - lost);

      /* ★ 폭풍이 심하면 배를 살리려 짐을 던진다(공동해손) — 보험이 무는 사건이 이것이다.
         전에는 보험료만 걷고 보상하는 자리가 없어, 그 항목이 사실상 세금이었다.
         확률은 항로 위험도에서 나온다(그 숫자의 본래 뜻이 사고 확률의 시장가격이다). */
      const jet = Math.random() < jettisonOdds({ from: voyage.from.id, to: voyage.to.id })
        ? jettisonCargo() : null;
      const jetLine = jet
        ? `<br><br>파도가 갑판을 쓸자 갑판장이 소리쳤다. <b>짐을 던져라.</b><br>`
          + Object.entries(jet.lost).map(([g, n]) => `${GOOD_BY_ID[g].name} <b>${n}</b>`).join(' · ')
          + `를 바다에 버렸다(${jet.value.toLocaleString('ko-KR')}닢어치).`
          + (jet.payout > 0
              ? `<br>적하보험이 <b>${jet.payout.toLocaleString('ko-KR')}닢</b>을 물어 준다.`
              : '')
        : '';
      if (jet) {
        pushLog(`폭풍에 짐을 던졌다 — ${jet.value.toLocaleString('ko-KR')}닢어치. 보험금 ${jet.payout.toLocaleString('ko-KR')}닢.`, 'bad');
      }

      pushLog(`폭풍우에 휩쓸렸다. 선체 ${dmg} 손상${lost ? `, 선원 ${lost}명 실종` : ''}.`, 'bad');
      refreshHUD(); refreshLog();
      modal({
        title: jet ? '폭풍우 — 짐을 던지다' : '폭풍우',
        body: `검은 구름이 몰려오더니 파도가 갑판을 덮쳤다.<br>`
            + `선체가 <b>${dmg}</b> 손상되었다${lost ? `, 선원 <b>${lost}명</b>이 파도에 휩쓸렸다` : ''}.`
            + jetLine
            + officerAside('storm'),
        actions: [{ label: '버텨낸다', onClick: finish }],
        closable: false,
      });
      break;
    }
    case 'bandit': {
      // 뭍의 구간 — 코르세어 대신 노상강도. 값나가는 것부터 집어간다.
      const hit = banditRaid();
      const line = Object.entries(hit.lost).map(([g, n]) => `${GOOD_BY_ID[g].name} <b>${n}</b>`).join(' · ');
      pushLog(hit.value
        ? `산길에서 강도를 만나 ${hit.value.toLocaleString('ko-KR')}닢어치를 빼앗겼다.`
        : '산길에서 강도를 만났으나 실은 것이 없었다.', 'bad');
      refreshHUD(); refreshLog();
      modal({
        title: '노상강도',
        body: `좁은 산길에 사내들이 막아섰다. 여기는 바다가 아니라 대포도 소용없다.<br>`
            + (hit.value
                ? `${line}을(를) 빼앗겼다 — <b>${hit.value.toLocaleString('ko-KR')}닢</b>어치.<br>`
                  + `<span style="opacity:.7">해상보험은 바다의 위험만 인수한다. 이 손해는 보상되지 않는다.</span>`
                : `빈 수레라 가져갈 것이 없었다.`),
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
        body: `길목의 초소가 짐을 헤아린다. 서류를 갖춰도 세는 셈은 그들의 것이다.<br>`
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
      pushLog(`난파선 잔해에서 ${qty > 0 ? `${gname} ${qty}개와 ` : ''}금화 ${coin}닢을 건졌다.`, 'good');
      refreshHUD(); refreshLog();
      modal({
        title: '표류물 발견',
        body: `부서진 선체 조각 사이에서 건질 만한 것이 나왔다.<br>`
            + (qty > 0 ? `<b>${gname} ${qty}개</b>와 ` : '') + `<b>금화 ${coin}닢</b>.`
            + officerAside('salvage'),
        actions: [{ label: '거둬들인다', onClick: finish }],
        closable: false,
      });
      break;
    }
    case 'merchant': {
      const met = voyage.ships?.[0];
      if (!met) { finish(); break; }
      meetMerchant(met, finish);
      break;
    }
    case 'pirate': {
      // 이 구간에 실제 해적이 떠 있으면 그놈이 온다. 없으면 떠돌이 해적.
      const npc = voyage.foes?.[0] || null;
      const enemy = npc ? pirateEnemy(npc) : pickEnemy();
      pushLog(`${enemy.name}이(가) 항로를 막아섰다!`, 'warn');
      refreshLog();
      modal({
        title: '돛이 보인다',
        body: `수평선에 검은 깃발. <b>${enemy.name}</b>이(가) 바람을 타고 다가온다.<br>`
            + `싸워서 나포하거나, 화물 일부를 던져주고 달아날 수 있다.`
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
                  sailing = { ...voyage, eventDone: true };
                  buildUI();
                },
                retreatTo: () => {
                  go('map');
                  sailing = { ...voyage, eventDone: true };
                  buildUI();
                },
              });
            },
          },
          {
            label: '화물을 던지고 도주', kind: 'dark',
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
              pushLog(`화물 ${dumped}개와 금화 ${coin}닢을 넘기고 간신히 빠져나왔다.`, 'bad');
              refreshHUD(); refreshLog();
              toast(`화물 ${dumped}개 · ${coin}닢 손실`, 'bad');
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
  const rows = nb.map((id) => {
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
           + (threat ? ` · 이 구간에 해적 ${threat}척` : '') + ')',
      onclick: () => startVoyage(id),
    }, [
      el('span.rn', { text: c.name }),
      el(`span.rw.${w.kind || 'calm'}`, { text: w.text }),
      el(`span.rw.${dg.kind || 'calm'}`, { text: threat ? `${dg.text}·${threat}` : dg.text }),
      el('span.rd', { text: `${d}일 · ${cost.total}닢` }),
    ]);
  });

  /* 지금 값이 흔들리는 곳 — 소식을 들어야 달려갈 수 있다.
     사건형 대박을 넣어 놓고 화면에 안 띄우면 플레이어에겐 없는 것과 같다. */
  const shocks = activeShocks().sort((a, b) => b.mult - a.mult);
  const shockRows = shocks.slice(0, 6).map((sh) => el('div.route-row', {
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
      el('h3', {}, el('span', { text: '현재 위치' })),
      el('div.city-card', {}, [
        el('div', {}, [
          el('span.cname', { text: here.name }),
          el('span.creg', { text: here.region }),
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
        el('div', {}, [el('span.cname', { text: c.name }), el('span.creg', { text: c.region })]),
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
