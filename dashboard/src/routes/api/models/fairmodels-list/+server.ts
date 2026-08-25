import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function extractOrganization(email: string | null): string {
  if (!email) return 'Unknown';
  const domain = email.split('@')[1];
  if (!domain) return 'Unknown';

  // Map common domains to readable organization names
  const orgMap: Record<string, string> = {
    'maastrichtuniversity.nl': 'Maastricht University',
    'icr.ac.uk': 'Institute of Cancer Research',
    'gmail.com': 'Independent',
    'yahoo.com': 'Independent',
    '163.com': 'Independent'
  };

  return orgMap[domain] || domain;
}

export const GET: RequestHandler = async () => {
  try {
    const response = await fetch('https://v3.fairmodels.org', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch FAIRmodels list: ${response.status}`);
    }

    const models = await response.json();

    // Transform to a standardized format with author and organization
    const transformedModels = Object.entries(models).map(([id, data]: [string, any]) => {
      const generalInfo = data.metadata?.['General Model Information'] || {};
      const author = generalInfo['Created by']?.['@value'] || 'Unknown';
      const email = generalInfo['Contact email']?.['@value'] || null;
      const creationDate = generalInfo['Creation date']?.['@value'] || null;

      return {
        id,
        title: data.title,
        created_at: creationDate || data.time,
        url: `https://v3.fairmodels.org/instance/${id}`,
        source: 'fairmodels.org',
        author,
        organization: extractOrganization(email)
      };
    });

    return json(transformedModels);
  } catch (error) {
    console.error('Error fetching FAIRmodels list:', error);
    return json({ error: 'Failed to fetch models from FAIRmodels.org' }, { status: 500 });
  }
};
