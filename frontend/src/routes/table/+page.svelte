<script lang="ts">
	import { onMount } from 'svelte';
	import { validateModel } from '$lib/api/validation';

	interface Feature {
		count: number;
		unique?: number | null;
		top?: string | number | null;
		freq?: number | null;
		mean?: number | null;
		std?: number | null;
		min?: number | null;
		max?: number | null;
		'25%'?: number | null;
		'50%'?: number | null;
		'75%'?: number | null;
	}

	interface SummaryStatistics {
		[key: string]: Feature;
	}

	let loading = true;
	let error: string | null = null;
	let numerical: (Feature & { name: string })[] = [];
	let categorical: (Feature & { name: string })[] = [];
	let histograms: Record<string, Record<string, number>> = {};

	// Helper function to check if a feature is numerical
	function isNumerical(feature: Feature): boolean {
		return !isNaN(feature.mean as number) && feature.mean !== null;
	}

	// Helper function to format numbers nicely
	function formatNumber(num: number | null | undefined): string {
		if (num === undefined || num === null || isNaN(num)) return '-';
		return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
	}

	// Helper function to get features by type
	function getFeaturesByType(stats: SummaryStatistics) {
		const numerical: (Feature & { name: string })[] = [];
		const categorical: (Feature & { name: string })[] = [];

		for (const [key, value] of Object.entries(stats)) {
			const processedValue = {
				...value,
				unique: isNaN(value.unique as number) ? null : value.unique,
				top: isNaN(value.top as number) ? value.top : null,
				freq: isNaN(value.freq as number) ? null : value.freq,
				mean: isNaN(value.mean as number) ? null : value.mean,
				std: isNaN(value.std as number) ? null : value.std,
				min: isNaN(value.min as number) ? null : value.min,
				max: isNaN(value.max as number) ? null : value.max,
				'25%': isNaN(value['25%'] as number) ? null : value['25%'],
				'50%': isNaN(value['50%'] as number) ? null : value['50%'],
				'75%': isNaN(value['75%'] as number) ? null : value['75%']
			};

			if (isNumerical(processedValue)) {
				numerical.push({ name: key, ...processedValue });
			} else {
				categorical.push({ name: key, ...processedValue });
			}
		}

		return { numerical, categorical };
	}

	onMount(async () => {
		try {
			loading = true;
			const response = await validateModel({});
			const { numerical: num, categorical: cat } = getFeaturesByType(
				response.data.summary_statistics
			);
			numerical = num;
			categorical = cat;
			histograms = response.data.categorical_histograms;
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred while fetching data';
			console.error('Error fetching data:', e);
		} finally {
			loading = false;
		}
	});
</script>

<div class="container mx-auto overflow-auto p-4">
	{#if loading}
		<div class="flex min-h-[60vh] items-center justify-center">
			<span class="loading loading-spinner loading-lg text-primary"></span>
		</div>
	{:else if error}
		<div class="alert alert-error shadow-lg">
			<div>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 flex-shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>{error}</span>
			</div>
		</div>
	{:else}
		<!-- Numerical Features -->
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
							{#each numerical as feature}
								<tr>
									<td class="font-medium">{feature.name}</td>
									<td>{formatNumber(feature.count)}</td>
									<td>{formatNumber(feature.mean)}</td>
									<td>{formatNumber(feature.std)}</td>
									<td>{formatNumber(feature.min)}</td>
									<td>{formatNumber(feature['25%'])}</td>
									<td>{formatNumber(feature['50%'])}</td>
									<td>{formatNumber(feature['75%'])}</td>
									<td>{formatNumber(feature.max)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Categorical Features -->
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
							{#each categorical as feature}
								<tr>
									<td class="font-medium">{feature.name}</td>
									<td>{formatNumber(feature.count)}</td>
									<td>{formatNumber(feature.unique)}</td>
									<td>{feature.top || '-'}</td>
									<td>{formatNumber(feature.freq)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Categorical Histograms -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title mb-4 text-2xl">Category Distributions</h2>
				<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
					{#each Object.entries(histograms) as [feature, distribution]}
						<div class="card bg-base-200">
							<div class="card-body">
								<h3 class="card-title">{feature}</h3>
								<div class="overflow-x-auto">
									<table class="table-zebra table w-full">
										<thead>
											<tr>
												<th>Value</th>
												<th>Count</th>
											</tr>
										</thead>
										<tbody>
											{#each Object.entries(distribution) as [value, count]}
												<tr>
													<td>{value}</td>
													<td>{formatNumber(count)}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(html) {
		background-color: hsl(var(--b2));
	}
</style>
