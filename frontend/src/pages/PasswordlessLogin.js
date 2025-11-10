import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp, verifyOtp } from "../services/passwordlessAuthService";
import "../styles/PasswordlessLogin.css";

/**
 * PASSWORDLESS LOGIN COMPONENT
 * =============================
 * Implements a secure OTP-based authentication flow:
 * 1. User enters email
 * 2. System sends 6-digit OTP to email
 * 3. User enters OTP to login
 * 
 * SECURITY FEATURES:
 * - Generic error messages to prevent user enumeration
 * - No indication whether email exists in system
 * - Rate limiting handled by backend
 * - OTP expiration handled by backend
 */

export default function PasswordlessLogin() {
  // ========================
  // STATE MANAGEMENT
  // ========================
  const [loginStep, setLoginStep] = useState("request"); // 'request' | 'verify' | 'success'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();

  // ========================
  // STEP 1: REQUEST OTP
  // ========================
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await requestOtp(email);

      if (response.success) {
        setSuccessMessage(
          "Check your email for a 6-digit code. It will expire in 10 minutes."
        );
        
        // Move to verification step after brief delay
        setTimeout(() => {
          setLoginStep("verify");
          setSuccessMessage("");
        }, 2000);

        // Start resend cooldown (60 seconds)
        startResendCooldown();
      }
    } catch (err) {
      console.error("Request OTP error:", err);
      // SECURITY: Generic error message
      setError("Unable to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // STEP 2: VERIFY OTP
  // ========================
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (otp.length !== 6) {
      setError("Please enter a 6-digit code.");
      setLoading(false);
      return;
    }

    try {
      const response = await verifyOtp(email, otp);

      if (response.success) {
        setLoginStep("success");
        setSuccessMessage(`Welcome back, ${response.user.name || response.user.email}!`);
        
        // Redirect to dashboard after brief success message
        setTimeout(() => {
          navigate("/user-dashboard");
        }, 1500);
      } else {
        // SECURITY: Generic error message
        setError(response.error || "Invalid or expired code. Please try again.");
        setOtp(""); // Clear OTP input on error
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError("Invalid or expired code. Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // RESEND OTP
  // ========================
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setError("");
    setLoading(true);

    try {
      const response = await requestOtp(email);

      if (response.success) {
        setSuccessMessage("New code sent! Check your email.");
        setTimeout(() => setSuccessMessage(""), 3000);
        startResendCooldown();
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("Unable to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // RESEND COOLDOWN TIMER
  // ========================
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ========================
  // CHANGE EMAIL (Go back to step 1)
  // ========================
  const handleChangeEmail = () => {
    setLoginStep("request");
    setOtp("");
    setError("");
    setSuccessMessage("");
  };

  // ========================
  // RENDER: STEP 1 - REQUEST OTP
  // ========================
  if (loginStep === "request") {
    return (
      <div className="passwordless-container">
        <div className="passwordless-card">
          <h2>Login with Email 📧</h2>
          <p className="subtitle">
            We'll send a secure code to your email. No password needed!
          </p>

          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <form onSubmit={handleRequestOtp}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />

            <button
              type="submit"
              className="auth-btn"
              disabled={loading || !email}
            >
              {loading ? "Sending code..." : "Send Login Code"}
            </button>
          </form>

          <div className="auth-links">
            <p>
              Prefer traditional login?{" "}
              <span className="link" onClick={() => navigate("/login")}>
                Use Password
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // RENDER: STEP 2 - VERIFY OTP
  // ========================
  if (loginStep === "verify") {
    return (
      <div className="passwordless-container">
        <div className="passwordless-card">
          <h2>Enter Your Code 🔐</h2>
          <p className="subtitle">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>

          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => {
                // Only allow numbers, max 6 digits
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
              }}
              maxLength={6}
              required
              disabled={loading}
              autoFocus
              className="otp-input"
            />

            <button
              type="submit"
              className="auth-btn"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Log In"}
            </button>
          </form>

          <div className="auth-links">
            <p>
              Didn't receive the code?{" "}
              {resendCooldown > 0 ? (
                <span className="disabled-link">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <span className="link" onClick={handleResendOtp}>
                  Resend Code
                </span>
              )}
            </p>

            <p>
              Wrong email?{" "}
              <span className="link" onClick={handleChangeEmail}>
                Change Email
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // RENDER: STEP 3 - SUCCESS
  // ========================
  if (loginStep === "success") {
    return (
      <div className="passwordless-container">
        <div className="passwordless-card success-card">
          <div className="success-icon">✓</div>
          <h2>Login Successful!</h2>
          {successMessage && <p className="success-text">{successMessage}</p>}
          <p className="subtitle">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}