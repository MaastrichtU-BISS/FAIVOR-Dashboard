<script lang="ts">
	interface Props {
		metricsDescription?: string;
		readonly?: boolean;
	}

	let { metricsDescription = $bindable(''), readonly = false }: Props = $props();
</script>

<div class="space-y-4">
	<div>
		<h3 class="text-lg font-medium">Validation metrics</h3>
		<textarea
			class="textarea textarea-bordered h-48 w-full"
			placeholder="Describe the metrics used for validation"
			bind:value={metricsDescription}
			{readonly}
		></textarea>
	</div>
</div>
