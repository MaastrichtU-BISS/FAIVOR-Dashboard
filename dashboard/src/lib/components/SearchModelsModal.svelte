<script lang="ts">
	import MaterialSymbolsSearch from '~icons/material-symbols/search';
	import MaterialSymbolsClose from '~icons/material-symbols/close';
	import MaterialSymbolsCloudOutline from '~icons/material-symbols/cloud-outline';
	import MaterialSymbolsCheckCircle from '~icons/material-symbols/check-circle';
	import MaterialSymbolsFilterList from '~icons/material-symbols/filter-list';
	import MaterialSymbolsArrowUpward from '~icons/material-symbols/arrow-upward';
	import MaterialSymbolsArrowDownward from '~icons/material-symbols/arrow-downward';
	import {
		loadFairModelsRepository,
		importModel,
		isModelImported
	} from '$lib/stores/models/index.svelte';

	const props = $props();

	let searchQuery = $state('');
	let allModels = $state<any[]>([]);
	let filteredModels = $state<any[]>([]);
	let isLoading = $state(false);
	let isImporting = $state<string | null>(null);
	let importError = $state('');
	let importedModels = $state<Set<string>>(new Set());

	// Filter and sort state
	let selectedAuthor = $state('all');
	let selectedOrganization = $state('all');
	let sortField = $state<'title' | 'created_at' | 'author' | 'organization'>('created_at');
	let sortDirection = $state<'asc' | 'desc'>('desc');
	let showFilters = $state(false);

	// Derived unique values for filter dropdowns
	let uniqueAuthors = $derived(
		['all', ...new Set(allModels.map((m) => m.author).filter(Boolean))].sort()
	);
	let uniqueOrganizations = $derived(
		['all', ...new Set(allModels.map((m) => m.organization).filter(Boolean))].sort()
	);

	// Load models when modal opens
	$effect(() => {
		if (props.open && allModels.length === 0) {
			loadRepositoryModels();
		}
	});

	// Filter and sort models
	$effect(() => {
		let result = [...allModels];

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(model) =>
					model.title.toLowerCase().includes(query) ||
					model.author?.toLowerCase().includes(query) ||
					model.organization?.toLowerCase().includes(query)
			);
		}

		// Apply author filter
		if (selectedAuthor !== 'all') {
			result = result.filter((model) => model.author === selectedAuthor);
		}

		// Apply organization filter
		if (selectedOrganization !== 'all') {
			result = result.filter((model) => model.organization === selectedOrganization);
		}

		// Apply sorting
		result.sort((a, b) => {
			let aVal = a[sortField] || '';
			let bVal = b[sortField] || '';

			// Handle date sorting
			if (sortField === 'created_at') {
				aVal = new Date(aVal).getTime() || 0;
				bVal = new Date(bVal).getTime() || 0;
			} else {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (sortDirection === 'asc') {
				return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
			} else {
				return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
			}
		});

		filteredModels = result;
	});

	function toggleSort(field: typeof sortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = field === 'created_at' ? 'desc' : 'asc';
		}
	}

	function clearFilters() {
		selectedAuthor = 'all';
		selectedOrganization = 'all';
		searchQuery = '';
	}

	let hasActiveFilters = $derived(
		selectedAuthor !== 'all' || selectedOrganization !== 'all' || searchQuery !== ''
	);

	async function loadRepositoryModels() {
		isLoading = true;
		try {
			allModels = await loadFairModelsRepository();
			filteredModels = allModels;

			// Check import status for all models
			await checkImportStatus();
		} catch (error) {
			console.error('Error loading repository models:', error);
			allModels = [];
			filteredModels = [];
		} finally {
			isLoading = false;
		}
	}

	async function checkImportStatus() {
		const importStatus = new Set<string>();

		// Check import status for each model
		const promises = allModels.map(async (model) => {
			try {
				const imported = await isModelImported(model.url);
				if (imported) {
					importStatus.add(model.url);
				}
			} catch (error) {
				console.error(`Error checking import status for model ${model.id}:`, error);
			}
		});

		await Promise.all(promises);
		importedModels = importStatus;
	}

	async function handleImportModel(model: any) {
		isImporting = model.id;
		importError = '';

		try {
			await importModel(model.url);
			// Mark model as imported
			importedModels.add(model.url);
			importedModels = new Set(importedModels);
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
	<div class="modal-box my-20 mx-4 flex w-full max-w-3xl max-h-[calc(100vh-10rem)] flex-col overflow-hidden">
		<!-- Top bar -->
		<div class="mb-6 flex shrink-0 items-center justify-between">
			<div>
				<h3 class="text-2xl font-bold">Available models</h3>
				<p class="text-base-content/70 mt-1 flex items-center gap-1 text-sm">
					<MaterialSymbolsCloudOutline class="h-4 w-4" />
					Fetching models from
					<span class="font-medium">fairmodels.org</span>
				</p>
			</div>
			<button class="btn btn-ghost btn-sm" onclick={props.onClose}>
				<MaterialSymbolsClose class="h-5 w-5" />
			</button>
		</div>

		<!-- Search and Filter Controls -->
		<div class="mb-4 shrink-0 space-y-3">
			<!-- Search input row -->
			<div class="flex gap-2">
				<div class="relative flex-1">
					<span class="absolute left-3 top-1/2 -translate-y-1/2">
						<MaterialSymbolsSearch class="text-base-content/70 h-5 w-5" />
					</span>
					<input
						type="text"
						placeholder="Search by title, author, or organization..."
						class="input input-bordered w-full pl-10"
						bind:value={searchQuery}
					/>
				</div>
				<button
					class="btn btn-outline gap-2"
					class:btn-primary={showFilters}
					onclick={() => (showFilters = !showFilters)}
				>
					<MaterialSymbolsFilterList class="h-5 w-5" />
					Filters
					{#if hasActiveFilters}
						<span class="badge badge-primary badge-sm">!</span>
					{/if}
				</button>
			</div>

			<!-- Filter dropdowns (collapsible) -->
			{#if showFilters}
				<div class="bg-base-200 flex flex-wrap gap-3 rounded-lg p-3">
					<!-- Author filter -->
					<div class="form-control min-w-48 flex-1">
						<label class="label py-1" for="author-filter">
							<span class="label-text text-xs font-medium">Author</span>
						</label>
						<select
							id="author-filter"
							class="select select-bordered select-sm w-full"
							bind:value={selectedAuthor}
						>
							{#each uniqueAuthors as author (author)}
								<option value={author}>{author === 'all' ? 'All Authors' : author}</option>
							{/each}
						</select>
					</div>

					<!-- Organization filter -->
					<div class="form-control min-w-48 flex-1">
						<label class="label py-1" for="org-filter">
							<span class="label-text text-xs font-medium">Organization</span>
						</label>
						<select
							id="org-filter"
							class="select select-bordered select-sm w-full"
							bind:value={selectedOrganization}
						>
							{#each uniqueOrganizations as org (org)}
								<option value={org}>{org === 'all' ? 'All Organizations' : org}</option>
							{/each}
						</select>
					</div>

					<!-- Clear filters button -->
					{#if hasActiveFilters}
						<div class="flex items-end">
							<button class="btn btn-ghost btn-sm" onclick={clearFilters}> Clear all </button>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Sort controls -->
			<div class="flex flex-wrap items-center gap-2 text-sm">
				<span class="text-base-content/60">Sort by:</span>
				<button
					class="btn btn-xs gap-1"
					class:btn-primary={sortField === 'title'}
					class:btn-ghost={sortField !== 'title'}
					onclick={() => toggleSort('title')}
				>
					Title
					{#if sortField === 'title'}
						{#if sortDirection === 'asc'}
							<MaterialSymbolsArrowUpward class="h-3 w-3" />
						{:else}
							<MaterialSymbolsArrowDownward class="h-3 w-3" />
						{/if}
					{/if}
				</button>
				<button
					class="btn btn-xs gap-1"
					class:btn-primary={sortField === 'created_at'}
					class:btn-ghost={sortField !== 'created_at'}
					onclick={() => toggleSort('created_at')}
				>
					Date
					{#if sortField === 'created_at'}
						{#if sortDirection === 'asc'}
							<MaterialSymbolsArrowUpward class="h-3 w-3" />
						{:else}
							<MaterialSymbolsArrowDownward class="h-3 w-3" />
						{/if}
					{/if}
				</button>
				<button
					class="btn btn-xs gap-1"
					class:btn-primary={sortField === 'author'}
					class:btn-ghost={sortField !== 'author'}
					onclick={() => toggleSort('author')}
				>
					Author
					{#if sortField === 'author'}
						{#if sortDirection === 'asc'}
							<MaterialSymbolsArrowUpward class="h-3 w-3" />
						{:else}
							<MaterialSymbolsArrowDownward class="h-3 w-3" />
						{/if}
					{/if}
				</button>
				<button
					class="btn btn-xs gap-1"
					class:btn-primary={sortField === 'organization'}
					class:btn-ghost={sortField !== 'organization'}
					onclick={() => toggleSort('organization')}
				>
					Organization
					{#if sortField === 'organization'}
						{#if sortDirection === 'asc'}
							<MaterialSymbolsArrowUpward class="h-3 w-3" />
						{:else}
							<MaterialSymbolsArrowDownward class="h-3 w-3" />
						{/if}
					{/if}
				</button>

				<!-- Results count -->
				{#if !isLoading && allModels.length > 0}
					<span class="text-base-content/50 ml-auto text-xs">
						{filteredModels.length} of {allModels.length} models
					</span>
				{/if}
			</div>
		</div>

		<!-- Error message -->
		{#if importError}
			<div class="alert alert-error mb-4 shrink-0">
				<span>{importError}</span>
			</div>
		{/if}

		<!-- Scrollable content area -->
		<div class="flex-1 overflow-y-auto pr-2">
			<!-- Models list -->
			<div class="space-y-4">
					{#if isLoading}
						<div class="flex justify-center py-8">
							<span class="loading loading-spinner loading-lg"></span>
						</div>
					{:else if filteredModels.length === 0 && searchQuery}
						<div class="text-base-content/70 py-8 text-center">
							No models found matching "{searchQuery}"
						</div>
					{:else if filteredModels.length > 0}
						{#each filteredModels as model (model.id)}
							<div class="bg-base-200 flex items-center justify-between gap-4 rounded-lg p-4">
								<div class="min-w-0 flex-1">
									<h4 class="font-semibold">{model.title}</h4>
									<p class="text-base-content/70 text-sm">Available from {model.source}</p>
									<div class="text-base-content/60 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
										<span>Created: {new Date(model.created_at).toLocaleDateString()}</span>
										{#if model.author && model.author !== 'Unknown'}
											<span class="truncate">Author: {model.author}</span>
										{/if}
										{#if model.organization && model.organization !== 'Unknown'}
											<span class="flex items-center gap-1">
												<MaterialSymbolsCloudOutline class="h-3 w-3 shrink-0" />
												{model.organization}
											</span>
										{/if}
									</div>
								</div>
								<div class="shrink-0">
									{#if importedModels.has(model.url)}
										<button class="btn btn-success btn-sm gap-2" disabled>
											<MaterialSymbolsCheckCircle class="h-4 w-4" />
											Imported
										</button>
									{:else}
										<button
											class="btn btn-primary btn-sm gap-2"
											class:loading={isImporting === model.id}
											disabled={isImporting !== null}
											onclick={() => handleImportModel(model)}
										>
											{isImporting === model.id ? 'Importing...' : 'Import'}
										</button>
									{/if}
								</div>
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
	<form method="dialog" class="modal-backdrop">
		<button onclick={props.onClose}>close</button>
	</form>
</dialog>
