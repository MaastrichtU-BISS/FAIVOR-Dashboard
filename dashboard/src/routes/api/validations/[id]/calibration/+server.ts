import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { calibration } = await request.json();
    if (!calibration || typeof calibration !== 'object') {
      return json({ error: 'calibration is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE validations
      SET data = jsonb_set(
        jsonb_set(COALESCE(data, '{}'), '{validation_result}', COALESCE(data->'validation_result', '{}')),
        '{validation_result,calibration}',
        ${sql.json(calibration)}
      )
      WHERE val_id = ${params.id}
      AND user_id = ${session.user.id}
      AND deleted_at IS NULL
      RETURNING val_id
    `;

    if (result.length === 0) {
      return json({ error: 'Validation not found' }, { status: 404 });
    }
    return json({ success: true });
  } catch (error) {
    console.error('Error saving calibration:', error);
    return json({ error: 'Failed to save calibration' }, { status: 500 });
  }
};
