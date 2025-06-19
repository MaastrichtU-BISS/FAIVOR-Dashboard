<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import MaterialSymbolsClose from '~icons/material-symbols/close';
	import type { UiValidationJob, JsonLdPerformanceMetricItem } from '$lib/stores/models/types';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	interface Props {
		validationJob: UiValidationJob | null;
		isOpen: boolean;
	}

	let { validationJob, isOpen }: Props = $props();

	function closeModal() {
		dispatch('close');
	}

	function handleExportReport() {
		// TODO: Implement export report functionality
		console.log('Exporting report...');
	}

	function handleUploadResults() {
		// TODO: Implement upload results functionality
		console.log('Uploading results...');
	}
</script>

<dialog
	id="results_modal"
	class="modal modal-bottom sm:modal-middle z-[10000] !mt-0 h-full w-full"
	class:modal-open={isOpen}
>
	<div class="modal-box bg-base-100 h-[90vh] max-h-none w-full !max-w-full p-8">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-bold">Performance metrics</h2>
			<button class="btn btn-outline" onclick={handleExportReport}>Export report</button>
		</div>

		<!-- Metrics Visualization -->
		<div class="border-base-300 mb-4 flex h-[60%] flex-col overflow-y-auto rounded-lg border p-4">
			{#if validationJob?.originalEvaluationData?.['Performance metric'] && validationJob.originalEvaluationData['Performance metric'].length > 0}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="card bg-base-200">
						<div class="card-body">
							<h4 class="card-title text-sm">Performance Metrics</h4>
							<div class="space-y-2">
								{#each validationJob.originalEvaluationData['Performance metric'] as metricItem (metricItem['Metric Label'] && '@id' in metricItem['Metric Label'] ? metricItem['Metric Label']['@id'] : Math.random())}
									{@const metricLabelObj = metricItem['Metric Label']}
									{@const label =
										metricLabelObj &&
										'rdfs:label' in metricLabelObj &&
										typeof metricLabelObj['rdfs:label'] === 'string'
											? metricLabelObj['rdfs:label']
											: metricLabelObj &&
												  '@id' in metricLabelObj &&
												  typeof metricLabelObj['@id'] === 'string'
												? metricLabelObj['@id']
												: 'Unnamed Metric'}
									{@const value = metricItem['Measured metric (mean value)']?.['@value']}
									{@const lowerBound =
										metricItem['Measured metric (lower bound of the 95% confidence interval)']?.[
											'@value'
										]}
									{@const upperBound =
										metricItem['Measured metric (upper bound of the 95% confidence interval)']?.[
											'@value'
										]}
									{@const additionalInfo =
										metricItem['Additional information (if needed)']?.['@value']}
									<div class="flex justify-between">
										<span class="text-sm font-medium">{label}:</span>
										<span class="text-sm">
											{value !== null && value !== undefined ? parseFloat(value).toFixed(4) : 'N/A'}
											{#if lowerBound !== null && lowerBound !== undefined && upperBound !== null && upperBound !== undefined}
												<span class="text-base-content/70 text-xs">
													({parseFloat(lowerBound).toFixed(3)} - {parseFloat(upperBound).toFixed(
														3
													)})
												</span>
											{/if}
										</span>
									</div>
									{#if additionalInfo}
										<div class="text-base-content/70 pl-2 text-xs">- {additionalInfo}</div>
									{/if}
								{/each}
							</div>
						</div>
					</div>
					<!-- Placeholder for other metric types if they exist in JSON-LD, e.g., Fairness, Bias, Explainability -->
				</div>
			{:else}
				<div class="flex h-full items-center justify-center">
					<p class="text-base-content/70">No performance metrics available for this validation.</p>
				</div>
			{/if}
		</div>

		<!-- Output Message and Custom Comments -->
		<div class="mb-4 grid grid-cols-2 gap-4">
			<div>
				<h3 class="mb-2 text-lg font-semibold">User Note / Output Message</h3>
				<textarea
					class="textarea textarea-bordered h-24 w-full"
					placeholder="Notes or logs related to the validation"
					readonly
					value={validationJob?.originalEvaluationData?.['User Note']?.['@value'] || ''}
				></textarea>
			</div>
			<div>
				<h3 class="mb-2 text-lg font-semibold">Custom comments (Not from FAIR Model data)</h3>
				<textarea
					class="textarea textarea-bordered h-24 w-full"
					placeholder="Enter custom comments here"
					value={''}
				></textarea>
			</div>
		</div>

		<!-- Check and Upload -->
		<div class="mb-4 flex items-center gap-4">
			<p class="text-lg font-semibold">Check and upload model validation results</p>
			<button class="btn btn-outline" onclick={handleUploadResults}>Upload results</button>
		</div>

		<!-- Close Button -->
		<div class="modal-action">
			<button class="btn" onclick={closeModal}>Close</button>
		</div>
	</div>

	<div class="modal-backdrop" onclick={closeModal}>
		<button>close</button>
	</div>
</dialog>
