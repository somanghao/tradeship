// region-filter.js — 대시보드 전 탭이 공유하는 권역 필터 (렌더 계열 · DOM을 쓴다)
//
// 세계가 일곱 바다로 갈리면서 어느 탭이든 같은 질문을 받게 됐다 — **어느 바다 이야기인가.**
// 탭마다 따로 만들면 탭을 옮길 때 선택이 풀리고, 같은 화면에서 두 탭이 다른 바다를
// 보고 있는 일이 생긴다. 그래서 선택은 **한 곳에만** 두고 탭들이 구독한다.
//
// `js/regions/index.js`를 그대로 읽는다 — 대시보드는 게임 모듈을 다시 구현하지 않는다는
// 이 폴더의 규약이 여기에도 적용된다. 권역을 추가하면 이 바는 저절로 늘어난다.

import { REGIONS, REGION_BY_ID } from '../js/regions/index.js';

/** 'all'이면 전 권역. 그 밖에는 권역 id */
let current = 'all';
const subs = new Set();

export const ALL = 'all';
export const regionList = () => REGIONS.slice().sort((a, b) => a.order - b.order);
export const currentRegion = () => current;
export const regionName = (rid) => (rid === ALL ? '전 권역' : REGION_BY_ID[rid]?.name ?? rid);

/** 선택이 바뀌면 부른다. 반환값은 구독 해제 함수. */
export function onRegionChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function setRegion(rid) {
  if (current === rid) return;
  current = rid;
  for (const fn of subs) fn(rid);
}

/** 그 권역에 속하는가 — `all`이면 전부 통과 */
export const inRegion = (rid) => current === ALL || rid === current;

/** 도시 목록을 지금 선택으로 거른다. `region` 필드가 있는 것이면 무엇이든 받는다. */
export const filterByRegion = (list) => list.filter((x) => inRegion(x.region));

/**
 * 권역 선택 바를 만들어 넣는다.
 * @param host   붙일 DOM 요소 (보통 각 탭 맨 위)
 * @param opts   { all: true } 면 '전 권역' 단추를 함께 낸다
 *
 * ★ 탭마다 이 바를 하나씩 두되 **상태는 공유한다.** 탭을 옮겨도 보고 있던 바다가
 *   그대로인 것이 자연스럽고, 탭마다 다른 바다를 보고 있으면 비교가 거짓이 된다.
 */
export function mountRegionBar(host, opts = {}) {
  /* `countOf` — 칩에 붙일 숫자를 탭이 정한다. 기본은 그 바다의 항구 수인데,
     탭마다 세고 싶은 것이 다르다(선박 탭이면 선종 수). 기본값만 두면
     선박 탭에서 "지중해 28"이 28척으로 읽혀 거짓을 말한다. */
  const { all = true, countOf = (r) => r.mod.geo.CITIES?.length ?? 0 } = opts;
  if (!host) return;
  host.classList.add('regionbar');
  host.innerHTML = '';

  const mk = (rid, label, count) => {
    const b = document.createElement('button');
    b.className = 'rgb' + (current === rid ? ' on' : '');
    b.dataset.rid = rid;
    b.innerHTML = `${label}${count != null ? ` <span class="n">${count}</span>` : ''}`;
    b.onclick = () => setRegion(rid);
    return b;
  };

  if (all) host.appendChild(mk(ALL, '전 권역'));
  for (const r of regionList()) {
    // 아직 도시가 없는 권역도 보여준다 — 없다는 사실 자체가 정보다(누가 아직 안 채웠나)
    const n = countOf(r);
    const b = mk(r.id, r.name, n);
    if (!n) b.classList.add('empty');
    host.appendChild(b);
  }

  // 다른 탭에서 선택이 바뀌어도 이 바가 따라간다
  onRegionChange(() => {
    for (const b of host.querySelectorAll('.rgb')) {
      b.classList.toggle('on', b.dataset.rid === current);
    }
  });
}

/** 스타일 — 대시보드 index.html에 한 번만 심는다 */
export function injectRegionBarStyle() {
  if (document.getElementById('regionbar-style')) return;
  const s = document.createElement('style');
  s.id = 'regionbar-style';
  s.textContent = `
  .regionbar { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 12px; }
  .regionbar .rgb {
    background:#1d1a26; border:1px solid #2e2839; color:#8b8394;
    font:inherit; font-size:12px; padding:5px 11px; border-radius:4px; cursor:pointer;
  }
  .regionbar .rgb:hover { color:#ded2b8; border-color:#3b3348; }
  .regionbar .rgb.on { background:#241f31; border-color:#f4dd86; color:#f4dd86; font-weight:600; }
  .regionbar .rgb.empty { opacity:.45; }
  .regionbar .rgb .n { color:#6f6880; font-size:10.5px; margin-left:3px; }
  .regionbar .rgb.on .n { color:#b8a86a; }`;
  document.head.appendChild(s);
}
