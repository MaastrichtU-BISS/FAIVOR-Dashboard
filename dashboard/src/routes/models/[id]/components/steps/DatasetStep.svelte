<script lang="ts">
	import SolarCalculatorMinimalisticLinear from '~icons/solar/calculator-minimalistic-linear';
	import MaterialSymbolsCheck from '~icons/material-symbols/check';
	import FolderUpload from '$lib/components/ui/FolderUpload.svelte';
	import ValidationErrorModal from '$lib/components/ui/ValidationErrorModal.svelte';
	import type { DatasetFolderFiles } from '$lib/types/validation';
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import { DatasetStepService, type DatasetStepState } from '$lib/services/dataset-step-service';
	import type { ValidationResults } from '$lib/stores/models/validation.store';

	interface Props {
		readonly?: boolean;
		onFieldChange?: () => void;
	}

	let { readonly = false, onFieldChange = () => {} }: Props = $props();

	// Use the validation form store for all data
	let formData = $derived($validationFormStore);

	// Local state for input fields that sync with the store
	let validationName = $state(formData.validationName || '');
	let userName = $state(formData.userName || '');
	let date = $state(formData.date || '');

	// Store initial values to track actual changes using service
	let initialValues = $state<DatasetStepState>(
		DatasetStepService.createInitialValues({
			validationName: formData.validationName || '',
			userName: formData.userName || '',
			date: formData.date || '',
			datasetName: formData.datasetName || '',
			uploadedFolder: formData.uploadedFolder,
			folderName: formData.folderName || ''
		})
	);

	// Sync local state with store when formData changes from external sources (loading data)
	// but prevent triggering when we're updating the store ourselves
	let isUpdatingStore = false;
	$effect(() => {
		if (!isUpdatingStore) {
			validationName = formData.validationName || '';
			userName = formData.userName || '';
			date = formData.date || '';
		}
	});

	// Update store when local state changes and track field changes
	function handleFieldUpdate() {
		if (!readonly) {
			isUpdatingStore = true;

			// Update store with current local state
			if (validationName !== formData.validationName) {
				validationFormStore.updateField('validationName', validationName);
			}
			if (userName !== formData.userName) {
				validationFormStore.updateField('userName', userName);
			}
			if (date !== formData.date) {
				validationFormStore.updateField('date', date);
			}

			// Track changes for the onFieldChange callback
			const currentState: DatasetStepState = {
				validationName: validationName,
				userName: userName,
				date: date,
				datasetName: formData.datasetName || '',
				uploadedFolder: formData.uploadedFolder,
				folderName: formData.folderName || ''
			};

			const changeTracker = DatasetStepService.trackFieldChanges(currentState, initialValues);
			if (changeTracker.hasChanges) {
				onFieldChange();
			}

			// Reset the flag after a brief delay to allow store updates to complete
			setTimeout(() => {
				isUpdatingStore = false;
			}, 0);
		}
	}

	let datasetDescription = $state('');
	let datasetCharacteristics = $state('');
	let isProcessingFolder = $state(false);
	let isCheckingDataset = $state(false);
	let isAutoValidating = $state(false);
	let isRunningFullValidation = $state(false);

	// Get validation results from the store instead of local state
	let validationResults = $derived(formData.validationResults || { stage: 'none' });

	async function handleFolderSelected(files: DatasetFolderFiles, selectedFolderName: string) {
		isProcessingFolder = true;
		// Clear previous validation results when new folder is selected
		validationFormStore.clearValidationResults();

		try {
			const result = await DatasetStepService.handleFolderSelected(
				files,
				selectedFolderName,
				formData.datasetName,
				readonly
			);

			if (result.success) {
				// Update the store instead of local variables
				validationFormStore.setFolderFiles(result.uploadedFolder || {}, result.folderName || '');

				// Set dataset name from folder name if not already set
				if (!formData.datasetName && result.datasetName) {
					validationFormStore.updateField('datasetName', result.datasetName);
				}

				if (result.validationResults) {
					validationFormStore.setValidationResults(result.validationResults);

					// Show modal if there are validation errors or important results
					if (
						result.validationResults.csvValidation &&
						!result.validationResults.csvValidation.success
					) {
						validationFormStore.setShowValidationModal(true);
					} else if (
						result.validationResults.modelValidation &&
						!result.validationResults.modelValidation.success
					) {
						validationFormStore.setShowValidationModal(true);
					}
				}
			} else {
				console.error('Error processing folder:', result.error);
			}
		} catch (error) {
			console.error('Error processing folder:', error);
		} finally {
			isProcessingFolder = false;
		}
	}

	async function performAutoValidation() {
		if (!formData.uploadedFolder?.data || !formData.uploadedFolder?.metadata || readonly) {
			return;
		}

		isAutoValidating = true;

		try {
			const result = await DatasetStepService.performAutoValidation(
				formData.uploadedFolder,
				readonly
			);

			// Update store with validation results
			validationFormStore.setValidationResults(result.validationResults);

			if (result.showModal) {
				validationFormStore.setShowValidationModal(true);
			}
		} catch (error: any) {
			console.error('Auto-validation failed:', error);

			// Update store with error results
			validationFormStore.setValidationResults({
				modelValidation: {
					success: false,
					message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
				},
				stage: 'model'
			});
			validationFormStore.setShowValidationModal(true);
		} finally {
			isAutoValidating = false;
		}
	}

	async function performFullModelValidation(metadata: any) {
		if (!formData.uploadedFolder?.data) {
			return;
		}

		isRunningFullValidation = true;

		try {
			const result = await DatasetStepService.performFullModelValidation(
				formData.uploadedFolder,
				metadata
			);
			// Update store with validation results
			validationFormStore.setValidationResults(result.validationResults);
		} catch (error: any) {
			console.error('Full model validation failed:', error);

			// Update store with error results
			validationFormStore.setValidationResults({
				modelValidation: {
					success: false,
					message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
				},
				stage: 'model'
			});
		} finally {
			isRunningFullValidation = false;
		}
	}

	function handleFolderRemoved() {
		const result = DatasetStepService.handleFolderRemoved();
		validationFormStore.clearFolderFiles();
		// Update store with validation results
		validationFormStore.setValidationResults(result.validationResults);
	}

	function calculateSummary() {
		DatasetStepService.calculateSummary();
	}

	async function checkDataset() {
		isCheckingDataset = true;
		// Clear previous validation results
		validationFormStore.clearValidationResults();

		try {
			const result = await DatasetStepService.checkDataset(formData.uploadedFolder);
			// Update store with validation results
			validationFormStore.setValidationResults(result.validationResults);
		} catch (error: any) {
			console.error('Dataset check failed:', error);

			// Update store with error results
			validationFormStore.setValidationResults({
				modelValidation: {
					success: false,
					message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
				},
				stage: 'model'
			});
		} finally {
			isCheckingDataset = false;
		}
	}
