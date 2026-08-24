// test/helpers/test-factories.ts
// Factory functions for creating test data

import type { ValidationData, ValidationRow, ValidationFormData, DatasetFolderFiles } from '../../src/lib/types/validation';
import type { Model, ModelMetadata } from '../../src/lib/stores/models/types';

// Counter for unique IDs
let idCounter = 1;

// Create a mock File object
export function createFile(name: string, content: string = 'mock content', type: string = 'text/plain'): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

// Create mock CSV file
export function createCsvFile(name: string = 'data.csv', rows: number = 10): File {
  const headers = 'id,name,age,category\n';
  const data = Array.from({ length: rows }, (_, i) =>
    `${i + 1},User${i + 1},${20 + i},Category${(i % 3) + 1}`
  ).join('\n');
  return createFile(name, headers + data, 'text/csv');
}

// Create mock metadata JSON file
export function createMetadataFile(overrides: any = {}): File {
  const metadata = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Test Dataset',
    description: 'A test dataset for validation',
    ...overrides
  };
  return createFile('metadata.json', JSON.stringify(metadata, null, 2), 'application/json');
}

// Create mock folder files
export function createFolderFiles(options: Partial<DatasetFolderFiles> = {}): DatasetFolderFiles {
  return {
    metadata: options.metadata || createMetadataFile(),
    data: options.data || createCsvFile(),
    columnMetadata: options.columnMetadata,
  };
}

// Create mock validation form data
export function createValidationFormData(overrides: Partial<ValidationFormData> = {}): ValidationFormData {
  return {
    validationName: `Test Validation ${idCounter++}`,
    userName: 'Test User',
    date: new Date().toISOString(),
    datasetName: 'Test Dataset',
    uploadedFile: null,
    folderName: 'test-folder',
    uploadedFolder: overrides.uploadedFolder !== undefined ? overrides.uploadedFolder : createFolderFiles(),
    datasetDescription: 'A test dataset for validation',
    datasetCharacteristics: 'Test characteristics',
    metricsDescription: 'Test metrics',
    performanceMetrics: 'Accuracy: 0.95; Precision: 0.93',
    modelId: 'test-model-123',
    ...overrides,
  };
}

// Create mock validation data
export function createValidationData(overrides: Partial<ValidationData> = {}): ValidationData {
  return {
    validation_name: `Test Validation ${idCounter++}`,
    dataset_info: {
      userName: 'Test User',
      date: new Date().toISOString(),
      datasetName: 'Test Dataset',
      description: 'Test description',
      characteristics: 'Test characteristics',
      folderUpload: {
        folderName: 'test-folder',
        fileCount: 2,
        totalSize: 1024,
        hasMetadata: true,
        hasData: true,
        hasColumnMetadata: false,
      },
      ...overrides.dataset_info,
    },
    validation_result: {
      dataProvided: true,
      dataCharacteristics: true,
      metrics: true,
      published: false,
      ...overrides.validation_result,
    },
    ...overrides,
  };
}

// Create mock validation row (database)
export function createValidationRow(overrides: Partial<ValidationRow> = {}): ValidationRow {
  const id = idCounter++;
  return {
    val_id: id,
    model_checkpoint_id: `model-${id}`,
    fair_model_id: `fair-model-${id}`,
    user_id: 1,
    validation_status: 'completed',
    start_datetime: new Date().toISOString(),
    end_datetime: new Date().toISOString(),
    deleted_at: null,
    fairvor_val_lib_version: '1.0.0',
    data: createValidationData(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Create mock model metadata
export function createModelMetadata(overrides: Partial<ModelMetadata> = {}): ModelMetadata {
  return {
    '@id': `test-model-${idCounter++}`,
    title: 'Test Model',
    description: 'A test machine learning model',
    fairSpecific: {
      inputs: [
        { name: 'feature1', type: 'number' },
        { name: 'feature2', type: 'number' },
      ],
      outputs: [
        { name: 'prediction', type: 'number' },
      ],
    },
    ...overrides,
  } as ModelMetadata;
}

// Create mock model
export function createModel(overrides: Partial<Model> = {}): Model {
  const id = `model-${idCounter++}`;
  return {
    checkpoint_id: id,
    fair_model_id: `fair-${id}`,
    fair_model_url: `https://example.com/models/${id}`,
    title: 'Test Model',
    metadata: createModelMetadata(),
    description: 'Test model description',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Create mock dataset analysis
export function createDatasetAnalysis(overrides: any = {}) {
  return {
    totalRows: 100,
    totalColumns: 4,
    columns: [
      {
        name: 'id',
        type: 'numerical' as const,
        count: 100,
        uniqueValues: 100,
        nullValues: 0,
        min: 1,
        max: 100,
        mean: 50.5,
        median: 50.5,
      },
      {
        name: 'category',
        type: 'categorical' as const,
        count: 100,
        uniqueValues: 3,
        nullValues: 0,
        values: ['Category1', 'Category2', 'Category3'],
        mostCommon: { value: 'Category1', count: 34 },
      },
    ],
    completeness: 1.0,
    fileName: 'data.csv',
    fileSize: 2048,
    ...overrides,
  };
}

// Reset ID counter
export function resetCounters() {
  idCounter = 1;
}

// Export all factories as an object for convenience
export const factories = {
  createFile,
  createCsvFile,
  createMetadataFile,
  createFolderFiles,
  createValidationFormData,
  createValidationData,
  createValidationRow,
  createModelMetadata,
  createModel,
  createDatasetAnalysis,
  resetCounters,
};
