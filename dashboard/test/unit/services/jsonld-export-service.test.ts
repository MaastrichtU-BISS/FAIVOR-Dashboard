import { describe, expect, test } from 'bun:test';
import { JsonLdExportService } from '../../../src/lib/services/jsonld-export-service';
import type { JsonLdExportOptions } from '../../../src/lib/types/jsonld-export';
import type { UiValidationJob } from '../../../src/lib/stores/models/types';

function createValidationJob(overrides: Partial<UiValidationJob> = {}): UiValidationJob {
  return {
    val_id: 'val-123',
    validation_name: 'Validation 123',
    start_datetime: '2026-05-19T10:00:00.000Z',
    validation_status: 'completed',
    dataProvided: true,
    dataCharacteristics: true,
    metrics: true,
    originalEvaluationData: {
      '@id': 'eval-1',
      'user/hospital': { '@value': 'Hospital A' },
      'Performance metric': [
        {
          'Metric Label': { 'rdfs:label': 'accuracy' },
          'Measured metric (mean value)': { '@value': '0.91' }
        }
      ],
      'Dataset characteristics': [
        {
          Volume: { '@value': '1000' },
          'The number of subject for evaluation': { '@value': '200' }
        }
      ],
      data: {
        validation_error: {
          message: 'Validation failed',
          technicalDetails: 'stack trace'
        },
        dataset_info: {
          folderUpload: {
            folderName: 'dataset-folder'
          },
          datasetAnalysis: {
            totalRows: 200,
            totalColumns: 8,
            columns: [],
            completeness: 99,
            fileName: 'dataset.csv',
            fileSize: 500
          }
        }
      }
    }
  };
}

describe('jsonld-export-service', () => {
  test('redacts sensitive fields when options request redaction', () => {
    const job = createValidationJob();
    const options: JsonLdExportOptions = {
      section: 'combined',
      redaction: {
        redactIdentity: true,
        redactDatasetFiles: true,
        redactTechnicalDetails: true
      }
    };

    const result = JsonLdExportService.buildValidationExport({ validationJob: job }, options);

    const validationRun = result.document.validationRun as Record<string, unknown>;
    expect(validationRun.userName).toBeNull();

    const validationResult = result.document.validationResult as Record<string, unknown>;
    const failure = validationResult.failure as Record<string, unknown>;
    expect(failure?.technicalDetails).toBeUndefined();

    const dataCharacteristics = result.document.dataCharacteristics as Record<string, unknown>;
    const analysis = dataCharacteristics.analysis as Record<string, unknown>;
    expect(analysis.fileName).toBeUndefined();
    expect(analysis.fileSize).toBeUndefined();
  });

  test('keeps identity when identity redaction is disabled', () => {
    const job = createValidationJob();

    const result = JsonLdExportService.buildValidationExport(
      { validationJob: job },
      {
        section: 'validationResults',
        redaction: {
          redactIdentity: false,
          redactDatasetFiles: true,
          redactTechnicalDetails: true
        }
      }
    );

    const validationRun = result.document.validationRun as Record<string, unknown>;
    expect(validationRun.userName).toBe('Hospital A');
  });

  test('adds warning when completed validation has no metrics', () => {
    const job = createValidationJob({
      metrics: false,
      originalEvaluationData: {
        '@id': 'eval-1',
        'Performance metric': []
      }
    });

    const result = JsonLdExportService.buildValidationExport(
      { validationJob: job },
      {
        section: 'validationResults',
        redaction: {
          redactIdentity: true,
          redactDatasetFiles: true,
          redactTechnicalDetails: true
        }
      }
    );

    const hasWarning = result.warnings.some((warning) => warning.code === 'MISSING_VALIDATION_METRICS');
    expect(hasWarning).toBeTrue();
  });

  test('builds dataset-analysis-only export and redacts file metadata by default', () => {
    const result = JsonLdExportService.buildDatasetAnalysisExport({
      totalRows: 100,
      totalColumns: 5,
      columns: [],
      completeness: 97,
      fileName: 'local.csv',
      fileSize: 1024
    });

    const dataCharacteristics = result.document.dataCharacteristics as Record<string, unknown>;
    const analysis = dataCharacteristics.analysis as Record<string, unknown>;

    expect(analysis.fileName).toBeUndefined();
    expect(analysis.fileSize).toBeUndefined();
    expect(result.fileName.endsWith('.jsonld')).toBeTrue();
  });

  test('includes semantic graph metadata for interoperability', () => {
    const job = createValidationJob();
    const result = JsonLdExportService.buildValidationExport(
      { validationJob: job },
      {
        section: 'combined',
        redaction: {
          redactIdentity: true,
          redactDatasetFiles: true,
          redactTechnicalDetails: true
        }
      }
    );

    expect(Array.isArray(result.document['@graph'])).toBeTrue();

    const types = result.document['@type'] as string[];
    expect(types.includes('schema:CreativeWork')).toBeTrue();
    expect(result.document.conformsTo).toBe('https://schema.org');
  });
});
