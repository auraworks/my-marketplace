# 환경변수 설정 가이드

## 필수 환경변수

`.env.local` 파일에 다음 변수를 설정합니다:

```env
# 포트원 V2 API 인증
PORTONE_API_SECRET=your_portone_api_secret

# 포트원 스토어 및 채널 (클라이언트용 - NEXT_PUBLIC_ 접두사 필수)
NEXT_PUBLIC_PORTONE_STORE_ID=store-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 값 확인 방법

### 1. PortOne 콘솔 접속

https://portone.io 에서 가입 후 로그인합니다.

### 2. API Secret 확인

1. 콘솔 > **내 계정** > **API 키** 페이지로 이동
2. `PortOne` 인증 스킴용 시크릿 키 확인
3. `PORTONE_API_SECRET`에 복사

> **중요**: API Secret은 서버 전용입니다. 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

### 3. Store ID 확인

1. 콘솔 > **상점관리** > **상점 목록** 페이지로 이동
2. 대표 상점의 Store ID를 복사
3. `NEXT_PUBLIC_PORTONE_STORE_ID`에 복사

> **스토어 ID를 찾는 방법**: 포트원 콘솔 접속 후 좌측 메뉴의 "상점관리" > "상점 목록"에서 확인할 수 있습니다. 스토어 ID는 `store-`로 시작하는 UUID 형식입니다.

### 4. Channel Key 확인

1. 콘솔 > **상점관리** > **채널** 페이지로 이동
2. KG이니시스 통합인증용 채널의 Channel Key를 복사
3. `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`에 복사

> **채널이 없는 경우**: 포트원 콘솔에서 새 채널을 추가해야 합니다. PG사로 "KG이니시스"를 선택하고 통합인증(Inicis Unified)을 활성화하세요.

## 스토어/채널 설정 참고 자료

스토어 ID나 채널 설정에 어려움이 있는 경우 아래 가이드를 참고하세요:

- **KG이니시스 본인인증 PortOne 연동 가이드**: https://velog.io/@ljj3347/KG%EC%9D%B4%EB%8B%88%EC%8B%9C%EC%8A%A4-%EB%B3%B8%EC%9D%B8%EC%9D%B8%EC%A6%9D-by-Portone
- **포트원 개발자센터**: https://developers.portone.io

## 환경변수 보안

| 변수 | 노출 범위 | 비고 |
|------|-----------|------|
| `PORTONE_API_SECRET` | 서버 전용 | 절대 클라이언트에 노출 금지 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | 클라이언트 | `NEXT_PUBLIC_` 접두사로 브라우저에 노출됨 |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | 클라이언트 | `NEXT_PUBLIC_` 접두사로 브라우저에 노출됨 |

`.env.local` 파일은 `.gitignore`에 포함되어 있는지 반드시 확인하세요.
