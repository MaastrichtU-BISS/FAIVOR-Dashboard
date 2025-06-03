<script lang="ts">
	import MaterialSymbolsSearch from '~icons/material-symbols/search';
	import MaterialSymbolsClose from '~icons/material-symbols/close';
	import MaterialSymbolsDocumentScannerOutline from '~icons/material-symbols/document-scanner-outline';
	import MaterialSymbolsCloudOutline from '~icons/material-symbols/cloud-outline';
	import { loadFairModelsRepository, importModel } from '$lib/stores/models/index.svelte';

	const props = $props();

	let searchQuery = $state('');
	let allModels = $state<any[]>([]);
	let filteredModels = $state<any[]>([]);
	let isLoading = $state(false);
	let isImporting = $state<string | null>(null);
	let importError = $state('');

	// Load models when modal opens
	$effect(() => {
		if (props.open && allModels.length === 0) {
			loadRepositoryModels();
		}
	});

	// Filter models based on search query
	$effect(() => {
		if (!searchQuery) {
			filteredModels = allModels;
		} else {
			const query = searchQuery.toLowerCase();
			filteredModels = allModels.filter((model) => model.title.toLowerCase().includes(query));
		}
	});

	async function loadRepositoryModels() {
		isLoading = true;
		try {
			allModels = await loadFairModelsRepository();
			filteredModels = allModels;
		} catch (error) {
			console.error('Error loading repository models:', error);
			allModels = [];
			filteredModels = [];
		} finally {
			isLoading = false;
		}
	}

	async function handleImportModel(model: any) {
		isImporting = model.id;
		importError = '';

		try {
			await importModel(model.url);
			// Close modal and refresh page to show imported model
			props.onClose?.();
			window.location.reload();
		} catch (error: any) {
			console.error('Error importing model:', error);
			importError = error.message || 'Failed to import model';
		} finally {
			isImporting = null;
		}
	}
</script>

<dialog class="modal" class:modal-open={props.open}>
	<div class="modal-box max-w-6xl">
		<!-- Top bar -->
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h3 class="text-2xl font-bold">Available models</h3>
				<p class="text-base-content/70 mt-1 flex items-center gap-1 text-sm">
					<MaterialSymbolsCloudOutline class="h-4 w-4" />
					Fetching models from
					<span class="font-medium">fairmodels.org</span>
				</p>
			</div>
			<button class="btn btn-ghost btn-sm" on:click={props.onClose}>
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

				<!-- Error message -->
				{#if importError}
					<div class="alert alert-error mb-4">
						<span>{importError}</span>
					</div>
				{/if}

				<!-- Models list -->
				<div class="mb-6 space-y-4">
					{#if isLoading}
						<div class="flex justify-center py-8">
							<span class="loading loading-spinner loading-lg"></span>
						</div>
					{:else if filteredModels.length === 0 && searchQuery}
						<div class="text-base-content/70 py-8 text-center">
							No models found matching "{searchQuery}"
						</div>
					{:else if filteredModels.length > 0}
						{#each filteredModels as model}
							<div class="bg-base-200 flex items-center justify-between rounded-lg p-4">
								<div>
									<h4 class="font-semibold">{model.title}</h4>
									<p class="text-base-content/70">{model.description}</p>
									<div class="text-base-content/60 mt-2 flex items-center gap-4 text-sm">
										<span>Created: {new Date(model.created_at).toLocaleDateString()}</span>
										<span class="flex items-center gap-1">
											<MaterialSymbolsCloudOutline class="h-3 w-3" />
											Source: {model.source}
										</span>
									</div>
								</div>
								<button
									class="btn btn-primary gap-2"
									class:loading={isImporting === model.id}
									disabled={isImporting !== null}
									on:click={() => handleImportModel(model)}
								>
									{isImporting === model.id ? 'Importing...' : 'Import model'}
								</button>
							</div>
						{/each}
					{:else if allModels.length === 0 && !isLoading}
						<div class="text-base-content/70 py-8 text-center">
							No models available in the repository
						</div>
					{:else}
						<div class="text-base-content/70 py-8 text-center">
							{allModels.length} models available. Type to search.
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button on:click={props.onClose}>close</button>
	</form>
</dialog>
