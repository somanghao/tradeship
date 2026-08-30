// probe-houses.mjs — **상단의 흥망이 실제로 도는가** (회차 26 · 인수·합병·파산)
//
// 설계 정본 `.playtest/round-26/C-DESIGN.md`. 회차 25가 상단 49곳을 세웠고 이 회차가
// **서로 먹고 먹히는 층**을 얹었다. 「넣었다」와 「돈다」는 다른 문장이라 **결과를 직접 센다** —
// 소문 줄이 아니라 `state.guilds`의 `dead`·`by`·`seats`·`lost`를 센다
// (`probe-guild.mjs`가 세운 규약 그대로).
//
// 이 도구가 답하는 것:
//   ① **사다리가 살아 있나** — 선단 6·세기 5가 전부는 아닌가 (손대기 전에는 두 해면 49/49였다)
//   ② **흥망이 도나** — 문 닫은 곳 · 인수 · 합병 · 넘어간 상관 · 바다에서 잃은 항차
//   ③ **서열이 바뀌나** — 처음 상위 10과 끝 상위 10이 몇 자리 갈렸나
//   ④ ⚠️ **바다가 비지 않나** — 바다마다 살아 있는 상단 ≥ `GUILD.minHouses`
//   ⑤ ⚠️ **상관이 빈 항구가 없나** — 문 닫은 상단의 상관에 반드시 임자가 있어야 한다
//
//   node tools/probe-houses.mjs [시드수] [세계일수]
//
// ★ 여러 시드의 중앙값이다(1회 실행 금지 — 프로젝트 규약).

import { state, resetGame } from '../js/state.js';
import { initWorld, worldTick } from '../js/world.js';
import {
  guildRank, guildHistory, guildsAtCity, liveHouses, worthOf, seatsOf,
} from '../js/npc/guild.js';
import { HOUSES } from '../js/npc/houses.js';
import { GUILD } from '../js/data.js';

const N = +(process.argv[2] || 6);
const DAYS = +(process.argv[3] || 1440);
const MARKS = [360, 720, 1080, 1440, 2160, 2880].filter((m) => m <= DAYS);
if (!MARKS.length) MARKS.push(DAYS);

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const won = (n) => Math.round(n).toLocaleString('en-US');
const pad = (s, n) => String(s).padEnd(n);

const REGIONS = [...new Set(HOUSES.map((h) => h.region))];

const snaps = MARKS.map(() => []);
const finals = [];
for (let s = 0; s < N; s++) {
  resetGame();
  initWorld();
  let d = 0;
  const first = null;
  let top0 = null;
  for (let mi = 0; mi < MARKS.length; mi++) {
    /* ⚠️ **날을 함께 민다.** 게임은 `advanceDays` 뒤에 `worldTick`을 부르므로 `state.day`가
       같이 오른다 — 프로브가 그걸 빼먹으면 사건·시세·재기가 전부 얼어붙는다(실제로 겪었다). */
    while (d < MARKS[mi]) { state.day++; worldTick(1); d++; if (d === 1) top0 = guildRank().slice(0, 10).map((x) => x.id); }
    const rk = guildRank();
    const H = guildHistory();
    const top = rk.slice(0, 10).map((x) => x.id);
    const moved = top.filter((id, i) => top0[i] !== id).length;
    const wp = Object.values(state.guilds).filter((g) => !g.dead)
      .map((g) => worthOf(g) / Math.max(1, g.peak ?? g.cap0));
    snaps[mi].push({
      live: H.live, dead: H.dead, took: H.took, seats: H.seatsMoved, lost: H.lost,
      f6: rk.filter((x) => x.fleet === 6).length, m5: rk.filter((x) => x.might === 5).length,
      moved, capMed: med(rk.map((x) => x.cap)),
      ratioMed: med(rk.map((x) => x.cap / Math.max(1, x.cap0))),
      wpLow: Math.min(...wp),
      thin: REGIONS.filter((r) => liveHouses().filter((h) => h.region === r).length < GUILD.minHouses).length,
    });
  }
  void first;
  /* ⑤ 상관이 빈 항구 — 문 닫은 상단의 명부 상관에 임자가 있는가 */
  const orphan = [];
  for (const h of HOUSES) {
    if (!state.guilds[h.id]?.dead) continue;
    for (const c of (h.seats ?? [])) if (!guildsAtCity(c).length) orphan.push(`${h.name}→${c}`);
  }
  const H = guildHistory();
  finals.push({ orphan, rows: H.rows, paid: H.paid });
}

