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

/* ★★ **검사기·하네스도 규칙을 쓴다.** 처음엔 `tools/`를 안 봤는데, 그러면 `test-rules`가
   테스트하는 함수와 `check-*`가 대조하는 함수가 통째로 「아무도 안 쓴다」로 나온다 —
   실측(회차 30): 죽은 코드로 보고된 13건 중 **7건이 검사기가 쓰는 것**이었다
   (`atWar`·`crewAfterLoss`·`isOceanGate`·`chainMargin`·`enrolled`·`salvageValue`·`YEAR_DAYS`).
   ⇒ 그 자리를 따로 세어 **「검사기만 쓴다」**로 가른다. 죽은 코드와는 다른 것이다:
     검사기가 쓴다는 것은 **규칙이 지켜지는지 재고 있다**는 뜻이지 게임이 안 쓴다는 뜻이 아니다.
   ⚠️ `.playtest/`는 안 본다 — 회차마다 생기고 지워지는 자리라, 거기서만 쓰이는 것은
     「하네스 전용」이고 그것은 정말로 게임이 안 쓰는 것이다. */
const TOOL_FILES = (() => {
  try { return readdirSync(join(ROOT, 'tools')).filter((f) => f.endsWith('.mjs')).map((f) => 'tools/' + f); }
  catch { return []; }
})();

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
const stateSrcRaw = read('js/state.js');
const uiTok = tokensOf(UI_FILES);
const otherTok = tokensOf(OTHER_FILES);

/* ★★★ **`state.js`가 자기 안에서 쓰는 것도 세야 한다.** 처음엔 자기 자신을 아예 뺐는데,
   그러면 「규칙이 규칙을 부르고 화면은 그 *상위* 함수를 부르는」 정상 구조가 통째로
   「아무도 안 쓴다」로 나온다 — 실측(회차 30): `priceTips`·`routeTips`는 `buyService`가 부르고
   화면은 그 반환의 `r.tips`를 그린다(port.js 2381~2389). 정보상이 파는 것이 바로 그것이다.
   `backerSlain`도 `recordSlain` 안에서 불린다. 셋 다 「죽은 코드」로 보고됐지만 **살아 있었다.**
   ⇒ 자기 호출을 세면 남는 것이 진짜 **아무도 안 부르는 것**이 된다. */
const toolTok = tokensOf(TOOL_FILES);

const selfTok = (() => {
  /* 정의 줄(`export function NAME(`)은 빼야 한다 — 안 그러면 모든 이름이 자기 자신을 부른 셈이 된다 */
  const body = strip(stateSrcRaw).replace(/^export\s+(?:async\s+)?function\s+[A-Za-z_$][A-Za-z0-9_$]*/gm, ' ')
                                 .replace(/^export\s+(?:const|let)\s+[A-Za-z_$][A-Za-z0-9_$]*/gm, ' ');
  return new Set(body.match(IDENT) || []);
})();

