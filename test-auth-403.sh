#!/bin/bash

# Test script for FAIVOR authentication with reverse proxy
# Usage: ./test-auth-403.sh https://faivor.fairmodels.org

DOMAIN="${1:-https://faivor.fairmodels.org}"

echo "========================================"
echo "FAIVOR Auth 403 Debugging"
echo "Domain: $DOMAIN"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Test 1: Root endpoint${NC}"
echo "---------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "303" ]; then
    echo -e "${GREEN}✓ Root accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Root returned HTTP $HTTP_CODE${NC}"
fi
echo ""

echo -e "${BLUE}Test 2: Auth signin endpoint${NC}"
echo "---------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/auth/signin")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ Auth signin accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Auth signin returned HTTP $HTTP_CODE${NC}"
fi
echo ""

echo -e "${BLUE}Test 3: OPTIONS preflight for auth callback${NC}"
echo "---------------------------------------"
echo "Testing: $DOMAIN/auth/callback/credentials"
RESPONSE=$(curl -s -i -X OPTIONS "$DOMAIN/auth/callback/credentials" \
  -H "Origin: $DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type")

HTTP_CODE=$(echo "$RESPONSE" | grep -i "^HTTP" | awk '{print $2}')
CORS_ORIGIN=$(echo "$RESPONSE" | grep -i "^Access-Control-Allow-Origin:" | cut -d' ' -f2 | tr -d '\r')
CORS_CREDS=$(echo "$RESPONSE" | grep -i "^Access-Control-Allow-Credentials:" | cut -d' ' -f2 | tr -d '\r')
SERVER=$(echo "$RESPONSE" | grep -i "^Server:" | cut -d' ' -f2- | tr -d '\r')

echo "HTTP Code: $HTTP_CODE"
echo "Server: $SERVER"
echo "CORS Allow-Origin: $CORS_ORIGIN"
echo "CORS Allow-Credentials: $CORS_CREDS"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}✓ OPTIONS request successful${NC}"
else
    echo -e "${YELLOW}⚠ OPTIONS returned HTTP $HTTP_CODE${NC}"
fi

if [ -z "$CORS_ORIGIN" ]; then
    echo -e "${RED}✗ No CORS headers found!${NC}"
    echo -e "${YELLOW}  This suggests your reverse proxy is blocking or not forwarding CORS headers${NC}"
else
    echo -e "${GREEN}✓ CORS headers present${NC}"
fi
echo ""

echo -e "${BLUE}Test 4: POST to auth callback${NC}"
echo "---------------------------------------"
echo "Testing actual POST request..."
RESPONSE=$(curl -s -i -X POST "$DOMAIN/auth/callback/credentials" \
  -H "Origin: $DOMAIN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}')

HTTP_CODE=$(echo "$RESPONSE" | grep -i "^HTTP" | awk '{print $2}')
CORS_ORIGIN=$(echo "$RESPONSE" | grep -i "^Access-Control-Allow-Origin:" | cut -d' ' -f2 | tr -d '\r')
SERVER=$(echo "$RESPONSE" | grep -i "^Server:" | cut -d' ' -f2- | tr -d '\r')

echo "HTTP Code: $HTTP_CODE"
echo "Server: $SERVER"
echo "CORS Allow-Origin: $CORS_ORIGIN"

if [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}✗ 403 Forbidden - This is your issue!${NC}"
    echo ""
    echo -e "${YELLOW}The 403 is likely coming from:${NC}"
    if [ ! -z "$SERVER" ]; then
        echo "  • Your reverse proxy: $SERVER"
    fi
    echo "  • Check your Nginx/Traefik/Apache configuration"
    echo "  • Make sure X-Forwarded-* headers are set"
    echo "  • Remove any CORS rules from reverse proxy"
else
    echo -e "${GREEN}✓ POST request returned HTTP $HTTP_CODE${NC}"
fi

if [ -z "$CORS_ORIGIN" ] && [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}✗ 403 response missing CORS headers${NC}"
    echo -e "${YELLOW}  The reverse proxy is blocking before reaching the app${NC}"
fi
echo ""

echo -e "${BLUE}Test 5: Direct container access${NC}"
echo "---------------------------------------"
if command -v docker-compose &> /dev/null; then
    echo "Testing direct access to dashboard container..."
    CONTAINER_RESPONSE=$(docker-compose exec -T dashboard curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
    if [ ! -z "$CONTAINER_RESPONSE" ]; then
        if [ "$CONTAINER_RESPONSE" = "200" ] || [ "$CONTAINER_RESPONSE" = "302" ]; then
            echo -e "${GREEN}✓ Direct container access works (HTTP $CONTAINER_RESPONSE)${NC}"
            echo -e "${YELLOW}  → The issue is with your reverse proxy, not the app${NC}"
        else
            echo -e "${RED}✗ Direct container access failed (HTTP $CONTAINER_RESPONSE)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Could not test direct container access${NC}"
    fi
else
    echo -e "${YELLOW}⚠ docker-compose not found, skipping direct test${NC}"
fi
echo ""

echo "========================================"
echo "Summary & Recommendations"
echo "========================================"
echo ""

if [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}🚨 403 Forbidden Error Detected${NC}"
    echo ""
    echo "Likely causes:"
    echo "1. Reverse proxy blocking POST requests"
    echo "2. Missing X-Forwarded-Proto, X-Forwarded-Host headers"
    echo "3. CORS misconfiguration in reverse proxy"
    echo "4. ModSecurity or firewall blocking"
    echo ""
    echo "Actions to take:"
    echo ""
    echo "1️⃣  Check your reverse proxy logs:"
    if [[ "$SERVER" == *"nginx"* ]]; then
        echo "   sudo tail -f /var/log/nginx/error.log"
    elif [[ "$SERVER" == *"traefik"* ]]; then
        echo "   docker-compose logs -f traefik"
    else
        echo "   Check your reverse proxy error logs"
    fi
    echo ""
    echo "2️⃣  Verify reverse proxy configuration:"
    echo "   See: docs/403-FORBIDDEN-FIX.md"
    echo "   Ensure these headers are set:"
    echo "   • X-Forwarded-Proto"
    echo "   • X-Forwarded-Host"
    echo "   • X-Forwarded-For"
    echo ""
    echo "3️⃣  Remove CORS from reverse proxy:"
    echo "   Let the SvelteKit app handle CORS"
    echo "   Remove any 'add_header Access-Control-*' directives"
    echo ""
    echo "4️⃣  Restart services:"
    echo "   docker-compose down && docker-compose up -d"
    echo "   sudo systemctl restart nginx  # or your proxy"
else
    echo -e "${GREEN}✓ No obvious issues detected${NC}"
    echo ""
    echo "If you're still having problems:"
    echo "1. Clear browser cache"
    echo "2. Try incognito mode"
    echo "3. Check browser console for detailed errors"
fi

echo ""
echo "For more help: docs/403-FORBIDDEN-FIX.md"
echo ""
