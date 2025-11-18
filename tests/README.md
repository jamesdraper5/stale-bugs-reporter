# Test Suite

This directory contains comprehensive unit tests for the stale-bugs-reporter application.

## Test Structure

### `utils.test.js`
Tests for the utility functions in `utils.js`:
- `generateMarkdownTable()` - Tests markdown table generation with various inputs
- `getDateInPast()` - Tests date calculation functionality 
- `formatPriority()` - Tests priority formatting with emoji icons

### `teamwork.test.js`
Tests for the Teamwork API integration in `lib/teamwork.js`:
- `calculateBugScore()` - Tests bug scoring algorithm with different impact levels and priorities
- Note: API functions are tested only for pure logic due to external dependencies

### `stale-bugs.test.js`
Tests for the stale bugs reporting functionality:
- Task table generation logic
- Configuration validation 
- Message formatting
- Data handling with missing fields

### `top-bugs.test.js`
Tests for the top bugs reporting functionality:
- Task sorting by bug score
- Top 10 limitation logic
- Configuration validation
- Edge cases (empty lists, duplicate scores)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test tests/utils.test.js
```

## Coverage

The test suite achieves 100% coverage for pure utility functions and comprehensive coverage for business logic. API integration functions have limited test coverage due to external dependencies, which is expected for this type of application.

## Test Strategy

1. **Pure Functions**: Full unit test coverage with comprehensive edge cases
2. **Business Logic**: Logic testing without external dependencies 
3. **Configuration**: Validation of application constants and parameters
4. **Data Transformation**: Testing of data mapping and formatting logic
5. **Edge Cases**: Handling of null, undefined, and malformed data

The tests use Vitest with ES modules support and focus on testing the core functionality while mocking external dependencies like API calls.