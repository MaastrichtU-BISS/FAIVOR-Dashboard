<script>
	import UserInfo from './UserInfo.svelte';
	import { page } from '$app/stores';
</script>

<div class="container mx-auto">
	{#if $page.data.session}
		<UserInfo />
	{:else}
		Not logged in
	{/if}
</div>
