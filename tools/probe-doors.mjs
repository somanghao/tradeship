// probe-doors.mjs — **한 조우의 세 문**(승리 · 패배 · 도주)이 단계마다 얼마인가
//
// 회차 22가 한 조우를 손으로 눌러 세 문의 값을 냈다(GRAND-ISSUES #17):
//   도주 −107,757 / 패배 −448,990 / **승리 +180**.  조우 손실 상한이 들어간 뒤에는
//   도주 −7,928 / 패배 −18,164 / 승리 +180 — 599배가 44배로 줄었지만 **여전히 갈린다**.
// 그 44배가 어디서 오는지 손으로 한 번 더 누르지 않고 규칙에 직접 물어 표로 낸다.
//
//   node tools/probe-doors.mjs            (표)
//   node tools/probe-doors.mjs --md       (reward-measure.md에 붙일 마크다운)
//
// ── 왜 손계산이 아니라 규칙 함수인가 ────────────────────────────
// 세 문의 값은 전부 `state.js`의 판정 함수가 정한다 — `capSpoils`(내가 얻는 쪽 상한) ·
// `capEncounterLoss`(내가 잃는 쪽 상한) · `spoilsGoodsLimit`(노획 품목 수) ·
// `prizeCrewNeed`/`spareCrew`(나포선을 끌고 갈 수 있나). 그래서 여기서는 **그 함수들을
// 그대로 부른다.** 값을 베끼면 상수를 고친 날 이 도구가 조용히 거짓말을 한다.
//
// ── 씬에서 거울로 베껴 온 것 (규칙이 아직 씬에 있다) ────────────
//   `scenes/battle.js: finish()`  승리 금화 = (lo + rand×(hi−lo)) × mult,  mult = 나포 1.00 · 격침 0.45
//                                  노획 화물 = 품목마다 3~11개 (`spoilsGoodsLimit`개 품목까지)
//   `scenes/map.js`               싸우기 전 도주 = 금고 × fleeShare (+ 화물 fleeCargoShare)
// ⚠️ 저쪽이 바뀌면 여기 MIRROR도 바꾼다. 값이 갈렸는지는 `--check`가 잡는다.
//
// ── 안 재는 것 (그래서 표가 승리 쪽에 관대하다) ────────────────
//   · 선체 피해와 그 수리비 · 선원 손실과 재고용비 · 전투에 쓴 탄약
//   · 승률(질 확률) — 세 문은 **고른 문의 값**이지 기대값이 아니다. 승률을 곱하려면
//     전투 시뮬이 있어야 하고, 그것은 이 도구의 몫이 아니다.
// ⇒ 곧 **승리 쪽 수치는 상한이다.** 그런데도 도주보다 작다면 결론은 더 강해진다.

import {
  state, resetGame, capSpoils, spoilsCap, capEncounterLoss, encounterLossCap,
  spoilsGoodsLimit, spareCrew, prizeCrewNeed, cargoValue, recalcShip,
  foeOdds, foeWealth,
} from '../js/state.js';
import {
  ENEMIES, SHIPS, GOOD_BY_ID, GOODS, ENCOUNTER_LOSS, SHIP_RESALE, PRIZE_SCRAP,
  SPOILS_SHARE, SPOILS_TAIL, SPOILS_FLOOR,
} from '../js/data.js';

/* ── 씬 거울 ─────────────────────────────────────────────────── */
const MIRROR = {
  sinkMult: 0.45,      // battle.js: kind === 'capture' ? 1 : 0.45
  captureMult: 1.00,
  goodsQty: [3, 11],   // battle.js: 3 + floor(rand*9)  → 평균 7
};
const meanQty = (MIRROR.goodsQty[0] + MIRROR.goodsQty[1]) / 2;

/* ── 단계 — 「그때 내가 얼마를 쥐고 있나」 ────────────────────────
   금고·화물가치는 `sim-stat 20`·`probe-fleet`·회차 22 실측에서 가져온 자리들이다.
   ★ 세 문의 값이 **내 크기에 따라 갈리는 것**이 이 표의 요점이라 단계를 넓게 잡는다. */
