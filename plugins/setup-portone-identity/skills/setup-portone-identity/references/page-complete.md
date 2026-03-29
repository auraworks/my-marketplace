# 인증 완료 페이지

## 파일 위치

`app/auth/portone/complete/page.tsx`

## 전체 코드

```typescript
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface VerifiedCustomer {
  name: string;
  gender: string;
  birthDate: string;
  phoneNumber: string;
  isForeigner: boolean;
  ci: string;
}

interface ResultData {
  id: string;
  status: string;
  verifiedCustomer?: VerifiedCustomer;
}

function ResultContent() {
  const searchParams = useSearchParams();
  const identityVerificationId = searchParams.get("identityVerificationId");
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      if (!identityVerificationId) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/portone/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identityVerificationId }),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "본인인증 결과 조회에 실패했습니다.");
        } else {
          setResult(data);
        }
      } catch (e) {
        setError("서버와 통신 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [identityVerificationId]);

  if (loading) {
    return (
      <div className="flex animate-pulse flex-col gap-4 text-center">
        <div className="h-10 w-48 rounded bg-zinc-200 dark:bg-zinc-800 mx-auto" />
        <div className="h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-800 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all duration-500">
        <div className="p-10 text-center flex flex-col gap-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 shadow-inner">
            <svg className="h-12 w-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">조회 실패</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
          </div>
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-2xl bg-[#0064ff] py-4 text-sm font-bold text-white shadow-[0_10px_20px_-5px_rgba(0,100,255,0.4)] transition-all hover:bg-blue-600 hover:shadow-blue-600/30 active:scale-[0.98]"
          >
            메인화면으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = result?.status === "VERIFIED";

  return (
    <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all duration-500">
      <div className="p-10 text-center flex flex-col gap-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 shadow-inner">
          {isVerified ? (
            <svg className="h-12 w-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-12 w-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isVerified ? "인증 성공!" : "인증 실패"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isVerified
              ? "본인 확인 절차가 무사히 완료되었습니다."
              : "본인 확인 중 오류가 발생했습니다."}
          </p>
        </div>

        {isVerified && result?.verifiedCustomer && (
          <div className="space-y-3 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-800/40 text-left border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              인증 정보
            </h3>
            <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-3 items-center pt-2">
              <span className="text-xs font-medium text-zinc-400">성명</span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {result.verifiedCustomer.name}
              </span>
              <span className="text-xs font-medium text-zinc-400">생년월일</span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tracking-wider">
                {result.verifiedCustomer.birthDate}
              </span>
              <span className="text-xs font-medium text-zinc-400">성별</span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {result.verifiedCustomer.gender}
              </span>
              {result.verifiedCustomer.phoneNumber && (
                <>
                  <span className="text-xs font-medium text-zinc-400">연락처</span>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {result.verifiedCustomer.phoneNumber}
                  </span>
                </>
              )}
              <span className="text-xs font-medium text-zinc-400">신원코드</span>
              <span className="text-[10px] font-mono font-medium text-zinc-400 truncate tracking-tight bg-zinc-200/50 dark:bg-zinc-700/50 px-2 py-1 rounded">
                IV-{result.id.slice(0, 12)}...
              </span>
            </div>
          </div>
        )}

        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-2xl bg-[#0064ff] py-4 text-sm font-bold text-white shadow-[0_10px_20px_-5px_rgba(0,100,255,0.4)] transition-all hover:bg-blue-600 hover:shadow-blue-600/30 active:scale-[0.98]"
        >
          메인화면으로 이동
        </Link>
      </div>
    </div>
  );
}

export default function PortOneResultPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <ResultContent />
      </Suspense>
    </div>
  );
}
```

## 핵심 구현 포인트

### 1. Suspense 래핑

Next.js App Router에서 `useSearchParams()`를 사용할 때는 `Suspense`로 래핑해야 합니다. 그렇지 않으면 빌드 에러가 발생합니다.

### 2. URL 파라미터에서 ID 추출

```typescript
const identityVerificationId = searchParams.get("identityVerificationId");
```

인증 시작 페이지에서 전달한 쿼리 파라미터를 읽습니다.

### 3. 서버 API 호출

클라이언트에서 직접 PortOne API를 호출하지 않고, 자체 API 라우트를 통해 서버에서 검증합니다:

```typescript
const response = await fetch("/api/portone/auth/verify", {
  method: "POST",
  body: JSON.stringify({ identityVerificationId }),
});
```

### 4. 상태에 따른 UI 분기

- `loading`: 스켈레톤 UI
- `error`: 에러 메시지 + 홈으로 이동 버튼
- `VERIFIED`: 성공 아이콘 + 인증 정보 표시
- 기타: 실패 아이콘

### 5. 표시되는 인증 정보

| 항목 | 필드 | 설명 |
|------|------|------|
| 성명 | `name` | 인증된 사용자 이름 |
| 생년월일 | `birthDate` | YYYYMMDD 형식 |
| 성별 | `gender` | 남/여 |
| 연락처 | `phoneNumber` | (선택적) 휴대폰 번호 |
| 신원코드 | `id` | 포트원 인증 건 ID (일부만 표시) |
