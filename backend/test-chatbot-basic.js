/**
 * Basic Chatbot Test Script
 * Simple version for quick testing
 */

import { processAIChat } from './src/services/geminiService.js';

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

(async () => {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🤖 CHATBOT TEST START");
  console.log("═══════════════════════════════════════════════════════════════\n");

  for (let i = 0; i < testQuestions.length; i++) {
    const q = testQuestions[i];
    try {
      const res = await processAIChat(q, sessionId);
      console.log(`\n📌 Question ${i + 1}/${testQuestions.length}`);
      console.log(`💬 "${q}"`);
      console.log(`🤖 ${res.content}`);
      console.log(`📊 Source: ${res.source} | Time: ${res.processingTime}ms`);
      console.log("─".repeat(70));
    } catch (error) {
      console.log(`\n❌ Error on question ${i + 1}: ${error.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("✅ CHATBOT TEST END");
  console.log("═══════════════════════════════════════════════════════════════\n");
})();
