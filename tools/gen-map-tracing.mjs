// gen-map-tracing.mjs — 그림쟁이가 **덧그릴** 기준판을 뽑는다 (4배 확대 + 해안선 강조).
//
//     node tools/gen-map-tracing.mjs            # 아홉 장
//     node tools/gen-map-tracing.mjs mediterranean
//
// ★ 왜 이것이 필요한가. 지도 외주가 세 번 반려됐고 원인은 매번 같았다 —
//   **이 게임의 지도는 실제 지리의 투영이 아니라 도식**이라(도시 좌표가 실제 위경도와 최대 55px 차이),
//   진짜 지중해를 그리면 그릴수록 게임에서는 더 틀린다. 3차(AI 생성)는 그림이 훌륭했지만
//   게임 좌표를 얹으니 도시가 바다 한가운데 떠 있었고, 크롭·압축·좌표 재배치·육지 침식을
//   전부 시험해도 400×225 축척에서는 **사실적 해안선과 직선 항로가 양립하지 않았다**
//   (연안 항로가 1~2px라 뭉개져 52개 중 18개가 육지를 관통했다).
//
//   ⇒ 유일하게 성립하는 의뢰는 **"이 실루엣을 그대로 두고 질감·명암만 얹어라"**다.
//     그러려면 덧그릴 수 있게 **크고 선명한 기준판**을 줘야 한다 — 이 도구가 그것을 만든다.
//
// 나오는 것(`assets/map-briefs/`):
//   <권역>-x4.png      게임 지도를 최근접 4배(1600×900)로. 이 위에 덧그린 뒤 4배로 줄이면 규격이 맞는다
//   <권역>-coast.png   해안선만 1px로 남긴 흑백 판. 실루엣이 어디까지인지 헷갈릴 여지를 없앤다
//
// 규격이 곧 계약이다 — 납품은 400×225(또는 800×450·1600×900). 자세한 것은 assets/BRIEF-MAP.md §4-A·§4-B.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGIONS = ['mediterranean', 'atlantic', 'africa', 'mideast', 'indian',
                 'seasia', 'eastasia', 'caribbean', 'southamerica'];
const SCALE = 4;

/* PNG를 직접 읽고 쓴다 — 이 저장소는 의존성이 없다(순수 ES 모듈).
   zlib은 node 표준이라 쓸 수 있다. */
const { inflateSync, deflateSync } = await import('node:zlib');

function readPNG(path) {
  const buf = readFileSync(path);
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`${path}: 8bit RGB(A)만 읽는다 (depth=${bitDepth} type=${colorType})`);
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h * ch);
  const stride = w * ch;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.from(line);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      if (ft === 1) cur[i] = (cur[i] + a) & 255;
      else if (ft === 2) cur[i] = (cur[i] + b) & 255;
      else if (ft === 3) cur[i] = (cur[i] + ((a + b) >> 1)) & 255;
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        cur[i] = (cur[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    cur.copy(px, y * stride);
    prev = cur;
  }
  return { w, h, ch, px };
}

function writePNG(path, w, h, rgb) {
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc = (b) => {
    let c = 0xFFFFFFFF;
    for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]));
}

const want = process.argv[2] ? [process.argv[2]] : REGIONS;
let done = 0;
for (const r of want) {
  const srcPath = join(ROOT, 'assets', 'map', `${r}.png`);
  if (!existsSync(srcPath)) { console.log(`  ${r}: assets/map/${r}.png 이 없다 — 건너뛴다`); continue; }
  const { w, h, ch, px } = readPNG(srcPath);
  const W = w * SCALE, H = h * SCALE;

  // ① 최근접 확대 — 픽셀 경계가 보여야 덧그릴 때 격자를 맞출 수 있다
  const big = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const sy = (y / SCALE) | 0;
    for (let x = 0; x < W; x++) {
      const sx = (x / SCALE) | 0, s = (sy * w + sx) * ch, d = (y * W + x) * 3;
      big[d] = px[s]; big[d + 1] = px[s + 1]; big[d + 2] = px[s + 2];
    }
  }
  writePNG(join(ROOT, 'assets', 'map-briefs', `${r}-x4.png`), W, H, big);

  // ② 해안선만 — 바다/뭍 경계를 1px 검은 선으로. "실루엣을 지켜라"의 그 실루엣이다
  const isSea = (x, y) => {
    const s = (y * w + x) * ch;
    return px[s + 2] - px[s] > 15;                 // check-map.py와 같은 판정
  };
  const coast = Buffer.alloc(W * H * 3, 255);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sea = isSea(x, y);
      let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (isSea(nx, ny) !== sea) { edge = true; break; }
      }
      const tone = edge ? 0 : (sea ? 226 : 246);    // 해안선 검정 · 바다 옅은 회색 · 뭍 흰색
      for (let yy = y * SCALE; yy < (y + 1) * SCALE; yy++) {
        for (let xx = x * SCALE; xx < (x + 1) * SCALE; xx++) {
          const d = (yy * W + xx) * 3;
          coast[d] = coast[d + 1] = coast[d + 2] = tone;
        }
      }
    }
  }
  writePNG(join(ROOT, 'assets', 'map-briefs', `${r}-coast.png`), W, H, coast);
  console.log(`  ${r}  ${w}×${h} → ${W}×${H}  (x4 + coast)`);
  done++;
}
console.log(`\n기준판 ${done}권역 × 2장을 assets/map-briefs/ 에 뽑았다.`);
console.log('의뢰: 이 실루엣을 그대로 두고 질감·명암만 얹는다 → 납품은 400×225(또는 정수배). assets/BRIEF-MAP.md §4-B');
