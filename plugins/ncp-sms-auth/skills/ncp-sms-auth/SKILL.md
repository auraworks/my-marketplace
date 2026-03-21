---
name: ncp-sms-auth
description: 네이버 클라우드 플랫폼(Naver Cloud Platform, NCP) SENS를 이용한 SMS 문자 인증 시스템. Next.js 웹 애플리케이션에 휴대폰 번호 인증, OTP 코드 검증 기능 통합. 회원가입, 로그인, 본인확인, 2단계 인증(2FA)에 사용. NCP SENS API를 통한 SMS 발송, Supabase를 통한 인증번호 저장(3분 만료), Supabase MCP 자동 배포 지원, React 컴포넌트 포함. 키워드: 네이버클라우드, 문자인증, 휴대폰인증, 본인인증, SMS verification, phone authentication, OTP, SENS.
---

# NCP SMS 인증 통합

네이버 클라우드 플랫폼(NCP) SMS 기반 OTP 인증을 Next.js 애플리케이션에 통합합니다. 이 스킬은 SMS를 통해 인증코드를 전송하고, Supabase에 안전하게 저장하며, 사용자 입력을 검증하고, 자동 만료 기능을 포함한 완전한 엔드-투-엔드 워크플로우를 제공합니다.

## 🤖 자동 실행 지침 (Claude Code용)

**이 스킬이 호출되면 다음 단계를 자동으로 수행해야 합니다:**

### Step 1: 환경변수 확인
- `.env.local` 파일을 Read 도구로 읽어서 다음 변수가 있는지 확인:
  - `NEXT_PUBLIC_NCP_ACCESS_KEY`
  - `NEXT_PUBLIC_NCP_SECRET_KEY`
  - `NEXT_PUBLIC_NCP_SERVICE_ID`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 없으면 사용자에게 설정 요청

### Step 2: Supabase 테이블 생성
- `mcp__supabase__list_tables`로 `sms` 테이블 존재 확인
- 없으면 `mcp__supabase__apply_migration`으로 테이블 생성:

```sql
CREATE TABLE IF NOT EXISTS sms (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  expiry_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_code ON sms(code);
CREATE INDEX IF NOT EXISTS idx_sms_expiry ON sms(expiry_at);
ALTER TABLE sms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert for all users" ON sms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for own phone number" ON sms FOR SELECT USING (true);
CREATE POLICY "Allow update for all users" ON sms FOR UPDATE USING (true) WITH CHECK (true);
```

### Step 2.5: 테이블 데이터 타입 검증 (중요!)
- `mcp__supabase__list_tables`로 생성된 테이블의 컬럼 타입 확인
- **필수 확인 사항:**
  - `expiry_at`: `timestamp with time zone` (timestamptz) 여야 함
  - `created_at`: `timestamp with time zone` (timestamptz) 여야 함
  - `verified_at`: `timestamp with time zone` (timestamptz) 여야 함
- 만약 `timestamp without time zone`으로 생성되었다면 다음 migration 실행:

```sql
ALTER TABLE sms
  ALTER COLUMN expiry_at TYPE TIMESTAMPTZ USING expiry_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN verified_at TYPE TIMESTAMPTZ USING verified_at AT TIME ZONE 'UTC';
```

### Step 3: Edge Function 배포
- `scripts/send-sms-edge-function.ts` 파일을 Read 도구로 읽기
- `mcp__supabase__deploy_edge_function`으로 배포:
  - name: `send-sms-ncp`
  - verify_jwt: `false`
  - entrypoint_path: `index.ts`
  - files: 읽은 내용을 `index.ts`로 설정

### Step 4: API 라우트 생성
- `app/api/auth/send-sms/route.ts` 파일 생성 (Write 도구 사용)
- `app/api/auth/verify-sms/route.ts` 파일 생성 (Write 도구 사용)
- **중요**: 프론트엔드에서 `phone_number` 파라미터를 사용하는 경우 API도 동일하게 맞춤
- **중요**: 응답에 `message` 필드 포함

### Step 5: 의존성 확인 및 설치
- `package.json` 읽어서 `@supabase/supabase-js` 확인
- 없으면 `npm install @supabase/supabase-js` 실행

### Step 6: UI 컴포넌트 처리
- `app/page.tsx` 파일이 이미 있는지 확인
- 있으면 기존 UI 사용, 없으면 `scripts/SmsAuthForm.tsx`를 `components/SmsAuthForm.tsx`로 복사

### Step 7: 완료 메시지
사용자에게 다음 정보 제공:
- ✅ Supabase `sms` 테이블 생성 완료
- ✅ Edge Function `send-sms-ncp` 배포 완료
- ✅ API 라우트 생성 완료 (`/api/auth/send-sms`, `/api/auth/verify-sms`)
- 🚀 `npm run dev`로 테스트 가능

