// npc/houses-euro.js — 지중해·대서양·아프리카의 상단(商團)
//
// 이 파일은 세 바다를 맡는다. 자료 구조와 규약은 `.playtest/round-25/NPC-DESIGN.md` §2-1이 정본이다.
// ★ **세력(FACTIONS, `js/data.js`)과 겹치지 않게 골랐다.** 산 조르조 은행·푸거 상사·베네치아 원로원·
//   한자동맹·카사 데 콘트라타시온·에스타두 다 인디아는 이미 `FACTIONS`에 정치체로 있다
//   (`sangiorgio`·`fugger`·`venezia`·`hanse`·`casa`·`estado`). 여기 상단은 그 옆에서 도는
//   **자본**이지 그 정치체 자체가 아니다 — 그래서 같은 이름의 큰 배후 세력 대신, 그 세력의
//   그늘에서 실제로 배를 굴리던 **가문·개인·조합**을 골랐다(예: 푸거 대신 그 경쟁사 벨저,
//   산 조르조 대신 타바르카 산호 이권을 쥔 로멜리니 가문, 한자동맹 대신 그 안의 한 상인 가문).
//
// ── 지중해 ──────────────────────────────────────────────────────
// 베네치아·제노바의 파트리치(도리아)와 카탈루냐 상인조합, 몰타 기사단의 나포시장,
// 튀니스 하프스 궁정 — 국가가 짠 무다(муда) 바깥에서 **제 장부로** 도는 자본을 모았다.
//
// ── 대서양 ──────────────────────────────────────────────────────
// 리스본으로 모인 유럽 자본(벨저·마르치오니·멘데스가)과 안트베르펜 시장, 잉글랜드 두 회사
// (머천트 어드벤처러스·머스코비), 발트를 오간 한자 상인 가문(베킨후젠) — 향신료·모직물·
// 발트 원자재의 큰 삼각을 이 여섯이 나눠 쥔다.
//
// ── 아프리카 ────────────────────────────────────────────────────
// 포르투갈 왕실이 계약으로 넘긴 두 항로(아르갱·미나)와, 왕실 손이 안 닿는 랑사두,
// 그리고 포르투갈이 오기 전부터 이 바다를 쥐고 있던 두 동안 세력(킬와의 금 중개상·
// 구자라트 반야니 상인)을 나란히 두었다 — **정복이 아니라 대체**였다는 것이 이 다섯의 모양이다.
//
// ── 자본(capital) 환산 ────────────────────────────────────────────
// 이 저장소의 기준축(선원 연봉 ≈ 1,100닢·곡물 1단위 ≈ 12닢)을 그대로 쓴다.
// 굴덴·두카트 1개 ≈ 그 시대 숙련공 반달치 임금 ≈ 44닢로 통일 환산했다(근거·계산은
// `.playtest/round-25/houses-euro-evidence.json`의 `conversion`에 있다).
// 사료가 없는 곳은 **동급 상단과의 상대 서열**로 추정했다 — 그 표시가 `verdict: "gameplay"`다.

