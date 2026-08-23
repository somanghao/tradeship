// check-origins.mjs — **한반도 갈래 다섯**이 소설 설계와 코드에서 같은가
//
// ★ 왜 필요한가.
//   갈래 다섯(`data.js: ORIGINS`)의 값은 **세 곳에 적혀 있다** —
//     ① 코드      `js/data.js: ORIGINS`                     (정본)
//     ② 소설 설계  `story/PROTAGONISTS.md` §6-1 확정값 사본표
//     ③ 연결 문서  `story/GAME-LINK.md` 갈래표
//   ②③은 스스로 "코드가 정본이고 여기 적힌 값은 사본"이라고 적어 두었는데,
//   **그 사본이 어긋났는지 아무도 확인하지 않았다.** `check-novel-events.mjs`는
//   소재집 §6 이벤트 72건만 보고 갈래는 한 줄도 보지 않는다.
//   갈래 값은 밸런스를 만질 때마다 흔들리는 자리라, 어긋나면 소설이 **없는 규칙 위에서
//   써진다**(원고가 나온 뒤에 알면 고칠 수 없다).
//
// ★ 무엇을 실패로 보는가 (claude-memory의 절대 원칙 — 실패와 경고를 가른다)
//   **실패(exit 1)** — 코드와 문서가 *서로 다른 값을 말한다*. 갈래가 문서에 없다. 문서에만 있다.
//   **경고**       — 문서가 값을 적지 않았다(사본이 아직 안 따라왔을 뿐).
//
//   node tools/check-origins.mjs

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGINS, ORIGIN_BY_ID, DEFAULT_ORIGIN, BOON } from '../js/data.js';
import { ALL_CITY_GEO } from '../js/regions/index.js';

/* `CITY_BY_ID`는 `data.js`가 만든다 — 권역 index는 `ALL_CITY_GEO`(배열)만 낸다 */
const CITY_BY_ID = Object.fromEntries(ALL_CITY_GEO.map((c) => [c.id, c]));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const fails = [], warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

/* ── 숫자 읽기 — 문서는 `.10` · `−.12` · `1,400` 처럼 적는다 ────
   ★ 유니코드 빼기표(−, U+2212)를 ASCII로 바꾸지 않으면 음수 특전이 조용히 양수가 된다. */
