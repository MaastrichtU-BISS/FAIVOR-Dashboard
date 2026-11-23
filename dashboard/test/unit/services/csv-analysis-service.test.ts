import { describe, test, expect } from 'bun:test';
import { CSVAnalysisService } from '../../../src/lib/services/csv-analysis-service';

const csv = (text: string) => new File([text], 'data.csv', { type: 'text/csv' });

describe('CSVAnalysisService metadata-driven types', () => {
  test('flags non-numeric values in a column declared numerical', async () => {
    const analysis = await CSVAnalysisService.analyzeCSV(csv('age,sex\n30,m\n40,f\nabc,m\n50,f\n'), [
      { label: 'age', type: 'n' },
      { label: 'sex', type: 'c' }
    ]);
    const age = analysis.columns[0];
    expect(age.type).toBe('numerical');
    expect(age.typeMismatch).toBe(true);
    expect(age.invalidValues).toEqual([{ row: 3, value: 'abc' }]);
    expect(analysis.columns[1].typeMismatch).toBe(false);
  });

  test('keeps numeric-looking codes categorical when metadata says so', async () => {
    const analysis = await CSVAnalysisService.analyzeCSV(csv('smoker\n0\n1\n1\n'), [
      { label: 'smoker', type: 'c' }
    ]);
    expect(analysis.columns[0].type).toBe('categorical');
    expect(analysis.columns[0].typeMismatch).toBe(false);
  });

  test('reports missing and extra columns', async () => {
    const analysis = await CSVAnalysisService.analyzeCSV(csv('age,id\n30,1\n40,2\n'), [
      { label: 'age', type: 'n' },
      { label: 'bmi', type: 'n' }
    ]);
    expect(analysis.schemaIssues).toEqual({ missingFeatures: ['bmi'], extraColumns: ['id'] });
  });

  test('without metadata, a partially numeric column is categorical', async () => {
    const analysis = await CSVAnalysisService.analyzeCSV(csv('x\n1\n2\n3\n4\nfoo\n'));
    expect(analysis.columns[0].type).toBe('categorical');
  });
});

describe('CSVAnalysisService column roles', () => {
  const features = [{ label: 'age', type: 'n' }];

  test('excludes columns marked as metadata and keeps them listed as unlinked', async () => {
    const analysis = await CSVAnalysisService.analyzeCSV(csv('id,age\n1,30\n2,40\n'), features, {
      id: 'metadata'
    });
    expect(analysis.columns.map(c => c.name)).toEqual(['age']);
    expect(analysis.metadataColumns).toEqual(['id']);
    expect(analysis.schemaIssues?.extraColumns).toEqual(['id']);
  });

  test('user role overrides auto-detection for unlinked columns only', async () => {
    const analysis = await CSVAnalysisService.analyzeCSV(csv('zip,age\n6211,30\n6212,40\n'), features, {
      zip: 'categorical',
      age: 'categorical'
    });
    expect(analysis.columns[0].type).toBe('categorical');
    expect(analysis.columns[1].type).toBe('numerical');
  });
});
