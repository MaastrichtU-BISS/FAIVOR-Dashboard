// test/helpers/api-test-helpers.ts
// Helpers for testing SvelteKit API routes

export interface MockRequestInit extends RequestInit {
  json?: any;
  formData?: FormData;
}

/**
 * Create a mock Request object for testing API routes
 */
export function createMockRequest(url: string, init: MockRequestInit = {}): Request {
  const { json: jsonData, formData, ...requestInit } = init;

  let body: BodyInit | null = null;
  const headers = new Headers(init.headers);

  if (jsonData) {
    body = JSON.stringify(jsonData);
    headers.set('Content-Type', 'application/json');
  } else if (formData) {
    body = formData as any;
  } else if (init.body) {
    body = init.body;
  }

  return new Request(url, {
    ...requestInit,
    headers,
    body,
  });
}

/**
 * Create a mock RequestEvent for SvelteKit handlers
 */
export function createMockRequestEvent(
  request: Request,
  params: Record<string, string> = {},
  locals: Record<string, any> = {}
) {
  return {
    request,
    params,
    locals,
    url: new URL(request.url),
    cookies: createMockCookies(),
    fetch: global.fetch,
    getClientAddress: () => '127.0.0.1',
    platform: undefined,
    route: { id: 'test-route' },
    setHeaders: () => {},
    isDataRequest: false,
    isSubRequest: false,
  };
}

/**
 * Create mock cookies interface
 */
export function createMockCookies() {
  const cookieStore = new Map<string, string>();

  return {
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
    getAll: () => Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value })),
    serialize: (name: string, value: string) => `${name}=${value}`,
  };
}

/**
 * Parse Response as JSON
 */
export async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Create mock session for authenticated requests
 */
export function createMockSession(user: any = {}) {
  return {
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      ...user,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

/**
 * Create authenticated request event
 */
export function createAuthenticatedRequestEvent(
  request: Request,
  params: Record<string, string> = {},
  user: any = {}
) {
  const session = createMockSession(user);
  const locals = {
    session,
    user: session.user,
  };

  return createMockRequestEvent(request, params, locals);
}

/**
 * Helper to test API error responses
 */
export function expectErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedErrorMessage?: string
) {
  expect(response.status).toBe(expectedStatus);

  return parseJsonResponse(response).then(data => {
    expect(data.success).toBe(false);
    if (expectedErrorMessage) {
      expect(data.error).toContain(expectedErrorMessage);
    }
    return data;
  });
}

/**
 * Helper to test successful API responses
 */
export function expectSuccessResponse(response: Response, expectedStatus: number = 200) {
  expect(response.status).toBe(expectedStatus);

  return parseJsonResponse(response).then(data => {
    expect(data.success).toBe(true);
    return data;
  });
}
