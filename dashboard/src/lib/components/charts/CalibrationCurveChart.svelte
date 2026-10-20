<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ChartConfiguration } from 'chart.js';
	let Chart: any;

	export let probTrue: number[] = [];
	export let probPred: number[] = [];
	export let brierScore: number | undefined = undefined;
	export let title: string = 'Calibration Curve';
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
		if (!chartCanvas || probPred.length === 0 || probTrue.length === 0) return;

		// Destroy existing chart if any
		if (chartInstance) {
			chartInstance.destroy();
		}

		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		const chartTitle =
			brierScore !== undefined && brierScore !== null
				? `${title} (Brier Score = ${brierScore.toFixed(3)})`
				: title;

		const config: ChartConfiguration = {
			type: 'line',
			data: {
				datasets: [
					{
						label: 'Model calibration',
						data: probPred.map((x, i) => ({ x, y: probTrue[i] })),
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						borderWidth: 2,
						pointRadius: 4,
						pointHoverRadius: 6,
						tension: 0,
						fill: false
					},
					{
						label: 'Perfectly calibrated',
						data: [
							{ x: 0, y: 0 },
							{ x: 1, y: 1 }
						],
						borderColor: 'rgb(255, 99, 132)',
						borderWidth: 2,
						borderDash: [5, 5],
						pointRadius: 0,
						fill: false
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: chartTitle,
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
								if (context.datasetIndex === 0) {
									const point = context.raw as { x: number; y: number };
									return `Predicted: ${point.x.toFixed(3)}, Observed: ${point.y.toFixed(3)}`;
								}
								return context.dataset.label || '';
							}
						}
					}
				},
				scales: {
					x: {
						type: 'linear',
						title: {
							display: true,
							text: 'Mean Predicted Probability'
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
							text: 'Fraction of Positives'
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
	$: if (chartCanvas && probPred.length > 0 && probTrue.length > 0 && Chart && !isLoading) {
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