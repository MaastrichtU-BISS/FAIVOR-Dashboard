<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ChartConfiguration } from 'chart.js';
	let Chart: any;

	export let precision: number[] = [];
	export let recall: number[] = [];
	export let averagePrecision: number = 0;
	export let title: string = 'Precision-Recall Curve';
	export let height: number = 400;

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	let isLoading = true;
	let error: Error | null = null;

	// Export function to get chart as image data URL
	export function getImageData(): string | null {
		if (chartCanvas && chartInstance) {
			return chartCanvas.toDataURL('image/png', 1.0);
		}
		return null;
	}

	const createChart = () => {
		if (!chartCanvas || precision.length === 0 || recall.length === 0) return;

		// Destroy existing chart if any
		if (chartInstance) {
			chartInstance.destroy();
		}

		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		const config: ChartConfiguration = {
			type: 'line',
			data: {
				datasets: [
					{
						label: `PR Curve (AP = ${averagePrecision.toFixed(3)})`,
						data: recall.map((x, i) => ({ x, y: precision[i] })),
						borderColor: 'rgb(153, 102, 255)',
						backgroundColor: 'rgba(153, 102, 255, 0.1)',
						borderWidth: 2,
						pointRadius: 0,
						pointHoverRadius: 4,
						tension: 0,
						fill: true
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
						display: true,
						position: 'bottom'
					},
					tooltip: {
						mode: 'nearest',
						intersect: false,
						callbacks: {
							label: (context) => {
								const point = context.raw as { x: number; y: number };
								return `Recall: ${point.x.toFixed(3)}, Precision: ${point.y.toFixed(3)}`;
							}
						}
					}
				},
				scales: {
					x: {
						type: 'linear',
						title: {
							display: true,
							text: 'Recall'
						},
						min: 0,
						max: 1,
						ticks: {
							stepSize: 0.1
						}
					},
					y: {
						type: 'linear',
						title: {
							display: true,
							text: 'Precision'
						},
						min: 0,
						max: 1,
						ticks: {
							stepSize: 0.1
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
	$: if (chartCanvas && precision.length > 0 && recall.length > 0 && Chart && !isLoading) {
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