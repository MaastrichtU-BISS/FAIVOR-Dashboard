<script lang="ts">
	import SolarCalculatorMinimalisticLinear from '~icons/solar/calculator-minimalistic-linear';
	import MaterialSymbolsCheck from '~icons/material-symbols/check';
	import FolderUpload from '$lib/components/ui/FolderUpload.svelte';
	import ValidationErrorModal from '$lib/components/ui/ValidationErrorModal.svelte';
	import type { DatasetFolderFiles } from '$lib/types/validation';
	import {
		FaivorBackendAPI,
		type CSVValidationResponse,
		type ModelValidationResponse
	} from '$lib/api/faivor-backend';

	interface Props {
		validationName?: string;
		userName?: string;
		date?: string;
		datasetName?: string;
		uploadedFolder?: DatasetFolderFiles;
		folderName?: string;
		readonly?: boolean;
		onFieldChange?: () => void;
	}

	let {
		validationName = $bindable(''),
		userName = $bindable(''),
		date = $bindable(''),
		datasetName = $bindable(''),
		uploadedFolder = $bindable(undefined),
		folderName = $bindable(''),
		readonly = false,
		onFieldChange = () => {}
	}: Props = $props();

	// Store initial values to track actual changes
	let initialValues = $state({
		validationName: validationName || '',
		userName: userName || '',
		date: date || '',
		datasetName: datasetName || '',
		uploadedFolder: uploadedFolder,
		folderName: folderName || ''
	});

	// Track actual value changes
	$effect(() => {
		if (!readonly && onFieldChange) {
			const hasChanges =
				validationName !== initialValues.validationName ||
				userName !== initialValues.userName ||
				date !== initialValues.date ||
				datasetName !== initialValues.datasetName ||
				uploadedFolder !== initialValues.uploadedFolder ||
				folderName !== initialValues.folderName;

			if (hasChanges) {
				onFieldChange();
			}
		}
	});

	// Reset initial values when props change
	$effect(() => {
		initialValues = {
			validationName: validationName || '',
			userName: userName || '',
			date: date || '',
			datasetName: datasetName || '',
			uploadedFolder: uploadedFolder,
			folderName: folderName || ''
		};
	});

	let datasetDescription = $state('');
	let datasetCharacteristics = $state('');
	let isProcessingFolder = $state(false);
	let isCheckingDataset = $state(false);
	let isAutoValidating = $state(false);
	let isRunningFullValidation = $state(false);
	let showValidationModal = $state(false);

	// Enhanced validation results to support both CSV and model validation
	let validationResults = $state<{
		csvValidation?: {
			success: boolean;
			message: string;
			details?: CSVValidationResponse;
		};
		modelValidation?: {
			success: boolean;
			message: string;
			details?: ModelValidationResponse;
		};
		stage: 'none' | 'csv' | 'model' | 'complete';
	}>({
		stage: 'none'
	});

	async function handleFolderSelected(files: DatasetFolderFiles, selectedFolderName: string) {
		isProcessingFolder = true;
		// Clear previous validation results when new folder is selected
		validationResults = { stage: 'none' };

		try {
			uploadedFolder = files;
			folderName = selectedFolderName;

			// Set dataset name from folder name if not already set
			if (!datasetName) {
				datasetName = selectedFolderName;
			}

			console.log('Folder selected:', selectedFolderName);
			console.log('Files:', {
				metadata: files.metadata?.name,
				data: files.data?.name,
				columnMetadata: files.columnMetadata?.name
			});

			// Automatically validate the dataset after files are uploaded
			await performAutoValidation();
		} catch (error) {
			console.error('Error processing folder:', error);
		} finally {
			isProcessingFolder = false;
		}
	}

	async function performAutoValidation() {
		if (!uploadedFolder?.data || !uploadedFolder?.metadata || readonly) {
			return;
		}

		isAutoValidating = true;

		try {
			// Read metadata fresh
			const metadataText = await uploadedFolder.metadata.text();
			const metadata = JSON.parse(metadataText);

			console.log('Auto validation - Fresh metadata keys:', Object.keys(metadata));
			console.log(
				'Auto validation - Has General Model Information:',
				'General Model Information' in metadata
			);

			// Go directly to full model validation
			await performFullModelValidation(metadata);
		} catch (error: any) {
			console.error('Auto-validation failed:', error);
			validationResults.modelValidation = {
				success: false,
				message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
			};
			validationResults.stage = 'model';
			showValidationModal = true;
		} finally {
			isAutoValidating = false;
		}
	}

	async function performFullModelValidation(metadata: any) {
		if (!uploadedFolder?.data) {
			return;
		}

		isRunningFullValidation = true;

		try {
			// Read column metadata fresh if available
			let columnMetadata = {};
			if (uploadedFolder.columnMetadata) {
				const columnMetadataText = await uploadedFolder.columnMetadata.text();
				columnMetadata = JSON.parse(columnMetadataText);
			}

			console.log('Full model validation - Using metadata with keys:', Object.keys(metadata));
			console.log(
				'Full model validation - Using column metadata:',
				uploadedFolder.columnMetadata ? 'Available' : 'Not available'
			);

			// Call the full model validation API
			const modelValidationResult = await FaivorBackendAPI.validateModel(
				metadata,
				uploadedFolder.data,
				columnMetadata
			);

			validationResults.modelValidation = {
				success: true,
				message: `Model validation completed! Model: ${modelValidationResult.model_name}`,
				details: modelValidationResult
			};
			validationResults.stage = 'complete';
		} catch (error: any) {
			console.error('Full model validation failed:', error);
			validationResults.modelValidation = {
				success: false,
				message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
			};
			validationResults.stage = 'model';
		} finally {
			isRunningFullValidation = false;
		}
	}

	function handleFolderRemoved() {
		uploadedFolder = undefined;
		folderName = '';
		// Clear validation results when folder is removed
		validationResults = { stage: 'none' };
	}

	function calculateSummary() {
		// TODO: Implement summary calculation
		console.log('Calculating summary...');
	}

	async function checkDataset() {
		if (!uploadedFolder?.data || !uploadedFolder?.metadata) {
			validationResults.modelValidation = {
				success: false,
				message: 'Please upload both data file (CSV) and metadata file before checking the dataset.'
			};
			validationResults.stage = 'model';
			return;
		}

		isCheckingDataset = true;
		validationResults = { stage: 'none' };

		try {
			// Read metadata fresh
			const metadataText = await uploadedFolder.metadata.text();
			const metadata = JSON.parse(metadataText);

			console.log('Manual validation - Fresh metadata keys:', Object.keys(metadata));
			console.log(
				'Manual validation - Has General Model Information:',
				'General Model Information' in metadata
			);

			// Go directly to full model validation
			await performFullModelValidation(metadata);
		} catch (error: any) {
			console.error('Dataset check failed:', error);
			validationResults.modelValidation = {
				success: false,
				message: `Model validation failed: ${error.message || 'Unknown error occurred'}`
			};
			validationResults.stage = 'model';
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
				oninput={onFieldChange}
			/>
			<div class="label">
				<span class="label-text-alt text-base-content/60">
					Leave empty to auto-generate name with date/time
				</span>
			</div>
		</div>

		<div>
			<label class="label" for="datasetName">Dataset Name</label>
			<input
				type="text"
				id="datasetName"
				class="input input-bordered w-full"
				placeholder="Enter dataset name"
				bind:value={datasetName}
				{readonly}
				oninput={onFieldChange}
			/>
		</div>

		<!-- Dataset Folder Upload -->
		<FolderUpload
			bind:folderFiles={uploadedFolder}
			bind:folderName
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
			<button
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
			</button>

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
							class="badge {validationResults.stage === 'csv' ||
							validationResults.stage === 'complete'
								? 'badge-success'
								: 'badge-outline'}"
						>
							CSV ✓
						</div>
						<div
							class="badge {validationResults.stage === 'complete'
								? 'badge-success'
								: validationResults.stage === 'model'
									? 'badge-warning'
									: 'badge-outline'}"
						>
							{validationResults.stage === 'complete'
								? 'Model ✓'
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
					oninput={onFieldChange}
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
					onchange={onFieldChange}
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
<ValidationErrorModal
	bind:isOpen={showValidationModal}
	validationResult={validationResults.modelValidation}
	onClose={() => (showValidationModal = false)}
/>
