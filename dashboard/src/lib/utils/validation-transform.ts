// src/lib/utils/validation-transform.ts
// Utility functions for transforming validation data between formats

import type {
  ValidationData,
  ValidationJob,
  ValidationFormData,
  ValidationRow,
  DatasetFolderFiles
} from '$lib/types/validation';
import { getFileSizesFromStore, validationFormStore, type ValidationResults } from '$lib/stores/models/validation.store';

/**
 * Transform form data to ValidationData structure - simplified using store
 */
export function formDataToValidationData(formData: ValidationFormData): ValidationData {
  // Get file sizes directly from the store to avoid serialization issues
  const fileSizes = getFileSizesFromStore();

  // Get validation results from the store
  let validationResults: ValidationResults | undefined;
  const unsubscribe = validationFormStore.subscribe(state => {
    validationResults = state.validationResults;
  });
  unsubscribe();

  console.log('🔍 formDataToValidationData called with store-based sizes:', {
    hasUploadedFolder: Boolean(formData.uploadedFolder),
    folderName: formData.folderName,
    fileSizes,
    validationResults,
    metadataFile: formData.uploadedFolder?.metadata ? {
      name: formData.uploadedFolder.metadata.name,
      size: fileSizes.metadataSize,
      type: formData.uploadedFolder.metadata.type,
      lastModified: formData.uploadedFolder.metadata.lastModified
    } : null,
    dataFile: formData.uploadedFolder?.data ? {
      name: formData.uploadedFolder.data.name,
      size: fileSizes.dataSize,
      type: formData.uploadedFolder.data.type,
      lastModified: formData.uploadedFolder.data.lastModified
    } : null,
    columnMetadataFile: formData.uploadedFolder?.columnMetadata ? {
      name: formData.uploadedFolder.columnMetadata.name,
      size: fileSizes.columnMetadataSize,
      type: formData.uploadedFolder.columnMetadata.type,
      lastModified: formData.uploadedFolder.columnMetadata.lastModified
    } : null
  });

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
        size: formData.uploadedFile.size || 0, // Direct access since files are in store
        type: formData.uploadedFile.type
      } : undefined,
      // Handle folder upload data using store-based sizes
      folderUpload: formData.uploadedFolder ? {
        folderName: formData.folderName || 'Unknown Folder',
        fileCount: Object.keys(formData.uploadedFolder).length,
        totalSize: fileSizes.totalSize,
        hasMetadata: Boolean(formData.uploadedFolder.metadata),
        hasData: Boolean(formData.uploadedFolder.data),
        hasColumnMetadata: Boolean(formData.uploadedFolder.columnMetadata),
        // Save detailed file information for UI display with store-based sizes
        fileDetails: {
          metadata: formData.uploadedFolder.metadata ? {
            name: formData.uploadedFolder.metadata.name || 'metadata.json',
            size: fileSizes.metadataSize, // Use store-based size
            lastModified: formData.uploadedFolder.metadata.lastModified || Date.now()
          } : undefined,
          data: formData.uploadedFolder.data ? {
            name: formData.uploadedFolder.data.name || 'data.csv',
            size: fileSizes.dataSize, // Use store-based size
            lastModified: formData.uploadedFolder.data.lastModified || Date.now()
          } : undefined,
          columnMetadata: formData.uploadedFolder.columnMetadata ? {
            name: formData.uploadedFolder.columnMetadata.name || 'column_metadata.json',
            size: fileSizes.columnMetadataSize, // Use store-based size
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
      metrics: Boolean(formData.metricsDescription),
      // Include validation results from the store
      validation_results: validationResults && validationResults.stage !== 'none' ? validationResults : undefined
    }
  };


  return validationData;
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
  // Reconstruct folder files from saved fileDetails if available
  let reconstructedFolderFiles: DatasetFolderFiles | undefined = undefined;

  if (job.dataset_info?.folderUpload?.fileDetails) {
    const fileDetails = job.dataset_info.folderUpload.fileDetails;
    reconstructedFolderFiles = {};

    // Reconstruct metadata file info if it was saved
    if (fileDetails.metadata) {
      reconstructedFolderFiles.metadata = new File([], fileDetails.metadata.name, {
        lastModified: fileDetails.metadata.lastModified
      });
      // Store the original size since File constructor doesn't preserve it
      Object.defineProperty(reconstructedFolderFiles.metadata, 'size', {
        value: fileDetails.metadata.size,
        writable: false
      });
    }

    // Reconstruct data file info if it was saved
    if (fileDetails.data) {
      reconstructedFolderFiles.data = new File([], fileDetails.data.name, {
        lastModified: fileDetails.data.lastModified
      });
      Object.defineProperty(reconstructedFolderFiles.data, 'size', {
        value: fileDetails.data.size,
        writable: false
      });
    }

    // Reconstruct column metadata file info if it was saved
    if (fileDetails.columnMetadata) {
      reconstructedFolderFiles.columnMetadata = new File([], fileDetails.columnMetadata.name, {
        lastModified: fileDetails.columnMetadata.lastModified
      });
      Object.defineProperty(reconstructedFolderFiles.columnMetadata, 'size', {
        value: fileDetails.columnMetadata.size,
        writable: false
      });
    }
  }

  // Load validation results into the store if they exist
  if (job.validation_result?.validation_results) {
    validationFormStore.setValidationResults(job.validation_result.validation_results);
  } else if (job.validation_status === 'completed' && job.validation_result) {
    // If validation is completed but validation_results is missing,
    // try to reconstruct basic validation results for table visibility
    const reconstructedResults: ValidationResults = {
      stage: 'complete'
    };

    // Check if we have CSV validation data stored elsewhere
    if (job.validation_result.fairness_metrics || job.validation_result.performance_metrics) {
      // If we have metrics, assume both CSV and model validation were successful
      reconstructedResults.csvValidation = {
        success: true,
        message: 'CSV validation completed successfully',
        details: {
          valid: true,
          csv_columns: [],
          model_input_columns: [],
          message: 'Validation completed successfully'
        }
      };

      reconstructedResults.modelValidation = {
        success: true,
        message: 'Model validation completed successfully',
        details: {
          model_name: job.validation_name || 'Validated Model',
          metrics: {
            ...job.validation_result.fairness_metrics,
            ...job.validation_result.performance_metrics
          }
        }
      };
    }

    validationFormStore.setValidationResults(reconstructedResults);
  }

  return {
    validationName: job.validation_name || '',
    userName: job.dataset_info?.userName || '',
    date: job.dataset_info?.date || job.start_datetime,
    datasetName: job.dataset_info?.datasetName || '',
    uploadedFile: null, // Files can't be restored from database
    // Handle folder upload data - reconstruct from saved fileDetails
    folderName: job.dataset_info?.folderUpload?.folderName,
    uploadedFolder: reconstructedFolderFiles,
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
