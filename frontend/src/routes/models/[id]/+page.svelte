<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import HugeiconsCsv01 from '~icons/hugeicons/csv-01';
	import NewValidationButton from '$lib/components/ui/validation/NewValidationButton.svelte';

	export let data: PageData;
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
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M10 19l-7-7m0 0l7-7m-7 7h18"
			/>
		</svg>
		Go Back
	</button>

	<!-- Model Header -->
	<div class="flex items-start gap-4">
		<div class="bg-base-200 flex h-16 w-16 items-center justify-center rounded-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-8 w-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
				/>
			</svg>
		</div>
		<div>
			<h1 class="text-2xl font-bold">{model.name}</h1>
			<p class="text-base-content/70">{model.description}</p>
		</div>
	</div>

	<!-- Tabs -->
	<div class="tabs tabs-bordered">
		<button class="tab tab-active">Validation Jobs</button>
		<button class="tab">Last modified</button>
		<button class="tab">Data provided</button>
		<button class="tab">Data characteristics</button>
		<button class="tab">Metrics</button>
		<button class="tab">Published</button>
	</div>

	<!-- Validation Jobs Table -->
	<div class="overflow-x-auto">
		<table class="table w-full">
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
							{#if job.dataProvided}
								<button
									class="btn btn-ghost btn-sm gap-2"
									on:click={handleDownloadCsv}
									title="Download CSV"
								>
									<HugeiconsCsv01 class="h-5 w-5" />
									Download
								</button>
							{/if}
						</td>
						<td>
							<div class="w-8">
								{#if job.dataCharacteristics}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										class="text-success h-6 w-6"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										class="text-error h-6 w-6"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								{/if}
							</div>
						</td>
						<td>
							<div class="w-8">
								{#if job.metrics}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										class="text-success h-6 w-6"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										class="text-error h-6 w-6"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								{/if}
							</div>
						</td>
						<td>
							<button class="btn btn-sm">View details</button>
						</td>
						<td>
							<div class="dropdown dropdown-end">
								<button tabindex="0" class="btn btn-ghost btn-circle">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
										/>
									</svg>
								</button>
								<ul
									tabindex="0"
									class="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow"
								>
									<li><button>Duplicate</button></li>
									<li><button>Delete</button></li>
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
