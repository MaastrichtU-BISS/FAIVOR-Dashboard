<script lang="ts">
	import { onMount } from 'svelte';
	import MaterialSymbolsAnalytics from '~icons/material-symbols/analytics';
	import type { DatasetFolderFiles } from '$lib/types/validation';
	import { CSVAnalysisService } from '$lib/services/csv-analysis-service';
	import type { DatasetAnalysis } from '$lib/services/csv-analysis-service';
	import DatasetOverview from './DatasetOverview.svelte';
	import ColumnAnalysis from './ColumnAnalysis.svelte';

	interface Props {
		folderFiles: DatasetFolderFiles;
		folderName: string;
	}

	let { folderFiles, folderName }: Props = $props();

	let datasetAnalysis = $state<DatasetAnalysis | null>(null);
	let isAnalyzing = $state(true);
	let analysisError = $state<string | null>(null);
	let gridColumns = $state(3);

	onMount(async () => {
		if (folderFiles.data) {
			await analyzeDataset(folderFiles.data);
		}
	});

	async function analyzeDataset(csvFile: File) {
		try {
			isAnalyzing = true;
			analysisError = null;
			
			const analysis = await CSVAnalysisService.analyzeCSV(csvFile);
			datasetAnalysis = analysis;
		} catch (error) {
			console.error('Dataset analysis failed:', error);
			analysisError = error instanceof Error ? error.message : 'Failed to analyze dataset';
		} finally {
			isAnalyzing = false;
		}
	}

	// Re-analyze when the CSV file changes
	$effect(() => {
		if (folderFiles.data) {
			analyzeDataset(folderFiles.data);
		}
	});
</script>

<div class="space-y-6">
	{#if isAnalyzing}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<div class="flex items-center justify-center gap-3 py-8">
					<span class="loading loading-spinner loading-lg text-primary"></span>
					<div class="text-center">
						<h3 class="text-lg font-semibold">Analyzing Dataset</h3>
						<p class="text-base-content/70 text-sm">
							Processing {folderFiles.data?.name || 'CSV file'}...
						</p>
					</div>
				</div>
			</div>
		</div>
	{:else if analysisError}
		<div class="alert alert-error shadow-lg">
			<div>
				<MaterialSymbolsAnalytics class="h-6 w-6 flex-shrink-0" />
				<div>
					<h3 class="font-bold">Analysis Failed</h3>
					<div class="text-sm">{analysisError}</div>
				</div>
			</div>
		</div>
	{:else if datasetAnalysis}
		<!-- Dataset Overview -->
		<DatasetOverview analysis={datasetAnalysis} />

		<!-- Column Analysis -->
		<ColumnAnalysis 
			columns={datasetAnalysis.columns} 
			bind:gridColumns={gridColumns}
		/>

		<!-- Analysis Summary -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">Analysis Summary</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Data Quality -->
					<div>
						<h3 class="text-lg font-semibold mb-3">Data Quality</h3>
						<div class="space-y-2">
							<div class="flex justify-between">
								<span>Completeness:</span>
								<span class="font-medium {datasetAnalysis.completeness >= 95 ? 'text-success' : datasetAnalysis.completeness >= 85 ? 'text-warning' : 'text-error'}">
									{datasetAnalysis.completeness}%
								</span>
							</div>
							<div class="flex justify-between">
								<span>Missing Values:</span>
								<span class="font-medium">
									{datasetAnalysis.columns.reduce((sum, col) => sum + col.nullValues, 0).toLocaleString()}
								</span>
							</div>
							<div class="flex justify-between">
								<span>Columns with Missing Data:</span>
								<span class="font-medium">
									{datasetAnalysis.columns.filter(c => c.nullValues > 0).length} / {datasetAnalysis.totalColumns}
								</span>
							</div>
						</div>
					</div>

					<!-- Data Types -->
					<div>
						<h3 class="text-lg font-semibold mb-3">Data Types</h3>
						<div class="space-y-2">
							<div class="flex justify-between">
								<span>Numerical Columns:</span>
								<span class="font-medium text-primary">
									{datasetAnalysis.columns.filter(c => c.type === 'numerical').length}
								</span>
							</div>
							<div class="flex justify-between">
								<span>Categorical Columns:</span>
								<span class="font-medium text-secondary">
									{datasetAnalysis.columns.filter(c => c.type === 'categorical').length}
								</span>
							</div>
							<div class="flex justify-between">
								<span>Average Unique Values:</span>
								<span class="font-medium">
									{Math.round(datasetAnalysis.columns.reduce((sum, col) => sum + col.uniqueValues, 0) / datasetAnalysis.totalColumns)}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Recommendations -->
				<div class="mt-6">
					<h3 class="text-lg font-semibold mb-3">Recommendations</h3>
					<div class="space-y-2">
						{#if datasetAnalysis.completeness < 85}
							<div class="alert alert-warning">
								<span class="text-sm">
									Consider addressing missing data before model training. 
									{datasetAnalysis.completeness < 70 ? 'High' : 'Moderate'} amount of missing values detected.
								</span>
							</div>
						{/if}
						
						{#if datasetAnalysis.columns.some(c => c.type === 'categorical' && c.uniqueValues > 50)}
							<div class="alert alert-info">
								<span class="text-sm">
									Some categorical columns have high cardinality (>50 unique values). 
									Consider feature engineering or encoding strategies.
								</span>
							</div>
						{/if}
						
						{#if datasetAnalysis.totalRows < 100}
							<div class="alert alert-warning">
								<span class="text-sm">
									Small dataset detected ({datasetAnalysis.totalRows} rows). 
									Consider collecting more data for robust model training.
								</span>
							</div>
						{/if}
						
						{#if datasetAnalysis.completeness >= 95 && datasetAnalysis.totalRows >= 1000}
							<div class="alert alert-success">
								<span class="text-sm">
									Excellent data quality! High completeness and sufficient sample size for model training.
								</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
