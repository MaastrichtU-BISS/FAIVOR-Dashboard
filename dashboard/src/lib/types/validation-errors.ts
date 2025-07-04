// Validation Error Types and Structures

export enum ValidationErrorCode {
  // Container-related errors
  CONTAINER_START_FAILED = 'CONTAINER_START_FAILED',
  CONTAINER_EXECUTION_ERROR = 'CONTAINER_EXECUTION_ERROR',
  CONTAINER_TIMEOUT = 'CONTAINER_TIMEOUT',
  CONTAINER_IMAGE_NOT_FOUND = 'CONTAINER_IMAGE_NOT_FOUND',
  
  // Data-related errors
  MISSING_REQUIRED_COLUMNS = 'MISSING_REQUIRED_COLUMNS',
  INVALID_CSV_FORMAT = 'INVALID_CSV_FORMAT',
  DATA_TYPE_MISMATCH = 'DATA_TYPE_MISMATCH',
  EMPTY_DATASET = 'EMPTY_DATASET',
  
  // Model-related errors
  MODEL_EXECUTION_FAILED = 'MODEL_EXECUTION_FAILED',
  MODEL_OUTPUT_INVALID = 'MODEL_OUTPUT_INVALID',
  MODEL_METADATA_INVALID = 'MODEL_METADATA_INVALID',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  
  // Service-related errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT = 'SERVICE_TIMEOUT',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  
  // General validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ValidationErrorDetails {
  code: ValidationErrorCode;
  message: string;
  technicalDetails?: string;
  userGuidance?: string;
  metadata?: Record<string, any>;
}

export interface StructuredValidationError {
  timestamp: string;
  errorType: 'container' | 'data' | 'model' | 'service' | 'validation';
  errors: ValidationErrorDetails[];
  context?: {
    modelName?: string;
    fileName?: string;
    validationStep?: string;
    [key: string]: any;
  };
}

export class ValidationError extends Error {
  public code: ValidationErrorCode;
  public details: ValidationErrorDetails;
  public httpStatus: number;

  constructor(details: ValidationErrorDetails, httpStatus: number = 500) {
    super(details.message);
    this.name = 'ValidationError';
    this.code = details.code;
    this.details = details;
    this.httpStatus = httpStatus;
  }

  toJSON(): StructuredValidationError {
    return {
      timestamp: new Date().toISOString(),
      errorType: this.getErrorType(),
      errors: [this.details],
      context: this.details.metadata
    };
  }

  private getErrorType(): 'container' | 'data' | 'model' | 'service' | 'validation' {
    if (this.code.startsWith('CONTAINER_')) return 'container';
    if (this.code.includes('CSV') || this.code.includes('DATA') || this.code.includes('COLUMN')) return 'data';
    if (this.code.startsWith('MODEL_')) return 'model';
    if (this.code.startsWith('SERVICE_') || this.code === ValidationErrorCode.CONNECTION_FAILED) return 'service';
    return 'validation';
  }
}

// Helper function to create common validation errors
export const ValidationErrors = {
  containerStartFailed: (details: string, metadata?: any) => new ValidationError({
    code: ValidationErrorCode.CONTAINER_START_FAILED,
    message: 'Failed to start model container',
    technicalDetails: details,
    userGuidance: 'Check that the model image exists and is properly configured. Contact support if the issue persists.',
    metadata
  }, 503),

  missingColumns: (missingColumns: string[], availableColumns: string[]) => new ValidationError({
    code: ValidationErrorCode.MISSING_REQUIRED_COLUMNS,
    message: `Missing required columns: ${missingColumns.join(', ')}`,
    technicalDetails: `Required columns not found in CSV. Missing: ${missingColumns.join(', ')}. Available: ${availableColumns.join(', ')}`,
    userGuidance: 'Ensure your CSV file contains all required columns with exact matching names (case-sensitive).',
    metadata: { missingColumns, availableColumns }
  }, 400),

  serviceUnavailable: (serviceName: string, details?: string) => new ValidationError({
    code: ValidationErrorCode.SERVICE_UNAVAILABLE,
    message: `${serviceName} service is unavailable`,
    technicalDetails: details || 'Unable to connect to the validation service',
    userGuidance: 'The validation service is temporarily unavailable. Please try again in a few moments.',
    metadata: { serviceName }
  }, 503),

  modelExecutionFailed: (modelName: string, errorOutput: string) => new ValidationError({
    code: ValidationErrorCode.MODEL_EXECUTION_FAILED,
    message: `Model execution failed: ${modelName}`,
    technicalDetails: errorOutput,
    userGuidance: 'The model encountered an error during execution. Check the model logs and ensure the input data format is correct.',
    metadata: { modelName, errorOutput }
  }, 500),

  invalidCSVFormat: (details: string) => new ValidationError({
    code: ValidationErrorCode.INVALID_CSV_FORMAT,
    message: 'Invalid CSV file format',
    technicalDetails: details,
    userGuidance: 'Ensure your file is a valid CSV with proper formatting. Check for missing headers or malformed rows.',
    metadata: { details }
  }, 400)
};