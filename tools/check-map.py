#!/usr/bin/env python3
"""check-map.py — 납품된 지도 그림이 게임 좌표와 맞는지 기계로 본다.

    python tools/check-map.py [assets/map/mediterranean.webp]

지도는 "예쁜 지중해"가 아니라 **게임 좌표에 맞는 판**이어야 한다.
1차 납품에서 실제 지중해를 정확히 그렸는데도 반려된 이유가 이것이다 —
게임 좌표는 실제 투영이 아니라 도식이라(실제 위경도와 최대 55px 차이),
진짜 지리대로 그리면 도시 16곳이 전부 엉뚱한 자리에 박힌다.

검사 항목은 assets/WORLD-MAP-BRIEF.md §8과 같다. 좌표는 js/map/geo.js가 정본이고
여기서 다시 적지 않는다(정규식으로 읽는다) — 좌표를 옮기면 이 검사도 함께 따라간다.

의존: Pillow (pip install pillow)
"""
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow가 필요하다:  pip install pillow")

ROOT = Path(__file__).resolve().parent.parent

# ── 어느 바다의 지도인가 ─────────────────────────────────────
#  세계가 아홉 권역으로 갈리면서 `js/map/geo.js`는 **합성 계층**이 되어 좌표를 담지 않는다.
#  좌표의 정본은 `js/regions/<권역>/geo.js`이므로 파일 이름에서 권역을 알아내 그쪽을 읽는다.
#      python tools/check-map.py assets/map/indian.webp     → indian 권역으로 검사
#      python tools/check-map.py --all                      → 아홉 장을 차례로
REGIONS = ["mediterranean", "atlantic", "africa", "mideast", "indian",
           "seasia", "eastasia", "caribbean", "southamerica"]


def load_geo(region):
    return (ROOT / f"js/regions/{region}/geo.js").read_text(encoding="utf-8")


def region_of(path):
    stem = Path(path).stem
    if stem in REGIONS:
        return stem
    sys.exit(f"'{stem}'이 어느 권역인지 모르겠다. 파일 이름을 권역 id로 두어라: {', '.join(REGIONS)}")


# `--all`이면 아홉 장을 차례로 돌리고 요약만 낸다
if "--all" in sys.argv:
    import subprocess
    bad = []
    for r in REGIONS:
        f = ROOT / f"assets/map/{r}.webp"
        if not f.exists():
            f = ROOT / f"assets/map/{r}.png"
        if not f.exists():
            print(f"  {r:16s} 그림 없음")
            continue
        out = subprocess.run([sys.executable, __file__, str(f)],
                             capture_output=True, text=True, encoding="utf-8", errors="replace")
        head = [l for l in out.stdout.splitlines() if "판정" in l or "실패" in l]
        print(f"  {r:16s} {'통과' if out.returncode == 0 else '실패'}"
              + (f"  {head[-1].strip()}" if head else ""))
        if out.returncode:
            bad.append(r)
    print(f"\n아홉 장 중 {9 - len(bad)}장 통과" + (f" · 실패: {', '.join(bad)}" if bad else ""))
    sys.exit(1 if bad else 0)

_img_arg = sys.argv[1] if len(sys.argv) > 1 else "assets/map/mediterranean.webp"
REGION = region_of(_img_arg)
GEO = load_geo(REGION)

