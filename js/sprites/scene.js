// scene.js — 배경 스프라이트 (권역 지도 / 항구 도시 / 외해)
// 게임 논리 해상도 400x225 기준으로 그린 뒤 정수배 확대해서 쓴다.

import { PAL as P, G, bake, outline, rng } from '../pixel.js';
import { autoLandMap, scatterIsles, carveHarbors, laneCutter, valueNoise, coastOctaves } from './maps/auto.js';
import { mapDefOf, climateOf, ramp, rockOf, seaRampOf } from './maps/index.js';

export const VW = 400, VH = 225;

/* ══════════════════════════════════════════════════════════════
   1. 권역 지도
   ══════════════════════════════════════════════════════════════ */

/* ── 지도는 권역마다 다르다 ─────────────────────────────────────
   지중해는 손으로 찍은 격자를 쓰고(`maps/mediterranean.js`), 나머지 여섯 바다는
   **도시 좌표에서 바다를 역산한다**(`maps/auto.js`). 후자를 택한 이유는
   외주 지도를 두 번 반려한 경험이다 — 지형을 먼저 그리면 항구가 사하라 한복판에 앉는다.
   좌표를 먼저 놓고 그 점들이 물가에 오도록 지형을 만들면 어긋날 수가 없다. */

const GS_DEFAULT = 4;

/** 손으로 찍은 격자 → 확대 → 스무딩한 육지 불리언 맵 */
function landFromSpans(spans, GW, GH, GS) {
  const sea = new Uint8Array(GW * GH);
  for (const [yStr, list] of Object.entries(spans)) {
    const y = +yStr;
    for (const [x0, x1] of list) for (let x = x0; x <= x1; x++) sea[y * GW + x] = 1;
  }
  // 이중선형 보간으로 확대한다. 최근접으로 키우면 대각 해안이
  // 4px 톱니가 되는데, 보간하면 경계가 실수값이라 매끄럽게 떨어진다.
  const at = (gx, gy) => {
    gx = Math.max(0, Math.min(GW - 1, gx));
    gy = Math.max(0, Math.min(GH - 1, gy));
    return sea[gy * GW + gx];
  };
  const noise = rng(0x5EA0);
  const jitter = new Float32Array(VW * VH);
  for (let i = 0; i < jitter.length; i++) jitter[i] = noise();

  let land = new Uint8Array(VW * VH);
  for (let y = 0; y < VH; y++) {
    const fy = y / GS - 0.5, gy0 = Math.floor(fy), ty = fy - gy0;
    for (let x = 0; x < VW; x++) {
      const fx = x / GS - 0.5, gx0 = Math.floor(fx), tx = fx - gx0;
      const v =
        at(gx0, gy0) * (1 - tx) * (1 - ty) + at(gx0 + 1, gy0) * tx * (1 - ty) +
        at(gx0, gy0 + 1) * (1 - tx) * ty + at(gx0 + 1, gy0 + 1) * tx * ty;
      // 해안선에 미세한 요철을 섞어 자로 그은 느낌을 없앤다
      const wob = (jitter[y * VW + x] - 0.5) * 0.22;
      land[y * VW + x] = v + wob < 0.5 ? 1 : 0;
    }
  }
  // 3x3 다수결 — 보간 잔여 노이즈로 생긴 외딴 픽셀 정리
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(land);
    for (let y = 1; y < VH - 1; y++) {
      for (let x = 1; x < VW - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) n += land[(y + dy) * VW + (x + dx)];
        }
        next[y * VW + x] = n > 4 ? 1 : n < 4 ? 0 : land[y * VW + x];
      }
    }
    land = next;
  }
  return land;
}

/**
 * 권역 지도.
 * @param regionId 권역 id. 없으면 지중해.
 * @param cities   그 권역의 도시 [{id,x,y,size}] — 자동 생성 권역에만 쓰인다
 * @param routes   그 권역 **안**의 항로 [[aId,bId]]
 */
/** 뭍길만으로 이어진 도시 — 지형 생성에서 **앞바다를 안 판다**(C-12).
    호출부가 넘긴 `routes`는 이미 육로가 빠진 목록이므로, **거기 한 번도 안 나오는 도시**가 곧 내륙이다.
    ★ 새 데이터를 안 만든다 — 이미 있는 것으로만 잰다. */
const inlandOf = (cities, routes) => {
  const seen = new Set();
  for (const [a, b] of routes) { seen.add(a); seen.add(b); }
  return cities.filter((c) => !seen.has(c.id)).map((c) => c.id);
};

export function mapSprite(regionId = 'mediterranean', cities = [], routes = []) {
  const def = mapDefOf(regionId);
  const clim = climateOf(regionId);

  return bake(`scene:map:${regionId}`, VW, VH, (g, ctx) => {
    const seed = def.auto?.seed ?? 0xC0FFEE;
    const r = rng(seed);

    // 1) 육지 만들기 — 손으로 찍은 격자가 있으면 그것, 없으면 도시 좌표에서 역산
    let land, isles, ranges;
    if (def.hand) {
      land = landFromSpans(def.hand.spans, def.hand.gw, def.hand.gh, def.hand.gs ?? GS_DEFAULT);
      /* ★ 격자는 **큰 모양만** 정한다. 4배로 키운 격자를 그대로 해안선으로 쓰면
         눈금이 드러나 4px 계단과 손가락 곶이 남고, 아홉 장 중 이 한 장만 다른 손으로
         그린 것처럼 보인다. 그래서 자동 권역이 받는 것과 **같은 해안 처리**를 태운다 —
         부호거리장 + 3옥타브(58/21/7px). 파장과 씨앗이 같아야 같은 손으로 읽힌다. */
      land = coastOctaves(land, { seed });
      /* ★ 섬을 **먼저 육지 맵에 넣고** 물길을 판다. 순서가 거꾸로면 애써 판 물길을
         그 뒤에 그리는 섬이 도로 덮는다 — 사르데냐가 알게로~제노바를, 시칠리아가
         팔레르모~튀니스를 막고 있었다(검수기가 75%·61%로 잡았는데 원인을 한참 못 찾았다).
         지형은 그대로 두고 물길만 판다 — 실루엣을 잃지 않으면서 항구를 물가로 되돌린다.
         ★ 섬은 해안 옥타브 **뒤에** 넣는다. 먼저 넣으면 ±8px 옥타브가 몰타(지름 4px)를 지운다.
           대신 모양은 아래 다각형 규칙을 자동 권역과 똑같이 받는다. */
      isles = [...(def.hand.isles ?? []),
        ...scatterIsles(land, cities, routes, { seed: seed ^ 0x15E5, count: def.hand.scatter ?? 7 })];
      /* ★ 회랑 반폭을 6 → 2.5로 좁혔다. 6px(폭 12px)은 지중해의 반도(폭 20px대)를
         **통째로 갈아 없앤다** — 사용자가 "이탈리아 반도도 그리스 반도도 없다"고 한 것이
         격자의 문제가 아니라 이 한 줄이었다. 검수기는 선분 위 표본만 보므로 좁혀도 통과한다. */
      ranges = def.hand.ranges ?? [];
    } else {
      land = autoLandMap(cities, routes, { ...def.auto, inland: inlandOf(cities, routes) });
      isles = scatterIsles(land, cities, routes, { seed: seed ^ 0x15E5, count: def.auto?.isles ?? 14 });
      /* ★ 흩뿌림은 "어디에 섬이 **있어야** 하는지"를 모른다. 섬 자체가 항구인 곳(쌍서)은
         좌표로 박는다 — `landmass`에 넣으면 그쪽은 저해상 격자라 작은 섬이 스무딩에 먹혀
         사라지고, 항구가 바다 한가운데 떠 있게 된다(`check-map.py`가 31px로 잡았다). */
      isles = [...(def.auto?.pinIsles ?? []), ...isles];
      ranges = [];        // 자동 권역의 산줄기는 8)에서 **고도장의 국소 최대점**에서 뽑는다
    }

    /* 2) 섬을 육지 마스크에 **넣는다** — 캔버스에 나중에 덧그리지 않는다.
       덧그리면 `autoLandMap`이 판 항로 회랑을 섬이 도로 덮는다(`auto.js: laneCutter` 주석).
       그래서 항로가 지나는 자리는 비우고 넣는다. 지중해는 이미 land에 들어가 있어 isles가 비었다. */
    const cutLane = laneCutter(cities, routes);
    /* ★ 섬 모양은 **타원이 아니다.** 전부 축정렬 타원으로 찍으면 같은 마름모가 스무 번 반복되고
       그것이 카리브를 "보석 아이콘을 흩뿌린 판"으로 만들었다. 크기는 그대로 두고
       (`pinIsles`는 항구가 앉는 자리라 크기를 바꾸면 안 된다) **각도별 반경만 흔든다** —
       6~9개 정점을 잡아 ±22% 흔들고 부드럽게 잇는다. 섬마다 회전각도 다르게 준다. */
    const rIsle = rng(seed ^ 0xB10B);
    for (const [cx, cy, rx, ry] of isles) {
      const n = 6 + Math.floor(rIsle() * 4);
      const rot = rIsle() * Math.PI * 2;
      const k = Array.from({ length: n }, () => 0.86 + rIsle() * 0.30);
      const radAt = (th) => {
        const t = (((th - rot) / (Math.PI * 2) * n) % n + n) % n;
        const i0 = Math.floor(t), f = t - i0, s = f * f * (3 - 2 * f);
        return k[i0 % n] * (1 - s) + k[(i0 + 1) % n] * s;
      };
      const R = Math.max(rx, ry) + 2;
      for (let dy = -R; dy <= R; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= VH) continue;
        for (let dx = -R; dx <= R; dx++) {
          const x = cx + dx;
          if (x < 0 || x >= VW) continue;
          const q = (dx / (rx || 1)) ** 2 + (dy / (ry || 1)) ** 2;
          const rr = radAt(Math.atan2(dy, dx));
          if (q > rr * rr || cutLane(x, y)) continue;
          land[y * VW + x] = 1;
        }
      }
    }
    /* 손으로 찍은 격자는 섬까지 들어간 **뒤에** 물길을 판다(위 ★ 주석).
       그리고 물길을 판 **다음에 해안 옥타브를 한 번 더** 태운다 — 안 그러면 회랑만
       자로 그은 자국으로 남는다(자동 권역은 회랑이 생성 단계에 있어 같이 흔들린다).
       마지막 한 번은 그때 막힌 항로만 다시 뚫는다(`lane: 0`이라 1차 패스는 아무것도 안 판다). */
    if (def.hand) {
      carveHarbors(land, cities, routes, { seed: seed ^ 0xC0A5, lane: 2.5, bay: 3.5 });
      land = coastOctaves(land, { seed: seed ^ 0x3E11, big: 4.2, mid: 2.2, small: 1, growOnly: 240 });
      carveHarbors(land, cities, routes, { seed: seed ^ 0xC0A5, lane: 0, bay: 0, w2: 1.6 });
    }
    const isLand = (x, y) => x >= 0 && y >= 0 && x < VW && y < VH && land[(y | 0) * VW + (x | 0)] === 1;

    /* 3) 거리장 — 이 지도의 **모든 색 판단이 여기서 나온다.**
       예전에는 `outline()`을 네 번 불러 해안 띠를 **어디나 똑같이 4px**로 둘렀다.
       그래서 대륙도 암초도 같은 굵기의 후광을 이고 있어 전부 "스티커 오려붙인 것"으로 보였고,
       바다는 세로 그라데이션이라 고유색을 120~250개나 먹었다(육지는 6~12개였다).
       거리장 한 번이면 띠 폭을 **덩어리 크기에 맞게** 줄이고 늘릴 수 있고,
       바다도 수심 다섯 단으로 끊어 색 예산을 육지로 넘길 수 있다. */
    const { lab, area, bbox } = components(land);
    const shoreW = area.map((a) => Math.max(1, Math.min(7, Math.round(Math.sqrt(a / Math.PI) * 0.16))));
    // 원천이 뭍이면 거리는 "가장 가까운 뭍까지"가 된다 — 바다 쪽에서 읽는 값이다(그 반대가 `inl`)
    const sea = distField(land, 1, lab);        // 바다 픽셀 → 가장 가까운 뭍까지 거리 + 그 덩어리
    const inl = distField(land, 0, null);       // 뭍 픽셀 → 가장 가까운 바다까지 거리

    /* ── 좁은 물길의 띠를 깎는다 (회차 26 · 홍해·페르시아만) ─────────────────
       `shoreW`는 **뭍 덩어리의 넓이**만 본다 — 대륙 사이에 낀 폭 30px 물길도 양쪽에서 7px짜리
       띠를 받아 **가운데가 통째로 여울**이 된다(홍해 평균밝기 143.6 · 페르시아만 얕은두단 100%).
       여기서 그 자리 물의 **반폭**(`halfW`)으로 한 번 더 깎는다.
       ⚠️ **백사(1px)와 분위수 표본(`far`)은 원래 `shoreW`를 그대로 쓴다.**
         ① 백사를 깎으면 해안선이 끊기고 `check-map`의 항로 회랑 폭 판정이 흔들린다.
         ② 표본을 바꾸면 `cMid q0.34`·`cDeep q0.67`의 **값 자체**가 움직여 아홉 장이 함께 바뀐다 —
            그건 이 회차에 안 하기로 한 화풍 결정이다. 그래서 **칠하는 데만** 쓴다. */
    const halfW = boxMaxSep(sea.d, NARROW_R);
    /** 그 자리에서 실제로 쓸 띠 폭 — 원래 폭과 「반폭 × K」 중 작은 것(하한 `NARROW_MIN`) */
    const wAt = (i) => {
      const w0 = shoreW[sea.lb[i]] ?? 3;
      const wn = Math.max(NARROW_MIN, Math.round(halfW[i] * NARROW_K));
      return wn < w0 ? wn : w0;
    };

    /* 4) 바다 — 수심 다섯 단. 단 사이는 Bayer 4×4로 섞어 띠 자국을 없앤다.
       양끝(여울·심해)은 그 기후가 이미 갖고 있던 색이라 바다마다의 인상은 그대로 남는다. */
    const sand = clim.shore[0];
    const depth = seaRampOf(clim);      // 여울 → 심해 5단 (간격이 고르다 — `seaRampOf` 주석)
    /* ★★ 깊은 세 단은 **거리장에서 뗀다.**
       한때 깊은 단도 `sea.d`(뭍까지의 거리)로 끊었다. 그러면 등심선이 **섬 윤곽을 그대로 복제**하고,
       섬이 작을수록 그 복제가 완결된 동심원이 된다 — 카리브에 스무 개가 겹치자 화면이
       물방울 무늬가 됐고, 그 점에서는 예전 판(얇은 4px 후광)보다 나빴다.
       실제 바다의 깊이는 **해저 지형**이 정하지 섬 모양을 따라 돌지 않는다. 그래서 저주파 잡음
       둘(파장 128px·66px)로 해저를 만들고, 거리는 **아주 멀리서만 천천히 듣는** 항으로만 남긴다
       (`min(1, d/70)`에 가중치 0.12 — 작은 섬 둘레 20px 안에서는 0.03 이하라 띠를 못 만든다).
       거리장은 이제 **얕은 세 단(백사·여울·대륙붕)에만** 쓴다. 그건 실제로 물가를 따라 도는 것이 맞다. */
    const nFloorA = valueNoise(seed ^ 0x0CEA, 128);
    const nFloorB = valueNoise(seed ^ 0x33F1, 66);
    const bathy = (x, y, d) => 0.70 * nFloorA(x, y) + 0.18 * nFloorB(x, y)
      + 0.12 * Math.min(1, d / 70);
    /* 세 단의 경계는 그 바다의 **해저값 분포**에서 뽑는다 — 고정값으로 끊으면
       잡음 씨앗에 따라 한 색이 바다를 통째로 먹는다. 앞의 세 단이 먹은 자리는 빼고 센다. */
    const far = [];
    for (let i = 0; i < land.length; i++) {
      if (land[i]) continue;
      const x = i % VW, y = (i / VW) | 0;
      if (sea.d[i] >= (shoreW[sea.lb[i]] ?? 3) * 2.4) far.push(bathy(x, y, sea.d[i]));
    }
    far.sort((a, b) => a - b);
    const q = (p) => (far.length ? far[Math.min(far.length - 1, Math.floor(far.length * p))] : 0.5);
    const cMid = q(0.34), cDeep = q(0.67);
    for (let y = 0; y < VH; y++) {
      for (let x = 0; x < VW; x++) {
        if (land[y * VW + x]) continue;
        const i = y * VW + x;
        const w = shoreW[sea.lb[i]] ?? 3;   // 백사 전용 — 좁은 물길에서도 해안선은 끊지 않는다
        const wn = wAt(i);                  // 여울·얕은바다 전용 — 좁은 물길에서 깎인다
        const d = sea.d[i];
        let c;
        /* 백사는 **1px대로 묶는다**(`min(…, 1.15)`). 폭을 덩어리 크기에 비례시켰더니
           대륙 둘레가 2~3px 모래띠가 됐는데, 모래색은 `check-map.py`의 `is_sea`에서 **뭍**으로
           세어진다(b > r+18이 아니다). 그래서 해변이 굵어진 만큼 항로 회랑이 좁아졌고
           파마구스타~베이루트가 50%로 반려됐다 — 그림이 아니라 판정 폭의 문제다. */
        /* ★ 회차 22 — 4배로 확대해 보니 백사가 **50% 체커로 흩어져 점선 선택영역**처럼 보였다.
           전이폭 0.8은 첫 물칸(정방 이웃 d=1.0)을 68%, 대각 이웃(d=1.333)을 27%로 찍어
           해안선을 따라 점이 튀었다. 전이폭을 0.34로 좁히면 정방 이웃이 거의 100% 모래가 되고
           대각은 3%로 떨어져 **이어진 1px 백사**가 된다.
           ⚠️ 문턱도 1.15→1.18로만 올린다 — 모래색은 `check-map.py`의 `is_sea`에서 **뭍**으로
             세어지므로 굵어진 만큼 항로 회랑이 좁아져 반려된다(전례 있음). 총량은 +8% 안이다. */
        if (dstep(d, Math.min(w * 0.35, 1.18), 0.34, x, y) < 0) c = sand;   // 백사
        else if (dstep(d, wn, 1.1, x, y) < 0) c = depth[0];           // 여울
        else if (dstep(d, wn * 2.4, 1.8, x, y) < 0) c = depth[1];     // 얕은 바다
        /* 여기부터는 거리가 아니라 **해저값**으로 끊는다(위 주석). 등심선이 섬을 복제하지 않는다.
           전이대는 해저값 단위라 0.03~0.05 — 잡음이 저주파라 이 폭이면 화면에서 2~4px이 된다. */
        else {
          const b = bathy(x, y, d);
          if (dstep(b, cMid, 0.05, x, y) < 0) c = depth[2];
          else if (dstep(b, cDeep, 0.03, x, y) < 0) c = depth[3];
          else c = depth[4];                                          // 심해
        }
        g.px(x, y, c);
      }
    }

    /* 5) 고도장 — 해안에서 멀수록 높고, 능선 잡음이 굴곡을 준다.
       이것이 있어야 6·7단계가 "어디가 높은가"를 알고 그림자를 놓을 수 있다. */
    const nRidge = valueNoise(seed ^ 0x81D6, 40);
    const hAt = (x, y) => {
      if (!isLand(x, y)) return 0;
      const n = nRidge(x, y);
      return 0.55 * Math.min(1, inl.d[y * VW + x] / 26) + 0.45 * (1 - Math.abs(1 - 2 * n));
    };
    const H = new Float32Array(VW * VH);
    for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) H[y * VW + x] = hAt(x, y);

    /* 6) 육지 — 지대 램프 4단 × 명암. **광원은 좌상단 고정**(전 권역 동일)이라
       북서 사면이 밝고 남동 사면이 그늘진다. 이 한 겹으로 "단색 뭉텅이"가 사라진다.
       지대 경계도 Bayer로 3px 섞는다 — 하드 에지면 지대가 벽지 무늬로 읽힌다. */
    const Z = clim.zones;
    /* ★ 지대 경계를 **흔들어서** 읽는다. 그냥 `y`로 자르면 대륙을 가로지르는 자 자국이 남고
       그것이 곧 "F-8 벽지"다. 파장 15px 잡음(±3.5px)에 Bayer를 얹어 3px 전이대를 만든다 —
       색을 하나도 더 안 쓰고 경계가 손으로 칠한 것처럼 섞인다. */
    const nZone = valueNoise(seed ^ 0x20E5, 15);
    /* ★★ 지대는 **화면 y가 아니라 육지 로컬 좌표**로 가른다(진단서 S5).
       화면 y로 자르면 한 화면에 덩어리가 여럿일 때 **작은 섬이 대륙의 위도 띠에 그대로 썰린다** —
       카리브의 자메이카 한 섬이 위는 삼림 아래는 관목으로 갈리는 식이다.
       그래서 그 덩어리의 bbox 높이로 기울기를 정한다: 대륙(높이 90px↑)은 자기 위도 기울기를
       그대로 쓰고, 작은 섬은 **자기 중심 위도 하나**로 통일된다. 사이는 매끄럽게 섞인다. */
    const localY = (x, y) => {
      const id = lab[y * VW + x];
      if (id < 0) return y;
      const bb = bbox[id];
      const h = bb[3] - bb[2] + 1;
      const k = Math.max(0.12, Math.min(1, h / 90));
      const cy = (bb[2] + bb[3]) / 2;
      return cy + (y - cy) * k;
    };
    const zoneOf = (x, y) => {
      if (!Z) return 'forest';
      const d = inl.d[y * VW + x];
      const yj = localY(x, y) + (nZone(x, y) - 0.5) * 7
        + ((BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 3;
      const extra = Z.extra?.(x, yj, d);
      if (extra) return extra;
      /* ★ 띠는 **배열**이다(북→남). 예전에는 `desertY / tundraY / forestY / scrubY`를
         if 사슬로 물었는데, 그 순서가 계약이라 **닿지 않는 가지**가 조용히 생겼다 —
         아프리카의 `forest`가 죽은 코드였고 중동의 사막색이 한 픽셀도 안 나왔다.
         배열이면 앞 경계부터 차례로 재므로 그런 파손이 구조적으로 생길 수 없다. */
      const B = Z.bands;
      if (!B) return 'forest';
      for (let i = 0; i < B.length - 1; i++) {
        const [b, nm] = B[i];
        if (yj < (typeof b === 'function' ? b(x) : b)) return nm;
      }
      return B[B.length - 1][1];
    };
    const rampOf = (x, y) => ramp(clim.zone?.[zoneOf(x, y)] ?? clim.land);
    const nPatch = valueNoise(seed ^ 0x9A70, 11);
    const nDune = valueNoise(seed ^ 0x4D0E, 22);
    for (let y = 0; y < VH; y++) {
      for (let x = 0; x < VW; x++) {
        if (!land[y * VW + x]) continue;
        const R = rampOf(x, y);
        const h = H[y * VW + x];
        const slope = h - H[Math.max(0, y - 2) * VW + Math.max(0, x - 2)];
        let k;
        if (slope > 0.045) k = 3;
        else if (slope < -0.045) k = 0;
        else k = h < 0.30 ? 1 : 2;
        /* 7) 질감 — **덩어리 패치**다. 예전에는 균등 난수로 1만 6천 점을 찍었는데
           논리 1px이 화면 3px이라 그 점묘가 통째로 사포로 보였다.
           밸류노이즈를 임계로 잘라 6~20px 덩어리로 칠하고, 램프의 ±1단만 쓴다.
           사막은 x 파장을 y의 세 배로 늘려 사구가 되게 한다. */
        const z = zoneOf(x, y);
        const p = z === 'desert' ? nDune(x, y * 3) : nPatch(x, y);
        if (p > 0.60 && k < 3) k += 1;
        else if (p < 0.36 && k > 0) k -= 1;
        g.px(x, y, R[k]);
      }
    }

    /* 8) 산등성이 — 시작점을 균등 난수가 아니라 **내륙 거리장의 국소 최대점**에서 뽑는다.
       그래야 산이 대륙 안쪽에 서고(안데스가 서안에 선다) 바닷가에 안 뜬다.
       줄 수는 육지 면적에 비례시킨다 — 자바에 알프스가 열 줄 서면 축척이 무너진다. */
    const rock = rockOf(clim);
    const drawn = [];
    if (def.hand) {
      for (const path of ranges) ridge(g, path, land, rock, r);
    } else {
      const peaks = [];
      for (let y = 8; y < VH - 8; y += 2) {
        for (let x = 8; x < VW - 8; x += 2) {
          const i = y * VW + x;
          if (!land[i] || inl.d[i] < 9 || H[i] < 0.62) continue;
          peaks.push([x, y, H[i]]);
        }
      }
      peaks.sort((a, b) => b[2] - a[2]);
      const want = Math.round(area.reduce((s, a) => s + a, 0) / 1400);
      for (const [x, y] of peaks) {
        if (drawn.length >= want) break;
        if (drawn.some(([px, py]) => Math.hypot(x - px, y - py) < 22)) continue;
        drawn.push([x, y]);
        // 능선은 고도의 등고선을 따라간다 — 기울기와 직각으로 걷는다
        const gx = H[y * VW + Math.min(VW - 1, x + 3)] - H[y * VW + Math.max(0, x - 3)];
        const gy = H[Math.min(VH - 1, y + 3) * VW + x] - H[Math.max(0, y - 3) * VW + x];
        const len = Math.hypot(gx, gy) || 1;
        const ux = -gy / len, uy = gx / len;
        const half = 8 + Math.floor(r() * 7);
        ridge(g, [[Math.round(x - ux * half), Math.round(y - uy * half)],
                  [Math.round(x + ux * half), Math.round(y + uy * half)]], land, rock, r);
      }
    }

    /* 9) 바다 결 — 균등 난수 대시를 버리고 **등심선**을 따라 놓는다.
       거리장이 18/34/52px인 자리에만 찍으면 대시가 "먼지"가 아니라 수심선으로 읽힌다.
       깊어질수록 성기게 — 심해가 잔무늬로 시끄러우면 1px NPC 점이 묻힌다. */
    const r2 = rng(seed ^ 0x51DE);
    for (const [band, keep, tone] of [[18, 0.09, depth[1]], [34, 0.05, depth[1]], [52, 0.03, depth[2]]]) {
      for (let y = 2; y < VH - 2; y++) {
        for (let x = 2; x < VW - 6; x++) {
          const i = y * VW + x;
          if (land[i] || Math.abs(sea.d[i] - band) > 0.9) continue;
          if (r2() > keep) continue;
          g.h(y, x, x + 1 + Math.floor(r2() * 3), tone);
          x += 6;
        }
      }
    }
  });
}

