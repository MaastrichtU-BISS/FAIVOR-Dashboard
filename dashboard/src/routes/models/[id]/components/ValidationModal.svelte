<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		validationStore,
		type ValidationJob,
		type ValidationMode
	} from '$lib/stores/models/validation.store';
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import type { ValidationFormData } from '$lib/types/validation';
	import {
		validationJobToFormData,
		formDataToValidationData
	} from '$lib/utils/validation-transform';
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
	let isSubmitting = $state(false);
	let autoSaveTimeout: ReturnType<typeof setTimeout> | null = $state(null);
	let isSaving = $state(false);
	let initialFormData = $state<ValidationFormData>({
		validationName: '',
		userName: '',
		date: '',
		datasetName: '',
		uploadedFile: null,
		uploadedFolder: undefined,
		folderName: '',
		datasetDescription: '',
		datasetCharacteristics: '',
		metricsDescription: '',
		performanceMetrics: '',
		modelId: modelId
	});

	const steps = $state([
		{ title: 'Dataset', active: true },
		{ title: 'Dataset Characteristics', active: false },
		{ title: 'Metrics for validation', active: false }
	]);

	// Use the validation form store for all form data
	$effect(() => {
		const { currentValidation, mode } = $validationStore;

		if (currentValidation) {
			// Use utility function to transform validation data to form data
			const formData = validationJobToFormData(currentValidation);
			// Load data into the form store
			validationFormStore.loadFormData({ ...formData, modelId: modelId });
			// Store initial values for change tracking
			initialFormData = { ...formData, modelId: modelId };
		} else {
			// Reset form for new validation
			validationFormStore.reset();
			validationFormStore.updateField('modelId', modelId);

			const emptyFormData: ValidationFormData = {
				validationName: '',
				userName: '',
				date: '',
				datasetName: '',
				uploadedFile: null,
				uploadedFolder: undefined,
				folderName: '',
				datasetDescription: '',
				datasetCharacteristics: '',
				metricsDescription: '',
				performanceMetrics: '',
				modelId: modelId
			};
			initialFormData = emptyFormData;
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

	// Auto-save functionality for edit mode
	async function autoSave() {
		// Only auto-save in edit mode with existing validation
		if (
			$validationStore.mode !== 'edit' ||
			!$validationStore.currentValidation?.val_id ||
			isSaving
		) {
			return;
		}

		isSaving = true;

		try {
			// Get form data from the store
			const formData = validationFormStore.getFormData();

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

			if (!result.success) {
				console.error('Auto-save failed:', result.error);
				// Optionally, show a toast or error indicator here
			} else {
				dispatch('validationChange');
			}
		} catch (error) {
			console.error('Auto-save error:', error);
			// Optionally, show a toast or error indicator here
		} finally {
			isSaving = false;
		}
	}

	// Debounced auto-save function
	function debouncedAutoSave() {
		if (autoSaveTimeout) {
			clearTimeout(autoSaveTimeout);
		}
		autoSaveTimeout = setTimeout(() => {
			autoSave();
		}, 500);
	}

	// Alias for debouncedAutoSave to match expected function name
	const scheduleAutoSave = debouncedAutoSave;

	// Watch for form field changes and trigger auto-save
	$effect(() => {
		if ($validationStore.mode === 'edit' && $validationStore.currentValidation?.val_id) {
			// Create a reactive dependency on the form store
			const formState = $validationFormStore;
			debouncedAutoSave();
		}
	});

	// Cleanup timeout on component unmount
	$effect(() => {
		return () => {
			if (autoSaveTimeout) {
				clearTimeout(autoSaveTimeout);
			}
		};
	});

	async function closeModal() {
		validationStore.closeModal();
		dispatch('close');
	}

	async function handleSubmit() {
		// Prevent double submissions
		if (isSubmitting) return;

		// Only allow submit in create/edit modes
		if ($validationStore.mode === 'view') return;

		isSubmitting = true;

		try {
			console.log('Submitting validation with modelId:', modelId);

			// Get form data from the store (includes files with correct sizes)
			const formData = validationFormStore.getFormData();

			// Generate default validation name if not provided
			if (!formData.validationName.trim()) {
				formData.validationName = `Validation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
			}

			console.log('📤 Submitting form data from store:', formData);

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

				dispatch('validationChange');
				closeModal();
			}
		} catch (error) {
			console.error('Error submitting validation:', error);
			// TODO: Show error toast
		} finally {
			isSubmitting = false;
		}
	}

	async function handleResubmit() {
		if (!$validationStore.currentValidation?.val_id) return;

		const confirmed = confirm('Are you sure you want to resubmit this validation?');
		if (!confirmed) return;

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
		<!-- Header with auto-save indicator -->
		{#if $validationStore.mode === 'edit' && isSaving}
			<div class="text-base-content/70 mb-4 flex items-center gap-2 text-sm">
				<span class="loading loading-spinner loading-xs"></span>
				<span>Auto-saving...</span>
			</div>
		{/if}

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
				<DatasetStep readonly={$validationStore.mode === 'view'} onFieldChange={scheduleAutoSave} />
			{:else if currentStep === 1}
				<DatasetCharacteristicsStep readonly={$validationStore.mode === 'view'} />
			{:else if currentStep === 2}
				<MetricsForValidationStep readonly={$validationStore.mode === 'view'} />
			{/if}
		</div>

		<!-- Navigation -->
		<div class="modal-action mt-8">
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
				<button class="btn btn-primary" onclick={handleSubmit} disabled={isSubmitting}>
					{isSubmitting ? 'Submitting...' : 'Submit'}
				</button>
			{/if}
		</div>
	</div>

	<div class="modal-backdrop" onclick={closeModal}>
		<button>close</button>
	</div>
</dialog>
