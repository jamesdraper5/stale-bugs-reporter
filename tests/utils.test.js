import { generateMarkdownTable, getDateInPast, formatPriority } from '../utils.js';

describe('Utils Functions', () => {
  describe('generateMarkdownTable', () => {
    test('should generate a proper markdown table with headers and rows', () => {
      const input = {
        headers: ['Name', 'Age', 'City'],
        rows: [
          ['John', '25', 'NYC'],
          ['Jane', '30', 'LA']
        ]
      };
      
      const expected = '| Name | Age | City |\n| --- | --- | --- |\n| John | 25 | NYC |\n| Jane | 30 | LA |';
      const result = generateMarkdownTable(input);
      
      expect(result).toBe(expected);
    });

    test('should handle empty headers and rows', () => {
      const input = { headers: [], rows: [] };
      const expected = '|  |\n|  |';
      const result = generateMarkdownTable(input);
      
      expect(result).toBe(expected);
    });

    test('should handle only headers without rows', () => {
      const input = { headers: ['Name', 'Age'], rows: [] };
      const expected = '| Name | Age |\n| --- | --- |';
      const result = generateMarkdownTable(input);
      
      expect(result).toBe(expected);
    });

    test('should handle missing parameters gracefully', () => {
      const result = generateMarkdownTable({});
      expect(result).toBe('|  |\n|  |');
    });

    test('should handle single column table', () => {
      const input = {
        headers: ['Name'],
        rows: [['John'], ['Jane']]
      };
      const expected = '| Name |\n| --- |\n| John |\n| Jane |';
      const result = generateMarkdownTable(input);
      
      expect(result).toBe(expected);
    });
  });

  describe('getDateInPast', () => {
    test('should return a date N days in the past', () => {
      const daysAgo = 7;
      const result = getDateInPast(daysAgo);
      const resultDate = new Date(result);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - daysAgo);
      
      // Compare dates without time precision issues
      expect(resultDate.toDateString()).toBe(expectedDate.toDateString());
    });

    test('should return ISO string format', () => {
      const result = getDateInPast(1);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should handle zero days', () => {
      const result = getDateInPast(0);
      const resultDate = new Date(result);
      const today = new Date();
      
      expect(resultDate.toDateString()).toBe(today.toDateString());
    });

    test('should handle large number of days', () => {
      const daysAgo = 365;
      const result = getDateInPast(daysAgo);
      const resultDate = new Date(result);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - daysAgo);
      
      expect(Math.abs(resultDate.getTime() - expectedDate.getTime())).toBeLessThan(24 * 60 * 60 * 1000); // Within 24 hours
    });
  });

  describe('formatPriority', () => {
    test('should format high priority with red heart emoji', () => {
      const result = formatPriority('high');
      expect(result).toBe(':heart: High');
    });

    test('should format medium priority with yellow heart emoji', () => {
      const result = formatPriority('medium');
      expect(result).toBe(':yellow_heart: Medium');
    });

    test('should format low priority with green heart emoji', () => {
      const result = formatPriority('low');
      expect(result).toBe(':green_heart: Low');
    });

    test('should return "No Priority" for null/undefined values', () => {
      expect(formatPriority(null)).toBe('No Priority');
      expect(formatPriority(undefined)).toBe('No Priority');
      expect(formatPriority('')).toBe('No Priority');
    });

    test('should return empty string for unknown priority values', () => {
      expect(formatPriority('unknown')).toBe('');
      expect(formatPriority('critical')).toBe('');
      expect(formatPriority('urgent')).toBe('');
    });

    test('should be case sensitive', () => {
      expect(formatPriority('HIGH')).toBe('');
      expect(formatPriority('Medium')).toBe('');
      expect(formatPriority('LOW')).toBe('');
    });
  });
});