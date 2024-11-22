<script lang="ts">
	import ValidationModal from './ValidationModal.svelte';

	let modal: HTMLDialogElement;

	function openModal() {
		modal = document.getElementById('validation_modal') as HTMLDialogElement;
		modal.showModal();
	}

	function handleClose() {
		modal?.close();
	}
</script>

<button class="btn btn-primary" on:click={openModal}>
	<i class="i-mdi-plus mr-2"></i>
	New Validation
</button>

<ValidationModal on:close={handleClose} />
