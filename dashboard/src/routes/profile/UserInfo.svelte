<script lang="ts">
	import { page } from '$app/stores';
	import Key from '~icons/lucide/key';
	import Shield from '~icons/lucide/shield';
	import User from '~icons/lucide/user';
	import ChangePasswordModal from './ChangePasswordModal.svelte';

	let showPasswordModal = $state(false);

	let session = $derived($page.data?.session);
	let user = $derived(session?.user);
	let roles = $derived((user as { roles?: string[] })?.roles ?? []);
	let provider = $derived((session as { provider?: string })?.provider);
	let isCredentialsProvider = $derived(provider === 'credentials');

	function handleImageError(e: Event) {
		if (e.target instanceof HTMLImageElement) {
			console.error('Image failed to load:', e.target.src);
			e.target.onerror = null;
			e.target.src = '/images/profile.avif';
		}
	}

	function formatProvider(p: string | undefined): string {
		if (!p) return 'Unknown';
		return p.charAt(0).toUpperCase() + p.slice(1);
	}
</script>

<div class="w-11/12">
	<div class="flex justify-center pb-10">
		<div class="avatar pointer-events-none select-none">
			<div class="mask mask-hexagon w-40">
				<img
					class="!object-contain"
					src={$page.data?.session?.user?.image ?? '/images/profile.avif'}
					alt="username"
					onerror={handleImageError}
				/>
			</div>
		</div>

		<div class="ml-10">
			<div class="">
				<div class="block text-3xl font-light leading-relaxed">
					{user?.name || user?.email?.split('@')[0] || 'User'}
				</div>
				<div class="block font-light leading-relaxed text-base-content/70">
					{user?.email || ''}
				</div>
			</div>

			<div class="mt-4 flex flex-wrap gap-2">
				{#each roles as role (role)}
					<span class="badge badge-primary gap-1">
						<Shield class="h-3 w-3" />
						{role}
					</span>
				{/each}
				{#if provider}
					<span class="badge badge-ghost gap-1">
						<User class="h-3 w-3" />
						{formatProvider(provider)}
					</span>
				{/if}
			</div>

			{#if isCredentialsProvider}
				<button class="btn btn-outline mt-4" onclick={() => (showPasswordModal = true)}>
					<Key />
					Change Password
				</button>
			{/if}
		</div>
	</div>
	<div class="border-base-300 border-b"></div>

	<ChangePasswordModal bind:showModal={showPasswordModal} />
</div>
