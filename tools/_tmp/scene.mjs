// scene.js — 배경 스프라이트 (권역 지도 / 항구 도시 / 외해)
// 게임 논리 해상도 400x225 기준으로 그린 뒤 정수배 확대해서 쓴다.

import { PAL as P, G, bake, outline, rng } from '../pixel.js';
import { autoLandMap, scatterIsles } from './maps/auto.js';
import { mapDefOf, climateOf } from './maps/index.js';

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

/** 산줄기를 자동으로 놓는다 — 손으로 찍은 폴리라인이 없는 권역용.
    육지 덩어리의 안쪽(바다에서 먼 곳)을 따라 굽은 선을 몇 줄 앉힌다.
    실제 산맥을 재현하는 게 아니라 **육지가 평평해 보이지 않게** 하는 장치다. */
function autoRanges(land, seed) {
  const r = rng(seed ^ 0x3A17);
  const inland = [];
  for (let y = 12; y < VH - 12; y += 3) {
    for (let x = 12; x < VW - 12; x += 3) {
      if (!land[y * VW + x]) continue;
      // 사방 9px이 다 육지면 '안쪽'이다
      let deep = true;
      for (const [dx, dy] of [[9, 0], [-9, 0], [0, 9], [0, -9]]) {
        if (!land[(y + dy) * VW + (x + dx)]) { deep = false; break; }
      }
      if (deep) inland.push([x, y]);
    }
  }
  const out = [];
  for (let n = 0; n < 7 && inland.length; n++) {
    const [sx, sy] = inland[Math.floor(r() * inland.length)];
    const path = [[sx, sy]];
    let x = sx, y = sy;
    const dx = (r() - 0.5) * 26, dy = (r() - 0.5) * 20;
    for (let k = 0; k < 2; k++) {
      x = Math.round(x + dx + (r() - 0.5) * 14);
      y = Math.round(y + dy + (r() - 0.5) * 12);
      path.push([x, y]);
    }
    out.push(path);
  }
  return out;
}

