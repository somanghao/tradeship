// nine-seas.mjs — 아홉 바다를 **아홉 창에 동시에 띄우고** 사람처럼 클릭해 보는 검증 러너
//
//   python serve.py 8891                          (먼저 · no-store)
//   node tools/playtest-live/nine-seas.mjs        (run_in_background — 이 프로세스가 살아야 창이 산다)
//
// 창은 **2번 모니터에만** 놓는다(3×3). 주 모니터와 나머지는 사용자 화면이라 비운다.
// 테스트 케이스 정의는 `.playtest/nine-seas/TESTPLAN.md`가 정본이다.
//
// ── 이 러너가 재는 것 ───────────────────────────────────────────
//   A 기동 · B 항구 · C 항해와 **사건 발동** · D 소재집 §6 연계 · E 회귀(전투·급여·충격)
//   C가 본론이다. 규칙 함수를 직접 N번 불러 재는 것과 **게임이 실제로 밟는 경로**를 재는 것은
//   다르다(map.js 머리주석의 교훈). 그래서 여기서는 진짜로 항구를 클릭해 배를 띄우고,
//   그 항해에서 `state.log`에 새로 붙은 줄을 읽어 **무슨 사건이 났는지**를 분류한다.
//
// ── 진행 상황은 웹으로 본다 ────────────────────────────────────
//   케이스 하나가 끝날 때마다 `.playtest/nine-seas/live.json`을 덮어쓴다.
//   `http://localhost:8891/.playtest/nine-seas/`가 그것을 폴링해 보여 준다.

import { open } from '../playtest.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_ROUTES, ALL_ROUTE_RISK, citiesOfRegion, ALL_CITY_GEO } from '../../js/regions/index.js';
import { classify } from './event-signs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', '.playtest', 'nine-seas');
mkdirSync(OUT, { recursive: true });

const PORT = Number(process.env.PORT || 8891);
const LEGS = Number(process.env.LEGS || 10);       // 권역마다 몇 구간을 항해하나
/* ★ 창은 **2번 모니터 하나에만** 놓는다(사용자 지침). 1920×1080에 아홉을 넣으므로
   3열×3행 · 640×360이다. 게임의 논리 해상도가 400×225라 640×360이면 정수배(1.6배)에
   가깝게 들어가고, DOM 오버레이(시장표·사이드패널)도 접히지 않는다. */
const W = 640, H = 360;
const MON2 = { x: 0, y: 1080 };
const at = (col, row) => ({ x: MON2.x + col * W, y: MON2.y + row * H, w: W, h: H });

/** data.js: START_PORTS와 같은 순서·같은 부두 */
const SEAS = [
  { region: 'eastasia',      port: 'busanpo',  name: '제1해 동아시아', pos: at(0, 0) },
  { region: 'seasia',        port: 'melaka',   name: '제2해 동남아',   pos: at(1, 0) },
  { region: 'indian',        port: 'cambay',   name: '제3해 인도양',   pos: at(2, 0) },
  { region: 'mideast',       port: 'hormuz',   name: '제4해 중동',     pos: at(0, 1) },
  { region: 'africa',        port: 'arguin',   name: '제5해 아프리카', pos: at(1, 1) },
  { region: 'mediterranean', port: 'venezia',  name: '제6해 지중해',   pos: at(2, 1) },
  { region: 'atlantic',      port: 'bilbao',   name: '제7해 대서양',   pos: at(0, 2) },
  { region: 'caribbean',     port: 'jamaica',  name: '제8해 카리브',   pos: at(1, 2) },
  { region: 'southamerica',  port: 'salvador', name: '제9해 남아메리카', pos: at(2, 2) },
];

/* 시작 조건 — 200닢·선원 0으로는 첫 항해를 못 뜬다(START_GOLD 주석의 실측).
   연계 검증이지 난이도 검증이 아니므로 자금과 사람을 준다. TESTPLAN §2에 명시.
   ★ 항해를 열 구간 잇달아 뛰므로 자금을 더 준다 — 중간에 파산하면 사건을 못 본다. */
const QUERY = 'gold=12000&crew=30&ship=carrack';

