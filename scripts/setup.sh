#!/bin/bash
#
# Warehouse - Initial Setup Script
# For Ubuntu 24.04 LTS
#
# Usage: sudo ./scripts/setup.sh
#
# This script will:
# 1. Install Node.js 20.x
# 2. Install PM2
# 3. Install and configure Nginx
# 4. Install PostgreSQL (optional)
# 5. Set up the application
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/warehouse"
APP_USER="${SUDO_USER:-$USER}"
NODE_VERSION="20"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Warehouse - Initial Setup${NC}"
echo -e "${GREEN}  Ubuntu 24.04 LTS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo ./scripts/setup.sh${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" > /dev/null 2>&1
}

# Function to prompt yes/no (default no)
confirm() {
    read -r -p "$1 [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# Function to prompt yes/no (default yes)
confirm_yes() {
    read -r -p "$1 [Y/n] " response
    case "$response" in
        [nN][oO]|[nN]) return 1 ;;
        *) return 0 ;;
    esac
}

# Function to ask about reinstalling existing component
should_install() {
    local component="$1"
    local current_version="$2"

    if [ -n "$current_version" ]; then
        echo -e "${GREEN}$component is already installed: $current_version${NC}"
        if confirm "  Reinstall $component?"; then
            return 0
        else
            echo -e "  ${YELLOW}Skipping $component${NC}"
            return 1
        fi
    fi
    return 0
}

# Setup logging
LOG_FILE="$PROJECT_ROOT/install-log.txt"
echo "Warehouse Setup Log - $(date)" > "$LOG_FILE"
echo "================================" >> "$LOG_FILE"

# Spinner function for background tasks
show_spinner() {
    local pid=$1
    local message=$2
    local spinstr='|/-\'
    local i=0

    printf "  %s " "$message"
    while kill -0 "$pid" 2>/dev/null; do
        i=$(( (i+1) % 4 ))
        printf "\r  %s %c" "$message" "${spinstr:$i:1}"
        sleep 0.1
    done

    wait "$pid"
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        printf "\r  %s ${GREEN}✓${NC}\n" "$message"
    else
        printf "\r  %s ${RED}✗${NC}\n" "$message"
        echo -e "${RED}Error occurred. Check $LOG_FILE for details.${NC}"
    fi
    return $exit_code
}

echo -e "${BLUE}Updating package lists...${NC}"
apt update >> "$LOG_FILE" 2>&1 &
show_spinner $! "Updating apt packages"

# ============================================
# Install Node.js
# ============================================
echo ""
echo -e "${YELLOW}[1/7] Node.js${NC}"

INSTALL_NODE=false

if command_exists node; then
    NODE_CURRENT=$(node -v)
    NODE_MAJOR=$(echo "$NODE_CURRENT" | cut -d'.' -f1 | tr -d 'v')

    if [ "$NODE_MAJOR" -lt "$NODE_VERSION" ]; then
        echo -e "${YELLOW}Node.js $NODE_CURRENT is installed but v${NODE_VERSION}+ is required${NC}"
        INSTALL_NODE=true
    else
        echo -e "${GREEN}Node.js already installed: $NODE_CURRENT${NC}"
        if confirm "  Reinstall/upgrade Node.js?"; then
            INSTALL_NODE=true
        else
            echo -e "  ${YELLOW}Skipping Node.js${NC}"
        fi
    fi
