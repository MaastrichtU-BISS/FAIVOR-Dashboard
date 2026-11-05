<script lang="ts">
	import type { CalibrationResponse } from '$lib/api/faivor-backend';
	import CalibrationCurveChart from '$lib/components/charts/CalibrationCurveChart.svelte';
	import {
		calibrationModelLabel,
		getCalibrationCurves,
		getCoefficientRows
	} from '$lib/utils/calibration';

	interface Props {
		calibration: CalibrationResponse;
	}

	let { calibration }: Props = $props();

	const selected = $derived(calibration.model_selection?.selected_model);
	const modelIds = $derived(
		Array.from(
			new Set([
				...Object.keys(calibration.log_likelihoods ?? {}),
				...Object.keys(calibration.roc_metrics ?? {})
			])
		).sort()
	);
	const curves = $derived(getCalibrationCurves(calibration));
	const coefficientRows = $derived(getCoefficientRows(calibration.coefficients));

	let chartRefs: Record<string, CalibrationCurveChart> = {};

	// Export function to get calibration chart images keyed by model id
	export function getImageData(): Record<string, string> {
		const images: Record<string, string> = {};
		for (const [modelId, chartRef] of Object.entries(chartRefs)) {
			const image = chartRef?.getImageData();
			if (image) {
				images[modelId] = image;
			}
		}
		return images;
	}

	const fmt = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(4) : '—');
</script>

<div class="space-y-6">
	<div class="alert alert-success">
		<div>
			<h3 class="font-bold">Selected model: {selected}</h3>
			{#if calibration.model_selection?.reason}
				<div class="text-sm">{calibration.model_selection.reason}</div>
			{/if}
		</div>
	</div>

	<div class="border-base-300 overflow-x-auto rounded-xl border p-4">
		<table class="table">
			<thead>
				<tr>
					<th>Model</th>
					<th>Log-likelihood</th>
					<th>AUC</th>
				</tr>
			</thead>
			<tbody>
				{#each modelIds as id}
					<tr class={id === selected ? 'bg-primary/10 font-semibold' : ''}>
						<td>{calibrationModelLabel(id)}{id === selected ? ' (selected)' : ''}</td>
						<td>{fmt(calibration.log_likelihoods?.[id])}</td>
						<td>{fmt(calibration.roc_metrics?.[id]?.auc)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if coefficientRows.length > 0}
		<div class="border-base-300 overflow-x-auto rounded-xl border p-4">
			<h4 class="mb-2 font-semibold">Model Coefficients</h4>
			<table class="table">
				<thead>
					<tr>
						<th>Method</th>
						<th>Term</th>
						<th>Coefficient</th>
					</tr>
				</thead>
				<tbody>
					{#each coefficientRows as row}
						<tr>
							<td>{calibrationModelLabel(row.method)}</td>
							<td>{row.term}</td>
							<td class="font-mono">{row.value}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if curves.length > 0}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each curves as m}
				<div class="border-base-300 rounded-xl border p-4">
					<CalibrationCurveChart
						bind:this={chartRefs[m.modelId]}
						meanPredictedValue={m.predicted}
						fractionOfPositives={m.observed}
						title={`Calibration curve: ${calibrationModelLabel(m.modelId)}`}
						height={300}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>
