# 아키텍처

## 설계 목표

- 검색 MVP는 작게 유지하되, 음악·일정·게임 정보 같은 기능을 독립 모듈로 추가할 수 있어야 합니다.
- Discord 이벤트 코드가 OpenAI SDK 세부 구현에 직접 묶이지 않게 합니다.
- 사용자의 일반 메시지를 수집하지 않고 명시적인 슬래시 명령만 처리합니다.
- 웹 출처는 Discord에서 클릭 가능한 형태로 보입니다.

## 요청 흐름

1. `discord.js`가 `/search` interaction을 받습니다.
2. 사용자별 고정 윈도우 속도 제한을 확인합니다.
3. 3초 내 Discord 응답 제한을 피하기 위해 먼저 defer합니다.
4. `WebSearchService`가 Responses API를 `web_search` 도구와 함께 호출합니다.
5. URL citation annotation을 Markdown 링크와 출처 목록으로 변환합니다.
6. Discord 2,000자 제한에 맞춰 여러 메시지로 나눕니다.
7. response ID를 사용자·채널 기준으로 잠시 저장해 후속 검색에 사용합니다.

## 모듈 경계

| 모듈 | 책임 | 교체 시점 |
|---|---|---|
| `bot` | Discord 입력/출력과 명령 라우팅 | Discord UI가 바뀔 때 |
| `openai` | 검색 요청과 citation 처리 | 모델 제공자/검색 전략이 바뀔 때 |
| `state` | 후속 대화 식별자 보관 | 다중 인스턴스로 확장할 때 |
| `security` | 남용 방지 | Redis 기반 분산 제한이 필요할 때 |
| `config` | 시작 전 환경 검증 | 배포 환경이 추가될 때 |

## 상태와 개인정보

메모리에는 질문 원문이 아니라 OpenAI response ID와 만료 시각만 보관합니다. 기본 TTL은 30분이며 프로세스가 재시작되면 사라집니다. Responses API 요청에는 `store: true`가 사용되므로 운영 전에 조직의 데이터 정책과 OpenAI 프로젝트 설정을 확인하세요.

## 확장 패턴

새 기능은 `src/integrations` 아래 서비스로 추가하고, Discord handler에는 얇은 조정 코드만 둡니다. DB가 필요해지면 현재 클래스의 호출부를 유지하는 `ConversationStore` 인터페이스를 도입한 뒤 Redis 구현으로 바꾸는 것이 첫 확장 단계입니다.
