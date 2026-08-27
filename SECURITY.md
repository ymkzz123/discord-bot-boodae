# Security Policy

## 비밀 정보

- Discord bot token과 Gemini API key는 `.env` 또는 배포 환경의 Secret 기능에만 저장합니다.
- 토큰, API 키, 사용자 질문 원문을 로그에 기록하지 않습니다.
- PR, Issue, 스크린샷에 토큰이 노출되면 해당 메시지만 지우는 것으로 끝내지 말고 토큰을 즉시 재발급합니다.

## 최소 권한

이 봇은 `Guilds` intent만 요청합니다. Message Content privileged intent와 Administrator 권한은 필요하지 않습니다.

- `DISCORD_ALLOWED_GUILD_IDS` 밖 서버에서는 명령을 거부하고 자동으로 서버를 나갑니다.
- KBO 알림은 설정된 채널과 정확히 일치하는 역할 하나만 멘션하며 `@everyone`을 허용하지 않습니다.
- Jungol 기능은 공개 페이지의 요약 정보와 링크만 읽고 로그인·쿠키·CAPTCHA 우회를 사용하지 않습니다.

## 취약점 보고

공개 Issue에 비밀 정보나 악용 절차를 올리지 마세요. 저장소 소유자에게 GitHub Security Advisory의 비공개 보고 기능으로 전달하는 방식을 권장합니다.
