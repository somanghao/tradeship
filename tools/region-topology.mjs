// region-topology.mjs — 권역 안의 **항로 그물이 실제로 어떻게 생겼나**를 전수로 낸다
//
// ★ 왜 필요한가.
//   실클릭 회차가 "못 간 항구"를 적을 때, 그것이 **① 항로가 없어서**인지
//   **② 하네스가 못 눌러서**인지 구분할 근거가 없었다. 다섯 테스터가 같은 항구를
//   각자 다르게 판정하는 자리다. 그래서 코드에서 답을 뽑아 하나의 정본으로 둔다.
//
//   ★ **거점은 뭍에도 선다**(`data.js: HEGEMONY` ① 주석 — 내륙 도시도 센다).
//     그러므로 권역 패권은 **그 권역 모든 항구에 갈 수 있어야** 성립한다.
//     연결 성분이 둘 이상이면 한쪽에서 시작한 판은 다른 쪽에 **영원히 못 간다** —
//     원양 항로로 우회하지 않는 한. 그것이 이 도구가 잡는 결함이다.
//
//   node tools/region-topology.mjs            # 사람이 읽는 표
//   node tools/region-topology.mjs --md       # 마크다운(테스터가 붙여 쓰는 정본)

import {
  REGIONS, ALL_CITY_GEO, ALL_ROUTES, ALL_ROUTE_RISK, LIVE_LANES, citiesOfRegion,
} from '../js/regions/index.js';

const MD = process.argv.includes('--md');
const NAME = Object.fromEntries(ALL_CITY_GEO.map((c) => [c.id, c.name]));
const GEO = Object.fromEntries(ALL_CITY_GEO.map((c) => [c.id, c]));

/** 이 권역 안에서만 잇는 항로 — 원양(OCEAN_LANES)은 권역을 넘으므로 따로 센다 */
function graphOf(rid) {
  const ids = new Set(citiesOfRegion(rid).map((c) => c.id));
  const adj = {};
  const land = [], sea = [];
  for (const id of ids) adj[id] = [];
  for (const [a, b] of ALL_ROUTES) {
    if (!ids.has(a) || !ids.has(b)) continue;
    adj[a].push(b); adj[b].push(a);
    const key = [a, b].sort().join('|');
    const d = Math.round(Math.hypot(GEO[a].x - GEO[b].x, GEO[a].y - GEO[b].y));
    (ALL_ROUTE_RISK[key] === null ? land : sea).push([a, b, d]);
  }
  return { ids, adj, land, sea };
}

