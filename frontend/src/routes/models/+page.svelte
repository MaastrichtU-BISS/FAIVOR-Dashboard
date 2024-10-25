<script lang="ts">
	let modelUrl = '';

	const models = [
		{
			name: 'Model name',
			description: 'Small description (link more info)',
			validations: 4,
			lastValidation: '12 May 2024',
			status: 'Done'
		},
		{
			name: 'Model name',
			description: 'Small description (link more info)',
			validations: 6,
			lastValidation: '12 May 2024',
			status: 'Done'
		},
		{
			name: 'Model name',
			description: 'Small description (link more info)',
			validations: 2,
			lastValidation: '12 May 2024',
			status: 'In progress (23 min)'
		},
		{
			name: 'Model name',
			description: 'Small description (link more info)',
			validations: 3,
			lastValidation: '12 May 2024',
			status: 'Failed'
		}
	];

	const handleImport = () => {
		console.log('Importing model:', modelUrl);
	};

	const handleFindRepositories = () => {
		console.log('Finding repositories');
	};
</script>

<div class="container mx-auto space-y-8 p-4">
	<!-- Header -->
	<div class="text-2xl font-bold">ORGANIZATION NAME / LOGO</div>

	<!-- URL Input and Buttons -->
	<div class="flex items-center gap-4">
		<div class="form-control flex-1">
			<input
				type="text"
				placeholder="model url: // place your url here"
				class="input input-bordered w-full"
				bind:value={modelUrl}
			/>
		</div>
		<button class="btn btn-primary" on:click={handleImport}>Import model</button>
		<button class="btn btn-outline" on:click={handleFindRepositories}>Find repositories</button>
	</div>

	<!-- Models Section -->
	<div>
		<h2 class="mb-4 text-4xl font-bold">Models</h2>

		<div class="overflow-x-auto">
			<table class="table w-full">
				<!-- Headers -->
				<thead>
					<tr>
						<th>Model name</th>
						<th>Small description</th>
						<th class="text-center">
							Overall number
							<br />
							of validations
						</th>
						<th class="text-center">
							Date of last
							<br />
							validation
						</th>
						<th class="text-center">
							Status of last
							<br />
							validation
						</th>
					</tr>
				</thead>
				<!-- Body -->
				<tbody>
					{#each models as model}
						<tr class="hover">
							<td>{model.name}</td>
							<td>{model.description}</td>
							<td class="text-center">{model.validations}</td>
							<td class="text-center">{model.lastValidation}</td>
							<td class="text-center">
								<span
									class="badge {model.status === 'Done'
										? 'badge-success'
										: model.status === 'Failed'
											? 'badge-error'
											: 'badge-warning'}"
								>
									{model.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
