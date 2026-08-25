import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModelRepository } from '$lib/repositories/model-repository';

export const GET: RequestHandler = async () => {
  try {
    const models = await ModelRepository.getAllWithValidations();
    return json(models);
  } catch (e) {
    console.error('Error loading models:', e);
    return new Response(JSON.stringify({ error: 'Failed to load models' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
