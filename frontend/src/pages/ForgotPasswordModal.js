import React, { useState } from "react";
import { requestOtp, verifyOtp } from "../services/passwordlessAuthService";
import "../styles/ForgotPasswordModal.css";

export default function ForgotPasswordModal({ isOpen, onClose, onSuccess, userType }) {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await requestOtp(email, userType);
      if (response.success) {
        setStep("verify");
        startResendCooldown();
      }
    } catch (err) {
      setError("Unable to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (otp.length !== 6) {
      setError("Please enter a 6-digit code.");
      setLoading(false);
      return;
    }

    try {
      const response = await verifyOtp(email, otp, userType);
      
      console.log('OTP Verify Response:', response);
      
      if (response.success) {
        // Store tokens based on user type
        localStorage.setItem('token', response.token);
        
        if (userType === 'admin') {
          localStorage.setItem('adminToken', response.token);
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('admin', JSON.stringify(response.user));
          localStorage.setItem('adminData', JSON.stringify(response.user));
          localStorage.setItem('userData', JSON.stringify(response.user));
        } else {
          localStorage.setItem('isAdmin', 'false');
          localStorage.setItem('user', JSON.stringify(response.user));
          localStorage.setItem('userData', JSON.stringify(response.user));
        }
        
        // Dispatch auth change
        window.dispatchEvent(new Event('authChange'));
        
        // Close modal and trigger success
        onSuccess(response);
        handleClose();
      } else {
        setError(response.error || "Invalid or expired code.");
        setOtp("");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError("Invalid or expired code.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      await requestOtp(email, userType);
      startResendCooldown();
    } catch (err) {
      setError("Unable to resend code.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleClose = () => {
    setStep("request");
    setEmail("");
    setOtp("");
    setError("");
    setResendCooldown(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>×</button>
        
        {step === "request" ? (
          <>
            <h2>Forgot Password?</h2>
            <p className="modal-subtitle">
              We'll send a 6-digit code to your email
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleRequestOtp}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Enter Verification Code</h2>
            <p className="modal-subtitle">
              Code sent to <strong>{email}</strong>
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleVerifyOtp}>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(value);
                }}
                maxLength={6}
                className="otp-input"
                autoFocus
              />
              <button type="submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
            </form>

            <div className="modal-links">
              {resendCooldown > 0 ? (
                <span className="disabled-link">Resend in {resendCooldown}s</span>
              ) : (
                <span className="link" onClick={handleResendOtp}>Resend Code</span>
              )}
              <span className="link" onClick={() => setStep("request")}>Change Email</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}