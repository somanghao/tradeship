// regions/indian/npc-pirates.js — 인도양의 해적
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
// ★ **이 권역이 이 게임에서 "해적이 누구인가"가 가장 갈리는 바다다.**
//   같은 배를 두고 캘리컷은 제독이라 부르고 고아는 해적이라 적는다. 그 어긋남을 지우지 않고
//   양쪽을 다 해적 목록에 올렸다 — 마라카르도, 그를 잡으러 다니는 포르투갈 함대도.
//   플레이어에게는 둘 다 항로에서 만나는 위험이고, 그것이 이 바다의 진실에 가깝다.
//
// 요율이 말하는 자리를 그대로 따랐다.
//   9.0 캘리컷~코친 · 8.5 캘리컷~고아 · 7.0 캘리컷~칸나노레  → 마라카르와 포르투갈 함대
//   10.0 치타공~마술리파트남 · 9.0 치타공~사트가온           → 벵골 삼각주의 아라칸·포르투갈 사략
//   6.0 캄바이~디우                                          → 카티아와르의 상가니안
//   9.5 콜롬보~몰디브 · 9.0 코친~몰디브                      → 환초. 여기 위험은 사람이 아니라 산호다
//
// ★ **계절이 이 바다를 통째로 여닫는다.** 남서 계절풍(6~9월)이 몰아치면 말라바르 해안은
//   항구까지 닫힌다 — 배가 아예 안 뜬다. 그래서 이 권역의 이름 있는 해적은 **겨울에 나온다.**
//   지중해·홍해가 여름 바다인 것과 정확히 반대다. 플레이어가 달력을 보게 만드는 장치가 이것이다.

