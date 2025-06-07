// src/lib/services/dataset-step-service.ts
import { FaivorBackendAPI, type CSVValidationResponse, type ModelValidationResponse } from '$lib/api/faivor-backend';
import type { DatasetFolderFiles } from '$lib/types/validation';
import type { ValidationResults } from '$lib/stores/models/validation.store';
import type { Model } from '$lib/stores/models/types';

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
   * Get metadata from uploaded file or model fallback
   */
  private static async getMetadata(uploadedFolder?: DatasetFolderFiles, model?: Model): Promise<any> {
    // Try uploaded metadata first
    if (uploadedFolder?.metadata) {
      const metadataText = await uploadedFolder.metadata.text();
      return JSON.parse(metadataText);
    }

    // Fallback to model's database metadata
    if (model?.metadata?.fairSpecific) {
      // Transform model metadata to FAIR format
      return this.transformModelMetadataToFAIR(model);
    }

    throw new Error('No metadata available from upload or model');
  }

  /**
   * Transform model database metadata to FAIR format
   */
  private static transformModelMetadataToFAIR(model: Model): any {
    const fairSpecific = model.metadata.fairSpecific;
    if (!fairSpecific) {
      throw new Error('Model does not have FAIR-specific metadata');
    }

    // Create a basic FAIR metadata structure from model data
    return {
      "@context": {
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "pav": "http://purl.org/pav/",
        "schema": "http://schema.org/"
      },
      "General Model Information": {
        "Title": { "@value": model.metadata.title || model.fair_model_id },
        "Editor Note": { "@value": model.description || "" },
        "Created by": { "@value": fairSpecific.createdBy || "" },
        "FAIRmodels image name": { "@value": fairSpecific.dockerImage || "" },
        "Contact email": { "@value": fairSpecific.contactEmail || "" },
        "References to papers": []
      },
      "Input data": fairSpecific.inputs?.map((input, index) => ({
        "Input label": { "@value": input },
        "Description": { "@value": `Input feature ${index + 1}` },
        "Type of input": { "@value": "numerical" }, // Default to numerical
        "Input feature": {
          "@id": `http://example.org/features/${input}`,
          "rdfs:label": input
        }
      })) || [],
      "Outcome": { "@value": fairSpecific.outcome || "" },
      "Outcome label": { "@value": fairSpecific.outcome || "" }
    };
  }
  /**
   * Process folder selection and perform auto-validation
   */
  static async handleFolderSelected(
    files: DatasetFolderFiles,
    selectedFolderName: string,
    currentDatasetName: string,
    readonly: boolean = false,
    model?: Model
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
        const autoValidationResult = await this.performAutoValidation(files, readonly, model);
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
    readonly: boolean = false,
    model?: Model
  ): Promise<ValidationOperationResult> {
    if (!uploadedFolder?.data || readonly) {
      return {
        success: false,
        validationResults: { stage: 'none' },
        error: 'Missing data file or in readonly mode'
      };
    }

    // Check if we have metadata from upload or model
    if (!uploadedFolder?.metadata && !model?.metadata?.fairSpecific) {
      return {
        success: false,
        validationResults: { stage: 'none' },
        error: 'Missing metadata file and no model metadata available'
      };
    }

    try {
      // Get metadata from upload or model fallback
      const metadata = await this.getMetadata(uploadedFolder, model);

      console.log('Auto validation - Using metadata keys:', Object.keys(metadata));
      console.log(
        'Auto validation - Has General Model Information:',
        'General Model Information' in metadata
      );

      // Step 1: CSV Validation only (model validation happens at final submission)
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

      // Return only CSV validation results - model validation will happen at final submission
      return {
        success: true,
        validationResults: {
          csvValidation: {
            success: true,
            message: 'CSV validation passed',
            details: csvValidationResult
          },
          stage: 'csv'
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
    uploadedFolder?: DatasetFolderFiles,
    model?: Model
  ): Promise<ValidationOperationResult> {
    if (!uploadedFolder?.data) {
      return {
        success: false,
        validationResults: {
          modelValidation: {
            success: false,
            message: 'Please upload a data file (CSV) before checking the dataset.'
          },
          stage: 'model'
        },
        error: 'Missing data file'
      };
    }

    // Check if we have metadata from upload or model
    if (!uploadedFolder?.metadata && !model?.metadata?.fairSpecific) {
      return {
        success: false,
        validationResults: {
          modelValidation: {
            success: false,
            message: 'Please upload a metadata file or ensure the model has metadata before checking the dataset.'
          },
          stage: 'model'
        },
        error: 'Missing metadata'
      };
    }

    try {
      // Get metadata from upload or model fallback
      const metadata = await this.getMetadata(uploadedFolder, model);

      console.log('Manual validation - Using metadata keys:', Object.keys(metadata));
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
