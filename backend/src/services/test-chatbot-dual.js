/**
 * Integration Test Suite for Dual-Purpose Chatbot
 * Tests nutrition, health, and edge cases
 * 
 * Run: node backend/src/services/test-chatbot-dual.js
 */

import { searchHealthDataset } from '../constants/healthDataset.js';
import {
    detectHealthCategory,
    isHealthQuery,
    isNutritionQuery,
    isRestrictedMedicalQuery
} from '../utils/healthDetection.js';
import { processAIChat } from './geminiService.js';

// Color formatting for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test cases
const testCases = [
  // GREETINGS
  { input: "Hi", type: "greeting", expectedType: "system" },
  { input: "Hello! How are you?", type: "greeting", expectedType: "system" },
  { input: "Thanks!", type: "greeting", expectedType: "system" },
  
  // NUTRITION - FOOD QUERIES
  { input: "How many calories in biryani?", type: "nutrition", expectedType: "dataset" },
  { input: "Tell me calories of chicken", type: "nutrition", expectedType: "dataset" },
  { input: "I'm going to eat rice", type: "nutrition", expectedType: "dataset" },
  { input: "How much protein in egg?", type: "nutrition", expectedType: "dataset" },
  
  // NUTRITION - NOT FOUND
  { input: "Calories in pizza", type: "nutrition", expectedType: "system" },
  { input: "Nutrition of moon rocks", type: "nutrition", expectedType: "system" },
  
  // HEALTH - ALLOWED TOPICS
  { input: "How can I improve my sleep?", type: "health", category: "sleep", expectedType: "health-dataset" },
  { input: "How much water should I drink?", type: "health", category: "hydration", expectedType: "health-dataset" },
  { input: "Tips for exercise", type: "health", category: "fitness", expectedType: "health-dataset" },
  { input: "What are vitamin D sources?", type: "health", category: "vitamins", expectedType: "health-dataset" },
  { input: "How to manage stress?", type: "health", category: "mental", expectedType: "health-dataset" },
  { input: "Tips for healthy living", type: "health", category: "wellness", expectedType: "health-dataset" },
  
  // HEALTH - RESTRICTED MEDICAL
  { input: "I have diabetes, what should I do?", type: "health-restricted", expectedType: "system" },
  { input: "What medicine for headache?", type: "health-restricted", expectedType: "system" },
  { input: "I'm pregnant, what should I eat?", type: "health-restricted", expectedType: "system" },
  { input: "Can you diagnose my chest pain?", type: "health-restricted", expectedType: "system" },
  
  // OUT OF SCOPE
  { input: "What's the weather?", type: "out-of-scope", expectedType: "system" },
  { input: "Tell me a joke", type: "out-of-scope", expectedType: "system" },
  { input: "What's the capital of France?", type: "out-of-scope", expectedType: "system" },
];

// Unit tests for detection functions
async function runDetectionTests() {
  log('\n=== DETECTION FUNCTION TESTS ===\n', 'cyan');
  
  let passed = 0;
  let failed = 0;
  
  // Test isNutritionQuery
  const nutritionTestCases = [
    { msg: "How many calories in biryani?", expected: true },
    { msg: "I'm eating chicken", expected: true },
    { msg: "What's the weather?", expected: false },
    { msg: "How to manage stress?", expected: false }
  ];
  
  log('Testing isNutritionQuery():', 'blue');
  nutritionTestCases.forEach(tc => {
    const result = isNutritionQuery(tc.msg);
    if (result === tc.expected) {
      log(`  ✅ "${tc.msg}" → ${result}`, 'green');
      passed++;
    } else {
      log(`  ❌ "${tc.msg}" → ${result} (expected ${tc.expected})`, 'red');
      failed++;
    }
  });
  
  // Test isHealthQuery
  const healthTestCases = [
    { msg: "How to improve sleep?", expected: true },
    { msg: "Tips for exercise", expected: true },
    { msg: "What's the weather?", expected: false },
    { msg: "How many calories?", expected: false } // This is nutrition, not health-exclusive
  ];
  
  log('\nTesting isHealthQuery():', 'blue');
  healthTestCases.forEach(tc => {
    const result = isHealthQuery(tc.msg);
    if (result === tc.expected) {
      log(`  ✅ "${tc.msg}" → ${result}`, 'green');
      passed++;
    } else {
      log(`  ❌ "${tc.msg}" → ${result} (expected ${tc.expected})`, 'red');
      failed++;
    }
  });
  
  // Test isRestrictedMedicalQuery
  const restrictedTestCases = [
    { msg: "I have diabetes", expected: true },
    { msg: "What medicine for pain?", expected: true },
    { msg: "How to exercise safely?", expected: false },
    { msg: "Sleep tips", expected: false }
  ];
  
  log('\nTesting isRestrictedMedicalQuery():', 'blue');
  restrictedTestCases.forEach(tc => {
    const result = isRestrictedMedicalQuery(tc.msg);
    if (result === tc.expected) {
      log(`  ✅ "${tc.msg}" → ${result}`, 'green');
      passed++;
    } else {
      log(`  ❌ "${tc.msg}" → ${result} (expected ${tc.expected})`, 'red');
      failed++;
    }
  });
  
  // Test detectHealthCategory
  const categoryTestCases = [
    { msg: "How to improve sleep?", expected: "sleep" },
    { msg: "How much water to drink?", expected: "hydration" },
    { msg: "Tips for gym workout", expected: "fitness" },
    { msg: "Vitamin D sources", expected: "vitamins" },
    { msg: "Manage anxiety", expected: "mental" },
    { msg: "Healthy lifestyle tips", expected: "wellness" }
  ];
  
  log('\nTesting detectHealthCategory():', 'blue');
  categoryTestCases.forEach(tc => {
    const result = detectHealthCategory(tc.msg);
    if (result === tc.expected) {
      log(`  ✅ "${tc.msg}" → ${result}`, 'green');
      passed++;
    } else {
      log(`  ❌ "${tc.msg}" → ${result} (expected ${tc.expected})`, 'red');
      failed++;
    }
  });
  
  log(`\nDetection Tests Summary: ${passed} passed, ${failed} failed\n`, failed === 0 ? 'green' : 'red');
  return { passed, failed };
}

