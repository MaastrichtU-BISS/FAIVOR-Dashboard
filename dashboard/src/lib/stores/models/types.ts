// Database row types
export interface DBModelRow {
  checkpoint_id: string;
  fair_model_id: string;
  fair_model_url: string;
  metadata: ModelMetadata;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DBModelWithValidationRow extends DBModelRow {
  validation_count: string;
  latest_validation_date: string | null;
  latest_validation_status: 'pending' | 'running' | 'completed' | 'failed' | null;
}

export interface ValidationRow {
  val_id: number;
  validation_status: 'pending' | 'running' | 'completed' | 'failed';
  start_datetime: string;
  end_datetime: string | null;
  description: string | null;
  validation_dataset: string | null;
  validation_result: any;
  user_id: number | null;
  model_checkpoint_id: string;
  fair_model_id: string;
  fairvor_val_lib_version?: string;
  created_at: string;
  updated_at: string;
}

export interface ModelMetadata {
  title?: string; // Title from FAIR model
  applicabilityCriteria: string[];
  primaryIntendedUse: string;
  users: {
    intendedUsers: string[];
    requiredExpertise: string;
  };
  reference: {
    paper: string;
    codeRepository: string;
    documentation: string;
  };
  datasetRequirements: {
    format: string;
    minimumSamples: string | number;
    annotations?: string;
    preprocessing?: string;
  };
  metricsAndValidation: {
    metrics: Record<string, number>;
    validationDataset: string;
    crossValidation: string;
  };
  // FAIR-specific fields from external model metadata
  fairSpecific?: {
    outcome: string;
    inputs: string[];
    algorithm: string;
    outOfScopeUseCases: string[];
    humanLifeImpact: string[];
    mitigations: string[];
    risksAndHarms: string[];
    dockerImage: string;
    softwareLicense: string;
    createdBy: string;
    creationDate: string;
    contactEmail: string;
    lastUpdated: string;
    basedOn: string;
  };
}

export interface ValidationDetails {
  val_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_date: string;
  end_date: string | null;
  description: string | null;
  dataset: string | null;
  result: any;
  user_id: number | null;
  deleted_at?: string | null;
}

export interface Model {
  checkpoint_id: string;
  fair_model_id: string;
  fair_model_url: string;
  title?: string; // Title from FAIR model metadata
  metadata: ModelMetadata;
  description: string;
  created_at: string;
  updated_at: string;
  validations?: {
    count: number;
    latest?: {
      status: 'pending' | 'running' | 'completed' | 'failed';
      date: string;
    };
    all?: import('$lib/types/validation').ValidationJob[];
  };
}

// NEW TYPES FOR JSON-LD v3 STRUCTURE

export interface JsonLdValue<T = string> {
  '@value': T | null;
  '@type'?: string; // e.g., "xsd:decimal", "xsd:date"
}

export interface JsonLdIdRef {
  '@id': string;
  'rdfs:label'?: string;
}

export interface JsonLdLangString {
  '@value': string | null;
  '@language'?: string;
}

export interface JsonLdContext {
  rdfs?: string;
  xsd?: string;
  pav?: string;
  schema?: string;
  oslc?: string;
  skos?: string;
  [key: string]: string | { '@type': string } | undefined; // Allow for other context definitions
}

export interface JsonLdGeneralModelInformation {
  '@context'?: JsonLdContext; // Context specific to this block
  Title?: JsonLdValue;
  Description?: JsonLdValue;
  'Editor Note'?: JsonLdValue;
  'Created by'?: JsonLdValue;
  'Creation date'?: JsonLdValue<string>; // Assuming date is string, type specifies xsd:date
  'Contact email'?: JsonLdValue;
  'References to papers'?: JsonLdValue[];
  'References to code'?: JsonLdValue[];
  'Software License'?: JsonLdIdRef;
  'FAIRmodels image name'?: JsonLdValue;
  'Docker image details (exposed port)'?: JsonLdValue;
}

export interface JsonLdInputDataCategory {
  '@context'?: JsonLdContext;
  'Category Label'?: JsonLdValue | {}; // Can be empty object
  'Identification for category used in model'?: JsonLdValue;
}

export interface JsonLdInputDataItem {
  '@context'?: JsonLdContext;
  'Input feature'?: JsonLdIdRef;
  Description?: JsonLdValue;
  'Input label'?: JsonLdValue;
  'Type of input'?: JsonLdValue<'n' | 'c' | string>; // n for numerical, c for categorical
  'Minimum - for numerical'?: JsonLdValue<string>; // Stored as string, typed as xsd:decimal
  'Maximum - for numerical'?: JsonLdValue<string>; // Stored as string, typed as xsd:decimal
  Categories?: JsonLdInputDataCategory[];
}

export interface JsonLdPerformanceMetricItem {
  '@context'?: JsonLdContext;
  'Metric Label'?: JsonLdIdRef | {}; // Can be empty object
  'Measured metric (mean value)'?: JsonLdValue<string | null>;
  'Measured metric (lower bound of the 95% confidence interval)'?: JsonLdValue<string | null>;
  'Measured metric (upper bound of the 95% confidence interval)'?: JsonLdValue<string | null>;
  'Acceptance level'?: JsonLdValue<string | null>;
  'Additional information (if needed)'?: JsonLdValue<string | null>;
}

export interface JsonLdPreviousModelTestItem {
  '@context'?: JsonLdContext;
  'Performance metric'?: JsonLdPerformanceMetricItem[];
  'Link to dataset'?: JsonLdValue;
  'Link to reference paper'?: JsonLdValue;
  Notes?: JsonLdValue;
}

export interface JsonLdDatasetCharacteristicCategoryDistribution {
  '@context'?: JsonLdContext;
  'Category Label'?: JsonLdValue | {};
  'Distribution for category'?: JsonLdValue;
}
export interface JsonLdDatasetCharacteristicItem {
  '@context'?: JsonLdContext;
  'Input feature'?: JsonLdIdRef | {};
  Volume?: JsonLdValue;
  'Number of missing values'?: JsonLdValue<string | null>;
  'The characteristics of dataset'?: JsonLdValue | {}; // Can be empty object
  'The number of subject for evaluation'?: JsonLdValue<string | null>;
  'The mean value - for numerical feature'?: JsonLdValue<string | null>;
  'The lower bound of the 95% confidence interval'?: JsonLdValue<string | null>;
  'The upper bound of the  95% confidence interval'?: JsonLdValue<string | null>;
  'Categories distribution'?: JsonLdDatasetCharacteristicCategoryDistribution[];
}

export interface JsonLdEvaluationResultItem {
  '@context'?: JsonLdContext;
  'sha256 of docker image'?: JsonLdValue;
  'user/hospital'?: JsonLdValue;
  'Performance metric'?: JsonLdPerformanceMetricItem[];
  'User Note'?: JsonLdValue;
  'Dataset characteristics'?: JsonLdDatasetCharacteristicItem[];
  // We might need an @id here if it exists in the actual data for unique identification
  '@id'?: string; // Assuming an @id might exist for each evaluation
  'pav:createdOn'?: string; // Assuming a creation date might exist
  // Add other fields that might be used for validation_name, status, etc.
  // For example, a custom field for validation_name or deriving it.
  // Status might need to be inferred or stored elsewhere if not in this structure.
}

export interface JsonLdModel {
  '@context': JsonLdContext;
  'General Model Information': JsonLdGeneralModelInformation;
  'Input data1': JsonLdInputDataItem[];
  Outcome: JsonLdIdRef;
  'Outcome label': JsonLdValue;
  'Outcome type': JsonLdValue<'P' | string>; // P for prediction?
  'Applicability criteria': JsonLdValue[];
  'Foundational model or algorithm used': JsonLdIdRef;
  'Primary intended use(s)': JsonLdValue[];
  'Primary intended users': JsonLdValue[];
  'Out-of-scope use cases': JsonLdValue[];
  Data: JsonLdValue[];
  'Human life': JsonLdValue[];
  Mitigations: JsonLdValue[];
  'Risks and harms': JsonLdValue[];
  'Use cases': JsonLdValue | null;
  'Additional concerns': JsonLdValue | null;
  'Previous model tests1': JsonLdPreviousModelTestItem[];
  'Evaluation results1': JsonLdEvaluationResultItem[];
  'pav:lastUpdatedOn': string; // ISO DateTime string
  '@id': string; // URL of the model instance
  'schema:isBasedOn': string; // URL of the template
  'pav:createdOn': string; // ISO DateTime string

