import os
import sys
import numpy as np
from PIL import Image
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parent.parent
MAP_DIR = ROOT / 'assets' / 'map'
BRIEF_DIR = ROOT / 'assets' / 'map-briefs'

REGIONS = [
    'mediterranean', 'atlantic', 'africa', 'mideast', 'indian',
    'seasia', 'eastasia', 'caribbean', 'southamerica'
]

# Region-specific climate land palettes (R, G, B)
CLIMATES = {
    'mediterranean': {
        'land_base': (175, 165, 120),  # Olive/mediterranean dry green-brown
        'land_low': (140, 155, 95),    # Coastal green
        'land_high': (160, 130, 90),   # Hills
        'forest': (80, 115, 65),       # Mediterranean pine
        'desert': (215, 185, 130),     # South coast sand
        'north_bias': True
    },
    'atlantic': {
        'land_base': (110, 150, 90),   # Lush green
        'land_low': (95, 140, 80),     # Lowlands
        'land_high': (130, 125, 95),   # Highlands
        'forest': (55, 105, 55),       # Dense forest
        'desert': None,
        'north_bias': False
    },
    'africa': {
        'land_base': (210, 175, 115),  # Savannah/Sahara sand
        'land_low': (185, 160, 100),   # Arid plains
        'land_high': (165, 125, 80),   # Plateau
        'forest': (70, 120, 60),       # Jungle patches in south
        'desert': (225, 195, 130),
        'north_bias': False
    },
    'mideast': {
        'land_base': (215, 180, 125),  # Desert
        'land_low': (200, 165, 110),   # Dunes
        'land_high': (165, 120, 85),   # Dry mountains
        'forest': (105, 135, 80),      # Oases
        'desert': (230, 195, 135),
        'north_bias': False
    },
    'indian': {
        'land_base': (145, 160, 100),  # Tropical green-brown
        'land_low': (120, 150, 85),
        'land_high': (140, 120, 85),   # Western ghats
        'forest': (60, 115, 60),
        'desert': (210, 180, 125),
        'north_bias': False
    },
    'seasia': {
        'land_base': (95, 145, 80),    # Tropical rain forest green
        'land_low': (80, 135, 70),
        'land_high': (115, 120, 80),
        'forest': (45, 100, 50),
        'desert': None,
        'north_bias': False
    },
    'eastasia': {
        'land_base': (130, 155, 95),   # East Asian temperate green
        'land_low': (110, 145, 85),
        'land_high': (140, 120, 85),   # Mountainous
        'forest': (65, 110, 60),
        'desert': (205, 175, 120),
        'north_bias': False
    },
    'caribbean': {
        'land_base': (115, 155, 85),   # Island green
        'land_low': (100, 145, 80),
        'land_high': (135, 130, 90),
        'forest': (55, 115, 55),
        'desert': None,
        'north_bias': False
    },
    'southamerica': {
        'land_base': (100, 150, 80),   # Amazon jungle & Andes
        'land_low': (85, 140, 75),
        'land_high': (145, 125, 90),   # Andes mountains
        'forest': (45, 105, 50),
        'desert': (205, 175, 120),
        'north_bias': False
    }
}

# 4-step ocean water depth colors (R, G, B)
# b > r + 18 required for sea detection
WATER_SHALLOW_BEACH = (205, 195, 145) # 0-1px beach sand/water boundary (land-like or very shallow)
WATER_SHALLOW = (40, 145, 155)        # 1-3px light turquoise (R=40, G=145, B=155 -> B-R = 115 > 18)
WATER_MID     = (25, 85, 135)         # 4-8px mid blue (R=25, G=85, B=135 -> B-R = 110 > 18)
WATER_DEEP    = (15, 45, 95)          # 9+px deep navy (R=15, G=45, B=95 -> B-R = 80 > 18)

# Dithering 2x2 matrix
BAYER_2X2 = np.array([
    [0.0, 0.5],
    [0.75, 0.25]
])

