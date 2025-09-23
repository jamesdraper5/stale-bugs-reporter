import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock node-fetch before importing the module
const mockFetch = jest.fn();
jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

// Mock console methods to reduce test output
const originalConsole = console;
console.log = jest.fn();
console.error = jest.fn();

// Mock process.env
const originalEnv = process.env;

// Now import the module after mocking
const { calculateBugScore } = await import('../lib/teamwork.js');

describe('teamwork.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      TEAMWORK_API_KEY: 'test-api-key',
      DESK_API_KEY: 'test-desk-key',
      TEAMWORK_BASE_URL: 'https://test-teamwork.com'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe('calculateBugScore', () => {
    test('should calculate bug score with default values', () => {
      const result = calculateBugScore({});
      expect(result).toBe(2); // default score (LEVEL_3.MEDIUM = 2) + 0 tickets
    });

    test('should calculate score for LEVEL_0 HIGH priority', () => {
      const result = calculateBugScore({
        impact: 'LEVEL_0',
        priority: 'HIGH',
        ticketCount: 5
      });
      expect(result).toBe(15); // 10 + 5
    });

    test('should calculate score for LEVEL_2 MEDIUM priority', () => {
      const result = calculateBugScore({
        impact: 'LEVEL_2',
        priority: 'MEDIUM',
        ticketCount: 3
      });
      expect(result).toBe(7); // 4 + 3
    });

    test('should calculate score for LEVEL_4 LOW priority', () => {
      const result = calculateBugScore({
        impact: 'LEVEL_4',
        priority: 'LOW',
        ticketCount: 2
      });
      expect(result).toBe(3); // 1 + 2
    });

    test('should handle mixed case impact levels', () => {
      const result = calculateBugScore({
        impact: 'level 2',
        priority: 'high',
        ticketCount: 1
      });
      expect(result).toBe(6); // 5 + 1
    });

    test('should use default score for unknown impact', () => {
      const result = calculateBugScore({
        impact: 'UNKNOWN_LEVEL',
        priority: 'HIGH',
        ticketCount: 0
      });
      expect(result).toBe(2); // default score
    });

    test('should use default score for unknown priority', () => {
      const result = calculateBugScore({
        impact: 'LEVEL_1',
        priority: 'UNKNOWN_PRIORITY',
        ticketCount: 0
      });
      expect(result).toBe(2); // default score
    });

    test('should handle null/undefined values', () => {
      const result = calculateBugScore({
        impact: null,
        priority: undefined,
        ticketCount: 0
      });
      expect(result).toBe(2); // default score
    });

    test('should handle empty string values', () => {
      const result = calculateBugScore({
        impact: '',
        priority: '',
        ticketCount: 0
      });
      expect(result).toBe(2); // default score
    });

    test('should handle negative ticket count', () => {
      const result = calculateBugScore({
        impact: 'LEVEL_1',
        priority: 'HIGH',
        ticketCount: -1
      });
      expect(result).toBe(9); // 10 + (-1)
    });
  });

  // Note: Other functions in teamwork.js make actual API calls and would be better tested
  // through integration tests or by refactoring to make them more testable with dependency injection
});