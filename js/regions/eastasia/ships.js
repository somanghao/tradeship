// regions/eastasia/ships.js — 동아시아에서 짓는 배
//
// 필드 설명은 `js/regions/mediterranean/ships.js`가 본보기다.
//
// ★ 이 바다의 배는 유럽선과 **원리가 다르다.** 정크는 선체 안을 격벽(隔壁)으로 여러 칸으로
//   나눠 한 칸이 새도 배가 뜬다 — 유럽이 이 구조를 배우는 것은 18세기 이후다. 돛은
//   대나무 살을 가로로 넣은 부채꼴 정크세일이라 순식간에 접히고(스콜이 잦은 계절풍
//   바다에서 결정적이다) 세로돛이라 맞바람에 유럽 가로돛보다 낫다. 그래서 이 파일의
//   정크 계열은 **rig가 0.15**로 낮다 — 라틴세일 쪽에 가깝다는 뜻이다.
//   일본의 아타케부네·세키부네는 반대로 **네모돛 한 장 + 노**라 rig가 높으면서도 느리다.
//
// ★ hull은 `js/sprites/ship.js: HULLS`의 키여야 그림이 뜬다. **정크·아타케부네·판옥선의
//   선형은 아직 없다.** 실루엣이 가장 가까운 것을 빌려 쓰고 무엇이 달라야 하는지는
//   근거 JSON의 art.hullTodo에 적었다.
// ★ `originFlag`를 전부 null로 둔 이유: FLAGS에 명·조선·일본 깃발이 없어 색만 비슷한
//   것(venice·hafsid·genoa)을 빌려 썼는데, originFlag에 그대로 쓰면 **베네치아에서
//   복선을, 튀니스에서 판옥선을 싸게 짓게 된다**(그 깃발을 단 항구는 요구등급 −1이다).
//   남의 권역을 오염시키느니 그 혜택을 포기했다. 깃발이 생기면 art.flagTodo대로 채운다.

