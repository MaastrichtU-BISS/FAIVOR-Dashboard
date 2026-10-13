<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { JsonLdExportOptions, JsonLdExportSection } from '$lib/types/jsonld-export';

  interface Props {
    isOpen: boolean;
    availableSections: JsonLdExportSection[];
    defaultSection?: JsonLdExportSection;
    title?: string;
  }

  let { isOpen, availableSections, defaultSection = 'combined', title = 'Export JSON-LD' }: Props =
    $props();

  const dispatch = createEventDispatcher<{
    confirm: JsonLdExportOptions;
    cancel: void;
  }>();

  let section = $state<JsonLdExportSection>(defaultSection);
  let redactIdentity = $state(true);
  let redactDatasetFiles = $state(true);
  let redactTechnicalDetails = $state(true);

  let dialogElement: HTMLDialogElement;

  $effect(() => {
    if (!dialogElement) return;

    if (isOpen) {
      section = availableSections.includes(defaultSection) ? defaultSection : availableSections[0];
      dialogElement.showModal();
      return;
    }

    if (dialogElement.open) {
      dialogElement.close();
    }
  });

  function handleConfirm() {
    dispatch('confirm', {
      section,
      redaction: {
        redactIdentity,
        redactDatasetFiles,
        redactTechnicalDetails
      }
    });
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<dialog bind:this={dialogElement} class="modal" onclose={handleCancel}>
  <div class="modal-box max-w-xl">
    <h3 class="text-lg font-semibold">{title}</h3>
    <p class="text-base-content/70 mt-2 text-sm">
      Choose what to export and which sensitive details to redact before download.
    </p>

    <div class="mt-5 space-y-4">
      <div>
        <label class="mb-2 block text-sm font-medium">Export Scope</label>
        <select class="select select-bordered w-full" bind:value={section}>
          {#each availableSections as availableSection}
            <option value={availableSection}>
              {#if availableSection === 'combined'}
                Complete Export (results + characteristics)
              {:else if availableSection === 'validationResults'}
                Validation Results Only
              {:else}
                Data Characteristics Only
              {/if}
            </option>
          {/each}
        </select>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium">Redaction Options</p>

        <label class="label cursor-pointer justify-start gap-3">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={redactIdentity} />
          <span class="label-text">Redact user identity fields</span>
        </label>

        <label class="label cursor-pointer justify-start gap-3">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={redactDatasetFiles} />
          <span class="label-text">Redact dataset file/folder details</span>
        </label>

        <label class="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            bind:checked={redactTechnicalDetails}
          />
          <span class="label-text">Redact technical error details</span>
        </label>
      </div>
    </div>

    <div class="modal-action">
      <button class="btn" onclick={handleCancel}>Cancel</button>
      <button class="btn btn-primary" onclick={handleConfirm}>Download JSON-LD</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
