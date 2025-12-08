<script lang="ts">
	import { computePosition, flip, shift, offset, arrow } from '@floating-ui/dom';
	import type { ModelMetadataSnapshot } from '$lib/types/validation';
	import MaterialSymbolsInfoOutline from '~icons/material-symbols/info-outline';
	import MaterialSymbolsContentCopyOutline from '~icons/material-symbols/content-copy-outline';
	import MaterialSymbolsCheckCircle from '~icons/material-symbols/check-circle';
	import toast from 'svelte-french-toast';

	interface Props {
		metadata: ModelMetadataSnapshot;
		size?: 'sm' | 'md' | 'lg';
	}

	let { metadata, size = 'md' }: Props = $props();

	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | null = $state(null);
	let popoverRef: HTMLDivElement | null = $state(null);
	let arrowRef: HTMLDivElement | null = $state(null);
	let copiedField: string | null = $state(null);

	async function updatePosition() {
		if (!buttonRef || !popoverRef) return;

		const { x, y, placement, middlewareData } = await computePosition(buttonRef, popoverRef, {
			placement: 'bottom-start',
			middleware: [
				offset(8),
				flip({ fallbackAxisSideDirection: 'start' }),
				shift({ padding: 8 }),
				...(arrowRef ? [arrow({ element: arrowRef })] : [])
			]
		});

		Object.assign(popoverRef.style, {
			left: `${x}px`,
			top: `${y}px`
		});

		if (arrowRef && middlewareData.arrow) {
			const { x: arrowX, y: arrowY } = middlewareData.arrow;
			const staticSide = {
				top: 'bottom',
				right: 'left',
				bottom: 'top',
				left: 'right'
			}[placement.split('-')[0]] as string;

			Object.assign(arrowRef.style, {
				left: arrowX != null ? `${arrowX}px` : '',
				top: arrowY != null ? `${arrowY}px` : '',
				right: '',
				bottom: '',
				[staticSide]: '-4px'
			});
		}
	}

	function handleToggle() {
		isOpen = !isOpen;
		if (isOpen) {
			// Use requestAnimationFrame to ensure DOM is updated
			requestAnimationFrame(() => {
				updatePosition();
			});
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (
			isOpen &&
			popoverRef &&
			buttonRef &&
			!popoverRef.contains(event.target as Node) &&
			!buttonRef.contains(event.target as Node)
		) {
			isOpen = false;
		}
	}

	async function copyToClipboard(value: string, fieldName: string) {
		try {
			await navigator.clipboard.writeText(value);
			copiedField = fieldName;
			toast.success(`Copied ${fieldName}`);
			setTimeout(() => {
				copiedField = null;
			}, 2000);
		} catch (err) {
			toast.error('Failed to copy');
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});

	const iconSize = $derived(
		size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
	);

	// Format captured_at date
	const capturedDate = $derived(
		metadata.captured_at ? new Date(metadata.captured_at).toLocaleString() : 'Unknown'
	);
</script>

<div class="relative inline-block">
	<button
		bind:this={buttonRef}
		class="btn btn-ghost btn-circle btn-xs"
		onclick={handleToggle}
		title="View model metadata"
	>
		<MaterialSymbolsInfoOutline class={iconSize} />
	</button>

	{#if isOpen}
		<div
			bind:this={popoverRef}
			class="bg-base-100 border-base-300 fixed z-50 min-w-80 max-w-md rounded-lg border shadow-xl"
			role="dialog"
			aria-modal="true"
		>
			<!-- Arrow -->
			<div
				bind:this={arrowRef}
				class="bg-base-100 border-base-300 absolute h-2 w-2 rotate-45 border-l border-t"
			></div>

			<!-- Header -->
			<div class="bg-base-200 flex items-center justify-between rounded-t-lg border-b px-4 py-3">
				<h3 class="text-sm font-semibold">Model Metadata Snapshot</h3>
				<button class="btn btn-ghost btn-xs btn-circle" onclick={() => (isOpen = false)}>
					✕
				</button>
			</div>

			<!-- Content -->
			<div class="max-h-96 overflow-y-auto p-4">
				<div class="space-y-4 text-sm">
					<!-- Docker Information -->
					{#if metadata.docker_image_name || metadata.docker_image_sha256}
						<div class="space-y-2">
							<h4 class="font-semibold text-primary">Docker Image</h4>
							{#if metadata.docker_image_name}
								<div class="flex items-center justify-between gap-2">
									<span class="text-base-content/70">Image:</span>
									<div class="flex items-center gap-1">
										<code class="bg-base-200 max-w-48 truncate rounded px-2 py-0.5 text-xs">
											{metadata.docker_image_name}
										</code>
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => copyToClipboard(metadata.docker_image_name!, 'image name')}
										>
											{#if copiedField === 'image name'}
												<MaterialSymbolsCheckCircle class="h-3 w-3 text-success" />
											{:else}
												<MaterialSymbolsContentCopyOutline class="h-3 w-3" />
											{/if}
										</button>
									</div>
								</div>
							{/if}
							{#if metadata.docker_image_sha256}
								<div class="flex items-center justify-between gap-2">
									<span class="text-base-content/70">SHA256:</span>
									<div class="flex items-center gap-1">
										<code class="bg-base-200 max-w-48 truncate rounded px-2 py-0.5 text-xs">
											{metadata.docker_image_sha256.slice(0, 16)}...
										</code>
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => copyToClipboard(metadata.docker_image_sha256!, 'SHA256')}
										>
											{#if copiedField === 'SHA256'}
												<MaterialSymbolsCheckCircle class="h-3 w-3 text-success" />
											{:else}
												<MaterialSymbolsContentCopyOutline class="h-3 w-3" />
											{/if}
										</button>
									</div>
								</div>
							{/if}
							{#if metadata.docker_exposed_port}
								<div class="flex items-center justify-between gap-2">
									<span class="text-base-content/70">Port:</span>
									<span>{metadata.docker_exposed_port}</span>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Model Info -->
					<div class="space-y-2">
						<h4 class="font-semibold text-primary">Model Information</h4>
						{#if metadata.title}
							<div class="flex items-start justify-between gap-2">
								<span class="text-base-content/70">Title:</span>
								<span class="text-right">{metadata.title}</span>
							</div>
						{/if}
						{#if metadata.fair_model_id}
							<div class="flex items-center justify-between gap-2">
								<span class="text-base-content/70">FAIR ID:</span>
								<div class="flex items-center gap-1">
									<code class="bg-base-200 max-w-32 truncate rounded px-2 py-0.5 text-xs">
										{metadata.fair_model_id}
									</code>
									<button
										class="btn btn-ghost btn-xs"
										onclick={() => copyToClipboard(metadata.fair_model_id!, 'FAIR ID')}
									>
										{#if copiedField === 'FAIR ID'}
											<MaterialSymbolsCheckCircle class="h-3 w-3 text-success" />
										{:else}
											<MaterialSymbolsContentCopyOutline class="h-3 w-3" />
										{/if}
									</button>
								</div>
							</div>
						{/if}
						{#if metadata.checkpoint_id}
							<div class="flex items-center justify-between gap-2">
								<span class="text-base-content/70">Checkpoint:</span>
								<div class="flex items-center gap-1">
									<code class="bg-base-200 max-w-32 truncate rounded px-2 py-0.5 text-xs">
										{metadata.checkpoint_id.slice(0, 12)}...
									</code>
									<button
										class="btn btn-ghost btn-xs"
										onclick={() => copyToClipboard(metadata.checkpoint_id!, 'checkpoint ID')}
									>
										{#if copiedField === 'checkpoint ID'}
											<MaterialSymbolsCheckCircle class="h-3 w-3 text-success" />
										{:else}
											<MaterialSymbolsContentCopyOutline class="h-3 w-3" />
										{/if}
									</button>
								</div>
							</div>
						{/if}
						{#if metadata.algorithm}
							<div class="flex items-start justify-between gap-2">
								<span class="text-base-content/70">Algorithm:</span>
								<span class="max-w-40 truncate text-right" title={metadata.algorithm}>
									{metadata.algorithm.split('/').pop() || metadata.algorithm}
								</span>
							</div>
						{/if}
					</div>

					<!-- Authorship -->
					{#if metadata.created_by || metadata.contact_email || metadata.creation_date}
						<div class="space-y-2">
							<h4 class="font-semibold text-primary">Authorship</h4>
							{#if metadata.created_by}
								<div class="flex items-center justify-between gap-2">
									<span class="text-base-content/70">Created by:</span>
									<span>{metadata.created_by}</span>
								</div>
							{/if}
							{#if metadata.contact_email}
								<div class="flex items-center justify-between gap-2">
									<span class="text-base-content/70">Contact:</span>
									<a href="mailto:{metadata.contact_email}" class="link text-xs">
										{metadata.contact_email}
									</a>
								</div>
							{/if}
							{#if metadata.creation_date}
								<div class="flex items-center justify-between gap-2">
									<span class="text-base-content/70">Created:</span>
									<span>{metadata.creation_date}</span>
								</div>
							{/if}
							{#if metadata.last_updated}
								<div class="flex items-center justify-between gap-2">
									<span class="text-base-content/70">Updated:</span>
									<span>{new Date(metadata.last_updated).toLocaleDateString()}</span>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Input Features Summary -->
					{#if metadata.input_features && metadata.input_features.length > 0}
						<div class="space-y-2">
							<h4 class="font-semibold text-primary">Input Features</h4>
							<div class="text-base-content/70">
								{metadata.input_features.length} feature(s):
								<span class="text-base-content">
									{metadata.input_features
										.slice(0, 3)
										.map((f) => f.label || f.feature_id?.split('/').pop())
										.join(', ')}
									{#if metadata.input_features.length > 3}
										<span class="text-base-content/50">
											+{metadata.input_features.length - 3} more
										</span>
									{/if}
								</span>
							</div>
						</div>
					{/if}

					<!-- References -->
					{#if metadata.papers?.length || metadata.code_repositories?.length}
						<div class="space-y-2">
							<h4 class="font-semibold text-primary">References</h4>
							{#if metadata.papers?.length}
								<div class="flex items-start justify-between gap-2">
									<span class="text-base-content/70">Papers:</span>
									<span>{metadata.papers.length} reference(s)</span>
								</div>
							{/if}
							{#if metadata.code_repositories?.length}
								<div class="flex items-start justify-between gap-2">
									<span class="text-base-content/70">Code:</span>
									<span>{metadata.code_repositories.length} repo(s)</span>
								</div>
							{/if}
							{#if metadata.software_license}
								<div class="flex items-start justify-between gap-2">
									<span class="text-base-content/70">License:</span>
									<span class="max-w-40 truncate" title={metadata.software_license}>
										{metadata.software_license.split('/').pop()}
									</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="bg-base-200 border-t px-4 py-2 text-xs text-base-content/60 rounded-b-lg">
				Captured: {capturedDate}
			</div>
		</div>
	{/if}
</div>
