// check-novel-events.mjs — 소설 소재집 §6 이벤트 72건의 **근거가 코드와 맞는가**
//
//   node tools/check-novel-events.mjs           # 요약
//   node tools/check-novel-events.mjs --all     # 항목마다 한 줄씩
//   node tools/check-novel-events.mjs --json    # .playtest/nine-seas/novel-check.json
//
// 규약(다른 check-*와 같다) — **실패(exit 1)는 코드와 근거가 어긋날 때만.**
// 소재집이 스스로 '각색'이라 적었거나 참조가 자유서술이면 경고에 그친다.
// "근거 없음"으로 실패시키면 콘텐츠를 늘리려 조사부터 끝내야 하는 구조가 된다.
//
// ★ 이 검사는 **문서→코드** 방향이다. 소설이 "말라카~광저우 16일"이라 적었는데 코드가 14일이면,
//   고칠 곳은 대개 소설이다(게임 데이터를 바꾸지 않는 것이 story/의 규약).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REGIONS, ALL_CITY_GEO, ALL_CITY_TRADE, ALL_CITY_TARIFF, ALL_ROUTE_RISK,
  ALL_TRADERS, ALL_PIRATES, ALL_FIGURES, OCEAN_LANES, ALL_GOODS,
} from '../js/regions/index.js';
import { SHOCK, GOOD_BY_ID } from '../js/data.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, '.playtest', 'nine-seas');

const CITY = Object.fromEntries(ALL_CITY_GEO.map((c) => [c.id, c]));
const NPC = new Map([...ALL_TRADERS, ...ALL_PIRATES, ...ALL_FIGURES].map((n) => [n.id, n]));
const GOOD_NAME = Object.fromEntries(ALL_GOODS.map((g) => [g.id, g.name]));
const near = (a, b) => Math.abs(a - b) < 1e-6;