export const SHIPS = {
  sachuan: {
    hull: 'hulk', name: '사선', origin: '명(강남)', originFlag: null, tier: 1, era: 'classic',
    yards: ['ningbo', 'shuangyu', 'yuegang'],
    price: 1300,
    // 밑이 평평해 개펄에 얹혀도 넘어지지 않는다 — 강어귀와 모래톱이 많은 중국 연안에서
    // 그것이 곧 안전이었다. 대신 용골이 없어 외해에서 옆으로 밀린다.
    hp: 76, crew: 11, crewMax: 18, crewMin: 5, cargo: 80, guns: 2, speed: 1.00,
    upkeep: 4, rig: 0.15, tint: 'oak',
    desc: '밑이 평평한 연안 정크. 개펄에 얹혀도 넘어지지 않아 강어귀를 마음대로 드나든다. 외해로 나가면 옆으로 밀린다.',
  },
  sekibune: {
    hull: 'galley', name: '세키부네', origin: '일본', originFlag: null, tier: 1, era: 'classic',
    yards: ['hakata', 'hirado', 'bonotsu'],
    price: 2300,
    // 노가 주력이고 돛은 네모 한 장이라 맞바람에 거의 못 간다. 대신 좁은 물목에서 빠르고
    // 배를 붙여 뛰어드는 싸움에 맞다 — 왜구가 이 배로 연안을 쳤다.
    hp: 100, crew: 40, crewMax: 70, crewMin: 28, cargo: 60, guns: 4, speed: 1.42,
    upkeep: 11, rig: 0.85, tint: 'dark',
    desc: '노로 가는 일본의 중형 군선. 좁은 물목에서 빠르고 배를 붙여 뛰어드는 싸움에 맞다. 맞바람에는 거의 못 간다.',
  },
  panokseon: {
    hull: 'frigate', name: '판옥선', origin: '조선', originFlag: null, tier: 2, era: 'classic',
    yards: ['busanpo'],
    price: 4000,
    // 1555년에 처음 지었다. 길이 스물몇~서른몇 미터에 한쪽 노가 여덟에서 열, 격군과
    // 전투원을 합쳐 백일흔 남짓이 탔고 총통을 스물여섯 문 넘게 실었다. 쇠못을 안 쓰고
    // 참나무 나무못을 박아 물을 먹으면 오히려 조여지는 배다 — 그래서 튼튼하다.
    hp: 175, crew: 90, crewMax: 170, crewMin: 50, cargo: 90, guns: 16, speed: 1.10,
    upkeep: 17, rig: 0.80, tint: 'dark',
    desc: '두 층 갑판에 총통을 늘어세운 조선의 주력 군선. 쇠못 대신 나무못을 박아 물을 먹을수록 단단해진다.',
  },
  fuchuan: {
    hull: 'carrack', name: '복선', origin: '명(복건)', originFlag: null, tier: 2, era: 'classic',
    yards: ['quanzhou', 'fuzhou', 'guangzhou'],
    price: 10500,
    // 유럽인이 소마(soma)라 부르던 원양 정크다. 400~500톤급이 남중국해를 상시로 오갔고,
    // 1613~1640년에만도 해마다 예순에서 여든 척이 일본에 닿았다. 깊은 V자 용골로
    // 외해를 견디고 격벽으로 칸을 나눠 한 칸이 새도 가라앉지 않는다.
    // 화물 235칸(≈470톤)을 스물몇으로 굴린다 — 칸/선원 비가 유럽 화물선(플류트 18.9)에
    // 맞먹는 16.8이다. 정크가 사람을 적게 먹는다는 것이 이 숫자다.
    hp: 185, crew: 30, crewMax: 60, crewMin: 14, cargo: 235, guns: 10, speed: 1.00,
    upkeep: 21, rig: 0.15, tint: 'white',
    desc: '남중국해를 오가던 원양 정크. 격벽으로 칸을 나눠 한 칸이 새도 뜨고, 이만한 짐을 이만큼 적은 사람으로 나른다.',
  },
  atakebune: {
    hull: 'galleon', name: '아타케부네', origin: '일본', originFlag: null, tier: 3, era: 'classic', requires: 'sekibune',
    yards: ['sakai', 'hakata'],
    price: 19500,
    // 세키부네를 키워 널판으로 통째로 싸 버린 배. 떠다니는 성이라 튼튼하고 무섭지만
    // 노와 네모돛 한 장으로 그 덩치를 미는 것이라 발이 느리다. 1578년 구키 요시타카가
    // 여기에 쇠판까지 둘렀다는 철갑선이 이 계열이다.
    hp: 300, crew: 100, crewMax: 200, crewMin: 60, cargo: 150, guns: 22, speed: 0.92,
    upkeep: 44, rig: 1.00, tint: 'dark',
    desc: '널판으로 통째로 싸 버린 일본의 떠다니는 성. 화살도 총알도 튕겨 내지만, 그 덩치를 노와 돛 한 장으로 민다.',
  },
  shuinsen: {
    hull: 'indiaman', name: '주인선', origin: '일본', originFlag: null, tier: 3, era: 'modern', requires: 'fuchuan',
    yards: ['nagasaki', 'sakai', 'naha'],
    price: 26000,
    // 막부의 붉은 도장(朱印狀)을 받은 배만 바다로 나갈 수 있었다. 1604~1635년에 350척이
    // 넘게 나갔고 평균 승선 인원이 236명이었다. 선체는 정크, 고물은 유럽식, 돛은 정크세일과
    // 네모돛을 섞어 단 **혼혈선**이라 rig가 한가운데(0.45)다. 화물칸은 이 바다에서 가장 크지만
    // 포문은 여섯에서 여덟뿐이었다 — 싸우러 나가는 배가 아니라 짐을 나르는 배다.
    hp: 235, crew: 80, crewMax: 236, crewMin: 24, cargo: 300, guns: 8, speed: 1.05,
    upkeep: 46, rig: 0.45, tint: 'white',
    desc: '막부의 붉은 도장을 받아야 뜨는 배. 정크 선체에 유럽식 고물을 얹은 혼혈선이라 짐은 산더미인데 포문은 여덟뿐이다.',
  },
};
