export interface ThresholdRow {
  threshold: number;
  values: Record<string, number | null>;
}

export interface ThresholdTable {
  rows: ThresholdRow[];
  /** Rate-style metrics (scalar values per threshold), suitable for a 0-1 chart */
  scalarKeys: string[];
  /** Flattened nested metrics such as confusion_matrix.tp */
  nestedKeys: string[];
}

const PREFERRED_ORDER = ['accuracy', 'precision', 'recall', 'specificity', 'f1_score', 'fpr'];

export function formatMetricLabel(key: string): string {
  return key
    .split('.')
    .pop()!
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatThresholdValue(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A';
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

/**
 * Build a table from every metric present in threshold_metrics.threshold_metrics,
 * rather than a fixed set of metric names.
 */
export function buildThresholdTable(thresholdMetrics: unknown): ThresholdTable {
  const empty: ThresholdTable = { rows: [], scalarKeys: [], nestedKeys: [] };
  if (!thresholdMetrics || typeof thresholdMetrics !== 'object') return empty;

  const scalar = new Set<string>();
  const nested = new Set<string>();
  const rows: ThresholdRow[] = [];

  for (const [key, entry] of Object.entries(thresholdMetrics as Record<string, any>)) {
    const threshold = parseFloat(key);
    if (!Number.isFinite(threshold) || !entry || typeof entry !== 'object' || entry.error) continue;

    const values: Record<string, number | null> = {};
    for (const [name, v] of Object.entries(entry)) {
      if (v && typeof v === 'object') {
        for (const [sub, sv] of Object.entries(v as Record<string, unknown>)) {
          const flat = `${name}.${sub}`;
          nested.add(flat);
          values[flat] = typeof sv === 'number' ? sv : null;
        }
      } else if (typeof v === 'number' || v === null) {
        scalar.add(name);
        values[name] = v as number | null;
      }
    }
    rows.push({ threshold, values });
  }

  rows.sort((a, b) => a.threshold - b.threshold);
  const rank = (k: string) => {
    const i = PREFERRED_ORDER.indexOf(k);
    return i === -1 ? PREFERRED_ORDER.length : i;
  };
  return {
    rows,
    scalarKeys: [...scalar].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)),
    nestedKeys: [...nested].sort()
  };
}
