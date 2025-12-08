// test/helpers/coverage-thresholds.ts
// Script to check coverage thresholds

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

const THRESHOLDS = {
  statements: 85,
  branches: 80,
  lines: 85,
  functions: 85,
};

const COVERAGE_FILE = join(process.cwd(), 'coverage', 'coverage-summary.json');

function checkCoverage() {
  if (!existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage summary not found. Run tests with --coverage first.');
    process.exit(1);
  }

  try {
    const coverageData: CoverageSummary = JSON.parse(
      readFileSync(COVERAGE_FILE, 'utf-8')
    );

    const { total } = coverageData;
    const results: Array<{ metric: string; actual: number; threshold: number; pass: boolean }> = [];

    let allPassed = true;

    for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
      const actual = total[metric as keyof typeof total].pct;
      const pass = actual >= threshold;

      results.push({ metric, actual, threshold, pass });

      if (!pass) {
        allPassed = false;
      }
    }

    console.log('\n📊 Coverage Report:\n');
    console.log('┌──────────────┬──────────┬────────────┬────────┐');
    console.log('│ Metric       │ Actual   │ Threshold  │ Status │');
    console.log('├──────────────┼──────────┼────────────┼────────┤');

    for (const { metric, actual, threshold, pass } of results) {
      const status = pass ? '✅ PASS' : '❌ FAIL';
      const metricPadded = metric.padEnd(12);
      const actualStr = `${actual.toFixed(2)}%`.padEnd(8);
      const thresholdStr = `${threshold}%`.padEnd(10);

      console.log(`│ ${metricPadded} │ ${actualStr} │ ${thresholdStr} │ ${status} │`);
    }

    console.log('└──────────────┴──────────┴────────────┴────────┘\n');

    if (allPassed) {
      console.log('✅ All coverage thresholds met!\n');
      process.exit(0);
    } else {
      console.error('❌ Some coverage thresholds not met. Please add more tests.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error reading coverage data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  checkCoverage();
}

export { checkCoverage, THRESHOLDS };
