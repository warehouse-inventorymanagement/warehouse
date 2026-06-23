#!/bin/bash
#
# Warehouse - Build Script
# Builds frontend and backend for production
#
# Usage: ./scripts/build.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Required Node.js version
REQUIRED_NODE_VERSION=20

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Warehouse - Production Build${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_CURRENT=$(node -v)
    NODE_MAJOR=$(echo "$NODE_CURRENT" | cut -d'.' -f1 | tr -d 'v')

    if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_VERSION" ]; then
        echo -e "${RED}Error: Node.js $NODE_CURRENT is installed but v${REQUIRED_NODE_VERSION}+ is required${NC}"
        echo -e "${YELLOW}Please upgrade Node.js: https://nodejs.org/${NC}"
        echo -e "${YELLOW}Or run: curl -fsSL https://deb.nodesource.com/setup_${REQUIRED_NODE_VERSION}.x | sudo -E bash - && sudo apt install -y nodejs${NC}"
        exit 1
    fi
    echo -e "Node.js version: ${GREEN}$NODE_CURRENT${NC}"
else
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build backend
echo -e "${YELLOW}Building backend...${NC}"
cd backend
npm run build
cd ..
echo -e "${GREEN}✓ Backend built successfully${NC}"

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Create logs directory if not exists
mkdir -p logs

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Build completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Frontend build: ./frontend/dist/"
echo "Backend build:  ./backend/dist/"
echo ""
