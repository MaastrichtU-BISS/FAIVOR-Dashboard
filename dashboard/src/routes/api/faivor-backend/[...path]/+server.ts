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
    
    console.log(`[Proxy] ${request.method} ${backendUrl}`);
    console.log(`[Proxy] Content-Type: ${request.headers.get('content-type')}`);
    
    // Build headers to forward (exclude host and other problematic headers)
    const headersToForward = new Headers();
    for (const [key, value] of request.headers.entries()) {
      // Skip headers that shouldn't be forwarded
      if (!['host', 'connection', 'origin', 'referer'].includes(key.toLowerCase())) {
        headersToForward.set(key, value);
      }
    }
    
    // Get the request body (using arrayBuffer to preserve binary data)
    let body = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
      console.log(`[Proxy] Body size: ${body.byteLength} bytes`);
    }
    
    // Forward the request to the backend
    const response = await fetch(backendUrl, {
      method: request.method,
      headers: headersToForward,
      body: body,
    });

    console.log(`[Proxy] Response status: ${response.status}`);
    
    // Get response body
    const responseBody = await response.arrayBuffer();
    
    // Forward response headers
    const responseHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      responseHeaders.set(key, value);
    }
    
    // Return response with same status and headers
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('Backend proxy error:', err);
    throw error(503, 'FAIVOR ML Validator service is unavailable');
  }
}
