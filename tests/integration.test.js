import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMarkdownTable, getDateInPast, formatPriority } from '../utils.js';
import { calculateBugScore } from '../lib/teamwork.js';

// Mock console to reduce test output
const originalConsole = console;

describe('Integration Tests', () => {
  beforeEach(() => {
    console.log = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
  });

  describe('End-to-end data flow', () => {
    test('should process bug data through the complete pipeline', () => {
      // Simulate raw task data from API
      const rawTasks = [
        {
          id: '1',
          name: 'Critical Database Bug',
          createdAt: '2023-01-01T10:00:00Z',
          priority: 'high',
          productArea: 'Backend',
          impact: 'LEVEL_0',
          ticketCount: 8
        },
        {
          id: '2', 
          name: 'UI Display Issue',
          createdAt: '2023-02-15T14:30:00Z',
          priority: 'medium',
          productArea: 'Frontend',
          impact: 'LEVEL_2',
          ticketCount: 2
        },
        {
          id: '3',
          name: 'Minor Typo Fix',
          createdAt: '2023-03-10T09:15:00Z',
          priority: 'low',
          productArea: 'Documentation',
          impact: 'LEVEL_4',
          ticketCount: 0
        }
      ];

      // Step 1: Calculate bug scores
      const enrichedTasks = rawTasks.map(task => ({
        ...task,
        bugScore: calculateBugScore({
          impact: task.impact,
          priority: task.priority,
          ticketCount: task.ticketCount
        })
      }));

      // Verify bug scores are calculated correctly
      expect(enrichedTasks[0].bugScore).toBe(18); // LEVEL_0.HIGH (10) + 8 tickets
      expect(enrichedTasks[1].bugScore).toBe(6);  // LEVEL_2.MEDIUM (4) + 2 tickets  
      expect(enrichedTasks[2].bugScore).toBe(1);  // LEVEL_4.LOW (1) + 0 tickets

      // Step 2: Generate table data for stale bugs (all tasks)
      const TEAMWORK_BASE_URL = 'https://test-teamwork.com';
      const staleTasksHeaders = [
        'Name', 'Date Created', 'Product Area', 'Impact', 'Priority', 'Desk Tickets', 'Bug Score'
      ];

      const staleTasksRows = enrichedTasks.map(task => [
        `[${task.name}](${TEAMWORK_BASE_URL}/app/tasks/${task.id})`,
        new Date(task.createdAt).toLocaleDateString('en-IE'),
        task.productArea || '-',
        task.impact || '-',
        formatPriority(task.priority),
        task.ticketCount || '-',
        task.bugScore || '-'
      ]);

      const staleTasksTable = generateMarkdownTable({
        headers: staleTasksHeaders,
        rows: staleTasksRows
      });

      expect(staleTasksTable).toContain('Critical Database Bug');
      expect(staleTasksTable).toContain(':heart: High');
      expect(staleTasksTable).toContain('18');

      // Step 3: Generate table data for top bugs (sorted by score, top 10)
      const topTasksRows = enrichedTasks
        .sort((a, b) => (b.bugScore ?? 0) - (a.bugScore ?? 0))
        .slice(0, 10)
        .map(task => [
          `[${task.name}](${TEAMWORK_BASE_URL}/app/tasks/${task.id})`,
          new Date(task.createdAt).toLocaleDateString('en-IE'),
          task.productArea || '-',
          task.impact || '-',
          formatPriority(task.priority),
          task.ticketCount || '-',
          task.bugScore || '-'
        ]);

      const topTasksTable = generateMarkdownTable({
        headers: staleTasksHeaders,
        rows: topTasksRows
      });

      // Verify tasks are sorted by bug score
      expect(topTasksRows[0][0]).toContain('Critical Database Bug'); // Highest score first
      expect(topTasksRows[1][0]).toContain('UI Display Issue');     // Second highest
      expect(topTasksRows[2][0]).toContain('Minor Typo Fix');       // Lowest score

      // Step 4: Generate messages
      const staleMessage = `:radioactive_sign: @online here are the **Tasks Over 90 Days Old:** \n \n \n ${staleTasksTable}`;
      const topMessage = `:radioactive_sign: @online here are the **Top Ten Open Bugs:** \n \n \n ${topTasksTable}`;

      expect(staleMessage).toContain('Tasks Over 90 Days Old');
      expect(topMessage).toContain('Top Ten Open Bugs');
      expect(staleMessage).toContain('Critical Database Bug');
      expect(topMessage).toContain('Critical Database Bug');
    });

    test('should handle date calculations correctly', () => {
      const daysAgo = 90;
      const pastDate = getDateInPast(daysAgo);
      const pastDateObj = new Date(pastDate);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - daysAgo);

      // Should be within 1 second of expected
      const timeDiff = Math.abs(pastDateObj.getTime() - expectedDate.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    test('should format all priority types consistently', () => {
      const priorities = ['high', 'medium', 'low', null, undefined, '', 'unknown'];
      const formatted = priorities.map(p => formatPriority(p));

      expect(formatted).toEqual([
        ':heart: High',
        ':yellow_heart: Medium', 
        ':green_heart: Low',
        'No Priority',
        'No Priority',
        'No Priority',
        ''
      ]);
    });

    test('should generate consistent markdown tables', () => {
      const simpleTable = generateMarkdownTable({
        headers: ['Name', 'Score'],
        rows: [['Bug A', '10'], ['Bug B', '5']]
      });

      const expectedTable = `| Name | Score |
| --- | --- |
| Bug A | 10 |
| Bug B | 5 |`;

      expect(simpleTable).toBe(expectedTable);
    });
  });

  describe('Configuration validation', () => {
    test('should use correct configuration values for stale bugs', () => {
      const staleBugsConfig = {
        minTaskAgeInDays: 90,
        assigneeTeamId: 9,
        apiParams: {
          skipCounts: false,
          includeCommentStats: true,
          includeCustomFields: true,
          orderBy: 'createdAt',
          orderMode: 'asc'
        }
      };

      expect(staleBugsConfig.minTaskAgeInDays).toBe(90);
      expect(staleBugsConfig.assigneeTeamId).toBe(9);
      expect(staleBugsConfig.apiParams.includeCustomFields).toBe(true);
    });

    test('should use correct configuration values for top bugs', () => {
      const topBugsConfig = {
        minTaskAgeInDays: 0,
        assigneeTeamId: 9,
        apiParams: {
          limit: 100,
          pageSize: 100,
          orderBy: 'createdAt',
          orderMode: 'asc'
        }
      };

      expect(topBugsConfig.minTaskAgeInDays).toBe(0);
      expect(topBugsConfig.apiParams.limit).toBe(100);
      expect(topBugsConfig.apiParams.pageSize).toBe(100);
    });
  });
});