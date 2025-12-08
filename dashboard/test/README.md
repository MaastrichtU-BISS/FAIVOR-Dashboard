# FAIVOR Dashboard Test Suite

Comprehensive Bun-native test suite for the FAIVOR dashboard application.

## Overview

This test suite provides end-to-end coverage of the FAIVOR dashboard using only Bun's built-in test runner (`bun test`). All external dependencies (database, APIs, browser APIs) are mocked to ensure fast, deterministic, and reliable tests.

## Directory Structure

```
test/
├── unit/                    # Unit tests for isolated modules
│   ├── utils/              # Utility function tests
│   ├── stores/             # Svelte store tests
│   └── repositories/       # Repository layer tests
├── integration/            # Integration tests
│   └── api/               # API route handler tests
├── fixtures/              # Static test data
│   ├── sample-model.json
│   ├── sample-validation-data.json
│   └── sample-csv-data.csv
├── helpers/               # Test utilities and mocks
│   ├── mock-database.ts
│   ├── mock-indexeddb.ts
│   ├── mock-fetch.ts
│   ├── test-factories.ts
│   ├── api-test-helpers.ts
│   └── coverage-thresholds.ts
└── setup/                 # Global test configuration
    └── global-setup.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests
bun test

# Run tests in watch mode (re-run on file changes)
bun test:watch

# Run unit tests only
bun test:unit

# Run integration tests only
bun test:integration

# Run tests with coverage report
bun test:coverage
```

### Coverage Requirements

The test suite enforces minimum coverage thresholds:

- **Statements:** 85%
- **Branches:** 80%
- **Lines:** 85%
- **Functions:** 85%

Coverage reports are generated in:
- **HTML:** `coverage/index.html` (open in browser for detailed view)
- **Terminal:** Summary displayed after running with `--coverage`

## Test Structure

### Unit Tests

Unit tests focus on testing individual functions and modules in isolation:

- **Utils Tests** (`test/unit/utils/`)
  - `validation-transform.test.ts` - Data transformation functions
  - `indexeddb-storage.test.ts` - Browser storage utilities

- **Store Tests** (`test/unit/stores/`)
  - `validation-store.test.ts` - Validation state management

- **Repository Tests** (`test/unit/repositories/`)
  - `model-repository.test.ts` - Database operations (mocked)

### Integration Tests

Integration tests verify that multiple modules work correctly together:

- **API Tests** (`test/integration/api/`)
  - `models-api.test.ts` - Model CRUD endpoints
  - Tests HTTP handlers with mocked dependencies

## Mocking Strategy

All external dependencies are mocked to ensure tests run quickly and deterministically:

### Database Mocking

```typescript
import { mockDb } from '../helpers/mock-database';

// Set up mock response
mockDb.setMockResult('SELECT * FROM models', [mockModel]);

// Execute code that queries the database
const result = await ModelRepository.getAll();

// Verify queries
expect(mockDb.getQueries()).toHaveLength(1);
```

### IndexedDB Mocking

```typescript
import { setupMockIndexedDB } from '../helpers/mock-indexeddb';

// Set up mock IndexedDB
const mockIDB = setupMockIndexedDB();

// Use IndexedDB in tests
await datasetStorage.saveDataset(dataset);

// Verify data
expect(mockIDB.getData('datasets', 'dataset-id')).toBeDefined();
```

### Fetch/API Mocking

```typescript
import { setupMockFetch } from '../helpers/mock-fetch';

const mockFetch = setupMockFetch();

mockFetch.mockResponse({
  url: 'https://api.example.com/models',
  response: { data: mockModel },
  status: 200,
});
```

### File API Mocking

```typescript
import { createFile, createCsvFile } from '../helpers/test-factories';

// Create mock files for testing
const csvFile = createCsvFile('data.csv', 100); // 100 rows
const metadataFile = createMetadataFile({ name: 'Test Dataset' });
```

## Test Factories

Test factories provide convenient functions for creating test data:

```typescript
import {
  createModel,
  createValidationData,
  createValidationFormData,
  createFolderFiles,
} from '../helpers/test-factories';

// Create a complete model with default values
const model = createModel();

// Create with overrides
const customModel = createModel({
  checkpoint_id: 'my-model-123',
  title: 'Custom Model',
});

// Create validation data
const validationData = createValidationData({
  validation_name: 'My Validation',
});
```

