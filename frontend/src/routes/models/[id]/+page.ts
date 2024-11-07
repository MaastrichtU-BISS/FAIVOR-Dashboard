import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { models } from '../models-api-example';

export const load: PageLoad = ({ params }) => {
  const model = models.find(m => m.name === decodeURIComponent(params.id));

  if (!model) {
    throw error(404, 'Model not found');
  }

  return {
    model
  };
};
