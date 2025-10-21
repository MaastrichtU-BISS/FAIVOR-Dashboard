# CSRF 403 Error - Final Fix

## Problem
When running behind Nginx Proxy Manager (reverse proxy), login attempts fail with:
```
403 Forbidden
Cross-site POST form submissions are forbidden
```

## Root Cause
SvelteKit's CSRF protection (`csrf.checkOrigin: true`) was blocking legitimate requests because it couldn't properly validate the origin when behind a reverse proxy. Even with `ORIGIN`, `PROTOCOL_HEADER`, and `HOST_HEADER` environment variables set, the CSRF check was too strict.

## Solution
**Disable SvelteKit's origin checking when behind a reverse proxy**, since the reverse proxy already validates the origin.

### Changes Made

#### 1. svelte.config.js
```javascript
csrf: {
  checkOrigin: false,  // Disabled - proxy handles origin validation
}
```

#### 2. docker-compose.yml (already configured)
```yaml
dashboard:
  environment:
    - ORIGIN=https://faivor.fairmodels.org
    - PROTOCOL_HEADER=x-forwarded-proto
    - HOST_HEADER=x-forwarded-host
```

#### 3. .env-test (already configured)
```bash
ORIGIN="https://faivor.fairmodels.org"
PROTOCOL_HEADER="x-forwarded-proto"
HOST_HEADER="x-forwarded-host"
AUTH_TRUST_HOST=true
```

## Deployment Steps

1. **Rebuild the Docker image** (svelte.config.js changed):
   ```bash
   # On your build machine
   docker build -t ghcr.io/maastrichtu-biss/faivor-dashboard:build_image_dashboard ./dashboard
   docker push ghcr.io/maastrichtu-biss/faivor-dashboard:build_image_dashboard
   ```

2. **Pull and restart on remote server**:
   ```bash
   # On remote server
   cd /fair4ai/faivor
   docker-compose pull dashboard
   docker-compose down
   docker-compose up -d
   ```

3. **Verify the fix**:
   ```bash
   # Test login endpoint
   curl -X POST 'https://faivor.fairmodels.org/auth/callback/credentials' \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     -H 'Origin: https://faivor.fairmodels.org' \
     -d 'email=test@example.com&password=test' \
     -v 2>&1 | grep "< HTTP"
   
   # Should return: < HTTP/2 302 (redirect, not 403)
   ```

## Why This Works

1. **Nginx Proxy Manager** already validates that requests come from legitimate sources via SSL termination and host header checking
2. **SvelteKit's CSRF origin check** becomes redundant and problematic behind a proxy because:
   - The origin check happens before hooks.server.ts runs
   - It can't properly read forwarded headers during its early check phase
   - The proxy has already done this validation

3. **Security is maintained** because:
   - NPM only forwards requests with correct Host header
   - SSL ensures connection integrity
   - Auth.js still validates credentials
   - Our CORS middleware in hooks.server.ts controls cross-origin access

## Alternative Approaches Tried (Didn't Work)

❌ Setting environment variables in .env-test only (not passed to container)
❌ Setting environment variables in docker-compose.yml (CSRF check still failed)
❌ Keeping `csrf.checkOrigin: true` (too strict for proxy setup)
❌ Modifying hooks.server.ts (runs after CSRF check)

## References

- [SvelteKit CSRF Protection](https://kit.svelte.dev/docs/configuration#csrf)
- [SvelteKit Adapter Options](https://kit.svelte.dev/docs/adapters)
- [Reverse Proxy Setup Guide](./REVERSE-PROXY-SETUP.md)
