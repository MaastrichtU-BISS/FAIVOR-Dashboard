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

    const requestData = await request.json();
    const startTime = new Date().toISOString();

    console.log('Creating validation with data:', requestData);

    // Handle both old ValidationFormData format and new ValidationData format
    let validationData;
    let modelId: string;

    if (requestData.validation_name || requestData.dataset_info || requestData.validation_result) {
      // This is already a ValidationData object
      validationData = requestData;
      // Extract modelId from the request data or use a fallback
      modelId = (requestData as any).modelId || (requestData as any).model_checkpoint_id;
      console.log('Received ValidationData format');
    } else {
      // This is ValidationFormData, transform it
      const formData: ValidationFormData = requestData;
      console.log('ValidationName from form:', formData.validationName);
      modelId = formData.modelId || '';
      const { formDataToValidationData } = await import('$lib/utils/validation-transform');
      validationData = formDataToValidationData(formData);
      console.log('Transformed ValidationFormData to ValidationData');
    }

    if (!modelId) {
      console.error('Model ID is required');
      return json({ error: 'Model ID is required' }, { status: 400 });
    }

    // Get the model first to ensure it exists
    const model = await sql`
      SELECT * FROM model_checkpoints
      WHERE checkpoint_id = ${modelId}
    `;

    if (model.length === 0) {
      console.error('Model not found:', modelId);
      return json({ error: 'Model not found' }, { status: 404 });
    }

    console.log('Found model:', model[0]);
    console.log('Final validation data:', validationData);

    // Log file sizes to verify they're preserved
    if (validationData.dataset_info?.folderUpload?.fileDetails) {
      console.log('📊 File sizes being stored in database:', {
        metadata: validationData.dataset_info.folderUpload.fileDetails.metadata?.size,
        data: validationData.dataset_info.folderUpload.fileDetails.data?.size,
        columnMetadata: validationData.dataset_info.folderUpload.fileDetails.columnMetadata?.size,
        totalSize: validationData.dataset_info.folderUpload.totalSize
      });
    }

    // Log column pairing data to verify it's being saved
    if (validationData.dataset_info?.columnPairing) {
      console.log('📊 Column pairing data being stored in database:', {
        csv_columns: validationData.dataset_info.columnPairing.csv_columns?.length || 0,
        model_columns: validationData.dataset_info.columnPairing.model_input_columns?.length || 0,
        has_mapping: Boolean(validationData.dataset_info.columnPairing.column_mapping),
        mock_columns: validationData.dataset_info.columnPairing.mock_columns_added?.length || 0
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
        ${modelId},
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

    // Verify column pairing data in saved result
    if (result[0].data?.dataset_info?.columnPairing) {
      console.log('✅ Verified column pairing data in saved validation:', {
        csv_columns: result[0].data.dataset_info.columnPairing.csv_columns?.length || 0,
        model_columns: result[0].data.dataset_info.columnPairing.model_input_columns?.length || 0,
        has_mapping: Boolean(result[0].data.dataset_info.columnPairing.column_mapping)
      });
    }

    // Get updated validations for this model (excluding deleted ones)
    const validations = await sql`
      SELECT * FROM validations
      WHERE model_checkpoint_id = ${modelId}
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
