import type { ModelMetadata } from '$lib/stores/models/types';
import { createHash } from 'node:crypto';

export interface FAIRModelResponse {
  '@context': Record<string, any>;
  '@id': string;
  'Title': { '@value': string };
  'Editor Note'?: { '@value': string };
  'Created by'?: { '@value': string };
  'Creation date'?: { '@value': string; '@type': string };
  'Contact email'?: { '@value': string };
  'References'?: Array<{ '@value': string }>;
  'Reference to code'?: Array<{ '@value': string | null }>;
  'Software License'?: { '@id': string; 'rdfs:label': string };
  'FAIRmodels image name'?: { '@value': string };
  'Outcome'?: { '@id': string; 'rdfs:label': string };
  'Input'?: Array<{ '@id': string; 'rdfs:label': string }>;
  'Applicability criteria'?: Array<{ '@value': string }>;
  'Foundational model or algorithm used'?: { '@value': string };
  'Primary intended use(s)'?: Array<{ '@value': string }>;
  'Primary intended users'?: Array<{ '@value': string }>;
  'Out-of-scope use cases'?: Array<{ '@value': string }>;
  'Data'?: Array<{ '@value': string }>;
  'Human life'?: Array<{ '@value': string }>;
  'Mitigations'?: Array<{ '@value': string }>;
  'Risks and harms'?: Array<{ '@value': string }>;
  'Use cases'?: Array<{ '@value': string | null }>;
  'Additional concerns'?: Array<{ '@value': string | null }>;
  'pav:lastUpdatedOn'?: string;
  'pav:createdOn'?: string;
  'schema:isBasedOn'?: string;
}

export class ModelImportService {
  /**
   * Fetch model data from FAIR models URL
   */
  static async fetchModelData(url: string): Promise<FAIRModelResponse> {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json-ld'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as FAIRModelResponse;
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
    // Extract the UUID from URL like https://v2.fairmodels.org/instance/3f400afb-df5e-4798-ad50-0687dd439d9b
    const match = url.match(/\/instance\/([a-f0-9-]+)$/);
    return match ? match[1] : url;
  }

  /**
   * Transform FAIR model response to internal metadata format
   */
  static transformToMetadata(data: FAIRModelResponse): ModelMetadata {
    return {
      title: data['Title']?.['@value'] || '',
      applicabilityCriteria: data['Applicability criteria']?.map(item => item['@value']) || [],
      primaryIntendedUse: data['Primary intended use(s)']?.[0]?.['@value'] || '',
      users: {
        intendedUsers: data['Primary intended users']?.map(item => item['@value']) || [],
        requiredExpertise: '' // Not available in FAIR model data
      },
      reference: {
        paper: data['References']?.[0]?.['@value'] || '',
        codeRepository: data['Reference to code']?.find(ref => ref['@value'])?.['@value'] || '',
        documentation: '' // Not directly available
      },
      datasetRequirements: {
        format: '', // Not directly available
        minimumSamples: '', // Not directly available
        annotations: data['Data']?.[0]?.['@value'] || '',
        preprocessing: '' // Not directly available
      },
      metricsAndValidation: {
        metrics: {}, // Not available in basic metadata
        validationDataset: '',
        crossValidation: ''
      },
      // Additional fields from FAIR model
      fairSpecific: {
        outcome: data['Outcome']?.['rdfs:label'] || '',
        inputs: data['Input']?.map(input => input['rdfs:label']) || [],
        algorithm: data['Foundational model or algorithm used']?.['@value'] || '',
        outOfScopeUseCases: data['Out-of-scope use cases']?.map(item => item['@value']) || [],
        humanLifeImpact: data['Human life']?.map(item => item['@value']) || [],
        mitigations: data['Mitigations']?.map(item => item['@value']) || [],
        risksAndHarms: data['Risks and harms']?.map(item => item['@value']) || [],
        dockerImage: data['FAIRmodels image name']?.['@value'] || '',
        softwareLicense: data['Software License']?.['rdfs:label'] || '',
        createdBy: data['Created by']?.['@value'] || '',
        creationDate: data['Creation date']?.['@value'] || '',
        contactEmail: data['Contact email']?.['@value'] || '',
        lastUpdated: data['pav:lastUpdatedOn'] || '',
        basedOn: data['schema:isBasedOn'] || ''
      }
    };
  }

  /**
   * Generate description from FAIR model data
   */
  static generateDescription(data: FAIRModelResponse): string {
    const editorNote = data['Editor Note']?.['@value'];
    const primaryUse = data['Primary intended use(s)']?.[0]?.['@value'];

    if (editorNote) {
      return editorNote;
    } else if (primaryUse) {
      return primaryUse;
    } else {
      return `Model for ${data['Outcome']?.['rdfs:label'] || 'prediction'}`;
    }
  }

  /**
   * Complete model import process
   */
  static async importModel(url: string) {
    try {
      // Fetch model data from FAIR models API
      const fairModelData = await this.fetchModelData(url);

      // Generate checkpoint ID and extract FAIR model ID
      const checkpointId = this.generateCheckpointId(url);
      const fairModelId = this.extractFairModelId(url);

      // Transform to internal format
      const metadata = this.transformToMetadata(fairModelData);
      const description = this.generateDescription(fairModelData);

      return {
        checkpointId,
        fairModelId,
        fairModelUrl: url,
        metadata,
        description,
        title: fairModelData['Title']?.['@value'] || '',
        rawFairData: fairModelData
      };
    } catch (error) {
      console.error('Error importing model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to import model: ${errorMessage}`);
    }
  }
}
