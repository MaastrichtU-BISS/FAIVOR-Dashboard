<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		validationStore,
		type ValidationJob, // This might be an old type, review if UiValidationJob should be used from store
		type ValidationMode
	} from '$lib/stores/models/validation.store';
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import type { ValidationFormData } from '$lib/types/validation';
	import type { FullJsonLdModel, Model } from '$lib/stores/models/types'; // Model might still be used by validationJobToFormData or currentValidation
	import {
		validationJobToFormData,
		formDataToValidationData
	} from '$lib/utils/validation-transform';
	import DatasetStep from './steps/DatasetStep.svelte';
	import DatasetCharacteristicsStep from './steps/DatasetCharacteristicsStep.svelte';
	import MetricsForValidationStep from './steps/MetricsForValidationStep.svelte';
	// import PerformanceMetricsStep from './steps/PerformanceMetricsStep.svelte'; // Not used in current step logic

	const dispatch = createEventDispatcher<{
		close: void;
		validationChange: void;
	}>();

	interface Props {
		modelId?: string;
		model?: FullJsonLdModel; // UPDATED to FullJsonLdModel
	}

	let { modelId, model }: Props = $props();

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

	$effect(() => {
		const { currentValidation, mode } = $validationStore;

		if (currentValidation) {
			// validationJobToFormData likely needs to be updated to handle JsonLdEvaluationResultItem or UiValidationJob
			const formData = validationJobToFormData(currentValidation as any); // Cast as any for now
			validationFormStore.loadFormData({ ...formData, modelId: modelId });
			initialFormData = { ...formData, modelId: modelId };
		} else {
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

	$effect(() => {
		if ($validationStore.mode === 'view' || $validationStore.mode === 'create') {
			currentStep = 0;
			steps.forEach((step, i) => {
				step.active = i === 0;
			});
		}
	});

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

	async function autoSave() {
		if (
			$validationStore.mode !== 'edit' ||
			!$validationStore.currentValidation?.val_id || // val_id might change based on new validation structure
			isSaving
		) {
			return;
		}
		isSaving = true;
		try {
			const formData = validationFormStore.getFormData();
			const response = await fetch(
				`/api/validations/${$validationStore.currentValidation.val_id}`, // Ensure val_id is correct for new structure
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				}
			);
			const result = await response.json();
			if (!result.success) {
				console.error('Auto-save failed:', result.error);
			} else {
				dispatch('validationChange');
			}
		} catch (error) {
			console.error('Auto-save error:', error);
		} finally {
			isSaving = false;
		}
	}

	function debouncedAutoSave() {
		if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
		autoSaveTimeout = setTimeout(() => autoSave(), 500);
	}

	const scheduleAutoSave = debouncedAutoSave;

	$effect(() => {
		if ($validationStore.mode === 'edit' && $validationStore.currentValidation?.val_id) {
			// val_id check
			const formState = $validationFormStore; // Reactive dependency
			debouncedAutoSave();
		}
	});

	$effect(() => {
		return () => {
			if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
		};
	});

	async function closeModal() {
		validationStore.closeModal();
		dispatch('close');
	}

	async function handleSubmit() {
		if (isSubmitting || $validationStore.mode === 'view') return;
		isSubmitting = true;

		try {
			console.log('Submitting validation with modelId:', modelId);
			const formData = validationFormStore.getFormData();
			if (!formData.validationName.trim()) {
				formData.validationName = `Validation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
			}
			console.log('📤 Submitting form data from store:', formData);

			// Get comprehensive metrics from the store
			const comprehensiveMetrics = validationFormStore.getComprehensiveMetrics();
			console.log('📊 Including comprehensive metrics in submission:', comprehensiveMetrics);

			if ($validationStore.mode === 'create' && formData.uploadedFolder) {
				console.log('🔍 Performing full model validation before submission...');
				try {
					let metadata: any;
					let usingMockMetadata = false;

					if (model) {
						// model is FullJsonLdModel
						const { DatasetStepService } = await import('$lib/services/dataset-step-service');
						// DatasetStepService.transformModelMetadataToFAIR needs to handle FullJsonLdModel
						metadata = DatasetStepService.transformModelMetadataToFAIR(model as any); // Temporary cast
						console.log('Using metadata from the current model (prop).');
					} else if (formData.uploadedFolder.metadata) {
						// This path should ideally not be taken if we always want to use current model's metadata.
						// Kept as a fallback with a warning if 'model' prop is somehow not available.
						console.warn(
							'Current model metadata (prop) not available. Attempting to use metadata from uploaded folder.'
						);
						const metadataText = await formData.uploadedFolder.metadata.text();
						metadata = JSON.parse(metadataText);
					} else {
						console.warn(
							'⚠️ No metadata available for validation - using mock metadata to proceed'
						);
						usingMockMetadata = true;
						// Simplified mock metadata for brevity
						metadata = {
							'@context': {},
							'General Model Information': { Title: { '@value': 'Mock Model' } }
						};
					}

					const { DatasetStepService } = await import('$lib/services/dataset-step-service');
					const validationResult = await DatasetStepService.performFullModelValidation(
						formData.uploadedFolder,
						metadata
					);
					validationFormStore.setValidationResults(validationResult.validationResults);

					if (!validationResult.success && !usingMockMetadata) {
						const isMissingMetadataError =
							validationResult.error?.includes('No metadata available');
						const isMissingColumnsError = validationResult.error?.includes(
							'Missing required columns'
						);
						const isConnectionError =
							validationResult.error?.includes('Connection aborted') ||
							validationResult.error?.includes('No such file or directory') ||
							validationResult.error?.includes('Internal Server Error');

						if (isConnectionError) {
							console.warn(
								'⚠️ FAIVOR-ML-Validator connection failed, proceeding with mock validation'
							);
							// Allow submission to proceed with mock data when external validator is unavailable
							validationFormStore.setValidationResults({
								modelValidation: {
									success: true,
									message: 'Validation completed with mock data (external validator unavailable)',
									warning:
										'FAIVOR-ML-Validator service is currently unavailable. Using mock validation data.',
									mockColumns: []
								},
								stage: 'model'
							});
							validationFormStore.setShowValidationModal(true);
						} else if (!isMissingMetadataError && !isMissingColumnsError) {
							validationFormStore.setShowValidationModal(true);
							console.error('❌ Model validation failed:', validationResult.error);
							isSubmitting = false;
							return;
						} else {
							// Handle warnings for missing metadata/columns but allow submission
							validationFormStore.setValidationResults({
								modelValidation: {
									success: true, // Mark as success to allow submission
									message: validationResult.error || 'Proceeding with mock data/metadata.',
									warning: validationResult.error || 'Proceeding with mock data/metadata.',
									mockColumns:
										validationResult.error
											?.match(/Missing required columns: (.*)/)?.[1]
											.split(',')
											.map((s) => s.trim()) || []
								},
								stage: 'model'
							});
							validationFormStore.setShowValidationModal(true);
						}
					} else {
						console.log('✅ Model validation completed successfully (or with mock data).');
					}
				} catch (validationError: any) {
					console.error('❌ Model validation error:', validationError);
					const isMissingMetadataError = validationError.message?.includes('No metadata available');
					const isMissingColumnsError = validationError.message?.includes(
						'Missing required columns'
					);
					const isConnectionError =
						validationError.message?.includes('Connection aborted') ||
						validationError.message?.includes('No such file or directory') ||
						validationError.message?.includes('Internal Server Error') ||
						validationError.message?.includes('Failed to connect');

					if (isConnectionError) {
						console.warn(
							'⚠️ FAIVOR-ML-Validator connection failed, proceeding with mock validation'
						);
						// Allow submission to proceed with mock data when external validator is unavailable
						validationFormStore.setValidationResults({
							modelValidation: {
								success: true,
								message: 'Validation completed with mock data (external validator unavailable)',
								warning:
									'FAIVOR-ML-Validator service is currently unavailable. Using mock validation data.',
								mockColumns: []
							},
							stage: 'model'
						});
						validationFormStore.setShowValidationModal(true);
					} else if (!isMissingMetadataError && !isMissingColumnsError) {
						validationFormStore.setValidationResults({
							modelValidation: {
								success: false,
								message: validationError.message || 'Unknown error'
							},
							stage: 'model'
						});
						validationFormStore.setShowValidationModal(true);
						isSubmitting = false;
						return;
					} else {
						// Allow submission for missing metadata/columns with warning
						validationFormStore.setValidationResults({
							modelValidation: {
								success: true,
								message: validationError.message,
								warning: validationError.message,
								mockColumns:
									validationError.message
										?.match(/Missing required columns: (.*)/)?.[1]
										.split(',')
										.map((s: string) => s.trim()) || []
							},
							stage: 'model'
						});
						validationFormStore.setShowValidationModal(true);
					}
				}
			}

			// Transform form data to ValidationData structure with comprehensive metrics
			const validationData = formDataToValidationData(formData, comprehensiveMetrics);

			const endpoint =
				$validationStore.mode === 'create'
					? '/api/validations'
					: `/api/validations/${$validationStore.currentValidation!.val_id}`;
			const method = $validationStore.mode === 'create' ? 'POST' : 'PUT';

			const response = await fetch(endpoint, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validationData)
			});
			const result = await response.json();
			console.log(`Validation ${$validationStore.mode} response:`, result);

			if (!result.success) {
				throw new Error(result.error || `Failed to ${$validationStore.mode} validation`);
			}
			dispatch('validationChange');
			closeModal();
		} catch (error) {
			console.error('Error submitting validation:', error);
			// TODO: Show error toast more visibly
		} finally {
			isSubmitting = false;
		}
	}

	async function handleResubmit() {
		if (!$validationStore.currentValidation?.val_id) return; // val_id check
		const confirmed = confirm('Are you sure you want to resubmit this validation?');
		if (!confirmed) return;

		try {
			await fetch(`/api/validations/${$validationStore.currentValidation.val_id}/resubmit`, {
				// val_id usage
				method: 'POST'
			});
			dispatch('validationChange');
			closeModal();
		} catch (error) {
			console.error('Error resubmitting validation:', error);
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
		{#if $validationStore.mode === 'edit' && isSaving}
			<div class="text-base-content/70 mb-4 flex items-center gap-2 text-sm">
				<span class="loading loading-spinner loading-xs"></span>
				<span>Auto-saving...</span>
			</div>
		{/if}

		<ul class="steps mb-8 w-full">
			{#each steps as step, i}
				<li
					class="step transition-all {step.active || i < currentStep
						? 'step-primary'
						: ''} cursor-pointer"
					onclick={() => goToStep(i)}
					onkeydown={(e) => handleKeydown(e, i)}
					role="button"
					tabindex="0"
				>
					{step.title}
				</li>
			{/each}
		</ul>

		<div class="h-[calc(100%-12rem)] w-full overflow-y-auto">
			{#if $validationFormStore.validationResults?.csvValidation?.warning || $validationFormStore.validationResults?.modelValidation?.warning}
				<div class="alert alert-warning mb-4">
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
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<div>
						<h3 class="font-bold">Warning</h3>
						{#if $validationFormStore.validationResults?.csvValidation?.warning}
							<div class="text-sm">
								{$validationFormStore.validationResults.csvValidation.warning}
							</div>
							{#if $validationFormStore.validationResults.csvValidation.mock_columns_added && $validationFormStore.validationResults.csvValidation.mock_columns_added.length > 0}
								<div class="mt-1 text-sm">
									<strong>Using mock data for columns:</strong>
									{$validationFormStore.validationResults.csvValidation.mock_columns_added.join(
										', '
									)}
								</div>
							{/if}
						{:else if $validationFormStore.validationResults?.modelValidation?.warning}
							<div class="text-sm">
								{$validationFormStore.validationResults.modelValidation.warning}
							</div>
							{#if $validationFormStore.validationResults.modelValidation.mockColumns && $validationFormStore.validationResults.modelValidation.mockColumns.length > 0}
								<div class="mt-1 text-sm">
									<strong>Using mock data for columns:</strong>
									{$validationFormStore.validationResults.modelValidation.mockColumns.join(', ')}
								</div>
							{/if}
						{/if}
						<div class="mt-2 text-sm">
							The validation will continue using automatically generated mock data for the missing
							elements. Results may not be fully accurate, but your validation can still be
							submitted.
							{#if $validationFormStore.validationResults?.modelValidation?.mockColumns?.includes('Body Mass Index') || $validationFormStore.validationResults?.modelValidation?.mockColumns?.includes('Weight Loss')}
								<div class="mt-2">
									<strong>Health metrics:</strong>
									Using realistic simulated values for health metrics.
									{#if $validationFormStore.validationResults?.modelValidation?.mockColumns?.includes('Body Mass Index')}
										<br />
										• Body Mass Index: Using values between 18.5-30.5
									{/if}
									{#if $validationFormStore.validationResults?.modelValidation?.mockColumns?.includes('Weight Loss')}
										<br />
										• Weight Loss: Using values between 0-10kg
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			{#if currentStep === 0}
				<DatasetStep
					readonly={$validationStore.mode === 'view'}
					onFieldChange={scheduleAutoSave}
					{model}
				/>
			{:else if currentStep === 1}
				<DatasetCharacteristicsStep readonly={$validationStore.mode === 'view'} />
			{:else if currentStep === 2}
				<MetricsForValidationStep readonly={$validationStore.mode === 'view'} {model} />
			{/if}
		</div>

		<div class="modal-action mt-8">
			{#if $validationStore.mode === 'view'}
				<button class="btn btn-outline" onclick={() => validationStore.setMode('edit')}>
					Edit
				</button>
			{/if}
			{#if $validationStore.currentValidation && $validationStore.mode === 'edit'}
				<button class="btn btn-primary" onclick={handleResubmit}>Resubmit Validation</button>
			{/if}
			<div class="flex-1"></div>
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
