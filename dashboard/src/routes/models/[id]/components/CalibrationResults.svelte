<script lang="ts">
	import type { CalibrationResponse, CalibrationModelKey } from '$lib/api/faivor-backend';

	interface Props {
		calibration: CalibrationResponse;
	}
	let { calibration }: Props = $props();

	const modelLabels: Record<CalibrationModelKey, string> = {
		m0: 'original model, no update needed',
		m1: 'intercept recalibration',
		m2: 'logistic recalibration',
		m3: 'model revision'
	};
	const modelKeys: CalibrationModelKey[] = ['m0', 'm1', 'm2', 'm3'];

	const stats = $derived(calibration.model_selection.statistics);
	const selected = $derived(calibration.model_selection.selected_model);

	const tests = $derived([
		{ name: 'Test 1 (m0 vs m1)', p: stats.test1_p_value, result: stats.test1_result },
		{ name: 'Test 2 (m0 vs m2)', p: stats.test2_p_value, result: stats.test2_result },
		{ name: 'Test 3 (m0 vs m3)', p: stats.test3_p_value, result: stats.test3_result }
	]);

	const fmt = (value: number | null | undefined, digits = 3) =>
		typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
</script>

<div class="card bg-base-100 border-base-300 mt-6 border shadow-sm">
	<div class="card-body">
		<h3 class="card-title">Calibration &amp; Model Update</h3>

		<div class="alert alert-info">
			<span>
				Selected model: <strong>{selected}</strong> = {modelLabels[selected] ?? 'unknown'}
			</span>
		</div>

		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Model</th>
						<th>Description</th>
						<th>Log-likelihood</th>
						<th>AUC</th>
					</tr>
				</thead>
				<tbody>
					{#each modelKeys as key, i}
						<tr class:font-bold={key === selected}>
							<td>{key}</td>
							<td>{modelLabels[key]}</td>
							<td>{fmt(calibration.log_likelihoods?.[`ll${i}` as 'll0'])}</td>
							<td>{fmt(calibration.roc_metrics?.[key]?.auc)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Closed test</th>
						<th>p-value</th>
						<th>Result</th>
					</tr>
				</thead>
				<tbody>
					{#each tests as test}
						<tr>
							<td>{test.name}</td>
							<td>{fmt(test.p, 4)}</td>
							<td>
								<span class="badge {test.result ? 'badge-success' : 'badge-ghost'}">
									{test.result ? 'Pass' : 'Fail'}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
