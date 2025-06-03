// test-faivor-integration.js
// Simple test script to verify FAIVOR backend integration

import { FaivorBackendAPI } from './src/lib/api/faivor-backend.js';

async function testFaivorIntegration() {
  console.log('Testing FAIVOR backend integration...');

  try {
    // Test 1: Health check
    console.log('\n1. Testing health check...');
    const health = await FaivorBackendAPI.healthCheck();
    console.log('✓ Health check passed:', health);

    console.log('\n2. FAIVOR backend is accessible and working!');

    // Note: For full CSV/model validation tests, we would need:
    // - Test files (metadata.json, data.csv)
    // - Running FAIVOR backend server
    // - Proper FAIR metadata format

    console.log('\nTo test folder validation:');
    console.log('1. Ensure FAIVOR backend is running at http://localhost:8000');
    console.log('2. Use the dashboard UI to upload a folder with metadata.json and data.csv');
    console.log('3. Check the browser console and network tab for API calls');

  } catch (error) {
    console.error('✗ FAIVOR integration test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure FAIVOR backend is running: docker-compose up faivor-backend');
    console.log('2. Check if http://localhost:8000 is accessible');
    console.log('3. Verify FAIVOR_BACKEND_URL environment variable if set');
  }
}

// Run the test
testFaivorIntegration();