const STAGES = [
  { name: '1항차',    gold: 200,       cargo: 0,      crew: 6,   ship: 'hulk',    note: '시작' },
  { name: '10항차',   gold: 1_169,     cargo: 900,    crew: 10,  ship: 'cog',     note: 'sim-stat 중앙값' },
  { name: '30항차',   gold: 14_396,    cargo: 6_000,  crew: 24,  ship: 'cog',     note: 'sim-stat 중앙값' },
  { name: '중반',     gold: 150_000,   cargo: 20_000, crew: 60,  ship: 'carrack', note: '' },
  { name: '회차22 실측', gold: 897_979, cargo: 0,     crew: 60,  ship: 'carrack', note: 'GRAND #17 그 자리' },
  { name: '패권 직전', gold: 5_000_000, cargo: 60_000, crew: 130, ship: 'galleon', note: '거점 총투자 912,630닢' },
];

/** 그 단계의 상태를 세운다 — 판정 함수가 `state`를 보므로 진짜로 앉힌다. */
function setStage(st) {
  resetGame();
  state.gold = st.gold;
  state.shipKey = st.ship;
  recalcShip();
  state.crew = st.crew;
  state.hp = state.maxHp;
  /* 화물가치는 `cargoValue()`가 `buyPrice`를 보고 세므로 곡물 한 품목으로 앉힌다
     (품목이 무엇인지는 상한 계산에 안 들어간다 — 총액만 본다). */
  state.cargo = {}; state.buyPrice = {};
  if (st.cargo > 0) {
    const per = GOOD_BY_ID.grain?.base ?? 20;
    const n = Math.max(1, Math.round(st.cargo / per));
    state.cargo.grain = n;
    state.buyPrice.grain = per;
  }
}

/** 노획 화물의 값 — 품목 수는 `spoilsGoodsLimit()`(내 갑판 사람 수)가 정하고,
    품목마다 평균 7개다. 값은 기준가(`base`)로 어림잡는다(파는 자리 시세는 모른다). */
function lootGoodsValue(e) {
  const lim = spoilsGoodsLimit();
  const ids = (e.loot.goods || []).slice(0, lim);
  let v = 0;
  for (const gid of ids) v += (GOOD_BY_ID[gid]?.base ?? 0) * meanQty;
  return { value: Math.round(v), items: ids.length };
}

/** 나포선의 값 — 끌고 갈 사람이 되면 선단에 들어오고(되팔면 `SHIP_RESALE`),
    모자라면 해체값(`PRIZE_SCRAP`)만 받는데 **그것도 상한을 받는다**(`capSpoils`). */
function prizeValue(e) {
  if (!e.prize || !SHIPS[e.prize]) return { value: 0, how: '—' };
  const s = SHIPS[e.prize];
  const need = prizeCrewNeed(e.prize);
  const spare = spareCrew();
  if (spare >= need) return { value: Math.round(s.price * SHIP_RESALE), how: `편입(되팔면 ${Math.round(SHIP_RESALE * 100)}%)` };
  return { value: capSpoils(Math.round(s.price * PRIZE_SCRAP)), how: `해체(사람 ${spare}/${need})` };
}

/** 세 문 — 한 등급에 대해 */
function doors(e) {
  const [lo, hi] = e.loot.gold;
  const coinMean = (capSpoils(lo) + capSpoils(hi)) / 2;     // battle.js가 lo~hi를 균등하게 뽑는다
  const g = lootGoodsValue(e);
  const p = prizeValue(e);

  const sink = Math.round(coinMean * MIRROR.sinkMult);
  const capCoin = Math.round(coinMean * MIRROR.captureMult);
  const capture = capCoin + g.value + p.value;

  /* 도주 — 금고 몫은 상한을 받고, 화물은 몫 그대로 나간다(상한 없음). */
  const fleeGold = capEncounterLoss(state.gold * ENCOUNTER_LOSS.fleeShare, e.crew, e.level);
  const fleeCargo = Math.round(cargoValue() * ENCOUNTER_LOSS.fleeCargoShare);

  /* 패배 — 금고 몫은 상한을 받고, **화물은 전량**이다.
     ⚠️ `battle.js`는 `B.foe.crew`(살아남은 적)로 재는데 여기서는 정원(`e.crew`)으로 잰다 —
       곧 이 표의 패배는 **가장 아픈 쪽**이다(적을 깎아 놓고 지면 덜 실어 간다). */
  const loseGold = capEncounterLoss(state.gold * ENCOUNTER_LOSS.loseShare, e.crew, e.level);
  const loseCargo = cargoValue();

  return {
    sink, capture, capCoin, goods: g, prize: p,
    flee: -(fleeGold + fleeCargo), fleeGold, fleeCargo,
    lose: -(loseGold + loseCargo), loseGold, loseCargo,
    cap: encounterLossCap(e.crew, e.level),
  };
}

