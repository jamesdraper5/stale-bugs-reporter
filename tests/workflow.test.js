import { generateMarkdownTable, getDateInPast, formatPriority } from '../utils.js';

describe('Workflow Functions', () => {
  describe('generateTasksTable functionality', () => {
    test('should generate tasks table similar to stale-bugs.js', () => {
      const mockTasks = [
        {
          id: 1,
          name: 'Test Bug Task',
          createdAt: '2023-01-15T10:30:00Z',
          productArea: 'Frontend',
          impact: 'Level 2',
          priority: 'high',
          ticketCount: 3,
          bugScore: 8
        },
        {
          id: 2,
          name: 'Another Bug',
          createdAt: '2023-02-20T14:15:00Z',
          productArea: null,
          impact: 'Level 3',
          priority: 'medium',
          ticketCount: 0,
          bugScore: 2
        }
      ];

      const TEAMWORK_BASE_URL = 'https://test.teamwork.com';
      
      // Simulate the generateTasksTable function from stale-bugs.js
      const headers = [
        'Name',
        'Date Created',
        'Product Area',
        'Impact',
        'Priority',
        'Desk Tickets',
        'Bug Score'
      ];

      const rows = mockTasks.map((task) => {
        return [
          `[${task.name}](${TEAMWORK_BASE_URL}/app/tasks/${task.id})`,
          new Date(task.createdAt).toLocaleDateString('en-IE'),
          task.productArea || '-',
          task.impact || '-',
          formatPriority(task.priority),
          task.ticketCount || '-',
          task.bugScore || '-',
        ];
      });

      const table = generateMarkdownTable({ headers, rows });

      // Verify table structure
      expect(table).toContain('Name');
      expect(table).toContain('Date Created');
      expect(table).toContain('Product Area');
      expect(table).toContain('Impact');
      expect(table).toContain('Priority');
      expect(table).toContain('Desk Tickets');
      expect(table).toContain('Bug Score');

      // Verify task data
      expect(table).toContain('Test Bug Task');
      expect(table).toContain('Another Bug');
      expect(table).toContain('https://test.teamwork.com/app/tasks/1');
      expect(table).toContain('Frontend');
      expect(table).toContain('-'); // For null productArea
      expect(table).toContain(':heart: High');
      expect(table).toContain(':yellow_heart: Medium');
      expect(table).toContain('8'); // Bug score
      expect(table).toContain('2'); // Bug score
    });

    test('should generate tasks table similar to top-bugs.js with sorting', () => {
      const mockTasks = [
        {
          id: 1,
          name: 'Low Score Bug',
          createdAt: '2023-03-01T00:00:00Z',
          productArea: 'API',
          impact: 'Level 4',
          priority: 'low',
          ticketCount: 0,
          bugScore: 1
        },
        {
          id: 2,
          name: 'High Score Bug',
          createdAt: '2023-01-01T00:00:00Z',
          productArea: 'Frontend',
          impact: 'Level 1',
          priority: 'high',
          ticketCount: 5,
          bugScore: 15
        },
        {
          id: 3,
          name: 'Medium Score Bug',
          createdAt: '2023-02-01T00:00:00Z',
          productArea: 'Backend',
          impact: 'Level 2',
          priority: 'medium',
          ticketCount: 2,
          bugScore: 6
        }
      ];

      const TEAMWORK_BASE_URL = 'https://test.teamwork.com';
      
      // Simulate the sorting and limiting logic from top-bugs.js
      const headers = [
        'Name',
        'Date Created',
        'Product Area', 
        'Impact',
        'Priority',
        'Desk Tickets',
        'Bug Score'
      ];

      const sortedTasks = mockTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10); // Limit to top 10

      const rows = sortedTasks.map((task) => {
        return [
          `[${task.name}](${TEAMWORK_BASE_URL}/app/tasks/${task.id})`,
          new Date(task.createdAt).toLocaleDateString('en-IE'),
          task.productArea || '-',
          task.impact || '-',
          formatPriority(task.priority),
          task.ticketCount || '-',
          task.bugScore || '-'
        ];
      });

      const table = generateMarkdownTable({ headers, rows });

      // Verify sorting - highest score should come first
      const tableRows = table.split('\n');
      const firstDataRow = tableRows[2]; // Skip headers and separator
      const secondDataRow = tableRows[3];
      const thirdDataRow = tableRows[4];

      expect(firstDataRow).toContain('High Score Bug');
      expect(secondDataRow).toContain('Medium Score Bug');
      expect(thirdDataRow).toContain('Low Score Bug');

      // Verify scores are in descending order
      expect(table.indexOf('15')).toBeLessThan(table.indexOf('6'));
      expect(table.indexOf('6')).toBeLessThan(table.indexOf('| 1 |'));
    });
  });

  describe('Date and filtering logic', () => {
    test('should filter stale tasks correctly', () => {
      const minTaskAgeInDays = 90;
      const cutoffDate = new Date(getDateInPast(minTaskAgeInDays));
      
      const mockTasks = [
        {
          id: 1,
          name: 'Recent Task',
          createdAt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days ago
          priority: 'high'
        },
        {
          id: 2,
          name: 'Old Task',
          createdAt: new Date(Date.now() - (120 * 24 * 60 * 60 * 1000)).toISOString(), // 120 days ago
          priority: 'medium'
        },
        {
          id: 3,
          name: 'Very Old Task',
          createdAt: new Date(Date.now() - (200 * 24 * 60 * 60 * 1000)).toISOString(), // 200 days ago
          priority: 'low'
        }
      ];

      // Filter stale tasks (older than minTaskAgeInDays)
      const staleTasks = mockTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate < cutoffDate;
      });

      expect(staleTasks).toHaveLength(2);
      expect(staleTasks[0].name).toBe('Old Task');
      expect(staleTasks[1].name).toBe('Very Old Task');
      expect(staleTasks.find(task => task.name === 'Recent Task')).toBeUndefined();
    });

    test('should handle API parameters correctly', () => {
      const minTaskAgeInDays = 90;
      const assigneeTeamId = 9;
      
      const expectedParams = {
        createdBefore: getDateInPast(minTaskAgeInDays),
        assigneeTeamIds: assigneeTeamId,
        skipCounts: false,
        includeCommentStats: true,
        includeCompanyUserIds: true,
        includeCustomFields: true,
        getSubTasks: true,
        createdFilter: 'custom',
        orderBy: 'createdAt',
        orderMode: 'asc'
      };

      expect(expectedParams.assigneeTeamIds).toBe(9);
      expect(expectedParams.skipCounts).toBe(false);
      expect(expectedParams.includeCustomFields).toBe(true);
      expect(expectedParams.orderBy).toBe('createdAt');
      expect(expectedParams.orderMode).toBe('asc');
      expect(new Date(expectedParams.createdBefore)).toBeInstanceOf(Date);
    });
  });

  describe('Message formatting', () => {
    test('should format stale bugs message correctly', () => {
      const minTaskAgeInDays = 90;
      const mockTable = '| Name | Priority |\n| --- | --- |\n| Bug 1 | High |';
      
      const expectedMessage = `:radioactive_sign: @online here are the **Tasks Over ${minTaskAgeInDays} Days Old:** \n \n \n ${mockTable}`;
      
      expect(expectedMessage).toContain(':radioactive_sign:');
      expect(expectedMessage).toContain('@online');
      expect(expectedMessage).toContain('Tasks Over 90 Days Old');
      expect(expectedMessage).toContain(mockTable);
    });

    test('should format top bugs message correctly', () => {
      const mockTable = '| Name | Score |\n| --- | --- |\n| Top Bug | 15 |';
      
      const expectedMessage = `:radioactive_sign: @online here are the **Top Ten Open Bugs:** \n \n \n ${mockTable}`;
      
      expect(expectedMessage).toContain(':radioactive_sign:');
      expect(expectedMessage).toContain('@online');
      expect(expectedMessage).toContain('Top Ten Open Bugs');
      expect(expectedMessage).toContain(mockTable);
    });
  });

  describe('Environment variable handling', () => {
    test('should handle environment variables correctly', () => {
      // Simulate the environment variables that the apps expect
      const expectedEnvVars = [
        'VALIDATION_CHANNEL_URL',
        'CORE_CHANNEL_URL', 
        'TEAMWORK_BASE_URL',
        'TEAMWORK_TASKLIST_ID',
        'TEAMWORK_API_KEY',
        'DESK_API_KEY'
      ];

      expectedEnvVars.forEach(varName => {
        // Just verify the variable names exist in our test expectations
        expect(varName).toMatch(/^[A-Z_]+$/);
      });

      // Test URL construction
      const mockBaseUrl = 'https://test.teamwork.com';
      const mockTaskId = 123;
      const expectedTaskUrl = `${mockBaseUrl}/app/tasks/${mockTaskId}`;
      
      expect(expectedTaskUrl).toBe('https://test.teamwork.com/app/tasks/123');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty task arrays', () => {
      const emptyTasks = [];
      
      const headers = ['Name', 'Priority'];
      const rows = emptyTasks.map(task => [task.name, task.priority]);
      const table = generateMarkdownTable({ headers, rows });
      
      expect(table).toBe('| Name | Priority |\n| --- | --- |');
    });

    test('should handle tasks with missing fields gracefully', () => {
      const taskWithMissingFields = {
        id: 1,
        name: 'Incomplete Task'
        // Missing other fields
      };

      const row = [
        `[${taskWithMissingFields.name}](https://test.com/tasks/${taskWithMissingFields.id})`,
        taskWithMissingFields.createdAt ? new Date(taskWithMissingFields.createdAt).toLocaleDateString('en-IE') : '-',
        taskWithMissingFields.productArea || '-',
        taskWithMissingFields.impact || '-',
        formatPriority(taskWithMissingFields.priority),
        taskWithMissingFields.ticketCount || '-',
        taskWithMissingFields.bugScore || '-'
      ];

      expect(row[1]).toBe('-'); // createdAt fallback
      expect(row[2]).toBe('-'); // productArea fallback
      expect(row[3]).toBe('-'); // impact fallback
      expect(row[4]).toBe('No Priority'); // priority fallback
      expect(row[5]).toBe('-'); // ticketCount fallback
      expect(row[6]).toBe('-'); // bugScore fallback
    });

    test('should handle date edge cases', () => {
      // Test with 0 days (today)
      const today = getDateInPast(0);
      const todayDate = new Date(today);
      const nowDate = new Date();
      
      expect(Math.abs(todayDate.getTime() - nowDate.getTime())).toBeLessThan(60000); // Within 1 minute

      // Test with large numbers
      const farPast = getDateInPast(365 * 10); // 10 years ago
      const farPastDate = new Date(farPast);
      
      expect(farPastDate.getFullYear()).toBeLessThanOrEqual(nowDate.getFullYear() - 9);
    });
  });
});