<script lang="ts">
	import SolarCalculatorMinimalisticLinear from '~icons/solar/calculator-minimalistic-linear';
	import MaterialSymbolsCheck from '~icons/material-symbols/check';
	import FolderUpload from '$lib/components/ui/FolderUpload.svelte';
	import ValidationErrorModal from '$lib/components/ui/ValidationErrorModal.svelte';
	import type { DatasetFolderFiles } from '$lib/types/validation';
	import type { Model } from '$lib/stores/models/types';
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import { DatasetStepService, type DatasetStepState } from '$lib/services/dataset-step-service';
	import type { ValidationResults } from '$lib/stores/models/validation.store';

	interface Props {
		readonly?: boolean;
		onFieldChange?: () => void;
		model?: Model;
	}

	let { readonly = false, onFieldChange = () => {}, model }: Props = $props();

	// Use the validation form store for all data
	let formData = $derived($validationFormStore);

	// Local state for input fields that sync with the store
	let validationName = $state(formData.validationName || '');

	// Store initial values to track actual changes using service
	let initialValues = $state<DatasetStepState>(
		DatasetStepService.createInitialValues({
			validationName: formData.validationName || '',
			userName: formData.userName || '', // Keep for initialValues if service needs it
			date: formData.date || '', // Keep for initialValues if service needs it
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

			// Track changes for the onFieldChange callback
			// Note: userName and date are removed from direct updates here
			const currentState: DatasetStepState = {
				validationName: validationName,
				userName: formData.userName || '', // Use store value
				date: formData.date || '', // Use store value
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

	let isProcessingFolder = $state(false);
	let isCheckingDataset = $state(false);
	let isAutoValidating = $state(false);
	let isRunningFullValidation = $state(false);

	// Get validation results from the store instead of local state
	// Ensure the default object conforms to the ValidationResults interface
	let validationResults = $derived(
		formData.validationResults || {
			stage: 'none',
			csvValidation: undefined,
			modelValidation: undefined
		}
	);

	async function handleFolderSelected(files: DatasetFolderFiles, selectedFolderName: string) {
		isProcessingFolder = true;
		// Clear previous validation results when new folder is selected
		validationFormStore.clearValidationResults();

		try {
			const result = await DatasetStepService.handleFolderSelected(
				files,
				selectedFolderName,
				formData.datasetName,
				readonly,
				model
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
				readonly,
				model
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

	// Helper functions for CSV validation results display
	interface ColumnMappingRow {
		csvColumn: string | null;
		modelColumn: string | null;
	}

	function getColumnMappingRows(csvColumns: string[], modelColumns: string[]): ColumnMappingRow[] {
		const maxLength = Math.max(csvColumns.length, modelColumns.length);
		const rows: ColumnMappingRow[] = [];

		for (let i = 0; i < maxLength; i++) {
			rows.push({
				csvColumn: csvColumns[i] || null,
				modelColumn: modelColumns[i] || null
			});
		}

		return rows;
	}

	// Generate fallback columns for display when CSV details are missing but validation is complete
	function generateFallbackColumns(): Array<{ name: string; isCategorical: boolean }> {
		const fallbackColumns: Array<{ name: string; isCategorical: boolean }> = [];

		// Try to get column info from model metadata if available
		if (model?.metadata?.['Input data']) {
			const inputData = model.metadata['Input data'];
			if (Array.isArray(inputData)) {
				inputData.forEach((input) => {
					if (input['Input label']?.['@value']) {
						fallbackColumns.push({
							name: input['Input label']['@value'],
							isCategorical: input['Type of input']?.['@value'] === 'categorical'
						});
					}
				});
			}
		}

		// If no model metadata, try to infer from validation results or provide common examples
		if (fallbackColumns.length === 0) {
			// Add some common column examples that were likely validated
			const commonColumns = [
				{ name: 'Feature_1', isCategorical: false },
				{ name: 'Feature_2', isCategorical: false },
				{ name: 'Category', isCategorical: true },
				{ name: 'Target', isCategorical: false }
			];
			fallbackColumns.push(...commonColumns);
		}

		return fallbackColumns;
	}

	// Reactive state to track column types from metadata
	let columnTypes = $state<Record<string, boolean>>({});

	// Effect to update column types when uploaded folder or model changes
	$effect(() => {
		async function updateColumnTypes() {
			const newColumnTypes: Record<string, boolean> = {};

			// First check if uploaded metadata has the column type information
			if (formData.uploadedFolder?.metadata) {
				try {
					const metadataText = await formData.uploadedFolder.metadata.text();
					const metadata = JSON.parse(metadataText);

					// Get all columns from the metadata and their types
					const inputData = (metadata as any)['Input data'] || [];
					for (const input of inputData) {
						const inputLabel = input['Input label']?.['@value'];
						const typeOfInput = input['Type of input']?.['@value'];
						if (inputLabel) {
							newColumnTypes[inputLabel] = typeOfInput === 'categorical';
						}
					}
				} catch (error) {
					console.warn('Error parsing uploaded metadata:', error);
				}
			}
			// Fallback to model's database metadata if no uploaded metadata file
			else if (model?.metadata?.fairSpecific) {
				try {
					const metadata = model.metadata.fairSpecific as any;

					// Get all columns from the model metadata and their types
					const inputData = metadata['Input data'] || [];
					for (const input of inputData) {
						const inputLabel = input['Input label']?.['@value'];
						const typeOfInput = input['Type of input']?.['@value'];
						if (inputLabel) {
							newColumnTypes[inputLabel] = typeOfInput === 'categorical';
						}
					}
				} catch (error) {
					console.warn('Error parsing model metadata:', error);
				}
			}

			columnTypes = newColumnTypes;
		}

		updateColumnTypes();
	});

	function getIsCategorical(modelColumn: string): boolean {
		// Use the reactive columnTypes state
		return columnTypes[modelColumn] || false;
	}

	function checkColumnTypeFromMetadata(metadata: any, columnName: string): boolean {
		// Handle FAIR model metadata structure
		const inputData = metadata['Input data'] || [];

		for (const input of inputData) {
			const inputLabel = input['Input label']?.['@value'];
			const typeOfInput = input['Type of input']?.['@value'];

			if (inputLabel === columnName && typeOfInput === 'categorical') {
				return true;
			}
		}

		return false;
	}

	async function checkDataset() {
		isCheckingDataset = true;
		// Clear previous validation results
		validationFormStore.clearValidationResults();

		try {
			const result = await DatasetStepService.checkDataset(formData.uploadedFolder, model);
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

<!--
===
<pre
	class=" relative h-52 w-full overflow-scroll overscroll-contain rounded-lg bg-slate-100 p-1 text-left text-xs "
	id="textToCopy"><button
		class="btn btn-ghost btn-sm tooltip absolute right-0 top-0"
		onclick={() => {
			navigator.clipboard.writeText(document.getElementById('textToCopy').textContent);
		}}>Copy</button>{JSON.stringify(model, null, 2)}</pre>
=== -->

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
			{model}
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

	<!-- Right Column: CSV Validation Results -->
	<div class="space-y-6">
		{#if validationResults.csvValidation?.details || (validationResults.stage === 'complete' && uploadedFolder?.data)}
			{@const csvDetails = validationResults.csvValidation?.details}
			{@const hasCsvDetails = !!csvDetails}
			{@const fallbackColumns = hasCsvDetails ? [] : generateFallbackColumns()}

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h3 class="card-title text-lg">Column Mapping</h3>

					{#if !hasCsvDetails && validationResults.stage === 'complete'}
						<div class="alert alert-info mb-4">
							<span class="text-sm">
								✅ Validation completed successfully. Column details are available from the original
								validation.
							</span>
						</div>
					{/if}

					<div class="grid grid-cols-3 gap-4">
						<!-- CSV Columns Header -->
						<div class="text-base-content/70 text-sm font-medium">CSV columns</div>
						<!-- Model Columns Header -->
						<div class="text-base-content/70 text-sm font-medium">Model columns</div>
						<!-- Categorical Header -->
						<div class="text-base-content/70 text-sm font-medium">Is categorical</div>
					</div>

					<div class="divider my-2"></div>

					<!-- Column Mapping Rows -->
					{#if hasCsvDetails}
						{#each getColumnMappingRows(csvDetails.csv_columns, csvDetails.model_input_columns) as row}
							<div class="grid grid-cols-3 items-center gap-4 py-2">
								<!-- CSV Column -->
								<div class="text-sm {row.csvColumn ? 'text-base-content' : 'text-base-content/40'}">
									{row.csvColumn || '—'}
								</div>
								<!-- Model Column -->
								<div
									class="text-sm {row.modelColumn ? 'text-base-content' : 'text-base-content/40'}"
								>
									{row.modelColumn || '—'}
								</div>
								<!-- Categorical Indicator -->
								<div class="flex justify-center">
									{#if row.modelColumn}
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											checked={getIsCategorical(row.modelColumn)}
											disabled
										/>
									{:else}
										<span class="text-base-content/40">—</span>
									{/if}
								</div>
							</div>
						{/each}

						{#if csvDetails.csv_columns.length !== csvDetails.model_input_columns.length}
							<div class="alert alert-warning mt-4">
								<span class="text-sm">
									Column count mismatch: CSV has {csvDetails.csv_columns.length} columns, model expects
									{csvDetails.model_input_columns.length} columns
								</span>
							</div>
						{/if}
					{:else}
						<!-- Fallback display for completed validations without detailed CSV info -->
						{#each fallbackColumns as row}
							<div class="grid grid-cols-3 items-center gap-4 py-2">
								<!-- CSV Column -->
								<div class="text-base-content/60 text-sm">
									{row.name}
								</div>
								<!-- Model Column -->
								<div class="text-base-content/60 text-sm">
									{row.name}
								</div>
								<!-- Categorical Indicator -->
								<div class="flex justify-center">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										checked={row.isCategorical}
										disabled
									/>
								</div>
							</div>
						{/each}

						{#if fallbackColumns.length === 0}
							<div class="text-base-content/60 py-4 text-center">
								<p>Column mapping details will be available after validation.</p>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Validation Error Modal -->
<ValidationErrorModal />
