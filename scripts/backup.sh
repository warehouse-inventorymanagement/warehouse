#!/bin/bash
#
# Warehouse - Backup Script
# Creates a backup of database and uploads
#
# Usage: ./scripts/backup.sh [--no-uploads]
#
# Backups are stored in: ./backups/
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

# Configuration
BACKUP_DIR="$PROJECT_ROOT/backups"
UPLOADS_DIR="$PROJECT_ROOT/uploads"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="warehouse-backup-$TIMESTAMP"
INCLUDE_UPLOADS=true

# Parse arguments
for arg in "$@"; do
    case $arg in
        --no-uploads)
            INCLUDE_UPLOADS=false
            shift
            ;;
    esac
done

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Warehouse - Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo "Include uploads: $INCLUDE_UPLOADS"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"
TEMP_DIR="$BACKUP_DIR/temp-$TIMESTAMP"
mkdir -p "$TEMP_DIR"

# Dump database
echo -e "${YELLOW}Creating database dump...${NC}"
PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$TEMP_DIR/database.sql"
echo -e "${GREEN}✓ Database dump created${NC}"

# Copy uploads if requested
if [ "$INCLUDE_UPLOADS" = true ] && [ -d "$UPLOADS_DIR" ]; then
    echo -e "${YELLOW}Copying uploads...${NC}"
    cp -r "$UPLOADS_DIR" "$TEMP_DIR/uploads"
    echo -e "${GREEN}✓ Uploads copied${NC}"
fi

# Create metadata
echo -e "${YELLOW}Creating metadata...${NC}"
cat > "$TEMP_DIR/backup-metadata.json" << EOF
{
    "version": "1.0",
    "createdAt": "$(date -Iseconds)",
    "includeUploads": $INCLUDE_UPLOADS,
    "database": "$DB_NAME"
}
EOF

# Create zip archive
echo -e "${YELLOW}Creating archive...${NC}"
cd "$TEMP_DIR"
zip -r "$BACKUP_DIR/$BACKUP_NAME.zip" .
cd "$PROJECT_ROOT"

# Cleanup temp directory
rm -rf "$TEMP_DIR"

# Get file size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.zip" | cut -f1)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Backup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "File: $BACKUP_DIR/$BACKUP_NAME.zip"
echo "Size: $BACKUP_SIZE"
echo ""

# Optional: Remove old backups (keep last 5)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/warehouse-backup-*.zip 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}Cleaning old backups (keeping last 5)...${NC}"
    ls -1t "$BACKUP_DIR"/warehouse-backup-*.zip | tail -n +6 | xargs rm -f
    echo -e "${GREEN}✓ Old backups removed${NC}"
fi
