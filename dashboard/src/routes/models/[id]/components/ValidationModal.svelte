<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		validationStore,
		type ValidationJob,
		type ValidationMode
	} from '$lib/stores/validation.store';
	import DatasetStep from './steps/DatasetStep.svelte';
	import DatasetCharacteristicsStep from './steps/DatasetCharacteristicsStep.svelte';
	import MetricsForValidationStep from './steps/MetricsForValidationStep.svelte';
	import PerformanceMetricsStep from './steps/PerformanceMetricsStep.svelte';

	const dispatch = createEventDispatcher<{
		close: void;
		validationChange: void;
	}>();

	interface Props {
		modelId?: string;
	}

	let { modelId }: Props = $props();

	let currentStep = $state(0);
	let hasChanges = $state(false);
	let initialFormData = $state({
		userName: '',
		date: '',
		datasetName: '',
		uploadedFile: null as File | null,
		datasetDescription: '',
		datasetCharacteristics: '',
		metricsDescription: '',
		performanceMetrics: ''
	});
	const steps = $state([
		{ title: 'Dataset', active: true },
		{ title: 'Dataset Characteristics', active: false },
		{ title: 'Metrics for validation', active: false }
	]);

	// Form data
	let userName = $state('');
	let date = $state('');
	let datasetName = $state('');
	let uploadedFile: File | null = $state(null);
	let datasetDescription = $state('');
	let datasetCharacteristics = $state('');
	let metricsDescription = $state('');
	let performanceMetrics = $state('');

	// Get data from store
	$effect(() => {
		const { currentValidation, mode } = $validationStore;

		if (currentValidation) {
			// Try to extract dataset information from dataset_info if available
			const datasetInfo = currentValidation.dataset_info || {};

			userName = datasetInfo.userName || '';
			date = datasetInfo.date || currentValidation.start_datetime;
			datasetName = datasetInfo.datasetName || '';
			datasetDescription = datasetInfo.description || currentValidation.datasetDescription || '';
			datasetCharacteristics = datasetInfo.characteristics || '';
			metricsDescription = currentValidation.metricsDescription || '';
			performanceMetrics = currentValidation.performanceMetrics || '';

			// Store initial values
			initialFormData = {
				userName: userName,
				date: date,
				datasetName: datasetName,
				uploadedFile: null,
				datasetDescription: datasetDescription,
				datasetCharacteristics: datasetCharacteristics,
				metricsDescription: metricsDescription,
				performanceMetrics: performanceMetrics
			};
		} else {
			// Reset form for new validation
			userName = '';
			date = '';
			datasetName = '';
			uploadedFile = null;
			datasetDescription = '';
			datasetCharacteristics = '';
			metricsDescription = '';
			performanceMetrics = '';

			// Reset initial values
			initialFormData = {
				userName: '',
				date: '',
				datasetName: '',
				uploadedFile: null,
				datasetDescription: '',
				datasetCharacteristics: '',
				metricsDescription: '',
				performanceMetrics: ''
			};
		}
		hasChanges = false;
	});

	// Track actual changes by comparing with initial values
	$effect(() => {
		if ($validationStore.mode !== 'view') {
			const currentFormData = {
				userName,
				date,
				datasetName,
				uploadedFile,
				datasetDescription,
				datasetCharacteristics,
				metricsDescription,
				performanceMetrics
			};

			const hasChanged = Object.entries(currentFormData).some(([key, value]) => {
				return value !== initialFormData[key as keyof typeof initialFormData];
			});

			if (hasChanged !== hasChanges) {
				hasChanges = hasChanged;
			}
		}
	});

	// Reset step when opening in view or create mode
	$effect(() => {
		if ($validationStore.mode === 'view' || $validationStore.mode === 'create') {
			// Reset step to first when opening in view or create mode
			currentStep = 0;
			steps.forEach((step, i) => {
				step.active = i === 0;
			});
		}
	});

	// Always start from first step when modal is opened
	$effect(() => {
		if ($validationStore.isOpen) {
			currentStep = 0;
			steps.forEach((step, i) => {
				step.active = i === 0;
			});
		}
	});

	function goToStep(stepIndex: number) {
		if (stepIndex >= 0 && stepIndex < steps.length) {
			steps[currentStep].active = false;
			currentStep = stepIndex;
			steps[currentStep].active = true;
		}
	}

	function nextStep() {
		if (currentStep < steps.length - 1) {
			steps[currentStep].active = false;
			currentStep++;
			steps[currentStep].active = true;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			steps[currentStep].active = false;
			currentStep--;
			steps[currentStep].active = true;
		}
	}

	async function closeModal() {
		if (hasChanges) {
			const confirmed = confirm('You have unsaved changes. Do you want to save before closing?');
			if (confirmed) {
				await handleSave();
			}
		}
		validationStore.closeModal();
		dispatch('close');
	}

	async function handleSubmit() {
		// Only allow submit in create/edit modes
		if ($validationStore.mode === 'view') return;

		// Save any pending changes first
		if (hasChanges) {
			await handleSave();
		}

		console.log('Submitting validation with modelId:', modelId);

		const formData = {
			userName,
			date,
			uploadedFile,
			datasetDescription,
			metricsDescription,
			performanceMetrics,
			modelId
		};

		try {
			if ($validationStore.mode === 'create') {
				const response = await fetch('/api/validations', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(formData)
				});
				const result = await response.json();
				console.log('Validation creation response:', result);

				if (!result.success) {
					throw new Error(result.error || 'Failed to create validation');
				}

				dispatch('validationChange');
				closeModal();
			} else if ($validationStore.mode === 'edit' && $validationStore.currentValidation) {
				const response = await fetch(
					`/api/validations/${$validationStore.currentValidation.val_id}`,
					{
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(formData)
					}
				);
				const result = await response.json();
				console.log('Validation update response:', result);

				if (!result.success) {
					throw new Error(result.error || 'Failed to update validation');
				}

				hasChanges = false;
				dispatch('validationChange');
				closeModal();
			}
		} catch (error) {
			console.error('Error submitting validation:', error);
			// TODO: Show error toast
		}
	}

	async function handleSave() {
		const formData = {
			userName,
			date,
			uploadedFile,
			datasetDescription,
			metricsDescription,
			performanceMetrics,
			modelId
		};

		try {
			if ($validationStore.currentValidation?.val_id) {
				await fetch(`/api/validations/${$validationStore.currentValidation.val_id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(formData)
				});
			} else {
				await fetch('/api/validations', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(formData)
				});
			}
			hasChanges = false;
			dispatch('validationChange');
		} catch (error) {
			console.error('Error saving validation:', error);
			// TODO: Show error toast
		}
	}

	async function handleResubmit() {
		if (!$validationStore.currentValidation?.val_id) return;

		const confirmed = confirm('Are you sure you want to resubmit this validation?');
		if (!confirmed) return;

		// Save any pending changes first
		if (hasChanges) {
			await handleSave();
		}

		try {
			await fetch(`/api/validations/${$validationStore.currentValidation.val_id}/resubmit`, {
				method: 'POST'
			});
			dispatch('validationChange');
			closeModal();
		} catch (error) {
			console.error('Error resubmitting validation:', error);
			// TODO: Show error toast
		}
	}

	function trackChanges() {
		if ($validationStore.mode !== 'view') {
			hasChanges = true;
		}
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			goToStep(index);
		}
	}
</script>

<dialog
	id="validation_modal"
	class="modal modal-bottom sm:modal-middle z-[10000] !mt-0 h-full w-full"
	class:modal-open={$validationStore.isOpen}
>
	<div class="modal-box bg-base-100 h-[90vh] max-h-none w-full !max-w-full p-8">
		<!-- Stepper -->
		<ul class="steps mb-8 w-full">
			{#each steps as step, i}
				<li
					class="step transition-all {step.active || i < currentStep
						? 'step-primary'
						: ''}  cursor-pointer"
					onclick={() => goToStep(i)}
					onkeydown={(e) => handleKeydown(e, i)}
					role="button"
					tabindex="0"
				>
					{step.title}
				</li>
			{/each}
		</ul>

		<!-- Content -->
		<div class="h-[calc(100%-12rem)] w-full overflow-y-auto">
			{#if currentStep === 0}
				<DatasetStep
					bind:userName
					bind:date
					bind:uploadedFile
					readonly={$validationStore.mode === 'view'}
					onFieldChange={trackChanges}
				/>
			{:else if currentStep === 1}
				<DatasetCharacteristicsStep
					bind:datasetDescription
					readonly={$validationStore.mode === 'view'}
					onFieldChange={trackChanges}
				/>
			{:else if currentStep === 2}
				<MetricsForValidationStep
					bind:metricsDescription
					bind:performanceMetrics
					readonly={$validationStore.mode === 'view'}
					onFieldChange={trackChanges}
				/>
			{/if}
		</div>

		<!-- Navigation -->
		<div class="modal-action mt-8">
			<!-- Save Changes Button -->
			{#if $validationStore.mode === 'edit'}
				<button class="btn btn-outline" onclick={handleSave}>Save Changes</button>
			{/if}

			<!-- Edit Button -->
			{#if $validationStore.mode === 'view'}
				<button class="btn btn-outline" onclick={() => validationStore.setMode('edit')}>
					Edit
				</button>
			{/if}

			<!-- Resubmit Button -->
			{#if $validationStore.currentValidation && $validationStore.mode === 'edit'}
				<button class="btn btn-primary" onclick={handleResubmit}>Resubmit Validation</button>
			{/if}

			<!-- Standard Navigation -->
			<div class="flex-1"></div>
			<!-- Close Button -->
			<button class="btn" onclick={closeModal}>Close</button>
			{#if currentStep > 0}
				<button class="btn btn-outline" onclick={prevStep}>Previous</button>
			{/if}
			{#if currentStep < steps.length - 1}
				<button class="btn btn-primary" onclick={nextStep}>Next</button>
			{:else if $validationStore.mode !== 'view'}
				<button class="btn btn-primary" onclick={handleSubmit}>Submit</button>
			{/if}
		</div>
	</div>

	<div class="modal-backdrop" onclick={closeModal}>
		<button>close</button>
	</div>
</dialog>