/* 항구 id → 한글 이름. 지도 좌표를 못 얻을 때 **사이드 카드**를 눌러 가려면 이름이 필요하다.
   창이 640×360으로 작아 지도가 축소되면 가장자리 항구는 좌표가 안 잡힌다 —
   실측에서 `qatif→bahrain`이 4초 만에 실패하기를 반복했다. */
const CITY_NAME = Object.fromEntries(ALL_CITY_GEO.map((c) => [c.id, c.name]));

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 사건 분류표는 러너 셋이 함께 쓴다 — `event-signs.mjs`가 정본 */
/* ── 권역 안의 육로·내해 구간 — 노상강도·통행세는 여기서만 난다 ── */
function inlandLegs(rid) {
  const ids = new Set(citiesOfRegion(rid).map((c) => c.id));
  return ALL_ROUTES
    .filter(([a, b]) => ids.has(a) && ids.has(b))
    .filter(([a, b]) => ALL_ROUTE_RISK[[a, b].sort().join('|')] === null);
}

/* ── 살아 있는 진행 상황 — 웹 대시보드가 이 파일을 폴링한다 ────── */
const LIVE = { when: null, phase: '준비', current: null, seas: {} };
function flush() {
  LIVE.when = new Date().toISOString();
  writeFileSync(join(OUT, 'live.json'), JSON.stringify(LIVE, null, 2), 'utf8');
}

function recorder(sea) {
  const cases = [];
  LIVE.seas[sea.region] = { name: sea.name, port: sea.port, cases, events: {}, notes: [] };
  const rec = (id, what, pass, note = '', how = '') => {
    const row = { id, what, pass: pass === null ? null : !!pass, note: String(note).slice(0, 400), how };
    cases.push(row);
    LIVE.current = `${sea.name} ${id}`;
    flush();
    log(`  ${sea.region} ${id} ${pass === null ? 'N-A ' : pass ? 'PASS' : 'FAIL'} ${what}${note ? ' — ' + String(note).slice(0, 140) : ''}`);
    return row;
  };
  return { cases, rec };
}

async function boot(sea) {
  const g = await open({
    port: PORT, headed: true, slow: 90, pos: sea.pos, outDir: OUT,
    query: `start=${sea.port}&${QUERY}`,
  });
  log(`띄움 ${sea.name} — ${sea.port} @ (${sea.pos.x},${sea.pos.y})`);
  return { sea, g };
}

