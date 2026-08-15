// pirates.mjs — 해적 계측 (출력이 없는 순수 로직)
//
// dash.js와 같은 원칙: **여기서 규칙을 다시 구현하지 않는다.**
// 조우 확률은 `rollSeaEvent`를, 등급 추첨은 `pickEnemy`를, 전리품은 `pirateEnemy`를
// 게임 코드에서 그대로 불러 돌린다. 그래야 "대시보드에서는 맞는데 게임에서는 다른"
// 상태가 안 생긴다. 계측만 한다.

import { SEA_EVENTS, ENEMIES, SHIPS, CITIES, CITY_BY_ID, ROUTES } from '../js/data.js';
import { state, resetGame, rollSeaEvent, pickEnemy, routeRisk, encounterOdds } from '../js/state.js';
import { initWorld, worldTick, npcPos, pirateThreat, pirateEnemy } from '../js/world.js';
import { NPC, PIRATE_SHIPS } from '../js/npc/config.js';

/* ── 1. 해상 이벤트 확률 ─────────────────────────────────────
   weight 합이 100이라 weight가 곧 퍼센트지만, 그 전제 자체를 실측으로 확인한다.
   누가 SEA_EVENTS에 항목을 추가하면 합이 100을 넘어 조용히 어긋나기 때문이다. */
export function measureEvents(rolls = 200000) {
  const tally = {};
  for (let i = 0; i < rolls; i++) {
    const ev = rollSeaEvent();
    tally[ev.id] = (tally[ev.id] || 0) + 1;
  }
  const total = SEA_EVENTS.reduce((a, e) => a + e.weight, 0);
  const rows = SEA_EVENTS.map((e) => ({
    id: e.id,
    name: e.name,
    weight: e.weight,
    theory: e.weight / total,
    actual: (tally[e.id] || 0) / rolls,
  }));
  const p = (tally.pirate || 0) / rolls;
  // 항차당 굴림은 한 번뿐이다(map.js: eventDone). 그래서 누적은 단순 기하분포다.
  const cumulative = [1, 2, 3, 5, 7, 10, 15, 20, 30].map((n) => ({
    n, p: 1 - (1 - p) ** n,
  }));
  return { rows, total, pirateP: p, cumulative, weightSumIs100: total === 100 };
}

/* ── 2. 등급별 출현 확률 ─────────────────────────────────────
   `pickEnemy()`는 **내 자산**으로 뽑는다(항로도 지역도 안 본다).
   자산 격자를 훑으며 실제로 굴려 분포를 만든다. */
const WEALTH_GRID = [500, 1000, 2000, 3000, 5000, 6500, 10000, 14000, 20000, 30000, 45000, 70000];

export function measureTiers(rollsPer = 20000) {
  resetGame();
  const rows = [];
  for (const wealth of WEALTH_GRID) {
    for (const leaky of [true, false]) {
      // pickEnemy는 state.gold + 화물가치, 그리고 지금 타는 배의 leak 여부를 본다
      state.shipKey = leaky ? 'hulk' : 'caravel';
      state.gold = wealth;
      state.cargo = {};
      const dist = {};
      for (let i = 0; i < rollsPer; i++) {
        const e = pickEnemy();
        dist[e.id] = (dist[e.id] || 0) + 1;
      }
      rows.push({
        wealth,
        leaky,
        dist: Object.fromEntries(ENEMIES.map((e) => [e.id, (dist[e.id] || 0) / rollsPer])),
      });
    }
  }
  return { rows, grid: WEALTH_GRID };
}

/** 등급 5종의 제원·현상금 — ENEMIES가 정본, 여기서는 파생값만 만든다 */
export function tierTable() {
  return ENEMIES.map((e, i) => {
    const lo = e.loot?.gold?.[0] ?? 0;
    const hi = e.loot?.gold?.[1] ?? 0;
    return {
      rank: i + 1,
      id: e.id,
      name: e.name,
      nation: e.nation,
      hull: e.hull,
      hp: e.hp,
      guns: e.guns,
      crew: e.crew,
      level: e.level,
      prize: e.prize ? (SHIPS[e.prize]?.name ?? e.prize) : null,
      troops: e.troops?.length ?? 0,
      lootLo: lo,
      lootHi: hi,
      lootMid: (lo + hi) / 2,
      goods: e.loot?.goods ?? [],
      // 무장도 — 포·선체·선원을 한 축으로 묶은 상대 지표(등급 간 비교용)
      power: e.hp + e.guns * 12 + e.crew * 3,
    };
  });
}

/* ── 3. 세계를 굴리며 해적을 관측한다 ────────────────────────
   worldTick이 정본이다. 여기서는 매일 스냅샷만 뜬다. */
