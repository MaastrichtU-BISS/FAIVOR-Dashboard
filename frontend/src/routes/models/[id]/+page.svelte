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
	const { model } = data;

	const handleGoBack = () => {
		goto('/models');
	};

	const handleDownloadCsv = () => {
		// TODO: Implement CSV download functionality
		console.log('Downloading CSV...');
	};

	const validationJobs = [
		{
			name: 'Short validation_1',
			lastModified: '22 Jun 2025',
			dataProvided: true,
			dataCharacteristics: false,
			metrics: false,
			published: false
		},
		{
			name: 'Full validation',
			lastModified: '03 March 2025',
			dataProvided: true,
			dataCharacteristics: false,
			metrics: true,
			published: true
		},
		{
			name: 'Quality assurance (monitoring)',
			lastModified: '12 May 2024',
			dataProvided: true,
			dataCharacteristics: true,
			metrics: true,
			published: true
		},
		{
			name: 'Short validation_2',
			lastModified: '22 Jun 2025',
			dataProvided: true,
			dataCharacteristics: false,
			metrics: false,
			published: false
		}
	];
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
			<h1 class="text-2xl font-bold">{model.name}</h1>
			<p class="text-base-content/70">{model.description}</p>
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
				{#each validationJobs as job}
					<tr class="hover">
						<td>{job.name}</td>
						<td>{job.lastModified}</td>
						<td>
							<div class="w-8">
								{#if job.dataCharacteristics}
									<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
								{:else}
									<MaterialSymbolsClose class="text-error h-6 w-6" />
								{/if}
							</div>
						</td>
						<td>
							<div class="w-8">
								{#if job.metrics}
									<MaterialSymbolsCheckCircleOutline class="text-success h-6 w-6" />
								{:else}
									<MaterialSymbolsClose class="text-error h-6 w-6" />
								{/if}
							</div>
						</td>
						<td>
							<button class="btn btn-sm">View details</button>
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
			</tbody>
		</table>
	</div>

	<!-- Add Validation Job Button -->
	<NewValidationButton />
</div>
