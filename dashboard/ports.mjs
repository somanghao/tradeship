// ports.mjs — 항구별 실태 계측 (출력이 없는 순수 로직)
//
// dash.js·pirates.mjs·wages.mjs와 같은 원칙: **여기서 규칙을 다시 구현하지 않는다.**
// 교역품 수치는 `js/data.js: CITY_TRADE`, 공업력·좌표는 `js/map/geo.js: CITY_GEO`,
// 입항세·시장 깊이·조선소 판정은 `js/state.js`가 정본이고 여기서는 읽어 모을 뿐이다.
//
// 이 탭이 답해야 하는 질문:
//   ① 이 항구는 무엇을 팔고 무엇을 사는가 — 그리고 **그중 무엇이 믿을 만한가**
//   ② 배를 지을 수 있는가 (공업력)
//   ③ 그 도시의 살림 규모는 어느 정도인가 (부동산은 아직 게임 기능이 아니라 스케일 기준점)

import { CITIES, GOOD_BY_ID, SHIPS, TARIFF, CITY_TARIFF } from '../js/data.js';
import { CITY_GEO, GEO_BY_ID, ROUTES } from '../js/map/geo.js';
import { marketDepth, yardCapable, shipPriceAt, industryOf, tierNeeded, baseTariff } from '../js/state.js';

/* ── 1. 교역품의 신뢰 등급 ───────────────────────────────────
   교역 항목이 많다고 좋은 항구가 아니다. 사료로 확인된 수요 하나가
   구색으로 넣은 다섯 줄보다 그 항구를 더 잘 설명한다.

   그래서 세 묶음으로 가른다 — 화면에서도 이 순서로 쌓인다:
     0 확실한 수요 : 그 도시가 **사들이던 것**이 사료로 확인된다. 항구의 성격은 수요가 정한다
                    (산지는 지리가 정하지만, 무엇을 사들였나는 그 도시가 무엇이었나를 말한다).
     1 확실한 산지 : 특산이 사료로 확인된다. 값이 싼 이유가 여기 있다.
     2 그 밖       : 근거가 개연 수준이거나(probable) 게임이 성립하도록 넣은 것(gameplay).
                    지우자는 뜻이 아니라 **아래로 내려 읽는 순서에서 뒤로 밀자**는 뜻이다. */
export const RANK = {
  0: { key: 'demand-solid', label: '확실한 수요', note: '사료로 확인된 수요 — 이 항구가 무엇을 사들였는가' },
  1: { key: 'supply-solid', label: '확실한 산지', note: '사료로 확인된 특산 — 여기서 싼 이유' },
  2: { key: 'weak', label: '근거가 약한 것', note: '개연 수준이거나 구색으로 넣은 것 — 재조사 대상' },
};

/** confirmed·corrected는 "출처가 있다"는 뜻의 판정이다.
    단, 출처가 실제로 달려 있어야 확실로 친다 — `tools/check-evidence.mjs`가
    판정만 있고 출처가 없는 항목을 실패로 잡는 것과 같은 기준이다. */
const isSolid = (e) =>
  ['confirmed', 'corrected'].includes(e?.verdict) && (e?.sources?.length > 0);

export function rankOf(side, ev) {
  if (!isSolid(ev)) return 2;
  return side === 'demand' ? 0 : 1;
}

/** 한 항구의 교역품을 신뢰 등급 → 값 순으로 정렬해 돌려준다.
    `ev`는 content/city-evidence.json (없으면 전부 '근거가 약한 것'으로 떨어진다). */
export function goodsOf(cityId, EV) {
  const city = CITIES.find((c) => c.id === cityId);
  const evGoods = EV?.cities?.[cityId]?.goods ?? {};
  const rows = [];

  const push = (side, gid, value) => {
    const e = evGoods[gid] ?? null;
    rows.push({
      gid,
      name: GOOD_BY_ID[gid]?.name ?? gid,
      base: GOOD_BY_ID[gid]?.base ?? 0,
      side,
      value,
      // 산지는 1보다 작고(싸다) 수요지는 1보다 크다(비싸다) — 어느 쪽이든 1에서 멀수록 세다
      strength: Math.abs(value - 1),
      ev: e,
      verdict: e?.verdict ?? null,
      sources: e?.sources ?? [],
      basis: e?.basis ?? '',
      rank: rankOf(side, e),
    });
  };

  for (const [gid, v] of Object.entries(city.supply)) push('supply', gid, v);
  for (const [gid, v] of Object.entries(city.demand)) push('demand', gid, v);

  rows.sort((a, b) => a.rank - b.rank || b.strength - a.strength);
  return rows;
}

/* ── 2. 공업력 ───────────────────────────────────────────────
   `industry` 0~3이 "어떤 배를 지을 수 있는가"를 정한다(js/map/geo.js).
   해금 조건(`requires`)은 플레이 상태에 딸린 값이라 여기서는 **공업력만으로** 본다 —
   `yardCapable()`이 그 판정이고 `sellsShip()`은 해금까지 함께 보므로 쓰지 않는다. */
