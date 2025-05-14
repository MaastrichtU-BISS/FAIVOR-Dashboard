<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import MaterialSymbolsClose from '~icons/material-symbols/close';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	import type { ValidationJob } from '$lib/stores/validation.store.ts';

	interface Props {
		validationJob: ValidationJob | null;
		isOpen: boolean;
	}

	let { validationJob, isOpen }: Props = $props();

	function closeModal() {
		dispatch('close');
	}

	function handleExportReport() {
		// TODO: Implement export report functionality
		console.log('Exporting report...');
	}

	function handleUploadResults() {
		// TODO: Implement upload results functionality
		console.log('Uploading results...');
	}
</script>

<dialog
	id="results_modal"
	class="modal modal-bottom sm:modal-middle z-[10000] !mt-0 h-full w-full"
	class:modal-open={isOpen}
>
	<div class="modal-box bg-base-100 h-[90vh] max-h-none w-full !max-w-full p-8">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-bold">Performance metrics</h2>
			<button class="btn btn-outline" onclick={handleExportReport}>Export report</button>
		</div>

		<!-- Metrics Placeholder -->
		<div
			class="border-base-300 mb-4 flex h-[60%] items-center justify-center rounded-lg border p-4"
		>
			<p class="text-base-content/70">Metrics placeholder</p>
			<!-- TODO: Replace with actual metrics visualization -->
		</div>

		<!-- Output Message and Custom Comments -->
		<div class="mb-4 grid grid-cols-2 gap-4">
			<div>
				<h3 class="mb-2 text-lg font-semibold">Output message</h3>
				<textarea
					class="textarea textarea-bordered h-24 w-full"
					placeholder="The model validation results were successfully uploaded / Logs of errors"
					readonly
				></textarea>
				<!-- TODO: Bind actual output message -->
			</div>
			<div>
				<h3 class="mb-2 text-lg font-semibold">Custom comments</h3>
				<textarea
					class="textarea textarea-bordered h-24 w-full"
					placeholder="Comments textarea"
				></textarea>
				<!-- TODO: Bind actual custom comments -->
			</div>
		</div>

		<!-- Check and Upload -->
		<div class="mb-4 flex items-center gap-4">
			<p class="text-lg font-semibold">Check and upload model validation results</p>
			<button class="btn btn-outline" onclick={handleUploadResults}>Upload results</button>
		</div>

		<!-- Close Button -->
		<div class="modal-action">
			<button class="btn" onclick={closeModal}>Close</button>
		</div>
	</div>

	<div class="modal-backdrop" onclick={closeModal}>
		<button>close</button>
	</div>
</dialog>
