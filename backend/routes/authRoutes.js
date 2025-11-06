// routes/authRoutes.js
// Authentication routes for regular users (not admins)

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Import User model - adjust path based on your structure
let User;
try {
  const userModel = await import('../models/User.js');
  User = userModel.User || userModel.default;
} catch (err) {
  console.error('❌ Failed to import User model:', err.message);
}

// ========================
// SIGNUP (Register new user)
// ========================
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    console.log('📝 User signup attempt:', email);

    // Validate inputs
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required: email, password, and name.' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format.' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long.' 
      });
    }

    if (!User) {
      return res.status(500).json({ 
        success: false,
        message: 'User model not configured.' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered.' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      createdAt: new Date()
    });

    await newUser.save();

    // Generate token (simple version - you can use JWT)
    const token = `user-${newUser._id}-${Date.now()}`;

    console.log('✅ User created successfully:', email);

    res.status(201).json({
      success: true,
      message: 'Signup successful!',
      token: token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Signup failed. Please try again.',
      error: error.message
    });
  }
});

// ========================
// LOGIN
// ========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 User login attempt:', email);

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required.' 
      });
    }

    if (!User) {
      return res.status(500).json({ 
        success: false,
        message: 'User model not configured.' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }

    // Check if account is active (if your model has this field)
    if (user.isActive === false) {
      console.log('❌ User account is inactive:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Account is inactive. Please contact support.' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }

    // Update last login (if your model has this field)
    if (user.lastLogin !== undefined) {
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate token (simple version - you can use JWT)
    const token = `user-${user._id}-${Date.now()}`;

    console.log('✅ User login successful:', email);

    res.json({
      success: true,
      message: 'Login successful!',
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again.',
      error: error.message
    });
  }
});

// ========================
// LOGOUT (Optional - mainly clears token on frontend)
// ========================
router.post('/logout', (req, res) => {
  console.log('👋 User logout');
  res.json({
    success: true,
    message: 'Logged out successfully!'
  });
});

// ========================
// VERIFY TOKEN (Check if token is valid)
// ========================
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided.' 
      });
    }

    // Extract user ID from token
    let userId;
    if (token.startsWith('user-')) {
      const parts = token.split('-');
      userId = parts[1];
    } else {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format.' 
      });
    }

    if (!User) {
      return res.status(500).json({ 
        success: false,
        message: 'User model not configured.' 
      });
    }

    // Find user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found.' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Token verification failed.',
      error: error.message
    });
  }
});

// ========================
// GET USER PROFILE BY ID (for compatibility)
// ========================
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!User) {
      return res.status(500).json({ 
        success: false,
        message: 'User model not configured.' 
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found.' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profile.',
      error: error.message
    });
  }
});

// ========================
// FORGOT PASSWORD (Optional - send reset email)
// ========================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required.' 
      });
    }

    if (!User) {
      return res.status(500).json({ 
        success: false,
        message: 'User model not configured.' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // TODO: Generate reset token and send email
    // For now, just log it
    console.log('🔑 Password reset requested for:', email);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process request.',
      error: error.message
    });
  }
});

// ========================
// TEST ROUTE (Optional - for debugging)
// ========================
router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date()
  });
});

// Export router as default (ES6)
export default router;