const won = (n) => (n < 0 ? '−' : '+') + Math.abs(Math.round(n)).toLocaleString('ko-KR');
const plain = (n) => Math.round(n).toLocaleString('ko-KR');

/* ── 출력 ─────────────────────────────────────────────────────── */
const md = process.argv.includes('--md');
const out = [];
const say = (s = '') => out.push(s);

say(md ? '' : '═'.repeat(96));
say(`전리품 상한 SPOILS_SHARE ${SPOILS_SHARE} · TAIL ${SPOILS_TAIL} · FLOOR ${SPOILS_FLOOR}`);
say(`조우 손실   패배 ${ENCOUNTER_LOSS.loseShare} · 도주 ${ENCOUNTER_LOSS.fleeShare}`
  + ` · 상한 max(${ENCOUNTER_LOSS.floor}, 적선원×${ENCOUNTER_LOSS.perCrew}) · 꼬리 ${ENCOUNTER_LOSS.tail}`);
say();

for (const st of STAGES) {
  setStage(st);
  const capUp = spoilsCap();
  say(md ? `### ${st.name} — 금고 ${plain(st.gold)}닢 · 화물 ${plain(cargoValue())}닢 · 선원 ${st.crew} · ${SHIPS[st.ship].name}${st.note ? ` (${st.note})` : ''}`
        : `── ${st.name}  금고 ${plain(st.gold)} · 화물 ${plain(cargoValue())} · 선원 ${st.crew} · ${SHIPS[st.ship].name}  ${st.note}`);
  say(md ? `\n전리품 상한 \`spoilsCap()\` = **${plain(capUp)}닢** · 노획 품목 상한 ${spoilsGoodsLimit()}개\n`
        : `   spoilsCap ${plain(capUp)} · 노획 품목 ${spoilsGoodsLimit()}개`);
  if (md) {
    say('| 등급 | 적 | 승리(격침) | 승리(나포) | 도주 | 패배 | 손익분기 승률 `p*` | 손실 상한 |');
    say('|---|---|---:|---:|---:|---:|---:|---:|');
  } else {
    say('   등급  적                     격침       나포        도주        패배        p*');
  }
  for (let i = 0; i < ENEMIES.length; i++) {
    const e = ENEMIES[i];
    const d = doors(e);
    /* ⚠️ **크기로 견주지 않는다** — 도주는 −이고 나포는 +라 크기 비교는 부호를 지운다.
       실제 선택은 도박이므로 기준은 손익분기 승률이다(아래 §p* 주석). */
    const p = (d.flee - d.lose) / (d.capture - d.lose);
    const rtxt = p <= 0 ? '0%' : p >= 1 ? '싸울 수 없다' : `${(p * 100).toFixed(0)}%`;
    if (md) {
      say(`| ${e.level} | ${e.name} (선원 ${e.crew}) | ${won(d.sink)} | **${won(d.capture)}** | ${won(d.flee)} | ${won(d.lose)} | ${rtxt} | ${plain(d.cap)} |`);
    } else {
      say(`   ${e.level}     ${e.name.padEnd(20)} ${won(d.sink).padStart(9)} ${won(d.capture).padStart(10)}`
        + ` ${won(d.flee).padStart(11)} ${won(d.lose).padStart(11)}   ${rtxt.padStart(6)}`);
    }
  }
  if (md) {
    // 나포 보상의 속을 한 줄 더 — 금화·화물·배가 각각 얼마인가
    say('');
    say('<details><summary>나포 보상의 속</summary>\n');
    say('| 등급 | 노획 금화 | 노획 화물 | 나포선 | 합 |');
    say('|---|---:|---:|---|---:|');
    for (const e of ENEMIES) {
      const d = doors(e);
      say(`| ${e.level} | ${plain(d.capCoin)} | ${plain(d.goods.value)} (${d.goods.items}품목) | ${d.prize.value ? `${plain(d.prize.value)} · ${d.prize.how}` : '없다'} | ${plain(d.capture)} |`);
    }
    say('\n</details>');
  }
  say();
}

