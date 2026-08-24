<script lang="ts">
	import { onMount } from 'svelte';
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import { FaivorBackendAPI, type ComprehensiveMetricsResponse } from '$lib/api/faivor-backend';
	import type { FullJsonLdModel } from '$lib/stores/models/types';

	interface Props {
		metricsDescription?: string;
		performanceMetrics?: string;
		readonly?: boolean;
		onFieldChange?: () => void;
		model?: FullJsonLdModel;
	}

	let {
		metricsDescription = $bindable(''),
		performanceMetrics = $bindable(''),
		readonly = false,
		onFieldChange = () => {},
		model
	}: Props = $props();

	// Store initial values to track actual changes
	let initialMetrics = $state(metricsDescription || '');
	let initialPerformance = $state(performanceMetrics || '');

	// Metrics state - updated to handle metric definitions
	let metricsData = $state<
		| ComprehensiveMetricsResponse
		| { metric_definitions: Array<{ name: string; description: string; type: string }> }
		| null
	>(null);
	let isLoadingMetrics = $state(false);
	let metricsError = $state<string | null>(null);
	let metricsErrorDetails = $state<any>(null);

	// Track actual value changes
	$effect(() => {
		if (!readonly && onFieldChange) {
			const hasChanges =
				metricsDescription !== initialMetrics || performanceMetrics !== initialPerformance;

			if (hasChanges) {
				onFieldChange();
			}
		}
	});

	// Reset initial values when props change
	$effect(() => {
		initialMetrics = metricsDescription || '';
		initialPerformance = performanceMetrics || '';
	});

	// Load metrics when component mounts or when form data changes
	let lastLoadedFolder: any = null;
	let lastLoadedModel: any = null;

	$effect(() => {
		const formData = $validationFormStore;
		if (
			formData.uploadedFolder &&
			model &&
			(formData.uploadedFolder !== lastLoadedFolder || model !== lastLoadedModel) &&
			!isLoadingMetrics
		) {
			lastLoadedFolder = formData.uploadedFolder;
			lastLoadedModel = model;
			loadMetrics();
		}
	});

	async function loadMetrics() {
		if (!model || !$validationFormStore.uploadedFolder) {
			return;
		}

		isLoadingMetrics = true;
		metricsError = null;
		metricsErrorDetails = null;

		try {
			const formData = $validationFormStore;
			const { uploadedFolder } = formData;

			if (!uploadedFolder) {
				throw new Error('No uploaded folder available');
			}

			// Parse model metadata
			let modelMetadata: any;

			// Handle JSON-LD model structure
			if (model && '@context' in model) {
				// This is a FullJsonLdModel (JSON-LD structure)
				const jsonLdModel = model as any;

				// Create metadata in the format expected by FAIVOR-ML-Validator
				// Must include the "General Model Information" section
				modelMetadata = {
					'@context': jsonLdModel['@context'] || {
						rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
						xsd: 'http://www.w3.org/2001/XMLSchema#'
					},
					'General Model Information': jsonLdModel['General Model Information'] || {
						Title: {
							'@value':
								jsonLdModel['General Model Information']?.Title?.['@value'] || 'Unknown Model'
						},
						Description: {
							'@value': 'Model validation through FAIR models validator'
						},
						'Created by': {
							'@value': 'FAIR Models Validator User'
						},
						'Creation date': {
							'@value': new Date().toISOString().split('T')[0],
							'@type': 'xsd:date'
						},
						'Contact email': {
							'@value': 'validator@fairmodels.org'
						}
					},
					'Input data1':
						jsonLdModel['Input data1'] && jsonLdModel['Input data1'].length > 0
							? jsonLdModel['Input data1']
							: [
									{
										'Input label': {
											'@value': 'feature1'
										},
										Description: {
											'@value': 'Model input feature'
										},
										'Type of input': {
											'@value': 'n'
										},
										'Input feature': {
											'rdfs:label': 'Feature 1'
										}
									}
								],
					Outcome: jsonLdModel['Outcome'] || {
						'@id': 'http://example.org/outcome',
						'rdfs:label': 'Model Outcome'
					},
					'Outcome label': jsonLdModel['Outcome label'] || {
						'@value': 'outcome'
					},
					'Outcome type': jsonLdModel['Outcome type'] || {
						'@value': 'P'
					},
					'Foundational model or algorithm used': jsonLdModel[
						'Foundational model or algorithm used'
					] || {
						'@id': 'https://w3id.org/aio/LogisticRegression',
						'rdfs:label': 'Logistic Regression'
					}
				};

				console.log('🔧 Created FAIVOR-compatible metadata with General Model Information section');
			} else if ((model as any)?.metadata?.fairSpecific) {
				// Legacy model structure
				modelMetadata = (model as any).metadata.fairSpecific;
			} else if (uploadedFolder.metadata) {
				// Use uploaded metadata file
				const metadataText = await uploadedFolder.metadata.text();
				const parsedMetadata = JSON.parse(metadataText);

				// Ensure it has the required "General Model Information" section
				if (!parsedMetadata['General Model Information']) {
					parsedMetadata['General Model Information'] = {
						Title: {
							'@value': parsedMetadata.model_name || parsedMetadata.name || 'Uploaded Model'
						},
						Description: {
							'@value': 'Model validation through FAIR models validator'
						},
						'Created by': {
							'@value': 'FAIR Models Validator User'
						},
						'Creation date': {
							'@value': new Date().toISOString().split('T')[0],
							'@type': 'xsd:date'
						}
					};
				}

				modelMetadata = parsedMetadata;
				console.log('🔧 Enhanced uploaded metadata with General Model Information section');
			} else {
				// No metadata available - cannot proceed
				throw new Error(
					'No model metadata available. Please upload metadata.json or ensure the model has metadata configured.'
				);
			}

			// Parse column metadata if available
			let columnMetadata: any = null;
			if (uploadedFolder.columnMetadata) {
				const columnMetadataText = await uploadedFolder.columnMetadata.text();
				columnMetadata = JSON.parse(columnMetadataText);
			}

			// Validate that we have data to calculate metrics
			if (uploadedFolder.data) {
				// Use retrieveMetricDefinitions to get available metrics
				console.log('📊 Retrieving available metric definitions');
				const metricDefinitions = await FaivorBackendAPI.retrieveMetricDefinitions(
					modelMetadata,
					uploadedFolder.data,
					columnMetadata
				);

				// Store the metric definitions in a format that the UI can display
				metricsData = {
					model_info: {
						name: modelMetadata['General Model Information']?.Title?.['@value'] || 'Unknown Model',
						type: 'classification'
					},
					metric_definitions: metricDefinitions,
					overall: {}
				} as any;
			} else {
				throw new Error('No data available for metrics calculation');
			}

			console.log('✅ Metric definitions loaded successfully:', metricsData);

			// Don't save metric definitions to validation form store as they are just for preview
			// validationFormStore.setComprehensiveMetrics(metricsData);
		} catch (error: any) {
			console.error('❌ Failed to load metrics:', error);

			// Check if this is a structured ValidationError
			if (error.details) {
				metricsError = error.details.message || error.message || 'Failed to calculate metrics';
				metricsErrorDetails = {
					code: error.details.code,
					technicalDetails: error.details.technicalDetails,
					userGuidance: error.details.userGuidance,
					metadata: error.details.metadata
				};
			} else {
				metricsError = error.message || 'Failed to calculate metrics';
				metricsErrorDetails = null;
			}
		} finally {
			isLoadingMetrics = false;
		}
	}
