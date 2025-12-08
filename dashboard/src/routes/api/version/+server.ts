import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_VALIDATOR_URL } from '$env/static/public';
import { version } from '../../../../package.json';

export const GET: RequestHandler = async () => {
  // Get dashboard version from package.json
  const dashboardVersion = version;

  // Try to get validator version
  let validatorVersion = 'unknown';
  let validatorStatus = 'unknown';

  try {
    const validatorUrl = PUBLIC_VALIDATOR_URL || 'http://localhost:8000';
    const response = await fetch(`${validatorUrl}/version`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      validatorVersion = data.version || 'unknown';
      validatorStatus = 'online';
    } else {
      validatorStatus = 'error';
    }
  } catch (error) {
    validatorStatus = 'offline';
  }

  return json({
    dashboard: {
      name: 'FAIVOR Dashboard',
      version: dashboardVersion
    },
    validator: {
      name: 'FAIVOR ML Validator',
      version: validatorVersion,
      status: validatorStatus
    }
  });
};
