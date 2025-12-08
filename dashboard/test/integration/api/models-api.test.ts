// test/integration/api/models-api.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { GET, POST, DELETE } from '../../../src/routes/api/models/+server';
import {
  createMockRequest,
  createMockRequestEvent,
  parseJsonResponse,
  expectErrorResponse,
  expectSuccessResponse,
} from '../../helpers/api-test-helpers';
import { mockDb } from '../../helpers/mock-database';
import { createModel, createModelMetadata, resetCounters } from '../../helpers/test-factories';

// Mock environment variables
mock.module('$env/static/private', () => ({
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'test_user',
  DB_PASSWORD: 'test_password',
  DB_NAME: 'faivor_test',
  AUTH_SECRET: 'test-secret',
}));

// Mock dependencies
mock.module('../../../src/lib/db/index', () => ({
  sql: mockDb.sql,
  pool: { query: async () => ({ rows: [], rowCount: 0 }), end: async () => {} },
}));

mock.module('../../../src/lib/services/model-import-service', () => ({
  ModelImportService: {
    importModel: async (url: string) => ({
      dbFields: {
        checkpoint_id: 'imported-model-123',
        fair_model_id: 'fair-imported-123',
        fair_model_url: url,
        metadata: createModelMetadata({ title: 'Imported Model' }),
        description: 'Imported from FAIR repository',
      },
    }),
  },
}));

