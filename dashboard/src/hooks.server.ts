// https://kit.svelte.dev/docs/hooks
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { handleAuth } from "./auth";
import { redirect } from '@sveltejs/kit';
import { Role } from '$lib/types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';


// Function to check if user has required role
function hasRequiredRole(userRole: string, requiredRole: Role): boolean {
  // Any authenticated user has USER role
  if (requiredRole === Role.USER) {
    return true;
  }
  return userRole === requiredRole;
}

// CORS handler for reverse proxy deployments
const handleCORS: Handle = async ({ event, resolve }) => {
  // Get allowed origins from environment variable
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const origin = event.request.headers.get('origin');

  // Handle preflight requests
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cookie',
        'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Resolve the request and add CORS headers to response
  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) => {
      // Allow these headers to be sent to the client
      return name === 'content-type' || name === 'set-cookie';
    }
  });

  // Add CORS headers to all responses (including errors and redirects)
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie');
    response.headers.set('Vary', 'Origin');
  }

  return response;
};

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
    path.startsWith('/auth') ||  // Auth.js authentication routes
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

// Sequence of middleware to run
// 1. handleCORS - Handle CORS headers for reverse proxy deployments
// 2. handleAuth - Handles authentication from @auth
// 3. handleProtectedRoutes - Redirects to home if not logged in
// 4. protectRoute - Our gatekeeper for RBAC (no role required by default)
export const handle = sequence(handleCORS, handleAuth, handleProtectedRoutes, protectRoute());
