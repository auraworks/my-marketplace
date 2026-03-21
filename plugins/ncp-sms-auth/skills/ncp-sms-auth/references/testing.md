# Testing & Debugging Guide

## Local Development Testing

### 1. Setup Local Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Navigate to project directory
cd your-nextjs-project

# Initialize Supabase
supabase init

# Start local Supabase
supabase start
```

Output will show:
```
API URL: http://localhost:54321
Anon key: eyJhbGc...
Service role key: eyJhbGc...
```

### 2. Set Environment Variables for Local Testing

Create `.env.local`:
```env
# For local testing, use provided endpoints
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# NCP credentials (same as production)
NEXT_PUBLIC_NCP_ACCESS_KEY=ncp_iam_...
NEXT_PUBLIC_NCP_SECRET_KEY=ncp_iam_...
NEXT_PUBLIC_NCP_SERVICE_ID=ncp:sms:kr:...
```

### 3. Set Edge Function Secrets

```bash
# For local Edge Functions to use NCP credentials
supabase secrets set NCP_ACCESS_KEY=ncp_iam_BPAMKR5rXOuhtuXIwRpM
supabase secrets set NCP_SECRET_KEY=ncp_iam_BPKMKRFvAVuAWbH8vmU9tLKroyehML3LFP
supabase secrets set NCP_SERVICE_ID=ncp:sms:kr:362312123301:binibot

# Verify secrets are set
supabase secrets list
```

### 4. Run Development Server

```bash
# Terminal 1: Keep Supabase running
supabase start

# Terminal 2: Run Next.js
npm run dev
```

Visit http://localhost:3000 to test

## API Testing with cURL

### Test Send SMS

```bash
# Request SMS code
curl -X POST http://localhost:3000/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

### Test Verify SMS

```bash
# This will fail with wrong code (expected)
curl -X POST http://localhost:3000/api/auth/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678","code":"000000"}'
```

Response (should fail):
```json
{
  "success": false,
  "message": "Invalid verification code"
}
```

To get actual code:
1. Check Supabase database directly
2. Query SMS table: `select code from sms where phone_number='010-1234-5678' order by created_at desc limit 1`

## Database Inspection

### View SMS Records in Supabase

```bash
# Access Supabase dashboard locally
# Navigate to http://localhost:54321

# Or use SQL Editor in dashboard:
SELECT id, phone_number, code, verified, created_at, expiry_at 
FROM sms 
ORDER BY created_at DESC 
LIMIT 10;
```

### Delete Test Records

```bash
DELETE FROM sms 
WHERE phone_number = '010-1234-5678';
```

## Edge Function Testing

### Test Edge Function Locally

```bash
# Invoke function directly
supabase functions invoke send-sms \
  --body '{"phone_number":"010-1234-5678","cert_code":"123456"}'
```

### View Edge Function Logs

```bash
# Real-time logs
supabase functions logs send-sms --follow

# This shows:
# - Function invocation details
# - Console.log() output
# - Errors and exceptions
```

### Test with Sample Request Body

Create `test-edge-function.json`:
```json
{
  "phone_number": "010-1234-5678",
  "cert_code": "123456"
}
```

Then invoke:
```bash
supabase functions invoke send-sms --body @test-edge-function.json
```

## Common Testing Scenarios

### Scenario 1: Valid Flow
1. Send SMS to valid number
2. Check database for generated code
3. Verify code with correct value
4. Confirm `verified=true` in database

```bash
# Step 1: Send
curl -X POST http://localhost:3000/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678"}'

# Step 2: Check DB for code (let's say it's "654321")

# Step 3: Verify with correct code
curl -X POST http://localhost:3000/api/auth/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678","code":"654321"}'

# Expected: {"success":true,"message":"Phone number verified successfully"}
```

### Scenario 2: Wrong Code
```bash
curl -X POST http://localhost:3000/api/auth/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678","code":"000000"}'

# Expected: {"success":false,"message":"Invalid verification code"}
```

