// Backend: routes/adminRoutes.js (Unified with Mongoose)
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Admin, PendingRequest, RejectedRequest } from '../models/Admin.js';

const router = express.Router();

// ========================
// IN-MEMORY OTP STORAGE FOR ADMINS
// ========================
const adminOtpStore = new Map();

// ========================
// ADMIN LOGIN (PASSWORD-BASED)
// ========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Admin login attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('❌ Admin not found:', email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!admin.isActive) {
      console.log('❌ Admin account is inactive:', email);
      return res.status(401).json({ error: "Admin account is inactive" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    admin.lastLogin = new Date();
    admin.activityLog.push({
      action: 'Login',
      details: 'Admin logged in with password',
      timestamp: new Date()
    });
    await admin.save();

    // Generate token
    const token = `admin-${admin._id}-${Date.now()}`;
    
    console.log('✅ Admin login successful, token generated:', token);

    res.json({ 
      token: token, 
      message: "Admin login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role || 'Admin'
      }
    });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ error: "Server Error", details: err.message });
  }
});

// ========================
// MIDDLEWARE - Verify Admin Token
// ========================
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  console.log('🔐 Auth Header:', authHeader);
  console.log('🔐 Token received:', token);
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  // Accept any token that exists (for development)
  // In production, you'd verify the JWT properly
  if (token && token.length > 0) {
    console.log('✅ Token accepted');
    // Extract admin ID from token (format: admin-{id}-{timestamp})
    const adminId = token.split('-')[1];
    req.adminId = adminId;
    next();
  } else {
    console.log('❌ Invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ========================
// REQUEST OTP FOR ADMIN (FORGOT PASSWORD)
// ========================
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(200).json({
        success: true,
        message: 'If this email exists, a login code has been sent.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for recent OTP request (cooldown)
    const existingOTP = adminOtpStore.get(normalizedEmail);
    if (existingOTP && existingOTP.lastSent) {
      const timeSinceLastSend = Date.now() - existingOTP.lastSent;
      if (timeSinceLastSend < 60000) { // 60 second cooldown
        return res.status(200).json({
          success: true,
          message: 'If this email exists, a login code has been sent.'
        });
      }
    }

    // Check if admin exists and is active
    const admin = await Admin.findOne({ email: normalizedEmail, isActive: true });

    if (admin) {
      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
      const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

      // Store OTP
      adminOtpStore.set(normalizedEmail, {
        otp: hashedOTP,
        expiresAt,
        attempts: 0,
        lastSent: Date.now()
      });

      // TODO: Send email with OTP
      console.log(`✅ Admin OTP generated for ${normalizedEmail}`);
      console.log(`🔢 Admin OTP: ${otp} (expires in 10 minutes)`);
    } else {
      console.log(`⚠️ OTP requested for non-existent/inactive admin: ${normalizedEmail}`);
    }

    // Always return success (security measure)
    res.status(200).json({
      success: true,
      message: 'If this email exists, a login code has been sent.'
    });

  } catch (error) {
    console.error('❌ Admin OTP request error:', error);
    res.status(200).json({
      success: true,
      message: 'If this email exists, a login code has been sent.'
    });
  }
});

// ========================
// VERIFY OTP FOR ADMIN (FORGOT PASSWORD LOGIN)
// ========================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if OTP exists
    const storedOTP = adminOtpStore.get(normalizedEmail);

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // Check expiration
    if (Date.now() > storedOTP.expiresAt) {
      adminOtpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // Check attempt limit
    if (storedOTP.attempts >= 5) {
      adminOtpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Too many failed attempts. Please request a new code.'
      });
    }

    // Verify OTP
    const hashedInputOTP = crypto.createHash('sha256').update(otp).digest('hex');

    if (hashedInputOTP !== storedOTP.otp) {
      storedOTP.attempts += 1;
      adminOtpStore.set(normalizedEmail, storedOTP);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // OTP is valid - find admin
    const admin = await Admin.findOne({ email: normalizedEmail, isActive: true });

    if (!admin) {
      adminOtpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired code. Please try again.'
      });
    }

    // Delete OTP (single use)
    adminOtpStore.delete(normalizedEmail);

    // Generate token
    const token = `admin-${admin._id}-${Date.now()}`;

    // Update last login
    admin.lastLogin = new Date();
    admin.activityLog.push({
      action: 'Login via OTP',
      details: 'Admin logged in using forgot password OTP',
      timestamp: new Date()
    });
    await admin.save();

    console.log(`✅ Admin OTP login successful for ${normalizedEmail}`);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('❌ Admin OTP verify error:', error);
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
  for (const [email, data] of adminOtpStore.entries()) {
    if (now > data.expiresAt) {
      adminOtpStore.delete(email);
      console.log(`🧹 Cleaned up expired admin OTP for ${email}`);
    }
  }
}, 60000); // Run every minute

// ========================
// GET PENDING ADMIN REQUESTS
// ========================
router.get('/pending-requests', verifyAdminToken, async (req, res) => {
  try {
    console.log('📥 Fetching pending requests...');
    const pendingRequests = await PendingRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();

    console.log('✅ Found', pendingRequests.length, 'pending requests');
    res.json({ 
      success: true, 
      requests: pendingRequests 
    });
  } catch (error) {
    console.error('❌ Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: error.message });
  }
});

// ========================
// GET ALL CURRENT ADMINS
// ========================
router.get('/admins', verifyAdminToken, async (req, res) => {
  try {
    console.log('📥 Fetching current admins...');
    const admins = await Admin.find({})
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .lean();

    console.log('✅ Found', admins.length, 'admins');
    res.json({ 
      success: true, 
      admins 
    });
  } catch (error) {
    console.error('❌ Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins', details: error.message });
  }
});

