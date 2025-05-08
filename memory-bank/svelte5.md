# **Migrating to Svelte 5 Runes**

## **1. Declaring Props**
In Svelte 5, `$props()` replaces `export let`.

### **Old Syntax**
```svelte
<script>
	export let foo;
</script>
```

### **New Syntax**
```svelte
<script>
	let { foo } = $props();
</script>
```

**Default Values:**
```svelte
<script>
	let { foo = 'default value' } = $props();
</script>
```

---

## **2. Reactive Variables (`$state`)**
Svelte 5 introduces `$state` for reactivity instead of `let`.

### **Old Syntax**
```svelte
<script>
	let count = 0;

	function increment() {
		count += 1;
	}
</script>
```

### **New Syntax**
```svelte
<script>
	let count = $state(0);

	function increment() {
		count += 1;
	}
</script>
```

---

## **3. Derived State (`$derived`)**
Svelte 5 replaces `$:` with `$derived()`.

### **Old Syntax**
```svelte
<script>
	let count = 0;
	$: doubled = count * 2;
</script>
```

### **New Syntax**
```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>
```

For more complex derivations:
```svelte
<script>
	let numbers = $state([1, 2, 3]);

	let total = $derived.by(() => {
		let sum = 0;
		for (const n of numbers) {
			sum += n;
		}
		return sum;
	});
</script>
```

---

## **4. Side Effects (`$effect`)**
The `$:` block for side effects is replaced with `$effect()`.

### **Old Syntax**
```svelte
<script>
	let count = 0;
	$: {
		if (count > 10) {
			alert('Too high!');
		}
	}
</script>
```

### **New Syntax**
```svelte
<script>
	let count = $state(0);

	$effect(() => {
		if (count > 10) {
			alert('Too high!');
		}
	});
</script>
```

---

## **5. Lifecycle Hooks (`onMount`, `onDestroy`)**
Lifecycle functions remain similar, but `$effect` is preferred.

### **Old Syntax**
```svelte
<script>
	import { onMount } from 'svelte';

	onMount(() => {
		console.log('Component mounted');
	});
</script>
```

### **New Syntax**
```svelte
<script>
	import { onMount } from 'svelte';

	onMount(() => {
		console.log('Component mounted');
	});
</script>
```

---

## **6. Bindings (`bind:`)**
Bindings remain mostly unchanged but must be explicitly **bindable**.

### **Old Syntax**
```svelte
<input bind:value={count} />
```

### **New Syntax**
```svelte
<input bind:value={count} />
```

For component bindings:

### **Old Syntax**
```svelte
<MyComponent bind:someValue={foo} />
```

### **New Syntax**
```svelte
<MyComponent bind:someValue={foo} />
```

But **in Svelte 5**, the component prop must be **explicitly bindable**:
```svelte
<script>
	let { value = $bindable() } = $props();
</script>
```

---

## **7. Context API (`setContext` and `getContext`)**
Context API remains unchanged.

### **Old Syntax**
```svelte
<script>
	import { setContext } from 'svelte';
	setContext('key', value);
</script>
```

### **New Syntax**
```svelte
<script>
	import { setContext } from 'svelte';
	setContext('key', value);
</script>
```

No major changes.

---

## **8. Snippets (`{@render}` replaces slots)**
Svelte 5 replaces `slot` with **snippets**.

### **Old Syntax (Slots)**
```svelte
<!-- Parent.svelte -->
<MyComponent>
	<p>Hello</p>
</MyComponent>

<!-- MyComponent.svelte -->
<slot />
```

### **New Syntax (Snippets)**
```svelte
<!-- Parent.svelte -->
<MyComponent>
	{@render content()}
</MyComponent>

<!-- MyComponent.svelte -->
{#snippet content()}
	<p>Hello</p>
{/snippet}
```

---

## **9. Stores (`$` prefix for store subscriptions)**
Stores are still used, but `$state` is preferred for local state.

### **Old Syntax**
```svelte
<script>
	import { writable } from 'svelte/store';
	let count = writable(0);
</script>

<p>{$count}</p>
```

### **New Syntax**
```svelte
<script>
	import { writable } from 'svelte/store';
	let count = writable(0);
</script>

<p>{$count}</p>
```

No change, but `$state` is now the recommended alternative.

---

## **Summary**
| Feature | Svelte 4 | Svelte 5 |
|---------|---------|---------|
| **Props** | `export let prop;` | `let { prop } = $props();` |
| **Reactivity** | `let count = 0;` | `let count = $state(0);` |
| **Derived State** | `$: doubled = count * 2;` | `let doubled = $derived(count * 2);` |
| **Side Effects** | `$: { effect }` | `$effect(() => effect);` |
| **Lifecycle Hooks** | `onMount(() => {})` | `onMount(() => {})` (unchanged) |
| **Bindings** | `<input bind:value={count} />` | `<input bind:value={count} />` (but must be `$bindable()`) |
| **Context API** | `setContext('key', value);` | `setContext('key', value);` (unchanged) |
| **Slots → Snippets** | `<slot />` | `{#snippet content()} {/snippet}` |
| **Stores** | `$count` (from writable store) | `$count` (unchanged, but `$state` preferred) |

---

This Markdown file provides a **clear migration guide** from the old syntax to **Svelte 5 runes**. 🚀