/* ── state.js가 내보내는 이름 ─────────────────────────────── */
const stateSrc = stateSrcRaw;
const names = [];
for (const m of stateSrc.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)) names.push(m[1]);
for (const m of stateSrc.matchAll(/^export\s+(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)) names.push(m[1]);

const SKIP = new Set(['state']);          // 통째로 도는 것은 이름으로 세면 늘 참이다

/* ★★ **판정이 끝난 것은 다시 묻지 않는다.** 이 도구는 「화면이 그 *함수를* 부르나」만 볼 수 있고,
   화면이 **파생 함수나 `state` 값으로** 같은 사실을 보여주는 경우를 구별하지 못한다. 그대로 두면
   회차마다 같은 열네 건이 다시 떠서 **진짜 신규가 그 속에 묻힌다** — 경고가 소음이 되는 순간
   아무도 안 본다(이 저장소가 여러 번 겪은 실패의 모양이다).
   ⇒ 사람이 한 번 판정한 것은 여기 적고 **왜 괜찮은지**를 남긴다. 새로 뜬 것만 경고가 된다.
   ⚠️ 이 표에 넣는 것은 **화면이 그 사실을 다른 경로로 말한다**를 확인했을 때만이다.
      「아직 안 붙였다」를 여기 넣으면 그 부채가 영영 안 보인다. */
const REVIEWED = new Map([
  ['book',          '장부 기록기 — 화면은 `ledgerTotal`·급여일 장부로 읽는다'],
  ['addShock',      '사건 발생기(world) — 화면은 `activeShocks`를 읽는다'],
  ['guildFlowOf',   '상단 물동량 — `js/npc/guild.js`만 부른다(정의 옆 주석에 명시)'],
  ['addGuildFlow',  '위와 같다 — 상단이 붓고 사가는 자리'],
  ['marketDepth',   '시장 깊이 — 화면은 값(`costFor`·`gainFor`)과 「시장 깊이」 문구로 말한다'],
  ['addPressure',   '충격 누적기 — 화면은 `impactFactor`가 반영된 값으로 본다'],
  ['baseTariff',    '입항세 원값 — 화면은 `tariffRate`·`tariffScale`로 말한다'],
  ['stirSeen',      '세력 소란 — 회차 29에 `addRegard`에 얹었고 화면은 `state.regardWhy`를 읽는다'],
  ['routeRisk',     '항로 요율 — 화면은 `routeDangerLabel`로 말한다'],
  ['rosterKey',     '명부 키 생성 — 내부 식별자다'],
  ['infamyOf',      '악명 — 화면은 `infamyHere`를 읽는다'],
  ['setRetireHook', '주입 훅 — `world.js`가 `state`에 꽂는다(순환 참조 방지)'],
  ['setWorldHook',  '위와 같다'],
  ['inSeason',      '계절 판정 — 화면은 `routeSeasonLabel`·`seasonOf`로 말한다'],
  /* ★ 아래는 성격이 다르다 — **아직 아무도 안 부르지만 남겨 두기로 판정한 것**이다.
     지우면 나중에 그 일을 할 때 `state`를 직접 만지게 되는데, 이 저장소는 그것을 막는다. */
  ['setCaptain',    '동행선의 선장을 바꾸는 **유일한 안전한 문**. 지금은 `setConsort`가 자동으로 '
                    + '앉히고(고를 것이 없어 화면을 안 늘렸다) 아무도 안 부르지만, 선장을 고르게 '
                    + '할 때 여기로 들어온다 — 지우면 그때 `state.consorts`를 직접 만지게 된다'],
]);

const orphanUI = [], orphanAll = [], reviewed = [], indirect = [], tested = [];
for (const n of names) {
  if (SKIP.has(n)) continue;
  if (uiTok.has(n)) continue;                    // 화면이 직접 부른다 — 볼 것 없다
  if (REVIEWED.has(n)) { reviewed.push(n); continue; }
  if (otherTok.has(n)) { orphanUI.push(n); continue; }   // 규칙·세계는 쓰는데 화면만 안 쓴다
  if (selfTok.has(n)) { indirect.push(n); continue; }    // `state.js` 안에서 상위 함수가 쓴다
  if (toolTok.has(n)) { tested.push(n); continue; }      // 검사기가 그 규칙을 재고 있다
  orphanAll.push(n);                             // 아무 데도 없다 — 진짜 죽은 것
}
/* 판정표가 낡는 것도 막는다 — 화면이 부르게 된 이름이 표에 남아 있으면 알려 준다 */
const staleReviewed = [...REVIEWED.keys()].filter((n) => uiTok.has(n));

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
if (indirect.length) {
  /* 화면이 이름을 안 부르지만 `state.js` 안의 상위 함수가 쓴다 — 대개 정상이다.
     그래도 세어 둔다: 상위 함수마저 화면에 안 닿으면 사슬 통째로 죽어 있을 수 있다. */
  console.log('· 규칙 안에서만 쓰인다(상위 함수가 부른다) — ' + indirect.length + '개');
  if (process.argv.includes('--all')) console.log('   ' + indirect.join(' · '));
  console.log('');
}
if (tested.length) {
  console.log('· 검사기가 재고 있다(게임 화면은 안 부른다) — ' + tested.length + '개');
  if (process.argv.includes('--all')) console.log('   ' + tested.join(' · '));
  console.log('');
}
if (reviewed.length) {
  console.log('✅ 판정 끝 — ' + reviewed.length + '개(화면이 파생 함수나 `state` 값으로 말한다)');
  if (process.argv.includes('--reviewed')) {
    for (const n of reviewed) console.log('   ' + n.padEnd(16) + REVIEWED.get(n));
  } else {
    console.log('   ' + reviewed.join(' · ') + '   (--reviewed 로 이유를 편다)');
  }
  console.log('');
}
if (staleReviewed.length) {
  console.log('⚠️  판정표가 낡았다 — 화면이 이제 직접 부른다: ' + staleReviewed.join(' · '));
  console.log('   `REVIEWED`에서 빼도 된다.\n');
}
if (!orphanAll.length && !orphanUI.length) console.log('구멍 없음 — 내보낸 규칙이 전부 화면에 닿거나 판정이 끝났다');
else console.log('⚠️ 경고만이다(exit 0) — 규칙을 먼저 세우고 화면을 뒤에 붙이는 순서를 막지 않는다.');

if (process.argv.includes('--all')) {
  console.log('\n※ `tools/`·`.playtest/`는 안 본다 — 하네스만 쓰는 규칙은 「화면이 안 쓴다」가 맞다.');
}