## Writing New Tests

### Example Unit Test

```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { myFunction } from '../../src/lib/utils/my-module';

describe('myFunction', () => {
  beforeEach(() => {
    // Reset state before each test
  });

  test('should handle valid input', () => {
    const result = myFunction('valid input');
    expect(result).toBe('expected output');
  });

  test('should handle edge cases', () => {
    expect(() => myFunction('')).toThrow('Invalid input');
  });
});
```

### Example Integration Test

```typescript
import { describe, test, expect, mock } from 'bun:test';
import { GET } from '../../../src/routes/api/my-endpoint/+server';
import { createMockRequest, createMockRequestEvent } from '../../helpers/api-test-helpers';
import { mockDb } from '../../helpers/mock-database';

// Mock dependencies
mock.module('../../../src/lib/db/index', () => ({
  sql: mockDb.sql,
}));

describe('GET /api/my-endpoint', () => {
  test('should return data', async () => {
    mockDb.setMockResult('SELECT', [{ id: 1, name: 'Test' }]);

    const request = createMockRequest('http://localhost/api/my-endpoint');
    const event = createMockRequestEvent(request);

    const response = await GET(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

## Best Practices

### 1. Test Independence
- Each test should be independent and not rely on other tests
- Use `beforeEach` to reset state between tests
- Clean up mocks after tests

### 2. Descriptive Test Names
```typescript
// Good
test('should reject invalid email format', () => {});

// Bad
test('test1', () => {});
```

### 3. Test Edge Cases
- Test happy paths (normal operation)
- Test error paths (invalid input, failures)
- Test boundary conditions (empty arrays, null values, etc.)

### 4. Use Test Factories
- Avoid duplicating test data creation
- Use factories for consistent, maintainable test data
- Override only what's needed for each test

### 5. Mock External Dependencies
- Always mock database calls
- Mock external API calls
- Mock browser APIs (IndexedDB, File API)
- Mock timers and dates for deterministic tests

### 6. Assert Meaningful Things
```typescript
// Good - tests behavior
expect(result.isValid).toBe(true);
expect(result.errors).toHaveLength(0);

// Bad - tests implementation details
expect(result).toMatchSnapshot();
```

## Troubleshooting

### Tests Failing After Code Changes
1. Check if mocks need updating
2. Verify test data matches new schema
3. Review error messages carefully

### Coverage Not Meeting Thresholds
1. Run `bun test:coverage` to see which files need more tests
2. Open `coverage/index.html` to see line-by-line coverage
3. Focus on critical paths first (error handling, business logic)

### Slow Tests
1. Check if any mocks are missing (causing real network/DB calls)
2. Reduce test data size
3. Use `test.only()` to run specific tests during development

### Import Errors
1. Ensure paths are correct (use absolute paths from project root)
2. Check TypeScript configuration
3. Verify mock modules are properly set up

## Environment Variables

Tests use `.env.test` for configuration:

```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=faivor_test
AUTH_SECRET=test-auth-secret
```

These values are used by mocks and don't connect to real services.

## Continuous Integration

While CI/CD is not currently configured, tests are designed to:
- Run in any environment without external dependencies
- Complete quickly (target: < 60 seconds total)
- Provide clear, actionable error messages
- Generate coverage reports automatically

## Contributing

When adding new features:

1. **Write tests first** (TDD approach recommended)
2. **Ensure tests pass**: `bun test`
3. **Check coverage**: `bun test:coverage`
4. **Update documentation** if adding new test patterns
5. **Use existing patterns** from similar tests

## Additional Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [SvelteKit Testing Guide](https://kit.svelte.dev/docs/testing)
- Project-specific patterns: See existing tests in `test/` directory

## Test Statistics

Current coverage (as of last update):
- Total test files: 6+
- Total test cases: 50+
- Test modules covered:
  - ✅ Validation transformations
  - ✅ IndexedDB utilities
  - ✅ Validation stores
  - ✅ Model repository
  - ✅ Models API endpoints
  - ⏳ Additional API routes (planned)
  - ⏳ Validation API routes (planned)

---

For questions or issues with the test suite, refer to the main project README or create an issue.
