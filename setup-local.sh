#!/bin/bash

# FAIVOR Dashboard - Quick Local Setup Script
# This script downloads the necessary files and starts the application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs for downloading files
DOCKER_COMPOSE_URL="https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/docker-compose.local.yml"
ENV_FILE_URL="https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/.env.local.example"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FAIVOR Dashboard - Quick Local Setup        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print error and exit
error_exit() {
    echo -e "${RED}✗ Error: $1${NC}" >&2
    exit 1
}

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Docker is installed
echo -e "${BLUE}[1/6]${NC} Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    error_exit "Docker is not installed. Please install Docker first:
    
    For Ubuntu/Debian:
      curl -fsSL https://get.docker.com -o get-docker.sh
      sudo sh get-docker.sh
      
    For macOS:
      Download from https://www.docker.com/products/docker-desktop
      
    For Windows:
      Download from https://www.docker.com/products/docker-desktop"
fi
success "Docker is installed: $(docker --version)"

# Check if Docker is running
echo -e "${BLUE}[2/6]${NC} Checking if Docker daemon is running..."
if ! docker info &> /dev/null; then
    error_exit "Docker is installed but not running. Please start Docker and try again."
fi
success "Docker daemon is running"

# Check if Docker Compose is available
echo -e "${BLUE}[3/6]${NC} Checking Docker Compose..."
if ! docker compose version &> /dev/null; then
    error_exit "Docker Compose is not available. Please install Docker Compose:
    
    It's included with Docker Desktop, or install separately:
      https://docs.docker.com/compose/install/"
fi
success "Docker Compose is available: $(docker compose version)"

# Download docker-compose.local.yml
echo -e "${BLUE}[4/6]${NC} Downloading docker-compose.local.yml..."
if [ -f "docker-compose.local.yml" ]; then
    warning "docker-compose.local.yml already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Keeping existing docker-compose.local.yml"
    else
        curl -fsSL "$DOCKER_COMPOSE_URL" -o docker-compose.local.yml || error_exit "Failed to download docker-compose.local.yml"
        success "Downloaded docker-compose.local.yml"
    fi
else
    curl -fsSL "$DOCKER_COMPOSE_URL" -o docker-compose.local.yml || error_exit "Failed to download docker-compose.local.yml"
    success "Downloaded docker-compose.local.yml"
fi

# Download and setup .env.local
echo -e "${BLUE}[5/6]${NC} Setting up environment file..."
if [ -f ".env.local" ]; then
    warning ".env.local already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Keeping existing .env.local"
    else
        curl -fsSL "$ENV_FILE_URL" -o .env.local || error_exit "Failed to download .env.local"
        success "Downloaded .env.local"
    fi
else
    curl -fsSL "$ENV_FILE_URL" -o .env.local || error_exit "Failed to download .env.local"
    success "Created .env.local"
fi

# Generate AUTH_SECRET if needed
if grep -q "your-local-development-secret-change-this" .env.local; then
    info "Generating secure AUTH_SECRET..."
    if command -v openssl &> /dev/null; then
        NEW_SECRET=$(openssl rand -base64 32)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-local-development-secret-change-this/$NEW_SECRET/" .env.local
        else
            # Linux
            sed -i "s/your-local-development-secret-change-this/$NEW_SECRET/" .env.local
        fi
        success "Generated secure AUTH_SECRET"
    else
        warning "openssl not found. Please manually update AUTH_SECRET in .env.local"
    fi
fi

# Start the application
echo -e "${BLUE}[6/6]${NC} Starting FAIVOR Dashboard..."
echo ""
info "Pulling Docker images (this may take a few minutes on first run)..."
docker compose -f docker-compose.local.yml pull || error_exit "Failed to pull Docker images"

echo ""
info "Starting containers..."
docker compose -f docker-compose.local.yml up -d || error_exit "Failed to start containers"

echo ""
success "FAIVOR Dashboard is starting up!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Complete!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Application URL:${NC} http://localhost:3000"
echo ""
echo -e "${YELLOW}⏳ Please wait 10-20 seconds for the application to fully start${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs:          ${GREEN}docker compose -f docker-compose.local.yml logs -f${NC}"
echo -e "  Stop application:   ${GREEN}docker compose -f docker-compose.local.yml down${NC}"
echo -e "  Restart:            ${GREEN}docker compose -f docker-compose.local.yml restart${NC}"
echo -e "  View status:        ${GREEN}docker compose -f docker-compose.local.yml ps${NC}"
echo ""
echo -e "${BLUE}Opening browser in 5 seconds...${NC}"

# Wait a bit for services to start
sleep 5

# Try to open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &> /dev/null &
elif command -v open &> /dev/null; then
    open http://localhost:3000 &> /dev/null &
elif command -v start &> /dev/null; then
    start http://localhost:3000 &> /dev/null &
else
    echo -e "${YELLOW}Could not auto-open browser. Please navigate to: http://localhost:3000${NC}"
fi

echo ""
echo -e "${GREEN}✓ All done! Enjoy FAIVOR Dashboard! 🎉${NC}"