export function yardOf(cityId) {
  const buildable = [];
  const locked = [];
  for (const [key, s] of Object.entries(SHIPS)) {
    if (!s.tier) continue;                       // 시중에 안 나오는 배(낡은 바사)
    if (!yardCapable(key, cityId)) continue;
    const row = {
      key,
      name: s.name,
      tier: s.tier,
      need: tierNeeded(key, cityId),
      cargo: s.cargo,
      price: shipPriceAt(key, cityId),
      list: s.price,
      tradition: (s.yards || []).includes(cityId),
      requires: s.requires ?? null,
    };
    (s.requires ? locked : buildable).push(row);
  }
  const cheaper = (a, b) => a.tier - b.tier || a.price - b.price;
  return {
    industry: industryOf(cityId),
    buildable: buildable.sort(cheaper),
    locked: locked.sort(cheaper),
    // 전통 조선지 — 살 수 있는 곳이 아니라 **값이 싸지는 곳**이다
    traditions: Object.entries(SHIPS)
      .filter(([, s]) => (s.yards || []).includes(cityId))
      .map(([, s]) => s.name),
    prizeYard: !!GEO_BY_ID[cityId].prizeYard,
  };
}

/* ── 3. 항구 한 줄 ───────────────────────────────────────── */
/* ── 입항세 ──────────────────────────────────────────────────
   두 겹이다 — 규모별 기본율(`TARIFF`)과 그 도시만의 오버라이드(`CITY_TARIFF`).
   화면은 **어느 쪽인지**를 보여줘야 한다. 같은 6.0%라도 "규모가 커서"와
   "그 도시가 그렇게 매겨서"는 다른 사실이고, 후자에는 근거가 붙어 있다. */
export function tariffOf(cityId, size, EV) {
  const override = CITY_TARIFF[cityId];
  const ev = EV?.cities?.[cityId]?.tariff ?? null;
  return {
    rate: baseTariff(cityId),
    base: TARIFF[size] ?? 0.045,
    override: override != null,
    ev,
    verdict: ev?.verdict ?? null,
    basis: ev?.basis ?? '',
    sources: ev?.sources ?? [],
  };
}

export function portRows(EV) {
  const degree = {};
  for (const [a, b] of ROUTES) {
    degree[a] = (degree[a] || 0) + 1;
    degree[b] = (degree[b] || 0) + 1;
  }

  return CITY_GEO.map((g) => {
    const goods = goodsOf(g.id, EV);
    const yard = yardOf(g.id);
    const solid = goods.filter((r) => r.rank < 2).length;
    return {
      id: g.id,
      name: g.name,
      region: g.region,
      flag: g.flag,
      style: g.style,
      size: g.size,
      x: g.x,
      y: g.y,
      routes: degree[g.id] || 0,
      // ★ `state.js: tariffRate()`를 쓰면 안 된다 — 부관 특전(tariffOff)이 곱해져
      //   **탭을 여는 순서에 따라 값이 달라진다**(경제 탭이 먼저 돌면 부관이 승선한 상태라
      //   6.0%가 3.9%로 나온다). 이 표는 항구의 성질을 적는 자리라 `baseTariff()`를 쓴다.
      tariff: baseTariff(g.id),
      tariffInfo: tariffOf(g.id, g.size, EV),
      depth: marketDepth(g.id),
      goods,
      solid,
      weak: goods.length - solid,
      yard,
    };
  });
}

/* ── 4. 부동산 ───────────────────────────────────────────────
   **아직 게임 기능이 아니다.** content/asset-evidence.json이 "선원 연봉의 몇 배"로
   적어 둔 스케일 기준점을 게임 화폐로 환산해 보여 줄 뿐이다 —
   항구 거점·창고를 넣을 때 여기 값을 앵커로 삼으라는 메모에 가깝다.

   환산은 **배율로만** 한다. 닢은 실화폐가 아니므로 절대액 대조는 성립하지 않는다
   (asset-evidence.json의 caveats가 같은 말을 한다). */
export function realEstate(AE, crewYearWage) {
  const A = AE?.assets ?? {};
  const pick = (id) => {
    const a = A[id];
    if (!a) return null;
    const m = /선원 연[봉수]입?의 약? ?([\d,]+)(?:~([\d,]+))?\s*([배%])/.exec(a.vsSailor ?? '');
    let lo = null, hi = null;
    if (m) {
      const unit = m[3] === '%' ? 0.01 : 1;
      lo = parseFloat(m[1].replace(/,/g, '')) * unit;
      hi = m[2] ? parseFloat(m[2].replace(/,/g, '')) * unit : lo;
    }
    return {
      id, label: a.label, price: a.price, verdict: a.verdict,
      note: a.note ?? '', vsSailor: a.vsSailor ?? '',
      lo, hi,
      goldLo: lo == null ? null : Math.round(lo * crewYearWage),
      goldHi: hi == null ? null : Math.round(hi * crewYearWage),
    };
  };
  return {
    crewYearWage,
    rows: ['rowRoom', 'townHouse', 'carrack', 'palace'].map(pick).filter(Boolean),
    rentShare: A.rentShare ?? null,
    caveats: AE?.caveats ?? [],
  };
}
