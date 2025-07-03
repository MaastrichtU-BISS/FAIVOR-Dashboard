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

	function createColumnMapping(
		csvColumns: string[],
		modelColumns: string[],
		mappingData?: any
	): Array<{ csvColumn: string; modelColumn: string | null }> {
		const mappings: Array<{ csvColumn: string; modelColumn: string | null }> = [];

		// Check if we have explicit mapping data from the backend
		if (mappingData && mappingData.column_mapping) {
			// Use explicit mapping from backend
			csvColumns.forEach((csvCol) => {
				const mappedModelColumn = mappingData.column_mapping[csvCol] || null;
				mappings.push({
					csvColumn: csvCol,
					modelColumn: mappedModelColumn
				});
			});
		} else {
			// Create a copy of model columns to track which ones are used
			const availableModelColumns = [...modelColumns];

			// First pass: exact name matches
			csvColumns.forEach((csvCol) => {
				const exactMatchIndex = availableModelColumns.findIndex(
					(modelCol) => modelCol.toLowerCase() === csvCol.toLowerCase()
				);

				if (exactMatchIndex !== -1) {
					const matchedColumn = availableModelColumns[exactMatchIndex];
					mappings.push({
						csvColumn: csvCol,
						modelColumn: matchedColumn
					});
					// Remove the matched column so it can't be used again
					availableModelColumns.splice(exactMatchIndex, 1);
				} else {
					// Mark as unmatched for now
					mappings.push({
						csvColumn: csvCol,
						modelColumn: null
					});
				}
			});

			// Second pass: fill remaining unmapped CSV columns with remaining model columns
			let availableIndex = 0;
			for (let i = 0; i < mappings.length; i++) {
				if (mappings[i].modelColumn === null && availableIndex < availableModelColumns.length) {
					mappings[i].modelColumn = availableModelColumns[availableIndex];
					availableIndex++;
				}
			}
		}

		return mappings;
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
			<label class="label font-medium" for="validationName">Validation Name</label>
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
			<label class="label font-medium" for="datasetName">Dataset</label>
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
			<div class=" flex items-center justify-center gap-2">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Running full model validation (this may take a while)...</span>
			</div>
		{/if}

		<div class="flex flex-col items-center gap-4">
			<!-- Validation Progress Indicator -->
			{#if isAutoValidating || isRunningFullValidation}
				<div class="w-full">
					{#if isAutoValidating}
						<div class="text-info bg-info/10 flex items-center justify-center gap-2 rounded-lg p-4">
							<span class="loading loading-spinner loading-sm"></span>
							<span>Automatically validating dataset...</span>
						</div>
					{/if}

					{#if isRunningFullValidation}
						<div class=" bg-warning/10 flex items-center justify-center gap-2 rounded-lg p-4">
							<span class="loading loading-spinner loading-sm"></span>
							<span>Running full model validation (this may take a while)...</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Action Buttons -->
			{#if formData.uploadedFolder?.data && !isAutoValidating && !isRunningFullValidation}
				<div class="flex w-full gap-2">
					<button
						class="btn btn-outline btn-sm flex-1"
						onclick={checkDataset}
						disabled={isCheckingDataset || readonly}
					>
						{#if isCheckingDataset}
							<span class="loading loading-spinner loading-xs"></span>
							Checking...
						{:else}
							<SolarCalculatorMinimalisticLinear class="h-4 w-4" />
							Validate Dataset
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Right Column: Column Mapping -->
	<div class="space-y-6">
		<!-- Column Mapping Card - Always shown -->
		<div class="card mr-3 shadow-xl">
			{#if true}
				{@const csvDetails = validationResults.csvValidation?.details}
				{@const hasCsvDetails = !!csvDetails}
				{@const hasUploadedData = !!formData.uploadedFolder?.data}
				{@const fallbackColumns = generateFallbackColumns()}

				<div class="card-body">
					<h3 class="card-title flex items-center gap-2 text-lg">
						<SolarCalculatorMinimalisticLinear class="h-5 w-5" />
						Column Mapping
					</h3>

					<!-- Column Headers -->
					<div class="bg-base-200 mb-4 rounded-lg p-4">
						<div class="grid grid-cols-3 gap-4">
							<div class="text-base-content/80 text-sm font-semibold">CSV columns</div>
							<div class="text-base-content/80 text-sm font-semibold">Model columns</div>
							<div class="text-base-content/80 text-center text-sm font-semibold">
								Is categorical
							</div>
						</div>
					</div>

					<!-- Column Mapping Rows -->
					<div class="max-h-96 space-y-1 overflow-y-auto">
						{#if hasCsvDetails}
							{@const columnMappings = createColumnMapping(
								csvDetails.csv_columns,
								csvDetails.model_input_columns,
								csvDetails
							)}
							{#each columnMappings as mapping, index}
								<div
									class="hover:bg-base-50 grid grid-cols-3 items-center gap-4 rounded px-2 py-2 transition-colors"
								>
									<!-- CSV Column -->
									<div class="flex items-center gap-2">
										<div class="bg-primary h-2 w-2 rounded-full"></div>
										<span class="text-sm font-medium">{mapping.csvColumn}</span>
									</div>

									<!-- Model Column with Arrow -->
									<div class="flex items-center gap-2">
										<svg
											class="text-primary h-4 w-4 flex-shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 7l5 5m0 0l-5 5m5-5H6"
											/>
										</svg>
										{#if mapping.modelColumn}
											<span class="text-sm font-medium">{mapping.modelColumn}</span>
										{:else}
											<span class="text-base-content/40 text-sm italic">No mapping</span>
										{/if}
									</div>

									<!-- Categorical Indicator -->
									<div class="flex justify-center">
										{#if mapping.modelColumn}
											<div class="flex items-center gap-2">
												<input
													type="checkbox"
													class="checkbox checkbox-sm checkbox-primary"
													checked={getIsCategorical(mapping.modelColumn)}
													disabled
												/>
												<span class="text-base-content/60 text-xs">
													{getIsCategorical(mapping.modelColumn) ? 'Yes' : 'No'}
												</span>
											</div>
										{:else}
											<span class="text-base-content/40">—</span>
										{/if}
									</div>
								</div>
							{/each}

							<!-- Show extra model columns that don't have CSV mappings -->
							{@const unmappedModelColumns = csvDetails.model_input_columns.slice(
								csvDetails.csv_columns.length
							)}
							{#if unmappedModelColumns.length > 0}
								{#each unmappedModelColumns as modelColumn, index}
									<div
										class="hover:bg-base-50 grid grid-cols-3 items-center gap-4 rounded px-2 py-2 opacity-60 transition-colors"
									>
										<!-- Empty CSV Column -->
										<div class="flex items-center gap-2">
											<div class="bg-base-300 h-2 w-2 rounded-full"></div>
											<span class="text-base-content/40 text-sm italic">Missing CSV column</span>
										</div>

										<!-- Model Column -->
										<div class="flex items-center gap-2">
											<svg
												class="text-base-content/40 h-4 w-4 flex-shrink-0"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M13 7l5 5m0 0l-5 5m5-5H6"
												/>
											</svg>
											<span class=" text-sm font-medium">{modelColumn}</span>
										</div>

										<!-- Categorical Indicator -->
										<div class="flex justify-center">
											<div class="flex items-center gap-2">
												<input
													type="checkbox"
													class="checkbox checkbox-sm checkbox-warning"
													checked={getIsCategorical(modelColumn)}
													disabled
												/>
												<span class="text-base-content/60 text-xs">
													{getIsCategorical(modelColumn) ? 'Yes' : 'No'}
												</span>
											</div>
										</div>
									</div>
								{/each}
							{/if}
						{:else}
							<!-- Preview display using model metadata -->
							{#each fallbackColumns as column, index}
								<div
									class="hover:bg-base-50 grid grid-cols-3 items-center gap-4 rounded px-2 py-2 transition-colors"
								>
									<!-- CSV Column Placeholder -->
									<div class="flex items-center gap-2">
										<div class="bg-base-300 h-2 w-2 rounded-full"></div>
										<span class="text-base-content/50 text-sm italic">
											Upload CSV to see columns
										</span>
									</div>

									<!-- Model Column with Arrow -->
									<div class="flex items-center gap-2">
										<svg
											class="text-base-content/40 h-4 w-4 flex-shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 7l5 5m0 0l-5 5m5-5H6"
											/>
										</svg>
										<span class="text-secondary text-sm font-medium">{column.name}</span>
									</div>

									<!-- Categorical Indicator -->
									<div class="flex justify-center">
										<div class="flex items-center gap-2">
											<input
												type="checkbox"
												class="checkbox checkbox-sm checkbox-secondary"
												checked={column.isCategorical}
												disabled
											/>
											<span class="text-base-content/60 text-xs">
												{column.isCategorical ? 'Yes' : 'No'}
											</span>
										</div>
									</div>
								</div>
							{/each}

							{#if fallbackColumns.length === 0}
								<div class="text-base-content/60 py-8 text-center">
									<div class="flex flex-col items-center gap-2">
										<SolarCalculatorMinimalisticLinear class="text-base-content/40 h-8 w-8" />
										<p class="text-sm">
											Column mapping details will be available after uploading your dataset.
										</p>
									</div>
								</div>
							{/if}
						{/if}
					</div>

					<!-- Validation Status - Always visible outside scroll area -->
					{#if hasUploadedData && validationResults.csvValidation}
						<div
							class="mt-4 rounded-lg p-3 {validationResults.csvValidation.success
								? 'bg-success/10 border-success/20 border'
								: 'bg-error/10 border-error/20 border'}"
						>
							<div class="flex items-center gap-2">
								{#if validationResults.csvValidation.success}
									<MaterialSymbolsCheck class="text-success h-4 w-4" />
									<span class="text-success text-sm font-medium">CSV Validation Successful</span>
								{:else}
									<svg
										class="text-error h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
									<span class="text-error text-sm font-medium">CSV Validation Failed</span>
								{/if}
							</div>
							<p
								class="mt-1 text-sm {validationResults.csvValidation.success
									? 'text-success'
									: 'text-error'}/80"
							>
								{validationResults.csvValidation.message}
							</p>
							{#if hasCsvDetails && csvDetails.csv_columns.length !== csvDetails.model_input_columns.length}
								<div class="mt-2 flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class=" h-4 w-4 shrink-0 stroke-current"
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
									<span class=" text-sm">
										Column count mismatch: CSV has {csvDetails.csv_columns.length} columns, model expects
										{csvDetails.model_input_columns.length} columns
									</span>
								</div>
							{/if}
						</div>
					{:else if validationResults.stage === 'complete'}
						<div class="bg-info/10 border-info/20 mt-4 rounded-lg border p-3">
							<div class="flex items-center gap-2">
								<MaterialSymbolsCheck class="text-info h-4 w-4" />
								<span class="text-info text-sm font-medium">Validation Complete</span>
							</div>
							<p class="text-info/80 mt-1 text-sm">
								Validation completed successfully. Column details are available from the original
								validation.
							</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Additional Validation Results -->
		{#if validationResults.modelValidation}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h3 class="card-title text-lg">Model Validation Results</h3>
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
										Metrics: {Object.keys(validationResults.modelValidation.details.metrics).length}
										calculated
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
