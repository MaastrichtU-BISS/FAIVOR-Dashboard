// src/lib/types/validation.ts
// Consolidated validation types for the new JSONB structure

// New interface for folder-based dataset upload
export interface DatasetFolderFiles {
  metadata?: File;
  data?: File;
  columnMetadata?: File;
}

export interface ValidationData {
  // Basic validation info
  validation_name?: string;

  // Dataset information - updated to support folder uploads
  dataset_info?: {
    userName?: string;
    date?: string;
    datasetName?: string;
    description?: string;
    characteristics?: string;
    uploadedFile?: {
      name: string;
      size?: number;
      type?: string;
    };
    // New folder-based upload support
    folderUpload?: {
      folderName: string;
      fileCount: number;
      totalSize: number;
      hasMetadata: boolean;
      hasData: boolean;
      hasColumnMetadata: boolean;
      indexedDbId?: string; // Reference to IndexedDB storage
      // Detailed file information for display in UI
      fileDetails?: {
        metadata?: {
          name: string;
          size: number;
          lastModified?: number;
        };
        data?: {
          name: string;
          size: number;
          lastModified?: number;
        };
        columnMetadata?: {
          name: string;
          size: number;
          lastModified?: number;
        };
      };
    };
  };

  // Validation results and metrics
  validation_result?: {
    dataProvided?: boolean;
    dataCharacteristics?: boolean;
    metrics?: boolean;
    published?: boolean;

    // External validator results
    fairness_metrics?: Record<string, any>;
    performance_metrics?: Record<string, any>;
    bias_detection?: Record<string, any>;
    explainability?: Record<string, any>;

    // Custom metrics and descriptions
    metrics_description?: string;
    performance_description?: string;
  };

  // Configuration and parameters
  configuration?: {
    validation_parameters?: Record<string, any>;
    thresholds?: Record<string, number>;
    selected_metrics?: string[];
  };

  // External system integration
  external_validation?: {
    job_id?: string;
    webhook_url?: string;
    callback_data?: Record<string, any>;
  };

  // Additional metadata (extensible)
  metadata?: Record<string, any>;
}

// Database row interface
export interface ValidationRow {
  val_id: number;
  model_checkpoint_id: string;
  fair_model_id: string;
  user_id: number | null;
  validation_status: 'pending' | 'running' | 'completed' | 'failed';
  start_datetime: string;
  end_datetime: string | null;
  deleted_at: string | null;
  fairvor_val_lib_version: string | null;
  data: ValidationData;
  created_at: string;
  updated_at: string;
}

// Frontend validation job interface
export interface ValidationJob {
  val_id: string;
  validation_name?: string;
  start_datetime: string;
  end_datetime?: string | null;
  validation_status: 'pending' | 'running' | 'completed' | 'failed';
  validation_result?: ValidationData['validation_result'];
  dataset_info?: ValidationData['dataset_info'];
  configuration?: ValidationData['configuration'];
  metadata?: ValidationData['metadata'];
  modelId?: string;
  userId?: number;
  deleted_at?: string | null;
}

// Form data interface for the modal - updated for folder uploads
export interface ValidationFormData {
  validationName: string;
  userName: string;
  date: string;
  datasetName: string;
  uploadedFile: File | null;
  // New folder upload fields
  uploadedFolder?: DatasetFolderFiles;
  folderName?: string;
  datasetDescription: string;
  datasetCharacteristics: string;
  metricsDescription: string;
  performanceMetrics: string;
  modelId?: string;
}

// API request/response interfaces
export interface CreateValidationRequest {
  modelId: string;
  data: ValidationData;
}

export interface UpdateValidationRequest {
  data: Partial<ValidationData>;
}

export interface ValidationResponse {
  success: boolean;
  validation?: ValidationRow;
  validations?: ValidationRow[];
  error?: string;
}