</script>

<div class="grid grid-cols-1 gap-8">
	{#if isLoadingMetrics}
		<div class="border-base-300 rounded-xl border p-6">
			<div class="flex items-center justify-center gap-4">
				<span class="loading loading-spinner loading-md"></span>
				<span class="text-base-content/70">Calculating comprehensive metrics...</span>
			</div>
		</div>
	{:else if metricsError}
		<div class="alert alert-error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<div>
				<h3 class="font-bold">Metrics Calculation Failed</h3>
				<div class="mb-2 text-sm">{metricsError}</div>

				{#if metricsErrorDetails}
					{#if metricsErrorDetails.userGuidance}
						<div class="alert alert-info mt-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="h-6 w-6 shrink-0 stroke-current"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<span class="text-sm">{metricsErrorDetails.userGuidance}</span>
						</div>
					{/if}

					{#if metricsErrorDetails.technicalDetails}
						<details class="collapse-arrow bg-base-200 collapse mt-2">
							<summary class="collapse-title text-sm font-medium">Technical Details</summary>
							<div class="collapse-content">
								<pre
									class="whitespace-pre-wrap text-xs">{metricsErrorDetails.technicalDetails}</pre>
							</div>
						</details>
					{/if}

					{#if metricsErrorDetails.code}
						<div class="mt-2 text-xs opacity-75">
							Error Code: <code class="font-mono">{metricsErrorDetails.code}</code>
						</div>
					{/if}
				{:else if metricsError.includes('Docker') || metricsError.includes('Connection aborted') || metricsError.includes('FileNotFoundError')}
					<div class="text-xs opacity-75">
						<p><strong>This error indicates:</strong></p>
						<ul class="mt-1 list-inside list-disc space-y-1">
							<li>The model's Docker container cannot be executed</li>
							<li>Docker daemon is not accessible from the backend</li>
							<li>Steps 1-2 validation completed successfully</li>
						</ul>
						<p class="mt-2">
							<strong>To resolve:</strong>
							Contact your administrator to enable Docker execution for full metrics calculation.
						</p>
					</div>
				{/if}
			</div>
			<button class="btn btn-sm btn-outline" onclick={loadMetrics}>Retry</button>
		</div>
	{:else if metricsData}
		<!-- Check if we have metric definitions from /retrieve-metrics -->
		{#if 'metric_definitions' in metricsData && metricsData.metric_definitions}
			<!-- Display metric definitions returned by /retrieve-metrics -->
			<div class="border-base-300 rounded-xl border p-6">
				<h3 class="mb-4 text-lg font-semibold">Available Metrics for Validation</h3>
				<p class="text-base-content/70 mb-4 text-sm">
					The following metrics will be calculated when you submit the validation:
				</p>

				<!-- Display as JSON -->
				<!-- <div class="bg-base-200 rounded-lg p-4 overflow-auto max-h-96">
					<pre class="text-sm"><code>{JSON.stringify(metricsData.metric_definitions, null, 2)}</code></pre>
				</div> -->

				<!-- Alternative: Display as a table -->
				<div class="mt-6">
					<h4 class="mb-3 text-base font-semibold">Metrics Summary</h4>
					<div class="overflow-x-auto">
						<table class="table-zebra table w-full">
							<thead>
								<tr>
									<th>Metric Name</th>
									<th>Description</th>
									<th>Type</th>
								</tr>
							</thead>
							<tbody>
								{#each metricsData.metric_definitions as metric}
									<tr>
										<td class="font-medium">{metric.name}</td>
										<td class="text-sm">{metric.description}</td>
										<td class="capitalize">{metric.type}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{:else}
			<!-- Legacy display for comprehensive metrics (shouldn't happen in step 3 anymore) -->
			<div class="border-base-300 rounded-xl border p-6">
				<h3 class="mb-4 text-lg font-semibold">Model Information</h3>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="text-base-content/70">Model Name:</span>
						<span class="ml-2 font-medium">{metricsData.model_info?.name || 'Unknown Model'}</span>
					</div>
					<div>
						<span class="text-base-content/70">Model Type:</span>
						<span class="ml-2 font-medium capitalize">
							{metricsData.model_info?.type || 'Classification'}
						</span>
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<div class="border-base-300 rounded-xl border p-6">
			<div class="text-base-content/70 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mx-auto mb-4 h-12 w-12 opacity-50"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
				<p class="mb-2 text-lg font-medium">No Metrics Available</p>
				<p class="text-sm">Upload data in previous steps to calculate comprehensive metrics</p>
			</div>
		</div>
	{/if}
</div>
