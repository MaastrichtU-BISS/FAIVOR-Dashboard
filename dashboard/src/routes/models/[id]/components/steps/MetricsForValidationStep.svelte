<script lang="ts">
	interface Props {
		metricsDescription?: string;
		performanceMetrics?: string;
		readonly?: boolean;
		onFieldChange?: () => void;
	}

	let {
		metricsDescription = $bindable(''),
		performanceMetrics = $bindable(''),
		readonly = false,
		onFieldChange = () => {}
	}: Props = $props();

	// Store initial values to track actual changes
	let initialMetrics = $state(metricsDescription || '');
	let initialPerformance = $state(performanceMetrics || '');

	// Track actual value changes
	$effect(() => {
		if (!readonly && onFieldChange) {
			const hasChanges =
				metricsDescription !== initialMetrics || performanceMetrics !== initialPerformance;

			if (hasChanges) {
				onFieldChange();
			}
		}
	});

	// Reset initial values when props change
	$effect(() => {
		initialMetrics = metricsDescription || '';
		initialPerformance = performanceMetrics || '';
	});
</script>

<div class="grid grid-cols-2 gap-8">
	<div class="space-y-4">
		<div>
			<h3 class="text-lg font-medium">Validation metrics</h3>
			<textarea
				class="textarea textarea-bordered h-96 w-full"
				placeholder="Free text or structure for validation metrics"
				bind:value={metricsDescription}
				{readonly}
				oninput={onFieldChange}
			></textarea>
		</div>
	</div>

	<div class="space-y-4">
		<div>
			<h3 class="text-lg font-medium">Model performance metrics</h3>
			<textarea
				class="textarea textarea-bordered h-96 w-full"
				placeholder="Free text or structure for performance metrics"
				bind:value={performanceMetrics}
				{readonly}
				oninput={onFieldChange}
			></textarea>
		</div>
	</div>
</div>
