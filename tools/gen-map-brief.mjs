// gen-map-brief.mjs — 권역마다 지도 발주 의뢰서를 뽑는다
//
// ★ 왜 손으로 안 쓰고 생성하는가.
//   지도 외주를 두 번 반려한 원인이 **의뢰서와 게임 데이터가 어긋난 것**이었다.
//   1차는 좌표표를 사람이 옮겨 적다 틀렸고, 2차는 그 사이에 도시가 늘었는데 의뢰서가 낡았다.
//   좌표는 `js/regions/<권역>/geo.js`가 정본이므로 **거기서 직접 뽑아 쓰면 어긋날 수가 없다.**
//   도시를 하나 옮기면 이 명령을 다시 돌려 의뢰서를 새로 낸다.
//
//   node tools/gen-map-brief.mjs          → assets/map-briefs/<권역>.md 아홉 장
//   node tools/gen-map-brief.mjs indian   → 한 권역만

import { writeFileSync, mkdirSync } from 'node:fs';
import { CITIES, CITY_BY_ID, GOOD_BY_ID } from '../js/data.js';
import { REGIONS, REGION_OF_CITY, ROUTE_RISK, riskKey, isOceanLane, OCEAN_LANES } from '../js/map/geo.js';
import { MAPS } from '../js/sprites/maps/index.js';

const OUT = new URL('../assets/map-briefs/', import.meta.url);
try { mkdirSync(OUT, { recursive: true }); } catch { /* 이미 있다 */ }

const only = process.argv[2];
const pad = (s, n) => String(s).padEnd(n);

/* 공통 절 — 아홉 장이 똑같이 이고 갈 규칙. 여기가 이 의뢰서의 심장이다.
   1·2차 반려 사유가 전부 이 절을 안 지켜서 생겼다. */
const COMMON = `
## 0. ★ 가장 중요한 전제 — 이 지도는 실제 지리의 투영이 아닙니다

**이 프로젝트는 지도를 두 번 발주해 두 번 다 반려했습니다.** 두 번의 사유가 정확히 반대였고,
그 둘을 다 피하는 것이 이 문서의 목적입니다.

- **1차** — 실제 바다를 정확하게, 픽셀아트로서도 훌륭하게 그렸습니다. 그런데 게임에 얹으니
  **항구가 최대 55px 어긋나** 사막 한복판에 앉았습니다. 이 게임의 지도는 위경도를 옮긴 것이
  아니라 **플레이하기 좋게 늘리고 줄인 도식**이기 때문입니다.
- **2차** — 좌표에는 맞췄으나 **도시와 항로의 볼록껍질을 그냥 바다로 칠했습니다.**
  반도도 섬도 없어 지도로 읽히지 않았습니다. 검수 항목만 역설계한 그림이었습니다.

> ### 작업 순서를 뒤집어 주세요
>
> ❌ 실제 지리를 그린다 → 도시를 얹는다
> ✅ **아래 표의 점을 먼저 놓는다 → 그 점들이 물가에 오도록 지형을 그린다**
>
> 지형은 "그 바다처럼 보이면" 됩니다. 실제 지리와 몇 도 어긋나는 것은 **문제가 아닙니다.**
> **항구가 물가에 있고 항로가 바다를 지나는 것이 훨씬 중요합니다.**

### 기준판을 함께 드립니다

**\`assets/map/<권역>.png\`** — 이것이 지금 게임이 실제로 쓰고 있는 지도입니다(400×225).
좌표·항로가 이미 다 맞아 있으므로, **그 위에 레이어를 얹어 작업**하시면 어긋날 수가 없습니다.
납품하실 때도 **같은 이름으로 덮어주시면** 그대로 게임에 들어갑니다 — 코드는 손대지 않습니다.

점·선·이름표가 어디 찍히는지 보시려면:

\`\`\`
python serve.py 8155          # 프로젝트 루트에서
http://localhost:8155/mapcheck.html
\`\`\`

- **[지형만 (발주용)]** 단추를 누르면 점·선·이름표가 빠진 순수 지형이 나옵니다.
- 배율 1×가 실제 크기(400×225)입니다. 2×·3×는 판독용입니다.
- 페이지 아래에 **검수 판정이 실시간으로** 뜹니다 — 납품본을 같은 자리에 넣으면 같은 판정을 받습니다.

---

## 1. 규격

| 항목 | 값 |
|---|---|
| 크기 | **400 × 225 픽셀** (정확히) |
| 형식 | PNG (무손실). WebP로 낼 경우 **반드시 무손실**로 — 2차 납품이 손실 WebP라 48색이 10,862색으로 번졌습니다 |
| 색 수 | **64색 이하**를 권합니다. 픽셀아트이므로 그라데이션·안티에일리어싱을 쓰지 마세요 |
| 확대 | 게임에서 **정수배로만** 확대됩니다. 1px이 그대로 1px입니다 |

## 2. 톤 (프로젝트 공통 · 항구 배경 의뢰서와 같습니다)

- **2D 픽셀아트.** 고급스러울 필요는 없지만 **싸구려로 보이면 안 됩니다.**
- 위에서 내려다본 항해도입니다. 원근·그림자 없이 평면으로.
- 바다는 **어두운 쪽**, 육지는 **밝은 쪽**입니다. 그 위에 1px짜리 배 점과 항구 표식이 얹히므로
  **바다에 밝은 얼룩이 크게 들어가면 그 점들이 묻힙니다**(2차 납품에서 바다의 24%가 그랬습니다).
- 해안선은 백사장 → 얕은 물 → 깊은 물로 **서너 겹** 번지게. 지금 임시 지도가 그 방식입니다.
`;

