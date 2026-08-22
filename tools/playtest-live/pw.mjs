/* playwright-core를 찾아 준다.
   이 프로젝트는 의존성이 없는 순수 ES 모듈이라 node_modules를 두지 않는다. 그래서
   플레이테스트용 playwright는 **다른 데 있는 것을 빌려 쓴다** — 없으면 어디에 두면 되는지 알린다. */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.PLAYWRIGHT_CORE_DIR,                                   // 직접 지정
  join(homedir(), '.claude/skills/web-capture/.cache'),              // web-capture 스킬이 부트스트랩해 둔 것
  join(process.cwd(), 'node_modules/..'),                            // 이 저장소에 깔았다면
].filter(Boolean);

export function playwright() {
  for (const dir of CANDIDATES) {
    const probe = join(dir, 'node_modules/playwright-core/package.json');
    if (!existsSync(probe)) continue;
    return createRequire(join(dir, 'x.js'))('playwright-core');
  }
  throw new Error(
    'playwright-core를 못 찾았다. 아래 중 하나로 마련한다:\n'
    + '  · web-capture 스킬을 한 번 돌린다(캐시에 자동 설치된다)\n'
    + '  · npm i playwright-core 한 곳을 PLAYWRIGHT_CORE_DIR로 가리킨다\n'
    + '찾아본 곳: ' + CANDIDATES.join(' · '));
}