function num(s) {
  if (s == null) return null;
  const t = String(s).replace(/[−–—]/g, '-').replace(/,/g, '').replace(/\*\*|`/g, '').trim();
  if (!/^-?\.?\d/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

/** `` `tariffOff .10` · `joseonOnly` · `hireUp .25` `` → { tariffOff: .1, joseonOnly: true, hireUp: .25 } */
function parsePerks(cell) {
  const out = {};
  for (const m of String(cell).matchAll(/`([A-Za-z]+)\s*(−?-?[\d.,]*)`/g)) {
    const key = m[1];
    const v = num(m[2]);
    out[key] = v == null ? true : v;
  }
  return out;
}

/** 마크다운 표에서 `| a | b | …` 행들을 뽑는다 — 구분선(`|---|`)은 버린다 */
function rowsOf(block) {
  return block.split('\n')
    .filter((l) => l.trim().startsWith('|') && !/^\|[\s:|-]+\|$/.test(l.trim()))
    .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))
    /* ★ 표 머리(`| id | 이름 | …`)를 버린다 — 안 버리면 첫 칸 'id'가 갈래로 읽혀
       "갈래 'id'가 코드에 없다"는 거짓 어긋남이 난다. 실제로 한 번 그렇게 나왔다. */
    .filter((r) => !/^(id|#|갈래)$/i.test(r[0]));
}

/* ══ ① 코드 자체가 자기모순인가 ═══════════════════════════════ */
{
  const ids = new Set();
  for (const o of ORIGINS) {
    if (ids.has(o.id)) fail(`ORIGINS: id '${o.id}'가 둘 이상이다`);
    ids.add(o.id);
    if (!CITY_BY_ID[o.at]) fail(`ORIGINS '${o.id}': 시작 부두 '${o.at}'가 세계에 없다`);
    else if (CITY_BY_ID[o.at].flag !== 'joseon') {
      fail(`ORIGINS '${o.id}': 시작 부두 '${o.at}'가 조선 항구가 아니다(flag=${CITY_BY_ID[o.at].flag})`
         + ' — 갈래 다섯은 전부 한반도에서 난다');
    }
    if (!(o.gold >= 0)) fail(`ORIGINS '${o.id}': gold가 수가 아니다`);
    for (const [k, v] of Object.entries(o.perks ?? {})) {
      // ★ joseonOnly는 perk 값이 아니라 게이팅 메타키다 — `true`(전부) 아니면
      //   골라 거는 키 배열(`['tariffOff']`, 결함 D)이라 문자열 배열도 정상이다.
      if (k === 'joseonOnly') {
        if (typeof v !== 'boolean' && !(Array.isArray(v) && v.every((s) => typeof s === 'string'))) {
          fail(`ORIGINS '${o.id}': perks.joseonOnly가 참거짓도 문자열 배열도 아니다`);
        }
        continue;
      }
      if (typeof v !== 'number' && typeof v !== 'boolean') {
        fail(`ORIGINS '${o.id}': perks.${k}가 수도 참거짓도 아니다`);
      }
    }
  }
  if (!ORIGIN_BY_ID[DEFAULT_ORIGIN]) fail(`DEFAULT_ORIGIN '${DEFAULT_ORIGIN}'이 ORIGINS에 없다`);

  /* ★ **세율 바닥이 갈래를 삼키는가.** `state.js: tariffOf`가
       `baseTariff × Math.max(BOON.tariffFloor, 1 − off)`로 재므로,
       `off ≥ 1 − tariffFloor`면 **그 위로는 아무리 깎아도 값이 같다.**
       종친(.55)처럼 큰 특전은 부관·문서와 겹치는 순간 이 천장에 눕는다 —
       결함은 아니지만 **설계가 알고 있어야 하는 구간**이라 알린다. */
  const CEIL = 1 - BOON.tariffFloor;
  for (const o of ORIGINS) {
    const t = o.perks?.tariffOff ?? 0;
    if (t >= CEIL) {
      warn(`갈래 '${o.id}'의 tariffOff ${t}가 혼자서 바닥(1−${BOON.tariffFloor}=${CEIL.toFixed(2)})에 닿는다`
         + ' — 이 갈래는 부관·문서 특전을 더 얹어도 세가 더 내려가지 않는다');
    } else if (t > 0 && t + 0.35 >= CEIL) {
      warn(`갈래 '${o.id}'(tariffOff ${t})는 **부관 에이미(0.35)만 태워도** 바닥에 눕는다`
         + ` — 특전 ${t}의 실효 폭이 화면에서 0이 되는 구간이 있다`);
    }
  }
}

/* ══ ①-b `joseonOnly`가 **벌점까지** 국경에서 죽이는가 ═══════════
   ★ `state.js: originPerk`의 `joseonOnly`는 **갈래 전체에 붙은 플래그**라,
     그 갈래의 *모든* perk가 조선 밖에서 0이 된다 — **벌점도 함께**.
     그런데 두 정본이 정반대를 말한다:
       `story/PROTAGONISTS.md` 원리 B — *"Ⅲ 종친 … 특전만 죽고 벌점은 산다(삯은 어디서나 비싸다)"*
       `claude-memory.md` — *"제1해에서 가장 센 갈래가 제3해에서 가장 **약해진다**"*
     코드대로면 약해지는 것이 아니라 **중립이 된다**(특전 0 · 벌점 0 = 아무 갈래도 아닌 상태).
     그 계급론이 소설 전체의 축이므로 여기서 실패로 잡는다.

   ★ 벌점을 어떻게 아는가 — 두 갈래다. **값이 음수**이거나(`tariffOff −0.12`),
     **양수가 벌점인 키**이거나(`hireUp`·`permitUp` — `data.js: ORIGINS` 주석이 그렇게 못 박았다).
     새 벌점 키를 만들면 아래 목록에 더해야 한다. */
const PENALTY_WHEN_POSITIVE = new Set(['hireUp', 'permitUp']);
const isPenalty = (key, v) => (typeof v === 'number')
  && (v < 0 || (PENALTY_WHEN_POSITIVE.has(key) && v > 0));

/** `joseonOnly`가 이 perk에 걸리는가 — `true`(전부) · 배열(고른 것만) 둘 다 받는다 */
function gatedKeys(o) {
  const g = o.perks?.joseonOnly;
  if (!g) return [];
  if (Array.isArray(g)) return g;
  return Object.keys(o.perks).filter((k) => k !== 'joseonOnly');
}

{
  for (const o of ORIGINS) {
    const gated = gatedKeys(o);
    if (!gated.length) continue;
    for (const k of gated) {
      const v = o.perks?.[k];
      if (isPenalty(k, v)) {
        fail(`갈래 '${o.id}': 벌점 '${k}'(=${v})가 joseonOnly에 걸려 **조선 밖에서 함께 죽는다**`
           + ' — story/PROTAGONISTS.md 원리 B는 "특전만 죽고 벌점은 산다"고 적는다.'
           + " joseonOnly를 이득 키에만 걸어라(예: joseonOnly: ['tariffOff'])");
      }
    }
    /* 벌점이 하나도 안 걸렸다면 그 갈래는 조선 밖에서 **이득만 잃는다** — 설계대로다 */
    const loose = Object.entries(o.perks ?? {})
      .filter(([k, v]) => k !== 'joseonOnly' && !gated.includes(k) && isPenalty(k, v));
    for (const [k, v] of loose) {
      warn(`갈래 '${o.id}': 벌점 '${k}'(=${v})는 조선 밖에서도 산다 — 의도라면 그대로 두라`);
    }
  }
}

/* ══ ② story/PROTAGONISTS.md §6-1 확정값 사본표 ═══════════════ */
{
  const md = read('story/PROTAGONISTS.md');
  const sec = md.split(/^### 6-1\./m)[1];
  if (!sec) fail('PROTAGONISTS.md에 §6-1 확정값 표가 없다 — 소설이 갈래 값을 사본으로 들고 있지 않다');
  else {
    const rows = rowsOf(sec.split(/^###? /m)[0]).filter((r) => /^`?[a-z]+`?$/.test(r[0].replace(/`/g, '')));
    const seen = new Set();
    for (const r of rows) {
      const id = r[0].replace(/`/g, '');
      seen.add(id);
      const o = ORIGIN_BY_ID[id];
      if (!o) { fail(`PROTAGONISTS §6-1: 갈래 '${id}'가 코드(ORIGINS)에 없다`); continue; }
      const at = r[2].replace(/\*\*/g, '');
      const cityName = CITY_BY_ID[o.at]?.name;
      if (cityName && at !== cityName) fail(`'${id}' 시작 부두 — 문서 "${at}" ↔ 코드 "${cityName}"`);
      const gold = num(r[3]), crew = num(r[4]);
      if (gold != null && gold !== o.gold) fail(`'${id}' 금화 — 문서 ${gold} ↔ 코드 ${o.gold}`);
      if (crew != null && crew !== (o.crew ?? 0)) fail(`'${id}' 선원 — 문서 ${crew} ↔ 코드 ${o.crew ?? 0}`);

      const dp = parsePerks(r[5]), cp = o.perks ?? {};
      for (const [k, v] of Object.entries(dp)) {
        if (!(k in cp)) { fail(`'${id}' perks — 문서에만 있는 '${k}'`); continue; }
        if (typeof v === 'number' && Math.abs(v - cp[k]) > 1e-9) {
          fail(`'${id}' perks.${k} — 문서 ${v} ↔ 코드 ${cp[k]}`);
        }
      }
      for (const k of Object.keys(cp)) {
        if (!(k in dp)) warn(`'${id}' perks — 문서가 아직 '${k}'(=${cp[k]})를 안 적었다`);
      }
    }
    for (const o of ORIGINS) {
      if (!seen.has(o.id)) fail(`PROTAGONISTS §6-1에 갈래 '${o.id}'(${o.name})가 없다`);
    }
  }

  /* §6-1이 함께 주장하는 규칙 — 값이 코드에 실재하는가 */
  if (sec) {
    const m = /tariffFloor\s*([\d.]+)/.exec(sec);
    if (m) {
      const v = num(m[1]);
      if (v != null && Math.abs(v - BOON.tariffFloor) > 1e-9) {
        fail(`BOON.tariffFloor — 문서 ${v} ↔ 코드 ${BOON.tariffFloor}`);
      }
    } else warn('PROTAGONISTS §6-1이 tariffFloor 값을 안 적었다');
  }
}

/* ══ ③ story/GAME-LINK.md 갈래표 ═══════════════════════════════ */
{
  const md = read('story/GAME-LINK.md');
  const rows = rowsOf(md).filter((r) => /^\*?\*?`[a-z]+`\*?\*?$/.test(r[0]));
  const seen = new Set();
  for (const r of rows) {
    const id = r[0].replace(/[`*]/g, '');
    if (!ORIGIN_BY_ID[id]) continue;   // 다른 표의 코드값일 수 있다
    seen.add(id);
    const o = ORIGIN_BY_ID[id];
    const at = r[2].replace(/\*\*/g, '');
    const cityName = CITY_BY_ID[o.at]?.name;
    if (cityName && at && at !== cityName) fail(`GAME-LINK '${id}' 시작 부두 — 문서 "${at}" ↔ 코드 "${cityName}"`);
    const gold = num(r[3]), crew = num(r[4]);
    if (gold != null && gold !== o.gold) fail(`GAME-LINK '${id}' 금화 — 문서 ${gold} ↔ 코드 ${o.gold}`);
    if (crew != null && crew !== (o.crew ?? 0)) fail(`GAME-LINK '${id}' 선원 — 문서 ${crew} ↔ 코드 ${o.crew ?? 0}`);
    const dp = parsePerks(r[5] + ' ' + (r[6] ?? ''));
    for (const [k, v] of Object.entries(dp)) {
      if (typeof v !== 'number') continue;
      const cv = o.perks?.[k];
      if (cv == null) { fail(`GAME-LINK '${id}' perks — 문서에만 있는 '${k}'`); continue; }
      if (Math.abs(Math.abs(v) - Math.abs(cv)) > 1e-9) fail(`GAME-LINK '${id}' perks.${k} — 문서 ${v} ↔ 코드 ${cv}`);
      /* ★ 부호까지 본다 — 서자의 `tariffOff −0.12`는 **벌점**이라 부호가 뒤집히면 뜻이 정반대가 된다.
         문서는 벌점을 대가 칸에 적으며 빼기표를 유니코드로 쓰므로 `num()`이 먼저 정규화한다. */
      if (v !== cv && Math.sign(v) !== Math.sign(cv)) {
        fail(`GAME-LINK '${id}' perks.${k} 부호가 반대다 — 문서 ${v} ↔ 코드 ${cv}`);
      }
    }
  }
  for (const o of ORIGINS) if (!seen.has(o.id)) warn(`GAME-LINK 갈래표에 '${o.id}'가 없다`);
}

/* ══ 결과 ═══════════════════════════════════════════════════ */
console.log('=== 갈래 다섯 — 코드 ↔ 소설 설계 대조 ===');
console.log(`갈래 ${ORIGINS.length}종 · 세율 바닥 ${BOON.tariffFloor} · 기본 갈래 ${DEFAULT_ORIGIN}`);
for (const o of ORIGINS) {
  const p = Object.entries(o.perks ?? {}).map(([k, v]) => `${k} ${v === true ? '' : v}`.trim()).join(' · ');
  console.log(`  ${o.id.padEnd(12)} ${o.name.padEnd(10)} ${CITY_BY_ID[o.at]?.name ?? o.at} `
    + `· ${String(o.gold).padStart(5)}닢 · 선원 ${String(o.crew ?? 0).padStart(2)} · ${p}`);
}
if (warns.length) {
  console.log(`\n경고 ${warns.length}건:`);
  for (const w of warns) console.log(`  [경고] ${w}`);
}
if (fails.length) {
  console.log(`\n어긋남 ${fails.length}건:`);
  for (const f of fails) console.log(`  [어긋남] ${f}`);
  process.exit(1);
}
console.log(`\n어긋남 0건${warns.length ? ` (경고 ${warns.length}건)` : ''}`);
