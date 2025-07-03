<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UiValidationJob } from '$lib/stores/models/types';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	interface Props {
		validationJob: UiValidationJob;
		isOpen: boolean;
	}

	let { validationJob, isOpen }: Props = $props();

	// Extract comprehensive metrics from validation job
	const comprehensiveMetrics = $derived(() => {
		// Try to get metrics from the validation job's dataset_info or validation_result
		const datasetInfo = validationJob.dataset_info;
		const validationResult = (validationJob as any).validation_result;

		// Check if comprehensive metrics are stored in the validation result
		if (validationResult?.comprehensive_metrics) {
			return validationResult.comprehensive_metrics;
		}

		// If no comprehensive metrics, create a basic display from available data
		return null;
	});

	// Get the actual metrics value
	const metrics = $derived(comprehensiveMetrics);

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

	function closeModal() {
		dispatch('close');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<dialog
	id="results_modal"
	class="modal modal-bottom sm:modal-middle z-[10000] !mt-0 h-full w-full"
	class:modal-open={isOpen}
>
	<div class="modal-box bg-base-100 h-[90vh] max-h-none w-full !max-w-full p-8">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-bold">Validation Results</h2>
			<button class="btn btn-circle btn-ghost btn-sm" onclick={closeModal}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<div class="mb-4">
			<h3 class="text-lg font-semibold">Validation Information</h3>
			<div class="mt-2 grid grid-cols-2 gap-4">
				<div>
					<span class="text-base-content/70">Validation Name:</span>
					<span class="ml-2 font-medium">{validationJob.validation_name || 'Unknown'}</span>
				</div>
				<div>
					<span class="text-base-content/70">Status:</span>
					<span class="ml-2 font-medium capitalize">{validationJob.validation_status}</span>
				</div>
				<div>
					<span class="text-base-content/70">Created:</span>
					<span class="ml-2 font-medium">
						{new Date(validationJob.start_datetime).toLocaleString()}
					</span>
				</div>
				{#if (validationJob as any).end_datetime}
					<div>
						<span class="text-base-content/70">Completed:</span>
						<span class="ml-2 font-medium">
							{new Date((validationJob as any).end_datetime).toLocaleString()}
						</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="h-[calc(100%-12rem)] w-full overflow-y-auto">
			{#if comprehensiveMetrics}
				{@const metrics = comprehensiveMetrics}
				<div class="grid grid-cols-1 gap-8">
					<!-- Model Information -->
					<div class="border-base-300 rounded-xl border p-6">
						<h3 class="mb-4 text-lg font-semibold">Model Information</h3>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<span class="text-base-content/70">Model Name:</span>
								<span class="ml-2 font-medium">{metrics.model_info.name}</span>
							</div>
							<div>
								<span class="text-base-content/70">Model Type:</span>
								<span class="ml-2 font-medium capitalize">
									{metrics.model_info.type}
								</span>
							</div>
						</div>
					</div>

					<!-- Overall Metrics -->
					{#if metrics.overall}
						{@const groupedMetrics = groupMetricsByCategory(metrics.overall)}
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
					{#if metrics.threshold_metrics}
						<div class="border-base-300 rounded-xl border p-6">
							<h3 class="mb-4 text-lg font-semibold">Threshold Analysis</h3>

							{#if metrics.threshold_metrics.probability_preprocessing}
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
									<span class="text-sm">
										{metrics.threshold_metrics.probability_preprocessing}
									</span>
								</div>
							{/if}

							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<!-- ROC Curve Info -->
								{#if metrics.threshold_metrics.roc_curve}
									<div class="card bg-base-200">
										<div class="card-body">
											<h4 class="card-title text-base">ROC Curve</h4>
											<div class="stats stats-vertical">
												<div class="stat">
													<div class="stat-title">AUC Score</div>
													<div class="stat-value text-2xl">
														{metrics.threshold_metrics.roc_curve.auc.toFixed(3)}
													</div>
												</div>
											</div>
										</div>
									</div>
								{/if}

								<!-- Precision-Recall Curve Info -->
								{#if metrics.threshold_metrics.pr_curve}
									<div class="card bg-base-200">
										<div class="card-body">
											<h4 class="card-title text-base">Precision-Recall Curve</h4>
											<div class="stats stats-vertical">
												<div class="stat">
													<div class="stat-title">Average Precision</div>
													<div class="stat-value text-2xl">
														{metrics.threshold_metrics.pr_curve.average_precision.toFixed(3)}
													</div>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Sample Threshold Metrics -->
							{#if metrics.threshold_metrics.threshold_metrics}
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
													{#if metrics.threshold_metrics.threshold_metrics[threshold]}
														{@const thresholdMetrics =
															metrics.threshold_metrics.threshold_metrics[threshold]}
														<tr>
															<td class="font-mono">{threshold}</td>
															<td class="font-mono">
																{thresholdMetrics.accuracy?.toFixed(3) || 'N/A'}
															</td>
															<td class="font-mono">
																{thresholdMetrics.precision?.toFixed(3) || 'N/A'}
															</td>
															<td class="font-mono">
																{thresholdMetrics.recall?.toFixed(3) || 'N/A'}
															</td>
															<td class="font-mono">
																{thresholdMetrics.f1_score?.toFixed(3) || 'N/A'}
															</td>
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
					{#if metrics.subgroups && Object.keys(metrics.subgroups).length > 0}
						<div class="border-base-300 rounded-xl border p-6">
							<h3 class="mb-4 text-lg font-semibold">Subgroup Analysis</h3>
							{#each Object.entries(metrics.subgroups) as [feature, subgroups]}
								<div class="mb-6">
									<h4 class="mb-3 text-base font-semibold capitalize">
										{feature.replace(/_/g, ' ')}
									</h4>
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
			<button class="btn btn-primary" onclick={closeModal}>Close</button>
		</div>
	</div>

	<div class="modal-backdrop" onclick={closeModal}>
		<button>close</button>
	</div>
</dialog>
