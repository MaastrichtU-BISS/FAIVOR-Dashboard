// src/routes/api/validations/folder/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import type { ValidationFormData } from '$lib/types/validation';
import { formDataToValidationData } from '$lib/utils/validation-transform';
import { FolderValidationService } from '$lib/services/folder-validation-service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();

    // Extract form fields
    const validationName = formData.get('validationName') as string;
    const userName = formData.get('userName') as string;
    const date = formData.get('date') as string;
    const datasetName = formData.get('datasetName') as string;
    const folderName = formData.get('folderName') as string;
    const datasetDescription = formData.get('datasetDescription') as string;
    const datasetCharacteristics = formData.get('datasetCharacteristics') as string;
    const metricsDescription = formData.get('metricsDescription') as string;
    const performanceMetrics = formData.get('performanceMetrics') as string;
    const modelId = formData.get('modelId') as string;

    // Extract files
    const metadataFile = formData.get('metadataFile') as File | null;
    const dataFile = formData.get('dataFile') as File | null;
    const columnMetadataFile = formData.get('columnMetadataFile') as File | null;

    console.log('🔍 Raw files extracted from FormData:', {
      metadataFile: metadataFile ? {
        name: metadataFile.name,
        size: metadataFile.size,
        type: metadataFile.type,
        lastModified: metadataFile.lastModified
      } : null,
      dataFile: dataFile ? {
        name: dataFile.name,
        size: dataFile.size,
        type: dataFile.type,
        lastModified: dataFile.lastModified
      } : null,
      columnMetadataFile: columnMetadataFile ? {
        name: columnMetadataFile.name,
        size: columnMetadataFile.size,
        type: columnMetadataFile.type,
        lastModified: columnMetadataFile.lastModified
      } : null
    });

    console.log('Creating folder-based validation with data:', {
      validationName,
      folderName,
      modelId,
      hasMetadata: !!metadataFile,
      hasData: !!dataFile,
      hasColumnMetadata: !!columnMetadataFile
    });

    if (!modelId) {
      return json({ error: 'Model ID is required' }, { status: 400 });
    }

    // Validate required files
    if (!metadataFile) {
      return json({ error: 'metadata.json file is required' }, { status: 400 });
    }

    if (!dataFile) {
      return json({ error: 'data.csv file is required' }, { status: 400 });
    }

    // Get the model first to ensure it exists
    const model = await sql`
      SELECT * FROM model_checkpoints
      WHERE checkpoint_id = ${modelId}
    `;

    if (model.length === 0) {
      return json({ error: 'Model not found' }, { status: 404 });
    }

    // Parse metadata file
    let parsedMetadata;
    try {
      const metadataText = await metadataFile.text();
      parsedMetadata = JSON.parse(metadataText);
    } catch (error) {
      return json({ error: 'Invalid metadata.json format' }, { status: 400 });
    }

    // Parse column metadata file if provided
    let parsedColumnMetadata;
    if (columnMetadataFile) {
      try {
        const columnMetadataText = await columnMetadataFile.text();
        parsedColumnMetadata = JSON.parse(columnMetadataText);
      } catch (error) {
        return json({ error: 'Invalid column_metadata.json format' }, { status: 400 });
      }
    }

    // Create form data structure for folder upload
    const validationFormData: ValidationFormData = {
      validationName: validationName || `Folder Validation ${new Date().toLocaleDateString()}`,
      userName,
      date,
      datasetName: datasetName || folderName,
      uploadedFile: null, // No single file for folder uploads
      folderName,
      uploadedFolder: {
        metadata: metadataFile,
        data: dataFile,
        columnMetadata: columnMetadataFile || undefined
      },
      datasetDescription,
      datasetCharacteristics,
      metricsDescription,
      performanceMetrics,
      modelId
    };

    // Debug: Log file properties
    console.log('File properties debug:', {
      metadataFile: {
        name: metadataFile?.name,
        size: metadataFile?.size,
        lastModified: metadataFile?.lastModified,
        type: metadataFile?.type
      },
      dataFile: {
        name: dataFile?.name,
        size: dataFile?.size,
        lastModified: dataFile?.lastModified,
        type: dataFile?.type
      },
      columnMetadataFile: columnMetadataFile ? {
        name: columnMetadataFile.name,
        size: columnMetadataFile.size,
        lastModified: columnMetadataFile.lastModified,
        type: columnMetadataFile.type
      } : null
    });

    // Transform form data to validation data structure
    const validationData = formDataToValidationData(validationFormData);

    // Explicitly inject file details to ensure they're saved properly
    if (validationData.dataset_info?.folderUpload) {
      validationData.dataset_info.folderUpload.fileDetails = {
        metadata: metadataFile ? {
          name: metadataFile.name,
          size: metadataFile.size,
          lastModified: metadataFile.lastModified
        } : undefined,
        data: dataFile ? {
          name: dataFile.name,
          size: dataFile.size,
          lastModified: dataFile.lastModified
        } : undefined,
        columnMetadata: columnMetadataFile ? {
          name: columnMetadataFile.name,
          size: columnMetadataFile.size,
          lastModified: columnMetadataFile.lastModified
        } : undefined
      };
    }

    console.log('🔒 Final file details before DB save:', validationData.dataset_info?.folderUpload?.fileDetails);
    console.log('🔒 Complete validation data before DB save:', JSON.stringify(validationData, null, 2));

    // Add parsed metadata to the validation data
    validationData.metadata = {
      ...validationData.metadata,
      parsedMetadata,
      parsedColumnMetadata,
      folderStructure: {
        hasMetadata: true,
        hasData: true,
        hasColumnMetadata: !!columnMetadataFile,
        fileNames: {
          metadata: metadataFile.name,
          data: dataFile.name,
          columnMetadata: columnMetadataFile?.name
        },
        fileSizes: {
          metadata: metadataFile.size,
          data: dataFile.size,
          columnMetadata: columnMetadataFile?.size
        }
      }
    };

    const startTime = new Date().toISOString();

    // Create new validation record
    const result = await sql`
      INSERT INTO validations (
        fair_model_id,
        model_checkpoint_id,
        validation_status,
        start_datetime,
        data
      ) VALUES (
        ${model[0].fair_model_id},
        ${modelId},
        ${'pending'},
        ${startTime},
        ${sql.json(validationData as any)}
      )
      RETURNING val_id, validation_status, start_datetime
    `;

    console.log('Created folder validation:', result[0]);

    // Perform actual FAIVOR backend validation using the service layer
    try {
      console.log('Starting FAIVOR backend validation...');

      // Use the service to perform validation
      const validationResults = await FolderValidationService.performValidation(
        metadataFile,
        dataFile,
        columnMetadataFile || undefined
      );

      console.log('FAIVOR validation completed:', {
        csvValid: validationResults.csvValidation.valid,
        modelName: validationResults.modelValidation.model_name,
        metricsCount: Object.keys(validationResults.modelValidation.metrics).length
      });

      // Update validation record with completed results
      await sql`
        UPDATE validations
        SET
          validation_status = 'completed',
          end_datetime = ${new Date().toISOString()},
          data = data || ${sql.json({
        validation_result: validationResults.transformedResults
      } as any)}
        WHERE val_id = ${result[0].val_id}
      `;

      console.log('Folder validation completed successfully');

      return json({
        success: true,
        validation: {
          ...result[0],
          validation_status: 'completed',
          validation_result: validationResults.transformedResults
        },
        message: 'Folder validation completed successfully'
      });

    } catch (validationError: any) {
      console.error('FAIVOR validation failed:', validationError);

      // Update validation record with failed status
      await sql`
        UPDATE validations
        SET
          validation_status = 'failed',
          end_datetime = ${new Date().toISOString()},
          data = data || ${sql.json({
        error: validationError?.message || validationError?.toString() || 'FAIVOR validation failed',
        validation_result: null
      } as any)}
        WHERE val_id = ${result[0].val_id}
      `;

      return json({
        success: false,
        validation: {
          ...result[0],
          validation_status: 'failed'
        },
        error: `Validation failed: ${validationError?.message || validationError?.toString() || 'Unknown error'}`,
        message: 'Folder validation failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating folder validation:', error);
    return json(
      { error: 'Failed to create folder validation' },
      { status: 500 }
    );
  }
};