// Integration tests for main chatbot
async function runChatbotTests() {
  log('\n=== CHATBOT INTEGRATION TESTS ===\n', 'cyan');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases.slice(0, 6)) { // Sample of tests
    log(`Testing: "${testCase.input}"`, 'blue');
    
    try {
      const response = await processAIChat(testCase.input);
      
      if (response.source === testCase.expectedType) {
        log(`  ✅ Got expected source: ${response.source}`, 'green');
        log(`  Response preview: ${response.content.substring(0, 60)}...`, 'yellow');
        passed++;
      } else {
        log(`  ❌ Got ${response.source}, expected ${testCase.expectedType}`, 'red');
        failed++;
      }
    } catch (error) {
      log(`  ❌ Error: ${error.message}`, 'red');
      failed++;
    }
    log('');
  }
  
  log(`Chatbot Tests Summary: ${passed} passed, ${failed} failed\n`, failed === 0 ? 'green' : 'red');
  return { passed, failed };
}

// Health dataset lookup test
async function runHealthDatasetTests() {
  log('\n=== HEALTH DATASET TESTS ===\n', 'cyan');
  
  let passed = 0;
  let failed = 0;
  
  const categories = ['sleep', 'hydration', 'fitness', 'vitamins', 'mental', 'wellness'];
  
  log('Testing health dataset lookups:', 'blue');
  categories.forEach(category => {
    const result = searchHealthDataset(category);
    if (result && result.info) {
      log(`  ✅ "${category}" found in dataset`, 'green');
      log(`     Info length: ${result.info.length} characters`, 'yellow');
      passed++;
    } else {
      log(`  ❌ "${category}" not found in dataset`, 'red');
      failed++;
    }
  });
  
  log(`\nHealth Dataset Tests Summary: ${passed} passed, ${failed} failed\n`, failed === 0 ? 'green' : 'red');
  return { passed, failed };
}

// Main test runner
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     DUAL-PURPOSE CHATBOT TEST SUITE                      ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    const detectionResults = await runDetectionTests();
    const healthDatasetResults = await runHealthDatasetTests();
    const chatbotResults = await runChatbotTests();
    
    const totalPassed = detectionResults.passed + healthDatasetResults.passed + chatbotResults.passed;
    const totalFailed = detectionResults.failed + healthDatasetResults.failed + chatbotResults.failed;
    
    log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    FINAL SUMMARY                          ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
    log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`, totalFailed === 0 ? 'green' : 'red');
    
    if (totalFailed === 0) {
      log('\n✅ ALL TESTS PASSED! Ready for production.\n', 'green');
    } else {
      log(`\n⚠️  ${totalFailed} test(s) failed. Please review.\n`, 'red');
    }
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}\n`, 'red');
    console.error(error);
  }
}

// Run tests
runAllTests();

export { runAllTests, runChatbotTests, runDetectionTests, runHealthDatasetTests };

