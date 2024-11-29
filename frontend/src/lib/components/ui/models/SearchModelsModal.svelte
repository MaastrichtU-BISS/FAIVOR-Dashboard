<script lang="ts">
	import MaterialSymbolsSearch from '~icons/material-symbols/search';
	import MaterialSymbolsClose from '~icons/material-symbols/close';
	import MaterialSymbolsDocumentScannerOutline from '~icons/material-symbols/document-scanner-outline';

	export let isOpen = false;

	const dummyModels = [
		{
			name: 'Model name 1',
			description: 'Description of model 1'
		},
		{
			name: 'Model name 2',
			description: 'Description of model 2'
		},
		{
			name: 'Model name 3',
			description: 'Description of model 3'
		},
		{
			name: 'Model name 4',
			description: 'Description of model 4'
		}
	];

	let searchQuery = '';

	const filteredModels = () => {
		if (!searchQuery) return dummyModels;
		const query = searchQuery.toLowerCase();
		return dummyModels.filter(
			(model) =>
				model.name.toLowerCase().includes(query) || model.description.toLowerCase().includes(query)
		);
	};

	const handleUseModel = (model: (typeof dummyModels)[0]) => {
		console.log('Using model:', model.name);
		isOpen = false;
	};
</script>

<dialog class="modal" class:modal-open={isOpen}>
	<div class="modal-box max-w-6xl">
		<!-- Top bar -->
		<div class="mb-6 flex items-center justify-between">
			<h3 class="text-2xl font-bold">Available models</h3>
			<button class="btn btn-ghost btn-sm" on:click={() => (isOpen = false)}>
				<MaterialSymbolsClose class="h-5 w-5" />
			</button>
		</div>

		<div class="grid grid-cols-[1fr_auto] gap-6">
			<div>
				<!-- Search input -->
				<div class="form-control mb-6">
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2">
							<MaterialSymbolsSearch class="text-base-content/70 h-5 w-5" />
						</span>
						<input
							type="text"
							placeholder="Search"
							class="input input-bordered w-full pl-10"
							bind:value={searchQuery}
						/>
					</div>
				</div>

				<!-- Models list -->
				<div class="mb-6 space-y-4">
					{#each filteredModels() as model}
						<div class="bg-base-200 flex items-center justify-between rounded-lg p-4">
							<div>
								<h4 class="font-semibold">{model.name}</h4>
								<p class="text-base-content/70">{model.description}</p>
							</div>
							<button class="btn btn-primary gap-2" on:click={() => handleUseModel(model)}>
								Use model
							</button>
						</div>
					{/each}
				</div>
			</div>
			<!-- Learn how to containerize -->
			<div class="btn btn-outline text-left">
				<MaterialSymbolsDocumentScannerOutline class="mr-2 h-8 w-8" />
				Learn how to
				<br />
				containerize a model
			</div>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button on:click={() => (isOpen = false)}>close</button>
	</form>
</dialog>
