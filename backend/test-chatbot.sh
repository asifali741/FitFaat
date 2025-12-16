#!/bin/bash

# NUTRITION-ONLY Chatbot Test Script
# Tests the nutrition-focused chatbot with strict scope validation

echo "🚀 FitFaat Nutrition Chatbot Test Script"
echo "========================================"
echo ""

# Configuration
BASE_URL="http://localhost:5001"
TOKEN="" # Add your JWT token here

# Check if token is set
if [ -z "$TOKEN" ]; then
    echo "❌ Error: Please set your JWT token in this script"
    echo "   Get token by logging in: POST /api/auth/login"
    exit 1
fi

echo "📝 Testing Nutrition Chatbot..."
echo ""

# Test 1: Greeting
echo "1️⃣  Testing greeting..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 2: Natural language food query
echo "2️⃣  Testing natural language: 'I am going to eat Chicken Tandoori Roll'..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "I am going to eat Chicken Tandoori Roll"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 3: Specific nutrient query
echo "3️⃣  Testing specific nutrient: 'How much protein in chicken roll?'..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How much protein in chicken roll?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 4: Calorie query
echo "4️⃣  Testing calorie query: 'Tell me calories in biryani'..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me calories in biryani"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 5: Out-of-scope query (exercise)
echo "5️⃣  Testing out-of-scope (exercise - should be rejected)..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What exercises work the biceps?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 6: Out-of-scope query (general)
echo "6️⃣  Testing out-of-scope (general - should be rejected)..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather today?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 7: Food not in dataset
echo "7️⃣  Testing food not in dataset..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many calories in xyz123 food?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Get chat history
echo "8️⃣  Getting chat history..."
curl -X GET "$BASE_URL/api/chatbot/history" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
echo ""
echo "---"
echo ""

echo "✅ All tests completed!"
echo ""
echo "Expected Results:"
echo "1. Greeting → Warm nutrition assistant greeting"
echo "2. Natural language → Full nutrition breakdown from dataset"
echo "3. Specific nutrient → Single protein value"
echo "4. Calorie query → Calorie information from dataset"
echo "5. Exercise query → Polite rejection (nutrition-only)"
echo "6. General query → Polite rejection (nutrition-only)"
echo "7. Unknown food → 'I don't have nutritional data for this food yet'"
echo "8. History → List of all messages"
echo ""