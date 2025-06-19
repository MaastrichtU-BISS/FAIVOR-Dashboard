// Mock API for validation

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
  // Placeholder data to match the expected structure
  const mockSummaryStatistics: SummaryStatistics = {
    age: { count: 100, mean: 30, std: 5, min: 20, '25%': 25, '50%': 30, '75%': 35, max: 40 },
    height: { count: 100, mean: 170, std: 10, min: 150, '25%': 165, '50%': 170, '75%': 175, max: 190 },
    gender: { count: 100, unique: 2, top: 'Female', freq: 60 },
    city: { count: 100, unique: 3, top: 'New York', freq: 40 }
  };

  const mockCategoricalHistograms: Record<string, Record<string, number>> = {
    gender: { 'Female': 60, 'Male': 40 },
    city: { 'New York': 40, 'London': 30, 'Paris': 30 }
  };

  return {
    data: {
      summary_statistics: mockSummaryStatistics,
      categorical_histograms: mockCategoricalHistograms
    },
    valid: true,
    errors: []
  };
};
