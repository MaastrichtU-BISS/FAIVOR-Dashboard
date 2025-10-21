# CORS Configuration for Reverse Proxy Deployments

## Overview

This document explains how to properly configure CORS (Cross-Origin Resource Sharing) when deploying the FAIVOR Dashboard behind a reverse proxy (e.g., Nginx, Traefik, Apache).

## Problem

When running the application behind a reverse proxy on a remote server, you may encounter CORS errors because:

1. The backend URL was hardcoded to `http://localhost:8000`
2. CORS headers weren't being set for cross-origin requests
3. The application didn't support configurable origins

## Solution

The application now supports full CORS configuration through environment variables.

## Environment Variables

### `PUBLIC_FAIVOR_BACKEND_URL`

Specifies the URL of the FAIVOR ML Validator backend.

**Examples:**

```bash
# Local development
PUBLIC_FAIVOR_BACKEND_URL="http://localhost:8000"

# Docker Compose (service name)
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"

# Remote server with reverse proxy
PUBLIC_FAIVOR_BACKEND_URL="https://api.yourdomain.com"

# Behind reverse proxy with subpath
PUBLIC_FAIVOR_BACKEND_URL="https://yourdomain.com/api"
```

### `ALLOWED_ORIGINS`

Comma-separated list of allowed origins for CORS requests.

**Examples:**

```bash
# Development (multiple local ports)
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# Production with single domain
ALLOWED_ORIGINS="https://yourdomain.com"

# Production with multiple domains
ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com,https://www.yourdomain.com"

# Development only - allow all origins (NOT RECOMMENDED for production)
ALLOWED_ORIGINS="*"
```

## Configuration Examples

### Local Development

```env
PUBLIC_FAIVOR_BACKEND_URL="http://localhost:8000"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

### Docker Compose

```env
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### Production with Nginx Reverse Proxy

Assuming your setup:
- Frontend: `https://app.yourdomain.com`
- Backend API: `https://api.yourdomain.com`

```env
PUBLIC_FAIVOR_BACKEND_URL="https://api.yourdomain.com"
ALLOWED_ORIGINS="https://app.yourdomain.com"
```

### Production with Single Domain and Subpaths

Assuming your setup:
- Frontend: `https://yourdomain.com`
- Backend API: `https://yourdomain.com/api`

```env
PUBLIC_FAIVOR_BACKEND_URL="https://yourdomain.com/api"
ALLOWED_ORIGINS="https://yourdomain.com"
```

## Nginx Configuration Example

Here's an example Nginx configuration for reverse proxy:

```nginx
# Frontend (SvelteKit Dashboard)
server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (optional if application handles it)
        add_header 'Access-Control-Allow-Origin' 'https://app.yourdomain.com' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

## Traefik Configuration Example

For Traefik v2+ with Docker Compose:

```yaml
version: '3.8'

services:
  dashboard:
    image: ghcr.io/maastrichtu-biss/faivor-dashboard:latest
    environment:
      - PUBLIC_FAIVOR_BACKEND_URL=https://api.yourdomain.com
      - ALLOWED_ORIGINS=https://app.yourdomain.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"

  faivor-backend:
    image: ghcr.io/maastrichtu-biss/faivor-ml-validator:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      # CORS middleware
      - "traefik.http.middlewares.cors.headers.accesscontrolallowmethods=GET,POST,PUT,DELETE,OPTIONS"
      - "traefik.http.middlewares.cors.headers.accesscontrolalloworiginlist=https://app.yourdomain.com"
      - "traefik.http.middlewares.cors.headers.accesscontrolallowcredentials=true"
      - "traefik.http.routers.backend.middlewares=cors"
```

## Troubleshooting

### CORS Errors Still Occurring

1. **Check environment variables are loaded:**
   ```bash
   docker-compose exec dashboard env | grep PUBLIC_FAIVOR_BACKEND_URL
   docker-compose exec dashboard env | grep ALLOWED_ORIGINS
   ```

2. **Verify the correct origin is being sent:**
   - Open browser DevTools → Network tab
   - Look at the `Origin` header in the request
   - Ensure it matches one of your `ALLOWED_ORIGINS`

3. **Check for multiple CORS header sources:**
   - If both your reverse proxy AND the application set CORS headers, this can cause conflicts
   - Choose one location to handle CORS (preferably the application)

### Backend Connection Errors

1. **Verify backend URL is accessible:**
   ```bash
   # From within the dashboard container
   docker-compose exec dashboard curl http://faivor-backend:8000
   ```

2. **Check Docker network:**
   ```bash
   docker network inspect faivor_default
   ```

3. **Verify service names in docker-compose.yml match environment variables**

### Preflight (OPTIONS) Requests Failing

The application now handles OPTIONS requests automatically. If they're still failing:

1. Check if your reverse proxy is intercepting OPTIONS requests
2. Ensure CORS middleware is placed first in the middleware chain
3. Verify `Access-Control-Max-Age` is set appropriately

## Security Best Practices

1. **Never use `ALLOWED_ORIGINS="*"` in production**
   - Always specify exact domains
   - Include protocol (`https://`) and don't use wildcards

2. **Use HTTPS in production**
   - Set `PUBLIC_FAIVOR_BACKEND_URL` to use `https://`
   - Ensure your reverse proxy terminates SSL/TLS

3. **Keep origins specific**
   ```bash
   # Good
   ALLOWED_ORIGINS="https://app.yourdomain.com"
   
   # Bad (too permissive)
   ALLOWED_ORIGINS="*"
   ALLOWED_ORIGINS="http://yourdomain.com,https://yourdomain.com,http://www.yourdomain.com,..."
   ```

4. **Limit CORS to necessary endpoints**
   - The current implementation applies CORS globally
   - Consider restricting to API routes only if needed

## Testing

### Test Local Setup

```bash
# Terminal 1: Start services
docker-compose up

# Terminal 2: Test backend health
curl http://localhost:8000/

# Terminal 3: Test CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3000/api/models
```

### Test Production Setup

```bash
# Test backend health
curl https://api.yourdomain.com/

# Test CORS from allowed origin
curl -H "Origin: https://app.yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://app.yourdomain.com/api/models

# Should return CORS headers:
# Access-Control-Allow-Origin: https://app.yourdomain.com
# Access-Control-Allow-Credentials: true
```

## Migration from Old Setup

If you're upgrading from a version without CORS configuration:

1. **Update `.env` file:**
   ```bash
   cp _example.env .env
   # Edit .env and add the new variables
   ```

2. **Update Docker deployment:**
   ```bash
   # Pull latest images
   docker-compose pull
   
   # Update environment in docker-compose or .env-test
   
   # Restart services
   docker-compose down
   docker-compose up -d
   ```

3. **Verify configuration:**
   ```bash
   docker-compose logs dashboard | grep CORS
   ```

## Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [SvelteKit Hooks Documentation](https://kit.svelte.dev/docs/hooks)
- [Docker Networking](https://docs.docker.com/network/)