const CHECK = `
## 6. 검수 (납품 전에 직접 확인해 주세요)

\`mapcheck.html\`에 납품본을 얹으면 아래 넷을 자동으로 잽니다. **전부 통과해야 합니다.**

| 항목 | 기준 | 왜 |
|---|---|---|
| 항구가 물가인가 | 각 점 반경 6px 안에 **바다와 뭍이 둘 다** 있을 것 | 뭍에 앉으면 배가 못 들어가고, 물에 둘러싸이면 항구가 아니라 섬입니다 |
| 항로가 바다를 지나는가 | 각 선분의 육지 비율 **34% 미만** | 배가 산을 넘습니다 |
| 육지/바다 비율 | 바다가 **20~80%** | 한쪽이 8할을 넘으면 지도로 안 읽힙니다 |
| 이름표 자리 | 이름표 상자가 남의 항구 표식을 덮지 않을 것 | 이름표는 항구 **위쪽**에 배경 박스째 그려집니다(한글 글자당 약 6px) |

섬 항구는 물에 둘러싸이는 것이 정상이며 실패로 세지 않습니다.

## 7. 납품

- 파일 하나: \`400×225\` PNG
- 게임에 얹는 것은 저희가 합니다(\`assets/manifest.json\`에 키를 적으면 그 그림이 코드 생성 지도를 대체합니다)
- 수정이 필요하면 **좌표는 그대로 두고 지형만** 고칩니다. 좌표를 옮기면 게임 로직이 따라 움직여야 합니다
`;

