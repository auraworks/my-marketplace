---
name: setup-portone-identity
description: 포트원(PortOne) V2 KG이니시스 통합인증 본인인증을 Next.js 프로젝트에 통합합니다. 클라이언트 SDK 인증 요청, 서버 API 결과 검증, 인증 완료 페이지, 환경변수 설정까지 전체 플로우를 자동 구현합니다. Make sure to use this skill whenever the user mentions 포트원, PortOne, KG이니시스, 본인인증, identity verification, 통합인증, inicis, 신원확인, 또는 결제/인증 PG 연동과 관련된 본인확인 기능을 추가하려고 할 때. Next.js App Router 기반의 TypeScript 프로젝트에서 작동합니다.
---

# 포트원 V2 KG이니시스 통합인증 본인인증

포트원(PortOne) V2 SDK와 API를 사용해 Next.js App Router 프로젝트에 KG이니시스 통합인증 본인인증을 통합합니다.

이 스킬은 클라이언트에서 인증을 요청하고, 서버에서 PortOne API로 결과를 검증하는 전체 엔드-투-엔드 흐름을 구현합니다.

## 자동 실행 지침

이 스킬이 호출되면 다음 단계를 순서대로 수행합니다:

### Step 1: 포트원 MCP로 최신 문서 확인

포트원 MCP 도구를 사용해 구현에 필요한 최신 API 스펙을 확인합니다:

1. `readPortoneV2FrontendCode`로 프론트엔드 코드 예제 확인 (framework: react, pg: inicis, pay_method: identityVerification)
2. `readPortoneV2BackendCode`로 백엔드 코드 예제 확인 (framework: express, pg: inicis, pay_method: identityVerification)

MCP 도구를 사용할 수 없는 경우 `references/` 디렉토리의 템플릿 코드를 사용합니다.

### Step 2: 프로젝트 환경 파악

다음을 확인합니다:

- **프레임워크**: Next.js App Router (TypeScript)
- **패키지 매니저**: `package-lock.json`이 있으면 npm, `pnpm-lock.yaml`이 있으면 pnpm, `yarn.lock`이 있으면 yarn
- **스타일링**: 프로젝트의 기존 패턴을 따름 (Tailwind CSS 권장)
- **기존 라우트**: `app/api/`와 `app/auth/` 디렉토리 구조 확인

### Step 3: 환경변수 설정

`.env.local` 파일을 읽어서 다음 변수가 있는지 확인합니다:

```env
PORTONE_API_SECRET=your_portone_api_secret
NEXT_PUBLIC_PORTONE_STORE_ID=store-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

환경변수가 없으면 `.env.local` 파일을 생성하고 사용자에게 값을 안내합니다. 안내 시 다음 정보를 포함하세요:

> **스토어 ID / 채널 키를 찾는 방법**:
> 1. https://portone.io 에서 포트원 콘솔 접속
> 2. 좌측 메뉴 "상점관리" > "상점 목록"에서 Store ID 확인 (`store-`로 시작하는 UUID)
> 3. "채널" 메뉴에서 KG이니시스 통합인증용 채널의 Channel Key 확인
> 4. "내 계정" > "API 키"에서 API Secret 확인
>
> 자세한 설정 가이드: https://velog.io/@ljj3347/KG%EC%9D%B4%EB%8B%88%EC%8B%9C%EC%8A%A4-%EB%B3%B8%EC%9D%B8%EC%9D%B8%EC%A6%9D-by-Portone

### Step 4: SDK 설치

`package.json`을 확인하여 `@portone/browser-sdk`가 있는지 검사합니다. 없으면 설치합니다:

```bash
npm install @portone/browser-sdk
```

### Step 5: API 라우트 생성

`app/api/portone/auth/verify/route.ts` 파일을 생성합니다.

핵심 구현 사항:
- `POST` 메서드로 `identityVerificationId`를 받아 PortOne API에서 결과 조회
- 인증 스킴: `PortOne ${API_SECRET}` (Bearer가 아님)
- API 엔드포인트: `https://api.portone.io/identity-verifications/${id}`
- `PORTONE_API_SECRET` 환경변수 사용 (서버 전용, `NEXT_PUBLIC_` 없음)

상세 코드는 `references/api-route-verify.md`를 참조하세요.

### Step 6: 인증 시작 페이지 생성

`app/auth/portone/verify/page.tsx` 파일을 생성합니다.

핵심 구현 사항:
- `"use client"` 지시어 필수
- `import PortOne from "@portone/browser-sdk/v2"` 사용
- `identityVerificationId` = `portone-iv-${crypto.randomUUID()}` 형식으로 고유 ID 생성
- KG이니시스 통합인증 bypass 설정: `bypass.inicisUnified.flgFixedUser: "N"`
- 인증 성공 시 `/auth/portone/complete?identityVerificationId=...`로 라우팅
- 프로젝트의 기존 UI 패턴과 스타일을 따르세요

상세 코드는 `references/page-verify.md`를 참조하세요.

### Step 7: 인증 완료 페이지 생성

`app/auth/portone/complete/page.tsx` 파일을 생성합니다.

핵심 구현 사항:
- `"use client"` 지시어 필수
- `useSearchParams()` 사용 시 반드시 `Suspense`로 래핑
- 쿼리 파라미터에서 `identityVerificationId` 추출
- `/api/portone/auth/verify` API로 결과 조회 (서버 경유)
- `status === "VERIFIED"`일 때 인증 성공 UI 표시
- 인증 정보: 성명, 생년월일, 성별, 연락처, 신원코드

