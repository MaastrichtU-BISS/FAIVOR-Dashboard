// test/unit/stores/validation-store.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { get } from 'svelte/store';
import { validationStore, validationFormStore } from '../../../src/lib/stores/models/validation.store';
import { createValidationFormData, createFile, resetCounters } from '../../helpers/test-factories';
import type { ValidationMode } from '../../../src/lib/stores/models/validation.store';

describe('validation stores', () => {
  beforeEach(() => {
    resetCounters();
    validationStore.reset();
    validationFormStore.reset();
  });

  describe('validationStore', () => {
    test('should start with initial state', () => {
      const state = get(validationStore);

      expect(state.isOpen).toBe(false);
      expect(state.mode).toBe('create');
      expect(state.currentValidation).toBeNull();
    });

    test('should open modal in create mode', () => {
      validationStore.openModal();
      const state = get(validationStore);

      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('create');
      expect(state.currentValidation).toBeNull();
    });

    test('should open modal in edit mode with validation', () => {
      const mockValidation = {
        val_id: '123',
        validation_status: 'completed' as const,
        start_datetime: new Date().toISOString(),
      };

      validationStore.openModal(mockValidation, 'edit');
      const state = get(validationStore);

      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('edit');
      expect(state.currentValidation).toEqual(mockValidation);
    });

    test('should close modal', () => {
      validationStore.openModal();
      validationStore.closeModal();
      const state = get(validationStore);

      expect(state.isOpen).toBe(false);
    });

    test('should update mode', () => {
      validationStore.setMode('view');
      const state = get(validationStore);

      expect(state.mode).toBe('view');
    });

    test('should update validation', () => {
      const initial = {
        val_id: '123',
        validation_status: 'pending' as const,
        start_datetime: new Date().toISOString(),
      };

      validationStore.openModal(initial);
      validationStore.updateValidation({ validation_status: 'completed' });

      const state = get(validationStore);
      expect(state.currentValidation?.validation_status).toBe('completed');
    });

    test('should reset to initial state', () => {
      validationStore.openModal();
      validationStore.reset();
      const state = get(validationStore);

      expect(state.isOpen).toBe(false);
      expect(state.mode).toBe('create');
      expect(state.currentValidation).toBeNull();
    });
  });

  describe('validationFormStore', () => {
    test('should start with initial state', () => {
      const state = get(validationFormStore);

      expect(state.validationName).toBe('');
      expect(state.userName).toBe('');
      expect(state.isSubmitting).toBe(false);
      expect(state.validationResults?.stage).toBe('none');
    });

    test('should update individual fields', () => {
      validationFormStore.updateField('validationName', 'Test Validation');
      const state = get(validationFormStore);

      expect(state.validationName).toBe('Test Validation');
    });

    test('should clear errors when updating field', () => {
      validationFormStore.setErrors({ validationName: 'Required' });
      validationFormStore.updateField('validationName', 'Test');

      const state = get(validationFormStore);
      expect(state.errors?.validationName).toBeUndefined();
    });

    test('should update multiple fields at once', () => {
      validationFormStore.updateFields({
        validationName: 'Test',
        userName: 'John Doe',
        datasetName: 'Dataset',
      });

      const state = get(validationFormStore);
      expect(state.validationName).toBe('Test');
      expect(state.userName).toBe('John Doe');
      expect(state.datasetName).toBe('Dataset');
    });

    test('should set and clear folder files', () => {
      const files = {
        metadata: createFile('metadata.json', '{}'),
        data: createFile('data.csv', 'a,b,c'),
      };

      validationFormStore.setFolderFiles(files, 'test-folder');

      let state = get(validationFormStore);
      expect(state.uploadedFolder).toEqual(files);
      expect(state.folderName).toBe('test-folder');

      validationFormStore.clearFolderFiles();
      state = get(validationFormStore);
      expect(state.uploadedFolder).toBeUndefined();
      expect(state.folderName).toBe('');
    });

    test('should set and clear single file', () => {
      const file = createFile('test.csv', 'data');

      validationFormStore.setFile(file);

      let state = get(validationFormStore);
      expect(state.uploadedFile).toBe(file);

      validationFormStore.setFile(null);
      state = get(validationFormStore);
      expect(state.uploadedFile).toBeNull();
    });

    test('should manage validation errors', () => {
      validationFormStore.setErrors({
        validationName: 'Required',
        userName: 'Required',
      });

      let state = get(validationFormStore);
      expect(state.errors?.validationName).toBe('Required');
      expect(state.errors?.userName).toBe('Required');

      validationFormStore.clearError('validationName');
      state = get(validationFormStore);
      expect(state.errors?.validationName).toBeUndefined();
      expect(state.errors?.userName).toBe('Required');
    });

    test('should set submitting state', () => {
      validationFormStore.setSubmitting(true);
      let state = get(validationFormStore);
      expect(state.isSubmitting).toBe(true);

      validationFormStore.setSubmitting(false);
      state = get(validationFormStore);
      expect(state.isSubmitting).toBe(false);
    });

    test('should manage validation results', () => {
      const results = {
        stage: 'complete' as const,
        csvValidation: {
          success: true,
          message: 'CSV valid',
        },
      };

      validationFormStore.setValidationResults(results);
      let state = get(validationFormStore);
      expect(state.validationResults).toEqual(results);

      validationFormStore.clearValidationResults();
      state = get(validationFormStore);
      expect(state.validationResults?.stage).toBe('none');
    });

    test('should validate form data', () => {
      validationFormStore.updateFields({
        validationName: '',
        modelId: '',
      });

      const errors = validationFormStore.validate();

      expect(errors.validationName).toBeDefined();
      expect(errors.modelId).toBeDefined();
      expect(errors.uploadedFile).toBeDefined();
    });

    test('should pass validation with complete data', () => {
      validationFormStore.updateFields({
        validationName: 'Test',
        modelId: 'model-123',
      });
      validationFormStore.setFile(createFile('test.csv', 'data'));

      const errors = validationFormStore.validate();

      expect(Object.keys(errors)).toHaveLength(0);
    });

    test('should load form data', () => {
      const formData = createValidationFormData();
      validationFormStore.loadFormData(formData);

      const state = get(validationFormStore);
      expect(state.validationName).toBe(formData.validationName);
      expect(state.userName).toBe(formData.userName);
      expect(state.datasetName).toBe(formData.datasetName);
    });

    test('should get form data without UI state', () => {
      validationFormStore.updateFields({
        validationName: 'Test',
        userName: 'John',
        isSubmitting: true,
        errors: { test: 'error' },
      } as any);

      const formData = validationFormStore.getFormData();

      expect(formData.validationName).toBe('Test');
      expect(formData.userName).toBe('John');
      expect('isSubmitting' in formData).toBe(false);
      expect('errors' in formData).toBe(false);
    });

    test('should reset to initial state', () => {
      validationFormStore.updateFields({
        validationName: 'Test',
        userName: 'John',
      });

      validationFormStore.reset();
      const state = get(validationFormStore);

      expect(state.validationName).toBe('');
      expect(state.userName).toBe('');
    });
  });
});
