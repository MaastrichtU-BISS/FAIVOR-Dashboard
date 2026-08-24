import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';

export const POST: RequestHandler = async ({ params }) => {
  try {
    // Get the existing validation
    const existingValidation = await sql`
      SELECT *
      FROM validations
      WHERE val_id = ${params.id}
    `;

    if (existingValidation.length === 0) {
      return json({ error: 'Validation not found' }, { status: 404 });
    }

    // Create a new validation record with the same data but reset status
    const result = await sql`
      INSERT INTO validations (
        fair_model_id,
        model_checkpoint_id,
        validation_status,
        start_datetime,
        data
      )
      SELECT
        fair_model_id,
        model_checkpoint_id,
        'pending' as validation_status,
        ${new Date().toISOString()} as start_datetime,
        data
      FROM validations
      WHERE val_id = ${params.id}
      RETURNING *
    `;

    return json({
      success: true,
      validation: result[0]
    });
  } catch (error) {
    console.error('Error resubmitting validation:', error);
    return json({ error: 'Failed to resubmit validation' }, { status: 500 });
  }
};