export function measureWorld({ days = 240, frameEvery = 2 } = {}) {
  resetGame();
  initWorld();

  const legKey = (a, b) => [a, b].sort().join('|');
  const occ = new Map();          // 항로별 해적 점유 일수
  for (const [a, b] of ROUTES) occ.set(legKey(a, b), 0);

  const frames = [];
  let sailingSum = 0;
  const raids = [];

  for (let d = 1; d <= days; d++) {
    const news = worldTick(1);
    for (const e of news) if (e.kind === 'raid') raids.push({ day: d, ...e });

    for (const [a, b] of ROUTES) {
      if (pirateThreat(a, b) > 0) occ.set(legKey(a, b), occ.get(legKey(a, b)) + 1);
    }
    sailingSum += state.npcs.filter((n) => n.kind === 'pirate' && n.to).length;

    if (d % frameEvery === 0) {
      frames.push({
        day: d,
        npcs: state.npcs.map((n) => {
          const p = npcPos(n);
          return {
            id: n.id, kind: n.kind, name: n.name,
            x: +p.x.toFixed(1), y: +p.y.toFixed(1),
            gold: Math.round(n.gold), kills: n.kills || 0,
            shipKey: n.shipKey, sailing: !!n.to,
          };
        }),
      });
    }
  }

  // 항로별 점유율 — "그 구간에 해적이 떠 있던 날의 비율"
  // risk는 당대 보험료율(geo.js: ROUTE_RISK), odds는 그것을 환산한 실제 조우 확률.
  // 점유율(NPC가 실제로 떠 있던 비율)과 **다른 축**이다 — 둘을 나란히 보라고 함께 싣는다.
  const routes = ROUTES.map(([a, b]) => ({
    a, b,
    aName: CITY_BY_ID[a].name, bName: CITY_BY_ID[b].name,
    ax: CITY_BY_ID[a].x, ay: CITY_BY_ID[a].y,
    bx: CITY_BY_ID[b].x, by: CITY_BY_ID[b].y,
    occupancy: occ.get(legKey(a, b)) / days,
    risk: routeRisk(a, b),
    odds: encounterOdds({ from: a, to: b }),
    oddsNow: encounterOdds({ from: a, to: b, threat: pirateThreat(a, b) }),
  })).sort((p, q) => q.odds - p.odds);

  const meanOcc = routes.reduce((s, r) => s + r.occupancy, 0) / routes.length;

  // 지금 살아 있는 해적 명부 — 보유 금화가 곧 현상금이 된다(pirateEnemy가 정본)
  const roster = state.npcs
    .filter((n) => n.kind === 'pirate')
    .map((n) => {
      const e = pirateEnemy(n);
      return {
        id: n.id, name: n.name, shipKey: n.shipKey,
        shipName: SHIPS[n.shipKey].name,
        gold: Math.round(n.gold), kills: n.kills || 0,
        at: CITY_BY_ID[n.at]?.name ?? n.at,
        to: n.to ? CITY_BY_ID[n.to]?.name : null,
        hp: e.hp, guns: e.guns, crew: e.crew,
        bountyLo: e.loot.gold[0], bountyHi: e.loot.gold[1],
        prize: SHIPS[e.prize]?.name ?? e.prize,
      };
    })
    .sort((p, q) => q.gold - p.gold);

  return {
    days, frames, routes, meanOcc, roster, raids,
    pirateCount: NPC.pirates,
    traderCount: NPC.traders,
    meanSailing: sailingSum / days,
    raidBase: NPC.raidBase,
    pirateShips: PIRATE_SHIPS.map((k) => SHIPS[k].name),
    cities: CITIES.map((c) => ({ id: c.id, name: c.name, x: c.x, y: c.y, flag: c.flag })),
  };
}

/* ── 4. 지도의 붉은 점과 실제 조우가 얼마나 이어져 있나 ──────
   map.js는 `voyage.foes[0] || pickEnemy()`로 적을 정한다.
   즉 그 구간에 해적이 안 떠 있으면 **허공에서 생긴 떠돌이**가 나온다.
   이 비율이 이 게임에서 "지도를 읽는 의미"의 크기다. */
export function measureLinkage(world) {
  const real = world.meanOcc;          // 임의 구간이 점유돼 있을 확률
  return {
    real,
    phantom: 1 - real,
    // pirateThreat()는 정의만 되고 호출부가 없다 — 조우 확률에 밀도가 안 걸린다
    threatWired: false,
  };
}

export function measureAll(opts = {}) {
  const events = measureEvents(opts.rolls ?? 200000);
  const tiers = measureTiers(opts.tierRolls ?? 20000);
  const world = measureWorld({ days: opts.days ?? 240 });
  return { events, tiers, table: tierTable(), world, linkage: measureLinkage(world) };
}