console.log(`상단 ${HOUSES.length}곳 · ${N}시드 × 세계 ${DAYS}일 (중앙값)`);
console.log(`결산 ${GUILD.bookDays}일·장부 ${GUILD.capKeep}배·배당 ${GUILD.payout} · 부실 장부가의 ${GUILD.bustAt}`
          + ` ${GUILD.bustDays}일 · 합병 ${GUILD.mergeCheckDays}일마다 ${GUILD.mergeRatio}배`
          + ` · 바다별 하한 ${GUILD.minHouses}곳\n`);

console.log(pad('세계일수', 9) + pad('살아', 6) + pad('문닫음', 7) + pad('상관이동', 9) + pad('잃은항차', 9)
          + pad('선단6', 7) + pad('세기5', 7) + pad('상위10 교체', 12) + pad('cap/cap0', 10) + '최저 자산/장부');
console.log('─'.repeat(92));
for (let i = 0; i < MARKS.length; i++) {
  const g = snaps[i];
  console.log(pad(MARKS[i] + '일', 9)
    + pad(med(g.map((x) => x.live)), 6)
    + pad(med(g.map((x) => x.dead)), 7)
    + pad(med(g.map((x) => x.seats)), 9)
    + pad(med(g.map((x) => x.lost)), 9)
    + pad(`${med(g.map((x) => x.f6))}/49`, 7)
    + pad(`${med(g.map((x) => x.m5))}/49`, 7)
    + pad(`${med(g.map((x) => x.moved))}/10`, 12)
    + pad(med(g.map((x) => x.ratioMed)).toFixed(1), 10)
    + med(g.map((x) => x.wpLow)).toFixed(2));
}

const last = snaps[snaps.length - 1];
const dead = med(last.map((x) => x.dead));
const seats = med(last.map((x) => x.seats));
const moved = med(last.map((x) => x.moved));
const f6 = med(last.map((x) => x.f6));
const thin = Math.max(...last.map((x) => x.thin));
const orphans = finals.reduce((a, f) => a + f.orphan.length, 0);

console.log('\n판정');
const line = (ok, txt) => console.log(`  ${ok ? '✅' : '⛔'} ${txt}`);
line(dead >= 1, `문을 닫은 상단 ${dead}곳 (밴드 ≥1) — 인수·합병이 실제로 났다`);
line(seats >= 3, `임자가 바뀐 상관 ${seats}곳 (밴드 ≥3)`);
line(moved >= 3, `상위 10 서열이 ${moved}자리 갈렸다 (밴드 ≥3)`);
line(f6 < HOUSES.length, `선단 6이 ${f6}/${HOUSES.length}곳 — 사다리가 천장에 안 눌어붙었다`
  + (f6 >= HOUSES.length ? ' ⛔ 전부 천장이다' : ''));
line(thin === 0, `바다별 하한(${GUILD.minHouses}곳)을 밑돈 바다 ${thin}개`);
line(orphans === 0, `상관이 빈 항구 ${orphans}곳 — 문을 닫아도 임자가 생긴다`);

const F = finals[0];
const gone = F.rows.filter((r) => r.dead).slice(0, 8);
if (gone.length) {
  console.log('\n첫 시드에서 문을 닫은 곳 (← 넘겨받은 상단)');
  for (const r of gone) console.log(`  ${pad(r.name, 26)} ← ${r.by ?? '?'}  (${r.dead}일차 · 상관 ${r.seats}곳 · 잃은 항차 ${r.lost})`);
}
const grew = [...F.rows].filter((r) => !r.dead).sort((a, b) => b.took - a.took).slice(0, 5);
if (grew.length && grew[0].took) {
  console.log('\n첫 시드에서 남을 삼킨 곳');
  for (const r of grew) if (r.took) console.log(`  ${pad(r.name, 26)} ${r.took}곳을 삼켰다 · 지금 상관 ${r.seats}곳 · 자본 ${won(r.cap)}닢`);
}
console.log(`\n첫 시드 배당(세계 밖으로 나간 이익) ${won(F.paid)}닢 — 자본이 무한히 안 쌓이게 하는 자리다.`);
void seatsOf;
