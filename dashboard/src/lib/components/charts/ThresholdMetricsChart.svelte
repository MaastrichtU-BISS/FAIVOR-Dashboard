<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	let Chart: any;

	export let thresholds: number[] = [];
	export let series: Record<string, (number | null)[]> = {};
	export let colorIndex: number = 0;
	export let title: string = 'Metrics by Threshold';
	export let height: number = 350;

	const colors = [
		'rgb(75, 192, 192)',
		'rgb(255, 159, 64)',
		'rgb(54, 162, 235)',
		'rgb(153, 102, 255)',
		'rgb(255, 99, 132)',
		'rgb(120, 120, 120)'
	];

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: any = null;
	let isLoading = true;
	let error: Error | null = null;

	export function getImageData(): string | null {
		if (chartCanvas && chartInstance) {
			return chartCanvas.toDataURL('image/png', 1.0);
		}
		return null;
	}

	const createChart = () => {
		if (!chartCanvas || thresholds.length === 0) return;
		if (chartInstance) chartInstance.destroy();
		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		chartInstance = new Chart(ctx, {
			type: 'line',
			data: {
				datasets: Object.entries(series).map(([label, values], i) => ({
					label,
					data: thresholds.map((x, j) => ({ x, y: values[j] ?? null })),
					borderColor: colors[(colorIndex + i) % colors.length],
					backgroundColor: colors[(colorIndex + i) % colors.length],
					borderWidth: 2,
					pointRadius: 0,
					pointHoverRadius: 4,
					tension: 0,
					spanGaps: true
				}))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					title: { display: true, text: title, font: { size: 16 } },
					legend: { display: Object.keys(series).length > 1, position: 'bottom' }
				},
				scales: {
					x: {
						type: 'linear',
						title: { display: true, text: 'Threshold' },
						min: 0,
						max: 1
					},
					y: {
						type: 'linear',
						title: { display: true, text: title },
						min: 0,
						max: 1
					}
				}
			}
		});
	};

	onMount(async () => {
		try {
			const ChartModule = await import('chart.js/auto');
			Chart = ChartModule.default;
			isLoading = false;
			createChart();
		} catch (err) {
			console.error('Failed to load Chart.js:', err);
			error = err as Error;
			isLoading = false;
		}
	});

	onDestroy(() => {
		if (chartInstance) chartInstance.destroy();
	});

	$: if (chartCanvas && thresholds.length > 0 && series && Chart && !isLoading) {
		createChart();
	}
</script>

<div class="chart-container" style="height: {height}px;">
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<span class="loading loading-spinner loading-md"></span>
			<span class="ml-2">Loading chart...</span>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>Failed to load chart: {error.message}</span>
		</div>
	{:else}
		<canvas bind:this={chartCanvas}></canvas>
	{/if}
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}
</style>