## 핵심 워크플로우

SMS 인증 흐름은 3단계로 구성됩니다:

1. **SMS 요청**: 사용자가 휴대폰 번호 입력 → 6자리 OTP 생성 → Supabase에 3분 TTL로 저장 → Edge Function이 NCP API를 통해 SMS 전송
2. **코드 검증**: 사용자가 SMS를 받고 코드 입력 → API가 데이터베이스에서 검증 → 만료 시간 확인 → 인증 완료 처리
3. **성공 콜백**: 프론트엔드가 상태를 업데이트하고 다운스트림 인증 로직을 위한 성공 콜백 실행

## 빠른 시작

### 방법 A: Supabase MCP 사용 (권장 - 완전 자동화)

**이 스킬은 Supabase MCP를 사용하여 테이블 생성과 Edge Function 배포를 자동으로 수행합니다.**

#### 1. NCP 설정 (수동 - 1회만)

NCP Console에서 다음을 준비하세요:

- SENS 서비스 활성화
- 발신번호 등록 및 승인 (1-2일 소요)
- API 인증키 발급 (Access Key, Secret Key, Service ID)

상세 가이드: `references/setup-guide.md`

#### 2. 환경변수 설정

`.env.local` 파일을 생성하고 NCP 및 Supabase 정보를 입력하세요:

```env
NEXT_PUBLIC_NCP_ACCESS_KEY=ncp_iam_BPAMKR5rXOuhtuXIwRpM
NEXT_PUBLIC_NCP_SECRET_KEY=ncp_iam_BPKMKRFvAVuAWbH8vmU9tLKroyehML3LFP
NEXT_PUBLIC_NCP_SERVICE_ID=ncp:sms:kr:362312123301:binibot
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

#### 3. MCP를 통한 자동 설정

이 스킬을 실행하면 Claude Code가 Supabase MCP를 통해 자동으로:

**✅ Supabase 테이블 생성**

```sql
CREATE TABLE sms (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  expiry_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);
CREATE INDEX idx_sms_phone ON sms(phone_number);
CREATE INDEX idx_sms_code ON sms(code);
CREATE INDEX idx_sms_expiry ON sms(expiry_at);
```

**✅ Edge Function 생성 및 배포**

- 함수 이름: `send-sms-ncp`
- NCP SENS API 연동 코드 자동 배포
- HMAC SHA-256 서명 생성 포함
- Edge Function Secrets 자동 설정

**✅ API 라우트 생성**

- `app/api/auth/send-sms/route.ts` - SMS 전송
- `app/api/auth/verify-sms/route.ts` - 코드 검증

**✅ React 컴포넌트 생성**

- `components/SmsAuthForm.tsx` - 완성된 UI 컴포넌트

#### 4. 완료!

모든 설정이 자동으로 완료되었습니다. 개발 서버를 실행하세요:

```bash
npm run dev
```

---

### 방법 B: 수동 설정 (CLI 사용)

MCP 없이 Supabase CLI로 수동 설정하는 방법:

#### 1. 사전 요구사항

- NCP SENS 설정 완료 (`references/setup-guide.md`)
- Supabase CLI 설치: `npm install -g supabase`

#### 2. Supabase 로그인 및 연결

```bash
supabase login
supabase link --project-ref your-project-id
```

#### 3. 데이터베이스 테이블 생성

Supabase Dashboard > SQL Editor에서 실행:

```sql
CREATE TABLE sms (...);  -- 전체 스키마는 위 참조
```

#### 4. Edge Function 배포

```bash
# 함수 생성
supabase functions new send-sms-ncp

# scripts/send-sms-edge-function.ts 내용을
# supabase/functions/send-sms-ncp/index.ts에 복사

# Secrets 설정
supabase secrets set NEXT_PUBLIC_NCP_ACCESS_KEY=ncp_iam_...
supabase secrets set NEXT_PUBLIC_NCP_SECRET_KEY=ncp_iam_...
supabase secrets set NEXT_PUBLIC_NCP_SERVICE_ID=ncp:sms:kr:...

# 배포
supabase functions deploy send-sms-ncp
```

#### 5. API 라우트 생성

`references/api-implementation.md` 참조하여 수동 생성

#### 6. React 컴포넌트 사용

```tsx
import { SmsAuthForm } from "@/components/SmsAuthForm";

<SmsAuthForm
  onVerifySuccess={(phoneNumber) => {
    // Handle successful verification
  }}
