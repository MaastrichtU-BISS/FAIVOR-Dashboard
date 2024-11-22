<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- DEFAULT Layout 🩻🩻🩻🩻🩻🩻 -->

<div class="-mt-20 w-full overflow-auto break-words px-3">
	<div class="prose sm:prose-lg mx-auto py-20">
		{@render children?.()}
	</div>
</div>
