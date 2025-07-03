// src/lib/utils/validation-transform.ts
// Utility functions for transforming validation data between formats

import type {
  ValidationData,
  // ValidationJob, // Old type, replaced by UiValidationJob for new transformations
  ValidationFormData,
  ValidationRow,
  DatasetFolderFiles
} from '$lib/types/validation';
import type { UiValidationJob, JsonLdPerformanceMetricItem } from '$lib/stores/models/types'; // Import new types
import { getFileSizesFromStore, validationFormStore, type ValidationResults } from '$lib/stores/models/validation.store';

/**
 * Transform form data to ValidationData structure - simplified using store
 */
export function formDataToValidationData(formData: ValidationFormData, comprehensiveMetrics?: any): ValidationData {
  const fileSizes = getFileSizesFromStore();
  let validationResults: ValidationResults | undefined;
  const unsubscribe = validationFormStore.subscribe(state => {
    validationResults = state.validationResults;
  });
  unsubscribe();

  // console.log('🔍 formDataToValidationData called with store-based sizes:', { /* ... logging data ... */ });

  const validationData: ValidationData = {
    validation_name: formData.validationName || undefined,
    dataset_info: {
      userName: formData.userName || undefined,
      date: formData.date || undefined,
      datasetName: formData.datasetName || formData.folderName || undefined,
      description: formData.datasetDescription || undefined,
      characteristics: formData.datasetCharacteristics || undefined,
      uploadedFile: formData.uploadedFile ? {
        name: formData.uploadedFile.name,
        size: formData.uploadedFile.size || 0,
        type: formData.uploadedFile.type
      } : undefined,
      folderUpload: formData.uploadedFolder ? {
        folderName: formData.folderName || 'Unknown Folder',
        fileCount: Object.keys(formData.uploadedFolder).length,
        totalSize: fileSizes.totalSize,
        hasMetadata: Boolean(formData.uploadedFolder.metadata),
        hasData: Boolean(formData.uploadedFolder.data),
        hasColumnMetadata: Boolean(formData.uploadedFolder.columnMetadata),
        fileDetails: {
          metadata: formData.uploadedFolder.metadata ? {
            name: formData.uploadedFolder.metadata.name || 'metadata.json',
            size: fileSizes.metadataSize,
            lastModified: formData.uploadedFolder.metadata.lastModified || Date.now()
          } : undefined,
          data: formData.uploadedFolder.data ? {
            name: formData.uploadedFolder.data.name || 'data.csv',
            size: fileSizes.dataSize,
            lastModified: formData.uploadedFolder.data.lastModified || Date.now()
          } : undefined,
          columnMetadata: formData.uploadedFolder.columnMetadata ? {
            name: formData.uploadedFolder.columnMetadata.name || 'column_metadata.json',
            size: fileSizes.columnMetadataSize,
            lastModified: formData.uploadedFolder.columnMetadata.lastModified || Date.now()
          } : undefined
        }
      } : undefined
    },
    validation_result: {
      metrics_description: formData.metricsDescription || undefined,
      performance_description: formData.performanceMetrics || undefined,
      dataProvided: Boolean(formData.uploadedFile || formData.uploadedFolder?.data || formData.datasetName),
      dataCharacteristics: Boolean(formData.datasetDescription || formData.datasetCharacteristics),
      metrics: Boolean(formData.metricsDescription || comprehensiveMetrics),
      validation_results: validationResults && validationResults.stage !== 'none' ? validationResults : undefined,
      comprehensive_metrics: comprehensiveMetrics || undefined
    }
  };
  return validationData;
}

/**
 * Transform ValidationRow to a generic object.
 * The original ValidationJob type might be deprecated.
 */
export function validationRowToJob(row: ValidationRow): any {
  console.warn("validationRowToJob: Review usage with new JSON-LD model structure. 'row.data' access might be incorrect.");
  // Assuming row.data was a JSONB field containing the old structure.
  // This needs careful review based on actual DB schema for ValidationRow.
  // If 'data' is not a direct property, this will fail.
  const data = (row as any).data || {};
  return {
    val_id: row.val_id.toString(),
    validation_name: data.validation_name,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    validation_status: row.validation_status,
    validation_result: data.validation_result,
    dataset_info: data.dataset_info,
    configuration: data.configuration,
    metadata: data.metadata,
    modelId: row.model_checkpoint_id,
    userId: row.user_id || undefined,
    deleted_at: (row as any).deleted_at
  };
}

/**
 * Transform UiValidationJob (derived from JSON-LD) to form data for editing.
 */
