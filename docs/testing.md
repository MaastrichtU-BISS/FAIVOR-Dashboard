# FAIVOR Dashboard Test Suite

## Overview

The test suite is located in `dashboard/test/` and uses **Bun's built-in test runner** (`bun:test`). It covers the FAIVOR dashboard application with both **unit tests** and **integration tests**.

## Directory Structure

```
dashboard/test/
├── unit/
│   ├── utils/
│   │   ├── indexeddb-storage.test.ts   # File validation utilities
│   │   └── validation-transform.test.ts # Data transformation utilities
│   ├── stores/
│   │   └── validation-store.test.ts     # Svelte store state management
│   └── repositories/
│       └── model-repository.test.ts     # Database repository layer
├── integration/
│   └── api/
│       └── models-api.test.ts           # REST API endpoint tests
└── helpers/
    ├── test-factories.ts                # Factory functions for test data
    ├── mock-database.ts                 # PostgreSQL mock
    ├── mock-indexeddb.ts                # IndexedDB mock
    ├── mock-fetch.ts                    # HTTP fetch mock
    ├── api-test-helpers.ts              # API testing utilities
    └── coverage-thresholds.ts           # Coverage configuration
```

## Running Tests

```bash
cd dashboard
bun test                    # Run all tests
bun test --watch            # Watch mode
bun test validation-store   # Run specific test file
```

## Test Files Explained

### Unit Tests

#### 1. indexeddb-storage.test.ts

Tests utilities for handling dataset folder uploads:

| Function | Purpose |
|----------|---------|
| `validateDatasetFolder` | Validates uploaded folders contain required files (CSV, optional metadata.json) |
| `parseJSONFile` | Parses JSON files using FileReader API |
| `generateDatasetId` | Generates unique timestamp-based dataset IDs |
| `extractFolderName` | Extracts folder names from `webkitRelativePath` |

**Test scenarios:**
- Valid folder with all required files
- Missing CSV file (should fail)
- Optional column metadata handling
- Files with `webkitRelativePath` (browser folder upload)
- Valid/invalid JSON parsing
- Unique ID generation

#### 2. validation-store.test.ts

Tests two Svelte stores for the validation workflow:

**`validationStore`** - Modal state management:
- Initial state verification
- Open modal in create/edit/view modes
- Close modal
- Update current validation
- Reset to initial state

**`validationFormStore`** - Form state management:
- Field updates (single and multiple)
- Error management (set/clear)
- File and folder upload handling
- Form validation logic
- Submitting state
- Validation results management
- Form data extraction (without UI state)

#### 3. validation-transform.test.ts

Tests data transformation utilities:

| Function | Purpose |
|----------|---------|
| `formDataToValidationData` | Converts form input → database format |
| `mergeValidationData` | Deep merges validation objects |
| `createDefaultValidationData` | Creates empty validation structure |
| `legacyToValidationData` | Migrates old → new validation format |

**Test scenarios:**
- Basic form data transformation
- File upload information handling
- Folder upload information handling
- Validation result flags
- Missing optional fields
- Nested object merging
- Legacy format conversion

#### 4. model-repository.test.ts

Tests the database repository layer for ML models:

| Method | Purpose |
|--------|---------|
| `create` | Create new model records |
| `existsByCheckpointId` | Check existence by checkpoint ID |
| `existsByUrl` | Check existence by FAIR URL |
| `getByCheckpointId` | Retrieve single model |
| `getAllWithValidations` | Fetch all models with validation stats |
| `search` | Full-text search (50-result limit) |
| `delete` | Cascading delete (model + validations) |

**Test scenarios:**
- Successful creation
- Creation failure handling
- Model existence checks
- Not found scenarios
- Validation count aggregation
- String metadata JSON parsing
- Search result limiting
- Delete error handling

### Integration Tests

#### 5. models-api.test.ts

Tests the `/api/models` REST endpoints:

**GET /api/models:**
- Returns all models with validation data
- Handles database errors gracefully (500)

**POST /api/models:**
- Successful model import from FAIR URL
- Missing URL rejection (400)
- Invalid URL format rejection (400)
- Duplicate by URL rejection (409)
- Duplicate by checkpoint ID rejection (409)
- Import service error handling (400)

**DELETE /api/models:**
- Successful model deletion
- Missing checkpoint ID rejection (400)
- Non-existent model (404)
- Delete failure handling (500)

## Test Infrastructure

### test-factories.ts

Factory functions for creating consistent test data:

```typescript
// File mocks
createFile(name, content, type)
createCsvFile(name, rows)
createMetadataFile(overrides)
createFolderFiles(options)

// Validation entities
createValidationFormData(overrides)
createValidationData(overrides)
createValidationRow(overrides)

// Model entities
createModel(overrides)
createModelMetadata(overrides)

// Dataset
createDatasetAnalysis(overrides)

// Utilities
resetCounters()  // Reset auto-increment IDs between tests
```

### mock-database.ts

Mocks PostgreSQL (`postgres` package) for isolated testing:

```typescript
const mockDb = new MockDatabase();

// Set expected results by query pattern
mockDb.setMockResult('SELECT * FROM models', [mockModel1, mockModel2]);
mockDb.setMockResult('INSERT INTO', [newRecord]);

// Query inspection
mockDb.getQueries();    // All executed queries
mockDb.getLastQuery();  // Most recent query

// Cleanup
mockDb.reset();
```

Features:
- Query pattern matching for mock results
- Template literal SQL support
- Transaction mocking (`sql.begin`)
- JSON helper mocking (`sql.json`)

### api-test-helpers.ts

Utilities for API endpoint testing:

```typescript
// Create mock requests
createMockRequest(url, { method, json, headers })
createMockRequestEvent(request)

// Response assertions
expectSuccessResponse(response)  // Returns parsed data
expectErrorResponse(response, status, message)
parseJsonResponse(response)
```

## How Tests Work

1. **Mocking**: Environment variables and modules are mocked using `bun:test`'s `mock.module()`
2. **Setup/Teardown**: `beforeEach` resets counters and mock state
3. **Assertions**: Standard `expect()` matchers
4. **Async Testing**: Full async/await support for DB and API tests

## Adding New Tests

### Unit Test Template

```typescript
// test/unit/[category]/[feature].test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { resetCounters } from '../../helpers/test-factories';

describe('Feature', () => {
  beforeEach(() => {
    resetCounters();
  });

  test('should do something', () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = featureUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Integration Test Template

```typescript
// test/integration/api/[endpoint].test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { GET, POST } from '../../../src/routes/api/endpoint/+server';
import { createMockRequestEvent } from '../../helpers/api-test-helpers';
import { mockDb } from '../../helpers/mock-database';

// Mock environment and dependencies
mock.module('$env/static/private', () => ({ ... }));
mock.module('../../../src/lib/db/index', () => ({ sql: mockDb.sql }));

describe('Endpoint API', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  test('should handle request', async () => {
    mockDb.setMockResult('SELECT', [testData]);

    const event = createMockRequestEvent(request);
    const response = await GET(event);

    expect(response.status).toBe(200);
  });
});
```

## Coverage

Coverage thresholds are configured in `test/helpers/coverage-thresholds.ts`. Run with coverage:

```bash
bun test --coverage
```