/* ── 소재집 §6 읽기 ───────────────────────────────────────────── */
function novelEvents(rid) {
  const md = readFileSync(join(ROOT, 'story', 'regions', `${rid}-50.md`), 'utf8');
  const sec = md.split(/^## §6/m)[1];
  if (!sec) return [];
  const rows = [];
  for (const line of sec.split(/^## §7/m)[0].split('\n')) {
    const cols = line.split('|').map((s) => s.trim());
    if (cols.length < 7) continue;
    const no = Number(cols[1]);
    if (!Number.isInteger(no)) continue;
    rows.push({ no, name: cols[2].replace(/\*\*/g, ''), basis: cols[5], chapter: cols[6] });
  }
  return rows;
}

/* ── 근거 한 칸에서 검사할 주장을 뽑는다 ───────────────────────── */
function claimsOf(basis) {
  const out = [];
  const push = (kind, ...rest) => out.push({ kind, ...rest[0] });

  // trade.js: TARIFF_OVERRIDE <city> <num>   /  TARIFF_OVERRIDE <city> 0.08 → <city2> 0.09
  for (const m of basis.matchAll(/TARIFF_OVERRIDE\s+([a-z][a-z0-9]*)\s+([0-9.]+)/g)) {
    push('tariff', { city: m[1], value: Number(m[2]), raw: m[0] });
  }
  // ROUTE_RISK 'a|b' <num>  (표 안에서 파이프가 \| 로 이스케이프돼 있다)
  for (const m of basis.matchAll(/ROUTE_RISK\s*['"]?([a-z][a-z0-9]*)\s*\\?\|\s*([a-z][a-z0-9]*)['"]?\s*([0-9.]+)?/g)) {
    push('risk', { a: m[1], b: m[2], value: m[3] == null ? null : Number(m[3]), raw: m[0] });
  }
  // <city>.supply.<good> <num> / <city>.demand.<good> <num>
  for (const m of basis.matchAll(/([a-z][a-z0-9]*)\.(supply|demand)\.([a-z][a-z0-9]*)\s+([0-9.]+)/g)) {
    push('trade', { city: m[1], side: m[2], good: m[3], value: Number(m[4]), raw: m[0] });
  }
  // <city>.supply {a 0.50, b 0.50}
  for (const m of basis.matchAll(/([a-z][a-z0-9]*)\.(supply|demand)\s*\{([^}]+)\}/g)) {
    for (const p of m[3].split(',')) {
      const q = p.trim().match(/([a-z][a-z0-9]*)\s+([0-9.]+)/);
      if (q) push('trade', { city: m[1], side: m[2], good: q[1], value: Number(q[2]), raw: m[0] });
    }
  }
  // trade.js: <city> <good> <num> [· <good> <num> …]
  for (const m of basis.matchAll(/trade\.js:\s*([a-z][a-z0-9]*)\s+((?:[a-z][a-z0-9]*\s+[0-9.]+\s*[·,]?\s*)+)/g)) {
    const city = m[1];
    for (const p of m[2].matchAll(/([a-z][a-z0-9]*)\s+([0-9.]+)/g)) {
      push('trade', { city, side: null, good: p[1], value: Number(p[2]), raw: `${city} ${p[1]} ${p[2]}` });
    }
  }
  // <id> season 'winter'  /  <id>(season winter)
  for (const m of basis.matchAll(/([a-z][a-z0-9-]{3,})[`'"]?[^`]{0,24}?season\s+['"]?(summer|winter)['"]?/g)) {
    push('season', { id: m[1], season: m[2], raw: m[0] });
  }
  // <city> prizeYard: true
  for (const m of basis.matchAll(/([a-z][a-z0-9]*)\s+prizeYard/g)) {
    push('prizeyard', { city: m[1], raw: m[0] });
  }
  // OCEAN_LANES a~b days N · risk N · monsoon:true
  for (const m of basis.matchAll(/OCEAN_LANES\s+([a-z][a-z0-9]*)\s*[~\\|-]\s*([a-z][a-z0-9]*)([^`]*)/g)) {
    const tail = m[3];
    const days = tail.match(/days\s+([0-9.]+)/);
    const risk = tail.match(/risk\s+([0-9.]+)/);
    push('lane', { a: m[1], b: m[2], days: days ? Number(days[1]) : null,
                   risk: risk ? Number(risk[1]) : null, monsoon: /monsoon\s*:\s*true/.test(tail), raw: m[0].slice(0, 60) });
  }
  // SHOCK.<key> <num> / INSURANCE_* 같은 상수
  for (const m of basis.matchAll(/SHOCK\.([a-zA-Z]+)\s+([0-9.]+)/g)) {
    push('const', { path: `SHOCK.${m[1]}`, value: Number(m[2]), raw: m[0] });
  }
  // 백틱 안의 식별자 — npc-*.js: <id> 형태
  for (const m of basis.matchAll(/npc-(?:traders|pirates|figures)\.js:\s*([a-z][a-z0-9-]*)/g)) {
    push('npc', { id: m[1], raw: m[0] });
  }
  // 접두사가 붙은 인물 id는 파일 이름 없이도 쓰인다 (eas-nagasaki-pancada 등)
  for (const m of basis.matchAll(/\b((?:med|car|sam|atl|afr|mid|ind|sea|eas)-[a-z0-9-]{3,})\b/g)) {
    push('npc', { id: m[1].replace(/[.,]$/, ''), raw: m[1] });
  }
  return out;
}

/* ── 주장 하나를 코드와 대조한다 ───────────────────────────────── */
function verify(c) {
  const bad = (why) => ({ ok: false, why });
  const ok = (what) => ({ ok: true, why: what });
  switch (c.kind) {
    case 'tariff': {
      if (!CITY[c.city]) return bad(`도시 ${c.city}가 없다`);
      const v = ALL_CITY_TARIFF[c.city];
      if (v == null) return bad(`${c.city}에 TARIFF_OVERRIDE가 없다 (근거는 ${c.value})`);
      return near(v, c.value) ? ok(`${c.city} 세율 ${v}`) : bad(`${c.city} 세율 코드 ${v} ≠ 근거 ${c.value}`);
    }
    case 'risk': {
      if (!CITY[c.a] || !CITY[c.b]) return bad(`도시 ${!CITY[c.a] ? c.a : c.b}가 없다`);
      const key = [c.a, c.b].sort().join('|');
      if (!(key in ALL_ROUTE_RISK)) return bad(`항로 ${key}가 없다`);
      const v = ALL_ROUTE_RISK[key];
      if (c.value == null) return ok(`${key} 있음(위험 ${v})`);
      return near(v ?? -1, c.value) ? ok(`${key} 위험 ${v}`) : bad(`${key} 위험 코드 ${v} ≠ 근거 ${c.value}`);
    }
    case 'trade': {
      if (!CITY[c.city]) return bad(`도시 ${c.city}가 없다`);
      if (!GOOD_NAME[c.good]) return { ok: null, why: `${c.good}은 교역품 id가 아니다 — 대조 못 함` };
      const t = ALL_CITY_TRADE[c.city] ?? {};
      const sides = c.side ? [c.side] : ['supply', 'demand'];
      for (const s of sides) {
        const v = t[s]?.[c.good];
        if (v != null && near(v, c.value)) return ok(`${c.city}.${s}.${c.good}=${v}`);
      }
      const have = sides.map((s) => `${s}=${t[s]?.[c.good] ?? '없음'}`).join(' ');
      return bad(`${c.city} ${c.good} 근거 ${c.value} ≠ 코드 ${have}`);
    }
    case 'season': {
      const n = NPC.get(c.id);
      if (!n) return { ok: null, why: `${c.id}를 NPC 명부에서 못 찾았다 — 자유서술로 본다` };
      return n.season === c.season ? ok(`${c.id} season=${n.season}`)
                                   : bad(`${c.id} season 코드 ${n.season ?? 'null'} ≠ 근거 ${c.season}`);
    }
    case 'prizeyard': {
      if (!CITY[c.city]) return bad(`도시 ${c.city}가 없다`);
      return CITY[c.city].prizeYard ? ok(`${c.city} prizeYard`) : bad(`${c.city}에 prizeYard가 없다`);
    }
    case 'lane': {
      const l = OCEAN_LANES.find((x) => (x.a === c.a && x.b === c.b) || (x.a === c.b && x.b === c.a));
      if (!l) return bad(`원양 항로 ${c.a}~${c.b}가 없다`);
      const errs = [];
      if (c.days != null && !near(l.days, c.days)) errs.push(`days 코드 ${l.days} ≠ 근거 ${c.days}`);
      if (c.risk != null && !near(l.risk ?? -1, c.risk)) errs.push(`risk 코드 ${l.risk} ≠ 근거 ${c.risk}`);
      if (c.monsoon && !l.monsoon) errs.push('monsoon이 코드에 없다');
      return errs.length ? bad(`${c.a}~${c.b}: ${errs.join(' · ')}`) : ok(`${c.a}~${c.b} 일치`);
    }
    case 'const': {
      const v = c.path.split('.').slice(1).reduce((o, k) => o?.[k], SHOCK);
      if (v == null) return bad(`${c.path}가 없다`);
      return near(v, c.value) ? ok(`${c.path}=${v}`) : bad(`${c.path} 코드 ${v} ≠ 근거 ${c.value}`);
    }
    case 'npc': {
      return NPC.has(c.id) ? ok(`${c.id} 명부에 있다`) : bad(`${c.id}라는 NPC·인물이 명부에 없다`);
    }
    default: return { ok: null, why: '대조 규칙 없음' };
  }
}

/* ── 돌린다 ───────────────────────────────────────────────────── */
const ALL = process.argv.includes('--all');
const rows = [];
let nFail = 0, nWarn = 0, nOk = 0, nDram = 0;

for (const r of REGIONS) {
  for (const ev of novelEvents(r.id)) {
    const claims = claimsOf(ev.basis);
    const checked = claims.map((c) => ({ ...c, ...verify(c) }));
    const fails = checked.filter((c) => c.ok === false);
    const skips = checked.filter((c) => c.ok === null);
    const dram = /각색/.test(ev.basis);
    if (dram) nDram++;
    nFail += fails.length; nWarn += skips.length; nOk += checked.filter((c) => c.ok === true).length;
    rows.push({ region: r.id, no: ev.no, name: ev.name, chapter: ev.chapter, dramatized: dram,
                claims: checked.length, fails: fails.map((f) => f.why), skips: skips.map((s) => s.why) });
    if (ALL || fails.length) {
      const mark = fails.length ? '✗' : checked.length ? '✓' : '·';
      console.log(`${mark} ${r.id} #${ev.no} ${ev.name}${dram ? ' [각색표기]' : ''} — 주장 ${checked.length}건`);
      for (const f of fails) console.log(`    ✗ ${f.why}`);
      if (ALL) for (const s of skips) console.log(`    · ${s.why}`);
    }
  }
}

const byRegion = {};
for (const r of rows) {
  const b = (byRegion[r.region] ??= { events: 0, claims: 0, fails: 0, dramatized: 0 });
  b.events++; b.claims += r.claims; b.fails += r.fails.length; b.dramatized += r.dramatized ? 1 : 0;
}

console.log('\n■ 권역별');
for (const [rid, b] of Object.entries(byRegion)) {
  console.log(`  ${rid.padEnd(15)} 이벤트 ${b.events} · 대조한 주장 ${String(b.claims).padStart(3)} · 어긋남 ${b.fails} · 각색표기 ${b.dramatized}`);
}
console.log(`\n합계 — 이벤트 ${rows.length} · 대조 성공 ${nOk} · 어긋남 ${nFail} · 대조 못 함 ${nWarn} · 각색표기 ${nDram}`);

if (process.argv.includes('--json')) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'novel-check.json'),
    JSON.stringify({ when: new Date().toISOString(), byRegion, rows }, null, 2), 'utf8');
  console.log('기록 — .playtest/nine-seas/novel-check.json');
}

if (nFail) {
  console.log('\n✗ 근거와 코드가 어긋난다. 게임 데이터를 바꾸지 않는 것이 story/의 규약이므로, 대개 고칠 곳은 소재집이다.');
  process.exit(1);
}
console.log('\n✓ 소재집 §6의 코드 참조가 전부 코드와 맞는다.');
