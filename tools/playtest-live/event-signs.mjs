// event-signs.mjs — 게임 로그 한 줄이 **어느 사건인가**를 가르는 표 (러너 공용)
//
// `state.log`에 남은 문장으로 사건을 되읽는다. 정본은 문장을 내보내는 쪽이다:
//   `js/scenes/map.js: resolveEvent` (해상·육로 사건) · `js/scenes/battle.js` (전투 결말)
//   `js/state.js: rollShockEvents` (시장 충격) · `js/payday.js` (급여 정산)
//   `js/world.js` → 입항 시 `[소문]`으로 흘러드는 세계의 사건
// **저쪽 문장을 고치면 여기도 고친다.** 안 고치면 사건이 났는데도 "안 났다"고 적힌다.
//
// ★ 세 번 데었다. ① `pushLog`가 unshift라 새 줄을 못 읽었고, ② `/급여/` 하나로 잡았더니
//   시작 로그가 매번 걸렸고, ③ 표를 다시 쓰면서 `shock_raid` 줄을 통째로 빠뜨렸다 —
//   그동안 화면에는 "…에게 털렸다"가 멀쩡히 뜨고 있었는데 결과는 "한 번도 안 났다"였다.

export const EVENT_SIGN = [
  // ── 항해의 끝 ──
  ['arrive',   /일 항해 끝에 .*입항했다/],

  // ── 해상 사건 (map.js: resolveEvent) ──
  ['wind',     /순풍|길이 말라 있었다/],
  ['storm',    /폭풍우|모래폭풍|폭풍에 짐을 버렸다|파도에 휩쓸렸다|대열이 흩어졌다/],
  ['drift',    /난파선 잔해|길가에 버려진 짐/],
  ['merchant', /돛 하나가 지나갔다|대열과 스쳤다|에게서 .*개를 샀다|덮치기로 했다/],
  ['deal',     /에게서 .*개를 샀다/],           // 상선을 만나 **실제로 거래**한 것만
  ['pirate',   /항로를 막아섰다/],

  // ── 뭍의 사건 (육로·내해 구간에서만) ──
  ['bandit',   /강도를 만나|강도를 만났으나/],
  ['toll',     /통행세로/],

  // ── 전투의 결말 (battle.js) ──
  ['flee',     /따돌리고 항로로 돌아왔다|갈고리를 끊고|빠져나왔다/],
  ['battle',   /갑판에서 맞붙었다|나포해 선단에|해체해 자재로 팔았다|배를 내주었다|격침|노획/],

  // ── 시장 충격 (state.js: rollShockEvents · world.js: raids) ──
  ['shock_famine',   /흉년이 들었다/],
  ['shock_blockade', /들어가는 길이 끊겼다/],
  ['shock_glut',     /자루가 쌓였다/],
  ['shock_raid',     /털렸다|나포되었다|약탈당했다/],
  ['news',     /^\[소문\]/],

  // ── 살림 ──
  ['payday',   /급여 .*치렀다|급여를 다 치르지|이탈했다|체불/],
  ['leak',     /물이 새어 .*삭았다/],
  ['jettison', /짐을 던졌다|바다에 버렸다|짐을 버렸다/],
  ['insurance',/적하보험이|보험금/],
  ['contract', /납품 기한을 넘겨|주문을 맡았다|납품했다/],
];

export const classify = (line) => EVENT_SIGN.filter(([, re]) => re.test(line)).map(([id]) => id);

/** 리포트에서 쓰는 나열 순서 */
export const EV_ORDER = [
  'wind', 'storm', 'drift', 'merchant', 'deal', 'pirate', 'battle', 'flee',
  'bandit', 'toll', 'shock_famine', 'shock_blockade', 'shock_glut', 'shock_raid',
  'leak', 'jettison', 'insurance', 'payday', 'contract',
];
