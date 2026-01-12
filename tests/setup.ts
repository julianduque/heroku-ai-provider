// Jest setup file for global test configuration

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  // error: jest.fn(),
};

// Global test timeout (longer for integration tests with real API calls)
jest.setTimeout(30000);

// Note: fetch is NOT mocked globally to allow integration tests to make real API calls.
// Tests that need to mock fetch should set up their own mocks.

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
