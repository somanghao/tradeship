// gen-npc-brief.mjs — 권역마다 **NPC 픽셀 의뢰서**를 뽑는다 (술집 무리 · 항구 인물 · 적선 얼굴)
//
// ★ 왜 손으로 안 쓰고 생성하는가.
//   지도 외주를 두 번 반려한 원인이 **의뢰서와 게임 데이터가 어긋난 것**이었다(→ gen-map-brief.mjs).
//   NPC는 그보다 더 흩어져 있다 — 이름 풀은 `js/data.js`, 인물은 권역 `npc-figures.js`,
//   적선 얼굴은 `npc-pirates.js`, 병종은 `TROOPS`/`UNITS`. 사람이 옮겨 적으면 반드시 틀린다.
//   **여기서 직접 뽑으면 어긋날 수가 없다.** 인물을 늘리면 이 명령을 다시 돌려 새 의뢰서를 낸다.
//
//   node tools/gen-npc-brief.mjs            → assets/npc-briefs/<권역>.md 아홉 장 + 대표(BRIEF-NPC.md) 목차 갱신
//   node tools/gen-npc-brief.mjs eastasia   → 한 권역만
//
// 공통 사양(규격·팔레트·포즈·납품 형식)은 **대표 `assets/BRIEF-NPC.md`** 한 장에 있고,
// 이 파일이 뽑는 것은 **그 바다에 무엇이 몇 개 필요한가**다.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { TROOPS, RECRUITS, ENEMIES, CREW_NAME_POOL, PIRATE_NAME_POOL, CREW_NAMES } from '../js/data.js';
import { UNITS } from '../js/sprites/char.js';
import {
  REGIONS, REGION_IDS, citiesOfRegion, ALL_PIRATES, ALL_FIGURES, FOES_BY_REGION,
} from '../js/regions/index.js';

const OUT = new URL('../assets/npc-briefs/', import.meta.url);
try { mkdirSync(OUT, { recursive: true }); } catch { /* 이미 있다 */ }

/* 이름 풀 — 이 바다에서 실제로 뽑히는 이름을 **예시로 보여준다**.
   외주가 "어느 문화권 얼굴인가"를 이름에서 읽을 수 있어야 한다. */
function poolsOf(regionId, cities) {
  const flags = [...new Set(cities.map((c) => c.flag).filter(Boolean))];
  const rows = flags.map((f) => [f, CREW_NAME_POOL[f] ?? 'latin']);
  const pirate = PIRATE_NAME_POOL[regionId] ?? 'latin';
  return { rows, pirate };
}
const sample = (poolKey, n = 4) => (CREW_NAMES?.[poolKey] ?? []).slice(0, n).join(' · ') || '(이름 풀 없음)';

const jobKo = {
  broker: '중개인', informant: '정보상', smuggler: '밀수업자', moneylender: '전주',
  shipwright: '선장인', harbormaster: '항무관', interpreter: '통역', cartographer: '지도장이',
  physician: '선의', gunsmith: '총포장이', priest: '사제', scholar: '학자',
  guildmaster: '길드장', official: '관리',
};

