# Test Suite for Stale Bugs Reporter

This directory contains comprehensive unit tests for the stale-bugs-reporter application.

## Test Structure

### `utils.test.js`
Tests for utility functions in `utils.js`:
- **generateMarkdownTable**: Tests table generation with various scenarios (empty tables, single columns, special characters)
- **getDateInPast**: Tests date calculations for different time periods
- **formatPriority**: Tests priority formatting with emojis and edge cases

### `teamwork.test.js`
Tests for core business logic in `lib/teamwork.js`:
- **calculateBugScore**: Comprehensive tests for bug scoring algorithm across all impact levels and priorities
- Tests edge cases, default values, and unknown parameters

### `integration.test.js`
Integration tests that verify complete workflows:
- **Complete Workflow Simulation**: Tests end-to-end bug processing, scoring, and table generation
- **Data Processing**: Tests custom field processing and data enrichment logic
- **Edge Cases**: Tests handling of missing data and error conditions

### `workflow.test.js`
Tests for application workflow functions:
- **generateTasksTable functionality**: Tests table generation matching both stale-bugs.js and top-bugs.js workflows
- **Date and filtering logic**: Tests stale task filtering and API parameter construction
- **Message formatting**: Tests Slack/chat message formatting
- **Environment handling**: Tests environment variable usage patterns
- **Edge cases**: Tests error handling and missing data scenarios

## Running Tests

### Basic test run:
```bash
npm test
```

### Run with coverage:
```bash
npm run test:coverage
```

### Run in watch mode:
```bash
npm run test:watch
```

## Test Coverage

The test suite provides comprehensive coverage of:

✅ **Utils Functions (100% coverage)**
- All utility functions are fully tested
- Edge cases and error conditions covered

✅ **Core Business Logic**  
- Bug scoring algorithm with all impact/priority combinations
- Date calculations and filtering
- Custom field processing simulation

✅ **Workflow Integration**
- Complete stale bugs reporting workflow
- Top bugs reporting workflow 
- Markdown table generation and formatting
- Message formatting for chat/Slack

✅ **Edge Cases**
- Missing or null data handling
- Empty arrays and invalid inputs
- Environment variable patterns
- Error conditions

## Test Philosophy

These tests follow several key principles:

1. **Pure Function Focus**: Most tests focus on pure functions that are easy to test without mocking
2. **Integration Testing**: Tests simulate real workflows without complex API mocking
3. **Edge Case Coverage**: Comprehensive coverage of error conditions and edge cases
4. **Workflow Validation**: Tests validate the complete application workflows match the main scripts

## Notes

- Tests use ES modules and Jest with experimental VM modules support
- Console output is mocked to prevent test noise
- Tests avoid complex API mocking in favor of testing pure business logic
- Integration tests simulate complete workflows using real functions