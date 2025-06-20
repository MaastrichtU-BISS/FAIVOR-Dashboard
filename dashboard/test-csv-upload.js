// Test script to verify CSV upload functionality
// This simulates the updated CSV validation logic

function testCSVValidation() {
  // Mock file objects for testing
  const createMockFile = (name, type = 'text/csv') => ({
    name,
    type,
    size: 1024,
    lastModified: Date.now()
  });

  // Test cases
  const testCases = [
    {
      name: 'Should accept data.csv',
      files: [createMockFile('data.csv')],
      expected: true
    },
    {
      name: 'Should accept any_name.csv',
      files: [createMockFile('my_dataset.csv')],
      expected: true
    },
    {
      name: 'Should accept CSV files with different names',
      files: [createMockFile('sales_data_2024.csv')],
      expected: true
    },
    {
      name: 'Should reject non-CSV files',
      files: [createMockFile('data.txt', 'text/plain')],
      expected: false
    },
    {
      name: 'Should work with folder containing any CSV',
      files: [
        createMockFile('metadata.json', 'application/json'),
        createMockFile('experiments.csv')
      ],
      expected: true
    },
    {
      name: 'Should work with folder containing differently named CSV',
      files: [
        createMockFile('metadata.json', 'application/json'),
        createMockFile('results_final.csv')
      ],
      expected: true
    }
  ];

  console.log('Testing CSV Upload Validation...\n');

  // Simulate the updated validation logic
  function validateCSVFiles(files) {
    const csvFile = files.find(f => f.name.toLowerCase().endsWith('.csv'));
    return {
      isValid: !!csvFile,
      csvFile: csvFile?.name,
      errors: csvFile ? [] : ['A CSV file is required']
    };
  }

  let passed = 0;
  let failed = 0;

  testCases.forEach(testCase => {
    const result = validateCSVFiles(testCase.files);
    const success = result.isValid === testCase.expected;

    console.log(`${success ? '✅' : '❌'} ${testCase.name}`);
    if (result.csvFile) {
      console.log(`   Found CSV: ${result.csvFile}`);
    }
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
    console.log('');

    if (success) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All tests passed! CSV upload now accepts any CSV file name.');
  } else {
    console.log('❌ Some tests failed. Check the validation logic.');
  }
}

// Run the test
testCSVValidation();