function brief(region) {
  const cities = citiesOfRegion(region.id);
  const cityName = Object.fromEntries(cities.map((c) => [c.id, c.name]));
  const figures = ALL_FIGURES.filter((f) => {
    const home = f.at ?? (f.roam && f.roam[0]);
    return home && cityName[home];
  });
  // 해적의 근거지 필드는 `base`다(`den`/`at`이 아니다 — 실제로 틀려서 아홉 권역이 모두 0명으로 나왔다)
  const pirates = ALL_PIRATES.filter((p) => {
    const home = p.base ?? (p.circuit && p.circuit[0]);
    return home && cityName[home];
  });
  const foes = FOES_BY_REGION[region.id] ?? [];
  const { rows: poolRows, pirate: piratePool } = poolsOf(region.id, cities);

  const L = [];
  L.push(`# NPC 픽셀 의뢰서 — ${region.name}`);
  L.push('');
  L.push('> 이 파일은 **생성물이다.** 고치지 말고 `node tools/gen-npc-brief.mjs`를 다시 돌린다.');
  L.push('> 규격·팔레트·납품 형식은 [../BRIEF-NPC.md](../BRIEF-NPC.md)(대표)가 정본이고,');
  L.push('> 여기에는 **이 바다에 무엇이 몇 개 필요한지**만 적는다.');
  L.push('');
  L.push(`항구 ${cities.length}곳 · 이름난 해적 ${pirates.length}명 · 항구 인물 ${figures.length}명 · 흔한 조우 ${foes.length}종`);
  L.push('');

  /* ① 술집 무리 — 지금 가장 아픈 자리다. 이름만 그 바다 것이고 그림은 지중해 하나를 돌려쓴다. */
  L.push('## 1. 술집에 앉는 무리 (최우선)');
  L.push('');
  L.push('술집에서 뽑히는 인물의 **이름은 이미 이 바다 것**인데 **그림은 지중해 것 하나**를 돌려쓰고 있다.');
  L.push('일본 항구에 빨간 두건의 서양 선원이 앉아 있는 상태다. 병종별로 이 바다 복장이 필요하다.');
  L.push('');
  L.push('| 병종 | 지금 모습(코드 생성) | 이 바다에서 필요한 것 |');
  L.push('|---|---|---|');
  for (const key of RECRUITS) {
    const u = UNITS[key], t = TROOPS[key];
    if (!u || !t) continue;
    L.push(`| \`${key}\` ${t.name} | 머리 ${u.head} · 무기 ${u.weap} · 갑옷 ${u.armor} · 색 ${u.scheme} | ${region.name} 복장 · 무기는 그 바다에서 쓰던 것으로 |`);
  }
  L.push('');
  L.push('**이 바다에서 뽑히는 이름**(문화권을 얼굴에 반영할 것):');
  L.push('');
  L.push('| 깃발 | 이름 풀 | 예시 |');
  L.push('|---|---|---|');
  for (const [flag, pool] of poolRows) L.push(`| ${flag} | \`${pool}\` | ${sample(pool)} |`);
  L.push(`| (해적 소굴) | \`${piratePool}\` | ${sample(piratePool)} |`);
  L.push('');

  /* ② 항구 인물 — 데이터는 71명이 있는데 그림이 없다. */
  if (figures.length) {
    L.push('## 2. 항구 인물');
    L.push('');
    L.push('항구에 **머무는 사람들**이다(배를 몰지 않는다). 이름·직업·대사는 이미 데이터에 있고 **초상이 없다.**');
    L.push('');
    L.push('| 이름 | 직업 | 있는 곳 | 한 줄 |');
    L.push('|---|---|---|---|');
    for (const f of figures) {
      const where = f.at ? cityName[f.at] : (f.roam || []).map((id) => cityName[id] || id).join('·');
      L.push(`| ${f.name} | ${jobKo[f.job] ?? f.job} | ${where} | ${(f.blurb || '').replace(/\|/g, '/')} |`);
    }
    L.push('');
  }

  /* ③ 적의 얼굴 — 배는 있는데 사람이 없다. 선장 초상이 전투 화면을 그 바다 것으로 만든다. */
  L.push('## 3. 적의 얼굴');
  L.push('');
  if (pirates.length) {
    L.push('### 이름난 해적 (초상 필요)');
    L.push('');
    L.push('| 이름 | 소굴 | 배 | 한 줄 |');
    L.push('|---|---|---|---|');
    for (const p of pirates) {
      const den = cityName[p.base] ?? '—';
      const power = p.strength != null ? ` (세력 ${p.strength})` : '';
      L.push(`| ${p.name}${power} | ${den} | ${p.ship ?? '—'} | ${(p.blurb || '').replace(/\|/g, '/')} |`);
    }
    L.push('');
  }
  if (foes.length) {
    L.push('### 흔한 조우 (선원 무리의 복장이 곧 이 배의 얼굴이다)');
    L.push('');
    L.push('| 이름 | 국적 | 깃발 | 선체 |');
    L.push('|---|---|---|---|');
    for (const f of foes) L.push(`| ${f.name} | ${f.nation} | ${f.flag} | ${f.hull} |`);
    L.push('');
  }
  L.push('전투에 서는 병종은 등급별로 `ENEMIES`를 그대로 쓴다(수치는 공통, 얼굴만 바다마다 다르다) — '
       + `등급 ${ENEMIES.length}단계.`);
  L.push('');

  L.push('## 4. 납품하면 어디에 꽂히나');
  L.push('');
  L.push('| 무엇 | 교체 키 | 쓰이는 화면 |');
  L.push('|---|---|---|');
  for (const key of RECRUITS) L.push(`| ${TROOPS[key].name} | \`char:${key}:idle:<색>\` | 술집 좌석 · 갑판 배치 · 백병전 |`);
  L.push('| 부관 에이미 | `char:amy:idle:teal` | 항구 사이드패널 · 급여 화면 |');
  L.push('');
  L.push('키를 `assets/manifest.json`에 적으면 **그 키만** PNG로 대체된다(나머지는 코드 생성 유지). '
       + '키 목록은 `preview.html`에서 눈으로 확인한다. → `assets/README.md`');
  return L.join('\n') + '\n';
}

