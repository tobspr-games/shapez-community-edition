# 05. 기존 사용 모드 5종 — 소스 기반 통합 계획

이 문서의 확인 사항은 사용자가 제공한 다음 **실제 JS 파일**을 정적 분석해 정리했다. 파일은 현재 문서 ZIP에 포함하지 않는다. 코드·에셋의 재배포는 라이선스 확인 후 진행.

| 제공 파일 | 모드 메타데이터 ID | 확인된 버전 | 개발 목표 |
| --- | --- | --- | --- |
| `findshape.js` | `findShape9001` | `2` | 검색 UI + 비차단 검색 |
| `sk_bldMicroHub.js` | `sk-hub-building` | `1.1.1` | 1×1/2×2 이동식 허브 |
| `teleporter.js` | `reven-teleporter-mod` | `1.3.2` | 고효율 채널형 원격 물류 |
| `speedcontrol.js` | `speed-control` | `1` | 안전한 속도 제어/정지 |
| `mirrored_buildings.js` | `mirrored_buildings` | `v1.3.0` | 공통 좌우 반전 지원 |

**주의:** 5개 파일이 있다고 해서 CE에서 그대로 작동한다는 뜻은 아니다. CE 버전·API·모드 로더를 실물 테스트해야 한다.

## 1) Shape finder (`findshape.js`)

**소스 관찰**

- `Ctrl+F` 단축키; 4문자 `C/R/S/W/-` 패턴, 반경 기본 500, 최대 5,000, 회전 일치 선택, 빠른 검색 선택.
- `findShape()`가 X/Y의 이중 반복문에서 `map.getOrCreateChunkAtTile(x, y)` 호출. 필요 시 청크 생성·대량 탐색을 유발할 수 있다.
- 검색 종료 뒤 `cleanup()`이 빈 청크 정리를 수행한다.

**구현 제안**

- 매 프레임 작업량을 제한한 검색 큐, 취소 버튼, 검색 진행률.
- 카메라에서 가까운 후보 우선; 동일 청크 검색 캐싱.
- 검색 결과가 맵 생성 과정과 충돌하지 않도록 실제 CE 청크 인터페이스 확인.
- 기존 단축키 및 패턴 검색 동작 유지.

## 2) Micro Hub (`sk_bldMicroHub.js`)

**소스 관찰**

- `getAvailableVariants()`가 `default` 2×2 + `Single` 1×1 반환.
- 1×1은 북/남/동/서 입력 슬롯을 정의.
- `METADATA.settings.enabledAtLevel1`이 현재 `true`.
- `ItemProcessorComponent`의 `processorType: hub`를 사용하여 기존 허브 납품 로직을 재활용.
- 입력 슬롯 변경 코드에 빈 `catch`가 있어 오류 원인 추적이 어렵다.
- 예전 저장 건물 ID: `SkHubBuilding`; 사용자 세이브에서 **11개** 발견.

**구현 제안**

- 중앙 허브 카운트/업그레이드를 그대로 쓰는 공용 재고 인터페이스 제공.
- 슬롯 생성 로직 중복 제거, 오류 삼키기 금지.
- 기존 Micro Hub 기능과 새 전력형 고급 허브를 분리.

## 3) Teleporter (`teleporter.js`)

**소스 관찰**

- `InputTeleporterComponent`와 `OutputTeleporterComponent`가 각각 `channel` 저장 스키마 정의.
- 송신 입력은 `top`, 수신 출력은 `top` 방향.
- 설치 시 채널 설정 모달을 띄우며, 왼쪽 클릭으로 재설정 가능.
- 수신 시스템 `update()`는 각 수신기에 대해 모든 입력 텔레포터를 탐색 (`O(S×R)`형 비용).
- 송신기 보관 도형 `item`은 컴포넌트 일반 필드이지만 `getSchema()`에서는 `channel`만 선언됨. **저장/불러오기 중 보류 도형의 처리 검증 필요.** 이것만으로 실제 데이터 유실이 확정되는 것은 아님.
- Freeplay 보상에 해금 연결.
- 사용자 제공 세이브에는 `TeleporterInput`, `TeleporterOutput` **각 0개**.

**통합 제안**

- 채널 등록부(`Map<channel, endpoints>`) + 안정적인 공정한 스케줄러.
- 차단된 수신기의 backpressure, 여러 수신기의 round-robin, 저장 중 운송 상태의 안전성.
- 회로 제어, 전력 소모, 묶음 패킷으로 확장.

## 4) Speed Control (`speedcontrol.js`)

**소스 관찰**

- 슬라이더 범위는 `0.5~2.0`, 단계 `0.1`; 정지/재생 버튼을 제공.
- 슬라이더/일시정지 이벤트마다 `replaceMethod()` 및 `extendClass()`로 시간 관련 메서드를 변경.
- `realtimeNow()`에서 일시정지 시 0을 반환하는 경로 존재. 실제 게임 타임베이스 영향은 테스트 필요.
- `doesNotAffectSavegame: true`.

**통합 제안**

- `SpeedManager` 같은 단일 속도 상태를 만들고 초기화 시 한 번만 엔진에 연결.
- 게임 시뮬레이션 배율 / TPS 스케줄러 / 오버클럭 생산 배율 / 렌더 FPS를 분리.
- UI 재진입 시 이벤트 핸들러와 DOM 중복 생성 방지.

## 5) Mirrored Buildings (`mirrored_buildings.js`)

**소스 관찰**

- 저장고, 적층기, 색상 혼합기, 이중 색칠기, 일반/4분할 절단기의 미러 버전을 별도 `ModMetaBuilding`으로 등록.
- 별도 건물 ID를 사용: `storageMirrored`, `stackerMirrored`, `mixerMirrored`, `painterDoubleMirrored`, `cutterMirrored` + `quad` variant.
- 기존 세이브에 관련 건물 **728개**가 들어 있음.

**통합 제안**

- 범용 `rotation + mirrored` 좌표 변환으로 입력/출력/회로 핀/이미지/충돌 배치 일치시킨다.
- 단 **게임 내부 형식이 변할 경우에도 기존 미러 ID를 로딩할 수 있는 Legacy Adapter**를 둔다.
- 새 건물 전 종류를 자동 반전하기 전에 방향 민감 동작을 테스트한다.

## 모드 적용 우선순위

1. Speed Control / Shape finder: 엔진 상태에 영향이 작은 편의 기능부터.
2. Mirrored Buildings: 새 건물 확장 전에 변형 모델 정리.
3. Micro Hub: 허브 회계/저장 포맷과 함께 검증.
4. Teleporter: 새 물류·회로·전력과 겹치므로 핵심 서비스로 재설계.

**라이선스 확인 대상:** 소스 코드, Base64 이미지·아이콘, 외부 라이브러리, SVG/폰트는 서로 다른 권리자가 있을 수 있다. [13-licenses-and-publication.md](13-licenses-and-publication.md) 참조.
