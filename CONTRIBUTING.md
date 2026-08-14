# 같이 작업하기

이 저장소는 **세 영역이 서로를 건드리지 않게** 갈라 두었다.
자기 영역 안에서는 남의 파일을 열지 않고도 일이 끝나야 정상이다. 열어야 한다면 경계가 잘못 그어진 것이니 알려 달라.

| 영역 | 만지는 곳 | 만지지 않아도 되는 곳 |
|---|---|---|
| **그림 (아트)** | `assets/` · `js/sprites/` | 게임 규칙 · NPC · 경제 수치 |
| **NPC (세계)** | `js/npc/` · `js/world.js` | 그림 · 지도 좌표 · 전투 규칙 |
| **지도 (지리)** | `js/map/geo.js` · `js/sprites/scene.js`의 `mapSprite` | 경제 수치 · NPC · 전투 |
| 경제·전투 (기존) | `js/data.js` · `js/state.js` · `js/scenes/` | — |

---

## 그림을 바꾸고 싶다면

**코드를 고칠 필요가 없다.** `assets/README.md`를 보면 된다. 요약하면:

1. `python serve.py` 후 <http://localhost:8891/preview.html>
2. 그림 밑의 회색 **키**를 확인 (상단 [키 전체 복사] 버튼도 있다)
3. `assets/manifest.json`에 `"키": "파일.png"`로 적고 PNG를 `assets/` 아래 둔다
4. 새로고침

코드로 그리는 쪽을 직접 손보고 싶다면 `js/sprites/`다. 파일이 종류별로 갈려 있다.

| 파일 | 담당 |
|---|---|
| `sprites/char.js` | 병종 3포즈 · 인물(부관 에이미 — 여성 바디 `body:'fem'`) |
| `sprites/ship.js` | 선박 측면·탑다운, 깃발, 선체 색 |
| `sprites/scene.js` | 지도·항구·외해 배경, 전투 이펙트, 대포 |
| `sprites/icons.js` | 교역품 아이콘 |

색은 반드시 `js/pixel.js`의 `PAL` 표에서만 고른다 — 이 규칙이 화면 전체의 톤을 붙들고 있다.

---

## NPC를 바꾸고 싶다면

세 겹으로 갈려 있다. 대개 첫 번째만 고치면 된다.

| 파일 | 무엇 |
|---|---|
| `js/npc/config.js` | **숫자만.** 몇 척이 도는가, 얼마나 사납게 덮치는가, 시장에 얼마나 압력을 남기는가 |
| `js/npc/behavior.js` | **판단.** 어디로 갈지·무엇을 살지 정하는 함수. 게임 모듈을 import하지 않고 `ctx`로만 받는다 |
| `js/world.js` | **집행.** 생성·하루 진행·습격 처리·조회. 위 둘을 불러 쓴다 |

`behavior.js`가 게임 상태를 직접 모르게 만든 이유는, 규칙을 통째로 갈아 끼워도 `world.js`를 손댈 필요가 없게 하기 위해서다.

지금 알려진 한계는 `behavior.js` 맨 위 주석에 적어 두었다 (상인이 이웃 항구 한 칸만 본다 · 여러 항구를 도는 순회 상인이 없다).

**밸런스를 건드렸으면 반드시 곡선을 함께 본다:**

```bash
node tools/test-world.mjs     # 세계가 굴러가는지
node tools/sim-trade.mjs      # 자산 추이가 무너지지 않았는지
```

그리고 <http://localhost:8891/dashboard/> 에서 시세가 실제로 움직이는지, 물자가 부족한 항구까지 닿는지 눈으로 확인한다.

---

## 지도를 바꾸고 싶다면

`js/map/geo.js` 한 파일이다. 도시 좌표·항로·해류가 전부 여기 있다.

- **도시를 추가**하려면 `CITY_GEO`에 넣고, `js/data.js`의 `CITY_TRADE`에 **같은 id**로 경제(supply/demand)를 넣는다.
  한쪽만 넣으면 시작할 때 콘솔에 경고가 뜬다.
- **도시 수치에는 근거가 달려 있다.** `content/city-evidence.json`이 항목마다 판정·근거·출처를 들고 있고, `node tools/check-evidence.mjs`가 코드와 어긋나면 실패한다. `CITY_TRADE`나 깃발을 고치면 **같은 커밋에서** 근거도 고친다. 서술본은 `.claude/docs/wiki/city-goods-history.md`.
- **항로(`ROUTES`)는 선 하나가 경제 전체의 물길을 바꾼다.** NPC도 플레이어도 이 그래프 위에서만 움직인다.
  선을 긋거나 지웠으면 대시보드에서 "부족한데 아무도 안 나르는 곳"이 늘었는지 본다.
- 지도 **그림**은 `js/sprites/scene.js`의 `mapSprite()`다. 해안선을 고쳤으면 도시 좌표가 물 위에 있지 않은지 함께 본다 (같은 400×225 좌표계다).

---

## 공통

```bash
python serve.py                 # 8891. python -m http.server는 쓰지 않는다(캐시 때문에 화면이 검게 뜬다)
node tools/test-rules.mjs       # 규칙 회귀
node tools/test-world.mjs       # NPC 세계
node tools/sim-trade.mjs        # 자산 곡선
node tools/check-evidence.mjs   # 도시 수치 ↔ 근거 정합
```

- **빌드가 없다.** 파일을 고치고 새로고침하면 그게 전부다.
- 커밋 전에 위 네 개를 돌린다. 전부 `PASS`여야 한다.
- 수치를 고쳤으면 눈으로 판단하지 말고 곡선을 본다. 이 프로젝트에서 여러 번 데인 부분이다.
- 설계 배경과 결정 이유는 `.claude/docs/` 아래에 있다. 헷갈리면 `.claude/docs/claude-memory.md`부터.
