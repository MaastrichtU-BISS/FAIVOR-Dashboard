import type { CalibrationResponse } from '$lib/api/faivor-backend';

export const CALIBRATION_MODEL_LABELS: Record<string, string> = {
  m0: 'Original model',
  m1: 'Intercept recalibration',
  m2: 'Logistic recalibration',
  m3: 'Model revision'
};

export const calibrationModelLabel = (id: string): string =>
  CALIBRATION_MODEL_LABELS[id] ? `${id} (${CALIBRATION_MODEL_LABELS[id]})` : id;

export interface CalibrationCurveSeries {
  modelId: string;
  predicted: number[];
  observed: number[];
}

export interface CoefficientRow {
  method: string;
  term: string;
  value: string;
}

/** Curves per model (m0..m3); falls back to the legacy `models` array. */
export function getCalibrationCurves(calibration: CalibrationResponse): CalibrationCurveSeries[] {
  const out: CalibrationCurveSeries[] = [];
  for (const [modelId, c] of Object.entries(calibration.calibration_curve ?? {})) {
    if (c?.predicted_probability?.length > 0 && c?.observed_probability?.length > 0) {
      out.push({
        modelId,
        predicted: c.predicted_probability,
        observed: c.observed_probability
      });
    }
  }
  if (out.length === 0) {
    for (const m of calibration.models ?? []) {
      if (m.calibration_curve?.mean_predicted_value?.length > 0) {
        out.push({
          modelId: m.model_id,
          predicted: m.calibration_curve.mean_predicted_value,
          observed: m.calibration_curve.fraction_of_positives
        });
      }
    }
  }
  return out.sort((a, b) => a.modelId.localeCompare(b.modelId));
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Flattened coefficient rows; null/missing values are omitted. */
export function getCoefficientRows(
  coefficients: CalibrationResponse['coefficients'],
  decimals = 4
): CoefficientRow[] {
  const rows: CoefficientRow[] = [];
  if (!coefficients) return rows;
  const add = (method: string, term: string, v: unknown) => {
    if (isNum(v)) rows.push({ method, term, value: v.toFixed(decimals) });
  };
  add('m1', 'Intercept', coefficients.m1?.intercept);
  add('m2', 'Intercept', coefficients.m2?.intercept);
  add('m2', 'Slope', coefficients.m2?.slope);
  add('m3', 'Intercept', coefficients.m3?.intercept);
  for (const [name, v] of Object.entries(coefficients.m3?.covariates ?? {})) {
    add('m3', name, v);
  }
  return rows;
}
