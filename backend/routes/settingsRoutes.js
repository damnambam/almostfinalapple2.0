// settingsRoutes.js - ES6 Module Version
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


const router = express.Router();

// Import models - adjust paths as needed
let User, Admin;
try {
  const userModel = await import('../models/User.js');
  User = userModel.User || userModel.default;
  
  const adminModel = await import('../models/Admin.js');
  Admin = adminModel.Admin || adminModel.default;
} catch (err) {
  console.error('❌ Failed to import models in settingsRoutes:', err.message);
}

// Middleware to verify token (works with simple tokens from your auth system)


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied. No token provided.' 
    });
  }

  try {
    // Parse simple token format: "user-{userId}-{timestamp}" or "admin-{adminId}-{timestamp}"
    let userId, isAdmin = false;
    
    if (token.startsWith('user-')) {
      const parts = token.split('-');
      userId = parts[1];
      isAdmin = false;
    } else if (token.startsWith('admin-')) {
      const parts = token.split('-');
      userId = parts[1];
      isAdmin = true;
    } else {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid token format.' 
      });
    }

    // Attach user info to request
    req.user = {
      id: userId,
      isAdmin: isAdmin
    };
    
    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    res.status(403).json({ 
      success: false,
      error: 'Invalid or expired token.' 
    });
  }
};

// ========================
// UPDATE USER PROFILE
// ========================
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, dob } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Build update object with only provided fields
    const updateData = {};
    
    if (name !== undefined && name !== null) {
      if (name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'Name cannot be empty.' 
        });
      }
      updateData.name = name;
    }
    
    if (email !== undefined && email !== null) {
      if (email.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'Email cannot be empty.' 
        });
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid email format.' 
        });
      }
      updateData.email = email;
    }
    
    if (dob !== undefined && dob !== null) {
      updateData.dob = dob;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update.' 
      });
    }

    // Find and update user in appropriate collection
    let updatedUser;
    if (isAdmin) {
      updatedUser = await Admin.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
    } else {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
    }

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile. Please try again.' 
    });
  }
});

// ========================
// CHANGE PASSWORD
// ========================
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required.' 
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long.' 
      });
    }

    // Find user in appropriate collection
    let user;
    if (isAdmin) {
      user = await Admin.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect.' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password. Please try again.' 
    });
  }
});

// ========================
// GET USER PROFILE
// ========================
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Find user in appropriate collection
    let user;
    if (isAdmin) {
      user = await Admin.findById(userId).select('-password');
    } else {
      user = await User.findById(userId).select('-password');
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile.' 
    });
  }
});

// Export as ES6 default export
export default router;