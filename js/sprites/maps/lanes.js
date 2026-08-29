// sprites/maps/lanes.js — **꺾인 뱃길**. 회차 25의 핵심 설계 판단이 이 파일이다.
//
// ★ 왜 필요한가.
//   `wiki/map-terrain.md`가 *"이 축척에서 사실적 해안선과 직선 항로는 양립하지 않는다"*로
//   못박아 둔 자리다. 1px ≈ 10~15km라 연안 항로가 1~2px로 뭉개지고, 그래서 실제 해안선을
//   넣으면 두 항구를 잇는 **직선**이 반도를 관통한다. 지금까지의 해법은 **관통하는 자리를
//   바다로 파는 것**이었고(`auto.js`의 회랑), 그 대가가 사용자가 지적한 그것이다 —
//   이탈리아 장화가 삼각 파편 셋이 되고 일본 열도가 흩어진 조각이 됐다.
//
// ★ 그래서 뒤집는다 — **지형을 항로에 맞추는 대신, 항로를 지형에 맞춰 꺾는다.**
//   베네치아~제노바는 실제로도 아드리아해를 내려가 시칠리아를 돌아 티레니아해로 올라간다.
//   직선으로 이탈리아를 관통하는 쪽이 오히려 거짓이었다.
//
// ★ 게임 규칙은 한 줄도 안 바뀐다 — **항해일은 여전히 두 항구의 직선거리**로 잰다
//   (`state.js: distanceBetween`). 꺾인 길은 **그림과 지형 파기**에만 쓴다. 그래서
//   밸런스·계약기한·요율에 닿지 않는다. (닿게 만들면 아홉 바다의 수치를 다시 잡아야 한다.)
//
// 정본은 `assets/map-shape/<권역>.json`의 `routeVia`이고, `tools/gen-map-spans.mjs`가
// 그것을 `js/sprites/maps/<권역>.js`의 `export const LANES`로 굽는다. 여기는 **등록소**다.

/** region → { 'aId|bId': [[x,y], …] } — 두 항구 사이에 **끼워 넣을** 중간점들 */
const VIA = Object.create(null);

export function setLanes(region, table) {
  VIA[region] = table && Object.keys(table).length ? table : null;
}

/** 그 항로의 중간점 — 없으면 null. 방향이 반대로 적혀 있으면 뒤집어 돌려준다 */
export function laneVia(region, a, b) {
  const t = VIA[region];
  if (!t) return null;
  if (t[`${a}|${b}`]) return t[`${a}|${b}`];
  if (t[`${b}|${a}`]) return [...t[`${b}|${a}`]].reverse();
  return null;
}

/** 두 도시를 잇는 **폴리라인**. 중간점이 없으면 직선 두 점이다. */
export function lanePath(region, ca, cb) {
  const via = laneVia(region, ca.id, cb.id);
  return via ? [[ca.x, ca.y], ...via, [cb.x, cb.y]] : [[ca.x, ca.y], [cb.x, cb.y]];
}

/** 폴리라인을 선분 목록으로 — 지형 파기(`auto.js: topology`)가 쓴다 */
export function laneSegs(region, ca, cb) {
  const p = lanePath(region, ca, cb);
  const out = [];
  for (let i = 0; i < p.length - 1; i++) out.push([p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]]);
  return out;
}

/** 폴리라인 위의 u(0~1) 지점 — 항해 연출이 쓴다. 구간 길이에 비례해 나눈다 */
export function laneAt(region, ca, cb, u) {
  const p = lanePath(region, ca, cb);
  if (p.length === 2) {
    return [p[0][0] + (p[1][0] - p[0][0]) * u, p[0][1] + (p[1][1] - p[0][1]) * u];
  }
  const len = [];
  let total = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const d = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
    len.push(d); total += d;
  }
  let want = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < len.length; i++) {
    if (want <= len[i] || i === len.length - 1) {
      const t = len[i] ? want / len[i] : 0;
      return [p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t];
    }
    want -= len[i];
  }
  return [p[p.length - 1][0], p[p.length - 1][1]];
}
