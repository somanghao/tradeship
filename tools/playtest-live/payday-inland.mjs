// payday-inland.mjs — 아홉 창 러너가 **구조적으로 못 보는 것** 둘을 집중해서 눌러 본다
//
//   python serve.py 8891
//   node tools/playtest-live/payday-inland.mjs
//
// ① **급여일** — 30일마다 항구에서 온다(`state.js: paydayDue` → `scenes/port.js: enter`).
//    아홉 창 러너는 열넷을 뛰어 22~34일에서 끝나 급여일 화면을 한 번도 못 봤다.
//    돈이 넉넉한 판과 **모자란 판**을 나란히 굴려 체불·이탈까지 본다 — 못 주는 쪽이 본론이다.
// ② **육로·내해 사건** — `INLAND_ODDS`가 0.12라 그 구간을 두 번 타서는 77%가 무사통과다.
//    "안 났다"는 결함이 아니라 **표본 부족**이므로, 육로만 스물다섯 번 탄다(무사통과 4%).
//
// 창 넷을 2번 모니터에 2×2로 놓는다. 원양 라운드와 **같이 띄우지 않는다** — 자리가 겹친다.

import { open } from '../playtest.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_ROUTES, ALL_ROUTE_RISK, citiesOfRegion } from '../../js/regions/index.js';
import { classify } from './event-signs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', '.playtest', 'nine-seas');
mkdirSync(OUT, { recursive: true });

const PORT = Number(process.env.PORT || 8891);
/* 창은 2번 모니터에만 — 넷이므로 2열×2행 · 960×540 */
const MON2 = { x: 0, y: 1080 };
const at = (col, row) => ({ x: MON2.x + col * 960, y: MON2.y + row * 540, w: 960, h: 540 });

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROWS = [];
function rec(tag, id, what, pass, note, how) {
  ROWS.push({ tag, id, what, pass, note: String(note).slice(0, 300), how });
  log(`  ${tag} ${id} ${pass === null ? 'N-A ' : pass ? 'PASS' : 'FAIL'} ${what} — ${String(note).slice(0, 130)}`);
}

const hooks = (g) => ({
  logHead: () => g.page.evaluate(() => {
    const l = window.__game.state.log[0]; return l ? `${l.day}|${l.text}` : '';
  }),
  logSince: (h0) => g.page.evaluate((h) => {
    const out = [];
    for (const l of window.__game.state.log) { if (`${l.day}|${l.text}` === h) break; out.push(l.text); }
    return out.reverse();
  }, h0),
  pay: () => g.page.evaluate(() => ({
    ...window.__game.state.payroll, day: window.__game.state.day,
    gold: window.__game.state.gold, crew: window.__game.state.crew,
    cargo: Object.values(window.__game.state.cargo || {}).reduce((a, b) => a + b, 0),
  })),
});

/* ── ① 급여일 ────────────────────────────────────────────────── */
async function paydayRun({ tag, port, query, pos, expectShort }) {
  const g = await open({ port: PORT, headed: true, slow: 90, pos, outDir: OUT,
                         query: `start=${port}&${query}` });
  await g.start();
  const H = hooks(g);
  const seen = {};
  let sawModal = false, settled = false, before = null, after = null;

  for (let i = 0; i < 22; i++) {
    const s = await g.snap();
    const nb = (s.neighbors || []).filter((x) => x !== s.at);
    if (!nb.length) break;
    const h0 = await H.logHead();
    await g.sail(nb[Math.floor(Math.random() * nb.length)], { wait: 30000, front: false });

    // 전투로 빠지면 도주해 돌아온다 — 여기서 보려는 것은 전투가 아니다
    if ((await g.snap()).scene === 'battle') {
      for (const t of ['도주', '이탈', '항구로 돌아간다', '항해를 계속한다', '버려두고 떠난다']) {
        if (await g.click(t)) { await sleep(1200); break; }
      }
      for (let k = 0; k < 4; k++) { if (!(await g.modalClick())) break; await sleep(600); }
    }

    /* ★ 입항하면 항구 씬이 급여일 모달을 띄운다. 그것이 떴는지 **제목으로** 확인한다. */
    const m = await g.modal();
    if (m && /급여일/.test(m.text)) {
      sawModal = true;
      before = await H.pay();
      await g.shot(`payday-${tag}-modal`);
      const btn = m.buttons.find((b) => /치른다/.test(b)) ?? m.buttons[0];
      await g.modalClick(btn);
      await sleep(1200);
      // 정산 결과 모달('알겠다')을 닫는다
      for (let k = 0; k < 3; k++) { if (!(await g.modalClick())) break; await sleep(700); }
      after = await H.pay();
      settled = after.nextDue > before.nextDue;
      log(`  ${tag} 급여일 — 청구 전 due ${before.due}/체불 ${before.arrears} → 후 due ${after.due}/체불 ${after.arrears} · nextDue ${before.nextDue}→${after.nextDue}`);
    }

    for (const id of [...new Set((await H.logSince(h0)).flatMap(classify))]) seen[id] = (seen[id] || 0) + 1;
    const now = await H.pay();
    if (settled && now.day > (after?.nextDue ?? 999) - 2) break;   // 두 번째 급여일 직전이면 그만
    if (sawModal && settled && i > 14) break;
    await sleep(500);
  }

  const fin = await H.pay();
  rec(tag, 'TC-P1', '급여일 화면이 실제로 뜬다', sawModal,
    sawModal ? `모달 제목에 '급여일' — ${before?.day}일차` : `${fin.day}일차까지 항해했으나 안 떴다 (nextDue ${fin.nextDue})`,
    '항해를 거듭해 30일을 넘기고 입항 — port.js: enter가 띄운다');
  rec(tag, 'TC-P2', '정산이 반영된다', sawModal ? settled : null,
    sawModal ? `nextDue ${before?.nextDue}→${after?.nextDue} · 금고 ${before?.gold}→${after?.gold}` : '급여일을 못 봐서 판정 불가',
    "모달의 '치른다'를 눌러 payroll이 갱신되는지 확인");
  if (expectShort) {
    rec(tag, 'TC-P3', '못 치르면 체불로 남는다', sawModal ? (after?.arrears ?? 0) > 0 : null,
      sawModal ? `체불 ${after?.arrears}닢 · 선원 ${before?.crew}→${after?.crew} · 화물 ${before?.cargo}→${after?.cargo}` : '판정 불가',
      '금고를 비운 채 급여일을 맞아 낼 수 있는 만큼만 치른다');
    rec(tag, 'TC-P4', '체불이 이탈로 이어진다', seen.payday ? true : null,
      seen.payday ? `이탈·정산 로그 ${seen.payday}줄` : '이번 판에서는 이탈까지 가지 않았다 (불만 누적 전)',
      '이탈 로그를 관측');
  }
  await g.shot(`payday-${tag}-end`);
  return { tag, seen, payroll: fin, sawModal, settled };
}