/** 4-이웃 연결성분 — 덩어리마다 번호와 넓이. 해안 띠 폭을 덩어리 크기에 맞추는 데 쓴다. */
function components(land) {
  const lab = new Int32Array(VW * VH).fill(-1);
  const area = [], bbox = [];
  const stack = [];
  for (let i = 0; i < land.length; i++) {
    if (!land[i] || lab[i] >= 0) continue;
    const id = area.length;
    area.push(0);
    bbox.push([VW, 0, VH, 0]);          // x0 x1 y0 y1
    lab[i] = id; stack.push(i);
    while (stack.length) {
      const j = stack.pop();
      area[id]++;
      const x = j % VW, y = (j / VW) | 0;
      const bb = bbox[id];
      if (x < bb[0]) bb[0] = x; if (x > bb[1]) bb[1] = x;
      if (y < bb[2]) bb[2] = y; if (y > bb[3]) bb[3] = y;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= VW || ny >= VH) continue;
        const n = ny * VW + nx;
        if (!land[n] || lab[n] >= 0) continue;
        lab[n] = id; stack.push(n);
      }
    }
  }
  return { lab, area, bbox };
}

/** 3-4 체임퍼 거리장. `mask[i] === want`인 곳이 0이고 거기서 번져 나간다.
    8방향(직교 3 · 대각 4)이라 도시 블록 거리보다 원에 가깝다 — 해안 띠가 네모나지 않는다.
    `labels`를 주면 "가장 가까운 원천이 어느 덩어리인가"도 함께 전파한다. */
function distField(mask, want, labels) {
  const INF = 1e7;
  const d = new Float32Array(VW * VH);
  const lb = labels ? new Int32Array(VW * VH) : null;
  for (let i = 0; i < d.length; i++) {
    const on = mask[i] === want;
    d[i] = on ? 0 : INF;
    if (lb) lb[i] = on ? labels[i] : -1;
  }
  const relax = (i, j, w) => { if (d[j] + w < d[i]) { d[i] = d[j] + w; if (lb) lb[i] = lb[j]; } };
  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      const i = y * VW + x;
      if (x > 0) relax(i, i - 1, 3);
      if (y > 0) relax(i, i - VW, 3);
      if (x > 0 && y > 0) relax(i, i - VW - 1, 4);
      if (x < VW - 1 && y > 0) relax(i, i - VW + 1, 4);
    }
  }
  for (let y = VH - 1; y >= 0; y--) {
    for (let x = VW - 1; x >= 0; x--) {
      const i = y * VW + x;
      if (x < VW - 1) relax(i, i + 1, 3);
      if (y < VH - 1) relax(i, i + VW, 3);
      if (x < VW - 1 && y < VH - 1) relax(i, i + VW + 1, 4);
      if (x > 0 && y < VH - 1) relax(i, i + VW - 1, 4);
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return { d, lb };
}

/* ── 국소 물폭 (회차 26 · R-홍해) ──────────────────────────────
   ★ **왜 필요한가**: 해안 띠 폭(`shoreW`)은 **뭍 덩어리의 넓이**로만 정해져 있었다. 그래서
     아라비아·아프리카처럼 수만 px짜리 대륙 사이에 낀 **폭 30px 물길**(홍해·페르시아만)은
     양쪽에서 상한 7px짜리 띠를 받아 **가운데에 심해색이 들어설 자리가 없었다** —
     실측(회차 26 지도 트랙): 홍해 평균밝기 **143.6** vs 아라비아해 **90.0**,
     페르시아만은 **얕은 두 단이 100.0%**. 넓혀서 푸는 길은 도시 좌표가 막고 있다.
   ⇒ 띠 폭을 **그 자리 물의 넓이**로도 깎는다. 그 「넓이」가 이 함수가 내는 값이다:
     `sea.d`(뭍까지 거리)의 **국소 최대** = 그 물길의 반폭(半幅).
   ⚠️ **반경이 작으면 열린 연안까지 좁게 잰다.** 열린 바다의 물가 픽셀(d=1)도 반경 안에
     깊은 물이 없으면 「좁은 물길」로 읽힌다 — 그러면 아홉 장의 해안 띠가 통째로 얇아진다.
     그래서 반경은 **홍해 반폭(15px)보다 훨씬 크게** 잡는다(아래 `NARROW_R`).
   ⚠️ 반대로 너무 크면 좁은 물길이 **옆 넓은 바다의 값을 받아** 가드가 풀린다(지도 트랙이
     회차 26에 최대필터 반경으로 같은 함정을 겪었다). 두 실패 사이를 실측으로 잡았다. */
/* 손잡이 셋 — **스윕으로 잡았다**(전체 표는 `.playtest/round-26/A-PROGRESS.md` 바퀴 6).
   ★★ **불변식: `NARROW_R × NARROW_K ≥ 7`(=`shoreW` 상한).** 이걸 지키면 **열린 바다에서는
     아무 일도 안 일어난다** — 반폭이 R에서 포화하므로 `round(halfW·K) ≥ 7 ≥ shoreW`가 되어
     원래 띠가 그대로 남는다. 깨뜨리면(예: R30·K0.20 = 6.0) **아홉 장의 연안 띠가 통째로 7→6px**로
     얇아진다. 실측으로 확인했다 — 대조군(아라비아해 열린 바다) 평균밝기:
       기준선 90.0 · **R32·K0.22(7.04) → 90.0** · R30·K0.20(6.0) → 89.9 · R48·K0.16(7.7이지만
       화면 안 물이 R보다 좁아 포화가 안 된다) → 86.4.
     ⇒ **R은 「화면 안에서 열린 바다가 실제로 확보하는 반폭」보다 크면 안 된다.**
   ⚠️ 셋 다 **아홉 장 공통**이다. 하나를 만지면 여덟이 같이 바뀐다 — 고쳤으면 아홉 장을 다시 굽고
     ① 바다%가 그대로인지(백사를 안 건드렸으니 그대로여야 한다) ② 대조군 밝기가 안 움직였는지
     ③ `check-map.py`가 아홉 장 통과인지를 **모두** 본다. */
const NARROW_R = 32;      // 반폭을 재는 반경(px). 작으면 열린 연안까지 좁게 읽고, 크면 옆 바다가 샌다
const NARROW_K = 0.22;    // 반폭의 이 비율까지만 띠로 쓴다 (여울+얕은바다는 그 2.4배까지)
const NARROW_MIN = 3;     // 이보다 얇게는 안 깎는다 — 반폭 7px 이하 물길은 통째로 여울이 맞다

function boxMaxSep(src, r) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < VH; y++) {                 // 가로
    const row = y * VW;
    for (let x = 0; x < VW; x++) {
      let m = 0;
      const a0 = Math.max(0, x - r), a1 = Math.min(VW - 1, x + r);
      for (let k = a0; k <= a1; k++) if (src[row + k] > m) m = src[row + k];
      tmp[row + x] = m;
    }
  }
  for (let x = 0; x < VW; x++) {                 // 세로
    for (let y = 0; y < VH; y++) {
      let m = 0;
      const a0 = Math.max(0, y - r), a1 = Math.min(VH - 1, y + r);
      for (let k = a0; k <= a1; k++) { const v = tmp[k * VW + x]; if (v > m) m = v; }
      out[y * VW + x] = m;
    }
  }
  return out;
}

/* Bayer 4×4 정렬 디더. 논리 1px이 화면 3px이라 **백색잡음은 사포가 되고 정렬 디더는 무늬가 된다** —
   경계를 섞을 때는 반드시 정렬 디더를 쓴다. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** `v`가 임계 `t`보다 큰가를 폭 `w`만큼 디더로 흐린다. 음수면 임계 아래. */
