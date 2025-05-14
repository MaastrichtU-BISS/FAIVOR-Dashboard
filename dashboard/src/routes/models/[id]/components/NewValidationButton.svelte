<script lang="ts">
	import ValidationModal from './ValidationModal.svelte';
	import { validationStore } from '$lib/stores/validation.store.ts';
	import { page } from '$app/stores';

	function openModal() {
		// Extract modelId from the page params if available
		const modelId = $page.params.id;
		validationStore.openModal(undefined, 'create');
	}
</script>

<button class="btn btn-primary" onclick={openModal}>New Validation</button>

<ValidationModal modelId={$page.params.id} />