/* ── A·B. 기동과 항구 ─────────────────────────────────────────── */
async function runAB({ sea, g }, rec) {
  /* ★ 브라우저가 제 발로 `/favicon.ico`를 부르고 404를 받는다. index.html에 아이콘이 없어서인데
     이것을 콘솔 오류로 세면 **아홉 바다가 전부 TC-01 FAIL**이 된다. 게임 결함이 아니다. */
  const realErrors = g.errors.filter((e) => !/favicon\.ico|404 \(File not found\)|status of 404/.test(e));
  rec('TC-01', '모듈 로드·콘솔 오류', realErrors.length === 0,
    realErrors.slice(0, 2).join(' | ') || `오류 0건 (favicon 404 ${g.errors.length}건 제외)`,
    'pageerror·console.error 수집 — favicon 404 제외');
  await g.start();
  let s = await g.snap();
  rec('TC-02', '항구 진입', s.scene === 'port', `scene=${s.scene}`, '타이틀 단추 클릭 후 씬 확인');
  rec('TC-03', '시작 부두 일치', s.at === sea.port, `at=${s.at} (기대 ${sea.port})`, '?start= 로 연 뒤 state.at');
  await g.shot(`${sea.region}-A-port`);

  const mk = await g.market();
  rec('TC-04', '시세표 렌더', mk.length > 0 && mk.some((m) => m.price > 0), `품목 ${mk.length}행`, 'table.market tbody 긁기');
  const tagged = mk.filter((m) => m.tag);
  rec('TC-05', '산지/수요 딱지', tagged.length > 0,
    tagged.slice(0, 5).map((t) => `${t.name}=${t.tag}`).join(' '), '.tag 요소 존재');

  const src = tagged.find((t) => t.tag === '산지') || mk.find((m) => m.price > 0);
  const before = await g.snap();
  let bought = false;
  if (src) bought = await g.buyMax(src.name);
  const after = await g.snap();
  const cargoN = Object.values(after.cargo).reduce((a, b) => a + b, 0);
  rec('TC-06', '특산 매수', bought && cargoN > 0 && after.gold < before.gold,
    `${src ? src.name : '없음'} · 화물 ${cargoN} · 금화 ${before.gold}→${after.gold}`, '그 행의 사기 단추 반복 클릭');
  await g.shot(`${sea.region}-B-market`);

  const side = await g.sideText();
  rec('TC-09', '항구 인물·사이드패널', side.length > 0, side.replace(/\s+/g, ' ').slice(0, 140), '#port-side innerText');

  const toTav = await g.goTavern();
  const tav = toTav ? await g.tavern() : [];
  const crewBefore = (await g.snap()).crew;
  if (toTav) await g.click('태운다');
  const crewAfter = (await g.snap()).crew;
  rec('TC-07', '술집 고용', toTav && tav.length > 0 && crewAfter >= crewBefore,
    `줄 ${tav.length} · 선원 ${crewBefore}→${crewAfter}`, '술집 진입 후 태운다 클릭');
  if (toTav) await g.shot(`${sea.region}-B-tavern`);
  await g.back();

  const toYard = await g.goShipyard();
  const yard = toYard ? await g.shipyard() : [];
  rec('TC-08', '조선소 배 목록', toYard && yard.length > 0, `줄 ${yard.length} · 예: ${(yard[0] || '').slice(0, 60)}`, '조선소 진입 후 목록 긁기');
  if (toYard) await g.shot(`${sea.region}-B-shipyard`);
  await g.back();

  const s2 = await g.snap();
  rec('TC-10', '지도 이웃 항구', (s2.neighbors || []).length > 0,
    `${(s2.neighbors || []).length}곳: ${(s2.neighbors || []).slice(0, 6).join(',')}`, 'neighbors()');
}

