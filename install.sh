#!/bin/bash

## R-Panel One-Click Setup Script for Linux VPS
## Do not modify this file. You will lose the ability to install and auto-update!

## Environment variables that can be set:
## ROOT_USERNAME - Predefined root username
## ROOT_USER_EMAIL - Predefined root user email
## ROOT_USER_PASSWORD - Predefined root user password
## DATABASE_URL - PostgreSQL database URL
## AUTOUPDATE - Set to "false" to disable auto-updates

set -e # Exit immediately if a command exits with a non-zero status
set -o pipefail # Cause a pipeline to return the status of the last command that exited with a non-zero status

CDN="https://raw.githubusercontent.com/Bishan-Pankaja/r-panel/main"
DATE=$(date +"%Y%m%d-%H%M%S")

OS_TYPE=$(grep -w "ID" /etc/os-release | cut -d "=" -f 2 | tr -d '"')
ENV_FILE="/data/rpanel/source/.env"
CURRENT_USER=$USER

if [ $EUID != 0 ]; then
    echo "Please run this script as root or with sudo"
    exit
fi

echo ""
echo "=========================================="
echo "   R-Panel Installation - ${DATE}"
echo "=========================================="
echo ""
echo "Welcome to R-Panel Installer!"
echo "This script will install everything for you. Sit back and relax."
echo "Source code: https://github.com/Bishan-Pankaja/r-panel"

# Predefined root user
ROOT_USERNAME=${ROOT_USERNAME:-}
ROOT_USER_EMAIL=${ROOT_USER_EMAIL:-}
ROOT_USER_PASSWORD=${ROOT_USER_PASSWORD:-}

# Helper function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Helper function to log section headers
log_section() {
    echo ""
    echo "============================================================"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "============================================================"
}

# Check if the OS is supported
if [ "$OS_TYPE" = "manjaro" ] || [ "$OS_TYPE" = "manjaro-arm" ]; then
    OS_TYPE="arch"
fi

if [ "$OS_TYPE" = "endeavouros" ]; then
    OS_TYPE="arch"
fi

if [ "$OS_TYPE" = "cachyos" ]; then
    OS_TYPE="arch"
fi

if [ "$OS_TYPE" = "fedora-asahi-remix" ]; then
    OS_TYPE="fedora"
fi

if [ "$OS_TYPE" = "pop" ]; then
    OS_TYPE="ubuntu"
fi

if [ "$OS_TYPE" = "linuxmint" ]; then
    OS_TYPE="ubuntu"
fi

if [ "$OS_TYPE" = "zorin" ]; then
    OS_TYPE="ubuntu"
fi

if [ "$OS_TYPE" = "arch" ] || [ "$OS_TYPE" = "archarm" ]; then
    OS_VERSION="rolling"
else
    OS_VERSION=$(grep -w "VERSION_ID" /etc/os-release | cut -d "=" -f 2 | tr -d '"')
fi

case "$OS_TYPE" in
arch | ubuntu | debian | raspbian | centos | fedora | rhel | ol | rocky | sles | opensuse-leap | opensuse-tumbleweed | almalinux | amzn | alpine | postmarketos) ;;
*)
    echo "This script only supports Debian, Redhat, Arch Linux, Alpine Linux, or SLES based operating systems for now."
    exit
    ;;
esac

echo "---------------------------------------------"
echo "| Operating System  | $OS_TYPE $OS_VERSION"
echo "---------------------------------------------"
echo ""

log_section "Step 1/7: Installing required packages"
echo "1/7 Installing required packages (curl, wget, git, jq, openssl, build-essential)..."

# Track if apt-get update was run to avoid redundant calls later
APT_UPDATED=false

all_packages_installed() {
    for pkg in curl wget git jq openssl make g++; do
        if ! command -v "$pkg" >/dev/null 2>&1; then
            return 1
        fi
    done
    return 0
}

if all_packages_installed; then
    log "All required packages already installed, skipping installation"
    echo " - All required packages already installed."
else
    case "$OS_TYPE" in
    arch)
        pacman -Sy --noconfirm --needed curl wget git jq openssl base-devel >/dev/null || true
        ;;
    alpine | postmarketos)
        sed -i '/^#.*\/community/s/^#//' /etc/apk/repositories
        apk update >/dev/null
        apk add curl wget git jq openssl build-base >/dev/null
        ;;
    ubuntu | debian | raspbian)
        apt-get update -y >/dev/null
        APT_UPDATED=true
        apt-get install -y curl wget git jq openssl build-essential >/dev/null
        ;;
    centos | fedora | rhel | ol | rocky | almalinux | amzn)
        if [ "$OS_TYPE" = "amzn" ]; then
            dnf install -y wget git jq openssl gcc make >/dev/null
        else
            if ! command -v dnf >/dev/null; then
                yum install -y dnf >/dev/null
            fi
            if ! command -v curl >/dev/null; then
                dnf install -y curl >/dev/null
            fi
            dnf install -y wget git jq openssl gcc make >/dev/null
        fi
        ;;
    sles | opensuse-leap | opensuse-tumbleweed)
        zypper refresh >/dev/null
        zypper install -y curl wget git jq openssl gcc make >/dev/null
        ;;
    *)
        echo "This script only supports Debian, Redhat, Arch Linux, or SLES based operating systems for now."
        exit
        ;;
    esac
    log "Required packages installed successfully"
