import { describe, expect, test } from 'bun:test';
import { getThresholdMetricTable } from '../../../src/lib/utils/threshold-metrics';

describe('getThresholdMetricTable', () => {
  test('reads metric arrays indexed by thresholds', () => {
    const result = getThresholdMetricTable({
      threshold: [0.3, 0.5, 0.7],
      accuracy: [0.8, 0.85, 0.9],
      f1_score: [0.75, 0.82, 0.88]
    });

    expect(result.metricNames).toEqual(['accuracy', 'f1_score']);
    expect(result.rows).toEqual([
      { threshold: '0.3', values: { accuracy: 0.8, f1_score: 0.75 } },
      { threshold: '0.5', values: { accuracy: 0.85, f1_score: 0.82 } },
      { threshold: '0.7', values: { accuracy: 0.9, f1_score: 0.88 } }
    ]);
  });

  test('matches float thresholds from np.linspace', () => {
    const result = getThresholdMetricTable({
      threshold: [0.30000000000000004, 0.5, 0.7000000000000001],
      accuracy: [1, 2, 3]
    });

    expect(result.rows.map((r) => r.threshold)).toEqual(['0.3', '0.5', '0.7']);
  });

  test('continues to read metrics keyed by threshold', () => {
    const result = getThresholdMetricTable({
      '0.3': { accuracy: 0.8 },
      '0.5': { accuracy: 0.85, recall: 0.7 },
      '0.7': { accuracy: 0.9 }
    });

    expect(result.metricNames).toEqual(['accuracy', 'recall']);
    expect(result.rows[1]).toEqual({
      threshold: '0.5',
      values: { accuracy: 0.85, recall: 0.7 }
    });
  });
});
