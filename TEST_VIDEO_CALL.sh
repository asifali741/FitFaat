#!/bin/bash

# Video Call Feature - Quick Start Test Script
# This script helps verify the video call implementation

echo "========================================="
echo "   VIDEO CALL FEATURE - QUICK TEST"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Backend Check${NC}"
echo "Checking if backend is running..."
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Backend is running on port 5001${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo "Please start backend first:"
    echo "  cd backend && npm start"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 2: File Verification${NC}"
echo "Verifying new files exist..."

FILES=(
    "components/VideoCallButton.tsx"
    "components/IncomingCallModal.tsx"
    "hooks/useVideoCall.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file NOT FOUND${NC}"
        exit 1
    fi
done
echo ""

echo -e "${YELLOW}Step 3: Updated Files Check${NC}"
echo "Verifying updated files..."

UPDATED_FILES=(
    "components/AppointmentChat.tsx"
    "backend/src/socket/chatSocket.js"
)

for file in "${UPDATED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file NOT FOUND${NC}"
        exit 1
    fi
done
echo ""

echo -e "${YELLOW}Step 4: Testing Checklist${NC}"
echo "==========================================="
echo ""
echo "Manual Testing Steps:"
echo ""
echo "1️⃣  Create/Open an Appointment Chat"
echo "   - Navigate to appointment chat screen"
echo "   - Ensure chat access is granted"
echo ""
echo "2️⃣  Verify Video Call Button"
echo "   - Check button appears in chat header"
echo "   - Verify button is enabled (blue/accent color)"
echo "   - If disabled, check chat access status"
echo ""
echo "3️⃣  Test Call Initiation"
echo "   - Click video call button"
echo "   - Check Socket.IO console logs:"
echo "     📞 Call initiated by [role] in session [id]"
echo "     ✅ Call notification sent to other users"
echo ""
echo "4️⃣  Test Incoming Call Modal"
echo "   - On receiver side, modal should appear"
echo "   - Shows caller name and role"
echo "   - Accept/Reject buttons visible"
echo ""
echo "5️⃣  Test Call Acceptance"
echo "   - Click Accept button"
echo "   - Both users navigate to VideoCallScreen"
echo "   - Video/audio should be active"
echo ""
echo "6️⃣  Test Call Rejection"
echo "   - Click Reject button"
echo "   - Caller receives alert: 'Call declined'"
echo "   - Modal closes for receiver"
echo ""
echo "7️⃣  Test Call End"
echo "   - Click hang up in video screen"
echo "   - Both users return to chat"
echo "   - Video call button re-enabled"
echo ""
echo "8️⃣  Test Disabled States"
echo "   - Chat access not granted → button disabled"
echo "   - Chat expired → button disabled"
echo "   - Call in progress → button disabled"
echo ""
echo "==========================================="
echo ""

echo -e "${YELLOW}Step 5: Backend Socket Events to Monitor${NC}"
echo "==========================================="
echo ""
echo "Watch these events in backend console:"
echo "  📞 call:initiate"
echo "  ✅ call:accept"
echo "  ❌ call:reject"
echo "  📴 call:end"
echo "  📨 call:incoming"
echo "  ✅ call:accepted"
echo "  ❌ call:rejected"
echo "  📴 call:ended"
echo ""

echo -e "${YELLOW}Step 6: Frontend Console Events${NC}"
echo "==========================================="
echo ""
echo "Watch these in Expo logs:"
echo "  📞 Incoming call from: [name]"
echo "  ✅ Call accepted by receiver"
echo "  ❌ Call rejected: [reason]"
echo "  📴 Call ended: [reason]"
echo "  📞 Initiating call to: [name]"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}     Setup Verification Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next Steps:"
echo "1. Start Expo app: npx expo start"
echo "2. Open on TWO devices/emulators"
echo "3. Login as User and Doctor"
echo "4. Navigate to same appointment chat"
echo "5. Follow testing checklist above"
echo ""
echo "📖 Full Documentation:"
echo "   VIDEO_CALL_IMPLEMENTATION.md"
echo ""
