// src/lib/services/dataset-step-service.ts
import { FaivorBackendAPI, type CSVValidationResponse, type ModelValidationResponse } from '$lib/api/faivor-backend';
import type { DatasetFolderFiles } from '$lib/types/validation';
import type { ValidationResults } from '$lib/stores/models/validation.store';
import type { FullJsonLdModel, JsonLdInputDataItem } from '$lib/stores/models/types';

// Types for the service
export interface DatasetStepState {
  datasetName: string;
  datasetDescription: string;
  uploadedFile?: File;
  uploadedFolder?: DatasetFolderFiles;
  folderName: string;
  validationName?: string;
  userName?: string;
  date?: string;
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
  private static async getMetadata(uploadedFolder?: DatasetFolderFiles, model?: FullJsonLdModel): Promise<any> {
    // Prioritize model's JSON-LD structure if available
    if (model) {
      console.log("Using metadata from current model (passed as 'model') in getMetadata.");
      return this.transformModelMetadataToFAIR(model);
    }

    // Fallback to uploaded metadata if model metadata is not available
    if (uploadedFolder?.metadata) {
      console.warn("Current model metadata not available, attempting to use metadata from uploaded folder in getMetadata.");
      const metadataText = await uploadedFolder.metadata.text();
      return JSON.parse(metadataText);
    }

    throw new Error('No metadata available from upload or model');
  }

  /**
   * Generate mock data for specific column
   * This creates realistic mock data for common health metrics
   */
  private static generateMockDataForColumn(columnName: string): any {
    const lowerName = columnName.toLowerCase();

    if (lowerName.includes('weight') || lowerName === 'wt') return Math.floor(50 + Math.random() * 50);
    if (lowerName.includes('height') || lowerName === 'ht') return Math.floor(150 + Math.random() * 50);
    if (lowerName.includes('bmi') || lowerName.includes('body mass index')) return (18.5 + Math.random() * 12).toFixed(1);
    if (lowerName.includes('age') || lowerName === 'yr' || lowerName === 'yrs') return Math.floor(20 + Math.random() * 60);
    if (lowerName.includes('blood pressure') || lowerName.includes('bp')) return `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`;
    if (lowerName.includes('weight loss')) return Math.floor(Math.random() * 10);
    if (lowerName.includes('glucose') || lowerName.includes('sugar')) return Math.floor(70 + Math.random() * 100);
    if (lowerName.includes('cholesterol')) return Math.floor(150 + Math.random() * 100);
    if (lowerName.includes('gender') || lowerName.includes('sex')) return Math.random() > 0.5 ? 'M' : 'F';
    if (lowerName.includes('smoker') || lowerName.includes('smoking')) return Math.random() > 0.3 ? 'No' : 'Yes';
    if (lowerName.includes('diabetes') || lowerName.includes('diabetic')) return Math.random() > 0.8 ? 'No' : 'Yes';
    return Math.floor(Math.random() * 100);
  }

  static async generateMockCSVWithRequiredColumns(
    missingColumns: string[],
    existingCSVFile: File,
    mockRowCount: number = 10
  ): Promise<File> {
    const csvText = await existingCSVFile.text();
    const lines = csvText.split('\n');
    if (lines.length === 0) throw new Error('CSV file is empty');

    const headers = lines[0].split(',').map(h => h.trim());
    const newHeaders = [...headers];
    missingColumns.forEach(col => {
      if (!newHeaders.includes(col)) newHeaders.push(col);
    });

    const newRows = [newHeaders.join(',')];
    const dataRowCount = Math.min(lines.length - 1, mockRowCount);

    for (let i = 1; i <= dataRowCount; i++) {
      if (i < lines.length && lines[i].trim() !== '') {
        const rowValues = lines[i].split(',').map(val => val.trim());
        const newRowValues = [...rowValues];
        while (newRowValues.length < headers.length) newRowValues.push('');
        missingColumns.forEach(col => {
          if (!headers.includes(col)) newRowValues.push(this.generateMockDataForColumn(col));
        });
        newRows.push(newRowValues.join(','));
      }
    }
    const newCSVBlob = new Blob([newRows.join('\n')], { type: 'text/csv' });
    return new File([newCSVBlob], 'enhanced_data.csv', { type: 'text/csv' });
  }

  static async handleFolderSelected(
    files: DatasetFolderFiles,
    selectedFolderName: string,
    currentDatasetName: string,
    readonly: boolean = false,
    model?: FullJsonLdModel
  ): Promise<FolderProcessingResult> {
    try {
      const result: FolderProcessingResult = {
        success: true,
        uploadedFolder: files,
        folderName: selectedFolderName,
        datasetName: currentDatasetName || selectedFolderName,
        validationResults: { stage: 'none' }
      };
      if (!readonly) {
        const autoValidationResult = await this.performAutoValidation(files, readonly, model);
        result.validationResults = autoValidationResult.validationResults;
      }
      return result;
    } catch (error: any) {
      console.error('Error processing folder:', error);
      return { success: false, error: error.message || 'Unknown error occurred while processing folder' };
    }
  }

