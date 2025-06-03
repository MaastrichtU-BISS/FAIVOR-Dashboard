import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadModels, importModel } from '$lib/stores/models/index.svelte';
import { ModelImportService } from '$lib/services/model-import-service';
import { ModelRepository } from '$lib/repositories/model-repository';

export const GET: RequestHandler = async () => {
  try {
    const models = await ModelRepository.getAllWithValidations();
    return json({ success: true, models });
  } catch (error) {
    console.error('Error in GET /api/models:', error);
    return json(
      { success: false, error: 'Failed to load models' },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { url } = data;

    if (!url) {
      return json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if model already exists by URL
    const existsByUrl = await ModelRepository.existsByUrl(url);
    if (existsByUrl) {
      return json(
        { success: false, error: 'Model with this URL already exists' },
        { status: 409 }
      );
    }

    // Import model data from FAIR models API
    const importData = await ModelImportService.importModel(url);

    // Check if model exists by checkpoint ID (in case URL changed but content is same)
    const existsByCheckpoint = await ModelRepository.existsByCheckpointId(importData.checkpointId);
    if (existsByCheckpoint) {
      return json(
        { success: false, error: 'Model with this content already exists' },
        { status: 409 }
      );
    }

    // Save to database
    const model = await ModelRepository.create({
      checkpointId: importData.checkpointId,
      fairModelId: importData.fairModelId,
      fairModelUrl: importData.fairModelUrl,
      metadata: importData.metadata,
      description: importData.description
    });

    return json({
      success: true,
      model: {
        ...model,
        title: importData.metadata.title || importData.title
      },
      message: 'Model imported successfully'
    });
  } catch (error: any) {
    console.error('Error in POST /api/models:', error);

    // Handle specific error types
    if (error.message?.includes('Failed to fetch model data')) {
      return json(
        { success: false, error: 'Unable to fetch model data from the provided URL. Please check if the URL is correct and accessible.' },
        { status: 400 }
      );
    }

    return json(
      { success: false, error: error.message || 'Failed to import model' },
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { checkpointId } = data;

    if (!checkpointId) {
      return json(
        { success: false, error: 'Checkpoint ID is required' },
        { status: 400 }
      );
    }

    // Check if model exists
    const model = await ModelRepository.getByCheckpointId(checkpointId);
    if (!model) {
      return json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    // Delete the model
    const deleted = await ModelRepository.delete(checkpointId);
    if (!deleted) {
      return json(
        { success: false, error: 'Failed to delete model' },
        { status: 500 }
      );
    }

    return json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/models:', error);
    return json(
      { success: false, error: error.message || 'Failed to delete model' },
      { status: 500 }
    );
  }
};
