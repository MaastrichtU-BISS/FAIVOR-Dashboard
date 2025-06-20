<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { ColumnStatistics } from '$lib/services/csv-analysis-service';
	import { CSVAnalysisService } from '$lib/services/csv-analysis-service';

	interface Props {
		columns: ColumnStatistics[];
		gridColumns?: number;
	}

	let { columns, gridColumns = $bindable(3) }: Props = $props();

	// Helper function to check if a feature is numerical (from /table route)
	function isNumerical(column: ColumnStatistics): boolean {
		return column.type === 'numerical' && column.mean !== undefined && !isNaN(column.mean);
	}

	// Helper function to format numbers nicely (from /table route)
	function formatNumber(num: number | null | undefined): string {
		if (num === undefined || num === null || isNaN(num)) return '-';
		return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
	}

	// Get features by type (from /table route)
	function getFeaturesByType(columns: ColumnStatistics[]) {
		const numerical: ColumnStatistics[] = [];
		const categorical: ColumnStatistics[] = [];

		for (const column of columns) {
			if (isNumerical(column)) {
				numerical.push(column);
			} else {
				categorical.push(column);
			}
		}

		return { numerical, categorical };
	}

	// Generate colors using the same algorithm as /table route
	function generateOrderedHuslColors(count: number) {
		const colors = [];
		const goldenRatio = 0.618033988749895;
		let hue = 0;

		for (let i = 0; i < count; i++) {
			hue = (hue + goldenRatio * 360) % 360;
			colors.push(`hsl(${hue}, 70%, 35%)`);
		}

		return colors;
	}

	// Create histogram using exact same implementation as /table route
	function createHistogram(canvasId: string, labels: string[], data: number[]) {
		const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
		if (!ctx) return;

		const colors = generateOrderedHuslColors(data.length);
		const backgroundColor = colors;
		const borderColor = colors;

		new Chart(ctx, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						data,
						backgroundColor,
						borderColor,
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						grid: {
							color: 'hsl(var(--bc) / 0.1)'
						},
						ticks: {
							color: 'hsl(var(--bc))'
						}
					},
					x: {
						grid: {
							color: 'hsl(var(--bc) / 0.1)'
						},
						ticks: {
							color: 'hsl(var(--bc))',
							maxRotation: 45,
							minRotation: 45
						}
					}
				}
			}
		});
	}

	// Prepare histogram data (convert distribution to the format expected by /table route)
	function getHistogramData() {
		const histograms: Record<string, Record<string, number>> = {};

		categoricalColumns.forEach((column) => {
			if (column.distribution && column.distribution.length > 0) {
				histograms[column.name] = {};
				column.distribution.forEach((item) => {
					histograms[column.name][String(item.value)] = item.count;
				});
			}
		});

		return histograms;
	}

	// Update histograms function (from /table route)
	function updateHistograms() {
		const histograms = getHistogramData();
		Object.entries(histograms).forEach(([feature, distribution]) => {
			const labels = Object.keys(distribution);
			const data = Object.values(distribution);
			createHistogram(`histogram-${feature}`, labels, data);
		});
	}

	// Separate columns by type
	let { numerical, categorical } = $derived(getFeaturesByType(columns));
	let numericalColumns = numerical;
	let categoricalColumns = categorical;

	// React to grid columns change (from /table route)
	$effect(() => {
		if (categoricalColumns.length > 0) {
			// Update histograms when grid columns change
			setTimeout(updateHistograms, 0);
		}
	});

	onMount(() => {
		// Create histograms after component mounts
		setTimeout(updateHistograms, 0);
	});
</script>

