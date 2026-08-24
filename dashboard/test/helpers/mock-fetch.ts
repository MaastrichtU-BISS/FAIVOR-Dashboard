// test/helpers/mock-fetch.ts
// Mock fetch for API testing

export interface MockFetchOptions {
  url: string | RegExp;
  response: any;
  status?: number;
  headers?: Record<string, string>;
  delay?: number;
}

export class MockFetch {
  private mocks: Map<string, MockFetchOptions> = new Map();
  private calls: Array<{ url: string; options?: RequestInit }> = [];

  // Add a mock response for a URL
  mockResponse(options: MockFetchOptions) {
    const key = options.url instanceof RegExp ? options.url.source : options.url;
    this.mocks.set(key, options);
  }

  // Create the mock fetch function
  createFetch() {
    return async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      this.calls.push({ url: urlStr, options });

      // Find matching mock
      let mockOptions: MockFetchOptions | undefined;

      for (const [pattern, opts] of this.mocks.entries()) {
        if (opts.url instanceof RegExp) {
          if (new RegExp(pattern).test(urlStr)) {
            mockOptions = opts;
            break;
          }
        } else if (urlStr.includes(pattern)) {
          mockOptions = opts;
          break;
        }
      }

      if (!mockOptions) {
        return new Response(
          JSON.stringify({ error: 'Not Found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Simulate delay if specified
      if (mockOptions.delay) {
        await new Promise(resolve => setTimeout(resolve, mockOptions.delay));
      }

      const responseBody = typeof mockOptions.response === 'string'
        ? mockOptions.response
        : JSON.stringify(mockOptions.response);

      const headers = new Headers({
        'Content-Type': 'application/json',
        ...mockOptions.headers,
      });

      return new Response(responseBody, {
        status: mockOptions.status || 200,
        headers,
      });
    };
  }

  // Get all fetch calls
  getCalls() {
    return this.calls;
  }

  // Get last fetch call
  getLastCall() {
    return this.calls[this.calls.length - 1];
  }

  // Check if URL was called
  wasCalled(url: string | RegExp): boolean {
    return this.calls.some(call => {
      if (typeof url === 'string') {
        return call.url.includes(url);
      }
      return url.test(call.url);
    });
  }

  // Reset all mocks and calls
  reset() {
    this.mocks.clear();
    this.calls = [];
  }
}

// Create global mock fetch instance
export const mockFetch = new MockFetch();

// Setup function
export const setupMockFetch = () => {
  (global as any).fetch = mockFetch.createFetch();
  return mockFetch;
};

// Cleanup function
export const cleanupMockFetch = () => {
  mockFetch.reset();
};
