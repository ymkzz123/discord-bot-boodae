# Discord 서버 설치 가이드

이 프로젝트는 Discord Gateway에 연결되는 봇입니다. 정상 사용하려면 다음 세 가지가 모두 필요합니다.

1. Discord Developer Portal의 애플리케이션과 봇 토큰
2. 대상 서버에 봇을 설치하는 OAuth2 승인
3. 봇 프로세스의 지속적인 실행

`https://discord.gg/...` 형식은 일반 사용자를 서버에 초대하는 링크입니다. 봇 계정은 이 링크를 열거나 수락할 수 없으며 OAuth2 설치 링크를 사용해야 합니다.

## 1. 애플리케이션과 봇 만들기

1. [Discord Developer Portal](https://discord.com/developers/applications)을 엽니다.
2. **New Application**을 눌러 애플리케이션을 만듭니다.
3. **General Information**에서 **Application ID**를 복사합니다.
4. **Bot** 메뉴를 열어 봇 사용자가 있는지 확인합니다.
5. **Reset Token**으로 봇 토큰을 발급합니다.

토큰은 비밀번호와 같습니다. 채팅, 스크린샷, Issue, 커밋, 로그에 붙여 넣지 마세요. 노출되었다면 Developer Portal에서 즉시 재발급해야 합니다.

이 프로젝트는 슬래시 명령만 사용하므로 **Message Content Intent**, **Server Members Intent**, **Presence Intent**를 켤 필요가 없습니다.

## 2. 최초 서버 설치 설정

아직 대상 서버에 봇을 설치하지 않은 경우에만 Developer Portal의 **Installation** 메뉴에서 다음을 설정합니다.

- Installation Contexts: **Guild Install** 활성화
- Install Link: **Discord Provided Link**
- Guild Install Scopes: `applications.commands`, `bot`
- Bot Permissions: `View Channels`, `Send Messages`, `Send Messages in Threads`

애플리케이션의 **Bot** 메뉴에서는 **Public Bot**을 켭니다. Discord에서 이 스위치는 봇을 아무 서버에서나 사용할 수 있다는 뜻이 아니라, 애플리케이션 소유자가 아닌 사용자도 자신이 관리하는 서버에 설치를 승인할 수 있다는 뜻입니다. 실제 사용 서버는 코드의 `DISCORD_ALLOWED_GUILD_IDS`가 제한합니다.

관리자 권한은 요청하지 않습니다. 특정 채널에서 응답하지 못한다면 서버의 채널 권한에서 봇 역할에 `View Channel`과 `Send Messages`가 허용되어 있는지 확인하세요.

## 3. 대상 서버 ID 복사

봇을 설치하려는 Discord 서버에 본인 계정으로 먼저 들어가 있어야 합니다. 또한 그 서버에서 **서버 관리(Manage Server)** 권한이 있어야 앱을 설치할 수 있습니다.

1. Discord 사용자 설정의 **고급 > 개발자 모드**를 켭니다.
2. 대상 서버 아이콘을 우클릭합니다.
3. **서버 ID 복사**를 선택합니다.

서버 초대 코드와 서버 ID는 서로 다른 값입니다. 여러 서버를 허용하려면 각각의 숫자 서버 ID를 복사합니다.

## 4. 환경 변수 설정

```bash
cp .env.example .env
```

```dotenv
DISCORD_CLIENT_ID=숫자로_된_Application_ID
DISCORD_TOKEN=발급받은_봇_토큰
DISCORD_ALLOWED_GUILD_IDS=첫번째_서버_ID,두번째_서버_ID
GEMINI_API_KEY=Google_AI_Studio에서_발급한_키
GEMINI_MODEL=gemini-3.1-flash-lite
```

Codespaces에서는 장기적으로 `.env` 파일보다 Codespaces Secrets를 사용하는 편이 안전합니다. Secret 이름을 위 환경 변수 이름과 동일하게 지정하세요. 토큰이나 API 키를 이 저장소에 커밋하면 안 됩니다.

## 5. 봇 설치 링크 생성

```bash
npm install
npm run invite:url
```

허용 서버별로 출력된 `https://discord.com/oauth2/authorize?...` URL을 브라우저에서 하나씩 엽니다. 각 URL은 대상 서버가 미리 선택되고 다른 서버로 변경할 수 없습니다.

Discord 승인 화면에서 권한을 확인하고 **승인**합니다. 설치할 서버가 목록에 없다면 현재 Discord 계정에 그 서버의 **서버 관리** 권한이 없는 것입니다.

## 6. 허용 서버의 다른 관리자에게 설치 링크 전달

`npm run invite:url`이 출력한 링크는 서버 ID가 고정되어 있습니다. 허용 서버별 링크 중 필요한 링크만, 그 서버에서 **서버 관리(Manage Server)** 권한이 있는 사람에게 전달합니다.

- Developer Portal의 **Bot > Public Bot**: 켬
- **Installation > Guild Install**: 켬
- 전달받은 사람에게 대상 서버의 **서버 관리** 권한 필요
- URL의 서버 선택은 고정되어 다른 서버로 바꿀 수 없음

누군가 URL의 값을 수정해 다른 서버에 설치하더라도 봇은 `DISCORD_ALLOWED_GUILD_IDS` 밖 서버에서 명령을 거부하고 즉시 그 서버를 나갑니다. 따라서 포털의 설치 권한과 코드의 서버 화이트리스트를 함께 사용합니다.

## 7. 슬래시 명령 등록과 실행

```bash
npm run commands:register
npm run dev
```

로그에 `Discord bot is ready`가 표시된 뒤 대상 서버에서 시험합니다.

```text
/ping
/search query:오늘 주요 AI 뉴스를 자연스럽게 정리해줘
/search query:그중 가장 중요한 변화는 뭐야?
/problem problem-id:1000
/tag query:mst
/user handle:goodaiden
/kboplayer
/reset
```

`/search` 결과는 채널에 공개됩니다. 명령 정의가 Discord에 반영되도록 코드를 업데이트한 뒤 `npm run commands:register`를 다시 실행하세요.

`DISCORD_ALLOWED_GUILD_IDS`에 적힌 모든 서버에 명령이 바로 등록됩니다. 허용 서버 목록은 비워 둘 수 없습니다.

## 8. KBO 자동 알림 설정

Discord에서 알림을 보낼 채널을 우클릭해 **채널 ID 복사**를 누르고 `.env`에 입력합니다. 여러 채널은 쉼표로 구분합니다.

```dotenv
KBO_ALERT_CHANNEL_IDS=첫번째_채널_ID,두번째_채널_ID
KBO_ALERT_ROLE_NAME=야구
```

각 채널이 속한 서버에는 이름이 정확히 `야구`인 역할이 하나만 있어야 합니다. 역할 설정에서 **누구나 이 역할을 @mention할 수 있도록 허용**을 켜거나, 해당 채널에서 봇이 그 역할을 멘션할 수 있게 권한을 설정하세요. 봇은 `@everyone`이나 다른 역할은 멘션하지 않습니다.

- 예정 시각이 되면 같은 시각의 여러 경기를 묶어 `플레이볼!`을 한 번 전송
- 진행 중인 한화 경기의 실제 현재 투수가 김서현이면 `# 44 ALERT` 전송
- 경기·채널별 전송 기록을 `.data/kbo-alert-state.json`에 저장해 재시작 중복 방지
- Docker Compose는 `bot-state` 볼륨에 이 기록을 보존
- 경기 중 또는 시작 1시간 전에는 기본 30초, 그 외에는 5분 간격으로 확인

채널 ID가 비어 있으면 자동 알림 기능만 꺼지고 다른 명령은 정상 작동합니다.

## 9. 계속 온라인으로 유지하기

`npm run dev`가 실행 중인 터미널을 닫거나 Codespace가 중지되면 봇도 오프라인이 됩니다. 테스트할 때는 Codespace를 켜 둬도 되지만, 상시 운영할 때는 Docker를 실행할 수 있는 지속형 서버에 배포해야 합니다.

```bash
docker compose up --build -d
docker compose logs -f bot
```

## 자주 생기는 문제

### 슬래시 명령이 보이지 않음

- `DISCORD_ALLOWED_GUILD_IDS`가 쉼표로 구분된 올바른 숫자 서버 ID 목록인지 확인합니다.
- `npm run commands:register`를 다시 실행합니다.
- 설치 scope에 `applications.commands`가 포함됐는지 확인합니다.

### 봇이 오프라인으로 표시됨

- `npm run dev`가 계속 실행 중인지 확인합니다.
- 로그에 `Discord bot is ready`가 있는지 확인합니다.
- `DISCORD_TOKEN`이 최근 재발급된 토큰과 같은지 확인합니다.

### `Used disallowed intents` 오류

이 프로젝트는 `Guilds` intent만 사용합니다. 코드를 변경하지 않았다면 Developer Portal의 privileged intent를 모두 꺼도 됩니다.

### `401` 또는 `Invalid Token`

`.env`의 `DISCORD_TOKEN` 앞뒤 공백과 토큰 재발급 여부를 확인합니다. 토큰을 로그에 출력하지 마세요.

### Gemini 또는 웹 검색 오류

- `GEMINI_API_KEY`가 올바른지, Google AI Studio에서 선택한 프로젝트의 키인지 확인합니다.
- 무료 티어의 요청 한도와 `GEMINI_MODEL`의 사용 가능 여부를 확인합니다.
- `SEARCH_PROVIDER`는 DuckDuckGo, Naver, Bing 검색 엔진이 모두 차단되거나 요청에 실패한 경우입니다. 실행 로그의 `Search pipeline exhausted` 뒤에 표시되는 엔진별 상태를 확인합니다.
- `SEARCH_NO_RESULTS`가 계속되면 최신 코드를 받은 뒤 `npm install`을 실행했는지 확인합니다. 새 검색 계층은 JSDOM을 사용합니다.
- Discord에 표시된 `SEARCH_AUTH`, `SEARCH_QUOTA`, `SEARCH_MODEL`, `SEARCH_TIMEOUT` 등의 안전한 오류 코드를 기준으로 설정을 점검합니다.
- 정확한 원인은 봇을 실행한 터미널에서 `Search failed` 로그를 확인합니다. API 키나 Discord 토큰은 공유하지 마세요.

검색 계층만 따로 재현하려면 다음을 실행합니다.

```bash
npm run search:smoke -- 류현진
npm run search:smoke -- 드래곤빌리지
```
