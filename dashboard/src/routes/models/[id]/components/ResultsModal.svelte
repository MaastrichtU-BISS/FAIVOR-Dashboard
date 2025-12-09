<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { UiValidationJob } from '$lib/stores/models/types';
	import { FaivorBackendAPI, type ComprehensiveMetricsResponse } from '$lib/api/faivor-backend';
	import type { FullJsonLdModel } from '$lib/stores/models/types';
	import ROCCurveChart from '$lib/components/charts/ROCCurveChart.svelte';
	import PRCurveChart from '$lib/components/charts/PRCurveChart.svelte';
	import MetricsRadarChart from '$lib/components/charts/MetricsRadarChart.svelte';
	import SubgroupComparisonChart from '$lib/components/charts/SubgroupComparisonChart.svelte';
	import MaterialSymbolsDownload from '~icons/material-symbols/download';
	import { ValidationPDFExportService, type ChartImages } from '$lib/services/validation-pdf-export-service';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	interface Props {
		validationJob: UiValidationJob;
		isOpen: boolean;
		model?: FullJsonLdModel;
	}

	let { validationJob, isOpen, model }: Props = $props();

	// Modal ref
	let dialogElement: HTMLDialogElement;

	// Metrics state
	let metricsData = $state<ComprehensiveMetricsResponse | null>(null);
	let isLoadingMetrics = $state(false);
	let metricsError = $state<string | null>(null);
	let metricsErrorDetails = $state<any>(null);

	// Validation error state (for failed validations)
	let validationError = $state<{
		message?: string;
		code?: string;
		technicalDetails?: string;
		userGuidance?: string;
	} | null>(null);
	let showTechnicalDetails = $state(false);

	// View mode toggles
	let showCharts = $state(true);
	let showTables = $state(true);

	// Export state
	let isExporting = $state(false);

	// Chart component references for PDF export
	let radarChartRef: MetricsRadarChart;
	let rocChartRef: ROCCurveChart;
	let prChartRef: PRCurveChart;
	let subgroupChartRefs: Record<string, SubgroupComparisonChart> = {};

	// Get model name for PDF
	let modelName = $derived(
		model?.['General Model Information']?.Title?.['@value'] ||
			model?.['Model name']?.['@value'] ||
			model?.title ||
			undefined
	);

	async function exportToPDF() {
		try {
			isExporting = true;

			// Capture chart images if charts are visible
			const chartImages: ChartImages = {};

			if (showCharts) {
				// Capture radar chart
				if (radarChartRef) {
					const radarImage = radarChartRef.getImageData();
					if (radarImage) {
						chartImages.radarChart = radarImage;
					}
				}

				// Capture ROC curve
				if (rocChartRef) {
					const rocImage = rocChartRef.getImageData();
					if (rocImage) {
						chartImages.rocChart = rocImage;
					}
				}

				// Capture PR curve
				if (prChartRef) {
					const prImage = prChartRef.getImageData();
					if (prImage) {
						chartImages.prChart = prImage;
					}
				}

				// Capture subgroup charts
				if (Object.keys(subgroupChartRefs).length > 0) {
					chartImages.subgroupCharts = {};
					for (const [feature, chartRef] of Object.entries(subgroupChartRefs)) {
						if (chartRef) {
							const subgroupImage = chartRef.getImageData();
							if (subgroupImage) {
								chartImages.subgroupCharts[feature] = subgroupImage;
							}
						}
					}
				}
			}

			await ValidationPDFExportService.exportResultsToPDF(
				validationJob,
				metricsData,
				modelName,
				Object.keys(chartImages).length > 0 ? chartImages : undefined
			);
		} catch (error) {
			console.error('PDF export failed:', error);
			alert('Failed to export PDF. Please try again.');
		} finally {
			isExporting = false;
		}
	}

	// Open/close modal based on isOpen prop
	$effect(() => {
		if (dialogElement) {
			if (isOpen) {
				dialogElement.showModal();
			} else {
				dialogElement.close();
			}
		}
	});

	// Load metrics when modal opens
	$effect(() => {
		if (isOpen && !metricsData && !isLoadingMetrics) {
			loadMetrics();
		}
	});

	async function loadMetrics() {
		isLoadingMetrics = true;
		metricsError = null;
		metricsErrorDetails = null;
		validationError = null;

		try {
			// Debug: Log the entire validation job structure
			console.log('ResultsModal - Full validationJob:', validationJob);
			console.log('ResultsModal - originalEvaluationData:', validationJob.originalEvaluationData);

			// Check if this is a failed validation with error details
			const evalData = validationJob.originalEvaluationData as any;
			const storedError = evalData?.data?.validation_error || evalData?.validation_error;

			if (validationJob.validation_status === 'failed' && storedError) {
				console.log('Found validation error:', storedError);
				validationError = {
					message: storedError.message || 'Validation failed',
					code: storedError.code,
					technicalDetails: storedError.technicalDetails,
					userGuidance: storedError.userGuidance
				};
				isLoadingMetrics = false;
				return;
			}

			// Check multiple possible locations for comprehensive metrics

			// Try different paths where metrics might be stored
			const possibleMetrics =
				evalData?.validation_result?.comprehensive_metrics ||
				evalData?.metrics ||
				evalData?.data?.validation_result?.comprehensive_metrics ||
				evalData?.data?.metrics;

			if (possibleMetrics) {
				console.log('Found stored comprehensive metrics:', possibleMetrics);
				metricsData = possibleMetrics;
				return;
			}

			// If validation is completed but no comprehensive metrics, check for basic metrics
			if (validationJob.validation_status === 'completed' && evalData?.data?.validation_result) {
				const validationResult = evalData.data.validation_result;

				// Try to reconstruct comprehensive metrics from stored data
				if (validationResult.validation_results?.modelValidation?.details?.metrics) {
					const metrics = validationResult.validation_results.modelValidation.details.metrics;
					console.log('Reconstructing metrics from validation results:', metrics);

					// Convert to comprehensive format
					const overall: Record<string, any> = {};
					Object.entries(metrics).forEach(([key, value]) => {
						if (typeof value === 'number') {
							overall[`performance.${key}`] = value;
						} else {
							overall[key] = value;
						}
					});

					metricsData = {
						model_info: {
							name: model?.['General Model Information']?.Title?.['@value'] || 'Unknown Model',
							type: 'classification'
						},
						overall: overall,
						threshold_metrics: validationResult.threshold_metrics,
						subgroups: validationResult.subgroups
					};
					return;
				}
			}

			// Fallback: try to use Performance metric array (legacy format)
			if (evalData?.['Performance metric'] && evalData['Performance metric'].length > 0) {
				console.log('Using legacy Performance metric format');
				const perfMetrics: Record<string, any> = {};
				for (const metric of evalData['Performance metric']) {
					const label =
						metric['Metric Label']?.['rdfs:label'] || metric['Metric Label']?.['@id'] || 'Unknown';
					const value = metric['Measured metric (mean value)']?.['@value'];
					if (value !== null && value !== undefined) {
						perfMetrics[`performance.${label.toLowerCase().replace(/\s+/g, '_')}`] =
							parseFloat(value);
					}
				}

				metricsData = {
					model_info: {
						name: model?.['General Model Information']?.Title?.['@value'] || 'Unknown Model',
						type: 'classification'
					},
					overall: perfMetrics
				};
			} else {
				metricsError = 'No metrics available for this validation';
			}
		} catch (error: any) {
			console.error('Failed to load metrics:', error);
			metricsError = error.message || 'Failed to load metrics';
		} finally {
			isLoadingMetrics = false;
		}
	}

	function formatMetricValue(value: any): string {
		if (typeof value === 'number') {
			return value.toFixed(3);
		}
		if (typeof value === 'string') {
			// If it's a JSON string, try to parse and format it nicely
			try {
				const parsed = JSON.parse(value);
				return JSON.stringify(parsed, null, 2);
			} catch {
				return value;
			}
		}
		return JSON.stringify(value, null, 2);
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

	function prepareSubgroupData(subgroups: Record<string, any>) {
		const data: Array<{ group: string; metrics: Record<string, number> }> = [];

		Object.entries(subgroups).forEach(([group, metrics]) => {
			if (typeof metrics === 'object' && metrics !== null) {
				const metricsObj = metrics as any;
				data.push({
					group,
					metrics: {
						accuracy: metricsObj['performance.accuracy'] || 0,
						precision: metricsObj['performance.precision'] || 0,
						recall: metricsObj['performance.recall'] || 0,
						f1_score: metricsObj['performance.f1_score'] || 0,
						sample_size: metricsObj.sample_size || 0
					}
				});
			}
		});

		return data;
	}

	function closeModal() {
		dispatch('close');
	}

	// Handle dialog close event (ESC key, backdrop click)
	function handleDialogClose() {
		closeModal();
	}
</script>

<dialog bind:this={dialogElement} class="modal grid-w" onclose={handleDialogClose}>
	<div class="modal-box max-w-full">
		<div class="absolute right-2 top-2 flex items-center gap-2">
			<button
				class="btn btn-outline btn-sm gap-2"
				onclick={exportToPDF}
				disabled={isExporting || isLoadingMetrics}
			>
				{#if isExporting}
					<span class="loading loading-spinner loading-xs"></span>
					Exporting...
				{:else}
					<MaterialSymbolsDownload class="h-4 w-4" />
					Export PDF
				{/if}
			</button>
			<form method="dialog">
				<button class="btn btn-circle btn-ghost btn-sm">✕</button>
			</form>
		</div>
		<h2 class="mb-6 text-2xl font-bold">Validation Results</h2>

		<div class="mb-4">
			<div class="grid grid-cols-3 gap-4">
				<!-- <div>
					<span class="text-base-content/70">Validation Name:</span>
					<span class="ml-2 font-medium">{validationJob.validation_name || 'Unknown'}</span>
				</div> -->
				<div>
					<span class="text-base-content/70">Created:</span>
					<span class="ml-2 font-medium">
						{new Date(validationJob.start_datetime).toLocaleString()}
					</span>
				</div>
				<div>
					<span class="text-base-content/70">Status:</span>
					<span class="ml-2 font-medium capitalize">{validationJob.validation_status}</span>
				</div>
				{#if (validationJob as any).end_datetime}
					<div>
						<span class="text-base-content/70">Completed:</span>
						<span class="ml-2 font-medium">
							{new Date((validationJob as any).end_datetime).toLocaleString()}
						</span>
					</div>
				{/if}
				<!-- View Toggle Controls -->
				<div class=" flex justify-end gap-2">
					<label class="label cursor-pointer gap-2">
						<input type="checkbox" class="toggle toggle-primary" bind:checked={showCharts} />
						<span class="label-text">Show Charts</span>
					</label>
					<label class="label cursor-pointer gap-2">
						<input type="checkbox" class="toggle toggle-primary" bind:checked={showTables} />
						<span class="label-text">Show Tables</span>
					</label>
				</div>
			</div>
		</div>

		<div class="max-h-[70vh] overflow-y-auto">
			{#if isLoadingMetrics}
				<div class="border-base-300 rounded-xl border p-6">
					<div class="flex items-center justify-center gap-4">
						<span class="loading loading-spinner loading-md"></span>
						<span class="text-base-content/70">Loading comprehensive metrics...</span>
					</div>
				</div>
			{:else if validationError}
				<!-- Display validation error with full details -->
				<div class="space-y-4">
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
						<div class="flex-1">
							<h3 class="font-bold">Validation Failed</h3>
							<div class="text-sm">{validationError.message}</div>
							{#if validationError.code}
								<div class="badge badge-error badge-sm mt-1">{validationError.code}</div>
							{/if}
						</div>
					</div>

					{#if validationError.userGuidance}
						<div class="alert alert-info">
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
							<div>
								<h4 class="font-semibold">What to do</h4>
								<p class="text-sm">{validationError.userGuidance}</p>
							</div>
						</div>
					{/if}

					{#if validationError.technicalDetails}
						<div class="border-base-300 rounded-xl border">
							<button
								class="flex w-full items-center justify-between p-4 text-left"
								onclick={() => (showTechnicalDetails = !showTechnicalDetails)}
							>
								<span class="font-semibold">Technical Details (Container Logs)</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 transition-transform {showTechnicalDetails ? 'rotate-180' : ''}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
							{#if showTechnicalDetails}
								<div class="border-base-300 border-t p-4">
									<pre
										class="bg-base-200 max-h-96 overflow-auto rounded-lg p-4 text-xs">{validationError.technicalDetails}</pre>
								</div>
							{/if}
						</div>
					{/if}
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
						<h3 class="font-bold">Metrics Loading Failed</h3>
						<div class="text-sm">{metricsError}</div>
					</div>
				</div>
			{:else if metricsData}
				<!-- Parse the metrics data properly based on its structure -->
				{@const hasNestedStructure = metricsData.overall?.overall_metrics}
				{@const hasSnakeCaseKeys = metricsData.overall || metricsData.threshold_metrics}
				{@const hasCamelCaseKeys =
					metricsData['Overall Metrics'] || metricsData['Threshold Metrics']}

				<!-- Handle the nested structure where overall contains both overall_metrics and threshold_metrics -->
				{@const parsedMetrics = hasNestedStructure
					? {
							overall: metricsData.overall.overall_metrics,
							threshold_metrics: metricsData.overall.threshold_metrics,
							model_info: metricsData.model_info || { name: 'Unknown', type: 'Unknown' },
							subgroups: metricsData.subgroups
						}
					: hasCamelCaseKeys
						? {
								overall:
									typeof metricsData['Overall Metrics'] === 'string'
										? JSON.parse(metricsData['Overall Metrics'])
										: metricsData['Overall Metrics'],
								threshold_metrics:
									typeof metricsData['Threshold Metrics'] === 'string'
										? JSON.parse(metricsData['Threshold Metrics'])
										: metricsData['Threshold Metrics'],
								model_info: metricsData.model_info ||
									metricsData['Model Information'] || { name: 'Unknown', type: 'Unknown' },
								subgroups: metricsData.subgroups || metricsData['Subgroups']
							}
						: metricsData}

				<div class="grid grid-cols-1 gap-8">
					<!-- Model Information -->
					<div class="border-base-300 rounded-xl border p-6">
						<h3 class="mb-4 text-lg font-semibold">Model Information</h3>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<span class="text-base-content/70">Model Name:</span>
								<span class="ml-2 font-medium">
									{parsedMetrics.model_info?.name || 'Rectum-pCR-Prediction-Clinical'}
								</span>
							</div>
							<div>
								<span class="text-base-content/70">Model Type:</span>
								<span class="ml-2 font-medium capitalize">
									{parsedMetrics.model_info?.type || 'Classification'}
								</span>
							</div>
						</div>
					</div>

					<!-- Overall Metrics -->
					{#if parsedMetrics.overall}
						{@const groupedMetrics = groupMetricsByCategory(parsedMetrics.overall)}

						<!-- Metrics Visualization Charts -->
						{#if showCharts}
							<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
								<!-- Performance Metrics Radar Chart -->
								{#if groupedMetrics.Performance && Object.keys(groupedMetrics.Performance).length > 0}
									<div class="border-base-300 rounded-xl border p-6">
										<MetricsRadarChart
											bind:this={radarChartRef}
											metrics={Object.fromEntries(
												Object.entries(parsedMetrics.overall).filter(([key]) =>
													key.startsWith('performance.')
												)
											)}
											title="Performance Metrics Overview"
											height={350}
										/>
									</div>
								{/if}

								<!-- ROC and PR Curves -->
								{#if parsedMetrics.threshold_metrics}
									<!-- ROC Curve -->
									{#if parsedMetrics.threshold_metrics.roc_curve}
										<div class="border-base-300 rounded-xl border p-6">
											<ROCCurveChart
												bind:this={rocChartRef}
												fpr={parsedMetrics.threshold_metrics.roc_curve.fpr}
												tpr={parsedMetrics.threshold_metrics.roc_curve.tpr}
												auc={parsedMetrics.threshold_metrics.roc_curve.auc}
												height={350}
											/>
										</div>
									{/if}

									<!-- PR Curve -->
									{#if parsedMetrics.threshold_metrics.pr_curve}
										<div class="border-base-300 rounded-xl border p-6">
											<PRCurveChart
												bind:this={prChartRef}
												precision={parsedMetrics.threshold_metrics.pr_curve.precision}
												recall={parsedMetrics.threshold_metrics.pr_curve.recall}
												averagePrecision={parsedMetrics.threshold_metrics.pr_curve
													.average_precision}
												height={350}
											/>
										</div>
									{/if}
								{/if}
							</div>
						{/if}

						<!-- Metrics Tables -->
						{#if showTables && Object.keys(groupedMetrics).length > 0}
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
					{/if}

					<!-- Threshold Analysis (for classification models) -->
					{#if parsedMetrics.threshold_metrics}
						{@const thresholdData = parsedMetrics.threshold_metrics}
						<div class="border-base-300 rounded-xl border p-6">
							<h3 class="mb-4 text-lg font-semibold">Threshold Analysis</h3>

							{#if thresholdData.probability_preprocessing}
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
									<span class="text-sm">{thresholdData.probability_preprocessing}</span>
								</div>
							{/if}

							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<!-- ROC Curve Info -->
								{#if thresholdData.roc_curve}
									<div class="card bg-base-200">
										<div class="card-body">
											<h4 class="card-title text-base">ROC Curve</h4>
											<div class="stats stats-vertical">
												<div class="stat">
													<div class="stat-title">AUC Score</div>
													<div class="stat-value text-2xl">
														{thresholdData.roc_curve.auc.toFixed(3)}
													</div>
												</div>
											</div>
										</div>
									</div>
								{/if}

								<!-- Precision-Recall Curve Info -->
								{#if thresholdData.pr_curve}
									<div class="card bg-base-200">
										<div class="card-body">
											<h4 class="card-title text-base">Precision-Recall Curve</h4>
											<div class="stats stats-vertical">
												<div class="stat">
													<div class="stat-title">Average Precision</div>
													<div class="stat-value text-2xl">
														{thresholdData.pr_curve.average_precision.toFixed(3)}
													</div>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Sample Threshold Metrics -->
							{#if thresholdData.threshold_metrics}
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
													{#if thresholdData.threshold_metrics[threshold]}
														{@const metrics = thresholdData.threshold_metrics[threshold]}
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
					{#if parsedMetrics.subgroups && Object.keys(parsedMetrics.subgroups).length > 0}
						<div class="border-base-300 rounded-xl border p-6">
							<h3 class="mb-4 text-lg font-semibold">Subgroup Analysis</h3>
							{#each Object.entries(parsedMetrics.subgroups) as [feature, subgroups]}
								<div class="mb-6">
									<h4 class="mb-3 text-base font-semibold capitalize">
										{feature.replace(/_/g, ' ')}
									</h4>
									{#if typeof subgroups === 'object' && subgroups !== null}
										{@const subgroupData = prepareSubgroupData(subgroups)}

										{#if showCharts && subgroupData.length > 0}
											<div class="mb-4">
												<SubgroupComparisonChart
													bind:this={subgroupChartRefs[feature]}
													{subgroupData}
													selectedMetric="accuracy"
													title={`${feature.replace(/_/g, ' ')} - Performance Comparison`}
													height={300}
												/>
											</div>
										{/if}

										{#if showTables}
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
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<!-- Display any other metrics that don't fit the standard categories -->
					{#if metricsData}
						{@const displayedKeys = [
							'model_info',
							'overall',
							'threshold_metrics',
							'subgroups',
							'Overall Metrics',
							'Threshold Metrics'
						]}
						{@const otherMetrics = Object.entries(metricsData).filter(
							([key]) => !displayedKeys.includes(key)
						)}
						{#if otherMetrics.length > 0}
							<div class="border-base-300 rounded-xl border p-6">
								<h3 class="mb-4 text-lg font-semibold">Other Metrics</h3>
								<div class="overflow-x-auto">
									<table class="table-zebra table w-full">
										<thead>
											<tr>
												<th>Metric</th>
												<th>Value</th>
											</tr>
										</thead>
										<tbody>
											{#each otherMetrics as [key, value]}
												<tr>
													<td class="font-medium">{key}</td>
													<td class="font-mono text-sm">{formatMetricValue(value)}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{:else}
				<!-- Fallback display for validations without comprehensive metrics -->
				<div class="border-base-300 rounded-xl border p-6">
					<h3 class="mb-4 text-lg font-semibold">Basic Validation Information</h3>
					<div class="grid grid-cols-1 gap-4">
						<div>
							<span class="text-base-content/70">Data Provided:</span>
							<span class="ml-2 font-medium">{validationJob.dataProvided ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span class="text-base-content/70">Data Characteristics:</span>
							<span class="ml-2 font-medium">
								{validationJob.dataCharacteristics ? 'Yes' : 'No'}
							</span>
						</div>
						<div>
							<span class="text-base-content/70">Metrics Available:</span>
							<span class="ml-2 font-medium">{validationJob.metrics ? 'Yes' : 'No'}</span>
						</div>
					</div>

					{#if validationJob.originalEvaluationData?.['Performance metric']}
						<div class="mt-6">
							<h4 class="mb-3 text-base font-semibold">Performance Metrics</h4>
							<div class="overflow-x-auto">
								<table class="table-zebra table w-full">
									<thead>
										<tr>
											<th>Metric</th>
											<th>Value</th>
										</tr>
									</thead>
									<tbody>
										{#each validationJob.originalEvaluationData['Performance metric'] as metric}
											{@const label =
												metric['Metric Label']?.['rdfs:label'] ||
												metric['Metric Label']?.['@id'] ||
												'Unknown Metric'}
											{@const value = metric['Measured metric (mean value)']?.['@value']}
											<tr>
												<td class="font-medium">{label}</td>
												<td class="font-mono">
													{value !== null && value !== undefined
														? parseFloat(value).toFixed(3)
														: 'N/A'}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}

					<div class="alert alert-info mt-6">
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
						<span class="text-sm">
							This validation was created before comprehensive metrics were implemented. Only basic
							information is available.
						</span>
					</div>
				</div>
			{/if}
		</div>

		<div class="modal-action mt-8">
			<form method="dialog">
				<button class="btn btn-primary">Close</button>
			</form>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
