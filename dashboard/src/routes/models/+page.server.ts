import type { ServerLoad } from '@sveltejs/kit';
import { pool } from '$lib/db';
import type { Model } from '$lib/stores/models/types';

export const load = (async () => {
  try {
    const result = await pool.query(`
      SELECT
        m.*,
        COUNT(v.val_id) as validation_count,
        MAX(v.start_datetime) as latest_validation_date,
        (
          SELECT validation_status
          FROM validations
          WHERE model_checkpoint_id = m.checkpoint_id
          AND deleted_at IS NULL
          ORDER BY start_datetime DESC
          LIMIT 1
        ) as latest_validation_status
      FROM model_checkpoints m
      LEFT JOIN validations v ON m.checkpoint_id = v.model_checkpoint_id AND v.deleted_at IS NULL
      GROUP BY m.checkpoint_id
    `);

    const models: Model[] = result.rows.map((row: any) => {
      // Parse metadata if it's a string
      const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;

      return {
        checkpoint_id: row.checkpoint_id,
        fair_model_id: row.fair_model_id,
        fair_model_url: row.fair_model_url,
        title: metadata?.title || '',
        metadata: metadata,
        description: row.description,
        created_at: row.created_at,
        updated_at: row.updated_at,
        validations: {
          count: parseInt(row.validation_count),
          latest: row.latest_validation_date ? {
            status: row.latest_validation_status,
            date: row.latest_validation_date
          } : undefined
        }
      };
    });

    return {
      models
    };
  } catch (error) {
    console.error('Error loading models:', error);
    return {
      models: []
    };
  }
}) satisfies ServerLoad;
