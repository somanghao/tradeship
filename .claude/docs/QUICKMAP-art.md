# QUICKMAP — art (그림 그리는 일)

> 픽셀 에셋·지도 지형·항구 배경. 캐릭터/선박/아이콘/이펙트/배경을 만들거나 고칠 때.

## 1. 키워드 → 문서

| 키워드 | 문서 | 관장 |
|---|---|---|
| 픽셀아트 · 스프라이트 · 팔레트 · 색 3톤 · 외곽선 · `outline` · `bake` 캐시 · 드로잉 DSL(`G`) · 병종 추가 · 모자/무기/방어구 파츠 · 의상 색(`SCHEMES`) · 포즈(idle/attack/hit) · 선체 곡선 · 선종 추가 · 돛 · 깃발 · 규격/기준선(`CHAR_FOOT`·`WATERLINE`) · 아이콘 · 이펙트(폭발·포연·물기둥) · 대포 3종(`cannonSprite(kind)` — 포신/포가 길이로 종류 구분) | [wiki/pixel-pipeline.md](wiki/pixel-pipeline.md) | 에셋 생성 기반과 조립 규약 |
| 지도 · 지중해 · 지형 · 해안선 · 육지/바다 · `SEA_SPANS` · 격자 · 업스케일/보간 · 스무딩 · 섬(`ISLES`) · 산맥 · 사막/식생 · 도시 좌표 배치 | [wiki/map-terrain.md](wiki/map-terrain.md) | 지형 격자와 렌더 순서 — **지형 수정 전 필독** |
| 항구 · 도시 배경 · 건축 양식(latin/hellenic/levant) · 건물 생성 · 랜드마크(종탑·돔·미나레트) · 성벽 · 수문 · 부두 · 화물 프롭 · 세로 배치표 | [wiki/port-scene.md](wiki/port-scene.md) | 항구 프로시저럴 생성과 배치 순서 |
| 파일이 뭘 담당하나 · 어디를 고치나 · 데이터 조정 지점 | [wiki/file-map.md](wiki/file-map.md) | 파일↔기능 맵 |

## 2. 자주 하는 일

| 하고 싶은 것 | 어디 |
|---|---|
| 병종 추가 | `sprites/char.js: UNITS`에 조합 한 줄 (head/weap/armor/scheme) |
| 의상 색 추가 | `sprites/char.js: SCHEMES` |
| 선종 추가 | `sprites/ship.js: HULLS`에 비례값 (len/deck/depth/sheer/masts/ports) — 낡은 배는 `worn: true`(덧댄 판자·물때), 노는 `oars`, 충각은 `ram` |
| 선체 색 추가 | `sprites/ship.js: TINTS` (oak/dark/white/green/**rot**=삭은 배) |
| 국가 깃발 추가 | `sprites/ship.js: FLAGS` (venice/genoa/spain/ottoman/france/england/pirate) |
| 도시 건축 양식 추가 | `sprites/scene.js: STYLES` |
| 지형 수정 | `sprites/scene.js: SEA_SPANS`(격자) / `ISLES`(섬) — 먼저 [map-terrain.md](wiki/map-terrain.md) |
| 에셋 확인 | `preview.html` — 새 에셋은 여기에도 셀 추가 |

## 3. 이 도메인 전용 함정·가드

- **육지 폴리곤을 나열하지 마라.** 지중해 같은 내해는 행별 수역 격자(`SEA_SPANS`)로 정의한다. 폴리곤 나열은 반도가 1px 선이 되거나(이탈리아) 통째로 잠긴다(그리스). 세 번 갈아엎고 확정된 구조라 **접근법을 바꾸기 전에 [map-terrain.md](wiki/map-terrain.md)를 읽는다.**
- **텍스처는 반드시 육지 마스크 안에만 찍는다.** 전체 캔버스에 뿌리면 뒤이은 `outline()`이 바다에 흩뿌려진 점마다 테두리를 그려 화면이 청록 격자무늬로 망가진다. (실제로 당함)
- **저해상 격자를 최근접으로 확대하면 4px 톱니.** 이중선형 보간 + 임계값 판정 + 약한 노이즈.
- **식생·사막 경계를 상수로 자르면 띠로 보인다.** 주기가 다른 sin 2개를 겹쳐 흔들 것.
- **배경은 세로 배치표를 지킨다** (뒤→앞). 성벽을 바다보다 먼저 그렸다가 수면 아래로 잠겨 사라진 적 있다. 부두 프롭도 `QUAY_Y` 기준 아래(`pz`)에 놓아야 물에 안 뜬다. → [port-scene.md](wiki/port-scene.md)
- **스프라이트 가장자리에 1px 여백**을 남긴다. 꽉 채우면 `outline()`이 그려질 자리가 없다.
- **섬은 격자가 아니라 확대 후 좌표로** 찍는다. 격자에 넣으면 스무딩에 먹혀 사라진다.
- **그리는 순서가 곧 z축**이다(뒤팔 → 몸 → 머리 → 앞팔 → 무기). 순서를 바꾸면 무기가 손 뒤로 들어간다.
- **선체 부속은 고정 픽셀이 아니라 `len` 비례로.** 선수 사장을 22px로 박아 뒀더니 짧은 선체(낡은 바사 84)에서 장대처럼 튀어나왔다. 지금은 `clamp(len × 0.2, 14, 24)`. 선종이 늘면 고정값은 반드시 깨진다.