export const HOUSES_EURO = [
  /* ══ 지중해 ══════════════════════════════════════════════════ */

  /* ── 왕에게 돈을 대는 자본 ──────────────────────────────────
     그리말디. 제노바 은행가문이다. 스페인 왕실에 **아시엔토**(대부 계약)로 돈을 대고
     아메리카에서 올라오는 은으로 돌려받았다 — 이 바다의 자본이 대서양 은에 물려 있던
     실제 모양이 이것이고, 그래서 이들의 자리는 제노바와 세비야에 걸쳐 있다.
     ★ **세력과 안 겹친다** — 산 조르조 은행은 `FACTIONS`에 정치체로 있고(이 파일 머리주석의
       그 규약), 그리말디는 그 옆에서 **제 장부로 도는 자본**이다.
     ★ 이 바다의 천장이 `rank 4` 둘(프리울리 8M · 도리아 6M)이라 그 위가 비어 있었다 —
       아홉 바다 중 상인왕이 없던 넷 가운데 하나다. */
  {
    id: 'grimaldi', name: '그리말디 가문', region: 'mediterranean', flag: 'genoa',
    seats: ['genova', 'sevilla', 'napoli', 'palermo'],
    goods: ['silver', 'wool', 'grain', 'silk'],
    capital: 11000000, fleet: 3, reach: 'ocean', temper: 0.25, season: null, rank: 5,
    blurb: '배보다 장부가 큰 집안이다. 왕에게 돈을 대고 은으로 돌려받는다.',
    lines: {
      greet: '“그리말디요. 우리가 파는 것은 짐이 아니라 시간이오.”',
      press: '“당신이 흔든 값은 우리 이자에 얹히오. 그 계산은 세비야에서 끝나오.”',
      deal: '“현물은 관심 없소. 어음이라면 이야기가 되오.”',
      offer: '“대금을 뒤로 미뤄 드리리다. 대신 값은 우리가 부르오.”',
      help: '“제노바 배는 어디서든 서로를 알아보오. 뒤를 따르시오.”',
    },
  },
  {
    // 리알토의 파트리치 가문. 베네치아 원로원(세력 `venezia`)이 무다의 달력을 짜는 동안,
    // 이런 가문들은 그 갤리 자리를 낙찰받아 **제 돈을 실었다** — 국가와 개인 자본이 같은
    // 배에 다른 주머니로 타는 것이 이 도시의 실제 모양이었다.
    id: 'priuli', name: '프리울리 상관', region: 'mediterranean', flag: 'venice',
    seats: ['venezia', 'rodos', 'alexandria', 'candia'],
    goods: ['spice', 'silk', 'glass', 'grain'],
    capital: 8000000, fleet: 4, reach: 'region', temper: 0.35, season: null, rank: 4,
    blurb: '리알토의 오랜 파트리치. 원로원의 달력을 타되 장부는 제 것으로 잰다.',
    lines: {
      greet: '“프리울리의 배요. 무다와 같은 바람을 타지만 셈은 따로 하오.”',
      press: '“당신이 부린 값이 우리 창고를 건드렸소. 물러서시오.”',
      offer: '“도리아가 요새 이 항로에 자주 뜨더군. 눈치를 좀 채워 드리리다.”',
      help: '“이 신용장을 쓰시오. 리알토에서는 통하오.”',
    },
  },
  {
    // 제노바의 오래된 해군-상업 가문. 안드레아 도리아가 실제로 그랬듯 이 집안의 배는
    // 화물뿐 아니라 **함대**였다 — 카를 5세를 섬긴 뒤로는 에스파냐 쪽 항구에도 자리를 텄다.
    id: 'doria', name: '도리아 가문 선단', region: 'mediterranean', flag: 'genoa',
    seats: ['genova', 'napoli', 'marseille', 'lisboa'],
    goods: ['coral', 'wine', 'weapon', 'silk'],
    capital: 6000000, fleet: 4, reach: 'ocean', temper: 0.45, season: null, rank: 4,
    blurb: '제노바의 해군 가문. 화물칸보다 포갑판을 먼저 채운다.',
    lines: {
      greet: '“도리아의 깃발이오. 황제의 바다에서 길을 막을 배가 몇이나 되겠소.”',
      press: '“이 항로는 우리 함대가 지키오. 통행료를 잊으셨소.”',
      offer: '“프리울리가 알렉산드리아 물목을 혼자 먹고 있소. 손 좀 봐 주시오.”',
      help: '“우리 배와 나란히 가시오. 이 해역 해적은 우리 깃발을 보면 물러나오.”',
    },
  },
  {
    // 국가가 아니라 **조합**이다. 콘솔라트 데 마르는 바르셀로나에서 나서 발렌시아·마요르카까지
    // 아라곤 왕관 항구 전체의 해상법을 쥐었다 — 그 조합이 짐도 실었다고 본다.
    id: 'consolatdemar', name: '콘솔라트 데 마르 상단', region: 'mediterranean', flag: 'spain',
    seats: ['barcelona', 'valencia', 'mallorca'],
    goods: ['weapon', 'silk', 'wool', 'salt'],
    capital: 4000000, fleet: 3, reach: 'region', temper: 0.25, season: null, rank: 3,
    blurb: '아라곤 왕관 항구들의 상인 조합. 법정과 장부를 같이 쥐고 있다.',
    lines: {
      greet: '“콘솔라트의 배요. 이 해역의 해상법은 우리가 정하오.”',
      press: '“당신 거래가 조합 관행에 어긋나오. 벌금이 붙소.”',
      offer: '“도리아의 함대가 지나치게 컸소. 그 값을 좀 깎아 드리리다.”',
      help: '“분쟁이면 우리 법정으로 오시오. 원가는 다치지 않게 해 드리오.”',
    },
  },
  {
    // 몰타의 부두는 나포선이 매물로 서는 자리다(`mediterranean/trade.js: malta`).
    // 기사단은 신앙 기사이자 코르세어 사냥꾼이었고, 나포품 장사가 곧 이 집의 다른 절반이었다.
    id: 'hospitallerprize', name: '몰타 기사단 나포시장', region: 'mediterranean', flag: 'hospitaller',
    seats: ['malta', 'messina', 'napoli'],
    goods: ['salt', 'grain', 'weapon', 'silk'],
    capital: 3500000, fleet: 3, reach: 'region', temper: 0.55, season: null, rank: 3,
    blurb: '나포선이 매물로 서는 부두. 신앙과 장부가 한 배에 탄다.',
    lines: {
      greet: '“기사단의 배요. 오스만의 짐이라면 값을 두 번 묻지 않소.”',
      press: '“그 짐, 출처를 밝히시오. 대답이 늦으면 우리 것이 되오.”',
      offer: '“하프스 궁정이 튀니스 금을 혼자 삼키고 있소. 한 척 붙여 드리리다.”',
      help: '“우리 호위선이 이 항로에 있소. 코르세어는 우리 깃발을 피하오.”',
    },
  },
  {
    // 지어낸 사람이 아니다 — 로멜리니가는 실제로 타바르카 섬의 산호 채취권을 두 세기 가까이
    // 쥐었다. 튀니스·알제 앞바다에서 캐 제노바로 실어 나른, **한 가문이 통째로 쥔 광산**이다.
    id: 'lomellini', name: '로멜리니 산호상단', region: 'mediterranean', flag: 'genoa',
    seats: ['genova', 'tunis', 'algiers'],
    goods: ['coral', 'grain', 'salt', 'wine'],
    capital: 2200000, fleet: 2, reach: 'region', temper: 0.2, season: null, rank: 2,
    blurb: '타바르카 섬의 산호밭을 통째로 쥔 집안. 바다 밑까지 제 것이라 여긴다.',
    lines: {
      greet: '“타바르카의 산호요. 이 붉은 가지는 대대로 우리 것이었소.”',
      press: '“우리 채취권 안에서 그물을 던졌소? 값을 물어야겠소.”',
      offer: '“콘솔라트가 우리 소금값을 흔들고 있소. 그쪽 창고를 좀 채워 주시오.”',
      help: '“산호를 값싸게 넘기리다. 대신 우리 배가 무사히 지나가게 해 주시오.”',
    },
  },
  {
    // 하프스 왕조 궁정이 사하라 대상로의 종착지(튀니스)를 쥐고 있었다. 이 상단은 그 궁정이
    // 면허를 준 상인들 — 금과 상아가 이들의 손을 거쳐야 배에 올랐다.
    id: 'hafsidcourt', name: '하프스 궁정상단', region: 'mediterranean', flag: 'hafsid',
    seats: ['tunis', 'algiers', 'palermo'],
    goods: ['gold', 'ivory', 'oliveoil', 'weapon'],
    capital: 1800000, fleet: 2, reach: 'region', temper: 0.3, season: null, rank: 2,
    blurb: '하프스 궁정의 면허상. 사하라를 건너온 금이 이들 손을 거쳐야 배에 오른다.',
    lines: {
      greet: '“술탄의 면허요. 이 금은 사막을 건너온 것이오.”',
      press: '“면허 없는 배가 우리 물목에서 흥정하고 있소. 곤란하오.”',
      offer: '“기사단이 우리 배를 노린다는 소문이오. 먼저 손을 쓰시겠소.”',
      help: '“궁정 창고를 열어 드리리다. 금값은 대상로 원가 그대로요.”',
    },
  },

  /* ══ 대서양 ══════════════════════════════════════════════════ */

  {
    // 도냐 그라시아 멘데스(멘데스-나시가)의 은행. 리스본에서 나(뉴 크리스천으로) 안트베르펜에서
    // 유럽 최대급 상관을 키웠고, 1553년 이스탄불로 옮겨 오스만의 보호 아래 후추 무역에까지
    // 손을 댔다 — 세 바다를 다 아는 유일한 집이라 원양(ocean)으로 둔다.
    id: 'mendeshouse', name: '멘데스 상관', region: 'atlantic', flag: null,
    seats: ['antwerpen', 'lisboa', 'istanbul'],
    goods: ['spice', 'pepper', 'sugar', 'silk'],
    capital: 17600000, fleet: 5, reach: 'ocean', temper: 0.3, season: null, rank: 5,
    blurb: '리스본에서 나 안트베르펜에서 자랐고 이스탄불에서 술탄의 보호를 받는다.',
    lines: {
      greet: '“멘데스 상관이오. 어느 항구든 이 이름이면 어음이 돌소.”',
      press: '“우리 어음을 부도내려 하시오? 그 소문은 세 도시에 동시에 퍼지오.”',
      offer: '“벨저가 세비야 쪽 향료 값을 흔들고 있소. 그 자리를 대신 맡아 주시겠소.”',
      help: '“우리 신용장을 쓰시오. 어느 항구에서도 현금처럼 통하오.”',
    },
  },
  {
    // 벨저가. 아우크스부르크의 다른 은행 — 세력 `fugger`의 실제 경쟁사였다. 베네수엘라
    // 식민 계약(클라인베네딕)까지 손을 댄, 이 시대 독일 자본이 대서양으로 뻗은 다른 한 팔.
    id: 'welserhaus', name: '벨저 상사', region: 'atlantic', flag: null,
    seats: ['antwerpen', 'sevilla', 'lisboa'],
    goods: ['spice', 'sugar', 'mercury', 'woolcloth'],
    capital: 26000000, fleet: 6, reach: 'ocean', temper: 0.4, season: null, rank: 5,
    blurb: '아우크스부르크의 다른 은행. 식민지 계약서까지 사들이는 손이 크다.',
    lines: {
      greet: '“벨저요. 푸거와 같은 도시 출신이지만 우리는 우리 길로 가오.”',
      press: '“당신이 흔든 수은값이 세비야 계약서에 적힌 것과 다르오.”',
      offer: '“멘데스가 안트베르펜 향료 시장을 너무 크게 쥐고 있소. 좀 덜어 내 주시오.”',
      help: '“세비야 등록을 대신 서 드리리다. 신대륙 쪽 셈이 편해질 것이오.”',
    },
  },
  {
    // 바르톨로메오 마르치오니. 피렌체 태생, 리스본에 정착한 상인-은행가로 카브랄 함대에
    // 자기 배를 태웠고 마데이라 설탕과 기니·미나의 금 무역에 깊이 발을 담갔다.
    id: 'marchionni', name: '마르치오니 상관', region: 'atlantic', flag: 'portugal',
    seats: ['lisboa', 'funchal', 'elmina'],
    goods: ['sugar', 'gold', 'pepper', 'cane'],
    capital: 9000000, fleet: 4, reach: 'ocean', temper: 0.25, season: null, rank: 4,
    blurb: '피렌체에서 나 리스본에 자리 잡은 상인-은행가. 인도행 함대에 제 배를 태운다.',
    lines: {
      greet: '“마르치오니의 배요. 피렌체 돈이지만 국왕의 항로를 타오.”',
      press: '“마데이라 설탕값을 흔들었소? 그 밭은 우리가 대준 돈으로 심었소.”',
      offer: '“벨저가 기니 금줄에 손을 뻗고 있소. 먼저 자리를 지켜 주시겠소.”',
      help: '“인도행 함대에 자리를 빌려 드리리다. 화물칸이 좀 남소.”',
    },
  },
  {
    // 잉글랜드 모직물 수출을 쥔 규제회사. 16세기 중반엔 잉글랜드 대외무역의 4분의 3을
    // 런던 조합원들이 쥐었다고 할 만큼 컸다 — 안트베르펜의 정기시가 그 시장이었다.
    id: 'merchantadventurers', name: '머천트 어드벤처러스', region: 'atlantic', flag: 'england',
    seats: ['london', 'antwerpen', 'bristol'],
    goods: ['woolcloth', 'wine', 'tar', 'stockfish'],
    capital: 12000000, fleet: 4, reach: 'ocean', temper: 0.35, season: null, rank: 4,
    blurb: '런던 조합원들의 규제회사. 미완성 모직을 안트베르펜 정기시로 실어 나른다.',
    lines: {
      greet: '“어드벤처러스요. 이 모직은 안트베르펜 값으로만 파오.”',
      press: '“조합원 아닌 자가 이 항로에서 모직을 팔았소. 못 본 척 못 하오.”',
      offer: '“머스코비가 우리 발트 뱃길을 넘보고 있소. 한번 견제해 주시오.”',
      help: '“조합 창고를 열어 드리리다. 정기시 날짜도 함께 알려 드리오.”',
    },
  },
  {
    // 힐데브란트 베킨후젠 — 뤼베크의 상인. 노브고로드·리가에서 모피·밀랍을 사 브뤼헤에서
    // 팔았고, 방대한 편지가 남아 이 시대 한자 상인의 셈법을 그대로 보여 준다. 발트는
    // 겨울이면 얼어 배가 못 다녔다 — 그래서 이 집은 여름에만 뜬다.
    id: 'veckinchusen', name: '베킨후젠 상관', region: 'atlantic', flag: 'hanse',
    seats: ['lubeck', 'riga', 'reval'],
    goods: ['fur', 'wax', 'woolcloth', 'amber'],
    capital: 2500000, fleet: 2, reach: 'region', temper: 0.5, season: 'summer', rank: 3,
    blurb: '뤼베크의 상인. 노브고로드의 모피를 사서 브뤼헤 값으로 되판다.',
    lines: {
      greet: '“베킨후젠이오. 발트가 얼기 전까지만 이 바다에 있소.”',
      press: '“당신이 부린 모피값이 우리 편지장부와 다르오. 셈을 다시 하시오.”',
      offer: '“한자 콘토어가 이 항로를 너무 세게 누르고 있소. 틈을 좀 벌려 주시오.”',
      help: '“리가에서 실은 아마포요. 반값에 넘기리다.”',
    },
  },
  {
    // 1555년 창설, 잉글랜드 최초의 상시 합자회사. 러시아행 뱃길은 원래 백해로 열렸지만
    // 이 바다엔 아르한겔스크가 없어 발트 항로로 대신 잰다 — 그 길도 겨울이면 얼었다.
    id: 'muscovycompany', name: '머스코비 컴퍼니', region: 'atlantic', flag: 'england',
    seats: ['london', 'reval', 'novgorod'],
    goods: ['fur', 'wax', 'woolcloth'],
    capital: 3000000, fleet: 2, reach: 'ocean', temper: 0.3, season: 'summer', rank: 3,
    blurb: '잉글랜드 최초의 합자회사. 러시아의 모피와 밀랍을 노려 발트까지 왔다.',
    lines: {
      greet: '“머스코비 컴퍼니요. 주주 명부가 런던에 있소.”',
      press: '“러시아 모피를 우리보다 먼저 사들이지 마시오. 이건 우리 특허요.”',
      offer: '“베킨후젠이 리가 셈을 독차지하고 있소. 한 배 끼워 드리리다.”',
      help: '“여름 한 철뿐이오. 이 항로 잘 트인 물때를 알려 드리리다.”',
    },
  },

  /* ══ 아프리카 ════════════════════════════════════════════════ */

  /* ── 생산을 쥔 자본 ────────────────────────────────────────
     상투메. 16세기 이 섬은 **대서양 최초의 플랜테이션 설탕섬**이었고, 그 자본과 기술이
     뒤에 브라질로 건너갔다. 계약상·중개상이 남의 물건을 옮겨 이문을 남기는 동안
     이쪽은 **물건을 만들어 냈다** — 그래서 값이 흔들려도 버티는 힘이 다르다.
     ★ 이 바다 상단의 천장이 `rank 3`이었던 이유가 이것이다: 전부 **옮기는 자본**뿐이고
       **만드는 자본**이 없었다. 아홉 바다 중 상인왕이 없던 넷 가운데 하나다.
     ★ `sugar`는 대서양 권역이 정의한 품목이다(`africa/goods.js` 머리주석 — id를 먼저
       채가면 그쪽이 죽는다). 상단의 `goods`는 전역 품목을 그대로 쓰므로 여기서는 문제없다.
     자본은 동급과의 상대 서열로 잡았다 — 미나 금계약상(rank 3 · 4.5M)의 위, 이 바다의 천장. */
  {
    id: 'saotomesugar', name: '상투메 제당 농장주단', region: 'africa', flag: 'portugal',
    seats: ['saotome', 'elmina', 'luanda', 'lisboa'],
    goods: ['sugar', 'panos', 'ivory', 'wine'],
    capital: 6200000, fleet: 3, reach: 'ocean', temper: 0.30, season: null, rank: 5,
    blurb: '남의 짐을 옮기지 않는다 — 제 섬에서 만들어 싣는다. 값이 흔들려도 버티는 쪽이다.',
    lines: {
      greet: '“상투메에서 왔소. 이 설탕은 우리 밭에서 나온 것이오.”',
      press: '“값을 흔들어 봐야 소용없소. 우리는 사서 파는 사람이 아니오.”',
      deal: '“배가 비었으면 얹어 드리리다. 리스보아까지 같은 값이오.”',
      offer: '“한 철치를 통째로 넘기겠소. 대신 값은 우리가 부르오.”',
      help: '“기니만은 바람이 죽는 바다요. 우리 배가 물길을 아오.”',
    },
  },
  {
    // 아르갱 상관은 포르투갈 왕실이 계약(콘트라토)으로 넘긴 자리였다 — 사금과 암염을
    // 사들일 권리를 사들인 계약상들. 리스본에서 면허를 받고 리스본으로 되돌아간다.
    id: 'arguimcontrato', name: '아르갱 계약상', region: 'africa', flag: 'portugal',
    seats: ['arguin', 'goree', 'santiago', 'lisboa'],
    goods: ['gold', 'salt', 'panos', 'wine'],
    capital: 1200000, fleet: 2, reach: 'ocean', temper: 0.35, season: null, rank: 2,
    blurb: '왕실이 계약으로 넘긴 사금 창구. 면허가 곧 이 집의 전 재산이다.',
    lines: {
      greet: '“왕실 계약상이오. 이 사금은 대상로 끝에서 산 것이오.”',
      press: '“계약 밖에서 사금을 만졌소? 리스본에 알릴 일이오.”',
      offer: '“랑사두들이 우리 계약을 우회하고 있소. 그 길을 좀 막아 주시오.”',
      help: '“암염을 원가로 넘기리다. 대신 우리 항로는 못 본 척해 주시오.”',
    },
  },
  {
    // 랑사두 — 왕의 허가 없이 뭍에 산 밀무역상. 카보베르데에서 건너와 기니의 강들에
    // 눌러앉았다. 계약상과 정반대다: 면허가 없는 것이 이들의 밑천이다.
    id: 'lancados', name: '랑사두 상단', region: 'africa', flag: null,
    seats: ['santiago', 'cacheu', 'goree'],
    goods: ['panos', 'wax', 'ivory', 'hide'],
    capital: 700000, fleet: 1, reach: 'region', temper: 0.5, season: null, rank: 1,
    blurb: '왕의 허가 없이 뭍에 산 사람들. 면허가 없는 것이 이들의 밑천이다.',
    lines: {
      greet: '“이름은 묻지 마시오. 강 안쪽에서만 장사하오.”',
      press: '“당신이 우리 자리를 밟았소. 강 사람들이 가만있지 않을 것이오.”',
      offer: '“계약상들이 리스본 힘을 믿고 설치오. 그 짐을 좀 흔들어 주시오.”',
      help: '“세관 없는 값이오. 강 안쪽 길도 알려 드리리다.”',
    },
  },
  {
    // 포르투갈이 오기 전, 스와힐리·아랍 중개상들이 소팔라의 금과 킬와의 상아를 이미
    // 인도양 저편으로 팔고 있었다. 이 상단은 그 옛 그물의 남은 손이다.
    id: 'kilwagoldbrokers', name: '킬와 금 중개상', region: 'africa', flag: 'swahili',
    seats: ['kilwa', 'sofala', 'quelimane'],
    goods: ['gold', 'ivory', 'panos', 'glass'],
    capital: 3200000, fleet: 3, reach: 'region', temper: 0.3, season: null, rank: 3,
    blurb: '포르투갈이 오기 전부터 소팔라의 금을 인도양 저편으로 넘기던 손.',
    lines: {
      greet: '“킬와의 상인이오. 이 금은 포르투갈 세관을 거치지 않았소.”',
      press: '“당신 배가 우리 금줄을 가로챘소. 옛 항로엔 옛 값이 있소.”',
      offer: '“앙고셰가 우리 금값을 흔들고 있소. 그 늪 항구를 좀 막아 주시오.”',
      help: '“산호석 궁전의 창고를 열어 드리리다. 면포 값을 낮춰 드리오.”',
    },
  },
  {
    // 구자라트 반야니(바니야) 상인 공동체 — 인도양을 건너와 모잠비크·잔지바르에 자리 잡고
    // 유럽인이 오기 전부터, 그리고 온 뒤에도 이 해안의 환전상·중개인 노릇을 했다.
    id: 'banyanigujarat', name: '반야니 상관', region: 'africa', flag: 'gujarat',
    seats: ['mocambique', 'zanzibar', 'kilwa'],
    goods: ['ivory', 'gold', 'carpet', 'tortoise'],
    capital: 2800000, fleet: 2, reach: 'region', temper: 0.25, season: null, rank: 3,
    blurb: '구자라트에서 건너온 환전상 공동체. 포르투갈의 장부도 이들 손을 거친다.',
    lines: {
      greet: '“반야니요. 환전이 필요하면 우리 창고로 오시오.”',
      press: '“당신 셈이 우리 장부와 어긋나오. 다시 재 보시오.”',
      offer: '“킬와 쪽이 상아값을 너무 높게 부르오. 그 창고를 좀 흔들어 주시오.”',
      help: '“페르시아 융단을 상아값으로 바꿔 드리리다. 이문이 좋을 것이오.”',
    },
  },
  {
    // 상 조르즈 다 미나의 금은 전량 왕실 것이었고, 그 독점을 실제로 굴린 것은 왕실이
    // 계약으로 넘긴 상인들이었다("카사 다 기네 에 미나"). 이 해안 금의 1/10이 이들 손을 거쳤다.
    id: 'minacontrato', name: '미나 금계약상', region: 'africa', flag: 'portugal',
    seats: ['elmina', 'axim', 'accra', 'lisboa'],
    goods: ['gold', 'copper', 'panos', 'salt'],
    capital: 4500000, fleet: 3, reach: 'ocean', temper: 0.45, season: null, rank: 3,
    blurb: '미나 성벽 아래 금을 쥔 왕실 계약상. 사무역이 발각되면 목이 달아났다.',
    lines: {
      greet: '“카사 다 미나의 배요. 이 금은 왕실 것이오.”',
      press: '“면허 없이 금을 만졌소? 미나 성이 이 일을 알게 될 것이오.”',
      offer: '“랑사두들이 왕실 몰래 강 안쪽에서 장사하고 있소. 그물을 좀 좁혀 주시오.”',
      help: '“놋쇠와 유리구슬을 원가로 넘기리다. 아칸 상인들이 좋아하는 물건이오.”',
    },
  },
];