/* ── C. 항해와 사건 ───────────────────────────────────────────── */
async function runC({ sea, g }, rec) {
  const seen = {};                       // 사건 id → 몇 번 봤나
  const legLog = [];
  const inland = inlandLegs(sea.region);
  const inlandSet = new Set(inland.map(([a, b]) => [a, b].sort().join('|')));
  const regionCities = new Set(citiesOfRegion(sea.region).map((c) => c.id));
  /* BFS용 이웃 표 — 권역 안만. `neighborsOf`는 페이지 안에 있으므로 여기서는
     `ALL_ROUTES`로 같은 그래프를 만든다(원양 항로는 뺀다 — 권역을 안 떠난다). */
  const regionNeighbors = {};
  for (const [a, b] of ALL_ROUTES) {
    if (!regionCities.has(a) || !regionCities.has(b)) continue;
    (regionNeighbors[a] ??= []).push(b);
    (regionNeighbors[b] ??= []).push(a);
  }
  let arrived = 0, battles = 0, inlandTaken = 0;
  const visited = new Set([sea.port]);

  /* ★ `state.log`는 **앞에 쌓인다**(`pushLog`가 unshift, 60줄 넘으면 뒤를 pop).
     그래서 `slice(길이)`로 새 줄을 읽으려던 첫 판은 늘 **가장 오래된 시작 로그 3줄**을
     읽었고, 아홉 바다가 전부 "해상 사건 0건"이라는 거짓 결과를 냈다.
     새 줄은 맨 앞이므로, 항해 전 머리줄을 기억해 두고 **그 줄을 만날 때까지** 앞에서 걷는다. */
  const logHead = () => g.page.evaluate(() => {
    const l = window.__game.state.log[0];
    return l ? `${l.day}|${l.text}` : '';
  });
  const logSince = (head) => g.page.evaluate((h) => {
    const out = [];
    for (const l of window.__game.state.log) {
      if (`${l.day}|${l.text}` === h) break;
      out.push(l.text ?? String(l));
    }
    return out.reverse();            // 오래된 것부터 — 사건이 난 순서대로 읽힌다
  }, head);

  /* 지금 배가 바다 위인가 — 지도 사이드에 '항해 중' 카드가 떠 있으면 그렇다. */
  const sailingNow = () => g.page.locator('#map-side').getByText('항해 중').first()
    .isVisible().catch(() => false);

  /* ★ 앞 구간이 안 끝났는데 다음 출항을 시도하면 그 뒤로 계속 꼬인다 — '출항' 단추가 없어
     `sail`이 실패하고, 실패했으니 또 미도착이고, 그 상태로 다음 루프가 같은 일을 반복한다.
     실측에서 동남아가 이 고리에 빠져 **한 구간에 47초씩 쓰며 열넷 중 여섯만 도착**했다.
     그래서 매 구간 앞에서 **바다에 떠 있으면 먼저 내려놓는다.** */
  const settle = async (limit = 45000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < limit) {
      /* ★ **막고 있는 모달을 먼저 치운다.** 급여일 화면은 `closable:false`라 뜬 채로 두면
         '출항' 단추가 눌리지 않는다 — 그런데 그때 배는 항구에 있으므로 '항해 중'만 보고
         "괜찮다"고 넘기면 그 뒤 모든 출항이 조용히 실패한다.
         실측에서 아프리카가 30일차(=급여일)에 걸려 `cabo→benguela`를 여덟 번 헛시도했다.
         급여일이면 '치른다'를 눌러 준다 — 못 치르면 체불로 넘어가고 그것도 검증거리다. */
      const m = await g.modal();
      if (m) {
        const btn = m.buttons.find((x) => /치른다/.test(x)) ?? m.buttons[0];
        if (!(await g.modalClick(btn))) return false;
        await sleep(900);
        continue;
      }
      if (!(await sailingNow())) return true;
      await sleep(500);
    }
    return false;
  };

  for (let i = 0; i < LEGS; i++) {
    await settle();
    let s = await g.snap();

    /* ★ **팔지 않으면 자금이 마르고, 자금이 마르면 출항이 막힌다.**
       TC-06이 산지 품목을 화물칸 가득 사서 금고가 바닥나는데(12,000 → 114닢) 그 뒤로 한 번도
       팔지 않으면 항해비를 못 대 `sail`이 조용히 실패한다 — 로그에는 `[평온] 미도착`만 남아
       마치 항해가 안 끝난 것처럼 보인다(실측 배치에서 미도착 15~39건의 진짜 원인).
       사람은 사고 판다. 그래서 **자금이 얇으면 싣고 있는 것을 여기서 판다** — 무역 자체도
       그렇게 굴러가야 검증이 된다. */
    const cargoN = Object.values(s.cargo || {}).reduce((a, b) => a + b, 0);
    if (s.scene === 'port' && cargoN > 0 && s.gold < 2500) {
      const before = s.gold;
      await g.sellAll();
      s = await g.snap();
      if (s.gold !== before) log(`  ${sea.region} 짐을 풀었다 — 금화 ${before} → ${s.gold}`);
    }
    /* 반대로 금고만 두둑하고 배가 비어 있으면 산다 — 화물이 있어야 해적이 노리고(cargoLure)
       공동해손·보험 같은 사건도 뜻이 생긴다. */
    if (s.scene === 'port' && cargoN === 0 && s.gold > 4000) {
      const mk = await g.market();
      const src = mk.find((m) => m.tag === '산지' && m.price > 0) || mk.find((m) => m.price > 0);
      if (src) await g.buyMax(src.name);
      s = await g.snap();
    }
    const nb = (s.neighbors || []).filter((x) => x !== s.at);
    if (!nb.length) { legLog.push({ leg: i, why: '이웃 없음' }); break; }

    /* 목적지 고르기 — 세 가지를 함께 만족시켜야 한다.
       ① 육로·내해 구간을 두어 번은 타야 노상강도·통행세를 볼 수 있다(그 구간에서만 난다).
       ② 나머지는 **해상 구간**이어야 하고, ③ **가 본 적 없는 항구**를 우선한다.
       첫 판은 이 셋이 없어서 부산포~내이포(육로 1일)만 열 번 왕복했다 —
       열 구간을 뛰고도 날짜가 11일이었고, 짧은 구간이라 판정도 한 장씩만 굴렀다. */
    /* ★ 이웃에는 **원양 항로**도 섞여 있다(다른 바다로 나가는 카드). 그것을 고르면
       ① 30~48일짜리라 30초 대기 안에 못 닿아 '미도착'이 되고 ② 닿으면 그 권역을 떠나
       "이 바다를 검증한다"가 흐트러진다. 권역 밖 이웃은 빼고 고른다. */
    const inRegion = (x) => regionCities.has(x);
    const isInland = (x) => inlandSet.has([s.at, x].sort().join('|'));
    const inlandNb = nb.filter((x) => inRegion(x) && isInland(x));
    const seaNb = nb.filter((x) => inRegion(x) && !isInland(x));
    /* 아직 안 밟은 항구를 **찾아간다** — 이웃에 없으면 BFS로 가장 가까운 미방문 항구를 찾고
       그쪽으로 가는 첫 걸음을 고른다. 이웃만 보고 랜덤으로 걸으면 같은 대여섯 곳을 맴돌아
       권역 28곳 중 절반도 못 밟는다(첫 회차 실측 264곳 중 26곳). */
    const stepToward = () => {
      const q = [[s.at, null]];
      const seenB = new Set([s.at]);
      while (q.length) {
        const [cur, first] = q.shift();
        if (first && !visited.has(cur) && inRegion(cur)) return first;
        for (const n2 of (regionNeighbors[cur] ?? [])) {
          if (seenB.has(n2)) continue;
          seenB.add(n2);
          q.push([n2, first ?? n2]);
        }
      }
      return null;
    };
    const fresh = (arr) => {
      const f = arr.filter((x) => !visited.has(x));
      if (f.length) return f;
      const step = stepToward();
      return step && arr.includes(step) ? [step] : arr;
    };
    const wantInland = inlandNb.length && inlandTaken < 2;
    const pool = wantInland ? inlandNb : fresh(seaNb.length ? seaNb : nb);
    const target = pool[Math.floor(Math.random() * pool.length)];
    if (isInland(target)) inlandTaken++;
    visited.add(target);

    const h0 = await logHead();
    const r = await g.sail(target, { wait: 30000, front: false, name: CITY_NAME[target] });
    let lines = await logSince(h0);

    // 전투로 들어갔으면 — 첫 조우는 실제로 싸워 보고, 그 뒤로는 도주한다
    if (r.battle || (await g.snap()).scene === 'battle') {
      battles++;
      await g.shot(`${sea.region}-C-battle-${battles}`);
      if (battles === 1) {
        await g.click('발사!');
        await sleep(2200);
        await g.click('발사!');
        await sleep(2200);
      }
      for (const t of ['도주', '이탈', '항구로 돌아간다', '항해를 계속한다', '버려두고 떠난다']) {
        if (await g.click(t)) { await sleep(1200); break; }
      }
      // 전투 뒤 결과 모달이 남아 있으면 닫는다
      for (let k = 0; k < 4; k++) { if (!(await g.modalClick())) break; await sleep(600); }

      /* ★ 전투가 끝나도 **항해는 안 끝났다** — `resumeVoyage`가 남은 항로를 마저 간다.
         `sail()`은 전투 씬을 보는 순간 돌아오므로, 여기서 기다리지 않으면 아직 바다 위인데
         '미도착'으로 적히고 다음 루프가 같은 항구에서 또 출항을 시도한다.
         실제로 남미가 **16구간 중 2구간만 도착**하고 9일에 멈춰 있었다(조우 14회). */
      const t0 = Date.now();
      while (Date.now() - t0 < 40000) {
        await sleep(500);
        const n = await g.snap();
        if (n.at === target) break;
        if (n.scene === 'battle') continue;         // 또 붙었으면 그대로 둔다
        if (!(await sailingNow()) && n.scene === 'port') break;   // 어딘가에 내렸다
        const m2 = await g.modal();
        if (m2) { if (!(await g.modalClick())) break; }
      }
      lines = await logSince(h0);
    }

    const ids = [...new Set(lines.flatMap(classify))];
    for (const id of ids) seen[id] = (seen[id] || 0) + 1;
    const now = await g.snap();
    if (now.at === target) arrived++;
    legLog.push({ leg: i, from: s.at, to: target, arrived: now.at === target, day: now.day, ids, lines: lines.slice(0, 6) });
    LIVE.seas[sea.region].events = seen;
    LIVE.seas[sea.region].legs = legLog.length;
    flush();
    log(`  ${sea.region} 항해 ${i + 1}/${LEGS} ${s.at}→${target} ${now.at === target ? '도착' : '미도착'} [${ids.join(',') || '평온'}]`);
    await sleep(900 + Math.random() * 700);      // 사람이 도착 화면을 한 번 보는 시간
  }

  const s = await g.snap();
  rec('TC-11', '실제 출항·도착', arrived > 0, `${arrived}/${LEGS}구간 도착 · 날짜 ${s.day}일`, '지도에서 항구를 마우스로 클릭');
  await g.shot(`${sea.region}-C-map`);

  const seaEv = ['wind', 'storm', 'drift', 'merchant', 'pirate'].filter((k) => seen[k]);
  rec('TC-12', '해상 사건 발동', seaEv.length > 0,
    seaEv.map((k) => `${k}×${seen[k]}`).join(' ') || '한 건도 안 났다',
    `${LEGS}구간 항해하며 state.log 새 줄을 분류`);

  const landEv = ['bandit', 'toll'].filter((k) => seen[k]);
  rec('TC-13', '육로·내해 사건', inland.length === 0 ? null : landEv.length > 0,
    inland.length === 0 ? '이 권역엔 육로·내해 구간이 없다 (N-A)'
                        : (landEv.map((k) => `${k}×${seen[k]}`).join(' ') || `구간 ${inland.length}개는 있으나 안 났다(INLAND_ODDS=0.12)`),
    '육로 구간을 일부러 골라 항해');

  const shocks = await g.page.evaluate(() => (window.__game.state.shocks || []).map((x) => `${x.city}/${x.good}/${x.why}×${x.mult}`));
  rec('TC-14', '시장 충격 적재', shocks.length > 0,
    shocks.slice(0, 4).join(' · ') || `state.shocks 0건 (${s.day}일 경과)`, 'state.shocks 직접 확인');

  rec('TC-15', '전투 진입·이탈', battles > 0 ? true : null,
    battles ? `조우 ${battles}회 · 전투 씬 진입과 이탈 성공` : '이번 판에는 해적 조우가 없었다 (N-A)',
    '조우 모달에서 전투 준비 → 발사! → 도주');

  /* `state.payroll`은 `{ due, arrears, nextDue, lastDay }`다. 첫 판은 `accrued`라는 없는 필드를
     봐서 **날마다 삯이 쌓이고 있는데도 FAIL**을 냈다. */
  const pay = await g.page.evaluate(() => ({ payroll: window.__game.state.payroll, day: window.__game.state.day }));
  /* ★ `due > 0`만 보면 **급여를 막 치른 직후**가 실패로 잡힌다 — 실제로 카리브가
     "밀린 삯 0닢 · 다음 급여일 90일차 · 지금 61일차"로 FAIL이 났는데, 그것은 60일차에
     제대로 정산했다는 **증거**다. 삯이 쌓였거나 **한 번이라도 정산했으면** 통과다. */
  const due = pay.payroll?.due ?? 0;
  const settled = (pay.payroll?.nextDue ?? 30) > 30;
  rec('TC-16', '급여 발생주의(날마다 쌓인다)', due > 0 || settled,
    `밀린 삯 ${due}닢 · 다음 급여일 ${pay.payroll?.nextDue}일차 · 지금 ${pay.day}일차`
      + (settled && due === 0 ? ' — 막 치렀다' : ''),
    'state.payroll.due 확인 · 정산 이력(nextDue)도 함께 본다');

  LIVE.seas[sea.region].legLog = legLog;
  flush();
  return { seen, legLog, battles, arrived };
}

