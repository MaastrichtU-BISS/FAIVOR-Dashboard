import { describe, expect, test } from 'bun:test';
import { buildThresholdTable } from '../../../src/lib/utils/threshold-metrics';

describe('buildThresholdTable', () => {
  test('reads scalar and nested metrics keyed by threshold, sorted', () => {
    const result = buildThresholdTable({
      '0.5': { accuracy: 0.85, recall: 0.7, confusion_matrix: { tp: 3 } },
      '0.3': { accuracy: 0.8 }
    });

    expect(result.scalarKeys).toEqual(['accuracy', 'recall']);
    expect(result.nestedKeys).toEqual(['confusion_matrix.tp']);
    expect(result.rows.map((r) => r.threshold)).toEqual([0.3, 0.5]);
    expect(result.rows[1].values).toEqual({
      accuracy: 0.85,
      recall: 0.7,
      'confusion_matrix.tp': 3
    });
  });

  test('skips non-numeric keys and error entries', () => {
    const result = buildThresholdTable({
      '0.5': { error: 'failed' },
      roc_curve: { auc: 0.9 },
      '0.7': { accuracy: 0.9 }
    });

    expect(result.rows).toEqual([{ threshold: 0.7, values: { accuracy: 0.9 } }]);
  });

  test('returns empty table for invalid input', () => {
    expect(buildThresholdTable(null).rows).toEqual([]);
  });
});
