// assets.js — 그림을 바깥 이미지로 갈아 끼우는 자리 (아트 담당 영역)
//
// 이 게임의 스프라이트는 전부 코드로 그린다(`js/sprites/*.js`). 그림을 직접 그리는
// 사람에게는 그게 벽이다. 그래서 **모든 스프라이트가 지나가는 한 곳**(`pixel.js: bake`)에
// 갈고리를 걸어 두었다 — `assets/manifest.json`에 키와 파일을 적어 두면 그 스프라이트만
// PNG로 바뀐다. 코드는 한 줄도 고치지 않는다.
//
//   assets/manifest.json
//   {
//     "name": "손그림 팩",
//     "sprites": {
//       "icon:spice": "icons/spice.png",
//       "scene:map":  "map/mediterranean.png"
//     }
//   }
//
// 키 목록은 미리보기에서 확인한다 — http://localhost:8891/preview.html (각 그림 밑에 적힌다).
// 파일이 없거나 manifest가 없으면 조용히 코드 생성으로 돌아간다 — 팩이 없는 것이 기본 상태다.

const overrides = new Map();   // bake key -> HTMLCanvasElement
let packName = null;

/** bake()가 그리기 직전에 물어본다. 없으면 null. */
export function overrideFor(key) {
  return overrides.get(key) || null;
}

export function hasOverrides() { return overrides.size > 0; }
export function overrideKeys() { return [...overrides.keys()]; }
export function activePack() { return packName; }

/** 이미지 하나를 캔버스로 굽는다 — 확대 시 뭉개지지 않게 원본 픽셀 그대로 담는다. */
function toCanvas(img) {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return cv;
}

const loadImage = (url) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => rej(new Error(url));
  img.src = url;
});

/** 직접 등록 — 파일 없이 캔버스를 꽂고 싶을 때(테스트·에디터) */
export function registerOverride(key, canvas) {
  overrides.set(key, canvas);
}

export function clearOverrides() {
  overrides.clear();
  packName = null;
}

/** 에셋 팩을 읽어 들인다. 실패는 전부 삼킨다 — 팩이 없다고 게임이 멈추면 안 된다.
    `base`는 manifest가 있는 폴더. 그 안의 상대경로로 이미지를 찾는다. */
export async function loadAssetPack(base = 'assets') {
  try {
    const res = await fetch(`${base}/manifest.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const man = await res.json();
    const entries = Object.entries(man.sprites || {});
    /* ★ 그림에도 판 번호를 붙인다. manifest는 `no-store`로 읽지만 **이미지는 캐시가 걸린다** —
       `serve.py`는 no-store를 보내니 괜찮지만, `python -m http.server`나 다른 서버로 띄우면
       PNG를 다시 뽑아도 브라우저가 옛 그림을 쓴다. 지도를 고쳤는데 새로고침해도 그대로면
       그리기 코드를 의심하게 되므로(오늘 실제로 그 함정에 빠졌다) 여기서 막는다.
       `tools/gen-map-png.mjs`가 그림을 다시 뽑을 때마다 이 값을 갱신한다. */
    const ver = man.version ? `?v=${encodeURIComponent(man.version)}` : '';
    let ok = 0;
    for (const [key, file] of entries) {
      try {
        overrides.set(key, toCanvas(await loadImage(`${base}/${file}${ver}`)));
        ok++;
      } catch {
        console.warn(`[assets] '${key}' → ${file} 을 못 읽었다. 이 스프라이트는 코드 생성으로 남는다.`);
      }
    }
    packName = man.name || base;
    if (ok) console.info(`[assets] '${packName}' — 스프라이트 ${ok}/${entries.length}개를 갈아 끼웠다.`);
    return { name: packName, loaded: ok, total: entries.length };
  } catch {
    return null;   // manifest가 없는 것이 기본 상태다
  }
}
