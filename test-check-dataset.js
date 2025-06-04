// Test script to verify the "Check the Data Set" functionality
// This tests the integration between frontend and FAIVOR backend

const API_BASE_URL = 'http://localhost:8000';

// Test 1: Health check
async function testHealthCheck() {
  console.log('🔍 Testing backend health check...');
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    const data = await response.json();
    console.log('✅ Backend health check successful:', data);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Test 2: CSV validation endpoint (simulating the "Check the Data Set" button)
async function testCSVValidation() {
  console.log('\n🔍 Testing CSV validation endpoint...');

  // Create sample metadata (JSON) in FAIRmodels format
  const sampleMetadata = {
    "General Model Information": {
      "Title": { "@value": "Test Model" },
      "Editor Note": { "@value": "Test model for validation" },
      "Created by": { "@value": "Test User" },
      "Contact email": { "@value": "test@example.com" },
      "FAIRmodels image name": { "@value": "test-model:latest" }
    },
    "Input data": [
      {
        "Input label": { "@value": "feature1" },
        "Description": { "@value": "First feature" },
        "Type of input": { "@value": "numeric" }
      },
      {
        "Input label": { "@value": "feature2" },
        "Description": { "@value": "Second feature" },
        "Type of input": { "@value": "numeric" }
      },
      {
        "Input label": { "@value": "feature3" },
        "Description": { "@value": "Third feature" },
        "Type of input": { "@value": "numeric" }
      }
    ],
    "Outcome label": { "@value": "target" }
  };

  // Create sample CSV content
  const csvContent = `feature1,feature2,feature3,target
1,2,3,0
4,5,6,1
7,8,9,0`;

  // Create FormData (simulating file upload)
  const formData = new FormData();
  formData.append('model_metadata', JSON.stringify(sampleMetadata));

  // Create a Blob to simulate CSV file
  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  formData.append('csv_file', csvBlob, 'test_data.csv');

  try {
    const response = await fetch(`${API_BASE_URL}/validate-csv/`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ CSV validation successful:', data);

    // Verify the response structure
    if (data.valid && data.csv_columns && data.model_input_columns) {
      console.log('✅ Response structure is correct');
      console.log(`   - CSV columns: ${data.csv_columns.join(', ')}`);
      console.log(`   - Model input columns: ${data.model_input_columns.join(', ')}`);
      return true;
    } else {
      console.log('⚠️  Response structure unexpected:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ CSV validation failed:', error.message);
    return false;
  }
}

// Test 3: CORS headers
async function testCORS() {
  console.log('\n🔍 Testing CORS headers...');
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });

    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    if (corsHeader) {
      console.log('✅ CORS headers present:', corsHeader);
      return true;
    } else {
      console.log('⚠️  CORS headers not found');
      return false;
    }
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Testing "Check the Data Set" functionality\n');

  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Backend is not accessible. Make sure it\'s running on localhost:8000');
    return;
  }

  const corsOk = await testCORS();
  const csvOk = await testCSVValidation();

  console.log('\n📊 Test Results:');
  console.log(`   Backend Health: ${healthOk ? '✅' : '❌'}`);
  console.log(`   CORS Support: ${corsOk ? '✅' : '❌'}`);
  console.log(`   CSV Validation: ${csvOk ? '✅' : '❌'}`);

  if (healthOk && corsOk && csvOk) {
    console.log('\n🎉 All tests passed! The "Check the Data Set" button should work correctly.');
    console.log('\n📝 How it works:');
    console.log('   1. User uploads folder with metadata.json and data.csv files');
    console.log('   2. User clicks "Check the dataset" button');
    console.log('   3. Frontend calls FaivorBackendAPI.validateCSV()');
    console.log('   4. Backend validates CSV against metadata and returns results');
    console.log('   5. Frontend displays success/error message with details');
  } else {
    console.log('\n⚠️  Some tests failed. Check the backend configuration.');
  }
}

// Run the tests
runTests().catch(console.error);
