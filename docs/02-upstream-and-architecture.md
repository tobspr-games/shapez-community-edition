# 02. 업스트림 선택 및 초기 아키텍처

## 기반 선택: Community Edition

**[합의된 방향]** 독립 개발 Fork의 기반은 [shapez Community Edition](https://github.com/tobspr-games/shapez-community-edition)이다. 기존 Steam/공식판은 동작 및 세이브 비교용으로 활용한다.

확인된 업스트림 사실 (2026-10-10에 조회한 기본 브랜치 문서):

- CE는 공식 Shapez 1에서 분기한 커뮤니티 유지보수 버전이며, 공식 Steam 배포판과 별도 개발된다.
- CE는 TypeScript 및 JSX/TSX 전환 작업 중이며, 기존 JS를 모두 즉시 TS로 바꿀 필요는 없다고 명시한다.
- CE README는 현재 소스 빌드 기반 **standalone/Electron** 지원을 안내하며 웹 버전 재지원 계획이 없다고 밝힌다.
- `package.json`에는 `type: "module"`, `npm run gulp`, `npm run lint` 등의 스크립트가 있다.
- GitHub가 보고한 저장소 크기는 **664,364 KB(약 649 MiB)**. 실제 clone/`node_modules`/빌드 디스크 점유량과 다르다.
- 업스트림 README의 GPL v3 언급 및 `package.json`의 `GPL-3.0-or-later` 표기를 확인했다.

이 사실들은 **작업 브랜치/커밋에 따라 달라질 수 있으므로** 실제 체크아웃 후 재검증한다.

### 원본 링크

- CE: https://github.com/tobspr-games/shapez-community-edition
- 공식판: https://github.com/tobspr-games/shapez.io
- CE 빌드 안내: https://github.com/tobspr-games/shapez-community-edition/blob/master/README.md
- CE 패키지: https://github.com/tobspr-games/shapez-community-edition/blob/master/package.json

## 로컬 초기 환경

업스트림 README의 현재 안내 (불필요하게 스크립트 변경 금지):

```bash
# 저장소 루트
npm install
cd electron && npm install && cd ..

# 터미널 1, 루트에서
npm run gulp

# 터미널 2, electron/에서
npm start -- --dev
```

전제: Node.js, Java/OpenJDK(텍스처 패커), ffmpeg(오디오 변환). 실제 Node 버전은 잠금 파일과 CI에서 확인한다. Codex Cloud에서 Electron GUI 실행을 강제하지 않고 빌드·단위 테스트부터 시작한다.

## 기술적 방향

```text
+-------------------------------------------------+
| UI / Camera / Input / Rendering (CE JS/TS)       |
|  - Snippet UI, overlays, building placement     |
+-----------------------+-------------------------+
                        | typed commands/events
+-----------------------v-------------------------+
| Simulation domain (initially JS/TS)             |
|  - belts, processors, logistics, power networks |
|  - deterministic save/load adapters             |
+-----------------------+-------------------------+
                        | optional stable API later
+-----------------------v-------------------------+
| Optional C++ core compiled to WebAssembly       |
|  - only measured hotspots                        |
+-------------------------------------------------+
```

**현재 확정된 것은 C++ 전환의 실험 계획이지, C++로 이미 작성됐다는 사실이 아니다.**

### 모듈 경계 (제안, 실제 CE 디렉터리 구조 확정 아님)

- `core/logistics`: 채널 레지스트리, 묶음 패킷, 분배기
- `core/power`: 연료 사이클, 전력망, 전력 배분, 축전지
- `core/compat`: 기존 모드 ID 및 컴포넌트 매핑
- `core/snippets`: 독립 모듈 직렬화와 버전 마이그레이션
- `core/profiling`: TPS/프레임/시스템별 시간 계측
- `core/save`: 저장 형식 버전, 정합성, 원자적 쓰기

우선 실제 업스트림 구조를 조사한 후 CE 관습에 맞게 파일 경로를 결정한다. 새 건물을 넣기 전에 `ItemAcceptor`, `ItemEjector`, `ItemProcessor`, `GameSystemWithFilter`, `ModMetaBuilding`와 대응 TS 인터페이스가 어떻게 동작하는지 확인한다.

## 이전 및 새 구조의 공존 원칙

1. 저장 파일 로더와 게임 시뮬레이션을 느슨하게 결합한다.
2. 도형 코드는 문자열/안정적 ID로 직렬화하고, 엔진 내부 객체 참조는 저장하지 않는다.
3. UI는 엔진 데이터의 단일 진실 원천을 변경하는 명령을 발행한다.
4. 시뮬레이션 중의 JS↔Wasm 왕복과 객체 복사를 최소화한다.
5. 새로운 기술을 위해 원본 엔진의 세이브 데이터를 파괴하는 변경을 피한다.

## 초기 확인 작업

- 현재 CE 커밋 SHA 기록; 빌드 스크립트, 의존성, 라이선스 확인.
- `df -h`, `du -sh . .git`으로 Codex 실제 VM 디스크 측정. **ChatGPT Plus의 20GB 파일 저장 공간을 Codex VM 디스크로 간주하지 않는다.**
- CE에 기존 모드를 로드할 수 있는지 스모크 테스트 (우선 로컬).
- 원본 세이브는 로컬/비공개 테스트 데이터로 취급한다.
