# M0 개발 환경 검증과 초기 성능 계측 계획

검사일: 2026-10-10 (Asia/Seoul). 게임 로직·건물 ID·저장 형식 변경 없이 문서만 제출한다. 아래 **실행 결과**, **정적 코드 관찰**, **후속 제안/미검증**은 서로 다른 근거다. `AGENTS.md`, `docs/README.md`, `docs/01`~`13`, `docs/cloud-first-task.md`를 모두 읽었다. 사양의 미확정 밸런스 수치는 채택하지 않았다.

## 1. 체크아웃과 실행 환경 — 실제 확인

- 시작 브랜치 `work`, 시작 HEAD `a3fdbf4f594772bbb8b72910987e7a23008fea8f`, 작업 트리 깨끗함. 초기 체크아웃에는 `AGENTS.md`와 `docs/`가 없었다.
- `git ls-remote --heads origin`, `git fetch origin master`로 최신 문서를 확인한 후 `git switch -c docs/m0-environment-performance-plan origin/master` 실행.
- 검사 대상 HEAD: **`910a1a7425b6b863e537428da69c36a07370012f`** (`docs: add industrial reengineering specifications and Cloud task guidance`). 부모가 위 시작 HEAD이며, 두 커밋 사이 차이는 문서와 `.gitignore`뿐이다. 이 SHA를 게임 성능 측정 결과로 해석하지 않는다.
- `origin`: `https://github.com/Ricotta-Cheese/shapez-CE-industrial-reengineering.git`, 기준 브랜치 `master`. 독립적인 업스트림 최신 HEAD 조회는 수행하지 않았다.
- `uname -sm`: Linux x86_64. `node --version`: **v24.19.0**, `npm --version`: **11.9.0**, `java -version`: OpenJDK **21.0.12.1**, `ffmpeg -version`: **7.1.5-0+deb13u1**.
- `df -h .`: overlay 총 **32G**, Used **1.3M**, Avail **30G**, **1%**. overlay 계층의 수치이므로 체크아웃 `du`와 동일한 의미가 아니다. Plus 라이브러리 용량과도 무관하다.
- 최초 `du -sh .`: **1.7G**. 하위 경로를 각각 별도 실행한 `du -sh`: `.git` **647M**, `node_modules` **546M**, `electron` **316M**, `build` **29M**, `res_built` **22M**. 한 번에 중첩 경로를 전달하면 중복 집계 방지로 일부 출력이 생략되어 개별 실행했다.
- `npm ls --depth=0`, `npm --prefix electron ls --depth=0` 모두 종료 코드 **0**. 루트에 `sass`, `@parcel/watcher` 등 extraneous 항목이 있지만 직접 의존성 누락은 보고되지 않았다. 이미 설치되어 있어 재설치하지 않았다. 깨끗한 VM의 설치 성공을 이번에 검증한 것은 아니다.
- 클라우드 상태는 running/connected, 관찰은 current. HTTP 정책은 unrestricted이나 상태가 unknown이므로 enforced로 단정하지 않는다. 실행기의 `/etc/codex/network-policy.json`은 unrestricted HTTP, 프록시 사용, VPN 미설정이었다. 별도 설정된 secrets/runtime variables/outbound identities 목록은 비어 있었다. 이는 GitHub CLI 인증 가능 여부와 별개이며 실제 GitHub 읽기는 성공했다.

## 2. 도구 버전과 재현 명령 — 파일 근거

조사 파일: 루트 `README.md`, `package.json`, `package-lock.json`, `electron/package.json`, `electron/package-lock.json`, `electron/tsconfig.json`, 루트/`src`의 `tsconfig.json`, `gulp/environment.js`, `gulp/tasks.js`, `gulp/js.js`, `gulp/typescript.js`, `gulp/standalone.js`, Rspack 설정, `Dockerfile`, `.github/workflows/ci.yml`, `eslint.config.js`.

