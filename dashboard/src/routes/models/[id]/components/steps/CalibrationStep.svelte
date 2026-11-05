<script lang="ts">
	import { validationFormStore } from '$lib/stores/models/validation.store';
	import type { CalibrationResponse } from '$lib/api/faivor-backend';
	import { CalibrationService, CalibrationRequestError } from '$lib/services/calibration-service';
	import type { FullJsonLdModel } from '$lib/stores/models/types';
	import CalibrationResults from '../CalibrationResults.svelte';

	interface Props {
		readonly?: boolean;
		model?: FullJsonLdModel;
	}

	let { readonly = false, model }: Props = $props();

	let calibration = $state<CalibrationResponse | null>($validationFormStore.calibrationResults ?? null);
	let isCalibrating = $state(false);
	let calibrationError = $state<string | null>(null);
	let calibrationErrorDetails = $state<any>(null);

	async function runCalibration() {
		const uploadedFolder = $validationFormStore.uploadedFolder;
		if (!uploadedFolder?.data) return;

		isCalibrating = true;
		calibrationError = null;
		calibrationErrorDetails = null;

		try {
			let modelMetadata: any;
			if (model) {
				const { DatasetStepService } = await import('$lib/services/dataset-step-service');
				modelMetadata = DatasetStepService.transformModelMetadataToFAIR(model as any);
			} else if (uploadedFolder.metadata) {
				modelMetadata = JSON.parse(await uploadedFolder.metadata.text());
			} else {
				throw new Error('No model metadata available for calibration');
			}
			calibration = await CalibrationService.run(modelMetadata, uploadedFolder);
			validationFormStore.setCalibrationResults(calibration);
		} catch (error: any) {
			console.error('❌ Calibration failed:', error);
			if (error instanceof CalibrationRequestError) {
				calibrationError = error.info.message;
				calibrationErrorDetails = error.info;
			} else {
				calibrationError = error?.message || 'Calibration failed';
			}
		} finally {
			isCalibrating = false;
		}
	}
</script>

<div class="grid grid-cols-1 gap-6">
	<div class="flex items-center gap-4">
		<button
			class="btn btn-primary"
			onclick={runCalibration}
			disabled={isCalibrating || readonly || !$validationFormStore.uploadedFolder?.data}
		>
			{#if isCalibrating}
				<span class="loading loading-spinner loading-sm"></span>
				Calibrating...
			{:else}
				Run calibration
			{/if}
		</button>
		{#if !$validationFormStore.uploadedFolder?.data}
			<span class="text-base-content/70 text-sm">Upload a dataset in the first step to run calibration.</span>
		{/if}
	</div>

	{#if calibrationError}
		<div class="alert alert-error">
			<div>
				<h3 class="font-bold">Calibration failed</h3>
				<div class="text-sm">{calibrationError}</div>
				{#if calibrationErrorDetails?.userGuidance}
					<div class="mt-2 text-sm">{calibrationErrorDetails.userGuidance}</div>
				{/if}
				{#if calibrationErrorDetails?.technicalDetails}
					<details class="mt-2">
						<summary class="cursor-pointer text-sm">Technical details</summary>
						<pre class="whitespace-pre-wrap text-xs">{calibrationErrorDetails.technicalDetails}</pre>
					</details>
				{/if}
				{#if calibrationErrorDetails?.code}
					<div class="mt-2 text-xs">
						Error Code: <code class="font-mono">{calibrationErrorDetails.code}</code>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if calibration}
		<CalibrationResults {calibration} />
	{/if}
</div>
