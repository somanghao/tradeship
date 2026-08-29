// char-mini.js — **작은 인물** (24×28 그리드 · 실질 키 21px)
//
// ★ 왜 따로 굽나 — 사용자 지적: *"캐릭터가 배에 비해 너무 크다."*
//   조선소 갑판과 항구 부두는 **배 전체가 보여야 하는 화면**이라 선체를 키울 수 없다
//   (조선소는 패널이 x=206부터라 176px 스프라이트를 정수배로 못 키운다). 그러면 남는 답은
//   **사람 쪽을 줄이는 것**뿐이고, 픽셀아트는 비정수·축소 리샘플에서 뭉개지므로
//   `blit(…, 0.5)`가 아니라 **작은 키로 새로 굽는다**. 이것이 그 그림이다.
//
// ★ 무엇을 지키나 — 이 화면의 값은 *"선원 탭에서 바꾼 결과가 여기 바로 나타난다"*이다.
//   작아져도 **누가 서 있는지 병종이 읽혀야** 그 값이 산다. 그래서 21px에서 살아남는
//   축만 남겼다: ① 머리에 쓴 것 ② 손에 든 것의 실루엣 ③ 옷 색(배색) ④ 얼굴빛(권역).
//   갑옷 무늬·수염·장식 같은 것은 21px에서 얼룩이 되므로 **일부러 안 그린다.**
//
// ★ 정본은 여전히 `char.js`다 — 병종 정의(`UNITS`)·의상 배색(`SCHEMES`)·얼굴빛(`skinOf`)을
//   그대로 가져다 쓴다. 표를 여기 베끼면 바다별 얼굴빛이 큰 그림에서만 갈리는 일이 다시 난다(C-14).
//
// ★ `bake` 키는 `charmini:`로 시작한다 — 큰 그림(`char:`)과 **섞이지 않게** 접두사로 크기를 가른다.
//   그림을 PNG로 갈아 끼울 때도 이 키를 `assets/manifest.json`에 적는다(규격 24×28).

import { PAL as P, bake, outline } from '../pixel.js';
import { UNITS, SCHEMES, skinOf } from './char.js';

export const MW = 24, MH = 28;   // 스프라이트 규격
export const MINI_FOOT = 25;     // 발바닥 기준선 (큰 그림의 `CHAR_FOOT`에 대응)

/* 몸의 기준선 — 한 자리에 모아 둔다. 하나만 옮겨도 파츠가 함께 따라온다.
   ★ 비례를 한 번 고쳤다. 처음엔 머리 6px에 다리를 자락이 덮어 **블록처럼** 보였다(렌더로 확인).
     지금은 머리 5 : 몸통 8 : 다리 5 : 부츠 3 — 머리가 키의 1/4이라 21px에서도 사람으로 읽힌다. */
const CX = 11;        // 몸 중심 x
const HEAD_Y = 4;     // 머리 윗선 (모자는 이 위로 올라간다)
const HEAD_B = 8;     // 머리 아랫선
const SHLD_Y = 9;     // 어깨선
const WAIST_Y = 14;   // 허리
const HEM_Y = 17;     // 코트 자락 (여기부터 다리가 보인다)
const BOOT_Y = 22;    // 부츠 윗선
const SOLE_Y = 24;    // 밑창

/** 포즈 — 21px에서는 큰 그림처럼 팔다리를 벌릴 자리가 없다. 기울기 하나만 쓴다. */
function poseOf(name) {
  return name === 'attack' ? { lean: 1, armY: -2 }
       : name === 'hit'    ? { lean: -1, armY: 1 }
       : { lean: 0, armY: 0 };
}

/* ── 베이스 바디 ──────────────────────────────────────────────── */
function drawLegs(g, s) {
  g.r(CX - 2, HEM_Y, 2, BOOT_Y - HEM_Y, s.pD);      // 뒤쪽 다리
  g.r(CX + 1, HEM_Y, 2, BOOT_Y - HEM_Y, s.pM);      // 앞쪽 다리
  g.r(CX - 3, BOOT_Y, 4, 2, P.woodD);               // 뒤쪽 부츠
  g.r(CX + 1, BOOT_Y, 4, 2, P.woodM);               // 앞쪽 부츠
  g.h(BOOT_Y, CX + 1, CX + 4, P.woodL);
  g.h(SOLE_Y, CX - 3, CX + 4, '#1e1820');           // 밑창
}