describe('Models API', () => {
  beforeEach(() => {
    mockDb.reset();
    resetCounters();
  });

  describe('GET /api/models', () => {
    test('should return all models with validations', async () => {
      const mockModels = [
        createModel({ checkpoint_id: 'model-1', title: 'Model 1' }),
        createModel({ checkpoint_id: 'model-2', title: 'Model 2' }),
      ];

      mockDb.setMockResult('SELECT', mockModels);

      const request = createMockRequest('http://localhost/api/models');
      const event = createMockRequestEvent(request);

      const response = await GET(event as any);
      const data = await expectSuccessResponse(response);

      expect(data.models).toBeDefined();
      expect(Array.isArray(data.models)).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      // Simulate database error
      mockDb.sql = (() => {
        throw new Error('Database connection failed');
      }) as any;

      const request = createMockRequest('http://localhost/api/models');
      const event = createMockRequestEvent(request);

      const response = await GET(event as any);
      await expectErrorResponse(response, 500, 'Failed to load models');

      mockDb.reset();
    });
  });

  describe('POST /api/models', () => {
    test('should import a new model successfully', async () => {
      const url = 'https://example.com/fair/model/123';
      const modelData = createModel({ checkpoint_id: 'imported-model-123' });

      // Mock repository methods
      mockDb.setMockResult('SELECT 1 FROM model_checkpoints', []); // Model doesn't exist
      mockDb.setMockResult('INSERT INTO model_checkpoints', [modelData]);

      const request = createMockRequest('http://localhost/api/models', {
        method: 'POST',
        json: { url },
      });
      const event = createMockRequestEvent(request);

      const response = await POST(event as any);
      const data = await expectSuccessResponse(response);

      expect(data.model).toBeDefined();
      expect(data.message).toContain('imported successfully');
    });

    test('should reject request without URL', async () => {
      const request = createMockRequest('http://localhost/api/models', {
        method: 'POST',
        json: {},
      });
      const event = createMockRequestEvent(request);

      const response = await POST(event as any);
      await expectErrorResponse(response, 400, 'URL is required');
    });

    test('should reject invalid URL format', async () => {
      const request = createMockRequest('http://localhost/api/models', {
        method: 'POST',
        json: { url: 'not-a-valid-url' },
      });
      const event = createMockRequestEvent(request);

      const response = await POST(event as any);
      await expectErrorResponse(response, 400, 'Invalid URL format');
    });

    test('should reject duplicate model by URL', async () => {
      mockDb.setMockResult('SELECT 1 FROM model_checkpoints', [{ exists: 1 }]);

      const request = createMockRequest('http://localhost/api/models', {
        method: 'POST',
        json: { url: 'https://example.com/model' },
      });
      const event = createMockRequestEvent(request);

      const response = await POST(event as any);
      await expectErrorResponse(response, 409, 'already exists');
    });

    test('should reject duplicate model by checkpoint ID', async () => {
      // First check by URL returns false, then check by checkpoint returns true
      let callCount = 0;
      const originalSql = mockDb.sql;
      mockDb.sql = ((...args: any[]) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([]); // URL check - not found
        } else {
          return Promise.resolve([{ exists: 1 }]); // Checkpoint check - found
        }
      }) as any;

      const request = createMockRequest('http://localhost/api/models', {
        method: 'POST',
        json: { url: 'https://example.com/model' },
      });
      const event = createMockRequestEvent(request);

      const response = await POST(event as any);
      await expectErrorResponse(response, 409, 'already exists');

      mockDb.sql = originalSql;
    });

    test('should handle import service errors', async () => {
      // Mock import service to throw error
      mock.module('../../../src/lib/services/model-import-service', () => ({
        ModelImportService: {
          importModel: async () => {
            throw new Error('Failed to fetch model data');
          },
        },
      }));

      mockDb.setMockResult('SELECT 1 FROM model_checkpoints', []);

      const request = createMockRequest('http://localhost/api/models', {
        method: 'POST',
        json: { url: 'https://example.com/model' },
      });
      const event = createMockRequestEvent(request);

      const response = await POST(event as any);
      await expectErrorResponse(response, 400, 'Unable to fetch model data');
    });
  });

  describe('DELETE /api/models', () => {
    test('should delete an existing model', async () => {
      const modelData = createModel({ checkpoint_id: 'model-to-delete' });

      // Mock model exists
      mockDb.setMockResult('SELECT * FROM model_checkpoints', [modelData]);
      // Mock successful delete
      mockDb.setMockResult('DELETE FROM', []);

      const request = createMockRequest('http://localhost/api/models', {
        method: 'DELETE',
        json: { checkpointId: 'model-to-delete' },
      });
      const event = createMockRequestEvent(request);

      const response = await DELETE(event as any);
      const data = await expectSuccessResponse(response);

      expect(data.message).toContain('deleted successfully');
    });

    test('should reject delete without checkpoint ID', async () => {
      const request = createMockRequest('http://localhost/api/models', {
        method: 'DELETE',
        json: {},
      });
      const event = createMockRequestEvent(request);

      const response = await DELETE(event as any);
      await expectErrorResponse(response, 400, 'Checkpoint ID is required');
    });

    test('should return 404 for non-existent model', async () => {
      mockDb.setMockResult('SELECT * FROM model_checkpoints', []);

      const request = createMockRequest('http://localhost/api/models', {
        method: 'DELETE',
        json: { checkpointId: 'non-existent' },
      });
      const event = createMockRequestEvent(request);

      const response = await DELETE(event as any);
      await expectErrorResponse(response, 404, 'Model not found');
    });

    test('should handle delete failures', async () => {
      const modelData = createModel();
      mockDb.setMockResult('SELECT * FROM model_checkpoints', [modelData]);

      // Simulate delete failure
      const originalSql = mockDb.sql;
      mockDb.sql = ((...args: any[]) => {
        const query = args[0][0];
        if (query.includes('SELECT')) {
          return Promise.resolve([modelData]);
        }
        throw new Error('Delete failed');
      }) as any;

      const request = createMockRequest('http://localhost/api/models', {
        method: 'DELETE',
        json: { checkpointId: 'model-123' },
      });
      const event = createMockRequestEvent(request);

      const response = await DELETE(event as any);
      await expectErrorResponse(response, 500, 'Failed to delete');

      mockDb.sql = originalSql;
    });
  });
});
