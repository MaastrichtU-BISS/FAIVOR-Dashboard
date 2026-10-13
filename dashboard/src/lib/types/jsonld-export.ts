import type { DatasetAnalysis } from '$lib/services/csv-analysis-service';
import type { FullJsonLdModel, UiValidationJob } from '$lib/stores/models/types';

export type JsonLdExportSection = 'validationResults' | 'dataCharacteristics' | 'combined';

export interface JsonLdRedactionOptions {
  redactIdentity: boolean;
  redactDatasetFiles: boolean;
  redactTechnicalDetails: boolean;
}

export interface JsonLdExportOptions {
  section: JsonLdExportSection;
  redaction: JsonLdRedactionOptions;
}

export interface JsonLdValidationExportInput {
  validationJob: UiValidationJob;
  model?: FullJsonLdModel;
  metricsData?: Record<string, unknown> | null;
  datasetAnalysis?: DatasetAnalysis | null;
}

export interface JsonLdValidationWarning {
  code: string;
  message: string;
}

export interface JsonLdValidationExportBuildResult {
  document: Record<string, unknown>;
  warnings: JsonLdValidationWarning[];
  fileName: string;
}
