// regions/indian/npc-figures.js — 인도양의 항구 인물
//
// 항구에 **머무는 사람들**이다. 배를 몰지 않고, 대신 무언가를 해 준다.
// 술집에서 선원을 모으는 것과 같은 층위의 콘텐츠다 — 항구에 들어갈 이유를 늘린다.
//
// ── 필드 ────────────────────────────────────────────────────
//   id, name
//   job      직업 키. 화면 아이콘·대사 톤이 여기서 갈린다:
//              broker(중개인) · informant(정보상) · smuggler(밀수업자) · moneylender(전주)
//              shipwright(선장인) · harbormaster(항무관) · interpreter(통역) · cartographer(지도장이)
//              physician(선의) · gunsmith(총포장이) · priest(사제) · scholar(학자)
//              guildmaster(길드장) ·官(관리 — 감합·해금 같은 제도를 다루는 사람)
//   at       상주 항구 id. 여러 곳을 도는 인물이면 대신 roam:[id…]
//   service  무엇을 해 주는가 — 값은 아직 규칙에 물리지 않았고 **화면과 소문에 먼저 쓰인다**:
//              'price-tip'(먼 항구 시세를 알려준다) · 'route-tip'(위험한 구간을 짚어준다)
//              'contract'(대형 주문을 물어온다) · 'smuggle'(관세를 피하게 해 준다)
//              'loan'(돈을 빌려준다) · 'repair'(수리를 깎아준다) · 'recruit'(사람을 소개한다)
//              'permit'(그 바다를 다닐 문서를 준다 — 감합·카르타스)
//   fee      대가 [최소,최대] 또는 null(공짜·호의)
//   season   'summer'|'winter'|null
//   blurb    한 줄 소개
//   lines    { greet, offer, done }
//
// ★ **그 바다의 제도를 인물로 보여줘라.** 포르투갈의 카르타스, 명의 감합,
//   오스만의 카피툴레이션 같은 것은 표로 설명하는 것보다 그 문서를 파는 사람이 항구에 앉아
//   있는 편이 낫다. 근거 JSON에 그 제도의 출처를 적는다.

export const FIGURES = [
  // { id:'rialto-broker', name:'리알토의 중개인', job:'broker', at:'venezia',
  //   service:'price-tip', fee:[40,120], season:null,
  //   blurb:'다리 밑 좌판에서 어느 항구에 무엇이 모자란지를 판다.',
  //   lines:{ greet:'“알렉산드리아 소식이오. 값은 은화 두 닢.”' } },
];
