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
  /* ★ **주석을 지우고 본다**(회차 23에 고침). `export` 쪽은 진작 `stripComments`를 지나는데
     **`import` 쪽만 날 소스를 봤다.** 그래서 *주석 안에 적어 둔 import 예시*를 진짜 import로 읽어,
     `js/state.js`의 안내문 한 줄(``import { capEncounterLoss } from '../state.js'``로 갈아 끼우면
     끝난다)이 **「그 파일이 없다」 실패**를 냈다. ⚠️ 회차 22 뒤로 이 검사는 계속 exit 1이었고,
     그동안 **진짜 깨진 import가 들어와도 구별할 수 없었다** — 늘 빨간 검사는 꺼진 검사와 같다.
     ⓘ 이 도구가 지키는 것이 *"`check-*`가 다 통과해도 게임은 안 뜬다"*는 자리라 더더욱 그렇다. */
  const src = stripComments(readFileSync(file, 'utf8'));
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

/* ── ★ 문법이 깨진 파일 — **같은 증상, 더 싼 원인** ────────────────────────
   2026-08-27에 `js/main.js`의 템플릿 문자열 안에 진짜 줄바꿈이 들어가 게임이 통째로 안 떴다
   (`SyntaxError: Invalid or unexpected token`). **`check-*` 열일곱이 전부 통과했다** —
   이 도구조차 import 이름만 보고 파싱은 안 했기 때문이다. 잡은 것은 헤드리스 스모크뿐이었다.
   ⇒ `node --check`와 같은 판정을 여기서 한다. 브라우저를 안 띄우고도 잡히는 자리다. */
let syntaxBad = 0;
{
  const { execFileSync } = await import('node:child_process');
  const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  /* ⚠️ **`node --check <파일>.js`는 ESM을 조용히 통과시킨다.** `import`가 보이면 CJS 파싱을
     건너뛰고 그대로 exit 0을 낸다 — 일부러 깨뜨려 확인했다(`const y = ;`가 통과했다).
     확장자가 `.mjs`면 제대로 파싱한다. 그래서 **내용을 임시 `.mjs`로 옮겨** 검사한다.
     `--check`는 import를 **해석하지 않으므로** 없는 경로를 가져와도 상관없다(그건 위에서 본다). */
  const dir = mkdtempSync(join(tmpdir(), 'tradeship-syntax-'));
  try {
    for (const file of files) {
      const tmp = join(dir, 'probe.mjs');
      writeFileSync(tmp, readFileSync(file, 'utf8'));
      try {
        execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
      } catch (e) {
        syntaxBad++;
        problems.push({ file, spec: '(문법)', name: null,
          why: String(e.stderr ?? e.message).split(String.fromCharCode(10))
            .filter(Boolean).slice(0, 3).join(' / ') });
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
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
console.log(`검사 ${files.length}개 파일 · import 이름 ${checked}개 — 없는 이름 없음 · 문법 오류 ${syntaxBad}건`);
