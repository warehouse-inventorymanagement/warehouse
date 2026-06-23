#!/bin/bash
#
# Warehouse - Deploy Script
# Pulls latest changes, builds, and restarts services
#
# Usage: ./scripts/deploy.sh
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
echo -e "${GREEN}  Warehouse - Deployment${NC}"
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

# Check if running as appropriate user
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Consider running as a regular user.${NC}"
fi

# Pull latest changes (if git repo)
if [ -d ".git" ]; then
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git pull
    echo -e "${GREEN}✓ Git pull completed${NC}"
else
    echo -e "${YELLOW}Not a git repository, skipping pull${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Sync DATABASE_URL from root .env to backend/.env
if [ -f "$PROJECT_ROOT/.env" ]; then
    ROOT_DB_URL=$(grep "^DATABASE_URL=" "$PROJECT_ROOT/.env" | head -1 | cut -d'=' -f2-)
    if [ -n "$ROOT_DB_URL" ]; then
        echo -e "${YELLOW}Syncing database credentials to backend/.env...${NC}"
        cat > "$PROJECT_ROOT/backend/.env" << EOF
DATABASE_URL=$ROOT_DB_URL
NODE_ENV=production
EOF
        echo -e "${GREEN}✓ Database credentials synced${NC}"
    fi
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
cd backend
npx prisma generate
cd ..
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd backend
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    npx prisma migrate deploy
else
    echo "No migrations found, pushing schema directly..."
    npx prisma db push
fi
cd ..
echo -e "${GREEN}✓ Database migrations applied${NC}"

# Build application
echo -e "${YELLOW}Building application...${NC}"
"$SCRIPT_DIR/build.sh"

# Restart PM2 process
echo -e "${YELLOW}Restarting application...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "warehouse-backend"; then
        pm2 restart warehouse-backend
        echo -e "${GREEN}✓ Application restarted${NC}"
    else
        pm2 start ecosystem.config.cjs
        pm2 save
        echo -e "${GREEN}✓ Application started${NC}"
    fi
else
    echo -e "${RED}PM2 not found. Install with: npm install -g pm2${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Check status: pm2 status"
echo "View logs:    pm2 logs warehouse-backend"
echo ""
