// src/routes/api/validations/folder/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import type { ValidationFormData } from '$lib/types/validation';
import { formDataToValidationData } from '$lib/utils/validation-transform';
//import { FolderValidationService } from '$lib/services/folder-validation-service';
import { ValidationError, type StructuredValidationError } from '$lib/types/validation-errors';

import { env as privateEnv } from '$env/dynamic/private';

const INTERNAL_VALIDATOR_BASE = privateEnv.VALIDATOR_URL_INTERNAL || 'http://validator:8000';

async function validateCSVInternal(modelMetadata: any, csvFile: File) {
  const formData = new FormData();
  formData.append('model_metadata', JSON.stringify(modelMetadata));
  formData.append('csv_file', csvFile);
  formData.append('delimiter', ',');

  const response = await fetch(`${INTERNAL_VALIDATOR_BASE}/validate-csv/`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
 //   throw new ValidationError({
 //     code: 'VALIDATION_FAILED',
 //     message: 'CSV validation request failed',
 //     technicalDetails: `POST ${INTERNAL_VALIDATOR_BASE}/validate-csv/ -> ${response.status}: ${text}`
 //   }, response.status);
 
// retry once with semicolon delimiter for EU CSVs
    // backend may return 400 or 500 for delimiter detection failures
  if ((response.status === 400 || response.status === 500) && text.includes('Could not determine delimiter')) {
      const retryFormData = new FormData();
      retryFormData.append('model_metadata', JSON.stringify(modelMetadata));
      retryFormData.append('csv_file', csvFile);
      retryFormData.append('delimiter', ';');

      const retry = await fetch(`${INTERNAL_VALIDATOR_BASE}/validate-csv/`, {
        method: 'POST',
        body: retryFormData
      });
      if (retry.ok) return await retry.json();

      const retryText = await retry.text();
      throw new ValidationError({
        code: 'VALIDATION_FAILED',
        message: 'CSV validation request failed',
        technicalDetails: `POST ${INTERNAL_VALIDATOR_BASE}/validate-csv/ -> ${response.status}: ${text} | retry ';' -> ${retry.status}: ${retryText}`
      }, retry.status);
    }

    throw new ValidationError({
      code: 'VALIDATION_FAILED',
      message: 'CSV validation request failed',
      technicalDetails: `POST ${INTERNAL_VALIDATOR_BASE}/validate-csv/ -> ${response.status}: ${text}`
    }, response.status);

 }

  return await response.json();
}

async function validateModelInternal(
  modelMetadata: any,
  csvFile: File,
  columnMetadata: Record<string, any> | null = null
) {
//  const formData = new FormData();
//  formData.append('model_metadata', JSON.stringify(modelMetadata));
//  formData.append('csv_file', csvFile);
//  if (columnMetadata !== null && typeof columnMetadata === 'object' && Object.keys(columnMetadata).length > 0) {
//    formData.append('column_metadata', JSON.stringify(columnMetadata));
//  }

    const buildFormData = (delimiter: string) => {
     const fd = new FormData();
     fd.append('model_metadata', JSON.stringify(modelMetadata));
     fd.append('csv_file', csvFile);
     fd.append('delimiter', delimiter);
     if (
       columnMetadata !== null &&
       typeof columnMetadata === 'object' &&
       Object.keys(columnMetadata).length > 0
     ) {
       fd.append('column_metadata', JSON.stringify(columnMetadata));
     }
     return fd;
    };

  const response = await fetch(`${INTERNAL_VALIDATOR_BASE}/validate-model`, {
    method: 'POST',
    body: buildFormData(',') 
  });


  if (response.ok) return await response.json();

  const text = await response.text();
  if (
    (response.status === 400 || response.status === 500) &&
    text.includes('Could not determine delimiter')
  ) {
    const retry = await fetch(`${INTERNAL_VALIDATOR_BASE}/validate-model`, {
      method: 'POST',
      body: buildFormData(';')
    });
    if (retry.ok) return await retry.json();
    const retryText = await retry.text();
    throw new ValidationError({
      code: 'VALIDATION_FAILED',
      message: 'Model validation request failed',
      technicalDetails: `POST ${INTERNAL_VALIDATOR_BASE}/validate-model -> ${response.status}: ${text} | retry ';' -> ${retry.status}: ${retryText}`
    }, retry.status);
  }

  throw new ValidationError({
    code: 'VALIDATION_FAILED',
    message: 'Model validation request failed',
    technicalDetails: `POST ${INTERNAL_VALIDATOR_BASE}/validate-model -> ${response.status}: ${text}`
  }, response.status);
}

