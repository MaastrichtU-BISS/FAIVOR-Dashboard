<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import HugeiconsCsv01 from '~icons/hugeicons/csv-01';
	import MaterialSymbolsArrowBack from '~icons/material-symbols/arrow-back';
	import MaterialSymbolsScreenshotMonitorOutline from '~icons/material-symbols/screenshot-monitor-outline';
	import MaterialSymbolsCheckCircleOutline from '~icons/material-symbols/check-circle-outline';
	import MaterialSymbolsClose from '~icons/material-symbols/close';
	import MaterialSymbolsMoreVert from '~icons/material-symbols/more-vert';
	import MaterialSymbolsContentCopyOutline from '~icons/material-symbols/content-copy-outline';
	import MaterialSymbolsDeleteOutline from '~icons/material-symbols/delete-outline';
	import NewValidationButton from '$lib/components/ui/validation/NewValidationButton.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	import type { Model } from '$lib/stores/models/index.svelte';

	const { model } = data;
	$: typedModel = model as Model;

	const handleGoBack = () => {
		goto('/models');
	};

	const handleDownloadCsv = () => {
		// TODO: Implement CSV download functionality
		console.log('Downloading CSV...');
	};

	interface ValidationJob {
		val_id: string;
		start_datetime: string;
		validation_status: 'pending' | 'running' | 'completed' | 'failed';
		validation_result: {
			dataProvided?: boolean;
			dataCharacteristics?: boolean;
			metrics?: boolean;
			published?: boolean;
		};
	}

	$: validationJobs = typedModel.validations?.latest
		? [
				{
					val_id: 'latest',
					start_datetime: typedModel.validations.latest.date,
					validation_status: typedModel.validations.latest.status,
					validation_result: {
						dataProvided: true,
						dataCharacteristics: true,
						metrics: true,
						published: typedModel.validations.latest.status === 'completed'
					}
				}
			]
		: [];
</script>

<div class="container mx-auto space-y-8 p-4">
	<!-- Back Button -->
	<button class="btn btn-ghost gap-2" on:click={handleGoBack}>
		<MaterialSymbolsArrowBack class="h-6 w-6" />
		Go Back
	</button>

	<!-- Model Header -->
	<div class="flex items-start gap-4">
		<div class="bg-base-200 flex h-16 w-16 items-center justify-center rounded-lg">
			<MaterialSymbolsScreenshotMonitorOutline class="h-8 w-8" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">{typedModel.fair_model_id}</h1>
			<p class="text-base-content/70">{typedModel.description}</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#if typedModel.metadata.applicabilityCriteria}
					{#each typedModel.metadata.applicabilityCriteria as criteria}
						<span class="badge badge-outline">{criteria}</span>
					{/each}
				{/if}
			</div>
			<div class="text-base-content/70 mt-4 text-sm">
				<p>
					<strong>Primary Use:</strong>
					{typedModel.metadata.primaryIntendedUse}
				</p>
				<p>
					<strong>Repository:</strong>
					<a
						href={typedModel.fair_model_url}
						target="_blank"
						rel="noopener noreferrer"
						class="link"
					>
						{typedModel.fair_model_url}
					</a>
				</p>
				{#if typedModel.metadata.reference.paper}
					<p>
						<strong>Paper:</strong>
						<a
							href={typedModel.metadata.reference.paper}
							target="_blank"
							rel="noopener noreferrer"
							class="link"
						>
							View Paper
						</a>
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Validation Jobs Table -->
	<div class="overflow-x-auto">
		<table class="table h-full w-full">
			<thead>
				<tr>
					<th>Validation Jobs</th>
					<th>Last modified</th>
					<th>Data provided</th>
					<th>Data characteristics</th>
					<th>Metrics</th>
					<th>Published</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#if validationJobs.length === 0}
					<tr>
						<td colspan="7" class="text-base-content/70 text-center">
							No validations yet. Click the button below to start a new validation.
						</td>
					</tr>
				{:else}
					{#each validationJobs as job}
						<tr class="hover">
							<td>Validation {job.val_id}</td>
							<td>{new Date(job.start_datetime).toLocaleDateString()}</td>
							<td>
								<div class="w-8">
									{#if job.validation_result.dataProvided}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td>
								<div class="w-8">
									{#if job.validation_result.dataCharacteristics}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td>
								<div class="w-8">
									{#if job.validation_result.metrics}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td>
								<div class="w-8">
									{#if job.validation_result.published}
										<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
									{:else}
										<MaterialSymbolsClose class="text-error h-6 w-6" />
									{/if}
								</div>
							</td>
							<td>
								<div class="dropdown dropdown-end">
									<button tabindex="0" class="btn btn-ghost btn-circle">
										<MaterialSymbolsMoreVert class="h-5 w-5" />
									</button>
									<ul
										tabindex="0"
										class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow"
									>
										<li>
											<button class="flex items-center gap-2">
												<MaterialSymbolsContentCopyOutline class="h-5 w-5" />Duplicate
											</button>
										</li>
										<li>
											<button class="flex items-center gap-2">
												<MaterialSymbolsDeleteOutline class="h-5 w-5" />Delete
											</button>
										</li>
									</ul>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Add Validation Job Button -->
	<NewValidationButton />
</div>
