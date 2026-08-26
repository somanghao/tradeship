# QUICKMAP — art (그림 그리는 일)

> 픽셀 에셋·지도 지형·항구 배경. 캐릭터/선박/아이콘/이펙트/배경을 만들거나 고칠 때.

## 1. 키워드 → 문서

| 키워드 | 문서 | 관장 |
|---|---|---|
| 픽셀아트 · 스프라이트 · 팔레트 · 색 3톤 · 외곽선 · `outline` · `bake` 캐시 · 드로잉 DSL(`G`) · 병종 추가 · 모자/무기/방어구 파츠 · 의상 색(`SCHEMES`) · 포즈(idle/attack/hit) · 선체 곡선 · 선종 추가 · 돛 · 깃발 · 규격/기준선(`CHAR_FOOT`·`WATERLINE`) · 아이콘 · 이펙트(폭발·포연·물기둥) · 대포 3종(`cannonSprite(kind)` — 포신/포가 길이로 종류 구분) | [wiki/pixel-pipeline.md](wiki/pixel-pipeline.md) | 에셋 생성 기반과 조립 규약 |
| 지도 · 지중해 · 지형 · 해안선 · 육지/바다 · `SEA_SPANS` · 격자 · 업스케일/보간 · 스무딩 · 섬(`ISLES`) · 산맥 · 사막/식생 · 도시 좌표 배치 | [wiki/map-terrain.md](wiki/map-terrain.md) | 지형 격자와 렌더 순서 — **지형 수정 전 필독** |
| 항구 · 도시 배경 · 건축 양식(latin/hellenic/levant) · 건물 생성 · 랜드마크(종탑·돔·미나레트) · 성벽 · 수문 · 부두 · 화물 프롭 · 세로 배치표 | [wiki/port-scene.md](wiki/port-scene.md) | 항구 프로시저럴 생성과 배치 순서 |
| **납품된 지도 후처리** · 글자/항로선/나침도/배 지우기 · 400×225로 줄이기 · 크롭 찾기 | `tools/clean-map-art.py`(도구 자체가 정본 — 파일 머리말에 방법이 다 있다) · 검수 `tools/check-map.py` | 외부 그림 → 게임 에셋 |
| 파일이 뭘 담당하나 · 어디를 고치나 · 데이터 조정 지점 | [wiki/file-map.md](wiki/file-map.md) | 파일↔기능 맵 |

## 2. 자주 하는 일

