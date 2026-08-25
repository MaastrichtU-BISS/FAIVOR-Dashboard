<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import SearchModelsModal from '$components/SearchModelsModal.svelte';
	import MaterialSymbolsMoreVert from '~icons/material-symbols/more-vert';
	import MaterialSymbolsDelete from '~icons/material-symbols/delete';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';

	const props = $props();
	let models = $state([...props.data.models]);

	let modelUrl = $state('');
	let isSearchModalOpen = $state(false);
	let isImporting = $state(false);
	let importMessage = $state('');
	let importError = $state('');
	let deletingModelId = $state<string | null>(null);
	let deleteMessage = $state('');
	let deleteError = $state('');

	async function handleImport() {
		if (!modelUrl.trim()) {
			importError = 'Please enter a model URL';
			return;
		}

		// Clear previous messages
		importMessage = '';
		importError = '';
		isImporting = true;

		try {
			const response = await fetch('/api/models', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: modelUrl.trim() })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to import model');
			}

			// Success
			importMessage = result.message || 'Model imported successfully';
			modelUrl = ''; // Clear the input

			// Refresh the page to show the new model after a short delay
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error: any) {
			console.error('Error importing model:', error);
			importError = error.message || 'Failed to import model';
		} finally {
			isImporting = false;
		}
	}

	async function handleDeleteModel(checkpointId: string, event: Event) {
		if (!confirm('Are you sure you want to remove this model? This action cannot be undone.')) {
			return;
		}
		event.stopPropagation(); // Prevent row click

		// Clear previous messages
		deleteMessage = '';
		deleteError = '';
		deletingModelId = checkpointId;

		try {
			const response = await fetch('/api/models', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ checkpointId })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to delete model');
			}

			// Success
			deleteMessage = result.message || 'Model deleted successfully';

			// Remove the deleted model from the UI
			models = models.filter((m) => m.checkpoint_id !== checkpointId);
		} catch (error: any) {
			console.error('Error deleting model:', error);
			deleteError = error.message || 'Failed to delete model';
		} finally {
			deletingModelId = null;
		}
	}

	const handleFindRepositories = () => {
		isSearchModalOpen = true;
	};

	const handleModelClick = (checkpointId: string) => {
		goto(`/models/${encodeURIComponent(checkpointId)}`);
	};

	const handleModalClose = () => {
		isSearchModalOpen = false;
	};
</script>

<div class="container mx-auto space-y-8 p-4">
	<!-- Header -->
	<div class="text-2xl font-bold">Import models</div>

	<!-- URL Input and Buttons -->
	<div class="flex items-center gap-4">
		<div class="form-control flex-1">
			<input
				type="text"
				placeholder="model url: // place your url here"
				class="input input-bordered w-full"
				bind:value={modelUrl}
				disabled={isImporting}
			/>
		</div>
		<button class="btn btn-outline" class:loading={isImporting} onclick={handleImport}>
			{isImporting ? 'Importing...' : 'Import model'}
		</button>
		<button class="btn btn-primary" onclick={handleFindRepositories}>Find models</button>
	</div>

	<!-- Status Messages -->
	{#if importMessage}
		<div class="alert alert-success">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{importMessage}</span>
		</div>
	{/if}

	{#if importError}
		<div class="alert">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{importError}</span>
		</div>
	{/if}

	{#if deleteMessage}
		<div class="alert alert-success">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{deleteMessage}</span>
		</div>
	{/if}

	{#if deleteError}
		<div class="alert alert-error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{deleteError}</span>
		</div>
	{/if}

	<!-- Models Section -->
	<div>
		<h2 class="mb-4 text-2xl font-bold">Models</h2>

		<div class="">
			<table class="table w-full">
				<!-- Headers -->
				<thead>
					<tr>
						<th class="w-32">Model name</th>
						<th>Small description</th>
						<th class="text-center w-28">
							Overall number
							<br />
							of validations
						</th>
						<th class="text-center w-28">
							Date of last
							<br />
							validation
						</th>
						<th class="text-center w-28">
							Status of last
							<br />
							validation
						</th>
						<th class="text-center w-20">Actions</th>
					</tr>
				</thead>
				<!-- Body -->
				<tbody>
					{#each models as model}
						<tr class="hover cursor-pointer" onclick={() => handleModelClick(model.checkpoint_id)}>
							<td class="font-bold">{(model.title || model.fair_model_id).replace(/_/g, ' ')}</td>
							<td>{model.description}</td>
							<td class="text-center">{model.validations?.count ?? 0}</td>
							<td class="text-center">
								{#if model.validations?.latest}
									{new Date(model.validations.latest.date).toLocaleDateString()}
								{:else}
									-
								{/if}
							</td>
							<td class="text-center">
								{#if model.validations?.latest}
									<span
										class="badge {model.validations.latest.status === 'completed'
											? 'badge-success'
											: model.validations.latest.status === 'failed'
												? 'badge-error'
												: model.validations.latest.status === 'running'
													? 'badge-warning'
													: 'badge-ghost'}"
									>
										{model.validations.latest.status}
									</span>
								{:else}
									<span class="badge badge-ghost">-</span>
								{/if}
							</td>
							<td class="text-center" onclick={(e) => e.stopPropagation()}>
								<Dropdown placement="bottom-end">
									{#snippet trigger()}
										<span class="btn btn-ghost btn-sm">
											<MaterialSymbolsMoreVert class="h-4 w-4" />
										</span>
									{/snippet}
									<li>
										<button
											class="text-error"
											class:loading={deletingModelId === model.checkpoint_id}
											disabled={deletingModelId !== null}
											onclick={(e) => handleDeleteModel(model.checkpoint_id, e)}
										>
											<MaterialSymbolsDelete class="h-4 w-4" />
											{deletingModelId === model.checkpoint_id ? 'Deleting...' : 'Remove model'}
										</button>
									</li>
								</Dropdown>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<SearchModelsModal open={isSearchModalOpen} onClose={handleModalClose} />
