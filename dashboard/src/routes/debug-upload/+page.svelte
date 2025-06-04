<script lang="ts">
	let files = $state<{
		metadata?: File;
		data?: File;
		columnMetadata?: File;
	}>({});

	let debugResults = $state<any>(null);

	async function testUpload() {
		if (!files.metadata || !files.data) {
			alert('Please select metadata.json and data.csv files');
			return;
		}

		const formData = new FormData();
		formData.append('metadataFile', files.metadata);
		formData.append('dataFile', files.data);
		if (files.columnMetadata) {
			formData.append('columnMetadataFile', files.columnMetadata);
		}

		console.log('📤 Client-side file info before upload:', {
			metadata: {
				name: files.metadata.name,
				size: files.metadata.size,
				type: files.metadata.type,
				lastModified: files.metadata.lastModified
			},
			data: {
				name: files.data.name,
				size: files.data.size,
				type: files.data.type,
				lastModified: files.data.lastModified
			},
			columnMetadata: files.columnMetadata
				? {
						name: files.columnMetadata.name,
						size: files.columnMetadata.size,
						type: files.columnMetadata.type,
						lastModified: files.columnMetadata.lastModified
					}
				: null
		});

		try {
			const response = await fetch('/api/debug-upload', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			debugResults = result;
			console.log('📨 Server response:', result);
		} catch (error) {
			console.error('Upload failed:', error);
			alert('Upload failed: ' + error.message);
		}
	}
</script>

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-2xl font-bold">File Upload Debug Test</h1>

	<div class="space-y-4">
		<div>
			<label class="mb-2 block text-sm font-medium">Metadata File (metadata.json)</label>
			<input
				type="file"
				accept=".json"
				class="file-input file-input-bordered w-full"
				onchange={(e) => (files.metadata = e.target.files?.[0])}
			/>
		</div>

		<div>
			<label class="mb-2 block text-sm font-medium">Data File (data.csv)</label>
			<input
				type="file"
				accept=".csv"
				class="file-input file-input-bordered w-full"
				onchange={(e) => (files.data = e.target.files?.[0])}
			/>
		</div>

		<div>
			<label class="mb-2 block text-sm font-medium">Column Metadata File (optional)</label>
			<input
				type="file"
				accept=".json"
				class="file-input file-input-bordered w-full"
				onchange={(e) => (files.columnMetadata = e.target.files?.[0])}
			/>
		</div>

		<button class="btn btn-primary" onclick={testUpload} disabled={!files.metadata || !files.data}>
			Test Upload
		</button>
	</div>

	{#if debugResults}
		<div class="mt-8">
			<h2 class="mb-4 text-xl font-semibold">Debug Results</h2>
			<div class="bg-base-200 rounded-lg p-4">
				<pre class="overflow-auto text-sm">{JSON.stringify(debugResults, null, 2)}</pre>
			</div>
		</div>
	{/if}
</div>
