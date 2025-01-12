import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.getSession();
  const isSignout = url.searchParams.has('signout');

  if (isSignout && !session?.user) {
    throw redirect(303, '/');
  }

  if (session?.user) {
    throw redirect(307, '/models');
  }

  return {};
};
