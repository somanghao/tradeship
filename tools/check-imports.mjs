// check-imports.mjs — **없는 이름을 가져오는 import**를 띄우기 전에 잡는다
//
// ★ 왜 이 파일이 있나 (2026-08-26).
//   `js/scenes/map.js`가 `riskKey`를 `../state.js`에서 가져오는데 state.js는 그 이름을
//   재수출하지 않았다. 브라우저는 그 모듈 그래프를 **통째로 거부한다** —
//   `SyntaxError: does not provide an export named 'riskKey'` — 그래서 **게임이 아예 안 떴다.**
//
//   ⚠️ 그런데 그동안 `check-*` **열셋과 규칙 184개가 전부 통과했다.**
//     그것들은 전부 `js/data.js`·`js/state.js`를 **직접** import해 규칙을 재는 도구라
//     `scenes/*`를 한 번도 안 거친다. 씬은 브라우저에서만 로드되므로 아무도 안 본다.
//     `check-dup-decl`은 **중복**만 보고 「없는 이름」은 안 본다.
//   ⇒ 지도 아홉 장이 낡은 채로 굳어 있던 것도 이 장애의 **증상**이었다
//     (`gen-map-png.mjs`가 게임을 띄워서 굽기 때문에, 게임이 안 뜨면 지도도 못 뽑는다).
//
//   이 검사가 답하는 것: **`js/` 안의 모든 정적 import가 실제로 존재하는 이름인가.**
//
//   node tools/check-imports.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC = join(ROOT, 'js');

/* ★ **주석을 먼저 지운다.** `export { … }` 블록 안에 설명 주석이 들어 있으면
   콤마로 가를 때 주석 조각이 이름 자리를 차지해 **그 뒤의 진짜 이름을 놓친다** —
   실제로 `data.js`의 `ALL_PIRATES`·`ALL_MATES`가 그렇게 빠져 거짓 경고가 났다.
   결과는 import/export 구문을 뽑는 데만 쓰므로 문자열 안의 `//`까지 완벽할 필요는 없다. */
function stripComments(src) {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return noBlock.split(String.fromCharCode(10)).map((line) => {
    const j = line.indexOf('//');
    if (j < 0) return line;
    if (j > 0 && line[j - 1] === ':') return line;   // http:// 같은 것은 주석이 아니다
    return line.slice(0, j);
  }).join(String.fromCharCode(10));
}

/** js/ 아래 .js 전부 */
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.js')) out.push(p);
  }
  return out;
}

/* ── 무엇을 내보내나 ────────────────────────────────────────────
   정규식으로 읽는다. 파서를 붙이면 정확하지만 이 프로젝트는 빌드가 없고
   문법이 평범해서(export function/const/class · export {} · export * from)
   이 정도로 충분하다. **놓치는 쪽으로 틀리게** 만든다 — 즉 애매하면 "있다"로 본다.
   검사기가 없는 결함을 만들어 내면 아무도 안 쓰게 되기 때문이다. */
function exportsOf(file, seen = new Set()) {
  const abs = resolve(file);
  if (seen.has(abs)) return { names: new Set(), star: [] };   // 순환 방지
  seen.add(abs);

  let src;
  try { src = stripComments(readFileSync(abs, 'utf8')); } catch { return { names: new Set(), star: [] }; }
  const names = new Set();
  let star = [];

  // export function foo / export async function foo / export const foo / export let / export class
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  /* export const VW = 400, VH = 225  — **한 줄에 여럿**.
     앞의 정규식은 첫 이름만 잡는다. 실제로 `VH`가 이 자리에서 빠져 거짓 경고가 났다. */
  for (const m of src.matchAll(/^[ \t]*export\s+(?:const|let|var)\s+([^;]+)/gm)) {
    for (const n of m[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*=/g)) names.add(n[1]);
  }
  // export { a, b as c }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.match(/\bas\s+([A-Za-z_$][\w$]*)\s*$/);
      names.add(as ? as[1] : t.match(/^([A-Za-z_$][\w$]*)/)?.[1]);
    }
  }
  // export { a, b as c } from './x.js'   — 재수출
  for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.match(/\bas\s+([A-Za-z_$][\w$]*)\s*$/);
      names.add(as ? as[1] : t.match(/^([A-Za-z_$][\w$]*)/)?.[1]);
    }
  }
  // export * from './x.js'  — 그쪽 것을 그대로 물려받는다
  for (const m of src.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) star.push(m[1]);
  if (/^\s*export\s+default\b/m.test(src)) names.add('default');

  // 재수출 별표를 따라간다
  for (const spec of star) {
    const target = resolveSpec(abs, spec);
    if (!target) continue;
    const sub = exportsOf(target, seen);
    for (const n of sub.names) names.add(n);
  }
  names.delete(undefined);
  return { names, star };
}

function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.')) return null;               // 외부 모듈은 안 본다
  const clean = spec.split('?')[0];
  const p = resolve(dirname(fromFile), clean);
  try { statSync(p); return p; } catch { /* fallthrough */ }
  for (const ext of ['.js', '/index.js']) {
    try { statSync(p + ext); return p + ext; } catch { /* next */ }
  }
  return null;
}

const files = walk(SRC);
const cache = new Map();
const exportsCached = (f) => {
  const k = resolve(f);
  if (!cache.has(k)) cache.set(k, exportsOf(k));
  return cache.get(k);
};

const problems = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  /* import { a, b as c } from './x.js'  — 이름 있는 import만 본다.
     default·namespace(`* as`)는 이름이 없어 이 검사의 대상이 아니다. */
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const spec = m[2];
    const target = resolveSpec(file, spec);
    if (!target) {
      if (spec.startsWith('.')) {
        problems.push({ file, spec, name: null, why: '그 파일이 없다' });
      }
      continue;
    }
    const { names } = exportsCached(target);
    if (!names.size) continue;              // 읽지 못한 파일은 판단하지 않는다
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const want = t.split(/\bas\b/)[0].trim().match(/^([A-Za-z_$][\w$]*)/)?.[1];
      if (!want) continue;
      checked++;
      if (!names.has(want)) {
        problems.push({ file, spec, name: want, why: '그 이름을 내보내지 않는다' });
      }
    }
  }
}

const rel = (f) => relative(ROOT, f).replaceAll(String.fromCharCode(92), '/');
if (problems.length) {
  console.log(`✗ 없는 이름을 가져오는 자리 ${problems.length}곳 — **브라우저는 이 모듈 그래프를 통째로 거부한다**\n`);
  for (const p of problems) {
    console.log(`  ${rel(p.file)}`);
    console.log(`     ${p.name ? `'${p.name}'` : '(모듈)'} ← ${p.spec} — ${p.why}`);
  }
  console.log(`\n검사 ${files.length}개 파일 · import 이름 ${checked}개`);
  process.exit(1);
}
console.log(`검사 ${files.length}개 파일 · import 이름 ${checked}개 — 없는 이름 없음`);
