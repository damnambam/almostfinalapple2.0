import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import bcrypt from "bcrypt";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Import routes and handlers
import authRoutes from "./routes/authRoutes.js";
import adminManagementRoutes from "./routes/adminRoutes.js";
import appleRoutes from "./routes/appleRoutes.js"; //
import settingsRoutes from "./routes/settingsRoutes.js";
import { handleSignupRequest } from "./signupHandler.js";
import { Admin } from "./models/Admin.js";


dotenv.config();

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express setup
const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// MIDDLEWARE
// ========================
app.use(express.json());
app.use(cors({ 
  origin: "http://localhost:3000", 
  credentials: true 
}));

// ========================
// MONGODB CONNECTION (Main DB)
// ========================
mongoose
  .connect("mongodb://localhost:27017/appleverse", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB (appleverse)");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if database connection fails
  });

// ========================
// MULTER SETUP (Image uploads)
// ========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "images")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ========================
// ROUTES
// ========================

// Root
app.get("/", (req, res) => {
  res.json({ 
    message: "🍎 Appleverse API is running!",
    endpoints: {
      user_auth: "/api/auth/*",
      admin_auth: "/api/admin/*",
      apples: "/api/apples/*" // ✅ NEW: Add this line
    }
  });
});

// ========================
// USER AUTHENTICATION ROUTES (Regular Users)
// ========================
app.use("/api/auth", authRoutes);

// ========================
// ADMIN ROUTES (Admin System)
// ========================

// Admin signup request (separate from user signup)
app.post("/api/admin/signup-request", handleSignupRequest);

// Admin login
app.post("/api/admin/login", async (req, res) => {
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
    await admin.save();

    // Generate a proper token
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
// ADMIN MANAGEMENT ROUTES (Dashboard API)
// ========================
app.use("/api/admin", adminManagementRoutes);

// ========================
// APPLE ROUTES (Apple CRUD Operations)
// ✅ NEW: Add this entire section
// ========================
app.use("/api/apples", appleRoutes);

// ========================
// STATIC FILES
// ========================
app.use("/images", express.static(path.join(__dirname, "images")));

// ========================
// SETTINGS ROUTES
// ========================
app.use("/api/auth/settings", settingsRoutes);

// ========================
// STATIC FILES
// ========================
app.use("/images", express.static(path.join(__dirname, "images")));

// ========================
// 404 HANDLER
// ========================
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.url);
  res.status(404).json({ 
    success: false,
    error: "Route not found",
    path: req.url
  });
});

// ========================
// ERROR HANDLING
// ========================
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ 
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 User Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/api/admin/login`);
  console.log(`📊 Admin Dashboard API: http://localhost:${PORT}/api/admin/pending-requests`);
  console.log(`📊 Admin Dashboard API: http://localhost:${PORT}/api/admin/admins`);
  console.log(`🍎 Apple API: http://localhost:${PORT}/api/apples\n`); // ✅ NEW: Add this line
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