else
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    # Step 1: Remove old Node.js completely
    {
        apt-get purge -y nodejs npm 2>/dev/null || true
        apt-get autoremove -y 2>/dev/null || true
        rm -rf /usr/local/lib/node_modules 2>/dev/null || true
        rm -rf /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx 2>/dev/null || true
        rm -f /etc/apt/sources.list.d/nodesource.list* 2>/dev/null || true
        rm -f /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
        rm -f /usr/share/keyrings/nodesource.gpg 2>/dev/null || true
    } >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Removing old Node.js"

    hash -r 2>/dev/null || true

    # Step 2: Install via NodeSource (recommended for production)
    {
        # Install dependencies for NodeSource
        apt-get install -y ca-certificates curl gnupg

        # Setup NodeSource repo with new GPG key method
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

        apt-get update
        apt-get install -y nodejs
    } >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Installing Node.js ${NODE_VERSION}.x via NodeSource"

    hash -r 2>/dev/null || true
    sleep 1

    # Check if NodeSource worked
    INSTALLED_VERSION=""
    if command_exists node; then
        INSTALLED_VERSION=$(node -v 2>/dev/null | cut -d'.' -f1 | tr -d 'v')
    fi

    # Step 3: Fallback to n version manager if NodeSource failed
    if [ -z "$INSTALLED_VERSION" ] || [ "$INSTALLED_VERSION" -lt "$NODE_VERSION" ]; then
        echo -e "  ${YELLOW}NodeSource didn't work, trying n version manager...${NC}"
        {
            apt-get purge -y nodejs 2>/dev/null || true

            # Install n and use it to install Node
            export N_PREFIX=/usr/local
            curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s ${NODE_VERSION}
        } >> "$LOG_FILE" 2>&1 &
        show_spinner $! "Installing Node.js ${NODE_VERSION}.x via n"

        export PATH="/usr/local/bin:$PATH"
        hash -r 2>/dev/null || true
    fi

    # Final verification
    hash -r 2>/dev/null || true
    if command_exists node; then
        FINAL_VERSION=$(node -v 2>/dev/null)
        FINAL_MAJOR=$(echo "$FINAL_VERSION" | cut -d'.' -f1 | tr -d 'v')
        if [ "$FINAL_MAJOR" -ge "$NODE_VERSION" ]; then
            echo -e "  ${GREEN}✓ Node.js $FINAL_VERSION installed${NC}"
        else
            echo -e "  ${RED}✗ Node.js $FINAL_VERSION installed but v${NODE_VERSION}+ required${NC}"
            echo -e "  ${YELLOW}Manual fix: curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - && sudo apt-get install -y nodejs${NC}"
        fi
    else
        echo -e "  ${RED}✗ Node.js installation failed. Check $LOG_FILE${NC}"
        echo -e "  ${YELLOW}Manual fix: curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - && sudo apt-get install -y nodejs${NC}"
    fi
fi

# Verify npm is available
hash -r 2>/dev/null || true
if ! command_exists npm; then
    echo -e "  ${YELLOW}Warning: npm not found${NC}"
fi

# ============================================
# Install PM2
# ============================================
echo ""
echo -e "${YELLOW}[2/7] PM2${NC}"

INSTALL_PM2=false
if command_exists pm2; then
    echo -e "${GREEN}PM2 already installed: $(pm2 -v)${NC}"
    if confirm "  Reinstall PM2?"; then
        INSTALL_PM2=true
    else
        echo -e "  ${YELLOW}Skipping PM2${NC}"
    fi
else
    INSTALL_PM2=true
fi

if [ "$INSTALL_PM2" = true ]; then
    npm install -g pm2 >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Installing PM2"
fi

# ============================================
# Install Nginx
# ============================================
echo ""
echo -e "${YELLOW}[3/7] Nginx${NC}"

INSTALL_NGINX=false
if command_exists nginx; then
    echo -e "${GREEN}Nginx already installed: $(nginx -v 2>&1)${NC}"
    if confirm "  Reinstall Nginx?"; then
        INSTALL_NGINX=true
    else
        echo -e "  ${YELLOW}Skipping Nginx${NC}"
    fi
else
    INSTALL_NGINX=true
fi

if [ "$INSTALL_NGINX" = true ]; then
    {
        apt install -y nginx
        systemctl enable nginx
        systemctl start nginx
    } >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Installing Nginx"
fi

# ============================================
# PostgreSQL
# ============================================
echo ""
echo -e "${YELLOW}[4/7] PostgreSQL${NC}"

# Check if database is already configured
SKIP_DB_SETUP=false
if [ -f "$APP_DIR/.env" ]; then
    EXISTING_DB_URL=$(grep "^DATABASE_URL=" "$APP_DIR/.env" 2>/dev/null | head -1)
    if [ -n "$EXISTING_DB_URL" ]; then
        echo -e "${GREEN}Database already configured in .env${NC}"
        echo "  $EXISTING_DB_URL"
        if confirm "  Reconfigure database?"; then
            SKIP_DB_SETUP=false
        else
            echo -e "  ${YELLOW}Skipping database setup${NC}"
            SKIP_DB_SETUP=true
            # Extract DATABASE_URL for later use
            DATABASE_URL=$(echo "$EXISTING_DB_URL" | cut -d'=' -f2- | tr -d '"')
        fi
    fi
fi

if [ "$SKIP_DB_SETUP" = false ]; then
    echo ""
    echo "Choose database setup:"
    echo "  1) Install PostgreSQL locally (recommended for single server)"
    echo "  2) Use external PostgreSQL server (for managed DB or separate server)"
    echo "  3) Skip database setup (use existing configuration)"
    echo ""
    read -r -p "Select option [1]: " DB_OPTION
    DB_OPTION=${DB_OPTION:-1}
