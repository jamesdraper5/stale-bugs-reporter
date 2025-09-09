import { calculateBugScore } from '../lib/teamwork.js';

// Create a mock for fetch since ES module mocking is complex
global.fetch = undefined;

describe('Teamwork Functions', () => {
  describe('calculateBugScore', () => {
    test('should calculate correct score for Level 2 High priority with tickets', () => {
      const result = calculateBugScore({
        impact: 'Level 2',
        priority: 'high',
        ticketCount: 3
      });
      
      expect(result).toBe(8); // 5 (Level 2 High) + 3 (tickets)
    });

    test('should calculate correct score for Level 3 Medium priority with no tickets', () => {
      const result = calculateBugScore({
        impact: 'Level 3',
        priority: 'medium',
        ticketCount: 0
      });
      
      expect(result).toBe(2); // 2 (Level 3 Medium) + 0 (tickets)
    });

    test('should use default values when parameters are missing', () => {
      const result = calculateBugScore({});
      
      expect(result).toBe(2); // Default score for Level 3 medium (2) + 0 tickets
    });

    test('should handle unknown impact levels', () => {
      const result = calculateBugScore({
        impact: 'Unknown Level',
        priority: 'high',
        ticketCount: 2
      });
      
      expect(result).toBe(4); // Default score (2) + 2 tickets
    });

    test('should handle unknown priority levels', () => {
      const result = calculateBugScore({
        impact: 'Level 1',
        priority: 'unknown',
        ticketCount: 1
      });
      
      expect(result).toBe(3); // Default score (2) + 1 ticket
    });

    test('should handle all priority levels correctly', () => {
      expect(calculateBugScore({ impact: 'Level 4', priority: 'high', ticketCount: 0 })).toBe(1);
      expect(calculateBugScore({ impact: 'Level 4', priority: 'medium', ticketCount: 0 })).toBe(1);
      expect(calculateBugScore({ impact: 'Level 4', priority: 'low', ticketCount: 0 })).toBe(1);
    });

    test('should calculate Level 0 and Level 1 scores correctly', () => {
      expect(calculateBugScore({ impact: 'Level 0', priority: 'high', ticketCount: 0 })).toBe(10);
      expect(calculateBugScore({ impact: 'Level 0', priority: 'medium', ticketCount: 0 })).toBe(10);
      expect(calculateBugScore({ impact: 'Level 0', priority: 'low', ticketCount: 0 })).toBe(10);
      
      expect(calculateBugScore({ impact: 'Level 1', priority: 'high', ticketCount: 2 })).toBe(12);
      expect(calculateBugScore({ impact: 'Level 1', priority: 'medium', ticketCount: 1 })).toBe(11);
      expect(calculateBugScore({ impact: 'Level 1', priority: 'low', ticketCount: 0 })).toBe(10);
    });

    test('should calculate Level 2 scores correctly', () => {
      expect(calculateBugScore({ impact: 'Level 2', priority: 'high', ticketCount: 0 })).toBe(5);
      expect(calculateBugScore({ impact: 'Level 2', priority: 'medium', ticketCount: 1 })).toBe(5);
      expect(calculateBugScore({ impact: 'Level 2', priority: 'low', ticketCount: 2 })).toBe(5);
    });

    test('should calculate Level 3 scores correctly', () => {
      expect(calculateBugScore({ impact: 'Level 3', priority: 'high', ticketCount: 1 })).toBe(4);
      expect(calculateBugScore({ impact: 'Level 3', priority: 'medium', ticketCount: 3 })).toBe(5);
      expect(calculateBugScore({ impact: 'Level 3', priority: 'low', ticketCount: 5 })).toBe(6);
    });
  });
});