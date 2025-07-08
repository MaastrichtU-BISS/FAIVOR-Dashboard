<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import MaterialSymbolsArrowBack from '~icons/material-symbols/arrow-back';
	import MaterialSymbolsScreenshotMonitorOutline from '~icons/material-symbols/screenshot-monitor-outline';
	import MaterialSymbolsCheckCircleOutline from '~icons/material-symbols/check-circle-outline';
	import MaterialSymbolsClose from '~icons/material-symbols/close';
	import MaterialSymbolsMoreVert from '~icons/material-symbols/more-vert';
	import MaterialSymbolsContentCopyOutline from '~icons/material-symbols/content-copy-outline';
	import MaterialSymbolsDeleteOutline from '~icons/material-symbols/delete-outline';
	import ValidationModal from './components/ValidationModal.svelte';
	import ResultsModal from './components/ResultsModal.svelte';
	import { validationStore } from '$lib/stores/models/validation.store';
	import type {
		FullJsonLdModel,
		UiValidationJob,
		JsonLdEvaluationResultItem
	} from '$lib/stores/models/types';
	import toast from 'svelte-french-toast';
	import MaterialSymbolsSettingsSuggestRounded from '~icons/material-symbols/settings-suggest-rounded';
	import MaterialSymbolsAutoGraphRounded from '~icons/material-symbols/auto-graph-rounded';
	import MaterialSymbolsVisibilityOutline from '~icons/material-symbols/visibility-outline';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		data: PageData; // PageData likely contains the initial model data
	}

	let { data: pageRouteData }: Props = $props(); // Renamed to avoid conflict
	let modelData = $state(pageRouteData.model as FullJsonLdModel); // Cast to new type

	let showResultsModal = $state(false);
	let showValidationModal = $state(false);
	let selectedValidation: UiValidationJob | null = $state(null);
	let currentValidationJob: UiValidationJob | null = $state(null);
	let refreshInterval: number | null = null;

	// Auto-refresh validations while any are running
	$effect(() => {
		const hasRunningValidations = validationJobs.some((job) => job.validation_status === 'running');

		if (hasRunningValidations && !refreshInterval) {
			// Refresh every 3 seconds while validations are running
			refreshInterval = window.setInterval(() => {
				refreshModelData();
			}, 3000);
		} else if (!hasRunningValidations && refreshInterval) {
			// Stop refreshing when no validations are running
			window.clearInterval(refreshInterval);
			refreshInterval = null;
		}
	});

	onDestroy(() => {
		if (refreshInterval) {
			window.clearInterval(refreshInterval);
		}
	});

	const handleGoBack = () => {
		goto('/models');
	};

	const handleDownloadCsv = () => {
		// TODO: Implement CSV download functionality
		console.log('Downloading CSV...');
	};

	let validationJobs = $derived<UiValidationJob[]>(
		modelData?.['Evaluation results1'] && Array.isArray(modelData['Evaluation results1'])
			? modelData['Evaluation results1']
					.map((evalItem: JsonLdEvaluationResultItem, index: number): UiValidationJob => {
						const val_id = evalItem['@id'] || `eval-${index}-${Date.now()}`;
						const name = evalItem['User Note']?.['@value'] || `Evaluation ${val_id.slice(-6)}`;
						const startDate = evalItem['pav:createdOn'] || new Date().toISOString();

						// Use validation_status from backend if available, otherwise infer from data
						let status: UiValidationJob['validation_status'] =
							(evalItem as any).validation_status || 'unknown';

						// Check for performance metrics and dataset characteristics
						const hasPerformanceMetrics =
							evalItem['Performance metric'] &&
							evalItem['Performance metric'].length > 0 &&
							evalItem['Performance metric'].some(
								(pm) => pm['Measured metric (mean value)']?.['@value'] !== null
							);
						const hasDatasetChars =
							evalItem['Dataset characteristics'] &&
							evalItem['Dataset characteristics'].length > 0 &&
							evalItem['Dataset characteristics'].some(
								(dc) =>
									dc['The number of subject for evaluation']?.['@value'] !== null ||
									dc.Volume?.['@value'] !== null
							);

						// If no explicit status, infer from data (for backward compatibility)
						if (status === 'unknown') {
							if (hasPerformanceMetrics && hasDatasetChars) {
								status = 'completed';
							} else if (hasDatasetChars) {
								status = 'running'; // Or some other intermediate state like 'data_uploaded'
							} else {
								status = 'pending';
							}
						}

						const deleted_at = (evalItem as any).deleted_at || null;
						// Extract dataset_info if it was merged by the API
						const dataset_info = (evalItem as any).dataset_info || undefined;

						return {
							val_id: val_id,
							validation_name: name,
							start_datetime: startDate,
							validation_status: status,
							dataProvided: hasDatasetChars,
							dataCharacteristics:
								hasDatasetChars &&
								(evalItem['Dataset characteristics']?.some(
									(dc) =>
										dc.Volume?.['@value'] || dc['The number of subject for evaluation']?.['@value']
								) ??
									false),
							metrics: hasPerformanceMetrics,
							published: false, // This needs specific logic if it's a feature
							userName: evalItem['user/hospital']?.['@value'] || undefined,
							originalEvaluationData: evalItem,
							deleted_at: deleted_at,
							dataset_info: dataset_info // Add dataset_info to UiValidationJob
						};
					})
					.filter((v) => !v.deleted_at)
					.sort((a, b) => {
						return new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime();
					})
			: []
	);

	function openNewValidation() {
		validationStore.openModal(undefined, 'create');
		showValidationModal = true;
	}

	function openValidation(validation: UiValidationJob) {
		selectedValidation = validation;
		validationStore.openModal(validation as any, 'view'); // Pass entire UiValidationJob
		showValidationModal = true;
	}

	function openResults(validation: UiValidationJob) {
		currentValidationJob = validation;
		showResultsModal = true;
	}

	async function refreshModelData() {
		const checkpointId = modelData.checkpoint_id; // This is the ID our API route /api/models/[id] expects

		if (!checkpointId) {
			console.error('Cannot refresh model data: Missing model checkpoint_id.');
			toast.error('Could not refresh model data: Checkpoint identifier missing.');
			return;
		}

		const idToFetch = checkpointId; // Always use checkpoint_id

		console.log('Refreshing model data for ID (checkpoint_id):', idToFetch);
		try {
			const response = await fetch(`/api/models/${idToFetch}`);
			if (!response.ok) {
				const errorText = await response.text();
				console.error('Failed to refresh model data:', response.status, errorText);
				toast.error(`Failed to refresh model: ${response.statusText}`);
				return;
			}

			const responseData = await response.json();
			console.log('Received updated model data:', responseData);

			if (responseData.success && responseData.model) {
				modelData = responseData.model as FullJsonLdModel;
				console.log('Updated model data:', modelData);
				// toast.success('Model data refreshed!');
			} else {
				console.error('Invalid response format or error in fetching model:', responseData);
				toast.error('Error in fetched model data.');
			}
		} catch (error) {
			console.error('Network or other error refreshing model data:', error);
			toast.error('Network error refreshing model data.');
		}
	}

	async function handleValidationChange() {
		console.log('Validation change event received');
		await refreshModelData();
	}

	function handleModalClose() {
		showValidationModal = false;
		selectedValidation = null;
	}

	async function handleDeleteValidation(validationId: string) {
		console.log('🎹 Deleting validation with ID:', validationId);

		if (confirm('Are you sure you want to delete this validation?')) {
			try {
				if (modelData['Evaluation results1']) {
					modelData['Evaluation results1'] = modelData['Evaluation results1'].map((evalItem) => {
						const current_eval_id =
							evalItem['@id'] ||
							`eval-${modelData['Evaluation results1']!.indexOf(evalItem)}-${Date.now()}`;
						if (current_eval_id === validationId) {
							return {
								...evalItem,
								deleted_at: new Date().toISOString()
							} as JsonLdEvaluationResultItem;
						}
						return evalItem;
					});
				}

				const response = await fetch(`/api/validations/${validationId}`, {
					method: 'DELETE'
				});
				if (!response.ok) {
					throw new Error('Failed to delete validation');
				}
				toast.success('Validation deleted successfully!');
				await refreshModelData(); // Refresh to get the definitive state from backend
			} catch (error) {
				console.error('Error deleting validation:', error);
				toast.error('Failed to delete validation.');
				// Potentially revert optimistic update if needed, or rely on next refresh
				await refreshModelData();
			}
		}
	}
