# Jungol 수집 정책과 점검 방법

이 봇의 Jungol 기능은 로그인하지 않은 사용자가 볼 수 있는 공개 웹페이지만 읽습니다.

- `/problem problem-id:<번호>`: 제목, 난이도, 해결·제출 수, 제한, 태그와 원문 링크
- `/tag query:<태그>`: 공개 문제 목록의 상위 10개 링크
- `/user handle:<이름>`: 공개 검색 결과의 상위 5개 계정 링크

문제 본문, 예제, 풀이, 제출 코드, 로그인 정보는 수집하거나 저장하지 않습니다. `robots.txt`는 2026-08-27 확인 기준 일반 사용자 에이전트에 `Allow: /`를 안내하고 검색 결과 및 짧은 참조 사용을 허용합니다. 이 정책이 바뀌면 수집기를 중지하거나 갱신해야 합니다.

## 부하와 보안 제한

- 기본 5분 캐시로 같은 요청 반복 방지
- 요청당 10초 타임아웃
- HTML 최대 3MB까지만 읽음
- 사용자 입력은 URL 경로에 직접 이어 붙이지 않고 `URL`과 `URLSearchParams`로 인코딩
- 문제 번호와 유저 핸들 형식 검증
- 로그인, CAPTCHA 우회, 비공개 API 또는 쿠키 사용 안 함
- 사이트 오류 페이지를 빈 검색 결과로 오인하지 않음

Jungol의 HTML 구조는 공식 API 계약이 아니므로 변경될 수 있습니다. 구조를 읽지 못하면 임의의 결과를 만들지 않고 `JUNGOL_INVALID_RESPONSE` 또는 `JUNGOL_UPSTREAM_FAILED`로 종료합니다.

## Discord 없이 점검

```bash
npm run jungol:smoke -- problem 1000
npm run jungol:smoke -- tag mst
npm run jungol:smoke -- user goodaiden
```
