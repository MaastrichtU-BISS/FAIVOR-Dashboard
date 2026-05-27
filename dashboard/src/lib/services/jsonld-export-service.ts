import type { DatasetAnalysis } from '$lib/services/csv-analysis-service';
import type { FullJsonLdModel, JsonLdEvaluationResultItem, UiValidationJob } from '$lib/stores/models/types';
import type {
  JsonLdExportOptions,
  JsonLdValidationExportBuildResult,
  JsonLdValidationExportInput,
  JsonLdValidationWarning
} from '$lib/types/jsonld-export';

const EXPORT_CONTEXT = {
  schema: 'https://schema.org/',
  pav: 'http://purl.org/pav/',
  prov: 'http://www.w3.org/ns/prov#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  faivor: 'https://faivor.org/ns#',
  exportedAt: {
    '@id': 'schema:dateCreated',
    '@type': 'xsd:dateTime'
  },
  exportScope: 'faivor:exportScope',
  redactionApplied: 'faivor:redactionApplied'
};

const DEFAULT_EXPORT_OPTIONS: JsonLdExportOptions = {
  section: 'combined',
  redaction: {
    redactIdentity: true,
    redactDatasetFiles: true,
    redactTechnicalDetails: true
  }
};

export class JsonLdExportService {
  static buildDatasetAnalysisExport(
    datasetAnalysis: DatasetAnalysis,
    modelName?: string,
    options: JsonLdExportOptions = {
      section: 'dataCharacteristics',
      redaction: {
        redactIdentity: true,
        redactDatasetFiles: true,
        redactTechnicalDetails: true
      }
    }
  ): JsonLdValidationExportBuildResult {
    const warnings: JsonLdValidationWarning[] = [];
    const exportedAt = new Date().toISOString();
    const exportId = `urn:faivor:dataset-characteristics-export:${Date.now()}`;
    const modelId = `urn:faivor:model:${this.normalizeForNodeId(modelName || 'model')}`;
    const characteristicsId = `${exportId}:characteristics`;

    const analysis = JSON.parse(JSON.stringify(datasetAnalysis)) as Record<string, unknown>;
    if (options.redaction.redactDatasetFiles) {
      delete analysis.fileName;
      delete analysis.fileSize;
    }

    const document: Record<string, unknown> = {
      '@context': EXPORT_CONTEXT,
      '@type': ['faivor:ValidationExport', 'schema:CreativeWork'],
      '@id': exportId,
      exportedAt,
      exportProfile: 'faivor.validation-export.v1',
      exportScope: 'dataCharacteristics',
      model: {
        '@id': modelId,
        '@type': 'schema:SoftwareApplication',
        name: modelName || null
      },
      redactionApplied: {
        identity: options.redaction.redactIdentity,
        datasetFiles: options.redaction.redactDatasetFiles,
        technicalDetails: options.redaction.redactTechnicalDetails
      },
      dataCharacteristics: {
        '@id': characteristicsId,
        '@type': ['faivor:DatasetCharacteristics', 'schema:Dataset'],
        hasCharacteristics: true,
        analysis
      },
      conformsTo: 'https://schema.org',
      creator: {
        '@type': 'schema:Organization',
        name: 'FAIVOR Dashboard'
      },
      '@graph': [
        {
          '@id': exportId,
          '@type': ['faivor:ValidationExport', 'schema:CreativeWork'],
          exportedAt,
          exportScope: 'dataCharacteristics',
          model: {
            '@id': modelId
          },
          dataCharacteristics: {
            '@id': characteristicsId
          }
        },
        {
          '@id': modelId,
          '@type': 'schema:SoftwareApplication',
          name: modelName || null
        },
        {
          '@id': characteristicsId,
          '@type': ['faivor:DatasetCharacteristics', 'schema:Dataset'],
          hasCharacteristics: true,
          analysis
        }
      ]
    };

    this.runLightweightChecks(document, warnings, false, true);

    return {
      document,
      warnings,
      fileName: `${this.normalizeForFileName(modelName || 'model')}-dataset-characteristics-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonld`
    };
  }

