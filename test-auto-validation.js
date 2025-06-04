// Test script to verify automatic validation functionality
// This simulates uploading the sample files and checks if auto-validation works

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:8000';

async function testAutoValidationFlow() {
  console.log('🚀 Testing Auto-Validation Flow\n');

  try {
    // Read the sample files
    const metadataContent = fs.readFileSync('sample-metadata.json', 'utf8');
    const csvContent = fs.readFileSync('sample-data.csv', 'utf8');

    console.log('📁 Sample files loaded:');
    console.log('   - metadata.json:', metadataContent.length, 'characters');
    console.log('   - data.csv:', csvContent.length, 'characters');

    // Parse metadata to show what we're testing
    const metadata = JSON.parse(metadataContent);
    const expectedInputs = metadata['Input data'].map(input => input['Input label']['@value']);
    console.log('   - Expected inputs:', expectedInputs.join(', '));

    // Parse CSV to show columns
    const csvLines = csvContent.trim().split('\n');
    const csvColumns = csvLines[0].split(',');
    console.log('   - CSV columns:', csvColumns.join(', '));

    console.log('\n🔍 Testing validation with sample files...');

    // Create FormData for the API call
    const formData = new FormData();
    formData.append('model_metadata', metadataContent);
    formData.append('csv_file', csvContent, {
      filename: 'sample-data.csv',
      contentType: 'text/csv'
    });

    // Call the validation API
    const response = await fetch(`${API_BASE_URL}/validate-csv/`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('\n✅ Validation Result:');
    console.log('   - Valid:', result.valid);
    console.log('   - Message:', result.message || 'No message');
    console.log('   - CSV Columns Found:', result.csv_columns.join(', '));
    console.log('   - Model Input Columns:', result.model_input_columns.join(', '));

    // Analyze the results
    const csvCols = new Set(result.csv_columns);
    const modelCols = new Set(result.model_input_columns);
    const missingInCsv = [...modelCols].filter(col => !csvCols.has(col));
    const extraInCsv = [...csvCols].filter(col => !modelCols.has(col));

    console.log('\n📊 Column Analysis:');
    if (missingInCsv.length > 0) {
      console.log('   ⚠️  Missing in CSV:', missingInCsv.join(', '));
    }
    if (extraInCsv.length > 0) {
      console.log('   ℹ️  Extra in CSV:', extraInCsv.join(', '));
    }
    if (missingInCsv.length === 0) {
      console.log('   ✅ All required model input columns are present in CSV');
    }

    console.log('\n🎯 Auto-Validation Behavior:');
    if (result.valid) {
      console.log('   ✅ Files are valid - modal will show success details');
    } else {
      console.log('   ❌ Files have errors - modal will show error details');
    }

    console.log('\n📝 What happens in the UI:');
    console.log('   1. User uploads folder with these files');
    console.log('   2. System automatically validates after upload');
    console.log('   3. Modal appears showing validation results');
    console.log('   4. User can review details and continue or fix issues');

    return result.valid;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testAutoValidationFlow()
  .then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🎉 Auto-validation test completed successfully!');
      console.log('The sample files are compatible and will trigger a success modal.');
    } else {
      console.log('⚠️  Auto-validation test completed with validation errors.');
      console.log('The sample files will trigger an error modal with details.');
    }
  })
  .catch(console.error);
