import { describe, test, expect } from '@jest/globals';
import { generateMarkdownTable, getDateInPast, formatPriority } from '../utils.js';

describe('utils.js', () => {
  describe('generateMarkdownTable', () => {
    test('should generate a markdown table with headers and rows', () => {
      const headers = ['Name', 'Age', 'City'];
      const rows = [
        ['John', '25', 'New York'],
        ['Jane', '30', 'London']
      ];
      
      const result = generateMarkdownTable({ headers, rows });
      const expected = `| Name | Age | City |
| --- | --- | --- |
| John | 25 | New York |
| Jane | 30 | London |`;
      
      expect(result).toBe(expected);
    });

    test('should handle empty headers and rows', () => {
      const result = generateMarkdownTable({ headers: [], rows: [] });
      const expected = `|  |
|  |`;
      
      expect(result).toBe(expected);
    });

    test('should work with default parameters', () => {
      const result = generateMarkdownTable({});
      const expected = `|  |
|  |`;
      
      expect(result).toBe(expected);
    });

    test('should handle single column', () => {
      const headers = ['Status'];
      const rows = [['Active'], ['Inactive']];
      
      const result = generateMarkdownTable({ headers, rows });
      const expected = `| Status |
| --- |
| Active |
| Inactive |`;
      
      expect(result).toBe(expected);
    });
  });

  describe('getDateInPast', () => {
    test('should return a date string in ISO format', () => {
      const result = getDateInPast(1);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should return date from 7 days ago', () => {
      const result = getDateInPast(7);
      const resultDate = new Date(result);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Allow for a small time difference (within 1 second)
      const timeDiff = Math.abs(resultDate.getTime() - sevenDaysAgo.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    test('should handle 0 days (today)', () => {
      const result = getDateInPast(0);
      const resultDate = new Date(result);
      const today = new Date();
      
      // Should be very close to current time
      const timeDiff = Math.abs(resultDate.getTime() - today.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    test('should handle large number of days', () => {
      const result = getDateInPast(365);
      const resultDate = new Date(result);
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      
      const timeDiff = Math.abs(resultDate.getTime() - oneYearAgo.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe('formatPriority', () => {
    test('should format high priority correctly', () => {
      const result = formatPriority('high');
      expect(result).toBe(':heart: High');
    });

    test('should format medium priority correctly', () => {
      const result = formatPriority('medium');
      expect(result).toBe(':yellow_heart: Medium');
    });

    test('should format low priority correctly', () => {
      const result = formatPriority('low');
      expect(result).toBe(':green_heart: Low');
    });

    test('should handle null priority', () => {
      const result = formatPriority(null);
      expect(result).toBe('No Priority');
    });

    test('should handle undefined priority', () => {
      const result = formatPriority(undefined);
      expect(result).toBe('No Priority');
    });

    test('should handle empty string priority', () => {
      const result = formatPriority('');
      expect(result).toBe('No Priority');
    });

    test('should return empty string for unknown priority', () => {
      const result = formatPriority('unknown');
      expect(result).toBe('');
    });

    test('should handle case sensitivity', () => {
      expect(formatPriority('HIGH')).toBe('');
      expect(formatPriority('Medium')).toBe('');
      expect(formatPriority('LOW')).toBe('');
    });
  });
});