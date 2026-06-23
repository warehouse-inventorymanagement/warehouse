#!/bin/bash

# Warehouse Application Setup Script
# Run this AFTER setup-database.sh
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
    echo -e "${BLUE}       Warehouse Application Setup Script${NC}"
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

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_info "Working directory: $SCRIPT_DIR"
echo ""

# Step 1: Check if curl is installed
print_step "Checking curl installation"
if command -v curl &> /dev/null; then
    print_success "curl is installed"
else
    print_warning "curl not found, installing..."
    if sudo apt update -qq && sudo apt install -y curl -qq 2>/dev/null; then
        print_success "curl installed successfully"
    else
        print_error "Failed to install curl"
    fi
fi

# Step 2: Check if Node.js is installed
print_step "Checking Node.js installation"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js is installed ($NODE_VERSION)"
else
    print_warning "Node.js not found, installing Node.js 20 LTS..."

    print_step "Adding NodeSource repository"
    if curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - &>/dev/null; then
        print_success "NodeSource repository added"
    else
        print_error "Failed to add NodeSource repository"
    fi

    print_step "Installing Node.js"
    if sudo apt install -y nodejs -qq 2>/dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js installed successfully ($NODE_VERSION)"
    else
        print_error "Failed to install Node.js"
    fi
fi

# Step 3: Check npm
print_step "Checking npm installation"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm is installed ($NPM_VERSION)"
else
    print_error "npm not found - please reinstall Node.js"
fi

# Step 4: Check if git is installed (optional but useful)
print_step "Checking git installation"
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_success "git is installed ($GIT_VERSION)"
else
    print_warning "git not found, installing..."
    if sudo apt install -y git -qq 2>/dev/null; then
        print_success "git installed successfully"
    else
        print_warning "Failed to install git (optional)"
    fi
fi

# Step 5: Create backend .env if it doesn't exist
print_step "Checking backend/.env configuration"
if [ -f "backend/.env" ]; then
    print_success "backend/.env already exists"
else
    print_warning "backend/.env not found, creating..."
    cat > backend/.env <<EOF
# Database
DATABASE_URL="postgresql://warehouse:warehouse@localhost:5432/warehouse?schema=public"

# JWT
JWT_SECRET="warehouse-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="warehouse-refresh-secret-change-in-production"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV=development

# LDAP (optional)
# LDAP_URL="ldap://your-ldap-server:389"
# LDAP_BIND_DN="cn=admin,dc=example,dc=com"
# LDAP_BIND_PASSWORD="ldap-admin-password"
# LDAP_SEARCH_BASE="ou=users,dc=example,dc=com"
# LDAP_SEARCH_FILTER="(uid={{username}})"

# SMTP (for password reset - optional)
# SMTP_HOST="smtp.example.com"
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER="noreply@example.com"
# SMTP_PASSWORD="smtp-password"
# SMTP_FROM="Warehouse <noreply@example.com>"

# Frontend URL (for password reset links)
FRONTEND_URL="http://localhost:5317"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
EOF
    if [ -f "backend/.env" ]; then
        print_success "backend/.env created with default configuration"
    else
        print_error "Failed to create backend/.env"
    fi
fi

# Step 6: Create uploads directory
print_step "Creating uploads directory"
if mkdir -p backend/uploads 2>/dev/null; then
    print_success "uploads directory ready"
else
    print_error "Failed to create uploads directory"
fi

# Step 7: Install root dependencies
print_step "Installing root dependencies"
if npm install 2>/dev/null; then
    print_success "Root dependencies installed"
else
    print_error "Failed to install root dependencies"
fi

# Step 8: Install backend dependencies
print_step "Installing backend dependencies"
cd "$SCRIPT_DIR/backend"
if npm install 2>/dev/null; then
    print_success "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
fi

# Step 9: Install frontend dependencies
print_step "Installing frontend dependencies"
cd "$SCRIPT_DIR/frontend"
if npm install 2>/dev/null; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
fi

# Step 10: Install Iconify (for MDI and Material icons)
print_step "Installing Iconify for icons"
if npm install @iconify/react 2>/dev/null; then
    print_success "Iconify installed"
else
    print_error "Failed to install Iconify"
fi

# Step 11: Generate Prisma client
print_step "Generating Prisma client"
cd "$SCRIPT_DIR/backend"
if npx prisma generate 2>/dev/null; then
    print_success "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
fi

# Step 12: Run database migrations
print_step "Running database migrations"
if npx prisma migrate dev --name init 2>/dev/null; then
    print_success "Database migrations applied"
else
    print_warning "Migration failed, trying db push..."
    if npx prisma db push 2>/dev/null; then
        print_success "Database schema pushed successfully"
    else
        print_error "Failed to apply database schema"
    fi
fi

# Step 13: Regenerate Prisma client after migrations
print_step "Regenerating Prisma client"
if npx prisma generate 2>/dev/null; then
    print_success "Prisma client regenerated"
else
    print_error "Failed to regenerate Prisma client"
fi

# Step 14: Seed database with default data
print_step "Seeding database with default roles and admin user"
if npx prisma db seed 2>/dev/null; then
    print_success "Database seeded successfully"
    print_info "Default admin: warehouse / warehouse"
else
    print_error "Failed to seed database"
fi

cd "$SCRIPT_DIR"

# Step 15: Verify installation
print_step "Verifying installation"
VERIFY_PASSED=0
VERIFY_TOTAL=5

# Check root node_modules
if [ -d "$SCRIPT_DIR/node_modules" ]; then
    print_success "Root node_modules exists"
    ((VERIFY_PASSED++))
else
    print_warning "Root node_modules missing"
fi

# Check if concurrently is installed (root dependency)
if [ -f "$SCRIPT_DIR/node_modules/.bin/concurrently" ] || [ -f "$SCRIPT_DIR/node_modules/concurrently/package.json" ]; then
    print_success "Concurrently installed"
    ((VERIFY_PASSED++))
else
    print_warning "Concurrently missing"
fi

# Check if Prisma client is generated
if [ -d "$SCRIPT_DIR/node_modules/.prisma/client" ]; then
    print_success "Prisma client generated"
    ((VERIFY_PASSED++))
else
    print_warning "Prisma client missing"
fi

# Check if backend can be found
if [ -f "$SCRIPT_DIR/backend/package.json" ]; then
    print_success "Backend package found"
    ((VERIFY_PASSED++))
else
    print_warning "Backend package missing"
fi

# Check if frontend can be found
if [ -f "$SCRIPT_DIR/frontend/package.json" ]; then
    print_success "Frontend package found"
    ((VERIFY_PASSED++))
else
    print_warning "Frontend package missing"
fi

echo ""
if [ $VERIFY_PASSED -eq $VERIFY_TOTAL ]; then
    print_success "All components verified ($VERIFY_PASSED/$VERIFY_TOTAL)"
else
    print_warning "Some components may have issues ($VERIFY_PASSED/$VERIFY_TOTAL)"
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
echo -e "  ${CYAN}Default Admin Credentials:${NC}"
echo -e "  Username:   ${GREEN}warehouse${NC}"
echo -e "  Password:   ${GREEN}warehouse${NC}"
echo ""
echo -e "${BLUE}──────────────────────────────────────────────────────────────${NC}"
echo -e "  ${CYAN}To Start the Application:${NC}"
echo -e "  ${GREEN}npm run dev${NC}"
echo ""
echo -e "  ${CYAN}Access URLs:${NC}"
echo -e "  Frontend:   ${GREEN}http://localhost:5317${NC}"
echo -e "  Backend:    ${GREEN}http://localhost:3000${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