function briefFor(rg) {
  const cities = CITIES.filter((c) => c.region === rg.id).slice()
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (!cities.length) return null;

  const inRoutes = [];
  const seen = new Set();
  for (const c of cities) {
    for (const [a, b] of []) void [a, b];
  }
  // 권역 안 항로를 모은다 (원양은 따로)
  for (const key of Object.keys(ROUTE_RISK)) {
    const [a, b] = key.split('|');
    if (REGION_OF_CITY[a] !== rg.id || REGION_OF_CITY[b] !== rg.id) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    inRoutes.push([a, b, ROUTE_RISK[key]]);
  }
  const lanes = OCEAN_LANES.filter((l) =>
    REGION_OF_CITY[l.a] === rg.id || REGION_OF_CITY[l.b] === rg.id);

  const def = MAPS[rg.id] ?? {};
  const climate = def.climate ?? 'inland';
  const CLIMATE_NOTE = {
    inland: '관목과 사막이 위아래로 갈립니다. 위쪽은 초록, 아래쪽은 모래.',
    cold: '침엽수림과 히스. 바다가 차고 탁합니다. 북쪽 끝은 툰드라.',
    warm: '사바나에서 사막으로. 적도 쪽에 짙은 밀림.',
    arid: '거의 전부 사막이고 물가에만 초록이 있습니다.',
    monsoon: '계절풍이 적시는 초록. 안쪽 고원은 건조합니다.',
    tropic: '진한 열대림과 산호초. 밝은 옥빛 얕은 물.',
    antilles: '산호초와 밝은 옥빛 바다. 섬마다 짙은 열대림.',
    newworld: '밀림과 안데스. 남쪽으로 갈수록 마른 팜파스.',
    temperate: '온대림. 북쪽으로 갈수록 마릅니다.',
  }[climate] ?? '';

  const rows = cities.map((c) => `| \`${pad(c.id, 14)}\` | ${pad(c.name, 9)} | ${String(c.x).padStart(3)} | `
    + `${String(c.y).padStart(3)} | ${'★'.repeat(c.size)} | ${c.area} |`).join('\n');

  const routeRows = inRoutes.map(([a, b, r]) =>
    `| ${pad(CITY_BY_ID[a].name, 9)} ~ ${pad(CITY_BY_ID[b].name, 9)} | `
    + `(${String(CITY_BY_ID[a].x).padStart(3)},${String(CITY_BY_ID[a].y).padStart(3)}) ~ `
    + `(${String(CITY_BY_ID[b].x).padStart(3)},${String(CITY_BY_ID[b].y).padStart(3)}) |`).join('\n');

  const laneRows = lanes.map((l) => {
    const here = REGION_OF_CITY[l.a] === rg.id ? l.a : l.b;
    const there = REGION_OF_CITY[l.a] === rg.id ? l.b : l.a;
    return `- **${CITY_BY_ID[here]?.name ?? here}** → ${CITY_BY_ID[there]?.name ?? there}`
      + ` (${(REGIONS.find((r) => r.id === REGION_OF_CITY[there]) ?? {}).name ?? '?'}) · ${l.days}일`;
  }).join('\n');

  return `# ${rg.name} 지도 제작 의뢰서

**tradeship — 대항해시대 교역 게임** / 2D 픽셀아트 항해 지도 1장 / 400×225 PNG

이 문서 하나만 읽고 작업할 수 있게 썼습니다. 게임 코드를 볼 필요는 없습니다.
이 게임의 바다는 아홉 권역으로 나뉘고, 이 문서는 그중 **${rg.name}** 한 장을 다룹니다.

> ${rg.blurb}

**항구 ${cities.length}곳 · 항로 ${inRoutes.length}개 · 다른 바다로 나가는 길 ${lanes.length}개**

---
${COMMON}
### 이 바다의 기후

${CLIMATE_NOTE}

---

## 3. 항구 좌표 — **이 표가 이 문서의 전부입니다**

좌표계는 좌상단이 (0,0), 우하단이 (399,224)입니다. 아래 점들이 **물가에 와야** 합니다.

| id | 이름 | x | y | 규모 | 소지역 |
|---|---|---:|---:|:---:|---|
${rows}

규모(★)는 항구의 크기입니다. 큰 항구일수록 표식이 크게 그려지므로 **앞바다도 넓은 편이 자연스럽습니다.**

## 4. 항로 — **이 선들이 바다를 지나야 합니다**

| 구간 | 좌표 |
|---|---|
${routeRows}

${lanes.length ? `## 5. 다른 바다로 나가는 길

아래 항구에서는 이 지도 **밖으로** 나가는 항로가 있습니다. 지도에 그리지는 않지만,
그 항구를 **지도 가장자리 쪽에 열린 느낌으로** 두면 좋습니다(막다른 만 안쪽에 두지 마세요).

${laneRows}
` : ''}
${CHECK}

---

*이 문서는 \`node tools/gen-map-brief.mjs\`로 게임 데이터에서 생성됐습니다.
좌표가 바뀌면 다시 생성하세요 — 손으로 고치면 게임과 어긋납니다.*
`;
}

let n = 0;
for (const rg of [...REGIONS].sort((a, b) => a.order - b.order)) {
  if (only && rg.id !== only) continue;
  const md = briefFor(rg);
  if (!md) { console.log(`  ${pad(rg.name, 18)} 건너뜀 (항구 없음)`); continue; }
  writeFileSync(new URL(`${rg.id}.md`, OUT), md, 'utf8');
  const cities = CITIES.filter((c) => c.region === rg.id).length;
  console.log(`  ${pad(rg.name, 18)} ${String(cities).padStart(3)}곳 → assets/map-briefs/${rg.id}.md`);
  n++;
}
console.log(`\n의뢰서 ${n}장을 냈다. 기준판은 mapcheck.html의 [지형만] 화면이다.\n`);