| 하고 싶은 것 | 어디 |
|---|---|
| 병종 추가 | `sprites/char.js: UNITS`에 조합 한 줄 (head/weap/armor/scheme) |
| **인물**(부관 등) 추가 | 같은 `UNITS`에 두되 `body:'fem'`이면 여성 바디(`drawTorsoFem`/`LegsFem`/`ArmsFem`/`HeadFem`)로 갈린다. 병종과 달리 `TROOPS`에는 넣지 않는다 |
| 의상 색 추가 | `sprites/char.js: SCHEMES` |
| 선종 추가 | `sprites/ship.js: HULLS`에 비례값 (len/deck/depth/sheer/masts/ports) — 낡은 배는 `worn: true`(덧댄 판자·물때), 노는 `oars`, 충각은 `ram` |
| 선체 색 추가 | `sprites/ship.js: TINTS` (oak/dark/white/green/**rot**=삭은 배) |
| 국가 깃발 추가 | `sprites/ship.js: FLAGS` — **29종**. 구조는 `{field, fieldD, mark, shape}`이고 `shape`가 표식 모양(block·cross·saltire·crescent·disc·ring·bar·taeguk·none·skull). ★ **표식은 열 1~6에만 놓는다** — 깃발 천이 `sin`으로 물결쳐 열 7 이후에 놓으면 원이 마름모로 일그러진다(십자·X자만 물결을 타도 자연스럽다) |
| 도시 건축 양식 추가 | `sprites/scene.js: STYLES` — **13종**(latin·hellenic·levant·hanseatic·nordic·swahili·guinea·dravidian·malabar·malay·sinic·jiangnan·colonial). 색만으로는 함부르크와 나가사키가 안 갈려 `roofKind`(pitched·flat·gable·eave·thatch·steep)를 함께 쓴다. 새 tower를 넣으면 `portSprite`의 `landmark()`도 늘려야 한다(gable·pagoda·gopuram이 그렇게 들어왔다). ★ `lowRise`를 안 주면 이엉집 화풍이 **3층 진흙 마천루**로 나온다 |
| 지형 수정 | `sprites/scene.js: SEA_SPANS`(격자) / `ISLES`(섬) — 먼저 [map-terrain.md](wiki/map-terrain.md) |
| 그림 외주 · 발주 의뢰서 · 지도/항구배경/NPC 픽셀 · 48×48 인물 규격 · 납품 키 · **AI로 그릴 때** | **대표 2장** [../../assets/BRIEF-MAP.md](../../assets/BRIEF-MAP.md)(지도·배경) · [../../assets/BRIEF-NPC.md](../../assets/BRIEF-NPC.md)(사람) → 바다별 `assets/map-briefs/<권역>.md` | 외주 줄 때. 바다별 의뢰서는 **생성물**(`gen-{map,npc}-brief.mjs`) — 손으로 고치지 않는다. **AI 발주는 §1-A**(비율·img2img·금지어)가 정본. `WORLD-MAP-BRIEF.md`는 도시 16곳 시절 **보관용** |
| **납품된 지도 검수** | `python tools/check-map.py [파일]`(정본) · 브라우저 대조는 `mapcheck.html` — **둘이 같은 기준**(해안선·뭍까지 28px/12px·항로 34%·바다 20~80%·이름표). 좌표는 `geo.js`에서 직접 읽는다 |
| 발주용 기준판 | `assets/map-briefs/<권역>-x4.png`(1600×900 · **덧그릴 판**) · `-coast.png`(지킬 실루엣) — `node tools/gen-map-tracing.mjs`. `assets/map-reference/`는 지중해 16점 시절 것 |
| 에셋 확인 | `preview.html` — 새 에셋은 여기에도 셀 추가. 그림마다 `bake` 키가 함께 표시된다 |
| **그림을 PNG로 교체**(코드 수정 없이) | `assets/manifest.json`에 `"bake 키": "파일.png"` → `assets/README.md`. 훅은 `pixel.js: bake` → `assets.js: overrideFor` |

## 3. 이 도메인 전용 함정·가드

- **지도 지형·검수 함정은 [wiki/map-terrain.md](wiki/map-terrain.md)로 옮겼다**(격자·텍스처·섬·투영·질감·`check-map.py`).
  **지도를 그리기 전에 그 문서를 먼저 읽는다** — ★ *이 축척에서 사실적 해안선과 직선 항로는 양립하지 않는다*가 거기 있다.
- **외부(사람·AI) 발주 함정은 [wiki/art-commission.md](wiki/art-commission.md)** — 이 프로젝트는 **지도 외주를 세 번 반려했다.**
  ★ 기계 검수는 최소조건이지 합격조건이 아니고, 납품은 **좌표를 그림 위에 찍어 눈으로 대조**한다.

- **코드로 그린 그림은 렌더 확인 없이 품질을 단정하지 않는다.** 좌표 DSL로 그린 결과는 코드만 봐서는 어떻게 보이는지 알 수 없다 — 지도를 세 번 갈아엎은 것도, 성벽이 물에 잠긴 것도, 병사가 허공에 뜬 것도 전부 **렌더해 보고서야** 발견됐다. 에셋·배경·배치를 만들거나 고치면 `preview.html` 또는 실제 화면을 **눈으로 확인**한다. "코드상 맞으니 됐다"로 넘기지 말 것. → [pixel-pipeline.md](wiki/pixel-pipeline.md)  *(세션필독 다이어트로 `wiki/gotchas.md` §4에서 옮겨 왔다 — art 전용 함정이다.)*

- **인물은 실루엣부터 갈라야 알아본다.** 병종은 전부 같은 코트 실루엣이라 색만 바꾼 인물은 "또 다른 병종"으로 읽힌다. 어깨를 좁히고 허리를 조인 뒤 치마를 **A라인으로 크게 퍼뜨린다**(원통형이면 뭉툭하다). 얼굴도 병종의 1px 눈으로는 표정이 없어 **눈을 세로 2px + 속눈썹 + 눈동자 하이라이트**를 얹어야 얼굴로 읽힌다. 손에 든 물건은 **몸에 붙인다** — 떼어 놓으면 허공에 뜬 막대가 된다(깃펜에서 실제로 겪었다).

- **배경은 세로 배치표를 지킨다** (뒤→앞). 성벽을 바다보다 먼저 그렸다가 수면 아래로 잠겨 사라진 적 있다. 부두 프롭도 `QUAY_Y` 기준 아래(`pz`)에 놓아야 물에 안 뜬다. → [port-scene.md](wiki/port-scene.md)

- **스프라이트 가장자리에 1px 여백**을 남긴다. 꽉 채우면 `outline()`이 그려질 자리가 없다.

- **에셋 팩 PNG는 규격이 맞아야 한다.** 크기가 다르면 그려지긴 하나 기준점(선박 `WATERLINE`=y104, 병종 발밑)이 어긋나 배가 잠기고 사람이 뜬다. 콘솔 경고로만 알려준다.

- **★ `manifest.json`의 키는 코드가 *부르는* 키여야 한다 — 로더의 "갈아 끼웠다"는 적용됐다는 뜻이 아니다.** `[assets] 20/20개를 갈아 끼웠다`는 *파일을 읽은* 개수이고, 아무 데서도 굽지 않는 키를 적어 두면 그림은 로드된 채 **화면에 한 픽셀도 안 나온다**. 실제로 `char-sailor-eastasia.png`가 그렇게 몇 세션을 잠들어 있었다(코드 키는 배색 `char:sailor:idle:navy`인데 manifest는 권역 `…:eastasia`). ⇒ **적용 확인은 콘솔이 아니라 `knownKeys()`로** 한다: `play.mjs eval "(async()=>{const p=await import('./js/pixel.js');return p.knownKeys().map(k=>k.key)})()"`가 그 화면에서 실제로 구워진 키다. 권역별 얼굴을 넣으려면 `unitSprite(unit, pose, scheme, faceKey)`의 **네 번째 인자**(키만 갈라 두고 배색은 유지 — 그림 없는 바다는 코드 생성 폴백)를 씬에서 넘긴다.

- **그리는 순서가 곧 z축**이다(뒤팔 → 몸 → 머리 → 앞팔 → 무기). 순서를 바꾸면 무기가 손 뒤로 들어간다.

- **선체 부속은 고정 픽셀이 아니라 `len` 비례로.** 선수 사장을 22px로 박아 뒀더니 짧은 선체(낡은 바사 84)에서 장대처럼 튀어나왔다. 지금은 `clamp(len × 0.2, 14, 24)`. 선종이 늘면 고정값은 반드시 깨진다.
