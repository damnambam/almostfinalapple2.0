// ===================================
// USER AUTHENTICATION API TESTS
// ===================================
// Tests for signup, login, and user management endpoints

// TC001 - Successful signup

// TC002 - Duplicate email rejection

// TC003 - Missing required fields

// TC004 - Successful login

// TC005 - Invalid credentials

// TC006 - Wrong password

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/authRoutes.js';

let mongoServer;
let app;

// SETUP: Run before all tests - creates test environment
beforeAll(async () => {
  // Create in-memory MongoDB for testing
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Setup Express app with auth routes
  app = express();
  app.use(express.json());
  app.use(cors());
  app.use('/api/auth', authRoutes);
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

describe('🔐 User Authentication API Tests', () => {
  
  // ===================================
  // SIGNUP ENDPOINT TESTS
  // ===================================
  describe('📝 POST /api/auth/signup - User Registration', () => {
    
    // TEST CASE 1: Successful user creation
    test('✅ TC001_SignupSuccess - Should create new user with valid data', async () => {
      // Arrange: Prepare test data
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      // Act: Send signup request
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201); // Expect HTTP 201 Created

      // Assert: Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    // TEST CASE 2: Duplicate email rejection
    test('❌ TC002_SignupDuplicate - Should reject duplicate email addresses', async () => {
      // Arrange: Create user data
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Act: Create user first time (should succeed)
      await request(app).post('/api/auth/signup').send(userData);
      
      // Act: Try to create same user again (should fail)
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400); // Expect HTTP 400 Bad Request

      // Assert: Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    // TEST CASE 3: Missing required fields
    test('❌ TC003_SignupMissingFields - Should reject signup without email or password', async () => {
      // Act & Assert: Test missing email
      const responseNoEmail = await request(app)
        .post('/api/auth/signup')
        .send({ password: 'password123' })
        .expect(400);
      
      expect(responseNoEmail.body.success).toBe(false);

      // Act & Assert: Test missing password
      const responseNoPassword = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' })
        .expect(400);
      
      expect(responseNoPassword.body.success).toBe(false);
    });
  });

  // ===================================
  // LOGIN ENDPOINT TESTS
  // ===================================
  describe('🔑 POST /api/auth/login - User Authentication', () => {
    
    // TEST CASE 4: Successful login
    test('✅ TC004_LoginSuccess - Should login with valid credentials', async () => {
      // Arrange: Create a user first
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };
      await request(app).post('/api/auth/signup').send(userData);
      
      // Act: Login with same credentials
      const response = await request(app)
        .post('/api/auth/login')
        .send(userData)
        .expect(200); // Expect HTTP 200 OK

      // Assert: Verify login response
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined(); // Should return a token
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    // TEST CASE 5: Invalid credentials
    test('❌ TC005_LoginInvalidCredentials - Should reject wrong email/password', async () => {
      // Act: Try to login with non-existent user
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401); // Expect HTTP 401 Unauthorized

      // Assert: Verify error response
      expect(response.body.success).toBe(false);
      expect(response.body.token).toBeUndefined(); // Should not return token
    });

    // TEST CASE 6: Wrong password for existing user
    test('❌ TC006_LoginWrongPassword - Should reject correct email with wrong password', async () => {
      // Arrange: Create a user
      const userData = {
        email: 'test@example.com',
        password: 'correctpassword'
      };
      await request(app).post('/api/auth/signup').send(userData);
      
      // Act: Try to login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Assert: Verify rejection
      expect(response.body.success).toBe(false);
    });
  });

  // ===================================
  // ADD YOUR NEW TEST CASES HERE
  // ===================================
  // Template for new test:
  /*
  describe('🔧 Your New Feature Tests', () => {
    test('✅ TC007_YourTestName - Description of what it tests', async () => {
      // Arrange: Setup test data
      
      // Act: Perform the action
      
      // Assert: Verify the result
    });
  });
  */
});