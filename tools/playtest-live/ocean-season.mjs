// ocean-season.mjs — 권역 안 항해로는 **절대 안 나오는 것** 둘을 눌러 본다
//
//   python serve.py 8891
//   node tools/playtest-live/ocean-season.mjs
//
// `nine-seas.mjs`는 권역 **안**을 돈다. 그래서 두 가지가 구조적으로 안 잡힌다:
//
//   ① **계절 창** — `seasonOf`는 120일을 반으로 갈라 여름·겨울을 준다(`state.js: YEAR=120`).
//      권역 안 항해는 열넷을 뛰어도 30~60일이라 **철이 한 번도 안 바뀐다.**
//      계절 NPC(`season: 'summer'|'winter'`)가 교대하는 자리를 못 본다.
//   ② **계절풍 통행** — `OCEAN_LANES`의 `monsoon: true` 구간은 권역과 권역 사이에만 있다.
//
// 그래서 여기서는 **원양 항로를 실제로 타고**, 왕복을 거듭해 날짜를 120일 너머로 민다.
// 창은 2번 모니터에 2×2로 넉 장만 띄운다(다른 러너가 끝난 뒤 돌린다 — 자리를 나눠 쓰지 않는다).

import { open } from '../playtest.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OCEAN_LANES, ALL_CITY_GEO } from '../../js/regions/index.js';
import { classify } from './event-signs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', '.playtest', 'nine-seas');
mkdirSync(OUT, { recursive: true });

const PORT = Number(process.env.PORT || 8891);
const CITY_NAME = Object.fromEntries(ALL_CITY_GEO.map((c) => [c.id, c.name]));
/* 창은 2번 모니터에만 — 넷이므로 2열×2행 · 960×540 (1920×1080에 꼭 맞는다) */
const W = 960, H = 540;
const MON2 = { x: 0, y: 1080 };
const at = (col, row) => ({ x: MON2.x + col * W, y: MON2.y + row * H, w: W, h: H });

/** 타 볼 원양 항로 넷 — 계절풍 둘, 아닌 것 둘 */
const LANES = [
  { a: 'sevilla', b: 'havana',     name: '플로타의 길 (세비야~아바나)', pos: at(0, 0) },
  { a: 'aden',    b: 'calicut',    name: '계절풍 (아덴~캘리컷)',        pos: at(1, 0) },
  { a: 'melaka',  b: 'guangzhou',  name: '계절풍 (믈라카~광저우)',      pos: at(0, 1) },
  { a: 'lisboa',  b: 'salvador',   name: '볼타 두 마르 (리스본~살바도르)', pos: at(1, 1) },
];

/* ★ 원양은 **화물 없이 왕복하면 수입이 0인데 항해비만 나간다.** 금고가 마르면
   출항 카드가 잠겨(`map.js: short`) 라운드가 통째로 멈춘다 — 여기서 재는 것은 경제가
   아니라 사건이므로 자금을 넉넉히 준다. */
const QUERY = 'gold=200000&crew=60&ship=carrack';
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


const OUTROWS = [];
function rec(lane, id, what, pass, note, how) {
  OUTROWS.push({ lane: lane.name, id, what, pass, note: String(note).slice(0, 300), how });
  log(`  ${lane.a}~${lane.b} ${id} ${pass === null ? 'N-A ' : pass ? 'PASS' : 'FAIL'} ${what} — ${String(note).slice(0, 120)}`);
}

