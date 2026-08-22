#!/usr/bin/env python3
"""clean-map-art.py — 외부(사람·AI)가 그린 지도에서 **게임이 직접 그리는 것들을 지운다.**

    python tools/clean-map-art.py <입력.png> <권역id> [--crop 위,아래] [--colors 48] [--dry]

★ 왜 필요한가. 납품된 지도에는 대개 **글자·항로선·항구점·나침도·배**가 함께 그려져 있다.
  이 게임은 그것들을 코드로 그린다(도시 이름은 DOM 오버레이, 항로는 `ROUTES`, 배는 살아 움직이는
  스프라이트). 그림에 박혀 있으면 **두 번 겹쳐 보이고**, 배경에 박힌 배는 영원히 같은 자리에 멈춘다.
  그래서 지형만 남기고 나머지를 지운 뒤 400×225로 줄인다.

지우는 방법 — "지형에 없는 것"을 색과 문맥으로 가른다:
  · 굵은 항로선 : 밝은 하늘색. **해안선과 갈리는 기준은 `B-G`**(항로선 ≈50, 얕은 바다 ≈8)
  · 가는 방사선 : 깊은 바다에서 주변보다 밝은 얇은 것(top-hat). 해안 7px 안쪽은 제외 —
                  해안 전이 픽셀이 "밝은 선"으로 오인된다
  · 나침도·배   : **바다에 둘러싸인 구멍** 중 B가 높은 것(섬 육지는 B<70이라 남는다)
  · 글자        : 흰 획 + 그 주변의 검은 외곽선(외곽선을 빼면 육지에 검은 막대가 남는다)
지운 자리는 **바깥에서 안쪽으로 한 겹씩 평균**으로 메운다. 가장 가까운 픽셀을 복사하면
지름 100px짜리 나침도 자리에 엉뚱한 색이 물려 검은 원이 남는다(실제로 겪었다).

검수는 `python tools/check-map.py assets/map/<권역>.png`. `--crop`은 원본 비율이 게임과 다를 때
(정사각형 생성물이 흔하다) 위/아래를 잘라 16:9로 맞추는 값이고, **좌표 정합과 바다 비율이
여기서 갈린다** — `--scan`으로 후보를 훑을 수 있다.

의존: Pillow · numpy · scipy
"""
import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass

ROOT = Path(__file__).resolve().parent.parent
VW, VH = 400, 225
REGIONS = ('mediterranean', 'atlantic', 'africa', 'mideast', 'indian',
           'seasia', 'eastasia', 'caribbean', 'southamerica')


def ui_mask(a):
    """게임이 직접 그리는 것들의 마스크. a는 int32 RGB."""
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    lum = (R * 299 + G * 587 + B * 114) // 1000      # ★ int16으로 두면 곱셈에서 넘친다

    sea = ndi.binary_closing((B - R) > 15, np.ones((5, 5)))
    deep = sea & (G < 95)
    near_shore = ndi.binary_dilation(~sea, np.ones((7, 7)))

    bg = ndi.median_filter(lum, size=11)
    line_thin = deep & ~near_shore & ((lum - bg) > 9)
    line_col = (B > 145) & (B - G > 26) & (B - R > 55)

    holes = ndi.binary_fill_holes(sea) & ~sea
    lab, n = ndi.label(ndi.binary_dilation(holes & (B > 85), np.ones((5, 5))))
    objs = np.zeros_like(sea)
    for i in range(1, n + 1):
        blob = lab == i
        if blob.sum() >= 60:                          # 티끌은 건드리지 않는다
            objs |= ndi.binary_fill_holes(ndi.binary_closing(blob, np.ones((9, 9))))
    objs = ndi.binary_dilation(objs, np.ones((5, 5)))

    text_core = (R > 160) & (G > 160) & (B > 145)
    text = text_core | (ndi.binary_dilation(text_core, np.ones((9, 9))) & (lum < 75))

    m = line_thin | line_col | objs | text
    return ndi.binary_dilation(m, np.ones((3, 3))), dict(
        line=line_thin.mean() + line_col.mean(), obj=objs.mean(), text=text.mean())


