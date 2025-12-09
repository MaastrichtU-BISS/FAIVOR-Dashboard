<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ChartConfiguration } from 'chart.js';
	let Chart: any;

	export let subgroupData: Array<{
		group: string;
		metrics: Record<string, number>;
	}> = [];
	export let selectedMetric: string = '';
	export let title: string = 'Subgroup Comparison';
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
		if (!chartCanvas || subgroupData.length === 0) return;

		// Destroy existing chart if any
		if (chartInstance) {
			chartInstance.destroy();
		}

		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		// Get all available metrics
		const allMetrics = selectedMetric
			? [selectedMetric]
			: Array.from(
					new Set(
						subgroupData.flatMap((group) => Object.keys(group.metrics))
					)
			  );

		// Create datasets for each metric
		const datasets = allMetrics.map((metric, index) => {
			const colors = [
				'rgba(255, 99, 132, 0.8)',
				'rgba(54, 162, 235, 0.8)',
				'rgba(255, 206, 86, 0.8)',
				'rgba(75, 192, 192, 0.8)',
				'rgba(153, 102, 255, 0.8)',
				'rgba(255, 159, 64, 0.8)'
			];

			return {
				label: metric.replace(/_/g, ' '),
				data: subgroupData.map((group) => group.metrics[metric] || 0),
				backgroundColor: colors[index % colors.length],
				borderColor: colors[index % colors.length].replace('0.8', '1'),
				borderWidth: 1
			};
		});

		const config: ChartConfiguration = {
			type: 'bar',
			data: {
				labels: subgroupData.map((group) => group.group),
				datasets
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
						mode: 'index',
						intersect: false,
						callbacks: {
							label: (context) => {
								const value = context.raw as number;
								return `${context.dataset.label}: ${value.toFixed(4)}`;
							}
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: 'Subgroups'
						}
					},
					y: {
						title: {
							display: true,
							text: 'Metric Value'
						},
						beginAtZero: true
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
	$: if (chartCanvas && subgroupData.length > 0 && Chart && !isLoading) {
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