# ── 좌표·항로는 권역 geo.js에서 읽는다 (여기에 베껴 적으면 반드시 어긋난다) ──
CITIES = [
    {"id": m.group(1), "name": m.group(2), "x": int(m.group(3)), "y": int(m.group(4))}
    for m in re.finditer(
        r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'.*?x:\s*(\d+),\s*y:\s*(\d+)", GEO)
]
ROUTES = re.findall(r"\['(\w+)',\s*'(\w+)'\]", GEO.split("export const ROUTES")[1].split("];")[0])
BY = {c["id"]: c for c in CITIES}

W, H = 400, 225
img_path = Path(_img_arg)
if not img_path.is_absolute():
    img_path = (ROOT / img_path).resolve()

fails, warns, notes = [], [], []
def fail(k, m): fails.append((k, m))
def warn(k, m): warns.append((k, m))

if not img_path.exists():
    sys.exit(f"파일이 없다: {img_path}")

im = Image.open(img_path).convert("RGB")
px = im.load()

# ── 1. 규격 ────────────────────────────────────────────────
if im.size != (W, H):
    fail("규격", f"{im.size[0]}×{im.size[1]} — 정확히 {W}×{H}여야 한다")

# ── 2. 색 수 · 손실 압축 ───────────────────────────────────
colors = im.getcolors(10 ** 6) or []
if len(colors) > 64:
    fail("색 수", f"고유색 {len(colors):,}색 — 48색 이하로 양자화해야 한다. "
                  f"WebP를 손실로 저장하면 여기서 걸린다(무손실로 저장할 것)")
elif len(colors) > 48:
    warn("색 수", f"고유색 {len(colors)}색 — 48색 이하 권장")
else:
    notes.append(f"고유색 {len(colors)}색")

twin = img_path.with_suffix(".png" if img_path.suffix == ".webp" else ".webp")
if twin.exists():
    t = Image.open(twin).convert("RGB")
    if t.size == im.size:
        tp = t.load()
        diff = sum(1 for y in range(H) for x in range(W)
                   if max(abs(a - b) for a, b in zip(px[x, y], tp[x, y])) > 8)
        if diff > W * H * 0.01:
            fail("손실 압축", f"{twin.name}와 {diff / (W * H) * 100:.0f}%의 픽셀이 8단계 넘게 다르다 "
                             f"— 한쪽이 손실 저장됐다. 게임이 쓰는 쪽이 무손실이어야 한다")

# ── 3. 바다/육지 ───────────────────────────────────────────
def is_sea(x, y):
    r, g, b = px[x, y]
    return b > r + 18                      # 팔레트가 바다=청록, 육지=녹/황토라는 전제

land_ratio = sum(0 if is_sea(x, y) else 1 for y in range(H) for x in range(W)) / (W * H)
notes.append(f"육지 비율 {land_ratio * 100:.0f}%")
if land_ratio > 0.60:
    fail("범위", f"육지가 {land_ratio * 100:.0f}% — 지중해가 아니라 대륙을 그린 것이다. "
                 f"게임은 바다 위에서 벌어지므로 바다가 절반을 넘어야 한다")

# ── 4. 도시 16곳이 해안선 위인가 ───────────────────────────
bad_city = []
for c in CITIES:
    x, y = c["x"], c["y"]
    if not (0 <= x < W and 0 <= y < H):
        bad_city.append((c, "화면 밖"))
        continue
    l = s = 0
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            xx, yy = x + dx, y + dy
            if 0 <= xx < W and 0 <= yy < H:
                if is_sea(xx, yy): s += 1
                else: l += 1
    if l == 0:
        bad_city.append((c, "바다 한복판"))
    elif s == 0:
        bad_city.append((c, "내륙"))
if bad_city:
    fail("도시 좌표", f"{len(bad_city)}/{len(CITIES)}곳이 해안선 위가 아니다 — " +
         ", ".join(f"{c['name']}({c['x']},{c['y']}) {why}" for c, why in bad_city[:8]) +
         (" …" if len(bad_city) > 8 else ""))

# ── 5. 항로가 바다 위를 지나는가 ───────────────────────────
blocked = []
for a, b in ROUTES:
    if a not in BY or b not in BY:
        continue
    ca, cb = BY[a], BY[b]
    n = max(abs(ca["x"] - cb["x"]), abs(ca["y"] - cb["y"])) or 1
    on_land = 0
    for i in range(3, n - 2):              # 접안 구간(양끝 3px)은 육지여도 정상
        t = i / n
        x = round(ca["x"] + (cb["x"] - ca["x"]) * t)
        y = round(ca["y"] + (cb["y"] - ca["y"]) * t)
        if 0 <= x < W and 0 <= y < H and not is_sea(x, y):
            on_land += 1
    if on_land > 2:
        blocked.append((ca["name"], cb["name"], on_land, n))
if blocked:
    blocked.sort(key=lambda r: -r[2])
    fail("항로", f"{len(blocked)}/{len(ROUTES)}개 항로가 육지를 지난다 — " +
         ", ".join(f"{a}~{b}({d}px)" for a, b, d, _ in blocked[:6]) +
         (" …" if len(blocked) > 6 else ""))

# ── 6. 바다가 조용한가 (1px NPC 점이 묻히지 않게) ──────────
noisy = tot = 0
for y in range(1, H - 1, 2):
    for x in range(1, W - 1, 2):
        if not is_sea(x, y):
            continue
        vals = [sum(px[x + dx, y + dy]) / 3 for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
        tot += 1
        if max(vals) - min(vals) > 42:     # 국소 대비가 이보다 크면 1px 점이 묻힌다
            noisy += 1
if tot:
    ratio = noisy / tot
    notes.append(f"바다 국소 대비 초과 {ratio * 100:.1f}%")
    if ratio > 0.12:
        warn("바다 소음", f"바다의 {ratio * 100:.0f}%가 국소 대비 42 초과 — "
                          f"1px 상인/해적 점이 묻힐 수 있다")

# ── 결과 ───────────────────────────────────────────────────
print(f"검사 대상: {img_path.relative_to(ROOT)}  ({im.size[0]}×{im.size[1]})")
print("           " + " · ".join(notes))
print()
for k, m in fails:
    print(f"  ✗ [{k}] {m}")
for k, m in warns:
    print(f"  △ [{k}] {m}")
if not fails and not warns:
    print("  ✓ 전 항목 통과")
print()
if fails:
    print(f"반려 {len(fails)}건 · 경고 {len(warns)}건")
    print("기준판: assets/map-reference/coord-target.png (도시 정위치) · "
          "coord-target-4x.png (판독용)")
    sys.exit(1)
print(f"통과 · 경고 {len(warns)}건")
