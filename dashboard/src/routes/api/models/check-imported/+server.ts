import { json } from '@sveltejs/kit';
import { ModelRepository } from '$lib/repositories/model-repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const modelUrl = url.searchParams.get('url');
    
    if (!modelUrl) {
      return json({ error: 'URL parameter is required' }, { status: 400 });
    }

    const imported = await ModelRepository.existsByUrl(modelUrl);
    
    return json({ imported });
  } catch (error) {
    console.error('Error checking if model is imported:', error);
    return json({ error: 'Failed to check import status' }, { status: 500 });
  }
};
