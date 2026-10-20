import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FaivorBackendAPI } from '$lib/api/faivor-backend';
import { ValidationError } from '$lib/types/validation-errors';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'User not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const modelMetadataRaw = formData.get('model_metadata');
    const csvFile = formData.get('csv_file');
    const columnMetadataRaw = formData.get('column_metadata');

    if (typeof modelMetadataRaw !== 'string' || !(csvFile instanceof File)) {
      return json({ error: 'model_metadata and csv_file are required' }, { status: 400 });
    }

    let modelMetadata: any;
    let columnMetadata: Record<string, any> | null = null;
    try {
      modelMetadata = JSON.parse(modelMetadataRaw);
      if (typeof columnMetadataRaw === 'string' && columnMetadataRaw) {
        columnMetadata = JSON.parse(columnMetadataRaw);
      }
    } catch {
      return json({ error: 'model_metadata and column_metadata must be valid JSON' }, { status: 400 });
    }

    const result = await FaivorBackendAPI.calibrateModel(modelMetadata, csvFile, columnMetadata);
    return json({ success: true, calibration: result });
  } catch (error) {
    console.error('Error running calibration:', error);
    if (error instanceof ValidationError) {
      return json({ error: error.details.message, details: error.details }, { status: error.httpStatus || 500 });
    }
    return json({ error: 'Failed to run calibration' }, { status: 500 });
  }
};
