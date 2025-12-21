/**
 * Interactive Chatbot Test Script
 * Tests processAIChat() with sample questions and logs responses
 * Simulates conversation context using single sessionId
 */

import { processAIChat, getSessionHistory, getAnalytics } from './src/services/geminiService.js';

const sessionId = 'test-session-001';

const testQuestions = [
  "I am gonna eat biryani, how many calories will I get?",
  "How can I lose weight?",
  "How can I gain weight?",
  "How much protein is in chicken tandoori?",
  "How many carbs are in a bowl of rice?",
  "What is the hydration level of orange juice?",
  "Tell me about vitamins in spinach",
  "I want to improve my sleep quality, any tips?",
  "Can you suggest post-workout nutrition?",
  "What can I eat to increase my energy levels?"
];

async function runTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('🤖 FITFAAT CHATBOT INTERACTIVE TEST');
  console.log('═'.repeat(80));
  console.log(`📍 Session ID: ${sessionId}`);
  console.log(`📊 Total Questions: ${testQuestions.length}`);
  console.log('═'.repeat(80) + '\n');

  const responses = [];
  let datasetHits = 0;
  let healthQueries = 0;
  let guidanceMessages = 0;

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    
    try {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📌 Question ${i + 1}/${testQuestions.length}`);
      console.log(`─`.repeat(80));
      
      const startTime = Date.now();
      const response = await processAIChat(question, sessionId);
      const endTime = Date.now();

      // Track response types
      if (response.source === 'dataset') {
        datasetHits++;
      } else if (response.source === 'health-dataset') {
        healthQueries++;
      } else if (response.content.includes('I can provide calories')) {
        guidanceMessages++;
      }

      // Log question
      console.log(`\n💬 QUESTION:\n   "${question}"`);

      // Log response
      console.log(`\n🤖 RESPONSE:\n   ${response.content}`);

      // Log metadata
      console.log(`\n📊 METADATA:`);
      console.log(`   Source: ${response.source}`);
      console.log(`   Processing Time: ${response.processingTime}ms`);
      console.log(`   Session ID: ${response.sessionId}`);

      responses.push({
        question,
        response: response.content,
        source: response.source,
        processingTime: response.processingTime,
        sessionId: response.sessionId
      });

    } catch (error) {
      console.error(`\n❌ ERROR on Question ${i + 1}:`);
      console.error(`   ${error.message}`);
      responses.push({
        question,
        error: error.message,
        source: 'error'
      });
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(80));
  console.log('📈 TEST SUMMARY');
  console.log('═'.repeat(80));

  console.log(`\n✅ Total Questions Processed: ${testQuestions.length}`);
  console.log(`   🍽️  Dataset Hits: ${datasetHits}`);
  console.log(`   🏥 Health Queries: ${healthQueries}`);
  console.log(`   ℹ️  Guidance Messages: ${guidanceMessages}`);
  console.log(`   ❌ Errors: ${responses.filter(r => r.source === 'error').length}`);

  // Session history
  console.log(`\n📝 CONVERSATION HISTORY:`);
  const history = getSessionHistory(sessionId);
  console.log(`   Total Messages: ${history.length}`);
  history.forEach((msg, idx) => {
    const role = msg.role === 'user' ? '👤' : '🤖';
    const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
    console.log(`   ${idx + 1}. ${role} ${preview}`);
  });

  // Analytics
  console.log(`\n📊 ANALYTICS (Last 24 hours):`);
  const analytics = getAnalytics(24);
  console.log(`   Queries by Type:`);
  Object.entries(analytics.byType).forEach(([type, count]) => {
    console.log(`     • ${type}: ${count}`);
  });

  console.log(`\n   Queries by Source:`);
  Object.entries(analytics.bySource).forEach(([source, count]) => {
    console.log(`     • ${source}: ${count}`);
  });

  console.log(`\n   Queries by Status:`);
  Object.entries(analytics.byStatus).forEach(([status, count]) => {
    console.log(`     • ${status}: ${count}`);
  });

  if (analytics.notFound && analytics.notFound.length > 0) {
    console.log(`\n   ⚠️  Not Found Queries:`);
    analytics.notFound.slice(0, 5).forEach(query => {
      console.log(`     • "${query.query}"`);
    });
  }

  // Timing statistics
  console.log(`\n⏱️  TIMING STATISTICS:`);
  const times = responses
    .filter(r => r.processingTime)
    .map(r => r.processingTime);
  
  if (times.length > 0) {
    const avgTime = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`   Average Response Time: ${avgTime}ms`);
    console.log(`   Fastest Response: ${minTime}ms`);
    console.log(`   Slowest Response: ${maxTime}ms`);
  }

  // Dataset keyword analysis
  console.log(`\n🔍 DATASET KEYWORD ANALYSIS:`);
  const datasetQuestions = testQuestions.filter(q => {
    const keywords = ['calorie', 'calories', 'protein', 'carb', 'carbs', 'fat', 'hydration', 'water'];
    return keywords.some(k => q.toLowerCase().includes(k));
  });
  console.log(`   Questions with dataset keywords: ${datasetQuestions.length}`);
  console.log(`   Expected database hits: ${datasetQuestions.length}`);
  console.log(`   Actual database hits: ${datasetHits}`);
  console.log(`   Match Rate: ${((datasetHits / datasetQuestions.length) * 100).toFixed(1)}%`);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TEST COMPLETE');
  console.log('═'.repeat(80) + '\n');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
