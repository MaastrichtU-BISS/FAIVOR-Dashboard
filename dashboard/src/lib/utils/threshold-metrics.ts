export interface ThresholdMetricTable {
  metricNames: string[];
  rows: Array<{
    threshold: string;
    values: Record<string, unknown>;
  }>;
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatThreshold(value: number): string {
  return String(Number(value.toPrecision(8)));
}

export function getThresholdMetricTable(data: unknown): ThresholdMetricTable {
  if (!isRecord(data)) {
    return { metricNames: [], rows: [] };
  }

  if (Array.isArray(data.threshold)) {
    const metricSeries = Object.entries(data).filter(
      ([name, values]) => name !== 'threshold' && Array.isArray(values)
    );
    const metricNames = metricSeries.map(([name]) => name);
    const rows = data.threshold.flatMap((value, index) =>
      typeof value === 'number' && Number.isFinite(value)
        ? [{
            threshold: formatThreshold(value),
            values: Object.fromEntries(
              metricSeries.map(([name, values]) => [name, (values as unknown[])[index]])
            )
          }]
        : []
    );

    return { metricNames, rows };
  }

  const entries = Object.entries(data).flatMap(([threshold, value]) => {
    const numericThreshold = Number(threshold);
    return Number.isFinite(numericThreshold) && isRecord(value)
      ? [{ threshold: numericThreshold, values: value }]
      : [];
  });
  const metricNames = [...new Set(entries.flatMap(({ values }) => Object.keys(values)))];
  const rows = entries
    .sort((x, y) => x.threshold - y.threshold)
    .map(({ threshold, values }) => ({ threshold: formatThreshold(threshold), values }));

  return { metricNames, rows };
}
