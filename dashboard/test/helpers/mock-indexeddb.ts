// test/helpers/mock-indexeddb.ts
// Mock IndexedDB implementation for testing

export class MockIndexedDB {
  private stores: Map<string, Map<string, any>> = new Map();
  private dbName: string = '';
  private version: number = 1;

  constructor() {
    this.stores.set('datasets', new Map());
  }

  open(name: string, version?: number): { result: any; onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: (event: any) => void } {
    this.dbName = name;
    if (version) this.version = version;

    const request = {
      result: this,
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
    };

    // Simulate async operation
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  }

  transaction(storeNames: string[], mode: 'readonly' | 'readwrite') {
    return new MockTransaction(this.stores, storeNames);
  }

  createObjectStore(name: string, options?: any) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }
    return new MockObjectStore(this.stores.get(name)!);
  }

  get objectStoreNames() {
    return {
      contains: (name: string) => this.stores.has(name)
    };
  }

  // Test helpers
  reset() {
    this.stores.clear();
    this.stores.set('datasets', new Map());
  }

  getData(storeName: string, key: string) {
    return this.stores.get(storeName)?.get(key);
  }

  getAllData(storeName: string) {
    return Array.from(this.stores.get(storeName)?.values() || []);
  }
}

class MockTransaction {
  constructor(private stores: Map<string, Map<string, any>>, private storeNames: string[]) {}

  objectStore(name: string) {
    const store = this.stores.get(name);
    if (!store) {
      throw new Error(`Object store ${name} not found`);
    }
    return new MockObjectStore(store);
  }
}

class MockObjectStore {
  constructor(private data: Map<string, any>) {}

  put(value: any) {
    return this.createRequest(() => {
      const key = value.id || Math.random().toString();
      this.data.set(key, value);
      return key;
    });
  }

  get(key: string) {
    return this.createRequest(() => this.data.get(key));
  }

  getAll() {
    return this.createRequest(() => Array.from(this.data.values()));
  }

  delete(key: string) {
    return this.createRequest(() => {
      this.data.delete(key);
      return undefined;
    });
  }

  clear() {
    return this.createRequest(() => {
      this.data.clear();
      return undefined;
    });
  }

  createIndex(name: string, keyPath: string, options?: any) {
    return {};
  }

  private createRequest(operation: () => any) {
    const request = {
      result: null as any,
      onsuccess: null as any,
      onerror: null as any,
    };

    setTimeout(() => {
      try {
        request.result = operation();
        if (request.onsuccess) {
          request.onsuccess();
        }
      } catch (error) {
        if (request.onerror) {
          request.onerror();
        }
      }
    }, 0);

    return request;
  }
}

// Global mock instance
export const mockIndexedDB = new MockIndexedDB();

// Setup function to install the mock
export const setupMockIndexedDB = () => {
  (global as any).indexedDB = mockIndexedDB;
  return mockIndexedDB;
};

// Cleanup function
export const cleanupMockIndexedDB = () => {
  mockIndexedDB.reset();
};