<!-- Numerical Features (exact copy from /table route) -->
{#if numericalColumns.length > 0}
	<div class="card bg-base-100 mb-8 shadow-xl">
		<div class="card-body">
			<h2 class="card-title mb-4 text-2xl">Numerical Features</h2>
			<div class="overflow-x-auto">
				<table class="table-zebra table w-full">
					<thead>
						<tr>
							<th>Feature</th>
							<th>Count</th>
							<th>Mean</th>
							<th>Std</th>
							<th>Min</th>
							<th>25%</th>
							<th>50%</th>
							<th>75%</th>
							<th>Max</th>
						</tr>
					</thead>
					<tbody>
						{#each numericalColumns as feature}
							<tr>
								<td class="font-medium">{feature.name}</td>
								<td>{formatNumber(feature.count)}</td>
								<td>{formatNumber(feature.mean)}</td>
								<td>{formatNumber(feature.std)}</td>
								<td>{formatNumber(feature.min)}</td>
								<td>{formatNumber(feature.quartiles?.q1)}</td>
								<td>{formatNumber(feature.quartiles?.q2)}</td>
								<td>{formatNumber(feature.quartiles?.q3)}</td>
								<td>{formatNumber(feature.max)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}

<!-- Categorical Features (exact copy from /table route) -->
{#if categoricalColumns.length > 0}
	<div class="card bg-base-100 mb-8 shadow-xl">
		<div class="card-body">
			<h2 class="card-title mb-4 text-2xl">Categorical Features</h2>
			<div class="overflow-x-auto">
				<table class="table-zebra table w-full">
					<thead>
						<tr>
							<th>Feature</th>
							<th>Count</th>
							<th>Unique Values</th>
							<th>Most Common</th>
							<th>Frequency</th>
						</tr>
					</thead>
					<tbody>
						{#each categoricalColumns as feature}
							<tr>
								<td class="font-medium">{feature.name}</td>
								<td>{formatNumber(feature.count)}</td>
								<td>{formatNumber(feature.uniqueValues)}</td>
								<td>{feature.mostCommon?.value || '-'}</td>
								<td>{formatNumber(feature.mostCommon?.count)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}

<!-- Category Distributions (Histograms) - exact copy from /table route -->
{#if categoricalColumns.some((c) => c.distribution && c.distribution.length > 0)}
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="card-title text-2xl">Category Distributions</h2>
				<div class="join">
					<button
						class="join-item btn btn-sm {gridColumns === 2 ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (gridColumns = 2)}
					>
						2 Columns
					</button>
					<button
						class="join-item btn btn-sm {gridColumns === 3 ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (gridColumns = 3)}
					>
						3 Columns
					</button>
					<button
						class="join-item btn btn-sm {gridColumns === 4 ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (gridColumns = 4)}
					>
						4 Columns
					</button>
				</div>
			</div>
			<div
				class="grid grid-cols-1 gap-8 {gridColumns === 2
					? 'md:grid-cols-2'
					: gridColumns === 3
						? 'md:grid-cols-3'
						: 'md:grid-cols-4'}"
			>
				{#each categoricalColumns.filter((c) => c.distribution && c.distribution.length > 0) as feature}
					<div class="card bg-base-200">
						<div class="card-body">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="card-title capitalize">{feature.name}</h3>
								<!-- Modal open button -->
								<label for="modal-{feature.name}" class="btn btn-secondary btn-outline btn-sm">
									View Data
								</label>
							</div>
							<div class="h-[300px] w-full">
								<canvas id="histogram-{feature.name}"></canvas>
							</div>
						</div>
					</div>

					<!-- Modal for data table (exact copy from /table route) -->
					<input type="checkbox" id="modal-{feature.name}" class="modal-toggle" />
					<div class="modal">
						<div class="modal-box">
							<h3 class="mb-4 text-lg font-bold capitalize">{feature.name} Distribution Data</h3>
							<div class="overflow-x-auto">
								<table class="table-zebra table w-full">
									<thead>
										<tr>
											<th>Category</th>
											<th>Count</th>
										</tr>
									</thead>
									<tbody>
										{#each feature.distribution || [] as item}
											<tr>
												<td>{item.value}</td>
												<td>{formatNumber(item.count)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
							<div class="modal-action">
								<label for="modal-{feature.name}" class="btn">Close</label>
							</div>
						</div>
						<label class="modal-backdrop" for="modal-{feature.name}"></label>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
