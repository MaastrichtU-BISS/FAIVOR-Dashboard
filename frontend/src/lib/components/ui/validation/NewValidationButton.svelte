<script lang="ts">
	import ValidationModal from './ValidationModal.svelte';

	let isModalOpen = false;

	function openModal() {
		isModalOpen = true;
	}

	function handleClose() {
		isModalOpen = false;
	}
</script>

<button class="btn btn-primary" on:click={openModal}>New Validation</button>

<ValidationModal bind:open={isModalOpen} on:close={handleClose} />
