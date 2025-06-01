// Jest setup file for global test configuration
process.env.NODE_ENV = "test";
process.env.PORT = "8001"; // Use different port for testing
process.env.COINGECKO_API_KEY = "test_api_key";

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console.log to reduce noise during tests (optional)
// global.console = {
//   log: jest.fn(),
//   error: console.error,
//   warn: console.warn,
//   info: jest.fn(),
//   debug: jest.fn(),
// };
