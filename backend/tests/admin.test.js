// ===================================
// ADMIN AUTHENTICATION API TESTS
// ===================================
// Tests for admin login, account status, and authorization

// TC101 - Successful admin login

// TC102 - Inactive admin account rejection

// TC103 - Invalid admin credentials

// TC104 - Wrong password for existing admin

// TC105 - Missing required fields

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import express from 'express';
import cors from 'cors';
import { Admin } from '../models/Admin.js';

let mongoServer;
let app;

// SETUP: Run before all tests - creates test environment
beforeAll(async () => {
  // Create in-memory MongoDB for testing
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Setup Express app with admin login route
  app = express();
  app.use(express.json());
  app.use(cors());
  
  // Admin login route - mirrors the actual server implementation
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Find admin by email
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if admin account is active
      if (!admin.isActive) {
        return res.status(401).json({ error: "Admin account is inactive" });
      }

      // Verify password
      const match = await bcrypt.compare(password, admin.password);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate admin token
      const token = `admin-${admin._id}-${Date.now()}`;
      
      // Return success response
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
      res.status(500).json({ error: "Server Error", details: err.message });
    }
  });
});

// CLEANUP: Run after all tests - destroys test environment
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// RESET: Run after each test - cleans database
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ===================================
// TEST SUITES
// ===================================

describe('👨💼 Admin Authentication API Tests', () => {
  
  // ===================================
  // ADMIN LOGIN TESTS
  // ===================================
  describe('🔑 POST /api/admin/login - Admin Authentication', () => {
    
    // TEST CASE 1: Successful admin login
    test('✅ TC101_AdminLoginSuccess - Should login admin with valid credentials', async () => {
      // Arrange: Create an active admin account
      const hashedPassword = await bcrypt.hash('adminpass123', 10);
      
      await Admin.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        isActive: true // Admin account is active
      });

      // Act: Send admin login request
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'adminpass123'
        })
        .expect(200); // Expect HTTP 200 OK

      // Assert: Verify admin login response
      expect(response.body.token).toBeDefined(); // Should return admin token
      expect(response.body.message).toBe('Admin login successful');
      expect(response.body.admin.email).toBe('admin@test.com');
      expect(response.body.admin.name).toBe('Test Admin');
      expect(response.body.admin.role).toBeDefined();
    });

    // TEST CASE 2: Inactive admin account rejection
    test('❌ TC102_AdminInactiveAccount - Should reject login for inactive admin', async () => {
      // Arrange: Create an inactive admin account
      const hashedPassword = await bcrypt.hash('adminpass123', 10);
      
      await Admin.create({
        name: 'Inactive Admin',
        email: 'inactive@test.com',
        password: hashedPassword,
        isActive: false // Admin account is inactive
      });

      // Act: Try to login with inactive admin
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'inactive@test.com',
          password: 'adminpass123'
        })
        .expect(401); // Expect HTTP 401 Unauthorized

      // Assert: Verify rejection message
      expect(response.body.error).toBe('Admin account is inactive');
      expect(response.body.token).toBeUndefined(); // Should not return token
    });

    // TEST CASE 3: Invalid admin credentials
    test('❌ TC103_AdminInvalidCredentials - Should reject wrong admin email/password', async () => {
      // Act: Try to login with non-existent admin
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'nonexistent@admin.com',
          password: 'wrongpassword'
        })
        .expect(401); // Expect HTTP 401 Unauthorized

      // Assert: Verify error response
      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.token).toBeUndefined();
    });

    // TEST CASE 4: Wrong password for existing admin
    test('❌ TC104_AdminWrongPassword - Should reject correct email with wrong password', async () => {
      // Arrange: Create admin with specific password
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      
      await Admin.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        isActive: true
      });

      // Act: Try to login with wrong password
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Assert: Verify rejection
      expect(response.body.error).toBe('Invalid credentials');
    });

    // TEST CASE 5: Missing required fields
    test('❌ TC105_AdminMissingFields - Should reject login without email or password', async () => {
      // Act & Assert: Test missing email
      const responseNoEmail = await request(app)
        .post('/api/admin/login')
        .send({ password: 'adminpass123' })
        .expect(400); // Expect HTTP 400 Bad Request
      
      expect(responseNoEmail.body.error).toBe('Email and password required');

      // Act & Assert: Test missing password
      const responseNoPassword = await request(app)
        .post('/api/admin/login')
        .send({ email: 'admin@test.com' })
        .expect(400);
      
      expect(responseNoPassword.body.error).toBe('Email and password required');
    });
  });

  // ===================================
  // ADD YOUR NEW ADMIN TEST CASES HERE
  // ===================================
  // Template for new admin test:
  /*
  describe('🔧 Admin Management Tests', () => {
    test('✅ TC106_YourTestName - Description of what it tests', async () => {
      // Arrange: Setup admin test data
      
      // Act: Perform admin action
      
      // Assert: Verify admin result
    });
  });
  */
});