/** 연결 성분 — 배로든 뭍으로든 이어져 있으면 한 덩어리다 */
function components(ids, adj) {
  const seen = new Set(), out = [];
  for (const s of ids) {
    if (seen.has(s)) continue;
    const comp = [], q = [s]; seen.add(s);
    while (q.length) {
      const c = q.shift(); comp.push(c);
      for (const n of adj[c] ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
    }
    out.push(comp);
  }
  return out.sort((a, b) => b.length - a.length);
}

const lanesOf = (ids) => LIVE_LANES.filter((l) => ids.has(l.a) || ids.has(l.b));

/* ★ **알고 그렇게 둔 단절** — 결함이 아니라 그 권역의 설계다.
   남아메리카는 두 대양이 서로 만나지 않는 것이 **뼈대**다(`regions/southamerica/geo.js` 머리말).
   마젤란 해협은 이 시대에 통과가 사실상 불가에 가까웠고(1599년의 한 선단은 넉 달이 걸렸다),
   1584년 해협에 세운 도시는 그해 겨울에 굶어 죽어 이름이 '기아항'이 됐다. 은길(카미노 데 라
   플라타)도 **일부러 안 그었다** — 그 선을 그으면 대서양과 태평양이 뭍으로 이어져 단절이 사라진다.
   *"세계에서 가장 싼 은이 세계에서 가장 깊숙한 막다른 곳에 있다"* — 그 다섯 번의 환적이
   은값에 얹히는 것이 이 게임 경제의 축이다.
   ⇒ 검사기가 그것을 **결함으로 보고하면 다음 사람이 「고쳐야 할 구멍」으로 읽는다.**
     실제로 그랬다(2026-08-26 PM 회차). 그래서 여기 적어 두고 판정에서 뺀다.
   ⚠️ 뺀다고 **안 보여주지는 않는다** — 표에는 그대로 나오되 ⚠️가 아니라 「의도」로 적는다. */
const BY_DESIGN = {
  southamerica: '두 대양이 만나지 않는 것이 이 권역의 뼈대다 — 태평양은 파나마 지협(portobelo~callao)으로만 든다',
};

const rows = [];
let problems = 0;

for (const r of REGIONS) {
  const cities = citiesOfRegion(r.id);
  if (!cities.length) continue;
  const { ids, adj, land, sea } = graphOf(r.id);
  const comps = components(ids, adj);
  const isolated = [...ids].filter((i) => (adj[i] ?? []).length === 0);
  /* 뭍으로만 닿는 도시 — 배가 못 가는 곳이라 항해 위주 러너가 놓치기 쉽다 */
  const landOnly = [...ids].filter((i) => {
    const ns = adj[i] ?? [];
    if (!ns.length) return false;
    return ns.every((n) => ALL_ROUTE_RISK[[i, n].sort().join('|')] === null);
  });
  const lanes = lanesOf(ids);
  const deg1 = [...ids].filter((i) => (adj[i] ?? []).length === 1);

  const byDesign = BY_DESIGN[r.id] ?? null;
  if (!byDesign && (comps.length > 1 || isolated.length)) problems++;

  rows.push({
    id: r.id, name: r.name, n: cities.length,
    comps: comps.map((c) => c.length), compCities: comps.slice(1).map((c) => c.map((x) => NAME[x])),
    byDesign,
    isolated: isolated.map((i) => NAME[i]),
    landOnly: landOnly.map((i) => NAME[i]),
    deg1: deg1.map((i) => NAME[i]),
    land: land.length, sea: sea.length, lanes: lanes.length,
    landPairs: land.map(([a, b]) => `${NAME[a]}−${NAME[b]}`),
    longSea: sea.sort((x, y) => y[2] - x[2]).slice(0, 3).map(([a, b, d]) => `${NAME[a]}−${NAME[b]}(${d})`),
  });
}

if (MD) {
  console.log('# 권역 위상 — 실클릭 회차가 "못 간 항구"를 판정하는 근거\n');
  console.log('> 생성물이다. `node tools/region-topology.mjs --md`로 다시 만든다. 손으로 고치지 마라.\n');
  console.log('★ **거점은 뭍에도 선다**(`data.js: HEGEMONY` ①). 그러므로 권역 패권은');
  console.log('그 권역 **모든 도시에 닿을 수 있어야** 성립한다. 연결 성분이 둘 이상이면');
  console.log('한쪽에서 시작한 판은 다른 쪽에 **영원히 못 간다**.\n');
  console.log('| 권역 | 도시 | 연결 덩어리 | 고립 | 뭍으로만 | 막다른(이웃 1) | 해로 | 육로 | 원양 |');
  console.log('|---|---:|---|---|---|---|---:|---:|---:|');
  for (const r of rows) {
    console.log(`| ${r.name} | ${r.n} | ${r.comps.join('+')}`
      + `${r.comps.length > 1 ? (r.byDesign ? ' ⓘ' : ' ⚠️') : ''} | ${r.isolated.join(', ') || '—'}`
      + ` | ${r.landOnly.join(', ') || '—'} | ${r.deg1.join(', ') || '—'}`
      + ` | ${r.sea} | ${r.land} | ${r.lanes} |`);
  }
  console.log('\n## 육로·내해 구간 (배가 아니라 뭍으로 간다 — 노상강도·통행세가 나는 자리)\n');
  for (const r of rows) {
    if (!r.landPairs.length) continue;
    console.log(`- **${r.name}** (${r.landPairs.length}) — ${r.landPairs.join(' · ')}`);
  }
  console.log('\n## 권역 최장 해로 (짧은 대기로는 도착을 못 보는 자리)\n');
  for (const r of rows) console.log(`- **${r.name}** — ${r.longSea.join(' · ')}`);
  console.log('\n---\n');
  console.log(problems
    ? `⚠️ **닿지 못하는 자리가 있는 권역 ${problems}곳** — 위 표의 ⚠️와 고립 칸을 보라.`
    : '✅ 닿지 못하는 자리는 없다 — ⓘ로 적힌 단절은 **알고 그렇게 둔 것**이다.');
} else {
  console.log('=== 권역 위상 ===');
  for (const r of rows) {
    console.log(`${r.name.padEnd(14)} 도시 ${String(r.n).padStart(2)} · 덩어리 ${r.comps.join('+')}`
      + ` · 해로 ${String(r.sea).padStart(2)} · 육로 ${String(r.land).padStart(2)} · 원양 ${r.lanes}`);
    if (r.isolated.length) console.log(`  ⚠️ 고립: ${r.isolated.join(', ')}`);
    if (r.compCities.length) {
      console.log(`  ${r.byDesign ? 'ⓘ 갈라 둔 덩어리' : '⚠️ 떨어진 덩어리'}: `
        + r.compCities.map((c) => c.join('/')).join(' | '));
      if (r.byDesign) console.log(`     ↳ 의도다 — ${r.byDesign}`);
    }
    if (r.landOnly.length) console.log(`  뭍으로만: ${r.landOnly.join(', ')}`);
    if (r.deg1.length) console.log(`  막다른(이웃 1): ${r.deg1.join(', ')}`);
  }
  console.log(problems ? `\n⚠️ 닿지 못하는 자리가 있는 권역 ${problems}곳` : '\n✅ 아홉 권역 모두 한 덩어리다');
}
