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
	import { FaivorBackendAPI } from '$lib/api/faivor-backend';

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
			// Check if this is a UiValidationJob (has val_id, originalEvaluationData, etc.)
			// or a regular ValidationJob
			const isUiValidationJob = 'originalEvaluationData' in currentValidation;
			
			if (isUiValidationJob) {
				// For UiValidationJob, pass it directly to validationJobToFormData
				validationJobToFormData(currentValidation as any).then(formData => {
					validationFormStore.loadFormData({ ...formData, modelId: modelId });
					initialFormData = { ...formData, modelId: modelId };
				}).catch(error => {
					console.error('Failed to load validation form data:', error);
					// Fall back to empty form if restoration fails
					validationFormStore.reset();
					validationFormStore.updateField('modelId', modelId);
				});
			} else {
				// For regular ValidationJob, handle it differently if needed
				// This is for backwards compatibility
				console.warn('Received legacy ValidationJob format, conversion may be limited');
				validationFormStore.reset();
				validationFormStore.updateField('modelId', modelId);
			}
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
			!$validationStore.currentValidation ||
			isSaving
		) {
			return;
		}
		
		// Get val_id from either UiValidationJob or ValidationJob
		const valId = 'val_id' in $validationStore.currentValidation 
			? $validationStore.currentValidation.val_id 
			: ($validationStore.currentValidation as any).val_id;
			
		if (!valId) {
			console.error('No validation ID found for auto-save');
			return;
		}
		
		isSaving = true;
		try {
			const formData = validationFormStore.getFormData();
			const response = await fetch(
				`/api/validations/${valId}`,
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
		if ($validationStore.mode === 'edit' && $validationStore.currentValidation) {
			// Check for val_id in either format
			const valId = 'val_id' in $validationStore.currentValidation 
				? $validationStore.currentValidation.val_id 
				: ($validationStore.currentValidation as any).val_id;
				
			if (valId) {
				const formState = $validationFormStore; // Reactive dependency
				debouncedAutoSave();
			}
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

	async function triggerBackgroundValidation(validationId: string, metadata: any, uploadedFolder: any) {
		if (!uploadedFolder?.data) {
			console.error('No data file available for background validation');
			return;
		}

		try {
			// Update validation status to "running"
			await fetch(`/api/validations/${validationId}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'running' })
			});

			// Parse column metadata if available
			let columnMetadata: any = null;
			if (uploadedFolder.columnMetadata) {
				const columnMetadataText = await uploadedFolder.columnMetadata.text();
				columnMetadata = JSON.parse(columnMetadataText);
			}

			// Call validate-model endpoint for full validation
			console.log('📊 Running full model validation in background');
			const validationResult = await FaivorBackendAPI.validateModel(
				metadata,
				uploadedFolder.data,
				columnMetadata
			);
			
			console.log('📊 Validation result from backend:', validationResult);

			// Convert to comprehensive metrics format
			const comprehensiveMetrics = await FaivorBackendAPI.convertToComprehensiveFormat(validationResult, metadata);
			console.log('📊 Comprehensive metrics to store:', comprehensiveMetrics);

			// Update validation with results
			const completeResponse = await fetch(`/api/validations/${validationId}/complete`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'completed',
					metrics: comprehensiveMetrics
				})
			});
			
			if (!completeResponse.ok) {
				throw new Error(`Failed to update validation: ${completeResponse.statusText}`);
			}

			console.log('✅ Background validation completed successfully');
			dispatch('validationChange');
		} catch (error) {
			console.error('❌ Background validation failed:', error);
			// Update validation status to failed
			await fetch(`/api/validations/${validationId}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					status: 'failed',
					error: error instanceof Error ? error.message : 'Unknown error'
				})
			});
			dispatch('validationChange');
		}
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

			// Save files to IndexedDB if we have uploaded files
			let indexedDbId: string | undefined;
			if (formData.uploadedFolder && (formData.uploadedFolder.data || formData.uploadedFolder.metadata || formData.uploadedFolder.columnMetadata)) {
				const { datasetStorage, generateDatasetId, parseJSONFile } = await import('$lib/utils/indexeddb-storage');
				
				// For edit mode, check if we already have an IndexedDB ID from the existing validation
				if ($validationStore.mode === 'edit' && $validationStore.currentValidation) {
					// Check both possible locations for dataset_info
					const currentVal = $validationStore.currentValidation as any;
					const datasetInfo = currentVal.dataset_info || currentVal.originalEvaluationData?.dataset_info;
					const existingFolderUpload = datasetInfo?.folderUpload;
					
					if (existingFolderUpload?.indexedDbId) {
						indexedDbId = existingFolderUpload.indexedDbId;
						console.log('Using existing IndexedDB ID:', indexedDbId);
					}
				}
				
				// Generate new ID if we don't have one
				if (!indexedDbId) {
					indexedDbId = generateDatasetId();
				}
				
				const datasetFolder = {
					id: indexedDbId,
					name: formData.folderName || formData.datasetName || 'Validation Dataset',
					uploadDate: new Date().toISOString(),
					files: {
						metadata: formData.uploadedFolder.metadata,
						data: formData.uploadedFolder.data,
						columnMetadata: formData.uploadedFolder.columnMetadata
					},
					parsed: {
						metadata: formData.uploadedFolder.metadata ? await parseJSONFile(formData.uploadedFolder.metadata) : undefined,
						columnMetadata: formData.uploadedFolder.columnMetadata ? await parseJSONFile(formData.uploadedFolder.columnMetadata) : undefined
					}
				};
				
				await datasetStorage.saveDataset(datasetFolder);
				console.log('✅ Saved dataset to IndexedDB with ID:', indexedDbId);
			}

			// Prepare metadata for background validation
			let modelMetadata: any;
			if (model) {
				const { DatasetStepService } = await import('$lib/services/dataset-step-service');
				modelMetadata = DatasetStepService.transformModelMetadataToFAIR(model as any);
				console.log('Using metadata from the current model for background validation.');
			} else if (formData.uploadedFolder?.metadata) {
				const metadataText = await formData.uploadedFolder.metadata.text();
				modelMetadata = JSON.parse(metadataText);
				console.log('Using uploaded metadata for background validation.');
			} else {
				console.warn('⚠️ No metadata available - will use minimal metadata for background validation');
				modelMetadata = {
					'@context': {},
					'General Model Information': { Title: { '@value': 'Model' } }
				};
			}

			// Transform form data to ValidationData structure with comprehensive metrics
			const validationData = formDataToValidationData(formData, comprehensiveMetrics);
			
			// Add IndexedDB ID to the validation data
			if (indexedDbId && validationData.dataset_info?.folderUpload) {
				validationData.dataset_info.folderUpload.indexedDbId = indexedDbId;
			}

			// Get val_id for edit mode
			let valId: string | undefined;
			if ($validationStore.mode === 'edit' && $validationStore.currentValidation) {
				valId = 'val_id' in $validationStore.currentValidation 
					? $validationStore.currentValidation.val_id 
					: ($validationStore.currentValidation as any).val_id;
			}
			
			const endpoint =
				$validationStore.mode === 'create'
					? '/api/validations'
					: `/api/validations/${valId}`;
			const method = $validationStore.mode === 'create' ? 'POST' : 'PUT';

			// Include modelId in the request payload
			const payload = {
				...validationData,
				modelId: modelId
			};

			const response = await fetch(endpoint, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await response.json();
			console.log(`Validation ${$validationStore.mode} response:`, result);

			if (!result.success) {
				throw new Error(result.error || `Failed to ${$validationStore.mode} validation`);
			}
			
			// Close modal first to show user the submission is complete
			closeModal();
			dispatch('validationChange');
			
			// If creating new validation, trigger background validation with /validate-model
			if ($validationStore.mode === 'create' && result.validation) {
				const validationId = result.validation.val_id || result.validation.id;
				console.log('🚀 Triggering background validation for:', validationId);
				console.log('Result validation object:', result.validation);
				// Start background validation process - don't await, let it run in background
				triggerBackgroundValidation(validationId, modelMetadata, formData.uploadedFolder).catch(error => {
					console.error('Background validation error:', error);
				});
			}
		} catch (error) {
			console.error('Error submitting validation:', error);
			// TODO: Show error toast more visibly
		} finally {
			isSubmitting = false;
		}
	}

	async function handleResubmit() {
		if (!$validationStore.currentValidation) return;
		
		// Get val_id from either format
		const valId = 'val_id' in $validationStore.currentValidation 
			? $validationStore.currentValidation.val_id 
			: ($validationStore.currentValidation as any).val_id;
			
		if (!valId) return;
		
		const confirmed = confirm('Are you sure you want to resubmit this validation?');
		if (!confirmed) return;

		try {
			await fetch(`/api/validations/${valId}/resubmit`, {
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
