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
	import { validationStore } from '$lib/stores/validation.store';

	interface Props {
		data: PageData;
	}

	let showResultsModal = $state(false);
	let showValidationModal = $state(false);
	let selectedValidation: ValidationJob | null = $state(null);
	let currentValidationJob: ValidationJob | null = $state(null);

	import type { Model } from '$lib/stores/models/types';
	import toast from 'svelte-french-toast';
	import MaterialSymbolsSettingsSuggestRounded from '~icons/material-symbols/settings-suggest-rounded';
	import MaterialSymbolsAutoGraphRounded from '~icons/material-symbols/auto-graph-rounded';
	let { data }: Props = $props();
	let modelData = $state(data.model);
	let typedModel = $derived(modelData as Model);

	const handleGoBack = () => {
		goto('/models');
	};

	const handleDownloadCsv = () => {
		// TODO: Implement CSV download functionality
		console.log('Downloading CSV...');
	};

	interface ValidationJob {
		val_id: string;
		validation_name?: string;
		start_datetime: string;
		validation_status: 'pending' | 'running' | 'completed' | 'failed';
		validation_result?: {
			dataProvided?: boolean;
			dataCharacteristics?: boolean;
			metrics?: boolean;
			published?: boolean;
		};
		userName?: string;
		datasetDescription?: string;
		metricsDescription?: string;
		performanceMetrics?: string;
	}

	let validationJobs = $derived(
		typedModel.validations?.all
			? typedModel.validations.all
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

	function openValidation(validation: ValidationJob) {
		selectedValidation = validation;
		validationStore.openModal(validation, 'view');
		showValidationModal = true;
	}

	function openResults(validation: ValidationJob) {
		currentValidationJob = validation;
		showResultsModal = true;
	}

	async function refreshModelData() {
		console.log('Refreshing model data for:', typedModel.checkpoint_id);
		const response = await fetch(`/api/models/${typedModel.checkpoint_id}`);
		if (!response.ok) {
			console.error('Failed to refresh model data:', response.statusText);
			return;
		}

		const data = await response.json();
		console.log('Received updated model data:', data);

		if (data.success && data.model) {
			// Use the validations directly from the API as they're already transformed
			modelData = data.model;

			console.log('Updated model data:', modelData);
			console.log('Updated validationJobs:', validationJobs);
		} else {
			console.error('Invalid response format:', data);
		}
	}

	async function handleValidationChange() {
		console.log('Validation change event received');
		await refreshModelData();
	}

	// Modal event handlers
	function handleModalClose() {
		// Only refresh model data if a validation was actually changed (handled by validationChange event)
		showValidationModal = false;
		selectedValidation = null;
	}

	async function handleDeleteValidation(validationId: string) {
		console.log('🎹 Deleting validation with ID:', validationId);

		if (confirm('Are you sure you want to delete this validation?')) {
			try {
				if (typedModel.validations?.all) {
					const updatedValidations = typedModel.validations.all.map((v) => {
						const validation = { ...v };
						if (validation.val_id.toString() === validationId) {
							validation.deleted_at = new Date().toISOString();
						}
						return validation;
					});
					modelData = {
						...modelData,
						validations: {
							...modelData.validations,
							all: updatedValidations
						}
					};
				}
				const response = await fetch(`/api/validations/${validationId}`, {
					method: 'DELETE'
				});
				if (!response.ok) {
					throw new Error('Failed to delete validation');
				}
				toast.success('Validation deleted successfully!');
				await refreshModelData();
			} catch (error) {
				console.error('Error deleting validation:', error);
				toast.error('Failed to delete validation.');
			}
		}
	}
</script>

<div class="container mx-auto space-y-8 p-4">
	<div class="flex justify-between">
		<!-- Back Button -->
		<button class="btn btn-ghost gap-2" onclick={handleGoBack}>
			<MaterialSymbolsArrowBack class="h-6 w-6" />
			Go Back
		</button>

		<!-- Add Validation Job Button -->
		<button class="btn btn-primary" onclick={openNewValidation}>New Validation</button>
	</div>

	<!-- Model Header -->
	<div class="flex items-start gap-4">
		<div class="bg-base-200 flex h-16 w-16 items-center justify-center rounded-lg">
			<MaterialSymbolsScreenshotMonitorOutline class="h-8 w-8" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">{typedModel.fair_model_id}</h1>
			<p class="text-base-content/70">{typedModel.description}</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#if typedModel.metadata.applicabilityCriteria}
					{#each typedModel.metadata.applicabilityCriteria as criteria}
						<span class="badge badge-outline">{criteria}</span>
					{/each}
				{/if}
			</div>
			<div class="text-base-content/70 mt-4 text-sm">
				<p>
					<strong>Primary Use:</strong>
					{typedModel.metadata.primaryIntendedUse}
				</p>
				<p>
					<strong>Repository:</strong>
					<a
						href={typedModel.fair_model_url}
						target="_blank"
						rel="noopener noreferrer"
						class="link"
					>
						{typedModel.fair_model_url}
					</a>
				</p>
				{#if typedModel.metadata.reference.paper}
					<p>
						<strong>Paper:</strong>
						<a
							href={typedModel.metadata.reference.paper}
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

	<!-- Validation Jobs Table -->
	<div>
		<table class="table">
			<thead>
				<tr>
					<th>Validation Jobs</th>
					<th>Last modified</th>
					<th>Data provided</th>
					<th>Data characteristics</th>
					<th>Metrics</th>
					<th>Published</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#if validationJobs.length === 0}
					<tr>
						<td colspan="7" class="text-base-content/70 text-center">
							No validations yet. Click the button below to start a new validation.
						</td>
					</tr>
				{:else}
					{#each validationJobs as job}
						<tr class="hover cursor-pointer">
							<td class="font-bold" onclick={() => openValidation(job)}>
								{job.validation_name || `Validation ${job.val_id}`}
							</td>
							<td onclick={() => openValidation(job)}>
								{new Date(job.start_datetime).toLocaleDateString()}
							</td>
							<td onclick={() => openValidation(job)}>
								<div class="w-8">
									{#if job.validation_result?.dataProvided}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td onclick={() => openValidation(job)}>
								<div class="w-8">
									{#if job.validation_result?.dataCharacteristics}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td onclick={() => openValidation(job)}>
								<div class="w-8">
									{#if job.validation_result?.metrics}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td onclick={() => openValidation(job)}>
								<div class="w-8">
									{#if job.validation_result?.published}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td onclick={() => openValidation(job)}>
								<button class="btn">
									<MaterialSymbolsSettingsSuggestRounded /> Edit
								</button>
							</td>
							<td onclick={() => openResults(job)}>
								<button class="btn"><MaterialSymbolsAutoGraphRounded /> Results</button>
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
										<li class="disabled">
											<button class="flex items-center gap-2">
												<MaterialSymbolsContentCopyOutline class="h-5 w-5" />Duplicate
											</button>
										</li>
										<li>
											<button
												class="flex items-center gap-2"
												onclick={() => handleDeleteValidation(job.val_id)}
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

	<ValidationModal
		modelId={typedModel.checkpoint_id}
		on:close={handleModalClose}
		on:validationChange={handleValidationChange}
	/>

	{#if showResultsModal}
		<ResultsModal
			validationJob={currentValidationJob}
			isOpen={showResultsModal}
			on:close={() => (showResultsModal = false)}
		/>
	{/if}
</div>