function dstep(v, t, w, x, y) {
  return (v - t) / w + 0.5 - (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** 산등성이 한 줄 — 능선 위쪽이 밝고 아래가 그늘이다(광원 좌상단). */
function ridge(g, path, land, rock, r) {
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s += 2) {
      const t = steps ? s / steps : 0;
      const x = Math.round(x0 + (x1 - x0) * t + (r() - 0.5) * 3);
      const y = Math.round(y0 + (y1 - y0) * t + (r() - 0.5) * 3);
      if (x < 2 || y < 4 || x >= VW - 2 || y >= VH - 1) continue;
      if (!land[y * VW + x] || !land[(y - 3) * VW + x]) continue;
      const h = 2 + Math.floor(r() * 3);
      for (let k = 0; k < h; k++) {
        g.h(y - k, x - (h - k - 1), x + (h - k - 1), k === h - 1 ? rock[2] : rock[0]);
      }
      g.px(x - 1, y - h + 1, rock[3]);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   2. 항구 도시 배경
   ══════════════════════════════════════════════════════════════ */

/* 도시 건축 양식 ─────────────────────────────────────────────
   한 항구의 인상은 **색 아홉 개와 지붕 모양 하나**로 거의 다 결정된다.
   그래서 표는 색을 담고, 그리는 코드(`building`·`landmark`)는 이 표만 본다.

   필수: wall[3]·wallD  벽 3색과 그늘 / roof[3]·roofD 지붕 3색과 처마그늘
        sky[3]          위→아래 하늘 / hill·hillD 원경 구릉
        tower           랜드마크 모양 — campanile·dome·minaret·gable·pagoda·gopuram
        accent          그 도시의 강조색(깃발 천·차양 등에 쓴다)
   선택: roofKind  지붕 만드는 법 — pitched(기본 박공) · flat(평지붕) · gable(계단박공)
                   · eave(처마가 길게 뻗은 기와) · thatch(이엉) · steep(가파른 박공)
        flatP     roofKind:'flat'일 때 평지붕이 될 확률(나머지는 박공)
        hillL[2]  구릉 능선 하이라이트 2색
        sea[4]    항구 수면 위·가운데·아래·잔물결. 없으면 지중해 색
        rampart[3] 해안 성벽과 부두의 재료색 M·L·D. 없으면 석재
        fort      true면 성벽에 각진 능보(棱堡)를 세운다 — 대항해시대 요새 항구

   ★ **새 tower 값을 넣으면 `landmark()`에 그리는 코드를 함께 늘려야 한다.**
     색만 바꾸는 것은 공짜지만 모양은 공짜가 아니다. 그래서 화풍 열셋이
     여섯 모양을 나눠 쓴다(일본의 오층탑과 자바의 므루는 같은 `pagoda`다 —
     400×225 원경에서 그 둘의 차이는 보이지 않는다). */
export const STYLES = {
  latin: {   // 이탈리아·프로방스: 테라코타 지붕, 종탑
    wall: ['#d8bd94', '#c9a97c', '#e3cfab'], wallD: '#a2855e',
    roof: ['#b0492f', '#983c26', '#c25a3a'], roofD: '#732b1b',
    sky: ['#3f6f9e', '#7fa8c9', '#e0cbb0'], hill: '#5c7a4a', hillD: '#3d5632',
    tower: 'campanile', accent: P.redM,
  },
  hellenic: { // 그리스·에게: 백벽, 청색 돔
    wall: ['#e8e2d2', '#d5cebb', '#f6f2e6'], wallD: '#b0a894',
    roof: ['#2f6f9e', '#255880', '#4a8fbd'], roofD: '#1a3f5c',
    sky: ['#2f6796', '#78a6c8', '#dcc9ae'], hill: '#6d7a4a', hillD: '#4a5432',
    tower: 'dome', accent: P.blueL,
  },
  levant: {  // 마그레브·레반트: 황토벽, 미나레트
    wall: ['#d9b477', '#c39c5f', '#e8cf9c'], wallD: '#9c7a45',
    roof: ['#a8905e', '#8a744a', '#c4ab72'], roofD: '#6b5834',
    sky: ['#4a6a92', '#a89a86', '#e8d0a4'], hill: '#8a7a4a', hillD: '#5f5432',
    tower: 'minaret', accent: P.grnM,
    roofKind: 'flat', flatP: 0.6,
  },

  /* ── 북유럽 ───────────────────────────────────────────── */
  hanseatic: { // 한자: 붉은 벽돌 고딕, 계단 박공, 잿빛 슬레이트 지붕
    wall: ['#9c4a34', '#873c28', '#b25c40'], wallD: '#5f2718',
    roof: ['#5c5a62', '#44434b', '#76747e'], roofD: '#2e2d34',
    sky: ['#4a6a86', '#93a8b6', '#d8d2c4'], hill: '#4e6b46', hillD: '#334a2f',
    hillL: ['#5f7a52', '#6d8759'],
    sea: ['#2a5f70', '#1f4c60', '#0f2f40', '#3d7d90'],
    tower: 'gable', accent: P.redM, roofKind: 'gable',
  },
  nordic: {   // 노르웨이·스웨덴·루시: 목조 부두 건물, 가파른 널지붕, 잿빛 하늘
    wall: ['#8a6a48', '#6f5238', '#a3835c'], wallD: '#4a3524',
    roof: ['#4a4a52', '#37373f', '#5f6068'], roofD: '#26262d',
    sky: ['#57708c', '#9fb0bc', '#d4d8d4'], hill: '#3f5a3c', hillD: '#2a3f2a',
    hillL: ['#4a6144', '#587050'],
    sea: ['#2b6270', '#1d4a58', '#0d2a36', '#3f8496'],
    rampart: ['#6b5540', '#8a7055', '#43331f'],   // 돌 대신 통나무 부두
    tower: 'campanile', accent: P.steelM, roofKind: 'steep',
  },

  /* ── 아프리카·홍해 ────────────────────────────────────── */
  swahili: {  // 스와힐리 해안·홍해: 산호석을 깎아 쌓은 흰 벽, 평지붕, 미나레트
    wall: ['#e6ded0', '#d2c8b6', '#f4efe2'], wallD: '#a89c86',
    roof: ['#cfc4ae', '#b3a692', '#e0d8c4'], roofD: '#8a7f6a',
    sky: ['#3f7fa0', '#9fc4cf', '#ecdcc0'], hill: '#7a8a52', hillD: '#54603a',
    sea: ['#2f9099', '#1d6b7c', '#10404f', '#57bcc0'],
    rampart: ['#c9bfa8', '#e4dcc6', '#8d8570'],   // 산호석
    tower: 'minaret', accent: P.seaL, roofKind: 'flat', flatP: 0.85,
  },
  guinea: {   // 기니 만: 붉은 흙벽과 야자 이엉, 부서지는 파도와 끌어올린 카누
    wall: ['#a8703f', '#8c5a30', '#c08a54'], wallD: '#5f3a1e',
    roof: ['#b09050', '#93743c', '#c9ab6a'], roofD: '#6b5228',
    sky: ['#5a86a0', '#a8bfb4', '#e8dcae'], hill: '#3f6b32', hillD: '#294a22',
    hillL: ['#4f7d3c', '#5d8f46'],
    sea: ['#2f8a86', '#1d6470', '#0f3a48', '#55b0aa'],
    rampart: ['#8a6238', '#a87f4e', '#563a1c'],   // 흙과 통나무
    tower: 'dome', accent: P.grnL, roofKind: 'thatch', lowRise: 0.52,
  },

  /* ── 인도양 ───────────────────────────────────────────── */
  dravidian: { // 남인도 힌두 항구: 붉은 라테라이트 담, 층층이 조각한 고푸람
    wall: ['#c4785a', '#a85f44', '#d99172'], wallD: '#7a3f2c',
    roof: ['#8a6a4a', '#6f5238', '#a3835c'], roofD: '#4a3524',
    sky: ['#3f7396', '#9dbcc6', '#ecd8ae'], hill: '#5f7a3a', hillD: '#3f5326',
    sea: ['#2f8896', '#1d6274', '#0f3a4a', '#4fabb4'],
    tower: 'gopuram', accent: P.goldM, roofKind: 'flat', flatP: 0.45,
  },
  malabar: {  // 말라바르·콘칸: 가파른 기와지붕과 목조 회랑, 뒤로 야자숲과 석호
    wall: ['#b08a5e', '#96714a', '#c9a67c'], wallD: '#6b4e30',
    roof: ['#9c4a2a', '#7f3a1e', '#b8613a'], roofD: '#5c2814',
    sky: ['#4a86a0', '#a8c4c0', '#efdcb4'], hill: '#3f7a3a', hillD: '#28522a',
    hillL: ['#4f8c42', '#5d9e4c'],
    sea: ['#2f9490', '#1d6c78', '#0f4050', '#55bab4'],
    tower: 'gopuram', accent: P.grnL, roofKind: 'steep',
  },

  /* ── 동남아 ───────────────────────────────────────────── */
  malay: {    // 말레이·자바·말루쿠: 야자 이엉 고상가옥, 다층 지붕(므루)의 목조 모스크
    wall: ['#b0855a', '#946a44', '#c9a06f'], wallD: '#5f3f26',
    roof: ['#a08a52', '#84703e', '#b9a26a'], roofD: '#5c4a24',
    sky: ['#3f86a8', '#9fcbd0', '#f0e0bc'], hill: '#2f7a48', hillD: '#1d5230',
    hillL: ['#3f8c52', '#4d9e5e'],
    sea: ['#2f9c9c', '#1d7080', '#0f4252', '#5cc4c0'],
    rampart: ['#7a5c38', '#9c7a4e', '#4a3620'],   // 대나무와 통나무 부두
    tower: 'pagoda', accent: P.grnL, roofKind: 'thatch', lowRise: 0.58,
  },

  /* ── 동아시아 ─────────────────────────────────────────── */
  sinic: {    // 민남(복건·광동): 붉은 벽돌과 붉은 기와, 제비꼬리 용마루, 마조 사당
    wall: ['#c47a54', '#a85c3c', '#dda078'], wallD: '#7a3f24',
    roof: ['#a03a2a', '#7f2a1c', '#c25440'], roofD: '#5c1a12',
    sky: ['#5a86a8', '#a8bcc4', '#e4d4b8'], hill: '#4a6b3a', hillD: '#31492a',
    sea: ['#2d7f8c', '#1d5a6c', '#0f3646', '#4aa2ac'],
    tower: 'pagoda', accent: P.goldM, roofKind: 'eave',
    /* ★ 처마지붕은 3~4px이라 **높은 벽 위에 얹으면 보이지 않는다.** 낮추지 않으면
       회벽·격자창만 남아 현대 아파트 단지로 읽힌다(회차 22 실화면 대조). */
    lowRise: 0.62,
  },
  // 강남·조선·일본이 함께 쓴다 — 흰 회벽에 짙은 기와, 길게 뻗은 처마, 돔이 아닌 층탑.
  // 셋의 차이는 지붕 곡선인데 400×225 원경에서는 갈리지 않아 한 화풍으로 묶었다.
  jiangnan: {
    wall: ['#e0dccd', '#c6c0ae', '#f2eee0'], wallD: '#9a9382',
    roof: ['#4a4c52', '#33353a', '#63656d'], roofD: '#212227',
    sky: ['#4a7ba8', '#9dbdd2', '#e6dcc4'], hill: '#4a6b4a', hillD: '#2f4a33',
    sea: ['#2d7a8c', '#1d5668', '#0f3242', '#469caa'],
    tower: 'pagoda', accent: P.redM, roofKind: 'eave', lowRise: 0.58,
  },

  /* ── 유럽이 바다 건너에 지은 것 ───────────────────────── */
  colonial: { // 고아·코친·엘미나·마닐라: 회벽 성당과 각진 능보, 도시가 아니라 요새 하나
    wall: ['#e4dcc8', '#cdc3aa', '#f4eeda'], wallD: '#a0977f',
    roof: ['#a85a38', '#8a422a', '#c47450'], roofD: '#5f2b18',
    sky: ['#3f78a0', '#9dbcd0', '#ead8b8'], hill: '#4a6b42', hillD: '#31492c',
    sea: ['#2d8090', '#1d5c70', '#0f3848', '#4aa8b0'],
    rampart: ['#cfc6ae', '#eae2c8', '#948b74'],   // 회칠한 성벽
    tower: 'campanile', accent: P.blueM, fort: true,
  },
};

/* 뒷산의 세기 — 화풍마다 **배후지의 생김새**가 다르다. 0이면 안 세운다.
   ★ 팔레트만 갈라서는 함부르크와 나가사키가 안 갈렸고 그래서 `roofKind`가 들어왔다.
     같은 이유로 배후지도 갈라 둔다 — 북독일 평야에 알프스를 세우면 거짓말이고,
     노르웨이 항구 뒤가 평지면 그것도 거짓말이다. */
const RIDGE = {
  latin: 1, hellenic: 1.05, levant: 0.55, hanseatic: 0.25, nordic: 1.25,
  swahili: 0.7, guinea: 0.35, dravidian: 0.6, malabar: 1.2, malay: 1.15,
  sinic: 0.8, jiangnan: 0.3, colonial: 0.85,
};
for (const [k, v] of Object.entries(RIDGE)) if (STYLES[k]) STYLES[k].ridge = v;

/* 항구 씬 세로 배치
   0 ─ 하늘 ─ 78 ─ 구릉 ─ 132 ─ 시가지/성벽 ─ 150 ─ 정박 수면 ─ 186 ─ 부두 ─ 225 */
const HORIZON = 150;
const QUAY_Y = 186;

/* 항구마다 **시각이 다르다**.
   ★ 회차 22에 아홉 항구를 나란히 놓고 보니, 사람이 그린 베네치아가 특별해 보인 까닭의 절반은
     솜씨가 아니라 **노을**이었다 — 코드판 여덟 장은 전부 같은 대낮이라 하늘이 서로 겹쳐 보였다.
   ⚠️ 색은 배경에만 얹는다. 인물·배는 port.js가 뒤에 덧그리므로 세게 물들이면 따로 논다 —
     그래서 `wash`는 12% 위로 올리지 않는다. */
const PORT_MOODS = [
  { k: 'day',  w: 42, sky: null, wash: null, lit: 0.18 },
  { k: 'morn', w: 18, sky: ['#4d80ad', '#c9b79c', '#f4e2c4'], wash: '#ffc98c14', lit: 0.26 },
  { k: 'dusk', w: 16, sky: ['#2f3f70', '#a2626d', '#eaa76a'], wash: '#e8823c1e', lit: 0.46 },
  { k: 'haze', w: 14, sky: ['#6e8296', '#a9b3b9', '#ddd7c9'], wash: '#b9c1c916', lit: 0.20 },
  { k: 'rain', w: 10, sky: ['#3f4a58', '#6c7581', '#9ba1a5'], wash: '#4a5a6e1e', lit: 0.34 },
];
function moodOf(r) {
  const tot = PORT_MOODS.reduce((a, m) => a + m.w, 0);
  let v = r() * tot;
  for (const m of PORT_MOODS) { v -= m.w; if (v <= 0) return m; }
  return PORT_MOODS[0];
}
/** 화풍에 시각을 입힌 사본 — 원본 STYLES는 건드리지 않는다. */
function styleAtHour(S, m) {
  if (!m.sky) return { ...S, lit: m.lit };
  return { ...S, lit: m.lit, sky: S.sky.map((c, i) => mixHex(c, m.sky[i], 0.62)) };
}

function skyGradient(ctx, S) {
  const grad = ctx.createLinearGradient(0, 0, 0, HORIZON);
  grad.addColorStop(0, S.sky[0]);
  grad.addColorStop(0.6, S.sky[1]);
  grad.addColorStop(1, S.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, HORIZON);
}

/* 두 색을 섞는다 — 원경을 하늘 쪽으로 흐리게 만드는 데 쓴다(대기원근). */
function mixHex(a, b, t) {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [ar, ag, ab] = p(a), [br, bg, bb] = p(b);
  const c = (u, v) => Math.round(u + (v - u) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/** 원경 산줄기 — 구릉보다 **뒤**, 하늘색에 섞어 흐리게.
    ★ 회차 22에 아홉 항구를 실제로 열어 나란히 놓고서야 알았다: 코드판은 하늘·구릉·시가지
      **세 띠뿐**이라 여덟 항구가 서로 구분이 안 갔다. 뒤에 능선 한 겹이 서면 같은 팔레트라도
      "다른 데"로 읽힌다. 봉우리 자리·높이·개수는 씨앗이 정하므로 항구마다 다르다.
    @param strength 0이면 안 그린다(삼각주·산호섬 항구) */
function farRidge(g, S, r, strength) {
  if (strength <= 0) return;
  /* ★ 처음엔 하늘색에 46%만 섞고 봉우리를 포물선으로 뽑았더니 **안개 얼룩**으로 보였다
     (회차 22 실화면 대조). 산으로 읽히려면 ① 하늘과 갈라지는 명도 ② **모난 능선** ③ 겹. */
  const far = mixHex(S.sky[1], S.hillD, 0.62);
  const farL = mixHex(S.sky[1], S.hillD, 0.40);
  const near = mixHex(S.sky[1], S.hillD, 0.80);
  const nearL = mixHex(S.sky[1], S.hillD, 0.58);
  const snow = mixHex(S.sky[2], '#ffffff', 0.55);
  const layer = (base, amp, col, colL, depth, capAt) => {
    const n = 3 + Math.floor(r() * 4);
    const peaks = Array.from({ length: n }, () => [
      r() * (VW + 80) - 40, (14 + r() * 24) * amp, 18 + r() * 30,
    ]);
    for (let x = 0; x < VW; x++) {
      let y = base;
      for (const [px, a, wd] of peaks) {
        const t = Math.abs(x - px) / wd;
        if (t < 1) y -= a * (1 - t);                // 삼각 — 포물선이면 봉우리가 언덕이 된다
      }
      y += Math.sin(x * 0.037) * 2.2 + Math.sin(x * 0.13) * 1.1 + (x % 3 === 0 ? 0.6 : 0);
      const yy = Math.round(y);
      g.v(x, yy, depth, col);
      g.px(x, yy, colL);
      if (capAt && yy < capAt) { g.px(x, yy + 1, snow); g.px(x, yy + 2, colL); }
    }
  };
  // 먼 겹(흐리고 높다) → 가까운 겹(짙고 낮다). 두 겹이라야 사이에 거리가 생긴다
  layer(96, strength * 1.15, far, farL, 112, 96 - 30 * strength);
  layer(104, strength * 0.72, near, nearL, 114, 0);
}

function drawHills(g, S, r) {
  // 원경 구릉 2겹
  const HL = S.hillL || ['#6f8a58', '#7d9463'];
  for (let layer = 0; layer < 2; layer++) {
    const baseY = 84 + layer * 14;
    const col = layer === 0 ? S.hillD : S.hill;
    let y = baseY;
    for (let x = 0; x < VW; x++) {
      y += Math.round((r() - 0.5) * 2.2);
      const wave = Math.sin((x + layer * 60) * 0.021) * 10 + Math.sin(x * 0.007) * 6;
      const yy = Math.round(baseY + wave + (y - baseY) * 0.5);
      g.v(x, yy, HORIZON, col);
      g.px(x, yy, HL[layer]);
    }
  }
}

/** 건물 한 채.
    ★ 지붕이 화풍을 가른다 — 벽 색만 바꾸면 함부르크도 나가사키도 이탈리아로 보인다.
      그래서 `S.roofKind`로 지붕 만드는 법을 갈랐고, 벽·창은 그대로 공유한다. */
function building(g, S, r, x, w, groundY, hMin, hMax) {
  /* ★ 회차 25 — 높이를 **한쪽으로 치우쳐** 뽑는다(지수 1.45).
     균등분포로 뽑으면 한 열의 모든 채가 비슷하게 높아 스카이라인이 **판벽 한 장**이 된다
     (회차 24 확대 후 아홉 바다 중 일곱에서 하늘·구릉이 통째로 가려졌다 — O-3 실측).
     실제 항구 도시도 낮은 채가 다수이고 높은 채는 몇 안 된다. */
  const h = hMin + Math.floor(Math.pow(r(), 1.45) * (hMax - hMin));
  const top = groundY - h;
  const wi = Math.floor(r() * S.wall.length);
  const wall = S.wall[wi];
  const shade = wi === 2 ? S.wall[0] : S.wall[1];    // 그늘 면 — 볕은 왼쪽에서 온다
  const lite = wi === 1 ? S.wall[0] : S.wall[2];     // 띠·인방의 밝은 톤
  g.r(x, top, w, h, wall);
  /* ★ 회차 25 — 벽이 **한 색 슬래브**라 창이 펀치카드로 읽혔다(3배 확대 대조).
     오른쪽 3할을 한 톤 내려 면을 가른다. 새 색은 안 쓴다 — `S.wall` 3톤 안에서만 고른다. */
  if (w >= 8 && shade !== wall) g.r(x + w - 1 - Math.max(2, Math.round(w * 0.3)), top, Math.max(2, Math.round(w * 0.3)), h, shade);
  g.v(x, top, groundY, S.wallD);                     // 좌측 그림자면
  g.v(x + w - 1, top, groundY, S.wallD);
  // 지붕
  const roof = S.roof[Math.floor(r() * S.roof.length)];
  const kind = S.roofKind || 'pitched';
  const flat = kind === 'flat' && r() < (S.flatP ?? 0.6);
  if (flat) {
    g.r(x - 1, top - 2, w + 2, 2, roof);
    g.h(top - 2, x - 1, x + w, S.roof[2]);
    for (let i = 0; i < w; i += 3) g.px(x + i, top - 3, S.wallD);   // 난간
  } else if (kind === 'gable') {
    // 계단 박공(Treppengiebel) — 벽이 지붕 위로 솟아 한 칸씩 좁혀 오른다
    const steps = Math.max(2, Math.min(4, Math.floor(w / 5)));
    for (let s = 0; s < steps; s++) {
      const inset = s * 2 + 1, ww = w - inset * 2;
      if (ww < 2) break;
      g.r(x + inset, top - (s + 1) * 2, ww, 2, wall);
      g.h(top - (s + 1) * 2, x + inset, x + inset + ww - 1, S.wall[2]);
      g.px(x + inset, top - (s + 1) * 2 + 1, S.wallD);
      g.px(x + inset + ww - 1, top - (s + 1) * 2 + 1, S.wallD);
    }
    g.h(top - steps * 2 - 1, x + steps * 2, x + w - steps * 2 - 1, S.roof[0]);
    g.h(top + 1, x - 1, x + w, S.roofD);
  } else if (kind === 'eave') {
    // 처마가 벽보다 넓게 뻗고 끝이 치솟는 기와지붕
    const rh = 3 + Math.floor(r() * 2);
    const cx = x + Math.floor(w / 2);
    const wide = Math.round(w / 2) + 2;
    for (let k = 0; k < rh; k++) {
      const half = wide - k;
      g.h(top - k, cx - half, cx + half, k === rh - 1 ? S.roof[2] : roof);
    }
    for (const s of [-1, 1]) {                       // 제비꼬리처럼 들린 끝
      g.px(cx + s * (wide + 1), top - 1, roof);
      g.px(cx + s * (wide + 1), top - 2, S.roof[2]);
    }
    g.h(top + 1, cx - wide, cx + wide, S.roofD);
  } else if (kind === 'thatch') {
    // 두툼한 이엉 — 처마가 벽 밖으로 나오고 마루가 둥글다
    const rh = 4 + Math.floor(r() * 3);
    for (let k = 0; k < rh; k++) {
      const t = k / rh;
      const inset = Math.round(t * t * (w * 0.42));
      g.h(top - k, x - 2 + inset, x + w + 1 - inset, k === rh - 1 ? S.roof[2] : roof);
    }
    for (let i = 1; i < w; i += 3) g.px(x + i, top - 1, S.roofD);   // 이엉 결
    g.h(top + 1, x - 2, x + w + 1, S.roofD);
  } else if (kind === 'steep') {
    // 눈이 흘러내리게 가파른 박공
    const rh = 6 + Math.floor(r() * 4);
    for (let k = 0; k < rh; k++) {
      const inset = Math.round((k * (w / 2 - 1)) / rh);
      g.h(top - k, x - 1 + inset, x + w - inset, k === rh - 1 ? S.roof[2] : roof);
    }
    g.h(top + 1, x - 1, x + w, S.roofD);
  } else {
    const rh = 3 + Math.floor(r() * 3);
    for (let k = 0; k < rh; k++) {
      g.h(top - k, x - 1 + k, x + w - k, k === rh - 1 ? S.roof[2] : roof);
    }
    g.h(top + 1, x - 1, x + w, S.roofD);
  }
  // 창문 — 이엉집에는 창이 없다. 어두운 문간 하나로 대신한다
  if (kind === 'thatch') {
    const dx = x + Math.max(1, Math.floor(w / 2) - 1);
    g.r(dx, groundY - 5, 3, 5, '#3a2a1c');
    g.px(dx + 1, groundY - 5, S.wallD);
    return top;
  }
  /* ★ **창고는 창이 없다.** 모든 건물에 같은 간격의 창을 박으면 시가지가 모눈종이가 된다 —
       회차 22에 아홉 항구를 나란히 놓고 본 첫인상이 그것이었다. 넓은 채는 큰 문 하나와
       도르래 들보로 대신한다(그 도시가 짐을 부리는 곳이라는 표시이기도 하다). */
  if (w >= 19 && r() < 0.42) {
    const dw = Math.min(9, Math.max(5, Math.round(w * 0.34)));
    const dx = x + Math.round((w - dw) / 2);
    g.r(dx, groundY - 11, dw, 11, '#3a2c20');
    g.h(groundY - 11, dx, dx + dw - 1, S.wall[2]);
    g.v(dx, groundY - 10, groundY - 1, S.wallD);
    for (let i = 1; i < dw - 1; i += 2) g.v(dx + i, groundY - 9, groundY - 2, '#4a3a2c');
    // 상단 하역구와 도르래 들보
    g.r(dx + 1, top + 4, dw - 2, 4, '#3a2c20');
    g.h(top + 3, dx + 1, dx + dw - 2, S.wall[2]);
    g.r(dx + Math.floor(dw / 2) - 1, top + 1, 3, 2, P.woodD);
    g.v(dx + Math.floor(dw / 2), top + 3, top + 6, '#6d5b3f');
    /* ★ 회차 25 — 창고는 창이 없어 **가장 큰 민무늬 슬래브**가 된다(3배 확대에서 아바나의
       흰 벽 한 장이 그랬다). 창을 넣으면 창고가 아니게 되므로 대신 **켜와 기단**만 넣는다. */
    if (h >= 26) {
      g.r(x + 1, groundY - 4, w - 2, 4, S.wallD);
      g.h(groundY - 4, x + 1, x + w - 2, lite);
    }
    for (let by = top + 14; by < groundY - 14; by += 15) {   // 문간(groundY-11)은 안 건드린다
      g.h(by, x + 1, x + w - 2, lite);
      g.h(by + 1, x + 1, x + w - 2, S.wallD);
    }
    return top;
  }
  /* ── 층으로 나눈 벽면 ──────────────────────────────────────────────
     ★ 회차 24는 창 세로간격(`ph`)을 5~6 → 12~14로 벌려 "다세대 착시"를 절반 고쳤다.
       회차 25 실측(O-4)이 남긴 결론: **그 12~14px은 이미 맞는 값이다.** 자를 다시 댔더니
       시가지에 대야 하는 자는 부두 사람의 자(0.0708 m/px)가 아니라 **배가 선 깊이의 자**
       (카라벨 108px≈22m → 0.204 m/px)다 — 시가지는 물 건너 더 뒤이므로 그보다도 크다.
       그 자로 재면 12~14px = **층고 2.4~2.9m**로 이미 실사다.
     ⇒ 그래서 이번엔 간격을 더 벌리지 않고 **층을 눈에 보이게** 만든다. 창만 격자로 박으면
       벽이 펀치카드로 읽히지만, 층마다 띠(stringcourse)를 두르고 창에 인방·문지방을 붙이면
       같은 간격이 **층**으로 읽힌다. 색은 `S.wall` 3톤 + `wallD` 안에서만 쓴다. */
  const FLOOR = 13 + (r() < 0.45 ? 3 : 0);            // 층 두께 13~16px = 2.65~3.26m(배 자)
  const plinth = h >= 22 ? 4 : 0;                     // 지상층 기단(석축) — 낮은 채엔 없다
  const usable = h - 3 - plinth;
  const floors = Math.max(1, Math.round(usable / FLOOR));
  const fh = usable / floors;
  const pw = 5 + (r() < 0.4 ? 1 : 0);
  const arch = r() < 0.28;                            // 아치창 — 위 한 픽셀을 벽색으로 깎는다
  const cols = Math.max(1, Math.floor((w - 3) / pw));
  if (w >= 6) g.h(top + 2, x + 1, x + w - 2, S.wallD);        // 처마 밑 그림자(코니스)
  if (plinth) {                                       // 기단 — 벽이 바닥에서 곧장 솟지 않게
    g.r(x + 1, groundY - plinth, w - 2, plinth, S.wallD);
    g.h(groundY - plinth, x + 1, x + w - 2, lite);
  }
  for (let f = 0; f < floors; f++) {
    const by = top + 3 + Math.round(f * fh);          // 이 층의 윗선
    if (f > 0 && w >= 6) {                            // 층 띠 — 이것 하나로 격자가 층이 된다
      g.h(by - 1, x + 1, x + w - 2, lite);
      g.h(by, x + 1, x + w - 2, S.wallD);
    }
    const wy = by + Math.max(1, Math.round((fh - 6) / 2));
    if (wy + 4 >= groundY - plinth) continue;
    for (let cx = 0; cx < cols; cx++) {
      const wx = x + 2 + cx * pw;
      if (wx + 1 >= x + w - 1) continue;
      const lit = r() < (S.lit ?? 0.22);              // 노을·비 오는 날엔 불 켠 창이 많다
      g.r(wx, wy, 2, 4, lit ? P.goldM : '#4a3a2e');
      if (lit) g.px(wx, wy, P.goldL);
      if (arch) { g.px(wx, wy, wall); g.px(wx + 1, wy, wall); g.px(wx, wy + 1, lit ? P.goldL : '#4a3a2e'); }
      g.h(wy - 1, wx, wx + 1, lite);                  // 인방
      g.h(wy + 4, wx, wx + 1, S.wallD);               // 문지방
    }
  }
  // 지상층 아케이드 — 물가 도시의 회랑. 폭이 넉넉한 채에만
  if (w >= 14 && r() < 0.3) {
    for (let ax = x + 2; ax < x + w - 3; ax += 5) {
      g.r(ax, groundY - 6, 3, 6, '#3f3126');
      g.px(ax + 1, groundY - 6, S.wall[2]);
    }
  }
  return top;
}

/* ★ S-4(회차 24) — 랜드마크도 함께 키운다. 일반 건물을 `BSCALE`(1.55배)로 키웠는데
   탑을 그대로 두면 종탑(62px)이 새 앞열 건물(최대 108px)보다 낮아져 "랜드마크가
   시가지에 묻히는" 역전이 난다. 여기 쓰는 배율은 좀 더 크게 잡는다(1.35~1.4) —
   탑 내부 장식(종실·발코니·처마)은 전부 `top`(=groundY-h) 기준 상대offset이라
   `h`만 키우면 장식은 그대로 맨 위에 남고 그 아래 몸통(민무늬 석축)만 길어진다.
   실제 종탑·미나레트도 장식 아래는 밋밋한 축조라 이 늘어남이 위화감이 없다(렌더로 확인). */
function landmark(g, S, r, x, groundY) {
  /* ★★ 회차 25(O-2) — **랜드마크가 이미 뒤집혀 있었다.** 회차 24는 "역전은 없다"라고 적었지만
     그건 건물 높이를 `hMax` **공식값**(90px)으로 본 것이고, 실제로 그려지는 채는 `tall` 배율과
     지붕 두께 때문에 **111~115px**이다(격리 렌더 300채 실측). 그래서 실측 비(랜드마크÷건물p90)는
       campanile 1.14 · minaret 1.17 · **gable 0.98** · **gopuram 0.78** · **dome 0.60**
     이었다 — 돔은 같은 화풍 건물의 **중앙값보다도 낮았다**. 정상은 pagoda(1.6~1.7) 하나뿐인데
     그건 그 화풍들이 `lowRise`라 건물이 작아서였다.
     ⇒ 여섯 종을 **총 실루엣 112~118px**로 올려 새 건물 p90(≈81)의 1.4배 이상을 보장한다.
     ⚠️ `lowRise` 화풍(기니·말레이·민남·강남)에 같은 절대높이를 주면 이엉집 마을에 대성당이
       선다 — `k`로 함께 낮춘다. 낮춰도 제 마을 대비 1.7배라 여전히 우뚝하다. */
  const k = Math.min(1, 0.45 + 0.55 * (S.lowRise ?? 1));
  switch (S.tower) {
    case 'campanile': {                              // 종탑
      const w = 9, h = Math.round(97 * k), top = groundY - h;
      g.r(x, top, w, h, S.wall[2]);
      g.v(x, top, groundY, S.wallD);
      g.v(x + w - 1, top, groundY, S.wallD);
      for (let i = 0; i * 14 + 16 < h - 8; i++) g.r(x + 2, top + 16 + i * 14, 2, 5, '#3f3226');
      g.r(x - 2, top - 2, w + 4, 4, S.wall[1]);       // 종실
      g.r(x, top - 12, w, 10, S.wall[0]);
      g.r(x + 3, top - 9, 3, 6, '#3a2f24');
      for (let k = 0; k < 7; k++) g.h(top - 12 - k, x + k, x + w - 1 - k, S.roof[1]);
      g.px(x + 4, top - 21, P.goldM);
      break;
    }
    case 'dome': {                                   // 돔 성당 — 몸체 + 드럼(고상부) + 돔 + 랜턴
      /* ★ 여섯 중 가장 심하게 뒤집혀 있던 것(53px = 건물 중앙값 69px보다 낮았다).
         몸체만 늘리면 밋밋한 상자가 되므로 **드럼 한 단**을 끼워 실루엣을 만든다. */
      const w = 30, h = Math.round(72 * k), top = groundY - h;
      g.r(x, top, w, h, S.wall[0]);
      g.h(top, x, x + w - 1, S.wall[2]);
      g.v(x, top, groundY, S.wallD);
      g.v(x + w - 1, top, groundY, S.wallD);
      for (let i = 0; i < 4; i++) g.r(x + 3 + i * 7, groundY - 22, 3, 9, '#3f4a58');   // 아래 창
      for (let i = 0; i < 4; i++) g.r(x + 3 + i * 7, top + 8, 3, 8, '#3f4a58');
      g.h(top + 19, x + 1, x + w - 2, S.wall[2]);    // 층 띠
      g.h(top + 20, x + 1, x + w - 2, S.wallD);
      const dh = Math.round(18 * k), dy = top - dh;  // 드럼
      g.r(x + 7, dy, 16, dh, S.wall[2]);
      g.v(x + 7, dy, top - 1, S.wallD);
      g.v(x + 22, dy, top - 1, S.wallD);
      for (let i = 0; i < 3; i++) g.r(x + 10 + i * 5, dy + 4, 2, Math.max(3, dh - 8), '#3f4a58');
      g.ellipse(x + 15, dy, 12, 12, S.roof[0]);      // 돔
      g.ellipse(x + 12, dy - 1, 8, 9, S.roof[2]);
      g.ellipse(x + 20, dy + 2, 5, 8, S.roofD);
      g.r(x + 12, dy - 13, 7, 4, S.wall[2]);         // 랜턴
      g.h(dy - 13, x + 12, x + 18, S.wall[0]);
      g.r(x + 14, dy - 21, 2, 8, P.goldM);           // 첨두
      g.px(x + 15, dy - 22, P.goldL);
      break;
    }
    case 'minaret': {                                // 미나레트 + 돔
      const w = 7, h = Math.round(107 * k), top = groundY - h;
      g.r(x, top, w, h, S.wall[2]);
      g.v(x + w - 1, top, groundY, S.wallD);
      g.r(x - 2, top + 16, w + 4, 2, S.roof[0]);      // 발코니
      g.r(x - 2, top + 4, w + 4, 2, S.roof[0]);
      g.r(x + 1, top + 8, 2, 6, '#3f3226');
      // ★ h를 키운 만큼(S-4) 중간에 발코니 한 단을 더 — 안 그러면 위쪽 장식과
      //   몸통 사이가 밋밋한 장대로 길게 남는다(렌더로 대조해 추가).
      g.r(x - 2, top + Math.round(h * 0.5), w + 4, 2, S.roof[0]);
      g.r(x + 1, top + Math.round(h * 0.5) + 4, 2, 6, '#3f3226');
      for (let k = 0; k < 5; k++) g.h(top - k, x + k - 1, x + w - k, S.roof[1]);
      g.v(x + 3, top - 10, top - 5, P.goldM);
      g.px(x + 3, top - 11, P.goldL);
      // 옆 돔
      g.ellipse(x + 22, groundY - 16, 12, 11, S.wall[1]);
      g.ellipse(x + 19, groundY - 17, 8, 8, S.wall[2]);
      g.r(x + 10, groundY - 16, 24, 16, S.wall[0]);
      g.h(groundY - 16, x + 10, x + 33, S.wall[2]);
      break;
    }
    case 'gable': {                                  // 벽돌 고딕 — 계단 박공과 창고 도르래
      const w = 15, h = Math.round(84 * k), top = groundY - h;
      g.r(x, top, w, h, S.wall[0]);
      g.v(x, top, groundY, S.wallD);
      g.v(x + w - 1, top, groundY, S.wallD);
      // ★ S-4 — h를 키운 만큼 좁고 긴 창을 세로로 반복한다(밋밋한 벽돌 벽이 안 남게).
      //   회차 25에 h가 60→84로 또 커져 세 단으로 늘렸다.
      for (let row2 = 0; row2 * 24 + 9 < h - 14; row2++) {
        const ry = top + 9 + row2 * 24;
        for (let i = 0; i < 3; i++) {                // 좁고 긴 창 — 벽돌 고딕의 인상
          const wx = x + 2 + i * 5;
          g.r(wx, ry, 2, 10, '#33262c');
          g.h(ry - 1, wx, wx + 1, S.wall[2]);
        }
      }
      for (let s = 0; s < 5; s++) {                  // 계단 박공
        const inset = s * 2, ww = w - inset * 2;
        if (ww < 2) break;
        g.r(x + inset, top - (s + 1) * 3, ww, 3, S.wall[1]);
        g.h(top - (s + 1) * 3, x + inset, x + inset + ww - 1, S.wall[2]);
        g.px(x + inset, top - (s + 1) * 3 + 2, S.wallD);
        g.px(x + inset + ww - 1, top - (s + 1) * 3 + 2, S.wallD);
      }
      const ty = top - 15;                           // 첨탑
      g.r(x + 6, ty - 9, 3, 9, S.roof[0]);
      for (let k = 0; k < 5; k++) {
        g.h(ty - 9 - k, x + 6 + (k > 2 ? 1 : 0), x + 8 - (k > 2 ? 1 : 0), k === 4 ? S.roof[2] : S.roof[1]);
      }
      g.px(x + 7, ty - 15, P.goldM);
      // 부두 쪽으로 튀어나온 도르래 들보 — 이 도시가 창고 도시라는 표시
      g.r(x + w, top + 5, 5, 2, P.woodD);
      g.h(top + 5, x + w, x + w + 4, P.woodM);
      g.v(x + w + 4, top + 7, top + 11, '#6d5b3f');
      g.r(x + w + 3, top + 11, 3, 3, P.woodM);
      break;
    }
    case 'pagoda': {                                 // 층탑 — 층마다 처마가 뻗는다
      // ★ S-4에서 층높이 10→14, 회차 25에 층수 5→6 · 높이 14→16(k 반영). 전체 89 → 약 115px
      const tiers = 6, TS = Math.max(9, Math.round(16 * k));
      // 위층부터 그린다. 아래층 처마가 위층 몸통 앞으로 와야 층이 겹쳐 보인다.
      for (let t = tiers - 1; t >= 0; t--) {
        const by = groundY - t * TS;                 // 이 층의 바닥
        const bw = 17 - t * 2, rw = bw + 6;
        const hw = Math.round(bw / 2), rh = Math.round(rw / 2);
        g.r(x - hw, by - TS, bw, TS, t % 2 ? S.wall[1] : S.wall[0]);
        g.v(x - hw, by - TS, by - 1, S.wallD);
        g.v(x + hw, by - TS, by - 1, S.wallD);
        g.r(x - 1, by - 7, 3, 5, '#3a2f24');         // 창
        g.h(by - TS, x - rh, x + rh, S.roof[1]);     // 처마
        g.h(by - TS - 1, x - rh + 1, x + rh - 1, S.roof[0]);
        g.h(by - TS - 2, x - rh + 3, x + rh - 3, S.roof[2]);
        for (const s of [-1, 1]) {                   // 치솟은 처마 끝
          g.px(x + s * (rh + 1), by - TS - 1, S.roof[0]);
          g.px(x + s * (rh + 1), by - TS - 2, S.roof[2]);
        }
      }
      const ty = groundY - tiers * TS - 12;          // 상륜
      g.v(x, ty - 6, ty, P.goldM);
      g.h(ty - 4, x - 1, x + 1, P.goldD);
      g.px(x, ty - 7, P.goldL);
      break;
    }
    case 'gopuram': {                                // 탑문 — 위로 갈수록 좁아지는 조각탑
      /* ★ 회차 25 — h를 68→108로 키우니 26px 밑변으로는 4:1 벽돌 굴뚝이 됐다(2배 확대 대조).
         실제 고푸람은 밑이 넓은 사다리꼴이라 밑변을 34로 넓히고 좁아지는 비율도 0.45→0.55로. */
      const h = Math.round(108 * k), base = 34, top = groundY - h;
      for (let k = 0; k < h; k++) {
        const half = Math.round((base / 2) * (1 - (k / h) * 0.55));
        const band = k % 7 === 6;                    // 층 띠
        // 시가지와 같은 벽색을 쓰면 탑이 건물에 묻힌다 — 가장 밝은 벽색으로 띄운다
        g.h(groundY - k, x - half, x + half, band ? S.wallD : S.wall[2]);
        g.px(x - half, groundY - k, S.wallD);
        g.px(x + half, groundY - k, S.wallD);
        if (band) g.h(groundY - k - 1, x - half + 1, x + half - 1, S.wall[2]);
      }
      for (let k = 4; k < h - 8; k += 7) {           // 층마다 늘어선 감실
        const half = Math.round((base / 2) * (1 - (k / h) * 0.55));   // ★ 몸통과 같은 비율이라야 안 삐져나온다
        for (let i = -half + 2; i <= half - 3; i += 4) g.r(x + i, groundY - k - 3, 2, 3, S.roofD);
      }
      const tw = Math.max(3, Math.round((base / 2) * 0.55));
      g.ellipse(x, top + 2, tw, 4, S.roof[0]);       // 꼭대기 배럴 볼트
      g.h(top + 2, x - tw, x + tw, S.roof[2]);
      for (let i = -2; i <= 2; i++) {                // 황금 칼라샴 다섯
        const px = x + i * Math.max(2, Math.round(tw / 2.2));
        g.v(px, top - 3, top - 1, P.goldM);
        g.px(px, top - 4, P.goldL);
      }
      g.r(x - 3, groundY - 13, 7, 13, '#2a1c16');    // 문간
      g.h(groundY - 13, x - 3, x + 3, S.roofD);
      break;
    }
  }
}

/* 수면·성벽·부두의 재료색. 화풍이 안 정하면 지중해의 돌과 물이다. */
const seaOf = (S) => S.sea || ['#2d7a90', P.seaM, '#123c52', P.seaL];
const rampartOf = (S) => S.rampart || [P.stoneM, P.stoneL, P.stoneD];

function drawSeaFront(g, ctx, S, r) {
  // 항구 수면
  const C = seaOf(S);
  const grad = ctx.createLinearGradient(0, HORIZON, 0, VH);
  grad.addColorStop(0, C[0]);
  grad.addColorStop(0.5, C[1]);
  grad.addColorStop(1, C[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, HORIZON, VW, VH - HORIZON);
  // 잔물결
  for (let i = 0; i < 420; i++) {
    const y = HORIZON + Math.floor(r() * (VH - HORIZON));
    const x = Math.floor(r() * VW);
    const len = 2 + Math.floor(r() * ((y - HORIZON) / 8 + 2));
    const bright = (y - HORIZON) / (VH - HORIZON);
    g.h(y, x, x + len, bright > 0.5 ? C[1] : C[3]);
  }
}

function drawQuay(g, S, r) {
  const [RM, RL, RD] = rampartOf(S);
  const qy = QUAY_Y;                                 // 부두 상판
  g.r(0, qy, VW, VH - qy, RM);
  g.h(qy, 0, VW - 1, RL);
  g.h(qy + 1, 0, VW - 1, RL);
  g.h(qy + 2, 0, VW - 1, RD);
  // 석재(또는 널판) 이음
  for (let y = qy + 4; y < VH; y += 6) {
    g.h(y, 0, VW - 1, RD);
    const off = ((y - qy) / 6) % 2 ? 6 : 0;
    for (let x = off; x < VW; x += 12) g.v(x, y, y + 5, RD);
  }
  /* 계선주 + 늘어진 밧줄 — 부두 상판 위에 세운다.
     ★ 다섯 개를 88px 간격으로 못박아 두었더니 아홉 바다 어느 부두에서나 **같은 자리**에
       같은 밧줄이 늘어졌다. 개수와 간격을 씨앗에 맡긴다(회차 22). */
  const pz = qy + 9;                                 // 프롭이 놓이는 바닥선
  const nB = 4 + Math.floor(r() * 3);                // 계선주 4~6
  const bxs = [];
  for (let i = 0; i < nB; i++) bxs.push(Math.round(14 + i * ((VW - 34) / (nB - 1)) + (r() - 0.5) * 14));
  for (let i = 0; i < bxs.length; i++) {
    const x = bxs[i];
    g.r(x, pz - 7, 5, 8, '#4a4038');
    g.h(pz - 7, x, x + 4, '#6b5d4f');
    g.r(x - 1, pz - 8, 7, 2, '#5a4d42');
    g.px(x, pz, '#2f2a24');
    const nx = bxs[i + 1];
    if (nx != null && nx > x + 6) {
      const span = nx - x;
      const sag = 3 + Math.floor(r() * 4);           // 밧줄이 처지는 정도도 칸마다 다르다
      for (let k = 0; k <= span; k++) {
        const t = k / span;
        const yy = pz - 8 - Math.round(Math.sin(Math.PI * t) * sag) + sag;
        g.px(x + 2 + k, yy, '#6d5b3f');
      }
    }
  }
  /* 화물 — 자리·종류·무리 크기를 씨앗이 정한다. 부두는 **짐이 무리 지어** 쌓여 있어야
     일하는 자리로 보인다(고르게 흩으면 진열대가 된다). */
  const KINDS = ['crate', 'barrel', 'barrel', 'sack', 'coil', 'net'];
  const props = [];
  for (let c = 0, nc = 2 + Math.floor(r() * 3); c < nc; c++) {
    let px = 20 + Math.floor(r() * (VW - 100));
    for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {
      props.push([px, KINDS[Math.floor(r() * KINDS.length)]]);
      px += 9 + Math.floor(r() * 9);
    }
  }
  for (const [x, kind] of props) {
    if (kind === 'sack') {                           // 곡물 자루 — 윗목을 묶어 잘록하다
      g.poly([[x + 1, pz - 1], [x, pz - 7], [x + 3, pz - 11], [x + 7, pz - 7], [x + 8, pz - 1]], P.clothM);
      g.poly([[x + 2, pz - 2], [x + 2, pz - 7], [x + 4, pz - 10], [x + 6, pz - 7], [x + 6, pz - 2]], P.clothL);
      g.h(pz - 9, x + 2, x + 6, P.clothD);
      g.px(x + 4, pz - 12, P.clothD);
      g.h(pz, x + 1, x + 8, '#00000044');
      continue;
    }
    if (kind === 'coil') {                           // 밧줄 사리
      g.ellipse(x + 5, pz - 3, 6, 3, '#6d5b3f');
      g.ellipse(x + 5, pz - 4, 6, 3, '#836f4e');
      g.ellipse(x + 5, pz - 5, 4, 2, '#6d5b3f');
      g.ellipse(x + 5, pz - 4, 2, 1, '#4a3d2a');
      g.h(pz, x, x + 10, '#00000033');
      continue;
    }
    if (kind === 'net') {                            // 널어 둔 그물 더미
      g.poly([[x, pz - 1], [x + 2, pz - 7], [x + 9, pz - 6], [x + 11, pz - 1]], '#5f6b52');
      for (let i = 1; i < 10; i += 2) g.v(x + i, pz - 6, pz - 2, '#7d8a68');
      for (let yy = pz - 6; yy < pz - 1; yy += 2) g.h(yy, x + 1, x + 10, '#7d8a68');
      g.h(pz, x, x + 11, '#00000044');
      continue;
    }
    if (kind === 'crate') {
      g.r(x, pz - 12, 12, 12, P.woodM);
      g.h(pz - 12, x, x + 11, P.woodL);
      g.v(x + 11, pz - 12, pz - 1, P.woodD);
      g.line(x, pz - 12, x + 11, pz - 1, P.woodD);
      g.line(x + 11, pz - 12, x, pz - 1, P.woodD);
      g.h(pz, x + 1, x + 12, '#00000044');           // 접지 그림자
    } else {
      g.r(x, pz - 14, 9, 14, P.woodM);
      g.v(x, pz - 14, pz - 1, P.woodD);
      g.v(x + 8, pz - 14, pz - 1, P.woodD);
      g.px(x + 2, pz - 14, P.woodL); g.px(x + 3, pz - 14, P.woodL);
      g.h(pz - 12, x, x + 8, P.ironM);
      g.h(pz - 5, x, x + 8, P.ironM);
      g.h(pz - 14, x + 1, x + 7, P.woodL);
      g.h(pz, x + 1, x + 9, '#00000044');
    }
  }
}

/* ── 씨앗을 흩는다 ────────────────────────────────────────────────
   ★ **회차 22가 얹은 다섯 시각 중 실제로 나온 것은 둘 반이었다.** 원인은 색이 아니라 씨앗이다 —
     `rng`는 xorshift라 **작은 씨앗의 첫 출력이 함께 작다.** 도시 씨앗은 1101~11040뿐이고
     `moodOf`가 그 **첫 뽑기 하나로** 시각을 고르므로, 265개 항구 중 224곳이 '맑음'으로 떨어지고
     **안개와 비는 한 항구에도 안 왔다**(실측). 코드는 멀쩡한데 화면이 말하지 않는 자리다.
   그래서 씨앗을 먼저 흩는다(avalanche). 흩은 뒤 265곳이 맑음 116 · 아침 46 · 노을 39 ·
   안개 34 · 비 30으로 표의 가중치 그대로 떨어진다.
   ⚠️ `mapSprite`는 이 함수를 안 쓴다 — 지도 씨앗은 0xA71A처럼 크고, 바꾸면 해안선이 통째로
     달라져 아홉 장을 다시 검수해야 한다. */
function sceneRng(seed) {
  let s = (seed >>> 0) || 1;
  s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0;
  s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0;
  s = (s ^ (s >>> 15)) >>> 0;
  return rng(s);
}

export function portSprite(styleKey, seed) {
  const key = `scene:port:${styleKey}:${seed}`;
  return bake(key, VW, VH, (g, ctx) => {
    const S0 = STYLES[styleKey];
    const r = sceneRng(seed);
    const mood = moodOf(r);
    const S = styleAtHour(S0, mood);
    skyGradient(ctx, S);

    /* 구름 — 개수·높이대·크기를 씨앗이 정한다. 일곱 개를 늘 같은 띠에 뿌렸더니
       여덟 항구의 하늘이 서로 겹쳐 놓은 듯 같았다(회차 22 실화면 대조). */
    const nCloud = 3 + Math.floor(r() * 8);
    const band = 8 + Math.floor(r() * 16), spread = 20 + Math.floor(r() * 34);
    for (let i = 0; i < nCloud; i++) {
      const cx = Math.floor(r() * VW), cy = band + Math.floor(r() * spread);
      const w = 10 + Math.floor(r() * 30);
      g.ellipse(cx, cy, w, 3 + Math.floor(r() * 3), '#ffffff22');
      g.ellipse(cx - w / 3, cy - 2, w / 2, 3, '#f4ead6aa');
      g.ellipse(cx + w / 4, cy - 1, w / 3, 2, '#f4ead6cc');
    }
    // 갈매기 — 없는 날도 있다
    for (let i = 0, n = Math.floor(r() * 7); i < n; i++) {
      const x = 20 + Math.floor(r() * 360), y = 18 + Math.floor(r() * 46);
      g.px(x, y, '#2c2a30'); g.px(x + 1, y - 1, '#2c2a30'); g.px(x + 2, y, '#2c2a30');
      g.px(x + 3, y - 1, '#2c2a30'); g.px(x + 4, y, '#2c2a30');
    }

    /* 뒷산 — 화풍이 정하는 상한 안에서 씨앗이 고른다. 산호섬·삼각주(`ridge: 0`)는 안 세운다. */
    const ridgeMax = S.ridge ?? 1;
    farRidge(g, S, r, ridgeMax * (r() < 0.25 ? 0 : 0.45 + r() * 0.55));
    drawHills(g, S, r);

    // 시가지 — 뒤쪽(작고 어두움) → 앞쪽(크고 밝음) 3열
    // ★ `lowRise`가 이 바다의 취락 규모다. 기니·말레이의 이엉집을 도시 높이로 세우면
    //   진흙 마천루가 된다(실제로 그렇게 나왔다) — 절반으로 낮춰야 마을로 읽힌다.
    /* ★★ S-4(회차 24) — 사람을 21px로 줄이고 나니 건물 축척이 드러났다: 앞열 최대 58px는
       사람 키(실측 24px≈1.7m·§DES-ART-PROGRESS)로 재면 4.1m — **한 층도 안 된다.** 그런데
       창은 5~6px 간격으로 촘촘히 박혀 8~10단으로 보여 "층당 0.4m 다세대"로 읽혔다.
       ⇒ **건물 자체를 키운다**(사람·배는 그대로 — PM 지침). `BSCALE`로 앞·중·뒤열을 함께
       올리고, 상한도 64 → 108로 푼다. 창 간격(`ph`, 아래 `building()`)도 함께 벌려야
       칸수가 늘지 않고 "더 큰 채가 같은 층수"로 보인다 — 회차 22가 겪은 "판상 아파트"는
       **좁은 채만** 탑집 배율을 받게 한 그 가드가 그대로 막는다. */
    /* ★★ 회차 25 실측(O-3) — 1.55는 **지나쳤다.** 아홉 바다를 실렌더해 색으로 세니 시가지
       실루엣 최고점이 y24~37까지 올라와 하늘 띠가 사라지고, 구릉·배후 능선(회차 22가 "여덟
       항구가 한 그림으로 보인다"를 고치려고 넣은 그 두 겹)이 세 항구에서 **0열**만 남았다.
       시트를 눈으로 봐도 가장 보기 좋은 칸이 믈라카·광저우(=`lowRise`, 최고점 y54·56)였다.
       ⇒ 1.55 → 1.40으로 되돌리고, 대신 높이 분포를 낮은 쪽으로 치우쳐(`building()`의 지수
         1.45) **낮은 채가 다수, 높은 채가 소수**인 스카이라인을 만든다. 상한도 108 → 96. */
    const BSCALE = 1.40;
    const lr = S.lowRise ?? 1;
    for (let row = 0; row < 3; row++) {
      const groundY = 112 + row * 10;
      const hMin = Math.round((14 + row * 7) * BSCALE * lr), hMax = Math.round((32 + row * 13) * BSCALE * lr);
      let x = -4 + Math.floor(r() * 6);
      while (x < VW + 4) {
        /* ★ 폭을 세 갈래로 — 좁은 집·보통 집·창고. 8~23px 한 갈래로만 늘어놓으면
           윗변이 고르게 들쭉날쭉해 **모눈종이 한 장**으로 읽힌다. */
        const k = r();
        const w = k < 0.24 ? 5 + Math.floor(r() * 4)
          : k > 0.84 ? 20 + Math.floor(r() * 13)
            : 9 + Math.floor(r() * 11);
        /* 드물게 솟은 탑집 — 평평한 스카이라인을 깨는 데 이것 하나면 된다.
           ★ 넓은 채에 1.8배를 줬더니 90px짜리 판상 건물이 나와 부산포가 아파트 단지가 됐다
             (회차 22). 그래서 좁은 채에만 줬는데 — **회차 25에 3배 확대로 보니 반대쪽이
             터졌다**: 폭 5px짜리에 96px가 붙어 **19:1 굴뚝**이 제노바·수에즈·아바나에 서 있었다.
             ⇒ ① 탑집은 **중간 폭(9~14px)**에만 준다 ② 어떤 채든 **h ≤ w×7**로 가로세로비를
               묶는다(w=12 → 84px = 7:1 — 실제 탑집 저택의 비례). */
        const tall = (w >= 9 && w <= 14 && r() < 0.22) ? 1.20 + r() * 0.32 : 1;
        building(g, S, r, x, w, groundY, hMin, Math.max(hMin + 2, Math.min(96, w * 7, Math.round(hMax * tall))));
        x += w + (r() < 0.7 ? 1 : 3);
      }
      // 뒤 열은 대기원근으로 살짝 퍼뜨린다
      if (row < 2) {
        ctx.save();
        ctx.globalAlpha = row === 0 ? 0.30 : 0.14;
        ctx.fillStyle = S.sky[1];
        ctx.fillRect(0, 0, VW, groundY);
        ctx.restore();
      }
    }

    /* ★ 랜드마크 자리를 씨앗에 맡긴다. 전에는 늘 (54,130)과 (300,134) **둘 고정**이라
       아홉 바다 어느 항구를 열어도 왼쪽과 오른쪽 같은 자리에 같은 탑이 서 있었다
       — 여덟 항구가 한 그림으로 보이던 가장 큰 이유다(회차 22 실화면 대조). */
    /* ★ 회차 25 — 랜드마크 **폭**에 따라 개수를 가른다. 고푸람(밑변 34)·돔(30)은 종탑(13)의
       세 배 가까이 넓어, 셋이 서면 400px 폭의 4분의 1을 먹고 그 앞을 정박선이 또 가려
       시가지가 안 보인다(캘리컷 실렌더 대조). 좁은 탑만 셋까지. */
    const wideTower = S.tower === 'gopuram' || S.tower === 'dome';
    const lmN = 1 + Math.floor(r() * (wideTower ? 2 : 3));
    const placed = [];
    for (let i = 0; i < lmN * 3 && placed.length < lmN; i++) {
      const lx = 24 + Math.floor(r() * (VW - 56));
      if (placed.some((s2) => Math.abs(s2 - lx) < 54)) continue;
      placed.push(lx);
      // ★ 회차 25 — 랜드마크가 112~118px로 커졌다. groundY를 126~135에 두면 꼭대기가 y4까지
      //   올라가 캔버스 위끝에 닿는다. 128~135로 좁혀 최소 10px 여백을 남긴다.
      landmark(g, S, r, lx, 128 + Math.floor(r() * 8));
    }
    if (!placed.length) landmark(g, S, r, 60 + Math.floor(r() * 240), 132);

    /* 해안 성벽 — 밑동이 물에 잠기도록 수면선에 걸친다.
       ★ 높이·총안 간격·수문 자리를 전부 고정값으로 두었더니 항구마다 **같은 담장**이
         같은 자리에 같은 구멍을 뚫고 서 있었다. 셋 다 씨앗에 맡긴다. */
    const [RM, RL, RD] = rampartOf(S);
    const wTop = 132 + Math.floor(r() * 4);          // 132~135
    g.r(0, wTop + 2, VW, 152 - (wTop + 2), RM);
    g.h(wTop + 2, 0, VW - 1, RL);
    g.h(wTop + 3, 0, VW - 1, RL);
    /* ★ 회차 25 — 성벽 몸체가 **13~16px짜리 민무늬 띠 한 장**이라 3배 확대에서 흙둑으로 보였다
       (부두는 이미 석재 격자를 그리는데 성벽만 안 그렸다). 같은 방식으로 켜와 이음을 넣는다 —
       색은 `rampartOf(S)` 세 톤 안에서만. */
    for (let y = wTop + 6; y < 151; y += 4) {
      g.h(y, 0, VW - 1, RD);
      const off = ((y - wTop) / 4) % 2 ? 7 : 0;
      for (let sx = off; sx < VW; sx += 14) g.v(sx, y - 3, y - 1, RD);
    }
    g.h(151, 0, VW - 1, RD);
    const merlon = 8 + Math.floor(r() * 8);          // 총안 간격 8~15
    const mOff = Math.floor(r() * merlon);
    for (let x = mOff - merlon; x < VW; x += merlon) {
      g.r(x, wTop - 2, Math.max(4, merlon - 4), 5, RM);
      g.h(wTop - 2, x, x + Math.max(3, merlon - 5), RL);
    }
    for (let x = 4 + Math.floor(r() * 8); x < VW; x += 12 + Math.floor(r() * 8)) g.r(x, 139, 2, 5, '#3c3833');
    for (let x = 0; x < VW; x += 5 + Math.floor(r() * 5)) g.px(x, 147 + Math.floor(r() * 3), RD);  // 이끼 낀 하부
    // 수문 — 아치가 수면에 닿는다. 자리는 씨앗이 고른다
    const gx = 40 + Math.floor(r() * (VW - 110));
    g.r(gx, wTop, 28, 152 - wTop, RD);
    g.h(wTop, gx, gx + 27, RL);
    g.ellipse(gx + 14, 146, 10, 11, '#241f1c');
    g.r(gx + 4, 146, 20, 6, '#241f1c');
    // 각진 능보 — 요새 항구는 성벽이 아니라 요새 하나가 도시다
    if (S.fort) {
      for (const bx of [30, 340]) {
        g.poly([[bx - 22, 152], [bx - 14, 122], [bx + 14, 122], [bx + 22, 152]], RM);
        g.line(bx - 14, 122, bx - 22, 152, RL);
        g.line(bx + 14, 122, bx + 22, 152, RD);
        g.h(122, bx - 14, bx + 13, RL);
        for (let i = -12; i < 13; i += 6) {          // 흉벽
          g.r(bx + i, 118, 4, 5, RM);
          g.h(118, bx + i, bx + i + 3, RL);
        }
        g.r(bx - 3, 140, 5, 4, '#241f1c');           // 포문
        g.r(bx - 12, 132, 4, 3, '#241f1c');
        g.r(bx + 9, 132, 4, 3, '#241f1c');
      }
    }
    // 부두로 이어지는 방파제 기둥 — 개수와 자리도 항구마다 다르다
    const piers = [];
    for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) {
      const bx = 20 + Math.floor(r() * (VW - 60));
      if (Math.abs(bx - gx) < 34 || piers.some((q) => Math.abs(q - bx) < 40)) continue;
      piers.push(bx);
    }
    for (const bx of piers) {
      g.r(bx, 138, 8, 14, RM);
      g.h(138, bx, bx + 7, RL);
      g.r(bx - 1, 135, 10, 3, RL);
    }

    drawSeaFront(g, ctx, S, r);
    drawQuay(g, S, r);
    // 시각의 색을 배경 전체에 얇게 한 겹 — 지붕·물·부두가 같은 빛 아래 놓인다
    if (mood.wash) { ctx.fillStyle = mood.wash; ctx.fillRect(0, 0, VW, VH); }
  });
}

/* ══════════════════════════════════════════════════════════════
   3. 외해 (전투/항해 연출용)
   ══════════════════════════════════════════════════════════════ */
export function openSeaSprite(mood = 'day') {
  const key = `scene:sea:${mood}`;
  return bake(key, VW, VH, (g, ctx) => {
    const r = rng(mood === 'day' ? 0xBEEF : 0xDEAD);
    const hz = 96;
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    if (mood === 'dusk') {
      sky.addColorStop(0, '#2b3560'); sky.addColorStop(0.5, '#8a5a72'); sky.addColorStop(1, '#e0a06a');
    } else if (mood === 'storm') {
      sky.addColorStop(0, '#232838'); sky.addColorStop(0.6, '#464e60'); sky.addColorStop(1, '#6b7280');
    } else {
      sky.addColorStop(0, '#2f6796'); sky.addColorStop(0.62, '#7fb0d0'); sky.addColorStop(1, '#cfe0e8');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, hz);

    // 구름층
    const cloudCol = mood === 'storm' ? '#3a4152' : mood === 'dusk' ? '#c98a80' : '#f2ead9';
    for (let i = 0; i < 12; i++) {
      const cx = Math.floor(r() * VW), cy = 8 + Math.floor(r() * 60);
      const w = 16 + Math.floor(r() * 34);
      g.ellipse(cx, cy, w, 3 + Math.floor(r() * 4), cloudCol + 'aa');
      g.ellipse(cx - w / 3, cy - 2, w / 2, 3, cloudCol);
    }

    // 바다
    const sea = ctx.createLinearGradient(0, hz, 0, VH);
    if (mood === 'storm') {
      sea.addColorStop(0, '#2c4656'); sea.addColorStop(0.5, '#1d3a4a'); sea.addColorStop(1, '#0e222e');
    } else if (mood === 'dusk') {
      sea.addColorStop(0, '#4a5878'); sea.addColorStop(0.5, '#2a4460'); sea.addColorStop(1, '#101f33');
    } else {
      sea.addColorStop(0, '#3f93ab'); sea.addColorStop(0.45, P.seaM); sea.addColorStop(1, '#0e2c40');
    }
    ctx.fillStyle = sea;
    ctx.fillRect(0, hz, VW, VH - hz);
    g.h(hz, 0, VW - 1, mood === 'day' ? '#a8d4dc' : '#7a8a9a');

    // 원근에 따라 길고 굵어지는 물결
    const foam = mood === 'storm' ? '#8fa4ae' : P.seaH;
    for (let i = 0; i < 700; i++) {
      const t = r() ** 1.7;
      const y = Math.floor(hz + 2 + t * (VH - hz - 2));
      const x = Math.floor(r() * VW);
      const len = 1 + Math.floor(t * 9);
      const c = r() < 0.28 ? foam : (r() < 0.5 ? P.seaL : '#155066');
      g.h(y, x, x + len, c);
      if (len > 5 && r() < 0.4) g.h(y + 1, x + 1, x + len - 1, '#12384c');
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   4. 이펙트
   ══════════════════════════════════════════════════════════════ */

/** 포연 — r 단계별 */
export function smokeSprite(stage) {
  const key = `fx:smoke:${stage}`;
  const S = 40;
  return bake(key, S, S, (g) => {
    const r = rng(0x5A0 + stage);
    const rad = 5 + stage * 4;
    const shade = ['#e8e4dc', '#c9c4bc', '#a49f98', '#7d7973'];
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * rad;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.85;
      const rr = Math.max(1, rad * 0.42 * (1 - d / (rad + 1)) + r() * 2);
      g.ellipse(x, y, rr, rr * 0.9, shade[Math.min(3, Math.floor(d / rad * 3 + r()))]);
    }
  });
}

/** 폭발 — 4프레임 */
export function blastSprite(frame) {
  const key = `fx:blast:${frame}`;
  const S = 44;
  return bake(key, S, S, (g) => {
    const r = rng(0xB1A57 + frame);
    const rad = 4 + frame * 5;
    const cols = frame < 2
      ? ['#fff6d0', P.goldL, P.goldM, '#e07030']
      : [P.goldM, '#d4642a', '#8a3c1e', '#5c4238'];
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2, d = r() ** 0.6 * rad;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d;
      const rr = Math.max(1, rad * 0.4 * (1 - d / (rad + 1)) + r() * 2);
      g.ellipse(x, y, rr, rr, cols[Math.min(3, Math.floor(d / rad * 3.2))]);
    }
    if (frame < 2) g.ellipse(S / 2, S / 2, rad * 0.4, rad * 0.4, '#fffdf2');
    // 파편
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = rad + r() * 6;
      g.px(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, P.woodD);
    }
  });
}

/** 물기둥 (빗나간 포탄) */
export function splashSprite(frame) {
  const key = `fx:splash:${frame}`;
  const W = 24, H = 34;
  return bake(key, W, H, (g) => {
    const r = rng(0x5915 + frame);
    const h = 8 + frame * 7;
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const w = Math.round((3 + frame) * (1 - t * 0.55));
      const yy = H - 2 - y;
      g.h(yy, W / 2 - w, W / 2 + w, t < 0.4 ? '#bfe4e8' : P.seaH);
      if (r() < 0.5) g.px(W / 2 + Math.round((r() - 0.5) * w * 3), yy, '#e8f6f8');
    }
    for (let i = 0; i < 10; i++) {                    // 흩어지는 물방울
      const a = -Math.PI * r(), d = h * (0.5 + r() * 0.6);
      g.px(W / 2 + Math.cos(a) * d * 0.8, H - 4 + Math.sin(a) * d * 0.5, '#d4eef2');
    }
    g.ellipse(W / 2, H - 3, 6 + frame, 2, '#9fd8dc');
  });
}

/** 포탄 */
export function ballSprite() {
  return bake('fx:ball', 6, 6, (g) => {
    g.ellipse(3, 3, 2, 2, P.ironM);
    g.ellipse(2, 2, 1, 1, P.ironL);
    g.px(4, 4, P.ironD);
  });
}

/** 갑판 대포 (백병전/포격 UI용, 측면) */
/* 대포 3종 — 포신 길이와 포가 크기로 종류가 구별된다.
   data.js의 CANNONS와 키를 맞춘다(경포/중포/장포). */
const CANNON_ART = {
  light:  { w: 32, barrel: 13, carriage: 15, wheel: 2 },
  medium: { w: 40, barrel: 20, carriage: 20, wheel: 3 },
  long:   { w: 48, barrel: 30, carriage: 24, wheel: 3 },
};
export const CANNON_ART_KEYS = Object.keys(CANNON_ART);

export function cannonSprite(kind = 'medium', recoil = 0) {
  const A = CANNON_ART[kind] || CANNON_ART.medium;
  return bake(`fx:cannon:${kind}:${recoil}`, A.w, 24, (g, ctx) => {
    const x = 6 - recoil;
    const bEnd = x + 7 + A.barrel;                   // 포신 끝
    const cEnd = x + 2 + A.carriage;                 // 포가 끝
    // 포신
    g.r(x + 8, 8, A.barrel, 6, P.ironM);
    g.h(8, x + 8, bEnd, P.ironL);
    g.h(13, x + 8, bEnd, P.ironD);
    g.r(bEnd - 1, 7, 3, 8, P.ironM);                 // 포구 링
    g.h(7, bEnd - 1, bEnd + 1, P.ironL);
    g.r(x + 5, 7, 5, 8, P.ironD);                    // 약실
    g.ellipse(x + 5, 11, 3, 4, P.ironM);
    g.px(x + 3, 9, P.ironL);
    // 포가
    g.poly([[x + 2, 15], [cEnd, 15], [cEnd - 4, 21], [x + 4, 21]], P.woodM);
    g.h(15, x + 2, cEnd - 1, P.woodL);
    g.h(20, x + 4, cEnd - 4, P.woodD);
    for (const wx of [x + 7, cEnd - 5]) {            // 바퀴
      g.ellipse(wx, 20, A.wheel + 1, A.wheel, P.woodD);
      g.ellipse(wx, 20, A.wheel, A.wheel - 1, P.woodM);
    }
    outline(ctx, A.w, 24);
  });
}

/* ══════════════════════════════════════════════════════════════
   6. 술집 실내
   ══════════════════════════════════════════════════════════════
   선원을 모으는 자리. 항구 씬과 달리 **실내**라 광원이 적다 —
   창으로 드는 저녁빛과 매달린 등불 둘. 어두운 목재를 바탕에 깔고
   등불 둘레만 밝혀 시선이 테이블로 모이게 한다.

   ★ 그림은 **왼쪽 절반(x < 192)에만** 담는다. 오른쪽은 DOM 패널이 덮으므로
     거기 그린 것은 한 픽셀도 보이지 않는다. 처음에 카운터·창·그물을 오른쪽까지
     펼쳤다가 통째로 가려졌다 — 조선소(#yard-panel)와 같은 실수를 반복하지 말 것.

   ★ **배경과 전경이 나뉜다.** 사람이 테이블에 앉은 것처럼 보이려면 테이블이
     인물보다 **앞에** 와야 하는데, 배경 한 장이면 인물이 항상 위에 그려져
     테이블이 발치에 깔린 널빤지처럼 보인다. 그래서 상판과 다리는
     `tavernFrontSprite()`로 빼서 인물을 그린 **뒤에** 덧그린다. */

/* 무리가 앉는 자리 — 캐릭터 **중심 x**와 **발끝 y**.
   그림(테이블)과 씬 코드가 같은 상수를 봐야 사람이 허공에 서지 않는다.
   앞줄 넷은 테이블에 가려 하반신이 보이지 않고, 뒷줄 하나는 통째로 선 모습이다. */
/* ── 방 높이 한 벌 (회차 26 · R-3) ───────────────────────────────
   ★ **이 다섯은 한 벌이다.** 하나만 옮기면 사람이 허공에 서거나 테이블이 벽에 박힌다.
   ★ **왜 낮췄나** — 술집 제 축척(인물 그린 키 37px = 1.7m ⇒ **0.046 m/px**)으로 재면
     들보 아래(y12)부터 바닥선까지 154px = **7.08m**였다. 창고가 아니라 술집이다.
     그 높이의 대부분이 **아무것도 없는 벽**이었다(y 96~166 · 화면의 31%).
     지금은 들보 아래부터 바닥선까지 114px = **5.24m**(−26%)이고, 그 아래 바닥에는
     **카운터**가 서 있다(빈 바닥은 빈 벽만큼 나쁘다).
   ⚠️ **더는 못 낮춘다 — 실측이 그렇게 말했다.** ① 벽에 걸린 물건 중 가장 긴 것이
     창(52px)과 노(70px)라 벽 띠가 86px 밑으로 내려가면 둘을 다시 그려야 한다.
     ② 바닥선을 114까지 올려 봤더니 **바닥이 화면의 절반**이 되어 사람이 빈 널판에 뜬
     꼴이 됐다 — 방을 낮춘 만큼 바닥이 늘기 때문이다(`a-shots/tav-after1-1280x720.png`).
   ⚠️ **인물 크기는 안 건드린다** — 술집이 `char.js`(48×48 · 실질 40px), 부두가
     `char-mini.js`(24×28)를 쓰는 것은 **카메라 거리 차이라 설계대로**다(회차 25 R-3 판정). */
const TAV_CEIL = 12;        // 천장 들보가 차지하는 띠 (0~12)
const TAV_FLOOR = 126;      // 바닥이 시작되는 y  (166 → 126)
const TAV_WAINSCOT = 98;    // 허리 높이 징두리가 시작되는 y (116 → 98)
const TAV_DECOR_DY = -12;   // 벽에 건 것(창·노·술통 선반)을 함께 올린 양
const TAV_RIGHT_DY = -18;   // 오른쪽 벽 물건(굴뚝·항아리·그물·게시판·문)을 올린 양
/* ★ **자리와 테이블은 안 옮긴다.** 처음엔 바닥선을 114까지 올리고 자리를 26px 끌어올렸는데,
   실화면에서 **바닥이 화면의 절반**이 되어 사람이 빈 널판 벌판에 뜬 꼴이 됐다
   (`a-shots/tav-after1-1280x720.png`). 방을 낮추면 그만큼 **바닥이 는다** — 그 자리는
   줄이는 것이 아니라 **채우는 것**이 답이다(아래 `tavCounter`). */
const TAV_SEAT_DY = 0;

export const TAVERN_SEATS = [
  { x: 34,  y: 209 + TAV_SEAT_DY, flip: false },
  { x: 72,  y: 209 + TAV_SEAT_DY, flip: true  },
  { x: 132, y: 209 + TAV_SEAT_DY, flip: false },
  { x: 168, y: 209 + TAV_SEAT_DY, flip: true  },
  { x: 104, y: 184 + TAV_SEAT_DY, flip: true  },   // 뒷줄 — 서서 기다리는 무리
];

/* 테이블 — [x, 폭]. 상판 y는 아래 TAV_TABLE_Y 하나로 맞춘다.
   앞줄 좌석 넷이 이 둘에 나뉘어 앉는다. */
const TAV_TABLES = [[8, 92], [112, 84]];
const TAV_TABLE_Y = 198 + TAV_SEAT_DY;    // 좌석 발끝보다 11px 위 — 그만큼 다리가 가려진다

/** 등불 하나 — 사슬에 매달린 놋쇠 램프 */
function tavernLamp(g, x, y) {
  g.v(x, 0, y - 5, P.ironD);
  g.r(x - 3, y - 4, 7, 3, P.goldD);
  g.h(y - 5, x - 2, x + 2, P.goldM);
  g.r(x - 2, y - 1, 5, 4, P.goldM);
  g.r(x - 1, y, 3, 3, P.goldL);
  g.px(x, y + 1, '#fff6cf');
  g.r(x - 3, y + 3, 7, 1, P.goldD);
}

/** 등불 빛무리.
    알파를 진하게 깔면 벽에 큰 타원 얼룩이 남고, 너무 얕으면 등불이 꺼진 것처럼 보인다.
    바깥은 아주 얕게(0.018) 깔되 **심지 둘레만 좁고 진하게**(0.05) 겹쳐 광원처럼 만든다. */
function lampGlow(g, x, y, r0) {
  for (let i = 6; i >= 1; i--) {
    const rr = r0 * (i / 6);
    g.ellipse(x, y + rr * 0.3, rr, rr * 0.66, 'rgba(255,206,120,0.018)');
  }
  for (let i = 3; i >= 1; i--) {
    const rr = (r0 * 0.26) * (i / 3);
    g.ellipse(x, y + rr * 0.2, rr, rr * 0.8, 'rgba(255,222,150,0.05)');
  }
}

/** 나무 술통 */
function barrel(g, x, y, w = 13, h = 16) {
  g.r(x, y, w, h, P.woodM);
  g.r(x + 1, y + 1, w - 2, h - 2, P.woodL);
  g.r(x + 2, y + 2, 2, h - 4, P.woodH);
  g.h(y + 3, x, x + w - 1, P.ironM);
  g.h(y + h - 4, x, x + w - 1, P.ironM);
  g.h(y, x + 1, x + w - 2, P.woodD);
  g.h(y + h - 1, x + 1, x + w - 2, P.woodD);
}

/* 술집 벽의 재료 — 화풍이 정한다. 항구의 `roofKind`와 같은 발상이다.
   ★ 색만 갈라서는 안 갈린다: 실내는 어두워 색차가 죽으므로 **결(줄눈·켜·격자)**이 있어야
     다른 데로 읽힌다(회차 22 실화면 대조). */
const TAV_HANG = {
  latin: 'garlic', hellenic: 'garlic', levant: 'spice', hanseatic: 'fish', nordic: 'fish',
  swahili: 'spice', guinea: 'gourd', dravidian: 'spice', malabar: 'spice',
  malay: 'spice', sinic: 'lantern', jiangnan: 'lantern', colonial: 'garlic',
};

/** 천장 들보에 매단 것 — 바다마다 다르다. 자리는 씨앗이 흔든다. */
function tavernHang(g, S, r, kind) {
  const xs = [];
  for (let i = 0, n = 3 + Math.floor(r() * 3); i < n; i++) xs.push(104 + Math.floor(r() * 78));
  for (const x of xs) {
    const y = 14 + Math.floor(r() * 5);
    if (kind === 'fish') {                           // 말린 대구 — 북해의 술집
      g.v(x, y, y + 4, '#6d5b3f');
      const h = 12 + Math.floor(r() * 7);
      g.poly([[x, y + 4], [x + 3, y + 6], [x + 3, y + h], [x, y + h + 3], [x - 3, y + h], [x - 3, y + 6]], '#9a8a6a');
      g.v(x, y + 6, y + h, '#c4b48c');
      g.poly([[x - 3, y + h + 1], [x + 3, y + h + 1], [x, y + h + 4]], '#7d6f52');
      g.px(x - 1, y + 7, '#3a3228');
    } else if (kind === 'spice') {                   // 향신료 다발과 고추 — 인도양·향료제도
      g.v(x, y, y + 3, '#6d5b3f');
      for (let k = 0; k < 5; k++) {
        const dx = x - 3 + k, len = 7 + Math.floor(r() * 8);
        g.v(dx, y + 3, y + 3 + len, k % 2 ? '#a8341f' : '#8a2a18');
        g.px(dx, y + 3 + len, '#5f1c10');
      }
      g.h(y + 3, x - 3, x + 2, '#7d6a44');
    } else if (kind === 'lantern') {                 // 붉은 등롱 — 명·조선·일본
      g.v(x, y, y + 3, '#4a3a2e');
      g.ellipse(x, y + 8, 5, 6, '#a8341f');
      g.ellipse(x - 1, y + 7, 3, 4, '#c8543a');
      g.h(y + 3, x - 3, x + 2, '#c8a24a');
      g.h(y + 13, x - 3, x + 2, '#c8a24a');
      g.v(x, y + 14, y + 17, '#c8a24a');
    } else if (kind === 'gourd') {                   // 조롱박 물통 — 기니 만
      g.v(x, y, y + 4, '#6d5b3f');
      g.ellipse(x, y + 11, 5, 6, '#b09050');
      g.ellipse(x, y + 6, 3, 3, '#93743c');
      g.ellipse(x - 2, y + 10, 2, 2, '#c9ab6a');
    } else {                                         // 마늘·양파 타래와 소시지 — 지중해
      g.v(x, y, y + 3, '#6d5b3f');
      for (let k = 0; k < 4; k++) {
        g.ellipse(x + (k % 2 ? 2 : -2), y + 6 + k * 4, 3, 3, k % 2 ? '#d8cdb4' : '#c9bda0');
        g.px(x + (k % 2 ? 2 : -2), y + 4 + k * 4, '#8a7f66');
      }
    }
  }
}

const TAV_WALL = {
  latin: 'stone', hellenic: 'stone', levant: 'plaster', hanseatic: 'brick', nordic: 'log',
  swahili: 'plaster', guinea: 'weave', dravidian: 'plaster', malabar: 'timber',
  malay: 'weave', sinic: 'brick', jiangnan: 'timber', colonial: 'plaster',
};

/* ── 술집의 오른쪽 절반 ────────────────────────────────────────
   ★ 회차 22가 벽 재료·창밖·매단 것을 갈랐는데도 아홉 술집이 여전히 닮아 보인 까닭은
     **오른쪽 절반이 전부 빈 벽**이어서다. 창(x20)·노(x83)·술통 선반(x100~188)이 전부
     왼쪽 절반에 몰려 있고 x200~400에는 벽과 징두리밖에 없었다. 화면의 반이 비면
     남은 반의 차이는 눈에 안 들어온다.
   그래서 오른쪽에 **벽 물건 둘 + 바닥 물건 하나**를 씨앗으로 고른다. 화풍이 후보를 좁힌다 —
   북쪽 바다에는 벽난로가, 향료 바다에는 항아리 선반이 먼저 온다. */

/** 화덕 — 북쪽 바다. 이 그림에서 창 다음으로 밝은 면이라 오른쪽의 닻이 된다 */
function tavHearth(g, S, r, x, C) {
  const [sM, sL, sD] = C;
  g.r(x, 62, 62, 52, sM);                       // 굴뚝 몸통
  g.h(62, x, x + 61, sL);
  g.r(x + 4, 44, 54, 20, sM);                   // 후드
  g.poly([[x + 4, 62], [x + 58, 62], [x + 50, 44], [x + 12, 44]], sL);
  g.h(44, x + 12, x + 49, sD);
  for (let y = 66; y < 112; y += 6) {           // 돌 켜
    g.h(y, x, x + 61, sD);
    const off = ((y - 66) / 6) % 2 ? 9 : 0;
    for (let bx = x + off; bx < x + 62; bx += 18) g.v(bx, y, y + 5, sD);
  }
  g.r(x + 14, 74, 34, 40, '#1a1208');           // 아궁이
  g.poly([[x + 14, 74], [x + 48, 74], [x + 44, 66], [x + 18, 66]], '#1a1208');
  g.r(x + 18, 96, 26, 16, '#3d2a1b');           // 장작
  g.h(96, x + 18, x + 43, P.woodM);
  g.line(x + 20, 108, x + 40, 98, P.woodD);
  g.line(x + 22, 100, x + 42, 108, P.woodD);
  for (let i = 0; i < 9; i++) {                 // 불
    const fx = x + 20 + Math.floor(r() * 22), fh = 6 + Math.floor(r() * 12);
    g.poly([[fx, 106], [fx + 4, 106], [fx + 2, 106 - fh]], i % 3 ? P.redM : P.goldM);
  }
  g.ellipse(x + 31, 104, 13, 6, '#ff9a3c30');
  g.ellipse(x + 31, 104, 8, 4, '#ffc86a38');
  g.r(x + 2, 40, 58, 4, P.woodM);               // 맨틀
  g.h(40, x + 2, x + 59, P.woodL);
  g.r(x + 10, 32, 5, 8, P.clothD);              // 맨틀 위 물건 — 백랍 주전자와 등
  g.h(32, x + 10, x + 14, P.clothM);
  g.ellipse(x + 44, 36, 4, 4, P.woodM);
  g.px(x + 44, 32, P.goldD);
}

/** 항아리 선반 — 향료·인도양. 유약 항아리는 이 바다의 물건이다 */
function tavJars(g, S, r, x) {
  const jar = (jx, jy, w, h, c) => {
    g.ellipse(jx + w / 2, jy + h - 2, w / 2, h / 2, c);
    g.r(jx + 1, jy + 2, w - 2, h - 4, c);
    g.h(jy + 3, jx + 2, jx + w - 3, mixHex(c, '#ffffff', 0.3));
    g.r(jx + Math.floor(w / 3), jy, Math.max(2, w - 2 * Math.floor(w / 3)), 3, mixHex(c, '#000000', 0.3));
    g.h(jy, jx + Math.floor(w / 3) - 1, jx + w - Math.floor(w / 3), mixHex(c, '#ffffff', 0.2));
  };
  const cols = ['#4a6b7a', '#7a5a3a', '#5c6b3a', '#6b4a52', '#3f5a5c'];
  for (const sy of [58, 92]) {
    g.r(x, sy + 20, 74, 3, P.woodM);            // 선반
    g.h(sy + 20, x, x + 73, P.woodL);
    g.h(sy + 23, x, x + 73, P.woodD);
    let jx = x + 2;
    while (jx < x + 66) {
      const w = 9 + Math.floor(r() * 7), h = 12 + Math.floor(r() * 7);
      jar(jx, sy + 20 - h, w, h, cols[Math.floor(r() * cols.length)]);
      jx += w + 2 + Math.floor(r() * 4);
    }
    g.r(x - 2, sy + 20, 2, 10, P.woodD);        // 선반받이
    g.r(x + 73, sy + 20, 2, 10, P.woodD);
  }
}

/** 벽에 건 그물과 부표 — 어느 바다에나 있다.
    ⚠️ 처음엔 네모난 격자로 그렸더니 **방충망**으로 보였다. 그물은 걸린 두 점에서
      늘어지는 물건이라, 위는 처진 줄이고 아래는 고르지 않은 자락이어야 그물로 읽힌다. */
function tavNet(g, S, r, x) {
  const W = 68;
  const px0 = x + 6, px1 = x + W - 6;           // 못 두 개
  const ropeY = (i) => 40 + Math.round(Math.sin((i / W) * Math.PI) * 7);
  const wob = [];
  for (let i = 0; i <= W; i++) wob.push((r() - 0.5) * 5);
  const botY = (i) => 74 + Math.round(Math.sin((i / W) * Math.PI) * 22 + Math.sin(i * 0.31) * 3 + wob[i]);
  // 못
  for (const nx of [px0, px1]) { g.r(nx - 1, 36, 3, 4, P.ironM); g.px(nx, 36, P.ironL); }
  // 그물 면 — 마름모 코
  for (let i = 0; i <= W; i++) {
    const t = ropeY(i), b = botY(i);
    for (let y = t; y <= b; y++) {
      if ((i + y) % 6 === 0 || (i - y + 600) % 6 === 0) g.px(x + i, y, '#8f8878');
    }
    if ((i % 3) === 0) g.px(x + i, b, '#6f6858');   // 아래 자락
  }
  // 걸린 줄 — 그물보다 굵고 밝다
  for (let i = 0; i <= W; i++) { g.px(x + i, ropeY(i), P.clothD); g.px(x + i, ropeY(i) + 1, '#6f6858'); }
  // 부표 — 자락을 따라 매달린다
  for (const i of [10, 28, 46, 60]) {
    const bx = x + i, by = botY(i) - 2;
    g.ellipse(bx, by, 4, 3, P.woodL);
    g.h(by - 1, bx - 2, bx + 1, P.woodH);
    g.px(bx, by - 4, P.woodD);
  }
  // 말린 고기 한 마리 — 그물에 걸어 둔다
  const fx = x + 34, fy = botY(34) + 2;
  g.poly([[fx, fy], [fx + 5, fy - 3], [fx + 10, fy], [fx + 5, fy + 3]], '#8a8578');
  g.poly([[fx + 10, fy - 3], [fx + 13, fy], [fx + 10, fy + 3]], '#6f6858');
  g.px(fx + 3, fy, P.out);
}

/** 게시판 — 이 항구에서 무슨 일이 벌어지는지 종이로 붙어 있다 */
function tavBoard(g, S, r, x) {
  g.r(x, 46, 70, 46, '#4a3524');
  g.box(x, 46, 70, 46, P.woodD);
  g.h(47, x + 1, x + 68, P.woodM);
  for (let i = 0; i < 5; i++) {                 // 붙은 종이 — 크기·기울기가 제각각
    const px0 = x + 4 + Math.floor(r() * 46), py = 50 + Math.floor(r() * 30);
    const w = 12 + Math.floor(r() * 10), h = 8 + Math.floor(r() * 6);
    g.r(px0, py, w, h, P.clothM);
    g.h(py, px0, px0 + w - 1, P.clothL);
    g.h(py + h - 1, px0, px0 + w - 1, P.clothD);
    for (let ly = py + 2; ly < py + h - 1; ly += 2) g.h(ly, px0 + 2, px0 + w - 3, '#00000030');
    g.px(px0 + Math.floor(w / 2), py, P.ironL);  // 못
  }
}

/** 문 — 빛이 새어 든다. 사람이 드나드는 자리가 있어야 방이 닫히지 않는다 */
function tavDoor(g, S, r, x, C) {
  const [sM, , sD] = C;
  g.r(x - 3, 48, 50, 118, sD);                  // 문틀
  g.h(48, x - 3, x + 46, sM);
  g.r(x, 52, 44, 114, mixHex(P.woodD, '#211711', 0.25));
  for (let bx = x + 2; bx < x + 44; bx += 8) g.v(bx, 54, 164, mixHex(P.woodD, '#120c08', 0.4));
  g.r(x + 2, 54, 40, 4, P.woodM);               // 가로 띠 셋
  g.r(x + 2, 100, 40, 4, P.woodM);
  g.r(x + 2, 150, 40, 4, P.woodM);
  g.ellipse(x + 36, 118, 3, 3, P.ironM);        // 손잡이
  g.px(x + 35, 117, P.ironL);
  g.r(x + 44, 52, 3, 114, '#f4e2c41e');         // 문틈으로 새는 빛
  g.r(x + 45, 52, 1, 114, '#f4e2c432');
}

/* ── 카운터 (회차 26 · R-3) ────────────────────────────────────
   ★ **방을 낮추면 그만큼 바닥이 는다.** 빈 바닥은 빈 벽만큼 나쁘다 — 첫 시도에서 바닥선을
     114까지 올렸더니 바닥이 화면의 절반이 되어 사람이 널판 벌판에 떠 있었다.
   ★ 그 자리에 놓을 것이 정해져 있다 — **술집에 카운터가 없었다.** 술통 선반이 벽에 붙어
     있는데 그 아래에 술을 내주는 자리가 없으니 방이 창고로 읽힌다. 선반 **바로 아래**에
     두면 「위에 통, 아래에 카운터」가 한 덩어리로 읽힌다.
   ⚠️ 그릴 수 있는 폭은 논리 x < 196이다(그 오른쪽은 DOM 패널이 덮는다). */
const TAV_BAR = { x: 96, w: 100, h: 26 };
function tavCounter(g, S, r) {
  const { x, w, h } = TAV_BAR;
  const y = TAV_FLOOR;
  const topC = mixHex(P.woodL, '#211711', 0.12);
  const bodyC = mixHex(P.woodM, '#211711', 0.30);
  const darkC = mixHex(P.woodD, '#120c08', 0.30);
  g.r(x, y + 4, w, h - 4, bodyC);                 // 앞판
  for (let bx = x + 5; bx < x + w - 2; bx += 11) g.v(bx, y + 5, y + h - 2, darkC);
  g.r(x, y + h - 3, w, 3, darkC);                 // 굽
  g.r(x - 2, y, w + 4, 5, topC);                  // 상판 — 앞으로 조금 나온다
  g.h(y, x - 2, x + w + 1, P.woodH);
  g.h(y + 4, x - 2, x + w + 1, P.woodD);
  g.h(y + 5, x - 1, x + w, '#00000040');          // 상판 그늘
  // 상판 위 — 잔 셋과 주전자 하나. 이게 있어야 「사람이 쓰는 자리」로 읽힌다
  for (const cx of [x + 12, x + 30, x + 74]) {
    g.r(cx, y - 5, 4, 5, P.clothM);
    g.h(y - 5, cx, cx + 3, P.clothL);
    g.px(cx + 4, y - 3, P.clothD);                // 손잡이
  }
  g.r(x + 50, y - 8, 7, 8, P.goldD);              // 놋 주전자
  g.r(x + 51, y - 7, 5, 3, P.goldM);
  g.px(x + 53, y - 9, P.goldL);
  g.r(x + 57, y - 6, 2, 3, P.goldD);
  g.ellipse(x + 90, y - 3, 4, 3, P.woodD);        // 접시 하나
  // 카운터 옆에 기대 세운 통 하나 — 왼쪽 끝이 허전하다
  barrel(g, x - 14, y - 2, 13, 15);
  g.h(y + 14, x - 20, x - 1, '#00000040');
}

/** 바닥 물건 — 통 더미와 궤짝. 벽만 채우면 방이 납작하다 */
function tavFloorProps(g, S, r, kind, x) {
  if (kind === 'casks') {
    barrel(g, x, 148, 22, 26);
    barrel(g, x + 26, 150, 20, 24);
    barrel(g, x + 12, 126, 20, 23);             // 위에 하나 얹는다
    g.h(174, x - 2, x + 48, '#00000040');       // 바닥 그림자
  } else {
    for (let i = 0, cx = x; i < 3; i++) {       // 궤짝 세 짝
      const w = 20 + Math.floor(r() * 12), h = 16 + Math.floor(r() * 8);
      const y = 174 - h;
      g.r(cx, y, w, h, P.woodM);
      g.h(y, cx, cx + w - 1, P.woodL);
      g.h(y + h - 1, cx, cx + w - 1, P.woodD);
      g.r(cx, y + Math.floor(h / 2) - 1, w, 2, P.woodD);
      g.v(cx + 2, y, y + h - 1, P.woodL);
      g.v(cx + w - 3, y, y + h - 1, P.woodD);
      cx += w + 2;
    }
    g.h(174, x - 2, x + 76, '#00000040');
  }
}

/* 화풍이 후보를 좁힌다 — 북쪽 바다에 항아리 선반이, 향료 바다에 벽난로가 오면 어색하다 */
const TAV_RIGHT = {
  hanseatic: ['hearth', 'net', 'board'], nordic: ['hearth', 'net', 'board'],
  latin: ['hearth', 'board', 'net'], hellenic: ['jars', 'net', 'board'],
  levant: ['jars', 'board', 'net'], swahili: ['jars', 'net', 'board'],
  guinea: ['jars', 'net', 'board'], dravidian: ['jars', 'net', 'board'],
  malabar: ['jars', 'net', 'board'], malay: ['jars', 'net', 'board'],
  sinic: ['jars', 'board', 'net'], jiangnan: ['jars', 'board', 'net'],
  colonial: ['board', 'hearth', 'net'],
};

export function tavernSprite(styleKey = 'latin', seed = 1) {
  const key = `scene:tavern:${styleKey}:${seed}`;
  return bake(key, VW, VH, (g, ctx) => {
    const S = STYLES[styleKey];
    const r = sceneRng(seed);

    /* ── 벽 ───────────────────────────────────────────────
       ★ 여기가 이 그림에서 **가장 넓은 면**이다. 예전에는 화풍과 무관하게 늘
         `S.wallD`에 검정 40%를 얹은 한 가지 판자벽이었고, 그래서 아홉 바다 술집이
         창밖 하늘색 말고는 완전히 같은 그림이었다(회차 22에 넷을 실제로 열어 대조).
         재료를 화풍이 정하게 한다 — 한자는 벽돌, 노르딕은 통나무, 말레이는 대나무 엮음. */
    /* ⚠️ 실내다 — 밝게 잡으면 재료가 아니라 **셔터·콘크리트**로 읽힌다. 실제로 반목조를
       42%만 어둡게 했다가 회벽이 차고 문이 됐다(회차 22 실화면 대조). 어둡게 잡고
       결(줄눈·켜)로만 재료를 말한다. */
    const baseC = mixHex(S.wallD, '#211711', 0.52);
    const jointC = mixHex(S.wallD, '#120c08', 0.70);
    const litC = mixHex(S.wall[2], '#211711', 0.58);
    /* ★ 돌·벽돌·회벽은 **그 바다의 돌색**에서 뽑는다(`S.wall`) — 지중해 석회암은 누런기,
       스와힐리 산호석은 흰기, 레반트 회벽은 붉은 흙기다. 중성 회색으로 깔면 나무벽 칸 옆에서
       그 칸만 죽어 보인다("몇 칸만 미완성" — PM 지적, 회차 22). 어둡게 하되 채도는 남긴다. */
    const stoneM = mixHex(S.wall[1], '#211711', 0.46);
    const stoneL = mixHex(S.wall[2], '#211711', 0.30);
    const stoneD = mixHex(S.wallD, '#120c08', 0.52);
    const kind = TAV_WALL[styleKey] || 'plank';
    g.r(0, 0, VW, TAV_FLOOR, baseC);
    if (kind === 'brick') {                          // 벽돌 — 켜마다 어긋나고 장마다 색이 다르다
      for (let y = TAV_CEIL; y < TAV_FLOOR; y += 5) {
        g.h(y, 0, VW - 1, stoneD);                   // 줄눈
        let x = -Math.floor(r() * 10);
        while (x < VW) {
          const bw = 8 + Math.floor(r() * 5);        // 장 길이도 조금씩 다르다
          const t = mixHex(stoneM, stoneL, 0.05 + r() * 0.55);
          g.r(x + 1, y + 1, Math.max(1, Math.min(bw - 1, VW - x - 1)), 4, t);
          g.h(y + 1, x + 1, x + bw - 1, mixHex(t, stoneL, 0.45));
          g.v(x, y + 1, y + 4, stoneD);
          x += bw;
        }
      }
    } else if (kind === 'stone') {
      /* 다듬은 돌 — **러닝 본드**(켜마다 어긋나게 쌓는다)에 돌마다 폭·밝기가 다르다.
         ★ 같은 간격 세로선 + 가로 줄눈 한 줄이면 돌이 아니라 **창고 셔터**로 읽힌다
           (반목조에서 한 번 밟은 것과 같은 함정 · PM 지적, 회차 22). */
      for (let y = TAV_CEIL; y < TAV_FLOOR; y += 9) {
        g.h(y, 0, VW - 1, stoneD);
        let x = -Math.floor(r() * 26);
        while (x < VW) {
          const bw = 15 + Math.floor(r() * 15);
          const t = mixHex(stoneM, stoneL, r() * 0.6);
          const w2 = Math.max(1, Math.min(bw - 1, VW - x - 1));
          g.r(x + 1, y + 1, w2, 7, t);
          g.h(y + 1, x + 1, x + w2, mixHex(t, stoneL, 0.55));      // 윗면에 빛
          g.h(y + 7, x + 1, x + w2, mixHex(t, stoneD, 0.45));      // 아랫면에 그늘
          g.v(x, y + 1, y + 7, stoneD);
          if (r() < 0.25) g.px(x + 3 + Math.floor(r() * (w2 - 4)), y + 4, mixHex(t, stoneD, 0.5));  // 깨진 자국
          x += bw;
        }
      }
    } else if (kind === 'log') {                     // 통나무 — 위가 밝고 아래가 어둡다
      for (let y = TAV_CEIL; y < TAV_FLOOR; y += 8) {
        g.h(y, 0, VW - 1, litC);
        g.h(y + 6, 0, VW - 1, jointC);
        g.h(y + 7, 0, VW - 1, jointC);
      }
    } else if (kind === 'weave') {                   // 대나무·야자잎 엮음 — 잔 격자
      for (let y = TAV_CEIL; y < TAV_FLOOR; y += 3) {
        for (let x = ((y / 3) | 0) % 2 * 2; x < VW; x += 4) {
          g.h(y, x, x + 1, litC);
          g.h(y + 1, x + 2, x + 3, jointC);
        }
      }
    } else if (kind === 'timber') {
      /* 회벽 + 나무 기둥보(반목조).
         ★ 두 번 손봤다. ① 밝게 깔았더니 콘크리트 셔터 ② 어둡게만 했더니 이번엔 **잿빛 울타리**가
           됐다 — 기둥이 같은 간격으로 반복되고 빗장이 모든 칸에 똑같이 들어갔기 때문이다.
           흰 회벽을 중성 회색으로 어둡게 하면 채도가 0이 된다. **누런 흙벽 쪽으로** 어둡히고,
           칸 너비와 빗장 유무를 씨앗에 맡긴다(PM 지적, 회차 22). */
      /* ★ 흰 회벽(강남·조선)을 중성으로 어둡히면 **채도가 0**이 되어 잿빛 판때기가 된다.
         실내 광원이 기름등불이므로 **등불 색 쪽으로 먼저 편향시킨 뒤** 어둡힌다. */
      g.r(0, TAV_CEIL, VW, TAV_FLOOR - TAV_CEIL, mixHex(mixHex(S.wall[2], '#d8a86a', 0.5), '#4a3722', 0.46));
      const post = mixHex(P.woodD, '#160f0a', 0.30);
      const postL = mixHex(post, '#8a7052', 0.42);
      const xs = [];
      for (let x = -4; x < VW; ) { xs.push(x); x += 22 + Math.floor(r() * 16); }
      for (const x of xs) {
        const pw = 3 + (r() < 0.3 ? 1 : 0);
        g.r(x, TAV_CEIL, pw, TAV_FLOOR - TAV_CEIL, post);
        g.v(x, TAV_CEIL, TAV_FLOOR - 1, postL);
      }
      /* ★ 중방·빗장·얼룩은 **벽 띠 안**에 머물러야 한다 — 방을 낮춘 뒤(R-3) 옛 값(52~64 +
         빗장 26px)은 징두리를 뚫고 내려갔다. 벽 띠에서 비율로 잡는다. */
      const wallH = TAV_WAINSCOT - TAV_CEIL;
      const rail = TAV_CEIL + Math.floor(wallH * (0.42 + r() * 0.14));
      g.r(0, rail, VW, 4, post);
      g.h(rail, 0, VW - 1, postL);
      g.h(rail + 3, 0, VW - 1, '#00000040');
      for (let i = 0; i < xs.length - 1; i++) {      // 빗장은 **어떤 칸에만** 든다
        const a = xs[i] + 4, b = xs[i + 1] - 1;
        if (b - a < 8) continue;
        const k = r();
        const bh = Math.max(8, Math.min(24, TAV_WAINSCOT - rail - 8));
        if (k < 0.34) { g.line(a, rail + 6, b, rail + bh, post); g.line(a, rail + bh, b, rail + 6, post); }
        else if (k < 0.62) g.line(a, rail + bh, b, rail + 6, post);
      }
      // 회벽 얼룩 — 면이 고르면 다시 판때기로 보인다
      for (let i = 0; i < 24; i++) {
        g.ellipse(Math.floor(r() * 200), TAV_CEIL + 4 + Math.floor(r() * (wallH - 8)), 5 + r() * 11, 3 + r() * 6, '#00000010');
      }
    } else if (kind === 'plaster') {                 // 석회 회벽 — 결이 없고 벽감이 하나
      g.r(0, TAV_CEIL, VW, TAV_FLOOR - TAV_CEIL, stoneM);
      // 얼룩 — 회벽은 고르게 마르지 않는다. 이게 없으면 종이 한 장으로 보인다
      const pwH = TAV_WAINSCOT - TAV_CEIL;
      for (let i = 0; i < 34; i++) {
        const cx = Math.floor(r() * 200), cy = TAV_CEIL + 2 + Math.floor(r() * (pwH - 4));
        g.ellipse(cx, cy, 6 + r() * 14, 3 + r() * 8, r() < 0.5 ? '#00000012' : mixHex(stoneL, stoneM, 0.5) + '22');
      }
      g.r(0, TAV_CEIL, VW, 3, mixHex(stoneL, stoneM, 0.4));   // 천장 가까이가 조금 밝다
      for (let i = 0; i < 26; i++) {                 // 실금 — 아주 밋밋하면 종이로 보인다
        const cx = Math.floor(r() * 190), cy = TAV_CEIL + 4 + Math.floor(r() * (pwH - 10));
        for (let k = 0, yy = cy; k < 3 + Math.floor(r() * 5); k++, yy++) g.px(cx + Math.round(k * (r() - 0.5) * 2), yy, jointC);
      }
      /* 아치 벽감 — ⚠️ **자리를 두 번 옮겼다(R-3).** ① 원래 자리(y 60~82)는 방을 낮추자
         술통 선반의 통과 겹쳐 **검은 상자**가 됐다(레반트·스와힐리에서 눈으로 잡았다).
         ② 창 아래(y 74~96)로 내렸더니 이번엔 징두리에 닿아 **검은 구멍**이 됐다.
         ⇒ 통 **위**의 빈 벽(x 157~180 · y 36~58)이 어느 화풍에서도 비어 있는 유일한 자리다. */
      const ny = TAV_CEIL + 24, nx = 168;
      g.ellipse(nx, ny, 11, 12, jointC);
      g.r(nx - 11, ny, 23, 22, jointC);
      g.ellipse(nx, ny, 9, 10, mixHex(baseC, '#000000', 0.35));
      g.r(nx - 9, ny, 19, 20, mixHex(baseC, '#000000', 0.35));
      g.r(nx - 5, ny + 14, 4, 6, P.clothD); g.px(nx - 4, ny + 13, P.goldM);   // 벽감에 놓인 물병
    } else {                                         // 세로 널판 (기본)
      for (let x = 0; x < VW; x += 7) g.v(x, TAV_CEIL, TAV_FLOOR - 1, jointC);
      for (let y = TAV_CEIL; y < TAV_FLOOR; y += 3) g.h(y, 0, VW - 1, '#00000012');
    }
    g.r(0, 0, VW, TAV_FLOOR, '#00000030');           // 실내 그늘 — 재료가 뭐든 안은 어둡다
    /* ★ **등불 빛이 벽에 닿아야 한다.** 나무벽은 결이 빛을 받아 저절로 살았는데 돌·회벽은
       면이 고르게 균일해 등불이 걸려 있는데도 평평해 보였다(PM 지적, 회차 22).
       벽 재료 위에 한 겹 얹는다 — 등불 스프라이트보다 **먼저**라야 벽에 스민 것으로 보인다. */
    for (const [lx, ly] of [[52, 44], [148, 40]]) {
      for (let i = 6; i >= 1; i--) {
        g.ellipse(lx, ly + 10, 14 + i * 9, 10 + i * 7, `rgba(255,198,116,0.0${i > 3 ? 1 : 2})`);
      }
    }

    // ── 천장 들보 ────────────────────────────────────────
    g.r(0, 0, VW, TAV_CEIL, P.woodD);
    g.h(TAV_CEIL, 0, VW - 1, P.out2);
    g.h(TAV_CEIL - 1, 0, VW - 1, P.woodM);
    for (let x = 10; x < 200; x += 44) {
      g.r(x, 0, 9, TAV_CEIL, P.woodM);
      g.v(x, 0, TAV_CEIL - 1, P.woodL);
      g.v(x + 8, 0, TAV_CEIL - 1, P.woodD);
    }

    // ── 창 (하나만, 왼쪽) ─────────────────────────────────
    // 실내가 어두우므로 창이 화면에서 가장 밝은 면이 된다 — 시선의 닻이다.
    /* ★ 창밖은 **그 바다의 물빛과 그 항구의 시각**이라야 한다. 전에는 하늘만 화풍을 따르고
       물은 어느 바다에서나 같은 `P.sea*`였다 — 아홉 술집의 유일한 차이가 하늘 3px이었다. */
    const wm = moodOf(r);
    const WS = styleAtHour(S, wm);
    const WC = seaOf(S);
    const wx = 20, wy = 28 + TAV_DECOR_DY;        // ★ 창은 한 벌로 올린다 (R-3)
    g.r(wx - 3, wy, 52, 52, P.woodD);
    g.r(wx, wy + 3, 46, 46, WS.sky[2]);
    g.r(wx, wy + 3, 46, 22, WS.sky[1]);
    g.r(wx, wy + 3, 46, 10, WS.sky[0]);
    g.r(wx, wy + 34, 46, 15, WC[2]);
    g.h(wy + 38, wx, wx + 45, WC[1]);
    g.h(wy + 42, wx + 5, wx + 26, WC[3]);
    for (let i = 0; i < 14; i++) {                   // 창밖 잔물결
      const yy = wy + 35 + Math.floor(r() * 13), xx = wx + Math.floor(r() * 40);
      g.h(yy, xx, xx + 1 + Math.floor(r() * 4), yy > wy + 42 ? WC[3] : WC[0]);
    }
    g.r(wx + 10, wy + 27, 18, 7, P.blackM);       // 정박한 배 실루엣
    g.v(wx + 17, wy + 14, wy + 27, P.blackM);
    g.poly([[wx + 18, wy + 15], [wx + 28, wy + 26], [wx + 18, wy + 26]], '#2a2230');
    g.v(wx + 22, wy + 3, wy + 48, P.woodM);       // 창살
    g.h(wy + 25, wx, wx + 45, P.woodM);
    g.box(wx - 3, wy, 52, 52, P.out2);

    // ── 벽에 걸린 노 ─────────────────────────────────────
    // 여기 오는 사람들이 뭘 하는 사람인지 한 줄로 말한다.
    // 자루를 가늘게 뽑고 날을 작게 두면 빗자루로 보인다 — 날은 넓고 길어야 노다.
    const oy = TAV_DECOR_DY;                       // ★ 노도 같은 만큼 (R-3)
    g.r(83, 30 + oy, 4, 44, P.woodM);
    g.v(83, 30 + oy, 73 + oy, P.woodL);
    g.v(86, 30 + oy, 73 + oy, P.woodD);
    g.r(82, 30 + oy, 6, 3, P.woodH);               // 손잡이 마구리
    g.poly([[79, 72 + oy], [91, 72 + oy], [92, 92 + oy], [85, 100 + oy], [78, 92 + oy]], P.woodL);   // 날
    g.poly([[81, 74 + oy], [89, 74 + oy], [89, 90 + oy], [85, 96 + oy], [81, 90 + oy]], P.woodH);
    g.v(85, 74 + oy, 95 + oy, P.woodM);            // 날 가운데 능선
    g.line(79, 72 + oy, 78, 92 + oy, P.woodD);
    g.line(91, 72 + oy, 92, 92 + oy, P.woodD);

    // ── 술통 선반 ────────────────────────────────────────
    const sy = TAV_DECOR_DY;                       // ★ 선반과 술통도 같은 만큼 (R-3)
    g.r(100, 88 + sy, 88, 3, P.woodM);
    g.h(88 + sy, 100, 187, P.woodL);
    barrel(g, 104, 72 + sy, 15, 16);
    barrel(g, 124, 74 + sy, 13, 14);
    barrel(g, 144, 72 + sy, 15, 16);
    barrel(g, 166, 75 + sy, 12, 13);
    // 선반 아래 매달린 컵들
    for (const cx of [108, 120, 152, 174]) {
      g.r(cx, 92 + sy, 3, 4, P.clothD);
      g.h(96 + sy, cx, cx + 2, P.clothM);
    }

    /* ── 들보에 매단 것 ──────────────────────────────────
       ★ "이 술집이 어느 바다에 있나"를 한 줄로 말하는 자리. 벽 재료가 결을 주고,
         여기가 **내용**을 준다. 없으면 아홉 술집이 다시 한 그림이 된다. */
    tavernHang(g, S, r, TAV_HANG[styleKey] || 'garlic');

    /* ── 오른쪽 절반 ─────────────────────────────────────
       벽 물건 둘을 고른다. 하나는 화풍이 먼저 미는 것, 하나는 나머지에서. */
    const pool = TAV_RIGHT[styleKey] || ['board', 'net', 'jars'];
    const wallA = r() < 0.72 ? pool[0] : pool[1];
    const rest = pool.filter((k) => k !== wallA).concat(['door']);
    const wallB = rest[Math.floor(r() * rest.length)];
    const stoneC = [stoneM, stoneL, stoneD];
    const slot = [212, 300];                      // 두 자리 — 자리 안에서 조금씩 흔든다
    const place = (kind, sx) => {
      if (kind === 'hearth') tavHearth(g, S, r, sx, stoneC);
      else if (kind === 'jars') tavJars(g, S, r, sx + 4);
      else if (kind === 'net') tavNet(g, S, r, sx + 6);
      else if (kind === 'door') tavDoor(g, S, r, sx + 10, stoneC);
      else tavBoard(g, S, r, sx + 4);
    };
    /* ★ 이 다섯(굴뚝·항아리·그물·게시판·문)은 **옛 방 높이(바닥선 166)에 맞춰 그려져 있다** —
       방을 낮춘 뒤 그대로 두면 징두리가 아궁이를 덮고 문이 바닥을 뚫는다.
       y 좌표를 예순 군데 고치는 대신 **캔버스를 옮겨서** 통째로 올린다(정수 이동이라
       픽셀이 어긋나지 않는다 — `pixel.js: G`가 `fillRect`를 `|0`으로 찍는다).
       ⚠️ 이 자리(논리 x≥212)는 **DOM 패널이 덮어 게임에서는 한 픽셀도 안 보인다** —
         발견 경위와 제안은 `A-ISSUES.md` E-1. 그래도 어긋난 채로 두지는 않는다. */
    ctx.save();
    ctx.translate(0, TAV_RIGHT_DY);
    place(wallA, slot[0] + Math.floor(r() * 10));
    place(wallB, slot[1] + Math.floor(r() * 10));
    ctx.restore();

    // ── 허리 높이 목재 징두리 ─────────────────────────────
    g.r(0, TAV_WAINSCOT, VW, TAV_FLOOR - TAV_WAINSCOT, P.woodD);
    g.h(TAV_WAINSCOT, 0, VW - 1, P.woodM);
    g.h(TAV_WAINSCOT + 1, 0, VW - 1, P.woodL);
    for (let x = 0; x < 200; x += 13) g.v(x, TAV_WAINSCOT + 2, TAV_FLOOR - 1, '#00000038');
    // 문은 바닥까지 내려온다 — 징두리가 덮으면 벽에 그린 그림이 된다
    if (wallA === 'door' || wallB === 'door') {
      /* ⚠️ 이 자리는 `TAV_RIGHT_DY` **밖**이다 — 문의 아랫도리는 징두리·바닥 상수로 직접 그린다
         (문은 바닥까지 내려와야 하고, 그 바닥은 이제 `TAV_FLOOR`다). */
      const dx = (wallA === 'door' ? slot[0] : slot[1]) + 10;
      g.r(dx, TAV_WAINSCOT, 44, TAV_FLOOR - TAV_WAINSCOT, mixHex(P.woodD, '#211711', 0.25));
      g.r(dx + 44, TAV_WAINSCOT, 3, TAV_FLOOR - TAV_WAINSCOT, '#f4e2c41e');
      g.r(dx - 3, TAV_WAINSCOT, 3, TAV_FLOOR - TAV_WAINSCOT, stoneD);
    }

    // ── 바닥 ────────────────────────────────────────────
    // 벽(징두리)보다 **밝게** 둔다. 어둡게 깔았더니 벽과 붙어 바닥이 사라졌다.
    g.r(0, TAV_FLOOR, VW, VH - TAV_FLOOR, P.woodM);
    g.h(TAV_FLOOR, 0, VW - 1, P.woodD);
    g.h(TAV_FLOOR + 1, 0, VW - 1, P.woodH);
    for (let y = TAV_FLOOR + 3; y < VH; y += 6) {
      g.h(y, 0, VW - 1, '#00000026');
      // 판자 이음매를 줄마다 어긋나게 — 격자로 깔면 타일처럼 보인다
      const off = Math.floor(r() * 46);
      for (let x = off; x < VW; x += 68) g.v(x, y - 2, Math.min(VH - 1, y + 3), '#00000030');
    }
    /* ★ **카운터** — 방을 낮추며 늘어난 바닥을 채운다(R-3). 술통 선반 바로 아래다. */
    tavCounter(g, S, r);
    /* ★ 왼쪽 바닥에도 하나 — 지금까지 바닥 물건은 **x 236**에만 있었고 그 자리는
       DOM 패널 뒤라 한 번도 보인 적이 없다(A-ISSUES E-1). 보이는 쪽에 한 무리를 더 둔다. */
    /* ⚠️ 궤짝(`crates`)은 폭이 최대 108px이라 x=6에 두면 카운터(x 96~)를 파고든다 —
       보이는 쪽은 통(`casks` · 폭 48)으로 고정한다. 궤짝은 오른쪽(넓은 자리)에 그대로 둔다. */
    tavFloorProps(g, S, r, 'casks', 6 + Math.floor(r() * 8));
    // 오른쪽 바닥에도 물건을 둔다 — 벽만 채우면 방이 납작하다
    tavFloorProps(g, S, r, r() < 0.5 ? 'casks' : 'crates', 236 + Math.floor(r() * 40));

    // 앞으로 갈수록 어둡게 — 바닥이 눕는 느낌
    for (let y = VH - 22; y < VH; y++) g.h(y, 0, VW - 1, '#0000000a');

    // ── 등불과 빛 ───────────────────────────────────────
    const lx3 = 268 + Math.floor(r() * 60);       // 오른쪽에도 등이 하나 — 없으면 그쪽만 어둡다
    lampGlow(g, 52, 44, 84);
    lampGlow(g, 148, 40, 76);
    lampGlow(g, lx3, 36, 70);
    tavernLamp(g, 52, 44);
    tavernLamp(g, 148, 40);
    tavernLamp(g, lx3, 36);

    // ── 구석 그늘 ───────────────────────────────────────
    for (let i = 0; i < 22; i++) {
      g.box(-i, -i, VW + i * 2, VH + i * 2, `rgba(20,14,26,0.0${Math.max(1, 5 - Math.floor(i / 5))})`);
    }
  });
}

/* 전경 스프라이트가 놓이는 자리 — 테이블이 차지하는 만큼만 굽는다.
   ★ 처음엔 화면 전체(400×225 = 352KB)로 구웠는데, 실제로 그리는 것은 테이블 둘뿐이라
     **95%가 투명 픽셀**이었다. 화면 크기로 굽는 것이 편하다는 이유로 항구 배경 한 장과
     같은 메모리를 먹고 있었다. 전경·오버레이는 반드시 **그리는 영역만** 굽는다. */
export const TAV_FRONT = { x: 0, y: TAV_TABLE_Y - 8, w: 200, h: 34 };

/** 테이블 앞면 — **인물을 그린 뒤** 덧그린다. 이게 있어야 "앉아 있는" 것으로 보인다. */
export function tavernFrontSprite() {
  return bake('scene:tavern:front', TAV_FRONT.w, TAV_FRONT.h, (g) => {
    for (const [x, w] of TAV_TABLES) {
      const y = TAV_TABLE_Y - TAV_FRONT.y;    // 스프라이트 안의 좌표로 옮긴다
      // 상판
      g.r(x, y, w, 4, P.woodL);
      g.h(y, x, x + w - 1, P.woodH);
      g.h(y + 3, x, x + w - 1, P.woodD);
      // 앞치마와 다리
      g.r(x + 1, y + 4, w - 2, 3, P.woodM);
      g.h(y + 6, x + 1, x + w - 2, '#00000040');
      g.r(x + 4, y + 7, 4, 13, P.woodM);
      g.r(x + w - 8, y + 7, 4, 13, P.woodM);
      g.v(x + 4, y + 7, y + 19, P.woodL);
      g.v(x + w - 8, y + 7, y + 19, P.woodL);
      g.h(y + 20, x + 4, x + 7, P.woodD);
      g.h(y + 20, x + w - 8, x + w - 5, P.woodD);
      // 상판 위 잔과 병 — 방금까지 누가 마시고 있었다
      g.r(x + 12, y - 4, 3, 4, P.clothM);
      g.px(x + 13, y - 5, P.clothL);
      g.r(x + 26, y - 6, 4, 6, P.grnD);
      g.px(x + 27, y - 7, P.grnM);
      g.px(x + 28, y - 4, P.grnL);
      g.r(x + w - 16, y - 4, 3, 4, P.clothM);
      g.px(x + w - 15, y - 5, P.clothL);
      g.r(x + w - 28, y - 3, 3, 3, P.goldD);
    }
  });
}
