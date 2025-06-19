import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const response = await fetch('https://v3.fairmodels.org', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch FAIRmodels list: ${response.status}`);
    }

    const models = await response.json();


    // Transform to a standardized format
    const transformedModels = Object.entries(models).map(([id, data]: [string, any]) => ({
      id,
      title: data.title,
      created_at: data.time,
      url: `https://v3.fairmodels.org/instance/${id}`,
      source: 'fairmodels.org'
    }));

    return json(transformedModels);
  } catch (error) {
    console.error('Error fetching FAIRmodels list:', error);
    return json({ error: 'Failed to fetch models from FAIRmodels.org' }, { status: 500 });
  }
};
