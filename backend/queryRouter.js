/**
 * Smart Query Router for FitFaat Chatbot
 * Routes queries to either dataset endpoint or general chatbot based on keywords
 */

/**
 * Check if query contains dataset-specific keywords
 * @param {string} query - User query to check
 * @returns {boolean} - True if query contains dataset keywords
 */
function hasDatasetKeywords(query) {
  const datasetKeywords = ['calories', 'protein', 'fat', 'carbs', 'hydration'];
  const lowerQuery = query.toLowerCase();
  return datasetKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Mock function: Send query to dataset endpoint
 * In production, this would call your actual dataset API
 * @param {string} query - User query
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} - Response from dataset endpoint
 */
async function sendToDatasetEndpoint(query, sessionId) {
  // Simulate API call
  console.log(`  📊 Sending to Dataset Endpoint...`);
  
  // Mock response (in production, this would hit your actual endpoint)
  const mockResponse = {
    source: 'dataset',
    content: `[Dataset Response] Found nutrition information for your query about "${query.substring(0, 30)}..."`,
    sessionId,
    timestamp: new Date().toISOString(),
    processingTime: Math.random() * 100 + 20 // 20-120ms
  };
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, mockResponse.processingTime));
  
  return mockResponse;
}

/**
 * Mock function: Send query to general chatbot
 * In production, this would call your Gemini API or general chatbot service
 * @param {string} query - User query
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} - Response from general chatbot
 */
async function sendToGeneralChatbot(query, sessionId) {
  // Simulate API call
  console.log(`  🤖 Sending to General Chatbot...`);
  
  // Mock response (in production, this would hit your actual chatbot)
  const mockResponse = {
    source: 'chatbot',
    content: `[Chatbot Response] I can help with that. Regarding "${query.substring(0, 30)}...", here's what I know...`,
    sessionId,
    timestamp: new Date().toISOString(),
    processingTime: Math.random() * 200 + 50 // 50-250ms
  };
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, mockResponse.processingTime));
  
  return mockResponse;
}

/**
 * Main Router Function
 * Routes health/nutrition queries to appropriate endpoint
 * @param {string} query - User question/query
 * @param {string} sessionId - Session identifier for conversation tracking
 * @returns {Promise<Object>} - Response with source, content, and metadata
 */
async function routeQuery(query, sessionId = 'default') {
  try {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📝 Query: "${query}"`);
    console.log(`🔑 Session ID: ${sessionId}`);
    
    // Check if query has dataset keywords
    const hasKeywords = hasDatasetKeywords(query);
    
    if (hasKeywords) {
      console.log(`✅ Dataset keywords detected`);
      const response = await sendToDatasetEndpoint(query, sessionId);
      console.log(`✨ Response: ${response.content}`);
      console.log(`⏱️  Processing Time: ${response.processingTime.toFixed(2)}ms`);
      console.log(`📌 Source: ${response.source}`);
      return response;
    } else {
      console.log(`❌ No dataset keywords - routing to general chatbot`);
      const response = await sendToGeneralChatbot(query, sessionId);
      console.log(`✨ Response: ${response.content}`);
      console.log(`⏱️  Processing Time: ${response.processingTime.toFixed(2)}ms`);
      console.log(`📌 Source: ${response.source}`);
      return response;
    }
    
  } catch (error) {
    console.error(`❌ Error processing query: ${error.message}`);
    return {
      source: 'error',
      content: `Error: ${error.message}`,
      sessionId,
      error: true
    };
  }
}

/**
 * Test the routing function with sample questions
 */
async function testRouter() {
  console.log('═'.repeat(80));
  console.log('🧪 FITFAAT QUERY ROUTER TEST');
  console.log('═'.repeat(80));
  console.log(`\n📋 Testing query routing with dataset and general chatbot endpoints\n`);

  // Test array with 10 example health and nutrition questions
  const testQuestions = [
    // Dataset queries (contain keywords)
    "How many calories are in a plate of biryani?",
    "What's the protein content in chicken tandoori?",
    "How much fat is in a bowl of ghee rice?",
    "What are the carbs in one roti?",
    "How much hydration does drinking water provide?",
    
    // General queries (no specific keywords)
    "Is biryani a healthy meal option?",
    "What's the best way to maintain a balanced diet?",
    "Can you give me tips on healthy eating habits?",
    "How should I plan my meals for the week?",
    "What are some easy healthy recipes I can make?"
  ];

  const sessionId = 'test-router-session-001';
  const results = [];

  // Process each question
  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    try {
      const response = await routeQuery(question, sessionId);
      results.push({
        index: i + 1,
        question,
        source: response.source,
        hasKeywords: hasDatasetKeywords(question),
        processingTime: response.processingTime,
        success: !response.error
      });
    } catch (error) {
      results.push({
        index: i + 1,
        question,
        source: 'error',
        success: false,
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));

  console.log(`\n✅ Total Questions Processed: ${testQuestions.length}`);
  console.log(`   ✓ Dataset Endpoint: ${results.filter(r => r.source === 'dataset').length} queries`);
  console.log(`   ✓ General Chatbot: ${results.filter(r => r.source === 'chatbot').length} queries`);
  console.log(`   ✗ Errors: ${results.filter(r => !r.success).length}`);

  // Detailed results table
  console.log(`\n📋 DETAILED RESULTS:\n`);
  console.log(`${'#'.padEnd(4)} | ${'Question'.padEnd(45)} | ${'Route'.padEnd(12)} | ${'Keywords'.padEnd(8)} | ${'Status'.padEnd(8)}`);
  console.log('─'.repeat(85));

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const keywords = result.hasKeywords ? '✓' : '✗';
    const route = result.source === 'dataset' ? '📊 Dataset' : result.source === 'chatbot' ? '🤖 Chatbot' : '❌ Error';
    const questionPreview = result.question.substring(0, 45).padEnd(45);
    
    console.log(`${String(result.index).padEnd(4)} | ${questionPreview} | ${route.padEnd(12)} | ${keywords.padEnd(8)} | ${status.padEnd(8)}`);
  });

  // Statistics
  console.log(`\n⏱️  PERFORMANCE STATISTICS:`);
  const times = results.filter(r => r.processingTime).map(r => r.processingTime);
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`   Average Response Time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Fastest Response: ${minTime.toFixed(2)}ms`);
    console.log(`   Slowest Response: ${maxTime.toFixed(2)}ms`);
  }

  // Dataset keyword analysis
  console.log(`\n🔍 KEYWORD DETECTION ANALYSIS:`);
  const datasetQueries = results.filter(r => r.hasKeywords);
  const routedToDataset = results.filter(r => r.source === 'dataset');
  
  console.log(`   Questions with keywords: ${datasetQueries.length}/10`);
  console.log(`   Routed to dataset: ${routedToDataset.length}/10`);
  console.log(`   Accuracy: ${((routedToDataset.length / datasetQueries.length) * 100).toFixed(1)}%`);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TEST COMPLETE');
  console.log('═'.repeat(80) + '\n');

  return results;
}

// Export functions for use in other modules
export { routeQuery, hasDatasetKeywords, sendToDatasetEndpoint, sendToGeneralChatbot };

// Run tests if this file is executed directly
testRouter().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
