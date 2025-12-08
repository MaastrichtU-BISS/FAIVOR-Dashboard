// test/setup/global-setup.ts
// Global test setup and environment configuration

import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Load test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'faivor_test';
process.env.AUTH_SECRET = 'test-auth-secret';

// Mock browser globals for IndexedDB and other browser APIs
if (typeof global !== 'undefined') {
  // Mock indexedDB
  (global as any).indexedDB = {
    open: () => {
      throw new Error('IndexedDB not available in test environment');
    }
  };

  // Mock File API
  if (typeof File === 'undefined') {
    (global as any).File = class File {
      name: string;
      size: number;
      type: string;
      lastModified: number;

      constructor(bits: any[], filename: string, options: any = {}) {
        this.name = filename;
        this.size = bits.reduce((acc, bit) => acc + (bit?.length || 0), 0);
        this.type = options.type || '';
        this.lastModified = options.lastModified || Date.now();
      }
    };
  }

  // Mock FileReader
  if (typeof FileReader === 'undefined') {
    (global as any).FileReader = class FileReader {
      result: string | null = null;
      onload: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;

      readAsText(file: any) {
        setTimeout(() => {
          this.result = 'mock file content';
          if (this.onload) {
            this.onload({ target: this });
          }
        }, 0);
      }
    };
  }
}

// Global test hooks
export const setupGlobalTestEnvironment = () => {
  beforeAll(() => {
    console.log('🧪 Starting test suite...');
  });

  afterAll(() => {
    console.log('✅ Test suite completed');
  });
};

// Helper to reset mocks between tests
export const resetAllMocks = () => {
  // This will be called in beforeEach hooks
};