fi
echo "     Done."

log_section "Step 2/7: Installing Docker"
echo "2/7 Installing Docker..."

if ! [ -x "$(command -v docker)" ]; then
    echo " - Docker is not installed. Installing Docker."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo " - Docker is installed."
fi

# Install Docker Compose if not present
if ! [ -x "$(command -v docker-compose)" ]; then
    echo " - Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo " - Docker Compose is installed."
fi

echo "     Done."

# Initialize Docker Swarm for application deployments
log_section "Step 2.5/7: Initializing Docker Swarm"
echo "2.5/7 Initializing Docker Swarm..."

if ! docker info | grep -q "Swarm: active"; then
    echo " - Initializing Docker Swarm..."
    docker swarm init || echo " - Docker Swarm already initialized or failed"
else
    echo " - Docker Swarm is already initialized."
fi

# Create dokploy-network as overlay network for Swarm
echo " - Creating dokploy-network overlay network..."
if ! docker network ls | grep -q dokploy-network; then
    docker network create --driver overlay dokploy-network || echo " - Network may already exist"
else
    echo " - dokploy-network already exists."
fi

echo "     Done."

log_section "Step 3/7: Installing Node.js and pnpm"
echo "3/7 Installing Node.js and pnpm..."

if ! [ -x "$(command -v node)" ]; then
    echo " - Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
else
    echo " - Node.js is installed."
fi

if ! [ -x "$(command -v pnpm)" ]; then
    echo " - Installing pnpm..."
    npm install -g pnpm
else
    echo " - pnpm is installed."
fi

echo "     Done."

log_section "Step 4/7: Installing PostgreSQL client"
echo "4/7 Installing PostgreSQL client..."

if ! [ -x "$(command -v psql)" ]; then
    echo " - Installing PostgreSQL client..."
    case "$OS_TYPE" in
    ubuntu | debian | raspbian)
        if [ "$APT_UPDATED" = false ]; then
            apt-get update -y >/dev/null
            APT_UPDATED=true
        fi
        apt-get install -y postgresql-client >/dev/null
        ;;
    centos | fedora | rhel | ol | rocky | almalinux | amzn)
        dnf install -y postgresql >/dev/null
        ;;
    arch)
        pacman -Sy --noconfirm --needed postgresql-client >/dev/null
        ;;
    *)
        echo "PostgreSQL client installation skipped for $OS_TYPE"
        ;;
    esac
else
    echo " - PostgreSQL client is installed."
fi

echo "     Done."

log_section "Step 5/7: Setting up R-Panel"
echo "5/7 Setting up R-Panel..."

# Add swap space if needed
if [ $(swapon --show | wc -l) -eq 0 ]; then
    echo " - Creating 4GB swap file for build process..."
    fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo " - Swap file created and enabled"
fi

mkdir -p /data/rpanel/{source,ssh,applications,databases,backups,services}
mkdir -p /data/rpanel/ssh/{keys,mux}

chown -R 9999:root /data/rpanel
chmod -R 700 /data/rpanel

INSTALLATION_LOG_WITH_DATE="/data/rpanel/source/installation-${DATE}.log"

exec > >(tee -a $INSTALLATION_LOG_WITH_DATE) 2>&1

cd /data/rpanel/source

# Clone repository
echo " - Cloning R-Panel repository..."

# Fix git ownership issue
git config --global --add safe.directory /data/rpanel/source 2>/dev/null || true

if [ -d ".git" ]; then
    echo " - Repository already exists, fetching and resetting to latest changes..."
    git fetch origin
    git reset --hard origin/main
