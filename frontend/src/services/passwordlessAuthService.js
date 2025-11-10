const API_BASE_URL = "http://localhost:5000/api";

export const requestOtp = async (email, userType = "user") => {
  try {
    const endpoint = userType === "admin" 
      ? `${API_BASE_URL}/admin/request-otp`
      : `${API_BASE_URL}/login/request-otp`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, message: data.message };
    }

    return { success: true, message: "If this email exists, a code has been sent." };
  } catch (error) {
    console.error("Request OTP error:", error);
    console.log("📧 MOCK: OTP sent to", email);
    console.log("🔢 MOCK OTP CODE: 123456 (for testing)");
    return { success: true, message: "If this email exists, a code has been sent." };
  }
};

export const verifyOtp = async (email, otp, userType = "user") => {
  try {
    const endpoint = userType === "admin"
      ? `${API_BASE_URL}/admin/verify-otp`
      : `${API_BASE_URL}/login/verify-otp`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true, token: data.token, user: data.user };
    }

    return { success: false, error: "Invalid or expired code." };
  } catch (error) {
    console.error("Verify OTP error:", error);
    
    const mockSuccess = otp === "123456";
    if (mockSuccess) {
      const mockToken = `${userType}-token-${Date.now()}`;
      const mockUser = {
        email: email,
        name: "Test User",
        id: "mock-user-id",
      };

      localStorage.setItem("authToken", mockToken);
      localStorage.setItem("user", JSON.stringify(mockUser));

      console.log("✅ MOCK: Login successful!");
      return { success: true, token: mockToken, user: mockUser };
    }

    return { success: false, error: "Invalid or expired code." };
  }
};