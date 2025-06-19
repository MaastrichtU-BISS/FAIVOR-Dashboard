import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModelImportService } from '$lib/services/model-import-service'; // Import the service
import { sql } from '$lib/db';
import type { FullJsonLdModel } from '$lib/stores/models/types';

export const GET: RequestHandler = async ({ params }) => {
  const checkpointId = params.id;

  try {
    // Get the fair_model_url from the database using the checkpoint_id
    const modelUrlRows: { fair_model_url: string }[] = await sql`
      SELECT fair_model_url FROM model_checkpoints
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
    const fullModelData: FullJsonLdModel = await ModelImportService.fetchModelData(fairModelUrl);

    // Add checkpoint_id to the returned model data as the frontend might still use it
    // and it's not part of the standard JSON-LD from fairmodels.org
    const modelWithCheckpointId = {
      ...fullModelData,
      checkpoint_id: checkpointId
      // fair_model_id is usually part of the @id, but can be added if needed explicitly
      // fair_model_id: ModelImportService.extractFairModelId(fullModelData['@id'] || fairModelUrl)
    };

    // The frontend's +page.svelte now expects the FullJsonLdModel structure directly.
    // The 'Evaluation results1' array within fullModelData will be used for validations.
    // Fetch local validation data to merge dataset_info.
    const localValidationsRows: { val_id: string; data: import('$lib/types/validation').ValidationData, fair_eval_id: string | null }[] = await sql`
      SELECT val_id, data, data->>'fair_eval_id' AS fair_eval_id FROM validations
      WHERE model_checkpoint_id = ${checkpointId} AND deleted_at IS NULL
    `;

    const localValidationsMap = new Map<string, import('$lib/types/validation').ValidationData>();
    for (const row of localValidationsRows) {
      if (row.fair_eval_id) { // Assuming fair_eval_id stores the @id of JsonLdEvaluationResultItem
        localValidationsMap.set(row.fair_eval_id, row.data);
      }
      // Fallback or alternative mapping if fair_eval_id is not reliable:
      // Could map by index or another property if available and consistent.
    }

    if (fullModelData['Evaluation results1'] && Array.isArray(fullModelData['Evaluation results1'])) {
      fullModelData['Evaluation results1'] = fullModelData['Evaluation results1'].map(evalItem => {
        const evalItemId = evalItem['@id'];
        if (evalItemId && localValidationsMap.has(evalItemId)) {
          const localData = localValidationsMap.get(evalItemId);
          return {
            ...evalItem,
            // Attach dataset_info from the local database record
            dataset_info: localData?.dataset_info
          };
        }
        // If no local match, return the item as is, or with default/empty dataset_info
        return {
          ...evalItem,
          dataset_info: undefined // Or some default structure if needed by frontend
        };
      });
    }

    // Ensure the evaluation list is empty on screen for the model display
    modelWithCheckpointId['Evaluation results1'] = [];

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