</script>

<div class="container mx-auto space-y-8 p-4">
	<div class="flex justify-between">
		<button class="btn btn-ghost gap-2" onclick={handleGoBack}>
			<MaterialSymbolsArrowBack class="h-6 w-6" />
			Go Back
		</button>
		<button class="btn btn-primary" onclick={openNewValidation}>New Validation</button>
	</div>

	<div class="flex items-start gap-4">
		<div class="bg-base-200 flex h-16 w-16 items-center justify-center rounded-lg">
			<MaterialSymbolsScreenshotMonitorOutline class="h-8 w-8" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">
				{modelData['General Model Information']?.Title?.['@value'] ||
					modelData['General Model Information']?.Description?.['@value'] ||
					modelData['@id'] ||
					'Model Details'}
			</h1>
			<p class="text-base-content/70">
				{modelData['General Model Information']?.Description?.['@value'] ||
					modelData['General Model Information']?.['Editor Note']?.['@value'] ||
					'No description available.'}
			</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#if modelData['Applicability criteria'] && Array.isArray(modelData['Applicability criteria'])}
					{#each modelData['Applicability criteria'] as criteria}
						{#if criteria?.['@value']}
							<span class="badge badge-outline">{criteria['@value']}</span>
						{/if}
					{/each}
				{/if}
			</div>
			<div class="text-base-content/70 mt-4 text-sm">
				{#if modelData['Primary intended use(s)']?.[0]?.['@value']}
					<p>
						<strong>Primary Use:</strong>
						{modelData['Primary intended use(s)']?.[0]?.['@value']}
					</p>
				{/if}
				{#if modelData['@id']}
					<p>
						<strong>Repository:</strong>
						<a href={modelData['@id']} target="_blank" rel="noopener noreferrer" class="link">
							{modelData['@id']}
						</a>
					</p>
				{/if}
				{#if modelData['General Model Information']?.['References to papers']?.[0]?.['@value']}
					<p>
						<strong>Paper:</strong>
						<a
							href={modelData['General Model Information']?.['References to papers']?.[0]?.[
								'@value'
							]}
							target="_blank"
							rel="noopener noreferrer"
							class="link"
						>
							View Paper
						</a>
					</p>
				{/if}
			</div>
		</div>
	</div>

	<div>
		<table class="table">
			<thead>
				<tr>
					<th>Validation Jobs</th>
					<th>Last modified</th>
					<th>Data provided</th>
					<th>Data characteristics</th>
					<th>Validation status</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#if validationJobs.length === 0}
					<tr>
						<td colspan="6" class="text-base-content/70 text-center">
							No validations yet. Click the button below to start a new validation.
						</td>
					</tr>
				{:else}
					{#each validationJobs as job (job.val_id)}
						<tr class="hover cursor-pointer">
							<td class="font-bold" onclick={() => openValidation(job)}>
								{job.validation_name || `Validation ${job.val_id.slice(-6)}`}
							</td>
							<td onclick={() => openValidation(job)}>
								{new Date(job.start_datetime).toLocaleDateString()}
							</td>
							<td onclick={() => openValidation(job)}>
								<div class="w-8">
									{#if job.dataProvided}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td onclick={() => openValidation(job)}>
								<div class="w-8">
									{#if job.dataCharacteristics}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td>
								{#if job.validation_status === 'running'}
									<div class="flex items-center gap-2">
										<span class="loading loading-spinner loading-sm"></span>
										<span class="text-sm">Processing...</span>
									</div>
								{:else if job.validation_status === 'failed'}
									<div class="badge badge-error gap-2">
										<MaterialSymbolsClose class="h-4 w-4" />
										Failed
									</div>
								{:else if job.validation_status === 'completed'}
									<div class="badge badge-success gap-2">
										<MaterialSymbolsCheckCircleOutline class="h-4 w-4" />
										100%
									</div>
								{:else if job.metrics}
									<div class="badge badge-success gap-2">
										<MaterialSymbolsCheckCircleOutline class="h-4 w-4" />
										100%
									</div>
								{:else if job.dataCharacteristics}
									<div class="badge badge-warning gap-2">66%</div>
								{:else if job.dataProvided}
									<div class="badge badge-warning gap-2">33%</div>
								{:else}
									<div class="badge badge-ghost gap-2">0%</div>
								{/if}
							</td>
							<td onclick={() => openValidation(job)}>
								<button class="btn">
									<MaterialSymbolsVisibilityOutline /> View
								</button>
							</td>
							<td>
								<button
									class="btn"
									onclick={() => openResults(job)}
									disabled={job.validation_status === 'running' ||
										job.validation_status === 'pending' ||
										(!job.metrics && job.validation_status !== 'completed')}
								>
									<MaterialSymbolsAutoGraphRounded /> Results
								</button>
							</td>
							<td>
								<div class="dropdown dropdown-end">
									<button tabindex="0" class="btn btn-ghost btn-circle">
										<MaterialSymbolsMoreVert class="h-5 w-5" />
									</button>
									<ul
										tabindex="0"
										class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow"
									>
										<!-- <li class="disabled">
											<button class="flex items-center gap-2">
												<MaterialSymbolsContentCopyOutline class="h-5 w-5" />Duplicate
											</button>
										</li> -->
										<li>
											<button
												class="flex items-center gap-2"
												onclick={(event) => {
													event.stopPropagation();
													handleDeleteValidation(job.val_id);
												}}
											>
												<MaterialSymbolsDeleteOutline class="h-5 w-5" />Delete
											</button>
										</li>
									</ul>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if showValidationModal}
		<ValidationModal
			modelId={modelData.checkpoint_id || modelData['@id']}
			model={modelData as any}
			on:close={handleModalClose}
			on:validationChange={handleValidationChange}
		/>
	{/if}

	{#if showResultsModal && currentValidationJob}
		<ResultsModal
			validationJob={currentValidationJob}
			isOpen={showResultsModal}
			model={modelData}
			on:close={() => (showResultsModal = false)}
		/>
	{/if}
</div>
