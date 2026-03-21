// File: components/auth/SmsAuthForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SmsAuthFormProps {
  onVerifySuccess?: (phoneNumber: string) => void;
}

export function SmsAuthForm({ onVerifySuccess }: SmsAuthFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  // Request SMS with OTP code
  const handleSendCode = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Failed to send verification code");
        return;
      }

      setSuccess("Verification code sent successfully!");
      setStep("code");
      
      // Start 3-minute (180 second) countdown timer
      let remainingTime = 180;
      setTimeLeft(remainingTime);
      
      const interval = setInterval(() => {
        remainingTime -= 1;
        setTimeLeft(remainingTime);
        
        if (remainingTime <= 0) {
          clearInterval(interval);
          setError("Verification code expired. Please request a new one.");
          setStep("phone");
        }
      }, 1000);
    } catch (err) {
      setError("Server error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Verify the code user entered
  const handleVerifyCode = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneNumber,
          code,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Verification failed");
        return;
      }

      setSuccess("Phone number verified successfully!");
      onVerifySuccess?.(phoneNumber);
    } catch (err) {
      setError("Server error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Format remaining time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Validate and format phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers, hyphens, and spaces
    const formatted = value.replace(/[^\d\s\-]/g, "");
    setPhoneNumber(formatted);
  };

  // Validate code input (only numbers, max 6)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  return (
    <div className="w-full max-w-sm mx-auto p-6 border rounded-lg shadow-md">
      <h2 className="text-lg font-bold mb-4">Phone Verification</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
          {success}
        </div>
      )}

      {step === "phone" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="010-1234-5678"
              value={phoneNumber}
              onChange={handlePhoneChange}
              disabled={loading}
              className="w-full"
            />
          </div>
          <Button
            onClick={handleSendCode}
            disabled={!phoneNumber || loading}
            className="w-full"
          >
            {loading ? "Sending..." : "Send Code"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 flex justify-between items-center">
            <span>Code sent to {phoneNumber}</span>
            {timeLeft > 0 && (
              <span className="text-red-600 font-medium">
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              maxLength={6}
              disabled={loading}
              className="w-full text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep("phone")}
              disabled={loading}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleVerifyCode}
              disabled={code.length !== 6 || loading || timeLeft <= 0}
              className="flex-1"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
