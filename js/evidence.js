// evidence.js — 근거 계층을 게임 화면이 읽는 자리
//
// `content/city-evidence.json`은 원래 **개발용 정본**이다(검증은 tools/check-evidence.mjs).
// 그런데 항구 시장 목록을 "무엇이 진짜 특산인가" 순으로 쌓으려면 게임도 그것을 알아야 한다.
// 교역 항목이 많다고 좋은 항구가 아니다 — 사료로 확인된 수요 하나가 구색으로 넣은
// 다섯 줄보다 그 항구를 더 잘 설명하고, 플레이어가 먼저 봐야 하는 것도 그쪽이다.
//
// ★ 없어도 게임은 돈다. `assets.js`와 같은 원칙 — 못 읽으면 조용히 원래 순서로 돌아간다.
//   근거 파일이 게임 실행의 선행조건이 되면, 도시·품목을 늘릴 때 그것이 걸림돌이 된다.

let EV = null;

/** 신뢰 등급 — 낮을수록 위에 온다.
      0 확실한 수요 : 그 도시가 **사들이던 것**이 사료로 확인된다. 항구의 성격은 수요가 정한다.
      1 확실한 산지 : 특산이 사료로 확인된다. 값이 싼 이유가 여기 있다.
      2 그 밖       : 근거가 개연 수준이거나 게임이 성립하도록 넣은 것. 지우자는 뜻이 아니라
                     **읽는 순서에서 뒤로 밀자**는 뜻이다.
      3 교역 대상 아님 : 이 항구에서는 산지도 수요지도 아닌 품목. 맨 아래.
    `tools/check-evidence.mjs`가 '판정만 있고 출처 없음'을 실패로 잡는 것과 같은 기준이다. */
export function goodRank(cityId, goodId, side) {
  if (!side) return 3;
  const e = EV?.cities?.[cityId]?.goods?.[goodId];
  const solid = ['confirmed', 'corrected'].includes(e?.verdict) && e?.sources?.length > 0;
  if (!solid) return 2;
  return side === 'demand' ? 0 : 1;
}

/** 그 항목의 근거 한 줄 (툴팁용). 없으면 null. */
export function goodBasis(cityId, goodId) {
  const e = EV?.cities?.[cityId]?.goods?.[goodId];
  if (!e?.basis) return null;
  return {
    basis: e.basis.replace(/\*\*(.+?)\*\*/g, '$1'),
    verdict: e.verdict,
    sources: (e.sources || []).map((s) => s.title),
  };
}

export function evidenceLoaded() { return !!EV; }

/** 근거를 읽어 둔다. 실패는 전부 삼킨다 — 없으면 원래 순서로 돈다. */
export async function loadEvidence(url = 'content/city-evidence.json') {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    EV = await res.json();
    return EV;
  } catch {
    return null;
  }
}
