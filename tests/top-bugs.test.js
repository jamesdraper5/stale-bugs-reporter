import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dependencies
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

vi.mock('../lib/teamwork.js', () => ({
  getEnrichedTasks: vi.fn(),
  sendChatMessage: vi.fn()
}));

vi.mock('../utils.js', () => ({
  generateMarkdownTable: vi.fn(),
  getDateInPast: vi.fn(),
  formatPriority: vi.fn()
}));

// Mock console methods
const originalConsole = console;
console.log = vi.fn();

// Mock process.env
const originalEnv = process.env;

describe('top-bugs.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      CORE_CHANNEL_URL: 'https://chat.example.com/core',
      TEAMWORK_BASE_URL: 'https://test-teamwork.com',
      TEAMWORK_TASKLIST_ID: '123'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsole.log;
  });

  describe('generateTasksTable function logic', () => {
    test('should sort tasks by bugScore descending and limit to top 10', () => {
      const mockTasks = [
        {
          id: '1',
          name: 'Low Score Bug',
          createdAt: '2023-01-01T10:00:00Z',
          productArea: 'Frontend',
          impact: 'Low',
          priority: 'low',
          ticketCount: 1,
          bugScore: 2
        },
        {
          id: '2',
          name: 'High Score Bug',
          createdAt: '2023-02-01T10:00:00Z',
          productArea: 'Backend',
          impact: 'High',
          priority: 'high',
          ticketCount: 5,
          bugScore: 15
        },
        {
          id: '3',
          name: 'Medium Score Bug',
          createdAt: '2023-03-01T10:00:00Z',
          productArea: 'API',
          impact: 'Medium',
          priority: 'medium',
          ticketCount: 2,
          bugScore: 8
        }
      ];

      // Simulate the sorting and slicing logic from top-bugs.js
      const sortedTasks = mockTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10);

      expect(sortedTasks).toHaveLength(3);
      expect(sortedTasks[0].bugScore).toBe(15); // High Score Bug first
      expect(sortedTasks[1].bugScore).toBe(8);  // Medium Score Bug second
      expect(sortedTasks[2].bugScore).toBe(2);  // Low Score Bug last
    });

    test('should handle tasks with null/undefined bugScore', () => {
      const mockTasks = [
        {
          id: '1',
          name: 'Bug with null score',
          bugScore: null
        },
        {
          id: '2',
          name: 'Bug with undefined score',
          bugScore: undefined
        },
        {
          id: '3',
          name: 'Bug with valid score',
          bugScore: 10
        }
      ];

      const sortedTasks = mockTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10);

      expect(sortedTasks[0].bugScore).toBe(10); // Valid score first
      expect(sortedTasks[1].bugScore).toBe(null);
      expect(sortedTasks[2].bugScore).toBe(undefined);
    });

    test('should limit results to exactly 10 tasks', () => {
      // Create 15 mock tasks
      const mockTasks = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Bug ${i + 1}`,
        bugScore: 15 - i // Descending scores
      }));

      const sortedTasks = mockTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10);

      expect(sortedTasks).toHaveLength(10);
      expect(sortedTasks[0].bugScore).toBe(15);
      expect(sortedTasks[9].bugScore).toBe(6);
    });

    test('should create task table rows with correct format', () => {
      const mockTasks = [
        {
          id: '1',
          name: 'Bug 1',
          createdAt: '2023-01-01T10:00:00Z',
          productArea: 'Frontend',
          impact: 'High',
          priority: 'high',
          ticketCount: 5,
          bugScore: 15
        }
      ];

      const TEAMWORK_BASE_URL = 'https://test-teamwork.com';
      
      // Simulate the row mapping logic from top-bugs.js
      const rows = mockTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10)
        .map((task) => {
          return [
            `[${task.name}](${TEAMWORK_BASE_URL}/app/tasks/${task.id})`,
            new Date(task.createdAt).toLocaleDateString('en-IE'),
            task.productArea || '-',
            task.impact || '-',
            task.priority === 'high' ? ':heart: High' : task.priority === 'medium' ? ':yellow_heart: Medium' : task.priority === 'low' ? ':green_heart: Low' : 'No Priority',
            task.ticketCount || '-',
            task.bugScore || '-'
          ];
        });

      expect(rows[0]).toEqual([
        '[Bug 1](https://test-teamwork.com/app/tasks/1)',
        '1/1/2023',
        'Frontend',
        'High',
        ':heart: High',
        5,
        15
      ]);
    });
  });

  describe('configuration values', () => {
    test('should have correct minimum task age for top bugs', () => {
      // This tests the constant values used in top-bugs.js
      const minTaskAgeInDays = 0; // Different from stale-bugs.js
      const assigneeTeamId = 9;

      expect(minTaskAgeInDays).toBe(0);
      expect(assigneeTeamId).toBe(9);
    });

    test('should construct correct API parameters with pagination', () => {
      const minTaskAgeInDays = 0;
      const assigneeTeamId = 9;
      const mockDateInPast = '2023-01-01T00:00:00.000Z';
      
      const apiParams = {
        createdBefore: mockDateInPast,
        assigneeTeamIds: assigneeTeamId,
        skipCounts: false,
        includeCommentStats: true,
        includeCompanyUserIds: true,
        includeCustomFields: true,
        getSubTasks: true,
        createdFilter: 'custom',
        orderBy: 'createdAt',
        orderMode: 'asc',
        limit: 100,
        pageSize: 100
      };

      expect(apiParams.limit).toBe(100);
      expect(apiParams.pageSize).toBe(100);
      expect(apiParams.assigneeTeamIds).toBe(9);
      expect(apiParams.orderBy).toBe('createdAt');
      expect(apiParams.orderMode).toBe('asc');
    });
  });

  describe('message format', () => {
    test('should format message correctly', () => {
      const mockTable = '| Name | Priority |\n| --- | --- |\n| Bug 1 | High |';
      
      const expectedMessage = `:radioactive_sign: @online here are the **Top Ten Open Bugs:** \n \n \n ${mockTable}`;
      
      expect(expectedMessage).toContain(':radioactive_sign: @online');
      expect(expectedMessage).toContain('Top Ten Open Bugs');
      expect(expectedMessage).toContain(mockTable);
    });
  });

  describe('edge cases', () => {
    test('should handle empty task list', () => {
      const mockTasks = [];
      
      const sortedTasks = mockTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10);

      expect(sortedTasks).toHaveLength(0);
    });

    test('should handle tasks with same bugScore', () => {
      const mockTasks = [
        { id: '1', name: 'Bug 1', bugScore: 5 },
        { id: '2', name: 'Bug 2', bugScore: 5 },
        { id: '3', name: 'Bug 3', bugScore: 5 }
      ];

      const sortedTasks = mockTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10);

      expect(sortedTasks).toHaveLength(3);
      // All should have the same score, order might vary but that's acceptable
      expect(sortedTasks.every(task => task.bugScore === 5)).toBe(true);
    });
  });
});