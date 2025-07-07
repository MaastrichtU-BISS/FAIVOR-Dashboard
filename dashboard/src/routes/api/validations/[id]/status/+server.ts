import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { id } = params;
    const { status, error } = await request.json();

    console.log(`Updating validation ${id} status to:`, status);

    // Update validation status
    let result;
    if (status === 'completed') {
      result = await sql`
        UPDATE validations
        SET 
          validation_status = ${status},
          data = jsonb_set(
            COALESCE(data, '{}'),
            '{validation_error}',
            ${error ? sql.json(error) : 'null'}
          ),
          end_datetime = ${new Date().toISOString()}
        WHERE val_id = ${id}
        AND user_id = ${session.user.id}
        RETURNING *
      `;
    } else {
      result = await sql`
        UPDATE validations
        SET 
          validation_status = ${status},
          data = jsonb_set(
            COALESCE(data, '{}'),
            '{validation_error}',
            ${error ? sql.json(error) : 'null'}
          )
        WHERE val_id = ${id}
        AND user_id = ${session.user.id}
        RETURNING *
      `;
    }

    if (result.length === 0) {
      return json({ error: 'Validation not found' }, { status: 404 });
    }

    return json({ 
      success: true, 
      validation: result[0] 
    });
  } catch (error) {
    console.error('Error updating validation status:', error);
    return json({ error: 'Failed to update validation status' }, { status: 500 });
  }
};