else
    DB_OPTION="skip"
fi

if [ "$DB_OPTION" = "1" ]; then
    # Local PostgreSQL 18 installation (from official PostgreSQL repository)
    if ! command_exists psql; then
        {
            # Add PostgreSQL APT repository for Ubuntu LTS
            apt install -y curl ca-certificates gnupg
            curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
            echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
            apt update
            apt install -y postgresql-18
            systemctl enable postgresql
            systemctl start postgresql
        } >> "$LOG_FILE" 2>&1 &
        show_spinner $! "Installing PostgreSQL 18"
    else
        echo -e "  ${GREEN}PostgreSQL already installed: $(psql --version)${NC}"
    fi

    # Database configuration
    echo ""
    echo -e "${BLUE}Database Configuration${NC}"
    echo "Enter the details for your Warehouse database:"
    echo ""

    read -r -p "Database name [warehouse]: " DB_NAME
    DB_NAME=${DB_NAME:-warehouse}

    read -r -p "Database user [warehouse]: " DB_USER
    DB_USER=${DB_USER:-warehouse}

    while true; do
        read -r -s -p "Database password: " DB_PASS
        echo ""
        if [ -z "$DB_PASS" ]; then
            echo -e "${RED}Password cannot be empty${NC}"
        else
            read -r -s -p "Confirm password: " DB_PASS_CONFIRM
            echo ""
            if [ "$DB_PASS" = "$DB_PASS_CONFIRM" ]; then
                break
            else
                echo -e "${RED}Passwords do not match${NC}"
            fi
        fi
    done

    # Create database and user
    echo ""
    {
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null || true
    } >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Creating database and user"

    # Store for later use in .env
    DB_HOST="localhost"
    DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"

elif [ "$DB_OPTION" = "2" ]; then
    # External PostgreSQL server
    # Install psql client for connection testing
    if ! command_exists psql; then
        {
            # Add PostgreSQL APT repository if not already added
            if [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
                apt install -y curl ca-certificates gnupg
                curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
                echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
                apt update
            fi
            apt install -y postgresql-client-18
        } >> "$LOG_FILE" 2>&1 &
        show_spinner $! "Installing PostgreSQL 18 client"
    fi

    echo ""
    echo -e "${BLUE}External Database Configuration${NC}"
    echo "Enter your PostgreSQL connection details:"
    echo ""

    read -r -p "Database host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    read -r -p "Database port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -r -p "Database name [warehouse]: " DB_NAME
    DB_NAME=${DB_NAME:-warehouse}
    read -r -p "Database user [warehouse]: " DB_USER
    DB_USER=${DB_USER:-warehouse}
    read -r -s -p "Database password: " DB_PASS
    echo ""

    DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"

    # Test connection
    echo ""
    DB_TEST_RESULT=""
    (PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >> "$LOG_FILE" 2>&1 && echo "success" > /tmp/db_test_result || echo "failed" > /tmp/db_test_result) &
    show_spinner $! "Testing database connection"

    if [ "$(cat /tmp/db_test_result 2>/dev/null)" = "success" ]; then
        echo -e "  ${GREEN}Connection successful${NC}"
    else
        echo -e "  ${RED}Could not connect to database${NC}"
        echo -e "  ${YELLOW}Please verify your credentials. Setup will continue, but you may need to fix .env manually.${NC}"
    fi
    rm -f /tmp/db_test_result

elif [ "$DB_OPTION" = "3" ] || [ "$DB_OPTION" = "skip" ]; then
    echo -e "${YELLOW}Skipping database setup${NC}"
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}Warning: No DATABASE_URL set. You will need to configure .env manually.${NC}"
        DATABASE_URL="postgresql://warehouse:password@localhost:5432/warehouse"
    fi
fi

# ============================================
# Application Setup
# ============================================
echo ""
echo -e "${YELLOW}[5/7] Application Setup${NC}"

# Copy project to /opt/warehouse if not already there
if [ "$PROJECT_ROOT" != "$APP_DIR" ]; then
    if [ -d "$APP_DIR" ]; then
        echo -e "${GREEN}Application directory exists: $APP_DIR${NC}"
        if confirm "  Update application files?"; then
            {
                rsync -av --exclude='.env' --exclude='node_modules' --exclude='uploads' --exclude='logs' --exclude='backups' "$PROJECT_ROOT/" "$APP_DIR/"
                chown -R "$APP_USER:$APP_USER" "$APP_DIR"
            } >> "$LOG_FILE" 2>&1 &
            show_spinner $! "Updating application files"
        else
            echo -e "  ${YELLOW}Skipping application file update${NC}"
        fi
    else
        {
            cp -r "$PROJECT_ROOT" "$APP_DIR"
            chown -R "$APP_USER:$APP_USER" "$APP_DIR"
        } >> "$LOG_FILE" 2>&1 &
        show_spinner $! "Copying application to $APP_DIR"
    fi