  static buildValidationExport(
    input: JsonLdValidationExportInput,
    options: JsonLdExportOptions = DEFAULT_EXPORT_OPTIONS
  ): JsonLdValidationExportBuildResult {
    const exportedAt = new Date().toISOString();
    const warnings: JsonLdValidationWarning[] = [];
    const modelName = this.getModelName(input.model);
    const exportId = `urn:faivor:validation-export:${input.validationJob.val_id}:${Date.now()}`;
    const modelId = input.model?.['@id'] || `urn:faivor:model:${this.normalizeForNodeId(modelName)}`;
    const validationRunId = `urn:faivor:validation-run:${input.validationJob.val_id}`;
    const evalData = (input.validationJob.originalEvaluationData || {}) as JsonLdEvaluationResultItem & {
      data?: Record<string, any>;
      validation_error?: Record<string, any>;
      dataset_info?: Record<string, any>;
    };

    const doc: Record<string, unknown> = {
      '@context': EXPORT_CONTEXT,
      '@type': ['faivor:ValidationExport', 'schema:CreativeWork'],
      '@id': exportId,
      exportedAt,
      exportProfile: 'faivor.validation-export.v1',
      exportScope: options.section,
      redactionApplied: {
        identity: options.redaction.redactIdentity,
        datasetFiles: options.redaction.redactDatasetFiles,
        technicalDetails: options.redaction.redactTechnicalDetails
      },
      model: {
        '@id': modelId,
        '@type': 'schema:SoftwareApplication',
        checkpointId: input.model?.checkpoint_id,
        fairModelId: input.model?.fair_model_id,
        modelId: input.model?.['@id'],
        name: modelName
      },
      validationRun: {
        '@id': validationRunId,
        '@type': ['faivor:ValidationRun', 'schema:Action'],
        id: input.validationJob.val_id,
        status: input.validationJob.validation_status,
        name: input.validationJob.validation_name || null,
        createdAt: input.validationJob.start_datetime,
        sourceEvaluationId: input.validationJob.originalEvaluationData?.['@id'] || null
      },
      conformsTo: 'https://schema.org',
      creator: {
        '@type': 'schema:Organization',
        name: 'FAIVOR Dashboard'
      }
    };

    const includeValidation = options.section === 'validationResults' || options.section === 'combined';
    const includeCharacteristics =
      options.section === 'dataCharacteristics' || options.section === 'combined';

    if (includeValidation) {
      const validationResult = this.buildValidationResultSection(input.validationJob, evalData, input.metricsData);
      doc.validationResult = validationResult.section;
      warnings.push(...validationResult.warnings);
    }

    if (includeCharacteristics) {
      const characteristicsResult = this.buildDataCharacteristicsSection(
        input.validationJob,
        evalData,
        input.datasetAnalysis
      );
      doc.dataCharacteristics = characteristicsResult.section;
      warnings.push(...characteristicsResult.warnings);
    }

    if (warnings.length > 0) {
      doc.warnings = warnings;
    }

    const graph: Record<string, unknown>[] = [
      {
        '@id': exportId,
        '@type': ['faivor:ValidationExport', 'schema:CreativeWork'],
        exportedAt,
        exportScope: options.section,
        model: {
          '@id': modelId
        },
        validationRun: {
          '@id': validationRunId
        }
      },
      {
        '@id': modelId,
        '@type': 'schema:SoftwareApplication',
        name: modelName,
        identifier: input.model?.checkpoint_id || input.model?.fair_model_id || null
      },
      {
        '@id': validationRunId,
        '@type': ['faivor:ValidationRun', 'schema:Action'],
        name: input.validationJob.validation_name || null,
        actionStatus: input.validationJob.validation_status,
        startTime: input.validationJob.start_datetime
      }
    ];

    if (includeValidation && doc.validationResult && typeof doc.validationResult === 'object') {
      const validationResultId = `${validationRunId}:result`;
      (doc.validationResult as Record<string, unknown>)['@id'] = validationResultId;
      graph.push({
        ...(doc.validationResult as Record<string, unknown>)
      });
    }

    if (includeCharacteristics && doc.dataCharacteristics && typeof doc.dataCharacteristics === 'object') {
      const characteristicsId = `${validationRunId}:characteristics`;
      (doc.dataCharacteristics as Record<string, unknown>)['@id'] = characteristicsId;
      graph.push({
        ...(doc.dataCharacteristics as Record<string, unknown>)
      });
    }

    doc['@graph'] = graph;

    const redactedDoc = this.applyRedaction(doc, input.validationJob, options, evalData);
    this.runLightweightChecks(redactedDoc, warnings, includeValidation, includeCharacteristics);

    return {
      document: redactedDoc,
      warnings,
      fileName: this.buildFileName(input.validationJob, modelName, options.section)
    };
  }

