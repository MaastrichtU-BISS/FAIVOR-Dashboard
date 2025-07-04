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

	// Metrics state
	let metricsData = $state<ComprehensiveMetricsResponse | null>(null);
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
				throw new Error('No model metadata available. Please upload metadata.json or ensure the model has metadata configured.');
			}

			// Parse column metadata if available
			let columnMetadata: any = {};
			if (uploadedFolder.columnMetadata) {
				const columnMetadataText = await uploadedFolder.columnMetadata.text();
				columnMetadata = JSON.parse(columnMetadataText);
			}

			// Validate that we have data to calculate metrics
			if (uploadedFolder.data) {
				// Use real data
				console.log('📊 Calculating metrics with real data');
				metricsData = await FaivorBackendAPI.calculateMetrics(
					modelMetadata,
					uploadedFolder.data,
					columnMetadata
				);
			} else {
				throw new Error('No data available for metrics calculation');
			}

			console.log('✅ Metrics loaded successfully:', metricsData);

			// Save metrics to validation form store
			validationFormStore.setComprehensiveMetrics(metricsData);
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

	function formatMetricValue(value: any): string {
		if (typeof value === 'number') {
			return value.toFixed(3);
		}
		if (typeof value === 'string') {
			return value;
		}
		return JSON.stringify(value);
	}

	function getMetricCategory(key: string): string {
		if (key.startsWith('performance.')) return 'Performance';
		if (key.startsWith('fairness.')) return 'Fairness';
		if (key.startsWith('explainability.')) return 'Explainability';
		return 'Other';
	}

	function getMetricName(key: string): string {
		return key.split('.').pop() || key;
	}

	function groupMetricsByCategory(
		metrics: Record<string, any>
	): Record<string, Record<string, any>> {
		const grouped: Record<string, Record<string, any>> = {};

		Object.entries(metrics).forEach(([key, value]) => {
			const category = getMetricCategory(key);
			const name = getMetricName(key);

			if (!grouped[category]) {
				grouped[category] = {};
			}
			grouped[category][name] = value;
		});

		return grouped;
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
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<span class="text-sm">{metricsErrorDetails.userGuidance}</span>
						</div>
					{/if}
					
					{#if metricsErrorDetails.technicalDetails}
						<details class="collapse collapse-arrow bg-base-200 mt-2">
							<summary class="collapse-title text-sm font-medium">Technical Details</summary>
							<div class="collapse-content">
								<pre class="text-xs whitespace-pre-wrap">{metricsErrorDetails.technicalDetails}</pre>
							</div>
						</details>
					{/if}
					
					{#if metricsErrorDetails.code}
						<div class="text-xs opacity-75 mt-2">
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
		<!-- Model Information -->
		<div class="border-base-300 rounded-xl border p-6">
			<h3 class="mb-4 text-lg font-semibold">Model Information</h3>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<span class="text-base-content/70">Model Name:</span>
					<span class="ml-2 font-medium">{metricsData.model_info.name}</span>
				</div>
				<div>
					<span class="text-base-content/70">Model Type:</span>
					<span class="ml-2 font-medium capitalize">{metricsData.model_info.type}</span>
				</div>
			</div>
		</div>

		<!-- Overall Metrics -->
		{#if metricsData.overall}
			{@const groupedMetrics = groupMetricsByCategory(metricsData.overall)}
			{#each Object.entries(groupedMetrics) as [category, metrics]}
				<div class="border-base-300 rounded-xl border p-6">
					<h3 class="mb-4 text-lg font-semibold">{category} Metrics</h3>
					<div class="overflow-x-auto">
						<table class="table-zebra table w-full">
							<thead>
								<tr>
									<th>Metric</th>
									<th>Value</th>
								</tr>
							</thead>
							<tbody>
								{#each Object.entries(metrics) as [name, value]}
									<tr>
										<td class="font-medium capitalize">{name.replace(/_/g, ' ')}</td>
										<td class="font-mono">{formatMetricValue(value)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/each}
		{/if}

		<!-- Threshold Analysis (for classification models) -->
		{#if metricsData.threshold_metrics}
			<div class="border-base-300 rounded-xl border p-6">
				<h3 class="mb-4 text-lg font-semibold">Threshold Analysis</h3>

				{#if metricsData.threshold_metrics.probability_preprocessing}
					<div class="alert alert-info mb-4">
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
						<span class="text-sm">{metricsData.threshold_metrics.probability_preprocessing}</span>
					</div>
				{/if}

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- ROC Curve Info -->
					{#if metricsData.threshold_metrics.roc_curve}
						<div class="card bg-base-200">
							<div class="card-body">
								<h4 class="card-title text-base">ROC Curve</h4>
								<div class="stats stats-vertical">
									<div class="stat">
										<div class="stat-title">AUC Score</div>
										<div class="stat-value text-2xl">
											{metricsData.threshold_metrics.roc_curve.auc.toFixed(3)}
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Precision-Recall Curve Info -->
					{#if metricsData.threshold_metrics.pr_curve}
						<div class="card bg-base-200">
							<div class="card-body">
								<h4 class="card-title text-base">Precision-Recall Curve</h4>
								<div class="stats stats-vertical">
									<div class="stat">
										<div class="stat-title">Average Precision</div>
										<div class="stat-value text-2xl">
											{metricsData.threshold_metrics.pr_curve.average_precision.toFixed(3)}
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Sample Threshold Metrics -->
				{#if metricsData.threshold_metrics.threshold_metrics}
					{@const sampleThresholds = ['0.3', '0.5', '0.7']}
					<div class="mt-6">
						<h4 class="mb-3 text-base font-semibold">Sample Threshold Performance</h4>
						<div class="overflow-x-auto">
							<table class="table-compact table w-full">
								<thead>
									<tr>
										<th>Threshold</th>
										<th>Accuracy</th>
										<th>Precision</th>
										<th>Recall</th>
										<th>F1 Score</th>
									</tr>
								</thead>
								<tbody>
									{#each sampleThresholds as threshold}
										{#if metricsData.threshold_metrics.threshold_metrics[threshold]}
											{@const metrics = metricsData.threshold_metrics.threshold_metrics[threshold]}
											<tr>
												<td class="font-mono">{threshold}</td>
												<td class="font-mono">{metrics.accuracy?.toFixed(3) || 'N/A'}</td>
												<td class="font-mono">{metrics.precision?.toFixed(3) || 'N/A'}</td>
												<td class="font-mono">{metrics.recall?.toFixed(3) || 'N/A'}</td>
												<td class="font-mono">{metrics.f1_score?.toFixed(3) || 'N/A'}</td>
											</tr>
										{/if}
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Subgroup Analysis -->
		{#if metricsData.subgroups && Object.keys(metricsData.subgroups).length > 0}
			<div class="border-base-300 rounded-xl border p-6">
				<h3 class="mb-4 text-lg font-semibold">Subgroup Analysis</h3>
				{#each Object.entries(metricsData.subgroups) as [feature, subgroups]}
					<div class="mb-6">
						<h4 class="mb-3 text-base font-semibold capitalize">{feature.replace(/_/g, ' ')}</h4>
						{#if typeof subgroups === 'object' && subgroups !== null}
							<div class="overflow-x-auto">
								<table class="table-compact table w-full">
									<thead>
										<tr>
											<th>Subgroup</th>
											<th>Sample Size</th>
											<th>Accuracy</th>
											<th>Precision</th>
											<th>Recall</th>
										</tr>
									</thead>
									<tbody>
										{#each Object.entries(subgroups) as [subgroup, metrics]}
											{#if typeof metrics === 'object' && metrics !== null}
												{@const metricsObj = metrics as any}
												<tr>
													<td class="font-medium">{subgroup}</td>
													<td>{metricsObj.sample_size || 'N/A'}</td>
													<td class="font-mono">
														{metricsObj['performance.accuracy']?.toFixed(3) || 'N/A'}
													</td>
													<td class="font-mono">
														{metricsObj['performance.precision']?.toFixed(3) || 'N/A'}
													</td>
													<td class="font-mono">
														{metricsObj['performance.recall']?.toFixed(3) || 'N/A'}
													</td>
												</tr>
											{/if}
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/each}
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
