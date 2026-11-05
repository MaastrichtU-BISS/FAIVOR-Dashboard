import { describe, expect, test } from 'bun:test';
import { getCalibrationCurves, getCoefficientRows } from '../../../src/lib/utils/calibration';
import type { CalibrationResponse } from '../../../src/lib/api/faivor-backend';

describe('calibration utils', () => {
  test('getCoefficientRows rounds values and omits nulls', () => {
    const rows = getCoefficientRows({
      m1: { intercept: 0.123456 },
      m2: { intercept: null, slope: 0.98765 },
      m3: { intercept: 1, covariates: { age: 0.5, bmi: null } }
    });
    expect(rows).toEqual([
      { method: 'm1', term: 'Intercept', value: '0.1235' },
      { method: 'm2', term: 'Slope', value: '0.9877' },
      { method: 'm3', term: 'Intercept', value: '1.0000' },
      { method: 'm3', term: 'age', value: '0.5000' }
    ]);
  });

  test('getCalibrationCurves reads per-model curves', () => {
    const curve = { observed_probability: [0.1, 0.5], predicted_probability: [0.2, 0.6] };
    const cal = {
      predictions: {},
      log_likelihoods: {},
      model_selection: { selected_model: 'm0' },
      roc_metrics: {},
      calibration_curve: { m0: curve, m1: curve, m2: { observed_probability: [], predicted_probability: [] }, m3: curve }
    } as CalibrationResponse;
    const series = getCalibrationCurves(cal);
    expect(series.map((s) => s.modelId)).toEqual(['m0', 'm1', 'm3']);
    expect(series[0].predicted).toEqual([0.2, 0.6]);
  });
});
