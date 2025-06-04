// src/lib/services/dataset-step-service.ts
import { FaivorBackendAPI, type CSVValidationResponse, type ModelValidationResponse } from '$lib/api/faivor-backend';
import type { DatasetFolderFiles } from '$lib/types/validation';
import type { ValidationResults } from '$lib/stores/validation-form.store';

// Types for the service
export interface DatasetStepState {
  validationName: string;
  userName: string;
  date: string;
  datasetName: string;
  uploadedFolder?: DatasetFolderFiles;
  folderName: string;
}

export interface FieldChangeTracker {
  hasChanges: boolean;
  changedFields: string[];
}

export interface FolderProcessingResult {
  success: boolean;
  uploadedFolder?: DatasetFolderFiles;
  folderName?: string;
  datasetName?: string;
  validationResults?: ValidationResults;
  error?: string;
}

export interface ValidationOperationResult {
  success: boolean;
  validationResults: ValidationResults;
  showModal?: boolean;
  error?: string;
}

export class DatasetStepService {
  /**
   * Process folder selection and perform auto-validation
   */
  static async handleFolderSelected(
    files: DatasetFolderFiles,
    selectedFolderName: string,
    currentDatasetName: string,
    readonly: boolean = false
  ): Promise<FolderProcessingResult> {
    try {
      const result: FolderProcessingResult = {
        success: true,
        uploadedFolder: files,
        folderName: selectedFolderName,
        datasetName: currentDatasetName || selectedFolderName,
        validationResults: { stage: 'none' }
      };

      console.log('Folder selected:', selectedFolderName);
      console.log('Files:', {
        metadata: files.metadata?.name,
        data: files.data?.name,
        columnMetadata: files.columnMetadata?.name
      });

      // Automatically validate the dataset after files are uploaded (if not readonly)
      if (!readonly) {
        const autoValidationResult = await this.performAutoValidation(files, readonly);
        result.validationResults = autoValidationResult.validationResults;
      }

      return result;
    } catch (error: any) {
      console.error('Error processing folder:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while processing folder'
      };
    }
  }

  /**
   * Perform automatic validation after folder upload
   */
  static async performAutoValidation(
    uploadedFolder: DatasetFolderFiles,
    readonly: boolean = false
  ): Promise<ValidationOperationResult> {
    if (!uploadedFolder?.data || !uploadedFolder?.metadata || readonly) {
      return {
        success: false,
        validationResults: { stage: 'none' },
        error: 'Missing required files or in readonly mode'
      };
    }

    try {
      // Read metadata fresh
      const metadataText = await uploadedFolder.metadata.text();
      const metadata = JSON.parse(metadataText);

      console.log('Auto validation - Fresh metadata keys:', Object.keys(metadata));
      console.log(
        'Auto validation - Has General Model Information:',
        'General Model Information' in metadata
      );

      // Step 1: CSV Validation
      const csvValidationResult = await FaivorBackendAPI.validateCSV(metadata, uploadedFolder.data);

      if (!csvValidationResult.valid) {
        return {
          success: false,
          validationResults: {
            csvValidation: {
              success: false,
              message: csvValidationResult.message || 'CSV validation failed',
              details: csvValidationResult
            },
            stage: 'csv'
          },
          showModal: true,
          error: csvValidationResult.message
        };
      }

      // Step 2: Model Validation (only if CSV validation passes)
      const modelValidationResult = await this.performFullModelValidation(uploadedFolder, metadata);

      // Combine both validation results
      return {
        success: true,
        validationResults: {
          csvValidation: {
            success: true,
            message: 'CSV validation passed',
            details: csvValidationResult
          },
          ...modelValidationResult.validationResults
        }
      };
    } catch (error: any) {
      console.error('Auto-validation failed:', error);
      return {
        success: false,
        validationResults: {
          modelValidation: {
            success: false,
            message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
          },
          stage: 'model'
        },
        showModal: true,
        error: error.message
      };
    }
  }

