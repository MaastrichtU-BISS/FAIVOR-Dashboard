import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  const headers: Record<string, string> = {};
  
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return json({
    headers,
    url: request.url,
    method: request.method
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const headers: Record<string, string> = {};
  
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return json({
    headers,
    url: request.url,
    method: request.method,
    body: await request.text()
  });
};