- README 전제는 Node, Java/OpenJDK, ffmpeg이며 정확한 최소 버전은 지정하지 않는다. 루트/전자 앱 패키지에 Node `engines` 고정은 없고 두 잠금 파일은 lockfileVersion **3**이다.
- **재현 기준 제안은 Node 22 계열**: Dockerfile의 `node:22-bookworm-slim`, `@tsconfig/node-lts@22.0.1`, `@types/node@22.14.0`이 근거다. 이번 실제 검사는 Node 24에서 했으므로 Node 22 검증 완료로 표시하지 않는다. `gulp/standalone.js`의 JSON import attributes (`with { type: "json" }`)도 지원되어야 하므로 오래된 Node를 의존성 engines만으로 선택하지 않는다.
- 잠금 버전: ESLint **9.24.0** (Node `^18.18.0 || ^20.9.0 || >=21.1.0`), Rspack **1.7.2** (`>=18.12.0`), 루트 TypeScript **5.8.2**, Electron 쪽 TypeScript **5.8.3**, Electron **37.6.1**. Electron의 npm 설치용 Node 조건과 앱 내부 런타임 버전은 별개다.
- 새 환경은 README대로 루트 및 `electron/`에서 `npm install`할 수 있다. 잠금 재현에는 `npm ci`, `npm ci --prefix electron`을 사용한다. 루트 postinstall은 Java 확인, Texture Packer 다운로드, 로컬 설정 생성을 한다. 설정 파일·JAR의 존재를 따로 확인해야 한다.
- CI는 YAML lint와 Docker 내 Linux x64/Windows x64 패키징을 실행한다. lint/`tsc`/단위 테스트 job은 없다. Docker는 루트 `npm ci`, Electron `npm ci --prefix electron --ignore-scripts` 후 패키징한다. 이번에는 Docker 빌드/패키징을 실행하지 않았다.
- 루트 `npm run gulp`의 기본 작업은 준비 + 서버/watch여서 종료되는 빌드 검사로 쓰지 않았다. 전체 리소스와 production 번들을 만드는 실제 task는 **`npm run gulp -- build.standalone.full`**이다. 이것은 Electron 배포 패키지 생성과 다르다.
- 루트/Electron에 `test` script와 프로젝트 테스트 파일/하위 AGENTS가 발견되지 않았다 (`rg --files --hidden`, 의존성·Git 제외). 존재하지 않는 `npm test`를 실행하거나 새 테스트 명령을 만들지 않았다.

## 3. 실제 실행 검사와 실패

작업 트리가 깨끗한 문서 기준 HEAD에서 실행했다. 실패를 고치기 위한 게임/빌드 코드·잠금 파일 변경은 하지 않았다. 로그는 `/tmp/m0-*.log`에 보관했고 공개 커밋에는 넣지 않는다.

| 실제 명령 (루트 기준) | 종료 코드/결과 | 해석 |
| --- | --- | --- |
| `npm run lint` | **1**, 240 problems (**178 errors, 62 warnings**) | 기존 기준 실패. `gulp/atlas2json.js`의 prefer-const, `gulp/js.js` 미사용 변수, 다수 ban-ts-comment/no-unused-expressions 등. 자동 수정하지 않음 |
| `./node_modules/.bin/tsc -p tsconfig.json --noEmit` | **2**, **7** 진단 | `gulp/atlas2json.js` 속성 추론 오류 6개, `gulp/image-resources.js`의 `verbose` 옵션 타입 오류 1개 |
| `./node_modules/.bin/tsc -p src/tsconfig.json --noEmit` | **2**, **297** 진단 | TS6133 250, TS7027 18, TS2304 14, TS2339 7, TS2445 4, 나머지 TS2551/2552/2740/6198 각 1. 번들 transpile 성공과 타입 검사 통과를 구분해야 함 |
| `./node_modules/.bin/tsc -p electron/tsconfig.json --noEmit` | **0**, 출력 없음 | 루트 TS 5.8.2로 Electron 검사 통과 |
| `./electron/node_modules/.bin/tsc -p electron/tsconfig.json --noEmit` | **0**, 출력 없음 | Electron 자체 TS 5.8.3로도 통과. 실제 앱 시작/GUI 검증은 아님 |
| `npm run gulp -- build.standalone.full` (최초) | **1** | `Unable to access jarfile runnable-texturepacker.jar`, 이후 `res_built/atlas` ENOENT. Java 자체는 설치되어 있음 |
| `npm run gulp -- environment.prepare` | **1** | Java 확인/로컬 설정 생성 단계 완료, 다운로드에서 `TypeError: fetch failed` |
| 아래 `curl` 명령 | **0**, 약 **21.6 MiB** 다운로드 | 같은 공식 URL을 기존 HTTP 프록시/CA 경로로 다운로드. 재설치나 코드 수정 없이 누락된 도구만 보충 |

