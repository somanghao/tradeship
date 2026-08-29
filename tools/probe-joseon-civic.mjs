// probe-joseon-civic.mjs — 한반도 엔딩 `homelandProgress().docks 0/9`의 실측 (회차 24 GAME ★주과녁)
//
//   node tools/probe-joseon-civic.mjs [판수] [항차] [only=world|eastasia]
//
// ★ 회차 23 GRAND #20은 "전리품만 팔았더니 4항구 183~513닢"이었다 — 정상 장사가 아니다.
//   이 도구는 `sim-core`의 탐욕 전략(최적에 가까운 정상 무역)으로 재는 **1단계·2단계**다:
//   ① 조선 아홉 항구 각각에 실제로 얼마가 쌓이나(직접 낸 것 + 나라 몫 spill 둘 다)
//   ② 그 속도로 몇 항차·며칠이면 9/9에 닿는가(또는 안 닿는가)
//   두 변형을 함께 잰다 — `world`(이웃 전부, 이문 따라 어디든 감) · `eastasia`(동아시아 41항구로만 묶어
//   "고향 바다를 못 벗어나는" 초반 플레이를 흉내낸다).
import { runSim } from './sim-core.mjs';
import { state, civicOf, civicRoom, duesOf } from '../js/state.js';
import { CIVIC, CITY_BY_ID } from '../js/data.js';

const N = +(process.argv[2] || 8);
const V = +(process.argv[3] || 120);
const ONLY = process.argv[4] || 'world';

const JOSEON = ['mapo', 'busanpo', 'uiju', 'gunsan', 'gangjin', 'yeosu', 'jeju', 'naeipo', 'yeompo'];
const EASTASIA = 'guangzhou,macau,yuegang,quanzhou,fuzhou,ningbo,shuangyu,mapo,busanpo,hakata,hirado,nagasaki,bonotsu,sakai,naha,keelung,manila,cebu,shanghai,nanjing,dengzhou,tianjin,wenzhou,chaozhou,penghu,qiongzhou,uiju,gunsan,gangjin,yeosu,jeju,naeipo,yeompo,tsushima,akamagaseki,onomichi,osaka,tsuruga,sado,kagoshima,tayouan'.split(',');
const HOMELOOP = [...JOSEON, 'tsushima', 'hakata', 'dengzhou'];
const only = ONLY === 'eastasia' ? new Set(EASTASIA)
  : ONLY === 'homeloop' ? new Set(HOMELOOP)
  : null;

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };

console.log(`── probe-joseon-civic ── ${N}판 × ${V}항차 · only=${ONLY} ──`);
console.log(`CIVIC.dues=[${CIVIC.dues}] (index=지금 공업력) · spill.keep=${CIVIC.spill.keep}`);

const perPort = Object.fromEntries(JOSEON.map((id) => [id, []]));
const doneCount = [];
const daysArr = [];
const totalNat = [];

const voyArr = [];
for (let i = 0; i < N; i++) {
  const { rows } = runSim({ maxVoyages: V, only });
  voyArr.push(rows.length);
  daysArr.push(state.day);
  let done = 0, nat = 0;
  for (const id of JOSEON) {
    const paid = duesOf(id);
    const civic = civicOf(id);
    perPort[id].push({ paid, civic, base: CITY_BY_ID[id].industry ?? 0 });
    nat += paid;
    if (civic > 0) done++;
  }
  doneCount.push(done);
  totalNat.push(nat);
}

console.log(`\n실제 항차 수 중앙값 ${med(voyArr)}/${V} (판별 ${voyArr.join(' ')})`);
console.log(`마지막 날 중앙값 ${med(daysArr)}일`);
console.log(`조선 아홉 항구 낸 세 총합 중앙값 ${med(totalNat).toLocaleString('en-US')}닢`);
console.log(`civicOf>0 항구 수 중앙값 ${med(doneCount)}/9  (판별 ${doneCount.join(' ')})\n`);

console.log('항구별 (낸 세 중앙값 / civic 중앙값 / base):');
for (const id of JOSEON) {
  const rows = perPort[id];
  const paidMed = med(rows.map((r) => r.paid));
  const civicMed = med(rows.map((r) => r.civic));
  const base = rows[0].base;
  const need = CIVIC.dues[Math.min(base, CIVIC.dues.length - 1)];
  console.log(`  ${(CITY_BY_ID[id].name).padEnd(6)} base=${base}  낸세 ${String(Math.round(paidMed)).padStart(7)}닢`
    + `  (문턱 ${need.toLocaleString('en-US')})  civic=${civicMed}  판별[${rows.map((r) => Math.round(r.paid)).join(' ')}]`);
}
