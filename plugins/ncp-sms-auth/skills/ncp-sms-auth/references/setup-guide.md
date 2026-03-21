# Setup Guide: NCP SMS Authentication

## Naver Cloud Platform Setup

### 1. Create NCP Account
- Visit ncloud.com and create account
- Verify email and phone number
- Complete identity verification

### 2. Activate SENS Service
- Go to NCP Console → Services → Messaging Service
- Click "Simple & Easy Notification Service (SENS)"
- Click "가입" (Activate)

### 3. Create SMS Service
- In SENS console, click "SMS Service 생성"
- Enter service name (e.g., "binibot-auth")
- Select project if multiple projects exist
- Click "생성"
- Copy the generated **Service ID** (format: `ncp:sms:kr:xxxxx:service-name`)

### 4. Register Sender Phone Number
- Go to SMS Service → "발신번호 관리"
- Click "번호 추가"
- Enter your phone number (Korean format: 010-1234-5678)
- Receive verification SMS
- Enter verification code to confirm
- Status should show "인증완료"

⚠️ **Important**: Only verified sender numbers can send SMS

### 5. Create API Credentials
- Go to Account Management → API Authentication Key
- Or: SMS Service → Setting → API Key Management
- Click "인증키 생성"
- Download credentials (appears once only!)
  - Copy **Access Key** (NCP_ACCESS_KEY)
  - Copy **Secret Key** (NCP_SECRET_KEY)
  - Note: Keys start with "ncp_iam_"

## Supabase Setup

### 1. Create Supabase Project
- Visit supabase.com and sign in
- Click "New project"
- Enter project name and password
- Select region (closest to target users)
- Wait for project initialization

### 2. Create SMS Table
In Supabase Dashboard → SQL Editor, run:

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

CREATE INDEX idx_sms_phone_number ON sms(phone_number);
CREATE INDEX idx_sms_code ON sms(code);
```

### 3. Set Row-Level Security (RLS)
Enable RLS for security:

```sql
ALTER TABLE sms ENABLE ROW LEVEL SECURITY;

-- Allow Edge Function to read/write
CREATE POLICY "Allow Edge Function access"
  ON sms
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Prevent direct client access
CREATE POLICY "Prevent direct client access"
  ON sms
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
```

### 4. Setup Edge Function
Create function in Supabase Dashboard or CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize in project directory
supabase init

# Create function
supabase functions new send-sms

# Set NCP credentials as secrets
supabase secrets set NCP_ACCESS_KEY=ncp_iam_...
supabase secrets set NCP_SECRET_KEY=ncp_iam_...
supabase secrets set NCP_SERVICE_ID=ncp:sms:kr:...

# Deploy
supabase functions deploy send-sms
```

## Environment Variables

Create `.env.local` in Next.js project:

```env
# NCP Configuration (obtained from NCP Console)
NEXT_PUBLIC_NCP_ACCESS_KEY=ncp_iam_BPAMKR5rXOuhtuXIwRpM
NEXT_PUBLIC_NCP_SECRET_KEY=ncp_iam_BPKMKRFvAVuAWbH8vmU9tLKroyehML3LFP
NEXT_PUBLIC_NCP_SERVICE_ID=ncp:sms:kr:362312123301:binibot

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

⚠️ **Critical**: `NEXT_PUBLIC_*` variables are visible to clients. Only non-sensitive values here!
- NCP SECRET_KEY should NOT have NEXT_PUBLIC_ prefix
- Only ACCESS_KEY and SERVICE_ID are safe for client exposure

## Verify Setup

### 1. Test NCP Credentials
- NCP Console → Project → Credentials
- Verify Access Key and Secret Key are active

### 2. Test Supabase Connection
```bash
# In Next.js project
npm install @supabase/supabase-js

# Create test file
touch test-supabase.ts

# Code to verify connection
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const { data, error } = await supabase.from('sms').select('count(*)')
```

### 3. Test Edge Function Deployment
```bash
# Check deployed functions
supabase functions list

# Invoke function (if auth setup complete)
supabase functions invoke send-sms --body '{"phone_number":"010-1234-5678","cert_code":"123456"}'
```

## Troubleshooting Setup

**"API Key not found"**
- NCP credentials expire after 90 days
- Regenerate in NCP Console → API Key Management

**"Service ID invalid"**
- Confirm SMS Service created in NCP
- Format should be: `ncp:sms:kr:XXXXX:service-name`

**"Sender number not verified"**
- Must complete SMS verification in NCP
- Try with different number format (01012345678 vs 010-1234-5678)

**"Edge Function deployment fails"**
- Confirm Supabase CLI authenticated: `supabase login`
- Check function syntax with: `supabase functions validate send-sms`
- Review function logs: `supabase functions logs send-sms`

**"Supabase table not accessible"**
- Confirm RLS policies created
- Check Service Role key has access
- Verify table name spelling matches queries
