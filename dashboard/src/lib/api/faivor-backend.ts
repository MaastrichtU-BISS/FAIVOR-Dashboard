// src/lib/api/faivor-backend.ts - FAIVOR Backend API client
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
   * Health check endpoint
   */
  static async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/`);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to connect to FAIVOR backend: ${error?.message || error?.toString() || 'Unknown error'}`);
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

    const response = await fetch(`${this.BASE_URL}/validate-csv/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CSV validation failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Perform full model validation with metrics calculation
   */
  static async validateModel(
    modelMetadata: any,
    csvFile: File,
    dataMetadata: Record<string, any> = {}
  ): Promise<ModelValidationResponse> {
    const formData = new FormData();
    formData.append("model_metadata", JSON.stringify(modelMetadata));
    formData.append("csv_file", csvFile);
    formData.append("data_metadata", JSON.stringify(dataMetadata));

    const response = await fetch(`${this.BASE_URL}/validate-model`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Model validation failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
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

    // Handle missing columns case
    if (!csvValidation.valid && csvValidation.message?.includes('Missing required columns')) {
      // Extract the missing column names from the error message
      const missingColumnsMatch = csvValidation.message.match(/Missing required columns: (.*)/);
      const missingColumns = missingColumnsMatch ?
        missingColumnsMatch[1].split(',').map(col => col.trim()) :
        [];

      return {
        csvValidation: {
          ...csvValidation,
          warning: csvValidation.message,
          mock_columns_added: missingColumns
        },
        modelValidation: {
          model_name: parsedMetadata.model_name || parsedMetadata.name || 'Unknown Model',
          metrics: {
            validation_status: 0.0, // Indicate validation could not complete
            missing_columns: missingColumns.length
          }
        }
      };
    }

    // Standard validation path for valid CSV
    if (!csvValidation.valid) {
      throw new Error(`CSV validation failed: ${csvValidation.message}`);
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
  }

  /**
   * Calculate comprehensive metrics for a model using existing validate-model endpoint
   * This method calls the backend and handles any Docker execution errors gracefully
   */
  static async calculateMetrics(
    modelMetadata: any,
    csvFile: File,
    columnMetadata: Record<string, any> = {}
  ): Promise<ComprehensiveMetricsResponse> {
    try {
      // Use the existing validate-model endpoint to get basic metrics
      const basicMetrics = await this.validateModel(modelMetadata, csvFile, columnMetadata);

      // Convert basic metrics to comprehensive format
      return this.convertToComprehensiveFormat(basicMetrics, modelMetadata);
    } catch (error: any) {
      // Re-throw the error to be handled by the UI
      throw new Error(`Metrics calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate comprehensive metrics when we only have column information
   * This will attempt to call the backend but handle failures gracefully
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

    try {
      return await this.calculateMetrics(modelMetadata, csvFile, columnMetadata);
    } catch (error: any) {
      // Re-throw the error to be handled by the UI
      throw new Error(`Metrics calculation with columns failed: ${error.message}`);
    }
  }

  /**
   * Convert basic metrics response to comprehensive format
   * This only uses data that comes from the backend, no mock data generation
   */
  private static convertToComprehensiveFormat(
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
