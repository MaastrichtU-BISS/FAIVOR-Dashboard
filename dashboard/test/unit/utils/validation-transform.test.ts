// test/unit/utils/validation-transform.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import {
  formDataToValidationData,
  mergeValidationData,
  createDefaultValidationData,
  legacyToValidationData,
} from '../../../src/lib/utils/validation-transform';
import { createValidationFormData, createValidationData, resetCounters } from '../../helpers/test-factories';
import type { ValidationData } from '../../../src/lib/types/validation';

describe('validation-transform', () => {
  beforeEach(() => {
    resetCounters();
  });

  describe('formDataToValidationData', () => {
    test('should transform basic form data to validation data', () => {
      const formData = createValidationFormData({
        validationName: 'Test Validation',
        userName: 'John Doe',
        datasetName: 'Test Dataset',
      });

      const result = formDataToValidationData(formData);

      expect(result.validation_name).toBe('Test Validation');
      expect(result.dataset_info?.userName).toBe('John Doe');
      expect(result.dataset_info?.datasetName).toBe('Test Dataset');
    });

    test('should handle uploaded file information', () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const formData = createValidationFormData({
        uploadedFile: mockFile,
        uploadedFolder: undefined,
      });

      const result = formDataToValidationData(formData);

      expect(result.dataset_info?.uploadedFile).toBeDefined();
      expect(result.dataset_info?.uploadedFile?.name).toBe('test.csv');
      expect(result.dataset_info?.uploadedFile?.type).toBe('text/csv');
    });

    test('should handle folder upload information', () => {
      const formData = createValidationFormData({
        folderName: 'test-dataset',
      });

      const result = formDataToValidationData(formData);

      expect(result.dataset_info?.folderUpload).toBeDefined();
      expect(result.dataset_info?.folderUpload?.folderName).toBe('test-dataset');
      expect(result.dataset_info?.folderUpload?.hasMetadata).toBe(true);
      expect(result.dataset_info?.folderUpload?.hasData).toBe(true);
    });

    test('should set validation result flags correctly', () => {
      const formData = createValidationFormData({
        uploadedFile: new File(['content'], 'test.csv'),
        datasetDescription: 'Test description',
        metricsDescription: 'Test metrics',
      });

      const result = formDataToValidationData(formData);

      expect(result.validation_result?.dataProvided).toBe(true);
      expect(result.validation_result?.dataCharacteristics).toBe(true);
      expect(result.validation_result?.metrics).toBe(true);
    });

    test('should handle missing optional fields', () => {
      const formData = createValidationFormData({
        datasetName: '',
        datasetDescription: '',
        metricsDescription: '',
        uploadedFile: null,
        uploadedFolder: undefined,
      });

      const result = formDataToValidationData(formData);

      expect(result.validation_result?.dataProvided).toBe(false);
      expect(result.validation_result?.dataCharacteristics).toBe(false);
      expect(result.validation_result?.metrics).toBe(false);
    });
  });

  describe('mergeValidationData', () => {
    test('should merge validation data correctly', () => {
      const existing = createValidationData({
        validation_name: 'Original Name',
        dataset_info: {
          userName: 'John',
          datasetName: 'Dataset A',
        },
      });

      const updates = {
        validation_name: 'Updated Name',
        dataset_info: {
          datasetName: 'Dataset B',
        },
      };

      const result = mergeValidationData(existing, updates);

      expect(result.validation_name).toBe('Updated Name');
      expect(result.dataset_info?.userName).toBe('John'); // Preserved
      expect(result.dataset_info?.datasetName).toBe('Dataset B'); // Updated
    });

    test('should preserve nested objects when merging', () => {
      const existing = createValidationData({
        validation_result: {
          dataProvided: true,
          metrics: true,
        },
      });

      const updates = {
        validation_result: {
          published: true,
        },
      };

      const result = mergeValidationData(existing, updates);

      expect(result.validation_result?.dataProvided).toBe(true);
      expect(result.validation_result?.metrics).toBe(true);
      expect(result.validation_result?.published).toBe(true);
    });
  });

  describe('createDefaultValidationData', () => {
    test('should create default validation data structure', () => {
      const result = createDefaultValidationData();

      expect(result.dataset_info).toBeDefined();
      expect(result.validation_result).toBeDefined();
      expect(result.validation_result?.dataProvided).toBe(false);
      expect(result.validation_result?.dataCharacteristics).toBe(false);
      expect(result.validation_result?.metrics).toBe(false);
      expect(result.validation_result?.published).toBe(false);
    });
  });

  describe('legacyToValidationData', () => {
    test('should convert legacy format to new format', () => {
      const legacy = {
        validation_name: 'Legacy Validation',
        description: 'Legacy description',
        validation_dataset: 'legacy-dataset.csv',
        validation_result: {
          metrics: true,
        },
      };

      const result = legacyToValidationData(legacy);

      expect(result.validation_name).toBe('Legacy Validation');
      expect(result.dataset_info?.description).toBe('Legacy description');
      expect(result.dataset_info?.datasetName).toBe('legacy-dataset.csv');
      expect(result.validation_result?.dataProvided).toBe(true);
      expect(result.validation_result?.dataCharacteristics).toBe(true);
    });

    test('should handle missing legacy fields', () => {
      const legacy = {
        validation_name: 'Legacy Validation',
      };

      const result = legacyToValidationData(legacy);

      expect(result.validation_result?.dataProvided).toBe(false);
      expect(result.validation_result?.dataCharacteristics).toBe(false);
    });
  });
});
