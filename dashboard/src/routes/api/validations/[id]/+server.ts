import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import type { ValidationFormData } from '$lib/types/validation';
import { formDataToValidationData, mergeValidationData } from '$lib/utils/validation-transform';

export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const formData: ValidationFormData = await request.json();

    // Get existing validation to merge with updates
    const existing = await sql`
      SELECT data FROM validations
      WHERE val_id = ${params.id}
    `;

    if (existing.length === 0) {
      return json({ error: 'Validation not found' }, { status: 404 });
    }

    // Transform form data and merge with existing data
    const newValidationData = formDataToValidationData(formData);
    const mergedData = mergeValidationData(existing[0].data || {}, newValidationData);

    // Update validation with consolidated data structure
    const result = await sql`
      UPDATE validations
      SET
        data = ${sql.json(mergedData as any)},
        updated_at = CURRENT_TIMESTAMP
      WHERE val_id = ${params.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return json({ error: 'Validation not found' }, { status: 404 });
    }

    return json({
      success: true,
      validation: result[0]
    });
  } catch (error) {
    console.error('Error updating validation:', error);
    return json({ error: 'Failed to update validation' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    // Extract numeric ID from either format: "4" or "local-eval-4"
    let validationId = params.id;
    if (validationId.startsWith('local-eval-')) {
      validationId = validationId.replace('local-eval-', '');
    }
    
    // Ensure it's a valid number
    const numericId = parseInt(validationId, 10);
    if (isNaN(numericId)) {
      return json({ error: 'Invalid validation ID format' }, { status: 400 });
    }

    const result = await sql`
      UPDATE validations
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE val_id = ${numericId}
      RETURNING *
    `;

    if (result.length === 0) {
      return json({ error: 'Validation not found' }, { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error soft-deleting validation:', error);
    return json({ error: 'Failed to soft-delete validation' }, { status: 500 });
  }
};
