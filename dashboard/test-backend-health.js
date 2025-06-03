// Simple health check for FAIVOR backend
async function testBackendHealth() {
  try {
    console.log('Testing FAIVOR backend health...');

    const response = await fetch('http://localhost:8000/');

    if (!response.ok) {
      console.error(`❌ Backend health check failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Backend is healthy:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to backend:', error.message);
    return false;
  }
}

// Test endpoint availability
async function testEndpoints() {
  const endpoints = [
    { path: '/', name: 'Health Check' },
    // Note: validate-csv and validate-model require POST with form data, so we can't test them easily here
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:8000${endpoint.path}`);
      console.log(`${endpoint.name}: ${response.ok ? '✅' : '❌'} (${response.status})`);
    } catch (error) {
      console.log(`${endpoint.name}: ❌ (${error.message})`);
    }
  }
}

async function main() {
  console.log('=== FAIVOR Backend Integration Test ===\n');

  const isHealthy = await testBackendHealth();

  if (isHealthy) {
    console.log('\n=== Testing Endpoints ===');
    await testEndpoints();
    console.log('\n✅ Backend is ready for integration!');
  } else {
    console.log('\n❌ Backend is not available. Make sure to start it with:');
    console.log('   cd FAIVOR-ML-Validator && docker build -t faivor-backend . && docker run -p 8000:8000 faivor-backend');
  }
}

main().catch(console.error);
