/* sim-encloss.mjs — ★★ 회차 28 (가-6) **「sim-core가 바다에서 털리는 것을 안 센다」의 답**
 *
 *   node tools/sim-encloss.mjs [시드수] [항차]        (기본 20 · 60항차)
 *
 * ── 무엇을 판정하려는 것인가 ──────────────────────────────────
 * 회차 27이 같은 30항차를 두 곳에서 돌려 **시뮬 +51,748닢 ↔ 실판 −56,423닢**을 얻었다.
 * 부호가 뒤집힌다. 원인은 게임이 아니라 **계기판**이다 — `sim-core`(→ `sim-stat`·`sim-guild`
 * ·`sim-trade`·`probe-*` 전부)는 **해상 조우를 한 톨도 모델링하지 않는다.**
 *
 * 고를 수 있는 길이 둘이었다:
 *   ⓐ `sim-core`에 조우를 넣는다 — 그러면 **주 지표가 다시 흔들린다.** 회차 26이 한 회차를 들여
 *      *"흔들린 것은 게임이 아니라 시뮬의 전략이었다"*를 밝히고 `sim-stat 20`을 **3회 같은 값**으로
 *      만들어 놓았는데, 난수 조우를 넣으면 그 재현성이 통째로 사라진다.
 *   ⓑ `sim-core`는 무역만 잰다고 못박고 **조우는 따로 재는 자를 둔다.**
 * ⇒ **ⓑ를 골랐다.** 다만 *"따로 봐라"*로 끝내지 않는다 — **이 파일이 그 「따로」다.**
 *
 * ── 어떻게 재는가: 난수가 아니라 **기댓값** ────────────────────
 * 같은 궤적(`runSim`의 항차 행) 위에서 **게임의 규칙 함수에 직접 물어** 반사실을 셈한다.
 *   · 판정 횟수  `map.js: rollsLeft = clamp(ceil(days/8), 1, 4)` · 감쇠 `EVENT_DAMP=[1,.62,.45,.34]`
 *   · 조우 확률  `state.js: encounterOdds({from,to,lure})`  (미끼는 그 항차에 실은 값)
 *   · 등급 분포  `state.js: foeOdds(자산)`  ← ★ **가난하면 등급 5가 표에서 아예 0이다**
 *   · 손실       `state.js: capEncounterLoss(금고 × fleeShare, 적선원, 등급)` + 화물 35%
 * 난수를 안 쓰므로 **몇 번을 돌려도 같은 값**이다 — 주 지표의 재현성을 안 깨고 크기를 잰다.
 *
 * ⚠️ 이것은 **하한**이다: 「도주」만 셈한다(`fleeShare 0.12`). 싸워서 지면 `loseShare 0.50`이라
 *    네 배가 넘고, 실판의 −56,423닢에는 그쪽이 섞여 있다.
 */
import { ENCOUNTER_LOSS, SHIPS } from '../js/data.js';
import {
  state, resetGame, encounterOdds, capEncounterLoss, foeOdds, isInland, routeRisk,
} from '../js/state.js';
import { runSim } from './sim-core.mjs';

const N = +(process.argv[2] || 20);
const V = +(process.argv[3] || 60);
const EVENT_DAMP = [1, 0.62, 0.45, 0.34];          // ← map.js 정본을 베낀 것(바뀌면 여기도 바꾼다)

