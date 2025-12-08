// test/unit/repositories/model-repository.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { ModelRepository } from '../../../src/lib/repositories/model-repository';
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

// Mock the database module
mock.module('../../../src/lib/db/index', () => ({
  sql: mockDb.sql,
  pool: {
    query: async () => ({ rows: [], rowCount: 0 }),
    end: async () => {},
  },
}));

describe('ModelRepository', () => {
  beforeEach(() => {
    mockDb.reset();
    resetCounters();
  });

  describe('create', () => {
    test('should create a new model', async () => {
      const modelData = {
        checkpointId: 'test-checkpoint-123',
        fairModelId: 'fair-model-123',
        fairModelUrl: 'https://example.com/model',
        metadata: createModelMetadata(),
        description: 'Test model',
      };

      const mockResult = {
        checkpoint_id: modelData.checkpointId,
        fair_model_id: modelData.fairModelId,
        fair_model_url: modelData.fairModelUrl,
        metadata: modelData.metadata,
        description: modelData.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.setMockResult('INSERT INTO model_checkpoints', [mockResult]);

      const result = await ModelRepository.create(modelData);

      expect(result.checkpoint_id).toBe(modelData.checkpointId);
      expect(result.fair_model_id).toBe(modelData.fairModelId);
      expect(result.description).toBe(modelData.description);
    });

    test('should throw error if creation fails', async () => {
      const modelData = {
        checkpointId: 'test-checkpoint-123',
        fairModelId: 'fair-model-123',
        fairModelUrl: 'https://example.com/model',
        metadata: createModelMetadata(),
        description: 'Test model',
      };

      mockDb.setMockResult('INSERT INTO model_checkpoints', []);

      await expect(ModelRepository.create(modelData)).rejects.toThrow('Failed to create model');
    });
  });

  describe('existsByCheckpointId', () => {
    test('should return true if model exists', async () => {
      mockDb.setMockResult('SELECT 1 FROM model_checkpoints', [{ exists: 1 }]);

      const result = await ModelRepository.existsByCheckpointId('test-123');

      expect(result).toBe(true);
    });

    test('should return false if model does not exist', async () => {
      mockDb.setMockResult('SELECT 1 FROM model_checkpoints', []);

      const result = await ModelRepository.existsByCheckpointId('test-123');

      expect(result).toBe(false);
    });
  });

  describe('existsByUrl', () => {
    test('should return true if model with URL exists', async () => {
      mockDb.setMockResult('SELECT 1 FROM model_checkpoints', [{ exists: 1 }]);

      const result = await ModelRepository.existsByUrl('https://example.com/model');

      expect(result).toBe(true);
    });

    test('should return false if model with URL does not exist', async () => {
      mockDb.setMockResult('SELECT 1 FROM model_checkpoints', []);

      const result = await ModelRepository.existsByUrl('https://example.com/model');

      expect(result).toBe(false);
    });
  });

  describe('getByCheckpointId', () => {
    test('should return model if found', async () => {
      const mockModel = createModel();
      mockDb.setMockResult('SELECT * FROM model_checkpoints', [mockModel]);

      const result = await ModelRepository.getByCheckpointId('test-123');

      expect(result).not.toBeNull();
      expect(result?.checkpoint_id).toBe(mockModel.checkpoint_id);
    });

    test('should return null if model not found', async () => {
      mockDb.setMockResult('SELECT * FROM model_checkpoints', []);

      const result = await ModelRepository.getByCheckpointId('test-123');

      expect(result).toBeNull();
    });
  });

  describe('getAllWithValidations', () => {
    test('should return all models with validation counts', async () => {
      const mockModels = [
        {
          ...createModel({ checkpoint_id: 'model-1' }),
          validation_count: '5',
          latest_validation_date: new Date().toISOString(),
          latest_validation_status: 'completed',
        },
        {
          ...createModel({ checkpoint_id: 'model-2' }),
          validation_count: '0',
          latest_validation_date: null,
          latest_validation_status: null,
        },
      ];

      mockDb.setMockResult('SELECT', mockModels);

      const result = await ModelRepository.getAllWithValidations();

      expect(result).toHaveLength(2);
      expect(result[0].validations?.count).toBe(5);
      expect(result[0].validations?.latest).toBeDefined();
      expect(result[1].validations?.count).toBe(0);
      expect(result[1].validations?.latest).toBeUndefined();
    });

    test('should handle string metadata by parsing it', async () => {
      const metadata = createModelMetadata();
      const mockModel = {
        ...createModel(),
        metadata: JSON.stringify(metadata),
        validation_count: '0',
      };

      mockDb.setMockResult('SELECT', [mockModel]);

      const result = await ModelRepository.getAllWithValidations();

      expect(result[0].metadata).toEqual(metadata);
      expect(typeof result[0].metadata).toBe('object');
    });
  });

  describe('search', () => {
    test('should search models by query', async () => {
      const mockModels = [
        createModel({ fair_model_id: 'test-model-1' }),
        createModel({ description: 'Contains test keyword' }),
      ];

      mockDb.setMockResult('SELECT * FROM model_checkpoints', mockModels);

      const result = await ModelRepository.search('test');

      expect(result).toHaveLength(2);
    });

    test('should limit results to 50', async () => {
      const mockModels = Array.from({ length: 60 }, (_, i) =>
        createModel({ checkpoint_id: `model-${i}` })
      );

      mockDb.setMockResult('SELECT * FROM model_checkpoints', mockModels.slice(0, 50));

      const result = await ModelRepository.search('test');

      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('delete', () => {
    test('should delete model and associated validations', async () => {
      mockDb.setMockResult('DELETE FROM validations', []);
      mockDb.setMockResult('DELETE FROM model_checkpoints', []);

      const result = await ModelRepository.delete('test-123');

      expect(result).toBe(true);
    });

    test('should return false on error', async () => {
      // Simulate error by not setting up mock result properly
      const originalConsoleError = console.error;
      console.error = () => {}; // Suppress error log

      mockDb.sql = (() => {
        throw new Error('Database error');
      }) as any;

      const result = await ModelRepository.delete('test-123');

      expect(result).toBe(false);

      console.error = originalConsoleError;
      mockDb.reset(); // Reset mock
    });
  });
});
