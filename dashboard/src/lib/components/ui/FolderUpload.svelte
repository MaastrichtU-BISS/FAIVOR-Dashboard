<!-- src/lib/components/ui/FolderUpload.svelte -->
<script lang="ts">
	import MaterialSymbolsFolder from '~icons/material-symbols/folder';
	import MaterialSymbolsDeleteOutline from '~icons/material-symbols/delete-outline';
	import MaterialSymbolsCheck from '~icons/material-symbols/check';
	import MaterialSymbolsError from '~icons/material-symbols/error';
	import MaterialSymbolsInfo from '~icons/material-symbols/info';
	import type { DatasetFolderFiles } from '$lib/types/validation';
	import type { Model } from '$lib/stores/models/types';
	import { validateDatasetFolder, extractFolderName } from '$lib/utils/indexeddb-storage';
	import { validationFormStore } from '$lib/stores/models/validation.store';

	interface Props {
		folderFiles?: DatasetFolderFiles;
		folderName?: string;
		readonly?: boolean;
		model?: Model;
		onFolderSelected?: (files: DatasetFolderFiles, folderName: string) => void;
		onFolderRemoved?: () => void;
	}

	let {
		folderFiles = undefined,
		folderName = '',
		readonly = false,
		model,
		onFolderSelected = () => {},
		onFolderRemoved = () => {}
	}: Props = $props();

	let folderInput: HTMLInputElement;
	let isDragging = $state(false);
	let validationResult = $state<{
		isValid: boolean;
		errors: string[];
	}>({ isValid: true, errors: [] });

	function handleFolderSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			processFolderUpload(input.files);
		}
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		if (!readonly && event.dataTransfer) {
			// Handle both files and directory items
			const items = event.dataTransfer.items;
			const files = event.dataTransfer.files;

			if (items && items.length > 0) {
				// Try to handle directory items first
				const fileList: File[] = [];
				const promises: Promise<void>[] = [];

				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					if (item.kind === 'file') {
						const entry = item.webkitGetAsEntry?.();
						if (entry) {
							if (entry.isDirectory) {
								// Handle directory
								promises.push(processDirectoryEntry(entry as FileSystemDirectoryEntry, fileList));
							} else {
								// Handle individual file
								const file = item.getAsFile();
								if (file) fileList.push(file);
							}
						} else {
							// Fallback for browsers without webkitGetAsEntry
							const file = item.getAsFile();
							if (file) fileList.push(file);
						}
					}
				}

				Promise.all(promises).then(() => {
					if (fileList.length > 0) {
						// Convert array to FileList-like object
						const dt = new DataTransfer();
						fileList.forEach((file) => dt.items.add(file));
						processFolderUpload(dt.files);
					} else if (files.length > 0) {
						// Fallback to regular files
						processFolderUpload(files);
					}
				});
			} else if (files.length > 0) {
				processFolderUpload(files);
			}
		}
	}

	// Helper function to recursively process directory entries
	async function processDirectoryEntry(
		entry: FileSystemDirectoryEntry,
		fileList: File[]
	): Promise<void> {
		return new Promise((resolve) => {
			const reader = entry.createReader();
			reader.readEntries((entries) => {
				const promises: Promise<void>[] = [];

				for (const childEntry of entries) {
					if (childEntry.isFile) {
						promises.push(
							new Promise<void>((resolveFile) => {
								(childEntry as FileSystemFileEntry).file((file) => {
									// Create a new file with the relative path
									const newFile = new File([file], `${entry.name}/${file.name}`, {
										type: file.type,
										lastModified: file.lastModified
									});
									// Add webkitRelativePath property for compatibility
									Object.defineProperty(newFile, 'webkitRelativePath', {
										value: `${entry.name}/${file.name}`,
										writable: false
									});
									fileList.push(newFile);
									resolveFile();
								});
							})
						);
					} else if (childEntry.isDirectory) {
						promises.push(processDirectoryEntry(childEntry as FileSystemDirectoryEntry, fileList));
					}
				}

				Promise.all(promises).then(() => resolve());
			});
		});
	}

	function processFolderUpload(files: FileList) {
		const validation = validateDatasetFolder(files, model);
		validationResult = {
			isValid: validation.isValid,
			errors: validation.errors
		};

		if (validation.isValid) {
			const extractedFolderName = extractFolderName(files);
			folderFiles = validation.validFiles;
			folderName = extractedFolderName;

			// Update the validation form store with the files
			validationFormStore.setFolderFiles(validation.validFiles, extractedFolderName);

			onFolderSelected(validation.validFiles, extractedFolderName);
		}
	}

	function removeFolder() {
		if (readonly) return;
		folderFiles = undefined;
		folderName = '';
		validationResult = { isValid: true, errors: [] };
		if (folderInput) {
			folderInput.value = '';
		}

		// Clear files from the validation form store
		validationFormStore.clearFolderFiles();

		onFolderRemoved();
	}

	function openFolderDialog() {
		if (!readonly) {
			folderInput?.click();
		}
	}

	function getFileCount(): number {
		if (!folderFiles) return 0;
		return Object.values(folderFiles).filter(Boolean).length;
	}

	function getTotalSize(): number {
		if (!folderFiles) return 0;
		return Object.values(folderFiles).reduce((total, file) => total + (file?.size || 0), 0);
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="space-y-4">
	<!-- Folder Upload Area - Only show if no folder is selected -->
	{#if !folderFiles || !folderName}
		<div
			class="border-base-300 hover:border-primary/50 relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-all duration-200 ease-in-out {isDragging
				? 'border-primary bg-primary/5'
				: ''} {readonly ? 'cursor-not-allowed opacity-50' : ''}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={openFolderDialog}
			onkeydown={(e) => e.key === 'Enter' && openFolderDialog()}
			role="button"
			tabindex="0"
		>
			<div
				class="flex flex-col items-center justify-center gap-4 transition-transform duration-200 {isDragging
					? 'scale-105'
					: ''}"
			>
				<div class="transition-transform duration-200 {isDragging ? 'scale-110' : ''}">
					<MaterialSymbolsFolder class="text-base-content/40 text-primary h-12 w-12" />
				</div>
				<div class="text-center">
					<h3 class="text-lg font-semibold">Select Dataset Folder</h3>
					<p class="text-base-content/70 text-sm">Choose a folder containing data.csv</p>
					<p class="text-base-content/50 mt-1 text-xs">or drag and drop folder here</p>
				</div>
			</div>

			<!-- Hidden file input for folder selection -->
			<input
				bind:this={folderInput}
				type="file"
				class="hidden"
				webkitdirectory
				multiple
				onchange={handleFolderSelect}
				disabled={readonly}
			/>
		</div>
	{/if}

	<!-- Validation Errors -->
	{#if !validationResult.isValid && validationResult.errors.length > 0}
		<div class="alert alert-error">
			<MaterialSymbolsError />
			<div>
				<h4 class="font-semibold">Invalid Folder Structure</h4>
				<ul class="list-inside list-disc text-sm">
					{#each validationResult.errors as error}
						<li>{error}</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- Selected Folder Information -->
	{#if folderFiles && folderName}
		<div class="card bg-base-100 border-base-300 border">
			<div class="card-body p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<MaterialSymbolsFolder class="text-primary h-6 w-6" />
						<div>
							<h4 class="font-semibold">{folderName}</h4>
							<p class="text-base-content/70 text-sm">
								{getFileCount()} files • {formatFileSize(getTotalSize())}
							</p>
						</div>
					</div>
					{#if !readonly}
						<button
							class="btn btn-ghost btn-sm text-error"
							onclick={removeFolder}
							title="Remove folder"
						>
							<MaterialSymbolsDeleteOutline />
						</button>
					{/if}
				</div>

				<!-- File List -->
				<div class="mt-4 space-y-2">
					{#if folderFiles.metadata}
						<div class="flex items-center gap-2 text-sm">
							<MaterialSymbolsCheck class="text-success h-4 w-4" />
							<span>metadata.json</span>
							<span class="text-base-content/50">
								({formatFileSize(folderFiles.metadata.size || 0)})
							</span>
						</div>
					{/if}
					{#if folderFiles.data}
						<div class="flex items-center gap-2 text-sm">
							<MaterialSymbolsCheck class="text-success h-4 w-4" />
							<span>data.csv</span>
							<span class="text-base-content/50">
								({formatFileSize(folderFiles.data.size || 0)})
							</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