상세 코드는 `references/page-complete.md`를 참조하세요.

### Step 8: 완료 안내

사용자에게 다음 정보를 제공합니다:

- 생성된 파일 목록 (3개)
- 환경변수 설정 상태
- `npm run dev`로 테스트 가능함
- 인증 플로우: `/auth/portone/verify` 접속 > 인증 수행 > `/auth/portone/complete`에서 결과 확인

## 인증 플로우

```
사용자                     브라우저(Next.js)              PortOne               KG이니시스
  |                            |                          |                      |
  |-- 본인인증 클릭 ---------->|                          |                      |
  |                            |-- SDK 호출 ------------->|                      |
  |                            |   requestIdentityVerif.  |                      |
  |                            |                          |-- 통합인증 요청 ----->|
  |                            |                          |                      |
  |                            |                     [팝업/리다이렉트]          |
  |<-- 인증 수단 선택 ---------|                          |                      |
  |                            |                          |                      |
  |                            |<-- 인증 결과 ------------|                      |
  |                            |                          |                      |
  |                            |-- /auth/portone/complete |                      |
  |                            |-- API로 결과 검증 ------>|                      |
  |                            |   GET identity-verif.    |                      |
  |                            |<-- VERIFIED 데이터 ------|                      |
  |<-- 인증 정보 표시 ---------|                          |                      |
```

## 핵심 기술 사양

### SDK

| 항목 | 값 |
|------|-----|
| 패키지 | `@portone/browser-sdk` |
| 임포트 | `import PortOne from "@portone/browser-sdk/v2"` |
| 메서드 | `PortOne.requestIdentityVerification()` |

### API

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `https://api.portone.io/identity-verifications/{id}` |
| 메서드 | `GET` |
| 인증 | `PortOne {API_SECRET}` (Bearer 아님) |
| Content-Type | `application/json` |

### bypass 설정

```typescript
bypass: {
  inicisUnified: {
    flgFixedUser: "N",  // "N": 실제 본인인증, "Y": 고정 사용자(테스트)
  },
}
```

### 응답 데이터 구조

```typescript
{
  id: string;                    // 인증 건 ID (iv_xxx...)
  status: "VERIFIED" | "FAILED";
  verifiedCustomer?: {
    name: string;                // 성명
    gender: string;              // 남/여
    birthDate: string;           // YYYYMMDD
    phoneNumber?: string;        // 01012345678
    isForeigner: boolean;
    ci: string;                  // CI 연계 정보
  };
}
```

## 파일 구조

구현 완료 후 프로젝트에 다음 파일이 추가됩니다:

```
app/
├── api/portone/auth/verify/
│   └── route.ts          # 서버: PortOne API로 결과 검증
└── auth/portone/
    ├── verify/
    │   └── page.tsx      # 클라이언트: 인증 시작 페이지
    └── complete/
        └── page.tsx      # 클라이언트: 인증 완료 페이지
```

## 커스터마이징

### 인증 페이지 경로 변경

기본 경로 `/auth/portone/verify`, `/auth/portone/complete` 대신 다른 경로를 사용하려면:
- verify 페이지에서 `router.push()`의 경로를 변경
- complete 페이지를 새 경로에 생성
- API 라우트 경로도 함께 변경

### UI 스타일 변경

`references/page-verify.md`와 `references/page-complete.md`의 코드는 Tailwind CSS 기반입니다. 프로젝트의 디자인 시스템에 맞게 클래스를 수정하세요.

### 추가 처리 (인증 후)

인증 완료 페이지의 `useEffect`에서 API 응답을 받은 후 추가 로직을 수행할 수 있습니다:
- 인증 결과를 데이터베이스에 저장
- 세션/토큰 업데이트
- 다음 단계로 리다이렉트

## 문제 해결

### "포트원 연동 설정이 누락되었습니다"
- `.env.local`에 `NEXT_PUBLIC_PORTONE_STORE_ID`와 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`가 있는지 확인
- 환경변수 추가 후 개발 서버 재시작 필요

### "PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다"
- `.env.local`에 `PORTONE_API_SECRET`가 있는지 확인 (접두사 없음)

### "본인인증 결과 조회에 실패했습니다"
- `identityVerificationId`가 올바르게 전달되었는지 확인
- PortOne 콘솔에서 API Secret이 유효한지 확인

### SDK 임포트 에러
- `@portone/browser-sdk` 패키지가 설치되어 있는지 확인
- Node.js 18 이상 사용 권장

### 스토어 ID / 채널 키를 찾을 수 없는 경우

1. https://portone.io 에서 포트원 콘솔 접속
2. 좌측 메뉴 "상점관리" > "상점 목록"에서 Store ID 확인
3. "채널" 메뉴에서 채널 Key 확인 (KG이니시스 통합인증 채널이 필요)
4. 채널이 없으면 새로 생성: PG사 "KG이니시스" 선택 > 통합인증 활성화

> **참고 가이드**: https://velog.io/@ljj3347/KG%EC%9D%B4%EB%8B%88%EC%8B%9C%EC%8A%A4-%EB%B3%B8%EC%9D%B8%EC%9D%B8%EC%A6%9D-by-Portone
