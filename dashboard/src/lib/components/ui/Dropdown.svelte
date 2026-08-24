<script lang="ts">
	import { computePosition, autoUpdate, offset, flip, shift } from '@floating-ui/dom';
	import type { Snippet } from 'svelte';

	type Placement =
		| 'top'
		| 'top-start'
		| 'top-end'
		| 'bottom'
		| 'bottom-start'
		| 'bottom-end'
		| 'left'
		| 'left-start'
		| 'left-end'
		| 'right'
		| 'right-start'
		| 'right-end';

	interface Props {
		/** Content for the trigger button */
		trigger: Snippet;
		/** Content for the dropdown menu */
		children: Snippet;
		/** Placement of the dropdown relative to the trigger */
		placement?: Placement;
		/** Offset from the trigger element in pixels */
		offsetDistance?: number;
		/** Additional classes for the dropdown container */
		class?: string;
		/** Additional classes for the floating menu */
		menuClass?: string;
		/** Whether the dropdown is open (controlled mode) */
		open?: boolean;
		/** Callback when open state changes */
		onOpenChange?: (open: boolean) => void;
	}

	let {
		trigger,
		children,
		placement = 'bottom-end',
		offsetDistance = 4,
		class: className = '',
		menuClass = '',
		open = $bindable(false),
		onOpenChange
	}: Props = $props();

	let referenceEl: HTMLButtonElement | null = $state(null);
	let floatingEl: HTMLDivElement | null = $state(null);
	let floatingStyles = $state('position: absolute; left: 0; top: 0;');
	let cleanup: (() => void) | null = null;

	function updatePosition() {
		if (!referenceEl || !floatingEl) return;

		computePosition(referenceEl, floatingEl, {
			placement,
			middleware: [offset(offsetDistance), flip(), shift({ padding: 8 })]
		}).then(({ x, y }) => {
			floatingStyles = `position: absolute; left: ${x}px; top: ${y}px;`;
		});
	}

	function setOpen(value: boolean) {
		open = value;
		onOpenChange?.(value);
	}

	function handleToggle() {
		setOpen(!open);
	}

	function handleClickOutside(event: MouseEvent) {
		if (!open) return;
		const target = event.target as Node;
		if (referenceEl?.contains(target) || floatingEl?.contains(target)) return;
		setOpen(false);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			setOpen(false);
			referenceEl?.focus();
		}
	}

	$effect(() => {
		if (open && referenceEl && floatingEl) {
			cleanup = autoUpdate(referenceEl, floatingEl, updatePosition);
		} else if (cleanup) {
			cleanup();
			cleanup = null;
		}

		return () => {
			if (cleanup) {
				cleanup();
				cleanup = null;
			}
		};
	});

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			document.addEventListener('keydown', handleKeydown);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="dropdown-container relative {className}">
	<button
		bind:this={referenceEl}
		type="button"
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={handleToggle}
	>
		{@render trigger()}
	</button>

	{#if open}
		<div
			bind:this={floatingEl}
			style={floatingStyles}
			class="dropdown-menu menu bg-base-100 rounded-box z-50 min-w-52 p-2 shadow-lg {menuClass}"
			role="menu"
		>
			{@render children()}
		</div>
	{/if}
</div>