const med = (a) => {
  const s = [...a].filter(Number.isFinite).sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const won = (n) => Math.round(n).toLocaleString('en-US');
const pad = (s, n) => String(s).padEnd(n, ' ');

/** 한 항차에서 조우로 잃을 **기댓값**(금화). 난수를 안 쓴다. */
function expectedLoss(row) {
  const { from, to, days, gold, spend } = row;
  if (from == null || to == null) return { p: 0, loss: 0 };
  if (isInland(from, to) || routeRisk(from, to) === null) return { p: 0, loss: 0 };
  /* 미끼 — 그 항차에 실은 값. `encounterOdds`가 `lure`로 받는다. */
  const p1 = encounterOdds({ from, to, lure: Math.max(0, spend) });
  const rolls = Math.max(1, Math.min(4, Math.ceil((days || 1) / 8)));
  /* 판정 한 장이 실제로 굴려지는 확률은 `damp`, 그 안에서 해적일 확률이 `p1` */
  let pAny = 0;
  for (let i = 0; i < rolls; i++) pAny += (EVENT_DAMP[i] ?? 0.3) * p1 * (1 - pAny);

  /* 등급 분포는 **자산**이 정한다(`foeOdds`) — 가난하면 큰 놈이 아예 안 붙는다.
     `foeWealth = gold + 실은 짐×60`인데 여기서는 금고+매입액으로 어림잡는다. */
  const tbl = foeOdds(gold + Math.max(0, spend), row.ship);
  let coin = 0;
  for (let lv = 1; lv <= 5; lv++) {
    const w = tbl[lv - 1] ?? 0;
    if (!w) continue;
    const crew = lv * ENCOUNTER_LOSS.crewPerLevel;
    coin += w * capEncounterLoss(gold * ENCOUNTER_LOSS.fleeShare, crew, lv);
  }
  // 화물도 35%를 넘긴다 — 그 항차의 매입액으로 어림잡는다(팔기 전이라 매입가가 그 자리다)
  const cargo = Math.max(0, spend) * ENCOUNTER_LOSS.fleeCargoShare;
  return { p: pAny, loss: pAny * (coin + cargo) };
}

console.log(`시드 ${N} · 항차 ${V} · **손실은 난수 없이 기댓값** · 궤적은 **시드 고정**(Math.random을 갈아 끼운다) — 몇 번을 돌려도 같은 값이다`);
console.log('상한 = `encounterLossCap`(적 갑판 크기) · 그 위는 tail ' + ENCOUNTER_LOSS.tail + '만 더 간다\n');

const stages = [10, 30, 60];
const acc = {};
for (const v of stages) acc[v] = { trade: [], loss: [], p: [], gold: [] };

/* ★★ **실측이 내 말을 뒤집었다 — 적어 둔다.**
   처음에는 *"`runSim({seed})`을 쓰니 난수가 없다"*고 적고 그대로 문서에 옮길 뻔했다.
   그런데 6시드로 **세 번 돌려 보니 30항차 줄이 21,799 ↔ 20,237로 갈렸다**(10항차는 같았다).
   `runSim`의 `seed`는 **전략 쪽만** 고정하고 세계(`worldTick`·시세 흔들림)는 여전히
   `Math.random()`을 탄다. ⇒ `sim-guild.mjs`가 하는 대로 **`Math.random`을 통째로 갈아 끼운다.**
   ★ 교훈: 「난수 없음」은 **주장할 것이 아니라 두 번 돌려 확인할 것**이다. */
function seeded(seed) {
  let x = (seed >>> 0) || 1;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
}
const ORIG_RANDOM = Math.random;
for (let i = 0; i < N; i++) {
  Math.random = seeded(0x51ed + i * 7907);
  const res = runSim({ maxVoyages: V, seed: i });
  Math.random = ORIG_RANDOM;
  const rows = res.rows;
  let cumTrade = 0, cumLoss = 0, pSum = 0, n = 0;
  const snap = {};
  for (const r of rows) {
    cumTrade += (r.gain - r.spend);
    const e = expectedLoss(r);
    cumLoss += e.loss; pSum += e.p; n++;
    if (stages.includes(r.v)) snap[r.v] = { trade: cumTrade, loss: cumLoss, p: pSum / n, gold: r.gold };
  }
  for (const v of stages) if (snap[v]) {
    acc[v].trade.push(snap[v].trade); acc[v].loss.push(snap[v].loss);
    acc[v].p.push(snap[v].p); acc[v].gold.push(snap[v].gold);
  }
}

console.log(pad('시점', 10) + pad('무역 누적이익', 16) + pad('조우 기대손실', 16)
  + pad('그 비율', 10) + pad('실효 조우율', 12) + '금고');
for (const v of stages) {
  const t = med(acc[v].trade), l = med(acc[v].loss);
  console.log(pad(v + '항차', 10) + pad(won(t), 16) + pad('−' + won(l), 16)
    + pad((t ? (l / t * 100).toFixed(1) : '—') + '%', 10)
    + pad((med(acc[v].p) * 100).toFixed(1) + '%', 12) + won(med(acc[v].gold)));
}

console.log('\n── 무엇을 읽어야 하나 ─────────────────────────────────────');
console.log('· 이 표의 「조우 기대손실」은 **하한**이다 — 도주(금고 12%)만 셈했다.');
console.log('  싸워서 지면 50%라 네 배가 넘고, 실판의 −56,423닢에는 그쪽이 섞여 있다.');
console.log('· 비율이 초반에 작고 뒤로 갈수록 커지면 **`sim-stat`의 주 지표(10항차·첫 배)는 그대로 써도 되고**');
console.log('  30항차 위의 **절대액**만 못 쓴다는 뜻이다. 그 갈림점을 이 표가 준다.');
console.log('· `sim-core`에 조우를 넣지 않은 이유: 난수를 넣으면 회차 26이 한 회차를 들여 얻은');
console.log('  **`sim-stat 20`이 3회 같은 값**이라는 재현성이 사라진다. 계기는 흔들리면 못 쓴다.');
void SHIPS; void resetGame; void state;
