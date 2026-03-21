// send-sms-ncp Edge Function for Deno (Supabase)
// Expects POST JSON: { "phone_number": "01012345678", "cert_code": "123456" }
function makeSignature(secret: string, accessKey: string, serviceId: string, timestamp: string) {
  const method = "POST";
  const uri = `/sms/v2/services/${serviceId}/messages`;
  const message = `${method} ${uri}\n${timestamp}\n${accessKey}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);
  return crypto.subtle.importKey("raw", keyData, {
    name: "HMAC",
    hash: "SHA-256"
  }, false, [
    "sign"
  ]).then((cryptoKey) => crypto.subtle.sign("HMAC", cryptoKey, msgData)).then((sig) => {
    const bytes = new Uint8Array(sig);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return new Response(JSON.stringify({
        error: "Invalid JSON body"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const phone_number = json.phone_number ?? json.phoneNumber;
    const cert_code = json.cert_code ?? json.certCode;

    if (!phone_number || !cert_code) {
      return new Response(JSON.stringify({
        error: "phone_number and cert_code are required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const SMS_API_KEY = Deno.env.get("NEXT_PUBLIC_NCP_ACCESS_KEY");
    const SMS_API_SECRET = Deno.env.get("NEXT_PUBLIC_NCP_SECRET_KEY");
    const SMS_SERVICE_ID = Deno.env.get("NEXT_PUBLIC_NCP_SERVICE_ID");
    const SMS_SENDER_NUMBER = Deno.env.get("NCP_SENDER_PHONE") || "0263325322";

    if (!SMS_API_KEY || !SMS_API_SECRET || !SMS_SERVICE_ID) {
      return new Response(JSON.stringify({
        error: "Server not configured"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const timestamp = String(Date.now());
    const signature = await makeSignature(SMS_API_SECRET, SMS_API_KEY, SMS_SERVICE_ID, timestamp);

    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": SMS_API_KEY,
      "x-ncp-apigw-signature-v2": signature
    });

    const body = {
      type: "sms",
      contentType: "COMM",
      countryCode: "82",
      from: SMS_SENDER_NUMBER,
      content: "[골리단길] 본인인증",
      messages: [
        {
          to: phone_number,
          content: `[커피큐브] 본인 확인을 위해 인증번호[${cert_code}]를 입력해 주세요.`
        }
      ]
    };

    const SMS_URL = `https://sens.apigw.ntruss.com/sms/v2/services/${SMS_SERVICE_ID}/messages`;
    const resp = await fetch(SMS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const respText = await resp.text();
    let respJson = null;
    try {
      respJson = JSON.parse(respText);
    } catch {
      respJson = {
        text: respText
      };
    }

    const status = resp.ok ? 200 : 502;
    return new Response(JSON.stringify({
      status: resp.status,
      ok: resp.ok,
      result: respJson
    }), {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("send-sms error:", err);
    return new Response(JSON.stringify({
      error: "Internal server error",
      detail: String(err)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
