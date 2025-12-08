// test/unit/utils/indexeddb-storage.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import {
  validateDatasetFolder,
  parseJSONFile,
  generateDatasetId,
  extractFolderName,
} from '../../../src/lib/utils/indexeddb-storage';
import { createFile, createCsvFile, createMetadataFile } from '../../helpers/test-factories';

describe('indexeddb-storage utilities', () => {
  describe('validateDatasetFolder', () => {
    test('should validate folder with all required files', () => {
      const files = [
        createMetadataFile(),
        createCsvFile('data.csv'),
      ] as any;

      // Mock FileList
      const fileList = {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < files.length; i++) {
            yield files[i];
          }
        }
      };

      const result = validateDatasetFolder(fileList as any);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validFiles.data).toBeDefined();
    });

    test('should fail validation when CSV is missing', () => {
      const files = [
        createMetadataFile(),
      ] as any;

      const fileList = {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < files.length; i++) {
            yield files[i];
          }
        }
      };

      const result = validateDatasetFolder(fileList as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A CSV file is required');
    });

    test('should validate folder with optional column metadata', () => {
      const columnMetadata = createFile('column_metadata.json', '{}', 'application/json');
      const files = [
        createMetadataFile(),
        createCsvFile('data.csv'),
        columnMetadata,
      ] as any;

      const fileList = {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < files.length; i++) {
            yield files[i];
          }
        }
      };

      const result = validateDatasetFolder(fileList as any);

      expect(result.isValid).toBe(true);
      expect(result.validFiles.columnMetadata).toBeDefined();
    });

    test('should handle files with webkitRelativePath', () => {
      const csvFile = createCsvFile('data.csv');
      (csvFile as any).webkitRelativePath = 'test-folder/data.csv';

      const files = [csvFile] as any;

      const fileList = {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < files.length; i++) {
            yield files[i];
          }
        }
      };

      const result = validateDatasetFolder(fileList as any);

      expect(result.isValid).toBe(true);
      expect(result.validFiles.data).toBeDefined();
    });
  });

  describe('parseJSONFile', () => {
    test('should parse valid JSON file', async () => {
      const jsonData = { name: 'Test', value: 42 };
      const file = createFile('test.json', JSON.stringify(jsonData), 'application/json');

      // Mock FileReader to return the JSON content
      const originalFileReader = (global as any).FileReader;
      (global as any).FileReader = class {
        readAsText() {
          setTimeout(() => {
            this.result = JSON.stringify(jsonData);
            if (this.onload) {
              this.onload({ target: this });
            }
          }, 0);
        }
      };

      const result = await parseJSONFile(file);

      expect(result).toEqual(jsonData);

      // Restore FileReader
      (global as any).FileReader = originalFileReader;
    });

    test('should reject invalid JSON', async () => {
      const file = createFile('invalid.json', 'not valid json', 'application/json');

      const originalFileReader = (global as any).FileReader;
      (global as any).FileReader = class {
        readAsText() {
          setTimeout(() => {
            this.result = 'not valid json';
            if (this.onload) {
              this.onload({ target: this });
            }
          }, 0);
        }
      };

      await expect(parseJSONFile(file)).rejects.toThrow();

      (global as any).FileReader = originalFileReader;
    });
  });

  describe('generateDatasetId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateDatasetId();
      const id2 = generateDatasetId();

      expect(id1).toMatch(/^dataset-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^dataset-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should include timestamp', () => {
      const before = Date.now();
      const id = generateDatasetId();
      const after = Date.now();

      const timestamp = parseInt(id.split('-')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('extractFolderName', () => {
    test('should extract folder name from webkitRelativePath', () => {
      const file = createCsvFile('data.csv');
      (file as any).webkitRelativePath = 'my-dataset/data.csv';

      const files = [file] as any;
      const fileList = {
        length: 1,
        0: file,
        item: (index: number) => files[index],
      };

      const result = extractFolderName(fileList as any);

      expect(result).toBe('my-dataset');
    });

    test('should return default name for empty file list', () => {
      const fileList = {
        length: 0,
        item: () => null,
      };

      const result = extractFolderName(fileList as any);

      expect(result).toBe('Unknown Dataset');
    });

    test('should return date-based name when no folder structure detected', () => {
      const file = createCsvFile('data.csv');

      const fileList = {
        length: 1,
        0: file,
        item: (index: number) => file,
      };

      const result = extractFolderName(fileList as any);

      expect(result).toContain('Dataset');
    });
  });
});
