# Discord 설정 가이드

## 1. 애플리케이션과 봇 만들기

1. [Discord Developer Portal](https://discord.com/developers/applications)을 엽니다.
2. **New Application**으로 애플리케이션을 만듭니다.
3. **General Information**의 **Application ID**를 `.env`의 `DISCORD_CLIENT_ID`에 넣습니다.
4. **Bot** 메뉴에서 봇을 생성하고 토큰을 발급합니다.
5. 토큰을 `.env`의 `DISCORD_TOKEN`에 넣습니다.

토큰은 비밀번호와 같습니다. 채팅, 스크린샷, 커밋, 로그에 붙여 넣지 마세요. 노출되었다면 Developer Portal에서 즉시 재발급해야 합니다.

이 프로젝트는 슬래시 명령만 사용하므로 **Message Content Intent**를 켤 필요가 없습니다.

## 2. 개발 서버 ID 준비

Discord 앱의 사용자 설정에서 **고급 > 개발자 모드**를 켠 뒤, 테스트할 서버를 우클릭하여 **서버 ID 복사**를 선택합니다. 이 값을 `.env`의 `DISCORD_GUILD_ID`에 넣으면 슬래시 명령 변경이 개발 서버에 빠르게 반영됩니다.

## 3. 봇을 서버에 초대하기

Developer Portal의 **OAuth2 > URL Generator**에서 다음을 선택합니다.

- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`

생성된 URL을 열어 본인이 관리하거나 초대 권한이 있는 테스트 서버를 선택합니다. 관리자 권한은 필요하지 않습니다.

## 4. 환경 변수 작성

```bash
cp .env.example .env
```

```dotenv
DISCORD_CLIENT_ID=숫자로_된_Application_ID
DISCORD_TOKEN=발급받은_봇_토큰
DISCORD_GUILD_ID=개발_서버_ID
OPENAI_API_KEY=OpenAI_API_키
OPENAI_MODEL=gpt-5.5
```

Codespaces에서는 장기적으로 `.env` 파일보다 Codespaces Secrets를 사용하는 편이 안전합니다. Secrets 이름을 위 환경 변수와 동일하게 만들면 됩니다.

## 5. 명령 등록과 실행

```bash
npm install
npm run commands:register
npm run dev
```

봇 로그에 `Discord bot is ready`가 표시된 뒤 Discord에서 다음을 시험합니다.

```text
/ping
/search query:오늘 주요 AI 뉴스를 출처와 함께 알려줘
/search query:그중 가장 중요한 변화는 뭐야? private:true
/reset
```

## 자주 생기는 문제

### 슬래시 명령이 보이지 않음

- 개발 중에는 `DISCORD_GUILD_ID`를 설정했는지 확인합니다.
- `npm run commands:register`를 다시 실행합니다.
- 봇 초대 시 `applications.commands` scope가 포함됐는지 확인합니다.

### `Used disallowed intents` 오류

Developer Portal의 privileged intent와 코드가 어긋날 때 발생합니다. 이 프로젝트는 `Guilds` intent만 사용하므로 코드를 변경하지 않았다면 privileged intent를 모두 꺼도 됩니다.

### `401` 또는 `Invalid Token`

`.env`의 `DISCORD_TOKEN` 앞뒤 공백과 토큰 재발급 여부를 확인합니다. 토큰을 로그에 출력하지 마세요.

### OpenAI 검색 오류

- `OPENAI_API_KEY`가 올바른지 확인합니다.
- API 프로젝트의 사용 한도와 모델 접근 권한을 확인합니다.
- 일시적 오류는 SDK가 두 번까지 재시도합니다.
