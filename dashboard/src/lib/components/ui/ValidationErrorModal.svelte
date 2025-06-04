<!-- src/lib/components/ui/ValidationErrorModal.svelte -->
<script lang="ts">
	import MaterialSymbolsError from '~icons/material-symbols/error';
	import MaterialSymbolsClose from '~icons/material-symbols/close';
	import MaterialSymbolsWarning from '~icons/material-symbols/warning';
	import type { CSVValidationResponse, ModelValidationResponse } from '$lib/api/faivor-backend';

	interface Props {
		isOpen: boolean;
		validationResult?: {
			success: boolean;
			message: string;
			details?: CSVValidationResponse | ModelValidationResponse;
		} | null;
		onClose: () => void;
	}

	let { isOpen = $bindable(false), validationResult, onClose }: Props = $props();

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	// Type guard to check if details is CSV validation response
	function isCSVValidationResponse(details: any): details is CSVValidationResponse {
		return details && 'csv_columns' in details && 'model_input_columns' in details;
	}

	// Type guard to check if details is Model validation response
	function isModelValidationResponse(details: any): details is ModelValidationResponse {
		return details && 'model_name' in details && 'metrics' in details;
	}
</script>

{#if isOpen && validationResult}
	<!-- Modal backdrop -->
	<div
		class="modal modal-open"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="validation-modal-title"
	>
		<div class="modal-box max-w-2xl">
			<!-- Modal header -->
			<div class="border-base-300 flex items-center justify-between border-b pb-4">
				<div class="flex items-center gap-3">
					{#if validationResult.success}
						<div class="text-success">
							<MaterialSymbolsWarning class="h-6 w-6" />
						</div>
						<h3 id="validation-modal-title" class="text-success text-lg font-semibold">
							Validation Warning
						</h3>
					{:else}
						<div class="text-error">
							<MaterialSymbolsError class="h-6 w-6" />
						</div>
						<h3 id="validation-modal-title" class="text-error text-lg font-semibold">
							Validation Error
						</h3>
					{/if}
				</div>
				<button class="btn btn-ghost btn-sm" onclick={onClose} aria-label="Close modal">
					<MaterialSymbolsClose class="h-5 w-5" />
				</button>
			</div>

			<!-- Modal content -->
			<div class="py-6">
				<div class="space-y-4">
					<!-- Main message -->
					<div class="alert {validationResult.success ? 'alert-warning' : 'alert-error'}">
						<div class="flex flex-col gap-2">
							<span class="font-medium">{validationResult.message}</span>
						</div>
					</div>

					<!-- Detailed information for successful validations -->
					{#if validationResult.success && validationResult.details}
						<div class="space-y-3">
							<h4 class="text-base-content font-medium">Validation Details:</h4>

							<!-- CSV Validation Details -->
							{#if isCSVValidationResponse(validationResult.details)}
								<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<!-- CSV Columns -->
									<div class="card bg-base-200">
										<div class="card-body p-4">
											<h5 class="text-base-content/80 text-sm font-medium">CSV Columns Found:</h5>
											<div class="mt-2 space-y-1">
												{#each validationResult.details.csv_columns as column}
													<div class="badge badge-outline badge-sm">{column}</div>
												{/each}
											</div>
										</div>
									</div>

									<!-- Model Input Columns -->
									<div class="card bg-base-200">
										<div class="card-body p-4">
											<h5 class="text-base-content/80 text-sm font-medium">
												Expected Model Inputs:
											</h5>
											<div class="mt-2 space-y-1">
												{#each validationResult.details.model_input_columns as column}
													<div class="badge badge-primary badge-sm">{column}</div>
												{/each}
											</div>
										</div>
									</div>
								</div>

								<!-- Column matching analysis -->
								{@const csvCols = new Set(validationResult.details.csv_columns)}
								{@const modelCols = new Set(validationResult.details.model_input_columns)}
								{@const missingInCsv = [...modelCols].filter((col) => !csvCols.has(col))}
								{@const extraInCsv = [...csvCols].filter((col) => !modelCols.has(col))}
								<div class="space-y-2">
									<h5 class="text-base-content/80 text-sm font-medium">Column Analysis:</h5>
									<div class="space-y-1 text-sm">
										{#if missingInCsv.length > 0}
											<div class="text-warning">
												⚠️ Missing in CSV: {missingInCsv.join(', ')}
											</div>
										{/if}

										{#if extraInCsv.length > 0}
											<div class="text-info">
												ℹ️ Extra columns in CSV: {extraInCsv.join(', ')}
											</div>
										{/if}

										{#if missingInCsv.length === 0}
											<div class="text-success">
												✅ All required model input columns are present in CSV
											</div>
										{/if}
									</div>
								</div>
							{/if}

							<!-- Model Validation Details -->
							{#if isModelValidationResponse(validationResult.details)}
								<div class="space-y-3">
									<div class="card bg-base-200">
										<div class="card-body p-4">
											<h5 class="text-base-content/80 text-sm font-medium">Model Information:</h5>
											<div class="mt-2">
												<div class="badge badge-primary">{validationResult.details.model_name}</div>
											</div>
										</div>
									</div>

									<div class="card bg-base-200">
										<div class="card-body p-4">
											<h5 class="text-base-content/80 text-sm font-medium">Calculated Metrics:</h5>
											<div class="mt-2 space-y-1">
												{#each Object.entries(validationResult.details.metrics) as [key, value]}
													<div class="flex justify-between text-sm">
														<span>{key}:</span>
														<span class="font-mono">{value}</span>
													</div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Error details for failed validations -->
					{#if !validationResult.success}
						<div class="space-y-3">
							<h4 class="text-base-content font-medium">What to check:</h4>
							<ul class="text-base-content/80 list-inside list-disc space-y-1 text-sm">
								<li>Ensure metadata.json follows the FAIRmodels format</li>
								<li>Check that data.csv contains the expected columns</li>
								<li>Verify that column names match between metadata and CSV</li>
								<li>Ensure files are properly formatted (valid JSON/CSV)</li>
							</ul>
						</div>
					{/if}
				</div>
			</div>

			<!-- Modal actions -->
			<div class="modal-action">
				<button class="btn btn-primary" onclick={onClose}>
					{validationResult.success ? 'Continue' : 'Fix Issues'}
				</button>
			</div>
		</div>
	</div>
{/if}
