// ships.mjs — 선박 계측 (출력이 없는 순수 로직)
//
// 이 폴더의 규약대로 **규칙을 다시 구현하지 않는다.** 건조 가능 여부는 `sellsShip`을,
// 값은 `shipPriceAt`을 게임 코드에서 그대로 불러 쓴다. 그래야 "대시보드에서는 지을 수 있는데
// 게임에서는 안 되는" 상태가 안 생긴다.
//
// 이 탭이 답해야 하는 질문은 넷이다:
//   ① 이 바다에는 어떤 배가 있는가 (권역별 명부)
//   ② 그 배를 **어디서** 지을 수 있는가 (전통 조선지 ↔ 실제 건조 가능 항구)
//   ③ 화물칸·속력·값이 다른 바다 배들과 견주어 어디쯤인가
//   ④ 해금 사슬은 어떻게 이어지는가 (requires)

import { SHIPS, CITIES, CITY_BY_ID } from '../js/data.js';
import { resetGame, sellsShip, shipPriceAt, industryOf } from '../js/state.js';
import { REGION_BY_ID } from '../js/regions/index.js';

/** 이 배가 실제로 건조 가능한 항구들 — `sellsShip`을 항구마다 그대로 물어본다.
    ★ `yards`(전통 조선지)와 다르다. yards는 **값 할인**이고, 건조 가능은 공업력이 정한다.
      둘이 어긋나는 것이 이 표의 볼거리다 — 기니 해안 카누를 몸바사에서 짓는 식. */
export function buildablePorts(key) {
  const out = [];
  for (const c of CITIES) {
    if (sellsShip(key, c.id)) {
      out.push({ id: c.id, name: c.name, region: c.region, price: shipPriceAt(key, c.id) });
    }
  }
  return out;
}

/** 선종 한 줄 — 데이터 + 계측을 합친다 */
function shipRow(key, s, opts = {}) {
  const ports = opts.skipPorts ? null : buildablePorts(key);
  const yards = (s.yards ?? []).map((id) => CITY_BY_ID[id]?.name ?? id);
  // 전통 조선지가 아닌 곳에서 지을 수 있는 수 — 이 값이 크면 "이 바다의 배"라는 말이 무색해진다
  const strayPorts = ports && s.yards?.length
    ? ports.filter((p) => !s.yards.includes(p.id))
    : null;
  return {
    key,
    ...s,
    regionName: REGION_BY_ID[s.home]?.name ?? s.home,
    yardNames: yards,
    ports,
    portCount: ports?.length ?? null,
    strayCount: strayPorts?.length ?? null,
    // 한 칸을 나르는 데 드는 값 — 배들을 화물선으로 견주는 잣대
    perCargo: s.cargo ? Math.round(s.price / s.cargo) : null,
    // 한 칸당 몇 사람이 필요한가 — 낮을수록 사람이 덜 든다(복선이 여기서 빛난다)
    crewPerCargo: s.cargo ? +(s.crewMin / s.cargo).toFixed(3) : null,
  };
}

/** 전 선종. `withPorts`가 false면 항구 훑기를 건너뛴다(60선종 × 175항구라 무겁다). */
export function allShips({ withPorts = true } = {}) {
  resetGame();
  return Object.entries(SHIPS)
    .map(([k, s]) => shipRow(k, s, { skipPorts: !withPorts }))
    .sort((a, b) => (a.tier - b.tier) || (a.price - b.price));
}

/** 권역별 요약 — 몇 척이 있고 어느 등급까지 있는가 */
export function regionSummary(rows) {
  const by = {};
  for (const r of rows) {
    const g = (by[r.home] ||= {
      region: r.home, name: r.regionName, n: 0,
      tierMax: 0, cargoMax: 0, priceMax: 0, cargoSum: 0, hidden: 0,
    });
    g.n++;
    g.tierMax = Math.max(g.tierMax, r.tier);
    g.cargoMax = Math.max(g.cargoMax, r.cargo);
    g.priceMax = Math.max(g.priceMax, r.price);
    g.cargoSum += r.cargo;
    if (r.requires) g.hidden++;
  }
  return Object.values(by)
    .map((g) => ({ ...g, cargoAvg: Math.round(g.cargoSum / g.n) }))
    .sort((a, b) => b.n - a.n);
}

/** 해금 사슬 — `requires`가 이어지는 줄기 */
export function unlockChains(rows) {
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  const chains = [];
  for (const r of rows) {
    if (!r.requires) continue;
    const chain = [r];
    let cur = r;
    const seen = new Set([r.key]);
    while (cur?.requires && !seen.has(cur.requires)) {
      seen.add(cur.requires);
      cur = byKey[cur.requires];
      if (cur) chain.unshift(cur);
    }
    chains.push(chain);
  }
  return chains;
}

/** 공업력이 몇인 항구가 몇 곳인가 — 어느 등급 배가 어디까지 퍼지는지의 바탕 */
export function industrySpread() {
  resetGame();
  const tally = {};
  for (const c of CITIES) {
    const n = industryOf(c.id);
    (tally[n] ||= { industry: n, ports: [] }).ports.push({ name: c.name, region: c.region });
  }
  return Object.values(tally).sort((a, b) => b.industry - a.industry);
}
