# Shapez Industrial Reengineered — 개발 문서 인덱스

> **Repository:** `shapez-CE-industrial-reengineering`<br>
> **Base project:** [shapez Community Edition](https://github.com/tobspr-games/shapez-community-edition)<br>
> **Document snapshot:** 2026-10-10<br>
> **Document language:** 한국어 (코드 식별자·기술명은 원문 유지)

## Codex에게: 반드시 먼저 읽을 것

이 저장소는 단순한 Shapez 1 모드 묶음이 아니라, **기존 사용자 공장을 보존하면서 성능을 개선하고 산업 자동화 시스템을 추가하는 독립 확장판**이다. 작업 전 다음 원칙을 지켜라.

1. **기존 세이브 보호가 최우선이다.** 원본 `.bin`을 덮어쓰거나, 이해하지 못한 건물을 조용히 삭제하지 않는다.
2. **기존 Shapez 1의 기본 도형 생산 공장은 전력 없이도 정상 작동해야 한다.** 전력은 주로 신형 설비와 선택적 오버클럭에 사용한다.
3. **확정 요구사항과 미확정 설계 수치를 구분한다.** 미확정 수치를 임의로 게임 로직에 고정하지 않는다.
4. **C++/Wasm으로의 일괄 재작성을 시작하지 않는다.** 현재 시스템의 프로파일링·정확성 테스트를 먼저 구축한다.
5. **모드 소스·아이콘·이미지는 라이선스 확인 없이 공개 저장소에 복사하지 않는다.**
6. 코드 변경마다 영향받는 저장·불러오기, 아이템 보존, 전력/생산량 규칙을 테스트한다.

## 문서 목록 및 권장 읽기 순서

| 문서 | 내용 |
| --- | --- |
| [01-project-charter.md](01-project-charter.md) | 게임 비전, 확정 목표, 비목표, 의사결정 상태 |
| [02-upstream-and-architecture.md](02-upstream-and-architecture.md) | Community Edition 선택 이유, 실제 빌드 환경, 아키텍처 경계 |
| [03-logistics-and-buildings.md](03-logistics-and-buildings.md) | 1×1 교차로, 4방향 라우터, 묶음 운송, 텔레포터 |
| [04-power-and-overclock.md](04-power-and-overclock.md) | 6단계 지정 연료 발전소, 배전탑, 회로, 2배 오버클럭 |
| [05-existing-mods.md](05-existing-mods.md) | 업로드된 모드 5종의 기능·코드 관찰·통합 전략 |
| [06-legacy-save-migration.md](06-legacy-save-migration.md) | 원본 `.bin` → 신규 형식 변환 파이프라인과 데이터 보존 정책 |
| [07-snippet-library.md](07-snippet-library.md) | 공장 블록 저장·검색·재배치·공유 기능 |
| [08-performance-and-native-core.md](08-performance-and-native-core.md) | 프로파일링, JS/TS 최적화, C++/Wasm 검증 전략 |
| [09-save-baseline.md](09-save-baseline.md) | 제공된 실제 대형 세이브의 통계 및 테스트 활용법 |
| [10-roadmap-and-acceptance.md](10-roadmap-and-acceptance.md) | 단계별 작업·완료 조건·테스트 매트릭스 |
| [11-codex-workflow.md](11-codex-workflow.md) | Codex Cloud 작업 규칙, 첫 프롬프트, 브랜치/PR 운영 |
| [12-decisions-and-open-questions.md](12-decisions-and-open-questions.md) | 확정 결정, 잠정 수치, 미해결 설계 질문 |
| [13-licenses-and-publication.md](13-licenses-and-publication.md) | GPL 및 제3자 모드 코드·에셋 취급 원칙 |

## 요구사항 상태 표시

- **[확정]** 사용자가 직접 채택하거나 명시적으로 요구한 사항.
- **[합의된 방향]** 대화에서 선호되었지만 구현 세부는 미정인 사항.
- **[제안]** 이전 설계 대화에서 제시한 샘플. 자동으로 확정하지 말 것.
- **[검증 필요]** 원본 저장소/실제 실행/법적 검토가 필요한 사항.

## 자료의 출처와 한계

- **사용자 요구사항:** 2026-10-10까지의 설계 대화.
- **1차 자료:** 사용자가 제공한 `teleporter.js`, `speedcontrol.js`, `sk_bldMicroHub.js`, `mirrored_buildings.js`, `findshape.js`.
- **대형 세이브:** 사용자가 제공한 `.bin`을 이전 대화에서 읽기 전용으로 디코딩한 통계 (`09-save-baseline.md`). **원본 바이너리와 전체 개인 세이브는 이 패키지에 포함하지 않았다.**
- **업스트림:** CE 공식 [README](https://github.com/tobspr-games/shapez-community-edition/blob/master/README.md), [package.json](https://github.com/tobspr-games/shapez-community-edition/blob/master/package.json), [LICENSE](https://github.com/tobspr-games/shapez-community-edition/blob/master/LICENSE).

이 문서들은 프로젝트 사양과 작업 가이드이지, 완성된 기능 또는 CE에서 검증된 코드라는 뜻이 아니다. **기존 저장소의 실제 인터페이스/테스트/빌드 설정은 Codex가 체크아웃한 커밋을 기준으로 재검증해야 한다.**

## Cloud 작업 시작

- 실제 Fork: https://github.com/Ricotta-Cheese/shapez-CE-industrial-reengineering
- [첫 Cloud 작업 프롬프트](cloud-first-task.md): M0 환경 검증과 초기 성능 계측 계획.
- 개인 세이브와 모드 원본은 이 저장소에 포함하지 않는다.
