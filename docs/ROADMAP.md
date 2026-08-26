# 로드맵

## v0.2 — Gemini 무료 검색 MVP

- [x] `/search`, `/reset`, `/ping`
- [x] 검색 수집과 답변 모델을 인터페이스로 분리
- [x] JSDOM 기반 DuckDuckGo/Naver/Bing 합성 검색 + Gemini 요약
- [x] 공개 답변과 출처 비노출 자연어 응답
- [x] Gemini·검색 공급자 오류 분류
- [ ] 실제 Discord 개발 서버에서 end-to-end 확인

## v0.3 — Jungol 문제 검색

- `/jungol problem:<번호 또는 검색어>` 명령
- 공통 `BrowserHttpClient` 위의 Jungol 전용 페이지 스크래퍼와 응답 스키마
- 문제 번호, 제목, 제한 조건 표시
- 사이트 요청 속도 제한과 짧은 캐시
- HTML fixture 기반 파서 테스트

## v0.4 — Jungol 태그 탐색

- `/jungol tags:<태그들>` 및 난이도·정렬 옵션
- 태그 동의어와 한글/영문 입력 정규화
- 여러 태그의 AND/OR 검색 정책
- 페이지네이션 버튼과 결과 중복 제거

## v0.5 — Naver Sports KBO

- Naver Sports 전용 경기 일정·결과 스크래퍼
- 팀, 날짜, 경기 상태를 구조화한 KBO 응답 스키마
- 사이트 fixture 기반 DOM 파서 회귀 테스트
- 일반 웹 검색 엔진과 스포츠 데이터 수집 로직 완전 분리

## 안정적 운영

- 공식 웹 검색 API로 교체 가능한 공급자 구현
- Redis 기반 대화 상태와 분산 속도 제한
- 서버별 쿼터, 캐시, 장애 관측성
- 검색 품질과 내부 근거 정확성 평가 세트

우선순위는 “사이트 정책을 지키는가”, “무료 한도에서 지속 가능한가”, “검색 근거가 실제 결과와 일치하는가”를 기준으로 정합니다.