### Scenario 3: Expired Code
1. Send SMS
2. Wait 3+ minutes
3. Try to verify

```bash
# Manually set expiry in past
UPDATE sms 
SET expiry_at = NOW() - INTERVAL '1 minute' 
WHERE phone_number = '010-1234-5678';

# Then try to verify
curl -X POST http://localhost:3000/api/auth/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678","code":"654321"}'

# Expected: {"success":false,"message":"Verification code expired"}
```

### Scenario 4: Invalid Phone Format
```bash
curl -X POST http://localhost:3000/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"invalid"}'

# Expected: {"success":false,"message":"Invalid phone number format"}
```

## Debugging Tips

### Enable Verbose Logging

In route files, logs print to console:
```typescript
console.log("[SMS Send] Step 1 - received phone:", phone_number);
console.log("[SMS Send] Step 2 - generated code:", verificationCode);
console.log("[SMS Send] Step 3 - database result:", insertData);
```

Watch terminal where `npm run dev` is running.

### Check Edge Function Deployment Status

```bash
# Verify function is deployed
supabase functions list

# Expected output:
# send-sms (remote, 2024-12-25 12:00:00 UTC)

# If shows as "local" only, function isn't deployed to Supabase
supabase functions deploy send-sms
```

### Monitor NCP API Calls

Edge Function logs show NCP responses:
```bash
supabase functions logs send-sms --follow
```

Look for:
- `"NCP API Error:"` - NCP API returned error
- `"SMS sent successfully:"` - Successful send
- `"Edge Function Error:"` - Function threw exception

### Database Connection Issues

If getting "DB connection error":
1. Verify Supabase is running: `supabase status`
2. Check table exists: Query SMS table in dashboard
3. Verify RLS policies allow access
4. Check credentials in `.env.local`

### Phone Number Formatting Issues

Test regex validation:
```bash
# Create test file: test-phone.js
const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
console.log(phoneRegex.test("010-1234-5678")); // true
console.log(phoneRegex.test("01012345678"));   // true
console.log(phoneRegex.test("010 1234 5678")); // false (spaces not allowed by regex)
```

The current regex doesn't allow spaces. To fix, use:
```typescript
const phoneRegex = /^01[0-9][\s\-]?\d{3,4}[\s\-]?\d{4}$/;
```

## Production Testing Checklist

Before deploying to production:

- [ ] Test with real NCP account credentials
- [ ] Send SMS to personal phone number
- [ ] Verify SMS is received
- [ ] Complete full verification flow
- [ ] Check database records are created correctly
- [ ] Verify timestamps are in UTC
- [ ] Test error handling (wrong code, expired code)
- [ ] Monitor logs during test
- [ ] Verify Edge Function is deployed to production Supabase
- [ ] Check production environment variables are set
- [ ] Test rate limiting is configured
- [ ] Verify HTTPS is enforced
- [ ] Test on actual phone (not emulator)

## Performance Monitoring

### Check Response Times

```bash
# Measure API response time
time curl -X POST http://localhost:3000/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678"}'
```

Typical times:
- DB insert: 50-200ms
- Edge Function invoke: 500-2000ms
- NCP API call: 1000-3000ms
- **Total**: 1.5-5 seconds

### Monitor Supabase Usage

Dashboard → Usage Reports shows:
- Database queries count
- Edge Function invocations
- Bandwidth usage

## Troubleshooting Checklist

| Problem | Check |
|---------|-------|
| SMS not sent | Edge Function deployed? NCP credentials valid? Sender number verified? |
| Verification fails | Code exists in DB? Expiry time correct? Phone number matches exactly? |
| API times out | Supabase running? Network connection? Edge Function syntax error? |
| Wrong phone format | Regex allows that format? Input trimmed? |
| Code not in DB | Insert query executed? DB RLS allows insert? |
