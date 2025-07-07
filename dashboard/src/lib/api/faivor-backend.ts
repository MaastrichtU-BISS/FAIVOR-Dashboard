// src/lib/api/faivor-backend.ts - FAIVOR Backend API client
import { ValidationError, ValidationErrors, ValidationErrorCode } from '$lib/types/validation-errors';

export interface CSVValidationResponse {
  valid: boolean;
  message?: string;
  csv_columns: string[];
  model_input_columns: string[];
  warning?: string;
  mock_columns_added?: string[];
}

export interface ModelValidationResponse {
  model_name: string;
  metrics: Record<string, number>;
}

export interface ComprehensiveMetricsResponse {
  model_info: {
    name: string;
    type: string;
  };
  overall: Record<string, any>;
  threshold_metrics?: {
    probability_preprocessing: string;
    roc_curve: {
      fpr: number[];
      tpr: number[];
      thresholds: number[];
      auc: number;
    };
    pr_curve: {
      precision: number[];
      recall: number[];
      thresholds: number[];
      average_precision: number;
    };
    threshold_metrics: Record<string, any>;
  };
  subgroups?: Record<string, any>;
}

export interface HealthCheckResponse {
  message: string;
}

export class FaivorBackendAPI {
  // Direct connection to FAIVOR backend with CORS enabled
  private static readonly BASE_URL = "http://localhost:8000";

