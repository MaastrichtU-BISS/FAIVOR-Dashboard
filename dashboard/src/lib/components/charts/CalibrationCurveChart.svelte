<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ChartConfiguration } from 'chart.js';
	let Chart: any;

	export let meanPredictedValue: number[] = [];
	export let fractionOfPositives: number[] = [];
	export let title: string = 'Calibration Curve';
	export let height: number = 400;

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
		if (!chartCanvas || meanPredictedValue.length === 0 || fractionOfPositives.length === 0) return;

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
						label: 'Calibration curve',
						data: meanPredictedValue.map((x, i) => ({ x, y: fractionOfPositives[i] })),
						borderColor: 'rgb(75, 192, 192)',
						backgroundColor: 'rgba(75, 192, 192, 0.1)',
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
					title: { display: true, text: title, font: { size: 16 } },
					legend: { display: true, position: 'bottom' },
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
						title: { display: true, text: 'Mean predicted value' },
						min: 0,
						max: 1,
						ticks: { stepSize: 0.1 }
					},
					y: {
						type: 'linear',
						title: { display: true, text: 'Fraction of positives' },
						min: 0,
						max: 1,
						ticks: { stepSize: 0.1 }
					}
				}
			}
		};

		chartInstance = new Chart(ctx, config);
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
		if (chartInstance) {
			chartInstance.destroy();
		}
	});

	$: if (chartCanvas && meanPredictedValue.length > 0 && fractionOfPositives.length > 0 && Chart && !isLoading) {
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
