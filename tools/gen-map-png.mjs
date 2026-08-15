// gen-map-png.mjs — 지금 게임이 그리는 권역 지도를 PNG로 뽑는다 (발주 기준판)
//
// ★ 이 파일이 있는 이유.
//   **좌표가 데이터인 것처럼, 그 좌표로 그린 지도도 파일이어야 한다.**
//   항구 좌표는 `js/regions/<권역>/geo.js`에 x,y로 박혀 있고 바뀌지 않는다. 그런데 지도는
//   부팅할 때마다 그 고정된 좌표를 읽어 매번 다시 그리고 있었다 — 결과가 늘 같은 그림을.
//   그래서 한 번 뽑아 `assets/map/*.png`로 굳히고 `assets/manifest.json`으로 갈아 끼운다.
//
//   이렇게 하면 셋이 한꺼번에 해결된다:
//     ① 권역을 옮길 때마다 하던 렌더가 없어진다(아홉 권역 × 매 부팅)
//     ② 사람이 그린 지도가 오면 **같은 파일 이름으로 덮기만** 하면 된다 — 코드는 그대로
//     ③ 화가에게 줄 기준판이 곧 게임이 쓰는 그림이라, 둘이 갈라질 수가 없다
//
//   ★ 좌표를 옮겼으면 이것을 다시 돌린다. 안 돌리면 항구 점이 뭍에 앉는다 —
//     `tools/check-map.py --all`이 그것을 잡는다(그래서 좌표를 옮기고 잊어도 검증에서 걸린다).
//
//   node tools/gen-map-png.mjs            # 서버가 8155에 떠 있어야 한다
//   node tools/gen-map-png.mjs --port 9000 --only indian

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './playtest.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'map');

const argOf = (k, d) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : d;
};
const port = Number(argOf('--port', 8155));
const only = argOf('--only', null);

mkdirSync(OUT, { recursive: true });

const g = await open({ port });
try {
  /* 브라우저 안에서 게임 모듈을 그대로 불러 굽는다 — **다시 구현하지 않는다.**
     여기서 지도를 따로 그리면 그 순간 화면과 갈라진다. */
  const shots = await g.page.evaluate(async ({ onlyOne, bust }) => {
    /* ★ 캐시버스터가 필요하다. 페이지가 이미 `scene.js`를 불러 둔 상태라 같은 URL로 import하면
       **브라우저가 그때 것을 그대로 돌려준다** — 그리기 코드를 고치고 다시 뽑았는데
       그림이 그대로여서 30분을 헤맸다(`bake` 캐시로 오진하기 딱 좋은 자리다). */
    const scene = await import(`./js/sprites/scene.js?v=${bust}`);
    const data = await import(`./js/data.js?v=${bust}`);
    const geo = await import(`./js/map/geo.js?v=${bust}`);

    /* ★ 에셋 팩을 **꺼야 한다.** 안 그러면 이 도구가 자기가 지난번에 뽑아 둔 PNG를
       그대로 읽어 다시 저장한다 — 그리기 코드를 고쳐도 파일이 한 바이트도 안 변한다
       (바이트 수가 46766으로 똑같길래 캐시버스터가 안 먹는 줄 알았다. 순환이었다).
       여기서만 끄는 것이라 게임 쪽에는 영향이 없다.
       ★ 여기만 버스터를 **안 붙인다.** `scene.js?v=…`가 안에서 부르는 것은 버스터 없는
       원본 `pixel.js`·`assets.js`이므로, 버스터를 붙이면 애먼 사본을 비우게 된다. */
    const assets = await import('./js/assets.js');
    const pixel = await import('./js/pixel.js');
    assets.clearOverrides();
    pixel.clearCache();
    const out = {};
    for (const rg of geo.REGIONS) {
      if (onlyOne && rg.id !== onlyOne) continue;
      const cities = data.CITIES.filter((c) => c.region === rg.id);
      if (!cities.length) continue;
      const routes = data.ROUTES.filter(([a, b]) =>
        geo.REGION_OF_CITY[a] === rg.id && geo.REGION_OF_CITY[b] === rg.id && !geo.isOceanLane(a, b));
      const img = scene.mapSprite(rg.id, cities, routes);
      const cv = document.createElement('canvas');
      cv.width = scene.VW; cv.height = scene.VH;
      cv.getContext('2d').drawImage(img, 0, 0);
      out[rg.id] = cv.toDataURL('image/png');
    }
    return out;
  }, { onlyOne: only, bust: Date.now() });

  let n = 0;
  for (const [rid, url] of Object.entries(shots)) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    writeFileSync(join(OUT, `${rid}.png`), buf);
    console.log(`  ${rid.padEnd(16)} ${String(buf.length).padStart(7)} bytes → assets/map/${rid}.png`);
    n++;
  }
  console.log(`\n지도 ${n}장을 다시 뽑았다. 검수: python tools/check-map.py --all`);
  console.log('이 그림이 게임이 쓰는 지도다(assets/manifest.json). 코드 생성은 폴백으로 남는다.');
} finally {
  await g.close();
}
