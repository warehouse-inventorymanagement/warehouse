#!/bin/bash

# Warehouse Update Script
# This script applies updates to /opt/warehouse
# Can be run from:
#   1. Extracted update folder (e.g., /opt/warehouse_update/warehouse-1.0.3/)
#   2. Current installation (/opt/warehouse) - will use zip from /opt/warehouse_update/

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║       Warehouse Update Script             ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Target installation directory
INSTALL_DIR="/opt/warehouse"
UPDATES_DIR="/opt/warehouse/update"

# Detect where script is being run from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PARENT="$(dirname "$SCRIPT_DIR")"

# Check if we're running from an extracted update folder
if [ -f "$SCRIPT_PARENT/package.json" ] && [ "$SCRIPT_PARENT" != "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Running from extracted update folder${NC}"
    SOURCE_DIR="$SCRIPT_PARENT"
    FROM_EXTRACTED=true
else
    FROM_EXTRACTED=false
fi

echo "Target installation: $INSTALL_DIR"

# Check if installation directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}Error: Installation directory not found at $INSTALL_DIR${NC}"
    exit 1
fi

# If not running from extracted folder, find and extract zip
if [ "$FROM_EXTRACTED" = false ]; then
    # Check if updates directory exists
    if [ ! -d "$UPDATES_DIR" ]; then
        echo -e "${RED}Error: Updates directory not found at $UPDATES_DIR${NC}"
        echo "Please download an update first from Settings > About"
        exit 1
    fi

    # Find the latest update zip
    LATEST_UPDATE=$(ls -t "$UPDATES_DIR"/warehouse-*.zip 2>/dev/null | head -n 1)

    if [ -z "$LATEST_UPDATE" ]; then
        echo -e "${RED}Error: No update files found in $UPDATES_DIR${NC}"
        echo "Please download an update first from Settings > About"
        exit 1
    fi

    FILENAME=$(basename "$LATEST_UPDATE")
    VERSION=$(echo "$FILENAME" | sed 's/warehouse-//' | sed 's/.zip//')

    echo -e "${YELLOW}Found update: $FILENAME${NC}"
    echo -e "Version: ${GREEN}$VERSION${NC}"
else
    # Get version from package.json in extracted folder
    VERSION=$(grep -o '"version": *"[^"]*"' "$SOURCE_DIR/package.json" | head -1 | sed 's/"version": *"//' | sed 's/"//')
    echo -e "Source: ${GREEN}$SOURCE_DIR${NC}"
    echo -e "Version: ${GREEN}$VERSION${NC}"
fi

echo ""

# Confirm with user
read -p "Do you want to apply this update to $INSTALL_DIR? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Update cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Creating backup of current installation...${NC}"

# Create backup directory
BACKUP_DIR="$INSTALL_DIR/backups/pre-update-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup important files (exclude node_modules and uploads)
echo "Backing up to: $BACKUP_DIR"
tar -czf "$BACKUP_DIR/source-backup.tar.gz" \
    --exclude='node_modules' \
    --exclude='uploads' \
    --exclude='backups' \
    --exclude='.git' \
    -C "$INSTALL_DIR" .

echo -e "${GREEN}Backup created successfully${NC}"
echo ""

# If not from extracted folder, extract the zip first
if [ "$FROM_EXTRACTED" = false ]; then
    echo -e "${BLUE}Step 2: Extracting update...${NC}"

    # Create temp directory for extraction
    TEMP_DIR=$(mktemp -d)
    unzip -q "$LATEST_UPDATE" -d "$TEMP_DIR"

    # Find the extracted directory (GitHub creates a folder like owner-repo-hash)
    SOURCE_DIR=$(ls -d "$TEMP_DIR"/*/ | head -n 1)

    if [ -z "$SOURCE_DIR" ]; then
        echo -e "${RED}Error: Failed to extract update${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi

    echo -e "${GREEN}Extracted successfully${NC}"
    echo ""
else
    echo -e "${BLUE}Step 2: Using extracted source...${NC}"
    echo -e "${GREEN}Source ready${NC}"
    echo ""
fi

echo -e "${BLUE}Step 3: Applying update...${NC}"

# Copy new files (preserving uploads, backups, node_modules, .env)
rsync -av \
    --exclude='node_modules' \
    --exclude='uploads' \
    --exclude='backups' \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='backend/.env' \
    "${SOURCE_DIR}/" "$INSTALL_DIR/"

echo -e "${GREEN}Files updated successfully${NC}"
echo ""

echo -e "${BLUE}Step 4: Installing dependencies...${NC}"
cd "$INSTALL_DIR"
npm install

echo -e "${GREEN}Dependencies installed${NC}"
echo ""

echo -e "${BLUE}Step 5: Updating database schema...${NC}"
cd "$INSTALL_DIR/backend"
npx prisma generate
npx prisma db push --accept-data-loss

echo -e "${GREEN}Database schema updated${NC}"
echo ""

# Cleanup temp directory if we created one
if [ "$FROM_EXTRACTED" = false ] && [ -n "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════╗"
echo "║       Update Complete!                    ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Please restart the Warehouse application:"
echo "  cd $INSTALL_DIR && npm run dev"
echo ""
echo "Or if using systemd:"
echo "  sudo systemctl restart warehouse"
echo ""
echo "If something went wrong, you can restore from backup:"
echo "  $BACKUP_DIR/source-backup.tar.gz"
echo ""