  /**
   * Perform full model validation
   */
  static async performFullModelValidation(
    uploadedFolder: DatasetFolderFiles,
    metadata: any
  ): Promise<ValidationOperationResult> {
    if (!uploadedFolder?.data) {
      return {
        success: false,
        validationResults: { stage: 'none' },
        error: 'No data file available'
      };
    }

    try {
      // Read column metadata fresh if available
      let columnMetadata = {};
      if (uploadedFolder.columnMetadata) {
        const columnMetadataText = await uploadedFolder.columnMetadata.text();
        columnMetadata = JSON.parse(columnMetadataText);
      }

      console.log('Full model validation - Using metadata with keys:', Object.keys(metadata));
      console.log(
        'Full model validation - Using column metadata:',
        uploadedFolder.columnMetadata ? 'Available' : 'Not available'
      );

      // Call the full model validation API
      const modelValidationResult = await FaivorBackendAPI.validateModel(
        metadata,
        uploadedFolder.data,
        columnMetadata
      );

      return {
        success: true,
        validationResults: {
          modelValidation: {
            success: true,
            message: `Model validation completed! Model: ${modelValidationResult.model_name}`,
            details: modelValidationResult
          },
          stage: 'complete'
        }
      };
    } catch (error: any) {
      console.error('Full model validation failed:', error);
      return {
        success: false,
        validationResults: {
          modelValidation: {
            success: false,
            message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
          },
          stage: 'model'
        },
        error: error.message
      };
    }
  }

  /**
   * Check dataset manually (triggered by user button click)
   */
  static async checkDataset(
    uploadedFolder?: DatasetFolderFiles
  ): Promise<ValidationOperationResult> {
    if (!uploadedFolder?.data || !uploadedFolder?.metadata) {
      return {
        success: false,
        validationResults: {
          modelValidation: {
            success: false,
            message: 'Please upload both data file (CSV) and metadata file before checking the dataset.'
          },
          stage: 'model'
        },
        error: 'Missing required files'
      };
    }

    try {
      // Read metadata fresh
      const metadataText = await uploadedFolder.metadata.text();
      const metadata = JSON.parse(metadataText);

      console.log('Manual validation - Fresh metadata keys:', Object.keys(metadata));
      console.log(
        'Manual validation - Has General Model Information:',
        'General Model Information' in metadata
      );

      // Step 1: CSV Validation
      const csvValidationResult = await FaivorBackendAPI.validateCSV(metadata, uploadedFolder.data);

      if (!csvValidationResult.valid) {
        return {
          success: false,
          validationResults: {
            csvValidation: {
              success: false,
              message: csvValidationResult.message || 'CSV validation failed',
              details: csvValidationResult
            },
            stage: 'csv'
          },
          error: csvValidationResult.message
        };
      }

      // Step 2: Model Validation (only if CSV validation passes)
      const modelValidationResult = await this.performFullModelValidation(uploadedFolder, metadata);

      // Combine both validation results
      return {
        success: modelValidationResult.success,
        validationResults: {
          csvValidation: {
            success: true,
            message: 'CSV validation passed',
            details: csvValidationResult
          },
          ...modelValidationResult.validationResults
        }
      };
    } catch (error: any) {
      console.error('Dataset check failed:', error);
      return {
        success: false,
        validationResults: {
          modelValidation: {
            success: false,
            message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
          },
          stage: 'model'
        },
        error: error.message
      };
    }
  }

  /**
   * Handle folder removal
   */
  static handleFolderRemoved(): { uploadedFolder: undefined; folderName: string; validationResults: ValidationResults } {
    return {
      uploadedFolder: undefined,
      folderName: '',
      validationResults: { stage: 'none' }
    };
  }

  /**
   * Calculate summary (placeholder for future implementation)
   */
  static calculateSummary(): void {
    // TODO: Implement summary calculation
    console.log('Calculating summary...');
  }

  /**
   * Track field changes between current and initial values
   */
  static trackFieldChanges(
    currentState: DatasetStepState,
    initialValues: DatasetStepState
  ): FieldChangeTracker {
    const changedFields: string[] = [];

    if (currentState.validationName !== initialValues.validationName) {
      changedFields.push('validationName');
    }
    if (currentState.userName !== initialValues.userName) {
      changedFields.push('userName');
    }
    if (currentState.date !== initialValues.date) {
      changedFields.push('date');
    }
    if (currentState.datasetName !== initialValues.datasetName) {
      changedFields.push('datasetName');
    }
    if (currentState.uploadedFolder !== initialValues.uploadedFolder) {
      changedFields.push('uploadedFolder');
    }
    if (currentState.folderName !== initialValues.folderName) {
      changedFields.push('folderName');
    }

    return {
      hasChanges: changedFields.length > 0,
      changedFields
    };
  }

  /**
   * Create initial values snapshot for change tracking
   */
  static createInitialValues(state: DatasetStepState): DatasetStepState {
    return {
      validationName: state.validationName || '',
      userName: state.userName || '',
      date: state.date || '',
      datasetName: state.datasetName || '',
      uploadedFolder: state.uploadedFolder,
      folderName: state.folderName || ''
    };
  }
}
