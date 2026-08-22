// event-inventory.mjs — **이 세계에서 실제로 발동될 수 있는 사건**을 코드에서 전수로 뽑는다
//
//   node tools/event-inventory.mjs            # 사람이 읽는 요약
//   node tools/event-inventory.mjs --json     # .playtest/nine-seas/inventory.json 로 기록
//
// 왜 필요한가 — 소설 소재집(`story/regions/*-50.md` §6)이 권역마다 이벤트 여덟을 적어 두었는데,
// 그 여덟이 게임에서 **발동될 자리를 가졌는지**는 문서만 봐서는 알 수 없다. 그래서 코드 쪽
// 사건의 종류와 그 사건이 걸릴 수 있는 **권역별 자리 수**를 먼저 세고, 실클릭 검증
// (`tools/playtest-live/nine-seas.mjs`)이 그 자리에 실제로 사람이 닿는지를 본다.
//
// ★ 여기서 세는 것은 **가능성**이지 관측이 아니다. "자리가 0"이면 그 권역에서 그 사건은
//   영원히 안 난다는 뜻이고, 그것만으로 이미 결함이다(실클릭 이전에 잡힌다).

import { SEA_EVENTS, SHOCK, INLAND_ODDS, START_PORTS, GOOD_BY_ID } from '../js/data.js';
import {
  REGIONS, ALL_CITY_GEO, ALL_ROUTES, ALL_ROUTE_RISK, ALL_CITY_TRADE, ALL_CITY_TARIFF,
  ALL_TRADERS, ALL_PIRATES, ALL_FIGURES, OCEAN_LANES, REGION_OF_CITY, citiesOfRegion,
} from '../js/regions/index.js';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, '.playtest', 'nine-seas');

/* ── 1. 사건의 종류 — 코드 정본에서 그대로 ────────────────────── */

const SEA = SEA_EVENTS.map((e) => ({
  id: e.id, name: e.name, weight: e.weight,
  how: e.weight > 0 ? '해상 구간 가중치 추첨' : '육로·내해 구간에서만 명시 선택',
  where: e.weight > 0 ? 'sea' : 'inland',
}));

const MARKET = [
  ...SHOCK.events.map((e) => ({
    id: e.id, name: e.name, kind: e.kind, tone: e.tone, mult: e.mult, days: e.days,
    perDay: e.perDay, goods: e.goods, how: '매일 rollShockEvents — 도시×품목에 건다',
  })),
  { id: 'raid', name: '상인 나포 여파', kind: 'supply', tone: 'bad', mult: SHOCK.raidMult,
    days: SHOCK.raidDays, perDay: null, goods: null,
    how: 'world.js raids() — 해적이 상인 NPC를 털면 그가 대던 항구에 건다' },
];

/* ── 2. 권역마다 그 사건이 걸릴 **자리**가 몇인가 ──────────────── */

const seasonOfDef = (d) => d?.season ?? 'any';

