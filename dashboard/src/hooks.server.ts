// https://kit.svelte.dev/docs/hooks
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { handleAuth } from "./auth";
import { redirect } from '@sveltejs/kit';
import { Role } from '$lib/types';
import { error } from '@sveltejs/kit';


// Function to check if user has required role
function hasRequiredRole(userRole: string, requiredRole: Role): boolean {
  // Any authenticated user has USER role
  if (requiredRole === Role.USER) {
    return true;
  }
  return userRole === requiredRole;
}

// Middleware to protect routes based on role
export const protectRoute = (requiredRole?: Role): Handle => {
  return async ({ event, resolve }) => {
    const session = await event.locals.getSession();

    // If route requires authentication and user is not logged in
    if (requiredRole && !session?.user?.id) {
      throw error(401, 'Unauthorized');
    }

    if (session?.user) {
      // Get role from session (set in JWT token)
      const userRole = session.user.roles?.[0] || Role.USER;

      // Check role if required
      if (requiredRole && !hasRequiredRole(userRole, requiredRole)) {
        throw error(403, 'Forbidden');
      }

      // Set role in locals for use in routes
      event.locals.roles = [userRole];
    }

    return resolve(event);
  };
};


const handleProtectedRoutes: Handle = async ({ event, resolve }) => {
  const session = await event.locals.getSession();
  const path = event.url.pathname;

  // Redirect logged-in users from root to models page
  if (path === '/' && session?.user) {
    throw redirect(303, '/models');
  }

  // Allow access to public routes and assets
  if (
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/api/register') ||
    path.startsWith('/api/models') ||  // Allow model API access
    path.startsWith('/_app') ||  // SvelteKit internal routes
    path.startsWith('/favicon') ||
    path.startsWith('/images') ||
    path.startsWith('/manifest.json') ||
    path.startsWith('/about') ||
    path.startsWith('/terms') ||
    path.startsWith('/privacy') ||
    path.startsWith('/table')
  ) {
    return resolve(event);
  }

  // Redirect to home if not logged in
  if (!session?.user) {
    throw redirect(303, '/');
  }

  return resolve(event);
};

// --- CORS middleware for API routes ---
// MUST run first to handle OPTIONS preflight before auth checks
import { PUBLIC_DASHBOARD_ORIGIN } from '$env/static/public';

const handleCORS: Handle = async ({ event, resolve }) => {
  // Only apply CORS to API routes
  if (!event.url.pathname.startsWith('/api/')) {
    return resolve(event);
  }

  // Parse allowed origins from env (comma-separated for multiple origins)
  // Example: "https://example.com,https://staging.example.com"
  const allowedOrigins = PUBLIC_DASHBOARD_ORIGIN
    ? PUBLIC_DASHBOARD_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  // If no origins configured, skip CORS headers (same-origin only - secure default)
  if (allowedOrigins.length === 0) {
    return resolve(event);
  }

  // Get the request origin
  const requestOrigin = event.request.headers.get('Origin');

  // Check if request origin is in allowed list
  const isAllowedOrigin = requestOrigin && allowedOrigins.includes(requestOrigin);

  // CORS headers to apply (only if origin is allowed)
  const corsHeaders: Record<string, string> = isAllowedOrigin
    ? {
        'Access-Control-Allow-Origin': requestOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
      }
    : {
        'Vary': 'Origin' // Always set Vary for caching correctness
      };

  // Handle OPTIONS preflight request
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Process the actual request
  const response = await resolve(event);

  // Add CORS headers to response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
};

// Sequence of middleware to run
// 1. handleCORS - Handle CORS preflight BEFORE auth (OPTIONS requests don't carry credentials)
// 2. handleAuth - Handles authentication from @auth
// 3. handleProtectedRoutes - Redirects to home if not logged in
// 4. protectRoute - Our gatekeeper for RBAC (no role required by default)
export const handle = sequence(handleCORS, handleAuth, handleProtectedRoutes, protectRoute());