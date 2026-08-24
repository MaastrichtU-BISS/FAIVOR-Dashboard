// Mock API for validation
import validationDataJson from './validation.json';

interface Feature {
  count: number;
  unique?: number | null;
  top?: string | number | null;
  freq?: number | null;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  max?: number | null;
  '25%'?: number | null;
  '50%'?: number | null;
  '75%'?: number | null;
}

interface SummaryStatistics {
  [key: string]: Feature;
}

interface ValidationData {
  summary_statistics: SummaryStatistics;
  categorical_histograms: Record<string, Record<string, number>>;
}

interface ValidateModelResponse {
  data: ValidationData;
  valid: boolean;
  errors: any[];
}

export const validateModel = async (model: any): Promise<ValidateModelResponse> => {
  // Use data from the imported validation.json
  const typedValidationData = validationDataJson as ValidationData;

  return {
    data: typedValidationData,
    valid: true,
    errors: []
  };
};
