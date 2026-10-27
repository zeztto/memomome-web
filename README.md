# 메모모미

브라우저에 내용을 저장하는 한국어 메모장입니다. 계정이나 서버 API 없이 이 브라우저의 `localStorage`를 사용합니다.

## 실행

Node.js 22 이상과 npm이 필요합니다. CI는 Node.js 24를 사용합니다.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

개발 서버 주소는 terminal에 표시됩니다. 빌드 결과는 `dist/`에 생성되며 `npm run preview`로 확인할 수 있습니다. 정적 hosting에는 `dist/`를 배포하세요.

## 지원 기능

- 입력 내용을 1초 지연 후 자동 저장하고 새로고침 시 복원
- 제목을 붙여 최대 100개 메모 저장, 불러오기, 덮어쓰기, 삭제
- 본문 찾기·바꾸기, 실행 취소·다시 실행, 수정 내역 복원
- 현재 본문을 TXT·Markdown·HTML·JSON·CSV로 다운로드
- 문자·단어·줄 수 표시

파일 가져오기와 기기 간 동기화는 제공하지 않습니다. 제목을 붙여 저장하거나 덮어쓰는 메모 본문은 최대 1,000,000자, 제목은 최대 200자입니다. 작성 중 본문·자동 저장·찾기/바꾸기에는 이 본문 길이 제한이 적용되지 않습니다. 저장소 접근이 불가능하면 메모리 저장소로 전환되며 새로고침 시 내용이 사라진다는 알림을 표시합니다. 브라우저 데이터를 지우면 저장된 메모도 삭제되므로 필요한 내용은 파일로 보관하세요. CSV는 텍스트 형식으로 내보내며 수식으로 해석될 수 있는 시작 문자와 선행 제어·공백 패턴에 작은따옴표를 붙입니다. 원문을 그대로 보관하려면 TXT·Markdown·JSON을 사용하세요.

저장된 메모 목록 데이터가 손상되거나 읽기에 실패하면 원본 bytes를 보존하고 목록 저장·덮어쓰기·삭제를 차단하며 화면에 오류를 표시합니다. 현재 작성 중인 본문과 파일 다운로드는 계속 사용할 수 있습니다.

## 검증

```sh
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

회귀 test는 제목·본문 한도, HTML escaping, 잘못된 저장소 데이터와 중복 ID 거부를 확인합니다. 저장·검색·다섯 가지 다운로드는 실제 브라우저에서도 검증합니다.

## License

작성자 코드에는 [MIT License](LICENSE)가 적용됩니다. 포함된 UI 코드의 원 저작권 고지는 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)와 [THIRD_PARTY_LICENSES/shadcn-ui.txt](THIRD_PARTY_LICENSES/shadcn-ui.txt)에 유지합니다. 패키지별 license는 각 의존성에 적용됩니다.