```bash
curl --fail --location --max-time 60 \
  https://libgdx-nightlies.s3.amazonaws.com/libgdx-runnables/runnable-texturepacker.jar \
  --output gulp/runnable-texturepacker.jar
npm run gulp -- build.standalone.full
```

JAR SHA-256: `4d4d8565fb743a07c6dd2a83ca79bc3e7191e1392c6f31e8bcc9310c7a2f0521`. 공식 nightly URL은 가변이므로 미래 재현 시 해시를 다시 기록한다. Node의 기본 fetch와 프록시 환경 간 차이가 다운로드 실패의 가능한 원인이지만, 이번에 fetch 내부 네트워크 원인을 확정하지 않았다. curl 성공은 관찰 사실이다. 최초 빌드의 atlas 생성 실패는 `gulp/image-resources.js`가 catch 후 계속하여 ENOENT로 드러났으며 이 코드도 수정하지 않았다.

**재시도 완료:** `npm run gulp -- build.standalone.full` 종료 코드 **0**, Gulp 로그 `Finished 'build.standalone.full' after 1.82 min`. atlas 생성/최적화, HQ 음악·SFX 변환, 번역, production JS/CSS/HTML 및 후처리가 종료됐다. Node DEP0176/DEP0180 및 Browserslist 데이터가 16개월 오래됐다는 경고는 남아 있다. 패키지 업데이트로 경고를 숨기지 않았다. watch/dev 서버는 실행하지 않았으며 검사 프로세스는 종료됐다.

완료 후 `df -h .`: 총 **32G**, Used **275M**, Avail **30G**, **1%**. `du -sh .`: **2.0G**, `du -sh build`: **131M**, `du -sh res_built`: **120M**. JAR·생성 리소스·번들은 기존 `.gitignore` 대상이다. 빌드 성공은 현재 환경의 리소스/번들 생성에 한정하며 Electron 패키징/GUI/타입 검사 통과를 뜻하지 않는다.

## 4. 실제 코드 경로와 호출 흐름 — 정적 관찰

아래는 소스를 읽은 결과이며 실제 게임 실행 추적이 아니다. 경로는 저장소 루트 기준이다.

