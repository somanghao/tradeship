// check-architecture.mjs — 오버뷰 탭의 계층 트리가 실제 파일과 맞는가
//
// 구조 설명은 문서로 두면 **조용히 낡는다.** 파일을 하나 추가하고 트리에 안 적으면
// 오버뷰 탭은 계속 옛 구조를 보여주고, 아무도 그것을 모른다.
// 그래서 기계가 지키게 한다 — 근거 JSON을 `check-evidence.mjs`가 지키는 것과 같은 꼴이다.
//
//   실패: 트리에 적힌 파일이 없다(유령) · 실제 파일이 트리에 없다(누락) · 중복
//   경고: 설명이 너무 짧다

import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LAYERS, allFiles, RUNTIME, STATE_FIELDS } from '../dashboard/architecture.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const problems = [];
const softs = [];
const bad = (kind, where, msg) => problems.push({ kind, where, msg });
const soft = (kind, where, msg) => softs.push({ kind, where, msg });

/* 트리가 관장하는 폴더. 여기 있는 소스는 전부 트리에 적혀 있어야 한다. */
const WATCH = [
  { dir: 'js', ext: ['.js'] },
  { dir: 'dashboard', ext: ['.js', '.mjs', '.html'] },
  { dir: 'tools', ext: ['.mjs', '.py'] },
  { dir: 'content', ext: ['.json'] },
];

/** 폴더를 훑어 실제 소스 파일 목록을 만든다 */
function walk(dir, exts, out = []) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) { walk(join(dir, name), exts, out); continue; }
    if (exts.some((e) => name.endsWith(e))) out.push(relative(ROOT, p).replace(/\\/g, '/'));
  }
  return out;
}

const listed = allFiles();
const listedSet = new Set(listed);

// 중복
const seen = new Set();
for (const f of listed) {
  if (seen.has(f)) bad('중복', f, '트리에 두 번 적혀 있다');
  seen.add(f);
}

// 유령 — 트리에 있는데 파일이 없다
for (const f of listed) {
  if (!existsSync(join(ROOT, f))) bad('유령', f, '트리에 적혀 있는데 파일이 없다');
}

// 누락 — 파일이 있는데 트리에 없다
const actual = WATCH.flatMap((w) => walk(w.dir, w.ext));
for (const f of actual) {
  if (!listedSet.has(f)) {
    bad('누락', f, '파일이 있는데 계층 트리(dashboard/architecture.mjs)에 없다');
  }
}

// 설명 품질
for (const l of LAYERS) {
  if (!l.what || l.what.length < 20) soft('짧은설명', l.name, '계층 설명이 너무 짧다');
  for (const [p, d] of l.files) {
    if (!d || d.length < 6) soft('짧은설명', p, '파일 설명이 너무 짧다');
  }
}

/* ── 상태 필드 대조 ────────────────────────────────────────────
   `state`의 실제 키가 트리 문서와 맞는가. 필드를 추가하고 여기 안 적으면
   세이브/로드를 넣을 때 그 필드만 조용히 빠진다 — 그게 이 검사의 목적이다. */
const { state, resetGame } = await import('../js/state.js');
resetGame();
const realKeys = Object.keys(state);
// 문서는 'hp / maxHp'처럼 묶어 적으므로 슬래시로 갈라 편다
const docKeys = new Set(STATE_FIELDS.flatMap((f) => f.k.split('/').map((s) => s.trim())));
for (const k of realKeys) {
  if (!docKeys.has(k)) bad('상태누락', `state.${k}`, '상태에 있는데 STATE_FIELDS에 없다');
}
for (const k of docKeys) {
  if (!realKeys.includes(k)) bad('상태유령', `state.${k}`, 'STATE_FIELDS에 있는데 상태에 없다');
}

/* ── 출력 ─────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
console.log('\n=== 아키텍처 트리 점검 ===');
console.log(`계층 ${LAYERS.length} · 파일 ${listed.length} · 상태 필드 ${realKeys.length}`
  + ` · 동적 생성물 ${RUNTIME.reduce((n, g) => n + g.rows.length, 0)}종`);
for (const l of LAYERS) console.log(`  ${pad(l.name, 18)} ${l.files.length}개`);

const show = (list) => { for (const p of list) console.log(`  [${pad(p.kind, 6)}] ${pad(p.where, 34)} ${p.msg}`); };
if (softs.length) { console.log(`\n경고 ${softs.length}건 (실패는 아니다):`); show(softs); }
if (!problems.length) {
  console.log('\n문제 없음 — 트리와 실제 파일·상태가 맞물려 있다.\n');
  process.exit(0);
}
console.log(`\n문제 ${problems.length}건:`);
show(problems);
console.log('');
process.exit(1);
