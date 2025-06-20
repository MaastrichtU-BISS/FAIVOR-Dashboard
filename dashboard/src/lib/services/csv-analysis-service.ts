// src/lib/services/csv-analysis-service.ts
export interface ColumnStatistics {
  name: string;
  type: 'categorical' | 'numerical';
  count: number;
  uniqueValues: number;
  nullValues: number;

  // For categorical columns
  values?: string[];
  mostCommon?: { value: string; count: number };

  // For numerical columns
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  quartiles?: {
    q1: number;
    q2: number;
    q3: number;
  };

  // Distribution data for charts
  distribution?: { value: string | number; count: number }[];
  distributionObject?: Record<string, number>; // For compatibility with /table route format
}

export interface DatasetAnalysis {
  totalRows: number;
  totalColumns: number;
  columns: ColumnStatistics[];
  completeness: number;
  fileName: string;
  fileSize: number;
}

export class CSVAnalysisService {
  /**
   * Analyze a CSV file and return comprehensive statistics
   */
  static async analyzeCSV(csvFile: File): Promise<DatasetAnalysis> {
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      if (lines.length === 1) {
        throw new Error('CSV file only contains headers, no data rows found');
      }

      // Auto-detect delimiter
      const delimiter = this.detectDelimiter(lines[0]);
      console.log(`Detected CSV delimiter: "${delimiter}"`);

      // Parse CSV with detected delimiter
      const headers = this.parseCSVLine(lines[0], delimiter);
      console.log(`Found ${headers.length} columns:`, headers);

      const dataRows = lines.slice(1)
        .filter(line => line.trim())
        .map(line => this.parseCSVLine(line, delimiter));

      console.log(`Parsed ${dataRows.length} data rows`);

      // Be more flexible with row validation - allow rows with different column counts
      // Just ensure we have at least some data rows
      const validDataRows = dataRows.filter(row => row.length > 0 && row.some(cell => cell.trim()));

      if (validDataRows.length === 0) {
        throw new Error('No valid data rows found in CSV. Please check if the file contains proper CSV data with at least one row of data.');
      }

      console.log(`Found ${validDataRows.length} valid data rows`);

      // Normalize rows to match header length (pad with empty strings or truncate)
      const normalizedRows = validDataRows.map(row => {
        const normalized = [...row];
        // Pad with empty strings if row is shorter than headers
        while (normalized.length < headers.length) {
          normalized.push('');
        }
        // Truncate if row is longer than headers
        return normalized.slice(0, headers.length);
      });

      // Analyze each column
      const columnStats: ColumnStatistics[] = headers.map((header, index) =>
        this.analyzeColumn(header, normalizedRows, index)
      );

      // Calculate overall completeness
      const totalCells = normalizedRows.length * headers.length;
      const nonNullCells = columnStats.reduce((sum, col) => sum + col.count, 0);
      const completeness = (nonNullCells / totalCells) * 100;

      return {
        totalRows: normalizedRows.length,
        totalColumns: headers.length,
        columns: columnStats,
        completeness: parseFloat(completeness.toFixed(2)),
        fileName: csvFile.name,
        fileSize: csvFile.size
      };
    } catch (error) {
      console.error('CSV Analysis Error:', error);
      throw new Error(`Failed to analyze CSV file "${csvFile.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-detect CSV delimiter by checking which delimiter produces the most consistent column count
   */
  private static detectDelimiter(headerLine: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let maxColumns = 0;

    for (const delimiter of delimiters) {
      const columns = this.parseCSVLine(headerLine, delimiter);
      if (columns.length > maxColumns) {
        maxColumns = columns.length;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Parse a CSV line handling basic quoted fields
   */
  private static parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  /**
   * Analyze a single column and determine its characteristics
   */
  private static analyzeColumn(
    columnName: string,
    dataRows: string[][],
    columnIndex: number
  ): ColumnStatistics {
    const columnValues = dataRows
      .map(row => row[columnIndex] || '') // Handle missing values gracefully
      .filter(val => val !== '' && val != null && val !== undefined);

    const uniqueValues = [...new Set(columnValues)];
    const nullValues = dataRows.length - columnValues.length;

    // Handle empty columns
    if (columnValues.length === 0) {
      return {
        name: columnName || `Column ${columnIndex + 1}`,
        type: 'categorical',
        count: 0,
        uniqueValues: 0,
        nullValues: dataRows.length,
        values: [],
        distribution: [],
        distributionObject: {}
      };
    }

    // Determine if column is numerical
    const numericalValues = columnValues
      .map(val => parseFloat(val))
      .filter(val => !isNaN(val));

    // Use 70% threshold to determine if column is numerical (more flexible)
    const isNumerical = numericalValues.length > columnValues.length * 0.7;

    if (isNumerical && numericalValues.length > 0) {
      return this.analyzeNumericalColumn(columnName, numericalValues, columnValues.length, nullValues);
    } else {
      return this.analyzeCategoricalColumn(columnName, columnValues, nullValues);
    }
  }

  /**
   * Analyze numerical column
   */
  private static analyzeNumericalColumn(
    columnName: string,
    numericalValues: number[],
    totalCount: number,
    nullValues: number
  ): ColumnStatistics {
    const sorted = [...numericalValues].sort((a, b) => a - b);
    const mean = numericalValues.reduce((sum, val) => sum + val, 0) / numericalValues.length;

    // Calculate standard deviation
    const variance = numericalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericalValues.length;
    const std = Math.sqrt(variance);

    // Calculate quartiles
    const q1 = this.calculateQuantile(sorted, 0.25);
    const q2 = this.calculateQuantile(sorted, 0.5); // median
    const q3 = this.calculateQuantile(sorted, 0.75);

    // Create distribution bins
    const binCount = Math.min(10, Math.max(5, Math.floor(Math.sqrt(numericalValues.length))));
    const min = Math.min(...numericalValues);
    const max = Math.max(...numericalValues);
    const binSize = (max - min) / binCount;

    const distribution: { value: string; count: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      const binValues = numericalValues.filter(val =>
        val >= binStart && (i === binCount - 1 ? val <= binEnd : val < binEnd)
      );

      distribution.push({
        value: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        count: binValues.length
      });
    }

    return {
      name: columnName,
      type: 'numerical',
      count: totalCount,
      uniqueValues: new Set(numericalValues).size,
      nullValues,
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(q2.toFixed(2)),
      std: parseFloat(std.toFixed(2)),
      quartiles: {
        q1: parseFloat(q1.toFixed(2)),
        q2: parseFloat(q2.toFixed(2)),
        q3: parseFloat(q3.toFixed(2))
      },
      distribution
    };
  }

  /**
   * Analyze categorical column
   */
  private static analyzeCategoricalColumn(
    columnName: string,
    columnValues: string[],
    nullValues: number
  ): ColumnStatistics {
    const uniqueValues = [...new Set(columnValues)];

    // Count frequency of each value
    const valueCounts = columnValues.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most common value
    const mostCommonEntry = Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a)[0];

    const mostCommon = mostCommonEntry ? {
      value: mostCommonEntry[0],
      count: mostCommonEntry[1]
    } : undefined;

    // Create distribution in the same format as /table route (object with value->count mapping)
    const distributionObject = Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15) // Top 15 most frequent values
      .reduce((acc, [value, count]) => {
        acc[value] = count;
        return acc;
      }, {} as Record<string, number>);

    // Also keep array format for other uses
    const distribution = Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([value, count]) => ({ value, count }));

    return {
      name: columnName,
      type: 'categorical',
      count: columnValues.length,
      uniqueValues: uniqueValues.length,
      nullValues,
      values: uniqueValues.slice(0, 20), // First 20 unique values
      mostCommon,
      distribution,
      distributionObject // Add this for compatibility with /table route
    };
  }

  /**
   * Calculate quantile value
   */
  private static calculateQuantile(sortedArray: number[], quantile: number): number {
    const index = quantile * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    if (lower < 0) return sortedArray[0];

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format numbers for display
   */
  static formatNumber(num: number | null | undefined): string {
    if (num === undefined || num === null || isNaN(num)) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}
