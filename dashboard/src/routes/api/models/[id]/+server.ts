import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModelImportService } from '$lib/services/model-import-service'; // Import the service
import { sql } from '$lib/db';
import type { FullJsonLdModel, JsonLdEvaluationResultItem, JsonLdPerformanceMetricItem, JsonLdDatasetCharacteristicItem } from '$lib/stores/models/types';
import type { ValidationData } from '$lib/types/validation';

export const GET: RequestHandler = async ({ params }) => {
  const checkpointId = params.id;

  try {
    // Get the fair_model_url from the database using the checkpoint_id
    const modelUrlRows: { fair_model_url: string; metadata: any; description: string | null }[] = await sql`
      SELECT fair_model_url, metadata, description FROM model_checkpoints
      WHERE checkpoint_id = ${checkpointId}
    `;

    if (modelUrlRows.length === 0) {
      return json({ success: false, error: 'Model not found in database' }, { status: 404 });
    }

    const fairModelUrl = modelUrlRows[0].fair_model_url;

    if (!fairModelUrl) {
      return json({ success: false, error: 'FAIR model URL not found for this checkpoint' }, { status: 404 });
    }

    // Fetch the full JSON-LD model data from the FAIR model URL
    // Falls back to the locally cached copy (or stored metadata) when the remote source is unreachable
    const stored = modelUrlRows[0].metadata || {};
    let fullModelData: FullJsonLdModel;
    try {
      fullModelData = await ModelImportService.fetchModelData(fairModelUrl);
      try {
        await sql`
          UPDATE model_checkpoints
          SET metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json({ jsonLd: fullModelData } as any)}
          WHERE checkpoint_id = ${checkpointId}
        `;
      } catch (cacheError) {
        console.warn('Could not cache model JSON-LD:', cacheError);
      }
    } catch (fetchError) {
      console.warn(`Remote fetch failed for ${fairModelUrl}, using local data:`, fetchError);
      if (stored.jsonLd) {
        fullModelData = stored.jsonLd as FullJsonLdModel;
      } else {
        fullModelData = {
          '@id': fairModelUrl,
          'General Model Information': {
            Title: { '@value': stored.title || fairModelUrl },
            Description: { '@value': modelUrlRows[0].description || '' }
          }
        } as unknown as FullJsonLdModel;
      }
    }

    // Add checkpoint_id to the returned model data as the frontend might still use it
    // and it's not part of the standard JSON-LD from fairmodels.org
    const modelWithCheckpointId = {
      ...fullModelData,
      checkpoint_id: checkpointId
      // fair_model_id is usually part of the @id, but can be added if needed explicitly
      // fair_model_id: ModelImportService.extractFairModelId(fullModelData['@id'] || fairModelUrl)
    };

    // Fetch local validation data which will be the primary source for 'Evaluation results1'
    const localValidationsRows: {
      val_id: number;
      start_datetime: string;
      validation_status: string;
      data: ValidationData;
      fair_eval_id: string | null;
    }[] = await sql`
      SELECT val_id, start_datetime, validation_status, data, data->>'fair_eval_id' AS fair_eval_id
      FROM validations
      WHERE model_checkpoint_id = ${checkpointId} AND deleted_at IS NULL
      ORDER BY start_datetime DESC
    `;

    const transformedEvaluations: JsonLdEvaluationResultItem[] = localValidationsRows.map(row => {
      const validationData = row.data || {};
      const metricsData = validationData?.validation_result?.validation_results?.modelValidation?.details?.metrics;
      const performanceMetrics: JsonLdPerformanceMetricItem[] = [];

      if (metricsData) {
        for (const key in metricsData) {
          performanceMetrics.push({
            'Metric Label': { 'rdfs:label': key },
            'Measured metric (mean value)': {
              '@type': 'xsd:decimal',
              '@value': String(metricsData[key])
            }
          });
        }
      }

      // Dataset characteristics: Check if we have dataset_info to populate this
      const datasetCharacteristics: JsonLdDatasetCharacteristicItem[] = [];

      // If we have dataset_info, create basic dataset characteristics
      if (validationData?.dataset_info) {
        datasetCharacteristics.push({
          'The number of subject for evaluation': { '@value': '1' },
          Volume: { '@value': validationData.dataset_info?.folderUpload?.totalSize?.toString() || '0' }
        });
      }

      return {
        '@id': row.fair_eval_id || `local-eval-${String(row.val_id)}`,
        '@type': 'Evaluation result',
        'User Note': { '@value': validationData?.validation_name || `Validation ${row.val_id}` },
        'pav:createdOn': row.start_datetime,
        'Performance metric': performanceMetrics,
        'Dataset characteristics': datasetCharacteristics,
        'user/hospital': { '@value': validationData?.dataset_info?.userName || '' },
        dataset_info: validationData?.dataset_info,
        validation_status: row.validation_status,
        data: validationData,
        model_metadata: validationData?.model_metadata,
      } as JsonLdEvaluationResultItem;
    });

    modelWithCheckpointId['Evaluation results1'] = transformedEvaluations;

    return json({
      success: true,
      model: modelWithCheckpointId
    });

  } catch (e: any) {
    console.error('Error loading model by API:', e);
    const errorMessage = e instanceof Error ? e.message : 'Failed to load model';
    // Check if the error is from fetchModelData (e.g., 404 from fairmodels.org)
    if (errorMessage.includes('Failed to fetch model data')) {
      return json({ success: false, error: `Failed to fetch model from FAIRModels.org: ${errorMessage}` }, { status: 502 }); // Bad Gateway
    }
    return json({ success: false, error: errorMessage }, { status: 500 });
  }
};
