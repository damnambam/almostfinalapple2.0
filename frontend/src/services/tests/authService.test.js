// ===================================
// FRONTEND AUTH SERVICE UNIT TESTS
// ===================================
// Tests for authentication service functions (login, logout, token management)

import { login, adminLogin, logout, isAuthenticated, isAdmin } from '../authService';

// ===================================
// MOCK SETUP
// ===================================
// Mock fetch API to simulate HTTP requests without real network calls
global.fetch = jest.fn();

// Mock localStorage to simulate browser storage without real browser
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Override global localStorage before importing authService
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});
global.localStorage = localStorageMock;

// Mock window.dispatchEvent to simulate browser events
const mockDispatchEvent = jest.fn();
global.window = { dispatchEvent: mockDispatchEvent };

// ===================================
// TEST SUITES
// ===================================

describe('🔐 Frontend Auth Service Unit Tests', () => {
  
  // RESET: Clear all mocks before each test
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockDispatchEvent.mockClear();
    
    // Reset mock implementations
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  // ===================================
  // USER LOGIN FUNCTION TESTS
  // ===================================
  describe('👤 login() - User Authentication Function', () => {
    
    // TEST CASE 1: Successful user login
    test('✅ TC201_UserLoginSuccess - Should login user and store data in localStorage', async () => {
      // Arrange: Mock successful API response
      const mockResponse = {
        success: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'fake-token'
      };

      // Mock fetch to return successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Act: Call login function
      const result = await login('test@example.com', 'password123');

      // Assert: Verify API call was made correctly
      expect(fetch).toHaveBeenCalledWith('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });

      // Assert: Verify data was stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'fake-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('isAdmin', 'false');
      
      // Assert: Verify function returns correct result
      expect(result).toEqual(mockResponse);
    });

    // TEST CASE 2: Login API failure
    test('❌ TC202_UserLoginFailure - Should handle login API errors', async () => {
      // Arrange: Mock failed API response
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'Invalid credentials' }),
      });

      // Act & Assert: Expect login to throw error
      await expect(login('wrong@email.com', 'wrongpass')).rejects.toThrow();
    });
  });

  // ===================================
  // ADMIN LOGIN FUNCTION TESTS
  // ===================================
  describe('👨💼 adminLogin() - Admin Authentication Function', () => {
    
    // TEST CASE 3: Successful admin login
    test('✅ TC203_AdminLoginSuccess - Should login admin and set admin flags', async () => {
      // Arrange: Mock successful admin API response
      const mockResponse = {
        token: 'admin-token',
        admin: { id: '1', email: 'admin@test.com', name: 'Admin User' }
      };

      // Mock fetch to return successful admin response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Act: Call adminLogin function
      const result = await adminLogin('admin@test.com', 'adminpass');

      // Assert: Verify admin-specific localStorage settings
      expect(localStorageMock.setItem).toHaveBeenCalledWith('isAdmin', 'true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('adminToken', 'admin-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'admin-token');
    });

    // TEST CASE 4: Admin login failure
    test('❌ TC204_AdminLoginFailure - Should handle admin login errors', async () => {
      // Arrange: Mock failed admin API response
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Admin account is inactive' }),
      });

      // Act & Assert: Expect adminLogin to throw error
      await expect(adminLogin('inactive@admin.com', 'pass')).rejects.toThrow();
    });
  });

  // ===================================
  // LOGOUT FUNCTION TESTS
  // ===================================
  describe('🚪 logout() - User Logout Function', () => {
    
    // TEST CASE 5: Successful logout
    test('✅ TC205_LogoutSuccess - Should clear all stored authentication data', () => {
      // Act: Call logout function
      logout();

      // Assert: Verify all auth data is removed from localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('adminToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('isAdmin');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin');
      
      // Note: dispatchEvent is called but hard to mock in this test setup
    });
  });

  // ===================================
  // AUTHENTICATION CHECK TESTS
  // ===================================
  describe('🔍 isAuthenticated() - Authentication Status Check', () => {
    
    // TEST CASE 6: User is authenticated
    test('✅ TC206_IsAuthenticatedTrue - Should return true when valid token exists', () => {
      // Arrange: Mock localStorage to return valid token
      localStorageMock.getItem.mockReturnValue('valid-token');
      
      // Act: Check authentication status
      const result = isAuthenticated();
      
      // Assert: Should return true
      expect(result).toBe(true);
    });

    // TEST CASE 7: User is not authenticated
    test('❌ TC207_IsAuthenticatedFalse - Should return false when no token exists', () => {
      // Arrange: Mock localStorage to return null (no token)
      localStorageMock.getItem.mockReturnValue(null);
      
      // Act: Check authentication status
      const result = isAuthenticated();
      
      // Assert: Should return false
      expect(result).toBe(false);
    });

    // TEST CASE 8: Invalid token handling
    test('❌ TC208_IsAuthenticatedInvalidToken - Should return false for invalid tokens', () => {
      // Arrange: Mock localStorage to return invalid token values
      localStorageMock.getItem.mockReturnValue('null'); // String 'null'
      expect(isAuthenticated()).toBe(false);
      
      localStorageMock.getItem.mockReturnValue('undefined'); // String 'undefined'
      expect(isAuthenticated()).toBe(false);
      
      localStorageMock.getItem.mockReturnValue('   '); // Empty spaces
      expect(isAuthenticated()).toBe(false);
    });
  });

  // ===================================
  // ADMIN STATUS CHECK TESTS
  // ===================================
  describe('👑 isAdmin() - Admin Status Check', () => {
    
    // TEST CASE 9: User is admin
    test('✅ TC209_IsAdminTrue - Should return true when user is admin', () => {
      // Arrange: Mock localStorage to return admin status as true
      localStorageMock.getItem.mockReturnValue('true');
      
      // Act: Check admin status
      const result = isAdmin();
      
      // Assert: Should return true
      expect(result).toBe(true);
    });

    // TEST CASE 10: User is not admin
    test('❌ TC210_IsAdminFalse - Should return false when user is not admin', () => {
      // Arrange: Mock localStorage to return admin status as false
      localStorageMock.getItem.mockReturnValue('false');
      
      // Act: Check admin status
      const result = isAdmin();
      
      // Assert: Should return false
      expect(result).toBe(false);
    });

    // TEST CASE 11: No admin status set
    test('❌ TC211_IsAdminNull - Should return false when no admin status is set', () => {
      // Arrange: Mock localStorage to return null
      localStorageMock.getItem.mockReturnValue(null);
      
      // Act: Check admin status
      const result = isAdmin();
      
      // Assert: Should return false
      expect(result).toBe(false);
    });
  });

  // ===================================
  // ADD YOUR NEW FRONTEND TEST CASES HERE
  // ===================================
  // Template for new frontend test:
  /*
  describe('🔧 New Feature Tests', () => {
    test('✅ TC212_YourTestName - Description of what it tests', () => {
      // Arrange: Setup test data and mocks
      
      // Act: Call the function being tested
      
      // Assert: Verify the expected behavior
    });
  });
  */
});