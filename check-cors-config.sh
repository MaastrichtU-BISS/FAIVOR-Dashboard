#!/bin/bash

# FAIVOR Dashboard - CORS Configuration Checker
# This script helps diagnose CORS configuration issues

echo "================================"
echo "FAIVOR CORS Configuration Check"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "Running inside Docker container"
    ENV_CHECK_CMD="printenv"
else
    echo "Running on host - checking Docker containers"
    ENV_CHECK_CMD="docker-compose exec -T dashboard printenv"
fi

echo ""
echo "1. Checking environment variables..."
echo "-----------------------------------"

# Check PUBLIC_FAIVOR_BACKEND_URL
BACKEND_URL=$($ENV_CHECK_CMD PUBLIC_FAIVOR_BACKEND_URL 2>/dev/null)
if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ PUBLIC_FAIVOR_BACKEND_URL not set${NC}"
else
    echo -e "${GREEN}✓ PUBLIC_FAIVOR_BACKEND_URL: ${BACKEND_URL}${NC}"
fi

# Check ALLOWED_ORIGINS
ALLOWED_ORIGINS=$($ENV_CHECK_CMD ALLOWED_ORIGINS 2>/dev/null)
if [ -z "$ALLOWED_ORIGINS" ]; then
    echo -e "${RED}❌ ALLOWED_ORIGINS not set${NC}"
    echo -e "${YELLOW}   This will cause CORS errors!${NC}"
else
    echo -e "${GREEN}✓ ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}${NC}"
    
    # Check if only localhost
    if [[ "$ALLOWED_ORIGINS" == *"localhost"* ]] && [[ "$ALLOWED_ORIGINS" != *"https://"* ]]; then
        echo -e "${YELLOW}⚠️  Warning: Only localhost origins configured${NC}"
        echo -e "${YELLOW}   For remote access, add your domain to ALLOWED_ORIGINS${NC}"
    fi
fi

echo ""
echo "2. Checking Auth configuration..."
echo "---------------------------------"

AUTH_SECRET=$($ENV_CHECK_CMD AUTH_SECRET 2>/dev/null)
if [ -z "$AUTH_SECRET" ]; then
    echo -e "${RED}❌ AUTH_SECRET not set${NC}"
else
    echo -e "${GREEN}✓ AUTH_SECRET is set${NC}"
fi

echo ""
echo "3. Testing backend connectivity..."
echo "----------------------------------"

if [ -f /.dockerenv ]; then
    # Inside container
    if curl -f -s -o /dev/null http://faivor-backend:8000/; then
        echo -e "${GREEN}✓ Backend is accessible from dashboard${NC}"
    else
        echo -e "${RED}❌ Cannot reach backend at http://faivor-backend:8000/${NC}"
    fi
else
    # On host
    if docker-compose exec -T dashboard curl -f -s -o /dev/null http://faivor-backend:8000/ 2>/dev/null; then
        echo -e "${GREEN}✓ Backend is accessible from dashboard${NC}"
    else
        echo -e "${RED}❌ Cannot reach backend at http://faivor-backend:8000/${NC}"
    fi
fi

echo ""
echo "4. Checking Docker container status..."
echo "--------------------------------------"

if [ ! -f /.dockerenv ]; then
    DASHBOARD_STATUS=$(docker-compose ps dashboard 2>/dev/null | grep dashboard | awk '{print $4}')
    BACKEND_STATUS=$(docker-compose ps faivor-backend 2>/dev/null | grep faivor-backend | awk '{print $4}')
    
    if [ -z "$DASHBOARD_STATUS" ]; then
        echo -e "${RED}❌ Dashboard container not running${NC}"
    else
        echo -e "${GREEN}✓ Dashboard: ${DASHBOARD_STATUS}${NC}"
    fi
    
    if [ -z "$BACKEND_STATUS" ]; then
        echo -e "${RED}❌ Backend container not running${NC}"
    else
        echo -e "${GREEN}✓ Backend: ${BACKEND_STATUS}${NC}"
    fi
fi

echo ""
echo "================================"
echo "Recommendations"
echo "================================"
echo ""

# Generate recommendations based on findings
if [ -z "$ALLOWED_ORIGINS" ]; then
    echo -e "${YELLOW}1. Set ALLOWED_ORIGINS in your .env-test file${NC}"
    echo "   Example: ALLOWED_ORIGINS=\"https://yourdomain.com\""
    echo ""
fi

if [[ "$ALLOWED_ORIGINS" == *"localhost"* ]] && [[ "$ALLOWED_ORIGINS" != *"https://"* ]]; then
    echo -e "${YELLOW}2. For remote access, add your domain to ALLOWED_ORIGINS${NC}"
    echo "   Get your domain with: window.location.origin (in browser console)"
    echo "   Then add it: ALLOWED_ORIGINS=\"http://localhost:3000,https://yourdomain.com\""
    echo ""
fi

echo "3. After changing .env-test, restart containers:"
echo "   docker-compose down && docker-compose up -d"
echo ""

echo "4. Clear browser cache or use incognito mode for testing"
echo ""

echo "For more help, see: docs/LOGIN-CORS-FIX.md"
echo ""
