// regions/eastasia/npc-pirates.js — 동아시아의 해적
//
// 상인을 노리고 돌아다닌다. 플레이어도 사냥감이다. 이들이 턴 짐은 목적지에 닿지 못해
// **그 항구에서 그 물건이 귀해진다**(`world.js: raids` → 시장 충격).
//
// ── 필드 ────────────────────────────────────────────────────
//   id, name, flag, ship, purse   무역상과 같다
//   base     소굴 항구 · hunt 즐겨 노리는 구간 키('a|b' 정렬형)
//   strength 1~5 · bounty [최소,최대] 현상금
//   circuit  순회로 · season 'summer'|'winter'|null · scope 'region'|'ocean'
//   blurb, lines { hail, spare }
//
// ★ circuit은 **인접 항로만 밟도록** 적었다. ★ world.js는 아직 이 필드들을 읽지 않는다.
//
// ── 이 바다의 배치 근거 ──────────────────────────────────────
// **아홉 바다 중 가장 위험한 권역이다.** 요율 10.5(계롱~월항)·10.0(히라도~쌍서)·9.5(닝보~쌍서)로
// 상위 세 구간이 전부 여기 있다. 그래서 이름 있는 해적도 가장 많고 두목도 가장 세다.
//
// ★ **이 바다에서 해적을 만든 것은 법이다.** 명의 해금(海禁)이 사적 해상무역을 통째로 불법으로
//   돌려놓았으므로, 밀무역선과 해적선은 같은 배였다. 왕직은 배 수백 척을 부린 상인이었고
//   동시에 가정왜구의 두목이었다 — 둘 중 하나가 아니라 둘 다였고, 그 사이를 가른 것이
//   그의 행동이 아니라 북경의 금령이었다. 이 사실을 blurb에 설명이 아니라 **장면으로** 담았다.
//
// ★ season 'summer'가 셋인 이유: 왜구의 습격은 남풍을 타고 왔다. 봄에서 여름 사이
//   3~5월(음력)에 절강·복건 연안이 쓸렸고, 일본행 배도 남서 계절풍에 올라탔다.
//   반대로 복건에서 루손으로 내려가는 길은 북동 계절풍(겨울)이라 림아퐁은 겨울에 나온다.
//   → **여름에는 중국 연안이, 겨울에는 루손 해협이 위험해진다.**
//
// ★ 무역상 담당과의 조율 필요: 왕직은 밀무역 상인이자 왜구 두목이다.
//   **여기 해적 쪽에 두었다.** 이 게임에서 그를 상인으로 두면 히라도~쌍서 요율 10.0을
//   설명할 자가 사라진다. 상인 쪽에는 그의 이름이 아니라 그 밑에서 짐을 나른
//   휘상(徽商) 상단을 두는 편이 겹치지 않는다.