async function run(lane) {
  const def = OCEAN_LANES.find((l) => (l.a === lane.a && l.b === lane.b) || (l.a === lane.b && l.b === lane.a));
  const g = await open({ port: PORT, headed: true, slow: 90, pos: lane.pos, outDir: OUT,
                         query: `start=${lane.a}&${QUERY}` });
  await g.start();

  const logHead = () => g.page.evaluate(() => {
    const l = window.__game.state.log[0]; return l ? `${l.day}|${l.text}` : '';
  });
  const logSince = (h0) => g.page.evaluate((h) => {
    const out = [];
    for (const l of window.__game.state.log) { if (`${l.day}|${l.text}` === h) break; out.push(l.text); }
    return out.reverse();
  }, h0);
  const season = () => g.page.evaluate(() => {
    const d = window.__game.state.day;
    return { day: d, season: (d % 120) < 60 ? 'summer' : 'winter',
             npcs: (window.__game.state.npcs ?? []).length };
  });

  const s0 = await g.snap();
  const hasLane = (s0.neighbors ?? []).includes(lane.b);
  rec(lane, 'TC-O1', '원양 항로가 지도에 뜬다', hasLane,
    `${lane.a}의 이웃 ${(s0.neighbors ?? []).length}곳 · ${lane.b} ${hasLane ? '있음' : '없음'}`,
    '게이트 항구에서 시작해 neighbors() 확인');
  if (!hasLane) { await g.shot(`ocean-${lane.a}-${lane.b}-noroute`); return { lane: lane.name, seen: {}, days: 0 }; }

  const seen = {};
  const marks = [];
  let here = lane.a;
  /* 왕복을 거듭해 **60일 너머**로 민다 — 계절이 바뀌는 것을 실제로 지나가야 한다.
     한 구간이 30~48일이므로 두 번만 성사돼도 경계를 넘는다. 여유 있게 열넷을 시도한다. */
  for (let i = 0; i < 14; i++) {
    const to = here === lane.a ? lane.b : lane.a;
    const before = await season();
    const h0 = await logHead();
    const r = await g.sail(to, { wait: 90000, front: false, name: CITY_NAME[to] });   // 원양은 길다
    if ((await g.snap()).scene === 'battle') {
      await g.click('발사!'); await sleep(2200);
      for (const t of ['도주', '이탈', '항구로 돌아간다', '항해를 계속한다', '버려두고 떠난다']) {
        if (await g.click(t)) { await sleep(1200); break; }
      }
      for (let k = 0; k < 4; k++) { if (!(await g.modalClick())) break; await sleep(600); }
    }
    /* ★ 원양 한 구간이 30~48일이라 **항해 한 번에 급여일이 지나간다.**
       입항하면 항구 씬이 급여일 모달을 띄우고(`port.js: enter`), 그것은 `closable:false`라
       치르기 전에는 아무 데도 못 간다 — 처리하지 않으면 다음 출항이 통째로 막힌다.
       첫 회차가 그랬다: 여덟 번 왕복하려다 한두 번에서 멈추고 37~49일에 갇혔다. */
    const pm = await g.modal();
    if (pm && /급여일/.test(pm.text)) {
      seen.payday = (seen.payday || 0) + 1;
      const btn = pm.buttons.find((b) => /치른다/.test(b)) ?? pm.buttons[0];
      log(`  ${lane.a}~${lane.b} 급여일 — "${btn}"`);
      await g.modalClick(btn);
      await sleep(1200);
      for (let k = 0; k < 3; k++) { if (!(await g.modalClick())) break; await sleep(700); }
      await g.shot(`ocean-${lane.a}-${lane.b}-payday`);
    }

    const lines = await logSince(h0);
    for (const id of [...new Set(lines.flatMap(classify))]) seen[id] = (seen[id] || 0) + 1;
    const after = await season();
    const now = await g.snap();
    marks.push({ leg: i, from: here, to, arrived: now.at === to, ...after,
                 crossed: before.season !== after.season });
    log(`  ${lane.a}~${lane.b} 왕복 ${i + 1}/14 ${here}→${to} ${now.at === to ? '도착' : '미도착'} `
      + `· ${before.day}→${after.day}일 (${after.season}) · NPC ${after.npcs}`);
    if (now.at === to) here = to;
    await sleep(800);
    if (after.day > 260) break;                 // 두 해를 넘겼으면 충분하다
  }

  const last = marks.at(-1) ?? { day: 0 };
  const crossed = marks.filter((m) => m.crossed);
  rec(lane, 'TC-O2', '원양 항해가 실제로 성립한다',
    marks.filter((m) => m.arrived).length > 0,
    `${marks.filter((m) => m.arrived).length}/${marks.length}회 도착 · ${last.day}일까지 진행 (표 일수 ${def?.days ?? '?'}일)`,
    '게이트에서 원양 상대 항구를 클릭해 왕복');
  rec(lane, 'TC-O3', '계절이 실제로 바뀐다',
    crossed.length > 0, crossed.length
      ? `${crossed.map((m) => `${m.day}일차→${m.season}`).join(' · ')}`
      : `${last.day}일까지 갔으나 철이 안 바뀌었다 (전환점 60·120일)`,
    '왕복을 거듭해 day를 밀고 seasonOf 경계를 넘긴다');
  rec(lane, 'TC-O4', '계절풍 항로 표기', def?.monsoon ? true : null,
    def?.monsoon ? `monsoon:true · 표 일수 ${def.days}일 · 위험 ${def.risk}`
                 : '계절풍 항로가 아니다 (N-A)',
    'OCEAN_LANES 정의 확인');
  const seaEv = ['wind', 'storm', 'drift', 'merchant', 'pirate'].filter((k) => seen[k]);
  rec(lane, 'TC-O5', '원양 사건 발동', seaEv.length > 0,
    seaEv.map((k) => `${k}×${seen[k]}`).join(' ') || '한 건도 안 났다',
    '원양은 길어 판정이 여러 번 굴러간다');
  rec(lane, 'TC-O6', '급여일이 실제로 온다', !!seen.payday,
    seen.payday ? `급여 정산 ${seen.payday}회` : `${last.day}일까지 급여일 화면을 못 봤다`,
    '30일마다 항구에서 치른다 — 원양 왕복이면 반드시 지나간다');

  await g.shot(`ocean-${lane.a}-${lane.b}`);
  return { lane: lane.name, a: lane.a, b: lane.b, seen, marks, days: last.day };
}

const out = await Promise.all(LANES.map(async (l) => {
  try { return await run(l); }
  catch (e) { log(`실패 ${l.name}: ${e.message}`); return { lane: l.name, error: e.message }; }
}));

writeFileSync(join(OUT, 'ocean-season.json'),
  JSON.stringify({ when: new Date().toISOString(), cases: OUTROWS, lanes: out }, null, 2), 'utf8');
log('기록 — .playtest/nine-seas/ocean-season.json');
await new Promise(() => {});
