import type { FullJsonLdModel, ModelMetadata, JsonLdValue, JsonLdIdRef } from '$lib/stores/models/types'; // Updated import
import { createHash } from 'node:crypto';

// FAIRModelResponse is now effectively FullJsonLdModel, so we can remove the old interface.
// export interface FAIRModelResponse { ... } // Removed

export class ModelImportService {
  /**
   * Fetch model data from FAIR models URL
   */
  static async fetchModelData(url: string): Promise<FullJsonLdModel> { // Return FullJsonLdModel
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json-ld'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as FullJsonLdModel; // Cast to FullJsonLdModel
  }

  /**
   * Generate a checkpoint ID from the model URL
   */
  static generateCheckpointId(url: string): string {
    return createHash('sha256').update(url).digest('hex');
  }

  /**
   * Extract FAIR model ID from URL
   */
  static extractFairModelId(url: string): string {
    const match = url.match(/\/instance\/([a-f0-9-]+)$/i); // Added 'i' for case-insensitivity
    return match ? match[1] : url;
  }

  /**
   * Transform FullJsonLdModel to internal ModelMetadata format
   */
  static transformToMetadata(data: FullJsonLdModel): ModelMetadata {
    const generalInfo = data["General Model Information"];
    const fairSpecific: ModelMetadata['fairSpecific'] = { // Initialize fairSpecific
      outcome: data.Outcome?.["rdfs:label"] || data["Outcome label"]?.["@value"] || '',
      inputs: data["Input data1"]?.map(input => input["Input label"]?.["@value"] || 'Unnamed Input') || [],
      algorithm: data["Foundational model or algorithm used"]?.["rdfs:label"] || data["Foundational model or algorithm used"]?.["@id"] || '',
      outOfScopeUseCases: data["Out-of-scope use cases"]?.map(item => item["@value"] || '') || [],
      humanLifeImpact: data["Human life"]?.map(item => item["@value"] || '') || [],
      mitigations: data.Mitigations?.map(item => item["@value"] || '') || [],
      risksAndHarms: data["Risks and harms"]?.map(item => item["@value"] || '') || [],
      dockerImage: generalInfo?.["FAIRmodels image name"]?.["@value"] || '',
      softwareLicense: generalInfo?.["Software License"]?.["rdfs:label"] || generalInfo?.["Software License"]?.["@id"] || '',
      createdBy: generalInfo?.["Created by"]?.["@value"] || '',
      creationDate: generalInfo?.["Creation date"]?.["@value"] || data["pav:createdOn"] || '',
      contactEmail: generalInfo?.["Contact email"]?.["@value"] || '',
      lastUpdated: data["pav:lastUpdatedOn"] || '',
      basedOn: data["schema:isBasedOn"] || ''
    };

    return {
      title: generalInfo?.Title?.["@value"] || data["@id"],
      applicabilityCriteria: data["Applicability criteria"]?.map(item => item["@value"] || '') || [],
      primaryIntendedUse: data["Primary intended use(s)"]?.[0]?.["@value"] || '',
      users: {
        intendedUsers: data["Primary intended users"]?.map(item => item["@value"] || '') || [],
        requiredExpertise: '' // Not directly available in the new structure example
      },
      reference: {
        paper: generalInfo?.["References to papers"]?.[0]?.["@value"] || '',
        codeRepository: generalInfo?.["References to code"]?.[0]?.["@value"] || '',
        documentation: '' // Not directly available
      },
      datasetRequirements: {
        format: '',
        minimumSamples: '',
        annotations: data.Data?.[0]?.["@value"] || '',
        preprocessing: ''
      },
      metricsAndValidation: {
        metrics: {},
        validationDataset: '',
        crossValidation: ''
      },
      fairSpecific: fairSpecific
    };
  }

  /**
   * Generate description from FullJsonLdModel data
   */
  static generateDescription(data: FullJsonLdModel): string {
    const generalInfo = data["General Model Information"];
    const editorNote = generalInfo?.["Editor Note"]?.["@value"];
    const description = generalInfo?.Description?.["@value"];
    const primaryUse = data["Primary intended use(s)"]?.[0]?.["@value"];

    if (description) return description;
    if (editorNote) return editorNote;
    if (primaryUse) return primaryUse;

    return `Model for ${data.Outcome?.["rdfs:label"] || data["Outcome label"]?.["@value"] || 'prediction'}`;
  }

  /**
   * Complete model import process
   */
  static async importModel(url: string) {
    try {
      const fairModelData = await this.fetchModelData(url);

      const checkpointId = this.generateCheckpointId(url);
      const fairModelId = this.extractFairModelId(fairModelData["@id"] || url); // Use @id from data if available

      // The transformation to the old ModelMetadata is kept for now,
      // but the application should ideally move towards using FullJsonLdModel directly.
      const metadata = this.transformToMetadata(fairModelData);
      const description = this.generateDescription(fairModelData);

      return {
        checkpoint_id: checkpointId, // Ensure key matches DB/internal Model type
        fair_model_id: fairModelId,
        fair_model_url: fairModelData["@id"] || url,
        // metadata: metadata, // This is the old ModelMetadata structure
        description: description,
        // title: generalInfo?.Title?.["@value"], // This is part of metadata now

        // It's better to return the full JSON-LD data and let the backend decide what to store/transform.
        // The +server.ts endpoint will receive this and can then decide how to structure the DB entry.
        // For now, the `modelData` in `+page.svelte` expects the full JSON-LD.
        // So, the API endpoint should probably store/return this `fairModelData`.

        // Let's return an object that can be directly used if the backend stores the full JSON-LD
        // and also provides the simplified parts if needed by older structures.
        jsonLdFullModel: fairModelData, // The complete fetched JSON-LD

        // Fields for direct database insertion if DB schema is still based on old Model type
        dbFields: {
          checkpoint_id: checkpointId,
          fair_model_id: fairModelId,
          fair_model_url: fairModelData["@id"] || url,
          metadata: metadata, // Transformed to old ModelMetadata
          description: description,
          created_at: fairModelData["pav:createdOn"] || new Date().toISOString(),
          updated_at: fairModelData["pav:lastUpdatedOn"] || new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error('Error importing model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to import model: ${errorMessage}`);
    }
  }
}
