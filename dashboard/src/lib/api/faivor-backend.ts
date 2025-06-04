// src/lib/api/faivor-backend.ts - FAIVOR Backend API client
export interface CSVValidationResponse {
  valid: boolean;
  message?: string;
  csv_columns: string[];
  model_input_columns: string[];
}

export interface ModelValidationResponse {
  model_name: string;
  metrics: Record<string, number>;
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
}
