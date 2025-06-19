import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import type { ValidationFormData, CreateValidationRequest } from '$lib/types/validation';
import { formDataToValidationData } from '$lib/utils/validation-transform';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      console.error('User not authenticated');
      return json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = session.user.id;

    const formData: ValidationFormData = await request.json();
    const startTime = new Date().toISOString();

    console.log('Creating validation with data:', formData);
    console.log('ValidationName from form:', formData.validationName);

    if (!formData.modelId) {
      console.error('Model ID is required');
      return json({ error: 'Model ID is required' }, { status: 400 });
    }

    // Get the model first to ensure it exists
    const model = await sql`
      SELECT * FROM model_checkpoints
      WHERE checkpoint_id = ${formData.modelId}
    `;

    if (model.length === 0) {
      console.error('Model not found:', formData.modelId);
      return json({ error: 'Model not found' }, { status: 404 });
    }

    console.log('Found model:', model[0]);

    // Transform form data to validation data structure
    const validationData = formDataToValidationData(formData);
    console.log('Transformed validation data:', validationData);

    // Log file sizes to verify they're preserved
    if (validationData.dataset_info?.folderUpload?.fileDetails) {
      console.log('📊 File sizes being stored in database:', {
        metadata: validationData.dataset_info.folderUpload.fileDetails.metadata?.size,
        data: validationData.dataset_info.folderUpload.fileDetails.data?.size,
        columnMetadata: validationData.dataset_info.folderUpload.fileDetails.columnMetadata?.size,
        totalSize: validationData.dataset_info.folderUpload.totalSize
      });
    }

    // Create new validation record with consolidated data structure
    const result = await sql`
      INSERT INTO validations (
        fair_model_id,
        model_checkpoint_id,
        user_id,
        validation_status,
        start_datetime,
        data
      ) VALUES (
        ${model[0].fair_model_id},
        ${formData.modelId},
        ${userId},
        ${'pending'},
        ${startTime},
        ${sql.json(validationData as any)}
      )
      RETURNING *
    `;

    console.log('Validation created:', result[0]);
    console.log('Validation data saved:', result[0].data);

    // Verify file sizes in saved data
    if (result[0].data?.dataset_info?.folderUpload?.fileDetails) {
      console.log('✅ Verified file sizes in saved validation:', {
        metadata: result[0].data.dataset_info.folderUpload.fileDetails.metadata?.size,
        data: result[0].data.dataset_info.folderUpload.fileDetails.data?.size,
        columnMetadata: result[0].data.dataset_info.folderUpload.fileDetails.columnMetadata?.size,
        totalSize: result[0].data.dataset_info.folderUpload.totalSize
      });
    }

    // Get updated validations for this model (excluding deleted ones)
    const validations = await sql`
      SELECT * FROM validations
      WHERE model_checkpoint_id = ${formData.modelId}
      AND deleted_at IS NULL
      ORDER BY start_datetime DESC
    `;

    console.log('Updated validations:', validations);

    return json({
      success: true,
      validation: result[0],
      validations: validations
    });
  } catch (error) {
    console.error('Error creating validation:', error);
    return json({ error: 'Failed to create validation' }, { status: 500 });
  }
};
