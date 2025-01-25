<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import DatasetStep from './steps/DatasetStep.svelte';
	import DatasetCharacteristicsStep from './steps/DatasetCharacteristicsStep.svelte';
	import MetricsForValidationStep from './steps/MetricsForValidationStep.svelte';
	import PerformanceMetricsStep from './steps/PerformanceMetricsStep.svelte';
	interface ValidationJob {
		val_id: string;
		start_datetime: string;
		validation_status: 'pending' | 'running' | 'completed' | 'failed';
		validation_result: {
			dataProvided?: boolean;
			dataCharacteristics?: boolean;
			metrics?: boolean;
			published?: boolean;
		};
		userName?: string;
		datasetDescription?: string;
		metricsDescription?: string;
		performanceMetrics?: string;
	}

	const dispatch = createEventDispatcher();

	interface Props {
		open?: boolean;
		validation?: ValidationJob;
		mode?: 'create' | 'view' | 'edit';
	}

	let {
		open = $bindable(false),
		validation = undefined,
		mode = $bindable('create')
	}: Props = $props();

	let currentStep = $state(0);
	const steps = $state([
		{ title: 'Dataset', active: true },
		{ title: 'Dataset Characteristics', active: false },
		{ title: 'Metrics for validation', active: false },
		{ title: 'Performance metrics', active: false }
	]);

	// Form data
	let userName = $state(validation?.userName || '');
	let date = $state(validation?.start_datetime || '');
	let uploadedFile: File | null = $state(null);
	let datasetDescription = $state(validation?.datasetDescription || '');
	let metricsDescription = $state(validation?.metricsDescription || '');
	let performanceMetrics = $state(validation?.performanceMetrics || '');

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

	function closeModal() {
		open = false;
		dispatch('close');
	}

	function handleSubmit() {
		// Only allow submit in create/edit modes
		if (mode === 'view') return;

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

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			goToStep(index);
		}
	}

	// Update form data when validation changes
	$effect(() => {
		if (validation) {
			userName = validation.userName || '';
			date = validation.start_datetime;
			datasetDescription = validation.datasetDescription || '';
			metricsDescription = validation.metricsDescription || '';
			performanceMetrics = validation.performanceMetrics || '';
		}
	});

	$effect(() => {
		if (mode === 'view') {
			// Reset step to first when opening in view mode
			currentStep = 0;
			steps.forEach((step, i) => {
				step.active = i === 0;
			});
		}
	});
</script>

<dialog
	id="shared_validation_modal"
	class="modal modal-bottom sm:modal-middle z-[10000] !mt-0 h-full w-full"
	class:modal-open={open}
>
	<div class="modal-box bg-base-100 h-[90vh] max-h-none w-full !max-w-full p-8">
		<!-- Stepper -->
		<ul class="steps mb-8 w-full">
			{#each steps as step, i}
				<li
					class="step transition-all {step.active || i < currentStep
						? 'step-primary'
						: ''}  cursor-pointer"
					onclick={() => goToStep(i)}
					onkeydown={(e) => handleKeydown(e, i)}
					role="button"
					tabindex="0"
				>
					{step.title}
				</li>
			{/each}
		</ul>

		<!-- Content -->
		<div class="h-[calc(100%-12rem)] w-full overflow-y-auto">
			{#if currentStep === 0}
				<DatasetStep bind:userName bind:date bind:uploadedFile readonly={mode === 'view'} />
			{:else if currentStep === 1}
				<DatasetCharacteristicsStep bind:datasetDescription readonly={mode === 'view'} />
			{:else if currentStep === 2}
				<MetricsForValidationStep bind:metricsDescription readonly={mode === 'view'} />
			{:else if currentStep === 3}
				<PerformanceMetricsStep bind:performanceMetrics readonly={mode === 'view'} />
			{/if}
		</div>

		<!-- Navigation -->
		<div class="modal-action mt-8">
			<button class="btn" onclick={closeModal}>Close</button>
			<div class="flex-1"></div>
			{#if mode !== 'view'}
				{#if currentStep > 0}
					<button class="btn btn-outline" onclick={prevStep}>Previous</button>
				{/if}
				{#if currentStep < steps.length - 1}
					<button class="btn btn-primary" onclick={nextStep}>Next</button>
				{:else}
					<button class="btn btn-primary" onclick={handleSubmit}>Submit</button>
				{/if}
			{:else}
				{#if currentStep > 0}
					<button class="btn btn-outline" onclick={prevStep}>Previous</button>
				{/if}
				{#if currentStep < steps.length - 1}
					<button class="btn btn-primary" onclick={nextStep}>Next</button>
				{/if}
			{/if}
		</div>
	</div>

	<div class="modal-backdrop" onclick={closeModal}>
		<button>close</button>
	</div>
</dialog>
