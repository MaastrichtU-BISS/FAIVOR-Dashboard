<script lang="ts">
	interface Props {
		performanceMetrics?: string;
		readonly?: boolean;
	}

	let { performanceMetrics = $bindable(''), readonly = false }: Props = $props();
</script>

<div class="space-y-4">
	<div>
		<h3 class="text-lg font-medium">Model performance metrics</h3>
		<textarea
			class="textarea textarea-bordered h-48 w-full"
			placeholder="Describe the model's performance metrics"
			bind:value={performanceMetrics}
			{readonly}
		></textarea>
	</div>
</div>
