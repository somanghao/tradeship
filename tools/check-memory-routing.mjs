/* check-memory-routing.mjs — **3-tier 메모리 라우터가 실제로 라우팅을 하는가**를 잰다.
   `memory-optimizer` 스킬 §5(검증)의 dead-pointer·콜드스타트 항목을 사람이 눈으로 세지 않게 한다.

     node tools/check-memory-routing.mjs

   재는 것 넷
     ① 트립와이어  — always-load(`claude-memory.md` ≤15KB) · `gotchas.md` ≤4KB ·
                     `QUICKMAP.md` ≤2.5KB · 도메인 파일 ≤25KB (판정은 **바이트 − 줄 수** · CRLF)
     ② dead pointer — 라우터·토픽이 가리키는 링크가 실존하나
     ③ 고아 문서    — `.claude/docs/` 안에 있는데 **아무 데서도 안 가리키는** 파일
     ④ hop 수      — 세션시작(always-load)에서 각 토픽 문서까지 몇 번 읽어야 닿나
                     (2 hop 이하가 목표: claude-memory → QUICKMAP-<도메인> → wiki/<topic>)

   ★ 판정은 **exit code가 아니라 마지막 요약 줄**로 한다(이 저장소의 규약). */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, '.claude', 'docs');

/* CRLF를 세지 않는 크기 — git이 줄끝을 바꾸므로 `wc -c`만 보면 잘못 판정한다 */
const sizeOf = (p) => {
  const b = readFileSync(p);
  const lines = b.toString('utf8').split('\n').length - 1;
  return b.length - lines;
};

const ALWAYS = join(DOCS, 'claude-memory.md');
const INDEX = join(DOCS, 'QUICKMAP.md');
const GOTCHAS = join(DOCS, 'wiki', 'gotchas.md');

/* ── 문서 전수 ─────────────────────────────────────────────── */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
const all = walk(DOCS);