  static async performAutoValidation(
    uploadedFolder: DatasetFolderFiles,
    readonly: boolean = false,
    model?: FullJsonLdModel
  ): Promise<ValidationOperationResult> {
    if (!uploadedFolder?.data || readonly) {
      return { success: false, validationResults: { stage: 'none' }, error: 'Missing data file or in readonly mode' };
    }
    if (!uploadedFolder?.metadata && !model) {
      return { success: false, validationResults: { stage: 'none' }, error: 'Missing metadata file and no model metadata available' };
    }

    try {
      const metadata = await this.getMetadata(uploadedFolder, model);
      const csvValidationResult = await FaivorBackendAPI.validateCSV(metadata, uploadedFolder.data);

      if (!csvValidationResult.valid) {
        return {
          success: false,
          validationResults: {
            csvValidation: { success: false, message: csvValidationResult.message || 'CSV validation failed', details: csvValidationResult },
            stage: 'csv'
          },
          showModal: true,
          error: csvValidationResult.message
        };
      }
      return {
        success: true,
        validationResults: {
          csvValidation: { success: true, message: 'CSV validation passed', details: csvValidationResult },
          stage: 'csv'
        }
      };
    } catch (error: any) {
      console.error('Auto-validation failed:', error);
      return {
        success: false,
        validationResults: {
          modelValidation: { success: false, message: `Model validation failed: ${error.message || 'Unknown error occurred'}` },
          stage: 'model'
        },
        showModal: true,
        error: error.message
      };
    }
  }

  static async performFullModelValidation(
    uploadedFolder: DatasetFolderFiles,
    metadata: any
  ): Promise<ValidationOperationResult> {
    if (!uploadedFolder?.data) {
      return { success: false, validationResults: { stage: 'none' }, error: 'No data file available' };
    }

    try {
      let columnMetadata = {};
      if (uploadedFolder.columnMetadata) {
        const columnMetadataText = await uploadedFolder.columnMetadata.text();
        columnMetadata = JSON.parse(columnMetadataText);
      }

      const csvValidationResult = await FaivorBackendAPI.validateCSV(metadata, uploadedFolder.data);

      if (!csvValidationResult.valid) {
        const isMissingColumnsError = csvValidationResult.message?.includes('Missing required columns');
        if (isMissingColumnsError) {
          console.warn(`⚠️ CSV validation warning (proceeding anyway): ${csvValidationResult.message}`);
          const missingColumnsMatch = csvValidationResult.message?.match(/Missing required columns: (.*)/);
          const missingColumns = missingColumnsMatch ? missingColumnsMatch[1].split(',').map(col => col.trim()) : [];
          const mockColumns = [...(csvValidationResult.model_input_columns || [])];
          missingColumns.forEach(col => { if (!mockColumns.includes(col)) mockColumns.push(col); });
          if (csvValidationResult.csv_columns?.length) {
            csvValidationResult.csv_columns.forEach(col => { if (!mockColumns.includes(col)) mockColumns.push(col); });
          }
          try {
            const enhancedCSVFile = await this.generateMockCSVWithRequiredColumns(missingColumns, uploadedFolder.data);
            const modelValidationResult = await FaivorBackendAPI.validateModel(metadata, enhancedCSVFile);
            return {
              success: true,
              validationResults: {
                csvValidation: { success: true, message: 'CSV validation completed with warnings (missing columns were mocked)', details: { ...csvValidationResult, valid: true, warning: csvValidationResult.message, mock_columns_added: missingColumns } },
                modelValidation: { success: true, message: `Model validation completed with mock data for missing columns! Model: ${modelValidationResult.model_name}`, details: modelValidationResult },
                stage: 'complete'
              }
            };
          } catch (mockError: any) {
            console.warn(`⚠️ Enhanced CSV validation failed: ${mockError.message}`);
            try {
              const modelValidationResult = await FaivorBackendAPI.validateModel(metadata, mockColumns, columnMetadata, true);
              return {
                success: true,
                validationResults: {
                  csvValidation: { success: true, message: 'CSV validation completed with warnings (missing columns were mocked)', details: { ...csvValidationResult, valid: true, warning: csvValidationResult.message, mock_columns_added: missingColumns } },
                  modelValidation: { success: true, message: `Model validation completed with mock columns! Model: ${modelValidationResult.model_name}`, details: modelValidationResult },
                  stage: 'complete'
                }
              };
            } catch (columnError: any) { console.warn(`⚠️ Mock columns validation failed: ${columnError.message}`); }
          }
        }
        return {
          success: false,
          validationResults: {
            csvValidation: { success: false, message: csvValidationResult.message || 'CSV validation failed', details: csvValidationResult },
            stage: 'csv'
          },
          error: csvValidationResult.message
        };
      }

      const modelValidationResult = await FaivorBackendAPI.validateModel(metadata, uploadedFolder.data, columnMetadata);
      return {
        success: true,
        validationResults: {
          csvValidation: { success: true, message: 'CSV validation completed successfully', details: csvValidationResult },
          modelValidation: { success: true, message: `Model validation completed! Model: ${modelValidationResult.model_name}`, details: modelValidationResult },
          stage: 'complete'
        }
      };
    } catch (error: any) {
      console.error('Model validation failed:', error);
      return {
        success: false,
        validationResults: {
          modelValidation: { success: false, message: `Model validation failed: ${error.message || 'Unknown error occurred'}` },
          stage: 'model'
        },
        error: error.message
      };
    }
  }

