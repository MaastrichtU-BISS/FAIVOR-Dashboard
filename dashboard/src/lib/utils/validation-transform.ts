// src/lib/utils/validation-transform.ts
// Utility functions for transforming validation data between formats

import type {
  ValidationData,
  ValidationJob,
  ValidationFormData,
  ValidationRow,
  DatasetFolderFiles
} from '$lib/types/validation';

/**
 * Transform form data to ValidationData structure - updated for folder uploads
 */
export function formDataToValidationData(formData: ValidationFormData): ValidationData {
  return {
    validation_name: formData.validationName || undefined,
    dataset_info: {
      userName: formData.userName || undefined,
      date: formData.date || undefined,
      datasetName: formData.datasetName || formData.folderName || undefined,
      description: formData.datasetDescription || undefined,
      characteristics: formData.datasetCharacteristics || undefined,
      uploadedFile: formData.uploadedFile ? {
        name: formData.uploadedFile.name,
        size: formData.uploadedFile.size,
        type: formData.uploadedFile.type
      } : undefined,
      // Handle folder upload data
      folderUpload: formData.uploadedFolder ? {
        folderName: formData.folderName || 'Unknown Folder',
        fileCount: Object.keys(formData.uploadedFolder).length,
        totalSize: Object.values(formData.uploadedFolder).reduce((total, file) => total + (file?.size || 0), 0),
        hasMetadata: Boolean(formData.uploadedFolder.metadata),
        hasData: Boolean(formData.uploadedFolder.data),
        hasColumnMetadata: Boolean(formData.uploadedFolder.columnMetadata)
      } : undefined
    },
    validation_result: {
      metrics_description: formData.metricsDescription || undefined,
      performance_description: formData.performanceMetrics || undefined,
      dataProvided: Boolean(formData.uploadedFile || formData.uploadedFolder?.data || formData.datasetName),
      dataCharacteristics: Boolean(formData.datasetDescription || formData.datasetCharacteristics),
      metrics: Boolean(formData.metricsDescription)
    }
  };
}

/**
 * Transform ValidationRow to ValidationJob for frontend use
 */
export function validationRowToJob(row: ValidationRow): ValidationJob {
  return {
    val_id: row.val_id.toString(),
    validation_name: row.data.validation_name,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    validation_status: row.validation_status,
    validation_result: row.data.validation_result,
    dataset_info: row.data.dataset_info,
    configuration: row.data.configuration,
    metadata: row.data.metadata,
    modelId: row.model_checkpoint_id,
    userId: row.user_id || undefined,
    deleted_at: row.deleted_at
  };
}

/**
 * Transform ValidationJob to form data for editing - updated for folder uploads
 */
export function validationJobToFormData(job: ValidationJob): ValidationFormData {
  return {
    validationName: job.validation_name || '',
    userName: job.dataset_info?.userName || '',
    date: job.dataset_info?.date || job.start_datetime,
    datasetName: job.dataset_info?.datasetName || '',
    uploadedFile: null, // Files can't be restored from database
    // Handle folder upload data
    folderName: job.dataset_info?.folderUpload?.folderName,
    uploadedFolder: undefined, // Folder files can't be restored from database
    datasetDescription: job.dataset_info?.description || '',
    datasetCharacteristics: job.dataset_info?.characteristics || '',
    metricsDescription: job.validation_result?.metrics_description || '',
    performanceMetrics: job.validation_result?.performance_description || '',
    modelId: job.modelId
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
      ...existing.configuration,
      ...updates.configuration
    },
    metadata: {
      ...existing.metadata,
      ...updates.metadata
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
    configuration: {},
    metadata: {}
  };
}

/**
 * Legacy transformation - convert old database structure to new format
 * This helps with migration of existing data
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