| 대상 | 조사한 주요 파일과 흐름 |
| --- | --- |
| 프레임/게임 틱 | `application.js`의 AnimationFrame → `states/ingame.js:onRender(dt)` → `game/core.js:tick(dt)` → `game_time.js:performTicks` → `core.js:updateLogic` → entity manager / `game_system_manager.js:update` |
| TPS/시간 | `game/dynamic_tickrate.js:setTickRate`가 `deltaMs=1000/rate`, `deltaSeconds=1/rate` 설정. game mode 고정값 또는 `profile/application_settings.js:getDesiredFps()` 사용. 자동 증가/감소 호출은 주석 상태. `GameTime`은 budget을 제한하고 성공 틱마다 게임 시간을 증가시킴 |
| 벨트 | `game/systems/belt.js`가 경로 생성/합침/분리/serializePaths/deserializePaths 및 `update` 담당 → `game/belt_path.js:update`, `tryAcceptItem`, `boundAcceptor`. 이동량에 deltaSeconds 사용; 수신 성공 시에만 items pop. 정체/경로 재구성과 렌더를 따로 측정할 지점 |
| 입출력 | `game/systems/item_ejector.js:update` → `tryPassOverItem` → 벨트/processor/underground/storage/filter 수신. `game/components/item_acceptor.js`, `item_ejector.js`가 슬롯/수신·배출 상태 정의. `systems/item_acceptor.js`는 소비 애니메이션 업데이트도 수행하며 belt 이전 순서 유지 |
| 가공/채굴 | `systems/miner.js`와 `systems/item_processor.js:update` → canProcess/startNewCharge → process_* → ongoingCharges/queuedEjects → ejector.tryEject. `components/item_processor.js`의 inputSlots/ongoingCharges/queuedEjects를 런타임 재고 조사에 포함 |
| 시스템 순서 | `game_system_manager.js`의 itemAcceptor → belt → undergroundBelt → miner → storage → itemProcessor → filter → itemProducer → itemEjector 등. 모드 시스템은 MODS_ADDITIONAL_SYSTEMS의 before 지정으로 삽입. 계측 때문에 순서를 바꾸지 않음 |
| 렌더 | `states/ingame.js:onRender` → `core.js:draw` → map.drawBackground / belt.drawBeltItems / map.drawForeground / HUD 및 회로 draw. `game/map_chunk_view.js`, `map_chunk_aggregate.js`, `belt_path.js:draw`의 가시 영역/캐시도 후보. draw 내부 onFrameRendered가 FPS 집계 |
| 생산량 | `game/production_analytics.js`의 shapeDelivered/itemProduced 신호와 `game/hub_goals.js`의 storedShapes. 통계 UI는 시간 slice이므로 비교에는 구간 누적 신호/종료 재고 사용 제안 |
| 저장 | `game/automatic_save.js` → 게임 상태 doSave → `savegame/savegame.js:updateData` → `savegame_serializer.js:generateDumpFromGameRoot` (entities/beltPaths/time/hubGoals 등) → writeSavegameAndMetadata → `core/read_write_proxy.js` 검증/debounce → `platform/storage.ts` compression → IPC `fs-job` → `electron/src/fsjob.ts` write |
| 불러오기 | Storage read/decompress → ReadWriteProxy 버전/검증/migrate → Savegame dump reader/schema → `savegame_serializer.js:deserialize`가 entity/time/map/hubGoals, 엔티티 배열, beltPaths 복원 → mod signal / `core.js:postLoadHook` |
| 압축/호환성 | `core/compression.ts` → `webworkers/compression.ts`의 MessagePack + gzip / `decompression.ts`의 gunzip + decodeAsync. docs/06의 기존 v1010 래핑 추론과 같은 포맷으로 단정할 수 없음. CRC/레거시 디코더 및 원본 로드는 미검증 |
| 모드 로더 | `electron/src/mods/locator.ts`의 user/distro `.asar` 또는 개발 --load-mod → loader.ts의 mod.json 해석/중복·disabled 처리 → ipc.ts의 get-mods → `src/js/mods/modloader.ts:initMods` → mod:// 동적 import, 기본 export가 Mod 하위 클래스인지 확인 → 순차 init. protocol_handler.ts가 mod:// 파일 제공. 옛 단일 JS 모드의 직접 호환을 보장하는 근거가 아님 |

기존 내장 계측은 정식 성능 기준선으로 바로 쓰기 어렵다. `DynamicTickrate.beginTick`는 샘플을 `sort()` (숫자 comparator 없음) 후 양끝을 제거하고 평균만 저장한다. 원본 p95/p99/긴 지연이 보존되지 않는다. FPS도 실제 timeDuration이 아니라 고정 1000ms로 나누므로 직접 프레임 수/실측 시간으로 재계산해야 한다. 이 문제는 정적 관찰이며 이번 PR에서 변경하지 않았다.

저장 정합성 주의: `ItemProcessorComponent.getSchema()`는 nextOutputSlot만 선언한다. 따라서 진행 중 가공 재고는 직렬화 dump만으로 완전 계수된다고 가정하지 않는다. 런타임 스냅샷과 저장 왕복 결과를 별도 확인하고 차이가 있으면 기존 기준의 제한으로 보고한다. 현재 CE에 docs/06의 보존 조건이 이미 충족됐다고 주장하지 않는다.

