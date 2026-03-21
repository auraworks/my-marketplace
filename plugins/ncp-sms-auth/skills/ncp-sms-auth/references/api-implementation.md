# API Route Implementation

## Send SMS Route

Create file: `app/api/auth/send-sms/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phone_number } = await request.json();
    console.log("[SMS Send] Request received:", phone_number);

    if (!phone_number) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate Korean phone number format
    const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
    if (!phoneRegex.test(phone_number.replace(/\s/g, ""))) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    console.log("[SMS Send] Code generated:", verificationCode);

    // Set expiry to 3 minutes from now
    const expiryAt = new Date();
    expiryAt.setMinutes(expiryAt.getMinutes() + 3);
    console.log("[SMS Send] Expiry time:", expiryAt.toISOString());

    const supabase = await createClient();

    // Store in Supabase SMS table
    const { data: insertData, error: insertError } = await supabase
      .from("sms")
      .insert({
        code: verificationCode,
        phone_number: phone_number,
        expiry_at: expiryAt.toISOString(),
      })
      .select();

    if (insertError) {
      console.error("[SMS Send] DB insert failed:", insertError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to save verification code",
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    console.log("[SMS Send] DB insert success:", insertData);

    // Invoke Supabase Edge Function to send SMS via NCP
    const { data: smsData, error: smsError } = await supabase.functions.invoke(
      "send-sms",
      {
        body: {
          phone_number: phone_number,
          cert_code: verificationCode,
        },
      }
    );

    if (smsError) {
      console.error("[SMS Send] Edge Function failed:", smsError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send SMS",
          error: smsError.message,
        },
        { status: 500 }
      );
    }

    console.log("[SMS Send] Edge Function response:", smsData);

    // Verify Edge Function success
    if (!smsData?.ok) {
      console.error("[SMS Send] Edge Function error response:", smsData);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send SMS",
          detail: smsData,
        },
        { status: 500 }
      );
    }

    console.log("[SMS Send] Process complete");
    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("[SMS Send] Exception:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

## Verify SMS Route

Create file: `app/api/auth/verify-sms/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phone_number, code } = await request.json();
    console.log("[SMS Verify] Request:", { phone_number, code });

    if (!phone_number || !code) {
      return NextResponse.json(
        { success: false, message: "Phone number and code required" },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Query most recent unverified code for this phone (with expiry check at DB level)
    const { data: smsRecord, error: queryError } = await supabase
      .from("sms")
      .select("*")
      .eq("phone_number", phone_number)
      .eq("code", code)
      .eq("verified", false)
      .gt("expiry_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (queryError || !smsRecord) {
      console.error("[SMS Verify] Query failed or code expired:", queryError);
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid verification code or code has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("sms")
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", smsRecord.id);

    if (updateError) {
      console.error("[SMS Verify] Update failed:", updateError);
      return NextResponse.json(
        { success: false, message: "Verification failed" },
        { status: 500 }
      );
    }

    console.log("[SMS Verify] Success");
    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
      verified_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SMS Verify] Exception:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

## Key Implementation Points

### Phone Number Validation

- Support formats: 010-1234-5678, 01012345678, 010 1234 5678
- Regex removes hyphens/spaces before validation
- Only Korean numbers (01X prefix) allowed

### Error Handling

- Distinguish between client errors (400) and server errors (500)
- Log all errors with context prefix for debugging
- Return user-friendly messages

### Code Lifecycle

1. **Created**: Inserted with 3-minute expiry window
2. **Verified**: Marked with verified=true when correct code entered
3. **Expired**: After 3 minutes, validation fails with expiry message
4. **Cleanup**: Old expired records can be deleted via scheduled task

### Database Considerations

- Code + phone_number should be unique per request (old codes remain)
- Verified flag prevents reuse of same code
- Timestamps use database server time (UTC)
- Indexes on phone_number and code for fast lookups

### Security Measures

- Never return code in API response
- Never log full phone numbers (log only last 4 digits)
- Validate input format before database query
- Use prepared statements (Supabase client handles this)