/**
 * 권역 지도.
 * @param regionId 권역 id. 없으면 지중해.
 * @param cities   그 권역의 도시 [{id,x,y,size}] — 자동 생성 권역에만 쓰인다
 * @param routes   그 권역 **안**의 항로 [[aId,bId]]
 */
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
      isles = def.hand.isles ?? [];
      ranges = def.hand.ranges ?? [];
    } else {
      land = autoLandMap(cities, routes, def.auto);
      isles = scatterIsles(land, cities, routes, { seed: seed ^ 0x15E5, count: def.auto?.isles ?? 14 });
      ranges = autoRanges(land, seed);
    }

    // 2) 육지 찍기
    for (let y = 0; y < VH; y++) {
      let run = -1;
      for (let x = 0; x <= VW; x++) {
        const on = x < VW && land[y * VW + x];
        if (on && run < 0) run = x;
        else if (!on && run >= 0) { g.h(y, run, x - 1, clim.land); run = -1; }
      }
    }
    // 3) 섬
    for (const [cx, cy, rx, ry] of isles) g.ellipse(cx, cy, rx, ry, clim.land);

    // 4) 육지 마스크 확보 — 이후 텍스처를 육지 안에만 찍기 위해
    const mask = ctx.getImageData(0, 0, VW, VH).data;
    const isLand = (x, y) =>
      x >= 0 && y >= 0 && x < VW && y < VH && mask[((y | 0) * VW + (x | 0)) * 4 + 3] > 0;

    /* 5) 지대 색조 — 삼림 / 관목 / 사막 / 툰드라.
       경계를 직선으로 두면 띠처럼 보이므로 기후 정의가 파형 함수를 준다.
       `zones`가 없는 기후(열대)는 통짜 초록이다 — 그것이 그 바다의 인상이다. */
    const Z = clim.zones;
    const zoneOf = (x, y) => {
      if (!Z) return 'forest';
      const extra = Z.extra?.(x, y);
      if (extra) return extra;
      if (Z.desertY && y > Z.desertY(x)) return 'desert';
      if (Z.tundraY && y < Z.tundraY(x)) return 'tundra';
      if (Z.forestY && y > Z.forestY(x)) return 'forest';
      if (Z.scrubY && y > Z.scrubY(x)) return 'scrub';
      return 'forest';
    };
    for (let y = 0; y < VH; y++) {
      for (let x = 0; x < VW; x++) {
        if (!isLand(x, y)) continue;
        const c = clim.zone?.[zoneOf(x, y)];
        if (c) g.px(x, y, c);
      }
    }
    // 6) 내륙 얼룩 (육지 한정) — 통짜 색면을 깨서 손으로 칠한 느낌을 낸다
    const [altD, altM, altL] = clim.alt;
    for (let i = 0; i < 16000; i++) {
      const x = Math.floor(r() * VW), y = Math.floor(r() * VH);
      if (!isLand(x, y)) continue;
      const v = r(), z = zoneOf(x, y);
      if (z === 'desert') {
        if (v < 0.32) g.px(x, y, P.sandD);
        else if (v < 0.48) g.px(x, y, '#d4b47c');
      } else if (v < 0.24) g.px(x, y, altD);
      else if (v < 0.36) g.px(x, y, z === 'scrub' ? altL : altM);
    }

    // 7) 산맥 (육지 한정)
    for (const path of ranges) {
      for (let i = 0; i < path.length - 1; i++) {
        const [x0, y0] = path[i], [x1, y1] = path[i + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= steps; s += 3) {
          const t = s / steps;
          const x = Math.round(x0 + (x1 - x0) * t + (r() - 0.5) * 5);
          const y = Math.round(y0 + (y1 - y0) * t + (r() - 0.5) * 5);
          if (!isLand(x, y) || !isLand(x, y - 3)) continue;
          const h = 2 + Math.floor(r() * 3);
          for (let k = 0; k < h; k++) {
            g.h(y - k, x - (h - k - 1), x + (h - k - 1), k === h - 1 ? '#8f8a72' : '#5d5a48');
          }
          g.px(x, y - h + 1, '#c9c4a8');
        }
      }
    }

    // 8) 해안선 → 얕은 바다 순으로 바깥으로 번지게
    for (const c of clim.shore) outline(ctx, VW, VH, c);

    // 9) 남은 빈 픽셀 = 외해
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, clim.sea[0]);
    grad.addColorStop(0.55, clim.sea[1]);
    grad.addColorStop(1, clim.sea[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();

    // 10) 해류 결 — 바다 위에만
    const r2 = rng(seed ^ 0x51DE);
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(r2() * VW), y = Math.floor(r2() * VH);
      if (isLand(x, y) || isLand(x, y - 4) || isLand(x, y + 4)) continue;
      const len = 2 + Math.floor(r2() * 4);
      g.h(y, x, x + len, clim.shore[3]);
    }
  });
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
    tower: 'dome', accent: P.grnL, roofKind: 'thatch',
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
    tower: 'pagoda', accent: P.grnL, roofKind: 'thatch',
  },

  /* ── 동아시아 ─────────────────────────────────────────── */
  sinic: {    // 민남(복건·광동): 붉은 벽돌과 붉은 기와, 제비꼬리 용마루, 마조 사당
    wall: ['#c47a54', '#a85c3c', '#dda078'], wallD: '#7a3f24',
    roof: ['#a03a2a', '#7f2a1c', '#c25440'], roofD: '#5c1a12',
    sky: ['#5a86a8', '#a8bcc4', '#e4d4b8'], hill: '#4a6b3a', hillD: '#31492a',
    sea: ['#2d7f8c', '#1d5a6c', '#0f3646', '#4aa2ac'],
    tower: 'pagoda', accent: P.goldM, roofKind: 'eave',
  },
  // 강남·조선·일본이 함께 쓴다 — 흰 회벽에 짙은 기와, 길게 뻗은 처마, 돔이 아닌 층탑.
  // 셋의 차이는 지붕 곡선인데 400×225 원경에서는 갈리지 않아 한 화풍으로 묶었다.
  jiangnan: {
    wall: ['#e0dccd', '#c6c0ae', '#f2eee0'], wallD: '#9a9382',
    roof: ['#4a4c52', '#33353a', '#63656d'], roofD: '#212227',
    sky: ['#4a7ba8', '#9dbdd2', '#e6dcc4'], hill: '#4a6b4a', hillD: '#2f4a33',
    sea: ['#2d7a8c', '#1d5668', '#0f3242', '#469caa'],
    tower: 'pagoda', accent: P.redM, roofKind: 'eave',
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

/* 항구 씬 세로 배치
   0 ─ 하늘 ─ 78 ─ 구릉 ─ 132 ─ 시가지/성벽 ─ 150 ─ 정박 수면 ─ 186 ─ 부두 ─ 225 */
const HORIZON = 150;
const QUAY_Y = 186;

function skyGradient(ctx, S) {
  const grad = ctx.createLinearGradient(0, 0, 0, HORIZON);
  grad.addColorStop(0, S.sky[0]);
  grad.addColorStop(0.6, S.sky[1]);
  grad.addColorStop(1, S.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, HORIZON);
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
  const h = hMin + Math.floor(r() * (hMax - hMin));
  const top = groundY - h;
  const wall = S.wall[Math.floor(r() * S.wall.length)];
  g.r(x, top, w, h, wall);
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
  const cols = Math.max(1, Math.floor((w - 3) / 4));
  const rows = Math.max(1, Math.floor((h - 4) / 5));
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const wx = x + 2 + cx * 4, wy = top + 3 + cy * 5;
      if (wx + 1 >= x + w - 1) continue;
      const lit = r() < 0.22;
      g.r(wx, wy, 2, 3, lit ? P.goldM : '#4a3a2e');
      if (lit) g.px(wx, wy, P.goldL);
      if (r() < 0.3) g.h(wy + 3, wx, wx + 1, S.wallD);   // 차양
    }
  }
  return top;
}