/* ── 실제로 붙는 적으로 가중한 기대값 ──────────────────────────
   위 표는 **등급마다 따로** 보여 준다. 그런데 플레이어가 만나는 적은 `foeOdds()`가 정한다
   (자산이 커질수록 거물이 붙는다). 그 분포로 가중해야 *"이 단계에서 한 조우가 평균 얼마인가"*가 나온다.
   ★ 그리고 그것을 **항차당**으로 환산한다 — 조우율 `q`(`sim-risk.mjs` 실효 18.2%)를 곱하면
     *"한 항차마다 조우가 평균 얼마를 떼 가나"*가 되고, 그것이 항차 순이익과 견줄 수 있는 유일한 값이다. */
const Q = 0.182;      // sim-risk.mjs 실효 조우율(교통량 가중). 값이 바뀌면 여기도 바꾼다.
const P_LATE = 2_322; // probe-fleet 24판 실측 후반 항차 순이익(ENCOUNTER_LOSS 주석의 그 값)

say();
say(md ? '### 실제로 붙는 적으로 가중한 기대값 (`foeOdds`)' : '── 실제로 붙는 적으로 가중 (foeOdds)');
if (md) {
  say('');
  say('| 단계 | 붙는 등급 분포 | 조우 1회 승리(나포) | 조우 1회 도주 | 조우 1회 패배 | 항차당 — 늘 도주 | **항차당 — 최선을 고름** |');
  say('|---|---|---:|---:|---:|---:|---:|');
}
for (const st of STAGES) {
  setStage(st);
  const odds = foeOdds();
  let win = 0, flee = 0, lose = 0, best = 0;
  ENEMIES.forEach((e, i) => {
    const d = doors(e);
    win += odds[i] * d.capture; flee += odds[i] * d.flee; lose += odds[i] * d.lose;
    /* ★ 「최선을 고름」 — 이길 수 있다고 **가정**하고 나포와 도주 중 나은 쪽을 고른다.
       이 게임의 전제(*"사람은 이길 수 있는 상대만 싸운다"*)를 값으로 옮긴 것이고,
       질 확률·선체 피해·수리비를 안 세므로 **플레이어에게 가장 관대한 상한**이다.
       이 상한조차 항차 순이익에 못 미치면 그때는 보상 쪽을 볼 근거가 생긴다. */
    best += odds[i] * Math.max(d.capture, d.flee);
  });
  const perVoyage = flee * Q, perBest = best * Q;
  const dist = odds.map((o, i) => (o > 0 ? `${i + 1}급 ${Math.round(o * 100)}%` : null)).filter(Boolean).join(' · ');
  if (md) {
    say(`| ${st.name} | ${dist} | ${won(win)} | ${won(flee)} | ${won(lose)} | ${won(perVoyage)} | **${won(perBest)}** |`);
  } else {
    say(`   ${st.name.padEnd(12)} 승 ${won(win).padStart(9)} · 도주 ${won(flee).padStart(10)} · 패 ${won(lose).padStart(10)}`
      + ` · 항차당 늘도주 ${won(perVoyage).padStart(9)} · 최선 ${won(perBest).padStart(9)}   [${dist}]`);
  }
}
say(md ? `\n> 후반 항차 순이익 실측 **${plain(P_LATE)}닢**(probe-fleet 24판 · 시장 깊이가 병목이라 선복을 늘려도 안 는다).`
       + ' 항차당 도주비용이 이 값을 넘으면 **무역만으로는 조우 비용을 못 갚는다** — 금고에 천장이 선다.'
       : `   ※ 후반 항차 순이익 실측 ${plain(P_LATE)}닢 — 항차당 도주비용이 이를 넘으면 금고에 천장이 선다`);

/* ── ★ 진짜 결정값 — 「몇 할을 믿어야 싸우나」 ────────────────────
   ⚠️ *"나포 보상이 도주 비용보다 큰가"*로 재면 **틀린 표가 나온다.** 도주는 −이고 나포는 +라
     둘을 크기로만 견주면 부호가 사라진다. 실제 선택은 도박이므로 기준은 **손익분기 승률**이다:
       `p × 나포 + (1−p) × 패배 = 도주`  ⇒  `p* = (도주 − 패배) / (나포 − 패배)`
     `p*`가 낮으면 *싸우는 것이 거의 언제나 옳다*, 높으면 *도박이다*.
   ★ 이 값이 이 게임의 전제(*"사람은 이길 수 있는 상대만 싸운다"*)를 수치로 옮긴 것이다. */