/* ── ② 육로·내해 집중 ────────────────────────────────────────── */
async function inlandRun({ tag, region, port, pos }) {
  const ids = new Set(citiesOfRegion(region).map((c) => c.id));
  const inland = ALL_ROUTES
    .filter(([a, b]) => ids.has(a) && ids.has(b))
    .filter(([a, b]) => ALL_ROUTE_RISK[[a, b].sort().join('|')] === null);
  const inlandSet = new Set(inland.map(([a, b]) => [a, b].sort().join('|')));

  const g = await open({ port: PORT, headed: true, slow: 90, pos, outDir: OUT,
                         query: `start=${port}&gold=30000&crew=40&ship=carrack` });
  await g.start();
  const H = hooks(g);
  const seen = {};
  let legs = 0;

  for (let i = 0; i < 25; i++) {
    const s = await g.snap();
    const nb = (s.neighbors || []).filter((x) => x !== s.at && inlandSet.has([s.at, x].sort().join('|')));
    if (!nb.length) {
      // 육로 이웃이 없는 항구로 흘러왔으면 아무 데나 한 걸음 물러선다
      const any = (s.neighbors || []).filter((x) => x !== s.at);
      if (!any.length) break;
      await g.sail(any[0], { wait: 30000, front: false });
      continue;
    }
    const h0 = await H.logHead();
    await g.sail(nb[Math.floor(Math.random() * nb.length)], { wait: 30000, front: false });
    for (const id of [...new Set((await H.logSince(h0)).flatMap(classify))]) seen[id] = (seen[id] || 0) + 1;
    legs++;
    log(`  ${tag} 육로 ${legs}회 · [${Object.keys(seen).filter((k) => k === 'bandit' || k === 'toll').join(',') || '아직'}]`);
    await sleep(400);
    if (seen.bandit && seen.toll) break;      // 둘 다 봤으면 그만
  }

  rec(tag, 'TC-L1', '육로 구간을 실제로 탄다', legs > 0,
    `${legs}회 · 이 권역 육로 구간 ${inland.length}개`, '위험도가 null인 구간만 골라 왕복');
  rec(tag, 'TC-L2', '노상강도가 난다', !!seen.bandit,
    seen.bandit ? `bandit×${seen.bandit}` : `${legs}회 타고도 안 났다 (무사통과 확률 0.88^${legs})`,
    'INLAND_ODDS 0.12 × 45% = 노상강도');
  rec(tag, 'TC-L3', '통행세를 문다', !!seen.toll,
    seen.toll ? `toll×${seen.toll}` : `${legs}회 타고도 안 났다 (무사통과 확률 0.88^${legs})`,
    'INLAND_ODDS 0.12 × 55% = 통행세');
  await g.shot(`inland-${tag}`);
  return { tag, seen, legs, inlandRoutes: inland.length };
}

/* ── 넷을 동시에 ─────────────────────────────────────────────── */
const jobs = [
  () => paydayRun({ tag: '급여-넉넉', port: 'venezia', query: 'gold=30000&crew=30&ship=carrack',
                    pos: at(0, 0), expectShort: false }),
  /* ★ 체불 판 — 선원을 많이 태우고 금고를 얇게 준다. 삯은 사람 수만큼 쌓이므로
     30일이면 금고를 넘긴다. "못 주면 이탈"이 실제로 일어나는지 보는 자리다. */
  () => paydayRun({ tag: '급여-체불', port: 'melaka', query: 'gold=900&crew=60&ship=carrack',
                    pos: at(1, 0), expectShort: true }),
  () => inlandRun({ tag: '육로-동아시아', region: 'eastasia', port: 'busanpo', pos: at(0, 1) }),
  () => inlandRun({ tag: '육로-중동', region: 'mideast', port: 'hormuz', pos: at(1, 1) }),
];

const out = await Promise.all(jobs.map(async (j) => {
  try { return await j(); } catch (e) { log(`실패: ${e.message}`); return { error: e.message }; }
}));

writeFileSync(join(OUT, 'payday-inland.json'),
  JSON.stringify({ when: new Date().toISOString(), cases: ROWS, runs: out }, null, 2), 'utf8');
log('기록 — .playtest/nine-seas/payday-inland.json');
await new Promise(() => {});
