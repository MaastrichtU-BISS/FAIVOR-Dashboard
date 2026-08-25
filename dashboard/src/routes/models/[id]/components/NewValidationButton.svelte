<script lang="ts">
	import { validationStore } from '$lib/stores/models/validation.store';
	import { page } from '$app/stores';

	function openModal() {
		// Extract modelId from the page params if available
		const modelId = $page.params.id;
		validationStore.openModal(undefined, 'create');
	}
</script>

<button class="btn btn-primary" onclick={openModal}>New Validation</button>