export function validationJobToFormData(job: UiValidationJob): ValidationFormData {
  const evalData = job.originalEvaluationData;

  let reconstructedFolderFiles: Partial<DatasetFolderFiles> | undefined = undefined;
  let folderName: string | undefined = undefined;
  // Access dataset_info directly from the job object
  const folderUploadInfo = job.dataset_info?.folderUpload;

  if (folderUploadInfo) {
    folderName = folderUploadInfo.folderName;
    reconstructedFolderFiles = {}; // Initialize as an empty object

    // Helper to create a mock File-like object for display purposes
    const createFileLikeObject = (detail: { name?: string; size?: number; lastModified?: number } | undefined, defaultName: string) => {
      if (!detail) return undefined;
      return {
        name: detail.name || defaultName,
        size: detail.size || 0,
        lastModified: detail.lastModified || Date.now(),
        // Add other properties if FolderUpload.svelte or other components expect them,
        // but keep it minimal for display.
      } as File; // Cast to File for structural compatibility with FolderUpload's props
    };

    if (folderUploadInfo.hasMetadata && folderUploadInfo.fileDetails?.metadata) {
      reconstructedFolderFiles.metadata = createFileLikeObject(folderUploadInfo.fileDetails.metadata, 'metadata.json');
    }
    if (folderUploadInfo.hasData && folderUploadInfo.fileDetails?.data) {
      reconstructedFolderFiles.data = createFileLikeObject(folderUploadInfo.fileDetails.data, 'data.csv');
    }
    if (folderUploadInfo.hasColumnMetadata && folderUploadInfo.fileDetails?.columnMetadata) {
      reconstructedFolderFiles.columnMetadata = createFileLikeObject(folderUploadInfo.fileDetails.columnMetadata, 'column_metadata.json');
    }
  }

  const validationName = job.validation_name || `Evaluation ${job.val_id.slice(-6)}`;
  const userName = evalData?.['user/hospital']?.['@value'] || '';
  const date = evalData?.['pav:createdOn'] || job.start_datetime;

  const datasetName = evalData?.['User Note']?.['@value']?.split(':')[0].trim() || '';

  const datasetDescription = evalData?.['User Note']?.['@value'] || '';
  const datasetCharacteristics = '';
  const metricsDescription = '';

  let performanceMetricsSummary = '';
  if (evalData?.['Performance metric'] && evalData['Performance metric'].length > 0) {
    performanceMetricsSummary = evalData['Performance metric']
      .map((m: JsonLdPerformanceMetricItem) => {
        const metricLabelObj = m['Metric Label'];
        const label = (metricLabelObj && 'rdfs:label' in metricLabelObj && typeof metricLabelObj['rdfs:label'] === 'string') ? metricLabelObj['rdfs:label'] :
          (metricLabelObj && '@id' in metricLabelObj && typeof metricLabelObj['@id'] === 'string') ? metricLabelObj['@id'] :
            'Metric';
        const value = m['Measured metric (mean value)']?.['@value'];
        return `${label}: ${value !== null && value !== undefined ? parseFloat(value).toFixed(3) : 'N/A'}`;
      })
      .join('; ');
  }

  const reconstructedResults: ValidationResults = {
    stage: job.validation_status === 'completed' ? 'complete' : job.validation_status === 'pending' ? 'none' : 'model',
    csvValidation: {
      success: job.dataProvided || false,
      message: job.dataProvided ? 'Dataset provided (details from evaluation)' : 'Dataset details not fully available',
    },
    modelValidation: {
      success: job.metrics || false,
      message: job.metrics ? 'Metrics available' : 'Metrics not fully available',
    }
  };
  if (job.validation_status !== 'unknown') {
    validationFormStore.setValidationResults(reconstructedResults);
  }

  return {
    validationName: validationName,
    userName: userName,
    date: date,
    datasetName: datasetName,
    uploadedFile: null, // Keep as null, as we are restoring folder info, not a single file
    folderName: folderName, // This will now have the restored folder name
    uploadedFolder: reconstructedFolderFiles as DatasetFolderFiles | undefined, // This will have the reconstructed file details
    datasetDescription: datasetDescription,
    datasetCharacteristics: datasetCharacteristics,
    metricsDescription: metricsDescription,
    performanceMetrics: performanceMetricsSummary,
    modelId: '', // This should be set from the page context (e.g., modelData['@id'] or checkpoint_id)
  };
}

/**
 * Merge partial ValidationData updates
 */
export function mergeValidationData(
  existing: ValidationData,
  updates: Partial<ValidationData>
): ValidationData {
  return {
    ...existing,
    ...updates,
    dataset_info: {
      ...existing.dataset_info,
      ...updates.dataset_info
    },
    validation_result: {
      ...existing.validation_result,
      ...updates.validation_result
    },
    configuration: {
      ...(existing as any).configuration, // Cast to any if configuration is not on ValidationData
      ...(updates as any).configuration
    },
    metadata: {
      ...(existing as any).metadata, // Cast to any if metadata is not on ValidationData
      ...(updates as any).metadata
    }
  };
}

/**
 * Create default ValidationData structure
 */
export function createDefaultValidationData(): ValidationData {
  return {
    dataset_info: {},
    validation_result: {
      dataProvided: false,
      dataCharacteristics: false,
      metrics: false,
      published: false
    },
    // configuration: {}, // Ensure these are part of ValidationData if used
    // metadata: {}
  };
}

/**
 * Legacy transformation - convert old database structure to new format
 */
export function legacyToValidationData(legacy: {
  validation_name?: string;
  description?: string;
  validation_dataset?: string;
  validation_result?: any;
  dataset_info?: any;
}): ValidationData {
  return {
    validation_name: legacy.validation_name,
    dataset_info: {
      description: legacy.description,
      datasetName: legacy.validation_dataset,
      ...legacy.dataset_info
    },
    validation_result: {
      dataProvided: Boolean(legacy.validation_dataset),
      dataCharacteristics: Boolean(legacy.description),
      ...legacy.validation_result
    }
  };
}
