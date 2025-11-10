// ========================
// PASSWORDLESS AUTH ROUTES (Backend)
// routes/passwordlessAuthRoutes.js
// ========================

import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js'; // Adjust to your User model

const router = express.Router();

/**
 * SECURITY BEST PRACTICES IMPLEMENTED:
 * =====================================
 * 1. Rate Limiting: Prevent brute force attacks (implement with express-rate-limit)
 * 2. OTP Expiration: OTPs expire after 10 minutes
 * 3. Generic Responses: Never reveal if email exists in system
 * 4. Secure Storage: OTPs are hashed before storage
 * 5. Single Use: OTPs are deleted after successful verification
 * 6. Email Validation: Validate email format before processing
 */

// In-memory OTP storage (Use Redis in production)
// Structure: { email: { otp: hashedOTP, expiresAt: timestamp, attempts: number } }
const otpStore = new Map();

// Rate limiting configuration (implement with express-rate-limit)
const MAX_ATTEMPTS = 5; // Max verification attempts per OTP
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Generate a secure 6-digit OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash OTP for secure storage
 */
function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Send OTP via email (Mock - integrate with your email service)
 */
async function sendOTPEmail(email, otp) {
  // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
  console.log(`📧 Sending OTP to ${email}: ${otp}`);
  
  // Mock email send
  // await emailService.send({
  //   to: email,
  //   subject: 'Your Login Code',
  //   html: `
  //     <h2>Your Login Code</h2>
  //     <p>Your 6-digit login code is: <strong>${otp}</strong></p>
  //     <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
  //     <p>If you didn't request this code, please ignore this email.</p>
  //   `
  // });
  
  return true;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ========================
// ROUTE 1: REQUEST OTP
// POST /api/login/request-otp
// ========================
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || !isValidEmail(email)) {
      // SECURITY: Generic response even for invalid format
      return res.status(200).json({
        success: true,
        message: 'If this email exists, a login code has been sent.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for recent OTP request (cooldown)
    const existingOTP = otpStore.get(normalizedEmail);
    if (existingOTP && existingOTP.lastSent) {
      const timeSinceLastSend = Date.now() - existingOTP.lastSent;
      if (timeSinceLastSend < RESEND_COOLDOWN_SECONDS * 1000) {
        // SECURITY: Don't reveal cooldown status
        return res.status(200).json({
          success: true,
          message: 'If this email exists, a login code has been sent.'
        });
      }
    }

    // Check if user exists (INTERNAL CHECK ONLY - never exposed to client)
    const userExists = await User.findOne({ email: normalizedEmail });
    
    // Generate and store OTP ONLY if user exists
    // But ALWAYS return success to prevent enumeration
    if (userExists) {
      const otp = generateOTP();
      const hashedOTP = hashOTP(otp);
      const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP with metadata
      otpStore.set(normalizedEmail, {
        otp: hashedOTP,
        expiresAt,
        attempts: 0,
        lastSent: Date.now()
      });

      // Send OTP via email
      await sendOTPEmail(normalizedEmail, otp);

      console.log(`✅ OTP generated for ${normalizedEmail}`);
      console.log(`🔢 OTP: ${otp} (expires in ${OTP_EXPIRY_MINUTES} min)`);
    } else {
      console.log(`⚠️ OTP requested for non-existent email: ${normalizedEmail}`);
      // Still log for security monitoring, but don't reveal to user
    }

    // SECURITY: Always return same response regardless of user existence
    res.status(200).json({
      success: true,
      message: 'If this email exists, a login code has been sent.'
    });

  } catch (error) {
    console.error('❌ Request OTP error:', error);
    
    // SECURITY: Generic error response
    res.status(200).json({
      success: true,
      message: 'If this email exists, a login code has been sent.'
    });
  }
});

// ========================
// ROUTE 2: VERIFY OTP
// POST /api/login/verify-otp
// ========================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if OTP exists
    const storedOTP = otpStore.get(normalizedEmail);

    if (!storedOTP) {
      // SECURITY: Generic error - don't reveal if OTP was never sent
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // Check expiration
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // Check attempt limit
    if (storedOTP.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Too many failed attempts. Please request a new code.'
      });
    }

    // Verify OTP
    const hashedInputOTP = hashOTP(otp);
    
    if (hashedInputOTP !== storedOTP.otp) {
      // Increment failed attempts
      storedOTP.attempts += 1;
      otpStore.set(normalizedEmail, storedOTP);

      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // OTP is valid - proceed with login
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Edge case: User was deleted between OTP request and verification
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // Delete OTP after successful verification (single use)
    otpStore.delete(normalizedEmail);

    // Generate authentication token
    const token = `user-${user._id}-${Date.now()}`; // Replace with JWT
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ Successful login for ${normalizedEmail}`);

    // Return success with token and user data
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    
    // SECURITY: Generic error response
    res.status(400).json({
      success: false,
      error: 'Invalid or expired code. Please try again.'
    });
  }
});

// ========================
// CLEANUP: Remove expired OTPs periodically
// ========================
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`🧹 Cleaned up expired OTP for ${email}`);
    }
  }
}, 60000); // Run every minute

export default router;