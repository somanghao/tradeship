// check-factions.mjs — 세력 관계(SPEC-factions 1단계)의 회귀 검증
//
//   node tools/check-factions.mjs
//
// ★ 이 저장소의 규약대로 **실패는 코드와 근거가 어긋나거나 규칙이 자기모순인 경우뿐**이다 —
// "근거가 아직 없는 것"으로는 실패시키지 않는다(콘텐츠를 막지 않는다).
//
// 이 회차가 넣은 것은 **움직이는 것 둘 · 무는 것 둘**뿐이라, 검사도 그 넷과
// **넷이 건드리면 안 되는 것 하나**(세율·조우)를 본다. 다섯째가 이 파일의 존재 이유다 —
// 관계가 세율이나 조우에 손을 대는 순간 악명과 **이중과세**가 되고,
// 그러면 곡선이 조용히 꺾이는데 아무도 그 원인을 못 찾는다.
//
//   ① 값이 실재하는가            (깃발·도시·품목·항로·seats ≤ 3 · 간선의 세력 id)
//   ② 함대가 진짜 그 얼굴인가    (`FACTIONS[].fleets` ↔ `FOES` · **동아시아 등급 5는 무국적**)
//   ③ 덮치면 내려가는가          (악명이 관계로 읽힌다 — 새 배선 0)
//   ④ 일감으로 오르는가          (완수 +1 · 상한 +6 · 회사는 0에서 안 오른다)
//   ⑤ ★ 세율·조우가 안 움직이는가 (**이중과세 금지의 증거**)
//   ⑥ 무는 것 둘이 무는가        (눈총 → 일감이 빈다 · 원수 → 문서를 안 판다)
//   ⑦ 삭는가                      (90일마다 한 칸씩 0 쪽으로 · 양수도 음수도)
//   ⑧ 저장·이어하기에서 살아남는가
//
// ★ 곡선은 여기서 안 잰다 — `sim-stat.mjs`는 시드가 없어 같은 코드로도 5,522~12,647을 오간다.
//   1단계를 잴 때는 **같은 시드로 짝지어**(paired) 두 나무를 돌렸다: 나무 하나의
//   `contractFactionOK`를 `true`, `sellBlocked`를 `null`, `contractOffer`의 `by`를 `null`로 눌러
//   「세력을 끈 판」을 만들고 20쌍을 비교했다 — 30·60항차 총자산·ROI **전부 0.000%**(다른 판 0/20).
//   2단계(웃돈·가로채기·정기선단)가 오면 그때는 `sim-factions.mjs`로 정면으로 재야 한다(SPEC §8-5).

import { FACTIONS, FACTION_TIES, REGARD, FLAG_NAME, CITY_BY_ID, GOOD_BY_ID,
         ROUTE_RISK, FOES_BY_REGION } from '../js/data.js';
import {
  state, resetGame, addInfamy, addRegard, regardOf, regardRaw, regardBand,
  factionOfCity, factionsOfCity, metFactions, contractOffer, acceptContract,
  deliverContract, buyService, decayRegard, tariffRate, encounterOdds, fleeOdds,
  infamyWeight, advanceDays,
} from '../js/state.js';

