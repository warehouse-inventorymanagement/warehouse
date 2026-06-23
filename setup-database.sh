#!/bin/bash

# Warehouse Database Setup Script
# For Ubuntu 24.04 LTS - No Docker

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Symbols
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${CYAN}→${NC}"

# Track overall status
FAILED=0

print_header() {
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}       Warehouse Database Setup Script${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${ARROW} $1..."
}

print_success() {
    echo -e "  ${CHECK} $1"
}

print_error() {
    echo -e "  ${CROSS} $1"
    FAILED=1
}

print_warning() {
    echo -e "  ${YELLOW}! $1${NC}"
}

print_info() {
    echo -e "  ${CYAN}$1${NC}"
}

print_header

# Step 1: Check if PostgreSQL is installed
print_step "Checking PostgreSQL installation"
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | head -n1)
    print_success "PostgreSQL is installed ($PSQL_VERSION)"
else
    print_warning "PostgreSQL not found, installing..."

    print_step "Updating package list"
    if sudo apt update -qq 2>/dev/null; then
        print_success "Package list updated"
    else
        print_error "Failed to update package list"
    fi

    print_step "Installing PostgreSQL"
    if sudo apt install -y postgresql postgresql-contrib -qq 2>/dev/null; then
        print_success "PostgreSQL installed successfully"
    else
        print_error "Failed to install PostgreSQL"
    fi
fi

# Step 2: Start PostgreSQL service
print_step "Starting PostgreSQL service"
if sudo systemctl start postgresql 2>/dev/null; then
    print_success "PostgreSQL service started"
else
    print_error "Failed to start PostgreSQL service"
fi

# Step 3: Enable PostgreSQL service on boot
print_step "Enabling PostgreSQL service on boot"
if sudo systemctl enable postgresql 2>/dev/null; then
    print_success "PostgreSQL service enabled"
else
    print_error "Failed to enable PostgreSQL service"
fi

# Step 4: Check if PostgreSQL is running
print_step "Verifying PostgreSQL is running"
if sudo systemctl is-active --quiet postgresql; then
    print_success "PostgreSQL is running"
else
    print_error "PostgreSQL is not running"
fi

# Step 5: Drop existing database if exists
print_step "Dropping existing 'warehouse' database (if exists)"
if sudo -u postgres psql -c "DROP DATABASE IF EXISTS warehouse;" 2>/dev/null; then
    print_success "Existing database dropped (or didn't exist)"
else
    print_warning "Could not drop database (may not exist)"
fi

# Step 6: Drop existing user if exists
print_step "Dropping existing 'warehouse' user (if exists)"
if sudo -u postgres psql -c "DROP USER IF EXISTS warehouse;" 2>/dev/null; then
    print_success "Existing user dropped (or didn't exist)"
else
    print_warning "Could not drop user (may not exist)"
fi

# Step 7: Create new user
print_step "Creating 'warehouse' user with superuser privileges"
if sudo -u postgres psql -c "CREATE USER warehouse WITH PASSWORD 'warehouse' SUPERUSER CREATEDB CREATEROLE;" 2>/dev/null; then
    print_success "User 'warehouse' created with superuser privileges"
else
    print_error "Failed to create user 'warehouse'"
fi

# Step 8: Create database
print_step "Creating 'warehouse' database"
if sudo -u postgres psql -c "CREATE DATABASE warehouse OWNER warehouse;" 2>/dev/null; then
    print_success "Database 'warehouse' created"
else
    print_error "Failed to create database 'warehouse'"
fi

# Step 9: Grant privileges
print_step "Granting all privileges to 'warehouse' user"
if sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE warehouse TO warehouse;" 2>/dev/null; then
    print_success "All privileges granted"
else
    print_error "Failed to grant privileges"
fi

# Step 10: Verify connection
print_step "Verifying database connection"
if PGPASSWORD=warehouse psql -U warehouse -d warehouse -h localhost -c "SELECT 1;" &>/dev/null; then
    print_success "Database connection verified"
else
    print_warning "Could not verify connection (may need pg_hba.conf update)"
    print_info "Try: sudo nano /etc/postgresql/*/main/pg_hba.conf"
    print_info "Change 'peer' to 'md5' for local connections, then restart PostgreSQL"
fi

# Summary
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}       Setup Complete - All steps successful${NC}"
else
    echo -e "${YELLOW}       Setup Complete - Some steps had issues${NC}"
fi
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Database:${NC}     warehouse"
echo -e "  ${CYAN}User:${NC}         warehouse"
echo -e "  ${CYAN}Password:${NC}     warehouse"
echo -e "  ${CYAN}Host:${NC}         localhost"
echo -e "  ${CYAN}Port:${NC}         5432"
echo ""
echo -e "  ${CYAN}Connection String:${NC}"
echo -e "  postgresql://warehouse:warehouse@localhost:5432/warehouse"
echo ""
echo -e "${BLUE}──────────────────────────────────────────────────────────────${NC}"
echo -e "  ${CYAN}Next Steps:${NC}"
echo -e "  1. Run: ${GREEN}./setup-app.sh${NC}"
echo -e "  2. Start: ${GREEN}npm run dev${NC}"
echo -e "  3. Access: ${GREEN}http://localhost:5317${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
