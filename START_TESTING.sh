#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   FitFaat Stripe Payment Testing${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found:${NC} $(node --version)"
echo -e "${GREEN}✅ npm found:${NC} $(npm --version)\n"

# Check if MongoDB is running
echo -e "${BLUE}Checking MongoDB connection...${NC}"
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
        echo -e "${GREEN}✅ MongoDB is running${NC}\n"
    else
        echo -e "${YELLOW}⚠️  MongoDB may not be running. Start it with: mongod${NC}\n"
    fi
fi

# Terminal 1: Start Backend
echo -e "${BLUE}Starting Backend Server...${NC}"
echo -e "${YELLOW}Command: cd backend && npm run dev${NC}\n"

# Open new terminal for backend
osascript <<'APPLESCRIPT'
tell application "Terminal"
    do script "cd /Users/mc/Desktop/FitFaat/backend && npm run dev"
    set bounds of front window to {0, 0, 800, 600}
end tell