</script>

<div class="grid grid-cols-[400px_1fr] gap-12">
	<!-- Left Column -->
	<div class="space-y-6">
		<div>
			<label class="label" for="validationName">Validation Name</label>
			<input
				type="text"
				id="validationName"
				class="input input-bordered w-full"
				placeholder="Enter validation name (optional)"
				bind:value={validationName}
				{readonly}
				oninput={handleFieldUpdate}
			/>
			<div class="label">
				<span class="label-text-alt text-base-content/60">
					Leave empty to auto-generate name with date/time
				</span>
			</div>
		</div>

		<div>
			<label class="label" for="datasetName">Dataset</label>
			<!-- <input
				type="text"
				id="datasetName"
				class="input input-bordered w-full"
				placeholder="Enter dataset name"
				bind:value={datasetName}
				{readonly}
				oninput={onFieldChange}
			/> -->
		</div>

		<!-- Dataset Folder Upload -->
		<FolderUpload
			folderFiles={formData.uploadedFolder}
			folderName={formData.folderName || ''}
			{readonly}
			onFolderSelected={handleFolderSelected}
			onFolderRemoved={handleFolderRemoved}
		/>

		{#if isProcessingFolder}
			<div class="text-info flex items-center justify-center gap-2">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Processing folder...</span>
			</div>
		{/if}

		{#if isAutoValidating}
			<div class="text-info flex items-center justify-center gap-2">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Automatically validating dataset...</span>
			</div>
		{/if}

		{#if isRunningFullValidation}
			<div class="text-warning flex items-center justify-center gap-2">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Running full model validation (this may take a while)...</span>
			</div>
		{/if}

		<div class="flex flex-col items-center gap-4">
			<!-- <button
				class="btn btn-outline gap-2"
				onclick={checkDataset}
				disabled={isCheckingDataset ||
					isRunningFullValidation ||
					!uploadedFolder?.data ||
					!uploadedFolder?.metadata ||
					readonly}
				class:loading={isCheckingDataset}
			>
				{#if isCheckingDataset}
					<span class="loading loading-spinner loading-sm"></span>
					Checking dataset...
				{:else}
					<MaterialSymbolsCheck />
					Run Full Validation
				{/if}
			</button> -->

			<!-- CSV Validation Results -->
			{#if validationResults.csvValidation}
				<div
					class="alert {validationResults.csvValidation.success
						? 'alert-success'
						: 'alert-error'} w-full"
				>
					<div class="flex flex-col gap-2">
						<span class="font-medium">
							CSV Validation: {validationResults.csvValidation.message}
						</span>
						{#if validationResults.csvValidation.success && validationResults.csvValidation.details}
							<div class="text-sm opacity-80">
								<div>
									CSV Columns: {validationResults.csvValidation.details.csv_columns.join(', ')}
								</div>
								<div>
									Model Input Columns: {validationResults.csvValidation.details.model_input_columns.join(
										', '
									)}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Model Validation Results -->
			{#if validationResults.modelValidation}
				<div
					class="alert {validationResults.modelValidation.success
						? 'alert-success'
						: 'alert-error'} w-full"
				>
					<div class="flex flex-col gap-2">
						<span class="font-medium">
							Model Validation: {validationResults.modelValidation.message}
						</span>
						{#if validationResults.modelValidation.success && validationResults.modelValidation.details}
							<div class="text-sm opacity-80">
								<div>Model: {validationResults.modelValidation.details.model_name}</div>
								<div>
									Metrics: {Object.keys(validationResults.modelValidation.details.metrics).length} calculated
								</div>
								<details class="mt-2">
									<summary class="cursor-pointer text-xs">View Metrics</summary>
									<div class="mt-1 text-xs">
										{#each Object.entries(validationResults.modelValidation.details.metrics) as [key, value]}
											<div>{key}: {value}</div>
										{/each}
									</div>
								</details>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Validation Stage Progress -->
			{#if validationResults.stage !== 'none'}
				<div class="w-full">
					<div class="mb-2 text-sm font-medium">Validation Progress</div>
					<div class="flex gap-2">
						<div
							class="badge {validationResults.csvValidation?.success
								? 'badge-success'
								: validationResults.stage === 'csv' && !validationResults.csvValidation?.success
									? 'badge-error'
									: 'badge-outline'}"
						>
							{validationResults.csvValidation?.success
								? 'CSV ✓'
								: validationResults.stage === 'csv' && !validationResults.csvValidation?.success
									? 'CSV ✗'
									: 'CSV'}
						</div>
						<div
							class="badge {validationResults.stage === 'complete' &&
							validationResults.modelValidation?.success
								? 'badge-success'
								: validationResults.stage === 'model' &&
									  validationResults.modelValidation?.success === false
									? 'badge-error'
									: validationResults.stage === 'model'
										? 'badge-warning'
										: 'badge-outline'}"
						>
							{validationResults.stage === 'complete' && validationResults.modelValidation?.success
								? 'Model ✓'
								: validationResults.stage === 'model' &&
									  validationResults.modelValidation?.success === false
									? 'Model ✗'
									: validationResults.stage === 'model'
										? 'Model...'
										: 'Model'}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Right Column -->
	<div>
		<div class="grid grid-cols-2 gap-8">
			<div>
				<label class="label" for="userName">User</label>
				<input
					type="text"
					id="userName"
					class="input input-bordered w-full"
					placeholder="Add user name (Sam Smith)"
					bind:value={userName}
					{readonly}
					oninput={handleFieldUpdate}
				/>
			</div>

			<div>
				<label class="label" for="date">Date</label>
				<input
					type="date"
					id="date"
					class="input input-bordered w-full"
					bind:value={date}
					{readonly}
					onchange={handleFieldUpdate}
				/>
			</div>
		</div>
		<div class="mt-6 grid grid-cols-2 gap-8">
			<div>
				<h3 class="text-lg font-medium">Dataset description</h3>
				<textarea
					class="textarea textarea-bordered h-48 w-full"
					placeholder="Free text or structure, including purpose of validation (to test data (N=5), to validate (N>30), quality assurance), source of data, etc)"
					bind:value={datasetDescription}
					{readonly}
				></textarea>
			</div>
			<div>
				<h3 class="text-lg font-medium">Dataset characteristics</h3>
				<textarea
					class="textarea textarea-bordered h-48 w-full"
					placeholder="Characteristics of dataset that are not given in the data file (as sex distribution, ethnicity, characteristics of groups)"
					bind:value={datasetCharacteristics}
					{readonly}
				></textarea>
			</div>
		</div>

		<!-- Right Column -->
		<div class="mt-8 space-y-4">
			{#if !readonly}
				<div>
					<button class="btn btn-outline w-auto gap-2" onclick={calculateSummary}>
						<SolarCalculatorMinimalisticLinear />
						Calculate the summary
					</button>
				</div>
			{/if}
			<textarea
				class="textarea textarea-bordered h-48 w-full"
				placeholder="Free text or structure, including purpose of validation (to test data (N=5), to validate (N>30), quality assurance), source of data, etc)"
				readonly
			></textarea>
		</div>
	</div>
</div>

<!-- Validation Error Modal -->
<ValidationErrorModal />
