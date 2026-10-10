# 11. Codex Cloud 협업 및 작업 규칙

## 권장 워크플로

1. GitHub 공개 Fork `shapez-CE-industrial-reengineering`를 Codex Cloud에 연결한다.
2. 매 작업은 명시적 목표, 수정 범위, 완료 조건, 금지사항을 갖는 작은 단위로 요청한다.
3. Codex는 시작 전에 [README](README.md)와 관련 사양을 읽고 업스트림 실제 코드를 확인한다.
4. 브랜치에서 구현 후 lint/빌드/테스트를 돌리고 변경 내용·결과를 보고한다.
5. 최종 게임 플레이, 실제 Electron 창, 대형 세이브 로드와 FPS/TPS는 로컬 PC에서 확인한다.
6. 승인된 작업만 기본 브랜치로 반영한다.

## Codex에게 적용할 불변 규칙

- 업스트림 CE 소스와 최신 브랜치를 직접 조사한 후 함수/파일 위치를 결정할 것.
- 확정 요구사항과 제안 수치를 혼동하지 않을 것.
- **원본 세이브, 사용자 데이터, 라이선스 미확인 모드 리소스를 공개 커밋하지 않을 것.**
- 변환기는 원본 데이터를 읽기만 하고 결과를 다른 파일로 쓸 것.
- 무조건 C++ 전환을 진행하지 말고 프로파일링과 테스트 먼저.
- 건물/도형 처리 규칙 수정 시 불변조건 테스트(복제·손실·속도·수량) 작성.
- 코드 수정에 따른 문서 갱신 및 의사결정 상태 표시.
- 작업 중 현재 커밋의 실제 빌드·검증 명령을 확인하고 존재하지 않는 npm script를 만들어 가정하지 말 것.

## 첫 번째 작업 프롬프트 (복사하여 사용 가능)

```text
Repository: shapez-CE-industrial-reengineering (fork of shapez Community Edition).
Read docs/README.md and docs/01-project-charter.md through docs/13-licenses-and-publication.md before changing code. Treat [확정] as requirements and [제안] as unapproved design ideas.

Task: Inspect and validate the development environment only. Read the upstream README, package.json, lockfiles and build scripts. Record the current commit SHA. Inspect disk availability with df -h and du -sh. Identify the minimal setup needed for lint/build and execute safe checks where feasible.

Do not change game logic, save formats, building IDs or the baseline branch. Do not commit node_modules, generated assets, user save files, or third-party mod code. Report exact commands, observed results, available disk, blockers and the next smallest implementation task.
```

## 후속 작업 템플릿

```text
Goal:
Relevant docs:
Confirmed requirements:
Files/systems to inspect first:
Allowed changes:
Forbidden changes:
Tests / acceptance criteria:
Expected output: patch + test results + risks + docs updates
```

## Codex Cloud 공간 관리

- GitHub API가 보고한 CE 저장소 크기는 약 649MiB지만 로컬 체크아웃 크기/의존성 크기는 다르다.
- **Plus 20GB 라이브러리 저장 공간 = Codex VM 디스크가 아니다.** 실제 VM은 `df -h`로 확인한다.
- `node_modules`, Electron 패키징 출력, 다운로드한 툴체인은 필요할 때만 설치.
- C++/Emscripten 도입은 더 나중 별도 작업으로 분리한다.
- 변경 전후 `du -sh`를 기록하고 CI에 큰 빌드 아티팩트를 커밋하지 않는다.

## 작업 로그 권장 규칙

- `docs/12-decisions-and-open-questions.md`에서 합의/미합의 여부 관리.
- 필요하다면 `docs/implementation-notes/`에 날짜별 작업 로그를 추가하되 코드 상태와 맞춰 갱신.
- 모델이 "작동할 것"으로 추정한 것과 실제 빌드/게임에서 검증된 것을 반드시 구분.
