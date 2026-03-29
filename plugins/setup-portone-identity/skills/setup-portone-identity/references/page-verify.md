# 인증 시작 페이지

## 파일 위치

`app/auth/portone/verify/page.tsx`

## 전체 코드

```typescript
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PortOne from "@portone/browser-sdk/v2";

export default function PortOneVerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startIdentityVerification = async () => {
    setLoading(true);
    setError(null);

    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

    if (!storeId || !channelKey) {
      setError(
        "포트원 연동 설정이 누락되었습니다. 관리자에게 문의해 주세요."
      );
      setLoading(false);
      return;
    }

    // 고유한 본인인증 건 ID 생성
    const identityVerificationId = `portone-iv-${crypto.randomUUID()}`;

    try {
      const response = await PortOne.requestIdentityVerification({
        storeId,
        channelKey,
        identityVerificationId,
        bypass: {
          inicisUnified: {
            flgFixedUser: "N",
          },
        },
      });

      if (!response || response.code) {
        throw new Error(
          response?.message || `인증 실패 (${response?.code ?? "UNKNOWN"})`
        );
      }

      // 인증 성공 시 결과 페이지로 이동
      router.push(
        `/auth/portone/complete?identityVerificationId=${response.identityVerificationId}`
      );
    } catch (err: any) {
      console.error("PortOne Identity Verification Error:", err);
      setError(
        err.message || "본인인증을 완료하지 못했습니다. 다시 시도해 주세요."
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
        <div className="p-8 text-center flex flex-col gap-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
            <svg
              className="h-10 w-10 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              본인인증이 필요합니다
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              안전한 서비스 이용을 위해<br />
              KG이니시스 통합인증으로 본인임을 확인해 주세요.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={startIdentityVerification}
            disabled={loading}
            className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#0064ff] py-4 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 dark:shadow-blue-900/20`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx={12}
                    cy={12}
                    r={10}
                    stroke="currentColor"
                    strokeWidth={4}
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                인증 요청 중...
              </span>
            ) : (
              "KG이니시스로 본인인증하기"
            )}
          </button>

          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            네이버, PASS, 토스, 카카오, 금융인증서 등<br />
            다양한 인증 수단을 지원합니다.
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-1.5 opacity-50">
        <span className="h-1 w-1 rounded-full bg-zinc-400"></span>
        <span className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase">
          Powered by PortOne
        </span>
        <span className="h-1 w-1 rounded-full bg-zinc-400"></span>
      </div>
    </div>
  );
}
```

## 핵심 구현 포인트

### 1. SDK 임포트

```typescript
import PortOne from "@portone/browser-sdk/v2";
```

V2 SDK를 사용합니다. V1과 import 경로가 다릅니다.

### 2. identityVerificationId 생성

```typescript
const identityVerificationId = `portone-iv-${crypto.randomUUID()}`;
```

고유 ID를 생성하여 인증 건을 추적합니다. 이 ID는 결과 조회 시 사용됩니다.

### 3. KG이니시스 통합인증 bypass 설정

```typescript
bypass: {
  inicisUnified: {
    flgFixedUser: "N",
  },
},
```

`flgFixedUser: "N"`은 고정 사용자(테스트 사용자) 모드를 비활성화합니다. 실제 본인인증을 수행하려면 `"N"`으로 설정하세요.

### 4. 에러 처리

- SDK 호출 전: 환경변수 누락 체크
- SDK 호출 중: `response.code`가 존재하면 에러로 처리
- SDK 호출 후: `catch`에서 네트워크/런타임 에러 처리

### 5. 페이지 이동

인증 성공 시 `identityVerificationId`를 쿼리 파라미터로 전달하여 결과 페이지로 이동합니다.