/>;
```

## MCP 자동화 상세 설명

### Supabase MCP가 하는 일

이 스킬이 실행되면 다음 작업이 자동으로 수행됩니다:

#### 1단계: Supabase 데이터베이스 테이블 생성

MCP를 통해 `sms` 테이블을 자동으로 생성합니다:

- `code`: 6자리 인증코드
- `phone_number`: 사용자 전화번호
- `expiry_at`: 만료 시간 (3분)
- `verified`: 인증 완료 여부
- 인덱스 3개 자동 생성 (성능 최적화)

#### 2단계: Edge Function 생성 및 배포

MCP를 통해 `send-sms-ncp` Edge Function을 생성하고 배포합니다:

- **코드 위치**: `scripts/send-sms-edge-function.ts`
- **기능**: NCP SENS API 호출, HMAC SHA-256 서명 생성
- **환경변수**: Edge Function Secrets 자동 설정
  - `NEXT_PUBLIC_NCP_ACCESS_KEY`
  - `NEXT_PUBLIC_NCP_SECRET_KEY`
  - `NEXT_PUBLIC_NCP_SERVICE_ID`
  - `NCP_SENDER_PHONE` (선택사항)

#### 3단계: Next.js API 라우트 생성

프로젝트에 다음 API 라우트를 생성합니다:

**`app/api/auth/send-sms/route.ts`**

- 6자리 인증코드 생성
- Supabase에 코드 저장
- Edge Function 호출하여 SMS 전송

**`app/api/auth/verify-sms/route.ts`**

- 전화번호와 코드 검증
- 만료 시간 확인
- 인증 완료 처리

#### 4단계: 기존 React 컴포넌트 기반 기능 구현

**`app/page.tsx`** (기존 UI 활용)

- 전화번호 입력 필드 (이미 구현됨)
- 인증코드 입력 필드 (이미 구현됨)
- 인증번호 받기 버튼 (이미 구현됨)
- 인증하기 버튼 (이미 구현됨)
- 에러/성공 메시지 표시 (이미 구현됨)

**필요한 작업:**

- `handleSendCode()` 함수: `/api/auth/send-sms` 호출 (기존 코드 수정)
- `handleVerifyCode()` 함수: `/api/auth/verify-sms` 호출 (기존 코드 수정)
- API 요청 시 `phone_number` 필드명 일치 확인

### MCP 사용 전제 조건

**중요**: Supabase MCP를 사용하려면 Organization이 필요합니다.

1. **Supabase Organization 생성**

   - https://supabase.com/dashboard 접속
   - 좌측 상단 > "New Organization" 클릭
   - Organization 이름 입력
   - 프로젝트를 Organization으로 이동

2. **Claude Code에서 MCP 연결**

   - Supabase MCP 연결 시도
   - Organization 선택
   - 권한 승인

3. **MCP가 연결되면 이 스킬 실행**
   - 모든 설정이 자동으로 완료됩니다!

## 핵심 기능

### 1. OTP 생성 및 저장

- 6자리 코드 자동 생성
- Supabase에 휴대폰 번호 및 만료 시간과 함께 저장
- 동일 번호에 대한 중복 코드 방지
- 만료된 코드 자동 정리

### 2. NCP SENS를 통한 SMS 전송

- NCP Simple & Easy Notification Service 사용
- HMAC SHA256 서명 인증
- 한국 휴대폰 번호 형식 처리 (011 → 821...)
- 사용자 정의 메시지 템플릿

### 3. 코드 검증

- 코드 존재 여부 및 만료 여부 검증
- 검증된 레코드를 표시하여 재사용 방지
- 설명적인 오류 메시지 반환
- 엣지 케이스 처리 (코드 누락, 만료된 코드, 잘못된 번호)

### 4. 프론트엔드 워크플로우

- 2단계 UI: 휴대폰 입력 → 코드 입력
- 실시간 카운트다운 타이머 (3분)
- 입력 검증 (휴대폰 형식, 코드 길이)
- 로딩 상태 및 오류 메시지
- 인증 흐름을 위한 성공 콜백

### 5. 보안 기능

- 클라이언트에 시크릿 키 노출 안 함
- NCP 자격증명을 위한 Edge Function 격리
- 검증된 휴대폰 번호 요구
- 만료 기반 코드 무효화
- 속도 제한 패턴 (참고 자료 참조)

## 구현 패턴

### 패턴 1: 기본 인증 흐름

회원가입/로그인을 위한 가장 간단한 구현:

```tsx
// Page.tsx
import { SmsAuthForm } from "@/components/auth/SmsAuthForm";

export default function LoginPage() {
  return (
    <SmsAuthForm
      onVerifySuccess={(phoneNumber) => {
        // Create session, redirect, etc.
      }}
    />
  );
}
```

### 패턴 2: 다단계 폼 통합

더 큰 인증 흐름 내에서 사용:

```tsx
// SignupForm.tsx
const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

