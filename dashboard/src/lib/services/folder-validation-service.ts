// src/lib/services/folder-validation-service.ts
import { FaivorBackendAPI } from '$lib/api/faivor-backend';
import type { ValidationFormData } from '$lib/types/validation';
import { ValidationError, ValidationErrors } from '$lib/types/validation-errors';

export interface FolderValidationResult {
  csvValidation: {
    valid: boolean;
    message?: string;
    csv_columns: string[];
    model_input_columns: string[];
    warning?: string;
    mock_columns_added?: string[];
  };
  modelValidation: {
    model_name: string;
    metrics: Record<string, number>;
  };
  transformedResults: {
    csv_validation: any;
    model_validation: any;
    fairness_metrics: Record<string, number>;
    performance_metrics: Record<string, number>;
    bias_detection: Record<string, any>;
    explainability: Record<string, any>;
  };
}

export class FolderValidationService {
  /**
   * Validate folder structure and files
   */
  static validateFolderStructure(
    metadataFile: File | null,
    dataFile: File | null,
    columnMetadataFile?: File | null,
    modelMetadata?: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // metadata.json is required unless model has metadata
    if (!metadataFile && !modelMetadata) {
      errors.push('metadata.json file is required (or model must have metadata configured)');
    } else if (metadataFile && !metadataFile.name.endsWith('.json')) {
      errors.push('Metadata file must be a JSON file');
    }

    if (!dataFile) {
      errors.push('CSV file is required');
    } else if (!dataFile.name.endsWith('.csv')) {
      errors.push('Data file must be a CSV file');
    }

    if (columnMetadataFile && !columnMetadataFile.name.endsWith('.json')) {
      errors.push('Column metadata file must be a JSON file');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse and validate metadata files
   */
  static async parseMetadataFiles(
    metadataFile: File | null,
    columnMetadataFile?: File,
    modelMetadata?: any
  ): Promise<{
    parsedMetadata: any;
    parsedColumnMetadata?: any;
    errors: string[]
  }> {
    const errors: string[] = [];
    let parsedMetadata: any = null;
    let parsedColumnMetadata: any = null;

    // Parse metadata from file or use model metadata
    if (metadataFile) {
      try {
        const metadataText = await metadataFile.text();
        parsedMetadata = JSON.parse(metadataText);
      } catch (error: any) {
        errors.push(`Invalid metadata.json format: ${error?.message || 'Parse error'}`);
      }
    } else if (modelMetadata) {
      // Use model metadata as fallback
      parsedMetadata = modelMetadata;
    } else {
      errors.push('No metadata available from file or model');
    }

    if (columnMetadataFile) {
      try {
        const columnMetadataText = await columnMetadataFile.text();
        parsedColumnMetadata = JSON.parse(columnMetadataText);
      } catch (error: any) {
        errors.push(`Invalid column_metadata.json format: ${error?.message || 'Parse error'}`);
      }
    }

    return {
      parsedMetadata,
      parsedColumnMetadata,
      errors
    };
  }

  /**
   * Perform FAIVOR backend validation
   */
  static async performValidation(
    metadataFile: File | null,
    dataFile: File,
    columnMetadataFile?: File,
    modelMetadata?: any
  ): Promise<FolderValidationResult> {
    // Step 1: Validate folder structure
    const structureValidation = this.validateFolderStructure(
      metadataFile,
      dataFile,
      columnMetadataFile,
      modelMetadata
    );

    if (!structureValidation.valid) {
      throw new Error(`Invalid folder structure: ${structureValidation.errors.join(', ')}`);
    }

    // Step 2: Parse metadata files (or use model metadata)
    const { parsedMetadata, parsedColumnMetadata, errors } = await this.parseMetadataFiles(
      metadataFile,
      columnMetadataFile,
      modelMetadata
    );

    if (errors.length > 0) {
      throw new Error(`Metadata parsing failed: ${errors.join(', ')}`);
    }

    // Step 3: Call FAIVOR backend - validate with appropriate method
    let faivorResults;
    if (metadataFile) {
      // Use the folder-based validation with file metadata
      faivorResults = await FaivorBackendAPI.validateFolderData(
        metadataFile,
        dataFile,
        columnMetadataFile
      );
    } else {
      // Use the model metadata directly with CSV and model validation APIs
      const csvValidation = await FaivorBackendAPI.validateCSV(parsedMetadata, dataFile);

      // If CSV validation failed, propagate the error - no mock data
      if (!csvValidation.valid) {
        throw new ValidationError({
          code: 'INVALID_CSV_FORMAT',
          message: csvValidation.message || 'CSV validation failed',
          userGuidance: 'Please check your CSV file format and ensure all required columns are present.',
          metadata: { csvValidation }
        }, 400);
      }

      // For successful validation, proceed normally
      const modelValidation = await FaivorBackendAPI.validateModel(
        parsedMetadata,
        dataFile,
        parsedColumnMetadata || {}
      );

      faivorResults = {
        csvValidation,
        modelValidation
      };
    }

    // Step 4: Transform results to internal format
    const transformedResults = this.transformFaivorResults(
      faivorResults,
      parsedMetadata,
      parsedColumnMetadata
    );

    return {
      csvValidation: faivorResults.csvValidation,
      modelValidation: faivorResults.modelValidation,
      transformedResults
    };
  }

  /**
   * Transform FAIVOR results to internal validation format
   */
  private static transformFaivorResults(
    faivorResults: any,
    parsedMetadata: any,
    parsedColumnMetadata?: any
  ) {
    const metrics = faivorResults.modelValidation.metrics;

    return {
      csv_validation: faivorResults.csvValidation,
      model_validation: faivorResults.modelValidation,
      fairness_metrics: this.extractFairnessMetrics(metrics),
      performance_metrics: this.extractPerformanceMetrics(metrics),
      bias_detection: this.extractBiasMetrics(metrics),
      explainability: this.extractExplainabilityMetrics(metrics),
      metadata: {
        parsed_metadata: parsedMetadata,
        parsed_column_metadata: parsedColumnMetadata,
        faivor_raw_results: faivorResults
      }
    };
  }

  /**
   * Extract fairness-related metrics
   */
  private static extractFairnessMetrics(metrics: Record<string, number>): Record<string, number> {
    const fairnessKeys = [
      'demographic_parity', 'equalized_odds', 'calibration', 'bias',
      'fairness.demographic_parity', 'fairness.equalized_odds', 'fairness.calibration'
    ];
    return Object.fromEntries(
      Object.entries(metrics).filter(([key]) =>
        fairnessKeys.some(fairKey => key.toLowerCase().includes(fairKey.toLowerCase()))
      )
    );
  }

  /**
   * Extract performance-related metrics
   */
  private static extractPerformanceMetrics(metrics: Record<string, number>): Record<string, number> {
    const performanceKeys = [
      'accuracy', 'precision', 'recall', 'f1_score', 'auc_roc', 'mse', 'rmse', 'mae',
      'performance.accuracy', 'performance.precision', 'performance.recall'
    ];
    return Object.fromEntries(
      Object.entries(metrics).filter(([key]) =>
        performanceKeys.some(perfKey => key.toLowerCase().includes(perfKey.toLowerCase()))
      )
    );
  }

  /**
   * Extract bias-related metrics
   */
  private static extractBiasMetrics(metrics: Record<string, number>): Record<string, any> {
    const biasKeys = ['bias', 'fairness'];
    const biasMetrics = Object.fromEntries(
      Object.entries(metrics).filter(([key]) =>
        biasKeys.some(biasKey => key.toLowerCase().includes(biasKey.toLowerCase()))
      )
    );

    return {
      bias_score: biasMetrics['bias'] || this.calculateOverallBiasScore(biasMetrics),
      protected_attributes: ['gender', 'age'], // Should be extracted from metadata
      bias_mitigation_suggestions: this.generateBiasMitigationSuggestions(biasMetrics),
      detected_metrics: biasMetrics
    };
  }

  /**
   * Extract explainability-related metrics
   */
  private static extractExplainabilityMetrics(metrics: Record<string, number>): Record<string, any> {
    const explainabilityKeys = [
      'feature_importance', 'shap', 'lime', 'permutation',
      'explainability.feature_importance', 'explainability.shap'
    ];
    const explainabilityMetrics = Object.fromEntries(
      Object.entries(metrics).filter(([key]) =>
        explainabilityKeys.some(explainKey => key.toLowerCase().includes(explainKey.toLowerCase()))
      )
    );

    return {
      feature_importance: explainabilityMetrics,
      explanation_methods: this.detectExplanationMethods(explainabilityMetrics),
      computed_metrics: explainabilityMetrics
    };
  }

  /**
   * Calculate overall bias score from individual bias metrics
   */
  private static calculateOverallBiasScore(biasMetrics: Record<string, number>): number {
    const values = Object.values(biasMetrics).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) return 0.1; // Default bias score
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Generate bias mitigation suggestions based on detected metrics
   */
  private static generateBiasMitigationSuggestions(biasMetrics: Record<string, number>): string[] {
    const suggestions = ['Re-sampling', 'Feature selection'];

    if (Object.keys(biasMetrics).length > 0) {
      suggestions.push('Bias-aware model training');
      suggestions.push('Post-processing fairness constraints');
    }

    return suggestions;
  }

  /**
   * Detect available explanation methods from metrics
   */
  private static detectExplanationMethods(explainabilityMetrics: Record<string, number>): string[] {
    const methods = [];

    if (Object.keys(explainabilityMetrics).some(key => key.toLowerCase().includes('shap'))) {
      methods.push('SHAP');
    }

    if (Object.keys(explainabilityMetrics).some(key => key.toLowerCase().includes('lime'))) {
      methods.push('LIME');
    }

    if (Object.keys(explainabilityMetrics).some(key => key.toLowerCase().includes('feature_importance'))) {
      methods.push('Feature Importance');
    }

    if (methods.length === 0) {
      methods.push('Basic Feature Analysis');
    }

    return methods;
  }
}