const only = process.argv[2];
const targets = only ? REGION_IDS.filter((id) => id === only) : REGION_IDS;
if (only && !targets.length) {
  console.error(`그런 권역이 없다: ${only}\n있는 것: ${REGION_IDS.join(' · ')}`);
  process.exit(1);
}
const made = [];
for (const id of targets) {
  const region = REGIONS.find((r) => r.id === id);
  writeFileSync(new URL(`${id}.md`, OUT), brief(region), 'utf8');
  made.push(region);
  console.log(`  ${id}.md — ${region.name}`);
}

/* 아홉 장을 한 번에 뽑았을 때만 **대표 문서의 목차**를 갈아 끼운다.
   목차를 따로 두면(예전 `npc-briefs/INDEX.md`) 받는 사람이 어느 파일을 봐야 하는지 헷갈린다 —
   전달할 것은 **대표 1장 + 그 바다 1장** 둘뿐이어야 한다. */
if (!only) {
  const rows = ['| 바다 | 함께 전달할 파일 | 항구 | 이름난 해적 | 항구 인물 |', '|---|---|---|---|---|'];
  for (const r of made) {
    const cities = citiesOfRegion(r.id);
    const names = Object.fromEntries(cities.map((c) => [c.id, 1]));
    const fig = ALL_FIGURES.filter((f) => names[f.at ?? (f.roam && f.roam[0])]).length;
    const pir = ALL_PIRATES.filter((p) => names[p.base ?? (p.circuit && p.circuit[0])]).length;
    rows.push(`| ${r.name} | [npc-briefs/${r.id}.md](npc-briefs/${r.id}.md) | ${cities.length} | ${pir} | ${fig} |`);
  }
  const REP = new URL('../assets/BRIEF-NPC.md', import.meta.url);
  const doc = readFileSync(REP, 'utf8');
  const S = '<!-- npc-index:start -->', E = '<!-- npc-index:end -->';
  const a = doc.indexOf(S), b = doc.indexOf(E);
  if (a < 0 || b < 0) {
    console.error('대표 문서에 목차 마커가 없다 — assets/BRIEF-NPC.md에 npc-index:start/end를 넣어라');
    process.exit(1);
  }
  writeFileSync(REP, doc.slice(0, a + S.length) + '\n' + rows.join('\n') + '\n' + doc.slice(b), 'utf8');
  console.log('  BRIEF-NPC.md (목차 갱신)');
}
