/* check-dup-decl.mjs — **화면이 검게 남는 결함**을 실행 전에 잡는다.
   ES 모듈은 같은 이름을 두 번 들이면 `SyntaxError: Identifier 'x' has already been declared`로
   **모듈이 한 줄도 안 돌고**, 그러면 `window.__game`이 안 떠 화면에 HUD 껍데기만 남는다
   (`wiki/gotchas.md` 6번). 실제로 `d71b233`에서 `js/scenes/map.js`가 `activeBounty`를
   한 import 문에 두 번 적어 게임이 통째로 안 떴다(supremacy ISSUES #39).

   병합 자국은 눈으로 잘 안 보인다 — 한 줄 안에서 이름 하나가 늘어날 뿐이라서다.
   그래서 **띄우기 전에** 이것을 돌린다.  `node tools/check-dup-decl.mjs`  (실패하면 exit 1) */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})(join(ROOT, 'js'));

let bad = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = f.slice(ROOT.length + 1).split(String.fromCharCode(92)).join('/');
  /* ① 한 import 문 안의 중복 — 병합이 가장 잘 만드는 모양 */
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    const names = m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const dup = [...new Set(names.filter((n) => names.filter((x) => x === n).length > 1))];
    if (dup.length) { console.log(`✗ ${rel} — import 중복: ${dup.join(', ')}`); bad++; }
  }
  /* ② 최상위 선언 중복(대략) — 같은 파일에 함수가 두 번 들어온 자국 */
  const decl = [...src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)|^(?:const|let|function)\s+(\w+)/gm)]
    .map((m) => m[1] || m[2]);
  const d2 = [...new Set(decl.filter((n) => decl.filter((x) => x === n).length > 1))];
  if (d2.length) { console.log(`✗ ${rel} — 최상위 선언 중복: ${d2.join(', ')}`); bad++; }
}
console.log(`검사 ${files.length}개 · ${bad ? bad + '곳 걸렸다' : '중복 없음'}`);
process.exit(bad ? 1 : 0);
