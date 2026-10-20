// src/routes/api/calibration/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FaivorBackendAPI } from '$lib/api/faivor-backend';
import { ValidationError, ValidationErrorCode, type StructuredValidationError } from '$lib/types/validation-errors';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'User not authenticated' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const modelMetadataRaw = formData.get('model_metadata');
    const csvFile = formData.get('csv_file') as File | null;
    const columnMetadataRaw = formData.get('column_metadata');

    if (typeof modelMetadataRaw !== 'string' || !modelMetadataRaw) {
      return json({ error: 'model_metadata is required' }, { status: 400 });
    }
    if (!csvFile || typeof csvFile === 'string') {
      return json({ error: 'csv_file is required' }, { status: 400 });
    }

    let modelMetadata: any;
    let columnMetadata: Record<string, any> | null = null;
    try {
      modelMetadata = JSON.parse(modelMetadataRaw);
    } catch {
      return json({ error: 'Invalid model_metadata JSON' }, { status: 400 });
    }
    if (typeof columnMetadataRaw === 'string' && columnMetadataRaw) {
      try {
        columnMetadata = JSON.parse(columnMetadataRaw);
      } catch {
        return json({ error: 'Invalid column_metadata JSON' }, { status: 400 });
      }
    }

    const result = await FaivorBackendAPI.calibrateModel(modelMetadata, csvFile, columnMetadata);
    return json({ success: true, calibration: result });
  } catch (error: any) {
    console.error('Calibration failed:', error);

    let structuredError: StructuredValidationError;
    let httpStatus = 500;

    if (error instanceof ValidationError) {
      structuredError = error.toJSON();
      httpStatus = error.httpStatus;
    } else {
      structuredError = {
        timestamp: new Date().toISOString(),
        errorType: 'validation',
        errors: [{
          code: ValidationErrorCode.UNKNOWN_ERROR,
          message: error?.message || error?.toString() || 'Unknown calibration error',
          technicalDetails: error?.stack || undefined
        }]
      };
    }

    return json({ success: false, error: structuredError }, { status: httpStatus });
  }
};
