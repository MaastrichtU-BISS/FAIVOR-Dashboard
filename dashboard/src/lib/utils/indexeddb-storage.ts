// src/lib/utils/indexeddb-storage.ts
// IndexedDB utility for storing uploaded datasets locally

export interface DatasetFolder {
  id: string;
  name: string;
  uploadDate: string;
  files: {
    metadata?: File;
    data?: File;
    columnMetadata?: File;
  };
  parsed: {
    metadata?: any;
    columnMetadata?: any;
  };
}

const DB_NAME = 'FAIRmodelsValidator';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('uploadDate', 'uploadDate', { unique: false });
        }
      };
    });
  }

  async saveDataset(dataset: DatasetFolder): Promise<void> {
    await this.init(); // Always ensure init is called

    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(dataset);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getDataset(id: string): Promise<DatasetFolder | undefined> {
    await this.init(); // Always ensure init is called

    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllDatasets(): Promise<DatasetFolder[]> {
    await this.init(); // Always ensure init is called

    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteDataset(id: string): Promise<void> {
    await this.init(); // Always ensure init is called

    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllDatasets(): Promise<void> {
    await this.init(); // Always ensure init is called

    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Singleton instance
export const datasetStorage = new IndexedDBStorage();

// Utility functions for folder validation
export function validateDatasetFolder(
  files: FileList,
  model?: { metadata?: { fairSpecific?: any } }
): {
  isValid: boolean;
  errors: string[];
  validFiles: {
    metadata?: File;
    data?: File;
    columnMetadata?: File;
  };
} {
  const errors: string[] = [];
  const validFiles: {
    metadata?: File;
    data?: File;
    columnMetadata?: File;
  } = {};

  // Check for required files
  const fileArray = Array.from(files);

  // Look for metadata.json - check both direct name and relative path
  // Be strict about the filename to avoid confusion with column_metadata.json
  const metadataFile = fileArray.find(f => {
    const fileName = f.name.toLowerCase();
    const relativePath = (f as any).webkitRelativePath?.toLowerCase() || '';

    // Exact match for metadata.json (not column_metadata.json)
    return fileName === 'metadata.json' ||
      relativePath.endsWith('/metadata.json') ||
      (relativePath.includes('/') && relativePath.split('/').pop() === 'metadata.json');
  });

  // metadata.json is now optional if model has metadata
  if (!metadataFile && !model?.metadata?.fairSpecific) {
    errors.push('metadata.json file is required (or model must have metadata configured)');
  } else if (metadataFile) {
    validFiles.metadata = metadataFile;
  }

  // Look for data.csv - check both direct name and relative path
  const dataFile = fileArray.find(f => {
    const fileName = f.name.toLowerCase();
    const relativePath = (f as any).webkitRelativePath?.toLowerCase() || '';
    return fileName === 'data.csv' ||
      relativePath.endsWith('/data.csv') ||
      relativePath.endsWith('data.csv');
  });
  if (!dataFile) {
    errors.push('data.csv file is required');
  } else {
    validFiles.data = dataFile;
  }

  // Look for column_metadata.json (optional but recommended)
  const columnMetadataFile = fileArray.find(f => {
    const fileName = f.name.toLowerCase();
    const relativePath = (f as any).webkitRelativePath?.toLowerCase() || '';
    return fileName === 'column_metadata.json' ||
      relativePath.endsWith('/column_metadata.json') ||
      relativePath.endsWith('column_metadata.json');
  });
  if (columnMetadataFile) {
    validFiles.columnMetadata = columnMetadataFile;
  }

  return {
    isValid: errors.length === 0,
    errors,
    validFiles
  };
}

// Parse JSON files
export async function parseJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = JSON.parse(e.target?.result as string);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Generate unique ID for dataset
export function generateDatasetId(): string {
  return `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Extract folder name from file path
export function extractFolderName(files: FileList): string {
  if (files.length === 0) return 'Unknown Dataset';

  // Try to extract common folder name from file paths
  const firstFile = files[0];

  // Check if webkitRelativePath is available (from folder input)
  if ((firstFile as any).webkitRelativePath) {
    const pathParts = (firstFile as any).webkitRelativePath.split('/');
    if (pathParts.length > 1) {
      return pathParts[0]; // Return the root folder name
    }
  }

  // For drag-and-drop, try to extract folder name from file names
  // Look for common pattern in file names or use a default
  const fileNames = Array.from(files).map(f => f.name);

  // If files have folder-like names, try to extract common prefix
  const commonPrefixes = fileNames
    .map(name => {
      // Look for patterns like "folder-name/file.ext" in the name itself
      const match = name.match(/^(.+?)[\\/](.+)$/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  if (commonPrefixes.length > 0) {
    // Return the most common prefix
    const prefixCounts = commonPrefixes.reduce((acc, prefix) => {
      acc[prefix!] = (acc[prefix!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(prefixCounts)
      .sort(([, a], [, b]) => b - a)[0];

    if (mostCommon) {
      return mostCommon[0];
    }
  }

  return `Dataset ${new Date().toLocaleDateString()}`;
}