  static downloadJsonLd(document: Record<string, unknown>, fileName: string): void {
		if (!documentRef) {
			throw new Error('JSON-LD download is only available in the browser environment.');
		}

    const content = JSON.stringify(document, null, 2);
    const blob = new Blob([content], { type: 'application/ld+json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = documentRef.createElement('a');
    link.href = url;
    link.download = fileName;
    documentRef.body.appendChild(link);
    link.click();
    documentRef.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static buildValidationResultSection(
    job: UiValidationJob,
    evalData: JsonLdEvaluationResultItem & { data?: Record<string, any>; validation_error?: Record<string, any> },
    metricsData?: Record<string, unknown> | null
  ): { section: Record<string, unknown>; warnings: JsonLdValidationWarning[] } {
    const warnings: JsonLdValidationWarning[] = [];

    const storedValidationResult = evalData?.data?.validation_result;
    const comprehensiveMetrics =
      metricsData ||
      storedValidationResult?.comprehensive_metrics ||
      storedValidationResult?.validation_results?.modelValidation?.details ||
      null;

    const fallbackMetrics = (evalData['Performance metric'] || []).map((metric) => ({
      label: metric['Metric Label']?.['rdfs:label'] || metric['Metric Label']?.['@id'] || 'unknown_metric',
      value: metric['Measured metric (mean value)']?.['@value']
    }));

    if (!comprehensiveMetrics && fallbackMetrics.length === 0 && job.validation_status === 'completed') {
      warnings.push({
        code: 'MISSING_VALIDATION_METRICS',
        message: 'Validation is completed but no metrics were available in this export context.'
      });
    }

    if (job.validation_status === 'failed' && !evalData.validation_error && !evalData?.data?.validation_error) {
      warnings.push({
        code: 'MISSING_FAILURE_DETAILS',
        message: 'Validation failed but no structured error details were found.'
      });
    }

    const failure = (evalData.validation_error || evalData?.data?.validation_error) as
      | {
          message?: string;
          code?: string;
          technicalDetails?: string;
          userGuidance?: string;
        }
      | undefined;

    return {
      section: {
        '@type': ['faivor:ValidationResult', 'schema:Report'],
        status: job.validation_status,
        hasMetrics: Boolean(comprehensiveMetrics || fallbackMetrics.length > 0),
        metrics: comprehensiveMetrics,
        fallbackMetrics,
        failure: failure
          ? {
              message: failure.message,
              code: failure.code,
              technicalDetails: failure.technicalDetails,
              userGuidance: failure.userGuidance
            }
          : null
      },
      warnings
    };
  }

  private static buildDataCharacteristicsSection(
    job: UiValidationJob,
    evalData: JsonLdEvaluationResultItem & {
      data?: Record<string, any>;
      dataset_info?: Record<string, any>;
    },
    datasetAnalysis?: DatasetAnalysis | null
  ): { section: Record<string, unknown>; warnings: JsonLdValidationWarning[] } {
    const warnings: JsonLdValidationWarning[] = [];

    const characteristics = evalData['Dataset characteristics'] || [];
    const storedAnalysis = evalData?.data?.dataset_info?.datasetAnalysis || null;
    const analysis = datasetAnalysis || storedAnalysis;

    if (characteristics.length === 0 && !analysis && job.dataCharacteristics) {
      warnings.push({
        code: 'MISSING_DATA_CHARACTERISTICS',
        message: 'Validation indicates data characteristics are present, but no details were found for export.'
      });
    }

    return {
      section: {
        '@type': ['faivor:DatasetCharacteristics', 'schema:Dataset'],
        hasCharacteristics: Boolean(characteristics.length > 0 || analysis),
        jsonLdCharacteristics: characteristics,
        analysis: analysis
      },
      warnings
    };
  }

  private static applyRedaction(
    doc: Record<string, unknown>,
    job: UiValidationJob,
    options: JsonLdExportOptions,
    evalData: JsonLdEvaluationResultItem & { data?: Record<string, any> }
  ): Record<string, unknown> {
    const cloned = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;

    if (options.redaction.redactIdentity) {
      const validationRun = cloned.validationRun as Record<string, unknown>;
      if (validationRun) {
        validationRun.userName = null;
      }

      const validationResult = cloned.validationResult as Record<string, unknown> | undefined;
      if (validationResult?.failure && typeof validationResult.failure === 'object') {
        const failure = validationResult.failure as Record<string, unknown>;
        failure.userGuidance = failure.userGuidance || null;
      }
    } else {
      const validationRun = cloned.validationRun as Record<string, unknown>;
      if (validationRun) {
        validationRun.userName = job.userName || evalData['user/hospital']?.['@value'] || null;
      }
    }

    if (options.redaction.redactDatasetFiles) {
      const dataCharacteristics = cloned.dataCharacteristics as Record<string, unknown> | undefined;
      if (dataCharacteristics?.analysis && typeof dataCharacteristics.analysis === 'object') {
        const analysis = dataCharacteristics.analysis as Record<string, unknown>;
        delete analysis.fileName;
        delete analysis.fileSize;
      }

      const dataSection = cloned.dataCharacteristics as Record<string, unknown> | undefined;
      if (dataSection && typeof dataSection === 'object') {
        const datasetInfo = (evalData as any)?.data?.dataset_info;
        if (datasetInfo?.folderUpload) {
          dataSection.folderUpload = {
            redacted: true
          };
        }
      }
    }

    if (options.redaction.redactTechnicalDetails) {
      const validationResult = cloned.validationResult as Record<string, unknown> | undefined;
      if (validationResult?.failure && typeof validationResult.failure === 'object') {
        const failure = validationResult.failure as Record<string, unknown>;
        delete failure.technicalDetails;
      }
    }

    return cloned;
  }

  private static runLightweightChecks(
    document: Record<string, unknown>,
    warnings: JsonLdValidationWarning[],
    includeValidation: boolean,
    includeCharacteristics: boolean
  ): void {
    const context = document['@context'];
    const type = document['@type'];
    const exportedAt = document.exportedAt;

    if (!context || typeof context !== 'object') {
      warnings.push({
        code: 'MISSING_CONTEXT',
        message: 'JSON-LD export is missing @context.'
      });
    }

    if (!type) {
      warnings.push({
        code: 'MISSING_TYPE',
        message: 'JSON-LD export is missing @type.'
      });
    }

    if (!exportedAt || typeof exportedAt !== 'string') {
      warnings.push({
        code: 'MISSING_EXPORTED_AT',
        message: 'JSON-LD export is missing exportedAt timestamp.'
      });
    }

    if (includeValidation && !document.validationResult) {
      warnings.push({
        code: 'MISSING_VALIDATION_SECTION',
        message: 'Export requested validation results but section was not produced.'
      });
    }

    if (includeCharacteristics && !document.dataCharacteristics) {
      warnings.push({
        code: 'MISSING_CHARACTERISTICS_SECTION',
        message: 'Export requested data characteristics but section was not produced.'
      });
    }
  }

  private static getModelName(model?: FullJsonLdModel): string {
    return (
      model?.['General Model Information']?.Title?.['@value'] ||
      model?.['Model name']?.['@value'] ||
      model?.title ||
      'model'
    );
  }

  private static buildFileName(
    job: UiValidationJob,
    modelName: string,
    section: JsonLdExportOptions['section']
  ): string {
    const normalizedModel = this.normalizeForFileName(modelName);
    const normalizedSection = this.normalizeForFileName(section);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${normalizedModel}-${job.val_id}-${normalizedSection}-${timestamp}.jsonld`;
  }

  private static normalizeForFileName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export';
  }

  private static normalizeForNodeId(value: string): string {
    return this.normalizeForFileName(value || 'node');
  }
}

const documentRef = typeof document !== 'undefined' ? document : undefined;
