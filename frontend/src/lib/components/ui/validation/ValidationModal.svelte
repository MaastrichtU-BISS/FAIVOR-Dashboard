<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import DatasetStep from './steps/DatasetStep.svelte';
	import DatasetCharacteristicsStep from './steps/DatasetCharacteristicsStep.svelte';
	import MetricsForValidationStep from './steps/MetricsForValidationStep.svelte';
	import PerformanceMetricsStep from './steps/PerformanceMetricsStep.svelte';

	const dispatch = createEventDispatcher();

	export let open = false;

	let currentStep = 0;
	const steps = [
		{ title: 'Dataset', active: true },
		{ title: 'Dataset Characteristics', active: false },
		{ title: 'Metrics for validation', active: false },
		{ title: 'Performance metrics', active: false }
	];

	// Form data
	let userName = '';
	let date = '';
	let uploadedFile: File | null = null;
	let datasetDescription = '';
	let metricsDescription = '';
	let performanceMetrics = '';

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

	function closeModal() {
		open = false;
		dispatch('close');
	}

	function handleSubmit() {
		// TODO: Handle form submission
		const formData = {
			userName,
			date,
			uploadedFile,
			datasetDescription,
			metricsDescription,
			performanceMetrics
		};
		console.log('Form submitted:', formData);
		closeModal();
	}
</script>

// TODO: change class:modal-open={open} when finished developing
<dialog
	id="validation_modal"
	class="modal modal-bottom sm:modal-middle h-full w-full"
	class:modal-open={true}
>
	<div class="modal-box bg-base-100 h-[90vh] max-h-none w-full !max-w-full p-8">
		<!-- Stepper -->
		<ul class="steps mb-8 w-full">
			{#each steps as step, i}
				<li class="step {step.active || i < currentStep ? 'step-primary' : ''}">{step.title}</li>
			{/each}
		</ul>

		<!-- Content -->
		<div class="h-[calc(100%-12rem)] w-full overflow-y-auto">
			{#if currentStep === 0}
				<DatasetStep bind:userName bind:date bind:uploadedFile />
			{:else if currentStep === 1}
				<DatasetCharacteristicsStep bind:datasetDescription />
			{:else if currentStep === 2}
				<MetricsForValidationStep bind:metricsDescription />
			{:else if currentStep === 3}
				<PerformanceMetricsStep bind:performanceMetrics />
			{/if}
		</div>

		<!-- Navigation -->
		<div class="modal-action mt-8">
			<button class="btn" on:click={closeModal}>Close</button>
			<div class="flex-1"></div>
			{#if currentStep > 0}
				<button class="btn btn-outline" on:click={prevStep}>Previous</button>
			{/if}
			{#if currentStep < steps.length - 1}
				<button class="btn btn-primary" on:click={nextStep}>Next</button>
			{:else}
				<button class="btn btn-primary" on:click={handleSubmit}>Submit</button>
			{/if}
		</div>
	</div>

	<div class="modal-backdrop" on:click={closeModal}>
		<button>close</button>
	</div>
</dialog>
