<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import MaterialSymbolsClose from '~icons/material-symbols/close';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	import type { ValidationJob } from '$lib/types/validation';

	interface Props {
		validationJob: ValidationJob | null;
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
		<div class="border-base-300 mb-4 flex h-[60%] flex-col rounded-lg border p-4">
			{#if validationJob?.validation_result}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#if validationJob.validation_result.performance_metrics}
						<div class="card bg-base-200">
							<div class="card-body">
								<h4 class="card-title text-sm">Performance Metrics</h4>
								<div class="space-y-2">
									{#each Object.entries(validationJob.validation_result.performance_metrics) as [key, value]}
										<div class="flex justify-between">
											<span class="text-sm font-medium">{key}:</span>
											<span class="text-sm">
												{typeof value === 'number' ? value.toFixed(4) : value}
											</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					{#if validationJob.validation_result.fairness_metrics}
						<div class="card bg-base-200">
							<div class="card-body">
								<h4 class="card-title text-sm">Fairness Metrics</h4>
								<div class="space-y-2">
									{#each Object.entries(validationJob.validation_result.fairness_metrics) as [key, value]}
										<div class="flex justify-between">
											<span class="text-sm font-medium">{key}:</span>
											<span class="text-sm">
												{typeof value === 'number' ? value.toFixed(4) : value}
											</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					{#if validationJob.validation_result.bias_detection}
						<div class="card bg-base-200">
							<div class="card-body">
								<h4 class="card-title text-sm">Bias Detection</h4>
								<div class="space-y-2">
									{#each Object.entries(validationJob.validation_result.bias_detection) as [key, value]}
										<div class="flex justify-between">
											<span class="text-sm font-medium">{key}:</span>
											<span class="text-sm">
												{typeof value === 'number' ? value.toFixed(4) : value}
											</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					{#if validationJob.validation_result.explainability}
						<div class="card bg-base-200">
							<div class="card-body">
								<h4 class="card-title text-sm">Explainability</h4>
								<div class="space-y-2">
									{#each Object.entries(validationJob.validation_result.explainability) as [key, value]}
										<div class="flex justify-between">
											<span class="text-sm font-medium">{key}:</span>
											<span class="text-sm">
												{typeof value === 'number' ? value.toFixed(4) : value}
											</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex h-full items-center justify-center">
					<p class="text-base-content/70">No validation results available</p>
				</div>
			{/if}
		</div>

		<!-- Output Message and Custom Comments -->
		<div class="mb-4 grid grid-cols-2 gap-4">
			<div>
				<h3 class="mb-2 text-lg font-semibold">Output message</h3>
				<textarea
					class="textarea textarea-bordered h-24 w-full"
					placeholder="The model validation results were successfully uploaded / Logs of errors"
					readonly
					value={validationJob?.validation_result?.performance_description || ''}
				></textarea>
			</div>
			<div>
				<h3 class="mb-2 text-lg font-semibold">Custom comments</h3>
				<textarea
					class="textarea textarea-bordered h-24 w-full"
					placeholder="Comments textarea"
					value={validationJob?.validation_result?.metrics_description || ''}
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