let PASS = 0, FAIL = 0;
const ok = (c, msg) => {
  if (c) PASS++; else { FAIL++; process.exitCode = 1; }
  console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`);
};
process.on('exit', () => console.log(`
세력 관계 — ${PASS}/${PASS + FAIL} 통과${FAIL ? ` · **실패 ${FAIL}건**` : ''}`));

const FIDS = Object.keys(FACTIONS);
resetGame();

/* ── ① 값이 실재하는가 ──────────────────────────────────────── */
{
  const bad = [];
  for (const [id, f] of Object.entries(FACTIONS)) {
    for (const fl of f.flags) if (!FLAG_NAME[fl]) bad.push(`${id}.flags ${fl}`);
    for (const c of [...f.seats, ...f.grip.cities]) if (!CITY_BY_ID[c]) bad.push(`${id} 도시 ${c}`);
    for (const g of f.grip.goods) if (!GOOD_BY_ID[g]) bad.push(`${id} 품목 ${g}`);
    for (const r of f.grip.routes) {
      // ★ `riskKey`는 [a,b].sort().join('|')이다 — 손으로 뒤집어 적으면 영영 안 걸린다
      if (r !== r.split('|').sort().join('|')) bad.push(`${id} 항로 정렬 ${r}`);
      if (ROUTE_RISK[r] === undefined) bad.push(`${id} 항로 없음 ${r}`);
    }
    if (f.seats.length > 3) bad.push(`${id} seats ${f.seats.length}`);
  }
  ok(!bad.length, `열 세력의 깃발·도시·품목·항로가 전부 실재한다 ${bad.length ? `— ${bad.join(', ')}` : ''}`);

  const ids = new Set(FIDS);
  const tie = [];
  for (const [axis, list] of Object.entries(FACTION_TIES)) {
    for (const [a, b] of list) {
      if (!ids.has(a)) tie.push(`${axis} ${a}`);
      if (b !== '*' && !ids.has(b)) tie.push(`${axis} ${b}`);
    }
  }
  ok(!tie.length, `간선 세 축(싸움 ${FACTION_TIES.war.length} · 돈 ${FACTION_TIES.money.length}`
    + ` · 배제 ${FACTION_TIES.exclude.length})의 세력 id가 전부 실재한다`);
  // ★ 나에게 오는 실선이 하나도 없어야 한다 — 싸움 축에 '*'(바깥 전부)가 들어가면 그 규약이 깨진다
  ok(FACTION_TIES.war.every(([a, b]) => a !== '*' && b !== '*'),
    '싸움 축은 전부 세력끼리다 — 나에게 오는 실선이 하나도 없다');

  ok(FIDS.filter((id) => FACTIONS[id].side === 'trade').length === 5
     && FIDS.filter((id) => FACTIONS[id].side === 'gate').length === 5,
    '두 열 × 다섯 행 — 「사고파는 자」 다섯, 「문을 쥔 자」 다섯');
  ok(FIDS.filter((id) => FACTIONS[id].sells === 'nothing').length === 1,
    '★ 아무것도 안 파는 세력은 하나뿐이다 (회사)');
}

/* ── ② 함대가 진짜 그 얼굴인가 ─────────────────────────────── */
{
  const bad = [];
  for (const [id, f] of Object.entries(FACTIONS)) {
    for (const x of f.fleets) {
      const foe = FOES_BY_REGION[x.region]?.[x.tier - 1];
      if (!foe) { bad.push(`${id} ${x.region} t${x.tier} 없음`); continue; }
      if (foe.name !== x.name) bad.push(`${id} 이름 어긋남 ${foe.name}≠${x.name}`);
      // 깃발이 그 세력의 것이어야 한다 — 아니면 코드와 문서가 어긋난 것이다
      if (!f.flags.includes(foe.flag)) bad.push(`${id} 깃발 어긋남 ${foe.flag}`);
    }
  }
  ok(!bad.length, `세력의 함대가 전부 실재하는 얼굴이다 — 새 적을 한 척도 안 만들었다`
    + `${bad.length ? ` — ${bad.join(', ')}` : ''}`);

  /* ★★ 회귀 감시 — **동아시아만 등급 5가 무국적이고 등급 4가 관이다.**
     밸런스 정리 때 조용히 뒤집히면 소설 28·64·68장의 뼈대가 무너진다. */
  ok(FOES_BY_REGION.eastasia[4].flag === 'pirate',
    `동아시아 등급 5는 무국적이다 — 「${FOES_BY_REGION.eastasia[4].name}」 (집의 바다에만 세력이 없다)`);
  ok(FOES_BY_REGION.eastasia[3].flag === 'ming',
    `동아시아 등급 4는 관이다 — 「${FOES_BY_REGION.eastasia[3].name}」`);
}

/* ── 임자 판정 ──────────────────────────────────────────────── */
{
  const want = { venezia: 'venezia', sevilla: 'casa', danzig: 'hanse', goa: 'estado',
                 ambon: 'company', brugge: 'hanse', melaka: 'openport', busanpo: null };
  const got = Object.fromEntries(Object.keys(want).map((c) => [c, factionOfCity(c)]));
  ok(Object.entries(want).every(([c, f]) => got[c] === f),
    `임자가 겹치는 자리도 갈린다 — 세비야=${got.sevilla} · 단치히=${got.danzig} · 암본=${got.ambon}`
    + ` · 부산포=${got.busanpo}(조선의 바다에는 세력이 없다)`);
  ok(factionsOfCity('sevilla').length === 2 && factionsOfCity('ambon').length === 2,
    '한 도시에 둘이 걸리는 자리를 그대로 들고 있다 (세비야 · 암본)');
  ok(metFactions().length === 1 && metFactions()[0] === 'venezia',
    `새 판에서 만난 세력은 하나다 — 관계도는 바다를 넓힐수록 자란다 (${metFactions().length}/10)`);
}

/* ── ③ 덮치면 내려간다 (악명을 그대로 읽는다) ───────────────── */
{
  resetGame();
  const before = regardOf('estado');
  addInfamy('portugal', 3);                   // map.js 477행이 하는 일 그대로
  const after = regardOf('estado');
  ok(before === 0 && after === -3,
    `포르투갈 상선을 세 번 덮쳤다 → 에스타두 ${before} → ${after} (새 배선 없이 악명이 그대로 읽힌다)`);
  ok(regardRaw('estado') === 0 && infamyWeight('estado') === 3,
    '장부(raw)는 0인 채고 악명만 얹혀 있다 — 저장이 둘인 이유가 그것이다');
  ok(regardOf('company') === 0,
    '★ 포르투갈을 털어도 회사는 안 내려간다 — 암본은 포르투갈 깃발인데 회사가 앉아 있다');
  ok(regardOf('fugger') === 0 && infamyWeight('fugger') === 0,
    '★ 푸거는 깃발이 없어 덮칠 수가 없다 — 돈으로 하는 싸움은 칼로 안 풀린다');
  ok(regardBand('estado').name === '눈총' && regardBand('company').name === '모른다',
    `다섯 칸으로 읽힌다 — 에스타두 「${regardBand('estado').name}」`);
}

/* ── ④ 일감으로 오른다 ─────────────────────────────────────── */
{
  resetGame();
  for (let i = 0; i < 9; i++) addRegard('estado', 1, 'contract');
  ok(regardRaw('estado') === REGARD.contractCap,
    `일감만으로는 +${REGARD.contractCap}에서 멈춘다 (아홉 번 해내도 ${regardRaw('estado')}) — 일은 신뢰이지 동무가 아니다`);
  addRegard('estado', 2, 'gift');
  ok(regardRaw('estado') === 8, '다른 이유로는 그 위로도 오른다 (상한은 이유마다 갈린다)');

  addRegard('company', 5, 'contract');
  ok(regardRaw('company') === 0,
    '★ 회사는 0 위로 못 올라간다 — 살 것이 없으니 거래로 못 올린다');
  addRegard('company', -4, 'raid');
  ok(regardRaw('company') === -4, '회사도 내려가기는 한다 — 0에서 아래로만 움직인다');

  // 실제 계약 한 건을 끝까지 굴려 본다 (배선이 진짜 걸려 있는가)
  resetGame();
  state.crew = 10;
  // ★ 새 판은 부산포에서 시작한다 — **조선의 항구에는 임자가 없어** 일감에 `by`가 안 붙는다.
  //   그 자체가 이 설계의 한 줄이므로(집의 바다에는 세력이 없다) 세력이 있는 항구로 옮겨 잰다.
  ok(contractOffer('busanpo')?.by == null, '조선의 항구는 임자가 없다 — 일감이 지금까지와 똑같이 굴러간다');
  state.at = 'venezia';
  state.cargoCap = 200;             // 베네치아의 일감은 낡은 바사에 안 들어간다 — 칸만 늘려 배선을 본다
  const o = contractOffer('venezia');
  ok(o?.by === 'venezia', `일감에 임자가 적힌다 — ${o?.by}`);
  const r = acceptContract();
  if (r.ok) {
    state.at = state.contract.to;
    state.cargo[state.contract.goodId] = state.contract.qty;
    const d = deliverContract();
    ok(d.ok && regardRaw('venezia') === 1,
      `납품하면 그 세력이 적어 둔다 — 베네치아 ${regardRaw('venezia')} (${d.regard ? '항해일지에도 남는다' : '기록 없음'})`);
  } else {
    ok(false, `계약을 못 맡았다 — ${r.reason}`);
  }
}

/* ── ⑤ ★ 이중과세가 없다 ───────────────────────────────────── */
{
  resetGame();
  const city = 'goa';                       // 에스타두의 앉은 자리
  state.at = city;
  const t0 = tariffRate(city);
  const e0 = encounterOdds({ from: city, to: 'cochin' });
  const f0 = fleeOdds({ range: 78, foeHull: 200, mySail: 6, foeSail: 7 });

  addRegard('estado', -10, 'test');          // 바닥까지 내린다 (악명은 0 그대로)
  ok(regardOf('estado') === -10 && infamyWeight('estado') === 0,
    '관계만 −10으로 내렸다 (악명은 0 — 두 눈금을 갈라 재려는 것이다)');

  const t1 = tariffRate(city);
  const e1 = encounterOdds({ from: city, to: 'cochin' });
  const f1 = fleeOdds({ range: 78, foeHull: 200, mySail: 6, foeSail: 7 });
  ok(t0 === t1, `세율이 한 자리도 안 움직였다 — ${(t0 * 100).toFixed(3)}% → ${(t1 * 100).toFixed(3)}%`);
  ok(e0 === e1, `조우 확률이 안 움직였다 — ${(e0 * 100).toFixed(2)}%p → ${(e1 * 100).toFixed(2)}%p`);
  ok(f0 === f1, `도주 성공률이 안 움직였다 — ${(f0 * 100).toFixed(1)}% → ${(f1 * 100).toFixed(1)}%`);

  /* 반대쪽도 본다 — 악명은 **여전히** 세율을 올려야 한다(관계가 그 자리를 뺏지 않았다는 증거) */
  resetGame();
  state.at = city;
  const b0 = tariffRate(city);
  addInfamy('portugal', 4);
  const b1 = tariffRate(city);
  ok(b1 > b0, `악명은 그대로 세율을 올린다 — ${(b0 * 100).toFixed(2)}% → ${(b1 * 100).toFixed(2)}%`
    + ' (관계는 그 자리를 대신하지 않는다)');
}

/* ── ⑥ 무는 것 둘 ──────────────────────────────────────────── */
{
  resetGame();
  ok(!!contractOffer('goa'), '관계가 0이면 일감은 지금까지와 똑같이 걸린다');
  addRegard('estado', -1, 'test');
  ok(contractOffer('goa') === null && contractOffer('busanpo') !== undefined,
    '눈총(−1)이 되자 그 세력 도시의 상관 게시판이 빈다 — 값이 아니라 동선을 문다');
  ok(!!contractOffer('venezia'), '다른 세력의 항구는 그대로다 — 일감을 찾아 다른 바다로 가면 된다');

  // 문서 — 원수(−6)면 안 판다
  resetGame();
  state.at = 'goa';
  state.gold = 99999;
  const cartaz = { id: 'x', name: '카르타스 서기', service: 'permit', fee: [150, 400] };
  const r0 = buyService(cartaz, 'goa');
  ok(r0.ok, '관계가 0이면 문서는 팔린다');
  resetGame();
  state.at = 'goa'; state.gold = 99999;
  addRegard('estado', -6, 'test');
  const r1 = buyService(cartaz, 'goa');
  ok(!r1.ok && /고아의 총독/.test(r1.reason),
    `원수(−6)가 되자 문서를 안 판다 — “${r1.reason}”`);
  // 중개인 — 걸릴 일감이 없는 항구에서 갱신을 팔면 돈만 받는 꼴이 된다
  resetGame();
  state.at = 'goa'; state.gold = 99999;
  addRegard('estado', -2, 'test');
  const broker = { id: 'y', name: '중개인', service: 'contract', fee: [40, 90] };
  const rb = buyService(broker, 'goa');
  ok(!rb.ok && state.gold === 99999,
    '게시판이 빈 항구에서는 일감 갱신도 안 판다 — 값을 받기 전에 거절한다');

  // ⚠️ 파는 것이 다른 세력은 이 규칙에 안 걸린다
  resetGame();
  state.at = 'makassar'; state.gold = 99999;
  addRegard('openport', -9, 'test');
  ok(buyService(cartaz, 'makassar').ok,
    '★ 여는 항구는 아무것도 안 묻는다 — 관계가 −9여도 막을 문이 없다(무엇을 파느냐로 갈린다)');
}

/* ── ⑦ 삭는다 ──────────────────────────────────────────────── */
{
  resetGame();
  addRegard('estado', -4, 'test');
  addRegard('venezia', 3, 'test');
  decayRegard(REGARD.decayDays);
  ok(regardRaw('estado') === -3 && regardRaw('venezia') === 2,
    `${REGARD.decayDays}일마다 한 칸씩 0 쪽으로 — 음수도 양수도 (에스타두 ${regardRaw('estado')} · 베네치아 ${regardRaw('venezia')})`);
  decayRegard(REGARD.decayDays * 5);
  ok(regardRaw('estado') === 0 && state.regard.estado === undefined,
    '끝은 파산이 아니라 무관심이다 — 0이 되면 장부에서 지운다');

  // 항해가 실제로 삭힌다 (배선 확인)
  resetGame();
  state.crew = 10;
  addRegard('estado', -5, 'test');
  advanceDays(REGARD.decayDays);
  ok(regardRaw('estado') === -4, `항해가 날을 세면 관계도 삭는다 (${regardRaw('estado')})`);
}

/* ── ⑧ 저장·이어하기 ───────────────────────────────────────── */
{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const { saveGame, loadGame } = await import('../js/save.js');

  resetGame();
  addRegard('estado', -4, 'test');
  addRegard('venezia', 2, 'contract');
  addInfamy('portugal', 2);
  state._regardAge = 37;
  const before = { e: regardOf('estado'), v: regardOf('venezia'), age: state._regardAge };
  ok(saveGame().ok, '판이 저장된다');

  resetGame();
  ok(regardRaw('estado') === 0, '새 판은 관계가 비어 있다');
  ok(loadGame(), '판을 이어한다');
  ok(regardOf('estado') === before.e && regardOf('venezia') === before.v
     && state._regardAge === before.age,
    `이어하기에서 관계가 그대로다 — 에스타두 ${regardOf('estado')} · 베네치아 ${regardOf('venezia')}`
    + ` · 삭음 ${state._regardAge}일`);

  /* 옛 세이브에는 `regard`가 없다 — 비어 있어도 뜻이 통해야 한다(`save.js: FILL_IF_MISSING`) */
  const blob = JSON.parse(store.get('tradeship:save:v1'));
  delete blob.state.regard; delete blob.state._regardAge;
  store.set('tradeship:save:v1', JSON.stringify(blob));
  ok(loadGame() && typeof state.regard === 'object' && state._regardAge === 0,
    '★ 옛 세이브(관계가 없던 판)도 열린다 — 아무도 나를 모르는 것으로 이어진다');
  ok(regardOf('estado') === -2,
    `그 판에서도 악명은 그대로 읽힌다 — 에스타두 ${regardOf('estado')} (덮친 값은 infamy에 남아 있다)`);
}
