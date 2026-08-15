// app.js — 탭 셸
//
// 왼쪽 메뉴로 화면을 고른다. 각 탭의 계측은 무겁기 때문에 **처음 열 때 한 번만** 돌린다
// (경제 탭은 dash.js가 로드 시점에 스스로 돌린다).

import { runPirates, bindPirateControls, pirateStopPlay, pirateLoaded } from './pirate-view.js';
import { runWages, bindWageControls, wageLoaded } from './wage-view.js';

const tabs = [...document.querySelectorAll('#nav .tab')];
const grps = [...document.querySelectorAll('#nav .grp')];

function show(name) {
  for (const t of tabs) t.classList.toggle('on', t.dataset.tab === name);
  for (const g of grps) g.classList.toggle('on', g.dataset.tab === name);
  for (const p of document.querySelectorAll('.tabpage')) {
    p.classList.toggle('on', p.id === `tab-${name}`);
  }
  // 안 보이는 탭에서 애니메이션이 계속 도는 것을 막는다
  if (name !== 'pirate') pirateStopPlay();
  if (name === 'pirate' && !pirateLoaded()) runPirates();
  if (name === 'wage' && !wageLoaded()) runWages();
  location.hash = `#${name}`;
  scrollTo(0, 0);
}

for (const t of tabs) t.onclick = () => show(t.dataset.tab);

bindPirateControls();
bindWageControls();

// 새로고침해도 보던 탭으로 돌아온다
const start = location.hash.replace('#', '');
show(tabs.some((t) => t.dataset.tab === start) ? start : 'econ');
