import { error } from '@sveltejs/kit';
import type { Model, DBModelRow, DBModelWithValidationRow, ValidationRow } from './types';

// State
let modelsList = $state<Model[]>([]);
let selectedModel = $state<Model | null>(null);

export function getModels(): Model[] {
  return modelsList;
}

export function getSelectedModel(): Model | null {
  return selectedModel;
}

// Load all models with validation info
export async function loadModels() {
  try {
    const response = await fetch('/api/models/list');
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const rows = await response.json();
    modelsList = rows.map((row: DBModelWithValidationRow) => ({
      checkpoint_id: row.checkpoint_id,
      fair_model_id: row.fair_model_id,
      fair_model_url: row.fair_model_url,
      metadata: row.metadata,
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
    }));
  } catch (e) {
    console.error('Error loading models:', e);
    throw error(500, 'Failed to load models');
  }
}

// Load specific model with validations
export async function getModel(checkpointId: string) {
  try {
    const response = await fetch(`/api/models/${checkpointId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw error(404, 'Model not found');
      }
      throw new Error('Failed to fetch model');
    }

    const data = await response.json();
    selectedModel = data;
    return selectedModel;
  } catch (e) {
    console.error('Error loading model:', e);
    throw error(500, 'Failed to load model');
  }
}

// Search models
export async function searchModels(query: string) {
  try {
    const response = await fetch(`/api/models/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search models');
    }

    const rows = await response.json();
    return rows.map((row: DBModelRow) => ({
      checkpoint_id: row.checkpoint_id,
      fair_model_id: row.fair_model_id,
      fair_model_url: row.fair_model_url,
      metadata: row.metadata,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (e) {
    console.error('Error searching models:', e);
    throw error(500, 'Failed to search models');
  }
}

// Import model
export async function importModel(url: string) {
  try {
    const response = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to import model');
    }

    const result = await response.json();

    // Refresh models list to include the new model
    await loadModels();

    return result.model;
  } catch (e) {
    console.error('Error importing model:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    throw error(500, `Failed to import model: ${errorMessage}`);
  }
}

// Load FAIRmodels repository
export async function loadFairModelsRepository() {
  try {
    const response = await fetch('/api/models/fairmodels-list');
    if (!response.ok) {
      throw new Error('Failed to fetch FAIRmodels repository');
    }

    const models = await response.json();
    return models.map((model: any) => ({
      id: model.id,
      title: model.title,
      created_at: model.created_at,
      url: model.url,
      source: model.source,
      description: `Available from ${model.source}`,
      metadata: {
        applicabilityCriteria: []
      }
    }));
  } catch (e) {
    console.error('Error loading FAIRmodels repository:', e);
    throw error(500, 'Failed to load FAIRmodels repository');
  }
}

// Check if a model is already imported by URL
export async function isModelImported(url: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/models/check-imported?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error('Failed to check if model is imported');
    }

    const data = await response.json();
    return data.imported;
  } catch (e) {
    console.error('Error checking if model is imported:', e);
    return false;
  }
}
