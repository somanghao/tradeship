/* 한 항구에서 낡은 바사로 무엇을 팔 수 있나 — 「첫 배까지」가 안 서는 시작 항구를 진단한다.
   node tools/probe-port.mjs <항구id> [금화] */
import {
  state, resetGame, neighborsOf, voyageDays, voyageCost, hire, shorthanded,
} from '../js/state.js';
import { planFor } from './sim-core.mjs';
import { CITY_BY_ID, GOOD_BY_ID } from '../js/data.js';
import { isOceanLane } from '../js/regions/index.js';

const AT = process.argv[2] || 'hormuz';
const GOLD = +(process.argv[3] || 200);
resetGame();
state.at = AT; state.fleet[state.shipKey].at = AT;
state.gold = 1e9;
while (shorthanded()) if (!hire(1).ok) break;
state.gold = GOLD;

const c = CITY_BY_ID[AT];
console.log(`■ ${c.name} (${c.region} · size${c.size}) 금화 ${GOLD}닢 · ${state.shipKey} 적재 ${state.cargoCap} · 선원 ${state.crew}`);
console.log(`  산 ${Object.entries(c.supply ?? {}).map(([k, v]) => `${GOOD_BY_ID[k]?.name}:${v}`).join(' ')}`);
console.log(`  수 ${Object.entries(c.demand ?? {}).map(([k, v]) => `${GOOD_BY_ID[k]?.name}:${v}`).join(' ')}\n`);
for (const to of neighborsOf(AT)) {
  const d = voyageDays(AT, to);
  const p = planFor(to, state.cargoCap, GOLD, 0);
  const cost = voyageCost(d).total;
  const net = p.gain - p.spend - cost;
  const take = Object.entries(p.take).map(([g, n]) => `${GOOD_BY_ID[g]?.name}${n}`).join(' ') || '(못 산다)';
  console.log(`  → ${(CITY_BY_ID[to]?.name ?? to).padEnd(10)} ${String(d).padStart(2)}일`
    + `${isOceanLane(AT, to) ? ' [원양]' : '      '} 순이익 ${String(Math.round(net)).padStart(6)}닢`
    + ` (매입 ${Math.round(p.spend)} · 항해비 ${Math.round(cost)})  ${take}`);
}
