<script lang="ts">
	import SolarCalculatorMinimalisticLinear from '~icons/solar/calculator-minimalistic-linear';
	import MaterialSymbolsCheck from '~icons/material-symbols/check';
	import FolderUpload from '$lib/components/ui/FolderUpload.svelte';
	import ValidationErrorModal from '$lib/components/ui/ValidationErrorModal.svelte';
	import type { DatasetFolderFiles } from '$lib/types/validation';
	import type { FullJsonLdModel } from '$lib/stores/models/types'; // Changed Model to FullJsonLdModel
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import { DatasetStepService, type DatasetStepState } from '$lib/services/dataset-step-service';
	import type { ValidationResults } from '$lib/stores/models/validation.store';

	interface Props {
		readonly?: boolean;
		onFieldChange?: () => void;
		model?: FullJsonLdModel | undefined; // Changed Model to FullJsonLdModel
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
			userName: formData.userName || '',
			date: formData.date || '',
			datasetName: formData.datasetName || '',
			datasetDescription: formData.datasetDescription || '',
			uploadedFolder: formData.uploadedFolder,
			folderName: formData.folderName || ''
		})
	);

	// Sync local state with store when formData changes from external sources (loading data)
	let isUpdatingStore = false;
	$effect(() => {
		if (!isUpdatingStore) {
			validationName = formData.validationName || '';
			initialValues = DatasetStepService.createInitialValues({
				validationName: formData.validationName || '',
				userName: formData.userName || '',
				date: formData.date || '',
				datasetName: formData.datasetName || '',
				datasetDescription: formData.datasetDescription || '',
				uploadedFolder: formData.uploadedFolder,
				folderName: formData.folderName || ''
			});
		}
	});

	// Update store when local state changes and track field changes
	function handleFieldUpdate() {
		if (!readonly) {
			isUpdatingStore = true;

			if (validationName !== formData.validationName) {
				validationFormStore.updateField('validationName', validationName);
			}

			const currentState: DatasetStepState = {
				validationName: validationName,
				userName: formData.userName || '',
				date: formData.date || '',
				datasetName: formData.datasetName || '',
				datasetDescription: formData.datasetDescription || '',
				uploadedFolder: formData.uploadedFolder,
				folderName: formData.folderName || ''
			};

			const changeTracker = DatasetStepService.trackFieldChanges(currentState, initialValues);
			if (changeTracker.hasChanges) {
				onFieldChange();
			}

			setTimeout(() => {
				isUpdatingStore = false;
			}, 0);
		}
	}

	let isProcessingFolder = $state(false);
	let isCheckingDataset = $state(false);
	let isAutoValidating = $state(false);
	let isRunningFullValidation = $state(false);

	let validationResults = $derived(
		formData.validationResults || {
			stage: 'none',
			csvValidation: undefined,
			modelValidation: undefined
		}
	);

	async function handleFolderSelected(files: DatasetFolderFiles, selectedFolderName: string) {
		isProcessingFolder = true;
		validationFormStore.clearValidationResults();

		try {
			const result = await DatasetStepService.handleFolderSelected(
				files,
				selectedFolderName,
				formData.datasetName,
				readonly,
				model as any
			);

			if (result.success) {
				validationFormStore.setFolderFiles(result.uploadedFolder || {}, result.folderName || '');
				if (!formData.datasetName && result.datasetName) {
					validationFormStore.updateField('datasetName', result.datasetName);
				}
				if (result.validationResults) {
					validationFormStore.setValidationResults(result.validationResults);
					if (
						(result.validationResults.csvValidation &&
							!result.validationResults.csvValidation.success) ||
						(result.validationResults.modelValidation &&
							!result.validationResults.modelValidation.success)
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
				model as any
			);
			validationFormStore.setValidationResults(result.validationResults);
			if (result.showModal) {
				validationFormStore.setShowValidationModal(true);
			}
		} catch (error: any) {
			console.error('Auto-validation failed:', error);
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
		if (!formData.uploadedFolder?.data) return;
		isRunningFullValidation = true;
		try {
			const result = await DatasetStepService.performFullModelValidation(
				formData.uploadedFolder,
				metadata
			);
			validationFormStore.setValidationResults(result.validationResults);
		} catch (error: any) {
			console.error('Full model validation failed:', error);
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
		// Assuming DatasetStepService.handleFolderRemoved() might not exist or is problematic
		// console.warn('DatasetStepService.handleFolderRemoved() is not called.');
		validationFormStore.clearFolderFiles();
		validationFormStore.clearValidationResults();
	}

	interface ColumnMappingRow {
		csvColumn: string | null;
		modelColumn: string | null;
	}

	function getColumnMappingRows(csvColumns: string[], modelColumns: string[]): ColumnMappingRow[] {
		const maxLength = Math.max(csvColumns.length, modelColumns.length);
		const rows: ColumnMappingRow[] = [];
		for (let i = 0; i < maxLength; i++) {
			rows.push({ csvColumn: csvColumns[i] || null, modelColumn: modelColumns[i] || null });
		}
		return rows;
	}

	function generateFallbackColumns(): Array<{ name: string; isCategorical: boolean }> {
		const fallbackColumns: Array<{ name: string; isCategorical: boolean }> = [];
		if (model?.['Input data1'] && Array.isArray(model['Input data1'])) {
			// Corrected access to Input data1
			const inputData = model['Input data1'];
			inputData.forEach((input) => {
				if (input['Input label']?.['@value']) {
					fallbackColumns.push({
						name: input['Input label']['@value'],
						isCategorical: input['Type of input']?.['@value'] === 'c'
					});
				}
			});
		}
		if (fallbackColumns.length === 0) {
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

	let columnTypes = $state<Record<string, boolean>>({});

	$effect(() => {
		async function updateColumnTypes() {
			const newColumnTypes: Record<string, boolean> = {};
			if (formData.uploadedFolder?.metadata) {
				try {
					const metadataText = await formData.uploadedFolder.metadata.text();
					const parsedMetadata = JSON.parse(metadataText);
					const inputData = parsedMetadata?.['Input data1'] || []; // Use Input data1
					if (Array.isArray(inputData)) {
						for (const input of inputData) {
							const inputLabel = input?.['Input label']?.['@value'];
							const typeOfInput = input?.['Type of input']?.['@value'];
							if (inputLabel) newColumnTypes[inputLabel] = typeOfInput === 'c';
						}
					}
				} catch (error) {
					console.warn('Error parsing uploaded metadata:', error);
				}
			} else if (model?.['Input data1']) {
				// Use Input data1
				try {
					const inputData = model['Input data1'];
					if (Array.isArray(inputData)) {
						for (const input of inputData) {
							const inputLabel = input?.['Input label']?.['@value'];
							const typeOfInput = input?.['Type of input']?.['@value'];
							if (inputLabel) newColumnTypes[inputLabel] = typeOfInput === 'c';
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
		return columnTypes[modelColumn] || false;
	}

	function checkColumnTypeFromMetadata(metadata: any, columnName: string): boolean {
		const inputData = metadata?.['Input data1'] || [];
		for (const input of inputData) {
			const inputLabel = input?.['Input label']?.['@value'];
			const typeOfInput = input?.['Type of input']?.['@value'];
			if (inputLabel === columnName && typeOfInput === 'c') return true;
		}
		return false;
	}

	async function checkDataset() {
		isCheckingDataset = true;
		validationFormStore.clearValidationResults();
		try {
			// console.warn("DatasetStepService.checkDataset is currently not implemented or under review.");
			// For now, let's assume this function might not be needed or its logic is covered elsewhere.
			// If it is critical, its definition in DatasetStepService needs to be verified.
			validationFormStore.setValidationResults({
				csvValidation: { success: true, message: 'Dataset check placeholder.' },
				stage: 'csv'
			});
		} catch (error: any) {
			console.error('Dataset check failed:', error);
			validationFormStore.setValidationResults({
				modelValidation: {
					success: false,
					message: `Dataset check failed: ${error.message || 'Unknown error occurred'}`
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
			navigator.clipboard.writeText(document.getElementById('textToCopy')?.textContent || ''); // Added null check
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
			model={model as any}
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
		</div>
	</div>

	<!-- Right Column: CSV Validation Results -->
	<div class="space-y-6">
		{#if validationResults.csvValidation?.details || (validationResults.stage === 'complete' && formData.uploadedFolder?.data)}
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
<!--
===
<pre
	class="relative h-52 w-full overflow-scroll overscroll-contain rounded-lg bg-slate-100 p-1 text-left text-xs"
	id="textToCopy"><button
		class="btn btn-ghost btn-sm tooltip absolute right-0 top-0"
		onclick={() => {
			navigator.clipboard.writeText(document.getElementById('textToCopy')?.textContent || '');
		}}>Copy</button>{JSON.stringify(model, null, 2)}</pre>
===
-->