function isDelimiterError(error: unknown): boolean {
  if (!(error instanceof ValidationError)) return false;
  const details = (error as any)?.details;
  const technical = String(details?.technicalDetails || '');
  return technical.includes('CSV_READ_ERROR') || technical.includes('Could not determine delimiter');
}

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

    if (!dataFile) {
      return json({ error: 'CSV file is required' }, { status: 400 });
    }

    // Get the model first to ensure it exists and check for metadata
    const model = await sql`
      SELECT * FROM model_checkpoints
      WHERE checkpoint_id = ${modelId}
    `;

    if (model.length === 0) {
      return json({ error: 'Model not found' }, { status: 404 });
    }

    // Check if we have metadata from either upload or model
    const modelHasMetadata = model[0]?.metadata?.parsedMetadata ||
      model[0]?.metadata?.rawMetadata ||
      model[0]?.metadata?.fairMetadata ||
      model[0]?.metadata;

    if (!metadataFile && !modelHasMetadata) {
      return json({ error: 'metadata.json file is required (or model must have metadata configured)' }, { status: 400 });
    }

    // Parse metadata from file or use model metadata
    let parsedMetadata;
    if (metadataFile) {
      try {
        const metadataText = await metadataFile.text();
        parsedMetadata = JSON.parse(metadataText);
      } catch (error) {
        return json({ error: 'Invalid metadata.json format' }, { status: 400 });
      }
    } else if (modelHasMetadata) {
      // Use model metadata as fallback
      parsedMetadata = modelHasMetadata;
    } else {
      return json({ error: 'No metadata available from file or model' }, { status: 400 });
    }

    if (!parsedMetadata?.['General Model Information']) {
      return json(
        { error: "Model metadata is not FAIR JSON-LD (missing 'General Model Information'). Upload metadata.json." },
        { status: 400 }
      );
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
        metadata: metadataFile || undefined, // Will be undefined if using model metadata
        data: dataFile!,  // Assert non-null since we validated it above
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
      metadataFile: metadataFile ? {
        name: metadataFile.name,
        size: metadataFile.size,
        lastModified: metadataFile.lastModified,
        type: metadataFile.type
      } : null,
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
        } : modelHasMetadata ? {
          name: 'model-metadata',
          size: 0,
          lastModified: Date.now()
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
        hasMetadata: !!metadataFile || !!modelHasMetadata,
        metadataSource: metadataFile ? 'file' : 'model',
        hasData: true,
        hasColumnMetadata: !!columnMetadataFile,
        fileNames: {
          metadata: metadataFile?.name || 'model-metadata',
          data: dataFile.name,
          columnMetadata: columnMetadataFile?.name
        },
        fileSizes: {
          metadata: metadataFile?.size || 0,
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

    // Perform actual FAIVOR backend validation via server-only internal URL
    try {

      console.log('Starting FAIVOR backend validation (internal URL)...', {
        base: INTERNAL_VALIDATOR_BASE
      });

      let csvValidation: any = null;
      let csvValidationWarning: string | null = null;

      try {
        csvValidation = await validateCSVInternal(parsedMetadata, dataFile);
        if (!csvValidation?.valid) {
          throw new ValidationError({
            code: 'INVALID_CSV_FORMAT',
            message: csvValidation?.message || 'CSV validation failed',
            metadata: { csvValidation }
          }, 400);
        }
      } catch (csvError) {
        // Keep same tolerant strategy: if delimiter detection fails, continue to model validation
        if (isDelimiterError(csvError)) {
          csvValidationWarning = 'CSV delimiter could not be auto-detected in validate-csv; proceeded with model validation.';
          csvValidation = {
            valid: false,
            message: 'CSV validation could not determine delimiter',
            warning: csvValidationWarning,
            csv_columns: [],
            model_input_columns: []
          };
          console.warn('CSV delimiter detection failed; continuing to model validation.', csvError);
        } else {
          throw csvError;
        }
      }

      const modelValidation = await validateModelInternal(
        parsedMetadata,
        dataFile,
        parsedColumnMetadata ?? null
      );

      const validationResults = {
        csvValidation,
        modelValidation,
        transformedResults: {
          csv_validation: csvValidation,
          model_validation: modelValidation,
          fairness_metrics: {},
          performance_metrics: modelValidation?.metrics || {},
          bias_detection: {},
          explainability: {},
          metadata: {
            parsed_metadata: parsedMetadata,
            parsed_column_metadata: parsedColumnMetadata,
            faivor_raw_results: { csvValidation, modelValidation },
	    warnings: csvValidationWarning ? [csvValidationWarning] : []
          }
        }
      };

      console.log('FAIVOR validation completed:', {
        csvValid: validationResults.csvValidation.valid,
        modelName: validationResults.modelValidation.model_name,
        metricsCount: Object.keys(validationResults.modelValidation.metrics || {}).length
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

      // Extract structured error information
      let structuredError: StructuredValidationError;
      let httpStatus = 500;

      if (validationError instanceof ValidationError) {
        structuredError = validationError.toJSON();
        httpStatus = validationError.httpStatus;
      } else {
        // Create a generic structured error for unknown errors
        structuredError = {
          timestamp: new Date().toISOString(),
          errorType: 'validation',
          errors: [{
            code: 'UNKNOWN_ERROR',
            message: validationError?.message || validationError?.toString() || 'Unknown validation error',
            technicalDetails: validationError?.stack || undefined
          }]
        };
      }

      // Update validation record with detailed error information
      await sql`
        UPDATE validations
        SET
          validation_status = 'failed',
          end_datetime = ${new Date().toISOString()},
          data = data || ${sql.json({
        error: structuredError,
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
        error: structuredError,
        message: 'Folder validation failed'
      }, { status: httpStatus });
    }

  } catch (error) {
    console.error('Error creating folder validation:', error);
    return json(
      { error: 'Failed to create folder validation' },
      { status: 500 }
    );
  }
};