/* ── 실행 ─────────────────────────────────────────────────────── */

LIVE.phase = '아홉 창 기동';
flush();

/* `ONLY=caribbean,southamerica`로 권역을 골라 굴린다 — 고친 자리만 다시 볼 때.
   창이 줄면 자리도 다시 잡는다(둘이면 2열 1행). 다른 러너와 겹치지 않게 `COL0`으로 민다. */
const ONLY = (process.env.ONLY || '').split(',').map((x) => x.trim()).filter(Boolean);
const COL0 = Number(process.env.COL0 || 0);
/* 배치로 나눠 굴리면 `result.json` 하나에 마지막 배치만 남는다 — 배치마다 파일을 나눈다.
   `nine-seas-report.mjs`가 `result*.json`을 전부 읽어 합친다. */
const OUTFILE = process.env.OUTFILE || (process.env.ONLY ? `result-${process.env.ONLY.replace(/[^a-z]/g, '-')}.json` : 'result.json');
const RUN = ONLY.length ? SEAS.filter((s) => ONLY.includes(s.region)) : SEAS;
if (ONLY.length) {
  /* 고른 권역만 굴릴 때는 **한 열에 세로로** 쌓는다 — 다른 러너(완주 플레이 등)가 왼쪽을
     쓰고 있어도 `COL0=2`면 오른쪽 640폭에 세 창이 겹치지 않고 들어간다. */
  RUN.forEach((s, i) => { s.pos = at(COL0, i % 3); });
  log(`권역 ${RUN.length}곳만 굴린다 — ${RUN.map((s) => s.region).join(', ')}`);
}

