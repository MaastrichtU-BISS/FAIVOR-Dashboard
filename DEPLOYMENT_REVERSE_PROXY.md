# Deployment Behind Reverse Proxy (Nginx Proxy Manager)

This guide explains how to deploy FAIVOR Dashboard behind a reverse proxy like Nginx Proxy Manager.

## Issue: Internal Hostname in Redirects

When deployed behind a reverse proxy, authentication redirects may use the internal Docker hostname (e.g., `http://faivor-dashboard:3000`) instead of the public domain. This happens because the application needs to know its public-facing URL.

## Solution

### 1. Configure Environment Variables

Create a production environment file (`.env.production`) based on `.env.production.example`:

```bash
cp .env.production.example .env.production
```

**Critical settings for reverse proxy:**

```bash
# Set to your public domain
AUTH_URL="https://yourdomain.com"
ORIGIN="https://yourdomain.com"

# Enable proxy header reading
PROTOCOL_HEADER="x-forwarded-proto"
HOST_HEADER="x-forwarded-host"

# CORS configuration
ALLOWED_ORIGINS="https://yourdomain.com"
```

### 2. Update docker-compose.yml

The `dashboard` service must read these environment variables:

```yaml
dashboard:
  environment:
    - ORIGIN=${ORIGIN:-http://localhost:3000}
    - PROTOCOL_HEADER=x-forwarded-proto
    - HOST_HEADER=x-forwarded-host
    - AUTH_URL=${AUTH_URL:-http://localhost:3000}
    - FAIVOR_BACKEND_URL=http://faivor-backend:8000
```

### 3. Configure Nginx Proxy Manager

In your Nginx Proxy Manager configuration, ensure these headers are forwarded:

**Advanced Tab → Custom Nginx Configuration:**

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

### 4. Deploy

```bash
# Use the production environment file
docker compose --env-file .env.production up -d
```

## How It Works

1. **Nginx forwards headers**: `X-Forwarded-Proto` (https) and `X-Forwarded-Host` (yourdomain.com)
2. **handleProxyHeaders middleware** (runs first): Reads these headers and updates `event.url` to use the public URL
3. **Auth.js redirect callback**: 
   - Detects internal hostnames (Docker service names, localhost, etc.)
   - Automatically replaces them with the public URL from forwarded headers
   - Falls back to `AUTH_URL` environment variable if headers aren't present
   - Handles any Docker Compose service name dynamically (not hardcoded)
4. **Result**: All redirects use `https://yourdomain.com` instead of internal Docker hostnames

### Internal Hostname Detection

The system automatically detects and replaces these types of internal URLs:
- `http://localhost:3000/*` → `https://yourdomain.com/*`
- `http://127.0.0.1:3000/*` → `https://yourdomain.com/*`
- `http://faivor-dashboard:3000/*` → `https://yourdomain.com/*`
- `http://any-docker-service:3000/*` → `https://yourdomain.com/*`

This works dynamically based on hostname patterns, so it will work regardless of your Docker Compose service name.

## Verification

After deployment, check that:

1. Login redirects to your public domain
2. Logout redirects to your public domain  
3. No references to `faivor-dashboard:3000` appear in browser

## Troubleshooting

**Still seeing internal hostname?**

1. **Check container logs for Auth redirect information:**
   ```bash
   docker logs -f faivor-dashboard-1 2>&1 | grep "Auth Redirect"
   ```
   
   You should see:
   ```
   [Auth Redirect] X-Forwarded-Proto: https, X-Forwarded-Host: yourdomain.com
   [Auth Redirect] Correct Base URL: https://yourdomain.com
   ```

2. **Check Nginx is forwarding headers:**
   ```bash
   # In dashboard container logs, you should also see:
   [Proxy] X-Forwarded-Proto: https, X-Forwarded-Host: yourdomain.com
   ```

3. **Verify environment variables are set:**
   ```bash
   docker exec faivor-dashboard-1 env | grep -E "(AUTH_URL|ORIGIN|PROTOCOL_HEADER)"
   ```

4. **Check that docker-compose.yml passes environment variables correctly**

5. **Restart containers after changing environment variables:**
   ```bash
   docker compose down
   docker compose --env-file .env.production up -d
   ```

6. **If headers are not being forwarded:**
   - Check Nginx Proxy Manager's "Advanced" tab for the proxy host
   - Ensure custom configuration includes the proxy headers
   - Test with: `curl -I https://yourdomain.com` and check response headers
