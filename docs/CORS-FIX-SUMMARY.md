# CORS Fix Summary

## Changes Made

This fix addresses CORS (Cross-Origin Resource Sharing) issues when running the FAIVOR Dashboard behind a reverse proxy on a remote server.

### 1. Configuration Files Updated

#### `dashboard/_example.env`
Added new environment variables:
```env
PUBLIC_FAIVOR_BACKEND_URL="http://localhost:8000"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

#### `.env-test`
Updated for Docker deployment:
```env
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000,http://localhost:8080"
```

### 2. Source Code Changes

#### `dashboard/src/lib/config.ts`
Added export for backend URL configuration:
```typescript
export const PUBLIC_FAIVOR_BACKEND_URL = import.meta.env.PUBLIC_FAIVOR_BACKEND_URL || 'http://localhost:8000';
```

#### `dashboard/src/lib/api/faivor-backend.ts`
Changed hardcoded URL to use environment variable:
```typescript
// Before
private static readonly BASE_URL = "http://localhost:8000";

// After
import { PUBLIC_FAIVOR_BACKEND_URL } from '$lib/config';
private static readonly BASE_URL = PUBLIC_FAIVOR_BACKEND_URL;
```

#### `dashboard/src/hooks.server.ts`
Added CORS middleware handler:
```typescript
const handleCORS: Handle = async ({ event, resolve }) => {
  // Handles CORS headers for all requests
  // Supports preflight OPTIONS requests
  // Reads allowed origins from ALLOWED_ORIGINS env var
};

// Added to middleware sequence
export const handle = sequence(handleCORS, handleAuth, handleProtectedRoutes, protectRoute());
```

### 3. Documentation Added

#### `docs/CORS-CONFIGURATION.md`
Comprehensive guide covering:
- Problem explanation
- Environment variable configuration
- Nginx and Traefik examples
- Security best practices
- Troubleshooting steps

#### `docs/REVERSE-PROXY-SETUP.md`
Quick start guide with:
- Step-by-step setup instructions
- Common deployment scenarios
- Production checklist
- Quick troubleshooting fixes

## How It Works

### CORS Flow

1. **Browser makes request** to `https://yourdomain.com/api/...`
2. **Browser sends preflight** OPTIONS request with `Origin` header
3. **SvelteKit CORS middleware** (`handleCORS` in hooks.server.ts):
   - Checks if origin is in `ALLOWED_ORIGINS`
   - Returns appropriate CORS headers
4. **Browser receives CORS headers** and allows/blocks the request

### Backend URL Resolution

1. **Environment variable** `PUBLIC_FAIVOR_BACKEND_URL` is set
2. **Build time**: Vite injects the value via `import.meta.env`
3. **Runtime**: `FaivorBackendAPI` uses the configured URL
4. **Requests** go to the correct backend (local, Docker, or remote)

## Configuration Examples

### Local Development
```env
PUBLIC_FAIVOR_BACKEND_URL="http://localhost:8000"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

### Docker Compose
```env
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"
ALLOWED_ORIGINS="http://localhost:3000"
```

### Production (Reverse Proxy)
```env
PUBLIC_FAIVOR_BACKEND_URL="https://api.yourdomain.com"
ALLOWED_ORIGINS="https://app.yourdomain.com"
```

## Deployment Steps

1. **Update environment file** (`.env` or `.env-test`):
   ```bash
   PUBLIC_FAIVOR_BACKEND_URL="<your-backend-url>"
   ALLOWED_ORIGINS="<your-frontend-domains>"
   ```

2. **Rebuild Docker image** (if using Dockerfile that copies .env):
   ```bash
   docker-compose build dashboard
   ```

3. **Restart services**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. **Verify**:
   ```bash
   docker-compose exec dashboard env | grep PUBLIC_FAIVOR_BACKEND_URL
   docker-compose exec dashboard env | grep ALLOWED_ORIGINS
   ```

## Testing

### Test CORS Headers
```bash
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://yourdomain.com/api/models
```

Expected response should include:
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

### Test Backend Connectivity
```bash
# From dashboard container
docker-compose exec dashboard curl http://faivor-backend:8000/
```

## Common Issues and Solutions

### Issue 1: CORS errors persist
**Cause**: Origin not in ALLOWED_ORIGINS or wrong format  
**Solution**: 
- Check exact origin (include protocol: `https://`)
- Ensure no trailing slashes
- Restart container after changing .env

### Issue 2: Backend connection refused
**Cause**: Wrong PUBLIC_FAIVOR_BACKEND_URL  
**Solution**:
- For Docker: Use service name (`http://faivor-backend:8000`)
- For remote: Use full URL with protocol
- Verify backend is accessible from dashboard container

### Issue 3: Environment variables not loaded
**Cause**: Dockerfile copied old .env or not restarted  
**Solution**:
```bash
# Rebuild image
docker-compose build --no-cache dashboard

# Or pass env directly in docker-compose.yml
services:
  dashboard:
    environment:
      - PUBLIC_FAIVOR_BACKEND_URL=http://faivor-backend:8000
      - ALLOWED_ORIGINS=https://yourdomain.com
```

## Security Notes

⚠️ **NEVER use `ALLOWED_ORIGINS="*"` in production!**

✅ **Best practices:**
- Use specific domains with protocol
- Use HTTPS in production
- Keep the list minimal
- Don't include wildcards or patterns

## Files Changed

```
dashboard/
├── _example.env                          # Added CORS config template
├── src/
│   ├── hooks.server.ts                  # Added CORS middleware
│   ├── lib/
│   │   ├── config.ts                    # Added backend URL export
│   │   └── api/
│   │       └── faivor-backend.ts        # Use configurable URL
docs/
├── CORS-CONFIGURATION.md                 # NEW: Comprehensive guide
└── REVERSE-PROXY-SETUP.md               # NEW: Quick start guide
.env-test                                 # Updated with CORS config
```

## Migration Path

For existing deployments:

1. Pull latest code
2. Add environment variables to your `.env` file
3. Rebuild/restart services
4. Test CORS functionality

No database migrations required. All changes are configuration-based.

## Additional Resources

- [Full CORS Documentation](./CORS-CONFIGURATION.md)
- [Quick Setup Guide](./REVERSE-PROXY-SETUP.md)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [SvelteKit Hooks](https://kit.svelte.dev/docs/hooks)