## 5. M0 직후 성능 기준선 — [제안], 미실행

첫 측정은 JS/TS와 Electron에서 수행한다. 신규 건물·전력·C++/Wasm을 구현하지 않는다. 아래 수치들은 실험 조건 제안이며 성능 향상 수치/게임 밸런스가 아니다.

1. **환경 고정:** 같은 PC/OS/CPU/GPU/드라이버, Electron/Chromium 버전, 커밋, production 빌드, 창 크기/DPR/주사율, 카메라 위치·줌, seed, 업그레이드, 모드 ID/버전, TPS 설정을 기록. 사용자 개인 경로나 스크린샷은 공개 결과에서 제외. 기준/후보를 번갈아 실행하고 매 반복 동일 초기 스냅샷을 별도 프로필/복사본에서 로드한다. 자동 저장·백그라운드 상태·속도 모드 영향은 통제한다.
2. **시나리오:** 새 게임/소형 포화·차단 벨트/터널·분배·저장고/가공 체인/합성 중형·대형 공장. 실제 개인 대형 세이브는 로컬 복사본에서 별도 측정. 동일 공장의 근접/원거리 카메라를 각각 측정해 렌더 영향을 분리한다. 기본 60 TPS, 속도 1× 제안; 높은 TPS는 보조 조건. 설정 이름이 FPS라도 currentTickRate/deltaSeconds를 기록한다.
3. **수집 경계:** 성공한 updateLogic 호출 전체와 각 system.update를 performance.now로 감싸는 개발 전용 수집기 제안. 시스템 순서·인자·반환값·예외는 유지한다. 실제 성공 틱 수와 게임 시간 증가를 같이 기록. 별도 프레임/draw 시간을 수집하고 로드, 경로 캐시 재구축, 저장 snapshot/compression/IPC write 시간을 구간별로 나눈다.
4. **구간/반복:** 워밍업 30초 후 120초 게임 시간을 최소 5회 측정하는 안. 60 TPS 고정이면 측정 구간 7,200 성공 틱; 워밍업 후 상태까지 기준/후보가 동일해야 한다. 실시간 지연 때문에 끝 게임 시간을 달성하지 못하면 timeout/미완료와 달성한 틱을 기록한다. p95/p99는 해당 반복의 원본 틱 시간을 숫자 정렬해 nearest-rank (`ceil(p*n)-1`)로 산출하고 평균/최대/반복 간 변동도 남긴다. outlier/GC 틱을 임의 제거하지 않는다.
5. **FPS/TPS:** FPS=렌더 프레임 수/실제 벽시계 초, 달성 TPS=성공 틱 수/벽시계 초. 설정 TPS, game-time/wall-time 비율, 프레임 간격/CPU draw 시간은 별도 필드. 60 TPS의 16.67ms는 명목 틱 간격이지 CPU 틱 비용이나 FPS 결과가 아니다. budget clamp/일시정지/비가시 상태를 기록하여 빠진 벽시계 시간을 생산량 개선으로 해석하지 않는다.
6. **메모리/GC:** renderer JS heap 시작/끝/최대와 main/renderer/GPU 프로세스 RSS를 분리 기록. DevTools allocation/GC trace는 별도 진단 실행으로 하고 기본 타이밍 실행의 DevTools 오버헤드를 통제한다. 계측 OFF/전체 틱만 ON/시스템별 ON을 동일 조건에서 비교해 오버헤드도 측정. 샘플 저장은 사전 할당 버퍼, 구간 끝 일괄 export; 매 틱 console/전체 dump 금지.
7. **생산량/아이템 보존:** 동일 게임 시간 구간의 도형별 생산·허브 납품 누계, 벨트/터널/저장고/입력 슬롯/가공 중 charge/배출 대기/배출 슬롯/필터의 시작·끝 재고를 계수한다. 순수 운송 시 `초기 재고 + 외부 유입 = 최종 재고 + 외부 유출`; 가공 시 recipe별 입력 소모/출력 생성, trash/허브의 정당 소비를 원장에 추가한다. 절단·적층으로 개수가 바뀌므로 전체 도형 개수 하나만 맞추지 않는다. 기준/후보는 UID 참조와 도형 코드·슬롯·순서·경로 위치를 정규화한 상태 비교/해시 및 누계가 같아야 한다. 허용 부동소수 오차는 별도 명시하되 개수 오차는 숨기지 않는다.
8. **합격 판단:** 성능 변화는 같은 하드웨어/데이터/게임 시간에서 정확성 동등성과 반복 변동을 확인한 뒤 판단한다. 결과가 없으므로 현재 병목·개선율·목표 FPS 달성을 주장하지 않는다.

