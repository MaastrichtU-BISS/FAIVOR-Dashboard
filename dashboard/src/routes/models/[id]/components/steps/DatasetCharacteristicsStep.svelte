<script lang="ts">
	import SolarCalculatorMinimalisticLinear from '~icons/solar/calculator-minimalistic-linear';
	import MaterialSymbolsAnalytics from '~icons/material-symbols/analytics';
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import { DatasetStepService } from '$lib/services/dataset-step-service'; // For calculateSummary
	import DatasetVisualization from '$lib/components/validation/DatasetVisualization.svelte';
	import type { DatasetAnalysis } from '$lib/services/csv-analysis-service';

	interface Props {
		readonly?: boolean;
		onFieldChange?: () => void;
	}

	let { readonly = false, onFieldChange = () => {} }: Props = $props();

	// Use the validation form store for all data
	let formData = $derived($validationFormStore);

	// Local state for input fields that sync with the store
	// Note: datasetDescription from props is now formData.datasetDescription
	// and datasetCharacteristics is a new field from the store
	let userName = $state(formData.userName || '');
	let date = $state(formData.date || '');
	let datasetDescription = $state(formData.datasetDescription || '');
	let datasetCharacteristics = $state(formData.datasetCharacteristics || '');

	// Check if we have uploaded data - analysis will show automatically
	let hasUploadedData = $derived(!!(formData.uploadedFolder?.data && formData.folderName));
	
	// Get existing dataset analysis from the store
	let existingAnalysis = $derived(formData.datasetAnalysis);
	
	// Handle analysis completion
	function handleAnalysisComplete(analysis: DatasetAnalysis) {
		console.log('📊 Dataset analysis completed:', analysis);
		validationFormStore.setDatasetAnalysis(analysis);
		if (onFieldChange) {
			onFieldChange();
		}
	}

	// Store initial values to track actual changes
	// We don't have a specific service for this step, so we manage initial values locally
	// or rely on the onFieldChange prop being triggered correctly by parent.
	// For simplicity, direct binding to store will trigger parent's onFieldChange if wired up.

	// Sync local state with store when formData changes from external sources
	let isUpdatingStoreFromEffect = false;
	$effect(() => {
		if (!isUpdatingStoreFromEffect) {
			userName = formData.userName || '';
			date = formData.date || '';
			datasetDescription = formData.datasetDescription || '';
			datasetCharacteristics = formData.datasetCharacteristics || '';
		}
	});

	// Update store when local state changes
	function handleFieldUpdate(field: keyof typeof formData, value: string) {
		if (!readonly) {
			isUpdatingStoreFromEffect = true;
			validationFormStore.updateField(field, value);
			if (onFieldChange) {
				onFieldChange(); // Notify parent about the change for auto-save
			}
			setTimeout(() => {
				isUpdatingStoreFromEffect = false;
			}, 0);
		}
	}

	// Specific handler for date as its event is onchange
	function handleDateChange(event: Event) {
		const target = event.target as HTMLInputElement;
		handleFieldUpdate('date', target.value);
	}

	function calculateSummary() {
		// This function was originally in DatasetStepService.
		// If it has complex logic or dependencies, it might need to be
		// exposed from the service or reimplemented here.
		// For now, assuming it's a simple placeholder or can be called if service is imported.
		console.log('Calculate summary clicked');
		// DatasetStepService.calculateSummary(); // If you want to call the original
	}
</script>

<div class="space-y-6">
	<div class="grid grid-cols-2 gap-8">
		<!-- <div>
			<label class="label" for="userName-step2">User</label>
			<input
				type="text"
				id="userName-step2"
				class="input input-bordered w-full"
				placeholder="Add user name (Sam Smith)"
				bind:value={userName}
				{readonly}
				oninput={() => handleFieldUpdate('userName', userName)}
			/>
		</div> -->

		<!-- <div>
			<label class="label" for="date-step2">Date</label>
			<input
				type="date"
				id="date-step2"
				class="input input-bordered w-full"
				bind:value={date}
				{readonly}
				onchange={handleDateChange}
			/>
		</div> -->
	</div>
	<div class="grid grid-cols-2 gap-8">
		<div>
			<h3 class="text-lg font-medium">Dataset description</h3>
			<textarea
				class="textarea textarea-bordered h-24 w-full"
				placeholder="Free text or structure, including purpose of validation (to test data (N=5), to validate (N>30), quality assurance), source of data, etc)"
				bind:value={datasetDescription}
				{readonly}
				oninput={() => handleFieldUpdate('datasetDescription', datasetDescription)}
			></textarea>
		</div>
		<div>
			<h3 class="text-lg font-medium">Dataset characteristics</h3>
			<textarea
				class="textarea textarea-bordered h-24 w-full"
				placeholder="Characteristics of dataset that are not given in the data file (as sex distribution, ethnicity, characteristics of groups)"
				bind:value={datasetCharacteristics}
				{readonly}
				oninput={() => handleFieldUpdate('datasetCharacteristics', datasetCharacteristics)}
			></textarea>
		</div>
	</div>

	<!-- <div class="mt-8 space-y-4">
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
		This last textarea is readonly and doesn't seem to be bound to any data.
		If it needs to display data from calculateSummary, that logic needs to be added.
	</div> -->

	<!-- Dataset Analysis Section - Shows automatically when data is available -->
	{#if hasUploadedData && formData.uploadedFolder}
		<div class="mt-8 space-y-4">
			<div class="mb-6 flex items-center gap-3">
				<MaterialSymbolsAnalytics class="text-primary h-6 w-6" />
				<h2 class="text-xl font-semibold">Dataset Analysis</h2>
				<div class="badge badge-primary badge-sm">Auto-generated</div>
			</div>

			<div class="bg-base-100 border-base-300 rounded-lg border">
				<DatasetVisualization
					folderFiles={formData.uploadedFolder}
					folderName={formData.folderName || 'Dataset'}
					onAnalysisComplete={handleAnalysisComplete}
					existingAnalysis={existingAnalysis}
				/>
			</div>
		</div>
	{:else if !hasUploadedData}
		<div class="mt-8">
			<div class="card bg-base-100 border-base-300 border">
				<div class="card-body py-8 text-center">
					<MaterialSymbolsAnalytics class="text-base-content/40 mx-auto mb-4 h-12 w-12" />
					<h3 class="mb-2 text-lg font-medium">Dataset Analysis</h3>
					<p class="text-base-content/70 text-sm">
						Upload a dataset in Step 1 to see detailed statistics, distributions, and visualizations
						automatically.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
