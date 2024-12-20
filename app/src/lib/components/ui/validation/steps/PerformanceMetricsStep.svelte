<script lang="ts">
	interface Props {
		performanceMetrics?: string;
	}

	let { performanceMetrics = $bindable('') }: Props = $props();
</script>

<div class="space-y-6">
	<div>
		<h3 class="mb-4 text-lg font-semibold">Performance Metrics</h3>
		<textarea
			id="performanceMetrics"
			class="textarea textarea-bordered h-48 w-full"
			placeholder="Enter performance metrics details"
			bind:value={performanceMetrics}
		></textarea>
	</div>
</div>
