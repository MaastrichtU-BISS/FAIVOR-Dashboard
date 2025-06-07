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

// Sequence of middleware to run
// 1. handleAuth - Handles authentication from @auth
// 2. handleProtectedRoutes - Redirects to home if not logged in
// 3. protectRoute - Our gatekeeper for RBAC (no role required by default)
export const handle = sequence(handleAuth, handleProtectedRoutes, protectRoute());