elif [ "$(ls -A .)" ]; then
    echo " - Directory exists but is not a git repository. Removing and cloning fresh..."
    rm -rf ./*
    rm -rf .[!.]* .??*
    git clone https://github.com/Bishan-Pankaja/r-panel.git .
else
    git clone https://github.com/Bishan-Pankaja/r-panel.git .
fi

# Install dependencies
echo " - Installing dependencies..."
pnpm install

# Setup environment variables
echo " - Setting up environment..."
if [ -f "$ENV_FILE" ]; then
    echo " - Creating backup of existing .env file to .env-$DATE"
    cp "$ENV_FILE" "$ENV_FILE-$DATE"
else
    if [ -f .env.example ]; then
        cp .env.example "$ENV_FILE"
    else
        # Create basic .env file
        POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
        cat > "$ENV_FILE" <<EOL
# Database Configuration (Docker Compose - use 'postgres' hostname)
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/rpanel
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis Configuration (Docker Compose - use 'redis' hostname)
REDIS_URL=redis://redis:6379

# Application Configuration
APP_ID=$(openssl rand -hex 16)
APP_KEY=base64:$(openssl rand -base64 32)

# Auto-update (set to "false" to disable)
AUTOUPDATE=true
EOL
    fi
fi

# Update environment variables from script parameters
update_env_var() {
    local key="$1"
    local value="$2"

    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        echo " - Updated ${key}"
    else
        printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
        echo " - Added ${key}"
    fi
}

if [ -n "$ROOT_USERNAME" ] && [ -n "$ROOT_USER_EMAIL" ] && [ -n "$ROOT_USER_PASSWORD" ]; then
    echo " - Setting predefined root user credentials from environment"
    update_env_var "ROOT_USERNAME" "$ROOT_USERNAME"
    update_env_var "ROOT_USER_EMAIL" "$ROOT_USER_EMAIL"
    update_env_var "ROOT_USER_PASSWORD" "$ROOT_USER_PASSWORD"
fi

if [ "$AUTOUPDATE" = "false" ]; then
    update_env_var "AUTOUPDATE" "false"
fi

echo "     Done."

log_section "Step 6/7: Running database migrations"
echo "6/7 Running database migrations..."

# Extract database credentials from DATABASE_URL
if [ -f "$ENV_FILE" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2)
fi

if [ -n "$DATABASE_URL" ]; then
    echo " - Database URL found, running migrations..."
    
    # Parse DATABASE_URL
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    # Set defaults if parsing failed
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_USER=${DB_USER:-postgres}
    DB_NAME=${DB_NAME:-rpanel}
    
    echo " - Connecting to database at $DB_HOST:$DB_PORT as $DB_USER"
    
    # Run SQL migrations for subscription support
    echo " - Adding subscription support columns..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"subscriptionTier\" text;" 2>/dev/null || echo " - subscriptionTier column may already exist or failed"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"subscriptionEndDate\" timestamp;" 2>/dev/null || echo " - subscriptionEndDate column may already exist or failed"
    
    # Run drizzle migrations
    echo " - Running Drizzle ORM migrations..."
    if pnpm exec drizzle-kit migrate --config=apps/dokploy/server/db/drizzle.config.ts 2>/dev/null; then
        echo " - Drizzle migrations completed successfully"
    else
        echo " - Drizzle migrations skipped (drizzle-kit not found or already applied)"
    fi
    
    echo " - Database migrations completed."
else
    echo " - WARNING: DATABASE_URL not set in .env file"
    echo " - Please configure DATABASE_URL and run migrations manually:"
    echo "   pnpm drizzle-kit migrate --config=apps/dokploy/server/db/drizzle.config.ts"
    echo "   And manually run:"
    echo "   ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"subscriptionTier\" text;"
    echo "   ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"subscriptionEndDate\" timestamp;"
fi

echo "     Done."

log_section "Step 7/7: Building and starting R-Panel"
echo "7/7 Building and starting R-Panel..."

# Check available RAM
TOTAL_RAM=$(free -m | awk '/Mem:/ {print $2}')
echo " - Available RAM: ${TOTAL_RAM}MB"

if [ "$TOTAL_RAM" -lt 4096 ]; then
    echo " - WARNING: Less than 4GB RAM detected. Build may fail."
    echo " - Using pre-built Dokploy image instead of building from source..."
    echo " - Pulling dokploy/dokploy:latest image..."
    docker pull dokploy/dokploy:latest || {
        echo " - Failed to pull pre-built image."
        echo " - Your VPS has only ${TOTAL_RAM}MB RAM, which is insufficient for building."
        echo " - Please upgrade to a VPS with at least 4GB RAM or use a pre-built image."
        exit 1
    }
    docker tag dokploy/dokploy:latest rpanel:latest
else
    # Build application using Docker
    echo " - Building R-Panel Docker image..."
    docker build -t rpanel:latest . || {
        echo " - Docker build failed."
        echo " - Your VPS may not have enough RAM for building."
        exit 1
    }
fi

# Start application with Docker
echo " - Starting R-Panel with Docker..."
docker-compose -f /data/rpanel/source/docker-compose.yml up -d

echo " - Waiting for R-Panel to be ready..."
sleep 10

# Check if container is running
if docker ps | grep -q rpanel; then
    echo " - R-Panel is running!"
else
    echo " - WARNING: R-Panel container may not be running properly"
    echo " - Check logs with: docker-compose logs"
fi

echo "     Done."

echo ""
echo "=========================================="
echo "   Installation Complete!"
echo "=========================================="
echo ""

# Fetch public IP
IPV4_PUBLIC_IP=$(curl -4s --max-time 5 https://ifconfig.io 2>/dev/null || echo "unknown")

echo "Your R-Panel instance is ready to use!"
echo ""
if [ "$IPV4_PUBLIC_IP" != "unknown" ]; then
    echo "You can access R-Panel through your Public IPv4: http://$IPV4_PUBLIC_IP:3000"
fi

echo ""
echo "📝 Important:"
echo "   1. Backup your .env file: $ENV_FILE"
echo "   2. Update .env with your database credentials if needed"
echo "   3. Configure your domain name"
echo "   4. Set up SSL certificates"
echo ""
echo "📋 Installation log: $INSTALLATION_LOG_WITH_DATE"
echo ""

log_section "Installation Complete"
log "R-Panel installation completed successfully"
log "Log file: ${INSTALLATION_LOG_WITH_DATE}"