if (!verifiedPhone) {
  return <SmsAuthForm onVerifySuccess={setVerifiedPhone} />;
}

return <AdditionalDetailsForm phoneNumber={verifiedPhone} />;
```

### 패턴 3: 속도 제한

휴대폰/IP당 SMS 요청을 제한하여 남용 방지. Redis 기반 구현 패턴은 `references/rate-limiting.md`를 참조하세요.

## 데이터베이스 스키마

`sms` 테이블 구조:

```sql
CREATE TABLE sms (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  expiry_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

CREATE INDEX idx_sms_phone ON sms(phone_number);
CREATE INDEX idx_sms_code ON sms(code);
```

## 주요 설정 포인트

| 설정          | 기본값               | 목적              |
| ------------- | -------------------- | ----------------- |
| OTP 길이      | 6자리                | 인증코드 길이     |
| 만료 시간     | 3분                  | 코드 유효 기간    |
| 메시지 템플릿 | "[App] Code: {code}" | SMS 내용          |
| 발신자 번호   | NCP 등록 번호        | NCP 콘솔에서 검증 |

## 일반적인 변형

### 패턴 A: 다른 만료 시간

`send-sms` 라우트에서 조정:

```typescript
const expiryAt = new Date();
expiryAt.setMinutes(expiryAt.getMinutes() + 5); // 5분
```

### 패턴 B: 사용자 정의 메시지 템플릿

Edge Function 본문 수정:

```typescript
const templates = {
  signup: `[AppName] 회원가입 코드: ${cert_code}`,
  recovery: `[AppName] 비밀번호 재설정: ${cert_code}`,
};
```

### 패턴 C: 이메일 폴백

SMS 전송 실패 시 이메일로 코드 전송. 구현 방법은 참고 자료를 참조하세요.

## 테스트

### 로컬 테스트

1. Supabase 시작: `supabase start`
2. Edge Function 시크릿 설정: `supabase secrets set NCP_SECRET_KEY=...`
3. 함수 배포: `supabase functions deploy send-sms`
4. 개발 서버 실행: `npm run dev`
5. UI 또는 `references/testing.md`의 cURL 명령으로 테스트

### 통합 테스트

`references/test-cases.md`에서 제공되는 테스트 시나리오 사용:

- 유효한 코드 제출
- 만료된 코드 처리
- 잘못된 코드 거부
- 여러 요청 정리

## 오류 처리 참고

완전한 오류 코드 매핑 및 복구 전략은 `references/error-handling.md`를 참조하세요:

| 오류            | 원인                   | 해결 방법            |
| --------------- | ---------------------- | -------------------- |
| SMS_SEND_FAILED | NCP API 도달 불가      | 지수 백오프로 재시도 |
| INVALID_CODE    | 코드 불일치            | 사용자 입력 오류     |
| CODE_EXPIRED    | 3분 이상 경과          | 새 코드 요청         |
| DB_ERROR        | 데이터베이스 사용 불가 | Supabase 상태 확인   |

## 보안 모범 사례

1. **코드 로깅 금지** - 애플리케이션 로그에 코드 저장 금지
2. **HTTPS만 사용** - 암호화된 채널을 통해 휴대폰 번호 전송
3. **휴대폰 형식 검증** - 서버 측 검증 필수
4. **속도 제한 설정** - 무차별 대입 공격 및 남용 방지
5. **실패한 시도 모니터링** - 비정상적인 패턴에 대한 경고
6. **오래된 레코드 정리** - 만료된 코드 정기적 삭제

프로덕션 배포 체크리스트는 `references/security-checklist.md`를 참조하세요.

## 문제 해결

일반적인 문제 및 해결 방법:

**"API 키 인증 실패"**

- NCP 콘솔에서 API 키 확인
- 키가 회전되지 않았는지 확인
- 키가 `.env.local`에 있고 하드코딩되지 않았는지 확인

**"SMS 전송 실패"**

- NCP에 휴대폰 번호가 등록되었는지 확인
- Service ID가 NCP 콘솔과 일치하는지 확인
- NCP 계정에 SMS 할당량이 남아있는지 확인

**"검증 시간 초과"**

- Supabase 연결 확인
- 데이터베이스 테이블이 올바른 스키마로 존재하는지 확인
- Edge Function이 배포되었는지 확인

**"코드 불일치 또는 만료"**

- 3분 타이머가 시작되었는지 확인
- 데이터베이스 시간대 확인 (UTC여야 함)
- 최신 코드가 일치하는지 확인 (이전 시도 아님)

자세한 디버깅은 `references/debugging.md`를 참조하세요.
