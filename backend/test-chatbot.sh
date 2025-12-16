#!/bin/bash

# AI Chatbot Integration Test Script
# Tests the health-only AI chatbot endpoints

echo "🚀 FitFaat AI Chatbot Test Script"
echo "=================================="
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

echo "📝 Testing AI Chatbot Endpoints..."
echo ""

# Test 1: Send food-related message
echo "1️⃣  Testing food query (should use food dataset)..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many calories in chicken breast?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 2: Send exercise-related message
echo "2️⃣  Testing exercise query (should use exercise dataset)..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What exercises work the biceps?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 3: Send general health question (should use Gemini AI)
echo "3️⃣  Testing general health query (should use Gemini AI)..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How much water should I drink daily?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 4: Send non-health question (should be rejected)
echo "4️⃣  Testing non-health query (should be rejected)..."
curl -X POST "$BASE_URL/api/chatbot/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather today?"}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 5: Get chat history
echo "5️⃣  Getting chat history..."
curl -X GET "$BASE_URL/api/chatbot/history?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 6: Get chat statistics
echo "6️⃣  Getting chat statistics..."
curl -X GET "$BASE_URL/api/chatbot/stats" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 7: Get chat sessions
echo "7️⃣  Getting chat sessions..."
curl -X GET "$BASE_URL/api/chatbot/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
echo ""
echo "---"
echo ""

echo "✅ All tests completed!"
echo ""
echo "📊 Check the responses above to verify:"
echo "   - Food queries return dataset responses"
echo "   - Exercise queries return dataset responses"
echo "   - General health queries use Gemini AI"
echo "   - Non-health queries are politely rejected"
echo ""