function landmark(g, S, r, x, groundY) {
  switch (S.tower) {
    case 'campanile': {                              // 종탑
      const w = 9, h = 62, top = groundY - h;
      g.r(x, top, w, h, S.wall[2]);
      g.v(x, top, groundY, S.wallD);
      g.v(x + w - 1, top, groundY, S.wallD);
      for (let i = 0; i < 4; i++) g.r(x + 2, top + 14 + i * 12, 2, 5, '#3f3226');
      g.r(x - 2, top - 2, w + 4, 4, S.wall[1]);       // 종실
      g.r(x, top - 12, w, 10, S.wall[0]);
      g.r(x + 3, top - 9, 3, 6, '#3a2f24');
      for (let k = 0; k < 7; k++) g.h(top - 12 - k, x + k, x + w - 1 - k, S.roof[1]);
      g.px(x + 4, top - 21, P.goldM);
      break;
    }
    case 'dome': {                                   // 돔 성당
      const w = 30, h = 26, top = groundY - h;
      g.r(x, top, w, h, S.wall[0]);
      g.h(top, x, x + w - 1, S.wall[2]);
      g.ellipse(x + w / 2, top, 13, 12, S.roof[0]);
      g.ellipse(x + w / 2 - 3, top - 1, 8, 9, S.roof[2]);
      g.ellipse(x + w / 2 + 6, top + 2, 5, 8, S.roofD);
      g.r(x + w / 2 - 1, top - 16, 2, 4, P.goldM);
      g.px(x + w / 2, top - 17, P.goldL);
      for (let i = 0; i < 4; i++) g.r(x + 3 + i * 7, top + 8, 3, 8, '#3f4a58');
      break;
    }
    case 'minaret': {                                // 미나레트 + 돔
      const w = 7, h = 68, top = groundY - h;
      g.r(x, top, w, h, S.wall[2]);
      g.v(x + w - 1, top, groundY, S.wallD);
      g.r(x - 2, top + 16, w + 4, 2, S.roof[0]);      // 발코니
      g.r(x - 2, top + 4, w + 4, 2, S.roof[0]);
      g.r(x + 1, top + 8, 2, 6, '#3f3226');
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
      const w = 15, h = 44, top = groundY - h;
      g.r(x, top, w, h, S.wall[0]);
      g.v(x, top, groundY, S.wallD);
      g.v(x + w - 1, top, groundY, S.wallD);
      for (let i = 0; i < 3; i++) {                  // 좁고 긴 창 — 벽돌 고딕의 인상
        const wx = x + 2 + i * 5;
        g.r(wx, top + 9, 2, 10, '#33262c');
        g.h(top + 8, wx, wx + 1, S.wall[2]);
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
      const tiers = 5;
      // 위층부터 그린다. 아래층 처마가 위층 몸통 앞으로 와야 층이 겹쳐 보인다.
      for (let t = tiers - 1; t >= 0; t--) {
        const by = groundY - t * 10;                 // 이 층의 바닥
        const bw = 17 - t * 2, rw = bw + 6;
        const hw = Math.round(bw / 2), rh = Math.round(rw / 2);
        g.r(x - hw, by - 10, bw, 10, t % 2 ? S.wall[1] : S.wall[0]);
        g.v(x - hw, by - 10, by - 1, S.wallD);
        g.v(x + hw, by - 10, by - 1, S.wallD);
        g.r(x - 1, by - 7, 3, 5, '#3a2f24');         // 창
        g.h(by - 10, x - rh, x + rh, S.roof[1]);     // 처마
        g.h(by - 11, x - rh + 1, x + rh - 1, S.roof[0]);
        g.h(by - 12, x - rh + 3, x + rh - 3, S.roof[2]);
        for (const s of [-1, 1]) {                   // 치솟은 처마 끝
          g.px(x + s * (rh + 1), by - 11, S.roof[0]);
          g.px(x + s * (rh + 1), by - 12, S.roof[2]);
        }
      }
      const ty = groundY - tiers * 10 - 12;          // 상륜
      g.v(x, ty - 6, ty, P.goldM);
      g.h(ty - 4, x - 1, x + 1, P.goldD);
      g.px(x, ty - 7, P.goldL);
      break;
    }
    case 'gopuram': {                                // 탑문 — 위로 갈수록 좁아지는 조각탑
      const h = 50, base = 26, top = groundY - h;
      for (let k = 0; k < h; k++) {
        const half = Math.round((base / 2) * (1 - (k / h) * 0.45));
        const band = k % 7 === 6;                    // 층 띠
        g.h(groundY - k, x - half, x + half, band ? S.wallD : S.wall[0]);
        g.px(x - half, groundY - k, S.wallD);
        g.px(x + half, groundY - k, S.wallD);
        if (band) g.h(groundY - k - 1, x - half + 1, x + half - 1, S.wall[2]);
      }
      for (let k = 4; k < h - 8; k += 7) {           // 층마다 늘어선 감실
        const half = Math.round((base / 2) * (1 - (k / h) * 0.45));
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
  // 계선주 + 늘어진 밧줄 — 부두 상판 위에 세운다
  const pz = qy + 9;                                 // 프롭이 놓이는 바닥선
  for (let i = 0; i < 5; i++) {
    const x = 26 + i * 88;
    g.r(x, pz - 7, 5, 8, '#4a4038');
    g.h(pz - 7, x, x + 4, '#6b5d4f');
    g.r(x - 1, pz - 8, 7, 2, '#5a4d42');
    g.px(x, pz, '#2f2a24');
    if (i < 4) {
      for (let k = 0; k <= 88; k++) {
        const t = k / 88;
        const yy = pz - 8 - Math.round(Math.sin(Math.PI * t) * 4) + 4;
        g.px(x + 2 + k, yy, '#6d5b3f');
      }
    }
  }
  // 화물 — 통과 나무상자
  const props = [[52, 'crate'], [70, 'barrel'], [80, 'barrel'], [300, 'crate'],
                 [318, 'crate'], [330, 'barrel'], [212, 'barrel']];
  for (const [x, kind] of props) {
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

export function portSprite(styleKey, seed) {
  const key = `scene:port:${styleKey}:${seed}`;
  return bake(key, VW, VH, (g, ctx) => {
    const S = STYLES[styleKey];
    const r = rng(seed);
    skyGradient(ctx, S);

    // 구름
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(r() * VW), cy = 12 + Math.floor(r() * 46);
      const w = 14 + Math.floor(r() * 26);
      g.ellipse(cx, cy, w, 3 + Math.floor(r() * 3), '#ffffff22');
      g.ellipse(cx - w / 3, cy - 2, w / 2, 3, '#f4ead6aa');
      g.ellipse(cx + w / 4, cy - 1, w / 3, 2, '#f4ead6cc');
    }
    // 갈매기
    for (let i = 0; i < 5; i++) {
      const x = 40 + Math.floor(r() * 320), y = 20 + Math.floor(r() * 40);
      g.px(x, y, '#2c2a30'); g.px(x + 1, y - 1, '#2c2a30'); g.px(x + 2, y, '#2c2a30');
      g.px(x + 3, y - 1, '#2c2a30'); g.px(x + 4, y, '#2c2a30');
    }

    drawHills(g, S, r);

    // 시가지 — 뒤쪽(작고 어두움) → 앞쪽(크고 밝음) 3열
    for (let row = 0; row < 3; row++) {
      const groundY = 112 + row * 10;
      const hMin = 14 + row * 7, hMax = 32 + row * 13;
      let x = -4 + Math.floor(r() * 6);
      while (x < VW + 4) {
        const w = 8 + Math.floor(r() * 16);
        building(g, S, r, x, w, groundY, hMin, hMax);
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

    landmark(g, S, r, 300, 134);
    landmark(g, S, r, 54, 130);

    // 해안 성벽 — 밑동이 물에 잠기도록 수면선에 걸친다
    const [RM, RL, RD] = rampartOf(S);
    g.r(0, 134, VW, 18, RM);
    g.h(134, 0, VW - 1, RL);
    g.h(135, 0, VW - 1, RL);
    g.h(151, 0, VW - 1, RD);
    for (let x = 0; x < VW; x += 10) {               // 총안
      g.r(x, 130, 6, 5, RM);
      g.h(130, x, x + 5, RL);
    }
    for (let x = 4; x < VW; x += 16) g.r(x, 139, 2, 5, '#3c3833');
    for (let x = 0; x < VW; x += 7) g.px(x, 148, RD);   // 이끼 낀 하부
    // 수문 — 아치가 수면에 닿는다
    g.r(186, 132, 28, 20, RD);
    g.h(132, 186, 213, RL);
    g.ellipse(200, 146, 10, 11, '#241f1c');
    g.r(190, 146, 20, 6, '#241f1c');
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
    // 부두로 이어지는 방파제 기둥
    for (const bx of [96, 288]) {
      g.r(bx, 138, 8, 14, RM);
      g.h(138, bx, bx + 7, RL);
      g.r(bx - 1, 135, 10, 3, RL);
    }

    drawSeaFront(g, ctx, S, r);
    drawQuay(g, S, r);
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
export const TAVERN_SEATS = [
  { x: 34,  y: 209, flip: false },
  { x: 72,  y: 209, flip: true  },
  { x: 132, y: 209, flip: false },
  { x: 168, y: 209, flip: true  },
  { x: 104, y: 184, flip: true  },   // 뒷줄 — 서서 기다리는 무리
];

/* 테이블 — [x, 폭]. 상판 y는 아래 TAV_TABLE_Y 하나로 맞춘다.
   앞줄 좌석 넷이 이 둘에 나뉘어 앉는다. */
const TAV_TABLES = [[8, 92], [112, 84]];
const TAV_TABLE_Y = 198;    // 좌석 발끝(209)보다 11px 위 — 그만큼 다리가 가려진다
const TAV_FLOOR = 166;      // 바닥이 시작되는 y

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

export function tavernSprite(styleKey = 'latin', seed = 1) {
  const key = `scene:tavern:${styleKey}:${seed}`;
  return bake(key, VW, VH, (g, ctx) => {
    const S = STYLES[styleKey];
    const r = rng(seed);

    // ── 벽 ───────────────────────────────────────────────
    // 도시 벽색을 어둡게 깔아 실내 그늘을 만든다. 밝은 회벽 그대로면 담벼락처럼 보인다.
    g.r(0, 0, VW, TAV_FLOOR, S.wallD);
    g.r(0, 0, VW, TAV_FLOOR, '#00000040');
    for (let y = 0; y < TAV_FLOOR; y += 3) g.h(y, 0, VW - 1, '#00000012');

    // ── 천장 들보 ────────────────────────────────────────
    g.r(0, 0, VW, 12, P.woodD);
    g.h(12, 0, VW - 1, P.out2);
    g.h(11, 0, VW - 1, P.woodM);
    for (let x = 10; x < 200; x += 44) {
      g.r(x, 0, 9, 12, P.woodM);
      g.v(x, 0, 11, P.woodL);
      g.v(x + 8, 0, 11, P.woodD);
    }

    // ── 창 (하나만, 왼쪽) ─────────────────────────────────
    // 실내가 어두우므로 창이 화면에서 가장 밝은 면이 된다 — 시선의 닻이다.
    const wx = 20;
    g.r(wx - 3, 28, 52, 52, P.woodD);
    g.r(wx, 31, 46, 46, S.sky[2]);
    g.r(wx, 31, 46, 22, S.sky[1]);
    g.r(wx, 31, 46, 10, S.sky[0]);
    g.r(wx, 62, 46, 15, P.seaD);
    g.h(66, wx, wx + 45, P.seaM);
    g.h(70, wx + 5, wx + 26, P.seaL);
    g.r(wx + 10, 55, 18, 7, P.blackM);            // 정박한 배 실루엣
    g.v(wx + 17, 42, 55, P.blackM);
    g.poly([[wx + 18, 43], [wx + 28, 54], [wx + 18, 54]], '#2a2230');
    g.v(wx + 22, 31, 76, P.woodM);                // 창살
    g.h(53, wx, wx + 45, P.woodM);
    g.box(wx - 3, 28, 52, 52, P.out2);

    // ── 벽에 걸린 노 ─────────────────────────────────────
    // 여기 오는 사람들이 뭘 하는 사람인지 한 줄로 말한다.
    // 자루를 가늘게 뽑고 날을 작게 두면 빗자루로 보인다 — 날은 넓고 길어야 노다.
    g.r(83, 30, 4, 44, P.woodM);
    g.v(83, 30, 73, P.woodL);
    g.v(86, 30, 73, P.woodD);
    g.r(82, 30, 6, 3, P.woodH);                    // 손잡이 마구리
    g.poly([[79, 72], [91, 72], [92, 92], [85, 100], [78, 92]], P.woodL);   // 날
    g.poly([[81, 74], [89, 74], [89, 90], [85, 96], [81, 90]], P.woodH);
    g.v(85, 74, 95, P.woodM);                      // 날 가운데 능선
    g.line(79, 72, 78, 92, P.woodD);
    g.line(91, 72, 92, 92, P.woodD);

    // ── 술통 선반 ────────────────────────────────────────
    g.r(100, 88, 88, 3, P.woodM);
    g.h(88, 100, 187, P.woodL);
    barrel(g, 104, 72, 15, 16);
    barrel(g, 124, 74, 13, 14);
    barrel(g, 144, 72, 15, 16);
    barrel(g, 166, 75, 12, 13);
    // 선반 아래 매달린 컵들
    for (const cx of [108, 120, 152, 174]) {
      g.r(cx, 92, 3, 4, P.clothD);
      g.h(96, cx, cx + 2, P.clothM);
    }

    // ── 허리 높이 목재 징두리 ─────────────────────────────
    g.r(0, 116, VW, TAV_FLOOR - 116, P.woodD);
    g.h(116, 0, VW - 1, P.woodM);
    g.h(117, 0, VW - 1, P.woodL);
    for (let x = 0; x < 200; x += 13) g.v(x, 118, TAV_FLOOR - 1, '#00000038');

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
    // 앞으로 갈수록 어둡게 — 바닥이 눕는 느낌
    for (let y = VH - 22; y < VH; y++) g.h(y, 0, VW - 1, '#0000000a');

    // ── 등불과 빛 ───────────────────────────────────────
    lampGlow(g, 52, 44, 84);
    lampGlow(g, 148, 40, 76);
    tavernLamp(g, 52, 44);
    tavernLamp(g, 148, 40);

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
