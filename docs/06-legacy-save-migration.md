# 06. 원본 Shapez 1 세이브 → 신규 세이브 변환기

## 핵심 요구사항

**[확정] 기존 공장을 이어서 플레이할 수 있어야 한다.** 단, 원본 `.bin`을 100% 동일한 내부 형식으로 유지할 필요는 없으며, 신규 형식으로 **일회성 변환**하는 방식도 허용한다.

> 안전 규칙: 원본 파일은 항상 읽기 전용으로 열고, 별도의 새 경로에 변환 결과를 만든다. 원본 덮어쓰기 금지. 손실 가능 항목은 변환 보고서에 반드시 명시.

## 실제 제공 세이브에서 관찰한 구조

이전 읽기 전용 디코딩 결과의 루트 객체:

```text
version
lastUpdate
mods
stats
dump/
  camera
  time
  map
  gameMode
  entityMgr
  hubGoals
  entities[]
  beltPaths[]
  pinnedShapes
  waypoints
  modExtraData
```

실제 기록된 예시 형식 (민감한 좌표/도형 원본 데이터는 생략):

```json
{
  "version": 1010,
  "dump": {
    "map": { "seed": 40454 },
    "entityMgr": { "nextUid": 235210 },
    "entities": [
      {
        "uid": 1,
        "components": {
          "StaticMapEntity": {
            "origin": { "x": 0, "y": 0 },
            "rotation": 0,
            "originalRotation": 0,
            "code": 1
          }
        }
      }
    ],
    "beltPaths": [
      { "entityPath": [123], "items": [], "spacingToFirstItem": 0.7796 }
    ]
  }
}
```

**중요:** 이 JSON은 **구조를 보여주기 위해 UID/좌표를 임의로 단순화한 예시**다. 그대로 테스트 픽스처로 사용하지 말 것. 원본에서는 `StaticMapEntity.code`가 숫자 또는 모드 문자열일 수 있다.

원본 `.bin`의 래핑 형식은 이전 분석에서 `버전 바이트 + LZString URI-safe 압축 + CRC32 관련 헤더 + 키/문자열 사전 패킹 JSON`으로 추정해 디코딩했다. **검증 문자열/CRC 처리 및 포맷 호환성은 실제 CE/공식판 소스에 따라 독립 검증해야 한다.**

## 권장 변환 파이프라인

```text
기존 .bin (READ ONLY)
     |
  BinaryDecoder (버전별 헤더/검증/압축 해제)
     |
  LegacySaveModel (검증된 중간 표현)
     |
  Map / Entity / Building ID adapters
     |
  Logistics path and in-flight item migration
     |
  NewSaveModel (versioned schema)
     |
  Validator + Migration Report
     |
  새 경로에 안전하게 저장 + 로드 스모크 테스트
```

### 작업 원칙

1. **건물 개수, UID, 위치, 방향**을 가능한 한 보존. 변환 후 UID 교체 시 참조 매핑 표를 작성.
2. **모드 건물**: 새 엔진에서 본래 ID를 직접 지원하거나 `legacyId -> newBuildingType + transform`으로 변환.
3. **허브 진행도 및 storedShapes**: 도형 코드/수량을 손실 없이 복원. 레벨/업그레이드도 그대로 유지.
4. **이동 중인 도형**: 벨트 경로 재구성이 필요해도 `shapeId, 진행 위치, 원래 경로 UID`를 중간 모델에 보관. 가능한 한 재배치; 불가능하면 로그와 복구 옵션 제공.
5. **회로·와이어 핀·장치 내부 상태**: 건물별 어댑터를 통해 변환. 생략되는 필드를 명시.
6. **웨이포인트 및 카메라**: 가능하면 보존; 없더라도 맵 자체 변환 실패로 취급하지 않음.
7. 변환 중 미인식 건물은 **조용히 삭제 금지**. 플레이스홀더/오류 보고/사용자 확인 정책 사용.
8. 최종 스키마의 `formatVersion`과 변환기 버전 및 업스트림 커밋 SHA를 결과에 기록.

## 변환 검증·정합성 규약

- **읽기 전 단계:** 원본 SHA-256 계산 및 사본 보관.
- **구문 단계:** 압축 해제, JSON 구문, 필수 필드, 키 참조 유효성.
- **구조 단계:** 좌표/회전 범위, UID 유일성, 엔티티 참조, 벨트 경로의 엔티티 참조.
- **게임 규칙 단계:** 허브 재고, 모드 매핑, 아이템 무결성, 배치 충돌 검사.
- **쓰기 단계:** 임시 경로 쓰기 → fsync/검증(플랫폼별 가능 범위) → 최종 파일로 교체.
- **사후 단계:** 신규 포맷 다시 읽어 모델 비교, CE 내 로드, 저장, 재시작 테스트.

## 보고서 필수 필드 (제안)

```json
{
  "sourceVersion": 1010,
  "targetFormatVersion": 1,
  "entityCountBefore": 114030,
  "entityCountAfter": null,
  "convertedBuildingsByType": {},
  "unmappedEntityIds": [],
  "inFlightItemsBefore": 110038,
  "inFlightItemsAfter": null,
  "warnings": [],
  "errors": []
}
```

`null` 값은 아직 구현되지 않은 결과 필드의 자리표시자다. **수치가 맞지 않는다고 건물을 마음대로 삭제하여 합계를 맞추지 않는다.**

## 기존 모드 ID/버전

- `mirrored_buildings` (v1.3.0): `stackerMirrored`, `painterDoubleMirrored`, `cutterMirrored`, `cutterMirrored-quad`, `mixerMirrored`, `storageMirrored`.
- `sk-hub-building` (1.1.1): `SkHubBuilding`.
- `reven-teleporter-mod` (1.3.2): `TeleporterInput`, `TeleporterOutput` (제공된 세이브에서는 각 0개).
- Speed Control / Shape finder는 모드 선언상 세이브에 영향을 주지 않는 편의 기능. 제공 세이브의 `mods` 목록에 기록되지 않았다.

**숫자로 저장된 기본 건물 코드**는 정확한 CE/원본 버전의 건물 레지스트리를 확인하기 전에는 명칭으로 임의 변환하지 않는다.

## 실패 및 롤백

- 실패 시 원본 파일과 기존 저장 슬롯을 **수정하지 않는다**.
- 건물 타입 미인식/저장 필드 불명은 *손실 위험 보고*로 취급.
- 결과는 별도 이름의 새 세이브 슬롯에 기록.
- 개인의 원본 `.bin`, 전체 디코딩 `.json`은 Public Git 저장소나 CI 아티팩트에 올리지 않는다. 최소·익명화된 테스트 픽스처를 만든다.

실제 입력 규모는 [09-save-baseline.md](09-save-baseline.md) 참조.