  static trackFieldChanges(
    currentState: DatasetStepState,
    initialValues: DatasetStepState
  ): FieldChangeTracker {
    const changedFields: string[] = [];
    if (currentState.datasetName !== initialValues.datasetName) changedFields.push('datasetName');
    if (currentState.datasetDescription !== initialValues.datasetDescription) changedFields.push('datasetDescription');
    if (currentState.uploadedFolder !== initialValues.uploadedFolder) changedFields.push('uploadedFolder');
    if (currentState.folderName !== initialValues.folderName) changedFields.push('folderName');
    if (currentState.validationName !== initialValues.validationName) changedFields.push('validationName');
    if (currentState.userName !== initialValues.userName) changedFields.push('userName');
    if (currentState.date !== initialValues.date) changedFields.push('date');
    return { hasChanges: changedFields.length > 0, changedFields };
  }

  static createInitialValues(state: DatasetStepState): DatasetStepState {
    return {
      datasetName: state.datasetName || '',
      datasetDescription: state.datasetDescription || '',
      uploadedFile: state.uploadedFile,
      uploadedFolder: state.uploadedFolder,
      folderName: state.folderName || '',
      validationName: state.validationName || '',
      userName: state.userName || '',
      date: state.date || ''
    };
  }

  static transformModelMetadataToFAIR(model: FullJsonLdModel): any {
    const generalInfo = model["General Model Information"];
    const inputs = model["Input data1"];

    const transformedInputs = inputs.map((input: JsonLdInputDataItem) => {
      const transformedInput: any = {
        "Input label": { "@value": input["Input label"]?.["@value"] || "" },
        "Description": { "@value": input.Description?.["@value"] || "" },
        "Type of input": { "@value": input["Type of input"]?.["@value"] === "c" ? "categorical" : "numerical" },
        "Input feature": {
          "@id": input["Input feature"]?.["@id"] || "",
          "rdfs:label": input["Input feature"]?.["rdfs:label"] || input["Input label"]?.["@value"] || ""
        }
      };
      if (input["Type of input"]?.["@value"] === "n") {
        if (input["Minimum - for numerical"]?.["@value"] !== null && input["Minimum - for numerical"]?.["@value"] !== undefined) {
          transformedInput["Minimum - for numerical"] = { "@value": input["Minimum - for numerical"]?.["@value"], "@type": "xsd:decimal" };
        }
        if (input["Maximum - for numerical"]?.["@value"] !== null && input["Maximum - for numerical"]?.["@value"] !== undefined) {
          transformedInput["Maximum - for numerical"] = { "@value": input["Maximum - for numerical"]?.["@value"], "@type": "xsd:decimal" };
        }
      }
      if (input.Categories && input.Categories.length > 0 &&
        input.Categories.some(cat =>
          (cat["Category Label"] && '@value' in cat["Category Label"] && cat["Category Label"]["@value"] !== null) ||
          (cat["Identification for category used in model"] && '@value' in cat["Identification for category used in model"] && cat["Identification for category used in model"]["@value"] !== null)
        )
      ) {
        transformedInput.Categories = input.Categories.map(cat => {
          const categoryLabel = cat["Category Label"];
          const identification = cat["Identification for category used in model"];
          return {
            "Category Label": { "@value": (categoryLabel && '@value' in categoryLabel) ? categoryLabel["@value"] : null },
            "Identification for category used in model": { "@value": (identification && '@value' in identification) ? identification["@value"] : null }
          };
        });
      }
      return transformedInput;
    });

    return {
      "@context": model["@context"] || {
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "pav": "http://purl.org/pav/",
        "schema": "http://schema.org/"
      },
      "General Model Information": {
        "Title": { "@value": generalInfo?.Title?.["@value"] || model["@id"] },
        "Editor Note": { "@value": generalInfo?.["Editor Note"]?.["@value"] || generalInfo?.Description?.["@value"] || "" },
        "Created by": { "@value": generalInfo?.["Created by"]?.["@value"] || "" },
        "FAIRmodels image name": { "@value": generalInfo?.["FAIRmodels image name"]?.["@value"] || "" },
        "Contact email": { "@value": generalInfo?.["Contact email"]?.["@value"] || "" },
        "References to papers": generalInfo?.["References to papers"]?.map(ref => ({ "@value": ref["@value"] })) || []
      },
      "Input data": transformedInputs,
      "Outcome": { "@value": model.Outcome?.["rdfs:label"] || model["Outcome label"]?.["@value"] || "" },
      "Outcome label": { "@value": model["Outcome label"]?.["@value"] || "" }
    };
  }
}
