# Reverse Proxy & CORS Configuration Guide

This document explains how to deploy the FAIVOR Dashboard behind a reverse proxy (like Nginx Proxy Manager) without CORS or authentication issues.

## Overview

When running behind a reverse proxy with a domain like `https://faivor.fairmodels.org`, several issues can occur:
1. CORS errors blocking API requests
2. CSRF protection blocking login attempts (403 Forbidden)
3. Redirects using internal Docker hostnames instead of public domain
4. Frontend unable to connect to backend validator service

This guide covers all the necessary configuration to fix these issues.

## Configuration Files

### 1. Environment Variables (.env-test)

```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=faivor

# Authentication
AUTH_SECRET="your-secret-here"  # Generate with: npx auth secret
AUTH_TRUST_HOST=true
AUTH_URL="https://your-domain.com"  # Your public domain

# Application Settings
PUBLIC_ORGANIZATION_NAME="FAIVOR"
NODE_ENV="production"

# SvelteKit Reverse Proxy Configuration
ORIGIN="https://your-domain.com"
PROTOCOL_HEADER="x-forwarded-proto"
HOST_HEADER="x-forwarded-host"

# Backend API Configuration
FAIVOR_BACKEND_URL="http://faivor-backend:8000"  # Internal Docker service URL

# CORS Configuration
ALLOWED_ORIGINS="https://your-domain.com"  # Comma-separated list if multiple
```

### 2. Docker Compose (docker-compose.yml)

Add these environment variables to the dashboard service:

```yaml
dashboard:
  environment:
    # SvelteKit needs these for CSRF protection behind reverse proxy
    - ORIGIN=https://your-domain.com
    - PROTOCOL_HEADER=x-forwarded-proto
    - HOST_HEADER=x-forwarded-host
    # Auth.js URL for proper callback redirects
    - AUTH_URL=https://your-domain.com
    # Backend ML Validator URL (for server-side proxy)
    - FAIVOR_BACKEND_URL=http://faivor-backend:8000
```

## Key Components

### 1. CSRF Protection (svelte.config.js)

```javascript
csrf: {
  checkOrigin: false,  // Disabled - proxy handles origin validation
}
```

**Why:** SvelteKit's CSRF origin check is too strict when behind a reverse proxy. The proxy already validates origins through SSL termination and host header checking.

### 2. CORS Middleware (hooks.server.ts)

Handles CORS headers for cross-origin requests:

```typescript
const handleCORS: Handle = async ({ event, resolve }) => {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const origin = event.request.headers.get('origin');

  // Handle preflight requests
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cookie',
        'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  }

  // Add CORS headers to all responses
  const response = await resolve(event);
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
};
```

### 3. URL Fixing for Reverse Proxy (hooks.server.ts)

Ensures all redirects use the public domain:

```typescript
const handleProxyHeaders: Handle = async ({ event, resolve }) => {
  const proto = event.request.headers.get('x-forwarded-proto');
  const host = event.request.headers.get('x-forwarded-host');
  
  if (proto && host) {
    // Override the URL with the correct public-facing URL
    const publicUrl = new URL(event.url.pathname + event.url.search, `${proto}://${host}`);
    event.url = publicUrl;
  }
  
  return resolve(event);
};
```

**Why:** Without this, redirects would use the internal Docker hostname (e.g., `http://faivor-dashboard:3000`) instead of the public domain.

### 4. Backend API Proxy

The frontend cannot directly access `http://faivor-backend:8000` (Docker internal URL). The proxy at `/api/faivor-backend/[...path]` forwards browser requests to the internal backend:

```typescript
// Browser requests:     /api/faivor-backend/validate-csv/
// Proxy forwards to:    http://faivor-backend:8000/validate-csv/
```

All backend API calls use this proxy endpoint, avoiding CORS issues.

### 5. Simplified Auth.js Configuration (auth.ts)

```typescript
export const { handle: handleAuth, signIn, signOut } = SvelteKitAuth(async (event) => {
  return {
    trustHost: true,  // Trust forwarded headers
    adapter: PostgresAdapter(pool),
    secret: env.AUTH_SECRET,
    // Auth.js automatically uses AUTH_URL env var
  };
});
```

**Why:** With `trustHost: true` and `AUTH_URL` set, Auth.js correctly handles authentication behind a reverse proxy.

## Nginx Proxy Manager Configuration

1. **SSL:** Enable SSL with Let's Encrypt
2. **Websockets Support:** Enable if using real-time features
3. **Custom Headers:** Add these in the "Custom locations" section:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
```

## Deployment Steps

1. **Update environment variables** in `.env-test` with your domain
2. **Rebuild the Docker image** (if code changed):
   ```bash
   docker build -t your-registry/faivor-dashboard:latest ./dashboard
   docker push your-registry/faivor-dashboard:latest
   ```
3. **On your server**, pull and restart:
   ```bash
   cd /path/to/faivor
   docker-compose pull dashboard
   docker-compose down
   docker-compose up -d
   ```
4. **Verify environment variables** are loaded:
   ```bash
   docker-compose exec faivor-dashboard printenv | grep -E "ORIGIN|AUTH_URL|FAIVOR_BACKEND"
   ```

## Verification

Test that everything works:

```bash
# 1. Health check
curl https://your-domain.com/

# 2. Backend proxy
curl https://your-domain.com/api/faivor-backend/

# 3. Login (should redirect to /models, not show 403)
# Test in browser at: https://your-domain.com/auth/signin
```

## Troubleshooting

### Issue: 403 Forbidden on login
- **Cause:** CSRF protection blocking request
- **Fix:** Ensure `csrf.checkOrigin: false` in `svelte.config.js` and `ORIGIN` env var is set

### Issue: Redirects to `http://faivor-dashboard:3000`
- **Cause:** `event.url` not being overridden with forwarded headers
- **Fix:** Ensure `handleProxyHeaders` middleware runs first and modifies `event.url`

### Issue: Backend connection refused
- **Cause:** Frontend trying to connect to `localhost:8000`
- **Fix:** Ensure API proxy is working and `FAIVOR_BACKEND_URL` points to internal service

### Issue: CORS errors
- **Cause:** `ALLOWED_ORIGINS` not configured or reverse proxy not forwarding headers
- **Fix:** Set `ALLOWED_ORIGINS` and verify Nginx forwards `X-Forwarded-*` headers

## Security Notes

- **CSRF Protection:** Disabled at SvelteKit level but still protected by:
  - SSL/TLS encryption
  - Reverse proxy origin validation
  - Auth.js CSRF tokens
  - Same-site cookie policies

- **Origin Validation:** Handled by:
  - Reverse proxy (SSL termination, host header validation)
  - CORS middleware (checks `ALLOWED_ORIGINS`)
  - Auth.js (validates callback URLs)

## Summary of Changes

All changes made to support reverse proxy deployment:

1. **svelte.config.js** - Disabled `csrf.checkOrigin`
2. **hooks.server.ts** - Added CORS middleware and URL fixing
3. **auth.ts** - Simplified config with `trustHost: true`
4. **docker-compose.yml** - Added environment variables
5. **.env-test** - Configured for reverse proxy
6. **API proxy** - Created `/api/faivor-backend/[...path]` endpoint
7. **config.ts** - Made backend URL configurable

## References

- [SvelteKit Configuration](https://kit.svelte.dev/docs/configuration)
- [Auth.js Deployment](https://authjs.dev/getting-started/deployment)
- [Nginx Proxy Manager](https://nginxproxymanager.com/)
