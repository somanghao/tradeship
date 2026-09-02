#!/usr/bin/env node
/* check-orphan-rules — **규칙이 서 있는데 화면이 한 번도 말하지 않는 자리**를 찾는다.

   ★ 이 프로젝트가 세 회차 연속 밟은 함정이다(회차 28·29 · `UNIMPLEMENTED.md` 손대는 순서 6번):
     규칙 트랙이 `state.js`에 값을 세우고 커밋하면, 화면 트랙은 **그 회차의 신규만** 훑는다.
     그래서 「규칙은 멀쩡한데 화면이 말하지 않아 수백 일을 잃는다」가 반복됐다.
     ⇒ 최근 N회차가 아니라 **export 전수**를 기계로 대조한다.

   방법 — `js/state.js`가 내보내는 이름 전부를 뽑아, **화면 쪽 파일**에서 참조되는지 본다.
     화면 = `js/scenes/**` · `js/ui.js` · `js/payday.js` · `js/main.js` · `js/factions.js` · `js/save.js`
     ⚠️ **경고만 낸다(exit 0)** — 「쓰이지 않는다」는 규칙일 뿐 코드와 근거의 불일치가 아니고,
       콘텐츠·규칙을 먼저 넣고 화면을 뒤에 붙이는 이 프로젝트의 순서를 막으면 안 된다
       (`claude-memory.md` 절대 원칙: 검증 스크립트가 콘텐츠를 억제하면 안 된다).

   ★ **이름은 정규식이 아니라 토큰 집합으로 센다.** 처음엔 이름마다 `new RegExp('\\b'+n+'\\b')`를
     만들었는데 셸을 거치며 백슬래시가 반으로 줄어 `\b`(백스페이스)가 됐고 — 아무것도 매치되지
     않아 **425개 중 424개가 「안 쓰인다」로 나왔다**. 조용한 실패의 전형이라 아예 방식을 바꿨다:
     소스를 식별자로 쪼개 `Set`에 담고 `has()`로 묻는다. 빠르고, 이스케이프가 없다.

   쓰기 — `node tools/check-orphan-rules.mjs [--all]` */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function walk(dir, out = []) {
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = dir + '/' + f;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (f.endsWith('.js')) out.push(rel);
  }
  return out;
}

/* 화면 = 사람이 보는 것을 그리는 파일. `save.js`는 그림은 아니지만 **판을 담는 곳**이라
   여기 둔다 — 세이브에 안 담기는 규칙은 화면에 있어도 다음 판에 사라진다. */
const UI_FILES = [...walk('js/scenes'), 'js/ui.js', 'js/payday.js', 'js/main.js', 'js/factions.js', 'js/save.js'];
const OTHER_FILES = walk('js').filter((f) => !UI_FILES.includes(f) && f !== 'js/state.js');

const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/g;
/* ★ **주석은 걷어낸다.** 이 저장소는 주석에 함수 이름을 아주 많이 적는다(설계 경위를 코드 옆에
   남기는 것이 규약이다). 주석을 그대로 세면 「`js/data.js`가 `routeRisk`를 쓴다」 같은
   오탐이 무더기로 나오고, 그러면 이 도구 자체가 거짓 신호가 된다 — 그것이 이 프로젝트가
   가장 비싸게 치른 실패의 모양이다(`wiki/gotchas.md`). */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const tokensOf = (files) => {
  const set = new Set();
  for (const f of files) for (const t of strip(read(f)).match(IDENT) || []) set.add(t);
  return set;
};
const uiTok = tokensOf(UI_FILES);
const otherTok = tokensOf(OTHER_FILES);

/* ── state.js가 내보내는 이름 ─────────────────────────────── */
const stateSrc = read('js/state.js');
const names = [];
for (const m of stateSrc.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)) names.push(m[1]);
for (const m of stateSrc.matchAll(/^export\s+(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)) names.push(m[1]);

const SKIP = new Set(['state']);          // 통째로 도는 것은 이름으로 세면 늘 참이다

const orphanUI = [], orphanAll = [];
for (const n of names) {
  if (SKIP.has(n)) continue;
  const inUI = uiTok.has(n), inOther = otherTok.has(n);
  if (!inUI && !inOther) orphanAll.push(n);
  else if (!inUI) orphanUI.push(n);
}

const whereOf = (n) => OTHER_FILES.find((f) => (strip(read(f)).match(IDENT) || []).includes(n)) ?? '';

console.log('state.js export ' + names.length + '개 · 화면 파일 ' + UI_FILES.length + '개를 본다\n');
if (orphanAll.length) {
  console.log('⚠️  어디서도 안 쓰인다 — ' + orphanAll.length + '개');
  console.log('   ' + orphanAll.join(' · ') + '\n');
}
if (orphanUI.length) {
  console.log('⚠️  규칙은 서 있는데 **화면이 말하지 않는다** — ' + orphanUI.length + '개');
  for (const n of orphanUI) console.log('   ' + n.padEnd(26) + whereOf(n));
  console.log('');
}
if (!orphanAll.length && !orphanUI.length) console.log('구멍 없음 — 내보낸 규칙이 전부 화면에 닿는다');
else console.log('⚠️ 경고만이다(exit 0) — 규칙을 먼저 세우고 화면을 뒤에 붙이는 순서를 막지 않는다.');

if (process.argv.includes('--all')) {
  console.log('\n※ `tools/`·`.playtest/`는 안 본다 — 하네스만 쓰는 규칙은 「화면이 안 쓴다」가 맞다.');
}