export const PIRATES = [
  /* ── 말라바르 ───────────────────────────────────────────────
     ★ 쿤할리 마라카르 — 사용자가 지목한 "관점이 갈리는 인물"이다.
       사무티리(캘리컷 왕)가 임명한 세습 제독이고, 1520년부터 1600년까지 4대에 걸쳐
       포르투갈 배를 노렸다. 무퉁갈·바다카라·참발·카니야람코투 네 포구에서 갤리를 지어 나왔고,
       1525년에는 코친을 습격해 포르투갈 배를 태우고 캘리컷의 포르투갈 요새를 포격했다.
       4대 무함마드 알리는 1600년 포르투갈·사무티리 연합군에 요새가 함락되며 끝났다 —
       그를 넘긴 것이 포르투갈이 아니라 그를 세운 사무티리였다는 것이 이 이야기의 마지막이다.
     ★ 그래서 깃발이 'pirate'가 아니라 'zamorin'이다. 이 배는 나라의 배다.
       blurb 한 줄에 두 관점을 다 담았다 — "제독이자 해적"이라고 설명하는 대신,
       **누가 그를 뭐라 부르는지**를 적었다. 그것이 관점의 갈림을 보여주는 방식이다. */
  {
    id: 'kunhalimarakkar', name: '쿤할리 마라카르', flag: 'zamorin', ship: 'galbat',
    base: 'calicut', purse: [4000, 13000], strength: 5, bounty: [4800, 11000],
    hunt: ['calicut|cochin', 'calicut|goa', 'calicut|cannanore', 'cochin|quilon'],
    circuit: ['calicut', 'cannanore', 'bhatkal', 'goa', 'calicut', 'cochin', 'quilon', 'cochin', 'calicut'],
    // 남서 계절풍이 부는 넉 달은 말라바르 해안 자체가 닫힌다. 갤리는 뭍에 올라가 있다.
    season: 'winter', scope: 'region',
    blurb: '사무티리의 제독이다. 고아의 장부에만 해적이라 적혀 있다.',
    lines: {
      hail: '“카르타즈를 보자. ……포르투갈 것 말고, 사무티리의 것 말이다.”',
      spare: '“가라. 우리가 쫓는 건 짐이 아니라 저들의 깃발이다.”',
    },
  },
  /* 포르투갈 북방 함대. 카르타즈(통행증)를 안 산 배를 세워 나포하던 순찰 함대다.
     ★ 이쪽도 해적 목록에 올린 이유: 종이 한 장 없다고 남의 화물을 가져가는 일은
       그 배를 세운 쪽에서 보면 약탈과 구분되지 않는다. 잡히면 잃는 것도 똑같다.
     strength 3 — 함대가 아니라 순찰대다. 두목은 이 바다에 마라카르 하나면 족하다. */
  {
    id: 'cartazarmada', name: '고아의 임검 함대', flag: 'portugal', ship: 'caravel',
    base: 'goa', purse: [1200, 4000], strength: 3, bounty: [1100, 2600],
    hunt: ['calicut|goa', 'dabhol|goa', 'bhatkal|goa', 'cambay|diu'],
    // 북쪽 해안을 한 방향으로 훑고 되짚어 내려온다.
    circuit: ['goa', 'dabhol', 'chaul', 'surat', 'diu', 'cambay'],
    season: null, scope: 'region',
    blurb: '통행증을 안 산 배는 화물이 아니라 나포물이다. 이 바다에서 해적을 정하는 건 종이 한 장이다.',
    lines: {
      hail: '“카르타즈를 내시오. 없으면 배와 짐이 다 국왕의 것이 되오.”',
      spare: '“다음엔 고아에서 사시오. 값이 이보다 쌉니다.”',
    },
  },

  /* ── 벵골 삼각주 ────────────────────────────────────────────
     세바스티앙 곤살베스 티바우. 포르투갈 병졸로 벵골에 흘러들어 산드윕 섬을 차지하고
     아라칸 왕과 붙었다 갈라졌다 하며 삼각주를 털었다. 무굴 기록의 '하르마드(아르마다)'와
     '페링기(프랑크)'가 이 무리다. 노예사냥까지 했다.
     ★ 시대 주의: 그의 전성기는 1609~1616년이라 게임 시대(15세기말~16세기)보다 조금 뒤다.
       이 프로젝트는 연도를 고정하지 않으므로(evidence-meta: era) 그대로 두되 여기 적어 둔다.
       권역 근거 JSON도 아라칸·포르투갈 사략을 "16세기 말부터"로 잡았다.
     ★ season 'winter' — 우기(6~9월)에는 삼각주 물길이 불어 배를 댈 데가 없고 사이클론이 온다.
       털러 나가는 철은 물이 빠지는 건기다. */
  {
    id: 'tibau', name: '세바스티앙 곤살베스 티바우', flag: 'pirate', ship: 'kotia',
    base: 'chittagong', purse: [2200, 7000], strength: 4, bounty: [2400, 5200],
    hunt: ['chittagong|satgaon', 'chittagong|masulipatnam', 'masulipatnam|satgaon'],
    circuit: ['chittagong', 'satgaon', 'chittagong', 'masulipatnam', 'pulicat', 'masulipatnam', 'chittagong'],
    season: 'winter', scope: 'region',
    blurb: '어느 왕도 섬기지 않고 모든 왕과 거래한다. 삼각주에서는 그의 배가 곧 국경이다.',
    lines: { hail: '“여기 무굴의 법은 안 온다. 물길을 아는 자가 법이다.”' },
  },

  /* ── 구자라트 ───────────────────────────────────────────────
     상가니안. 카티아와르·쿠치 연안에 서식하던 사략 집단으로, 캄바트 만을 드나드는 배를 노렸다.
     권역 근거 JSON이 캄바이~디우를 두고 "카티아와르 연안은 사략이 서식하던 곳"이라 적은 그 자리다.
     만이 얕고 조수가 10m 넘게 오르내려 큰 배가 물길에 갇히는데, 그 자리를 이들이 안다. */
  {
    id: 'sanganian', name: '상가니안', flag: 'gujarat', ship: 'pattamar',
    base: 'cambay', purse: [420, 1500], strength: 2, bounty: [450, 1000],
    hunt: ['cambay|diu', 'cambay|surat', 'diu|surat', 'chaul|surat'],
    circuit: ['cambay', 'diu', 'surat', 'cambay'],
    season: null, scope: 'region',
    blurb: '조수를 읽는다. 물이 빠져 배가 갯벌에 앉는 시각에 맞춰 나온다.',
    lines: { hail: '“물때를 잘못 골랐구나.”' },
  },

  /* ── 몰디브 ─────────────────────────────────────────────────
     ★ 초반 상대이자, 요율을 정직하게 읽은 결과다.
       콜롬보~몰디브 9.5·코친~몰디브 9.0은 사략 때문이 아니라 **좌초** 때문이다
       (권역 근거 JSON: "사략보다 좌초가 무서운 항로다"). 그래서 여기 두는 자는
       배를 쫓는 자가 아니라 **걸린 배를 기다리는 자**여야 한다. 그것이 요율과 어긋나지 않는 유일한 배치다.
     야트라는 돛 하나짜리 작은 배다(hp 62·포 1문). 낡은 바사로도 이긴다. */
  {
    id: 'atollwreckers', name: '환초의 난파선 약탈꾼', flag: 'pirate', ship: 'yathra',
    base: 'maldives', purse: [150, 600], strength: 1, bounty: [180, 420],
    hunt: ['cochin|maldives', 'colombo|maldives', 'maldives|quilon'],
    circuit: ['maldives', 'colombo', 'maldives', 'cochin', 'maldives', 'quilon', 'maldives'],
    season: null, scope: 'region',
    blurb: '쫓아오지 않는다. 산호에 걸릴 때까지 기다렸다가 다가온다.',
    lines: {
      hail: '“여울을 잘못 짚었소. 도와는 드리리다 — 값은 받고.”',
      spare: '“가시오. 어차피 저 물목에서 또 걸릴 거요.”',
    },
  },
];


/* ── 이 바다의 이름 없는 적 ────────────────────────────
   위의 명부는 **이름을 가진 자들**이고, 이것은 그 밖의 흔한 조우다.
   전에는 이 자리가 전 세계 공용(`data.js: ENEMIES` 다섯)이라
   말라바르 해안에서도 바르바리 배가 나왔다. 여기는 쿤할리 마라칼의 바다이고,
   그 반대편에는 카르타스를 강요하는 포르투갈 함대가 있었다.
   세기·병력·전리품 금액은 그 등급을 그대로 쓰고 **얼굴만** 이 바다 것으로
   갈아 끼운다 — 밸런스를 흔들지 않으면서 "여기가 어느 바다인가"를 되찾는 방법이다. */
export const FOES = [
  { name: '말라바르 잡배', nation: '해적', hull: 'galley', tint: 'oak', goods: ['pepper', 'grain', 'salt'] },
  { name: '마라칼 습격선', nation: '말라바르', hull: 'galley', tint: 'dark', goods: ['pepper', 'spice', 'ginger'] },
  { name: '구자라트 사략선', nation: '구자라트', hull: 'carrack', tint: 'oak', goods: ['calico', 'indigo', 'pepper'] },
  { name: '포르투갈 순찰 함대', nation: '포르투갈', hull: 'frigate', tint: 'white', goods: ['pepper', 'calico', 'gold'] },
  { name: '포르투갈 인도 함대 기함', nation: '포르투갈', hull: 'galleon', tint: 'white', goods: ['gold', 'pepper', 'silk'] },
];