function regionSlots(rid) {
  const cities = citiesOfRegion(rid);
  const ids = new Set(cities.map((c) => c.id));

  /* 권역 안 항로 — `ALL_ROUTES`의 한 줄은 객체가 아니라 **`[a,b]` 배열**이다.
     `r.a`로 읽으면 전부 undefined라 "해상 구간 0"이라는 거짓 결함이 나온다(실제로 났다). */
  const inRegion = ALL_ROUTES.filter(([a, b]) => ids.has(a) && ids.has(b));
  const riskOf = (a, b) => ALL_ROUTE_RISK[[a, b].sort().join('|')];
  const inland = inRegion.filter(([a, b]) => riskOf(a, b) === null);
  const seaLegs = inRegion.filter(([a, b]) => riskOf(a, b) != null);

  // 원양 항로 — 이 권역에 닿는 것
  const lanes = OCEAN_LANES.filter((l) => ids.has(l.a) || ids.has(l.b));
  const monsoon = lanes.filter((l) => l.monsoon);

  // 시장 충격이 걸릴 자리 — 사건마다 조건이 다르다
  const shockSlots = {};
  for (const ev of SHOCK.events) {
    let n = 0;
    for (const c of cities) {
      const t = ALL_CITY_TRADE[c.id];
      if (!t) continue;
      if (ev.kind === 'demand') {
        const pool = ev.goods ?? Object.keys(t.demand ?? {});
        n += pool.filter((g) => (t.demand?.[g] ?? 0) > 1).length;
      } else {
        const pool = ev.goods ?? Object.keys(t.supply ?? {});
        n += pool.filter((g) => (t.supply?.[g] ?? 9) < 1).length;
      }
    }
    shockSlots[ev.id] = n;
  }

  /* NPC는 `region` 필드를 안 갖는다 — 다니는 자리로 판별한다.
     상인은 `circuit`(도는 항구), 해적은 `base`+`hunt`(사냥 구간 'a|b')와 `circuit`. */
  const traders = ALL_TRADERS.filter((t) => (t.circuit ?? []).some((x) => ids.has(x)));
  const pirates = ALL_PIRATES.filter((p) => ids.has(p.base)
    || (p.circuit ?? []).some((x) => ids.has(x))
    || (p.hunt ?? []).some((seg) => seg.split('|').some((x) => ids.has(x))));
  const figures = ALL_FIGURES.filter((f) => ids.has(f.at) || (f.roam ?? []).some((x) => ids.has(x)));

  const bySeason = (arr) => arr.reduce((a, d) => { const s = seasonOfDef(d); a[s] = (a[s] || 0) + 1; return a; }, {});

  return {
    region: rid,
    cities: cities.length,
    routes: { total: inRegion.length, sea: seaLegs.length, inland: inland.length },
    oceanLanes: { total: lanes.length, monsoon: monsoon.length },
    prizeYard: cities.filter((c) => c.prizeYard).map((c) => c.id),
    tariffOverride: cities.filter((c) => ALL_CITY_TARIFF[c.id] != null).length,
    shockSlots,
    raidSlots: traders.length,                         // 털릴 상인이 없으면 raid도 없다
    traders: { n: traders.length, season: bySeason(traders) },
    pirates: { n: pirates.length },
    figures: { n: figures.length, season: bySeason(figures),
               services: [...new Set(figures.map((f) => f.service).filter(Boolean))] },
  };
}

/* ── 3. 소설 소재집 §6 — 권역마다 여덟 ────────────────────────── */

function novelEvents(rid) {
  const p = join(ROOT, 'story', 'regions', `${rid}-50.md`);
  let md;
  try { md = readFileSync(p, 'utf8'); } catch { return []; }
  const sec = md.split(/^## §6/m)[1];
  if (!sec) return [];
  const body = sec.split(/^## §7/m)[0];
  const rows = [];
  for (const line of body.split('\n')) {
    /* 이름을 `**볼드**`로 적은 파일과 안 적은 파일이 섞여 있다(지중해·카리브가 후자).
       볼드를 필수로 두었더니 그 둘만 0건으로 나왔다 — 표기 차이지 결손이 아니다. */
    const cols = line.split('|').map((s) => s.trim());
    if (cols.length < 7) continue;
    const no = Number(cols[1]);
    if (!Number.isInteger(no)) continue;
    const strip = (t) => t.replace(/\*\*/g, '').trim();
    rows.push({ no, name: strip(cols[2]), gist: strip(cols[3]), basis: cols[5] ?? '', chapter: cols[6] ?? '' });
  }
  return rows;
}

/* ── 4. 조립 ──────────────────────────────────────────────────── */

const regions = REGIONS.map((r) => r.id);
const slots = Object.fromEntries(regions.map((rid) => [rid, regionSlots(rid)]));
const novel = Object.fromEntries(regions.map((rid) => [rid, novelEvents(rid)]));

const inv = {
  when: new Date().toISOString(),
  seaEvents: SEA, marketEvents: MARKET, inlandOdds: INLAND_ODDS,
  startPorts: START_PORTS,
  regions: slots, novel,
  totals: {
    cities: ALL_CITY_GEO.length, routes: ALL_ROUTES.length, lanes: OCEAN_LANES.length,
    traders: ALL_TRADERS.length, pirates: ALL_PIRATES.length, figures: ALL_FIGURES.length,
    novelEvents: Object.values(novel).reduce((a, v) => a + v.length, 0),
  },
};

if (process.argv.includes('--json')) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'inventory.json'), JSON.stringify(inv, null, 2), 'utf8');
  console.log('기록 — .playtest/nine-seas/inventory.json');
}

