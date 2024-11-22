<script lang="ts">
	export let metricsDescription = '';
</script>

<div class="space-y-6">
	<div>
		<label class="label" for="metricsDescription">Metrics for validation</label>
		<textarea
			id="metricsDescription"
			class="textarea textarea-bordered h-48 w-full"
			placeholder="Free text or structure, including purpose of validation (to test data (N=5), to validate (N>30), quality assurance), source of data, etc)"
			bind:value={metricsDescription}
		></textarea>
	</div>

	<div class="flex gap-4">
		<button class="btn btn-outline btn-sm" on:click={() => {}}>Calculate the summary</button>
		<button class="btn btn-outline btn-sm" on:click={() => {}}>Check the dataset</button>
	</div>
</div>
