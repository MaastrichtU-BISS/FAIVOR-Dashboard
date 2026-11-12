<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ChartConfiguration } from 'chart.js';
	let Chart: any;

	export let confidence: number[] = [];
	export let reliabilities: number[] = [];
	export let binCount: number[] = [];
	export let title: string = 'Reliability Diagram';
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

	// Empty bins yield NaN/null values; drop them so the line only joins populated bins
	const buildPoints = () =>
		confidence
			.map((x, i) => ({ x, y: reliabilities[i], n: binCount[i] }))
			.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

	const createChart = () => {
		if (!chartCanvas) return;
		const points = buildPoints();
		if (points.length === 0) return;

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
						label: 'Model',
						data: points,
						borderColor: 'rgb(54, 162, 235)',
						backgroundColor: 'rgba(54, 162, 235, 0.5)',
						borderWidth: 2,
						pointRadius: 4,
						pointHoverRadius: 6,
						tension: 0
					},
					{
						label: 'Perfectly calibrated',
						data: [
							{ x: 0, y: 0 },
							{ x: 1, y: 1 }
						],
						borderColor: 'rgb(150, 150, 150)',
						borderDash: [6, 6],
						borderWidth: 1,
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
						callbacks: {
							label: (context) => {
								const p = context.raw as { x: number; y: number; n?: number };
								const n = p.n !== undefined ? `, n = ${p.n}` : '';
								return `Confidence: ${p.x.toFixed(3)}, Observed: ${p.y.toFixed(3)}${n}`;
							}
						}
					}
				},
				scales: {
					x: {
						type: 'linear',
						title: { display: true, text: 'Mean predicted probability' },
						min: 0,
						max: 1,
						ticks: { stepSize: 0.1 }
					},
					y: {
						type: 'linear',
						title: { display: true, text: 'Observed fraction of positives' },
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

	$: if (chartCanvas && confidence.length > 0 && reliabilities.length > 0 && Chart && !isLoading) {
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
