import type { LayoutServerLoad } from "./$types"
import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/db';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();

  // Validate session: check if user still exists in database
  // This handles cases where backend restarts with different DB
  if (session?.user?.id) {
    try {
      const result = await pool.query('SELECT id FROM users WHERE id = $1', [session.user.id]);
      if (result.rows.length === 0) {
        // User no longer exists in database - clear session by redirecting to signout
        throw redirect(302, '/api/auth/signout?callbackUrl=/');
      }
    } catch (error) {
      // If it's already a redirect, rethrow it
      if (error instanceof Response || (error as any)?.status === 302) {
        throw error;
      }
      // Database error - log and continue
      console.error('Session validation error:', error);
    }
  }

  // Add redirections if needed
  if (!session?.user && event.url.pathname === '/profile') {
    throw redirect(302, '/');
  }

  return {
    session
  }
}
// export const prerender = true
// export const ssr = false;
