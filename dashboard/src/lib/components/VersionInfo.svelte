<script lang="ts">
	import { onMount } from 'svelte';
	import MaterialSymbolsInfoOutline from '~icons/material-symbols/info-outline';

	interface VersionData {
		dashboard: {
			name: string;
			version: string;
		};
		validator: {
			name: string;
			version: string;
			status: 'online' | 'offline' | 'error' | 'unknown';
		};
	}

	let versionData: VersionData | null = $state(null);
	let isLoading = $state(true);
	let showTooltip = $state(false);

	onMount(async () => {
		try {
			const response = await fetch('/api/version');
			if (response.ok) {
				versionData = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch version info:', error);
		} finally {
			isLoading = false;
		}
	});

	const statusColor = $derived(() => {
		if (!versionData) return 'bg-base-300';
		switch (versionData.validator.status) {
			case 'online':
				return 'bg-success';
			case 'offline':
				return 'bg-error';
			case 'error':
				return 'bg-warning';
			default:
				return 'bg-base-300';
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative inline-flex items-center"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
>
	<button class="btn btn-ghost btn-xs gap-1 text-base-content/60 hover:text-base-content">
		{#if isLoading}
			<span class="loading loading-spinner loading-xs"></span>
		{:else if versionData}
			<span class="text-xs">v{versionData.dashboard.version}</span>
			<span class="h-2 w-2 rounded-full {statusColor()}"></span>
		{:else}
			<MaterialSymbolsInfoOutline class="h-4 w-4" />
		{/if}
	</button>

	{#if showTooltip && versionData}
		<div
			class="bg-base-100 border-base-300 absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-lg border p-3 shadow-lg"
		>
			<!-- Arrow pointing up -->
			<div
				class="bg-base-100 border-base-300 absolute bottom-full left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-l border-t"
			></div>
			<div class="min-w-48 space-y-2 text-sm">
				<div class="flex items-center justify-between gap-4">
					<span class="text-base-content/70">Dashboard:</span>
					<span class="font-mono">v{versionData.dashboard.version}</span>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span class="text-base-content/70">Validator:</span>
					<div class="flex items-center gap-2">
						<span class="font-mono">v{versionData.validator.version}</span>
						<span
							class="h-2 w-2 rounded-full {statusColor()}"
							title={versionData.validator.status}
						></span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