  /**
   * Parse error response from FAIVOR backend
   */
  private static async parseErrorResponse(response: Response): Promise<ValidationError> {
    let errorText = '';
    let errorJson: any = null;
    
    try {
      errorText = await response.text();
      errorJson = JSON.parse(errorText);
    } catch {
      // If not JSON, use the text as-is
    }

    // Check for specific error patterns
    if (errorJson?.detail) {
      // FastAPI HTTPException format
      const message = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      
      // Detect error type based on message content
      if (message.includes('Missing required columns')) {
        const missingColumnsMatch = message.match(/Missing required columns: (.*)/);
        const missingColumns = missingColumnsMatch ? 
          missingColumnsMatch[1].split(',').map((col: string) => col.trim()) : [];
        return ValidationErrors.missingColumns(missingColumns, []);
      }
      
      if (message.includes('container') || message.includes('Docker')) {
        return ValidationErrors.containerStartFailed(message);
      }
      
      if (message.includes('CSV') || message.includes('format')) {
        return ValidationErrors.invalidCSVFormat(message);
      }
    }

    // Handle connection errors
    if (response.status === 0 || !response.ok && response.status >= 500) {
      return ValidationErrors.serviceUnavailable('FAIVOR ML Validator', errorText || response.statusText);
    }

    // Log the full error for debugging
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      errorJson,
      errorText
    });

    // Default error
    return new ValidationError({
      code: ValidationErrorCode.VALIDATION_FAILED,
      message: errorJson?.message || errorJson?.detail || errorText || response.statusText,
      technicalDetails: errorText,
      metadata: { status: response.status, statusText: response.statusText, errorJson }
    }, response.status);
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/`);

      if (!response.ok) {
        throw await this.parseErrorResponse(response);
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ValidationErrors.serviceUnavailable('FAIVOR ML Validator', error?.message || error?.toString() || 'Unknown error');
    }
  }

  /**
   * Validate CSV file against model metadata
   */
  static async validateCSV(
    modelMetadata: any,
    csvFile: File
  ): Promise<CSVValidationResponse> {
    const formData = new FormData();
    formData.append("model_metadata", JSON.stringify(modelMetadata));
    formData.append("csv_file", csvFile);

    try {
      const response = await fetch(`${this.BASE_URL}/validate-csv/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw await this.parseErrorResponse(response);
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ValidationErrors.serviceUnavailable('FAIVOR ML Validator', error?.message || 'CSV validation failed');
    }
  }

  /**
   * Perform full model validation with metrics calculation
   */
  static async validateModel(
    modelMetadata: any,
    csvFile: File,
    dataMetadata: Record<string, any> | null = null
  ): Promise<ModelValidationResponse> {
    const formData = new FormData();
    formData.append("model_metadata", JSON.stringify(modelMetadata));
    formData.append("csv_file", csvFile);
    if (dataMetadata !== null) {
      formData.append("column_metadata", JSON.stringify(dataMetadata));
    }

    try {
      const response = await fetch(`${this.BASE_URL}/validate-model`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw await this.parseErrorResponse(response);
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Check for specific error patterns in the error message
      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('model') && errorMessage.includes('execution')) {
        throw ValidationErrors.modelExecutionFailed(modelMetadata.name || 'Unknown Model', errorMessage);
      }
      throw ValidationErrors.serviceUnavailable('FAIVOR ML Validator', errorMessage || 'Model validation failed');
    }
  }

  /**
   * Validate folder-based model data
   * Uses the existing validate-csv and validate-model endpoints but with folder structure
   */
  static async validateFolderData(
    metadataFile: File,
    dataFile: File,
    columnMetadataFile?: File
  ): Promise<{
    csvValidation: CSVValidationResponse;
    modelValidation: ModelValidationResponse;
  }> {
    try {
      // First parse the metadata file
      const metadataText = await metadataFile.text();
      const parsedMetadata = JSON.parse(metadataText);

      // Parse column metadata if provided
      let parsedColumnMetadata: any = {};
      if (columnMetadataFile) {
        const columnMetadataText = await columnMetadataFile.text();
        parsedColumnMetadata = JSON.parse(columnMetadataText);
      }

      // Step 1: Validate CSV format
      const csvValidation = await this.validateCSV(parsedMetadata, dataFile);

      // If CSV validation failed, throw the error - no mock data
      if (!csvValidation.valid) {
        throw new ValidationError({
          code: ValidationErrorCode.INVALID_CSV_FORMAT,
          message: csvValidation.message || 'CSV validation failed',
          userGuidance: 'Please check your CSV file format and ensure all required columns are present.',
          metadata: { csvValidation }
        }, 400);
      }

      // Step 2: Perform full model validation
      const modelValidation = await this.validateModel(
        parsedMetadata,
        dataFile,
        parsedColumnMetadata
      );

      return {
        csvValidation,
        modelValidation
      };
    } catch (error: any) {
      // Re-throw ValidationError instances as-is
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw new ValidationError({
          code: ValidationErrorCode.MODEL_METADATA_INVALID,
          message: 'Invalid metadata file format',
          technicalDetails: error.message,
          userGuidance: 'Ensure metadata.json and column_metadata.json are valid JSON files.',
          metadata: { parseError: error.message }
        }, 400);
      }
      
      // Default to service error
      throw ValidationErrors.serviceUnavailable('FAIVOR ML Validator', error?.message || 'Validation failed');
    }
  }

  /**
   * Calculate comprehensive metrics for a model using existing validate-model endpoint
   */
  static async calculateMetrics(
    modelMetadata: any,
    csvFile: File,
    columnMetadata: Record<string, any> | null = null
  ): Promise<ComprehensiveMetricsResponse> {
    // Use the existing validate-model endpoint to get basic metrics
    const basicMetrics = await this.validateModel(modelMetadata, csvFile, columnMetadata);

    // Convert basic metrics to comprehensive format
    return this.convertToComprehensiveFormat(basicMetrics, modelMetadata);
  }

  /**
   * Calculate comprehensive metrics when we only have column information
   */
  static async calculateMetricsWithColumns(
    modelMetadata: any,
    columns: string[],
    columnMetadata: Record<string, any> = {}
  ): Promise<ComprehensiveMetricsResponse> {
    // Create a minimal CSV with just headers (no data rows)
    const csvContent = columns.join(',') + '\n';
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvFile = new File([csvBlob], 'columns_only.csv', { type: 'text/csv' });

    return await this.calculateMetrics(modelMetadata, csvFile, columnMetadata);
  }

  /**
   * Retrieve available metrics definitions for a model
   * This calls the /retrieve-metrics endpoint which returns available metric definitions
   */
  static async retrieveMetricDefinitions(
    modelMetadata: any,
    csvFile: File,
    columnMetadata: Record<string, any> | null = null
  ): Promise<Array<{name: string, description: string, type: string}>> {
    const formData = new FormData();
    formData.append("model_metadata", JSON.stringify(modelMetadata));
    formData.append("csv_file", csvFile);
    if (columnMetadata !== null) {
      formData.append("column_metadata", JSON.stringify(columnMetadata));
    }

    try {
      const response = await fetch(`${this.BASE_URL}/retrieve-metrics`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw await this.parseErrorResponse(response);
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ValidationErrors.serviceUnavailable('FAIVOR ML Validator', error?.message || 'Failed to retrieve metrics');
    }
  }

  /**
   * Keep the old method for backward compatibility but use the new one internally
   */
  static async receiveMetrics(
    modelMetadata: any,
    csvFile: File,
    columnMetadata: Record<string, any> | null = null
  ): Promise<ComprehensiveMetricsResponse> {
    // This method is kept for compatibility but now returns empty metrics
    // The actual metric definitions are retrieved via retrieveMetricDefinitions
    return {
      model_info: {
        name: modelMetadata.name || 'Unknown Model',
        type: modelMetadata.model_type || 'classification'
      },
      overall: {},
      threshold_metrics: undefined,
      subgroups: undefined
    };
  }

  /**
   * Convert basic metrics response to comprehensive format
   * This only uses data that comes from the backend, no mock data generation
   */
  static convertToComprehensiveFormat(
    basicMetrics: ModelValidationResponse,
    modelMetadata: any
  ): ComprehensiveMetricsResponse {
    const modelType = modelMetadata.model_type || 'classification';

    // Only use metrics that actually come from the backend
    const overall: Record<string, any> = {};

    // Map backend metrics to comprehensive format
    Object.entries(basicMetrics.metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        overall[`performance.${key}`] = Number(value.toFixed(3));
      } else {
        overall[key] = value;
      }
    });

    return {
      model_info: {
        name: basicMetrics.model_name,
        type: modelType
      },
      overall
    };
  }
}