export const PIRATES = [
  /* ── 동중국해 · 밀무역의 축 ─────────────────────────────────
     왕직(王直). 휘주 출신 상인으로 쌍서를 근거지로 삼았다가 1548년 주환이 그 섬을 돌로 메우자
     히라도로 옮겨 마쓰우라 다카노부 밑에 앉았다. 배 수백 척과 일꾼 2천을 부렸고,
     그가 다룬 물건이 생사·은·유황·초석·구리 동전·화승총이었다(권역 근거 JSON: hirado 항목).
     스스로 휘왕(徽王)이라 했다. 1557년 초무에 응해 뭍에 올랐다가 1559년 참수됐다.
     ★ 깃발이 'pirate'인 이유는 그가 흉포해서가 아니라 **그를 받아 줄 나라가 없어서**다.
       명은 그를 역적으로, 조공 체제는 그를 존재하지 않는 배로 취급했다. */
  {
    id: 'wangzhi', name: '왕직', flag: 'pirate', ship: 'fuchuan',
    base: 'hirado', purse: [5000, 15000], strength: 5, bounty: [5000, 12000],
    hunt: ['hirado|shuangyu', 'ningbo|shuangyu', 'fuzhou|ningbo', 'hakata|ningbo'],
    circuit: ['hirado', 'shuangyu', 'ningbo', 'shuangyu', 'hirado', 'nagasaki', 'hirado'],
    season: 'summer', scope: 'region',
    blurb: '배 수백 척을 부리는 상인이다. 그를 해적으로 만든 것은 그의 배가 아니라 북경의 금령이다.',
    lines: {
      hail: '“장사를 하러 왔다. 관이 문을 닫아 이 꼴이 됐을 뿐이다.”',
      spare: '“짐만 놓고 가라. 나는 상인이지 도살자가 아니다.”',
    },
  },
  /* 서해(徐海). 항저우의 승려였다가 왕직 밑을 거쳐 제 무리를 이끌었다. 1555~56년
     절강 연안을 쓴 대습격의 지휘자이고, 1556년 호종헌의 이간에 걸려 죽었다.
     쌍서는 이 권역의 prizeYard다 — 나포한 배를 뜯어 파는 자리에 앉혔다.
     세키부네를 태운 것은 그가 부린 무리의 절반이 일본에서 건너온 자들이었기 때문이다. */
  {
    id: 'xuhai', name: '서해', flag: 'pirate', ship: 'sekibune',
    base: 'shuangyu', purse: [2400, 7500], strength: 4, bounty: [2600, 5600],
    hunt: ['ningbo|shuangyu', 'fuzhou|ningbo', 'hakata|ningbo'],
    circuit: ['shuangyu', 'ningbo', 'fuzhou', 'ningbo', 'shuangyu'],
    season: 'summer', scope: 'region',
    blurb: '절에서 나와 배에 올랐다. 왕직이 값을 흥정할 때 이 자는 그냥 뭍으로 올라간다.',
    lines: { hail: '“염불은 그만뒀다. 이쪽이 셈이 빠르더군.”' },
  },

  /* ── 대만 해협 · 루손 ───────────────────────────────────────
     림아퐁(林鳳, Limahong). 광동 출신으로 복건 연안과 대만 해협을 근거로 삼았고,
     1574년 11월 배 62척에 병력을 싣고 마닐라를 쳤다. 스페인이 겨우 막아내자 팡가시난으로
     물러나 성채를 쌓았다가 이듬해 포위를 뚫고 사라졌다 — 죽었다는 기록이 없다.
     ★ season 'winter' — 복건에서 루손으로 내려가려면 북동 계절풍을 타야 한다.
       그가 마닐라를 친 것도 11월이다. 계롱은 이 권역의 prizeYard다. */
  {
    id: 'limahong', name: '림아퐁', flag: 'pirate', ship: 'fuchuan',
    base: 'keelung', purse: [2600, 8000], strength: 4, bounty: [2800, 6000],
    hunt: ['keelung|manila', 'keelung|yuegang', 'macau|manila', 'manila|quanzhou'],
    circuit: ['keelung', 'manila', 'keelung', 'yuegang', 'keelung', 'naha', 'keelung'],
    season: 'winter', scope: 'region',
    blurb: '배 예순두 척으로 마닐라를 쳤다가 사라졌다. 죽었다는 기록은 어디에도 없다.',
    lines: { hail: '“성벽 뒤로 숨어라. 지난번엔 그것도 못 했지 않나.”' },
  },
  /* 정지룡(鄭芝龍). 히라도에서 아들(정성공)을 얻고 대만 해협을 쥐었다가 1628년 명의 초무를
     받아 관군이 되었다 — 그러고도 하던 일을 바꾸지 않았다. 그의 깃발을 사지 않은 배는
     그 바다를 못 지났고, 그 통행세가 그의 함대를 먹였다.
     ★ 시대 주의: 그의 전성기는 1620~40년대라 게임 시대(15세기말~16세기)보다 뒤다.
       이 프로젝트는 연도를 고정하지 않으므로 그대로 두되 여기 적어 둔다.
     ★ 깃발이 'ming'인 것이 이 인물의 요점이다 — 해적이 관군이 되어도 하는 일은 같다는 것. */
  {
    id: 'zhengzhilong', name: '정지룡', flag: 'ming', ship: 'fuchuan',
    base: 'quanzhou', purse: [2600, 8500], strength: 4, bounty: [2800, 6200],
    hunt: ['quanzhou|yuegang', 'keelung|yuegang', 'guangzhou|yuegang', 'fuzhou|quanzhou'],
    circuit: ['quanzhou', 'yuegang', 'guangzhou', 'macau', 'guangzhou', 'yuegang', 'quanzhou', 'fuzhou', 'quanzhou'],
    season: null, scope: 'region',
    blurb: '통행증을 파는 해적이다. 관직을 받은 뒤에도 값만 올랐지 하는 일은 그대로다.',
    lines: {
      hail: '“내 깃발을 샀나. 안 샀으면 지금 사면 된다.”',
      spare: '“싸게 쳐줬다. 다음엔 취안저우에서 미리 사라.”',
    },
  },

  /* ── 대한해협 ───────────────────────────────────────────────
     삼도(쓰시마·이키·마쓰우라)의 왜구. 권역 근거 JSON이 부산포~하카타를 두고
     "왜관선의 길이자 삼도 왜구의 앞마당"이라 적고, 1510년 삼포왜란(배 100척·4~5천)과
     1419년 조선의 대마도 정벌(배 227척)을 근거로 든다. 큰 무리가 아니라 배 몇 척이
     상찌를 노리는 쪽이라 strength 2다. ★ 습격은 남풍이 부는 철에 왔다. */
  {
    id: 'sandowako', name: '삼도의 왜구', flag: 'pirate', ship: 'sekibune',
    base: 'hakata', purse: [420, 1600], strength: 2, bounty: [450, 1050],
    hunt: ['busanpo|hakata', 'busanpo|mapo', 'hakata|hirado'],
    circuit: ['hakata', 'busanpo', 'mapo', 'busanpo', 'hakata', 'hirado', 'hakata'],
    season: 'summer', scope: 'region',
    blurb: '섬 셋에서 나온다. 남풍이 불면 배를 띄우고, 바람이 돌면 어부로 돌아간다.',
    lines: { hail: '“쌀이냐 무명이냐. 사람은 안 데려간다 — 오늘은.”' },
  },
  /* ★ 초반 상대. 무라카미 수군(村上水軍)은 세토내해 길목을 쥐고 지나는 배에 통행세를 받고
     과소기(過所旗)를 내주었다. 권역 근거 JSON이 하카타~사카이를 두고 "내해지만 해적이 없지 않았다 —
     길목마다 수군이 통행세를 받았다"고 적어 요율을 내해가 아니라 연안값 위쪽에 둔 그 자리다.
     ★ 이 자는 **털지 않는다. 값을 받는다.** 요율 5.0짜리 내해에 두목을 앉힐 수 없으므로
       위협의 종류 자체를 바꿨다 — 그래서 strength 1이면서도 이 구간에 있을 이유가 성립한다. */
  {
    id: 'murakami', name: '무라카미 수군', flag: 'japan', ship: 'sekibune',
    base: 'sakai', purse: [180, 700], strength: 1, bounty: [200, 460],
    hunt: ['hakata|sakai', 'hakata|hirado'],
    circuit: ['sakai', 'hakata', 'sakai'],
    season: null, scope: 'region',
    blurb: '배를 털지 않는다. 지나가는 값을 받는다 — 안 내면 그때 턴다.',
    lines: {
      hail: '“과소기를 다시오. 없으면 여기서 끊어 드리리다.”',
      spare: '“다음 물목에서도 같은 걸 물을 거요. 깃발을 내걸어 두시오.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   **바르바리 코르세어와 프랑스 순찰 프리깃**이 나왔다.
   ★ 이 바다가 이것을 가장 절실히 필요로 했다. 요율 상위 세 구간(계롱~월항 10.5 ·
   히라도~쌍서 10.0 · 닝보~쌍서 9.5)이 전부 여기인데, 위 명부의 여섯은
   애써 적어 두고도 화면에 없는 사람이었다. 위험은 권역별인데 그 위험을
   채우는 얼굴이 전 세계 공용이었던 탓이다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '왜구 소선단', nation: '왜구', hull: 'galley', tint: 'oak', goods: ['grain', 'salt', 'tea'] },
  { name: '왜구 습격선', nation: '왜구', hull: 'galley', tint: 'dark', goods: ['silver', 'silk', 'tea'] },
  { name: '해상 세력 선단', nation: '해적', hull: 'carrack', tint: 'dark', goods: ['silk', 'porcelain', 'silver'] },
  { name: '명 수군 순찰선', nation: '명', hull: 'frigate', tint: 'white', goods: ['silk', 'porcelain', 'weapon'] },
  { name: '왜구 대선단', nation: '왜구', hull: 'galleon', tint: 'green', goods: ['silver', 'silk', 'gold'] },
];
