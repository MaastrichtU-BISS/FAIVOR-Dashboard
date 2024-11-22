<script lang="ts">
	export let datasetDescription = '';
</script>

<div class="space-y-6">
	<div>
		<label class="label" for="datasetDescription">Dataset description</label>
		<textarea
			id="datasetDescription"
			class="textarea textarea-bordered h-48 w-full"
			placeholder="Free text or structure, including purpose of validation (to test data (N=5), to validate (N>30), quality assurance), source of data, etc)"
			bind:value={datasetDescription}
		></textarea>
	</div>
</div>