fi

cd "$APP_DIR"

# Create directories
mkdir -p logs uploads backups
chown -R "$APP_USER:$APP_USER" logs uploads backups

# Check if .env already exists
SKIP_ENV_CREATE=false
if [ -f "$APP_DIR/.env" ]; then
    echo -e "${GREEN}.env file already exists${NC}"
    if confirm "  Recreate .env file? (This will overwrite existing settings)"; then
        SKIP_ENV_CREATE=false
    else
        echo -e "  ${YELLOW}Keeping existing .env${NC}"
        SKIP_ENV_CREATE=true
    fi
fi

if [ "$SKIP_ENV_CREATE" = false ]; then
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    # Create .env file
    cat > "$APP_DIR/.env" << EOF
# ===========================================
# Warehouse - Environment Configuration
# Generated by setup.sh on $(date)
# ===========================================

# Database
DATABASE_URL="$DATABASE_URL"

# JWT Authentication
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV=production
BIND_ADDRESS=127.0.0.1

# Frontend URL (update to your domain/IP for email links)
FRONTEND_URL="http://$(hostname -I | awk '{print $1}')"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# Encryption Key
ENCRYPTION_KEY="$ENCRYPTION_KEY"

# LDAP / Active Directory (configure in Settings > LDAP)
# SMTP / Email (configure in Settings > Email)
EOF

    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
    echo -e "  ${GREEN}✓ .env file created${NC}"
fi

# Create/update backend/.env with production DATABASE_URL
cat > "$APP_DIR/backend/.env" << EOF
DATABASE_URL="$DATABASE_URL"
NODE_ENV=production
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env"
chmod 600 "$APP_DIR/backend/.env"
echo -e "  ${GREEN}✓ backend/.env created${NC}"

# Check if dependencies need to be installed
INSTALL_DEPS=true
if [ -d "$APP_DIR/node_modules" ]; then
    echo -e "${GREEN}Dependencies already installed${NC}"
    if confirm "  Reinstall dependencies?"; then
        INSTALL_DEPS=true
    else
        echo -e "  ${YELLOW}Skipping dependency installation${NC}"
        INSTALL_DEPS=false
    fi
fi