def inpaint(a, mask, max_steps=120):
    """바깥에서 안쪽으로 한 겹씩 평균으로 메운다(큰 구멍도 자연스럽게 이어진다)."""
    img = a.astype(np.float64).copy()
    valid = ~mask
    img[mask] = 0
    k = np.ones((3, 3))
    for step in range(max_steps):
        if valid.all():
            break
        edge = ndi.binary_dilation(valid, k) & ~valid
        if not edge.any():
            break
        cnt = ndi.convolve(valid.astype(np.float64), k, mode='nearest')
        acc = np.stack([ndi.convolve(img[:, :, c] * valid, k, mode='nearest') for c in range(3)], -1)
        avg = acc / np.maximum(cnt, 1)[:, :, None]
        img[edge] = avg[edge]
        valid |= edge
    return np.clip(img, 0, 255).astype(np.uint8), step + 1


def to_game(clean, crop, colors):
    top, bot = crop
    im = Image.fromarray(clean)
    W, H = im.size
    im = im.crop((0, top, W, H - bot)).resize((VW, VH), Image.BOX)
    return im.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')


def verdict(png):
    r = subprocess.run([sys.executable, str(ROOT / 'tools' / 'check-map.py'), str(png)],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('region', choices=REGIONS)
    ap.add_argument('--crop', default='0,0', help='위,아래로 잘라낼 픽셀 (원본이 16:9가 아닐 때)')
    ap.add_argument('--colors', type=int, default=48, help='양자화 색 수 (1차 납품 PNG가 48색이었다)')
    ap.add_argument('--scan', action='store_true', help='크롭 후보를 훑어 좌표 정합·바다 비율을 비교한다')
    ap.add_argument('--dry', action='store_true', help='assets/map에 쓰지 않고 검수만 한다')
    args = ap.parse_args()

    a = np.asarray(Image.open(args.src).convert('RGB')).astype(np.int32)
    print(f'입력 {Path(args.src).name} {a.shape[1]}×{a.shape[0]}')
    mask, stat = ui_mask(a)
    print(f'  지울 것 {mask.mean() * 100:.2f}%  (선 {stat["line"] * 100:.2f} / '
          f'나침도·배 {stat["obj"] * 100:.2f} / 글자 {stat["text"] * 100:.2f})')
    clean, steps = inpaint(a.astype(np.uint8), mask)
    print(f'  메우기 {steps}겹')

    tmp = ROOT / 'tools' / '.map-tmp'
    tmp.mkdir(exist_ok=True)
    out = tmp / f'{args.region}.png'

    if args.scan:
        H = a.shape[0]
        print(f"\n{'위':>5} {'아래':>5} {'바다%':>6} {'물못닿':>7} {'관통':>5}  판정")
        for top in range(0, min(H // 3, 260), 30):
            for bot in range(0, min(H // 3, 200), 30):
                to_game(clean, (top, bot), args.colors).save(out)
                t = verdict(out)
                import re
                g = lambda p, d0='0': (re.search(p, t).group(1) if re.search(p, t) else d0)
                print(f"{top:>5} {bot:>5} {g(r'바다 (\d+)%'):>6} {g(r'좌표. (\d+)/'):>7} "
                      f"{g(r'\[항로\] (\d+)/\d+개 항로가 육지'):>5}  {g(r'(반려 \d+건|통과)', '?')}")
        return

    crop = tuple(int(v) for v in args.crop.split(','))
    game = to_game(clean, crop, args.colors)
    dest = out if args.dry else ROOT / 'assets' / 'map' / f'{args.region}.png'
    game.save(dest)
    game.resize((VW * 3, VH * 3), Image.NEAREST).save(tmp / f'{args.region}-x3.png')
    print(f'\n저장 {dest.relative_to(ROOT) if dest.is_relative_to(ROOT) else dest}'
          f'  (판독용 3배: tools/.map-tmp/{args.region}-x3.png)')
    print(verdict(dest))
    if not args.dry:
        print('★ 그림을 갈았으면 assets/manifest.json의 version을 올려야 캐시가 갈린다.')


if __name__ == '__main__':
    main()
