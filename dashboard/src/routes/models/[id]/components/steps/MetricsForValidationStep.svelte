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

<div class="grid grid-cols-1 gap-8">
	<div class="border-base-300 rounded-xl border p-4">
		<div>Table of metrics</div>
	</div>
</div>