if [ "$INSTALL_DEPS" = true ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    sudo -u "$APP_USER" npm install >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Installing npm packages"
fi

cd backend
sudo -u "$APP_USER" npx prisma generate >> "$LOG_FILE" 2>&1 &
show_spinner $! "Generating Prisma client"
cd ..

# Check if build is needed
BUILD_APP=true
if [ -d "$APP_DIR/backend/dist" ] && [ -d "$APP_DIR/frontend/dist" ]; then
    echo -e "${GREEN}Application already built${NC}"
    if confirm "  Rebuild application?"; then
        BUILD_APP=true
    else
        echo -e "  ${YELLOW}Skipping build${NC}"
        BUILD_APP=false
    fi
fi

if [ "$BUILD_APP" = true ]; then
    sudo -u "$APP_USER" bash scripts/build.sh >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Building application"
fi

# ============================================
# Nginx Configuration
# ============================================
echo ""
echo -e "${YELLOW}[6/7] Nginx Configuration${NC}"

CONFIGURE_NGINX=true
if [ -f "/etc/nginx/sites-available/warehouse" ]; then
    echo -e "${GREEN}Nginx configuration exists${NC}"
    if confirm "  Reconfigure Nginx?"; then
        CONFIGURE_NGINX=true
    else
        echo -e "  ${YELLOW}Skipping Nginx configuration${NC}"
        CONFIGURE_NGINX=false
    fi
fi

if [ "$CONFIGURE_NGINX" = true ]; then
    {
        # Remove default site if exists
        if [ -f "/etc/nginx/sites-enabled/default" ]; then
            rm -f /etc/nginx/sites-enabled/default
        fi

        # Copy nginx config
        cp "$APP_DIR/nginx/warehouse.conf" /etc/nginx/sites-available/warehouse
        ln -sf /etc/nginx/sites-available/warehouse /etc/nginx/sites-enabled/warehouse

        # Test and reload nginx
        nginx -t
        systemctl reload nginx
    } >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Configuring Nginx"
fi

# ============================================
# PM2 Setup
# ============================================
echo ""
echo -e "${YELLOW}[7/7] PM2 Application${NC}"

cd "$APP_DIR"

# Check if database needs initialization
INIT_DB=true
if sudo -u "$APP_USER" PGPASSWORD="$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')" psql -h localhost -U "$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')" -d "$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')" -c "SELECT COUNT(*) FROM users" > /dev/null 2>&1; then
    echo -e "${GREEN}Database already has data${NC}"
    if confirm "  Reinitialize database (this will seed default data)?"; then
        INIT_DB=true
    else
        echo -e "  ${YELLOW}Skipping database initialization${NC}"
        INIT_DB=false
    fi
fi

if [ "$INIT_DB" = true ]; then
    # Use default admin credentials (warehouse/warehouse)
    ADMIN_USER="warehouse"
    ADMIN_PASS="warehouse"

    cd backend

    # Try migrate deploy first, fall back to db push if no migrations exist
    if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
        sudo -u "$APP_USER" npx prisma migrate deploy >> "$LOG_FILE" 2>&1 &
        show_spinner $! "Running database migrations"
    else
        sudo -u "$APP_USER" npx prisma db push >> "$LOG_FILE" 2>&1 &
        show_spinner $! "Pushing database schema"
    fi

    # Seed the database with initial data (pass admin credentials via env vars)
    (sudo -u "$APP_USER" ADMIN_USERNAME="$ADMIN_USER" ADMIN_PASSWORD="$ADMIN_PASS" npx prisma db seed >> "$LOG_FILE" 2>&1 || true) &
    show_spinner $! "Seeding database"

    cd ..
fi

# Check if PM2 process exists
START_PM2=true
if pm2 list 2>/dev/null | grep -q "warehouse-backend"; then
    echo -e "${GREEN}PM2 process already running${NC}"
    if confirm "  Restart PM2 process?"; then
        pm2 restart warehouse-backend >> "$LOG_FILE" 2>&1 &
        show_spinner $! "Restarting PM2 process"
        START_PM2=false
    else
        echo -e "  ${YELLOW}Skipping PM2 restart${NC}"
        START_PM2=false
    fi
fi

if [ "$START_PM2" = true ]; then
    {
        sudo -u "$APP_USER" pm2 start ecosystem.config.cjs
        sudo -u "$APP_USER" pm2 save
    } >> "$LOG_FILE" 2>&1 &
    show_spinner $! "Starting PM2 process"
fi

# Setup PM2 startup
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >> "$LOG_FILE" 2>&1 &
show_spinner $! "Configuring PM2 startup"

# ============================================
# Complete
# ============================================
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Application URL:${NC} http://$SERVER_IP"
echo ""
echo -e "${BLUE}Database Configuration:${NC}"
echo "  Host:     $DB_HOST"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USER"
echo "  Password: (stored in .env)"
echo ""
echo -e "${BLUE}Admin Login:${NC}"
echo "  Username: ${ADMIN_USER:-warehouse}"
echo "  Password: ${ADMIN_PASS:-warehouse}"
echo -e "${RED}  ⚠ Change this immediately after first login!${NC}"
echo ""
echo -e "${BLUE}Important Commands:${NC}"
echo "  pm2 status              - Check application status"
echo "  pm2 logs                - View application logs"
echo "  pm2 restart all         - Restart application"
echo "  systemctl status nginx  - Check Nginx status"
echo ""
echo -e "${BLUE}Configuration Files:${NC}"
echo "  App config:    $APP_DIR/.env"
echo "  Nginx config:  /etc/nginx/sites-available/warehouse"
echo "  PM2 config:    $APP_DIR/ecosystem.config.cjs"
echo ""
echo -e "${BLUE}Scripts:${NC}"
echo "  $APP_DIR/scripts/deploy.sh   - Deploy updates"
echo "  $APP_DIR/scripts/backup.sh   - Create backup"
echo "  $APP_DIR/scripts/restore.sh  - Restore backup"
echo ""
echo -e "${BLUE}For SSL Setup:${NC}"
echo "  1. Place certificates:"
echo "     - /etc/ssl/certs/warehouse.crt"
echo "     - /etc/ssl/private/warehouse.key"
echo "  2. Update domain in: $APP_DIR/nginx/warehouse-ssl.conf"
echo "  3. Apply: sudo cp $APP_DIR/nginx/warehouse-ssl.conf /etc/nginx/sites-available/warehouse"
echo "  4. Reload: sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo -e "${BLUE}Installation Log:${NC} $LOG_FILE"
echo ""
