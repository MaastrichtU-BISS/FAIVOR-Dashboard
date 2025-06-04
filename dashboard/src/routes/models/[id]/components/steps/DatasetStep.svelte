<script lang="ts">
	import SolarCalculatorMinimalisticLinear from '~icons/solar/calculator-minimalistic-linear';
	import MaterialSymbolsCheck from '~icons/material-symbols/check';
	import FolderUpload from '$lib/components/ui/FolderUpload.svelte';
	import ValidationErrorModal from '$lib/components/ui/ValidationErrorModal.svelte';
	import type { DatasetFolderFiles } from '$lib/types/validation';
	import { datasetStorage, generateDatasetId, parseJSONFile } from '$lib/utils/indexeddb-storage';
	import { FaivorBackendAPI, type CSVValidationResponse } from '$lib/api/faivor-backend';

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
	let showValidationModal = $state(false);
	let checkResult = $state<{
		success: boolean;
		message: string;
		details?: CSVValidationResponse;
	} | null>(null);

	async function handleFolderSelected(files: DatasetFolderFiles, selectedFolderName: string) {
		isProcessingFolder = true;
		// Clear previous check result when new folder is selected
		checkResult = null;

		try {
			uploadedFolder = files;
			folderName = selectedFolderName;

			// Set dataset name from folder name if not already set
			if (!datasetName) {
				datasetName = selectedFolderName;
			}

			// Store in IndexedDB for future reference
			const datasetId = generateDatasetId();
			const parsed: any = {};

			// Parse JSON files
			if (files.metadata) {
				parsed.metadata = await parseJSONFile(files.metadata);
			}
			if (files.columnMetadata) {
				parsed.columnMetadata = await parseJSONFile(files.columnMetadata);
			}

			await datasetStorage.saveDataset({
				id: datasetId,
				name: selectedFolderName,
				uploadDate: new Date().toISOString(),
				files,
				parsed
			});

			console.log('Dataset saved to IndexedDB with ID:', datasetId);

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
			// Parse the metadata file
			const metadataText = await uploadedFolder.metadata.text();
			const parsedMetadata = JSON.parse(metadataText);

			// Call the backend API to validate the CSV
			const validationResult = await FaivorBackendAPI.validateCSV(
				parsedMetadata,
				uploadedFolder.data
			);

			checkResult = {
				success: validationResult.valid,
				message: validationResult.valid
					? `CSV validation successful! Found ${validationResult.csv_columns.length} columns in CSV and ${validationResult.model_input_columns.length} expected model input columns.`
					: validationResult.message || 'CSV validation failed.',
				details: validationResult
			};

			// Show modal if there are errors or warnings
			if (!validationResult.valid || checkResult.details) {
				showValidationModal = true;
			}
		} catch (error: any) {
			console.error('Auto-validation failed:', error);
			checkResult = {
				success: false,
				message: `Dataset validation failed: ${error.message || 'Unknown error occurred'}`
			};
			showValidationModal = true;
		} finally {
			isAutoValidating = false;
		}
	}

	function handleFolderRemoved() {
		uploadedFolder = undefined;
		folderName = '';
		// Clear check result when folder is removed
		checkResult = null;
	}

	function calculateSummary() {
		// TODO: Implement summary calculation
		console.log('Calculating summary...');
	}

	async function checkDataset() {
		if (!uploadedFolder?.data || !uploadedFolder?.metadata) {
			checkResult = {
				success: false,
				message: 'Please upload both data file (CSV) and metadata file before checking the dataset.'
			};
			return;
		}

		isCheckingDataset = true;
		checkResult = null;

		try {
			// Parse the metadata file
			const metadataText = await uploadedFolder.metadata.text();
			const parsedMetadata = JSON.parse(metadataText);

			// Call the backend API to validate the CSV
			const validationResult = await FaivorBackendAPI.validateCSV(
				parsedMetadata,
				uploadedFolder.data
			);

			checkResult = {
				success: validationResult.valid,
				message: validationResult.valid
					? `CSV validation successful! Found ${validationResult.csv_columns.length} columns in CSV and ${validationResult.model_input_columns.length} expected model input columns.`
					: validationResult.message || 'CSV validation failed.',
				details: validationResult
			};
		} catch (error: any) {
			console.error('Dataset check failed:', error);
			checkResult = {
				success: false,
				message: `Dataset check failed: ${error.message || 'Unknown error occurred'}`
			};
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
				<span>Processing folder and saving to local storage...</span>
			</div>
		{/if}

		{#if isAutoValidating}
			<div class="text-info flex items-center justify-center gap-2">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Automatically validating dataset...</span>
			</div>
		{/if}

		<div class="flex flex-col items-center gap-4">
			<button
				class="btn btn-outline gap-2"
				onclick={checkDataset}
				disabled={isCheckingDataset ||
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
					Check the dataset
				{/if}
			</button>

			{#if checkResult}
				<div class="alert {checkResult.success ? 'alert-success' : 'alert-error'} w-full">
					<div class="flex flex-col gap-2">
						<span class="font-medium">{checkResult.message}</span>
						{#if checkResult.success && checkResult.details}
							<div class="text-sm opacity-80">
								<div>CSV Columns: {checkResult.details.csv_columns.join(', ')}</div>
								<div>Model Input Columns: {checkResult.details.model_input_columns.join(', ')}</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Right Column -->
	<div>
		<div class="grid grid-cols-2 gap-8">
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
	validationResult={checkResult}
	onClose={() => (showValidationModal = false)}
/>
