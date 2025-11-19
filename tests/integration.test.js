import { generateMarkdownTable, getDateInPast, formatPriority } from '../utils.js';
import { calculateBugScore } from '../lib/teamwork.js';

// Mock console.log to prevent output during tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = () => {}; // Simple mock
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('Integration Tests', () => {
  describe('Complete Workflow Simulation', () => {
    test('should process bug scoring and table generation workflow', () => {
      // Simulate task data that would come from API
      const mockTasks = [
        {
          id: 1,
          name: 'High Priority Bug',
          priority: 'high',
          createdAt: '2023-01-01T00:00:00Z',
          impact: 'Level 2',
          productArea: 'Frontend',
          ticketCount: 5
        },
        {
          id: 2,
          name: 'Medium Priority Bug', 
          priority: 'medium',
          createdAt: '2023-02-01T00:00:00Z',
          impact: 'Level 3',
          productArea: 'Backend',
          ticketCount: 2
        },
        {
          id: 3,
          name: 'Low Priority Bug',
          priority: 'low',
          createdAt: '2023-03-01T00:00:00Z',
          impact: 'Level 4',
          productArea: 'API',
          ticketCount: 0
        }
      ];

      // Calculate bug scores for each task
      const enrichedTasks = mockTasks.map(task => ({
        ...task,
        bugScore: calculateBugScore({
          impact: task.impact,
          priority: task.priority,
          ticketCount: task.ticketCount
        })
      }));

      // Verify bug scores are calculated correctly
      expect(enrichedTasks[0].bugScore).toBe(10); // Level 2 High + 5 tickets = 5 + 5 = 10
      expect(enrichedTasks[1].bugScore).toBe(4);  // Level 3 Medium + 2 tickets = 2 + 2 = 4  
      expect(enrichedTasks[2].bugScore).toBe(1);  // Level 4 Low + 0 tickets = 1 + 0 = 1

      // Test stale bugs workflow (tasks over 90 days)
      const staleBugs = enrichedTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        const cutoffDate = new Date(getDateInPast(90));
        return taskDate < cutoffDate;
      });

      expect(staleBugs.length).toBeGreaterThan(0); // Should have some stale bugs

      // Test top bugs workflow (sorted by bug score)
      const topBugs = enrichedTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10);

      expect(topBugs[0].name).toBe('High Priority Bug');
      expect(topBugs[0].bugScore).toBe(10);
      expect(topBugs[1].bugScore).toBeLessThanOrEqual(topBugs[0].bugScore);

      // Test markdown table generation
      const headers = ['Name', 'Date Created', 'Product Area', 'Impact', 'Priority', 'Desk Tickets', 'Bug Score'];
      const rows = topBugs.map((task) => [
        `[${task.name}](https://test.teamwork.com/app/tasks/${task.id})`,
        new Date(task.createdAt).toLocaleDateString('en-IE'),
        task.productArea || '-',
        task.impact || '-',
        formatPriority(task.priority),
        task.ticketCount || '-',
        task.bugScore || '-'
      ]);

      const table = generateMarkdownTable({ headers, rows });

      expect(table).toContain('High Priority Bug');
      expect(table).toContain(':heart: High');
      expect(table).toContain('Frontend');
      expect(table).toContain('5'); // ticket count
      expect(table).toContain('10'); // bug score
    });

    test('should handle date calculations correctly', () => {
      const pastDate = getDateInPast(30);
      const pastDateObj = new Date(pastDate);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);

      // Allow for small time differences (within 24 hours)
      const timeDiff = Math.abs(pastDateObj.getTime() - expectedDate.getTime());
      expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000);
    });

    test('should format priorities with correct emojis', () => {
      expect(formatPriority('high')).toBe(':heart: High');
      expect(formatPriority('medium')).toBe(':yellow_heart: Medium');
      expect(formatPriority('low')).toBe(':green_heart: Low');
      expect(formatPriority('')).toBe('No Priority');
      expect(formatPriority('unknown')).toBe('');
    });

    test('should handle edge cases in bug score calculation', () => {
      // Test all impact levels
      expect(calculateBugScore({ impact: 'Level 0', priority: 'high', ticketCount: 0 })).toBe(10);
      expect(calculateBugScore({ impact: 'Level 1', priority: 'medium', ticketCount: 0 })).toBe(10);
      expect(calculateBugScore({ impact: 'Level 2', priority: 'low', ticketCount: 0 })).toBe(3);
      expect(calculateBugScore({ impact: 'Level 3', priority: 'high', ticketCount: 0 })).toBe(3);
      expect(calculateBugScore({ impact: 'Level 4', priority: 'medium', ticketCount: 0 })).toBe(1);

      // Test with ticket counts
      expect(calculateBugScore({ impact: 'Level 2', priority: 'high', ticketCount: 10 })).toBe(15);
      expect(calculateBugScore({ impact: 'Level 3', priority: 'medium', ticketCount: 5 })).toBe(7);
      
      // Test defaults
      expect(calculateBugScore({})).toBe(2);
      expect(calculateBugScore({ impact: undefined, priority: undefined, ticketCount: undefined })).toBe(2);
    });

    test('should generate proper markdown tables for different scenarios', () => {
      // Single row table
      const singleRowTable = generateMarkdownTable({
        headers: ['Name', 'Score'],
        rows: [['Test Bug', '5']]
      });
      expect(singleRowTable).toBe('| Name | Score |\n| --- | --- |\n| Test Bug | 5 |');

      // Multiple rows table 
      const multiRowTable = generateMarkdownTable({
        headers: ['Bug', 'Priority'],
        rows: [
          ['Bug 1', 'High'],
          ['Bug 2', 'Low']
        ]
      });
      expect(multiRowTable).toContain('Bug 1');
      expect(multiRowTable).toContain('Bug 2');
      expect(multiRowTable).toContain('High');
      expect(multiRowTable).toContain('Low');

      // Table with special characters
      const specialCharTable = generateMarkdownTable({
        headers: ['Name', 'Description'],
        rows: [['Bug & Feature', 'Test | with | pipes']]
      });
      expect(specialCharTable).toContain('Bug & Feature');
      expect(specialCharTable).toContain('Test | with | pipes');
    });
  });

  describe('Data Processing Integration', () => {
    test('should handle custom field processing simulation', () => {
      // Simulate how custom fields would be processed from API response
      const mockIncluded = {
        customfields: {
          '1': { name: 'Impact' },
          '2': { name: 'Product Area' },
          '3': { name: 'Other Field' }
        },
        customfieldTasks: {
          'cf1': { taskId: 1, customfieldId: '1', value: 'Level 2' },
          'cf2': { taskId: 1, customfieldId: '2', value: 'Frontend' },
          'cf3': { taskId: 2, customfieldId: '1', value: 'Level 3' },
          'cf4': { taskId: 2, customfieldId: '3', value: 'Some Value' }
        }
      };

      // Simulate the grouping logic from teamwork.js
      function groupCustomFieldsByTaskId(included) {
        if (!included.customfields) return {};
        if (!included.customfieldTasks) return {};

        const customFieldsPerTask = {};
        Object.values(included.customfieldTasks).forEach((item) => {
          if (!customFieldsPerTask[item.taskId]) {
            customFieldsPerTask[item.taskId] = [];
          }
          customFieldsPerTask[item.taskId].push({
            id: item.customfieldId,
            name: included.customfields[item.customfieldId]?.name,
            value: item.value,
          });
        });
        return customFieldsPerTask;
      }

      const groupedFields = groupCustomFieldsByTaskId(mockIncluded);

      expect(groupedFields[1]).toHaveLength(2);
      expect(groupedFields[1][0].name).toBe('Impact');
      expect(groupedFields[1][0].value).toBe('Level 2');
      expect(groupedFields[1][1].name).toBe('Product Area');
      expect(groupedFields[1][1].value).toBe('Frontend');

      expect(groupedFields[2]).toHaveLength(2);
      expect(groupedFields[2][0].value).toBe('Level 3');

      // Test finding specific fields
      const task1Impact = groupedFields[1]?.find(
        field => field.name.toLowerCase() === 'impact'
      )?.value;
      const task1ProductArea = groupedFields[1]?.find(
        field => field.name.toLowerCase() === 'product area'
      )?.value;

      expect(task1Impact).toBe('Level 2');
      expect(task1ProductArea).toBe('Frontend');
    });

    test('should handle missing or incomplete data gracefully', () => {
      // Test with missing custom fields
      expect(calculateBugScore({ impact: null, priority: null, ticketCount: null })).toBe(2);
      
      // Test with empty strings
      expect(calculateBugScore({ impact: '', priority: '', ticketCount: 0 })).toBe(2);
      
      // Test markdown table with missing data
      const tableWithMissing = generateMarkdownTable({
        headers: ['Name', 'Value'],
        rows: [
          ['Bug 1', '-'],
          ['Bug 2', ''],
          ['Bug 3', null]
        ]
      });
      expect(tableWithMissing).toContain('-');
      expect(tableWithMissing).toContain('Bug 1');
      expect(tableWithMissing).toContain('Bug 2');
    });
  });
});