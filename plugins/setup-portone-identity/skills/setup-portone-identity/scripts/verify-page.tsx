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
            <svg className="h-10 w-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#0064ff] py-4 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 dark:shadow-blue-900/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
        <span className="h-1 w-1 rounded-full bg-zinc-400" />
        <span className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase">Powered by PortOne</span>
        <span className="h-1 w-1 rounded-full bg-zinc-400" />
      </div>
    </div>
  );
}
