<script lang="ts">
	import type { CalibrationResponse } from '$lib/api/faivor-backend';
	import CalibrationCurveChart from '$lib/components/charts/CalibrationCurveChart.svelte';

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
	const curves = $derived(
		(calibration.models ?? []).filter(
			(m) => m.calibration_curve?.mean_predicted_value?.length > 0
		)
	);

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
						<td>{id}{id === selected ? ' (selected)' : ''}</td>
						<td>{fmt(calibration.log_likelihoods?.[id])}</td>
						<td>{fmt(calibration.roc_metrics?.[id]?.auc)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if curves.length > 0}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each curves as m}
				<div class="border-base-300 rounded-xl border p-4">
					<CalibrationCurveChart
						meanPredictedValue={m.calibration_curve.mean_predicted_value}
						fractionOfPositives={m.calibration_curve.fraction_of_positives}
						title={`Calibration curve (${m.model_id})`}
						height={300}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>