function drawTorso(g, s, po) {
  const L = po.lean;
  // 코트 — 어깨(7px)에서 자락(9px)으로 살짝 퍼진다
  g.poly([[CX - 3 + L, SHLD_Y], [CX + 3 + L, SHLD_Y],
          [CX + 4 + L, WAIST_Y], [CX + 4, HEM_Y - 1],
          [CX - 4, HEM_Y - 1], [CX - 4 + L, WAIST_Y]], s.cM);
  g.h(SHLD_Y, CX - 3 + L, CX + 3 + L, s.cL);        // 탑 라이팅
  g.h(HEM_Y - 1, CX - 4, CX + 4, s.cD);             // 자락 그늘
  // 허리띠 — 두 톤이면 21px에서도 허리가 읽힌다
  g.h(WAIST_Y, CX - 4 + L, CX + 4 + L, s.trimD);
  g.h(WAIST_Y - 1, CX - 3 + L, CX + 4 + L, s.trim);
}

/** 뒤쪽 팔 — 몸보다 먼저 그린다(그리는 순서가 곧 z축) */
function drawBackArm(g, s, po) {
  g.r(CX - 5 + po.lean, SHLD_Y + 1 + po.armY, 2, 5, s.cD);
}
/** 앞쪽 팔 — 몸 위에, 무기보다 아래에 */
function drawFrontArm(g, s, sk, po) {
  const y = SHLD_Y + 1 + po.armY;
  g.r(CX + 4 + po.lean, y, 2, 4, s.cM);
  g.px(CX + 4 + po.lean, y, s.cL);
  g.r(CX + 4 + po.lean, y + 4, 2, 2, sk.M);         // 손
}

function drawHead(g, sk) {
  g.r(CX - 2, HEAD_Y, 5, HEAD_B - HEAD_Y + 1, sk.M);
  g.h(HEAD_Y, CX - 1, CX + 1, sk.L);                // 이마 하이라이트
  g.v(CX + 2, HEAD_Y + 1, HEAD_B, sk.D);            // 볼 그늘
  g.px(CX - 1, HEAD_Y + 3, P.out);                  // 눈 둘 — 1px씩
  g.px(CX + 1, HEAD_Y + 3, P.out);
  g.h(SHLD_Y - 1, CX - 1, CX + 1, sk.D);            // 목
}

/* ── 머리에 쓴 것 ─────────────────────────────────────────────
   ★ 21px에서 병종을 가르는 **첫 번째 축**이다. 실루엣이 서로 안 겹치게만 만든다.
   ⚠️ 모자는 반드시 **머리 윗줄을 덮는다**(`HEAD_Y`부터). 위에만 얹으면 머리 위에 뜬 물체가 된다. */
