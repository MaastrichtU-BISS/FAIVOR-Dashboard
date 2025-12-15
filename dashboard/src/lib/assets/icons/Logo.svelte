<script lang="ts">
	import { env } from '$env/dynamic/public';

	let { class: className = undefined } = $props();
</script>

<div
	class={`from-primary via-secondary to-accent bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent ${className ?? ''}`}
>
	{env.PUBLIC_ORGANIZATION_NAME || 'FAIVOR'}
</div>
