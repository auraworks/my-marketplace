# Supabase Edge Function: NCP SMS Integration

## File Location

Create: `supabase/functions/send-sms/index.ts`

## Complete Function Code

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as crypto from "https://deno.land/std@0.208.0/crypto/mod.ts";

const NCP_ACCESS_KEY = Deno.env.get("NCP_ACCESS_KEY")!;
const NCP_SECRET_KEY = Deno.env.get("NCP_SECRET_KEY")!;
const NCP_SERVICE_ID = Deno.env.get("NCP_SERVICE_ID")!;

// Function to generate HMAC SHA256 signature for NCP API authentication
async function makeSignature(
  method: string,
  path: string,
  timestamp: string
): Promise<string> {
  const message = [method, path, timestamp].join("\n");
  const encoder = new TextEncoder();
  const keyData = encoder.encode(NCP_SECRET_KEY);
  const messageData = encoder.encode(message);

  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Generate signature
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  
  // Convert to Base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { phone_number, cert_code } = await req.json();

    // Validate required fields
    if (!phone_number || !cert_code) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          message: "Missing required fields: phone_number, cert_code" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate timestamp for signature
    const timestamp = Date.now().toString();
    const method = "POST";
    const path = `/sms/v2/services/${NCP_SERVICE_ID}/messages`;

    // Create HMAC signature for API authentication
    const signature = await makeSignature(method, path, timestamp);

    // Prepare request headers
    const headers = {
      "Content-Type": "application/json",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": NCP_ACCESS_KEY,
      "x-ncp-apigw-signature-v2": signature,
    };

    // Convert Korean phone number format
    // 010-1234-5678 or 01012345678 → 821012345678 (remove leading 0, add 82)
    const formattedPhone = phone_number
      .replace(/[\s-]/g, "") // Remove spaces and hyphens
      .replace(/^0/, "82");  // Replace leading 0 with 82

    // Prepare SMS request body
    const body = {
      type: "SMS",
      countryCode: "82",
      from: "발신번호", // Replace with your NCP-verified sender number
      content: `[BiniBot] Verification code: ${cert_code}. Valid for 3 minutes.`,
      messages: [
        {
          to: formattedPhone,
        },
      ],
    };

    console.log("Sending SMS to:", formattedPhone);

    // Call NCP SENS API
    const response = await fetch(
      `https://api.ncloud.com${path}`,
      {
        method,
        headers,
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    // Check if API call succeeded
    if (!response.ok) {
      console.error("NCP API Error:", data);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          message: "Failed to send SMS via NCP API", 
          error: data 
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("SMS sent successfully:", data);
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "SMS sent successfully", 
        data 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

## Deployment Steps

### 1. Create Function
```bash
cd your-nextjs-project
supabase functions new send-sms
```

This creates `supabase/functions/send-sms/index.ts`

### 2. Add NCP Credentials
```bash
# Login to Supabase CLI
supabase login

# Set secrets for the function
supabase secrets set NCP_ACCESS_KEY=ncp_iam_...
supabase secrets set NCP_SECRET_KEY=ncp_iam_BPKMKRFvAVuAWbH8vmU9tLKroyehML3LFP
supabase secrets set NCP_SERVICE_ID=ncp:sms:kr:362312123301:binibot
```

### 3. Update Sender Phone Number
Replace `"발신번호"` in the function with your NCP-verified sender phone number:
```typescript
from: "010-1234-5678", // Your actual verified phone number
```

### 4. Deploy Function
```bash
supabase functions deploy send-sms
```

### 5. Verify Deployment
```bash
# List deployed functions
supabase functions list

# View function logs
supabase functions logs send-sms
```

## HMAC SHA256 Signature Explanation

NCP requires request signing for security:

1. **Message to sign**: `METHOD\nPATH\nTIMESTAMP`
   ```
   POST
   /sms/v2/services/ncp:sms:kr:362312123301:binibot/messages
   1704067200000
   ```

2. **Create HMAC-SHA256 signature** using SECRET_KEY

3. **Encode as Base64** for header

4. **Include in request headers**:
   ```
   x-ncp-iam-access-key: {ACCESS_KEY}
   x-ncp-apigw-signature-v2: {SIGNATURE}
   x-ncp-apigw-timestamp: {TIMESTAMP}
   ```

This prevents unauthorized API calls even if credentials are exposed.

## Phone Number Format Conversion

Input formats and conversion:
- `010-1234-5678` → `821012345678` ✓
- `01012345678` → `821012345678` ✓
- `010 1234 5678` → `821012345678` ✓

The regex `replace(/^0/, "82")` converts Korean numbers:
- Removes leading 0
- Adds international code 82 (South Korea)

## Customizing Message Template

The SMS content is currently:
```
[BiniBot] Verification code: {cert_code}. Valid for 3 minutes.
```

Modify in function:
```typescript
// Example: Multi-language support
const messages: Record<string, string> = {
  signup: `[BiniBot] Sign-up code: ${cert_code}`,
  recovery: `[BiniBot] Password reset: ${cert_code}`,
  login: `[BiniBot] Login code: ${cert_code}`,
};

content: messages.signup, // or pass as parameter
```

Or accept template as parameter:
```typescript
const { phone_number, cert_code, template = "signin" } = await req.json();
const content = getTemplate(template, cert_code);
```

## Error Handling

### Common NCP API Errors

| Status | Error | Cause | Fix |
|--------|-------|-------|-----|
| 400 | Bad Request | Invalid phone format | Verify phone number regex |
| 401 | Unauthorized | Invalid API keys | Regenerate keys in NCP |
| 403 | Forbidden | Sender not verified | Verify phone in NCP console |
| 404 | Not Found | Service ID wrong | Check service ID format |
| 429 | Rate Limited | Too many requests | Implement backoff strategy |
| 500 | Server Error | NCP server issue | Retry with backoff |

## Testing Edge Function

### Local Testing
```bash
# Start Supabase local environment
supabase start

# Invoke function locally
supabase functions invoke send-sms --body '{"phone_number":"010-1234-5678","cert_code":"123456"}'
```

### Production Testing
```bash
# After deployment
curl -X POST https://your-project.supabase.co/functions/v1/send-sms \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"010-1234-5678","cert_code":"123456"}'
```

## Monitoring and Logs

### View Real-time Logs
```bash
supabase functions logs send-sms --follow
```

### Check Deployment Status
```bash
supabase functions describe send-sms
```

### Update Function Code
After modifying function code:
```bash
supabase functions deploy send-sms --force-override
```
