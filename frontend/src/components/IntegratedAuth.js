import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../services/authService";
import { requestOtp, verifyOtp } from "../services/passwordlessAuthService";
import "../styles/SignupLogin.css";

/**
 * INTEGRATED AUTH COMPONENT
 * ==========================
 * Combines traditional password-based login with passwordless OTP login
 * Users can choose their preferred authentication method
 */

export default function IntegratedAuth() {
  // ========================
  // STATE MANAGEMENT
  // ========================
  const [authMethod, setAuthMethod] = useState("password"); // 'password' | 'passwordless'
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState("request"); // 'request' | 'verify'
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();

  // ========================
  // FORM HANDLERS
  // ========================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  // ========================
  // PASSWORD-BASED AUTH
  // ========================
  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const response = await login(formData.email, formData.password);

        if (response.success) {
          alert(`Welcome back, ${response.user.name || response.user.email}!`);
          navigate("/user-dashboard");
        }
      } else {
        const response = await signup(
          formData.email,
          formData.password,
          formData.name
        );

        if (response.success) {
          alert("Signup successful! Please login.");
          setIsLogin(true);
          setFormData({ ...formData, password: "" });
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // PASSWORDLESS: REQUEST OTP
  // ========================
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await requestOtp(formData.email);

      if (response.success) {
        setSuccessMessage(
          "Check your email for a 6-digit code. It will expire in 10 minutes."
        );

        setTimeout(() => {
          setOtpStep("verify");
          setSuccessMessage("");
        }, 2000);

        startResendCooldown();
      }
    } catch (err) {
      console.error("Request OTP error:", err);
      setError("Unable to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // PASSWORDLESS: VERIFY OTP
  // ========================
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
      const response = await verifyOtp(formData.email, otp);

      if (response.success) {
        setSuccessMessage(
          `Welcome back, ${response.user.name || response.user.email}!`
        );

        setTimeout(() => {
          navigate("/user-dashboard");
        }, 1500);
      } else {
        setError(response.error || "Invalid or expired code. Please try again.");
        setOtp("");
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
      const response = await requestOtp(formData.email);

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
  // UTILITY FUNCTIONS
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setSuccessMessage("");
    setFormData({ email: "", password: "", name: "" });
    setOtp("");
    setOtpStep("request");
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    setError("");
    setSuccessMessage("");
    setFormData({ email: "", password: "", name: "" });
    setOtp("");
    setOtpStep("request");
  };

  const goBackToRequest = () => {
    setOtpStep("request");
    setOtp("");
    setError("");
    setSuccessMessage("");
  };

  // ========================
  // RENDER: PASSWORD METHOD
  // ========================
  if (authMethod === "password") {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLogin ? "Welcome Back 🍎" : "Join Appleverse 🍏"}</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handlePasswordAuth}>
            {!isLogin && (
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          <div className="auth-links">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <span className="link" onClick={toggleMode}>
                {isLogin ? "Sign Up" : "Login"}
              </span>
            </p>

            <div className="divider">
              <span>OR</span>
            </div>

            <button
              className="passwordless-switch-btn"
              onClick={() => switchAuthMethod("passwordless")}
            >
              🔐 Login with Email Code (No Password)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // RENDER: PASSWORDLESS - REQUEST OTP
  // ========================
  if (authMethod === "passwordless" && otpStep === "request") {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Passwordless Login 📧</h2>
          <p className="subtitle">
            We'll send a secure code to your email. No password needed!
          </p>

          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <form onSubmit={handleRequestOtp}>
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              autoFocus
            />

            <button
              type="submit"
              className="auth-btn"
              disabled={loading || !formData.email}
            >
              {loading ? "Sending code..." : "Send Login Code"}
            </button>
          </form>

          <div className="auth-links">
            <button
              className="passwordless-switch-btn secondary"
              onClick={() => switchAuthMethod("password")}
            >
              ← Back to Password Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // RENDER: PASSWORDLESS - VERIFY OTP
  // ========================
  if (authMethod === "passwordless" && otpStep === "verify") {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Enter Your Code 🔐</h2>
          <p className="subtitle">
            We sent a 6-digit code to <strong>{formData.email}</strong>
          </p>

          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

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
                <span className="disabled-link">Resend in {resendCooldown}s</span>
              ) : (
                <span className="link" onClick={handleResendOtp}>
                  Resend Code
                </span>
              )}
            </p>

            <p>
              Wrong email?{" "}
              <span className="link" onClick={goBackToRequest}>
                Change Email
              </span>
            </p>

            <button
              className="passwordless-switch-btn secondary"
              onClick={() => switchAuthMethod("password")}
            >
              ← Back to Password Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}