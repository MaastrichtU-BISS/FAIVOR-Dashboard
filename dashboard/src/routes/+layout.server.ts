import type { LayoutServerLoad } from "./$types"
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();

  // Session validation against DB is handled in hooks.server.ts (validateSession middleware)
  // This prevents redundant DB queries and potential redirect loops

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
