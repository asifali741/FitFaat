#!/bin/bash

# Test Clarifai Food Detection API
# Usage: ./test-food-detection.sh

echo "🧪 Testing Clarifai Food Detection API"
echo "======================================="
echo ""

BASE_URL="http://localhost:5001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing Server Health..."
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/user/health 2>/dev/null)
if [ "$response" != "000" ]; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running on port 5001${NC}"
    echo "   Start server with: cd backend && npm run dev"
    exit 1
fi
echo ""

# Test 2: Food Detection from URL
echo "2️⃣  Testing Food Detection (URL method)..."
echo "   Sending request to /api/food-detect..."

response=$(curl -s -X POST $BASE_URL/api/food-detect \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
  }')

if echo "$response" | grep -q "success"; then
    echo -e "${GREEN}✓ Food detection successful${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo -e "${RED}✗ Food detection failed${NC}"
    echo "$response"
fi
echo ""

# Test 3: Food Detection from Upload (requires sample image)
echo "3️⃣  Testing Food Detection (Upload method)..."
if [ -f "test-food.jpg" ]; then
    echo "   Uploading test-food.jpg..."
    response=$(curl -s -X POST $BASE_URL/api/food-detect/upload \
      -F "image=@test-food.jpg")
    
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✓ Image upload and detection successful${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo -e "${RED}✗ Upload detection failed${NC}"
        echo "$response"
    fi
else
    echo -e "${YELLOW}⚠ Skipping upload test (test-food.jpg not found)${NC}"
    echo "   To test upload: Place a food image as 'test-food.jpg' in this directory"
fi
echo ""

# Summary
echo "======================================="
echo "✅ Testing Complete"
echo ""
echo "📚 Documentation:"
echo "   - Backend README: backend/README.md"
echo "   - Clarifai Guide: CLARIFAI_FOOD_DETECTION.md"
echo ""
echo "🚀 API Endpoints:"
echo "   - POST $BASE_URL/api/food-detect"
echo "   - POST $BASE_URL/api/food-detect/upload"