후속 결과의 최소 공개 필드: baseline/candidate SHA, fixture ID/해시·생성기 버전, 도구/하드웨어, 엔티티/경로/재고 수, 목표/실제 TPS, FPS, 게임/벽시계 시간, 평균/p95/p99/최대 tick ms, 시스템별 ms, heap/RSS, 반복 횟수, 계측 오버헤드, 생산/납품 누계 차이, 보존/상태 해시 판정, 실패·timeout. 개인 dump/좌표/이름은 제외한다.

## 6. 미검증 항목과 최소 입력

- **실제 Electron 창/게임 플레이, FPS/TPS/메모리/생산량:** 이번에는 미실행. GUI/GPU 환경에서 로컬 확인 필요. 타입 검사/리소스 빌드가 앱 시작을 보증하지 않는다.
- **배포 패키징, Docker CI 재현, Node 22, 신규 환경 npm ci, CI YAML lint:** 미실행. yamllint 실행 파일은 발견되지 않았다. Docker CLI 존재만 확인했으며 데몬/이미지 빌드를 검사하지 않았다.
- **원본 v1010 로드·저장 왕복 및 5개 모드 호환:** 개인 .bin과 명시된 원본 JS/에셋이 저장소에 없어서 미실행. docs/09의 114,030 엔티티/110,038 벨트 도형 등은 과거 분석 수치이며 이번에 재현한 결과가 아니다.
- **최소 익명화 입력 제안:** 새 게임에서 생성한 고정 시드의 작은 벨트(정상/막힌 끝/합류/분기/터널), 회전 0/90/180/270° 가공기·저장고 픽스처 및 기대 개수/도형별 누계. 실제 유효 UID/건물 code/schema로 생성하고 docs/06의 예시 JSON을 실행 입력으로 사용하지 않는다. 익명 이름·좌표를 쓰고 원본 공장의 일부를 무단 공개하지 않는다.
- 레거시 분석 후속에는 v1010의 최소 유효 원본, 잘못된 헤더/CRC/압축 데이터, 미인식 건물 ID, 벨트 참조 오류를 비공개 또는 적법한 합성 입력으로 준비한다. 모드 재배포 권한 확인 전 소스/에셋을 넣지 않으며 통계/호환 결과만 공개한다.
- 로컬 체크리스트: 원본 SHA-256 및 읽기 전용 사본 보관 → 별도 테스트 프로필 → 로드 오류/미인식 ID 확인 → 무전력 기본 생산, 정체/회전/반전, 모드 슬롯·허브 납품 검사 → 별도 슬롯 저장/재시작 → 진행도/도형별 재고·운송/가공 중 상태 비교 → 원본 SHA-256 재확인. 차이를 조용히 삭제해 맞추지 않는다.

## 7. 다음 가장 작은 작업 — [제안]

별도 PR로 **개발 전용 틱/프레임 수집기와 소형 합성 벨트 입력 하나**를 준비한다. updateLogic 원본 샘플, 실제 프레임/틱 수, 게임 시간, 평균/p95/p99, 초기·최종 아이템 원장과 OFF/ON 오버헤드만 우선 검증한다. 저장 스키마나 게임 규칙에는 필드를 추가하지 않고 수집기를 제거하면 원래 흐름으로 돌아가게 한다. 기존 lint/타입 오류 개선과 fetch/프록시 재현도 별도 좁은 환경 작업으로 분리한다. 본 PR은 계측기를 구현하지 않는다.