  // These fields were in the initial (mistaken) V3 example,
  // and might be added by the application's backend after fetching from fairmodels.org
  // or might be part of a wrapper object. For now, making them optional.
  checkpoint_id?: string;
  fair_model_id?: string; // This seems to be the UUID part of the @id URL
  // The 'description' field from the first example is now likely
  // 'General Model Information'.Description['@value']
  // 'validations' from the first example is now 'Evaluation results1'
  created_at?: string; // This might map to pav:createdOn
  updated_at?: string; // This might map to pav:lastUpdatedOn
}

// This will be the type used for the `modelData` in +page.svelte
export type FullJsonLdModel = JsonLdModel;

// This type might be used to represent the transformed/flattened validation job for the UI
// It's similar to the local ValidationJob interface in +page.svelte
export interface UiValidationJob {
  val_id: string; // Derived from JsonLdEvaluationResultItem @id or an index
  validation_name?: string; // Derived or from a custom field
  start_datetime: string; // Derived from pav:createdOn of the evaluation item
  validation_status: 'pending' | 'running' | 'completed' | 'failed' | 'unknown'; // Inferred
  dataProvided?: boolean; // Inferred from Dataset characteristics
  dataCharacteristics?: boolean; // Inferred from Dataset characteristics
  metrics?: boolean; // Inferred from Performance metric
  published?: boolean; // This might be a separate status or flag not directly in JSON-LD
  userName?: string; // From 'user/hospital' or related field
  datasetDescription?: string; // Could be from 'User Note' or derived
  metricsDescription?: string; // Derived
  performanceMetrics?: string; // Derived/Formatted from 'Performance metric'
  originalEvaluationData: JsonLdEvaluationResultItem; // Keep original for details
  deleted_at?: string | null; // Application-specific field for soft deletes
  // Model metadata snapshot captured at validation time
  model_metadata?: import('$lib/types/validation').ModelMetadataSnapshot;
  // Add dataset_info to store folder upload details
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
    folderUpload?: {
      folderName: string;
      fileCount: number;
      totalSize: number;
      hasMetadata: boolean;
      hasData: boolean;
      hasColumnMetadata: boolean;
      indexedDbId?: string;
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
}