// ========================
// GET REJECTED REQUESTS
// ========================
router.get('/rejected-requests', verifyAdminToken, async (req, res) => {
  try {
    console.log('📥 Fetching rejected requests...');
    const rejectedRequests = await RejectedRequest.find({})
      .sort({ rejectedAt: -1 })
      .lean();

    console.log('✅ Found', rejectedRequests.length, 'rejected requests');
    res.json({ 
      success: true, 
      requests: rejectedRequests 
    });
  } catch (error) {
    console.error('❌ Error fetching rejected requests:', error);
    res.status(500).json({ error: 'Failed to fetch rejected requests', details: error.message });
  }
});

// ========================
// APPROVE ADMIN REQUEST
// ========================
router.post('/approve/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✅ Approving request:', id);

    // Find the pending request
    const pendingRequest = await PendingRequest.findById(id);

    if (!pendingRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Create new admin from pending request
    const newAdmin = new Admin({
      name: pendingRequest.name,
      email: pendingRequest.email,
      password: pendingRequest.password, // Already hashed from signup
      dob: pendingRequest.dob,
      role: 'Admin',
      isActive: true,
      approvedBy: req.adminId,
      approvedAt: new Date(),
      activityLog: [{
        action: 'Account created',
        details: 'Admin account approved and created',
        timestamp: new Date()
      }]
    });

    // Save new admin
    await newAdmin.save();

    // Remove from pending requests
    await PendingRequest.findByIdAndDelete(id);

    console.log('✅ Admin approved successfully');
    res.json({ 
      success: true, 
      message: 'Admin approved successfully',
      admin: newAdmin
    });
  } catch (error) {
    console.error('❌ Error approving admin:', error);
    res.status(500).json({ error: 'Failed to approve admin request', details: error.message });
  }
});

// ========================
// REJECT ADMIN REQUEST
// ========================
router.post('/reject/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('❌ Rejecting request:', id);

    // Find the pending request
    const pendingRequest = await PendingRequest.findById(id);

    if (!pendingRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Move to rejected requests
    const rejectedRequest = new RejectedRequest({
      name: pendingRequest.name,
      email: pendingRequest.email,
      dob: pendingRequest.dob,
      reason: pendingRequest.reason,
      rejectedBy: req.adminId,
      rejectedAt: new Date(),
      originalRequestDate: pendingRequest.createdAt
    });

    await rejectedRequest.save();

    // Remove from pending requests
    await PendingRequest.findByIdAndDelete(id);

    console.log('✅ Request rejected successfully');
    res.json({ 
      success: true, 
      message: 'Admin request rejected' 
    });
  } catch (error) {
    console.error('❌ Error rejecting admin:', error);
    res.status(500).json({ error: 'Failed to reject admin request', details: error.message });
  }
});

// ========================
// TOGGLE ADMIN ACTIVE STATUS
// ========================
router.put('/toggle-status/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    console.log('🔄 Toggling admin status:', id, 'to', isActive);

    const admin = await Admin.findByIdAndUpdate(
      id,
      { 
        isActive,
        lastStatusChange: new Date(),
        $push: {
          activityLog: {
            action: `Status changed to ${isActive ? 'active' : 'inactive'}`,
            details: `Admin status updated by ${req.adminId}`,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    console.log('✅ Admin status updated');
    res.json({ 
      success: true, 
      message: 'Admin status updated successfully',
      admin
    });
  } catch (error) {
    console.error('❌ Error updating admin status:', error);
    res.status(500).json({ error: 'Failed to update admin status', details: error.message });
  }
});

// ========================
// GET ADMIN ACTIVITY LOG
// ========================
router.get('/activity/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📋 Fetching activity log for admin:', id);

    const admin = await Admin.findById(id).select('activityLog name email');

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    console.log('✅ Activity log fetched');
    res.json({ 
      success: true, 
      activityLog: admin.activityLog || [] 
    });
  } catch (error) {
    console.error('❌ Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log', details: error.message });
  }
});

// ========================
// DELETE ADMIN (Revoke Access)
// ========================
router.delete('/delete/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting admin:', id);

    // Prevent self-deletion
    if (id === req.adminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    console.log('✅ Admin deleted successfully');
    res.json({ 
      success: true, 
      message: 'Admin deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting admin:', error);
    res.status(500).json({ error: 'Failed to delete admin', details: error.message });
  }
});

// ========================
// REINSTATE REJECTED REQUEST (Move back to pending)
// ========================
router.post('/reinstate/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Reinstating rejected request:', id);

    const rejectedRequest = await RejectedRequest.findById(id);

    if (!rejectedRequest) {
      return res.status(404).json({ error: 'Rejected request not found' });
    }

    // Move back to pending
    const pendingRequest = new PendingRequest({
      name: rejectedRequest.name,
      email: rejectedRequest.email,
      dob: rejectedRequest.dob,
      reason: rejectedRequest.reason,
      status: 'pending'
    });

    await pendingRequest.save();
    await RejectedRequest.findByIdAndDelete(id);

    console.log('✅ Request reinstated successfully');
    res.json({ 
      success: true, 
      message: 'Request reinstated to pending' 
    });
  } catch (error) {
    console.error('❌ Error reinstating request:', error);
    res.status(500).json({ error: 'Failed to reinstate request', details: error.message });
  }
});

export default router;