/* ── 5. 사람이 읽는 요약 ──────────────────────────────────────── */

const pad = (s, n) => String(s).padEnd(n, ' ');
console.log('\n■ 해상 이벤트 (SEA_EVENTS) — 항해 중 판정');
for (const e of SEA) console.log(`  ${pad(e.id, 10)} w=${pad(e.weight, 3)} ${pad(e.name, 12)} ${e.how}`);
console.log(`  ※ 육로·내해 사고율 INLAND_ODDS=${INLAND_ODDS}`);

console.log('\n■ 시장 충격 (SHOCK) — 항구 시세를 흔든다');
for (const e of MARKET) console.log(`  ${pad(e.id, 10)} ×${pad(e.mult, 5)} ${pad(e.days + '일', 5)} ${pad(e.name, 14)} ${e.how}`);

console.log('\n■ 권역별 발동 자리');
console.log(`  ${pad('권역', 15)} ${pad('도시', 5)} ${pad('해상/육로', 10)} ${pad('원양(계절풍)', 13)} ${pad('기근', 5)} ${pad('봉쇄', 5)} ${pad('풍작', 5)} ${pad('상인', 5)} ${pad('해적', 5)} ${pad('인물', 5)} 나포선마당`);
for (const rid of regions) {
  const s = slots[rid];
  console.log(`  ${pad(rid, 15)} ${pad(s.cities, 5)} ${pad(`${s.routes.sea}/${s.routes.inland}`, 10)} ${pad(`${s.oceanLanes.total}(${s.oceanLanes.monsoon})`, 13)} ${pad(s.shockSlots.famine, 5)} ${pad(s.shockSlots.blockade, 5)} ${pad(s.shockSlots.glut, 5)} ${pad(s.traders.n, 5)} ${pad(s.pirates.n, 5)} ${pad(s.figures.n, 5)} ${s.prizeYard.join(',') || '—'}`);
}

console.log('\n■ 소설 소재집 §6 이벤트');
for (const rid of regions) console.log(`  ${pad(rid, 15)} ${novel[rid].length}건 — ${novel[rid].map((x) => x.no).join(',')}`);
console.log(`  합계 ${inv.totals.novelEvents}건`);

/* 자리가 0인 곳은 그 사건이 그 권역에서 영원히 안 난다 — 실클릭 이전에 잡히는 결함 */
const holes = [];
for (const rid of regions) {
  const s = slots[rid];
  for (const [k, v] of Object.entries(s.shockSlots)) if (v === 0) holes.push(`${rid}: 시장충격 ${k} 자리 0`);
  if (s.traders.n === 0) holes.push(`${rid}: 상인 NPC 0 — 나포 여파(raid)와 상선 조우가 안 난다`);
  if (s.pirates.n === 0) holes.push(`${rid}: 해적 NPC 0 — 지목된 해적 조우가 안 난다`);
  if (s.figures.n === 0) holes.push(`${rid}: 항구 인물 0`);
  if (s.routes.sea === 0) holes.push(`${rid}: 해상 구간 0 — 해상 이벤트가 안 난다`);
}
console.log('\n■ 구멍 (자리 자체가 없는 것)');
console.log(holes.length ? holes.map((h) => '  ✗ ' + h).join('\n') : '  없음 — 아홉 권역 모두 모든 사건이 걸릴 자리를 가졌다');
console.log('');
