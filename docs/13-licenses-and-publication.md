# 13. 라이선스·외부 코드·공개 저장소 원칙

## 업스트림

- CE README는 프로젝트가 GNU GPL v3 기반임을 언급한다.
- CE `package.json`에는 `"license": "GPL-3.0-or-later"`로 기재되어 있다.
- CE 저장소에 GPLv3 라이선스 전문이 포함되어 있다.
- 원본 프로젝트의 저작권/라이선스/기여자 표기를 유지하고 수정 사항을 명확히 기록한다.
- 코드 배포 때 소스 제공, 라이선스 표시 등 의무를 준수한다. 세부 해석은 정식 라이선스 전문을 확인한다.

업스트림 링크:
- https://github.com/tobspr-games/shapez-community-edition/blob/master/LICENSE
- https://github.com/tobspr-games/shapez-community-edition/blob/master/package.json

## 제3자 모드

**사용자가 JS 파일을 제공했다고 해서 그 파일/내장 이미지의 공개 재배포 허락이 자동으로 생기는 것은 아니다.**

다음 각각을 독립적으로 확인:

1. Shape finder (`findshape.js`): 코드 라이선스/외부 아이콘 출처.
2. Micro Hub (`sk_bldMicroHub.js`): 코드/PNG 내장 데이터 라이선스.
3. Teleporter (`teleporter.js`): 코드/PNG 내장 데이터 라이선스.
4. Speed Control (`speedcontrol.js`): 코드/SVG 아이콘 출처.
5. Mirrored Buildings (`mirrored_buildings.js`): 코드/PNG 내장 데이터 라이선스.

**안전한 초기 전략:** 기능 및 동작을 참고해 확장판 코드로 직접 재구현하고, 라이선스 검토 전에는 원본 코드를 통째로 복사해 Public Fork에 넣지 않는다. 독자 구현도 제3자 특허·상표·에셋을 자동 면책하지 않으므로 필요시 별도 확인.

## 공개 저장소에 넣지 않는 데이터

- 사용자의 실제 `.bin` 세이브, 복호화/압축 해제된 전체 JSON.
- 개인 플레이 정보·웨이포인트가 포함된 리포트/화면 이미지.
- Git 계정 토큰, Codex 토큰, 비밀값, 개인 파일 경로.
- `node_modules`, Electron 패키징 결과물, 대규모 임시 데이터.

### `.gitignore`에 추가 검토할 항목(기존 규칙과 병합)

```gitignore
# User private gameplay saves
*.shapez-private.bin
private-fixtures/
local-saves/

# Generated / cache
node_modules/
build_output/
*.log
```

`*.bin` 전부를 무시하면 정당한 게임 리소스까지 가려질 수 있으므로 **원본 저장소의 기존 에셋 패턴을 확인한 뒤 최소한의 규칙만 추가**한다.

## 공개 전 체크리스트

- 업스트림 `LICENSE`, 저작권 정보 유지.
- 모드별 외부 코드·이미지의 재배포 권한 확인.
- 원본 세이브·개인 파일·토큰 미포함 확인.
- 게임 명칭·로고의 공식 배포판 오인 가능성 검토.
- 빌드/테스트 결과와 미구현 기능을 README에 정확히 표기.
