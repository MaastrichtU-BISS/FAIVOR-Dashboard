<script lang="ts">
	export let userName = '';
	export let date = '';
	export let uploadedFile: File | null = null;

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			uploadedFile = input.files[0];
		}
	}
</script>

<div class="space-y-6">
	<div>
		<label class="label" for="userName">User</label>
		<input
			type="text"
			id="userName"
			class="input input-bordered w-full"
			placeholder="Add user name (Sam Smith)"
			bind:value={userName}
		/>
	</div>

	<div>
		<label class="label" for="date">Date</label>
		<input type="date" id="date" class="input input-bordered w-full" bind:value={date} />
	</div>

	<div class="border-base-300 rounded-lg border-2 border-dashed p-8 text-center">
		<div class="flex flex-col items-center justify-center gap-4">
			<i class="i-mdi-upload text-4xl"></i>
			<div>
				<h3 class="text-lg font-semibold">Upload dataset</h3>
				<p class="text-base-content/70 text-sm">or drag and drop</p>
			</div>
			<input
				type="file"
				class="file-input file-input-bordered w-full max-w-xs"
				on:change={handleFileUpload}
			/>
		</div>
		{#if uploadedFile}
			<p class="text-success mt-4">Successfully uploaded: {uploadedFile.name}</p>
		{/if}
	</div>
</div>