const HEADGEAR = {
  none(g) {                                        // 맨머리 — 머리카락만
    g.h(HEAD_Y, CX - 2, CX + 2, '#4a3626');
    g.h(HEAD_Y - 1, CX - 2, CX + 2, '#3a2a1c');
  },
  bandana(g, s) {                                  // 두건 — 이마 띠 + 뒤로 묶은 꼬리
    g.h(HEAD_Y - 1, CX - 2, CX + 2, s.trim);
    g.h(HEAD_Y, CX - 2, CX + 2, s.trimD);
    g.px(CX - 3, HEAD_Y + 1, s.trim);
    g.px(CX - 4, HEAD_Y + 2, s.trimD);
  },
  morion(g) {                                      // 모리온 투구 — 볏 + 좌우로 뻗은 챙
    g.px(CX, HEAD_Y - 3, P.steelL);                // 볏
    g.h(HEAD_Y - 2, CX - 1, CX + 1, P.steelL);
    g.h(HEAD_Y - 1, CX - 2, CX + 2, P.steelM);
    g.h(HEAD_Y, CX - 4, CX + 4, P.steelD);         // 챙
    g.px(CX - 3, HEAD_Y - 1, P.steelM);
    g.px(CX + 3, HEAD_Y - 1, P.steelM);
  },
  tricorne(g) {                                    // 삼각모 — 넓고 검은 챙
    g.h(HEAD_Y - 2, CX - 1, CX + 1, '#3a2f38');
    g.h(HEAD_Y - 1, CX - 3, CX + 3, '#2a2028');
    g.h(HEAD_Y, CX - 4, CX + 4, '#2a2028');
    g.px(CX - 4, HEAD_Y - 1, '#3a2f38');
    g.px(CX + 4, HEAD_Y - 1, '#3a2f38');
  },
  hood(g, s) {                                     // 후드 — 뾰족한 정수리에 얼굴 옆을 덮는다
    g.px(CX, HEAD_Y - 3, s.cD);
    g.h(HEAD_Y - 2, CX - 1, CX + 1, s.cD);
    g.h(HEAD_Y - 1, CX - 2, CX + 2, s.cM);
    g.h(HEAD_Y, CX - 3, CX + 3, s.cM);
    g.v(CX - 3, HEAD_Y, HEAD_B, s.cD);
    g.v(CX + 3, HEAD_Y, HEAD_B, s.cD);
  },
  plumehat(g, s) {                                 // 깃털 모자 — 챙 + 위로 뻗은 깃
    g.h(HEAD_Y - 2, CX - 2, CX + 2, '#40334a');
    g.h(HEAD_Y - 1, CX - 4, CX + 4, '#2f2436');
    g.h(HEAD_Y, CX - 3, CX + 3, '#2f2436');
    g.px(CX + 2, HEAD_Y - 3, s.trim);              // 깃털
    g.px(CX + 3, HEAD_Y - 4, s.trim);
    g.px(CX + 4, HEAD_Y - 5, P.clothL);
  },
  turban(g, s) {                                   // 터번 — 부피로 읽힌다
    g.h(HEAD_Y - 3, CX - 1, CX + 1, P.clothL);
    g.h(HEAD_Y - 2, CX - 3, CX + 3, P.clothM);
    g.h(HEAD_Y - 1, CX - 3, CX + 3, P.clothM);
    g.h(HEAD_Y, CX - 3, CX + 3, P.clothD);
    g.px(CX + 3, HEAD_Y + 1, s.trim);              // 매듭
  },
  longhair(g) {                                    // 긴 머리 — 어깨까지 내려온다
    g.h(HEAD_Y - 1, CX - 2, CX + 2, '#4a2f1c');
    g.h(HEAD_Y, CX - 3, CX + 3, '#5c3a22');
    g.v(CX - 3, HEAD_Y, SHLD_Y + 1, '#5c3a22');
    g.v(CX + 3, HEAD_Y, SHLD_Y + 1, '#4a2f1c');
  },
};

/* ── 손에 든 것 ───────────────────────────────────────────────
   ★ 21px에서 병종을 가르는 **두 번째 축**. 길이와 각도만으로 읽히게 만든다.
     창은 머리 위로 곧게, 총은 비스듬히, 방패는 둥근 원반 — 셋이 절대 안 겹친다.
   ⚠️ 강철은 `steelL`·`ironL`처럼 **밝은 톤**으로 낸다. 어두운 톤은 아웃라인에 먹혀 사라진다. */
