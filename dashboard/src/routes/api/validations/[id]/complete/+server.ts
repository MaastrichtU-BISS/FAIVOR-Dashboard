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
    const { status, metrics } = await request.json();

    console.log(`Completing validation ${id} with metrics:`, metrics);

    // Update validation with metrics and completed status
    // Store metrics in the format expected by the backend transformation
    const result = await sql`
      UPDATE validations
      SET 
        validation_status = ${status || 'completed'},
        end_datetime = ${new Date().toISOString()},
        data = jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(data, '{}'),
              '{validation_result}',
              ${sql.json({
                comprehensive_metrics: metrics,
                completed_at: new Date().toISOString(),
                validation_results: {
                  modelValidation: {
                    details: {
                      metrics: metrics.metrics || {}
                    }
                  }
                }
              })}
            ),
            '{metrics}',
            ${sql.json(metrics)}
          ),
          '{dataset_info,hasData}',
          'true'
        )
      WHERE val_id = ${id}
      AND user_id = ${session.user.id}
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
    console.error('Error completing validation:', error);
    return json({ error: 'Failed to complete validation' }, { status: 500 });
  }
};