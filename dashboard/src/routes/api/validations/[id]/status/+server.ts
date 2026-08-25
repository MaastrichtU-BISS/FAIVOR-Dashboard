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
    const { status, error, error_details } = await request.json();

    console.log(`Updating validation ${id} status to:`, status);
    if (error_details) {
      console.log('Error details:', {
        code: error_details.code,
        message: error_details.message,
        hasTechnicalDetails: !!error_details.technicalDetails
      });
    }

    // Build the error info object that includes both simple error and detailed error_details
    const errorInfo = error_details ? {
      message: error || error_details.message,
      code: error_details.code,
      technicalDetails: error_details.technicalDetails,
      userGuidance: error_details.userGuidance
    } : (error ? { message: error } : null);

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
            ${errorInfo ? sql.json(errorInfo) : 'null'}
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
            ${errorInfo ? sql.json(errorInfo) : 'null'}
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