const WEAPONS = {
  cutlass(g) {                                     // 단검 — 짧고 위로 든다
    g.line(CX + 6, SHLD_Y + 5, CX + 8, SHLD_Y, P.steelL);
    g.px(CX + 6, SHLD_Y + 6, P.woodD);
  },
  scimitar(g) {                                    // 언월도 — 길고 휜 날
    g.line(CX + 6, SHLD_Y + 5, CX + 9, SHLD_Y - 1, P.steelL);
    g.px(CX + 10, SHLD_Y - 3, P.steelL);
    g.px(CX + 6, SHLD_Y + 6, P.goldM);
  },
  swordshield(g) {                                 // 검 + 둥근 방패(뒷손)
    g.ellipse(CX - 6, SHLD_Y + 4, 3, 3, P.woodM);
    g.ellipse(CX - 6, SHLD_Y + 4, 2, 2, P.woodL);
    g.px(CX - 6, SHLD_Y + 4, P.steelL);            // 방패 심
    g.line(CX + 6, SHLD_Y + 5, CX + 8, SHLD_Y, P.steelL);
  },
  pike(g) {                                        // 창 — 머리 위로 곧게 뻗는다(가장 잘 읽힌다)
    g.v(CX + 6, 3, SHLD_Y + 7, P.woodM);
    g.px(CX + 6, 1, P.steelL);
    g.px(CX + 6, 2, P.steelL);
    g.px(CX + 5, 3, P.steelD);
  },
  musket(g) {                                      // 총 — 어깨에 비스듬히 멘다
    g.line(CX + 2, SHLD_Y + 8, CX + 8, SHLD_Y - 2, P.ironL);
    g.line(CX + 3, SHLD_Y + 8, CX + 8, SHLD_Y - 1, P.ironM);
    g.px(CX + 8, SHLD_Y - 3, P.steelL);            // 총구
    g.px(CX + 2, SHLD_Y + 8, P.woodD);
    g.px(CX + 2, SHLD_Y + 7, P.woodM);
  },
  crossbow(g) {                                    // 석궁 — 가슴 앞의 가로 활
    g.h(SHLD_Y + 4, CX + 3, CX + 8, P.woodL);
    g.h(SHLD_Y + 5, CX + 4, CX + 7, P.woodD);
    g.v(CX + 6, SHLD_Y + 2, SHLD_Y + 6, P.woodM);
    g.px(CX + 8, SHLD_Y + 3, P.steelL);
  },
  torch(g) {                                       // 점화봉 — 끝에 불씨
    g.line(CX + 6, SHLD_Y + 6, CX + 7, SHLD_Y, P.woodM);
    g.px(CX + 7, SHLD_Y - 1, '#ffb347');
    g.px(CX + 7, SHLD_Y - 2, '#ffe08a');
  },
  ledger(g, s) {                                   // 장부 — 몸에 붙여 든다(떼면 허공의 막대가 된다)
    g.r(CX + 3, SHLD_Y + 4, 4, 3, P.clothL);
    g.h(SHLD_Y + 4, CX + 3, CX + 6, P.clothD);
    g.px(CX + 3, SHLD_Y + 5, s.trim);
  },
};

/* ── 갑옷 ─────────────────────────────────────────────────────
   21px에서는 무늬가 얼룩이 된다 — **가슴 한 줄**로만 낸다. */
const ARMOR = {
  none() {},
  cuirass(g, s, po) {                              // 흉갑 — 강철 가슴판
    const L = po.lean;
    g.r(CX - 3 + L, SHLD_Y + 1, 7, 4, P.steelM);
    g.h(SHLD_Y + 1, CX - 3 + L, CX + 3 + L, P.steelL);
    g.h(SHLD_Y + 4, CX - 3 + L, CX + 3 + L, P.steelD);
    void s;
  },
  bandolier(g, s, po) {                            // 탄띠 — 어깨에서 허리로 가로지른다
    const L = po.lean;
    g.line(CX - 3 + L, SHLD_Y + 1, CX + 3 + L, WAIST_Y - 2, P.woodL);
    g.px(CX - 1 + L, SHLD_Y + 2, P.goldM);
    g.px(CX + 1 + L, SHLD_Y + 3, P.goldM);
    void s;
  },
  buffcoat(g, s, po) {                             // 버프코트 — 밝은 옷깃
    const L = po.lean;
    g.h(SHLD_Y + 1, CX - 2 + L, CX + 2 + L, s.trim);
    g.px(CX - 3 + L, SHLD_Y + 1, s.trimD);
    g.px(CX + 3 + L, SHLD_Y + 1, s.trimD);
  },
};

/* ── 조립 ─────────────────────────────────────────────────────
   ⚠️ 그리는 순서가 곧 z축이다 — 뒤팔 → 다리 → 몸 → 갑옷 → 머리 → 머리장구 → 앞팔 → 무기.
      순서를 바꾸면 무기가 손 뒤로 들어간다(큰 그림에서 겪은 것과 같다). */
export function miniUnitSprite(unitKey, pose = 'idle', schemeOverride = null, faceKey = null) {
  const u = UNITS[unitKey];
  if (!u) throw new Error(`unknown unit: ${unitKey}`);
  const schemeKey = schemeOverride || u.scheme;
  const key = `charmini:${unitKey}:${pose}:${faceKey || schemeKey}`;
  return bake(key, MW, MH, (g, ctx) => {
    const s = SCHEMES[schemeKey];
    const sk = skinOf(s, faceKey);
    const po = poseOf(pose);
    drawBackArm(g, s, po);
    drawLegs(g, s);
    drawTorso(g, s, po);
    ARMOR[u.armor](g, s, po);
    drawHead(g, sk);
    HEADGEAR[u.head](g, s);
    drawFrontArm(g, s, sk, po);
    WEAPONS[u.weap](g, s);
    outline(ctx, MW, MH);
  });
}
