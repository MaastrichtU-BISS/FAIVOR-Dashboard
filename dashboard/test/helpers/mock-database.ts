// test/helpers/mock-database.ts
// Mock postgres database for testing

export interface MockQueryResult {
  rows?: any[];
  count?: number;
}

export class MockDatabase {
  private queries: Array<{ sql: string; params: any[]; result: any }> = [];
  private mockResults: Map<string, any> = new Map();

  // Mock the sql template literal function
  sql = Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] !== undefined ? `$${i + 1}` : '');
      }, '');

      this.queries.push({ sql: query, params: values, result: null });

      // Check if we have a mock result for this query pattern
      const mockResult = this.findMockResult(query);
      return Promise.resolve(mockResult || []);
    },
    {
      // Mock the sql.json helper
      json: (value: any) => value,

      // Mock transaction support
      begin: async (callback: (sql: any) => Promise<void>) => {
        return callback(this.sql);
      },

      // Mock connection management
      end: async () => {},
    }
  );

  // Set a mock result for a query pattern
  setMockResult(queryPattern: string | RegExp, result: any) {
    const key = queryPattern instanceof RegExp ? queryPattern.source : queryPattern;
    this.mockResults.set(key, result);
  }

  // Find mock result by query pattern
  private findMockResult(query: string): any {
    for (const [pattern, result] of this.mockResults.entries()) {
      if (query.includes(pattern)) {
        return result;
      }
    }
    return null;
  }

  // Get all executed queries
  getQueries() {
    return this.queries;
  }

  // Get last executed query
  getLastQuery() {
    return this.queries[this.queries.length - 1];
  }

  // Clear query history
  clearQueries() {
    this.queries = [];
  }

  // Clear all mock results
  clearMockResults() {
    this.mockResults.clear();
  }

  // Reset everything
  reset() {
    this.clearQueries();
    this.clearMockResults();
  }
}

// Create a singleton instance for tests
export const mockDb = new MockDatabase();

// Mock the db module
export const createMockDbModule = () => ({
  sql: mockDb.sql,
  pool: {
    query: async (sql: string, params: any[] = []) => {
      return { rows: [], rowCount: 0 };
    },
    end: async () => {},
  }
});
