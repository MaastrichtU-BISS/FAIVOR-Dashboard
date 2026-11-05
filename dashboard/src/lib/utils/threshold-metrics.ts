export interface ThresholdMetricTable {
  metricNames: string[];
  rows: Array<{
    threshold: string;
    values: Record<string, unknown>;
  }>;
}

const SAMPLE_THRESHOLDS = [0.3, 0.5, 0.7];
const THRESHOLD_TOLERANCE = 1e-8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatThreshold(value: number): string {
  return String(Number(value.toPrecision(8)));
}

function matchesThreshold(value: number, target: number): boolean {
  return Math.abs(value - target) <= THRESHOLD_TOLERANCE;
}

export function getThresholdMetricTable(data: unknown): ThresholdMetricTable {
  if (!isRecord(data)) {
    return { metricNames: [], rows: [] };
  }

  if (Array.isArray(data.threshold)) {
    const thresholds = data.threshold.filter(
      (value): value is number => typeof value === 'number' && Number.isFinite(value)
    );
    const metricSeries = Object.entries(data).filter(
      ([name, values]) => name !== 'threshold' && Array.isArray(values)
    );
    const metricNames = metricSeries.map(([name]) => name);
    const rows = SAMPLE_THRESHOLDS.flatMap((sampleThreshold) => {
      const index = thresholds.findIndex((value) => matchesThreshold(value, sampleThreshold));
      if (index < 0) return [];

      const actualThreshold = thresholds[index];
      return [{
        threshold: formatThreshold(actualThreshold),
        values: Object.fromEntries(
          metricSeries.map(([name, values]) => [name, (values as unknown[])[index]])
        )
      }];
    });

    return { metricNames, rows };
  }

  const entries = Object.entries(data).flatMap(([threshold, value]) => {
    const numericThreshold = Number(threshold);
    return Number.isFinite(numericThreshold) && isRecord(value)
      ? [{ threshold: numericThreshold, values: value }]
      : [];
  });
  const metricNames = [...new Set(entries.flatMap(({ values }) => Object.keys(values)))];
  const rows = SAMPLE_THRESHOLDS.flatMap((sampleThreshold) => {
    const entry = entries.find(({ threshold }) => matchesThreshold(threshold, sampleThreshold));
    return entry
      ? [{ threshold: formatThreshold(entry.threshold), values: entry.values }]
      : [];
  });

  return { metricNames, rows };
}
