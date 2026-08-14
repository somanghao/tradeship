// icons.js — 교역품 / UI 아이콘 (16x16)

import { PAL as P, bake, outline } from '../pixel.js';

const S = 16;

const DRAW = {
  grain: (g) => {                                    // 밀단
    for (const dx of [-3, 0, 3]) {
      g.line(8 + dx, 13, 8 + dx * 0.4, 4, P.goldD);
      for (let i = 0; i < 5; i++) {
        const y = 4 + i * 1.6, x = 8 + dx * (0.4 + i * 0.06);
        g.px(x - 1, y, P.goldM); g.px(x + 1, y, P.goldM); g.px(x, y, P.goldL);
      }
    }
    g.r(5, 11, 7, 2, P.woodM);
    g.h(11, 5, 11, P.woodL);
  },
  oliveoil: (g) => {                                 // 암포라
    g.ellipse(8, 9, 4, 5, '#9c6b38');
    g.ellipse(7, 8, 3, 4, '#b8823f');
    g.r(7, 2, 2, 4, '#9c6b38');
    g.r(6, 1, 4, 2, '#c99a5c');
    g.px(4, 5, '#7d5228'); g.px(11, 5, '#7d5228');
    g.line(5, 4, 4, 7, '#7d5228'); g.line(10, 4, 11, 7, '#7d5228');
    g.ellipse(8, 13, 2, 1, '#7d5228');
    g.px(6, 7, '#d4a86a');
    g.ellipse(8, 10, 2, 2, P.grnM);
  },
  wine: (g) => {                                     // 포도 + 병
    g.r(6, 3, 3, 4, '#3d5a2a');
    g.r(5, 6, 5, 7, P.purM);
    for (const [x, y] of [[6, 8], [8, 8], [7, 10], [9, 10], [6, 11], [8, 12]]) {
      g.ellipse(x, y, 1, 1, P.purL);
    }
    g.h(6, 5, 9, P.purD);
    g.ellipse(12, 5, 2, 2, P.grnM);
    g.line(9, 4, 12, 4, P.grnD);
  },
  salt: (g) => {                                     // 소금 자루
    g.poly([[4, 13], [5, 6], [11, 6], [12, 13]], '#d8cfba');
    g.h(13, 4, 11, '#a89f8a');
    g.r(6, 3, 4, 4, '#e8e0cc');
    g.r(6, 5, 4, 1, '#a89f8a');
    g.px(6, 9, '#fff8e8'); g.px(9, 10, '#fff8e8'); g.px(7, 11, '#fff8e8');
    g.line(5, 7, 5, 12, '#b8af9a');
  },
  spice: (g) => {                                    // 향신료 자루
    g.poly([[4, 13], [5, 7], [11, 7], [12, 13]], '#a8845a');
    g.h(13, 4, 11, '#7d5f3c');
    g.ellipse(8, 6, 4, 2, '#c25a2a');
    g.ellipse(7, 5, 2, 1, '#e0803a');
    g.px(6, 4, '#c9702a'); g.px(10, 4, '#a8481f');
    g.r(6, 6, 5, 1, '#8a6a44');
    g.line(5, 8, 5, 12, '#8a6a44');
  },
  silk: (g) => {                                     // 비단 두루마리
    g.r(3, 5, 11, 7, '#b8508a');
    g.h(5, 3, 13, '#d47ab0');
    g.h(11, 3, 13, '#8a2f66');
    g.ellipse(3, 8, 2, 4, '#d47ab0');
    g.ellipse(13, 8, 2, 4, '#8a2f66');
    for (let x = 5; x < 13; x += 3) g.v(x, 6, 10, '#c96a9c');
    g.line(4, 12, 10, 14, '#b8508a');
  },
  ceramic: (g) => {                                  // 도자기
    g.ellipse(8, 10, 4, 4, '#e0e4ea');
    g.r(7, 3, 2, 4, '#e0e4ea');
    g.r(6, 2, 4, 2, '#f2f4f8');
    g.ellipse(6, 9, 2, 2, '#f6f8fc');
    g.ellipse(8, 10, 3, 2, '#3f6f9e');
    g.px(6, 11, '#2f5880'); g.px(10, 9, '#2f5880');
    g.ellipse(8, 13, 3, 1, '#a8aab2');
  },
  glass: (g) => {                                    // 유리 잔
    g.poly([[4, 3], [12, 3], [10, 9], [6, 9]], '#8fd0d8');
    g.poly([[5, 4], [11, 4], [9.5, 7], [6.5, 7]], '#c8ecf0');
    g.h(3, 4, 11, '#e8f8fa');
    g.r(7, 9, 2, 3, '#8fd0d8');
    g.ellipse(8, 13, 4, 1, '#a8dce4');
    g.px(6, 5, '#f4ffff'); g.px(10, 6, '#5fa8b4');
  },
  weapon: (g) => {                                   // 검 + 방패
    g.line(11, 12, 4, 3, P.steelM);
    g.line(12, 12, 5, 3, P.steelL);
    g.line(11, 13, 4, 4, P.steelD);
    g.px(4, 2, P.steelL);
    g.r(10, 12, 3, 2, P.goldM);
    g.r(12, 13, 2, 2, P.woodM);
    g.poly([[3, 6], [9, 6], [9, 11], [6, 14], [3, 11]], P.woodM);
    g.poly([[4, 7], [8, 7], [8, 10], [6, 12], [4, 10]], P.redM);
    g.px(6, 9, P.goldM);
  },
  fur: (g) => {                                      // 모피 더미
    g.ellipse(8, 10, 6, 4, '#6b4a2f');
    g.ellipse(7, 9, 5, 3, '#8a6540');
    g.ellipse(6, 8, 3, 2, '#a8815a');
    for (let i = 0; i < 12; i++) {
      const x = 3 + (i * 7) % 11, y = 7 + (i * 5) % 6;
      g.px(x, y, i % 3 ? '#5a3d26' : '#b8925f');
    }
    g.px(3, 12, '#4a3220'); g.px(13, 11, '#4a3220');
    g.h(13, 4, 12, '#4a3220');
  },
  ivory: (g) => {                                    // 상아
    for (const dy of [0, 4]) {
      for (let i = 0; i < 11; i++) {
        const t = i / 10;
        const x = 3 + i;
        const y = 6 + dy - Math.round(Math.sin(t * 1.7) * 3);
        g.px(x, y, '#e8e0cc'); g.px(x, y + 1, '#d0c6ac');
        if (i < 3) g.px(x, y + 2, '#b8ae94');
      }
    }
  },
  gold: (g) => {                                     // 금괴
    g.poly([[3, 12], [4, 8], [12, 8], [13, 12]], P.goldM);
    g.h(8, 4, 11, P.goldL);
    g.h(9, 4, 11, P.goldL);
    g.h(12, 3, 12, P.goldD);
    g.poly([[5, 7], [6, 4], [11, 4], [12, 7]], P.goldM);
    g.h(4, 6, 10, P.goldL);
    g.px(7, 5, '#fff2b8'); g.px(5, 10, '#fff2b8');
  },
};

export function iconSprite(kind) {
  const fn = DRAW[kind];
  if (!fn) throw new Error(`unknown icon: ${kind}`);
  return bake(`icon:${kind}`, S, S, (g, ctx) => {
    fn(g);
    outline(ctx, S, S);
  });
}

export const ICON_KEYS = Object.keys(DRAW);
