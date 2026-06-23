#!/bin/bash
#
# Warehouse - Restore Script
# Restores database and uploads from a backup
#
# Usage: ./scripts/restore.sh <backup-file.zip>
#
# WARNING: This will overwrite your current database and uploads!
#

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Usage: ./scripts/restore.sh <backup-file.zip>${NC}"
    echo ""
    echo "Available backups:"
    ls -la backups/*.zip 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try in backups directory
    if [ -f "backups/$BACKUP_FILE" ]; then
        BACKUP_FILE="backups/$BACKUP_FILE"
    else
        echo -e "${RED}Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Extract connection details
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Warehouse - Restore${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""
echo -e "${RED}WARNING: This will overwrite your current database and uploads!${NC}"
echo ""
read -r -p "Are you sure you want to continue? [y/N] " response
case "$response" in
    [yY][eE][sS]|[yY]) ;;
    *) echo "Aborted."; exit 0 ;;
esac

# Create temp directory
TEMP_DIR="$PROJECT_ROOT/backups/restore-$$"
mkdir -p "$TEMP_DIR"

# Extract backup
echo ""
echo -e "${YELLOW}Extracting backup...${NC}"
unzip -q "$BACKUP_FILE" -d "$TEMP_DIR"
echo -e "${GREEN}✓ Backup extracted${NC}"

# Verify backup contents
if [ ! -f "$TEMP_DIR/database.sql" ]; then
    echo -e "${RED}Invalid backup: database.sql not found${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

if [ -f "$TEMP_DIR/backup-metadata.json" ]; then
    echo ""
    echo -e "${YELLOW}Backup metadata:${NC}"
    cat "$TEMP_DIR/backup-metadata.json"
    echo ""
fi

# Create a backup of current state first
echo -e "${YELLOW}Creating backup of current state...${NC}"
"$SCRIPT_DIR/backup.sh" --no-uploads || echo "Could not create pre-restore backup"

# Restore database
echo -e "${YELLOW}Restoring database...${NC}"
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$TEMP_DIR/database.sql" > /dev/null 2>&1
echo -e "${GREEN}✓ Database restored${NC}"

# Restore uploads if present
if [ -d "$TEMP_DIR/uploads" ]; then
    echo -e "${YELLOW}Restoring uploads...${NC}"

    # Backup current uploads
    if [ -d "$PROJECT_ROOT/uploads" ]; then
        rm -rf "$PROJECT_ROOT/uploads.old"
        mv "$PROJECT_ROOT/uploads" "$PROJECT_ROOT/uploads.old"
    fi

    # Copy restored uploads
    cp -r "$TEMP_DIR/uploads" "$PROJECT_ROOT/uploads"
    echo -e "${GREEN}✓ Uploads restored${NC}"

    # Remove old uploads backup
    rm -rf "$PROJECT_ROOT/uploads.old"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Restore Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Restart the application to apply changes:${NC}"
echo "  pm2 restart all"
echo ""