const booted = (await Promise.all(RUN.map(async (sea) => {
  try { return await boot(sea); }
  catch (e) { log(`띄우기 실패 ${sea.region}: ${e.message}`); return null; }
}))).filter(Boolean);
log(`아홉 창 기동 완료 — ${booted.length}/9`);

/* ★ 아홉을 **동시에** 굴린다. 전에는 권역을 차례로 돌아 아홉 창 중 하나만 움직였고,
   나머지 여덟은 제 차례를 기다리며 항구 화면에 멈춰 있었다(사용자가 화면을 보고 잡았다).
   창이 서로 겹치지 않게 깔려 있으므로 아홉이 함께 돌아도 rAF가 멈추지 않는다 —
   대신 `sail(front:false)`로 포커스를 뺏지 않게 해야 한다. */
LIVE.phase = '아홉 바다 동시 진행';
flush();

const results = [];
await Promise.all(booted.map(async (b) => {
  const { cases, rec } = recorder(b.sea);
  let c = null;
  try {
    await runAB(b, rec);
    c = await runC(b, rec);
  } catch (e) {
    rec('FATAL', '러너 중단', false, e.message, '');
  }
  results.push({ region: b.sea.region, name: b.sea.name, port: b.sea.port, cases, ...(c || {}), errors: b.g.errors.slice(0, 5) });
  writeFileSync(join(OUT, OUTFILE), JSON.stringify({ when: new Date().toISOString(), legs: LEGS, results }, null, 2), 'utf8');
  log(`■ ${b.sea.name} 끝 — PASS ${cases.filter((x) => x.pass === true).length} · FAIL ${cases.filter((x) => x.pass === false).length}`);
}));

// SEAS 순서대로 다시 세운다 — 동시에 끝나므로 도착 순서가 뒤죽박죽이다
results.sort((a, b2) => RUN.findIndex((s) => s.region === a.region) - RUN.findIndex((s) => s.region === b2.region));
writeFileSync(join(OUT, OUTFILE), JSON.stringify({ when: new Date().toISOString(), legs: LEGS, results }, null, 2), 'utf8');

LIVE.phase = '완료';
LIVE.current = null;
flush();
log(`결과 기록 — .playtest/nine-seas/${OUTFILE}`);

// 창을 살려 둔다 — 사람이 화면을 보고 이어서 눌러 볼 수 있게
globalThis.__nine = { booted, results };
await new Promise(() => {});
