<script lang="ts">
	interface Props {
		datasetDescription?: string;
		readonly?: boolean;
	}

	let { datasetDescription = $bindable(''), readonly = false }: Props = $props();
</script>

<div class="space-y-4">
	<div>
		<h3 class="text-lg font-medium">Dataset characteristics</h3>
		<textarea
			class="textarea textarea-bordered h-48 w-full"
			placeholder="Description of dataset characteristics"
			bind:value={datasetDescription}
			{readonly}
		></textarea>
	</div>
</div>
