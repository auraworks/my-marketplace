// types/sms-auth.ts

/**
 * Response from send-sms API
 */
export interface SendSmsResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Response from verify-sms API
 */
export interface VerifySmsResponse {
  success: boolean;
  message: string;
  verified_at?: string;
  error?: string;
}

/**
 * SMS record in database
 */
export interface SmsRecord {
  id: number;
  code: string;
  phone_number: string;
  expiry_at: string;
  verified: boolean;
  created_at: string;
  verified_at: string | null;
}

/**
 * Request payload for send-sms API
 */
export interface SendSmsRequest {
  phone_number: string;
}

/**
 * Request payload for verify-sms API
 */
export interface VerifySmsRequest {
  phone_number: string;
  code: string;
}

/**
 * NCP Edge Function request payload
 */
export interface NcpSmsRequest {
  phone_number: string;
  cert_code: string;
}

/**
 * NCP SMS API request body
 */
export interface NcpApiRequest {
  type: "SMS";
  countryCode: string;
  from: string;
  content: string;
  messages: Array<{
    to: string;
  }>;
}

/**
 * NCP SMS API response
 */
export interface NcpApiResponse {
  requestId: string;
  statusCode: string;
  statusName: string;
  messages: Array<{
    statusCode: string;
    statusName: string;
    messageId: number;
    to: string;
  }>;
}

/**
 * Edge Function response
 */
export interface EdgeFunctionResponse {
  ok: boolean;
  message: string;
  data?: NcpApiResponse;
  error?: unknown;
}
