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
