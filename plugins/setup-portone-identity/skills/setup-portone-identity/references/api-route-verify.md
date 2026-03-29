# API 라우트: 본인인증 결과 검증

## 파일 위치

`app/api/portone/auth/verify/route.ts`

## 전체 코드

```typescript
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { identityVerificationId } = await req.json();

  if (!identityVerificationId) {
    return NextResponse.json(
      { error: "identityVerificationId가 필요합니다." },
      { status: 400 }
    );
  }

  const API_SECRET = process.env.PORTONE_API_SECRET;

  if (!API_SECRET) {
    return NextResponse.json(
      { error: "PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `PortOne ${API_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "본인인증 결과 조회에 실패했습니다." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("PortOne Identity Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## 핵심 구현 포인트

### 1. PortOne 인증 스킴

API 호출 시 `Bearer`가 아닌 `PortOne` 인증 스킴을 사용합니다:

```typescript
Authorization: `PortOne ${API_SECRET}`
```

### 2. identityVerificationId 인코딩

URL에 ID를 안전하게 포함하기 위해 `encodeURIComponent`를 사용합니다.

### 3. 응답 구조

PortOne API 응답 예시:

```json
{
  "id": "iv_xxxxxxxxxxxx",
  "status": "VERIFIED",
  "verifiedCustomer": {
    "name": "홍길동",
    "gender": "남",
    "birthDate": "19900101",
    "phoneNumber": "01012345678",
    "isForeigner": false,
    "ci": "CIxxxxxxxxxx..."
  }
}
```

### 4. 에러 처리

- **400**: `identityVerificationId` 누락
- **500**: API Secret 미설정
- **API 에러**: PortOne API 응답 코드 그대로 전달

## 보안 고려사항

- `PORTONE_API_SECRET`은 서버 전용 환경변수로, `NEXT_PUBLIC_` 접두사를 사용하지 않습니다
- 클라이언트에서 직접 PortOne API를 호출하지 않습니다 (Secret 노출 방지)
- API 라우트에서만 PortOne API를 호출합니다
