import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';

export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const data = await request.json();

    const result = await sql`
      UPDATE validations
      SET
        description = ${data.datasetDescription},
        validation_dataset = ${data.uploadedFile?.name || ''},
        dataset_info = ${JSON.stringify({
      userName: data.userName,
      date: data.date,
      datasetName: data.datasetName,
      description: data.datasetDescription,
      characteristics: data.datasetCharacteristics || ''
    })},
        validation_result = ${JSON.stringify({
      metrics: data.metricsDescription,
      performance: data.performanceMetrics
    })}
      WHERE val_id = ${params.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return json({ error: 'Validation not found' }, { status: 404 });
    }

    return json(result[0]);
  } catch (error) {
    console.error('Error updating validation:', error);
    return json({ error: 'Failed to update validation' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const result = await sql`
      UPDATE validations
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE val_id = ${params.id}
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
