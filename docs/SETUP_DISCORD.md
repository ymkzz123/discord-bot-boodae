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

## 6. 다른 사용자의 앱 설치 차단

대상 서버에 설치를 마쳤다면 [Discord Developer Portal](https://discord.com/developers/applications)에서 다음 순서로 잠급니다.

1. 애플리케이션의 **Installation** 메뉴를 엽니다.
2. **Install Link**를 `None`으로 바꾸고 저장합니다.
3. **Bot** 메뉴를 엽니다.
4. **Public Bot**을 끄고 저장합니다.

순서를 반대로 하면 private application에 install 설정이 남아 있다는 오류가 날 수 있습니다. 이 설정은 신규 설치를 막고, 코드의 `DISCORD_ALLOWED_GUILD_IDS` 검사는 목록 밖 서버와 DM에서의 실행을 차단합니다. 봇이 이미 허용되지 않은 서버에 들어가 있다면 실행 시 자동으로 그 서버를 나갑니다.

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
/reset
```

`/search` 결과는 채널에 공개됩니다. 명령 정의가 Discord에 반영되도록 코드를 업데이트한 뒤 `npm run commands:register`를 다시 실행하세요.

`DISCORD_ALLOWED_GUILD_IDS`에 적힌 모든 서버에 명령이 바로 등록됩니다. 허용 서버 목록은 비워 둘 수 없습니다.

## 8. 계속 온라인으로 유지하기

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
