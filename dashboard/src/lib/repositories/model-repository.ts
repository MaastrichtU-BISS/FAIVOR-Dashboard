import { sql } from '$lib/db/index';
import type { Model, DBModelRow, ModelMetadata } from '$lib/stores/models/types';

export interface CreateModelData {
  checkpointId: string;
  fairModelId: string;
  fairModelUrl: string;
  metadata: ModelMetadata;
  description: string;
}

export class ModelRepository {
  /**
   * Create a new model in the database
   */
  static async create(data: CreateModelData): Promise<Model> {
    const [result] = await sql`
      INSERT INTO model_checkpoints (
        checkpoint_id,
        fair_model_id,
        fair_model_url,
        metadata,
        description
      ) VALUES (${data.checkpointId}, ${data.fairModelId}, ${data.fairModelUrl}, ${JSON.stringify(data.metadata)}, ${data.description})
      ON CONFLICT (checkpoint_id)
      DO UPDATE SET
        fair_model_id = EXCLUDED.fair_model_id,
        fair_model_url = EXCLUDED.fair_model_url,
        metadata = EXCLUDED.metadata,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    if (!result) {
      throw new Error('Failed to create model');
    }

    return {
      checkpoint_id: result.checkpoint_id,
      fair_model_id: result.fair_model_id,
      fair_model_url: result.fair_model_url,
      title: result.metadata?.title || '',
      metadata: result.metadata,
      description: result.description,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  }

  /**
   * Check if a model exists by checkpoint ID
   */
  static async existsByCheckpointId(checkpointId: string): Promise<boolean> {
    const result = await sql`
      SELECT 1 FROM model_checkpoints
      WHERE checkpoint_id = ${checkpointId}
    `;
    return result.length > 0;
  }

  /**
   * Check if a model exists by FAIR model URL
   */
  static async existsByUrl(url: string): Promise<boolean> {
    const result = await sql`
      SELECT 1 FROM model_checkpoints
      WHERE fair_model_url = ${url}
    `;
    return result.length > 0;
  }

  /**
   * Get a model by checkpoint ID
   */
  static async getByCheckpointId(checkpointId: string): Promise<Model | null> {
    const result = await sql`
      SELECT * FROM model_checkpoints
      WHERE checkpoint_id = ${checkpointId}
    `;

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      checkpoint_id: row.checkpoint_id,
      fair_model_id: row.fair_model_id,
      fair_model_url: row.fair_model_url,
      title: row.metadata?.title || '',
      metadata: row.metadata,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Get all models with validation counts
   */
  static async getAllWithValidations(): Promise<Model[]> {
    const result = await sql`
      SELECT
        mc.*,
        COALESCE(v.validation_count, 0) as validation_count,
        v.latest_validation_date,
        v.latest_validation_status
      FROM model_checkpoints mc
      LEFT JOIN (
        SELECT
          model_checkpoint_id,
          COUNT(*) as validation_count,
          MAX(start_datetime) as latest_validation_date,
          (ARRAY_AGG(validation_status ORDER BY start_datetime DESC))[1] as latest_validation_status
        FROM validations
        WHERE deleted_at IS NULL
        GROUP BY model_checkpoint_id
      ) v ON mc.checkpoint_id = v.model_checkpoint_id
      ORDER BY mc.created_at DESC
    `;

    return result.map((row: any) => {
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
          count: parseInt(row.validation_count) || 0,
          latest: row.latest_validation_date ? {
            status: row.latest_validation_status,
            date: row.latest_validation_date
          } : undefined
        }
      };
    });
  }

  /**
   * Search models by text
   */
  static async search(query: string): Promise<Model[]> {
    const searchPattern = `%${query}%`;
    const result = await sql`
      SELECT * FROM model_checkpoints
      WHERE
        fair_model_id ILIKE ${searchPattern} OR
        description ILIKE ${searchPattern} OR
        metadata::text ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN fair_model_id ILIKE ${searchPattern} THEN 1
          WHEN description ILIKE ${searchPattern} THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 50
    `;

    return result.map((row: any) => {
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
        updated_at: row.updated_at
      };
    });
  }

  /**
   * Delete a model by checkpoint ID
   * This will also delete all associated validations
   */
  static async delete(checkpointId: string): Promise<boolean> {
    try {
      // Use a transaction to delete validations first, then the model
      await sql.begin(async (sql) => {
        // First, delete all validations associated with this model
        await sql`
          DELETE FROM validations
          WHERE model_checkpoint_id = ${checkpointId}
        `;

        // Then delete the model itself
        await sql`
          DELETE FROM model_checkpoints
          WHERE checkpoint_id = ${checkpointId}
        `;
      });

      return true;
    } catch (error) {
      console.error('Error deleting model:', error);
      return false;
    }
  }
}
