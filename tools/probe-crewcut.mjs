/* 선원 사무역(P4-a)이 **어느 단계에서** 얼마를 가져가나 — 초반 압박을 과하게 키우지 않았는지.
   ★ `probe-circuit`에서 여섯 항구 회로가 127닢/일 → −1로 무너지는 것을 보고 만든 도구다.
     그 회로는 시작 금화 200닢에서 `gold × 0.92`를 밑천으로 굴리므로, 이익에 붙는 몇 %가
     **복리의 씨앗**을 갉아 회로가 아예 안 도는 자리가 생긴다.
   node tools/probe-crewcut.mjs */
import { state, resetGame, privateTradeCut, shorthanded, hire, boardShip } from '../js/state.js';
import { SHIPS, PRIVATE_TRADE } from '../js/data.js';

console.log(`perCrew ${PRIVATE_TRADE.perCrew} · cap ${PRIVATE_TRADE.cap}\n`);
console.log('배             crewMin  crewMax  가득 태우면   최소 인원이면');
for (const k of ['hulk', 'cocca', 'caravel', 'fluyt', 'carrack', 'galleon', 'indiaman']) {
  const s = SHIPS[k];
  if (!s) continue;
  console.log(`${s.name.padEnd(14)} ${String(s.crewMin ?? 0).padStart(6)} ${String(s.crewMax ?? 0).padStart(8)}`
    + `   ${(privateTradeCut(s.crewMax ?? 0) * 100).toFixed(1).padStart(6)}%`
    + `   ${(privateTradeCut(s.crewMin ?? 0) * 100).toFixed(1).padStart(9)}%`);
}
resetGame();
while (shorthanded()) if (!hire(1).ok) break;
console.log(`\n실제 시작 배(${SHIPS[state.shipKey].name})에 최소 인원을 채우면 선원 ${state.crew}명 → `
  + `${(privateTradeCut() * 100).toFixed(1)}%`);