def process_region(region_id):
    src_path = MAP_DIR / f"{region_id}.png"
    if not src_path.exists():
        print(f"File not found: {src_path}")
        return

    img = Image.open(src_path).convert('RGB')
    w, h = img.size
    arr = np.array(img, dtype=np.int32)
    R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # Exact sea mask defined by check-map.py: B > R + 18
    is_sea = (B > R + 18)

    # Compute distance transform for sea (distance from land)
    from scipy import ndimage as ndi
    dist_sea = ndi.distance_transform_edt(is_sea)
    dist_land = ndi.distance_transform_edt(~is_sea)

    # Create new output array
    out = np.zeros((h, w, 3), dtype=np.uint8)

    climate = CLIMATES.get(region_id, CLIMATES['mediterranean'])

    # Perlin-like pseudo noise using sine waves for natural texture
    y_coords, x_coords = np.indices((h, w))
    noise1 = np.sin(x_coords * 0.15) * np.cos(y_coords * 0.15)
    noise2 = np.sin(x_coords * 0.35 + 1.2) * np.sin(y_coords * 0.35 + 0.8)
    noise = (noise1 * 0.6 + noise2 * 0.4) # range roughly -1 to 1

    dither = (BAYER_2X2[y_coords % 2, x_coords % 2] - 0.375) * 1.5

    for y in range(h):
        for x in range(w):
            n_val = noise[y, x]
            d_val = dither[y, x]

            if is_sea[y, x]:
                d_dist = dist_sea[y, x]
                # Stepped 4-layer depth with dithered transitions
                eff_dist = d_dist + d_val * 0.8

                if eff_dist <= 1.2:
                    # Beach / edge tint
                    col = WATER_SHALLOW
                elif eff_dist <= 3.8:
                    # Shallow turquoise
                    col = WATER_SHALLOW
                elif eff_dist <= 8.5:
                    # Mid blue
                    col = WATER_MID
                else:
                    # Deep navy
                    col = WATER_DEEP

                # Add tiny dither noise for 16-bit feel (keep local contrast <= 42)
                r_c = int(np.clip(col[0] + n_val * 3, 10, 220))
                g_c = int(np.clip(col[1] + n_val * 3, 20, 220))
                b_c = int(np.clip(col[2] + n_val * 3, 30, 240))

                # Enforce check-map condition: b_c > r_c + 19
                if b_c <= r_c + 19:
                    b_c = r_c + 20

                out[y, x] = [r_c, g_c, b_c]
            else:
                # Land processing
                d_land = dist_land[y, x]

                # Decide land feature: forest, mountain, desert, or base
                base = np.array(climate['land_base'], dtype=float)

                if climate['north_bias'] and y > h * 0.6 and climate['desert'] is not None:
                    # Mediterranean south coast desert bias
                    base = np.array(climate['desert'], dtype=float)

                # Inland elevation/texture
                if d_land > 4.5 and n_val > 0.35:
                    # Mountain ridge texture
                    col = np.array(climate['land_high'], dtype=float)
                elif d_land > 2.0 and n_val < -0.2:
                    # Forest patch
                    col = np.array(climate['forest'], dtype=float)
                elif d_land <= 2.0:
                    # Coastal lowland
                    col = np.array(climate['land_low'], dtype=float)
                else:
                    col = base

                # Apply dithering
                col = col + d_val * 12.0 + n_val * 6.0
                r_c = int(np.clip(col[0], 40, 245))
                g_c = int(np.clip(col[1], 40, 245))
                b_c = int(np.clip(col[2], 20, 235))

                # Enforce check-map condition for land: b_c <= r_c + 18
                if b_c > r_c + 18:
                    b_c = max(0, r_c + 15)

                out[y, x] = [r_c, g_c, b_c]

    out_img = Image.fromarray(out, mode='RGB')
    out_img.save(src_path)

    # Also update x4 and coast tracing files
    w4, h4 = w * 4, h * 4
    x4_img = out_img.resize((w4, h4), Image.NEAREST)
    x4_img.save(BRIEF_DIR / f"{region_id}-x4.png")

    print(f"Processed {region_id} map -> assets/map/{region_id}.png & assets/map-briefs/{region_id}-x4.png")

def main():
    for r in REGIONS:
        process_region(r)

if __name__ == '__main__':
    main()
