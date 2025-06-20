<script lang="ts">
	import MaterialSymbolsDataTable from '~icons/material-symbols/data-table';
	import type { DatasetAnalysis } from '$lib/services/csv-analysis-service';
	import { CSVAnalysisService } from '$lib/services/csv-analysis-service';

	interface Props {
		analysis: DatasetAnalysis;
	}

	let { analysis }: Props = $props();

	function getCompletenessColor(completeness: number): string {
		if (completeness >= 95) return 'text-success';
		if (completeness >= 85) return 'text-warning';
		return 'text-error';
	}

	function getCompletenessLabel(completeness: number): string {
		if (completeness >= 95) return 'Excellent';
		if (completeness >= 85) return 'Good';
		if (completeness >= 70) return 'Fair';
		return 'Poor';
	}
</script>

<div class="card bg-base-100 shadow-xl">
	<div class="card-body">
		<div class="mb-6 flex items-center gap-3">
			<MaterialSymbolsDataTable class="text-primary h-6 w-6" />
			<h2 class="card-title text-xl">Dataset Overview</h2>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<!-- Dataset Name -->
			<div class="stat bg-base-200 rounded-lg p-4">
				<div class="stat-title text-sm">Dataset File</div>
				<div class="stat-value text-primary truncate text-lg" title={analysis.fileName}>
					{analysis.fileName}
				</div>
				<div class="stat-desc text-xs">
					{CSVAnalysisService.formatFileSize(analysis.fileSize)}
				</div>
			</div>

			<!-- Total Rows -->
			<div class="stat bg-base-200 rounded-lg p-4">
				<div class="stat-title text-sm">Total Rows</div>
				<div class="stat-value text-secondary text-lg">
					{analysis.totalRows.toLocaleString()}
				</div>
				<div class="stat-desc text-xs">Data points</div>
			</div>

			<!-- Total Columns -->
			<div class="stat bg-base-200 rounded-lg p-4">
				<div class="stat-title text-sm">Total Columns</div>
				<div class="stat-value text-accent text-lg">
					{analysis.totalColumns}
				</div>
				<div class="stat-desc text-xs">
					{analysis.columns.filter((c) => c.type === 'numerical').length} numerical,
					{analysis.columns.filter((c) => c.type === 'categorical').length} categorical
				</div>
			</div>

			<!-- Data Completeness -->
			<div class="stat bg-base-200 rounded-lg p-4">
				<div class="stat-title text-sm">Data Completeness</div>
				<div class="stat-value text-lg {getCompletenessColor(analysis.completeness)}">
					{analysis.completeness}%
				</div>
				<div class="stat-desc text-xs {getCompletenessColor(analysis.completeness)}">
					{getCompletenessLabel(analysis.completeness)}
				</div>
			</div>
		</div>

		<!-- Column Type Distribution -->
		<div class="mt-6">
			<h3 class="mb-3 text-lg font-semibold">Column Types</h3>
			<div class="flex gap-4">
				<div class="flex items-center gap-2">
					<div class="badge badge-primary">Numerical</div>
					<span class="text-sm">
						{analysis.columns.filter((c) => c.type === 'numerical').length} columns
					</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="badge badge-secondary">Categorical</div>
					<span class="text-sm">
						{analysis.columns.filter((c) => c.type === 'categorical').length} columns
					</span>
				</div>
			</div>
		</div>

		<!-- Missing Data Summary -->
		{#if analysis.columns.some((c) => c.nullValues > 0)}
			<div class="mt-6">
				<h3 class="mb-3 text-lg font-semibold">Missing Data Summary</h3>
				<div class="space-y-2">
					{#each analysis.columns.filter((c) => c.nullValues > 0) as column}
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">{column.name}</span>
							<div class="flex items-center gap-2">
								<span class="text-base-content/70 text-sm">
									{column.nullValues} missing
								</span>
								<div class="badge badge-outline badge-sm">
									{((column.nullValues / analysis.totalRows) * 100).toFixed(1)}%
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