say();
say(md ? '### ★ 몇 할을 믿어야 싸우나 — 손익분기 승률 `p*`' : '── ★ 손익분기 승률 p* (이만큼 이길 것 같으면 싸운다)');
if (md) {
  say('');
  say('| 단계 | 등급 1 | 등급 2 | 등급 3 | 등급 4 | 등급 5 |');
  say('|---|---:|---:|---:|---:|---:|');
}
for (const st of STAGES) {
  setStage(st);
  const cells = ENEMIES.map((e) => {
    const d = doors(e);
    const p = (d.flee - d.lose) / (d.capture - d.lose);
    return p <= 0 ? '0%' : p >= 1 ? '싸울 수 없다' : `${(p * 100).toFixed(0)}%`;
  });
  say(md ? `| ${st.name} | ${cells.join(' | ')} |` : `   ${st.name.padEnd(12)} ${cells.map((c) => c.padStart(6)).join(' ')}`);
}
say(md ? '\n> `p*`가 낮을수록 「싸우는 것이 옳다」가 자명하다. 이 값이 단계마다 완만하게 오르면'
       + ' **부자가 될수록 싸움이 도박이 된다**는 뜻이고, 그것은 결함이 아니라 성장 곡선이다.'
       : '   ※ p*가 완만히 오르면 「부자가 될수록 싸움이 도박이 된다」 — 결함이 아니라 곡선이다');

/* ── 근거 밴드 대조 — `content/voyage-evidence.json: spoilsVsAssets` ────
   근거는 `[0.15, 1.0]`(가용자산 대비 **노획 금화**)인데 `tools/check-voyage.mjs`는
   `resetGame()` 직후 **시작 상태에서만** 잰다. 뒤 단계에서 그 밴드가 어디에 있는지를 여기서 낸다.
   ⚠️ **밴드를 벗어나는 것 자체는 결함이 아니다** — 나포 보상의 대부분이 금화가 아니라
     **화물과 배**로 옮겨 갔기 때문이다. 결함은 「근거가 그 사실을 안 적어 둔 것」이다. */
const BAND = [0.15, 1.0];
say();
say(md ? '### 근거 밴드 `spoilsVsAssets` [0.15, 1.0] 대조 — 노획 **금화**만' : '── 근거 밴드 spoilsVsAssets [0.15,1.0] 대조 (노획 금화만)');
if (md) { say(''); say('| 단계 | 노획 금화 기댓값 | 가용자산 | 비 | 밴드 |'); say('|---|---:|---:|---:|---|'); }
for (const st of STAGES) {
  setStage(st);
  const odds = foeOdds();
  let coin = 0;
  ENEMIES.forEach((e, i) => { const [lo, hi] = e.loot.gold; coin += odds[i] * (capSpoils(lo) + capSpoils(hi)) / 2; });
  const assets = state.gold + cargoValue();
  const r = coin / assets;
  const verdict = r < BAND[0] ? `밴드 아래 (${(BAND[0] / r).toFixed(0)}배)` : r > BAND[1] ? '밴드 위' : '✔';
  say(md ? `| ${st.name} | ${plain(coin)} | ${plain(assets)} | ${r.toFixed(4)} | ${verdict} |`
         : `   ${st.name.padEnd(12)} 금화 ${plain(coin).padStart(7)} · 자산 ${plain(assets).padStart(10)} · 비 ${r.toFixed(4)}  ${verdict}`);
}

/* ── 격침 vs 나포 — 회차 22가 잰 「+180닢」이 어느 쪽이었나 ────── */
say();
say(md ? '### 격침으로 이기면 얼마를 버리나' : '── 격침으로 이기면 얼마를 버리나 (나포 − 격침)');
if (md) { say(''); say('| 단계 | 등급 1 | 등급 3 | 등급 5 |'); say('|---|---:|---:|---:|'); }
for (const st of STAGES) {
  setStage(st);
  const cells = [1, 3, 5].map((lv) => {
    const d = doors(ENEMIES[lv - 1]);
    return `${plain(d.sink)} → ${plain(d.capture)} (${(d.capture / Math.max(1, d.sink)).toFixed(1)}배)`;
  });
  say(md ? `| ${st.name} | ${cells.join(' | ')} |` : `   ${st.name.padEnd(12)} ${cells.join('   ')}`);
}

console.log(out.join('\n'));