/* ── 링크 뽑기 ─────────────────────────────────────────────── */
const LINK = /\[[^\]]*\]\(([^)\s#]+)(?:#[^)]*)?\)/g;
/* ★ **백틱 경로도 참조로 센다.** 이 저장소의 라우터는 `QUICKMAP.md`·`wiki/gotchas.md`처럼
   마크다운 링크가 아니라 **백틱 코드**로 다음 단계를 가리키는 자리가 많다. 사람은 그것을 읽고
   Read로 열지만, 링크만 세면 **라우터 체인이 통째로 끊긴 것처럼 보인다**(첫 실측에서 38개 중
   23개가 "못 닿는 문서"로 나왔고 `QUICKMAP.md` 자신이 고아였다). 둘 다 세야 실상이 보인다. */
const TICK = /`([^`\s]+\.md)`/g;
const links = new Map();          // 파일 → [가리키는 파일 절대경로]
const broken = [];
/** 백틱 경로는 상대·docs기준·저장소기준이 섞여 있다 — 셋을 다 시도해 실존하는 것을 쓴다 */
function resolveLoose(from, href) {
  const cands = [resolve(dirname(from), href), resolve(DOCS, href), resolve(ROOT, href),
                 resolve(DOCS, 'wiki', href)];
  return cands.find((c) => existsSync(c)) ?? cands[0];
}
for (const f of all) {
  const txt = readFileSync(f, 'utf8');
  const outs = [];
  for (const m of txt.matchAll(LINK)) {
    const href = m[1];
    if (/^(https?:|mailto:)/.test(href)) continue;
    const target = resolve(dirname(f), href);
    outs.push(target);
    if (!existsSync(target)) broken.push({ from: relative(ROOT, f), href });
  }
  /* 백틱 참조는 dead pointer로 세지 않는다 — 문장 안의 파일명 언급일 수 있다.
     라우팅(hop·고아) 판정에만 쓴다. */
  for (const m of txt.matchAll(TICK)) {
    const t = resolveLoose(f, m[1]);
    if (existsSync(t)) outs.push(t);
  }
  links.set(f, outs);
}

/* ── hop 수 — always-load에서 BFS ───────────────────────────── */
const hop = new Map([[ALWAYS, 0]]);
const q = [ALWAYS];
/* gotchas는 always-load 세트다(세션시작 필독 둘) — 0 hop으로 둔다 */
if (existsSync(GOTCHAS)) { hop.set(GOTCHAS, 0); q.push(GOTCHAS); }
while (q.length) {
  const cur = q.shift();
  for (const nx of links.get(cur) ?? []) {
    if (!existsSync(nx) || hop.has(nx)) continue;
    hop.set(nx, hop.get(cur) + 1);
    q.push(nx);
  }
}

/* 라우터를 거치지 않고 코드/다른 곳에서만 참조되는 문서도 있다 — 그건 고아가 아니다.
   여기서는 **문서 그래프 안에서 아무도 안 가리키는** 것을 고아로 본다. */
const pointed = new Set();
for (const [, outs] of links) for (const o of outs) pointed.add(o);
const orphans = all.filter((f) => f !== ALWAYS && !pointed.has(f));

/* ── 출력 ──────────────────────────────────────────────────── */
const P = (n) => n.toLocaleString('ko-KR');
const LIMITS = [
  [ALWAYS, 15360, 'always-load 라우터'],
  [GOTCHAS, 4096, '세션필독 함정'],
  [INDEX, 2560, '도메인 인덱스'],
];
let fails = 0, warns = 0;

console.log('\n# 메모리 라우팅 점검\n');
console.log('## ① 트립와이어 (바이트 − 줄 수)');
for (const [p, lim, what] of LIMITS) {
  if (!existsSync(p)) { console.log('   ⚠ 없다 — ' + relative(ROOT, p)); warns++; continue; }
  const s = sizeOf(p), ok = s <= lim;
  if (!ok) fails++;
  console.log('   ' + (ok ? '✅' : '❌') + ' ' + relative(ROOT, p).padEnd(34)
    + P(s).padStart(7) + ' / ' + P(lim) + '  ' + what
    + (ok ? '  (여유 ' + P(lim - s) + ')' : '  ★ 초과 ' + P(s - lim)));
}
for (const f of all.filter((x) => /QUICKMAP-.*\.md$/.test(x))) {
  const s = sizeOf(f), lines = readFileSync(f, 'utf8').split('\n').length;
  const ok = s <= 25600 && lines <= 200;
  if (!ok) warns++;
  console.log('   ' + (ok ? '✅' : '⚠') + ' ' + relative(ROOT, f).padEnd(34)
    + P(s).padStart(7) + ' / 25,600 · ' + lines + '줄 / 200');
}

console.log('\n## ② dead pointer');
if (!broken.length) console.log('   ✅ 0건');
else { fails += broken.length; for (const b of broken) console.log('   ❌ ' + b.from + ' → ' + b.href); }

console.log('\n## ③ 고아 문서 — 문서 그래프에서 아무도 안 가리킨다');
if (!orphans.length) console.log('   ✅ 0건');
else {
  for (const o of orphans) {
    const s = sizeOf(o);
    console.log('   ⚠ ' + relative(ROOT, o).padEnd(46) + P(s).padStart(8) + 'B');
    warns++;
  }
}

console.log('\n## ④ hop — 세션시작에서 몇 번 읽어야 닿나');
const byHop = {};
for (const [f, h] of hop) (byHop[h] ??= []).push(relative(ROOT, f));
for (const h of Object.keys(byHop).sort()) {
  console.log('   ' + h + ' hop  ' + byHop[h].length + '개' + (h <= 2 ? '' : '  ⚠ 깊다'));
  if (h > 2) for (const f of byHop[h]) console.log('        ' + f);
}
const unreached = all.filter((f) => !hop.has(f));
if (unreached.length) {
  console.log('   ★ 라우터에서 못 닿는 문서 ' + unreached.length + '개:');
  for (const f of unreached) console.log('        ' + relative(ROOT, f) + '  ' + P(sizeOf(f)) + 'B');
  warns += unreached.length;
}

console.log('\n라우팅 — ' + (fails ? '실패 ' + fails + '건' : '규칙 통과')
  + ' · 경고 ' + warns + '건 · 문서 ' + all.length + '개 · 라우터에서 닿는 것 ' + hop.size + '개');
process.exit(fails ? 1 : 0);
