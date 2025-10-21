// Proxy requests to FAIVOR ML Validator backend
// This allows the browser to access the backend service without CORS issues
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Backend URL (Docker service name, only accessible from server-side)
// Can be configured via FAIVOR_BACKEND_URL environment variable
const BACKEND_URL = env.FAIVOR_BACKEND_URL || 'http://faivor-backend:8000';

export const GET: RequestHandler = async ({ params, url, request }) => {
  return proxyRequest(params.path, url, request);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
  return proxyRequest(params.path, url, request);
};

export const PUT: RequestHandler = async ({ params, url, request }) => {
  return proxyRequest(params.path, url, request);
};

export const DELETE: RequestHandler = async ({ params, url, request }) => {
  return proxyRequest(params.path, url, request);
};

async function proxyRequest(path: string, url: URL, request: Request): Promise<Response> {
  try {
    // Construct backend URL with path and query params
    const backendUrl = `${BACKEND_URL}/${path}${url.search}`;
    
    // Forward the request to the backend
    const response = await fetch(backendUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
    });

    // Get response body
    const responseBody = await response.blob();
    
    // Return response with same status and headers
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('Backend proxy error:', err);
    throw error(503, 'FAIVOR ML Validator service is unavailable');
  }
}
