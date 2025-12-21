/**
 * Test script for isDatasetQuery() implementation
 * Tests the new dataset query filtering in geminiService.js
 */

import { processAIChat } from './src/services/geminiService.js';

const testCases = [
  {
    message: 'How many calories in biryani?',
    expectDataset: true,
    description: 'Dataset query - calories'
  },
  {
    message: 'What is the protein in chicken?',
    expectDataset: true,
    description: 'Dataset query - protein'
  },
  {
    message: 'How much hydration water should I drink?',
    expectDataset: true,
    description: 'Dataset query - hydration/water'
  },
  {
    message: 'What are the carbs in rice?',
    expectDataset: true,
    description: 'Dataset query - carbs'
  },
  {
    message: 'Tell me about fat content in oil',
    expectDataset: true,
    description: 'Dataset query - fat'
  },
  {
    message: 'Is biryani healthy?',
    expectDataset: false,
    description: 'Non-dataset query - health assessment'
  },
  {
    message: 'What should I eat for a healthy diet?',
    expectDataset: false,
    description: 'Non-dataset query - diet advice'
  },
  {
    message: 'Tell me about food combinations',
    expectDataset: false,
    description: 'Non-dataset query - food combinations'
  },
  {
    message: 'Hi there!',
    expectDataset: false,
    description: 'Greeting (non-dataset)'
  },
  {
    message: 'What is 2+2?',
    expectDataset: false,
    description: 'Out of scope (non-dataset)'
  }
];

async function runTests() {
  console.log('🧪 TESTING isDatasetQuery() IMPLEMENTATION\n');
  console.log('═'.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const response = await processAIChat(testCase.message, `test-${Date.now()}`);
      
      // Determine if it was a dataset query based on the response source
      const isDatasetQuery = response.source === 'dataset' || 
                            (response.source === 'system' && 
                             response.content.includes('I can provide calories, protein, fat, carbs'));
      
      const matchesExpectation = 
        (testCase.expectDataset && response.source === 'dataset') ||
        (!testCase.expectDataset && response.source !== 'dataset');

      const status = matchesExpectation ? '✅ PASS' : '❌ FAIL';
      
      if (matchesExpectation) {
        passed++;
      } else {
        failed++;
      }

      console.log(`\n${status} | ${testCase.description}`);
      console.log(`   Input: "${testCase.message}"`);
      console.log(`   Expected Dataset: ${testCase.expectDataset} | Got: ${response.source === 'dataset' ? 'yes' : 'no'}`);
      console.log(`   Source: ${response.source}`);
      console.log(`   Response: ${response.content.substring(0, 60)}...`);
      
    } catch (error) {
      failed++;
      console.log(`\n❌ FAIL | ${testCase.description}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`\n📊 TEST RESULTS: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! The isDatasetQuery() implementation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
}

// Run tests
runTests().catch(console.error);
