<script lang="ts">
	import { PUBLIC_ORGANIZATION_NAME } from '$env/static/public';

	let { class: className = undefined } = $props();
</script>

<div
	class={`from-primary via-secondary to-accent bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent ${className ?? ''}`}
>
	{PUBLIC_ORGANIZATION_NAME}
</div>
