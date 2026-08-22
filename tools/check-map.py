#!/usr/bin/env python3
"""check-map.py — 납품된 지도 그림이 게임 좌표와 맞는지 기계로 본다.

    python tools/check-map.py [assets/map/mediterranean.png]

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

# 검사 결과에 한글과 —·✅ 같은 기호를 쓰는데 Windows 콘솔 기본이 cp949라 출력에서 죽는다.
# 검수기가 판정이 아니라 인코딩으로 멈추면 아무 소용이 없다.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow가 필요하다:  pip install pillow")

ROOT = Path(__file__).resolve().parent.parent

# ★ 게임이 쓰는 그림은 이제 PNG다(반려됐던 webp 납품본은 지웠다). 확장자를 하나로 못 박으면
#   납품 형식이 바뀔 때마다 검수 도구가 통째로 죽는다 — 실제로 그렇게 죽어 있었다.
#   있는 쪽을 고른다: PNG → WebP 순.
def _pick(rid):
    for ext in (".png", ".webp"):
        f = ROOT / f"assets/map/{rid}{ext}"
        if f.exists():
            return f
    return ROOT / f"assets/map/{rid}.png"


# ── 어느 바다의 지도인가 ─────────────────────────────────────
#  세계가 아홉 권역으로 갈리면서 `js/map/geo.js`는 **합성 계층**이 되어 좌표를 담지 않는다.
#  좌표의 정본은 `js/regions/<권역>/geo.js`이므로 파일 이름에서 권역을 알아내 그쪽을 읽는다.
#      python tools/check-map.py assets/map/indian.png      → indian 권역으로 검사
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
        f = _pick(r)
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

_img_arg = sys.argv[1] if len(sys.argv) > 1 else str(_pick("mediterranean"))
REGION = region_of(_img_arg)
GEO = load_geo(REGION)

# ── 좌표·항로는 권역 geo.js에서 읽는다 (여기에 베껴 적으면 반드시 어긋난다) ──
CITIES = [
    {"id": m.group(1), "name": m.group(2), "x": int(m.group(3)), "y": int(m.group(4))}
    for m in re.finditer(
        r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'.*?x:\s*(\d+),\s*y:\s*(\d+)", GEO)
]
ROUTES = re.findall(r"\['(\w+)',\s*'(\w+)'\]", GEO.split("export const ROUTES")[1].split("];")[0])

# ★ 내해·육로 항로(`ROUTE_RISK: null`)는 **뭍을 지나는 것이 정상이다** — 노새길·강길·좁은 만이다.
#   그것을 관통으로 세면 검수기가 고증을 버그로 신고한다(부르사~이즈니크가 오래 그렇게 걸려 있었다).
INLAND = set()
if "export const ROUTE_RISK" in GEO:
    _risk = GEO.split("export const ROUTE_RISK")[1].split("};")[0]
    for a, b in re.findall(r"'(\w+)\|(\w+)':\s*null", _risk):
        INLAND.add(frozenset((a, b)))
ROUTES = [(a, b) for a, b in ROUTES if frozenset((a, b)) not in INLAND]
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
# ★ 색 수를 **실패**로 잡던 것을 경고로 내렸다. 손실 압축을 잡으려던 검사인데,
#   실제 손실 여부는 아래 쌍둥이 파일(PNG↔WebP) 비교가 훨씬 정확하게 잡는다.
#   지금 지도는 바다에 세로 그라데이션이 있어 색이 200개를 넘는데(기후 팔레트),
#   그것은 손실 압축이 아니라 의도한 그림이다.
colors = im.getcolors(10 ** 6) or []
notes.append(f"고유색 {len(colors)}색")
if len(colors) > 96:
    warn("색 수", f"고유색 {len(colors):,}색 — 픽셀아트로는 많다. "
                  f"바다 그라데이션 때문이면 정상이고, 사진 같은 번짐이면 손실 저장을 의심할 것")

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

# ★ "육지 60% 넘으면 반려"는 **지중해(사방이 뭍인 내해)에 맞춘 기준**이었다.
#   대륙 연안을 따라가는 바다(아프리카 서안·인도 아대륙·중동)는 육지가 그보다 많은 것이 정상이다.
#   `mapcheck.html`과 같은 밴드(바다 20~80%)로 맞춘다 — 검수기 둘이 서로 다른 잣대를 쓰면
#   어느 쪽을 믿어야 할지 알 수 없다.
land_ratio = sum(0 if is_sea(x, y) else 1 for y in range(H) for x in range(W)) / (W * H)
sea_ratio = 1 - land_ratio
notes.append(f"바다 {sea_ratio * 100:.0f}%")
if sea_ratio < 0.20:
    fail("범위", f"바다가 {sea_ratio * 100:.0f}%뿐이다 — 항로가 지날 물이 없다")
elif sea_ratio > 0.80:
    fail("범위", f"바다가 {sea_ratio * 100:.0f}% — 뭍이 거의 없어 지도로 읽히지 않는다")

# ── 4. 도시 16곳이 해안선 위인가 ───────────────────────────
# ★ 반경을 2px에서 6px로 넓혔다. 5×5는 항구 앞바다 안이라 **늘 물**이어서 판정이 무의미했다
#   (실제로 멀쩡한 지도가 "바다 한복판 8곳"으로 반려됐다).
#   그리고 **섬 항구는 물에 둘러싸이는 것이 정상**이므로 따로 센다 — 실패가 아니다.
#   `mapcheck.html`이 쓰는 것과 같은 기준이다.

def land_reach(x, y, limit=34):
    """그 자리에서 **가장 가까운 뭍까지 몇 px**인가. 뭍 위면 0, limit 안에 없으면 limit+1."""
    if not is_sea(x, y):
        return 0
    for r in range(1, limit + 1):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if max(abs(dx), abs(dy)) != r:      # 링만 훑는다
                    continue
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and not is_sea(xx, yy):
                    return r
    return limit + 1


bad_city, isle_city, far_city, reach = [], [], [], []
for c in CITIES:
    x, y = c["x"], c["y"]
    if not (0 <= x < W and 0 <= y < H):
        bad_city.append((c, "화면 밖"))
        continue
    l = s = 0
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            if dx * dx + dy * dy > 36:
                continue
            xx, yy = x + dx, y + dy
            if 0 <= xx < W and 0 <= yy < H:
                if is_sea(xx, yy): s += 1
                else: l += 1
    if s == 0:
        bad_city.append((c, "물이 안 닿는다"))
    elif l == 0:
        isle_city.append(c["name"])
    d = land_reach(x, y)
    reach.append(d)
    if d > 28:
        far_city.append((c, d))

if isle_city:
    notes.append(f"섬 항구 {len(isle_city)}곳")
if reach:
    notes.append(f"뭍까지 평균 {sum(reach) / len(reach):.1f}px")
if bad_city:
    fail("도시 좌표", f"{len(bad_city)}/{len(CITIES)}곳에 물이 안 닿는다 — " +
         ", ".join(f"{c['name']}({c['x']},{c['y']}) {why}" for c, why in bad_city[:8]) +
         (" …" if len(bad_city) > 8 else ""))

# ★ 아래 두 검사가 없어서 3차 납품이 통과했다(2026-08-17). "물이 안 닿는가"만 보면
#   바다 한가운데 뜬 도시는 늘 통과한다 — 물은 넘치도록 있으니까. 그때 26곳이 `섬 항구`로
#   조용히 집계됐고, 실제로는 알렉산드리아가 뭍에서 64px(화면 폭의 16%) 떨어져 있었다.
#   항구는 "물에 닿는 곳"이 아니라 **뭍과 물이 만나는 곳**이다.
#   임계는 실측으로 잡았다 — 코드가 그린 아홉 장은 뭍까지 평균 8.5px이고 28px을 넘는 도시가 없었다.
#   (2026-08-18 재측정: 항구가 264곳으로 늘어 평균이 6.4px로 내려왔다. 권역별 5.1~7.3px.)
if far_city:
    fail("항구가 뭍에서 멀다",
         f"{len(far_city)}곳이 뭍에서 28px 넘게 떨어져 바다 한가운데다 — " +
         ", ".join(f"{c['name']}({d}px)" for c, d in sorted(far_city, key=lambda t: -t[1])[:8]) +
         (" …" if len(far_city) > 8 else ""))

# 개별 도시가 아니라 **지도 전체가 좌표계와 어긋난** 경우. 하나둘이 아니라 절반이 뜨면 그림이 다른 세계다.
if reach:
    loose = sum(1 for d in reach if d > 12)
    if loose > len(reach) * 0.5:
        fail("지형이 좌표계와 다르다",
             f"{loose}/{len(reach)}곳이 뭍에서 12px 넘게 떨어져 있다 — "
             "실제 지리대로 그린 그림은 이 게임의 도식 좌표와 맞지 않는다"
             "(코드가 그린 판은 이 비율이 20% 안쪽이다)")

# ── 5. 항로가 바다 위를 지나는가 ───────────────────────────
blocked, grazed = [], []
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
    # ★ "3px 넘으면 실패"를 **비율**로 바꿨다(`mapcheck.html`과 같은 34%).
    #   긴 항로일수록 절대 픽셀 수가 커지므로 절대값으로 재면 먼 바다가 부당하게 걸린다.
    #   좁은 해협을 스치는 것과 산맥을 관통하는 것은 다르다 — 비율이 그 차이를 본다.
    ratio = on_land / max(1, n - 5)
    if ratio > 0.34:
        blocked.append((ca["name"], cb["name"], on_land, n, ratio))
    elif on_land > 2:
        grazed.append(f'{ca["name"]}~{cb["name"]}')
if blocked:
    blocked.sort(key=lambda r: -r[4])
    fail("항로", f"{len(blocked)}/{len(ROUTES)}개 항로가 육지를 가로지른다 — " +
         ", ".join(f"{a}~{b}({r * 100:.0f}%)" for a, b, _, _, r in blocked[:6]) +
         (" …" if len(blocked) > 6 else ""))
if grazed:
    warn("항로", f"{len(grazed)}개 항로가 뭍을 스친다(34% 미만이라 실패는 아니다) — "
                 + ", ".join(grazed[:5]) + (" …" if len(grazed) > 5 else ""))

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
# 납품물을 리포 밖(다운로드·후처리 폴더)에 두고 검수하는 일이 잦다 — relative_to는 그때 죽는다
try:
    shown = img_path.relative_to(ROOT)
except ValueError:
    shown = img_path
print(f"검사 대상: {shown}  ({im.size[0]}×{im.size[1]})")
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
