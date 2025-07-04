<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ChartConfiguration } from 'chart.js';
	let Chart: any;

	export let metrics: Record<string, number> = {};
	export let title: string = 'Performance Metrics';
	export let height: number = 400;

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	let isLoading = true;
	let error: Error | null = null;

	const createChart = () => {
		if (!chartCanvas || Object.keys(metrics).length === 0) return;

		// Destroy existing chart if any
		if (chartInstance) {
			chartInstance.destroy();
		}

		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		// Filter out non-numeric values and errors
		const validMetrics = Object.entries(metrics).filter(([_, value]) => {
			return typeof value === 'number' && !isNaN(value) && isFinite(value);
		});

		// Extract metric names and values
		const labels = validMetrics.map(([key]) => {
			// Clean up metric names for display
			return key.replace('performance.', '').replace(/_/g, ' ');
		});

		const data = validMetrics.map(([_, value]) => {
			// Normalize values to 0-1 range for better visualization
			// Different metrics have different ranges, so we'll use different scaling
			if (value < 0) return Math.max(0, (value + 1) / 2); // For metrics like R² that can be negative
			if (value > 1) return Math.min(1, 1 / value); // For metrics like MSE that can be > 1
			return value;
		});

		const config: ChartConfiguration = {
			type: 'radar',
			data: {
				labels,
				datasets: [
					{
						label: 'Metrics',
						data,
						backgroundColor: 'rgba(255, 206, 86, 0.2)',
						borderColor: 'rgba(255, 206, 86, 1)',
						borderWidth: 2,
						pointBackgroundColor: 'rgba(255, 206, 86, 1)',
						pointBorderColor: '#fff',
						pointHoverBackgroundColor: '#fff',
						pointHoverBorderColor: 'rgba(255, 206, 86, 1)'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: title,
						font: {
							size: 16
						}
					},
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const index = context.dataIndex;
								const actualValue = validMetrics[index][1];
								return `${labels[index]}: ${actualValue.toFixed(4)}`;
							}
						}
					}
				},
				scales: {
					r: {
						beginAtZero: true,
						min: 0,
						max: 1,
						ticks: {
							stepSize: 0.2
						},
						pointLabels: {
							font: {
								size: 12
							}
						}
					}
				}
			}
		};

		chartInstance = new Chart(ctx, config);
	};

	onMount(async () => {
		try {
			// Dynamically import Chart.js to avoid SSR issues
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
		if (chartInstance) {
			chartInstance.destroy();
		}
	});

	// Recreate chart when data changes
	$: if (chartCanvas && Object.keys(metrics).length > 0 && Chart && !isLoading) {
		createChart();
	}
</script>

<div class="chart-container" style="height: {height}px;">
	{#if isLoading}
		<div class="flex items-center justify-center h-full">
			<span class="loading loading-spinner loading-md"></span>
			<span class="ml-2">Loading chart...</span>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
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